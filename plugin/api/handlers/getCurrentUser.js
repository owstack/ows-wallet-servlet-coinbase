'use strict';

angular.module('owsWalletPlugin.api').service('getCurrentUser', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {

    coinbaseService.getCurrentUser().then(function(response) {

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
