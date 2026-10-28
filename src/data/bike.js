/* data layer: the Bijli, a heavy classic cruiser. One block of numbers so the handling can be tuned by feel. */
'use strict';

var BIKE = {
  MAX_SPEED: 27,            /* m/s, about 97 km/h: a Bullet runs out of breath, it does not sprint */
  BOOST_SPEED: 32,
  ACCEL: 4.6,               /* m/s^2 at a standstill, tapering toward top speed */
  GEAR_PULL: [1.0, 1.0, 0.8, 0.62, 0.5],  /* share of ACCEL available in each gear: heavy shove low down, long flat middle */
  SHIFT_DIP: 0.35,          /* thrust left while the clutch is in */
  BOOST_ACCEL: 6.5,
  BRAKE: 9,
  COAST: 0.9,               /* engine braking when the throttle is released */
  DRAG: 0.0007,             /* speed squared drag */
  REVERSE_MAX: 2.2,
  TURN_R0: 4.4,             /* tightest turning radius, metres, at walking pace */
  TURN_RV: 1.25,            /* extra radius per m/s: wide arcs at speed */
  STEER_LAG: 3.4,           /* how quickly the bars follow the stick (per second): lazy on purpose */
  DRIFT_BOOST: 1.35,        /* extra yaw while Block drifts */
  DRIFT_BRAKE: 4,
  RADIUS: 0.55,             /* collision circle, metres */
  GRAVITY: 16,
  BOOST_DRAIN: 0.4,         /* per second */
  BOOST_REFILL: 0.1,
  LEAN_MAX: 0.38,
  BOOST_HOLD: 15,           /* ticks Attack must be held before it is a boost, not a tap */
  MOUNT_REACH: 1.7,         /* metres from the bike's body (rear wheel to front wheel) within which Attack climbs on */
  MOUNT_SHOW: 3.2,          /* the prompt appears a little earlier than the reach, so he can step in */
  MOUNT_BLOCK: 2.2,         /* a man this close means Attack is for fighting */
  HALF_LEN: 0.9,
  SOLID_R: 0.78,            /* the parked bike keeps him this far from its three body discs */
  PARK_SPEED: 0.7,          /* below this, Attack parks the bike and lets him step off */
  GEARS: [0, 4.5, 9.5, 15, 21]  /* speed at which each gear starts, for the engine note */
};

module.exports = BIKE;
