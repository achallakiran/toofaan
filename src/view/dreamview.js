/* view: Toofan's nightmare, its own world (not the title video). A dark red void with drifting mist, and in it, all in black silhouette
   with a burning edge: an old mansion behind a tall closed iron gate, and the two-headed man dragging Maa toward it. Maa is drawn pale
   and glowing (white hair, white sari) so she reads at once; she is pulled along backwards, reaching for her son. Toofan runs after them
   in slow motion and never gets closer: the gate swings open, they pass through, and it shuts in front of him. One continuous story told
   in three shots (shot 0, 1, 2; `t` is the time within the shot); every motion is slow, so it can be followed. Built for the scene, freed after. */
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
  /* the story, by its own clock T (the three shots run on from one another: 0-4, 4-8, 8-11) */
  var START = [0, 4.0, 8.0], RT = new THREE.Vector3(), UP = new THREE.Vector3(), HV = new THREE.Vector3(), HM = new THREE.Vector3(), ghostTrail = [];
  var ghost = { skin: new THREE.MeshBasicMaterial({ color: 0xff2a1a, skinning: true, transparent: true, opacity: 0.2, depthWrite: false }), plain: new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.2, depthWrite: false }) };
  /* dust from her skidding heels */
  var dustGeo = new THREE.PlaneGeometry(0.22, 0.14); geos.push(dustGeo);
  var dust = [0, 1, 2, 3, 4, 5].map(function () { var m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: 0x8a2a2a, transparent: true, opacity: 0.4, depthWrite: false })); m.userData.dust = true; world.add(m); return m; });    /* (in the world group: drawn once, with the world) */
  return {
    /* draw shot `shot` at time t (seconds since that shot began) */
    render: function (shot, t) {
      var w = renderer.domElement.clientWidth || 800, h = renderer.domElement.clientHeight || 600, T = START[shot] + t, s = Math.sin(T * 1.3);
      U.uT.value = T;
      /* THE DRAG. He strides to the gate, bent forward into it, his pulling arm stretched back behind him with her wrist in his fist; one of
         his heads turned back to her. She is hauled along behind him: leaning right back against the pull, her heels dug in and skidding,
         her held arm stretched out straight to his fist, her free arm flung back toward her son, her head turned to him. Her hand is put
         exactly in his: she is placed so that her wrist meets his. Every few steps she stumbles and is yanked on. */
      var vz = -1.0 - T * 0.62, vx = 0.6, yank = Math.max(0, Math.sin(T * 2.6)) * 0.12;
      place(villain, vx, vz, Math.PI, posemath.layer(posemath.walkPose(T * 2.0, 1.0), { 'spine.rx': 22, 'hip.rx': 6, 'head.rx': 4, 'head.ry': 28, 'neck.ry': 14,
        'armB.sx': -62, 'armB.sz': -8, 'armB.e': 4, 'armB.pr': 20, 'armA.sx': 25 + Math.sin(T * 2.0) * 20, 'armA.e': 50 }, 1, 1, 1, 1));
      var sk = Math.sin(T * 5.2);
      var mpose = posemath.layer(stand, { 'spine.rx': -30 - yank * 60, 'hip.rx': -12, 'hip.y': -0.08, 'head.rx': -6, 'head.ry': 55, 'neck.ry': 25,
        'armA.sx': 92, 'armA.sz': 6, 'armA.e': 0, 'armA.pr': 0, 'armB.sx': -70 + sk * 6, 'armB.sz': 40, 'armB.e': 12,
        'legA.hx': 42 + sk * 6, 'legA.k': 6, 'legA.a': 22, 'legB.hx': -8 - sk * 6, 'legB.k': 38, 'legB.a': 10 }, 1, 1, 1, 1);
      place(maa, 0, 0, Math.PI - 0.35, mpose);
      villain.rig.root.updateMatrixWorld(true); maa.rig.root.updateMatrixWorld(true);
      villain.rig.parts.R.wrist.getWorldPosition(HV); maa.rig.parts.L.wrist.getWorldPosition(HM);
      maa.rig.root.position.set(HV.x - HM.x, 0, HV.z - HM.z + yank * 0.4);                     /* her hand in his fist */
      var mx = maa.rig.root.position.x, mz = maa.rig.root.position.z;
      dust.forEach(function (d, k) {                                          /* her heels skid: dust kicked up behind them */
        var a = ((T * 1.7 + k * 0.37) % 1); d.position.set(mx + (k % 2 ? 0.12 : -0.12) + (k % 3 - 1) * 0.1, 0.05 + a * 0.35, mz + 0.25 + a * 0.5);
        d.scale.setScalar(0.4 + a * 1.2); d.material.opacity = 0.55 * (1 - a);
      });
      /* the gate swings open as they reach it and shuts behind them, in front of him */
      var open = clamp01((T - 5.4) / 1.4) * (1 - clamp01((T - 9.8) / 0.9));
      leafL.rotation.y = open * 1.35; leafR.rotation.y = -open * 1.35;
      /* TOOFAN, in slow motion: the long heavy stride of a man running all out, at a third of the speed, leaning into it, arms pumping, the
         reaching arm thrown forward at the end; he gains nothing on them. Red after-images trail him. */
      var hz = 4.6 - T * 0.42, hx = -0.3, ph = T * 1.55;
      function runPose(q) { return posemath.layer(posemath.walkPose(q, 2.9), { 'spine.rx': 24, 'head.rx': -16, 'armA.sx': T > 8.4 ? 125 : 55 + Math.sin(q) * 65, 'armA.e': T > 8.4 ? 6 : 85,
        'armB.sx': 55 - Math.sin(q) * 65, 'armB.e': 85, 'hip.y': -0.06 + Math.abs(Math.sin(q)) * 0.1 }, 1, 1, 1, 1); }
      var hy = Math.abs(Math.sin(ph)) * 0.16;
      place(hero, hx, hz, Math.PI, runPose(ph)); hero.rig.root.position.y = hy; hero.rig.flutter(T * 0.35, 0);
      ghostTrail = [0.32, 0.64, 0.96].map(function (lag) { return { z: hz + lag * 0.42 * 1.6, ph: ph - lag * 1.55 * 1.6, y: Math.abs(Math.sin(ph - lag * 2.5)) * 0.16 }; });
      world.children.forEach(function (o) { if (o.userData.flick !== undefined) o.material = ember; });
      var roll = 0;
      if (shot === 0) {                              /* side on and low: him hauling her toward the gate by the wrist */
        cam.position.set(vx + 5.4, 1.15, vz + 0.9 - t * 0.1); cam.lookAt(vx - 0.4, 1.35, vz - 0.9); cam.fov = 44; roll = -0.05;      /* side on: the pull reads in profile */
      } else if (shot === 1) {                       /* Max Payne: low and tilted, tracking beside him as he runs in slow motion, the two of them far ahead at the gate */
        var tall = h > w, aimT = tall ? 0.85 : 0.72;                       /* aim between him and them (on a tall phone screen, on him) */
        var ax = hx + (vx - hx) * (1 - aimT), az = hz + (vz - hz) * (1 - aimT);
        cam.position.set(hx + 5.6, 0.8, hz - 0.4); cam.lookAt(ax, 1.2, az); cam.fov = 56; roll = 0.13 + Math.sin(t * 0.6) * 0.02;
      } else {                                        /* the long lens over his shoulder: they pass through, the gate shuts in front of him */
        cam.position.set(hx + 0.75, 1.6, hz + 1.5); cam.lookAt(0.2, 1.4, -7.5); cam.fov = 24; roll = 0.05;
      }
      cam.rotateZ(roll);
      dust.forEach(function (d) { d.quaternion.copy(cam.quaternion); });
      cam.aspect = w / h; if (h > w) cam.fov *= 1.35; cam.updateProjectionMatrix();
      var ac = renderer.autoClear; renderer.autoClear = false; renderer.clear();
      renderer.render(bgScene, bgCam);
      /* the burning edge is drawn over the gate and the mansion (edge materials are 'transparent', so they come after the black world; the
         world's depth stays, so nobody shows through the wall), then the black bodies over it */
      /* the after-images: Toofan's run a moment ago, faint and red, drawn first (behind everything of this moment) */
      var keepP = hero.rig.root.position.clone();
      all.forEach(function (f) { f.rig.root.visible = f === hero; }); world.visible = false;
      hero.meshes.forEach(function (m) { if (!m.userData.keep) m.material = m.isSkinnedMesh ? ghost.skin : ghost.plain; });
      ghostTrail.slice().reverse().forEach(function (g2, k) {
        ghost.skin.opacity = ghost.plain.opacity = 0.12 + k * 0.08;
        hero.rig.root.position.set(hx, g2.y, g2.z); hero.rig.applyPose(runPose(g2.ph), { plant: true }); hero.rig.root.position.y = g2.y; renderer.render(scene, cam);
      });
      hero.rig.root.position.copy(keepP); hero.rig.applyPose(runPose(ph), { plant: true }); hero.rig.root.position.y = hy;
      all.forEach(function (f) { f.rig.root.visible = true; }); world.visible = true;
      renderer.clearDepth();
      cam.updateMatrixWorld(); RT.setFromMatrixColumn(cam.matrixWorld, 0); UP.setFromMatrixColumn(cam.matrixWorld, 1);
      paint(edge, halo);
      [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]].forEach(function (d, i) {   /* the outline: the figure nudged round on screen */
        all.forEach(function (f) { var k = 0.03 * f.scale; f.rig.root.position.addScaledVector(RT, d[0] * k).addScaledVector(UP, d[1] * k); });
        world.visible = i === 0; renderer.render(scene, cam);
        all.forEach(function (f) { var k = 0.03 * f.scale; f.rig.root.position.addScaledVector(RT, -d[0] * k).addScaledVector(UP, -d[1] * k); });
      });
      world.visible = false; paint(black, pale); renderer.render(scene, cam); world.visible = true;     /* (the world is drawn once: drawn again it would paint over the outline) */
      renderer.autoClear = ac;
    },
    dispose: function () {
      bgMat.dispose(); [black.skin, black.plain, edge.skin, edge.plain, pale.skin, pale.plain, halo.skin, halo.plain, ember, ghost.skin, ghost.plain].forEach(function (m) { m.dispose(); }); dust.forEach(function (d) { d.material.dispose(); });
      geos.forEach(function (g) { g.dispose(); }); floor.material.dispose();
    }
  };
}

module.exports = { createDream: createDream };
