/* view: the 30-second opening video, made live in the engine. Sixteen one-bar shots cut on the beat of the theme: a psychedelic
   background (rays, tunnels, kaleidoscope, halftone, plasma, colours cycling) and Toofan as a black silhouette with a neon edge —
   head-banging, strumming his guitar, dancing, punching, kicking, the guitar smash and whirl, riding Bijli — with the chant flashing up.
   It has its own scene and cameras, and draws straight to the renderer, so the game's world is untouched. */
'use strict';

var herorig = require('./herorig');
var posemath = require('./posemath');
var moveplayer = require('./moveplayer');
var bikevox = require('./bikevox');
var MOVES = require('../data/moves').MOVES;

var PALS = [['#ff2d95', '#ffd21f', '#7a2dff'], ['#14e0c8', '#ff3b30', '#ffd21f'], ['#ffd21f', '#ff2d55', '#1fb5ff'], ['#7a2dff', '#14e07a', '#ff8a1f'],
            ['#1fb5ff', '#ff2d95', '#ffd21f'], ['#ff8a1f', '#2d1fff', '#14e0c8'], ['#14e07a', '#ff2d95', '#ffffff'], ['#ff3b30', '#ffd21f', '#000000']];
var BG_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
var BG_FS = [
  'uniform float uT, uBeat, uMode, uAspect; uniform vec3 uA, uB, uC; varying vec2 vUv;',
  'void main(){',
  '  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0; float r = length(p), a = atan(p.y, p.x), v;',
  '  if (uMode < 0.5) v = step(0.5, fract(a * 1.909 + uT * 0.25));',                                          /* sun rays */
  '  else if (uMode < 1.5) v = step(0.5, fract(0.6 / (r + 0.05) - uT * 1.6));',                                  /* tunnel rings */
  '  else if (uMode < 2.5) { float k = abs(mod(a + 3.1416, 1.0472) - 0.5236); vec2 q = vec2(cos(k), sin(k)) * r; v = step(0.5, fract(q.x * 3.0 - uT * 0.8 + sin(q.y * 8.0 + uT) * 0.2)); }',   /* kaleidoscope */
  '  else if (uMode < 3.5) { vec2 c = fract(p * 5.0) - 0.5; v = step(length(c), 0.22 + 0.18 * sin(uT * 3.0 + r * 4.0)); }',   /* halftone */
  '  else v = step(0.5, 0.5 + 0.5 * sin(p.x * 4.0 + uT * 2.0) * sin(p.y * 4.0 - uT * 1.6));',                 /* plasma blocks */
  '  vec3 col = mix(uA, uB, v); col = mix(col, uC, (1.0 - smoothstep(0.0, 1.2, r)) * 0.45);',
  '  col += vec3(exp(-fract(uBeat) * 5.0) * 0.22);',                                                              /* flash on every beat */
  '  col *= 1.0 - smoothstep(0.9, 1.9, r) * 0.55;',                                                              /* vignette */
  '  gl_FragColor = vec4(col, 1.0);',
  '}'].join('\n');

function clip(name, u) { var M = MOVES[name]; return moveplayer.clipPose(name, Math.max(0, Math.min(0.999, u)) * M.len); }
var S2R = Math.PI;
function poseFor(kind, b) {                                   /* b = beats into the shot (0..4) */
  var s = Math.sin(b * S2R), s2 = Math.sin(b * S2R * 2), stand = posemath.named('stand');
  switch (kind) {
    case 'bang': return posemath.layer(posemath.named('guard'), { 'spine.rx': 18 + 22 * Math.max(0, s2), 'head.rx': 10 + 38 * Math.max(0, s2), 'neck.rx': 14 * Math.max(0, s2), 'hip.y': -0.08 - 0.06 * Math.abs(s2), 'legA.k': 26, 'legB.k': 26, 'armA.sx': 150, 'armA.sz': 30, 'armA.e': 20 }, 1, 1, 1, 1);
    case 'strum': { var p = clip('counterBoom', 0.42); p['armB.e'] = (p['armB.e'] || 60) + 26 * Math.sin(b * S2R * 4); p['armB.w'] = 20 * Math.sin(b * S2R * 4); p['head.rx'] = 10 + 20 * Math.max(0, s2); p['hip.y'] = -0.05; return p; }
    case 'dance': return posemath.layer(stand, { 'hip.ry': 28 * s, 'hip.x': 0.08 * s, 'spine.ry': -14 * s, 'armA.sx': 70 + 50 * s2, 'armB.sx': 70 - 50 * s2, 'armA.sz': 30, 'armB.sz': 30, 'armA.e': 80, 'armB.e': 80, 'legA.k': 30 * Math.max(0, s2), 'legB.k': 30 * Math.max(0, -s2), 'legA.hx': 20 * Math.max(0, s2), 'legB.hx': 20 * Math.max(0, -s2), 'head.rx': 12 * s2, 'hip.y': -0.04 * Math.abs(s2) }, 1, 1, 1, 1);
    case 'punch': { var names = ['jab', 'cross', 'hook', 'uppercut'], n = names[Math.floor(b) % 4]; return clip(n, (b % 1) * 1.1); }
    case 'kick': return clip(Math.floor(b / 2) % 2 ? 'roundhouse' : 'kick', (b % 2) / 2);
    case 'smash': return clip('counterSmash', 0.25 + b / 4 * 0.6);
    case 'boom': return clip('counterBoom', 0.2 + b / 4 * 0.75);
    case 'whirl': return clip('counterWhirl', b / 4);
    case 'power': return posemath.layer(posemath.named('guard'), { 'armB.sx': 170, 'armB.sz': 10, 'armB.e': 10, 'head.rx': -12, 'spine.rx': -6, 'legA.hz': 14, 'legB.hz': 14 }, 1, 1, 1, 1);
    case 'ride': return posemath.named('ride');
  }
  return stand;
}

/* 16 shots, one bar each: pose, background pattern, palette, camera (angle round him, distance, height), copies, word */
var SHOTS = [
  { k: 'bang', bg: 1, pal: 7, ang: 0.3, d: 4.6, y: 1.0, n: 1, word: '' },
  { k: 'strum', bg: 0, pal: 0, ang: -0.5, d: 4.2, y: 1.1, n: 1, word: '' },
  { k: 'dance', bg: 3, pal: 1, ang: 0, d: 5.2, y: 1.0, n: 3, word: 'BHAAGO!' },
  { k: 'bang', bg: 2, pal: 2, ang: 0.8, d: 3.6, y: 1.3, n: 1, word: 'BHAAGO!' },
  { k: 'punch', bg: 4, pal: 3, ang: -1.2, d: 4.2, y: 1.0, n: 1, word: 'BHAAGO!' },
  { k: 'kick', bg: 0, pal: 4, ang: 1.3, d: 4.6, y: 0.9, n: 1, word: 'HAIWAAN!' },
  { k: 'smash', bg: 1, pal: 5, ang: -0.3, d: 4.8, y: 1.1, n: 1, word: '' },
  { k: 'dance', bg: 2, pal: 6, ang: 0, d: 6.0, y: 1.0, n: 5, word: 'AAYA AAYA AAYA RE' },
  { k: 'strum', bg: 3, pal: 7, ang: 0.4, d: 3.4, y: 1.4, n: 1, word: '' },
  { k: 'boom', bg: 1, pal: 0, ang: -0.6, d: 4.8, y: 1.0, n: 1, word: 'TOOFAN!' },
  { k: 'ride', bg: 4, pal: 1, ang: 1.3, d: 7.0, y: 0.9, n: 1, word: '', bike: true },
  { k: 'whirl', bg: 0, pal: 2, ang: 0.2, d: 5.0, y: 1.0, n: 1, word: '' },
  { k: 'punch', bg: 2, pal: 3, ang: 0.9, d: 3.8, y: 1.2, n: 3, word: 'DISHUM!' },
  { k: 'kick', bg: 3, pal: 4, ang: -1.0, d: 4.4, y: 0.9, n: 1, word: 'DHADAAM!' },
  { k: 'bang', bg: 4, pal: 5, ang: 0, d: 5.4, y: 1.0, n: 3, word: 'BHAAGO BHAAGO!' },
  { k: 'power', bg: 0, pal: 6, ang: 0.15, d: 4.4, y: 1.2, n: 1, word: 'TOOFAN', title: true }
];

function createIntro(renderer) {
  var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, 1, 0.05, 100), bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
  var U = { uT: { value: 0 }, uBeat: { value: 0 }, uMode: { value: 0 }, uAspect: { value: 1 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() } };
  var bgMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: BG_VS, fragmentShader: BG_FS, depthTest: false, depthWrite: false });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  /* silhouettes: black, with a neon edge drawn first a touch larger */
  var black = { skin: new THREE.MeshBasicMaterial({ color: 0x050505, skinning: true }), plain: new THREE.MeshBasicMaterial({ color: 0x050505 }) };
  var neon = { skin: new THREE.MeshBasicMaterial({ color: 0xffffff, skinning: true, depthWrite: false }), plain: new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }) };
  var figs = [], i;
  for (i = 0; i < 5; i++) { var rig = herorig.createHeroRig(), meshes = []; rig.root.traverse(function (m) { if (m.isMesh) meshes.push(m); }); scene.add(rig.root); figs.push({ rig: rig, meshes: meshes }); }
  var bike = bikevox.createBike(), bikeMeshes = []; bike.root.traverse(function (m) { if (m.isMesh) bikeMeshes.push(m); }); scene.add(bike.root);
  function paint(set) { figs.concat([{ meshes: bikeMeshes }]).forEach(function (f) { f.meshes.forEach(function (m) { m.material = m.isSkinnedMesh ? set.skin : set.plain; }); }); }
  var word = document.createElement('div');
  word.style.cssText = 'position:fixed;left:0;right:0;top:12%;z-index:41;text-align:center;pointer-events:none;font:900 clamp(34px,8vw,92px)/1 "Arial Black",Impact,system-ui,sans-serif;color:#fff;-webkit-text-stroke:3px #000;text-shadow:6px 6px 0 #000;letter-spacing:.02em;opacity:0;transition:opacity .08s';
  document.body.appendChild(word);
  var lastShot = -1, lastBeat = -1;

  return {
    BEATS: SHOTS.length * 4,
    /* draw the frame for `beat` beats into the video (time in seconds `t` for the background motion) */
    render: function (beat, t) {
      var w = renderer.domElement.clientWidth || 800, h = renderer.domElement.clientHeight || 600;
      var si = Math.min(SHOTS.length - 1, Math.floor(beat / 4)), S = SHOTS[si], b = beat - si * 4, P = PALS[S.pal];
      U.uT.value = t; U.uBeat.value = beat; U.uMode.value = S.bg; U.uAspect.value = w / h;
      U.uA.value.set(P[0]); U.uB.value.set(P[1]); U.uC.value.set(P[2]);
      /* the figures */
      var n = S.n, pose = poseFor(S.k, b);
      figs.forEach(function (f, k) {
        var on = k < n; f.rig.root.visible = on && !S.bike; if (!on) return;
        var off = n === 1 ? 0 : (k - (n - 1) / 2) * 1.5;
        f.rig.root.position.set(off, 0, Math.abs(off) * -0.6); f.rig.root.rotation.set(0, (n > 1 && k % 2 ? -1 : 1) * 0.0, 0);
        f.rig.applyPose(pose, { plant: true }); f.rig.flutter(t, 0.6);
      });
      bike.root.visible = !!S.bike;
      if (S.bike) {
        var f0 = figs[0]; f0.rig.root.visible = true; bike.pitch.add(f0.rig.root); f0.rig.root.position.set(bike.seat.x, bike.seat.y + 0.08 - 0.85, bike.seat.z); f0.rig.root.rotation.set(0, 0, 0);
        f0.rig.applyPose(pose, { plant: false }); f0.rig.flutter(t, 1);
        bike.root.rotation.y = 0; bike.root.position.set(0, 0, 0); bike.front.rotation.x -= 0.4; bike.rear.rotation.x -= 0.4; bike.lean.rotation.z = Math.sin(t * 2) * 0.08;
      } else if (figs[0].rig.root.parent !== scene) { scene.add(figs[0].rig.root); }
      /* the camera: round him at the shot's angle, pushing in slowly through the bar */
      var push = 1 - b * 0.03, a = S.ang + b * 0.04, d = S.d * push;
      cam.aspect = w / h; cam.fov = h > w ? 58 : 42; cam.updateProjectionMatrix();
      cam.position.set(Math.sin(a) * d, S.y + 0.4, Math.cos(a) * d); cam.lookAt(0, S.y, 0);
      /* the chant word, popping on the first beat of the shot */
      if (si !== lastShot) { lastShot = si; word.textContent = S.word; word.style.fontSize = S.title ? 'clamp(60px,17vw,180px)' : 'clamp(34px,9vw,92px)'; word.style.color = S.title ? '#ffd21f' : '#fff'; word.style.top = S.title ? '70%' : '12%'; }
      var fb = Math.floor(beat); if (fb !== lastBeat) { lastBeat = fb; word.style.transform = 'scale(1.18) rotate(-4deg)'; setTimeout(function () { word.style.transform = 'scale(1) rotate(-4deg)'; }, 90); }
      word.style.opacity = S.word ? 1 : 0;
      /* draw: background, neon edge, black silhouette */
      var ac = renderer.autoClear; renderer.autoClear = false; renderer.clear();
      renderer.render(bgScene, bgCam);
      neon.skin.color.set(P[2] === '#000000' ? '#ffffff' : P[2]); neon.plain.color.copy(neon.skin.color);
      paint(neon); figs.forEach(function (f) { f.rig.root.scale.setScalar(1.045); }); bike.root.scale.setScalar(1.03); renderer.render(scene, cam);
      renderer.clearDepth(); paint(black); figs.forEach(function (f) { f.rig.root.scale.setScalar(1); }); bike.root.scale.setScalar(1); renderer.render(scene, cam);
      renderer.autoClear = ac;
    },
    dispose: function () {
      word.remove(); bgMat.dispose(); [black.skin, black.plain, neon.skin, neon.plain].forEach(function (m) { m.dispose(); });
    }
  };
}

module.exports = { createIntro: createIntro, SHOTS: SHOTS };
