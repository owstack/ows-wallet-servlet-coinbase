'use strict';

angular.module('owsWalletPlugin.api.coinbase').factory('User', function (
  /* @namespace owsWalletPlugin.api.coinbase */ CoinbaseServlet,
  /* @namespace owsWalletPluginClient.api */ PluginAPIHelper,
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

    var servlet = new PluginAPIHelper(CoinbaseServlet);
    var apiRoot = servlet.apiRoot();

    /**
     * Public functions
     */

    return this;
  };
 
  return User;
});
