'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('PaymentMethod', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} paymentMethodData - The payment method data from Coinbase.
   * @param {string} account -The Coinbase account.
   * @constructor
   *
   * Sample Coinbase payment method data response.
   * {
   *   id: 'baadb4cd-8fff-5d30-bf71-3178879c86fc',
   *   type: 'ach_bank_account',
   *   name: 'COMMUNITY CREDIT U... *********8728',
   *   currency: 'USD',
   *   primary_buy: true,
   *   primary_sell: true,
   *   allow_buy: true,
   *   allow_sell: true,
   *   allow_deposit: true,
   *   allow_withdraw: true,
   *   instant_buy: false,
   *   instant_sell: false,
   *   created_at: '2017-04-18T17:39:12Z',
   *   updated_at: '2017-04-20T19:17:25Z',
   *   resource: 'payment_method',
   *   resource_path: '/v2/payment-methods/baadb4cd-8fff-5d30-bf71-3178819c86fb',
   *   limits: {
   *     // Following limits for 'bank'
   *     //
   *     type: 'bank',
   *     name: 'Bank Account',
   *     buy: [{
   *       period_in_days: 7,
   *       total: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       remaining: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       description: '$15,000 of your $15,000 weekly bank limit remaining',
   *       label: 'Weekly bank limit',
   *       next_requirement: {
   *         type: 'buy_history',
   *         volume: {
   *           amount: '3000.00',
   *           currency: 'USD'
   *         },
   *         amount_remaining: {
   *           amount: '1000.00',
   *           currency: 'USD'
   *         },
   *         time_after_starting: 2592000
   *       }
   *     }],
   *     sell: [], // Same as buy
   *     deposit: [{
   *       period_in_days: 7,
   *       total: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       remaining: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       description: '$15,000 of your $15,000 weekly bank limit remaining',
   *       label: 'Weekly bank limit'
   *     }],
   *     // Following limits for 'fiat_account'
   *     //
   *     type: 'fiat_account',
   *     name: 'Coinbase Account',
   *     sell: [{
   *       period_in_days: 7,
   *       total: {
   *         amount: '100000.00',
   *         currency: 'USD'
   *       },
   *       remaining: {
   *         amount: '100000.00',
   *         currency: 'USD'
   *       },
   *       description: '$100,000 of your $100,000 weekly Coinbase account limit remaining',
   *       label: 'Total USD limit',
   *       next_requirement: null
   *     }]
   *   },
   *   verified: true
   * }
   */
    
  var propertyMap = {
    'type': {property: 'type', type: 'map', map: {
      'ach_bank_account': 'bank',
      'sepa_bank_account': 'bank',
      'ideal_bank_account': 'bank',
      'fiat_account': 'account',
      'bank_wire': 'wire',
      'credit_card': 'card',
      'secure3d_card': 'card',
      'eft_bank_account': 'bank',
      'interac': 'bank'
    }},
    'id': 'id',
    'name': 'name',
    'currency': 'currency',
    'primary_buy': 'primary.buy',
    'primary_sell': 'primary.sell',
    'allow_buy': 'permission.buy',
    'allow_sell': 'permission.sell',
    'allow_deposit': 'permission.deposit',
    'allow_withdraw': 'permission.withdraw',
    'instant_buy': 'permission.instantBuy',
    'instant_sell': 'permission.instantSell',
    'limits.buy[0].total.amount': 'limits.buy.amount',
    'limits.buy[0].total.currency': 'limits.buy.currency',
    'limits.buy[0].description': 'limits.buy.description',
    'limits.sell[0].total.amount': 'limits.sell.amount',
    'limits.sell[0].total.currency': 'limits.sell.currency',
    'limits.sell[0].description': 'limits.sell.description',
    'verified': 'verified'
  };

  function PaymentMethod(paymentMethodData, accountObj) {
    var self = this;
    var paymentMethodData = paymentMethodData;
    Utils.assign(this, paymentMethodData, propertyMap);

    var account = accountObj;

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return PaymentMethod;
});
