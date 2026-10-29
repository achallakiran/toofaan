/* view: the on-screen readout for tick rate, memory budget and rage. */
'use strict';

var CONFIG = require('../data/config');

function createHud(root) {
  root.innerHTML =
    '<div class="panel" id="hudPanel">' +
    '<div class="title">TOOFAN <span>street fight - ' + CONFIG.BUILD + '</span></div>' +
    '<div class="row"><b>Mode</b><i id="hMode">-</i></div>' +
    '<div class="row"><b>Tick</b><i id="hTick">0</i></div>' +
    '<div class="row"><b>Chunks</b><i id="hChunks">0</i></div>' +
    '<div class="row"><b>Triangles</b><i id="hTri">0</i></div>' +
    '<div class="row"><b>Draw calls</b><i id="hCalls">0</i></div>' +
    '<div class="row"><b>Frame</b><i id="hMs">-</i></div>' +
    '<div class="row"><b>Geometry</b><i id="hMem">0</i></div>' +
    '<div class="row"><b>Loads / unloads</b><i id="hLoads">0 / 0</i></div>' +
    '<div class="row"><b>Storage</b><i id="hSave">-</i></div>' +
    '<div class="bar" title="Rage"><div id="hRage"></div></div>' +
    '</div>';
  var el = {};
  ['hMode', 'hTick', 'hChunks', 'hTri', 'hCalls', 'hMs', 'hMem', 'hLoads', 'hSave', 'hRage'].forEach(function (id) { el[id] = root.querySelector('#' + id); });
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }
  return {
    update: function (s) {
      el.hMode.textContent = s.mode; el.hTick.textContent = s.tick;
      el.hChunks.textContent = s.chunks + ' / ' + s.maxChunks;
      el.hTri.textContent = s.triangles.toLocaleString();
      el.hCalls.textContent = s.calls;
      if (s.ms) el.hMs.textContent = s.ms.toFixed(1) + ' ms (' + Math.round(1000 / s.ms) + ' fps) ' + s.tier;
      el.hMem.textContent = kb(s.bytes);
      el.hLoads.textContent = s.loads + ' / ' + s.unloads;
      el.hSave.textContent = s.saveOk ? 'saved on device' : 'in memory only';
      el.hRage.style.width = s.rage + '%';
    }
  };
}

module.exports = { createHud: createHud };
