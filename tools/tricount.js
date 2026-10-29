#!/usr/bin/env node
/* where do the triangles and draw calls go? node tools/tricount.js */
'use strict';
var path = require('path'), pw = require('playwright');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#street'); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(1500);
  await page.evaluate(function () { var w = window.__game.ctx.world; w.mounted = true; w.mountTick = -99; w.player.x = 64; w.player.z = 0; w.bike.x = 64; w.bike.z = 0; });
  await page.waitForTimeout(5000);
  var r = await page.evaluate(function () {
    var sc = window.__game.ctx.view.scene, out = { chunks: { n: 0, tris: 0 }, other: {} }, w = window.__game.ctx.world;
    function tris(o) { var t = 0, d = 0; o.traverse(function (m) { if (m.isMesh && m.visible && m.geometry) { d++; var g = m.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { t: t, d: d }; }
    out.names = sc.children.map(function (c) { return (c.name || c.type) + '/' + c.children.length; }).slice(0, 40); sc.children.forEach(function (c) { var s = tris(c); if (!s.d) return; var key = c.userData && c.userData.chunk ? 'chunk' : (c.name || c.type); if (c.userData && c.userData.chunk || /^\d+,-?\d+$|^-?\d+,-?\d+$/.test(c.name || '')) { out.chunks.n++; out.chunks.tris += s.t; } else { var k = (c.name || c.type) + ':' + s.d; out.other[k] = Math.round(s.t); } });
    var fine = 0, main = 0; sc.traverse(function (m) { if (m.isMesh && m.geometry && m.geometry.index && m.geometry.index.count > 3000 && !m.parent.isGroup) { } }); out.total = window.__game.ctx.view.stats(); out.enemies = w.combat.enemies.length; out.traffic = w.traffic.list.length; return out;
  });
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
