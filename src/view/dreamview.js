/* view: Toofan's nightmare, its own world (not the title video): a dark red void, everything in black silhouette with a burning edge, Maa
   drawn pale so she reads at once. An old mansion behind a tall iron gate, a trail of blood leading to it. Six shots on one clock:
   1 wide: the two-headed man hauling Maa toward the shut gate; 2 side on: the drag, his fist on her wrist, her heels skidding;
   3 front, tilted: Toofan running at us in slow motion, red after-images; 4 over his shoulder: the gate opens, he drags her through
   and up the drive; 5 beside the gate: it shuts, the chain snaps across, Toofan slams into the bars; 6 through the bars: Toofan
   left behind as she is pulled up the steps and the door shuts. Every shot frames its people whole, whatever the screen's shape.
   render(T) draws story time T; caption(T) is the line to show. Built for the scene, freed after. */
'use strict';

var herorig = require('./herorig');
var posemath = require('./posemath');

var BG_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
var BG_FS = [
  'uniform float uT; varying vec2 vUv;',
  'float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }',
  'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }',
  'void main(){',
  '  vec2 p = vUv; float m = n(p * 3.0 + vec2(uT * 0.08, -uT * 0.05)) * 0.6 + n(p * 7.0 - vec2(uT * 0.12, 0.0)) * 0.4;',
  '  vec3 top = vec3(0.10, 0.02, 0.06), mid = vec3(0.45, 0.04, 0.10), low = vec3(0.08, 0.02, 0.10);',
  '  vec3 col = mix(low, mix(mid, top, smoothstep(0.45, 1.0, p.y)), smoothstep(0.0, 0.5, p.y));',
  '  col += vec3(0.35, 0.08, 0.12) * m * smoothstep(0.1, 0.6, p.y) * 0.6;',
  '  col *= 1.0 - smoothstep(0.35, 0.95, length(p - 0.5)) * 0.8;',
  '  gl_FragColor = vec4(col, 1.0);',
  '}'].join('\n');

function createDream(renderer) {
  var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, 0.05, 120), bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
  var U = { uT: { value: 0 } }, bgMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: BG_VS, fragmentShader: BG_FS, depthTest: false, depthWrite: false });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  var black = { skin: new THREE.MeshBasicMaterial({ color: 0x050204, skinning: true }), plain: new THREE.MeshBasicMaterial({ color: 0x050204 }) };
  var pale = { skin: new THREE.MeshBasicMaterial({ color: 0xf2ece2, skinning: true }), plain: new THREE.MeshBasicMaterial({ color: 0xf2ece2 }) };
  var halo = { skin: new THREE.MeshBasicMaterial({ color: 0xffd9a0, skinning: true, depthWrite: false, transparent: true }), plain: new THREE.MeshBasicMaterial({ color: 0xffd9a0, depthWrite: false, transparent: true }) };
  var edge = { skin: new THREE.MeshBasicMaterial({ color: 0xff3a2a, skinning: true, depthWrite: false, transparent: true }), plain: new THREE.MeshBasicMaterial({ color: 0xff3a2a, depthWrite: false, transparent: true }) };
  var ember = new THREE.MeshBasicMaterial({ color: 0xff3a2a }), geos = [];
  function box(w, h, d) { var g = new THREE.BoxGeometry(w, h, d); geos.push(g); return g; }
  /* the people */
  function person(variant, scale, extra) {
    var rig = herorig.createHeroRig(variant), meshes = [];
    if (extra) extra(rig);
    rig.root.traverse(function (m) { if (m.isMesh) meshes.push(m); }); rig.root.scale.setScalar(scale); scene.add(rig.root);
    return { rig: rig, meshes: meshes, scale: scale };
  }
  var sariGeo = new THREE.CylinderGeometry(0.2, 0.38, 0.95, 10), headGeo = new THREE.SphereGeometry(0.16, 10, 8); geos.push(sariGeo, headGeo);
  var maa = person('thug', 0.95, function (rig) { var s = new THREE.Mesh(sariGeo, black.plain); s.position.set(0, 0.5, 0); rig.root.add(s); var veil = new THREE.Mesh(headGeo, black.plain); veil.scale.set(1.15, 1.2, 1.15); veil.position.set(0, 0.06, -0.02); rig.head.add(veil); });
  maa.pale = true;
  /* the two-headed man: big, his own head pushed to one side and a second head grown beside it on the same neck, both with burning eyes */
  var villain = person('thug', 1.45, function (rig) {
    rig.head.position.x -= 0.12;
    var h2 = new THREE.Mesh(box(0.27, 0.31, 0.29), black.plain); h2.position.set(rig.head.position.x + 0.27, rig.head.position.y + 0.16, rig.head.position.z); h2.rotation.z = -0.18; rig.neck.add(h2);
    var jaw = new THREE.Mesh(box(0.2, 0.08, 0.24), black.plain); jaw.position.set(0, -0.15, 0.02); h2.add(jaw);
    [[-0.06, 0.03], [0.06, 0.03]].forEach(function (e) {
      var a = new THREE.Mesh(box(0.05, 0.025, 0.02), ember); a.position.set(e[0], e[1], 0.15); a.userData.keep = true; h2.add(a);
      var b = new THREE.Mesh(box(0.05, 0.025, 0.02), ember); b.position.set(e[0], 0.17, 0.15); b.userData.keep = true; rig.head.add(b);
    });
  });
  var hero = person(undefined, 1.0);
  var all = [maa, villain, hero];

  /* the gate and the mansion behind it */
  var GZ = -7.0, world = new THREE.Group(); scene.add(world);
  function add(g, x, y, z, parent, m) { var o = new THREE.Mesh(g, m || black.plain); o.position.set(x, y, z); (parent || world).add(o); return o; }
  [-1.75, 1.75].forEach(function (x) { add(box(0.5, 3.4, 0.5), x, 1.7, GZ); add(box(0.62, 0.2, 0.62), x, 3.5, GZ); var orb = add(new THREE.SphereGeometry(0.22, 8, 6), x, 3.8, GZ); geos.push(orb.geometry); });
  add(box(7.4, 2.5, 0.35), -5.2, 1.25, GZ); add(box(7.4, 2.5, 0.35), 5.2, 1.25, GZ);
  for (var x = -8.7; x <= 8.7; x += 0.7) if (Math.abs(x) > 1.9) add(box(0.06, 0.4, 0.06), x, 2.7, GZ);                  /* spikes along the wall */
  function leaf(side) {
    var g = new THREE.Group(); g.position.set(side * -1.5, 0, GZ); world.add(g);
    for (var i = 0; i < 9; i++) { var bx = side * (0.09 + i * 0.165); add(box(0.05, 3.0, 0.05), bx, 1.5, 0, g); add(box(0.08, 0.2, 0.08), bx, 3.08, 0, g); }
    add(box(1.5, 0.08, 0.06), side * 0.75, 0.4, 0, g); add(box(1.5, 0.08, 0.06), side * 0.75, 2.6, 0, g); add(box(1.5, 0.08, 0.06), side * 0.75, 1.6, 0, g);
    var arc = add(new THREE.TorusGeometry(0.38, 0.035, 4, 12, Math.PI), side * 0.75, 2.6, 0, g); geos.push(arc.geometry);
    return g;
  }
  var leafL = leaf(1), leafR = leaf(-1);
  /* the old mansion: a wide body with a steep roof, a tower, chimneys, a few windows glowing like coals */
  var MZ = -17;
  add(box(11, 6, 4), 0, 3, MZ); add(box(4, 4.2, 3.4), -7, 2.1, MZ + 0.4);
  var r1 = add(box(11.6, 0.4, 3.1), 0, 7.0, MZ + 1.0); r1.rotation.x = 0.75; var r2 = add(box(11.6, 0.4, 3.1), 0, 7.0, MZ - 1.0); r2.rotation.x = -0.75;
  add(box(2.6, 11, 2.6), 4.2, 5.5, MZ + 0.6); var spire = add(new THREE.ConeGeometry(2.0, 3.4, 4), 4.2, 12.7, MZ + 0.6); spire.rotation.y = Math.PI / 4; geos.push(spire.geometry);
  add(box(0.6, 2.4, 0.6), -3.5, 8.0, MZ); add(box(0.6, 1.8, 0.6), -1.4, 7.8, MZ - 0.6);
  [[-4, 2], [-2, 2], [2, 2], [-4, 4.4], [2, 4.4], [0, 4.4], [4.2, 8.4], [-7, 2]].forEach(function (w, i) { var o = add(box(0.7, 1.1, 0.05), w[0], w[1], (w[0] === 4.2 ? MZ + 1.92 : (w[0] === -7 ? MZ + 2.12 : MZ + 2.03)), null, ember); o.userData.flick = i; });
  var dead = add(box(0.18, 3.2, 0.18), -3.2, 1.6, GZ + 1.6); dead.rotation.z = 0.12; var br1 = add(box(1.4, 0.1, 0.1), -2.7, 2.7, GZ + 1.6); br1.rotation.z = 0.6; var br2 = add(box(1.0, 0.08, 0.08), -3.7, 2.4, GZ + 1.6); br2.rotation.z = -0.7;
  var floor = new THREE.Mesh(new THREE.CircleGeometry(30, 40), new THREE.MeshBasicMaterial({ color: 0x1a0408, transparent: true, opacity: 0.85 })); floor.rotation.x = -Math.PI / 2; scene.add(floor); geos.push(floor.geometry);

  function paint(set, alt) { all.forEach(function (f) { var u = f.pale ? alt : set; f.meshes.forEach(function (m) { if (!m.userData.keep) m.material = m.isSkinnedMesh ? u.skin : u.plain; }); }); }
  var stand = posemath.named('stand');
  function place(f, x, z, ry, pose) { f.rig.root.position.set(x, 0, z); f.rig.root.rotation.y = ry; f.rig.applyPose(pose, { plant: true }); f.rig.root.visible = true; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function ease(u) { u = clamp01(u); return u * u * (3 - 2 * u); }
  var RT = new THREE.Vector3(), UP = new THREE.Vector3(), HV = new THREE.Vector3(), HM = new THREE.Vector3(), ghostTrail = [];
  var ghost = { skin: new THREE.MeshBasicMaterial({ color: 0xff2a1a, skinning: true, transparent: true, opacity: 0.2, depthWrite: false }), plain: new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.2, depthWrite: false }) };
  /* dust from her skidding heels (in the world group: drawn once, with the world) */
  var dustGeo = new THREE.PlaneGeometry(0.22, 0.14); geos.push(dustGeo);
  var dust = [0, 1, 2, 3, 4, 5].map(function () { var m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: 0x8a2a2a, transparent: true, opacity: 0.4, depthWrite: false })); world.add(m); return m; });
  /* a trail of blood on the ground, from where he starts, through the gate, up the drive to the door */
  var bloodM = new THREE.MeshBasicMaterial({ color: 0x5c0610 }), bloodG = new THREE.CircleGeometry(0.22, 7); geos.push(bloodG);
  for (var bz = 8; bz > -14.6; bz -= 0.85) { var bl = new THREE.Mesh(bloodG, bloodM); bl.rotation.x = -Math.PI / 2; var wob = Math.sin(bz * 1.7) * 0.25; bl.position.set(0.3 + wob, 0.012, bz); bl.scale.set(0.7 + (Math.abs(bz * 13) % 7) / 10, 1.2 + (Math.abs(bz * 7) % 5) / 6, 1); world.add(bl); }
  /* the mansion's door: a doorway that glows when it opens for them and goes black when it shuts; the steps up to it */
  for (var st = 0; st < 3; st++) add(box(3.0 - st * 0.4, 0.2, 0.5), 0, 0.1 + st * 0.2, MZ + 2.65 - st * 0.4);
  var doorM = new THREE.MeshBasicMaterial({ color: 0xff5a2a }), door = add(box(1.5, 2.6, 0.04), 0, 1.3 + 0.6, MZ + 2.03, null, doorM); door.visible = false;
  /* the chain and padlock that snap across the shut gate */
  var lockG = new THREE.Group(); lockG.position.set(0, 1.55, GZ + 0.08); world.add(lockG); lockG.visible = false;
  for (var c = 0; c < 9; c++) add(box(0.16, 0.06, 0.06), -0.64 + c * 0.16, Math.abs(c - 4) * -0.03, 0, lockG);
  add(box(0.26, 0.26, 0.1), 0, -0.25, 0.02, lockG);

  /* framing: the camera for a shot, looking along `dir`, pulled back until every point in `pts` sits inside the frame with a margin,
     whatever the screen's shape; `look` nudges the aim (up, down) after the fit */
  var FT = new THREE.Vector3(), FR = new THREE.Vector3(), FU = new THREE.Vector3(), FC = new THREE.Vector3(), FQ = new THREE.Vector3();
  function frame(dir, pts, fov, aspect, margin, minDist) {
    FT.set(dir[0], dir[1], dir[2]).normalize(); FR.crossVectors(FT, FQ.set(0, 1, 0)).normalize(); FU.crossVectors(FR, FT);
    FC.set(0, 0, 0); pts.forEach(function (p) { FC.add(p); }); FC.multiplyScalar(1 / pts.length);
    var tv = Math.tan(fov * Math.PI / 360) * margin, th = tv * aspect, d = minDist || 1;
    pts.forEach(function (p) {
      FQ.subVectors(p, FC); var x = Math.abs(FQ.dot(FR)), y = Math.abs(FQ.dot(FU)), z = FQ.dot(FT);
      d = Math.max(d, x / th - z, y / tv - z);
    });
    cam.fov = fov; cam.position.copy(FC).addScaledVector(FT, -d); cam.lookAt(FC);
  }
  /* a figure as points for framing: feet and head, a little round */
  function body(x, y, z, h) { return [new THREE.Vector3(x - 0.35, y, z - 0.3), new THREE.Vector3(x + 0.35, y, z + 0.3), new THREE.Vector3(x, y + h, z)]; }

  /* the story, by its own clock T (seconds since the dream began), in six shots */
  var SHOTS = [0, 3, 6, 9, 12, 14, 17];
  var LINES = ['BETA... TOOFAN...', '', 'MAA!', '', '', 'MAA... RUKO!'];
  function shotOf(T) { for (var k = 0; k < 6; k++) if (T < SHOTS[k + 1]) return k; return 5; }
  /* where things are at story time T */
  function villainZ(T) { return T < 9 ? lerp(-1.5, -6.3, T / 9) : (T < 12 ? lerp(-6.3, -10.2, (T - 9) / 3) : lerp(-10.2, -14.9, clamp01((T - 12) / 3.6))); }
  var ARRIVE = 13.6, BARS = GZ + 0.45;
  function heroZ(T) { return T < ARRIVE ? lerp(9.0, BARS, T / ARRIVE) : BARS; }
  return {
    LENGTH: SHOTS[6], cam: cam,
    caption: function (T) { var k = shotOf(T), t = T - SHOTS[k], len = SHOTS[k + 1] - SHOTS[k]; return t > 0.5 && len - t > 0.4 ? LINES[k] : ''; },
    /* draw the dream at story time T */
    render: function (T) {
      var w = renderer.domElement.clientWidth || 800, h = renderer.domElement.clientHeight || 600, aspect = w / h, tall = h > w, shot = shotOf(T), t = T - SHOTS[shot];
      var s = Math.sin(T * 1.3); U.uT.value = T;
      /* THE DRAG: he strides for the gate bent into it, his arm stretched back with her wrist in his fist (her hand is put exactly in his),
         one head turned back to her; she is hauled along leaning right back, heels dug in and skidding, her free arm flung back toward
         her son. Through the gate he hauls her faster, up the drive and the steps, and the door shuts on them. */
      var vz = villainZ(T), vx = 0.6, yank = Math.max(0, Math.sin(T * 2.6)) * 0.12, gone = T > 16.1;
      var stride = T < 9 ? T * 2.0 : 18 + (T - 9) * 3.0;
      place(villain, vx, vz, Math.PI, posemath.layer(posemath.walkPose(stride, 1.0), { 'spine.rx': 22, 'hip.rx': 6, 'head.rx': 4, 'head.ry': 28, 'neck.ry': 14,
        'armB.sx': -62, 'armB.sz': -8, 'armB.e': 4, 'armB.pr': 20, 'armA.sx': 25 + Math.sin(stride) * 20, 'armA.e': 50 }, 1, 1, 1, 1));
      villain.rig.root.position.y = vz < -14.2 ? (vz + 14.2) * -0.85 : 0;                             /* up the steps */
      var sk = Math.sin(T * 5.2);
      place(maa, 0, 0, Math.PI - 0.35, posemath.layer(stand, { 'spine.rx': -30 - yank * 60, 'hip.rx': -12, 'hip.y': -0.08, 'head.rx': -6, 'head.ry': 55, 'neck.ry': 25,
        'armA.sx': 92, 'armA.sz': 6, 'armA.e': 0, 'armA.pr': 0, 'armB.sx': -70 + sk * 6, 'armB.sz': 40, 'armB.e': 12,
        'legA.hx': 42 + sk * 6, 'legA.k': 6, 'legA.a': 22, 'legB.hx': -8 - sk * 6, 'legB.k': 38, 'legB.a': 10 }, 1, 1, 1, 1));
      villain.rig.root.updateMatrixWorld(true); maa.rig.root.updateMatrixWorld(true);
      villain.rig.parts.R.wrist.getWorldPosition(HV); maa.rig.parts.L.wrist.getWorldPosition(HM);
      maa.rig.root.position.set(HV.x - HM.x, villain.rig.root.position.y > 0 ? villain.rig.root.position.y * 0.7 : 0, HV.z - HM.z + yank * 0.4);
      villain.rig.root.visible = maa.rig.root.visible = !gone;
      var mx = maa.rig.root.position.x, mz = maa.rig.root.position.z;
      dust.forEach(function (d, k) {
        var a = ((T * 1.7 + k * 0.37) % 1); d.position.set(mx + (k % 2 ? 0.12 : -0.12) + (k % 3 - 1) * 0.1, 0.05 + a * 0.35, mz + 0.25 + a * 0.5);
        d.scale.setScalar(0.4 + a * 1.2); d.material.opacity = gone ? 0 : 0.55 * (1 - a);
      });
      /* the gate opens as they reach it, shuts behind them before he gets there; the chain snaps across it */
      var open = ease((T - 8.3) / 1.0) * (1 - ease((T - 12.0) / 0.7));
      leafL.rotation.y = open * 1.35; leafR.rotation.y = -open * 1.35; lockG.visible = T > 12.8;
      door.visible = T > 14.3 && T < 16.2;
      /* TOOFAN, in slow motion all the way: a long heavy all-out stride at a third of the speed, arms pumping, red after-images trailing.
         He comes up to the gate just after it shuts and throws himself on the bars, gripping them, an arm reaching through after her. */
      var hz = heroZ(T), hx = 0.1, ph = T * 1.9, atBars = T >= ARRIVE, hit = clamp01((T - ARRIVE) / 0.35);
      function runPose(q) { return posemath.layer(posemath.walkPose(q, 2.9), { 'spine.rx': 24, 'head.rx': -16, 'armA.sx': 55 + Math.sin(q) * 65, 'armA.e': 85,
        'armB.sx': 55 - Math.sin(q) * 65, 'armB.e': 85, 'hip.y': -0.06 + Math.abs(Math.sin(q)) * 0.1 }, 1, 1, 1, 1); }
      var heroPose = atBars ? posemath.layer(stand, { 'spine.rx': 12 - hit * 4, 'head.rx': T > 15.3 ? -8 : 14, 'armA.sx': T > 14.8 ? 92 : 115, 'armA.sz': 8, 'armA.e': T > 14.8 ? 0 : 55,
        'armB.sx': 118, 'armB.sz': 10, 'armB.e': 50, 'legA.hx': 18, 'legA.k': 22, 'legB.hx': -12, 'legB.k': 10 }, 1, 1, 1, 1) : runPose(ph);
      var hy = atBars ? 0 : Math.abs(Math.sin(ph)) * 0.16;
      place(hero, hx + (atBars ? Math.sin(T * 30) * 0.015 * (1 - hit) : 0), hz, Math.PI, heroPose); hero.rig.root.position.y = hy; hero.rig.flutter(T * 0.35, 0);
      ghostTrail = atBars ? [] : [0.3, 0.6, 0.9].map(function (lag) { var tq = T - lag; return { z: heroZ(tq), ph: tq * 1.9, y: Math.abs(Math.sin(tq * 1.9)) * 0.16 }; });
      world.children.forEach(function (o) { if (o.userData.flick !== undefined) o.material = ember; });

      /* ---- the six shots ---- */
      var roll = 0, Gp = function (x, y, z) { return new THREE.Vector3(x, y, z); };
      if (shot === 0) {            /* 1. wide and low: the mansion behind the shut gate, the blood trail, him hauling her toward it */
        frame([-0.18, 0.08, -1], [Gp(-6, 0, MZ + 2), Gp(6, 0, MZ + 2), Gp(4.2, 14.4, MZ + 0.6), Gp(-2.6, 0, GZ), Gp(2.6, 0, GZ)].concat(body(vx, 0, vz, 2.6), body(mx, 0, mz, 1.7)), tall ? 62 : 46, aspect, 0.92, 4);
        cam.position.y = Math.max(0.6, cam.position.y - 1.2); cam.lookAt(FC.x, FC.y + 1.0, FC.z); roll = -0.03;
      } else if (shot === 1) {     /* 2. side on, medium, tracking: the drag in profile, his fist on her wrist in the middle */
        frame([-1, -0.04, -0.12], body(vx, 0, vz, 2.75).concat(body(mx, 0, mz, 1.75)), 40, aspect, 0.8, 3);
        roll = -0.04;
      } else if (shot === 2) {     /* 3. in front of him, low, tilted, slow motion: running at us, the after-images behind */
        frame([0.22, 0.2, 1], body(hx, hy, hz, 1.9).concat(body(hx, 0, hz + 0.6, 1.9)), 44, aspect, 0.82, 2.4);
        roll = 0.13 + Math.sin(t * 0.6) * 0.02;
      } else if (shot === 3) {     /* 4. over his shoulder, long lens: the gate opens, he drags her through and up the drive */
        frame([0.55, -0.05, -1], [Gp(hx - 0.4, 1.0, hz), Gp(hx + 0.4, 2.0, hz), Gp(-2.0, 0, GZ), Gp(2.0, 3.9, GZ)].concat(body(vx, 0, vz, 2.6), body(mx, 0, mz, 1.7)), 30, aspect, 0.9, 2.2);
        roll = 0.03;
      } else if (shot === 4) {     /* 5. beside the gate, low: it swings shut, the chain snaps across, he slams into the bars */
        frame([-1, -0.04, -0.5], [Gp(-2.0, 0, GZ), Gp(2.0, 4.0, GZ)].concat(body(hx, 0, hz, 1.95)), 44, aspect, 0.85, 3);
        roll = -0.05;
      } else {                     /* 6. through the bars, left behind: him gripping them, far off she is pulled up the steps and the door shuts */
        frame([-0.12, -0.02, -1], body(hx, 0, hz, 1.95).concat([Gp(-1.8, 0, MZ + 2.6), Gp(1.8, 4.0, MZ + 2.6)]), 34, aspect, 0.88, 2.2);
        roll = 0.02;
      }
      cam.aspect = aspect; cam.updateProjectionMatrix(); cam.rotateZ(roll);
      dust.forEach(function (d) { d.quaternion.copy(cam.quaternion); });
      var ac = renderer.autoClear; renderer.autoClear = false; renderer.clear();
      renderer.render(bgScene, bgCam);
      /* the after-images: Toofan's run a moment ago, faint and red, drawn first (behind everything of this moment) */
      if (ghostTrail.length) {
        var keepP = hero.rig.root.position.clone();
        all.forEach(function (f) { f.rig.root.visible = f === hero; }); world.visible = false;
        hero.meshes.forEach(function (m) { if (!m.userData.keep) m.material = m.isSkinnedMesh ? ghost.skin : ghost.plain; });
        ghostTrail.slice().reverse().forEach(function (g2, k) {
          ghost.skin.opacity = ghost.plain.opacity = 0.12 + k * 0.08;
          hero.rig.root.position.set(hx, g2.y, g2.z); hero.rig.applyPose(runPose(g2.ph), { plant: true }); hero.rig.root.position.y = g2.y; renderer.render(scene, cam);
        });
        hero.rig.root.position.copy(keepP); hero.rig.applyPose(heroPose, { plant: true }); hero.rig.root.position.y = hy;
        all.forEach(function (f) { f.rig.root.visible = f !== hero ? !gone : true; }); world.visible = true;
        renderer.clearDepth();
      }
      /* the burning edge (edge materials are 'transparent', so they come after the black world, and the world's depth stays so nobody
         shows through a wall), then the black bodies over it with the world left out (drawn again it would paint over the edge) */
      cam.updateMatrixWorld(); RT.setFromMatrixColumn(cam.matrixWorld, 0); UP.setFromMatrixColumn(cam.matrixWorld, 1);
      var px = 0.0016 * cam.position.distanceTo(FC) * cam.fov / 45 + 0.012;            /* (the outline about the same few pixels whatever the shot) */
      paint(edge, halo);
      [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]].forEach(function (d, i) {
        all.forEach(function (f) { f.rig.root.position.addScaledVector(RT, d[0] * px).addScaledVector(UP, d[1] * px); });
        world.visible = i === 0; renderer.render(scene, cam);
        all.forEach(function (f) { f.rig.root.position.addScaledVector(RT, -d[0] * px).addScaledVector(UP, -d[1] * px); });
      });
      world.visible = false; paint(black, pale); renderer.render(scene, cam); world.visible = true;
      renderer.autoClear = ac;
    },
    dispose: function () {
      bgMat.dispose(); [black.skin, black.plain, edge.skin, edge.plain, pale.skin, pale.plain, halo.skin, halo.plain, ember, ghost.skin, ghost.plain, bloodM, doorM].forEach(function (m) { m.dispose(); }); dust.forEach(function (d) { d.material.dispose(); });
      geos.forEach(function (g) { g.dispose(); }); floor.material.dispose();
    }
  };
}

module.exports = { createDream: createDream };
