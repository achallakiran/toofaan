#!/usr/bin/env node
/* freeze-frame screenshots of Toofan's side strikes landing on the goons, and a goon's blow landing on Toofan: node tools/strikeshots.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1000, height: 600 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#ride'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1500);
  await page.evaluate(function () { window.__game.ctx.debug.rideStart('bikes'); });
  await page.waitForFunction(function () { var e = window.__game.ctx.ride.enc; return e && e.phase === 'fight' && e.foes.filter(function (o) { return o.st !== 'approach'; }).length >= 2; }, null, { timeout: 60000 }).catch(function () { });
  var moves = [['bkJabL', 1], ['bkHookR', -1], ['bkElbowL', 1], ['bkKickR', -1], ['bkKickL', 1]];
  for (var i = 0; i < moves.length; i++) {
    await page.evaluate(function (m) {
      var g = window.__game.ctx, e = g.ride.enc; g.debug.freeze = true;
      e.foes.forEach(function (o) { if (o.st !== 'down') { o.st = 'ready'; o.t = 0; } });
      e.hero.act = { move: m[0], t: 12, hitAt: 12, len: 30, counter: false, side: m[1] }; e.hero.side = m[1];
    }, moves[i]);
    await page.waitForTimeout(900); await page.screenshot({ path: path.join(out, 'strike_' + moves[i][0] + '.png') });
  }
  await page.evaluate(function () { var g = window.__game.ctx, e = g.ride.enc; e.hero.act = null; var o = e.foes.filter(function (q) { return q.st !== 'down'; })[0]; o.st = 'recover'; o.t = 2; });
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(out, 'strike_goon_blow.png') });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
