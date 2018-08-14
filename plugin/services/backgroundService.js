'use strict';

angular.module('owsWalletPlugin.services').factory('backgroundService', function() {

  var root = {};

  var active = {};
  var state = false;

  // List of events that affect background run status.
  $rootScope.$on('Local/MonitorActive', function(event, active) {
    active['monitor'] = active;
    refreshState();
  });

  // Refesh our state.
  function refreshState() {
    var s = false;
    lodash.forEach(Object.keys(active), function(k) {
      s = s || active[k];
    });

    state = s;
    owswallet.Plugin.runInBackground(state);
  }

  return root;
});
