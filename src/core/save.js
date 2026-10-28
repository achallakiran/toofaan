/* core: guarded key/value save. Works without storage (file:// in some browsers, private windows). */
'use strict';

function createSave(storage, prefix) {
  var mem = {}, usable = !!storage;
  prefix = prefix || 'toofan.';
  return {
    get: function (key, fallback) {
      try { if (usable) { var v = storage.getItem(prefix + key); if (v != null) return JSON.parse(v); } } catch (e) { usable = false; }
      return key in mem ? mem[key] : fallback;
    },
    set: function (key, value) {
      mem[key] = value;
      try { if (usable) storage.setItem(prefix + key, JSON.stringify(value)); } catch (e) { usable = false; }
    },
    persistent: function () { return usable; }
  };
}

module.exports = { createSave: createSave };
