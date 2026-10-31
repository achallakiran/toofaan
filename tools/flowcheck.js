#!/usr/bin/env node
/* the whole loop: ride to a trouble spot -> cut shot -> fight area (brawler) -> cleared -> police on the ride -> next signal. node tools/flowcheck.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1000, height: 600 } })).newPage(), errs = [], res = {};
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html')); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1200);
  function wait(fn, ms) { return page.waitForFunction(fn, null, { timeout: ms || 60000 }).then(function () { return true; }).catch(function () { return false; }); }
  res.startsOnRide = await page.evaluate(function () { return window.__game.modes.currentName() === 'ride' && getComputedStyle(document.getElementById('tabs')).display === 'none'; });
  var key = await page.evaluate(function () { var r = window.__game.ctx.ride, T = r.target; r.bike.x = T.x; r.bike.z = T.z; return T.key; });
  res.arrived = await wait(function () { return window.__game.ctx.ride.state === 'arrived'; });
  await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, 'flow_1_arrive.png') });
  res.inFightArea = await wait(function () { return window.__game.modes.currentName() === 'freeroam'; });
  res.fightStarted = await wait(function () { var w = window.__game.ctx.world; return !!w.locs.active && w.combat.enemies.length > 0; });
  res.fightType = await page.evaluate(function () { var w = window.__game.ctx.world; return w.locs.active && w.locs.active.name; });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, 'flow_2_fight.png') });
  await page.evaluate(function () { window.__game.ctx.world.combat.enemies.forEach(function (e) { e.dead = true; e.st = 'dead'; }); });
  res.backOnRide = await wait(function () { return window.__game.modes.currentName() === 'ride'; });
  res.arrestScene = await wait(function () { var e = window.__game.ctx.ride.enc; return e && e.kind === 'arrest' && e.t > 200; });
  await page.screenshot({ path: path.join(out, 'flow_3_arrest.png') });
  res.ridingOn = await wait(function () { var r = window.__game.ctx.ride; return r.state === 'ride' && r.target && r.target.key !== '__'; }, 90000);
  res.cleared = await page.evaluate(function (k) { var r = window.__game.ctx.ride; return r.missions[k] + ' next=' + (r.target && r.target.key) + ' nextEnc=' + r.nextEnc; }, key);
  await page.waitForTimeout(800); await page.screenshot({ path: path.join(out, 'flow_4_rideon.png') });
  /* a second trouble spot straight after: the fight must start again */
  await page.evaluate(function () { var r = window.__game.ctx.ride; if (r.enc) { r.enc = null; r.state = 'ride'; } var T = r.target; r.bike.x = T.x; r.bike.z = T.z; });
  res.second = await wait(function () { var w = window.__game.ctx.world; return window.__game.modes.currentName() === 'freeroam' && !!w.locs.active && w.combat.enemies.length > 0; }, 90000);
  res.secondType = await page.evaluate(function () { var w = window.__game.ctx.world; return w.locs.active && w.locs.active.name; });
  console.log(JSON.stringify(res), 'errors', JSON.stringify(errs)); await b.close();
})();
