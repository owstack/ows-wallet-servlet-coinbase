'use strict';

angular.module('owsWalletPlugin.api').factory('Account', function ($log, ApiMessage, CoinbaseServlet, PluginAPIHelper, System) {

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
  var publicProperties = ['id', 'name', 'currency.code', 'currency.name', 'currency.color', 'balance', 'sort'];

  function Account(accountData, coinbaseObj) {
    var self = this;
    var accountData = accountData;
    System.assign(this, accountData, publicProperties);

    var coinbase = coinbaseObj;

    // Convert numeric values to numbers.
    this.balance.amount = parseFloat(this.balance.amount);

    CoinbaseServlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = CoinbaseServlet.apiRoot();

    /**
     * Public functions
     */

    this.getBalance = function(currency) {
      return coinbase.exchangeRates(this.balance.currency).then(function(rates) {
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

    this.createAddress = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/addresses/' + this.accountId,
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.createAddress():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.buyRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/buys/' + this.accountId,
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.buyRequest():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.accountId + '/buys/' + buyId,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getBuyOrder():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.accountId + '/sells',
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.sellRequest():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/account/' + this.accountId + '/transactions/' + txId,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getTransaction():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/account/' + this.accountId + '/transactions',
        data: {},
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getTransactions():' + error.message + ', ' + error.detail);
        throw new Error(error.message);
        
      });
    };

    return this;
  };
 
  return Account;
});
