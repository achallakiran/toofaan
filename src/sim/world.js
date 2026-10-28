/* sim: the game state and its per-tick update. No graphics, no audio, no DOM.
   Phase 0 content is a walking placeholder player so the loop, input and streaming can be tested. */
'use strict';

var CONFIG = require('../data/config');
var rngMod = require('../core/rng');
var streamingMod = require('./streaming');
var combatMod = require('./combat');
var citygen = require('./citygen');
var bikeMod = require('./bike');
var BIKE = require('../data/bike');

function createWorld(seed, bus) {
  var world = {
    seed: seed >>> 0,
    tick: 0,
    rng: rngMod.createRng(seed),
    player: { x: 0, z: 0, px: 0, pz: 0, face: 0, moving: false, rage: 0, hp: 100, maxHp: 100, stun: 0, guard: false, down: false, invuln: false },
    combat: combatMod.createCombat(), pendingStrikes: [],
    counters: { attacks: 0, blocks: 0, finishers: 0 },
    streaming: streamingMod.createStreaming(seed, bus, citygen.generate),
    bike: bikeMod.createBike(1.7, -1.2, Math.PI / 2), mounted: false, mountTick: -999,
    bus: bus
  };
  world.streaming.update(0, 0);
  return world;
}

/* the nearest living man within reach of the saddle, or null */
function foeInReach(world, r) {
  var l = world.combat.enemies, b = world.bike, best = null, bd = r, i;
  for (i = 0; i < l.length; i++) {
    var e = l[i]; if (e.dead || e.st === 'dead' || e.st === 'getup') continue;
    var d = Math.hypot(e.x - b.x, e.z - b.z); if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function alertNear(world) {
  var l = world.combat.enemies, p = world.player, i;
  for (i = 0; i < l.length; i++) if (l[i].st === 'windup' && Math.hypot(l[i].x - p.x, l[i].z - p.z) < 4) return true;
  return false;
}

/* riding. Stick: throttle, brake, steer. Attack: a tap fights (when a man is in reach), a hold boosts. Block: hold guards, a tap
   with an alert showing counters, and at a standstill with nobody about it parks the bike and he steps off. */
function rideStep(world, input) {
  var p = world.player, s = input.state, b = world.bike, env = world.streaming, dt = 1 / CONFIG.TICK_HZ, c = world.combat;
  p.px = p.x; p.pz = p.z; p.moving = false;
  var hp0 = p.hp;
  if (!s.held.attack) world.atkArmed = true;
  world.atkHold = s.held.attack ? (world.atkHold || 0) + 1 : 0;
  var foe = s.pressed.attack && world.atkArmed && !p.down && p.stun <= 0 ? foeInReach(world, 2.7) : null;
  var tapped = false;
  if (foe) {                                           /* a man beside him: Attack is a blow, and this hold is not a boost */
    c.target = foe.id; world.atkArmed = false; tapped = true;
    var rel = Math.atan2(foe.x - b.x, foe.z - b.z) - b.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); world.rideSide = rel;
    world.counters.attacks++; world.bus.emit('action', { type: 'attack' });
  } else if (s.released.attack && world.atkArmed && !p.down && p.stun <= 0) {
    var f2 = foeInReach(world, 2.7);                    /* a short tap that found nobody on the press: a late blow if he has closed in */
    if (f2 && world.tick - (world.lastRelease || -99) > 0) { c.target = f2.id; var r2 = Math.atan2(f2.x - b.x, f2.z - b.z) - b.h; world.rideSide = Math.atan2(Math.sin(r2), Math.cos(r2)); world.bus.emit('action', { type: 'attack' }); }
  }
  var boost = !!s.held.attack && world.atkArmed && world.atkHold >= BIKE.BOOST_HOLD;
  var alert = alertNear(world);
  bikeMod.step(b, { throttle: Math.max(0, s.my), brake: Math.max(0, -s.my), steer: s.mx, reverse: s.my < -0.3, boost: boost, drift: false }, env, dt, world.bus);
  p.x = b.x; p.z = b.z; p.face = b.h;
  if (s.pressed.block && !alert && !b.air && Math.abs(b.speed) < BIKE.PARK_SPEED && world.tick - world.mountTick > 30 && !menNear(world, p, 3.6)) {
    b.speed = 0; world.mounted = false; input.consume('attack', 99); world.atkArmed = false;
    p.x = b.x + Math.cos(b.h) * 1.0; p.z = b.z - Math.sin(b.h) * 1.0;     /* steps off to the bike's left */
    p.guard = false;
    world.bus.emit('ride:park', { x: b.x, z: b.z });
    world.streaming.update(p.x, p.z); world.tick++; return;
  }
  combatMod.step(world, input);
  if (p.hp < hp0) b.speed *= 0.82;                    /* a blow rocks the bike */
  p.x = b.x; p.z = b.z;
  world.streaming.update(p.x, p.z);
  world.tick++;
}

/* a man right beside him means the button is for fighting; one further off does not stop him climbing on */
function menNear(world, p, r) {
  r = r || BIKE.MOUNT_BLOCK;
  var l = world.combat.enemies;
  for (var i = 0; i < l.length; i++) if (!l[i].dead && l[i].st !== 'dead' && Math.hypot(l[i].x - p.x, l[i].z - p.z) < r) return true;
  return false;
}
/* how far he stands from the bike's body (a line from rear wheel to front wheel), not from its middle */
function bikeDistance(world) {
  var b = world.bike, p = world.player, fx = Math.sin(b.h), fz = Math.cos(b.h), dx = p.x - b.x, dz = p.z - b.z;
  var t = Math.max(-BIKE.HALF_LEN, Math.min(BIKE.HALF_LEN, dx * fx + dz * fz));
  return Math.hypot(dx - fx * t, dz - fz * t);
}
function canMount(world) {
  var p = world.player;
  return !world.mounted && !p.down && p.stun <= 0 && bikeDistance(world) < BIKE.MOUNT_REACH && !menNear(world, p);
}

function step(world, input) {
  if (world.mounted) { rideStep(world, input); return; }
  var p = world.player, s = input.state, v = CONFIG.PLAYER.walkSpeed / CONFIG.TICK_HZ;
  p.px = p.x; p.pz = p.z;
  world.bike.speed = 0;
  if (canMount(world) && (s.pressed.attack || input.consume('attack', 8))) {
    input.consume('attack', 99); world.mounted = true; world.mountTick = world.tick; world.atkArmed = false; p.guard = false; p.x = world.bike.x; p.z = world.bike.z; p.face = world.bike.h;
    world.bus.emit('ride:mount', { x: world.bike.x, z: world.bike.z });
    world.streaming.update(p.x, p.z); world.tick++; return;
  }
  var mx = s.mx, mz = -s.my;                       /* stick up = away from camera = -z */
  var m = Math.sqrt(mx * mx + mz * mz);
  /* committed to an action: no walking or turning while a move plays or Block is held */
  var locked = !!world.attackLock || !!(s.held && s.held.block) || p.stun > 0 || p.down;
  p.invuln = !!world.invuln;
  p.moving = !locked && m > 0.1;
  if (p.moving) {
    p.x += mx * v; p.z += mz * v;
    p.face = Math.atan2(mx, mz);
  }
  /* the parked bike is solid: three discs along its body push him out */
  var bk = world.bike, bfx = Math.sin(bk.h), bfz = Math.cos(bk.h), bo, SOL = [-0.7, 0, 0.7];
  for (bo = 0; bo < 3; bo++) {
    var cx = bk.x + bfx * SOL[bo], cz = bk.z + bfz * SOL[bo], ddx = p.x - cx, ddz = p.z - cz, dd = Math.hypot(ddx, ddz), need = BIKE.SOLID_R;
    if (dd < need) { if (dd < 1e-4) { ddx = Math.cos(bk.h); ddz = -Math.sin(bk.h); dd = 1; } p.x = cx + ddx / dd * need; p.z = cz + ddz / dd * need; }
  }
  /* placeholder actions: they only prove that buttons reach the simulation and the rage gate works */
  if (s.pressed.attack) { world.counters.attacks++; if (!world.combat.enabled) p.rage = Math.min(100, p.rage + 12); world.bus.emit('action', { type: 'attack' }); }
  if (s.pressed.block) { world.counters.blocks++; world.bus.emit('action', { type: 'block' }); }
  if (s.pressed.finisher && p.rage >= 100) { world.counters.finishers++; p.rage = 0; world.bus.emit('action', { type: 'finisher' }); }
  combatMod.step(world, input);
  world.streaming.update(p.x, p.z);
  world.tick++;
}

/* order-stable fingerprint of everything that must be identical between two runs */
function hash(world) {
  var p = world.player, h = 2166136261 >>> 0;
  function mix(n) { h ^= (n | 0) & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; }
  function mixf(f) { mix(Math.round(f * 10000)); }
  mix(world.tick); mixf(p.x); mixf(p.z); mixf(p.face); mix(p.rage);
  mix(world.counters.attacks); mix(world.counters.blocks); mix(world.counters.finishers);
  mix(world.rng.getState()); mixf(world.bike.x); mixf(world.bike.z); mixf(world.bike.h); mixf(world.bike.speed); mix(world.mounted ? 1 : 0);
  var keys = world.streaming.loadedKeys();
  for (var i = 0; i < keys.length; i++) for (var j = 0; j < keys[i].length; j++) mix(keys[i].charCodeAt(j));
  return h >>> 0;
}

module.exports = { canMount: canMount, bikeDistance: bikeDistance, createWorld: createWorld, step: step, hash: hash, startFight: combatMod.begin };
