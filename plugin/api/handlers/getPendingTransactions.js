'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getPendingTransactions', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {

    // Get a collection of pending transactions.
    var pendingTransactions = {
      data: {}
    };

    coinbaseService.getPendingTransactions(pendingTransactions).then(function(pendingTransactions) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: pendingTransactions
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
