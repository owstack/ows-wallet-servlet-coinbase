'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('sendTo', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;
    var data = message.request.data;

    if (!accountId || !data.to || !data.amount || !data.currency) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required data, must provide accountId, to, amount, currency.'
        }
      };
      return callback(message);
    };

    coinbaseService.sendTo(accountId, data).then(function(response) {

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