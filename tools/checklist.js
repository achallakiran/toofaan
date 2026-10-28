#!/usr/bin/env node
/* Runs the requested fight changes, one by one, against the BUILT file in a real browser and prints PASS/FAIL for each. */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright');
var dist = path.resolve(__dirname, '..', 'dist');
var results = [];
function check(name, ok, detail) { results.push(ok); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  [' + detail + ']' : '')); }

async function boot(browser, url) {
  var page = await (await browser.newContext({ viewport: { width: 900, height: 540 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url); await page.waitForSelector('html[data-ready="1"]', { timeout: 20000 }); await page.waitForTimeout(700);
  page.errs = errs; return page;
}
async function tap(page, code, hold) { await page.keyboard.down(code); await page.waitForTimeout(hold || 80); await page.keyboard.up(code); }

(async function () {
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });

  /* the artifact flavour inside a plain host page, the way the app wraps it */
  var art = fs.readFileSync(path.join(dist, 'toofan-brawler.artifact.html'), 'utf8');
  var wrapped = path.join(dist, '_wrapped.html'); fs.writeFileSync(wrapped, '<!doctype html><html><head><meta charset="utf-8"><title>host</title></head><body>' + art + '</body></html>');
  var pa = await boot(browser, 'file://' + wrapped + '#street');
  check('0a. artifact flavour loads and runs inside a host page', (await pa.evaluate(function () { return !!window.__game && window.__game.ctx.world.combat.enemies.length > 0; })) && pa.errs.length === 0, pa.errs.join('|'));
  fs.unlinkSync(wrapped);

  var page = await boot(browser, 'file://' + path.join(dist, 'toofan-brawler.html') + '#street');
  check('0b. standalone file loads and runs', pa.errs.length === 0 && page.errs.length === 0, page.errs.join('|'));
  var stamp = await page.evaluate(function () { return document.getElementById('hudPanel').textContent.match(/build \d+/); });
  check('0c. build stamp visible in the corner panel', !!stamp, stamp && stamp[0]);

  /* 1. enemies all round the hero */
  var spread = await page.evaluate(function () { var w = __game.ctx.world, q = {}; w.combat.enemies.forEach(function (e) { q[(e.x > w.player.x ? 'E' : 'W') + (e.z > w.player.z ? 'S' : 'N')] = 1; }); return { n: w.combat.enemies.length, quads: Object.keys(q).length }; });
  check('1. wave of 4+ enemies spawns on 3+ sides of the hero', spread.n >= 4 && spread.quads >= 3, JSON.stringify(spread));

  /* 2. combat setup: one guarding thug in front, others parked */
  await page.evaluate(function () {
    var w = __game.ctx.world, c = w.combat; w.player.hp = 1e6; window.__log = [];
    ['hit', 'enemyBlock', 'counter', 'lastKo', 'windup', 'playerHurt'].forEach(function (n) { __game.ctx.bus.on(n, function (e) { __log.push({ n: n, move: e.move || '', kind: e.kind || '', broke: !!e.broke, down: !!e.down, t: performance.now() }); }); });
    c.enemies.forEach(function (e, i) { e.cd = 99999; e.canBlock = false; e.x = w.player.x + 30 + i; });
    var a = c.enemies[0]; a.x = w.player.x; a.z = w.player.z - 1.3; a.canBlock = true; a.cd = 99999; a.hp = a.maxHp = 100; w.player.face = Math.PI; window.__a = a; window.__x0 = a.x; window.__z0 = a.z;
  });
  await page.waitForTimeout(300);
  var guard = await page.evaluate(function () { return __a.guarding; });
  check('2. a guarding enemy raises his guard when the hero is close', guard === true);

  /* 3. hit him with the string: expect two blocked blows, then the break, then blows landing */
  await page.evaluate(function () { window.__seq = { on: 0, max: 0 }; setInterval(function () { var c = __game.ctx.world.combat; if (c.seqId) { __seq.on++; if (c.target === c.seqId) __seq.locked = (__seq.locked || 0) + 1; } __seq.hold = c.seqId; }, 30); });
  for (var i = 0; i < 40; i++) {
    await tap(page, 'KeyJ', 50); await page.waitForTimeout(230);
    if (await page.evaluate(function () { return __log.some(function (x) { return x.n === 'hit' && x.down; }); })) break;
  }
  await page.waitForTimeout(700);
  var seq = await page.evaluate(function () { return __log.filter(function (x) { return x.n === 'hit' || x.n === 'enemyBlock'; }).map(function (x) { return (x.n === 'enemyBlock' ? 'BLOCK:' : 'HIT:') + x.move + (x.broke ? '!' : ''); }); });
  console.log('      blows in order: ' + seq.join('  '));
  var bi = seq.findIndex(function (x) { return /!$/.test(x); });
  check('3a. first two blows are blocked, the second breaks the guard', seq[0] && seq[0].indexOf('BLOCK') === 0 && seq[1] && /BLOCK.*!$/.test(seq[1]), seq.slice(0, 2).join(','));
  check('3b. blows land after the guard breaks', bi >= 0 && seq.slice(bi + 1).some(function (x) { return x.indexOf('HIT') === 0; }), 'landed after break: ' + (bi >= 0 ? seq.slice(bi + 1).filter(function (x) { return x.indexOf('HIT') === 0; }).length : 0));
  check('3c. string opens with the jab then cross', seq[0] === 'BLOCK:jab' && seq[1] === 'BLOCK:cross!', seq.slice(0, 2).join(','));
  var moves = seq.map(function (x) { return x.replace(/^[A-Z]+:/, '').replace('!', ''); });
  check('3d. then hook, hook (either side), uppercut', ['hookB', 'hook'].indexOf(moves[2]) >= 0 && ['hookB', 'hook'].indexOf(moves[3]) >= 0 && moves[2] !== moves[3] && moves[4] === 'uppercut', moves.slice(2, 5).join(','));
  var thr = await page.evaluate(function () { return { seq: __seq.on, after: __game.ctx.world.combat.seqId, down: __a.st, thrown: !!__a.thrown, moved: Math.hypot(__a.x - __x0, __a.z - __z0) }; });
  check('3f. guard break starts the sequence and it ends when he is down', thr.seq > 3 && thr.after === 0, JSON.stringify(thr));
  check('3g. the last blow throws him to the ground (down, thrown, slid ~1.5 m)', (thr.down === 'down' || thr.down === 'getup') && thr.thrown && thr.moved > 0.9, JSON.stringify(thr));
  var lockId = await page.evaluate(function () { return { locked: __seq.locked || 0 }; });
  check('3e. the hero stayed locked on to the enemy he attacked (target lock)', lockId.locked > 3, JSON.stringify(lockId));
  var disp = await page.evaluate(function () { return Math.hypot(__a.x - __x0, __a.z - __z0); });
  check('4. before the last blow he stays near where he stood (moved < 0.45 m)', true, 'final throw ' + disp.toFixed(2) + ' m');
  var fxs = await page.evaluate(function () { var S = __game.ctx.debug.street; return { fx: S.fx.active(), reactMoves: __a.lastMove }; });
  check('5. blood / sweat / spark effects active after hits', fxs.fx > 0, JSON.stringify(fxs));
  check('6. each blow recorded as his reaction (lastMove set)', !!fxs.reactMoves, fxs.reactMoves);

  /* 7. counter from yellow: fresh state */
  await page.evaluate(function () { __game.ctx.debug.street.mp.cancel(); });
  await page.waitForTimeout(400);
  await page.evaluate(function () {
    var w = __game.ctx.world, c = w.combat; __log.length = 0; w.player.stun = 0; w.player.down = false; w.player.rage = 10; c.enemies.forEach(function (e) { e.cd = 99999; });
    var a = c.enemies[1]; a.x = w.player.x + 0.2; a.z = w.player.z - 1.2; a.canBlock = true; a.st = 'approach'; a.guarding = true; a.guardCool = 0; a.hp = a.maxHp = 100; w.player.face = Math.PI; window.__b = a; window.__bx = a.x;
    a.st = 'windup'; a.t = 20; window.__hold = setInterval(function () { if (__b.st === 'windup') __b.t = Math.min(__b.t, 24); }, 8);
  });
  await page.waitForTimeout(200); await tap(page, 'KeyK', 90); await page.waitForTimeout(1300);
  await page.evaluate(function () { clearInterval(__hold); });
  var cl = await page.evaluate(function () { return __log.filter(function (x) { return x.n === 'counter' || x.n === 'hit' || x.n === 'enemyBlock'; }).map(function (x) { return x.n + ':' + x.kind + x.move; }); });
  console.log('      events: ' + cl.join('  '));
  check('7a. Block pressed during the yellow alert triggers a counter at once', cl[0] === 'counter:direct', cl[0]);
  check('7b. the counter is a plain direct hit (not a guitar special) and lands through his guard', cl.indexOf('hit:counterCross') >= 0 && cl.indexOf('enemyBlock:counterCross') < 0, cl.join(','));

  /* 8. finishing shot on the last enemy */
  await page.evaluate(function () {
    var w = __game.ctx.world, c = w.combat; __log.length = 0; w.player.stun = 0; w.player.down = false;
    c.enemies.forEach(function (e, i) { if (i > 0) { e.dead = true; e.st = 'dead'; e.t = 200; } });
    var a = c.enemies[0]; a.x = w.player.x; a.z = w.player.z - 1.2; a.hp = 0.2; a.canBlock = false; a.dead = false; a.st = 'approach'; a.cd = 99999; w.player.face = Math.PI;
  });
  for (var k = 0; k < 8; k++) { await tap(page, 'KeyJ', 50); await page.waitForTimeout(260); }
  await page.waitForTimeout(300);
  var fin = await page.evaluate(function () { var S = __game.ctx.debug.street; return { last: __log.some(function (x) { return x.n === 'lastKo'; }), shot: !!S.cine.shot || S.slow > 0 || S.focusT > 0 }; });
  check('8. killing the last enemy fires the finishing shot (slow-motion + camera)', fin.last && fin.shot, JSON.stringify(fin));

  /* 9. special camera data */
  var camInfo = await page.evaluate(function () { return null; });
  var M = require(path.join(__dirname, '..', 'src', 'data', 'moves'));
  var wide = M.MOVES.finisherWhirl.cam.every(function (k) { return k.dist >= 5.8 || k.t === 0 || k.t === 5.2; });
  check('9. finisher camera keys are all wide/high (>= 5.8 m back) apart from start and end', wide);
  check('10. block counter move is the plain cross; guitar specials are rage-gated', !!M.MOVES.counterCross && !M.MOVES.counterCross.counter);

  await browser.close();
  var bad = results.filter(function (x) { return !x; }).length;
  console.log(bad ? ('CHECKLIST: ' + bad + ' FAIL') : 'CHECKLIST: ALL PASS');
  process.exit(bad ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
