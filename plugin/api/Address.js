'use strict';

angular.module('owsWalletPlugin.api').factory('Address', function (CoinbaseServlet, PluginAPIHelper, Utils) {

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
});
