/* modes: Toofan's hideout, walked around. After the New Game nightmare he gets up here; Raka follows him about. Walk with the stick (or
   WASD) and use what is near with the fist button (or J / Space):
     bed         - rest a moment                         gang chart  - the gang files (each boss, his places, his men) and the city map
     workbench   - training: push-ups, skipping, shadow boxing (scores for fun)   gym - work the heavy bag (the brawler's own combo)
     guitar      - play; the Toofaan song comes on        Raka        - a pat on the head
     Bijli       - ride out into the city
   The layout is sim/hideoutgen's, the same room the nightmare is in, seen from above through a cut-away ceiling and front wall. */
'use strict';

var hideout = require('../sim/hideoutgen');
var hideoutview = require('../view/hideoutview');
var herorig = require('../view/herorig');
var posemath = require('../view/posemath');
var moveplayer = require('../view/moveplayer');
var dogvox = require('../view/dogvox');
var bikevox = require('../view/bikevox');
var sfxmod = require('../view/sfx');
var musicMod = require('../view/music');
var fullmap = require('../view/fullmap');
var rideMode = require('./ride');
var rideSim = require('../sim/ride');
var training = require('./training');
var gangfiles = require('../view/gangfiles');

var W = hideout.WALLS, SOL = hideout.SOLIDS, R = 0.3, SPEED = 2.4;
var HELD = { 'gtr.on': 1, 'gtr.gy': 14, 'gtr.ya': 14, 'gtr.yb': -2, 'gtr.px': 10, 'gtr.py': 8, 'gtr.pz': 14, 'gtr.rx': 0, 'gtr.ry': -23, 'gtr.rz': -90 };
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function angTo(a, b, k) { var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * k; }

/* push a circle out of the walls and the furniture */
function collide(p) {
  p.x = clamp(p.x, W.x0 + R, W.x1 - R); p.z = clamp(p.z, W.z0 + R, W.z1 - R);
  for (var i = 0; i < SOL.length; i++) {
    var s = SOL[i], cx = clamp(p.x, s[0], s[2]), cz = clamp(p.z, s[1], s[3]), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < R) {
      if (d > 1e-4) { p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
      else { var l = p.x - s[0], r = s[2] - p.x, t = p.z - s[1], b = s[3] - p.z, m = Math.min(l, r, t, b); if (m === l) p.x = s[0] - R; else if (m === r) p.x = s[2] + R; else if (m === t) p.z = s[1] - R; else p.z = s[3] + R; }
    }
  }
}

function createHideoutMode() {
  var S = {};
  return {
    name: 'hideout',
    enter: function (ctx, scope, args) {
      var view = ctx.view, from = (args && args.from) || 'ramp';
      view.setSky('#030407', false); ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = false; ctx.touch.setFinisherVisible(false);
      var blk = ctx.touchRoot.querySelector('#btnBlock'); if (blk) { blk.style.visibility = 'hidden'; scope.add(function () { blk.style.visibility = ''; }); }
      var bd = function () { if (S.train && S.train.playing()) S.train.press('block'); };
      if (blk) { blk.addEventListener('pointerdown', bd); scope.add(function () { blk.removeEventListener('pointerdown', bd); }); }
      S.sfx = sfxmod.createSfx(); S.music = musicMod.createMusic(S.sfx); S.music.setTrack('hideout');
      S.hide = hideoutview.createHideout(view, hideout.build(7, { cutaway: true }));
      S.rig = herorig.createHeroRig('home'); S.rig.guitar.visible = false; view.scene.add(S.rig.root);
      S.key = new THREE.PointLight(0xc8d6ff, 0.9, 5, 1.4); view.scene.add(S.key);
      S.dog = dogvox.createDog(); view.scene.add(S.dog.root);
      S.bike = bikevox.createBike(); S.bike.root.position.set(1.1, 0.2, 6.6); S.bike.root.rotation.y = Math.PI / 2; view.scene.add(S.bike.root);
      S.mp = moveplayer.createMovePlayer(); S.cur = posemath.named('stand'); S.phase = 0; S.t = 0; S.last = 0; S.use = null;  S.msgT = 0;
      S.p = from === 'bed' ? { x: 1.45, z: -0.15, face: Math.PI / 2 } : { x: -1.6, z: 4.6, face: Math.PI };
      S.d = from === 'bed' ? { x: 1.0, z: 0.5, face: Math.PI, st: 'sit' } : { x: 3.4, z: 0.35, face: 0, st: 'sleep' };
      S.mp.onHit(function (mv) { S.sfx.hit(mv, 0.6); });
      ctx.debug.hideout = S;
      /* words: what is near, and a line for what just happened */
      var ui = document.createElement('div');
      ui.style.cssText = 'position:fixed;left:0;right:0;bottom:max(26px,env(safe-area-inset-bottom));z-index:8;pointer-events:none;text-align:center;color:#d8ffe0;font-size:14px;letter-spacing:.14em;text-shadow:0 0 6px #000,0 1px 2px #000';
      ui.innerHTML = '<div id="hoMsg" style="color:#ffd21f;font-size:15px;min-height:22px;opacity:0;transition:opacity .3s"></div><div id="hoUse" style="display:inline-block;padding:8px 14px;border:1px solid rgba(140,255,156,.5);background:rgba(0,0,0,.6);border-radius:4px;opacity:0;transition:opacity .2s"></div>';
      var tag = document.createElement('div'); tag.style.cssText = 'position:fixed;right:max(14px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));z-index:8;pointer-events:none;color:#8cff9c;font-size:12px;letter-spacing:.2em;text-shadow:0 1px 2px #000';
      tag.textContent = '> HIDEOUT';
      document.body.appendChild(ui); document.body.appendChild(tag);
      S.ui = { msg: ui.querySelector('#hoMsg'), use: ui.querySelector('#hoUse') };
      S.say = function (t, sec) { S.ui.msg.textContent = t; S.ui.msg.style.opacity = 1; S.msgT = sec || 2.2; };
      S.say('STICK / WASD TO WALK  ·  ✊ / SPACE TO USE', 4);
      /* a dark fade for the bed */
      var fade = document.createElement('div'); fade.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;background:#000;opacity:0;transition:opacity .6s'; document.body.appendChild(fade); S.fade = fade;
      S.map = fullmap.createFullMap();
      S.files = gangfiles.createGangFiles();
      S.train = training.createTraining(ctx, S); S.train.onClose = function () { S.use = null; };
      /* the use button: caught as it is pressed, so even a quick tap counts */
      S.pressQ = false;
      var kd = function (e) { if ((e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter') && !e.repeat) S.pressQ = true; if ((e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat && S.train && S.train.playing()) S.train.press('block'); };
      var ab = ctx.touchRoot.querySelector('#btnAttack'), pd = function () { S.pressQ = true; };
      window.addEventListener('keydown', kd); if (ab) ab.addEventListener('pointerdown', pd);
      scope.add(function () { window.removeEventListener('keydown', kd); if (ab) ab.removeEventListener('pointerdown', pd); });
      scope.add(function () {
        S.map.dispose(); S.files.dispose(); S.train.dispose(); ui.remove(); tag.remove(); fade.remove(); S.hide.dispose(); view.scene.remove(S.key);
        view.scene.remove(S.rig.root); view.scene.remove(S.dog.root); S.dog.dispose(); view.scene.remove(S.bike.root);
      });
    },
    step: function (ctx, tick) { ctx.input.tick(tick); },
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var view = ctx.view, inp = ctx.input.state, p = S.p, t = S.t;
      if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.ui.msg.style.opacity = 0; }
      /* ---- walking ---- */
      var busy = S.mapOpen || S.train.active() || S.files.isOpen(), mx = inp.mx, my = inp.my, m = Math.hypot(mx, my), moving = m > 0.15 && !busy;
      if (moving && S.use && S.use.id !== 'chart') { if (S.use.id === 'music') S.music.setTrack('hideout'); S.use = null; S.mp.cancel(); S.rig.guitar.visible = false; }
      if (moving && !S.use) {
        var sp = SPEED * Math.min(1, m); p.x += mx / m * sp * Math.min(1, m) * dt; p.z -= my / m * sp * Math.min(1, m) * dt; collide(p);
        p.face = angTo(p.face, Math.atan2(mx, -my), 1 - Math.exp(-12 * dt)); S.phase += sp * dt / 1.6;
      }
      /* ---- what is near ---- */
      var near = null, nd = 1.1;
      hideout.STATIONS.forEach(function (st) { var d = Math.hypot(st.x - p.x, st.z - p.z); if (d < nd) { nd = d; near = st; } });
      var dd = Math.hypot(S.d.x - p.x, S.d.z - p.z);
      if (!near && dd < 1.0 && !S.use) near = { id: 'raka', label: 'PAT RAKA', x: S.d.x, z: S.d.z };
      var prompt = S.use && S.use.id === 'bench' ? '' : S.use ? (S.use.id === 'gym' ? '✊ PUNCH  ·  WALK AWAY TO STOP' : S.use.id === 'music' ? 'WALK AWAY TO STOP' : '') : (near ? '✊ ' + near.label : '');
      S.ui.use.textContent = prompt; S.ui.use.style.opacity = prompt ? 1 : 0;
      var pressed = S.pressQ; S.pressQ = false;
      if (pressed && S.train.playing()) S.train.press('fist');
      else if (pressed && !busy) {
        if (S.use && S.use.id === 'gym') S.mp.press();
        else if (!S.use && near) use(near);
      }
      function use(st) {
        if (st.id === 'raka') { S.d.st = 'lick'; S.d.until = t + 1.4; S.d.face = Math.atan2(p.x - S.d.x, p.z - S.d.z); S.sfx.bark(); S.say('RAKA WAGS HIS TAIL', 1.6); return; }
        if (st.id === 'bijli') { S.say('BIJLI, CHAL!', 1); S.sfx.start(); S.leaving = now + 900; return; }
        p.x = st.x; p.z = st.z; p.face = st.face; S.use = { id: st.id, t: 0 };
        if (st.id === 'bed') { S.fade.style.opacity = 1; S.say('AARAM...', 2.4); setTimeout(function () { S.fade.style.opacity = 0; if (S.use && S.use.id === 'bed') S.use = null; }, 2200); }
        if (st.id === 'chart') {
          var r = rideMode.ensureRide(ctx);
          S.files.open(r, function () {                                   /* from the files: the city map, to choose where to ride next */
            S.mapOpen = true; S.map.open(r, function (key) { if (rideSim.chooseTarget(r, key)) S.say('NEXT: ' + r.target.name.toUpperCase(), 2.6); });
          });
        }
        if (st.id === 'bench') { p.x = 4.6; p.z = 6.5; p.face = 0; S.msgT = 0; S.ui.msg.style.opacity = 0; S.train.open(); }
        if (st.id === 'gym') { S.say('HEAVY BAG', 1.4); S.mp.press(); }
        if (st.id === 'music') { S.rig.guitar.visible = true; S.music.setTrack('menu'); S.say('TOOFAAN... TOOFAAN!', 2.4); }
      }
      if (S.mapOpen && !S.map.isOpen()) { S.mapOpen = false; S.use = null; }
      if (S.use && S.use.id === 'chart' && !S.mapOpen && !S.files.isOpen()) S.use = null;        /* the map closed (picked a place, or the close button) */
      if (S.leaving && now > S.leaving && !S.left) { S.left = true; ctx.go('ride'); return; }
      /* ---- Toofan's pose ---- */
      var target = moving && !S.use ? posemath.walkPose(S.phase, 0.9) : posemath.idlePose(t);
      if (S.use) {
        S.use.t += dt; var u = S.use.t;
        if (S.use.id === 'chart') target = posemath.layer(target, { 'head.rx': -8, 'armA.sx': 40, 'armA.e': 60, 'spine.ry': Math.sin(u * 0.7) * 6 }, 0, 1, 1, 1);
        if (S.use.id === 'bed') target = posemath.layer(target, { 'spine.rx': 25, 'head.rx': 25 }, 0, 1, 1, 1);
        if (S.use.id === 'music') { var hp = {}; Object.keys(HELD).forEach(function (k) { hp[k] = HELD[k]; }); hp['gtr.ry'] = HELD['gtr.ry'] + Math.sin(u * 8.4) * 3; hp['spine.rx'] = 6 + Math.sin(u * 8.4) * 2; hp['head.rx'] = 8 + Math.abs(Math.sin(u * 4.2)) * 8; target = posemath.layer(target, hp, 0, 1, 1, 1); }
      }
      var tr = S.use && S.use.id === 'bench' ? S.train.update(dt, p.x, p.z) : null;     /* a workout sets his pose, lean and jump */
      if (tr) { target = tr.pose; p.face = angTo(p.face, tr.face, 1 - Math.exp(-10 * dt)); }
      posemath.approach(S.cur, target, tr && tr.tilt ? 30 : 12, dt);
      var pose = S.cur, mo = S.mp.update(dt);
      if (mo) pose = posemath.layer(pose, mo.pose, mo.wLower * 0.6, mo.wUpper, mo.wArmA, mo.wArmB);
      S.tilt = (S.tilt || 0) + ((tr ? tr.tilt : 0) - (S.tilt || 0)) * (1 - Math.exp(-14 * dt));
      S.rig.applyPose(pose, { plant: !(S.tilt > 0.01) }); S.rig.root.position.set(p.x, tr ? tr.lift : 0, p.z); S.rig.root.rotation.set(S.tilt, p.face, 0, 'YXZ'); S.rig.flutter(t, moving ? 1 : 0);
      S.key.position.set(p.x + 0.8, 2.2, p.z + 1.4);
      /* ---- Raka: follows, sits when close, naps if left alone ---- */
      var D = S.d, fx = p.x - Math.sin(p.face) * 1.0 + 0.5, fz = p.z - Math.cos(p.face) * 1.0, ddx = fx - D.x, ddz = fz - D.z, dl = Math.hypot(ddx, ddz);
      if (D.until && t < D.until) S.dog.pose(D.st, t);
      else if (dl > 1.4 || (D.walking && dl > 0.5)) {
        if (D.st === 'sleep' && dl < 4) { D.st = 'stand'; }
        if (D.st !== 'sleep') { D.walking = true; var dsp = Math.min(3.2, dl * 1.5); var q = { x: D.x + ddx / dl * dsp * dt, z: D.z + ddz / dl * dsp * dt }; collide(q); D.x = q.x; D.z = q.z; D.face = angTo(D.face, Math.atan2(ddx, ddz), 1 - Math.exp(-8 * dt)); S.dog.pose('walk', t); D.idle = 0; }
        else S.dog.pose('sleep', t);
      } else { D.walking = false; D.idle = (D.idle || 0) + dt; D.st = D.idle > 25 ? 'sleep' : 'sit'; S.dog.pose(D.st, t); }
      S.dog.root.position.set(D.x, 0, D.z); S.dog.root.rotation.y = D.face;
      /* ---- camera: up and in front, looking into the room through the missing front wall ---- */
      var tall = view.renderer.domElement.clientHeight > view.renderer.domElement.clientWidth;
      S.cx = S.cx == null ? p.x : S.cx + (p.x - S.cx) * (1 - Math.exp(-4 * dt)); S.cz = S.cz == null ? p.z : S.cz + (p.z - S.cz) * (1 - Math.exp(-4 * dt));
      var trc = S.use && S.use.id === 'bench' ? 1 : 0; S.camT = (S.camT || 0) + (trc - (S.camT || 0)) * (1 - Math.exp(-3 * dt));    /* training: the camera comes down close and in front */
      var c1 = { x: S.cx * 0.85 + 0.9, y: tall ? 7.2 : 6.0, z: S.cz + (tall ? 5.6 : 5.0), lx: S.cx, ly: 0.6, lz: S.cz - 0.3, fov: tall ? 62 : 50 };
      var c2 = { x: p.x + 1.1, y: tall ? 3.1 : 2.7, z: p.z + (tall ? 2.9 : 2.5), lx: p.x - 0.1, ly: 0.55, lz: p.z - 0.3, fov: tall ? 70 : 56 }, cam = {};
      Object.keys(c1).forEach(function (k) { cam[k] = c1[k] + (c2[k] - c1[k]) * S.camT; });
      view.followCamera(0, 0, cam);
      S.hide.update(t);
      view.render();
    },
    exit: function () {}
  };
}

module.exports = { createHideout: createHideoutMode };
