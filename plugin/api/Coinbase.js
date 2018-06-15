'use strict';

angular.module('owsWalletPlugin.api').factory('Coinbase', function ($log, Account, ApiMessage, CoinbaseServlet, PluginAPIHelper) {

  /**
   * Constructor.
   * @param {Object} configId - The configuration ID for the servlet.
   * @param {Function} onConnect - A callback function invoked when an oauth pairing event is received. Called with
   * the following arguments (error, haveAccount). 'error' specifies that an error occurred during the pairing process.
   * 'haveAccount' is true if we are paired with an account, false if pairing is still required (has not been done yet).
   * If an error occurred then 'hasAccount' is undefined.
   * @constructor
   */
  function Coinbase(configId, onConnect) {
    var self = this;

    CoinbaseServlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = CoinbaseServlet.apiRoot();
    var config = CoinbaseServlet.getConfig(configId);

    this.account;
    this.availableCurrencies;
    this.urls;

    var onCoinbaseConnect = onConnect;
    if (typeof onCoinbaseConnect != 'function') {
      throw new Error('You must provide an onConnect function to the constructor');
    }

    // Attempt to get a connection using a previously paired state (stored API token).
    doConnect();

    /**
     * Events
     */

    // coinbase.oauth - Result of an oauth exchange of code for an API token.
    //
    // Applies only to on mobile URI redirect from Coinbase. Event is handled by host app and sent here.
    owswallet.Plugin.onEvent('coinbase.oauth', function(event) {
      if (event.data.status == 'ERROR') {
        $log.error('Could not connect to Coinbase: ' + event.data.message);
        onCoinbaseConnect(event.data.message);
      } else {
        onCoinbaseConnect();
      }
    });

    /**
     * Public functions
     */

    this.connect = function(oauthCode, onConnect) {
      onCoinbaseConnect = onConnect || onCoinbaseConnect;
      return doConnect(oauthCode);
    };

    this.logout = function() {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'logout'
        },
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.logout():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getCurrentUser = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/user',
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getUser():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPaymentMethods = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/payment-methods',
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getPaymentMethods():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPriceSensitivity = function() {
      var priceSensitivity = [{
        value: 0.5,
        name: '0.5%'
      }, {
        value: 1,
        name: '1%'
      }, {
        value: 2,
        name: '2%'
      }, {
        value: 5,
        name: '5%'
      }, {
        value: 10,
        name: '10%'
      }];

      var selectedPriceSensitivity = priceSensitivity[1];

      return {
        values: priceSensitivity,
        selected: selectedPriceSensitivity
      };
    };

    this.buyPrice = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/buy/' + currency,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.buyPrice():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellPrice = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/sell/' + currency,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.sellPrice():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.spotPrice = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/spot',
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.spotPrice():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.historicPrice = function(currencyPair, period) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/historic/' + currencyPair + '/' + period,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.historicPrice():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPendingTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/transactions/pending',
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getPendingTransactions():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.savePendingTransaction = function(tx, options) {
      var request = {
        method: 'POST',
        url: apiRoot + '/account/transactions',
        data: {
          tx: tx,
          options: options
        },
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.savePendingTransaction():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    /**
     * Private functions
     */

    function doConnect(oauthCode) {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'initialize',
          oauthCode: oauthCode,
          config: config
        },
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        self.availableCurrencies = response.info.availableCurrencies;
        self.urls = response.info.urls;

        // If there is no account id then we are not paired with our Coinbase account; don't create an account instance.
        if (response.accountData && response.accountData.id) {
          self.account = new Account(response.accountData);
        }

        onCoinbaseConnect();

      }).catch(function(error) {
        $log.error('Coinbase.connect():' + error.message + ', ' + error.detail);
        onCoinbaseConnect(error);

      });
    };

    return this;
  };
 
  return Coinbase;
});
