'use strict';

angular.module('owsWalletPlugin.api').service('getUrls', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {

    message.response = {
      statusCode: 200,
      statusText: 'OK',
      data: coinbaseApiService.getUrls()
    };
    return callback(message);

	};

  return root;
});
