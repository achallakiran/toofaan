/* core: seeded random numbers (mulberry32). All gameplay randomness goes through this. */
'use strict';

function hash32(a, b, c) {
  var h = 2166136261 >>> 0, i, v, vals = [a | 0, b | 0, c | 0];
  for (i = 0; i < vals.length; i++) {
    v = vals[i];
    h ^= v & 255; h = Math.imul(h, 16777619);
    h ^= (v >>> 8) & 255; h = Math.imul(h, 16777619);
    h ^= (v >>> 16) & 255; h = Math.imul(h, 16777619);
    h ^= (v >>> 24) & 255; h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed) {
  var s = (seed >>> 0) || 1;
  function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next: next,
    range: function (lo, hi) { return lo + (hi - lo) * next(); },
    int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
    chance: function (p) { return next() < p; },
    pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    getState: function () { return s; },
    setState: function (v) { s = v >>> 0; },
    /* an independent stream, so one system's draws never shift another's */
    fork: function (salt) { return createRng(hash32(s, salt | 0, 7)); }
  };
}

module.exports = { createRng: createRng, hash32: hash32 };
