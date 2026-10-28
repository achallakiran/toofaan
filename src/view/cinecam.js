/* view: cinematic camera director. A move can carry camera keys (distance, height, look-at height, field of view, angle
   relative to the hero). The director blends the normal chase camera into them and back out, and adds impact shake. */
'use strict';

var moves = require('../data/moves');
var NORMAL = { dist: 6.6, h: 6.4, look: 1.0, fov: 46 };

function smooth(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
function wrapPi(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

/* camera values of move `name` at time t, or null when it has no camera */
function camAt(name, t) { var mv = moves.MOVES[name]; return mv && mv.cam ? keysAt(mv.cam, t) : null; }
function keysAt(keys, t) {
  var i = 1;
  if (!keys) return null;
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1];
  while (i < keys.length - 1 && t > keys[i].t) i++;
  var a = keys[i - 1], b = keys[i], u = smooth((t - a.t) / Math.max(1e-6, b.t - a.t)), o = {}, k;
  for (k in b) if (k !== 't') o[k] = a[k] + (b[k] - a[k]) * u;
  return o;
}

function createDirector() {
  var D = { shakeT: 0, shakeA: 0, t: 0, weight: 0, target: null, shot: null, focus: null };
  /* a one-off shot (like the finishing shot on the last man): keys are camera keys in seconds, relative to the hero's facing */
  D.playShot = function (keys, len) { D.shot = { keys: keys, len: len, t: 0 }; };
  /* move: name or null; t: seconds into the move; blend: 0..1 how much of the shot to show */
  D.update = function (dt, move, t, blend) {
    D.t += dt; D.shakeT = Math.max(0, D.shakeT - dt);
    D.target = move ? camAt(move, t) : null;
    D.weight = D.target ? smooth(blend) : 0;
    if (D.shot) {
      D.shot.t += dt;
      if (D.shot.t >= D.shot.len) D.shot = null;
      else { D.target = keysAt(D.shot.keys, D.shot.t); D.weight = smooth(Math.min(1, D.shot.t / 0.3, (D.shot.len - D.shot.t) / 0.45)); }
    }
  };
  D.shake = function (amp, dur) { D.shakeA = amp; D.shakeT = dur; D.dur = dur; };
  /* resolve to a camera: hx, hz hero position, face hero yaw. Returns { x, y, z, lx, ly, lz, fov } */
  D.resolve = function (hx, hz, face, focus) {
    var w = D.weight, c = D.target, dist = NORMAL.dist, h = NORMAL.h, look = NORMAL.look, fov = NORMAL.fov, th = 0, lookZ = -2.2;
    if (c && w > 0) {
      var thc = face + c.rel;
      if (!D.on) { D.on = true; D.u = wrapPi(thc); } else D.u += wrapPi(thc - D.rawPrev);    /* keep the angle continuous, however far the orbit goes */
      D.rawPrev = thc; th = D.u * w;
      dist = NORMAL.dist + (c.dist - NORMAL.dist) * w; h = NORMAL.h + (c.h - NORMAL.h) * w; look = NORMAL.look + (c.look - NORMAL.look) * w; fov = NORMAL.fov + (c.fov - NORMAL.fov) * w;
      lookZ = -2.2 * (1 - w);
    }
    if (!(c && w > 0)) D.on = false;
    var horiz = c && w > 0 ? Math.sqrt(Math.max(0.0001, dist * dist - 0)) : NORMAL.dist;
    var fx = 0, fz = 0;
    if (focus && c && w > 0) { fx = (focus.x - hx) * 0.5 * w; fz = (focus.z - hz) * 0.5 * w; }       /* lean the view toward the men being fought */
    var out = { x: hx + Math.sin(th) * horiz, y: h, z: hz + Math.cos(th) * horiz, lx: hx + fx, ly: look, lz: hz + lookZ + fz, fov: fov };
    if (D.shakeT > 0) {                                           /* impact shake: quick decaying wobble */
      var k = (D.shakeT / (D.dur || 1)), amp = D.shakeA * k * k;
      out.x += Math.sin(D.t * 83) * amp; out.y += Math.sin(D.t * 97 + 1) * amp; out.lx += Math.sin(D.t * 71 + 2) * amp * 0.5;
    }
    return out;
  };
  return D;
}

module.exports = { createDirector: createDirector, camAt: camAt, NORMAL: NORMAL };
