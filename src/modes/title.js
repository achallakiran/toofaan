/* modes: the title sequence. Tap to start (browsers only let sound begin after a tap), the ADA badge crackles in and shorts out,
   "ADA STUDIOS PRESENTS" does the same, then the 30-second opening video plays in time with the theme (skippable), and the main
   menu: a crane shot rising from low at Toofan's front right as he rides Bijli, the title, and New Game / Continue. */
'use strict';

var R = require('../data/ride');
var rideSim = require('../sim/ride');
var rideview = require('../view/rideview');
var sfxmod = require('../view/sfx');
var music = require('../view/music');
var electric = require('../view/electric');
var intro = require('../view/intro');
var LOGO = require('../data/logo');

function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
var BTN = 'display:block;width:min(78vw,320px);margin:10px auto 0;padding:14px 0;border-radius:6px;border:3px solid #000;font:900 20px \'Arial Black\',Impact,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:5px 5px 0 #000;touch-action:manipulation';

function hasSave(ctx) { return !!(ctx.save.get('ride.pos', null) || ctx.save.get('ride.missions', null)); }

function createTitle() {
  var S = {};
  return {
    name: 'title',
    enter: function (ctx, scope, args) {
      ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = true;
      S.sfx = sfxmod.createSfx(); S.music = music.createMusic(S.sfx); S.last = 0; S.t = 0; S.v = null; S.vid = null; S.el = null;
      scope.add(function () { S.music.stop(0.6); });
      var layer = document.createElement('div');
      layer.style.cssText = 'position:fixed;inset:0;z-index:44;pointer-events:none;font-family:system-ui,sans-serif;color:#fff';
      document.body.appendChild(layer); scope.add(function () { layer.remove(); });
      S.layer = layer;
      S.fx = electric.createElectric(function (p) { S.sfx.zap(p); }); scope.add(function () { if (S.fx) S.fx.dispose(); });
      S.img = new Image(); S.img.src = LOGO.ADA;
      /* skip: jumps straight to the menu from anywhere in the opening */
      var skip = document.createElement('button'); skip.textContent = 'SKIP ▸▸'; skip.setAttribute('data-ok', '1');
      skip.style.cssText = 'position:fixed;z-index:46;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));padding:9px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.5);color:#fff;font:800 13px system-ui,sans-serif;letter-spacing:.1em;cursor:pointer;display:none;touch-action:manipulation';
      skip.addEventListener('click', function (e) { e.stopPropagation(); toMenu(); });
      document.body.appendChild(skip); scope.add(function () { skip.remove(); }); S.skip = skip;

      function toMenu() {
        if (S.phase === 'menu') return;
        S.phase = 'menu'; S.t = 0; skip.style.display = 'none';
        if (S.fx) { S.fx.dispose(); S.fx = null; }
        if (S.vid) { S.vid.dispose(); S.vid = null; }
        if (S.music.playing()) S.music.toLoop(); else S.music.play('loop');
        buildMenu();
      }
      S.toMenu = toMenu;

      /* the opening needs a tap first; returning from the game (args.menu) goes straight to the menu */
      if (args && args.menu) { S.phase = 'tap'; toMenu(); return; }
      S.phase = 'tap';
      var tap = document.createElement('div'); tap.setAttribute('data-ok', '1');
      tap.style.cssText = 'position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:#000;cursor:pointer;touch-action:manipulation';
      tap.innerHTML = '<div style="text-align:center;font:900 15px system-ui,sans-serif;letter-spacing:.3em;color:#9fd0ff;animation:tpulse 1.4s ease-in-out infinite">TAP TO START</div>' +
        '<style>@keyframes tpulse{0%,100%{opacity:.35}50%{opacity:1}}</style>';
      document.body.appendChild(tap); scope.add(function () { tap.remove(); });
      function begin() {
        if (S.phase !== 'tap') return;
        tap.remove(); S.sfx.wake(); S.phase = 'logo'; S.t = 0; skip.style.display = 'block';
        S.fx.show({ img: S.img, dur: 3.6 });
      }
      tap.addEventListener('click', begin);
      var key = function (e) { if (e.key === 'Enter' || e.key === ' ') begin(); };
      window.addEventListener('keydown', key); scope.add(function () { window.removeEventListener('keydown', key); });

      function buildMenu() {
        var view = ctx.view; view.setSky('#a9c7da', false);
        var bus = { emit: function () {}, on: function () { return function () {}; } };
        var r = S.r = rideSim.createRide(ctx.world.seed, bus); r.traffic = []; r.target = null; r.encCool = 1e9;
        var mid = r.map.lines[Math.floor(R.GRID / 2)];
        S.lane = mid - R.LANES[0]; r.bike.h = r.bike.ph = Math.PI / 2; r.bike.speed = 11; r.bike.x = r.bike.px = -150; r.bike.z = r.bike.pz = S.lane;
        S.v = rideview.createRideView(view.scene); S.v.build(r.map); S.v.prime(r.bike.x, r.bike.z);
        scope.add(function () { if (S.v) { S.v.dispose(); S.v = null; } });
        var el = S.el = document.createElement('div');
        el.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:max(26px,env(safe-area-inset-top)) 16px max(26px,env(safe-area-inset-bottom));opacity:0;transition:opacity .6s';
        var cont = hasSave(ctx);
        el.innerHTML =
          '<div style="text-align:center;transform:rotate(-4deg)"><div style="font:900 clamp(52px,min(15vw,20vh),150px)/.9 \'Arial Black\',Impact,system-ui,sans-serif;color:#ffd21f;-webkit-text-stroke:3px #000;text-shadow:7px 7px 0 #000;letter-spacing:.02em">TOOFAN</div>' +
          '<div style="margin-top:6px;font:900 clamp(12px,3vw,18px) system-ui,sans-serif;letter-spacing:.35em;color:#fff;text-shadow:2px 2px 0 #000">AAYA AAYA AAYA RE</div></div>' +
          '<div style="pointer-events:auto">' +
          (cont ? '<button id="tCont" data-ok="1" style="' + BTN + ';background:#ffd21f;color:#000">CONTINUE</button>' : '') +
          '<button id="tNew" data-ok="1" style="' + BTN + ';background:' + (cont ? '#fff' : '#ffd21f') + ';color:#000">NEW GAME</button></div>';
        document.body.appendChild(el); scope.add(function () { el.remove(); });
        setTimeout(function () { el.style.opacity = 1; }, 1600);
        var nb = el.querySelector('#tNew'), cb = el.querySelector('#tCont');
        nb.addEventListener('click', function () { S.sfx.wake(); ctx.save.set('ride.missions', null); ctx.save.set('ride.pos', null); ctx.ride = null; ctx.go('ride'); });
        if (cb) cb.addEventListener('click', function () { S.sfx.wake(); ctx.go('ride'); });
      }
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var renderer = ctx.view.renderer;
      if (S.phase === 'tap') { renderer.setClearColor(0x000000, 1); renderer.clear(); return; }
      if (S.phase === 'logo' || S.phase === 'presents') {
        if (!S.fx.draw(dt)) {
          if (S.phase === 'logo') { S.phase = 'presents'; S.fx.show({ lines: ['ADA STUDIOS', 'PRESENTS'], dur: 2.8 }); }
          else {
            S.phase = 'video'; S.t = 0; S.fx.dispose(); S.fx = null;
            S.vid = intro.createIntro(renderer); S.playing = S.music.play('intro'); S.vStart = now;
          }
        }
        return;
      }
      if (S.phase === 'video') {
        var beat = S.music.beat(); if (beat < 0) beat = (now - S.vStart) / 1000 / (60 / S.music.BPM);
        if (ctx.debug.introBeat !== undefined) beat = ctx.debug.introBeat;            /* tools can hold a frame */
        if (beat >= S.vid.BEATS) { S.toMenu(); return; }
        S.vid.render(Math.max(0, beat), S.t);
        return;
      }
      /* the menu: Bijli rides along the road; the camera starts low at her front right and cranes up and back */
      if (!S.v) return;
      if (S.sfx.on && !S.music.playing()) S.music.play('loop'); else if (!S.sfx.on && S.music.playing()) S.music.stop(0.3);
      var r = S.r, b = r.bike;
      b.px = b.x; b.pz = b.z; b.ph = b.h; b.x += b.speed * dt; b.turn = Math.sin(S.t * 0.7) * 0.012; b.z = S.lane + Math.sin(S.t * 0.7) * 0.5;
      if (b.x > 150) { b.x = b.px = -150; S.v.prime(b.x, b.z); }
      S.v.sync(r, 1, dt, S.t);
      var u = ease(S.t / 4.2), w = renderer.domElement.clientWidth || 800, hgt = renderer.domElement.clientHeight || 600, tall = hgt > w;
      var ahead = 2.4 + u * (tall ? 4.6 : 9.5), right = 1.6 + u * (tall ? 1.4 : 4.2), y = 0.25 + u * (tall ? 1.9 : 2.2) + Math.sin(S.t * 0.5) * 0.08 * u;
      var shot = { x: b.x + ahead, y: y, z: b.z + right, lx: b.x + 0.4, ly: 1.5 + u * (tall ? 0.15 : 0.35), lz: b.z, fov: tall ? 62 : 44 };
      ctx.view.followCamera(0, 0, shot);
      ctx.view.render();
    },
    exit: function () {}
  };
}

module.exports = { createTitle: createTitle };
