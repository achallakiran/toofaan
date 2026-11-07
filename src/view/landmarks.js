/* view: each trouble spot's landmark on the ride map, standing in a gap in the building row right behind its pavement, so the place
   looks like its name as he rides up: the temple's shikhara, the petrol pump's canopy, the flyover's deck, the railway gate... plus the
   place's name on a board. Built from boxes in a local frame (x along the road, +z toward the road, the facade line at z = 0) and turned
   to face the road. GAP is how much of the row each one clears (rideview cuts it out). */
'use strict';

var CONFIG = require('../data/config');
var boxmesh = require('./boxmesh');
var R = require('../data/ride');
var C = require('../sim/arenakit').C;

var GAP = { half: 6.6, depth: 7.9 };          /* (7.9: never into the block's courtyard roof, which starts 8 m in) */

function board(text, bg, fg) {
  var c = document.createElement('canvas'); c.width = 512; c.height = 64; var g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 64); g.fillStyle = fg; g.fillRect(0, 0, 512, 5); g.fillRect(0, 59, 512, 5);
  g.font = "bold 34px 'ToofanPx',monospace"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.toUpperCase(), 256, 34);
  var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
}

/* the ten landmarks: B(x0, y0, z0, x1, y1, z1, colour); each returns where its name board goes { y, z, w, bg, fg } */
var BUILD = {
  temple: function (B) {
    B(-5, 0, -7, 5, 0.6, 0, C.STONE); for (var i = 0; i < 3; i++) B(-2 + i * 0.2, 0, i * 0.3, 2 - i * 0.2, 0.6 - i * 0.2, 0.3 + i * 0.3, C.STONE3);
    for (var x = -3.6; x <= 3.7; x += 2.4) { B(x - 0.25, 0.6, -0.8, x + 0.25, 3.6, -0.3, C.OFFWHITE); B(x - 0.3, 3.3, -0.85, x + 0.3, 3.6, -0.25, C.STONE); }
    B(-4.2, 3.6, -1.2, 4.2, 4.0, 0, C.SAFFRON); B(-3.8, 0.6, -6.4, 3.8, 4.0, -1.2, C.OFFWHITE); B(-1, 0.6, -1.25, 1, 2.8, -1.2, C.BRASS);
    for (var k = 0; k < 6; k++) { var s = 3.2 - k * 0.48, y = 4 + k * 1.05; B(-s, y, -6 + k * 0.35, s, y + 1.05, -1.6 - k * 0.3, k % 2 ? C.SAFFRON : C.OFFWHITE); B(-s - 0.1, y + 0.95, -6.1 + k * 0.35, s + 0.1, y + 1.05, -1.5 - k * 0.3, C.MARIGOLD); }
    B(-0.6, 10.3, -4.2, 0.6, 10.9, -3.2, C.BRASS); B(-0.05, 10.9, -3.75, 0.05, 13.2, -3.65, C.DARK); B(0.05, 12.3, -3.75, 1.4, 13.1, -3.65, C.SAFFRON);
    return { y: 4.6, z: 0.05, w: 6, bg: '#c8762f', fg: '#fff3c4' };
  },
  market: function (B) {
    B(-6.2, 0, -0.3, -5.8, 4.6, 0.1, C.WOOD2); B(5.8, 0, -0.3, 6.2, 4.6, 0.1, C.WOOD2); B(-6.4, 4.2, -0.35, 6.4, 4.9, 0.15, C.CRIMSON);      /* the gate arch */
    var cols = [C.BLUE, C.MARIGOLD, C.LEAF, C.CRIMSON];
    for (var i = 0; i < 4; i++) { var x = -4.8 + i * 3.2;
      B(x - 1.4, 0, -3.4, x - 1.3, 2.6, -3.3, C.WOOD); B(x + 1.3, 0, -3.4, x + 1.4, 2.6, -3.3, C.WOOD); B(x - 1.4, 0, -1.2, x - 1.3, 2.4, -1.1, C.WOOD); B(x + 1.3, 0, -1.2, x + 1.4, 2.4, -1.1, C.WOOD);
      B(x - 1.5, 2.4, -3.6, x + 1.5, 2.6, -0.8, cols[i]); B(x - 1.3, 0.8, -3.2, x + 1.3, 0.95, -1.2, C.WOOD2);
      for (var j = 0; j < 5; j++) B(x - 1.2 + j * 0.5, 0.95, -2.8, x - 0.85 + j * 0.5, 1.25, -1.5, [C.CRIMSON, C.LIME, C.LEMON, C.MARIGOLD, C.LEAF][(i + j) % 5]); }
    B(-6, 0, -8, 6, 6.5, -5, C.W_ROSE); B(-6, 6.5, -8, 6, 6.8, -5, C.BRICK2);
    return { y: 4.55, z: 0.17, w: 7.5, bg: '#d0312d', fg: '#ffffff' };
  },
  petrol: function (B) {
    B(-6, 0, -8, 6, 0.03, 0, C.CONC2);
    [[-4.6, -1.4], [4.6, -1.4], [-4.6, -6], [4.6, -6]].forEach(function (q) { B(q[0] - 0.22, 0, q[1] - 0.22, q[0] + 0.22, 5, q[1] + 0.22, C.OFFWHITE); });
    B(-6, 5, -6.8, 6, 5.4, -0.6, C.OFFWHITE); B(-6.05, 5.4, -6.85, 6.05, 6.1, -0.55, C.NAVY); B(-6.06, 5.55, -0.55, 6.06, 5.95, -0.5, C.MARIGOLD);
    [-2.2, 2.2].forEach(function (u) { B(u - 1.3, 0, -4.4, u + 1.3, 0.2, -3, C.CEMENT); B(u - 0.35, 0.2, -4, u + 0.35, 1.9, -3.4, C.OFFWHITE); B(u - 0.36, 1.9, -4.05, u + 0.36, 2.1, -3.35, C.CRIMSON); B(u - 0.25, 1.2, -3.4, u + 0.25, 1.55, -3.37, C.LIME); });
    B(5.6, 0, -0.4, 5.8, 7, -0.2, C.STEEL); B(4.8, 5, -0.45, 6.6, 7.2, -0.15, C.NAVY); B(4.9, 5.6, -0.15, 6.5, 6.0, -0.12, C.LEMON); B(4.9, 6.2, -0.15, 6.5, 6.6, -0.12, C.LIME);
    B(-5.4, 0, -7.2, -5.0, 10.5, -6.8, C.STEEL); B(-6.6, 7.4, -7.3, -3.8, 10.8, -6.7, C.NAVY); B(-6.4, 9.6, -6.7, -4.0, 10.5, -6.65, C.LEMON); B(-6.4, 8.4, -6.7, -4.0, 9.3, -6.65, C.LIME);   /* the tall price pylon */
    return { y: 5.75, z: -0.48, w: 7.5, bg: '#1d3557', fg: '#ffd166' };
  },
  busstand: function (B) {
    B(-6, 0, -2.4, 6, 0.18, 0, C.CEMENT); for (var x = -5; x <= 5.1; x += 2.5) { B(x - 0.08, 0.18, -2.2, x + 0.08, 3.0, -2.04, C.STEEL); B(x - 0.08, 0.18, -0.3, x + 0.08, 2.8, -0.14, C.STEEL); }
    B(-5.6, 2.8, -2.6, 5.6, 3.1, 0.2, C.TEAL); B(-5.7, 3.1, -2.7, 5.7, 3.2, 0.3, C.OFFWHITE); B(-4.5, 0.6, -2.0, 4.5, 0.7, -1.4, C.STEEL); B(-4.5, 0.18, -1.9, -4.4, 0.6, -1.5, C.STEEL); B(4.4, 0.18, -1.9, 4.5, 0.6, -1.5, C.STEEL);
    B(6.2, 0, -0.2, 6.35, 3.2, -0.05, C.STEEL); B(5.9, 2.6, -0.22, 6.65, 3.4, -0.03, C.CRIMSON);
    B(-6, 0, -8, 6, 5.5, -4, C.W_CREAM); B(-6, 5.5, -8, 6, 5.8, -4, C.TEAL);
    B(-0.15, 3.2, -0.4, 0.15, 7.4, -0.1, C.STEEL); B(-3.2, 6.2, -0.45, 3.2, 7.6, -0.05, C.TEAL);   /* the stand's name up high */
    return { y: 6.9, z: 0.0, w: 6, bg: '#2a9d8f', fg: '#ffffff' };
  },
  construction: function (B) {
    B(-6, 0, -0.15, 6, 2.2, 0.0, C.STEEL); for (var x = -6; x < 6; x += 0.6) B(x, 0, -0.18, x + 0.3, 2.2, -0.12, x % 1.2 ? C.SAFFRON : C.OFFWHITE);   /* the site hoarding */
    for (var y = 0; y < 4; y++) for (x = -4; x <= 4; x += 2) { B(x - 0.05, y * 2.2, -6.5, x + 0.05, y * 2.2 + 2.2, -6.4, C.STEEL); B(x - 0.05, y * 2.2, -3.5, x + 0.05, y * 2.2 + 2.2, -3.4, C.STEEL); }
    for (y = 1; y <= 4; y++) { B(-4.1, y * 2.2 - 0.05, -6.6, 4.1, y * 2.2 + 0.05, -3.3, C.WOOD2); }
    B(-4.1, 0, -3.3, 4.1, 8.8, -3.25, C.DGREEN);                                                                         /* green safety net */
    B(4.6, 0, -2.2, 5.2, 12, -1.6, C.YELLOW); B(-3, 11.6, -2.2, 9, 12.2, -1.6, C.YELLOW); B(8.6, 9.6, -2.0, 8.7, 11.6, -1.8, C.DARK); B(8.2, 9.0, -2.3, 9.1, 9.6, -1.5, C.CHAR);   /* the crane */
    B(-5.6, 0, -2.6, -3.6, 1.0, -1.2, C.SAND); B(2.0, 0, -2.4, 3.6, 0.8, -1.2, C.BRICK);
    return { y: 2.55, z: 0.05, w: 7.5, bg: '#f4a100', fg: '#17181b' };
  },
  warehouse: function (B) {
    B(-6, 0, -8, 6, 6.2, -0.5, C.STEEL); for (var x = -6; x < 6; x += 0.3) B(x, 0, -0.5, x + 0.12, 6.1, -0.44, C.BLUEGREY);
    B(-6.3, 6.2, -8.3, 6.3, 6.6, -0.2, C.NAVY); for (var k = 0; k < 2; k++) { var u = -2.8 + k * 5.6; B(u - 2, 0, -0.44, u + 2, 4, -0.38, C.DARK); for (var y = 0; y < 12; y++) B(u - 1.9, 1.6 + y * 0.2, -0.38, u + 1.9, 1.72 + y * 0.2, -0.34, C.GREY); }
    B(-5.8, 0, -0.38, 5.8, 1.1, 0.8, C.CEMENT); B(-5.8, 1.1, 0.6, 5.8, 1.15, 0.8, C.YELLOW);
    return { y: 5.1, z: -0.3, w: 7.5, bg: '#1d3557', fg: '#ffd166' };
  },
  slum: function (B) {
    var cols = [C.BLUE, C.W_ROSE, C.TEAL, C.W_SAF], x = -6, i = 0;
    while (x < 5.8) { var w = 2.6 + (i % 2) * 0.6, h = 2.5 + (i % 3) * 0.3; B(x, 0, -4, x + w, h, -0.6, cols[i % 4]); B(x - 0.15, h, -4.2, x + w + 0.15, h + 0.1, -0.2, C.RUST);
      B(x + 0.3, 0, -0.6, x + 1.0, 1.9, -0.56, C.NAVY); B(x - 0.1, h - 0.7, -0.6, x + w + 0.1, h - 0.65, 0.3, C.BLUE); if (i % 2 === 0) B(x + 0.2, h + 0.1, -3.6, x + w - 0.3, h + 2.2, -1.2, cols[(i + 2) % 4]); x += w + 0.1; i++; }
    [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(function (q) { B(2 + q[0] - 0.05, 4.6, -2.5 + q[1] - 0.05, 2 + q[0] + 0.05, 6.4, -2.5 + q[1] + 0.05, C.STEEL); });
    B(1.4, 6.4, -3.1, 2.6, 7.6, -1.9, C.BLACK);
    for (x = -5.8; x < 5.8; x += 0.6) B(x, 1.8, 0.2, x + 0.4, 2.3, 0.24, [C.CRIMSON, C.LEMON, C.NAVY, C.MAGENTA, C.WHITE][Math.round(x * 5 + 30) % 5]);  /* the washing */
    B(-5.6, 0, -7.6, 5.6, 6.6, -4.4, C.W_LIME); B(-5.8, 6.6, -7.8, 5.8, 6.7, -4.2, C.RUST); for (var q = -5.2; q < 5.2; q += 1.6) B(q, 3.2, -4.4, q + 0.8, 4.2, -4.36, C.SLATE);   /* homes stacked up behind */
    B(-4.6, 6.7, -7, -2.6, 8.4, -5, C.BLACK); B(1.8, 6.7, -6.6, 3.8, 7.9, -5.2, C.BLUE);
    return { y: 3.4, z: 0.35, w: 7.5, bg: '#6d4c41', fg: '#ffffff' };
  },
  railway: function (B) {
    B(-6, 0, -8, 6, 0.1, 0, C.DARK); for (var z = -7.6; z < 0; z += 0.6) B(-1.4, 0.1, z, 1.4, 0.2, z + 0.3, C.BROWN);
    B(-0.8, 0.2, -8, -0.66, 0.36, 0, C.STEEL); B(0.66, 0.2, -8, 0.8, 0.36, 0, C.STEEL);
    B(-3, 0, -0.5, -2.6, 1.2, -0.1, C.STONE); for (var k = 0; k < 8; k++) B(-2.6 + k * 0.5, 1.15, -0.35, -2.1 + k * 0.5, 1.28, -0.25, k % 2 ? C.CRIMSON : C.WHITE);
    B(-6, 0, -6, -2.4, 0.6, -2.2, C.BRICK); B(-5.8, 0.6, -5.8, -2.6, 3.4, -2.4, C.W_CREAM); B(-6.1, 3.4, -6.1, -2.3, 3.7, -2.1, C.BRICK2); B(-5.4, 1.5, -2.4, -3, 2.7, -2.36, C.SLATE);
    B(4, 0, -1.2, 4.2, 6, -1.0, C.STEEL); B(3.75, 4.8, -1.25, 4.45, 6.2, -0.95, C.DARK); B(3.95, 5.7, -0.95, 4.25, 6.0, -0.9, C.CRIMSON); B(3.95, 5.25, -0.95, 4.25, 5.55, -0.9, C.LEMON); B(3.95, 4.9, -0.95, 4.25, 5.15, -0.9, C.LEAF);
    B(-6.3, 0, -1.0, -6.0, 7.6, -0.7, C.STEEL); B(6.0, 0, -1.0, 6.3, 7.6, -0.7, C.STEEL); B(-6.3, 7.2, -1.0, 6.3, 7.6, -0.7, C.STEEL);   /* the height gauge over the crossing */
    for (var k2 = 0; k2 < 12; k2++) B(-6 + k2, 6.7, -0.95, -5 + k2, 7.2, -0.75, k2 % 2 ? C.CRIMSON : C.WHITE);
    B(-5.8, 3.7, -5.8, -2.6, 6.2, -2.4, C.W_CREAM); B(-6.1, 6.2, -6.1, -2.3, 6.5, -2.1, C.BRICK2); B(-5.4, 4.4, -2.4, -3.0, 5.6, -2.36, C.SLATE);
    return { y: 2.3, z: 0.0, w: 7.5, bg: '#efe3c8', fg: '#9b4a2a' };
  },
  toll: function (B) {
    B(-6, 0, -6, 6, 6.4, -5.6, C.STEEL);
    B(-6.2, 6.4, -6.2, 6.2, 6.8, -0.6, C.OFFWHITE); B(-6.25, 6.8, -6.25, 6.25, 8.2, -0.55, C.LEMON); B(-6.26, 7.1, -0.55, 6.26, 7.9, -0.5, C.NAVY);
    [-3.6, 0, 3.6].forEach(function (x) { B(x - 0.6, 0, -4.4, x + 0.6, 0.25, -2.2, C.YELLOW); B(x - 0.45, 0.25, -4, x + 0.45, 2.5, -2.6, C.OFFWHITE); B(x - 0.4, 1.2, -2.6, x + 0.4, 2.2, -2.56, C.SLATE); B(x - 0.06, 2.5, -3.4, x + 0.06, 6.4, -3.2, C.STEEL);
      B(x + 0.6, 0, -1.4, x + 0.8, 1.1, -1.2, C.YELLOW); for (var k = 0; k < 4; k++) B(x + 0.8 + k * 0.5, 1.0, -1.35, x + 1.3 + k * 0.5, 1.1, -1.25, k % 2 ? C.CRIMSON : C.WHITE); });
    return { y: 7.5, z: -0.48, w: 9, bg: '#1d3557', fg: '#ffd166' };
  },
  flyover: function (B) {
    [-4.8, 4.8].forEach(function (x) { B(x - 0.8, 0, -4.8, x + 0.8, 8.6, -3.2, C.CEMENT); B(x - 1.6, 8.0, -5.0, x + 1.6, 8.6, -3.0, C.CEMENT); B(x - 0.81, 2.0, -3.2, x + 0.81, 2.4, -3.18, C.YELLOW); });
    B(-9, 8.6, -8.4, 9, 9.8, 0.4, C.CEMENT); B(-9, 9.8, 0, 9, 10.6, 0.4, C.STONE); B(-9, 8.4, 0.1, 9, 8.6, 0.4, C.STONE3);
    B(-6, 0, -8, 6, 0.02, 0, C.CHAR); B(-2.6, 0, -2.2, -1.2, 1.6, -1.2, C.LEMON); B(1.6, 0, -2.8, 2.6, 0.5, -1.8, C.CHAR);
    return { y: 9.2, z: 0.45, w: 7.5, bg: '#17181b', fg: '#ffd166' };
  }
};

function createLandmarks(scene, map) {
  var group = new THREE.Group(), made = [], mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  made.push(mat);
  map.targets.forEach(function (T) {
    var build = BUILD[T.key]; if (!build || T.axis === undefined) return;
    var boxes = [];
    function B(x0, y0, z0, x1, y1, z1, c) { boxes.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), c: c }); }
    var bd = build(B); bd.w *= 1.25; var a = boxmesh.boxesToArrays(boxes, CONFIG.PALETTE), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1)); g.computeBoundingSphere(); made.push(g);
    var L = new THREE.Group(); L.add(new THREE.Mesh(g, mat));
    var tex = board(T.name, bd.bg, bd.fg), bm = new THREE.MeshBasicMaterial({ map: tex }), bg = new THREE.PlaneGeometry(bd.w, bd.w / 8); made.push(tex, bm, bg);
    var bp = new THREE.Mesh(bg, bm); bp.position.set(0, bd.y, bd.z + 0.02); L.add(bp);
    /* stand it on the facade line behind the pavement, facing the road */
    var f = T.line + T.side * (R.HALF + R.PAVE);
    if (T.axis === 'x') { L.position.set(T.x, 0.16, f); L.rotation.y = T.side > 0 ? Math.PI : 0; }
    else { L.position.set(f, 0.16, T.z); L.rotation.y = -T.side * Math.PI / 2; }
    group.add(L);
  });
  scene.add(group);
  return { group: group, dispose: function () { scene.remove(group); made.forEach(function (m) { m.dispose(); }); } };
}

/* the stretch of the building row each landmark clears, in world metres, and which way the row runs */
function gaps(map) {
  return map.targets.filter(function (T) { return T.axis !== undefined; }).map(function (T) {
    var f = T.line + T.side * (R.HALF + R.PAVE), d0 = Math.min(f, f + T.side * GAP.depth), d1 = Math.max(f, f + T.side * GAP.depth);
    return T.axis === 'x' ? { axis: 'x', x0: T.x - GAP.half, x1: T.x + GAP.half, z0: d0, z1: d1, c: T.x } : { axis: 'z', x0: d0, x1: d1, z0: T.z - GAP.half, z1: T.z + GAP.half, c: T.z };
  });
}

module.exports = { createLandmarks: createLandmarks, gaps: gaps, BUILD: BUILD };
