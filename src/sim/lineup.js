/* sim: who turns up to a fight. The difficulty ramp: each place Toofan has cleared makes the next fight bigger (4 men up to 8) and adds
   tougher kinds of fighter; every fight has at least one lathi (stick) man. Seeded, so the same save gives the same fight. */
'use strict';

var D = require('../data/enemies');

/* level: places cleared so far; rng: a seeded rng; returns a list of kinds, the toughest last (they arrive behind the others) */
function lineup(level, rng) {
  var R = D.RAMP[Math.max(0, Math.min(D.RAMP.length - 1, level | 0))], pool = [], out = [], k, i;
  for (k in R.mix) for (i = 0; i < R.mix[k]; i++) pool.push(k);
  if (pool.indexOf('stick') < 0) pool.push('stick');
  for (i = 0; i < R.n; i++) {
    if (i === 0) { out.push('stick'); continue; }                  /* the lathi man is always there */
    out.push(pool[Math.floor(rng.next() * pool.length) % pool.length]);
  }
  var order = { thug: 0, kicker: 1, thrower: 2, stick: 3, chain: 4, blocker: 5, heavy: 6 };
  out.sort(function (a, b) { return order[a] - order[b]; });
  return out;
}

module.exports = { lineup: lineup };
