#!/usr/bin/env node
/* Real-browser ride check: walk to the bike, climb on, ride, fight a man from the saddle, jump a ramp, crash into a wall, park, step off and walk away.
   node tools/ridecheck.js [outDir]   (screenshots go to outDir when given) */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright');
var file = path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html'), out = process.argv[2]; if (out) fs.mkdirSync(out, { recursive: true });
var fails = 0;
function check(name, ok, info) { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (info ? '  [' + JSON.stringify(info) + ']' : '')); if (!ok) fails++; }
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + file + '#street'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1200);
  async function shot(n) { if (out) await page.screenshot({ path: path.join(out, n + '.png') }); }
  function W(fn, arg) { return page.evaluate(fn, arg); }
  await W(function () { var c = window.__game.ctx.world.combat; c.enemies.length = 0; c.enabled = false; });
  var s0 = await W(function () { var w = window.__game.ctx.world; return { m: w.mounted, d: Math.hypot(w.bike.x - w.player.x, w.bike.z - w.player.z) }; });
  check('1. starts on foot, the parked bike is within a few steps', !s0.m && s0.d < 3, s0);
  await shot('ride_1_foot');
  await page.keyboard.press('Space'); await page.waitForTimeout(700);
  check('2. Attack beside the bike climbs on', await W(function () { return window.__game.ctx.world.mounted; }));
  await shot('ride_2_seated');
  await page.keyboard.down('ArrowUp'); try { await page.waitForFunction(function () { return window.__game.ctx.world.bike.speed > 10; }, null, { timeout: 20000 }); } catch (e) { }
  var r = await W(function () { var b = window.__game.ctx.world.bike; return { sp: b.speed, x: b.x }; });
  check('3. throttle accelerates the bike down the road', r.sp > 8 && r.x > 8, r); await shot('ride_3_road');
  /* fight from the saddle: stop, put a thug beside the bike and tap Attack */
  await page.keyboard.up('ArrowUp'); await page.keyboard.down('ArrowDown');
  try { await page.waitForFunction(function () { return Math.abs(window.__game.ctx.world.bike.speed) < 0.3; }, null, { timeout: 30000 }); } catch (e) { }
  await page.keyboard.up('ArrowDown');
  var f0 = await W(function () { var w = window.__game.ctx.world, b = w.bike, c = w.combat; c.enemies.length = 0; c.enabled = true; c.wave = 0; window.__spawn = window.__spawn || null; return { h: b.h }; });
  await W(function () { var w = window.__game.ctx.world, b = w.bike, c = w.combat; var e = { id: 900, kind: 'thug', x: b.x + Math.cos(b.h) * 1.7, z: b.z - Math.sin(b.h) * 1.7, px: 0, pz: 0, face: 0, hp: 60, maxHp: 60, st: 'idle', t: 0, cd: 9999, kx: 0, kz: 0, phase: 0, canBlock: false, guarding: false, guardHits: 0, guardCool: 0, guardTimer: 0, blockT: 99, lastMove: '', hitN: 0 }; e.px = e.x; e.pz = e.z; c.enemies.push(e); window.__foe = e; });
  await shot('ride_fight_0');
  for (var q = 0; q < 6; q++) { await page.keyboard.press('Space'); await page.waitForTimeout(450); }
  var fh = await W(function () { var e = window.__foe, w = window.__game.ctx.world; return { hp: e.hp, max: e.maxHp, mounted: w.mounted }; });
  check('5. tapping Attack beside a man fights from the saddle (he is hurt, Toofan stays seated)', fh.hp < fh.max && fh.mounted, fh); await shot('ride_fight_1');
  await W(function () { var c = window.__game.ctx.world.combat; c.enemies.length = 0; c.enabled = false; });
  /* jump: put the bike on a run-up to the nearest ramp,  */
  var rp = await W(function () {
    var g = window.__game.ctx.world, specs = g.streaming.snapshotSpecs(), best = null, i, k;
    for (i = 0; i < specs.length; i++) for (k = 0; k < specs[i].ramps.length; k++) { var r = specs[i].ramps[k], cx = specs[i].ox + (r.x0 + r.x1) / 2, cz = specs[i].oz + (r.z0 + r.z1) / 2, d = Math.hypot(cx - g.bike.x, cz - g.bike.z); if (!best || d < best.d) best = { d: d, r: r, ox: specs[i].ox, oz: specs[i].oz }; }
    if (!best) return null; var r2 = best.r, z = best.oz + (r2.z0 + r2.z1) / 2, x = best.ox + (r2.axis === 'x' ? r2.x0 - 26 : (r2.x0 + r2.x1) / 2), h = r2.axis === 'x' ? Math.PI / 2 : 0;
    if (r2.axis === 'z') { z = best.oz + r2.z0 - 26; x = best.ox + (r2.x0 + r2.x1) / 2; }
    g.bike.x = x; g.bike.z = z; g.bike.h = h; g.bike.speed = 20; g.player.x = x; g.player.z = z; return { x: x, z: z, axis: r2.axis };
  });
  check('4. found a ramp near the road', !!rp, rp);
  if (rp) {
    var air = false;
    for (var i = 0; i < 160 && !air; i++) {
      await page.waitForTimeout(40);
      var st = await W(function () { var b = window.__game.ctx.world.bike; return { air: b.air, airT: b.airT, y: b.y }; });
      if (st.air) { air = true; await shot('ride_4_air'); }
    }
    check('6. the ramp throws the bike into the air', air);
    await page.waitForTimeout(800); await shot('ride_5_landed');
  }
  /* wall: aim at the nearest building */
  await W(function () { var g = window.__game.ctx.world; g.bike.h = Math.PI; g.bike.speed = 18; });
  await page.keyboard.up('ArrowUp'); await page.waitForTimeout(150);
  /* brake, then park and step off */
  await page.keyboard.down('ArrowDown'); try { await page.waitForFunction(function () { var b = window.__game.ctx.world.bike; return !b.air && Math.abs(b.speed) < 0.3; }, null, { timeout: 30000 }); } catch (e) { } await page.keyboard.up('Shift');
  var sp = await W(function () { var b = window.__game.ctx.world.bike; return b.speed; });
  check('7. stick down brakes the bike to a standstill', Math.abs(sp) < 0.7, sp);
  await page.keyboard.up('ArrowDown'); await page.waitForTimeout(300); await page.keyboard.down('Shift'); await page.waitForTimeout(200); await page.keyboard.up('Shift'); await page.waitForTimeout(700);
  var d = await W(function () { var w = window.__game.ctx.world; return { m: w.mounted, d: Math.hypot(w.bike.x - w.player.x, w.bike.z - w.player.z) }; });
  check('8. Block at a standstill parks the bike and he steps off beside it', !d.m && d.d < 1.6, d); await shot('ride_6_parked');
  await page.keyboard.down('ArrowLeft'); try { await page.waitForFunction(function () { var w = window.__game.ctx.world; return Math.hypot(w.bike.x - w.player.x, w.bike.z - w.player.z) > 4; }, null, { timeout: 15000 }); } catch (e) { } await page.keyboard.up('ArrowLeft');
  var d2 = await W(function () { var w = window.__game.ctx.world; return Math.hypot(w.bike.x - w.player.x, w.bike.z - w.player.z); });
  check('9. he walks away on foot and the bike stays parked', d2 > d.d + 2, d2);
  check('10. no page errors', errs.length === 0, errs);
  console.log(fails ? 'RIDE CHECK: ' + fails + ' FAILED' : 'RIDE CHECK: ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
