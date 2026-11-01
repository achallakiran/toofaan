/* view: the fight arena's tall pieces and painted signs. Each tall piece (the temple, a bus, a building front, a tree) is its own mesh,
   so that when the camera swings round and one comes between it and the fight, it fades to see-through and comes back once the view is
   clear. Signs are small canvas textures (shop boards, the temple name, the price board) fixed to their piece. */
'use strict';

var CONFIG = require('../data/config');
var boxmesh = require('./boxmesh');

function geom(boxes) {
  var a = boxmesh.boxesToArrays(boxes, CONFIG.PALETTE), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3));
  g.setIndex(new THREE.BufferAttribute(a.indices, 1)); g.computeBoundingSphere();
  return { g: g, tris: a.triangles };
}
function signTexture(s) {
  var cv = document.createElement('canvas'), H = 64, W = Math.max(64, Math.round(H * s.w / s.h / 8) * 8), g = cv.getContext('2d');
  cv.width = Math.min(1024, W); cv.height = H;
  g.fillStyle = s.bg || '#c2306f'; g.fillRect(0, 0, cv.width, H);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.strokeRect(4, 4, cv.width - 8, H - 8);
  var fs = 40; g.font = '900 ' + fs + 'px "Arial Black",Impact,system-ui,sans-serif';
  while (g.measureText(s.text).width > cv.width - 24 && fs > 12) { fs -= 2; g.font = '900 ' + fs + 'px "Arial Black",Impact,system-ui,sans-serif'; }
  g.fillStyle = s.fg || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.text, cv.width / 2, H / 2 + 2);
  var t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
/* does the segment a->b pass through the box (slab test)? */
function hits(a, b, q) {
  var t0 = 0, t1 = 1, d = [b.x - a.x, b.y - a.y, b.z - a.z], o = [a.x, a.y, a.z], lo = [q.x0, q.y0, q.z0], hi = [q.x1, q.y1, q.z1], i;
  for (i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo[i] || o[i] > hi[i]) return false; continue; }
    var u = (lo[i] - o[i]) / d[i], v = (hi[i] - o[i]) / d[i]; if (u > v) { var w = u; u = v; v = w; }
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  }
  return true;
}

function createArenaView(scene, spec) {
  var root = new THREE.Group(), pieces = [], tris = 0;
  root.position.set(spec.ox, 0, spec.oz); scene.add(root);
  var byGroup = {};
  (spec.tall || []).forEach(function (grp) {
    if (!grp.boxes.length) return;
    var G = geom(grp.boxes), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), m = new THREE.Mesh(G.g, mat);
    root.add(m); tris += G.tris;
    var b = grp.box, P = { id: grp.id, mesh: m, mat: mat, mats: [mat], box: { x0: b.x0 + spec.ox - 0.2, y0: b.y0, z0: b.z0 + spec.oz - 0.2, x1: b.x1 + spec.ox + 0.2, y1: b.y1 + 0.3, z1: b.z1 + spec.oz + 0.2 }, a: 1 };
    pieces.push(P); byGroup[grp.id] = P;
  });
  (spec.signs || []).forEach(function (s) {
    var tex = signTexture(s), mat = new THREE.MeshBasicMaterial({ map: tex }), m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    m.position.set(s.x, s.y, s.z); m.rotation.y = s.ry; root.add(m);
    var P = s.group && byGroup[s.group]; if (P) P.mats.push(mat); else pieces.push({ id: 'sign', mesh: m, mat: mat, mats: [mat], box: null, a: 1 });
  });
  return {
    triangles: function () { return tris; },
    /* each frame, before drawing: fade whatever stands between the camera and the people who matter */
    fade: function (camera, targets, dt) {
      var c = camera.position, k = 1 - Math.exp(-(dt || 1 / 60) * 14), i, j;
      for (i = 0; i < pieces.length; i++) {
        var P = pieces[i]; if (!P.box) continue;
        var block = false;
        for (j = 0; j < targets.length && !block; j++) block = hits(c, targets[j], P.box);
        P.a += ((block ? 0.22 : 1) - P.a) * k;
        var see = P.a < 0.985;
        P.mats.forEach(function (m) { m.transparent = see; m.opacity = see ? P.a : 1; m.depthWrite = !see; });
        P.blocking = block;
      }
    },
    faded: function () { return pieces.filter(function (P) { return P.blocking; }).map(function (P) { return P.id; }); },
    dispose: function () {
      scene.remove(root);
      root.traverse(function (m) { if (m.isMesh) { m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose(); } });
    }
  };
}

module.exports = { createArenaView: createArenaView, hits: hits };
