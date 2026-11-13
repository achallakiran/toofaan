/* view: soft round shadows under people and vehicles (one of the look's cheap extras): a blurred dark disc on the ground under each one,
   following it every frame. ground 'zero' (fights, the road): the ground is y = 0, so when he is thrown or jumps the disc stays down
   and shrinks and fades with his height. ground 'feet' (stealth roofs, the hideout): the disc sits at his feet wherever they are.
   hide(): a test for when there should be none (on a ladder). A disc whose owner has left the scene goes with it. */
'use strict';

var tex = null;
function texture() {
  if (tex) return tex;
  var c = document.createElement('canvas'); c.width = c.height = 64;
  var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  tex = new THREE.CanvasTexture(c); return tex;
}

function createBlobs(scene) {
  var list = [], on = true, geo = null, v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  return {
    /* obj: whose shadow; rx, rz: its half-size across and along (metres); opts: { ground: 'zero' | 'feet', hide: fn, dark: 0..1 } */
    add: function (obj, rx, rz, opts) {
      opts = opts || {}; geo = geo || new THREE.PlaneGeometry(2, 2);
      var mat = new THREE.MeshBasicMaterial({ map: texture(), transparent: true, depthWrite: false, opacity: opts.dark || 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      var g = new THREE.Group(), m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.renderOrder = 1; g.add(m); scene.add(g);
      list.push({ obj: obj, g: g, mat: mat, base: opts.dark || 0.55, feet: opts.ground === 'feet', hide: opts.hide }); g.visible = false;
    },
    update: function () {
      for (var i = list.length - 1; i >= 0; i--) {
        var b = list[i];
        if (!b.obj.parent) { scene.remove(b.g); b.mat.dispose(); list.splice(i, 1); continue; }
        var vis = on && b.obj.visible && !(b.hide && b.hide());
        if (vis) { for (var o = b.obj; o; o = o.parent) if (!o.visible) { vis = false; break; } }
        b.g.visible = vis; if (!vis) continue;
        b.obj.getWorldPosition(v); b.obj.getWorldQuaternion(q); e.setFromQuaternion(q, 'YXZ');
        var gy = b.feet ? v.y : 0, h = b.feet ? 0 : Math.max(0, Math.min(2.5, v.y - gy)), k = 1 - h / 3.5;
        b.g.position.set(v.x, gy + 0.03, v.z); b.g.rotation.y = e.y; b.g.scale.setScalar(k); b.mat.opacity = b.base * (1 - h / 3);
      }
    },
    setOn: function (b) { on = !!b; },
    isOn: function () { return on; }
  };
}

module.exports = { createBlobs: createBlobs };
