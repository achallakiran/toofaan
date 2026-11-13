/* view: Toofan's rock stand, the way he gets up from the floor: from flat on his back, knees to chest, a kick up, a landing crouch, and
   up into a wide power stance, leaning back, head thrown back, the guitar swung up neck-high. Used after Maa ka Thappad in the fights
   and on the road; built so any fall can end in it. */
'use strict';

var posemath = require('./posemath');

/* Toofan's rock stand: a wide power stance, leaning back, head thrown back, the guitar swung up neck-high */
function pose() {
  return posemath.layer(posemath.named('stand'), { 'legA.hz': 20, 'legB.hz': 20, 'legA.hx': 12, 'legB.hx': -6, 'legA.k': 22, 'legB.k': 16, 'spine.rx': -14, 'neck.rx': -10, 'head.rx': -26,
    'gtr.on': 1, 'gtr.gy': 14, 'gtr.ya': 14, 'gtr.yb': -2, 'gtr.px': 10, 'gtr.py': 12, 'gtr.pz': 14, 'gtr.rx': 0, 'gtr.ry': -23, 'gtr.rz': -45 }, 1, 1, 1, 1);
}
/* from flat on the floor: knees to chest, kick up, land in a crouch, rise into the stand (u 0..1 over 1.2 s) */
function keys(rock) {
  function k(over) { return posemath.layer(posemath.named('stand'), over, 1, 1, 1, 1); }
  return [
    [0.0, posemath.named('down')],
    [0.3, k({ 'hip.rx': -95, 'spine.rx': -10, 'head.rx': 20, 'legA.hx': 120, 'legA.k': 130, 'legB.hx': 115, 'legB.k': 130, 'armA.sx': 165, 'armA.e': 80, 'armB.sx': 165, 'armB.e': 80 })],
    [0.55, k({ 'hip.rx': -25, 'spine.rx': -28, 'head.rx': -18, 'legA.hx': 20, 'legA.k': 30, 'legB.hx': 10, 'legB.k': 25, 'armA.sx': 120, 'armA.sz': 40, 'armB.sx': 120, 'armB.sz': 40 })],
    [0.75, k({ 'legA.hz': 22, 'legB.hz': 22, 'legA.hx': 45, 'legA.k': 75, 'legB.hx': 40, 'legB.k': 70, 'spine.rx': 25, 'armA.sx': 35, 'armB.sx': 35, 'armA.sz': 30, 'armB.sz': 30, 'gtr.on': 0.5 })],
    [1.0, rock]
  ];
}


/* the pose at time t (seconds) since he started getting up; lift = how high the kick-up carries him (metres). He holds the stand until
   `end` (default 3.8 s, after Maa) then drops into his guard over `dur` (default 1 s); an ordinary knockdown holds it shorter */
function at(t, end, dur) {
  end = end === undefined ? 3.8 : end; dur = dur || 1.0;
  var ru = Math.min(1, t / 1.4), rock = pose(), p = posemath.keyed(keys(rock), ru);
  if (t > end) p = posemath.blend(rock, posemath.named('guard') || posemath.named('stand'), posemath.smooth((t - end) / dur));
  return { pose: p, lift: ru > 0.35 && ru < 0.75 ? Math.sin(Math.PI * (ru - 0.35) / 0.4) * 0.45 : 0 };
}

module.exports = { pose: pose, keys: keys, at: at };
