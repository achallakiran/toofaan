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
    bike: bikeMod.createBike(2.0, -1.6, Math.PI / 2), mounted: false,
    bus: bus
  };
  world.streaming.update(0, 0);
  return world;
}

/* riding: the stick steers and throttles, Block brakes (and drifts with the stick held across), Attack boosts, or rolls in the air;
   at a standstill Attack parks the bike and he steps off */
function rideStep(world, input) {
  var p = world.player, s = input.state, b = world.bike, env = world.streaming, dt = 1 / CONFIG.TICK_HZ;
  p.px = p.x; p.pz = p.z; p.moving = false;
  var blk = !!s.held.block;
  bikeMod.step(b, { throttle: Math.max(0, s.my), brake: Math.max(Math.max(0, -s.my), blk ? 0.55 : 0), steer: s.mx, reverse: s.my < -0.3 && !blk, boost: !!s.held.attack, drift: blk, stunt: !!s.pressed.attack }, env, dt, world.bus);
  p.x = b.x; p.z = b.z; p.face = b.h;
  if (s.pressed.attack && !b.air && Math.abs(b.speed) < BIKE.PARK_SPEED) {
    b.speed = 0; world.mounted = false;
    p.x = b.x + Math.cos(b.h) * 1.0; p.z = b.z - Math.sin(b.h) * 1.0;     /* steps off to the bike's left */
    world.bus.emit('ride:park', { x: b.x, z: b.z });
  }
  world.streaming.update(p.x, p.z);
  world.tick++;
}

/* a man within reach means the button is for fighting, not for climbing on the bike */
function menNear(world, p) {
  var l = world.combat.enemies;
  for (var i = 0; i < l.length; i++) if (!l[i].dead && l[i].st !== 'dead' && Math.hypot(l[i].x - p.x, l[i].z - p.z) < 5) return true;
  return false;
}

function step(world, input) {
  if (world.mounted) { rideStep(world, input); return; }
  var p = world.player, s = input.state, v = CONFIG.PLAYER.walkSpeed / CONFIG.TICK_HZ;
  p.px = p.x; p.pz = p.z;
  world.bike.speed = 0;
  if (s.pressed.attack && !world.attackLock && !p.down && p.stun <= 0 && Math.hypot(world.bike.x - p.x, world.bike.z - p.z) < BIKE.MOUNT_RANGE && !menNear(world, p)) {
    world.mounted = true; p.guard = false; p.x = world.bike.x; p.z = world.bike.z; p.face = world.bike.h;
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

module.exports = { createWorld: createWorld, step: step, hash: hash, startFight: combatMod.begin };
