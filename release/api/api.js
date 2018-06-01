'use strict';

angular.module('owsWalletPlugin.api').factory('Coinbase', function (ApiMessage, Session) {

  Coinbase.pluginId = 'org.openwalletstack.wallet.plugin.servlet.coinbase';

  /**
   * Constructor.
   * @param {Object} configId - The configuration ID for the servlet.
   * @constructor
   *
   * config = {}
   */
  function Coinbase(configId) {
    var self = this;

    var config = Session.getInstance().plugin.dependencies[Coinbase.pluginId][configId];
    if (!config) {
      throw new Error('Could not create instance of Coinbase, check plugin configuration');
    }

    /**
     * Public functions
     */

    /**
     * Create a new invoice.
     * @param {Object} data - Payment request data.
     * @return {Promise<Invoice>} A promise for the invoice.
     */
    this.say = function(message) {
      var request = {
        method: 'POST',
        url: '/hello/say',
        data: {
          config: config,
          data: {
            message: message
          }
        },
        responseObj: String
      }

      return new ApiMessage(request).send();
    };

    return this;
  };
 
  return Coinbase;
});
