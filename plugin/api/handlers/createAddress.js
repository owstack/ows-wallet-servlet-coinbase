'use strict';

angular.module('owsWalletPlugin.api').service('createAddress', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;
    var data = message.request.data.data;

    if (!accountId) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required account id.'
        }
      };
      return callback(message);
    };

    coinbaseApiService.createAddress(accountId, data).then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: account
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
