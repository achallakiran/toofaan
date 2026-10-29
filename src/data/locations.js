/* data layer: the places where trouble happens. Each location is a set piece on one road chunk (see sim/citylocs.js); entering its zone while it is
   uncleared starts a fight there. `n` is how many men, `stick` how many of them carry a stick, `r` the trigger radius from the chunk centre. */
'use strict';

var LOCATIONS = {
  market:       { name: 'Market lane',       n: 5, stick: 1, r: 15, side: true },
  petrol:       { name: 'Petrol pump',       n: 4, stick: 1, r: 14, side: true },
  busstand:     { name: 'Bus stand',         n: 5, stick: 1, r: 15, side: true },
  construction: { name: 'Construction site', n: 6, stick: 2, r: 15, side: true },
  temple:       { name: 'Temple square',     n: 5, stick: 1, r: 15, side: true },
  warehouse:    { name: 'Warehouse yard',    n: 6, stick: 2, r: 15, side: true },
  slum:         { name: 'Slum lane',         n: 5, stick: 1, r: 14, side: true },
  railway:      { name: 'Railway crossing',  n: 4, stick: 1, r: 14, side: false },
  toll:         { name: 'Toll plaza',        n: 6, stick: 2, r: 15, side: false },
  flyover:      { name: 'Flyover underpass', n: 5, stick: 1, r: 15, side: false }
};
var ORDER = ['market', 'petrol', 'busstand', 'construction', 'temple', 'warehouse', 'slum', 'railway', 'toll', 'flyover'];

/* chunks near the start that always hold a location, so the first ride has somewhere to go */
var FORCED = { '2,0': 'market', '-1,0': 'petrol', '3,0': 'busstand', '1,1': 'construction', '1,-1': 'temple', '-3,0': 'slum' };
var CHANCE = 0.2;           /* any other straight road chunk */

module.exports = { LOCATIONS: LOCATIONS, ORDER: ORDER, FORCED: FORCED, CHANCE: CHANCE };
