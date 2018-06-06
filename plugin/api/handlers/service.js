'use strict';

angular.module('owsWalletPlugin.api').service('service', function(coinbaseApiService) {

	var root = {};

  root.respond = function(message, callback) {
    // Request parameters.
    var state = message.request.data.state;
    var oauthCode = message.request.data.oauthCode;
    var pluginConfig = message.request.data.config;

    if (!state) {
      message.response = {
        statusCode: 500,
        statusText: 'REQUEST_NOT_VALID',
        data: {
          message: 'Missing required state.'
        }
      };
      return callback(message);
    };

    switch (state) {
      /**
       * Configure the Coinbase environment.
       */
      case 'configure':

        if (!pluginConfig) {
          message.response = {
            statusCode: 500,
            statusText: 'REQUEST_NOT_VALID',
            data: {
              message: 'Missing required configuration.'
            }
          };
          return callback(message);
        }

        coinbaseApiService.init(pluginConfig, function(err, accountId) {

          if (err) {
            message.response = {
              statusCode: 500,
              statusText: 'UNEXPECTED_ERROR',
              data: {
                message: err
              }
            };
            return callback(message);
          }

          message.response = {
            statusCode: 200,
            statusText: 'OK',
            data: accountId
          };
          return callback(message);

        });

        break;

      /**
       * Submit an oauth code to get an API access token.
       */
/*
      case 'access-api':
        if (!oauthCode) {
          message.response = {
            statusCode: 500,
            statusText: 'REQUEST_NOT_VALID',
            data: {
              message: 'Missing required oauth code.'
            }
          };
          return callback(message);
        }

        coinbaseApiService.getToken(oauthCode, function(error) {

          if (error) {
            message.response = {
              statusCode: 500,
              statusText: 'UNEXPECTED_ERROR',
              data: {
                message: error.message
              }
            };
            return callback(message);
          }

          message.response = {
            statusCode: 200,
            statusText: 'OK',
            data: data
          };
          return callback(message);

        });

        break;
*/
      /**
       * Initialize by getting access to the users account.
       */
      case 'access-account':
        coinbaseApiService.getAccountId(function(error, data) {

          if (error) {
            message.response = {
              statusCode: 500,
              statusText: 'UNEXPECTED_ERROR',
              data: {
                message: error.message
              }
            };
            return callback(message);
          }

          message.response = {
            statusCode: 200,
            statusText: 'OK',
            data: data
          };
          return callback(message);

        });
        break;

      /**
       * Remove all access tokens.
       */
      case 'logout':

        coinbaseApiService.logout();

        message.response = {
          statusCode: 200,
          statusText: 'OK',
          data: {}
        };
        return callback(message);
        break;
    }
	};

  return root;
});
