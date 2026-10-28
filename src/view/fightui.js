/* view: fight HUD - health, rage, combo counter, wave banner. Plain DOM, restyled via inline styles so the page template stays small. */
'use strict';

function createFightUi() {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:max(56px,calc(env(safe-area-inset-top) + 48px));right:max(14px,env(safe-area-inset-right));width:min(260px,44vw);z-index:4;pointer-events:none;font:700 11px system-ui,sans-serif;letter-spacing:.1em;color:#fff;text-transform:uppercase';
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between"><span>Toofan</span><span id="fuWave" style="color:#ffc21a">Wave 1</span></div>' +
    '<div style="height:12px;margin:4px 0;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.35);border-radius:3px;overflow:hidden"><div id="fuHp" style="height:100%;width:100%;background:linear-gradient(90deg,#d63a2f,#ff7a3d)"></div></div>' +
    '<div style="height:7px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.3);border-radius:3px;overflow:hidden"><div id="fuRage" style="height:100%;width:0;background:linear-gradient(90deg,#ffc21a,#fff1a8)"></div></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:4px;opacity:.85"><span id="fuRageT">Rage</span><span id="fuKo">KO 0</span></div>' +
    '<div id="fuCombo" style="margin-top:10px;font-size:26px;text-align:right;color:#ffc21a;text-shadow:0 2px 0 rgba(0,0,0,.5);opacity:0">0 HIT</div>';
  var ban = document.createElement('div');
  ban.style.cssText = 'position:fixed;left:0;right:0;top:22%;text-align:center;z-index:4;pointer-events:none;font:800 38px system-ui,sans-serif;letter-spacing:.2em;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.5);text-transform:uppercase;opacity:0;transition:opacity .25s';
  document.body.appendChild(el); document.body.appendChild(ban);
  function q(id) { return el.querySelector('#' + id); }
  var hp = q('fuHp'), rage = q('fuRage'), rageT = q('fuRageT'), ko = q('fuKo'), wave = q('fuWave'), combo = q('fuCombo');
  return {
    update: function (p, c) {
      hp.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      rage.style.width = p.rage + '%'; rageT.textContent = p.rage >= 100 ? 'Rage full - finisher!' : 'Rage';
      rageT.style.color = p.rage >= 100 ? '#ffc21a' : '#fff';
      ko.textContent = 'KO ' + c.kills; wave.textContent = 'Wave ' + c.wave;
      combo.textContent = c.combo + (c.combo === 1 ? ' hit' : ' hits'); combo.style.opacity = c.combo >= 2 ? 1 : 0;
      ban.textContent = c.banner; ban.style.opacity = c.bannerT > 0 ? 1 : 0;
    },
    show: function (v) { el.style.display = v ? '' : 'none'; ban.style.display = v ? '' : 'none'; },
    dispose: function () { el.remove(); ban.remove(); }
  };
}

module.exports = { createFightUi: createFightUi };
