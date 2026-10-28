/* sim: the Bijli. A kinematic cruiser: it follows the ground (ramps), leaves it when the ground falls away, collides with
   building footprints, and Forward is (sin h, cos h), the same convention as the hero's facing. No graphics. */
'use strict';

var B = require('../data/bike');
var TAU = Math.PI * 2;

function createBike(x, z, h) {
  return { x: x, y: 0, z: z, h: h || 0, speed: 0, vy: 0, air: false, airT: 0, 
           steer: 0, lean: 0, pitch: 0, slip: 0, boost: 1, boosting: false, drifting: false, crash: 0, rpm: 0.2, thr: 0, gear: 1, lastY: 0, vyGround: 0, shiftT: 0 };
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* ctrl: {throttle 0..1, brake 0..1, steer -1..1 (right +), boost bool, drift bool, stunt bool (edge)}
   env: {groundAt(x,z), solidsNear(x,z,r,out)}   bus: event bus or null */
function step(b, ctrl, env, dt, bus) {
  var thr = b.crash > 0 ? 0 : ctrl.throttle, brk = ctrl.brake, v = b.speed, i;
  if (b.crash > 0) b.crash = Math.max(0, b.crash - dt);
  b.thr += (thr - b.thr) * Math.min(1, 6 * dt);

  /* speed along the heading */
  var boosting = !!ctrl.boost && b.boost > 0.02 && !b.air && v > 1 && b.crash <= 0;
  b.boosting = boosting;
  var top = boosting ? B.BOOST_SPEED : B.MAX_SPEED;
  if (!b.air) {
    var a = 0;
    if (thr > 0.05 && v >= -0.1) a += (boosting ? B.BOOST_ACCEL : B.ACCEL * (B.GEAR_PULL[b.gear] || 0.5)) * (b.shiftT > 0 ? B.SHIFT_DIP : 1) * thr * clamp(1 - Math.pow(Math.max(0, v) / top, 2.4), 0, 1) * (v < 0 ? 1.5 : 1);
    else if (thr <= 0.05 && v > 0) a -= B.COAST;
    if (brk > 0.05) { if (v > 0.3) a -= B.BRAKE * brk; else if (ctrl.reverse) { if (v > -B.REVERSE_MAX) a -= 3 * brk; } else { v = 0; a = 0; } }
    else if (thr <= 0.05 && v < 0) a += B.COAST;
    a -= B.DRAG * v * Math.abs(v);
    b.drifting = !!ctrl.drift && v > 7 && Math.abs(ctrl.steer) > 0.2;
    if (b.drifting) a -= B.DRIFT_BRAKE;
    v += a * dt;
    if (thr <= 0.05 && brk <= 0.05 && Math.abs(v) < 0.25) v = 0;
    if (v > top) v = Math.max(top, v - 6 * dt);
    b.speed = v;
    if (boosting) b.boost = Math.max(0, b.boost - B.BOOST_DRAIN * dt); else b.boost = Math.min(1, b.boost + B.BOOST_REFILL * dt);
  } else b.drifting = false;

  /* steering: lazy bars, wide arcs at speed */
  var airSteer = b.air ? 0.25 : 1;
  b.steer += (ctrl.steer * airSteer - b.steer) * (1 - Math.exp(-B.STEER_LAG * dt));
  var R = B.TURN_R0 + B.TURN_RV * Math.abs(b.speed), yaw = (b.speed / R) * b.steer * (b.drifting ? B.DRIFT_BOOST : 1);
  b.h -= yaw * dt;
  b.slip += ((b.drifting ? -b.steer * 0.4 : 0) - b.slip) * Math.min(1, 8 * dt);
  var leanT = clamp(Math.atan2(b.speed * yaw, 9.8), -B.LEAN_MAX, B.LEAN_MAX) * (b.air ? 0.3 : 1);
  b.lean += (leanT - b.lean) * (1 - Math.exp(-6 * dt));
  /* fork dip under braking, rear squat under throttle */
  var pitchT = (brk > 0.05 && v > 1 ? -0.1 * brk : 0) + (thr > 0.3 && v < 14 ? 0.035 * thr : 0);
  b.pitch += (pitchT - b.pitch) * (1 - Math.exp(-7 * dt));

  /* move */
  var fx = Math.sin(b.h), fz = Math.cos(b.h);
  b.lastY = b.y;
  b.x += fx * b.speed * dt; b.z += fz * b.speed * dt;

  /* walls: a circle against building footprints */
  var near = env.solidsNear(b.x, b.z, B.RADIUS + 1, []);
  for (i = 0; i < near.length; i++) {
    var q = near[i]; if (b.y > q.y1 - 0.25) continue;
    var cx = clamp(b.x, q.x0, q.x1), cz = clamp(b.z, q.z0, q.z1), dx = b.x - cx, dz = b.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= B.RADIUS * B.RADIUS) continue;
    var d = Math.sqrt(d2), nx, nz;
    if (d < 1e-6) { var l = b.x - q.x0, r = q.x1 - b.x, t = b.z - q.z0, u = q.z1 - b.z, m = Math.min(l, r, t, u); nx = m === l ? -1 : m === r ? 1 : 0; nz = m === t ? -1 : m === u ? 1 : 0; d = 0; }
    else { nx = dx / d; nz = dz / d; }
    b.x += nx * (B.RADIUS - d); b.z += nz * (B.RADIUS - d);
    var into = -(fx * nx + fz * nz) * b.speed;                    /* speed driven into the wall */
    if (into > 1.5) {
      var hard = into > 9;
      b.speed *= hard ? 0.1 : (1 - 0.55 * Math.min(1, into / 9));
      if (hard) b.crash = 0.9; else if (into > 4) b.crash = 0.3;
      if (bus && into > 3) bus.emit('ride:crash', { x: b.x, z: b.z, speed: into, hard: hard, with: 'wall' });
    }
  }

  /* ground, jumping, landing */
  var gy = env.groundAt(b.x, b.z);
  if (!b.air) {
    if (gy < b.y - 0.06 && b.vyGround > 1.2) { b.air = true; b.vy = b.vyGround; b.airT = 0; b.y += b.vy * dt; if (bus) bus.emit('ride:jump', { x: b.x, z: b.z, vy: b.vy }); }
    else if (gy < b.y - 0.06) { b.air = true; b.vy = 0; b.airT = 0; }
    else { b.y = gy; b.vyGround = (b.y - b.lastY) / dt; }
  } else {
    b.airT += dt; b.vy -= B.GRAVITY * dt; b.y += b.vy * dt;
    if (b.y <= gy && b.vy <= 0) {
      var vyIn = -b.vy; b.y = gy; b.air = false; b.vyGround = 0;
      if (vyIn > 8) b.speed *= 0.85;
      if (bus) bus.emit('ride:land', { x: b.x, z: b.z, vy: vyIn, airT: b.airT });
      b.vy = 0;
    }
  }

  /* engine note inputs: gear from speed, rpm climbs inside each gear */
  var g = 0; for (i = 0; i < B.GEARS.length; i++) if (Math.abs(b.speed) >= B.GEARS[i]) g = i;
  if (g !== b.gear) { b.gear = g; b.shiftT = 0.18; } if (b.shiftT > 0) b.shiftT -= dt;
  var lo = B.GEARS[g], hi = g + 1 < B.GEARS.length ? B.GEARS[g + 1] : B.BOOST_SPEED + 1, fr = clamp((Math.abs(b.speed) - lo) / (hi - lo), 0, 1);
  var rpmT = 0.18 + 0.62 * fr + 0.2 * b.thr - (b.shiftT > 0 ? 0.18 : 0);
  b.rpm += (rpmT - b.rpm) * Math.min(1, 9 * dt);
}

module.exports = { createBike: createBike, step: step };
