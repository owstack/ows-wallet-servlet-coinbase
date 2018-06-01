'use strict';

angular.module('owsWalletPlugin.api').factory('Coinbase', function (ApiMessage, Session) {

  Coinbase.pluginId = 'org.openwalletstack.wallet.plugin.servlet.coinbase';

  /**
   * Constructor.
   * @param {Object} configId - The configuration ID for the servlet.
   * @constructor
   *
   * config = {}
   */
  function Coinbase(configId) {
    var self = this;

    var config = Session.getInstance().plugin.dependencies[Coinbase.pluginId][configId];
    if (!config) {
      throw new Error('Could not create instance of Coinbase, check plugin configuration');
    }

    init();

    /**
     * Public functions
     */

    this.accessApi = function(oauthCode) {
      var request = {
        method: 'PUT',
        url: '/service',
        data: {
          state: 'access-api',
          oauthCode: oauthCode
        },
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getToken():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.accessAccount = function() {
      var request = {
        method: 'PUT',
        url: '/service',
        data: {
          state: 'access-account'
        },
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.accessAccount():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.logout = function() {
      var request = {
        method: 'PUT',
        url: '/service',
        data: {
          state: 'logout'
        },
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.logout():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getUrls = function() {
      var request = {
        method: 'GET',
        url: '/urls',
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getUrls():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getAccount = function(accountId) {
      var request = {
        method: 'GET',
        url: '/accounts/' + accountId,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getAccount():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getCurrentUser = function() {
      var request = {
        method: 'GET',
        url: '/user',
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getUser():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPaymentMethods = function() {
      var request = {
        method: 'GET',
        url: '/payment-methods',
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getPaymentMethods():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPriceInfo = function() {
      var request = {
        method: 'GET',
        url: '/prices',
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getPriceInfo():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.buyPrice = function(currency) {
      var request = {
        method: 'GET',
        url: '/prices/buy' + currency,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.buyPrice():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellPrice = function(currency) {
      var request = {
        method: 'GET',
        url: '/prices/sell' + currency,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.sellPrice():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getPendingTransactions = function() {
      var request = {
        method: 'GET',
        url: '/transactions/pending',
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getPendingTransactions():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.savePendingTransaction = function(tx, options) {
      var request = {
        method: 'POST',
        url: '/account/transactions',
        data: {
          tx: tx,
          options: options
        },
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.savePendingTransaction():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    /**
     * Private functions
     */

    function init() {
      var request = {
        method: 'PUT',
        url: '/service',
        data: {
          state: 'configure',
          config: config
        },
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.config():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    return this;
  };
 
  return Coinbase;
});
