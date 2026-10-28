/* view: impact sounds, synthesised in the browser so the game stays one offline file. Fists are a low thump with a short
   filtered-noise slap; kicks are deeper with a leather snap; blocks are duller; every sound gets a little random pitch. */
'use strict';

function createSfx() {
  var ac = null, master = null, nbuf = null, on = true;
  try { on = localStorage.getItem('toofan.sound') !== '0'; } catch (e) { }
  function ctx() {
    if (!ac) {
      try {
        var A = window.AudioContext || window.webkitAudioContext; ac = new A(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
        nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function thump(f0, f1, dur, gain, delay) {
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain(), r = 0.92 + Math.random() * 0.16;
    o.type = 'sine'; o.frequency.setValueAtTime(f0 * r, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * r), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function burst(dur, gain, type, f0, f1, delay, q) {
    var t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; s.loop = true; f.type = type; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  var KICKS = { kick: 1, axeKick: 1, roundhouse: 1, knee: 0.6 };
  return {
    get on() { return on; },
    toggle: function () { on = !on; try { localStorage.setItem('toofan.sound', on ? '1' : '0'); } catch (e) { } if (on) ctx(); return on; },
    whoosh: function (power) { if (!on || !ctx()) return; burst(0.2, 0.14 + (power || 0.5) * 0.12, 'bandpass', 380, 1700, 0, 1.2); },
    hit: function (move, power) {
      if (!on || !ctx()) return; var p = 0.55 + (power || 0.5) * 0.6, k = KICKS[move];
      if (k) { thump(100, 38, 0.22, 0.95 * p); burst(0.09, 0.5 * p, 'bandpass', 1100, 320, 0, 0.9); burst(0.03, 0.35 * p, 'highpass', 3200, 2400, 0.004); }
      else if (move === 'uppercut') { thump(120, 40, 0.2, 1.0 * p); burst(0.07, 0.5 * p, 'lowpass', 2200, 500); }
      else if (move === 'elbow') { thump(150, 60, 0.12, 0.8 * p); burst(0.04, 0.5 * p, 'bandpass', 1600, 700); }
      else { thump(135, 50, 0.14, 0.85 * p); burst(0.05, 0.5 * p, 'lowpass', 1900, 600); burst(0.02, 0.25 * p, 'highpass', 3500, 3000, 0.003); }
    },
    block: function (broke) { if (!on || !ctx()) return; thump(85, 52, 0.12, 0.6); burst(0.07, 0.3, 'lowpass', 520, 280); if (broke) { burst(0.14, 0.55, 'highpass', 2600, 1500); thump(160, 60, 0.12, 0.7); } },
    fall: function () { if (!on || !ctx()) return; thump(72, 28, 0.4, 1.1, 0.05); burst(0.25, 0.5, 'lowpass', 900, 160, 0.04); },
    twang: function () {
      if (!on || !ctx()) return; var t = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(205, t + 1.4); f.type = 'lowpass'; f.frequency.value = 1600;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.45);
    },
    /* the big ones: a sub drop you feel, a long rumbling tail, a crack on top, and an echo so it fills the street */
    boom: function () {
      if (!on || !ctx()) return;
      thump(70, 18, 1.1, 1.6); thump(140, 30, 0.5, 1.2, 0.01); burst(0.9, 0.9, 'lowpass', 1800, 60, 0, 0.7); burst(0.12, 0.9, 'highpass', 2800, 1200, 0);
      burst(0.5, 0.5, 'bandpass', 700, 160, 0.18, 0.6); thump(55, 20, 0.7, 0.8, 0.22); this.twang();
    },
    smash: function () {
      if (!on || !ctx()) return;
      thump(90, 22, 0.9, 1.5); burst(0.7, 0.8, 'lowpass', 1500, 80, 0, 0.7); burst(0.2, 0.9, 'highpass', 3000, 1000, 0); burst(0.3, 0.6, 'bandpass', 2200, 500, 0.04, 2);   /* wood splintering */
      thump(60, 22, 0.6, 0.8, 0.2); this.twang();
    },
    swirl: function () { if (!on || !ctx()) return; burst(0.5, 0.45, 'bandpass', 300, 2200, 0, 1.6); this.twang(); },
    mega: function () {           /* the rage finisher */
      if (!on || !ctx()) return; this.boom(); burst(1.2, 0.7, 'bandpass', 200, 3000, 0.1, 1.4); thump(50, 16, 1.4, 1.5, 0.3);
    }
  };
}

module.exports = { createSfx: createSfx };
