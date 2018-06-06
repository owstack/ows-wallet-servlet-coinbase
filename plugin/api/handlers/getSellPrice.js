'use strict';

angular.module('owsWalletPlugin.api').service('getSellPrice', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var currency = message.request.params.currency;

    if (!currency) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required currency.'
        }
      };
      return callback(message);
    };

    coinbaseApiService.sellPrice(currency).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: account
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
