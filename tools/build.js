#!/usr/bin/env node
/* Bundles every file under src/ into one classic script (tiny CommonJS runtime) and inlines
   three.js into a single HTML file. No network, no ES modules: it runs from file://. */
'use strict';
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..'), src = path.join(root, 'src');

function walk(dir, out) {
  fs.readdirSync(dir).sort().forEach(function (n) {
    var p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.js$/.test(n)) out.push(p);
  });
  return out;
}

var files = walk(src, []);
var defs = files.map(function (f) {
  var id = path.relative(src, f).replace(/\\/g, '/').replace(/\.js$/, '');
  var code = fs.readFileSync(f, 'utf8');
  return "defs[" + JSON.stringify(id) + "]=function(module,exports,require){\n" + code + "\n};";
}).join('\n');

var runtime =
"(function(){'use strict';var defs={},cache={};\n" + defs + "\n" +
"function norm(p){var out=[];p.split('/').forEach(function(s){if(s===''||s==='.')return;if(s==='..')out.pop();else out.push(s);});return out.join('/');}\n" +
"function load(id){if(cache[id])return cache[id].exports;var fn=defs[id];if(!fn)throw new Error('module not found: '+id);" +
"var m={exports:{}};cache[id]=m;var dir=id.indexOf('/')>=0?id.slice(0,id.lastIndexOf('/')):'';" +
"fn(m,m.exports,function(spec){return load(norm((spec.charAt(0)==='.'?dir+'/':'')+spec).replace(/\\.js$/,''));});return m.exports;}\n" +
"load('main');})();";

var three = fs.readFileSync(path.join(root, 'vendor/three.min.js'), 'utf8');
var tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
function esc(s) { return s.replace(/<\/script/gi, '<\\/script'); }
var html = tpl.replace('{{THREE}}', function () { return esc(three); }).replace('{{BUNDLE}}', function () { return esc(runtime); });

var out = path.join(root, 'dist'); fs.mkdirSync(out, { recursive: true });
var target = path.join(out, 'toofan-brawler.html');
fs.writeFileSync(target, html);
fs.writeFileSync(path.join(root, 'index.html'), html);   /* same game at the repo root, so GitHub Pages serves it as the home page */
/* Artifact flavour: the host supplies the document skeleton, so strip ours (same game, same inlined library). */
var art = html.replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
  .replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '').replace(/<\/html>\s*/i, '')
  .replace(':root{--bg:#0d1218;', ':root{color-scheme:dark;--bg:#0d1218;');
fs.writeFileSync(path.join(out, 'toofan-brawler.artifact.html'), art);
console.log('built ' + path.relative(root, target) + ' ' + (html.length / 1024).toFixed(0) + ' KB, ' + files.length + ' modules');
