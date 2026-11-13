/* view: the pause button and its menu. One button in the top-left corner (where SFX and MUSIC used to sit): in play it pauses the game
   and opens the menu (Resume, Restart, Main menu, New game, Settings); on the title screen it is a gear that opens only the Settings.
   The settings: sound, music, quality; and with ?dev=1 a LOOK (TEST) section that changes the game's style live behind the menu.
   What the buttons do is the caller's (main.js): this only draws and asks. */
'use strict';

var FONT = "'ToofanPx',monospace";
var PILL = 'position:fixed;z-index:20;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));height:34px;min-width:34px;border-radius:4px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;color:#fff;font-family:' + FONT + ';font-size:11px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation';
var BTN = 'display:block;width:100%;margin:9px 0 0;padding:12px 10px;border:2px solid #000;border-radius:4px;box-shadow:3px 3px 0 #000;font-family:' + FONT + ';font-size:14px;letter-spacing:.12em;cursor:pointer;touch-action:manipulation;text-align:center';
var ROW = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 0;font-size:12px;letter-spacing:.1em;color:#e8e8e8';
var CHIP = 'padding:8px 10px;border:2px solid #000;border-radius:4px;box-shadow:2px 2px 0 #000;font-family:' + FONT + ';font-size:11px;letter-spacing:.08em;cursor:pointer;touch-action:manipulation;background:#2a2d33;color:#fff';
var PAUSE = '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="6" y="5" width="4" height="14" fill="#fff"/><rect x="14" y="5" width="4" height="14" fill="#fff"/></svg>';
var GEAR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';

/* o: { dev, settings(): {sfx, music, tier, tiers, look, styles}, set(key, value), actions(): [{id, label, ask?}] for the current mode
   (empty: the title, settings only), act(id), open(), close() } */
function createPauseMenu(o) {
  var btn = document.createElement('button'), shade = null, mode = 'play', page = 'main';
  btn.setAttribute('data-ok', '1'); btn.setAttribute('aria-label', 'Pause'); btn.style.cssText = PILL;
  btn.addEventListener('click', function (e) { e.stopPropagation(); openMenu(); });
  document.body.appendChild(btn);

  function el(tag, css, html) { var d = document.createElement(tag); if (css) d.style.cssText = css; if (html != null) d.innerHTML = html; return d; }
  function button(label, css, fn) { var b = el('button', BTN + ';' + css, label); b.setAttribute('data-ok', '1'); b.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); return b; }
  function chips(cur, list, fn) {
    var w = el('div', 'display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end');
    list.forEach(function (it) {
      var c = el('button', CHIP + (it.v === cur ? ';background:#ffd21f;color:#000' : ''), it.t); c.setAttribute('data-ok', '1');
      c.addEventListener('click', function (e) { e.stopPropagation(); fn(it.v); draw(); }); w.appendChild(c);
    });
    return w;
  }
  function row(label, ctl) { var r = el('div', ROW); r.appendChild(el('span', '', label)); r.appendChild(ctl); return r; }

  function draw() {
    if (!shade) return;
    var panel = shade.firstChild; panel.innerHTML = '';
    /* a wide, short screen (a computer, a phone on its side): the buttons on the left, the settings on the right, so it all fits */
    var wide = window.innerWidth > window.innerHeight && window.innerWidth >= 600;
    panel.style.width = wide ? 'min(94vw,680px)' : 'min(86vw,340px)';
    var colA = panel, colB = panel;
    if (wide && page !== 'ask') {
      panel.style.display = 'grid'; panel.style.gridTemplateColumns = '1fr 1.25fr'; panel.style.columnGap = '20px'; panel.style.alignItems = 'start';
      colA = el('div'); colB = el('div'); panel.appendChild(colA); panel.appendChild(colB);
    } else panel.style.display = 'block';
    var S = o.settings(), acts = mode === 'title' ? [] : o.actions();
    if (page === 'ask') {
      panel.appendChild(el('div', 'font-size:15px;letter-spacing:.12em;color:#ffd21f;text-align:center;margin-bottom:6px', ask.q));
      panel.appendChild(button('YES', 'background:#ffd21f;color:#000', function () { var id = ask.id; close(true); o.act(id); }));
      panel.appendChild(button('NO', 'background:#fff;color:#000', function () { page = 'main'; draw(); }));
      return;
    }
    colA.appendChild(el('div', 'font-size:18px;letter-spacing:.24em;color:#ffd21f;text-align:center;text-shadow:2px 2px 0 #000;margin-bottom:4px', mode === 'title' ? 'SETTINGS' : 'PAUSED'));
    colA.appendChild(button(mode === 'title' ? 'BACK' : 'RESUME', 'background:#ffd21f;color:#000', function () { close(); }));
    acts.forEach(function (a) {
      colA.appendChild(button(a.label, 'background:#fff;color:#000', function () { if (a.ask) { ask = { id: a.id, q: a.ask }; page = 'ask'; draw(); } else { close(true); o.act(a.id); } }));
    });
    var set = el('div', colB === panel ? 'margin-top:14px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.25)' : '');
    set.appendChild(el('div', 'font-size:12px;letter-spacing:.2em;color:#9fd8aa', 'SETTINGS'));
    set.appendChild(row('SOUND', chips(S.sfx, [{ v: true, t: 'ON' }, { v: false, t: 'OFF' }], function (v) { o.set('sfx', v); })));
    set.appendChild(row('MUSIC', chips(S.music, [{ v: true, t: 'ON' }, { v: false, t: 'OFF' }], function (v) { o.set('music', v); })));
    set.appendChild(row('QUALITY', chips(S.tier, S.tiers.map(function (t) { return { v: t, t: t.toUpperCase() }; }), function (v) { o.set('tier', v); })));
    if (S.tierPending) set.appendChild(el('div', 'margin-top:4px;font-size:10px;letter-spacing:.08em;color:#ffb38a;text-align:right', 'APPLIES WHEN THE GAME RELOADS'));
    colB.appendChild(set);
    if (o.dev) {
      var lk = el('div', 'margin-top:14px;padding-top:10px;border-top:1px dashed rgba(255,210,31,.4)'), L = S.look;
      lk.appendChild(el('div', 'font-size:12px;letter-spacing:.2em;color:#ffd21f', 'LOOK (TEST)'));
      lk.appendChild(row('STYLE', chips(L.style, S.styles.map(function (t) { return { v: t, t: t.toUpperCase() }; }), function (v) { o.set('look', { style: v }); })));
      if (L.style === 'retro') lk.appendChild(row('PIXELS', chips(L.px, [{ v: 3, t: '1/3' }, { v: 2, t: '1/2' }], function (v) { o.set('look', { px: v }); })));
      lk.appendChild(row('VIGNETTE', chips(L.vignette, [{ v: true, t: 'ON' }, { v: false, t: 'OFF' }], function (v) { o.set('look', { vignette: v }); })));
      colB.appendChild(lk);
    }
  }
  var ask = null;
  function openMenu() {
    if (shade) return;
    page = 'main';
    /* see-through enough that a change of look shows behind it */
    shade = el('div', 'position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(3,5,10,.42);padding:16px;font-family:' + FONT + ';color:#fff;touch-action:manipulation');
    var panel = el('div', 'width:min(86vw,340px);max-height:calc(100vh - 32px);overflow:auto;padding:16px 16px 18px;background:rgba(12,14,20,.86);border:2px solid #000;border-radius:6px;box-shadow:5px 5px 0 #000');
    shade.appendChild(panel);
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'].forEach(function (k) { shade.addEventListener(k, function (e) { e.stopPropagation(); }); });
    shade.addEventListener('click', function (e) { if (e.target === shade) close(); });
    document.body.appendChild(shade);
    if (mode !== 'title') o.open(); draw();
  }
  function close(silent) { if (!shade) return; shade.remove(); shade = null; if (mode !== 'title') o.close(silent); }
  window.addEventListener('keydown', function (e) { if (e.code === 'Escape' || e.code === 'KeyP') { if (shade) close(); else if (btn.style.display !== 'none') openMenu(); } });
  return {
    /* 'play': the pause button; 'title': the gear (settings only); 'none': hidden (the developer studio) */
    setMode: function (m) { if (shade) close(); mode = m; btn.style.display = m === 'none' ? 'none' : 'flex'; btn.innerHTML = m === 'title' ? GEAR : PAUSE; btn.setAttribute('aria-label', m === 'title' ? 'Settings' : 'Pause'); },
    isOpen: function () { return !!shade; },
    open: openMenu, close: close, redraw: draw
  };
}

module.exports = { createPauseMenu: createPauseMenu };
