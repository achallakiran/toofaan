/* data layer: ride mode (the overhead drive across the city map). Metres, seconds, ticks at 60 Hz.
   Traffic keeps left. Lane offsets are measured from the road's centre line. */
'use strict';

var RIDE = {
  GRID: 6,                 /* roads per axis: a 6 x 6 grid of four-lane roads */
  SPACING: 72,             /* metres between road centre lines */
  HALF: 7,                 /* half the road width: two lanes each way and a median */
  LANES: [1.9, 5.1],       /* inner and outer lane centres */
  PAVE: 3,                 /* pavement beyond the kerb; the bike may ride onto it */

  CRUISE: 15,              /* the bike runs on its own at this speed */
  TOP: 21,                 /* stick pushed hard */
  ACCEL: 6, BRAKE: 16, TURN: 3.0,
  BIKE_R: 0.55,
  CRASH_SPEED: 5,          /* slower bumps just stop the bike */
  FLY_TICKS: 42, RUN_SPEED: 5.2, GRACE_TICKS: 90,
  ARRIVE_R: 9,

  TRAFFIC: 170,            /* vehicles on the whole map */
  VIEW_R: 85,              /* vehicles are drawn within this distance */
  KINDS: {
    scooter: { len: 1.6, r: 0.45, speed: [8, 11] },
    auto:    { len: 2.6, r: 0.75, speed: [7, 9.5] },
    car:     { len: 3.8, r: 0.9,  speed: [9, 13] },
    bus:     { len: 8.0, r: 1.3,  speed: [6.5, 8.5] },
    truck:   { len: 6.0, r: 1.2,  speed: [6, 8] }
  },
  WEIGHTS: [['scooter', 4], ['auto', 4], ['car', 4], ['bus', 1], ['truck', 2]]
};

module.exports = RIDE;
