/* sim: Toofan's hideout, the one fixed layout used everywhere the hideout appears (the New Game nightmare in his bed corner now; the
   walk-around hub, its hidden entrance and the flashbacks later). A dark, lived-in underground hall under the old cycle-repair shop:
   stained concrete and old brick, pillars, pipes and cable runs, scavenged gear everywhere; light comes from screens, neon, string bulbs,
   coloured work lamps and racks of blinking indicator lights (blue, green, red). Hideout-local metres: back wall z = -2.5, left wall
   x = -2.7; the hall runs to x = 13, z = 9. Pure data: lit boxes, glowing boxes, blinking LEDs, coloured lamps, named spots. Seeded. */
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
/* what you cannot walk through (x0, z0, x1, z1), for the walk-around hideout */
var SOLIDS = [
  [-2.7, -2.5, 1.15, -0.45], [-2.7, 0.2, -2.0, 1.0], [1.3, -2.5, 2.0, -2.0],                               /* the bed corner, the cupboard, the books */
  [3.75, -2.5, 6.45, -1.55], [5.8, -1.45, 6.3, -0.9], [6.7, -2.5, 7.5, -1.7],                                /* the desk, its cabinet, the server rack */
  [8.55, -2.3, 10.45, -0.75], [10.95, -2.4, 11.95, -1.85], [12.2, -2.5, 13, -0.9],                           /* the drums, the guitars, the amp */
  [-0.25, 2.4, 0.25, 2.9], [4.25, 2.4, 4.75, 2.9], [8.75, 2.4, 9.25, 2.9],                                   /* pillars */
  [9.75, 4.25, 10.25, 4.75], [10.85, 5.0, 12.6, 6.6], [12.4, 2.6, 13, 4.6],                                  /* the bag, the bench, the weights */
  [8.15, 5.0, 8.75, 5.9], [10.5, 3.25, 10.75, 3.5], [12.1, 3.25, 12.35, 3.5], [8.15, 6.8, 8.8, 7.15], [9.6, 6.9, 10.0, 7.25], [12.15, 6.85, 13, 7.4],   /* dummy, pull-up bar, kettlebells, ball, gada */
  [2.8, 4.15, 7.2, 4.27], [5.6, 4.4, 7.3, 5.2], [3.15, 8.35, 6.25, 9.0],                                     /* the chain-link screen, tyres, the tool bench */
  [7.6, 7.8, 8.9, 9.1], [8.8, 7.2, 10.6, 8.8], [11.2, 8.2, 11.9, 9.0],                                       /* crates, the tarp, the fridge */
  [-0.2, 5.6, 2.4, 7.6], [-2.7, 5.2, -0.8, 9.0]                                                              /* Bijli's lift, the ramp */
];
/* the things to do at home: where Toofan stands to use each one, and which way he faces */
var STATIONS = [
  { id: 'bed', x: 1.55, z: -0.15, face: -2.4, label: 'SLEEP' },
  { id: 'chart', x: 5.1, z: -1.05, face: Math.PI, label: 'GANG CHART' },
  { id: 'bench', x: 9.2, z: 6.3, face: 0, label: 'TRAINING' },              /* the workouts, on the gym mat */
  { id: 'gym', x: 10.0, z: 5.35, face: Math.PI, label: 'TRAIN' },
  { id: 'music', x: 11.45, z: -1.2, face: 0, label: 'PLAY GUITAR' },
  { id: 'bijli', x: 1.0, z: 5.0, face: 0, label: 'RIDE OUT' }
];
var BLUE = 0x2f9bff, GREEN = 0x37ff7a, RED = 0xff3040, AMBER = 0xffb020, CYAN = 0x40f0ff, PINK = 0xff40c0;

function build(seed, opts) {
  var cut = !!(opts && opts.cutaway);                            /* the walk-around view looks in through the front wall, so it is left out */
  var K = kit.createBuilder(rngMod.createRng((seed >>> 0) ^ 0x70f4)), C = kit.C, rng = K.rng, x, z, k, i, j;
  K.at(0, 0, 0);                                              /* one frame for everything: positions below are hideout metres */
  function R(a, b) { return a + rng.next() * (b - a); }
  /* rack of blinking lights on a face: n x m LEDs in a grid */
  function ledGrid(x0, y0, zf, cols, rows, dx, dy, cols2) { for (var a = 0; a < cols; a++) for (var b = 0; b < rows; b++) K.led(x0 + a * dx, y0 + b * dy, zf, cols2[(a + b * 3) % cols2.length], R(0.4, 3.2), R(0, 6), rng.next() < 0.25 ? 'flicker' : 'blink'); }

  /* ---- shell: stained concrete floor, old brick and raw concrete walls, a low concrete ceiling ---- */
  for (x = W.x0; x < W.x1; x += 1.0) for (z = W.z0; z < W.z1; z += 1.0) K.b(x + 0.02, 0, z + 0.02, Math.min(W.x1, x + 1) - 0.02, 0.015, Math.min(W.z1, z + 1) - 0.02, rng.next() < 0.3 ? C.STONE3 : (rng.next() < 0.5 ? C.CHAR : C.DARK));
  for (k = 0; k < 40; k++) { var sx = R(W.x0, W.x1 - 1), sz = R(W.z0, W.z1 - 1); K.b(sx, 0.016, sz, sx + R(0.4, 1.4), 0.02, sz + R(0.3, 1.1), rng.next() < 0.5 ? C.BLACK : C.SLATE); }     /* oil stains, damp */
  for (x = -2.6; x < 2.4; x += 0.32) K.b(x, 0.015, -2.4, x + 0.3, 0.035, 1.2, (Math.round(x * 3) % 2) ? C.WOOD2 : C.BROWN);                          /* old planks under the bed corner */
  K.b(W.x0, 0, W.z0 - 0.1, W.x1, W.h, W.z0, C.CHAR); K.b(W.x0 - 0.1, 0, W.z0, W.x0, W.h, W.z1, C.CHAR); K.b(W.x1, 0, W.z0, W.x1 + 0.1, W.h, W.z1, C.CHAR);
  if (!cut) K.b(W.x0, 0, W.z1, W.x1, W.h, W.z1 + 0.1, C.CHAR); if (!cut) K.b(W.x0, W.h, W.z0, W.x1, W.h + 0.1, W.z1, C.BLACK);
  for (var yy = 0; yy < 3.6; yy += 0.16) for (x = W.x0; x < W.x1; x += 0.32) if (rng.next() < 0.78) K.b(x + ((yy * 6.25 | 0) % 2) * 0.16, yy, W.z0, x + 0.3 + ((yy * 6.25 | 0) % 2) * 0.16, yy + 0.14, W.z0 + 0.025, rng.next() < 0.2 ? C.BRICK : (rng.next() < 0.5 ? C.BRICK2 : C.STONE3));   /* the old brick back wall, missing bricks */
  for (k = 0; k < 14; k++) { var gx = R(0, 12), gy = R(0.4, 2.6); K.b(gx, gy, W.z0 + 0.025, gx + R(0.3, 1.2), gy + R(0.06, 0.2), W.z0 + 0.036, [C.MAGENTA, C.TEAL, C.MARIGOLD, C.CRIMSON, C.LIME][k % 5]); }   /* graffiti strokes */
  K.b(W.x0, 3.7, W.z0, W.x1, 3.86, W.z0 + 0.16, C.RUST); K.b(W.x0, 3.45, W.z0, W.x1, 3.55, W.z0 + 0.12, C.STEEL); if (!cut) K.b(W.x0, 3.9, 2.0, W.x1, 4.0, 2.1, C.RUST);   /* pipes */
  if (!cut) for (x = -2.5; x < W.x1; x += 1.4) K.b(x, 3.86, -2.5, x + 0.05, 3.95, 9, C.BLACK);                                                                 /* cable trays across the ceiling */
  for (x = 0; x < W.x1; x += 4.5) { K.b(x - 0.25, 0, 2.4, x + 0.25, W.h, 2.9, C.STONE3); K.b(x - 0.26, 0.9, 2.39, x + 0.26, 1.0, 2.91, C.YELLOW); K.b(x - 0.26, 1.0, 2.39, x + 0.26, 1.1, 2.91, C.BLACK); }   /* pillars with hazard bands */
  /* the street grate high above the bed: a little cold light falls through */
  K.b(-0.7, 3.0, W.z0, 0.7, 3.6, W.z0 + 0.035, C.NAVY); for (k = 0; k < 8; k++) K.b(-0.68 + k * 0.19, 3.0, W.z0 + 0.035, -0.64 + k * 0.19, 3.6, W.z0 + 0.05, C.BLACK);
  K.lamp(0, 2.8, -1.6, 0x7a9cff, 1.4, 6);
  /* string bulbs zig-zagging across the hall, warm and dim */
  for (k = 0; k < 26; k++) { var bx = -2 + k * 0.58, bz = (k % 2 ? 1.4 : 0.6), by = 3.45 - Math.sin(k * 0.6) * 0.15; K.b(bx - 0.03, by - 0.05, bz - 0.03, bx + 0.03, by + 0.02, bz + 0.03, C.DARK); K.led(bx, by - 0.08, bz, 0xffc36a, R(0.2, 0.6), R(0, 6), 'pulse'); }

  /* ---- the bed corner: a mattress on pallets, a crate for a side table, a lamp, a rug, a cupboard, posters ---- */
  K.b(-1.1, 0, -1.7, 1.1, 0.12, -0.5, C.WOOD2); K.b(-1.1, 0.12, -1.7, 1.1, 0.26, -0.5, C.WOOD); K.b(-1.1, 0.26, -1.7, 1.1, 0.35, -0.5, C.WOOD2);
  K.b(-1.15, 0, -1.75, -1.0, 0.95, -0.45, C.RUST); K.b(-1.05, 0.35, -1.65, 1.05, 0.55, -0.55, C.STONE); K.b(-1.0, 0.55, -1.5, -0.7, 0.68, -0.7, C.SAND);
  K.b(-1.75, 0, -1.6, -1.25, 0.55, -1.1, C.WOOD); K.b(-1.73, 0.1, -1.08, -1.27, 0.5, -1.06, C.WOOD2);
  K.b(-1.6, 0.55, -1.45, -1.45, 0.6, -1.3, C.STEEL); K.b(-1.56, 0.6, -1.41, -1.49, 0.85, -1.34, C.STEEL); K.g(-1.66, 0.85, -1.5, -1.39, 1.0, -1.25, 0xffb050);
  K.lamp(-1.5, 1.1, -1.0, 0xffa040, 1.5, 4.5, true);
  K.b(-1.4, 0.016, -0.3, 1.3, 0.04, 0.9, C.BRICK2); K.b(-1.3, 0.04, -0.2, 1.2, 0.05, 0.8, C.OLIVE);     /* the rug sits above the planks (no shared top face) */
  K.b(-2.6, 0, 0.2, -2.0, 1.8, 1.0, C.SLATE); K.b(-2.55, 0.9, 0.25, -2.05, 0.95, 0.95, C.STEEL); K.b(-2.55, 1.9, 0.3, -2.1, 2.1, 0.9, C.CHAR);
  K.b(-2.6, 1.4, -1.6, -2.58, 2.3, -0.4, C.CRIMSON); K.b(-2.58, 1.55, -1.45, -2.57, 2.15, -0.55, C.BLACK); K.b(-2.6, 1.0, -2.3, -2.58, 1.9, -1.8, C.MARIGOLD);   /* posters */
  for (k = 0; k < 5; k++) K.b(1.3 + k * 0.12, 0, -2.3, 1.42 + k * 0.12, 0.25 + (k % 3) * 0.08, -2.0, [C.NAVY, C.CRIMSON, C.STONE, C.OLIVE, C.CHAR][k]);   /* a stack of books and boxes */
  /* Raka's mat, his bowl and a chewed ball */
  K.b(2.9, 0.015, 0.0, 3.9, 0.05, 0.7, C.OLIVE); K.b(3.95, 0.015, 0.75, 4.2, 0.08, 1.0, C.STEEL); K.b(3.6, 0.015, 0.85, 3.7, 0.1, 0.95, C.CRIMSON);

  /* ---- the computer wall: monitors glowing with maps and code, a server rack of lights, the gang chart, cables everywhere ---- */
  K.b(3.8, 0, -2.4, 6.4, 0.75, -1.6, C.CHAR); K.b(3.75, 0.75, -2.45, 6.45, 0.8, -1.55, C.STEEL);
  var screens = [[4.2, 0.95, 0.0, 0x1fd0ff], [5.1, 0.95, 0.12, 0x2aff8a], [6.0, 0.95, 0.0, 0x1fd0ff], [4.65, 1.6, 0.05, 0xff3a5a], [5.55, 1.6, 0.05, 0x4a7cff]];
  screens.forEach(function (m) { K.b(m[0] - 0.42, m[1] + m[2], -2.32, m[0] + 0.42, m[1] + 0.52 + m[2], -2.27, C.BLACK); K.g(m[0] - 0.38, m[1] + 0.04 + m[2], -2.27, m[0] + 0.38, m[1] + 0.48 + m[2], -2.26, m[3]); });
  for (i = 0; i < 5; i++) for (j = 0; j < 6; j++) if (rng.next() < 0.6) { var sc = screens[i]; K.b(sc[0] - 0.34 + R(0, 0.5), sc[1] + 0.08 + sc[2] + j * 0.065, -2.258, sc[0] - 0.34 + R(0.1, 0.6), sc[1] + 0.1 + sc[2] + j * 0.065, -2.255, C.WHITE); }   /* text lines on the screens */
  K.lamp(5.1, 1.3, -1.6, 0x30b0ff, 1.3, 4.5);
  K.b(4.6, 0.8, -1.95, 5.6, 0.83, -1.75, C.BLACK); for (k = 0; k < 8; k++) K.led(4.7 + k * 0.12, 0.84, -1.85, k % 2 ? 0x3080ff : 0xff40c0, 0.3, k, 'pulse');   /* the keyboard glows */
  K.b(5.8, 0, -1.4, 6.3, 0.5, -0.9, C.CHAR); K.b(5.8, 0.5, -1.45, 6.3, 1.1, -1.4, C.CHAR);
  K.b(6.7, 0, -2.4, 7.5, 2.4, -1.7, C.BLACK); ledGrid(6.8, 0.2, -1.69, 6, 18, 0.12, 0.12, [GREEN, GREEN, BLUE, RED, AMBER]);                     /* server rack */
  for (k = 0; k < 6; k++) K.b(3.9 + k * 0.5, 0.0, -1.55 + k * 0.05, 3.94 + k * 0.5, 0.02, 0.4 + k * 0.2, C.BLACK);                                 /* cables over the floor */
  K.b(3.6, 1.95, W.z0, 7.4, 3.3, W.z0 + 0.04, C.WOOD2);                                                                                        /* the cork board */
  for (i = 0; i < 5; i++) { var px = 3.8 + i * 0.7; K.b(px, 2.65, W.z0 + 0.04, px + 0.45, 3.15, W.z0 + 0.06, C.OFFWHITE); K.b(px + 0.05, 2.7, W.z0 + 0.06, px + 0.4, 3.1, W.z0 + 0.07, [C.RUST, C.CRIMSON, C.MARIGOLD, C.OLIVE, C.LEAF][i]); }
  K.b(5.2, 2.05, W.z0 + 0.04, 5.7, 2.5, W.z0 + 0.06, C.BLACK); K.g(5.38, 2.15, W.z0 + 0.06, 5.52, 2.4, W.z0 + 0.07, 0xff2030);                    /* Taka: a black card, a red "?" */
  for (i = 0; i < 5; i++) { var sx2 = 4.0 + i * 0.7, n = 10; for (k = 0; k < n; k++) { var u = k / n; K.b(sx2 + (5.45 - sx2) * u, 2.65 + (2.4 - 2.65) * u, W.z0 + 0.07, sx2 + (5.45 - sx2) * u + 0.04, 2.67 + (2.4 - 2.65) * u, W.z0 + 0.08, C.CRIMSON); } }

  /* ---- the music corner: drums, guitars, an amp with its lights, a neon TOOFAN sign ---- */
  K.b(8.6, 0.015, -2.3, 11.6, 0.04, 0.2, C.NAVY);
  K.b(9.2, 0, -1.6, 9.8, 0.55, -1.0, C.CHAR); K.b(9.25, 0.05, -1.55, 9.75, 0.5, -1.05, C.CRIMSON);
  [[8.8, -1.0, 0.6], [10.2, -1.0, 0.6], [9.0, -1.8, 0.72], [10.0, -1.8, 0.72]].forEach(function (d) { K.b(d[0] - 0.2, d[2] - 0.12, d[1] - 0.2, d[0] + 0.2, d[2] + 0.08, d[1] + 0.2, C.CRIMSON); K.b(d[0] - 0.03, 0, d[1] - 0.03, d[0] + 0.03, d[2] - 0.12, d[1] + 0.03, C.STEEL); });
  [[8.5, -2.0, 1.25], [10.6, -2.0, 1.35]].forEach(function (c) { K.b(c[0] - 0.02, 0, c[1] - 0.02, c[0] + 0.02, c[2], c[1] + 0.02, C.STEEL); K.b(c[0] - 0.25, c[2], c[1] - 0.25, c[0] + 0.25, c[2] + 0.02, c[1] + 0.25, C.BRASS); });
  K.b(9.3, 0, -0.5, 9.7, 0.45, -0.1, C.CHAR);
  [[11.2, -2.1, C.CRIMSON], [11.7, -2.1, C.NAVY]].forEach(function (g) { K.b(g[0] - 0.15, 0, g[1] - 0.12, g[0] + 0.15, 0.08, g[1] + 0.12, C.DARK); K.b(g[0] - 0.17, 0.25, g[1] - 0.04, g[0] + 0.17, 0.8, g[1] + 0.04, g[2]); K.b(g[0] - 0.03, 0.8, g[1] - 0.03, g[0] + 0.03, 1.45, g[1] + 0.03, C.WOOD2); });
  K.b(12.2, 0, -1.6, 12.9, 0.9, -0.9, C.BLACK); K.b(12.25, 0.2, -0.9, 12.85, 0.75, -0.88, C.CHAR); for (k = 0; k < 4; k++) K.led(12.3 + k * 0.15, 0.82, -0.88, k < 3 ? GREEN : RED, 2 + k, k, 'blink');
  /* the neon sign on the brick: TOOFAN in pink tube letters (3 x 5 strokes each) */
  var FONT = { T: ['111', '010', '010', '010', '010'], O: ['111', '101', '101', '101', '111'], F: ['111', '100', '110', '100', '100'], A: ['111', '101', '111', '101', '101'], N: ['101', '111', '111', '111', '101'] };
  'TOOFAN'.split('').forEach(function (ch, li) {
    var f = FONT[ch], ox = 8.75 + li * 0.62, P = 0.13;
    for (var r = 0; r < 5; r++) for (var cI = 0; cI < 3; cI++) if (f[r][cI] === '1') { var lx = ox + cI * P, ly = 3.2 - r * P; K.g(lx, ly, W.z0 + 0.05, lx + P * 0.8, ly + P * 0.8, W.z0 + 0.09, PINK); }
  });
  K.b(8.6, 2.45, W.z0, 12.5, 3.4, W.z0 + 0.044, C.BLACK);                                                                                     /* the sign's backing board */
  K.lamp(10.3, 2.4, -1.6, 0xff2a6a, 1.2, 5, true);

  /* ---- the gym: bag, bench, rack, mirror, a red work light ---- */
  K.b(9.95, 2.0, 4.45, 10.05, W.h, 4.55, C.DARK); for (k = 0; k < 4; k++) K.b(9.75 + 0.02 * (k % 2), 0.9 + k * 0.28, 4.25, 10.25 - 0.02 * (k % 2), 1.18 + k * 0.28, 4.75, k % 2 ? C.CRIMSON : C.BRICK2);
  K.b(11.0, 0, 5.6, 12.6, 0.45, 6.0, C.CHAR); K.b(11.1, 0.45, 5.65, 12.2, 0.5, 5.95, C.DARK); K.b(11.0, 0, 5.4, 11.1, 1.1, 5.5, C.STEEL); K.b(11.0, 0, 6.1, 11.1, 1.1, 6.2, C.STEEL); K.b(10.95, 1.05, 5.0, 11.15, 1.1, 6.6, C.STEEL);
  K.b(12.4, 0, 2.6, 12.95, 1.2, 4.6, C.CHAR); for (k = 0; k < 6; k++) K.b(12.45, 0.25 + (k % 2) * 0.5, 2.8 + (k >> 1) * 0.6, 12.9, 0.4 + (k % 2) * 0.5, 3.0 + (k >> 1) * 0.6, C.STEEL);
  K.b(12.95, 0.3, 4.9, 12.99, 2.3, 6.6, C.SLATE);
  /* the training floor: red and blue mat tiles */
  for (x = 8.0; x < 12.9; x += 0.6) for (z = 3.2; z < 7.5; z += 0.6) K.b(x + 0.01, 0.015, z + 0.01, Math.min(12.9, x + 0.6) - 0.01, 0.04, Math.min(7.5, z + 0.6) - 0.01, ((Math.round((x - 8) / 0.6) + Math.round((z - 3.2) / 0.6)) % 2) ? C.CRIMSON : C.NAVY);
  /* the barbell's plates, and dumbbells on the rack */
  K.b(10.85, 0.78, 5.0, 11.25, 1.37, 5.12, C.BLACK); K.b(10.85, 0.78, 6.48, 11.25, 1.37, 6.6, C.BLACK); K.b(10.9, 0.86, 5.12, 11.2, 1.29, 5.2, C.RED); K.b(10.9, 0.86, 6.4, 11.2, 1.29, 6.48, C.RED);
  for (k = 0; k < 6; k++) { var dy = 0.42 + (k % 2) * 0.5, dz = 2.9 + (k >> 1) * 0.6; K.b(12.48, dy, dz - 0.1, 12.86, dy + 0.14, dz - 0.04, C.BLACK); K.b(12.48, dy, dz + 0.04, 12.86, dy + 0.14, dz + 0.1, C.BLACK); }
  /* the wooden dummy (arms and a leg out to the front) */
  K.b(8.15, 0, 5.0, 8.75, 0.08, 5.6, C.WOOD2); K.b(8.3, 0.08, 5.15, 8.6, 1.75, 5.45, C.WOOD); K.b(8.28, 1.7, 5.13, 8.62, 1.78, 5.47, C.WOOD2);
  K.b(8.33, 1.28, 5.45, 8.41, 1.36, 5.9, C.WOOD2); K.b(8.49, 1.28, 5.45, 8.57, 1.36, 5.9, C.WOOD2); K.b(8.41, 1.02, 5.45, 8.49, 1.1, 5.85, C.WOOD2); K.b(8.4, 0.45, 5.45, 8.5, 0.53, 5.8, C.WOOD2);
  /* a pull-up bar, a skipping rope hung on it */
  K.b(10.55, 0, 3.3, 10.7, 2.6, 3.45, C.STEEL); K.b(12.15, 0, 3.3, 12.3, 2.6, 3.45, C.STEEL); K.b(10.55, 2.45, 3.34, 12.3, 2.53, 3.41, C.STEEL);
  K.b(10.5, 0.04, 3.25, 10.75, 0.08, 3.5, C.YELLOW); K.b(12.1, 0.04, 3.25, 12.35, 0.08, 3.5, C.YELLOW);
  K.b(10.71, 1.25, 3.46, 10.74, 1.95, 3.49, C.RED); K.b(10.78, 1.25, 3.46, 10.81, 1.95, 3.49, C.RED); K.b(10.71, 1.2, 3.44, 10.81, 1.3, 3.5, C.WOOD2);
  /* kettlebells and a medicine ball */
  [[8.3, 6.95], [8.65, 7.0]].forEach(function (q) { K.b(q[0] - 0.12, 0.04, q[1] - 0.12, q[0] + 0.12, 0.26, q[1] + 0.12, C.BLACK); K.b(q[0] - 0.09, 0.26, q[1] - 0.025, q[0] + 0.09, 0.34, q[1] + 0.025, C.BLACK); });
  K.b(9.65, 0.04, 6.95, 9.95, 0.34, 7.2, C.OLIVE);
  /* the akhada corner: a gada (mace) and a pair of mudgar clubs by the mirror */
  K.b(12.72, 0.04, 7.06, 12.78, 1.1, 7.12, C.WOOD2); K.b(12.58, 1.1, 6.93, 12.92, 1.42, 7.25, C.BRASS); K.b(12.62, 1.42, 6.97, 12.88, 1.5, 7.21, C.BRASS);
  [[12.3, 7.2], [12.5, 7.28]].forEach(function (q) { K.b(q[0] - 0.08, 0.04, q[1] - 0.08, q[0] + 0.08, 0.5, q[1] + 0.08, C.WOOD); K.b(q[0] - 0.04, 0.5, q[1] - 0.04, q[0] + 0.04, 0.76, q[1] + 0.04, C.WOOD2); });
  K.lamp(10.2, 3.1, 5.6, 0xfff0d0, 0.8, 6);
  K.lamp(11.5, 3.0, 4.8, 0xff3030, 0.9, 5);

  /* ---- the garage: Bijli's lift with hazard stripes, a tool bench, pegboard, tyres, a chain-link screen, the ramp up ---- */
  for (k = 0; k < 10; k++) K.b(-0.2 + k * 0.26, 0, 5.6, -0.2 + k * 0.26 + 0.13, 0.18, 7.6, k % 2 ? C.YELLOW : C.BLACK);
  K.b(-0.15, 0.18, 5.65, 2.35, 0.2, 7.55, C.STEEL); for (k = 0; k < 3; k++) K.led(0 + k * 1.1, 0.22, 5.62, GREEN, 1.2, k, 'blink');
  K.b(3.2, 0, 8.4, 6.2, 0.9, 8.95, C.WOOD2); K.b(3.15, 0.9, 8.35, 6.25, 0.95, 9.0, C.STEEL); if (!cut) K.b(3.2, 1.2, W.z1 - 0.02, 6.2, 2.6, W.z1, C.STONE3);
  if (!cut) for (k = 0; k < 12; k++) K.b(3.35 + k * 0.24, 1.4 + (k % 3) * 0.36, W.z1 - 0.06, 3.43 + k * 0.24, 1.7 + (k % 3) * 0.36, W.z1 - 0.02, [C.CRIMSON, C.STEEL, C.YELLOW, C.BLACK][k % 4]);
  for (k = 0; k < 7; k++) K.b(3.3 + k * 0.4, 0.95, 8.5 + (k % 2) * 0.15, 3.5 + k * 0.4, 1.02 + (k % 3) * 0.04, 8.62 + (k % 2) * 0.15, [C.CRIMSON, C.STEEL, C.BLACK, C.YELLOW][k % 4]);   /* tools on the bench */
  K.b(4.6, 0.95, 8.55, 5.1, 1.3, 8.85, C.BLACK); K.g(4.65, 1.0, 8.54, 5.05, 1.25, 8.55, GREEN);                                                      /* a diagnostic screen */
  for (k = 0; k < 2; k++) for (i = 0; i < 2 + k % 2; i++) { var tx = 6.0 + k * 0.85, ty = i * 0.22; K.b(tx - 0.36, ty, 4.6, tx + 0.36, ty + 0.2, 5.0, C.BLACK); K.b(tx - 0.2, ty, 4.44, tx + 0.2, ty + 0.2, 5.16, C.BLACK); }   /* old tyres by the screen */
  for (x = 2.8; x < 7.2; x += 0.2) K.b(x, 0, 4.2, x + 0.02, 2.4, 4.22, C.STEEL); K.b(2.8, 2.38, 4.18, 7.2, 2.44, 4.24, C.STEEL);                      /* chain-link screen */
  for (k = 0; k < 12; k++) { var rz = 5.2 + k * 0.32; K.b(-2.6, 0, rz, -0.8, k * 0.33 + 0.1, rz + 0.32, C.STONE3); K.b(-2.6, k * 0.33 + 0.1, rz, -2.5, k * 0.33 + 0.14, rz + 0.32, C.YELLOW); }
  K.b(-2.6, 3.9, 8.6, -0.8, 4.2, 9.0, C.BLACK); for (k = 0; k < 4; k++) K.led(-2.3 + k * 0.45, 4.0, 8.58, k % 2 ? RED : AMBER, 1.5, k * 1.5, 'blink');   /* warning lights at the shutter */
  K.lamp(1.5, 2.8, 6.4, 0x30ff90, 0.9, 6);
  /* clutter: crates, a tarp, cable drums, a fridge humming in the corner */
  [[7.6, 7.8], [8.3, 8.2], [7.9, 8.6]].forEach(function (q) { K.b(q[0], 0, q[1], q[0] + 0.6, 0.6, q[1] + 0.5, C.WOOD); K.b(q[0] + 0.02, 0.6, q[1] + 0.02, q[0] + 0.58, 0.62, q[1] + 0.48, C.WOOD2); });
  K.b(8.8, 0, 7.2, 10.6, 0.9, 8.8, C.OLIVE); K.b(11.2, 0, 8.2, 11.9, 1.8, 8.95, C.STONE); K.led(11.5, 1.6, 8.19, BLUE, 0.4, 0, 'pulse');
  return { boxes: K.out.boxes, glows: K.out.glows, leds: K.out.leds, lamps: K.out.lamps, spots: SPOTS, walls: W };
}

module.exports = { build: build, SPOTS: SPOTS, WALLS: W, SOLIDS: SOLIDS, STATIONS: STATIONS };
