#!/usr/bin/env node
/* Animation audit: replays the street-test pose pipeline at 60 fps in plain Node and reports the biggest
   frame-to-frame joint jumps around button presses. A smooth pipeline stays under the limits printed at the end. */
'use strict';
var path = require('path');
var S = path.join(__dirname, '..', 'src', 'view');
var posemath = require(path.join(S, 'posemath')), moveplayer = require(path.join(S, 'moveplayer')), moves = require(path.join(__dirname, '..', 'src', 'data', 'moves'));

function pipeline(opts) {
  var mp = moveplayer.createMovePlayer(), cur = posemath.named('stand'), phase = 0, t = 0, prev = null, worst = {}, frames = [];
  var dt = 1 / 60, total = opts.seconds * 60, i, k;
  var walking = opts.walking;
  for (i = 0; i < total; i++) {
    t += dt;
    var press = opts.presses.indexOf(i) >= 0;
    if (press) { if (opts.counter && !mp.active()) mp.play(opts.counter); else mp.press(); }
    var locked = mp.active();                                              /* the sim stops walking while a move plays */
    var moving = walking && !locked;
    var target = moving ? posemath.walkPose(phase += 4 * dt / 1.9, 1.1) : posemath.idlePose(t);
    posemath.approach(cur, target, 16, dt);
    var pose = cur, mo = mp.update(dt);
    if (mo) pose = posemath.layer(pose, mo.pose, mo.wLower, mo.wUpper, mo.wArmA, mo.wArmB);
    if (prev) for (k in pose) {
      var d = Math.abs(pose[k] - (prev[k] || 0));
      if (/^gtr\.(px|py|pz|rx|ry|rz|gy|ya|yb)$/.test(k)) {      /* the guitar only follows these keys by the amount it is held */
        d = Math.abs((pose['gtr.on'] || 0) * pose[k] - (prev['gtr.on'] || 0) * (prev[k] || 0));
        if (/\.p[xyz]$/.test(k)) d *= 10;                          /* one voxel is 2.5 cm: call it 10 degrees of visual change */
      } else if (/^hip\.(y|x|z)$/.test(k)) d *= 400;              /* metres to rough degrees */
      if (k === 'hip.ry' && d > 180) d = 360 - d;
      if (!worst[k] || d > worst[k].d) worst[k] = { d: d, frame: i };
    }
    prev = posemath.copy(pose); frames.push(prev);
  }
  return { worst: worst, frames: frames };
}

function report(name, r, limit) {
  var rows = Object.keys(r.worst).map(function (k) { return [k, r.worst[k].d, r.worst[k].frame]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
  var top = rows[0][1];
  console.log((top > limit ? 'JUMP ' : 'ok   ') + name + '  max ' + top.toFixed(1) + ' deg/frame  ' + rows.map(function (r) { return r[0] + ' ' + r[1].toFixed(1) + '@' + r[2]; }).join(', '));
  return top <= limit;
}

if (require.main === module) {
  var ok = true, LIMIT = 36;   /* strikes snap at up to ~20 deg/frame; a pop is 40+ */
  ok = report('jab from idle', pipeline({ seconds: 3, walking: false, presses: [60] }), LIMIT) && ok;
  ok = report('jab from walking', pipeline({ seconds: 3, walking: true, presses: [60] }), LIMIT) && ok;
  ok = report('combo from walking', pipeline({ seconds: 8, walking: true, presses: [60, 100, 150, 200, 250, 300, 350, 400] }), LIMIT) && ok;
  moves.COUNTERS.concat([moves.FINISHER]).forEach(function (c) { ok = report(c + ' from walking', pipeline({ seconds: 6, walking: true, presses: [60], counter: c }), LIMIT * 1.5) && ok; });
  console.log(ok ? 'ANIM AUDIT: PASS' : 'ANIM AUDIT: FAIL');
  process.exit(ok ? 0 : 1);
}
module.exports = { pipeline: pipeline };
