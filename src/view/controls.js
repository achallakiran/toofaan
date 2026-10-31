/* view: turns keyboard and touch into the core input. Joystick plus two buttons; the finisher
   button only shows when the simulation says rage is full. */
'use strict';

function attachKeyboard(input, win) {
  var down = {};
  var KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyJ: 'attack', Space: 'attack', KeyK: 'block', ShiftLeft: 'block', ShiftRight: 'block', KeyL: 'finisher'
  };
  function sync() {
    input.setAxis((down.right ? 1 : 0) - (down.left ? 1 : 0), (down.up ? 1 : 0) - (down.down ? 1 : 0));
    input.setButton('attack', !!down.attack); input.setButton('block', !!down.block); input.setButton('finisher', !!down.finisher);
  }
  function onKey(e, v) {
    var k = KEYS[e.code]; if (!k) return;
    down[k] = v; sync(); e.preventDefault();
  }
  function kd(e) { onKey(e, true); } function ku(e) { onKey(e, false); }
  function blur() { down = {}; sync(); }
  win.addEventListener('keydown', kd); win.addEventListener('keyup', ku); win.addEventListener('blur', blur);
  return function detach() { win.removeEventListener('keydown', kd); win.removeEventListener('keyup', ku); win.removeEventListener('blur', blur); };
}

/* button pictures instead of words */
var ICON = {
  fist: '<svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path d="M6 11.5a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2V15a5.5 5.5 0 0 1-5.5 5.5h-2.5A5.5 5.5 0 0 1 6 15z"/><path d="M8 9.5V7.2a1.6 1.6 0 0 1 3.2 0v2.3M11.2 9.5V6.6a1.6 1.6 0 0 1 3.2 0v2.9M14.4 9.5V7.2a1.6 1.6 0 0 1 3.2 0v2.3M6 13h3.5a1.8 1.8 0 0 1 0 3.6H8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2.5l7.5 3v5.7c0 4.8-3.2 8.8-7.5 10.3-4.3-1.5-7.5-5.5-7.5-10.3V5.5z"/><path d="M12 6v12" opacity=".6"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="currentColor"><path d="M13.5 2L4.5 13.5h6.2L9.8 22l9.2-12h-6.3z"/></svg>'
};

function attachTouch(input, root) {
  root.innerHTML =
    '<div id="stickZone"><div id="stickBase"><div id="stickKnob"></div></div></div>' +
    '<div id="btnWrap">' +
    '<button id="btnFinisher" class="btn fin" hidden aria-label="Finisher">' + ICON.bolt + '</button>' +
    '<button id="btnBlock" class="btn blk" aria-label="Block">' + ICON.shield + '</button>' +
    '<button id="btnAttack" class="btn atk" aria-label="Attack">' + ICON.fist + '</button>' +
    '</div>';
  var zone = root.querySelector('#stickZone'), base = root.querySelector('#stickBase'), knob = root.querySelector('#stickKnob');
  var stickId = null, ox = 0, oy = 0, R = 56;
  /* the stick stays where it is drawn: a touch anywhere in the left area steers from its centre */
  function steer(e) {
    var dx = e.clientX - ox, dy = e.clientY - oy, m = Math.sqrt(dx * dx + dy * dy);
    if (m > R) { dx = dx / m * R; dy = dy / m * R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    input.setAxis(dx / R, -dy / R);
  }
  zone.addEventListener('pointerdown', function (e) {
    if (stickId !== null) return;
    stickId = e.pointerId; zone.setPointerCapture(e.pointerId);
    var r = base.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2;
    base.classList.add('on'); steer(e); e.preventDefault();
  });
  zone.addEventListener('pointermove', function (e) {
    if (e.pointerId !== stickId) return;
    steer(e);
  });
  function endStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; base.classList.remove('on'); input.setAxis(0, 0); knob.style.transform = 'translate(0,0)';
  }
  zone.addEventListener('pointerup', endStick); zone.addEventListener('pointercancel', endStick);

  function wire(id, name) {
    var b = root.querySelector('#' + id);
    b.addEventListener('pointerdown', function (e) { b.setPointerCapture(e.pointerId); b.classList.add('down'); input.setButton(name, true); e.preventDefault(); });
    function up() { b.classList.remove('down'); input.setButton(name, false); }
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  wire('btnAttack', 'attack'); wire('btnBlock', 'block'); wire('btnFinisher', 'finisher');
  /* fast repeated taps must never zoom the page: stop the browser's double-tap and pinch zoom on the controls and everywhere else */
  function noZoom(e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }
  root.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', noZoom, { passive: false });
  var lastEnd = 0;
  document.addEventListener('touchend', function (e) { var n = Date.now(); if (n - lastEnd < 350 && !(e.target && e.target.closest && e.target.closest('#studio,button[data-ok]'))) e.preventDefault(); lastEnd = n; }, { passive: false });
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (k) { document.addEventListener(k, function (e) { e.preventDefault(); }, { passive: false }); });
  var fin = root.querySelector('#btnFinisher');
  return { setFinisherVisible: function (v) { fin.hidden = !v; } };
}

module.exports = { attachKeyboard: attachKeyboard, attachTouch: attachTouch };
