/* view: the hero as a jointed rig. Meshes are built once and shared; each rig is a tree of pivots.
   Pose conventions (see data/poses.js): positive arm/leg pitch swings forward, positive knee bends the shin back,
   positive elbow bends the hand forward, positive ankle lifts the toes. Lead = A, rear = B. */
'use strict';

var SK = require('../data/skeleton');
var vg = require('./voxgrid');
var hv = require('./herovox');

var D2R = Math.PI / 180, VS = SK.VS;
var caches = {};
/* R1: every part of a rig is one skinned mesh (one draw call) instead of ~20 separate meshes. ?skin=0 in the address brings the old per-part meshes back, to compare. */
var SKIN = !(typeof location !== 'undefined' && /[#?&]skin=0/.test(location.href || ''));

function getTemplate(variant) {
  variant = variant || 'hero';
  if (caches[variant]) return caches[variant];
  var parts = hv.buildParts(variant === 'hero' ? undefined : variant), geo = {}, stats = { parts: {}, voxels: 0, triangles: 0, bytes: 0 }, seed = 0;
  Object.keys(parts).forEach(function (name) {
    var p = parts[name], a = vg.meshGrid(p.grid, p.pivot, VS, { jitter: 0.05, seed: ++seed });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3));
    g.setIndex(new THREE.BufferAttribute(a.indices, 1));
    g.computeBoundingSphere();
    geo[name] = g;
    stats.parts[name] = { voxels: a.voxels, triangles: a.triangles };
    stats.voxels += a.voxels; stats.triangles += a.triangles; stats.bytes += a.bytes;
  });
  var face = null;
  if (variant === 'thug') {                                   /* where the eyes and mouth sit on the head grid, so lids and blood can be laid over them */
    var hg = parts.head.grid; face = { pivot: parts.head.pivot, fzL: vg.frontZ(hg, 3, 7), fzR: vg.frontZ(hg, 7, 7), fzM: vg.frontZ(hg, 5, 2) };
  }
  caches[variant] = { geo: geo, stats: stats, face: face, mat: new THREE.MeshLambertMaterial({ vertexColors: true }) };
  return caches[variant];
}

function createHeroRig(variant) {
  var T = getTemplate(variant), root = new THREE.Group(), body = new THREE.Group(), joints = [], meshes = [], skinParts = [];
  root.add(body);
  function G(parent, pos, name) {
    var g = SKIN ? new THREE.Bone() : new THREE.Group(); g.position.set(pos[0] * VS, pos[1] * VS, pos[2] * VS); parent.add(g);
    joints.push({ name: name, obj: g, parent: parent }); return g;
  }
  function M(parent, name) {
    if (SKIN && name !== 'guitar') {                                   /* joins the one skinned mesh built after the joints exist (hidden thug parts are left out) */
      if (!(variant === 'thug' && /^(hair|beard)/.test(name))) skinParts.push({ name: name, joint: parent });
      return null;
    }
    var m = new THREE.Mesh(T.geo[name], T.mat); parent.add(m); meshes.push(m); return m;
  }

  var hips = G(body, [0, SK.hipY, 0], 'hips'); M(hips, 'pelvis');
  var spine = G(hips, SK.spine, 'spine'); M(spine, 'torso');
  var neck = G(spine, SK.neck, 'neck'); M(neck, 'neck');
  var head = G(neck, SK.head, 'head'); M(head, 'head');
  var hair = [], sp = head;
  for (var i = 0; i < 3; i++) { var sg = G(sp, i === 0 ? SK.hair : SK.hairStep, 'hair' + i); M(sg, 'hair' + i); hair.push(sg); sp = sg; }
  var beard = G(head, SK.beard, 'beard'); M(beard, 'beard');
  var guitar = new THREE.Group(); body.add(guitar); var guitarMesh = M(guitar, 'guitar');
  if (variant === 'thug') { guitar.visible = false; beard.visible = false; hair.forEach(function (h0) { h0.visible = false; }); }

  /* a hurt thug's face: eyelids that squeeze shut, an open mouth, a smear of blood. Thin boxes just proud of the face, hidden until needed. */
  var faceFx = null;
  if (variant === 'thug' && T.face) {
    var F = T.face;
    var fbox = function (w, h, d, col, gx, gy, gz) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w * VS, h * VS, d * VS), new THREE.MeshLambertMaterial({ color: col }));
      m.position.set((gx - F.pivot.x) * VS, (gy - F.pivot.y) * VS, (gz - F.pivot.z) * VS); m.visible = false; head.add(m); return m;
    };
    faceFx = {
      lids: [fbox(3.2, 1.3, 0.7, 0x946238, 3.5, 7.5, F.fzL + 1.3), fbox(3.2, 1.3, 0.7, 0x946238, 7.5, 7.5, F.fzR + 1.3),
             fbox(3.0, 0.32, 0.9, 0x1c1612, 3.5, 7.15, F.fzL + 1.45), fbox(3.0, 0.32, 0.9, 0x1c1612, 7.5, 7.15, F.fzR + 1.45)],
      mouth: fbox(3.2, 1.2, 0.6, 0x3a0d0d, 5.5, 2.5, F.fzM + 1.3),
      blood: fbox(0.9, 2.0, 0.4, 0xa3151a, 5.8, 1.3, F.fzM + 1.25),
      mouthPt: [(5.5 - F.pivot.x) * VS, (2.3 - F.pivot.y) * VS, (F.fzM + 1.2 - F.pivot.z) * VS], eyePt: [(5.5 - F.pivot.x) * VS, (7.5 - F.pivot.y) * VS, (F.fzL + 1.2 - F.pivot.z) * VS]
    };
  }

  var side = {};
  [['L', 1], ['R', -1]].forEach(function (d) {
    var S = d[0], s = d[1], o = { s: s };
    o.shoulder = G(spine, [s * SK.shoulder[0], SK.shoulder[1], 0], 'shoulder' + S); M(o.shoulder, 'uarm' + S);
    o.elbow = G(o.shoulder, SK.elbow, 'elbow' + S); M(o.elbow, 'farm' + S);
    o.wrist = G(o.elbow, SK.wrist, 'wrist' + S); M(o.wrist, 'hand' + S);
    o.hip = G(hips, [s * SK.hip[0], 0, 0], 'hip' + S); M(o.hip, 'thigh' + S);
    o.knee = G(o.hip, SK.knee, 'knee' + S); M(o.knee, 'shin' + S);
    o.ankle = G(o.knee, SK.ankle, 'ankle' + S); M(o.ankle, 'foot' + S);
    o.toe = G(o.ankle, SK.toe, 'toe' + S); M(o.toe, 'toe' + S);
    side[S] = o;
  });

  if (SKIN) buildSkin();
  function buildSkin() {
    root.updateMatrixWorld(true);
    var bones = joints.map(function (j) { return j.obj; });
    if (!T.skin) {                                                     /* the merged geometry is the same for every rig of this variant: build it once */
      var vc = 0, ic = 0, i, n;
      skinParts.forEach(function (p) { var g = T.geo[p.name]; vc += g.attributes.position.count; ic += g.index.count; });
      var pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), col = new Float32Array(vc * 3), idx = new Uint32Array(ic), si = new Uint16Array(vc * 4), sw = new Float32Array(vc * 4);
      var vo = 0, io = 0, v = new THREE.Vector3(), nm = new THREE.Matrix3();
      skinParts.forEach(function (p) {
        var g = T.geo[p.name], pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, m = p.joint.matrixWorld, bi = bones.indexOf(p.joint);
        nm.getNormalMatrix(m); n = pa.count;
        for (i = 0; i < n; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(m); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
          v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
          col[(vo + i) * 3] = ca.getX(i); col[(vo + i) * 3 + 1] = ca.getY(i); col[(vo + i) * 3 + 2] = ca.getZ(i);
          si[(vo + i) * 4] = bi; sw[(vo + i) * 4] = 1;
        }
        for (i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
        vo += n; io += g.index.count;
      });
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
      T.skin = { geo: geo, mat: new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true }) };
    }
    var sm = new THREE.SkinnedMesh(T.skin.geo, T.skin.mat); sm.frustumCulled = false; root.add(sm);
    sm.bind(new THREE.Skeleton(bones)); meshes.push(sm);
  }

  /* points that must not sink below the floor: [object, local voxel point, radius in voxels] */
  var samples = [];
  ['L', 'R'].forEach(function (S) {
    var o = side[S];
    samples.push([o.ankle, [0, -3, -2.2], 0], [o.ankle, [0, -3, 5.0], 0], [o.toe, [0, -1, 3.8], 0]);
    samples.push([o.elbow, [0, 0, -2.5], 2.4], [o.wrist, [0, -3.5, 0], 2.8], [o.knee, [0, 0, 0], 3.8]);
  });
  samples.push([head, [0, 7, 1], 5.2], [spine, [0, 12, -5], 1], [hips, [0, 2, -5], 2]);
  var tmp = new THREE.Vector3(), inv = new THREE.Matrix4();

  function setE(obj, x, y, z, order) { obj.rotation.set(x * D2R, y * D2R, z * D2R, order); }

  /* ---- guitar: slung on the back (on = 0) or held in front in spine space (on = 1); both hands follow it with arm IK ---- */
  var gQ = new THREE.Quaternion(), gQ2 = new THREE.Quaternion(), gE = new THREE.Euler(), gP = new THREE.Vector3(), gP2 = new THREE.Vector3(),
      gAxis = new THREE.Vector3(), gM = new THREE.Matrix4(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(),
      q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), mB = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  var L1 = Math.abs(SK.elbow[1]) * VS, L2 = Math.abs(SK.wrist[1]) * VS;
  function guitarPoint(yLocal, xLocal, zLocal, out) { return out.set(xLocal * VS, yLocal * VS, zLocal * VS).applyMatrix4(guitar.matrixWorld); }
  function ikArm(o, target, hand, w, fkQ) {
    /* analytic two-bone solve; elbow bends toward the pole (forward and slightly outward) */
    o.shoulder.getWorldPosition(v1); v2.copy(target).sub(v1);
    var dist = Math.min(L1 + L2 - 0.004, Math.max(0.06, v2.length())); v2.normalize();
    var cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    var cosE = (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), bend = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosE)));
    v3.set(o.s * 0.35, -0.25, 0.8).transformDirection(body.matrixWorld);                         /* pole in world */
    v3.addScaledVector(v2, -v3.dot(v2)).normalize();
    v4.copy(v2).multiplyScalar(cosA * L1).addScaledVector(v3, sinA * L1).add(v1);                /* elbow position */
    var u = v4.clone().sub(v1).normalize(), f = target.clone().sub(v4).normalize();
    var zl = f.clone().addScaledVector(u, -f.dot(u)); if (zl.lengthSq() < 1e-6) zl.copy(v3); zl.normalize();
    var yl = u.clone().negate(), xl = new THREE.Vector3().crossVectors(yl, zl).normalize();
    mB.makeBasis(xl, yl, zl); q1.setFromRotationMatrix(mB);
    o.shoulder.parent.getWorldQuaternion(q2); q1.premultiply(q2.invert());
    o.shoulder.quaternion.slerp(q1, w);
    var fk = new THREE.Quaternion().copy(o.elbow.quaternion);
    o.elbow.quaternion.setFromEuler(gE.set(-bend, 0, 0, 'XYZ')); if (w < 1) o.elbow.quaternion.copy(fk.slerp(o.elbow.quaternion, w));
  }
  function applyGuitar(pose) {
    function P(k, d) { return pose[k] === undefined ? d : pose[k]; }
    var on = Math.max(0, Math.min(1, P('gtr.on', 0))), bk = SK.guitarBack;
    var px = bk.pos[0], py = bk.pos[1], pz = bk.pos[2];
    gE.set(bk.rot[0] * D2R, bk.rot[1] * D2R, bk.rot[2] * D2R, 'YXZ'); gQ.setFromEuler(gE);
    if (on > 0) {
      gE.set(P('gtr.rx', 0) * D2R, P('gtr.ry', 0) * D2R, P('gtr.rz', 0) * D2R, 'YXZ'); gQ2.setFromEuler(gE);
      /* held transform is given by where the neck grip sits; the pivot follows from the rotation */
      gAxis.set(0, P('gtr.gy', 14) * VS, 0).applyQuaternion(gQ2);
      gP2.set(P('gtr.px', 0) * VS - gAxis.x, P('gtr.py', 0) * VS - gAxis.y, P('gtr.pz', 0) * VS - gAxis.z);
      gP.set(px * VS, py * VS, pz * VS).lerp(gP2, on); gQ.slerp(gQ2, on);
    } else gP.set(px * VS, py * VS, pz * VS);
    spine.updateMatrixWorld(true);
    guitar.position.copy(gP).applyMatrix4(spine.matrixWorld); body.worldToLocal(guitar.position);
    spine.getWorldQuaternion(q1); body.getWorldQuaternion(q2);
    guitar.quaternion.copy(q2.invert().multiply(q1).multiply(gQ));
    guitar.updateMatrixWorld(true);
    if (on > 0.001) {
      var A = opts_ref.southpaw ? side.R : side.L, B = opts_ref.southpaw ? side.L : side.R;
      [[A, P('gtr.ya', 14)], [B, P('gtr.yb', 8)]].forEach(function (d) {
        var tgt = guitarPoint(d[1] + 2.5, 0, 1.2, new THREE.Vector3()); ikArm(d[0], tgt, null, on);
      });
    }
  }
  var opts_ref = {};

  function applyPose(pose, opts) {
    opts = opts || {}; opts_ref = opts;
    function P(k) { return pose[k] || 0; }
    hips.position.set(P('hip.x'), SK.hipY * VS + P('hip.y'), P('hip.z'));
    setE(hips, P('hip.rx'), P('hip.ry'), -P('hip.rz'), 'YXZ');
    setE(spine, P('spine.rx'), P('spine.ry'), -P('spine.rz'), 'YXZ');
    setE(neck, P('neck.rx'), P('neck.ry'), -P('neck.rz'), 'YXZ');
    setE(head, P('head.rx'), P('head.ry'), -P('head.rz'), 'YXZ');
    var A = opts.southpaw ? side.R : side.L, B = opts.southpaw ? side.L : side.R;
    [[A, 'armA', 'legA'], [B, 'armB', 'legB']].forEach(function (d) {
      var o = d[0], a = d[1], l = d[2], s = o.s;
      setE(o.shoulder, -P(a + '.sx'), s * P(a + '.sy'), s * P(a + '.sz'), 'ZXY');
      setE(o.elbow, -P(a + '.e'), s * P(a + '.pr'), 0, 'XYZ');
      setE(o.wrist, -P(a + '.w'), 0, 0, 'XYZ');
      setE(o.hip, -P(l + '.hx'), s * P(l + '.hy'), s * P(l + '.hz'), 'ZXY');
      setE(o.knee, P(l + '.k'), 0, 0, 'XYZ');
      setE(o.ankle, -P(l + '.a'), 0, 0, 'XYZ');
      setE(o.toe, -P(l + '.t'), 0, 0, 'XYZ');
    });
    applyGuitar(pose);
    body.position.y = 0;
    if (opts.plant !== false) {
      root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
      var low = 1e9;
      for (var i = 0; i < samples.length; i++) {
        var sm = samples[i];
        tmp.set(sm[1][0] * VS, sm[1][1] * VS, sm[1][2] * VS).applyMatrix4(sm[0].matrixWorld).applyMatrix4(inv);
        var y = tmp.y - sm[2] * VS; if (y < low) low = y;
      }
      body.position.y = -low;
    }
  }

  function flutter(t, lift) {
    for (var i = 0; i < hair.length; i++) {            /* long hair: lifts back in the wind of movement, sways gently at rest */
      hair[i].rotation.x = 0.05 + lift * 0.34 + Math.sin(t * 5 - i * 0.9) * 0.08 * (0.5 + lift);
      hair[i].rotation.z = Math.sin(t * 3.3 - i * 1.1) * 0.06 * (0.4 + lift);
    }
  }

  return { root: root, body: body, joints: joints, meshes: meshes, parts: side, hips: hips, spine: spine, neck: neck, head: head,
           faceFx: faceFx, applyPose: applyPose, flutter: flutter, stats: T.stats, guitar: guitar, guitarMesh: guitarMesh, guitarPoint: function (y, x, z) { guitar.updateMatrixWorld(true); return guitarPoint(y, x || 0, z || 0, new THREE.Vector3()); } };
}

/* little joint markers and bone lines, drawn on top of the model */
function createSkeletonOverlay(rig) {
  var g = new THREE.Group(), mats = [], items = [];
  var dotMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, depthTest: false, transparent: true }), lineMat = new THREE.LineBasicMaterial({ color: 0x4fc3ff, depthTest: false, transparent: true });
  var dotGeo = new THREE.SphereGeometry(0.022, 8, 6);
  rig.joints.forEach(function (j) {
    var dot = new THREE.Mesh(dotGeo, dotMat); dot.renderOrder = 10; g.add(dot);
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    var line = new THREE.Line(geo, lineMat); line.renderOrder = 9; line.frustumCulled = false; g.add(line);
    items.push({ j: j, dot: dot, line: line });
  });
  var a = new THREE.Vector3(), b = new THREE.Vector3();
  g.userData.update = function () {
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; it.j.obj.getWorldPosition(a); it.dot.position.copy(a);
      it.j.parent.getWorldPosition(b);
      var p = it.line.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
    }
  };
  g.userData.dispose = function () { dotGeo.dispose(); dotMat.dispose(); lineMat.dispose(); items.forEach(function (it) { it.line.geometry.dispose(); }); };
  return g;
}

module.exports = { createHeroRig: createHeroRig, createSkeletonOverlay: createSkeletonOverlay, getTemplate: getTemplate };
