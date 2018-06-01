'use strict';

angular.module('owsWalletPlugin.api').service('getPaymentMethods', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {

    coinbaseApiService.getPaymentMethods(accountId).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: txs
      };
      return callback(response);

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
