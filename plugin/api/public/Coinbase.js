'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Coinbase', function ($log, lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Account,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPlugin.api.coinbase */ PaymentMethod,
  /* @namespace owsWalletPluginClient.api */ PluginAPIHelper,
  /* @namespace owsWalletPlugin.api.coinbase */ User) {

  /**
   * Constructor.
   * @param {Object} configId - The configuration ID for the servlet.
   * @param {Function} onLogin - A callback function invoked when an oauth pairing event is received. Called with
   * the following arguments (error, haveAccount). 'error' specifies that an error occurred during the pairing process.
   * 'haveAccount' is true if we are paired with an account, false if pairing is still required (has not been done yet).
   * If an error occurred then 'hasAccount' is undefined.
   * @constructor
   */
  function Coinbase(configId, onLogin) {
    var self = this;

    var servlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();
    var config = servlet.getConfig(configId);

    this.accounts;
    this.paymentMethods;
    this.urls;

    // The collection of currencies offered by Coinbase as 'products'.
    this.currencies = [{
      code: 'USD',
      name: 'US Dollar',
      sort: 0
    }, {
      code: 'BTC',
      name: 'Bitcoin',
      sort: 1
    }, {
      code: 'BCH',
      name: 'Bitcoin Cash',
      sort: 2
    }, {
      code: 'ETH',
      name: 'Ethereum',
      sort: 3
    }, {
      code: 'LTC',
      name: 'Litecoin',
      sort: 4
    }];

    var onCoinbaseLogin = onLogin;
    if (typeof onCoinbaseLogin != 'function') {
      throw new Error('You must provide an onLogin function to the constructor');
    }

    // Attempt to get an authenticated connection using a previously paired state (stored API token).
    doLogin();

    /**
     * Events
     */

    // coinbase.oauth - Result of an oauth exchange of code for an API token.
    //
    // Applies only to on mobile URI redirect from Coinbase. Event is handled by host app and sent here.
    owswallet.Plugin.onEvent('coinbase.oauth', function(event) {
      if (event.data.status == 'ERROR') {
        $log.error('Could not authenticate with Coinbase: ' + event.data.message);
        onCoinbaseLogin(event.data.message);
      } else {
        onCoinbaseLogin();
      }
    });

    /**
     * Public functions
     */

    this.login = function(oauthCode, onLogin) {
      onCoinbaseLogin = onLogin || onCoinbaseLogin;
      return doLogin(oauthCode);
    };

    this.logout = function() {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'logout'
        },
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.logout():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getCurrencyByCode = function(code) {
      return lodash.find(this.currencies, function(c) {
        return c.code == code;
      });
    };

    this.getAccountByCurrencyCode = function(currencyCode) {
      return lodash.find(this.accounts, function(a) {
        return a.currency.code == currencyCode;
      });
    };

    this.getAccountById = function(id) {
      return lodash.find(this.accounts, function(a) {
        return a.id == id;
      });
    };

    this.getPaymentMethodById = function(id) {
      return lodash.find(this.paymentMethods, function(m) {
        return m.id == id;
      });
    };

    this.updateAccountBalances = function(currency) {
      return new Promise(function(resolve, reject) {
        var count = self.accounts.length;
        lodash.forEach(self.accounts, function(account) {
          account.getBalance(currency).then(function(balance) {
            count--;
            if (!count) {
              resolve();
            }
          }).catch(function(error) {
            $log.error(error);
            count--;
            if (!count) {
              resolve(); // Just log error and resolve
            }
          });
        });
      });
    };

    this.getAccounts = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts'
      };

      return new ApiMessage(request).send().then(function(response) {

        if (response.data) {
          var accountObjs = response.data;
          self.accounts = [];

          lodash.forEach(accountObjs, function(account) {
            self.accounts.push(new Account(account, self));
          });

          // Perform a sort.
          self.accounts = lodash.sortBy(self.accounts, function(a) {
            return a.sort;
          });
        }

      }).catch(function(error) {
        $log.error('Coinbase.getAccounts(): ' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getCurrentUser = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/user',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return new User(response.data);

      }).catch(function(error) {
        $log.error('Coinbase.getCurrentUser():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPaymentMethods = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/paymentMethods',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        if (response.data) {
          var paymentMethodObjs = response.data;
          self.paymentMethods = [];

          lodash.forEach(paymentMethodObjs, function(paymentMethod) {
            self.paymentMethods.push(new PaymentMethod(paymentMethod));
          });
        }

        return self.paymentMethods;

      }).catch(function(error) {
        $log.error('Coinbase.getPaymentMethods():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPriceSensitivity = function() {
      var priceSensitivity = [{
        value: 0.5,
        name: '0.5%'
      }, {
        value: 1,
        name: '1%'
      }, {
        value: 2,
        name: '2%'
      }, {
        value: 5,
        name: '5%'
      }, {
        value: 10,
        name: '10%'
      }];

      var selectedPriceSensitivity = priceSensitivity[1];

      return {
        values: priceSensitivity,
        selected: selectedPriceSensitivity
      };
    };

    this.buyPrice = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/buy/' + currency,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.buyPrice():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellPrice = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/sell/' + currency,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.sellPrice():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.spotPrice = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/spot',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.spotPrice():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.historicPrice = function(currencyPair, period) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/historic/' + currencyPair + '/' + period,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.historicPrice():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.exchangeRates = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/exchange-rates/' + (currency || 'USD'),
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.exchangeRates():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPendingTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/transactions/pending',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.getPendingTransactions():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.savePendingTransaction = function(tx, options) {
      var request = {
        method: 'POST',
        url: apiRoot + '/account/transactions',
        data: {
          tx: tx,
          options: options
        },
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.savePendingTransaction():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    /**
     * Private functions
     */

    function doLogin(oauthCode) {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'initialize',
          oauthCode: oauthCode,
          config: config
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.urls = lodash.get(response, 'data.info.urls', []);

        self.getAccounts().then(function() {
          onCoinbaseLogin();

        }).catch(function(error) {
          onCoinbaseLogin(error);

        });

      }).catch(function(error) {
        $log.error('Coinbase.doLogin():' + error.message + ', ' + error.detail);
        onCoinbaseLogin(error);

      });
    };

    return this;
  };
 
  return Coinbase;
});
