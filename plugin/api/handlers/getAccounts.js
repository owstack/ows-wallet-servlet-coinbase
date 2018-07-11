'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getAccounts', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;

    // If accountId then one account is returned, else all accounts are returned.
    coinbaseService.getAccounts(accountId).then(function(response) {

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
