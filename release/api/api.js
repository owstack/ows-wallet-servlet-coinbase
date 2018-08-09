'use strict';

angular.module('owsWalletPlugin.api.coinbase', []).namespace().constant('CoinbaseServlet',
{
  id: 'org.openwalletstack.wallet.plugin.servlet.coinbase'
});

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Account', ['lodash', 'ApiMessage', 'owsWalletPlugin.api.coinbase.Address', 'owsWalletPluginClient.api.ApiError', 'owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.Constants', 'owsWalletPlugin.api.coinbase.Order', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPlugin.api.coinbase.Transaction', 'owsWalletPluginClient.api.Utils', function (lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Address,
  /* @namespace owsWalletPluginClient.api */ ApiError,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ Constants,
  /* @namespace owsWalletPlugin.api.coinbase */ Order,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPlugin.api.coinbase */ Transaction,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} accountData - The Coinbase account data from Coinbase.
   * @param {string} coinbase -The Coinbase object.
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
  var propertyMap = {
    'id': 'id',
    'name': 'name',
    'balance.amount': {property: 'balance.amount', type: 'float'},
    'balance.currency': 'balance.currency',
    'currency.code': 'currency.code',
    'currency.name': 'currency.name',
    'currency.color': 'currency.color',
    'sort': 'sort'
  };

  function Account(accountData, coinbaseObj) {
    var self = this;
    var accountData = accountData;
    Utils.assign(this, accountData, propertyMap);

    var coinbase = coinbaseObj;
    this.orders = [];
    this.transactions = [];

    // Set a sort order.
    this.sort = lodash.find(coinbase.currencies, function(c) {
      return c.code == self.currency.code;
    }).sort;

    this.isCryptoCurrency = Constants.isCryptoCurrency(this.currency.code);

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    this.getOrderById = function(id) {
      return lodash.find(this.orders, function(a) {
        return a.id == id;
      });
    };

    this.getBalance = function(altCurrency) {
      return coinbase.exchangeRates(self.currency.code).then(function(rates) {
        if (!rates[altCurrency]) {
          throw new ApiError({
            code: 400,
            message: 'BAD_REQUEST',
            detail: 'Could not get account balance, invalid currency: ' + altCurrency
          });
        }

        self.balance.altCurrency = altCurrency;
        self.balance.altAmount = self.balance.amount * parseFloat(rates[altCurrency]);
        return self.balance.altAmount;

      }).catch(function(error) {
        throw new ApiError(error);

      });
    };

    this.createAddress = function(name) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/addresses',
        data: {
          name: name || 'New receive address'
        },
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return new Address(response.data, self);

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    /**
     * Create a new buy order.
     * @param {Object} data - Buy request data.
     * @return {Promise<Invoice>} A promise for the buy request order.
     *
     * @See https://developers.coinbase.com/api/v2#place-buy-order
     *
     * data = {
     *   amount: [required] <number>,
     *   currency: [required] <string>,
     *   paymentMethodId: <string>
     * }
     */
    this.createBuyOrder = function(data) {
      data.commit = false;
      data.quote = false;

      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + self.id + '/buys',
        data: data,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.orders.push(new Order(response.data, self));
        return self.orders[self.orders.length-1];

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getBuyOrder = function(buyId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/buys/' + buyId,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    /**
     * Create a new sell order.
     * @param {Object} data - Sell request data.
     * @return {Promise<Invoice>} A promise for the sell request order.
     *
     * @See https://developers.coinbase.com/api/v2#place-sell-order
     *
     * data = {
     *   amount: [required] <number>,
     *   currency: [required] <string>,
     *   paymentMethodId: <string>
     * }
     */
    this.createSellOrder = function(data) {
      data.commit = false;
      data.quote = false;

      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + self.id + '/sells',
        data: data,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.orders.push(new Order(response.data, self));
        return self.orders[self.orders.length-1];

      }).catch(function(error) {
        throw new ApiError(error);

      });
    };

    /**
     * Send funds using this account. Used to create and broadcast a cryptocurrency transaction.
     * @param {Object} data - Send data.
     * @return {Promise<Invoice>} A promise for the send result.
     *
     * @See https://developers.coinbase.com/api/v2#send-money
     *
     * data = {
     *   to: [required] <address|email>,
     *   amount: [required] <number>,
     *   currency: [required] <string>,
     *   description: <string>
     * }
     */
    this.send = function(data) {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.id + '/transactions',
        data: data,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getTransaction = function(txId) {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions/' + txId,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts/' + this.id + '/transactions',
        data: {},
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        var transactions = response.data;
        self.transactions = [];

        lodash.forEach(transactions, function(txData) {
          self.transactions.push(new Transaction(txData, self));
        });
        return self.transactions;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    return this;
  };
 
  return Account;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Address', ['owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPluginClient.api.Utils', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} addressData - The address data from Coinbase.
   * @param {string} account -The Coinbase account.
   * @constructor
   *
   * Sample Coinbase address data response.
   * {
   *   id: 'd93d96cc-e4cd-547e-862d-ea374f53762b',
   *   address: '3675nKfBb9ZnvXeSBwspoFnsAK8ppat3Hp',
   *   name: 'New receive address',
   *   created_at: '2018-06-20T18:53:20Z',
   *   updated_at: '2018-06-20T18:53:20Z',
   *   network: 'bitcoin',
   *   uri_scheme: 'bitcoin',
   *   resource: 'address',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-7253fa641b0d/addresses/d93d96cc-e4cd-547e-862d-ea374f53762b',
   *   warning_title: 'Only send Bitcoin (BTC) to this address',
   *   warning_details: 'Sending any other digital asset, including Bitcoin Cash (BCH), will result in permanent loss.',
   *   callback_url: null
   * }
   */
  var propertyMap = {
    'address': 'address',
    'name': 'name',
    'uri_scheme': 'protocol',
    'warning_title': 'warning.title',
    'warning_details': 'warning.details'
  };

  function Address(addressData, accountObj) {
    var self = this;
    var addressData = addressData;
    Utils.assign(this, addressData, propertyMap);

    this.uri = this.protocol + ':' + this.address;

    var account = accountObj;

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return Address;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Coinbase', ['$log', 'lodash', 'ApiMessage', 'owsWalletPlugin.api.coinbase.Account', 'owsWalletPluginClient.api.ApiError', 'owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPlugin.api.coinbase.PaymentMethod', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPlugin.api.coinbase.User', function ($log, lodash, ApiMessage,
  /* @namespace owsWalletPlugin.api.coinbase */ Account,
  /* @namespace owsWalletPluginClient.api */ ApiError,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPlugin.api.coinbase */ PaymentMethod,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPlugin.api.coinbase */ User) {

  /**
   * Constructor.
   * @param {Function} onLogin - A callback function invoked when an oauth pairing event is received. Called with
   * the following arguments (error). 'error' specifies that an error occurred during the pairing process.
   * @param {Object} configId - The configuration ID for the servlet.
   * @constructor
   */
  function Coinbase(onLogin, configId) {
    var self = this;

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();
    var config = servlet.getConfig(configId);

    this.accounts = [];
    this.paymentMethods = [];
    this.urls = {};

    // The collection of currencies offered by Coinbase as 'products'.
    this.currencies = [{
      code: 'USD',
      name: 'US Dollar',
      sort: 0
    }, {
      code: 'BTC',
      name: 'Bitcoin',
      sort: 1
    }, {
      code: 'BCH',
      name: 'Bitcoin Cash',
      sort: 2
    }, {
      code: 'ETH',
      name: 'Ethereum',
      sort: 3
    }, {
      code: 'LTC',
      name: 'Litecoin',
      sort: 4
    }];

    var onCoinbaseLogin = onLogin;
    if (typeof onCoinbaseLogin != 'function') {
      throw {
        message: 'IMPLEMENTATION_ERROR',
        detail: 'You must provide an onLogin function to the constructor'
      };
    }

    // Attempt to get an authenticated connection using a previously paired state (stored API token).
    doLogin();

    /**
     * Public functions
     */

    this.login = function(oauthCode, onLogin) {
      onCoinbaseLogin = onLogin || onCoinbaseLogin;
      return doLogin(oauthCode);
    };

    this.logout = function() {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'logout'
        },
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getCurrencyByCode = function(code) {
      return lodash.find(this.currencies, function(c) {
        return c.code == code;
      });
    };

    this.getAccountByCurrencyCode = function(currencyCode) {
      return lodash.find(this.accounts, function(a) {
        return a.currency.code == currencyCode.toUpperCase();
      });
    };

    this.getAccountById = function(id) {
      return lodash.find(this.accounts, function(a) {
        return a.id == id;
      });
    };

    this.getPaymentMethodById = function(id) {
      return lodash.find(this.paymentMethods, function(m) {
        return m.id == id;
      });
    };

    this.updateAccountBalances = function(currency) {
      return new Promise(function(resolve, reject) {
        var count = self.accounts.length;
        lodash.forEach(self.accounts, function(account) {
          account.getBalance(currency).then(function(balance) {
            count--;
            if (!count) {
              resolve();
            }
          }).catch(function(error) {
            count--;
            if (!count) {
              resolve();
            }
          });
        });
      });
    };

    this.getAccounts = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/accounts'
      };

      return new ApiMessage(request).send().then(function(response) {
        if (response.data) {
          var accountObjs = response.data;
          self.accounts = [];

          lodash.forEach(accountObjs, function(account) {
            self.accounts.push(new Account(account, self));
          });

          // Perform a sort.
          self.accounts = lodash.sortBy(self.accounts, function(a) {
            return a.sort;
          });
        }

        return self.accounts;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getCurrentUser = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/user',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return new User(response.data);

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getPaymentMethods = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/paymentMethods',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        if (response.data) {
          var paymentMethodObjs = response.data;
          self.paymentMethods = [];

          lodash.forEach(paymentMethodObjs, function(paymentMethod) {
            self.paymentMethods.push(new PaymentMethod(paymentMethod));
          });
        }

        return self.paymentMethods;

      }).catch(function(error) {
        throw new ApiError(error);
        
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
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.sellPrice = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/sell/' + currency,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.spotPrice = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/spot',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.historicPrice = function(currencyPair, period) {
      var request = {
        method: 'GET',
        url: apiRoot + '/prices/historic/' + currencyPair + '/' + period,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.exchangeRates = function(currency) {
      var request = {
        method: 'GET',
        url: apiRoot + '/exchange-rates/' + (currency || 'USD'),
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    this.getPendingTransactions = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/transactions/pending',
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
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
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        return response.data;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    /**
     * Private functions
     */

    function doLogin(oauthCode) {
      var request = {
        method: 'PUT',
        url: apiRoot + '/service',
        data: {
          state: 'initialize',
          oauthCode: oauthCode,
          config: config
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.urls = lodash.get(response, 'data.info.urls', {});

        if (response.data.authenticated == true) {

          self.getAccounts().then(function(accounts) {
            onCoinbaseLogin();

          }).catch(function(error) {
            onCoinbaseLogin(error);

          });

        } else {
          // Not authenticated and no errors. Having this.accounts signals successful login.
          onCoinbaseLogin();
        }

      }).catch(function(error) {
        onCoinbaseLogin(error);

      });
    };

    return this;
  };
 
  return Coinbase;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Order', ['ApiMessage', 'owsWalletPluginClient.api.ApiError', 'owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPlugin.api.coinbase.PaymentMethod', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPluginClient.api.Utils', function (ApiMessage,
  /* @namespace owsWalletPluginClient.api */ ApiError,
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPlugin.api.coinbase */ PaymentMethod,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} txData - The Coinbase transaction data from Coinbase.
   * @param {string} account -The Account object.
   * @constructor
   *
   * Sample Coinbase order data response.
   * {
   *   id: 'b68f4ac0-882e-5ed6-9d58-231e2f83595f',
   *   status: 'invalid',
   *   payment_method: {
   *     id: 'baadb4cd-8fff-5d30-bf71-3178879c86fb',
   *     resource: 'payment_method',
   *     resource_path: '/v2/payment-methods/baadb4cd-8fff-5d30-bf71-3178879c86fb'
   *   },
   *   transaction": {
   *     id: '763d1401-fd17-5a18-852a-9cca5ac2f9c0',
   *     resource: 'transaction',
   *     resource_path: '/v2/accounts/2bbf394c-193b-5b2a-9155-3b4732659ede/transactions/441b9494-b3f0-5b98-b9b0-4d82c21c252a'
   *   },
   *   user_reference: 'JRPX59LW',
   *   created_at: '2018-07-09T18:43:37-07:00',
   *   updated_at: '2018-07-09T18:43:37-07:00',
   *   resource: 'buy',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-7253fa641b0d/buys/b68f4ac0-882e-5ed6-9d58-231e2f83595e',
   *   committed: false,
   *   payout_at: '2018-07-14T16:25:13Z',
   *   instant: false,
   *   fee: {
   *     amount: '10041.79',
   *     currency: 'USD'
   *   },
   *   amount: {
   *     amount: '100.00000000',
   *     currency: 'BTC'
   *   },
   *   total: {
   *     amount: '683987.75',
   *     currency: 'USD'
   *   },
   *   subtotal': {
   *     amount: '673945.96',
   *     currency: 'USD'
   *   },
   *   hold_until: null,
   *   hold_days: 0,
   *   requires_completion_step: false,
   *   is_first_buy: false
   * }
   */
  var propertyMap = {
    'id': 'id',
    'status': 'status',
    'payment_method.id': 'paymentMethodId',
    'transaction.id': 'transactionId',
    'created_at': 'created',
    'updated_at': 'updated',
    'resource': 'kind',
    'committed': 'committed',
    'payout_at': 'payoutDate',
    'fee.amount': 'fee.amount',
    'fee.currency': 'fee.currency',
    'amount.amount': 'amount.amount',
    'amount.currency': 'amount.currency',
    'total.amount': 'total.amount',
    'total.currency': 'total.currency',
    'subtotal.amount': 'subtotal.amount',
    'subtotal.currency': 'subtotal.currency',
    'is_first_buy': 'isFirstBuy'
  };

  function Order(orderData, accountObj) {
    var self = this;
    var orderData = orderData;
    Utils.assign(this, orderData, propertyMap);

    this.account = accountObj;

    // Use the order total to derive the precise order price (e.g., the precise BTC exchange rate for the order).
    this.calculatedExchangeRate = {
      amount: (this.total.amount - this.fee.amount) / this.amount.amount,
      currency: this.total.currency
    };

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    this.getPaymentMethod = function() {
      var request = {
        method: 'GET',
        url: apiRoot + '/paymentMethods/' + this.paymentMethodId,
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        self.paymentMethod = new PaymentMethod(response.data);

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    }

    /**
     * Confirm this order; either a buy or sell.
     * @return {Promise<Invoice>} A promise for the confirmed order.
     *
     * @See https://developers.coinbase.com/api/v2#place-buy-order
     */
    this.confirm = function() {
      var request = {
        method: 'POST',
        url: apiRoot + '/accounts/' + this.account.id + '/' + self.kind + 's/' + self.id + '/commit',
        data: {},
        opts: {
          cancelOn: [401]
        }
      };

      return new ApiMessage(request).send().then(function(response) {
        orderData = response.data.data;
        Utils.assign(self, orderData, propertyMap);
        return self;

      }).catch(function(error) {
        throw new ApiError(error);
        
      });
    };

    return this;
  };
 
  return Order;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('PaymentMethod', ['owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPluginClient.api.Utils', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} paymentMethodData - The payment method data from Coinbase.
   * @param {string} account -The Coinbase account.
   * @constructor
   *
   * Sample Coinbase payment method data response.
   * {
   *   id: 'baadb4cd-8fff-5d30-bf71-3178879c86fc',
   *   type: 'ach_bank_account',
   *   name: 'COMMUNITY CREDIT U... *********8728',
   *   currency: 'USD',
   *   primary_buy: true,
   *   primary_sell: true,
   *   allow_buy: true,
   *   allow_sell: true,
   *   allow_deposit: true,
   *   allow_withdraw: true,
   *   instant_buy: false,
   *   instant_sell: false,
   *   created_at: '2017-04-18T17:39:12Z',
   *   updated_at: '2017-04-20T19:17:25Z',
   *   resource: 'payment_method',
   *   resource_path: '/v2/payment-methods/baadb4cd-8fff-5d30-bf71-3178819c86fb',
   *   limits: {
   *     // Following limits for 'bank'
   *     //
   *     type: 'bank',
   *     name: 'Bank Account',
   *     buy: [{
   *       period_in_days: 7,
   *       total: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       remaining: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       description: '$15,000 of your $15,000 weekly bank limit remaining',
   *       label: 'Weekly bank limit',
   *       next_requirement: {
   *         type: 'buy_history',
   *         volume: {
   *           amount: '3000.00',
   *           currency: 'USD'
   *         },
   *         amount_remaining: {
   *           amount: '1000.00',
   *           currency: 'USD'
   *         },
   *         time_after_starting: 2592000
   *       }
   *     }],
   *     sell: [], // Same as buy
   *     deposit: [{
   *       period_in_days: 7,
   *       total: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       remaining: {
   *         amount: '15000.00',
   *         currency: 'USD'
   *       },
   *       description: '$15,000 of your $15,000 weekly bank limit remaining',
   *       label: 'Weekly bank limit'
   *     }],
   *     // Following limits for 'fiat_account'
   *     //
   *     type: 'fiat_account',
   *     name: 'Coinbase Account',
   *     sell: [{
   *       period_in_days: 7,
   *       total: {
   *         amount: '100000.00',
   *         currency: 'USD'
   *       },
   *       remaining: {
   *         amount: '100000.00',
   *         currency: 'USD'
   *       },
   *       description: '$100,000 of your $100,000 weekly Coinbase account limit remaining',
   *       label: 'Total USD limit',
   *       next_requirement: null
   *     }]
   *   },
   *   verified: true
   * }
   */
    
  var propertyMap = {
    'type': {property: 'type', type: 'map', map: {
      'ach_bank_account': 'bank',
      'sepa_bank_account': 'bank',
      'ideal_bank_account': 'bank',
      'fiat_account': 'account',
      'bank_wire': 'wire',
      'credit_card': 'card',
      'secure3d_card': 'card',
      'eft_bank_account': 'bank',
      'interac': 'bank'
    }},
    'id': 'id',
    'name': 'name',
    'currency': 'currency',
    'primary_buy': 'primary.buy',
    'primary_sell': 'primary.sell',
    'allow_buy': 'permission.buy',
    'allow_sell': 'permission.sell',
    'allow_deposit': 'permission.deposit',
    'allow_withdraw': 'permission.withdraw',
    'instant_buy': 'permission.instantBuy',
    'instant_sell': 'permission.instantSell',
    'limits.buy[0].total.amount': 'limits.buy.amount',
    'limits.buy[0].total.currency': 'limits.buy.currency',
    'limits.buy[0].description': 'limits.buy.description',
    'limits.sell[0].total.amount': 'limits.sell.amount',
    'limits.sell[0].total.currency': 'limits.sell.currency',
    'limits.sell[0].description': 'limits.sell.description',
    'verified': 'verified'
  };

  function PaymentMethod(paymentMethodData, accountObj) {
    var self = this;
    var paymentMethodData = paymentMethodData;
    Utils.assign(this, paymentMethodData, propertyMap);

    var account = accountObj;

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return PaymentMethod;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('Transaction', ['owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPluginClient.api.Utils', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} txData - The Coinbase transaction data from Coinbase.
   * @param {string} account -The Account object.
   * @constructor
   *
   * Sample Coinbase transaction data response.
   * {
   *   id: 'e4833235-7d4d-5de7-a624-7996c5350720',
   *   type: 'exchange_deposit',
   *   status: 'completed',
   *   amount: {
   *     amount: '-1.04996200',
   *     currency: 'BTC'
   *   },
   *   native_amount': {
   *     amount: '-15828.17',
   *     currency: 'USD'
   *   },
   *   description: null,
   *   created_at: '2017-12-29T06:26:47Z',
   *   updated_at: '2017-12-29T06:26:47Z',
   *   resource: 'transaction',
   *   resource_path: '/v2/accounts/17b8256d-263d-5915-be51-7253fa6c1b0d/transactions/f4833235-7d4d-5de7-a624-7996c5750720',
   *   instant_exchange: false,
   *   details: {
   *     title: 'Transferred Bitcoin',
   *     subtitle: 'To GDAX'
   *   }
   * }
   *
   * Transaction status:
   *   'pending'
   *   'completed'
   *   'failed'
   *   'expired'
   *   'canceled'
   *   'waiting_for_signature'
   *   'waiting_for_clearing'
   *
   * Transaction types:
   *   'send'
   *   'request'
   *   'transfer'
   *   'buy'
   *   'sell'
   *   'fiat_deposit'
   *   'fiat_withdrawal'
   *   'exchange_deposit'
   *   'exchange_withdrawal'
   *   'vault_withdrawal'
   */
  var propertyMap = {
    'id': 'id',
    'status': 'status',
    'type': {property: 'type', type: 'map', map: {
      'send': 'sent',
      'request': 'in',
      'transfer': 'out',
      'buy': 'exchange',
      'sell': 'exchange',
      'fiat_deposit': 'in',
      'fiat_withdrawal': 'out',
      'exchange_deposit': 'in',
      'exchange_withdrawal': 'out',
      'vault_withdrawal': 'out'
    }},
    'amount.amount': {property: 'amount', type: 'float'},
    'amount.currency': 'currency',
    'native_amount.amount': {property: 'altAmount', type: 'float'},
    'native_amount.currency': 'altCurrency',
    'created_at': {property: 'created', type: 'date'},
    'description': 'description',
    'details.title': 'title',
    'details.subtitle': 'subtitle'
  };

  function Transaction(txData, accountObj) {
    var self = this;
    var txData = txData;
    Utils.assign(this, txData, propertyMap);

    var account = accountObj;

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return Transaction;
}]);

'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('User', ['owsWalletPlugin.api.coinbase.CoinbaseServlet', 'owsWalletPluginClient.api.PluginApiHelper', 'owsWalletPluginClient.api.Utils', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginApiHelper,
  /* @namespace owsWalletPluginClient.api */ Utils) {

  /**
   * Constructor.
   * @param {string} userData - The user data from Coinbase.
   * @constructor
   *
   * Sample Coinbase current user data response.
   * {
   *	 id: '53abc85d-3c57-5bfe-8947-4cd493312e1a',
   *	 name: 'Satoshi Nakamoto',
   *	 username: null,
   *	 profile_location: null,
   *	 profile_bio: null,
   *	 profile_url: null,
   *	 avatar_url: 'https://images.coinbase.com/avatar?h=526a8d237e23512077000%2F85%2BNO%2FpdvemGBmQ%2BMUAD1XAc0PpOo85FFNChvq%0Au9ED&s=128',
   *	 resource: 'user',
   *	 resource_path: '/v2/user',
   *   email: 'satoshi@bitcoin.com',
   *   time_zone: 'Pacific Time (US & Canada)',
   *   native_currency: 'USD',
   *   bitcoin_unit: 'BTC',
   *   state: 'CA',
   *   country: {
   *		 code: 'US',
   *		 name: 'United States of America',
   *	   is_in_europe: false
   *	 },
   *	 created_at: '2013-10-25T15:24:19Z',
   *   tiers: {
   *		 completed_description: 'Level 3',
   *		 upgrade_button_text: null,
   *		 header: null,
   *	   body: null
   *   }
   * }
   *
   * Sample Coinbase user auth data response.
   * {
   *   method: 'oauth',
   *   scopes: [
   *     'wallet:accounts:read',
   *     'wallet:addresses:read',
   *     'wallet:addresses:create',
   *     'wallet:user:read',
   *     'wallet:user:email',
   *     'wallet:buys:read',
   *     'wallet:buys:create',
   *     'wallet:sells:read',
   *     'wallet:sells:create',
   *     'wallet:transactions:read',
   *     'wallet:transactions:send',
   *     'wallet:payment-methods:read'],
   *   oauth_meta: {
   *     send_limit_amount: '1.00',
   *     send_limit_currency: 'USD',
   *     send_limit_period: 'day'
   *   }
   * }
   */
    
  var propertyMap = {
    'user.name': 'name',
    'user.email': 'email',
    'user.country.name': 'country',
    'user.native_currency': 'nativeCurrency',
    'auth.oauth_meta.send_limit_amount': 'sendLimit.amount',
    'auth.oauth_meta.send_limit_currency': 'sendLimit.currency',
    'auth.oauth_meta.send_limit_period': 'sendLimit.period'
  };

  function User(userData) {
    var self = this;
    var userData = userData;
    Utils.assign(this, userData, propertyMap);

    var servlet = new PluginApiHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return User;
}]);
