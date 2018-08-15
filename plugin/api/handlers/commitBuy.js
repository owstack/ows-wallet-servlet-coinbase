'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('commitBuy', function(coinbaseService,
  /* @namespace owsWalletPluginClient.api */ Utils) {

	var root = {};

  var REQUIRED_PARAMS = [
    'accountId',
    'buyId'
  ];

  root.respond = function(message, callback) {
    // Check required parameters.
    var missing = Utils.checkRequired(REQUIRED_PARAMS, message.request.params);
    if (missing.length > 0) {
      message.response = {
        statusCode: 400,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'The request does not include ' + missing.toString() + '.'
        }
      };
      return callback(message);
    }

    var accountId = message.request.params.accountId;
    var buyId = message.request.params.buyId;
    var walletId = message.request.data.walletId;
    var priceStopLimitAmount = message.request.data.priceStopLimitAmount;

    // If this transaction should be monitored then capture the plugin id of the requestor for later notification.
    if (walletId) {
      var monitorData = {
        pluginId: message.header.clientId,
        priceStopLimitAmount: priceStopLimitAmount
      };

      coinbaseService.buyCommitFromWallet(accountId, walletId, buyId, monitorData).then(function(response) {

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

      coinbaseService.buyCommit(accountId, buyId).then(function(response) {

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
