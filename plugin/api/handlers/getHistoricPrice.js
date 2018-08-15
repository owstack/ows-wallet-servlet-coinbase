'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getHistoricPrice', function(coinbaseService,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  var root = {};

  var REQUIRED_PARAMS = [
    'currencyPair',
    'period'
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

    var currencyPair = message.request.params.currencyPair;
    var period = message.request.params.period;

    coinbaseService.historicPrice(currencyPair, period).then(function(response) {

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
