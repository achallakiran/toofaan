/* sim: the fight. Enemies, damage, blocking and rage run on the fixed tick with seeded randomness.
   The view reports which player strikes landed (pendingStrikes) and reads the events this module emits. */
'use strict';

var enemiesData = require('../data/enemies');
var moves = require('../data/moves');

var GH = enemiesData.GUARD_HITS, GCOOL = enemiesData.GUARD_COOLDOWN, GBREAK = enemiesData.GUARD_BREAK;
var TPS = 60, KINDS = enemiesData.KINDS, STRIKES = enemiesData.STRIKES, RAGE = enemiesData.RAGE;
var TIMED_WINDOW = 12;

function createCombat() {
  return { enabled: false, target: 0, engaged: {}, windGap: 0, live: 0, enemies: [], nextId: 1, wave: 0, kills: 0, combo: 0, comboT: 0, guardHits: 0, guardIdle: 0, seqId: 0, seqT: 0, downT: 0, banner: '' , bannerT: 0 };
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function addRage(p, n) { p.rage = Math.min(100, p.rage + n); }

function spawn(world, kind, x, z) {
  var c = world.combat, K = KINDS[kind] || KINDS.thug; if (!KINDS[kind]) kind = 'thug';
  c.enemies.push({ id: c.nextId++, kind: kind, x: x, z: z, px: x, pz: z, face: 0, hp: K.hp, maxHp: K.hp, st: 'approach', t: 0, cd: 20 + Math.floor(world.rng.next() * 60),
    kx: 0, kz: 0, phase: 0, canBlock: world.rng.next() < K.blockChance, guarding: false, guardHits: 0, guardCool: 0, guardTimer: 0, blockT: 99, lastMove: '', hitN: 0 });
}

/* a fight at a place: `n` men (`stick` of them armed) appear at the given points around the hero's arrival */
function startLocation(world, name, points, n, stick) {
  var c = world.combat, i;
  c.wave++;
  var kinds = c.lineup; c.lineup = null;                          /* a lineup set by the mission (fighter types, difficulty ramp) wins */
  if (kinds && kinds.length) n = kinds.length;
  for (i = 0; i < n; i++) { var pt = points[i % points.length]; spawn(world, kinds ? kinds[i] : (i >= n - stick ? 'stick' : 'thug'), pt.x + (i >= points.length ? 0.9 : 0), pt.z + (i >= points.length ? 0.6 : 0)); }
  c.banner = name; c.bannerT = 170;
}

/* who is allowed to close in: one man at a time (sometimes a pair), the nearest, and a man keeps his place while he is fighting */
function limit(world) { return world.combat.wave >= 3 ? 3 : 2; }
function engage(world) {
  var c = world.combat, p = world.player, list = [], prev = c.engaged || {}, k = limit(world) + (c.seqId ? 1 : 0), i, next = {}, n = 0;      /* the dazed man holds a slot but is not attacking, so one more may join in */
  for (i = 0; i < c.enemies.length; i++) { var e = c.enemies[i]; if (!e.dead && e.st !== 'dead' && e.st !== 'down' && e.st !== 'getup') list.push(e); }
  for (i = 0; i < list.length; i++) if (dist(list[i], p) < 2.4) { next[list[i].id] = 1; n++; }               /* anyone already on top of the hero is in the fight, he never backs off */
  for (i = 0; i < list.length && n < k; i++) if (prev[list[i].id] && list[i].st !== 'approach' && !next[list[i].id]) { next[list[i].id] = 1; n++; }   /* a man mid-attack keeps his place */
  list.sort(function (a, b) { return (dist(a, p) - dist(b, p)) || (a.id - b.id); });
  for (i = 0; i < list.length && n < k; i++) if (!next[list[i].id]) { next[list[i].id] = 1; n++; }
  c.engaged = next; c.live = list.length;
}

function findEnemy(c, id) { if (!id) return null; for (var i = 0; i < c.enemies.length; i++) if (c.enemies[i].id === id) return c.enemies[i]; return null; }
/* the stick decides: the enemy closest to the direction held, within 4 m; with the stick idle the current lock, else the nearest */
function pickTarget(c, p, mx, mz, cur) {
  var best = null, bs = -1e9, stick = Math.hypot(mx, mz) > 0.3, i;
  for (i = 0; i < c.enemies.length; i++) {
    var e = c.enemies[i]; if (e.dead || e.st === 'dead' || e.st === 'getup' || e.st === 'down') continue;
    var d = dist(e, p); if (d > 4) continue;
    var score = -d;
    if (stick) { var a = Math.abs(angDiff(Math.atan2(e.x - p.x, e.z - p.z), Math.atan2(mx, mz))); if (a > 1.05) continue; score = -a * 3 - d * 0.4; }
    else if (cur && e === cur) score += 2;
    if (score > bs) { bs = score; best = e; }
  }
  return best;
}

/* the broken-guard sequence: while it runs the opened man is held in his daze and nobody else starts an attack */
function held(c, e) { return c.seqId === e.id && c.seqT > 0; }

function attackers(c) { var n = 0; for (var i = 0; i < c.enemies.length; i++) { var s = c.enemies[i].st; if (s === 'windup' || s === 'strike') n++; } return n; }

function hurtEnemy(world, e, dmg, from, spec, label, last) {
  var c = world.combat, p = world.player;
  e.hp -= dmg; e.guarding = false; e.guardHits = 0; c.combo++; c.comboT = 150;
  var dx = e.x - from.x, dz = e.z - from.z, d = Math.hypot(dx, dz) || 1, k = (spec.down || e.hp <= 0 || last || spec.knock > 2) ? spec.knock * 3.2 * 0.45 : 0;
  var mass = (KINDS[e.kind] && KINDS[e.kind].mass) || 1;
  e.kx = dx / d * k / TPS * 0.8 / mass; e.kz = dz / d * k / TPS * 0.8 / mass;      /* he stays where he is and reacts; only the blow that drops him slides him a little */
  e.lastMove = label; e.hitN = (e.hitN || 0) + 1; e.kd = 0;     /* initial knock speed (m per tick), decays */
  var killed = e.hp <= 0;
  if ((killed || last) && label !== 'counter' && e.st !== 'down') { e.kx = dx / d * 0.25; e.kz = dz / d * 0.25; e.thrown = true; }       /* the last blow of the string throws him to the ground */
  var floors = spec.down && label !== 'kick' && label !== 'roundhouse';      /* a kick in the string only drops him when it is the last blow */
  if (mass > 1 && !killed && label !== 'counter' && e.hp > e.maxHp * 0.35) { floors = false; last = false; e.thrown = false; e.kx *= 0.3; e.kz *= 0.3; }   /* the heavy stays on his feet until he is worn down */
  e.st = (floors || killed || last) ? 'down' : 'hurt'; e.t = 0; e.dead = killed;
  if (c.seqId === e.id) { if (e.st === 'down') { c.seqId = 0; c.seqT = 0; } else c.seqT = 130; }
  addRage(p, RAGE.hit + (label === 'counter' ? RAGE.counterHit : 0));
  world.bus.emit('hit', { id: e.id, x: e.x, z: e.z, power: Math.min(1, dmg / 3), down: e.st === 'down', killed: killed, move: label, high: !!spec.high });
  if (killed) {
    c.kills++; world.bus.emit('ko', { id: e.id, x: e.x, z: e.z });
    var others = 0; for (var oi = 0; oi < c.enemies.length; oi++) { var o2 = c.enemies[oi]; if (o2 !== e && !o2.dead && o2.st !== 'dead') others++; }
    if (!others) world.bus.emit('lastKo', { id: e.id, x: e.x, z: e.z });          /* the last man of the huddle: the view plays its finishing shot */
  }
}

/* the hero's strike lands: called from step() for every strike the view queued */
function playerStrike(world, entry) {
  var move = typeof entry === 'string' ? entry : entry.move, last = typeof entry === 'string' ? false : !!entry.last, direct = move === 'counterCross';
  var p = world.player, spec = STRIKES[move], mv = moves.MOVES[move], c = world.combat;
  if (!spec || !mv) return;
  var perHit = mv.damage / ((mv.hits && mv.hits.length) || 1), counter = !!mv.counter, best = null, bd = 1e9, i;
  for (i = 0; i < c.enemies.length; i++) {
    var e = c.enemies[i];
    if (e.dead || e.st === 'dead' || e.st === 'getup' || (e.st === 'down' && !counter)) continue;     /* counters keep hitting enemies on the floor */
    var d = dist(e, p), K = KINDS[e.kind];
    if (d > spec.reach + K.radius) continue;
    if (spec.arc < 180) {
      var a = Math.atan2(e.x - p.x, e.z - p.z);
      if (Math.abs(angDiff(a, p.face)) > spec.arc * Math.PI / 180) continue;
    }
    if (counter) { hurtEnemy(world, e, perHit * 1.6, p, spec, 'counter', last); continue; }
    if (e.id === c.target) { best = e; bd = -1; }                           /* a normal blow hits the man you locked on to */
    else if (d < bd) { bd = d; best = e; }                                 /* otherwise the nearest in front */
  }
  if (!best) return;
  if (!direct && best.guarding && Math.abs(angDiff(Math.atan2(p.x - best.x, p.z - best.z), best.face)) < 75 * Math.PI / 180) {     /* he sees it coming: the blow lands on his arms */
    best.guardHits++; best.blockT = 0; best.guardTimer = 0;
    var KB = KINDS[best.kind], broke = best.guardHits >= (KB.guardHits || GH) || (KB.kickBreaks && (spec.down || /kick|roundhouse/i.test(move)));
    world.bus.emit('enemyBlock', { move: move, id: best.id, x: best.x, z: best.z, broke: broke, high: !!spec.high });
    var bx = best.x - p.x, bz = best.z - p.z, bl = Math.hypot(bx, bz) || 1; best.x += bx / bl * 0.06; best.z += bz / bl * 0.06;
    if (broke) { c.seqId = best.id; c.seqT = 170; best.st = 'guardbreak'; best.t = 0; best.guardHits = 0; best.guardCool = GCOOL; best.guarding = false; best.kx = bx / bl * 0.05; best.kz = bz / bl * 0.05; }
    return;
  }
  hurtEnemy(world, best, perHit, p, spec, direct ? 'counterCross' : (spec.label || move), last);
}

function enemyStrike(world, e, input) {
  var p = world.player, K = KINDS[e.kind], c = world.combat, s = input.state;
  if (p.invuln || p.down) return;
  if (dist(e, p) > K.reach + 0.35) { world.bus.emit('whiff', { id: e.id }); return; }
  if (K.ranged) world.bus.emit('throw', { id: e.id, x: e.x, z: e.z, tx: p.x, tz: p.z });
  var toE = Math.atan2(e.x - p.x, e.z - p.z), front = Math.abs(angDiff(toE, p.face)) < 80 * Math.PI / 180;
  var guarding = !!p.guard && front && K.blockable;
  if (guarding) {
    if (s.heldTicks.block <= TIMED_WINDOW) {                     /* timed block: counter */
      addRage(p, RAGE.timedBlock); c.guardHits = 0;
      world.bus.emit('block', { timed: true, id: e.id, x: p.x, z: p.z });
      var near = 0; for (var q = 0; q < c.enemies.length; q++) { var o = c.enemies[q]; if (!o.dead && o.st !== 'dead' && dist(o, p) < 2.8) near++; }
      world.bus.emit('counter', { id: e.id, multi: near >= 2 });
      e.st = 'hurt'; e.t = 0; e.kx = 0; e.kz = 0; e.stunBy = 'counter';
      return;
    }
    c.guardHits++; addRage(p, RAGE.block);
    if (c.guardHits >= 2) {                                      /* guard breaks on the second hit */
      c.guardHits = 0; p.stun = 55; p.hp -= K.damage * 0.5;
      world.bus.emit('guardbreak', { id: e.id });
    } else {
      world.bus.emit('block', { timed: false, id: e.id, x: p.x, z: p.z });
    }
    var dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1; p.x += dx / d * 0.12; p.z += dz / d * 0.12;
    return;
  }
  p.hp -= K.damage; p.stun = 26; addRage(p, RAGE.hurt); c.combo = 0;
  var hx = p.x - e.x, hz = p.z - e.z, hd = Math.hypot(hx, hz) || 1; p.x += hx / hd * 0.25; p.z += hz / hd * 0.25;
  world.bus.emit('playerHurt', { id: e.id, damage: K.damage, unblockable: !K.blockable });
}

function stepEnemy(world, e, input) {
  var p = world.player, K = KINDS[e.kind], c = world.combat;
  e.px = e.x; e.pz = e.z; e.t++;
  if (e.guardCool > 0) e.guardCool--;
  e.blockT = (e.blockT === undefined ? 99 : e.blockT + 1);
  if (e.guardHits > 0 && ++e.guardTimer > 150) e.guardHits = 0;       /* he steadies himself if you stop pressing */
  var dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 0.0001;
  if (e.kx || e.kz) { e.x += e.kx; e.z += e.kz; e.kx *= 0.86; e.kz *= 0.86; if (Math.abs(e.kx) + Math.abs(e.kz) < 0.0004) { e.kx = 0; e.kz = 0; } }
  switch (e.st) {
    case 'approach': {
      e.face = Math.atan2(dx, dz);
      var eng = !!c.engaged[e.id], want = K.reach * 0.8, sp;
      e.guarding = e.canBlock && e.guardCool <= 0 && d < 3.2 && !p.down;
      if (eng) {
        if (K.keep && d < K.keep - 1.2) { sp = K.speed / TPS; e.x -= dx / d * sp; e.z -= dz / d * sp; e.phase += sp; e.moving = true; }   /* the thrower backs away to throw */
        else if (d > (K.keep || want)) { sp = K.speed / TPS; e.x += dx / d * sp; e.z += dz / d * sp; e.phase += sp; e.moving = true; } else e.moving = false;
        if (e.cd > 0) e.cd--;
        else if (d <= K.reach && attackers(c) < limit(world) && c.windGap <= 0 && !p.down && !(e.guarding && world.attackLock && c.target === e.id)) {     /* a guarder keeps his arms up while the hero is swinging */ e.st = 'windup'; e.t = 0; c.windGap = 28 + Math.floor(world.rng.next() * 20); world.bus.emit('windup', { id: e.id, blockable: K.blockable }); }
      } else {
        /* waiting their turn: hold a ring round the hero and circle slowly */
        var ring = 3.6, cx = -dz / d, cz = dx / d, dir = (e.id % 2) ? 1 : -1; e.moving = true;
        if (d > ring + 0.7) { sp = K.speed * 0.8 / TPS; e.x += dx / d * sp; e.z += dz / d * sp; }
        else if (d < ring - 0.5) { sp = K.speed * 0.5 / TPS; e.x -= dx / d * sp; e.z -= dz / d * sp; }
        else { sp = K.speed * 0.3 / TPS; e.x += cx * sp * dir; e.z += cz * sp * dir; }
        e.phase += sp; if (e.cd < 24) e.cd = 24;
      }
      break;
    }
    case 'windup':
      e.guarding = false;
      e.face = Math.atan2(dx, dz); e.aimD = d;
      if (e.t >= K.windup * TPS) { e.st = 'strike'; e.t = 0; enemyStrike(world, e, input); }
      break;
    case 'strike':
      if (e.t >= 8) {
        if (K.twice && !e.second && !p.down) { e.second = true; e.st = 'windup'; e.t = Math.floor(K.windup * TPS * 0.45); world.bus.emit('windup', { id: e.id, blockable: K.blockable, second: true }); }   /* the kicker's second kick comes quick */
        else { e.second = false; e.st = 'recover'; e.t = 0; }
      }
      break;
    case 'recover': e.guarding = e.canBlock && e.guardCool <= 0 && e.t >= 14 && d < 3.2 && !p.down; if (e.t >= K.recover * TPS) { e.st = 'approach'; e.t = 0; e.cd = 10 + Math.floor(world.rng.next() * 28); } break;
    case 'hurt': if (e.t >= 34 && !held(c, e)) { e.st = 'approach'; e.t = 0; e.cd = 12 + Math.floor(world.rng.next() * 25); } break;
    case 'down':
      if (e.t >= (e.dead ? 70 : 78)) { if (e.dead) { e.st = 'dead'; e.t = 0; } else { e.st = 'getup'; e.t = 0; } }
      break;
    case 'guardbreak': e.guarding = false; if (e.t >= GBREAK && !held(c, e)) { e.st = 'approach'; e.t = 0; e.cd = 14; } break;
    case 'getup': e.thrown = false; if (e.t >= 72) {          /* a full get-up: side, hand, knee, up, shake it off (1.2 s) */ e.st = 'approach'; e.t = 0; e.cd = 30; } break;
    case 'dead': break;
  }
}

function separate(c, p) {
  var i, j, a, b;
  for (i = 0; i < c.enemies.length; i++) {
    a = c.enemies[i]; if (a.st === 'dead') continue;
    for (j = i + 1; j < c.enemies.length; j++) {
      b = c.enemies[j]; if (b.st === 'dead') continue;
      var dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = 0.85;
      if (d < m && d > 0.0001) { var push = (m - d) / 2 / d; a.x -= dx * push; a.z -= dz * push; b.x += dx * push; b.z += dz * push; }
    }
    var px = a.x - p.x, pz = a.z - p.z, pd = Math.hypot(px, pz);
    if (a.st !== 'down' && pd < 0.75 && pd > 0.0001) { var pp = (0.75 - pd) / pd; a.x += px * pp; a.z += pz * pp; }
  }
}

function step(world, input) {
  var c = world.combat, p = world.player, s = input.state;
  if (!c.enabled) return;
  p.guard = !!(s.held.block && !world.attackLock && p.stun <= 0 && !p.down);
  if (p.stun > 0) p.stun--;
  if (p.guard) c.guardIdle = 0; else if (++c.guardIdle > 100) c.guardHits = 0;
  if (c.comboT > 0 && --c.comboT === 0) c.combo = 0;
  if (c.bannerT > 0) c.bannerT--;
  if (c.windGap > 0) c.windGap--;
  if (c.seqT > 0 && --c.seqT === 0) c.seqId = 0;
  if (c.seqId && (p.stun > 0 || p.down || !findEnemy(c, c.seqId))) { c.seqId = 0; c.seqT = 0; }

  /* target lock: a fresh attack press locks the enemy in the direction of the stick (or the nearest one in reach); the lock sticks
     until he falls, and every blow, gap-closing step and counter goes to him */
  var tgt = findEnemy(c, c.target);
  if (tgt && (tgt.dead || tgt.st === 'dead' || tgt.st === 'down' || tgt.st === 'getup' || dist(tgt, p) > 6)) { c.target = 0; tgt = null; }
  if (s.pressed.attack && p.stun <= 0 && !p.down && !s.held.block) {
    var pick = pickTarget(c, p, s.mx, -s.my, tgt);
    if (pick) { c.target = pick.id; tgt = pick; }
  }
  if (tgt && !p.down && p.stun <= 0 && world.attackLock) {                          /* mid-move: stay square on him and close the gap, like a lunge */
    var tx = tgt.x - p.x, tz = tgt.z - p.z, td = Math.hypot(tx, tz) || 1;
    p.face = Math.atan2(tx, tz);
    if (td > 1.15 && td < 3.8) { var stp = Math.min(td - 1.1, 4.2 / TPS); p.x += tx / td * stp; p.z += tz / td * stp; }
  }
  /* Block pressed once the alert is up (from the yellow phase on): the hero answers at once with a counter */
  if (s.pressed.block && !p.down && p.stun <= 0 && !p.invuln) {
    var pick = null, pu = 0, near = 0, q;
    for (q = 0; q < c.enemies.length; q++) {
      var en = c.enemies[q], Kq = KINDS[en.kind];
      if (en.st !== 'windup' || !Kq.blockable || dist(en, p) > Kq.reach + 1.5) continue;
      near++; var u = en.t / (Kq.windup * TPS);
      if (u >= 0.3 && u > pu) { pu = u; pick = en; }
    }
    if (pick) {
      var bearing = Math.atan2(pick.x - p.x, pick.z - p.z);
      addRage(p, RAGE.timedBlock); c.guardHits = 0; pick.st = 'hurt'; pick.t = 0; pick.kx = 0; pick.kz = 0; pick.guarding = false;
      /* two men at once: a double takedown. One man: a direct hit he cannot guard. With the rage bar past 60 the counter is the guitar counter (it costs nothing). */
      var kind = near >= 2 ? 'double' : (p.rage >= 60 ? 'special' : 'direct');
      /* (the guitar counter is free: only the finisher spends the rage bar; nothing he does or suffers ever takes it away) */
      if (kind !== 'double') { p.face = bearing; c.target = pick.id; }
      world.bus.emit('block', { timed: true, id: pick.id, x: p.x, z: p.z });
      world.bus.emit('counter', { id: pick.id, kind: kind });
    }
  }
  while (world.pendingStrikes.length) playerStrike(world, world.pendingStrikes.shift());
  engage(world);
  for (var k = 0; k < c.enemies.length; k++) stepEnemy(world, c.enemies[k], input);
  separate(c, p);
  /* defeated thugs are taken away (arrest scene arrives later) */
  for (var m = c.enemies.length - 1; m >= 0; m--) {
    var e = c.enemies[m];
    if (e.st === 'dead' && e.t > 100) { world.bus.emit('removed', { id: e.id }); c.enemies.splice(m, 1); }
  }
  if (p.hp <= 0 && !p.down) { p.hp = 0; p.down = true; c.downT = 0; world.bus.emit('heroDown', {}); c.banner = 'Down!'; c.bannerT = 150; }
  if (p.down) c.downT++;                              /* how long he has been down: the fight decides when it is lost */
}

module.exports = { startLocation: startLocation, createCombat: createCombat, step: step, spawn: spawn, playerStrike: playerStrike, KINDS: KINDS };
