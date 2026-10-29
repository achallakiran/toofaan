/* sim: the character of the city. Takes a finished chunk spec and adds, deterministically from (seed, cx, cz): broken road (potholes, patches,
   cracks, speed breakers, manholes), shopfronts with shutters, signboards, awnings, balconies, laundry, water tanks, hoardings, electric poles with
   wires, vendor stalls and rubble. Everything is plain boxes in chunk-local metres, plus `hazards` the bike can feel (potholes, speed breakers).
   Works in a road-aligned frame (u along the road, v across it) and maps back to x,z, so east-west and north-south roads share the code. */
'use strict';

var rngMod = require('../core/rng');

/* palette indices (see data/config.js) */
var P = { ROAD: 1, DARK_PATCH: 12, GREY_PATCH: 13, YELLOW: 14, BLACK: 15, SAFFRON: 16, MAGENTA: 17, TEAL: 18, LIME: 19, BLUE: 20, RED: 21, CREAM: 22, PURPLE: 23,
          DIRT: 24, WHITE: 25, RUST: 26, PINK: 27, GREY: 0, CONCRETE: 8 };
var BRIGHT = [P.SAFFRON, P.MAGENTA, P.TEAL, P.LIME, P.BLUE, P.RED, P.YELLOW, P.PURPLE, P.PINK];
var SHUTTERS = [P.SAFFRON, P.BLUE, P.TEAL, P.RED, P.LIME, P.CREAM, P.MAGENTA, P.GREY];
var GOODS = [P.RED, P.SAFFRON, P.LIME, P.YELLOW, P.MAGENTA, P.TEAL];

var LIM = require('../data/config').CHUNK_SIZE / 2;
function pick(rng, a) { return a[Math.floor(rng.next() * a.length) % a.length]; }

function frame(spec, axis) {                                  /* axis 'x': road runs along x (u = x, v = z); 'z': u = z, v = x */
  function B(u0, y0, v0, u1, y1, v1, c) {
    var a = Math.max(-LIM, Math.min(u0, u1)), b = Math.min(LIM, Math.max(u0, u1)), d = Math.max(-LIM, Math.min(v0, v1)), e = Math.min(LIM, Math.max(v0, v1));
    if (b - a < 0.02 || e - d < 0.02) return;
    spec.boxes.push(axis === 'x' ? { x0: a, y0: y0, z0: d, x1: b, y1: y1, z1: e, c: c, d: 1 } : { x0: d, y0: y0, z0: a, x1: e, y1: y1, z1: b, c: c, d: 1 });
  }
  function S(u0, v0, u1, v1, y1) {                              /* a solid footprint */
    var a = Math.min(u0, u1), b = Math.max(u0, u1), d = Math.min(v0, v1), e = Math.max(v0, v1);
    spec.solids.push(axis === 'x' ? { x0: a, z0: d, x1: b, z1: e, y1: y1 } : { x0: d, z0: a, x1: e, z1: b, y1: y1 });
  }
  function H(k, u0, v0, u1, v1) {
    var a = Math.min(u0, u1), b = Math.max(u0, u1), d = Math.min(v0, v1), e = Math.max(v0, v1);
    spec.hazards.push(axis === 'x' ? { k: k, x0: a, z0: d, x1: b, z1: e } : { k: k, x0: d, z0: a, x1: e, z1: b });
  }
  return { B: B, S: S, H: H };
}

/* the road surface: the part that makes it feel like a road in India and not a test track */
function roughRoad(f, rng, half, len, withBreaker) {
  var i, n, u, v, w, d;
  n = rng.int(2, 4);                                           /* potholes: dark hollows with a ragged lip of broken tar */
  for (i = 0; i < n; i++) {
    u = rng.range(-len, len); v = rng.range(-half + 1, half - 1); w = rng.range(0.9, 1.9); d = rng.range(0.8, 1.6);
    f.B(u - w / 2 - 0.18, 0.02, v - d / 2 - 0.18, u + w / 2 + 0.18, 0.045, v + d / 2 + 0.18, P.GREY_PATCH);
    f.B(u - w / 2, 0.045, v - d / 2, u + w / 2, 0.055, v + d / 2, P.DARK_PATCH);
    if (rng.chance(0.6)) f.B(u + w / 2 + 0.2, 0.02, v - 0.1, u + w / 2 + 0.45, 0.1, v + 0.15, P.GREY_PATCH);          /* a lump of tar thrown out */
    f.H('pot', u - w / 2, v - d / 2, u + w / 2, v + d / 2);
  }
  n = rng.int(1, 3);                                           /* patches: newer tar laid over old */
  for (i = 0; i < n; i++) {
    u = rng.range(-len, len); v = rng.range(-half + 1.5, half - 1.5); w = rng.range(2, 5); d = rng.range(1.2, 2.6);
    f.B(u - w / 2, 0.02, v - d / 2, u + w / 2, 0.034, v + d / 2, rng.chance(0.5) ? P.DARK_PATCH : P.GREY_PATCH);
  }
  n = rng.int(3, 5);                                           /* cracks */
  for (i = 0; i < n; i++) { u = rng.range(-len, len); v = rng.range(-half + 0.5, half - 0.5); w = rng.range(1.5, 4.5); f.B(u, 0.02, v, u + w, 0.03, v + 0.07, P.BLACK); }
  if (rng.chance(0.7)) { u = rng.range(-len, len); v = rng.range(-half + 1, half - 1); f.B(u - 0.4, 0.02, v - 0.4, u + 0.4, 0.05, v + 0.4, P.GREY); f.B(u - 0.25, 0.05, v - 0.25, u + 0.25, 0.058, v + 0.25, P.RUST); }   /* manhole */
  if (withBreaker && rng.chance(0.55)) {                       /* a speed breaker across the whole road, striped */
    u = rng.range(-len + 4, len - 4);
    f.B(u - 0.4, 0.02, -half, u + 0.4, 0.14, half, P.GREY_PATCH);
    for (i = -half; i < half; i += 1.2) f.B(u - 0.4, 0.14, i, u + 0.4, 0.155, i + 0.6, P.YELLOW);
    f.H('brk', u - 0.4, -half, u + 0.4, half);
  }
}

function signboard(f, rng, u0, u1, y0, fv, out, thick) {
  var c = pick(rng, BRIGHT), w = u1 - u0, k, x = u0 + 0.3;
  f.B(u0, y0, fv, u1, y0 + 0.9, fv + out * thick, c);
  for (k = 0; k < 4 && x < u1 - 0.9; k++) { var lw = rng.range(0.35, 0.9); f.B(x, y0 + 0.2, fv + out * thick, x + lw, y0 + 0.7, fv + out * (thick + 0.04), c === P.CREAM || c === P.YELLOW ? P.BLACK : P.CREAM); x += lw + 0.25; }
}

/* one building's face toward the street (or alley) */
function facade(f, rng, b, side, shops) {
  var out = -side, fv = side > 0 ? b.v0 : b.v1, w = b.u1 - b.u0, h = b.h, k, n, u, y;
  if (w < 3.5) return;
  if (shops) {
    n = Math.max(1, Math.floor(w / 2.8)); var bw = (w - 0.8) / n;
    for (k = 0; k < n; k++) {
      var a = b.u0 + 0.4 + k * bw + 0.1, e = a + bw - 0.2;
      if (rng.chance(0.65)) f.B(a, 0, fv, e, 2.5, fv + out * 0.14, pick(rng, SHUTTERS));
      else { f.B(a, 0, fv, e, 2.5, fv + out * 0.12, P.BLACK); f.B(a + 0.2, 0.8, fv + out * 0.12, e - 0.2, 1.3, fv + out * 0.5, pick(rng, GOODS)); }
    }
    signboard(f, rng, b.u0 + 0.3, b.u1 - 0.3, 2.65, fv, out, 0.22);
    if (rng.chance(0.55)) { var c1 = pick(rng, BRIGHT), c2 = pick(rng, BRIGHT); f.B(b.u0 + 0.5, 2.3, fv, b.u0 + 0.5 + (w - 1) / 2, 2.45, fv + out * 1.15, c1); f.B(b.u0 + 0.5 + (w - 1) / 2, 2.3, fv, b.u1 - 0.5, 2.45, fv + out * 1.15, c2); }
  }
  f.B(b.u0 - 0.1, h, fv - out * 0.05, b.u1 + 0.1, h + 0.55, fv + out * 0.3, P.CONCRETE);                                                  /* parapet */
  f.B(b.u0 - 0.05, shops ? 3.7 : 2.6, fv, b.u1 + 0.05, shops ? 3.95 : 2.85, fv + out * 0.12, pick(rng, BRIGHT));                              /* a painted band above the shops */
  var rows = 0; y = shops ? 4.2 : 3.0;
  while (y + 2 < h && rows < 3) {
    n = Math.min(3, Math.floor(w / 2.6));
    for (k = 0; k < n; k++) {
      u = b.u0 + (k + 0.5) * w / n;
      f.B(u - 0.5, y, fv, u + 0.5, y + 1.3, fv + out * 0.07, P.BLACK);
      if (rng.chance(0.3)) f.B(u - 0.6, y - 0.1, fv, u + 0.6, y, fv + out * 0.22, P.CREAM);
    }
    if (rng.chance(0.45)) {                                                 /* balcony with railing, sometimes a line of washing */
      u = b.u0 + rng.range(1, w - 1); f.B(u - 0.8, y - 0.15, fv, u + 0.8, y, fv + out * 0.9, P.CONCRETE); f.B(u - 0.8, y + 0.9, fv + out * 0.85, u + 0.8, y + 1.0, fv + out * 0.9, P.BLACK);
      if (rng.chance(0.5)) f.B(u - 0.5, y + 0.35, fv + out * 0.8, u + 0.5, y + 0.9, fv + out * 0.84, pick(rng, BRIGHT));
    }
    if (rng.chance(0.25)) { u = b.u0 + rng.range(0.6, w - 0.6); f.B(u - 0.3, y + 0.2, fv, u + 0.3, y + 0.7, fv + out * 0.45, P.GREY_PATCH); }   /* AC unit */
    y += 3.2; rows++;
  }
  if (rng.chance(0.6)) { u = b.u0 + rng.range(0.8, Math.max(1, w - 2.2)); f.B(u, h, b.vm - 0.6, u + 1.2, h + 1.2, b.vm + 0.6, P.BLACK); }                /* water tank */
  if (rng.chance(0.28) && h > 7) {                                                                                                                          /* rooftop hoarding */
    var c = pick(rng, BRIGHT), hw = Math.min(w - 0.6, 6);
    f.B(b.u0 + 0.3, h, fv + out * 0.1, b.u0 + 0.3 + hw, h + 2.6, fv + out * 0.34, c); f.B(b.u0 + 0.7, h + 0.5, fv + out * 0.34, b.u0 + 0.3 + hw - 0.4, h + 2.0, fv + out * 0.38, pick(rng, [P.CREAM, P.WHITE, P.YELLOW]));
  }
  if (rng.chance(0.3)) { u = b.u0 + rng.range(0.5, w - 0.5); f.B(u, h, b.vm, u + 0.08, h + 2.2, b.vm + 0.08, P.BLACK); }                                  /* antenna */
}

/* trees, roadside shrines and strings of bunting: the life between the buildings */
function trees(f, rng, half, len) {
  var u, side, k;
  for (side = -1; side <= 1; side += 2) for (u = -len + rng.range(1, 5); u < len; u += rng.range(9, 15)) {
    if (rng.chance(0.35)) continue;
    var v = side * (half + 1.55), h = rng.range(2.4, 3.4), g = pick(rng, [6, 36, 37, 6]);
    f.B(u - 0.14, 0, v - 0.14, u + 0.14, h, v + 0.14, 7); f.S(u - 0.14, v - 0.14, u + 0.14, v + 0.14, h);
    f.B(u - 1.3, h, v - 1.3, u + 1.3, h + 1.0, v + 1.3, g); f.B(u - 1.0, h + 1.0, v - 1.0, u + 1.0, h + 1.8, v + 1.0, g); f.B(u - 0.55, h + 1.8, v - 0.55, u + 0.55, h + 2.3, v + 0.55, g);
    f.B(u - 0.4, 0, v - 0.4, u + 0.4, 0.25, v + 0.4, P.CONCRETE);
  }
  if (rng.chance(0.55)) {
    var us = rng.range(-len + 3, len - 3), sv = rng.chance(0.5) ? 1 : -1, vs = sv * (half + 2.0);
    f.B(us - 0.6, 0, vs - 0.6, us + 0.6, 0.5, vs + 0.6, P.CONCRETE); f.B(us - 0.45, 0.5, vs - 0.45, us + 0.45, 1.5, vs + 0.45, P.SAFFRON); f.B(us - 0.55, 1.5, vs - 0.55, us + 0.55, 1.7, vs + 0.55, P.RED);
    f.B(us - 0.25, 1.7, vs - 0.25, us + 0.25, 2.2, vs + 0.25, P.SAFFRON); f.B(us - 0.05, 2.2, vs - 0.05, us + 0.05, 2.9, vs + 0.05, P.BLACK); f.B(us + 0.05, 2.5, vs - 0.03, us + 0.55, 2.9, vs + 0.03, P.RED);
    f.B(us - 0.4, 0.5, vs + sv * -0.5, us + 0.4, 0.62, vs - sv * 0.45, 29); f.S(us - 0.6, vs - 0.6, us + 0.6, vs + 0.6, 2.9);
  }
}
function bunting(f, rng, half) {
  var n = rng.int(1, 2), i, k;
  for (i = 0; i < n; i++) {
    var u = rng.range(-12, 12), cols = [P.SAFFRON, P.MAGENTA, P.TEAL, P.LIME, P.YELLOW, P.RED];
    f.B(u, 5.4, -half - 1.7, u + 0.05, 5.45, half + 1.9, P.BLACK);
    for (k = -half - 1; k < half + 1; k += 0.8) { var sag = 0.25 * Math.abs(Math.sin((k + half) * 0.26)); f.B(u - 0.12, 5.4 - 0.4 - sag, k, u + 0.17, 5.4 - sag, k + 0.4, cols[Math.floor((k + 20) / 0.8) % 6]); }
  }
}

function poles(f, rng, half, len) {
  var u, side;
  for (u = -len + rng.range(2, 6); u < len; u += rng.range(16, 22)) {
    for (side = -1; side <= 1; side += 2) {
      var v = side * (half + 1.7);
      f.B(u, 0, v, u + 0.22, 6.2, v + 0.22, P.GREY); f.B(u - 0.6, 5.9, v - 0.02, u + 0.82, 6.05, v + 0.24, P.BLACK);
      f.S(u, v, u + 0.22, v + 0.22, 6.2);
    }
    f.B(u + 0.04, 5.55, -half - 1.7, u + 0.1, 5.62, half + 1.9, P.BLACK);                          /* the cable across the road */
    f.B(u + 0.08, 5.85, -half - 1.7, u + 0.14, 5.9, half + 1.9, P.BLACK);
  }
}

function stalls(f, rng, half, len) {
  var n = rng.int(1, 3), i;
  for (i = 0; i < n; i++) {
    var u = rng.range(-len + 2, len - 2), side = rng.chance(0.5) ? 1 : -1, v = side * (half + 2.0), c = pick(rng, BRIGHT);
    f.B(u - 0.8, 0, v - 0.5, u + 0.8, 0.9, v + 0.5, P.RUST);
    f.B(u - 0.7, 0.9, v - 0.4, u + 0.7, 1.2, v + 0.4, pick(rng, GOODS)); f.B(u - 0.2, 1.2, v - 0.15, u + 0.2, 1.5, v + 0.15, pick(rng, GOODS));
    f.B(u - 0.04, 1.2, v + side * 0.45, u + 0.04, 2.2, v + side * 0.5, P.BLACK);
    f.B(u - 1.1, 2.2, v - 0.9, u + 1.1, 2.35, v + 0.9, c);
    f.S(u - 0.8, v - 0.5, u + 0.8, v + 0.5, 1.2);
  }
  if (rng.chance(0.6)) { var uu = rng.range(-len + 2, len - 2), sv = rng.chance(0.5) ? 1 : -1, vv = sv * (half + 0.8); f.B(uu - 0.9, 0, vv - 0.6, uu + 0.9, 0.5, vv + 0.6, P.DIRT); f.B(uu - 0.5, 0.5, vv - 0.35, uu + 0.5, 0.85, vv + 0.35, P.DIRT); }     /* sand, rubble */
}

/* roadAxis: 'x' or 'z'; solids of the finished spec give the buildings */
function decorate(spec, seed, cx, cz, kind) {
  var rng = rngMod.createRng(rngMod.hash32(seed ^ 0x6a09e667, cx, cz)), axis = kind === 'roadV' ? 'z' : 'x', f = frame(spec, axis), half = 6, len = 14;
  spec.hazards = spec.hazards || [];
  if (kind === 'block') {                                       /* dense blocks: the alley between the two rows */
    var fb = frame(spec, 'x'), sol = spec.solids.slice(0), i;
    for (i = 0; i < sol.length; i++) { var q = sol[i], side = q.z0 > 0 ? 1 : -1; if (Math.abs(side > 0 ? q.z0 : q.z1) > 3) continue; facade(fb, rng, { u0: q.x0, u1: q.x1, v0: q.z0, v1: q.z1, vm: (q.z0 + q.z1) / 2, h: q.y1 }, side, false); }
    return spec;
  }
  var bl = spec.solids.filter(function (q) { return (axis === 'x' ? Math.min(Math.abs(q.z0), Math.abs(q.z1)) : Math.min(Math.abs(q.x0), Math.abs(q.x1))) >= 8 && q.y1 > 3; }), j;
  roughRoad(f, rng, half, len, kind !== 'cross');
  for (j = 0; j < bl.length; j++) {
    var s = bl[j], u0 = axis === 'x' ? s.x0 : s.z0, u1 = axis === 'x' ? s.x1 : s.z1, v0 = axis === 'x' ? s.z0 : s.x0, v1 = axis === 'x' ? s.z1 : s.x1;
    facade(f, rng, { u0: u0, u1: u1, v0: v0, v1: v1, vm: (v0 + v1) / 2, h: s.y1 }, v0 > 0 ? 1 : -1, true);
  }
  poles(f, rng, half, len); stalls(f, rng, half, len); trees(f, rng, half, len); bunting(f, rng, half);
  return spec;
}

/* an intersection: worn crossings, signal heads on the corner posts */
function decorateCross(spec, seed, cx, cz) {
  var rng = rngMod.createRng(rngMod.hash32(seed ^ 0x3c6ef372, cx, cz)), f = frame(spec, 'x');
  spec.hazards = spec.hazards || [];
  roughRoad(f, rng, 5.5, 5, false);
  [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]].forEach(function (q) {
    f.B(q[0] - 0.12, 4.2, q[1] - 0.05, q[0] + 0.3, 5.5, q[1] + 0.23, P.BLACK);
    f.B(q[0] - 0.05, 5.0, q[1] + 0.23, q[0] + 0.23, 5.28, q[1] + 0.27, P.RED); f.B(q[0] - 0.05, 4.6, q[1] + 0.23, q[0] + 0.23, 4.88, q[1] + 0.27, P.LIME);
  });
  return spec;
}

module.exports = { decorate: decorate, decorateCross: decorateCross, P: P };
