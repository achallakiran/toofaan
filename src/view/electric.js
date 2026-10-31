/* view: the electric-shock reveal for the opening: a picture (the studio badge) or a line of text flickers in through crackling
   lightning, RGB-split glitches and scanlines, holds with sparks running round it, then shorts out the same way. A full-screen 2D canvas. */
'use strict';

function createElectric(onZap) {
  var cv = document.createElement('canvas'), g = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:40;pointer-events:none;background:#000';
  document.body.appendChild(cv);
  function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); window.addEventListener('resize', size);
  var item = null, t = 0, bolts = [], nextZap = 0;

  /* a jagged lightning path from a to b */
  function bolt(ax, ay, bx, by, rough) {
    var pts = [[ax, ay]], n = 9, i, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    for (i = 1; i < n; i++) { var k = i / n, off = (Math.random() - 0.5) * rough * len; pts.push([ax + dx * k + nx * off, ay + dy * k + ny * off]); }
    pts.push([bx, by]); return { pts: pts, life: 0.06 + Math.random() * 0.1, w: 1 + Math.random() * 2.5 };
  }
  function drawBolts(dt) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
    bolts = bolts.filter(function (b) {
      b.life -= dt; if (b.life <= 0) return false;
      [[10, 'rgba(90,180,255,0.35)', b.w * 4], [0, 'rgba(220,240,255,0.95)', b.w]].forEach(function (s) {
        g.shadowBlur = s[0] ? 18 : 0; g.shadowColor = '#5ab4ff'; g.strokeStyle = s[1]; g.lineWidth = s[2]; g.beginPath();
        b.pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
      });
      return true;
    });
    g.restore();
  }
  function drawItem(cx, cy, R, alpha, split) {
    if (alpha <= 0.01) return;
    g.save(); g.globalAlpha = alpha;
    if (item.img) {
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
      if (split > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.55; g.drawImage(item.img, cx - R - split, cy - R, R * 2, R * 2); g.drawImage(item.img, cx - R + split, cy - R + split * 0.4, R * 2, R * 2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha; }
      g.drawImage(item.img, cx - R, cy - R, R * 2, R * 2);
    } else {
      var fs = Math.min(W * 0.115, H * 0.16); g.textAlign = 'center'; g.textBaseline = 'middle';
      item.lines.forEach(function (ln, i) {
        var y = cy + (i - (item.lines.length - 1) / 2) * fs * 1.25, f = (i === 0 ? fs : fs * 0.62);
        g.font = '900 ' + f + 'px "Arial Black",Impact,system-ui,sans-serif';
        if (split > 0) { g.fillStyle = 'rgba(255,40,80,0.7)'; g.fillText(ln, cx - split, y); g.fillStyle = 'rgba(40,200,255,0.7)'; g.fillText(ln, cx + split, y); }
        g.shadowBlur = 24; g.shadowColor = '#5ab4ff'; g.fillStyle = i === 0 ? '#e9f6ff' : '#ffd21f'; g.fillText(ln, cx, y); g.shadowBlur = 0;
      });
    }
    g.restore();
  }
  return {
    /* show: {img} or {lines: [...]}, for `dur` seconds: ~0.9 s crackling in, a hold, ~0.8 s shorting out */
    show: function (o) { item = o; t = 0; bolts = []; nextZap = 0; },
    /* advance and draw; true while the item is still on */
    draw: function (dt) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      if (!item) return false;
      t += dt; var D = item.dur, inT = 0.9, outT = 0.8, cx = W / 2, cy = H / 2, R = Math.min(W, H) * (item.img ? 0.36 : 0.3);
      var phase = t < inT ? 'in' : (t > D - outT ? 'out' : 'hold'), u = phase === 'in' ? t / inT : (phase === 'out' ? (D - t) / outT : 1);
      /* flicker: on/off stutter while it powers up and dies */
      var flick = phase === 'hold' ? 1 : (Math.random() < u * 1.1 ? Math.min(1, u * 1.5) : 0.08);
      var jx = phase === 'hold' ? 0 : (Math.random() - 0.5) * 10 * (1 - u), split = phase === 'hold' ? (Math.random() < 0.06 ? 6 : 0) : (1 - u) * 14 * Math.random();
      drawItem(cx + jx, cy, R, flick, split);
      /* lightning: arcs crawling round the rim and leaping out across the screen */
      nextZap -= dt;
      var rate = phase === 'hold' ? 0.22 : 0.05;
      if (nextZap <= 0 && t < D) {
        nextZap = rate * (0.5 + Math.random());
        var a = Math.random() * 6.283, b2 = a + (Math.random() - 0.5) * 1.6;
        bolts.push(bolt(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(b2) * R * (1.02 + Math.random() * 0.1), cy + Math.sin(b2) * R * (1.02 + Math.random() * 0.1), 0.35));
        if (phase !== 'hold' || Math.random() < 0.4) { var e = Math.random() * 6.283; bolts.push(bolt(cx + Math.cos(e) * R * 0.95, cy + Math.sin(e) * R * 0.95, cx + Math.cos(e) * Math.max(W, H) * 0.7, cy + Math.sin(e) * Math.max(W, H) * 0.7, 0.18)); if (onZap) onZap(phase === 'hold' ? 0.4 : 1); }
      }
      drawBolts(dt);
      /* white pop at the moment it fully lights and the moment it dies */
      var pop = Math.max(0, 1 - Math.abs(t - inT) / 0.12) + Math.max(0, 1 - Math.abs(t - (D - outT)) / 0.1);
      if (pop > 0) { g.fillStyle = 'rgba(220,240,255,' + (pop * 0.5) + ')'; g.fillRect(0, 0, W, H); }
      /* scanlines */
      g.fillStyle = 'rgba(0,0,0,0.18)'; for (var y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
      if (t >= D) { item = null; return false; }
      return true;
    },
    dispose: function () { window.removeEventListener('resize', size); cv.remove(); }
  };
}

module.exports = { createElectric: createElectric };
