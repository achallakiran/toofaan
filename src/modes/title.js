/* modes: the title sequence. A quiet dark card, "ADA STUDIOS PRESENTS", with a small blinking "tap to continue"; the tap lets sound
   start (browsers, phones above all, keep a page silent until it is touched). Then the ADA badge crackles in and shorts out with its
   zaps, the 30-second opening video plays in time with the theme (skippable), and the main
   menu: a crane shot rising from low at Toofan's front right as he rides Bijli, the title, and New Game / Continue.
   The video keeps its own clock and the music follows it. On Android, New Game / Continue also go full screen and turn the phone sideways. */
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

/* Android: the menu press is the moment a page may go full screen and lock the screen sideways (both need a tap; either may be refused,
   e.g. inside a frame that does not allow full screen; then the game simply carries on as it is) */
function bigScreen() {
  try {
    if (!/Android/i.test(navigator.userAgent)) return;
    var el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement) return;
    var p = req.call(el, { navigationUI: 'hide' });
    var lock = function () { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () { }); } catch (e) { } };
    if (p && p.then) p.then(lock).catch(function () { }); else lock();
  } catch (e) { }
}

function hasSave(ctx) { return !!(ctx.save.get('ride.pos', null) || ctx.save.get('ride.missions', null)); }

function createTitle() {
  var S = {};
  return {
    name: 'title',
    enter: function (ctx, scope, args) {
      ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = true;
      S.sfx = sfxmod.createSfx(); S.music = music.createMusic(S.sfx); S.last = 0; S.t = 0; S.v = null; S.vid = null; S.el = null;
      var layer = document.createElement('div');
      layer.style.cssText = 'position:fixed;inset:0;z-index:44;pointer-events:none;font-family:system-ui,sans-serif;color:#fff';
      document.body.appendChild(layer); scope.add(function () { layer.remove(); });
      S.layer = layer;
      S.fx = electric.createElectric(function (p) { if (S.sfx.running()) S.sfx.zap(p); }); scope.add(function () { if (S.fx) S.fx.dispose(); });
      S.img = new Image(); S.img.src = LOGO.ADA;
      /* skip: jumps straight to the menu from anywhere in the opening */
      var skip = document.createElement('button'); skip.textContent = '[ SKIP ▸▸ ]'; skip.setAttribute('data-ok', '1');
      skip.style.cssText = 'position:fixed;z-index:46;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));padding:9px 14px;border-radius:4px;border:1px solid rgba(140,255,156,.5);background:rgba(0,0,0,.6);color:#bdf5c6;font:13px system-ui,sans-serif;letter-spacing:.12em;cursor:pointer;display:none;touch-action:manipulation';
      skip.addEventListener('click', function (e) { e.stopPropagation(); toMenu(); });
      document.body.appendChild(skip); scope.add(function () { skip.remove(); }); S.skip = skip;

      function toMenu() {
        if (S.phase === 'menu') return;
        S.phase = 'menu'; S.t = 0; skip.style.display = 'none';
        if (S.fx) { S.fx.dispose(); S.fx = null; }
        if (S.vid) { S.vid.dispose(); S.vid = null; }
        if (S.music.playing() && S.music.track() === 'intro') S.music.toLoop(); else if (S.sfx.running()) S.music.setTrack('menu');
        buildMenu();
      }
      S.toMenu = toMenu;

      /* returning from the game (args.menu) goes straight to the menu */
      if (args && args.menu) { S.phase = 'start'; toMenu(); return; }
      /* the opening card: dark, minimal, the studio credit and a small blinking prompt; the tap starts sound and the show */
      S.phase = 'card';
      var card = document.createElement('div'); card.setAttribute('data-ok', '1');
      card.style.cssText = 'position:fixed;inset:0;z-index:45;background:#030604;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none';
      /* a terminal: "> ADA STUDIOS" types itself out, then "PRESENTS", a block cursor blinks, and a small prompt asks for the tap */
      card.innerHTML = '<style>@keyframes tblink{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes tsoft{0%,100%{opacity:.25}50%{opacity:.9}}</style>' +
        '<div style="text-align:left;font-size:clamp(20px,5.2vw,34px);line-height:1.6;color:#d8f5d0;text-shadow:0 0 8px rgba(120,255,140,.35);white-space:pre"><span id="tl1"></span><span id="tc1" style="display:inline-block;width:.6em;height:1em;vertical-align:-.12em;background:#8cff9c;animation:tblink 1s steps(1) infinite"></span>\n<span id="tl2" style="color:#7fa892"></span></div>' +
        '<div style="position:absolute;bottom:max(34px,calc(env(safe-area-inset-bottom) + 22px));font-size:13px;letter-spacing:.2em;color:#9fd8aa;animation:tsoft 1.6s ease-in-out 1.8s infinite both">[ TAP TO CONTINUE ]</div>';
      (function () {
        var l1 = '> ADA STUDIOS', l2 = '  PRESENTS', k = 0, a = card.querySelector('#tl1'), b2 = card.querySelector('#tl2'), cur = card.querySelector('#tc1');
        var tick = setInterval(function () {
          k++; if (k <= l1.length) a.textContent = l1.slice(0, k); else if (k > l1.length + 3 && k <= l1.length + 3 + l2.length) { b2.textContent = l2.slice(0, k - l1.length - 3); b2.after(cur); }
          else if (k > l1.length + 3 + l2.length) clearInterval(tick);
        }, 85);
        scope.add(function () { clearInterval(tick); });
      })();
      document.body.appendChild(card); scope.add(function () { card.remove(); });
      function begin() {
        if (S.phase !== 'card') return;
        S.sfx.wake(); card.remove();
        S.phase = 'logo'; S.t = 0; skip.style.display = 'block';
        S.fx.show({ img: S.img, dur: 3.6 });
      }
      card.addEventListener('click', begin);
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
        el.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:max(62px,calc(env(safe-area-inset-top) + 54px)) 16px max(26px,env(safe-area-inset-bottom));opacity:0;transition:opacity .6s';
        var cont = hasSave(ctx);
        el.innerHTML =
          '<div style="text-align:center;transform:rotate(-4deg)"><div style="font:900 clamp(52px,min(15vw,20vh),150px)/.9 \'Arial Black\',Impact,system-ui,sans-serif;color:#ffd21f;-webkit-text-stroke:2px #000;text-shadow:5px 5px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000;letter-spacing:.04em">TOOFAN</div>' +
          '<div style="margin-top:6px;font:900 clamp(12px,3vw,18px) system-ui,sans-serif;letter-spacing:.35em;color:#fff;text-shadow:2px 2px 0 #000">AAYA AAYA AAYA RE</div></div>' +
          '<div style="pointer-events:auto">' +
          (cont ? '<button id="tCont" data-ok="1" style="' + BTN + ';background:#ffd21f;color:#000">CONTINUE</button>' : '') +
          '<button id="tNew" data-ok="1" style="' + BTN + ';background:' + (cont ? '#fff' : '#ffd21f') + ';color:#000">NEW GAME</button></div>';
        document.body.appendChild(el); scope.add(function () { el.remove(); });
        setTimeout(function () { el.style.opacity = 1; }, 1600);
        var nb = el.querySelector('#tNew'), cb = el.querySelector('#tCont');
        nb.addEventListener('click', function () { S.sfx.wake(); bigScreen(); ctx.save.set('ride.missions', null); ctx.save.set('ride.pos', null); ctx.ride = null; ctx.go('ride'); });
        if (cb) cb.addEventListener('click', function () { S.sfx.wake(); bigScreen(); ctx.go('ride'); });
      }
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var renderer = ctx.view.renderer;
      var live = S.sfx.running();
      if (S.phase === 'card') { renderer.setClearColor(0x050506, 1); renderer.clear(); return; }
      if (S.phase === 'logo') {
        if (!S.fx.draw(dt)) {
          S.phase = 'video'; S.t = 0; S.fx.dispose(); S.fx = null;
          S.vid = intro.createIntro(renderer); S.vStart = now;
          if (live && S.music.play('intro')) S.vStart = now + 80;                               /* the tap has unlocked sound: the theme starts with the video */
        }
        return;
      }
      if (S.phase === 'video') {
        var beat = (now - S.vStart) / 1000 / (60 / S.music.BPM);                  /* the video's own clock; the music joins it */
        if (live && !S.music.playing() && beat < S.vid.BEATS - 2) S.music.play('intro', beat);
        if (ctx.debug.introBeat !== undefined) beat = ctx.debug.introBeat;            /* tools can hold a frame */
        if (beat >= S.vid.BEATS) { S.toMenu(); return; }
        S.vid.render(Math.max(0, beat), S.t);
        return;
      }
      /* the menu: Bijli rides along the road; the camera starts low at her front right and cranes up and back */
      if (!S.v) return;
      if (live && S.music.enabled && (!S.music.playing() || S.music.track() !== 'menu')) S.music.setTrack('menu'); else if (!S.sfx.on && S.music.playing()) S.music.stop(0.3);
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
