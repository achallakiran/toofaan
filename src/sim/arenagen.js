/* sim: fight arenas. When the ride brings Toofan to a trouble spot, the fight (sim/fightworld) is held in a closed arena built for that kind
   of place. The spec has the arena's boxes and solid footprints, `tall` (fadeable groups), `signs` (painted text for the view), `bounds`
   (where the fight can go), the start point and the place (`loc`) with its spawn points. */
'use strict';

var CONFIG = require('../data/config');
var rngMod = require('../core/rng');
var kit = require('./arenakit');
var arenas = require('./arenas');
var D = require('../data/locations');

function has(type) { return !!arenas.A[type]; }

function build(seed, type, cx, cz) {
  var S = CONFIG.CHUNK_SIZE, rng = rngMod.createRng(rngMod.hash32(seed ^ 0x3ae11a, cx, cz)), K = kit.createBuilder(rng);
  var info = arenas.A[type](K), o = K.out, ox = cx * S, oz = cz * S, def = D.LOCATIONS[type];
  o.boxes.unshift({ x0: -26, y0: -0.3, z0: -26, x1: 26, y1: 0, z1: 26, c: info.ground });            /* the ground under everything */
  /* the view's fade test needs each tall group's box */
  o.tall.forEach(function (g) {
    var b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9 };
    g.boxes.forEach(function (q) { b.x0 = Math.min(b.x0, q.x0); b.y0 = Math.min(b.y0, q.y0); b.z0 = Math.min(b.z0, q.z0); b.x1 = Math.max(b.x1, q.x1); b.y1 = Math.max(b.y1, q.y1); b.z1 = Math.max(b.z1, q.z1); });
    g.box = b;
  });
  var B = arenas.BOUNDS;
  return {
    key: cx + ',' + cz, cx: cx, cz: cz, ox: ox, oz: oz, kind: 'arena', arena: type,
    boxes: o.boxes, tall: o.tall, signs: o.signs, solids: o.solids,
    bounds: { x0: ox + B.x0, z0: oz + B.z0, x1: ox + B.x1, z1: oz + B.z1 },
    start: { x: ox + arenas.START.x, z: oz + arenas.START.z },
    loc: { type: type, name: def.name, n: def.n, stick: def.stick, x: ox, z: oz,
           spawns: info.spawns.map(function (s) { var q = kit.squeeze(s[0], s[1]); return { x: ox + q[0], z: oz + q[1] }; }) }
  };
}

module.exports = { has: has, build: build };
