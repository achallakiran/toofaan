#!/usr/bin/env node
/* Checks Toofan's hands and forearms never go inside his quilt in the opening (asleep, tossing, the scream, sitting up), and that his
   knees stay under it: steps the scene's clock through the whole sleep and samples each forearm against the quilt's height there. */
'use strict';
var path = require('path'), pw = require('playwright');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl'] }), p = await b.newPage({ viewport: { width: 640, height: 400 } }), errs = [];
  p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#wake'); await p.waitForSelector('html[data-ready="1"]');
  await p.waitForFunction(function () { return __game.ctx.debug.wake && __game.ctx.debug.wake.rig; }, null, { timeout: 60000 });
  var res = await p.evaluate(function () {
    var res0 = {}, W = __game.ctx.debug.wake, worst = { d: 0, t: 0, what: '' }, kneesOut = 0, frames = 0, v = new THREE.Vector3(), a = new THREE.Vector3();
    for (var t = 1.0; t < 31; t += 0.05) { if (W.done) break;
      W.t = t; W.renderOnce();
      var Q = W.rig.root.parent === W.lie ? W.quiltLie : W.quiltSit; if (!Q.visible) continue; frames++;
      W.rig.root.updateMatrixWorld(true);
      ['L', 'R'].forEach(function (s) {
        var P = W.rig.parts[s]; P.elbow.getWorldPosition(a); P.wrist.getWorldPosition(v);
        for (var k = 0; k <= 4; k++) {
          var x = a.x + (v.x - a.x) * k / 4, y = a.y + (v.y - a.y) * k / 4, z = a.z + (v.z - a.z) * k / 4, h = Q.heightAt(x, z);
          if (h > 0 && h - y > worst.d) worst = { d: h - y, t: +t.toFixed(2), what: s + (k === 4 ? ' hand' : ' forearm') };
        }
        P.knee.getWorldPosition(v); var hk = Q.heightAt(v.x, v.z); if (hk > 0 && v.y > hk + 0.01) kneesOut++;
        if (P.toe) { P.toe.getWorldPosition(v); a.copy(v); P.ankle.getWorldPosition(v); a.add(a.clone().sub(v).multiplyScalar(0.45)); var ht = Q.heightAt(a.x, a.z); if (ht > 0 && a.y > ht + 0.01) { kneesOut++; if (a.y - ht > (res0.toe || 0)) { res0.toe = +(a.y - ht).toFixed(3); res0.at = [+a.x.toFixed(2), +a.y.toFixed(2), +a.z.toFixed(2), +ht.toFixed(2)]; } } }   /* (and his toes) */
      });
    }
    return { worst: worst, kneesOut: kneesOut, frames: frames, toe: res0 };
  });
  var ok = res.frames > 100 && res.worst.d < 0.02 && res.kneesOut === 0 && !errs.length;
  console.log(JSON.stringify(res), JSON.stringify(errs));
  console.log(ok ? 'BED: PASS' : 'BED: FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
