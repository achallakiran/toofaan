/* view: the stealth stage drawn from sim/stealth's state. The yard (sim/stealthmap's boxes) at night - dark, lit only by its floodlight
   pools - with the tall pieces fading when they come between the camera and Toofan. The men: Antu's goons on foot (rigs in their gear,
   a pistol), the two tower snipers and the head sniper (rifles, red bandanas). What they can see is drawn on the ground so it can be
   read at a glance: a pale fan for each man's view (yellow on foot, red for a sniper), brighter as he grows suspicious; a sniper's red
   laser sweeps the yard and its dot crawls over the ground; once he is spotted every laser that has him snaps onto his chest. Over a
   man's head a "?" fills as he grows suspicious and turns into a red "!" when he locks on. A shot is a muzzle flash and a tracer. */
'use strict';

var herorig = require('./herorig');
var posemath = require('./posemath');
var arenaview = require('./arenaview');
var hideoutview = require('./hideoutview');
var M = require('../sim/stealthmap');

function fanGeo(half, segs) {
  var pos = [0, 0, 0], idx = [], i;
  for (i = 0; i <= segs; i++) { var a = -half + 2 * half * i / segs; pos.push(Math.sin(a), 0, Math.cos(a)); }
  for (i = 1; i <= segs; i++) idx.push(0, i, i + 1);
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
function labelTex(ch, col) {
  var cv = document.createElement('canvas'); cv.width = cv.height = 64; var g = cv.getContext('2d');
  g.font = '900 54px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#000'; g.strokeText(ch, 32, 34); g.fillStyle = col; g.fillText(ch, 32, 34);
  return new THREE.CanvasTexture(cv);
}

function createStealthView(view, st) {
  var scene = view.scene, made = [], root = new THREE.Group(); scene.add(root);
  function keep(x) { made.push(x); return x; }
  /* the yard */
  var data = M.build(7), hide = hideoutview.createHideout(view, { boxes: data.boxes, glows: data.glows, leds: data.leds, lamps: data.lamps }, { ambient: 0.42, maxLamps: view.tierId === 'phone' ? 3 : 7 });
  var av = arenaview.createArenaView(scene, data);
  var sky = { bg: scene.background.getHex(), fc: scene.fog.color.getHex(), fn: scene.fog.near, ff: scene.fog.far };
  scene.background.set('#070a14'); scene.fog.color.set('#070a14'); scene.fog.near = 26; scene.fog.far = 70;
  /* the floodlight pools: warm discs on the ground, so the light reads even where the few real lamps don't reach */
  var poolMat = keep(new THREE.MeshBasicMaterial({ color: 0xffd68a, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })), poolGeo = keep(new THREE.CircleGeometry(1, 40));
  M.LIGHTS.forEach(function (L) {
    var m = new THREE.Mesh(poolGeo, poolMat); m.rotation.x = -Math.PI / 2; m.position.set(L[0], 0.035, L[1]); m.scale.setScalar(L[2]); root.add(m);
    var m2 = new THREE.Mesh(poolGeo, poolMat); m2.rotation.x = -Math.PI / 2; m2.position.set(L[0], 0.036, L[1]); m2.scale.setScalar(L[2] * 0.62); root.add(m2);
  });
  /* the checkpoints: a chalk mark on the ground */
  var cpMat = keep(new THREE.MeshBasicMaterial({ color: 0x6cf0a0, transparent: true, opacity: 0.35, depthWrite: false })), cpGeo = keep(new THREE.RingGeometry(0.7, 0.85, 24));
  var cps = M.CHECKPOINTS.slice(1).map(function (c) { var m = new THREE.Mesh(cpGeo, cpMat.clone()); m.rotation.x = -Math.PI / 2; m.position.set(c.x, 0.04, c.z); root.add(m); return m; });

  /* the men */
  var gunMat = keep(new THREE.MeshLambertMaterial({ color: 0x23262b })), woodMat = keep(new THREE.MeshLambertMaterial({ color: 0x5a3a20 })), redMat = keep(new THREE.MeshLambertMaterial({ color: 0xc8202a }));
  function box(parent, w, h, d, x, y, z, mat) { var g = new THREE.BoxGeometry(w, h, d); made.push(g); var m = new THREE.Mesh(g, mat); m.position.set(x, y, z); parent.add(m); return m; }
  var qTex = keep(labelTex('?', '#ffd21f')), xTex = keep(labelTex('!', '#ff2a1a'));
  var fanG = { guard: keep(fanGeo(0.8, 16)), sniper: keep(fanGeo(0.24, 6)), boss: keep(fanGeo(0.24, 6)) };
  var laserGeo = keep(new THREE.CylinderGeometry(0.018, 0.018, 1, 5)); laserGeo.rotateX(Math.PI / 2); laserGeo.translate(0, 0, 0.5);
  var dotGeo = keep(new THREE.CircleGeometry(0.16, 12));
  var men = st.watchers.map(function (w) {
    var variant = w.type === 'guard' ? 'thug:' + w.kind : 'thug', rig = herorig.createHeroRig(variant), muzzle = new THREE.Object3D();
    if (w.type === 'guard') { var pis = box(rig.parts.R.wrist, 0.05, 0.1, 0.2, 0, -0.1, 0.08, gunMat); pis.add(muzzle); muzzle.position.set(0, 0, 0.12); }
    else {
      /* the rifle held across his chest, along his aim; a red bandana; the head sniper is bigger */
      var rifle = new THREE.Group(); rifle.position.set(0.1, 0.32, 0.18); rig.spine.add(rifle);
      box(rifle, 0.07, 0.1, 1.15, 0, 0, 0.35, gunMat); box(rifle, 0.08, 0.16, 0.34, 0, -0.04, -0.2, woodMat); box(rifle, 0.05, 0.07, 0.3, 0, 0.09, 0.25, gunMat);
      rifle.add(muzzle); muzzle.position.set(0, 0, 0.95);
      box(rig.head, 0.28, 0.07, 0.28, 0, 0.1, 0, redMat); box(rig.head, 0.05, 0.1, 0.06, 0.06, 0.02, -0.16, redMat);
      if (w.type === 'boss') rig.root.scale.setScalar(1.12);
    }
    root.add(rig.root);
    var fanMat = new THREE.MeshBasicMaterial({ color: w.type === 'guard' ? 0xffe27a : 0xff4a3a, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }); made.push(fanMat);
    var fan = new THREE.Mesh(fanG[w.type], fanMat); fan.position.y = 0.05; root.add(fan);
    var lmat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }); made.push(lmat);
    var laser = new THREE.Mesh(laserGeo, lmat); root.add(laser); laser.visible = false;
    var dot = new THREE.Mesh(dotGeo, lmat); dot.rotation.x = -Math.PI / 2; root.add(dot); dot.visible = false;
    var sm = new THREE.SpriteMaterial({ map: qTex, depthTest: false, transparent: true }); made.push(sm);
    var mark = new THREE.Sprite(sm); mark.renderOrder = 20; mark.scale.setScalar(0.7); root.add(mark); mark.visible = false;
    var baseY = w.type === 'sniper' ? 5.12 : w.type === 'boss' ? M.OFFICE.h : 0;
    return { w: w, rig: rig, muzzle: muzzle, fan: fan, fanMat: fanMat, laser: laser, dot: dot, mark: mark, sm: sm, cur: posemath.named('stand'), face: w.face, t: Math.random() * 5, y: baseY, ph: 0 };
  });
  function manPose(v, dt) {
    var w = v.w, stand = posemath.named('stand'), out;
    if (w.st === 'out' || w.st === 'stunned') {
      var k = w.st === 'out' ? 1 : Math.min(1, w.outT / 0.9);
      out = posemath.layer(stand, w.st === 'stunned' && w.outT < 0.45 ? { 'spine.rx': -20, 'head.rx': -35, 'armA.sz': 40, 'armB.sz': 40, 'legA.k': 25, 'legB.k': 25 } : posemath.named('down'), k, k, k, k);
    } else if (w.type !== 'guard') {
      /* snipers stand aiming down the rifle: both arms forward to it, cheek on the stock */
      out = posemath.layer(stand, { 'armA.sx': 70, 'armA.sz': 10, 'armA.e': 70, 'armB.sx': 62, 'armB.sz': -8, 'armB.e': 40, 'head.rx': 12, 'head.ry': -8, 'spine.rx': 6, 'legA.hx': 10, 'legB.hx': -12, 'legB.k': 8 }, 1, 1, 1, 1);
    } else if (w.st === 'lock') {
      out = posemath.layer(stand, { 'armB.sx': 88, 'armB.e': 0, 'armB.sz': -6, 'armA.sx': 30, 'armA.e': 70, 'head.rx': 4, 'hip.ry': -15, 'spine.ry': 15 }, 1, 1, 1, 1);
    } else if (w.moving) {
      v.ph += dt * 6.4; out = posemath.walkPose(v.ph, w.st === 'search' ? 0.7 : 0.8);
      if (w.st === 'search') out = posemath.layer(out, { 'armB.sx': 60, 'armB.e': 20, 'head.ry': 20 * Math.sin(v.t * 3) }, 0, 1, 0, 1);
    } else {
      out = posemath.layer(posemath.idlePose(v.t), { 'head.ry': w.st === 'search' ? 30 * Math.sin(v.t * 2.4) : 0, 'armB.sx': w.st === 'search' ? 50 : 0, 'armB.e': w.st === 'search' ? 30 : 0 }, 0, 1, 0, 1);
    }
    posemath.approach(v.cur, out, 14, dt);
    return v.cur;
  }
  var v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
  /* shots: a muzzle flash and a tracer, gone in a moment */
  var flashMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), flashGeo = keep(new THREE.SphereGeometry(0.22, 8, 6));
  var tracerMat = keep(new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), tracerGeo = keep(new THREE.CylinderGeometry(0.03, 0.03, 1, 5)); tracerGeo.rotateX(Math.PI / 2); tracerGeo.translate(0, 0, 0.5);
  var shots = [];
  function shot(id, tx, ty, tz) {
    var v = men.filter(function (q) { return q.w.id === id; })[0]; if (!v) return;
    v.muzzle.getWorldPosition(v3);
    var fl = new THREE.Mesh(flashGeo, flashMat), tr = new THREE.Mesh(tracerGeo, tracerMat);
    fl.position.copy(v3); tr.position.copy(v3); v4.set(tx, ty, tz); tr.scale.set(1, 1, v3.distanceTo(v4)); tr.lookAt(v4);
    root.add(fl); root.add(tr); shots.push({ fl: fl, tr: tr, t: 0 });
  }

  /* Toofan */
  var hero = herorig.createHeroRig(), cur = posemath.named('stand'), hph = 0, ht = 0, heroFace = st.player.face; root.add(hero.root);
  function heroPose(p, dt) {
    var stand = posemath.named('stand'), out;
    if (st.state === 'fail') out = posemath.layer(stand, posemath.named('down'), 1, 1, 1, 1);
    else if (p.act) {
      /* the takedown: a step in, his left hand clamps the man's shoulder, the right hand chops down at the neck, twice */
      var u = p.act.t, chop = Math.max(0, Math.sin(Math.min(1, Math.max(0, (u - 0.25) / 0.35)) * Math.PI)) + Math.max(0, Math.sin(Math.min(1, Math.max(0, (u - 0.62) / 0.3)) * Math.PI)) * 0.8;
      out = posemath.layer(stand, { 'armA.sx': 80, 'armA.sz': 6, 'armA.e': 40, 'armB.sx': 110 - 70 * chop, 'armB.sz': 12, 'armB.e': 80 - 60 * chop, 'spine.rx': 14 + 8 * chop, 'hip.y': -0.12, 'legA.hx': 24, 'legA.k': 30, 'legB.hx': -16, 'legB.k': 18, 'head.rx': 10 }, 1, 1, 1, 1);
    } else if (st.state === 'won') out = posemath.layer(stand, { 'armA.sx': 170, 'armA.e': 0, 'armA.sz': 10, 'head.rx': -14, 'armB.sz': 30 }, 1, 1, 1, 1);
    else if (p.crouch) {
      /* sneaking: low, knees deep, back bent forward, hands up and ready */
      var mv = p.moving ? 1 : 0; if (p.moving) hph += dt * 6.2;
      var s = Math.sin(hph), sk = { 'hip.y': -0.38, 'spine.rx': 26, 'head.rx': -18, 'legA.hx': 62 + 20 * s * mv, 'legA.k': 95 - 15 * s * mv, 'legB.hx': 62 - 20 * s * mv, 'legB.k': 95 + 15 * s * mv,
        'legA.a': -30, 'legB.a': -30, 'armA.sx': 40 - 15 * s * mv, 'armA.e': 70, 'armA.sz': 10, 'armB.sx': 40 + 15 * s * mv, 'armB.e': 70, 'armB.sz': 10 };
      out = posemath.layer(stand, sk, 1, 1, 1, 1);
    } else if (p.moving) { hph += dt * 8.2; out = posemath.walkPose(hph, 1); }
    else out = posemath.idlePose(ht);
    if (p.flash > 0.5) out = posemath.layer(out, { 'spine.rx': -18, 'head.rx': -20, 'armA.sz': 30, 'armB.sz': 30 }, 1, 1, 1, 1);
    posemath.approach(cur, out, 16, dt);
    return cur;
  }

  return {
    hero: hero,
    sync: function (alpha, dt) {
      var p = st.player, x = p.px + (p.x - p.px) * alpha, z = p.pz + (p.z - p.pz) * alpha; ht += dt;
      heroFace += Math.atan2(Math.sin(p.face - heroFace), Math.cos(p.face - heroFace)) * (1 - Math.exp(-14 * dt));
      hero.root.position.set(x, p.y, z); hero.root.rotation.y = heroFace; hero.applyPose(heroPose(p, dt), { plant: true }); hero.flutter(ht, p.moving ? 0.6 : 0);
      men.forEach(function (v) {
        var w = v.w; v.t += dt;
        var wx = w.px + (w.x - w.px) * alpha, wz = w.pz + (w.z - w.pz) * alpha;
        v.face += Math.atan2(Math.sin(w.face - v.face), Math.cos(w.face - v.face)) * (1 - Math.exp(-12 * dt));
        v.rig.root.position.set(wx, v.y, wz); v.rig.root.rotation.y = v.face; v.rig.applyPose(manPose(v, dt), { plant: true });
        var down = w.st === 'out' || w.st === 'stunned';
        /* the view fan on the ground (for a sniper it starts at the foot of his tower) */
        v.fan.visible = !down && st.state !== 'won';
        if (v.fan.visible) {
          var reach = w.type === 'guard' ? 6.5 : w.type === 'boss' && w.glance < 0 ? 8 : w.range * 0.8;
          v.fan.position.set(wx, (w.type === 'boss' && w.glance < 0 ? M.OFFICE.h : 0) + 0.05, wz); v.fan.rotation.y = v.face; v.fan.scale.set(reach, 1, reach);
          var hot = w.st === 'lock' ? 1 : w.sus;
          v.fanMat.opacity = 0.07 + 0.16 * hot + (w.st === 'lock' ? 0.06 * Math.sin(v.t * 18) : 0);
          v.fanMat.color.setHex(w.st === 'lock' ? 0xff2a1a : w.type === 'guard' ? (hot > 0.3 ? 0xffa21a : 0xffe27a) : 0xff4a3a);
        }
        /* the laser: snipers always (sweeping), a man on foot only once he has drawn on him */
        var lz = !down && st.state !== 'won' && (w.type !== 'guard' || w.st === 'lock');
        v.laser.visible = lz; v.dot.visible = lz;
        if (lz) {
          v.rig.root.updateMatrixWorld(true); v.muzzle.getWorldPosition(v3);
          if (w.st === 'lock' && w.aim) v4.set(w.aim.x, w.aim.y + p.y * 0, w.aim.z);
          else { var reach2 = w.type === 'guard' ? 6 : w.range * 0.78; v4.set(wx + Math.sin(v.face) * reach2, w.type === 'boss' ? 0.02 : 0.02, wz + Math.cos(v.face) * reach2); }
          if (w.st === 'lock') v4.y = (p.up ? p.y : 0) + (p.crouch ? 0.85 : 1.3);
          v.laser.position.copy(v3); v.laser.scale.set(w.st === 'lock' ? 1.6 : 1, w.st === 'lock' ? 1.6 : 1, v3.distanceTo(v4)); v.laser.lookAt(v4);
          v.laser.material.opacity = w.st === 'lock' ? 0.85 + 0.15 * Math.sin(v.t * 30) : 0.55;
          v.dot.position.set(v4.x, w.st === 'lock' ? v4.y : 0.045, v4.z); v.dot.rotation.x = w.st === 'lock' ? 0 : -Math.PI / 2; if (w.st === 'lock') v.dot.lookAt(v3);
        }
        /* ? and ! over his head */
        var show = !down && (w.st === 'lock' || w.sus > 0.05 || w.st === 'search');
        v.mark.visible = show && st.state === 'play';
        if (v.mark.visible) {
          var lock = w.st === 'lock'; v.sm.map = lock ? xTex : qTex; v.mark.position.set(wx, v.y + 2.5 * (w.type === 'boss' ? 1.12 : 1), wz);
          v.mark.scale.setScalar(lock ? 0.85 + 0.1 * Math.sin(v.t * 20) : 0.4 + 0.4 * Math.max(w.sus, w.st === 'search' ? 0.6 : 0)); v.sm.opacity = lock ? 1 : 0.5 + 0.5 * w.sus;
        }
      });
      cps.forEach(function (m, i) { m.material.opacity = st.checkpoint > i ? 0.12 : 0.3 + 0.12 * Math.sin(ht * 3 + i); });
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i]; s.t += dt; s.fl.scale.setScalar(1 + s.t * 8); s.fl.material.opacity = Math.max(0, 1 - s.t / 0.12); s.tr.material.opacity = Math.max(0, 1 - s.t / 0.14);
        if (s.t > 0.16) { root.remove(s.fl); root.remove(s.tr); shots.splice(i, 1); }
      }
      hide.update(ht);
    },
    shot: shot,
    /* fade whatever stands between the camera and him */
    fade: function (camera, dt) { var p = st.player, lo = p.up ? 1.9 : 1.0; av.fade(camera, [new THREE.Vector3(p.x, p.y + lo, p.z), new THREE.Vector3(p.x, p.y + lo + 0.7, p.z)], dt); },   /* (on the roof, aim above its rail so the office doesn't fade under him) */
    dispose: function () {
      scene.remove(root); hide.dispose(); av.dispose(); made.forEach(function (m) { m.dispose && m.dispose(); });
      scene.background.setHex(sky.bg); scene.fog.color.setHex(sky.fc); scene.fog.near = sky.fn; scene.fog.far = sky.ff;
    }
  };
}

module.exports = { createStealthView: createStealthView };
