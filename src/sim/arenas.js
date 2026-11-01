/* sim: the fight arenas' layouts, one per kind of trouble spot. Arena-local metres: the fight happens in the open middle, the camera
   looks from the south (+z). So the south edge is only low things (barricades, tape, low walls, parked two-wheelers), the east and west
   edges step up from stalls to sheds, and the tall showpiece stands to the north behind the fight. Tall pieces go in groups the view fades
   if a swinging camera ever puts one in the way. Each layout also says where the men come in from. */
'use strict';

var kit = require('./arenakit');
var P = kit.P, C = kit.C;

/* the walkable rectangle and where Toofan walks in */
var BOUNDS = (function () { var a = kit.squeeze(-12.6, -8.6), b = kit.squeeze(12.6, 11.6); return { x0: a[0], z0: a[1], x1: b[0], z1: b[1] }; })();
var START = { x: 0, z: 9.5 };

/* shared edges ----------------------------------------------------------- */
function southBarrier(K, style) {                                  /* the camera side: nothing above 1.2 m */
  var x;
  if (style === 'wall') { for (x = -14; x < 14; x += 4) { K.at(x + 2, 13.6, 0); if (Math.abs(x + 2) > 2) P.lowWall(K, 3.9, 0.85); } K.at(0, 13.9, 0); P.tape(K, 3.6); }
  else if (style === 'fence') { for (x = -14; x < 14; x += 2) { K.at(x + 1, 13.6, 0); K.b(-1, 0, -0.03, 1, 1.15, 0.03, C.SAFFRON); K.b(-1, 0, -0.06, -0.94, 1.2, 0.06, C.GREYP); for (var k = 0; k < 5; k++) K.b(-1, 0.15 + k * 0.22, -0.035, 1, 0.19 + k * 0.22, 0.035, C.MARIGOLD); K.s(-1, -0.1, 1, 0.1, 1.2); } }
  else if (style === 'rail') { for (x = -14; x < 14; x += 4) { K.at(x + 2, 13.6, 0); P.railing(K, 3.9); } }
  else { for (x = -14; x < 14; x += 2.4) { K.at(x + 1.2, 13.6, 0); if ((x + 14) % 7.2 < 2.4) P.tape(K, 2.2); else P.barricade(K, 2.2); } }
  K.at(-9.5, 12.6, 0.25 * 0); P.scooter(K); K.at(-8.5, 12.7, 0); P.scooter(K); K.at(10, 12.6, 0); P.scooter(K);
}
function cornerTrees(K, nw, ne) {
  if (nw) { K.tall('treeNW'); K.at(-13.5, -8.8, 0); P.tree(K, 5.5); K.end(); }
  if (ne) { K.tall('treeNE'); K.at(13.5, -8.8, 0); P.tree(K, 5); K.end(); }
}
function backdrop(K, x0, x1, z, opts) {                           /* a row of building fronts facing the fight, as separate fadeable pieces */
  var x = x0, i = 0;
  while (x < x1 - 2) {
    var w = Math.min(x1 - x, K.range(5, 7.5)), h = K.range(6.5, 11);
    K.tall('back' + i + (opts && opts.tag || '')); K.at(x + w / 2, z, 0); P.building(K, (w - 0.2) * K.SX, h, 6, { board: opts && opts.boards ? opts.boards[i % opts.boards.length] : null, boardBg: opts && opts.bgs ? opts.bgs[i % opts.bgs.length] : null }); K.end();
    x += w; i++;
  }
}

/* the arenas ---------------------------------------------------------------- */
var A = {};

A.temple = function (K) {
  var x, k;
  P.floor(K, -12, -9, 12, 12, C.STONE, C.STONE2, 0.9); P.scatter(K, -10, -7, 10, 11, 26, ['crack', 'marigold', 'leaf', 'stain']);
  /* the temple: plinth, steps, pillared porch, the stepped shikhara with a kalash and a saffron flag */
  K.at(0, -9.2, 0); P.steps(K, 7, 4, C.STONE);
  K.tall('temple').at(0, -10.6, 0);
  K.b(-5, 0, -6, 5, 0.64, 0, C.STONE); K.b(-5.1, 0.6, -6.1, 5.1, 0.68, 0.1, C.STONE3);
  for (x = -3.6; x <= 3.7; x += 2.4) { K.b(x - 0.25, 0.68, -0.6, x + 0.25, 3.6, -0.1, C.OFFWHITE); K.b(x - 0.32, 0.68, -0.67, x + 0.32, 0.9, -0.03, C.STONE); K.b(x - 0.32, 3.4, -0.67, x + 0.32, 3.6, -0.03, C.STONE); for (k = 0; k < 4; k++) K.b(x - 0.27, 1.1 + k * 0.6, -0.62, x + 0.27, 1.18 + k * 0.6, -0.08, C.SAFFRON); }
  K.b(-4.4, 3.6, -1.2, 4.4, 4.0, 0.2, C.SAFFRON); K.b(-4.6, 4.0, -1.4, 4.6, 4.2, 0.4, C.MARIGOLD);
  K.b(-4, 0.68, -5.6, 4, 4.0, -1.2, C.OFFWHITE); K.b(-1.1, 0.68, -1.25, 1.1, 3.0, -1.18, C.WOOD2); K.b(-0.95, 0.8, -1.18, 0.95, 2.85, -1.16, C.BRASS);
  for (k = 0; k < 6; k++) { var s = 3.4 - k * 0.5, y = 4.0 + k * 1.05; K.b(-s, y, -5.4 + k * 0.35, s, y + 1.05, -1.6 - k * 0.3, k % 2 ? C.SAFFRON : C.OFFWHITE); K.b(-s - 0.1, y + 0.95, -5.5 + k * 0.35, s + 0.1, y + 1.05, -1.5 - k * 0.3, C.MARIGOLD); }
  K.b(-0.7, 10.3, -3.9, 0.7, 10.9, -2.9, C.BRASS); K.b(-0.35, 10.9, -3.6, 0.35, 11.5, -3.2, C.BRASS); K.b(-0.08, 11.5, -3.45, 0.08, 12.1, -3.35, C.BRASS);
  K.b(0.04, 11.4, -3.42, 0.08, 13.6, -3.38, C.DARK); K.b(0.08, 12.6, -3.42, 1.3, 13.5, -3.38, C.SAFFRON);
  P.garland(K, -4.3, 4.3, 3.5, 0.25, 0.5);
  for (x = -2.2; x <= 2.3; x += 1.1) { K.b(x - 0.02, 2.6, 0.18, x + 0.02, 3.5, 0.22, C.DARK); K.b(x - 0.12, 2.35, 0.08, x + 0.12, 2.6, 0.32, C.BRASS); }
  K.sign(0, 4.95, 0.45, 5.4, 0.7, 'SHRI HANUMAN MANDIR', '#c8762f', '#fff3c4');
  K.s(-5, -6, 5, 0, 12); K.end();
  /* the lamp pillar (deepastambha) with diya shelves */
  K.tall('deepa').at(7.2, -7.2, 0);
  K.b(-0.6, 0, -0.6, 0.6, 0.4, 0.6, C.STONE3); K.b(-0.3, 0.4, -0.3, 0.3, 5.6, 0.3, C.STONE2);
  for (k = 0; k < 6; k++) { var yy = 1.2 + k * 0.75, r = 0.75 - k * 0.07; K.b(-r, yy, -r, r, yy + 0.08, r, C.STONE); for (var d = 0; d < 4; d++) { var a = d * Math.PI / 2; K.b(Math.cos(a) * (r - 0.1) - 0.06, yy + 0.08, Math.sin(a) * (r - 0.1) - 0.06, Math.cos(a) * (r - 0.1) + 0.06, yy + 0.16, Math.sin(a) * (r - 0.1) + 0.06, C.MARIGOLD); } }
  K.b(-0.4, 5.6, -0.4, 0.4, 5.8, 0.4, C.BRASS); K.s(-0.6, -0.6, 0.6, 0.6, 5.8); K.end();
  /* a bell arch on the west side, and the pipal tree with a raised platform */
  K.tall('bell').at(-7.5, -7.4, 0);
  K.b(-1.2, 0, -0.15, -0.9, 3.2, 0.15, C.STONE2); K.b(0.9, 0, -0.15, 1.2, 3.2, 0.15, C.STONE2); K.b(-1.4, 3.2, -0.25, 1.4, 3.5, 0.25, C.STONE);
  K.b(-0.02, 2.4, -0.02, 0.02, 3.2, 0.02, C.DARK); K.b(-0.3, 1.95, -0.3, 0.3, 2.45, 0.3, C.BRASS); K.b(-0.36, 1.9, -0.36, 0.36, 1.98, 0.36, C.BRASS);
  K.s(-1.2, -0.2, -0.9, 0.2, 3.5); K.s(0.9, -0.2, 1.2, 0.2, 3.5); K.end();
  K.tall('pipal').at(-12.6, -6.5, 0); K.b(-1.6, 0, -1.6, 1.6, 0.5, 1.6, C.STONE3); K.b(-1.5, 0.5, -1.5, 1.5, 0.55, 1.5, C.STONE); P.tree(K, 6.5);
  for (k = 0; k < 6; k++) K.b(-0.24 + k * 0.08, 1.2 + (k % 2) * 0.15, 0.22, -0.2 + k * 0.08, 1.6, 0.25, k % 2 ? C.CRIMSON : C.MARIGOLD);   /* threads on the trunk */
  K.s(-1.6, -1.6, 1.6, 1.6, 6.5); K.end();
  /* west edge: flower and puja stalls facing the square; east edge: the chai stall, shoe racks, a bench */
  K.at(-13.4, -1.5, 1); P.stall(K, 2.6, 'flowers'); K.at(-13.4, 2.0, 1); P.stall(K, 2.6, 'flowers'); K.at(-13.4, 5.6, 1); P.stall(K, 2.4, null);
  K.at(13.4, -1.0, 3); P.stall(K, 2.6, 'tea'); K.at(13.4, 2.6, 3); P.stall(K, 2.4, 'flowers');
  K.at(12.0, 6.6, 3); P.bench(K, 1.8);
  K.at(-4.2, -8.0, 0); for (k = 0; k < 3; k++) { K.b(-0.9, k * 0.35, -0.2, 0.9, k * 0.35 + 0.04, 0.2, C.WOOD2); for (var j = 0; j < 5; j++) K.b(-0.8 + j * 0.34, k * 0.35 + 0.04, -0.12, -0.6 + j * 0.34, k * 0.35 + 0.12, 0.12, [C.BROWN, C.BLACK, C.RED, C.DARK][(j + k) % 4]); } K.s(-0.9, -0.2, 0.9, 0.2, 1.1);
  /* rangoli in front of the steps */
  K.at(0, -7.2, 0); for (k = 0; k < 4; k++) { var q = 1.4 - k * 0.32; K.b(-q, 0.025, -q * 0.6, q, 0.03 + k * 0.002, q * 0.6, [C.MAGENTA, C.MARIGOLD, C.WHITE, C.LIME][k]); }
  backdrop(K, -16, -8.2, -12.6, { tag: 'w' }); backdrop(K, 8.6, 16, -12.6, { tag: 'e' });
  southBarrier(K, 'wall');
  return { ground: C.STONE3, spawns: [[-9, -5], [9, -5], [-1.8, -8], [3, -8], [-11, 3], [11, 3], [0, -7.5]] };
};

A.market = function (K) {
  var x, k;
  P.floor(K, -12, -9, 12, 12, C.CEMENT, C.CONC2, 0.8); P.scatter(K, -10, -7, 10, 11, 34, ['crack', 'stain', 'paper', 'leaf', 'puddle', 'manhole']);
  K.at(0, 0, 0); for (x = -12; x < 12; x += 0.8) K.b(x, 0.026, -0.3, x + 0.6, 0.03, 0.3, C.GREYP);   /* the drain cover strip */
  backdrop(K, -15, 15, -9.6, { boards: ['KIRANA STORE', 'SHARMA CLOTH HOUSE', 'MOBILE REPAIR', 'MITHAI BHANDAR', 'HARDWARE'], bgs: ['#d0312d', '#2a55b8', '#18a0a8', '#f08a24', '#7a3fa0'] });
  /* wires over the street between two poles */
  K.tall('poleW').at(-12.8, -8.4, 0); P.pole(K, 7.5); K.end(); K.tall('poleE').at(12.8, -8.4, 0); P.pole(K, 7.5); K.end();
  K.at(0, -8.4, 0); P.wire(K, -12.8 * K.SX, 12.8 * K.SX, 7.0, 0); P.wire(K, -12.8 * K.SX, 12.8 * K.SX, 6.6, 0.1);
  /* stalls down both sides, facing in */
  var kinds = ['veg', 'fruit', 'flowers', 'veg'];
  for (k = 0; k < 4; k++) { K.at(-13.4, -5 + k * 3.6, 1); P.stall(K, 3.0, kinds[k]); K.at(13.4, -5 + k * 3.6, 3); P.stall(K, 3.0, kinds[(k + 2) % 4]); }
  /* the clutter the fight goes round: a cart, crates, sacks, a cylinder, a drum */
  K.at(-9.4, 6.2, 1); P.cart(K); K.at(9.6, -6.6, 3); P.cart(K, [C.YELLOW, C.LIME, C.LEAF]);
  K.at(-10.8, -7.2, 0); P.crate(K, 0.7); K.at(-10.0, -7.4, 0); P.crate(K, 0.6, C.WOOD2); K.at(-10.5, -7.3, 0); K.b(-0.3, 0.7, -0.3, 0.3, 1.3, 0.3, C.WOOD);
  K.at(10.7, 8.4, 0); P.sack(K); K.at(10.0, 8.6, 0); P.sack(K, C.WHITE); K.at(10.4, 8.4, 0); K.b(-0.3, 0.36, -0.2, 0.3, 0.64, 0.2, C.KHAKI);
  K.at(11.2, 5.3, 0); P.drum(K, C.BLUE); K.at(-11.2, 9.0, 0); P.cylinder(K);
  K.at(0, -9.1, 0); P.posters(K, 8, 1.0);
  southBarrier(K, 'barricade');
  return { ground: C.GREY, spawns: [[-8, -7], [8, -7], [0, -8], [-11, 0], [11, 0], [-4, -7.5], [4, -7.5]] };
};

A.busstand = function (K) {
  var x, k;
  K.at(0, 0, 0); K.b(-12.5, 0, -9, 12.5, 0.02, 12, C.CHAR); P.scatter(K, -10, -5, 10, 11, 30, ['stain', 'crack', 'paper', 'puddle', 'manhole']); K.at(0, 0, 0);
  for (x = -10; x <= 10; x += 4) { K.b(x - 0.06, 0.02, -6, x + 0.06, 0.03, -1, C.WHITE); }                       /* bay lines */
  K.b(-12, 0.02, -6.1, 12, 0.03, -5.95, C.YELLOW); K.b(-12, 0.0, -9, 12, 0.18, -6.6, C.CEMENT); K.b(-12, 0.18, -6.62, 12, 0.2, -6.55, C.YELLOW);   /* the platform kerb */
  for (x = -9; x <= 9; x += 6) { K.b(x - 1.4, 0.02, 3, x + 1.4, 0.03, 3.4, C.WHITE); }
  /* the shelter: steel posts, a teal roof, benches, the timetable board */
  K.tall('shelter').at(-5.5, -7.2, 0);
  for (x = -5.5; x <= 5.6; x += 2.75) { K.b(x - 0.08, 0.18, -1.9, x + 0.08, 3.2, -1.74, C.STEEL); K.b(x - 0.08, 0.18, -0.08, x + 0.08, 3.0, 0.08, C.STEEL); }
  K.b(-6, 3.0, -2.2, 6, 3.15, 0.5, C.TEAL); K.b(-6.1, 3.15, -2.3, 6.1, 3.35, 0.6, C.TEAL0); K.b(-6, 2.8, 0.45, 6, 3.0, 0.55, C.WHITE);
  K.b(-5.6, 0.18, -1.95, 5.6, 2.6, -1.85, C.STEEL); K.b(-5.4, 0.9, -1.85, -1.0, 2.5, -1.82, C.WHITE);
  for (k = 0; k < 6; k++) K.b(-5.2, 1.05 + k * 0.22, -1.82, -1.2, 1.13 + k * 0.22, -1.8, k % 2 ? C.SLATE : C.NAVY);
  K.b(1.2, 1.0, -1.85, 5.2, 2.2, -1.82, C.MAGENTA); K.b(1.4, 1.2, -1.82, 3.4, 2.0, -1.8, C.LEMON);
  K.sign(0, 3.05, 0.58, 6, 0.6, 'BUS STAND', '#18a0a8', '#ffffff');
  K.at(-8.2, -8.6, 0); P.bench(K, 2.4); K.at(-3.0, -8.6, 0); P.bench(K, 2.4); K.at(-5.5, -7.2, 0);
  K.s(-6, -2.2, 6, -1.7, 3.3); K.end();
  /* the city bus at the platform: red and cream, a window row, the route board */
  K.tall('bus').at(6.3, -10.8, 0);
  var L = 5.4;
  K.b(-L, 0.45, -1.25, L, 3.0, 1.25, C.CRIMSON); K.b(-L, 1.25, -1.26, L, 2.35, 1.26, C.SLATE); K.b(-L + 0.05, 2.35, -1.2, L - 0.05, 3.2, 1.2, C.OFFWHITE);
  for (x = -L + 0.6; x < L - 0.6; x += 1.2) K.b(x, 1.25, 1.26, x + 0.08, 2.35, 1.3, C.OFFWHITE);
  K.b(-L, 0.45, 1.25, L, 0.6, 1.3, C.CREAM); K.b(-L, 2.3, 1.26, L, 2.4, 1.3, C.CREAM);
  K.b(-L + 1.4, 0.5, 1.26, -L + 2.4, 2.3, 1.32, C.DARK); K.b(2.0, 0.5, 1.26, 3.0, 2.3, 1.32, C.DARK);
  K.b(L, 0.6, -1.1, L + 0.1, 2.9, 1.1, C.SLATE); K.b(L + 0.05, 2.45, -0.9, L + 0.12, 2.85, 0.9, C.BLACK);
  [[-L + 1.6, 1], [-L + 1.6, -1], [L - 1.8, 1], [L - 1.8, -1]].forEach(function (q) { K.b(q[0] - 0.5, 0, q[1] * 1.0 - 0.18, q[0] + 0.5, 0.95, q[1] * 1.0 + 0.18, C.CHAR); K.b(q[0] - 0.25, 0.25, q[1] * 1.2 - 0.02, q[0] + 0.25, 0.7, q[1] * 1.2 + 0.02, C.GREY); });
  K.sign(L + 0.13, 2.65, 0, 1.6, 0.36, '500-D', '#000000', '#ffd166');
  K.s(-L, -1.25, L + 0.1, 1.3, 3.2); K.end();
  /* east: the chai stall and luggage; west: the ticket booth and parked scooters */
  K.at(13.4, -2.5, 3); P.stall(K, 2.8, 'tea'); K.at(13.4, 1.2, 3); P.stall(K, 2.4, 'fruit');
  K.at(10.8, 5.6, 0); P.crate(K, 0.55, C.NAVY); K.at(11.4, 5.7, 0); P.sack(K, C.CRIMSON); K.at(11.0, 6.3, 0); K.b(-0.35, 0, -0.2, 0.35, 0.6, 0.2, C.BLUE); K.b(-0.1, 0.6, -0.04, 0.1, 0.7, 0.04, C.DARK);
  K.tall('booth').at(-13.2, 1.0, 1);
  K.b(-1.3, 0, -1.2, 1.3, 2.6, 0.8, C.W_CREAM); K.b(-1.45, 2.6, -1.35, 1.45, 2.8, 1.1, C.RED); K.b(-1.0, 1.0, 0.8, 1.0, 1.9, 0.84, C.SLATE); K.b(-1.1, 0.95, 0.8, 1.1, 1.0, 1.1, C.WOOD);
  K.sign(0, 2.25, 0.86, 2.2, 0.35, 'TICKETS', '#d0312d', '#ffffff'); K.s(-1.3, -1.2, 1.3, 0.8, 2.8); K.end();
  K.at(-12.2, 6.5, 1); P.scooter(K); K.at(-12.2, 7.5, 1); P.scooter(K);
  K.tall('lampW').at(-12.8, -4.5, 1); P.lamp(K, 5.4); K.end();
  backdrop(K, -16, 0.4, -13.4, { tag: 'b', boards: ['LODGE', 'TRAVELS'], bgs: ['#2a55b8', '#f08a24'] });
  backdrop(K, 0.6, 16, -16.2, { tag: 'c', boards: ['HOTEL', 'MEDICAL'], bgs: ['#7a3fa0', '#18a0a8'] });
  /* a news stall, dustbins, a hoarding on two legs */
  K.at(-13.4, 4.4, 1); P.stall(K, 2.2, null);
  [[-11.6, -6.8], [9.8, -7.4], [11.8, 7.4]].forEach(function (q) { K.at(q[0], q[1], 0); K.b(-0.28, 0, -0.28, 0.28, 0.85, 0.28, C.DGREEN); K.b(-0.3, 0.85, -0.3, 0.3, 0.92, 0.3, C.DARK); K.b(-0.12, 0.92, -0.05, 0.12, 0.96, 0.05, C.DARK); K.s(-0.3, -0.3, 0.3, 0.3, 0.95); });
  K.tall('hoarding').at(13.6, -8.6, 3);
  K.b(-2.2, 0, -0.1, -2.0, 6.0, 0.1, C.STEEL); K.b(2.0, 0, -0.1, 2.2, 6.0, 0.1, C.STEEL);
  K.b(-2.6, 3.4, -0.12, 2.6, 6.2, 0.0, C.OFFWHITE); for (k = 0; k < 9; k++) K.b(-2.5 + k * 0.56, 3.5, 0.0, -2.0 + k * 0.56, 6.1, 0.04, [C.MAGENTA, C.MARIGOLD, C.LEMON, C.NAVY, C.CRIMSON, C.TEAL, C.LIME, C.MARIGOLD, C.MAGENTA][k]);
  K.sign(0, 4.8, 0.06, 4.6, 1.0, 'TOOFAN COLA', '#e63946', '#ffffff');
  K.s(-2.2, -0.1, 2.2, 0.1, 6.2); K.end();
  southBarrier(K, 'rail');
  return { ground: C.CHAR, spawns: [[-9, -5], [9, -6], [0, -5.5], [-11, 4], [11, 3], [5, -6.5], [-5, -5.5]] };
};

A.construction = function (K) {
  var x, y, k;
  K.at(0, 0, 0);
  for (k = 0; k < 40; k++) { var px = K.range(-12, 12), pz = K.range(-9, 11), w = K.range(0.8, 2.6); K.b(px, 0.0, pz, px + w, 0.012 + (k % 4) * 0.004, pz + K.range(0.6, 2), k % 3 ? C.SAND : C.BROWN); }
  for (k = 0; k < 6; k++) { var tz = -4 + k * 0.32; K.b(-11, 0.031, tz, 11, 0.035, tz + 0.18, C.BROWN); }      /* tyre tracks */
  P.scatter(K, -10, -7, 10, 11, 30, ['brick', 'puddle', 'stain', 'paper', 'crack']);
  /* the half-built frame: columns, slabs, rebar sticking up, scaffolding with planks in front */
  K.tall('frame').at(-2, -10.6, 0);
  for (y = 0; y < 3; y++) { for (x = -6; x <= 6; x += 3) { K.b(x - 0.2, y * 3.2, -5.2, x + 0.2, y * 3.2 + 3.0, -4.8, C.CEMENT); K.b(x - 0.2, y * 3.2, -0.4, x + 0.2, y * 3.2 + 3.0, 0, C.CEMENT); } K.b(-6.4, y * 3.2 + 3.0, -5.4, 6.4, y * 3.2 + 3.2, 0.2, y % 2 ? C.CONC2 : C.CEMENT); }
  for (x = -6; x <= 6; x += 3) for (k = 0; k < 4; k++) K.b(x - 0.18 + k * 0.1, 9.6, -0.35, x - 0.15 + k * 0.1, 10.6, -0.32, C.RUST);
  for (x = -5.6; x <= 5.6; x += 1.4) { K.b(x, 0, 0.6, x + 0.06, 6.6, 0.66, C.WOOD2); }
  for (y = 1.6; y < 6.6; y += 1.6) { K.b(-6, y, 0.4, 6, y + 0.08, 1.0, C.WOOD); K.b(-6, y + 0.9, 0.95, 6, y + 0.96, 1.0, C.WOOD2); }
  for (x = -5.6; x < 5.6; x += 2.8) K.b(x, 0.1, 0.62, x + 2.8, 6.4, 0.64, C.WOOD2);
  K.b(-5.6, 0, -4.7, -0.6, 3.0, -4.6, C.BRICK); K.b(1.0, 0, -4.7, 5.6, 1.8, -4.6, C.BRICK);
  K.sign(0, 3.6, 1.05, 4.4, 0.6, 'SITE - NO ENTRY', '#f2c230', '#17181b');
  K.s(-6.4, -5.4, 6.4, 1.0, 10); K.end();
  /* the cement mixer, the tower crane's mast in the far corner */
  K.at(8.2, -7.6, 0); K.b(-0.8, 0, -0.5, 0.8, 0.5, 0.5, C.SAFFRON); K.b(-0.6, 0.5, -0.6, 0.6, 1.5, 0.6, C.SAFFRON); K.b(-0.5, 1.5, -0.4, 0.5, 1.8, 0.4, C.SAFFRON); K.b(-0.3, 1.8, -0.2, 0.3, 2.0, 0.2, C.DARK);
  [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]].forEach(function (q) { K.b(q[0] - 0.1, 0, q[1] - 0.12, q[0] + 0.1, 0.36, q[1] + 0.12, C.CHAR); }); K.s(-0.8, -0.6, 0.8, 0.6, 2);
  K.tall('crane').at(12.6, -11.6, 0);
  for (y = 0; y < 16; y += 1) { K.b(-0.5, y, -0.5, -0.4, y + 1, -0.4, C.YELLOW); K.b(0.4, y, -0.5, 0.5, y + 1, -0.4, C.YELLOW); K.b(-0.5, y, 0.4, -0.4, y + 1, 0.5, C.YELLOW); K.b(0.4, y, 0.4, 0.5, y + 1, 0.5, C.YELLOW); K.b(-0.5, y + 0.45, -0.5, 0.5, y + 0.55, 0.5, C.YELLOW); }
  K.b(-9, 16, -0.3, 3.5, 16.6, 0.3, C.YELLOW); K.b(2.5, 15.2, -0.6, 4, 16, 0.6, C.CONC2); K.b(-0.6, 16.6, -0.6, 0.6, 17.4, 0.6, C.SAFFRON);
  K.b(-7.02, 9, -0.02, -6.98, 16, 0.02, C.DARK); K.b(-7.3, 8.6, -0.3, -6.7, 9.0, 0.3, C.SAFFRON);
  K.s(-0.5, -0.5, 0.5, 0.5, 17); K.end();
  /* west: brick stacks, cement bags, a sand heap, rebar; east: the site office cabin, a water drum, a wheelbarrow */
  for (k = 0; k < 3; k++) { K.at(-12.4, -5 + k * 2.2, 1); for (y = 0; y < 5; y++) for (x = 0; x < 4; x++) K.b(-0.9 + x * 0.45 + (y % 2) * 0.1, y * 0.18, -0.55, -0.5 + x * 0.45 + (y % 2) * 0.1, y * 0.18 + 0.16, 0.55, (x + y + k) % 4 ? C.BRICK : C.BRICK2); K.s(-0.9, -0.55, 0.9, 0.55, 0.9); }
  K.at(-12.0, 3.4, 1); for (y = 0; y < 4; y++) for (x = 0; x < 3 - (y > 1 ? 1 : 0); x++) K.b(-0.8 + x * 0.55 + y * 0.12, y * 0.2, -0.4, -0.3 + x * 0.55 + y * 0.12, y * 0.2 + 0.19, 0.4, C.OFFWHITE); K.s(-0.8, -0.4, 0.9, 0.4, 0.8);
  K.at(-10.6, 7.6, 0); for (k = 0; k < 4; k++) K.b(-1.6 + k * 0.3, k * 0.25, -1.2 + k * 0.25, 1.6 - k * 0.3, k * 0.25 + 0.25, 1.2 - k * 0.25, C.SAND); K.s(-1.6, -1.2, 1.6, 1.2, 1);
  K.at(-6.5, 7.4, 0); for (k = 0; k < 8; k++) K.b(-1.8, 0.05 + (k % 3) * 0.05, -0.3 + k * 0.07, 1.8, 0.09 + (k % 3) * 0.05, -0.27 + k * 0.07, C.RUST);
  K.tall('cabin').at(13.2, -1.5, 3);
  K.b(-2.6, 0, -1.2, 2.6, 2.6, 1.0, C.BLUE); for (x = -2.5; x < 2.6; x += 0.25) K.b(x, 0.05, 1.0, x + 0.08, 2.55, 1.04, C.NAVY);
  K.b(-2.7, 2.6, -1.3, 2.7, 2.75, 1.15, C.GREYP); K.b(-1.9, 0, 1.0, -1.0, 2.0, 1.06, C.WHITE); K.b(0.3, 1.1, 1.0, 1.8, 1.9, 1.06, C.SLATE);
  K.sign(0.6, 2.25, 1.07, 2.4, 0.3, 'SITE OFFICE', '#ffffff', '#1d3557'); K.s(-2.6, -1.2, 2.6, 1.05, 2.8); K.end();
  K.at(11.6, 3.4, 0); P.drum(K, C.BLUE); K.at(12.2, 4.2, 0); P.drum(K, C.CRIMSON);
  K.at(10.4, 7.6, 3); K.b(-0.3, 0.3, -0.4, 0.3, 0.65, 0.4, C.GREYP); K.b(-0.05, 0, 0.35, 0.05, 0.3, 0.55, C.CHAR); K.b(-0.35, 0.4, -1.0, -0.3, 0.45, -0.4, C.WOOD2); K.b(0.3, 0.4, -1.0, 0.35, 0.45, -0.4, C.WOOD2); K.s(-0.35, -1, 0.35, 0.6, 0.7);
  K.at(-4, 0, 0); P.tyres(K, 2); K.at(5.5, 6.5, 0); K.b(-1.4, 0, -0.15, 1.4, 0.3, 0.15, C.WOOD); K.b(-1.4, 0.3, -0.12, 1.4, 0.36, 0.12, C.WOOD2);
  backdrop(K, -16, 10.5, -17.4, { tag: 'k', boards: ['CEMENT DEPOT', 'STEEL TRADERS'], bgs: ['#5e5850', '#1d3557'] });
  K.at(-1, -9.6, 0); P.posters(K, 6, 0.6); K.b(-3.2, 0, -0.1, 3.2, 2.2, -0.02, C.SAFFRON);
  southBarrier(K, 'fence');
  return { ground: C.DIRT, spawns: [[-9, -6], [9, -5], [-3, -8], [4, -8], [-11, 1], [11, 4], [0, -7]] };
};

A.petrol = function (K) {
  var x, k;
  P.floor(K, -12, -9, 12, 12, C.CONC2, C.STONE2, 1.0); P.scatter(K, -10, -7, 10, 11, 26, ['stain', 'stain', 'crack', 'paper', 'puddle']);
  K.at(0, 0, 0); for (x = -11; x <= 11; x += 2.2) K.b(x, 0.026, 5.0, x + 1.2, 0.03, 5.2, C.WHITE);
  /* the canopy over two pump islands, north of the fight */
  K.tall('canopy').at(0, -10.6, 0);
  [[-6.5, -0.6], [6.5, -0.6], [-6.5, -4.2], [6.5, -4.2]].forEach(function (q) { K.b(q[0] - 0.3, 0, q[1] - 0.3, q[0] + 0.3, 5.0, q[1] + 0.3, C.OFFWHITE); K.s(q[0] - 0.3, q[1] - 0.3, q[0] + 0.3, q[1] + 0.3, 5); });
  K.b(-8, 5.0, -5.2, 8, 5.5, 0.6, C.OFFWHITE); K.b(-8.05, 5.5, -5.25, 8.05, 6.1, 0.65, C.NAVY); K.b(-8.06, 5.62, 0.6, 8.06, 5.98, 0.68, C.MARIGOLD);
  K.sign(0, 5.8, 0.7, 6, 0.42, 'DESI FUEL', '#1d3557', '#ffd166');
  [-3.4, 3.4].forEach(function (u) {
    K.b(u - 1.6, 0, -3.0, u + 1.6, 0.2, -1.6, C.CEMENT); K.b(u - 1.62, 0.2, -3.02, u + 1.62, 0.25, -1.58, C.YELLOW);
    K.b(u - 0.45, 0.25, -2.6, u + 0.45, 1.9, -2.0, C.OFFWHITE); K.b(u - 0.4, 1.9, -2.55, u + 0.4, 2.1, -2.05, C.NAVY); K.b(u - 0.35, 1.2, -2.0, u + 0.35, 1.7, -1.97, C.SLATE);
    K.b(u - 0.3, 1.3, -1.97, u + 0.3, 1.45, -1.95, C.LIME); K.b(u + 0.45, 0.9, -2.4, u + 0.6, 1.3, -2.2, C.DARK); K.b(u + 0.55, 0.4, -2.35, u + 0.6, 0.95, -2.3, C.DARK);
    K.s(u - 1.6, -3.0, u + 1.6, -1.6, 2);
  });
  K.end();
  /* the kiosk, the price board on its pole */
  K.tall('kiosk').at(-12.0, -6.0, 1);
  K.b(-2.2, 0, -1.4, 2.2, 3.0, 1.0, C.OFFWHITE); K.b(-2.3, 3.0, -1.5, 2.3, 3.4, 1.2, C.NAVY); K.b(-1.6, 0.9, 1.0, 1.6, 2.4, 1.04, C.SLATE); K.b(1.7, 0, 1.0, 2.1, 2.2, 1.06, C.WOOD2);
  K.sign(0, 3.2, 1.22, 3.6, 0.32, 'AIR - WATER - OIL', '#1d3557', '#ffffff'); K.s(-2.2, -1.4, 2.2, 1.0, 3.4); K.end();
  K.tall('price').at(12.4, -8.2, 3);
  K.b(-0.12, 0, -0.12, 0.12, 6.4, 0.12, C.STEEL); K.b(-1.1, 4.4, -0.15, 1.1, 6.8, 0.15, C.NAVY);
  K.sign(0, 6.25, 0.16, 2.0, 0.5, 'DESI FUEL', '#1d3557', '#ffd166'); K.sign(0, 5.5, 0.16, 2.0, 0.5, 'PETROL 104', '#000000', '#8cc63f'); K.sign(0, 4.85, 0.16, 2.0, 0.5, 'DIESEL 91', '#000000', '#f2c230');
  K.s(-0.15, -0.15, 0.15, 0.15, 6.8); K.end();
  /* west: the air pump, oil drums, tyres; east: a parked water tanker */
  K.at(-11.6, 0.6, 1); K.b(-0.25, 0, -0.2, 0.25, 1.3, 0.2, C.CRIMSON); K.b(-0.2, 1.3, -0.15, 0.2, 1.5, 0.15, C.OFFWHITE); K.b(-0.04, 0.6, 0.2, 0.04, 0.64, 0.8, C.BLACK); K.s(-0.25, -0.2, 0.25, 0.2, 1.5);
  K.at(-12.0, 3.4, 0); P.drum(K, C.CRIMSON); K.at(-11.3, 3.6, 0); P.drum(K, C.NAVY); K.at(-11.7, 4.4, 0); P.drum(K, C.YELLOW); K.at(-11.2, 6.6, 0); P.tyres(K, 4); K.at(-12.0, 7.4, 0); P.tyres(K, 2);
  K.tall('tanker').at(13.4, 2.0, 3);
  K.b(-1.1, 0.5, -3.2, 1.1, 0.75, 3.2, C.DARK); K.b(-1.1, 0.75, 1.6, 1.1, 2.7, 3.2, C.BLUE); K.b(-1.05, 1.7, 3.2, 1.05, 2.5, 3.24, C.SLATE); K.b(-1.12, 0.9, 3.2, 1.12, 1.4, 3.3, C.GREYP);
  for (k = 0; k < 3; k++) K.b(-1.05 + k * 0.05, 0.85 + k * 0.08, -3.1, 1.05 - k * 0.05, 2.35 - k * 0.08, 1.4, C.OFFWHITE);
  K.b(-0.2, 2.35, -1.2, 0.2, 2.5, -0.8, C.STEEL); for (x = -2.6; x < 1.2; x += 1.2) K.b(-1.12, 1.4, x, 1.12, 1.48, x + 0.08, C.STEEL);
  [[-1.05, 2.4], [1.05, 2.4], [-1.05, -1.6], [1.05, -1.6], [-1.05, -2.6], [1.05, -2.6]].forEach(function (q) { K.b(q[0] - 0.2, 0, q[1] - 0.45, q[0] + 0.2, 0.9, q[1] + 0.45, C.CHAR); });
  K.sign(0, 1.6, -3.12, 1.8, 0.4, 'DRINKING WATER', '#2a55b8', '#ffffff');
  K.s(-1.2, -3.2, 1.2, 3.3, 2.7); K.end();
  K.at(12.0, 8.0, 3); P.cylinder(K);
  /* the fire bucket stand, a water cooler, scooters waiting at the pumps, the town behind */
  K.at(-6.0, -8.3, 0); K.b(-0.9, 0, -0.1, 0.9, 1.6, 0.0, C.CRIMSON); K.b(-0.95, 1.6, -0.15, 0.95, 1.7, 0.05, C.CRIMSON);
  for (k = 0; k < 4; k++) { K.b(-0.8 + k * 0.42, 0.7, 0.0, -0.5 + k * 0.42, 1.0, 0.25, C.CRIMSON); K.b(-0.78 + k * 0.42, 0.96, 0.02, -0.52 + k * 0.42, 1.0, 0.23, C.SAND); }
  K.b(-0.7, 0.1, 0, -0.4, 0.6, 0.25, C.CRIMSON); K.sign(0, 1.35, 0.01, 1.6, 0.3, 'FIRE', '#e63946', '#ffffff'); K.s(-0.9, -0.1, 0.9, 0.3, 1.7);
  K.at(5.8, -8.4, 0); K.b(-0.35, 0, -0.3, 0.35, 1.3, 0.3, C.STEEL); K.b(-0.3, 1.3, -0.25, 0.3, 1.36, 0.25, C.OFFWHITE); K.b(-0.1, 0.8, 0.3, 0.1, 0.9, 0.36, C.STEEL); K.s(-0.35, -0.3, 0.35, 0.3, 1.3);
  K.at(-2.0, -9.4, 1); P.scooter(K); K.at(2.4, -9.4, 3); P.scooter(K);
  K.at(0, -10.0, 0); K.sign(0, 1.8, 0, 2.2, 0.36, 'NO SMOKING', '#e63946', '#ffffff');
  backdrop(K, -16, 16, -15.2, { tag: 'p', boards: ['TYRE WORKS', 'DHABA', 'AUTO PARTS'], bgs: ['#17181b', '#f08a24', '#2a55b8'] });
  cornerTrees(K, true, false);
  /* a low planter kerb with shrubs on the south side, then barricades */
  K.at(0, 12.2, 0); for (x = -11; x < 11; x += 2.2) { K.b(x, 0, -0.3, x + 2.0, 0.4, 0.3, C.CEMENT); K.b(x + 0.1, 0.4, -0.25, x + 1.9, 0.7, 0.25, (x | 0) % 2 ? C.LEAF : C.DGREEN); }
  southBarrier(K, 'barricade');
  return { ground: C.CONC2, spawns: [[-8, -6], [8, -6], [0, -7], [-10, 2], [10, -1], [-4, -7], [4, -7]] };
};

module.exports = { A: A, BOUNDS: BOUNDS, START: START, southBarrier: southBarrier, backdrop: backdrop, cornerTrees: cornerTrees };
