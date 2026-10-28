/* modes: Hero studio. Inspect the rig: poses, motion previews, joint sliders, camera views, skeleton and ruler. */
'use strict';

var herorig = require('../view/herorig');
var posemath = require('../view/posemath');
var moveplayer = require('../view/moveplayer');
var fxmod = require('../view/fx');
var orbitMod = require('../view/orbit');
var uiMod = require('../view/studioui');
var stageMod = require('../view/stage');
var poseData = require('../data/poses');

var VIEWS = {
  front: [0, 1.46, 4.4, 1.0], side: [Math.PI / 2, 1.46, 4.4, 1.0], back: [Math.PI, 1.46, 4.4, 1.0], three: [0.62, 1.38, 4.6, 1.0],
  face: [0.3, 1.5, 1.35, 1.72], feet: [0.5, 1.22, 1.7, 0.18]
};

function createStudio() {
  var S = {};
  return {
    name: 'studio',
    enter: function (ctx, scope) {
      var view = ctx.view;
      view.setSky('#18202a', false);
      ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = true;
      S.rig = herorig.createHeroRig(); view.scene.add(S.rig.root);
      S.stage = stageMod.createStudioStage(); view.scene.add(S.stage.group);
      S.skel = herorig.createSkeletonOverlay(S.rig); S.skel.visible = false; view.scene.add(S.skel);
      S.orbit = orbitMod.createOrbit(view.camera, view.canvas); S.orbit.enable(true);
      S.cur = posemath.named('stand'); S.target = posemath.named('stand');
      S.motion = null; S.t = 0; S.mp = moveplayer.createMovePlayer(); S.last = ctx.now(); S.opts = { plant: true, southpaw: false, spin: false }; S.spinAngle = 0; S.height = 0; S.chipT = 0; S.fps = 60;
      S.orbit.goTo(VIEWS.three[0], VIEWS.three[1], VIEWS.three[2], VIEWS.three[3]);

      S.ui = uiMod.createStudioUI(ctx.studioRoot, {
        onPose: function (n) { S.motion = null; S.target = posemath.named(n); S.ui.syncPose(S.target); },
        onMotion: function (m) {
          if (m === 'hold') { S.target = posemath.copy(S.cur); S.motion = null; S.ui.syncPose(S.target); return; }
          S.motion = { type: m, t: 0 };
        },
        onJoint: function (k, v) { S.motion = null; S.target[k] = v; },
        onView: function (v) { var p = VIEWS[v]; S.orbit.goTo(p[0], p[1], p[2], p[3]); S.ui.checks.orbit.checked = false; S.orbit.setAutoSpin(false); },
        onToggle: function (k, v) {
          if (k === 'skeleton') S.skel.visible = v;
          else if (k === 'ruler') S.stage.showRuler(v);
          else if (k === 'plant') S.opts.plant = v;
          else if (k === 'southpaw') S.opts.southpaw = v;
          else if (k === 'spin') { S.opts.spin = v; if (!v) S.spinAngle = 0; }
          else if (k === 'orbit') S.orbit.setAutoSpin(v);
          else if (k === 'guitar') S.rig.guitar.visible = v;
        }
      });
      S.ui.setParts(S.rig.stats.parts); S.ui.syncPose(S.target); S.ui.show(true);
      ctx.debug.studio = S; S.clip = moveplayer.clipPose;
      S.fx = fxmod.createFx(view.scene);
      S.mp.onFx(function (kind) { S.fxSpawn(kind); });
      S.fxSpawn = function (kind) { var o = S.rig.guitarPoint(30, 0, 0); S.fx.spawn(kind, o, S.rig.root.rotation.y); };
      scope.add(function () {
        S.ui.show(false); ctx.studioRoot.innerHTML = '';
        S.orbit.dispose(); view.scene.remove(S.rig.root); view.scene.remove(S.stage.group); view.scene.remove(S.skel);
        S.fx.dispose(); S.stage.dispose(); S.skel.userData.dispose(); delete ctx.debug.studio;
      });
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = Math.min(0.1, Math.max(0.001, (now - S.last) / 1000)); S.last = now; S.t += dt;
      var m = S.motion, pose;
      if (m) {
        m.t += dt;
        if (m.type === 'idle') pose = posemath.idlePose(m.t);
        else if (m.type === 'walk') pose = posemath.walkPose(m.t * 0.95, 1);
        else if (m.type === 'jog') pose = posemath.walkPose(m.t * 1.45, 1.7);
        else if (m.type === 'combo') {
          if (!S.mp.active()) { if (m.gap === undefined) m.gap = 0; m.gap -= dt; if (m.gap <= 0) { S.mp.press(); m.gap = 0.9; } }
          else if (S.mp.comboIdx >= 0 && S.mp.comboIdx < 4) S.mp.press();
          var mo = S.mp.update(dt); pose = mo ? mo.pose : posemath.named('guard');
          if (!mo) m.gap = Math.max(m.gap, 0.4);
        } else if (m.type.indexOf('move:') === 0) {
          var nm = m.type.slice(5);
          if (!S.mp.active()) { m.gap = (m.gap || 0) - dt; if (m.gap <= 0) { S.mp.play(nm); m.gap = 0.7; } }
          var mo2 = S.mp.update(dt); pose = mo2 ? mo2.pose : posemath.named('guard');
        } else pose = posemath.sequencePose(poseData.SEQUENCES[m.type], m.t);
        S.cur = pose;
      } else {
        posemath.approach(S.cur, S.target, 14, dt); pose = S.cur;
      }
      if (S.opts.spin) { S.spinAngle += 520 * dt; pose = posemath.copy(pose); pose['hip.ry'] = (pose['hip.ry'] || 0) + S.spinAngle; }
      S.fx.update(dt);
      S.rig.applyPose(pose, S.opts);
      S.rig.flutter(S.t, 0.15);
      if (!S.height) {
        var b = new THREE.Box3().setFromObject(S.rig.root); S.height = b.max.y; S.stage.setHeight(S.height);
        S.rig.root.updateMatrixWorld(true);
      }
      if (S.skel.visible) { S.rig.root.updateMatrixWorld(true); S.skel.userData.update(); }
      S.orbit.update(dt);
      ctx.view.render();
      S.fps += (1 / dt - S.fps) * 0.1; S.chipT -= dt;
      if (S.chipT <= 0) {
        S.chipT = 0.5; var vs = ctx.view.stats(), st = S.rig.stats;
        S.ui.setChips([['Voxels', st.voxels.toLocaleString()], ['Triangles', st.triangles.toLocaleString()], ['Height', (S.height || 0).toFixed(2) + ' m'],
                       ['Voxel size', '2.5 cm'], ['Parts', Object.keys(st.parts).length], ['Draw calls', vs.calls], ['Frames/s', Math.round(S.fps)]]);
      }
    },
    exit: function () {}
  };
}

module.exports = { createStudio: createStudio };
