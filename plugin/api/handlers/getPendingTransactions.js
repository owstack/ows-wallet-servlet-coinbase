'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getPendingTransactions', function(monitorDataService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var walletId = message.request.params.walletId;

    monitorDataService.getPendingTransactions(walletId).then(function(pendingTransactions) {

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
