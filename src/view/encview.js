/* view: road fights in ride mode. Goons on bikes riding one lane to Toofan's left, a gang car with its crew climbing out on the roof,
   the police car, warning flashes before blows, and Toofan's punches, kicks, guard, leap and roof fight. Reads the encounter sim only. */
'use strict';

var R = require('../data/ride');
var bikevox = require('./bikevox');
var herorig = require('./herorig');
var posemath = require('./posemath');
var moveplayer = require('./moveplayer');
var ambient = require('./ambientvox');

var ROOF_Y = 1.32;                                   /* top of the car's roof, before scaling */

function makeMark(color) {                            /* the warning flash: a burst of thin rays over the head, like the brawler's */
  var g = new THREE.Group(), geo = new THREE.BoxGeometry(0.03, 0.03, 0.36), mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, depthTest: false });
  for (var i = 0; i < 9; i++) { var piv = new THREE.Group(), m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2; m.position.y = 0.3; m.scale.z = 1 - Math.abs(i - 4) * 0.12; m.renderOrder = 12; piv.rotation.z = -(i - 4) * 0.36; piv.add(m); g.add(piv); }
  g.visible = false; g.userData.mat = mat; return g;
}

function createEncView(root, heroRig, heroBike, blobUnder) {
  var S = R.SCALE, foes = {}, crew = {}, car = null, police = null, ridePose = posemath.named('ride'), guard = posemath.named('guard');
  var clubGeo = new THREE.BoxGeometry(0.07, 0.8, 0.07), clubMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  var foeMat = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xb05050 });     /* the goons' bikes: dark red, not Bijli's blue */
  var v3 = new THREE.Vector3(), seatV = new THREE.Vector3();
  var lightR = new THREE.MeshBasicMaterial({ color: 0xff2a2a }), lightB = new THREE.MeshBasicMaterial({ color: 0x2a6bff }), lightGeo = new THREE.BoxGeometry(0.35, 0.14, 0.2);

  function seated(rig, bike) { bike.pitch.add(rig.root); rig.root.position.set(bike.seat.x, bike.seat.y + 0.08 - 0.85, bike.seat.z); rig.root.rotation.set(0, 0, 0); rig.root.scale.setScalar(1); }
  function clip(name, sec) { return moveplayer.clipPose(name, sec); }
  function place(obj, bx, bz, e, u, lat, y) { obj.position.set(bx + e.f.x * u + e.l.x * lat, y || 0, bz + e.f.z * u + e.l.z * lat); }
  function heading(e) { return Math.atan2(e.f.x, e.f.z); }

  function makeFoe(o) {
    var bike = bikevox.createBike(), rig = herorig.createHeroRig('thug'), mark = makeMark(0xffffff);
    bike.root.scale.setScalar(S); seated(rig, bike); bike.root.traverse(function (m) { if (m.isMesh) m.material = foeMat; }); root.add(bike.root); rig.head.add(mark); mark.position.y = 0.55;
    if (o.kind === 'rod') { var club = new THREE.Mesh(clubGeo, clubMat); club.position.set(0, -0.12, 0.1); rig.parts.R.wrist.add(club); }
    blobUnder(bike.root, 0.9, 2.1);
    return { bike: bike, rig: rig, mark: mark, wheel: 0 };
  }
  function makeCrew() { var rig = herorig.createHeroRig('thug'), mark = makeMark(0xffffff); rig.root.scale.setScalar(S); rig.head.add(mark); mark.position.y = 0.55; root.add(rig.root); return { rig: rig, mark: mark }; }
  function makeCar(look, lights) {
    var m = ambient.createMesh({ kind: 'car', look: look, id: look }); m.scale.setScalar(S); blobUnder(m, 2.2, 4.2); root.add(m);
    var mark = makeMark(0xff3a2a); mark.position.y = ROOF_Y + 0.9; mark.scale.setScalar(1 / S * 2.2); m.add(mark);
    var bar = null;
    if (lights) { bar = [new THREE.Mesh(lightGeo, lightR), new THREE.Mesh(lightGeo, lightB)]; bar[0].position.set(-0.2, ROOF_Y + 0.07, 0); bar[1].position.set(0.2, ROOF_Y + 0.07, 0); m.add(bar[0]); m.add(bar[1]); }
    return { m: m, mark: mark, bar: bar };
  }
  function pulse(mark, t, on, u) { mark.visible = on; if (on) { var p = (1 + Math.sin(t * (14 + u * 22)) * 0.12) * (u < 0.2 ? 1.6 - u * 3 : 1); mark.scale.setScalar(p * (mark.userData.base || 1)); mark.userData.mat.opacity = Math.min(1, u * 6); } }
  function clearAll() {
    Object.keys(foes).forEach(function (k) { root.remove(foes[k].bike.root); }); foes = {};
    Object.keys(crew).forEach(function (k) { root.remove(crew[k].rig.root); }); crew = {};
    if (car) { root.remove(car.m); car = null; } if (police) { root.remove(police.m); police = null; }
  }

  return {
    active: false,
    /* returns true while it is in charge of the hero's pose and place */
    sync: function (r, alpha, dt, t, bx, bz) {
      var e = r.enc;
      if (!e) { if (this.active) { clearAll(); this.active = false; if (heroRig.root.parent !== heroBike.pitch) seated(heroRig, heroBike); heroRig.applyPose(ridePose, { plant: false }); heroRig.body.rotation.set(0, 0, 0); } return false; }
      this.active = true;
      var h = heading(e), H = e.hero, E = R.ENC;

      /* ---- bike goons ---- */
      var seen = {};
      (e.foes || []).forEach(function (o) {
        seen[o.id] = 1; var F = foes[o.id] || (foes[o.id] = makeFoe(o));
        place(F.bike.root, bx, bz, e, o.u, E.LAT); F.bike.root.rotation.y = h;
        F.wheel += (r.bike.speed + (o.st === 'down' ? -7 : 0)) * dt / (F.bike.wheelR * S); F.bike.front.rotation.x = F.wheel; F.bike.rear.rotation.x = F.wheel;
        var pose = ridePose, down = o.st === 'down';
        if (o.st === 'windup') pose = posemath.layer(ridePose, clip('bkHookR', Math.min(1, o.t / E.WIND) * 0.19), 0, 1, 1, 1);
        else if (o.st === 'recover') pose = posemath.layer(ridePose, clip('bkHookR', 0.19 + Math.min(1, o.t / 26) * 0.35), 0, 1 - o.t / 26, 1 - o.t / 26, 1 - o.t / 26);
        else if (o.st === 'hurt') pose = posemath.layer(ridePose, posemath.named('hurt'), 0, 0.6 * Math.max(0, 1 - o.t / 20), 0.6, 0.6);
        F.rig.applyPose(pose, { plant: false });
        F.rig.body.rotation.z = o.st === 'hurt' ? 0.3 * Math.exp(-o.t / 10) : 0;
        F.bike.lean.rotation.z = down ? Math.min(1.35, o.t * 0.06) : (o.st === 'hurt' ? 0.15 : 0);
        pulse(F.mark, t, o.st === 'windup', o.t / E.WIND);
      });
      Object.keys(foes).forEach(function (k) { if (!seen[k]) { root.remove(foes[k].bike.root); delete foes[k]; } });

      /* ---- the gang car, its crew and the police ---- */
      if (e.car) {
        var c = e.car; if (!car) car = makeCar(0, false);
        place(car.m, bx, bz, e, c.u, c.lat - c.sw * 1.0); car.m.rotation.y = h + c.yaw + c.sw * 0.12;
        car.mark.userData.base = 2.2 / S; pulse(car.mark, t, c.st === 'windup' && e.phase === 'fight', c.t / E.CAR_WIND);
        var roofY = ROOF_Y * S;
        e.crew.forEach(function (o) {
          var C2 = crew[o.id] || (crew[o.id] = makeCrew());
          var rise = o.st === 'hidden' ? 0 : (o.st === 'pop' ? o.rise : (o.st === 'out' ? 1 : 1));
          place(C2.rig.root, bx, bz, e, c.u + o.side * 1.05, c.lat - c.sw, roofY - (1 - rise) * 2.0);
          C2.rig.root.rotation.y = h + (o.side > 0 ? Math.PI : 0) + c.yaw;
          C2.rig.root.visible = o.st !== 'hidden' && !(o.st === 'out' && o.t > 70);
          var pose = guard;
          if (o.st === 'windup') pose = posemath.layer(guard, clip('hook', Math.min(1, o.t / E.WIND) * 0.2), 0.4, 1, 1, 1);
          else if (o.st === 'recover') pose = posemath.layer(guard, clip('hook', 0.2 + Math.min(1, o.t / 26) * 0.4), 0.4, 1, 1, 1);
          else if (o.st === 'hurt') pose = posemath.layer(guard, posemath.named('hurt'), 0.6, 1, 1, 1);
          else if (o.st === 'out') pose = posemath.named('down');
          C2.rig.applyPose(pose, { plant: o.st !== 'out' });
          if (o.st === 'out') { var k = Math.min(1, o.t / 40); C2.rig.root.position.x += e.l.x * k * 2.6; C2.rig.root.position.z += e.l.z * k * 2.6; C2.rig.root.position.y = roofY * (1 - k) + Math.sin(Math.PI * k) * 0.8; }
          pulse(C2.mark, t, o.st === 'windup', o.t / E.WIND);
        });
        if (e.police) {
          if (!police) police = makeCar(1, true);
          place(police.m, bx, bz, e, e.police.u, E.LAT); police.m.rotation.y = h;
          var blink = Math.sin(t * 16) > 0; police.bar[0].visible = blink; police.bar[1].visible = !blink;
        }
      }

      /* ---- Toofan ---- */
      var rig = heroRig;
      if (!H.roof && H.leap <= 0) {
        if (rig.root.parent !== heroBike.pitch) seated(rig, heroBike);
        var pose = ridePose;
        if (H.act) { var kick = /Kick|Sweep|Double/.test(H.act.move); pose = posemath.layer(ridePose, clip(H.act.move, H.act.t / 60), kick ? 1 : 0, 1, 1, 1); }
        else if (H.guard) pose = posemath.layer(ridePose, posemath.named('block'), 0, 0, 1, 0);
        if (H.hurt > 0) pose = posemath.layer(pose, posemath.named('hurt'), 0, 0.5, 0.5, 0.5);
        rig.applyPose(pose, { plant: false });
        rig.body.rotation.set(0, 0, H.hurt > 0 ? -0.25 * (H.hurt / 22) : 0);
      } else {
        /* leaping between Bijli and the car roof, or fighting on the roof */
        if (rig.root.parent !== root) { root.add(rig.root); rig.root.scale.setScalar(S); }
        heroBike.root.updateMatrixWorld(true); seatV.set(heroBike.seat.x, heroBike.seat.y + 0.08 - 0.85, heroBike.seat.z); heroBike.pitch.localToWorld(seatV);
        var c2 = e.car, roof = v3.set(bx + e.f.x * c2.u + e.l.x * (c2.lat - c2.sw), ROOF_Y * S, bz + e.f.z * c2.u + e.l.z * (c2.lat - c2.sw));
        var k2 = H.roof && e.phase === 'roof' ? 1 : H.leap, s2 = k2 * k2 * (3 - 2 * k2);
        rig.root.position.set(seatV.x + (roof.x - seatV.x) * s2, seatV.y + (roof.y - seatV.y) * s2 + Math.sin(Math.PI * k2) * 1.6 * (k2 < 1 ? 1 : 0), seatV.z + (roof.z - seatV.z) * s2);
        var target = null; (e.crew || []).forEach(function (o) { if (!target && o.st !== 'out' && o.st !== 'hidden') target = o; });
        rig.root.rotation.y = h + (target && target.side < 0 ? Math.PI : 0);
        var p2 = k2 < 1 ? posemath.named('crouch') : guard;
        if (H.act && k2 >= 1) p2 = posemath.layer(guard, clip(H.act.move, H.act.t / 60), 1, 1, 1, 1);
        if (H.hurt > 0) p2 = posemath.layer(p2, posemath.named('hurt'), 0.5, 0.8, 0.8, 0.8);
        rig.applyPose(p2, { plant: k2 >= 1 }); rig.body.rotation.set(k2 < 1 ? -k2 * 0.6 : 0, 0, 0);
        if (k2 >= 1) rig.root.position.y = roof.y + rig.body.position.y * 0;
      }
      return true;
    },
    dispose: function () { clearAll(); clubGeo.dispose(); clubMat.dispose(); lightGeo.dispose(); lightR.dispose(); lightB.dispose(); foeMat.dispose(); }
  };
}

module.exports = { createEncView: createEncView };
