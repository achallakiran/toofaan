#!/usr/bin/env node
/* Checks the score plays in each stage (headless, with autoplay allowed): the vocal decodes, and the track follows the game: the ride's
   own, a road fight with a gang plays that gang's song (chase:<gang>), a brawl plays its stage song (intro:, then dance: after the earbuds). */
'use strict';
var path = require('path'), pw = require('playwright');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  var p = await b.newPage({ viewport: { width: 900, height: 540 } }), errs = [];
  p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html') + '#ride'); await p.waitForSelector('html[data-ready="1"]');
  await p.mouse.click(450, 270); await p.waitForTimeout(2500);
  function st() { return p.evaluate(function () { var m = __game.ctx.debug.music; return { playing: m.playing(), track: m.track(), vocal: m.vocalReady(), beat: Math.round(m.beat()) }; }); }
  var ride = await st();
  await p.evaluate(function () { __game.ctx.debug.rideStart('bikes', 'kalia'); }); await p.waitForTimeout(4500); var road = await st();
  await p.evaluate(function () { __game.ctx.go('fight', { type: 'temple' }); }); await p.waitForTimeout(4500); var arena = await st();
  await p.evaluate(function () { __game.ctx.go('studio'); }); await p.waitForTimeout(1500); var studio = await st();
  console.log(JSON.stringify({ ride: ride, road: road, arena: arena, studio: studio, errs: errs }));
  var ok = ride.playing && ride.track === 'ride' && ride.vocal && road.track === 'chase:kalia' && /^(intro|dance):/.test(arena.track) && !studio.playing && !errs.length;
  console.log(ok ? 'MUSIC: PASS' : 'MUSIC: FAIL'); await b.close();
})();
