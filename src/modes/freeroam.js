/* modes: Street test. Walk the streamed street with the real hero rig. Locomotion is time-based
   until move clips arrive; attacks play the keyframed combo (jab, cross, knee, elbow, roundhouse); the rage finisher is a guitar whirl with a cinematic camera. */
'use strict';

var worldMod = require('../sim/world');
var herorig = require('../view/herorig');
var posemath = require('../view/posemath');
var moveplayer = require('../view/moveplayer');
var fxmod = require('../view/fx');
var cinecam = require('../view/cinecam');
var moveData = require('../data/moves');
var enemyview = require('../view/enemyview');
var fightui = require('../view/fightui');
var lettering = require('../view/lettering');
var sfxmod = require('../view/sfx');
var bikevox = require('../view/bikevox');
var ridecam = require('../view/ridecam');
var BIKE = require('../data/bike');

/* the middle of the men within reach of the hero: special-move cameras lean toward them so the move and its victims share the frame */
function groupCentre(world, hx, hz) {
  var sx = 0, sz = 0, n = 0, list = world.combat.enemies;
  for (var i = 0; i < list.length; i++) { var e = list[i]; if (e.dead || e.st === 'dead') continue; if (Math.hypot(e.x - hx, e.z - hz) < 7) { sx += e.x; sz += e.z; n++; } }
  return n ? { x: sx / n, z: sz / n } : null;
}

function createFreeroam() {
  var S = {};
  return {
    name: 'freeroam',
    enter: function (ctx, scope) {
      var view = ctx.view;
      view.setSky('#9fb6c9', true);
      ctx.hudRoot.hidden = false; ctx.touchRoot.hidden = false;
      scope.add(ctx.bus.on('chunk:load', function (e) { view.addChunk(e.spec); }));
      scope.add(ctx.bus.on('chunk:unload', function (e) { view.removeChunk(e.key); }));
      var pending = ctx.world.streaming.snapshotSpecs();
      for (var i = 0; i < pending.length; i++) view.addChunk(pending[i]);
      scope.add(function () { view.clearChunks(); });
      S.rig = herorig.createHeroRig(); view.scene.add(S.rig.root);
      scope.add(function () { view.scene.remove(S.rig.root); });
      S.bike = bikevox.createBike(); view.scene.add(S.bike.root); scope.add(function () { view.scene.remove(S.bike.root); });
      S.rc = ridecam.createRideCam(); S.mountW = ctx.world.mounted ? 1 : 0; S.wheelA = 0; S.bPrev = null; S.flash = null; S.flashT = 0; S.rideHint = '';
      S.cur = posemath.named('stand'); S.phase = 0; S.mp = moveplayer.createMovePlayer(); S.fx = fxmod.createFx(view.scene); S.counterIdx = 0; S.blockW = 0; S.cine = cinecam.createDirector(); S.seqW = 0; S.seqLinger = 0; S.seqLast = 0; S.seqSide = -0.8; S.seqPushT = 9; S.seqHits = -1; S.seqCam = null; S.seqLook = null;
      scope.add(function () { S.fx.dispose(); });
      S.txt = lettering.createLettering(); S.sfx = sfxmod.createSfx(); S.lastMv = null; S.whirlT = -9;
      scope.add(function () { S.txt.dispose(); });
      /* small switches: speech bubbles / plain letters / no text, Hindi or English letters, sound */
      (function () {
        var bar = document.createElement('div'), bs = 'pointer-events:auto;margin:0 3px;padding:4px 9px;font:700 11px system-ui,sans-serif;letter-spacing:.06em;color:#fff;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.35);border-radius:12px;cursor:pointer';
        bar.style.cssText = 'position:fixed;top:48px;left:50%;transform:translateX(-50%);z-index:6;pointer-events:none;white-space:nowrap';
        function btn(fn) { var b = document.createElement('button'); b.style.cssText = bs; b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); upd(); }); b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); }); bar.appendChild(b); return b; }
        var bt = btn(function () { S.txt.cycleMode(); }), bst = btn(function () { S.txt.nextStyle(); }), bl = btn(function () { S.txt.toggleScript(); }), bsn = btn(function () { S.sfx.toggle(); });
        function upd() { bst.textContent = 'Style: ' + S.txt.styleName; bt.textContent = 'Text: ' + ({ bubble: 'bubble', plain: 'plain', off: 'off' })[S.txt.mode]; bl.textContent = S.txt.script === 'hi' ? 'हिंदी' : 'ABC'; bsn.textContent = 'Sound: ' + (S.sfx.on ? 'on' : 'off'); }
        bst.textContent = 'Style: ' + S.txt.styleName; upd(); document.body.appendChild(bar); scope.add(function () { bar.remove(); });
      })();

      /* riding HUD: speed, boost, stunt score and the one hint that matters right now */
      (function () {
        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;pointer-events:none;text-align:center;font:700 12px system-ui,sans-serif;letter-spacing:.08em;color:#fff;text-shadow:0 1px 3px #000';
        el.innerHTML = '<div id="rdFlash" style="font:900 30px system-ui,sans-serif;letter-spacing:.06em;color:#ffc21a;height:36px;opacity:0;transition:opacity .25s"></div><div id="rdSpeed" style="font:900 26px system-ui,sans-serif;display:none"></div><div id="rdBoost" style="width:150px;height:6px;margin:4px auto;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden;display:none"><div style="height:100%;width:100%;background:linear-gradient(90deg,#ffc21a,#ff6a3d)"></div></div><div id="rdHint" style="font-weight:600;opacity:.9"></div>';
        document.body.appendChild(el); scope.add(function () { el.remove(); });
        S.ui2 = { flash: el.querySelector('#rdFlash'), speed: el.querySelector('#rdSpeed'), boost: el.querySelector('#rdBoost'), boostFill: el.querySelector('#rdBoost > div'), hint: el.querySelector('#rdHint') };
      })();
      function flash(text) { S.ui2.flash.textContent = text; S.ui2.flash.style.opacity = 1; S.flashT = 1.4; }
      scope.add(ctx.bus.on('ride:mount', function () { S.mp.cancel(); S.sfx.start(); }));
      scope.add(ctx.bus.on('ride:park', function () { S.sfx.engineOff(); }));
      scope.add(ctx.bus.on('ride:jump', function () { S.cine.shake(0.05, 0.2); }));
      scope.add(ctx.bus.on('ride:land', function (e) { S.sfx.land(e.vy); S.cine.shake(Math.min(0.14, 0.02 + e.vy * 0.01), 0.25); if (e.vy > 6) S.txt.say('thud', { x: e.x, y: 1.0, z: e.z }, view.camera, false); }));
      scope.add(ctx.bus.on('ride:crash', function (e) {
        S.sfx.crash(!!e.hard); S.cine.shake(e.hard ? 0.25 : 0.1, 0.4); S.fx.spawn('blockspark', { x: e.x, y: 1.0, z: e.z }, e.hard ? 1.6 : 0.3);
        S.txt.say(e.hard ? 'smash' : 'thud', { x: e.x, y: 1.4, z: e.z }, view.camera, !!e.hard); if (e.with === 'landing') flash('BAD LANDING');
      }));
      S.mp.onFx(function (kind) {
        var pt = kind === 'boom' ? S.rig.guitarPoint(30, 0, 0) : S.rig.root.position;
        S.fx.spawn(kind, pt, S.rig.root.rotation.y);
        var hp0 = { x: S.rig.root.position.x, y: 2.0, z: S.rig.root.position.z };
        if (kind === 'boom') { S.txt.say('boom', hp0, view.camera, true); S.sfx.boom(); }
        else if (kind === 'slam') { S.txt.say('smash', hp0, view.camera, true); S.sfx.smash(); }
        else if (kind === 'whirl' && S.t - S.whirlT > 1.2) { S.whirlT = S.t; S.txt.say('whirl', hp0, view.camera, false); S.sfx.swirl(); }
        if (kind === 'slam') S.cine.shake(0.28, 0.7); else if (kind === 'boom') S.cine.shake(0.2, 0.7);
      }); S.last = ctx.now(); S.hudT = 0; S.t = 0; S.spin = 0; S.face = 0;
      ctx.debug.street = S;
      S.ev = enemyview.createEnemyView(view.scene); S.ui = fightui.createFightUi(); S.hurtW = 0; S.downW = 0; S.counterIdx = 0;
      scope.add(function () { S.ev.dispose(); S.ui.dispose(); ctx.world.combat.enabled = false; ctx.world.combat.enemies.length = 0; });
      worldMod.startFight(ctx.world);
      S.mp.onHit(function (move, idx, last) { ctx.world.pendingStrikes.push({ move: move, last: last }); });       /* the sim decides who was hit, on the next tick */
      function heroPoint(y) { var p = ctx.world.player; return { x: p.x + Math.sin(S.face) * 0.8, y: y, z: p.z + Math.cos(S.face) * 0.8 }; }
      scope.add(ctx.bus.on('hit', function (e) {
        var p = ctx.world.player, dx = e.x - p.x, dz = e.z - p.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, hy = e.high ? 1.6 : 1.2;
        S.fx.spawn('spark', { x: e.x - ux * 0.25, y: hy, z: e.z - uz * 0.25 }, 0); S.cine.shake(0.05 + e.power * 0.12, 0.2); S.freeze = 0.04 + e.power * 0.05; S.ev.shove(e.id, ux, uz, 0.12 + e.power * 0.22 + (e.down ? 0.1 : 0));   /* hit-stop: the blow lands with a beat of stillness */
        S.fx.droplets('sweat', { x: e.x, y: 1.65, z: e.z }, ux, uz, 5 + Math.round(e.power * 5), e.power);
        S.fx.droplets('blood', { x: e.x - ux * 0.2, y: hy, z: e.z - uz * 0.2 }, ux, uz, (e.killed || e.down ? 12 : 4) + Math.round(e.power * 4), e.power);
        var wk = e.move === 'counter' ? null : e.move, lastBlow = e.down && wk;
        if (wk) { S.txt.say(lastBlow && !e.killed ? 'fall' : wk, { x: e.x, y: hy + 0.25, z: e.z }, view.camera, e.power > 0.55 || !!lastBlow); }
        S.sfx.hit(e.move === 'counter' ? 'cross' : e.move, e.power); if (e.down) S.sfx.fall();
        /* a blow to the face: spit and blood fly from his mouth, thrown the way the blow sends his head */
        var fpt = e.high ? S.ev.facePoint(e.id) : null;
        if (fpt) {
          var sgn = e.move === 'hook' ? 1 : (e.move === 'hookB' ? -1 : 0), up = e.move === 'uppercut' ? 3.2 : 0.4, ddx = ux * (sgn ? 0.35 : 1) + uz * sgn * 1.1, ddz = uz * (sgn ? 0.35 : 1) - ux * sgn * 1.1, mo = { x: fpt.mx, y: fpt.my, z: fpt.mz };
          S.fx.droplets('spit', mo, ddx, ddz, 4 + Math.round(e.power * 4), 0.4 + e.power * 0.5, up);
          S.fx.droplets('blood', mo, ddx, ddz, 3 + Math.round(e.power * 3) + (e.down ? 4 : 0), 0.5 + e.power * 0.5, up);
        }
      }));
      scope.add(ctx.bus.on('enemyBlock', function (e) {
        S.txt.say(e.broke ? 'guardbreak' : 'block', { x: e.x, y: 1.5, z: e.z }, view.camera, !!e.broke); S.sfx.block(!!e.broke);
        S.fx.spawn('blockspark', { x: e.x, y: 1.4, z: e.z }, e.broke ? 1.6 : 0.2); S.cine.shake(e.broke ? 0.1 : 0.04, 0.16); S.freeze = e.broke ? 0.12 : 0.05;
      }));
      scope.add(ctx.bus.on('block', function (e) { S.txt.say('thud', heroPoint(1.7), view.camera, false); S.sfx.block(false); S.fx.spawn('blockspark', heroPoint(1.3), e.timed ? 1.5 : 0); S.cine.shake(e.timed ? 0.06 : 0.03, 0.15); }));
      scope.add(ctx.bus.on('counter', function (e) {
        /* a timed block earns a direct hit that cannot be guarded; two men at once earn the guitar whirl (double takedown);
           a half-full rage bar can be spent on a guitar counter instead */
        S.mp.play(e.kind === 'double' ? 'counterWhirl' : (e.kind === 'special' ? ['counterBoom', 'counterSmash'][S.counterIdx++ % 2] : 'counterCross'));
      }));
      scope.add(ctx.bus.on('lastKo', function (e) {                                  /* the last man of the huddle goes down: slow motion and a finishing shot */
        S.slow = 1.1; S.focusPt = { x: e.x, z: e.z }; S.focusT = 1.7;
        S.cine.playShot([{ t: 0, dist: 5.2, h: 2.2, look: 1.3, fov: 42, rel: 2.3 }, { t: 0.7, dist: 3.9, h: 1.4, look: 1.3, fov: 34, rel: 3.5 }, { t: 1.7, dist: 5.6, h: 2.6, look: 1.2, fov: 44, rel: 4.5 }], 1.7);
      }));
      scope.add(ctx.bus.on('playerHurt', function (e) {
        S.mp.cancel(); S.hurtW = 1; S.cine.shake(0.1, 0.25); S.freeze = 0.1; S.txt.say('hurt', heroPoint(1.8), view.camera, true); S.sfx.hit('cross', 0.8);
        S.fx.spawn('spark', heroPoint(1.4), 0.6);
        var pl = ctx.world.player; S.fx.droplets('sweat', { x: pl.x, y: 1.7, z: pl.z }, -Math.sin(S.face), -Math.cos(S.face), 7, 0.6); S.fx.droplets('blood', { x: pl.x, y: 1.5, z: pl.z }, -Math.sin(S.face), -Math.cos(S.face), 3, 0.4);
      }));
      scope.add(ctx.bus.on('guardbreak', function () { S.mp.cancel(); S.hurtW = 1; S.cine.shake(0.12, 0.3); S.fx.spawn('spark', heroPoint(1.3), 1); }));
      scope.add(ctx.bus.on('action', function (e) {
        if (e.type === 'attack' && !ctx.input.state.held.block && ctx.world.player.stun <= 0 && !ctx.world.player.down) S.mp.press();
        if (e.type === 'finisher') { S.mp.play(moveData.FINISHER); S.txt.say('finisher', { x: ctx.world.player.x, y: 2.3, z: ctx.world.player.z }, view.camera, true); S.sfx.mega(); }
      }));
    },
    step: function (ctx, tick) {
      var cm0 = S.mp.current(), mv0 = cm0 && moveData.MOVES[cm0];
      ctx.world.attackLock = S.mp.active();            /* no walking while a move plays; the sim itself stops movement while Block is held */
      ctx.world.invuln = !!(mv0 && mv0.counter) || cm0 === 'counterCross';         /* counters and the finisher cannot be interrupted */
      var bk = ctx.world.bike; S.bPrev = { x: bk.x, y: bk.y, z: bk.z, h: bk.h };
      ctx.input.tick(tick);
      worldMod.step(ctx.world, ctx.input);
    },
    render: function (ctx, alpha) {
      var now = ctx.now(), dt = Math.min(0.1, Math.max(0.001, (now - S.last) / 1000)); S.last = now; var real = dt;
      /* the broken-guard sequence plays in gentle slow motion while the camera closes on his face; it lingers to follow the throw */
      var cb = ctx.world.combat, seqNow = cb.seqId; if (seqNow) { S.seqLast = seqNow; S.seqLinger = 1.0; } else if (S.seqLinger > 0) S.seqLinger -= real;
      var seqOn = !!seqNow || S.seqLinger > 0; S.seqW += ((seqOn ? 1 : 0) - S.seqW) * (1 - Math.exp(-(seqOn ? 8 : 5) * real));
      if (S.freeze > 0) { S.freeze -= real; dt *= 0.05; } else if (S.slow > 0) { S.slow -= real; dt *= 0.3; } else dt *= 1 - 0.14 * S.seqW; if (S.focusT > 0) S.focusT -= real; S.t += dt;
      var p = ctx.world.player, x = p.px + (p.x - p.px) * alpha, z = p.pz + (p.z - p.pz) * alpha;
      var speed = Math.hypot(p.x - p.px, p.z - p.pz) * 60;
      var target;
      if (p.moving) { S.phase += speed * dt / 1.9; target = posemath.walkPose(S.phase, 1 + Math.min(0.2, speed / 20)); }
      else target = posemath.idlePose(S.t);
      posemath.approach(S.cur, target, 16, dt);
      var pose = S.cur;
      var mo = S.mp.update(dt);
      var hurtT = p.stun > 0 ? 1 : 0; S.hurtW += (hurtT - S.hurtW) * (1 - Math.exp(-(hurtT ? 24 : 8) * dt));
      S.downW += ((p.down ? 1 : 0) - S.downW) * (1 - Math.exp(-6 * dt));
      if (mo) pose = posemath.layer(pose, mo.pose, mo.wLower, mo.wUpper, mo.wArmA, mo.wArmB);
      /* block: raised and lowered over a third of a second, never while a move is playing */
      var bt = (p.guard && !S.mp.active() && !mo) ? 1 : 0;
      S.blockW += (bt - S.blockW) * (1 - Math.exp(-(bt ? 7 : 5) * dt));
      if (S.blockW > 0.01) { var bw = posemath.smooth(S.blockW); pose = posemath.layer(pose, posemath.named('block'), bw * 0.85, bw); }
      if (S.hurtW > 0.02) { var hw = posemath.smooth(S.hurtW); pose = posemath.layer(pose, posemath.named('hurt'), hw, hw, hw, hw); }
      if (S.downW > 0.02) { var dw = posemath.smooth(S.downW); pose = posemath.layer(pose, posemath.named('down'), dw, dw, dw, dw); }
      /* the bike: interpolated between ticks, wheels turning, bars following the stick */
      var bk = ctx.world.bike, bp = S.bPrev || bk, mounted = ctx.world.mounted;
      var bx = bp.x + (bk.x - bp.x) * alpha, by = bp.y + (bk.y - bp.y) * alpha, bz = bp.z + (bk.z - bp.z) * alpha, bh = bp.h + Math.atan2(Math.sin(bk.h - bp.h), Math.cos(bk.h - bp.h)) * alpha;
      S.mountW += ((mounted ? 1 : 0) - S.mountW) * (1 - Math.exp(-(mounted ? 7 : 6) * dt));
      var B3 = S.bike; B3.root.position.set(bx, by, bz); B3.root.rotation.y = bh;
      B3.lean.rotation.z = bk.lean + bk.slip * 0.5;
      B3.pitch.rotation.x = -bk.pitch - (bk.air ? Math.atan2(bk.vy, Math.max(6, bk.speed)) * 0.7 : 0);
      B3.fork.rotation.y = -bk.steer * 0.45; S.wheelA += bk.speed * dt / B3.wheelR; B3.front.rotation.x = S.wheelA; B3.rear.rotation.x = S.wheelA;
      var rideP = null;
      if (S.mountW > 0.02) { rideP = ridecam.ridePose(bk, S.t); var rw = posemath.smooth(S.mountW); pose = posemath.layer(pose, rideP, rw, rw, rw, rw); }
      if (S.mountW > 0.5) {                     /* blows and guard from the saddle: the upper body only, turned toward the man; the legs stay on the pegs */
        var fw = posemath.smooth(Math.min(1, (S.mountW - 0.5) * 2)), side = Math.max(-1.1, Math.min(1.1, ctx.world.rideSide || 0));
        if (mo) { var up2 = {}, k2; for (k2 in mo.pose) up2[k2] = mo.pose[k2]; up2['spine.ry'] = (up2['spine.ry'] || 0) + side * 38; pose = posemath.layer(pose, up2, 0, mo.wUpper * fw, mo.wArmA * fw, mo.wArmB * fw); }
        else if (S.blockW > 0.01) { var bw2 = posemath.smooth(S.blockW) * fw; pose = posemath.layer(pose, posemath.named('block'), 0, 0, bw2, 0); }          /* one forearm up across the head, the other hand stays on the bar */
      }
      S.ev.sync(ctx.world.combat.enemies, alpha, dt, ctx.world.combat.target, ctx.world.combat.seqId); S.ui.update(p, ctx.world.combat); S.ui.show(true);
      S.fx.update(dt);
      var dyaw = Math.atan2(Math.sin(p.face - S.face), Math.cos(p.face - S.face)); S.face += dyaw * (1 - Math.exp(-(mounted ? 30 : 14) * dt));
      if (S.mountW > 0.02) {
        /* hop onto the seat: the hero's walking spot blends to the seat, with a little jump on the way */
        var rw2 = posemath.smooth(S.mountW), sv = S.sv || (S.sv = new THREE.Vector3()), sq = S.sq || (S.sq = new THREE.Quaternion());
        B3.root.updateMatrixWorld(true); sv.set(B3.seat.x, B3.seat.y + 0.08 - 0.85, B3.seat.z); B3.pitch.localToWorld(sv); B3.pitch.getWorldQuaternion(sq);
        S.rig.root.position.set(x + (sv.x - x) * rw2, (sv.y) * rw2 + Math.sin(Math.PI * rw2) * 0.35, z + (sv.z - z) * rw2);
        S.rig.root.rotation.y = S.face; if (rw2 > 0.999) S.rig.root.quaternion.copy(sq); else { var q0 = S.q0 || (S.q0 = new THREE.Quaternion()); q0.setFromAxisAngle(S.up || (S.up = new THREE.Vector3(0, 1, 0)), S.face); S.rig.root.quaternion.copy(q0).slerp(sq, rw2); }
      } else { S.rig.root.position.set(x, 0, z); S.rig.root.rotation.y = S.face; }
      S.rig.applyPose(pose, { plant: S.mountW < 0.5 }); S.rig.flutter(S.t, p.moving ? 0.5 : 0.12);
      var cmw = S.mp.current(); if (cmw !== S.lastMv) { S.lastMv = cmw; if (cmw && !moveData.MOVES[cmw].counter) S.sfx.whoosh(0.5); }
      var cm = S.mp.current(), cl = cm ? moveData.MOVES[cm].len : 0, ct = S.mp.time();
      S.cine.update(dt, cm, ct, cm ? Math.min(ct / 0.55, (cl - ct) / 0.7, 1) : 0);
      var focus = S.focusT > 0 ? S.focusPt : groupCentre(ctx.world, x, z);
      var shot = S.cine.weight > 0.001 || S.cine.shakeT > 0 ? S.cine.resolve(x, z, S.face, focus) : null;
      var fp = S.seqW > 0.01 ? S.ev.facePoint(S.seqLast) : null;
      if (fp) {
        /* close on his face from a little to one side, swinging to the other side with each blow; pulls back and rises to follow the throw */
        var en = null, qi; for (qi = 0; qi < cb.enemies.length; qi++) if (cb.enemies[qi].id === S.seqLast) en = cb.enemies[qi];
        var nh = en ? en.hitN : 0, downed = !!en && (en.st === 'down' || en.st === 'dead' || en.st === 'getup'), lastMv = en ? en.lastMove : '';
        if (nh !== S.seqHits) { S.seqHits = nh; S.seqPushT = 0; }
        S.seqPushT += real; if (S.seqSignFor !== S.seqLast) { S.seqSignFor = S.seqLast; S.seqSign = -(S.seqSign || 1); S.seqSide = S.seqSign * 0.7; }
        S.seqSide += (S.seqSign * (0.7 + (nh % 2 ? 0.1 : -0.1)) - S.seqSide) * (1 - Math.exp(-5 * real));
        var ux = x - fp.ex, uz = z - fp.ez, ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
        var ca = Math.cos(S.seqSide), sa = Math.sin(S.seqSide), rx = ux * ca - uz * sa, rz = ux * sa + uz * ca;
        var push = posemath.smooth(Math.min(1, S.seqPushT / 0.7)), dist = downed ? 5.2 : 4.6 - 0.6 * push;
        var tcam = { x: fp.ex + rx * dist, y: fp.ey + (downed ? 1.0 : (lastMv === 'uppercut' ? 0.0 : 0.3)), z: fp.ez + rz * dist, lx: fp.ex, ly: fp.ey - (downed ? 0.5 : 0.05), lz: fp.ez, fov: downed ? 46 : 42 };
        if (!S.seqCam) { S.seqCam = tcam; S.seqLook = null; } else { var kk = 1 - Math.exp(-9 * real), f; for (f in tcam) S.seqCam[f] += (tcam[f] - S.seqCam[f]) * kk; }
        var sc = S.seqCam, b0 = shot || { x: x, y: 6.4, z: z + 6.6, lx: x, ly: 1.0, lz: z - 2.2, fov: 46 }, w = posemath.smooth(S.seqW) * 0.4, o = {}, f2;
        for (f2 in sc) o[f2] = b0[f2] + (sc[f2] - b0[f2]) * w;
        if (S.cine.shakeT > 0) { var sk = S.cine.shakeT / (S.cine.dur || 1), amp = S.cine.shakeA * sk * sk * 0.6; o.x += Math.sin(S.t * 83) * amp; o.y += Math.sin(S.t * 97 + 1) * amp; }
        shot = o;
      } else if (S.seqW <= 0.01) S.seqCam = null;
      if (S.mountW > 0.01) {
        /* the riding camera takes over as he climbs on, and hands back when he steps off */
        var rs = S.rc.update(dt, bk, bx, by, bz, bh, ctx.world.streaming), b1 = shot || { x: x, y: 6.4, z: z + 6.6, lx: x, ly: 1.0, lz: z - 2.2, fov: 46 }, rw3 = posemath.smooth(S.mountW), o2 = {}, f3;
        for (f3 in rs) o2[f3] = b1[f3] + (rs[f3] - b1[f3]) * rw3;
        if (S.cine.shakeT > 0) { var sk2 = S.cine.shakeT / (S.cine.dur || 1), amp2 = S.cine.shakeA * sk2 * sk2 * 0.6; o2.x += Math.sin(S.t * 83) * amp2; o2.y += Math.sin(S.t * 97 + 1) * amp2; }
        shot = o2;
      } else S.rc.state.init = false;
      /* engine note and riding HUD */
      var bd = mounted ? 99 : worldMod.bikeDistance(ctx.world), near = bd < BIKE.MOUNT_SHOW, can = !mounted && worldMod.canMount(ctx.world);
      if (mounted) S.sfx.engine(real, { rpm: bk.rpm, thr: bk.thr, speed: Math.abs(bk.speed), drifting: bk.drifting, braking: ctx.input.state.held.block || ctx.input.state.my < -0.3, air: bk.air });
      if (bk.shiftT > 0.15 && bk.shiftT <= 0.18 && mounted) S.sfx.shift();
      var u2 = S.ui2, hint = mounted ? (Math.abs(bk.speed) < BIKE.PARK_SPEED ? (ctx.world.combat.enemies.length ? 'ATTACK: punch   BLOCK: guard / counter' : 'BLOCK: park and get off') : 'Stick: ride   Attack: punch / hold to boost   Block: guard / counter') : (can ? 'ATTACK: get on the Bijli' : (near ? 'Men too close to climb on' : ''));
      if (hint !== S.rideHint) { S.rideHint = hint; u2.hint.textContent = hint; }
      u2.speed.style.display = mounted ? 'block' : 'none'; u2.boost.style.display = mounted ? 'block' : 'none';
      if (mounted) { u2.speed.textContent = Math.round(Math.abs(bk.speed) * 3.6) + ' km/h'; u2.boostFill.style.width = Math.round(bk.boost * 100) + '%'; }
      if (S.flashT > 0) { S.flashT -= real; if (S.flashT <= 0) u2.flash.style.opacity = 0; }
      ctx.view.followCamera(x, z, shot);
      ctx.view.render();
      S.hudT -= dt;
      if (S.hudT <= 0) {
        S.hudT = 0.25;
        var vs = ctx.view.stats(), st = ctx.world.streaming;
        ctx.hud.update({
          mode: 'street test', tick: ctx.world.tick, chunks: st.loadedCount(), maxChunks: ctx.config.BUDGET.maxLoadedChunks,
          triangles: vs.triangles, calls: vs.calls, bytes: vs.bytes, loads: st.stats.loads, unloads: st.stats.unloads,
          saveOk: ctx.save.persistent(), rage: p.rage
        });
        ctx.touch.setFinisherVisible(p.rage >= 100);
      }
    },
    exit: function () {}
  };
}

module.exports = { createFreeroam: createFreeroam };
