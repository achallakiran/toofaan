/* sim: ride mode. Toofan on Bijli seen from above, crossing the city map to a trouble spot through two-way traffic.
   Stick left/right steers, forward accelerates, back (or Block) brakes; with nothing pressed the bike rolls to a stop.
   Hitting traffic fast throws him off: he tumbles, gets up and runs back to the bike (Excitebike style). No hearts are lost to traffic.
   Separate from the brawler world: nothing here touches sim/world.js or combat. */
'use strict';

var R = require('../data/ride');
var mapMod = require('./ridemap');
var GANGS = require('../data/gangs');
var rngMod = require('../core/rng');
var enc = require('./encounter');

var DT = 1 / 60;
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function headingOf(axis, dir) { return axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI); }

function placeVehicle(r, v) {
  var off = R.LANES[v.lane], h = headingOf(v.axis, v.dir), Lx = Math.cos(h), Lz = -Math.sin(h);      /* the driver's left: traffic keeps left */
  v.h = h;
  if (v.axis === 'x') { v.x = v.s + Lx * off; v.z = v.line + Lz * off; } else { v.x = v.line + Lx * off; v.z = v.s + Lz * off; }
}

/* routing at junctions, for traffic and the gang patrols alike: the roads form a closed grid whose outer roads are a ring, so nothing
   ever runs off the map. On the way to each junction a vehicle picks straight on or a turn (at the ring, where straight on would leave
   the city, it must turn; on the ring itself it may only turn inward). It turns where its own lane meets the new road's lane, so its
   position runs on unbroken; the heading turns at once and the view eases it round (hd). */
function laneAt(axis, line, dir, lane) { var h = headingOf(axis, dir), off = R.LANES[lane]; return axis === 'x' ? line - Math.sin(h) * off : line + Math.cos(h) * off; }
function route(r, v, rng) {
  var L = r.map.lines, n = L.length, k;
  if (!v.plan) {
    var Lj = null;
    for (k = 0; k < n; k++) { var d = (L[k] - v.s) * v.dir; if (d > R.HALF + 0.5 && (Lj === null || d < (Lj - v.s) * v.dir)) Lj = L[k]; }
    if (Lj === null) { v.dir = -v.dir; return; }                                 /* (never on the closed grid; a guard) */
    var straight = v.dir > 0 ? Lj !== L[n - 1] : Lj !== L[0], turns = [];
    if (v.line !== L[n - 1]) turns.push(1); if (v.line !== L[0]) turns.push(-1);
    var d2 = straight && (rng.next() < 0.6 || !turns.length) ? 0 : turns[Math.floor(rng.next() * turns.length)];
    var na = v.axis === 'x' ? 'z' : 'x';
    v.plan = { Lj: Lj, d2: d2, at: d2 ? laneAt(na, Lj, d2, v.lane) : 0 };
  }
  var P = v.plan;
  if (!P.d2) { if ((v.s - P.Lj) * v.dir > R.HALF) v.plan = null; return; }
  if ((v.s - P.at) * v.dir >= 0) {
    var sNew = v.axis === 'x' ? v.z : v.x;
    v.axis = v.axis === 'x' ? 'z' : 'x'; v.line = P.Lj; v.dir = P.d2; v.s = sNew; v.plan = null; placeVehicle(r, v);
  }
}
function easeHeading(v) { if (v.hd === undefined) v.hd = v.h; v.hd += Math.atan2(Math.sin(v.h - v.hd), Math.cos(v.h - v.hd)) * 0.16; }
/* a place along a road inside the ring, clear of the junction boxes */
function inRing(r, s0) { var L = r.map.lines, lo = L[0] + R.HALF + 2, hi = L[L.length - 1] - R.HALF - 2; return Math.max(lo, Math.min(hi, s0)); }

function spawnVehicle(r, awayFrom) {
  var rng = r.rng, tries = 0, v;
  do {
    var tot = 0, i, pick = R.WEIGHTS[0][0], roll;
    for (i = 0; i < R.WEIGHTS.length; i++) tot += R.WEIGHTS[i][1];
    roll = rng.next() * tot; for (i = 0; i < R.WEIGHTS.length; i++) { roll -= R.WEIGHTS[i][1]; if (roll <= 0) { pick = R.WEIGHTS[i][0]; break; } }
    var K = R.KINDS[pick];
    v = { id: r.nextId, kind: pick, look: Math.floor(rng.next() * 4), axis: rng.next() < 0.5 ? 'x' : 'z', line: r.map.lines[Math.floor(rng.next() * R.GRID)],
          dir: rng.next() < 0.5 ? 1 : -1, lane: rng.next() < (pick === 'bus' || pick === 'truck' ? 0.2 : 0.5) ? 0 : 1, s: (rng.next() * 2 - 1) * r.map.ext,
          vmax: K.speed[0] + rng.next() * (K.speed[1] - K.speed[0]), v: 0, wait: 0, x: 0, z: 0, px: 0, pz: 0, h: 0, ph: 0 };
    v.s = inRing(r, v.s); placeVehicle(r, v); tries++;
  } while (awayFrom && Math.hypot(v.x - awayFrom.x, v.z - awayFrom.z) < R.VIEW_R && tries < 30);
  v.v = v.vmax * 0.8; v.px = v.x; v.pz = v.z; v.ph = v.h; r.nextId++;
  return v;
}

function createRide(seed, bus) {
  var r = {
    seed: seed, tick: 0, bus: bus || { emit: function () {} }, rng: rngMod.createRng((seed >>> 0) ^ 0x7a11),
    map: mapMod.generate(seed),
    bike: { x: 0, z: 0, px: 0, pz: 0, h: Math.PI / 2, ph: Math.PI / 2, speed: 0, turn: 0, grace: 0 },
    hero: { x: 0, z: 0, px: 0, pz: 0, vx: 0, vz: 0, face: 0, spin: 0 },
    state: 'ride', t: 0,                    /* ride | fly | run | arrived */
    traffic: [], nextId: 1,
    missions: {}, target: null, arrivals: 0, crashes: 0,
    hearts: 3, enc: null, encCool: R.ENC.FIRST, nextEnc: 'bikes',
    patrols: [], patrolCool: 120, prng: rngMod.createRng((seed >>> 0) ^ 0x9a7e), trng: rngMod.createRng((seed >>> 0) ^ 0x7a11), chases: {}
  };
  /* start on the middle east-west road, heading east in the outer left lane */
  var mid = r.map.lines[Math.floor(R.GRID / 2)];
  r.bike.x = r.bike.px = -40; r.bike.z = r.bike.pz = mid - R.LANES[1];
  r.map.targets.forEach(function (t) { r.missions[t.key] = 'open'; });
  for (var i = 0; i < R.TRAFFIC; i++) r.traffic.push(spawnVehicle(r, r.bike));
  pickTarget(r);
  return r;
}

/* the next signal: the nearest open trouble spot */
function pickTarget(r) {
  var best = null, bd = 1e9;
  var others = r.map.targets.some(function (t) { return r.missions[t.key] === 'open' && t.key !== r.skipped; });
  r.map.targets.forEach(function (t) {
    if (r.missions[t.key] !== 'open') return;
    if (others && t.key === r.skipped) return;                      /* a place he rode away from waits until the next one is done */
    var d = Math.hypot(t.x - r.bike.x, t.z - r.bike.z); if (d < bd) { bd = d; best = t; }
  });
  r.target = best;
  if (best) r.bus.emit('ride:signal', { key: best.key, name: best.name });
  return best;
}

/* gang patrols: a pack of bike goons or the gang car, driving the roads of their gang's area (keeping left like everyone), turning at
   junctions now and then. They never come for him: riding up close to one starts that road fight. Up to three at a time. */
var PATROLS = 3, PATROL_SPEED = 7.5, CHASE_R = 15;
function spawnPatrol(r) {
  var rng = r.prng, open = r.map.targets.filter(function (t) { return r.missions[t.key] !== 'cleared'; });
  if (!open.length) open = r.map.targets;
  var T = open[Math.floor(rng.next() * open.length)], kind = r.patrols.filter(function (q) { return q.kind === 'car'; }).length ? 'bikes' : (rng.next() < 0.5 ? 'car' : 'bikes');
  var axis = rng.next() < 0.5 ? 'x' : 'z', line = mapMod.nearestLine(axis === 'x' ? T.z : T.x), s0 = (axis === 'x' ? T.x : T.z) + (rng.next() - 0.5) * 50;
  var p = { id: 'p' + (r.nextId++), kind: kind, gang: GANGS.gangOf(T.key), axis: axis, line: line, dir: rng.next() < 0.5 ? 1 : -1, lane: 1, s: inRing(r, s0), x: 0, z: 0, px: 0, pz: 0, h: 0, ph: 0 };
  placeVehicle(r, p); p.px = p.x; p.pz = p.z; p.ph = p.h;
  if (Math.hypot(p.x - r.bike.x, p.z - r.bike.z) < 60) return null;                    /* never pops up right beside him */
  return p;
}
function stepPatrols(r) {
  var b = r.bike, i;
  if (r.patrols.length < PATROLS && --r.patrolCool <= 0) { var np = spawnPatrol(r); if (np) r.patrols.push(np); r.patrolCool = 240; }
  for (i = 0; i < r.patrols.length; i++) {
    var p = r.patrols[i];
    p.px = p.x; p.pz = p.z; p.ph = p.hd !== undefined ? p.hd : p.h;
    p.s += p.dir * PATROL_SPEED * DT; route(r, p, r.prng); placeVehicle(r, p); easeHeading(p);      /* the roads like all traffic, turning at junctions */
  }
  /* he rides up to one: the chase is on */
  for (i = 0; i < r.patrols.length; i++) {
    var q = r.patrols[i];
    if (Math.hypot(q.x - b.x, q.z - b.z) < CHASE_R && Math.hypot(r.map.home.x - b.x, r.map.home.z - b.z) > 30 && enc.canStart(r)) {   /* (never on his own doorstep) */
      r.patrols.splice(i, 1); r.patrolCool = 600; r.chases[q.gang] = (r.chases[q.gang] || 0) + 1;
      enc.start(r, q.kind, q.gang); r.bus.emit('ride:chase', { kind: q.kind, gang: q.gang }); return;
    }
  }
}

/* the player picked a place on the full map: it becomes the signal (if it is still open) */
function chooseTarget(r, key) {
  if (key === 'mansion' && r.map.mansion) { if (r.state !== 'ride' || r.enc) return false; r.target = r.map.mansion; r.skipped = null; r.tKey = null; r.bus.emit('ride:signal', { key: 'mansion', name: r.map.mansion.name, chosen: true }); return true; }
  if (key === 'home') { if (r.state !== 'ride' || r.enc) return false; r.target = r.map.home; r.skipped = null; r.tKey = null; r.bus.emit('ride:signal', { key: 'home', name: r.map.home.name, chosen: true }); return true; }
  var T = r.map.targets.filter(function (t) { return t.key === key; })[0];
  if (!T || r.missions[key] !== 'open' || r.state !== 'ride' || r.enc) return false;
  r.target = T; r.skipped = null; r.tKey = null; r.bus.emit('ride:signal', { key: T.key, name: T.name, chosen: true }); return true;
}

function stepTraffic(r) {
  var list = r.traffic, i, j;
  for (i = 0; i < list.length; i++) {
    var v = list[i]; v.px = v.x; v.pz = v.z; v.ph = v.h;
    if (v.wait > 0) { v.wait--; v.v = 0; continue; }
    var want = v.vmax, ahead = 1e9;
    for (j = 0; j < list.length; j++) {                                    /* keep a gap to the vehicle in front in the same lane */
      if (j === i) continue; var o = list[j];
      if (o.axis !== v.axis || o.line !== v.line || o.dir !== v.dir || o.lane !== v.lane) continue;
      var d = (o.s - v.s) * v.dir; if (d > 0 && d < ahead) ahead = d;
    }
    var gap = ahead - (R.KINDS[v.kind].len + 3);
    if (gap < 8) want = Math.min(want, Math.max(0, gap) * 1.2);
    /* junctions: wait while crossing traffic is inside the box */
    var jl = mapMod.nearestLine(v.s + v.dir * (R.HALF + 2.5)), dj = (jl - v.s) * v.dir;
    if (dj > R.HALF && dj < R.HALF + 3.5) {
      for (j = 0; j < list.length; j++) {
        var c = list[j]; if (c.axis === v.axis) continue;
        if (Math.abs((v.axis === 'x' ? c.x : c.z) - jl) < R.HALF + 1 && Math.abs((v.axis === 'x' ? c.z : c.x) - v.line) < R.HALF + 1) { want = 0; break; }
      }
    }
    /* make way for the bike right in front */
    var bdx = r.bike.x - v.x, bdz = r.bike.z - v.z, fwd = bdx * Math.sin(v.h) + bdz * Math.cos(v.h), lat = Math.abs(bdx * Math.cos(v.h) - bdz * Math.sin(v.h));
    if (fwd > 0 && fwd < R.KINDS[v.kind].len / 2 + 4 && lat < 1.6) want = Math.min(want, 1);
    v.v += Math.max(-8 * DT, Math.min(3 * DT, want - v.v));
    v.s += v.dir * v.v * DT;
    route(r, v, r.trng);
    if (Math.hypot(v.x - r.bike.x, v.z - r.bike.z) > 230) { list[i] = spawnVehicle(r, r.bike); continue; }   /* far away: a new one nearer, out of sight */
    placeVehicle(r, v); easeHeading(v);
  }
}

/* bike circle against a vehicle's body line; returns the push-out vector or null */
function hitVehicle(r, v, x, z) {
  var K = R.KINDS[v.kind], fx = Math.sin(v.h), fz = Math.cos(v.h), half = Math.max(0, K.len / 2 - K.r);
  var dx = x - v.x, dz = z - v.z, t = Math.max(-half, Math.min(half, dx * fx + dz * fz));
  var cx = v.x + fx * t, cz = v.z + fz * t, ex = x - cx, ez = z - cz, d = Math.hypot(ex, ez), min = K.r + R.BIKE_R;
  if (d >= min) return null;
  if (d < 1e-4) { ex = Math.cos(v.h); ez = -Math.sin(v.h); d = 1; }
  return { x: ex / d * (min - d), z: ez / d * (min - d) };
}

function step(r, input) {
  var s = input.state, b = r.bike, hero = r.hero, i;
  b.px = b.x; b.pz = b.z; b.ph = b.h; hero.px = hero.x; hero.pz = hero.z;
  if (r.state === 'enc') { enc.step(r, input); if (r.needPick && r.state === 'ride') { r.needPick = false; pickTarget(r); } r.tick++; return; }
  r.t++;
  stepTraffic(r);

  if (r.state === 'ride') {
    /* stick left/right steers; stick forward (or W) is the throttle; stick back (or S) and Block brake. Nothing pressed: she rolls to a stop. */
    /* one-thumb driving: push the stick any way except back and she goes (harder = faster); its left/right part steers;
       pull it back to brake (and, once stopped, reverse). Block also brakes. Letting go of steering lines her up with the road. */
    var mx = s.mx, my = s.my, mag = Math.min(1, Math.hypot(mx, my)), back = my < -0.35;
    var thr = back ? 0 : mag, brk = back ? -my : 0;
    if (s.held.block) { brk = 1; thr = 0; }
    var steer = Math.abs(mx) > 0.15 ? mx : 0, rate = R.TURN * DT * Math.min(1, 0.25 + Math.abs(b.speed) / 8);
    b.turn = steer ? -steer * rate : b.turn * 0.7;                         /* right lowers the heading */
    b.h += b.turn * (b.speed < 0 ? -1 : 1);
    if (!steer && Math.abs(b.speed) > 2) {                                  /* lane assist: settle onto the nearest road direction */
      var axisH = Math.round(b.h / (Math.PI / 2)) * (Math.PI / 2), off = angDiff(axisH, b.h);
      if (Math.abs(off) < 0.5) b.h += off * Math.min(1, 3.5 * DT);
    }
    if (thr > 0.15) { var tgt = R.TOP * thr; b.speed = b.speed < tgt ? Math.min(tgt, b.speed + R.ACCEL * thr * DT) : Math.max(tgt, b.speed - R.COAST * DT); }
    else if (brk > 0.15) b.speed = b.speed > 0 ? Math.max(0, b.speed - R.BRAKE * brk * DT) : Math.max(-R.REVERSE, b.speed - 2 * brk * DT);
    else b.speed = b.speed > 0 ? Math.max(0, b.speed - R.COAST * DT) : Math.min(0, b.speed + R.COAST * DT);
    if (b.grace > 0) b.grace--;
    /* move, sliding along buildings, poles and trees instead of going through them */
    var nx = b.x + Math.sin(b.h) * b.speed * DT, nz = b.z + Math.cos(b.h) * b.speed * DT;
    function free(px, pz) { return mapMod.onRoad(px, pz, R.BIKE_R) && mapMod.clearOfProps(r.map, px, pz, R.BIKE_R); }
    if (free(nx, nz)) { b.x = nx; b.z = nz; }
    else if (free(nx, b.z)) { b.x = nx; b.speed *= 0.97; }
    else if (free(b.x, nz)) { b.z = nz; b.speed *= 0.97; }
    else { if (Math.abs(b.speed) > 4) r.bus.emit('ride:wall', { speed: b.speed }); b.speed *= 0.3; }
    /* traffic */
    for (i = 0; i < r.traffic.length; i++) {
      var v = r.traffic[i], push = hitVehicle(r, v, b.x, b.z); if (!push) continue;
      b.x += push.x; b.z += push.z;
      if (b.speed > R.CRASH_SPEED && b.grace <= 0) {
        r.state = 'fly'; r.t = 0; r.crashes++;
        hero.x = b.x; hero.z = b.z; hero.px = hero.x; hero.pz = hero.z; hero.vx = Math.sin(b.h) * b.speed * 0.55 + push.x * 4; hero.vz = Math.cos(b.h) * b.speed * 0.55 + push.z * 4; hero.face = b.h; hero.spin = 0;
        b.slide = b.speed * 0.5; b.speed = 0; v.wait = 50;
        r.bus.emit('ride:crash', { x: b.x, z: b.z, kind: v.kind });
        break;
      }
      b.speed = Math.min(b.speed, 2); r.bus.emit('ride:bump', { kind: v.kind });
    }
    /* arrival */
    var T = r.target;
    /* riding away from the signal leaves it open for later: once he is well past his closest approach, the pointer moves on */
    if (r.state === 'ride' && T && !r.enc && T.key !== 'home' && T.key !== 'mansion') {
      var dT = Math.hypot(T.x - b.x, T.z - b.z);
      if (r.tKey !== T.key) { r.tKey = T.key; r.tBest = dT; }
      else if (dT < r.tBest) r.tBest = dT;
      else if (dT > r.tBest + R.ABANDON) { r.skipped = T.key; r.tKey = null; pickTarget(r); r.bus.emit('ride:abandon', { key: T.key, name: T.name, next: r.target && r.target.name }); T = r.target; }
    }
    var atHome = inHomeZone(r, b.x, b.z), Gt = homeGate(r), dG = Math.hypot(Gt.x - b.x, Gt.z - b.z);
    if (r.homeArmed === false && dG > GATE_R + 6) r.homeArmed = true;               /* (just out of the shop: not again until he has ridden off) */
    r.atGate = atHome && r.state === 'ride' && !r.enc;
    if (r.state === 'ride' && !r.enc && r.homeArmed !== false && atHome && (Math.abs(b.speed) < GATE_STOP || (T && T.key === 'home'))) {  /* home: the shop is always a place he can ride in to, signal or not */
      r.state = 'arrived'; r.t = 0; b.speed = 0; r.target = null; r.atHome = true; r.bus.emit('ride:home', {}); return;
    }
    if (r.state === 'ride' && T && T.key !== 'home' && T.key !== 'mansion' && Math.hypot(T.x - b.x, T.z - b.z) < R.ARRIVE_R) {   /* (home is its own gate, above) */
      r.state = 'arrived'; r.t = 0; b.speed = 0; r.missions[T.key] = 'active'; r.arrivals++; r.skipped = null;
      r.bus.emit('ride:arrive', { key: T.key, name: T.name });
    }
    /* road fights only when Toofan chooses one: the gang patrols drive their roads; ride up to one and the chase is on */
    if (r.state === 'ride' && !r.enc) stepPatrols(r);
    if (r.state === 'ride' && !r.enc) stepMansion(r);
  } else if (r.state === 'fly') {                                     /* thrown off: he tumbles along the road, the bike skids to a stop */
    hero.x += hero.vx * DT; hero.z += hero.vz * DT; hero.vx *= 0.94; hero.vz *= 0.94; hero.spin += 0.25 * Math.max(0, 1 - r.t / R.FLY_TICKS);
    if (!mapMod.onRoad(hero.x, hero.z, 0.3)) { hero.x = hero.px; hero.z = hero.pz; hero.vx = hero.vz = 0; }
    if (b.slide > 0) { var sx = b.x + Math.sin(b.h) * b.slide * DT, sz = b.z + Math.cos(b.h) * b.slide * DT; if (mapMod.onRoad(sx, sz, R.BIKE_R)) { b.x = sx; b.z = sz; } b.slide = Math.max(0, b.slide - 18 * DT); }
    if (r.t >= R.FLY_TICKS) { r.state = 'run'; r.t = 0; r.bus.emit('ride:getup', {}); }
  } else if (r.state === 'run') {                                     /* back on his feet, he runs to Bijli */
    var dx = b.x - hero.x, dz = b.z - hero.z, d = Math.hypot(dx, dz);
    if (d < 0.6) { r.state = 'ride'; r.t = 0; b.speed = 0; b.grace = R.GRACE_TICKS; r.bus.emit('ride:remount', {}); }
    else { var st = Math.min(d, R.RUN_SPEED * DT); hero.x += dx / d * st; hero.z += dz / d * st; hero.face = Math.atan2(dx, dz); }
  } else if (r.state === 'arrived') {
    /* until the fight link exists (M4) the ride carries on to the next signal after a pause */
    /* Toofan waits here: the game steps into the fight area (the brawler) and comes back with the area cleared */
  }
  r.tick++;
}

/* the old mansion's gate: locked until every gang's boss is beaten (r.bosses: the gangs whose boss he has beaten, set from the save).
   Riding up to the locked gate only says so; once it is open, riding up to it is the way in. */
var MANSION_R = 6;
function mansionOpen(r) { var b = r.bosses || []; return GANGS.ORDER.every(function (g) { return b.indexOf(g) >= 0; }); }
function stepMansion(r) {
  var M = r.map.mansion, b = r.bike; if (!M) return;
  var d = Math.hypot(M.gate.x - b.x, M.gate.z - b.z);
  if (d > MANSION_R + 14) r.mansionSaid = false;
  if (d < MANSION_R && !r.mansionSaid) { r.mansionSaid = true; if (r.target === M) { r.target = null; pickTarget(r); } r.bus.emit(mansionOpen(r) ? 'ride:mansion' : 'ride:locked', { name: M.name, left: GANGS.ORDER.filter(function (g) { return (r.bosses || []).indexOf(g) < 0; }) }); }
}

/* the shop's gate: the blue ring on the near lane in front of the shop. He goes in when he comes to a stop inside it (or rides into it
   after signalling HOME); riding past on the road, even through it at speed, never takes him in. */
var GATE_R = 4.2, GATE_STOP = 4.5;
function homeGate(r) { var H = r.map.home; return { x: H.x, z: mapMod.nearestLine(H.z) + R.LANES[1] }; }
function inHomeZone(r, x, z) { var G = homeGate(r); return Math.hypot(x - G.x, z - G.z) < GATE_R; }
/* out of the hideout: Bijli on the road in front of the cycle-repair shop, in the near (left) lane, ready to ride */
function leaveHome(r) {
  var H = r.map.home, b = r.bike, line = mapMod.nearestLine(H.z), h = -Math.PI / 2;      /* heading west: his left is the shop's side */
  b.h = b.ph = h; b.x = b.px = H.x - 4; b.z = b.pz = line + R.LANES[1]; b.speed = 0; b.turn = 0;
  r.state = 'ride'; r.t = 0; r.enc = null; r.homeArmed = false; r.atHome = false; if (!r.target || r.target.key === 'home') { r.target = null; pickTarget(r); }
}

/* back from a cleared trouble spot: Toofan is on Bijli on the road beside it while the police take the goons away */
function afterFight(r, key) {
  var T = r.map.targets.filter(function (t) { return t.key === key; })[0] || r.target; if (!T) return;
  r.missions[key] = 'cleared';
  var lz = mapMod.nearestLine(T.z), lx = mapMod.nearestLine(T.x), xRoad = Math.abs(T.z - lz) < Math.abs(T.x - lx), b = r.bike;
  if (xRoad) { b.h = T.z < lz ? Math.PI / 2 : -Math.PI / 2; b.x = T.x - Math.sin(b.h) * 6; b.z = lz; }
  else { b.h = T.x > lx ? 0 : Math.PI; b.x = lx; b.z = T.z - Math.cos(b.h) * 6; }
  b.px = b.x; b.pz = b.z; b.ph = b.h; b.speed = 0; r.state = 'ride'; r.target = T;
  enc.start(r, 'arrest');
}

function hash(r) {
  var h = 2166136261 >>> 0;
  function mix(n) { h ^= (Math.round(n * 1000) | 0); h = Math.imul(h, 16777619) >>> 0; }
  mix(r.bike.x); mix(r.bike.z); mix(r.bike.h); mix(r.bike.speed); mix(r.hero.x); mix(r.tick); mix(r.crashes); mix(r.arrivals); mix(r.hearts); mix(r.enc ? r.enc.t : -1);
  r.traffic.forEach(function (v) { mix(v.x); mix(v.z); mix(v.v); });
  return h >>> 0;
}

module.exports = { mansionOpen: mansionOpen, leaveHome: leaveHome, inHomeZone: inHomeZone, homeGate: homeGate, chooseTarget: chooseTarget, afterFight: afterFight, startEncounter: enc.start, createRide: createRide, step: step, pickTarget: pickTarget, hash: hash, hitVehicle: hitVehicle };
