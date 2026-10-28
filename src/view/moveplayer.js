/* view: plays move clips from data/moves.js as poses, and chains presses into the combo string.
   Pure maths on time; the caller feeds dt. The combat phase will drive the same clips from the tick loop. */
'use strict';

var moves = require('../data/moves');

function ease(kind, t) {
  if (kind === 'in') return t * t * t * (t * (t * 6 - 15) + 10) * 0.55 + t * t * 0.45 * t;  /* slow, building start: anticipation */
  if (kind === 'snap') return 1 - Math.pow(1 - t, 2.4);                                      /* fast start that settles on impact */
  return t * t * t * (t * (t * 6 - 15) + 10);                                                 /* smootherstep */
}
function smooth(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
function wrap180(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }

/* value of joint `name` at key i. Guitar keys carry forward from the last key that sets them, other joints fall back to guard. */
function keyValue(keys, i, name) {
  var v = keys[i].pose[name], j;
  if (v !== undefined) return v;
  if (name.indexOf('gtr.') === 0) {
    for (j = i - 1; j >= 0; j--) if (keys[j].pose[name] !== undefined) return keys[j].pose[name];
    for (j = i + 1; j < keys.length; j++) if (keys[j].pose[name] !== undefined) return keys[j].pose[name];
    return 0;
  }
  return moves.GUARD[name] === undefined ? 0 : moves.GUARD[name];
}

var NAMES = {};
function namesFor(name) {
  if (NAMES[name]) return NAMES[name];
  var set = {}, k; for (k in moves.GUARD) set[k] = 1;
  moves.MOVES[name].keys.forEach(function (ky) { for (k in ky.pose) set[k] = 1; });
  return (NAMES[name] = Object.keys(set));
}

/* pose of move `name` at time t (seconds) */
function clipPose(name, t) {
  var mv = moves.MOVES[name], keys = mv.keys, i = 1, out = {};
  if (t > mv.len) t = mv.len;
  while (i < keys.length - 1 && t > keys[i].t) i++;
  var a = keys[i - 1], b = keys[i], u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  u = u < 0 ? 0 : (u > 1 ? 1 : u);
  var e = ease(b.ease, u), names = namesFor(name);
  for (var n = 0; n < names.length; n++) {
    var k = names[n], va = keyValue(keys, i - 1, k), vb = keyValue(keys, i, k);
    out[k] = va + (vb - va) * e;
  }
  out['hip.ry'] = wrap180(out['hip.ry']);        /* full spins come back to the same stance */
  return out;
}

function mixPose(a, b, t) { var o = {}, k; for (k in a) o[k] = a[k] + ((k in b ? b[k] : a[k]) - a[k]) * t; for (k in b) if (!(k in a)) o[k] = b[k] * t; return o; }

var FADE_IN = 0.2, FADE_OUT = 0.5, CHAIN_FADE = 0.3, LEAD_IN = 0.1, LINGER = 0.9, LINGER_FADE = 0.55;
var guardPose = function () { var o = {}, k; for (k in moves.GUARD) o[k] = moves.GUARD[k]; return o; };

/* playback speed of the attacker's clip around contact: a barely-there catch on impact, then the limb snaps back faster than it went out.
   (A long freeze reads as lag, not weight; the weight comes from the target's reaction and the quick recovery.) */
var CATCH = { jab: 0.02, cross: 0.025, hook: 0.03, hookB: 0.03, uppercut: 0.035, elbow: 0.03, knee: 0.03, kick: 0.035, axeKick: 0.035, roundhouse: 0.035, counterCross: 0.03 };
function impactSpeed(P) {
  var mv = moves.MOVES[P.move], c = CATCH[P.move];
  if (!c || mv.counter || P.comboIdx < 0 && P.move !== 'counterCross') return 1;
  if (P.comboIdx === P.seq.length - 1) c *= 1.8;
  var ht = (mv.hits || [mv.hit])[0], d = P.t - ht;
  if (d >= 0 && d < c) return 0.4;
  if (d >= c && d < c + 0.12) return 1.3;
  return 1;
}

function createMovePlayer(opts) {
  var rand = (opts && opts.rand) || Math.random;
  var P = { lead: 0, linger: 0, lingerT: 0, move: null, t: 0, comboIdx: -1, queued: false, sinceEnd: 99, hitListeners: [], fxListeners: [], from: null, fromT: 1, last: null, fired: {},
            seq: moves.COMBO, lastW: { lo: 0, up: 0, a: 0, b: 0 }, startW: { lo: 0, up: 0, a: 0, b: 0 }, fromStance: false };
  function out(pose, lo, up, a, b, move) { P.lastW = { lo: lo, up: up, a: a, b: b }; return { pose: pose, wLower: lo, wUpper: up, wArmA: a, wArmB: b, move: move }; }
  function start(name, idx, keepFrom, lead) {
    P.fromStance = false; P.lead = lead || 0; P.linger = 0; P.lingerT = 0; P.move = name; P.t = 0; P.comboIdx = idx; P.queued = false; P.fired = {};
    P.from = keepFrom || null; P.fromT = 0;
    if (!P.lead) P.startW = P.lastW;                                  /* weights continue from whatever was last on screen: no jumps */
  }
  P.press = function () {
    if (!P.move) {
      var inGuard = P.linger > 0, i = (P.sinceEnd < 0.9 && P.comboIdx >= 0 && P.comboIdx < P.seq.length - 1) ? P.comboIdx + 1 : 0;
      if (i === 0) P.seq = moves.makeString(rand);      /* a different string each time a fight starts */
      start(P.seq[i], i, null, inGuard ? 0 : LEAD_IN); P.fromStance = inGuard; return;
    }
    if (P.comboIdx >= 0 && P.t >= moves.MOVES[P.move].cancel * 0.55) P.queued = true;
  };
  P.play = function (name) {
    var cont = P.move ? P.last : null;                                    /* interrupting a move: carry its pose into the new one */
    start(name, -1, cont, cont ? 0 : (moves.MOVES[name].counter ? 0.2 : 0));
  };
  P.cancel = function () { P.move = null; P.linger = 0; P.last = null; P.from = null; P.sinceEnd = 99; P.lastW = { lo: 0, up: 0, a: 0, b: 0 }; };
  P.time = function () { return P.move ? P.t : 0; };
  P.length = function () { return P.move ? moves.MOVES[P.move].len : 0; };
  P.current = function () { return P.move && P.lead <= 0 ? P.move : null; };
  function lingerFrame(dt) {
    P.linger -= dt; P.lingerT += dt;
    var up = smooth(Math.min(1, P.linger / LINGER_FADE)), lo = smooth(Math.max(0, 1 - P.lingerT / 0.5));
    return out(guardPose(), lo, up, up, up, null);
  }
  P.update = function (dt) {
    if (!P.move) {
      P.sinceEnd += dt;
      return P.linger > 0 ? lingerFrame(dt) : (P.lastW = { lo: 0, up: 0, a: 0, b: 0 }, null);
    }
    if (P.lead > 0) {                                        /* settle into the ready stance before the first strike; arms stay down */
      P.lead -= dt;
      var lw = smooth(1 - Math.max(0, P.lead) / LEAD_IN);
      var r = out(guardPose(), lw * 0.7, lw, 0, 0, null);
      if (P.lead <= 0) P.startW = P.lastW;
      return r;
    }
    var mv = moves.MOVES[P.move];
    dt *= impactSpeed(P);                                    /* the fist snaps in, bites into the target, then lets go */
    P.t += dt; P.fromT += dt;
    (mv.hits || [mv.hit]).forEach(function (ht, hi) { if (!P.fired['h' + hi] && P.t >= ht) { P.fired['h' + hi] = 1; var hl = (mv.hits || [mv.hit]).length, lastHit = mv.counter ? hi === hl - 1 : (P.comboIdx >= 0 ? P.comboIdx === P.seq.length - 1 : true); P.hitListeners.forEach(function (f) { f(P.move, hi, lastHit); }); } });
    (mv.fx || []).forEach(function (fx, fi) { if (!P.fired['f' + fi] && P.t >= fx.t) { P.fired['f' + fi] = 1; P.fxListeners.forEach(function (f) { f(fx.kind, P.move); }); } });
    if (P.queued && P.t >= mv.cancel && P.comboIdx >= 0 && P.comboIdx < P.seq.length - 1) {   /* chain: carry the current pose into the next move */
      start(P.seq[P.comboIdx + 1], P.comboIdx + 1, P.last); P.t = dt;
    }
    mv = moves.MOVES[P.move];
    if (P.t >= mv.len) {
      P.move = null; P.sinceEnd = 0; P.last = null;
      if (mv.counter) { P.lastW = { lo: 0, up: 0, a: 0, b: 0 }; return null; }
      P.linger = LINGER + LINGER_FADE; P.lingerT = 0;
      return lingerFrame(dt);
    }
    var pose = clipPose(P.move, P.t);
    if (P.from && P.fromT < CHAIN_FADE) pose = mixPose(P.from, pose, ease('io', P.fromT / CHAIN_FADE));
    P.last = pose;
    var sw = P.startW, up = function (s0, dur) { return s0 + (1 - s0) * smooth(P.t / dur); };
    if (mv.counter) {
      var wc = Math.min(1, (mv.len - P.t) / 0.45), c = smooth(Math.max(0, wc));
      return out(pose, up(sw.lo, 0.25) * c, up(sw.up, 0.25) * c, up(sw.a, 0.25) * c, up(sw.b, 0.25) * c, P.move);
    }
    var fresh = !P.fromStance && P.comboIdx === 0 && !P.from;
    return out(pose, up(sw.lo, FADE_IN), up(sw.up, 0.2), up(sw.a, fresh ? 0.1 : 0.12), up(sw.b, fresh ? 0.22 : 0.12), P.move);
  };
  P.onHit = function (f) { P.hitListeners.push(f); };
  P.onFx = function (f) { P.fxListeners.push(f); };
  P.active = function () { return !!P.move; };
  P.guarding = function () { return P.linger > 0; };
  return P;
}

module.exports = { clipPose: clipPose, createMovePlayer: createMovePlayer, COMBO: moves.COMBO, wrap180: wrap180 };
