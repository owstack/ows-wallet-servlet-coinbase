'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Account', function (lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Address,
  /* @namespace owsWalletPluginClient.api */ ApiError,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ Constants,
  /* @namespace owsWalletPlugin.api.coinbase */ Order,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
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
    this.orders = [];
    this.transactions = [];

    // Set a UI sort order for this account.
    this.sort = coinbase.preferredSort(self.currency.code);

    this.isCryptoCurrency = Constants.isCryptoCurrency(this.currency.code);

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    this.getOrderById = function(id) {
      return lodash.find(this.orders, function(a) {
        return a.id == id;
      });
    };

    this.getBalance = function(altCurrency) {
      return coinbase.exchangeRates(self.currency.code).then(function(rates) {
        if (!rates[altCurrency]) {
          throw new ApiError({
            code: 400,
            message: 'BAD_REQUEST',
            detail: 'Could not get account balance, invalid currency: ' + altCurrency
          });
        }

        self.balance.altCurrency = altCurrency;
        self.balance.altAmount = self.balance.amount * parseFloat(rates[altCurrency]);
        return self.balance.altAmount;

      }).catch(function(error) {
        throw new ApiError(error);

      });
    };

    this.createAddress = function(name) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/addresses',
        data: {
          name: name || 'New receive address'
        },
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return new Address(response.data, self);

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    /**
     * Create a new buy order.
     * @param {Object} data - Buy request data.
     * @return {Promise<Invoice>} A promise for the buy request order.
     *
     * @See https://developers.coinbase.com/api/v2#place-buy-order
     *
     * data = {
     *   amount: [required] <number>,
     *   currency: [required] <string>,
     *   paymentMethodId: <string>,
     *   walletId: <string> [optional] - if specified then the wallet will be used as the destination for the transaction.
     * }
     */
    this.createBuyOrder = function(data) {
      data.commit = false;
      data.quote = false;

      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + self.id + '/buys',
        data: data,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.orders.push(new Order(response.data, self));
        return self.orders[self.orders.length-1];

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/buys/' + buyId,
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

    /**
     * Create a new sell order.
     * @param {Object} data - Sell request data.
     * @return {Promise<Invoice>} A promise for the sell request order.
     *
     * @See https://developers.coinbase.com/api/v2#place-sell-order
     *
     * data = {
     *   amount: [required] <number>,
     *   currency: [required] <string>,
     *   paymentMethodId: <string>,
     *   walletId: <string> [optional] - if specified then the wallet will be used as the source for the transaction with the
     *   intent of auto-committing the transaction at the appropriate time (see priceStopLimitAmount).
     *   priceStopLimitAmount: <number> [optional] - if specified then the sell order will be committed only if the market price
     *   is greater than or equal to priceStopLimitAmount.
     * }
     */
    this.createSellOrder = function(data) {
      data.commit = false;
      data.quote = false;

      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + self.id + '/sells',
        data: data,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.orders.push(new Order(response.data, self));
        return self.orders[self.orders.length-1];

      }).catch(function(error) {
        throw new ApiError(error);

      });
    };

    /**
     * Send funds using this account. Used to create and broadcast a cryptocurrency transaction.
     * @param {Object} data - Send data.
     * @return {Promise<Invoice>} A promise for the send result.
     *
     * @See https://developers.coinbase.com/api/v2#send-money
     *
     * data = {
     *   to: [required] <address|email>,
     *   amount: [required] <number>,
     *   currency: [required] <string>,
     *   description: <string>
     * }
     */
    this.send = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/transactions',
        data: data,
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

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions/' + txId,
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

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions',
        data: {},
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        var transactions = response.data;
        self.transactions = [];

        lodash.forEach(transactions, function(txData) {
          self.transactions.push(new Transaction(txData, self));
        });
        return self.transactions;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    return this;
  };
 
  return Account;
});
