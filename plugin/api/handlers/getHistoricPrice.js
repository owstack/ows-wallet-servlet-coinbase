'use strict';

angular.module('owsWalletPlugin.api').service('getHistoricPrice', function(coinbaseService) {

  var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var currencyPair = message.request.params.currencyPair;
    var period = message.request.params.period;

    if (!currencyPair) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required currency pair.'
        }
      };
      return callback(message);
    };

    coinbaseService.historicPrice(currencyPair, period).then(function(response) {

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
  };

  return root;
});
