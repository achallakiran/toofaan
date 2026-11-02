/* modes (helper for the fight and the ride): Maa ka Thappad. Toofan is down: the world goes black and he lies alone in a pool of
   light. A choice: SAVE TOOFAN or LET HIM DIE.
     Let him die - onGiveUp(): the run ends (the caller goes back to the title).
     Save Toofan - Maa (full white sari, white hair) walks out of the dark, kneels beside his head, says her line, raises her hand. Every
       tap is a slap: his head turns with it, one cheek then the other, each slap quicker than the last until her hand is a blur; then
       the big one on its own, slow, a white flash, THAPPAD! and an echo. The white holds a moment, then onDone().
   Its own small scene and camera, built here and freed after. Seen from outside, a little above, so both of them are in the picture. */
'use strict';

var maavox = require('../view/maavox');
var herorig = require('../view/herorig');
var posemath = require('../view/posemath');

var LINE = 'UTH JA, BETA!';                           /* Maa's words (placeholder until Ravi gives hers) */
var SLAPS = 12;                                       /* quick slaps before the big one */
function slapLen(n) { return Math.max(0.09, 0.5 * Math.pow(0.82, n)); }
function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
var HEAD = { x: 0.05, z: 0 };                         /* where his head lies in the pool of light (measured) */
var KNEEL = { x: -0.05, z: -0.5 };                    /* where Maa kneels, beside his head */

function createThappad(ctx, opts) {
  var renderer = ctx.view.renderer, scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 1, 0.05, 60), made = [];
  scene.background = new THREE.Color(0x000000);
  scene.add(new THREE.HemisphereLight(0xd9d2e4, 0x2a2018, 0.7));
  var fill = new THREE.DirectionalLight(0xfff2e0, 0.9); fill.position.set(2, 3, 4); scene.add(fill);
  var spot = new THREE.SpotLight(0xfff0d8, 1.8, 14, 0.5, 0.7, 1.2); spot.position.set(0.6, 6.5, 0.6); scene.add(spot); scene.add(spot.target); spot.target.position.set(0.3, 0, -0.2);
  /* the pool of light on the floor */
  var cv = document.createElement('canvas'); cv.width = cv.height = 128; var g2 = cv.getContext('2d'), gr = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(120,110,100,0.85)'); gr.addColorStop(0.55, 'rgba(50,44,40,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  var tex = new THREE.CanvasTexture(cv), pool = new THREE.Mesh(new THREE.CircleGeometry(2.8, 40), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0.4, 0.001, -0.2); scene.add(pool); made.push(tex, pool.geometry, pool.material);
  /* motes of dust drifting up through the light */
  var MOTES = 60, motes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xd9cfbf, transparent: true, opacity: 0 }), MOTES), m4 = new THREE.Matrix4(), seeds = [];
  for (var i = 0; i < MOTES; i++) seeds.push([Math.sin(i * 12.9) * 2.4 + 0.3, ((i * 0.37) % 1) * 3.2, -1.6 - Math.abs(Math.cos(i * 7.1)) * 1.8, 0.08 + ((i * 0.13) % 0.12)]);
  scene.add(motes); made.push(motes.geometry, motes.material);
  /* Toofan, lying on his back, head towards Maa's side */
  var hero = herorig.createHeroRig(); scene.add(hero.root);
  hero.root.rotation.y = Math.PI / 2; hero.root.position.set(0.75, 0, 0);
  /* Maa */
  var maa = maavox.createMaa(); scene.add(maa.root); maa.root.visible = false;
  /* words and buttons on screen */
  function el(css, html) { var d = document.createElement('div'); d.style.cssText = css; if (html) d.innerHTML = html; document.body.appendChild(d); return d; }
  var BTN = 'margin:8px;padding:13px 18px;min-width:180px;border-radius:4px;font-size:15px;letter-spacing:.16em;cursor:pointer;touch-action:manipulation';
  var choice = el('position:fixed;left:0;right:0;bottom:16%;z-index:46;text-align:center;opacity:0;transition:opacity .6s',
    '<div style="color:#d8d0c4;font-size:13px;letter-spacing:.24em;margin-bottom:10px;text-shadow:0 0 8px #000">TOOFAN IS DOWN</div>' +
    '<button data-ok="1" data-c="save" style="' + BTN + ';border:1px solid #ffd21f;background:#ffd21f;color:#000">SAVE TOOFAN</button>' +
    '<button data-ok="1" data-c="die" style="' + BTN + ';border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.6);color:#ddd">LET HIM DIE</button>');
  var line = el('position:fixed;left:0;right:0;bottom:22%;z-index:44;text-align:center;pointer-events:none;color:#fff5e0;font-size:clamp(20px,6vw,34px);letter-spacing:.16em;text-shadow:0 0 12px #000,0 2px 2px #000;opacity:0;transition:opacity .6s');
  line.textContent = LINE;
  var prompt = el('position:fixed;left:0;right:0;bottom:12%;z-index:44;text-align:center;pointer-events:none;color:#ffd21f;font-size:clamp(16px,4.5vw,24px);letter-spacing:.2em;text-shadow:0 0 10px #000;opacity:0');
  prompt.textContent = '✊ TAP TAP TAP!';
  var flash = el('position:fixed;inset:0;z-index:43;pointer-events:none;background:#fff;opacity:0');
  var words = el('position:fixed;inset:0;z-index:45;pointer-events:none;overflow:hidden');
  function word(big) {
    var w = document.createElement('div'); w.className = 'comic'; w.textContent = 'THAPPAD!';
    var x = big ? 50 : 25 + Math.random() * 50, y = big ? 40 : 22 + Math.random() * 40, rot = (Math.random() - 0.5) * (big ? 10 : 40), sz = big ? 'clamp(54px,16vw,150px)' : 'clamp(22px,6vw,46px)';
    w.style.cssText = 'position:absolute;left:' + x + '%;top:' + y + '%;transform:translate(-50%,-50%) rotate(' + rot + 'deg) scale(.4);font:900 ' + sz + '/1 "Arial Black",Impact,sans-serif;color:#ffd21f;-webkit-text-stroke:' + (big ? 4 : 2) + 'px #000;text-shadow:' + (big ? 7 : 3) + 'px ' + (big ? 7 : 3) + 'px 0 #b0102a;transition:transform .12s ease-out,opacity .5s';
    words.appendChild(w); requestAnimationFrame(function () { w.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg) scale(1)'; });
    setTimeout(function () { w.style.opacity = 0; }, big ? 1600 : 380); setTimeout(function () { w.remove(); }, big ? 2200 : 900);
  }

  /* phases: dark (the fall to black) -> choice -> walk -> kneel -> ready (hand raised, waiting for taps) -> slaps -> final -> white */
  var S = { t: 0, phase: 'dark', tp: 0, queue: 0, n: 0, slap: null, final: null, side: 1, headKick: 0, headSide: 0, done: false, shake: 0 };
  function go(phase) { S.phase = phase; S.tp = 0; }
  choice.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || S.phase !== 'choice') return; e.stopPropagation();
    choice.style.opacity = 0; choice.style.pointerEvents = 'none';
    if (b.getAttribute('data-c') === 'die') { go('gone'); if (opts.onGiveUp) setTimeout(opts.onGiveUp, 500); }
    else { go('walk'); maa.root.visible = true; }
  });
  var stand = posemath.named('stand');
  var KNEELP = posemath.layer(stand, { 'legA.hx': 90, 'legA.k': 150, 'legB.hx': 90, 'legB.k': 150, 'spine.rx': 45, 'neck.rx': 15, 'head.rx': 30, 'armB.sx': 25, 'armB.e': 40, 'armA.sx': 10, 'armA.sz': 10 }, 1, 1, 1, 1);   /* on both knees beside him, bent over him */
  function maaPose() {
    var tp = S.tp, p;
    if (S.phase === 'walk') {                                                   /* out of the dark, slow, a little bent */
      var u = ease(tp / 3.2); maa.root.position.set(KNEEL.x + 0.1, 0, -6 + (6 + KNEEL.z) * u); maa.root.rotation.y = 0;
      return posemath.layer(u < 1 ? posemath.walkPose(tp * 0.55, 0.55) : stand, { 'spine.rx': 12, 'head.rx': 10, 'neck.rx': 4 }, 0, 1, 0.6, 0.6);
    }
    if (S.phase === 'kneel') return posemath.blend(posemath.layer(stand, { 'spine.rx': 18, 'head.rx': 22 }, 1, 1, 1, 1), KNEELP, ease(tp / 1.2));
    /* kneeling beside him, looking down at him, her right hand raised */
    p = posemath.copy(KNEELP);
    var arm = S.side > 0 ? 'armA' : 'armB', up = {}, hit = {};
    up[arm + '.sx'] = 95; up[arm + '.sz'] = 58; up[arm + '.e'] = 105;
    hit[arm + '.sx'] = 75; hit[arm + '.sz'] = -30; hit[arm + '.e'] = 0; hit['spine.rx'] = 60; hit['spine.ry'] = -S.side * 12;     /* measured: the hand lands on his cheek */
    var sl = S.final || S.slap;
    if (sl) {
      var k = sl.t / sl.len, w = k < 0.35 ? 0 : ease((k - 0.35) / 0.3) * (k > 0.8 ? 1 - (k - 0.8) / 0.2 * 0.6 : 1);
      p = posemath.layer(p, up, 0, 1, 1, 1); p = posemath.layer(p, hit, 0, w, w, w);
    } else if (S.phase !== 'kneel') { var r = S.phase === 'ready' || S.phase === 'slaps' ? ease(S.raise || 0) : 0; p = posemath.layer(p, up, 0, r, r, r); }
    return p;
  }
  function heroPose() {
    var p = posemath.named('down');
    p['head.ry'] = (p['head.ry'] || 0) + S.headSide * 55 * S.headKick;      /* each slap turns his head */
    p['neck.ry'] = (p['neck.ry'] || 0) + S.headSide * 18 * S.headKick;
    return p;
  }
  function hitNow(big) {
    S.headSide = S.side; S.headKick = 1; S.shake = big ? 0.12 : 0.04;
    opts.sfx.slap(big ? 1.4 : 0.8 + Math.random() * 0.3, big); word(big);
    if (big) { flash.style.transition = 'none'; flash.style.opacity = 1; }
  }
  var api = {
    tap: function () { if (S.phase === 'ready' || S.phase === 'slaps') { if (S.queue < 2) S.queue++; } else if (S.phase === 'choice') { /* the buttons choose */ } },
    choose: function (c) { var b = choice.querySelector('[data-c="' + c + '"]'); if (b) b.click(); },
    phase: function () { return S.phase; },
    render: function () {
      var now = performance.now(), dt = S.last ? Math.min(0.1, (now - S.last) / 1000) : 1 / 60; S.last = now;     /* its own clock: the same pace wherever it is shown */
      S.t += dt; S.tp += dt; var t = S.t;
      if (S.phase === 'dark' && S.tp > 1.2) { go('choice'); choice.style.opacity = 1; }
      if (S.phase === 'walk' && S.tp > 3.2) go('kneel');
      if (S.phase === 'kneel' && S.tp > 1.2) go('line');
      if (S.phase === 'line' && S.tp > 2.2) { go('ready'); S.raise = 0; }
      if (S.phase === 'ready' || S.phase === 'slaps') S.raise = Math.min(1, (S.raise || 0) + dt / 0.6);
      line.style.opacity = (S.phase === 'line' || S.phase === 'ready' || S.phase === 'slaps') ? 1 : 0;
      pool.material.opacity = Math.min(1, Math.max(0, (t - 0.5) / 1.2));
      motes.material.opacity = 0.5 * pool.material.opacity;
      prompt.style.opacity = (S.phase === 'ready' && S.raise >= 1) || (S.phase === 'slaps' && S.n < SLAPS) ? 1 : 0;
      prompt.style.transform = 'scale(' + (1 + Math.sin(t * 9) * 0.06) + ')';
      /* the slaps: one at a time, each quicker than the last */
      if (!S.slap && !S.final && S.queue > 0 && S.raise >= 1 && (S.phase === 'ready' || S.phase === 'slaps')) { S.queue--; S.phase = 'slaps'; S.slap = { t: 0, len: slapLen(S.n), hit: false }; }
      if (S.slap) {
        S.slap.t += dt; if (!S.slap.hit && S.slap.t >= S.slap.len * 0.6) { S.slap.hit = true; hitNow(false); }
        if (S.slap.t >= S.slap.len) { S.slap = null; S.n++; S.side = -S.side; if (S.n >= SLAPS) { S.final = { t: 0, len: 1.4, hit: false }; S.phase = 'final'; S.queue = 0; } }
      }
      if (S.final) {
        S.final.t += dt * (S.final.hit ? 1 : 0.5);                            /* the big one comes slow */
        if (!S.final.hit && S.final.t >= S.final.len * 0.6) { S.final.hit = true; hitNow(true); }
        if (S.final.hit && S.final.t >= S.final.len * 0.6 + 1.4 && !S.done) { S.done = true; if (opts.onDone) opts.onDone(); }   /* the white holds a moment */
      }
      S.headKick *= Math.exp(-(S.slap && S.slap.len < 0.2 ? 6 : 3.5) * dt);
      if (maa.root.visible) { maa.rig.applyPose(maaPose(), { plant: true }); maa.sync(); }
      hero.applyPose(heroPose(), { plant: true });
      for (var j = 0; j < MOTES; j++) { var sd = seeds[j], yy = (sd[1] + t * sd[3]) % 3.2; m4.makeTranslation(sd[0] + Math.sin(t * 0.4 + j) * 0.1, yy, sd[2]); motes.setMatrixAt(j, m4); }
      motes.instanceMatrix.needsUpdate = true;
      /* the camera: from outside, a little above; it creeps in once Maa kneels */
      var cw = renderer.domElement.clientWidth || 800, ch = renderer.domElement.clientHeight || 600, tall = ch > cw, near = S.phase === 'choice' || S.phase === 'dark' || S.phase === 'walk' ? 0 : ease(Math.min(1, (S.phase === 'kneel' ? S.tp : 3) / 3));
      cam.aspect = cw / ch; cam.fov = tall ? 66 : 48; cam.updateProjectionMatrix();
      S.shake *= Math.exp(-8 * dt); var sx = (Math.random() - 0.5) * S.shake, sy = (Math.random() - 0.5) * S.shake;
      cam.position.set(1.9 - 0.6 * near + sx, (tall ? 2.6 : 2.0) - 0.5 * near + sy, 3.3 - 1.0 * near);
      cam.lookAt(0.3 - 0.2 * near, S.phase === 'walk' ? 0.55 : 0.4, -0.25);
      var ac = renderer.autoClear; renderer.autoClear = true; renderer.setClearColor(0x000000, 1); renderer.render(scene, cam); renderer.autoClear = ac;
    },
    /* (test tools) where her hands and his head are for a given kneeling pose */
    measure: function (over, base) {
      var v = new THREE.Vector3(), o = {}; maa.root.visible = true; maa.root.position.set(KNEEL.x + 0.1, 0, KNEEL.z);
      maa.rig.applyPose(posemath.layer(base ? posemath.layer(stand, base, 1, 1, 1, 1) : KNEELP, over || {}, 1, 1, 1, 1), { plant: true }); maa.root.updateMatrixWorld(true);
      hero.applyPose(heroPose(), { plant: true }); hero.root.updateMatrixWorld(true);
      o.handL = maa.rig.parts.L.wrist.getWorldPosition(v).toArray().map(function (n) { return +n.toFixed(2); });
      o.handR = maa.rig.parts.R.wrist.getWorldPosition(v).toArray().map(function (n) { return +n.toFixed(2); });
      o.maaHead = maa.rig.head.getWorldPosition(v).toArray().map(function (n) { return +n.toFixed(2); });
      o.hisHead = hero.head.getWorldPosition(v).toArray().map(function (n) { return +n.toFixed(2); });
      return o;
    },
    dispose: function () {
      scene.remove(maa.root); maa.dispose(); scene.remove(hero.root); made.forEach(function (x) { x.dispose(); });
      [choice, line, prompt, flash, words].forEach(function (d) { d.remove(); });
    }
  };
  return api;
}

module.exports = { createThappad: createThappad, LINE: LINE, SLAPS: SLAPS };
