#!/usr/bin/env node
/* The look switch, compared: each place (title, ride, a market fight, the hideout, the stealth stage, the wake room) drawn in every look,
   on a computer and a phone, put side by side in dist/look-desk.png and dist/look-phone.png (rows: places; columns: looks).
   Usage: node tools/lookshots.js [--out dir] */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright');
var URL = 'file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '?dev=1';
var OUT = process.argv.indexOf('--out') > 0 ? process.argv[process.argv.indexOf('--out') + 1] : path.resolve(__dirname, '..', 'dist');
var PLACES = [['title', '#menu'], ['ride', '#ride'], ['fight', '#fight=market,2'], ['hideout', '#hideout'], ['stealth', '#stealth'], ['wake', '#wake']];
var LOOKS = [{ style: 'current', px: 3, vignette: false }, { style: 'soft', px: 3, vignette: true }, { style: 'retro', px: 3, vignette: false }];
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), errs = [], shots = {};
  for (var v of [['desk', 900, 540], ['phone', 390, 760]]) {
    shots[v[0]] = [];
    for (var pl of PLACES) {
      var p = await b.newPage({ viewport: { width: v[1], height: v[2] } });
      p.on('pageerror', function (e) { errs.push(pl[0] + ': ' + e.message); });
      await p.goto(URL + pl[1]); await p.waitForSelector('html[data-ready="1"]');
      if (pl[0] === 'stealth') { await p.waitForTimeout(1200); await p.mouse.click(v[1] / 2, v[2] / 2); }
      await p.waitForTimeout(pl[0] === 'title' ? 3500 : 3000);
      if (pl[0] === 'wake') await p.evaluate(function () { __game.ctx.debug.wake.t = 23.2; });
      var row = [];
      for (var L of LOOKS) {
        await p.evaluate(function (l) { __game.ctx.view.setLook(l); if (__game.ctx.debug.wake) __game.ctx.debug.wake.t = 23.2; }, L);
        await p.waitForTimeout(700);
        var f = path.join(OUT, 'look-' + v[0] + '-' + pl[0] + '-' + L.style + '.png'); await p.screenshot({ path: f }); row.push(f);
      }
      shots[v[0]].push(row); await p.close();
    }
  }
  await b.close();
  /* the sheets (python's PIL, as the other tools do) */
  var py = 'from PIL import Image\nimport json,sys\nS=json.loads(sys.argv[1])\nfor k,rows in S.items():\n  w,h=(300,180) if k=="desk" else (156,304)\n  W=Image.new("RGB",(w*len(rows[0])+6*(len(rows[0])-1),h*len(rows)+6*(len(rows)-1)),"white")\n  for r,row in enumerate(rows):\n    for c,f in enumerate(row): W.paste(Image.open(f).resize((w,h)),(c*(w+6),r*(h+6)))\n  W.save(sys.argv[2]+"/look-"+k+".png")\n';
  fs.writeFileSync(path.join(OUT, '.looksheet.py'), py);
  require('child_process').execFileSync('python3', [path.join(OUT, '.looksheet.py'), JSON.stringify(shots), OUT]);
  fs.unlinkSync(path.join(OUT, '.looksheet.py'));
  Object.keys(shots).forEach(function (k) { shots[k].forEach(function (r) { r.forEach(function (f) { fs.unlinkSync(f); }); }); });
  console.log(JSON.stringify(errs)); console.log(errs.length ? 'LOOKS: FAIL' : 'LOOKS: PASS (sheets in ' + OUT + ')');
})();
