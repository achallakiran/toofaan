/* view: the full city map, opened by tapping the mini-map. North up: the road grid, each gang's territory tinted in its colour, every
   trouble spot (open, cleared, left for later, the current signal), Toofan's position, and a legend of the gangs with what is cleared.
   Tapping an open place makes it the next signal. The ride waits while the map is open. */
'use strict';

var GANGS = require('../data/gangs');
var R = require('../data/ride');

function createFullMap() {
  var el = null, cv = null, ride = null, onPick = null, raf = 0, hits = [];
  function close() { if (!el) return; cancelAnimationFrame(raf); el.remove(); el = null; ride = null; }
  function draw(t) {
    if (!el || !ride) return;
    var g = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var r = ride, E = r.map.ext, side = Math.min(W, H) - 24, sc = side / (E * 2), ox = W / 2, oz = H / 2;
    function X(x) { return ox + x * sc; } function Z(z) { return oz + z * sc; }
    /* territory: each block takes the colour of the gang whose place is nearest to it */
    r.map.blocks.forEach(function (b) {
      var cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, best = null, bd = 1e9;
      r.map.targets.forEach(function (T) { var d = Math.hypot(T.x - cx, T.z - cz); if (d < bd) { bd = d; best = T; } });
      var gk = best && GANGS.gangOf(best.key), col = gk ? GANGS.GANGS[gk].color : '#555';
      g.fillStyle = col; g.globalAlpha = 0.28; g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.strokeRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc);
    });
    g.strokeStyle = 'rgba(230,236,240,.75)'; g.lineWidth = Math.max(3, R.HALF * 2 * sc * 0.6);
    r.map.lines.forEach(function (l) { g.beginPath(); g.moveTo(X(-E), Z(l)); g.lineTo(X(E), Z(l)); g.stroke(); g.beginPath(); g.moveTo(X(l), Z(-E)); g.lineTo(X(l), Z(E)); g.stroke(); });
    /* the places */
    hits = [];
    g.textAlign = 'center'; g.textBaseline = 'top'; g.font = "11px 'ToofanPx',monospace";
    r.map.targets.forEach(function (T) {
      var st = r.missions[T.key], gk = GANGS.gangOf(T.key), col = gk ? GANGS.GANGS[gk].color : '#fff', x = X(T.x), z = Z(T.z), cur = r.target === T, s = cur ? 11 : 8;
      g.fillStyle = st === 'cleared' ? '#2a2f35' : col; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.fillRect(x - s, z - s, s * 2, s * 2); g.strokeRect(x - s, z - s, s * 2, s * 2);
      g.fillStyle = '#fff'; g.font = "13px 'ToofanPx',monospace"; g.textBaseline = 'middle';
      g.fillText(st === 'cleared' ? '✓' : (T.key === r.skipped ? '?' : '!'), x, z + 1);
      if (cur) { g.strokeStyle = Math.sin(t / 120) > 0 ? '#ff3b30' : '#ffd21f'; g.lineWidth = 3; g.strokeRect(x - s - 5, z - s - 5, (s + 5) * 2, (s + 5) * 2); }
      g.font = "10px 'ToofanPx',monospace"; g.textBaseline = 'top'; g.fillStyle = st === 'cleared' ? '#8a9199' : '#fff';
      g.fillText(T.name.toUpperCase(), x, z + s + 4);
      if (st === 'open') hits.push({ key: T.key, x: x, z: z, r: s + 14 });
    });
    /* home, the cycle-repair shop: tap it to ride home */
    var Hm = r.map.home, hx = X(Hm.x), hz = Z(Hm.z), hcur = r.target === Hm;
    g.fillStyle = '#4aa8ff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath();
    g.moveTo(hx, hz - 12); g.lineTo(hx + 11, hz - 1); g.lineTo(hx + 7, hz - 1); g.lineTo(hx + 7, hz + 9); g.lineTo(hx - 7, hz + 9); g.lineTo(hx - 7, hz - 1); g.lineTo(hx - 11, hz - 1); g.closePath(); g.fill(); g.stroke();
    if (hcur) { g.strokeStyle = Math.sin(t / 120) > 0 ? '#ff3b30' : '#ffd21f'; g.lineWidth = 3; g.strokeRect(hx - 15, hz - 16, 30, 30); }
    g.font = "10px 'ToofanPx',monospace"; g.textBaseline = 'top'; g.fillStyle = '#bfe3ff'; g.fillText('HOME', hx, hz + 13);
    hits.push({ key: 'home', x: hx, z: hz, r: 22 });
    /* gang patrols: ride up to one to take them on */
    (r.patrols || []).forEach(function (p) {
      var G = GANGS.GANGS[p.gang], px2 = X(p.x), pz2 = Z(p.z);
      g.fillStyle = G ? G.color : '#f33'; g.strokeStyle = Math.sin(t / 160) > 0 ? '#ff2a2a' : '#000'; g.lineWidth = 2;
      g.beginPath(); g.arc(px2, pz2, p.kind === 'car' ? 8 : 6, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = "9px 'ToofanPx',monospace"; g.textBaseline = 'middle'; g.fillText(p.kind === 'car' ? 'C' : 'B', px2, pz2 + 1);
    });
    /* Toofan */
    var b = r.bike, px = X(b.x), pz = Z(b.z), a = b.h;
    g.save(); g.translate(px, pz); g.rotate(-a + Math.PI); g.fillStyle = '#1f9bff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
    raf = requestAnimationFrame(draw);
  }
  function legend(r) {
    return GANGS.ORDER.map(function (k) {
      var G = GANGS.GANGS[k], n = 0, c = 0; r.map.targets.forEach(function (T) { if (GANGS.gangOf(T.key) === k) { n++; if (r.missions[T.key] === 'cleared') c++; } });
      return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:12px;height:12px;background:' + G.color + ';border:1px solid #000;display:inline-block"></span><span style="flex:1">' + G.name.toUpperCase() + '</span><span style="color:#9fd8aa">' + c + '/' + n + '</span></div>';
    }).join('') + '<div style="display:flex;align-items:center;gap:8px;margin:8px 0 0;color:#ff5a5a"><span style="width:12px;text-align:center">?</span><span style="flex:1">THE MAN BEHIND THEM</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:8px 0 0;color:#bfe3ff"><span style="width:12px;text-align:center;color:#4aa8ff">&#8962;</span><span style="flex:1">HOME</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:3px 0 0;color:#ffb0b0"><span style="width:12px;height:12px;border-radius:50%;border:2px solid #ff2a2a;display:inline-block"></span><span style="flex:1">GANG ON THE ROAD</span></div>';
  }
  return {
    isOpen: function () { return !!el; },
    open: function (r, pick) {
      if (el) return; ride = r; onPick = pick;
      el = document.createElement('div'); el.setAttribute('data-ok', '1');
      el.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(6,10,14,.94);color:#fff;font-size:12px;letter-spacing:.06em;touch-action:manipulation';
      el.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>' +
        '<div style="position:absolute;left:max(12px,env(safe-area-inset-left));top:max(56px,calc(env(safe-area-inset-top) + 48px));width:min(220px,46vw);padding:10px 12px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2)"><div style="color:#ffd21f;margin-bottom:6px">THE CITY</div>' + legend(r) + '<div style="margin-top:10px;color:#8a9199;font-size:10px">TAP A PLACE OR HOME TO RIDE THERE. RIDE UP TO A GANG TO FIGHT</div></div>' +
        '<button data-ok="1" style="position:absolute;right:max(14px,env(safe-area-inset-right));top:max(56px,calc(env(safe-area-inset-top) + 48px));padding:9px 14px;border-radius:4px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.6);color:#fff;font-size:12px;letter-spacing:.12em;cursor:pointer">[ CLOSE ]</button>';
      cv = el.querySelector('canvas'); document.body.appendChild(el);
      el.querySelector('button').addEventListener('click', function (e) { e.stopPropagation(); close(); });
      cv.addEventListener('click', function (e) {
        var rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, z = e.clientY - rc.top, i;
        for (i = 0; i < hits.length; i++) if (Math.hypot(hits[i].x - x, hits[i].z - z) < hits[i].r) { var k = hits[i].key; close(); if (onPick) onPick(k); return; }
      });
      draw(0);
    },
    close: close,
    dispose: close
  };
}

module.exports = { createFullMap: createFullMap };
