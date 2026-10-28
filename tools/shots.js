#!/usr/bin/env node
/* Screenshots of the Hero studio for visual review: node tools/shots.js outDir name:action ... */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright');
var file = path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html');
var out = process.argv[2] || '/tmp/claude-0/shots'; fs.mkdirSync(out, { recursive: true });
var plan = process.argv.slice(3);
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + file); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1200);
  for (var i = 0; i < plan.length; i++) {
    var parts = plan[i].split(':'), name = parts[0], steps = parts.slice(1);
    for (var j = 0; j < steps.length; j++) {
      var s = steps[j];
      if (s.indexOf('=') > 0) { var kv = s.split('='); await page.evaluate(function (a) { var el = document.getElementById('sl-' + a[0]); el.value = a[1]; el.dispatchEvent(new Event('input')); }, kv); }
      else if (s === 'skeleton') await page.click('#chk-skeleton');
      else if (s.indexOf('chk-') === 0) await page.click('#' + s);
      else await page.click('#' + s);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, name + '.png') });
  }
  console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no errors');
  await b.close();
})();
