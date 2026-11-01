/* view: the gang chart on the hideout's computer wall, opened as Toofan's files. One card per gang: the boss and what his gang is
   about, the two places they hold (cleared or not), the kind of men he sends, and where Toofan stands with him. A last card for Taka,
   the man behind them all: only "?" until the end. A button opens the city map to choose where to ride next. */
'use strict';

var GANGS = require('../data/gangs');
var LOC = require('../data/locations');

var CREW = { thug: 'THUGS', stick: 'LATHI MEN', chain: 'CHAIN MEN', heavy: 'HEAVIES', kicker: 'KICKERS', blocker: 'BLOCKERS', thrower: 'BOTTLE THROWERS' };
var BTN = 'padding:9px 14px;border-radius:4px;border:1px solid rgba(140,255,156,.55);background:rgba(0,0,0,.6);color:#d8ffe0;font-size:12px;letter-spacing:.14em;cursor:pointer;touch-action:manipulation';

function createGangFiles() {
  var el = null;
  function close() { if (el) { el.remove(); el = null; } }
  function card(k, r) {
    var G = GANGS.GANGS[k], done = 0, places = G.types.map(function (t) { var st = r.missions[t], c = st === 'cleared'; if (c) done++; return '<div style="color:' + (c ? '#8a9199' : '#fff') + '">' + (c ? '✓ ' : '! ') + LOC.LOCATIONS[t].name.toUpperCase() + '</div>'; }).join('');
    var crew = Object.keys(G.mix).sort(function (a, b) { return G.mix[b] - G.mix[a]; }).map(function (q) { return CREW[q] || q.toUpperCase(); }).join(', ');
    var status = done === 2 ? '<span style="color:#ffd21f">BOTH PLACES CLEARED. HE KNOWS TOOFAN IS COMING.</span>' : done === 1 ? 'ONE PLACE DOWN, ONE TO GO' : 'AT LARGE';
    return '<div style="position:relative;padding:10px 12px 10px 16px;background:#e9e1cf;color:#1d1b18;border-radius:2px;box-shadow:3px 4px 0 rgba(0,0,0,.45);transform:rotate(' + ((k.length % 3) - 1) * 0.8 + 'deg)">' +
      '<div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:' + G.color + '"></div>' +
      '<div style="position:absolute;right:10px;top:-6px;width:12px;height:12px;border-radius:50%;background:#c0392b;box-shadow:0 2px 0 rgba(0,0,0,.4)"></div>' +
      '<div style="font-size:15px;letter-spacing:.1em">' + G.name.toUpperCase() + '</div>' +
      '<div style="font-size:11px;color:#5a5348;margin:2px 0 6px">' + G.theme.toUpperCase() + '</div>' +
      '<div style="font-size:10px;color:#5a5348">TURF</div><div style="font-size:11px;background:#1d1b18;color:#fff;padding:3px 6px;margin:2px 0 6px">' + places + '</div>' +
      '<div style="font-size:10px;color:#5a5348">HIS MEN</div><div style="font-size:11px;margin-bottom:6px">' + crew + '</div>' +
      '<div style="font-size:10px;color:#5a5348">STATUS</div><div style="font-size:11px">' + status + '</div></div>';
  }
  function taka() {
    return '<div style="position:relative;padding:10px 12px;background:#0b0b0d;color:#fff;border:1px solid #b0102a;border-radius:2px;box-shadow:3px 4px 0 rgba(0,0,0,.45);text-align:center">' +
      '<div style="font-size:54px;line-height:1.1;color:#ff2a2a;text-shadow:0 0 12px rgba(255,40,40,.6)">?</div>' +
      '<div style="font-size:13px;letter-spacing:.14em">THE MAN BEHIND THEM</div><div style="font-size:11px;color:#ff8a8a;margin-top:6px">NAME UNKNOWN. FACE UNKNOWN.</div>' +
      '<div style="font-size:10px;color:#9aa;margin-top:6px">EVERY GANG ANSWERS TO HIM</div></div>';
  }
  return {
    isOpen: function () { return !!el; },
    open: function (r, onMap) {
      if (el) return;
      el = document.createElement('div'); el.setAttribute('data-ok', '1');
      el.style.cssText = 'position:fixed;inset:0;z-index:40;overflow:auto;background:radial-gradient(ellipse at 50% 30%,#3b2a1a,#140d07 80%);color:#fff;padding:max(58px,calc(env(safe-area-inset-top) + 50px)) max(14px,env(safe-area-inset-right)) 24px max(14px,env(safe-area-inset-left));touch-action:pan-y';
      var cleared = 0; Object.keys(r.missions).forEach(function (k) { if (r.missions[k] === 'cleared') cleared++; });
      el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;color:#8cff9c;font-size:13px;letter-spacing:.16em"><span style="flex:1">&gt; GANG FILES  ·  CLEARED ' + cleared + ' / 10</span>' +
        '<button data-m="1" style="' + BTN + '">[ CITY MAP ]</button><button data-x="1" style="' + BTN + '">[ CLOSE ]</button></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:16px">' + GANGS.ORDER.map(function (k) { return card(k, r); }).join('') + taka() + '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return; e.stopPropagation();
        if (b.getAttribute('data-m')) { close(); if (onMap) onMap(); } else close();
      });
    },
    close: close,
    dispose: close
  };
}

module.exports = { createGangFiles: createGangFiles };
