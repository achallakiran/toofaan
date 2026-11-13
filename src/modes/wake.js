/* modes: the New Game opening. Night, in Toofan's bed corner of the underground hideout. He is asleep and the nightmare comes: he tosses, the dream world flashes in
   (the two-headed man dragging Maa through a closed gate toward an old mansion while Toofan runs after them in slow motion and cannot reach her), and he shouts "NOOO MAAA!". Raka trots in, licks his face and barks; Toofan jolts
   awake and sits up, and the player takes over in the hideout (modes/hideout). The dream is its own world (view/dreamview), separate from the title
   video; each dream shot holds long enough to read, with a fade in and out and a line of what is said. Skippable. The room, the dog and the dream are built here and freed
   on the way out. */
'use strict';

var herorig = require('../view/herorig');
var posemath = require('../view/posemath');
var dogvox = require('../view/dogvox');
var dreamview = require('../view/dreamview');
var quiltMod = require('../view/quilt');
var boxmesh = require('../view/boxmesh');
var sfxmod = require('../view/sfx');
var musicMod = require('../view/music');
var kit = require('../sim/arenakit');
var hideout = require('../sim/hideoutgen');
var hideoutview = require('../view/hideoutview');
var rngMod = require('../core/rng');
var CONFIG = require('../data/config');

var ARM0 = { sx: 19, sz: -16, e: 14, w: 0 };   /* his arms asleep: lying on top of the quilt, hands resting on his stomach (found by search: forearms ~3 cm clear of it) */
function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* the room is Toofan's hideout (sim/hideoutgen): the same layout the hideout hub uses, framed on his bed corner */

function createWake() {
  var S = {};
  var M = {
    name: 'wake',
    enter: function (ctx, scope, args) {
      var view = ctx.view;
      view.setSky('#05070c', false); ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = true;
      S.t = 0; S.last = 0; S.done = false; S.next = (args && args.next) || 'hideout'; S.flashes = 0; S.barked = 0; S.scream = false;
      S.sfx = sfxmod.createSfx(); S.music = musicMod.createMusic(S.sfx); S.music.stop(0.8); S.nightOn = false;   /* the title song stops; the nightmare has its own sound */ ctx.debug.wake = S;
      /* the room */
      S.hide = hideoutview.createHideout(view, hideout.build(7));           /* the hideout: dark, screens and blinking racks */
      S.roomMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      S.key = new THREE.PointLight(0xbfd0ff, 1.1, 4.5, 1.4); S.key.position.set(1.4, 2.0, 0.4); view.scene.add(S.key);   /* a soft cool key on the bed so we can see him */
      /* Toofan asleep: a holder turns his standing rig to lie on his back along the bed, head on the pillow */
      S.rig = herorig.createHeroRig('home'); S.bed = new THREE.Group(); S.lie = new THREE.Group(); view.scene.add(S.bed); S.bed.add(S.lie); S.lie.add(S.rig.root);
      S.bed.rotation.y = Math.PI / 2; S.bed.position.set(0.75, 0, -1.1);
      S.rig.guitar.visible = false;                                         /* no guitar in bed */
      /* his blanket: a patterned quilt draped over him (view/quilt) - up to his chest while he sleeps, his arms resting on top; over his
         legs once he sits up. It takes his shape every frame, so nothing of him goes through it. */
      S.quiltLie = quiltMod.createQuilt(view.scene, { x0: -0.56, x1: 1.08, z0: -1.64, z1: -0.56 });
      S.quiltSit = quiltMod.createQuilt(view.scene, { x0: -0.32, x1: 1.08, z0: -1.64, z1: -0.56, sitting: true }); S.quiltSit.visible = false;
      S.lie.rotation.set(-Math.PI / 2, 0, Math.PI / 2, 'XYZ');                 /* on his back: head toward the pillow (-x), chest up */
      S.lie.position.set(0, 0.68, 0);
      /* Raka, asleep by the door at first */
      S.dog = dogvox.createDog(); view.scene.add(S.dog.root); S.dog.root.position.set(3.4, 0, 0.35); S.dog.root.rotation.y = -Math.PI / 2;
      /* moonlight and a night tint over everything (the text stays bright) */
      var tint = document.createElement('div'); tint.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;background:radial-gradient(ellipse at 45% 40%,rgba(0,0,0,0) 35%,rgba(2,4,12,.6));transition:background .4s';
      document.body.appendChild(tint); S.tint = tint;
      var red = document.createElement('div'); red.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;background:#000;opacity:0'; document.body.appendChild(red); S.red = red;
      var word = document.createElement('div'); word.className = 'comic';
      word.style.cssText = 'position:fixed;left:0;right:0;top:34%;z-index:41;text-align:center;pointer-events:none;font:900 clamp(40px,11vw,120px)/1 "Arial Black",Impact,sans-serif;color:#fff;-webkit-text-stroke:3px #000;text-shadow:6px 6px 0 #b0102a;opacity:0;transform:scale(.6) rotate(-4deg);transition:opacity .12s,transform .18s';
      word.textContent = 'NOOO MAAA!'; document.body.appendChild(word); S.word = word;
      /* the dream's lines: a shout burst (a jagged balloon) over whoever is shouting, big, popping again and again and shaking, so it reads as a scream */
      var cap = document.createElement('div'), pts = [], q;
      for (q = 0; q < 22; q++) { var an = q / 22 * Math.PI * 2, rr = q % 2 ? 36 + (q * 37 % 7) : 50; pts.push((50 + Math.cos(an) * rr).toFixed(1) + ',' + (50 + Math.sin(an) * rr).toFixed(1)); }
      cap.style.cssText = 'position:fixed;left:0;top:0;z-index:41;pointer-events:none;opacity:0;will-change:transform';
      cap.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;left:-34%;top:-62%;width:168%;height:224%;overflow:visible">' +
        '<polygon points="' + pts.join(' ') + '" fill="#fff4e2" stroke="#1a0004" stroke-width="2.6" vector-effect="non-scaling-stroke" stroke-linejoin="miter"/></svg>' +
        '<span style="position:relative;display:block;white-space:nowrap;font-size:clamp(28px,8.5vw,64px);line-height:1;letter-spacing:.06em;color:#c0102a;text-shadow:3px 3px 0 #1a0004"></span>';
      document.body.appendChild(cap); S.cap = cap; S.capText = cap.lastChild; S.capLine = '';
      var blackout = document.createElement('div'); blackout.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:#000;opacity:0'; document.body.appendChild(blackout); S.black = blackout;
      var skip = document.createElement('button'); skip.textContent = '[ SKIP ▸▸ ]'; skip.setAttribute('data-ok', '1');
      skip.style.cssText = 'position:fixed;z-index:46;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));padding:9px 14px;border-radius:4px;border:1px solid rgba(140,255,156,.5);background:rgba(0,0,0,.6);color:#bdf5c6;font-size:13px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
      skip.addEventListener('click', function (e) { e.stopPropagation(); finish(); }); document.body.appendChild(skip);
      function finish() { if (S.done) return; S.done = true; ctx.go(S.next, S.next === 'hideout' ? { from: 'bed' } : undefined); }
      S.finish = finish;
      S.renderOnce = function () { S.noDraw = true; S.last = ctx.now(); M.render(ctx); S.noDraw = false; };   /* (tools: pose everything at S.t without drawing) */
      S.dream = dreamview.createDream(view.renderer);
      scope.add(function () {
        S.quiltLie.dispose(); S.quiltSit.dispose();
        S.hide.dispose(); S.roomMat.dispose(); view.scene.remove(S.key); view.scene.remove(S.bed); if (S.rig.root.parent) S.rig.root.parent.remove(S.rig.root);   /* (he is moved out of the bed group when he sits up: take him away wherever he is) */ view.scene.remove(S.dog.root); S.dog.dispose();
        S.dream.dispose(); ctx.view.holdLook(false); tint.remove(); red.remove(); word.remove(); skip.remove(); cap.remove(); blackout.remove();
      });
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var t = S.t, rig = S.rig, view = ctx.view, sleepP = posemath.named('stand'), shot;
      if (t > 1.0 && !S.nightOn) { S.nightOn = true; S.music.play('night'); }
      /* the timeline: three dream shots, each faded in and out of the room, then the scream, Raka, waking */
      var D0 = 3.5, D1 = D0 + S.dream.LENGTH, SCREAM = D1, DOG = SCREAM + 1.6, LICK = DOG + 1.8, BARK = LICK + 1.2, UP = BARK + 0.4, END = UP + 3.6;   /* the dream: one piece, six shots (view/dreamview) */
      /* ---- Toofan ---- */
      if (t < UP) {
        var restless = t > 2.5 && t < SCREAM + 1.4, hard = t > 8 ? 1 : 0.6, toss = restless ? Math.sin(t * (t > 8 ? 7 : 4)) * hard : 0, scream = t > SCREAM && t < SCREAM + 1.6;
        /* asleep with his arms on top of the quilt, hands resting on his stomach; the tossing is in his head, shoulders and knees */
        var ARM = S.ARM || ARM0;
        var p = posemath.layer(sleepP, { 'armA.sx': scream ? 150 : ARM.sx + toss * 5, 'armB.sx': scream ? 150 : ARM.sx - toss * 5, 'armA.sz': scream ? 20 : ARM.sz, 'armB.sz': scream ? 20 : ARM.sz,
          'armA.e': scream ? 20 : ARM.e, 'armB.e': scream ? 20 : ARM.e, 'armA.w': scream ? 0 : ARM.w, 'armB.w': scream ? 0 : ARM.w,
          'head.ry': toss * 40, 'head.rx': scream ? -25 : 0, 'spine.ry': toss * 12, 'legA.hx': 8 + toss * 10, 'legB.hx': 8 - toss * 10, 'legA.k': 10, 'legB.k': 10 }, 1, 1, 1, 1);
        rig.applyPose(p, { plant: false }); S.lie.rotation.z = 0; S.lie.position.y = 0.68 + Math.abs(toss) * 0.03 + Math.sin(t * 1.6) * 0.005;
        S.quiltLie.update(rig);
      } else {
        /* jolted awake: sitting up in bed, legs along it, turning to the dog, catching his breath */
        if (S.rig.root.parent !== view.scene) { view.scene.add(S.rig.root); S.rig.root.rotation.set(0, Math.PI / 2, 0); S.rig.root.position.set(-0.55, -0.32, -1.1); S.lie.visible = false; S.quiltLie.visible = false; S.quiltSit.visible = true; }
        var u = ease((t - UP) / 1.2), br = Math.sin(t * 5) * (1 - ease((t - UP) / 3));
        rig.applyPose(posemath.layer(sleepP, { 'legA.hx': 88, 'legB.hx': 88, 'legA.k': 6, 'legB.k': 6, 'spine.rx': 8 - u * 6 + br * 4, 'head.ry': -55 * u, 'neck.ry': -20 * u,
          'armA.sx': 20 + 40 * u, 'armA.e': 30 + 40 * u, 'armB.sx': -10, 'armB.sz': 25, 'armB.e': 20 }, 1, 1, 1, 1), { plant: false });
        S.quiltSit.update(rig);
      }
      rig.flutter(t, 0);
      /* ---- Raka ---- */
      var D = S.dog, dx;
      if (t < SCREAM + 0.35) D.pose('sleep', t);
      else if (t < DOG) D.pose('sit', t);                                     /* the shout wakes him: head up, ears up, looking at the bed */
      else if (t < LICK) { var w = ease((t - DOG) / (LICK - DOG)); dx = lerp(3.4, 1.15, w); D.root.position.set(dx, 0, lerp(0.35, -0.2, w)); D.root.rotation.y = -Math.PI / 2 - 0.4 * w; D.pose(w < 1 ? 'walk' : 'stand', t); }
      else if (t < BARK) { D.root.position.set(-0.5, 0, -0.32); D.root.rotation.y = Math.PI; D.pose('lick', t); }
      else { D.pose(t < BARK + 1.8 ? 'bark' : 'sit', t); [0.05, 0.55, 1.4].forEach(function (o, i) { if (t > BARK + o && S.barked < i + 1) { S.barked = i + 1; S.sfx.bark(); } }); }
      /* ---- the scream ---- */
      var sw = t > SCREAM && t < SCREAM + 1.7; S.word.style.opacity = sw ? 1 : 0; S.word.style.transform = sw ? 'scale(1) rotate(-4deg)' : 'scale(.6) rotate(-4deg)';
      if (t > SCREAM && !S.scream) { S.scream = true; S.sfx.hit && S.sfx.hit('cross', 1); }
      /* ---- cameras ---- */
      var shake = (t > SCREAM && t < SCREAM + 1.5) ? 0.04 : 0, sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
      if (t < 2.5) shot = { x: 2.3 - t * 0.12, y: 1.9, z: 1.8, lx: -0.2, ly: 0.6, lz: -1.1, fov: 52 };
      else if (t < DOG) { var c = ease((t - 2.5) / 12); shot = { x: lerp(1.4, 0.2, c) + sx, y: lerp(1.8, 1.55, c) + sy, z: lerp(0.4, -0.4, c), lx: -0.65, ly: 0.7, lz: -1.1, fov: lerp(50, 40, c) }; }
      else if (t < LICK) {
        /* wide, from the room side past the foot of the bed: Toofan thrashing in bed and Raka by the door in the same frame - he lifts
           his head at the shout, gets up and trots across to the bed (the camera stays on this side of the two of them from here on) */
        var wk = ease((t - (SCREAM + 1.0)) / (LICK - SCREAM - 1.0)), tk = view.renderer.domElement.clientHeight > view.renderer.domElement.clientWidth ? 1.55 : 1;
        shot = { x: lerp(1.6, 1.2, wk), y: 1.85 + 0.5 * (tk - 1), z: 2.7 * tk, lx: lerp(1.3, 0.4, wk), ly: 0.55, lz: -0.45, fov: 52 };
      }
      else if (t < UP) shot = { x: 1.55, y: 1.6, z: 0.45, lx: -0.6, ly: 0.62, lz: -0.85, fov: 50 };   /* closer, both in frame: his paws on the bed, the lick, Toofan's face */
      else shot = { x: 0.9, y: 1.5, z: 1.5, lx: -0.5, ly: 0.9, lz: -0.8, fov: 48 };
      view.followCamera(0, 0, shot);
      /* ---- the dream: each shot fades up from black, holds, says its line, fades back to the room ---- */
      var dreamOn = t > D0 && t < D1, fadeB = Math.max(0, 1 - Math.abs(t - D0) / 0.45, 1 - Math.abs(t - D1) / 0.45);
      fadeB = Math.max(fadeB, t > END - 0.9 ? ease((t - (END - 0.9)) / 0.8) : 0);
      S.black.style.opacity = Math.max(0, fadeB).toFixed(3);
      view.holdLook(dreamOn && fadeB < 1);                                   /* (the dream keeps its own look; the room takes the game's) */
      var line = dreamOn ? S.dream.caption(t - D0) : '';
      if (line) {
        if (line !== S.capLine) { S.capText.textContent = line; S.capLine = line; }
        var sp = S.dream.speaker(t - D0), cw = S.cap.offsetWidth, ch = S.cap.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
        var pop = sp.t % 0.85, n = Math.min(3, Math.floor(sp.t / 0.85)), fit = Math.min(1, vw * 0.9 / (cw * 1.68 * 1.38)), sc = fit * (1 + n * 0.06) * (pop < 0.12 ? 0.55 + pop / 0.12 * 0.65 : 1 + 0.2 * Math.exp(-(pop - 0.12) * 7));   /* it bursts out again each time she (he) screams, a little bigger */
        var amp = 2.5 + n * 0.8, jx = (Math.random() - 0.5) * amp * 2, jy = (Math.random() - 0.5) * amp * 2, rot = (sp.maa ? -5 : 5) + (Math.random() - 0.5) * 3;
        var mx = cw * 0.84 * sc + 10, my = ch * 1.12 * sc + 10;                 /* (the balloon spreads past the words: keep all of it on screen) */
        var cx = Math.min(vw - mx, Math.max(mx, sp.x * vw)), cy = Math.min(vh * 0.62, Math.max(my + 44, sp.y * vh - ch * 1.3 * sc));   /* (below the sound buttons) */
        S.cap.style.transform = 'translate(' + (cx - cw / 2 + jx).toFixed(1) + 'px,' + (cy - ch / 2 + jy).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')';
      } else S.capLine = '';
      S.cap.style.opacity = line ? 1 : 0;
      S.red.style.opacity = t > SCREAM && t < SCREAM + 1.4 ? 0.25 + 0.2 * Math.sin(t * 30) : 0;
      S.red.style.background = t > UP - 0.1 && t < UP + 0.15 ? '#fff' : '#b0102a';
      if (t > UP - 0.1 && t < UP + 0.15) S.red.style.opacity = 0.85;
      S.tint.style.opacity = dreamOn ? 0 : 1; S.hide.update(t);
      if (S.noDraw) return;
      if (dreamOn) S.dream.render(t - D0); else view.render();
      /* ---- awake: the player takes over in the hideout ---- */
      if (t > END) S.finish();
    },
    exit: function () {}
  };
  return M;
}

module.exports = { createWake: createWake };
