'use strict';

angular.module('owsWalletPlugin.services').factory('coinbaseApiService', function($rootScope, $log, lodash, Http, Session, Storage) {
  var root = {};

  var isCordova = owswallet.Plugin.isCordova();
  var session = Session.getInstance();

  var credentials = {};
  var storage;

  var coinbaseApi;
  var coinbaseHost;

  /**
   * Processing flow for accessing a Coinbase account.
   *
   * Typically, the Coinbase applet guides the user to the Coinbase authorization URL. A browser page will load which
   * explains that the user is providing this app access to their Coinbase account. When the user authorizes access Coinbase
   * responds using a special URL that is handled by the host app. Since the host app does not have a direct responder for this
   * Coinbase event it will forward the event on to all running plugins. The event is identified as an 'incoming-data' event,
   * We receive the event here and check that the event data identifies the event as coming from Coinbase wuthorization. When
   * a proper event is received we immediately attempt to decode the event to read the oAuth code and exchange the code for
   * a Coinbase API access token.
   *
   * If Coinbase responds with an access token then we save it locally and emit an event signaling that the token has changed.
   *
   * If the token has changed then we immediately send a request to Coinbase to get the users account id. If the users account id 
   * is received then we save it for subsequent API calls.
   *
   * Finally, we send an event to the subscribers (typically the Coinbase applet) that a Coinbase account has been accessed.
   *
   *   event: {
   *     type: 'coinbase.account',
   *     data: accountId
   *   }
   */

  // Listen for account pairing events (incoming oauth code from Coinbase authorization by user).
  owswallet.Plugin.onEvent(function(event) {
    if (event.type == 'incoming-data') {
      if (event.data && event.data.indexOf('://coinbase') === 0) {

        var code = System.getUrlParameterByName(event.data, 'code');
        if (code && code.length > 0) {
          root.getToken(code);
        }
      }
    }
  });

  root.init = function(config, cb) {
    // Set up for being able to communicate with Coinbase.
    setCredentials(config);

    // Create our host provider.
    coinbaseHost = new Http(credentials.HOST, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Setup access to our storage space.
    storage = new Storage([
      'access-token',
      'account-id',
      'refresh-token',
      'txs'
    ], root.getNetwork());

    root.getAccountId(cb);
  };

  root.logout = function() {    
    storage.removeAccessToken().then(function() {
      return storage.removeRefreshToken();

    }).then(function() {
      return storage.removeTxs();

    }).then(function() {
      cb();

    }).catch(function(error) {
      $log.error(error);
    });
  };

  root.getStorage = function() {
    return storage;
  };

  root.getNetwork = function() {
    return credentials.NETWORK;
  };

/*
  root.getStoredToken = function(cb) {
    storage.getAccessToken().then(function(accessToken) {
      return cb(accessToken);
    }).catch(function(error) {
      return cb(error);
    });
  };

  root.getStoredAccountId = function(cb) {
    storage.getAccountId().then(function(accessId) {
      return cb(accountId);
    }).catch(function(error) {
      return cb(error);
    });
  };
*/
  root.getToken = function(oauthCode) {
    var data = {
      grant_type: 'authorization_code',
      code: oauthCode,
      client_id: credentials.CLIENT_ID,
      client_secret: credentials.CLIENT_SECRET,
      redirect_uri: credentials.REDIRECT_URI
    };

    coinbaseHost.post('oauth/token/', data).then(function(data) {
      if (data && data.access_token && data.refresh_token) {
        saveToken(data.access_token, data.refresh_token, function() {
          $rootScope.$emit('Local/NewAccessToken');
        });
      } else {
        $log.error('Could not get the access token');
      }
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
    });
  };

  root.refreshToken = function(refreshToken, cb) {
    var data = {
      grant_type: 'refresh_token',
      client_id: credentials.CLIENT_ID,
      client_secret: credentials.CLIENT_SECRET,
      redirect_uri: credentials.REDIRECT_URI,
      refresh_token: refreshToken
    };

    coinbaseHost.post('oauth/token/', data).then(function(data) {
      if (data && data.access_token && data.refresh_token) {
        saveToken(data.access_token, data.refresh_token, function() {
          $rootScope.$emit('Local/NewAccessToken');
          cb();          
        });
      } else {
        return cb('Could not get the access token');
      }
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.getAccountId = lodash.throttle(function(cb) {
    $log.debug('Accessing Coinbase account...');

    storage.getAccessToken().then(function(accessToken) {
      if (!accessToken) {
        $log.warn('No access token while trying to access account');
        return cb();

      } else {
        getMainAccountId(accessToken, function(err, accountId) {
          if (err) {
            if (!err.errors || (err.errors && !lodash.isArray(err.errors))) {
              return cb('Could not get account id: ' + err);
            }

            // There is an error, check to see if the access token is expired.
            var expiredToken;
            for (var i = 0; i < err.errors.length; i++) {
              expiredToken = (err.errors[i].id == 'expired_token');
            }

            // Refresh an expired access token.
            if (expiredToken) {
              $log.debug('Refreshing access token');

              storage.getRefreshToken().then(function(refreshToken) {

                refreshToken(refreshToken, function(err, newToken) {
                  if (err) {
                    return cb('Could not refresh access token: ' + err);
                  }

                  getMainAccountId(newToken, function(err, accountId) {
                    if (err) {
                      return cb('Could not get account id after token refresh: ' + err);
                    }

                    saveAccountId(accountId);
                    return cb(accountId);
                  });
                });

              }).catch(function(error) {
                return cb('Could not get access token from storage: ' + error);
              });

            } else {
              return cb('Unexpected error getting account id: ' + err.errors.toString());
            }

          } else {
            saveAccountId(accountId);
            return cb(accountId);
          }
        });
      }

    }).catch(function(error) {
      return cb('Unexpected error getting account id: ' + error);

    });
  }, 10000);

  root.getUrls = function() {
    // credentials.HOST =         https://www.coinbase.com
    //                            /oauth/authorize?response_type=code&client_id=
    // credentials.CLIENT_ID =    YOUR_CLIENT_ID
    //                            &redirect_uri=
    // credentials.REDIRECT_URI = YOUR_REDIRECT_URL                               appConfig.name + '://coinbase' => 'owswallet://coinbase'
    //                            &state=SECURE_RANDOM&scope=
    // credentials.SCOPE =        <hardcoded permissions>
    return {
      oauthCodeUrl: '' +
        credentials.HOST +
        '/oauth/authorize?response_type=code&client_id=' +
        credentials.CLIENT_ID +
        '&redirect_uri=' +
        credentials.REDIRECT_URI +
        '&state=SECURE_RANDOM&scope=' +
        credentials.SCOPE +
        '&meta[send_limit_amount]=1000&meta[send_limit_currency]=USD&meta[send_limit_period]=day',
      signupUrl: credentials.HOST + '/signup',
      supportUrl: 'https://support.coinbase.com/'
    };
  };

  root.getAccounts = function(cb) {
    coinbaseApi.get('accounts/').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.getAccount = function(accountId, cb) {
    coinbaseApi.get('accounts/' + accountId).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
/*
  root.getAuthorizationInformation = function(cb) {
    coinbaseApi.get('/auth/').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
*/
  root.getCurrentUser = function(cb) {
    coinbaseApi.get('user/').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.getBuyOrder = function(accountId, buyId, cb) {
    coinbaseApi.get('accounts/' + accountId + '/buys/' + buyId).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.getTransaction = function(accountId, transactionId, cb) {
    coinbaseApi.get('accounts/' + accountId + '/transactions/' + transactionId).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
/*
  root.getAddressTransactions = function(accountId, addressId, cb) {
    coinbaseApi.get('accounts/' + accountId + '/addresses/' + addressId + '/transactions').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
*/
  root.getTransactions = function(accountId, cb) {
    coinbaseApi.get('accounts/' + accountId + '/transactions').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
/*
  root.paginationTransactions = function(url, cb) {
    coinbaseApi.get(url.replace('/v2', '')).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
*/
  root.sellPrice = function(currency, cb) {
    coinbaseApi.get('prices/sell?currency=' + currency).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.buyPrice = function(currency, cb) {
    coinbaseApi.get('prices/buy?currency=' + currency).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.getPaymentMethods = function(cb) {
    coinbaseApi.get('payment-methods/').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
/*
  root.getPaymentMethod = function(paymentMethodId, cb) {
    coinbaseApi.get('payment-methods/' + paymentMethodId).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
*/
  root.sellRequest = function(accountId, data, cb) {
    var data = {
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method ||  null,
      commit: data.commit || false,
      quote: data.quote || false
    };

    coinbaseApi.post('accounts/' + accountId + '/sells', data).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
/*
  root.sellCommit = function(accountId, sellId, cb) {
    coinbaseApi.post('accounts/' + accountId + '/sells/' + sellId + '/commit').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
*/
  root.buyRequest = function(accountId, data, cb) {
    var data = {
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method || null,
      commit: data.commit || false,
      quote: data.quote || false
    };

    coinbaseApi.post('accounts/' + accountId + '/buys', data).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
/*
  root.buyCommit = function(accountId, buyId, cb) {
    coinbaseApi.post('accounts/' + accountId + '/buys/' + buyId + '/commit').then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };
*/
  root.createAddress = function(accountId, data, cb) {
    var data = {
      name: data.name
    };

    coinbaseApi.post('accounts/' + accountId + '/addresses', data).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  root.sendTo = function(accountId, data, cb) {
    var data = {
      type: 'send',
      to: data.to,
      amount: data.amount,
      currency: data.currency,
      description: data.description
    };

    coinbaseApi.post('accounts/' + accountId + '/transactions', data).then(function(data) {
      return cb(null, data.data);
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
  };

  /**
   * Private functions
   */

  function setCredentials(config) {
    /**
     * Development: 'testnet'
     * Production: 'livenet'
     */
    credentials.NETWORK = 'livenet/btc';

    // Coinbase permissions
    credentials.SCOPE = '' +
      'wallet:accounts:read,' +
      'wallet:addresses:read,' +
      'wallet:addresses:create,' +
      'wallet:user:read,' +
      'wallet:user:email,' +
      'wallet:buys:read,' +
      'wallet:buys:create,' +
      'wallet:sells:read,' +
      'wallet:sells:create,' +
      'wallet:transactions:read,' +
      'wallet:transactions:send,' +
      'wallet:transactions:send:bypass-2fa,' +
      'wallet:payment-methods:read';

    if (isCordova) {
      credentials.REDIRECT_URI = config.redirect_uri.mobile;
    } else {
      credentials.REDIRECT_URI = config.redirect_uri.desktop;
    }

    if (credentials.NETWORK.indexOf('testnet') >= 0) {
      credentials.HOST = config.sandbox.host;
      credentials.API = config.sandbox.api;
      credentials.CLIENT_ID = config.sandbox.client_id;
      credentials.CLIENT_SECRET = config.sandbox.client_secret;
    } else {
      credentials.HOST = config.production.host;
      credentials.API = config.production.api;
      credentials.CLIENT_ID = config.production.client_id;
      credentials.CLIENT_SECRET = config.production.client_secret;
    };

    // Force to use specific version
    credentials.API_VERSION = '2017-10-31';
  };

  function saveToken(accessToken, refreshToken, cb) {
    storage.setAccessToken(accessToken).then(function() {

      return storage.setRefreshToken(refreshToken);

    }).then(function() {

      // Using the new access token, create a new provider for making future requests.
      coinbaseApi = new Http(credentials.API + '/v2/', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'CB-VERSION': credentials.API_VERSION,
          'Authorization': 'Bearer ' + accessToken
        }
      });
      return cb();

    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error);
    });
  };

  function saveAccountId(accountId) {
    storage.setAccountId(accountId).then(function(value) {
      // Broadcast an event stating that we have Coinbase account access.
      session.broadcastEvent('coinbase.account', accountId);

    }).catch(function(error) {
      $log.error('Could not save account id: ' + error);
    });
  };

  function getMainAccountId(cb) {
    root.getAccounts(function(err, a) {
      if (err) {
        return cb(err);
      }
      var data = a.data;
      for (var i = 0; i < data.length; i++) {
        if (data[i].primary && data[i].type == 'wallet' && data[i].currency && data[i].currency.code == 'BTC') {
          return cb(null, data[i].id);
        }
      }

      root.logout();
      return cb('Your primary account should be a BTC wallet. Set your BTC wallet account as primary and try again.');
    });
  };

  function getErrorsAsString(data) {
    var errData;
    try {
      if (data && data.errors) errData = data.errors;
      else if (data && data.error) errData = data.error_description;
      else return 'Unknown error';

      if (!lodash.isArray(errData)) {
        errData = errData && errData.message ? errData.message : errData;
        return errData;
      }

      if (lodash.isArray(errData)) {
        var errStr = '';
        for (var i = 0; i < errData.length; i++) {
          errStr = errStr + errData[i].message + '. ';
        }
        return errStr;
      }

      return JSON.stringify(errData);
    } catch(e) {
      $log.error(e);
    };
  };

  return root;
});
