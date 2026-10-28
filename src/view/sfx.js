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

  /* the Bullet's single-cylinder thump: one deep pulse per power stroke, uneven like the real thing, with an exhaust crack on top.
     idle is a lazy dug-dug-dug, and the beat quickens and brightens with revs and throttle */
  var eng = { acc: 0, pulse: 0, thr: 0, scrubG: null, scrubS: null, odd: 0 };
  function firePulse(rn, thr, vol) {
    var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), jit = 0.82 + Math.random() * 0.36, dur = 0.16 - 0.07 * rn;
    var f0 = 62 + rn * 38 + thr * 10;
    o.type = 'triangle'; o.frequency.setValueAtTime(f0 * jit, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((0.5 + 0.35 * thr) * vol * jit, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g2 = ac.createGain();
    s.buffer = nbuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.1; f.frequency.setValueAtTime(260 + rn * 320 + thr * 380, t); f.frequency.exponentialRampToValueAtTime(110, t + dur * 0.8);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime((0.16 + 0.22 * thr) * vol, t + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
    s.connect(f); f.connect(g2); g2.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur);
  }
  function scrub(level) {
    if (!eng.scrubS) {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = nbuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.9; g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start();
      eng.scrubS = s; eng.scrubG = g;
    }
    eng.scrubG.gain.setTargetAtTime(level, ac.currentTime, 0.05);
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
    /* st: {rpm 0..1, thr 0..1, speed, drifting, braking, air}. Called every frame while he rides. */
    engine: function (dt, st) {
      if (!on || !ctx()) return;
      var rn = Math.max(0, Math.min(1, st.rpm)), hz = 5.5 + rn * 20 * (st.air ? 0.8 : 1);
      eng.acc += dt * hz; var n = 0;
      while (eng.acc >= 1 && n++ < 3) { eng.acc -= 1; eng.odd++; firePulse(rn, st.thr, (eng.odd % 7 === 0 ? 0.6 : 1) * (st.air ? 0.7 : 1)); }
      if (eng.acc > 3) eng.acc = 0;
      if (eng.thr > 0.6 && st.thr < 0.1 && st.speed > 6) { var k = 1 + (Math.random() * 3 | 0), q; for (q = 0; q < k; q++) { burst(0.05, 0.4, 'bandpass', 900 + Math.random() * 500, 300, 0.05 + q * 0.09 + Math.random() * 0.05, 1.4); thump(95, 50, 0.08, 0.4, 0.05 + q * 0.09); } }   /* lift-off pops */
      eng.thr = st.thr;
      scrub(st.drifting ? 0.28 : (st.braking && st.speed > 8 ? 0.12 : 0));
    },
    engineOff: function () { if (eng.scrubG && ac) eng.scrubG.gain.setTargetAtTime(0, ac.currentTime, 0.05); eng.acc = 0; },
    shift: function () { if (!on || !ctx()) return; burst(0.03, 0.35, 'highpass', 2500, 1800, 0); thump(180, 90, 0.05, 0.3); },
    start: function () { if (!on || !ctx()) return; var i; for (i = 0; i < 5; i++) { thump(70, 40, 0.1, 0.5, i * 0.11); burst(0.06, 0.25, 'lowpass', 600, 200, i * 0.11); } },
    land: function (vy) { if (!on || !ctx()) return; var p = Math.min(1, vy / 10); thump(70, 28, 0.3, 0.7 + p * 0.6); burst(0.18, 0.3 + p * 0.3, 'lowpass', 1500, 200); },
    crash: function (hard) { if (!on || !ctx()) return; thump(80, 25, hard ? 0.7 : 0.35, hard ? 1.5 : 0.9); burst(hard ? 0.5 : 0.25, hard ? 0.9 : 0.5, 'lowpass', 2200, 120); burst(0.12, 0.7, 'highpass', 2600, 1200, 0.02); if (hard) { burst(0.35, 0.5, 'bandpass', 3000, 900, 0.08, 2); } },
    roll: function () { if (!on || !ctx()) return; burst(0.3, 0.4, 'bandpass', 500, 2400, 0, 1.4); thump(130, 60, 0.15, 0.6, 0.02); this.twang(); },
    swirl: function () { if (!on || !ctx()) return; burst(0.5, 0.45, 'bandpass', 300, 2200, 0, 1.6); this.twang(); },
    mega: function () {           /* the rage finisher */
      if (!on || !ctx()) return; this.boom(); burst(1.2, 0.7, 'bandpass', 200, 3000, 0.1, 1.4); thump(50, 16, 1.4, 1.5, 0.3);
    }
  };
}

module.exports = { createSfx: createSfx };
