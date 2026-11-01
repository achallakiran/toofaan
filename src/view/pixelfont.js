/* view: ToofanPx, the game's "code terminal" pixel font (square voxel pixels, built by tools/font/makefont.py and embedded, so it works
   offline). Installed once as a web font; every piece of interface text uses FAMILY. The comic hit words keep their comic lettering. */
'use strict';

var DATA = require('../data/pixelfont');
var FAMILY = "'ToofanPx',ui-monospace,Menlo,monospace";
var done = false;
function install() {
  if (done || typeof document === 'undefined') return; done = true;
  var st = document.createElement('style');
  st.textContent = "@font-face{font-family:'ToofanPx';src:url(data:font/ttf;base64," + DATA.TTF + ") format('truetype');font-display:block}" +
    ":root{--px-font:" + FAMILY + "}body.px,body.px *{font-family:" + FAMILY + "!important;font-synthesis:none}" +
    "body.px .comic,body.px .comic *{font-family:'Arial Black',Impact,system-ui,sans-serif!important;font-synthesis:weight}";
  document.head.appendChild(st);
  try { if (document.fonts && document.fonts.load) document.fonts.load("16px 'ToofanPx'"); } catch (e) { }
}
module.exports = { install: install, FAMILY: FAMILY };
