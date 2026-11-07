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
  P.asphalt(K, -12.6, -9.2, 12.6, 12.2, C.GREY, C.CONC2, 26); P.scatter(K, -10, -7, 10, 11, 44, ['crack', 'stain', 'paper', 'leaf', 'leaf', 'puddle', 'manhole']);
  /* the lane: coloured tarps strung across it from stall to stall, a jumble of baskets, sacks and crates along both sides */
  for (k = 0; k < 4; k++) {
    K.tall('tarp' + k).at(0, -5 + k * 3.6, 0);
    var tc = [C.BLUE, C.CRIMSON, C.MARIGOLD, C.LEAF][k];
    for (x = -12.5; x < 12.5; x += 1.25) { var sag = 3.9 - Math.cos(x / 12.5 * Math.PI / 2) * 0.7; K.b(x, sag, -0.9, x + 1.27, sag + 0.08, 0.9, (Math.round(x / 1.25) % 2) ? tc : C.OFFWHITE); }
    K.end();
  }
  for (k = 0; k < 8; k++) { var bx = k < 4 ? -10.6 : 10.6, bz = -5.6 + (k % 4) * 3.6 + 1.4; K.at(bx, bz, 0);
    K.b(-0.3, 0, -0.3, 0.3, 0.35, 0.3, C.WOOD2); K.b(-0.26, 0.35, -0.26, 0.26, 0.45, 0.26, K.pick([C.CRIMSON, C.LIME, C.MARIGOLD, C.LEMON, C.LEAF])); K.s(-0.3, -0.3, 0.3, 0.3, 0.45); }
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
  P.slabs(K, -12, -9, 12, 12, [C.CONC2, C.CONC2, C.CEMENT, C.STONE2], 3.0); P.scatter(K, -10, -7, 10, 11, 34, ['stain', 'stain', 'stain', 'crack', 'paper', 'puddle']);
  K.at(0, 0, 0); for (x = -11; x <= 11; x += 2.2) K.b(x, 0.026, 5.0, x + 1.2, 0.03, 5.2, C.WHITE);
  /* painted forecourt: lane arrows, ENTRY / EXIT */
  [[-8.5, 1], [8.5, -1]].forEach(function (q) { K.at(q[0], 2.0, 0); K.b(-0.12, 0.026, -1.4, 0.12, 0.031, 1.0, C.WHITE); K.b(-0.5, 0.026, q[1] > 0 ? -1.4 : 0.6, 0.5, 0.031, q[1] > 0 ? -1.0 : 1.0, C.WHITE); });
  K.at(-8.5, 4.2, 0); K.sign(0, 0.04, 0, 2.2, 0.5, 'ENTRY', '#ffffff', '#17181b'); K.at(8.5, 4.2, 0); K.sign(0, 0.04, 0, 2.2, 0.5, 'EXIT', '#ffffff', '#17181b');
  /* the pump islands in the forecourt, under their own canopy: the fight goes round the pumps */
  [-5.0, 5.0].forEach(function (u, ii) {
    K.at(u, -3.2, 0); K.b(-1.9, 0, -0.75, 1.9, 0.2, 0.75, C.CEMENT); K.b(-1.92, 0.2, -0.77, 1.92, 0.24, 0.77, C.YELLOW); K.b(-1.95, 0, -0.8, -1.7, 0.6, 0.8, C.YELLOW); K.b(1.7, 0, -0.8, 1.95, 0.6, 0.8, C.YELLOW);
    K.s(-1.9, -0.75, 1.9, 0.75, 0.6);
    K.at(u - 0.85, -3.2, 0); P.pump(K, ii ? C.CRIMSON : C.NAVY); K.at(u + 0.85, -3.2, 0); P.pump(K, ii ? C.CRIMSON : C.NAVY);
  });
  K.tall('canopyF').at(0, -3.2, 0);
  [-6.9, -3.1, 3.1, 6.9].forEach(function (u) { K.b(u - 0.18, 0.24, -0.18, u + 0.18, 5.2, 0.18, C.OFFWHITE); });
  K.b(-8.4, 5.2, -2.6, 8.4, 5.6, 2.2, C.OFFWHITE); K.b(-8.45, 5.6, -2.65, 8.45, 6.2, 2.25, C.NAVY); K.b(-8.46, 5.7, 2.25, 8.46, 6.1, 2.32, C.MARIGOLD);
  K.sign(0, 5.9, 2.34, 6, 0.42, 'DESI FUEL', '#1d3557', '#ffd166'); K.end();
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

A.warehouse = function (K) {
  var x, y, k;
  P.slabs(K, -12, -9, 12, 12, [C.CEMENT, C.CEMENT, C.GREYP, C.CONC2], 4.0);
  K.at(0, 0, 0); K.b(-11, 0.026, 6.6, 11, 0.032, 6.8, C.YELLOW); K.b(-11, 0.026, -5.6, 11, 0.032, -5.4, C.YELLOW);
  for (x = -10; x < 10; x += 2.5) K.b(x, 0.026, -5.4, x + 0.15, 0.032, 6.6, C.YELLOW);
  P.scatter(K, -10, -7, 10, 11, 28, ['stain', 'stain', 'crack', 'paper', 'puddle']);
  /* the warehouse: corrugated walls, three roller shutters, a loading dock, the company board */
  K.tall('godown').at(-2.5, -10.8, 0);
  K.b(-10, 0, -8, 10, 7.5, 0, C.STEEL); for (x = -10; x < 10; x += 0.3) K.b(x, 0, 0, x + 0.12, 7.4, 0.06, C.BLUEGREY);
  K.b(-10.3, 7.5, -8.3, 10.3, 7.9, 0.4, C.NAVY); K.b(-10.3, 7.9, -8.3, 10.3, 8.6, -4, C.GREYP);
  for (k = 0; k < 3; k++) { var u = -6.4 + k * 6.4; K.b(u - 2.2, 1.2, 0.06, u + 2.2, 5.4, 0.14, C.DARK); for (y = 0; y < 14; y++) K.b(u - 2.1, 3.0 + y * 0.17, 0.14, u + 2.1, 3.12 + y * 0.17, 0.18, C.GREY); K.b(u - 2.3, 5.4, 0.06, u + 2.3, 5.6, 0.3, C.YELLOW); }
  K.b(-10, 0, 0, 10, 1.2, 2.2, C.CEMENT); K.b(-10, 1.2, 2.0, 10, 1.25, 2.2, C.YELLOW); for (x = -9; x < 10; x += 3) K.b(x, 0.3, 2.2, x + 0.6, 1.0, 2.35, C.CHAR);
  K.sign(0, 6.6, 0.2, 9, 0.9, 'SHAKTI LOGISTICS GODOWN', '#1d3557', '#ffd166');
  K.s(-10, -8, 10, 2.2, 8.6); K.end();
  /* a truck backed up to the dock */
  K.tall('truck').at(9.2, -6.2, 2);
  K.b(-1.2, 0.5, -3.6, 1.2, 0.75, 3.4, C.DARK); K.b(-1.2, 0.75, -3.6, 1.2, 3.2, 1.6, C.MARIGOLD); for (k = 0; k < 6; k++) K.b(-1.21, 0.9 + k * 0.38, -3.5, 1.21, 1.0 + k * 0.38, 1.5, C.SAFFRON);
  K.b(-1.2, 0.75, 1.7, 1.2, 2.6, 3.4, C.CRIMSON); K.b(-1.1, 1.7, 3.4, 1.1, 2.4, 3.45, C.SLATE); K.b(-1.2, 2.6, 1.7, 1.2, 2.9, 3.0, C.MARIGOLD);
  K.sign(0, 1.6, -3.62, 2.2, 0.6, 'HORN OK PLEASE', '#ff9f1c', '#17181b');
  [[-1.1, 2.5], [1.1, 2.5], [-1.1, -1.4], [1.1, -1.4], [-1.1, -2.6], [1.1, -2.6]].forEach(function (q) { K.b(q[0] - 0.22, 0, q[1] - 0.5, q[0] + 0.22, 1.0, q[1] + 0.5, C.CHAR); });
  K.s(-1.25, -3.6, 1.25, 3.45, 3.2); K.end();
  /* west: pallets of sacks, a forklift; east: the shipping container, drums */
  for (k = 0; k < 3; k++) { K.at(-12.6, -4 + k * 3.0, 1); K.b(-0.9, 0, -0.6, 0.9, 0.14, 0.6, C.WOOD); for (y = 0; y < 3 + k % 2; y++) for (x = 0; x < 3; x++) K.b(-0.85 + x * 0.58, 0.14 + y * 0.3, -0.55, -0.32 + x * 0.58, 0.42 + y * 0.3, 0.55, (x + y) % 3 ? C.KHAKI : C.OFFWHITE); K.s(-0.9, -0.6, 0.9, 0.6, 1.3); }
  K.at(-9.6, 6.0, 1); K.b(-0.6, 0.3, -0.9, 0.6, 1.2, 0.6, C.YELLOW); K.b(-0.5, 1.2, -0.5, 0.5, 2.2, 0.4, C.DARK); K.b(-0.55, 2.2, -0.6, 0.55, 2.3, 0.5, C.YELLOW);
  K.b(-0.45, 0, 0.6, -0.35, 2.4, 0.7, C.DARK); K.b(0.35, 0, 0.6, 0.45, 2.4, 0.7, C.DARK); K.b(-0.5, 0.15, 0.7, 0.5, 0.2, 1.6, C.GREY);
  [[-0.65, -0.6], [0.65, -0.6], [-0.65, 0.4], [0.65, 0.4]].forEach(function (q) { K.b(q[0] - 0.12, 0, q[1] - 0.25, q[0] + 0.12, 0.5, q[1] + 0.25, C.CHAR); }); K.s(-0.65, -0.9, 0.65, 1.6, 2.3);
  K.tall('container').at(13.4, 0.5, 3);
  K.b(-3, 0, -1.2, 3, 2.6, 1.2, C.SAFFRON); for (x = -2.9; x < 3; x += 0.22) K.b(x, 0.05, 1.2, x + 0.09, 2.55, 1.25, C.MARIGOLD);
  K.b(-3.02, 2.5, -1.22, 3.02, 2.62, 1.26, C.RUST); K.sign(0, 1.9, 1.27, 3, 0.4, 'DESI CARGO', '#bc6c25', '#ffffff'); K.s(-3, -1.2, 3, 1.25, 2.6); K.end();
  /* containers stacked two high in the west of the yard */
  K.tall('stackW').at(-12.4, 7.2, 1);
  K.b(-2.6, 0, -1.15, 2.6, 2.5, 1.15, C.BLUE); for (x = -2.5; x < 2.6; x += 0.22) K.b(x, 0.05, 1.15, x + 0.09, 2.45, 1.2, C.NAVY);
  K.b(-2.6, 2.5, -1.15, 2.6, 5.0, 1.15, C.LEAF); for (x = -2.5; x < 2.6; x += 0.22) K.b(x, 2.55, 1.15, x + 0.09, 4.95, 1.2, C.DGREEN);
  K.sign(0, 1.5, 1.21, 2.6, 0.36, 'SHAKTI', '#1d3557', '#ffffff'); K.s(-2.6, -1.15, 2.6, 1.2, 5.0); K.end();
  K.at(11.6, 6.4, 0); P.drum(K, C.CRIMSON); K.at(12.3, 7.0, 0); P.drum(K, C.CRIMSON); K.at(11.4, 7.3, 0); P.drum(K, C.NAVY); K.at(-11.6, 9.2, 0); P.tyres(K, 3);
  backdrop(K, 10.5, 16, -14.6, { tag: 'w' });
  cornerTrees(K, true, false);
  southBarrier(K, 'wall');
  return { ground: C.CONC2, spawns: [[-8, -5], [7, -4], [0, -6.5], [-11, 1.5], [10, 4], [-4, -6.5], [4, -6.5]] };
};

A.slum = function (K) {
  var x, y, k, i;
  K.at(0, 0, 0);
  for (k = 0; k < 50; k++) { var px = K.range(-12, 12), pz = K.range(-9, 11); K.b(px, 0, pz, px + K.range(0.6, 2.2), 0.012 + (k % 3) * 0.004, pz + K.range(0.5, 1.8), k % 3 ? C.BROWN : C.STONE3); }
  for (x = -11; x < 11; x += 0.9) K.b(x, 0.0, 1.6, x + 0.85, 0.05, 2.0, C.STONE2);                   /* the open drain's stone edge */
  P.scatter(K, -10, -7, 10, 11, 34, ['puddle', 'puddle', 'paper', 'leaf', 'stain', 'brick']);
  /* the north row: stacked tin-roof homes, blue tarps, a ladder, a dish, a water tank */
  var u = -16, n = 0;
  while (u < 15) {
    var w = K.range(3.2, 4.6), h = K.range(2.6, 3.2), two = n % 2 === 0, c = K.pick([C.BLUE, C.RUST, C.OFFWHITE, C.TEAL, C.W_SAF, C.W_ROSE, C.STONE2]);
    K.tall('home' + n).at(u + w / 2, -10.2, 0);
    K.b(-w / 2, 0, -3.4, w / 2, h, 0, c); K.b(-w / 2 - 0.2, h, -3.6, w / 2 + 0.2, h + 0.12, 0.35, K.pick([C.GREYP, C.RUST, C.STEEL]));
    for (x = -w / 2 - 0.2; x < w / 2 + 0.2; x += 0.3) K.b(x, h + 0.12, -3.6, x + 0.1, h + 0.17, 0.35, C.GREY);
    K.b(-w / 2 + 0.4, 0, 0, -w / 2 + 1.2, 2.0, 0.05, K.pick([C.WOOD2, C.NAVY, C.CRIMSON])); K.b(w / 2 - 1.3, 1.0, 0, w / 2 - 0.5, 1.8, 0.05, C.SLATE);
    K.b(w / 2 - 1.4, 1.75, 0, w / 2 - 0.4, 1.85, 0.25, C.STONE2);
    if (two) { K.b(-w / 2 + 0.3, h + 0.17, -3.2, w / 2 - 0.4, h + 2.5, -0.4, K.pick([C.W_LIME, C.W_BLUE, C.W_CREAM, C.PEACH])); K.b(-w / 2 + 0.1, h + 2.5, -3.4, w / 2 - 0.2, h + 2.6, -0.1, C.BLUE); K.b(-w / 2 + 0.6, h + 0.9, -0.4, -w / 2 + 1.3, h + 1.8, -0.35, C.SLATE);
      for (y = 0; y < 8; y++) K.b(w / 2 - 0.2, y * 0.33, 0.1, w / 2 - 0.15, y * 0.33 + 0.05, 0.6, C.WOOD); K.b(w / 2 - 0.25, 0, 0.1, w / 2 - 0.2, h + 0.2, 0.15, C.WOOD); K.b(w / 2 - 0.25, 0, 0.55, w / 2 - 0.2, h + 0.2, 0.6, C.WOOD); }
    if (n % 3 === 1) { K.b(-0.3, h + 0.17, -2.2, 0.3, h + 0.9, -1.6, C.CHAR); K.b(0.4, h + 0.2, -1.4, 0.45, h + 0.8, -1.35, C.DARK); K.b(0.2, h + 0.7, -1.5, 0.8, h + 1.3, -1.45, C.OFFWHITE); }
    K.b(-w / 2 - 0.2, h - 0.8, 0.0, w / 2 + 0.2, h - 0.75, 0.9, C.BLUE);                               /* the tarp awning */
    K.s(-w / 2, -3.6, w / 2, 0.35, two ? h + 2.6 : h + 0.2); K.end();
    u += w + 0.15; n++;
  }
  /* washing lines across the lane, the hand pump, a charpai cot, water drums, a goat-free chicken coop */
  K.at(0, -8.6, 0); for (i = 0; i < 2; i++) { var v = -0.2 + i * 0.25; K.b(-12, 2.3 - i * 0.1, v, 12, 2.33 - i * 0.1, v + 0.02, C.DARK); for (x = -11; x < 11; x += 0.7) if ((x * 10 | 0) % 3) K.b(x, 1.75 - i * 0.1, v - 0.01, x + 0.45, 2.3 - i * 0.1, v + 0.03, K.pick([C.CRIMSON, C.LEMON, C.NAVY, C.MAGENTA, C.WHITE, C.LEAF, C.MARIGOLD])); }
  K.at(-11.6, 3.6, 1); K.b(-0.5, 0, -0.5, 0.5, 0.25, 0.5, C.CEMENT); K.b(-0.08, 0.25, -0.08, 0.08, 1.1, 0.08, C.DGREEN); K.b(-0.12, 1.0, -0.1, 0.12, 1.25, 0.15, C.DGREEN); K.b(-0.03, 0.85, 0.15, 0.03, 0.95, 0.4, C.DGREEN); K.b(0.08, 1.15, -0.04, 0.6, 1.2, 0.04, C.DGREEN); K.s(-0.5, -0.5, 0.5, 0.5, 1.2);
  K.at(-11.8, 7.0, 1); K.b(-1.0, 0.42, -0.5, 1.0, 0.5, 0.5, C.WOOD); for (k = 0; k < 9; k++) K.b(-0.95 + k * 0.22, 0.5, -0.45, -0.85 + k * 0.22, 0.52, 0.45, C.SAND); [[-0.95, -0.45], [0.9, -0.45], [-0.95, 0.4], [0.9, 0.4]].forEach(function (q) { K.b(q[0], 0, q[1], q[0] + 0.06, 0.5, q[1] + 0.06, C.WOOD2); }); K.s(-1, -0.5, 1, 0.5, 0.55);
  K.at(11.8, -4.0, 0); P.drum(K, C.BLUE); K.at(12.4, -3.3, 0); P.drum(K, C.BLUE); K.at(11.6, -2.6, 0); P.drum(K, C.CRIMSON);
  K.at(12.2, 2.4, 3); for (k = 0; k < 4; k++) K.b(-0.8, k * 0.3, -0.5, 0.8, k * 0.3 + 0.04, 0.5, C.WOOD2); K.b(-0.8, 0, -0.5, -0.74, 1.2, 0.5, C.WOOD2); K.b(0.74, 0, -0.5, 0.8, 1.2, 0.5, C.WOOD2); K.b(-0.8, 1.2, -0.55, 0.8, 1.26, 0.55, C.RUST); K.s(-0.8, -0.5, 0.8, 0.5, 1.26);
  K.at(12.0, 7.4, 3); P.cart(K, [C.LEMON, C.LIME, C.CRIMSON]);
  K.tall('shack').at(14.2, -7.0, 3); K.b(-2, 0, -1.4, 2, 2.6, 1.0, C.RUST); K.b(-2.2, 2.6, -1.6, 2.2, 2.7, 1.5, C.STEEL); K.b(-0.5, 0, 1.0, 0.4, 2.0, 1.04, C.NAVY); K.b(0.9, 1.2, 1.0, 1.7, 1.8, 1.04, C.SLATE); K.s(-2, -1.4, 2, 1.0, 2.7); K.end();
  K.tall('shackW').at(-14.2, -6.4, 1); K.b(-1.8, 0, -1.4, 1.8, 2.5, 1.0, C.W_TURQ); K.b(-2.0, 2.5, -1.6, 2.0, 2.6, 1.5, C.RUST); K.b(-0.4, 0, 1.0, 0.4, 2.0, 1.04, C.CRIMSON); K.s(-1.8, -1.4, 1.8, 1.0, 2.6); K.end();
  K.tall('poleS').at(-12.6, -8.6, 0); P.pole(K, 7); K.end();
  /* a black water tank up on a steel stand, and tin lean-tos pressing in on both sides */
  K.tall('tank').at(12.2, -6.8, 0);
  [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(function (q) { K.b(q[0] - 0.06, 0, q[1] - 0.06, q[0] + 0.06, 3.0, q[1] + 0.06, C.STEEL); });
  K.b(-0.85, 3.0, -0.85, 0.85, 3.1, 0.85, C.STEEL); K.b(-0.75, 3.1, -0.75, 0.75, 4.5, 0.75, C.BLACK); K.b(-0.5, 4.5, -0.5, 0.5, 4.65, 0.5, C.BLACK); K.s(-0.85, -0.85, 0.85, 0.85, 4.65); K.end();
  [[-12.8, 0.2, 1], [12.8, 4.6, 3]].forEach(function (q, i5) {
    K.tall('lean' + i5).at(q[0], q[1], q[2]);
    K.b(-1.6, 0, -0.9, 1.6, 2.2, 0.0, i5 ? C.TEAL : C.W_ROSE); K.b(-1.8, 2.2, -1.0, 1.8, 2.28, 1.2, C.RUST); for (x = -1.8; x < 1.8; x += 0.3) K.b(x, 2.28, -1.0, x + 0.1, 2.32, 1.2, C.GREY);
    K.b(-1.62, 0, 1.0, -1.52, 2.2, 1.1, C.WOOD); K.b(1.52, 0, 1.0, 1.62, 2.2, 1.1, C.WOOD); K.b(-0.5, 0, 0.0, 0.4, 1.9, 0.04, C.NAVY);
    K.s(-1.6, -0.9, 1.6, 0.0, 2.3); K.end();
  });
  southBarrier(K, 'wall');
  return { ground: C.BROWN, spawns: [[-7, -6.5], [7, -6.5], [0, -7], [-10.5, 0], [10.5, 0], [-4, -6.5], [4, -6.5]] };
};

A.railway = function (K) {
  var x, k;
  K.at(0, 0, 0);
  for (k = 0; k < 60; k++) { var px = K.range(-12, 12), pz = K.range(-9, 11); K.b(px, 0, pz, px + K.range(0.4, 1.2), 0.03, pz + K.range(0.3, 0.9), k % 2 ? C.STONE3 : C.STONE2); }
  /* the level crossing: two tracks across the yard (sleepers, rails, ballast), the road over them in the middle */
  [-3.4, -8.6].forEach(function (tz) {
    K.b(-13, 0, tz - 1.7, 13, 0.1, tz + 1.7, C.DARK); for (x = -13; x < 13; x += 0.5) K.b(x, 0.1, tz - 1.6, x + 0.3, 0.12, tz + 1.6, C.STONE3);   /* dark ballast */
    for (x = -13; x < 13; x += 0.65) K.b(x, 0.12, tz - 1.3, x + 0.32, 0.22, tz + 1.3, C.BROWN);
    K.b(-13, 0.22, tz - 0.8, 13, 0.36, tz - 0.66, C.STEEL); K.b(-13, 0.36, tz - 0.79, 13, 0.39, tz - 0.67, C.OFFWHITE);
    K.b(-13, 0.22, tz + 0.66, 13, 0.36, tz + 0.8, C.STEEL); K.b(-13, 0.36, tz + 0.67, 13, 0.39, tz + 0.79, C.OFFWHITE);
  });
  K.b(-2.6, 0.0, -10.4, 2.6, 0.4, -1.6, C.CHAR); K.b(-0.1, 0.4, -10.2, 0.1, 0.41, -1.8, C.YELLOW);                          /* the road across */
  K.at(4.2, 1.0, 0); K.b(-1.2, 0.02, -0.06, 1.2, 0.03, 0.06, C.WHITE); K.sign(0, 0.04, 0.3, 2.6, 0.5, 'LOOK OUT FOR TRAINS', '#ffd166', '#17181b');
  /* boom gates at the crossing, the cabin, the signal post */
  [[-3.6, -0.6], [3.6, -11.6]].forEach(function (q, i2) {
    K.at(q[0], q[1], 0); K.b(-0.25, 0, -0.25, 0.25, 1.2, 0.25, C.STONE); K.b(-0.15, 1.2, -0.15, 0.15, 1.4, 0.15, C.DARK);
    for (k = 0; k < 10; k++) K.b(i2 ? -0.5 - k * 0.6 : 0.5 + k * 0.6 - 0.6, 1.25, -0.05, i2 ? -k * 0.6 : 0.5 + k * 0.6, 1.35, 0.05, k % 2 ? C.CRIMSON : C.WHITE);
    K.s(-0.25, -0.25, 0.25, 0.25, 1.4);
  });
  K.tall('cabin').at(-8.6, -12.8, 0);
  K.b(-2, 0, -2, 2, 0.6, 1.4, C.BRICK); K.b(-1.8, 0.6, -1.8, 1.8, 3.4, 1.2, C.W_CREAM); K.b(-2.1, 3.4, -2.1, 2.1, 3.6, 1.5, C.BRICK2); K.b(-1.8, 3.6, -1.8, 1.8, 4.1, 1.2, C.BRICK);
  K.b(-1.5, 1.6, 1.2, 1.5, 2.8, 1.24, C.SLATE); for (k = 0; k < 4; k++) K.b(-1.5 + k * 1.0, 1.6, 1.24, -1.44 + k * 1.0, 2.8, 1.27, C.DARK);
  K.b(-1.2, 0.6, 1.2, -0.4, 2.4, 1.24, C.WOOD2); K.sign(0.4, 3.15, 1.26, 3, 0.4, 'GATE No. 14', '#efe3c8', '#9b4a2a');
  K.s(-2, -2, 2, 1.4, 4.1); K.end();
  K.tall('signal').at(9.6, -6.0, 0);
  K.b(-0.1, 0, -0.1, 0.1, 6.2, 0.1, C.STEEL); K.b(-0.35, 5.0, -0.1, 0.35, 6.4, 0.2, C.DARK);
  K.b(-0.15, 5.9, 0.2, 0.15, 6.2, 0.24, C.CRIMSON); K.b(-0.15, 5.5, 0.2, 0.15, 5.8, 0.24, C.LEMON); K.b(-0.15, 5.1, 0.2, 0.15, 5.4, 0.24, C.LEAF);
  K.s(-0.1, -0.1, 0.1, 0.1, 6.4); K.end();
  /* a goods wagon waiting on the far track */
  K.tall('wagon').at(-1.0, -11.8, 0);
  K.b(-5.2, 0.6, -1.4, 5.2, 0.85, 1.4, C.DARK); K.b(-5, 0.85, -1.35, 5, 3.4, 1.35, C.BRICK2);
  for (x = -4.9; x < 5; x += 0.7) K.b(x, 0.9, 1.35, x + 0.1, 3.35, 1.4, C.BRICK);
  K.b(-1.2, 1.0, 1.36, 1.2, 3.0, 1.42, C.RUST); K.sign(-3.2, 2.6, 1.42, 2.2, 0.36, 'NR BCN 21508', '#8b3a1e', '#ffffff');
  [-3.6, -2.4, 2.4, 3.6].forEach(function (u) { K.b(u - 0.45, 0.2, -1.0, u + 0.45, 0.7, -0.8, C.CHAR); K.b(u - 0.45, 0.2, 0.8, u + 0.45, 0.7, 1.0, C.CHAR); });
  K.s(-5.2, -1.4, 5.2, 1.4, 3.4); K.end();
  /* east: chai stall and a waiting scooter queue; west: a handcart, a level-crossing warning board */
  K.at(13.4, 2.6, 3); P.stall(K, 2.6, 'tea'); K.at(12.0, 6.6, 3); P.bench(K, 1.8);
  K.at(-11.0, 4.2, 0); P.cart(K, [C.LEMON, C.CRIMSON, C.LIME]); K.at(-6.0, 7.0, 0); P.scooter(K); K.at(-4.8, 7.4, 0); P.scooter(K);
  K.at(-12.0, -0.4, 1); K.b(-0.06, 0, -0.06, 0.06, 2.2, 0.06, C.STEEL); K.b(-0.5, 1.6, 0.06, 0.5, 2.3, 0.1, C.OFFWHITE); K.sign(0, 1.95, 0.11, 0.95, 0.6, 'STOP!', '#ffffff', '#e63946'); K.s(-0.1, -0.1, 0.1, 0.1, 2.3);
  backdrop(K, -16, 16, -17.6, { tag: 'r', boards: ['STATION ROAD', 'LUCKY TAILORS'], bgs: ['#2d6a4f', '#c2306f'] });
  K.tall('poleR').at(12.6, -8.4, 0); P.pole(K, 7); K.end();
  southBarrier(K, 'barricade');
  return { ground: C.STONE3, spawns: [[-8, -6.2], [8, -2], [0, -6.5], [-10.5, 2], [10.5, 0], [-4.5, -6.5], [4.5, -6.5]] };
};

A.toll = function (K) {
  var x, k;
  K.at(0, 0, 0); K.b(-12.5, 0, -9, 12.5, 0.02, 12, C.CHAR); P.scatter(K, -10, -7, 10, 11, 24, ['stain', 'crack', 'paper', 'stain']); K.at(0, 0, 0);
  for (x = -9; x <= 9; x += 4.5) for (k = -5; k < 11; k += 2) K.b(x - 0.08, 0.02, k, x + 0.08, 0.03, k + 1, C.WHITE);
  K.b(-12, 0.02, -6.4, 12, 0.03, -6.2, C.YELLOW);
  /* booths in a row under the canopy, boom barriers, lane lights */
  K.tall('canopy').at(0, -9.8, 0);
  K.b(-12, 5.2, -2.6, 12, 5.6, 1.4, C.OFFWHITE); K.b(-12.05, 5.6, -2.65, 12.05, 6.4, 1.45, C.LEMON); K.b(-12.06, 5.75, 1.45, 12.06, 6.25, 1.5, C.NAVY);
  K.sign(0, 6.0, 1.52, 8, 0.45, 'TOLL PLAZA  -  KEEP LANE', '#1d3557', '#ffd166');
  for (x = -11.25; x <= 11.3; x += 4.5) {
    K.b(x - 0.7, 0, -1.6, x + 0.7, 0.25, 0.8, C.YELLOW); K.b(x - 0.72, 0.0, -1.62, x + 0.72, 0.25, -1.4, C.BLACK);
    K.b(x - 0.55, 0.25, -1.2, x + 0.55, 2.6, 0.4, C.OFFWHITE); K.b(x - 0.5, 1.2, 0.4, x + 0.5, 2.3, 0.44, C.SLATE); K.b(x - 0.6, 2.6, -1.3, x + 0.6, 2.8, 0.5, C.NAVY);
    K.b(x - 0.08, 2.8, -0.5, x + 0.08, 5.2, -0.3, C.STEEL); K.b(x - 0.2, 4.3, 0.4, x + 0.2, 4.7, 0.46, (x | 0) % 2 ? C.LEAF : C.CRIMSON);
    K.s(x - 0.7, -1.6, x + 0.7, 0.8, 2.8);
  }
  K.end();
  for (x = -9; x <= 9.1; x += 4.5) { K.at(x, -8.8, 0); K.b(-0.2, 0, -0.2, 0.2, 1.0, 0.2, C.YELLOW); K.b(-0.15, 1.0, -0.15, 0.15, 1.2, 0.15, C.DARK); for (k = 0; k < 6; k++) K.b(0.2 + k * 0.6, 1.05, -0.05, 0.8 + k * 0.6, 1.15, 0.05, k % 2 ? C.CRIMSON : C.WHITE); K.s(-0.2, -0.2, 0.2, 0.2, 1.2); }
  /* a stopped truck and a car in the lanes behind the barriers */
  K.tall('truckT').at(-6.8, -13.6, 0);
  K.b(-1.2, 0.5, -3.4, 1.2, 0.75, 3.4, C.DARK); K.b(-1.2, 0.75, -3.4, 1.2, 3.0, 1.6, C.LEAF); K.b(-1.21, 2.6, -3.4, 1.21, 3.1, 1.6, C.DGREEN);
  K.b(-1.2, 0.75, 1.7, 1.2, 2.7, 3.4, C.MARIGOLD); K.b(-1.1, 1.8, 3.4, 1.1, 2.5, 3.45, C.SLATE); K.b(-1.2, 2.7, 1.7, 1.2, 3.0, 3.1, C.CRIMSON);
  [[-1.1, 2.5], [1.1, 2.5], [-1.1, -1.6], [1.1, -1.6], [-1.1, -2.7], [1.1, -2.7]].forEach(function (q) { K.b(q[0] - 0.22, 0, q[1] - 0.5, q[0] + 0.22, 1.0, q[1] + 0.5, C.CHAR); });
  K.s(-1.25, -3.4, 1.25, 3.45, 3.1); K.end();
  K.tall('carT').at(2.3, -12.2, 0);
  K.b(-0.9, 0.3, -2.0, 0.9, 0.9, 2.0, C.OFFWHITE); K.b(-0.82, 0.9, -1.1, 0.82, 1.45, 0.9, C.SLATE); K.b(-0.85, 1.4, -1.0, 0.85, 1.5, 0.8, C.OFFWHITE);
  K.b(-0.92, 0.45, 2.0, 0.92, 0.6, 2.06, C.GREY); K.b(-0.7, 0.62, 2.0, -0.4, 0.75, 2.05, C.LEMON); K.b(0.4, 0.62, 2.0, 0.7, 0.75, 2.05, C.LEMON);
  [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]].forEach(function (q) { K.b(q[0] - 0.12, 0, q[1] - 0.32, q[0] + 0.12, 0.62, q[1] + 0.32, C.CHAR); });
  K.s(-0.95, -2, 0.95, 2.06, 1.5); K.end();
  /* the toll office on the west, cones and a lane divider on the east */
  K.tall('office').at(-13.4, 0.0, 1);
  K.b(-2.6, 0, -1.6, 2.6, 3.0, 1.0, C.OFFWHITE); K.b(-2.7, 3.0, -1.7, 2.7, 3.3, 1.2, C.NAVY); K.b(-1.8, 1.0, 1.0, 0.6, 2.2, 1.04, C.SLATE); K.b(1.0, 0, 1.0, 1.9, 2.1, 1.04, C.WOOD2);
  K.sign(0, 2.6, 1.05, 3.8, 0.35, 'TOLL OFFICE', '#1d3557', '#ffffff'); K.s(-2.6, -1.6, 2.6, 1.0, 3.3); K.end();
  for (k = 0; k < 6; k++) { K.at(12.4, -6 + k * 2.6, 3); K.b(-0.2, 0, -0.2, 0.2, 0.08, 0.2, C.SAFFRON); K.b(-0.13, 0.08, -0.13, 0.13, 0.45, 0.13, C.SAFFRON); K.b(-0.1, 0.3, -0.1, 0.1, 0.4, 0.1, C.WHITE); K.b(-0.06, 0.45, -0.06, 0.06, 0.65, 0.06, C.SAFFRON); }
  K.at(13.6, 2.0, 3); for (k = -6; k < 6; k += 1) K.b(k, 0, -0.3, k + 0.95, 0.75, 0.3, k % 2 ? C.YELLOW : C.BLACK); K.s(-6, -0.3, 6, 0.3, 0.75);
  K.at(-11.6, 7.0, 0); P.scooter(K); K.at(-10.6, 7.2, 0); P.scooter(K);
  backdrop(K, -16, 16, -19.0, { tag: 't' });
  southBarrier(K, 'barricade');
  return { ground: C.CHAR, spawns: [[-7, -6], [7, -6], [0, -6.5], [-10, 3], [10, 3], [-3.5, -6.5], [3.5, -6.5]] };
};

A.flyover = function (K) {
  var x, k;
  P.asphalt(K, -12.6, -9.2, 12.6, 12.2, C.CHAR, C.DARK, 22); P.scatter(K, -10, -7, 10, 11, 30, ['stain', 'puddle', 'paper', 'crack', 'leaf']);
  K.at(0, 0, 0); for (x = -12; x < 12; x += 2.4) K.b(x, 0.026, 3.9, x + 1.2, 0.032, 4.1, C.WHITE);                          /* the lane line */
  K.b(-12.6, 0.021, -9.2, 12.6, 0.024, 1.2, C.BLACK);                                                                        /* the deck's shadow over the north half */
  /* the underpass: two great piers in the fight, the deck on them high above, crash barrier and drip line along its edge */
  [-8.6, 8.6].forEach(function (u, i4) {                              /* (at the sides, so they never stand between the camera and the fight) */
    K.tall('pierIn' + i4).at(u, -1.0, 0);
    K.b(-0.85, 0, -0.85, 0.85, 7.6, 0.85, C.CEMENT); K.b(-0.95, 0, -0.95, 0.95, 0.5, 0.95, C.STONE3); K.b(-1.8, 7.0, -1.1, 1.8, 7.6, 1.1, C.CEMENT);
    for (k = 0; k < 3; k++) K.b(-0.7 + k * 0.48, 1.0 + (k % 2) * 0.2, 0.85, -0.3 + k * 0.48, 1.9 + (k % 2) * 0.2, 0.89, K.pick([C.MAGENTA, C.LEMON, C.MARIGOLD, C.TEAL, C.CRIMSON]));
    K.b(-0.86, 2.2, 0.85, 0.86, 2.6, 0.88, C.YELLOW); K.b(-0.86, 2.6, 0.85, 0.86, 3.0, 0.88, C.BLACK);
    K.s(-0.95, -0.95, 0.95, 0.95, 7.6); K.end();
  });
  /* the deck itself runs high over the north, on the piers: from the fight you see its edge and the shadow it throws */
  K.tall('deckIn').at(0, -1.0, 0);
  K.b(-17, 7.6, -9.4, 17, 8.6, 1.4, C.CEMENT); K.b(-17, 8.6, 1.0, 17, 9.3, 1.4, C.STONE); K.b(-17, 7.4, 1.2, 17, 7.6, 1.4, C.STONE3);
  for (x = -17; x < 17; x += 1.5) K.b(x, 7.3, 1.25, x + 1.4, 7.4, 1.4, C.DARK);
  K.end();
  /* the flyover overhead: a deck on two rows of piers, crash barriers, drain pipes; posters and paint on the piers */
  K.tall('deck').at(0, -11.6, 0);
  K.b(-17, 6.2, -4.6, 17, 7.4, 1.6, C.CEMENT); K.b(-17, 7.4, 1.2, 17, 8.2, 1.6, C.STONE); K.b(-17, 7.4, -4.6, 17, 8.2, -4.2, C.STONE);
  for (x = -17; x < 17; x += 1.5) K.b(x, 6.0, 1.3, x + 1.4, 6.2, 1.6, C.STONE3);
  K.b(-17, 5.7, -1.6, 17, 6.2, -1.0, C.STONE3); K.b(-17, 5.7, 0.4, 17, 6.2, 1.0, C.STONE3);
  K.end();
  [-10.5, -3.5, 3.5, 10.5].forEach(function (px, i3) {
    K.tall('pier' + i3).at(px, -11.0, 0);
    K.b(-0.8, 0, -0.8, 0.8, 5.7, 0.8, C.CEMENT); K.b(-1.6, 5.2, -1.0, 1.6, 5.7, 1.0, C.CEMENT); K.b(-0.9, 0, -0.9, 0.9, 0.5, 0.9, C.STONE3);
    for (k = 0; k < 3; k++) K.b(-0.7 + k * 0.48, 1.0 + (k % 2) * 0.2, 0.8, -0.3 + k * 0.48, 1.9 + (k % 2) * 0.2, 0.84, K.pick([C.MAGENTA, C.LEMON, C.MARIGOLD, C.TEAL, C.CRIMSON]));
    K.b(0.82, 0, 0.0, 0.92, 5.6, 0.1, C.CHAR);
    K.s(-0.9, -0.9, 0.9, 0.9, 5.7); K.end();
  });
  K.at(-7.0, -10.2, 0); K.sign(0, 3.2, 0, 2.6, 0.5, 'NO PARKING', '#e63946', '#ffffff');
  K.at(0, -10.2, 0); K.sign(0, 2.7, 0, 3.2, 0.9, 'TOOFAN ZINDABAD', '#17181b', '#ffd166');
  /* parked autos under the deck, a tea stall by a pier, a cobbler's box, a dog-free heap of tyres */
  K.at(-6.8, -9.0, 3); P.auto(K, 0); K.at(6.8, -9.0, 1); P.auto(K, 1);
  K.at(13.4, 0.0, 3); P.stall(K, 2.6, 'tea'); K.at(12.0, 4.0, 3); P.bench(K, 1.8);
  K.at(-12.4, 1.0, 1); K.b(-0.5, 0, -0.4, 0.5, 0.5, 0.4, C.WOOD2); K.b(-0.55, 0.5, -0.45, 0.55, 0.56, 0.45, C.WOOD); K.b(-0.3, 0.56, -0.2, 0.0, 0.68, 0.0, C.BROWN); K.b(0.1, 0.56, -0.1, 0.3, 0.62, 0.15, C.BLACK); K.b(-0.9, 0, -1.4, 0.9, 1.8, -1.3, C.BLUE); K.s(-0.55, -0.45, 0.55, 0.45, 0.6);
  K.at(-11.6, 6.4, 0); P.tyres(K, 4); K.at(-10.8, 7.0, 0); P.tyres(K, 2); K.at(11.2, 8.4, 0); P.drum(K, C.BLUE);
  K.at(-12.6, -3.4, 1); P.cart(K, [C.YELLOW, C.LIME, C.SAFFRON]);
  backdrop(K, -16, 16, -17.4, { tag: 'f', boards: ['GARAGE', 'SWEETS', 'CYBER CAFE'], bgs: ['#5e5850', '#f08a24', '#18a0a8'] });
  southBarrier(K, 'barricade');
  return { ground: C.STONE3, spawns: [[-8, -6], [8, -6], [0, -6.5], [-10.5, 2.5], [10.5, -1], [-3.5, -7], [3.5, -7]] };
};

module.exports = { A: A, BOUNDS: BOUNDS, START: START, southBarrier: southBarrier, backdrop: backdrop, cornerTrees: cornerTrees };
