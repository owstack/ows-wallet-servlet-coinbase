'use strict';

angular.module('owsWalletPlugin.api').service('getAccounts', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;

    if (accountId) {
      // Get a single account by id.
      coinbaseApiService.getAccounts().then(function(response) {

        message.response = {
          statusCode: 200,
          statusText: 'OK',
          data: response
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

    } else {
      // Get a collection of accounts.
      coinbaseApiService.getAccounts().then(function(response) {

        message.response = {
          statusCode: 200,
          statusText: 'OK',
          data: response
        };
        return callback(message);

      }).catch(function(error) {

        message.response = {
          statusCode: 404,
          statusText: 'UNEXPECTED_ERROR',
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
