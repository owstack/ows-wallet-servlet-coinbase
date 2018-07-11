'use strict';

angular.module('owsWalletPlugin').config(function($pluginConfigProvider) {

  /**
   * API routes for our service.
   * A match is made by searching routes in order, the first match returns the route.
   */
  $pluginConfigProvider.router.routes([
    { path: '/accounts/:accountId?',                  method: 'GET',  handler: 'getAccounts' },
    { path: '/accounts/:accountId/addresses',         method: 'POST', handler: 'createAddress' },
    { path: '/accounts/:accountId/buys',              method: 'POST', handler: 'requestBuy' },
    { path: '/accounts/:accountId/sells',             method: 'POST', handler: 'requestSell' },
    { path: '/accounts/:accountId/transactions',      method: 'GET',  handler: 'getAccountTransactions' },
    { path: '/exchange-rates/:currency?',             method: 'GET',  handler: 'getExchangeRates' },
    { path: '/paymentMethods/:paymentMethodId?',      method: 'GET',  handler: 'getPaymentMethods' },
    { path: '/prices',                                method: 'GET',  handler: 'getPriceInfo' },
    { path: '/prices/buy/:currency',                  method: 'GET',  handler: 'getBuyPrice' },
    { path: '/prices/historic/:currencyPair/:period', method: 'GET',  handler: 'getHistoricPrice' },
    { path: '/prices/sell/:currency',                 method: 'GET',  handler: 'getSellPrice' },
    { path: '/prices/spot',                           method: 'GET',  handler: 'getSpotPrice' },
    { path: '/service',                               method: 'PUT',  handler: 'service' },
    { path: '/transactions/pending',                  method: 'GET',  handler: 'getPendingTransactions' },
    { path: '/transactions/pending',                  method: 'POST', handler: 'savePendingTransactions' },
    { path: '/urls',                                  method: 'GET',  handler: 'getUrls' },
    { path: '/user',                                  method: 'GET',  handler: 'getCurrentUser' }
  ]);

})
.run(function() {

  owswallet.Plugin.ready(function() {

    // Do initialization here.

  });

});
