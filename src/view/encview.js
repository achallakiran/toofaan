/* view: road fights in ride mode. Goons on their own dark street bikes riding one lane to Toofan's left, the gang car whose crew lean out
   of the windows while Toofan clings flat to its roof (Spider-Man style), the police scene with constables and handcuffed goons walked to
   the police car, and warning flashes before blows. Reads the encounter sim only. */
'use strict';

var R = require('../data/ride');
var vg = require('./voxgrid');
var herorig = require('./herorig');
var posemath = require('./posemath');
var moveplayer = require('./moveplayer');
var ambient = require('./ambientvox');

var ROOF_Y = 1.32, HALF_W = 0.95;                    /* the street car's roof height and half width, before scaling */
var GVS = 0.075;
var h = vg.hex;

/* ---- the goons' bike: a dark street bike with a red tank, chrome bars and exhaust, separate wheels so they turn ---- */
var tpl = null;
function geoOf(g, pivot) {
  var a = vg.meshGrid(g, pivot, GVS, { jitter: 0.05, seed: 77 }), bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  bg.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); bg.setIndex(new THREE.BufferAttribute(a.indices, 1)); bg.computeBoundingSphere();
  return bg;
}
function template() {
  if (tpl) return tpl;
  var dark = h('#25272c'), eng = h('#6b7078'), chrome = h('#c7ced4'), red = h('#b3221c'), redL = h('#d0352a'), blk = h('#141518'), seat = h('#3a2418'), lamp = h('#fff3c4'), tail = h('#e0302a');
  var g = vg.createGrid(11, 16, 32);
  vg.box(g, 5, 6, 8, 5, 7, 23, dark); vg.box(g, 5, 4, 19, 5, 9, 21, dark);                       /* frame */
  vg.box(g, 3, 3, 12, 7, 7, 17, eng); vg.box(g, 3, 8, 13, 7, 8, 16, chrome);                      /* engine and fins */
  vg.box(g, 3, 9, 15, 7, 11, 21, red); vg.box(g, 4, 12, 16, 6, 12, 20, redL); vg.box(g, 3, 10, 15, 7, 10, 21, blk);   /* tank with a black stripe */
  vg.box(g, 3, 9, 7, 7, 10, 14, seat); vg.box(g, 4, 8, 3, 6, 9, 7, dark);                         /* seat, rear mudguard */
  vg.box(g, 3, 5, 24, 3, 12, 25, chrome); vg.box(g, 7, 5, 24, 7, 12, 25, chrome);                 /* fork legs */
  vg.box(g, 0, 13, 22, 10, 13, 22, chrome); vg.box(g, 0, 13, 22, 1, 13, 22, blk); vg.box(g, 9, 13, 22, 10, 13, 22, blk);   /* bars and grips */
  vg.box(g, 4, 10, 26, 6, 12, 26, lamp); vg.box(g, 3, 10, 25, 7, 12, 25, chrome);                 /* headlight */
  vg.box(g, 4, 9, 2, 6, 9, 2, tail); vg.box(g, 8, 3, 3, 8, 4, 15, chrome);                       /* tail light, exhaust */
  var w = vg.createGrid(3, 11, 11), y, z;
  for (y = 0; y < 11; y++) for (z = 0; z < 11; z++) { var d = Math.hypot(y - 5, z - 5); if (d <= 5.4) vg.box(w, 0, y, z, 2, y, z, d > 3.6 ? h('#1b1c1f') : (d > 1.4 ? h('#8a929a') : chrome)); }
  tpl = { body: geoOf(g, { x: 5.5, y: 0, z: 16 }), wheel: geoOf(w, { x: 1.5, y: 5.5, z: 5.5 }), seat: { y: 11 * GVS, z: (11 - 16) * GVS }, wheelR: 5.5 * GVS,
          rearZ: (6 - 16) * GVS + GVS / 2, frontZ: (26 - 16) * GVS + GVS / 2, axleY: 5.5 * GVS };
  return tpl;
}

function makeMark(color) {                            /* the warning flash: a burst of thin rays over the head, like the brawler's */
  var g = new THREE.Group(), geo = new THREE.BoxGeometry(0.03, 0.03, 0.36), mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, depthTest: false });
  for (var i = 0; i < 9; i++) { var piv = new THREE.Group(), m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2; m.position.y = 0.3; m.scale.z = 1 - Math.abs(i - 4) * 0.12; m.renderOrder = 12; piv.rotation.z = -(i - 4) * 0.36; piv.add(m); g.add(piv); }
  g.visible = false; g.userData.mat = mat; return g;
}

/* poses for the new scenes */
var CUFFED = { 'armA.sx': -38, 'armB.sx': -38, 'armA.sz': 8, 'armB.sz': 8, 'armA.e': 85, 'armB.e': 85, 'armA.pr': 50, 'armB.pr': 50, 'head.rx': 20, 'spine.rx': 10, 'neck.rx': 6 };
var CLING = { 'armA.sx': 150, 'armB.sx': 150, 'armA.sz': 38, 'armB.sz': 38, 'armA.e': 30, 'armB.e': 30, 'head.rx': -58, 'neck.rx': -20, 'legA.hz': 10, 'legB.hz': 10, 'legA.k': 12, 'legB.k': 12, 'legA.a': -30, 'legB.a': -30 };
var LEAN_OUT = { 'spine.rx': -18, 'hip.rx': -10, 'legA.hx': 70, 'legB.hx': 70, 'legA.k': 90, 'legB.k': 90, 'hip.y': -0.45, 'armA.sx': 40, 'armB.sx': 20, 'armA.e': 60, 'armB.e': 70 };
var SALUTE = { 'armB.sx': 150, 'armB.sz': 30, 'armB.e': 120, 'armB.pr': 30 };

function createEncView(root, heroRig, heroBike, blobUnder) {
  var S = R.SCALE, foes = {}, crew = {}, car = null, police = null, cops = [], cuffed = {}, ridePose = posemath.named('ride'), guard = posemath.named('guard');
  var clubGeo = new THREE.BoxGeometry(0.07, 0.8, 0.07), clubMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  var bandGeo = new THREE.BoxGeometry(0.34, 0.07, 0.34), bandMat = new THREE.MeshLambertMaterial({ color: 0xc8202a });
  var goonMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  var seatV = new THREE.Vector3(), walkT = 0;
  var lightR = new THREE.MeshBasicMaterial({ color: 0xff2a2a }), lightB = new THREE.MeshBasicMaterial({ color: 0x2a6bff }), lightGeo = new THREE.BoxGeometry(0.35, 0.14, 0.2);

  function seated(rig, bike) { bike.pitch.add(rig.root); rig.root.position.set(bike.seat.x, bike.seat.y + 0.08 - 0.85, bike.seat.z); rig.root.rotation.set(0, 0, 0); rig.root.scale.setScalar(1); }
  function clip(name, sec) { return moveplayer.clipPose(name, sec); }
  function place(obj, bx, bz, e, u, lat, y) { obj.position.set(bx + e.f.x * u + e.l.x * lat, y || 0, bz + e.f.z * u + e.l.z * lat); }
  function heading(e) { return Math.atan2(e.f.x, e.f.z); }

  function makeFoe(o) {
    var T = template(), rootG = new THREE.Group(), lean = new THREE.Group(), body = new THREE.Mesh(T.body, goonMat), rig = herorig.createHeroRig('thug'), mark = makeMark(0xffffff);
    rootG.scale.setScalar(S); rootG.add(lean); lean.add(body);
    var rear = new THREE.Group(), front = new THREE.Group(); rear.position.set(0, T.axleY, T.rearZ); front.position.set(0, T.axleY, T.frontZ);
    rear.add(new THREE.Mesh(T.wheel, goonMat)); front.add(new THREE.Mesh(T.wheel, goonMat)); lean.add(rear); lean.add(front);
    lean.add(rig.root); rig.root.position.set(0, T.seat.y + 0.08 - 0.85, T.seat.z);
    var band = new THREE.Mesh(bandGeo, bandMat); band.position.set(0, 0.24, -0.01); rig.head.add(band);       /* a red bandana */
    rig.head.add(mark); mark.position.y = 0.55;
    if (o.kind === 'rod') { var club = new THREE.Mesh(clubGeo, clubMat); club.position.set(0, -0.12, 0.1); rig.parts.R.wrist.add(club); }
    blobUnder(rootG, 0.9, 2.3); root.add(rootG);
    return { root: rootG, lean: lean, rear: rear, front: front, rig: rig, mark: mark, wheel: 0 };
  }
  function makeMan(variant) { var rig = herorig.createHeroRig(variant), mark = makeMark(0xffffff); rig.root.scale.setScalar(S); rig.head.add(mark); mark.position.y = 0.55; root.add(rig.root); return { rig: rig, mark: mark }; }
  function makeCar(look, lights) {
    var m = ambient.createMesh({ kind: 'car', look: look, id: look }); m.scale.setScalar(S); blobUnder(m, 2.2, 4.2); root.add(m);
    var mark = makeMark(0xff3a2a); mark.position.y = ROOF_Y + 0.9; m.add(mark); mark.userData.base = 2.2 / S;
    var bar = null;
    if (lights) { bar = [new THREE.Mesh(lightGeo, lightR), new THREE.Mesh(lightGeo, lightB)]; bar[0].position.set(-0.2, ROOF_Y + 0.07, 0); bar[1].position.set(0.2, ROOF_Y + 0.07, 0); m.add(bar[0]); m.add(bar[1]); }
    return { m: m, mark: mark, bar: bar };
  }
  function pulse(mark, t, on, u) { mark.visible = on; if (on) { var p = (1 + Math.sin(t * (14 + u * 22)) * 0.12) * (u < 0.2 ? 1.6 - u * 3 : 1); mark.scale.setScalar(p * (mark.userData.base || 1)); mark.userData.mat.opacity = Math.min(1, u * 6); } }
  /* impact bursts: a star of rays and a flash ball that grow and fade where a blow lands */
  var bursts = [], rayGeo = new THREE.BoxGeometry(0.05, 0.05, 1), ballGeo = new THREE.SphereGeometry(0.35, 10, 8);
  function burst(x, y, z, color, size) {
    var g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }), i;
    for (i = 0; i < 14; i++) { var m = new THREE.Mesh(rayGeo, mat); var a = i * 2.4, b2 = Math.sin(i * 1.7) * 1.2; m.rotation.set(b2, a, 0); m.position.set(0, 0, 0); m.renderOrder = 20; var piv = new THREE.Group(); piv.add(m); m.position.z = 0.5; piv.rotation.set(b2, a, 0); m.rotation.set(0, 0, 0); g.add(piv); }
    var ball = new THREE.Mesh(ballGeo, mat); ball.renderOrder = 20; g.add(ball);
    g.position.set(x, y, z); root.add(g); bursts.push({ g: g, mat: mat, t: 0, size: size || 1 });
  }
  function stepBursts(dt) {
    bursts = bursts.filter(function (b) {
      b.t += dt; var u = b.t / 0.42; if (u >= 1) { root.remove(b.g); b.mat.dispose(); return false; }
      b.g.scale.setScalar(b.size * (0.3 + u * 1.6)); b.mat.opacity = 1 - u; return true;
    });
  }
  function clearAll() {
    Object.keys(foes).forEach(function (k) { root.remove(foes[k].root); }); foes = {};
    Object.keys(crew).forEach(function (k) { root.remove(crew[k].rig.root); }); crew = {};
    Object.keys(cuffed).forEach(function (k) { root.remove(cuffed[k].rig.root); }); cuffed = {};
    cops.forEach(function (c) { root.remove(c.rig.root); }); cops = [];
    if (car) { root.remove(car.m); car = null; } if (police) { root.remove(police.m); police = null; }
  }

  return {
    active: false,
    /* the middle of the action, for the camera: {u, lat} along the road from the bike */
    focus: function (r) {
      var e = r.enc; if (!e) return null;
      if (e.phase === 'police' && e.cuffed) { var su = 0, n = 0; e.cuffed.forEach(function (g) { if (!g.gone) { su += g.u; n++; } }); return { u: n ? su / n : e.police.u, lat: e.cuffed[0].lat - 1.5, police: true }; }
      if (e.car && (e.hero.roof || e.hero.leap > 0)) return { u: e.car.u, lat: e.car.lat - e.car.sw, roof: true };
      var a = null; (e.foes || []).forEach(function (o) { if (!a && o.st !== 'down' && o.st !== 'approach') a = o; });
      if (a && a.lat !== undefined) return { u: 0.3, lat: 0, bikes: true };            /* goons on both sides: frame Toofan in the middle */
      if (a) return { u: a.u * 0.5, lat: R.ENC.LAT * 0.5 };
      if (e.car) return { u: e.car.u * 0.5, lat: R.ENC.LAT * 0.5 };
      if (e.kind === 'bikes') return { u: 0.3, lat: 0, bikes: true };
      return { u: 0, lat: R.ENC.LAT * 0.4 };
    },
    /* where an enemy is in the world (for close-ups) */
    worldOf: function (r, id, bx, bz) {
      var e = r.enc; if (!e) return null; var o = (e.foes || []).concat(e.crew || []).filter(function (q) { return q.id === id; })[0]; if (!o) return null;
      var u = o.crew ? e.car.u + o.side * 1.05 : o.u, lat = o.crew ? e.car.lat : (o.lat !== undefined ? o.lat : R.ENC.LAT);
      return { x: bx + e.f.x * u + e.l.x * lat, z: bz + e.f.z * u + e.l.z * lat };
    },
    burst: burst,
    sync: function (r, alpha, dt, t, bx, bz) {
      stepBursts(dt);
      var e = r.enc;
      if (!e) { if (this.active) { clearAll(); this.active = false; if (heroRig.root.parent !== heroBike.pitch) seated(heroRig, heroBike); heroRig.applyPose(ridePose, { plant: false }); heroRig.body.rotation.set(0, 0, 0); heroRig.root.rotation.set(0, 0, 0); } return false; }
      this.active = true; walkT += dt;
      var hd = heading(e), H = e.hero, E = R.ENC;

      /* ---- bike goons ---- */
      var seen = {};
      (e.foes || []).forEach(function (o) {
        seen[o.id] = 1; var F = foes[o.id] || (foes[o.id] = makeFoe(o)), T = template();
        place(F.root, bx, bz, e, o.u, o.lat !== undefined ? o.lat : E.LAT); F.root.rotation.y = hd;
        F.wheel += (r.bike.speed + (o.st === 'down' ? -7 : 0)) * dt / (T.wheelR * S); F.rear.rotation.x = F.wheel; F.front.rotation.x = F.wheel;
        var pose = ridePose, down = o.st === 'down';
        var hk = o.lat < 0 ? 'bkHookL' : 'bkHookR';                       /* he swings at Toofan, who is on his right if he rides on the left */
        if (o.st === 'windup') pose = posemath.layer(ridePose, clip(hk, Math.min(1, o.t / E.WIND) * 0.19), 0, 1, 1, 1);
        else if (o.st === 'recover') pose = posemath.layer(ridePose, clip(hk, 0.19 + Math.min(1, o.t / 26) * 0.35), 0, 1 - o.t / 26, 1 - o.t / 26, 1 - o.t / 26);
        else if (o.st === 'hurt') pose = posemath.layer(ridePose, posemath.named('hurt'), 0, 0.6 * Math.max(0, 1 - o.t / 20), 0.6, 0.6);
        F.rig.applyPose(pose, { plant: false });
        F.rig.body.rotation.z = o.st === 'hurt' ? 0.3 * Math.exp(-o.t / 10) : 0;
        F.lean.rotation.z = down ? Math.min(1.35, o.t * 0.06) : (o.st === 'hurt' ? 0.15 : 0);
        pulse(F.mark, t, o.st === 'windup', o.t / E.WIND);
      });
      Object.keys(foes).forEach(function (k) { if (!seen[k]) { root.remove(foes[k].root); delete foes[k]; } });

      /* ---- the gang car and its crew leaning out of the near-side windows ---- */
      if (e.car) {
        var c = e.car; if (!car) car = makeCar(0, false);
        place(car.m, bx, bz, e, c.u, c.lat - c.sw); car.m.rotation.y = hd + c.yaw + c.sw * 0.12;
        pulse(car.mark, t, c.st === 'windup' && e.phase === 'fight', c.t / E.CAR_WIND);
        e.crew.forEach(function (o) {
          var C2 = crew[o.id] || (crew[o.id] = makeMan('thug'));
          var rise = o.st === 'hidden' ? 0 : (o.st === 'pop' ? o.rise : 1), gone = o.st === 'out' && o.t > 60;
          /* half out of the window on the camera side, facing up at the roof */
          place(C2.rig.root, bx, bz, e, c.u + o.side * 0.85, c.lat - c.sw - HALF_W * S + 0.5 - rise * 0.15, 0.55 * S * rise - 0.9 * (1 - rise));      /* legs inside the car, chest out of the window */
          C2.rig.root.rotation.y = hd + c.yaw + Math.PI / 2;
          C2.rig.root.visible = o.st !== 'hidden' && !gone;
          var pose = posemath.layer(guard, LEAN_OUT, 1, 1, 1, 1);
          if (o.st === 'windup') pose = posemath.layer(pose, clip('hook', Math.min(1, o.t / E.WIND) * 0.2), 0, 1, 1, 1);
          else if (o.st === 'recover') pose = posemath.layer(pose, clip('hook', 0.2 + Math.min(1, o.t / 26) * 0.4), 0, 1, 1, 1);
          else if (o.st === 'hurt') pose = posemath.layer(pose, posemath.named('hurt'), 0, 1, 1, 1);
          C2.rig.applyPose(pose, { plant: false });
          C2.rig.body.rotation.x = o.st === 'out' ? -Math.min(1.5, o.t * 0.05) : -0.15;
          if (o.st === 'out') { var k = Math.min(1, o.t / 40); C2.rig.root.position.x -= e.l.x * k * 2.4; C2.rig.root.position.z -= e.l.z * k * 2.4; C2.rig.root.position.y -= k * 0.4; }
          pulse(C2.mark, t, o.st === 'windup', o.t / E.WIND);
        });
      }

      /* ---- the police scene ---- */
      if (e.police) {
        if (!police) police = makeCar(1, true);
        place(police.m, bx, bz, e, e.police.u, e.police.lat); police.m.rotation.y = hd;
        var blink = Math.sin(t * 16) > 0; police.bar[0].visible = blink; police.bar[1].visible = !blink;
        var arrived = e.police.u > e.police.stop - 0.5;
        if (!cops.length) cops = e.cops.map(function () { return makeMan('cop'); });
        e.cops.forEach(function (cp, i) {
          var M = cops[i]; M.rig.root.visible = arrived; place(M.rig.root, bx, bz, e, cp.u, cp.lat + (i ? 0 : -0.6));
          M.rig.root.rotation.y = hd + (i ? -Math.PI / 2 - 0.6 : -Math.PI / 2 + 0.6);
          M.rig.applyPose(i ? posemath.idlePose(t) : posemath.layer(posemath.idlePose(t), SALUTE, 0, 1, 1, 1), { plant: true });
        });
        e.cuffed.forEach(function (g) {
          var M = cuffed[g.id] || (cuffed[g.id] = makeMan('thug'));
          M.rig.root.visible = !g.gone; place(M.rig.root, bx, bz, e, g.u, g.lat);
          var walking = g.walk > 0 && !g.gone;
          if (walking) { var tu = e.police.u + 1.2 - g.u, tl = e.police.lat + 1.3 - g.lat; M.rig.root.rotation.y = Math.atan2(e.f.x * tu + e.l.x * tl, e.f.z * tu + e.l.z * tl); }
          else M.rig.root.rotation.y = hd + Math.PI / 2;           /* facing the road, heads down */
          var base = walking ? posemath.walkPose(walkT * 6 + g.id, 0.7) : posemath.idlePose(t + g.id);
          M.rig.applyPose(posemath.layer(base, CUFFED, 0, 1, 1, 1), { plant: true });
        });
      }

      /* ---- Toofan ---- */
      var rig = heroRig;
      if (!H.roof && H.leap <= 0) {
        if (rig.root.parent !== heroBike.pitch) seated(rig, heroBike);
        rig.root.rotation.set(0, 0, 0);
        var pose = ridePose;
        if (H.act) { var kick = /Kick|Sweep|Double/.test(H.act.move); pose = posemath.layer(ridePose, clip(H.act.move, H.act.t / 60), kick ? 1 : 0, 1, 1, 1); }
        else if (H.guard) pose = posemath.layer(ridePose, posemath.named('block'), 0, 0, (H.side || 1) > 0 ? 1 : 0, (H.side || 1) > 0 ? 0 : 1);     /* elbow guard on the side of the threat */
        if (H.hurt > 0) pose = posemath.layer(pose, posemath.named('hurt'), 0, 0.5, 0.5, 0.5);
        rig.applyPose(pose, { plant: false });
        rig.body.rotation.set(0, 0, H.hurt > 0 ? -0.25 * (H.hurt / 22) : 0);
      } else {
        /* the leap from Bijli onto the car, then flat on the roof gripping its edges, rising to strike at the men in the windows */
        if (rig.root.parent !== root) { root.add(rig.root); rig.root.scale.setScalar(S); }
        heroBike.root.updateMatrixWorld(true); seatV.set(heroBike.seat.x, heroBike.seat.y + 0.08 - 0.85, heroBike.seat.z); heroBike.pitch.localToWorld(seatV);
        var c2 = e.car, rl = c2.lat - c2.sw, ru = c2.u - 0.95, rx = bx + e.f.x * ru + e.l.x * rl, ry = ROOF_Y * S + 0.12, rz = bz + e.f.z * ru + e.l.z * rl;
        var k2 = H.roof && e.phase === 'roof' ? 1 : H.leap, s2 = k2 * k2 * (3 - 2 * k2);
        rig.root.position.set(seatV.x + (rx - seatV.x) * s2, seatV.y + (ry - seatV.y) * s2 + Math.sin(Math.PI * k2) * 1.5 * (k2 < 1 ? 1 : 0), seatV.z + (rz - seatV.z) * s2);
        var flat = 1.42 * s2, rising = 0;
        var p2 = posemath.layer(posemath.named('crouch'), CLING, s2, s2, s2, s2);
        if (H.act && k2 >= 1) { rising = Math.sin(Math.PI * Math.min(1, H.act.t / H.act.len)); p2 = posemath.layer(p2, clip(H.act.counter ? 'counterCross' : 'hook', H.act.t / 60), 0, 1, 1, 1); }
        if (H.hurt > 0) p2 = posemath.layer(p2, posemath.named('hurt'), 0, 0.6, 0.6, 0.6);
        rig.applyPose(p2, { plant: false });
        rig.body.position.y = 0; rig.root.rotation.set(flat - rising * 0.55, hd + c2.yaw - rising * 0.5, 0, 'YXZ');
      }
      return true;
    },
    dispose: function () { clearAll(); bursts.forEach(function (b) { root.remove(b.g); b.mat.dispose(); }); bursts = []; [clubGeo, bandGeo, lightGeo, rayGeo, ballGeo].forEach(function (g) { g.dispose(); }); [clubMat, bandMat, goonMat, lightR, lightB].forEach(function (m) { m.dispose(); }); }
  };
}

module.exports = { createEncView: createEncView };
