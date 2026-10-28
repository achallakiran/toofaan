/* core: device-independent input state. Keyboard and touch (view layer) write raw values here;
   the simulation reads a per-tick snapshot with press/release edges and a short press buffer. */
'use strict';

var BUTTONS = ['attack', 'block', 'finisher'];
var BUFFER_TICKS = 6;

function createInput() {
  var raw = { mx: 0, my: 0, attack: false, block: false, finisher: false };
  var prev = { attack: false, block: false, finisher: false };
  var pressTick = { attack: -999, block: -999, finisher: -999 };
  var tickNo = 0;
  var state = {
    mx: 0, my: 0,
    held: { attack: false, block: false, finisher: false },
    pressed: { attack: false, block: false, finisher: false },
    released: { attack: false, block: false, finisher: false },
    heldTicks: { attack: 0, block: 0, finisher: 0 }
  };

  function clamp1(v) { return v > 1 ? 1 : (v < -1 ? -1 : v); }

  return {
    state: state,
    setAxis: function (x, y) {
      x = clamp1(x || 0); y = clamp1(y || 0);
      var m = Math.sqrt(x * x + y * y);
      if (m > 1) { x /= m; y /= m; }
      raw.mx = x; raw.my = y;
    },
    setButton: function (name, down) { raw[name] = !!down; },
    /* call once at the start of every simulation tick */
    tick: function (n) {
      tickNo = n;
      state.mx = raw.mx; state.my = raw.my;
      for (var i = 0; i < BUTTONS.length; i++) {
        var b = BUTTONS[i], cur = raw[b], was = prev[b];
        state.pressed[b] = cur && !was;
        state.released[b] = !cur && was;
        state.held[b] = cur;
        state.heldTicks[b] = cur ? (was ? state.heldTicks[b] + 1 : 1) : 0;
        if (state.pressed[b]) pressTick[b] = n;
        prev[b] = cur;
      }
    },
    /* true once if the button was pressed within the last few ticks, then clears */
    consume: function (name, ticks) {
      var w = ticks == null ? BUFFER_TICKS : ticks;
      if (tickNo - pressTick[name] <= w) { pressTick[name] = -999; return true; }
      return false;
    },
    reset: function () {
      raw.mx = raw.my = 0; raw.attack = raw.block = raw.finisher = false;
    }
  };
}

module.exports = { createInput: createInput, BUFFER_TICKS: BUFFER_TICKS };
