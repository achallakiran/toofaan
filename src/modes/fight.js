/* modes: a fight at a trouble spot. Arriving at a place on the ride opens this: the arena of that kind of place (sim/arenagen), that
   gang's men (sim/lineup) and Toofan on foot. Nothing else: no bike, no city, no traffic, no waves. The fighting is the brawler's own,
   unchanged: the move clips and combo, block and counter, the finisher whirl, the cinematic camera, hit-stop, comic hit words, sparks,
   sweat and blood. Cleared: "POLICE AA GAYI!" and back to the ride, where the police take them away. Lost: back to the ride, the place
   still open (Maa ka Thappad comes here later). With ?dev=1, #fight opens a practice fight (`type` / `level` in the hash args). */
'use strict';

var fightworld = require('../sim/fightworld');
var lineupMod = require('../sim/lineup');
var GANGS = require('../data/gangs');
var rngMod = require('../core/rng');
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
var musicMod = require('../view/music');
var arenaview = require('../view/arenaview');
var cinecard = require('../view/cinecard');

/* the middle of the men within reach of the hero: special-move cameras lean toward them so the move and its victims share the frame */
function groupCentre(fw, hx, hz) {
  var sx = 0, sz = 0, n = 0, list = fw.combat.enemies;
  for (var i = 0; i < list.length; i++) { var e = list[i]; if (e.dead || e.st === 'dead') continue; if (Math.hypot(e.x - hx, e.z - hz) < 7) { sx += e.x; sz += e.z; n++; } }
  return n ? { x: sx / n, z: sz / n } : null;
}

/* how many places are cleared on the ride: the more, the bigger and tougher the crowd */
function level(ctx) {
  var n = 0, m = ctx.ride && ctx.ride.missions; if (m) Object.keys(m).forEach(function (k) { if (m[k] === 'cleared') n++; }); return n;
}

function createFight() {
  var S = {};
  return {
    name: 'fight',
    enter: function (ctx, scope, args) {
      var view = ctx.view; args = args || {};
      var type = args.type || 'market', lv = args.level !== undefined ? args.level : level(ctx), gang = GANGS.GANGS[GANGS.gangOf(type)];
      var seed = (ctx.world.seed ^ 0x51f1) >>> 0;
      var lineup = lineupMod.lineup(lv, rngMod.createRng(rngMod.hash32(seed, lv, type.length * 131 + type.charCodeAt(0))), gang && gang.mix);
      var fw = S.fw = fightworld.create({ seed: ctx.world.seed, bus: ctx.bus, type: type, lineup: lineup });
      ctx.fight = fw; ctx.debug.fight = S; S.done = false; S.type = type;
      view.setSky('#9fb6c9', true);
      ctx.hudRoot.hidden = false; ctx.touchRoot.hidden = false; ctx.touch.setFinisherVisible(false);
      /* the arena: its ground and walls, and the tall pieces that fade when they come between the camera and the fight */
      view.addChunk(fw.arena); scope.add(function () { view.clearChunks(); });
      var av = arenaview.createArenaView(view.scene, fw.arena), hv = new THREE.Vector3(), hv2 = new THREE.Vector3(), fv = new THREE.Vector3();
      var off = view.onFrame(function (camera, dt) {
        var p = fw.player, t = [hv.set(p.x, 1.0, p.z), hv2.set(p.x, 1.7, p.z)], best = null, bd = 9, l = fw.combat.enemies, i;
        for (i = 0; i < l.length; i++) { var e = l[i]; if (e.dead || e.st === 'dead') continue; var d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } }
        if (best) t.push(fv.set(best.x, 1.3, best.z));
        av.fade(camera, t, dt);
      });
      ctx.debug.arena = av;
      scope.add(function () { off(); av.dispose(); ctx.debug.arena = null; ctx.fight = null; });
      S.rig = herorig.createHeroRig(); view.scene.add(S.rig.root);
      scope.add(function () { view.scene.remove(S.rig.root); });
      S.cur = posemath.named('stand'); S.phase = 0; S.mp = moveplayer.createMovePlayer(); S.fx = fxmod.createFx(view.scene); S.counterIdx = 0; S.blockW = 0; S.cine = cinecam.createDirector(); S.seqW = 0; S.seqLinger = 0; S.seqLast = 0; S.seqSide = -0.8; S.seqPushT = 9; S.seqHits = -1; S.seqCam = null; S.seqLook = null;
      scope.add(function () { S.fx.dispose(); });
      S.txt = lettering.createLettering(); S.sfx = sfxmod.createSfx(); S.lastMv = null; S.whirlT = -9;
      scope.add(function () { S.txt.dispose(); });
      S.music = musicMod.createMusic(S.sfx); S.music.setTrack('arena');
      S.mp.onFx(function (kind) {
        var pt = kind === 'boom' ? S.rig.guitarPoint(30, 0, 0) : S.rig.root.position;
        S.fx.spawn(kind, pt, S.rig.root.rotation.y);
        var hp0 = { x: S.rig.root.position.x, y: 2.0, z: S.rig.root.position.z };
        if (kind === 'boom') { S.txt.say('boom', hp0, view.camera, true); S.sfx.boom(); }
        else if (kind === 'slam') { S.txt.say('smash', hp0, view.camera, true); S.sfx.smash(); }
        else if (kind === 'whirl' && S.t - S.whirlT > 1.2) { S.whirlT = S.t; S.txt.say('whirl', hp0, view.camera, false); S.sfx.swirl(); }
        if (kind === 'slam') S.cine.shake(0.28, 0.7); else if (kind === 'boom') S.cine.shake(0.2, 0.7);
      }); S.last = ctx.now(); S.hudT = 0; S.t = 0; S.face = fw.player.face;
      S.ev = enemyview.createEnemyView(view.scene); S.ui = fightui.createFightUi(); S.hurtW = 0; S.downW = 0;
      scope.add(function () { S.ev.dispose(); S.ui.dispose(); });
      S.mp.onHit(function (move, idx, last) { fw.pendingStrikes.push({ move: move, last: last }); });       /* the sim decides who was hit, on the next tick */
      function heroPoint(y) { var p = fw.player; return { x: p.x + Math.sin(S.face) * 0.8, y: y, z: p.z + Math.cos(S.face) * 0.8 }; }
      scope.add(ctx.bus.on('hit', function (e) {
        var p = fw.player, dx = e.x - p.x, dz = e.z - p.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, hy = e.high ? 1.6 : 1.2;
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
        var pl = fw.player; S.fx.droplets('sweat', { x: pl.x, y: 1.7, z: pl.z }, -Math.sin(S.face), -Math.cos(S.face), 7, 0.6); S.fx.droplets('blood', { x: pl.x, y: 1.5, z: pl.z }, -Math.sin(S.face), -Math.cos(S.face), 3, 0.4);
      }));
      scope.add(ctx.bus.on('guardbreak', function () { S.mp.cancel(); S.hurtW = 1; S.cine.shake(0.12, 0.3); S.fx.spawn('spark', heroPoint(1.3), 1); }));
      scope.add(ctx.bus.on('action', function (e) {
        if (e.type === 'attack' && !ctx.input.state.held.block && fw.player.stun <= 0 && !fw.player.down) S.mp.press();
        if (e.type === 'finisher') { S.mp.play(moveData.FINISHER); S.txt.say('finisher', { x: fw.player.x, y: 2.3, z: fw.player.z }, view.camera, true); S.sfx.mega(); }
      }));
      /* the end of the fight */
      var timers = []; scope.add(function () { timers.forEach(clearTimeout); });
      scope.add(ctx.bus.on('fight:clear', function (e) {
        S.music.setTrack('sting');
        timers.push(setTimeout(function () { cinecard.show({ title: 'POLICE AA GAYI!', sub: e.name + ' cleared', ms: 2400 }); }, 1600));
        timers.push(setTimeout(function () { if (!S.done) { S.done = true; ctx.go('ride', { after: 'arrest', key: S.type }); } }, 2100));
      }));
      scope.add(ctx.bus.on('fight:lost', function () {
        timers.push(setTimeout(function () { if (!S.done) { S.done = true; ctx.go('ride'); } }, 400));
      }));
    },
    step: function (ctx, tick) {
      var fw = S.fw, cm0 = S.mp.current(), mv0 = cm0 && moveData.MOVES[cm0];
      fw.attackLock = S.mp.active();            /* no walking while a move plays; the sim itself stops movement while Block is held */
      fw.invuln = !!(mv0 && mv0.counter) || cm0 === 'counterCross';         /* counters and the finisher cannot be interrupted */
      ctx.input.tick(tick);
      fightworld.step(fw, ctx.input);
    },
    render: function (ctx, alpha) {
      var fw = S.fw, now = ctx.now(), dt = Math.min(0.1, Math.max(0.001, (now - S.last) / 1000)); S.last = now; var real = dt;
      /* the broken-guard sequence plays in gentle slow motion while the camera closes on his face; it lingers to follow the throw */
      var cb = fw.combat, seqNow = cb.seqId; if (seqNow) { S.seqLast = seqNow; S.seqLinger = 1.0; } else if (S.seqLinger > 0) S.seqLinger -= real;
      var seqOn = !!seqNow || S.seqLinger > 0; S.seqW += ((seqOn ? 1 : 0) - S.seqW) * (1 - Math.exp(-(seqOn ? 8 : 5) * real));
      if (S.freeze > 0) { S.freeze -= real; dt *= 0.05; } else if (S.slow > 0) { S.slow -= real; dt *= 0.3; } else dt *= 1 - 0.14 * S.seqW; if (S.focusT > 0) S.focusT -= real; S.t += dt;
      var p = fw.player, x = p.px + (p.x - p.px) * alpha, z = p.pz + (p.z - p.pz) * alpha;
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
      S.ev.sync(fw.combat.enemies, alpha, dt, fw.combat.target, fw.combat.seqId); S.ui.update(p, fw.combat); S.ui.show(true);
      S.fx.update(dt);
      var dyaw = Math.atan2(Math.sin(p.face - S.face), Math.cos(p.face - S.face)); S.face += dyaw * (1 - Math.exp(-14 * dt));
      S.rig.root.position.set(x, 0, z); S.rig.root.rotation.y = S.face;
      S.rig.applyPose(pose, { plant: true }); S.rig.flutter(S.t, p.moving ? 0.5 : 0.12);
      var cmw = S.mp.current(); if (cmw !== S.lastMv) { S.lastMv = cmw; if (cmw && !moveData.MOVES[cmw].counter) S.sfx.whoosh(0.5); }
      var cm = S.mp.current(), cl = cm ? moveData.MOVES[cm].len : 0, ct = S.mp.time();
      S.cine.update(dt, cm, ct, cm ? Math.min(ct / 0.55, (cl - ct) / 0.7, 1) : 0);
      var focus = S.focusT > 0 ? S.focusPt : groupCentre(fw, x, z);
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
      ctx.view.updateLod(x, z, ctx.view.tier.lod);
      ctx.view.followCamera(x, z, shot);
      ctx.view.render();
      S.hudT -= dt;
      if (S.hudT <= 0) {
        S.hudT = 0.25;
        var vs = ctx.view.stats();
        ctx.hud.update({ mode: 'fight: ' + fw.name, tick: fw.tick, chunks: 1, maxChunks: 1, triangles: vs.triangles, calls: vs.calls, bytes: vs.bytes, loads: 0, unloads: 0, saveOk: ctx.save.persistent(), rage: p.rage, ms: vs.ms, tier: vs.tier });
        ctx.touch.setFinisherVisible(p.rage >= 100);
      }
    },
    exit: function () {}
  };
}

module.exports = { createFight: createFight };
