'use strict';

angular.module('owsWalletPlugin.api').service('savePendingTransaction', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var tx = message.request.data.tx;
    var options = message.request.data.options;

    if (!tx) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required transaction.'
        }
      };
      return callback(message);
    };

    coinbaseApiService.savePendingTransaction(tx, options, function(error) {
      if (error) {
        message.response = {
          statusCode: 500,
          statusText: 'UNEXPECTED_ERROR',
          data: {
            message: error.message
          }
        };
        return callback(message);
      }

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: {}
      };
      return callback(message);

    });
	};

  return root;
});
