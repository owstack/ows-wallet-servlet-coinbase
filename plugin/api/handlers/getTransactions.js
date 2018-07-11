'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getTransactions', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;
    var transactionId = message.request.params.transactionId;

    if (!accountId) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required data, must provide accountId.'
        }
      };
      return callback(message);
    };

    if (!transactionId) {
      // Get a collection of transactions.
      coinbaseService.getTransactions(accountId).then(function(response) {

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

    } else {
      // Get a single transaction.
      coinbaseService.getTransaction(accountId, transactionId).then(function(response) {

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
    }
	};

  return root;
});
