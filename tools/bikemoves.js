#!/usr/bin/env node
/* screenshots of saddle moves: node tools/bikemoves.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#street'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1000);
  await page.evaluate(function () { var w = window.__game.ctx.world; w.combat.enemies.length = 0; w.combat.enabled = true; w.mounted = true; w.mountTick = -99; });
  async function foe(sd) { await page.evaluate(function (sd) { var w = window.__game.ctx.world, bk = w.bike, c = w.combat; c.enemies.length = 0; var e = { id: 900, kind: 'thug', x: bk.x + Math.cos(bk.h) * 1.9 * sd, z: bk.z - Math.sin(bk.h) * 1.9 * sd, px: 0, pz: 0, face: 0, hp: 600, maxHp: 600, st: 'idle', t: 0, cd: 99999, kx: 0, kz: 0, phase: 0, canBlock: false, guarding: false, guardHits: 0, guardCool: 0, guardTimer: 0, blockT: 99, lastMove: '', hitN: 0 }; e.px = e.x; e.pz = e.z; c.enemies.push(e); }, sd); await page.waitForTimeout(900); }
  async function play(name, frames, tag) { for (var i = 0; i < frames.length; i++) { await page.evaluate(function (a) { }, 0); if (i === 0) await page.evaluate(function (n) { window.__game.ctx.world.rideSide = n[1]; window.__moveTest = n[0]; }, [name, name.slice(-1) === 'L' ? 1 : -1]); } }
  var rs = [];
  for (var sd of [-1, 1]) {
    await foe(sd);
    for (var k = 0; k < 6; k++) { await page.keyboard.down('Space'); await page.waitForTimeout(120); await page.keyboard.up('Space'); await page.waitForTimeout(150); if (k === 2 || k === 4) await page.screenshot({ path: path.join(out, 'move_' + (sd > 0 ? 'L' : 'R') + k + '.png') }); }
    await page.keyboard.down('Shift'); await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, 'guard_' + (sd > 0 ? 'L' : 'R') + '.png') }); await page.keyboard.up('Shift'); await page.waitForTimeout(400);
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
