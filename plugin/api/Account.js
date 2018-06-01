'use strict';

angular.module('owsWalletPlugin.api').factory('Account', function (ApiMessage) {

  /**
   * Constructor.
   * @param {string} id - The Coinbase account ID.
   * @constructor
   */
  function Account(id) {
    var self = this;

    var accountId = id;

    /**
     * Public functions
     */

    this.createAddress = function(data) {
      var request = {
        method: 'POST',
        url: '/addresses/' + accountId,
        data: data,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.createAddress():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.buyRequest = function(data) {
      var request = {
        method: 'POST',
        url: '/accounts/buys/' + accountId,
        data: data,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.buyRequest():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: '/accounts/' + accountId + '/buys/' + buyId,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getBuyOrder():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellRequest = function(data) {
      var request = {
        method: 'POST',
        url: '/accounts/' + accountId + '/sells',
        data: data,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.sellRequest():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: '/account/' + accountId + '/transactions/' + txId,
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getTransaction():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: '/account/' + accountId + '/transactions',
        data: {},
        responseObj: {}
      }

      return new ApiMessage(request).send().then(function(response) {
        return repsonse;

      }).catch(function(error) {
        $log.error('Coinbase.getTransactions():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    return this;
  };
 
  return Account;
});
