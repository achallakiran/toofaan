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
var boxmesh = require('../view/boxmesh');
var sfxmod = require('../view/sfx');
var musicMod = require('../view/music');
var kit = require('../sim/arenakit');
var hideout = require('../sim/hideoutgen');
var hideoutview = require('../view/hideoutview');
var rngMod = require('../core/rng');
var CONFIG = require('../data/config');

function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* the room is Toofan's hideout (sim/hideoutgen): the same layout the hideout hub uses, framed on his bed corner */

function createWake() {
  var S = {};
  return {
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
      /* his blanket: a patterned quilt pulled up to his chest while he sleeps, bunched over his legs once he sits up */
      function quilt(sit) {
        var K = kit.createBuilder(rngMod.createRng(sit ? 5 : 4)), C = kit.C, x, z, k = 0; K.at(0, 0, 0);
        var x0 = sit ? -0.32 : -0.5, top = sit ? 0.78 : 0.86;
        for (x = x0; x < 1.08; x += 0.16) for (z = -1.64; z < -0.56; z += 0.16) {
          var edge = Math.min(z + 1.64, -0.56 - z), lump = Math.sin(x * 9 + z * 5) * 0.025 + (sit ? Math.max(0, 0.08 - Math.abs(x - 0.1) * 0.2) : 0);
          var y1 = edge < 0.12 ? 0.42 + edge * 2.6 : top + lump - (x > 0.85 ? (x - 0.85) * 0.6 : 0);
          K.b(x, 0.4, z, x + 0.16, y1, z + 0.16, ((Math.round(x / 0.16) + Math.round(z / 0.16)) % 2) ? C.MAUVE : C.PLUM); k++;
        }
        K.b(x0 - 0.06, top - 0.06, -1.6, x0 + 0.06, top + 0.05, -0.6, C.OFFWHITE);           /* the folded-over sheet at the top */
        var a2 = boxmesh.boxesToArrays(K.out.boxes, CONFIG.PALETTE), g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.BufferAttribute(a2.positions, 3)); g2.setAttribute('normal', new THREE.BufferAttribute(a2.normals, 3));
        g2.setAttribute('color', new THREE.BufferAttribute(a2.colors, 3)); g2.setIndex(new THREE.BufferAttribute(a2.indices, 1));
        return new THREE.Mesh(g2, S.roomMat);
      }
      S.quiltLie = quilt(false); S.quiltSit = quilt(true); S.quiltSit.visible = false; view.scene.add(S.quiltLie); view.scene.add(S.quiltSit);
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
      var cap = document.createElement('div');
      cap.style.cssText = 'position:fixed;left:0;right:0;bottom:16%;z-index:41;text-align:center;pointer-events:none;color:#ffd9d0;font-size:clamp(16px,4.4vw,26px);letter-spacing:.18em;text-shadow:0 0 10px #000,0 2px 2px #000;opacity:0;transition:opacity .5s';
      document.body.appendChild(cap); S.cap = cap;
      var blackout = document.createElement('div'); blackout.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:#000;opacity:0'; document.body.appendChild(blackout); S.black = blackout;
      var skip = document.createElement('button'); skip.textContent = '[ SKIP ▸▸ ]'; skip.setAttribute('data-ok', '1');
      skip.style.cssText = 'position:fixed;z-index:46;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));padding:9px 14px;border-radius:4px;border:1px solid rgba(140,255,156,.5);background:rgba(0,0,0,.6);color:#bdf5c6;font-size:13px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
      skip.addEventListener('click', function (e) { e.stopPropagation(); finish(); }); document.body.appendChild(skip);
      function finish() { if (S.done) return; S.done = true; ctx.go(S.next, S.next === 'hideout' ? { from: 'bed' } : undefined); }
      S.finish = finish;
      S.dream = dreamview.createDream(view.renderer);
      scope.add(function () {
        view.scene.remove(S.quiltLie); view.scene.remove(S.quiltSit); S.quiltLie.geometry.dispose(); S.quiltSit.geometry.dispose();
        S.hide.dispose(); S.roomMat.dispose(); view.scene.remove(S.key); view.scene.remove(S.bed); if (S.rig.root.parent) S.rig.root.parent.remove(S.rig.root);   /* (he is moved out of the bed group when he sits up: take him away wherever he is) */ view.scene.remove(S.dog.root); S.dog.dispose();
        S.dream.dispose(); tint.remove(); red.remove(); word.remove(); skip.remove(); cap.remove(); blackout.remove();
      });
    },
    step: function () {},
    render: function (ctx) {
      var now = ctx.now(), dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 1 / 60; S.last = now; S.t += dt;
      var t = S.t, rig = S.rig, view = ctx.view, sleepP = posemath.named('stand'), shot;
      if (t > 1.0 && !S.nightOn) { S.nightOn = true; S.music.play('night'); }
      /* the timeline: three dream shots, each faded in and out of the room, then the scream, Raka, waking */
      var DREAM = [[3.5, 7.5], [8.6, 12.6], [13.7, 16.6]], SCREAM = 16.6, DOG = 18.2, LICK = 20.0, BARK = 21.2, UP = 21.6, END = 25.2;
      var LINES = ['BETA... TOOFAN...', 'MAA!', 'MAA... RUKO!'];
      /* ---- Toofan ---- */
      if (t < UP) {
        var restless = t > 2.5 && t < SCREAM + 1.4, hard = t > 8 ? 1 : 0.6, toss = restless ? Math.sin(t * (t > 8 ? 7 : 4)) * hard : 0, scream = t > SCREAM && t < SCREAM + 1.6;
        var p = posemath.layer(sleepP, { 'armA.sx': scream ? 150 : 10 + toss * 25, 'armB.sx': scream ? 150 : 10 - toss * 25, 'armA.sz': 20, 'armB.sz': 20, 'armA.e': scream ? 20 : 40, 'armB.e': scream ? 20 : 40,
          'head.ry': toss * 40, 'head.rx': scream ? -25 : 0, 'spine.ry': toss * 12, 'legA.hx': 8 + toss * 10, 'legB.hx': 8 - toss * 10, 'legA.k': 10, 'legB.k': 10 }, 1, 1, 1, 1);
        rig.applyPose(p, { plant: false }); S.lie.rotation.z = 0; S.lie.position.y = 0.68 + Math.abs(toss) * 0.03 + Math.sin(t * 1.6) * 0.005;
        S.quiltLie.position.set(0, Math.abs(toss) * 0.02, toss * 0.03); S.quiltLie.rotation.x = toss * 0.02;
      } else {
        /* jolted awake: sitting up in bed, legs along it, turning to the dog, catching his breath */
        if (S.rig.root.parent !== view.scene) { view.scene.add(S.rig.root); S.rig.root.rotation.set(0, Math.PI / 2, 0); S.rig.root.position.set(-0.55, -0.32, -1.1); S.lie.visible = false; S.quiltLie.visible = false; S.quiltSit.visible = true; }
        var u = ease((t - UP) / 1.2), br = Math.sin(t * 5) * (1 - ease((t - UP) / 3));
        rig.applyPose(posemath.layer(sleepP, { 'legA.hx': 88, 'legB.hx': 88, 'legA.k': 6, 'legB.k': 6, 'spine.rx': 8 - u * 6 + br * 4, 'head.ry': -55 * u, 'neck.ry': -20 * u,
          'armA.sx': 20 + 40 * u, 'armA.e': 30 + 40 * u, 'armB.sx': -10, 'armB.sz': 25, 'armB.e': 20 }, 1, 1, 1, 1), { plant: false });
      }
      rig.flutter(t, 0);
      /* ---- Raka ---- */
      var D = S.dog, dx;
      if (t < DOG) D.pose('sleep', t);
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
      else if (t < LICK) shot = { x: 1.0, y: 1.3, z: 1.7, lx: 1.4, ly: 0.4, lz: -0.2, fov: 55 };
      else if (t < UP) shot = { x: -0.2, y: 1.25, z: 0.6, lx: -0.7, ly: 0.65, lz: -0.9, fov: 46 };
      else shot = { x: 0.9, y: 1.5, z: 1.5, lx: -0.5, ly: 0.9, lz: -0.8, fov: 48 };
      view.followCamera(0, 0, shot);
      /* ---- the dream: each shot fades up from black, holds, says its line, fades back to the room ---- */
      var dreamShot = -1, fadeB = 0, k;
      for (k = 0; k < 3; k++) {
        var a0 = DREAM[k][0], a1 = DREAM[k][1];
        if (t > a0 && t < a1) dreamShot = k;
        fadeB = Math.max(fadeB, 1 - Math.abs(t - a0) / 0.45, 1 - Math.abs(t - a1) / 0.45);
      }
      fadeB = Math.max(fadeB, t > END - 0.9 ? ease((t - (END - 0.9)) / 0.8) : 0);
      S.black.style.opacity = Math.max(0, fadeB).toFixed(3);
      var dreamOn = dreamShot >= 0, capOn = dreamOn && t - DREAM[dreamShot][0] > 1.0 && DREAM[dreamShot][1] - t > 0.6;
      if (capOn) S.cap.textContent = LINES[dreamShot]; S.cap.style.opacity = capOn ? 1 : 0;
      S.red.style.opacity = t > SCREAM && t < SCREAM + 1.4 ? 0.25 + 0.2 * Math.sin(t * 30) : 0;
      S.red.style.background = t > UP - 0.1 && t < UP + 0.15 ? '#fff' : '#b0102a';
      if (t > UP - 0.1 && t < UP + 0.15) S.red.style.opacity = 0.85;
      S.tint.style.opacity = dreamOn ? 0 : 1; S.hide.update(t);
      if (dreamOn) S.dream.render(dreamShot, t - DREAM[dreamShot][0]); else view.render();
      /* ---- awake: the player takes over in the hideout ---- */
      if (t > END) S.finish();
    },
    exit: function () {}
  };
}

module.exports = { createWake: createWake };
