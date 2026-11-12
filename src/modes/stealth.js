/* modes: the stealth stage demo (from the title menu, or #stealth). Antu's container yard at night: get to the head sniper on the site
   office roof and take him down, unseen. The rules are sim/stealth's; this draws them (view/stealthview), follows Toofan with the game's own
   follow camera, and keeps the screen talk short:
     top right  the fights' panel: his life (two hits), how close they are to seeing him (HIDDEN / SUSPICIOUS / SPOTTED), KO count
     bottom     STUN when a man is within reach from behind, CLIMB at a ladder (both on Attack), CROUCH on the Block button
     middle     the brief at the start, CHECKPOINT, the shot, back to the checkpoint, and STAGE CLEAR with play-again / title */
'use strict';

var ST = require('../sim/stealth');
var M = require('../sim/stealthmap');
var svMod = require('../view/stealthview');
var sfxmod = require('../view/sfx');
var musicMod = require('../view/music');

var FONT = "'ToofanPx',monospace";

function createStealth() {
  var S = {};
  function el(css, html, parent) { var d = document.createElement('div'); d.setAttribute('data-ok', '1'); d.style.cssText = css; d.innerHTML = html || ''; (parent || document.body).appendChild(d); return d; }
  function say(text, col, secs) {
    var m = S.msg; m.textContent = text; m.style.color = col || '#fff'; m.style.opacity = '1'; m.style.transform = 'translate(-50%,-50%) scale(1)';
    clearTimeout(S.msgT); S.msgT = setTimeout(function () { m.style.opacity = '0'; m.style.transform = 'translate(-50%,-50%) scale(.9)'; }, (secs || 1.6) * 1000);
  }
  /* small sounds made here: the lock-on beep and the rifle crack */
  function beep(f, d, v) { var A = S.sfx.audio(); if (!A) return; var t = A.ac.currentTime, o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(A.out); o.start(t); o.stop(t + d + 0.02); }
  function crack(far) {
    var A = S.sfx.audio(); if (!A) return; var ac = A.ac, t = ac.currentTime, n = Math.floor(ac.sampleRate * 0.5), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), i;
    for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * (0.012 + 0.06 * (i > ac.sampleRate * 0.03 ? 1 : 0))));
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = b; f.type = 'lowpass'; f.frequency.value = far ? 2400 : 5200; g.gain.value = far ? 0.5 : 0.8;
    src.connect(f); f.connect(g); g.connect(A.out); src.start(t);
  }
  return {
    name: 'stealth',
    enter: function (ctx, scope) {
      var view = ctx.view, st = S.st = ST.create({ bus: { emit: function (n, d) { S.ev.push([n, d]); } } });
      S.ev = []; S.t = 0; S.last = ctx.now(); S.cam = null; S.shake = 0; S.lockBeep = 0; ctx.debug.stealth = S;
      ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = false; ctx.touch.setFinisherVisible(false);
      S.sv = svMod.createStealthView(view, st); scope.add(function () { S.sv.dispose(); ctx.debug.stealth = null; });
      var off = view.onFrame(function (camera, dt) { S.sv.fade(camera, dt); }); scope.add(off);
      S.sfx = sfxmod.createSfx(); S.music = musicMod.createMusic(S.sfx); S.music.setTrack('night');
      /* the screen */
      var ui = S.ui = el('position:fixed;inset:0;z-index:30;pointer-events:none;font-family:' + FONT + ';color:#fff;letter-spacing:.08em');
      scope.add(function () { ui.remove(); clearTimeout(S.msgT); });
      /* the panel in the fights' own layout (view/fightui): name and who's left, his life bar, then how seen he is in place of rage */
      var pan = el('position:absolute;top:max(56px,calc(env(safe-area-inset-top) + 48px));right:max(14px,env(safe-area-inset-right));width:min(260px,44vw);font:700 11px system-ui,sans-serif;letter-spacing:.1em;color:#fff;text-transform:uppercase;text-shadow:0 1px 2px rgba(0,0,0,.6)',
        '<div style="display:flex;justify-content:space-between"><span>Toofan</span><span id="sLeft" style="color:#ffc21a"></span></div>' +
        '<div style="height:12px;margin:4px 0;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.35);border-radius:3px;overflow:hidden"><div id="sHp" style="height:100%;width:100%;background:linear-gradient(90deg,#d63a2f,#ff7a3d);transition:width .25s"></div></div>' +
        '<div style="height:7px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.3);border-radius:3px;overflow:hidden"><div id="sSeen" style="height:100%;width:0"></div></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:4px;opacity:.9"><span id="sState">Hidden</span><span id="sKo">KO 0</span></div>' +
        '<div id="sWhere" style="margin-top:3px;opacity:.6;font-size:10px"></div>', ui);
      S.pan = { left: pan.querySelector('#sLeft'), hp: pan.querySelector('#sHp'), seen: pan.querySelector('#sSeen'), state: pan.querySelector('#sState'), ko: pan.querySelector('#sKo'), where: pan.querySelector('#sWhere') };
      S.prompt = el('position:absolute;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 150px);right:max(22px,env(safe-area-inset-right));padding:6px 10px;background:#ffd21f;color:#000;font-size:14px;border:2px solid #000;box-shadow:3px 3px 0 #000;display:none', 'STUN ▼', ui);
      S.crouchTag = el('position:absolute;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 92px);right:calc(max(22px,env(safe-area-inset-right)) + 100px);padding:4px 8px;background:rgba(0,0,0,.6);font-size:11px', 'CROUCH', ui);
      S.msg = el('position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);font-size:clamp(18px,5vw,30px);text-align:center;text-shadow:3px 3px 0 #000,-1px -1px 0 #000;opacity:0;transition:opacity .25s,transform .25s;white-space:nowrap', '', ui);
      S.red = el('position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 40%,rgba(255,0,0,.55) 100%);opacity:0', '', ui);
      /* the brief: tap to start */
      var brief = S.brief = el('position:fixed;inset:0;z-index:46;display:flex;align-items:center;justify-content:center;background:rgba(3,5,10,.72);font-family:' + FONT + ';color:#fff;padding:16px;cursor:pointer;touch-action:manipulation',
        '<div style="max-width:420px;background:#0d1018;border:3px solid #ffd21f;box-shadow:6px 6px 0 #000;padding:18px 18px 16px;font-size:12px;line-height:1.75;letter-spacing:.06em">' +
        '<div style="font-size:18px;color:#ffd21f;margin-bottom:8px">ANTU KA GODAM · NIGHT</div>' +
        'GET TO THE HEAD SNIPER ON THE SITE OFFICE ROOF AND TAKE HIM DOWN.<br><br>' +
        '· STAY IN THE DARK. LIGHT GIVES YOU AWAY.<br>· <b style="color:#ffd21f">BLOCK</b> = CROUCH. CRATES HIDE YOU FROM MEN ON FOOT, NOT FROM SNIPERS.<br>' +
        '· A RED LASER ON YOU = SPOTTED. GET BEHIND A CONTAINER, FAST.<br>· <b style="color:#ffd21f">ATTACK</b> FROM BEHIND = STUN.<br>· LADDERS: <b style="color:#ffd21f">ATTACK</b> AT THE FOOT OR THE TOP. THE TOWERS AND THE OFFICE HAVE ONE AT THE BACK; THE OFFICE ALSO HAS STAIRS ON ITS EAST SIDE.' +
        '<div style="margin-top:14px;text-align:center;color:#ffd21f">[ TAP TO START ]</div></div>');
      S.paused = true;
      brief.addEventListener('pointerdown', function () { S.sfx.wake(); brief.remove(); S.paused = false; });
      scope.add(function () { brief.remove(); if (S.endCard) S.endCard.remove(); });
      ctx.input.reset();
    },
    step: function (ctx, tick) {
      ctx.input.tick(tick);
      if (S.paused) return;
      ST.step(S.st, ctx.input);
    },
    render: function (ctx, alpha) {
      var view = ctx.view, st = S.st, p = st.player, now = ctx.now(), dt = Math.min(0.1, Math.max(0.001, (now - S.last) / 1000)); S.last = now; S.t += dt;
      /* what happened since the last frame */
      S.ev.splice(0).forEach(function (e) {
        var n = e[0], d = e[1];
        if (n === 'st:spotted') { say(d.type === 'guard' ? 'SPOTTED!' : 'SNIPER!', '#ff3a2a', 1.0); beep(1400, 0.08, 0.08); }
        else if (n === 'st:shot') { S.sv.shot(d.id, d.tx, d.ty, d.tz); crack(Math.hypot(d.x - d.tx, d.z - d.tz) > 12); S.shake = 0.35; S.red.style.transition = 'none'; S.red.style.opacity = '1'; setTimeout(function () { S.red.style.transition = 'opacity .6s'; S.red.style.opacity = '0'; }, 60); if (d.hits < 2) say('HIT!', '#ff3a2a', 0.9); }
        else if (n === 'st:down') { say('SHOT DOWN · BACK TO CHECKPOINT', '#ff3a2a', 2.1); S.sfx.fall(); }
        else if (n === 'st:checkpoint') { say('CHECKPOINT', '#6cf0a0', 1.4); beep(880, 0.1, 0.05); setTimeout(function () { beep(1320, 0.12, 0.05); }, 110); }
        else if (n === 'st:takedown') { S.sfx.whoosh(0.4); setTimeout(function () { S.sfx.hit('elbow', 0.5); }, 330); setTimeout(function () { S.sfx.hit('jab', 0.4); }, 650); }
        else if (n === 'st:out') { S.sfx.fall(); }
        else if (n === 'st:heard') beep(520, 0.12, 0.04);
        else if (n === 'st:lost') beep(300, 0.18, 0.04);
        else if (n === 'st:won') { S.music.setTrack('menu'); setTimeout(function () { endCard(ctx, d); }, 1300); say('HEAD SNIPER DOWN', '#ffd21f', 2.5); }
      });
      /* the lock-on beeps quicken as the shot nears */
      var lk = 0; st.watchers.forEach(function (w) { if (w.st === 'lock') lk = Math.max(lk, w.lockT / ST.LOCK); });
      if (lk > 0 && st.state === 'play') { S.lockBeep -= dt; if (S.lockBeep <= 0) { beep(1900, 0.05, 0.05); S.lockBeep = 0.22 - 0.16 * lk; } } else S.lockBeep = 0;
      S.sv.sync(alpha, dt);
      /* the screen talk */
      var seen = p.seen, lab = lk > 0 ? 'SPOTTED' : seen > 0.05 ? 'SUSPICIOUS' : 'HIDDEN', col = lk > 0 ? '#ff3a2a' : seen > 0.05 ? '#ffd21f' : (p.light > 0.6 ? '#ffe9b0' : '#8fb0c8');
      var P = S.pan, sv = lk > 0 ? 1 : seen, key = lab + '|' + Math.round(sv * 20) + '|' + p.hits + '|' + st.stunned + '|' + (p.light > 0.6) + p.crouch + !!p.climb + p.plat;
      if (key !== S.lastKey) {
        S.lastKey = key; P.state.textContent = lab; P.state.style.color = col;
        P.seen.style.width = sv * 100 + '%'; P.seen.style.background = lk > 0 ? '#ff3a2a' : 'linear-gradient(90deg,#ffc21a,#ff7a3d)';
        P.hp.style.width = (2 - p.hits) * 50 + '%'; P.ko.textContent = 'KO ' + st.stunned;
        var left = st.watchers.filter(function (w) { return w.st !== 'out'; }).length; P.left.textContent = 'GOONS ' + left;
        P.where.textContent = (p.climb ? 'ON THE LADDER' : p.light > 0.6 ? 'IN LIGHT' : 'IN SHADOW') + (p.crouch ? ' · CROUCHED' : '');
      }
      var pr = ST.prompt(st), pt = pr ? (pr.kind === 'stun' ? 'STUN ▼' : pr.kind === 'up' ? 'CLIMB ▲' : 'CLIMB ▼') : '';
      if (pt !== S.lastPrompt) { S.lastPrompt = pt; S.prompt.textContent = pt; S.prompt.style.display = pt ? 'block' : 'none'; S.prompt.style.background = pr && pr.kind !== 'stun' ? '#8fe3ff' : '#ffd21f'; }
      S.crouchTag.textContent = p.crouch ? 'CROUCHING' : 'CROUCH'; S.crouchTag.style.color = p.crouch ? '#ffd21f' : '#fff';
      /* the camera: the game's own follow view (as in the fights and the ride), lifted with him when he's up a ladder or on a roof */
      var want = { x: p.x, y: p.y + 6.4, z: p.z + 6.6, lx: p.x, ly: p.y + 1.0, lz: p.z - 2.2, fov: 46 };
      if (!S.cam) S.cam = want; else { var k = 1 - Math.exp(-8 * dt); for (var q in want) S.cam[q] += (want[q] - S.cam[q]) * k; }
      var shot = { x: S.cam.x, y: S.cam.y, z: S.cam.z, lx: S.cam.lx, ly: S.cam.ly, lz: S.cam.lz, fov: S.cam.fov };
      if (S.shake > 0) { S.shake -= dt; var a = S.shake * 0.6; shot.x += Math.sin(S.t * 90) * a; shot.y += Math.sin(S.t * 77) * a; }
      view.followCamera(p.x, p.z, shot);
      view.render();
    },
    exit: function () {}
  };
  function endCard(ctx, d) {
    var BTN = 'display:block;width:100%;margin:10px 0 0;padding:11px;border:2px solid #000;box-shadow:3px 3px 0 #000;font-family:' + FONT + ';font-size:13px;letter-spacing:.1em;cursor:pointer;touch-action:manipulation';
    S.endCard = el('position:fixed;inset:0;z-index:46;display:flex;align-items:center;justify-content:center;background:rgba(3,5,10,.6);font-family:' + FONT + ';color:#fff;padding:16px',
      '<div style="width:min(340px,100%);background:#0d1018;border:3px solid #ffd21f;box-shadow:6px 6px 0 #000;padding:18px;text-align:center;font-size:12px;line-height:1.8">' +
      '<div style="font-size:20px;color:#ffd21f">STAGE CLEAR</div>MEN KNOCKED OUT: ' + d.stunned + '<br>TIMES SPOTTED: ' + d.alarms +
      '<button id="stAgain" style="' + BTN + ';background:#ffd21f;color:#000">PLAY AGAIN</button><button id="stTitle" style="' + BTN + ';background:#fff;color:#000">TITLE</button></div>');
    S.endCard.querySelector('#stAgain').addEventListener('click', function () { ctx.go('stealth'); });
    S.endCard.querySelector('#stTitle').addEventListener('click', function () { ctx.go('title', { menu: true }); });
  }
}

module.exports = { createStealth: createStealth };
