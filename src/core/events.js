/* core: tiny synchronous event bus. Modules talk to each other through this, never directly. */
'use strict';

function createBus() {
  var map = {};
  return {
    on: function (type, fn) {
      (map[type] || (map[type] = [])).push(fn);
      return function off() {
        var l = map[type]; if (!l) return;
        var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1);
      };
    },
    emit: function (type, payload) {
      var l = map[type]; if (!l) return;
      var copy = l.slice();
      for (var i = 0; i < copy.length; i++) copy[i](payload, type);
    },
    count: function (type) { return (map[type] || []).length; }
  };
}

module.exports = { createBus: createBus };
