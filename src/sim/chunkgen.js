/* sim: deterministic chunk specs. A spec is plain data (boxes in chunk-local metres),
   so the same seed always rebuilds the same chunk and nothing needs to be stored. */
'use strict';

var rngMod = require('../core/rng');
var CONFIG = require('../data/config');

function chunkKey(cx, cz) { return cx + ',' + cz; }

function generateChunk(seed, cx, cz) {
  var S = CONFIG.CHUNK_SIZE, H = S / 2, G = CONFIG.GROUND;
  var rng = rngMod.createRng(rngMod.hash32(seed, cx, cz));
  var boxes = [];
  function box(x0, y0, z0, x1, y1, z1, c) { boxes.push({ x0: x0, y0: y0, z0: z0, x1: x1, y1: y1, z1: z1, c: c }); }

  var onRoad = (cz === 0);
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
      box(x, 0, rows[r].z0, x + w, hgt, rows[r].z1, c);
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
  }
  return { key: chunkKey(cx, cz), cx: cx, cz: cz, ox: cx * S, oz: cz * S, boxes: boxes };
}

module.exports = { generateChunk: generateChunk, chunkKey: chunkKey };
