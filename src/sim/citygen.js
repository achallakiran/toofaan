/* sim: the city. Chunk rows 0,3,6.. are east-west roads; chunk columns 1,4,7.. are north-south roads; where they cross is an
   intersection; everything else is a building block. Pure data from (seed, cx, cz), like every chunk spec. Each spec also lists
   `solids` (footprints the bike cannot enter) and `ramps` (slopes it can jump from), in chunk-local metres. */
'use strict';

var CONFIG = require('../data/config');
var gen = require('./chunkgen');
var detail = require('./citydetail');
var rngMod = require('../core/rng');

var PERIOD = 3;
function mod(a, n) { return ((a % n) + n) % n; }
function roadH(cz) { return mod(cz, PERIOD) === 0; }
function roadV(cx) { return mod(cx, PERIOD) === 1; }
function kindOf(cx, cz) { var h = roadH(cz), v = roadV(cx); return h && v ? 'cross' : (h ? 'roadH' : (v ? 'roadV' : 'block')); }

function swapXZ(spec) {                                   /* turn an east-west road chunk into a north-south one */
  function sw(b) { var o = {}, k; for (k in b) o[k] = b[k]; o.x0 = b.z0; o.x1 = b.z1; o.z0 = b.x0; o.z1 = b.x1; return o; }
  spec.boxes = spec.boxes.map(sw); spec.solids = spec.solids.map(sw);
  spec.ramps = spec.ramps.map(function (r) { var o = sw(r); o.axis = 'z'; return o; });
  return spec;
}

function generate(seed, cx, cz) {
  var S = CONFIG.CHUNK_SIZE, H = S / 2, G = CONFIG.GROUND, kind = kindOf(cx, cz), spec;
  /* the old street keeps its look: the road chunks come straight from the street generator, a hash-salted copy per chunk */
  var salt = (cx * 31 + cz * 17) | 0;
  if (kind === 'roadH') spec = gen.generateChunk(seed ^ (cz === 0 ? 0 : 0x5bd1e995), cx, cz === 0 ? 0 : (cz + salt) | 0, { road: true });
  else if (kind === 'roadV') spec = swapXZ(gen.generateChunk(seed ^ 0x2c1b3c6d, cz, (cx + salt) | 0, { road: true }));
  else if (kind === 'block') spec = gen.generateChunk(seed ^ 0x1f3d5b79, cx, cz, { road: false });
  else {
    var boxes = [], solids = [], k, p;
    function box(x0, y0, z0, x1, y1, z1, c) { boxes.push({ x0: x0, y0: y0, z0: z0, x1: x1, y1: y1, z1: z1, c: c }); }
    box(-H, -0.3, -H, H, 0, H, G.sidewalk);
    box(-H, -0.28, -6, H, 0.02, 6, G.road); box(-6, -0.28, -H, 6, 0.02, H, G.road);
    for (k = -H + 2; k < H; k += 6) { if (Math.abs(k + 1.5) > 7) { box(k, 0.02, -0.15, k + 3, 0.04, 0.15, 8); box(-0.15, 0.02, k, 0.15, 0.04, k + 3, 8); } }
    for (k = -5; k <= 5; k += 1.4) { box(k, 0.02, 6.4, k + 0.7, 0.04, 8.4, 8); box(k, 0.02, -8.4, k + 0.7, 0.04, -6.4, 8); box(6.4, 0.02, k, 8.4, 0.04, k + 0.7, 8); box(-8.4, 0.02, k, -6.4, 0.04, k + 0.7, 8); }
    [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]].forEach(function (q) {
      box(q[0], 0, q[1], q[0] + 0.18, 4.2, q[1] + 0.18, 1); box(q[0] - 0.3, 4.0, q[1], q[0] + 0.5, 4.2, q[1] + 0.18, 1);
      solids.push({ x0: q[0], z0: q[1], x1: q[0] + 0.18, z1: q[1] + 0.18, y1: 4.2 });
    });
    p = [[-H, -H, -9, -9], [9, -H, H, -9], [-H, 9, -9, H], [9, 9, H, H]];                   /* corner buildings, set back from the junction */
    var rng = rngMod.createRng(rngMod.hash32(seed, cx, cz));
    p.forEach(function (q) {
      var x0 = q[0] === -H ? q[0] + 0.4 : q[0], x1 = q[2] === H ? q[2] - 0.4 : q[2], z0 = q[1] === -H ? q[1] + 0.4 : q[1], z1 = q[3] === H ? q[3] - 0.4 : q[3], hgt = rng.range(7, 20);
      box(x0, 0, z0, x1, hgt, z1, [28, 29, 30, 31, 32, 33, 34, 35][rng.int(2, 11) % 8]); solids.push({ x0: x0, z0: z0, x1: x1, z1: z1, y1: hgt });
    });
    spec = { key: gen.chunkKey(cx, cz), cx: cx, cz: cz, ox: cx * S, oz: cz * S, boxes: boxes, solids: solids, ramps: [] };
  }
  spec.hazards = spec.hazards || [];
  if (kind === 'cross') detail.decorateCross(spec, seed, cx, cz); else detail.decorate(spec, seed, cx, cz, kind);
  spec.key = gen.chunkKey(cx, cz); spec.cx = cx; spec.cz = cz; spec.ox = cx * S; spec.oz = cz * S; spec.kind = kind;
  return spec;
}

module.exports = { generate: generate, kindOf: kindOf, roadH: roadH, roadV: roadV, PERIOD: PERIOD };
