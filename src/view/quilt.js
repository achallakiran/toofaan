/* view: Toofan's quilt in bed (the New Game opening), draped over his body every frame instead of a fixed block. A grid of voxel columns
   over the mattress; each column's height is the top of his body under it (his chest, hips, thighs, shins as rounded capsules from his
   rig's joints) plus the quilt's thickness, falling away softly to the mattress at the sides. His arms lie on top of it, and it gives
   under them (pressed down along each arm). So when he tosses, the bumps over his chest and knees move with him, and nothing of him passes through it.
   heightAt(x, z) is the quilt's top there (world metres), for the tools that check his hands never go inside it. */
'use strict';

var CELL = 0.08, BED_Y = 0.42, THICK = 0.05, DRAPE = 0.13, CAP = 0.98, ARM_R = 0.045, PRESS_R = 0.09;   /* (arm: its half-thickness; the width the quilt gives under it) */

function createQuilt(scene, opts) {
  var x0 = opts.x0, x1 = opts.x1, z0 = opts.z0, z1 = opts.z1, nx = Math.round((x1 - x0) / CELL), nz = Math.round((z1 - z0) / CELL);
  var geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  var mat = new THREE.MeshLambertMaterial({ color: 0xffffff }), mesh = new THREE.InstancedMesh(geo, mat, nx * nz), m4 = new THREE.Matrix4(), col = new THREE.Color();
  var cols = opts.colors || ['#7a4a6a', '#5e3552'], sheet = new THREE.Color(opts.sheet || '#e9e2d4');
  var i, j, k = 0;
  for (i = 0; i < nx; i++) for (j = 0; j < nz; j++, k++) {
    col.set(i === 0 ? sheet : cols[(i + j) % 2]); if (i !== 0) col.multiplyScalar(0.92 + 0.08 * ((i * 7 + j * 3) % 5) / 4);
    mesh.setColorAt(k, col);
  }
  scene.add(mesh);
  var H = new Float32Array(nx * nz), caps = [], v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  /* the body under it, as capsules between joints: [from, to, radius] */
  function pt(o) { var v = new THREE.Vector3(); o.getWorldPosition(v); return v; }
  function surface(px, pz) {
    var best = BED_Y, c, q;
    for (q = 0; q < caps.length; q++) {
      c = caps[q];
      var ax = c[0].x, az = c[0].z, bx = c[1].x, bz = c[1].z, dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, u = L > 1e-6 ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      var cx = ax + dx * u, cz = az + dz * u, d = Math.hypot(px - cx, pz - cz), cy = c[0].y + (c[1].y - c[0].y) * u, r = c[2], R = r + DRAPE;
      if (d > R) continue;
      var top = d < r ? cy + Math.sqrt(r * r - d * d) : cy;
      var h = (d < r ? top : cy - (d - r) / DRAPE * (cy - BED_Y)) + THICK;       /* over him: his shape; past his side: draping down to the mattress */
      if (!c[3]) h = Math.min(h, opts.cap || CAP);                            /* (the cap keeps his chest's hump low; his feet stand up under it as they are) */
      if (h > best) best = h;
    }
    return best;
  }
  return {
    mesh: mesh,
    /* rig: his rig, posed and placed; the quilt takes his shape */
    update: function (rig) {
      rig.root.updateMatrixWorld(true);
      var P = rig.parts, sh = pt(P.L.shoulder).add(pt(P.R.shoulder)).multiplyScalar(0.5), hp = pt(P.L.hip).add(pt(P.R.hip)).multiplyScalar(0.5);
      caps = [[sh, hp, 0.15], [pt(P.L.hip), pt(P.L.knee), 0.085], [pt(P.R.hip), pt(P.R.knee), 0.085], [pt(P.L.knee), pt(P.L.ankle || P.L.knee), 0.065], [pt(P.R.knee), pt(P.R.ankle || P.R.knee), 0.065]];
      ['L', 'R'].forEach(function (sd) { if (!P[sd].ankle || !P[sd].toe) return; var an = pt(P[sd].ankle), to = pt(P[sd].toe), tip = to.clone().add(to.clone().sub(an).multiplyScalar(0.45));
        caps.push([an, to, 0.07, 1], [to, tip, 0.06, 1]); });                       /* his feet, toes up: covered too */
      if (opts.sitting) caps.shift();                                         /* sitting up: his chest is out of it */
      /* his arms lie on top: the quilt gives under them (pressed down along each arm, a little below it), so they never sink into it */
      var arms = [];
      ['L', 'R'].forEach(function (sd) { var a = pt(P[sd].shoulder), e = pt(P[sd].elbow), w = pt(P[sd].wrist), tip = w.clone().add(w.clone().sub(e).multiplyScalar(0.4)); arms.push([a, e], [e, w], [w, tip]); });
      var kk = 0;
      for (i = 0; i < nx; i++) for (j = 0; j < nz; j++, kk++) {
        var cx = x0 + (i + 0.5) * CELL, cz = z0 + (j + 0.5) * CELL, edge = Math.min(j + 0.5, nz - j - 0.5) * CELL, h = surface(cx, cz);
        if (edge < 0.1) h = BED_Y + (h - BED_Y) * (0.35 + 6.5 * edge);          /* tucked down at the long edges */
        if (i === 0) h += 0.012;                                              /* the folded-over sheet at the top */
        for (var q2 = 0; q2 < arms.length; q2++) {
          var A = arms[q2][0], B = arms[q2][1], ux = B.x - A.x, uz = B.z - A.z, LL = ux * ux + uz * uz, uu = LL > 1e-6 ? ((cx - A.x) * ux + (cz - A.z) * uz) / LL : 0;
          uu = uu < 0 ? 0 : uu > 1 ? 1 : uu;
          var ex = A.x + ux * uu, ez = A.z + uz * uu, dd = Math.hypot(cx - ex, cz - ez);
          if (dd < PRESS_R) { var ay = A.y + (B.y - A.y) * uu - ARM_R - (PRESS_R - dd) * 0.25; if (ay < h) h = Math.max(BED_Y + 0.02, ay); }
        }
        H[kk] = h; m4.makeScale(CELL * 0.98, Math.max(0.02, h - BED_Y + 0.02), CELL * 0.98); m4.setPosition(cx, BED_Y - 0.02, cz); mesh.setMatrixAt(kk, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    heightAt: function (x, z) { var i2 = Math.floor((x - x0) / CELL), j2 = Math.floor((z - z0) / CELL); if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= nz) return -1; return H[i2 * nz + j2]; },
    bounds: { x0: x0, x1: x1, z0: z0, z1: z1 },
    set visible(on) { mesh.visible = on; }, get visible() { return mesh.visible; },
    dispose: function () { scene.remove(mesh); geo.dispose(); mat.dispose(); }
  };
}

module.exports = { createQuilt: createQuilt };
