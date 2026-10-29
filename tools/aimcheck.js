#!/usr/bin/env node
/* screenshots of Toofan on the bike with a man on his left and on his right: node tools/aimcheck.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#street'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1000);
  await page.evaluate(function () { var w = window.__game.ctx.world; w.combat.enemies.length = 0; w.combat.enabled = true; w.combat.wave = 0; w.mounted = true; w.mountTick = -99; });
  for (var side of [1, -1]) {
    await page.evaluate(function (sd) { var w = window.__game.ctx.world, bk = w.bike, c = w.combat; c.enemies.length = 0; var e = { id: 900 + sd, kind: 'thug', x: bk.x + Math.cos(bk.h) * 2.2 * sd, z: bk.z - Math.sin(bk.h) * 2.2 * sd, px: 0, pz: 0, face: 0, hp: 60, maxHp: 60, st: 'idle', t: 0, cd: 99999, kx: 0, kz: 0, phase: 0, canBlock: false, guarding: false, guardHits: 0, guardCool: 0, guardTimer: 0, blockT: 99, lastMove: '', hitN: 0 }; e.px = e.x; e.pz = e.z; c.enemies.push(e); }, side);
    await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, 'aim_' + (side > 0 ? 'left' : 'right') + '.png') });
  }
  await b.close();
})();
