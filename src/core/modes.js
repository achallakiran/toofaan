/* core: mode manager. A mode is {name, enter(ctx), step(ctx), render(ctx, alpha), exit(ctx)}.
   Everything a mode creates goes in its scope and is released when the mode exits. */
'use strict';

var scopeMod = require('./scope');

function createModes(ctx) {
  var modes = {}, current = null, scope = null;
  return {
    register: function (mode) { modes[mode.name] = mode; },
    switchTo: function (name, args) {
      if (!modes[name]) throw new Error('unknown mode ' + name);
      if (current) { current.exit(ctx, scope); scope.dispose(); }
      scope = scopeMod.createScope();
      current = modes[name];
      current.enter(ctx, scope, args);
      if (ctx.bus) ctx.bus.emit('mode:changed', { name: name });
    },
    step: function (tick) { if (current) current.step(ctx, tick); },
    render: function (alpha) { if (current && current.render) current.render(ctx, alpha); },
    currentName: function () { return current ? current.name : null; }
  };
}

module.exports = { createModes: createModes };
