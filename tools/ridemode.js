#!/usr/bin/env node
/* screenshots of ride mode (Phase 4 M1): node tools/ridemode.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1000, height: 640 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#ride'); await page.waitForSelector('html[data-ready="1"]');
  await page.waitForTimeout(2500); await page.screenshot({ path: path.join(out, 'ride_1_start.png') });
  await page.keyboard.down('KeyW'); await page.waitForFunction(function () { return window.__game.ctx.ride.bike.speed > 12; }, null, { timeout: 20000 }).catch(function () { });
  await page.screenshot({ path: path.join(out, 'ride_1b_speed.png') });
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1200); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
  await page.screenshot({ path: path.join(out, 'ride_2_turn.png') });
  /* force a crash: a bus right ahead */
  await page.evaluate(function () { var r = window.__game.ctx.ride, b = r.bike, v = r.traffic[0]; b.speed = 15; v.kind = 'bus'; v.axis = 'x'; v.line = 0; v.wait = 999; v.x = b.x + Math.sin(b.h) * 3; v.z = b.z + Math.cos(b.h) * 3; v.h = b.h + 1.57; v.s = v.x; });
  await page.waitForFunction(function () { return window.__game.ctx.ride.state === 'fly'; }, null, { timeout: 8000 }).catch(function () { });
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(out, 'ride_3_crash.png') });
  await page.waitForFunction(function () { return window.__game.ctx.ride.state === 'run'; }, null, { timeout: 10000 }).catch(function () { });
  await page.screenshot({ path: path.join(out, 'ride_4_run.png') });
  await page.waitForFunction(function () { return window.__game.ctx.ride.state === 'ride'; }, null, { timeout: 15000 }).catch(function () { });
  /* jump next to the signal */
  await page.evaluate(function () { var r = window.__game.ctx.ride, T = r.target; r.bike.x = T.x + 14; r.bike.z = T.z; r.bike.h = -Math.PI / 2; r.bike.speed = 6; });
  await page.waitForFunction(function () { return window.__game.ctx.ride.state === 'arrived'; }, null, { timeout: 10000 }).catch(function () { });
  await page.screenshot({ path: path.join(out, 'ride_5_arrived.png') });
  var st = await page.evaluate(function () { var r = window.__game.ctx.ride, v = window.__game.ctx.view.stats(); return { state: r.state, crashes: r.crashes, arrivals: r.arrivals, tris: v.triangles, calls: v.calls }; });
  console.log(JSON.stringify(st), 'errors', JSON.stringify(errs)); await b.close();
})();
