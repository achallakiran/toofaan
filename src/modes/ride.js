/* modes: Ride. The overhead drive across the city map to the next trouble spot (Phase 4, M0 and M1).
   A separate mode with its own sim: the brawler (Street test) is not touched by anything here. */
'use strict';

var rideSim = require('../sim/ride');
var R = require('../data/ride');
var rideview = require('../view/rideview');
var sfxmod = require('../view/sfx');

function createRide() {
  var S = {};
  return {
    name: 'ride',
    enter: function (ctx, scope) {
      var view = ctx.view;
      view.setSky('#a9c7da', false);
      ctx.hudRoot.hidden = false; ctx.touchRoot.hidden = false; ctx.touch.setFinisherVisible(false);
      /* the ride carries on where you left it when you come back to this tab */
      if (!ctx.ride) {
        ctx.ride = rideSim.createRide(ctx.world.seed, ctx.bus);
        var saved = ctx.save.get('ride.missions', null);
        if (saved) { Object.keys(saved).forEach(function (k) { if (ctx.ride.missions[k]) ctx.ride.missions[k] = saved[k]; }); rideSim.pickTarget(ctx.ride); }
      }
      S.r = ctx.ride; S.t = 0; S.cam = null; S.msgT = 0; S.honkT = 0;
      S.v = rideview.createRideView(view.scene); S.v.build(S.r.map); S.v.prime(S.r.bike.x, S.r.bike.z);
      scope.add(function () { S.v.dispose(); });
      S.sfx = sfxmod.createSfx(); S.sfx.start(); scope.add(function () { S.sfx.engineOff(); });

      /* overlay: hearts, the signal pointer, speed, messages and a mini-map */
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;font-family:system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000';
      el.innerHTML =
        '<div style="position:absolute;left:50%;top:max(56px,env(safe-area-inset-top));transform:translateX(-50%);text-align:center;font:800 13px system-ui,sans-serif;letter-spacing:.08em">' +
        '<span id="rArrow" style="display:inline-block;font-size:20px;color:#ffc21a;margin-right:8px">&#9650;</span><span id="rTarget"></span></div>' +
        '<div id="rHearts" style="position:absolute;right:16px;top:max(56px,env(safe-area-inset-top));font-size:20px;letter-spacing:4px;color:#ff4a5a">&#10084;&#10084;&#10084;</div>' +
        '<div id="rMsg" style="position:absolute;left:50%;top:38%;transform:translateX(-50%);font:900 30px system-ui,sans-serif;letter-spacing:.06em;color:#ffc21a;opacity:0;transition:opacity .25s;white-space:nowrap"></div>' +
        '<div id="rSpeed" style="position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);font:900 24px system-ui,sans-serif"></div>' +
        '<canvas id="rMap" width="150" height="150" style="position:absolute;right:16px;top:max(92px,calc(env(safe-area-inset-top) + 36px));width:120px;height:120px;border-radius:8px;background:rgba(10,14,18,.55);border:1px solid rgba(255,255,255,.25)"></canvas>';
      document.body.appendChild(el); scope.add(function () { el.remove(); });
      S.ui = { arrow: el.querySelector('#rArrow'), target: el.querySelector('#rTarget'), msg: el.querySelector('#rMsg'), speed: el.querySelector('#rSpeed'), map: el.querySelector('#rMap') };
      function say(text, secs) { S.ui.msg.textContent = text; S.ui.msg.style.opacity = 1; S.msgT = secs || 1.6; }
      S.say = say;
      scope.add(ctx.bus.on('ride:crash', function () { S.sfx.crash(true); say('CRASH!', 1.2); }));
      scope.add(ctx.bus.on('ride:getup', function () { say('Back to Bijli!', 1.4); }));
      scope.add(ctx.bus.on('ride:remount', function () { S.sfx.start(); }));
      scope.add(ctx.bus.on('ride:bump', function () { S.sfx.hit('jab', 0.3); }));
      scope.add(ctx.bus.on('ride:wall', function () { S.sfx.land(4); }));
      scope.add(ctx.bus.on('ride:arrive', function (e) { S.sfx.engineOff(); say('Arrived: ' + e.name, 2.6); ctx.save.set('ride.missions', S.r.missions); }));
      scope.add(ctx.bus.on('ride:signal', function (e) { say('Signal: ' + e.name, 2); }));
      if (S.r.target) say('Signal: ' + S.r.target.name, 2.2);
    },
    step: function (ctx, tick) {
      ctx.input.tick(tick);
      if (ctx.input.state.pressed.attack && S.r.state === 'ride') S.honk = true;      /* until the road fights arrive (M2), Attack sounds the horn */
      rideSim.step(S.r, ctx.input);
    },
    render: function (ctx, alpha) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var r = S.r, b = r.bike, x = b.px + (b.x - b.px) * alpha, z = b.pz + (b.z - b.pz) * alpha;
      S.v.sync(r, alpha, dt, S.t);
      /* camera: a high chase camera behind Bijli, turning with her (as in the prototype, close enough to see Toofan) */
      var CAM = R.CAM, cx = x, cz = z, yaw = b.h;
      if (r.state === 'fly' || r.state === 'run') { cx = r.hero.x; cz = r.hero.z; }
      var c = S.cam || (S.cam = { x: cx, z: cz, yaw: yaw }), k = 1 - Math.exp(-5 * dt), ky = 1 - Math.exp(-2.2 * dt);
      c.x += (cx - c.x) * k; c.z += (cz - c.z) * k;
      if (r.state === 'ride') c.yaw += Math.atan2(Math.sin(yaw - c.yaw), Math.cos(yaw - c.yaw)) * ky;
      var near = (ctx.view.canvas.clientHeight || 700) < 520 ? 0.78 : 1;      /* a phone held sideways: come in closer so Toofan stays big */
      var sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), back = (CAM.back + Math.max(0, b.speed) * 0.12) * near, ah = CAM.ahead + Math.max(0, b.speed) * 0.2;
      ctx.view.followCamera(0, 0, { x: c.x - sy * back, y: (CAM.height + Math.max(0, b.speed) * 0.1) * near, z: c.z - cy * back, lx: c.x + sy * ah, ly: 0.6, lz: c.z + cy * ah, fov: CAM.fov });
      ctx.view.render();
      /* sound */
      if (r.state === 'ride') S.sfx.engine(dt, { rpm: 0.2 + 0.8 * Math.abs(b.speed) / R.TOP, thr: Math.max(0.15, ctx.input.state.my), speed: b.speed, drifting: false, braking: ctx.input.state.held.block, air: false });
      if (S.honk) { S.honk = false; S.sfx.honk(); }
      S.honkT -= dt;
      if (S.honkT <= 0 && r.state === 'ride') {
        for (var i = 0; i < r.traffic.length; i++) { var v = r.traffic[i]; if (Math.hypot(v.x - b.x, v.z - b.z) < 4 && v.kind !== 'scooter') { S.sfx.honk(); S.honkT = 2.5 + (v.id % 3); break; } }
      }
      /* overlay */
      if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.ui.msg.style.opacity = 0; }
      var T = r.target;
      if (T && r.state !== 'arrived') {
        var dx = T.x - x, dz = T.z - z; S.ui.target.textContent = T.name.toUpperCase() + '  ' + Math.round(Math.hypot(dx, dz)) + ' m';
        S.ui.arrow.style.transform = 'rotate(' + (-Math.atan2(Math.sin(Math.atan2(dx, dz) - S.cam.yaw), Math.cos(Math.atan2(dx, dz) - S.cam.yaw)) * 57.3) + 'deg)'; S.ui.arrow.style.visibility = 'visible';
      } else { S.ui.target.textContent = T ? T.name.toUpperCase() : 'ALL CLEAR'; S.ui.arrow.style.visibility = 'hidden'; }
      S.ui.speed.textContent = r.state === 'ride' ? Math.round(Math.abs(b.speed) * 3.6) + ' km/h' : '';
      drawMap(S.ui.map, r, S.t, S.cam.yaw);
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
