'use strict';

angular.module('owsWalletPlugin.api').factory('Account', function ($log, lodash, ApiMessage, CoinbaseServlet, PluginAPIHelper, Address, Utils, Transaction) {

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
        },
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return new Address(response, self);

      }).catch(function(error) {
        $log.error('Account.createAddress():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.buyRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/buys/' + this.id,
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Account.buyRequest():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/buys/' + buyId,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Account.getBuyOrder():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/sells',
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Account.sellRequest():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions/' + txId,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Account.getTransaction():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions',
        data: {},
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(transactions) {
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
});
