/* sim: deterministic chunk specs. A spec is plain data (boxes in chunk-local metres),
   so the same seed always rebuilds the same chunk and nothing needs to be stored. */
'use strict';

var rngMod = require('../core/rng');
var CONFIG = require('../data/config');

/* the original pastel wall colours, mapped to a livelier set: saffron, rose, turquoise, lime, blue, cream, ochre, orchid */
var WALLS = { 2: 28, 3: 29, 4: 30, 5: 31, 6: 32, 7: 33, 8: 34, 9: 35, 10: 28, 11: 30 };
function chunkKey(cx, cz) { return cx + ',' + cz; }

function generateChunk(seed, cx, cz, opts) {
  var S = CONFIG.CHUNK_SIZE, H = S / 2, G = CONFIG.GROUND;
  var rng = rngMod.createRng(rngMod.hash32(seed, cx, cz));
  var boxes = [], solids = [], ramps = [];
  function box(x0, y0, z0, x1, y1, z1, c) { boxes.push({ x0: x0, y0: y0, z0: z0, x1: x1, y1: y1, z1: z1, c: c }); }

  var onRoad = opts && opts.road != null ? !!opts.road : (cz === 0);
  box(-H, -0.3, -H, H, 0, H, onRoad ? G.sidewalk : G.dirt);          /* base ground */
  if (onRoad) {
    box(-H, -0.28, -6, H, 0.02, 6, G.road);                            /* main road along x */
    for (var m = -H + 2; m < H; m += 6) box(m, 0.02, -0.15, m + 3, 0.04, 0.15, 8); /* centre line dashes */
  }

  /* building rows on both sides of the road, or a denser block away from it */
  var rows = onRoad ? [{ z0: 8.5, z1: 15.5 }, { z0: -15.5, z1: -8.5 }] : [{ z0: -14, z1: -2 }, { z0: 2, z1: 14 }];
  for (var r = 0; r < rows.length; r++) {
    var x = -H + rng.range(0.5, 2);
    while (x < H - 5) {
      var w = rng.range(5, 10), maxX = H - 0.5;
      if (x + w > maxX) w = maxX - x;
      if (w < 3.5) break;
      var hgt = rng.range(5, 22);
      var shopH = 2.7;
      var c = rng.int(2, 11);
      box(x, 0, rows[r].z0, x + w, hgt, rows[r].z1, WALLS[c] === undefined ? c : WALLS[c]);
      solids.push({ x0: x, z0: rows[r].z0, x1: x + w, z1: rows[r].z1, y1: hgt });
      if (onRoad) {                                                   /* shopfront band raised to a hero-sized doorway */
        var zf = rows[r].z0 < 0 ? rows[r].z1 : rows[r].z0, dz = rows[r].z0 < 0 ? 0.12 : -0.12;
        box(x + 0.4, 0, Math.min(zf, zf + dz), x + w - 0.4, shopH, Math.max(zf, zf + dz), 1);
      }
      x += w + rng.range(0.8, 2.5);
    }
  }
  /* lamp posts along the pavement */
  if (onRoad) for (var p = -H + 4; p < H; p += 10) {
    box(p, 0, 7.4, p + 0.18, 4.2, 7.58, 1); box(p - 0.4, 4.0, 7.4, p + 0.58, 4.2, 7.58, 1);
    box(p, 0, -7.58, p + 0.18, 4.2, -7.4, 1); box(p - 0.4, 4.0, -7.58, p + 0.58, 4.2, -7.4, 1);
    solids.push({ x0: p, z0: 7.4, x1: p + 0.18, z1: 7.58, y1: 4.2 }, { x0: p, z0: -7.58, x1: p + 0.18, z1: -7.4, y1: 4.2 });
  }
  /* a jump ramp in one lane (drawn last so the buildings above are the same as before): stair boxes for the eye, slope data for the bike */
  if (onRoad && !(opts && opts.noRamp) && !(cx === 0 && cz === 0) && rng.chance(0.5)) {
    var rx0 = rng.range(-12, -4), rlen = 8, rh = 3.0, rw = 4.4, rz0 = (rng.chance(0.5) ? 3 : -3) - rw / 2, n = 16, k;
    for (k = 0; k < n; k++) box(rx0 + rlen * k / n, 0.02, rz0, rx0 + rlen * (k + 1) / n, 0.04 + rh * (k + 0.5) / n, rz0 + rw, k % 4 < 2 ? 3 : 4);
    ramps.push({ x0: rx0, z0: rz0, x1: rx0 + rlen, z1: rz0 + rw, axis: 'x', dir: 1, h: rh });
  }
  return { key: chunkKey(cx, cz), cx: cx, cz: cz, ox: cx * S, oz: cz * S, boxes: boxes, solids: solids, ramps: ramps };
}

module.exports = { generateChunk: generateChunk, chunkKey: chunkKey };
