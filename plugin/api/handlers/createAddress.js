'use strict';

angular.module('owsWalletPlugin.api').service('createAddress', function(coinbaseService) {

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
          message: 'Missing required data, must provide accountId.'
        }
      };
      return callback(message);
    };

    coinbaseService.createAddress(accountId, data).then(function(response) {

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
