/* sim: ambient life. Autos, scooters, cars, buses and trucks drive the lanes (on the left); people walk the pavements; cows stand in the
   road; dogs trot about. They appear out of sight around the hero and go away when he is far. Deterministic: all randomness comes from world.rng.
   The bike can hit any of them: vehicles and cows are walls with a name, people and dogs are knocked over. No graphics here. */
'use strict';

var D = require('../data/traffic');
var CONFIG = require('../data/config');
var BIKE = require('../data/bike');
var S = CONFIG.CHUNK_SIZE;

function mod(a, n) { return ((a % n) + n) % n; }
function create() { return { list: [], nextId: 1, tick: 0 }; }

function pickKind(rng) {
  var tot = 0, i; for (i = 0; i < D.WEIGHTS.length; i++) tot += D.WEIGHTS[i][1];
  var r = rng.next() * tot; for (i = 0; i < D.WEIGHTS.length; i++) { r -= D.WEIGHTS[i][1]; if (r <= 0) return D.WEIGHTS[i][0]; }
  return 'auto';
}
function count(t, cls) { var n = 0, i; for (i = 0; i < t.list.length; i++) if (D.KINDS[t.list[i].kind].kind === cls) n++; return n; }

/* the road grid: east-west roads at z = 96*k (chunk rows divisible by 3), north-south roads at x = 32 + 96*k (columns = 1 mod 3) */
function roadsNear(x, z) {
  var out = [], cz0 = Math.round(z / S), cx0 = Math.round(x / S), k;
  for (k = -3; k <= 3; k++) {
    var cz = cz0 + k, cx = cx0 + k;
    if (mod(cz, 3) === 0) out.push({ axis: 'x', c: cz * S });
    if (mod(cx, 3) === 1) out.push({ axis: 'z', c: cx * S });
  }
  return out;
}

function spawnOne(t, world, cls) {
  var p = world.player, rng = world.rng, roads = roadsNear(p.x, p.z), i;
  if (!roads.length) return;
  var rd = roads[rng.int(0, roads.length - 1)], ang = rng.next() < 0.5 ? -1 : 1, d = rng.range(D.SPAWN_MIN, D.SPAWN_MAX) * ang;
  var along = (rd.axis === 'x' ? p.x : p.z) + d, e;
  if (cls === 'veh') {
    var kind = pickKind(rng), dir = rng.next() < 0.5 ? 1 : -1, lane;
    if (rd.axis === 'x') { lane = dir > 0 ? -3.0 : 3.0; e = { x: along, z: rd.c + lane, h: dir > 0 ? Math.PI / 2 : -Math.PI / 2 }; }
    else { lane = dir > 0 ? 3.0 : -3.0; e = { x: rd.c + lane, z: along, h: dir > 0 ? 0 : Math.PI }; }
    e.kind = kind; e.v = 0; e.axis = rd.axis; e.road = rd.c; e.dir = dir;
  } else if (cls === 'ped') {
    var side = rng.next() < 0.5 ? 1 : -1, off = side * rng.range(7.2, 7.9), dr = rng.next() < 0.5 ? 1 : -1;
    e = rd.axis === 'x' ? { x: along, z: rd.c + off, h: dr > 0 ? Math.PI / 2 : -Math.PI / 2 } : { x: rd.c + off, z: along, h: dr > 0 ? 0 : Math.PI };
    e.kind = 'ped'; e.v = D.KINDS.ped.speed * rng.range(0.7, 1.2); e.axis = rd.axis; e.road = rd.c; e.dir = dr; e.look = rng.int(0, 5);
  } else {
    var isCow = rng.next() < 0.55, off2 = isCow ? (rng.next() < 0.5 ? -1 : 1) * rng.range(1.5, 4.5) : (rng.next() < 0.5 ? -1 : 1) * rng.range(6.5, 8);
    e = rd.axis === 'x' ? { x: along, z: rd.c + off2, h: rng.range(-3, 3) } : { x: rd.c + off2, z: along, h: rng.range(-3, 3) };
    e.kind = isCow ? 'cow' : 'dog'; e.v = 0; e.axis = rd.axis; e.road = rd.c; e.dir = 1; e.look = rng.int(0, 2);
  }
  for (i = 0; i < t.list.length; i++) if (Math.hypot(t.list[i].x - e.x, t.list[i].z - e.z) < 9) return;
  e.id = t.nextId++; e.px = e.x; e.pz = e.z; e.ph = e.h; e.state = 'go'; e.t = 0; e.wait = 0; e.phase = rng.next() * 6.28; e.hit = 0; e.dx = 0; e.dz = 0;
  t.list.push(e);
}

function distToBody(e, x, z) {
  var K = D.KINDS[e.kind], hl = K.len / 2 - K.r, fx = Math.sin(e.h), fz = Math.cos(e.h), ax = x - e.x, az = z - e.z, u = Math.max(-hl, Math.min(hl, ax * fx + az * fz));
  return Math.hypot(ax - fx * u, az - fz * u);
}

/* something in the way, straight ahead and close? (vehicles stop; cows and other vehicles and the bike all count) */
function blocked(t, e, world) {
  var K = D.KINDS[e.kind], fx = Math.sin(e.h), fz = Math.cos(e.h), reach = K.len / 2 + 3.5 + e.v * 0.6, i, b = world.bike;
  function ahead(x, z, r) { var dx = x - e.x, dz = z - e.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); return along > K.len / 2 - 0.2 && along < reach + r && side < K.r + r + 0.5; }
  if (ahead(b.x, b.z, BIKE.RADIUS)) return 'bike';
  if (!world.mounted && ahead(world.player.x, world.player.z, 0.4)) return 'bike';
  for (i = 0; i < t.list.length; i++) { var o = t.list[i]; if (o === e || o.state === 'down') continue; var ok = D.KINDS[o.kind]; if (ok.kind === 'ped') continue; if (ahead(o.x, o.z, ok.r + ok.len / 2 * 0.5)) return 'thing'; }
  return null;
}

function step(t, world) {
  var p = world.player, rng = world.rng, dt = 1 / 60, i, e;
  t.tick++;
  if (t.tick % 20 === 0) {
    var cls = ['veh', 'ped', 'animal'][t.tick / 20 % 3 | 0];
    if (count(t, cls) < D.LIMITS[cls]) spawnOne(t, world, cls);
  }
  for (i = t.list.length - 1; i >= 0; i--) {
    e = t.list[i]; e.px = e.x; e.pz = e.z; e.ph = e.h; e.t++;
    if (Math.hypot(e.x - p.x, e.z - p.z) > D.DESPAWN) { t.list.splice(i, 1); continue; }
    var K = D.KINDS[e.kind], fx = Math.sin(e.h), fz = Math.cos(e.h);
    if (e.state === 'down') { e.hit -= dt; e.x += e.dx * dt; e.z += e.dz * dt; e.dx *= 0.9; e.dz *= 0.9; if (e.hit <= 0) e.state = 'go'; continue; }
    if (K.kind === 'veh') {
      var bl = blocked(t, e, world), target = bl ? 0 : K.speed;
      if (e.wait > 0) { e.wait -= dt; target = 0; }
      e.v += (target - e.v) * Math.min(1, (bl ? 3.5 : 0.9) * dt);
      if (bl === 'bike' && e.v < 1.2 && e.t % 90 === 0) world.bus.emit('npc:honk', { x: e.x, z: e.z, kind: e.kind });
      e.x += fx * e.v * dt; e.z += fz * e.v * dt;
    } else if (K.kind === 'ped') {
      e.x += fx * e.v * dt; e.z += fz * e.v * dt; e.phase += e.v * dt * 3.2;
      if (e.t % 400 === 0 && rng.next() < 0.35) { e.h += Math.PI; e.dir = -e.dir; }
    } else if (e.kind === 'dog') {
      var bd = Math.hypot(world.bike.x - e.x, world.bike.z - e.z);
      if (bd < 7 && Math.abs(world.bike.speed) > 3) { e.h = Math.atan2(e.x - world.bike.x, e.z - world.bike.z); e.v = 4.6; } else if (e.t % 150 === 0) { e.h += rng.range(-1.5, 1.5); e.v = rng.next() < 0.4 ? 0 : K.speed; }
      e.x += Math.sin(e.h) * e.v * dt; e.z += Math.cos(e.h) * e.v * dt; e.phase += e.v * dt * 4;
    }
  }
}

/* the bike against everything: vehicles and cows are walls (a named crash); people and dogs are knocked flying */
function collide(t, world) {
  var b = world.bike, i, e, bus = world.bus;
  if (world.mounted === false && Math.abs(b.speed) < 0.1) return;
  for (i = 0; i < t.list.length; i++) {
    e = t.list[i]; if (e.state === 'down') continue;
    if (Math.abs(e.x - b.x) > 6 || Math.abs(e.z - b.z) > 6) continue;
    var K = D.KINDS[e.kind], d = distToBody(e, b.x, b.z), need = BIKE.RADIUS + K.r;
    if (d >= need) continue;
    var nx = b.x - e.x, nz = b.z - e.z, nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    var fx = Math.sin(b.h), fz = Math.cos(b.h), into = Math.max(0, -(fx * nx + fz * nz) * b.speed);
    if (K.kind === 'veh' || e.kind === 'cow') {
      b.x += nx * (need - d); b.z += nz * (need - d);
      if (into > 1.5) {
        var hard = into > 9; b.speed *= hard ? 0.1 : (1 - 0.55 * Math.min(1, into / 9)); if (hard) b.crash = 0.9; else if (into > 4) b.crash = 0.3;
        e.v = 0; e.wait = 1.2; e.dx = 0; e.dz = 0;
        if (into > 3) bus.emit('ride:crash', { x: b.x, z: b.z, speed: into, hard: hard, with: e.kind });
        if (K.kind === 'veh') bus.emit('npc:honk', { x: e.x, z: e.z, kind: e.kind });
      }
    } else if (Math.abs(b.speed) > 2) {
      e.state = 'down'; e.hit = 2.5; e.dx = fx * b.speed * 0.5 + nx * 2; e.dz = fz * b.speed * 0.5 + nz * 2; b.speed *= e.kind === 'ped' ? 0.85 : 0.95;
      bus.emit('npc:bump', { x: e.x, z: e.z, kind: e.kind, speed: Math.abs(b.speed) });
    }
  }
}

module.exports = { create: create, step: step, collide: collide, roadsNear: roadsNear };
