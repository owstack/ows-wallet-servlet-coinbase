'use strict';

angular.module('owsWalletPlugin.services').factory('monitorService', function($rootScope, $log, lodash, coinbaseService,
  /* @namespace owsWalletPluginClient.api */ Session,
  /* @namespace owsWalletPluginClient.api */ Storage) {

  var root = {};

  /**
   * Buy transction monitoring
   *
   * A buy transaction is composed of two stages with the following flow:
   *
   * Stage 1 > stage 2 > complete
   *
   * Stage 1 - Place a buy commit at Coinbase.
   * - Requires monitoring a Coinbase buy transaction.
   * - The buy may be instant or require significant time to transfer funds from a bank (for example).
   *
   * Stage 2 - Send bought funds from Coinbase to OWS wallet.
   * - Requires monitoring a blockchain transaction.
   *
   * Sell transction monitoring
   *
   * A sell transaction is composed of two stages with the following flow:
   *
   * Stage 1 > stage 2 > complete
   *
   * Stage 1 - Send funds to sell from OWS wallet to Coinbase account.
   * - Requires monitoring a blockchain transaction.
   *
   * Stage 2 - Place a sell commit at Coinbase.
   * - Requires monitoring a Coinbase sell transaction.
   * - Requires a user defined 'price sensitivity' check. If price has changed beyond user guidance then the sell is halted.
   */

  var session = Session.getInstance();

  // Get our storage instances for this monitor.
  var storage = new Storage([
    'monitor',
  ], session.plugin.header.id); // This is my id.

  // Map Coinbase transaction status to montor status.
  var statusMap = {
    'failed': 'failed',
    'expired': 'expired',
    'canceled': 'canceled',
    'completed': 'complete'
  }

  init();

  // monitor = {
  //
  //   // User specified
  //   accountId: <string> - Coinbase account id for subject transaction
  //   walletId: <string> - OWS wallet id for subject transaction
  //   txId: <string> - Coinbase subject transaction; n/a when creating sell monitor
  //   txHash: <string> tx.id - Blockchain transaction id for subject transaction; applies to only to sell orders
  //   priceStopLimitAmount: <number> - The price below which the order will be halted; applies only to sell orders
  //   pluginId: <string> - The plugin id of the transaction requestor
  //   action: <string> - Either 'buy or 'sell'
  //
  //   // Internal
  //   status: <string> - 'failed', 'expired', 'canceled', 'complete'
  //   stage: <number> - 1 or 2
  //   created: <date>
  //   updated: <date>
  //   log [{ // Data copied from the body of the monitor
  //     txHash: 
  //     txId: 
  //     status: 
  //     stage: 
  //     timestamp: 
  //   }]
  // }
  root.addMonitor = function(monitor) {
    // Add a new transaction to monitor.
    var mtxs = storage.getMonitor();

    if (!monitor.created) {
      // Create new monitor.
      monitor.status = 'pending';
      monitor.stage = 1;
      monitor.created = timestamp();
      monitor.log = [];
      mtxs.push(monitor);

    } else {
      // Update existing monitor.
      monitor.stage += monitor.stage;
      monitor.updated = timestamp();

    }

    storage.setMonitor(mtxs);

    $rootScope.$emit('Local/MonitorActive', true);

    monitorNow();
  };

  root.getMonitors = function() {
    // Return an array of monitors.
    return storage.getMonitor();    
  };

  /**
   * Private functions
   */

  function init() {
    // Execute monitor at startup.
    monitorNow();

    // Execute the monitor when a new block is seen.
    owswallet.Plugin.onEvent('host.new-block', monitorNow);
  };

  function monitorNow() {
    // Monitor all transactions now.
    var mtxs = storage.getMonitor();

    if (mtxs.length > 0) {
      lodash.forEach(mtxs, function(mtx) {
        monitor(mtx);
      });

      $rootScope.$emit('Local/MonitorActive', true);
    }
  };

  function monitor(mtx) {
    if (mtx.txId) {
      // Currently monitoring a Coinbase transaction.
      coinbaseService.getTransactions(mtx.accountId, mtx.txId).then(function(tx) {

        if (tx.status == 'completed') {

          switch (tx.type) {
            case 'buy':

              if (mtx.stage == 1) {

                // BUY STAGE 1 COMPLETE
                //
                // Completed buy transactions have their amount sent to a specified wallet.
                var note = tx.title + ' ' + tx.subtitle;
                coinbaseService.sendToWallet(mtx.accountId, mtx.walletId, note).then(function(tx) {

                  // Switch from monitoring buy stage 1 to buy stage 2.
                  // Create monitored tx log entry for stage 1. Reconfigure for stage 2 and start monitoring.
                  mtx.log.push({
                    txId: mtx.txId,
                    status: 'complete',
                    stage: mtx.stage,
                    timestamp: timestamp()
                  });
                  delete mtx.txId;

                  mtx.txHash = tx.network.hash;
                  if (!mtx.txHash) {
                    throw {message: 'No network transaction hash after send to wallet from Coinbase account'};
                  }

                  root.startMonitor(mtx);

                }).catch(function(error) {

                  stopMonitor(mtx, 'complete', {
                    id: 'SEND_TO_WALLET_FAILED',
                    message: error.message
                  });

                });

              } else if (mtx.stage == 2) {

                // BUY STAGE 2 COMPLETE
                //
                // Log the completed transaction.
                mtx.log.push({
                  txId: mtx.txId,
                  status: 'complete',
                  stage: mtx.stage,
                  timestamp: timestamp()
                });
                delete mtx.txId;

                stopMonitor(mtx, 'complete');

              }

              break;

            case 'sell':

              // SELL STAGE 2 COMPLETE
              //
              // Log the completed transaction.
              mtx.log.push({
                txId: mtx.txId,
                status: 'complete',
                stage: mtx.stage,
                date: timestamp()
              });
              delete mtx.txId;

              stopMonitor(mtx, 'complete');

              break;
          }

        } else if (tx.status == 'failed' || tx.status == 'expired' || tx.status == 'canceled') {
          // Coinbase status ends our monitoring.
          // Log the transaction final status.
          mtx.log.push({
            txId: mtx.txId,
            status: statusMap[tx.status],
            stage: mtx.stage,
            timestamp: timestamp()
          });
          delete mtx.txId;

          stopMonitor(mtx, status);

        }

      }).catch(function(error) {
        $log.error('Failed to get pending transaction from Coinbase: ' + error.message);
      });

    } else if (mtx.txHash) {
      
      // Currently monitoring a wallet transaction (only sell orders will come here).
      coinbaseService.getTransactions(mtx.accountId).then(function(coinbaseTxs) {

        // Try to find the wallet transaction at Coinbase by searching transactions for the hash.
        var cbTx = lodash.find(coinbaseTxs, function(cbTx) {
          return lodash.get(cbTx, 'cbTx.network.hash') != undefined;
        });

        if (cbTx && cbTx.status == 'completed') {

          // SELL STAGE 1 COMPLETE
          //
          // Create a Coinbase sell request and check price stop limit. If price stop limit check passes then
          // commit the sell order.
          coinbaseService.sellRequest(mtx.accountId, {
            amount: cbTx.amount.amount,
            currency: cbTx.amount.currency,
            paymentMethodId: '' //TODO - deposit funds to USD account (or users primary account for sells??)
          }).then(function(sellRequest) {

            var totalAmount = parseFloat(sellRequest.total.amount);
            if (totalAmount >= mtx.priceStopLimitAmount) {
              // Commit the sell order.
              return coinbaseService.sell(cbTx.accountId, cbTx.sellId);
            }

          }).then(function(sellTx) {

            // Switch from monitoring sell stage 1 to sell stage 2.
            // Create monitored tx log entry for stage 1. Reconfigure for stage 2 and start monitoring.
            mtx.log.push({
              txHash: mtx.txHash,
              status: 'complete',
              stage: mtx.stage,
              timestamp: timestamp()
            });
            delete mtx.txHash;

            mtx.txId = sellTx.id;

            root.startMonitor(mtx);

          }).catch(function(error) {

            stopMonitor(mtx, 'complete', {
              id: 'SELL_COMMIT_FAILED',
              message: error.message
            });

          });

        } else if (cbTx && (cbTx.status == 'failed' || cbTx.status == 'expired' || cbTx.status == 'canceled')) {
          // Coinbase status ends our monitoring.
          // Log the transaction final status.
          mtx.log.push({
            txId: mtx.txHash,
            status: statusMap[cbTx.status],
            stage: mtx.stage,
            timestamp: timestamp()
          });
          delete mtx.txHash;

          stopMonitor(mtx, cbTx.status);
        }

      });
    }
  };

  function stopMonitor(mtx, status, error) {
    mtx.status = status;
    mtx.error = error;

    // Update the monitored transaction by removing the existing entry and creating a new entry.
    var mtxs = storage.getMonitor();

    lodash.remove(mtxs, function(storedMtx) {
      return storedMtx.created == mtx.created;
    });

    mtxs.push(mtx);
    storage.setMonitor(mtxs);
  };

  function removeMonitor(mtx) {
    // Remove a transaction from the monitor.
    var mtxs = storage.getMonitor();

    lodash.remove(mtxs, function(tx) {
      return tx.created == mtx.created;
    });

    storage.setMonitor(mtxs);

    $rootScope.$emit('Local/MonitorActive', mtxs.length > 0);
  };

  function timestamp() {
    return new Date() / 1000;
  };

  return root;
});
