/* view: comic lettering for impacts, Raj-Comics style. A bold word pops out at the point of contact, grows as it rises and fades,
   like the sound itself leaving the blow. Three looks: speech bubble, plain bold letters, or off. Hindi (Devanagari) or Latin letters.
   Plain DOM laid over the canvas; positions come from projecting the 3D impact point through the camera. */
'use strict';

/* move / moment -> [Devanagari, Latin, size 0..1] */
var WORDS = {
  jab: ['ढिशूम', 'DISHUM', 0.55], cross: ['ढिशूम', 'DISHUM', 0.65], hook: ['तड़ाक', 'TADAAK', 0.7], hookB: ['तड़ाक', 'TADAAK', 0.7],
  uppercut: ['ढिशूम!!', 'DISHUM!!', 0.95], elbow: ['खट', 'KHAT', 0.5], knee: ['धप', 'DHAP', 0.6], kick: ['धड़ाक', 'DHADAAK', 0.8],
  axeKick: ['भड़ाम', 'BHADAAM', 0.95], roundhouse: ['भड़ाम', 'BHADAAM', 0.95], counterCross: ['पटाक', 'PATAAK', 0.8],
  block: ['ठक', 'THAK', 0.45], thud: ['धप', 'THUD', 0.5], guardbreak: ['कड़ाक!', 'KADAAK!', 0.9], fall: ['धड़ाम!', 'DHADAAM!', 1.15],
  hurt: ['ठाक', 'THAAK', 0.7], boom: ['धमाका!', 'DHAMAAKA!', 1.3], smash: ['ठनन!', 'THANAN!', 1.05], whirl: ['सन्न!', 'SANN!', 0.95],
  twang: ['झन्न', 'JHANN', 0.8], finisher: ['तूफ़ान!', 'TOOFAN!', 1.5]
};
var DEV = ',"Mukta","Hind","Noto Sans Devanagari","Nirmala UI","Mangal","Kohinoor Devanagari","Devanagari Sangam MN",system-ui,sans-serif';
/* looks to try: font, plain-letter fill / outline, bubble fill / text / outline, bubble shape. Fonts are whatever the device has (the game stays offline). */
var STYLES = [
  { id: 'classic', name: 'Classic', font: '"Arial Black","Impact"' + DEV, fill: '#fff', edge: '#111', bg: '#fff', ink: '#111', bedge: '#111', shape: 'oval' },
  { id: 'cartoon', name: 'Cartoon blue', font: '"Comic Sans MS","Chalkboard SE","Marker Felt","Comic Neue","Trebuchet MS"' + DEV, fill: '#2f7bff', edge: '#08184f', bg: '#e6f0ff', ink: '#1b55d9', bedge: '#08184f', shape: 'oval' },
  { id: 'black', name: 'Bold black', font: '"Impact","Haettenschweiler","Arial Narrow Bold","Arial Black"' + DEV, fill: '#000', edge: '#fff', bg: '#ffe14a', ink: '#000', bedge: '#000', shape: 'oval' },
  { id: 'burst', name: 'Burst', font: '"Arial Black","Impact"' + DEV, fill: '#000', edge: '#ffd21f', bg: '#ffd21f', ink: '#000', bedge: '#e5301d', shape: 'burst' },
  { id: 'marker', name: 'Marker', font: '"Marker Felt","Segoe Print","Bradley Hand","Brush Script MT","Comic Sans MS"' + DEV, fill: '#ff3b2f', edge: '#000', bg: '#fff7d6', ink: '#d6200f', bedge: '#000', shape: 'rect' },
  { id: 'wobble', name: 'Wobbly comic', font: '"Comic Sans MS","Chalkboard SE","Marker Felt","Bangers"' + DEV, fill: '#ffd21f', edge: '#000', bg: '#fff', ink: '#111', bedge: '#111', shape: 'oval', irr: true, tall: true },
  { id: 'torn', name: 'Torn tall', font: '"Impact","Haettenschweiler","Arial Narrow Bold","Arial Black"' + DEV, fill: '#000', edge: '#fff', bg: '#ffe14a', ink: '#000', bedge: '#000', shape: 'oval', irr: true, tall: true },
  { id: 'scribble', name: 'Scribble blue', font: '"Marker Felt","Segoe Print","Comic Sans MS","Bradley Hand"' + DEV, fill: '#2f7bff', edge: '#000', bg: '#e6f0ff', ink: '#1b55d9', bedge: '#08184f', shape: 'oval', irr: true, tall: true, alt: '#ffffff' },
  { id: 'rounded', name: 'Rounded', font: '"Arial Rounded MT Bold","Varela Round","Nunito","Verdana"' + DEV, fill: '#111', edge: '#fff', bg: '#fff', ink: '#111', bedge: '#2f7bff', shape: 'oval' }
];
var STACK = '"Mukta","Hind","Noto Sans Devanagari","Nirmala UI","Mangal","Kohinoor Devanagari","Devanagari Sangam MN","Arial Black","Impact",system-ui,sans-serif';

function createLettering() {
  var layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:3;pointer-events:none;overflow:hidden';
  var st = document.createElement('style');
  st.textContent = '@keyframes sfxTall{0%{transform:scale(.6,.35) rotate(var(--r));opacity:0}12%{transform:scale(1.05,1.15) rotate(var(--r));opacity:1}40%{transform:scale(1.1,1.65) rotate(var(--r));opacity:1}100%{transform:translateY(-30px) scale(1.2,2.8) rotate(var(--r));opacity:0}}@keyframes sfxRise{0%{transform:translateY(8px) scale(.45) rotate(var(--r));opacity:0}12%{transform:translateY(0) scale(1.18) rotate(var(--r));opacity:1}38%{transform:translateY(-14px) scale(1.22) rotate(var(--r));opacity:1}100%{transform:translateY(-82px) scale(1.7) rotate(var(--r));opacity:0}}' +
    '.sfxw{transform-origin:50% 100%;position:absolute;white-space:nowrap;font-family:' + STACK + ';font-weight:900;letter-spacing:.02em;animation:sfxRise .8s cubic-bezier(.2,.7,.3,1) forwards}';
  document.head.appendChild(st); document.body.appendChild(layer);
  var mode = 'bubble', script = 'hi', live = 0, flip = 1, uid = 0, si = 0;
  try { mode = localStorage.getItem('toofan.text') || mode; script = localStorage.getItem('toofan.script') || script; si = Math.max(0, Math.min(STYLES.length - 1, +(localStorage.getItem('toofan.style') || 0) || 0)); } catch (e) { }
  var proj = new THREE.Vector3();
  function save() { try { localStorage.setItem('toofan.text', mode); localStorage.setItem('toofan.script', script); localStorage.setItem('toofan.style', String(si)); } catch (e) { } }

  return {
    get mode() { return mode; }, get script() { return script; }, get styleName() { return STYLES[si].name; },
    nextStyle: function () { si = (si + 1) % STYLES.length; save(); return STYLES[si].name; },
    cycleMode: function () { mode = mode === 'bubble' ? 'plain' : (mode === 'plain' ? 'off' : 'bubble'); save(); return mode; },
    toggleScript: function () { script = script === 'hi' ? 'en' : 'hi'; save(); return script; },
    /* word: a key of WORDS; at: world {x,y,z}; camera: the THREE camera; hot: red outline for hard blows */
    say: function (word, at, camera, hot) {
      var w = WORDS[word]; if (!w || mode === 'off' || live >= 3) return;
      proj.set(at.x, at.y, at.z).project(camera);
      if (proj.z > 1) return;
      var W = window.innerWidth, H = window.innerHeight, base = Math.min(W, H);
      var sx = (proj.x * 0.5 + 0.5) * W + flip * (base * 0.07 + Math.random() * base * 0.04), sy = (-proj.y * 0.5 + 0.5) * H - base * 0.07; flip = -flip;
      sx = Math.max(60, Math.min(W - 60, sx)); sy = Math.max(60, Math.min(H - 120, sy));
      var size = Math.round(base * (0.032 + 0.04 * w[2])), el = document.createElement('div'), txt = script === 'hi' ? w[0] : w[1], rot = (Math.random() - 0.5) * 18;
      el.className = 'sfxw'; el.style.left = sx + 'px'; el.style.top = sy + 'px'; el.style.setProperty('--r', rot + 'deg'); el.style.fontSize = size + 'px';
      var S = STYLES[si], edge = hot ? '#c8261b' : S.edge, bedge = hot ? '#c8261b' : S.bedge;
      el.style.fontFamily = S.font;
      if (S.tall) el.style.animationName = 'sfxTall';
      var irr = function (box) {                                  /* hand-lettered: every letter its own size, tilt and height */
        var g = txt.match(/\P{M}\p{M}*/gu) || [txt]; box.textContent = '';
        g.forEach(function (ch, gi) {
          var sp = document.createElement('span'), sc = 0.82 + Math.random() * 0.5, rt = (Math.random() - 0.5) * 26, dy = (Math.random() - 0.5) * 0.28;
          sp.textContent = ch; sp.style.cssText = 'display:inline-block;transform:translateY(' + dy + 'em) rotate(' + rt + 'deg) scale(' + sc + ',' + (sc * (0.95 + Math.random() * 0.45)) + ');margin:0 ' + (Math.random() * 0.03) + 'em' + (S.alt && gi % 2 ? ';color:' + S.alt : '');
          box.appendChild(sp);
        });
      };
      if (mode === 'bubble') {
        var bw = Math.max(2, Math.round(size * 0.07)), pad = Math.round(size * 0.18) + 'px ' + Math.round(size * 0.42) + 'px';
        if (S.shape === 'burst') {                                            /* comic starburst instead of a bubble */
          el.style.cssText += ';padding:' + Math.round(size * 0.5) + 'px ' + Math.round(size * 0.75) + 'px;background:' + S.bg + ';color:' + S.ink + ';clip-path:polygon(50% 0%,60% 18%,80% 6%,78% 28%,100% 30%,86% 46%,100% 62%,78% 66%,84% 90%,62% 80%,50% 100%,40% 80%,18% 92%,22% 68%,0% 62%,14% 46%,0% 30%,22% 28%,20% 6%,40% 18%);filter:drop-shadow(0 3px 0 rgba(0,0,0,.4))';
          el.textContent = txt; if (S.irr) irr(el);
        } else {
          el.style.cssText += ';padding:' + pad + ';background:' + S.bg + ';color:' + S.ink + ';border:' + bw + 'px solid ' + bedge + ';border-radius:' + (S.shape === 'rect' ? '10px' : '50%/62%') + ';box-shadow:0 3px 0 rgba(0,0,0,.35)';
          var tail = document.createElement('i'); tail.style.cssText = 'position:absolute;left:' + (flip > 0 ? '20%' : '68%') + ';bottom:' + -Math.round(size * 0.3) + 'px;width:0;height:0;border-left:' + Math.round(size * 0.14) + 'px solid transparent;border-right:' + Math.round(size * 0.14) + 'px solid transparent;border-top:' + Math.round(size * 0.34) + 'px solid ' + bedge;
          el.textContent = txt; if (S.irr) irr(el); el.appendChild(tail);
        }
      } else {
        el.style.color = hot && S.id !== 'black' ? '#ffd23a' : S.fill; el.style.webkitTextStroke = Math.max(2, Math.round(size * 0.1)) + 'px ' + edge; el.style.paintOrder = 'stroke fill'; el.style.textShadow = '0 3px 0 rgba(0,0,0,.45)'; el.textContent = txt; if (S.irr) irr(el);
      }
      layer.appendChild(el); live++;
      setTimeout(function () { el.remove(); live--; }, 820);
    },
    dispose: function () { layer.remove(); st.remove(); }
  };
}

module.exports = { createLettering: createLettering, WORDS: WORDS };
