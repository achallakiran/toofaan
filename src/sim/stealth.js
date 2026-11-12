/* sim: the stealth stage (a manhunt in Antu's container yard at night). Toofan alone, no fighting: he keeps to the dark and behind
   cover, knocks men out from behind, and climbs to the head sniper to take him down. Plain data, seeded and fixed-step; no graphics.

   THE RULES
     Moving     the stick walks him at the fights' pace, relative to the camera, which swings round behind him as he heads away from
                it (up-left / up-right turn the view; straight left / right sidestep); Block toggles crouch (2.0 m/s, lower behind cover, quieter, harder to see).
     Light      in a floodlight pool he is seen from much further; in the dark, far less. Crouching shrinks it again.
     Sight      every watcher has a view cone and a range. Sight lines are 2.5D: a box blocks it if the line passes below its top, so a
                crouched man behind a crate is hidden from a man on the ground but not from a sniper up on a tower; a container hides
                him from everyone.
     Spotting   a watcher who sees him fills his suspicion (a man on foot in about half a second, a sniper almost at once). Full: he
                is SPOTTED - a red laser locks on. Break the sight line within LOCK seconds (behind a container, out of range) and the
                shot never comes; he searches where he last saw him, then goes back to his round. Hold it and he fires.
     Shots      two hits and Toofan is down: the stage restarts from the last checkpoint he passed (the men he knocked out stay out).
     Noise      walking upright close to a man on foot makes him turn to look.
     Takedown   Attack within 3 m of a man from behind (and not locked on him): a quick lunge in, a chop to the neck, out for good.
     Ladders    at the foot of a ladder (or at its top) Attack climbs it - up the backs of the sniper towers and the office.
     Goal       up the stairs onto the site office roof, behind the head sniper (who glances back now and then), and take him down. */
'use strict';

var M = require('./stealthmap');
var CONFIG = require('../data/config');

var TPS = 60, DT = 1 / TPS;
var WALK = CONFIG.PLAYER.walkSpeed, SNEAK = 2.0, R = 0.34, CLIMB = 2.4;          /* walking at the fights' own pace */
var LOCK = 1.0, REFIRE = 0.85, LOSE = 0.3, SEARCH = 2.6;
var VIEW_TURN = 1.7, REACH = 3.0, STRIKE = 0.85, TAKEDOWN = 1.1, FAIL_WAIT = 2.2, LADDER_R = 1.0;   /* takedown: from up to 3 m he lunges in, then the chop */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }

/* the places he can stand up off the ground, and whether a point is on the roof or the stairs */
var PLAT = {}; M.PLATFORMS.forEach(function (q) { PLAT[q.id] = q; });
function onPlat(id, x, z) { var q = PLAT[id]; return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1; }
function onRoof(x, z) { return onPlat('office', x, z); }
function onStairs(x, z) { var S = M.STAIRS; return x >= S.x0 && x <= S.x1 && z >= S.z0 && z <= S.z1; }
function stairY(x) { var S = M.STAIRS; return clamp((S.x1 - x) / (S.x1 - S.x0), 0, 1) * S.top; }

function create(opts) {
  opts = opts || {};
  var st = {
    tick: 0, t: 0, bus: opts.bus || { emit: function () {} }, solids: M.solids(),
    player: { x: M.START.x, z: M.START.z, px: M.START.x, pz: M.START.z, face: M.START.face, y: 0, up: false, plat: null, climb: null, crouch: false, moving: false, hits: 0, act: null, light: 0, seen: 0, flash: 0 },
    watchers: [], checkpoint: 0, state: 'play', failT: 0, stunned: 0, alarms: 0,
    view: M.START.face                 /* the way the camera looks (it swings round behind him as he goes; the stick is relative to it) */
  };
  M.TOWERS.forEach(function (T) { var w = watcher('sniper', T.id, T.x, T.z, T.h + 1.5, T.face, T.sweep, T.range); w.plat = T.id; w.every = T.glance; w.glance = T.glance; st.watchers.push(w); });
  var B = M.BOSS, b = watcher('boss', B.id, B.x, B.z, M.OFFICE.h + 1.5, B.face, B.sweep, B.range); b.plat = 'office'; b.every = B.glance; b.glance = B.glance; st.watchers.push(b);
  M.PATROLS.forEach(function (Pt, i) {
    var w = watcher('guard', 'G' + i, Pt.path[0][0], Pt.path[0][1], 1.6, 0, null, 10); w.kind = Pt.kind; w.path = Pt.path; w.wait = Pt.wait; w.wp = 1; w.pause = 0;
    w.face = Math.atan2(Pt.path[1][0] - Pt.path[0][0], Pt.path[1][1] - Pt.path[0][1]); st.watchers.push(w);
  });
  st.watchers.forEach(function (w) { w.home = { x: w.x, z: w.z, face: w.face, wp: w.wp }; });
  return st;
}
function watcher(type, id, x, z, eye, face, sweep, range) {
  return { type: type, id: id, x: x, z: z, px: x, pz: z, eye: eye, base: face, face: face, sweep: sweep, range: range, phase: 0,
    st: 'watch', sus: 0, lockT: 0, loseT: 0, searchT: 0, last: null, look: 0, aim: null, fired: 0, outT: 0, moving: false, glance: 0 };
}

/* the 2.5D sight line from (ax, az) at height ay to (bx, bz) at height by: blocked by any box it passes under the top of */
function blocked(st, ax, az, ay, bx, bz, by, own) {
  var S = st.solids, dx = bx - ax, dz = bz - az, i;
  for (i = 0; i < S.length; i++) {
    var q = S[i]; if (own && q.own === own) continue;
    var t0 = 0, t1 = 1, u, v, w;
    if (Math.abs(dx) < 1e-9) { if (ax < q.x0 || ax > q.x1) continue; } else { u = (q.x0 - ax) / dx; v = (q.x1 - ax) / dx; if (u > v) { w = u; u = v; v = w; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) continue; }
    if (Math.abs(dz) < 1e-9) { if (az < q.z0 || az > q.z1) continue; } else { u = (q.z0 - az) / dz; v = (q.z1 - az) / dz; if (u > v) { w = u; u = v; v = w; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) continue; }
    if (t1 >= 0.999 && t0 >= 0.999) continue;
    var lo = Math.min(ay + (by - ay) * t0, ay + (by - ay) * Math.min(t1, 0.999));
    if (q.y1 > lo) return true;
  }
  return false;
}
/* how much light he stands in: 1 in a floodlight pool (softened at the rim), 0.28 in the dark */
function lightAt(x, z) {
  var best = 0.28, i, L;
  for (i = 0; i < M.LIGHTS.length; i++) { L = M.LIGHTS[i]; var d = Math.hypot(x - L[0], z - L[1]); if (d < L[2]) best = Math.max(best, d < L[2] - 1 ? 1 : 0.28 + 0.72 * (L[2] - d)); }
  return best;
}
function headY(p) { return p.y + (p.crouch ? 1.0 : 1.6); }

/* can this watcher see him right now, and how close is he to the edge of the view (0 at the edge .. 1 right in front)? */
function sees(st, w, p, locked) {
  if (w.st === 'out' || w.st === 'stunned') return 0;
  var dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz);
  var same = !!w.plat && p.plat === w.plat;                    /* up on his own roof or deck with him */
  var range = w.range * (0.35 + 0.65 * p.light) * (p.crouch ? (w.type === 'guard' ? 0.62 : 0.8) : 1);
  if (same) range = 8;
  if (locked) range = Math.max(range, w.range * 0.9);
  if (d > range) return 0;
  if (!locked) {
    var half = w.type === 'guard' ? 0.8 : same ? 0.9 : 0.24;
    var a = Math.abs(angDiff(Math.atan2(dx, dz), w.face));
    if (a > half && !(w.type === 'guard' && d < 1.1 && a < 1.7)) return 0;
  }
  if (w.plat && !p.plat && p.y < 1 && d < (w.type === 'boss' ? 4.5 : 3)) return 0;   /* nobody up high sees straight down past his own edge */
  if (w.type === 'guard' && p.plat) return 0;
  if (blocked(st, w.x, w.z, w.eye, p.x, p.z, headY(p), w.id)) return 0;
  return 1 - d / (range + 0.01) * 0.6;
}

function stepPlayer(st, inp) {
  var p = st.player, s = inp.state; p.px = p.x; p.pz = p.z;
  if (s.pressed.block) { p.crouch = !p.crouch; st.bus.emit('st:crouch', { on: p.crouch }); }
  if (p.act) {
    var A = p.act; p.moving = false;
    if (A.lunge > 0 && A.lt < A.lunge) {                                 /* the lunge: a quick low rush in behind him */
      A.lt = Math.min(A.lunge, A.lt + DT); var k = A.lt / A.lunge;
      move(st, p, A.sx + (A.ex - A.sx) * k, A.sz + (A.ez - A.sz) * k); p.moving = true; p.face = Math.atan2(A.w.x - p.x, A.w.z - p.z);
      return;
    }
    A.t += DT;
    if (A.t >= TAKEDOWN) { var tw = A.w; tw.st = 'out'; p.act = null; st.stunned++; st.bus.emit('st:out', { id: tw.id }); if (tw.type === 'boss') win(st); }
    return;
  }
  if (p.climb) { stepClimb(st, p); return; }
  /* the stick is relative to the camera: up = the way it looks, right = to its right */
  var v = st.view, fx = Math.sin(v), fz = Math.cos(v), rx = -Math.cos(v), rz = Math.sin(v);
  var mx = s.mx * rx + s.my * fx, mz = s.mx * rz + s.my * fz, m = Math.hypot(mx, mz);
  p.moving = m > 0.15;
  if (p.moving) {
    var sp = (p.crouch ? SNEAK : WALK) * Math.min(1, m), nx = p.x + mx / m * sp * DT, nz = p.z + mz / m * sp * DT;
    p.face = Math.atan2(mx, mz);
    move(st, p, nx, nz);
    /* the camera swings round behind him - only while he heads mostly away from it (straight sideways he just sidesteps, so holding
       left or right never walks him in circles; up-left or up-right turns the view that way) */
    var off = Math.abs(Math.atan2(s.mx, s.my));
    if (s.my > 0 && off < 1.05) st.view += angDiff(p.face, st.view) * Math.min(1, VIEW_TURN * DT * Math.min(1, m));
  }
  /* height: on the stairs he climbs; at the top he steps onto the roof; off the roof by the stairs or the ladder */
  if (onStairs(p.x, p.z)) { p.y = stairY(p.x); p.plat = p.y > M.STAIRS.top - 0.35 ? 'office' : null; }
  else if (p.plat) p.y = PLAT[p.plat].h; else p.y = 0;
  p.up = !!p.plat;
  p.light = p.plat ? 0.7 : lightAt(p.x, p.z);
  /* the checkpoints he passes */
  for (var c = st.checkpoint + 1; c < M.CHECKPOINTS.length; c++) { var K = M.CHECKPOINTS[c]; if (Math.hypot(p.x - K.x, p.z - K.z) < 3.2) { st.checkpoint = c; st.bus.emit('st:checkpoint', { n: c }); } }
  /* a takedown: a man within reach who isn't facing him and isn't locked on him */
  /* Attack: a takedown if a man is in reach from behind, otherwise a ladder if he's at its foot or its top */
  if (s.pressed.attack) {
    var t = takedownTarget(st);
    if (t) {
      var d = Math.hypot(t.x - p.x, t.z - p.z), ex = t.x - Math.sin(t.face) * STRIKE, ez = t.z - Math.cos(t.face) * STRIKE;
      p.act = { t: 0, w: t, sx: p.x, sz: p.z, ex: ex, ez: ez, lt: 0, lunge: d > STRIKE + 0.25 ? Math.min(0.42, d / 7.5) : 0 };
      t.st = 'stunned'; t.outT = 0; t.moving = false; p.face = Math.atan2(t.x - p.x, t.z - p.z); st.bus.emit('st:takedown', { id: t.id, boss: t.type === 'boss', lunge: p.act.lunge });
    } else {
      var L = ladderHere(st);
      if (L) { p.climb = { L: L, dir: p.plat ? -1 : 1 }; p.x = L.x; p.z = L.z; p.face = L.face; p.crouch = false; if (p.plat) p.y = L.h; p.plat = null; p.up = false; st.bus.emit('st:climb', { id: L.id, dir: p.climb.dir }); }
    }
  }
}
/* the ladder he could climb from where he stands: at its foot on the ground, or at its top on its roof or deck */
function ladderHere(st) {
  var p = st.player, i; if (p.climb || p.act) return null;
  for (i = 0; i < M.LADDERS.length; i++) {
    var L = M.LADDERS[i];
    if (!p.plat && p.y < 0.5 && Math.hypot(p.x - L.fx, p.z - L.fz) < LADDER_R) return L;
    if (p.plat === L.plat && Math.hypot(p.x - L.tx, p.z - L.tz) < LADDER_R) return L;
  }
  return null;
}
/* on the ladder: up or down at a steady pace, facing it; at the top he steps onto the deck, at the bottom onto the ground */
function stepClimb(st, p) {
  var C = p.climb, L = C.L; p.moving = true; p.px = p.x; p.pz = p.z;
  st.view += angDiff(L.face, st.view) * Math.min(1, 2.5 * DT);            /* on a ladder the camera comes round behind him */
  p.y += C.dir * CLIMB * DT; p.light = lightAt(p.x, p.z);
  if (C.dir > 0 && p.y >= L.h) { p.y = L.h; p.plat = L.plat; p.up = true; p.x = p.px = L.tx; p.z = p.pz = L.tz; p.climb = null; p.moving = false; st.bus.emit('st:climbed', { id: L.id, top: true }); }
  else if (C.dir < 0 && p.y <= 0) { p.y = 0; p.plat = null; p.up = false; p.x = p.px = L.fx; p.z = p.pz = L.fz; p.face = L.face + Math.PI; p.climb = null; p.moving = false; st.bus.emit('st:climbed', { id: L.id, top: false }); }
}
function takedownTarget(st) {
  var p = st.player, best = null, bd = REACH, i;
  for (i = 0; i < st.watchers.length; i++) {
    var w = st.watchers[i]; if (w.st === 'out' || w.st === 'stunned' || w.st === 'lock') continue;
    if ((w.plat || null) !== (p.plat || null) || p.climb) continue;         /* on the same level: the ground, or his roof or deck */
    var d = Math.hypot(p.x - w.x, p.z - w.z); if (d > bd) continue;
    var a = Math.abs(angDiff(Math.atan2(p.x - w.x, p.z - w.z), w.face));
    if (a < 1.75) continue;                                              /* he has to be behind him */
    best = w; bd = d;
  }
  return best;
}
/* walking: boxes and the yard's edge push him back; on the roof only the roof and the stairs are under his feet */
function move(st, p, nx, nz) {
  var B = M.BOUNDS, O = M.OFFICE, S = M.STAIRS;
  if (p.plat && p.plat !== 'office') {                                 /* a tower deck: stay on its planks */
    var q = PLAT[p.plat]; p.x = clamp(nx, q.x0 + 0.25, q.x1 - 0.25); p.z = clamp(nz, q.z0 + 0.25, q.z1 - 0.25); return;
  }
  if (p.plat) {
    var inRoof = onRoof(nx, nz), inSt = onStairs(nx, nz);
    if (!inRoof && !inSt) { nx = clamp(nx, O.x0 + 0.25, O.x1 + (Math.abs(nz - (S.z0 + S.z1) / 2) < 0.6 ? 0.5 : -0.25)); nz = clamp(nz, O.z0 + 0.25, O.z1 - 0.25); if (!onRoof(nx, nz) && !onStairs(nx, nz)) { nx = p.x; nz = p.z; } }
    if (onStairs(nx, nz) && stairY(nx) < M.STAIRS.top - 0.35) { p.plat = null; p.up = false; }
    p.x = nx; p.z = nz; return;
  }
  p.x = clamp(nx, B.x0, B.x1); p.z = clamp(nz, B.z0, B.z1);
  var sol = st.solids, i;
  for (i = 0; i < sol.length; i++) {
    var q = sol[i]; if (q.kind === 'office' && onStairs(p.x, p.z)) continue;
    var cx = clamp(p.x, q.x0, q.x1), cz = clamp(p.z, q.z0, q.z1), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d >= R) continue;
    if (d < 1e-6) { var l = p.x - q.x0, r = q.x1 - p.x, t = p.z - q.z0, b = q.z1 - p.z, mn = Math.min(l, r, t, b); if (mn === l) p.x = q.x0 - R; else if (mn === r) p.x = q.x1 + R; else if (mn === t) p.z = q.z0 - R; else p.z = q.z1 + R; }
    else { p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
  }
  /* the stairs' sides: on them, keep within their width */
  if (onStairs(p.x, p.z)) p.z = clamp(p.z, S.z0 + 0.2, S.z1 - 0.2);
}

function stepWatchers(st) {
  var p = st.player, i;
  for (i = 0; i < st.watchers.length; i++) {
    var w = st.watchers[i]; w.px = w.x; w.pz = w.z; w.moving = false;
    if (w.st === 'out') continue;
    if (w.st === 'stunned') { w.outT += DT; continue; }
    var see = st.state === 'play' && !p.act ? sees(st, w, p, w.st === 'lock') : 0;
    if (w.st === 'lock') {
      w.aim = { x: p.x, z: p.z, y: headY(p) - 0.2 };
      w.face = turnTo(w.face, Math.atan2(p.x - w.x, p.z - w.z), 8);
      if (see) { w.loseT = 0; w.last = { x: p.x, z: p.z }; w.lockT += DT; if (w.lockT >= LOCK) fire(st, w); }
      else { w.loseT += DT; if (w.loseT > LOSE) { w.st = 'search'; w.searchT = 0; w.lockT = 0; w.aim = null; st.bus.emit('st:lost', { id: w.id }); } }
      continue;
    }
    if (see > 0) {
      var rate = w.type === 'guard' ? 1.4 + 2.4 * see : 9;
      w.sus = Math.min(1, w.sus + rate * DT); w.last = { x: p.x, z: p.z };
      if (w.type === 'guard') w.face = turnTo(w.face, Math.atan2(p.x - w.x, p.z - w.z), 2.5 * w.sus);
      if (w.sus >= 1) { w.st = 'lock'; w.lockT = 0; w.loseT = 0; st.alarms++; st.bus.emit('st:spotted', { id: w.id, type: w.type, x: w.x, z: w.z }); continue; }
    } else w.sus = Math.max(0, w.sus - 0.45 * DT);
    /* noise: walking upright within 5 m of a man on foot, outside his view */
    if (w.type === 'guard' && w.st !== 'search' && p.moving && !p.crouch && !p.up && Math.hypot(p.x - w.x, p.z - w.z) < 5 && !p.act) {
      w.st = 'search'; w.searchT = 0; w.last = { x: p.x, z: p.z }; st.bus.emit('st:heard', { id: w.id });
    }
    if (w.st === 'search') {
      w.searchT += DT;
      if (w.last) { var ta = Math.atan2(w.last.x - w.x, w.last.z - w.z); w.face = turnTo(w.face, ta + Math.sin(w.searchT * 2.2) * 0.6 * Math.min(1, w.searchT), 3); }
      if (w.type === 'guard' && w.last && w.searchT < SEARCH * 0.6) walkToward(st, w, w.last.x, w.last.z, 1.4);
      if (w.searchT > SEARCH + (w.type === 'guard' ? 1.2 : 0)) { w.st = w.type === 'guard' ? 'return' : 'watch'; w.last = null; }
      continue;
    }
    if (w.type === 'guard') patrol(st, w); else sweepLook(st, w);
  }
}
function turnTo(a, b, rate) { var d = angDiff(b, a), m = rate * DT; return a + clamp(d, -m, m); }
function walkToward(st, w, x, z, sp) {
  var dx = x - w.x, dz = z - w.z, d = Math.hypot(dx, dz); if (d < 0.2) return true;
  var k = Math.min(d, sp * DT); w.x += dx / d * k; w.z += dz / d * k; w.moving = true; w.face = turnTo(w.face, Math.atan2(dx, dz), 6);
  /* never through a box */
  var sol = st.solids, i;
  for (i = 0; i < sol.length; i++) { var q = sol[i], cx = clamp(w.x, q.x0, q.x1), cz = clamp(w.z, q.z0, q.z1), ex = w.x - cx, ez = w.z - cz, e = Math.hypot(ex, ez); if (e < R && e > 1e-6) { w.x = cx + ex / e * R; w.z = cz + ez / e * R; } }
  return false;
}
function patrol(st, w) {
  if (w.st === 'return') {
    var tgt = w.path[w.wp]; if (walkToward(st, w, tgt[0], tgt[1], 1.5)) w.st = 'watch';
    return;
  }
  if (w.pause > 0) { w.pause -= DT; w.face = turnTo(w.face, w.look, 2.2); return; }
  var wp = w.path[w.wp];
  if (walkToward(st, w, wp[0], wp[1], 1.5)) {
    var nx = w.path[(w.wp + 1) % w.path.length]; w.wp = (w.wp + 1) % w.path.length; w.pause = w.wait;
    w.look = Math.atan2(nx[0] - w.x, nx[1] - w.z) + (w.wp % 2 ? 1.4 : -1.4);        /* a look round before he walks on */
  }
}
function sweepLook(st, w) {
  w.phase += DT;
  var a = w.base + w.sweep[0] * Math.sin(w.phase * Math.PI * 2 / w.sweep[1]);
  if (w.every) {                                     /* the snipers glance back over the shoulder every so often */
    var was = w.glance; w.glance -= DT; if (w.glance <= -1.4) w.glance = w.every;
    if (was >= 0 && w.glance < 0) st.bus.emit('st:glance', { id: w.id });
    if (w.glance < 0) a = w.base + Math.PI - 0.4;
  }
  w.face = turnTo(w.face, a, w.glance < 0 ? 5 : 1.6);
}
function fire(st, w) {
  var p = st.player; w.lockT = LOCK - REFIRE; w.fired++;
  p.hits++; p.flash = 1; st.bus.emit('st:shot', { id: w.id, x: w.x, z: w.z, y: w.eye, tx: p.x, tz: p.z, ty: headY(p), hits: p.hits });
  if (p.hits >= 2) { st.state = 'fail'; st.failT = 0; st.bus.emit('st:down', { checkpoint: st.checkpoint }); }
}
function win(st) { st.state = 'won'; st.bus.emit('st:won', { stunned: st.stunned, alarms: st.alarms }); }

/* back to the last checkpoint: his health back, every man still standing back on his round and calm, the knocked-out stay out */
function restart(st) {
  var K = M.CHECKPOINTS[st.checkpoint], p = st.player;
  p.x = p.px = K.x; p.z = p.pz = K.z; p.face = K.face; p.y = 0; p.up = false; p.plat = null; p.climb = null; p.crouch = false; p.hits = 0; p.act = null; p.flash = 0;
  st.watchers.forEach(function (w) {
    if (w.st === 'out') return;
    w.st = 'watch'; w.sus = 0; w.lockT = 0; w.loseT = 0; w.aim = null; w.last = null; w.x = w.px = w.home.x; w.z = w.pz = w.home.z; w.face = w.home.face; w.phase = 0; w.pause = 0;
    if (w.path) w.wp = w.home.wp; if (w.every) w.glance = w.every;
  });
  st.view = K.face; st.state = 'play'; st.bus.emit('st:restart', { checkpoint: st.checkpoint });
}

function step(st, inp) {
  st.tick++; st.t += DT;
  var p = st.player; if (p.flash > 0) p.flash = Math.max(0, p.flash - DT * 2);
  if (st.state === 'fail') { st.failT += DT; stepWatchers(st); if (st.failT >= FAIL_WAIT) restart(st); return; }
  if (st.state === 'won') { if (p.act) stepPlayer(st, inp); stepWatchers(st); return; }
  stepPlayer(st, inp); stepWatchers(st);
  p.seen = 0; st.watchers.forEach(function (w) { if (w.st === 'lock') p.seen = Math.max(p.seen, 1); else p.seen = Math.max(p.seen, w.sus); });
}

/* who could he take down right now (for the button prompt) */
function prompt(st) {
  if (st.state !== 'play' || st.player.act || st.player.climb) return null;
  var t = takedownTarget(st); if (t) return { kind: 'stun', w: t };
  var L = ladderHere(st); return L ? { kind: st.player.plat ? 'down' : 'up', L: L } : null;
}

/* a short fingerprint of the stage's state, for replays in the tests */
function hash(st) {
  var h = 2166136261, p = st.player;
  function add(v) { h ^= Math.round(v * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; }
  add(p.x); add(p.z); add(p.hits); add(st.view); add(st.checkpoint); st.watchers.forEach(function (w) { add(w.x); add(w.z); add(w.face); add(w.sus); add(w.lockT); });
  return h >>> 0;
}

module.exports = { create: create, step: step, restart: restart, prompt: prompt, hash: hash, blocked: blocked, lightAt: lightAt, sees: sees, TPS: TPS, LOCK: LOCK };
