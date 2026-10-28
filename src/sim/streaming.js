/* sim: decides which chunks should exist around the player and reports loads and unloads.
   The view builds and frees meshes from those events; this module holds no graphics objects. */
'use strict';

var CONFIG = require('../data/config');
var gen = require('./chunkgen');

function createStreaming(seed, bus) {
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
      var sp = fromCache(key) || gen.generateChunk(seed, want[key][0], want[key][1]);
      loaded[key] = sp; stats.loads++;
      bus.emit('chunk:load', { key: key, spec: sp });
    }
    var n = Object.keys(loaded).length;
    if (n > stats.peakLoaded) stats.peakLoaded = n;
    return true;
  }

  return {
    update: update,
    loadedKeys: function () { return Object.keys(loaded).sort(); },
    snapshotSpecs: function () { return Object.keys(loaded).sort().map(function (k) { return loaded[k]; }); },
    loadedCount: function () { return Object.keys(loaded).length; },
    stats: stats,
    centre: centre
  };
}

module.exports = { createStreaming: createStreaming };
