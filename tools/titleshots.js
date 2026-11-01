#!/usr/bin/env node
/* Plays the title sequence of the built file headless and saves frames: tap screen, logo, presents, the video, the menu (phone and wide). */
'use strict';
var path = require('path'), pw = require('playwright');
var out = path.resolve(__dirname, '..', 'dist');
(async function () {
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });   /* default autoplay rules, like a phone */
  async function run(vw, vh, tag, full) {
    var page = await (await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: tag === 'phone' })).newPage(), errs = [];
    page.on('pageerror', function (e) { errs.push(e.message); }); page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + path.join(out, 'toofan-brawler.html')); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(600);
    var mode = await page.evaluate(function () { return __game.modes.currentName(); });
    if (full) {
      /* the opening card, then a tap: the logo with sound, the video */
      await page.waitForTimeout(1400); await page.screenshot({ path: path.join(out, 'title-0-card-' + tag + '.png') });
      var card = await page.evaluate(function () { return /ADA STUDIOS/.test(document.body.innerText) && /TAP TO CONTINUE/.test(document.body.innerText); });
      await page.mouse.click(vw / 2, vh / 2);
      await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, 'title-1-logo-' + tag + '.png') });
      var audio = await page.evaluate(function () { return __game.ctx.debug; });
      for (var k = 0; k < 4; k++) { await page.waitForTimeout(k === 0 ? 3500 : 5000); await page.screenshot({ path: path.join(out, 'title-3-video' + k + '-' + tag + '.png') }); }
      console.log(tag, 'card shown:', card);
      await page.click('text=SKIP');
    } else {
      await page.mouse.click(vw / 2, vh / 2); await page.waitForTimeout(500); await page.click('text=SKIP');
    }
    await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, 'title-4-menu-a-' + tag + '.png') });
    await page.waitForTimeout(3800); await page.screenshot({ path: path.join(out, 'title-4-menu-b-' + tag + '.png') });
    var btns = await page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('button[id^=t]'), function (b) { return b.textContent; }); });
    await page.click('text=NEW GAME'); await page.waitForTimeout(1500);
    var after = await page.evaluate(function () { return __game.modes.currentName(); });
    /* drive a little, then reload: Continue should show and carry on from there */
    await page.keyboard.down('KeyW'); await page.waitForTimeout(4000); await page.keyboard.up('KeyW'); await page.waitForTimeout(3500);
    var pos = await page.evaluate(function () { var b = __game.ctx.ride.bike; return { x: b.x, z: b.z }; });
    await page.goto('file://' + path.join(out, 'toofan-brawler.html') + '#menu'); await page.reload(); await page.waitForSelector('html[data-ready="1"]'); await page.waitForTimeout(2400);
    var btns2 = await page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('button[id^=t]'), function (b) { return b.textContent; }); });
    await page.screenshot({ path: path.join(out, 'title-5-menu-continue-' + tag + '.png') });
    await page.click('text=CONTINUE'); await page.waitForTimeout(1200);
    var pos2 = await page.evaluate(function () { var b = __game.ctx.ride.bike; return { x: b.x, z: b.z, mode: __game.modes.currentName() }; });
    console.log(tag, JSON.stringify({ start: mode, menu: btns, afterNew: after, pos: pos, menu2: btns2, cont: pos2, errs: errs }));
  }
  await run(390, 760, 'phone', true);
  await run(900, 540, 'wide', false);
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
