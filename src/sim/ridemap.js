/* sim: the city map for ride mode. A grid of four-lane roads with built-up blocks between them and the ten trouble spots
   placed on the pavements. Plain data from a seed: the view turns the boxes into meshes, the ride sim uses the road test. */
'use strict';

var R = require('../data/ride');
var LOC = require('../data/locations');
var rngMod = require('../core/rng');

function lineAt(i) { return (i - (R.GRID - 1) / 2) * R.SPACING; }
function extent() { return lineAt(R.GRID - 1) + R.HALF + R.PAVE; }

/* nearest road centre line to a coordinate */
function nearestLine(v) {
  var i = Math.round(v / R.SPACING + (R.GRID - 1) / 2); if (i < 0) i = 0; if (i > R.GRID - 1) i = R.GRID - 1;
  return lineAt(i);
}

/* is this point on a road or its pavement (where the bike may go)? */
function onRoad(x, z, margin) {
  var w = R.HALF + R.PAVE - (margin || 0), E = extent();
  if (Math.abs(x) > E || Math.abs(z) > E) return false;
  return Math.abs(z - nearestLine(z)) <= w || Math.abs(x - nearestLine(x)) <= w;
}
/* on the carriageway itself (not the pavement) */
function onCarriageway(x, z) {
  var E = extent();
  if (Math.abs(x) > E || Math.abs(z) > E) return false;
  return Math.abs(z - nearestLine(z)) <= R.HALF || Math.abs(x - nearestLine(x)) <= R.HALF;
}

/* building boxes for one block: rows facing each road, roofs with tanks, parapets and stair huts */
function buildBlock(rng, x0, z0, x1, z1) {
  var out = [], side, k;
  function b(ax, az, bx, bz, h, c, y0) { out.push({ x0: Math.min(ax, bx), z0: Math.min(az, bz), x1: Math.max(ax, bx), z1: Math.max(az, bz), y0: y0 || 0, y1: h, c: c }); }
  function roof(ax, az, bx, bz, h) {
    var mx = (ax + bx) / 2, mz = (az + bz) / 2, r = rng.next();
    b(ax, az, bx, az + 0.3, h + 0.6, 22, h); b(ax, bz - 0.3, bx, bz, h + 0.6, 22, h);                             /* parapet on two edges */
    if (r < 0.55) b(mx - 0.8, mz - 0.8, mx + 0.8, mz + 0.8, h + 1.6, 15, h);                               /* black water tank */
    else if (r < 0.75) b(mx - 1.4, mz - 1.0, mx + 1.4, mz + 1.0, h + 2.4, 13, h);                           /* stair hut */
    else if (r < 0.9) b(mx - 2, mz - 1.2, mx + 2, mz + 1.2, h + 0.5, 5, h);                                 /* solar panel */
    if (rng.next() < 0.5) b(mx + 1.6, mz - 0.4, mx + 2.4, mz + 0.4, h + 0.7, 25, h);                        /* AC unit */
  }
  var COLS = [3, 4, 6, 9, 10, 11, 16, 17, 18, 19, 20, 23, 26, 27, 28, 29, 30, 31, 33, 34, 35];
  var depth = 11;
  for (side = 0; side < 4; side++) {                                                                     /* each block face: a row of buildings */
    var len = side < 2 ? x1 - x0 : z1 - z0, pos = 0;
    while (pos < len - 3) {
      var wdt = Math.min(len - pos, 6 + Math.floor(rng.next() * 9)), h = 4 + Math.floor(rng.next() * 4) * 3, c = COLS[Math.floor(rng.next() * COLS.length)];
      var ax, az, bx, bz;
      if (side === 0) { ax = x0 + pos; bx = ax + wdt; az = z0; bz = z0 + depth; }
      else if (side === 1) { ax = x0 + pos; bx = ax + wdt; az = z1 - depth; bz = z1; }
      else if (side === 2) { az = z0 + depth + pos; bz = Math.min(z1 - depth, az + wdt); ax = x0; bx = x0 + depth; }
      else { az = z0 + depth + pos; bz = Math.min(z1 - depth, az + wdt); ax = x1 - depth; bx = x1; }
      if (bz - az > 2 && bx - ax > 2) { b(ax + 0.2, az + 0.2, bx - 0.2, bz - 0.2, h, c); roof(ax + 0.2, az + 0.2, bx - 0.2, bz - 0.2, h); }
      pos += wdt;
    }
  }
  /* the courtyard: a low godown or a patch of trees */
  var cx0 = x0 + depth + 1, cz0 = z0 + depth + 1, cx1 = x1 - depth - 1, cz1 = z1 - depth - 1;
  if (rng.next() < 0.5) b(cx0 + 2, cz0 + 2, cx1 - 2, cz1 - 2, 4, 7);
  else for (k = 0; k < 6; k++) { var tx = cx0 + 2 + rng.next() * (cx1 - cx0 - 4), tz = cz0 + 2 + rng.next() * (cz1 - cz0 - 4); b(tx - 0.3, tz - 0.3, tx + 0.3, tz + 0.3, 3, 24); b(tx - 2, tz - 2, tx + 2, tz + 2, 5.5, 6, 2.5); }
  return out;
}

/* poles and trees on the pavements: solid for the bike. Bucketed on an 8 m grid for quick lookups. */
function buildProps(rng, lines) {
  var list = [], E = extent(), ends = [-E].concat(lines).concat([E]), axis, i, k, sd, s;
  ['x', 'z'].forEach(function (ax) {
    axis = ax;
    for (i = 0; i < lines.length; i++) for (k = 0; k < ends.length - 1; k++) {
      var a0 = ends[k] + (k === 0 ? 0 : R.HALF + R.PAVE), a1 = ends[k + 1] - (k === ends.length - 2 ? 0 : R.HALF + R.PAVE);
      if (a1 - a0 < 6) continue;
      for (sd = -1; sd <= 1; sd += 2) {
        var o = lines[i] + sd * (R.HALF + 0.45), ot = lines[i] + sd * (R.HALF + R.PAVE - 0.9);
        for (s = a0 + 4; s < a1 - 2; s += 16) {
          list.push(axis === 'x' ? { kind: 'pole', x: s, z: o, r: 0.2, sd: sd, ax: axis } : { kind: 'pole', x: o, z: s, r: 0.2, sd: sd, ax: axis });
          if (s + 8 < a1 - 2 && rng.next() < 0.45) list.push(axis === 'x' ? { kind: 'tree', x: s + 8, z: ot, r: 0.45, v: Math.floor(rng.next() * 3) } : { kind: 'tree', x: ot, z: s + 8, r: 0.45, v: Math.floor(rng.next() * 3) });
        }
      }
    }
  });
  var grid = {};
  list.forEach(function (p) { var key = Math.floor(p.x / 8) + ',' + Math.floor(p.z / 8); (grid[key] || (grid[key] = [])).push(p); });
  return { list: list, grid: grid };
}
/* is a circle of radius r at (x, z) clear of every pole and tree? */
function clearOfProps(map, x, z, r) {
  var cx = Math.floor(x / 8), cz = Math.floor(z / 8), i, j, k;
  for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) {
    var cell = map.props.grid[(cx + i) + ',' + (cz + j)]; if (!cell) continue;
    for (k = 0; k < cell.length; k++) { var p = cell[k]; if (Math.hypot(p.x - x, p.z - z) < p.r + r) return false; }
  }
  return true;
}

function generate(seed) {
  var rng = rngMod.createRng((seed >>> 0) ^ 0x51ce), lines = [], i, j, blocks = [], targets = [];
  for (i = 0; i < R.GRID; i++) lines.push(lineAt(i));
  var inset = R.HALF + R.PAVE;
  for (i = 0; i < R.GRID - 1; i++) for (j = 0; j < R.GRID - 1; j++) {
    var x0 = lines[i] + inset, x1 = lines[i + 1] - inset, z0 = lines[j] + inset, z1 = lines[j + 1] - inset;
    blocks.push({ key: i + ',' + j, x0: x0, z0: z0, x1: x1, z1: z1, boxes: buildBlock(rng, x0, z0, x1, z1) });
  }
  /* the ten trouble spots: on a pavement, mid-way between two junctions, spread over the map */
  var used = {};
  for (var n = 0; n < LOC.ORDER.length; n++) {
    var tries = 0, axis, li, seg, sd, key;
    do {
      axis = rng.next() < 0.5 ? 'x' : 'z'; li = Math.floor(rng.next() * R.GRID); seg = Math.floor(rng.next() * (R.GRID - 1)); sd = rng.next() < 0.5 ? -1 : 1;
      key = axis + li + ':' + seg; tries++;
    } while (used[key] && tries < 50);
    used[key] = 1;
    var along = (lines[seg] + lines[seg + 1]) / 2, off = lines[li] + sd * (R.HALF + R.PAVE * 0.5);
    var name = LOC.LOCATIONS[LOC.ORDER[n]].name;
    targets.push(axis === 'x' ? { key: LOC.ORDER[n], name: name, x: along, z: off } : { key: LOC.ORDER[n], name: name, x: off, z: along });
  }
  var props = buildProps(rngMod.createRng((seed >>> 0) ^ 0x9e3), lines);
  return { seed: seed, lines: lines, ext: extent(), blocks: blocks, targets: targets, props: props };
}

module.exports = { generate: generate, clearOfProps: clearOfProps, onRoad: onRoad, onCarriageway: onCarriageway, nearestLine: nearestLine, lineAt: lineAt, extent: extent };
