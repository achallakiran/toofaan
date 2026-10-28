/* view: the Hero studio panel. Plain DOM; it reports choices through callbacks and never touches the scene. */
'use strict';

var poseData = require('../data/poses');

function createStudioUI(root, cb) {
  var h = '';
  h += '<button id="stToggle" class="st-toggle" aria-expanded="true">Controls</button>';
  h += '<div class="st-body" id="stBody">';
  h += '<div class="st-chips" id="stChips"></div>';
  h += '<section><h3>Pose</h3><div class="st-grid" id="stPoses"></div></section>';
  h += '<section><h3>Motion</h3><div class="st-grid" id="stMotion"></div></section>';
  h += '<section><h3>Camera</h3><div class="st-grid" id="stView"></div></section>';
  h += '<section><h3>Show</h3><div class="st-checks" id="stShow"></div></section>';
  h += '<section><h3>Joints</h3><div id="stJoints"></div><button class="st-btn wide" id="stReset">Reset to stand</button></section>';
  h += '<section><h3>Parts</h3><div class="st-parts" id="stParts"></div></section>';
  h += '</div>';
  root.innerHTML = h;
  var $ = function (id) { return root.querySelector('#' + id); };

  function btn(parent, label, id, onclick, cls) {
    var b = document.createElement('button'); b.className = 'st-btn' + (cls ? ' ' + cls : ''); b.textContent = label; b.id = id; b.type = 'button';
    b.addEventListener('click', onclick); parent.appendChild(b); return b;
  }
  var poseBtns = {}, motionBtns = {}, viewBtns = {};
  poseData.POSE_LABELS.forEach(function (p) {
    poseBtns[p[0]] = btn($('stPoses'), p[1], 'pose-' + p[0], function () { cb.onPose(p[0]); mark(poseBtns, p[0]); mark(motionBtns, null); });
  });
  [['idle', 'Idle'], ['walk', 'Walk'], ['jog', 'Jog'], ['combo', 'Combo'], ['move:jab', 'Jab'], ['move:cross', 'Cross'], ['move:hook', 'Hook'], ['move:elbow', 'Elbow'], ['move:knee', 'Knee'], ['move:kick', 'Push kick'], ['move:roundhouse', 'Roundhouse'], ['move:counterBoom', 'Sonic boom'], ['move:counterSmash', 'Guitar smash'], ['move:counterWhirl', 'Guitar whirl'], ['move:finisherWhirl', 'Rage finisher'], ['counter', 'Old counter'], ['hold', 'Hold']].forEach(function (m) {
    motionBtns[m[0]] = btn($('stMotion'), m[1], 'motion-' + m[0].replace(':', '-'), function () { cb.onMotion(m[0]); mark(motionBtns, m[0] === 'hold' ? null : m[0]); if (m[0] !== 'hold') mark(poseBtns, null); });
  });
  [['front', 'Front'], ['side', 'Side'], ['back', 'Back'], ['three', '3/4'], ['face', 'Face'], ['feet', 'Feet']].forEach(function (v) {
    viewBtns[v[0]] = btn($('stView'), v[1], 'view-' + v[0], function () { cb.onView(v[0]); mark(viewBtns, v[0]); });
  });
  function mark(set, key) { Object.keys(set).forEach(function (k) { set[k].setAttribute('aria-pressed', k === key ? 'true' : 'false'); }); }

  var checks = {};
  [['skeleton', 'Skeleton', false], ['ruler', 'Height ruler', true], ['plant', 'Keep feet on floor', true], ['southpaw', 'Southpaw stance', false],
   ['guitar', 'Guitar on back', true], ['spin', 'Turn the body', false], ['orbit', 'Auto-orbit camera', false]].forEach(function (c) {
    var l = document.createElement('label'); l.className = 'st-check';
    var i = document.createElement('input'); i.type = 'checkbox'; i.id = 'chk-' + c[0]; i.checked = c[2];
    i.addEventListener('change', function () { cb.onToggle(c[0], i.checked); });
    l.appendChild(i); l.appendChild(document.createTextNode(' ' + c[1])); $('stShow').appendChild(l); checks[c[0]] = i;
  });

  var sliders = {};
  poseData.JOINTS.forEach(function (grp, gi) {
    var d = document.createElement('details'); d.className = 'st-group'; if (gi === 2) d.open = true;
    var sm = document.createElement('summary'); sm.textContent = grp.group; d.appendChild(sm);
    grp.rows.forEach(function (r) {
      var row = document.createElement('div'); row.className = 'st-row';
      var lab = document.createElement('label'); lab.textContent = r[1]; lab.htmlFor = 'sl-' + r[0];
      var inp = document.createElement('input'); inp.type = 'range'; inp.id = 'sl-' + r[0]; inp.min = r[2]; inp.max = r[3]; inp.step = r[4]; inp.value = 0;
      var out = document.createElement('output'); out.textContent = '0';
      inp.addEventListener('input', function () { out.textContent = fmt(+inp.value, r[5]); cb.onJoint(r[0], +inp.value); mark(poseBtns, null); mark(motionBtns, null); });
      row.appendChild(lab); row.appendChild(inp); row.appendChild(out); d.appendChild(row); sliders[r[0]] = { inp: inp, out: out, unit: r[5] };
    });
    $('stJoints').appendChild(d);
  });
  function fmt(v, unit) { return unit === 'm' ? v.toFixed(2) + ' m' : Math.round(v) + '°'; }
  $('stReset').addEventListener('click', function () { cb.onPose('stand'); mark(poseBtns, 'stand'); mark(motionBtns, null); });

  var toggle = $('stToggle'), body = $('stBody');
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); body.hidden = !open;
  });
  mark(poseBtns, 'stand'); mark(viewBtns, 'three');

  return {
    syncPose: function (pose) {
      Object.keys(sliders).forEach(function (k) { var s = sliders[k], v = pose[k] || 0; s.inp.value = v; s.out.textContent = fmt(v, s.unit); });
    },
    setChips: function (list) {
      $('stChips').innerHTML = list.map(function (c) { return '<div class="st-chip"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>'; }).join('');
    },
    setParts: function (parts) {
      var rows = Object.keys(parts).map(function (k) { return '<div><span>' + k + '</span><i>' + parts[k].voxels.toLocaleString() + '</i><i>' + parts[k].triangles.toLocaleString() + '</i></div>'; });
      $('stParts').innerHTML = '<div class="head"><span>Part</span><i>Voxels</i><i>Triangles</i></div>' + rows.join('');
    },
    checks: checks, markPose: function (n) { mark(poseBtns, n); }, markMotion: function (n) { mark(motionBtns, n); }, markView: function (n) { mark(viewBtns, n); },
    show: function (v) { root.hidden = !v; }
  };
}

module.exports = { createStudioUI: createStudioUI };
