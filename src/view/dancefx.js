/* view: the dance effects in a brawl. When the beat drops: a shock ring rolling out across the floor, coloured light rings pulsing out
   from under him, sparkles rising round him. While he grooves, a soft ring under his feet on every beat. Additive, no lights (adding a
   light at run time stalls the frame). Also his earbuds: two small white buds with a short wire, put on his head. */
'use strict';

var COLS = [0xff2bd6, 0x2be6ff, 0xffe02b, 0x7cff4f];

function createDanceFx(scene) {
  var group = new THREE.Group(); scene.add(group);
  var ringGeo = new THREE.RingGeometry(0.82, 1.0, 40), sparkGeo = new THREE.PlaneGeometry(0.09, 0.09), items = [];
  function ring(x, z, col, grow, life, op, y) {
    var m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y || 0.04, z); group.add(m);
    items.push({ m: m, t: 0, life: life, grow: grow, op: op, kind: 'ring' });
  }
  function sparkle(x, z, col) {
    var m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    var a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.9;
    m.position.set(x + Math.cos(a) * r, 0.2 + Math.random() * 0.6, z + Math.sin(a) * r); group.add(m);
    items.push({ m: m, t: 0, life: 1.2 + Math.random() * 0.8, vy: 0.8 + Math.random() * 1.4, kind: 'spark', op: 1 });
  }
  return {
    /* the beat drops */
    drop: function (x, z) {
      ring(x, z, 0xffffff, 9, 0.7, 0.9);
      COLS.forEach(function (c, k) { setTimeout(function () { ring(x, z, c, 4 + k, 0.9, 0.7); }, k * 90); });
      for (var i = 0; i < 40; i++) sparkle(x, z, COLS[i % COLS.length]);
    },
    /* one beat of the groove */
    beat: function (x, z, k) { ring(x, z, COLS[k % COLS.length], 1.6, 0.5, 0.35); if (k % 2 === 0) for (var i = 0; i < 3; i++) sparkle(x, z, COLS[(k + i) % COLS.length]); },
    update: function (dt, camera) {
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i], u; it.t += dt; u = it.t / it.life;
        if (it.kind === 'ring') { var s = 0.4 + u * it.grow; it.m.scale.set(s, s, s); it.m.material.opacity = it.op * (1 - u); }
        else { it.m.position.y += it.vy * dt; it.m.material.opacity = 1 - u; if (camera) it.m.quaternion.copy(camera.quaternion); }
        if (u >= 1) { group.remove(it.m); it.m.material.dispose(); items.splice(i, 1); }
      }
    },
    /* earbuds on his head (rig.head), hidden until put in */
    earbuds: function (rig) {
      var mat = new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }), wire = new THREE.MeshLambertMaterial({ color: 0xdddddd }), parts = [];
      [-1, 1].forEach(function (s) {
        var b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), mat); b.position.set(s * 0.15, 0.14, 0.0); rig.head.add(b); parts.push(b);
        var w = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), wire); w.position.set(s * 0.15, 0.06, 0.0); rig.head.add(w); parts.push(w);
      });
      parts.forEach(function (p) { p.visible = false; });
      return { show: function (on) { parts.forEach(function (p) { p.visible = on; }); }, dispose: function () { parts.forEach(function (p) { p.parent && p.parent.remove(p); p.geometry.dispose(); }); mat.dispose(); wire.dispose(); } };
    },
    dispose: function () { scene.remove(group); items.forEach(function (it) { it.m.material.dispose(); }); ringGeo.dispose(); sparkGeo.dispose(); }
  };
}

module.exports = { createDanceFx: createDanceFx };
