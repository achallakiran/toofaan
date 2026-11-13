#!/usr/bin/env node
/* Checks the pause button and menu (headless): in a fight the game's clock and the fixed-step tick stop while the menu is open and carry
   on after; the menu's own buttons work (Restart starts the fight again, Main menu goes to the title, where the button is a gear with
   only the settings); the button keeps clear of the fight's panels and the touch buttons on a phone; the look switch (?dev=1) changes the
   picture and is saved. Screenshots of the menu go to dist/menu-*.png. */
'use strict';
var path = require('path'), pw = require('playwright');
var URL = 'file://' + path.resolve(__dirname, '..', 'dist', 'toofan-brawler.html');
(async function () {
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] }), out = {}, errs = [];
  for (var v of [['desk', 900, 540], ['phone', 390, 760]]) {
    var p = await b.newPage({ viewport: { width: v[1], height: v[2] }, hasTouch: v[0] === 'phone' });
    p.on('pageerror', function (e) { errs.push(e.message); });
    await p.goto(URL + '?dev=1#fight=market,2'); await p.waitForSelector('html[data-ready="1"]'); await p.waitForTimeout(2500);
    var r = {};
    r.t0 = await p.evaluate(function () { return __game.loop.getTick(); });
    await p.click('button[aria-label="Pause"]'); await p.waitForTimeout(150);
    r.pausedTick = await p.evaluate(function () { return __game.loop.getTick(); }); await p.waitForTimeout(1500);
    r.stillTick = await p.evaluate(function () { return __game.loop.getTick(); });
    r.open = await p.evaluate(function () { return __game.menu.isOpen(); });
    await p.screenshot({ path: 'dist/menu-' + v[0] + '-fight.png' });
    /* the look: soft, then saved */
    await p.evaluate(function () { __game.menu.close(); }); await p.waitForTimeout(100);
    await p.click('button[aria-label="Pause"]'); await p.waitForTimeout(100);
    await p.getByText('SOFT', { exact: true }).click(); await p.waitForTimeout(400);
    r.filter = await p.evaluate(function () { return document.getElementById('game').style.filter; });
    r.saved = await p.evaluate(function () { return __game.ctx.save.get('look', null); });
    await p.screenshot({ path: 'dist/menu-' + v[0] + '-soft.png' });
    await p.getByText('CURRENT', { exact: true }).click(); await p.waitForTimeout(100);
    await p.getByText('RESUME', { exact: true }).click(); await p.waitForTimeout(800);
    r.afterTick = await p.evaluate(function () { return __game.loop.getTick(); });
    /* the button against the fight's panels and the touch buttons */
    r.overlap = await p.evaluate(function () {
      var a = document.querySelector('button[aria-label="Pause"]').getBoundingClientRect(), hit = [];
      document.querySelectorAll('body *').forEach(function (e) {
        if (e.closest('button[aria-label="Pause"]') || e.id === 'game' || e.id === 'hud' || e.id === 'touch' || e.id === 'tabs' || e.closest('#tabs') || e.closest('#hud')) return;
        var cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
        var c = e.getBoundingClientRect(); if (c.width < 4 || c.height < 4 || c.width > innerWidth * 0.9) return;
        if (c.left < a.right && c.right > a.left && c.top < a.bottom && c.bottom > a.top && !e.contains(document.querySelector('button[aria-label="Pause"]'))) hit.push((e.id || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 16));
      });
      return hit.slice(0, 6);
    });
    /* restart, then the main menu */
    await p.click('button[aria-label="Pause"]'); await p.getByText('RESTART', { exact: true }).click(); await p.getByText('YES', { exact: true }).click(); await p.waitForTimeout(600);
    r.restarted = await p.evaluate(function () { return __game.modes.currentName(); });
    await p.click('button[aria-label="Pause"]'); await p.getByText('MAIN MENU', { exact: true }).click(); await p.getByText('YES', { exact: true }).click(); await p.waitForTimeout(1500);
    r.title = await p.evaluate(function () { return __game.modes.currentName(); });
    r.gear = await p.evaluate(function () { var x = document.querySelector('button[aria-label="Settings"]'); return !!x && getComputedStyle(x).display !== 'none'; });
    await p.click('button[aria-label="Settings"]'); await p.waitForTimeout(200);
    await p.screenshot({ path: 'dist/menu-' + v[0] + '-title.png' });
    r.titleTicks = await p.evaluate(function () { var t = __game.loop.getTick(); return new Promise(function (res) { setTimeout(function () { res(__game.loop.getTick() - t); }, 500); }); });
    out[v[0]] = r; await p.close();
  }
  var ok = Object.keys(out).every(function (k) { var r = out[k]; return r.open && r.stillTick === r.pausedTick && r.afterTick > r.stillTick && /saturate/.test(r.filter) && r.saved && r.saved.style === 'soft' && !r.overlap.length && r.restarted === 'fight' && r.title === 'title' && r.gear && r.titleTicks > 0; }) && !errs.length;
  console.log(JSON.stringify(out), JSON.stringify(errs));
  console.log(ok ? 'MENU: PASS' : 'MENU: FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
