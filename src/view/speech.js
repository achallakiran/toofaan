/* view: comic speech bubbles over people in the world (Toofan's punch lines, a goon's answer). A white bubble with a black edge and a tail,
   the pixel font, popping in and out; it follows the point it belongs to on screen. say() returns the bubble; each lasts `dur` seconds. */
'use strict';

function createSpeech() {
  var layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:14;overflow:hidden';
  document.body.appendChild(layer);
  var list = [], V = new THREE.Vector3();
  function say(text, pt, dur, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;max-width:min(62vw,340px);padding:8px 12px;background:#fff;color:#111;border:3px solid #111;border-radius:14px;' +
      "font:" + (opts.small ? '12px' : '14px') + " 'ToofanPx',monospace;letter-spacing:.06em;line-height:1.35;text-align:center;box-shadow:3px 3px 0 #111;" +
      'transform-origin:50% 100%;transform:translate(-50%,-100%) scale(.2);opacity:0;transition:transform .16s ease-out,opacity .12s';
    el.textContent = text;
    var tail = document.createElement('div');
    tail.style.cssText = 'position:absolute;left:50%;bottom:-13px;width:0;height:0;margin-left:-8px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:13px solid #111';
    var tail2 = document.createElement('div');
    tail2.style.cssText = 'position:absolute;left:50%;bottom:-8px;width:0;height:0;margin-left:-5px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #fff';
    el.appendChild(tail); el.appendChild(tail2); layer.appendChild(el);
    var b = { el: el, pt: pt, t: 0, dur: dur || 2.4, shown: false };
    list.push(b); return b;
  }
  function update(camera, dt) {
    var w = window.innerWidth, h = window.innerHeight;
    for (var i = list.length - 1; i >= 0; i--) {
      var b = list[i], p = typeof b.pt === 'function' ? b.pt() : b.pt; b.t += dt;
      V.set(p.x, p.y, p.z).project(camera);
      var x = Math.max(90, Math.min(w - 90, (V.x * 0.5 + 0.5) * w)), y = Math.max(70, (-V.y * 0.5 + 0.5) * h - 14), behind = V.z > 1;
      var gone = b.t > b.dur, s = gone ? 0.2 : 1;
      b.el.style.left = x + 'px'; b.el.style.top = y + 'px';
      b.el.style.transform = 'translate(-50%,-100%) scale(' + s + ')'; b.el.style.opacity = gone || behind ? 0 : 1;
      if (b.t > b.dur + 0.25) { b.el.remove(); list.splice(i, 1); }
    }
  }
  return {
    say: say, update: update,
    clear: function () { list.forEach(function (b) { b.el.remove(); }); list.length = 0; },
    dispose: function () { layer.remove(); list.length = 0; }
  };
}

module.exports = { createSpeech: createSpeech };
