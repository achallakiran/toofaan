#!/usr/bin/env node
/* The New Game nightmare opening, frame by frame (sleep, dream flash, scream, Raka, waking), then that it hands over to the ride. */
'use strict';
var path = require('path'), pw = require('playwright');
var out = path.resolve(__dirname, '..', 'dist');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var p = await b.newPage({ viewport: { width: 900, height: 540 } }), errs = [];
  p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto('file://' + path.join(out, 'toofan-brawler.html') + '#wake'); await p.waitForSelector('html[data-ready="1"]');
  var T = [0.8, 2.6, 5.3, 7.2, 8.6, 10.6, 12.2], last = 0, i;
  for (i = 0; i < T.length; i++) {
    await p.waitForFunction(function (tt) { var m = __game.modes; return true; }, T[i]);
    await p.waitForTimeout(Math.max(0, (T[i] - last) * 1000)); last = T[i];
    await p.screenshot({ path: path.join(out, 'wake-' + i + '.png') });
  }
  await p.waitForTimeout(3000);
  var mode = await p.evaluate(function () { return __game.modes.currentName(); });
  console.log(JSON.stringify({ after: mode, errs: errs })); await b.close();
})();
