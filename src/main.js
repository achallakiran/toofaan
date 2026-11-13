/* entry: wires the layers together. This is the only place that knows about all of them. */
'use strict';

var CONFIG = require('./data/config');
var loopMod = require('./core/loop');
var busMod = require('./core/events');
var inputMod = require('./core/input');
var saveMod = require('./core/save');
var modesMod = require('./core/modes');
var viewMod = require('./view/app');
var hudMod = require('./view/hud');
var controls = require('./view/controls');
var sfxMod = require('./view/sfx');
var fight = require('./modes/fight');
var fightworld = require('./sim/fightworld');
var studio = require('./modes/studio');
var ride = require('./modes/ride');
var title = require('./modes/title');
var wake = require('./modes/wake');
var hideoutMode = require('./modes/hideout');
var stealthMode = require('./modes/stealth');
var musicMod = require('./view/music');
var pauseMenuMod = require('./view/pausemenu');
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
  var world = { seed: seed };                                            /* the game's seed: the ride's city and every fight grow from it */
  var tierName = params.get('tier') || save.get('tier', null);              /* (the quality chosen in the menu, kept on this device) */
  if (!CONFIG.TIERS[tierName]) tierName = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) && Math.min(screen.width, screen.height) < 900 ? 'low' : 'high';   /* phones start light */
  var view = viewMod.createView(document.getElementById('game'), tierName);
  var hud = hudMod.createHud(document.getElementById('hud'));
  controls.attachKeyboard(input, window);
  var touch = controls.attachTouch(input, document.getElementById('touch'));
  /* the player sees no debug text: the readout panel shows only in the developer view (?dev=1); a speaker icon switches sound */
  if (!params.get('dev')) document.getElementById('hud').style.display = 'none';
  var sfx = sfxMod.createSfx(), music = musicMod.createMusic(sfx);
  /* the game's clock, which the pause menu stops: every mode and the fixed-step loop read time from it, so a pause freezes the play,
     the cameras and the cutscenes alike, and picks up exactly where it stopped */
  var clockOff = 0, pausedAt = null;
  function now() { return (pausedAt !== null ? pausedAt : performance.now()) - clockOff; }
  var ctx = { config: CONFIG, bus: bus, input: input, world: world, view: view, hud: hud, touch: touch, save: save, now: now,
    hudRoot: document.getElementById('hud'), touchRoot: document.getElementById('touch'), studioRoot: document.getElementById('studio'), debug: { require: require } };   /* (debug.require: tools load view modules for model sheets) */
  ctx.debug.music = music;
  var modes = modesMod.createModes(ctx);
  modes.register(fight.createFight());
  modes.register(studio.createStudio());
  modes.register(ride.createRide());
  modes.register(title.createTitle());
  modes.register(wake.createWake());
  modes.register(hideoutMode.createHideout());
  modes.register(stealthMode.createStealth());
  /* the page address names only what a player can come back to: the ride (also during a fight: a reload goes back to the ride, the place
     still open), the hideout, the nightmare. The developer views (#studio, #fight) open only with ?dev=1. */
  var DEV = !!params.get('dev');
  var tabs = { studio: document.getElementById('tabStudio'), fight: document.getElementById('tabStreet'), ride: document.getElementById('tabRide') };
  var HASH = { ride: '#ride', fight: DEV ? '#fight' : '#ride', wake: '#wake', hideout: '#hideout', studio: '#studio', stealth: '#stealth' };
  var lastGo = { name: null, args: undefined };
  function go(name, args) {
    lastGo = { name: name, args: args };
    if (name === 'studio') musicMod.createMusic(sfxMod.createSfx()).stop(0.5);   /* the developer view is silent */
    modes.switchTo(name, args);
    Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
    try { history.replaceState(null, '', name === 'title' ? location.pathname + location.search : location.search + (HASH[name] || '')); } catch (e) { /* hash only */ }
  }
  tabs.studio.addEventListener('click', function () { go('studio'); });
  tabs.fight.addEventListener('click', function () { go('fight', { type: 'market', level: 2 }); });
  tabs.ride.addEventListener('click', function () { go('ride'); });
  ctx.go = go;
  if (!DEV) document.getElementById('tabs').style.display = 'none';
  /* #fight=type,level (developer): a practice fight at that kind of place */
  var H = window.location.hash, HM = /^#fight(?:=(\w+)(?:,(\d+))?)?$/.exec(H);
  if (HM && DEV) go('fight', { type: HM[1] || 'market', level: HM[2] !== undefined ? +HM[2] : 2 });
  else if (H === '#studio' && DEV) go('studio');
  else if (H === '#stealth') go('stealth');
  else go(H === '#ride' ? 'ride' : H === '#wake' ? 'wake' : H === '#hideout' ? 'hideout' : 'title', H === '#menu' ? { menu: true } : undefined);

  var loop = loopMod.createLoop({
    hz: CONFIG.TICK_HZ, maxSteps: CONFIG.MAX_STEPS_PER_FRAME,
    step: function (t) { modes.step(t); },
    render: function (a) { modes.render(a); },
    schedule: function (f) { return requestAnimationFrame(function () { f(now()); }); },   /* (the game's clock, not the frame's: a pause stops the ticks) */
    cancel: function (h) { cancelAnimationFrame(h); },
    now: ctx.now
  });
  loop.start();
  document.addEventListener('visibilitychange', function () { input.reset(); });

  /* ---- the pause button and its menu (view/pausemenu): pause, restart, back to the title, start over, and the settings ---- */
  function pauseGame() { if (pausedAt !== null) return; pausedAt = performance.now(); sfx.hold(true); input.reset(); }
  function resumeGame() { if (pausedAt === null) return; clockOff += performance.now() - pausedAt; pausedAt = null; sfx.hold(false); input.reset(); }
  var tierNow = view.tierId, tierPick = tierNow;
  if (DEV) view.setLook(save.get('look', { style: 'current', px: 3, vignette: false }));   /* (the look under test; players see the game as it is) */
  var menu = pauseMenuMod.createPauseMenu({
    dev: DEV,
    settings: function () { return { sfx: sfx.on, music: music.enabled, tier: tierPick, tiers: Object.keys(CONFIG.TIERS), tierPending: tierPick !== tierNow, look: view.getLook(), styles: view.LOOK_STYLES }; },
    set: function (k, v) {
      if (k === 'sfx') { if (sfx.on !== v) sfx.toggle(); }
      else if (k === 'music') { if (music.enabled !== v) { music.toggle(); window.dispatchEvent(new Event('toofan:music')); } }
      else if (k === 'tier') { tierPick = v; save.set('tier', v); }
      else if (k === 'look') { var L = view.getLook(); for (var q in v) L[q] = v[q]; view.setLook(L); save.set('look', L); }
    },
    actions: function () {
      var m = modes.currentName(), out = [], fightLike = m === 'fight' || m === 'stealth';
      if (fightLike) out.push({ id: 'restart', label: 'RESTART', ask: m === 'fight' ? 'RESTART THIS FIGHT?' : 'START THE STAGE AGAIN?' });
      out.push({ id: 'title', label: 'MAIN MENU', ask: fightLike ? 'LEAVE THIS ' + (m === 'fight' ? 'FIGHT' : 'STAGE') + '?' : null });
      out.push({ id: 'new', label: 'NEW GAME', ask: 'START OVER? YOUR PROGRESS WILL BE LOST' });
      return out;
    },
    act: function (id) {
      resumeGame();
      if (tierPick !== tierNow) { location.reload(); return; }                /* (a new quality needs a fresh start; the place is kept as on any reload) */
      if (id === 'restart') go(lastGo.name, lastGo.args);
      else if (id === 'title') { if (modes.currentName() === 'ride') window.dispatchEvent(new Event('pagehide')); ctx.ride = null; go('title', { menu: true }); }   /* (leaving the ride parks Bijli, as closing the page does) */
      else if (id === 'new') { save.set('ride.missions', null); save.set('ride.pos', null); ctx.ride = null; go('wake', { next: 'hideout' }); }
    },
    open: pauseGame,
    close: function () { resumeGame(); if (tierPick !== tierNow) location.reload(); }
  });
  function menuFor(name) { menu.setMode(name === 'title' ? 'title' : name === 'studio' ? 'none' : 'play'); }
  bus.on('mode:changed', function (d) { menuFor(d.name); });
  menuFor(modes.currentName());
  /* the phone switching apps or locking pauses the game, menu open */
  document.addEventListener('visibilitychange', function () { if (document.hidden && !menu.isOpen() && modes.currentName() !== 'title' && modes.currentName() !== 'studio') menu.open(); });

  window.__game = { ctx: ctx, loop: loop, modes: modes, go: go, menu: menu, pause: pauseGame, resume: resumeGame, hashFight: function () { return ctx.fight ? fightworld.hash(ctx.fight) : 0; } };
  document.documentElement.setAttribute('data-ready', '1');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
