'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('commitSell', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var accountId = message.request.params.accountId;
    var sellId = message.request.params.sellId;
    var walletId = message.request.data.walletId;
    var amount = message.request.data.amount;
    var priceStopLimitAmount = message.request.data.priceStopLimitAmount;

    if (!accountId || !sellId) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required data, must provide accountId and sellId.'
        }
      };
      return callback(message);
    };

      // If there is walletId then the commitment to sell is from a wallet, not a Coinbase account. The sell order
      // will be created after the wallet send to Coinbase account completes.
    if (walletId) {
      var monitorData = {
        pluginId: message.header.clientId,
        priceStopLimitAmount: priceStopLimitAmount
      };

      coinbaseService.sellCommitFromWallet(accountId, walletId, amount, monitorData).then(function(response) {

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

    } else if (sellId) {

      // If there is sellId then the commitment to sell is from a Coinbase account, not a wallet. The sell order
      // has already been created.
      coinbaseService.sellCommit(accountId, sellId).then(function(response) {

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
