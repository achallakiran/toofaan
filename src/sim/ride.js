/* sim: ride mode. Toofan on Bijli seen from above, crossing the city map to a trouble spot through two-way traffic.
   Stick left/right steers, forward accelerates, back (or Block) brakes; with nothing pressed the bike rolls to a stop.
   Hitting traffic fast throws him off: he tumbles, gets up and runs back to the bike (Excitebike style). No hearts are lost to traffic.
   Separate from the brawler world: nothing here touches sim/world.js or combat. */
'use strict';

var R = require('../data/ride');
var mapMod = require('./ridemap');
var rngMod = require('../core/rng');

var DT = 1 / 60;
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function headingOf(axis, dir) { return axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI); }

function placeVehicle(r, v) {
  var off = R.LANES[v.lane], h = headingOf(v.axis, v.dir), Lx = Math.cos(h), Lz = -Math.sin(h);      /* the driver's left: traffic keeps left */
  v.h = h;
  if (v.axis === 'x') { v.x = v.s + Lx * off; v.z = v.line + Lz * off; } else { v.x = v.line + Lx * off; v.z = v.s + Lz * off; }
}

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
    placeVehicle(r, v); tries++;
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
    missions: {}, target: null, arrivals: 0, crashes: 0
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
  r.map.targets.forEach(function (t) {
    if (r.missions[t.key] !== 'open') return;
    var d = Math.hypot(t.x - r.bike.x, t.z - r.bike.z); if (d < bd) { bd = d; best = t; }
  });
  r.target = best;
  if (best) r.bus.emit('ride:signal', { key: best.key, name: best.name });
  return best;
}

function stepTraffic(r) {
  var list = r.traffic, i, j, E = r.map.ext;
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
    if (Math.abs(v.s) > E + 4) { list[i] = spawnVehicle(r, r.bike); continue; }          /* off the map: a new one appears out of sight */
    placeVehicle(r, v);
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
  r.t++;
  stepTraffic(r);

  if (r.state === 'ride') {
    /* stick left/right steers; stick forward (or W) is the throttle; stick back (or S) and Block brake. Nothing pressed: she rolls to a stop. */
    var mx = s.mx, my = s.my, thr = Math.max(0, my), brk = Math.max(0, -my);
    if (s.held.block) brk = 1;
    var rate = R.TURN * DT * Math.min(1, 0.25 + Math.abs(b.speed) / 8);
    b.turn = Math.abs(mx) > 0.15 ? -mx * rate : b.turn * 0.7;                 /* right lowers the heading */
    b.h += b.turn * (b.speed < 0 ? -1 : 1);
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
      b.speed = Math.min(b.speed, 2); v.wait = Math.max(v.wait, 20); r.bus.emit('ride:bump', { kind: v.kind });
    }
    /* arrival */
    var T = r.target;
    if (r.state === 'ride' && T && Math.hypot(T.x - b.x, T.z - b.z) < R.ARRIVE_R) {
      r.state = 'arrived'; r.t = 0; b.speed = 0; r.missions[T.key] = 'active'; r.arrivals++;
      r.bus.emit('ride:arrive', { key: T.key, name: T.name });
    }
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
    if (r.t > 180) { r.state = 'ride'; r.t = 0; pickTarget(r); }
  }
  r.tick++;
}

function hash(r) {
  var h = 2166136261 >>> 0;
  function mix(n) { h ^= (Math.round(n * 1000) | 0); h = Math.imul(h, 16777619) >>> 0; }
  mix(r.bike.x); mix(r.bike.z); mix(r.bike.h); mix(r.bike.speed); mix(r.hero.x); mix(r.tick); mix(r.crashes); mix(r.arrivals);
  r.traffic.forEach(function (v) { mix(v.x); mix(v.z); mix(v.v); });
  return h >>> 0;
}

module.exports = { createRide: createRide, step: step, pickTarget: pickTarget, hash: hash, hitVehicle: hitVehicle };
