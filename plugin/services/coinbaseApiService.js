'use strict';

angular.module('owsWalletPlugin.services').factory('coinbaseApiService', function($log, $http, Storage) {
  var root = {};

  var isCordova = owswallet.Plugin.isCordova();
  var credentials = {};

  var storage = new Storage([
    network + '.access-token',
    network + '.refresh-token',
    network + '.txs'
  ]);

  var coinbaseApi;
  var coinbaseHost = new Http(credentials.HOST, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  root.init = function(config) {
    setCredentials(config);
  };

  root.getStorage = function() {
    return storage;
  };

  root.getNetwork = function() {
    return credentials.NETWORK;
  };

  root.getToken = function(oauthCode, cb) {
    var data = {
      grant_type: 'authorization_code',
      code: oauthCode,
      client_id: credentials.CLIENT_ID,
      client_secret: credentials.CLIENT_SECRET,
      redirect_uri: credentials.REDIRECT_URI
    };

    coinbaseHost.post('oauth/token/', data).then(function(data) {
      if (data && data.access_token && data.refresh_token) {
        saveToken(data.access_token, data.refresh_token, cb);
      } else {
        return cb('Could not get the access token');
      }
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
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
        saveToken(data.access_token, data.refresh_token, cb);
      } else {
        return cb('Could not get the access token');
      }
    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error.data);
    });
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
    credentials.NETWORK = 'livenet';

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

    if (credentials.NETWORK == 'testnet') {
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
    storage.setAccessToken(accessToken).then(function(value) {

      return storage.setRefreshToken(refreshToken);

    }).then(function(value) {

      createCoinbaseApiSender(accessToken);
      return cb(null, accessToken);

    }).catch(function(error) {
      $log.error('Coinbase: GET Access Token ERROR ' + error.status + '. ' + getErrorsAsString(error.data));
      return cb(error);
    });
  };

  function createCoinbaseApiSender(token) {
    httpApi = new Http(credentials.API + '/v2/', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'CB-VERSION': credentials.API_VERSION,
        'Authorization': 'Bearer ' + token
      }
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
