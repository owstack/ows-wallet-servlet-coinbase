'use strict';

angular.module('owsWalletPlugin.apiHandlers').service('getSpotPrice', function(coinbaseService) {

	var root = {};

  root.respond = function(message, callback) {

    coinbaseService.spotPrice().then(function(response) {

      message.response = {
        statusCode: 200,
        statusText: 'OK',
        data: response
      };
      return callback(message);

      // reject() is never called by implementation.
      
    });
	};

  return root;
});
