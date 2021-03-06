'use strict';

angular.module('owsWalletPlugin').config(function($pluginConfigProvider) {

  /**
   * API routes for our service.
   * A match is made by searching routes in order, the first match returns the route.
   */
  $pluginConfigProvider.router.routes([
    { path: '/accounts/:accountId?',                      method: 'GET',  handler: 'getAccounts' },
    { path: '/accounts/:accountId/addresses',             method: 'POST', handler: 'createAddress' },
    { path: '/accounts/:accountId/buys',                  method: 'POST', handler: 'requestBuy' },
    { path: '/accounts/:accountId/buys/:buyId/commit',    method: 'POST', handler: 'commitBuy' },
    { path: '/accounts/:accountId/sells',                 method: 'POST', handler: 'requestSell' },
    { path: '/accounts/:accountId/sells/:sellId/commit',  method: 'POST', handler: 'commitSell' },
    { path: '/accounts/:accountId/transactions',          method: 'GET',  handler: 'getTransactions' },
    { path: '/accounts/:accountId/transactions',          method: 'POST', handler: 'sendTo' },
    { path: '/exchange-rates/:currency?',                 method: 'GET',  handler: 'getExchangeRates' },
    { path: '/paymentMethods/:paymentMethodId?',          method: 'GET',  handler: 'getPaymentMethods' },
    { path: '/prices',                                    method: 'GET',  handler: 'getPriceInfo' },
    { path: '/prices/buy/:currency',                      method: 'GET',  handler: 'getBuyPrice' },
    { path: '/prices/historic/:currencyPair/:period',     method: 'GET',  handler: 'getHistoricPrice' },
    { path: '/prices/sell/:currency',                     method: 'GET',  handler: 'getSellPrice' },
    { path: '/prices/spot',                               method: 'GET',  handler: 'getSpotPrice' },
    { path: '/service',                                   method: 'PUT',  handler: 'service' },
    { path: '/urls',                                      method: 'GET',  handler: 'getUrls' },
    { path: '/user',                                      method: 'GET',  handler: 'getCurrentUser' },
    { path: '/wallet/:id/transactions/pending',           method: 'GET',  handler: 'getPendingTransactions' }
  ]);

})
.run(function() {

  owswallet.Plugin.ready(function() {

    // Do initialization here.

  });

});
