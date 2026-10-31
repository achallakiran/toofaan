/* data layer: ride mode (the overhead drive across the city map). Metres, seconds, ticks at 60 Hz.
   Traffic keeps left. Lane offsets are measured from the road's centre line. */
'use strict';

var RIDE = {
  GRID: 6,                 /* roads per axis: a 6 x 6 grid of four-lane roads */
  SPACING: 72,             /* metres between road centre lines */
  HALF: 7,                 /* half the road width: two lanes each way and a median */
  LANES: [1.9, 5.1],       /* inner and outer lane centres */
  PAVE: 3,                 /* pavement beyond the kerb; the bike may ride onto it */

  TOP: 17,                 /* stick (or W) held forward: full throttle */
  ACCEL: 5.5, BRAKE: 14, COAST: 1.6, REVERSE: 2.5, TURN: 2.4,
  BIKE_R: 0.7,
  SCALE: 1.4,              /* Toofan and Bijli are drawn this much bigger in ride mode, so they read well on a phone */
  CRASH_SPEED: 5,          /* slower bumps just stop the bike */
  FLY_TICKS: 42, RUN_SPEED: 5.2, GRACE_TICKS: 90,
  ARRIVE_R: 9,

  CAM: { back: 8.5, height: 11, ahead: 5, fov: 46 },     /* chase camera, high behind the bike */

  TRAFFIC: 170,            /* vehicles on the whole map */
  VIEW_R: 85,              /* vehicles are drawn within this distance */
  KINDS: {
    scooter: { len: 1.6, r: 0.45, speed: [8, 11] },
    auto:    { len: 2.6, r: 0.75, speed: [7, 9.5] },
    car:     { len: 3.8, r: 0.9,  speed: [9, 13] },
    bus:     { len: 8.0, r: 1.3,  speed: [6.5, 8.5] },
    truck:   { len: 6.0, r: 1.2,  speed: [6, 8] }
  },
  WEIGHTS: [['auto', 5], ['car', 6], ['bus', 1], ['truck', 2]]      /* vehicles only: no riders or walkers on the ride roads */,

  /* road fights (encounters): the view turns to the side, goons ride up beside Toofan; a car can be leapt onto with a timed block */
  ENC: {
    SPEED: 8,            /* everyone rolls along at this speed while the fight is on */
    LAT: 3.2,            /* the gang car rides one lane to Toofan's left */
    MID: 3.5,            /* in a bike fight Toofan rides the middle of his carriageway (between its two lanes) */
    SIDE: 1.2,           /* ...and the goons ride up close on both sides of him, near enough for fists and boots to land */
    REACH: 1.6,          /* how far along the road a punch or kick reaches */
    WIND: 34,            /* ticks of warning before a goon's blow lands */
    COUNTER: 14,         /* Block pressed this many ticks before the blow (or less) is a counter */
    CAR_WIND: 46,        /* the car's warning before it swerves into him */
    LEAP: 16,            /* Block this close before the swerve and Toofan leaps onto the roof */
    CREW: 3,             /* goons who climb out on the roof one after another */
    FIRST: 540,          /* ticks of riding before the first road fight */
    COOL: 1500,          /* (unused now: fights come in a fixed order on each run) */
    GAP: 420,            /* ticks of riding between the bike goons and the car gang */
    MIN_RUN: 60          /* metres of straight road needed ahead to start one */
  }
};

module.exports = RIDE;
