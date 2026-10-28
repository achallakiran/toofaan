/* view: the Bijli, a classic Indian cruiser built from voxels (8.5 cm). Parts: body, fork with bars and headlight, two wheels.
   Grid axes: x across (centre 5), y up, z forward. The mesh origin of the whole bike is on the ground, mid wheelbase. */
'use strict';

var vg = require('./voxgrid');
var h = vg.hex;
var VS = 0.085;
var BO = { x: 5, y: 0, z: 13.5 };                       /* bike origin, in body-grid voxels */
var REAR = { y: 4.5, z: 5 }, HEAD = { y: 11.5, z: 20.5 }, AXLE = { y: 4.5, z: 23 };
var C = { blue: h('#1f56c8'), blueD: h('#16408f'), yel: h('#ffc21a'), chrome: h('#cfd5da'), chromeD: h('#8e979f'), blk: h('#17191c'), grey: h('#6b747d'), greyD: h('#454c53'),
          seat: h('#2b1d14'), seatL: h('#3d2a1c'), red: h('#d83a2e'), lamp: h('#fff3c4'), tyre: h('#1b1c1f'), tyreL: h('#2a2c31'), rim: h('#e8ecef'), hub: h('#9aa4ab') };

function buildBody() {
  var g = vg.createGrid(11, 16, 30), x;
  vg.box(g, 4, 3, 8, 6, 7, 15, C.grey);                                         /* engine block */
  vg.box(g, 4, 7, 10, 6, 8, 14, C.greyD);                                       /* cylinder head */
  vg.box(g, 3, 4, 9, 3, 6, 13, C.chromeD); vg.box(g, 7, 4, 9, 7, 6, 13, C.chromeD);      /* crankcase covers */
  vg.box(g, 4, 3, 5, 6, 3, 9, C.greyD);                                         /* swing arm joint / gearbox */
  vg.box(g, 2, 4, 3, 2, 4, 15, C.blk); vg.box(g, 8, 4, 3, 8, 4, 15, C.blk);     /* swing arms */
  for (x = 0; x < 6; x++) { vg.set(g, 2, 5 + x, 5 + Math.round(x * 0.3), C.chrome); vg.set(g, 8, 5 + x, 5 + Math.round(x * 0.3), C.chrome); } /* rear shocks */
  vg.ellipsoid(g, 5, 11, 15, 2.9, 2.3, 5, function (xx, yy, zz) { return (xx === 5 && yy >= 12) ? C.yel : (yy < 10 ? C.blueD : C.blue); });  /* teardrop tank with a yellow stripe */
  vg.box(g, 4, 9, 11, 6, 9, 12, C.blk);                                         /* tank mount */
  vg.box(g, 3, 8, 4, 7, 8, 12, C.seat); vg.box(g, 4, 9, 5, 6, 9, 11, C.seatL);  /* the seat */
  vg.box(g, 3, 9, 4, 7, 9, 4, C.seat);                                          /* seat back lip */
  vg.box(g, 4, 9, 1, 6, 9, 8, C.blue); vg.box(g, 3, 8, 0, 7, 8, 2, C.blue);     /* rear fender over the wheel */
  vg.set(g, 5, 8, 0, C.red); vg.set(g, 5, 9, 0, C.red);                         /* tail light */
  vg.box(g, 4, 5, 18, 6, 11, 19, C.blk);                                        /* frame down tube to the head */
  vg.box(g, 5, 9, 17, 5, 10, 18, C.blk);
  vg.box(g, 8, 3, 1, 9, 4, 14, C.chrome); vg.box(g, 9, 2, 1, 9, 3, 13, C.chromeD); /* long chrome silencer on the right */
  vg.box(g, 8, 2, 14, 8, 3, 16, C.chrome); vg.set(g, 9, 3, 0, C.blk);
  vg.box(g, 7, 3, 15, 7, 5, 16, C.chrome);                                      /* exhaust header */
  vg.box(g, 1, 3, 12, 2, 3, 13, C.blk); vg.box(g, 8, 3, 12, 9, 3, 13, C.blk);   /* foot pegs */
  vg.box(g, 3, 3, 15, 3, 3, 16, C.blk);
  vg.box(g, 3, 3, 6, 3, 4, 7, C.blk);                                           /* pillion pegs */
  return g;
}

function buildFork() {                          /* origin: the steering head */
  var g = vg.createGrid(11, 16, 12), i;
  for (i = 0; i < 8; i++) { var z = 3 + Math.round(i * 0.4), y = 11 - i; vg.set(g, 3, y, z, C.chrome); vg.set(g, 7, y, z, C.chrome); vg.set(g, 3, y, z + 1, C.chromeD); vg.set(g, 7, y, z + 1, C.chromeD); }  /* fork legs sloping to the axle */
  vg.box(g, 3, 12, 2, 7, 12, 3, C.blk); vg.box(g, 4, 11, 2, 6, 11, 3, C.blk);  /* top yoke */
  vg.box(g, 0, 13, 2, 10, 13, 2, C.chrome);                                      /* upright bars */
  vg.box(g, 0, 12, 2, 0, 13, 2, C.chrome); vg.box(g, 10, 12, 2, 10, 13, 2, C.chrome);
  vg.box(g, 0, 13, 1, 1, 13, 3, C.blk); vg.box(g, 9, 13, 1, 10, 13, 3, C.blk);  /* grips */
  vg.box(g, 1, 14, 2, 1, 14, 2, C.chrome); vg.box(g, 9, 14, 2, 9, 14, 2, C.chrome); /* levers */
  vg.ellipsoid(g, 5, 10.2, 5.5, 2.2, 1.9, 2.0, C.chrome);                        /* round headlight */
  vg.ellipsoid(g, 5, 10.2, 7.0, 1.4, 1.3, 0.9, C.lamp);
  vg.box(g, 4, 12, 3, 6, 13, 4, C.blk);                                           /* little speedo */
  vg.box(g, 4, 8, 3, 6, 8, 9, C.blue); vg.box(g, 3, 7, 5, 7, 7, 9, C.blue);      /* front fender above the wheel */
  return g;
}

function buildWheel() {
  var g = vg.createGrid(3, 9, 9), y, z;
  for (y = 0; y < 9; y++) for (z = 0; z < 9; z++) {
    var d = Math.hypot(y + 0.5 - 4.5, z + 0.5 - 4.5), x;
    if (d > 4.6) continue;
    for (x = 0; x < 3; x++) {
      var c;
      if (d > 3.6) c = ((y + z) & 1) ? C.tyre : C.tyreL;
      else if (d > 2.7) c = C.rim;
      else if (d > 1.1) c = (((Math.round(Math.atan2(z - 4, y - 4) / (Math.PI / 4))) & 1) ? C.chromeD : C.rim);   /* spokes */
      else c = C.hub;
      vg.set(g, x, y, z, c);
    }
  }
  return g;
}

var cache = null;
function mesh(g, pivot, seed) {
  var a = vg.meshGrid(g, pivot, VS, { jitter: 0.04, seed: seed });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); geo.setIndex(new THREE.BufferAttribute(a.indices, 1)); geo.computeBoundingSphere();
  return geo;
}
function templates() {
  if (cache) return cache;
  cache = { mat: new THREE.MeshLambertMaterial({ vertexColors: true }),
            body: mesh(buildBody(), BO, 1), fork: mesh(buildFork(), { x: 5, y: HEAD.y - 3 + 3 - 0, z: 3.5 }, 2), wheel: mesh(buildWheel(), { x: 1.5, y: 4.5, z: 4.5 }, 3) };
  return cache;
}

/* The bike object: root (position, heading), lean group (roll about the long axis), body, a fork that turns with the bars and carries the front wheel.
   seat: where the rider's hips go, in root space. */
function createBike() {
  var T = templates(), root = new THREE.Group(), lean = new THREE.Group(), pitch = new THREE.Group();
  root.add(lean); lean.add(pitch);
  var body = new THREE.Mesh(T.body, T.mat); pitch.add(body);
  function at(gx, gy, gz) { return [(gx - BO.x) * VS, (gy - BO.y) * VS, (gz - BO.z) * VS]; }
  var rp = at(5, REAR.y, REAR.z), rear = new THREE.Group(); rear.position.set(rp[0], rp[1], rp[2]); rear.add(new THREE.Mesh(T.wheel, T.mat)); pitch.add(rear);
  var hp = at(5, HEAD.y, HEAD.z - 17), fork = new THREE.Group();                 /* head pivot sits on the steering axis */
  var fpos = at(5, HEAD.y, HEAD.z); fork.position.set(fpos[0], fpos[1], fpos[2]); pitch.add(fork);
  /* the fork mesh's origin is at grid (5, HEAD.y, 3.5) in fork-grid coordinates, i.e. the head */
  fork.add(new THREE.Mesh(T.fork, T.mat));
  var front = new THREE.Group(); front.position.set(0, (AXLE.y - HEAD.y) * VS, (AXLE.z - HEAD.z) * VS); front.add(new THREE.Mesh(T.wheel, T.mat)); fork.add(front);
  var seat = at(5, 9, 8.5);
  return { root: root, lean: lean, pitch: pitch, fork: fork, front: front, rear: rear, seat: { x: seat[0], y: seat[1], z: seat[2] }, wheelR: 4.6 * VS,
           pegs: { y: 3.2 * VS, z: (13 - BO.z) * VS, x: 4 * VS }, bars: { y: (HEAD.y + 2.0) * VS, z: (HEAD.z - BO.z - 1.4) * VS, x: 4.2 * VS } };
}

module.exports = { createBike: createBike, VS: VS };
