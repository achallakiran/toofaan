#!/usr/bin/env node
/* R1 proof: the hero and a thug look the same with the merged skinned mesh as with separate parts. node tools/skindiff.js outDir */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright'), out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
var file = path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html');
var POSES = ['stand', 'guard', 'jab', 'kick', 'down'];
async function shoot(skin) {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 700, height: 520 } })).newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto('file://' + file + '?skin=' + skin + '#studio'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1500);
  var ids = await page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('[id^="pose-"]'), function (e) { return e.id; }); });
  for (var i = 0; i < ids.length && i < 6; i++) {
    await page.click('#' + ids[i]); await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(out, 'skin' + skin + '_' + ids[i] + '.png') });
  }
  await b.close(); return { ids: ids, errs: errs };
}
(async function () { var a = await shoot(0), c = await shoot(1); console.log(JSON.stringify(a), JSON.stringify(c.errs)); })();
