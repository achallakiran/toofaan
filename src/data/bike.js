/* data layer: the Bijli, a heavy classic cruiser. One block of numbers so the handling can be tuned by feel. */
'use strict';

var BIKE = {
  MAX_SPEED: 25,            /* m/s, about 90 km/h */
  BOOST_SPEED: 31,
  ACCEL: 6.2,               /* m/s^2 at a standstill, tapering toward top speed */
  BOOST_ACCEL: 9,
  BRAKE: 13,
  COAST: 0.9,               /* engine braking when the throttle is released */
  DRAG: 0.0007,             /* speed squared drag */
  REVERSE_MAX: 2.2,
  TURN_R0: 3.6,             /* tightest turning radius, metres, at walking pace */
  TURN_RV: 0.95,            /* extra radius per m/s: wide arcs at speed */
  STEER_LAG: 5.5,           /* how quickly the bars follow the stick (per second): lazy on purpose */
  DRIFT_BOOST: 1.35,        /* extra yaw while Block drifts */
  DRIFT_BRAKE: 4,
  RADIUS: 0.55,             /* collision circle, metres */
  GRAVITY: 16,
  ROLL_TIME: 0.62,          /* seconds for a full barrel roll in the air */
  BOOST_DRAIN: 0.4,         /* per second */
  BOOST_REFILL: 0.08,
  MOUNT_REACH: 1.7,         /* metres from the bike's body (rear wheel to front wheel) within which Attack climbs on */
  MOUNT_SHOW: 3.2,          /* the prompt appears a little earlier than the reach, so he can step in */
  MOUNT_BLOCK: 2.2,         /* a man this close means Attack is for fighting */
  HALF_LEN: 0.9,
  PARK_SPEED: 0.7,          /* below this, Attack parks the bike and lets him step off */
  GEARS: [0, 4.5, 9, 14, 19.5]  /* speed at which each gear starts, for the engine note */
};

module.exports = BIKE;
