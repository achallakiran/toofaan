/* modes (helper for the hideout): Toofan's training corner on the gym mat. Three short workouts, scored for fun only (nothing changes
   in the fights); the best score of each is kept.
     PUSH-UPS        20 s. Each tap is one push-up; tap again as he comes up. Count the reps.
     SKIPPING        30 s. The rope turns faster as the streak grows; tap as it swings under his feet. Miss and he trips.
     SHADOW BOXING   20 calls. PUNCH! (fist) or BLOCK! (shield) flashes up; answer before the bar runs out. Faster earns more.
   The hideout hands over Toofan's rig, move player and sound; this returns his pose (and the tilt for push-ups) each frame. */
'use strict';

var posemath = require('../view/posemath');

var GAMES = [
  { id: 'pushups', name: 'PUSH-UPS', how: 'TAP ✊ FOR EACH PUSH-UP', unit: 'REPS', time: 20 },
  { id: 'skip', name: 'SKIPPING', how: 'TAP ✊ AS THE ROPE COMES UNDER HIS FEET', unit: 'JUMPS', time: 30 },
  { id: 'shadow', name: 'SHADOW BOXING', how: 'PUNCH! = ✊  ·  BLOCK! = SHIELD', unit: 'POINTS', calls: 20 }
];
var BTN = 'display:block;width:100%;margin:8px 0 0;padding:11px 12px;text-align:left;border-radius:4px;border:1px solid rgba(140,255,156,.5);background:rgba(0,0,0,.55);color:#d8ffe0;font-size:13px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
var PUNCHES = ['jab', 'cross', 'hook', 'uppercut'];
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, k) { return a + (b - a) * k; }

function createTraining(ctx, H) {
  var view = ctx.view, G = null, panel = null, hud = null, best = ctx.save.get('train.best', {}) || {}, beads = null, beadN = 26, m4 = new THREE.Matrix4();
  var blk = ctx.touchRoot.querySelector('#btnBlock');
  function showBlock(on) { if (blk) blk.style.visibility = on ? 'visible' : 'hidden'; }
  function el(css, html) { var d = document.createElement('div'); d.setAttribute('data-ok', '1'); d.style.cssText = css; d.innerHTML = html || ''; document.body.appendChild(d); return d; }
  function closeAll() { if (panel) { panel.remove(); panel = null; } if (hud) { hud.remove(); hud = null; } showBlock(false); if (beads) beads.visible = false; }

  /* the rope: a string of small voxel beads from hand to hand, swung round under his feet */
  function rope() {
    if (beads) return beads;
    beads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), beadN);
    view.scene.add(beads); return beads;
  }
  function placeRope(x, z, lift, phi) {
    var b = rope(), i, hy = 0.98 + lift, R = 1.05;
    for (i = 0; i < beadN; i++) {
      var u = i / (beadN - 1), hx = -0.34 + 0.68 * u, bow = Math.sin(Math.PI * u);
      var py = hy + (Math.cos(phi) * R) * bow, pz = (Math.sin(phi) * R * 0.55) * bow;
      m4.makeTranslation(x + hx, Math.max(0.02, py), z + 0.05 + pz); b.setMatrixAt(i, m4);
    }
    b.instanceMatrix.needsUpdate = true; b.visible = true;
  }

  /* the menu */
  function menu() {
    closeAll();
    var rows = GAMES.map(function (g, i) { return '<button data-g="' + i + '" style="' + BTN + '">' + g.name + '<span style="float:right;color:#ffd21f">BEST ' + (best[g.id] || 0) + '</span><br><span style="font-size:10px;opacity:.75">' + g.how + '</span></button>'; }).join('');
    panel = el('position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:42;width:min(360px,86vw);padding:14px 16px;background:rgba(4,8,10,.92);border:1px solid rgba(140,255,156,.45);border-radius:6px;color:#8cff9c;font-size:13px;letter-spacing:.16em',
      '<div>&gt; TRAINING<span style="float:right;opacity:.6">FOR FUN</span></div>' + rows + '<button data-x="1" style="' + BTN + ';text-align:center;margin-top:12px">[ DONE ]</button>');
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; e.stopPropagation();
      if (b.getAttribute('data-x')) { closeAll(); G = null; api.onClose(); return; }
      start(GAMES[+b.getAttribute('data-g')]);
    });
    G = { mode: 'menu' };
  }
  function start(def) {
    closeAll();
    hud = el('position:fixed;left:0;right:0;top:max(58px,calc(env(safe-area-inset-top) + 50px));z-index:42;pointer-events:none;text-align:center;color:#d8ffe0;letter-spacing:.16em;text-shadow:0 0 6px #000,0 1px 2px #000',
      '<div id="trName" style="font-size:13px;color:#8cff9c"></div><div id="trScore" style="font-size:30px;color:#ffd21f;margin-top:4px"></div><div id="trTime" style="font-size:12px;margin-top:2px"></div>' +
      '<div id="trCall" style="font-size:clamp(26px,8vw,44px);margin-top:18vh;min-height:52px"></div><div style="width:min(260px,60vw);height:8px;margin:6px auto;background:rgba(255,255,255,.15)"><div id="trBar" style="height:100%;width:0;background:#ffd21f"></div></div>' +
      '<div id="trHow" style="position:fixed;left:0;right:0;bottom:max(110px,calc(env(safe-area-inset-bottom) + 100px));font-size:12px"></div>');
    G = { mode: 'play', def: def, t: 0, score: 0, done: false, u: { name: hud.querySelector('#trName'), score: hud.querySelector('#trScore'), time: hud.querySelector('#trTime'), call: hud.querySelector('#trCall'), bar: hud.querySelector('#trBar'), how: hud.querySelector('#trHow') } };
    G.u.name.textContent = '> ' + def.name; G.u.how.textContent = def.how; G.u.bar.parentNode.style.visibility = def.id === 'shadow' ? 'visible' : 'hidden';
    if (def.id === 'pushups') { G.rep = -1; G.queued = false; }
    if (def.id === 'skip') { G.period = 0.62; G.phase = 0; G.next = 0.62 * 0.5 + 0.9; G.lead = 0.9; G.streak = 0; G.bestStreak = 0; G.jumpT = -9; G.tripT = -9; G.armed = false; }
    if (def.id === 'shadow') { G.n = 0; G.call = null; G.gap = 1.0; G.react = -9; G.blockT = -9; showBlock(true); }
    H.mp.cancel(); H.sfx.whoosh(0.3);
  }
  function finish() {
    var def = G.def, sc = G.score, prev = best[def.id] || 0, rec = sc > prev; if (rec) { best[def.id] = sc; ctx.save.set('train.best', best); }
    G.mode = 'end'; showBlock(false); if (beads) beads.visible = false;
    if (hud) { hud.remove(); hud = null; }
    panel = el('position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:42;width:min(320px,82vw);padding:16px;background:rgba(4,8,10,.92);border:1px solid rgba(140,255,156,.45);border-radius:6px;color:#8cff9c;font-size:13px;letter-spacing:.16em;text-align:center',
      '<div>&gt; ' + def.name + '</div><div style="font-size:34px;color:#ffd21f;margin:10px 0 4px">' + sc + '</div><div>' + def.unit + (def.id === 'skip' ? '  ·  STREAK ' + G.bestStreak : '') + '</div>' +
      '<div style="margin-top:8px;color:' + (rec ? '#ffd21f' : '#d8ffe0') + '">' + (rec ? 'NEW BEST!' : 'BEST ' + Math.max(prev, sc)) + '</div>' +
      '<button data-a="1" style="' + BTN + ';text-align:center">[ AGAIN ]</button><button data-m="1" style="' + BTN + ';text-align:center">[ TRAINING MENU ]</button>');
    panel.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.getAttribute('data-a')) start(def); else menu(); });
    H.sfx.whoosh(0.6);
  }

  var api = {
    onClose: function () {},
    open: function () { menu(); },
    active: function () { return !!G; },
    playing: function () { return !!G && G.mode === 'play'; },
    /* a button press: 'fist' or 'block' */
    press: function (kind) {
      if (!G || G.mode !== 'play') return;
      var d = G.def.id;
      if (d === 'pushups' && kind === 'fist') { if (G.rep < 0) { G.rep = 0; } else if (G.rep > 0.55) G.queued = true; }
      if (d === 'skip' && kind === 'fist') {
        var diff = G.t - G.next;                       /* the rope's next pass under his feet */
        if (Math.abs(diff) < 0.15 && !G.armed) { G.armed = true; G.jumpT = G.t; }
        else if (diff < -0.15) { /* too early: ignored, he waits for it */ }
      }
      if (d === 'shadow' && G.call && !G.call.done) {
        var c = G.call, ok = (c.kind === 'punch') === (kind === 'fist');
        c.done = true;
        if (ok) {
          var left = clamp01(1 - c.t / c.len); G.score += 100 + Math.round(left * 100);
          if (c.kind === 'punch') H.mp.play(PUNCHES[G.n % 4]); else { G.blockT = G.t; H.sfx.block(false); }
          G.u.call.style.color = '#8cff9c';
        } else { G.react = G.t; H.sfx.hit('cross', 0.3); G.u.call.style.color = '#ff5a5a'; G.u.call.textContent = 'MISS'; }
        G.gap = 0.35 + 0.25 * Math.random();
      }
    },
    /* advance the workout; returns how Toofan stands: { pose, tilt (push-up lean, radians), lift (metres) } */
    update: function (dt, x, z) {
      var base = posemath.idlePose(H.t || 0), out = { pose: base, tilt: 0, lift: 0, face: 0 };
      if (!G || G.mode !== 'play') return out;
      G.t += dt; var d = G.def.id, u = G.u;
      if (d === 'pushups') {
        var left = G.def.time - G.t; u.time.textContent = 'TIME ' + Math.max(0, Math.ceil(left));
        if (G.rep >= 0) { G.rep += dt / 0.5; if (G.rep >= 1) { G.score++; H.sfx.land(1.6); G.rep = G.queued ? 0 : -1; G.queued = false; } }
        var k = G.rep >= 0 ? Math.sin(Math.PI * Math.min(1, G.rep)) : 0;          /* 0 = arms straight, 1 = chest to the floor */
        out.tilt = lerp(68, 80, k) * Math.PI / 180; out.face = Math.PI / 2;          /* side on to the camera */
        out.pose = posemath.layer(posemath.named('stand'), { 'armA.sx': lerp(72, 20, k), 'armB.sx': lerp(72, 20, k), 'armA.sz': 14, 'armB.sz': 14, 'armA.e': lerp(0, 120, k), 'armB.e': lerp(0, 120, k),      /* measured: the hands stay planted under the shoulders */ 'head.rx': -35, 'neck.rx': -10, 'spine.rx': 0, 'legA.hx': 0, 'legB.hx': 0, 'legA.k': 0, 'legB.k': 0 }, 1, 1, 1, 1);
        u.score.textContent = G.score; if (left <= 0) finish();
      } else if (d === 'skip') {
        var left2 = G.def.time - G.t; u.time.textContent = 'TIME ' + Math.max(0, Math.ceil(left2)) + '   STREAK ' + G.streak;
        if (G.t - G.tripT < 0.8) { G.phase = Math.PI * 0.05; }                     /* tripped: the rope hangs a moment */
        else if (G.t > G.lead) {
          G.phase += dt / G.period * Math.PI * 2;
          if (G.t > G.next + 0.15) {                                               /* the rope has passed under his feet */
            if (G.armed) { G.score++; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak); H.sfx.land(1.2); G.period = Math.max(0.42, 0.62 - G.streak * 0.008); }
            else { G.streak = 0; G.tripT = G.t; G.period = 0.62; H.sfx.fall(); G.phase = 0; }
            G.armed = false; G.next = G.t - 0.15 + (G.t - G.tripT < 0.8 ? 0.8 + G.period * 0.5 : G.period);
          }
        }
        var phi = G.t - G.tripT < 0.8 ? Math.PI * 0.1 : Math.PI + (G.t - G.next) / G.period * Math.PI * 2;   /* the rope is at the bottom (pi) at G.next */
        var jt = (G.t - G.jumpT) / 0.34, lift = jt >= 0 && jt <= 1 ? Math.sin(Math.PI * jt) * 0.16 : 0;
        out.lift = lift;
        var land = G.t - G.tripT < 0.5 ? 1 : 0;
        out.pose = posemath.layer(posemath.named('stand'), { 'armA.sz': 32, 'armB.sz': 32, 'armA.sx': 18 + Math.sin(phi) * 8, 'armB.sx': 18 + Math.sin(phi) * 8, 'armA.e': 55, 'armB.e': 55,
          'legA.hx': 10 + (lift > 0 ? 18 : 4), 'legB.hx': 10 + (lift > 0 ? 18 : 4), 'legA.k': lift > 0 ? 30 : 12, 'legB.k': lift > 0 ? 30 : 12, 'spine.rx': land ? 25 : 4, 'head.rx': land ? 20 : 0 }, 1, 1, 1, 1);
        placeRope(x, z, lift, phi);
        u.score.textContent = G.score; if (left2 <= 0) finish();
      } else if (d === 'shadow') {
        u.time.textContent = 'CALL ' + Math.min(G.n + 1, G.def.calls) + ' / ' + G.def.calls;
        if (!G.call || G.call.done) {
          G.gap -= dt;
          if (G.gap <= 0) {
            if (G.n >= G.def.calls) { finish(); return out; }
            var kind = Math.random() < 0.62 ? 'punch' : 'block', len = Math.max(0.7, 1.3 - G.n * 0.03);
            G.call = { kind: kind, t: 0, len: len, done: false }; G.n++;
            u.call.style.color = kind === 'punch' ? '#ffd21f' : '#4fa8ff'; u.call.textContent = kind === 'punch' ? '✊ PUNCH!' : 'BLOCK!';
          } else if (G.call && G.call.done && G.gap < 0.2) u.call.textContent = '';
        } else {
          G.call.t += dt; u.bar.style.width = Math.round(clamp01(1 - G.call.t / G.call.len) * 100) + '%';
          if (G.call.t >= G.call.len) { G.call.done = true; G.react = G.t; u.call.style.color = '#ff5a5a'; u.call.textContent = 'TOO SLOW'; H.sfx.hit('cross', 0.3); G.gap = 0.6; }
        }
        var p = posemath.named('guard') || posemath.named('stand');
        if (G.t - G.blockT < 0.45) p = posemath.layer(p, posemath.named('block'), 0.8, 1, 1, 1);
        if (G.t - G.react < 0.35) p = posemath.layer(p, posemath.named('hurt'), 0.5, 0.6, 0.6, 0.6);
        out.pose = p; u.score.textContent = G.score;
      }
      return out;
    },
    dispose: function () { closeAll(); G = null; if (beads) { view.scene.remove(beads); beads.geometry.dispose(); beads.material.dispose(); beads = null; } }
  };
  return api;
}

module.exports = { createTraining: createTraining, GAMES: GAMES };
