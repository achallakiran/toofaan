#!/usr/bin/env node
/* Opens the built file from file:// in headless Chromium with every network request refused,
   drives the keyboard, and checks the game ran, streamed chunks and logged no errors. */
'use strict';
var path = require('path');
var pw = require('playwright');
var file = path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html');
var shotDir = process.argv[2] || path.resolve(__dirname, '..', 'dist');

(async function () {
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  var page = await ctx.newPage(), errors = [], blocked = [];
  await ctx.route(/^https?:/, function (r) { blocked.push(r.request().url()); r.abort(); });
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + file + '#street');
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
  await page.waitForTimeout(600);
  var t0 = await page.evaluate(function () { return window.__game.loop.getTick(); });

  await page.evaluate(function () { window.__game.ctx.world.combat.enabled = false; });      /* the streaming walk must not be interrupted by thugs */
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(9000);
  await page.keyboard.up('KeyD');
  for (var i = 0; i < 9; i++) { await page.keyboard.down('KeyJ'); await page.waitForTimeout(60); await page.keyboard.up('KeyJ'); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  var r = await page.evaluate(function () {
    window.__game.ctx.world.combat.enabled = true;
    var g = window.__game, w = g.ctx.world;
    return { tick: g.loop.getTick(), x: w.player.x, rage: w.player.rage, chunks: w.streaming.loadedCount(), loads: w.streaming.stats.loads,
      unloads: w.streaming.stats.unloads, peak: w.streaming.stats.peakLoaded, view: g.ctx.view.stats(), finVisible: !document.getElementById('btnFinisher').hidden,
      hash: g.hashWorld(), mode: g.modes.currentName() };
  });
  await page.screenshot({ path: path.join(shotDir, 'shot-desktop.png') });
  await page.evaluate(function () { var w = window.__game.ctx.world; w.player.rage = 100; w.player.hp = 100; w.player.stun = 0; w.player.down = false; });
  await page.waitForTimeout(300);
  var enemiesSeen = await page.evaluate(function () { return window.__game.ctx.world.combat.enemies.length; });
  await page.keyboard.down('KeyL'); await page.waitForTimeout(80); await page.keyboard.up('KeyL'); await page.waitForTimeout(400);
  var after = await page.evaluate(function () { return { rage: window.__game.ctx.world.player.rage, fin: window.__game.ctx.world.counters.finishers }; });

  /* phone-sized viewport with touch layout */
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shotDir, 'shot-phone.png') });
  await browser.close();

  console.log(JSON.stringify({ ticksRan: r.tick - t0, playerX: +r.x.toFixed(2), rageBeforeFinisher: r.rage, finisherButtonVisible: r.finVisible,
    afterFinisher: after, chunks: r.chunks, loads: r.loads, unloads: r.unloads, peak: r.peak, mode: r.mode,
    chunkMeshes: r.view.chunkMeshes, triangles: r.view.triangles, calls: r.view.calls, geometries: r.view.geometries, blockedRequests: blocked, errors: errors }, null, 1));
  var ok = r.tick - t0 > 150 && r.x > 20 && r.chunks === 25 && r.unloads > 0 && r.view.chunkMeshes === 25 && r.view.geometries <= 25 + 21 + 26 + 10 && r.peak <= 25 && blocked.length === 0 && errors.length === 0 && enemiesSeen > 0 && after.fin === 1;
  console.log(ok ? 'OFFLINE VERIFY: PASS' : 'OFFLINE VERIFY: FAIL');
  process.exit(ok ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(2); });
