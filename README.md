# Dino Vehicles

A side-on sandbox game for young kids (made for a 5-year-old). Pick a dinosaur, then drive, dig and build in a big world full of other dinos doing their jobs.

No reading needed: every menu is pictures, and the game talks (browser speech).

## Play

**Play now: https://chaplinta.github.io/dino-vehicles/** (on a phone, hold it sideways; use Share → Add to Home Screen for a full-screen app).

Open `index.html` in a modern browser (Chrome, Safari, Edge, Firefox). No install or server needed. It also works from GitHub Pages and on tablets. Use "Add to Home Screen" for full screen.

Once loaded from the web link, it works offline: a service worker (`sw.js`) caches every file. A new version downloads in the background and switches over at the title screen (or the next launch), never in the middle of a game. Add a new file? List it in `sw.js` and bump `VERSION` (the smoke test checks the list).

Progress saves automatically in the browser. To start a new world (stars and unlocked vehicles are kept), hold the 🌱 button (top left, next to 🏠) for 2 seconds while playing.

### Controls

| | Keyboard | Touch |
|---|---|---|
| Walk / drive | Arrows or WASD | joystick, bottom left: touch it and slide (further = faster). Touch screens only |
| Jump (automatic at walls) / climb walls | Up | push the joystick up |
| Fly (Pterodactyl): hold to climb, let go to glide, down to dive | Up / Down | joystick up / down |
| Dig / vehicle action | Space | big yellow button |
| Play-fight: your dino's own move (see Dinosaurs) | F | red attack button 🦷 💥 🌀 🐦 👍 🐾 🦶 (the yellow button also does it when a dino is in reach) |
| Lick (a big wiggly tongue, just for fun) | L | 👅 button |
| Get in / out | E or Enter | 🚪 |
| Roar / horn | R | 🦖 / 📢 |
| Call a vehicle | Q | 📣 |
| Pick a block | 1–6 | block strip at top |
| Dig or build a block | click | tap the world |
| Back | Esc | 🏠 |
| New world (keeps stars) | hold N | hold 🌱 |
| Sound on/off | M | 🔊 |

## The world

From left to right: farm and airport, town (fire station, hospital, police), building site, beach and sea, mountains, the speedway, a jungle, a volcano mountain, a desert with a canyon, a snowy mountain, then the rocket launch pad right at the far end. A train line runs the whole way, through tunnels and over bridges. The hills in the background change with each place.

Dinos drive about too: cars, utes, delivery vans, a town bus that stops to let passengers on, and dinos on bikes, plus the farmer, builder, digger driver, police, fisher and crop duster at work. They stop and toot if you're in the way, and if one stops next to you, press the door button: the dino hops out and lets you drive (that's how you drive the town bus). A ute (in the barn, with its dog), a car (in town), a van (end of town), a bike (at the beach), the bus (speedway), an ice cream van (on the beach) and a skateboard (by the skate ramp at the end of town) are parked for you to hop in straight away. On the skateboard the button ollies; press it again in the air for a kickflip, and land it for a star. The bus button opens the doors: a dino waiting nearby gets on, and gets off a bit further along for a star. The ice cream van's tune brings dinos running for a cone, a star each. More turn up as you earn stars: a cement mixer at the building site at 15 (pours concrete blocks), a road roller in town at 25 (squashes bumps flat), a forklift by the pit garage at 35 (picks up a block and puts it down somewhere else), a snow plough at the bottom of the snowy mountain at 40. Two are hidden and turn up quietly, so you have to go looking: a jet ski in the sea at 45 and a monster truck by the bike park at 60 (giant bounce, CRUNCH landings). Melbourne and the Pilbara have traffic too.

Everything except the bedrock at the bottom can be dug. Sparkly stars float around the world to catch (some up high for flyers, some underwater) and come back after a minute. Vehicles bounce over walls they can't drive up, and dinos climb walls by walking into them, so nobody gets stuck. Bones, eggs, gems and fossils are hidden underground and earn stars.

**Asteroid:** a 10-minute clock (top right) counts down to an asteroid hitting Earth. When it hits it's game over; tap ▶ for a new world (stars are kept). Be on the Moon when it hits and you escape with bonus stars.

**Chess:** a Triceratops plays chess at a picnic table up on a mountain lookout (look for the PLAY sign). Walk up and press ♟️ (or tap the table) to play a real game from your own seat, with dino hands moving the pieces. He's very bad at it. Captured pieces line up in trays beside the board. Checkmate him for 10 stars.

**Reading signs:** one short word on signs around every place (FARM, CORN, FIRE, DIG, MOON, ROCK, CAVE...), all 3 or 4 letters. Walk up to one, or tap it, and the word lights up to read along with. Getting in a vehicle pops up its word too (DIG, DUMP, FIRE, COP, SHIP, ZOOM...). There's no voice-over: the game only makes sound effects.

**Speedway:** a drag strip with a start gantry, a grandstand full of dinos, a pit garage and a dirt bike park with jump ramps. Stop just behind the gantry in any vehicle and wait: three red lights, then green. Floor it to the chequered finish for a time and a star, and 3 more for a new record. Any wheeled vehicle flies off a ramp; a long jump is BIG AIR and a star. There's a little skate ramp at the end of town too.

**Jungle:** giant trees with vines (hold up to climb, let go to hang on) and parrots that flap off as you pass. A rope bridge over a river. A rocky plateau ends at a cliff with a waterfall pouring into a pool; swim in and there's a cave behind the waterfall with treasure and gems.

**Volcano mountain:** a big smoking volcano with real lava in the crater (it's hot: it pops you straight out). Hang about nearby and every minute or so it rumbles and erupts: lava bombs fly and a tongue of lava runs down one side, then cools to rock and dirt. A glowing lava tube runs right through the bottom, so the road and train go under it. A dino nest with eggs, and lots of bones, eggs and fossils to dig.

**Desert and canyon:** sand, cactuses and tumbleweeds. A canyon with a ramp each side: the race car, sports car and motorbike can jump it. Fall in and a sloping tunnel leads back up. A ghost town with a water tower, and a whole T-Rex skeleton buried under the sand: dig out every bone for 10 stars.

**Snowy mountain:** snow falls and every dino wears a woolly beanie. A long ski slope down the far side, an ice cave at the bottom with crystals in the walls, and snow drifts by the launch pad. At 40 stars a snow plough turns up there: its blade throws the snow off the road, and the button flashes its orange light and toots.

**Ride a Brachiosaurus:** walk up to a grown-up Brachiosaurus and press 🦕. It carries you about, and its button munches the treetops (a star every five mouthfuls) or stomps so the dinos jump.

## Dinosaurs

Fourteen to pick from. Out in the world each is drawn at its real relative size, squashed a bit so everyone stays playable: Brachiosaurus towers over the rest, then T-Rex, down to the little Deinonychus. The big meat-eaters are each built like their species: T-Rex has the huge deep head and tiny two-fingered arms, Allosaurus a long low head with little horns and long clawed arms, Megalosaurus a long curved head and strong arms, Carnotaurus a short blunt face, bull horns and arms that are just stubs.

Each has its own real-ish play-fight move (the yellow button changes when a dino is in reach):

| Dino | Move |
|---|---|
| T-Rex, Megalosaurus, Allosaurus, Carnotaurus | lunge, grab and maul (CHOMP!) |
| Deinonychus (blue, feathered) | hop and kick with the sickle claw (KICK!) |
| Baryonyx | raise the arm and slash with the big thumb claw (SLASH!) |
| Pterodactyl | three quick pecks (PECK!). It flies too: hold up |
| Iguanodon | rear up and stab with the thumb spike (JAB!) |
| Triceratops, Styracosaurus, Pachycephalosaurus | paw the ground, then really charge across head down; BONK when they hit |
| Stegosaurus, Ankylosaurus, Brachiosaurus | spin round and whack with the tail (WHACK!) |

The other dino tumbles away and runs off yelping. Half the grown-ups are tough and fight back with their own move (you get knocked flying, no damage); it takes three hits to send them off. Pick on 20 dinos and 8 cross dinos swarm you for 10 seconds; hide in a vehicle until they calm down. Flying high (Pterodactyl, plane, helicopter) zooms the view out so the ground stays in sight.

## Vehicles

You start with eight: digger, dump truck, tractor, fire truck, train, bulldozer, ambulance and police car. The whistle menu brings any of yours to you.

- **Earn with stars:** garbage truck 10, harvester 20, drill 30, wrecking ball 45. Each one turns up at its parking spot when earned.
- **Find them:** the crane (building site), plane (airport), helicopter (up in the mountains), tugboat, fishing boat and submarine (in the sea) are out in the world. Get in one to find it; then the whistle can call it too.
- **Hard to find:** the best ones only turn up once you have enough stars, quietly, and you still have to go and find them: motorbike 30 (bike park), FIFO jet 50 (airport), pirate ship 70 (far side of the sea), sports car 90 (speedway), rocket 110 (launch pad, far end of the world), race car 140 (pit garage).

| Vehicle | Button does |
|---|---|
| Digger | scoop, then dump (into the dump truck for a star). Up/down aims the bucket |
| Dump truck | tip the load |
| Fire truck | spray water. Up/down aims the hose |
| Tractor | plough and plant corn |
| Train | whistle. Stops at stations for passengers |
| Bulldozer | push dirt and walls, drop the pile |
| Crane | drop the chosen block. Up/down moves the hook |
| Ambulance, Police car | lights and siren. Give dinos a lift |
| Tugboat | throw a tow rope to another boat |
| Helicopter | lower the hook to lift blocks; rescue dinos |
| Combine harvester | harvests ripe corn as you drive; button unloads |
| Wrecking ball | swing the ball: it smashes any material. Knock out a building's base and the whole thing comes down |
| Garbage truck | empty the bins |
| Drill | drill straight down for deep treasure |
| Fishing boat | drop and lift the net |
| Submarine | light. Find treasure chests on the sea floor |
| Plane | water the crops while flying (up to take off) |
| Motorbike | jump; press again in the air to flip (land it for a star) |
| Sports car, Race car | turbo with flames |
| Pirate ship | fire the cannon. Up hoists the sails and sails off to Skull Island; down drops the anchor |
| Rocket | 10-second countdown (a quick 3-2-1 if the asteroid is under 30 s away), blast off to space, catch stars, then land on the Moon: low-gravity bouncing, moon cheese and crystals to dig, Moon dinos, a flag. Blast off again to parachute home |

On the Moon everyone wears a space suit and helmet. There's a flying saucer parked there too: hop in and fly it anywhere, and its tractor beam picks up Moon dinos or the moon buggy and carries them about (press again to drop), or pulls blocks up out of the ground when there's nothing to carry. The Moon is big, with craters, two crystal fields and six Moon dinos, and gravity a bit stronger than before. There's also a **moon buggy** parked by the landing pad: drive over the craters and press the button for a huge low-gravity bounce.


## The Pilbara

Hop aboard the big FIFO jet at the airport and pick ⛏️ MINE: the pilot flies you to an iron ore mine in the Pilbara, no driving needed. On site everyone wears hi-vis and a hard hat. Icons top left show the seven steps, and an arrow points to what's next:

1. **Drill:** drive the blast hole drill into the pit and hold the button to drill holes in the rock.
2. **Charge:** drive the explosives truck to each hole and hold the button to pump explosives in (red caps and wires).
3. **Blast:** press the red blast button. Siren, 3-2-1, boom: the iron ore breaks up.
4. **Dig:** the digger scoops broken ore into the giant haul truck (solid ore is too hard to dig).
5. **Haul:** drive up out of the pit and tip into the crusher at the OPF.
6. **Train:** stop the ore train under the loader to fill the wagons, then drive to the port and press the button to tip them into the car dumper. (The haul truck can also tip straight onto the train's stockpile.)
7. **Ship:** the ship loader pours ore into the ship's three holds. Full ship sails for 10 stars. Your first full ship makes you **Mine Boss**: a gold medal by your stars, 20 bonus stars, and a golden haul truck waiting at home.

Board the jet at the camp to fly home. The mine isn't saved; Earth is left as it was.

## Melbourne

Pick 🚋 CITY on the jet and it flies right across Australia to Melbourne. Everyone wears a footy jumper and beanie. Along the street:
- **Trams:** drive the green and gold tram (the button rings the bell). Dinos wait at the stops with a bubble showing where they want to go; stop next to them, then stop at their stop: 2 stars each.
- **Bikes:** two bike-share bikes at the rack. Ride the path by the Yarra and jump the ramps.
- **Coffee cart:** walk up and press ☕ for a flat white and five seconds of zooming about.
- Flinders Street Station, a laneway full of street art, Princes Bridge over the Yarra, Eureka Tower and the MCG. And four seasons in one day: every so often it rains.

Board the jet again to fly home. Melbourne isn't saved.

## Pirate Island

Hoist the pirate ship's sails and it sails to Skull Island. Everyone there wears a pirate hat and eye patch, and a parrot rides on your back. The treasure hunt, shown top left:

1. **Map:** tap 🗺️ to read the treasure map. X marks the spot.
2. **Dig** at the red X to find the chest.
3. **Pirates!** The crew come running with cutlasses. Fight them off (three hits each) or just run.
4. **Carry** the chest back to the ship (or the jetty): 10 stars, and a new map.

The island has lots of open sea to the west: floating barrels to smash with the cannon, bell buoys to ring, and a rival pirate ship with red sails that fires back (it can't hurt you). Three hits sink it for 5 stars, and it sails back later. There are barrels and a buoy at home in the sea too.

Also on the island: coconuts to knock out of the palm trees, a message in a bottle, a plank to walk off the jetty, Skull Cave with a torch, a hidden chest and a friendly ghost, a shipwreck with treasure on the sea floor, a sandcastle fort to knock down with the cannon, and the Kraken, who throws you stars if you splash a cannonball near it. Hoist the sails again to go home. The island isn't saved.

## Secrets (spoilers for grown-ups)

- **Shooting stars:** roar 5 times quickly and a shower of stars falls from the sky.
- **Cool sun:** tap the sun 3 times and it puts on sunglasses.
- **Golden egg:** dig all the way to the bottom of the world under the farm. It hatches a baby dino that follows you everywhere, even to the Moon.
- **Nessie:** swim, or take the submarine, along the sea floor near the far side of the sea. A friendly sea monster wakes up and waves.
- **Volcano:** dig really deep (anywhere but under the farm). First you reach reddish warm rock, and below it you can see the hot rock glowing. Dig into that and it rumbles, then lava fills the hole you dug from the bottom up, like water. Once it reaches the top it blows: KABOOM, you get blasted out and lava spills down the ground. It cools back to rock and dirt a bit later. Lava is hot, so it pushes you up and you hop off it. A sealed pocket just fills and cools.
- **Moon cheese core:** dig deep down in the middle of the Moon. It really is made of cheese.
- **Flying saucer:** hop in the saucer parked on the Moon (2 stars the first time) and fly it about.

## Jobs

Jobs pop up now and then, with a chime, a bubble in the world and an arrow at the screen edge. Tap the arrow or the bubble and the right vehicle for the job comes to you:

- fire in a house
- dino with a sore toe
- lost baby dino
- climber stuck on the mountain
- train passenger
- ripe corn
- buried fossil
- house to build
- broken-down boat
- full bins

There is no failing and no dying.

## Code

Plain JavaScript and canvas, no build step and no dependencies at runtime.

- `js/world/` holds the tile world. That's the generator, the chunk-cached renderer, falling sand, flowing water and growing crops, plus fire and water spray. `away.js` swaps Earth out for trips to the Moon (`moon.js`), the Pilbara (`pilbara.js`, which also runs the mine steps), Pirate Island (`pirate.js`) and Melbourne (`melbourne.js`). `ramps.js` is the jump ramps. `wild.js` builds and runs the jungle, volcano mountain, desert and snowy mountain.
- `js/entities/` holds the dinos, the player, NPCs and the vehicle base class. Each vehicle is in `vehicles/*.js`. To add one, call `defVehicle(...)` and list it in `registry.js`.
- `js/jobs.js` holds the job system. `js/asteroid.js` is the 10-minute clock, `js/chess.js` the chess game.
- The title screen shows `GAME_VERSION` and `RELEASE_DATE` from `js/core.js`. Bump them with each release.
- `js/ui/` holds the menus and HUD.
- `js/save.js` saves to localStorage. It stores the world seed plus only the tiles that changed. Changing the world's size or layout needs a new `Save.V`, so old saves start fresh instead of loading into the wrong places.

## Tests

```
npm install
npx playwright install chromium
npm test
```

`npm run playtest` runs a bot that plays like a 5-year-old (mashing buttons, wandering, calling vehicles, chasing jobs) for 5 minutes per dinosaur and reports bugs, stuck spots and how often rewards come.

`npm run glitch` hunts for glitches (about 10 minutes). It mashes buttons with every dino and every vehicle, leaves mid-trip (jet, rocket, voyage, blast), starts fights and the swarm, builds and smashes, reloads mid-game and changes screen size. After every frame it checks for:
- positions that aren't numbers;
- dinos, vehicles or you stuck in walls or fallen out of the world;
- seat mix-ups;
- the camera losing you;
- effects or dinos piling up;
- slow frames.

`tests/smoke.mjs` plays the game headless and checks:
- walking, digging and building;
- saving and reloading;
- every vehicle;
- the rocket trip;
- a fire job;
- the touch buttons.
