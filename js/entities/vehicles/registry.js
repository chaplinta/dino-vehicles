// Order shown in the whistle menu, and where each vehicle parks at the start.
const VEHICLE_ORDER = [
  'digger', 'dumptruck', 'firetruck', 'tractor', 'train', 'bulldozer',
  'crane', 'ambulance', 'police', 'tugboat', 'helicopter', 'harvester',
  'wrecker', 'garbage', 'drill', 'fishboat', 'submarine', 'plane', 'rocket', 'goldtruck',
  'motorbike', 'sportscar', 'racecar',
];
// How you get each vehicle: eight to start with, more as you earn stars, and some you have to find.
const UNLOCKS = {
  digger: 0, dumptruck: 0, tractor: 0, firetruck: 0, train: 0, bulldozer: 0, police: 0, ambulance: 0,
  garbage: 10, harvester: 20, drill: 30, wrecker: 45,
  mixer: 15, roller: 25, forklift: 35,   // not in the whistle menu: they turn up parked where they work
};
const PARKED_AT = { mixer: 'at the building site', roller: 'in town', forklift: 'by the pit garage' };
const FINDS = {
  crane: 'at the building site', tugboat: 'in the sea', fishboat: 'in the sea',
  plane: 'at the airport', helicopter: 'up in the mountains', submarine: 'in the sea', rocket: 'at the launch pad, right at the end of the world', pirateship: 'out in the sea',
  motorbike: 'at the bike park', sportscar: 'at the speedway', racecar: 'in the pit garage',
};
// The best ones only turn up somewhere once you have enough stars, and you still have to go and find them.
const FIND_STARS = { motorbike: 30, jetski: 45, jet: 50, monster: 60, pirateship: 70, sportscar: 90, rocket: 110, racecar: 140 };
for (const k in UNLOCKS) if (VEHICLE_DEFS[k]) VEHICLE_DEFS[k].unlock = UNLOCKS[k];
for (const k in FINDS) if (VEHICLE_DEFS[k]) { VEHICLE_DEFS[k].find = FINDS[k]; VEHICLE_DEFS[k].unlock = 0; }
// Can the whistle call it?
function vehicleUnlocked(kind) {
  const d = VEHICLE_DEFS[kind];
  if (!d) return false;
  return d.find || d.special ? !!(Game.found && Game.found[kind]) : Game.stars >= d.unlock;
}
// Is it parked out in the world? Ones to find always are; earned ones once earned.
function vehicleParked(kind) {
  const d = VEHICLE_DEFS[kind], found = !!(Game.found && Game.found[kind]);
  if (!d) return false;
  if (FIND_STARS[kind] && !found && Game.stars < FIND_STARS[kind]) return false;
  return d.special ? found : !!d.find || Game.stars >= d.unlock;
}
// Did these stars just make something appear out in the world?
function newlyParked(before, after) { return Object.keys(FIND_STARS).some(k => FIND_STARS[k] > before && FIND_STARS[k] <= after); }

// A short word for each vehicle, shown big when you get in, to read along with.
const VEHICLE_WORDS = {
  digger: 'DIG', dumptruck: 'DUMP', firetruck: 'FIRE', tractor: 'FARM', train: 'RAIL', bulldozer: 'PUSH', crane: 'LIFT',
  ambulance: 'HELP', police: 'COP', tugboat: 'TUG', helicopter: 'FLY', harvester: 'CORN', wrecker: 'BALL', garbage: 'BIN',
  drill: 'HOLE', fishboat: 'FISH', submarine: 'SUB', plane: 'WING', rocket: 'ZOOM', moonbuggy: 'MOON', pirateship: 'SHIP',
  jet: 'JET', motorbike: 'BIKE', sportscar: 'FAST', racecar: 'RACE', citybike: 'RIDE', tram: 'TRAM', car: 'CAR', ute: 'UTE', bus: 'BUS', van: 'VAN', icecream: 'YUM', mixer: 'MIX', roller: 'ROLL', forklift: 'FORK', monster: 'BIG', jetski: 'SKI', blastrig: 'BORE', haultruck: 'HAUL', oretrain: 'ORE', shiploader: 'LOAD', chargetruck: 'BANG', goldtruck: 'GOLD',
};

const DEFAULT_VEHICLES = [
  ['tractor', 12, 1], ['harvester', 38, -1], ['plane', 76, -1], ['jet', 86, -1],
  ['firetruck', 134, 1], ['ambulance', 164, 1], ['police', 194, 1], ['garbage', 178, -1],
  ['bulldozer', 219, 1], ['digger', 228, 1], ['dumptruck', 234, 1], ['crane', 275, -1], ['wrecker', 280, 1], ['drill', 297, -1],
  ['tugboat', 340, 1], ['fishboat', 360, -1], ['submarine', 380, 1],
  ['helicopter', 440, 1], ['rocket', ROCKET_X, 1], ['train', 30, 1], ['pirateship', 389, -1], ['goldtruck', 242, 1],
  ['ute', 66, 1], ['car', 116, 1], ['van', 214, -1], ['citybike', 304, 1], ['bus', 588, 1],
  ['icecream', 312, 1], ['jetski', 350, 1], ['mixer', 255, 1], ['roller', 134, 1], ['forklift', 656, -1], ['monster', 676, 1],
  ['motorbike', 714, -1], ['sportscar', 612, 1], ['racecar', SPEEDWAY.GARAGE + 6, 1],
];
