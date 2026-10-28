/* view: orbit camera with drag to rotate, wheel and pinch to zoom, and eased view presets. */
'use strict';

function createOrbit(camera, dom) {
  var s = { az: 0.55, pol: 1.38, dist: 4.6, tx: 0, ty: 1.0, tz: 0 }, goal = null, pointers = {}, pinch = 0, enabled = false;
  var autoSpin = 0, minD = 1.2, maxD = 12;

  function place() {
    var sp = Math.sin(s.pol);
    camera.position.set(s.tx + s.dist * sp * Math.sin(s.az), s.ty + s.dist * Math.cos(s.pol), s.tz + s.dist * sp * Math.cos(s.az));
    camera.lookAt(s.tx, s.ty, s.tz);
  }
  function clamp() { s.pol = Math.max(0.15, Math.min(Math.PI - 0.2, s.pol)); s.dist = Math.max(minD, Math.min(maxD, s.dist)); }

  function down(e) {
    if (!enabled) return;
    dom.setPointerCapture(e.pointerId); pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; goal = null;
    var ids = Object.keys(pointers); if (ids.length === 2) pinch = dist2();
  }
  function dist2() { var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
  function move(e) {
    var p = pointers[e.pointerId]; if (!enabled || !p) return;
    var ids = Object.keys(pointers);
    if (ids.length === 1) {
      s.az -= (e.clientX - p.x) * 0.008; s.pol -= (e.clientY - p.y) * 0.008; clamp();
    }
    p.x = e.clientX; p.y = e.clientY;
    if (ids.length === 2) { var d = dist2(); if (pinch > 0) { s.dist *= pinch / d; clamp(); } pinch = d; }
  }
  function up(e) { delete pointers[e.pointerId]; pinch = 0; }
  function wheel(e) { if (!enabled) return; s.dist *= Math.exp(e.deltaY * 0.0012); clamp(); e.preventDefault(); }
  dom.addEventListener('pointerdown', down); dom.addEventListener('pointermove', move);
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up); dom.addEventListener('wheel', wheel, { passive: false });

  return {
    state: s,
    enable: function (v) { enabled = v; if (!v) pointers = {}; },
    setAutoSpin: function (v) { autoSpin = v ? 0.6 : 0; },
    isAutoSpin: function () { return autoSpin > 0; },
    goTo: function (az, pol, dist, ty) { goal = { az: az, pol: pol, dist: dist, ty: ty == null ? s.ty : ty }; },
    setTarget: function (x, y, z) { s.tx = x; s.ty = y; s.tz = z; },
    update: function (dt) {
      if (goal) {
        var f = 1 - Math.exp(-9 * dt), da = Math.atan2(Math.sin(goal.az - s.az), Math.cos(goal.az - s.az));
        s.az += da * f; s.pol += (goal.pol - s.pol) * f; s.dist += (goal.dist - s.dist) * f; s.ty += (goal.ty - s.ty) * f;
        if (Math.abs(da) < 0.002 && Math.abs(goal.pol - s.pol) < 0.002 && Math.abs(goal.dist - s.dist) < 0.01) goal = null;
      } else if (autoSpin) s.az += autoSpin * dt;
      place();
    },
    dispose: function () {
      dom.removeEventListener('pointerdown', down); dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up); dom.removeEventListener('pointercancel', up); dom.removeEventListener('wheel', wheel);
    }
  };
}

module.exports = { createOrbit: createOrbit };
