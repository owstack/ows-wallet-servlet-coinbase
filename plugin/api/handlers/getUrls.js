'use strict';

angular.module('owsWalletPlugin.api').service('getUrls', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {

    message.response = {
      statusCode: 200,
      statusText: 'OK',
      data: coinbaseService.getUrls()
    };
    return callback(response);

	};

  return root;
});
