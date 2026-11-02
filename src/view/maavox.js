/* view: Maa, for the Thappad scene. An old lady with white hair in a full white sari: the body is the shared rig in her colours
   (herovox 'maa': white blouse, white hair, older skin); the sari is draped on as voxel pieces fixed to her joints: a long skirt to the
   ankles on the hips, the pallu over her head (wrapped round the head's own voxels, framing her face, falling behind to the shoulders)
   and across her chest from the left shoulder, with a thin border; a small red bindi. */
'use strict';

var vg = require('./voxgrid');
var hv = require('./herovox');
var herorig = require('./herorig');
var SK = require('../data/skeleton');

var WHITE = vg.hex('#f3f0e8'), FOLD = vg.hex('#dfd9cc'), DEEP = vg.hex('#cfc7b6'), BORDER = vg.hex('#c9a65a'), BINDI = vg.hex('#c4232b');

/* the skirt: a flared drape from the waist to the ankles, round the hips joint (grid y 0 = the ground) */
function skirt() {
  var W = 29, H = 39, g = vg.createGrid(W, H, W), c = 14, x, y, z;
  for (y = 0; y < H; y++) {
    var u = y / (H - 1), r = 12.2 - 5.0 * Math.pow(u, 0.8), rz = r * 0.84;
    for (x = 0; x < W; x++) for (z = 0; z < W; z++) {
      var dx = (x - c) / r, dz = (z - c - 0.8) / rz, d = Math.sqrt(dx * dx + dz * dz), inner = 1 - 2.2 / r;
      if (d > 1 || (d < inner && y > 1 && y < H - 2)) continue;
      var a = Math.atan2(dz, dx), fold = Math.sin(a * 9) > 0.45;
      vg.set(g, x, y, z, y <= 2 ? BORDER : (y === 3 ? DEEP : (fold ? FOLD : WHITE)));
    }
  }
  return { grid: g, pivot: { x: c + 0.5, y: SK.hipY, z: c + 0.5 } };
}

/* the pallu over her head: the head's own voxels grown by a shell, open at the face, falling behind to the shoulders */
function hood(head) {
  var hg = head.grid, P = 4, W = hg.W + P * 2, H = hg.H + P + 12, D = hg.D + P * 2, g = vg.createGrid(W, H, D), x, y, z, dx, dy, dz;
  var OY = 12;                                     /* grid y = head y + OY: room below the jaw for the drape */
  function headSolid(x2, y2, z2) { return vg.solid(hg, x2, y2, z2); }
  for (z = 0; z < D; z++) for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var hx = x - P, hy = y - OY, hz = z - P;
    if (headSolid(hx, hy, hz)) continue;
    var near = false;
    for (dx = -2; dx <= 2 && !near; dx++) for (dy = -2; dy <= 2 && !near; dy++) for (dz = -2; dz <= 2 && !near; dz++) if (dx * dx + dy * dy + dz * dz <= 5 && headSolid(hx + dx, hy + dy, hz + dz)) near = true;
    var front = hz >= 8, side = hx <= 0 || hx >= hg.W - 1;
    var keep = near && hy >= 2 && (!front || hy >= 14 || (side && hz <= 10));
    var drape = hy < 4 && hy >= -11 && hz <= 5 && hz >= -2 && Math.abs(hx - 5) <= 6 - (hz < 0 ? 1 : 0);   /* falls behind the neck to the shoulders */
    if (!keep && !drape) continue;
    vg.set(g, x, y, z, (hy === 14 && front) ? BORDER : (((x * 3 + y * 5 + z) % 11 === 0) ? FOLD : WHITE));      /* plain white, a thin edge over the brow */
  }
  /* the bindi on her forehead */
  var fz = vg.frontZ(hg, 5, 11); if (fz >= 0) vg.set(g, 5 + P, 11 + OY, fz + 1 + P, BINDI);
  return { grid: g, pivot: { x: head.pivot.x + P, y: head.pivot.y + OY, z: head.pivot.z + P } };
}

/* the pallu across her chest: a band from the left shoulder down to the right of the waist, over the blouse, and down her back */
function sash(torso) {
  var tg = torso.grid, W = tg.W, H = tg.H, D = tg.D + 4, g = vg.createGrid(W, H, D), x, y;
  for (y = 0; y < H; y++) {
    var u = y / (H - 1), cx = 6 + u * 13, half = 3;
    for (x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      var fz = vg.frontZ(tg, x, y); if (fz < 0) continue;
      var edge = x === Math.round(cx - half) || x === Math.round(cx + half);
      vg.set(g, x, y, fz + 1 + 2, edge ? BORDER : (((x + y) % 4 === 0) ? FOLD : WHITE));
      vg.set(g, x, y, fz + 2 + 2, edge ? BORDER : WHITE);
    }
    for (x = 16; x <= 21; x++) {                                        /* behind: the end of the pallu hanging down her back */
      var bz = vg.backZ(tg, x, y); if (bz < 0 || y < 2) continue;
      vg.set(g, x, y, Math.max(0, bz - 1 + 2), x === 16 || x === 21 ? BORDER : WHITE);
    }
  }
  return { grid: g, pivot: { x: torso.pivot.x, y: torso.pivot.y, z: torso.pivot.z + 2 } };
}

function mesh(part, mat) {
  var a = vg.meshGrid(part.grid, part.pivot, SK.VS, { jitter: 0.03, seed: 7 }), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1));
  return new THREE.Mesh(g, mat);
}

function createMaa() {
  var rig = herorig.createHeroRig('maa'), parts = hv.buildParts('maa'), mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  var sk = mesh(skirt(), mat), hd = mesh(hood(parts.head), mat), sh = mesh(sash(parts.torso), mat);
  rig.body.add(sk);                                 /* the skirt hangs from the waist but stays upright, so it is held by the body, at the hips' height */
  rig.head.add(hd); rig.spine.add(sh);
  rig.root.scale.set(0.86, 0.93, 0.88);             /* a smaller, older frame */
  return {
    rig: rig, root: rig.root,
    /* the skirt follows the hips' sway a little */
    sync: function () { sk.position.set(rig.hips.position.x, SK.hipY * SK.VS, rig.hips.position.z); sk.rotation.y = rig.hips.rotation.y * 0.6; },
    dispose: function () { [sk, hd, sh].forEach(function (m) { m.geometry.dispose(); }); mat.dispose(); }
  };
}

module.exports = { createMaa: createMaa };
