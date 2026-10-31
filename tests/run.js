#!/usr/bin/env node
/* Headless tests: the simulation and core run in plain Node with no browser. */
'use strict';
var path = require('path'), assert = require('assert');
var S = path.join(__dirname, '..', 'src');
function req(p) { return require(path.join(S, p)); }

var rngMod = req('core/rng'), busMod = req('core/events'), inputMod = req('core/input'), loopMod = req('core/loop');
var saveMod = req('core/save'), scopeMod = req('core/scope'), modesMod = req('core/modes');
var gen = req('sim/chunkgen'), worldMod = req('sim/world'), boxmesh = req('view/boxmesh'), CONFIG = req('data/config');

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
test('chunkgen: same seed and coordinates give identical specs', function () {
  assert.deepStrictEqual(gen.generateChunk(42, 3, -1), gen.generateChunk(42, 3, -1));
  assert.notDeepStrictEqual(gen.generateChunk(42, 3, -1).boxes, gen.generateChunk(43, 3, -1).boxes);
});
test('chunkgen: road chunk keeps the roadway clear and has raised shopfronts', function () {
  var c = gen.generateChunk(7, 0, 0), S = CONFIG.CHUNK_SIZE / 2;
  c.boxes.forEach(function (b) { if (b.y1 > 3) assert(b.z0 >= 8 || b.z1 <= -8 || b.z0 > 7 || b.z1 < -7, 'tall box in roadway'); });
  assert(c.boxes.some(function (b) { return Math.abs(b.y1 - 2.7) < 1e-6; }), 'shop band missing');
  assert(c.boxes.every(function (b) { return b.x0 >= -S - 1e-6 && b.x1 <= S + 1e-6; }), 'box outside chunk');
});
test('world: identical inputs from the same seed give identical hashes', function () {
  function run(seed) {
    var bus = busMod.createBus(), w = worldMod.createWorld(seed, bus), inp = inputMod.createInput();
    for (var t = 0; t < 900; t++) {
      inp.setAxis(Math.sin(t / 50), Math.cos(t / 37)); inp.setButton('attack', t % 40 === 5); inp.setButton('block', t % 90 === 30);
      inp.tick(t); worldMod.step(w, inp);
    }
    return worldMod.hash(w);
  }
  assert.strictEqual(run(11), run(11)); assert.notStrictEqual(run(11), run(12));
});
test('world: different input changes the hash', function () {
  var bus = busMod.createBus(), a = worldMod.createWorld(1, bus), b = worldMod.createWorld(1, bus), i1 = inputMod.createInput(), i2 = inputMod.createInput();
  i1.setAxis(1, 0); i1.tick(0); i2.tick(0); worldMod.step(a, i1); worldMod.step(b, i2);
  assert.notStrictEqual(worldMod.hash(a), worldMod.hash(b));
});
test('rage gate: finisher only fires at full rage, then resets', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(1, bus), inp = inputMod.createInput(), t = 0; w.bike.x = 500;
  function press(name) { inp.setButton(name, true); inp.tick(t++); worldMod.step(w, inp); inp.setButton(name, false); inp.tick(t++); worldMod.step(w, inp); }
  press('finisher'); assert.strictEqual(w.counters.finishers, 0);
  for (var i = 0; i < 9; i++) press('attack');
  assert.strictEqual(w.player.rage, 100); press('finisher');
  assert.strictEqual(w.counters.finishers, 1); assert.strictEqual(w.player.rage, 0);
});


console.log('street fight');
function fightWorld() {
  var bus = busMod.createBus(), w = worldMod.createWorld(7, bus), inp = inputMod.createInput(), t = 0, ev = []; w.bike.x = 500;
  ['hit', 'enemyBlock', 'block', 'counter', 'guardbreak', 'playerHurt', 'ko', 'wave', 'heroDown'].forEach(function (n) { bus.on(n, function (e) { ev.push([n, e]); }); });
  worldMod.startFight(w); w.combat.enemies.length = 0;
  return { w: w, inp: inp, ev: ev, tick: function (n) { for (var i = 0; i < (n || 1); i++) { inp.tick(t++); worldMod.step(w, inp); } },
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
test('fight: finisher whirl clears everybody around, a new wave arrives afterwards', function () {
  var f = fightWorld(); [[1.5, 0], [-1.5, 0.4], [0, -2], [2.5, 2]].forEach(function (p) { combatMod.spawn(f.w, 'thug', p[0], p[1]); });
  f.w.combat.enemies.forEach(function (e) { e.cd = 9999; });
  for (var h = 0; h < 6; h++) f.w.pendingStrikes.push('finisherWhirl'); f.tick(1);
  assert.strictEqual(f.count('ko'), 4); f.tick(400); assert.ok(f.count('wave') >= 1);
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
  var f = fightWorld(); f.w.combat.enemies.length = 0; combatMod.begin(f.w); var maxAtt = 0, maxClose = 0, c = f.w.combat;
  for (var i = 0; i < 900; i++) {
    f.w.player.hp = 100; f.tick(1);
    var att = 0, close = 0; c.enemies.forEach(function (e) { if (e.st === 'windup' || e.st === 'strike') att++; if (Math.hypot(e.x - f.w.player.x, e.z - f.w.player.z) < 2.3) close++; });
    if (att > maxAtt) maxAtt = att; if (close > maxClose) maxClose = close;
  }
  assert.ok(maxAtt <= 3, 'attackers ' + maxAtt); assert.ok(maxClose <= 3, 'close ' + maxClose);
});
test('fight: waves spawn all round the hero', function () {
  var f = fightWorld(); f.w.combat.enemies.length = 0; combatMod.begin(f.w); var sides = {};
  f.w.combat.enemies.forEach(function (e) { sides[(e.x > 0 ? 'E' : 'W') + (e.z > 0 ? 'S' : 'N')] = 1; });
  assert.ok(Object.keys(sides).length >= 3, JSON.stringify(sides));
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
  function run() { var f = fightWorld(); f.w.combat.enemies.length = 0; combatMod.begin(f.w); f.tick(300); return worldMod.hash(f.w) + ':' + f.w.combat.enemies.map(function (e) { return e.x.toFixed(3) + e.st; }).join(); }
  assert.strictEqual(run(), run());
});

console.log('streaming and memory budget');
test('streaming: loads the full window, then only the edge on movement', function () {
  var bus = busMod.createBus(), loads = 0, unloads = 0; bus.on('chunk:load', function () { loads++; }); bus.on('chunk:unload', function () { unloads++; });
  var w = worldMod.createWorld(3, bus), side = 2 * CONFIG.STREAM_RADIUS + 1;
  assert.strictEqual(w.streaming.loadedCount(), side * side); assert.strictEqual(loads, side * side);
  loads = 0; w.streaming.update(CONFIG.CHUNK_SIZE, 0);
  assert.strictEqual(loads, side); assert.strictEqual(unloads, side);
});
test('streaming: a long random walk never exceeds the chunk budget and frees what it unloads', function () {
  var bus = busMod.createBus(), live = {}, peak = 0;
  bus.on('chunk:load', function (e) { live[e.key] = 1; peak = Math.max(peak, Object.keys(live).length); });
  bus.on('chunk:unload', function (e) { assert(live[e.key], 'unload of unknown chunk'); delete live[e.key]; });
  var w = worldMod.createWorld(8, bus), r = rngMod.createRng(99), x = 0, z = 0;
  for (var i = 0; i < 4000; i++) { x += r.range(-12, 12); z += r.range(-12, 12); w.streaming.update(x, z); }
  assert(peak <= CONFIG.BUDGET.maxLoadedChunks, 'peak ' + peak);
  assert.deepStrictEqual(Object.keys(live).sort(), w.streaming.loadedKeys());
});
test('streaming: returning to a recent area reuses cached specs', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(5, bus);
  w.streaming.update(CONFIG.CHUNK_SIZE, 0); w.streaming.update(CONFIG.CHUNK_SIZE * 2, 0);
  w.streaming.update(CONFIG.CHUNK_SIZE, 0); w.streaming.update(0, 0);
  assert(w.streaming.stats.cacheHits >= 10, 'hits ' + w.streaming.stats.cacheHits);
});
test('mesh: a full window stays under the triangle budget', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(21, bus), tris = 0;
  w.streaming.snapshotSpecs().forEach(function (s) { tris += boxmesh.boxesToArrays(s.boxes, CONFIG.PALETTE).triangles; });
  assert(tris <= CONFIG.BUDGET.maxTriangles, 'triangles ' + tris);
  console.log('       full window: ' + tris + ' triangles');
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
  var bus = busMod.createBus(), w = worldMod.createWorld(3, bus), inp = inputMod.createInput(), t = 0, x0;
  inp.setAxis(1, 0); inp.tick(t++); worldMod.step(w, inp);
  x0 = w.player.x; for (var i = 0; i < 30; i++) { inp.tick(t++); worldMod.step(w, inp); }
  assert(w.player.x > x0 + 0.5, 'walks when free');
  w.attackLock = true; x0 = w.player.x; for (i = 0; i < 30; i++) { inp.tick(t++); worldMod.step(w, inp); }
  assert.strictEqual(w.player.x, x0); assert.strictEqual(w.player.moving, false);
  w.attackLock = false; inp.setButton('block', true); inp.tick(t++); worldMod.step(w, inp); x0 = w.player.x;
  for (i = 0; i < 30; i++) { inp.tick(t++); worldMod.step(w, inp); }
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

console.log('\ncity and bike');
var citygen = req('sim/citygen'), bikeMod = req('sim/bike'), streamMod = req('sim/streaming'), BIKE = req('data/bike');
test('city: same seed and coordinates give identical chunks; kinds follow the road grid', function () {
  assert.deepStrictEqual(citygen.generate(42, 4, -3), citygen.generate(42, 4, -3));
  assert.strictEqual(citygen.generate(1, 0, 0).kind, 'roadH'); assert.strictEqual(citygen.generate(1, 1, 0).kind, 'cross');
  assert.strictEqual(citygen.generate(1, 1, 1).kind, 'roadV'); assert.strictEqual(citygen.generate(1, 2, 1).kind, 'block');
});
test('city: every chunk keeps its boxes and footprints inside it; roadways are clear of footprints; the start chunk has no ramp', function () {
  var S = CONFIG.CHUNK_SIZE / 2, cx, cz;
  for (cx = -4; cx <= 4; cx++) for (cz = -4; cz <= 4; cz++) {
    var c = citygen.generate(11, cx, cz);
    assert(c.boxes.every(function (b) { return b.x0 >= -S - 1e-6 && b.x1 <= S + 1e-6 && b.z0 >= -S - 1e-6 && b.z1 <= S + 1e-6; }), 'box outside ' + c.key);
    assert(c.solids.every(function (q) { return q.x0 >= -S - 1e-6 && q.x1 <= S + 1e-6 && q.z0 >= -S - 1e-6 && q.z1 <= S + 1e-6; }), 'footprint outside ' + c.key);
    if (c.kind === 'roadH' && !(c.loc && !c.loc.side)) assert(c.solids.every(function (q) { return q.z0 >= 7.3 || q.z1 <= -7.3; }), 'footprint in the roadway ' + c.key);
    if (c.kind === 'roadV' && !(c.loc && !c.loc.side)) assert(c.solids.every(function (q) { return q.x0 >= 7.3 || q.x1 <= -7.3; }), 'footprint in the roadway ' + c.key);
    if (c.kind === 'cross') assert(c.solids.every(function (q) { return (q.x0 >= 7 || q.x1 <= -7) && (q.z0 >= 7 || q.z1 <= -7); }), 'footprint in the junction');
  }
  assert.strictEqual(citygen.generate(11, 0, 0).ramps.length, 0);
});
test('city: no jump ramps in the city; streaming keeps within the chunk budget and ground height follows a ramp when a generator provides one', function () {
  var bus0 = busMod.createBus(), st0 = streamMod.createStreaming(5, bus0, citygen.generate), q, r2; st0.update(0, 0);
  for (q = -8; q <= 8; q++) for (r2 = -8; r2 <= 8; r2++) assert.strictEqual(citygen.generate(5, q, r2).ramps.length, 0, 'ramp at ' + q + ',' + r2);
  var bus = busMod.createBus(), st = streamMod.createStreaming(5, bus), found = null, cx, cz;
  st.update(0, 0);
  for (cx = -6; cx <= 6 && !found; cx++) for (cz = -6; cz <= 6 && !found; cz++) { var c = gen.generateChunk(5, cx, cz); if (c.ramps.length) found = c; }
  assert(found, 'some ramp exists'); st.update(found.ox, found.oz);
  var r = found.ramps[0], mid = (r.z0 + r.z1) / 2;
  assert(st.groundAt(found.ox + r.x0 + 0.1, found.oz + mid) < 0.5); assert(Math.abs(st.groundAt(found.ox + r.x1 - 0.01, found.oz + mid) - r.h) < 0.1);
  assert(st.loadedCount() <= CONFIG.BUDGET.maxLoadedChunks);
});
function flat() { return { groundAt: function () { return 0; }, solidsNear: function () { return []; } }; }
function ride(b, env, n, c) { for (var i = 0; i < n; i++) bikeMod.step(b, typeof c === 'function' ? c(i) : c, env, 1 / 60, null); }
var GO = { throttle: 1, brake: 0, steer: 0, boost: false, drift: false, stunt: false };
test('bike: builds speed gradually, never above top speed, and brakes to a stop', function () {
  var b = bikeMod.createBike(0, 0, 0), env = flat();
  ride(b, env, 60, GO); assert(b.speed > 2.5 && b.speed < 8, 'after 1 s ' + b.speed);
  var t60 = 0, c60 = bikeMod.createBike(0, 0, 0); while (c60.speed < 16.7 && t60 < 3000) { ride(c60, env, 1, GO); t60++; } assert(t60 / 60 > 5 && t60 / 60 < 14, '0 to 60 km/h takes ' + t60 / 60 + ' s: a Bullet, not a sports bike');
  ride(b, env, 1500, GO); assert(b.speed <= BIKE.MAX_SPEED + 0.01 && b.speed > BIKE.MAX_SPEED - 4, 'top ' + b.speed);
  ride(b, env, 600, { throttle: 0, brake: 1, steer: 0, boost: false, drift: false, stunt: false }); assert(b.speed <= 0.3, 'stopped ' + b.speed);
});
test('bike: boost raises the top speed and drains the meter; a heavy cruiser turns in a wide arc at speed', function () {
  var b = bikeMod.createBike(0, 0, 0); ride(b, flat(), 1200, GO); var s0 = b.speed;
  ride(b, flat(), 120, { throttle: 1, brake: 0, steer: 0, boost: true, drift: false, stunt: false }); assert(b.speed > s0 + 2 && b.boost < 1, 'boost');
  var c = bikeMod.createBike(0, 0, 0); ride(c, flat(), 900, GO); var h0 = c.h; ride(c, flat(), 60, { throttle: 1, brake: 0, steer: 1, boost: false, drift: false, stunt: false });
  var turn = h0 - c.h; assert(turn > 0.2 && turn < 1.2, 'one second at full lock turns ' + turn + ' rad (right turn lowers heading)');
});
test('bike: a wall stops it and a hard hit crashes it; it cannot end up inside the footprint', function () {
  var env = { groundAt: function () { return 0; }, solidsNear: function () { return [{ x0: 30, z0: -5, x1: 40, z1: 5, y1: 10 }]; } };
  var b = bikeMod.createBike(0, 0, Math.PI / 2), crashed = 0, bus = busMod.createBus(); bus.on('ride:crash', function () { crashed++; });
  for (var i = 0; i < 1500; i++) bikeMod.step(b, GO, env, 1 / 60, bus);
  assert(b.x <= 30 - BIKE.RADIUS + 0.01, 'x ' + b.x); assert(crashed >= 1);
});
function rampEnv() { return { groundAt: function (x) { return x < 0 || x > 8 ? 0 : 3.0 * x / 8; }, solidsNear: function () { return []; } }; }
test('bike: a ramp throws it into the air for about a second, then it lands', function () {
  var b = bikeMod.createBike(-30, 0, Math.PI / 2), bus = busMod.createBus(), ev = []; bus.on('ride:jump', function () { ev.push('j'); }); bus.on('ride:land', function () { ev.push('l'); });
  var maxY = 0, air = 0; for (var i = 0; i < 1200; i++) { bikeMod.step(b, GO, rampEnv(), 1 / 60, bus); if (b.air) air++; maxY = Math.max(maxY, b.y); }
  assert.deepStrictEqual(ev, ['j', 'l']); assert(air > 40 && air < 120, 'air ticks ' + air); assert(maxY > 3.0, 'maxY ' + maxY); assert.strictEqual(b.y, 0);
});
test('world: walk up to the bike, Attack mounts, riding moves the player and the streaming, Block at a standstill parks and steps off beside it', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(3, bus), inp = inputMod.createInput(), ev = [];
  ['ride:mount', 'ride:park'].forEach(function (n) { bus.on(n, function () { ev.push(n); }); });
  function run(n, mx, my, atk) { for (var i = 0; i < n; i++) { inp.setAxis(mx, my); inp.setButton('attack', atk && i === 0); inp.tick(w.tick); worldMod.step(w, inp); } }
  run(2, 0, 0, false); run(2, 0, 0, true); assert(w.mounted, 'mounted');
  run(300, 0, 1, false); assert(w.bike.speed > 5 && w.player.x > 10, 'moved ' + w.player.x); assert.strictEqual(w.player.x, w.bike.x);
  var g0 = 0; while (w.bike.speed > 0.3 && g0++ < 2000) run(1, 0, -1, false); run(60, 0, 0, false); assert(Math.abs(w.bike.speed) < 0.7, 'slow ' + w.bike.speed); assert(w.mounted, 'still seated at a standstill');
  run(2, 0, 0, false); inp.setButton('block', true); run(2, 0, 0, false); inp.setButton('block', false); assert(!w.mounted, 'dismounted'); assert(Math.hypot(w.player.x - w.bike.x, w.player.z - w.bike.z) < 1.5);
  assert.deepStrictEqual(ev, ['ride:mount', 'ride:park']);
});
test('world: climbing on is easy beside either wheel, still works with a man a few steps away, and is refused only when one is right beside him', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(3, bus), inp = inputMod.createInput(), b = w.bike, fx = Math.sin(b.h), fz = Math.cos(b.h);
  function tryAt(x, z) { w.mounted = false; w.player.x = x; w.player.z = z; inp.setButton('attack', false); for (var q = 0; q < 12; q++) { inp.tick(w.tick); worldMod.step(w, inp); w.mounted = false; } inp.tick(w.tick); worldMod.step(w, inp); inp.setButton('attack', true); inp.tick(w.tick); worldMod.step(w, inp); inp.setButton('attack', false); inp.tick(w.tick); worldMod.step(w, inp); return w.mounted; }
  assert(tryAt(b.x + fx * 1.0 + fz * 1.3, b.z + fz * 1.0 - fx * 1.3), 'beside the front wheel');
  assert(tryAt(b.x - fx * 1.0 + fz * 1.3, b.z - fz * 1.0 - fx * 1.3), 'beside the back wheel');
  assert(!tryAt(b.x + 4, b.z + 4), 'too far');
  combatMod.spawn(w, 'thug', b.x + 6, b.z); assert(tryAt(b.x + fz * 1.3, b.z - fx * 1.3), 'a man a few steps off does not stop him');
  w.combat.enemies.length = 0; combatMod.spawn(w, 'thug', b.x + fz * 2.0, b.z - fx * 2.0); assert(!tryAt(b.x + fz * 1.3, b.z - fx * 1.3), 'a man right beside him means fight');
});
test('world: the same seed and the same inputs give the same hash with the bike in play', function () {
  function go() { var bus = busMod.createBus(), w = worldMod.createWorld(8, bus), inp = inputMod.createInput();
    for (var t = 0; t < 1500; t++) { inp.setAxis(Math.sin(t / 90) * 0.8, t < 1200 ? 1 : 0); inp.setButton('attack', t === 3 || t % 200 === 150); inp.setButton('block', t % 333 > 300); inp.tick(w.tick); worldMod.step(w, inp); } return worldMod.hash(w); }
  assert.strictEqual(go(), go());
});

test('world: the parked bike is solid; he walks around it, not through it', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(3, bus), inp = inputMod.createInput(), b = w.bike, fx = Math.sin(b.h), fz = Math.cos(b.h);
  w.combat.enabled = false; w.player.x = b.x + fz * 2.5; w.player.z = b.z - fx * 2.5;
  for (var i = 0; i < 240; i++) { inp.setAxis(-fz, fx); inp.tick(w.tick); worldMod.step(w, inp); }       /* walk straight at the bike from the side */
  var side = (w.player.x - b.x) * fz - (w.player.z - b.z) * fx; assert(side > 0.6, 'pushed out of the bike, side distance ' + side);
});
function rideWorld() { var bus = busMod.createBus(), w = worldMod.createWorld(3, bus), inp = inputMod.createInput(); w.combat.enemies.length = 0; w.combat.enabled = false; w.mounted = true; w.mountTick = -99; w.atkArmed = true;
  return { w: w, inp: inp, bus: bus, stop: function () { var g = 0; while (Math.abs(w.bike.speed) > 0.3 && g++ < 2000) this.run(1, 0, w.bike.speed > 0 ? -1 : 0, false); this.run(60, 0, 0, false); },
  run: function (n, mx, my, atk, blk) { for (var i = 0; i < n; i++) { inp.setAxis(mx, my); inp.setButton('attack', typeof atk === 'function' ? atk(i) : !!atk); inp.setButton('block', !!blk); inp.tick(w.tick); worldMod.step(w, inp); } } }; }
test('ride controls: a held Attack boosts, a tap with nobody near still swings, a tap beside a man fights', function () {
  var R = rideWorld(), w = R.w, acts = 0; R.bus.on('action', function () { acts++; });
  R.run(200, 0, 1, false); var s0 = w.bike.speed, seen = false; for (var q = 0; q < 50; q++) { R.run(1, 0, 1, true); if (w.bike.boosting) seen = true; } assert(seen && w.bike.speed > s0 && w.bike.boost < 1, 'hold boosts');
  R.run(5, 0, 1, false); acts = 0; R.run(8, 0, 1, function (i) { return i < 4; }); assert(acts >= 1, 'a tap always swings');
  R.run(5, 0, 0, false); w.combat.enabled = true; combatMod.spawn(w, 'thug', w.bike.x + Math.cos(w.bike.h) * 1.6, w.bike.z - Math.sin(w.bike.h) * 1.6);
  R.run(2, 0, 0, function (i) { return i === 0; }); assert(acts >= 1, 'tap beside a man starts a blow'); assert(!w.bike.boosting, 'that hold is not a boost');
});
test('ride controls: Block parks only at a standstill with nobody close; a man close means Block is for the fight', function () {
  var R = rideWorld(), w = R.w; R.run(200, 0, 1, false); R.run(4, 0, 0, false, true); assert(w.mounted, 'no parking at speed');
  R.stop(); w.combat.enabled = true; combatMod.spawn(w, 'thug', w.bike.x + 2.5, w.bike.z); R.run(2, 0, 0, false, true); assert(w.mounted, 'a man close: no parking'); w.combat.enemies.length = 0; w.combat.enabled = false;
  R.run(2, 0, 0, false); R.run(2, 0, 0, false, true); assert(!w.mounted, 'parked');
});
test('ride fight: blows from the saddle hurt a man beside the bike and not one far off; a blow rocks the bike', function () {
  var R = rideWorld(), w = R.w, side = { x: Math.cos(w.bike.h), z: -Math.sin(w.bike.h) }; w.combat.enemies.length = 0; w.combat.enabled = true; w.attackLock = true;
  combatMod.spawn(w, 'thug', w.bike.x + side.x * 1.7, w.bike.z + side.z * 1.7); combatMod.spawn(w, 'thug', w.bike.x - side.x * 9, w.bike.z - side.z * 9); var near = w.combat.enemies[0], far = w.combat.enemies[1], hp0 = near.hp, hf = far.hp;
  R.run(3, 0, 0, false); R.run(1, 0, 0, true); for (var i = 0; i < 4; i++) { w.pendingStrikes.push({ move: 'cross', last: false }); R.run(1, 0, 0, false); }
  assert(near.hp < hp0, 'near man hurt ' + near.hp + '/' + hp0); assert.strictEqual(far.hp, hf, 'far man untouched');
});
test('bike moves: every saddle move exists with a strike, left and right; counters escalate elbow, sweep, double', function () {
  var moves = req('data/moves'), en = req('data/enemies'), names = ['Jab', 'Cross', 'Hook', 'Elbow', 'Kick'], n, sd;
  for (n = 0; n < names.length; n++) for (sd = 0; sd < 2; sd++) { var k = 'bk' + names[n] + 'LR'[sd]; assert(moves.MOVES[k] && en.STRIKES[k], k); assert(!moves.MOVES[k].counter); }
  ['bkCElbowL', 'bkCElbowR', 'bkSweepL', 'bkSweepR', 'bkDouble'].forEach(function (k) { assert(moves.MOVES[k] && moves.MOVES[k].counter && en.STRIKES[k], k); });
  assert(moves.MOVES.bkJabL.keys[3].pose['armA.sx'] > 80 && moves.MOVES.bkJabR.keys[3].pose['armB.sx'] > 80, 'jab uses the near arm on each side');
  function counterKind(hpFrac, two) {
    var R = rideWorld(), w = R.w, kind = null; R.bus.on('counter', function (e) { kind = e.kind; }); w.combat.enabled = true; w.combat.enemies.length = 0;
    combatMod.spawn(w, 'thug', w.bike.x + 1.5, w.bike.z); var e0 = w.combat.enemies[0]; e0.hp = e0.maxHp * hpFrac; e0.st = 'windup'; e0.t = Math.round(combatMod.KINDS.thug.windup * 60 * 0.5);
    if (two) { combatMod.spawn(w, 'thug', w.bike.x - 1.5, w.bike.z); var e1 = w.combat.enemies[1]; e1.st = 'windup'; e1.t = e0.t; }
    R.inp.setButton('block', true); R.inp.tick(w.tick); worldMod.step(w, R.inp); return kind;
  }
  assert.strictEqual(counterKind(1, false), 'bkElbow'); assert.strictEqual(counterKind(0.4, false), 'bkSweep'); assert.strictEqual(counterKind(1, true), 'bkDouble');
});
test('city detail: road chunks carry potholes and speed breakers inside the chunk; the bike is jarred and slowed by them', function () {
  var cx, found = null, pot = 0, brk = 0;
  for (cx = -6; cx <= 6; cx++) { var c = citygen.generate(11, cx, 0); if (c.kind !== 'roadH') continue; c.hazards.forEach(function (h) { if (h.k === 'pot') pot++; if (h.k === 'brk') brk++; assert(h.x0 >= -16 && h.x1 <= 16 && h.z0 >= -16 && h.z1 <= 16); }); if (!found && c.hazards.length) found = c; }
  assert(pot > 8 && brk >= 1, 'pot ' + pot + ' brk ' + brk);
  var env = { groundAt: function () { return 0; }, solidsNear: function () { return []; }, hazardAt: function (x) { return x > 40 && x < 41 ? 'brk' : (x > 70 && x < 71 ? 'pot' : null); } };
  var b = bikeMod.createBike(0, 0, Math.PI / 2), bumps = 0, bus = busMod.createBus(), vmax = 0, vAfter = 0; bus.on('ride:bump', function () { bumps++; });
  for (var i = 0; i < 1500; i++) { bikeMod.step(b, GO, env, 1 / 60, bus); if (b.x < 40) vmax = b.speed; if (b.x > 42 && !vAfter) vAfter = b.speed; }
  assert(bumps >= 2 && vAfter < vmax, 'bumps ' + bumps + ' before ' + vmax + ' after ' + vAfter);
});
test('locations: forced ones sit near the start, are deterministic, stay inside the chunk and leave the road passable', function () {
  var locsMod = req('sim/citylocs'), loc = req('data/locations');
  ['2,0', '-1,0', '3,0', '1,1', '1,-1', '-3,0'].forEach(function (k) { var a = k.split(','), c = citygen.generate(5, +a[0], +a[1]); assert(c.loc && c.loc.type === loc.FORCED[k], k + ' ' + (c.loc && c.loc.type)); assert.deepStrictEqual(c.loc, citygen.generate(5, +a[0], +a[1]).loc); });
  var types = {}, n = 0, cx, cz;
  for (cx = -12; cx <= 12; cx++) for (cz = -12; cz <= 12; cz++) {
    var c = citygen.generate(9, cx, cz); if (!c.loc) continue; n++; types[c.loc.type] = 1;
    assert.strictEqual(c.loc.spawns.length, c.loc.n);
    c.boxes.forEach(function (b) { assert(b.x0 >= -16 - 1e-6 && b.x1 <= 16 + 1e-6 && b.z0 >= -16 - 1e-6 && b.z1 <= 16 + 1e-6, 'box outside ' + c.key); });
    var lane = c.loc.axis === 'x' ? function (q) { return q.z1 > -5.5 && q.z0 < 5.5 && q.x1 > -16; } : function (q) { return q.x1 > -5.5 && q.x0 < 5.5 && q.z1 > -16; };
    var inRoad = c.solids.filter(lane).filter(function (q) { return q.y1 > 0.5; });
    var spans = []; inRoad.forEach(function (q) { var a = c.loc.axis === 'x' ? [q.z0, q.z1] : [q.x0, q.x1]; spans.push([Math.max(-6, a[0]), Math.min(6, a[1])]); });
    spans.sort(function (a, b) { return a[0] - b[0]; }); var edge = -6, gap = 0; spans.forEach(function (s2) { gap = Math.max(gap, s2[0] - edge); edge = Math.max(edge, s2[1]); }); gap = Math.max(gap, 6 - edge);
    assert(gap >= 1.6 || spans.length === 0, 'a bike can pass ' + c.key + ' ' + c.loc.type + ' gap ' + gap);
  }
  assert(n > 20 && Object.keys(types).length >= 8, 'variety ' + n + ' ' + Object.keys(types).join());
});
test('traffic: vehicles appear on the lanes (left-hand side), stop for the bike, and the same run gives the same life', function () {
  function run() { var bus = busMod.createBus(), w = worldMod.createWorld(4, bus), inp = inputMod.createInput(); w.combat.enabled = false; w.player.x = 40; w.player.z = 0; w.bike.x = 40; w.bike.z = 0; w.mounted = true;
    for (var i = 0; i < 1800; i++) { inp.setAxis(0, 0); inp.tick(w.tick); worldMod.step(w, inp); } return w; }
  var w = run(), w2 = run(); assert.strictEqual(worldMod.hash(w), worldMod.hash(w2));
  var kinds = {}; w.traffic.list.forEach(function (e) { kinds[e.kind] = 1; }); assert(w.traffic.list.length >= 8, 'population ' + w.traffic.list.length);
  w.traffic.list.forEach(function (e) {
    var K = req('data/traffic').KINDS[e.kind]; if (K.kind !== 'veh') return;
    var off = e.axis === 'x' ? e.z - e.road : e.x - e.road; assert(Math.abs(Math.abs(off) - 3) < 0.3 || e.t < 5 || Math.abs(off) > 5, 'on its lane ' + off);
  });
});
test('traffic: the bike hits a vehicle like a wall and knocks a walker over', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(4, bus), crashes = 0, bumps = 0; bus.on('ride:crash', function (e) { if (e.with === 'bus') crashes++; }); bus.on('npc:bump', function () { bumps++; });
  w.combat.enabled = false; w.mounted = true; w.bike.x = 0; w.bike.z = 0; w.bike.h = Math.PI / 2; w.bike.speed = 14; w.player.x = 0; w.player.z = 0;
  w.traffic.list.push({ id: 1, kind: 'bus', x: 6, z: 0, px: 6, pz: 0, h: Math.PI / 2, ph: Math.PI / 2, v: 0, axis: 'x', road: 0, dir: 1, state: 'go', t: 10, wait: 99, phase: 0, hit: 0, dx: 0, dz: 0 });
  var trafficMod = req('sim/traffic'); for (var i = 0; i < 30; i++) { bikeMod.step(w.bike, { throttle: 0, brake: 0, steer: 0 }, flat(), 1 / 60, null); trafficMod.collide(w.traffic, w); }
  assert(crashes >= 1 && w.bike.speed < 10 && w.bike.x < 6 - 1, 'bus stops the bike ' + w.bike.speed + ' ' + w.bike.x);
  w.traffic.list.length = 0; w.bike.x = 0; w.bike.speed = 10; w.traffic.list.push({ id: 2, kind: 'ped', x: 1.5, z: 0, px: 1.5, pz: 0, h: 0, ph: 0, v: 0, axis: 'x', road: 0, dir: 1, state: 'go', t: 10, wait: 0, phase: 0, hit: 0, dx: 0, dz: 0 });
  for (i = 0; i < 20; i++) { bikeMod.step(w.bike, { throttle: 0, brake: 0, steer: 0 }, flat(), 1 / 60, null); trafficMod.collide(w.traffic, w); }
  assert(bumps >= 1 && w.traffic.list[0].state === 'down', 'walker knocked down');
});
test('locations: arriving at an uncleared place starts its fight; clearing it marks it and the pointer moves on; the first wave no longer repeats forever', function () {
  var bus = busMod.createBus(), w = worldMod.createWorld(5, bus), inp = inputMod.createInput(), started = [], cleared = [];
  bus.on('location:start', function (e) { started.push(e.name); }); bus.on('location:clear', function (e) { cleared.push(e.name); });
  combatMod.begin(w); w.combat.enemies.length = 0; w.player.x = 64; w.player.z = 0; w.bike.x = 5000;
  for (var i = 0; i < 70; i++) { inp.tick(w.tick); worldMod.step(w, inp); }
  assert.deepStrictEqual(started, ['Market lane']); assert(w.combat.enemies.length >= 5, 'men ' + w.combat.enemies.length);
  w.combat.enemies.forEach(function (e) { e.dead = true; e.st = 'dead'; });
  for (i = 0; i < 70; i++) { inp.tick(w.tick); worldMod.step(w, inp); }
  assert.deepStrictEqual(cleared, ['Market lane']); assert(w.locs.cleared['2,0']); assert(!w.locs.active);
  w.combat.enemies.length = 0; for (i = 0; i < 600; i++) { inp.tick(w.tick); worldMod.step(w, inp); } assert.strictEqual(w.combat.enemies.length, 0, 'no endless waves'); assert.notStrictEqual(w.locs.next.key, '2,0');
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
      }
      return { r: r, log: log, ticks: i };
    }
    test('road fight, bike goons: punching and kicking beats them, then the ride goes on; their blows cost hearts', function () {
      var f = fight('bikes', true); assert.strictEqual(f.r.state, 'ride'); assert(f.log.indexOf('enc:ko') >= 0 && f.log.indexOf('enc:end') >= 0, f.log.join(','));
      var g = fight('bikes', false); assert(g.log.indexOf('enc:hurt') >= 0 && g.log.indexOf('enc:fail') >= 0 && g.log.indexOf('enc:retry') >= 0, 'idle hero loses hearts and the fight restarts');
    });
    test('road fight, car gang: a timed block leaps onto the roof, the crew are beaten, the car spins out and the police arrest them', function () {
      var f = fight('car', true), L = f.log;
      ['enc:leap', 'enc:pop', 'enc:ko', 'enc:spin', 'enc:police', 'enc:arrest', 'enc:end'].forEach(function (k) { assert(L.indexOf(k) >= 0, k + ' missing: ' + L.join(',')); });
      assert.strictEqual(f.r.state, 'ride');
    });
    test('road fights come on their own in order on every run: the bike goons first, then the car gang, then none until the next signal', function () {
      var kinds = [], r = rideMod.createRide(5, { emit: function (n, e) { if (n === 'enc:start') kinds.push(e.kind); } }), inp = inputMod.createInput(), i;
      r.bike.x = -150; r.bike.h = Math.PI / 2;
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
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
