/* core: fixed-step loop. Pure: the caller supplies the clock and the scheduler, so tests can drive it. */
'use strict';

function createLoop(opts) {
  var hz = opts.hz || 60, stepMs = 1000 / hz, maxSteps = opts.maxSteps || 5;
  var acc = 0, tick = 0, timeScale = 1, running = false, last = 0, handle = null;
  var dropped = 0;

  function advance(dtMs) {
    if (dtMs < 0) dtMs = 0;
    acc += dtMs * timeScale;
    var n = 0;
    while (acc >= stepMs && n < maxSteps) { opts.step(tick); tick++; acc -= stepMs; n++; }
    if (n === maxSteps && acc >= stepMs) { dropped += Math.floor(acc / stepMs); acc = 0; }
    if (opts.render) opts.render(acc / stepMs);
    return n;
  }

  function frame(now) {
    if (!running) return;
    advance(Math.min(now - last, 250));
    last = now;
    handle = opts.schedule(frame);
  }

  return {
    advance: advance,
    start: function () {
      if (running) return; running = true;
      last = opts.now(); handle = opts.schedule(frame);
    },
    stop: function () { running = false; if (opts.cancel && handle != null) opts.cancel(handle); },
    setTimeScale: function (s) { timeScale = s; },
    getTick: function () { return tick; },
    getDropped: function () { return dropped; },
    isRunning: function () { return running; },
    stepMs: stepMs
  };
}

module.exports = { createLoop: createLoop };
