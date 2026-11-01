/* view: Toofan's electro-grunge score, synthesised live (instrumental). 128 BPM, E minor.
   Drums follow the chant "dham sham dha dha da dham dham da da dha" (dham = deep kick, sham = snare and crash, dha = tom, da = rim tick).
   Over them a fuzz-guitar power-chord riff (E5 G5 A5 D5), a growling bass and an electro lead ("ta-ra-ta-ra-ta-ra-ta-ta... taaan").
   One shared player for the whole game: each stage asks for its track and the change lands on the next bar line, so the music never stops
   between stages. Tracks:
     intro   - the 16-bar build under the opening video        menu    - the full band
     ride    - lighter cruising groove                         road    - fast and heavy for the road fights
     arena   - the heaviest riff for the fight areas            boss    - arena at full tilt with the lead and chops
     hideout - laid-back clean guitar                           thappad - dreamy pad and bells
     sting   - a two-bar victory hit, then back to the track it interrupted
   Bars are scheduled a little ahead on the audio clock, so the beat stays tight when the frame rate drops. Music can be switched off on its
   own (the effects stay on); the setting is kept. */
'use strict';

var BPM = 128, SPB = 60 / BPM, STEP = SPB / 4, BAR = SPB * 4;
var CHANT = ['K', '', 'S', '', 'T', '', 'T', 't', 'K', '', 'K', 't', 't', '', 'S', ''];
var DOUBLE = ['K', '', 'K', '', 'S', '', 'K', 'K', 'K', '', 'K', '', 'S', '', 'K', 'K'];
var HALF = ['K', '', '', '', '', '', 'K', '', 'S', '', '', '', '', '', 'K', ''];
var SOFT = ['K', '', '', '', 't', '', '', '', 'K', '', 'K', '', 't', '', '', ''];
var ROOTS = [40, 43, 45, 38];
var LEAD = [64, 67, 69, 67, 64, 67, 71, 69, 0, 0, 0, 0, 0, 0, 0, 0];
var LEAD_HOLD = [76, 74, 79, 76];
var ARP = [64, 67, 71, 74, 71, 67, 64, 59];
function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

/* which parts play in bar n of each track */
var TRACKS = {
  intro: function (n) {
    var m = n % 16;
    if (m < 2) return { drums: m === 1 ? CHANT : null, hats: 8, bass: 'saw' };
    if (m < 8) return { drums: CHANT, hats: 8, gtr: 'riff', bass: 'saw', lead: m >= 4 && m % 2 === 1, fill: m === 7, crash: m === 2 };
    if (m < 10) return { kickOnly: true, bass: 'saw', lead: true };
    return { drums: CHANT, hats: 16, gtr: 'riff', bass: 'saw', lead: m % 2 === 1, fill: m === 15, crash: m === 10 };
  },
  menu: function (n) { var m = n % 16; return { drums: CHANT, hats: 8, gtr: 'riff', bass: 'saw', lead: m % 2 === 1, fill: m % 8 === 7, crash: m % 8 === 0 }; },
  ride: function (n) { var m = n % 16; return { drums: m < 2 ? SOFT : CHANT, hats: 8, gtr: m >= 4 ? 'chug' : null, bass: 'saw', lead: m >= 12 && m % 2 === 1, fill: m === 15, vol: 0.85 }; },
  road: function (n) { var m = n % 8; return { drums: DOUBLE, hats: 16, gtr: 'riff', bass: 'dist', lead: m % 2 === 1, fill: m === 7, crash: m % 2 === 0 }; },
  arena: function (n) { var m = n % 8; return { drums: m < 4 ? HALF : DOUBLE, hats: m < 4 ? 8 : 16, gtr: 'open', bass: 'dist', lead: m >= 6, fill: m === 7, crash: m === 0 || m === 4 }; },
  boss: function (n) { var m = n % 4; return { drums: DOUBLE, hats: 16, gtr: 'riff', bass: 'dist', lead: true, fill: m === 3, crash: true }; },
  hideout: function (n) { var m = n % 16; return { drums: m >= 4 ? SOFT : null, hats: m >= 8 ? 8 : 0, gtr: 'clean', bass: 'sub', vol: 0.7 }; },
  thappad: function (n) { var m = n % 8; return { pad: true, bell: true, vol: 0.8 }; },
  sting: function (n) { return { sting: n }; }
};

var shared = null;
function createMusic(sfx) {
  if (shared) return shared;
  var A = null, bus = null, room = null, timer = null, nextBar = 0, barNo = 0, t0 = 0, track = 'menu', after = null, playing = false, fuzz = null, nbuf = null;
  var enabled = true; try { enabled = localStorage.getItem('toofan.music') !== '0'; } catch (e) { }
  function graph() {
    var g = sfx.audio(); if (!g) return null;
    if (!A || A.ac !== g.ac) {
      A = g; bus = A.ac.createGain(); bus.gain.value = 0.6; bus.connect(A.out);
      /* a small room for the snare, toms and clean guitar: a decaying noise impulse */
      room = A.ac.createConvolver(); var len = Math.floor(A.ac.sampleRate * 0.5), ir = A.ac.createBuffer(2, len, A.ac.sampleRate), c, i;
      for (c = 0; c < 2; c++) { var d0 = ir.getChannelData(c); for (i = 0; i < len; i++) d0[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      room.buffer = ir; var rg = A.ac.createGain(); rg.gain.value = 0.32; room.connect(rg); rg.connect(bus);
      fuzz = new Float32Array(1024); for (i = 0; i < 1024; i++) { var x = i / 512 - 1; fuzz[i] = Math.tanh(x * 7) * 0.9; }
      nbuf = A.ac.createBuffer(1, A.ac.sampleRate, A.ac.sampleRate); var d = nbuf.getChannelData(0); for (i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return A;
  }
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function noise(t, dur, peak, type, f, q, wet) {
    var ac = A.ac, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; env(g, t, 0.002, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(bus); if (wet) g.connect(room); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function tone(t, type, f0, f1, dur, peak, dest, wet) {
    var ac = A.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, peak, dur); o.connect(g); g.connect(dest || bus); if (wet) g.connect(room); o.start(t); o.stop(t + dur + 0.02);
  }
  /* the band */
  function kick(t, hard) {
    tone(t, 'sine', 160, 42, 0.34, 0.95); noise(t, 0.015, 0.3, 'highpass', 3000);
    if (hard) { var ac = A.ac, o = ac.createOscillator(), ws = ac.createWaveShaper(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25); ws.curve = fuzz; env(g, t, 0.003, 0.22, 0.28); o.connect(ws); ws.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3); }
  }
  function snare(t) { noise(t, 0.2, 0.55, 'bandpass', 1900, 0.9, true); tone(t, 'triangle', 230, 160, 0.11, 0.35, null, true); noise(t, 0.06, 0.25, 'highpass', 5000); }
  function crash(t) { noise(t, 1.3, 0.17, 'highpass', 5500); noise(t, 0.4, 0.08, 'bandpass', 3000, 0.5); }
  function tom(t, f) { tone(t, 'sine', f || 120, (f || 120) * 0.58, 0.24, 0.6, null, true); noise(t, 0.05, 0.15, 'bandpass', 900); }
  function tick(t) { noise(t, 0.03, 0.18, 'highpass', 5000, 2); }
  function hat(t, open) { noise(t, open ? 0.15 : 0.035, open ? 0.11 : 0.075, 'highpass', 8000, 1); }
  function chord(t, root, dur, open, clean) {
    var ac = A.ac, ws = ac.createWaveShaper(), lp = ac.createBiquadFilter(), g = ac.createGain();
    ws.curve = clean ? null : fuzz; lp.type = 'lowpass'; lp.frequency.value = clean ? 2200 : (open ? 2800 : 1100); env(g, t, 0.005, clean ? 0.07 : (open ? 0.21 : 0.16), dur);
    ws.connect(lp); lp.connect(g); g.connect(bus); if (clean) g.connect(room);
    var ivs = clean ? [0, 7, 12, 16] : [0, 7, 12];
    ivs.forEach(function (iv, k) { [-7, 7].forEach(function (cents) { var o = ac.createOscillator(); o.type = clean ? 'triangle' : 'sawtooth'; o.frequency.value = hz(root + 12 + iv); o.detune.value = cents + k; var og = ac.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(ws); o.start(t + (clean ? k * 0.03 : 0)); o.stop(t + dur + 0.03); }); });
  }
  function bass(t, root, dur, kind) {
    var ac = A.ac, lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(kind === 'sub' ? 400 : 1000, t); lp.frequency.exponentialRampToValueAtTime(kind === 'sub' ? 150 : 200, t + dur);
    if (kind === 'dist') { var ws = ac.createWaveShaper(); ws.curve = fuzz; ws.connect(lp); lp.connect(bus); tone(t, 'sawtooth', hz(root), hz(root), dur, 0.18, ws); }
    else { lp.connect(bus); tone(t, kind === 'sub' ? 'sine' : 'sawtooth', hz(root), hz(root), dur, kind === 'sub' ? 0.4 : 0.32, lp); }
  }
  function lead(t, note, dur, peak) {
    var ac = A.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), dl = ac.createDelay(), fb = ac.createGain();
    o.type = 'square'; o2.type = 'sawtooth'; o.frequency.value = hz(note); o2.frequency.value = hz(note) * 1.005; env(g, t, 0.006, peak, dur);
    if (dur > 0.5) { o.frequency.setValueAtTime(hz(note), t + 0.25); o.frequency.linearRampToValueAtTime(hz(note) * 1.02, t + dur * 0.6); o.frequency.linearRampToValueAtTime(hz(note) * 0.98, t + dur); }
    dl.delayTime.value = SPB * 0.75; fb.gain.value = 0.32;
    o.connect(g); o2.connect(g); g.connect(bus); g.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.03); o2.stop(t + dur + 0.03);
  }
  function pad(t, root, dur) {
    var ac = A.ac, lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(bus); g.connect(room);
    [0, 7, 15, 19].forEach(function (iv) { [-12, 12].forEach(function (c) { var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(root + 24 + iv); o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }); });
  }
  function bell(t, note) { tone(t, 'sine', hz(note), hz(note), 0.9, 0.06, null, true); tone(t, 'sine', hz(note) * 2.76, hz(note) * 2.76, 0.4, 0.02, null, true); }
  function scheduleBar(t, n) {
    var name = track, P = TRACKS[name](n - (startBar[name] || 0)), root = ROOTS[n % 4], i;
    if (P.sting !== undefined) {
      if (P.sting === 0) { kick(t, true); crash(t); chord(t, 40, BAR * 0.9, true); lead(t, 76, BAR * 1.6, 0.09); }
      else { [0, 3, 6].forEach(function (s, k) { kick(t + s * STEP, true); chord(t + s * STEP, [40, 43, 45][k], STEP * 2.5, true); }); crash(t + 8 * STEP); chord(t + 8 * STEP, 40, BAR * 0.5, true); if (after) switchTo(after, true); }
      return;
    }
    var D = P.drums;
    for (i = 0; i < 16; i++) {
      var s = t + i * STEP, d = D ? D[i] : '';
      if (d === 'K') kick(s, D === DOUBLE || D === HALF); else if (d === 'S') snare(s); else if (d === 'T') tom(s); else if (d === 't') tick(s);
      if (!D && P.kickOnly && i % 4 === 0) kick(s);
      if (P.fill && i >= 12) tom(s + STEP * 0.5, 140 - (i - 12) * 15);
      if (P.hats === 16 || (P.hats === 8 && i % 2 === 0)) hat(s, i % 8 === 6);
      if (P.gtr === 'riff') { if (i === 0 || i === 10) chord(s, root, i === 0 ? STEP * 6 : STEP * 5, true); else if (i % 2 === 0 && i !== 12) chord(s, root, STEP * 0.8, false); }
      else if (P.gtr === 'chug' && i % 2 === 0 && n % 2 === 0) chord(s, root, i === 0 ? STEP * 3 : STEP * 0.8, i === 0);
      else if (P.gtr === 'open' && i % 4 === 0) chord(s, root, STEP * 3.6, true);
      else if (P.gtr === 'clean' && i % 2 === 0) lead(s, ARP[(i / 2 + n * 2) % 8] - 12, STEP * 1.6, 0.03);
      if (P.bass && i % 2 === 0) bass(s, root + (i === 14 ? 7 : 0), STEP * 1.6, P.bass);
      if (P.lead && LEAD[i]) lead(s, LEAD[i] + 12, STEP * 0.85, 0.07);
      if (P.bell && i % 4 === 0) bell(s, ARP[(i / 4 + n) % 8] + 12);
    }
    if (P.lead) lead(t + STEP * 8, LEAD_HOLD[n % 4], STEP * 7.5, 0.085);
    if (P.crash) crash(t);
    if (P.pad) pad(t, root, BAR);
    var target = (P.vol || 1) * 0.6; bus.gain.setTargetAtTime(target, t, 0.3);
  }
  var startBar = {};
  function switchTo(name, now) { if (!TRACKS[name]) return; track = name; startBar[name] = barNo + (now ? 1 : 0); }
  function pump() {
    if (!playing || !A) return;
    var now = A.ac.currentTime;
    while (nextBar < now + 0.35) { if (pending) { switchTo(pending); pending = null; } scheduleBar(nextBar, barNo); nextBar += BAR; barNo++; }
  }
  var pending = null;
  function start(name, fromBeat) {
    if (!enabled || !graph()) return false;
    track = name; playing = true; startBar = {}; pending = null;
    if (fromBeat > 0) { t0 = A.ac.currentTime + 0.05 - fromBeat * SPB; barNo = Math.ceil(fromBeat / 4 + 0.01); nextBar = t0 + barNo * BAR; startBar[name] = 0; }
    else { barNo = 0; t0 = nextBar = A.ac.currentTime + 0.08; startBar[name] = 0; }
    bus.gain.cancelScheduledValues(A.ac.currentTime); bus.gain.setValueAtTime(0.6, A.ac.currentTime);
    if (!timer) timer = setInterval(pump, 30); pump(); return true;
  }
  shared = {
    BPM: BPM, BAR: BAR,
    /* start a track now (fromBeat joins part-way through, for the video) */
    play: function (name, fromBeat) { return start(name === 'loop' ? 'menu' : (name || 'menu'), fromBeat); },
    /* ask for a track: starts it if silent, otherwise it takes over on the next bar line. 'sting' plays two bars, then returns */
    setTrack: function (name) {
      if (name === 'loop') name = 'menu';
      if (!playing) { if (name === 'sting') return false; return start(name); }
      if (name === 'sting') { if (track !== 'sting') after = track; pending = 'sting'; return true; }
      if (name === track && !pending) return true;
      pending = name; after = null; return true;
    },
    toLoop: function () { if (playing && track === 'intro') pending = 'menu'; },
    track: function () { return pending || track; },
    stop: function (fade) {
      if (!A || !playing) { playing = false; return; } playing = false; if (timer) { clearInterval(timer); timer = null; }
      var t = A.ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.4));
      var old = bus, oldRoom = room; setTimeout(function () { try { old.disconnect(); oldRoom.disconnect(); } catch (e) { } }, ((fade || 0.4) + 0.3) * 1000); A = null;
    },
    beat: function () { return playing && A ? (A.ac.currentTime - t0) / SPB : -1; },
    playing: function () { return playing; },
    /* the Music switch (the speaker switches everything) */
    get enabled() { return enabled; },
    toggle: function () { enabled = !enabled; try { localStorage.setItem('toofan.music', enabled ? '1' : '0'); } catch (e) { } if (!enabled) this.stop(0.3); return enabled; },
    vocalReady: function () { return false; }   /* the score is instrumental */
  };
  return shared;
}

module.exports = { createMusic: createMusic, TRACKS: Object.keys(TRACKS) };
