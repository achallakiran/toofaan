/* view: ride mode, styled after the first Toofan prototype: a warm evening sky, colourful shopfront rows with striped shutters and awnings,
   lettered signboards, upper windows with sills, AC units and shades, rooftop tanks, poles with sagging wires, round voxel trees,
   and soft sun shadows on the ground. Blocks are built near the bike and released when far, so memory stays flat.
   Reads the ride sim only; nothing here touches the brawler. */
'use strict';

var R = require('../data/ride');
var boxmesh = require('./boxmesh');
var ambient = require('./ambientvox');
var bikevox = require('./bikevox');
var herorig = require('./herorig');
var posemath = require('./posemath');
var vg = require('./voxgrid');

/* colours by name; boxes carry an index into this list */
var PAL = [], PIX = {};
function C(hex) { if (PIX[hex] === undefined) { PIX[hex] = PAL.length; PAL.push(hex); } return PIX[hex]; }
var ROAD = C('#3b4046'), DASH = C('#e8e4da'), PAVE = C('#9c8f7d'), KERB = C('#cfc6b4'), GROUND = C('#7a6a58'), MEDIAN = C('#e8c547');
var WIN = C('#2b3f55'), SILL = C('#ddd6c8'), DOOR = C('#1c2226'), SHUT_L = C('#e6e0d4'), AWN_W = C('#f4efe8'), AWN_R = C('#d8452b'), DARK = C('#2d3238'), DARK2 = C('#1f2327');
var ACW = C('#e6ebee'), ACG = C('#7a838a'), TANK = C('#1b1d21'), TANKT = C('#2d5d4a'), POLE = C('#5a4a3c'), POLEARM = C('#3f342b'), BOXG = C('#44484d'), ROOF = C('#bdb3a2');
var WALLS = ['#2fa6a0', '#d8576b', '#e9a23b', '#7fb069', '#8e7cc3', '#e7d8b5', '#c97b5a', '#5fa8d3'].map(C);
var TRIMS = ['#f2efe6', '#ffe08a', '#2d3238', '#f2efe6', '#ff8a1f'].map(C);
var SHUTS = [['#e2552b', '#1b9aaa'], ['#2f9e44', '#f2b705'], ['#6b3fa0', '#e2552b'], ['#1b9aaa', '#d1397a'], ['#f2b705', '#2f9e44']].map(function (p) { return p.map(C); });
var SIGNS = [['TOOFAN GARAGE', '#f2b705', '#1b1b1b'], ['CHAI  SAMOSA', '#e2552b', '#fff4e0'], ['KIRANA STORE', '#1b9aaa', '#ffffff'], ['MOBILES', '#2f9e44', '#fff8d6'],
  ['PAN BHANDAR', '#6b3fa0', '#ffe08a'], ['SWEETS', '#d1397a', '#ffffff'], ['TYRES', '#2d3238', '#ffc233'], ['JUICE CENTRE', '#f08a1c', '#1b1b1b'],
  ['MEDICAL', '#1f8a4c', '#ffffff'], ['TAILORS', '#7a3fa0', '#fff4e0'], ['XEROX  STD', '#2b55b8', '#ffe08a'], ['BAKERY', '#c97b2a', '#fff8d6'],
  ['HARDWARE', '#3b4651', '#ff8a1f'], ['PHOTO STUDIO', '#d83a2e', '#ffffff'], ['HOTEL', '#18a39f', '#fff4e0'], ['SWEET HOME', '#f2b705', '#7a1f1f']];
var SUN = { x: -22 / 26, z: -16 / 26 };                 /* ground offset of a shadow per metre of height (sun high in the south-east, as in the prototype) */

function rnd(a, b, c) { return vg.h3(Math.round(a * 7), Math.round(b * 7), c | 0, 41); }

function toMesh(boxes, mat) {
  var a = boxmesh.boxesToArrays(boxes, PAL), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1)); g.computeBoundingSphere();
  return new THREE.Mesh(g, mat);
}

/* ---- the signboard atlas: 16 boards in one canvas, 4 across and 4 down ---- */
function signTexture() {
  var c = document.createElement('canvas'); c.width = 1024; c.height = 256; var x = c.getContext('2d');
  SIGNS.forEach(function (s, i) {
    var ox = (i % 4) * 256, oy = Math.floor(i / 4) * 64;
    x.fillStyle = s[1]; x.fillRect(ox, oy, 256, 64); x.strokeStyle = s[2]; x.lineWidth = 4; x.strokeRect(ox + 5, oy + 5, 246, 54);
    var size = 34; x.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif';
    while (x.measureText(s[0]).width > 226 && size > 14) { size -= 2; x.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif'; }
    x.fillStyle = s[2]; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s[0], ox + 128, oy + 34);
  });
  var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

/* ---- roads, pavements, markings, poles and wires for the whole map (one mesh, one line set) ---- */
function roadBoxes(map) {
  var out = [], L = map.lines, E = map.ext, H = R.HALF, P = R.PAVE, i, k, s, sd, zc;
  function strip(axis, line, a0, a1, o0, o1, y0, y1, c) {
    if (axis === 'x') out.push({ x0: a0, x1: a1, z0: line + o0, z1: line + o1, y0: y0, y1: y1, c: c });
    else out.push({ x0: line + o0, x1: line + o1, z0: a0, z1: a1, y0: y0, y1: y1, c: c });
  }
  out.push({ x0: -E - 120, x1: E + 120, z0: -E - 120, z1: E + 120, y0: -0.2, y1: -0.01, c: GROUND });
  ['x', 'z'].forEach(function (axis) {
    for (i = 0; i < L.length; i++) {
      strip(axis, L[i], -E, E, -H, H, 0, axis === 'x' ? 0.02 : 0.021, ROAD);
      var ends = [-E].concat(L).concat([E]);
      for (k = 0; k < ends.length - 1; k++) {
        var a0 = ends[k] + (k === 0 ? 0 : H), a1 = ends[k + 1] - (k === ends.length - 2 ? 0 : H);
        if (a1 - a0 < 2) continue;
        for (sd = -1; sd <= 1; sd += 2) {
          var p0 = a0 + (k === 0 ? 0 : P), p1 = a1 - (k === ends.length - 2 ? 0 : P);
          strip(axis, L[i], p0, p1, sd > 0 ? H + 0.25 : -H - P, sd > 0 ? H + P : -H - 0.25, 0, 0.16, PAVE);
          strip(axis, L[i], p0, p1, sd > 0 ? H : -H - 0.25, sd > 0 ? H + 0.25 : -H, 0, 0.2, KERB);
        }
        strip(axis, L[i], a0 + 1, a1 - 1, -0.28, -0.14, 0, 0.03, MEDIAN); strip(axis, L[i], a0 + 1, a1 - 1, 0.14, 0.28, 0, 0.03, MEDIAN);
        for (s = a0 + 3; s < a1 - 4; s += 6) { strip(axis, L[i], s, s + 2.4, -3.6, -3.42, 0, 0.03, DASH); strip(axis, L[i], s, s + 2.4, 3.42, 3.6, 0, 0.03, DASH); }
        if (k > 0) for (zc = -H + 0.6; zc < H - 0.4; zc += 1.1) strip(axis, L[i], a0 + 0.6, a0 + 2.6, zc, zc + 0.55, 0, 0.03, DASH);
        if (k < ends.length - 2) for (zc = -H + 0.6; zc < H - 0.4; zc += 1.1) strip(axis, L[i], a1 - 2.6, a1 - 0.6, zc, zc + 0.55, 0, 0.03, DASH);
      }
    }
  });
  /* electric poles: a wooden post, a cross arm and a transformer box */
  map.props.list.forEach(function (p) {
    if (p.kind !== 'pole') return;
    out.push({ x0: p.x - 0.11, x1: p.x + 0.11, z0: p.z - 0.11, z1: p.z + 0.11, y0: 0, y1: 6.5, c: POLE });
    if (p.ax === 'x') out.push({ x0: p.x - 0.1, x1: p.x + 0.1, z0: p.z - 1, z1: p.z + 1, y0: 6.1, y1: 6.3, c: POLEARM });
    else out.push({ x0: p.x - 1, x1: p.x + 1, z0: p.z - 0.1, z1: p.z + 0.1, y0: 6.1, y1: 6.3, c: POLEARM });
  });
  return out;
}
function wireLines(map) {
  var pts = [], byLine = {};
  map.props.list.forEach(function (p) { if (p.kind !== 'pole') return; var k = p.ax + (p.ax === 'x' ? p.z : p.x).toFixed(2); (byLine[k] || (byLine[k] = [])).push(p); });
  Object.keys(byLine).forEach(function (k) {
    var row = byLine[k].sort(function (a, b) { return a.ax === 'x' ? a.x - b.x : a.z - b.z; });
    for (var i = 0; i < row.length - 1; i++) {
      var a = row[i], b = row[i + 1]; if (Math.hypot(a.x - b.x, a.z - b.z) > 17) continue;
      [-0.8, 0, 0.8].forEach(function (o) {
        var ox = a.ax === 'x' ? 0 : o, oz = a.ax === 'x' ? o : 0, n = 8, j;
        for (j = 0; j < n; j++) {
          var t0 = j / n, t1 = (j + 1) / n;
          pts.push(a.x + (b.x - a.x) * t0 + ox, 6.25 - 0.35 * 4 * t0 * (1 - t0), a.z + (b.z - a.z) * t0 + oz, a.x + (b.x - a.x) * t1 + ox, 6.25 - 0.35 * 4 * t1 * (1 - t1), a.z + (b.z - a.z) * t1 + oz);
        }
      });
    }
  });
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.computeBoundingSphere();
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x15181b }));
}

/* ---- one block: four rows of shopfront buildings facing the roads, a roofed courtyard, sign boards and ground shadows ---- */
var SIDES = [
  function (b) { return { ox: b.x0, oz: b.z1, ax: 1, az: 0, nx: 0, nz: -1, len: b.x1 - b.x0 }; },    /* south row, faces +z */
  function (b) { return { ox: b.x1, oz: b.z0, ax: -1, az: 0, nx: 0, nz: 1, len: b.x1 - b.x0 }; },    /* north row, faces -z */
  function (b) { return { ox: b.x0, oz: b.z0, ax: 0, az: 1, nx: 1, nz: 0, len: b.z1 - b.z0 }; },     /* west row, faces -x */
  function (b) { return { ox: b.x1, oz: b.z1, ax: 0, az: -1, nx: -1, nz: 0, len: b.z1 - b.z0 }; }    /* east row, faces +x */
];
function buildBlock(b, seedKey, detail) {
  var boxes = [], signs = [], shadows = [], DEPTH = 8, side, f;
  function L(u0, u1, v0, v1, y0, y1, c) {                       /* a box in the row's frame: u along the street, v into the block, y up */
    var xa = f.ox + f.ax * u0 + f.nx * v0, za = f.oz + f.az * u0 + f.nz * v0, xb = f.ox + f.ax * u1 + f.nx * v1, zb = f.oz + f.az * u1 + f.nz * v1;
    boxes.push({ x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.min(za, zb), z1: Math.max(za, zb), y0: y0, y1: y1, c: c });
  }
  function W(u, v) { return [f.ox + f.ax * u + f.nx * v, f.oz + f.az * u + f.nz * v]; }
  for (side = 0; side < 4; side++) {
    f = SIDES[side](b);
    var u = side < 2 ? 0 : DEPTH, end = side < 2 ? f.len : f.len - DEPTH, bi = 0;
    while (u < end - 1) {
      var r0 = rnd(b.x0 + u, b.z0 + side, seedKey + bi), r1 = rnd(u, side, seedKey * 3 + bi), r2 = rnd(side, u * 1.7, seedKey + 99);
      var w = Math.min(end - u, 4.5 + Math.floor(r0 * 3) * 1.5), H = 6 + Math.floor(r1 * 3) * 1.35;
      if (end - u - w < 3) w = end - u;
      var wall = WALLS[Math.floor(r2 * WALLS.length)], trim = TRIMS[Math.floor(r0 * 7) % TRIMS.length], shut = SHUTS[Math.floor(r1 * 11) % SHUTS.length];
      L(u, u + w, 0, DEPTH, 0, H, wall);
      L(u, u + w, -0.08, 0.25, H, H + 0.3, trim);                                                       /* parapet */
      L(u, u + w, -0.04, 0, 1.75, 1.85, trim); L(u, u + w, -0.04, 0, 2.38, 2.46, trim);                  /* bands round the sign */
      /* ground floor: shop bays with striped shutters, a dark doorway and a striped awning */
      var nb = Math.max(1, Math.floor(w / 1.5)), bw = w / nb, k;
      for (k = 0; k < nb; k++) {
        var a = u + k * bw + 0.12, z = u + (k + 1) * bw - 0.12, col = shut[k % 2];
        if (!detail) { L(a, z, -0.03, 0, 0, 1.3, col); L(a, z, -0.6, 0, 1.36, 1.46, AWN_R); continue; }
        L(a, z, -0.03, 0, 0, 1.3, SHUT_L); L(a, z, -0.04, 0, 0.3, 0.48, col); L(a, z, -0.04, 0, 0.8, 0.98, col);
        L(a + (z - a) * 0.3, z - (z - a) * 0.3, -0.06, 0, 0, 0.85, DOOR);
        L(a, z, -0.6, 0, 1.36, 1.46, AWN_R); L(a + (z - a) / 3, z - (z - a) / 3, -0.61, 0, 1.37, 1.47, AWN_W); L(a, z, -0.62, -0.56, 1.26, 1.46, AWN_R);
      }
      /* the sign board between the bands */
      var sc = Math.floor(rnd(u, b.z0, seedKey + 7) * SIGNS.length), sp = W(u + 0.2, -0.07), sq = W(u + w - 0.2, -0.07);
      signs.push({ a: sp, b: sq, y0: 1.9, y1: 2.34, i: sc });
      /* upper floors: windows with sills, side shutters, a shade or an AC unit now and then */
      var y0;
      for (y0 = 2.75; detail && y0 + 1.0 < H; y0 += 1.35) {
        var nw = Math.max(1, Math.floor(w / 1.2)), ww = w / nw, j;
        for (j = 0; j < nw; j++) {
          var cu = u + (j + 0.5) * ww, r3 = rnd(cu, y0, seedKey + 5);
          L(cu - 0.3, cu + 0.3, -0.02, 0, y0, y0 + 0.75, WIN);
          L(cu - 0.4, cu + 0.4, -0.14, 0, y0 - 0.1, y0 - 0.02, SILL);
          if (r3 < 0.2) { L(cu - 0.42, cu - 0.32, -0.05, 0, y0, y0 + 0.75, shut[0]); L(cu + 0.32, cu + 0.42, -0.05, 0, y0, y0 + 0.75, shut[0]); }
          else if (r3 > 0.85) { L(cu - 0.42, cu + 0.42, -0.45, 0, y0 + 0.78, y0 + 0.86, DARK); L(cu - 0.42, cu + 0.42, -0.47, -0.4, y0 + 0.62, y0 + 0.86, DARK2); }
          if (rnd(cu, y0, seedKey + 11) < 0.18) { L(cu - 0.25, cu + 0.25, -0.35, 0, y0 + 0.9, y0 + 1.2, ACW); L(cu - 0.25, cu + 0.25, -0.36, -0.33, y0 + 0.95, y0 + 1.15, ACG); }
        }
      }
      if (!detail) for (y0 = 2.75; y0 + 1.0 < H; y0 += 1.35) L(u + 0.3, u + w - 0.3, -0.02, 0, y0, y0 + 0.75, WIN);
      if (r2 > 0.45) { var tu = u + w * 0.5, tv = DEPTH * 0.55; L(tu - 0.6, tu + 0.6, tv - 0.6, tv + 0.6, H, H + 1.05, TANK); L(tu - 0.6, tu + 0.6, tv - 0.6, tv + 0.6, H + 1.05, H + 1.15, TANKT); }
      /* shadow on the ground: the footprint swept away from the sun */
      var c0 = W(u, 0), c1 = W(u + w, 0), c2 = W(u + w, DEPTH), c3 = W(u, DEPTH), sx = SUN.x * H, sz = SUN.z * H;
      shadows.push([c0, c1, c2, c3, [c0[0] + sx, c0[1] + sz], [c1[0] + sx, c1[1] + sz], [c2[0] + sx, c2[1] + sz], [c3[0] + sx, c3[1] + sz]]);
      u += w; bi++;
    }
  }
  /* the courtyard behind the rows is roofed over, so no hole shows from above */
  boxes.push({ x0: b.x0 + DEPTH, x1: b.x1 - DEPTH, z0: b.z0 + DEPTH, z1: b.z1 - DEPTH, y0: 0, y1: 4.2, c: ROOF });
  return { boxes: boxes, signs: signs, shadows: shadows };
}

function signGeometry(signs) {
  var pos = [], uv = [], idx = [], n = 0;
  signs.forEach(function (s) {
    var u0 = (s.i % 4) / 4, u1 = u0 + 0.25, v1 = 1 - Math.floor(s.i / 4) / 4, v0 = v1 - 0.25;
    pos.push(s.a[0], s.y0, s.a[1], s.b[0], s.y0, s.b[1], s.b[0], s.y1, s.b[1], s.a[0], s.y1, s.a[1]);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
  });
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
  return g;
}
function hull(pts) {                                                      /* convex hull, monotone chain */
  pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  var lo = [], up = [], i;
  for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
  for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function shadowGeometry(polys, y) {
  var pos = [], idx = [], n = 0;
  polys.forEach(function (p) { var h = hull(p), i; h.forEach(function (q) { pos.push(q[0], y, q[1]); }); for (i = 1; i < h.length - 1; i++) idx.push(n, n + i + 1, n + i); n += h.length; });
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeBoundingSphere();
  return g;
}

/* ---- round voxel trees, as in the prototype ---- */
function treeGeo(seed) {
  var g = vg.createGrid(10, 12, 10), greens = [vg.hex('#3f8f4a'), vg.hex('#2f7a3d'), vg.hex('#58a85c')];
  vg.box(g, 5, 0, 5, 5, 5, 5, vg.hex('#6a4a30'));
  [[5, 7, 5, 3], [7, 5.5, 6, 2], [3, 6, 4, 2], [5.5, 9, 4.5, 2]].forEach(function (b, i) { vg.ellipsoid(g, b[0], b[1], b[2], b[3], b[3], b[3], greens[(i + seed) % 3]); });
  var a = vg.meshGrid(g, { x: 5.5, y: 0, z: 5.5 }, 0.3, { jitter: 0.08, seed: seed + 3 }), bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  bg.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); bg.setIndex(new THREE.BufferAttribute(a.indices, 1)); bg.computeBoundingSphere();
  return bg;
}

function skyTexture() {
  var c = document.createElement('canvas'); c.width = 2; c.height = 256; var x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#4f9fb3'); gr.addColorStop(0.6, '#f0c697'); gr.addColorStop(1, '#f3b27a'); x.fillStyle = gr; x.fillRect(0, 0, 2, 256);
  return new THREE.CanvasTexture(c);
}

function createRideView(scene) {
  var root = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), i;
  scene.add(root);
  /* the prototype's warm evening: sky gradient and amber haze (restored when the mode exits) */
  var prevBg = scene.background, prevFog = { c: scene.fog.color.clone(), n: scene.fog.near, f: scene.fog.far };
  var sky = skyTexture(); scene.background = sky; scene.fog.color.set('#f0c295'); scene.fog.near = 30; scene.fog.far = 92;
  /* shadows: dark, see-through, and each pixel darkened once even where shadows overlap */
  var shadowMat = new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.3, depthWrite: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp, polygonOffset: true, polygonOffsetFactor: -2 });
  var signMat = new THREE.MeshBasicMaterial({ map: signTexture() });
  var blob = new THREE.CircleGeometry(0.5, 18); blob.rotateX(-Math.PI / 2);
  function blobUnder(obj, lx, lz) { var m = new THREE.Mesh(blob, shadowMat); m.scale.set(lx, 1, lz); m.position.set(SUN.x * 0.5, 0.17, SUN.z * 0.5); m.renderOrder = 2; obj.add(m); return m; }

  var bike = bikevox.createBike(), rig = herorig.createHeroRig(), seat = bike.seat;
  root.add(bike.root); bike.root.scale.setScalar(R.SCALE); var bikeBlob = new THREE.Group(); root.add(bikeBlob); blobUnder(bikeBlob, 0.9 * R.SCALE, 2.1 * R.SCALE);
  var heroBlob = new THREE.Group(); root.add(heroBlob); blobUnder(heroBlob, 0.9 * R.SCALE, 0.9 * R.SCALE);
  var ridePose = posemath.named('ride'), down = posemath.named('down');
  function seatRider() { bike.pitch.add(rig.root); rig.root.position.set(seat.x, seat.y + 0.08 - 0.85, seat.z); rig.root.rotation.set(0, 0, 0); rig.root.scale.setScalar(1); rig.applyPose(ridePose, { plant: false }); }
  seatRider();
  /* the signal: a pulsing ring and a soft column of light */
  var mark = new THREE.Group();
  var ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.25, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffc21a }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; mark.add(ring);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 15; mark.add(beam); root.add(mark);
  var cars = {}, wheel = 0, runPhase = 0, layOn = 0, map = null, blocks = {}, roads = null, wires = null, trees = [], treeGeos = null;

  /* the blocks of the map plus a ring of blocks round its edge, so the city does not end in bare ground */
  function blockList() {
    var G = R.GRID, out = [], inset = R.HALF + R.PAVE, i, j;
    function line(k) { return (k - (G - 1) / 2) * R.SPACING; }
    for (i = -1; i < G; i++) for (j = -1; j < G; j++) out.push({ key: i + ',' + j, x0: line(i) + inset, x1: line(i + 1) - inset, z0: line(j) + inset, z1: line(j + 1) - inset, cx: (line(i) + line(i + 1)) / 2, cz: (line(j) + line(j + 1)) / 2, seed: (i + 7) * 31 + (j + 7) });
    return out;
  }
  var allBlocks = blockList();
  /* each block: a plain far version (walls, awnings, window bands, signs, shadows) always loaded within range, and a detailed near version swapped in close by */
  function makeGroup(b, detail) {
    var B = buildBlock(b, b.seed, detail), g = new THREE.Group();
    g.add(toMesh(B.boxes, mat)); g.add(new THREE.Mesh(signGeometry(B.signs), signMat));
    var sh = new THREE.Mesh(shadowGeometry(B.shadows, 0.18), shadowMat); sh.renderOrder = 2; g.add(sh);
    root.add(g); return g;
  }
  function drop(g) { root.remove(g); g.children.forEach(function (m) { m.geometry.dispose(); }); }
  function buildNear(x, z, max) {
    var built = 0;
    allBlocks.forEach(function (b) {
      var d = Math.hypot(b.cx - x, b.cz - z), e = blocks[b.key];
      if (d < 110 && !e && built < max) { e = blocks[b.key] = { far: makeGroup(b, false), near: null }; built++; }
      else if (d > 150 && e) { drop(e.far); if (e.near) drop(e.near); delete blocks[b.key]; return; }
      if (!e) return;
      if (d < 62 && !e.near && built < max) { e.near = makeGroup(b, true); built++; }
      else if (d > 80 && e.near) { drop(e.near); e.near = null; }
      e.far.visible = !e.near;
    });
  }

  return {
    build: function (m) {
      if (map) return; map = m;
      roads = toMesh(roadBoxes(map), mat); root.add(roads);
      wires = wireLines(map); root.add(wires);
      treeGeos = [treeGeo(0), treeGeo(1), treeGeo(2)];
      map.props.list.forEach(function (p) { if (p.kind !== 'tree') return; var t = new THREE.Mesh(treeGeos[p.v % 3], mat); t.position.set(p.x, 0.15, p.z); t.rotation.y = (p.x * 7 + p.z) % 6.28; root.add(t); trees.push(t); blobUnder(t, 3.2, 3.2); });
    },
    prime: function (x, z) { buildNear(x, z, 99); },
    sync: function (r, alpha, dt, t) {
      var b = r.bike, x = b.px + (b.x - b.px) * alpha, z = b.pz + (b.z - b.pz) * alpha, h = b.ph + Math.atan2(Math.sin(b.h - b.ph), Math.cos(b.h - b.ph)) * alpha;
      buildNear(x, z, 1);
      bike.root.position.set(x, 0, z); bike.root.rotation.y = h; bikeBlob.position.set(x, 0, z); bikeBlob.rotation.y = h;
      var onBike = r.state === 'ride' || r.state === 'arrived';
      layOn += ((onBike ? 0 : 1) - layOn) * (1 - Math.exp(-10 * dt));
      bike.lean.rotation.z = layOn * 1.35 + (onBike ? Math.max(-0.4, Math.min(0.4, b.turn * 14 * Math.min(1, Math.abs(b.speed) / 6))) : 0);
      wheel += (onBike ? b.speed : (b.slide || 0)) * dt / (bike.wheelR * R.SCALE); bike.front.rotation.x = wheel; bike.rear.rotation.x = wheel;
      if (onBike) {
        if (rig.root.parent !== bike.pitch) seatRider();
        rig.body.rotation.x = 0; rig.flutter(t, Math.min(1, Math.abs(b.speed) / 12)); heroBlob.visible = false;
      } else {
        if (rig.root.parent !== root) { root.add(rig.root); rig.root.rotation.set(0, 0, 0); rig.root.scale.setScalar(R.SCALE); }
        var hx = r.hero.px + (r.hero.x - r.hero.px) * alpha, hz = r.hero.pz + (r.hero.z - r.hero.pz) * alpha;
        rig.root.position.set(hx, 0, hz); rig.root.rotation.y = r.hero.face; heroBlob.visible = true; heroBlob.position.set(hx, 0, hz);
        if (r.state === 'fly') { var u = Math.min(1, r.t / R.FLY_TICKS); rig.applyPose(down, { plant: true }); rig.root.position.y = Math.sin(Math.PI * Math.min(1, u * 2.2)) * 0.6 * (1 - u); rig.body.rotation.x = r.hero.spin; }
        else { runPhase += dt * 9; rig.body.rotation.x = 0; rig.applyPose(posemath.walkPose(runPhase, 1.4), { plant: true }); }
        rig.flutter(t, 0.6);
      }
      if (r.target && r.state !== 'arrived') { mark.visible = true; mark.position.set(r.target.x, 0, r.target.z); var p = 1 + Math.sin(t * 5) * 0.12; ring.scale.set(p, p, p); }
      else mark.visible = false;
      /* traffic near the bike, each with a soft shadow */
      var seen = {};
      for (i = 0; i < r.traffic.length; i++) {
        var v = r.traffic[i]; if (Math.abs(v.x - b.x) > R.VIEW_R || Math.abs(v.z - b.z) > R.VIEW_R) continue;
        seen[v.id] = 1; var m = cars[v.id];
        if (!m) { m = cars[v.id] = ambient.createMesh({ kind: v.kind, look: v.look, id: v.id }); var K = R.KINDS[v.kind]; blobUnder(m, K.r * 2.4, K.len * 1.1); root.add(m); }
        m.position.set(v.px + (v.x - v.px) * alpha, 0, v.pz + (v.z - v.pz) * alpha); m.rotation.y = v.h;
      }
      for (var id in cars) if (!seen[id]) { root.remove(cars[id]); delete cars[id]; }
    },
    dispose: function () {
      scene.remove(root); scene.background = prevBg; scene.fog.color.copy(prevFog.c); scene.fog.near = prevFog.n; scene.fog.far = prevFog.f;
      Object.keys(blocks).forEach(function (k) { drop(blocks[k].far); if (blocks[k].near) drop(blocks[k].near); }); blocks = {};
      if (roads) roads.geometry.dispose(); if (wires) { wires.geometry.dispose(); wires.material.dispose(); }
      if (treeGeos) treeGeos.forEach(function (g) { g.dispose(); });
      sky.dispose(); signMat.map.dispose(); signMat.dispose(); shadowMat.dispose(); blob.dispose();
      ring.geometry.dispose(); beam.geometry.dispose(); mat.dispose(); ambient.dispose(); cars = {};
    }
  };
}

module.exports = { createRideView: createRideView };
