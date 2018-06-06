'use strict';

angular.module('owsWalletPlugin').config(function($pluginConfigProvider) {

  /**
   * API routes for our service.
   * A match is made by searching routes in order, the first match returns the route.
   */
  $pluginConfigProvider.router.routes([
    { path: '/accounts/:accountId',               method: 'GET',  handler: 'getAccounts' },
    { path: '/accounts/:accountId/addresses',     method: 'POST', handler: 'createAddress' },
    { path: '/accounts/:accountId/buys',          method: 'POST', handler: 'requestBuy' },
    { path: '/accounts/:accountId/sells',         method: 'POST', handler: 'requestSell' },
    { path: '/currencies',                        method: 'GET',  handler: 'getAvailableCurrencies' },
    { path: '/payment-methods',                   method: 'GET',  handler: 'getPaymentMethods' },
    { path: '/prices',                            method: 'GET',  handler: 'getPriceInfo' },
    { path: '/prices/buy/:currency',              method: 'GET',  handler: 'getBuyPrice' },
    { path: '/prices/sell/:currency',             method: 'GET',  handler: 'getSellPrice' },
    { path: '/service',                           method: 'PUT',  handler: 'service' },
    { path: '/transactions/pending',              method: 'GET',  handler: 'getPendingTransactions' },
    { path: '/transactions/pending',              method: 'POST', handler: 'savePendingTransactions' },
    { path: '/urls',                              method: 'GET',  handler: 'getUrls' },
    { path: '/user',                              method: 'GET',  handler: 'getUser' }
  ]);

})
.run(function() {

  owswallet.Plugin.ready(function() {

    // Do initialization here.

  });

});
