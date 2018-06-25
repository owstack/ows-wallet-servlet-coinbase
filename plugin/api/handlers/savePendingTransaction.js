'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('savePendingTransaction', function(coinbaseService) {

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
          message: 'Missing required data, must provide tx.'
        }
      };
      return callback(message);
    };

    coinbaseService.savePendingTransaction(tx, options, function(error) {
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
