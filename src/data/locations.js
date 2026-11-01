/* data layer: the ten kinds of place where trouble happens. Each is a trouble spot on the ride's map (sim/ridemap) and a fight arena
   (sim/arenas). `n` is how many men turn up when no lineup is given, `stick` how many of them carry a lathi. */
'use strict';

var LOCATIONS = {
  market:       { name: 'Market lane',       n: 5, stick: 1 },
  petrol:       { name: 'Petrol pump',       n: 4, stick: 1 },
  busstand:     { name: 'Bus stand',         n: 5, stick: 1 },
  construction: { name: 'Construction site', n: 6, stick: 2 },
  temple:       { name: 'Temple square',     n: 5, stick: 1 },
  warehouse:    { name: 'Warehouse yard',    n: 6, stick: 2 },
  slum:         { name: 'Slum lane',         n: 5, stick: 1 },
  railway:      { name: 'Railway crossing',  n: 4, stick: 1 },
  toll:         { name: 'Toll plaza',        n: 6, stick: 2 },
  flyover:      { name: 'Flyover underpass', n: 5, stick: 1 }
};
var ORDER = ['market', 'petrol', 'busstand', 'construction', 'temple', 'warehouse', 'slum', 'railway', 'toll', 'flyover'];

module.exports = { LOCATIONS: LOCATIONS, ORDER: ORDER };
