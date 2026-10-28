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

function attachTouch(input, root) {
  root.innerHTML =
    '<div id="stickZone"><div id="stickBase"><div id="stickKnob"></div></div></div>' +
    '<div id="btnWrap">' +
    '<button id="btnFinisher" class="btn fin" hidden>FINISH</button>' +
    '<button id="btnBlock" class="btn blk">BLOCK</button>' +
    '<button id="btnAttack" class="btn atk">ATTACK</button>' +
    '</div>';
  var zone = root.querySelector('#stickZone'), base = root.querySelector('#stickBase'), knob = root.querySelector('#stickKnob');
  var stickId = null, ox = 0, oy = 0, R = 56;
  function place(x, y) { base.style.left = x + 'px'; base.style.top = y + 'px'; }
  zone.addEventListener('pointerdown', function (e) {
    if (stickId !== null) return;
    stickId = e.pointerId; zone.setPointerCapture(e.pointerId);
    var r = zone.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
    place(ox - r.left, oy - r.top); base.classList.add('on'); knob.style.transform = 'translate(0,0)'; e.preventDefault();
  });
  zone.addEventListener('pointermove', function (e) {
    if (e.pointerId !== stickId) return;
    var dx = e.clientX - ox, dy = e.clientY - oy, m = Math.sqrt(dx * dx + dy * dy);
    if (m > R) { dx = dx / m * R; dy = dy / m * R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    input.setAxis(dx / R, -dy / R);
  });
  function endStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; base.classList.remove('on'); input.setAxis(0, 0);
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
  var fin = root.querySelector('#btnFinisher');
  return { setFinisherVisible: function (v) { fin.hidden = !v; } };
}

module.exports = { attachKeyboard: attachKeyboard, attachTouch: attachTouch };
