'use strict';

angular.module('owsWalletPlugin.api').service('service', function(coinbaseService) {

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
       * Initialize the Coinbase environment with specified configurtion and attempt to pair to an account
       * or obtain an account ID if already paired.
       */
      case 'initialize':

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

        // Initialize service configuration and attempt to get an account ID. If an oauthCode is specified
        // then it will be used to get the API token followed by the account ID. If an account ID cannot be 
        // obtained then no error will result and the accountId is undefined.
        coinbaseService.init(pluginConfig, oauthCode).then(function(data) {

          message.response = {
            statusCode: 200,
            statusText: 'OK',
            data: data
          };
          return callback(message);

        }).catch(function(error) {

          message.response = {
            statusCode: 500,
            statusText: 'UNEXPECTED_ERROR',
            data: {
              message: error
            }
          };
          return callback(message);

        });

        break;

      /**
       *  Remove all access tokens.
       */
      case 'logout':

        coinbaseService.logout().then(function() {

          message.response = {
            statusCode: 200,
            statusText: 'OK',
            data: {}
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

        break;

      /**
       *  Invalid request.
       */
      default:

        message.response = {
          statusCode: 500,
          statusText: 'REQUEST_NOT_VALID',
          data: {
            message: 'Unrecognized state.'
          }
        };
        return callback(message);

        break;
    }

	};

  return root;
});
