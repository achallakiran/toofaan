/* view: the Hero studio floor, grid and a height ruler so scale can be judged. */
'use strict';

function textSprite(text) {
  var c = document.createElement('canvas'); c.width = 128; c.height = 48;
  var x = c.getContext('2d'); x.font = '600 30px system-ui, sans-serif'; x.fillStyle = '#cfe3ff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 26);
  var t = new THREE.CanvasTexture(c), m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false });
  var s = new THREE.Sprite(m); s.scale.set(0.32, 0.12, 1); s.renderOrder = 8; return s;
}

function createStudioStage() {
  var g = new THREE.Group(), disposables = [];
  var floorGeo = new THREE.CylinderGeometry(2.5, 2.55, 0.06, 48), floorMat = new THREE.MeshLambertMaterial({ color: 0x2a343f });
  var floor = new THREE.Mesh(floorGeo, floorMat); floor.position.y = -0.03; g.add(floor);
  var ringGeo = new THREE.TorusGeometry(2.52, 0.025, 8, 64), ringMat = new THREE.MeshBasicMaterial({ color: 0xffc21a });
  var ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; g.add(ring);
  var grid = new THREE.GridHelper(4.5, 18, 0x4a5b6c, 0x344352); grid.position.y = 0.002; g.add(grid);
  disposables.push(floorGeo, floorMat, ringGeo, ringMat);

  var ruler = new THREE.Group(); ruler.position.set(-1.45, 0, 0.2); g.add(ruler);
  var rMat = new THREE.MeshBasicMaterial({ color: 0x8fb4de });
  var post = new THREE.Mesh(new THREE.BoxGeometry(0.014, 2.2, 0.014), rMat); post.position.y = 1.1; ruler.add(post);
  for (var i = 0; i <= 8; i++) {
    var y = i * 0.25, big = i % 2 === 0, tk = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.18 : 0.1, 0.01, 0.01), rMat);
    tk.position.set(big ? 0.09 : 0.05, y, 0); ruler.add(tk);
    if (big && i > 0) { var sp = textSprite((y).toFixed(1) + ' m'); sp.position.set(0.36, y, 0); ruler.add(sp); }
  }
  var mark = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xffc21a, depthTest: false }));
  mark.renderOrder = 7; ruler.add(mark);
  disposables.push(post.geometry, rMat);

  return {
    group: g, ruler: ruler,
    setHeight: function (m) { mark.position.set(0.25, m, 0); },
    showRuler: function (v) { ruler.visible = v; },
    dispose: function () { disposables.forEach(function (d) { d.dispose(); }); }
  };
}

module.exports = { createStudioStage: createStudioStage };
