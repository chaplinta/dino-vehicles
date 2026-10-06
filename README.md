# Dino Vehicles

A side-on sandbox game for young kids (made for a 5-year-old). Pick a dinosaur, then drive, dig and build in a big world full of other dinos doing their jobs.

No reading needed: every menu is pictures, and the game talks (browser speech).

## Play

**Play now: https://chaplinta.github.io/dino-vehicles/** (on a phone, hold it sideways; use Share → Add to Home Screen for a full-screen app).

Open `index.html` in a modern browser (Chrome, Safari, Edge, Firefox). No install or server needed. It also works from GitHub Pages and on tablets. Use "Add to Home Screen" for full screen.

Once loaded from the web link, it works offline: a service worker (`sw.js`) caches every file. Add a new file? List it in `sw.js` and bump `VERSION` (the smoke test checks the list).

Progress saves automatically in the browser. To start a new world (stars and unlocked vehicles are kept), hold the 🌱 button (top left, next to 🏠) for 2 seconds while playing.

### Controls

| | Keyboard | Touch |
|---|---|---|
| Walk / drive | Arrows or WASD | ◀ ▶ ▲ ▼ |
| Jump (automatic at walls) / climb walls | Up | ▲ |
| Fly (Pterodactyl): hold to climb, let go to glide, down to dive | Up / Down | ▲ ▼ |
| Dig / vehicle action | Space | big yellow button |
| Bite, headbutt or tail-whack a dino in front (they run away) | Space | big yellow button turns 🦷 / 💥 / 🌀 |
| Get in / out | E or Enter | 🚪 |
| Roar / horn | R | 🦖 / 📢 |
| Call a vehicle | Q | 📣 |
| Pick a block | 1–6 | block strip at top |
| Dig or build a block | click | tap the world |
| Back | Esc | 🏠 |
| New world (keeps stars) | hold N | hold 🌱 |
| Sound on/off | M | 🔊 |

## The world

From left to right: farm, town (fire station, hospital, police), building site, beach and sea, mountains, then the rocket launch pad. A train line runs the whole way, through tunnels and over a bridge.

Everything except the bedrock at the bottom can be dug. Sparkly stars float around the world to catch (some up high for flyers, some underwater) and come back after a minute. Vehicles bounce over walls they can't drive up, and dinos climb walls by walking into them, so nobody gets stuck. Bones, eggs, gems and fossils are hidden underground and earn stars.

## Dinosaurs

T-Rex, Triceratops, Stegosaurus, Brachiosaurus, Raptor, Ankylosaurus and Pterodactyl. The Pterodactyl really flies, and so do the other pterodactyls in the world. Flying high (Pterodactyl, plane, helicopter) zooms the view out so the ground stays in sight.

## Vehicles

Stars unlock more vehicles. The whistle menu brings any unlocked vehicle to you.

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
| Wrecking ball | swing the ball and smash things |
| Garbage truck | empty the bins |
| Drill | drill straight down for deep treasure |
| Fishing boat | drop and lift the net |
| Submarine | light. Find treasure chests on the sea floor |
| Plane | water the crops while flying (up to take off) |
| Rocket | countdown, blast off to space, catch stars, parachute home |

## Jobs

Jobs pop up now and then, with a voice prompt, a bubble in the world and an arrow at the screen edge. Tap the arrow or the bubble and the right vehicle for the job comes to you:

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

- `js/world/` holds the tile world. That's the generator, the chunk-cached renderer, falling sand, flowing water and growing crops, plus fire and water spray.
- `js/entities/` holds the dinos, the player, NPCs and the vehicle base class. Each vehicle is in `vehicles/*.js`. To add one, call `defVehicle(...)` and list it in `registry.js`.
- `js/jobs.js` holds the job system.
- `js/ui/` holds the menus and HUD.
- `js/save.js` saves to localStorage. It stores the world seed plus only the tiles that changed.

## Tests

```
npm install
npx playwright install chromium
npm test
```

`npm run playtest` runs a bot that plays like a 5-year-old (mashing buttons, wandering, calling vehicles, chasing jobs) for 5 minutes per dinosaur and reports bugs, stuck spots and how often rewards come.

`tests/smoke.mjs` plays the game headless and checks:
- walking, digging and building;
- saving and reloading;
- every vehicle;
- the rocket trip;
- a fire job;
- the touch buttons.
