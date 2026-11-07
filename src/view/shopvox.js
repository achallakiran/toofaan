/* view: the cycle-repair shop over Toofan's hideout, on the ride map. An ordinary little shop front: a painted sign, a rolling shutter,
   bicycles and tyres inside. The hidden entrance is built in: a loose brick in the right pillar (the switch), the shutter rolling up,
   the shop floor splitting in two and the ramp under it tipping down into the dark. open(u) sets every part for a moment of the entrance
   (0 = an ordinary shop, 1 = the floor open and the ramp down). Built from boxes at voxel scale. */
'use strict';

var V = 0.1;                                            /* one voxel */
function signTex() {
  var c = document.createElement('canvas'); c.width = 256; c.height = 48; var g = c.getContext('2d');
  g.fillStyle = '#1d5d8a'; g.fillRect(0, 0, 256, 48); g.fillStyle = '#f4c430'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 44, 256, 4);
  g.fillStyle = '#fff'; g.font = "bold 24px 'ToofanPx',monospace"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CYCLE REPAIR', 128, 25);
  var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
}

function createShop(scene, home, lineZ) {
  var root = new THREE.Group(), mats = [], geos = [];
  function M(color, extra) { var m = new THREE.MeshLambertMaterial(Object.assign({ color: color }, extra || {})); mats.push(m); return m; }
  function B(w, h, d, mat, x, y, z, parent) { var g = new THREE.BoxGeometry(w, h, d); geos.push(g); var m = new THREE.Mesh(g, mat); m.position.set(x, y, z); (parent || root).add(m); return m; }
  var wall = M(0xb9a07c), wall2 = M(0x9c8566), dark = M(0x0c0d10), back = M(0x6a5a48), hazard = M(0xe8c21a), steel = M(0x8d969e), slat = M(0x6f7a83), rust = M(0x7a4a2a), tyre = M(0x18191b), floor = M(0x5b5148), red = M(0xb3221c);
  var W = 7.0, Hh = 3.4, D = 4.4;
  /* the shell: pillars, lintel with the sign, side walls and roof slab, the dark inside */
  B(0.6, Hh + 1.2, 0.6, wall, -W / 2 - 0.3, (Hh + 1.2) / 2, 0); B(0.6, Hh + 1.2, 0.6, wall, W / 2 + 0.3, (Hh + 1.2) / 2, 0);
  B(W + 1.2, 1.2, 0.6, wall2, 0, Hh + 0.6, 0);
  var sm = new THREE.MeshBasicMaterial({ map: signTex() }); mats.push(sm); B(W - 0.6, 0.8, 0.08, sm, 0, Hh + 0.6, -0.34);
  B(0.3, Hh + 1.2, D, wall, -W / 2 - 0.15, (Hh + 1.2) / 2, D / 2); B(0.3, Hh + 1.2, D, wall, W / 2 + 0.15, (Hh + 1.2) / 2, D / 2);
  B(W + 1.2, 0.3, D + 0.6, wall2, 0, Hh + 1.35, D / 2); B(W, Hh, 0.2, back, 0, Hh / 2, D); B(W, 0.6, 0.05, M(0x3c5a6e), 0, Hh * 0.35, D - 0.12);      /* the back wall, a pegboard strip */
  var bulbM = new THREE.MeshBasicMaterial({ color: 0xffe2a0 }); mats.push(bulbM); B(0.25, 0.25, 0.25, bulbM, 0, Hh - 0.35, D * 0.55); B(0.03, 0.3, 0.03, dark, 0, Hh - 0.08, D * 0.55);
  var inside = B(W, 0.02, D, dark, 0, 0.01, D / 2);                                       /* the pit under the floor */
  /* inside: bicycles on the back wall, a stack of tyres, a pump */
  function cycle(x, y) {
    var g = new THREE.Group(); g.position.set(x, y, D - 0.25); root.add(g);
    [-0.45, 0.45].forEach(function (u) { var t = new THREE.TorusGeometry(0.32, 0.04, 4, 12); geos.push(t); var m = new THREE.Mesh(t, tyre); m.position.x = u; g.add(m); });
    B(0.9, 0.05, 0.05, red, 0, 0.1, 0, g); B(0.05, 0.4, 0.05, red, -0.1, 0.25, 0, g); B(0.3, 0.05, 0.05, tyre, -0.1, 0.45, 0, g);
  }
  cycle(-1.8, 2.0); cycle(1.6, 2.2); cycle(0, 1.2);
  for (var i = 0; i < 4; i++) { var tg = new THREE.TorusGeometry(0.35, 0.12, 4, 12); geos.push(tg); var tm = new THREE.Mesh(tg, tyre); tm.rotation.x = Math.PI / 2; tm.position.set(-2.8, 0.18 + i * 0.24, D - 0.7); root.add(tm); }
  B(0.12, 0.9, 0.12, steel, 2.9, 0.6, D - 0.6);
  /* the floor: two halves over the pit, and the ramp below them */
  var halfL = B(W / 2, 0.12, D - 0.4, floor, -W / 4, 0.08, D / 2 + 0.1), halfR = B(W / 2, 0.12, D - 0.4, floor, W / 4, 0.08, D / 2 + 0.1);
  var ramp = new THREE.Group(); ramp.position.set(0, 0.02, 0.4); root.add(ramp);
  B(2.6, 0.08, D - 0.6, steel, 0, 0, (D - 0.6) / 2, ramp); B(0.14, 0.1, D - 0.6, hazard, -1.3, 0.02, (D - 0.6) / 2, ramp); B(0.14, 0.1, D - 0.6, hazard, 1.3, 0.02, (D - 0.6) / 2, ramp);
  for (i = 0; i < 6; i++) B(2.6, 0.03, 0.06, slat, 0, 0.05, 0.3 + i * 0.6, ramp);                 /* grip strips */
  /* the rolling shutter: slats in front of the opening, rolling up behind the lintel */
  var shutter = new THREE.Group(); root.add(shutter);
  for (i = 0; i < 15; i++) B(W, Hh / 15 - 0.02, 0.06, i % 2 ? slat : steel, 0, (i + 0.5) * Hh / 15, -0.2, shutter);
  B(0.5, 0.12, 0.08, rust, 0, 0.2, -0.26, shutter);                                            /* the handle */
  /* the loose brick in the right pillar: the switch */
  var brickM = M(0xa0623e, { emissive: 0x000000 }), brick = B(0.36, 0.18, 0.12, brickM, W / 2 + 0.3, 1.25, -0.3);
  /* placed: the front on the facade line, facing the road (-z), on the pavement's height */
  root.position.set(home.x, 0.16, home.z + 1.5 + 0.2); scene.add(root);
  /* nothing hides behind the shop: a dark floor plane for the pit covers what lies under it */
  function open(u) {
    function seg(a, b) { return Math.max(0, Math.min(1, (u - a) / (b - a))); }
    var k = seg(0, 0.15); brick.position.z = -0.3 + 0.08 * k; brickM.emissive.setRGB(0.6 * k * (1 - seg(0.3, 0.45)), 0.45 * k * (1 - seg(0.3, 0.45)), 0);
    var s = seg(0.12, 0.5); shutter.position.y = s * (Hh - 0.2); shutter.scale.y = 1 - s * 0.85;
    var f = seg(0.5, 0.75); halfL.position.x = -W / 4 - f * (W / 2 - 0.2); halfR.position.x = W / 4 + f * (W / 2 - 0.2);
    halfL.visible = halfR.visible = f < 0.98;
    var rp = seg(0.72, 1); ramp.rotation.x = rp * 0.32; inside.visible = f > 0;
  }
  open(0);
  return {
    root: root, open: open,
    /* the world point at the foot of the opening, and deep inside down the ramp */
    door: { x: home.x, z: home.z + 1.7 }, deep: { x: home.x, z: home.z + 1.7 + D - 0.6 },
    dispose: function () { scene.remove(root); geos.forEach(function (g) { g.dispose(); }); mats.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }
  };
}

module.exports = { createShop: createShop };
