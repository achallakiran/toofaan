/* modes: the link between the ride and a fight area (Phase 4, M4). Arriving at a trouble spot on the ride opens the brawler (Street) with
   Toofan walking into that kind of place; when the area is clear the game goes back to the ride, where the police take the goons away.
   The brawler itself is not changed: this only places the hero before the fight and listens for the area to be cleared.
   For the kinds of place that have one, the fight is held in a closed arena (sim/arenagen): for the length of the fight the world's
   streaming is swapped for one that builds only that arena, passing traffic is switched off, and the hero and the men are kept inside
   its walls. The open city comes back the moment the fight is over. */
'use strict';

var CONFIG = require('../data/config');
var LOC = require('../data/locations');
var locsMod = require('../sim/citylocs');
var cinecard = require('../view/cinecard');
var combatMod = require('../sim/combat');
var sfxmod = require('../view/sfx');
var streamingMod = require('../sim/streaming');
var arenagen = require('../sim/arenagen');
var arenaview = require('../view/arenaview');
var musicMod = require('../view/music');
var lineupMod = require('../sim/lineup');
var GANGS = require('../data/gangs');
var rngMod = require('../core/rng');

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
  if (arenagen.has(best.type)) {                                       /* the closed arena: swap the ground for the fight */
    m.city = w.streaming;
    w.streaming = streamingMod.createStreaming(w.seed, ctx.bus, arenagen.createGen(best.type, best.cx, best.cz));
    var spec = arenagen.build(w.seed, best.type, best.cx, best.cz);
    w.bounds = spec.bounds; w.traffic.off = true; w.traffic.list.length = 0;
    p.x = spec.start.x; p.z = spec.start.z; p.face = Math.PI;
  } else { p.x = best.cx * S - (ew ? 9 : 0); p.z = best.cz * S - (ew ? 0 : 9); p.face = ew ? Math.PI / 2 : 0; }
  p.px = p.x; p.pz = p.z;
  p.hp = p.maxHp; p.down = false; p.stun = 0;
  w.mounted = false; w.bike.x = p.x + 4000; w.bike.z = p.z; w.bike.speed = 0;               /* Bijli is left on the road: not reachable during the fight */
  w.locs.cleared[best.key] = false; w.locs.active = null;
  /* who turns up: the more places cleared on the ride, the bigger and tougher the crowd */
  var level = 0; if (ctx.ride && ctx.ride.missions) Object.keys(ctx.ride.missions).forEach(function (k) { if (ctx.ride.missions[k] === 'cleared') level++; });
  if (m.level !== undefined) level = m.level;
  var gang = GANGS.GANGS[GANGS.gangOf(best.type)];
  w.combat.lineup = lineupMod.lineup(level, rngMod.createRng(rngMod.hash32(w.seed ^ 0x51f1, best.cx * 7 + level, best.cz)), gang && gang.mix);
  m.lineup = w.combat.lineup.slice();
  w.locs.next = { key: best.key, type: best.type, name: LOC.LOCATIONS[best.type].name, x: best.cx * S, z: best.cz * S, dist: 15 };
  w.streaming.update(p.x, p.z);
  m.brawlKey = best.key;
  return best;
}

/* after the brawler has started: no opening wave, just this place's fight; when it is cleared, back to the ride */
function watch(ctx, scope, m) {
  var w = ctx.world, timers = [];
  w.combat.enemies.length = 0; w.combat.auto = false;
  var music = musicMod.createMusic(sfxmod.createSfx()); music.setTrack('arena');
  scope.add(function () { timers.forEach(clearTimeout); sfxmod.createSfx().engineOff(); });
  if (m.city) {
    /* the arena's tall pieces and signs, faded whenever one stands between the camera and the fight */
    var spec = w.streaming.specAt(w.player.x, w.player.z - 6) || w.streaming.specAt(w.player.x, w.player.z), av = spec && spec.kind === 'arena' && ctx.view && ctx.view.scene ? arenaview.createArenaView(ctx.view.scene, spec) : null;
    var hero = av && new THREE.Vector3(), hero2 = av && new THREE.Vector3(), foe = av && new THREE.Vector3();
    var off = av ? ctx.view.onFrame(function (camera, dt) {
      var p = w.player, t = [hero.set(p.x, 1.0, p.z), hero2.set(p.x, 1.7, p.z)], best = null, bd = 9, i, l = w.combat.enemies;
      for (i = 0; i < l.length; i++) { var e = l[i]; if (e.dead || e.st === 'dead') continue; var d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } }
      if (best) t.push(foe.set(best.x, 1.3, best.z));
      av.fade(camera, t, dt);
    }) : null;
    ctx.debug.arena = av;
    scope.add(function () {
      if (off) off(); if (av) av.dispose(); ctx.debug.arena = null;
      w.streaming = m.city; m.city = null; w.bounds = null; w.traffic.off = false;     /* the open city again */
    });
  }
  /* if the place's fight has not begun a moment after arriving (the street may still be loading), start it here */
  timers.push(setTimeout(function () {
    var L = w.locs, c = w.combat; if (L.active || c.enemies.some(function (q) { return !q.dead && q.st !== 'dead'; })) return;
    var sp = w.streaming.specAt(L.next ? L.next.x : w.player.x, L.next ? L.next.z : w.player.z), D = LOC.LOCATIONS[m.type] || LOC.LOCATIONS.market, p = w.player, pts, i;
    if (sp && sp.loc) { pts = sp.loc.spawns; L.active = { key: m.brawlKey, name: sp.loc.name, x: sp.loc.x, z: sp.loc.z }; }
    else { pts = []; for (i = 0; i < 6; i++) pts.push({ x: p.x + Math.cos(i) * 8, z: p.z + Math.sin(i) * 8 }); L.active = { key: m.brawlKey, name: D.name, x: p.x, z: p.z }; }
    combatMod.startLocation(w, L.active.name, pts, D.n, D.stick); ctx.bus.emit('location:start', { key: m.brawlKey, name: L.active.name });
  }, 1500));
  scope.add(ctx.bus.on('location:clear', function (e) {
    if (e.key !== m.brawlKey) return;
    music.setTrack('sting');
    timers.push(setTimeout(function () { cinecard.show({ title: 'POLICE AA GAYI!', sub: e.name + ' cleared', ms: 2400 }); }, 1600));
    timers.push(setTimeout(function () { ctx.go('ride', { after: 'arrest', key: m.type }); }, 2100));
  }));
}

module.exports = { place: place, watch: watch };
