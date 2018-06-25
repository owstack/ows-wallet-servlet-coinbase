'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Transaction', function (
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
});
