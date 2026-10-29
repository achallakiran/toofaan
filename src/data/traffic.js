/* data layer: the life on the street. Sizes in metres; `speed` is the cruising speed in m/s; `r` the collision radius around the body line. */
'use strict';

var KINDS = {
  auto:    { len: 2.6, r: 0.75, speed: 7.5, w: 5, kind: 'veh' },
  bus:     { len: 8.0, r: 1.3,  speed: 6.0, w: 2, kind: 'veh' },
  truck:   { len: 6.0, r: 1.2,  speed: 5.5, w: 2, kind: 'veh' },
  car:     { len: 3.8, r: 0.9,  speed: 9.0, w: 4, kind: 'veh' },
  scooter: { len: 1.6, r: 0.4,  speed: 8.0, w: 5, kind: 'veh' },
  cow:     { len: 1.6, r: 0.55, speed: 0.0, w: 0, kind: 'animal' },
  dog:     { len: 0.6, r: 0.25, speed: 2.4, w: 0, kind: 'animal' },
  ped:     { len: 0.3, r: 0.3,  speed: 1.2, w: 0, kind: 'ped' }
};
var WEIGHTS = [['auto', 5], ['scooter', 5], ['car', 4], ['bus', 2], ['truck', 2]];
var LIMITS = { veh: 7, ped: 6, animal: 2 };
var SPAWN_MIN = 42, SPAWN_MAX = 70, DESPAWN = 96;          /* metres from the hero */

module.exports = { KINDS: KINDS, WEIGHTS: WEIGHTS, LIMITS: LIMITS, SPAWN_MIN: SPAWN_MIN, SPAWN_MAX: SPAWN_MAX, DESPAWN: DESPAWN };
