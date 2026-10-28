/* sim: the game state and its per-tick update. No graphics, no audio, no DOM.
   Phase 0 content is a walking placeholder player so the loop, input and streaming can be tested. */
'use strict';

var CONFIG = require('../data/config');
var rngMod = require('../core/rng');
var streamingMod = require('./streaming');
var combatMod = require('./combat');

function createWorld(seed, bus) {
  var world = {
    seed: seed >>> 0,
    tick: 0,
    rng: rngMod.createRng(seed),
    player: { x: 0, z: 0, px: 0, pz: 0, face: 0, moving: false, rage: 0, hp: 100, maxHp: 100, stun: 0, guard: false, down: false, invuln: false },
    combat: combatMod.createCombat(), pendingStrikes: [],
    counters: { attacks: 0, blocks: 0, finishers: 0 },
    streaming: streamingMod.createStreaming(seed, bus),
    bus: bus
  };
  world.streaming.update(0, 0);
  return world;
}

function step(world, input) {
  var p = world.player, s = input.state, v = CONFIG.PLAYER.walkSpeed / CONFIG.TICK_HZ;
  p.px = p.x; p.pz = p.z;
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
  mix(world.rng.getState());
  var keys = world.streaming.loadedKeys();
  for (var i = 0; i < keys.length; i++) for (var j = 0; j < keys[i].length; j++) mix(keys[i].charCodeAt(j));
  return h >>> 0;
}

module.exports = { createWorld: createWorld, step: step, hash: hash, startFight: combatMod.begin };
