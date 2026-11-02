/* view: the spark from the sky - a white zigzag bolt from high above into Toofan, a ring of light racing out over the ground and a flash
   of light round him. Built once when the stage starts (adding a light later makes every material recompile: a hitch at the big moment)
   and parked out of sight until strike(x, z). */
'use strict';

function create(view) {
  var SEGS = 9, grp = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xffffff }), segs = [], k;
  for (k = 0; k < SEGS; k++) { var sg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1, 0.18), mat); grp.add(sg); segs.push(sg); }
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 28), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; grp.add(ring);
  var light = new THREE.PointLight(0xffffff, 0, 14); view.scene.add(light);
  grp.position.y = -200; view.scene.add(grp);
  var t0 = -1;
  var off = view.onFrame(function () {
    if (t0 < 0) return;
    var u = (performance.now() - t0) / 1000;
    segs.forEach(function (c) { c.visible = u < 0.6 && (u < 0.25 || Math.sin(u * 70) > -0.3); });
    ring.scale.setScalar(1 + u * 6); ring.material.opacity = Math.max(0, 1 - u / 0.7); light.intensity = Math.max(0, 4 * (1 - u / 0.7));
    if (u > 1.0) { t0 = -1; grp.position.y = -200; light.intensity = 0; }
  });
  return {
    strike: function (x, z, top) {
      var y = 14, px = 0, pz = 0, end = top || 1.9, i;
      grp.position.set(x, 0, z); light.position.set(x, 3, z);
      for (i = 0; i < SEGS; i++) {
        var ny = i === SEGS - 1 ? end : y - 1.35 - Math.random() * 0.4, nx = i < SEGS - 1 ? (Math.random() - 0.5) * 0.9 : 0, nz = i < SEGS - 1 ? (Math.random() - 0.5) * 0.9 : 0;
        var len = Math.hypot(nx - px, ny - y, nz - pz), c = segs[i];
        c.scale.set(1, len, 1); c.position.set((px + nx) / 2, (y + ny) / 2, (pz + nz) / 2); c.lookAt(x + nx, ny, z + nz); c.rotateX(Math.PI / 2); c.visible = true;
        px = nx; y = ny; pz = nz;
      }
      t0 = performance.now();
    },
    dispose: function () { off(); view.scene.remove(grp); view.scene.remove(light); segs.forEach(function (c) { c.geometry.dispose(); }); mat.dispose(); ring.geometry.dispose(); ring.material.dispose(); }
  };
}

module.exports = { create: create };
