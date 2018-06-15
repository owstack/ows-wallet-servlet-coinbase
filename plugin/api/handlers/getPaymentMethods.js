'use strict';

angular.module('owsWalletPlugin.api').service('getPaymentMethods', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {

    coinbaseService.getPaymentMethods(accountId).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: txs
      };
      return callback(message);

    }).catch(function(error) {

      message.response = {
        statusCode: 500,
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
