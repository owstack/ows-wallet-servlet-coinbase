'use strict';

angular.module('owsWalletPlugin.api.coinbase', []).namespace().constant('CoinbaseServlet',
{
  id: 'org.openwalletstack.wallet.plugin.servlet.coinbase'
});

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Account', ['$log', 'lodash', 'ApiMessage', 'owsWalletPlugin.api.coinbase.Address', 'owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginAPIHelper', 'owsWalletPlugin.api.coinbase.Transaction', 'owsWalletPluginClient.api.Utils', function ($log, lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Address,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginAPIHelper,
  /* @namespace owsWalletPlugin.api.coinbase */ Transaction,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} accountData - The Coinbase account data from Coinbase.
   * @param {string} coinbase -The Coinbase object.
   * @constructor
   *
   * Sample Coinbase account data response.
   * {
   *   id: '17b8256d-263d-5915-be51-4563fa641b0d',
   *   name: 'My Wallet',
   *   primary: true,
   *   type: 'wallet',
   *   currency': {
   *     code: 'BTC',
   *     name: 'Bitcoin',
   *     color: '#FFB119',
   *     exponent: 8,
   *     type: 'crypto',
   *     address_regex: '^([13][a-km-zA-HJ-NP-Z1-9]{25,34})|^(bc1([qpzry7x8gf2tvdw0s3jn54khce6mua7l]{39}|[qpzry7x8gf2tvdw0s3jn54khce6mua7l]{59}))$'
   *   },
   *   balance': {
   *     amount: '0.00000000',
   *     currency: 'BTC'
   *   },
   *   created_at: '2013-10-25T15:30:08Z',
   *   updated_at: '2017-12-29T06:26:47Z',
   *   resource: 'account',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-4563fa641b0d'
   * }
   */
  var propertyMap = {
    'id': 'id',
    'name': 'name',
    'balance.amount': {property: 'balance.amount', type: 'float'},
    'balance.currency': 'balance.currency',
    'currency.code': 'currency.code',
    'currency.name': 'currency.name',
    'currency.color': 'currency.color',
    'sort': 'sort'
  };

  function Account(accountData, coinbaseObj) {
    var self = this;
    var accountData = accountData;
    Utils.assign(this, accountData, propertyMap);

    var coinbase = coinbaseObj;
    this.transactions = [];

    // Set a sort order.
    this.sort = lodash.findIndex(coinbase.currencySortOrder, function(c) {
      return c.code == self.currency.code;
    });
    this.sort = (this.sort < 0 ? 99 : this.sort); // Move items not found to end of sort.

    this.isCryptoCurrency = coinbase.isCryptoCurrency(this.currency.code);

    var servlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    this.getBalance = function(currency) {
      return coinbase.exchangeRates(this.balance.amount).then(function(rates) {
        if (!rates[currency]) {
          throw new Error('Could not get account balance, invalid currency: ' + currency);
        }

        self.balance.altCurrency = currency;
        self.balance.altAmount = self.balance.amount * parseFloat(rates[currency]);
        return self.balance.altAmount;

      }).catch(function(error) {
        throw new Error(error.message || error);

      });
    };

    this.createAddress = function(name) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/addresses',
        data: {
          name: name || 'New receive address'
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return new Address(response.data, self);

      }).catch(function(error) {
        $log.error('Account.createAddress():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.buyRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/buys/' + this.id,
        data: data
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Account.buyRequest():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/buys/' + buyId
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Account.getBuyOrder():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/sells',
        data: data
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Account.sellRequest():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions/' + txId
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Account.getTransaction():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions',
        data: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        var transactions = response.data;
        self.transactions = [];

        lodash.forEach(transactions, function(txData) {
          self.transactions.push(new Transaction(txData, self));
        });
        return self.transactions;

      }).catch(function(error) {
        $log.error('Account.getTransactions():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    return this;
  };
 
  return Account;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Address', ['owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginAPIHelper', 'owsWalletPluginClient.api.Utils', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginAPIHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} addressData - The address data from Coinbase.
   * @param {string} account -The Coinbase account.
   * @constructor
   *
   * Sample Coinbase address data response.
   * {
   *   id: 'd93d96cc-e4cd-547e-862d-ea374f53762b',
   *   address: '3675nKfBb9ZnvXeSBwspoFnsAK8ppat3Hp',
   *   name: 'New receive address',
   *   created_at: '2018-06-20T18:53:20Z',
   *   updated_at: '2018-06-20T18:53:20Z',
   *   network: 'bitcoin',
   *   uri_scheme: 'bitcoin',
   *   resource: 'address',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-7253fa641b0d/addresses/d93d96cc-e4cd-547e-862d-ea374f53762b',
   *   warning_title: 'Only send Bitcoin (BTC) to this address',
   *   warning_details: 'Sending any other digital asset, including Bitcoin Cash (BCH), will result in permanent loss.',
   *   callback_url: null
   * }
   */
  var propertyMap = {
    'address': 'address',
    'name': 'name',
    'uri_scheme': 'protocol',
    'warning_title': 'warning.title',
    'warning_details': 'warning.details'
  };

  function Address(addressData, accountObj) {
    var self = this;
    var addressData = addressData;
    Utils.assign(this, addressData, propertyMap);

    this.uri = this.protocol + ':' + this.address;

    var account = accountObj;

    var servlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return Address;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Coinbase', ['$log', 'lodash', 'ApiMessage', 'owsWalletPlugin.api.coinbase.Account', 'owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginAPIHelper', function ($log, lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Account,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginAPIHelper) {

  /**
   * Constructor.
   * @param {Object} configId - The configuration ID for the servlet.
   * @param {Function} onConnect - A callback function invoked when an oauth pairing event is received. Called with
   * the following arguments (error, haveAccount). 'error' specifies that an error occurred during the pairing process.
   * 'haveAccount' is true if we are paired with an account, false if pairing is still required (has not been done yet).
   * If an error occurred then 'hasAccount' is undefined.
   * @constructor
   */
  function Coinbase(configId, onConnect) {
    var self = this;

    var servlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();
    var config = servlet.getConfig(configId);

    this.accounts;
    this.urls;

    // The collection of crypto-currencies offered by Coinbase.
    // Array is in display 'sort' order.
    this.cryptoCurrencies = [{
      code: 'BTC'
    }, {
      code: 'BCH'
    }, {
      code: 'ETH'
    }, {
      code: 'LTC'
    }];

    this.altCurrencies = [{
      code: 'USD'
    }];

    this.allCurrencies = this.altCurrencies.concat(this.cryptoCurrencies);
    this.currencySortOrder = this.allCurrencies;

    var onCoinbaseConnect = onConnect;
    if (typeof onCoinbaseConnect != 'function') {
      throw new Error('You must provide an onConnect function to the constructor');
    }

    // Attempt to get a connection using a previously paired state (stored API token).
    doConnect();

    /**
     * Events
     */

    // coinbase.oauth - Result of an oauth exchange of code for an API token.
    //
    // Applies only to on mobile URI redirect from Coinbase. Event is handled by host app and sent here.
    owswallet.Plugin.onEvent('coinbase.oauth', function(event) {
      if (event.data.status == 'ERROR') {
        $log.error('Could not connect to Coinbase: ' + event.data.message);
        onCoinbaseConnect(event.data.message);
      } else {
        onCoinbaseConnect();
      }
    });

    /**
     * Public functions
     */

    this.connect = function(oauthCode, onConnect) {
      onCoinbaseConnect = onConnect || onCoinbaseConnect;
      return doConnect(oauthCode);
    };

    this.logout = function() {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'logout'
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.logout():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.isCryptoCurrency = function(currencyCode) {
      var c = lodash.find(this.cryptoCurrencies, function(c) {
        return c.code == currencyCode;
      });
      return (c != undefined);
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

    this.getCurrentUser = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/user'
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        $log.error('Coinbase.getCurrentUser():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPaymentMethods = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/payment-methods'
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

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
        url: apiRoot + '/prices/buy/' + currency
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
        url: apiRoot + '/prices/sell/' + currency
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
        url: apiRoot + '/prices/spot'
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
        url: apiRoot + '/prices/historic/' + currencyPair + '/' + period
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
        url: apiRoot + '/exchange-rates/' + (currency || 'USD')
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
        url: apiRoot + '/transactions/pending'
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

    function doConnect(oauthCode) {
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
        self.urls = response.data.info.urls;

        // If there is no account then we are not paired with our Coinbase account; don't create an account instance.
        if (response.data.accounts) {
          self.accounts = [];
          lodash.forEach(response.data.accounts, function(account) {
            self.accounts.push(new Account(account, self));
          });

          // Perform a sort.
          self.accounts = lodash.sortBy(self.accounts, function(a) {
            return a.sort;
          });
        }

        onCoinbaseConnect();

      }).catch(function(error) {
        $log.error('Coinbase.connect():' + error.message + ', ' + error.detail);
        onCoinbaseConnect(error);

      });
    };

    return this;
  };
 
  return Coinbase;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Transaction', ['owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginAPIHelper', 'owsWalletPluginClient.api.Utils', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginAPIHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} txData - The Coinbase transaction data from Coinbase.
   * @param {string} account -The Account object.
   * @constructor
   *
   * Sample Coinbase transaction data response.
   * {
   *   id: 'e4833235-7d4d-5de7-a624-7996c5350720',
   *   type: 'exchange_deposit',
   *   status: 'completed',
   *   amount: {
   *     amount: '-1.04996200',
   *     currency: 'BTC'
   *   },
   *   native_amount': {
   *     amount: '-15828.17',
   *     currency: 'USD'
   *   },
   *   description: null,
   *   created_at: '2017-12-29T06:26:47Z',
   *   updated_at: '2017-12-29T06:26:47Z',
   *   resource: 'transaction',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-7253fa6c1b0d/transactions/f4833235-7d4d-5de7-a624-7996c5750720',
   *   instant_exchange: false,
   *   details: {
   *     title: 'Transferred Bitcoin',
   *     subtitle: 'To GDAX'
   *   }
   * }
   *
   * Transaction status:
   *   'pending'
   *   'completed'
   *   'failed'
   *   'expired'
   *   'canceled'
   *   'waiting_for_signature'
   *   'waiting_for_clearing'
   *
   * Transaction types:
   *   'send'
   *   'request'
   *   'transfer'
   *   'buy'
   *   'sell'
   *   'fiat_deposit'
   *   'fiat_withdrawal'
   *   'exchange_deposit'
   *   'exchange_withdrawal'
   *   'vault_withdrawal'
   */
  var propertyMap = {
    'id': 'id',
    'status': 'status',
    'type': {property: 'type', type: 'map', map: {
      'send': 'sent',
      'request': 'in',
      'transfer': 'out',
      'buy': 'exchange',
      'sell': 'exchange',
      'fiat_deposit': 'in',
      'fiat_withdrawal': 'out',
      'exchange_deposit': 'in',
      'exchange_withdrawal': 'out',
      'vault_withdrawal': 'out'
    }},
    'amount.amount': {property: 'amount', type: 'float'},
    'amount.currency': 'currency',
    'native_amount.amount': {property: 'altAmount', type: 'float'},
    'native_amount.currency': 'altCurrency',
    'created_at': {property: 'created', type: 'date'},
    'description': 'description',
    'details.title': 'title',
    'details.subtitle': 'subtitle'
  };

  function Transaction(txData, accountObj) {
    var self = this;
    var txData = txData;
    Utils.assign(this, txData, propertyMap);

    var account = accountObj;

    var servlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return Transaction;
}]);
