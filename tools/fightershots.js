#!/usr/bin/env node
/* A late fight (level 5): photographs the crowd of fighter types in an arena, from the game camera and from a close line-up angle. */
'use strict';
var path = require('path'), pw = require('playwright');
var out = path.resolve(__dirname, '..', 'dist');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var p = await b.newPage({ viewport: { width: 1000, height: 600 } }), errs = [];
  p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto('file://' + path.join(out, 'toofan-brawler.html') + '#ride'); await p.waitForSelector('html[data-ready="1"]');
  await p.evaluate(function () { __game.ctx.go('fight', { type: 'market', level: 5 }); });
  await p.waitForTimeout(3500);
  var kinds = await p.evaluate(function () { return __game.ctx.fight.combat.enemies.map(function (e) { return e.kind; }); });
  await p.screenshot({ path: path.join(out, 'fighters-game.png') });
  /* line them up in front of the camera, frozen */
  await p.evaluate(function () {
    var w = __game.ctx.fight, P = w.player, l = w.combat.enemies; w.combat.enabled = false;
    l.forEach(function (e, i) { e.x = e.px = P.x - 4.2 + i * 1.2; e.z = e.pz = P.z - 3; e.face = 0; e.st = 'approach'; e.moving = false; e.guarding = e.kind === 'blocker'; });
    window.__cam = __game.ctx.view.onFrame(function (cam) { cam.position.set(P.x, 1.6, P.z + 1.8); cam.lookAt(P.x, 1.1, P.z - 3); cam.fov = 60; cam.updateProjectionMatrix(); });
  });
  await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, 'fighters-lineup.png') });
  console.log(JSON.stringify({ kinds: kinds, errs: errs })); await b.close();
})();
