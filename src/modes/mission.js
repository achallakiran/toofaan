/* modes: the link between the ride and a fight area (Phase 4, M4). Arriving at a trouble spot on the ride opens the brawler (Street) with
   Toofan walking into that kind of place; when the area is clear the game goes back to the ride, where the police take the goons away.
   The brawler itself is not changed: this only places the hero before the fight and listens for the area to be cleared. */
'use strict';

var CONFIG = require('../data/config');
var LOC = require('../data/locations');
var locsMod = require('../sim/citylocs');
var cinecard = require('../view/cinecard');

function mod3(n) { return ((n % 3) + 3) % 3; }

/* find the nearest uncleared place of this kind in the brawler's city and stand Toofan on the road just short of it, on foot */
function place(ctx, m) {
  var w = ctx.world, S = CONFIG.CHUNK_SIZE, best = null, bd = 1e9, cx, cz;
  for (cx = -14; cx <= 14; cx++) for (cz = -14; cz <= 14; cz++) {
    var t = locsMod.typeAt(w.seed, cx, cz); if (!t) continue; var key = cx + ',' + cz;
    var d = Math.hypot(cx, cz) + (t === m.type ? 0 : 1000) + (w.locs.cleared[key] ? 500 : 0);
    if (d < bd) { bd = d; best = { cx: cx, cz: cz, key: key, type: t }; }
  }
  if (!best) return null;
  var ew = mod3(best.cz) === 0, p = w.player;
  p.x = best.cx * S - (ew ? 9 : 0); p.z = best.cz * S - (ew ? 0 : 9); p.px = p.x; p.pz = p.z; p.face = ew ? Math.PI / 2 : 0;
  p.hp = p.maxHp; p.down = false; p.stun = 0;
  w.mounted = false; w.bike.x = p.x + 4000; w.bike.z = p.z; w.bike.speed = 0;               /* Bijli is left on the road: not reachable during the fight */
  w.locs.cleared[best.key] = false; w.locs.active = null;
  w.locs.next = { key: best.key, type: best.type, name: LOC.LOCATIONS[best.type].name, x: best.cx * S, z: best.cz * S, dist: 15 };
  w.streaming.update(p.x, p.z);
  m.brawlKey = best.key;
  return best;
}

/* after the brawler has started: no opening wave, just this place's fight; when it is cleared, back to the ride */
function watch(ctx, scope, m) {
  var w = ctx.world, timers = [];
  w.combat.enemies.length = 0; w.combat.auto = false;
  scope.add(function () { timers.forEach(clearTimeout); });
  scope.add(ctx.bus.on('location:clear', function (e) {
    if (e.key !== m.brawlKey) return;
    timers.push(setTimeout(function () { cinecard.show({ title: 'POLICE AA GAYI!', sub: e.name + ' cleared', ms: 2400 }); }, 1600));
    timers.push(setTimeout(function () { ctx.go('ride', { after: 'arrest', key: m.type }); }, 2100));
  }));
}

module.exports = { place: place, watch: watch };
