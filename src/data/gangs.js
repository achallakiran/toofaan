/* data: the five gangs that hold the city, each with its own district (two kinds of trouble spot), colour, kind of fighters and road
   vehicle; and Taka, the unseen man behind them, shown only as "?" until the end. */
'use strict';

var GANGS = {
  antu:    { name: 'Antu Automatic', theme: 'Machines and robots', color: '#e8742a', types: ['construction', 'warehouse'], mix: { chain: 2, blocker: 2, kicker: 1 }, vehicle: 'armoured auto' },
  kalia:   { name: 'Kalia Lootera',  theme: 'Brawlers',            color: '#d0312d', types: ['market', 'slum'],           mix: { heavy: 3, thug: 2 },             vehicle: 'pickup of goons' },
  bhairav: { name: 'Bhairav Kalari', theme: 'Martial arts',        color: '#f2a51a', types: ['temple', 'railway'],        mix: { kicker: 3, blocker: 2 },         vehicle: 'bike gang' },
  teja:    { name: 'Teja Talwar',    theme: 'Weapons',             color: '#8a9a3a', types: ['petrol', 'toll'],           mix: { stick: 2, chain: 2, thrower: 2 }, vehicle: 'jeep with a spotlight' },
  raju:    { name: 'Rocket Raju',    theme: 'Speed',               color: '#2fd37a', types: ['flyover', 'busstand'],      mix: { kicker: 2, thrower: 1, thug: 1 }, vehicle: 'tuned cars' }
};
var ORDER = ['antu', 'kalia', 'bhairav', 'teja', 'raju'];
var BOSS = { name: 'TAKA', shown: '?' };

/* which gang holds a kind of place */
function gangOf(type) { for (var i = 0; i < ORDER.length; i++) if (GANGS[ORDER[i]].types.indexOf(type) >= 0) return ORDER[i]; return null; }

module.exports = { GANGS: GANGS, ORDER: ORDER, BOSS: BOSS, gangOf: gangOf };
