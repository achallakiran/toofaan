/* modes: the title sequence. It opens straight on the ADA badge, which crackles in and shorts out,
   "ADA STUDIOS PRESENTS" does the same, then the 30-second opening video plays in time with the theme (skippable), and the main
   menu: a crane shot rising from low at Toofan's front right as he rides Bijli, the title, and New Game / Continue.
   Browsers (phones above all) keep a page silent until it is touched, so the opening never waits for a tap: where sound is allowed it
   plays from the start; elsewhere it runs silent with a small sound chip, and the first touch anywhere brings the music in on the beat.
   The video keeps its own clock; the music follows it. On Android, New Game / Continue also go full screen and turn the phone sideways. */
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
      scope.add(function () { S.music.stop(0.6); });
      var layer = document.createElement('div');
      layer.style.cssText = 'position:fixed;inset:0;z-index:44;pointer-events:none;font-family:system-ui,sans-serif;color:#fff';
      document.body.appendChild(layer); scope.add(function () { layer.remove(); });
      S.layer = layer;
      S.fx = electric.createElectric(function (p) { if (S.sfx.running()) S.sfx.zap(p); }); scope.add(function () { if (S.fx) S.fx.dispose(); });
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
        if (S.music.playing()) S.music.toLoop(); else if (S.sfx.running()) S.music.play('loop');
        buildMenu();
      }
      S.toMenu = toMenu;

      /* the sound chip: shown while the browser still holds the sound back; any touch or key anywhere unlocks it (the shared sfx listens) */
      var chip = document.createElement('button'); chip.setAttribute('data-ok', '1'); chip.setAttribute('aria-label', 'Turn sound on');
      chip.style.cssText = 'position:fixed;z-index:47;left:max(14px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));display:none;align-items:center;gap:7px;padding:8px 13px;border-radius:20px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.55);color:#fff;font:800 12px system-ui,sans-serif;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
      chip.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fff"/><path d="M16 9l5 6M21 9l-5 6"/></svg>TAP FOR SOUND';
      chip.addEventListener('click', function (e) { e.stopPropagation(); S.sfx.wake(); });
      document.body.appendChild(chip); scope.add(function () { chip.remove(); }); S.chip = chip;

      /* returning from the game (args.menu) goes straight to the menu; otherwise the opening starts at once */
      if (args && args.menu) { S.phase = 'start'; toMenu(); return; }
      S.sfx.wake();                                                     /* sound from the first frame wherever the browser allows it */
      S.phase = 'logo'; S.t = 0; skip.style.display = 'block';
      S.fx.show({ img: S.img, dur: 3.6 });

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
        nb.addEventListener('click', function () { S.sfx.wake(); bigScreen(); ctx.save.set('ride.missions', null); ctx.save.set('ride.pos', null); ctx.ride = null; ctx.go('ride'); });
        if (cb) cb.addEventListener('click', function () { S.sfx.wake(); bigScreen(); ctx.go('ride'); });
      }
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var renderer = ctx.view.renderer;
      var live = S.sfx.running(); S.chip.style.display = (!live && S.sfx.on && S.phase !== 'menu') ? 'flex' : 'none';
      if (S.phase === 'logo' || S.phase === 'presents') {
        if (!S.fx.draw(dt)) {
          if (S.phase === 'logo') { S.phase = 'presents'; S.fx.show({ lines: ['ADA STUDIOS', 'PRESENTS'], dur: 2.8 }); }
          else {
            S.phase = 'video'; S.t = 0; S.fx.dispose(); S.fx = null;
            S.vid = intro.createIntro(renderer); S.vStart = now;
          }
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
      if (live && !S.music.playing()) S.music.play('loop'); else if (!S.sfx.on && S.music.playing()) S.music.stop(0.3);
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
