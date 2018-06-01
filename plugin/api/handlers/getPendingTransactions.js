'use strict';

angular.module('owsWalletPlugin.api').service('getPendingTransactions', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {

    // Get a collection of pending transactions.
    var pendingTransactions = {
      data: {}
    };

    coinbaseApiService.getPendingTransactions(pendingTransactions).then(function() {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: pendingTransactions
      };
      return callback(message);

    }).then(function(error){

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
