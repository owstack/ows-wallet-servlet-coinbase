'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('sendTo', function(coinbaseService,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  var root = {};

  var REQUIRED_PARAMS = [
    'accountId'
  ];

  var REQUIRED_DATA = [
    'to',
    'amount',
    'currency'
  ];

  root.respond = function(message, callback) {
    // Check required parameters.
    var missing = Utils.checkRequired(REQUIRED_PARAMS, message.request.params);
    missing.push(Utils.checkRequired(REQUIRED_DATA, message.request.data));
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
    var data = message.request.data;

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
