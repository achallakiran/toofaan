/* sim: the stealth stage's yard - Antu's container yard at night. Plain data shared by the rules (sim/stealth: cover, sight lines,
   light) and the view (the voxel boxes, built here with the arena kit). Metres; x east, z south; Toofan starts at the south gate and
   the head sniper stands on the site office roof at the north end, facing the yard. No randomness except the seeded rng for litter.

   What is in the yard:
     containers   tall cover (2.6 m, or 5.2 m stacked two high): hide from everyone behind them
     crates       low cover (1.1 m): crouched behind them a man on the ground can't see him; a sniper up high still can
     floodlights  pools of light: inside one he is seen from much further away; the rest of the yard is dark
     towers       two scaffold sniper towers (5 m), and the site office whose flat roof the head sniper stands on, reached by
                  the steel stairs on its east side - the only way up, and it comes out behind him */
'use strict';

var kit = require('./arenakit');
var rngMod = require('../core/rng');
var C = kit.C;

var BOUNDS = { x0: -25.2, z0: -23.2, x1: 25.2, z1: 21.2 };
var START = { x: 0, z: 19.4, face: Math.PI };

/* [centre x, centre z, along ('x' long side east-west, 'z' north-south), height, colour] */
var CONTAINERS = [
  [-17, 13, 'x', 2.6, C.BLUE], [-6, 13.2, 'x', 5.2, C.RUST], [8.6, 12.4, 'x', 2.6, C.LEAF], [20.4, 14, 'z', 2.6, C.SAFFRON],
  [-20.5, 2.5, 'z', 5.2, C.CRIMSON], [-8.6, 4.2, 'x', 2.6, C.TEAL], [4.4, 2.2, 'z', 2.6, C.MARIGOLD], [15.8, 4.6, 'x', 5.2, C.NAVY],
  [-14.6, -7.2, 'x', 2.6, C.OLIVE], [0.2, -6.4, 'x', 2.6, C.BLUE], [13.6, -9.4, 'z', 2.6, C.RUST], [-21.6, -15.2, 'z', 2.6, C.LEAF],
  [21.2, -18.6, 'x', 2.6, C.SAFFRON]
];
/* crate stacks: [x, z, w, d] (1.1 m high) */
var CRATES = [
  [-1.4, 15.6, 1.8, 1.2], [3.4, 8.6, 1.2, 1.8], [-12.6, 8.2, 1.8, 1.2], [12.4, 8.4, 1.2, 1.2], [-3.8, -0.2, 1.8, 1.2], [9.2, -2.2, 1.2, 1.8],
  [-8.2, -12.2, 1.8, 1.2], [6.4, -13.2, 1.8, 1.2], [-16.6, -18.4, 1.2, 1.8], [15.6, -14.6, 1.2, 1.2], [22.6, -4.2, 1.2, 1.8], [-23.4, 9.6, 1.2, 1.2],
  [-6.6, 18.6, 1.2, 1.2], [6.2, 18.4, 1.8, 1.2]
];
/* floodlight pools: [x, z, radius] */
var LIGHTS = [[0, 8.4, 5.6], [-12.4, -1.4, 5.2], [11.2, -3.2, 5.2], [-1.2, -11.6, 6.4], [19.4, 19.0, 3.4], [-19.6, 17.4, 3.6], [21.6, -8.8, 3.4]];

/* the watchers: snipers on the towers and the head sniper; men on foot patrolling with pistols. Face: radians, 0 = south (+z), pi/2 = east.
   sweep: [half-angle, seconds for a full sweep]. Patrols: loops of waypoints, with a look-round wait (s) at each. */
var TOWERS = [
  { id: 'T1', x: -23.4, z: -3.4, h: 5.0, face: Math.PI / 2 + 0.15, sweep: [0.95, 8.0], range: 23 },
  { id: 'T2', x: 23.2, z: 8.2, h: 5.0, face: -Math.PI / 2 - 0.25, sweep: [0.85, 10.0], range: 23 }
];
var OFFICE = { x0: -4.4, z0: -21.6, x1: 3.0, z1: -14.6, h: 3.2 };                 /* the head sniper's roof */
var STAIRS = { x0: 3.0, z0: -21.2, x1: 9.4, z1: -19.6, top: 3.0 };                /* climbing west, from the ground at x 9.4 to the roof at x 3 */
var BOSS = { id: 'BOSS', x: -0.6, z: -15.6, face: 0, sweep: [0.7, 11.0], range: 21, glance: 9.0 };
var PATROLS = [
  { kind: 'chain', path: [[-10.4, 9.8], [1.8, 9.8], [1.8, 6.8], [-10.4, 6.8]], wait: 1.4 },
  { kind: 'blocker', path: [[-1.6, -3.8], [11.6, -3.8]], wait: 1.8 },
  { kind: 'kicker', path: [[-18.4, -10.6], [-6.4, -10.6], [-6.4, -15.6], [-18.4, -15.6]], wait: 1.2 },
  { kind: 'chain', path: [[17.6, -13.6], [17.6, -21.2], [11.4, -21.2], [11.4, -13.6]], wait: 1.5 },
  { kind: 'kicker', path: [[14.6, 10.4], [23.0, 10.4], [23.0, 18.2], [14.6, 18.2]], wait: 1.3 }
];
var CHECKPOINTS = [{ x: START.x, z: START.z, face: START.face }, { x: -3.2, z: 4.4, face: Math.PI }, { x: 19.6, z: -11.6, face: Math.PI }];

/* the footprints the rules use: cover, collision and the sight lines (y1 = height). `own` marks a watcher's own perch, which never blocks
   his view. The office is solid on the ground; on its roof only the roof is walkable. */
function solids() {
  var out = [];
  CONTAINERS.forEach(function (c) { var hx = c[2] === 'x' ? 3.05 : 1.22, hz = c[2] === 'x' ? 1.22 : 3.05; out.push({ x0: c[0] - hx, z0: c[1] - hz, x1: c[0] + hx, z1: c[1] + hz, y1: c[3], kind: 'container' }); });
  CRATES.forEach(function (c) { out.push({ x0: c[0] - c[2] / 2, z0: c[1] - c[3] / 2, x1: c[0] + c[2] / 2, z1: c[1] + c[3] / 2, y1: 1.1, kind: 'crate' }); });
  TOWERS.forEach(function (t) { out.push({ x0: t.x - 1.3, z0: t.z - 1.3, x1: t.x + 1.3, z1: t.z + 1.3, y1: t.h + 0.4, kind: 'tower', own: t.id }); });
  out.push({ x0: OFFICE.x0, z0: OFFICE.z0, x1: OFFICE.x1, z1: OFFICE.z1, y1: OFFICE.h, kind: 'office', own: 'BOSS' });
  return out;
}

/* the voxel yard for the view (arena kit boxes, tall fadeable groups, signs and lamps), in the same metres as the rules */
function build(seed) {
  var rng = rngMod.createRng(rngMod.hash32(seed ^ 0x57ea1, 7, 11)), K = kit.createBuilder(rng), P = kit.P, x, z, k, y;
  function at(px, pz, r) { return K.at(px / kit.SX, pz < 0 ? pz / kit.SZ : pz, r); }
  var o = K.out;
  /* the ground: dark concrete slabs, oil stains, painted lane lines */
  at(0, 0, 0);
  K.b(-30, -0.3, -28, 30, 0, 26, C.CHAR);
  for (x = -25; x < 25; x += 5) for (z = -23; z < 21; z += 5) K.b(x + 0.04, 0, z + 0.04, x + 4.96, 0.012, z + 4.96, (Math.abs(x * 7 + z * 3) % 3) ? C.DARK : C.GREYP);
  for (k = 0; k < 40; k++) { var sx = rng.range(-24, 24), sz = rng.range(-22, 20); K.b(sx, 0.013, sz, sx + rng.range(0.5, 1.8), 0.016, sz + rng.range(0.4, 1.4), C.BLACK); }
  for (z = -20; z < 20; z += 2.4) K.b(-0.1, 0.017, z, 0.1, 0.02, z + 1.2, C.YELLOW);
  /* the perimeter wall: corrugated sheet on posts, a closed gate in the south */
  K.tall('wallN'); at(0, -23.8, 0); K.b(-26, 0, -0.3, 26, 3.6, 0.3, C.STEEL); for (x = -26; x < 26; x += 0.6) K.b(x, 0, 0.3, x + 0.2, 3.5, 0.36, C.BLUEGREY); K.end();
  K.tall('wallW'); at(-25.8, -1.2, 0); K.b(-0.3, 0, -22.8, 0.3, 3.6, 22.8, C.STEEL); for (z = -22.8; z < 22.8; z += 0.6) K.b(0.3, 0, z, 0.36, 3.5, z + 0.2, C.BLUEGREY); K.end();
  K.tall('wallE'); at(25.8, -1.2, 0); K.b(-0.3, 0, -22.8, 0.3, 3.6, 22.8, C.STEEL); for (z = -22.8; z < 22.8; z += 0.6) K.b(-0.36, 0, z, -0.3, 3.5, z + 0.2, C.BLUEGREY); K.end();
  K.tall('wallS'); at(0, 21.8, 0); K.b(-26, 0, -0.3, -3, 3.6, 0.3, C.STEEL); K.b(3, 0, -0.3, 26, 3.6, 0.3, C.STEEL);
  for (x = -3; x < 3; x += 0.25) K.b(x, 0, -0.1, x + 0.08, 3.0, 0.1, C.GREYP); K.b(-3, 2.9, -0.15, 3, 3.1, 0.15, C.GREYP); K.b(-3, 1.4, -0.12, 3, 1.55, 0.12, C.GREYP);
  K.b(-0.3, 1.1, 0.12, 0.3, 1.5, 0.22, C.BRASS); K.end();
  /* the containers: ribbed steel boxes, doors at one end, a company name */
  CONTAINERS.forEach(function (c, i) {
    var r = c[2] === 'x' ? 0 : 1, H = c[3], col = c[4];
    K.tall('box' + i); at(c[0], c[1], r);
    var levels = H > 3 ? 2 : 1;
    for (var L = 0; L < levels; L++) {
      var y0 = L * 2.6, cc = L ? (col === C.RUST ? C.BLUE : C.RUST) : col;
      K.b(-3, y0, -1.2, 3, y0 + 2.58, 1.2, cc);
      for (x = -2.9; x < 3; x += 0.24) { K.b(x, y0 + 0.06, 1.2, x + 0.09, y0 + 2.5, 1.25, C.DARK); K.b(x, y0 + 0.06, -1.25, x + 0.09, y0 + 2.5, -1.2, C.DARK); }
      K.b(2.98, y0 + 0.1, -1.1, 3.04, y0 + 2.48, -0.02, C.GREYP); K.b(2.98, y0 + 0.1, 0.02, 3.04, y0 + 2.48, 1.1, C.GREYP);
      for (k = 0; k < 4; k++) K.b(3.04, y0 + 0.2, -0.95 + k * 0.6, 3.1, y0 + 2.4, -0.88 + k * 0.6, C.STEEL);
    }
    if (i % 3 === 0) K.sign(0, 1.7, 1.27, 2.8, 0.42, ['ANTU AUTOMATIC', 'SHAKTI CARGO', 'DESI LINES'][i % 9 / 3 | 0], '#17181b', '#ffb02e');
    K.end();
  });
  /* crates: slatted wooden boxes in stacks */
  CRATES.forEach(function (c) {
    at(c[0], c[1], 0); var w = c[2], d = c[3];
    for (var a = 0; a < Math.round(w / 0.6); a++) for (var b = 0; b < Math.round(d / 0.6); b++) {
      var u0 = -w / 2 + a * 0.6, v0 = -d / 2 + b * 0.6, hh = (a + b) % 2 ? 1.1 : 0.55;
      K.b(u0 + 0.02, 0, v0 + 0.02, u0 + 0.58, hh, v0 + 0.58, (a + b) % 3 ? C.WOOD : C.WOOD2);
      K.b(u0, hh - 0.06, v0, u0 + 0.6, hh, v0 + 0.6, C.WOOD2);
    }
    K.b(-w / 2, 0.5, -d / 2 - 0.02, w / 2, 0.58, d / 2 + 0.02, C.WOOD2);
  });
  /* the sniper towers: four scaffold legs, braces, a plank deck with a rail and sandbags, a ladder */
  TOWERS.forEach(function (t) {
    K.tall(t.id); at(t.x, t.z, 0); var H = t.h;
    [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(function (q) { K.b(q[0] - 0.08, 0, q[1] - 0.08, q[0] + 0.08, H, q[1] + 0.08, C.STEEL); });
    for (y = 0.8; y < H; y += 1.4) { K.b(-1.1, y, -1.12, 1.1, y + 0.07, -1.04, C.STEEL); K.b(-1.1, y, 1.04, 1.1, y + 0.07, 1.12, C.STEEL); K.b(-1.12, y, -1.1, -1.04, y + 0.07, 1.1, C.STEEL); K.b(1.04, y, -1.1, 1.12, y + 0.07, 1.1, C.STEEL); }
    K.b(-1.3, H, -1.3, 1.3, H + 0.12, 1.3, C.WOOD);
    K.b(-1.3, H + 0.12, -1.3, 1.3, H + 0.55, -1.15, C.KHAKI); K.b(-1.3, H + 0.12, 1.15, 1.3, H + 0.55, 1.3, C.KHAKI); K.b(-1.3, H + 0.12, -1.3, -1.15, H + 0.55, 1.3, C.KHAKI); K.b(1.15, H + 0.12, -1.3, 1.3, H + 0.55, 1.3, C.KHAKI);
    for (y = 0.3; y < H; y += 0.35) K.b(-0.3, y, 1.12, 0.3, y + 0.05, 1.18, C.GREYP);
    K.end();
  });
  /* the site office: a block cabin with a flat roof the head sniper stands on, rails round it, steel stairs up the east side */
  K.tall('office'); at(0, 0, 0);
  var O = OFFICE; K.b(O.x0, 0, O.z0, O.x1, O.h - 0.1, O.z1, C.CEMENT); K.b(O.x0 - 0.1, O.h - 0.12, O.z0 - 0.1, O.x1 + 0.1, O.h, O.z1 + 0.1, C.GREYP);
  K.b(-2.6, 0.9, O.z1, -0.4, 2.0, O.z1 + 0.05, C.SLATE); K.b(0.6, 0, O.z1, 1.8, 2.2, O.z1 + 0.05, C.WOOD2);
  for (x = O.x0; x <= O.x1 + 0.01; x += 1.0) K.b(x - 0.04, O.h, O.z1 + 0.02, x + 0.04, O.h + 0.95, O.z1 + 0.1, C.YELLOW);
  K.b(O.x0, O.h + 0.9, O.z1 + 0.02, O.x1, O.h + 0.98, O.z1 + 0.1, C.YELLOW); K.b(O.x0, O.h + 0.9, O.z0 - 0.1, O.x1, O.h + 0.98, O.z0 - 0.02, C.YELLOW);
  K.b(O.x0 - 0.1, O.h + 0.9, O.z0, O.x0 - 0.02, O.h + 0.98, O.z1, C.YELLOW);
  K.b(-3.6, O.h, -15.4, -2.4, O.h + 0.5, -15.0, C.KHAKI);                       /* sandbags at the roof's front edge */
  K.sign(-1.2, 2.5, O.z1 + 0.08, 3.4, 0.5, 'SITE OFFICE', '#ffb02e', '#17181b');
  var S = STAIRS, n = 12;
  for (k = 0; k < n; k++) { var u0 = S.x1 - (k + 1) * (S.x1 - S.x0) / n, u1 = S.x1 - k * (S.x1 - S.x0) / n, hy = (k + 1) * S.top / n; K.b(u0, hy - 0.08, S.z0, u1, hy, S.z1, C.STEEL); K.b(u0, 0, S.z1 - 0.06, u0 + 0.08, hy, S.z1, C.GREYP); }
  K.b(S.x0, S.top + 0.9, S.z1, S.x1, S.top + 0.98, S.z1 + 0.06, C.YELLOW);
  K.end();
  /* floodlight masts with their lamps, and a few lit windows of stacked drums and tyres for clutter */
  LIGHTS.forEach(function (L, i) {
    var mx = L[0] + (i % 2 ? 1 : -1) * 0.4, mz = L[1] - 0.4; at(mx, mz, 0);
    K.b(-0.07, 0, -0.07, 0.07, 6.2, 0.07, C.GREYP); K.b(-0.45, 6.2, -0.2, 0.45, 6.55, 0.2, C.DARK); K.g(-0.4, 6.18, -0.16, 0.4, 6.22, 0.16, '#fff3c4');
    K.lamp(0, 5.8, 0, '#ffe7b0', 2.4, L[2] * 2.1);
  });
  at(-24.0, 19.6, 0); P.drum(K, C.CRIMSON); at(-23.2, 20.2, 0); P.drum(K, C.NAVY); at(24.0, -21.6, 0); P.tyres(K, 3); at(-10.2, -21.8, 0); P.drum(K, C.OLIVE);
  return {
    key: 'stealth', cx: 0, cz: 0, ox: 0, oz: 0, kind: 'arena', arena: 'stealth',
    boxes: o.boxes, tall: o.tall.map(function (g) {
      var b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9 };
      g.boxes.forEach(function (q) { b.x0 = Math.min(b.x0, q.x0); b.y0 = Math.min(b.y0, q.y0); b.z0 = Math.min(b.z0, q.z0); b.x1 = Math.max(b.x1, q.x1); b.y1 = Math.max(b.y1, q.y1); b.z1 = Math.max(b.z1, q.z1); });
      g.box = b; return g;
    }), signs: o.signs, glows: o.glows, lamps: o.lamps, leds: o.leds
  };
}

module.exports = { BOUNDS: BOUNDS, START: START, CONTAINERS: CONTAINERS, CRATES: CRATES, LIGHTS: LIGHTS, TOWERS: TOWERS, OFFICE: OFFICE, STAIRS: STAIRS,
  BOSS: BOSS, PATROLS: PATROLS, CHECKPOINTS: CHECKPOINTS, solids: solids, build: build };
