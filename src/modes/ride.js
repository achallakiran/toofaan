/* modes: Ride, the heart of the game (Phase 4). Toofan rides Bijli across the city to the next trouble spot. On the way the bike goons
   attack, then the car gang. (Since build 76 the road fights are his choice: gang patrols drive their roads, shown on the maps, and riding
   up to one starts that fight. HOME signals the cycle-repair shop; arriving there opens the hidden entrance down to the hideout.) Arriving plays a cut shot and a retro card, and the game steps into that place's fight (modes/fight).
   When the area is clear it comes back here: the police take the goons away and Toofan rides on to the next signal.
   Big moments in the road fights (counters, knockouts, the leap) slow time and pull the camera back wide, with speed lines, bursts and a flash. */
'use strict';

var rideSim = require('../sim/ride');
var R = require('../data/ride');
var rideview = require('../view/rideview');
var sfxmod = require('../view/sfx');
var cinecard = require('../view/cinecard');
var musicMod = require('../view/music');
var fullmap = require('../view/fullmap');
var GANGS = require('../data/gangs');
var encSim = require('../sim/encounter');
var thappadMod = require('./thappad');
var skybolt = require('../view/skybolt');
var shopvox = require('../view/shopvox');
var landmarks = require('../view/landmarks');
var mansionvox = require('../view/mansionvox');

var WORD = { bkJabL: 'DISHUM!', bkCrossL: 'DISHUM!', bkHookL: 'TADAAK!', bkElbowL: 'KHAT!', bkKickL: 'DHADAAK!', jab: 'DISHUM!', cross: 'DISHUM!', hook: 'TADAAK!', kick: 'DHADAAK!', bkCElbowL: 'PATAAK!', counterCross: 'PATAAK!' };
function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

/* the ride state lives for the whole session (the hideout's gang chart reads it too); first use loads the saved progress */
function ensureRide(ctx) {
  if (!ctx.ride) {
    ctx.ride = rideSim.createRide(ctx.world.seed, ctx.bus);
    var saved = ctx.save.get('ride.missions', null);
    if (saved) { Object.keys(saved).forEach(function (k) { if (ctx.ride.missions[k]) ctx.ride.missions[k] = saved[k] === 'active' ? 'open' : saved[k]; }); rideSim.pickTarget(ctx.ride); }
    var pos = ctx.save.get('ride.pos', null), B = ctx.ride.bike;     /* Continue: back where Bijli was parked */
    if (pos && isFinite(pos.x) && isFinite(pos.z)) { B.x = B.px = pos.x; B.z = B.pz = pos.z; B.h = B.ph = pos.h || 0; }
    var Gt = rideSim.homeGate(ctx.ride); if (Math.hypot(B.x - Gt.x, B.z - Gt.z) < 12) ctx.ride.homeArmed = false;     /* parked at the shop: it does not take him straight back in */
  }
  return ctx.ride;
}

function createRide() {
  var S = {};
  /* home: Bijli turns in to the shop, the loose brick is pressed, the shutter rolls up, the floor splits, the ramp tips down and she rolls
     down into the dark. Then the hideout. (6.4 s) */
  function startHome() { if (S.cut) return; S.sfx.engineOff(); S.music.stop(2.5); var B = S.r.bike; S.cut = { kind: 'home', t: 0, x0: B.x, z0: B.z, h0: B.h, gone: false }; }
  function homeCut(ctx, C, x, z, mix) {
    var r = S.r, B = r.bike, D = S.shop.door, t = C.t;
    function seg(a, b2) { return Math.max(0, Math.min(1, (t - a) / (b2 - a))); }
    var a = ease(seg(0, 1.2)), front = { x: D.x, z: D.z - 3.6 };
    var bx = C.x0 + (front.x - C.x0) * a, bz = C.z0 + (front.z - C.z0) * a, bh = C.h0 + Math.atan2(Math.sin(0 - C.h0), Math.cos(0 - C.h0)) * a, by = 0, pitch = 0;
    S.shop.open(seg(1.4, 4.6));
    var roll = seg(4.6, 7.2);                                  /* in at the door, down the ramp, on into the tunnel */
    if (roll > 0) { bz = front.z + (S.shop.deep.z - front.z) * (roll * roll * 0.35 + roll * 0.65); bx = D.x; bh = 0; var A = S.shop.along(bz); by = A.y; pitch = A.pitch; }
    B.x = B.px = bx; B.z = B.pz = bz; B.h = B.ph = bh; B.speed = roll > 0 && roll < 1 ? 4 : 0; S.v.bikeY = by; S.v.bikePitch = pitch;
    if (t > 1.3 && !C.click) { C.click = true; S.sfx.hit('jab', 0.25); }
    if (t > 1.9 && !C.roll) { C.roll = true; S.sfx.land && S.sfx.land(3); }
    if (t > 4.6 && !C.go) { C.go = true; S.sfx.start(); }
    mix({ x: D.x - 3.2, y: 3.4, z: D.z - 9.6, lx: D.x + 0.4, ly: 1.1, lz: D.z + 0.8, fov: 46 }, ease(seg(0.4, 1.6)));
    if (roll > 0) mix({ x: D.x - 1.3, y: 3.9, z: D.z - 2.6, lx: D.x, ly: -1.4, lz: D.z + 3.4, fov: 52 }, ease(Math.min(1, roll * 1.6)));
    if (!S.black) { S.black = document.createElement('div'); S.black.style.cssText = 'position:fixed;inset:0;z-index:30;background:#000;opacity:0;pointer-events:none'; document.body.appendChild(S.black); }
    S.black.style.opacity = seg(6.6, 7.4);
    if (t > 7.6 && !C.gone) {
      C.gone = true; rideSim.leaveHome(r); S.v.bikeY = 0; S.v.bikePitch = 0;
      ctx.save.set('ride.pos', { x: +B.x.toFixed(2), z: +B.z.toFixed(2), h: +B.h.toFixed(3) }); ctx.save.set('ride.missions', r.missions);
      ctx.go('hideout', { from: 'shop' });
    }
  }
  return {
    name: 'ride',
    enter: function (ctx, scope, args) {
      var view = ctx.view;
      S.cut = null; S.black = null; S.gateSaidT = 0;                 /* (a scene from the last visit, such as going home, never carries over) */
      view.setSky('#a9c7da', false);
      ctx.hudRoot.hidden = false; ctx.touchRoot.hidden = false; ctx.touch.setFinisherVisible(false);
      /* the ride carries on where you left it */
      ensureRide(ctx);
      S.r = ctx.ride; S.t = 0; S.cam = null; S.msgT = 0; S.honkT = 0; S.cut = null; S.fx = null; S.slow = 0; S.slowAcc = 0; S.shake = 0; S.sideW = 0; S.last = 0;
      if (args && args.after === 'arrest') { rideSim.afterFight(S.r, args.key); ctx.save.set('ride.missions', S.r.missions); S.sideW = 1; }
      S.v = rideview.createRideView(view.scene); S.v.build(S.r.map); S.v.prime(S.r.bike.x, S.r.bike.z);
      S.shop = shopvox.createShop(view.scene, S.r.map.home); scope.add(function () { S.shop.dispose(); });
      S.marks = landmarks.createLandmarks(view.scene, S.r.map); scope.add(function () { S.marks.dispose(); });      /* each place's landmark */
      S.r.bosses = ctx.save.get('bosses', []) || [];                                          /* the gangs whose boss he has beaten */
      S.mansion = mansionvox.createMansion(view.scene, S.r.map); S.mansion.open(rideSim.mansionOpen(S.r) ? 1 : 0); scope.add(function () { S.mansion.dispose(); });
      scope.add(function () { S.v.dispose(); ctx.touchRoot.style.visibility = ''; });
      var park = function () { var B = S.r.bike; if (S.r.state === 'ride' && !S.r.enc) ctx.save.set('ride.pos', { x: +B.x.toFixed(2), z: +B.z.toFixed(2), h: +B.h.toFixed(3) }); };   /* leaving the page parks Bijli where she is */
      var hid = function () { if (document.hidden) park(); };
      window.addEventListener('pagehide', park); document.addEventListener('visibilitychange', hid);
      scope.add(function () { window.removeEventListener('pagehide', park); document.removeEventListener('visibilitychange', hid); });
      S.sfx = sfxmod.createSfx(); S.sfx.engineOff(); S.sfx.start(); scope.add(function () { S.sfx.engineOff(); });
      S.bars = cinecard.bars(); scope.add(function () { S.bars.remove(); if (S.black) { S.black.remove(); S.black = null; } });

      /* overlay: hearts, the signal pointer, speed, messages, the comic word, flashes and the mini-map */
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;font-family:system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000';
      el.innerHTML =
        '<div id="rPoint" style="position:absolute;left:50%;top:max(56px,env(safe-area-inset-top));transform:translateX(-50%);text-align:center;font:800 13px system-ui,sans-serif;letter-spacing:.08em">' +
        '<span id="rArrow" style="display:inline-block;font-size:20px;color:#ffc21a;margin-right:8px">&#9650;</span><span id="rTarget"></span></div>' +
        '<div id="rHearts" style="position:absolute;right:16px;top:max(56px,env(safe-area-inset-top));font-size:22px;letter-spacing:4px;color:#ff4a5a"></div>' +
        '<div id="rMsg" style="position:absolute;left:50%;top:26%;transform:translateX(-50%);font:900 28px system-ui,sans-serif;letter-spacing:.06em;color:#ffc21a;opacity:0;transition:opacity .25s;white-space:nowrap"></div>' +
        '<div id="rWord" class="comic" style="position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) rotate(-8deg) scale(0);font:900 clamp(40px,8vw,84px) \'Arial Black\',Impact,sans-serif;color:#ffd21f;-webkit-text-stroke:3px #000;text-shadow:5px 5px 0 #000;padding:10px 26px;background:radial-gradient(ellipse at center,#fff 0 30%,rgba(255,80,40,.9) 31% 55%,transparent 56%);transition:transform .12s ease-out,opacity .2s;opacity:0;white-space:nowrap"></div>' +
        '<div id="rSpeed" style="position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);font:900 24px system-ui,sans-serif"></div>' +
        '<button id="rHome" data-ok="1" style="position:absolute;right:16px;top:max(222px,calc(env(safe-area-inset-top) + 166px));width:120px;padding:7px 0;pointer-events:auto;cursor:pointer;border-radius:6px;border:1px solid rgba(140,200,255,.6);background:rgba(10,14,18,.7);color:#bfe3ff;font:12px \'ToofanPx\',monospace;letter-spacing:.14em">&#8962; HOME</button>' +
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
               word: el.querySelector('#rWord'), lines: lines, speed: el.querySelector('#rSpeed'), map: el.querySelector('#rMap'), home: el.querySelector('#rHome'), flash: flashEl, red: red };
      S.flashT = 0; S.whiteT = 0; S.wordT = 0;
      /* tapping the mini-map opens the full city map; tapping a place there makes it the next signal */
      S.map = fullmap.createFullMap(); scope.add(function () { S.map.dispose(); });
      S.ui.map.style.pointerEvents = 'auto'; S.ui.map.style.cursor = 'pointer'; S.ui.map.setAttribute('data-ok', '1');
      S.ui.home.addEventListener('click', function (ev) { ev.stopPropagation(); if (S.r.state !== 'ride' || S.r.enc || S.cut) return; rideSim.chooseTarget(S.r, 'home'); });
      ctx.debug.goHome = function () { rideSim.chooseTarget(S.r, 'home'); var H = S.r.map.home, B = S.r.bike; var G = rideSim.homeGate(S.r); B.x = B.px = G.x + 7; B.z = B.pz = G.z; B.speed = 5; B.h = B.ph = -Math.PI / 2; };   /* (test tools) */
      S.ui.map.addEventListener('click', function (ev) { ev.stopPropagation(); if (S.r.state !== 'ride' || S.r.enc || S.cut) return; S.map.open(S.r, function (key) { if (rideSim.chooseTarget(S.r, key)) say('SIGNAL: ' + S.r.target.name.toUpperCase(), 1.8); }); });
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
      scope.add(ctx.bus.on('ride:signal', function (e) { say(e.key === 'home' ? 'GHAR CHALO: CYCLE REPAIR SHOP' : 'Signal: ' + e.name, 2); }));
      scope.add(ctx.bus.on('ride:home', function () { startHome(); }));
      scope.add(ctx.bus.on('ride:locked', function (e) { S.say('LOCKED: BEAT ' + e.left.length + ' MORE GANG BOSS' + (e.left.length === 1 ? '' : 'ES'), 3); S.sfx.hit && S.sfx.hit('block', 0.4); }));
      scope.add(ctx.bus.on('ride:mansion', function () { S.say('THE GATE STANDS OPEN', 3); }));
      scope.add(ctx.bus.on('ride:chase', function (e) { var G = GANGS.GANGS[e.gang]; if (G) say(G.name.toUpperCase() + ' KE AADMI!', 1.6); }));
      /* road fights */
      S.music = musicMod.createMusic(S.sfx); S.music.setTrack(S.r.enc ? (S.r.enc.kind === 'car' ? 'boss' : S.r.enc.kind === 'bikes' ? 'road' : 'ride') : 'ride');
      scope.add(ctx.bus.on('enc:start', function (e) { S.music.setTrack(e.kind === 'car' ? 'boss' : e.kind === 'bikes' ? 'road' : 'ride'); if (e.kind === 'arrest') return; S.sfx.honk(); say(e.kind === 'car' ? 'CAR GANG!' : 'BIKE GOONS!', 1.8); }));
      scope.add(ctx.bus.on('enc:swing', function () { S.sfx.whoosh(0.5); }));
      scope.add(ctx.bus.on('enc:hit', function (e) { S.sfx.hit(/kick|Kick/.test(e.move) ? 'kick' : 'jab', 0.8); word(WORD[e.move.replace(/R$/, 'L')] || 'DISHUM!'); S.shake = 0.15; boom(e.id, 0xffffff, 0.8); }));
      scope.add(ctx.bus.on('enc:ko', function (e) { S.sfx.hit('uppercut', 1); S.sfx.fall(); word('DHADAAM!'); big('ko', e.id, 1.3, 1.0); }));
      scope.add(ctx.bus.on('enc:counter', function (e) { S.sfx.hit('counterCross', 1); word('PATAAK!'); big('counter', e.id, 0.9, 0.7); }));
      scope.add(ctx.bus.on('enc:block', function (e) { S.sfx.block(false); word('THAK!'); S.whiteT = 0.08; S.shake = 0.2; S.slow = 0.25; S.fx = { kind: 'block', t: 0, dur: 0.5 }; boom(e.id, 0x9fd8ff, 0.9); }));
      scope.add(ctx.bus.on('enc:hurt', function () { S.sfx.hit('hook', 0.7); S.flashT = 0.35; S.shake = 0.3; }));
      scope.add(ctx.bus.on('enc:warn', function (e) { if (e.car) say('BLOCK when it swerves!', 1.2); }));
      scope.add(ctx.bus.on('enc:leap', function () { S.sfx.whoosh(1); word('JUMP!'); big('leap', 0, 1.2, 0.9); }));
      scope.add(ctx.bus.on('enc:spin', function () { S.sfx.crash(true); word('DHADAAM!'); big('spin', 0, 1.4, 1.0); }));
      scope.add(ctx.bus.on('ride:abandon', function (e) { say('LEFT FOR LATER: ' + e.name.toUpperCase() + (e.next ? '  \u2192  ' + e.next.toUpperCase() : ''), 2.6); }));
      scope.add(ctx.bus.on('enc:police', function () { S.sfx.honk(); setTimeout(function () { S.sfx.honk(); }, 350); say('POLICE!', 1.6); }));
      scope.add(ctx.bus.on('enc:arrest', function () { S.music.setTrack('sting'); cinecard.show({ title: 'ARRESTED!', sub: 'Police le gayi goondon ko', ms: 1500 }); }));
      scope.add(ctx.bus.on('enc:clear', function () { say('ROAD CLEAR!', 1.6); }));
      /* down on the road: Maa ka Thappad, then the rock stand by the roadside, the spark, the goons swerving away, back on Bijli */
      var white = document.createElement('div'); white.style.cssText = 'position:fixed;inset:0;z-index:43;pointer-events:none;background:#fff;opacity:0;transition:opacity .9s'; document.body.appendChild(white);
      var bolt = skybolt.create(ctx.view), tmr = [];
      scope.add(function () { white.remove(); bolt.dispose(); tmr.forEach(clearTimeout); if (S.thp) { S.thp.dispose(); S.thp = null; } });
      var tapK = function (e) { if (S.thp && (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter') && !e.repeat) S.thp.tap(); };
      var ab = ctx.touchRoot.querySelector('#btnAttack'), tapP = function () { if (S.thp) S.thp.tap(); };
      window.addEventListener('keydown', tapK); if (ab) ab.addEventListener('pointerdown', tapP);
      scope.add(function () { window.removeEventListener('keydown', tapK); if (ab) ab.removeEventListener('pointerdown', tapP); });
      scope.add(ctx.bus.on('enc:down', function () {
        say('TOOFAN IS DOWN!', 1.6); S.sfx.crash(true); S.shake = 0.4; S.sfx.engineOff && S.sfx.engineOff();
        tmr.push(setTimeout(function () {
          if (!S.r.enc || S.r.enc.phase !== 'down') return;
          S.music.setTrack('thappad');
          S.thp = ctx.debug.thp = thappadMod.createThappad(ctx, { sfx: S.sfx, onGiveUp: function () {
            cinecard.show({ title: 'GAME OVER', sub: 'Toofan fell on the road', ms: 2600 });
            tmr.push(setTimeout(function () { ctx.ride = null; ctx.go('title', { menu: true }); }, 2800));
          }, onDone: function () {
            white.style.transition = 'none'; white.style.opacity = 1;
            if (S.thp) { S.thp.dispose(); S.thp = null; }
            encSim.revive(S.r); S.msgT = 0; S.ui.msg.style.opacity = 0;
            requestAnimationFrame(function () { white.style.transition = 'opacity .9s'; white.style.opacity = 0; });
          } });
        }, 1300));
      }));
      scope.add(ctx.bus.on('enc:spark', function () {
        var e = S.r.enc, b = S.r.bike; if (!e) return;
        bolt.strike(b.x + e.f.x * -0.8 + e.l.x * -1.7, b.z + e.f.z * -0.8 + e.l.z * -1.7, 1.9 * R.SCALE); S.sfx.bolt(); S.shake = 0.3;
        white.style.transition = 'none'; white.style.opacity = 0.55; requestAnimationFrame(function () { white.style.transition = 'opacity .5s'; white.style.opacity = 0; });
      }));
      scope.add(ctx.bus.on('enc:resume', function () { var e = S.r.enc; S.music.setTrack(e && e.kind === 'car' ? 'boss' : 'road'); say('TOOFAN IS BACK!', 1.4); S.sfx.start && S.sfx.start(); }));
      scope.add(ctx.bus.on('enc:end', function (e) { if (S.music.track() !== 'sting') S.music.setTrack('ride'); if (e.kind !== 'bikes') { var T = S.r.target; cinecard.show({ title: 'TOOFAN IS BACK!', sub: T ? 'Next: ' + T.name : 'All clear', ms: 1400 }); } }));
      ctx.debug.rideMode = S;
      ctx.debug.rideStart = function (k) { if (S.r.state === 'ride') rideSim.startEncounter(S.r, k); };     /* for the test tools */
      if (S.r.target && !(args && args.after)) say('Signal: ' + S.r.target.name, 2.2);
    },
    step: function (ctx, tick) {
      ctx.input.tick(tick);
      if (S.cut) return;                                                     /* the arrival cut shot: the ride waits */
      if (S.map && S.map.isOpen()) return;                                  /* the full map is open: the ride waits */
      if (ctx.debug.freeze) return;                                          /* (test tools: hold the moment for a screenshot) */
      if (S.slow > 0) { S.slowAcc += 0.3; if (S.slowAcc < 1) return; S.slowAcc -= 1; }     /* slow motion: the sim steps less often */
      if (ctx.input.state.pressed.attack && S.r.state === 'ride') S.honk = true;
      rideSim.step(S.r, ctx.input);
    },
    render: function (ctx, alpha) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      if (S.thp) { S.thp.render(dt); return; }                                  /* Maa's world has the screen */
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
        } else if (F.roof) side = { x: fx + rx * 5.4 + e.f.x * 2.6, y: 3.4, z: fz + rz * 5.4 + e.f.z * 2.6, lx: fx - e.f.x * 0.4, ly: 2.0, lz: fz - e.f.z * 0.4, fov: 50 };     /* low at the side, Spider-Man style: Toofan flat on the roof against the sky, the men at the windows below him */
        else if (F.bikes) side = { x: fx + e.f.x * 6.6 * near + rx * 1.0, y: 4.6 * near + 0.6, z: fz + e.f.z * 6.6 * near + rz * 1.0, lx: fx - e.f.x * 0.6, ly: 0.95, lz: fz - e.f.z * 0.6, fov: 54 };   /* goons both sides: high in front, looking back at all three */
        else side = { x: fx + rx * 5.6 * near + e.f.x * 4.2, y: 3.9, z: fz + rz * 5.6 * near + e.f.z * 4.2, lx: fx - e.f.x * 0.3, ly: 1.15, lz: fz - e.f.z * 0.3, fov: 50 };
        mix(side, ease(S.sideW));
      }
      var cine = !!(S.cut || (r.enc && (r.enc.phase === 'police' || r.enc.phase === 'leap' || r.enc.phase === 'spin' || r.enc.kind === 'arrest')) || (S.fx && S.fx.kind !== 'block'));
      S.bars.set(cine);
      ctx.touchRoot.style.visibility = cine ? 'hidden' : '';          /* the buttons step aside for the cinematic shots, so they never sit under the bars */
      S.posT = (S.posT || 0) - dt;
      if (S.posT <= 0 && r.state === 'ride' && !r.enc && !S.cut) { S.posT = 3; ctx.save.set('ride.pos', { x: +b.x.toFixed(2), z: +b.z.toFixed(2), h: +b.h.toFixed(3) }); }

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
      if (S.music.enabled && !S.music.playing() && S.sfx.on) S.music.setTrack(r.enc ? (r.enc.kind === 'car' ? 'boss' : r.enc.kind === 'bikes' ? 'road' : 'ride') : 'ride');   /* music switched back on, or sound just unlocked */

      /* ---- the arrival cut shot: circle low round Toofan as he pulls up, then the card and the fight area ---- */
      if (S.r.atHome && !S.cut) startHome();                              /* (whatever the order of things, home always plays its scene) */
      if (S.r.atGate && !S.cut && Math.abs(S.r.bike.speed) >= 4.5 && !(S.gateSaidT > 0)) { S.say('STOP IN THE BLUE RING TO GO HOME', 1.8); S.gateSaidT = 6; }
      if (S.gateSaidT > 0) S.gateSaidT -= dt;
      if (S.cut && S.cut.kind === 'home') {
        var HC = S.cut; HC.t += dt; homeCut(ctx, HC, x, z, mix);
        if (HC.gone) return;
      } else if (S.cut) {
        var C = S.cut; C.t += dt;
        var a2 = c.yaw + 2.2 + C.t * 0.7, rad = 5.2 - C.t * 0.6;
        mix({ x: x + Math.sin(a2) * rad, y: 1.4 + C.t * 0.3, z: z + Math.cos(a2) * rad, lx: x, ly: 1.5, lz: z, fov: 40 }, ease(C.t / 0.6));
        if (C.t > 1.7 && !C.card) { C.card = true; var gk = GANGS.gangOf(C.key), gg = gk && GANGS.GANGS[gk]; cinecard.show({ title: C.name.toUpperCase(), sub: gg ? gg.name.toUpperCase() + ' KA ILAAKA' : 'TOOFAN AA RAHA HAI!', ms: 2600 }); }
        if (C.t > 2.15 && !C.gone) { C.gone = true; ctx.go('fight', { type: C.key }); return; }
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
      S.ui.point.style.display = fight ? 'none' : 'block'; S.ui.map.style.display = fight ? 'none' : 'block'; S.ui.home.style.display = fight || (T && T.key === 'home') ? 'none' : 'block';
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
  var Mn = r.map.mansion;                                                 /* the old mansion: a dark house, a red padlock while shut */
  if (Mn) { var mx = Mn.icon.x * sc, mz = Mn.icon.z * sc; g.fillStyle = '#3a2430'; g.fillRect(mx - 6, mz - 2, 12, 8); g.beginPath(); g.moveTo(mx - 7, mz - 2); g.lineTo(mx, mz - 8); g.lineTo(mx + 7, mz - 2); g.closePath(); g.fill();
    if (!rideSim.mansionOpen(r)) { g.fillStyle = '#ff3a2a'; g.fillRect(mx - 2.5, mz + 1, 5, 4); } }
  var H = r.map.home, hc = r.target === H;                                /* home: a little blue house */
  g.fillStyle = hc && Math.sin(t * 8) > 0 ? '#ff3b30' : '#4aa8ff'; g.beginPath(); g.moveTo(H.x * sc, H.z * sc - 7); g.lineTo(H.x * sc + 6, H.z * sc - 1); g.lineTo(H.x * sc + 4, H.z * sc - 1); g.lineTo(H.x * sc + 4, H.z * sc + 5); g.lineTo(H.x * sc - 4, H.z * sc + 5); g.lineTo(H.x * sc - 4, H.z * sc - 1); g.lineTo(H.x * sc - 6, H.z * sc - 1); g.closePath(); g.fill();
  (r.patrols || []).forEach(function (p) {                                /* gang patrols: their gang's colour, ringed in red */
    var G = GANGS.GANGS[p.gang]; g.fillStyle = G ? G.color : '#f33'; g.strokeStyle = '#ff2a2a'; g.lineWidth = 2;
    g.beginPath(); g.arc(p.x * sc, p.z * sc, p.kind === 'car' ? 5 : 4, 0, 7); g.fill(); g.stroke();
  });
  g.restore(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 7); g.lineTo(W / 2 + 5, W / 2 + 6); g.lineTo(W / 2 - 5, W / 2 + 6); g.closePath(); g.fill();
}

module.exports = { createRide: createRide, ensureRide: ensureRide };
