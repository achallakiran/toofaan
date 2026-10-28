/* view: turns a list of boxes into flat typed arrays (positions, normals, colours, indices).
   Pure maths, no THREE objects, so it can be tested in Node. One chunk becomes one mesh. */
'use strict';

function hexToRgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

var FACES = [
  { n: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },     /* top */
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },     /* +z */
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },    /* -z */
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },     /* +x */
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] }     /* -x */
];

function boxesToArrays(boxes, palette) {
  var count = boxes.length * FACES.length;
  var pos = new Float32Array(count * 12), nor = new Float32Array(count * 12), col = new Float32Array(count * 12);
  var idx = new Uint32Array(count * 6), vi = 0, ii = 0, b, f, k, base, rgb;
  var rgbCache = {};
  for (b = 0; b < boxes.length; b++) {
    var bx = boxes[b];
    rgb = rgbCache[bx.c] || (rgbCache[bx.c] = hexToRgb(palette[bx.c % palette.length]));
    var sx = bx.x1 - bx.x0, sy = bx.y1 - bx.y0, sz = bx.z1 - bx.z0;
    for (f = 0; f < FACES.length; f++) {
      base = vi / 3;
      for (k = 0; k < 4; k++) {
        var v = FACES[f].v[k];
        pos[vi] = bx.x0 + v[0] * sx; pos[vi + 1] = bx.y0 + v[1] * sy; pos[vi + 2] = bx.z0 + v[2] * sz;
        nor[vi] = FACES[f].n[0]; nor[vi + 1] = FACES[f].n[1]; nor[vi + 2] = FACES[f].n[2];
        col[vi] = rgb[0]; col[vi + 1] = rgb[1]; col[vi + 2] = rgb[2];
        vi += 3;
      }
      idx[ii++] = base; idx[ii++] = base + 1; idx[ii++] = base + 2;
      idx[ii++] = base; idx[ii++] = base + 2; idx[ii++] = base + 3;
    }
  }
  return { positions: pos, normals: nor, colors: col, indices: idx, triangles: ii / 3, bytes: pos.byteLength * 3 + idx.byteLength };
}

module.exports = { boxesToArrays: boxesToArrays, hexToRgb: hexToRgb };
