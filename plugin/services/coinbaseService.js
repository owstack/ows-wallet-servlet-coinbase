'use strict';

angular.module('owsWalletPlugin.services').factory('coinbaseService', function($rootScope, $log, lodash, Http, Session, Storage, Settings, Host) {
  var root = {};

  var isCordova = owswallet.Plugin.isCordova();
  var session = Session.getInstance();

  var credentials = {};
  var storage;

  var coinbaseApi;
  var coinbaseHost;

  // Coinbase static configuration.
  var currencies = [{
    pair: 'BTC-USD',
    label: 'Bitcoin'
  }, {
    pair: 'BCH-USD',
    label: 'Bitcoin Cash'
  }, {
    pair: 'ETH-USD',
    label: 'Ether'
  }, {
    pair: 'LTC-USD',
    label: 'Litecoin'
  }];

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
   * If Coinbase responds with an access token then we save it locally.
   *
   * Finally, we send an event to the subscribers (typically the Coinbase applet) that a Coinbase token has been received.
   *
   *   event: {
   *     name: 'coinbase.oauth',
   *     data: {status, message}
   *   }
   */

  // Listen for account pairing events (incoming oauth code from Coinbase authorization by user).
  owswallet.Plugin.onEvent('incoming-data', function(event) {
    if (event.data && event.data.indexOf('://coinbase') < 0) {
      return;
    }

    var oauthCode = System.getUrlParameterByName(event.data, 'code');
    if (oauthCode && oauthCode.length > 0) {
      root.init(null, oauthCode);
    }
  });

  // When a new block is seen we update our pending transactions.
  owswallet.Plugin.onEvent('host.new-block', function(event) {
    var network = lodash.get(event, 'event.n.data.network');

    if (event.type == 'NewBlock' && network.indexOf('livenet') >= 0)  {
      fetchPendingTransactions();
    }
  });

  // Invoked via the servlet API to initialize our environment using the provided configuration (typically from applet plugin configuration).
  root.init = function(clientId, config, oauthCode) {
    return new Promise(function(resolve, reject) {

      // Use plugin configuration to setup for communicating with Coinbase.
      if (config) {
        setCredentials(config);
      }

      // Setup access to our storage space; use clientId to create a unique name space.
      storage = new Storage([
        'access-token',
        'refresh-token',
        'txs'
      ], clientId);

      Settings.get().then(function(settings) {
        // Gather some additional information for the client. This information only during this initialization sequence.
        var info = {};
        info.urls = getUrls();

        if (oauthCode) {
          // Use the oauthCode to get an API token followed by getting the account ID.
          getToken(oauthCode).then(function() {
            // Got the API token (saved to storage).
            return getAccounts();

          }).then(function(accounts) {
            return resolve({
              accounts: accounts,
              info: info
            });

          });

        } else {
          getAccounts().then(function(accounts) {
            return resolve({
              accounts: accounts,
              info: info
            });

          });
        }

      }).catch(function(error) {
        $log.error('Could not initialize API service: ' + error);
        reject(error);
      });

    });
  };

  root.logout = function() {
    return new Promise(function(resolve, reject) {
      storage.removeAccessToken().then(function() {
        return storage.removeRefreshToken();

      }).then(function() {
        return storage.removeTxs();

      }).then(function() {
        resolve();

      }).catch(function(error) {
        $log.error('Could not logout: ' + error);
        reject(error);
      });
    });
  };

  root.getStorage = function() {
    return storage;
  };

  root.getExchangeRates = function(currency) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('exchange-rates?currency=' + currency).then(function(response) {
        var data = response.data.data.rates;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getExchangeRates ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  function doGetAccounts() {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/').then(function(response) {
        // Response object returns with pagination; access the accounts array only.
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: doGetAccounts ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.getAccount = function(accountId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getAccount ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.getCurrentUser = function() {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('user/').then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getCurrentUser ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.getBuyOrder = function(accountId, buyId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/buys/' + buyId).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getBuyOrder ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.getTransaction = function(accountId, transactionId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/transactions/' + transactionId).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getTransaction ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
/*
  root.getAddressTransactions = function(accountId, addressId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/addresses/' + addressId + '/transactions').then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
*/
  root.getTransactions = function(accountId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/transactions').then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getTransactions ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
/*
  root.paginationTransactions = function(url) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get(url.replace('/v2', '')).then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: paginationTransactions ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
*/
  root.sellPrice = function(currency) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('prices/sell?currency=' + currency).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: sellPrice ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.buyPrice = function(currency) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('prices/buy?currency=' + currency).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: buyPrice ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.spotPrice = function() {
    return new Promise(function(resolve, reject) {
      var count = currencies.length;
      var result = {};

      // Issue calls for each currency pair, resolve when all pair results have been returned. No reject() is called
      // since the errors are embedded in the result object.
      //
      // result: {
      //   'pair1': { // If success for a pair.
      //     <coinbase result>
      //   }
      //   'pair2': { // If an error for a pair.
      //     error: <message>
      //   }
      // }
      //   
      lodash.forEach(currencies, function(c) {

        coinbaseApi.get('prices/' + c.pair + '/spot').then(function(response) {
          result[c.pair] = response.data.data;
          result[c.pair].label = c.label; // As a convenience, add the label to the result.

          count--;
          if (count == 0) {
            resolve(result);
          }

        }).catch(function(error) {
          $log.error('Coinbase: spotPrice ' + error.status + '. ' + getErrorsAsString(error.data));

          result[c.pair] = {};
          result[c.pair].error = error;

          count--;
          if (count == 0) {
            resolve(result); // Resolve here since errors are embedded in the result.
          }
        });

      });
    });
  };

  root.historicPrice = function(currencyPair, period) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('prices/' + currencyPair + '/historic?period=' + period).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: historicPrice ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.getPaymentMethods = function() {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('payment-methods/').then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getPaymentMethods ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
/*
  root.getPaymentMethod = function(paymentMethodId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('payment-methods/' + paymentMethodId).then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: getPaymentMethod ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
*/
  root.sellRequest = function(accountId, data) {
    return new Promise(function(resolve, reject) {
      var data = {
        amount: data.amount,
        currency: data.currency,
        payment_method: data.payment_method ||  null,
        commit: data.commit || false,
        quote: data.quote || false
      };

      coinbaseApi.post('accounts/' + accountId + '/sells', data).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: sellRequest ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
/*
  root.sellCommit = function(accountId, sellId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.post('accounts/' + accountId + '/sells/' + sellId + '/commit').then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: sellCommit ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
*/
  root.buyRequest = function(accountId, data) {
    return new Promise(function(resolve, reject) {
      var data = {
        amount: data.amount,
        currency: data.currency,
        payment_method: data.payment_method || null,
        commit: data.commit || false,
        quote: data.quote || false
      };

      coinbaseApi.post('accounts/' + accountId + '/buys', data).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: buyRequest ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
/*
  root.buyCommit = function(accountId, buyId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.post('accounts/' + accountId + '/buys/' + buyId + '/commit').then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };
*/
  root.createAddress = function(accountId, data) {
    return new Promise(function(resolve, reject) {
      var data = {
        name: data.name
      };

      coinbaseApi.post('accounts/' + accountId + '/addresses', data).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: buyCommit ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.sendTo = function(accountId, data) {
    return new Promise(function(resolve, reject) {
      var data = {
        type: 'send',
        to: data.to,
        amount: data.amount,
        currency: data.currency,
        description: data.description
      };

      coinbaseApi.post('accounts/' + accountId + '/transactions', data).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(error) {
        $log.error('Coinbase: sendTo ' + error.status + '. ' + getErrorsAsString(error.data));
        reject(error.data);
      });
    });
  };

  root.getPendingTransactions = function(pendingTransactions) {
    return new Promise(function(resolve, reject) {
      storage.getTxs().then(function(txs) {
        txs = txs ? JSON.parse(txs) : {};
        pendingTransactions.data = lodash.isEmpty(txs) ? null : txs;

        lodash.forEach(pendingTransactions.data, function(dataFromStorage, txId) {
          if ((dataFromStorage.type == 'sell' && dataFromStorage.status == 'completed') ||
            (dataFromStorage.type == 'buy' && dataFromStorage.status == 'completed') ||
            dataFromStorage.status == 'error' ||
            (dataFromStorage.type == 'send' && dataFromStorage.status == 'completed')) {

            return;
          }

          root.getTransaction(accountId, txId, function(err, tx) {
            if (err || lodash.isEmpty(tx) || (tx.data && tx.data.error)) {
              root.savePendingTransaction(dataFromStorage, {
                status: 'error',
                error: (tx.data && tx.data.error) ? tx.data.error : err
              }, function(err) {
                if (err) {
                  $log.debug(err);
                }
                refreshTransactions(pendingTransactions);
              });
              return;
            }

            updatePendingTransactions(dataFromStorage, tx.data);
            pendingTransactions.data[txId] = dataFromStorage;

            if (tx.data.type == 'send' && tx.data.status == 'completed' && tx.data.from) {

              root.sellPrice(dataFromStorage.sell_price_currency).then(function(s) {
                var newSellPrice = s.data.amount;
                var variance = Math.abs((newSellPrice - dataFromStorage.sell_price_amount) / dataFromStorage.sell_price_amount * 100);

                if (variance < dataFromStorage.price_sensitivity.value) {
                  sellPending(dataFromStorage, accountId, pendingTransactions, function(pendingTransactions) {
                    return;
                  });

                } else {
                  root.savePendingTransaction(dataFromStorage, {
                    status: 'error',
                    error: {errors: [{message: 'Price falls over the selected percentage'}]}
                  }, function(err) {
                    if (err) {
                      $log.debug(err);
                    }
                    refreshTransactions(pendingTransactions);
                    return;
                  });

                }

              }).catch(function(error) {
                root.savePendingTransaction(dataFromStorage, {
                  status: 'error',
                  error: error
                }, function(err) {
                  if (err) {
                    $log.debug(err);
                  }
                  refreshTransactions(pendingTransactions);
                  return;
                });

              });

            } else if (tx.data.type == 'buy' && tx.data.status == 'completed' && tx.data.buy) {
              if (dataFromStorage) {
                sendToWallet(dataFromStorage, accountId, pendingTransactions);
              }
              return;

            } else {
              root.savePendingTransaction(dataFromStorage, {}, function(err) {
                if (err) {
                  $log.debug(err);
                }
                refreshTransactions(pendingTransactions);
                return;
              });

            }

          });
        });

        return resolve(pendingTransactions);

      });
    });
  };

  root.savePendingTransaction = function(ctx, opts, cb) {
    storage.getTxs().then(function(oldTxs) {
      if (lodash.isString(oldTxs)) {
        oldTxs = JSON.parse(oldTxs);
      }
      if (lodash.isString(ctx)) {
        ctx = JSON.parse(ctx);
      }

      var tx = oldTxs || {};
      tx[ctx.id] = ctx;

      if (opts && (opts.error || opts.status)) {
        tx[ctx.id] = lodash.assign(tx[ctx.id], opts);
      }
      if (opts && opts.remove) {
        delete(tx[ctx.id]);
      }

      tx = JSON.stringify(tx);

      return storage.setTxs(tx);

    }).catch(function(error) {
      return cb(err);

    });
  };

  /**
   * Private functions
   */

  function setCredentials(config) {
    // Coinbase permissions.
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
//TODO      'wallet:transactions:send:bypass-2fa,' +
      'wallet:payment-methods:read';

    if (isCordova) {
      credentials.REDIRECT_URI = config.redirect_uri.mobile;
    } else {
      credentials.REDIRECT_URI = config.redirect_uri.desktop;
    }

    credentials.HOST = config.production.host;
    credentials.API = config.production.api;
    credentials.CLIENT_ID = config.production.client_id;
    credentials.CLIENT_SECRET = config.production.client_secret;

    // Date of this implementation.
    credentials.API_VERSION = '2018-01-06';

    // Using these credentials, create a host provider.
    createCoinbaseHostProvider();
  };

  function createCoinbaseHostProvider() {
    // Create our host provider so we can establish initial communication with Coinbase.
    coinbaseHost = new Http(credentials.HOST, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  };

  function createCoinbaseApiProvider(accessToken) {
    // Using the access token, create a new provider for making future API requests.
    coinbaseApi = new Http(credentials.API + '/v2/', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'CB-VERSION': credentials.API_VERSION,
        'Authorization': 'Bearer ' + accessToken
      }
    });
  };

  function getToken(oauthCode) {
    return new Promise(function(resolve, reject) {
      var data = {
        grant_type: 'authorization_code',
        code: oauthCode,
        client_id: credentials.CLIENT_ID,
        client_secret: credentials.CLIENT_SECRET,
        redirect_uri: credentials.REDIRECT_URI
      };

      coinbaseHost.post('oauth/token/', data).then(function(response) {
        var data = response.data;
        if (data && data.access_token && data.refresh_token) {
          saveToken(data.access_token, data.refresh_token, function() {
            return resolve();

          });
        } else {
          return reject('Could not get the access token');
        }
      }).catch(function(error) {
        return reject('Could not get the access token: ' + error.status + ', ' + getErrorsAsString(error.data));
      });
    });
  };

  function getTokenFromStorage() {
    return new Promise(function(resolve, reject) {
      storage.getAccessToken().then(function(accessToken) {

        createCoinbaseApiProvider(accessToken);
        resolve(accessToken);

      }).catch(function(error) {
        reject(error);
      });
    });
  };

  function saveToken(accessToken, refreshToken, cb) {
    storage.setAccessToken(accessToken).then(function() {
      return storage.setRefreshToken(refreshToken);

    }).then(function() {

      // Have a new token, create (or recreate) the API provider.
      createCoinbaseApiProvider(accessToken);
      return cb();

    }).catch(function(error) {
      $log.error('Coinbase: saveToken ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error);
    });
  };

  function refreshToken() {
    return new Promise(function(resolve, reject) {
      storage.getRefreshToken().then(function(refreshToken) {

        var data = {
          grant_type: 'refresh_token',
          client_id: credentials.CLIENT_ID,
          client_secret: credentials.CLIENT_SECRET,
          redirect_uri: credentials.REDIRECT_URI,
          refresh_token: refreshToken
        };

        coinbaseHost.post('oauth/token/', data).then(function(response) {
          var data = response.data;
          if (data && data.access_token && data.refresh_token) {
            saveToken(data.access_token, data.refresh_token, function() {
              $log.info('Successfully refreshed token from Coinbase');
              return resolve();
            });
          } else {
            return reject('Could not get the access token');
          }
        }).catch(function(error) {
          return reject('Could not get the access token: ' + error.status + ', ' + getErrorsAsString(error.data));
        });

      }).catch(function(error) {
        return reject('Could not get refresh token from storage: ' + error);
      });
    });
  };

  function getUrls() {
    return {
      oauthCodeUrl: '' +
        credentials.HOST +
        '/oauth/authorize?response_type=code&account=all&client_id=' +
        credentials.CLIENT_ID +
        '&redirect_uri=' +
        credentials.REDIRECT_URI +
        '&state=SECURE_RANDOM&scope=' +
        credentials.SCOPE +
//TODO        '&meta[send_limit_amount]=1000&meta[send_limit_currency]=USD&meta[send_limit_period]=day',
        '&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=day',
      signupUrl: 'https://www.coinbase.com/signup',
      supportUrl: 'https://support.coinbase.com',
      privacyUrl: 'https://www.coinbase.com/legal/user_agreement'
    };
  };

  function getAccounts() {
    return new Promise(function(resolve, reject) {
      $log.debug('Accessing Coinbase account...');

      getTokenFromStorage().then(function(accessToken) {
        if (!accessToken) {
          $log.warn('No access token while trying to access account');
          return resolve();

        } else {
          doGetAccounts().then(function(accounts) {
            return resolve(accounts);

          }).catch(function(error) {

            // Check for a Coinbase error reponse. If not then return otherwise continue.
            if (!error.errors || (error.errors && !lodash.isArray(error.errors))) {
              return reject('Could not get account id: ' + error);
            }

            // There is a Coinbase error, check to see if the access token is expired.
            var expiredToken;
            var revokedToken;
            var invalidToken;
            for (var i = 0; i < error.errors.length; i++) {
              expiredToken = (error.errors[i].id == 'expired_token');
              revokedToken = (error.errors[i].id == 'revoked_token');
              invalidToken = (error.errors[i].id == 'invalid_token');
            }

            // Refresh an expired access token and retrieve the account ID.
            // The results are stored and the account ID is returned, otherwise an error is returned.
            if (expiredToken) {
              $log.debug('Refreshing access token');

              refreshToken().then(function() {
                return doGetAccounts();

              }).then(function(accounts) {
                return resolve(accounts);

              }).catch(function(error) {
                return reject('Could not refresh access token: ' + error);

              });

            } else if (revokedToken) {
              $log.debug('Token revoked, logging out');
              root.logout();
              return resolve(); // No access token

            } else if (invalidToken) {
              $log.debug('Token invalid, logging out');
              root.logout();
              return resolve(); // No access token

            } else {
              return reject('Unexpected error getting account id: ' + getErrorsAsString(error));
            }
          });
        }

      }).catch(function(error) {
        return reject('Unexpected error getting account id: ' + getErrorsAsString(error));

      });
    });
  };
  
  function updatePendingTransactions(obj /*, …*/ ) {
    for (var i = 1; i < arguments.length; i++) {
      for (var prop in arguments[i]) {
        var val = arguments[i][prop];
        if (typeof val == "object") {
          updatePendingTransactions(obj[prop], val);
        } else {
          obj[prop] = val ? val : obj[prop];
        }
      }
    }
    return obj;
  };

  function fetchPendingTransactions() {
    return lodash.throttle(function() {
      $log.debug('Updating coinbase pending transactions...');
      var pendingTransactions = {
        data: {}
      };
      root.getPendingTransactions(pendingTransactions);
    }, 20000);
  };

  function refreshTransactions(pendingTransactions) {
    storage.getTxs().then(function(txs) {
      txs = txs ? JSON.parse(txs) : {};
      pendingTransactions.data = lodash.isEmpty(txs) ? null : txs;
    }).catch(function(error) {
      $log.error(error);
    });
  };

  function sellPending(tx, accountId, pendingTransactions, cb) {
    var data = tx.amount;
    data['payment_method'] = tx.payment_method || null;
    data['commit'] = true;

    root.sellRequest(accountId, data).then(function(res) {
      if (res.data && !res.data.transaction) {
        root.savePendingTransaction(tx, {
          status: 'error',
          error: {errors: [{message: 'Sell order: transaction not found.'}]}
        }, function(err) {
          if (err) {
            $log.debug(err);
          }
          refreshTransactions(pendingTransactions);
          cb(pendingTransactions);
        });

      } else {

        root.getTransaction(accountId, res.data.transaction.id).then(function(updatedTx) {
          root.savePendingTransaction(tx, {
            remove: true
          }, function(err) {
            root.savePendingTransaction(updatedTx.data, {}, function(err) {
              if (err) {
                $log.debug(err);
              }
              refreshTransactions(pendingTransactions);
              cb(pendingTransactions);
            });
          });

        }).catch(function(error) {
          root.savePendingTransaction(tx, {
            status: 'error',
            error: err
          }, function(err) {
            if (err) {
              $log.error(err);
            }
            refreshTransactions(pendingTransactions);
            cb(pendingTransactions);
          });

        });
      }

    }).catch(function(error) {
      root.savePendingTransaction(tx, {
        status: 'error',
        error: err
      }, function(err) {
        if (err) {
          $log.debug(err);
        }
        refreshTransactions(pendingTransactions);
        cb(pendingTransactions);
      });

    });
  };

  function sendToWallet(tx, accountId, pendingTransactions) {
    var desc = Host.nameCase + ' Wallet';

    getNetAmount(tx.amount.amount, function(err, amountBTC, feeBTC) {
      if (err) {
        root.savePendingTransaction(tx, {
          status: 'error',
          error: {errors: [{message: err}]}
        }, function(err) {
          if (err) $log.debug(err);
          refreshTransactions(pendingTransactions);
        });
        return;
      }

      var data = {
        to: tx.toAddr,
        amount: amountBTC,
        currency: tx.amount.currency,
        description: desc,
        fee: feeBTC
      };

      root.sendTo(accountId, data).then(function(res) {
        if (res.data && !res.data.id) {
          root.savePendingTransaction(tx, {
            status: 'error',
            error: {errors: [{message: 'Transactions not found in Coinbase.com'}]}
          }, function(err) {
            if (err) {
              $log.debug(err);
            }
            refreshTransactions(pendingTransactions);
          });
          return;
        }

        root.getTransaction(accountId, res.data.id).then(function(sendTx) {
          root.savePendingTransaction(tx, {
            remove: true
          }, function(err) {
            if (err) {
              $log.error(err);
            }
            root.savePendingTransaction(sendTx.data, {}, function(err) {
              if (err) {
                $log.debug(err);
              }
              refreshTransactions(pendingTransactions);
            });
          });
        });

      }).catch(function(error) {
        root.savePendingTransaction(tx, {
          status: 'error',
          error: err
        }, function(err) {
          if (err) $log.debug(err);
          refreshTransactions(pendingTransactions);
        });

      });
    });
  };

  function getNetAmount(amount, cb) {
    // Fee Normal for a single transaction (450 bytes)
    var txNormalFeeKB = 450 / 1000;
    feeService.getFeeRate('btc', 'livenet', 'normal', function(err, feePerKb) {
      if (err) {
        return cb('Could not get fee rate');
      }
      var feeBTC = (feePerKb * txNormalFeeKB / 100000000).toFixed(8);

      return cb(null, amount - feeBTC, feeBTC);
    });
  };

  function getErrorsAsString(data) {
    var errData;
    try {
      if (data && data.errors) {
        errData = data.errors;
      } else if (data && data.error) {
        errData = data.error_description;
      } else {
        return 'Unknown error';
      }

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
