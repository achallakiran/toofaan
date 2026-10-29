/* sim: decides which chunks should exist around the player and reports loads and unloads.
   The view builds and frees meshes from those events; this module holds no graphics objects. */
'use strict';

var CONFIG = require('../data/config');
var gen = require('./chunkgen');

function createStreaming(seed, bus, genFn) {
  genFn = genFn || gen.generateChunk;
  var S = CONFIG.CHUNK_SIZE, R = CONFIG.STREAM_RADIUS;
  var loaded = {};            /* key -> spec */
  var cache = [];             /* recent specs, newest last */
  var centre = { cx: 1e9, cz: 1e9 };
  var stats = { loads: 0, unloads: 0, cacheHits: 0, peakLoaded: 0 };

  function fromCache(key) {
    for (var i = 0; i < cache.length; i++) if (cache[i].key === key) {
      var s = cache.splice(i, 1)[0]; stats.cacheHits++; return s;
    }
    return null;
  }

  function update(px, pz) {
    var cx = Math.floor((px + S / 2) / S), cz = Math.floor((pz + S / 2) / S);
    if (cx === centre.cx && cz === centre.cz) return false;
    centre.cx = cx; centre.cz = cz;
    var want = {}, x, z, key;
    for (x = cx - R; x <= cx + R; x++) for (z = cz - R; z <= cz + R; z++) want[gen.chunkKey(x, z)] = [x, z];

    for (key in loaded) if (!want[key]) {              /* unload first so the peak never exceeds the budget */
      var spec = loaded[key]; delete loaded[key];
      cache.push(spec); if (cache.length > CONFIG.CACHE_SPECS) cache.shift();
      stats.unloads++;
      bus.emit('chunk:unload', { key: key });
    }
    for (key in want) if (!loaded[key]) {
      var sp = fromCache(key) || genFn(seed, want[key][0], want[key][1]);
      loaded[key] = sp; stats.loads++;
      bus.emit('chunk:load', { key: key, spec: sp });
    }
    var n = Object.keys(loaded).length;
    if (n > stats.peakLoaded) stats.peakLoaded = n;
    return true;
  }

  /* collision queries for the bike: footprints near a point, and the ground height (ramps) under it. World metres. */
  function specAt(x, z) { return loaded[gen.chunkKey(Math.floor((x + S / 2) / S), Math.floor((z + S / 2) / S))] || null; }
  function solidsNear(x, z, r, out) {
    out = out || []; var cx0 = Math.floor((x - r + S / 2) / S), cx1 = Math.floor((x + r + S / 2) / S), cz0 = Math.floor((z - r + S / 2) / S), cz1 = Math.floor((z + r + S / 2) / S), a, b, i;
    for (a = cx0; a <= cx1; a++) for (b = cz0; b <= cz1; b++) {
      var sp = loaded[gen.chunkKey(a, b)]; if (!sp || !sp.solids) continue;
      for (i = 0; i < sp.solids.length; i++) {
        var q = sp.solids[i], x0 = q.x0 + sp.ox, x1 = q.x1 + sp.ox, z0 = q.z0 + sp.oz, z1 = q.z1 + sp.oz;
        if (x1 > x - r && x0 < x + r && z1 > z - r && z0 < z + r) out.push({ x0: x0, z0: z0, x1: x1, z1: z1, y1: q.y1 });
      }
    }
    return out;
  }
  function groundAt(x, z) {
    var sp = specAt(x, z); if (!sp || !sp.ramps) return 0;
    for (var i = 0; i < sp.ramps.length; i++) {
      var r = sp.ramps[i], lx = x - sp.ox, lz = z - sp.oz;
      if (lx < r.x0 || lx > r.x1 || lz < r.z0 || lz > r.z1) continue;
      var t = r.axis === 'x' ? (r.dir > 0 ? lx - r.x0 : r.x1 - lx) / (r.x1 - r.x0) : (r.dir > 0 ? lz - r.z0 : r.z1 - lz) / (r.z1 - r.z0);
      return r.h * (t < 0 ? 0 : t > 1 ? 1 : t);
    }
    return 0;
  }

  /* the bad road: 'pot' (pothole), 'brk' (speed breaker) or null under a point, world metres */
  function hazardAt(x, z) {
    var sp = specAt(x, z); if (!sp || !sp.hazards) return null; var lx = x - sp.ox, lz = z - sp.oz;
    for (var i = 0; i < sp.hazards.length; i++) { var h = sp.hazards[i]; if (lx >= h.x0 && lx <= h.x1 && lz >= h.z0 && lz <= h.z1) return h.k; }
    return null;
  }

  return {
    hazardAt: hazardAt,
    update: update, specAt: specAt, solidsNear: solidsNear, groundAt: groundAt,
    loadedKeys: function () { return Object.keys(loaded).sort(); },
    snapshotSpecs: function () { return Object.keys(loaded).sort().map(function (k) { return loaded[k]; }); },
    loadedCount: function () { return Object.keys(loaded).length; },
    stats: stats,
    centre: centre
  };
}

module.exports = { createStreaming: createStreaming };
