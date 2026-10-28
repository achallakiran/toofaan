/* view: renderer, scene, lights and streamed world chunks. Reads simulation state and chunk events; never writes to the simulation. */
'use strict';

var CONFIG = require('../data/config');
var boxmesh = require('./boxmesh');

function createView(canvas) {
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fb6c9');
  scene.fog = new THREE.Fog('#9fb6c9', 40, 85);
  var camera = new THREE.PerspectiveCamera(46, 1, 0.05, 140);
  var hemi = new THREE.HemisphereLight('#dfeaff', '#7a6a58', 0.85); scene.add(hemi);
  var sun = new THREE.DirectionalLight('#fff3dc', 0.75); sun.position.set(-20, 40, 15); scene.add(sun);

  var chunkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  var chunks = {}, chunkBytes = 0, disposed = false;

  function resize() {
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  return {
    scene: scene, camera: camera, renderer: renderer, canvas: canvas,
    /* mode-specific look. fog:false for the studio */
    setSky: function (color, fog) {
      scene.background.set(color); scene.fog.color.set(color); scene.fog.near = fog ? 40 : 500; scene.fog.far = fog ? 85 : 900;
      hemi.intensity = fog ? 0.85 : 0.95; sun.intensity = fog ? 0.75 : 0.8;
    },
    addChunk: function (spec) {
      if (chunks[spec.key]) return;
      var a = boxmesh.boxesToArrays(spec.boxes, CONFIG.PALETTE);
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
      g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3));
      g.setIndex(new THREE.BufferAttribute(a.indices, 1));
      var m = new THREE.Mesh(g, chunkMat);
      m.position.set(spec.ox, 0, spec.oz);
      g.computeBoundingSphere();
      scene.add(m); chunks[spec.key] = { mesh: m, bytes: a.bytes }; chunkBytes += a.bytes;
    },
    removeChunk: function (key) {
      var c = chunks[key]; if (!c) return;
      scene.remove(c.mesh); c.mesh.geometry.dispose(); chunkBytes -= c.bytes; delete chunks[key];
    },
    clearChunks: function () { for (var k in chunks) this.removeChunk(k); },
    followCamera: function (x, z, shot) {
      if (!shot) { camera.position.set(x, 6.4, z + 6.6); camera.lookAt(x, 1.0, z - 2.2); if (camera.fov !== 46) { camera.fov = 46; camera.updateProjectionMatrix(); } return; }
      camera.position.set(shot.x, shot.y, shot.z); camera.lookAt(shot.lx, shot.ly, shot.lz);
      if (Math.abs(camera.fov - shot.fov) > 0.01) { camera.fov = shot.fov; camera.updateProjectionMatrix(); }
    },
    render: function () { renderer.render(scene, camera); },
    stats: function () {
      var i = renderer.info;
      return { triangles: i.render.triangles, calls: i.render.calls, bytes: chunkBytes, chunkMeshes: Object.keys(chunks).length, geometries: i.memory.geometries };
    },
    resize: resize,
    dispose: function () {
      if (disposed) return; disposed = true;
      for (var k in chunks) this.removeChunk(k);
      window.removeEventListener('resize', resize); renderer.dispose();
    }
  };
}

module.exports = { createView: createView };
