/* view: dense voxel grids, shape primitives and a mesher with ambient occlusion and per-voxel colour jitter.
   Pure maths on typed arrays (no THREE objects), so it runs in Node tests. Voxel (x,y,z) occupies [x,x+1) etc. */
'use strict';

var FILL = 0x1000000;

function hex(s) { return parseInt(s.slice(1), 16); }
function mix(a, b, t) {
  var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

function createGrid(W, H, D) { return { W: W, H: H, D: D, d: new Uint32Array(W * H * D) }; }
function ix(g, x, y, z) { return x + g.W * (y + g.H * z); }
function inb(g, x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < g.W && y < g.H && z < g.D; }
function set(g, x, y, z, c) { if (inb(g, x, y, z)) g.d[ix(g, x, y, z)] = (c & 0xffffff) | FILL; }
function del(g, x, y, z) { if (inb(g, x, y, z)) g.d[ix(g, x, y, z)] = 0; }
function get(g, x, y, z) { return inb(g, x, y, z) && g.d[ix(g, x, y, z)] !== 0 ? (g.d[ix(g, x, y, z)] & 0xffffff) : -1; }
function solid(g, x, y, z) { return inb(g, x, y, z) && g.d[ix(g, x, y, z)] !== 0; }
function count(g) { var n = 0, i; for (i = 0; i < g.d.length; i++) if (g.d[i]) n++; return n; }

function paint(g, x, y, z, col) {
  var c = typeof col === 'function' ? col(x, y, z) : col;
  if (c == null || c < 0) return;
  set(g, x, y, z, c);
}

function ellipsoid(g, cx, cy, cz, rx, ry, rz, col) {
  var x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(g.W - 1, Math.ceil(cx + rx));
  var y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(g.H - 1, Math.ceil(cy + ry));
  var z0 = Math.max(0, Math.floor(cz - rz)), z1 = Math.min(g.D - 1, Math.ceil(cz + rz));
  for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
    if (dx * dx + dy * dy + dz * dz <= 1) paint(g, x, y, z, col);
  }
}

function box(g, x0, y0, z0, x1, y1, z1, col) {
  for (var z = z0; z <= z1; z++) for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) paint(g, x, y, z, col);
}

/* piecewise-linear lookup. table rows are [y, a, b, ...]; returns [a, b, ...] */
function interp(table, y) {
  var n = table.length, i, t, r = [];
  if (y <= table[0][0]) return table[0].slice(1);
  if (y >= table[n - 1][0]) return table[n - 1].slice(1);
  for (i = 0; i < n - 1; i++) if (y >= table[i][0] && y <= table[i + 1][0]) break;
  t = (y - table[i][0]) / (table[i + 1][0] - table[i][0]);
  for (var k = 1; k < table[i].length; k++) r.push(table[i][k] + (table[i + 1][k] - table[i][k]) * t);
  return r;
}

/* vertical tapered elliptic limb. table rows: [y, rx, rz, dx, dz] (dx, dz shift the slice centre) */
function limb(g, table, cx, cz, y0, y1, col, grow) {
  grow = grow || 0;
  for (var y = y0; y <= y1; y++) {
    var v = interp(table, y + 0.5);
    var rx = v[0] + grow, rz = v[1] + grow, ox = cx + (v[2] || 0), oz = cz + (v[3] || 0);
    if (rx <= 0.2 || rz <= 0.2) continue;
    var xa = Math.max(0, Math.floor(ox - rx)), xb = Math.min(g.W - 1, Math.ceil(ox + rx));
    var za = Math.max(0, Math.floor(oz - rz)), zb = Math.min(g.D - 1, Math.ceil(oz + rz));
    for (var z = za; z <= zb; z++) for (var x = xa; x <= xb; x++) {
      var dx = (x + 0.5 - ox) / rx, dz = (z + 0.5 - oz) / rz;
      if (dx * dx + dz * dz <= 1) paint(g, x, y, z, col);
    }
  }
}

/* highest z index that is solid at (x, y); -1 if none. Used to hang face details on the surface. */
function frontZ(g, x, y) { for (var z = g.D - 1; z >= 0; z--) if (solid(g, x, y, z)) return z; return -1; }
function backZ(g, x, y) { for (var z = 0; z < g.D; z++) if (solid(g, x, y, z)) return z; return -1; }

function h3(x, y, z, s) {
  var h = Math.imul(x + 101, 73856093) ^ Math.imul(y + 211, 19349663) ^ Math.imul(z + 307, 83492791) ^ Math.imul(s + 1, 2654435761);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

var FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] }
];
var CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
var AO = [0.52, 0.7, 0.86, 1.0];

/* g: grid; pivot: grid-space point that becomes the mesh origin; vs: metres per voxel */
function meshGrid(g, pivot, vs, opts) {
  opts = opts || {};
  var jit = opts.jitter == null ? 0.05 : opts.jitter, seed = opts.seed || 0;
  var x, y, z, f, k, faces = 0, voxels = 0;
  for (z = 0; z < g.D; z++) for (y = 0; y < g.H; y++) for (x = 0; x < g.W; x++) {
    if (!g.d[ix(g, x, y, z)]) continue;
    voxels++;
    for (f = 0; f < 6; f++) if (!solid(g, x + FACES[f].n[0], y + FACES[f].n[1], z + FACES[f].n[2])) faces++;
  }
  var pos = new Float32Array(faces * 12), nor = new Float32Array(faces * 12), col = new Float32Array(faces * 12), idx = new Uint32Array(faces * 6);
  var vi = 0, ii = 0, vc = 0, fi, ao = [0, 0, 0, 0];
  for (z = 0; z < g.D; z++) for (y = 0; y < g.H; y++) for (x = 0; x < g.W; x++) {
    var cv = g.d[ix(g, x, y, z)]; if (!cv) continue;
    var r = ((cv >> 16) & 255) / 255, gg = ((cv >> 8) & 255) / 255, b = (cv & 255) / 255;
    var j = 1 + (h3(x, y, z, seed) - 0.5) * 2 * jit;
    for (f = 0; f < 6; f++) {
      var F = FACES[f], n = F.n, u = F.u, v = F.v;
      if (solid(g, x + n[0], y + n[1], z + n[2])) continue;
      var px = x + n[0], py = y + n[1], pz = z + n[2];
      for (k = 0; k < 4; k++) {
        var su = CORNERS[k][0], sv = CORNERS[k][1];
        var s1 = solid(g, px + su * u[0], py + su * u[1], pz + su * u[2]) ? 1 : 0;
        var s2 = solid(g, px + sv * v[0], py + sv * v[1], pz + sv * v[2]) ? 1 : 0;
        var c3 = solid(g, px + su * u[0] + sv * v[0], py + su * u[1] + sv * v[1], pz + su * u[2] + sv * v[2]) ? 1 : 0;
        ao[k] = (s1 && s2) ? 0 : 3 - (s1 + s2 + c3);
        pos[vi] = (x + 0.5 + 0.5 * n[0] + 0.5 * su * u[0] + 0.5 * sv * v[0] - pivot.x) * vs;
        pos[vi + 1] = (y + 0.5 + 0.5 * n[1] + 0.5 * su * u[1] + 0.5 * sv * v[1] - pivot.y) * vs;
        pos[vi + 2] = (z + 0.5 + 0.5 * n[2] + 0.5 * su * u[2] + 0.5 * sv * v[2] - pivot.z) * vs;
        nor[vi] = n[0]; nor[vi + 1] = n[1]; nor[vi + 2] = n[2];
        var br = AO[ao[k]] * j;
        col[vi] = Math.min(1, r * br); col[vi + 1] = Math.min(1, gg * br); col[vi + 2] = Math.min(1, b * br);
        vi += 3;
      }
      fi = vc; vc += 4;
      if (ao[0] + ao[2] < ao[1] + ao[3]) { idx[ii++] = fi + 1; idx[ii++] = fi + 2; idx[ii++] = fi + 3; idx[ii++] = fi + 1; idx[ii++] = fi + 3; idx[ii++] = fi; }
      else { idx[ii++] = fi; idx[ii++] = fi + 1; idx[ii++] = fi + 2; idx[ii++] = fi; idx[ii++] = fi + 2; idx[ii++] = fi + 3; }
    }
  }
  return { positions: pos, normals: nor, colors: col, indices: idx, voxels: voxels, faces: faces, triangles: faces * 2, bytes: pos.byteLength * 3 + idx.byteLength };
}

module.exports = {
  hex: hex, mix: mix, createGrid: createGrid, set: set, del: del, get: get, solid: solid, count: count, inb: inb,
  ellipsoid: ellipsoid, box: box, limb: limb, interp: interp, frontZ: frontZ, backZ: backZ, meshGrid: meshGrid, h3: h3
};
