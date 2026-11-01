/* modes: the New Game opening. Night, in Toofan's room. He is asleep and the nightmare comes: he tosses, the dream world flashes in
   (the opening video's colours and silhouettes), and he shouts "NOOO MAAA!". Raka trots in, licks his face and barks; Toofan jolts
   awake and sits up. A card, and the game rides out into the city. Skippable. The room, the dog and the dream are built here and freed
   on the way out. */
'use strict';

var herorig = require('../view/herorig');
var posemath = require('../view/posemath');
var dogvox = require('../view/dogvox');
var intro = require('../view/intro');
var boxmesh = require('../view/boxmesh');
var cinecard = require('../view/cinecard');
var sfxmod = require('../view/sfx');
var musicMod = require('../view/music');
var kit = require('../sim/arenakit');
var rngMod = require('../core/rng');
var CONFIG = require('../data/config');

function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* the room: plank floor, plastered walls, the bed, a window with the moon, a guitar on the wall, dumbbells, a rug, the door Raka comes in by */
function room() {
  var K = kit.createBuilder(rngMod.createRng(11)), C = kit.C, P = kit.P, x, z, k;
  K.at(0, 0, 0);
  for (x = -2.6; x < 2.6; x += 0.32) K.b(x, 0, -2.4, x + 0.3, 0.02, 2.4, (Math.round(x * 3) % 2) ? C.WOOD : C.WOOD2);   /* floor planks */
  K.b(-2.6, 0, -2.5, 2.6, 3.0, -2.4, C.W_TURQ); K.b(-2.6, 0, -2.5, 2.6, 0.12, -2.38, C.WOOD2);                       /* back wall + skirting */
  K.b(-2.7, 0, -2.5, -2.6, 3.0, 2.4, C.W_TURQ);                                                                      /* left wall */
  K.b(2.6, 0, -2.5, 2.7, 3.0, -0.2, C.W_TURQ); K.b(2.6, 0, 0.9, 2.7, 3.0, 2.4, C.W_TURQ); K.b(2.6, 2.2, -0.2, 2.7, 3.0, 0.9, C.W_TURQ);   /* right wall with the door gap */
  K.b(2.58, 0, -0.26, 2.72, 2.26, -0.2, C.WOOD2); K.b(2.58, 0, 0.9, 2.72, 2.26, 0.96, C.WOOD2); K.b(2.58, 2.2, -0.26, 2.72, 2.26, 0.96, C.WOOD2);
  /* the window and the moon outside */
  K.b(-0.7, 1.3, -2.41, 0.7, 2.4, -2.39, C.NAVY); K.b(-0.04, 1.3, -2.39, 0.04, 2.4, -2.37, C.WOOD2); K.b(-0.7, 1.84, -2.39, 0.7, 1.9, -2.37, C.WOOD2);
  K.b(-0.78, 1.22, -2.4, 0.78, 1.3, -2.3, C.WOOD); K.b(0.25, 1.95, -2.405, 0.5, 2.2, -2.395, C.OFFWHITE);
  for (k = 0; k < 6; k++) K.b(-0.68 + k * 0.25, 1.3, -2.385, -0.64 + k * 0.25, 2.4, -2.375, C.DARK);                   /* the grille */
  /* the bed: frame, mattress, pillow, a tangled sheet */
  K.b(-1.1, 0, -1.7, 1.1, 0.35, -0.5, C.WOOD2); K.b(-1.15, 0, -1.75, -1.0, 0.95, -0.45, C.WOOD2);
  K.b(-1.05, 0.35, -1.65, 1.05, 0.55, -0.55, C.OFFWHITE); K.b(-1.0, 0.55, -1.5, -0.7, 0.68, -0.7, C.W_CREAM);
  K.b(-0.2, 0.55, -1.66, 1.05, 0.6, -0.54, C.MAUVE); K.b(0.6, 0.35, -0.56, 1.05, 0.62, -0.5, C.MAUVE);
  /* the side table, a lamp, a rug, dumbbells, a guitar on the wall, a poster */
  K.b(-1.75, 0, -1.6, -1.25, 0.55, -1.1, C.WOOD); K.b(-1.6, 0.55, -1.45, -1.45, 0.6, -1.3, C.BRASS); K.b(-1.56, 0.6, -1.41, -1.49, 0.85, -1.34, C.BRASS); K.b(-1.66, 0.85, -1.5, -1.39, 1.0, -1.25, C.LEMON);
  K.b(-1.3, 0.005, -0.3, 1.3, 0.025, 0.9, C.CRIMSON); K.b(-1.2, 0.025, -0.2, 1.2, 0.03, 0.8, C.MARIGOLD);
  K.b(1.6, 0, 0.6, 2.2, 0.1, 0.7, C.STEEL); K.b(1.6, 0, 0.5, 1.7, 0.2, 0.8, C.CHAR); K.b(2.1, 0, 0.5, 2.2, 0.2, 0.8, C.CHAR);
  K.b(1.2, 1.1, -2.39, 1.45, 2.1, -2.36, C.CRIMSON); K.b(1.29, 2.1, -2.39, 1.36, 2.7, -2.36, C.WOOD2); K.b(1.25, 2.6, -2.39, 1.4, 2.8, -2.36, C.BLACK);   /* the guitar */
  K.b(-2.38, 1.2, -1.6, -2.36, 2.3, -0.4, C.MAGENTA); K.b(-2.36, 1.4, -1.4, -2.35, 2.1, -0.6, C.LEMON);                                              /* the poster */
  return K.out.boxes;
}

function createWake() {
  var S = {};
  return {
    name: 'wake',
    enter: function (ctx, scope, args) {
      var view = ctx.view;
      view.setSky('#05070c', false); ctx.hudRoot.hidden = true; ctx.touchRoot.hidden = true;
      S.t = 0; S.last = 0; S.done = false; S.next = (args && args.next) || 'ride'; S.flashes = 0; S.barked = 0; S.scream = false;
      S.sfx = sfxmod.createSfx(); S.music = musicMod.createMusic(S.sfx); S.music.setTrack('thappad'); ctx.debug.wake = S;
      /* the room */
      var a = boxmesh.boxesToArrays(room(), CONFIG.PALETTE), g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
      g.setAttribute('color', new THREE.BufferAttribute(a.colors, 3)); g.setIndex(new THREE.BufferAttribute(a.indices, 1));
      S.roomMat = new THREE.MeshLambertMaterial({ vertexColors: true }); S.room = new THREE.Mesh(g, S.roomMat); view.scene.add(S.room);
      /* Toofan asleep: a holder turns his standing rig to lie on his back along the bed, head on the pillow */
      S.rig = herorig.createHeroRig(); S.bed = new THREE.Group(); S.lie = new THREE.Group(); view.scene.add(S.bed); S.bed.add(S.lie); S.lie.add(S.rig.root);
      S.bed.rotation.y = Math.PI / 2; S.bed.position.set(0.75, 0, -1.1);
      S.lie.rotation.set(-Math.PI / 2, 0, Math.PI / 2, 'XYZ');                 /* on his back: head toward the pillow (-x), chest up */
      S.lie.position.set(0, 0.68, 0);
      /* Raka, asleep by the door at first */
      S.dog = dogvox.createDog(); view.scene.add(S.dog.root); S.dog.root.position.set(3.4, 0, 0.35); S.dog.root.rotation.y = -Math.PI / 2;
      /* moonlight and a night tint over everything (the text stays bright) */
      var tint = document.createElement('div'); tint.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;background:radial-gradient(ellipse at 45% 35%,rgba(40,70,140,.28),rgba(4,8,22,.72));transition:background .4s';
      document.body.appendChild(tint); S.tint = tint;
      var red = document.createElement('div'); red.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;background:#000;opacity:0'; document.body.appendChild(red); S.red = red;
      var word = document.createElement('div'); word.className = 'comic';
      word.style.cssText = 'position:fixed;left:0;right:0;top:34%;z-index:41;text-align:center;pointer-events:none;font:900 clamp(40px,11vw,120px)/1 "Arial Black",Impact,sans-serif;color:#fff;-webkit-text-stroke:3px #000;text-shadow:6px 6px 0 #b0102a;opacity:0;transform:scale(.6) rotate(-4deg);transition:opacity .12s,transform .18s';
      word.textContent = 'NOOO MAAA!'; document.body.appendChild(word); S.word = word;
      var skip = document.createElement('button'); skip.textContent = '[ SKIP ▸▸ ]'; skip.setAttribute('data-ok', '1');
      skip.style.cssText = 'position:fixed;z-index:46;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));padding:9px 14px;border-radius:4px;border:1px solid rgba(140,255,156,.5);background:rgba(0,0,0,.6);color:#bdf5c6;font-size:13px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
      skip.addEventListener('click', function (e) { e.stopPropagation(); finish(); }); document.body.appendChild(skip);
      function finish() { if (S.done) return; S.done = true; ctx.go(S.next); }
      S.finish = finish;
      S.dream = intro.createIntro(view.renderer);
      scope.add(function () {
        view.scene.remove(S.room); g.dispose(); S.roomMat.dispose(); view.scene.remove(S.bed); view.scene.remove(S.dog.root); S.dog.dispose();
        S.dream.dispose(); tint.remove(); red.remove(); word.remove(); skip.remove();
      });
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var t = S.t, rig = S.rig, view = ctx.view, sleepP = posemath.named('stand'), shot;
      /* ---- Toofan ---- */
      if (t < 9.6) {
        var toss = t > 1.2 && t < 6.2 ? Math.sin(t * (t > 3.5 ? 9 : 5)) * (t > 3.5 ? 1 : 0.6) : 0, scream = t > 4.8 && t < 6.2;
        var p = posemath.layer(sleepP, { 'armA.sx': scream ? 150 : 10 + toss * 25, 'armB.sx': scream ? 150 : 10 - toss * 25, 'armA.sz': 20, 'armB.sz': 20, 'armA.e': scream ? 20 : 40, 'armB.e': scream ? 20 : 40,
          'head.ry': toss * 40, 'head.rx': scream ? -25 : 0, 'spine.ry': toss * 12, 'legA.hx': 8 + toss * 10, 'legB.hx': 8 - toss * 10, 'legA.k': 10, 'legB.k': 10 }, 1, 1, 1, 1);
        rig.applyPose(p, { plant: false }); S.lie.rotation.z = 0; S.lie.position.y = 0.68 + Math.abs(toss) * 0.03 + Math.sin(t * 1.6) * 0.005;
      } else {
        /* jolted awake: sitting up in bed, legs along it, turning to the dog */
        if (S.rig.root.parent !== view.scene) { view.scene.add(S.rig.root); S.rig.root.rotation.set(0, Math.PI / 2, 0); S.rig.root.position.set(-0.55, -0.32, -1.1); S.lie.visible = false; }
        var u = ease((t - 9.6) / 1.2);
        rig.applyPose(posemath.layer(sleepP, { 'legA.hx': 88, 'legB.hx': 88, 'legA.k': 6, 'legB.k': 6, 'spine.rx': 8 - u * 6, 'head.ry': -55 * u, 'neck.ry': -20 * u,
          'armA.sx': 20 + 40 * u, 'armA.e': 30 + 40 * u, 'armB.sx': -10, 'armB.sz': 25, 'armB.e': 20 }, 1, 1, 1, 1), { plant: false });
      }
      rig.flutter(t, 0);
      /* ---- Raka ---- */
      var D = S.dog, dx;
      if (t < 6.2) D.pose('sleep', t);
      else if (t < 8.0) { var w = ease((t - 6.2) / 1.8); dx = lerp(3.4, 1.15, w); D.root.position.set(dx, 0, lerp(0.35, -0.2, w)); D.root.rotation.y = -Math.PI / 2 - 0.4 * w; D.pose(w < 1 ? 'walk' : 'stand', t); }
      else if (t < 9.2) { D.root.position.set(-0.5, 0, -0.32); D.root.rotation.y = Math.PI; D.pose('lick', t); }
      else { D.pose(t < 11 ? 'bark' : 'sit', t); if (t > 9.25 && S.barked < 1) { S.barked = 1; S.sfx.bark(); } if (t > 9.75 && S.barked < 2) { S.barked = 2; S.sfx.bark(); } if (t > 10.6 && S.barked < 3) { S.barked = 3; S.sfx.bark(); } }
      /* ---- the scream ---- */
      var sw = t > 4.8 && t < 6.4; S.word.style.opacity = sw ? 1 : 0; S.word.style.transform = sw ? 'scale(1) rotate(-4deg)' : 'scale(.6) rotate(-4deg)';
      if (t > 4.8 && !S.scream) { S.scream = true; S.sfx.hit && S.sfx.hit('cross', 1); }
      /* ---- cameras ---- */
      var shake = (t > 4.8 && t < 6.2) ? 0.04 : 0, sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
      if (t < 1.2) shot = { x: 2.3 - t * 0.15, y: 1.9, z: 1.8, lx: -0.2, ly: 0.6, lz: -1.1, fov: 52 };
      else if (t < 6.2) { var c = ease((t - 1.2) / 3); shot = { x: lerp(1.4, 0.2, c) + sx, y: lerp(1.8, 1.55, c) + sy, z: lerp(0.4, -0.4, c), lx: -0.65, ly: 0.7, lz: -1.1, fov: lerp(50, 40, c) }; }
      else if (t < 8.0) shot = { x: 1.0, y: 1.3, z: 1.7, lx: 1.4, ly: 0.4, lz: -0.2, fov: 55 };
      else if (t < 9.6) shot = { x: -0.2, y: 1.25, z: 0.6, lx: -0.7, ly: 0.65, lz: -0.9, fov: 46 };
      else shot = { x: 0.9, y: 1.5, z: 1.5, lx: -0.5, ly: 0.9, lz: -0.8, fov: 48 };
      view.followCamera(0, 0, shot);
      /* ---- the dream breaking in: short cuts to the opening video's world ---- */
      var dreamOn = t > 1.6 && t < 4.8 && (t * 10 % 7) < (t > 3.4 ? 2.4 : 1.2);
      S.red.style.opacity = t > 4.8 && t < 6.2 ? 0.25 + 0.2 * Math.sin(t * 30) : (t > 9.5 && t < 9.7 ? 0 : 0);
      S.red.style.background = t > 9.5 && t < 9.75 ? '#fff' : '#b0102a';
      if (t > 9.5 && t < 9.75) S.red.style.opacity = 0.85;
      S.tint.style.opacity = dreamOn ? 0 : 1;
      if (dreamOn) { S.dream.render(16 + (t * 7) % 40, t); } else { S.dream.hide(); view.render(); }
      /* ---- the card, then out into the city ---- */
      if (t > 11.6 && !S.card) { S.card = true; cinecard.show({ title: 'UTH JA, TOOFAN', sub: 'SHEHAR SO RAHA HAI. GANG NAHI.', ms: 2600 }); }
      if (t > 13.9) S.finish();
    },
    exit: function () {}
  };
}

module.exports = { createWake: createWake };
