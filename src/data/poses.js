/* data layer: pose library, sequences and joint ranges. Angles are degrees, offsets are metres.
   A = lead side, B = rear side. Missing keys mean 0, which is the arms-down standing pose.
   Arm keys: sx pitch forward, sz out to the side, sy twist, e elbow bend, pr forearm twist, w wrist.
   Leg keys: hx swing forward, hz out to the side, hy twist, k knee bend, a ankle (toes up +), t toes bend up. */
'use strict';

var JOINTS = [
  { group: 'Hips', rows: [['hip.y', 'Height', -0.8, 0.2, 0.01, 'm'], ['hip.x', 'Shift side', -0.3, 0.3, 0.01, 'm'], ['hip.z', 'Shift forward', -0.4, 0.4, 0.01, 'm'],
                          ['hip.rx', 'Lean', -100, 100, 1], ['hip.ry', 'Turn', -180, 180, 1], ['hip.rz', 'Tilt', -60, 60, 1]] },
  { group: 'Torso and head', rows: [['spine.rx', 'Torso lean', -40, 70, 1], ['spine.ry', 'Torso twist', -60, 60, 1], ['spine.rz', 'Torso tilt', -35, 35, 1],
                          ['neck.rx', 'Neck nod', -35, 45, 1], ['neck.ry', 'Neck turn', -60, 60, 1], ['neck.rz', 'Neck tilt', -30, 30, 1],
                          ['head.rx', 'Head nod', -40, 45, 1], ['head.ry', 'Head turn', -60, 60, 1], ['head.rz', 'Head tilt', -30, 30, 1]] },
  { group: 'Lead arm', rows: [['armA.sx', 'Shoulder forward', -70, 185, 1], ['armA.sz', 'Shoulder out', -40, 170, 1], ['armA.sy', 'Upper arm twist', -90, 90, 1],
                          ['armA.e', 'Elbow bend', 0, 150, 1], ['armA.pr', 'Forearm twist', -90, 90, 1], ['armA.w', 'Wrist', -70, 70, 1]] },
  { group: 'Rear arm', rows: [['armB.sx', 'Shoulder forward', -70, 185, 1], ['armB.sz', 'Shoulder out', -40, 170, 1], ['armB.sy', 'Upper arm twist', -90, 90, 1],
                          ['armB.e', 'Elbow bend', 0, 150, 1], ['armB.pr', 'Forearm twist', -90, 90, 1], ['armB.w', 'Wrist', -70, 70, 1]] },
  { group: 'Guitar', rows: [['gtr.on', 'Held (0 = on back)', 0, 1, 0.01], ['gtr.px', 'Grip side', -30, 40, 1], ['gtr.py', 'Grip height', -10, 50, 1], ['gtr.pz', 'Grip forward', -20, 40, 1],
                          ['gtr.rx', 'Tilt x', -180, 180, 1], ['gtr.ry', 'Turn y', -180, 180, 1], ['gtr.rz', 'Roll z', -180, 180, 1], ['gtr.gy', 'Grip on neck', -10, 30, 1],
                          ['gtr.ya', 'Lead hand', -10, 32, 1], ['gtr.yb', 'Rear hand', -10, 32, 1]] },
  { group: 'Lead leg', rows: [['legA.hx', 'Thigh forward', -40, 125, 1], ['legA.hz', 'Thigh out', -25, 90, 1], ['legA.hy', 'Thigh twist', -50, 50, 1],
                          ['legA.k', 'Knee bend', 0, 150, 1], ['legA.a', 'Ankle', -50, 30, 1], ['legA.t', 'Toes', 0, 60, 1]] },
  { group: 'Rear leg', rows: [['legB.hx', 'Thigh forward', -40, 125, 1], ['legB.hz', 'Thigh out', -25, 90, 1], ['legB.hy', 'Thigh twist', -50, 50, 1],
                          ['legB.k', 'Knee bend', 0, 150, 1], ['legB.a', 'Ankle', -50, 30, 1], ['legB.t', 'Toes', 0, 60, 1]] }
];

var STAND = { 'armA.sz': 7, 'armB.sz': 7, 'armA.e': 10, 'armB.e': 10, 'armA.sx': 2, 'armB.sx': 2, 'legA.hz': 3, 'legB.hz': 3 };

var POSES = {
  stand: STAND,
  guard: {
    'hip.y': -0.07, 'hip.ry': -30, 'hip.rx': 3, 'spine.ry': 10, 'spine.rx': 8, 'neck.rx': -3, 'head.rx': 10, 'head.ry': 20,
    'armA.sx': 44, 'armA.sz': 10, 'armA.e': 96, 'armA.pr': -10,
    'armB.sx': 34, 'armB.sz': 12, 'armB.e': 112, 'armB.pr': 10,
    'legA.hx': 24, 'legA.hz': 12, 'legA.k': 22, 'legA.a': -4,
    'legB.hx': -14, 'legB.hz': 16, 'legB.k': 22, 'legB.a': -18, 'legB.t': 24
  },
  jab: {
    'hip.y': -0.09, 'hip.ry': -14, 'hip.rx': 6, 'spine.ry': 14, 'spine.rx': 10, 'head.rx': 8, 'head.ry': 8,
    'armA.sx': 88, 'armA.sz': 2, 'armA.e': 4, 'armA.pr': 80, 'armA.w': 0,
    'armB.sx': 42, 'armB.sz': 12, 'armB.e': 130, 'armB.pr': 10,
    'legA.hx': 30, 'legA.hz': 12, 'legA.k': 36, 'legA.a': -4,
    'legB.hx': -16, 'legB.hz': 16, 'legB.k': 18, 'legB.a': -22, 'legB.t': 28
  },
  cross: {
    'hip.y': -0.08, 'hip.ry': 14, 'hip.rx': 6, 'spine.ry': 12, 'spine.rx': 12, 'head.rx': 8, 'head.ry': -10,
    'armA.sx': 52, 'armA.sz': 8, 'armA.e': 118, 'armA.pr': -10,
    'armB.sx': 88, 'armB.sz': 4, 'armB.e': 4, 'armB.pr': 80,
    'legA.hx': 26, 'legA.hz': 12, 'legA.k': 30, 'legA.a': -4,
    'legB.hx': -10, 'legB.hz': 14, 'legB.k': 10, 'legB.a': -34, 'legB.t': 36
  },
  kick: {
    'hip.rx': -10, 'hip.ry': -20, 'spine.rx': -6, 'head.rx': 8, 'head.ry': 14,
    'armA.sx': 30, 'armA.sz': 38, 'armA.e': 50, 'armB.sx': 48, 'armB.sz': 20, 'armB.e': 95,
    'legA.hx': 96, 'legA.hz': 4, 'legA.k': 12, 'legA.a': -34, 'legA.t': 40,
    'legB.hx': 0, 'legB.hz': 6, 'legB.k': 16, 'legB.a': 0
  },
  roundhouse: {
    'hip.ry': -48, 'hip.rz': 8, 'spine.rz': -16, 'spine.ry': 30, 'head.ry': 38, 'head.rx': 6,
    'armA.sx': 25, 'armA.sz': 70, 'armA.e': 40, 'armB.sx': 60, 'armB.sz': 30, 'armB.e': 100,
    'legA.hx': 62, 'legA.hz': 84, 'legA.k': 20, 'legA.a': -30, 'legA.t': 30,
    'legB.hx': 0, 'legB.hz': 6, 'legB.k': 28, 'legB.hy': -20
  },
  crouch: {
    'hip.y': -0.34, 'hip.rx': 22, 'spine.rx': 18, 'head.rx': -10,
    'armA.sx': 38, 'armA.sz': 18, 'armA.e': 70, 'armB.sx': 38, 'armB.sz': 18, 'armB.e': 70,
    'legA.hx': 100, 'legA.hz': 14, 'legA.k': 125, 'legA.a': 18, 'legB.hx': 100, 'legB.hz': 14, 'legB.k': 125, 'legB.a': 18
  },
  block: {
    'hip.y': -0.1, 'hip.rx': 6, 'hip.ry': -22, 'spine.rx': 16, 'spine.ry': 6, 'neck.rx': 6, 'head.rx': 18, 'head.ry': 10,
    'armA.sx': 112, 'armA.sz': -10, 'armA.e': 146, 'armA.pr': 50, 'armB.sx': 106, 'armB.sz': -6, 'armB.e': 148, 'armB.pr': -50,
    'legA.hx': 22, 'legA.hz': 14, 'legA.k': 38, 'legB.hx': -12, 'legB.hz': 16, 'legB.k': 36, 'legB.a': -14, 'legB.t': 16
  },
  grab: {
    'hip.y': -0.10, 'hip.rx': 6, 'spine.rx': 20, 'head.rx': 12,
    'armA.sx': 72, 'armA.sz': 16, 'armA.e': 62, 'armA.pr': 30, 'armB.sx': 72, 'armB.sz': 16, 'armB.e': 62, 'armB.pr': -30,
    'legA.hx': 28, 'legA.hz': 16, 'legA.k': 32, 'legB.hx': 22, 'legB.hz': 16, 'legB.k': 30
  },
  ride: {
    'hip.y': -0.10, 'hip.rx': 20, 'spine.rx': 26, 'head.rx': -34,
    'armA.sx': 95, 'armA.sz': 14, 'armA.e': 18, 'armB.sx': 95, 'armB.sz': 14, 'armB.e': 18,
    'legA.hx': 62, 'legA.hz': 8, 'legA.k': 84, 'legA.a': 10, 'legB.hx': 62, 'legB.hz': 8, 'legB.k': 84, 'legB.a': 10
  },
  hurricane: {
    'hip.y': -0.05, 'hip.rx': 5, 'spine.rx': 8, 'head.rx': 6,
    'armA.sx': 8, 'armA.sz': 88, 'armA.e': 18, 'armA.pr': 40, 'armB.sx': 8, 'armB.sz': 88, 'armB.e': 18, 'armB.pr': -40,
    'legA.hx': 16, 'legA.hz': 24, 'legA.k': 36, 'legA.a': 4, 'legB.hx': -12, 'legB.hz': 24, 'legB.k': 36, 'legB.a': 4
  },
  hurt: {
    'hip.rx': -8, 'hip.ry': 10, 'spine.rx': -22, 'spine.rz': 8, 'neck.rx': -12, 'head.rx': -18, 'head.rz': -10,
    'armA.sx': -26, 'armA.sz': 44, 'armA.e': 36, 'armB.sx': 12, 'armB.sz': 58, 'armB.e': 48,
    'legA.hx': 8, 'legA.hz': 8, 'legA.k': 30, 'legB.hx': -12, 'legB.hz': 12, 'legB.k': 22
  },
  down: {
    'hip.rx': -90, 'hip.y': 0, 'spine.rx': -6, 'head.rx': 22, 'neck.rx': 8,
    'armA.sx': -6, 'armA.sz': 28, 'armA.e': 14, 'armB.sx': -6, 'armB.sz': 28, 'armB.e': 14,
    'legA.hx': 6, 'legA.hz': 10, 'legA.k': 8, 'legB.hx': 4, 'legB.hz': 12, 'legB.k': 6
  }
};

var POSE_LABELS = [
  ['stand', 'Stand'], ['guard', 'Guard'], ['jab', 'Jab'], ['cross', 'Cross'], ['kick', 'Front kick'], ['roundhouse', 'Roundhouse'],
  ['crouch', 'Crouch'], ['block', 'Block'], ['grab', 'Grab'], ['hurricane', 'Hurricane'], ['hurt', 'Hurt'], ['down', 'Knocked down'], ['ride', 'Bike ride']
];

/* time-based previews until the tick-based move clips arrive in the next phase */
var SEQUENCES = {
  combo: { loop: true, steps: [['guard', 0.3, 0.2], ['jab', 0.10, 0.08], ['guard', 0.10, 0.10], ['cross', 0.12, 0.10], ['guard', 0.14, 0.12],
                              ['kick', 0.25, 0.22], ['guard', 0.18, 0.2], ['roundhouse', 0.25, 0.26], ['guard', 0.3, 0.3]] },
  counter: { loop: true, steps: [['guard', 0.5, 0.3], ['block', 0.5, 0.12], ['grab', 0.4, 0.2], ['jab', 0.3, 0.2], ['hurt', 0.5, 0.3]] }
};

module.exports = { JOINTS: JOINTS, POSES: POSES, POSE_LABELS: POSE_LABELS, SEQUENCES: SEQUENCES, STAND: STAND };
