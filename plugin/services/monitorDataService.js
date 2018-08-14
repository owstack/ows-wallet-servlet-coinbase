'use strict';

angular.module('owsWalletPlugin.services').factory('monitorDataService', function(lodash, coinbaseService, monitorService,
  /* @namespace owsWalletPluginClient.api */ Session) {

  var root = {};

  var session = Session.getInstance();

  // Return pending transactions for the specified wallet.
  root.getPendingTransactions = function(walletId) {
    return new Promise(function(resolve, reject) {
      var txs = [];
      var allMtxs = monitorService.getMonitors();

      var mtxs = lodash.filter(allMtxs, function(mtx) {
        return mtx.walletId = walletId;
      });

      lodash.forEach(mtxs, function(mtx) {
        if (mtx.txId) {
          coinbaseService.getTransactions(mtx.accountId, mtx.txId).then(function(tx) {
            txs.push(tx);

          }).catch(function(error) {
            reject(error);
          });

        } else if (mtx.txHash) {
          // Get the wallet transaction and format as a Coinbase transaction for uniform API marshalling.
          var wallet;
          session.getWalletById(mtx.walletId).then(function(w) {
            wallet = w;
            return wallet.getTransactions(mtx.txHash);

          }).then(function(walletTx) {
            // The transaction is returned using the Coinbase transaction format.
            txs.push(formatAsCoinbaseTx(wallet, walletTx));

          }).catch(function(error) {
            reject(error);
          });
        }
      });

      var sortedTxs = lodash.orderBy(txs, function(tx) {
        return tx.created_at;
      }, ['desc']);

      resolve(sortedTxs);
    });
  };

  /**
   * Private functions
   */

  function formatAsCoinbaseTx(wallet, walletTx) {
    return {
      id: walletTx.txid,
      type: 'exchange_deposit',
      status: 'pending',
      amount: {
        amount: walletTx.outputs.amountStr.split(' ')[0],
        currency: walletTx.outputs.amountStr.split(' ')[1]
      },
      native_amount: {
        amount: walletTx.outputs.alternativeAmountStr.split(' ')[0],
        currency: walletTx.outputs.alternativeAmountStr.split(' ')[1]
      },
      description: null,
      created_at: new Date(tx.createdOn * 1000).toISOString(),
      updated_at: new Date(tx.createdOn * 1000).toISOString(),
      resource: undefined,
      resource_path: undefined,
      instant_exchange: undefined,
      details: {
        title: 'Transferred to Coinbase',
        subtitle: 'From ' + wallet.name
      }
    };
   };

  return root;
});
