/* view: renderer, scene, lights and streamed world chunks. Reads simulation state and chunk events; never writes to the simulation. */
'use strict';

var CONFIG = require('../data/config');
var boxmesh = require('./boxmesh');

/* THE LOOK (a test switch for now, in the pause menu with ?dev=1): the whole game's style as a few high-level values, laid over whatever
   each place sets. filter: a colour grade over the finished picture (so it reaches everything, lit or not); hemi / sun: the lights,
   scaled; haze: the fog pulled nearer and toward a soft colour, the sky with it; px: draw at 1/px the size and blow it up crisp (Retro).
   The dream and the thappad keep their own look (their modes suspend it). */
var LOOKS = {
  current: { filter: '', hemi: 1, sun: 1, haze: 0 },
  soft: { filter: 'saturate(.66) brightness(1.1) contrast(.85) sepia(.08)', hemi: 1.3, sun: 0.62, sunColor: '#ffe2bd', haze: 0.32, hazeColor: '#eadfd2', fogNear: 0.55, fogFar: 0.85 },
  retro: { filter: 'saturate(1.22) contrast(1.08)', hemi: 1, sun: 1.05, haze: 0, pixel: true }
};

function createView(canvas, tierName) {
  var tier = CONFIG.TIERS[tierName] || CONFIG.TIERS.high, tierId = CONFIG.TIERS[tierName] ? tierName : 'high';
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: tier.aa, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.pr));
  var lastT = 0, frameMs = 16;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fb6c9');
  scene.fog = new THREE.Fog('#9fb6c9', 40, tier.fogFar);
  var camera = new THREE.PerspectiveCamera(46, 1, 0.05, 140);
  var hemi = new THREE.HemisphereLight('#dfeaff', '#7a6a58', 0.85); scene.add(hemi);
  var sun = new THREE.DirectionalLight('#fff3dc', 0.75); sun.position.set(-20, 40, 15); scene.add(sun);

  var chunkMat = new THREE.MeshLambertMaterial({ vertexColors: true }), frameHooks = [];
  var chunks = {}, chunkBytes = 0, disposed = false;

  function resize() {
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  /* turning the phone: the size can settle a moment after the event, so measure again shortly after */
  function resizeSoon() { resize(); setTimeout(resize, 120); setTimeout(resize, 450); }
  /* the look's grade, vignette and pixel size go on the page (see LOOKS); held off for the dream and the thappad */
  var look = { style: 'current', px: 3, vignette: false }, lookHeld = false, lookState = '', tmpC = new THREE.Color();
  var vig = document.createElement('div'); vig.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;display:none;background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 52%,rgba(20,8,4,.42) 100%)';
  if (canvas.parentNode) canvas.parentNode.insertBefore(vig, canvas.nextSibling);
  function lookOn(on, force) {
    on = on && !lookHeld; var L = LOOKS[look.style] || LOOKS.current, key = on ? look.style + look.px + look.vignette : 'off';
    if (key === lookState && !force) return; lookState = key;
    canvas.style.filter = on ? L.filter : ''; vig.style.display = on && look.vignette ? 'block' : 'none';
    var pr = on && L.pixel ? 1 / look.px : Math.min(window.devicePixelRatio || 1, tier.pr);
    canvas.style.imageRendering = on && L.pixel ? 'pixelated' : '';
    if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); resize(); }
  }
  window.addEventListener('resize', resizeSoon); window.addEventListener('orientationchange', resizeSoon);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeSoon);
  resize();

  return {
    tier: tier, tierId: tierId,
    scene: scene, camera: camera, renderer: renderer, canvas: canvas, lights: { hemi: hemi, sun: sun },
    /* mode-specific look. fog:false for the studio */
    setSky: function (color, fog) {
      scene.background.set(color); scene.fog.color.set(color); scene.fog.near = fog ? 40 : 500; scene.fog.far = fog ? tier.fogFar : 900;
      hemi.intensity = fog ? 0.85 : 0.95; sun.intensity = fog ? 0.75 : 0.8;
    },
    addChunk: function (spec) {
      if (chunks[spec.key]) return;
      /* the structure (ground, walls, big shapes) is always drawn; the fine detail (signs, balconies, trees, wires...) is a second mesh drawn only when near */
      var main = [], fine = [], i;
      for (i = 0; i < spec.boxes.length; i++) (spec.boxes[i].d ? fine : main).push(spec.boxes[i]);
      function build(list) {
        var a = boxmesh.boxesToArrays(list, CONFIG.PALETTE), g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
        g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3));
        g.setIndex(new THREE.BufferAttribute(a.indices, 1));
        var m = new THREE.Mesh(g, chunkMat); m.position.set(spec.ox, 0, spec.oz); g.computeBoundingSphere(); scene.add(m); return { m: m, bytes: a.bytes };
      }
      var A = build(main), Bf = fine.length ? build(fine) : null;
      chunks[spec.key] = { mesh: A.m, fine: Bf && Bf.m, ox: spec.ox, oz: spec.oz, bytes: A.bytes + (Bf ? Bf.bytes : 0) }; chunkBytes += chunks[spec.key].bytes;
    },
    removeChunk: function (key) {
      var c = chunks[key]; if (!c) return;
      scene.remove(c.mesh); c.mesh.geometry.dispose(); if (c.fine) { scene.remove(c.fine); c.fine.geometry.dispose(); } chunkBytes -= c.bytes; delete chunks[key];
    },
    /* near-detail LOD: fine meshes show only within `r` metres of the focus (the fog hides everything past ~85 m anyway) */
    updateLod: function (fx, fz, r) {
      var k, c, d; for (k in chunks) { c = chunks[k]; if (!c.fine) continue; d = Math.hypot(c.ox - fx, c.oz - fz); c.fine.visible = d < r; }
    },
    clearChunks: function () { for (var k in chunks) this.removeChunk(k); },
    followCamera: function (x, z, shot) {
      if (window.__camShot) shot = window.__camShot;                     /* (test tools: hold the camera on a set shot) */
      if (!shot) { camera.position.set(x, 6.4, z + 6.6); camera.lookAt(x, 1.0, z - 2.2); if (camera.fov !== 46) { camera.fov = 46; camera.updateProjectionMatrix(); } return; }
      camera.position.set(shot.x, shot.y, shot.z); camera.lookAt(shot.lx, shot.ly, shot.lz);
      if (Math.abs(camera.fov - shot.fov) > 0.01) { camera.fov = shot.fov; camera.updateProjectionMatrix(); }
    },
    render: function () {
      var n = performance.now(), dt = lastT ? Math.min(0.1, (n - lastT) / 1000) : 1 / 60; if (lastT) { var d = n - lastT; if (d < 500) frameMs += (d - frameMs) * 0.08; } lastT = n;
      for (var h = 0; h < frameHooks.length; h++) frameHooks[h](camera, dt);   /* last word before drawing, once the camera is placed (the arena's see-through fade) */
      lookOn(true);
      var L = LOOKS[look.style] || LOOKS.current, keep = null;
      if (!lookHeld && (L.hemi !== 1 || L.sun !== 1 || L.haze)) {
        /* the look over this frame only: the place's own lights and fog are put back straight after, so nothing that sets them is touched */
        keep = { hi: hemi.intensity, si: sun.intensity, sc: sun.color.getHex(), fc: scene.fog && scene.fog.color.getHex(), fn: scene.fog && scene.fog.near, ff: scene.fog && scene.fog.far, bg: scene.background && scene.background.isColor ? scene.background.getHex() : null };
        hemi.intensity *= L.hemi; sun.intensity *= L.sun; if (L.sunColor) sun.color.lerp(tmpC.set(L.sunColor), 0.6);
        if (L.haze && scene.fog) { tmpC.set(L.hazeColor); scene.fog.color.lerp(tmpC, L.haze); scene.fog.near *= L.fogNear; scene.fog.far *= L.fogFar; if (keep.bg !== null) scene.background.lerp(tmpC, L.haze * 0.8); }
      }
      renderer.render(scene, camera);
      if (keep) { hemi.intensity = keep.hi; sun.intensity = keep.si; sun.color.setHex(keep.sc); if (scene.fog) { scene.fog.color.setHex(keep.fc); scene.fog.near = keep.fn; scene.fog.far = keep.ff; } if (keep.bg !== null && scene.background && scene.background.isColor) scene.background.setHex(keep.bg); }
    },
    /* the look: { style: 'current' | 'soft' | 'retro', px: 2 | 3, vignette: bool } */
    setLook: function (o) { look = { style: LOOKS[o.style] ? o.style : 'current', px: o.px === 2 ? 2 : 3, vignette: !!o.vignette }; lookOn(!lookHeld, true); },
    getLook: function () { return { style: look.style, px: look.px, vignette: look.vignette }; },
    LOOK_STYLES: Object.keys(LOOKS),
    /* the dream and the thappad draw in their own style: they hold the look off while they show */
    holdLook: function (h) { lookHeld = !!h; lookOn(!lookHeld, true); },
    onFrame: function (fn) { frameHooks.push(fn); return function () { var i = frameHooks.indexOf(fn); if (i >= 0) frameHooks.splice(i, 1); }; },
    stats: function () {
      var i = renderer.info;
      return { triangles: i.render.triangles, calls: i.render.calls, bytes: chunkBytes, chunkMeshes: Object.keys(chunks).length, geometries: i.memory.geometries, ms: frameMs, tier: tierId };
    },
    resize: resize,
    dispose: function () {
      if (disposed) return; disposed = true;
      for (var k in chunks) this.removeChunk(k);
      window.removeEventListener('resize', resizeSoon); window.removeEventListener('orientationchange', resizeSoon); renderer.dispose();
    }
  };
}

module.exports = { createView: createView };
