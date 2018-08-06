'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Order', function (ApiMessage,
  /* @namespace owsWalletPluginClient.api */ ApiError,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPlugin.api.coinbase */ PaymentMethod,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} txData - The Coinbase transaction data from Coinbase.
   * @param {string} account -The Account object.
   * @constructor
   *
   * Sample Coinbase order data response.
   * {
   *   id: 'b68f4ac0-882e-5ed6-9d58-231e2f83595f',
   *   status: 'invalid',
   *   payment_method: {
   *     id: 'baadb4cd-8fff-5d30-bf71-3178879c86fb',
   *     resource: 'payment_method',
   *     resource_path: '/v2/payment-methods/baadb4cd-8fff-5d30-bf71-3178879c86fb'
   *   },
   *   transaction": {
   *     id: '763d1401-fd17-5a18-852a-9cca5ac2f9c0',
   *     resource: 'transaction',
   *     resource_path: '/v2/accounts/2bbf394c-193b-5b2a-9155-3b4732659ede/transactions/441b9494-b3f0-5b98-b9b0-4d82c21c252a'
   *   },
   *   user_reference: 'JRPX59LW',
   *   created_at: '2018-07-09T18:43:37-07:00',
   *   updated_at: '2018-07-09T18:43:37-07:00',
   *   resource: 'buy',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-7253fa641b0d/buys/b68f4ac0-882e-5ed6-9d58-231e2f83595e',
   *   committed: false,
   *   payout_at: '2018-07-14T16:25:13Z',
   *   instant: false,
   *   fee: {
   *     amount: '10041.79',
   *     currency: 'USD'
   *   },
   *   amount: {
   *     amount: '100.00000000',
   *     currency: 'BTC'
   *   },
   *   total: {
   *     amount: '683987.75',
   *     currency: 'USD'
   *   },
   *   subtotal': {
   *     amount: '673945.96',
   *     currency: 'USD'
   *   },
   *   hold_until: null,
   *   hold_days: 0,
   *   requires_completion_step: false,
   *   is_first_buy: false
   * }
   */
  var propertyMap = {
    'id': 'id',
    'status': 'status',
    'payment_method.id': 'paymentMethodId',
    'transaction.id': 'transactionId',
    'created_at': 'created',
    'updated_at': 'updated',
    'resource': 'kind',
    'committed': 'committed',
    'payout_at': 'payoutDate',
    'fee.amount': 'fee.amount',
    'fee.currency': 'fee.currency',
    'amount.amount': 'amount.amount',
    'amount.currency': 'amount.currency',
    'total.amount': 'total.amount',
    'total.currency': 'total.currency',
    'subtotal.amount': 'subtotal.amount',
    'subtotal.currency': 'subtotal.currency',
    'is_first_buy': 'isFirstBuy'
  };

  function Order(orderData, accountObj) {
    var self = this;
    var orderData = orderData;
    Utils.assign(this, orderData, propertyMap);

    this.account = accountObj;

    // Use the order total to derive the precise order price (e.g., the precise BTC exchange rate for the order).
    this.calculatedExchangeRate = {
      amount: (this.total.amount - this.fee.amount) / this.amount.amount,
      currency: this.total.currency
    };

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    this.getPaymentMethod = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/paymentMethods/' + this.paymentMethodId,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.paymentMethod = new PaymentMethod(response.data);

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    }

    /**
     * Confirm this order; either a buy or sell.
     * @return {Promise<Invoice>} A promise for the confirmed order.
     *
     * @See https://developers.coinbase.com/api/v2#place-buy-order
     */
    this.confirm = function() {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.account.id + '/' + self.kind + 's/' + self.id + '/commit',
        data: {},
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        orderData = response.data.data;
        Utils.assign(self, orderData, propertyMap);
        return self;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    return this;
  };
 
  return Order;
});
