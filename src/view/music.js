/* view: Toofan's electro-grunge theme, synthesised live (no audio files). 128 BPM in E minor.
   Drums follow the chant "dham sham dha dha da dham dham da da dha": dham = deep kick, sham = snare with a crash, dha = tom, da = rim tick.
   Over them a fuzz-guitar power-chord riff (E5 G5 A5 D5), a growling saw bass, and an electro lead that runs "ta-ra-ta-ra-ta-ra-ta-ta... taaan".
   Bars are scheduled a little ahead on the audio clock, so the beat stays tight even when the frame rate drops; `beat()` gives the position
   in beats for anything that should move in time. Sections: 'intro' builds over 16 bars (30 s); 'loop' is the full band. */
'use strict';

var BPM = 128, SPB = 60 / BPM, STEP = SPB / 4, BAR = SPB * 4;
/* one bar of sixteenths. K kick, S snare(+crash), T tom, t rim tick */
var DRUMS = ['K', '', 'S', '', 'T', '', 'T', 't', 'K', '', 'K', 't', 't', '', 'S', ''];
var ROOTS = [40, 43, 45, 38];                    /* riff roots, one per bar: E2 G2 A2 D2 (MIDI) */
var LEAD = [64, 67, 69, 67, 64, 67, 71, 69, 0, 0, 0, 0, 0, 0, 0, 0];   /* ta-ra-ta-ra-ta-ra-ta-ta then ... */
var LEAD_HOLD = [76, 74, 79, 76];                /* ...taaan, a held note per bar */
function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function createMusic(sfx) {
  var A = null, bus = null, timer = null, nextBar = 0, barNo = 0, t0 = 0, section = 'loop', playing = false, fuzz = null, nbuf = null;
  function graph() {
    var g = sfx.audio(); if (!g) return null;
    if (!A || A.ac !== g.ac) {
      A = g; bus = A.ac.createGain(); bus.gain.value = 0.62; bus.connect(A.out);
      var c = new Float32Array(1024), i; for (i = 0; i < 1024; i++) { var x = i / 512 - 1; c[i] = Math.tanh(x * 6) * 0.9; }
      fuzz = c;
      nbuf = A.ac.createBuffer(1, A.ac.sampleRate, A.ac.sampleRate); var d = nbuf.getChannelData(0); for (i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return A;
  }
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function noise(t, dur, peak, type, f, q) {
    var ac = A.ac, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; env(g, t, 0.002, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function tone(t, type, f0, f1, dur, peak, dest) {
    var ac = A.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, peak, dur); o.connect(g); g.connect(dest || bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function kick(t) { tone(t, 'sine', 150, 42, 0.32, 0.95); noise(t, 0.02, 0.25, 'highpass', 2500); }
  function snare(t, crash) { noise(t, 0.18, 0.5, 'bandpass', 1900, 0.9); tone(t, 'triangle', 220, 160, 0.1, 0.3); if (crash) noise(t, 1.1, 0.16, 'highpass', 6000); }
  function tom(t) { tone(t, 'sine', 120, 70, 0.22, 0.6); noise(t, 0.05, 0.15, 'bandpass', 900); }
  function tick(t) { noise(t, 0.03, 0.18, 'highpass', 5000, 2); }
  function hat(t, open) { noise(t, open ? 0.14 : 0.035, open ? 0.11 : 0.08, 'highpass', 8000, 1); }
  /* fuzz guitar: two detuned saws through a hard clipper and a low-pass, played as a palm-muted chug or an open chord */
  function chord(t, root, dur, open) {
    var ac = A.ac, ws = ac.createWaveShaper(), lp = ac.createBiquadFilter(), g = ac.createGain();
    ws.curve = fuzz; lp.type = 'lowpass'; lp.frequency.value = open ? 2600 : 1100; env(g, t, 0.005, open ? 0.2 : 0.16, dur);
    ws.connect(lp); lp.connect(g); g.connect(bus);
    [0, 7, 12].forEach(function (iv, k) { [-6, 6].forEach(function (cents) { var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(root + 12 + iv); o.detune.value = cents + k; var og = ac.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(ws); o.start(t); o.stop(t + dur + 0.03); }); });
  }
  function bass(t, root, dur) { var ac = A.ac, lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(180, t + dur); lp.connect(bus); tone(t, 'sawtooth', hz(root), hz(root), dur, 0.32, lp); }
  function lead(t, note, dur, peak) {
    var ac = A.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), dl = ac.createDelay(), fb = ac.createGain();
    o.type = 'square'; o2.type = 'sawtooth'; o.frequency.value = hz(note); o2.frequency.value = hz(note) * 1.005; env(g, t, 0.006, peak, dur);
    if (dur > 0.5) { o.frequency.setValueAtTime(hz(note), t + 0.25); o.frequency.linearRampToValueAtTime(hz(note) * 1.02, t + dur * 0.6); o.frequency.linearRampToValueAtTime(hz(note) * 0.98, t + dur); }   /* the "taaan" bends and wails */
    dl.delayTime.value = SPB * 0.75; fb.gain.value = 0.32;
    o.connect(g); o2.connect(g); g.connect(bus); g.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.03); o2.stop(t + dur + 0.03);
  }
  /* which parts play in bar n of the section */
  function parts(n) {
    if (section !== 'intro') return { drums: true, hats: true, gtr: true, bass: true, lead: n % 2 === 1, fill: n % 8 === 7 };
    var m = n % 16;
    if (m < 2) return { drums: m === 1, hats: true, gtr: false, bass: true, lead: false };
    if (m < 8) return { drums: true, hats: true, gtr: true, bass: true, lead: m >= 4 && m % 2 === 1, fill: m === 7 };
    if (m < 10) return { drums: false, kickOnly: true, hats: false, gtr: false, bass: true, lead: true };          /* breakdown */
    return { drums: true, hats: true, gtr: true, bass: true, lead: m % 2 === 1, fill: m === 15 };
  }
  function scheduleBar(t, n) {
    var P = parts(n), root = ROOTS[n % 4], i;
    for (i = 0; i < 16; i++) {
      var s = t + i * STEP, d = DRUMS[i];
      if (P.drums) { if (d === 'K') kick(s); else if (d === 'S') snare(s, i === 2 && n % 4 === 0); else if (d === 'T') tom(s); else if (d === 't') tick(s); }
      else if (P.kickOnly && i % 4 === 0) kick(s);
      if (P.fill && i >= 12) tom(s + STEP * 0.5);
      if (P.hats && i % 2 === 0) hat(s + (i % 4 === 2 ? 0 : 0), i % 8 === 6);
      if (P.gtr) { if (i === 0 || i === 10) chord(s, root, i === 0 ? STEP * 6 : STEP * 5, true); else if (i % 2 === 0 && i !== 12) chord(s, root, STEP * 0.8, false); }
      if (P.bass && i % 2 === 0) bass(s, root + (i === 14 ? 7 : 0), STEP * 1.6);
      if (P.lead && LEAD[i]) lead(s, LEAD[i] + 12, STEP * 0.85, 0.07);
    }
    if (P.lead) lead(t + STEP * 8, LEAD_HOLD[n % 4], STEP * 7.5, 0.085);
  }
  function pump() {
    if (!playing || !A) return;
    var now = A.ac.currentTime;
    while (nextBar < now + 0.35) { scheduleBar(nextBar, barNo); nextBar += BAR; barNo++; }
  }
  return {
    BPM: BPM, BAR: BAR,
    /* start a section: 'intro' (16-bar build for the opening video) or 'loop' (full band, repeating) */
    play: function (name) {
      if (!graph()) return false;
      section = name || 'loop'; barNo = 0; t0 = nextBar = A.ac.currentTime + 0.08; playing = true;
      bus.gain.cancelScheduledValues(A.ac.currentTime); bus.gain.setValueAtTime(0.62, A.ac.currentTime);
      if (!timer) timer = setInterval(pump, 30); pump(); return true;
    },
    /* after the intro's 16 bars, carry on as the loop without a gap */
    toLoop: function () { if (playing && section === 'intro') { section = 'loop'; } },
    stop: function (fade) {
      if (!A) return; playing = false; if (timer) { clearInterval(timer); timer = null; }
      var t = A.ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.4));
      var old = bus; setTimeout(function () { try { old.disconnect(); } catch (e) { } }, ((fade || 0.4) + 0.2) * 1000); A = null;
    },
    /* position in beats since play() (for visuals in time with the music); -1 if silent */
    beat: function () { return playing && A ? (A.ac.currentTime - t0) / SPB : -1; },
    playing: function () { return playing; }
  };
}

module.exports = { createMusic: createMusic };
