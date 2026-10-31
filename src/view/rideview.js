/* view: ride mode seen from above. The city map is baked into a road mesh and one mesh per block; traffic reuses the street's
   voxel vehicles; Toofan sits on Bijli, and when he is thrown off he tumbles and runs back. Reads the ride sim only. */
'use strict';

var CONFIG = require('../data/config');
var R = require('../data/ride');
var boxmesh = require('./boxmesh');
var ambient = require('./ambientvox');
var bikevox = require('./bikevox');
var herorig = require('./herorig');
var posemath = require('./posemath');

function meshOf(boxes, mat) {
  var a = boxmesh.boxesToArrays(boxes, CONFIG.PALETTE), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1)); g.computeBoundingSphere();
  return new THREE.Mesh(g, mat);
}

/* roads: asphalt, pavements between junctions, lane dashes, a double yellow median and zebra crossings */
function roadBoxes(map) {
  var out = [], L = map.lines, E = map.ext, H = R.HALF, P = R.PAVE, i, k, s, sd;
  function strip(axis, line, a0, a1, o0, o1, y1, c) {                       /* a box along a road: a = along, o = across */
    if (axis === 'x') out.push({ x0: a0, x1: a1, z0: line + o0, z1: line + o1, y0: 0, y1: y1, c: c });
    else out.push({ x0: line + o0, x1: line + o1, z0: a0, z1: a1, y0: 0, y1: y1, c: c });
  }
  out.push({ x0: -E - 70, x1: E + 70, z0: -E - 70, z1: E + 70, y0: -0.2, y1: -0.01, c: 2 });
  ['x', 'z'].forEach(function (axis) {
    for (i = 0; i < L.length; i++) {
      strip(axis, L[i], -E, E, -H, H, axis === 'x' ? 0.02 : 0.021, 1);
      var ends = [-E].concat(L.map(function (l) { return l; })).concat([E]);
      for (k = 0; k < ends.length - 1; k++) {                                 /* between junctions */
        var a0 = ends[k] + (k === 0 ? 0 : H), a1 = ends[k + 1] - (k === ends.length - 2 ? 0 : H);
        if (a1 - a0 < 2) continue;
        for (sd = -1; sd <= 1; sd += 2) strip(axis, L[i], a0 + (k === 0 ? 0 : P), a1 - (k === ends.length - 2 ? 0 : P), sd > 0 ? H : -H - P, sd > 0 ? H + P : -H, 0.14, 8);
        strip(axis, L[i], a0 + 1, a1 - 1, -0.28, -0.14, 0.03, 14); strip(axis, L[i], a0 + 1, a1 - 1, 0.14, 0.28, 0.03, 14);
        for (s = a0 + 3; s < a1 - 4; s += 6) { strip(axis, L[i], s, s + 2.4, -3.6, -3.42, 0.03, 25); strip(axis, L[i], s, s + 2.4, 3.42, 3.6, 0.03, 25); }
        if (k > 0) for (var zc = -H + 0.6; zc < H - 0.4; zc += 1.1) strip(axis, L[i], a0 + 0.6, a0 + 2.6, zc, zc + 0.55, 0.03, 25);
        if (k < ends.length - 2) for (zc = -H + 0.6; zc < H - 0.4; zc += 1.1) strip(axis, L[i], a1 - 2.6, a1 - 0.6, zc, zc + 0.55, 0.03, 25);
      }
    }
  });
  return out;
}

function createRideView(scene) {
  var root = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), built = null, i;
  scene.add(root);
  var bike = bikevox.createBike(), rig = herorig.createHeroRig(), seat = bike.seat;
  root.add(bike.root);
  var ride = posemath.named('ride'), down = posemath.named('down');
  function seatRider() { bike.pitch.add(rig.root); rig.root.position.set(seat.x, seat.y + 0.08 - 0.85, seat.z); rig.root.rotation.set(0, 0, 0); rig.applyPose(ride, { plant: false }); }
  seatRider();
  /* the signal: a pulsing ring and a soft column of light over the trouble spot */
  var mark = new THREE.Group();
  var ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.25, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffc21a }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; mark.add(ring);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 15; mark.add(beam); root.add(mark);
  var cars = {}, wheel = 0, runPhase = 0, layOn = 0;

  return {
    build: function (map) {
      if (built) return;
      built = [meshOf(roadBoxes(map), mat)];
      map.blocks.forEach(function (b) { built.push(meshOf(b.boxes, mat)); });
      built.forEach(function (m) { root.add(m); });
    },
    sync: function (r, alpha, dt, t) {
      var b = r.bike, x = b.px + (b.x - b.px) * alpha, z = b.pz + (b.z - b.pz) * alpha, h = b.ph + Math.atan2(Math.sin(b.h - b.ph), Math.cos(b.h - b.ph)) * alpha;
      bike.root.position.set(x, 0, z); bike.root.rotation.y = h;
      var onBike = r.state === 'ride' || r.state === 'arrived';
      layOn += ((onBike ? 0 : 1) - layOn) * (1 - Math.exp(-10 * dt));
      bike.lean.rotation.z = layOn * 1.35 + (onBike ? Math.max(-0.4, Math.min(0.4, b.turn * 14)) : 0);
      wheel += (onBike ? b.speed : (b.slide || 0)) * dt / bike.wheelR; bike.front.rotation.x = wheel; bike.rear.rotation.x = wheel;
      if (onBike) {
        if (rig.root.parent !== bike.pitch) seatRider();
        rig.flutter(t, Math.min(1, b.speed / 12));
      } else {
        if (rig.root.parent !== root) { root.add(rig.root); rig.root.rotation.set(0, 0, 0); }
        var hx = r.hero.px + (r.hero.x - r.hero.px) * alpha, hz = r.hero.pz + (r.hero.z - r.hero.pz) * alpha;
        rig.root.position.set(hx, 0, hz); rig.root.rotation.y = r.hero.face;
        if (r.state === 'fly') { var u = Math.min(1, r.t / R.FLY_TICKS); rig.applyPose(down, { plant: true }); rig.root.rotation.x = 0; rig.root.position.y = Math.sin(Math.PI * Math.min(1, u * 2.2)) * 0.6 * (1 - u); rig.body.rotation.x = r.hero.spin; }
        else { runPhase += dt * 9; rig.body.rotation.x = 0; rig.applyPose(posemath.walkPose(runPhase, 1.4), { plant: true }); }
        rig.flutter(t, 0.6);
      }
      if (onBike) rig.body.rotation.x = 0;
      /* the target */
      if (r.target && r.state !== 'arrived') { mark.visible = true; mark.position.set(r.target.x, 0, r.target.z); var p = 1 + Math.sin(t * 5) * 0.12; ring.scale.set(p, p, p); }
      else mark.visible = false;
      /* traffic near the bike */
      var seen = {};
      for (i = 0; i < r.traffic.length; i++) {
        var v = r.traffic[i]; if (Math.abs(v.x - b.x) > R.VIEW_R || Math.abs(v.z - b.z) > R.VIEW_R) continue;
        seen[v.id] = 1; var m = cars[v.id];
        if (!m) { m = cars[v.id] = ambient.createMesh({ kind: v.kind, look: v.look, id: v.id }); root.add(m); }
        m.position.set(v.px + (v.x - v.px) * alpha, 0, v.pz + (v.z - v.pz) * alpha); m.rotation.y = v.h;
      }
      for (var id in cars) if (!seen[id]) { root.remove(cars[id]); delete cars[id]; }
    },
    dispose: function () {
      scene.remove(root);
      if (built) built.forEach(function (m) { m.geometry.dispose(); });
      ring.geometry.dispose(); beam.geometry.dispose(); mat.dispose(); ambient.dispose(); cars = {};
    }
  };
}

module.exports = { createRideView: createRideView };
