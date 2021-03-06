'use strict';

angular.module('owsWalletPlugin.services').factory('coinbaseService', function($rootScope, $log, lodash,
  /* @namespace owsWalletPluginClient.api */ Constants,
  /* @namespace owsWalletPluginClient.api */ Host,
  /* @namespace owsWalletPluginClient.api */ Http,
  /* @namespace owsWalletPluginClient.api */ Session,
  /* @namespace owsWalletPluginClient.api */ Settings,
  /* @namespace owsWalletPluginClient.api */ Storage,
  /* @namespace owsWalletPluginClient.api */ Transaction) {

  var root = {};

  var isCordova = owswallet.Plugin.isCordova();
  var session = Session.getInstance();

  var credentials = {};
  var storage;

  var coinbaseApi;
  var coinbaseHost;

  // These errors from Coinbase indicate that the user is not authorized to access the Coinbase service.
  // A new token must be obtained to restore access.
  var oauthErrors = [{
    coinbaseId: 'expired_token',
    message: 'Token expired',
    statusCode: 401,
    statusText: 'UNAUTHORIZED_EXPIRED'
  }, {
    coinbaseId: 'revoked_token',
    message: 'Token revoked',
    statusCode: 401,
    statusText: 'UNAUTHORIZED_REVOKED'
  }, {
    coinbaseId: 'invalid_token',
    message: 'Token invalid',
    statusCode: 401,
    statusText: 'UNAUTHORIZED_INVALID'
  }, {
    coinbaseId: 'invalid_grant',
    message: 'Authorization grant is invalid',
    statusCode: 401,
    statusText: 'UNAUTHORIZED_GRANT'
  }];

  // Invoked via the servlet API to initialize our environment using the provided configuration.
  root.init = function(clientId, config, oauthCode) {
    return new Promise(function(resolve, reject) {

      if (!config) {
        var error = 'Could not initialize API service: no plugin configuration provided';
        $log.error(error);
        reject(error);
      }

      // Use plugin configuration to setup for communicating with Coinbase.
      setCredentials(config);

      // Setup access to our storage space; use clientId to create a unique name space.
      storage = new Storage([
        'access-token',
        'refresh-token',
        'txs'
      ], clientId);

      // Gather some additional information for the client. This information only during this initialization sequence.
      var info = {};
      info.urls = getUrls();

      // Providing an oauth code is optional; the client may require it.
      if (oauthCode) {
        // Use the oauthCode to get an API token followed by getting the account ID.
        getToken(oauthCode).then(function(accessToken) {
          // Even if there is no token we need to set up the api provider for calls not requiring authentication.
          createCoinbaseApiProvider(accessToken);

          return resolve({
            info: info,
            authenticated: accessToken ? true : false
          });

        }).catch(function(error) {
          var oauthError = lodash.intersectionWith(oauthErrors, [error], function(val1, val2) {
            return val1.coinbaseId == val2.id;
          });

          if (oauthError.length > 0) {
            // There should only be one error in the array.
            oauthError = oauthError[0];

            return reject({
              id: oauthError.coinbaseId,
              message: oauthError.message,
              statusCode: oauthError.statusCode,
              statusText: oauthError.statusText
            });

          } else {
            // Unexpected error.
            return reject(error);
          };
        });

      } else {

        getTokenFromStorage().then(function(accessToken) {
          // Even if there is no token we need to set up the api provider for calls not requiring authentication.
          createCoinbaseApiProvider(accessToken);

          return resolve({
            info: info,
            authenticated: accessToken ? true : false
          });

        });

      }
    });
  };

  root.logout = function(reason) {
    return new Promise(function(resolve, reject) {
      storage.removeAccessToken().then(function() {
        return storage.removeRefreshToken();

      }).then(function() {
        return storage.removeTxs();

      }).then(function() {
        $log.info('Logged out of Coinbase.');

        // Logged out. Broadcast a logout event to interested plugins.
        session.broadcastEvent({
          name: 'coinbase.logout',
          data: {
            reason: reason || 'USER_REQUESTED'
          }
        });

        resolve();

      }).catch(function(error) {
        $log.error('Could not logout: ' + error);
        reject(error);
      });
    });
  };

  root.getExchangeRates = function(currency) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('exchange-rates?currency=' + currency).then(function(response) {
        var data = response.data.data.rates;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getExchangeRates'));
      });
    });
  };

  root.getAccounts = function(accountId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + (accountId ? accountId : '')).then(function(response) {
        // Response object returns with pagination; access the accounts array only.
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getAccounts'));
      });
    });
  };

  root.getCurrentUser = function() {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('user/').then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getCurrentUser'));
      });
    });
  };

  root.getUserAuth = function() {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('user/auth').then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getUserAuth'));
      });
    });
  };

  root.getBuyOrder = function(accountId, buyId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/buys/' + buyId).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getBuyOrder'));
      });
    });
  };

  root.getTransactions = function(accountId, transactionId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/transactions/' + (transactionId ? transactionId : '')).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getTransactions'));
      });
    });
  };
/*
  root.getAddressTransactions = function(accountId, addressId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('accounts/' + accountId + '/addresses/' + addressId + '/transactions').then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getAddressTransactions'));
      });
    });
  };

  root.paginationTransactions = function(url) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get(url.replace('/v2', '')).then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'paginationTransactions'));
      });
    });
  };
*/
  root.sellPrice = function(currency) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('prices/sell?currency=' + currency).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'sellPrice'));
      });
    });
  };

  root.buyPrice = function(currency) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('prices/buy?currency=' + currency).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'buyPrice'));
      });
    });
  };

  root.spotPrice = function(cryptoCurrencies) {
    return new Promise(function(resolve, reject) {
      var count = cryptoCurrencies.length;
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
      lodash.forEach(cryptoCurrencies, function(c) {

        var pair = c + '-USD';
        var label = Constants.currencyMap(c, 'name');

        coinbaseApi.get('prices/' + pair + '/spot').then(function(response) {
          result[pair] = response.data.data;
          result[pair].label = label; // As a convenience, add the label to the result.

          count--;
          if (count == 0) {
            resolve(result);
          }

        }).catch(function(response) {
          getError(response, 'spotPrice');

          result[pair] = {};
          result[pair].error = error.message;

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
      }).catch(function(response) {
        reject(getError(response, 'historicPrice'));
      });
    });
  };

  root.getPaymentMethods = function(paymentMethodId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('payment-methods/' + (paymentMethodId ? paymentMethodId : '')).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getPaymentMethods'));
      });
    });
  };

  root.createAddress = function(accountId, addressData) {
    return new Promise(function(resolve, reject) {
      var data = {
        name: addressData.name
      };

      coinbaseApi.post('accounts/' + accountId + '/addresses', data).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'createAddress'));
      });
    });
  };

  root.getTime = function() {
    return new Promise(function(resolve, reject) {
      coinbaseApi.get('time/').then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'getTime'));
      });
    });
  };

  root.sellRequest = function(accountId, requestData) {
    return new Promise(function(resolve, reject) {
      // If a walletId is specified then the sell request starts from an OWS wallet, not a Coinbase account.
      // Ensure the order does not commit.
      if (requestData.walletId) {
        requestData.commit = false;
        requestData.quote = false;
      }

      var data = {
        amount: requestData.amount,
        currency: requestData.currency,
        payment_method: requestData.paymentMethodId ||  null,
        commit: requestData.commit || false,
        quote: requestData.quote || false
      };

      coinbaseApi.post('accounts/' + accountId + '/sells', data).then(function(response) {
        var data = response.data.data;

        // Pass back the walletId (if specified).
        data.walletId = requestData.walletId;

        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'sellRequest'));
      });
    });
  };

  root.sellCommit = function(accountId, sellId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.post('accounts/' + accountId + '/sells/' + sellId + '/commit').then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'sellCommit'));
      });
    });
  };

  root.sellCommitFromWallet = function(accountId, walletId, amount, monitorData) {
    return new Promise(function(resolve, reject) {
      // Get the destination address from the Coinbase account.
      root.createAddress(accountId, {
        name: 'Funds to sell from wallet'
      }).then(function(address) {

        // Create a wallet transaction to send to coinbase account.
        var walletTx = new Transaction({
          walletId: walletId,
          urlOrAddress: address,
          amount: amount
        });

        // Broadcast a blockchain transaction.
        return walletTx.send();

      }).then(function(tx) {

        monitorService.addMonitor({
          accountId: accountId,
          walletId: walletId,
          txHash: tx.id,
          priceStopLimitAmount: monitorData.priceStopLimitAmount,
          pluginId: monitorData.pluginId,
          action: 'sell'
        });

      }).catch(function() {
        reject(getError(error, 'sellCommit'));
      });
    });
  };

  root.buyRequest = function(accountId, requestData) {
    return new Promise(function(resolve, reject) {
      var data = {
        amount: requestData.amount,
        currency: requestData.currency,
        paymentMethodId: requestData.paymentMethodId || null,
        commit: requestData.commit || false,
        quote: requestData.quote || false
      };
      
      coinbaseApi.post('accounts/' + accountId + '/buys', data).then(function(response) {
        var data = response.data.data;
        // Pass the walletId (if specified) back to the caller.
        data.walletId = requestData.walletId;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'buyRequest'));
      });
    });
  };

  root.buyCommit = function(accountId, buyId) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.post('accounts/' + accountId + '/buys/' + buyId + '/commit').then(function(response) {
        var data = response.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'buyCommit'));
      });
    });
  };

  root.buyCommitFromWallet = function(accountId, walletId, buyId, monitorData) {
    return new Promise(function(resolve, reject) {
      coinbaseApi.post('accounts/' + accountId + '/buys/' + buyId + '/commit').then(function(response) {
        var data = response.data;

        monitorService.addMonitor({
          accountId: accountId,
          walletId: walletId,
          txId: data.id,
          priceStopLimitAmount: monitorData.priceStopLimitAmount,
          pluginId: monitorData.pluginId,
          action: 'buy'
        });

        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'buyCommit'));
      });
    });
  };

  root.sendTo = function(accountId, sendData) {
    return new Promise(function(resolve, reject) {
      var data = {
        type: 'send',
        to: sendData.to,
        amount: sendData.amount,
        currency: sendData.currency,
        description: sendData.description
      };

      coinbaseApi.post('accounts/' + accountId + '/transactions', data).then(function(response) {
        var data = response.data.data;
        resolve(data);
      }).catch(function(response) {
        reject(getError(response, 'sendTo'));
      });
    });
  };

  root.sendToWallet = function(accountId, walletId, note) {
    var wallet;
    var address;

    return session.getWalletById(walletId).then(function(w) {
      wallet = w;
      return wallet.getAddress();

    }).then(function(a) {
      address = a;
      return wallet.getFeeRate();

    }).then(function(feePerKb) {

      // Estimate transction size of 450 bytes to compute total fee.
      var fee = feePerKb.standard * (450 / 1000);
      var netAmount = amount - fee;

      return coinbaseService.sendTo(accountId, {
        to: address,
        amount: netAmount,
        currency: wallet.currency,
        description: note
      });

    }).then(function(tx) {
      return tx;

    }).catch(function(error) {
      throw error;

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
      'wallet:payment-methods:read,' +
      'wallet:payment-methods:limits';

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
    }, oauthRefresh);
  };

  function updateCoinbaseApiProviderAuthorization(apiProvider, accessToken) {
    // Using the access token, create a new provider for making future API requests.
    apiProvider.setHeaders({
      'Authorization': 'Bearer ' + accessToken
    });
  };

  function oauthRefresh(httpProvider, response) {
    return new Promise(function(resolve, reject) {
      var error = response.data;

      // Check for a Coinbase error reponse. If not then return, otherwise continue.
      if (!error.errors || (error.errors && !lodash.isArray(error.errors))) {
        return reject(response);
      }

      // There is a Coinbase error, check to see if the access token is the cause.
      var oauthError = lodash.intersectionWith(oauthErrors, error.errors, function(val1, val2) {
        return val1.coinbaseId == val2.id;
      });

      if (oauthError.length > 0) {
        // There should only be one error in the array.
        oauthError = oauthError[0];

        switch (oauthError.coinbaseId) {
          case 'expired_token':
            $log.info(oauthError.message + ': refreshing access token');

            refreshToken().then(function(newAccessToken) {
              // Update the active http provider configuration using the new access token.
              updateCoinbaseApiProviderAuthorization(httpProvider, newAccessToken);
              return resolve();

            }).catch(function(error) {
              $log.warn('Failed to refresh token, logging out');
              root.logout(oauthError.statusText);

              return reject({
                data: {
                  errors: [{
                    id: oauthError.coinbaseId,
                    message: oauthError.message + ': ' + error,
                    statusCode: oauthError.statusCode,
                    statusText: oauthError.statusText
                  }]
                }
              });
            });
            break;

          case 'revoked_token':
          case 'invalid_token':
          case 'invalid_grant':
            $log.warn(oauthError.message + ': logging out');
            root.logout(oauthError.statusText);

            return reject({
              data: {
                errors: [{
                  id: oauthError.coinbaseId,
                  message: oauthError.message,
                  statusCode: oauthError.statusCode,
                  statusText: oauthError.statusText
                }]
              }
            });
            break;

          default:
            // Should never happen.
            return reject(response);
        };

      } else {
        // Not an oauth error.
        return reject(response);
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
          saveToken(data.access_token, data.refresh_token, function(error, accessToken) {
            if (error) {
              return reject(getError('Could not save the access token', 'getToken'));
            }

            // Re-orient the api provider using the token.
            createCoinbaseApiProvider(accessToken);
            return resolve(accessToken);

          });
        } else {
          return reject(getError('No access token in response', 'getToken'));
        }
      }).catch(function(response) {
        reject(getError(response, 'getToken'));
      });
    });
  };

  function getTokenFromStorage() {
    return new Promise(function(resolve, reject) {
      storage.getAccessToken().then(function(accessToken) {
        resolve(accessToken);

      }).catch(function(error) {
        reject(getError(response, 'getTokenFromStorage'));
      });
    });
  };

  function saveToken(accessToken, refreshToken, cb) {
    storage.setAccessToken(accessToken).then(function() {
      return storage.setRefreshToken(refreshToken);

    }).then(function() {
      return cb(null, accessToken);

    }).catch(function(error) {
      $log.error('Coinbase: saveToken ' + error);
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
            saveToken(data.access_token, data.refresh_token, function(error, accessToken) {
              if (error) {
                return reject(getError('Could not save the access token', 'refreshToken'));
              }

              $log.info('Successfully refreshed token from Coinbase');
              return resolve(accessToken);
            });
          } else {
            return reject(getError('Could not get the access token', 'refreshToken'));
          }
        }).catch(function(response) {
          return reject(getError(response, 'refreshToken'));
        });

      }).catch(function(error) {
        return reject(getError('Could not get refresh token from storage: ' + error), 'refreshToken');
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

  function getError(response, callerId) {
    // Check for JS error.
    if (response.message) {
      return {
        id: 'unexpected_error',
        message: response.message
      }
    }

    $log.error('Coinbase: ' + callerId + ' - ' + getErrorsAsString(response.data));
    var error;

    if (response.status && response.status <= 0) {
      error = {
        id: 'network_error',
        message: 'Network error'
      };

    } else {
      // Typically, Coinbase returns an array of errors with just one element.
      // Only 'validation_error' may return more than one error.
      if (response.data.error) {
        error = {
          id: response.data.error,
          message: response.data.error_description
        };

      } else if (response.data.errors && lodash.isArray(response.data.errors)) {
        error = response.data.errors[0];

      } else if (response.data) {
        error = response.data;

      } else {
        // A simple text string.
        if (typeof response == 'object') {
          response = JSON.stringify(response);
        }
        error = {
          id: 'unexpected_error',
          message: response.toString()
        };
      }
    }

    return error;
  };

  function getErrorsAsString(data) {
    var errData;
    try {
      if (data && data.errors) { // Generic error format.
        errData = data.errors;

      } else if (data && data.error) { // Authentication error format.
        errData = data.error_description;

      } else {
        return 'Unknown error';
      }

      if (!lodash.isArray(errData)) {
        errData = errData && errData.message ? errData.message : errData;

      } else {
        var errStr = '';
        for (var i = 0; i < errData.length; i++) {
          errStr = errStr + errData[i].message + '. ';
        }
        errData = errStr;
      }

      return errData;

    } catch(e) {
      $log.error(e);
    };
  };

  return root;
});
