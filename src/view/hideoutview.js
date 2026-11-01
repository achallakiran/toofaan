/* view: Toofan's hideout as something to look at. Takes sim/hideoutgen's data and builds: the lit room (one Lambert mesh), the glowing
   screens and neon (unlit, always bright), the blinking indicator lights (one instanced mesh whose colours change every frame by pattern)
   and a handful of coloured point lights that hum and flicker. While it is up, the scene's daylight is turned right down so the hideout is
   dark and the glows carry it; everything is put back on dispose. */
'use strict';

var boxmesh = require('./boxmesh');
var CONFIG = require('../data/config');

function geo(a) {
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1)); return g;
}

function createHideout(view, data, opts) {
  opts = opts || {};
  var scene = view.scene, group = new THREE.Group(), made = [];
  /* the room */
  var roomMat = new THREE.MeshLambertMaterial({ vertexColors: true }), roomGeo = geo(boxmesh.boxesToArrays(data.boxes, CONFIG.PALETTE));
  group.add(new THREE.Mesh(roomGeo, roomMat)); made.push(roomMat, roomGeo);
  /* glows: plain boxes in their own colour, unaffected by light or fog */
  var glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), gp = [], gc = [], gi = [], col = new THREE.Color();
  data.glows.forEach(function (b) {
    col.setHex(b.color); var base = gp.length / 3, x = [b.x0, b.x1], y = [b.y0, b.y1], z = [b.z0, b.z1], k;
    for (k = 0; k < 8; k++) { gp.push(x[k & 1], y[(k >> 1) & 1], z[(k >> 2) & 1]); gc.push(col.r, col.g, col.b); }
    [0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5].forEach(function (q) { gi.push(base + q); });
  });
  var glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); glowGeo.setIndex(gi);
  var glowMesh = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })); group.add(glowMesh); made.push(glowGeo, glowMesh.material, glowMat);
  /* blinking lights */
  var leds = data.leds, ledGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045), ledMat = new THREE.MeshBasicMaterial({ fog: false });
  var inst = new THREE.InstancedMesh(ledGeo, ledMat, Math.max(1, leds.length)), m4 = new THREE.Matrix4(), base = leds.map(function (l) { return new THREE.Color(l.color); });
  leds.forEach(function (l, i) { m4.makeTranslation(l.x, l.y, l.z); inst.setMatrixAt(i, m4); inst.setColorAt(i, base[i]); });
  inst.count = leds.length; group.add(inst); made.push(ledGeo, ledMat);
  /* coloured lamps (phones get the strongest few only) */
  var maxLamps = opts.maxLamps || (view.tierId === 'phone' ? 4 : 8), lamps = data.lamps.slice().sort(function (a, b) { return b.intensity - a.intensity; }).slice(0, maxLamps);
  var points = lamps.map(function (l) { var p = new THREE.PointLight(l.color, l.intensity * 1.6, l.dist, 1.6); p.position.set(l.x, l.y, l.z); group.add(p); return { p: p, l: l }; });
  /* darkness */
  var L = view.lights, keep = L && { h: L.hemi.intensity, hc: L.hemi.color.getHex(), hg: L.hemi.groundColor.getHex(), s: L.sun.intensity };
  if (L) { L.hemi.intensity = opts.ambient != null ? opts.ambient : 0.32; L.hemi.color.set('#5a6aa0'); L.hemi.groundColor.set('#1a1418'); L.sun.intensity = 0.06; }
  scene.add(group);
  function hash(i) { var s = Math.sin(i * 127.1) * 43758.5; return s - Math.floor(s); }
  return {
    group: group,
    /* t in seconds: blink the lights, hum the lamps */
    update: function (t) {
      var c = new THREE.Color();
      for (var i = 0; i < leds.length; i++) {
        var l = leds[i], ph = t * l.rate + l.phase, v;
        if (l.pattern === 'pulse') v = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ph * 2));
        else if (l.pattern === 'flicker') v = hash(Math.floor(t * 14 * l.rate) + i * 7) > 0.35 ? 1 : 0.12;
        else v = (ph % 2) < 1.2 ? 1 : 0.1;
        c.copy(base[i]).multiplyScalar(v); inst.setColorAt(i, c);
      }
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      points.forEach(function (q, k) { q.p.intensity = q.l.intensity * 1.6 * (q.l.flicker ? (hash(Math.floor(t * 9) + k * 13) > 0.08 ? 0.92 + 0.08 * Math.sin(t * 40 + k) : 0.35) : (0.94 + 0.06 * Math.sin(t * 2.3 + k))); });
    },
    dispose: function () {
      scene.remove(group); made.forEach(function (x) { x.dispose(); }); inst.dispose && inst.dispose();
      if (L) { L.hemi.intensity = keep.h; L.hemi.color.setHex(keep.hc); L.hemi.groundColor.setHex(keep.hg); L.sun.intensity = keep.s; }
    }
  };
}

module.exports = { createHideout: createHideout };
