/* sim: Toofan's hideout, the one fixed layout used everywhere the hideout appears (the New Game nightmare in his bed corner now; the
   walk-around hub, its hidden entrance and the flashbacks later). An underground hall under the old cycle-repair shop: bare concrete with
   brick patches, pillars, pipes and hanging bulbs. Hideout-local metres: the back wall is z = -2.5, the left wall x = -2.7; the hall runs
   to x = 13 and z = 9. Pure data (boxes in palette colours, footprints, named spots), seeded, no graphics. */
'use strict';

var kit = require('./arenakit');
var rngMod = require('../core/rng');

var W = { x0: -2.7, x1: 13, z0: -2.5, z1: 9, h: 4.2 };
/* named spots, so every scene puts things in the same place */
var SPOTS = {
  bed: { x: 0, z: -1.1 },            /* the bed's centre (it runs along x, pillow at -x) */
  mat: { x: 3.4, z: 0.35 },          /* Raka's mat */
  desk: { x: 5.0, z: -1.9 },         /* the computer wall and the gang chart */
  music: { x: 10.0, z: -1.2 },       /* drums and guitars */
  gym: { x: 10.0, z: 4.5 },          /* bag, bench, rack, mirror */
  garage: { x: 1.0, z: 6.6 },        /* Bijli on her lift, the tool bench */
  ramp: { x: -1.6, z: 6.6 }          /* the ramp up to the shop floor */
};

function build(seed) {
  var K = kit.createBuilder(rngMod.createRng((seed >>> 0) ^ 0x70f4)), C = kit.C, x, z, k, i;
  K.at(0, 0, 0);                                              /* one frame for everything: positions below are hideout metres */
  /* floor: worn concrete slabs, with planks under the bed corner */
  for (x = W.x0; x < W.x1; x += 1.0) for (z = W.z0; z < W.z1; z += 1.0) K.b(x + 0.02, 0, z + 0.02, Math.min(W.x1, x + 1) - 0.02, 0.015, Math.min(W.z1, z + 1) - 0.02, ((Math.round(x) + Math.round(z)) % 2) ? C.CONC2 : C.STONE3);
  for (x = -2.6; x < 2.4; x += 0.32) K.b(x, 0.015, -2.4, x + 0.3, 0.035, 1.2, (Math.round(x * 3) % 2) ? C.WOOD : C.WOOD2);
  /* walls: concrete with brick patches and a skirting of pipes */
  K.b(W.x0, 0, W.z0 - 0.1, W.x1, W.h, W.z0, C.CONC2); K.b(W.x0 - 0.1, 0, W.z0, W.x0, W.h, W.z1, C.CONC2); K.b(W.x1, 0, W.z0, W.x1 + 0.1, W.h, W.z1, C.CONC2);
  K.b(W.x0, 0, W.z1, W.x1, W.h, W.z1 + 0.1, C.CONC2); K.b(W.x0, W.h, W.z0, W.x1, W.h + 0.1, W.z1, C.STONE3);
  [[-1.6, 1.0, 1.6, 2.0], [6.5, 0.4, 2.0, 1.4], [11.0, 1.8, 1.2, 1.6]].forEach(function (b) {
    for (var yy = 0; yy < b[3]; yy += 0.16) for (var xx = 0; xx < b[2]; xx += 0.3) K.b(b[0] + xx + ((yy * 6.25 | 0) % 2) * 0.15, b[1] + yy, W.z0 - 0.02, b[0] + xx + 0.28 + ((yy * 6.25 | 0) % 2) * 0.15, b[1] + yy + 0.14, W.z0, (xx * 10 | 0) % 3 ? C.BRICK : C.BRICK2);
  });
  K.b(W.x0, 3.7, W.z0, W.x1, 3.85, W.z0 + 0.15, C.RUST); K.b(W.x0, 3.45, W.z0, W.x1, 3.55, W.z0 + 0.12, C.STEEL);           /* pipes along the back wall */
  for (x = 0; x < W.x1; x += 4.5) { K.b(x - 0.25, 0, 2.4, x + 0.25, W.h, 2.9, C.CEMENT); }                                     /* pillars */
  /* the street grate high on the back wall above the bed: the only light from outside */
  K.b(-0.7, 3.0, W.z0 - 0.01, 0.7, 3.6, W.z0 + 0.01, C.NAVY); for (k = 0; k < 8; k++) K.b(-0.68 + k * 0.19, 3.0, W.z0 + 0.01, -0.64 + k * 0.19, 3.6, W.z0 + 0.03, C.DARK);
  /* hanging bulbs on their cords */
  [[0.5, -0.4], [5, -0.6], [10, -0.5], [10, 4.6], [1.5, 6.2], [5.5, 4]].forEach(function (q) { K.b(q[0] - 0.01, 3.1, q[1] - 0.01, q[0] + 0.01, W.h, q[1] + 0.01, C.DARK); K.b(q[0] - 0.07, 2.95, q[1] - 0.07, q[0] + 0.07, 3.1, q[1] + 0.07, C.LEMON); });

  /* ---- the bed corner ---- */
  K.b(-1.1, 0, -1.7, 1.1, 0.35, -0.5, C.WOOD2); K.b(-1.15, 0, -1.75, -1.0, 0.95, -0.45, C.WOOD2);
  K.b(-1.05, 0.35, -1.65, 1.05, 0.55, -0.55, C.OFFWHITE); K.b(-1.0, 0.55, -1.5, -0.7, 0.68, -0.7, C.W_CREAM);
  K.b(-1.75, 0, -1.6, -1.25, 0.55, -1.1, C.WOOD); K.b(-1.6, 0.55, -1.45, -1.45, 0.6, -1.3, C.BRASS); K.b(-1.56, 0.6, -1.41, -1.49, 0.85, -1.34, C.BRASS); K.b(-1.66, 0.85, -1.5, -1.39, 1.0, -1.25, C.LEMON);
  K.b(-1.3, 0.035, -0.3, 1.3, 0.05, 0.9, C.CRIMSON); K.b(-1.2, 0.05, -0.2, 1.2, 0.055, 0.8, C.MARIGOLD);
  K.b(-2.6, 0, 0.2, -2.0, 1.8, 1.0, C.WOOD2); K.b(-2.55, 0.9, 0.25, -2.05, 0.95, 0.95, C.WOOD); K.b(-2.55, 0.1, 0.3, -2.1, 0.8, 0.9, C.NAVY);   /* a cupboard */
  K.b(-2.6, 1.4, -1.6, -2.58, 2.3, -0.4, C.MAGENTA); K.b(-2.58, 1.6, -1.4, -2.57, 2.1, -0.6, C.LEMON);                                      /* a poster */
  /* Raka's mat and his bowl */
  K.b(2.9, 0.015, 0.0, 3.9, 0.05, 0.7, C.OLIVE); K.b(3.95, 0.015, 0.75, 4.2, 0.08, 1.0, C.STEEL);

  /* ---- the computer wall and the gang chart ---- */
  K.b(3.8, 0, -2.4, 6.4, 0.75, -1.6, C.WOOD2); K.b(3.75, 0.75, -2.45, 6.45, 0.8, -1.55, C.WOOD);
  [[4.2, 0.0], [5.1, 0.12], [6.0, 0.0]].forEach(function (m) { K.b(m[0] - 0.4, 0.95 + m[1], -2.3, m[0] + 0.4, 1.45 + m[1], -2.25, C.CHAR); K.b(m[0] - 0.36, 0.99 + m[1], -2.25, m[0] + 0.36, 1.41 + m[1], -2.24, C.TEAL); K.b(m[0] - 0.04, 0.8, -2.3, m[0] + 0.04, 0.95 + m[1], -2.26, C.DARK); });
  K.b(4.6, 0.8, -1.95, 5.6, 0.83, -1.75, C.CHAR); K.b(5.8, 0, -1.4, 6.3, 0.5, -0.9, C.CHAR); K.b(5.8, 0.5, -1.45, 6.3, 1.1, -1.4, C.CHAR);
  K.b(3.6, 1.7, W.z0, 6.6, 3.1, W.z0 + 0.04, C.WOOD);                                                                                        /* the cork board */
  for (i = 0; i < 5; i++) { var px = 3.9 + i * 0.55; K.b(px, 2.45, W.z0 + 0.04, px + 0.38, 2.9, W.z0 + 0.06, C.OFFWHITE); K.b(px + 0.05, 2.5, W.z0 + 0.06, px + 0.33, 2.85, W.z0 + 0.07, [C.RUST, C.CRIMSON, C.MARIGOLD, C.OLIVE, C.LEAF][i]); }
  K.b(4.85, 1.85, W.z0 + 0.04, 5.35, 2.3, W.z0 + 0.06, C.BLACK); K.b(5.03, 1.95, W.z0 + 0.06, 5.17, 2.2, W.z0 + 0.07, C.CRIMSON);               /* Taka: a black card with a red "?" */
  for (i = 0; i < 5; i++) { var sx = 4.1 + i * 0.55, n = 8; for (k = 0; k < n; k++) { var u = k / n; K.b(sx + (5.1 - sx) * u, 2.45 + (2.2 - 2.45) * u, W.z0 + 0.07, sx + (5.1 - sx) * u + 0.04, 2.47 + (2.2 - 2.45) * u, W.z0 + 0.08, C.CRIMSON); } }

  /* ---- the music corner ---- */
  K.b(8.6, 0.015, -2.3, 11.6, 0.04, 0.2, C.NAVY);                                                                                             /* rug */
  K.b(9.2, 0, -1.6, 9.8, 0.55, -1.0, C.OFFWHITE); K.b(9.25, 0.05, -1.55, 9.75, 0.5, -1.05, C.CRIMSON);                                       /* bass drum */
  [[8.8, -1.0, 0.6], [10.2, -1.0, 0.6], [9.0, -1.8, 0.72], [10.0, -1.8, 0.72]].forEach(function (d) { K.b(d[0] - 0.2, d[2] - 0.12, d[1] - 0.2, d[0] + 0.2, d[2] + 0.08, d[1] + 0.2, C.CRIMSON); K.b(d[0] - 0.03, 0, d[1] - 0.03, d[0] + 0.03, d[2] - 0.12, d[1] + 0.03, C.STEEL); });
  [[8.5, -2.0, 1.25], [10.6, -2.0, 1.35]].forEach(function (c) { K.b(c[0] - 0.02, 0, c[1] - 0.02, c[0] + 0.02, c[2], c[1] + 0.02, C.STEEL); K.b(c[0] - 0.25, c[2], c[1] - 0.25, c[0] + 0.25, c[2] + 0.02, c[1] + 0.25, C.BRASS); });
  K.b(9.3, 0, -0.5, 9.7, 0.45, -0.1, C.CHAR);                                                                                                 /* stool */
  [[11.2, -2.1, C.CRIMSON], [11.7, -2.1, C.NAVY]].forEach(function (g) { K.b(g[0] - 0.15, 0, g[1] - 0.12, g[0] + 0.15, 0.08, g[1] + 0.12, C.DARK); K.b(g[0] - 0.17, 0.25, g[1] - 0.04, g[0] + 0.17, 0.8, g[1] + 0.04, g[2]); K.b(g[0] - 0.03, 0.8, g[1] - 0.03, g[0] + 0.03, 1.45, g[1] + 0.03, C.WOOD2); });
  K.b(12.2, 0, -1.6, 12.9, 0.9, -0.9, C.CHAR); K.b(12.25, 0.2, -0.9, 12.85, 0.75, -0.88, C.STONE3);                                          /* amp */

  /* ---- the gym ---- */
  K.b(9.95, 2.0, 4.45, 10.05, W.h, 4.55, C.DARK); for (k = 0; k < 4; k++) K.b(9.75 + 0.02 * (k % 2), 0.9 + k * 0.28, 4.25, 10.25 - 0.02 * (k % 2), 1.18 + k * 0.28, 4.75, k % 2 ? C.CRIMSON : C.BRICK2);   /* the punching bag */
  K.b(11.0, 0, 5.6, 12.6, 0.45, 6.0, C.CHAR); K.b(11.1, 0.45, 5.65, 12.2, 0.5, 5.95, C.DARK); K.b(11.0, 0, 5.4, 11.1, 1.1, 5.5, C.STEEL); K.b(11.0, 0, 6.1, 11.1, 1.1, 6.2, C.STEEL); K.b(10.95, 1.05, 5.0, 11.15, 1.1, 6.6, C.STEEL);   /* bench + bar */
  K.b(12.4, 0, 2.6, 12.95, 1.2, 4.6, C.CHAR); for (k = 0; k < 6; k++) K.b(12.45, 0.25 + (k % 2) * 0.5, 2.8 + (k >> 1) * 0.6, 12.9, 0.4 + (k % 2) * 0.5, 3.0 + (k >> 1) * 0.6, C.STEEL);   /* dumbbell rack */
  K.b(12.95, 0.3, 4.9, 12.99, 2.3, 6.6, C.SLATE);                                                                                              /* mirror */
  K.b(8.0, 0.015, 3.2, 12.9, 0.04, 7.5, C.DARK);                                                                                              /* rubber floor */

  /* ---- the garage: Bijli's lift, the tool bench with its pegboard, the ramp up to the shop ---- */
  K.b(-0.2, 0, 5.6, 2.4, 0.18, 7.6, C.YELLOW); K.b(-0.15, 0.18, 5.65, 2.35, 0.2, 7.55, C.STEEL);
  K.b(3.2, 0, 8.4, 6.2, 0.9, 8.95, C.WOOD2); K.b(3.15, 0.9, 8.35, 6.25, 0.95, 9.0, C.WOOD); K.b(3.2, 1.2, W.z1 - 0.02, 6.2, 2.6, W.z1, C.WOOD);
  for (k = 0; k < 10; k++) K.b(3.35 + k * 0.28, 1.5 + (k % 3) * 0.32, W.z1 - 0.06, 3.45 + k * 0.28, 1.75 + (k % 3) * 0.32, W.z1 - 0.02, [C.CRIMSON, C.STEEL, C.YELLOW, C.CHAR][k % 4]);
  for (k = 0; k < 3; k++) for (i = 0; i < 2 + k % 2; i++) { var tx = 3.6 + k * 0.9, ty = i * 0.22; K.b(tx - 0.36, ty, 7.6, tx + 0.36, ty + 0.2, 8.0, C.CHAR); K.b(tx - 0.2, ty, 7.44, tx + 0.2, ty + 0.2, 8.16, C.CHAR); }   /* stacked tyres */
  for (k = 0; k < 12; k++) { var rz = 5.2 + k * 0.32; K.b(-2.6, 0, rz, -0.8, k * 0.33 + 0.1, rz + 0.32, C.CONC2); }                         /* the ramp rising to the shop floor */
  K.b(-2.6, 3.9, 8.6, -0.8, 4.2, 9.0, C.DARK);
  return { boxes: K.out.boxes, spots: SPOTS, walls: W };
}

module.exports = { build: build, SPOTS: SPOTS, WALLS: W };
