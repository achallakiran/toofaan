#!/usr/bin/env node
/* Records the score headless into an audio file so it can be heard outside the game: each track for a few bars, in turn.
   node tools/musicrender.js out.webm */
'use strict';
var path = require('path'), fs = require('fs'), pw = require('playwright');
var out = process.argv[2] || 'music.webm';
var PLAN = [['menu', 30], ['ride', 15], ['road', 15], ['arena', 15], ['boss', 8], ['sting', 4], ['hideout', 15], ['thappad', 11]];
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  var p = await b.newPage({ viewport: { width: 640, height: 400 } });
  await p.addInitScript(function () {
    var orig = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest) {
      var r = orig.apply(this, arguments);
      if (dest && this.context && dest === this.context.destination) {
        var ctx = this.context; if (!ctx.__rec) { ctx.__rec = ctx.createMediaStreamDestination(); window.__recStream = ctx.__rec.stream; }
        orig.call(this, ctx.__rec);
      }
      return r;
    };
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#studio'); await p.waitForSelector('html[data-ready="1"]');
  await p.mouse.click(320, 200);
  await p.evaluate(function () { var m = __game.ctx.debug.music; m.setTrack('menu'); });
  await p.waitForFunction(function () { return !!window.__recStream && __game.ctx.debug.music.vocalReady(); }, null, { timeout: 15000 });
  await p.evaluate(function (plan) {
    window.__chunks = []; var rec = new MediaRecorder(window.__recStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 });
    rec.ondataavailable = function (e) { window.__chunks.push(e.data); }; rec.start(1000); window.__rec = rec;
    var m = __game.ctx.debug.music, t = 0;
    plan.forEach(function (st) { setTimeout(function () { m.setTrack(st[0]); }, t * 1000); t += st[1]; });
    window.__total = t;
  }, PLAN);
  var total = PLAN.reduce(function (a, s) { return a + s[1]; }, 0);
  await p.waitForTimeout((total + 2) * 1000);
  var b64 = await p.evaluate(function () { return new Promise(function (res) { window.__rec.onstop = function () { var fr = new FileReader(); fr.onload = function () { res(fr.result.split(',')[1]); }; fr.readAsDataURL(new Blob(window.__chunks, { type: 'audio/webm' })); }; window.__rec.stop(); }); });
  fs.writeFileSync(out, Buffer.from(b64, 'base64')); console.log('wrote', out, PLAN.map(function (s) { return s[0] + ' ' + s[1] + 's'; }).join(', '));
  await b.close();
})();
