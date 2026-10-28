/* view: draws the thugs from the simulation. One rig per enemy; poses come from the same keyframed moves as the hero.
   The attack alert is a small burst of spikes over the head, like the comic-book / Arkham warning flash: white for a blow you can
   counter, red for one you cannot. It flares when the wind-up starts, then pulses faster as the strike nears. The body also telegraphs
   (pulled-back arm, weight shift). No rings, dots or lock markers: the lock and the guard are shown by pose alone. */
'use strict';

var herorig = require('./herorig');
var posemath = require('./posemath');
var moveplayer = require('./moveplayer');
var moves = require('../data/moves');
var enemies = require('../data/enemies');

/* how a man's body answers each kind of blow: head and torso snap the way the blow sends them (degrees, metres) */
var REACT = {
  jab: { 'head.rx': -16, 'neck.rx': -6, 'spine.rx': -8 }, cross: { 'head.rx': -20, 'head.ry': -16, 'spine.rx': -10, 'spine.ry': -12 },
  elbow: { 'head.ry': -36, 'spine.ry': -18, 'spine.rz': 8, 'head.rz': 8 },
  hookB: { 'head.ry': 52, 'neck.ry': 22, 'spine.rz': -12, 'spine.ry': 16 }, hook: { 'head.ry': -52, 'neck.ry': -22, 'spine.rz': 12, 'spine.ry': -16 },
  uppercut: { 'head.rx': -40, 'neck.rx': -20, 'spine.rx': -22, 'hip.y': 0.04 }, axeKick: { 'head.rx': 34, 'neck.rx': 22, 'spine.rx': 36, 'hip.y': -0.15 },
  knee: { 'spine.rx': 46, 'hip.rx': 22, 'head.rx': 22, 'hip.y': -0.08 }, roundhouse: { 'head.ry': 66, 'spine.rz': 16, 'spine.ry': 24, 'hip.ry': 18 },
  kick: { 'spine.rx': -26, 'hip.z': -0.08, 'head.rx': -14 }, counterCross: { 'head.rx': -24, 'head.ry': 24, 'spine.rx': -16 },
  counter: { 'spine.rx': -32, 'head.rx': -30, 'hip.y': -0.1 }
};
/* an enemy's guard: elbows tucked in, forearms up and slightly crossed in front of the chest, a narrow compact shape */
var GUARD_CHEST = { 'hip.y': -0.05, 'hip.ry': -20, 'spine.rx': 8, 'head.rx': 8, 'armA.sx': 24, 'armA.sz': 0, 'armA.e': 120, 'armA.pr': -28, 'armA.sy': -28,
  'armB.sx': 26, 'armB.sz': 4, 'armB.e': 116, 'armB.pr': 28, 'armB.sy': 14, 'legA.hx': 20, 'legA.k': 24, 'legB.hx': -12, 'legB.k': 24, 'legB.hz': 10, 'legA.hz': 8 };
/* bent over and dazed: weight forward, chest low, knees soft, head up enough to show the face */
var DAZED = { 'spine.rx': 22, 'hip.rx': 10, 'head.rx': -24, 'hip.y': -0.12, 'legA.k': 14, 'legB.k': 14, 'legA.hx': 10, 'legB.hx': -8 };
function addTo(out, add, k) { for (var n in add) out[n] = (out[n] || 0) + add[n] * k; }

function createEnemyView(scene) {
  var views = {}, TPS = 60;
  var spikeGeo = new THREE.BoxGeometry(0.018, 0.018, 0.2), clubGeo = new THREE.BoxGeometry(0.07, 0.8, 0.07), clubMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    var shadowGeo = new THREE.CircleGeometry(0.5, 20), shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  function make(e) {
    var rig = herorig.createHeroRig('thug'), mark = new THREE.Group(), spikes = [], i;
    for (i = 0; i < 9; i++) {                                                  /* spikes fanned over the head, longer ones in the middle */
      var ang = (i - 4) * 0.36, piv = new THREE.Group(), sp = new THREE.Mesh(spikeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthTest: false }));
      sp.renderOrder = 12; sp.rotation.x = Math.PI / 2; sp.position.y = 0.2; sp.scale.set(1, 1, 1 - Math.abs(i - 4) * 0.12);
      piv.rotation.z = -ang; piv.add(sp); mark.add(piv); spikes.push(sp);
    }
    mark.position.y = 2.1; mark.visible = false; rig.root.add(mark);
    var sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; rig.root.add(sh);
    if (e.kind === 'stick') { var club = new THREE.Mesh(clubGeo, clubMat); club.position.set(0, -0.12, 0.1); rig.parts.R.wrist.add(club); rig.root.scale.setScalar(1.08); }
    scene.add(rig.root);
    return { rig: rig, mark: mark, spikes: spikes, shadow: sh, cur: posemath.named('stand'), face: e.face, t: Math.random() * 6, sink: 0 };
  }
  function pose(e, v, dt) {
    var K = enemies.KINDS[e.kind], mv = moves.MOVES[K.clip], base;
    if (e.st === 'approach') base = e.moving ? posemath.walkPose(e.phase * 0.9, 0.9) : posemath.layer(posemath.idlePose(v.t), posemath.named('guard'), 0.3, 1, 1, 1);
    else base = posemath.layer(posemath.idlePose(v.t), posemath.named('guard'), 0.4, 1, 1, 1);
    var out = base;
    if (e.guarding) {
      /* arms up; each blow he soaks makes it worse: the first jolts him and sags the guard, the second nearly folds it */
      out = posemath.layer(base, GUARD_CHEST, 0.6, 1, 1, 1);
      var gh = e.guardHits || 0, jolt = Math.exp(-Math.max(0, e.blockT) / 16) * (e.blockT < 70 ? 1 : 0);
      /* each blow he soaks folds him further forward over his arms: shoulders hunch, knees give, head tucks down, arms pulled in at the belly */
      addTo(out, { 'spine.rx': 20 + 8 * gh, 'hip.rx': 10 + 4 * gh, 'head.rx': 2, 'hip.y': -0.09, 'legA.k': 10, 'legB.k': 10, 'armA.sx': -16, 'armB.sx': -16, 'armA.e': 12, 'armB.e': 12 }, jolt);
      addTo(out, { 'spine.rx': 14, 'hip.rx': 8, 'hip.y': -0.06, 'armA.sx': -14, 'armB.sx': -14, 'armA.e': 10, 'armB.e': 10 }, gh * 1.0);      /* he stays bent over his guard until he steadies */
    }
    if (e.st === 'windup' || e.st === 'strike' || e.st === 'recover') {
      var u = e.st === 'windup' ? Math.min(1, e.t / (K.windup * TPS)) : 1;
      var ct = e.st === 'windup' ? u * mv.hit * 0.95 : mv.hit * 0.95 + Math.min(1, (e.st === 'strike' ? e.t : 8 + e.t) / 30) * (mv.len - mv.hit * 0.95);
      /* anticipation: lean back before the swing */
      var clip = moveplayer.clipPose(K.clip, ct), w = e.st === 'recover' ? Math.max(0, 1 - e.t / (K.recover * TPS * 0.6)) : 1;
      out = posemath.layer(base, clip, w, w, w, w);
      if (e.st === 'windup') { out['spine.rx'] = (out['spine.rx'] || 0) - 10 * u; }
    } else if (e.st === 'guardbreak') {
      /* the guard is smashed open: arms flung wide, head and chest thrown back, a stagger on the spot */
      var gb = Math.min(1, e.t / 5) * (v.held ? 1 : 1 - Math.max(0, (e.t - 40) / 15)); out = posemath.copy(base);
      addTo(out, DAZED, gb); addTo(out, { 'armA.sx': -26, 'armB.sx': -26, 'armA.sz': 24, 'armB.sz': 24, 'armA.e': -10, 'armB.e': -10, 'spine.rx': 12, 'hip.rx': 8 }, gb);      /* guard smashed down: folded forward, arms hanging, face exposed */
    } else if (e.st === 'hurt') {
      /* per-blow reaction: snaps in fast, eases back; the body twists the way that blow sends it */
      var jt = e.t < 4 ? e.t / 4 : Math.exp(-(e.t - 4) / 13); out = posemath.copy(base);
      if (v.daze > 0.01) addTo(out, DAZED, v.daze); addTo(out, REACT[e.lastMove] || REACT.jab, jt * 1.35); addTo(out, { 'armA.sx': -20, 'armB.sx': -14, 'armA.sz': 14, 'armB.sz': 12, 'hip.y': -0.03 }, jt);
    } else if (e.st === 'down' || e.st === 'dead') {
      var dw = Math.min(1, e.t / 12); out = posemath.layer(base, posemath.named('down'), dw, dw, dw, dw);
    } else if (e.st === 'getup') {
      var gw = 1 - Math.min(1, e.t / 30); out = posemath.layer(base, posemath.named('down'), gw, gw, gw, gw);
    }
    posemath.approach(v.cur, out, 22, dt);
    return v.cur;
  }
  return {
    sync: function (list, alpha, dt, target, seqId) {
      var seen = {};
      for (var i = 0; i < list.length; i++) {
        var e = list[i], v = views[e.id] || (views[e.id] = make(e)); seen[e.id] = 1; v.t += dt;
        var x = e.px + (e.x - e.px) * alpha, z = e.pz + (e.z - e.pz) * alpha;
        var dy = Math.atan2(Math.sin(e.face - v.face), Math.cos(e.face - v.face)); v.face += dy * (1 - Math.exp(-14 * dt));
        var lying = e.st === 'down' || e.st === 'dead';
        v.held = seqId === e.id && (e.st === 'hurt' || e.st === 'guardbreak');
        v.daze = (v.daze || 0) + ((v.held ? 1 : 0) - (v.daze || 0)) * (1 - Math.exp(-9 * dt));
        v.sx = (v.sx || 0) * Math.exp(-dt * 8); v.sz = (v.sz || 0) * Math.exp(-dt * 8);          /* shoved by the blow, springs back to where he stood */
        v.rig.root.position.set(x + v.sx, 0, z + v.sz); v.rig.root.rotation.y = v.face;
        v.rig.applyPose(pose(e, v, dt), { plant: true }); v.rig.flutter(v.t, 0);
        /* thrown by the last blow: he leaves the ground for a moment before he lands */
        if (e.thrown && e.st === 'down' && e.t < 22) v.rig.root.position.y = Math.sin(Math.PI * Math.min(1, e.t / 22)) * 0.55;
        /* face: eyes squeezed shut while he is reeling or out, mouth open and bloody once hit, blood smeared from the second blow on */
        var fx = v.rig.faceFx;
        if (fx) {
          var hurtish = e.st === 'hurt' || e.st === 'guardbreak' || e.st === 'down' || e.st === 'dead' || seqId === e.id;
          var open = hurtish && (e.hitN || 0) >= 1, vis = hurtish ? 1 : 0, k;
          for (k = 0; k < fx.lids.length; k++) fx.lids[k].visible = !!vis;
          fx.mouth.visible = open; fx.blood.visible = (e.hitN || 0) >= 2;
        }
        if (e.st === 'dead' && e.t > 55) { v.sink = Math.min(1, (e.t - 55) / 45); v.rig.root.position.y = -v.sink * 0.9; }
        /* telegraph */
        var m = v.mark, K = enemies.KINDS[e.kind];
        if (e.st === 'windup') {
          var u = e.t / (K.windup * TPS), flare = e.t < 8 ? 1.9 - e.t * 0.1 : 1, pulse = 1 + Math.sin(v.t * (14 + u * 22)) * 0.12;
          m.visible = true; m.scale.setScalar(flare * pulse * (K.blockable ? 1.3 : 1.8)); m.position.y = 2.05 + (K.blockable ? 0 : 0.08);
          var col = K.blockable ? 0xffffff : 0xff2a1a; for (var si = 0; si < v.spikes.length; si++) { v.spikes[si].material.color.setHex(col); v.spikes[si].material.opacity = u < 0.15 ? u / 0.15 : 1; }
        } else m.visible = false;
        v.shadow.visible = !lying || e.t < 60;
      }
      for (var id in views) if (!seen[id]) { scene.remove(views[id].rig.root); delete views[id]; }
    },
    /* world position of his mouth and eyes, and the way his face is pointing (for spit, blood and the close-up camera) */
    /* the blow drives his whole body along its direction, then he settles back */
    shove: function (id, dx, dz, amt) { var v = views[id]; if (v) { v.sx = (v.sx || 0) + dx * amt; v.sz = (v.sz || 0) + dz * amt; } },
    facePoint: function (id) {
      var v = views[id], fx = v && v.rig.faceFx; if (!fx) return null;
      v.rig.root.updateMatrixWorld(true);
      var m = v.rig.head.localToWorld(new THREE.Vector3(fx.mouthPt[0], fx.mouthPt[1], fx.mouthPt[2])), q = v.rig.head.localToWorld(new THREE.Vector3(fx.eyePt[0], fx.eyePt[1], fx.eyePt[2]));
      var f = v.rig.head.localToWorld(new THREE.Vector3(fx.eyePt[0], fx.eyePt[1], fx.eyePt[2] + 0.1)); f.sub(q).normalize();
      return { fdx: f.x, fdy: f.y, fdz: f.z, mx: m.x, my: m.y, mz: m.z, ex: q.x, ey: q.y, ez: q.z, face: v.face };
    },
    count: function () { return Object.keys(views).length; },
    dispose: function () { for (var id in views) scene.remove(views[id].rig.root); views = {}; }
  };
}

module.exports = { createEnemyView: createEnemyView };
