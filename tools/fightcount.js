#!/usr/bin/env node
/* draw calls and triangles in a fight: node tools/fightcount.js [men=5,7] [file]  (set TIER=low|medium|high to force a tier once R0 exists) */
'use strict';
var path = require('path'), pw = require('playwright');
var counts = (process.argv[2] || '5,7').split(',').map(Number), file = process.argv[3] || path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto('file://' + file + ('?skin=' + (process.env.SKIN || 1) + (process.env.TIER ? '&tier=' + process.env.TIER : '')) + '#street'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1500);
  for (var i = 0; i < counts.length; i++) {
    var n = counts[i];
    var r = await page.evaluate(function (n) {
      var g = window.__game.ctx, w = g.world; w.mounted = false; w.player.x = 0; w.player.z = 0; w.combat.auto = false;
      var list = w.combat.enemies, proto = list[0] ? JSON.parse(JSON.stringify(list[0])) : { id: 1, kind: 'thug', x: 0, z: 0, px: 0, pz: 0, face: 0, hp: 9999, maxHp: 9999, st: 'approach', t: 0, cd: 60, kx: 0, kz: 0, phase: 0, canBlock: false, guarding: false, guardHits: 0, guardCool: 0, guardTimer: 0, blockT: 99, lastMove: '', hitN: 0 }; list.length = 0;
      for (var k = 0; k < n; k++) { var e = JSON.parse(JSON.stringify(proto)); e.id = 900 + k; e.x = e.px = Math.cos(k / n * 6.28) * 3.2; e.z = e.pz = Math.sin(k / n * 6.28) * 3.2; e.st = 'approach'; e.hp = e.maxHp = 9999; list.push(e); }
      return list.length;
    }, n);
    await page.waitForTimeout(2500);
    var s = await page.evaluate(function () {
      var v = window.__game.ctx.view, st = v.stats(), cam = v.camera, vis = 0, tri = 0;
      v.scene.traverse(function (m) { if (m.isMesh && m.visible) { var p = m.parent, ok = true; while (p) { if (p.visible === false) { ok = false; break; } p = p.parent; } if (ok) { vis++; } } });
      return { tris: st.triangles, calls: st.calls, visibleMeshes: vis, tier: window.__game.ctx.view.tierId, ms: Math.round(st.ms) };
    });
    console.log(n + ' men', JSON.stringify(s));
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
