'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getAccountTransactions', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;

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

    coinbaseService.getAccountTransactions(accountId).then(function(transactions) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: transactions
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
