#!/usr/bin/env node
/* Fails if a lower layer imports a higher one, or if pure layers touch the browser. */
'use strict';
var fs = require('fs'), path = require('path');
var src = path.join(__dirname, '..', 'src');
var RANK = { core: 0, data: 1, sim: 2, view: 3, modes: 4, main: 5 };
var PURE = { core: 1, data: 1, sim: 1 };
var BANNED = /\b(document|window|THREE|localStorage|requestAnimationFrame|navigator|performance|Date\.now|Math\.random)\b/;

function walk(d, out) {
  fs.readdirSync(d).forEach(function (n) { var p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.js$/.test(n)) out.push(p); });
  return out;
}
function layerOf(file) { var rel = path.relative(src, file).replace(/\\/g, '/'); return rel.indexOf('/') < 0 ? 'main' : rel.split('/')[0]; }
function strip(code) { return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/'(?:\\.|[^'\\])*'/g, "''"); }

var bad = [];
walk(src, []).forEach(function (f) {
  var layer = layerOf(f), code = fs.readFileSync(f, 'utf8'), clean = strip(code), m;
  var re = /require\('([^']+)'\)/g;
  while ((m = re.exec(code))) {
    var target = path.resolve(path.dirname(f), m[1]), tl = layerOf(target + '.js');
    if (RANK[tl] > RANK[layer]) bad.push(path.relative(src, f) + ' imports higher layer ' + tl + ' (' + m[1] + ')');
  }
  if (PURE[layer] && BANNED.test(clean)) bad.push(path.relative(src, f) + ' uses a browser or non-deterministic global: ' + clean.match(BANNED)[0]);
});
if (bad.length) { console.error('BOUNDARY VIOLATIONS\n' + bad.join('\n')); process.exit(1); }
console.log('boundaries ok');
