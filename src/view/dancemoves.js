/* view: Toofan's dance moves for a brawl, each a pose drawn from the music's beat count `b` and layered on stand (so every fighting move
   still plays over it exactly as before). Each gang's stage has its own beat and its own set of moves to match; he changes move every
   two bars, easing from one into the next over a beat.
     toprock     stepping across on the beat, hips and shoulders swinging, arms loose (the b-boy break)
     egypt       side-on, one hand flat up in front of the face and the other flat at the waist, swapping every two beats, the head
                 sliding side to side (the "walk like an Egyptian" arms)
     headbang    knees bent, the whole top half and the head driving down on every beat, one hand on an air guitar
     bhangra     both arms up high, the shoulders bouncing, a knee kicked up on alternate beats (to the dhol)
     robot       stiff, snapping from one pose to the next exactly on the beat: arms at right angles, the head and chest ticking round
     runningman  one knee up while the other foot slides back, swapping on each beat, the arms pumping */
'use strict';
var posemath = require('./posemath');

var PI = Math.PI;
function pos(v) { return v > 0 ? v : 0; }

var MOVES = {
  toprock: function (b, k) {
    var ph = b * PI, sw = Math.sin(ph), bo = Math.abs(Math.cos(ph)), nod = Math.abs(Math.sin(ph * 2));
    return { 'hip.y': -0.04 - 0.07 * bo * k, 'hip.x': 0.07 * sw * k, 'hip.ry': 16 * sw * k, 'spine.ry': -12 * sw * k, 'spine.rz': 5 * sw, 'spine.rx': 6,
      'head.rx': 4 + 10 * nod * k, 'head.rz': -4 * sw, 'legA.hx': 22 * pos(sw) * k, 'legA.k': 34 * pos(sw) * k, 'legB.hx': 22 * pos(-sw) * k, 'legB.k': 34 * pos(-sw) * k,
      'armA.sx': 35 + 35 * sw * k, 'armA.sz': 18, 'armA.e': 85, 'armB.sx': 35 - 35 * sw * k, 'armB.sz': 18, 'armB.e': 85 };
  },
  egypt: function (b, k) {
    var side = Math.floor(b / 2) % 2 ? 1 : -1, u = posemath.smooth((b % 2) * 3), sw = side * (2 * u - 1) * -1;   /* swaps on every second beat */
    var slide = Math.sin(b * PI), bo = Math.abs(Math.sin(b * PI));
    var up = { sx: 92, sz: 6, e: 100, w: 0 }, low = { sx: 30, sz: 10, e: 88, w: 0 };
    var A = sw > 0 ? up : low, B = sw > 0 ? low : up;
    return { 'hip.ry': -38 * k, 'spine.ry': -20 * k, 'head.ry': 55 * k, 'neck.rz': 10 * slide * k, 'head.rz': 8 * slide * k, 'hip.x': 0.06 * slide * k, 'hip.y': -0.04 - 0.05 * bo,
      'legA.hx': 18 * pos(slide), 'legA.k': 26 * pos(slide), 'legB.hx': 18 * pos(-slide), 'legB.k': 26 * pos(-slide),
      'armA.sx': A.sx, 'armA.sz': A.sz, 'armA.e': A.e, 'armB.sx': B.sx, 'armB.sz': B.sz, 'armB.e': B.e };
  },
  headbang: function (b, k) {
    var d = Math.pow(Math.abs(Math.cos(b * PI)), 3), strum = Math.sin(b * PI * 2);   /* d = 1 on the beat: head down */
    return { 'hip.y': -0.12 - 0.08 * d * k, 'spine.rx': 8 + 26 * d * k, 'neck.rx': 6 + 14 * d * k, 'head.rx': -18 + 48 * d * k, 'hip.ry': -14, 'spine.ry': -6,
      'legA.hx': 26, 'legA.k': 40, 'legA.hz': 14, 'legB.hx': 10, 'legB.k': 34, 'legB.hz': 16,
      'armA.sx': 55, 'armA.sz': 24, 'armA.e': 60, 'armB.sx': 30 + 18 * strum * k, 'armB.sz': 30, 'armB.e': 95 };
  },
  bhangra: function (b, k) {
    var bo = Math.abs(Math.sin(b * PI)), alt = Math.floor(b) % 2, kick = Math.sin((b % 1) * PI), sh = Math.sin(b * PI * 2);
    return { 'hip.y': -0.03 - 0.1 * bo * k, 'spine.rx': -4, 'spine.rz': 5 * sh * k, 'head.rx': -10, 'head.rz': -6 * sh,
      'legA.hx': alt ? 62 * kick * k : 0, 'legA.k': alt ? 80 * kick * k : 10, 'legB.hx': alt ? 0 : 62 * kick * k, 'legB.k': alt ? 10 : 80 * kick * k,
      'armA.sx': 25, 'armA.sz': 145 + 8 * sh, 'armA.e': 15, 'armA.w': 40 * sh, 'armB.sx': 25, 'armB.sz': 145 - 8 * sh, 'armB.e': 15, 'armB.w': -40 * sh };
  },
  robot: function (b, k) {
    var n = Math.floor(b) % 8, f = b % 1, snap = f < 0.15 ? f / 0.15 : 1;       /* snaps into the new pose just after the beat */
    var K = [[0, 90, 0, 0], [35, 90, 0, 0], [35, 0, 90, -20], [0, 0, 90, 0], [-35, 90, 90, 0], [-35, 90, 0, 20], [0, 0, 0, 0], [0, 90, 90, 0]];
    var c = K[n], p = K[(n + 7) % 8], m = function (i) { return p[i] + (c[i] - p[i]) * snap; };
    return { 'head.ry': m(0) * k, 'spine.ry': m(3) * k, 'hip.y': -0.06,
      'armA.sx': m(1), 'armA.sz': 12, 'armA.e': 90, 'armB.sx': m(2), 'armB.sz': 12, 'armB.e': 90,
      'legA.hx': 6, 'legA.k': 12, 'legB.hx': 6, 'legB.k': 12 };
  },
  runningman: function (b, k) {
    var ph = b * PI, s = Math.sin(ph), bo = Math.abs(Math.cos(ph));
    return { 'hip.y': -0.08 - 0.06 * bo * k, 'spine.rx': 10,
      'legA.hx': (s > 0 ? 70 * s : -24 * -s) * k, 'legA.k': (s > 0 ? 85 * s : 12) * k, 'legB.hx': (s < 0 ? 70 * -s : -24 * s) * k, 'legB.k': (s < 0 ? 85 * -s : 12) * k,
      'armA.sx': 20 - 45 * s * k, 'armA.sz': 14, 'armA.e': 95, 'armB.sx': 20 + 45 * s * k, 'armB.sz': 14, 'armB.e': 95, 'head.rx': 6 * bo };
  }
};

/* which moves go with each gang's stage beat (the first is the one he drops with) */
var SETS = {
  antu: ['robot', 'egypt', 'toprock'],                     /* electro */
  kalia: ['headbang', 'toprock', 'runningman'],            /* headbang rock */
  bhairav: ['bhangra', 'toprock', 'egypt'],                /* bhangra dhol */
  teja: ['runningman', 'headbang', 'robot'],               /* fast rolling break */
  raju: ['toprock', 'egypt', 'runningman', 'robot']        /* b-boy break */
};
var PER = 8;   /* beats per move: two bars */

function setOf(gang) { return SETS[gang] || SETS.raju; }
function moveAt(gang, b) { var s = setOf(gang); return s[Math.floor(Math.max(0, b) / PER) % s.length]; }

/* his dance pose at beat b: the move for this pair of bars, eased in from the last over the first beat */
function pose(gang, b, k) {
  k = k === undefined ? 1 : k; b = Math.max(0, b);
  var s = setOf(gang), i = Math.floor(b / PER), cur = MOVES[s[i % s.length]](b, k), stand = posemath.named('stand'), out = posemath.layer(stand, cur, 1, 1, 1, 1);
  var into = b - i * PER;
  if (i > 0 && into < 1) {
    var prev = posemath.layer(stand, MOVES[s[(i - 1) % s.length]](b, k), 1, 1, 1, 1), w = posemath.smooth(into);
    out = posemath.layer(prev, cur, w, w, w, w);
  }
  return out;
}
function single(name, b, k) { return posemath.layer(posemath.named('stand'), MOVES[name](Math.max(0, b), k === undefined ? 1 : k), 1, 1, 1, 1); }

module.exports = { MOVES: MOVES, SETS: SETS, PER: PER, pose: pose, single: single, moveAt: moveAt, setOf: setOf };
