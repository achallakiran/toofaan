#!/usr/bin/env node
/* screenshots of the city with traffic, people and a fight location: node tools/cityview.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#street'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1000);
  async function at(x, z, h, name, wait) {
    await page.evaluate(function (a) { var w = window.__game.ctx.world; w.combat.enemies.length = 0; w.locs.cleared = {}; w.mounted = true; w.mountTick = -99; w.bike.x = a[0]; w.bike.z = a[1]; w.bike.h = a[2]; w.bike.speed = 0; w.player.x = a[0]; w.player.z = a[1]; }, [x, z, h]);
    await page.waitForFunction(function () { return window.__game.ctx.world.traffic.list.length >= 6; }, null, { timeout: 12000 }).catch(function () { });
    await page.waitForTimeout(wait || 1500); await page.screenshot({ path: path.join(out, name + '.png') });
  }
  await at(40, -1, Math.PI / 2, 'city_east', 2500);
  var st = await page.evaluate(function () { var w = window.__game.ctx.world, l = w.traffic.list, k = {}; l.forEach(function (e) { k[e.kind] = (k[e.kind] || 0) + 1; }); return { kinds: k, next: w.locs.next, active: w.locs.active, dc: document.body.innerText.match(/Draw calls\s*\n?\s*(\d+)/) }; });
  console.log(JSON.stringify(st));
  await at(86, -1, Math.PI / 2, 'busstand', 3000); await at(-24, -1, -Math.PI / 2, 'petrol', 3000);
  var st2 = await page.evaluate(function () { var w = window.__game.ctx.world; return { active: w.locs.active, men: w.combat.enemies.length, banner: w.combat.banner }; });
  console.log(JSON.stringify(st2), 'errors', JSON.stringify(errs)); await b.close();
})();
