/* view: short-lived effects. Currently the guitar's sonic boom: staggered shock rings that fly out from the guitar. */
'use strict';

function createFx(scene) {
  var flip = 0; function i0() { return (flip++ & 1) ? 0xffffff : 0xffc21a; }
  var streakGeo = new THREE.BoxGeometry(0.012, 0.012, 0.16);
  var items = [], torus = new THREE.TorusGeometry(1, 0.07, 8, 40), disc = new THREE.RingGeometry(0.2, 1, 40), flashGeo = new THREE.SphereGeometry(0.5, 12, 8);
  function mat(color, op) { return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }); }
  function add(mesh, life, grow, delay, from) { mesh.visible = false; scene.add(mesh); items.push({ m: mesh, life: life, age: -delay, grow: grow, from: from, op: mesh.material.opacity }); }
  /* blood and sweat: tiny voxel-sized droplets thrown outward, falling under gravity; blood leaves a stain that fades */
  var bits = [], stains = [], bitGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035), stainGeo = new THREE.CircleGeometry(0.5, 10);
  var bitMats = { blood: [0x8e0f10, 0xb3161a, 0x6a0a0c].map(function (c) { return new THREE.MeshBasicMaterial({ color: c }); }), sweat: [0xd6efff, 0xffffff].map(function (c) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }); }),
    spit: [0xf1ece0, 0xdfd8c4].map(function (c) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }); }) };
  var stainMat = new THREE.MeshBasicMaterial({ color: 0x4a0709, transparent: true, opacity: 0.7, depthWrite: false });
  bitMats.wood = [0x8a5a2b, 0xb07a3c, 0x5c3a1a].map(function (c) { return new THREE.MeshBasicMaterial({ color: c }); });
  /* dust: soft grey-beige puffs that thrown-up grit and cloth shed; they drift, slow down, swell a little and shrink away */
  var puffs = [], puffGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1), puffMats = [0xcfc4ae, 0xb9ad96, 0xa39882].map(function (c) { return new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.8, depthWrite: false }); });
  function puff(x, y, z, vx, vy, vz, size, life) {
    if (puffs.length > 260) return;
    var m = new THREE.Mesh(puffGeo, puffMats[puffs.length % 3]); m.position.set(x, y, z); m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); m.scale.setScalar(size); scene.add(m);
    puffs.push({ m: m, vx: vx, vy: vy, vz: vz, size: size, life: life, age: 0 });
  }
  function dustBurst(o, n, speed, size, life, lift) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, sp = speed * (0.4 + Math.random() * 0.8); puff(o.x, o.y, o.z, Math.cos(a) * sp, (lift || 0.5) * (0.3 + Math.random()), Math.sin(a) * sp, size * (0.6 + Math.random() * 0.7), life * (0.7 + Math.random() * 0.6)); }
  }
  /* broken wood: real plank-shaped pieces that spin through the air, land and lie there a while */
  var planks = [], plankGeo = [new THREE.BoxGeometry(0.34, 0.05, 0.08), new THREE.BoxGeometry(0.22, 0.04, 0.06), new THREE.BoxGeometry(0.14, 0.05, 0.05)];
  function splinter(o, dirx, dirz, n, power) {
    for (var i = 0; i < n && planks.length < 40; i++) {
      var m = new THREE.Mesh(plankGeo[i % 3], bitMats.wood[i % 3]), a = Math.random() * 6.283, sp = (2.5 + Math.random() * 4.5) * power;
      m.position.set(o.x, o.y, o.z); scene.add(m);
      planks.push({ m: m, vx: Math.cos(a) * sp + dirx * sp * 0.8, vy: 3 + Math.random() * 4.5, vz: Math.sin(a) * sp + dirz * sp * 0.8, wx: (Math.random() - 0.5) * 18, wy: (Math.random() - 0.5) * 18, wz: (Math.random() - 0.5) * 18, rest: 0 });
    }
  }
  var seedN = 1; function rnd() { seedN = (seedN * 1664525 + 1013904223) >>> 0; return seedN / 4294967296; }
  function drops(kind, o, dirx, dirz, n, power, lift) {
    var mats = bitMats[kind];
    for (var i = 0; i < n && bits.length < 160; i++) {
      var m = new THREE.Mesh(bitGeo, mats[i % mats.length]), sp = (kind === 'blood' ? 2.2 : 1.7) * (0.5 + rnd()) * (0.7 + power * 0.8), spread = 1.4;
      m.position.set(o.x, o.y, o.z); var sc = kind === 'blood' ? 0.8 + rnd() * 1.2 : 0.6 + rnd() * 0.7; m.scale.setScalar(sc); scene.add(m);
      bits.push({ m: m, vx: dirx * sp + (rnd() - 0.5) * spread, vy: 1.2 + rnd() * 2.0 + (lift || 0), vz: dirz * sp + (rnd() - 0.5) * spread, blood: kind === 'blood' });
    }
  }
  var api = {
    /* blood / sweat burst at o, thrown along (dirx, dirz); power 0..1 */
    droplets: function (kind, o, dirx, dirz, n, power, lift) { drops(kind, o, dirx, dirz, n, power || 0, lift || 0); },
    /* origin: world position, yaw: hero facing (radians, 0 = +z) */
    spawn: function (kind, origin, yaw) {
      if (kind === 'whirl') {                                   /* the guitar spins: a swirling skirt of dust swept round the hero */
        for (var wi = 0; wi < 26; wi++) { var wa = wi / 26 * 6.283 + Math.random() * 0.3, wr = 0.8 + Math.random() * 0.9; puff(origin.x + Math.cos(wa) * wr, 0.15 + Math.random() * 0.5, origin.z + Math.sin(wa) * wr, -Math.sin(wa) * 4.5 + Math.cos(wa) * 1.2, 0.5 + Math.random() * 0.8, Math.cos(wa) * 4.5 + Math.sin(wa) * 1.2, 0.9 + Math.random() * 0.7, 1.1); }
        return;
      }
      if (kind === 'slam') {                                    /* guitar driven into the ground: a wall of dust rolling out, planks and splinters flying, cracks in the road */
        for (var si = 0; si < 48; si++) { var sa = si / 48 * 6.283 + Math.random() * 0.1, sp = 3 + Math.random() * 5; puff(origin.x + Math.cos(sa) * 0.5, 0.12 + Math.random() * 0.4, origin.z + Math.sin(sa) * 0.5, Math.cos(sa) * sp, 0.5 + Math.random() * 1.4, Math.sin(sa) * sp, 1.0 + Math.random() * 1.0, 1.5); }
        splinter({ x: origin.x, y: 0.5, z: origin.z }, 0, 0, 22, 1.2);
        for (var ci = 0; ci < 6 && stains.length < 40; ci++) {
          var ca = Math.random() * 6.283, len = 1.2 + Math.random() * 2.0, cr = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, len), new THREE.MeshBasicMaterial({ color: 0x1b1b1b, transparent: true, opacity: 0.8, depthWrite: false }));
          cr.position.set(origin.x + Math.cos(ca) * len * 0.5, 0.03, origin.z + Math.sin(ca) * len * 0.5); cr.rotation.y = -ca + Math.PI / 2; scene.add(cr); stains.push({ m: cr, age: 0 });
        }
        return;
      }
      if (kind === 'spark' || kind === 'blockspark') {            /* a hit knocks dust out of cloth: a few puffs, no flashes or streaks */
        var hit = kind === 'spark'; dustBurst(origin, hit ? 5 : 3, hit ? 1.1 : 0.7, hit ? 0.7 : 0.5, hit ? 0.45 : 0.35, 0.5);
        return;
      }
      if (kind !== 'boom') return;                                /* sonic boom: a huge wave of dust and grit rolling down the street, throwing planks and debris */
      for (var bi = 0; bi < 70; bi++) {
        var ba = yaw + (Math.random() - 0.5) * 1.1, dist = 0.4 + Math.random() * 3.0, sp2 = 6 + Math.random() * 9;
        puff(origin.x + Math.sin(ba) * dist, 0.1 + Math.random() * 0.6, origin.z + Math.cos(ba) * dist, Math.sin(ba) * sp2, 0.4 + Math.random() * 1.4, Math.cos(ba) * sp2, 0.9 + Math.random() * 1.2, 1.4);
      }
      splinter({ x: origin.x + Math.sin(yaw) * 2, y: 0.4, z: origin.z + Math.cos(yaw) * 2 }, Math.sin(yaw), Math.cos(yaw), 16, 1.5);
    },
    update: function (dt) {
      for (var ki = planks.length - 1; ki >= 0; ki--) {
        var pk = planks[ki], pm = pk.m;
        if (pk.rest > 0) { pk.rest += dt; if (pk.rest > 4) { scene.remove(pm); planks.splice(ki, 1); } continue; }
        pk.vy -= 14 * dt; pm.position.x += pk.vx * dt; pm.position.y += pk.vy * dt; pm.position.z += pk.vz * dt; pm.rotation.x += pk.wx * dt; pm.rotation.y += pk.wy * dt; pm.rotation.z += pk.wz * dt;
        if (pm.position.y <= 0.04) { pm.position.y = 0.04; pm.rotation.x = 0; pm.rotation.z = 0; pk.rest = 0.001; }
      }
      for (var pi = puffs.length - 1; pi >= 0; pi--) {
        var pf = puffs[pi]; pf.age += dt; var u = pf.age / pf.life;
        if (u >= 1) { scene.remove(pf.m); puffs.splice(pi, 1); continue; }
        var dr = Math.exp(-dt * 3.2); pf.vx *= dr; pf.vy = pf.vy * dr + 0.35 * dt; pf.vz *= dr;
        pf.m.position.x += pf.vx * dt; pf.m.position.y += pf.vy * dt; pf.m.position.z += pf.vz * dt;
        pf.m.scale.setScalar(pf.size * (1 + u * 1.6) * (1 - u * u * u * 0.9));
      }
      for (var b = bits.length - 1; b >= 0; b--) {
        var bt = bits[b]; bt.vy -= 9.5 * dt; bt.m.position.x += bt.vx * dt; bt.m.position.y += bt.vy * dt; bt.m.position.z += bt.vz * dt;
        if (bt.m.position.y <= 0.03) {
          if (bt.blood && stains.length < 40) { var st = new THREE.Mesh(stainGeo, stainMat.clone()); st.rotation.x = -Math.PI / 2; st.position.set(bt.m.position.x, 0.025, bt.m.position.z); st.scale.setScalar(0.05 + rnd() * 0.1); scene.add(st); stains.push({ m: st, age: 0 }); }
          scene.remove(bt.m); bits.splice(b, 1);
        }
      }
      for (var q = stains.length - 1; q >= 0; q--) {
        var sn = stains[q]; sn.age += dt; if (sn.age > 12) { scene.remove(sn.m); sn.m.material.dispose(); stains.splice(q, 1); continue; }
        sn.m.material.opacity = 0.7 * Math.min(1, (12 - sn.age) / 4);
      }
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i]; it.age += dt;
        if (it.age < 0) continue;
        var u = it.age / it.life;
        if (u >= 1) { scene.remove(it.m); it.m.material.dispose(); items.splice(i, 1); continue; }
        it.m.visible = true;
        var e = 1 - Math.pow(1 - u, 2.2), s = it.from + (it.grow - it.from) * e;
        if (it.m.userData.drift) { var dr = it.m.userData.drift, sp2 = dt * 1.6 * (1 - u); it.m.position.x += dr[0] * sp2; it.m.position.y += dr[1] * sp2; it.m.position.z += dr[2] * sp2; it.m.scale.set(1, 1, s * 0.6); }
        else it.m.scale.set(s, s, s);
        it.m.material.opacity = it.op * (1 - u) * (1 - u * 0.3);
      }
    },
    active: function () { return items.length + bits.length + puffs.length + planks.length; },
    dispose: function () { items.forEach(function (it) { scene.remove(it.m); it.m.material.dispose(); }); items.length = 0; puffs.forEach(function (x) { scene.remove(x.m); }); puffs.length = 0; planks.forEach(function (x) { scene.remove(x.m); }); planks.length = 0; bits.forEach(function (x) { scene.remove(x.m); }); stains.forEach(function (x) { scene.remove(x.m); x.m.material.dispose(); }); bits.length = 0; stains.length = 0; bitGeo.dispose(); stainGeo.dispose(); torus.dispose(); disc.dispose(); flashGeo.dispose(); streakGeo.dispose(); }
  };
  return api;
}

module.exports = { createFx: createFx };
