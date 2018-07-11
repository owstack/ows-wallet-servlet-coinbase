'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getCurrentUser', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {
    var data = {
      user: {},
      auth: {}
    };

    coinbaseService.getCurrentUser().then(function(response) {
      data.user = response;

      coinbaseService.getUserAuth().then(function(response) {
        data.auth = response;

        message.response = {
          statusCode: 200,
          statusText: 'OK',
          data: data
        };
        return callback(message);

      });

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
