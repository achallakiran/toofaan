/* view: Raka, Toofan's dog. A desi street dog in fine voxels (4 cm): tan coat with a pale belly and muzzle, pointed ears, a tail curled
   over the back. Separate parts (body, head, tail, four legs) so he can trot, sit, wag, bark and lick. Forward is local +z; the root sits
   on the ground. Built when a scene needs him, freed with it. */
'use strict';

var vg = require('./voxgrid');
var h = vg.hex, VS = 0.04;
var C = { tan: h('#c8935a'), tanD: h('#a8763f'), tanL: h('#d9a86e'), belly: h('#ecd6aa'), muzzle: h('#e4c592'), nose: h('#1a1410'), eye: h('#120d0a'), earIn: h('#8a5a3a'), tongue: h('#e8707f'), collar: h('#c8202a'), tag: h('#ffd21f') };

function mesh(g, pivot, mat) {
  var a = vg.meshGrid(g, pivot, VS, { jitter: 0.06, seed: g.W * 7 + g.D }), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); geo.setIndex(new THREE.BufferAttribute(a.indices, 1)); geo.computeBoundingSphere();
  return new THREE.Mesh(geo, mat);
}
function body() {
  var g = vg.createGrid(9, 9, 18);
  vg.ellipsoid(g, 4, 4.5, 9, 3.6, 3.4, 8.4, function (x, y, z) { return y < 3 ? C.belly : (y > 6 && x % 3 === 1 ? C.tanD : C.tan); });
  vg.box(g, 2, 5, 15, 6, 8, 17, C.tan);                                  /* the neck rising to the head */
  vg.box(g, 2, 6, 15, 6, 6, 16, C.collar); vg.set(g, 4, 5, 17, C.tag);
  return g;
}
function head() {
  var g = vg.createGrid(8, 11, 11), x;
  vg.box(g, 1, 2, 2, 6, 7, 7, C.tan); vg.box(g, 2, 7, 3, 5, 7, 6, C.tanL);
  vg.box(g, 2, 1, 7, 5, 4, 10, C.muzzle); vg.box(g, 3, 3, 10, 4, 4, 10, C.nose); vg.box(g, 2, 1, 7, 5, 1, 9, C.muzzle);
  vg.set(g, 2, 5, 7, C.eye); vg.set(g, 5, 5, 7, C.eye);
  for (x = 0; x < 3; x++) { vg.box(g, 1 + x * 0, 8 + x, 3, 2, 8 + x, 4 - (x > 1 ? 1 : 0), x === 2 ? C.tanD : C.tan); vg.box(g, 5, 8 + x, 3, 6, 8 + x, 4 - (x > 1 ? 1 : 0), x === 2 ? C.tanD : C.tan); }
  vg.set(g, 1, 9, 4, C.earIn); vg.set(g, 6, 9, 4, C.earIn);
  return g;
}
function tongue() { var g = vg.createGrid(2, 1, 3); vg.box(g, 0, 0, 0, 1, 0, 2, C.tongue); return g; }
function tail() {
  var g = vg.createGrid(3, 9, 6), pts = [[1, 0, 0], [1, 1, 0], [1, 2, 1], [1, 3, 1], [1, 4, 2], [1, 5, 3], [1, 6, 4], [1, 6, 5], [1, 5, 5]], i;
  for (i = 0; i < pts.length; i++) { vg.set(g, pts[i][0], pts[i][1], pts[i][2], i > 6 ? C.belly : C.tan); vg.set(g, pts[i][0] + 1, pts[i][1], pts[i][2], C.tanD); }
  return g;
}
function leg(front) { var g = vg.createGrid(2, 8, 3); vg.box(g, 0, 1, 0, 1, 7, 1, C.tan); vg.box(g, 0, 0, 0, 1, 1, 2, C.belly); if (front) vg.box(g, 0, 5, 0, 1, 7, 1, C.tanL); return g; }

function createDog() {
  var mat = new THREE.MeshLambertMaterial({ vertexColors: true }), root = new THREE.Group(), torso = new THREE.Group();
  root.add(torso); torso.position.y = 0.3;
  var B = mesh(body(), { x: 4.5, y: 4.5, z: 9 }, mat); torso.add(B);
  var neck = new THREE.Group(); neck.position.set(0, 0.16, 0.3); torso.add(neck);
  var H = mesh(head(), { x: 4, y: 4, z: 3 }, mat), headG = new THREE.Group(); headG.add(H); neck.add(headG); headG.position.set(0, 0.06, 0.06);
  var T = mesh(tongue(), { x: 1, y: 0.5, z: 0 }, mat); T.position.set(0, -0.11, 0.26); T.visible = false; headG.add(T);
  var tailG = new THREE.Group(); tailG.position.set(0, 0.12, -0.32); tailG.add(mesh(tail(), { x: 1.5, y: 0, z: 0.5 }, mat)); tailG.children[0].rotation.y = Math.PI; torso.add(tailG);
  var legs = [[-0.09, 0.22, true], [0.09, 0.22, true], [-0.09, -0.24, false], [0.09, -0.24, false]].map(function (q) {
    var gq = new THREE.Group(); gq.position.set(q[0], 0.02, q[1]); var m = mesh(leg(q[2]), { x: 1, y: 7.5, z: 1 }, mat); gq.add(m); torso.add(gq); return gq;
  });
  var shadow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; shadow.scale.set(0.7, 1.4, 1); root.add(shadow);
  return {
    root: root, head: headG,
    /* pose him: state 'stand' | 'walk' | 'sit' | 'lick' | 'bark' | 'sleep'; t seconds (drives the gait and the wag) */
    pose: function (state, t) {
      var walk = state === 'walk', sit = state === 'sit' || state === 'lick' || state === 'bark', sleep = state === 'sleep', i;
      torso.position.y = sleep ? 0.12 : 0.3; torso.rotation.x = sit ? -0.45 : 0; torso.rotation.z = sleep ? 1.35 : 0;
      for (i = 0; i < 4; i++) {
        var front = i < 2, ph = (i === 0 || i === 3 ? 0 : Math.PI);
        legs[i].rotation.x = walk ? Math.sin(t * 12 + ph) * 0.55 : (sit ? (front ? 0.45 : -1.2) : 0);
        legs[i].position.y = sit && !front ? 0.06 : 0.02;
      }
      tailG.rotation.y = Math.sin(t * (state === 'stand' || walk ? 14 : 20)) * (sleep ? 0.05 : 0.5);
      tailG.rotation.x = sleep ? 0.6 : 0;
      headG.rotation.x = state === 'lick' ? 0.25 + Math.sin(t * 16) * 0.12 : (state === 'bark' ? -0.2 - Math.max(0, Math.sin(t * 9)) * 0.3 : (sit ? 0.35 : (sleep ? 0.2 : Math.sin(t * 2) * 0.05)));
      headG.rotation.y = state === 'stand' ? Math.sin(t * 0.9) * 0.3 : 0;
      T.visible = state === 'lick' || (state === 'walk' && Math.sin(t * 3) > 0.6) || state === 'bark';
      T.position.z = state === 'lick' ? 0.27 + Math.max(0, Math.sin(t * 16)) * 0.04 : 0.26;
      torso.position.y += walk ? Math.abs(Math.sin(t * 12)) * 0.02 : 0;
    },
    dispose: function () { root.traverse(function (m) { if (m.isMesh) m.geometry.dispose(); }); mat.dispose(); }
  };
}

module.exports = { createDog: createDog };
