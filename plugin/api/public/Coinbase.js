'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Coinbase', function ($log, lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Account,
  /* @namespace owsWalletPluginClient.api */ ApiError,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ Constants,
  /* @namespace owsWalletPlugin.api.coinbase */ PaymentMethod,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPlugin.api.coinbase */ User) {

  /**
   * Constructor.
   * @param {Function} onLogin - A callback function invoked when an oauth pairing event is received. Called with
   * the following arguments (error). 'error' specifies that an error occurred during the pairing process.
   * @param {Object} configId - The configuration ID for the servlet.
   * @constructor
   */
  function Coinbase(onLogin, configId) {
    var self = this;

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();
    var config = servlet.getConfig(configId);

    this.accounts = [];
    this.paymentMethods = [];
    this.urls = {};

    // A list of currencies supported by Coinbase with preferred sort order the UI.
    var currencies = [
      { code: 'USD', sort: 0 },
      { code: 'BTC', sort: 1 },
      { code: 'BCH', sort: 2 },
      { code: 'ETH', sort: 3 },
      { code: 'ETC', sort: 4 },
      { code: 'LTC', sort: 5 }
    ];

    var onCoinbaseLogin = onLogin;
    if (typeof onCoinbaseLogin != 'function') {
      throw {
        message: 'IMPLEMENTATION_ERROR',
        detail: 'You must provide an onLogin function to the constructor'
      };
    }

    // Attempt to get an authenticated connection using a previously paired state (stored API token).
    doLogin();

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
        throw new ApiError(error);
        
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
            count--;
            if (!count) {
              resolve();
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

        return self.accounts;

      }).catch(function(error) {
        throw new ApiError(error);
        
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
        throw new ApiError(error);
        
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
        throw new ApiError(error);
        
      });
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
        throw new ApiError(error);
        
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
        throw new ApiError(error);
        
      });
    };

    this.spotPrice = function() {
      var cryptoCurrencies = lodash.filter(currencies, function(c) {
        return Constants.isCryptoCurrency(c.code);
      });

      var request = {
        method: 'GET',
        url: apiRoot + '/prices/spot',
        data: {
          cryptoCurrencies: lodash.map(cryptoCurrencies, function(c) { return c.code; })
        },
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
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
        throw new ApiError(error);
        
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
        throw new ApiError(error);
        
      });
    };

    this.getPendingTransactions = function(walletId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/wallet/' + walletId + '/transactions/pending',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        var transactions = [];

        lodash.forEach(response.data, function(txData) {
          transactions.push(new Transaction(txData));
        });
        return transactions;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };


    this.preferredSort = function(currency) {
      var x = lodash.find(currencies, function(c) {
        return c.code == currency;
      });

      return (x ? x.sort : 99); // If not found then put at end.
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
        self.urls = lodash.get(response, 'data.info.urls', {});

        if (response.data.authenticated == true) {

          self.getAccounts().then(function(accounts) {
            onCoinbaseLogin();

          }).catch(function(error) {
            onCoinbaseLogin(error);

          });

        } else {
          // Not authenticated and no errors. Having this.accounts signals successful login.
          onCoinbaseLogin();
        }

      }).catch(function(error) {
        onCoinbaseLogin(error);

      });
    };

    return this;
  };
 
  return Coinbase;
});
