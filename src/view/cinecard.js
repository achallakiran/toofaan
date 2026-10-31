/* view: the retro cut card used between scenes: colour-changing stripes racing across the screen, a huge comic title, and the
   "Bhaago bhaago bhaago, haiwaan! Aaya aaya aaya re Toofan!" chant scrolling past. It sits above everything and outlives a mode switch,
   so it can cover the cut from the ride to a fight area and back. */
'use strict';

var styled = false;
function style() {
  if (styled) return; styled = true;
  var s = document.createElement('style');
  s.textContent =
    '@keyframes tfStripes{from{background-position:0 0}to{background-position:280px 0}}' +
    '@keyframes tfHue{from{filter:hue-rotate(0deg) saturate(1.4)}to{filter:hue-rotate(360deg) saturate(1.4)}}' +
    '@keyframes tfPop{0%{transform:scale(.3) rotate(-14deg)}60%{transform:scale(1.12) rotate(-5deg)}100%{transform:scale(1) rotate(-6deg)}}' +
    '@keyframes tfRun{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
    '.tf-card{position:fixed;inset:0;z-index:60;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .18s}' +
    '.tf-card .bg{position:absolute;inset:-20%;background:repeating-linear-gradient(115deg,#ff2d55 0 40px,#ffd21f 40px 80px,#1fb5ff 80px 120px,#7a2dff 120px 160px,#14e07a 160px 200px,#ff8a1f 200px 280px);animation:tfStripes .5s linear infinite,tfHue 1.6s linear infinite}' +
    '.tf-card .burst{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;transform:translate(-50%,-50%);background:repeating-conic-gradient(rgba(0,0,0,.28) 0 6deg,transparent 6deg 14deg)}' +
    '.tf-card .t{position:absolute;left:0;right:0;top:34%;text-align:center;font:900 clamp(40px,10vw,110px)/1 "Arial Black",Impact,system-ui,sans-serif;color:#ffd21f;-webkit-text-stroke:3px #000;text-shadow:7px 7px 0 #000;animation:tfPop .45s ease-out both;letter-spacing:.02em}' +
    '.tf-card .s{position:absolute;left:0;right:0;top:calc(34% + clamp(54px,12vw,130px));text-align:center;font:900 clamp(16px,3.4vw,34px) "Arial Black",Impact,system-ui,sans-serif;color:#fff;-webkit-text-stroke:1.5px #000;text-shadow:3px 3px 0 #000}' +
    '.tf-card .run{position:absolute;left:0;bottom:12%;white-space:nowrap;font:900 clamp(18px,3.6vw,38px) "Arial Black",Impact,system-ui,sans-serif;color:#000;background:#ffd21f;padding:6px 0;border-top:4px solid #000;border-bottom:4px solid #000;animation:tfRun 3s linear infinite}' +
    '.tf-bars{position:fixed;left:0;right:0;height:0;background:#000;z-index:7;pointer-events:none;transition:height .45s ease}';
  document.head.appendChild(s);
}

var CHANT = 'BHAAGO BHAAGO BHAAGO, HAIWAAN!  ★  AAYA AAYA AAYA RE TOOFAN!  ★  ';

/* show a card for `ms` milliseconds: {title, sub, ms} */
function show(o) {
  style();
  var el = document.createElement('div'); el.className = 'tf-card';
  el.innerHTML = '<div class="bg"></div><div class="burst"></div><div class="t"></div><div class="s"></div><div class="run"></div>';
  el.querySelector('.t').textContent = o.title || 'TOOFAN!'; el.querySelector('.s').textContent = o.sub || '';
  el.querySelector('.run').textContent = CHANT + CHANT + CHANT + CHANT;
  document.body.appendChild(el);
  requestAnimationFrame(function () { el.style.opacity = 1; });
  setTimeout(function () { el.style.opacity = 0; setTimeout(function () { el.remove(); }, 260); }, o.ms || 2000);
  return el;
}

/* cinema bars top and bottom */
function bars() {
  style();
  var a = document.createElement('div'), b = document.createElement('div'); a.className = b.className = 'tf-bars'; a.style.top = '0'; b.style.bottom = '0';
  document.body.appendChild(a); document.body.appendChild(b);
  return { set: function (on) { a.style.height = b.style.height = on ? '11vh' : '0'; }, remove: function () { a.remove(); b.remove(); } };
}

module.exports = { show: show, bars: bars };
