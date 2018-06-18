'use strict';

angular.module('owsWalletPlugin.api').service('getExchangeRates', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var currency = message.request.params.currency;

    coinbaseService.getExchangeRates(currency).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: response
      };
      return callback(message);

    }).catch(function(error) {

      message.response = {
        statusCode: 404,
        statusText: 'UNEXPECTED_ERROR',
        data: {
          message: error.message
        }
      };
      return callback(message);

    });

	};

  return root;
});
