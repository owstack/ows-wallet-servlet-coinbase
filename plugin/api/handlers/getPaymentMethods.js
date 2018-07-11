'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getPaymentMethods', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var paymentMethodId = message.request.params.paymentMethodId;

    // If paymentMethodId then one payment mathod is returned, else all payment methods are returned.
    coinbaseService.getPaymentMethods(paymentMethodId).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: response
      };
      return callback(message);

    }).catch(function(error) {

      message.response = {
        statusCode: error.statusCode || 500,
        statusText: error.statusText || 'UNEXPECTED_ERROR',
        data: {
          message: error.message
        }
      };
      return callback(message);

    });
	};

  return root;
});
