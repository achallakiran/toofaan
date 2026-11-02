/* modes (helper for the fight): Maa ka Thappad. Toofan is knocked out: the screen goes black. Out of the dark Maa walks into a pool of
   light, seen from where he lies (the camera is his eyes, looking up), stops over him and says her line, and raises her hand. Every tap
   is a slap at the camera, one cheek then the other, each one quicker than the last until her hand is a blur; then the big one on its
   own: slow, a white flash, THAPPAD! and an echo. onDone() is called with the screen white, and the fight takes it from there.
   Its own small scene and camera, built here and freed after. */
'use strict';

var maavox = require('../view/maavox');
var posemath = require('../view/posemath');

var LINE = 'UTH JA, BETA!';                           /* Maa's words (placeholder until Ravi gives hers) */
var SLAPS = 12;                                       /* quick slaps before the big one */
function slapLen(n) { return Math.max(0.075, 0.42 * Math.pow(0.8, n)); }
function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

function createThappad(ctx, opts) {
  var renderer = ctx.view.renderer, scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.05, 60), made = [];
  scene.background = new THREE.Color(0x000000);
  scene.add(new THREE.HemisphereLight(0xd9d2e4, 0x2a2018, 0.75));
  var fill = new THREE.DirectionalLight(0xfff2e0, 1.05); fill.position.set(0.4, 1.2, 3); scene.add(fill);       /* a soft light from where he lies, on her face */
  var spot = new THREE.SpotLight(0xfff0d8, 1.9, 14, 0.42, 0.65, 1.2); spot.position.set(0.3, 6.5, -0.6); scene.add(spot); scene.add(spot.target); spot.target.position.set(0, 0, -1.1);
  /* the pool of light on the floor */
  var cv = document.createElement('canvas'); cv.width = cv.height = 128; var g2 = cv.getContext('2d'), gr = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(120,110,100,0.85)'); gr.addColorStop(0.55, 'rgba(50,44,40,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  var tex = new THREE.CanvasTexture(cv), pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.001, -1.1); scene.add(pool); made.push(tex, pool.geometry, pool.material);
  /* motes of dust drifting up through the light: the otherworld */
  var MOTES = 60, motes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xd9cfbf, transparent: true, opacity: 0 }), MOTES), m4 = new THREE.Matrix4(), seeds = [];
  for (var i = 0; i < MOTES; i++) seeds.push([Math.sin(i * 12.9) * 2.0, ((i * 0.37) % 1) * 3.2, -2.2 - Math.abs(Math.cos(i * 7.1)) * 1.6, 0.08 + ((i * 0.13) % 0.12)]);   /* behind her, never in front of his eyes */
  scene.add(motes); made.push(motes.geometry, motes.material);
  /* Maa */
  var maa = maavox.createMaa(); scene.add(maa.root);
  /* words on screen */
  function el(css) { var d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; }
  var line = el('position:fixed;left:0;right:0;bottom:20%;z-index:44;text-align:center;pointer-events:none;color:#fff5e0;font-size:clamp(20px,6vw,34px);letter-spacing:.16em;text-shadow:0 0 12px #000,0 2px 2px #000;opacity:0;transition:opacity .5s');
  line.textContent = LINE;
  var prompt = el('position:fixed;left:0;right:0;bottom:12%;z-index:44;text-align:center;pointer-events:none;color:#ffd21f;font-size:clamp(16px,4.5vw,24px);letter-spacing:.2em;text-shadow:0 0 10px #000;opacity:0');
  prompt.textContent = '✊ TAP TAP TAP!';
  var flash = el('position:fixed;inset:0;z-index:43;pointer-events:none;background:#fff;opacity:0');
  var words = el('position:fixed;inset:0;z-index:45;pointer-events:none;overflow:hidden');
  function word(big) {
    var w = document.createElement('div'); w.className = 'comic'; w.textContent = 'THAPPAD!';
    var x = big ? 50 : 20 + Math.random() * 60, y = big ? 42 : 18 + Math.random() * 55, rot = (Math.random() - 0.5) * (big ? 10 : 40), sz = big ? 'clamp(54px,16vw,150px)' : 'clamp(22px,6vw,46px)';
    w.style.cssText = 'position:absolute;left:' + x + '%;top:' + y + '%;transform:translate(-50%,-50%) rotate(' + rot + 'deg) scale(.4);font:900 ' + sz + '/1 "Arial Black",Impact,sans-serif;color:#ffd21f;-webkit-text-stroke:' + (big ? 4 : 2) + 'px #000;text-shadow:' + (big ? 7 : 3) + 'px ' + (big ? 7 : 3) + 'px 0 #b0102a;transition:transform .12s ease-out,opacity .5s';
    words.appendChild(w); requestAnimationFrame(function () { w.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg) scale(1)'; });
    setTimeout(function () { w.style.opacity = 0; }, big ? 1400 : 380); setTimeout(function () { w.remove(); }, big ? 2000 : 900);
  }

  var S = { t: 0, phase: 'dark', queue: 0, n: 0, slap: null, kickY: 0, kickR: 0, side: 1, done: false, final: null };
  var stand = posemath.named('stand');
  function maaPose(dt) {
    var t = S.t, p, walkT = 1.4, arrive = 4.0;
    if (t < arrive) {                                                           /* walking out of the dark, slow, a little bent */
      var u = ease((t - walkT) / (arrive - walkT)); maa.root.position.set(0, 0, -7 + 5.9 * u);
      p = posemath.layer(t > walkT && u < 1 ? posemath.walkPose(t * 0.55, 0.55) : stand, { 'spine.rx': 12, 'head.rx': 6, 'neck.rx': 4 }, 0, 1, 0.6, 0.6);
      return p;
    }
    /* over him: bent down to look at him */
    p = posemath.layer(stand, { 'spine.rx': 24, 'neck.rx': 14, 'head.rx': 26, 'armA.sx': 8, 'armB.sx': 8, 'armA.sz': 10, 'armB.sz': 10, 'legA.hx': 10, 'legB.hx': -4 }, 1, 1, 1, 1);
    var raise = ease((t - 4.4) / 0.5);
    var arm = S.side > 0 ? 'armA' : 'armB', other = S.side > 0 ? 'armB' : 'armA', up = {}, hit = {};
    up[arm + '.sx'] = 100; up[arm + '.sz'] = 62; up[arm + '.e'] = 100;         /* hand raised beside her head */
    hit[arm + '.sx'] = 78; hit[arm + '.sz'] = -28; hit[arm + '.e'] = 12; hit['spine.ry'] = -S.side * 24; hit[other + '.sx'] = 20;
    var sl = S.final || S.slap;
    if (sl) {
      var k = sl.t / sl.len, w = k < 0.35 ? 0 : ease((k - 0.35) / 0.35) * (k > 0.8 ? 1 - (k - 0.8) / 0.2 * 0.6 : 1);
      p = posemath.layer(p, up, 0, 1, 1, 1); p = posemath.layer(p, hit, 0, w, w, w);
    } else p = posemath.layer(p, up, 0, raise, raise, raise);
    return p;
  }
  function hitNow(big) {
    S.kickY = S.side * (big ? 0.6 : 0.32); S.kickR = -S.side * (big ? 0.35 : 0.18);
    opts.sfx.slap(big ? 1.4 : 0.8 + Math.random() * 0.3, big); word(big);
    if (big) { flash.style.transition = 'none'; flash.style.opacity = 1; }
  }
  var api = {
    tap: function () { if (S.phase === 'ready' || S.phase === 'slaps') { if (S.queue < 2) S.queue++; } },
    render: function (dt) {
      S.t += dt; var t = S.t;
      if (S.phase === 'dark' && t > 4.6) { S.phase = 'ready'; prompt.style.opacity = 1; }
      line.style.opacity = t > 4.0 && !S.final ? 1 : 0;
      pool.material.opacity = Math.min(1, Math.max(0, (t - 1.0) / 1.2));
      motes.material.opacity = 0.5 * pool.material.opacity;
      prompt.style.transform = 'scale(' + (1 + Math.sin(t * 9) * 0.06) + ')';
      /* the slaps: one at a time, each quicker than the last */
      if (!S.slap && !S.final && S.queue > 0 && (S.phase === 'ready' || S.phase === 'slaps')) { S.queue--; S.phase = 'slaps'; S.slap = { t: 0, len: slapLen(S.n), hit: false }; }
      if (S.slap) {
        S.slap.t += dt; if (!S.slap.hit && S.slap.t >= S.slap.len * 0.6) { S.slap.hit = true; hitNow(false); }
        if (S.slap.t >= S.slap.len) { S.slap = null; S.n++; S.side = -S.side; if (S.n >= SLAPS) { S.final = { t: 0, len: 1.3, hit: false }; S.phase = 'final'; prompt.style.opacity = 0; S.queue = 0; } }
      }
      if (S.final) {
        S.final.t += dt * (S.final.hit ? 1 : 0.55);                          /* the big one comes slow */
        if (!S.final.hit && S.final.t >= S.final.len * 0.6) { S.final.hit = true; hitNow(true); }
        if (S.final.hit && S.final.t >= S.final.len * 0.6 + 0.55 && !S.done) { S.done = true; if (opts.onDone) opts.onDone(); }
      }
      prompt.style.opacity = S.phase === 'ready' || (S.phase === 'slaps' && S.n < SLAPS) ? 1 : 0;
      /* Maa */
      maa.rig.applyPose(maaPose(dt), { plant: true }); maa.sync();
      for (var j = 0; j < MOTES; j++) { var sd = seeds[j], yy = (sd[1] + t * sd[3]) % 3.2; m4.makeTranslation(sd[0] + Math.sin(t * 0.4 + j) * 0.1, yy, sd[2]); motes.setMatrixAt(j, m4); }
      motes.instanceMatrix.needsUpdate = true;
      /* his eyes: low on the floor, looking up at her; knocked aside by each slap */
      S.kickY *= Math.exp(-9 * dt); S.kickR *= Math.exp(-9 * dt);
      var my = maa.root.position.z, cw = renderer.domElement.clientWidth || 800, ch = renderer.domElement.clientHeight || 600;
      cam.aspect = cw / ch; cam.fov = ch > cw ? 72 : 58; cam.updateProjectionMatrix();
      cam.position.set(0, 0.32 + Math.sin(t * 1.3) * 0.01, 0.55);
      cam.lookAt(0, (t < 4.0 ? 1.15 : 1.3) + (ch > cw ? 0.25 : 0), Math.min(my, -0.9) - 0.2);
      cam.rotateY(S.kickY); cam.rotateZ(S.kickR);
      var ac = renderer.autoClear; renderer.autoClear = true; renderer.setClearColor(0x000000, 1); renderer.render(scene, cam); renderer.autoClear = ac;
    },
    slapsDone: function () { return S.n; },
    dispose: function () {
      scene.remove(maa.root); maa.dispose(); made.forEach(function (x) { x.dispose(); });
      [line, prompt, flash, words].forEach(function (d) { d.remove(); });
    },
    flashEl: flash
  };
  return api;
}

module.exports = { createThappad: createThappad, LINE: LINE, SLAPS: SLAPS };
