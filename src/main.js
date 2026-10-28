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
var freeroam = require('./modes/freeroam');
var studio = require('./modes/studio');

function boot() {
  var storage = null;
  try { storage = window.localStorage; storage.setItem('toofan.probe', '1'); storage.removeItem('toofan.probe'); } catch (e) { storage = null; }
  var save = saveMod.createSave(storage);

  var params = new URLSearchParams(window.location.search);
  var seed = parseInt(params.get('seed') || save.get('seed', 20261028), 10) >>> 0;
  save.set('seed', seed);

  var bus = busMod.createBus();
  var input = inputMod.createInput();
  var world = worldMod.createWorld(seed, bus);
  var view = viewMod.createView(document.getElementById('game'));
  var hud = hudMod.createHud(document.getElementById('hud'));
  controls.attachKeyboard(input, window);
  var touch = controls.attachTouch(input, document.getElementById('touch'));

  var ctx = { config: CONFIG, bus: bus, input: input, world: world, view: view, hud: hud, touch: touch, save: save, now: function () { return performance.now(); },
    hudRoot: document.getElementById('hud'), touchRoot: document.getElementById('touch'), studioRoot: document.getElementById('studio'), debug: {} };
  var modes = modesMod.createModes(ctx);
  modes.register(freeroam.createFreeroam());
  modes.register(studio.createStudio());
  var tabs = { studio: document.getElementById('tabStudio'), freeroam: document.getElementById('tabStreet') };
  function go(name) {
    modes.switchTo(name);
    Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
    try { history.replaceState(null, '', name === 'freeroam' ? '#street' : '#studio'); } catch (e) { /* hash only */ }
  }
  tabs.studio.addEventListener('click', function () { go('studio'); });
  tabs.freeroam.addEventListener('click', function () { go('freeroam'); });
  go(window.location.hash === '#street' ? 'freeroam' : 'studio');

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
