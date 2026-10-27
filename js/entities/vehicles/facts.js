// Real facts about each vehicle, spoken when you hop in and with the ℹ️ button.
const VEHICLE_FACTS = {
  digger: [
    'A digger is also called an excavator. Its arm has three parts: the boom, the stick and the bucket.',
    'Diggers move their arms with hydraulics: oil pushed through pipes makes the rams push and pull.',
    'Diggers drive on tracks instead of wheels, so they don\'t sink into mud.',
  ],
  dumptruck: [
    'A dump truck has a tipping tray. A hydraulic ram lifts the front of the tray so the dirt slides out the back.',
    'Some mining dump trucks are as tall as a house and carry as much as 200 cars!',
    'Dump trucks carry dirt, gravel and sand to building sites.',
  ],
  firetruck: [
    'A fire truck carries a big tank of water and a pump to spray it through the hose.',
    'Fire trucks put down legs called outriggers to stay steady while they spray.',
    'The ladder on a fire truck can reach high windows to rescue people.',
  ],
  tractor: [
    'Tractors have giant back wheels with deep treads to grip the soft soil.',
    'A tractor pulls a plough to turn the soil over before seeds are planted.',
    'Tractors are slow, but very strong. They can pull heavy trailers full of hay.',
  ],
  train: [
    'A steam train burns coal to boil water. The steam pushes pistons that turn the wheels.',
    'Trains run on steel rails, which makes them very good at carrying heavy loads.',
    'The driver of a train is called the engine driver. They blow the whistle at stations.',
  ],
  bulldozer: [
    'A bulldozer has a big flat blade at the front for pushing dirt and rocks.',
    'Bulldozers drive on tracks, like a digger, so they can push really hard without slipping.',
    'Bulldozers flatten the ground before roads and houses are built.',
  ],
  crane: [
    'A crane lifts heavy things with a hook on a long steel cable.',
    'Mobile cranes put down outriggers so they don\'t tip over when lifting.',
    'Tall cranes have a heavy counterweight at the back to balance the load.',
  ],
  ambulance: [
    'An ambulance takes sick or hurt people to hospital, with paramedics to look after them.',
    'Ambulances have lights and a siren so other cars know to move out of the way.',
    'Inside an ambulance there is a stretcher bed and lots of medical equipment.',
  ],
  police: [
    'Police cars have flashing red and blue lights and a siren.',
    'Police help keep everyone safe and help people who are lost.',
    'In Australia, many police cars are white and blue with a checked pattern.',
  ],
  tugboat: [
    'Tugboats are small but very strong. They push and pull giant ships into the port.',
    'Tugboats have old tyres around the edge called fenders, so they don\'t scrape the ships.',
    'Tugboats have huge engines for their size.',
  ],
  helicopter: [
    'A helicopter flies with spinning blades on top called the main rotor.',
    'The little rotor on the tail stops the helicopter spinning around.',
    'Helicopters can hover in one spot, so they are great for rescues.',
  ],
  harvester: [
    'A combine harvester cuts the crop, separates the grain and keeps it in a tank, all in one machine.',
    'The spinning reel at the front pushes the crop into the cutter.',
    'The long pipe is called an auger. It pours the grain into a truck.',
  ],
  wrecker: [
    'A wrecking ball is a heavy steel ball swung from a crane to knock down old buildings.',
    'Wrecking balls can weigh as much as five cars!',
    'Today most buildings are knocked down with diggers, but wrecking balls are still used sometimes.',
  ],
  garbage: [
    'A garbage truck lifts bins with its arm and tips the rubbish into the back.',
    'Inside the garbage truck, a big plate squashes the rubbish so more fits in.',
    'Recycling trucks take bottles, cans and paper to be made into new things.',
  ],
  drill: [
    'A drill rig spins a long drill bit to make deep holes in the ground.',
    'Drill rigs are used to find water, look for rocks and metals, and make holes for explosives in mines.',
    'The drill bit has very hard teeth to grind through rock.',
  ],
  fishboat: [
    'A fishing boat drags a big net through the water to catch fish.',
    'Fishing boats keep the fish cold in ice so they stay fresh.',
    'Big fishing boats can stay out at sea for weeks.',
  ],
  submarine: [
    'A submarine can dive under the sea by filling tanks with water, and float up by blowing the water out.',
    'Submarines use a periscope to look above the water while staying underneath.',
    'It is very dark deep in the sea, so submarines use bright lights.',
  ],
  plane: [
    'A plane flies because its wings push air down and lift the plane up.',
    'The spinning propeller pulls the plane forward through the air.',
    'Crop duster planes fly low to spray water and plant food over farms.',
  ],
  rocket: [
    'A rocket burns fuel super fast and pushes hot gas out the bottom to blast up into space.',
    'Rockets have to go really fast, more than ten times faster than a jet plane, to get to space.',
    'Astronauts first walked on the Moon in 1969.',
  ],
  motorbike: [
    'Dirt bikes have knobbly tyres that dig into mud and dirt.',
    'Motocross riders stand up on the pegs to soak up the bumps with their legs.',
    'Some riders can do a backflip on a motorbike, spinning all the way round in the air.',
  ],
  sportscar: [
    'Sports cars sit low to the ground so the wind slides over them.',
    'A spoiler on the back pushes the car down onto the road at high speed.',
  ],
  racecar: [
    'Formula One cars can go faster than 350 kilometres an hour.',
    'Race car tyres are smooth, called slicks, so more rubber touches the track.',
    'At top speed a race car\'s wings push it down so hard it could drive upside down on a ceiling.',
  ],
  tram: [
    'Melbourne has the biggest tram network in the world, with about 250 kilometres of track.',
    'Trams get their power from a wire overhead, through the pole on the roof.',
    'The green and gold W-class trams have been running in Melbourne for about a hundred years.',
  ],
  citybike: [
    'Riding a bike is one of the best ways to get around a city.',
    'Always wear a helmet when you ride a bike.',
  ],
  car: [
    'A car has four wheels and an engine that turns them round.',
    'Headlights help you see at night and help others see you coming.',
  ],
  ute: [
    'The ute was invented in Australia, for a farmer\'s wife who wanted a car for church that could also carry the pigs to market.',
    'Lots of farm dogs ride in the back of the ute to help round up the sheep.',
  ],
  bus: [
    'One bus can carry as many people as forty cars.',
    'Bus doors open at the bus stop so people can hop on and off.',
  ],
  van: [
    'Delivery vans bring parcels right to your front door.',
    'A delivery driver might drop off more than a hundred parcels in one day.',
  ],
  icecream: [
    'Ice cream vans play a tune so everyone knows they are coming.',
    'The ice cream is kept cold in a freezer inside the van.',
  ],
  mixer: [
    'The drum on a cement mixer keeps turning so the concrete doesn\'t set hard on the way.',
    'Concrete is made of cement, sand, little stones and water.',
  ],
  roller: [
    'A road roller is so heavy it squashes the ground flat and hard, ready for a road.',
    'Some rollers shake their drum to pack the ground down even more.',
  ],
  forklift: [
    'Forklifts lift heavy loads with two long forks that slide under them.',
    'The heavy weight on the back of a forklift stops it tipping over when it lifts.',
  ],
  monster: [
    'Monster truck wheels can be taller than a grown-up.',
    'Monster trucks can jump over a row of cars and land on their springy shocks.',
  ],
  jetski: [
    'A jet ski has no propeller outside: it pushes a jet of water out the back.',
    'Always wear a life jacket on a jet ski.',
  ],
  ufo: [
    'UFO stands for unidentified flying object: something in the sky nobody can name.',
    'In stories, flying saucers lift things up with a beam of light called a tractor beam.',
  ],
  brachioride: [
    'Brachiosaurus was as tall as a four storey building.',
    'Brachiosaurus ate the leaves at the very tops of the trees, where other dinosaurs couldn\'t reach.',
  ],
  jet: [
    'FIFO means fly in, fly out. Miners fly to the mine, work for a couple of weeks, then fly home.',
    'A jet\'s wings are shaped to push air down, and that lifts the plane up into the sky.',
    'Jet engines suck in air, squeeze it, burn fuel in it and blast it out the back.',
  ],
  blastrig: [
    'A blast hole drill spins a long steel rod with a hard bit on the end to make deep holes in rock.',
    'The holes are filled with explosives so the rock breaks into pieces small enough to dig.',
    'Blast holes are drilled in neat rows, called a drill pattern.',
  ],
  haultruck: [
    'Mining haul trucks can carry as much as three hundred tonnes. That\'s like two hundred cars!',
    'A haul truck driver climbs a ladder to get up to the cab.',
    'Each giant tyre is taller than a grown up and costs as much as a car.',
  ],
  oretrain: [
    'Pilbara ore trains can be over two kilometres long, with more than two hundred wagons.',
    'At the port a car dumper turns each wagon upside down to empty it, without unhooking it!',
    'Some Pilbara ore trains drive themselves, with no driver on board.',
  ],
  shiploader: [
    'A ship loader runs along rails on the wharf, pouring ore into the ship\'s holds.',
    'The holds are filled a bit at a time so the ship stays level in the water.',
    'Iron ore ships are huge. One ship can carry more than two thousand train wagons of ore.',
  ],
  chargetruck: [
    'Explosives trucks pump the explosive right down into each blast hole.',
    'The explosive is only mixed inside the truck, just before it goes in the hole, to keep everyone safe.',
    'Every hole gets a detonator, so the whole blast can be set off from far away.',
  ],
  goldtruck: [
    'You earned the golden haul truck by filling a whole ship with iron ore!',
    'Real haul trucks can carry as much as three hundred tonnes.',
    'Iron ore from the Pilbara is made into steel for cars, bridges and buildings.',
  ],
  pirateship: [
    'Sails catch the wind and push the ship along. More sail up means more speed.',
    'On a ship, left is called port and right is called starboard.',
    'Long ago a Dutch ship called the Batavia sailed to Western Australia and hit a reef. Divers still find its treasures.',
  ],
  moonbuggy: [
    'Astronauts drove a real moon buggy, called the lunar rover, on the Moon.',
    'The Moon has much less gravity than Earth, so everything is lighter and you can jump really high.',
    'There is no air on the Moon, so astronauts wear space suits and helmets.',
  ],
};

const Facts = {
  idx: {},
  next(kind) {
    const list = VEHICLE_FACTS[kind];
    if (!list) return null;
    const i = this.idx[kind] || 0;
    this.idx[kind] = (i + 1) % list.length;
    return list[i];
  },
  sayNext(kind) {
    const f = this.next(kind);
    if (f) Sound.say(f);
  },
};
