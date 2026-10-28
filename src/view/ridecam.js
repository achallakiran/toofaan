/* view: the riding camera and the rider's pose. Pure maths (no THREE), so both can be tested in Node.
   The camera follows a smoothed heading so it swings behind the bike in turns, widens the view with speed, drifts to a
   three-quarter angle when slow so the bike and the street are on show, and pulls in rather than sit inside a building. */
'use strict';

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

function createRideCam() {
  var S = { h: 0, d: 5.4, lx: 0, lz: 0, steerS: 0, init: false, q: 1, fov: 46, ly: 1.0 };
  return {
    state: S,
    /* b: bike sim state, x/y/z/h: interpolated position and heading, env: {solidsNear}, dt seconds. Returns a shot {x,y,z,lx,ly,lz,fov}. */
    update: function (dt, b, x, y, z, h, env) {
      var sp = Math.abs(b.speed), sn = clamp(sp / 25, 0, 1), k;
      if (!S.init) { S.init = true; S.h = h + 0.5; S.lx = x; S.lz = z; }
      /* heading follows with a lag, so a turn opens up to show the bike's lean and the street ahead */
      k = 1 - Math.exp(-(2.6 + sn * 1.2) * dt); S.h += angDiff(h, S.h) * k;
      S.steerS += (b.steer - S.steerS) * (1 - Math.exp(-3 * dt));
      var slow = 1 - smooth(sp / 6), side = 0.78 * slow + S.steerS * 0.42 * sn;                 /* angle off straight-behind: three-quarter when slow, outside of the turn when fast */
      var ang = S.h + Math.PI + side, dist = 5.0 + sn * 2.4 + (b.boosting ? 0.8 : 0) + slow * 0.6, hgt = 2.1 + sn * 0.9 + slow * 0.3;
      var tx = x + Math.sin(ang) * dist, tz = z + Math.cos(ang) * dist;
      /* shrink toward the bike while the camera would sit inside a building */
      var tries = 0, f = 1;
      while (tries++ < 7 && env) {
        var cx = x + (tx - x) * f, cz = z + (tz - z) * f, hit = env.solidsNear(cx, cz, 0.4, []), bad = false, i;
        for (i = 0; i < hit.length; i++) if (hit[i].y1 > hgt - 0.3) bad = true;
        if (!bad) break; f *= 0.72;
      }
      var camx = x + (tx - x) * f, camz = z + (tz - z) * f, camy = y + 0.7 + (hgt - 0.7) * (0.5 + 0.5 * f);
      /* look a little ahead of the bike, further at speed */
      var ahead = 1.2 + sn * 3.2, ltx = x + Math.sin(h) * ahead, ltz = z + Math.cos(h) * ahead;
      var lk = 1 - Math.exp(-6 * dt); S.lx += (ltx - S.lx) * lk; S.lz += (ltz - S.lz) * lk;
      var fovT = 46 + sn * 12 + (b.boosting ? 7 : 0) + (b.air ? 3 : 0); S.fov += (fovT - S.fov) * (1 - Math.exp(-3 * dt));
      return { x: camx, y: camy, z: camz, lx: S.lx, ly: y + 1.0, lz: S.lz, fov: S.fov };
    }
  };
}

/* the rider on a cruiser: relaxed and upright, feet forward on the pegs, hands up on the bars. Leans with the bike, bars follow the steering. */
function ridePose(b, t) {
  var st = clamp(b.steer, -1, 1), ln = clamp(b.lean, -0.6, 0.6), sp = clamp(Math.abs(b.speed) / 25, 0, 1), air = b.air ? 1 : 0;
  var p = {
    'hip.y': -0.01, 'hip.rx': 4 + sp * 6 + (b.pitch < 0 ? -b.pitch * 40 : 0), 'hip.rz': 0, 'spine.rx': 10 + sp * 12, 'spine.rz': -ln * 14, 'spine.ry': -st * 8,
    'neck.rx': -6 - sp * 8, 'head.rx': -8 - sp * 6, 'head.ry': -st * 14, 'head.rz': ln * 8,
    'armA.sx': 62 + sp * 6, 'armA.sz': 14, 'armA.e': 42 - sp * 8, 'armA.sy': 0, 'armA.w': -12,
    'armB.sx': 62 + sp * 6, 'armB.sz': 14, 'armB.e': 42 - sp * 8, 'armB.sy': 0, 'armB.w': -12,
    'legA.hx': 58, 'legA.hz': 16, 'legA.k': 44, 'legA.a': -6, 'legB.hx': 58, 'legB.hz': 16, 'legB.k': 44, 'legB.a': -6
  };
  /* the bars turn: one arm reaches, the other draws back */
  p['armA.sx'] += st * 7; p['armB.sx'] -= st * 7; p['armA.sy'] = -st * 8; p['armB.sy'] = -st * 8;
  p['hip.ry'] = -st * 3;
  if (air) { p['legA.k'] += 10; p['legB.k'] += 10; p['spine.rx'] += 4; }
  /* a slight engine tremble at the shoulders */
  p['spine.rx'] += Math.sin(t * 38) * 0.35 * (0.3 + b.thr);
  return p;
}

module.exports = { createRideCam: createRideCam, ridePose: ridePose };
