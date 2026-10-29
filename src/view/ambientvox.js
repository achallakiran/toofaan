/* view: the street's voxel population: autos, scooters, cars, buses, trucks, cows, dogs and people. One shared geometry per kind (and look),
   one mesh per entity. Voxels are 10 cm. Forward is local +z, like the bike. */
'use strict';

var vg = require('./voxgrid');
var h = vg.hex, VS = 0.1;
var C = { blk: h('#17181b'), grey: h('#6b7078'), glass: h('#8fc1d8'), white: h('#f1efe8'), red: h('#c8372d'), yel: h('#f2c230'), grn: h('#2f8f4a'), blue: h('#2b57b8'),
          sf: h('#f08a24'), tyre: h('#1d1e21'), lamp: h('#fff3c4'), skin: h('#b57a52'), skin2: h('#8a5a3a'), hair: h('#1a1410'), cow: h('#e8e2d2'), cowD: h('#8a6a4a'), horn: h('#d8cfa8'), dog: h('#b98a4f') };

function wheel(g, x, z, r) { var y; for (y = 0; y <= r; y++) vg.box(g, x, y, z, x, y, z + (r > 1 ? 1 : 0), C.tyre); vg.box(g, x, 0, z, x, r, z + (r > 1 ? 1 : 0), C.tyre); }

function auto(look) {                                        /* the three-wheeler: yellow body, black hood, green skirt */
  var g = vg.createGrid(15, 20, 28), body = look ? C.grn : C.yel;
  vg.box(g, 2, 3, 6, 12, 7, 26, body); vg.box(g, 2, 3, 6, 12, 4, 26, C.blk);              /* lower body and skirt */
  vg.box(g, 3, 7, 14, 11, 8, 24, C.blk); vg.box(g, 3, 8, 6, 11, 14, 8, C.blk);            /* seat back */
  vg.box(g, 2, 14, 4, 12, 15, 24, C.blk); vg.box(g, 3, 15, 6, 11, 15, 22, C.blk);         /* canvas hood */
  vg.box(g, 2, 8, 24, 12, 13, 24, C.glass); vg.box(g, 6, 3, 25, 8, 5, 27, C.grey);         /* windscreen, front mudguard */
  vg.box(g, 6, 5, 25, 8, 7, 26, C.lamp); vg.box(g, 3, 4, 3, 11, 5, 5, body);
  vg.box(g, 1, 0, 4, 1, 3, 8, C.tyre); vg.box(g, 13, 0, 4, 13, 3, 8, C.tyre); vg.box(g, 7, 0, 24, 7, 3, 26, C.tyre);
  vg.box(g, 6, 8, 20, 8, 9, 22, C.grey);
  return g;
}
function scooter(look) {
  var g = vg.createGrid(9, 16, 18), c = [C.red, C.blue, C.white, C.grn][look % 4];
  vg.box(g, 3, 3, 3, 5, 7, 12, c); vg.box(g, 3, 7, 2, 5, 8, 6, C.blk); vg.box(g, 3, 4, 12, 5, 9, 14, c);
  vg.box(g, 1, 9, 13, 7, 9, 13, C.blk); vg.box(g, 4, 9, 14, 4, 10, 14, C.lamp); vg.box(g, 4, 0, 14, 4, 3, 16, C.tyre); vg.box(g, 4, 0, 1, 4, 3, 4, C.tyre);
  vg.box(g, 3, 8, 3, 5, 14, 5, [C.sf, C.blue, C.grn, C.red][(look + 1) % 4]);               /* rider's body */
  vg.ellipsoid(g, 4, 15, 4, 1.7, 1.6, 1.7, C.skin); vg.box(g, 2, 14, 3, 6, 15, 5, [C.blk, C.red, C.blue][look % 3]);
  vg.box(g, 3, 9, 9, 3, 10, 12, C.skin); vg.box(g, 5, 9, 9, 5, 10, 12, C.skin);
  return g;
}
function car(look) {                                         /* the black-and-yellow taxi, or a plain hatch */
  var g = vg.createGrid(19, 17, 40), body = look ? C.white : C.blk, roof = look ? C.white : C.yel;
  vg.box(g, 2, 3, 3, 16, 8, 37, body); vg.box(g, 4, 8, 11, 14, 13, 28, roof); vg.box(g, 4, 9, 11, 14, 12, 11, C.glass); vg.box(g, 4, 9, 28, 14, 12, 28, C.glass);
  vg.box(g, 4, 9, 12, 4, 12, 27, C.glass); vg.box(g, 14, 9, 12, 14, 12, 27, C.glass);
  vg.box(g, 3, 6, 37, 15, 7, 37, C.lamp); vg.box(g, 3, 6, 2, 15, 7, 2, C.red); vg.box(g, 2, 5, 3, 16, 5, 37, look ? C.grey : C.yel);
  [[1, 6], [17, 6], [1, 28], [17, 28]].forEach(function (q) { vg.box(g, q[0], 0, q[1], q[0] + 1, 4, q[1] + 4, C.tyre); });
  return g;
}
function bus(look) {                                         /* a long red state bus, or a green one */
  var g = vg.createGrid(27, 30, 82), body = look ? C.grn : C.red;
  vg.box(g, 2, 4, 3, 24, 22, 79, body); vg.box(g, 2, 12, 3, 24, 13, 79, C.white); vg.box(g, 2, 4, 3, 24, 6, 79, C.blk);
  var z; for (z = 8; z < 74; z += 9) { vg.box(g, 2, 15, z, 2, 20, z + 6, C.glass); vg.box(g, 24, 15, z, 24, 20, z + 6, C.glass); }
  vg.box(g, 3, 14, 79, 23, 21, 79, C.glass); vg.box(g, 3, 5, 79, 8, 7, 80, C.lamp); vg.box(g, 18, 5, 79, 23, 7, 80, C.lamp); vg.box(g, 9, 21, 79, 17, 22, 79, C.yel);
  vg.box(g, 3, 22, 8, 23, 23, 76, C.white); vg.box(g, 6, 8, 2, 20, 10, 3, C.yel);
  [[0, 9], [25, 9], [0, 60], [25, 60]].forEach(function (q) { vg.box(g, q[0], 0, q[1], q[0] + 1, 5, q[1] + 6, C.tyre); });
  return g;
}
function truck(look) {                                       /* a painted lorry */
  var g = vg.createGrid(25, 30, 62), cab = [C.blue, C.sf, C.grn, C.red][look % 4], cargo = [C.yel, C.red, C.blue, C.sf][(look + 1) % 4];
  vg.box(g, 2, 5, 38, 22, 17, 59, cab); vg.box(g, 3, 12, 59, 21, 17, 59, C.glass); vg.box(g, 2, 17, 38, 22, 19, 55, cab); vg.box(g, 4, 6, 60, 8, 8, 61, C.lamp); vg.box(g, 16, 6, 60, 20, 8, 61, C.lamp);
  vg.box(g, 2, 5, 2, 22, 7, 38, C.blk); vg.box(g, 1, 7, 2, 23, 22, 37, cargo); vg.box(g, 1, 7, 2, 23, 9, 37, C.blk); vg.box(g, 2, 22, 3, 22, 23, 36, cargo);
  vg.box(g, 6, 14, 1, 18, 17, 1, C.white);
  [[0, 6], [23, 6], [0, 14], [23, 14], [0, 44], [23, 44]].forEach(function (q) { vg.box(g, q[0], 0, q[1], q[0] + 1, 5, q[1] + 5, C.tyre); });
  return g;
}
function cow(look) {
  var g = vg.createGrid(9, 15, 20), c = look === 1 ? C.cowD : C.cow;
  vg.box(g, 2, 6, 3, 6, 10, 14, c); vg.box(g, 3, 10, 12, 5, 12, 16, c); vg.box(g, 3, 8, 16, 5, 12, 18, c); vg.box(g, 3, 8, 18, 5, 9, 19, C.skin2);          /* body, neck, head */
  vg.box(g, 2, 11, 16, 2, 12, 17, C.horn); vg.box(g, 6, 11, 16, 6, 12, 17, C.horn); vg.box(g, 4, 10, 11, 4, 11, 12, C.cowD);                          /* horns, hump */
  vg.box(g, 2, 0, 3, 3, 6, 4, c); vg.box(g, 5, 0, 3, 6, 6, 4, c); vg.box(g, 2, 0, 12, 3, 6, 13, c); vg.box(g, 5, 0, 12, 6, 6, 13, c); vg.box(g, 4, 5, 1, 4, 9, 2, c);
  if (look === 2) vg.box(g, 2, 6, 5, 6, 9, 8, C.cowD);
  return g;
}
function dog(look) {
  var g = vg.createGrid(5, 8, 12), c = [C.dog, C.cowD, C.white][look % 3];
  vg.box(g, 1, 3, 2, 3, 5, 8, c); vg.box(g, 1, 5, 7, 3, 7, 10, c); vg.box(g, 2, 5, 10, 2, 6, 11, C.blk); vg.box(g, 1, 0, 2, 1, 3, 2, c); vg.box(g, 3, 0, 2, 3, 3, 2, c); vg.box(g, 1, 0, 7, 1, 3, 7, c); vg.box(g, 3, 0, 7, 3, 3, 7, c); vg.box(g, 2, 5, 0, 2, 7, 2, c);
  return g;
}
var KURTA = [C.white, C.blue, C.sf, C.grn, C.red, C.yel], PANT = [C.blk, C.grey, C.white, C.blue, C.blk, C.grey];
function ped(look) {                                         /* a walker: 1.7 m, kurta or saree */
  var g = vg.createGrid(7, 18, 5), top = KURTA[look % 6], skin = look % 2 ? C.skin : C.skin2;
  vg.box(g, 2, 0, 1, 2, 7, 2, PANT[look % 6]); vg.box(g, 4, 0, 1, 4, 7, 2, PANT[look % 6]);
  vg.box(g, 2, 7, 1, 4, 13, 3, top); if (look % 3 === 0) vg.box(g, 2, 3, 1, 4, 7, 3, top);      /* a saree or long kurta to the knee */
  vg.box(g, 1, 8, 1, 1, 12, 2, top); vg.box(g, 5, 8, 1, 5, 12, 2, top); vg.box(g, 1, 7, 1, 1, 8, 2, skin); vg.box(g, 5, 7, 1, 5, 8, 2, skin);
  vg.box(g, 3, 13, 1, 3, 14, 3, skin); vg.ellipsoid(g, 3, 15.5, 2, 1.6, 1.8, 1.7, skin); vg.box(g, 2, 16, 1, 4, 17, 3, C.hair);
  return g;
}

var BUILD = { auto: auto, scooter: scooter, car: car, bus: bus, truck: truck, cow: cow, dog: dog, ped: ped }, LOOKS = { auto: 2, scooter: 4, car: 2, bus: 2, truck: 4, cow: 3, dog: 3, ped: 6 };
var cache = {}, mat = null;
function geo(kind, look) {
  var key = kind + look; if (cache[key]) return cache[key];
  if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  var g = BUILD[kind](look), a = vg.meshGrid(g, { x: g.W / 2, y: 0, z: g.D / 2 }, VS, { jitter: 0.04, seed: key.length * 7 + look });
  var bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  bg.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); bg.setIndex(new THREE.BufferAttribute(a.indices, 1)); bg.computeBoundingSphere();
  return (cache[key] = bg);
}
function createMesh(e) { var m = new THREE.Mesh(geo(e.kind, (e.look !== undefined ? e.look : e.id) % LOOKS[e.kind]), (geo(e.kind, (e.look !== undefined ? e.look : e.id) % LOOKS[e.kind]), mat)); m.frustumCulled = true; return m; }
function dispose() { Object.keys(cache).forEach(function (k) { cache[k].dispose(); }); cache = {}; if (mat) { mat.dispose(); mat = null; } }

module.exports = { createMesh: createMesh, dispose: dispose, VS: VS };
