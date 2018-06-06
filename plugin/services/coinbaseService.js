'use strict';

angular.module('owsWalletPlugin.services').factory('coinbaseService', function($rootScope, $log, lodash, Session, Settings, coinbaseApiService) {
  var root = {};

  var session = Session.getInstance();
  var network = coinbaseApiService.getNetwork();
  var storage;

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
 
  owswallet.Plugin.onEvent(function(event) {
    var network = lodash.get(event, 'event.n.data.network');

    if (event.type == 'NewBlock' && network == 'livenet') {
      updatePendingTransactions();
    }
  });
/*
  $rootScope.$on('Local/NewAccessToken', function() {
    root.getAccountId();
  });
*/

  root.getAvailableCurrencies = function() {
    var settings = new Settings();
    settings.get().then(function(settings) {

      var currencies = [];

      // Only "USD"
      switch (settings[network].alternativeIsoCode) {
        default: currencies.push('USD');
      };
      return currencies;

    }).catch(function(error) {
      $log.error('Could not get avaihlable currencies: ' + error);
    });
  };

  root.getPriceSensitivity = function() {
    return {
      values: priceSensitivity,
      selected: selectedPriceSensitivity
    }
  };

  root.savePendingTransaction = function(ctx, opts, cb) {
    savePendingTransaction(ctx, opts, cb);
  };

  root.getPendingTransactions = function(coinbasePendingTransactions) {
    storage.getTxs().then(function(txs) {
      txs = txs ? JSON.parse(txs) : {};
      coinbasePendingTransactions.data = lodash.isEmpty(txs) ? null : txs;


      lodash.forEach(coinbasePendingTransactions.data, function(dataFromStorage, txId) {
        if ((dataFromStorage.type == 'sell' && dataFromStorage.status == 'completed') ||
          (dataFromStorage.type == 'buy' && dataFromStorage.status == 'completed') ||
          dataFromStorage.status == 'error' ||
          (dataFromStorage.type == 'send' && dataFromStorage.status == 'completed')) {

          return;
        }

        root.getTransaction(accessToken, accountId, txId, function(err, tx) {
          if (err || lodash.isEmpty(tx) || (tx.data && tx.data.error)) {
            savePendingTransaction(dataFromStorage, {
              status: 'error',
              error: (tx.data && tx.data.error) ? tx.data.error : err
            }, function(err) {
              if (err) {
                $log.debug(err);
              }
              updateTxs(coinbasePendingTransactions);
            });
            return;
          }

          updateCoinbasePendingTransactions(dataFromStorage, tx.data);
          coinbasePendingTransactions.data[txId] = dataFromStorage;

          if (tx.data.type == 'send' && tx.data.status == 'completed' && tx.data.from) {
            root.sellPrice(accessToken, dataFromStorage.sell_price_currency, function(err, s) {
              if (err) {
                savePendingTransaction(dataFromStorage, {
                  status: 'error',
                  error: err
                }, function(err) {
                  if (err) $log.debug(err);
                  updateTxs(coinbasePendingTransactions);
                });
                return;
              }

              var newSellPrice = s.data.amount;
              var variance = Math.abs((newSellPrice - dataFromStorage.sell_price_amount) / dataFromStorage.sell_price_amount * 100);

              if (variance < dataFromStorage.price_sensitivity.value) {
                sellPending(dataFromStorage, accessToken, accountId, coinbasePendingTransactions);

              } else {
                savePendingTransaction(dataFromStorage, {
                  status: 'error',
                  error: {errors: [{message: 'Price falls over the selected percentage'}]}
                }, function(err) {
                  if (err) {
                    $log.debug(err);
                  }
                  updateTxs(coinbasePendingTransactions);
                });

              }
            });

          } else if (tx.data.type == 'buy' && tx.data.status == 'completed' && tx.data.buy) {
            sendToWallet(dataFromStorage, accessToken, accountId, coinbasePendingTransactions);

          } else {
            savePendingTransaction(dataFromStorage, {}, function(err) {
              if (err) {
                $log.debug(err);
              }
              updateTxs(coinbasePendingTransactions);
            });

          }
        });
      });

    });
  };

  /**
   * Private functions
   */

  function updatePendingTransactions() {
    return lodash.throttle(function() {
      $log.debug('Updating coinbase pending transactions...');
      var pendingTransactions = {
        data: {}
      };
      root.getPendingTransactions(pendingTransactions);
    }, 20000);
  };

  function updateTxs(coinbasePendingTransactions) {
    storage.getTxs().then(function(txs) {
      txs = txs ? JSON.parse(txs) : {};
      coinbasePendingTransactions.data = lodash.isEmpty(txs) ? null : txs;
    }).catch(function(error) {
      $log.error(error);
    });
  };

  function sellPending(tx, accessToken, accountId, coinbasePendingTransactions) {
    var data = tx.amount;
    data['payment_method'] = tx.payment_method || null;
    data['commit'] = true;
    root.sellRequest(accessToken, accountId, data, function(err, res) {
      if (err) {
        savePendingTransaction(tx, {
          status: 'error',
          error: err
        }, function(err) {
          if (err) $log.debug(err);
          updateTxs(coinbasePendingTransactions);
        });
      } else {
        if (res.data && !res.data.transaction) {
          savePendingTransaction(tx, {
            status: 'error',
            error: {errors: [{message: 'Sell order: transaction not found.'}]}
          }, function(err) {
            if (err) $log.debug(err);
            updateTxs(coinbasePendingTransactions);
          });
          return;
        }

        root.getTransaction(accessToken, accountId, res.data.transaction.id, function(err, updatedTx) {
          if (err) {
            savePendingTransaction(tx, {
              status: 'error',
              error: err
            }, function(err) {
              if (err) $log.error(err);
              updateTxs(coinbasePendingTransactions);
            });
            return;
          }
          savePendingTransaction(tx, {
            remove: true
          }, function(err) {
            savePendingTransaction(updatedTx.data, {}, function(err) {
              if (err) {
                $log.debug(err);
              }
              updateTxs(coinbasePendingTransactions);
            });
          });
        });
      }
    });
  };

  function sendToWallet(tx, accessToken, accountId, coinbasePendingTransactions) {
    if (!tx) return;
//    var desc = appConfigService.nameCase + ' Wallet';
    getNetAmount(tx.amount.amount, function(err, amountBTC, feeBTC) {
      if (err) {
        savePendingTransaction(tx, {
          status: 'error',
          error: {errors: [{message: err}]}
        }, function(err) {
          if (err) $log.debug(err);
          updateTxs(coinbasePendingTransactions);
        });
        return;
      }

      var data = {
        to: tx.toAddr,
        amount: amountBTC,
        currency: tx.amount.currency,
        description: desc,
        fee: feeBTC
      };
      root.sendTo(accessToken, accountId, data, function(err, res) {
        if (err) {
          savePendingTransaction(tx, {
            status: 'error',
            error: err
          }, function(err) {
            if (err) $log.debug(err);
            updateTxs(coinbasePendingTransactions);
          });
        } else {
          if (res.data && !res.data.id) {
            savePendingTransaction(tx, {
              status: 'error',
              error: {errors: [{message: 'Transactions not found in Coinbase.com'}]}
            }, function(err) {
              if (err) $log.debug(err);
              updateTxs(coinbasePendingTransactions);
            });
            return;
          }
          root.getTransaction(accessToken, accountId, res.data.id, function(err, sendTx) {
            if (err) {
              savePendingTransaction(tx, {
                status: 'error',
                error: err
              }, function(err) {
                if (err) $log.error(err);
                updateTxs(coinbasePendingTransactions);
              });
              return;
            }

            savePendingTransaction(tx, {
              remove: true
            }, function(err) {
              if (err) $log.error(err);
              savePendingTransaction(sendTx.data, {}, function(err) {
                if (err) $log.debug(err);
                updateTxs(coinbasePendingTransactions);
              });
            });
          });
        }
      });
    });
  };

  function getNetAmount(amount, cb) {
    // Fee Normal for a single transaction (450 bytes)
    var txNormalFeeKB = 450 / 1000;
    feeService.getFeeRate('btc', 'livenet', 'normal', function(err, feePerKb) {
      if (err) return cb('Could not get fee rate');
      var feeBTC = (feePerKb * txNormalFeeKB / 100000000).toFixed(8);

      return cb(null, amount - feeBTC, feeBTC);
    });
  };

  function updateCoinbasePendingTransactions(obj /*, …*/ ) {
    for (var i = 1; i < arguments.length; i++) {
      for (var prop in arguments[i]) {
        var val = arguments[i][prop];
        if (typeof val == "object")
          updateCoinbasePendingTransactions(obj[prop], val);
        else
          obj[prop] = val ? val : obj[prop];
      }
    }
    return obj;
  };

  function savePendingTransaction(ctx, opts, cb) {
    storage.getTxs().then(function(oldTxs) {
      if (lodash.isString(oldTxs)) {
        oldTxs = JSON.parse(oldTxs);
      }
      if (lodash.isString(ctx)) {
        ctx = JSON.parse(ctx);
      }

      var tx = oldTxs || {};
      tx[ctx.id] = ctx;

      if (opts && (opts.error || opts.status)) {
        tx[ctx.id] = lodash.assign(tx[ctx.id], opts);
      }
      if (opts && opts.remove) {
        delete(tx[ctx.id]);
      }

      tx = JSON.stringify(tx);

      return storage.setTxs(tx);

    }).catch(function(error) {
      return cb(err);

    });
  };

  return root;
});
