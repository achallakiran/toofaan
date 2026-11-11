/* view: the old mansion on the ride map, the same place as in Toofan's nightmare: a whole block walled in with old stone, spikes along
   the top, a tall iron gate on the street (chained and padlocked until it opens), a gravel drive through dead grass and bare trees up to
   a big weathered house with a steep roof, a tower, chimneys, boarded windows and two still glowing red. Built in a local frame (block
   centred on the origin, the gate's street toward +z) and turned to face it. open(u) swings the gate (0 shut, 1 open). */
'use strict';

var CONFIG = require('../data/config');
var boxmesh = require('./boxmesh');
var C = require('../sim/arenakit').C;

function geoOf(boxes) {
  var a = boxmesh.boxesToArrays(boxes, CONFIG.PALETTE), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1)); g.computeBoundingSphere(); return g;
}
function maker(list) { return function (x0, y0, z0, x1, y1, z1, c) { list.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), c: c }); }; }

function createMansion(scene, map) {
  var M = map.mansion; if (!M) return { open: function () {}, dispose: function () {} };
  var root = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), geos = [], fixed = [], B = maker(fixed), H = 25.6, x, z, i;
  /* the grounds: dead grass, the gravel drive, bare trees */
  B(-H, 0.0, -H, H, 0.05, H, C.OLIVE); for (i = 0; i < 40; i++) { var gx = ((i * 37) % 48) - 24, gz = ((i * 53) % 48) - 24; B(gx, 0.05, gz, gx + 2.2, 0.07, gz + 1.6, i % 3 ? C.SAND : C.BROWN); }
  B(-2.2, 0.05, -4, 2.2, 0.09, H, C.STONE2); for (z = -3; z < H; z += 1.4) B(-2.3, 0.05, z, -2.0, 0.14, z + 0.6, C.STONE3);
  [[-12, 12], [12, 15], [-17, -2], [15, 2], [-8, 20]].forEach(function (t, k) {
    B(t[0] - 0.25, 0, t[1] - 0.25, t[0] + 0.25, 4.6, t[1] + 0.25, C.BROWN);
    B(t[0], 3.2, t[1] - 0.1, t[0] + 1.8, 3.4, t[1] + 0.1, C.BROWN); B(t[0] - 1.6, 3.8, t[1] - 0.1, t[0], 4.0, t[1] + 0.1, C.BROWN); B(t[0] + 1.6, 3.4, t[1] - 0.1, t[0] + 1.8, 4.6, t[1] + 0.1, C.BROWN);
    B(t[0] - 0.1, 4.0, t[1], t[0] + 0.1, 4.2, t[1] + 1.4, C.BROWN); if (k % 2) B(t[0] - 1.6, 3.8, t[1] - 0.1, t[0] - 1.4, 5.0, t[1] + 0.1, C.BROWN);
  });
  /* the wall round the block, pillars every few metres, spikes along the top; the gap for the gate in the middle of the street side */
  function wallRun(x0, z0, x1, z1) {
    B(x0, 0, z0, x1, 2.8, z1, C.STONE3); B(x0 - 0.05, 2.8, z0 - 0.05, x1 + 0.05, 2.95, z1 + 0.05, C.STONE);
    var len = Math.max(x1 - x0, z1 - z0), along = x1 - x0 > z1 - z0, k;
    for (k = 0; k <= len; k += 0.8) { var px = along ? x0 + k : (x0 + x1) / 2, pz = along ? (z0 + z1) / 2 : z0 + k; B(px - 0.04, 2.95, pz - 0.04, px + 0.04, 3.45, pz + 0.04, C.DARK); }
    for (k = 0; k <= len; k += 6) { var qx = along ? x0 + k : (x0 + x1) / 2, qz = along ? (z0 + z1) / 2 : z0 + k; B(qx - 0.45, 0, qz - 0.45, qx + 0.45, 3.3, qz + 0.45, C.STONE); B(qx - 0.55, 3.3, qz - 0.55, qx + 0.55, 3.5, qz + 0.55, C.STONE3); }
    for (k = 0; k < len; k += 2.3) { var mx = along ? x0 + k : x0 - 0.02, mz = along ? z0 - 0.02 : z0 + k; if ((k * 7) % 3 < 1) B(mx, 0.2, mz, mx + (along ? 0.9 : 0.05), 1.0, mz + (along ? 0.05 : 0.9), C.DGREEN); }   /* moss */
  }
  wallRun(-H, H - 0.6, -2.1, H); wallRun(2.1, H - 0.6, H, H); wallRun(-H, -H, H, -H + 0.6); wallRun(-H, -H, -H + 0.6, H); wallRun(H - 0.6, -H, H, H);
  /* the gate posts, orbs on top */
  [-2.1, 2.1].forEach(function (u) { B(u - 0.5, 0, H - 0.8, u + 0.5, 4.2, H + 0.2, C.STONE); B(u - 0.6, 4.2, H - 0.9, u + 0.6, 4.4, H + 0.3, C.STONE3); B(u - 0.3, 4.4, H - 0.6, u + 0.3, 5.0, H, C.STONE3); });
  B(-2.1, 4.6, H - 0.5, 2.1, 4.8, H - 0.1, C.DARK); for (x = -1.8; x <= 1.8; x += 0.3) B(x - 0.03, 4.8, H - 0.33, x + 0.03, 5.3 - Math.abs(x) * 0.2, H - 0.27, C.DARK);   /* the arch over it */
  /* the house */
  var HZ = -9;
  B(-11, 0, HZ - 5, 11, 0.6, HZ + 5.4, C.STONE3); for (i = 0; i < 3; i++) B(-2.4, 0, HZ + 5.4 + i * 0.4, 2.4, 0.6 - i * 0.2, HZ + 5.8 + i * 0.4, C.STONE);
  B(-10.5, 0.6, HZ - 4.6, 10.5, 8.6, HZ + 4.6, C.GREYP); B(-10.6, 4.4, HZ - 4.7, 10.6, 4.7, HZ + 4.7, C.STONE3);
  for (i = 0; i < 8; i++) { var rw = 10.9 - i * 0.12, ry = 8.6 + i * 0.55, rd = 4.9 - i * 0.62; B(-rw, ry, HZ - rd, rw, ry + 0.55, HZ + rd, i % 2 ? C.CHAR : C.DARK); }   /* the steep roof */
  B(-11.2, 8.5, HZ + 4.85, 11.2, 8.7, HZ + 5.05, C.BROWN);
  [[-7, -1.5], [-3, 2.5], [6.5, -2]].forEach(function (c) { B(c[0] - 0.5, 9.5, HZ + c[1] - 0.5, c[0] + 0.5, 13.4, HZ + c[1] + 0.5, C.BRICK2); B(c[0] - 0.6, 13.4, HZ + c[1] - 0.6, c[0] + 0.6, 13.6, HZ + c[1] + 0.6, C.STONE3); });
  /* the tower on the right, its pointed roof */
  B(5.4, 0.6, HZ + 1.0, 9.6, 15.5, HZ + 5.2, C.STONE); for (i = 0; i < 7; i++) { var tw = 2.4 - i * 0.34; B(7.5 - tw, 15.5 + i * 0.7, HZ + 3.1 - tw, 7.5 + tw, 16.2 + i * 0.7, HZ + 3.1 + tw, i % 2 ? C.CHAR : C.DARK); }
  B(7.45, 20.4, HZ + 3.05, 7.55, 22.0, HZ + 3.15, C.DARK);
  /* windows: boarded up, but two still glow red; a porch with columns and a black door */
  function win(wx, wy, wz, glow) { B(wx - 0.7, wy - 0.95, wz, wx + 0.7, wy + 0.95, wz + 0.08, glow ? C.CRIMSON : C.BLACK); B(wx - 0.85, wy - 1.1, wz + 0.02, wx + 0.85, wy - 0.95, wz + 0.14, C.STONE3); B(wx - 0.85, wy + 0.95, wz + 0.02, wx + 0.85, wy + 1.1, wz + 0.14, C.STONE3);
    if (!glow) { B(wx - 0.8, wy - 0.3, wz + 0.08, wx + 0.8, wy - 0.1, wz + 0.12, C.WOOD2); B(wx - 0.8, wy + 0.25, wz + 0.08, wx + 0.8, wy + 0.45, wz + 0.12, C.WOOD); } }
  [-8.5, -5.2, -1.4, 1.4, 3.6].forEach(function (wx, k) { win(wx, 2.6, HZ + 4.6, false); win(wx, 6.6, HZ + 4.6, k === 1); });
  win(7.5, 9.5, HZ + 5.2, true); win(7.5, 13.0, HZ + 5.2, false);
  B(-1.0, 0.6, HZ + 4.6, 1.0, 3.6, HZ + 4.66, C.BLACK); B(-1.2, 3.6, HZ + 4.6, 1.2, 3.9, HZ + 4.7, C.STONE3);
  [-2.2, 2.2].forEach(function (u) { B(u - 0.25, 0.6, HZ + 5.2, u + 0.25, 4.6, HZ + 5.7, C.OFFWHITE); }); B(-2.8, 4.6, HZ + 4.6, 2.8, 5.0, HZ + 5.9, C.STONE);
  geos.push(geoOf(fixed)); root.add(new THREE.Mesh(geos[0], mat));
  /* the gate's two leaves, each turning on its post, and the chain and padlock across them while it is shut */
  function leaf(side) {
    var bx = [], LB = maker(bx), k;
    for (k = 0; k < 9; k++) { var px = side * (0.1 + k * 0.2); LB(px - 0.03, 0.1, -0.03, px + 0.03, 3.6, 0.03, C.DARK); LB(px - 0.05, 3.6, -0.05, px + 0.05, 3.85, 0.05, C.DARK); }
    [0.4, 1.8, 3.2].forEach(function (y) { LB(0, y, -0.04, side * 1.85, y + 0.08, 0.04, C.DARK); });
    var g = geoOf(bx); geos.push(g); var m = new THREE.Mesh(g, mat), piv = new THREE.Group(); piv.position.set(-side * 1.85, 0, H - 0.3); piv.add(m); root.add(piv); return piv;
  }
  var L = leaf(1), Rt = leaf(-1);
  var cb = [], CB = maker(cb); for (i = 0; i < 9; i++) CB(-0.95 + i * 0.22, 1.7 + Math.abs(i - 4) * -0.05, -0.06, -0.8 + i * 0.22, 1.82 + Math.abs(i - 4) * -0.05, 0.06, C.STEEL);
  CB(-0.22, 1.25, -0.1, 0.22, 1.6, 0.1, C.BRASS); CB(-0.12, 1.6, -0.04, 0.12, 1.78, 0.04, C.STEEL);
  var cg = geoOf(cb); geos.push(cg); var chain = new THREE.Mesh(cg, mat); chain.position.set(0, 0, H - 0.25); root.add(chain);
  /* the block, turned so the gate faces its street */
  root.position.set(M.cx, 0.02, M.cz); root.rotation.y = M.side > 0 ? 0 : Math.PI; scene.add(root);
  function open(u) { L.rotation.y = u * 1.35; Rt.rotation.y = -u * 1.35;                   /* (both swing in, away from the street) */ chain.visible = u < 0.02; }
  open(0);
  return { root: root, open: open, dispose: function () { scene.remove(root); geos.forEach(function (g) { g.dispose(); }); mat.dispose(); } };
}

module.exports = { createMansion: createMansion };
