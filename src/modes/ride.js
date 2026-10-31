/* modes: Ride, the heart of the game (Phase 4). Toofan rides Bijli across the city to the next trouble spot. On the way the bike goons
   attack, then the car gang. Arriving plays a cut shot and a retro card, and the game steps into the fight area (the brawler, Street mode).
   When the area is clear it comes back here: the police take the goons away and Toofan rides on to the next signal.
   Big moments in the road fights (counters, knockouts, the leap) slow time and pull the camera back wide, with speed lines, bursts and a flash. */
'use strict';

var rideSim = require('../sim/ride');
var R = require('../data/ride');
var rideview = require('../view/rideview');
var sfxmod = require('../view/sfx');
var cinecard = require('../view/cinecard');

var WORD = { bkJabL: 'DISHUM!', bkCrossL: 'DISHUM!', bkHookL: 'TADAAK!', bkElbowL: 'KHAT!', bkKickL: 'DHADAAK!', jab: 'DISHUM!', cross: 'DISHUM!', hook: 'TADAAK!', kick: 'DHADAAK!', bkCElbowL: 'PATAAK!', counterCross: 'PATAAK!' };
function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

function createRide() {
  var S = {};
  return {
    name: 'ride',
    enter: function (ctx, scope, args) {
      var view = ctx.view;
      view.setSky('#a9c7da', false);
      ctx.hudRoot.hidden = false; ctx.touchRoot.hidden = false; ctx.touch.setFinisherVisible(false);
      /* the ride carries on where you left it */
      if (!ctx.ride) {
        ctx.ride = rideSim.createRide(ctx.world.seed, ctx.bus);
        var saved = ctx.save.get('ride.missions', null);
        if (saved) { Object.keys(saved).forEach(function (k) { if (ctx.ride.missions[k]) ctx.ride.missions[k] = saved[k] === 'active' ? 'open' : saved[k]; }); rideSim.pickTarget(ctx.ride); }
      }
      S.r = ctx.ride; S.t = 0; S.cam = null; S.msgT = 0; S.honkT = 0; S.cut = null; S.fx = null; S.slow = 0; S.slowAcc = 0; S.shake = 0; S.sideW = 0; S.last = 0;
      if (args && args.after === 'arrest') { rideSim.afterFight(S.r, args.key); ctx.save.set('ride.missions', S.r.missions); S.sideW = 1; }
      S.v = rideview.createRideView(view.scene); S.v.build(S.r.map); S.v.prime(S.r.bike.x, S.r.bike.z);
      scope.add(function () { S.v.dispose(); });
      S.sfx = sfxmod.createSfx(); S.sfx.start(); scope.add(function () { S.sfx.engineOff(); });
      S.bars = cinecard.bars(); scope.add(function () { S.bars.remove(); });

      /* overlay: hearts, the signal pointer, speed, messages, the comic word, flashes and the mini-map */
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;font-family:system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000';
      el.innerHTML =
        '<div id="rPoint" style="position:absolute;left:50%;top:max(56px,env(safe-area-inset-top));transform:translateX(-50%);text-align:center;font:800 13px system-ui,sans-serif;letter-spacing:.08em">' +
        '<span id="rArrow" style="display:inline-block;font-size:20px;color:#ffc21a;margin-right:8px">&#9650;</span><span id="rTarget"></span></div>' +
        '<div id="rHearts" style="position:absolute;right:16px;top:max(56px,env(safe-area-inset-top));font-size:22px;letter-spacing:4px;color:#ff4a5a"></div>' +
        '<div id="rMsg" style="position:absolute;left:50%;top:26%;transform:translateX(-50%);font:900 28px system-ui,sans-serif;letter-spacing:.06em;color:#ffc21a;opacity:0;transition:opacity .25s;white-space:nowrap"></div>' +
        '<div id="rWord" style="position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) rotate(-8deg) scale(0);font:900 clamp(40px,8vw,84px) \'Arial Black\',Impact,sans-serif;color:#ffd21f;-webkit-text-stroke:3px #000;text-shadow:5px 5px 0 #000;padding:10px 26px;background:radial-gradient(ellipse at center,#fff 0 30%,rgba(255,80,40,.9) 31% 55%,transparent 56%);transition:transform .12s ease-out,opacity .2s;opacity:0;white-space:nowrap"></div>' +
        '<div id="rSpeed" style="position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);font:900 24px system-ui,sans-serif"></div>' +
        '<canvas id="rMap" width="150" height="150" style="position:absolute;right:16px;top:max(96px,calc(env(safe-area-inset-top) + 40px));width:120px;height:120px;border-radius:8px;background:rgba(10,14,18,.55);border:1px solid rgba(255,255,255,.25)"></canvas>';
      document.body.appendChild(el); scope.add(function () { el.remove(); });
      var lines = document.createElement('div');
      lines.style.cssText = 'position:fixed;left:50%;top:50%;width:160vmax;height:160vmax;transform:translate(-50%,-50%);z-index:5;pointer-events:none;opacity:0;transition:opacity .08s;' +
        'background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.55) 0 1.2deg,transparent 1.2deg 7deg);-webkit-mask-image:radial-gradient(circle,transparent 0 24%,#000 46%);mask-image:radial-gradient(circle,transparent 0 24%,#000 46%)';
      document.body.appendChild(lines); scope.add(function () { lines.remove(); });
      var flashEl = document.createElement('div'); flashEl.style.cssText = 'position:fixed;inset:0;z-index:8;pointer-events:none;background:#fff;opacity:0';
      var red = document.createElement('div'); red.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 40%,rgba(255,0,0,.55));opacity:0;transition:opacity .1s';
      document.body.appendChild(flashEl); document.body.appendChild(red); scope.add(function () { flashEl.remove(); red.remove(); });
      S.ui = { point: el.querySelector('#rPoint'), hearts: el.querySelector('#rHearts'), arrow: el.querySelector('#rArrow'), target: el.querySelector('#rTarget'), msg: el.querySelector('#rMsg'),
               word: el.querySelector('#rWord'), lines: lines, speed: el.querySelector('#rSpeed'), map: el.querySelector('#rMap'), flash: flashEl, red: red };
      S.flashT = 0; S.whiteT = 0; S.wordT = 0;
      function say(text, secs) { S.ui.msg.textContent = text; S.ui.msg.style.opacity = 1; S.msgT = secs || 1.6; }
      function word(text) { S.ui.word.textContent = text; S.ui.word.style.opacity = 1; S.ui.word.style.transform = 'translate(-50%,-50%) rotate(-8deg) scale(1.15)'; S.wordT = 0.7; }
      function boom(id, color, size) { var b = S.r.bike, p = id ? S.v.ev.worldOf(S.r, id, b.x, b.z) : null; if (p) S.v.ev.burst(p.x, 1.7, p.z, color, size); else S.v.ev.burst(b.x, 1.8, b.z, color, size); }
      function big(kind, id, dur, slow) { S.fx = { kind: kind, id: id, t: 0, dur: dur }; S.slow = slow; S.whiteT = 0.12; S.shake = 0.35; boom(id, kind === 'ko' ? 0xffd21f : 0xff8a2a, kind === 'ko' ? 1.6 : 1.2); }
      S.say = say;
      scope.add(ctx.bus.on('ride:crash', function () { S.sfx.crash(true); say('CRASH!', 1.2); S.shake = 0.4; }));
      scope.add(ctx.bus.on('ride:getup', function () { say('Back to Bijli!', 1.4); }));
      scope.add(ctx.bus.on('ride:remount', function () { S.sfx.start(); }));
      scope.add(ctx.bus.on('ride:bump', function () { S.sfx.hit('jab', 0.3); }));
      scope.add(ctx.bus.on('ride:wall', function () { S.sfx.land(4); }));
      scope.add(ctx.bus.on('ride:arrive', function (e) { S.sfx.engineOff(); S.cut = { kind: 'arrive', t: 0, key: e.key, name: e.name, card: false, gone: false }; ctx.save.set('ride.missions', S.r.missions); }));
      scope.add(ctx.bus.on('ride:signal', function (e) { say('Signal: ' + e.name, 2); }));
      /* road fights */
      scope.add(ctx.bus.on('enc:start', function (e) { if (e.kind === 'arrest') return; S.sfx.honk(); say(e.kind === 'car' ? 'CAR GANG!' : 'BIKE GOONS!', 1.8); }));
      scope.add(ctx.bus.on('enc:swing', function () { S.sfx.whoosh(0.5); }));
      scope.add(ctx.bus.on('enc:hit', function (e) { S.sfx.hit(/kick|Kick/.test(e.move) ? 'kick' : 'jab', 0.8); word(WORD[e.move.replace(/R$/, 'L')] || 'DISHUM!'); S.shake = 0.15; boom(e.id, 0xffffff, 0.8); }));
      scope.add(ctx.bus.on('enc:ko', function (e) { S.sfx.hit('uppercut', 1); S.sfx.fall(); word('DHADAAM!'); big('ko', e.id, 1.3, 1.0); }));
      scope.add(ctx.bus.on('enc:counter', function (e) { S.sfx.hit('counterCross', 1); word('PATAAK!'); big('counter', e.id, 0.9, 0.7); }));
      scope.add(ctx.bus.on('enc:block', function (e) { S.sfx.block(false); word('THAK!'); S.whiteT = 0.08; S.shake = 0.2; S.slow = 0.25; S.fx = { kind: 'block', t: 0, dur: 0.5 }; boom(e.id, 0x9fd8ff, 0.9); }));
      scope.add(ctx.bus.on('enc:hurt', function () { S.sfx.hit('hook', 0.7); S.flashT = 0.35; S.shake = 0.3; }));
      scope.add(ctx.bus.on('enc:warn', function (e) { if (e.car) say('BLOCK when it swerves!', 1.2); }));
      scope.add(ctx.bus.on('enc:leap', function () { S.sfx.whoosh(1); word('JUMP!'); big('leap', 0, 1.2, 0.9); }));
      scope.add(ctx.bus.on('enc:spin', function () { S.sfx.crash(true); word('DHADAAM!'); big('spin', 0, 1.4, 1.0); }));
      scope.add(ctx.bus.on('enc:police', function () { S.sfx.honk(); setTimeout(function () { S.sfx.honk(); }, 350); say('POLICE!', 1.6); }));
      scope.add(ctx.bus.on('enc:arrest', function () { cinecard.show({ title: 'ARRESTED!', sub: 'Police le gayi goondon ko', ms: 1500 }); }));
      scope.add(ctx.bus.on('enc:clear', function () { say('ROAD CLEAR!', 1.6); }));
      scope.add(ctx.bus.on('enc:fail', function () { say('TOOFAN IS DOWN!', 1.8); }));
      scope.add(ctx.bus.on('enc:retry', function () { say('AGAIN!', 1.2); }));
      scope.add(ctx.bus.on('enc:end', function (e) { if (e.kind !== 'bikes') { var T = S.r.target; cinecard.show({ title: 'TOOFAN IS BACK!', sub: T ? 'Next: ' + T.name : 'All clear', ms: 1400 }); } }));
      ctx.debug.rideStart = function (k) { if (S.r.state === 'ride') rideSim.startEncounter(S.r, k); };     /* for the test tools */
      if (S.r.target && !(args && args.after)) say('Signal: ' + S.r.target.name, 2.2);
    },
    step: function (ctx, tick) {
      ctx.input.tick(tick);
      if (S.cut) return;                                                     /* the arrival cut shot: the ride waits */
      if (ctx.debug.freeze) return;                                          /* (test tools: hold the moment for a screenshot) */
      if (S.slow > 0) { S.slowAcc += 0.3; if (S.slowAcc < 1) return; S.slowAcc -= 1; }     /* slow motion: the sim steps less often */
      if (ctx.input.state.pressed.attack && S.r.state === 'ride') S.honk = true;
      rideSim.step(S.r, ctx.input);
    },
    render: function (ctx, alpha) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var r = S.r, b = r.bike, x = b.px + (b.x - b.px) * alpha, z = b.pz + (b.z - b.pz) * alpha;
      S.v.sync(r, alpha, dt, S.t);
      var near = (ctx.view.canvas.clientHeight || 700) < 520 ? 0.82 : 1;
      /* ---- the chase camera: high behind Bijli, turning with her ---- */
      var CAM = R.CAM, cx = x, cz = z, yaw = b.h;
      if (r.state === 'fly' || r.state === 'run') { cx = r.hero.x; cz = r.hero.z; }
      var c = S.cam || (S.cam = { x: cx, z: cz, yaw: yaw }), k = 1 - Math.exp(-5 * dt), ky = 1 - Math.exp(-2.2 * dt);
      c.x += (cx - c.x) * k; c.z += (cz - c.z) * k;
      if (r.state === 'ride') c.yaw += Math.atan2(Math.sin(yaw - c.yaw), Math.cos(yaw - c.yaw)) * ky;
      var sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), back = (CAM.back + Math.max(0, b.speed) * 0.12) * near, ah = CAM.ahead + Math.max(0, b.speed) * 0.2;
      var shot = { x: c.x - sy * back, y: (CAM.height + Math.max(0, b.speed) * 0.1) * near, z: c.z - cy * back, lx: c.x + sy * ah, ly: 0.6, lz: c.z + cy * ah, fov: CAM.fov };
      function mix(to, w) { ['x', 'y', 'z', 'lx', 'ly', 'lz', 'fov'].forEach(function (q) { shot[q] += (to[q] - shot[q]) * w; }); }

      /* ---- road fights: a raised three-quarter view from in front and to the right, so Toofan and the goons on his left both show ---- */
      S.sideW += ((r.enc ? 1 : 0) - S.sideW) * (1 - Math.exp(-3 * dt));
      var e = r.enc || S.lastEnc; if (r.enc) S.lastEnc = r.enc;
      if (S.sideW > 0.001 && e) {
        var F = S.v.ev.focus(r) || S.lastFocus || { u: 0, lat: 1.6 }; S.lastFocus = F;
        var fx = x + e.f.x * F.u + e.l.x * F.lat, fz = z + e.f.z * F.u + e.l.z * F.lat, rx = -e.l.x, rz = -e.l.z, side;
        if (F.police) {                                                      /* the police scene: a slow circling shot */
          var a = 0.85 * Math.sin(S.t * 0.22), dx = rx * Math.cos(a) + e.f.x * Math.sin(a), dz = rz * Math.cos(a) + e.f.z * Math.sin(a);
          side = { x: fx + dx * 8.0, y: 3.0, z: fz + dz * 8.0, lx: fx, ly: 1.2, lz: fz, fov: 46 };
        } else if (F.roof) side = { x: fx + rx * 3.4 + e.f.x * 3.6, y: 6.6, z: fz + rz * 3.4 + e.f.z * 3.6, lx: fx, ly: 1.7, lz: fz, fov: 50 };     /* from above, so Toofan on the roof and the men at the windows both show */
        else if (F.bikes) side = { x: fx + e.f.x * 6.6 * near + rx * 1.0, y: 4.6 * near + 0.6, z: fz + e.f.z * 6.6 * near + rz * 1.0, lx: fx - e.f.x * 0.6, ly: 0.95, lz: fz - e.f.z * 0.6, fov: 54 };   /* goons both sides: high in front, looking back at all three */
        else side = { x: fx + rx * 5.6 * near + e.f.x * 4.2, y: 3.9, z: fz + rz * 5.6 * near + e.f.z * 4.2, lx: fx - e.f.x * 0.3, ly: 1.15, lz: fz - e.f.z * 0.3, fov: 50 };
        mix(side, ease(S.sideW));
      }
      S.bars.set(!!(S.cut || (r.enc && (r.enc.phase === 'police' || r.enc.phase === 'leap' || r.enc.phase === 'spin')) || (S.fx && S.fx.kind !== 'block')));

      /* ---- big moments: the camera pulls back wide and high in slow motion, with speed lines and an impact burst, so nothing is hidden ---- */
      if (S.fx) {
        S.fx.t += dt; var f = S.fx, u = f.t / f.dur;
        if (u >= 1) { S.fx = null; S.ui.lines.style.opacity = 0; }
        else {
          var w2 = u < 0.12 ? ease(u / 0.12) : u > 0.7 ? ease((1 - u) / 0.3) : 1, pull = f.kind === 'block' ? 0.35 : 1;
          var dx3 = shot.x - shot.lx, dy3 = shot.y - shot.ly, dz3 = shot.z - shot.lz;
          mix({ x: shot.lx + dx3 * 1.55, y: shot.ly + dy3 * 1.7 + 1.0, z: shot.lz + dz3 * 1.55, lx: shot.lx, ly: shot.ly, lz: shot.lz, fov: shot.fov + 8 }, w2 * pull);
          S.ui.lines.style.opacity = (f.kind === 'block' ? 0.5 : 0.9) * w2;
        }
      }
      if (S.slow > 0) S.slow -= dt;

      /* ---- the arrival cut shot: circle low round Toofan as he pulls up, then the card and the fight area ---- */
      if (S.cut) {
        var C = S.cut; C.t += dt;
        var a2 = c.yaw + 2.2 + C.t * 0.7, rad = 5.2 - C.t * 0.6;
        mix({ x: x + Math.sin(a2) * rad, y: 1.4 + C.t * 0.3, z: z + Math.cos(a2) * rad, lx: x, ly: 1.5, lz: z, fov: 40 }, ease(C.t / 0.6));
        if (C.t > 1.7 && !C.card) { C.card = true; cinecard.show({ title: C.name.toUpperCase(), sub: 'TOOFAN AA RAHA HAI!', ms: 2600 }); }
        if (C.t > 2.15 && !C.gone) { C.gone = true; ctx.go('freeroam', { mission: { type: C.key, name: C.name } }); return; }
      }
      if (S.shake > 0) { var sh = S.shake * 0.25; shot.x += (Math.random() - 0.5) * sh; shot.y += (Math.random() - 0.5) * sh; S.shake = Math.max(0, S.shake - dt * 1.5); }
      ctx.view.followCamera(0, 0, shot);
      ctx.view.render();

      /* ---- sound ---- */
      if (r.state === 'ride' && !S.cut) S.sfx.engine(dt, { rpm: 0.2 + 0.8 * Math.abs(b.speed) / R.TOP, thr: Math.max(0.15, ctx.input.state.my), speed: b.speed, drifting: false, braking: ctx.input.state.held.block, air: false });
      if (S.honk) { S.honk = false; S.sfx.honk(); }
      S.honkT -= dt;
      if (S.honkT <= 0 && r.state === 'ride') {
        for (var i = 0; i < r.traffic.length; i++) { var v = r.traffic[i]; if (Math.hypot(v.x - b.x, v.z - b.z) < 4) { S.sfx.honk(); S.honkT = 2.5 + (v.id % 3); break; } }
      }

      /* ---- overlay ---- */
      if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.ui.msg.style.opacity = 0; }
      if (S.wordT > 0) { S.wordT -= dt; if (S.wordT < 0.45) S.ui.word.style.transform = 'translate(-50%,-50%) rotate(-8deg) scale(1)'; if (S.wordT <= 0) S.ui.word.style.opacity = 0; }
      S.ui.flash.style.opacity = S.whiteT > 0 ? Math.min(0.8, S.whiteT * 7) : 0; S.whiteT -= dt;
      S.ui.red.style.opacity = S.flashT > 0 ? 1 : 0; S.flashT -= dt;
      var T = r.target, fight = !!r.enc || !!S.cut;
      S.ui.point.style.display = fight ? 'none' : 'block'; S.ui.map.style.display = fight ? 'none' : 'block';
      if (T && r.state !== 'arrived') {
        var dx2 = T.x - x, dz2 = T.z - z; S.ui.target.textContent = T.name.toUpperCase() + '  ' + Math.round(Math.hypot(dx2, dz2)) + ' m';
        S.ui.arrow.style.transform = 'rotate(' + (-Math.atan2(Math.sin(Math.atan2(dx2, dz2) - S.cam.yaw), Math.cos(Math.atan2(dx2, dz2) - S.cam.yaw)) * 57.3) + 'deg)'; S.ui.arrow.style.visibility = 'visible';
      } else { S.ui.target.textContent = T ? T.name.toUpperCase() : 'ALL CLEAR'; S.ui.arrow.style.visibility = 'hidden'; }
      var hearts = ''; for (var hi = 0; hi < 3; hi++) hearts += hi < r.hearts ? '❤' : '♡'; S.ui.hearts.textContent = hearts;
      S.ui.hearts.style.display = r.enc && r.enc.kind !== 'arrest' ? 'block' : 'none';
      S.ui.speed.textContent = r.state === 'ride' && !S.cut ? Math.round(Math.abs(b.speed) * 3.6) + ' km/h' : '';
      if (!fight) drawMap(S.ui.map, r, S.t, S.cam.yaw);
      S.hudT = (S.hudT || 0) - dt;
      if (S.hudT <= 0) {
        S.hudT = 0.25; var vs = ctx.view.stats();
        ctx.hud.update({ mode: 'ride', tick: r.tick, chunks: r.map.blocks.length, maxChunks: r.map.blocks.length, triangles: vs.triangles, calls: vs.calls, bytes: vs.bytes,
          loads: r.crashes, unloads: r.arrivals, saveOk: ctx.save.persistent(), rage: 0, ms: vs.ms, tier: vs.tier });
      }
    },
    exit: function () {}
  };
}

/* the mini-map turns with the camera (heading up) and centres on the bike: roads, trouble spots (yellow open, green visited), the signal pulsing red */
function drawMap(cv, r, t, yaw) {
  var g = cv.getContext('2d'), W = cv.width, sc = (W / 2) / 170, b = r.bike, E = r.map.ext;
  g.clearRect(0, 0, W, W); g.save(); g.translate(W / 2, W / 2); g.rotate(yaw - Math.PI); g.translate(-b.x * sc, -b.z * sc);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 4;
  r.map.lines.forEach(function (l) { g.beginPath(); g.moveTo(-E * sc, l * sc); g.lineTo(E * sc, l * sc); g.stroke(); g.beginPath(); g.moveTo(l * sc, -E * sc); g.lineTo(l * sc, E * sc); g.stroke(); });
  r.map.targets.forEach(function (T) {
    var cur = r.target === T, st = r.missions[T.key];
    g.fillStyle = cur ? (Math.sin(t * 8) > 0 ? '#ff3b30' : '#ffc21a') : (st === 'open' ? '#ffc21a' : '#4fc08d');
    g.beginPath(); g.arc(T.x * sc, T.z * sc, cur ? 6 : 4, 0, 7); g.fill();
  });
  g.restore(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 7); g.lineTo(W / 2 + 5, W / 2 + 6); g.lineTo(W / 2 - 5, W / 2 + 6); g.closePath(); g.fill();
}

module.exports = { createRide: createRide };
