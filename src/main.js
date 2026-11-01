/* entry: wires the layers together. This is the only place that knows about all of them. */
'use strict';

var CONFIG = require('./data/config');
var loopMod = require('./core/loop');
var busMod = require('./core/events');
var inputMod = require('./core/input');
var saveMod = require('./core/save');
var modesMod = require('./core/modes');
var worldMod = require('./sim/world');
var viewMod = require('./view/app');
var hudMod = require('./view/hud');
var controls = require('./view/controls');
var sfxMod = require('./view/sfx');
var freeroam = require('./modes/freeroam');
var studio = require('./modes/studio');
var ride = require('./modes/ride');
var title = require('./modes/title');
var wake = require('./modes/wake');
var musicMod = require('./view/music');
var pixelfont = require('./view/pixelfont');

function boot() {
  pixelfont.install(); document.body.classList.add('px');               /* all interface text in the pixel code font */
  var storage = null;
  try { storage = window.localStorage; storage.setItem('toofan.probe', '1'); storage.removeItem('toofan.probe'); } catch (e) { storage = null; }
  var save = saveMod.createSave(storage);

  var params = new URLSearchParams(window.location.search);
  var seed = parseInt(params.get('seed') || save.get('seed', 20261028), 10) >>> 0;
  save.set('seed', seed);

  var bus = busMod.createBus();
  var input = inputMod.createInput();
  var world = worldMod.createWorld(seed, bus);
  var tierName = params.get('tier');
  if (!CONFIG.TIERS[tierName]) tierName = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) && Math.min(screen.width, screen.height) < 900 ? 'low' : 'high';   /* phones start light */
  var view = viewMod.createView(document.getElementById('game'), tierName);
  var hud = hudMod.createHud(document.getElementById('hud'));
  controls.attachKeyboard(input, window);
  var touch = controls.attachTouch(input, document.getElementById('touch'));
  /* the player sees no debug text: the readout panel shows only in the developer view (?dev=1); a speaker icon switches sound */
  if (!params.get('dev')) document.getElementById('hud').style.display = 'none';
  (function () {
    var sfx = sfxMod.createSfx(), b = document.createElement('button');
    var ON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fff"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>';
    var OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fff"/><path d="M16 9l5 6M21 9l-5 6"/></svg>';
    b.setAttribute('aria-label', 'Sound'); b.setAttribute('data-ok', '1');
    var PILL = 'position:fixed;z-index:20;top:max(12px,env(safe-area-inset-top));height:34px;border-radius:4px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.5);display:flex;align-items:center;gap:6px;padding:0 9px 0 7px;color:#fff;font-size:11px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
    function lab(icon, t) { return icon.replace('width="22" height="22"', 'width="18" height="18"').replace('width="20" height="20"', 'width="16" height="16"') + '<span>' + t + '</span>'; }
    b.style.cssText = PILL + ';left:max(12px,env(safe-area-inset-left))';
    b.innerHTML = lab(sfx.on ? ON : OFF, 'SFX');
    b.addEventListener('click', function () { var on = sfx.toggle(); b.innerHTML = lab(on ? ON : OFF, 'SFX'); });
    document.body.appendChild(b);
    /* the music switch beside it: music off keeps the effects */
    var music = musicMod.createMusic(sfx), mb = document.createElement('button');
    var NOTE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5" fill="#fff"/><circle cx="17.5" cy="16" r="2.5" fill="#fff"/></svg>';
    var NOTE_OFF = NOTE.replace('</svg>', '<path d="M3 3l18 18" stroke="#ff5a5a"/></svg>');
    mb.setAttribute('aria-label', 'Music'); mb.setAttribute('data-ok', '1');
    mb.style.cssText = PILL + ';left:calc(max(12px,env(safe-area-inset-left)) + 76px)';
    mb.innerHTML = lab(music.enabled ? NOTE : NOTE_OFF, 'MUSIC');
    mb.addEventListener('click', function () { var on = music.toggle(); mb.innerHTML = lab(on ? NOTE : NOTE_OFF, 'MUSIC'); window.dispatchEvent(new Event('toofan:music')); });
    document.body.appendChild(mb);
  })();

  var ctx = { config: CONFIG, bus: bus, input: input, world: world, view: view, hud: hud, touch: touch, save: save, now: function () { return performance.now(); },
    hudRoot: document.getElementById('hud'), touchRoot: document.getElementById('touch'), studioRoot: document.getElementById('studio'), debug: {} };
  ctx.debug.music = musicMod.createMusic(sfxMod.createSfx());
  var modes = modesMod.createModes(ctx);
  modes.register(freeroam.createFreeroam());
  modes.register(studio.createStudio());
  modes.register(ride.createRide());
  modes.register(title.createTitle());
  modes.register(wake.createWake());
  var tabs = { studio: document.getElementById('tabStudio'), freeroam: document.getElementById('tabStreet'), ride: document.getElementById('tabRide') };
  function go(name, args) {
    if (name === 'studio' || (name === 'freeroam' && !(args && args.mission))) musicMod.createMusic(sfxMod.createSfx()).stop(0.5);   /* the developer views are silent */
    modes.switchTo(name, args);
    Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
    try { history.replaceState(null, '', name === 'title' ? location.pathname + location.search : location.search + (name === 'freeroam' ? '#street' : name === 'ride' ? '#ride' : name === 'wake' ? '#wake' : '#studio')); } catch (e) { /* hash only */ }
  }
  tabs.studio.addEventListener('click', function () { go('studio'); });
  tabs.freeroam.addEventListener('click', function () { go('freeroam'); });
  tabs.ride.addEventListener('click', function () { go('ride'); });
  /* one game: it opens on the ride; the studio and the bare street are developer views (?dev=1 shows their tabs, or #studio / #street) */
  ctx.go = go;
  if (!params.get('dev')) document.getElementById('tabs').style.display = 'none';
  var H = window.location.hash;
  go(H === '#street' ? 'freeroam' : H === '#studio' ? 'studio' : H === '#ride' ? 'ride' : H === '#wake' ? 'wake' : 'title', H === '#menu' ? { menu: true } : undefined);

  var loop = loopMod.createLoop({
    hz: CONFIG.TICK_HZ, maxSteps: CONFIG.MAX_STEPS_PER_FRAME,
    step: function (t) { modes.step(t); },
    render: function (a) { modes.render(a); },
    schedule: function (f) { return requestAnimationFrame(f); },
    cancel: function (h) { cancelAnimationFrame(h); },
    now: ctx.now
  });
  loop.start();
  document.addEventListener('visibilitychange', function () { input.reset(); });

  window.__game = { ctx: ctx, loop: loop, modes: modes, go: go, hashWorld: function () { return worldMod.hash(world); } };
  document.documentElement.setAttribute('data-ready', '1');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
