// Order shown in the whistle menu, and where each vehicle parks at the start.
const VEHICLE_ORDER = [
  'digger', 'dumptruck', 'firetruck', 'tractor', 'train', 'bulldozer',
  'crane', 'ambulance', 'police', 'tugboat', 'helicopter', 'harvester',
  'wrecker', 'garbage', 'drill', 'fishboat', 'submarine', 'plane', 'rocket',
];
// How you get each vehicle: five to start with, more as you earn stars, and some you have to find.
const UNLOCKS = {
  digger: 0, dumptruck: 0, tractor: 0, firetruck: 0, train: 0,
  bulldozer: 8, ambulance: 12, police: 16, crane: 20, garbage: 25, tugboat: 30, harvester: 35, fishboat: 40, drill: 50, wrecker: 60,
};
const FINDS = { plane: 'at the airport', helicopter: 'up in the mountains', submarine: 'in the sea', rocket: 'at the launch pad', pirateship: 'in the sea' };
for (const k in UNLOCKS) if (VEHICLE_DEFS[k]) VEHICLE_DEFS[k].unlock = UNLOCKS[k];
for (const k in FINDS) if (VEHICLE_DEFS[k]) { VEHICLE_DEFS[k].find = FINDS[k]; VEHICLE_DEFS[k].unlock = 0; }
// Can the whistle call it?
function vehicleUnlocked(kind) {
  const d = VEHICLE_DEFS[kind];
  if (!d) return false;
  return d.find ? !!(Game.found && Game.found[kind]) : Game.stars >= d.unlock;
}
// Is it parked out in the world? Ones to find always are; earned ones once earned.
function vehicleParked(kind) { const d = VEHICLE_DEFS[kind]; return !!d && (!!d.find || Game.stars >= d.unlock); }

// A short word for each vehicle, shown big when you get in, to read along with.
const VEHICLE_WORDS = {
  digger: 'DIG', dumptruck: 'DUMP', firetruck: 'FIRE', tractor: 'FARM', train: 'RAIL', bulldozer: 'PUSH', crane: 'LIFT',
  ambulance: 'HELP', police: 'COP', tugboat: 'TUG', helicopter: 'FLY', harvester: 'CORN', wrecker: 'BALL', garbage: 'BIN',
  drill: 'HOLE', fishboat: 'FISH', submarine: 'SUB', plane: 'WING', rocket: 'ZOOM', moonbuggy: 'MOON', pirateship: 'SHIP',
  jet: 'JET', blastrig: 'BORE', haultruck: 'HAUL', oretrain: 'ORE', shiploader: 'LOAD',
};

const DEFAULT_VEHICLES = [
  ['tractor', 12, 1], ['harvester', 38, -1], ['plane', 76, -1], ['jet', 86, -1],
  ['firetruck', 134, 1], ['ambulance', 164, 1], ['police', 194, 1], ['garbage', 178, -1],
  ['bulldozer', 219, 1], ['digger', 228, 1], ['dumptruck', 234, 1], ['crane', 275, -1], ['wrecker', 280, 1], ['drill', 297, -1],
  ['tugboat', 340, 1], ['fishboat', 360, -1], ['submarine', 380, 1],
  ['helicopter', 440, 1], ['rocket', 578, 1], ['train', 30, 1], ['pirateship', 386, -1],
];
