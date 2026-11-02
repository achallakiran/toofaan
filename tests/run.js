#!/usr/bin/env node
/* Headless tests: the simulation and core run in plain Node with no browser. */
'use strict';
var path = require('path'), assert = require('assert');
var S = path.join(__dirname, '..', 'src');
function req(p) { return require(path.join(S, p)); }

var rngMod = req('core/rng'), busMod = req('core/events'), inputMod = req('core/input'), loopMod = req('core/loop');
var saveMod = req('core/save'), scopeMod = req('core/scope'), modesMod = req('core/modes');
var fwMod = req('sim/fightworld'), boxmesh = req('view/boxmesh'), CONFIG = req('data/config');

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('core');
test('rng: same seed gives same sequence, different seed differs', function () {
  var a = rngMod.createRng(5), b = rngMod.createRng(5), c = rngMod.createRng(6), i, same = true, diff = false;
  for (i = 0; i < 50; i++) { var x = a.next(); if (x !== b.next()) same = false; if (x !== c.next()) diff = true; }
  assert(same && diff);
});
test('rng: fork is independent of later draws on the parent', function () {
  var a = rngMod.createRng(9), f1 = a.fork(1), v1 = f1.next();
  var b = rngMod.createRng(9), f2 = b.fork(1); b.next(); b.next();
  assert.strictEqual(v1, f2.next());
});
test('rng: state can be saved and restored', function () {
  var a = rngMod.createRng(3); a.next(); var st = a.getState(), n1 = a.next();
  a.setState(st); assert.strictEqual(a.next(), n1);
});
test('events: on, emit order, off', function () {
  var bus = busMod.createBus(), log = [];
  var off = bus.on('x', function (p) { log.push('a' + p); }); bus.on('x', function (p) { log.push('b' + p); });
  bus.emit('x', 1); off(); bus.emit('x', 2);
  assert.deepStrictEqual(log, ['a1', 'b1', 'b2']);
});
test('scope: disposes in reverse order and survives a throwing cleanup', function () {
  var s = scopeMod.createScope(), log = [];
  s.add(function () { log.push(1); }); s.add(function () { throw new Error('x'); }); s.add(function () { log.push(3); });
  s.dispose(); assert.deepStrictEqual(log, [3, 1]); assert.strictEqual(s.size(), 0);
});
test('loop: fixed steps from uneven frame times', function () {
  var steps = 0, l = loopMod.createLoop({ hz: 60, step: function () { steps++; }, render: function () {} });
  var total = 0, dts = [7, 30, 16.7, 1, 45, 16, 16, 16.7, 5]; dts.forEach(function (d) { l.advance(d); total += d; });
  assert(Math.abs(steps - Math.floor(total / (1000 / 60))) <= 1, 'steps ' + steps);
});
test('loop: a long stall is clamped, not replayed', function () {
  var steps = 0, l = loopMod.createLoop({ hz: 60, maxSteps: 5, step: function () { steps++; } });
  l.advance(5000); assert.strictEqual(steps, 5); assert(l.getDropped() > 0);
});
test('loop: time scale slows the simulation', function () {
  var a = 0, b = 0, l1 = loopMod.createLoop({ hz: 60, step: function () { a++; } }), l2 = loopMod.createLoop({ hz: 60, step: function () { b++; } });
  l2.setTimeScale(0.5); for (var i = 0; i < 60; i++) { l1.advance(1000 / 60 + 0.001); l2.advance(1000 / 60 + 0.001); }
  assert(a >= 59 && b >= 29 && b <= 31);
});
test('input: press and release edges, held ticks', function () {
  var inp = inputMod.createInput(), s = inp.state;
  inp.tick(0); assert(!s.pressed.attack);
  inp.setButton('attack', true); inp.tick(1); assert(s.pressed.attack && s.held.attack && s.heldTicks.attack === 1);
  inp.tick(2); assert(!s.pressed.attack && s.heldTicks.attack === 2);
  inp.setButton('attack', false); inp.tick(3); assert(s.released.attack && !s.held.attack);
});
test('input: buffered press is consumed once inside the window', function () {
  var inp = inputMod.createInput();
  inp.setButton('block', true); inp.tick(10); inp.setButton('block', false); inp.tick(14);
  assert(inp.consume('block')); assert(!inp.consume('block'));
  inp.setButton('block', true); inp.tick(20); inp.setButton('block', false); inp.tick(30);
  assert(!inp.consume('block'), 'too old');
});
test('input: stick is clamped to the unit circle', function () {
  var inp = inputMod.createInput(); inp.setAxis(1, 1); inp.tick(0);
  var m = Math.hypot(inp.state.mx, inp.state.my); assert(Math.abs(m - 1) < 1e-9);
});
test('save: falls back to memory when storage throws', function () {
  var bad = { getItem: function () { throw new Error('no'); }, setItem: function () { throw new Error('no'); } };
  var s = saveMod.createSave(bad); s.set('a', 5); assert.strictEqual(s.get('a'), 5); assert(!s.persistent());
  var s2 = saveMod.createSave(null); assert.strictEqual(s2.get('zz', 7), 7);
});
test('modes: exit disposes the previous scope before the next enter', function () {
  var log = [], ctx = { bus: busMod.createBus() }, m = modesMod.createModes(ctx);
  m.register({ name: 'a', enter: function (c, sc) { log.push('enter a'); sc.add(function () { log.push('free a'); }); }, step: function () {}, exit: function () { log.push('exit a'); } });
  m.register({ name: 'b', enter: function () { log.push('enter b'); }, step: function () {}, exit: function () {} });
  m.switchTo('a'); m.switchTo('b');
  assert.deepStrictEqual(log, ['enter a', 'exit a', 'free a', 'enter b']);
});

console.log('sim');
/* a recorded fight at five places (scripted stick, blows and blocks): every one of these was checked tick by tick against the old street
   brawler before it was removed (same blows, same knockdowns, same health), so a change here means the fighting itself has changed */
function replay(type, ti, atkP) {
  var lineupMod = req('sim/lineup'), G = req('data/gangs');
  var lu = lineupMod.lineup(3, rngMod.createRng(99 + ti), G.GANGS[G.gangOf(type)].mix), fw = fwMod.create({ seed: 12345 + ti, bus: { emit: function () {} }, type: type, lineup: lu });
  var r = rngMod.createRng(7 + ti), I = inputMod.createInput(), sched = [], lock = -1, ci = 0, MV = ['jab', 'cross', 'hook', 'kick', 'uppercut'], t, q;
  for (t = 0; t < 2400 && fw.state === 'fight'; t++) {
    var a = r.next(), mx = Math.sin(t / 37) * (a < 0.5 ? 1 : 0), my = Math.cos(t / 53) * (a < 0.5 ? 1 : 0), atk = r.next() < atkP, blk = r.next() < 0.08;
    I.setAxis(mx, my); I.setButton('attack', atk); I.setButton('block', blk); I.tick(t);
    if (I.state.pressed.attack && !(lock > t)) { lock = t + 22; sched.push({ at: t + 9, move: MV[ci % 5], last: ci % 5 === 4 }); ci++; }
    for (q = sched.length - 1; q >= 0; q--) if (sched[q].at === t) { fw.pendingStrikes.push({ move: sched[q].move, last: sched[q].last }); sched.splice(q, 1); }
    fw.attackLock = lock > t; fwMod.step(fw, I);
  }
  return [fw.state, fw.combat.kills, fw.player.hp, fwMod.hash(fw)];
}
test('fight replay: recorded fights play out exactly as recorded (won, knocked out and still going)', function () {
  /* re-recorded for build 73 after checking that, with the old get-up length (30 ticks) and the old loss delay, these same replays still
     give the old values exactly: the only changes are the goons' longer get-up and Maa ka Thappad instead of a lost fight */
  var GOLD = { market: [['cleared', 6, 87, 3461885993], ['thappad', 0, 0, 2957785086]], temple: [['cleared', 6, 63, 2953749483], ['fight', 2, 29, 3658513791]],
    toll: [['thappad', 2, 0, 3833356648], ['thappad', 1, 0, 858132002]], railway: [['cleared', 6, 100, 1145781783], ['thappad', 2, 0, 3226667411]], warehouse: [['cleared', 6, 15, 989297316], ['thappad', 1, 0, 96181121]] };
  Object.keys(GOLD).forEach(function (type, i) { assert.deepStrictEqual([replay(type, i, 0.3), replay(type, i, 0.03)], GOLD[type], type); });
});
test('fight: identical inputs from the same seed give identical hashes; different input changes it', function () {
  function run(seed, k) {
    var fw = fwMod.create({ seed: seed, type: 'temple' }), inp = inputMod.createInput();
    for (var t = 0; t < 900; t++) { inp.setAxis(Math.sin(t / 50) * k, Math.cos(t / 37)); inp.setButton('attack', t % 40 === 5); inp.setButton('block', t % 90 === 30); inp.tick(t); fwMod.step(fw, inp); }
    return fwMod.hash(fw);
  }
  assert.strictEqual(run(11, 1), run(11, 1)); assert.notStrictEqual(run(11, 1), run(12, 1)); assert.notStrictEqual(run(11, 1), run(11, 0.5));
});
test('rage gate: the finisher only fires at full rage, then resets', function () {
  var f = fightWorld(), p = f.w.player;
  function press(name) { f.inp.setButton(name, true); f.tick(1); f.inp.setButton(name, false); f.tick(1); }
  p.rage = 99; press('finisher'); assert.strictEqual(f.w.counters.finishers, 0);
  p.rage = 100; press('finisher'); assert.strictEqual(f.w.counters.finishers, 1); assert.strictEqual(p.rage, 0);
});


console.log('fight');
/* a bare fight: open ground round the origin, no men yet, Toofan at the centre facing +z (each test brings its own men) */
function fightWorld() {
  var bus = busMod.createBus(), w = fwMod.create({ seed: 7, bus: bus, type: 'market' }), inp = inputMod.createInput(), t = 0, ev = [];
  w.combat.enemies.length = 0; w.hadMen = false; w.arena = { solids: [], ox: 0, oz: 0 }; w.bounds = { x0: -60, z0: -60, x1: 60, z1: 60 };
  var p = w.player; p.x = p.px = 0; p.z = p.pz = 0; p.face = 0;
  ['hit', 'enemyBlock', 'block', 'counter', 'guardbreak', 'playerHurt', 'ko', 'wave', 'heroDown', 'fight:clear', 'fight:lost', 'fight:thappad', 'fight:rise', 'fight:spark', 'fight:resume'].forEach(function (n) { bus.on(n, function (e) { ev.push([n, e]); }); });
  return { w: w, inp: inp, ev: ev, tick: function (n) { for (var i = 0; i < (n || 1); i++) { inp.tick(t++); fwMod.step(w, inp); } },
    count: function (n) { return ev.filter(function (e) { return e[0] === n; }).length; } };
}
var combatMod = req('sim/combat');
var _spawn = combatMod.spawn; combatMod.spawn = function (w, k, x, z) { _spawn(w, k, x, z); w.combat.enemies[w.combat.enemies.length - 1].canBlock = false; };       /* tests opt in to guarding */
test('fight: a jab that lands damages the thug, builds rage and the combo counter', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.2); var e = f.w.combat.enemies[0]; e.cd = 9999;
  f.w.player.face = 0; f.w.pendingStrikes.push('jab'); f.tick(1);
  assert.ok(e.hp < 8.8, 'hp ' + e.hp); assert.ok(f.w.player.rage > 0); assert.strictEqual(f.w.combat.combo, 1); assert.strictEqual(f.count('hit'), 1);
});
test('fight: a strike behind the hero misses', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, -1.2); var e = f.w.combat.enemies[0]; e.cd = 9999;
  f.w.player.face = 0; f.w.pendingStrikes.push('jab'); f.tick(1); assert.strictEqual(e.hp, 8.8);
});
test('fight: thug telegraphs, then strikes; undefended hit costs health', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.0); var e = f.w.combat.enemies[0]; e.cd = 0; f.tick(1);
  assert.strictEqual(e.st, 'windup'); var hp0 = f.w.player.hp; f.tick(70); assert.ok(f.w.player.hp < hp0); assert.strictEqual(f.count('playerHurt'), 1);
});
test('fight: walking out of reach during the telegraph dodges the swing', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.0); var e = f.w.combat.enemies[0]; e.cd = 0; f.tick(1);
  f.w.player.z -= 2.5; f.tick(70); assert.strictEqual(f.w.player.hp, 100);
});
test('fight: held block absorbs the first hit, the second breaks the guard', function () {
  var f = fightWorld(); f.inp.setButton('block', true); f.tick(30);                  /* block held long enough that it is not a timed block */
  for (var k = 0; k < 2; k++) { combatMod.spawn(f.w, 'thug', 0, 1.0); var e = f.w.combat.enemies[k]; e.cd = 0; e.st = 'windup'; e.t = 0; f.tick(60); e.st = 'dead'; e.dead = true; }
  assert.strictEqual(f.count('block'), 1); assert.strictEqual(f.count('guardbreak'), 1);
});
test('fight: pressing Block once the alert is yellow counters at once, no damage', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.0); var e = f.w.combat.enemies[0]; e.cd = 0; f.tick(1);
  assert.strictEqual(e.st, 'windup'); f.tick(8); f.inp.setButton('block', true); f.tick(1);
  assert.strictEqual(f.count('counter'), 0, 'the white phase is too early');
  f.inp.setButton('block', false); f.tick(2); f.tick(8); f.inp.setButton('block', true); f.tick(2);
  assert.strictEqual(f.count('counter'), 1, 'yellow phase counters'); assert.strictEqual(e.st, 'hurt'); f.tick(60); assert.strictEqual(f.w.player.hp, 100); assert.ok(f.w.player.rage >= 16);
});
test('fight: two attackers alerting together make the counter a double takedown; one man gets a direct hit and the hero turns to him', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.0); combatMod.spawn(f.w, 'thug', 0.6, 1.2); f.w.combat.enemies.forEach(function (e) { e.st = 'windup'; e.t = 22; });
  var got = null; f.w.bus.on('counter', function (e) { got = e; }); f.inp.setButton('block', true); f.tick(1);
  assert.ok(got && got.kind === 'double', 'double takedown');
  var g = fightWorld(); combatMod.spawn(g.w, 'thug', 0, -1.0); var e2 = g.w.combat.enemies[0]; e2.st = 'windup'; e2.t = 22; g.w.player.face = 0; var got2 = null; g.w.bus.on('counter', function (e) { got2 = e; });
  g.inp.setButton('block', true); g.tick(1); assert.ok(got2 && got2.kind === 'direct', 'single man: a direct hit'); assert.ok(Math.abs(Math.abs(g.w.player.face) - Math.PI) < 0.01, 'the hero turns to face him');
});
test('fight: a stick swing cannot be blocked', function () {
  var f = fightWorld(); f.inp.setButton('block', true); f.tick(30);
  combatMod.spawn(f.w, 'stick', 0, 1.2); var e = f.w.combat.enemies[0]; e.cd = 0; f.tick(1); f.tick(80);
  assert.strictEqual(f.count('playerHurt'), 1);
});
test('fight: the finisher whirl clears everybody around; the place is cleared and no new wave comes', function () {
  var f = fightWorld(); [[1.5, 0], [-1.5, 0.4], [0, -2], [2.5, 2]].forEach(function (p) { combatMod.spawn(f.w, 'thug', p[0], p[1]); });
  f.w.combat.enemies.forEach(function (e) { e.cd = 9999; });
  for (var h = 0; h < 6; h++) f.w.pendingStrikes.push('finisherWhirl'); f.tick(1);
  assert.strictEqual(f.count('ko'), 4); f.tick(400); assert.strictEqual(f.count('fight:clear'), 1); assert.strictEqual(f.count('wave'), 0); assert.strictEqual(f.w.state, 'cleared');
});
test('fight: knocked out, Maa ka Thappad: the fight holds (never back to the ride) until revive', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.0); combatMod.spawn(f.w, 'thug', 5, 5); var e = f.w.combat.enemies[0]; e.cd = 0; f.w.player.hp = 1;
  f.tick(200); assert.strictEqual(f.w.state, 'thappad'); assert.strictEqual(f.count('fight:thappad'), 1); assert.strictEqual(f.count('fight:lost'), 0);
  var snap = JSON.stringify(f.w.combat.enemies.map(function (q) { return [q.x, q.z, q.st, q.hp]; })); f.tick(600);
  assert.strictEqual(JSON.stringify(f.w.combat.enemies.map(function (q) { return [q.x, q.z, q.st, q.hp]; })), snap, 'nobody moves while Maa is there');
});
test('fight: revive: full health, the rock stand and the spark, the goons step back amazed, then the fight goes on and can be won', function () {
  var f = fightWorld(), RISE = fwMod.RISE; combatMod.spawn(f.w, 'thug', 0, 0.9); combatMod.spawn(f.w, 'thug', -0.8, -0.6); var c = f.w.combat;
  c.enemies.forEach(function (q) { q.cd = 0; }); f.w.player.hp = 1; f.tick(200); assert.strictEqual(f.w.state, 'thappad');
  var d0 = c.enemies.map(function (q) { return Math.hypot(q.x - f.w.player.x, q.z - f.w.player.z); });
  assert(fwMod.revive(f.w)); assert.strictEqual(f.w.state, 'rise'); assert.strictEqual(f.w.player.hp, 100); assert(!f.w.player.down);
  f.tick(fwMod.SPARK + 2); assert.strictEqual(f.count('fight:spark'), 1); assert(c.enemies.every(function (q) { return q.st === 'awe'; }), 'everyone amazed');
  f.tick(40); c.enemies.forEach(function (q, i) { assert(Math.hypot(q.x - f.w.player.x, q.z - f.w.player.z) > d0[i] + 0.8, 'stepped back'); });
  var guard = 0; while (f.w.state === 'rise' && guard++ < RISE) f.tick(1); assert.strictEqual(f.w.state, 'fight'); assert.strictEqual(f.count('fight:resume'), 1); assert.strictEqual(c.enemies.length, 2, 'the same men');
  var hp = f.w.player.hp; c.enemies.forEach(function (q) { q.x = f.w.player.x; q.z = f.w.player.z + 1; q.st = 'windup'; q.t = 999; }); f.tick(3); assert.strictEqual(f.w.player.hp, hp, 'a moment where he cannot be hurt');
  c.enemies.forEach(function (q) { q.dead = true; q.st = 'dead'; q.t = 0; }); f.tick(2); assert.strictEqual(f.w.state, 'cleared');
});
test('fight: a knocked-down goon takes a proper get-up (1.2 s) before he fights again', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 2); var e = f.w.combat.enemies[0]; e.st = 'down'; e.t = 78; e.hp = 5; f.w.player.hp = 1e6;
  f.tick(1); assert.strictEqual(e.st, 'getup'); f.tick(60); assert.strictEqual(e.st, 'getup'); f.tick(14); assert.strictEqual(e.st, 'approach');
});
test('fight: an unguarded thug takes six blows of the string before he falls, and stays where he stands', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.1); var e = f.w.combat.enemies[0]; e.cd = 9999; f.w.player.face = 0;
  var seq = req('data/moves').makeString(function () { return 0; }), k;
  for (k = 0; k < 5; k++) { f.w.pendingStrikes.push({ move: seq[k], last: false }); f.tick(1); assert.ok(e.hp > 0 && e.st === 'hurt', 'hit ' + k + ' hp ' + e.hp + ' ' + e.st); assert.ok(Math.hypot(e.x, e.z - 1.1) < 0.05, 'did not get pushed away'); }
  f.w.pendingStrikes.push({ move: seq[5], last: false }); f.tick(1); assert.strictEqual(e.st, 'down'); assert.ok(e.dead);
});
test('fight: a guarding enemy blocks the first two blows, then his cover breaks and the third lands', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.1); var e = f.w.combat.enemies[0]; e.cd = 9999; e.canBlock = true; f.w.player.face = 0;
  f.tick(2); assert.ok(e.guarding, 'guard is up'); var hp = e.hp;
  f.w.pendingStrikes.push('jab'); f.tick(1); assert.strictEqual(e.hp, hp); assert.ok(e.guarding);
  f.w.pendingStrikes.push('cross'); f.tick(1); assert.strictEqual(e.hp, hp); assert.strictEqual(e.st, 'guardbreak');
  f.w.pendingStrikes.push('jab'); f.tick(1); assert.ok(e.hp < hp, 'the third blow lands');
  assert.strictEqual(f.ev.filter(function (x) { return x[0] === 'enemyBlock'; }).length, 2);
});
test('fight: guitar counters and the finisher go straight through a guard', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.1); var e = f.w.combat.enemies[0]; e.cd = 9999; e.canBlock = true; f.w.player.face = 0; f.tick(2);
  assert.ok(e.guarding); f.w.pendingStrikes.push('counterSmash'); f.tick(1); assert.ok(e.hp < 8.8);
});
test('fight: a normal blow hits only one man', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0.2, 1.1); combatMod.spawn(f.w, 'thug', -0.2, 1.3);
  f.w.combat.enemies.forEach(function (e) { e.cd = 9999; }); f.w.player.face = 0; f.w.pendingStrikes.push('roundhouse'); f.tick(1);
  assert.strictEqual(f.count('hit'), 1);
});
test('fight: enemies queue up - two or three fight at once, the rest hold a ring', function () {
  var f = fightWorld(), pts = [], c = f.w.combat, k; for (k = 0; k < 7; k++) pts.push({ x: Math.cos(k * 0.9) * 9, z: Math.sin(k * 0.9) * 9 }); c.wave = 2; c.lineup = ['thug', 'thug', 'thug', 'thug', 'thug', 'thug', 'stick']; combatMod.startLocation(f.w, 'test', pts, 7, 1); var maxAtt = 0, maxClose = 0;
  for (var i = 0; i < 900; i++) {
    f.w.player.hp = 100; f.tick(1);
    var att = 0, close = 0; c.enemies.forEach(function (e) { if (e.st === 'windup' || e.st === 'strike') att++; if (Math.hypot(e.x - f.w.player.x, e.z - f.w.player.z) < 2.3) close++; });
    if (att > maxAtt) maxAtt = att; if (close > maxClose) maxClose = close;
  }
  assert.ok(maxAtt <= 3, 'attackers ' + maxAtt); assert.ok(maxClose <= 3, 'close ' + maxClose);
});
test('lock-on: the stick picks the target, the lock holds, blows go to him, and the hero closes the gap', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 2.0, 0); combatMod.spawn(f.w, 'thug', -2.0, 0.2); f.w.combat.enemies.forEach(function (e) { e.cd = 9999; });
  f.inp.setAxis(1, 0); f.inp.setButton('attack', true); f.tick(1); f.inp.setButton('attack', false); f.inp.setAxis(0, 0);
  var east = f.w.combat.enemies[0]; assert.strictEqual(f.w.combat.target, east.id, 'stick right locks the east man');
  f.tick(5); assert.strictEqual(f.w.combat.target, east.id, 'the lock holds with the stick released');
  f.w.attackLock = true; var d0 = Math.hypot(east.x - f.w.player.x, east.z - f.w.player.z); f.tick(30); var d1 = Math.hypot(east.x - f.w.player.x, east.z - f.w.player.z);
  assert.ok(d1 < d0 - 0.5 && d1 > 0.9, 'closed the gap ' + d0.toFixed(2) + ' -> ' + d1.toFixed(2)); f.w.attackLock = false;
  f.inp.setAxis(-1, 0); f.inp.setButton('attack', true); f.tick(1); f.inp.setButton('attack', false);
  assert.strictEqual(f.w.combat.target, f.w.combat.enemies[1].id, 'stick left switches to the west man');
  east.st = 'down'; f.tick(1); f.inp.setAxis(0, 0);
});
test('fight: same seed and inputs give the same fight', function () {
  function run() { var f = fightWorld(), pts = [{ x: 6, z: 0 }, { x: -6, z: 1 }, { x: 0, z: 7 }, { x: 1, z: -6 }]; combatMod.startLocation(f.w, 'test', pts, 4, 1); f.tick(300); return fwMod.hash(f.w) + ':' + f.w.combat.enemies.map(function (e) { return e.x.toFixed(3) + e.st; }).join(); }
  assert.strictEqual(run(), run());
});

console.log('arenas and memory budget');
test('mesh: every arena stays under the triangle budget', function () {
  var ag = req('sim/arenagen'), LOCD = req('data/locations'), worst = 0;
  LOCD.ORDER.forEach(function (type) {
    var a = ag.build(21, type, 0, 0), tris = boxmesh.boxesToArrays(a.boxes, CONFIG.PALETTE).triangles;
    a.tall.forEach(function (g) { tris += boxmesh.boxesToArrays(g.boxes, CONFIG.PALETTE).triangles; }); worst = Math.max(worst, tris);
    assert(tris <= CONFIG.BUDGET.maxTriangles, type + ' triangles ' + tris);
  });
  console.log('       busiest arena: ' + worst + ' triangles');
});
test('mesh: arrays are consistent', function () {
  var a = boxmesh.boxesToArrays([{ x0: 0, y0: 0, z0: 0, x1: 1, y1: 2, z1: 3, c: 0 }], CONFIG.PALETTE);
  assert.strictEqual(a.triangles, 10); assert.strictEqual(a.positions.length, 5 * 4 * 3); assert.strictEqual(Math.max.apply(null, a.indices), 19);
});

test('gait: loops seamlessly, stays inside joint limits, bobs twice per stride', function () {
  var pm = req('view/posemath'), J = req('data/poses').JOINTS, lim = {};
  J.forEach(function (g) { g.rows.forEach(function (r) { lim[r[0]] = [r[2], r[3]]; }); });

test('counters: three guitar counters draw from the back, fire their hits and the boom effect, and sling the guitar back', function () {
  var mp = req('view/moveplayer'), M = req('data/moves');
  assert.deepStrictEqual(M.COUNTERS, ['counterBoom', 'counterSmash', 'counterWhirl']);
  M.COUNTERS.forEach(function (n) {
    var m = M.MOVES[n], P = mp.createMovePlayer(), hits = 0, fx = [], i, maxOn = 0;
    P.onHit(function () { hits++; }); P.onFx(function (k) { fx.push(k); }); P.play(n);
    for (i = 0; i < 60 * 4 && P.active(); i++) { P.update(1 / 60); }
    for (i = 0; i <= 100; i++) { var on = mp.clipPose(n, m.len * i / 100)['gtr.on']; assert(on >= -1e-9 && on <= 1 + 1e-9, n + ' gtr.on out of range'); maxOn = Math.max(maxOn, on); }
    assert.strictEqual(maxOn, 1, n + ' never holds the guitar');
    assert.strictEqual(mp.clipPose(n, 0)['gtr.on'], 0); assert.strictEqual(mp.clipPose(n, m.len)['gtr.on'], 0);
    assert.strictEqual(hits, (m.hits || [m.hit]).length, n + ' hit count');
    if (n === 'counterBoom') assert.deepStrictEqual(fx, ['boom']);
  });
});

test('sim: no walking while a move plays or Block is held', function () {
  var f = fightWorld(), w = f.w, inp = f.inp, x0;
  inp.setAxis(1, 0); f.tick(1);
  x0 = w.player.x; f.tick(30);
  assert(w.player.x > x0 + 0.5, 'walks when free');
  w.attackLock = true; x0 = w.player.x; f.tick(30);
  assert.strictEqual(w.player.x, x0); assert.strictEqual(w.player.moving, false);
  w.attackLock = false; inp.setButton('block', true); f.tick(1); x0 = w.player.x;
  f.tick(30);
  assert.strictEqual(w.player.x, x0, 'held block pins the hero');
});
test('camera: finisher and counters fly a continuous shot that returns to the chase camera', function () {
  var cc = req('view/cinecam'), M = req('data/moves');
  M.COUNTERS.concat([M.FINISHER]).forEach(function (n) {
    var m = M.MOVES[n], D = cc.createDirector(), prev = null, t, worst = 0;
    assert(m.cam && m.cam.length >= 4, n + ' has camera keys');
    for (t = 0; t <= m.len; t += 1 / 60) {
      D.update(1 / 60, n, t, Math.min(t / 0.55, (m.len - t) / 0.7, 1));
      var c = D.resolve(2, 3, 1.2);
      ['x', 'y', 'z', 'lx', 'ly', 'lz', 'fov'].forEach(function (k) { assert(isFinite(c[k]), n + ' ' + k); });
      if (prev) worst = Math.max(worst, Math.hypot(c.x - prev.x, c.y - prev.y, c.z - prev.z));
      prev = c;
    }
    assert(worst < 1.6, n + ' camera jumps ' + worst.toFixed(2) + ' m in a frame');
    D.update(1 / 60, null, 0, 0); assert.strictEqual(D.weight, 0);
  });
});
test('moves: every clip starts and ends in guard, stays in joint limits, and fires one hit', function () {
  var mp = req('view/moveplayer'), M = req('data/moves'), J = req('data/poses').JOINTS, lim = {};
  J.forEach(function (g) { g.rows.forEach(function (r) { lim[r[0]] = [r[2], r[3]]; }); });
  Object.keys(M.MOVES).forEach(function (n) {
    var m = M.MOVES[n], i, k;
    for (i = 0; i <= 50; i++) {
      var p = mp.clipPose(n, m.len * i / 50);
      for (k in p) if (lim[k]) assert(p[k] >= lim[k][0] - 1e-6 && p[k] <= lim[k][1] + 1e-6, n + ' ' + k + ' ' + p[k]);
    }
    var a = mp.clipPose(n, 0), b = mp.clipPose(n, m.len);
    for (k in M.GUARD) assert(Math.abs(a[k] - M.GUARD[k]) < 1e-9 && Math.abs(b[k] - M.GUARD[k]) < 1e-9, n + ' not in guard at ' + k);
    assert(m.hit < m.cancel && m.cancel < m.len, n + ' timing');
  });
});
test('moves: repeated presses walk the seven-blow string, then it resets; a different roll gives a different string', function () {
  var mp = req('view/moveplayer'), M = req('data/moves'), P = mp.createMovePlayer({ rand: function () { return 0; } }), seq = [], hits = 0, i;
  P.onHit(function (m) { hits++; seq.push(m); });
  P.press();
  for (i = 0; i < 1500; i++) { var o = P.update(1 / 60); if (i % 5 === 0 && hits < 7) P.press(); }
  assert.deepStrictEqual(seq, M.makeString(function () { return 0; })); assert.strictEqual(seq.length, 7);
  assert.deepStrictEqual(seq.slice(0, 2), ['jab', 'cross'], 'opens with the jab'); assert.strictEqual(seq[4], 'uppercut');
  P.press(); var first = null; for (i = 0; i < 60; i++) { var o2 = P.update(1 / 60); if (o2 && o2.move) first = o2.move; }
  assert.strictEqual(first, 'jab', 'a late press starts a fresh string');
  var other = M.makeString(function () { return 0.99; }); assert.notDeepStrictEqual(other, seq); assert.strictEqual(other[4], 'uppercut');
  assert.ok(other.slice(5).some(function (m) { return ['axeKick', 'knee', 'roundhouse'].indexOf(m) >= 0; }), 'a leg blow in the finish');
});
  [1, 1.7].forEach(function (amp) {
    var a = pm.walkPose(0, amp), b = pm.walkPose(1, amp), k, minY = 9, maxY = -9, i;
    for (k in a) assert(Math.abs(a[k] - b[k]) < 1e-6, 'seam ' + k);
    for (i = 0; i <= 100; i++) {
      var p = pm.walkPose(i / 100, amp);
      for (k in p) if (lim[k]) assert(p[k] >= lim[k][0] - 1e-6 && p[k] <= lim[k][1] + 1e-6, k + ' out of range');
      minY = Math.min(minY, p['hip.y']); maxY = Math.max(maxY, p['hip.y']);
    }
    assert(maxY - minY > 0.015 && maxY - minY < 0.08, 'pelvis bob');
    assert(Math.abs(pm.walkPose(0.25, amp)['hip.y'] - pm.walkPose(0.75, amp)['hip.y']) < 1e-6, 'two bobs per stride');
  });
});

test('fight: while a man is held in the broken-guard sequence, two others can still start attacks (even guarders, with the hero mid-swing)', function () {
  var f = fightWorld(); combatMod.spawn(f.w, 'thug', 0, 1.2); combatMod.spawn(f.w, 'thug', 1.3, 0.4); combatMod.spawn(f.w, 'thug', -1.3, 0.4);
  var c = f.w.combat, a = c.enemies[0], b = c.enemies[1], d = c.enemies[2]; a.cd = 9999; a.st = 'hurt'; a.t = 0; c.seqId = a.id; c.seqT = 9999; c.target = a.id;
  b.canBlock = true; b.cd = 0; d.canBlock = true; d.cd = 0; f.w.attackLock = true; f.w.player.hp = 1e6; var started = 0;
  f.w.bus.on('windup', function () { started++; });
  for (var i = 0; i < 90; i++) { f.w.attackLock = true; f.tick(1); if (f.w.player.stun > 0) f.w.player.stun = 0; if (!c.seqId) { c.seqId = a.id; c.seqT = 9999; } }
  assert.ok(started >= 2, 'others attacked: ' + started); assert.strictEqual(a.st, 'hurt', 'the dazed man is still held');
});

test('road fight moves: every saddle blow exists left and right, and the saddle counter', function () {
  var moves = req('data/moves'), names = ['Jab', 'Cross', 'Hook', 'Elbow', 'Kick'], n, sd;
  for (n = 0; n < names.length; n++) for (sd = 0; sd < 2; sd++) { var k = 'bk' + names[n] + 'LR'[sd]; assert(moves.MOVES[k] && !moves.MOVES[k].counter, k); }
  ['bkCElbowL', 'bkCElbowR'].forEach(function (k) { assert(moves.MOVES[k] && moves.MOVES[k].counter, k); });
  assert(moves.MOVES.bkJabL.keys[3].pose['armA.sx'] > 80 && moves.MOVES.bkJabR.keys[3].pose['armB.sx'] > 80, 'jab uses the near arm on each side');
});

console.log('ride mode (Phase 4)');
(function () {
  var rideMod = req('sim/ride'), rmap = req('sim/ridemap'), RD = req('data/ride');
  function run(r, n, axis) { var inp = inputMod.createInput(), i; for (i = 0; i < n; i++) { var a = axis(i); inp.setAxis(a[0], a[1]); inp.tick(r.tick); rideMod.step(r, inp); } }
  test('ride map: same seed, same map; ten trouble spots, each on a pavement, all different', function () {
    var a = rmap.generate(9), b = rmap.generate(9), keys = {};
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b)); assert.strictEqual(a.targets.length, 10);
    a.targets.forEach(function (t) { assert(rmap.onRoad(t.x, t.z, 0) && !rmap.onCarriageway(t.x, t.z), t.key + ' on the pavement'); keys[t.key] = 1; });
    assert.strictEqual(Object.keys(keys).length, 10);
  });
  test('ride: the bike never leaves the roads, whatever the stick does', function () {
    var r = rideMod.createRide(4, null), off = 0, inp = inputMod.createInput();
    for (var i = 0; i < 4000; i++) { var k = Math.floor(i / 150) % 8, ang = k * Math.PI / 4; inp.setAxis(Math.sin(ang), Math.cos(ang)); inp.tick(r.tick); rideMod.step(r, inp); if (r.state === 'ride' && !rmap.onRoad(r.bike.x, r.bike.z, 0)) off++; }
    assert.strictEqual(off, 0);
  });
  test('ride: hitting traffic fast throws him off; he gets up, runs back and rides on, and no heart is lost', function () {
    var log = [], r = rideMod.createRide(4, { emit: function (n) { log.push(n); } }), b = r.bike, v = r.traffic[0];
    b.speed = 15; v.kind = 'bus'; v.wait = 9999; v.axis = 'x'; v.x = b.x + Math.sin(b.h) * 2.2; v.z = b.z + Math.cos(b.h) * 2.2; v.h = b.h + Math.PI / 2;
    run(r, 3, function () { return [0, 0]; });
    assert.strictEqual(r.state, 'fly', 'thrown ' + r.state);
    run(r, 900, function () { return [0, 0]; });
    assert(log.indexOf('ride:crash') >= 0 && log.indexOf('ride:getup') >= 0 && log.indexOf('ride:remount') >= 0, log.join(','));
    assert.strictEqual(r.state === 'ride' || r.state === 'arrived', true); assert.strictEqual(r.crashes, 1);
  });
  test('ride: reaching the signal stops the bike and marks the place active; after the fight the police scene plays and the next signal is another open place', function () {
    var log = [], r = rideMod.createRide(4, { emit: function (n, e) { log.push(n + ':' + (e && e.key)); } }), T = r.target;
    r.bike.x = T.x; r.bike.z = T.z; run(r, 2, function () { return [0, 0]; });
    assert.strictEqual(r.state, 'arrived'); assert.strictEqual(r.missions[T.key], 'active'); assert.strictEqual(r.bike.speed, 0);
    run(r, 200, function () { return [0, 0]; }); assert.strictEqual(r.state, 'arrived', 'waits for the fight area');
    rideMod.afterFight(r, T.key); assert.strictEqual(r.missions[T.key], 'cleared'); assert.strictEqual(r.state, 'enc');
    run(r, 900, function () { return [0, 0]; });
    assert.strictEqual(r.state, 'ride'); assert(r.target && r.target.key !== T.key && r.missions[r.target.key] === 'open', 'next signal');
  });
  test('ride: the bike does not move on its own; forward accelerates, back brakes to a stop, and poles and trees are solid', function () {
    var r = rideMod.createRide(4, null), x0 = r.bike.x;
    run(r, 120, function () { return [0, 0]; }); assert.strictEqual(r.bike.speed, 0); assert.strictEqual(r.bike.x, x0);
    run(r, 120, function () { return [0, 1]; }); assert(r.bike.speed > 8, 'accelerates ' + r.bike.speed);
    run(r, 90, function () { return [0, -1]; }); assert(r.bike.speed <= 0.01, 'brakes ' + r.bike.speed);
    var p = r.map.props.list[0]; assert(!rmap.clearOfProps(r.map, p.x, p.z, 0.3) && rmap.clearOfProps(r.map, p.x + 3, p.z + 3, 0.3) === rmap.clearOfProps(r.map, p.x + 3, p.z + 3, 0.3));
  });
  test('ride: letting go of the steering lines the bike up with the road (lane assist)', function () {
    var r = rideMod.createRide(4, null); run(r, 60, function () { return [0, 1]; });
    run(r, 14, function () { return [0.6, 0.8]; }); var bent = Math.abs(r.bike.h - Math.PI / 2);
    run(r, 90, function () { return [0, 1]; }); assert(bent > 0.05 && Math.abs(r.bike.h - Math.PI / 2) < 0.02, bent + ' -> ' + (r.bike.h - Math.PI / 2));
  });
  (function () {
    var RD2 = req('data/ride'), MV = req('data/moves').MOVES;
    function fight(kind, smart, seed) {
      var log = [], r = rideMod.createRide(seed || 5, { emit: function (n) { log.push(n); } }), inp = inputMod.createInput(), i;
      rideMod.startEncounter(r, kind);
      for (i = 0; i < 6000 && r.state === 'enc'; i++) {
        var e = r.enc, atk = false, blk = false;
        if (smart) { var o = (e.foes || []).concat(e.crew || []).filter(function (q) { return q.st === 'windup'; })[0];
          if (o && o.t === RD2.ENC.WIND - 6) blk = true; else if (e.car && e.car.st === 'windup' && e.car.t === RD2.ENC.CAR_WIND - 6) blk = true; else atk = i % 20 === 0; }
        inp.setButton('attack', atk); inp.setButton('block', blk); inp.tick(r.tick); rideMod.step(r, inp);
        if (r.enc && r.enc.phase === 'down' && r.enc.t > 30) req('sim/encounter').revive(r);      /* SAVE TOOFAN */
      }
      return { r: r, log: log, ticks: i };
    }
    test('road fight, bike goons: punching and kicking beats them, then the ride goes on; their blows cost hearts', function () {
      var f = fight('bikes', true); assert.strictEqual(f.r.state, 'ride'); assert(f.log.indexOf('enc:ko') >= 0 && f.log.indexOf('enc:end') >= 0, f.log.join(','));
      var g = fight('bikes', false); assert(g.log.indexOf('enc:hurt') >= 0 && g.log.indexOf('enc:down') >= 0 && g.log.indexOf('enc:spark') >= 0 && g.log.indexOf('enc:resume') >= 0, 'idle hero goes down, Maa saves him, the fight goes on: ' + g.log.filter(function (k) { return /down|rise|spark|resume/.test(k); }).join(','));
    });
    test('road fight: down on the road, everything waits for Maa; revive gives full hearts, the goons swerve away, then the same fight goes on', function () {
      var ENC = req('sim/encounter'), log = [], r = rideMod.createRide(5, { emit: function (n) { log.push(n); } }), inp = inputMod.createInput(), e = rideMod.startEncounter(r, 'bikes'), i;
      e.phase = 'fight'; r.hearts = 0; inp.tick(r.tick); rideMod.step(r, inp); assert.strictEqual(e.phase, 'down'); assert(e.hero.down && log.indexOf('enc:down') >= 0);
      for (i = 0; i < 400; i++) { inp.tick(r.tick); rideMod.step(r, inp); } assert.strictEqual(e.phase, 'down', 'waits for Maa'); assert.strictEqual(r.bike.speed, 0, 'Bijli coasts to a stop');
      var men = e.foes.length, lat0 = e.foes.map(function (o) { return Math.abs(o.lat); });
      assert(ENC.revive(r)); assert.strictEqual(r.hearts, 3); assert.strictEqual(e.phase, 'rise');
      for (i = 0; i < ENC.SPARK + 45; i++) { inp.tick(r.tick); rideMod.step(r, inp); }
      assert(log.indexOf('enc:spark') >= 0); e.foes.forEach(function (o, k) { assert(Math.abs(o.lat) > lat0[k] + 0.8, 'swerved away'); });
      for (i = 0; i < ENC.RISE; i++) { inp.tick(r.tick); rideMod.step(r, inp); if (log.indexOf('enc:resume') >= 0) break; }
      assert(log.indexOf('enc:resume') >= 0 && e.phase === 'fight' && !e.hero.rise && e.foes.length === men, 'the same fight goes on');
    });
    test('road fight, car gang: a timed block leaps onto the roof, the crew are beaten, the car spins out and the police arrest them', function () {
      var f = fight('car', true), L = f.log;
      ['enc:leap', 'enc:pop', 'enc:ko', 'enc:spin', 'enc:police', 'enc:arrest', 'enc:end'].forEach(function (k) { assert(L.indexOf(k) >= 0, k + ' missing: ' + L.join(',')); });
      assert.strictEqual(f.r.state, 'ride');
    });
    test('road fights come on their own in order on every run: the bike goons first, then the car gang, then none until the next signal', function () {
      var kinds = [], r = rideMod.createRide(5, { emit: function (n, e) { if (n === 'enc:start') kinds.push(e.kind); } }), inp = inputMod.createInput(), i;
      r.bike.x = -150; r.bike.h = Math.PI / 2; r.target = null;      /* (no arrival in this test) */
      for (i = 0; i < 20000 && kinds.length < 3; i++) {
        var e = r.enc, atk = false, blk = false;
        if (e) { var o = (e.foes || []).concat(e.crew || []).filter(function (q) { return q.st === 'windup'; })[0];
          if (o && o.t === RD2.ENC.WIND - 6) blk = true; else if (e.car && e.car.st === 'windup' && e.car.t === RD2.ENC.CAR_WIND - 6) blk = true; else atk = i % 20 === 0;
          inp.setAxis(0, 0); }
        else { if (Math.abs(r.bike.x) > r.map.ext - 30) { r.bike.h = r.bike.x > 0 ? -Math.PI / 2 : Math.PI / 2; } inp.setAxis(0, 0.8); }
        inp.setButton('attack', atk); inp.setButton('block', blk); inp.tick(r.tick); rideMod.step(r, inp);
      }
      assert.deepStrictEqual(kinds.slice(0, 2), ['bikes', 'car']); assert.strictEqual(kinds.length, 2, 'nothing more until the next signal: ' + kinds.join(','));
    });
    test('road fight: Block pressed just before a blow lands counters it for double damage', function () {
      var r = rideMod.createRide(5, null), inp = inputMod.createInput(), e = rideMod.startEncounter(r, 'bikes'), o = e.foes[0], i;
      e.phase = 'fight'; o.st = 'windup'; o.t = RD2.ENC.WIND - 5; o.u = o.from * 1.3; var hp = o.hp;
      inp.setButton('block', true); inp.tick(r.tick); rideMod.step(r, inp); inp.setButton('block', false);
      for (i = 0; i < 8; i++) { inp.tick(r.tick); rideMod.step(r, inp); }
      assert.strictEqual(o.hp, hp - 2); assert.strictEqual(r.hearts, 3);
    });
  })();
  test('ride: same seed and same input give the same ride (deterministic)', function () {
    var a = rideMod.createRide(11, null), b2 = rideMod.createRide(11, null), f = function (i) { return [Math.sin(i / 90), 0.6]; };
    run(a, 700, f); run(b2, 700, f); assert.strictEqual(rideMod.hash(a), rideMod.hash(b2));
  });
  test('ride: traffic keeps left, in both directions on both axes', function () {
    var r = rideMod.createRide(6, null), bad = 0; run(r, 900, function () { return [0, 0]; });
    r.traffic.forEach(function (v) { var lat = v.axis === 'x' ? v.z - v.line : v.x - v.line, lx = Math.cos(v.h), lz = -Math.sin(v.h); if ((v.axis === 'x' ? lz : lx) * lat <= 0) bad++; });
    assert.strictEqual(bad, 0, 'vehicles on the wrong side: ' + bad);
  });
})();
test('fight areas: every kind of place opens its fight with its men close by, inside the walls and clear of props', function () {
  var LOCD = req('data/locations');
  LOCD.ORDER.forEach(function (type) {
    var fw = fwMod.create({ seed: 20261028, type: type }), inp = inputMod.createInput(), i, B = fw.bounds;
    for (i = 0; i < 100; i++) { inp.tick(i); fwMod.step(fw, inp); }
    var p = fw.player, far = fw.combat.enemies.filter(function (e) { return Math.hypot(e.x - p.x, e.z - p.z) > 25; }).length;
    assert(fw.combat.enemies.length >= 4 && far === 0, type + ': ' + fw.combat.enemies.length + ' men, ' + far + ' far away');
    fw.combat.enemies.forEach(function (e) { assert(e.x >= B.x0 - 1e-6 && e.x <= B.x1 + 1e-6 && e.z >= B.z0 - 1e-6 && e.z <= B.z1 + 1e-6, type + ': a man outside'); });
  });
});
test('arenas: every arena builds the same twice, its men start inside the walls and clear of props', function () {
  var ag = req('sim/arenagen'), LOCD = req('data/locations');
  LOCD.ORDER.filter(ag.has).forEach(function (type) {
    var a = ag.build(777, type, 4, 0), b = ag.build(777, type, 4, 0);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b), type + ' not deterministic');
    var B = a.bounds;
    a.loc.spawns.forEach(function (s) {
      assert(s.x >= B.x0 && s.x <= B.x1 && s.z >= B.z0 && s.z <= B.z1, type + ': spawn outside ' + JSON.stringify(s));
      var inSolid = a.solids.some(function (q) { return q.y1 > 0.25 && s.x > q.x0 + a.ox && s.x < q.x1 + a.ox && s.z > q.z0 + a.oz && s.z < q.z1 + a.oz; });
      assert(!inSolid, type + ': spawn inside a prop ' + JSON.stringify(s));
    });
    var n = a.boxes.length + a.tall.reduce(function (t, g) { return t + g.boxes.length; }, 0);
    assert(a.tall.length >= 3 && n > 700, type + ': too bare (' + n + ' boxes, ' + a.tall.length + ' tall pieces)');
  });
});
test('arenas: a fight is only the arena: walking any way stays inside the walls, and there is no bike, city or traffic in it', function () {
  var LOCD = req('data/locations');
  LOCD.ORDER.forEach(function (type) {
    var fw = fwMod.create({ seed: 20261028, type: type }), inp = inputMod.createInput(), t = 0, i;
    fw.combat.enemies.length = 0;
    assert(!('bike' in fw) && !('traffic' in fw) && !('streaming' in fw) && !('locs' in fw), type + ': street parts in the fight');
    [[0, 1], [0, -1], [1, 0], [-1, 0], [0.7, 0.7], [-0.7, -0.7]].forEach(function (dir) {
      inp.setAxis(dir[0], dir[1]);
      for (i = 0; i < 900; i++) { inp.tick(t++); fwMod.step(fw, inp); }
      var p = fw.player, B = fw.bounds;
      assert(p.x >= B.x0 - 1e-6 && p.x <= B.x1 + 1e-6 && p.z >= B.z0 - 1e-6 && p.z <= B.z1 + 1e-6, type + ': walked out going ' + dir);
    });
  });
});
test('ride: riding well away from the signal leaves it open for later and points to another; arriving there clears the skip', function () {
  var rideMod2 = req('sim/ride'), R3 = req('data/ride'), ev = [], bus = { emit: function (n, e) { ev.push(n); } };
  var r = rideMod2.createRide(9, bus), T = r.target, b = r.bike;
  r.traffic = []; r.encCool = 1e9; r.nextEnc = null;
  var inp = inputMod.createInput(); inp.tick(0); rideMod2.step(r, inp);
  /* teleport far away from the signal along the same direction away from it */
  var dx = b.x - T.x, dz = b.z - T.z, d = Math.hypot(dx, dz) || 1; r.tBest = Math.hypot(T.x - b.x, T.z - b.z);
  r.tKey = T.key; r.tBest = -1000;
  inp.tick(1); rideMod2.step(r, inp);
  assert(ev.indexOf('ride:abandon') >= 0, 'no abandon event');
  assert(r.target && r.target.key !== T.key, 'pointer did not move on');
  assert.strictEqual(r.missions[T.key], 'open', 'the place should stay open');
});
(function () {
  var lineup = req('sim/lineup'), ED = req('data/enemies');
  test('fighters: the crowd grows from 4 to 8 with the places cleared, always with a lathi man, tougher kinds later', function () {
    var a = lineup.lineup(0, rngMod.createRng(3)), b = lineup.lineup(5, rngMod.createRng(3)), c = lineup.lineup(12, rngMod.createRng(3));
    assert.strictEqual(a.length, 4); assert.strictEqual(b.length, 8); assert.strictEqual(c.length, 8);
    [a, b, c].forEach(function (l) { assert(l.indexOf('stick') >= 0, 'no lathi man: ' + l); l.forEach(function (k) { assert(ED.KINDS[k], 'unknown kind ' + k); }); });
    assert(a.every(function (k) { return k === 'thug' || k === 'stick'; }), 'first fight should be simple: ' + a);
    var many = {}; for (var i = 0; i < 30; i++) lineup.lineup(5, rngMod.createRng(i)).forEach(function (k) { many[k] = 1; });
    assert(['kicker', 'chain', 'blocker', 'thrower', 'heavy'].every(function (k) { return many[k]; }), 'late fights should bring every kind: ' + Object.keys(many));
  });
  function arena(kind, dz) {
    var f = fightWorld(); combatMod.spawn(f.w, kind, 0, dz || 1.2); var e = f.w.combat.enemies[0]; e.cd = 0;
    return { w: f.w, e: e, inp: f.inp, bus: { on: function (n, fn) { f.w.bus.on(n, fn); } }, tick: f.tick };
  }
  test('fighters: the kicker kicks twice in a row', function () {
    var T = arena('kicker', 1.3), winds = 0, i; T.bus.on('windup', function () { winds++; }); T.w.player.hp = 1e6;
    for (i = 0; i < 160; i++) { T.tick(1); if (winds >= 2) break; }
    assert(winds >= 2, 'only ' + winds + ' kick');
  });
  test('fighters: a kick smashes the blocker\'s guard open; punches only wear it down', function () {
    var T = arena('blocker', 1.2), e = T.e; e.canBlock = true; e.guarding = true; e.face = Math.PI; var broke = null;
    T.bus.on('enemyBlock', function (ev) { broke = ev.broke; });
    combatMod.playerStrike(T.w, 'jab'); assert.strictEqual(broke, false, 'one jab should not break him');
    e.guarding = true; combatMod.playerStrike(T.w, 'kick'); assert.strictEqual(broke, true, 'a kick should break the guard');
  });
  test('fighters: the heavy stays on his feet under a kick until he is worn down', function () {
    var T = arena('heavy', 1.2), e = T.e; combatMod.playerStrike(T.w, { move: 'kick', last: true });
    assert.notStrictEqual(e.st, 'down', 'heavy floored by one kick'); assert(e.hp < e.maxHp);
  });
  test('fighters: the thrower keeps his distance and hits from range', function () {
    var T = arena('thrower', 2.0), i, hurt = 0; T.bus.on('playerHurt', function () { hurt++; }); T.w.player.hp = 1e6;
    T.tick(400);
    var d = Math.hypot(T.e.x - T.w.player.x, T.e.z - T.w.player.z);
    assert(d > 3, 'thrower stayed close: ' + d.toFixed(2)); assert(hurt > 0, 'no bottle landed');
  });
})();
test('gangs: every kind of place belongs to exactly one gang, two places each', function () {
  var G = req('data/gangs'), LOCD = req('data/locations'), count = {};
  LOCD.ORDER.forEach(function (t) { var g = G.gangOf(t); assert(g, t + ' has no gang'); count[g] = (count[g] || 0) + 1; });
  G.ORDER.forEach(function (g) { assert.strictEqual(count[g], 2, g + ' holds ' + count[g]); });
});
test('gangs: a gang\'s fights lean to its own kind of fighter once the ramp brings them in', function () {
  var lineup = req('sim/lineup'), G = req('data/gangs'), heavies = 0, kicks = 0, i;
  for (i = 0; i < 40; i++) { heavies += lineup.lineup(5, rngMod.createRng(i), G.GANGS.kalia.mix).filter(function (k) { return k === 'heavy'; }).length; kicks += lineup.lineup(5, rngMod.createRng(i), G.GANGS.bhairav.mix).filter(function (k) { return k === 'kicker'; }).length; }
  var h0 = 0, k0 = 0; for (i = 0; i < 40; i++) { var l = lineup.lineup(5, rngMod.createRng(i)); h0 += l.filter(function (k) { return k === 'heavy'; }).length; k0 += l.filter(function (k) { return k === 'kicker'; }).length; }
  assert(heavies > h0 && kicks > k0, 'heavies ' + heavies + ' vs ' + h0 + ', kickers ' + kicks + ' vs ' + k0);
});
test('map: picking an open place on the full map makes it the signal; a cleared one is refused', function () {
  var rideMod2 = req('sim/ride'), r = rideMod2.createRide(4, null), other = r.map.targets.filter(function (t) { return t !== r.target; })[0];
  assert(rideMod2.chooseTarget(r, other.key)); assert.strictEqual(r.target, other);
  r.missions[r.map.targets[0].key] = 'cleared'; assert(!rideMod2.chooseTarget(r, r.map.targets[0].key) || r.map.targets[0] === other);
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
