/* view: builds the Toofan voxel parts at 2.5 cm. Every part is its own grid with a pivot at its joint,
   so the rig can bend it. Facing +z, up +y, the hero's left is +x. side s: +1 left, -1 right. Pure, no THREE. */
'use strict';

var vg = require('./voxgrid');
var h = vg.hex, mix = vg.mix;

var C = {
  skin: h('#9a5f38'), skinD: h('#7f4b2b'), skinL: h('#b4733f'), skinDD: h('#69391f'),
  hair: h('#14100e'), yel: h('#ffc21a'), yelD: h('#d99a0e'),
  blu: h('#1f56c8'), bluD: h('#16408f'), bluL: h('#2f6be0'),
  pants: h('#1d4bb5'), pantsD: h('#143a8c'), pantsL: h('#2a5fcf'),
  shoe: h('#17181a'), shoeL: h('#2a2c31'), sole: h('#08080a'), lace: h('#9aa0a8'),
  belt: h('#2a2118'), buckle: h('#d8dde2'), buckleD: h('#6b7078'), glove: h('#1b1b1b'), gloveL: h('#2c2c30'),
  mouth: h('#6a2f26'), white: h('#f2f2f2'), pupil: h('#1a1a1a')
};

var TH = false;   /* true while building the thug variant: plain cropped hair, bare face, no guitar */

function lerpAt(tbl, y) { return vg.interp(tbl, y); }

/* ---------- head ---------- */
function buildHead() {
  var g = vg.createGrid(11, 18, 13), cx = 5.5;
  function headCol(x, y, z) {
    if (y >= 11 && y <= 12) return C.blu;                                   /* headband */
    if (y >= 13) return C.hair;
    if (z <= 3 && y >= 4) return C.hair;                                    /* back of head */
    if (!TH && (x <= 1 || x >= 9) && z <= 9 && y >= 3) return C.hair;              /* long side locks */
    return C.skin;
  }
  vg.ellipsoid(g, cx, 8.0, 6.0, 4.6, 6.0, 4.8, headCol);                    /* skull */
  vg.ellipsoid(g, cx, 4.3, 6.6, 3.9, 3.2, 4.0, headCol);                    /* jaw */
  vg.ellipsoid(g, cx, 14.4, 7.4, 2.7, 2.0, 3.3, C.hair);                    /* quiff body */
  vg.ellipsoid(g, cx, 15.4, 8.6, 2.0, 1.4, 2.2, C.hair);                    /* swept-up front */
  var HAIR2 = h('#241a16');
  function hc(x, y, z) { return ((x * 7 + y * 3 + z * 5) % 4 === 0) ? HAIR2 : C.hair; }
  vg.ellipsoid(g, cx, 12.2, 6.0, 5.4, 3.8, 5.4, function (x, y, z) { return y >= 13 ? hc(x, y, z) : null; }); /* full crown, swept back */
  if (!TH) vg.ellipsoid(g, cx, 6.6, 3.0, 4.9, 6.2, 3.0, function (x, y, z) { return y >= 3 ? hc(x, y, z) : null; });  /* thick back and nape */
  vg.ellipsoid(g, cx, 10.0, 6.0, 5.3, 2.6, 5.2, function (x, y, z) { return (y >= 11 && z <= 6) ? hc(x, y, z) : null; }); /* hair sweeping over the band at the sides */
  /* long side locks falling past the ears to the jaw */
  if (!TH) [0, 1, 9, 10].forEach(function (x) { vg.box(g, x, 3, 2, x, 10, 9, function (xx, yy, zz) { return hc(xx, yy, zz); }); });
  /* surface details */
  function face(x, y, off, c) { var z = vg.frontZ(g, x, y); if (z >= 0) vg.set(g, x, y, z + off, c); }
  if (TH) {                                                                                            /* thug face: eyes, brows, nose, stubble, scowl */
    [2, 3, 4, 6, 7, 8].forEach(function (x) { face(x, 7, 1, C.white); face(x, 8, 1, C.hair); });
    face(3, 7, 1, C.pupil); face(7, 7, 1, C.pupil); face(5, 6, 1, C.skin); face(5, 5, 2, C.skinL);
    [3, 4, 5, 6, 7].forEach(function (x) { face(x, 2, 0, C.mouth); });
    for (var sy = 0; sy <= 3; sy++) for (var sx = 2; sx <= 8; sx++) if (vg.h3(sx, sy, 3, 5) < 0.45 && !(sy === 2)) face(sx, sy, 0, C.skinDD);
  } else {
  /* aviator-style sunglasses: black frame, deep-blue lenses with a glint, temple arms to the ears */
  var LENS = h('#0d1b3a'), LENS2 = h('#16306b'), FRAME = h('#0b0b0d');
  [2, 3, 4, 6, 7, 8].forEach(function (x) { face(x, 8, 1, FRAME); face(x, 5, 0, C.skin); });             /* top rim */
  [2, 3, 4, 6, 7, 8].forEach(function (x) { face(x, 7, 1, (x === 2 || x === 6) ? LENS2 : LENS); face(x, 6, 1, (x === 4 || x === 8) ? LENS : LENS2); });
  face(3, 7, 1, h('#5b8cff')); face(7, 7, 1, h('#5b8cff'));                                                          /* glint */
  face(5, 7, 1, FRAME); face(1, 7, 0, FRAME); face(9, 7, 0, FRAME);                                    /* bridge + temples */
  [2, 3, 4, 6, 7, 8].forEach(function (x) { face(x, 5, 1, FRAME); });                                  /* bottom rim */
  face(5, 6, 1, C.skin); face(5, 5, 2, C.skinL); face(4, 5, 1, C.skin); face(6, 5, 1, C.skin);        /* nose */
  face(5, 8, 0, C.skin);
  /* rugged beard and moustache: extruded, two tones, a few grey flecks, cheek line left ragged */
  var GREY = h('#4b4540'), BRD = h('#1b1411');
  function tuft(x, y, off) {
    var z0 = vg.frontZ(g, x, y); if (z0 < 0 || z0 + off > 12) return;
    var r = vg.h3(x, y, 7, 11), col = r < 0.07 ? GREY : (r < 0.5 ? HAIR2 : BRD);
    for (var o = 1; o <= off; o++) vg.set(g, x, y, z0 + o, col);
  }
  for (var by = 0; by <= 9; by++) for (var bx = 1; bx <= 9; bx++) {
    var ax = Math.abs(bx - 5);
    if (by >= 6) { if (ax >= 4) tuft(bx, by, 1); continue; }                                           /* hair over the temples, only the forehead stays bare */
    if (by === 5 && ax < 4) continue;                                                                  /* lens rims */
    if (by === 4 && ax < 2) continue;                                                                  /* under the nose */
    if (by === 2 && ax <= 1) continue;                                                                 /* mouth gap */
    if (by === 0 && ax > 3) continue;
    var depth = (by <= 1 && ax <= 2) ? 2 : 1;
    if (by === 0 && ax <= 1) depth = 3;
    tuft(bx, by, depth);
  }
  for (var mx = 2; mx <= 8; mx++) { tuft(mx, 3, 2); if (Math.abs(mx - 5) >= 2) tuft(mx, 2, 1); if (Math.abs(mx - 5) >= 3) tuft(mx, 1, 1); }   /* thick moustache, drooping ends */
  face(5, 2, 0, C.mouth); face(4, 2, 0, C.mouth); face(6, 2, 0, C.mouth);                              /* lips just visible between moustache and beard */
  }
  if (!TH) { face(5, 11, 1, C.yel); face(5, 12, 1, C.yel); face(4, 11, 0, C.yelD); face(6, 11, 0, C.yelD); }          /* headband stud */
  return { grid: g, pivot: { x: 5.5, y: 1.5, z: 5.0 } };
}

/* ---------- neck ---------- */
function buildNeck() {
  var g = vg.createGrid(7, 7, 7), tbl = [[0, 3.2, 3.0], [3, 2.9, 2.7], [7, 2.9, 2.7]];
  vg.limb(g, tbl, 3.5, 3.5, 0, 6, function (x, y, z) { return (z >= 4 && y >= 2) ? C.skinD : C.skin; });
  return { grid: g, pivot: { x: 3.5, y: 1.0, z: 3.5 } };
}

/* ---------- torso: V taper, pecs, abs, sash ---------- */
function buildTorso() {
  var W = 25, H = 25, D = 13, cx = 12.5, cz = 6.5, g = vg.createGrid(W, H, D);
  var prof = [[0, 7.0, 4.8], [2, 6.7, 4.5], [5, 6.9, 4.6], [8, 7.8, 4.8], [11, 8.8, 5.1], [14, 9.6, 5.5], [17, 10.0, 5.1], [19, 10.0, 4.6],
              [21, 8.0, 3.9], [22, 6.0, 3.6], [23, 4.6, 3.3], [25, 3.0, 3.0]];
  function col(x, y, z) {
    var dx = x + 0.5 - cx, dz = z + 0.5 - cz, front = dz > 0.4, adx = Math.abs(dx);
    if (y <= 1) {                                                           /* belt and buckle */
      if (front && adx < 2.6 && dz > 3.2) return (adx > 1.6 || y === 0) ? C.buckle : C.buckleD;
      return C.belt;
    }
    if (y >= 20) return (z + 0.5 > cz + 2.6 && adx < 3.4 && y <= 20) ? C.skinD : C.skin;      /* trapezius and neck base */
    if (front && y >= 15 && adx <= (y - 13.4) * 0.42) return (adx < 0.6 && y >= 16) ? C.skinD : C.skin;      /* V neck */
    if (!front && y >= 17 && adx <= 3.2) return C.skin;                      /* back neckline */
    if (adx >= 9.1 && y >= 14) return C.skin;                                /* armhole */
    if (Math.abs(dx + (y - 11) * 0.95) <= 1.9) return (Math.abs(dx + (y - 11) * 0.95) > 1.3) ? C.yelD : C.yel;   /* sash */
    var c = C.blu;
    if (front && dz > 2.6) {
      if (y === 5 || y === 8) c = C.bluD;                                    /* ab creases through the fabric */
      if (y >= 3 && y <= 10 && adx < 0.9) c = C.bluD;
      if (y === 12 && adx > 0.5) c = C.bluD;                                 /* under the pecs */
    }
    if (!front && adx < 0.7 && y >= 4 && y <= 18) c = C.bluD;                /* spine groove */
    if (y === 2) c = C.bluD;                                                 /* hem */
    if (adx > 6.8 && y < 12) c = mix(c, C.bluD, 0.45);                       /* flanks */
    return c;
  }
  for (var y = 0; y < H; y++) {
    var v = lerpAt(prof, y + 0.5), hw = v[0], hd = v[1];
    for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
      var dx = (x + 0.5 - cx) / hw, dz = (z + 0.5 - cz) / hd;
      if (dx * dx + dz * dz <= 1) vg.set(g, x, y, z, col(x, y, z));
    }
  }
  [1, -1].forEach(function (s) { vg.ellipsoid(g, cx + s * 4.3, 14.0, cz + 3.7, 3.8, 2.9, 2.1, col); });         /* pecs */
  [1, -1].forEach(function (s) { vg.ellipsoid(g, cx + s * 8.4, 13.5, cz - 1.2, 2.2, 4.0, 2.4, col); });        /* lats */
  return { grid: g, pivot: { x: cx, y: 2.0, z: cz } };
}

/* ---------- pelvis ---------- */
function buildPelvis() {
  var W = 17, H = 11, D = 11, cx = 8.5, cz = 5.5, g = vg.createGrid(W, H, D);
  var prof = [[0, 4.6, 3.6], [2, 6.8, 4.6], [5, 7.5, 4.9], [8, 6.5, 4.4], [10, 6.0, 4.0]];
  function col(x, y, z) {
    var dx = Math.abs(x + 0.5 - cx), front = z + 0.5 > cz;
    if (front && dx < 0.6 && y >= 3 && y <= 8) return C.pantsD;
    if (!front && dx < 0.6 && y >= 2) return C.pantsD;
    return C.pants;
  }
  for (var y = 0; y < 10; y++) {
    var v = lerpAt(prof, y + 0.5);
    for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
      var dx = (x + 0.5 - cx) / v[0], dz = (z + 0.5 - cz) / v[1];
      if (dx * dx + dz * dz <= 1) vg.set(g, x, y, z, col(x, y, z));
    }
  }
  [1, -1].forEach(function (s) { vg.ellipsoid(g, cx + s * 3.2, 3.8, cz - 3.0, 3.5, 3.3, 2.6, col); });
  return { grid: g, pivot: { x: cx, y: 4.0, z: cz } };
}

/* ---------- leg parts ---------- */
function buildThigh(s) {
  var g = vg.createGrid(11, 22, 11), cx = 5.5, cz = 5.5;
  var tbl = [[0, 3.0, 3.1], [2, 3.7, 3.9], [6, 4.3, 4.4], [11, 4.8, 5.0], [15, 5.0, 5.1], [19, 4.8, 4.8], [21, 4.0, 4.0], [22, 2.6, 2.6]];
  function col(x, y, z) {
    var dx = (x + 0.5 - cx) * s, rx = lerpAt(tbl, y + 0.5)[0];
    if (dx >= rx - 1.7 && y >= 1 && y <= 20 && Math.abs(z + 0.5 - cz) <= 1.1) return C.yel;
    if (dx <= -rx + 1.3) return C.pantsD;
    return (z + 0.5 < cz - 3.4) ? C.pantsD : C.pants;
  }
  vg.limb(g, tbl, cx, cz, 0, 21, col);
  vg.ellipsoid(g, cx + s * 0.5, 10.8, cz + 3.3, 3.0, 4.7, 2.2, col);                  /* quad */
  vg.ellipsoid(g, cx - s * 0.4, 12.5, cz - 3.3, 3.2, 4.2, 2.0, col);                  /* hamstring */
  return { grid: g, pivot: { x: cx, y: 19.0, z: cz } };
}

function buildShin(s) {
  var g = vg.createGrid(9, 21, 11), cx = 4.5, cz = 5.5;
  var tbl = [[0, 2.4, 2.6], [3, 2.6, 2.8], [7, 3.1, 3.4], [12, 3.7, 4.0], [16, 3.8, 3.9], [18.5, 3.9, 3.9], [21, 3.2, 3.2]];
  function col(x, y, z) {
    var dx = (x + 0.5 - cx) * s, rx = lerpAt(tbl, y + 0.5)[0];
    if (y <= 2) return C.pantsD;                                                     /* cuff */
    if (dx >= rx - 1.5 && y <= 20 && Math.abs(z + 0.5 - cz) <= 1.1) return C.yel;
    if (dx <= -rx + 1.1) return C.pantsD;
    return C.pants;
  }
  vg.limb(g, tbl, cx, cz, 1, 20, col);
  vg.ellipsoid(g, cx, 11.5, cz - 1.9, 3.0, 3.6, 2.4, col);                           /* calf */
  vg.ellipsoid(g, cx, 18.0, cz + 3.3, 3.1, 2.5, 1.7, function () { return C.pantsD; });  /* knee pad */
  vg.ellipsoid(g, cx, 18.4, cz + 3.9, 1.9, 1.3, 1.0, function () { return C.pants; });
  return { grid: g, pivot: { x: cx, y: 18.5, z: cz } };
}

function buildFoot() {
  var W = 9, H = 7, D = 8, cx = 4.5, g = vg.createGrid(W, H, D);
  var hwT = [[0, 2.3], [2, 2.4], [4, 2.7], [7, 2.9], [8, 2.6]], topT = [[0, 5.0], [2, 5.0], [3, 4.0], [5, 3.0], [7, 2.6], [8, 2.2]];
  for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
    var hw = lerpAt(hwT, z + 0.5)[0], top = lerpAt(topT, z + 0.5)[0], dx = Math.abs(x + 0.5 - cx);
    if (dx > hw) continue;
    var yt = Math.round(top * (1 - Math.pow(dx / hw, 4) * 0.4));
    for (var y = 0; y < yt; y++) {
      var c = C.shoe;
      if (y === 0) c = C.sole;
      else if (z >= 6 && y === yt - 1) c = C.shoeL;                                  /* toe cap */
      else if (z >= 3 && z <= 6 && dx < 1.1 && y === yt - 1) c = (z & 1) ? C.lace : C.shoeL;     /* laces */
      else if (z <= 1 && y >= 2) c = C.shoeL;                                        /* heel counter */
      vg.set(g, x, y, z, c);
    }
  }
  return { grid: g, pivot: { x: cx, y: 3.0, z: 2.5 } };
}

function buildToe() {
  var W = 9, H = 4, D = 4, cx = 4.5, g = vg.createGrid(W, H, D);
  var hwT = [[0, 2.9], [2, 2.7], [4, 1.7]], topT = [[0, 2.6], [2, 2.3], [4, 1.2]];
  for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
    var hw = lerpAt(hwT, z + 0.5)[0], top = lerpAt(topT, z + 0.5)[0], dx = Math.abs(x + 0.5 - cx);
    if (dx > hw) continue;
    var yt = Math.max(1, Math.round(top * (1 - Math.pow(dx / hw, 4) * 0.4)));
    for (var y = 0; y < yt; y++) vg.set(g, x, y, z, y === 0 ? C.sole : (y === yt - 1 ? C.shoeL : C.shoe));
  }
  return { grid: g, pivot: { x: cx, y: 1.0, z: 0.0 } };
}

/* ---------- arm parts ---------- */
function buildUpperArm(s) {
  var g = vg.createGrid(11, 18, 11), cx = 5.5, cz = 5.5;
  var tbl = [[0, 2.7, 2.7], [2, 3.0, 3.0], [6, 3.4, 3.4], [9, 3.7, 3.6], [12, 4.3, 4.3], [14, 4.5, 4.5], [16, 3.8, 3.8], [18, 2.5, 2.5]];
  function col(x, y, z) {
    var dz = z + 0.5 - cz;
    if (y === 2 && dz > 0) return C.skinD;                                           /* elbow crease */
    if (dz < -3.0 && y >= 4 && y <= 11) return C.skinD;                              /* triceps shade */
    return C.skin;
  }
  vg.limb(g, tbl, cx, cz, 0, 17, col);
  vg.ellipsoid(g, cx, 8.4, cz + 1.6, 2.7, 3.4, 2.3, function () { return C.skinL; }); /* biceps */
  vg.ellipsoid(g, cx, 14.4, cz, 4.1, 3.0, 3.9, col);                                 /* deltoid */
  vg.limb(g, tbl, cx, cz, 8, 9, C.yel, 0.45);                                        /* armband */
  return { grid: g, pivot: { x: cx, y: 14.0, z: cz } };
}

function buildForearm(s) {
  var g = vg.createGrid(9, 14, 9), cx = 4.5, cz = 4.5;
  var tbl = [[0, 2.2, 2.0], [1, 2.3, 2.1], [3, 2.6, 2.4], [6, 3.2, 3.0], [8, 3.5, 3.3], [11.5, 3.3, 3.3], [13, 2.8, 2.8], [14, 2.0, 2.0]];
  function col(x, y, z) {
    if (y <= 4) return (y === 4) ? C.gloveL : C.glove;                               /* wrist guard */
    var dz = z + 0.5 - cz;
    if (dz < -2.2 && y >= 6) return C.skinD;
    if (y >= 7 && y <= 9 && dz > 1.6) return C.skinL;                                /* forearm muscle */
    return C.skin;
  }
  vg.limb(g, tbl, cx, cz, 0, 13, col);
  vg.limb(g, tbl, cx, cz, 1, 3, function () { return C.glove; }, 0.35);
  return { grid: g, pivot: { x: cx, y: 11.5, z: cz } };
}

function buildHand(s) {
  var g = vg.createGrid(7, 8, 7), cx = 3.5, cz = 3.5;
  function col(x, y, z) {
    var dx = (x + 0.5 - cx) * s;
    if (y >= 5) return C.glove;                                                      /* glove over palm and back of hand */
    if (dx >= 1.0 && y >= 3) return C.glove;                                         /* back of hand */
    if (y <= 1 && dx < 1.0) return (z & 1) ? C.skinL : C.skin;                       /* knuckles */
    return (z & 1) ? C.skin : C.skinD;                                               /* curled fingers */
  }
  vg.ellipsoid(g, cx, 4.0, cz, 2.7, 3.6, 2.7, col);
  vg.ellipsoid(g, cx - s * 1.0, 4.6, cz + 2.7, 1.4, 2.0, 1.2, function () { return C.skin; });   /* thumb */
  return { grid: g, pivot: { x: cx, y: 7.0, z: cz } };
}

/* ---------- headband tail ---------- */
/* ---------- chin beard: a short tapering length below the jaw ---------- */
function buildBeard() {
  var W = 11, H = 5, D = 5, g = vg.createGrid(W, H, D), HAIR2 = h('#241a16'), GREY = h('#4b4540');
  for (var y = 0; y < H; y++) for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
    var hw = 4.0 - y * 0.6, dz = 2.6 - y * 0.2;
    var ex = (x + 0.5 - 5.5) / Math.max(1, hw), ez = (z + 0.5 - 2.5) / Math.max(1, dz);
    if (ex * ex + ez * ez > 1) continue;
    if (y <= 2 && vg.h3(x, y, z, 31) < (2 - y) * 0.2) continue;                                       /* ragged tip */
    var r = vg.h3(x, y, z, 17);
    vg.set(g, x, H - 1 - y, z, r < 0.07 ? GREY : (r < 0.5 ? HAIR2 : C.hair));
  }
  return { grid: g, pivot: { x: 5.5, y: H - 0.5, z: 2.5 } };
}

/* ---------- long hair: three hanging segments, each a flat tapered lock with ragged tips ---------- */
function buildHairSeg(i) {
  var W = 11, H = 5, D = 4, g = vg.createGrid(W, H, D), HAIR2 = h('#241a16'), hw = [5.0, 4.4, 3.4][i], dz = [3.6, 3.2, 2.4][i];
  for (var y = 0; y < H; y++) for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
    var ex = (x + 0.5 - 5.5) / hw, ez = (z + 0.5 - 2.0) / (dz / 2 + 0.2);
    if (ex * ex + ez * ez > 1) continue;
    if (i === 2 && y <= 2 && vg.h3(x, y, z, 21) < 0.45 + (2 - y) * 0.12) continue;                    /* ragged tips */
    if (i === 2 && y <= 1 && ((x * 3 + z) % 3 === 0)) continue;
    vg.set(g, x, y, z, ((x * 7 + y * 3 + z * 5 + i) % 4 === 0) ? HAIR2 : ((x + i) % 5 === 0 ? h('#0d0a09') : C.hair));
  }
  return { grid: g, pivot: { x: 5.5, y: H - 0.5, z: 2.0 } };
}

/* ---------- electric guitar. Grid axes: +y along the neck, +z out of the face (pickups side). Pivot at the body centre. ---------- */
function buildGuitar() {
  var W = 15, H = 36, D = 7, g = vg.createGrid(W, H, D), cx = 7.0;
  var RED = h('#c9261c'), REDD = h('#7d140f'), PICK = h('#f1e8d2'), CHROME = h('#cfd5da'), CHROMED = h('#7b838a'), NECK = h('#d9a85b'),
      FRET = h('#2f1d12'), FRETL = h('#8a6a44'), BLK = h('#121214'), GOLD = h('#ffc21a');
  function inBody(x, y) {
    var lx = (x + 0.5 - cx) / 6.4, ly = (y + 0.5 - 5.2) / 5.3, ux = (x + 0.5 - cx) / 5.2, uy = (y + 0.5 - 11.8) / 4.4;
    var horn = (x + 0.5 - (cx + 3.4)) * (x + 0.5 - (cx + 3.4)) / 4 + (y + 0.5 - 15.0) * (y + 0.5 - 15.0) / 5.0 <= 1;
    return lx * lx + ly * ly <= 1 || ux * ux + uy * uy <= 1 || horn;
  }
  for (var y = 0; y < 17; y++) for (var x = 0; x < W; x++) {
    if (!inBody(x, y)) continue;
    var edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);
    var d = Math.hypot(x + 0.5 - cx, (y + 0.5 - 8.5) * 0.7), burst = vg.mix(RED, REDD, Math.min(1, d / 8.2));
    for (var z = 0; z < 3; z++) {
      var c = burst;
      if (edge && z === 2) c = GOLD;                                       /* binding in the hero's yellow */
      else if (z === 0) c = REDD;
      vg.set(g, x, y, z, c);
    }
  }
  /* pickguard, pickups, bridge, knobs on the front face (z = 3 sits proud) */
  for (var py = 7; py <= 14; py++) for (var px = 3; px <= 11; px++) if (inBody(px, py) && inBody(px, py + 1) && ((px - cx) * (px - cx) * 0.12 + 0 < 3.4)) vg.set(g, px, py, 3, PICK);
  [9, 11, 13].forEach(function (yy) { for (var xx = 4; xx <= 10; xx++) vg.set(g, xx, yy, 4, (xx === 5 || xx === 7 || xx === 9) ? CHROME : BLK); });
  for (var bx = 5; bx <= 9; bx++) vg.set(g, bx, 5, 4, bx % 2 ? CHROME : CHROMED);                    /* bridge */
  vg.set(g, 5, 2, 4, CHROME); vg.set(g, 8, 2, 4, CHROME); vg.set(g, 10, 3, 4, CHROME);               /* knobs */
  /* neck: maple back, dark fretboard with frets, strings as two silver lines */
  for (var ny = 15; ny < 31; ny++) for (var nx = 6; nx <= 8; nx++) {
    vg.set(g, nx, ny, 1, NECK); vg.set(g, nx, ny, 2, NECK);
    vg.set(g, nx, ny, 3, (ny % 3 === 0) ? FRETL : FRET);
  }
  for (var sy = 15; sy < 31; sy++) { vg.set(g, 7, sy, 4, h('#e8ecef')); }
  /* headstock with tuners */
  for (var hy = 31; hy < 36; hy++) for (var hx = 5; hx <= 9; hx++) { vg.set(g, hx, hy, 1, BLK); vg.set(g, hx, hy, 2, BLK); }
  [32, 34].forEach(function (yy) { vg.set(g, 4, yy, 2, CHROME); vg.set(g, 10, yy, 2, CHROME); });
  vg.set(g, 7, 33, 3, GOLD);
  return { grid: g, pivot: { x: cx + 0.5, y: 7.0, z: 1.5 } };
}

var THUG = { skin: h('#b27a50'), skinD: h('#946238'), skinL: h('#c78b5c'), skinDD: h('#6e4528'), hair: h('#1c1612'),
  yel: h('#6d6a5a'), yelD: h('#55523f'), blu: h('#8c2f2b'), bluD: h('#6a201e'), bluL: h('#a8413a'),
  pants: h('#4b4a3e'), pantsD: h('#37362d'), pantsL: h('#5d5c4e'), belt: h('#15110d'), shoe: h('#3a2a1c'), shoeL: h('#4f3a27') };

function buildParts(variant) {
  if (variant === 'thug') {
    var save = {}, k; for (k in THUG) { save[k] = C[k]; C[k] = THUG[k]; }
    TH = true;
    try { return buildPartsRaw(); } finally { TH = false; for (k in save) C[k] = save[k]; }
  }
  return buildPartsRaw();
}

function buildPartsRaw() {
  return {
    head: buildHead(), neck: buildNeck(), torso: buildTorso(), pelvis: buildPelvis(),
    thighL: buildThigh(1), thighR: buildThigh(-1), shinL: buildShin(1), shinR: buildShin(-1),
    footL: buildFoot(), footR: buildFoot(), toeL: buildToe(), toeR: buildToe(),
    uarmL: buildUpperArm(1), uarmR: buildUpperArm(-1), farmL: buildForearm(1), farmR: buildForearm(-1),
    handL: buildHand(1), handR: buildHand(-1), hair0: buildHairSeg(0), hair1: buildHairSeg(1), hair2: buildHairSeg(2), beard: buildBeard(), guitar: buildGuitar()
  };
}

module.exports = { buildParts: buildParts, COLORS: C };
