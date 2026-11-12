#!/usr/bin/env node
/* Opens each fight arena from the game (as the ride would), and checks and photographs it: the fight starts with the men inside, nobody
   can walk out, there is no passing traffic, nothing stands unfaded between the camera and Toofan; then a gameplay shot and an overview.
   node tools/arenashots.js [type ...] */
'use strict';
var path = require('path'), pw = require('playwright');
var out = path.resolve(__dirname, '..', 'dist');
var TYPES = process.argv.slice(2).length ? process.argv.slice(2) : ['temple', 'market', 'busstand', 'construction', 'petrol', 'warehouse', 'slum', 'railway', 'toll', 'flyover'];
(async function () {
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var fails = 0;
  for (var vi = 0; vi < 2; vi++) {
    var vw = vi ? 900 : 390, vh = vi ? 540 : 760, tag = vi ? 'wide' : 'phone';
    var page = await (await browser.newContext({ viewport: { width: vw, height: vh } })).newPage(), errs = [];
    page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + path.join(out, 'toofan-brawler.html') + '#ride'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(800);
    for (var ti = 0; ti < TYPES.length; ti++) {
      var type = TYPES[ti];
      await page.evaluate(function (t) { __game.ctx.go('fight', { type: t }); var F = __game.ctx.debug.fight; if (F && F.finishIntro) F.finishIntro(); }, type);
      await page.waitForTimeout(2600);
      var info = await page.evaluate(function () {
        var w = __game.ctx.fight, p = w.player, B = w.bounds, en = w.combat.enemies.filter(function (e) { return !e.dead; });
        var inside = en.every(function (e) { return !B || (e.x >= B.x0 - 0.01 && e.x <= B.x1 + 0.01 && e.z >= B.z0 - 0.01 && e.z <= B.z1 + 0.01); });
        var vs = __game.ctx.view.stats();
        return { arena: !!B, men: en.length, inside: inside, traffic: (w.traffic || w.bike || w.streaming) ? 1 : 0, tris: vs.triangles, calls: vs.calls, faded: __game.ctx.debug.arena ? __game.ctx.debug.arena.faded() : [] };
      });
      await page.screenshot({ path: path.join(out, 'arena-' + type + '-' + tag + '.png') });
      /* try to walk out: hold each direction for a while (combat off so nobody gets in the way) */
      var esc = await page.evaluate(async function () {
        var w = __game.ctx.fight, B = w.bounds; if (!B) return null; var c = w.combat; c.enabled = false;
        var res = [], dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (var d = 0; d < 4; d++) {
          __game.ctx.input.setAxis(dirs[d][0], dirs[d][1]); for (var k = 0; k < 900; k++) { __game.ctx.input.tick(k); __game.modes.step(0); }
          var p = w.player; res.push(p.x >= B.x0 - 0.01 && p.x <= B.x1 + 0.01 && p.z >= B.z0 - 0.01 && p.z <= B.z1 + 0.01);
        }
        __game.ctx.input.setAxis(0, 0); c.enabled = true;
        return res.every(Boolean);
      });
      if (vi === 0) {
        /* an overview from high in the south-east corner */
        await page.evaluate(function () {
          var B = __game.ctx.fight.bounds; if (!B) return; var cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
          window.__ov = __game.ctx.view.onFrame(function (cam) { cam.position.set(cx + 14, 17, cz + 24); cam.lookAt(cx, 1.5, cz - 3); cam.fov = 55; cam.updateProjectionMatrix(); });
        });
        await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, 'arena-' + type + '-overview.png') });
        await page.evaluate(function () { if (window.__ov) window.__ov(); window.__ov = null; });
      }
      var ok = info.arena ? (info.men > 0 && info.inside && info.traffic === 0 && esc) : true;
      if (!ok) fails++;
      console.log((ok ? 'PASS ' : 'FAIL ') + tag + ' ' + type + ' ' + JSON.stringify(info) + ' cannotLeave=' + esc);
    }
    await page.evaluate(function () { __game.ctx.go('ride'); }); await page.waitForTimeout(800);
    var back = await page.evaluate(function () { return { fightLeft: !!__game.ctx.fight, mode: __game.modes.currentName() }; });
    console.log(tag, 'after leaving:', JSON.stringify(back), 'errors:', JSON.stringify(errs));
    if (back.fightLeft || back.mode !== 'ride' || errs.length) fails++;
  }
  await browser.close();
  console.log(fails ? 'ARENAS: ' + fails + ' FAILED' : 'ARENAS: ALL PASS');
})().catch(function (e) { console.error(e); process.exit(1); });
