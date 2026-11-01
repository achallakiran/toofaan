#!/usr/bin/env node
/* Lines up one of each ride vehicle on the road and photographs them, then a normal ride frame with traffic; prints triangles and draw calls. */
'use strict';
var path = require('path'), pw = require('playwright');
var out = path.resolve(__dirname, '..', 'dist');
(async function () {
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await browser.newContext({ viewport: { width: 1100, height: 620 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(out, 'toofan-brawler.html') + '#ride'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'veh-ride.png') });
  var st = await page.evaluate(function () { var s = __game.ctx.view.stats(); return { tris: s.triangles, calls: s.calls, vehicles: __game.ctx.ride.traffic.length }; });
  /* the line-up: stop the sim, park one of each kind in a row across the road ahead, look from the side */
  await page.evaluate(function () {
    var g = __game, r = g.ctx.ride, b = r.bike, kinds = ['auto', 'car', 'sedan', 'suv', 'taxi', 'tempo', 'pickup', 'bus', 'truck', 'tanker'];
    g.ctx.debug.freeze = true; r.encCool = 1e9;
    r.traffic = kinds.map(function (k, i) { var x = b.x + 6 + i * 3.4; return { id: 9000 + i, kind: k, look: i % 4, x: x, z: b.z + 6 + (k === 'bus' ? 2.5 : 0), px: x, pz: b.z + 6 + (k === 'bus' ? 2.5 : 0), h: 0, ph: 0, v: 0, vmax: 0, wait: 0, axis: 'x', line: 0, dir: 1, lane: 0, s: 0 }; });
    window.__cam = g.ctx.view.onFrame(function (cam) { cam.position.set(b.x + 21, 6.5, b.z - 9); cam.lookAt(b.x + 21, 1.0, b.z + 6); cam.fov = 60; cam.updateProjectionMatrix(); });
  });
  await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, 'veh-lineup.png') });
  await page.evaluate(function () {
    var g = __game, r = g.ctx.ride, b = r.bike; if (window.__cam) window.__cam();
    window.__cam = g.ctx.view.onFrame(function (cam) { cam.position.set(b.x + 21, 3.2, b.z + 15); cam.lookAt(b.x + 21, 1.0, b.z + 6); cam.fov = 60; cam.updateProjectionMatrix(); });
  });
  await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, 'veh-lineup-front.png') });
  console.log(JSON.stringify(st), 'errors:', JSON.stringify(errs));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
