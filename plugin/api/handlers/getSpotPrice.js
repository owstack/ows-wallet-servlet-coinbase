'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getSpotPrice', function(coinbaseService,
  /* @namespace owsWalletPluginClient.api */ Utils) {

	var root = {};

  var REQUIRED_DATA = [
    'cryptoCurrencies'
  ];

  root.respond = function(message, callback) {
    // Check required parameters.
    var missing = Utils.checkRequired(REQUIRED_DATA, message.request.data);
    if (missing.length > 0) {
      message.response = {
        statusCode: 400,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'The request does not include ' + missing.toString() + '.'
        }
      };
      return callback(message);
    }

    var cryptoCurrencies = message.request.data.cryptoCurrencies;

    coinbaseService.spotPrice(cryptoCurrencies).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: response
      };
      return callback(message);

      // reject() is never called by implementation.
      
    });
	};

  return root;
});
