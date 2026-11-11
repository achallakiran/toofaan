/* view: the old mansion, the same place as in Toofan's nightmare, outside the city past its top-left corner. The road north out of the
   corner junction ends at a tall iron gate in a long old wall (spikes along the top), chained and padlocked until it opens. Past the gate a
   narrow deserted lane, cracked and weedy, lined with dead trees and dark broken lamps, runs on to the house far off in the fog: a big
   weathered house with a steep roof, a tower, chimneys, boarded windows and two still glowing red. Built in a local frame (the gate at the
   origin, the city toward +z, the lane toward -z). open(u) swings the gate (0 shut, 1 open). */
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
  var root = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), geos = [], fixed = [], B = maker(fixed), x, z, i;
  var WL = -19, WR = 72, WD = 78;                              /* the wall: from just west of the gate to the east edge of the grounds, then north */
  /* the grounds inside the wall: dead grass and bare earth */
  B(WL, 0.0, -WD, WR, 0.04, 0, C.OLIVE); for (i = 0; i < 70; i++) { var gx = WL + ((i * 37) % (WR - WL - 3)), gz = -((i * 53) % (WD - 3)) - 1; B(gx, 0.04, gz - 1.4, gx + 2.4, 0.06, gz, i % 3 ? C.SAND : C.BROWN); }
  /* the lane: narrow, cracked, weeds through it, running from the gate to the house */
  var LANE = 58;
  B(-1.9, 0.04, -LANE, 1.9, 0.08, 0, C.CHAR); for (z = -1; z > -LANE; z -= 2.3) { B(-1.2 + (z * 7 % 3) * 0.4, 0.08, z - 0.7, -0.2 + (z * 7 % 3) * 0.4, 0.09, z, C.DARK); B(1.0, 0.04, z - 0.4, 1.9 + 0.3, 0.2, z, C.LEAF); B(-2.2, 0.04, z - 1.2, -1.6, 0.25, z - 0.8, C.OLIVE); }
  /* dead trees and dark, bent lamp posts along it */
  for (z = -6; z > -LANE + 4; z -= 9) [-4.6, 4.6].forEach(function (u, k) {
    var tz = z - k * 4.5, bend = (k ? 1 : -1) * 0.5;
    if ((Math.round(z) + k) % 2) { B(u - 0.25, 0, tz - 0.25, u + 0.25, 4.8, tz + 0.25, C.BROWN); B(u, 3.4, tz - 0.1, u + 1.9, 3.6, tz + 0.1, C.BROWN); B(u - 1.6, 3.9, tz - 0.1, u, 4.1, tz + 0.1, C.BROWN); B(u + 1.7, 3.6, tz - 0.1, u + 1.9, 4.9, tz + 0.1, C.BROWN); B(u - 0.1, 4.1, tz, u + 0.1, 4.3, tz + 1.5, C.BROWN); }
    else { B(u - 0.08, 0, tz - 0.08, u + 0.08, 4.2, tz + 0.08, C.DARK); B(u, 4.0, tz - 0.06, u - bend * 1.4, 4.15, tz + 0.06, C.DARK); B(u - bend * 1.4 - 0.18, 3.7, tz - 0.15, u - bend * 1.4 + 0.18, 4.0, tz + 0.15, C.CHAR); }
  });
  /* the wall: stone, pillars every few metres, spikes along the top, moss; the gap for the gate at the origin */
  function wallRun(x0, z0, x1, z1) {
    B(x0, 0, z0, x1, 3.0, z1, C.STONE3); B(x0 - 0.05, 3.0, z0 - 0.05, x1 + 0.05, 3.15, z1 + 0.05, C.STONE);
    var len = Math.max(x1 - x0, z1 - z0), along = x1 - x0 > z1 - z0, k;
    for (k = 0; k <= len; k += 0.8) { var px = along ? x0 + k : (x0 + x1) / 2, pz = along ? (z0 + z1) / 2 : z0 + k; B(px - 0.04, 3.15, pz - 0.04, px + 0.04, 3.7, pz + 0.04, C.DARK); }
    for (k = 0; k <= len; k += 6) { var qx = along ? x0 + k : (x0 + x1) / 2, qz = along ? (z0 + z1) / 2 : z0 + k; B(qx - 0.45, 0, qz - 0.45, qx + 0.45, 3.5, qz + 0.45, C.STONE); B(qx - 0.55, 3.5, qz - 0.55, qx + 0.55, 3.7, qz + 0.55, C.STONE3); }
    for (k = 0; k < len; k += 2.3) { var mx = along ? x0 + k : x1 + 0.01, mz = along ? z1 + 0.01 : z0 + k; if ((k * 7) % 3 < 1) B(mx, 0.2, mz, mx + (along ? 0.9 : 0.05), 1.2, mz + (along ? 0.05 : 0.9), C.DGREEN); }
  }
  wallRun(WL, -0.6, -2.1, 0); wallRun(2.1, -0.6, WR, 0); wallRun(WL, -WD, WL + 0.6, 0); wallRun(WR - 0.6, -WD, WR, 0); wallRun(WL, -WD, WR, -WD + 0.6);
  [-2.1, 2.1].forEach(function (u) { B(u - 0.55, 0, -0.8, u + 0.55, 4.6, 0.25, C.STONE); B(u - 0.65, 4.6, -0.9, u + 0.65, 4.8, 0.35, C.STONE3); B(u - 0.32, 4.8, -0.6, u + 0.32, 5.4, 0.05, C.STONE3); });
  B(-2.1, 5.0, -0.5, 2.1, 5.2, -0.1, C.DARK); for (x = -1.8; x <= 1.8; x += 0.3) B(x - 0.03, 5.2, -0.33, x + 0.03, 5.7 - Math.abs(x) * 0.2, -0.27, C.DARK);
  /* the house, at the end of the lane */
  var HZ = -LANE - 6, S = 1.25;
  function H(x0, y0, z0, x1, y1, z1, c) { B(x0 * S, y0 * S, HZ + z0 * S, x1 * S, y1 * S, HZ + z1 * S, c); }
  H(-11, 0, -5, 11, 0.6, 5.4, C.STONE3); for (i = 0; i < 3; i++) H(-2.4, 0, 5.4 + i * 0.4, 2.4, 0.6 - i * 0.2, 5.8 + i * 0.4, C.STONE);
  H(-10.5, 0.6, -4.6, 10.5, 8.6, 4.6, C.GREYP); H(-10.6, 4.4, -4.7, 10.6, 4.7, 4.7, C.STONE3);
  for (i = 0; i < 8; i++) { var rw = 10.9 - i * 0.12, ry = 8.6 + i * 0.55, rd = 4.9 - i * 0.62; H(-rw, ry, -rd, rw, ry + 0.55, rd, i % 2 ? C.CHAR : C.DARK); }
  [[-7, -1.5], [-3, 2.5], [6.5, -2]].forEach(function (c) { H(c[0] - 0.5, 9.5, c[1] - 0.5, c[0] + 0.5, 13.4, c[1] + 0.5, C.BRICK2); });
  H(5.4, 0.6, 1.0, 9.6, 15.5, 5.2, C.STONE); for (i = 0; i < 7; i++) { var tw = 2.4 - i * 0.34; H(7.5 - tw, 15.5 + i * 0.7, 3.1 - tw, 7.5 + tw, 16.2 + i * 0.7, 3.1 + tw, i % 2 ? C.CHAR : C.DARK); }
  function win(wx, wy, wz, glow) { H(wx - 0.7, wy - 0.95, wz, wx + 0.7, wy + 0.95, wz + 0.08, glow ? C.CRIMSON : C.BLACK); if (!glow) { H(wx - 0.8, wy - 0.3, wz + 0.08, wx + 0.8, wy - 0.1, wz + 0.12, C.WOOD2); H(wx - 0.8, wy + 0.25, wz + 0.08, wx + 0.8, wy + 0.45, wz + 0.12, C.WOOD); } }
  [-8.5, -5.2, -1.4, 1.4, 3.6].forEach(function (wx, k) { win(wx, 2.6, 4.6, false); win(wx, 6.6, 4.6, k === 1); });
  win(7.5, 9.5, 5.2, true); win(7.5, 13.0, 5.2, false);
  H(-1.0, 0.6, 4.6, 1.0, 3.6, 4.66, C.BLACK); [-2.2, 2.2].forEach(function (u) { H(u - 0.25, 0.6, 5.2, u + 0.25, 4.6, 5.7, C.OFFWHITE); }); H(-2.8, 4.6, 4.6, 2.8, 5.0, 5.9, C.STONE);
  geos.push(geoOf(fixed)); root.add(new THREE.Mesh(geos[0], mat));
  /* the gate's two leaves, each turning on its post, and the chain and padlock across them while it is shut */
  function leaf(side) {
    var bx = [], LB = maker(bx), k;
    for (k = 0; k < 9; k++) { var px = side * (0.1 + k * 0.2); LB(px - 0.03, 0.1, -0.03, px + 0.03, 3.9, 0.03, C.DARK); LB(px - 0.05, 3.9, -0.05, px + 0.05, 4.15, 0.05, C.DARK); }
    [0.4, 2.0, 3.6].forEach(function (y) { LB(0, y, -0.04, side * 1.85, y + 0.08, 0.04, C.DARK); });
    var g = geoOf(bx); geos.push(g); var m = new THREE.Mesh(g, mat), piv = new THREE.Group(); piv.position.set(-side * 1.85, 0, -0.3); piv.add(m); root.add(piv); return piv;
  }
  var L = leaf(1), Rt = leaf(-1);
  var cb = [], CB = maker(cb); for (i = 0; i < 9; i++) CB(-0.95 + i * 0.22, 1.7 + Math.abs(i - 4) * -0.05, -0.06, -0.8 + i * 0.22, 1.82 + Math.abs(i - 4) * -0.05, 0.06, C.STEEL);
  CB(-0.22, 1.25, -0.1, 0.22, 1.6, 0.1, C.BRASS); CB(-0.12, 1.6, -0.04, 0.12, 1.78, 0.04, C.STEEL);
  var cg = geoOf(cb); geos.push(cg); var chain = new THREE.Mesh(cg, mat); chain.position.set(0, 0, -0.2); root.add(chain);
  /* the gate stands at the top of the road north out of the corner, facing the city */
  root.position.set(M.x, 0.02, M.wallZ); scene.add(root);
  function open(u) { L.rotation.y = u * 1.35; Rt.rotation.y = -u * 1.35; chain.visible = u < 0.02; }     /* (both swing in, away from the street) */
  open(0);
  return { root: root, open: open, dispose: function () { scene.remove(root); geos.forEach(function (g) { g.dispose(); }); mat.dispose(); } };
}

module.exports = { createMansion: createMansion };
