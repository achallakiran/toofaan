/* sim: the fight arenas' modular kit. Pure data: every piece is a set of small boxes (palette colours) in arena-local metres, with
   footprints that block walking. A piece is built in its own frame (u across, v deep, y up; its front faces +v) and placed with a
   position and a quarter-turn, so the same stall or barricade can stand on any edge. Tall pieces go into named groups the view
   can fade when they come between the camera and the fight. No graphics, no randomness except the seeded rng passed in. */
'use strict';

var C = {
  GREY: 0, DARK: 1, KHAKI: 2, TERRA: 3, OCHRE: 4, BLUE0: 5, SAGE: 6, BROWN: 7, CONCRETE: 8, PLUM: 9, ROSE0: 10, TEAL0: 11,
  CHAR: 12, GREYP: 13, YELLOW: 14, BLACK: 15, SAFFRON: 16, MAGENTA: 17, TEAL: 18, LIME: 19, BLUE: 20, RED: 21, CREAM: 22, PURPLE: 23,
  DIRT: 24, WHITE: 25, RUST: 26, PINK: 27, W_SAF: 28, W_ROSE: 29, W_TURQ: 30, W_LIME: 31, W_BLUE: 32, W_CREAM: 33, W_OCHRE: 34, W_ORCH: 35,
  STONE: 36, STONE2: 37, STONE3: 38, WOOD: 39, WOOD2: 40, BRASS: 41, MARIGOLD: 42, LEMON: 43, CRIMSON: 44, DGREEN: 45, LEAF: 46, SLATE: 47,
  SAND: 48, CEMENT: 49, CONC2: 50, BLUEGREY: 51, OFFWHITE: 52, NAVY: 53, STEEL: 54, BRICK: 55, BRICK2: 56, OLIVE: 57, PEACH: 58, MAUVE: 59
};
var WALLS = [C.W_SAF, C.W_ROSE, C.W_TURQ, C.W_LIME, C.W_BLUE, C.W_CREAM, C.W_OCHRE, C.W_ORCH, C.PEACH, C.OFFWHITE];
var BRIGHT = [C.SAFFRON, C.MAGENTA, C.TEAL, C.LIME, C.BLUE, C.RED, C.YELLOW, C.PURPLE, C.PINK, C.MARIGOLD, C.CRIMSON];

/* the builder: collects boxes (static), tall groups (fadeable), solids, signs and spawn points */
/* layouts are written on a 30 m square; the pieces are placed closer in (x by SX, the north half by SZ) so the edges and the showpiece sit
   inside the fight camera's frame while the pieces themselves keep their real size */
var SX = 0.84, SZ = 0.84;
function squeeze(x, z) { return [x * SX, z < 0 ? z * SZ : z]; }
function createBuilder(rng) {
  var out = { boxes: [], tall: [], solids: [], signs: [], lights: [], glows: [], leds: [], lamps: [] }, group = null;
  var fr = { x: 0, z: 0, r: 0 };                                   /* the current piece frame: origin and quarter turns */
  function tx(u, v) {                                              /* piece-local (u, v) to arena (x, z) */
    switch (fr.r & 3) { case 0: return [fr.x + u, fr.z + v]; case 1: return [fr.x + v, fr.z - u]; case 2: return [fr.x - u, fr.z - v]; default: return [fr.x - v, fr.z + u]; }
  }
  function rect(u0, v0, u1, v1) { var a = tx(u0, v0), b = tx(u1, v1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
  var K = {
    rng: rng, C: C, out: out,
    /* a box in the piece frame */
    b: function (u0, y0, v0, u1, y1, v1, c) {
      var q = rect(Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1));
      if (q[2] - q[0] < 0.005 || q[3] - q[1] < 0.005 || y1 - y0 < 0.005) return;
      (group ? group.boxes : out.boxes).push({ x0: q[0], y0: y0, z0: q[1], x1: q[2], y1: y1, z1: q[3], c: c });
    },
    /* a glowing box (screens, neon tubes): drawn unlit, in a raw colour */
    g: function (u0, y0, v0, u1, y1, v1, hex) { var q = rect(Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1)); out.glows.push({ x0: q[0], y0: y0, z0: q[1], x1: q[2], y1: y1, z1: q[3], color: hex }); },
    /* a small blinking indicator light: colour, blink rate (per second), phase, and pattern ('blink' on/off, 'pulse' smooth, 'flicker' random) */
    led: function (u, y, v, hex, rate, phase, pattern) { var p = tx(u, v); out.leds.push({ x: p[0], y: y, z: p[1], color: hex, rate: rate || 1, phase: phase || 0, pattern: pattern || 'blink' }); },
    /* a coloured light that actually lights the room around it */
    lamp: function (u, y, v, hex, intensity, dist, flicker) { var p = tx(u, v); out.lamps.push({ x: p[0], y: y, z: p[1], color: hex, intensity: intensity || 1, dist: dist || 6, flicker: !!flicker }); },
    /* a footprint nobody walks through (height for the camera checks) */
    s: function (u0, v0, u1, v1, h) { var q = rect(Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1)); out.solids.push({ x0: q[0], z0: q[1], x1: q[2], z1: q[3], y1: h || 1 }); },
    /* a painted sign (text drawn by the view): centre (u, y, v), size, facing the piece's front */
    sign: function (u, y, v, w, h, text, bg, fg) { var p = tx(u, v); out.signs.push({ x: p[0], y: y, z: p[1], w: w, h: h, ry: (fr.r & 3) * Math.PI / 2, text: text, bg: bg, fg: fg, group: group ? group.id : null }); },
    at: function (x, z, r) { var q = squeeze(x, z); fr = { x: q[0], z: q[1], r: r || 0 }; return K; },
    SX: SX,
    /* start / end a tall group (one fadeable mesh) */
    tall: function (id) { group = { id: id, boxes: [] }; out.tall.push(group); return K; },
    end: function () { group = null; return K; },
    pick: function (a) { return a[Math.floor(rng.next() * a.length) % a.length]; },
    range: function (a, b) { return a + rng.next() * (b - a); }
  };
  return K;
}

/* ---------------- the pieces (each draws at the current frame; front faces +v) ---------------- */
var P = {};

/* road barricade: yellow-black striped board on two A-frame legs, 2 m */
P.barricade = function (K, len) {
  var L = len || 2, h = L / 2, k, n = Math.round(L / 0.25);
  [-h + 0.1, h - 0.16].forEach(function (u) { K.b(u, 0, -0.25, u + 0.06, 0.95, -0.19, K.C.GREYP); K.b(u, 0, 0.19, u + 0.06, 0.95, 0.25, K.C.GREYP); K.b(u - 0.04, 0, -0.3, u + 0.1, 0.05, 0.3, K.C.DARK); });
  for (k = 0; k < n; k++) K.b(-h + k * L / n, 0.6, -0.04, -h + (k + 1) * L / n, 0.9, 0.04, k % 2 ? K.C.BLACK : K.C.YELLOW);
  K.b(-h, 0.35, -0.03, h, 0.45, 0.03, K.C.WHITE);
  K.s(-h, -0.3, h, 0.3, 1.0);
};
/* police tape between two cones */
P.tape = function (K, len) {
  var h = (len || 3) / 2;
  [-h, h].forEach(function (u) { K.b(u - 0.18, 0, -0.18, u + 0.18, 0.08, 0.18, K.C.SAFFRON); K.b(u - 0.12, 0.08, -0.12, u + 0.12, 0.35, 0.12, K.C.SAFFRON); K.b(u - 0.09, 0.35, -0.09, u + 0.09, 0.55, 0.09, K.C.WHITE); K.b(u - 0.06, 0.55, -0.06, u + 0.06, 0.75, 0.06, K.C.SAFFRON); });
  for (var k = 0; k < Math.round(h * 4); k++) K.b(-h + k * 0.5, 0.66, -0.01, -h + k * 0.5 + 0.5, 0.72, 0.01, k % 2 ? K.C.BLACK : K.C.YELLOW);
  K.s(-h - 0.2, -0.2, h + 0.2, 0.2, 0.8);
};
/* low brick wall with a plastered coping, `len` long */
P.lowWall = function (K, len, h, paint) {
  var L = len, H = h || 0.9, u, y, row = 0;
  for (y = 0; y < H - 0.12; y += 0.15, row++) for (u = -L / 2 + (row % 2 ? 0.14 : 0); u < L / 2; u += 0.28) K.b(Math.max(-L / 2, u), y, -0.12, Math.min(L / 2, u + 0.26), y + 0.13, 0.12, (row + Math.round(u * 3)) % 5 === 0 ? K.C.BRICK2 : K.C.BRICK);
  K.b(-L / 2 - 0.03, H - 0.12, -0.15, L / 2 + 0.03, H, 0.15, paint || K.C.CEMENT);
  K.s(-L / 2, -0.15, L / 2, 0.15, H);
};
/* steel railing with posts */
P.railing = function (K, len) {
  var L = len, u;
  for (u = -L / 2; u <= L / 2 + 0.01; u += 0.9) K.b(u - 0.03, 0, -0.03, u + 0.03, 0.95, 0.03, K.C.STEEL);
  K.b(-L / 2, 0.9, -0.035, L / 2, 0.96, 0.035, K.C.STEEL); K.b(-L / 2, 0.45, -0.02, L / 2, 0.5, 0.02, K.C.STEEL);
  K.s(-L / 2, -0.1, L / 2, 0.1, 1.0);
};
/* crates and sacks */
P.crate = function (K, s, c) {
  var w = (s || 0.6) / 2, h = s || 0.6, col = c === undefined ? K.C.WOOD : c;
  K.b(-w, 0, -w, w, h, w, col);
  K.b(-w - 0.01, 0, -w - 0.01, -w + 0.06, h, w + 0.01, K.C.WOOD2); K.b(w - 0.06, 0, -w - 0.01, w + 0.01, h, w + 0.01, K.C.WOOD2);
  K.b(-w, h * 0.45, -w - 0.015, w, h * 0.55, w + 0.015, K.C.WOOD2); K.b(-w - 0.01, h - 0.05, -w - 0.01, w + 0.01, h, w + 0.01, K.C.WOOD2);
  K.s(-w, -w, w, w, h);
};
P.sack = function (K, c) {
  var col = c === undefined ? K.C.KHAKI : c;
  K.b(-0.32, 0, -0.22, 0.32, 0.28, 0.22, col); K.b(-0.28, 0.28, -0.18, 0.28, 0.36, 0.18, col); K.b(-0.08, 0.36, -0.06, 0.08, 0.42, 0.06, col);
  K.b(-0.33, 0.12, -0.23, 0.33, 0.15, 0.23, K.C.BROWN);
};
P.drum = function (K, c) {
  var col = c === undefined ? K.C.BLUE : c, r = 0.29, k;
  for (k = 0; k < 3; k++) { var a = k * 0.07; K.b(-r + a, 0, -r + 0.2 - a * 2.6, r - a, 0.88, r - 0.2 + a * 2.6, col); K.b(-r + 0.2 - a * 2.6, 0, -r + a, r - 0.2 + a * 2.6, 0.88, r - a, col); }
  K.b(-r + 0.02, 0.28, -r + 0.02, r - 0.02, 0.32, r - 0.02, K.C.DARK); K.b(-r + 0.02, 0.58, -r + 0.02, r - 0.02, 0.62, r - 0.02, K.C.DARK);
  K.b(-0.24, 0.88, -0.24, 0.24, 0.9, 0.24, K.C.DARK); K.b(0.1, 0.9, 0.08, 0.16, 0.93, 0.14, K.C.GREY);
  K.s(-r, -r, r, r, 0.9);
};
P.tyres = function (K, n) {
  for (var k = 0; k < (n || 3); k++) { var y = k * 0.22; K.b(-0.36, y, -0.2, 0.36, y + 0.2, 0.2, K.C.CHAR); K.b(-0.2, y, -0.36, 0.2, y + 0.2, 0.36, K.C.CHAR); K.b(-0.14, y + 0.19, -0.14, 0.14, y + 0.21, 0.14, K.C.BLACK); }
  K.s(-0.36, -0.36, 0.36, 0.36, (n || 3) * 0.22);
};
P.cylinder = function (K) {                                        /* red gas cylinder */
  K.b(-0.15, 0, -0.15, 0.15, 0.62, 0.15, K.C.CRIMSON); K.b(-0.11, 0.62, -0.11, 0.11, 0.7, 0.11, K.C.CRIMSON); K.b(-0.05, 0.7, -0.05, 0.05, 0.78, 0.05, K.C.BRASS);
  K.b(-0.16, 0.05, -0.16, 0.16, 0.08, 0.16, K.C.DARK);
};
/* wooden bench */
P.bench = function (K, len) {
  var L = (len || 1.8) / 2;
  [-L + 0.1, L - 0.16].forEach(function (u) { K.b(u, 0, -0.2, u + 0.06, 0.42, -0.14, K.C.DARK); K.b(u, 0, 0.14, u + 0.06, 0.42, 0.2, K.C.DARK); K.b(u, 0.42, -0.24, u + 0.06, 0.9, -0.18, K.C.DARK); });
  for (var k = 0; k < 3; k++) K.b(-L, 0.42, -0.2 + k * 0.14, L, 0.46, -0.1 + k * 0.14, K.C.WOOD);
  K.b(-L, 0.62, -0.25, L, 0.7, -0.21, K.C.WOOD); K.b(-L, 0.8, -0.25, L, 0.88, -0.21, K.C.WOOD);
  K.s(-L, -0.25, L, 0.22, 0.9);
};
/* the handcart (thela): two big wheels, a plank bed, goods heaped on it */
P.cart = function (K, goods) {
  var g = goods || [K.C.RED, K.C.LIME, K.C.SAFFRON, K.C.YELLOW], i, j;
  K.b(-1.0, 0.62, -0.5, 1.0, 0.7, 0.5, K.C.WOOD); K.b(-1.0, 0.7, -0.52, 1.0, 0.84, -0.46, K.C.WOOD2); K.b(-1.0, 0.7, 0.46, 1.0, 0.84, 0.52, K.C.WOOD2);
  [-0.56, 0.56].forEach(function (v) { K.b(-0.08, 0.05, v - 0.04, 0.08, 0.6, v + 0.04, K.C.DARK); K.b(-0.3, 0.12, v - 0.05, 0.3, 0.5, v + 0.05, K.C.DARK); K.b(-0.22, 0, v - 0.05, 0.22, 0.6, v + 0.05, K.C.DARK); K.b(-0.04, 0.27, v - 0.07, 0.04, 0.35, v + 0.07, K.C.GREY); });
  K.b(1.0, 0.66, -0.35, 1.6, 0.72, -0.29, K.C.WOOD2); K.b(1.0, 0.66, 0.29, 1.6, 0.72, 0.35, K.C.WOOD2); K.b(-1.0, 0, -0.04, -0.9, 0.62, 0.04, K.C.WOOD2);
  for (i = 0; i < 6; i++) for (j = 0; j < 3; j++) { var c = g[(i + j * 2) % g.length], hh = 0.12 + ((i * 7 + j * 3) % 4) * 0.03; K.b(-0.9 + i * 0.3, 0.7, -0.4 + j * 0.27, -0.66 + i * 0.3, 0.7 + hh, -0.17 + j * 0.27, c); }
  K.s(-1.0, -0.56, 1.6, 0.56, 0.9);
};
/* a market stall: plank counter, goods, poles, a striped awning; front faces +v */
P.stall = function (K, w, kind) {
  var W = (w || 2.6) / 2, a = K.pick([K.C.RED, K.C.BLUE, K.C.SAFFRON, K.C.DGREEN, K.C.MAGENTA]), b2 = K.pick([K.C.WHITE, K.C.LEMON, K.C.OFFWHITE]), k, i;
  K.b(-W, 0, -0.5, W, 0.85, 0.45, K.C.WOOD2); K.b(-W - 0.05, 0.85, -0.55, W + 0.05, 0.92, 0.55, K.C.WOOD);
  for (i = 0; i < 6; i++) K.b(-W + 0.05, 0.1 + i * 0.12, 0.45, W - 0.05, 0.12 + i * 0.12, 0.47, K.C.WOOD);
  [-W, W - 0.08].forEach(function (u) { K.b(u, 0, -0.55, u + 0.08, 2.35, -0.47, K.C.DARK); K.b(u, 0, 0.47, u + 0.08, 2.1, 0.55, K.C.DARK); });
  var n = Math.round(W * 2 / 0.3);
  for (k = 0; k < n; k++) { var u0 = -W - 0.1 + k * (W * 2 + 0.2) / n, u1 = u0 + (W * 2 + 0.2) / n; K.b(u0, 2.35, -0.7, u1, 2.45, 0.2, k % 2 ? a : b2); K.b(u0, 2.12, 0.2, u1, 2.36, 0.85, k % 2 ? a : b2); K.b(u0, 2.02, 0.82, u1, 2.12, 0.9, k % 2 ? b2 : a); }
  var goods = kind === 'flowers' ? [K.C.MARIGOLD, K.C.LEMON, K.C.CRIMSON, K.C.WHITE, K.C.PINK] : kind === 'veg' ? [K.C.LIME, K.C.RED, K.C.DGREEN, K.C.SAFFRON, K.C.PURPLE] : kind === 'fruit' ? [K.C.YELLOW, K.C.RED, K.C.SAFFRON, K.C.LIME, K.C.LEAF] : kind === 'tea' ? [K.C.WHITE, K.C.BRASS, K.C.SAND] : BRIGHT;
  for (i = 0; i < Math.round(W * 2 / 0.3); i++) for (k = 0; k < 2; k++) { var c = goods[(i * 3 + k) % goods.length], gh = 0.1 + ((i + k * 2) % 3) * 0.05; K.b(-W + 0.08 + i * 0.3, 0.92, -0.42 + k * 0.42, -W + 0.32 + i * 0.3, 0.92 + gh, -0.1 + k * 0.42, c); }
  if (kind === 'flowers') for (i = 0; i < Math.round(W * 2 / 0.16); i++) K.b(-W + i * 0.16, 1.55 + (i % 3) * 0.05 - Math.sin(i / (W * 2 / 0.16) * Math.PI) * 0.25, 0.83, -W + i * 0.16 + 0.12, 1.67 + (i % 3) * 0.05 - Math.sin(i / (W * 2 / 0.16) * Math.PI) * 0.25, 0.92, i % 2 ? K.C.MARIGOLD : K.C.LEMON);
  if (kind === 'tea') { K.b(-0.5, 0.92, -0.25, -0.2, 1.25, 0.05, K.C.BRASS); K.b(-0.45, 1.25, -0.2, -0.25, 1.32, 0.0, K.C.DARK); for (i = 0; i < 5; i++) K.b(0.1 + i * 0.14, 0.92, 0.1, 0.18 + i * 0.14, 1.02, 0.18, K.C.WHITE); }
  else for (i = 0; i < 4; i++) K.b(-W + 0.25 + i * W * 0.5, 1.6, 0.5, -W + 0.35 + i * W * 0.5, 2.0 - (i % 2) * 0.15, 0.6, goods[i % goods.length]);   /* hanging goods */
  K.b(-0.06, 2.0, 0.4, 0.06, 2.12, 0.5, K.C.DARK); K.b(-0.12, 1.88, 0.38, 0.12, 2.0, 0.52, K.C.LEMON);   /* the bulb */
  K.s(-W, -0.55, W, 0.55, 2.4);
};
/* a parked auto-rickshaw: yellow and green, black canvas hood (front faces +v) */
P.auto = function (K, look) {
  var body = look ? K.C.DGREEN : K.C.YELLOW, top = K.C.BLACK, i;
  K.b(-0.62, 0.22, -1.3, 0.62, 0.62, 0.9, body); K.b(-0.62, 0.22, -1.3, 0.62, 0.3, 0.9, K.C.DGREEN);
  K.b(-0.55, 0.62, -1.25, 0.55, 1.02, -0.6, top); K.b(-0.6, 1.48, -1.3, 0.6, 1.62, 1.0, top); K.b(-0.56, 1.62, -1.2, 0.56, 1.68, 0.9, top);
  [-0.6, 0.54].forEach(function (u) { K.b(u, 0.62, -1.3, u + 0.06, 1.48, -1.24, top); K.b(u, 0.62, 0.92, u + 0.06, 1.48, 0.98, K.C.DARK); });
  K.b(-0.55, 0.62, 0.9, 0.55, 1.4, 0.96, K.C.STEEL); K.b(-0.5, 0.7, 0.96, 0.5, 1.35, 0.97, K.C.SLATE);
  K.b(-0.26, 0.2, 0.9, 0.26, 0.62, 1.25, body); K.b(-0.14, 0.45, 1.25, 0.14, 0.62, 1.32, K.C.LEMON); K.b(-0.3, 0.62, 1.0, 0.3, 0.7, 1.1, K.C.DARK);
  K.b(-0.5, 0.62, -0.5, 0.5, 0.75, 0.2, K.C.BROWN); K.b(-0.5, 0.75, -0.6, 0.5, 1.15, -0.5, K.C.BROWN);
  for (i = 0; i < 6; i++) K.b(-0.55 + i * 0.2, 1.38, 1.0, -0.47 + i * 0.2, 1.48, 1.02, i % 2 ? K.C.RED : K.C.LEMON);   /* the fringe */
  [[-0.66, -0.9], [0.5, -0.9]].forEach(function (q) { K.b(q[0], 0, q[1] - 0.25, q[0] + 0.16, 0.5, q[1] + 0.25, K.C.CHAR); K.b(q[0] + 0.02, 0.17, q[1] - 0.07, q[0] + 0.14, 0.33, q[1] + 0.07, K.C.GREY); });
  K.b(-0.08, 0, 0.95, 0.08, 0.46, 1.35, K.C.CHAR); K.b(-0.2, 0.35, -1.35, 0.2, 0.5, -1.3, K.C.WHITE); K.b(-0.1, 0.38, -1.36, 0.1, 0.47, -1.35, K.C.BLACK);
  K.s(-0.66, -1.32, 0.66, 1.35, 1.7);
};
/* a parked scooter */
P.scooter = function (K, c) {
  var col = c === undefined ? K.pick([K.C.RED, K.C.BLUE, K.C.WHITE, K.C.TEAL, K.C.GREYP]) : c;
  K.b(-0.07, 0, 0.55, 0.07, 0.42, 0.85, K.C.CHAR); K.b(-0.07, 0, -0.75, 0.07, 0.42, -0.45, K.C.CHAR);
  K.b(-0.2, 0.2, -0.75, 0.2, 0.62, -0.05, col); K.b(-0.18, 0.62, -0.7, 0.18, 0.72, -0.1, K.C.BLACK);
  K.b(-0.18, 0.18, -0.05, 0.18, 0.26, 0.5, K.C.DARK); K.b(-0.16, 0.2, 0.45, 0.16, 0.95, 0.6, col);
  K.b(-0.05, 0.85, 0.6, 0.05, 1.05, 0.68, K.C.DARK); K.b(-0.35, 1.02, 0.6, 0.35, 1.07, 0.66, K.C.DARK); K.b(-0.09, 0.9, 0.66, 0.09, 1.0, 0.72, K.C.LEMON);
  K.b(-0.28, 1.07, 0.6, -0.22, 1.18, 0.62, K.C.GREY); K.b(0.22, 1.07, 0.6, 0.28, 1.18, 0.62, K.C.GREY);
  K.b(-0.1, 0.0, 0.0, -0.06, 0.2, 0.04, K.C.GREY);
  K.s(-0.22, -0.78, 0.22, 0.88, 1.1);
};
/* a lamp post with a bracket lamp */
P.lamp = function (K, h) {
  var H = h || 5.2;
  K.b(-0.18, 0, -0.18, 0.18, 0.4, 0.18, K.C.CONC2); K.b(-0.07, 0.4, -0.07, 0.07, H, 0.07, K.C.STEEL);
  K.b(-0.04, H - 0.1, -0.04, 0.04, H - 0.02, 1.1, K.C.STEEL); K.b(-0.16, H - 0.22, 0.85, 0.16, H - 0.08, 1.25, K.C.DARK); K.b(-0.13, H - 0.26, 0.88, 0.13, H - 0.22, 1.22, K.C.LEMON);
  K.out.lights.push({ x: 0, y: H - 0.3, z: 0 });
  K.s(-0.18, -0.18, 0.18, 0.18, H);
};
/* a voxel tree: trunk and a stack of leaf blocks (a neem / peepal) */
P.tree = function (K, h) {
  var H = h || 5, rng = K.rng, i, j, k;
  K.b(-0.22, 0, -0.22, 0.22, H * 0.55, 0.22, K.C.WOOD2); K.b(-0.12, H * 0.4, -0.5, 0.12, H * 0.55, 0.12, K.C.WOOD2);
  K.b(-0.5, 0, -0.5, 0.5, 0.35, 0.5, K.C.BRICK); K.b(-0.42, 0.35, -0.42, 0.42, 0.4, 0.42, K.C.DIRT);
  for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) for (k = 0; k < 3; k++) {
    if (Math.abs(i) + Math.abs(j) + k > 4 || rng.next() < 0.15) continue;
    var y = H * 0.5 + k * 0.6 + (Math.abs(i) + Math.abs(j)) * -0.15;
    K.b(i * 0.6 - 0.32, y, j * 0.6 - 0.32, i * 0.6 + 0.32, y + 0.62, j * 0.6 + 0.32, (i + j + k) % 3 ? K.C.LEAF : K.C.DGREEN);
  }
  K.s(-0.5, -0.5, 0.5, 0.5, H);
};
/* a building front: plastered wall, shuttered shop on the ground, windows with sills and grilles, a balcony, AC units, a water tank.
   w wide, h tall, d deep; the front faces +v at v = 0 */
P.building = function (K, w, h, d, opt) {
  opt = opt || {};
  var W = w / 2, D = d || 6, H = h, wall = opt.wall === undefined ? K.pick(WALLS) : opt.wall, trim = opt.trim === undefined ? K.C.OFFWHITE : opt.trim, u, f, floors = Math.max(1, Math.floor((H - 0.4) / 3));
  K.b(-W, 0, -D, W, H, 0, wall);
  K.b(-W - 0.05, H, -D - 0.05, W + 0.05, H + 0.25, 0.08, trim);                                   /* parapet */
  for (u = -W + 0.2; u < W - 0.2; u += 0.5) K.b(u, H + 0.25, -0.05, u + 0.12, H + 0.6, 0.06, trim);
  K.b(-W, 2.9, 0, W, 3.05, 0.12, trim);                                                           /* floor band */
  if (opt.shop !== false) {                                                                       /* the shop: shutter half up, goods inside */
    var sc = K.pick([K.C.GREYP, K.C.BLUE, K.C.TEAL, K.C.SAFFRON, K.C.CRIMSON]);
    for (u = -W + 0.3; u + 2.4 <= W - 0.2; u += 2.8) {
      K.b(u, 0, -0.02, u + 2.4, 2.6, 0.03, K.C.DARK);
      for (var k = 0; k < 6; k++) K.b(u, 1.6 + k * 0.17, 0.03, u + 2.4, 1.72 + k * 0.17, 0.06, sc);
      K.b(u + 0.1, 0, 0.03, u + 2.3, 0.7, 0.4, K.C.WOOD2);
      for (k = 0; k < 6; k++) K.b(u + 0.2 + k * 0.35, 0.7, 0.05, u + 0.45 + k * 0.35, 0.95 + (k % 3) * 0.08, 0.3, K.pick(BRIGHT));
    }
    if (opt.board) K.sign(0, 2.6 + 0.0 + 0.0, 0.14, Math.min(w - 0.6, 6), 0.55, opt.board, opt.boardBg || '#c2306f', opt.boardFg || '#ffffff');
  }
  for (f = 1; f < floors; f++) {
    var y = f * 3 + 0.6;
    for (u = -W + 0.6; u + 1.0 <= W - 0.4; u += 1.7) {
      K.b(u, y, -0.02, u + 1.0, y + 1.3, 0.02, K.C.SLATE);
      K.b(u - 0.08, y - 0.1, 0, u + 1.08, y, 0.12, trim); K.b(u - 0.08, y + 1.3, 0, u + 1.08, y + 1.4, 0.08, trim);
      for (var g = 1; g < 4; g++) K.b(u + g * 0.25 - 0.015, y, 0.02, u + g * 0.25 + 0.015, y + 1.3, 0.05, K.C.DARK);
      if ((f + Math.round(u)) % 3 === 0) { K.b(u + 0.1, y - 0.6, 0, u + 0.9, y - 0.15, 0.4, K.C.OFFWHITE); K.b(u + 0.15, y - 0.55, 0.4, u + 0.85, y - 0.2, 0.42, K.C.GREY); }   /* AC unit */
    }
    if (f === 1 && opt.balcony !== false) {                                                       /* a balcony with railing and washing */
      K.b(-W * 0.6, f * 3, 0, W * 0.6, f * 3 + 0.15, 1.0, trim);
      for (u = -W * 0.6; u <= W * 0.6; u += 0.2) K.b(u, f * 3 + 0.15, 0.95, u + 0.04, f * 3 + 1.05, 1.0, K.C.DARK);
      K.b(-W * 0.6, f * 3 + 1.0, 0.95, W * 0.6, f * 3 + 1.06, 1.0, K.C.DARK);
      for (u = -W * 0.5; u < W * 0.5; u += 0.55) K.b(u, f * 3 + 0.55, 0.9, u + 0.4, f * 3 + 1.0, 0.92, K.pick(BRIGHT));
    }
  }
  if (opt.tank !== false) { K.b(-W + 0.6, H + 0.25, -D + 1, -W + 1.6, H + 1.25, -D + 2, K.C.CHAR); K.b(-W + 0.65, H + 1.25, -D + 1.05, -W + 1.55, H + 1.32, -D + 1.95, K.C.CHAR); }
  K.s(-W, -D, W, 0, H);
};
/* steps: n steps rising toward -v */
P.steps = function (K, w, n, c) {
  for (var i = 0; i < n; i++) K.b(-w / 2, 0, -0.35 * (i + 1) - 0.0, w / 2, 0.16 * (i + 1), -0.35 * i, c === undefined ? K.C.STONE : c);
};
/* hanging marigold garland between two points along u at height y */
P.garland = function (K, u0, u1, y, v, sag) {
  var n = Math.max(4, Math.round(Math.abs(u1 - u0) / 0.12));
  for (var i = 0; i <= n; i++) { var t = i / n, u = u0 + (u1 - u0) * t, yy = y - Math.sin(t * Math.PI) * (sag || 0.4); K.b(u - 0.05, yy - 0.05, v - 0.05, u + 0.05, yy + 0.05, v + 0.05, i % 3 ? K.C.MARIGOLD : K.C.CRIMSON); }
};
/* wires between two poles */
P.wire = function (K, u0, u1, y, v) { var n = Math.round(Math.abs(u1 - u0) / 0.5); for (var i = 0; i < n; i++) { var t = i / n, yy = y - Math.sin(t * Math.PI) * 0.35; K.b(u0 + (u1 - u0) * t, yy, v - 0.015, u0 + (u1 - u0) * (t + 1 / n), yy + 0.03, v + 0.015, K.C.BLACK); } };
/* an electric pole with a transformer box */
P.pole = function (K, h) {
  var H = h || 7;
  K.b(-0.1, 0, -0.1, 0.1, H, 0.1, K.C.CONC2); K.b(-0.9, H - 0.6, -0.05, 0.9, H - 0.5, 0.05, K.C.DARK);
  for (var k = -1; k <= 1; k++) K.b(k * 0.7 - 0.04, H - 0.5, -0.04, k * 0.7 + 0.04, H - 0.4, 0.04, K.C.WHITE);
  K.b(-0.3, H * 0.45, 0.1, 0.3, H * 0.45 + 0.6, 0.45, K.C.GREYP);
  K.s(-0.12, -0.12, 0.12, 0.12, H);
};
/* poster wall strip: a run of bright posters at eye height */
P.posters = function (K, len, y) {
  for (var u = -len / 2; u < len / 2 - 0.5; u += 0.75) K.b(u, (y || 1.0), 0, u + 0.6, (y || 1.0) + 0.85, 0.02, K.pick([K.C.MAGENTA, K.C.LEMON, K.C.SAFFRON, K.C.TEAL, K.C.RED, K.C.WHITE, K.C.LEAF]));
};
/* a paved floor: tiles in two tones (or stone flags), drawn as thin slabs */
P.floor = function (K, x0, z0, x1, z1, a, b, s) {
  var S = s || 1.0, x, z;
  for (x = x0; x < x1 - 0.01; x += S) for (z = z0; z < z1 - 0.01; z += S) {
    var c = ((Math.round((x - x0) / S) + Math.round((z - z0) / S)) % 2) ? a : b;
    K.b(x + 0.02, 0, z + 0.02, Math.min(x1, x + S) - 0.02, 0.025, Math.min(z1, z + S) - 0.02, c);
  }
};

/* a ground that is not tiles: one base surface, then big slabs or worn patches in a few close shades (rng-picked), so a forecourt reads
   as poured concrete, a road as asphalt, a yard as slabs */
P.slabs = function (K, x0, z0, x1, z1, cols, s) {
  var S = s || 2.0, x, z; K.at(0, 0, 0);
  for (x = x0; x < x1 - 0.01; x += S) for (z = z0; z < z1 - 0.01; z += S) K.b(x + 0.03, 0, z + 0.03, Math.min(x1, x + S) - 0.03, 0.025, Math.min(z1, z + S) - 0.03, K.pick(cols));
};
P.asphalt = function (K, x0, z0, x1, z1, base, patch, n) {
  K.at(0, 0, 0); K.b(x0, 0, z0, x1, 0.02, z1, base);
  for (var i = 0; i < (n || 18); i++) { var px = K.range(x0, x1 - 1.5), pz = K.range(z0, z1 - 1.2); K.b(px, 0.02, pz, px + K.range(0.8, 2.6), 0.026, pz + K.range(0.6, 1.8), patch); }
};
/* a fuel pump: base, body with a lit display, the hose and nozzle on its hook */
P.pump = function (K, c) {
  K.b(-0.42, 0, -0.32, 0.42, 0.18, 0.32, C.CEMENT); K.b(-0.36, 0.18, -0.26, 0.36, 1.85, 0.26, C.OFFWHITE); K.b(-0.37, 1.85, -0.27, 0.37, 2.1, 0.27, c || C.NAVY);
  K.b(-0.26, 1.2, 0.26, 0.26, 1.6, 0.29, C.SLATE); K.b(-0.2, 1.3, 0.29, 0.2, 1.45, 0.3, C.LIME); K.b(-0.37, 0.5, -0.27, 0.37, 0.62, 0.27, c || C.NAVY);
  K.b(0.36, 0.95, -0.06, 0.48, 1.35, 0.06, C.DARK); K.b(0.44, 0.35, -0.04, 0.48, 0.95, 0.04, C.DARK); K.b(0.36, 0.3, -0.04, 0.46, 0.36, 0.04, C.DARK);
  K.s(-0.42, -0.32, 0.42, 0.32, 2.1);
};

/* scattered floor detail: cracks, oil stains, puddles, leaves, litter, a manhole; flat slabs, never in the way */
P.scatter = function (K, x0, z0, x1, z1, n, kinds) {
  var i, ks = kinds || ['crack', 'stain', 'leaf', 'paper', 'puddle'];
  K.at(0, 0, 0);
  for (i = 0; i < n; i++) {
    var x = K.range(x0, x1), z = K.range(z0, z1), k = ks[i % ks.length], a;
    if (k === 'crack') { for (a = 0; a < 5; a++) { var dx = K.range(-0.25, 0.25); K.b(x, 0.026, z, x + 0.35 + dx, 0.03, z + 0.04, K.C.STONE3); x += 0.35 + dx; z += K.range(-0.15, 0.15); } }
    else if (k === 'stain') K.b(x, 0.026, z, x + K.range(0.5, 1.2), 0.029, z + K.range(0.4, 0.9), K.C.CHAR);
    else if (k === 'puddle') { K.b(x, 0.026, z, x + K.range(0.8, 1.6), 0.03, z + K.range(0.5, 1.0), K.C.BLUEGREY); }
    else if (k === 'leaf') { for (a = 0; a < 6; a++) { var lx = x + K.range(-0.6, 0.6), lz = z + K.range(-0.6, 0.6); K.b(lx, 0.026, lz, lx + 0.12, 0.034, lz + 0.08, a % 2 ? K.C.OLIVE : K.C.OCHRE); } }
    else if (k === 'paper') { for (a = 0; a < 3; a++) { var px = x + K.range(-0.5, 0.5), pz = z + K.range(-0.5, 0.5); K.b(px, 0.026, pz, px + 0.16, 0.036, pz + 0.12, a % 2 ? K.C.OFFWHITE : K.C.PEACH); } }
    else if (k === 'manhole') { K.b(x - 0.4, 0.026, z - 0.4, x + 0.4, 0.04, z + 0.4, K.C.STONE3); for (a = 0; a < 4; a++) K.b(x - 0.35, 0.04, z - 0.3 + a * 0.18, x + 0.35, 0.045, z - 0.26 + a * 0.18, K.C.CHAR); }
    else if (k === 'marigold') { for (a = 0; a < 8; a++) { var mx = x + K.range(-0.5, 0.5), mz = z + K.range(-0.5, 0.5); K.b(mx, 0.026, mz, mx + 0.08, 0.07, mz + 0.08, a % 3 ? K.C.MARIGOLD : K.C.CRIMSON); } }
    else if (k === 'brick') { K.b(x, 0, z, x + 0.24, 0.1, z + 0.12, K.C.BRICK); K.b(x + 0.3, 0, z + 0.1, x + 0.54, 0.1, z + 0.22, K.C.BRICK2); }
  }
};

module.exports = { createBuilder: createBuilder, squeeze: squeeze, SX: SX, SZ: SZ, P: P, C: C, WALLS: WALLS, BRIGHT: BRIGHT };
