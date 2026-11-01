/* view: Toofan's nightmare, its own world (not the title video). A dark red void with drifting mist, broken pieces of his childhood
   home floating in it, and the people of that night as black silhouettes with a burning edge: Maa calling for him with open arms, his
   father falling to his knees, a tall shadow standing over them with a glowing "?" where a face should be (Taka), and the boy Toofan
   running and never getting closer. Three shots, picked by `shot` (0, 1, 2); `t` drives the slow motion. Built for the scene, freed after. */
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
  var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, 0.05, 80), bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
  var U = { uT: { value: 0 } }, bgMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: BG_VS, fragmentShader: BG_FS, depthTest: false, depthWrite: false });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  var black = { skin: new THREE.MeshBasicMaterial({ color: 0x050204, skinning: true }), plain: new THREE.MeshBasicMaterial({ color: 0x050204 }) };
  var edge = { skin: new THREE.MeshBasicMaterial({ color: 0xff3a2a, skinning: true, depthWrite: false }), plain: new THREE.MeshBasicMaterial({ color: 0xff3a2a, depthWrite: false }) };
  /* the people: Maa (with a long sari silhouette), the father, the shadow, the boy */
  function person(scale, extra) {
    var rig = herorig.createHeroRig('thug'), meshes = [];
    if (extra) extra(rig);
    rig.root.traverse(function (m) { if (m.isMesh) meshes.push(m); }); rig.root.scale.setScalar(scale); scene.add(rig.root);
    return { rig: rig, meshes: meshes, scale: scale };
  }
  var sariGeo = new THREE.CylinderGeometry(0.2, 0.38, 0.95, 10), headGeo = new THREE.SphereGeometry(0.16, 10, 8), qGeo = new THREE.TorusGeometry(0.16, 0.05, 6, 14, Math.PI * 1.4);
  var maa = person(0.95, function (rig) { var s = new THREE.Mesh(sariGeo, black.plain); s.position.set(0, 0.5, 0); rig.root.add(s); var veil = new THREE.Mesh(headGeo, black.plain); veil.scale.set(1.15, 1.2, 1.15); veil.position.set(0, 0.06, -0.02); rig.head.add(veil); });
  var father = person(1.0);
  var shadow = person(1.35, function (rig) { var q = new THREE.Mesh(qGeo, new THREE.MeshBasicMaterial({ color: 0xff2a1a })), dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), q.material); q.position.set(0.02, 0.32, 0.3); q.rotation.z = -0.6; dot.position.set(0, 0.06, 0.3); q.userData.keep = dot.userData.keep = true; rig.head.add(q); rig.head.add(dot); });
  var boy = person(0.6);
  var all = [maa, father, shadow, boy];
  /* pieces of the old home floating in the void: a door frame, a window, a broken wall, a fallen chair */
  var debris = new THREE.Group(), dm = new THREE.MeshBasicMaterial({ color: 0x14060a });
  [[-3, 1.4, -6, 0.15, 2.2, 0.15], [-2.0, 1.4, -6, 0.15, 2.2, 0.15], [-2.5, 2.5, -6, 1.15, 0.15, 0.15], [3.2, 2.2, -7, 1.4, 1.0, 0.1], [2.6, 0.3, -4.5, 1.8, 0.6, 0.12], [-1.2, 3.4, -8, 2.2, 0.15, 0.15], [1.2, 0.2, -2.6, 0.5, 0.4, 0.5]].forEach(function (b) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(b[3], b[4], b[5]), dm); m.position.set(b[0], b[1], b[2]); m.rotation.z = (b[0] * 0.13) % 0.4; debris.add(m);
  });
  scene.add(debris);
  var floor = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0x1a0408, transparent: true, opacity: 0.85 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  function paint(set) { all.forEach(function (f) { f.meshes.forEach(function (m) { if (!m.userData.keep) m.material = m.isSkinnedMesh ? set.skin : set.plain; }); }); }
  var stand = posemath.named('stand');
  function place(f, x, z, ry, pose) { f.rig.root.position.set(x, 0, z); f.rig.root.rotation.y = ry; f.rig.applyPose(pose, { plant: true }); f.rig.root.visible = true; }
  return {
    /* draw shot `shot` at time t (seconds since the dream began) */
    render: function (shot, t) {
      var w = renderer.domElement.clientWidth || 800, h = renderer.domElement.clientHeight || 600, s = Math.sin(t * 2);
      U.uT.value = t; all.forEach(function (f) { f.rig.root.visible = false; });
      debris.children.forEach(function (m, i) { m.position.y += Math.sin(t * 0.8 + i) * 0.002; m.rotation.y = t * 0.1 * (i % 2 ? 1 : -1); });
      if (shot === 0) {                              /* Maa calling for him, arms open, the boy reaching */
        place(maa, 0, -2.5, 0, posemath.layer(stand, { 'armA.sx': 70 + s * 8, 'armB.sx': 70 - s * 8, 'armA.sz': 45, 'armB.sz': 45, 'armA.e': 15, 'armB.e': 15, 'head.rx': -8 }, 1, 1, 1, 1));
        place(boy, 0.2, 0.6, Math.PI, posemath.layer(stand, { 'armA.sx': 100, 'armA.sz': 10, 'armB.sx': 30, 'spine.rx': 12 }, 1, 1, 1, 1));
        cam.position.set(0.9 - t * 0.05, 1.0, 2.6 - t * 0.08); cam.lookAt(0, 1.1, -2);
      } else if (shot === 1) {                       /* the father falls to his knees; the shadow stands over him */
        var k = Math.min(1, t / 1.2);
        place(father, 0, -1.2, 0.3, posemath.layer(stand, { 'legA.hx': 70 * k, 'legB.hx': 70 * k, 'legA.k': 110 * k, 'legB.k': 110 * k, 'hip.y': -0.45 * k, 'spine.rx': 30 * k, 'head.rx': 25 * k, 'armA.sx': 20, 'armB.sx': 20 }, 1, 1, 1, 1));
        place(shadow, 0.3, -2.6, Math.PI * 0.95, posemath.layer(stand, { 'head.rx': 15, 'armA.sz': 15, 'armB.sz': 15 }, 1, 1, 1, 1));
        cam.position.set(-1.6 + t * 0.1, 0.6, 1.6); cam.lookAt(0.2, 1.4, -2.2);
      } else {                                        /* the boy running toward them and never getting closer */
        var ph = t * 9;
        place(boy, 0, 0.5, Math.PI, posemath.walkPose(ph, 2.0));
        place(maa, -0.9, -5, 0, posemath.layer(stand, { 'armA.sx': 70, 'armA.sz': 45, 'armB.sx': 70, 'armB.sz': 45 }, 1, 1, 1, 1));
        place(shadow, 1.0, -5.6, 0, stand);
        cam.position.set(0.0, 0.9, 2.2 + Math.sin(t * 9) * 0.02); cam.lookAt(0, 0.8, -3);
      }
      cam.aspect = w / h; cam.fov = h > w ? 60 : 45; cam.updateProjectionMatrix();
      var ac = renderer.autoClear; renderer.autoClear = false; renderer.clear();
      renderer.render(bgScene, bgCam);
      paint(edge); all.forEach(function (f) { f.rig.root.scale.setScalar(f.scale * 1.04); }); renderer.render(scene, cam);
      renderer.clearDepth(); paint(black); all.forEach(function (f) { f.rig.root.scale.setScalar(f.scale); }); renderer.render(scene, cam);
      renderer.autoClear = ac;
    },
    dispose: function () {
      bgMat.dispose(); [black.skin, black.plain, edge.skin, edge.plain, dm].forEach(function (m) { m.dispose(); });
      debris.children.forEach(function (m) { m.geometry.dispose(); }); sariGeo.dispose(); headGeo.dispose(); qGeo.dispose(); floor.geometry.dispose();
    }
  };
}

module.exports = { createDream: createDream };
