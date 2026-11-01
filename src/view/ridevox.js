/* view: the ride's traffic, built for the ride alone (the street mode keeps its own light set). Ten Indian vehicles in fine voxel boxes:
   auto-rickshaw, hatchback, sedan, SUV, black-and-yellow taxi, city bus, truck with a painted tailgate, three-wheeler tempo, water tanker
   and a mini pickup, each in a few colours. Every vehicle model is one shared geometry, and all vehicles of one model and colour are
   drawn together as one instanced mesh, so a street full of traffic costs a handful of draw calls. Forward is local +z. */
'use strict';

var CONFIG = require('../data/config');
var boxmesh = require('./boxmesh');
var kit = require('../sim/arenakit');
var rngMod = require('../core/rng');
var C = kit.C;

/* wheels: a stepped disc seen from the side, with a hub */
function wheel(K, u, v, r, w) {
  var hw = (w || 0.22) / 2;
  K.b(u - hw, r * 0.3, v - r, u + hw, r * 1.7, v + r, C.CHAR); K.b(u - hw, 0, v - r * 0.7, u + hw, r * 2, v + r * 0.7, C.CHAR);
  K.b(u - hw - 0.01, r * 0.6, v - r * 0.4, u + hw + 0.01, r * 1.4, v + r * 0.4, C.GREY);
}
function plate(K, v, y, yellow) { K.b(-0.26, y, v, 0.26, y + 0.12, v + (v > 0 ? 0.02 : -0.02), yellow ? C.LEMON : C.OFFWHITE); for (var i = 0; i < 4; i++) K.b(-0.2 + i * 0.11, y + 0.04, v + (v > 0 ? 0.02 : -0.02), -0.14 + i * 0.11, y + 0.08, v + (v > 0 ? 0.025 : -0.025), C.BLACK); }

/* a car body: low hood at the front, the glass house, a boot; L long, W wide */
function car(K, o) {
  var L = o.len / 2, W = o.w / 2, base = 0.28, belt = o.belt || 0.85, roof = o.roof || 1.45, col = o.col, hood = o.hood || 0.95, boot = o.boot === undefined ? 0.6 : o.boot, i;
  K.b(-W, base, -L, W, belt, L, col);                                                        /* lower body */
  K.b(-W - 0.01, base, -L + 0.5, W + 0.01, base + 0.12, L - 0.5, C.DARK);                     /* sill */
  var gF = L - hood, gB = -L + boot;                                                           /* glass house from gB to gF */
  K.b(-W + 0.06, belt, gB, W - 0.06, roof - 0.08, gF, C.SLATE);
  K.b(-W + 0.1, roof - 0.1, gB + 0.2, W - 0.1, roof, gF - 0.2, o.roofCol === undefined ? col : o.roofCol);
  for (i = 0; i < 3; i++) { var p = gB + 0.12 + (gF - gB - 0.24) * i / 2; K.b(-W + 0.05, belt, p - 0.05, W - 0.05, roof - 0.08, p + 0.05, col); }   /* pillars */
  K.b(-W + 0.02, belt - 0.02, gF - 0.05, W - 0.02, belt + 0.06, gF + 0.25, col); K.b(-W + 0.02, belt - 0.02, gB - 0.25, W - 0.02, belt + 0.06, gB + 0.05, col);
  K.b(-W - 0.12, belt - 0.05, gF - 0.25, -W, belt + 0.08, gF - 0.12, col); K.b(W, belt - 0.05, gF - 0.25, W + 0.12, belt + 0.08, gF - 0.12, col);   /* mirrors */
  K.b(-W - 0.02, base + 0.05, L - 0.04, W + 0.02, base + 0.25, L + 0.08, C.GREY); K.b(-W - 0.02, base + 0.05, -L - 0.08, W + 0.02, base + 0.25, -L + 0.04, C.GREY);   /* bumpers */
  K.b(-W + 0.08, belt - 0.25, L, -W + 0.4, belt - 0.08, L + 0.03, C.LEMON); K.b(W - 0.4, belt - 0.25, L, W - 0.08, belt - 0.08, L + 0.03, C.LEMON);
  K.b(-W + 0.06, belt - 0.25, -L - 0.03, -W + 0.34, belt - 0.08, -L, C.CRIMSON); K.b(W - 0.34, belt - 0.25, -L - 0.03, W - 0.06, belt - 0.08, -L, C.CRIMSON);
  K.b(-0.35, belt - 0.3, L, 0.35, belt - 0.12, L + 0.02, C.DARK);                               /* grille */
  plate(K, L + 0.08, base + 0.08, o.taxi); plate(K, -L - 0.08, base + 0.3, o.taxi);
  K.b(-W - 0.01, base + 0.3, 0.05, W + 0.01, belt - 0.06, 0.08, C.DARK);                        /* door line */
  K.b(-W - 0.02, belt - 0.2, 0.25, -W, belt - 0.15, 0.4, C.GREY); K.b(W, belt - 0.2, 0.25, W + 0.02, belt - 0.15, 0.4, C.GREY);
  var wr = 0.3, wf = L - 0.7, wb = -L + 0.7;
  [wf, wb].forEach(function (v) { K.b(-W - 0.012, base + 0.2, v - 0.44, -W + 0.02, base + 0.32, v + 0.44, C.DARK); K.b(W - 0.02, base + 0.2, v - 0.44, W + 0.012, base + 0.32, v + 0.44, C.DARK); wheel(K, -W + 0.1, v, wr); wheel(K, W - 0.1, v, wr); });
  if (o.rails) { K.b(-W + 0.12, roof, gB + 0.3, -W + 0.2, roof + 0.08, gF - 0.3, C.GREY); K.b(W - 0.2, roof, gB + 0.3, W - 0.12, roof + 0.08, gF - 0.3, C.GREY); }
  if (o.spare) { K.b(-0.32, base + 0.2, -L - 0.25, 0.32, base + 0.84, -L - 0.08, C.CHAR); K.b(-0.14, base + 0.4, -L - 0.27, 0.14, base + 0.64, -L - 0.25, C.GREY); }
  if (o.taxi) { K.b(-0.3, roof, -0.1, 0.3, roof + 0.18, 0.15, C.LEMON); K.b(-W - 0.01, belt - 0.32, -L + 0.2, W + 0.01, belt - 0.26, L - 0.2, C.LEMON); }
}

var BUILD = {
  car: function (K, look) { car(K, { len: 3.7, w: 1.66, roof: 1.48, hood: 0.95, boot: 0.35, col: [C.RED, C.OFFWHITE, C.NAVY, C.GREYP][look] }); },               /* hatchback */
  sedan: function (K, look) { car(K, { len: 4.4, w: 1.74, roof: 1.45, hood: 1.15, boot: 0.95, col: [C.STEEL, C.OFFWHITE, C.CHAR, C.BRICK2][look] }); },
  suv: function (K, look) { car(K, { len: 4.6, w: 1.86, belt: 1.05, roof: 1.85, hood: 1.05, boot: 0.15, col: [C.OFFWHITE, C.CHAR, C.DGREEN, C.STEEL][look], rails: true, spare: true }); },
  taxi: function (K, look) { car(K, { len: 4.1, w: 1.64, roof: 1.55, hood: 1.0, boot: 0.8, col: C.BLACK, roofCol: C.LEMON, taxi: true }); },
  auto: function (K, look) { K.at(0, 0, 0); kit.P.auto(K, look % 2); },
  bus: function (K, look) {
    var L = 5.25, W = 1.25, col = [C.CRIMSON, C.BLUE, C.LEAF, C.MARIGOLD][look], x;
    K.b(-W, 0.45, -L, W, 3.0, L, col); K.b(-W - 0.01, 1.25, -L + 0.3, W + 0.01, 2.35, L - 1.6, C.SLATE);
    for (x = -L + 0.3; x < L - 1.6; x += 1.15) { K.b(-W - 0.02, 1.25, x, W + 0.02, 2.35, x + 0.08, C.OFFWHITE); }
    K.b(-W - 0.02, 0.45, -L, W + 0.02, 0.6, L, C.OFFWHITE); K.b(-W - 0.02, 2.3, -L, W + 0.02, 2.42, L, C.OFFWHITE); K.b(-W + 0.05, 3.0, -L + 0.2, W - 0.05, 3.2, L - 0.2, C.OFFWHITE);
    K.b(W, 0.5, L - 1.5, W + 0.03, 2.35, L - 0.5, C.DARK); K.b(W, 0.5, -0.6, W + 0.03, 2.35, 0.4, C.DARK);
    K.b(-W + 0.05, 1.0, L, W - 0.05, 2.7, L + 0.03, C.SLATE); K.b(-W + 0.1, 2.75, L, W - 0.1, 2.95, L + 0.04, C.BLACK); K.b(-W + 0.2, 2.78, L + 0.04, -W + 1.2, 2.92, L + 0.05, C.LEMON);
    K.b(-W - 0.02, 0.4, L - 0.04, W + 0.02, 0.62, L + 0.1, C.GREY); K.b(-W + 0.1, 0.65, L, -W + 0.4, 0.85, L + 0.04, C.LEMON); K.b(W - 0.4, 0.65, L, W - 0.1, 0.85, L + 0.04, C.LEMON);
    K.b(-W + 0.1, 0.7, -L - 0.03, -W + 0.35, 1.0, -L, C.CRIMSON); K.b(W - 0.35, 0.7, -L - 0.03, W - 0.1, 1.0, -L, C.CRIMSON); K.b(-W + 0.1, 1.4, -L - 0.03, W - 0.1, 2.6, -L, C.SLATE);
    K.b(-W - 0.15, 2.0, L - 0.3, -W, 2.1, L - 0.1, C.DARK); K.b(W, 2.0, L - 0.3, W + 0.15, 2.1, L - 0.1, C.DARK);
    plate(K, L + 0.1, 0.45, true); plate(K, -L - 0.03, 0.62, true);
    [L - 1.4, -L + 1.5].forEach(function (v) { K.b(-W - 0.012, 0.42, v - 0.6, -W + 0.02, 0.5, v + 0.6, C.DARK); K.b(W - 0.02, 0.42, v - 0.6, W + 0.012, 0.5, v + 0.6, C.DARK); wheel(K, -W + 0.14, v, 0.48, 0.28); wheel(K, W - 0.14, v, 0.48, 0.28); });
  },
  truck: function (K, look) {
    var col = [C.MARIGOLD, C.LEAF, C.CRIMSON, C.BLUE][look], load = [C.SAFFRON, C.DGREEN, C.NAVY, C.OLIVE][look], x;
    K.b(-1.15, 0.55, -3.0, 1.15, 0.8, 3.0, C.DARK);
    K.b(-1.1, 0.8, 1.7, 1.1, 2.6, 3.0, col); K.b(-1.0, 1.75, 3.0, 1.0, 2.45, 3.04, C.SLATE); K.b(-1.12, 2.6, 1.6, 1.12, 2.95, 2.95, col);
    K.b(-1.12, 1.6, 1.8, -1.1, 2.4, 2.8, C.SLATE); K.b(1.1, 1.6, 1.8, 1.12, 2.4, 2.8, C.SLATE);
    for (x = 0; x < 6; x++) K.b(-0.95 + x * 0.32, 2.62, 2.95, -0.75 + x * 0.32, 2.88, 3.02, [C.CRIMSON, C.LEMON, C.LEAF, C.MAGENTA, C.MARIGOLD, C.WHITE][x]);   /* the painted crown */
    K.b(-1.15, 0.7, 3.0, 1.15, 0.95, 3.12, C.GREY); K.b(-0.95, 1.05, 3.0, -0.65, 1.3, 3.06, C.LEMON); K.b(0.65, 1.05, 3.0, 0.95, 1.3, 3.06, C.LEMON);
    K.b(-1.15, 0.8, -3.0, 1.15, 2.1, 1.6, col); K.b(-1.16, 2.1, -3.0, 1.16, 2.9, 1.5, load);                      /* the body and its tarp load */
    for (x = -2.8; x < 1.5; x += 0.6) K.b(-1.17, 0.9, x, 1.17, 2.0, x + 0.06, C.WOOD2);
    K.b(-1.1, 0.9, -3.04, 1.1, 2.0, -3.0, C.LEMON); K.b(-1.0, 1.25, -3.06, 1.0, 1.7, -3.04, C.CRIMSON);           /* the HORN OK PLEASE board */
    for (x = 0; x < 9; x++) K.b(-0.9 + x * 0.2, 1.36, -3.08, -0.8 + x * 0.2, 1.6, -3.06, C.LEMON);
    K.b(-1.1, 0.8, -3.04, -0.85, 1.05, -3.0, C.CRIMSON); K.b(0.85, 0.8, -3.04, 1.1, 1.05, -3.0, C.CRIMSON);
    plate(K, 3.14, 0.75, true); plate(K, -3.08, 0.6, true);
    [2.2, -1.5, -2.5].forEach(function (v) { wheel(K, -1.05, v, 0.48, 0.3); wheel(K, 1.05, v, 0.48, 0.3); });
  },
  tempo: function (K, look) {
    var col = [C.DGREEN, C.BLUE, C.MARIGOLD, C.OFFWHITE][look];
    K.b(-0.75, 0.35, 0.6, 0.75, 1.55, 1.75, col); K.b(-0.7, 1.0, 1.75, 0.7, 1.5, 1.79, C.SLATE); K.b(-0.8, 1.55, 0.55, 0.8, 1.68, 1.85, col);
    K.b(-0.4, 0.3, 1.75, 0.4, 0.6, 2.0, col); K.b(-0.12, 0.62, 1.8, 0.12, 0.8, 1.85, C.LEMON); plate(K, 2.0, 0.35, true);
    K.b(-0.9, 0.5, -1.75, 0.9, 0.62, 0.55, C.WOOD); K.b(-0.92, 0.62, -1.75, -0.86, 1.15, 0.55, C.WOOD2); K.b(0.86, 0.62, -1.75, 0.92, 1.15, 0.55, C.WOOD2); K.b(-0.92, 0.62, -1.79, 0.92, 1.15, -1.73, C.WOOD2);
    for (var i = 0; i < 6; i++) K.b(-0.8 + (i % 3) * 0.55, 0.62, -1.6 + Math.floor(i / 3) * 1.0, -0.3 + (i % 3) * 0.55, 1.05, -0.8 + Math.floor(i / 3) * 1.0, [C.WOOD, C.KHAKI, C.CRIMSON][i % 3]);
    K.b(-0.85, 0.5, -1.82, -0.6, 0.7, -1.79, C.CRIMSON); K.b(0.6, 0.5, -1.82, 0.85, 0.7, -1.79, C.CRIMSON);
    wheel(K, 0, 1.45, 0.3, 0.18); wheel(K, -0.82, -1.0, 0.3); wheel(K, 0.82, -1.0, 0.3);
  },
  tanker: function (K, look) {
    var col = [C.BLUE, C.OFFWHITE, C.MARIGOLD, C.LEAF][look], k;
    K.b(-1.1, 0.5, -3.1, 1.1, 0.75, 3.1, C.DARK); K.b(-1.05, 0.75, 1.6, 1.05, 2.6, 3.1, col); K.b(-0.95, 1.7, 3.1, 0.95, 2.4, 3.14, C.SLATE); K.b(-1.07, 2.6, 1.6, 1.07, 2.8, 3.0, col);
    for (k = 0; k < 3; k++) K.b(-1.05 + k * 0.08, 0.85 + k * 0.1, -3.0, 1.05 - k * 0.08, 2.35 - k * 0.1, 1.4, k === 1 ? C.STEEL : C.OFFWHITE);
    K.b(-0.25, 2.35, -1.0, 0.25, 2.5, -0.6, C.STEEL); for (k = -2.6; k < 1.2; k += 1.2) K.b(-1.1, 1.5, k, 1.1, 1.58, k + 0.08, C.GREY);
    K.b(-0.5, 0.75, -3.15, 0.5, 1.2, -3.05, C.BLUE); K.b(-0.1, 0.6, -3.2, 0.1, 0.8, -3.1, C.BRASS);
    K.b(-1.1, 0.68, 3.1, 1.1, 0.9, 3.2, C.GREY); K.b(-0.9, 1.0, 3.1, -0.6, 1.2, 3.15, C.LEMON); K.b(0.6, 1.0, 3.1, 0.9, 1.2, 3.15, C.LEMON);
    plate(K, 3.22, 0.7, true);
    [2.3, -1.5, -2.5].forEach(function (v) { wheel(K, -1.0, v, 0.46, 0.3); wheel(K, 1.0, v, 0.46, 0.3); });
  },
  pickup: function (K, look) {                                                                 /* the mini truck (a "chhota hathi") */
    var col = [C.OFFWHITE, C.STEEL, C.CRIMSON, C.BLUE][look];
    K.b(-0.75, 0.35, 0.8, 0.75, 1.75, 1.95, col); K.b(-0.7, 1.1, 1.95, 0.7, 1.65, 1.99, C.SLATE); K.b(-0.76, 1.1, 0.95, -0.74, 1.6, 1.8, C.SLATE); K.b(0.74, 1.1, 0.95, 0.76, 1.6, 1.8, C.SLATE);
    K.b(-0.76, 0.35, 1.95, 0.76, 0.5, 2.05, C.GREY); K.b(-0.65, 0.6, 1.99, -0.4, 0.75, 2.02, C.LEMON); K.b(0.4, 0.6, 1.99, 0.65, 0.75, 2.02, C.LEMON); plate(K, 2.06, 0.38, true);
    K.b(-0.8, 0.45, -1.95, 0.8, 0.6, 0.75, C.DARK); K.b(-0.82, 0.6, -1.95, -0.76, 1.1, 0.75, col); K.b(0.76, 0.6, -1.95, 0.82, 1.1, 0.75, col); K.b(-0.82, 0.6, -1.99, 0.82, 1.1, -1.93, col);
    K.b(-0.7, 0.6, -1.8, 0.7, 1.3, 0.6, [C.OLIVE, C.NAVY, C.KHAKI, C.SAFFRON][look]); K.b(-0.82, 0.6, -2.02, -0.6, 0.8, -1.99, C.CRIMSON); K.b(0.6, 0.6, -2.02, 0.82, 0.8, -1.99, C.CRIMSON);
    [1.35, -1.25].forEach(function (v) { wheel(K, -0.72, v, 0.3); wheel(K, 0.72, v, 0.3); });
  }
};
var LOOKS = 4;

function createRideTraffic(parent) {
  var mat = new THREE.MeshLambertMaterial({ vertexColors: true }), sets = {}, geos = [];
  var blobGeo = new THREE.CircleGeometry(0.5, 16); blobGeo.rotateX(-Math.PI / 2);
  var blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  var blobs = new THREE.InstancedMesh(blobGeo, blobMat, 256); blobs.renderOrder = 2; blobs.frustumCulled = false; blobs.count = 0; parent.add(blobs);
  var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0), tris = 0;
  function set(kind, look) {
    var key = kind + look, s = sets[key];
    if (s) return s;
    var K = kit.createBuilder(rngMod.createRng(7 + look)); K.at(0, 0, 0);
    (BUILD[kind] || BUILD.car)(K, look);
    var a = boxmesh.boxesToArrays(K.out.boxes, CONFIG.PALETTE), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1)); g.computeBoundingSphere(); geos.push(g);
    var im = new THREE.InstancedMesh(g, mat, 48); im.count = 0; im.frustumCulled = false; parent.add(im);
    s = sets[key] = { im: im, n: 0, tris: a.triangles }; return s;
  }
  return {
    LOOKS: LOOKS, kinds: Object.keys(BUILD),
    /* draw this frame's vehicles: list of {kind, look, x, z, h, len, r} */
    draw: function (list) {
      var k, i, nb = 0; for (k in sets) sets[k].n = 0; tris = 0;
      for (i = 0; i < list.length; i++) {
        var v = list[i], s = set(v.kind, v.look % LOOKS); if (s.n >= 48) continue;
        Q.setFromAxisAngle(Y, v.h); P.set(v.x, 0, v.z); Sc.set(1, 1, 1); M.compose(P, Q, Sc); s.im.setMatrixAt(s.n++, M); tris += s.tris;
        if (nb < 256) { P.set(v.x + 0.35, 0.05, v.z + 0.25); Sc.set(v.r * 2.6, 1, v.len * 1.1); M.compose(P, Q, Sc); blobs.setMatrixAt(nb++, M); }
      }
      for (k in sets) { sets[k].im.count = sets[k].n; sets[k].im.instanceMatrix.needsUpdate = true; }
      blobs.count = nb; blobs.instanceMatrix.needsUpdate = true;
    },
    triangles: function () { return tris; },
    dispose: function () {
      for (var k in sets) parent.remove(sets[k].im); parent.remove(blobs);
      geos.forEach(function (g) { g.dispose(); }); mat.dispose(); blobGeo.dispose(); blobMat.dispose(); sets = {};
    }
  };
}

module.exports = { createRideTraffic: createRideTraffic, BUILD: BUILD, LOOKS: LOOKS };
