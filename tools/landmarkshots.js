#!/usr/bin/env node
/* Each trouble spot's landmark on the ride map, photographed from the road in front of it (camera held with window.__camShot), into
   outDir (default dist) as mark-<key>.png. Fails on page errors. */
'use strict';
var pw = require('playwright'), path = require('path');
var out = process.argv[2] || path.resolve(__dirname, '..', 'dist'), FILE = 'file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 900, height: 540 } }), errs = [];
  p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto(FILE + '#ride'); await p.waitForSelector('html[data-ready="1"]'); await p.waitForTimeout(1500);
  var keys = await p.evaluate(function () { var r = __game.ctx.ride; r.patrolCool = 1e9; r.patrols = []; return r.map.targets.map(function (T) { return T.key; }); });
  for (var i = 0; i < keys.length; i++) {
    await p.evaluate(function (k) {
      var r = __game.ctx.ride, T = r.map.targets.filter(function (q) { return q.key === k; })[0], B = r.bike, f = T.line + T.side * 10;
      /* the bike parked on the far lane opposite, the camera across the road, looking at the facade */
      if (T.axis === 'x') { B.x = B.px = T.x + 6; B.z = B.pz = T.line - T.side * 5.1; __camShot = { x: T.x - 1, y: 4.2, z: T.line - T.side * 9, lx: T.x, ly: 4.5, lz: f - T.side * 2, fov: 62 }; }
      else { B.x = B.px = T.line - T.side * 5.1; B.z = B.pz = T.z + 6; __camShot = { x: T.line - T.side * 9, y: 4.2, z: T.z - 1, lx: f - T.side * 2, ly: 4.5, lz: T.z, fov: 62 }; }
      B.speed = 0; r.target = null;
    }, keys[i]);
    await p.waitForTimeout(1800); await p.screenshot({ path: path.join(out, 'mark-' + keys[i] + '.png') });
  }
  console.log((errs.length ? 'LANDMARKS: FAIL ' : 'LANDMARKS: PASS ') + keys.join(',') + ' ' + JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
