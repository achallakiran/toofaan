#!/usr/bin/env node
/* screenshots of the road fights in ride mode (bike goons, car gang): node tools/encshots.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1000, height: 600 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#ride'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1500);
  function wait(fn, ms) { return page.waitForFunction(fn, null, { timeout: ms || 30000 }).catch(function () { }); }
  async function shot(n) { await page.screenshot({ path: path.join(out, n + '.png') }); }
  await page.evaluate(function () { window.__game.ctx.debug.rideStart('bikes'); });
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.phase === 'fight' && e.foes.some(function (o) { return o.st === 'ready' || o.st === 'windup'; }); });
  await page.waitForTimeout(400); await shot('enc_1_bikes');
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.foes.some(function (o) { return o.st === 'windup' && o.t > 12; }); });
  await shot('enc_2_warning');
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(90); await page.keyboard.up('KeyJ');
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.hero.act && e.hero.act.t > 8; }, 4000); await shot('enc_3_punch');
  /* let the bot finish them: attack often */
  var gotKo = false;
  for (var i = 0; i < 160; i++) {
    if (!gotKo && await page.evaluate(function () { var e = window.__game.ctx.ride.enc; return !!(e && e.foes.some(function (o) { return o.st === 'down' && o.t < 25; })); })) { gotKo = true; await shot('enc_3b_ko_zoomout'); } var st = await page.evaluate(function () { return window.__game.ctx.ride.state; }); if (st !== 'enc') break; await page.keyboard.down('KeyJ'); await page.waitForTimeout(80); await page.keyboard.up('KeyJ'); await page.waitForTimeout(250); }
  await wait(function () { return window.__game.ctx.ride.state === 'ride'; }, 60000);
  var r1 = await page.evaluate(function () { var r = window.__game.ctx.ride; return { state: r.state, hearts: r.hearts }; });
  await page.evaluate(function () { window.__game.ctx.debug.rideStart('car'); });
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.car && e.car.st === 'windup' && e.car.t > 20; }); await shot('enc_4_car_warn');
  await page.evaluate(function () { var e = window.__game.ctx.ride.enc; e.phase = 'leap'; e.t = 0; e.hero.leap = 0; });
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.phase === 'leap' && e.hero.leap > 0.5; }, 8000); await shot('enc_5_leap');
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.phase === 'roof' && e.crew.some(function (o) { return o.st === 'windup' && o.t > 10; }); }); await shot('enc_6_roof');
  await page.evaluate(function () { var e = window.__game.ctx.ride.enc; e.crew.forEach(function (o) { o.st = 'out'; o.t = 0; o.hp = 0; }); });
  await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.phase === 'police' && e.t > 170; }); await shot('enc_7_police');
  var r2 = await page.evaluate(function () { var r = window.__game.ctx.ride, v = window.__game.ctx.view.stats(); return { state: r.state, tris: v.triangles, calls: v.calls }; });
  console.log(JSON.stringify(r1), JSON.stringify(r2), 'errors', JSON.stringify(errs)); await b.close();
})();
