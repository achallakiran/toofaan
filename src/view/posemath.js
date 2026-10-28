/* view: pose maths. Poses are flat objects of joint values; everything here is pure. */
'use strict';

var data = require('../data/poses');

function smooth(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }

function blend(a, b, t) {
  var out = {}, k;
  for (k in a) out[k] = a[k] * (1 - t) + (b[k] || 0) * t;
  for (k in b) if (!(k in a)) out[k] = b[k] * t;
  return out;
}

function copy(p) { var o = {}; for (var k in p) o[k] = p[k]; return o; }
function named(name) { return copy(data.POSES[name] || data.POSES.stand); }

/* move cur toward target at a rate (per second); returns max remaining change */
function approach(cur, target, rate, dt) {
  var f = 1 - Math.exp(-rate * dt), k, worst = 0, keys = {};
  for (k in cur) keys[k] = 1; for (k in target) keys[k] = 1;
  for (k in keys) {
    var c = cur[k] || 0, t = target[k] || 0, d = (t - c) * f;
    cur[k] = c + d; if (Math.abs(t - c) > worst) worst = Math.abs(t - c);
  }
  return worst;
}

/* standing breath and weight shift */
function idlePose(time) {
  var p = named('stand'), b = Math.sin(time * 2.0), s = Math.sin(time * 0.9);
  p['spine.rx'] = 1.2 + b * 1.1; p['head.rx'] = -1 - b * 0.8; p['hip.rz'] = s * 1.0; p['spine.rz'] = -s * 1.0;
  p['armA.sz'] += b * 1.2; p['armB.sz'] += b * 1.2; p['armA.e'] += 3 + b * 1.5; p['armB.e'] += 3 - b * 1.5;
  return p;
}

/* Athletic gait. phase 0..1 = one full stride (two steps); amp 1 = purposeful walk, ~1.7 = jog.
   Built from gait events rather than plain sine swings: heel strike with the leg forward, a loading dip with a
   little knee give, a straight mid-stance, push-off through the toes, then a high-knee swing. The pelvis bobs twice
   per stride, shifts over the planted foot and rotates against the shoulders; arms stay bent and swing with the
   opposite leg; the head stays level. Leg A is forward at phase 0.25. */
var TAU = Math.PI * 2;
function bump(phi, centre, width) {
  var d = Math.atan2(Math.sin(phi - centre), Math.cos(phi - centre)) / width;
  return Math.exp(-d * d);
}
function legCycle(phi, a, out, key) {
  var f = Math.sin(phi);                                                       /* +1 at heel strike, -1 at toe-off */
  var load = bump(phi, Math.PI / 2 + 0.55, 0.5);                               /* weight accepted: small knee give */
  var lift = bump(phi, 1.5 * Math.PI + 0.75, 0.75);                            /* swing: knee drives up */
  out[key + '.hx'] = 4 + 24 * a * f + 6 * a * lift;
  out[key + '.k'] = 5 + 13 * load + (46 + 14 * (a - 1)) * lift + 10 * bump(phi, 1.5 * Math.PI, 0.35);
  out[key + '.a'] = 14 * bump(phi, Math.PI / 2 - 0.1, 0.4) - 26 * a * bump(phi, 1.5 * Math.PI - 0.35, 0.4) + 7 * lift;
  out[key + '.t'] = 34 * a * bump(phi, 1.5 * Math.PI - 0.1, 0.4);
  out[key + '.hz'] = 3 + 2 * lift;
}
function walkPose(phase, amp) {
  var th = phase * TAU, a = amp || 1, p = named('stand'), s = Math.sin(th), c = Math.cos(th);
  legCycle(th, a, p, 'legA'); legCycle(th + Math.PI, a, p, 'legB');
  /* pelvis: bob (lowest at loading, highest at mid-stance), sway over the planted foot, rotate against the shoulders */
  p['hip.y'] = -0.03 * a + 0.018 * a * Math.cos(2 * th - 0.4);
  p['hip.x'] = -0.022 * a * c;
  p['hip.ry'] = -7 * a * s; p['hip.rz'] = -3 * a * c; p['hip.rx'] = 2 + 2 * a;
  p['spine.ry'] = 10 * a * s; p['spine.rz'] = 2.2 * a * c; p['spine.rx'] = 3 + 3.5 * a + 1.2 * Math.cos(2 * th);
  p['neck.ry'] = -2 * a * s; p['head.ry'] = -2.5 * a * s; p['head.rx'] = -2 - 1.5 * a; p['neck.rz'] = -1.2 * a * c;
  /* arms: opposite to the leg on the same side; elbows stay bent, more on the forward swing; shoulders held a little wide */
  var swA = -(24 * a * s), swB = -(-24 * a * s);
  p['armA.sx'] = swA * 1.05 + 4; p['armB.sx'] = swB * 1.05 + 4;
  p['armA.e'] = 34 + 22 * a * Math.max(0, swA / (24 * a)) + 8 * a; p['armB.e'] = 34 + 22 * a * Math.max(0, swB / (24 * a)) + 8 * a;
  p['armA.sz'] = 10 + 2 * a * Math.max(0, s); p['armB.sz'] = 10 + 2 * a * Math.max(0, -s);
  p['armA.pr'] = 14; p['armB.pr'] = 14;
  return p;
}

/* sequence: steps are [poseName, holdSeconds, blendSeconds]; returns pose at time t */
function sequenceDuration(seq) { var d = 0; seq.steps.forEach(function (s) { d += s[1] + s[2]; }); return d; }
function sequencePose(seq, time) {
  var dur = sequenceDuration(seq), t = seq.loop ? time % dur : Math.min(time, dur - 1e-6), prev = named(seq.steps[seq.steps.length - 1][0]);
  for (var i = 0; i < seq.steps.length; i++) {
    var st = seq.steps[i], cur = named(st[0]);
    if (t < st[2]) return blend(prev, cur, smooth(t / Math.max(1e-6, st[2])));
    t -= st[2];
    if (t < st[1]) return cur;
    t -= st[1]; prev = cur;
  }
  return prev;
}

/* layer an overlay pose on a base with separate weights for the upper body and the lower body / hips */
var UPPER_KEYS = /^(armA|armB|spine|neck|head|gtr)\./;
function layer(base, over, wLower, wUpper, wArmA, wArmB) {
  var out = copy(base), k;
  for (k in over) {
    var w = wLower;
    if (UPPER_KEYS.test(k)) w = k.indexOf('armA.') === 0 && wArmA !== undefined ? wArmA : (k.indexOf('armB.') === 0 && wArmB !== undefined ? wArmB : wUpper);
    var b = base[k] || 0, dlt = over[k] - b;
    if (k === 'hip.ry') dlt = ((dlt + 180) % 360 + 360) % 360 - 180;           /* spins take the short way round */
    out[k] = b + dlt * w;
  }
  return out;
}

module.exports = { layer: layer, blend: blend, copy: copy, named: named, approach: approach, idlePose: idlePose, walkPose: walkPose,
  sequencePose: sequencePose, sequenceDuration: sequenceDuration, smooth: smooth };
