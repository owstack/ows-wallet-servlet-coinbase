'use strict';

angular.module('owsWalletPlugin.api').factory('Account', function ($log, lodash, ApiMessage, CoinbaseServlet, PluginAPIHelper, System) {

  /**
   * Constructor.
   * @param {string} accountData - The Coinbase account data from Coinbase.
   * @constructor
   *
   * Sample Coinbase account data response.
   * {
   *   id: '17b8256d-263d-5915-be51-4563fa641b0d',
   *   name: 'My Wallet',
   *   primary: true,
   *   type: 'wallet',
   *   currency': {
   *     code: 'BTC',
   *     name: 'Bitcoin',
   *     color: '#FFB119',
   *     exponent: 8,
   *     type: 'crypto',
   *     address_regex: '^([13][a-km-zA-HJ-NP-Z1-9]{25,34})|^(bc1([qpzry7x8gf2tvdw0s3jn54khce6mua7l]{39}|[qpzry7x8gf2tvdw0s3jn54khce6mua7l]{59}))$'
   *   },
   *   balance': {
   *     amount: '0.00000000',
   *     currency: 'BTC'
   *   },
   *   created_at: '2013-10-25T15:30:08Z',
   *   updated_at: '2017-12-29T06:26:47Z',
   *   resource: 'account',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-4563fa641b0d'
   * }
   */
  var publicProperties = ['id', 'name', 'currency.code', 'currency.name', 'currency.color', 'balance'];

  function Account(accountData) {
    var self = this;
    var accountData = accountData;
    System.assign(this, accountData, publicProperties);

    CoinbaseServlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = CoinbaseServlet.apiRoot();

    /**
     * Public functions
     */

    this.createAddress = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/addresses/' + this.accountId,
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.createAddress():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.buyRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/buys/' + this.accountId,
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.buyRequest():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.accountId + '/buys/' + buyId,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getBuyOrder():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.sellRequest = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.accountId + '/sells',
        data: data,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.sellRequest():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/account/' + this.accountId + '/transactions/' + txId,
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getTransaction():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/account/' + this.accountId + '/transactions',
        data: {},
        responseObj: {}
      };

      return new ApiMessage(request).send().then(function(response) {
        return response;

      }).catch(function(error) {
        $log.error('Coinbase.getTransactions():' + error.message + ', detail:' + error.detail);
        throw new Error(error.message);
        
      });
    };

    return this;
  };
 
  return Account;
});

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

    // coinbase.account - Result of an attempt to obtain an account ID following a successful oauth pairing.
    //
    // Applies only to on mobile URI redirect from Coinbase. Event is handled by host app and sent here.
    owswallet.Plugin.onEvent('coinbase.account', function(event) {
      if (event.data.status == 'ERROR') {
        $log.error('Could not get Coinbase account: ' + event.data.message);
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

'use strict';

angular.module('owsWalletPlugin.api').constant('CoinbaseServlet', 
{
  id: 'org.openwalletstack.wallet.plugin.servlet.coinbase'
});
