/* sim: road fights in ride mode (Phase 4, M2 and M3). The view turns to the side; the road keeps rolling under Bijli.
   Bike goons ride up one lane to Toofan's left from behind or ahead and fight him alongside: Attack throws a punch, hook, elbow or kick
   toward them, Block guards, and Block pressed just before a blow lands counters. Each blow that gets through costs a heart.
   A car fight: the car pulls alongside and swerves at him; Block at the right moment makes Toofan leap onto its roof, where its crew
   climb out one at a time (a warning flash before each blow, counter or hit them). Beaten, the car spins out and the police arrive.
   No hearts left: the fight starts again with full hearts. Plain data; the view only reads it. */
'use strict';

var R = require('../data/ride');
var MOVES = require('../data/moves').MOVES;
var mapMod = require('./ridemap');

var E = R.ENC, DT = 1 / 60;
var BIKE_MOVES = ['bkJabL', 'bkCrossL', 'bkHookL', 'bkElbowL', 'bkKickL'];
var ROOF_MOVES = ['jab', 'cross', 'hook', 'kick'];

function ticks(sec) { return Math.max(1, Math.round(sec * 60)); }
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }

/* how far the road runs straight ahead before the map ends */
function runAhead(map, x, z, h) { var fx = Math.round(Math.sin(h)), fz = Math.round(Math.cos(h)), E2 = map.ext - 6; return fx ? (fx > 0 ? E2 - x : x + E2) : (fz > 0 ? E2 - z : z + E2); }

function canStart(r) {
  var b = r.bike;
  if (r.state !== 'ride' || b.speed < 6) return false;
  var axisH = Math.round(b.h / (Math.PI / 2)) * (Math.PI / 2);
  if (Math.abs(angDiff(axisH, b.h)) > 0.12 || !mapMod.onCarriageway(b.x, b.z)) return false;
  if (r.target && Math.hypot(r.target.x - b.x, r.target.z - b.z) < 60) return false;
  return runAhead(r.map, b.x, b.z, axisH) > E.MIN_RUN;
}

function start(r, kind) {
  var b = r.bike, h = Math.round(b.h / (Math.PI / 2)) * (Math.PI / 2);
  if (runAhead(r.map, b.x, b.z, h) < 60 && runAhead(r.map, b.x, b.z, h + Math.PI) > runAhead(r.map, b.x, b.z, h)) h += Math.PI;   /* (a test start near the edge turns round) */
  h = Math.atan2(Math.sin(h), Math.cos(h));
  var fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
  /* Toofan moves to the inner lane; the goons take the outer lane on his left */
  var line = Math.abs(fx) > 0.5 ? mapMod.nearestLine(b.z) : mapMod.nearestLine(b.x);
  var lane = kind === 'bikes' ? E.MID : R.LANES[0];                /* bike goons: Toofan in the middle so they can come at him from both sides */
  var bx = Math.abs(fx) > 0.5 ? b.x : line + lx * lane, bz = Math.abs(fx) > 0.5 ? line + lz * lane : b.z;
  b.h = b.ph = h; b.x = b.px = bx; b.z = b.pz = bz; b.speed = E.SPEED; b.turn = 0;
  var e = {
    kind: kind, phase: 'intro', t: 0, f: { x: fx, z: fz }, l: { x: lx, z: lz }, speed: E.SPEED,
    hero: { act: null, guard: false, blockTick: -999, hurt: 0, inv: 0, roof: false, leap: 0, leapDir: 0 },
    foes: [], car: null, crew: [], police: null, beaten: 0
  };
  r.enc = e; r.state = 'enc'; r.hearts = 3; r.encCount = (r.encCount || 0) + 1;
  if (kind === 'arrest') {                                        /* after a fight in a trouble spot: the police take the goons away; Toofan waits on Bijli */
    b.speed = 0; e.speed = 0; e.phase = 'police'; arrest(e, 6, E.LAT + 3.0, 5); r.bus.emit('enc:police', {});
  } else if (kind === 'bikes') {
    var n = 2 + (r.encCount % 2), i;
    for (i = 0; i < n; i++) e.foes.push({ id: i + 1, kind: i === n - 1 ? 'rod' : 'bike', hp: i === n - 1 ? 4 : 3, u: (i % 2 ? 1 : -1) * (14 + i * 4), st: 'approach', t: 0, cd: 30 + Math.floor(r.rng.next() * 40), look: i,
      from: (i % 2 ? 1 : -1), lat: (i % 2 ? -1 : 1) * E.SIDE });        /* alternately on his left and his right, coming from behind or ahead */
    e.token = 40;
  } else {
    e.car = { u: -18, lat: E.LAT, st: 'approach', t: 0, cd: 60, sw: 0, yaw: 0, look: 1 };
    for (i = 0; i < E.CREW; i++) e.crew.push({ id: i + 1, crew: true, hp: 2, st: 'hidden', t: 0, cd: 40, side: i % 2 ? -1 : 1, rise: 0 });
  }
  r.bus.emit('enc:start', { kind: kind });
  return e;
}

/* the hero's punch or kick lands on whoever is in front of it */
function heroStrike(r, e, input, list, reach) {
  var H = e.hero, s = input.state;
  if (s.pressed.block) H.blockTick = r.tick;
  H.guard = !!s.held.block && !H.act;
  if (H.hurt > 0) { H.hurt--; H.act = null; return; }
  if (H.inv > 0) H.inv--;
  if (!H.act && (s.pressed.attack || input.consume('attack', 6)) && !s.held.block) {
    /* strike toward the man who is about to hit, else the nearest one: left or right of the bike */
    var tgt = null, td = 1e9;
    list.forEach(function (o) { if (o.lat === undefined || o.st === 'down' || o.st === 'approach') return; var d = Math.abs(o.u) - (o.st === 'windup' ? 9 : 0); if (d < td) { td = d; tgt = o; } });
    if (tgt) H.side = tgt.lat > 0 ? 1 : -1;
    var pool = H.roof ? ROOF_MOVES : BIKE_MOVES, mv = pool[Math.floor(r.rng.next() * pool.length)];
    if (!H.roof && H.side < 0) mv = mv.replace(/L$/, 'R');
    var M = MOVES[mv];
    H.act = { move: mv, t: 0, hitAt: ticks(M.hit), len: ticks(M.len), counter: false, side: H.side || 1 };
    r.bus.emit('enc:swing', { move: mv });
  }
  if (!H.act) return;
  H.act.t++;
  if (H.act.t === H.act.hitAt && !H.act.counter) {
    var best = null, bd = 1e9;
    list.forEach(function (o) { if (o.st === 'down' || o.st === 'out' || o.st === 'hidden' || o.st === 'approach' && Math.abs(o.u) > reach) return; if (o.lat !== undefined && (o.lat > 0 ? 1 : -1) !== H.act.side) return; var d = Math.abs(o.u - (o.at || 0)); if (d < reach && d < bd) { bd = d; best = o; } });
    if (best) damage(r, best, 1, H.act.move);
    else r.bus.emit('enc:miss', {});
  }
  if (H.act.t >= H.act.len) H.act = null;
}

function damage(r, o, n, move) {
  o.hp -= n; o.t = 0; o.lastMove = move;
  if (o.hp <= 0) { o.st = o.crew ? 'out' : 'down'; r.enc.beaten++; r.bus.emit('enc:ko', { id: o.id, move: move }); }
  else { o.st = 'hurt'; r.bus.emit('enc:hit', { id: o.id, move: move }); }
}

/* a goon's blow arrives: counter, guard or hurt */
function landBlow(r, e, o, wind) {
  var H = e.hero, sinceBlock = r.tick - H.blockTick;
  if (sinceBlock >= 0 && sinceBlock <= E.COUNTER) {
    var side = o.lat !== undefined && o.lat < 0 ? -1 : 1, cm = H.roof ? 'counterCross' : (side > 0 ? 'bkCElbowL' : 'bkCElbowR'); H.side = side;
    H.act = { move: cm, t: 0, hitAt: 99, len: ticks(MOVES[cm].len), counter: true, side: side };
    damage(r, o, 2, H.act.move); r.bus.emit('enc:counter', { id: o.id }); return;
  }
  if (o.lat !== undefined) H.side = o.lat > 0 ? 1 : -1;
  if (H.guard) { o.st = 'recover'; o.t = 0; r.bus.emit('enc:block', { id: o.id }); return; }
  o.st = 'recover'; o.t = 0;
  if (H.inv > 0) return;
  r.hearts--; H.hurt = 22; H.inv = 45; H.act = null; r.bus.emit('enc:hurt', { hearts: r.hearts });
}

function stepFoes(r, e) {
  /* one man engaged on each side, riding level with Toofan (a little ahead on the right, a little behind on the left, never hidden behind him);
     the rest wait further off on their own side. Only one blow is wound up at a time, so every attack can be read. */
  var act = {}, busy = false;
  e.foes.forEach(function (o) { var k = o.lat > 0 ? 'L' : 'R'; if (!act[k] && o.st !== 'down') act[k] = o; if (o.st === 'windup') busy = true; });
  if (e.token > 0) e.token--;
  e.foes.forEach(function (o) {
    o.t++;
    if (o.st === 'down') { o.u -= 7 * DT; return; }
    var engaged = act[o.lat > 0 ? 'L' : 'R'] === o, want = engaged ? (o.lat > 0 ? 0.15 : 0.3) : (o.from < 0 ? -7 : 7);
    if (o.st === 'approach') { o.u += Math.max(-5 * DT, Math.min(5 * DT, want - o.u)); if (engaged && Math.abs(o.u - want) < 0.1) { o.st = 'ready'; o.t = 0; } return; }
    o.u += Math.max(-3 * DT, Math.min(3 * DT, want - o.u));
    if (!engaged) return;
    if (o.st === 'ready' && o.t > o.cd && !busy && e.token <= 0) { o.st = 'windup'; o.t = 0; busy = true; r.bus.emit('enc:warn', { id: o.id, side: o.lat > 0 ? 1 : -1 }); }
    else if (o.st === 'windup' && o.t >= E.WIND) { landBlow(r, e, o, E.WIND); e.token = 28; }
    else if (o.st === 'recover' && o.t > 26) { o.st = 'ready'; o.t = 0; o.cd = 30 + Math.floor(r.rng.next() * 50); }
    else if (o.st === 'hurt' && o.t > 20) { o.st = 'ready'; o.t = 0; o.cd = 20 + Math.floor(r.rng.next() * 30); }
  });
  e.foes = e.foes.filter(function (o) { return !(o.st === 'down' && o.t > 90); });
  if (!e.foes.length && e.phase === 'fight') { e.phase = 'clear'; e.t = 0; r.bus.emit('enc:clear', { kind: 'bikes' }); }
}

function stepCar(r, e) {
  var c = e.car, H = e.hero; c.t++;
  if (e.phase === 'fight') {
    if (c.st === 'approach') { c.u += Math.min(6 * DT, 1.6 - c.u); if (c.u > 1.55) { c.st = 'ready'; c.t = 0; } }
    else if (c.st === 'ready' && c.t > c.cd) { c.st = 'windup'; c.t = 0; r.bus.emit('enc:warn', { car: true }); }
    else if (c.st === 'windup') { c.sw = -0.35 * Math.min(1, c.t / 20); if (c.t >= E.CAR_WIND) {
      var since = r.tick - H.blockTick;
      if (since >= 0 && since <= E.LEAP) { e.phase = 'leap'; e.t = 0; H.leap = 0; H.leapDir = 1; H.act = null; c.st = 'cruise'; c.sw = 0; r.bus.emit('enc:leap', {}); }
      else { c.st = 'swerve'; c.t = 0; }
    } }
    else if (c.st === 'swerve') {
      c.sw = Math.sin(Math.PI * Math.min(1, c.t / 24)) * 1.3;
      if (c.t === 12) { if (H.guard) r.bus.emit('enc:block', { car: true }); else if (H.inv <= 0) { r.hearts--; H.hurt = 26; H.inv = 50; r.bus.emit('enc:hurt', { hearts: r.hearts, car: true }); } }
      if (c.t >= 24) { c.st = 'ready'; c.t = 0; c.sw = 0; c.cd = 60 + Math.floor(r.rng.next() * 50); }
    }
  } else if (e.phase === 'spin') {
    c.u -= Math.min(E.SPEED, 2 + e.t * 0.12) * DT; c.yaw = Math.min(1.9, c.yaw + 0.045 * Math.max(0, 1 - e.t / 70));
  }
}

function stepCrew(r, e) {
  var active = null;
  e.crew.forEach(function (o) { if (!active && o.st !== 'out') active = o; });
  e.crew.forEach(function (o) {
    o.t++; o.at = o.side * 1.05;                                                 /* where he stands on the roof, along the road */
    o.u = o.at;
    if (o.st === 'out') { o.rise = Math.max(0, o.rise - 0.04); return; }
    if (o !== active) return;
    if (o.st === 'hidden' && o.t > o.cd) { o.st = 'pop'; o.t = 0; r.bus.emit('enc:pop', { id: o.id }); }
    else if (o.st === 'pop') { o.rise = Math.min(1, o.t / 20); if (o.t >= 24) { o.st = 'ready'; o.t = 0; o.cd = 20 + Math.floor(r.rng.next() * 40); } }
    else if (o.st === 'ready' && o.t > o.cd) { o.st = 'windup'; o.t = 0; r.bus.emit('enc:warn', { id: o.id }); }
    else if (o.st === 'windup' && o.t >= E.WIND) landBlow(r, e, o, E.WIND);
    else if (o.st === 'recover' && o.t > 26) { o.st = 'ready'; o.t = 0; o.cd = 25 + Math.floor(r.rng.next() * 45); }
    else if (o.st === 'hurt' && o.t > 18) { o.st = 'ready'; o.t = 0; o.cd = 15 + Math.floor(r.rng.next() * 30); }
  });
  e.crew.forEach(function (o) { o.crew = true; });
  if (e.crew.every(function (o) { return o.st === 'out'; }) && e.phase === 'roof') { e.phase = 'spin'; e.t = 0; e.hero.leap = 1; e.hero.leapDir = -1; e.hero.act = null; r.bus.emit('enc:spin', {}); }
}

/* the police scene: a police car rolls in behind, two constables stand by, the goons are walked to it one by one */
function arrest(e, u, lat, n) {
  var i; e.police = { u: u - 34, stop: u - 5, lat: R.ENC.LAT }; e.cops = [{ u: u - 2.2, lat: lat }, { u: u + n * 0.6 + 1.2, lat: lat }]; e.cuffed = [];
  for (i = 0; i < n; i++) e.cuffed.push({ id: i + 1, u: u + (i - (n - 1) / 2) * 1.15, lat: lat, walk: 0, gone: false });
  e.arrestEnd = 150 + n * 40 + 100;
}
function stepArrest(r, e, roll) {
  var P = e.police, i;
  [P].concat(e.cops, e.cuffed).forEach(function (o) { o.u -= roll * DT; if (o.stop !== undefined) o.stop -= roll * DT; });
  P.u += Math.min(11 * DT, Math.max(0, P.stop - P.u));
  if (e.t === 120) r.bus.emit('enc:arrest', {});
  for (i = 0; i < e.cuffed.length; i++) {
    var g = e.cuffed[i]; if (g.gone || e.t < 150 + i * 40) continue;
    g.walk++; var tu = P.u + 1.2, tl = P.lat + 1.3, du = tu - g.u, dl = tl - g.lat, d = Math.hypot(du, dl);
    if (d < 0.3) g.gone = true; else { g.u += du / d * 1.8 * DT; g.lat += dl / d * 1.8 * DT; }
  }
}

function finish(r) {
  var e = r.enc, b = r.bike;
  r.state = 'ride'; r.enc = null; b.speed = e.kind === 'arrest' ? 0 : E.SPEED; b.grace = R.GRACE_TICKS;
  /* on the way to every trouble spot: first the bike goons, then the car gang; after the arrest at a cleared spot the next run starts */
  if (e.kind === 'bikes') { r.nextEnc = 'car'; r.encCool = E.GAP; }
  else if (e.kind === 'car') { r.nextEnc = null; }
  else { r.nextEnc = 'bikes'; r.encCool = E.FIRST; r.needPick = true; }
  r.bus.emit('enc:end', { kind: e.kind });
}

function step(r, input) {
  var e = r.enc, b = r.bike, H = e.hero;
  b.px = b.x; b.pz = b.z; b.ph = b.h; e.t++;
  /* the road keeps rolling; at the map's edge everyone comes to a stop and the fight goes on */
  var roll = runAhead(r.map, b.x, b.z, b.h) > 8 ? e.speed : 0;
  if (e.phase === 'police') roll = e.kind === 'arrest' ? 0 : Math.max(0, E.SPEED * (1 - e.t / 60));
  b.speed = roll; b.x += e.f.x * roll * DT; b.z += e.f.z * roll * DT;

  if (e.kind === 'arrest') { stepArrest(r, e, roll); if (e.t > e.arrestEnd) finish(r); return; }
  if (e.phase === 'intro') { if (e.t > 70) { e.phase = 'fight'; e.t = 0; } if (e.kind === 'car') stepCar(r, e); else stepFoes(r, e); return; }
  if (e.phase === 'fail') { if (e.t > 120) { var k = e.kind; r.state = 'ride'; r.enc = null; start(r, k); r.bus.emit('enc:retry', {}); } return; }

  if (e.kind === 'bikes') {
    if (e.phase === 'fight') heroStrike(r, e, input, e.foes, E.REACH);
    stepFoes(r, e);
    if (e.phase === 'clear' && e.t > 60) { var keep = r.hearts; start(r, 'car'); r.hearts = keep; }     /* the car gang follows straight on: the mini boss of this chase */
  } else {
    if (e.phase === 'fight') { heroStrike(r, e, input, [], 0); stepCar(r, e); }
    else if (e.phase === 'leap') { H.leap = Math.min(1, e.t / 36); if (H.leap >= 1) { e.phase = 'roof'; e.t = 0; H.roof = true; } }
    else if (e.phase === 'roof') { heroStrike(r, e, input, e.crew, 1.6); stepCrew(r, e); }
    else if (e.phase === 'spin') { H.roof = e.t < 36; H.leap = Math.max(0, 1 - e.t / 36); stepCar(r, e); stepCrew(r, e); if (e.t > 80) { e.phase = 'police'; e.t = 0; arrest(e, e.car.u, e.car.lat + 3.0, e.crew.length); e.police.stop = e.car.u - 6.5; r.bus.emit('enc:police', {}); } }
    else if (e.phase === 'police') {
      e.car.u -= roll * DT; stepArrest(r, e, roll);
      if (e.t > e.arrestEnd) finish(r);
    }
  }
  if (r.hearts <= 0 && e.phase !== 'fail') { e.phase = 'fail'; e.t = 0; H.act = null; r.bus.emit('enc:fail', {}); }
}

module.exports = { canStart: canStart, start: start, step: step, runAhead: runAhead, BIKE_MOVES: BIKE_MOVES, ROOF_MOVES: ROOF_MOVES };
