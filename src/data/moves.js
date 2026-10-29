/* data layer: move clips. Each move is a short list of key poses (anticipation, strike, follow-through, recovery).
   A key pose only lists the joints that differ from the guard stance; everything else stays in guard.
   Times are seconds from the start of the move. `ease` shapes the approach to that key:
   'in' slow start (winding up), 'snap' explosive start that settles (strikes), 'io' smooth.
   hit = impact time, cancel = time after which the next press may chain, len = total time.
   Conventions as in poses.js: A = lead side, B = rear side; hip.ry negative = bladed stance, positive turns the rear side forward. */
'use strict';

var GUARD = {
  'hip.y': -0.07, 'hip.ry': -30, 'hip.rx': 3, 'spine.ry': 10, 'spine.rx': 8, 'neck.rx': -3, 'head.rx': 10, 'head.ry': 20,
  'armA.sx': 44, 'armA.sz': 10, 'armA.e': 96, 'armA.pr': -10,
  'armB.sx': 34, 'armB.sz': 12, 'armB.e': 112, 'armB.pr': 10,
  'legA.hx': 24, 'legA.hz': 12, 'legA.k': 22, 'legA.a': -4,
  'legB.hx': -14, 'legB.hz': 16, 'legB.k': 22, 'legB.a': -18, 'legB.t': 24
};

var MOVES = {
  /* lead straight: snaps out from the shoulder, rear hand stays glued to the chin */
  jab: { hit: 0.11, cancel: 0.2, len: 0.34, damage: 1, keys: [
    { t: 0.00, pose: {} },
    { t: 0.06, ease: 'in', pose: { 'hip.ry': -36, 'spine.ry': 4, 'spine.rx': 10, 'armA.sx': 40, 'armA.sz': 12, 'armA.e': 112, 'armA.pr': 0, 'armB.sx': 38, 'armB.e': 116, 'legA.k': 26, 'legA.hx': 22 } },
    { t: 0.11, ease: 'snap', pose: { 'hip.ry': -20, 'spine.ry': 24, 'spine.rx': 12, 'head.ry': 14, 'armA.sx': 90, 'armA.sz': 2, 'armA.e': 5, 'armA.pr': 80, 'armB.sx': 42, 'armB.e': 122, 'legA.k': 36, 'legA.hx': 32 } },
    { t: 0.17, pose: { 'hip.ry': -20, 'spine.ry': 24, 'spine.rx': 12, 'head.ry': 14, 'armA.sx': 92, 'armA.sz': 2, 'armA.e': 8, 'armA.pr': 80, 'armB.sx': 42, 'armB.e': 122, 'legA.k': 36, 'legA.hx': 32 } },
    { t: 0.34, ease: 'io', pose: {} }
  ] },
  /* rear cross: load the back leg, drive the hip round, arm sweeps up and out from the shoulder before it lands */
  cross: { hit: 0.15, cancel: 0.26, len: 0.42, damage: 1.4, keys: [
    { t: 0.00, pose: {} },
    { t: 0.09, ease: 'in', pose: { 'hip.ry': -44, 'spine.ry': -2, 'spine.rx': 12, 'hip.y': -0.11, 'armB.sx': 30, 'armB.sz': 30, 'armB.e': 118, 'armB.pr': -20, 'armA.sx': 62, 'armA.e': 128, 'legB.k': 36, 'legB.hx': -16, 'legA.k': 26 } },
    { t: 0.12, ease: 'snap', pose: { 'hip.ry': -6, 'spine.ry': 22, 'spine.rx': 12, 'hip.y': -0.09, 'armB.sx': 66, 'armB.sz': 16, 'armB.e': 62, 'armB.pr': 30, 'armA.sx': 62, 'armA.e': 130, 'legB.k': 20, 'legB.hx': -10, 'legB.t': 36, 'legA.k': 30 } },
    { t: 0.16, ease: 'snap', pose: { 'hip.ry': 18, 'spine.ry': 20, 'spine.rx': 14, 'head.ry': -6, 'hip.y': -0.08, 'armB.sx': 90, 'armB.sz': 3, 'armB.e': 4, 'armB.pr': 80, 'armA.sx': 60, 'armA.e': 132, 'legB.k': 8, 'legB.hx': -6, 'legB.a': -34, 'legB.t': 38, 'legA.k': 30, 'legA.hx': 28 } },
    { t: 0.24, pose: { 'hip.ry': 18, 'spine.ry': 20, 'spine.rx': 14, 'head.ry': -6, 'hip.y': -0.08, 'armB.sx': 92, 'armB.sz': 3, 'armB.e': 8, 'armB.pr': 80, 'armA.sx': 60, 'armA.e': 132, 'legB.k': 8, 'legB.hx': -6, 'legB.a': -34, 'legB.t': 38, 'legA.k': 30, 'legA.hx': 28 } },
    { t: 0.42, ease: 'io', pose: {} }
  ] },
  /* lead hook: the arm travels in a flat horizontal arc from out wide to across the body */
  hook: { hit: 0.16, cancel: 0.28, len: 0.44, damage: 1.6, keys: [
    { t: 0.00, pose: {} },
    { t: 0.10, ease: 'in', pose: { 'hip.ry': -52, 'spine.ry': -10, 'spine.rz': 4, 'hip.y': -0.12, 'armA.sx': 62, 'armA.sz': 66, 'armA.e': 96, 'armA.pr': 40, 'armB.sx': 50, 'armB.e': 138, 'legA.k': 34, 'legA.hx': 20 } },
    { t: 0.17, ease: 'snap', pose: { 'hip.ry': 6, 'spine.ry': 38, 'spine.rz': -4, 'head.ry': 4, 'hip.y': -0.1, 'armA.sx': 84, 'armA.sz': 12, 'armA.e': 86, 'armA.pr': 90, 'armB.sx': 50, 'armB.e': 138, 'legA.k': 38, 'legA.hx': 28, 'legB.t': 36 } },
    { t: 0.26, pose: { 'hip.ry': 6, 'spine.ry': 38, 'spine.rz': -4, 'head.ry': 4, 'hip.y': -0.1, 'armA.sx': 84, 'armA.sz': 8, 'armA.e': 90, 'armA.pr': 90, 'armB.sx': 50, 'armB.e': 138, 'legA.k': 38, 'legA.hx': 28, 'legB.t': 36 } },
    { t: 0.44, ease: 'io', pose: {} }
  ] },
  /* rear elbow: close range, arm folded tight, whole torso turns into it */
  elbow: { hit: 0.14, cancel: 0.26, len: 0.4, damage: 1.5, keys: [
    { t: 0.00, pose: {} },
    { t: 0.08, ease: 'in', pose: { 'hip.ry': -44, 'spine.ry': -8, 'hip.y': -0.12, 'armB.sx': 78, 'armB.sz': 64, 'armB.e': 148, 'armB.pr': 20, 'armA.sx': 70, 'armA.sz': 14, 'armA.e': 110, 'legA.k': 36, 'legB.k': 30 } },
    { t: 0.14, ease: 'snap', pose: { 'hip.ry': 28, 'spine.ry': 34, 'spine.rx': 14, 'head.ry': -12, 'hip.y': -0.1, 'armB.sx': 52, 'armB.sz': 6, 'armB.e': 146, 'armB.pr': -20, 'armA.sx': 70, 'armA.sz': 14, 'armA.e': 110, 'legB.k': 14, 'legB.t': 40, 'legA.k': 34 } },
    { t: 0.24, pose: { 'hip.ry': 28, 'spine.ry': 34, 'spine.rx': 14, 'head.ry': -12, 'hip.y': -0.1, 'armB.sx': 52, 'armB.sz': 6, 'armB.e': 146, 'armB.pr': -20, 'armA.sx': 70, 'armA.sz': 14, 'armA.e': 110, 'legB.k': 14, 'legB.t': 40, 'legA.k': 34 } },
    { t: 0.40, ease: 'io', pose: {} }
  ] },
  /* rear knee: both hands pull the head down onto the rising knee */
  knee: { hit: 0.17, cancel: 0.3, len: 0.46, damage: 1.7, keys: [
    { t: 0.00, pose: {} },
    { t: 0.09, ease: 'in', pose: { 'hip.ry': -8, 'hip.rx': 0, 'spine.rx': 4, 'hip.y': -0.12, 'armA.sx': 76, 'armA.sz': 18, 'armA.e': 82, 'armB.sx': 46, 'armB.sz': 12, 'armB.e': 136, 'legA.k': 30, 'legA.hx': 14, 'legB.hx': -22, 'legB.k': 40 } },
    { t: 0.17, ease: 'snap', pose: { 'hip.y': -0.02, 'hip.ry': 6, 'hip.rx': 12, 'spine.rx': 26, 'head.rx': 14, 'armA.sx': 66, 'armA.sz': 14, 'armA.e': 84, 'armB.sx': 46, 'armB.sz': 12, 'armB.e': 138, 'legA.hx': 2, 'legA.k': 8, 'legA.hz': 6, 'legB.hx': 104, 'legB.k': 112, 'legB.hz': 4, 'legB.a': 16, 'legB.t': 20 } },
    { t: 0.28, pose: { 'hip.y': -0.02, 'hip.ry': 6, 'hip.rx': 12, 'spine.rx': 26, 'head.rx': 14, 'armA.sx': 66, 'armA.sz': 14, 'armA.e': 84, 'armB.sx': 46, 'armB.sz': 12, 'armB.e': 138, 'legA.hx': 2, 'legA.k': 8, 'legA.hz': 6, 'legB.hx': 100, 'legB.k': 110, 'legB.hz': 4, 'legB.a': 16, 'legB.t': 20 } },
    { t: 0.46, ease: 'io', pose: {} }
  ] },
  /* lead push kick: knee chambers, then the heel drives straight out */
  kick: { hit: 0.2, cancel: 0.34, len: 0.52, damage: 1.8, keys: [
    { t: 0.00, pose: {} },
    { t: 0.12, ease: 'in', pose: { 'hip.ry': -22, 'spine.rx': -2, 'spine.ry': 6, 'hip.y': -0.06, 'armA.sx': 36, 'armA.sz': 36, 'armA.e': 70, 'armB.sx': 54, 'armB.sz': 22, 'armB.e': 100, 'legA.hx': 92, 'legA.k': 108, 'legA.a': 8, 'legB.hx': -2, 'legB.k': 24, 'legB.a': 0, 'legB.t': 0 } },
    { t: 0.2, ease: 'snap', pose: { 'hip.ry': -14, 'hip.rx': -6, 'spine.rx': -8, 'spine.ry': 10, 'hip.y': -0.05, 'armA.sx': 30, 'armA.sz': 40, 'armA.e': 60, 'armB.sx': 54, 'armB.sz': 24, 'armB.e': 96, 'legA.hx': 96, 'legA.k': 8, 'legA.a': -34, 'legA.t': 40, 'legB.hx': 0, 'legB.k': 20, 'legB.a': 0, 'legB.t': 0 } },
    { t: 0.32, pose: { 'hip.ry': -14, 'hip.rx': -6, 'spine.rx': -8, 'spine.ry': 10, 'hip.y': -0.05, 'armA.sx': 30, 'armA.sz': 40, 'armA.e': 60, 'armB.sx': 54, 'armB.sz': 24, 'armB.e': 96, 'legA.hx': 94, 'legA.k': 10, 'legA.a': -30, 'legA.t': 40, 'legB.hx': 0, 'legB.k': 20, 'legB.a': 0, 'legB.t': 0 } },
    { t: 0.52, ease: 'io', pose: {} }
  ] },
  /* rear roundhouse: pivot on the lead foot, hips whip the leg round in an arc, head stays level */
  roundhouse: { hit: 0.26, cancel: 0.44, len: 0.7, damage: 2.2, keys: [
    { t: 0.00, pose: {} },
    { t: 0.14, ease: 'in', pose: { 'hip.ry': -50, 'spine.ry': -6, 'spine.rx': 4, 'hip.y': -0.1, 'armA.sx': 58, 'armA.sz': 14, 'armA.e': 112, 'armB.sx': 40, 'armB.sz': 20, 'armB.e': 120, 'legA.hx': 14, 'legA.k': 30, 'legA.hy': -14, 'legB.hx': 56, 'legB.hz': 46, 'legB.k': 118, 'legB.a': 10 } },
    { t: 0.26, ease: 'snap', pose: { 'hip.ry': 40, 'hip.rz': 8, 'spine.ry': -22, 'spine.rz': 12, 'head.ry': -40, 'hip.y': -0.05, 'armA.sx': 52, 'armA.sz': 22, 'armA.e': 108, 'armB.sx': 24, 'armB.sz': 34, 'armB.e': 80, 'legA.hx': 6, 'legA.k': 14, 'legA.hy': -32, 'legB.hx': 70, 'legB.hz': 84, 'legB.k': 14, 'legB.a': -34, 'legB.t': 30 } },
    { t: 0.38, pose: { 'hip.ry': 46, 'hip.rz': 8, 'spine.ry': -22, 'spine.rz': 12, 'head.ry': -40, 'hip.y': -0.05, 'armA.sx': 52, 'armA.sz': 22, 'armA.e': 108, 'armB.sx': 24, 'armB.sz': 34, 'armB.e': 80, 'legA.hx': 6, 'legA.k': 14, 'legA.hy': -34, 'legB.hx': 62, 'legB.hz': 80, 'legB.k': 24, 'legB.a': -30, 'legB.t': 30 } },
    { t: 0.7, ease: 'io', pose: {} }
  ] }
};

/* ---- face-work moves for the two string sequences ---- */
/* rear hook: the right hand sweeps in from out wide, right to left across the face */
MOVES.hookB = { hit: 0.17, cancel: 0.28, len: 0.44, damage: 1.7, keys: [
  { t: 0.00, pose: {} },
  { t: 0.10, ease: 'in', pose: { 'hip.ry': -58, 'spine.ry': -14, 'spine.rz': -4, 'hip.y': -0.12, 'armB.sx': 62, 'armB.sz': 66, 'armB.e': 96, 'armB.pr': 40, 'armA.sx': 52, 'armA.sz': 14, 'armA.e': 124, 'legB.k': 34, 'legB.hx': -16, 'legA.k': 28 } },
  { t: 0.17, ease: 'snap', pose: { 'hip.ry': 22, 'spine.ry': 40, 'spine.rz': 4, 'head.ry': -8, 'hip.y': -0.1, 'armB.sx': 84, 'armB.sz': 12, 'armB.e': 86, 'armB.pr': 90, 'armA.sx': 52, 'armA.sz': 14, 'armA.e': 124, 'legB.k': 20, 'legB.hx': -8, 'legB.t': 36, 'legA.k': 34, 'legA.hx': 28 } },
  { t: 0.26, pose: { 'hip.ry': 24, 'spine.ry': 40, 'spine.rz': 4, 'head.ry': -8, 'hip.y': -0.1, 'armB.sx': 84, 'armB.sz': 8, 'armB.e': 90, 'armB.pr': 90, 'armA.sx': 52, 'armA.sz': 14, 'armA.e': 124, 'legB.k': 20, 'legB.hx': -8, 'legB.t': 36, 'legA.k': 34, 'legA.hx': 28 } },
  { t: 0.44, ease: 'io', pose: {} }
] };
/* axe kick: the rear leg swings up straight, then the heel chops down onto the head from above */
MOVES.axeKick = { hit: 0.33, cancel: 0.5, len: 0.74, damage: 2.2, keys: [
  { t: 0.00, pose: {} },
  { t: 0.15, ease: 'in', pose: { 'hip.ry': -26, 'spine.rx': 0, 'hip.y': -0.05, 'armA.sx': 60, 'armA.sz': 24, 'armA.e': 100, 'armB.sx': 40, 'armB.sz': 30, 'armB.e': 104, 'legA.hx': 8, 'legA.k': 14, 'legB.hx': 96, 'legB.k': 74, 'legB.a': 8 } },
  { t: 0.28, ease: 'io', pose: { 'hip.ry': -20, 'hip.rx': -8, 'spine.rx': -14, 'hip.y': -0.02, 'armA.sx': 50, 'armA.sz': 44, 'armA.e': 90, 'armB.sx': 30, 'armB.sz': 48, 'armB.e': 90, 'legA.hx': 4, 'legA.k': 8, 'legB.hx': 122, 'legB.k': 6, 'legB.a': 12 } },
  { t: 0.38, ease: 'snap', pose: { 'hip.ry': -16, 'hip.rx': 8, 'spine.rx': 20, 'head.rx': 12, 'hip.y': -0.06, 'armA.sx': 56, 'armA.sz': 36, 'armA.e': 96, 'armB.sx': 36, 'armB.sz': 40, 'armB.e': 96, 'legA.hx': 8, 'legA.k': 20, 'legB.hx': 28, 'legB.k': 6, 'legB.a': 22 } },
  { t: 0.5, pose: { 'hip.ry': -16, 'hip.rx': 8, 'spine.rx': 20, 'head.rx': 12, 'hip.y': -0.07, 'armA.sx': 56, 'armA.sz': 36, 'armA.e': 96, 'armB.sx': 36, 'armB.sz': 40, 'armB.e': 96, 'legA.hx': 8, 'legA.k': 24, 'legB.hx': 24, 'legB.k': 8, 'legB.a': 22 } },
  { t: 0.74, ease: 'io', pose: {} }
] };
/* uppercut: sink low, then drive up through the legs and hip so the fist rises under the chin */
MOVES.uppercut = { hit: 0.2, cancel: 0.32, len: 0.5, damage: 2.0, keys: [
  { t: 0.00, pose: {} },
  { t: 0.11, ease: 'in', pose: { 'hip.ry': -50, 'hip.y': -0.22, 'spine.rx': 16, 'spine.ry': -12, 'armB.sx': 8, 'armB.sz': 18, 'armB.e': 100, 'armB.pr': -20, 'armA.sx': 60, 'armA.sz': 12, 'armA.e': 122, 'legB.k': 46, 'legB.hx': -18, 'legA.k': 40, 'legA.hx': 24 } },
  { t: 0.2, ease: 'snap', pose: { 'hip.ry': 14, 'hip.y': 0, 'hip.rx': -2, 'spine.rx': -6, 'spine.ry': 22, 'head.rx': -6, 'armB.sx': 62, 'armB.sz': 8, 'armB.e': 92, 'armB.pr': 10, 'armA.sx': 60, 'armA.sz': 12, 'armA.e': 124, 'legB.k': 6, 'legB.hx': -6, 'legB.t': 38, 'legA.k': 18, 'legA.hx': 20 } },
  { t: 0.3, pose: { 'hip.ry': 16, 'hip.y': 0, 'hip.rx': -2, 'spine.rx': -6, 'spine.ry': 22, 'head.rx': -6, 'armB.sx': 70, 'armB.sz': 8, 'armB.e': 96, 'armB.pr': 10, 'armA.sx': 60, 'armA.sz': 12, 'armA.e': 124, 'legB.k': 6, 'legB.hx': -6, 'legB.t': 38, 'legA.k': 18, 'legA.hx': 20 } },
  { t: 0.5, ease: 'io', pose: {} }
] };

/* the block counter: a quick cross straight through the enemy's guard - a small reward, not a special */
MOVES.counterCross = JSON.parse(JSON.stringify(MOVES.cross)); MOVES.counterCross.damage = 2.2;

/* ---- guitar counters. gtr.on 0 = on the back, 1 = held in front (spine space, voxel units, YXZ degrees); gtr.px/py/pz is where the neck grip sits,
   gtr.gy how far up the neck that grip is, gtr.ya / gtr.yb where the lead and rear hands hold the guitar. Hands follow it with arm IK. ---- */
var STANCE = { 'hip.y': -0.13, 'hip.ry': -40, 'hip.rx': 4, 'spine.rx': 8, 'legA.hx': 26, 'legA.hz': 18, 'legA.k': 38, 'legB.hx': -16, 'legB.hz': 20, 'legB.k': 38, 'legB.a': -14 };
function X(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
var HELD = { 'gtr.on': 1, 'gtr.gy': 14, 'gtr.ya': 14, 'gtr.yb': -2, 'gtr.px': 10, 'gtr.py': 8, 'gtr.pz': 14, 'gtr.rx': 0, 'gtr.ry': -23, 'gtr.rz': -90 };
var BAT = { 'gtr.on': 1, 'gtr.gy': 18, 'gtr.ya': 17, 'gtr.yb': 21, 'gtr.rx': 0, 'gtr.ry': 0, 'gtr.rz': 0 };

MOVES.counterBoom = { counter: true, tempo: 1.25, cam: [
  { t: 0.0, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 }, { t: 0.55, dist: 3.4, h: 1.5, look: 1.35, fov: 38, rel: 0.5 },
  { t: 0.98, dist: 2.4, h: 1.3, look: 1.3, fov: 30, rel: 0.3 }, { t: 1.12, dist: 9.0, h: 3.2, look: 1.2, fov: 62, rel: 0.6 }, { t: 1.95, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 } ], hit: 1.0, hits: [1.0], cancel: 1.45, len: 1.95, fx: [{ t: 1.0, kind: 'boom' }], damage: 3, keys: [
  { t: 0.00, pose: { 'gtr.on': 0 } },
  { t: 0.32, ease: 'in', pose: X(STANCE, { 'gtr.on': 0.5, 'gtr.gy': 14, 'gtr.ya': 14, 'gtr.yb': -2, 'gtr.px': 6, 'gtr.py': 16, 'gtr.pz': 4, 'gtr.rx': 0, 'gtr.ry': -10, 'gtr.rz': -60, 'armA.sx': 40, 'armB.sx': 60 }) },
  { t: 0.62, ease: 'io', pose: X(STANCE, HELD) },
  { t: 0.88, ease: 'in', pose: X(STANCE, X(HELD, { 'hip.y': -0.16, 'spine.rx': -10, 'spine.ry': -24, 'head.rx': -8, 'gtr.px': 6, 'gtr.py': 14, 'gtr.pz': 7, 'gtr.ry': 8, 'gtr.rz': -78, 'gtr.rx': -8 })) },
  { t: 1.0, ease: 'snap', pose: X(STANCE, X(HELD, { 'hip.y': -0.2, 'hip.ry': -12, 'spine.rx': 26, 'spine.ry': 18, 'head.rx': 14, 'legA.hx': 34, 'legA.k': 46, 'gtr.px': 12, 'gtr.py': 6, 'gtr.pz': 22, 'gtr.ry': -52, 'gtr.rz': -94, 'gtr.rx': 18 })) },
  { t: 1.45, pose: X(STANCE, X(HELD, { 'hip.y': -0.19, 'hip.ry': -12, 'spine.rx': 24, 'spine.ry': 16, 'head.rx': 12, 'legA.hx': 34, 'legA.k': 46, 'gtr.px': 12, 'gtr.py': 6, 'gtr.pz': 20, 'gtr.ry': -52, 'gtr.rz': -94, 'gtr.rx': 18 })) },
  { t: 1.95, ease: 'io', pose: { 'gtr.on': 0 } }
] };

MOVES.counterSmash = { counter: true, tempo: 1.2, cam: [
  { t: 0.0, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 }, { t: 0.4, dist: 4.4, h: 2.3, look: 1.4, fov: 42, rel: 2.7 },
  { t: 1.4, dist: 3.8, h: 1.8, look: 1.2, fov: 38, rel: 3.5 }, { t: 2.1, dist: 3.4, h: 1.6, look: 1.0, fov: 36, rel: 0.5 }, { t: 2.9, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 } ], hit: 0.62, hits: [0.62, 1.35, 2.05], cancel: 2.3, len: 2.9, damage: 5, keys: [
  { t: 0.00, pose: { 'gtr.on': 0 } },
  { t: 0.34, ease: 'in', pose: X(STANCE, X(BAT, { 'gtr.px': 0, 'gtr.py': 34, 'gtr.pz': 6, 'gtr.rx': 135, 'spine.rx': -12, 'hip.y': -0.1, 'armA.sx': 100, 'armB.sx': 100 })) },
  { t: 0.62, ease: 'snap', pose: X(STANCE, X(BAT, { 'gtr.px': 0, 'gtr.py': 12, 'gtr.pz': 9, 'gtr.rx': -60, 'spine.rx': 30, 'hip.rx': 8, 'hip.y': -0.17, 'head.rx': 14, 'legA.hx': 36, 'legA.k': 48 })) },
  { t: 0.85, pose: X(STANCE, X(BAT, { 'gtr.px': 0, 'gtr.py': 12, 'gtr.pz': 9, 'gtr.rx': -60, 'spine.rx': 30, 'hip.rx': 8, 'hip.y': -0.17, 'head.rx': 14, 'legA.hx': 36, 'legA.k': 48 })) },
  { t: 1.12, ease: 'in', pose: X(STANCE, X(BAT, { 'gtr.px': 3, 'gtr.py': 16, 'gtr.pz': 8, 'gtr.rz': -90, 'gtr.ry': -45, 'gtr.rx': 0, 'spine.ry': -42, 'hip.ry': -62, 'hip.y': -0.15 })) },
  { t: 1.35, ease: 'snap', pose: X(STANCE, X(BAT, { 'gtr.px': 3, 'gtr.py': 16, 'gtr.pz': 8, 'gtr.rz': -90, 'gtr.ry': 156, 'gtr.rx': 0, 'spine.ry': 46, 'hip.ry': 18, 'hip.y': -0.15 })) },
  { t: 1.55, pose: X(STANCE, X(BAT, { 'gtr.px': 3, 'gtr.py': 16, 'gtr.pz': 8, 'gtr.rz': -90, 'gtr.ry': 160, 'gtr.rx': 0, 'spine.ry': 44, 'hip.ry': 16, 'hip.y': -0.15 })) },
  { t: 1.82, ease: 'in', pose: X(STANCE, X(BAT, { 'gtr.px': 0, 'gtr.py': 34, 'gtr.pz': 6, 'gtr.rx': 135, 'spine.rx': -14, 'hip.y': -0.1, 'armA.sx': 100 })) },
  { t: 2.05, ease: 'snap', pose: X(STANCE, X(BAT, { 'gtr.px': 0, 'gtr.py': 11, 'gtr.pz': 10, 'gtr.rx': -62, 'spine.rx': 34, 'hip.rx': 10, 'hip.y': -0.19, 'head.rx': 16, 'legA.hx': 42, 'legA.k': 54 })) },
  { t: 2.25, pose: X(STANCE, X(BAT, { 'gtr.px': 0, 'gtr.py': 11, 'gtr.pz': 10, 'gtr.rx': -62, 'spine.rx': 34, 'hip.rx': 10, 'hip.y': -0.19, 'head.rx': 16, 'legA.hx': 42, 'legA.k': 54 })) },
  { t: 2.9, ease: 'io', pose: { 'gtr.on': 0 } }
] };

MOVES.counterWhirl = { counter: true, tempo: 1.2, cam: [
  { t: 0.0, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 }, { t: 0.5, dist: 3.2, h: 1.3, look: 1.4, fov: 36, rel: 0.4 },
  { t: 0.7, dist: 5.2, h: 2.6, look: 1.2, fov: 52, rel: 0.4 }, { t: 1.75, dist: 5.6, h: 2.8, look: 1.2, fov: 54, rel: 0.4 + 6.28 }, { t: 2.4, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 + 6.28 } ], hit: 0.9, hits: [0.85, 1.05, 1.25, 1.45], cancel: 2.0, len: 2.4, damage: 4, keys: [
  { t: 0.00, pose: { 'gtr.on': 0 } },
  { t: 0.42, ease: 'io', pose: X(STANCE, { 'gtr.on': 1, 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 6, 'gtr.py': 18, 'gtr.pz': 14, 'gtr.rx': 8, 'gtr.ry': 180, 'gtr.rz': -90, 'hip.y': -0.14, 'hip.ry': -30 }) },
  { t: 0.62, ease: 'in', pose: X(STANCE, { 'gtr.on': 1, 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 6, 'gtr.py': 18, 'gtr.pz': 14, 'gtr.rx': 8, 'gtr.ry': 180, 'gtr.rz': -90, 'hip.y': -0.14, 'hip.ry': -70, 'spine.ry': -12 }) },
  { t: 1.75, ease: 'io', pose: X(STANCE, { 'gtr.on': 1, 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 6, 'gtr.py': 18, 'gtr.pz': 14, 'gtr.rx': 8, 'gtr.ry': 180, 'gtr.rz': -90, 'hip.y': -0.12, 'hip.ry': 650, 'spine.ry': 0 }) },
  { t: 2.4, ease: 'io', pose: { 'gtr.on': 0, 'hip.ry': 690 } }
] };


/* ---- the rage finisher: Toofan rips the guitar off his back, coils, and spins three full turns like a rotor, then drives it into the ground ---- */
var COIL = { 'gtr.on': 1, 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 4, 'gtr.py': 18, 'gtr.pz': 12, 'gtr.rx': 8, 'gtr.ry': 0, 'gtr.rz': -90 };
var ROTOR = { 'gtr.on': 1, 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 6, 'gtr.py': 18, 'gtr.pz': 14, 'gtr.rx': 8, 'gtr.ry': 180, 'gtr.rz': -90 };
MOVES.finisherWhirl = { counter: true, finisher: true, tempo: 1, hit: 1.9, hits: [1.9, 2.2, 2.5, 2.8, 3.1, 3.4], cancel: 4.6, len: 5.2, damage: 9,
  fx: [{ t: 1.5, kind: 'whirl' }, { t: 1.75, kind: 'whirl' }, { t: 2.0, kind: 'whirl' }, { t: 2.25, kind: 'whirl' }, { t: 2.5, kind: 'whirl' }, { t: 2.75, kind: 'whirl' }, { t: 3.0, kind: 'whirl' }, { t: 3.4, kind: 'slam' }],
  cam: [
    { t: 0.0, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 },
    { t: 0.6, dist: 3.8, h: 0.9, look: 1.5, fov: 42, rel: 0.5 },         /* low heroic shot as the guitar comes off his back */
    { t: 1.35, dist: 2.5, h: 1.45, look: 1.45, fov: 32, rel: 0.25 },     /* slow push-in on his face while he coils */
    { t: 1.9, dist: 6.4, h: 3.4, look: 1.2, fov: 52, rel: 1.8 },         /* whip out and up as the spin begins */
    { t: 3.0, dist: 8.8, h: 4.4, look: 1.2, fov: 60, rel: 1.8 + 6.1 },   /* wide orbit round the cyclone */
    { t: 3.4, dist: 4.4, h: 1.5, look: 0.9, fov: 34, rel: 0.7 + 6.28 },  /* snap in on the slam */
    { t: 4.3, dist: 4.8, h: 1.8, look: 1.0, fov: 38, rel: 0.7 + 6.28 },
    { t: 5.2, dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 + 6.28 }
  ],
  keys: [
  { t: 0.00, pose: { 'gtr.on': 0 } },
  { t: 0.55, ease: 'io', pose: X(STANCE, { 'gtr.on': 1, 'gtr.gy': 14, 'gtr.ya': 15, 'gtr.yb': 19, 'gtr.px': 0, 'gtr.py': 32, 'gtr.pz': 4, 'gtr.rx': 180, 'gtr.ry': 0, 'gtr.rz': 0, 'spine.rx': -12, 'head.rx': -12, 'hip.y': -0.13 }) },
  { t: 0.95, ease: 'io', pose: X(STANCE, X(COIL, { 'hip.y': -0.24, 'hip.ry': -75, 'spine.ry': -48, 'spine.rx': 14, 'legA.k': 60, 'legB.k': 58, 'legA.hz': 24, 'legB.hz': 26, 'head.rx': 8 })) },
  { t: 1.45, ease: 'io', pose: X(STANCE, X(COIL, { 'hip.y': -0.26, 'hip.ry': -80, 'spine.ry': -52, 'spine.rx': 16, 'legA.k': 66, 'legB.k': 62, 'legA.hz': 26, 'legB.hz': 28, 'head.rx': 8 })) },
  { t: 1.85, ease: 'in', pose: X(STANCE, X(ROTOR, { 'hip.y': -0.2, 'hip.ry': 40, 'spine.ry': 0, 'spine.rx': 8, 'legA.k': 44, 'legB.k': 44, 'legA.hz': 26, 'legB.hz': 26 })) },
  { t: 3.0, ease: 'io', pose: X(STANCE, X(ROTOR, { 'hip.y': -0.14, 'hip.ry': 1005, 'spine.ry': 0, 'spine.rx': 6, 'spine.rz': 10, 'legA.k': 34, 'legB.k': 34, 'legA.hz': 24, 'legB.hz': 24 })) },
  { t: 3.4, ease: 'snap', pose: X(STANCE, X(HELD, { 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 0, 'gtr.py': 12, 'gtr.pz': 16, 'gtr.rx': -78, 'gtr.ry': 0, 'gtr.rz': 0, 'hip.y': -0.3, 'hip.ry': 1030, 'hip.rx': 10, 'spine.rx': 40, 'head.rx': 16, 'legA.hx': 42, 'legA.k': 78, 'legB.k': 48 })) },
  { t: 4.3, pose: X(STANCE, X(HELD, { 'gtr.gy': 20, 'gtr.ya': 19, 'gtr.yb': 23, 'gtr.px': 0, 'gtr.py': 12, 'gtr.pz': 16, 'gtr.rx': -78, 'gtr.ry': 0, 'gtr.rz': 0, 'hip.y': -0.28, 'hip.ry': 1030, 'hip.rx': 10, 'spine.rx': 34, 'head.rx': 10, 'legA.hx': 42, 'legA.k': 74, 'legB.k': 48 })) },
  { t: 5.2, ease: 'io', pose: { 'gtr.on': 0, 'hip.ry': 1050 } }
] };


/* ---- special-move cameras: wide and high enough to see the hero AND the men he is hitting; the director also leans the view toward the group.
   (counter times are authored before the tempo pass below) ---- */
var CN = { dist: 6.6, h: 6.4, look: 1.0, fov: 46, rel: 3.14 };
function K(t, dist, h, look, fov, rel) { return { t: t, dist: dist, h: h, look: look, fov: fov, rel: rel }; }
MOVES.counterBoom.cam = [X(CN, { t: 0 }), K(0.5, 5.6, 2.3, 1.3, 44, 2.6), K(1.0, 6.6, 2.7, 1.3, 50, 2.3), K(1.5, 8.2, 3.8, 1.2, 56, 2.6), X(CN, { t: 1.95 })];
MOVES.counterSmash.cam = [X(CN, { t: 0 }), K(0.4, 5.6, 2.7, 1.2, 46, 2.5), K(1.4, 6.3, 3.1, 1.2, 48, 2.0), K(2.1, 5.9, 2.5, 1.1, 44, 1.4), X(CN, { t: 2.9 })];
MOVES.counterWhirl.cam = [X(CN, { t: 0 }), K(0.5, 6.0, 3.2, 1.2, 50, 2.7), K(1.75, 7.6, 4.3, 1.2, 56, 5.8), X(CN, { t: 2.4, rel: 6.3 })];
MOVES.finisherWhirl.cam = [X(CN, { t: 0 }), K(0.6, 5.8, 1.8, 1.2, 46, 2.4),            /* low heroic shot from behind-side as the guitar comes off his back */
  K(1.35, 6.5, 2.8, 1.2, 44, 1.5),                                                       /* three-quarter view of the coil, the men around him in frame */
  K(1.9, 8.5, 6.8, 1.0, 52, 1.5), K(3.0, 9.5, 7.6, 0.9, 56, 4.7),                       /* high half-orbit: the whole ring of enemies and the cyclone */
  K(3.4, 7.5, 3.0, 0.9, 48, 4.7), K(4.3, 8.0, 3.5, 1.0, 48, 4.7), X(CN, { t: 5.2, rel: 6.3 })];

/* attack moves get a slower, heavier tempo so every phase has weight; counters are authored in real time */
var TEMPO = 1.75;
var TEMPO_BY = { counterCross: 1.6, hookB: 1.7, axeKick: 1.4, uppercut: 1.7, jab: 1.9, cross: 1.9, hook: 1.8, elbow: 1.7, knee: 1.7, kick: 1.7, roundhouse: 1.5 };   /* seconds scale: quick enough to feel like a brawl, slow enough to read */   /* seconds scale: strikes need time to read */

/* ---- detailing pass: every attack gets a weight-shift lunge on the strike, a small preparation before the wind-up,
   a follow-through past the impact and a two-step recovery with a settle, so nothing snaps between key poses ---- */
var LUNGE = { counterCross: 0.09, hookB: 0.07, axeKick: -0.02, uppercut: 0.06, jab: 0.05, cross: 0.08, hook: 0.07, elbow: 0.06, knee: 0.08, kick: -0.04, roundhouse: -0.03 };
function poseAt(k, name) { var v = k.pose[name]; return v === undefined ? (GUARD[name] === undefined ? 0 : GUARD[name]) : v; }
function mixP(a, b, t) {
  var o = {}, names = {}, k; for (k in a.pose) names[k] = 1; for (k in b.pose) names[k] = 1;
  for (k in names) if (k.indexOf('gtr.') !== 0) { var va = poseAt(a, k), vb = poseAt(b, k); o[k] = va + (vb - va) * t; }
  return o;
}
Object.keys(MOVES).forEach(function (n) {
  var m = MOVES[n]; if (m.counter) return;
  var keys = m.keys, ks = keys.slice(), ant = ks[1], last = ks[ks.length - 1], hold = ks[ks.length - 2], out = [ks[0]], i;
  /* preparation: a small dip and the far shoulder drops before the main wind-up */
  out.push({ t: ant.t * 0.5, ease: 'io', pose: X(mixP(ks[0], ant, 0.3), { 'hip.y': -0.095, 'head.rx': 12, 'spine.rz': -2.5 }) });
  for (i = 1; i < ks.length - 1; i++) {
    var kk = ks[i], isStrike = kk.ease === 'snap';
    if (isStrike && LUNGE[n]) kk = { t: kk.t, ease: kk.ease, pose: X(kk.pose, { 'hip.z': LUNGE[n] }) };
    if (kk === ks[ks.length - 2]) kk = { t: kk.t, ease: kk.ease, pose: X(kk.pose, { 'hip.z': LUNGE[n] || 0 }) };
    out.push(kk);
  }
  var span = last.t - hold.t, dir = poseAt(hold, 'spine.ry') - GUARD['spine.ry'] > 0 ? 1 : -1;
  out.push({ t: hold.t + span * 0.22, ease: 'io', pose: X(hold.pose, { 'spine.ry': poseAt(hold, 'spine.ry') + 6 * dir, 'hip.ry': poseAt(hold, 'hip.ry') + 5 * dir, 'head.ry': poseAt(hold, 'head.ry') + 4 * dir, 'hip.z': (LUNGE[n] || 0) * 0.8 }) });
  out.push({ t: hold.t + span * 0.6, ease: 'io', pose: X(mixP(hold, last, 0.7), { 'hip.y': -0.045, 'hip.z': (LUNGE[n] || 0) * 0.25 }) });
  out.push({ t: hold.t + span * 0.82, ease: 'io', pose: X(mixP(hold, last, 0.93), { 'hip.y': -0.06 }) });
  out.push(last);
  m.keys = out;
});
Object.keys(MOVES).forEach(function (n) {
  var m = MOVES[n], f = m.tempo || TEMPO;
  if (f === 1) return;
  m.hit *= f; m.cancel *= f; m.len *= f; m.keys.forEach(function (k) { k.t *= f; });
  if (m.hits) m.hits = m.hits.map(function (x) { return x * f; });
  if (m.fx) m.fx.forEach(function (x) { x.t *= f; });
  if (m.cam) m.cam.forEach(function (x) { x.t *= f; });
});

/* Double Dragon style string: two punches, a close-range knee, an elbow, and the kick that ends it */
/* The fight string. Against a guard the first two blows are soaked up; after that the face work starts:
   jab, jab from the other side, uppercut - then a hand blow and a leg blow, in either order. Everything varies a little each fight. */
var HANDS = ['elbow', 'elbow', 'cross'], LEGS = ['axeKick', 'knee', 'roundhouse', 'knee'];
function makeString(rand) {                                  /* rand: a () => 0..1 supplied by the caller */
  var hooks = rand() < 0.5 ? ['hookB', 'hook'] : ['hook', 'hookB'];
  var hand = HANDS[Math.floor(rand() * HANDS.length) % HANDS.length], leg = LEGS[Math.floor(rand() * LEGS.length) % LEGS.length];
  return ['jab', 'cross'].concat(hooks, ['uppercut'], rand() < 0.5 ? [hand, leg] : [leg, hand]);
}
var COMBO = makeString(function () { return 0; });
var SEQS = [COMBO];
var MOVE_LABELS = [['counterBoom', 'Sonic boom'], ['counterSmash', 'Guitar smash'], ['counterWhirl', 'Guitar whirl'], ['finisherWhirl', 'Rage finisher'], ['counterCross', 'Counter cross'], ['hookB', 'Right hook'], ['axeKick', 'Axe kick'], ['uppercut', 'Uppercut'], ['jab', 'Jab'], ['cross', 'Cross'], ['hook', 'Hook'], ['elbow', 'Elbow'], ['knee', 'Knee'], ['kick', 'Push kick'], ['roundhouse', 'Roundhouse']];

/* ---- moves from the saddle. Only the arms (and one leg for kicks) move: the hips stay on the seat and the other hand stays on the bar;
   the rider's shoulders are turned toward the man by the view. Authored for a man on the RIGHT (rear hand armB, right leg legB); the left-hand
   versions are mirrored. L/R in a name is the side the man stands on. ---- */
function mirrorPose(pz) {
  var o = {}, k, n, v;
  for (k in pz) { n = k.replace(/^(arm|leg)([AB])\./, function (m, a, b) { return a + (b === 'A' ? 'B' : 'A') + '.'; }); v = pz[k]; if (/\.(pr|sy)$/.test(n)) v = -v; o[n] = v; }
  return o;
}
function cloneMove(m, mirror, keepLegs) {
  var c = JSON.parse(JSON.stringify(m));
  c.keys.forEach(function (ky) {
    var o = {}, k; for (k in ky.pose) { if (/^(hip\.|spine\.ry|spine\.rz|head\.ry|head\.rz)/.test(k)) continue; if (!keepLegs && /^leg/.test(k)) continue; o[k] = ky.pose[k]; }
    ky.pose = mirror ? mirrorPose(o) : o;
  });
  c.bike = true; return c;
}
var BK_SRC = { Jab: ['jab', false], Hook: ['hook', false], Cross: ['cross', true], Elbow: ['elbow', true] };       /* [source clip, uses the rear hand] */
Object.keys(BK_SRC).forEach(function (n) {
  var src = MOVES[BK_SRC[n][0]], rear = BK_SRC[n][1];
  MOVES['bk' + n + 'R'] = cloneMove(src, !rear); MOVES['bk' + n + 'L'] = cloneMove(src, rear);
});
MOVES.bkKickR = { bike: true, legs: 'legB', hit: 0.2, cancel: 0.36, len: 0.55, damage: 1.8, keys: [
  { t: 0.00, pose: {} },
  { t: 0.12, ease: 'in', pose: { 'legB.hx': 64, 'legB.hz': 34, 'legB.k': 104, 'legB.a': 6, 'spine.rx': 6 } },
  { t: 0.2, ease: 'snap', pose: { 'legB.hx': 36, 'legB.hz': 78, 'legB.k': 12, 'legB.a': -30, 'legB.t': 30, 'spine.rx': 4 } },
  { t: 0.32, pose: { 'legB.hx': 38, 'legB.hz': 76, 'legB.k': 14, 'legB.a': -28, 'legB.t': 30, 'spine.rx': 4 } },
  { t: 0.55, ease: 'io', pose: {} }
] };
MOVES.bkKickL = cloneMove(MOVES.bkKickR, true, true); MOVES.bkKickL.legs = 'legA';
/* counters: an elbow first; a sweep once the man is hurt; two men at once earn the double sweep */
MOVES.bkCElbowR = cloneMove(MOVES.elbow, false); MOVES.bkCElbowR.counter = true; MOVES.bkCElbowR.damage = 2.4;
MOVES.bkCElbowL = cloneMove(MOVES.elbow, true); MOVES.bkCElbowL.counter = true; MOVES.bkCElbowL.damage = 2.4;
MOVES.bkSweepR = { bike: true, counter: true, hit: 0.24, cancel: 0.45, len: 0.58, damage: 3.4, keys: [
  { t: 0.00, pose: {} },
  { t: 0.14, ease: 'in', pose: { 'armB.sx': 72, 'armB.sz': 78, 'armB.e': 146, 'armB.pr': 20, 'spine.rx': 12 } },
  { t: 0.24, ease: 'snap', pose: { 'armB.sx': 62, 'armB.sz': 8, 'armB.e': 122, 'armB.pr': -30, 'spine.rx': 14 } },
  { t: 0.34, pose: { 'armB.sx': 62, 'armB.sz': 6, 'armB.e': 122, 'armB.pr': -30, 'spine.rx': 14 } },
  { t: 0.58, ease: 'io', pose: {} }
] };
MOVES.bkSweepL = cloneMove(MOVES.bkSweepR, true, true); MOVES.bkSweepL.counter = true;
MOVES.bkDouble = { bike: true, counter: true, hit: 0.22, hits: [0.22, 0.42], cancel: 0.62, len: 0.8, damage: 4.2, keys: [
  { t: 0.00, pose: {} },
  { t: 0.14, ease: 'in', pose: { 'armA.sx': 72, 'armA.sz': 76, 'armA.e': 146, 'armB.sx': 72, 'armB.sz': 76, 'armB.e': 146, 'spine.rx': 10 } },
  { t: 0.22, ease: 'snap', pose: { 'armA.sx': 64, 'armA.sz': 8, 'armA.e': 122, 'armB.sx': 70, 'armB.sz': 84, 'armB.e': 140, 'spine.rx': 12 } },
  { t: 0.32, ease: 'io', pose: { 'armA.sx': 72, 'armA.sz': 76, 'armA.e': 146, 'armB.sx': 72, 'armB.sz': 76, 'armB.e': 146, 'spine.rx': 10 } },
  { t: 0.42, ease: 'snap', pose: { 'armB.sx': 64, 'armB.sz': 8, 'armB.e': 122, 'armA.sx': 70, 'armA.sz': 84, 'armA.e': 140, 'spine.rx': 12 } },
  { t: 0.8, ease: 'io', pose: {} }
] };

var COUNTERS = ['counterBoom', 'counterSmash', 'counterWhirl'];
var FINISHER = 'finisherWhirl';
module.exports = { GUARD: GUARD, MOVES: MOVES, COMBO: COMBO, SEQS: SEQS, makeString: makeString, COUNTERS: COUNTERS, FINISHER: FINISHER, MOVE_LABELS: MOVE_LABELS };
