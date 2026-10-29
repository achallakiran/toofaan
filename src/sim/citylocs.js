/* sim: fight locations. A location is a set piece built onto a straight road chunk: the row of buildings on one side is cleared for a yard
   (market lane, petrol pump, bus stand, construction site, temple square, warehouse yard, slum lane) or the road itself is dressed (railway
   crossing, toll plaza, flyover underpass). `typeAt` is a pure hash, so the world can look for the nearest location without building chunks. */
'use strict';

var rngMod = require('../core/rng');
var D = require('../data/locations');
var CONFIG = require('../data/config');
var LIM = CONFIG.CHUNK_SIZE / 2;
var P = { GREY: 0, ROAD: 1, CONCRETE: 8, YELLOW: 14, BLACK: 15, SAFFRON: 16, MAGENTA: 17, TEAL: 18, LIME: 19, BLUE: 20, RED: 21, CREAM: 22, PURPLE: 23, DIRT: 24, WHITE: 25, RUST: 26, PINK: 27, GREYP: 13 };
var BRIGHT = [P.SAFFRON, P.MAGENTA, P.TEAL, P.LIME, P.BLUE, P.RED, P.YELLOW, P.PURPLE, P.PINK];

function typeAt(seed, cx, cz, kind) {
  var key = cx + ',' + cz;
  if (D.FORCED[key]) return D.FORCED[key];
  if (cx === 0 && cz === 0) return null;
  var m3x = ((cx % 3) + 3) % 3, m3z = ((cz % 3) + 3) % 3, isH = m3z === 0 && m3x !== 1, isV = m3x === 1 && m3z !== 0;
  if (!isH && !isV) return null;
  var r = rngMod.createRng(rngMod.hash32(seed ^ 0x1b873593, cx, cz));
  if (r.next() >= D.CHANCE) return null;
  return D.ORDER[r.int(0, D.ORDER.length - 1)];
}

function frame(spec, axis, side) {                    /* (u along the road, w = distance into the yard on `side`) */
  function clampv(a) { return Math.max(-LIM, Math.min(LIM, a)); }
  function B(u0, y0, w0, u1, y1, w1, c) {
    var a = clampv(Math.min(u0, u1)), b = clampv(Math.max(u0, u1)), d = clampv(Math.min(w0, w1) * side), e = clampv(Math.max(w0, w1) * side), t;
    if (d > e) { t = d; d = e; e = t; }
    if (b - a < 0.02 || e - d < 0.02) return;
    spec.boxes.push(axis === 'x' ? { x0: a, y0: y0, z0: d, x1: b, y1: y1, z1: e, c: c, d: 1 } : { x0: d, y0: y0, z0: a, x1: e, y1: y1, z1: b, c: c, d: 1 });
  }
  function S(u0, w0, u1, w1, y1) {
    var a = clampv(Math.min(u0, u1)), b = clampv(Math.max(u0, u1)), d = clampv(Math.min(w0, w1) * side), e = clampv(Math.max(w0, w1) * side), t;
    if (d > e) { t = d; d = e; e = t; }
    spec.solids.push(axis === 'x' ? { x0: a, z0: d, x1: b, z1: e, y1: y1 } : { x0: d, z0: a, x1: e, z1: b, y1: y1 });
  }
  return { B: B, S: S };
}
function pick(r, a) { return a[Math.floor(r.next() * a.length) % a.length]; }

/* remove the buildings on one side of the road (everything out past the lamp posts) */
function clearSide(spec, axis, side) {
  function out(b) { var v0 = axis === 'x' ? b.z0 : b.x0, v1 = axis === 'x' ? b.z1 : b.x1; return side > 0 ? v0 >= 7.9 : v1 <= -7.9; }
  spec.boxes = spec.boxes.filter(function (b) { return !out(b); });
  spec.solids = spec.solids.filter(function (q) { return !out(q); });
}

var PIECES = {
  market: function (f, r) {
    var u, k;
    for (u = -13; u < 12; u += 4.4) {
      var c = pick(r, BRIGHT), c2 = pick(r, BRIGHT);
      f.B(u, 0, 8.4, u + 3.2, 0.9, 9.8, P.RUST); f.B(u + 0.1, 0.9, 8.5, u + 3.1, 1.25, 9.7, pick(r, [P.RED, P.SAFFRON, P.LIME, P.YELLOW, P.MAGENTA]));
      for (k = 0; k < 4; k++) f.B(u + 0.3 + k * 0.7, 1.25, 8.8, u + 0.7 + k * 0.7, 1.55, 9.2, pick(r, [P.RED, P.LIME, P.SAFFRON, P.YELLOW]));
      f.B(u, 2.3, 8.2, u + 3.2, 2.45, 10.2, k % 2 ? c : c2); f.B(u, 0, 10.1, u + 0.1, 2.3, 10.2, P.BLACK); f.B(u + 3.1, 0, 10.1, u + 3.2, 2.3, 10.2, P.BLACK);
      f.S(u, 8.4, u + 3.2, 9.8, 1.6);
    }
    f.B(-16, 0, 11, 16, 6.5, 16, pick(r, [P.CREAM, P.SAFFRON, P.TEAL])); f.S(-16, 11, 16, 16, 6.5);
    for (u = -15; u < 14; u += 5) f.B(u, 2.7, 10.8, u + 3.5, 3.5, 11.0, pick(r, BRIGHT));
  },
  petrol: function (f, r) {
    f.B(-9, 4.6, 8.5, 9, 5.0, 15.5, P.WHITE); f.B(-9, 5.0, 8.5, 9, 5.5, 15.5, P.RED); f.B(-9, 5.5, 8.5, 9, 5.65, 15.5, P.YELLOW);
    [[-8.5, 9], [8.2, 9], [-8.5, 15], [8.2, 15]].forEach(function (q) { f.B(q[0], 0, q[1], q[0] + 0.4, 4.6, q[1] + 0.4, P.GREYP); f.S(q[0], q[1], q[0] + 0.4, q[1] + 0.4, 4.6); });
    [-4, 4].forEach(function (u) { f.B(u - 0.4, 0, 11.6, u + 0.4, 1.6, 12.4, P.RED); f.B(u - 0.35, 1.0, 11.55, u + 0.35, 1.4, 11.6, P.BLACK); f.B(u - 0.5, 0, 11.4, u + 0.5, 0.15, 12.6, P.CONCRETE); f.S(u - 0.5, 11.4, u + 0.5, 12.6, 1.6); });
    f.B(10.5, 0, 9.5, 15.5, 3.2, 15.5, P.CREAM); f.B(10.5, 3.2, 9.4, 15.5, 3.6, 15.6, P.RED); f.S(10.5, 9.5, 15.5, 15.5, 3.6);
    f.B(-13.6, 0, 9, -13.2, 7.5, 9.4, P.GREYP); f.B(-15, 7.5, 8.8, -11.8, 9.5, 9.6, P.YELLOW); f.B(-14.7, 7.8, 8.7, -12.1, 9.2, 8.8, P.RED); f.S(-13.6, 9, -13.2, 9.4, 9.5);
  },
  busstand: function (f, r) {
    f.B(-6, 0, 8.4, 6, 0.3, 11.5, P.CONCRETE); f.B(-6, 2.9, 8.4, 6, 3.2, 11.5, P.TEAL);
    [-5.8, 5.5].forEach(function (u) { f.B(u, 0, 8.5, u + 0.3, 2.9, 8.8, P.GREYP); });
    f.B(-5.8, 0.3, 11.2, 5.8, 2.9, 11.5, P.BLUE); f.B(-4, 0.3, 11.0, 4, 0.8, 11.2, P.RUST); f.B(-4, 0.8, 11.2, 4, 1.0, 11.5, P.RUST);
    f.B(-5, 1.0, 11.45, 5, 2.4, 11.5, P.CREAM); f.B(-4.6, 1.4, 11.5, -1.6, 2.1, 11.55, P.RED); f.B(0.4, 1.4, 11.5, 4.4, 2.1, 11.55, P.SAFFRON);
    f.B(8, 0, 9, 8.2, 4.2, 9.2, P.GREYP); f.B(7.2, 4.2, 8.9, 9.4, 5.2, 9.3, P.BLUE); f.S(-6, 8.4, 6, 11.5, 3.2);
    f.B(-16, 0, 12.5, 16, 7.5, 16, pick(r, [P.SAFFRON, P.CREAM, P.PINK])); f.S(-16, 12.5, 16, 16, 7.5);
  },
  construction: function (f, r) {
    var u, y, k;
    for (u = -15; u < 15; u += 1.6) f.B(u, 0, 8.2, u + 1.3, 1.3, 8.35, P.SAFFRON);                            /* the orange mesh fence */
    for (u = -15; u <= 15; u += 3.2) f.B(u, 0, 8.1, u + 0.12, 1.5, 8.22, P.GREYP);
    for (y = 0; y < 3; y++) for (u = -6; u <= 6; u += 4) { f.B(u, y * 3, 11, u + 0.18, y * 3 + 3.1, 11.18, P.RUST); f.B(u, y * 3, 14, u + 0.18, y * 3 + 3.1, 14.18, P.RUST); }
    for (y = 1; y <= 3; y++) { f.B(-6, y * 3 - 0.15, 11, 6.18, y * 3, 14.18, y % 2 ? P.GREYP : P.CONCRETE); }
    f.S(-6, 11, 6.2, 14.2, 9.2);
    f.B(8, 0, 9, 11.5, 1.6, 12, P.DIRT); f.B(9, 1.6, 9.8, 10.5, 2.2, 11.2, P.DIRT); f.S(8, 9, 11.5, 12, 2.2);
    for (k = 0; k < 3; k++) { f.B(-14 + k * 2.4, 0, 12.5, -12.4 + k * 2.4, 1.2, 13.6, P.RED); f.S(-14 + k * 2.4, 12.5, -12.4 + k * 2.4, 13.6, 1.2); }
    f.B(11, 0, 14, 12.6, 7, 15.6, P.YELLOW); f.B(8, 7, 14.2, 15, 7.5, 15.4, P.YELLOW); f.S(11, 14, 12.6, 15.6, 7.5);
  },
  temple: function (f, r) {
    f.B(-8, 0, 8.4, 8, 0.5, 16, P.CREAM); f.B(-7, 0.5, 8.9, 7, 0.9, 16, P.CREAM); f.B(-6, 0.9, 9.4, 6, 1.3, 16, P.CREAM);
    f.B(-3.2, 1.3, 11.6, 3.2, 4.6, 15.6, P.SAFFRON); f.B(-2.6, 4.6, 12.1, 2.6, 6.0, 15.1, P.SAFFRON); f.B(-2.0, 6.0, 12.6, 2.0, 7.2, 14.6, P.RED); f.B(-1.3, 7.2, 13.0, 1.3, 8.2, 14.2, P.SAFFRON); f.B(-0.5, 8.2, 13.4, 0.5, 9.2, 13.8, P.YELLOW);
    f.B(-1.2, 1.3, 11.4, 1.2, 3.0, 11.6, P.BLACK);
    f.S(-3.2, 11.6, 3.2, 15.6, 9.2);
    f.B(6, 0.5, 9.6, 6.25, 6.5, 9.85, P.GREYP); f.B(6.25, 5.8, 9.65, 8.6, 6.4, 9.8, P.RED); f.B(6.25, 6.4, 9.65, 8.1, 6.8, 9.8, P.SAFFRON); f.S(6, 9.6, 6.25, 9.85, 6.5);
    f.B(-5.2, 0.9, 9.8, -4.6, 2.2, 10.4, P.GREYP); f.B(-5.2, 2.2, 9.8, -4.6, 2.5, 10.4, P.YELLOW); f.S(-5.2, 9.8, -4.6, 10.4, 2.5);
    f.B(-16, 0, 13.5, -9, 6, 16, pick(r, [P.TEAL, P.PINK])); f.B(9, 0, 13.5, 16, 6, 16, pick(r, [P.CREAM, P.LIME])); f.S(-16, 13.5, -9, 16, 6); f.S(9, 13.5, 16, 16, 6);
  },
  warehouse: function (f, r) {
    var cols = [P.RED, P.BLUE, P.TEAL, P.SAFFRON, P.GREYP], u, k;
    for (k = 0; k < 4; k++) { u = -14 + k * 7.4; var c = pick(r, cols); f.B(u, 0, 9, u + 6, 2.6, 11.4, c); f.S(u, 9, u + 6, 11.4, 2.6); if (k % 2 === 0) { f.B(u + 0.4, 2.6, 9.2, u + 5.6, 5.2, 11.2, pick(r, cols)); f.S(u + 0.4, 9.2, u + 5.6, 11.2, 5.2); } }
    for (k = 0; k < 5; k++) { u = -13 + k * 5.5; f.B(u, 0, 12.6, u + 1.3, 1.2, 13.9, P.RUST); f.B(u + 0.1, 1.2, 12.7, u + 1.2, 2.2, 13.8, P.RUST); f.S(u, 12.6, u + 1.3, 13.9, 2.2); }
    f.B(-16, 0, 14.6, 16, 6.5, 16, P.GREYP); f.S(-16, 14.6, 16, 16, 6.5);
  },
  slum: function (f, r) {
    var u = -15, k = 0;
    while (u < 13) {
      var w = r.range(3.2, 5.2), h = r.range(2.3, 3.2), c = pick(r, [P.BLUE, P.RUST, P.WHITE, P.TEAL, P.SAFFRON, P.GREYP]), d = r.range(8.6, 10.4);
      f.B(u, 0, d, u + w, h, d + r.range(3.2, 4.4), c); f.B(u - 0.2, h, d - 0.2, u + w + 0.2, h + 0.18, d + 4.6, pick(r, [P.GREYP, P.RUST, P.BLUE]));
      f.B(u + 0.5, 0, d - 0.04, u + 1.3, 1.9, d, P.BLACK); f.B(u + w - 1.4, 1.6, d - 0.3, u + w - 0.4, 2.0, d, pick(r, BRIGHT));
      f.S(u, d, u + w, d + 3.6, h + 0.2); u += w + r.range(0.4, 1.0); k++;
    }
  },
  railway: function (f, r) {
    var y;
    for (var v = -16; v < 16; v += 1.1) f.B(-1.7, 0.02, v, 1.7, 0.1, v + 0.45, P.DIRT);
    f.B(-0.95, 0.1, -16, -0.8, 0.2, 16, P.GREYP); f.B(0.8, 0.1, -16, 0.95, 0.2, 16, P.GREYP);
    [-7.5, 7.5].forEach(function (v) { f.B(-0.1, 0, v, 0.1, 2.4, v + 0.2, P.WHITE); for (var k = 0; k < 8; k++) f.B(-0.1, 2.4 + (k % 2) * 0.01, v - 3.2 + k * 0.8 - (v < 0 ? -3.2 : 0) + 3.2, 0.1, 2.5, v + 0.2 + (v > 0 ? -1 : 0), k % 2 ? P.RED : P.WHITE); });
    f.B(-0.6, 0, 8.6, 0.6, 1.6, 9.6, P.RED);
  },
  toll: function (f, r) {
    var v;
    f.B(-3, 5.2, -9, 3, 5.8, 9, P.YELLOW); f.B(-3, 5.8, -9, 3, 6.4, 9, P.BLUE);
    [-8.4, -3.6, 0, 3.6, 8.4].forEach(function (v) { f.B(-1.4, 0, v - 0.6, 1.4, 5.2, v + 0.6, v === -8.4 || v === 8.4 ? P.GREYP : P.CREAM); f.S(-1.4, v - 0.6, 1.4, v + 0.6, 5.2); });
    [-4.8, -1.8, 1.8, 4.8].forEach(function (v) { f.B(-0.05, 0.9, v - 0.05, 0.05, 1.0, v + 0.05, P.RED); f.B(-2.6, 0, v - 0.05, -0.4, 0.15, v + 0.05, P.WHITE); });
    f.B(-1.5, 3.2, -3.5, 1.5, 4.4, -3.6, P.TEAL);
  },
  flyover: function (f, r) {
    f.B(-6, 5.6, -16, 6, 6.8, 16, P.CONCRETE); f.B(-6, 6.8, -16, 6, 7.2, 16, P.GREYP); f.B(-6.2, 5.4, -16, -6, 7.4, 16, P.GREYP);
    [-8.6, 0, 8.6].forEach(function (v) { f.B(-3.2, 0, v - 0.7, 3.2, 5.6, v + 0.7, P.CONCRETE); f.B(-3.3, 0, v - 0.75, 3.3, 0.5, v + 0.75, P.GREYP); f.S(-3.2, v - 0.7, 3.2, v + 0.7, 5.6); });
    for (var v = -14; v < 14; v += 4) f.B(-5, 1.2, v, -4.9, 2.4, v + 2.5, pick(r, BRIGHT));
  }
};

/* build the location on a finished road-chunk spec; returns the descriptor the sim uses, or null */
function place(spec, seed, cx, cz, kind) {
  var type = typeAt(seed, cx, cz); if (!type || (kind !== 'roadH' && kind !== 'roadV')) return null;
  var axis = kind === 'roadV' ? 'z' : 'x', def = D.LOCATIONS[type], r = rngMod.createRng(rngMod.hash32(seed ^ 0x85ebca6b, cx, cz));
  var side = r.chance(0.5) ? 1 : -1;
  if (def.side) clearSide(spec, axis, side);
  var f = frame(spec, axis, def.side ? side : 1);
  PIECES[type](f, r);
  var spawns = [], i;                                          /* men appear on the road and the yard edge, spread along the road */
  for (i = 0; i < def.n; i++) {
    var u = -9 + (i + 0.5) * 18 / def.n + r.range(-1, 1), v = r.range(-4.5, 4.5) + (def.side ? side * 1.5 : 0);
    spawns.push(axis === 'x' ? { x: u, z: v } : { x: v, z: u });
  }
  return { type: type, name: def.name, n: def.n, stick: def.stick, r: def.r, x: spec.ox, z: spec.oz, spawns: spawns.map(function (s) { return { x: s.x + spec.ox, z: s.z + spec.oz }; }), side: def.side ? side : 0, axis: axis };
}

module.exports = { typeAt: typeAt, place: place };
