/* sim: one fight at one trouble spot. Only the arena, that gang's men and Toofan on foot: no bike, no city, no traffic, no waves.
   The fighting itself is sim/combat, stepped exactly as it always was for Toofan on foot (walk, lock while a move plays or Block is held,
   blows, guards, counters, the finisher). Around it: the arena's walls and props keep everybody in, and the fight ends when the last man is
   down (cleared). Toofan knocked out is never the end: Maa ka Thappad (see revive) puts him back on his feet in the same fight. Plain data, seeded; no graphics, no DOM. */
'use strict';

var CONFIG = require('../data/config');
var rngMod = require('../core/rng');
var combatMod = require('./combat');
var arenagen = require('./arenagen');
var LOC = require('../data/locations');

/* opts: seed, bus, type (the kind of place), lineup (fighter kinds, from sim/lineup) */
function create(opts) {
  var seed = opts.seed >>> 0, type = arenagen.has(opts.type) ? opts.type : 'market', spec = arenagen.build(seed, type, 0, 0);
  var fw = {
    seed: seed, tick: 0, rng: rngMod.createRng(seed), bus: opts.bus || { emit: function () {} },
    type: type, name: LOC.LOCATIONS[type].name, arena: spec, bounds: spec.bounds,
    player: { x: spec.start.x, z: spec.start.z, px: spec.start.x, pz: spec.start.z, face: Math.PI, moving: false, rage: 0, hp: 100, maxHp: 100, stun: 0, guard: false, down: false, invuln: false },
    combat: combatMod.createCombat(), pendingStrikes: [], counters: { attacks: 0, blocks: 0, finishers: 0 },
    attackLock: false, invuln: false, graceT: 0, state: 'fight'                   /* fight | thappad | rise | cleared */
  };
  /* the fight as the brawler always started it at a place: the combat is switched on, then this place's men walk in (one fight, so the
     engagement rules see it as the second wave, as they did when a fight followed the street's opening wave) */
  var c = fw.combat; c.enabled = true; c.wave = 1; c.auto = false; c.lineup = opts.lineup && opts.lineup.length ? opts.lineup.slice() : null;
  var D = LOC.LOCATIONS[type];
  combatMod.startLocation(fw, spec.loc.name, spec.loc.spawns, D.n, D.stick); fw.hadMen = c.enemies.length > 0;
  return fw;
}

/* nobody walks through the props or out of the arena */
var R = 0.35;
function pushOut(o, fw) {
  var sol = fw.arena.solids, i;
  for (i = 0; i < sol.length; i++) {
    var q = sol[i]; if (q.y1 < 0.25) continue;
    var x0 = q.x0 + fw.arena.ox, x1 = q.x1 + fw.arena.ox, z0 = q.z0 + fw.arena.oz, z1 = q.z1 + fw.arena.oz;
    var cx = Math.max(x0, Math.min(x1, o.x)), cz = Math.max(z0, Math.min(z1, o.z)), dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
    if (d >= R) continue;
    if (d < 1e-5) {                                   /* inside the footprint: leave by the nearest side */
      var l = o.x - x0, r = x1 - o.x, t = o.z - z0, b = z1 - o.z, m = Math.min(l, r, t, b);
      if (m === l) o.x = x0 - R; else if (m === r) o.x = x1 + R; else if (m === t) o.z = z0 - R; else o.z = z1 + R;
    } else { o.x = cx + dx / d * R; o.z = cz + dz / d * R; }
  }
  var B = fw.bounds;
  o.x = Math.max(B.x0, Math.min(B.x1, o.x)); o.z = Math.max(B.z0, Math.min(B.z1, o.z));
}

/* Maa ka Thappad: knocked out, the fight stops ('thappad') until the view has played Maa's slaps and calls revive(). Then he rises
   ('rise', RISE ticks): his rock stand, the spark from the sky at SPARK, every goon still standing steps back a pace and stares. Nobody
   fights while that plays. Then the fight carries on, and for GRACE ticks nothing can hurt him. */
var DOWN_BEAT = 40, RISE = 180, SPARK = 48, GRACE = 60;
function revive(fw) {
  if (fw.state !== 'thappad') return false;
  var p = fw.player, c = fw.combat, i;
  p.hp = p.maxHp; p.down = false; p.stun = 0; p.guard = false; c.downT = 0; c.seqId = 0; c.seqT = 0; c.target = 0; fw.pendingStrikes.length = 0;
  fw.state = 'rise'; fw.riseT = 0; fw.awe = [];
  for (i = 0; i < c.enemies.length; i++) {
    var e = c.enemies[i]; if (e.dead || e.st === 'dead') continue;
    var dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (e.st !== 'down' && e.st !== 'getup') { e.st = 'awe'; e.t = 0; e.guarding = false; e.kx = 0; e.kz = 0; }
    fw.awe.push({ id: e.id, ux: dx / d, uz: dz / d, back: Math.max(0, 2.6 - d) + 1.0 });
  }
  fw.bus.emit('fight:rise', {}); return true;
}
function riseStep(fw) {
  var p = fw.player, c = fw.combat, k = fw.riseT, i, j;
  if (k === SPARK) fw.bus.emit('fight:spark', { x: p.x, z: p.z });
  if (k > SPARK && k <= SPARK + 30) {                                /* the spark knocks them back a pace, and they stare */
    for (i = 0; i < fw.awe.length; i++) for (j = 0; j < c.enemies.length; j++) {
      var a = fw.awe[i], e = c.enemies[j]; if (e.id !== a.id || e.st !== 'awe') continue;
      e.px = e.x; e.pz = e.z; e.x += a.ux * a.back / 30; e.z += a.uz * a.back / 30; e.face = Math.atan2(p.x - e.x, p.z - e.z); pushOut(e, fw);
    }
  }
  for (j = 0; j < c.enemies.length; j++) { var q = c.enemies[j]; if (q.st === 'awe') { q.t++; q.px = q.x; q.pz = q.z; } }
  if (++fw.riseT >= RISE) {
    for (j = 0; j < c.enemies.length; j++) { var r = c.enemies[j]; if (r.st === 'awe') { r.st = 'approach'; r.t = 0; r.cd = 40 + j * 12; } }
    fw.state = 'fight'; fw.graceT = GRACE; fw.bus.emit('fight:resume', {});
  }
}

function step(fw, input) {
  if (fw.state === 'rise') { riseStep(fw); fw.tick++; return; }
  if (fw.state !== 'fight') { fw.tick++; return; }
  var p = fw.player, s = input.state, v = CONFIG.PLAYER.walkSpeed / CONFIG.TICK_HZ, c = fw.combat;
  if (fw.graceT > 0) fw.graceT--;
  /* knocked out: a short beat on the floor, then the screen goes black and Maa comes */
  if (p.down && c.downT >= DOWN_BEAT) { fw.state = 'thappad'; fw.thappads = (fw.thappads || 0) + 1; fw.bus.emit('fight:thappad', { type: fw.type, name: fw.name }); fw.tick++; return; }
  p.px = p.x; p.pz = p.z;
  var mx = s.mx, mz = -s.my, m = Math.sqrt(mx * mx + mz * mz);       /* stick up = away from camera = -z */
  var locked = !!fw.attackLock || !!(s.held && s.held.block) || p.stun > 0 || p.down;   /* committed: no walking while a move plays or Block is held */
  p.invuln = !!fw.invuln || fw.graceT > 0;
  p.moving = !locked && m > 0.1;
  if (p.moving) { p.x += mx * v; p.z += mz * v; p.face = Math.atan2(mx, mz); }
  if (s.pressed.attack) { fw.counters.attacks++; fw.bus.emit('action', { type: 'attack' }); }
  if (s.pressed.block) { fw.counters.blocks++; fw.bus.emit('action', { type: 'block' }); }
  if (s.pressed.finisher && p.rage >= 100) { fw.counters.finishers++; p.rage = 0; fw.bus.emit('action', { type: 'finisher' }); }
  combatMod.step(fw, input);
  pushOut(p, fw); for (var i = 0; i < c.enemies.length; i++) if (!c.enemies[i].dead) pushOut(c.enemies[i], fw);
  if (c.enemies.length) fw.hadMen = true;
  if (!p.down && fw.hadMen && !c.enemies.some(function (q) { return !q.dead && q.st !== 'dead'; })) {     /* every man down (or already taken away) */
    fw.state = 'cleared'; c.banner = fw.name + ' cleared'; c.bannerT = 170; fw.bus.emit('fight:clear', { type: fw.type, name: fw.name });
  }
  fw.tick++;
}

/* order-stable fingerprint of the fight */
function hash(fw) {
  var p = fw.player, h = 2166136261 >>> 0, c = fw.combat, i;
  function mix(n) { h ^= (n | 0) & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; }
  function mixf(f) { mix(Math.round(f * 10000)); }
  mix(fw.tick); mixf(p.x); mixf(p.z); mixf(p.face); mix(p.rage); mix(p.hp); mix(p.down ? 1 : 0);
  mix(fw.counters.attacks); mix(fw.counters.blocks); mix(fw.counters.finishers); mix(fw.rng.getState()); mix(c.kills);
  for (i = 0; i < c.enemies.length; i++) { var e = c.enemies[i]; mix(e.id); mixf(e.x); mixf(e.z); mix(e.hp); mix(e.st.length); mix(e.dead ? 1 : 0); }
  return h >>> 0;
}

module.exports = { create: create, step: step, hash: hash, revive: revive, RISE: RISE, SPARK: SPARK, DOWN_BEAT: DOWN_BEAT };
