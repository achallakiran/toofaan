/* core: a bag of cleanup functions. A mode adds everything it creates and disposes it on exit. */
'use strict';

function createScope() {
  var items = [];
  return {
    add: function (fn) { items.push(fn); return fn; },
    dispose: function () {
      while (items.length) { var fn = items.pop(); try { fn(); } catch (e) { /* keep tearing down */ } }
    },
    size: function () { return items.length; }
  };
}

module.exports = { createScope: createScope };
