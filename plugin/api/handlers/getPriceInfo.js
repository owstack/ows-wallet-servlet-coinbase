'use strict';

angular.module('owsWalletPlugin.api').service('getPriceInfo', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {

    message.response = {
      statusCode: 200,
      statusText: 'OK',
      data: coinbaseService.getPriceSensitivity()
    };
    return callback(response);

	};

  return root;
});
