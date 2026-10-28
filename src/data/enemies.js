/* data layer: enemy kinds and the reach of every player strike. Times are in seconds, distances in metres. */
'use strict';

var KINDS = {
  /* street thug: throws a blockable punch; a clear telegraph before every attack */
  thug: { hp: 8.8, speed: 2.1, reach: 1.25, windup: 0.6, recover: 0.6, damage: 6, blockable: true, clip: 'cross', radius: 0.4, blockChance: 0.85 },
  /* brute with a stick: slower, tougher, his swing cannot be blocked (red telegraph) - move away or hit him first */
  stick: { hp: 13, speed: 1.7, reach: 1.45, windup: 0.85, recover: 0.8, damage: 13, blockable: false, clip: 'hook', radius: 0.45, blockChance: 0.6 }
};

/* arc = half-angle in degrees in front of the hero, 180 = all round. down = knocks the target over. */
var STRIKES = {
  jab: { reach: 1.5, arc: 55, knock: 0.35, down: false, high: true },
  cross: { reach: 1.55, arc: 55, knock: 0.6, down: false, high: true },
  hook: { reach: 1.5, arc: 70, knock: 0.45, down: false, high: true },
  elbow: { reach: 1.3, arc: 60, knock: 0.5, down: false },
  knee: { reach: 1.35, arc: 55, knock: 0.5, down: false, high: true },
  hookB: { reach: 1.5, arc: 70, knock: 0.45, down: false, high: true },
  axeKick: { reach: 1.7, arc: 55, knock: 0.6, down: false, high: true },
  uppercut: { reach: 1.4, arc: 55, knock: 0.5, down: false, high: true },
  counterCross: { reach: 1.9, arc: 100, knock: 0.2, down: false, high: true },
  kick: { reach: 1.75, arc: 45, knock: 1.4, down: true },
  roundhouse: { reach: 1.8, arc: 85, knock: 1.6, down: true },
  counterBoom: { reach: 7.5, arc: 28, knock: 3.2, down: true },
  counterSmash: { reach: 2.1, arc: 90, knock: 1.4, down: false },
  counterWhirl: { reach: 2.6, arc: 180, knock: 1.8, down: false },
  finisherWhirl: { reach: 3.8, arc: 180, knock: 3.0, down: true }
};

/* an enemy who guards soaks up this many blows, then his cover breaks */
var GUARD_HITS = 2, GUARD_COOLDOWN = 300, GUARD_BREAK = 55;

var RAGE = { hit: 5, counterHit: 3, block: 3, timedBlock: 16, hurt: 2 };

module.exports = { KINDS: KINDS, STRIKES: STRIKES, RAGE: RAGE, GUARD_HITS: GUARD_HITS, GUARD_COOLDOWN: GUARD_COOLDOWN, GUARD_BREAK: GUARD_BREAK };
