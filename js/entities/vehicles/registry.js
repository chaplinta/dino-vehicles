// Order shown in the whistle menu, and where each vehicle parks at the start.
const VEHICLE_ORDER = [
  'digger', 'dumptruck', 'firetruck', 'tractor', 'train', 'bulldozer',
  'crane', 'ambulance', 'police', 'tugboat', 'helicopter', 'harvester',
  'wrecker', 'garbage', 'drill', 'fishboat', 'submarine', 'plane', 'rocket',
];
const DEFAULT_VEHICLES = [
  ['tractor', 12, 1], ['harvester', 80, -1], ['plane', 92, -1],
  ['firetruck', 134, 1], ['ambulance', 164, 1], ['police', 194, 1], ['garbage', 178, -1],
  ['bulldozer', 219, 1], ['digger', 228, 1], ['dumptruck', 234, 1], ['crane', 275, 1], ['wrecker', 279, -1], ['drill', 297, -1],
  ['tugboat', 340, 1], ['fishboat', 360, -1], ['submarine', 380, 1],
  ['helicopter', 440, 1], ['rocket', 578, 1], ['train', 30, 1],
];
