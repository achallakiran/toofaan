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
      S.v = rideview.createRideView(view.scene); S.v.build(S.r.map);
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
      rideSim.step(S.r, ctx.input);
    },
    render: function (ctx, alpha) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var r = S.r, b = r.bike, x = b.px + (b.x - b.px) * alpha, z = b.pz + (b.z - b.pz) * alpha;
      S.v.sync(r, alpha, dt, S.t);
      /* camera: high and north-up, leaning ahead of the bike and rising with speed */
      var fx = Math.sin(b.h) * b.speed * 0.55, fz = Math.cos(b.h) * b.speed * 0.55, H = 19 + 11 * Math.min(1, (ctx.view.canvas.clientHeight || 700) / 700) + b.speed * 0.35;      /* closer on a phone, so Bijli stays readable */
      if (r.state === 'fly' || r.state === 'run') { fx = 0; fz = 0; x = r.hero.x; z = r.hero.z; }
      var c = S.cam || (S.cam = { x: x + fx, z: z + fz, h: H }), k = 1 - Math.exp(-3 * dt);
      c.x += (x + fx - c.x) * k; c.z += (z + fz - c.z) * k; c.h += (H - c.h) * k;
      ctx.view.followCamera(0, 0, { x: c.x, y: c.h, z: c.z + c.h * 0.22, lx: c.x, ly: 0, lz: c.z - 1, fov: 44 });
      ctx.view.render();
      /* sound */
      if (r.state === 'ride') S.sfx.engine(dt, { rpm: 0.2 + 0.8 * b.speed / R.TOP, thr: b.speed < R.CRUISE - 0.5 ? 1 : 0.35, speed: b.speed, drifting: false, braking: ctx.input.state.held.block, air: false });
      S.honkT -= dt;
      if (S.honkT <= 0 && r.state === 'ride') {
        for (var i = 0; i < r.traffic.length; i++) { var v = r.traffic[i]; if (Math.hypot(v.x - b.x, v.z - b.z) < 4 && v.kind !== 'scooter') { S.sfx.honk(); S.honkT = 2.5 + (v.id % 3); break; } }
      }
      /* overlay */
      if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.ui.msg.style.opacity = 0; }
      var T = r.target;
      if (T && r.state !== 'arrived') {
        var dx = T.x - x, dz = T.z - z; S.ui.target.textContent = T.name.toUpperCase() + '  ' + Math.round(Math.hypot(dx, dz)) + ' m';
        S.ui.arrow.style.transform = 'rotate(' + (Math.atan2(dx, -dz) * 57.3) + 'deg)'; S.ui.arrow.style.visibility = 'visible';
      } else { S.ui.target.textContent = T ? T.name.toUpperCase() : 'ALL CLEAR'; S.ui.arrow.style.visibility = 'hidden'; }
      S.ui.speed.textContent = r.state === 'ride' ? Math.round(b.speed * 3.6) + ' km/h' : '';
      drawMap(S.ui.map, r, S.t);
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

/* the mini-map: roads, trouble spots (yellow open, green visited), the signal pulsing red, the bike as a white arrow */
function drawMap(cv, r, t) {
  var g = cv.getContext('2d'), W = cv.width, E = r.map.ext, sc = (W - 12) / (2 * E);
  function px(v) { return 6 + (v + E) * sc; }
  g.clearRect(0, 0, W, W); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3;
  r.map.lines.forEach(function (l) { g.beginPath(); g.moveTo(px(-E), px(l)); g.lineTo(px(E), px(l)); g.stroke(); g.beginPath(); g.moveTo(px(l), px(-E)); g.lineTo(px(l), px(E)); g.stroke(); });
  r.map.targets.forEach(function (T) {
    var cur = r.target === T, st = r.missions[T.key];
    g.fillStyle = cur ? (Math.sin(t * 8) > 0 ? '#ff3b30' : '#ffc21a') : (st === 'open' ? '#ffc21a' : '#4fc08d');
    g.beginPath(); g.arc(px(T.x), px(T.z), cur ? 5 : 3, 0, 7); g.fill();
  });
  var b = r.bike; g.save(); g.translate(px(b.x), px(b.z)); g.rotate(Math.PI - b.h); g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill(); g.restore();
}

module.exports = { createRide: createRide };
