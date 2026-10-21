
/* =====================================================================
   MIDNIGHT ORCHARD RAID
   1. SETTINGS  - tweak numbers here (balance, difficulty, scoring)
   2. UPGRADES  - add or edit the perks offered between nights
   3. GAME CODE - state, update, drawing, screens
   Images live in the last <script> at the bottom of this file (ASSETS).
   ===================================================================== */

/* ---------- 1. SETTINGS ---------- */
const CONFIG = {
  view:  { width: 800, height: 560 },        // what you see (canvas size)
  world: { width: 1200, height: 840 },       // the whole orchard; the camera follows the raccoon
  nightsToWin: 7,                            // survive this many nights to win (you can keep going afterwards)
  ratings: [['Bronze', 0], ['Silver', 700], ['Gold', 1400]],   // win-screen rating by score (rough guesses: tune after playing)
  player:  { speed: 220, carry: 3, carrySlow: 0.06,   // slowdown per carried apple (0.06 = 6%)
             spriteFacesRight: false,                  // which way the raccoon pictures look: false = left (flipped to face where he walks), true = right
             dashSpeed: 640, dashTime: 0.16, dashCooldown: 2.4,
             alertTime: 0.8,                           // seconds in the flashlight before you are caught
             hearts: 3, invulnerable: 2 },             // seconds of safety after being caught
  apples:  { groundPerNight: 10,       // ground apples you may pick up per night; after that, shake trees
             groundMax: 7,             // ground apples lying around at once
             spawnEvery: 1.4, goldChance: 0.2, goldValue: 3,   // golden apples only come from shaking
             fallTime: 0.45 },
  shake:   { time: 1.8,                // seconds of holding E to finish one shake
             range: 36,                // how close to a trunk you must stand
             apples: [2, 4],           // apples dropped per shake (min, max); each can be golden
             cooldown: 18,             // seconds before the same tree can be shaken again
             decay: 0.5,               // progress lost per second if you let go
             noiseRange: 260 },        // dogs this close hear the shaking and come running
  climb:   { range: 40, maxTime: 6, cooldown: 2 },       // hide up a tree from dogs (farmers can still see you)
  slam:    { radius: 130, stun: 4, time: 0.28, missRecovery: 0.7 },   // Space while up a tree
  multiplayer: { sendHz: 20,           // snapshots per second the host sends to the guest
                 // --- the human farmer ---
                 farmerSpeed: 165,     // walking speed (the raccoon walks at 220, and slower when stuffed with apples)
                 sprintSpeed: 235, sprintTime: 1.6, sprintCooldown: 7,   // farmer sprint (the dash key)
                 coneLength: 260, coneHalfAngle: 0.65,    // the human farmer's flashlight is bigger than the AI farmers' (190, 0.45)
                 seeRadius: 110, dogSeeRadius: 60,        // dim circle around the farmer, and around each dog
                 trackRange: 170, trackLife: 5, trackEvery: 0.26,   // raccoon footprints: how near the farmer must be, how long they last, and how often a print is left
                 bushErase: 0.9, bushScuffEvery: 0.5, bushSearch: 60,   // a bush swallows the last steps of the trail and leaves false marks around itself; a farmer who walks right up to it can still find the raccoon inside
                 touchRange: 30,                          // the farmer catches the raccoon by grabbing it from this close
                 closeBonus: 0.5, stackCap: 2.2,          // light catches faster up close, and when several farmers shine on the raccoon
                 // --- help and balance ---
                 aiFarmers: n => Math.min(3, 1 + Math.floor((n - 1) / 2)),   // AI farmers that patrol alongside the human, on night n
                 raccoonHearts: 4,
                 turnRate: 10,                            // how fast the human farmer's light turns to face the direction of travel
                 dogSightRadius: 110,                     // a dog this close to the raccoon (or chasing it) shows the raccoon to the farmer
                 grid: { cols: 3, rows: 2, cooldown: 3, searchTime: 14, sniffBonus: 1.4, callRadius: 170 },   // map grid: send the dogs to sweep one square
                 whistleCooldown: 6, whistleRange: 190, searchTime: 7 },     // whistle: dogs and AI farmers search the spot ahead of the light
  network: { peerServer: null, iceServers: null,        // multiplayer connection: null = the free PeerJS cloud and its default relay servers (set your own here if it is ever unreliable)
             attemptMs: 8000, attempts: 4, retryGapMs: 1500 },   // a guest tries the host this many times before giving up
  farmer:  { speed: 70, coneLength: 190, coneHalfAngle: 0.45, sweep: 0.5 },
  dog:     { speed: 135, sniffRange: 170, bushRange: 45 },
  den:     { x: 110, y: 740, radius: 48,                // deposit apples here (x, y are only a fallback: the den is placed at random)
             moveSingle: 'night', moveMulti: 'deposit',  // when it moves: 'never', 'night' (new spot each night) or 'deposit' (after every deposit)
             minJump: 420, margin: 90, farmerClearance: 260 },   // a new den is this far from the old one and the map edge, and (if possible) from the farmers
  scenery: { tree: 12, stone: 9, bush: 12 },             // how many of each per night
  spriteHeight: { farmer: 66, dog: 50 },              // on-screen height of the farmer and dog
  treeHeight: 84,                                      // on-screen height of the rustling tree
  sizeScale: 0.8,                                      // draw size of trees/bushes/stones
  bankScore: n => n * (n + 1) / 2,                     // points for banking n apples at once (greed pays)
  timeBonus: 2,                                        // points per second left at dawn
  // Difficulty per night (n = 1, 2, 3 ...). The last night (nightsToWin) is a harder finale.
  // Co-op crew (two raccoons): harder nights to match two players, and a shared pool of hearts. A caught raccoon goes DOWN; its friend can revive it by standing next to it.
  coop: { hearts: 5, quotaMul: 1.6, extraTime: 10, extraFarmers: 1, extraDogs: 1, downTime: 8, reviveTime: 1.2, reviveRange: 46 },
  night: n => { const fin = n === CONFIG.nightsToWin ? 1 : 0;
    return { quota: 6 + n * 2 + fin * 4, time: 70 + n * 5 + fin * 10,
             farmers: Math.min(4, 1 + Math.floor(n / 2)),
             dogs: (n < 3 ? 0 : Math.min(3, 1 + Math.floor((n - 3) / 2))) + fin }; },
};

/* ---------- 2. UPGRADES (pick 1 of 3 after each night) ---------- */
const UPGRADES = [
  { name: 'Big Cheeks',  desc: 'Carry +2 apples',        apply: s => s.carry += 2 },
  { name: 'Fast Paws',   desc: 'Move 10% faster',        apply: s => s.speed *= 1.1 },
  { name: 'Quick Dash',  desc: 'Dash recharges 25% faster', apply: s => s.dashCd *= 0.75 },
  { name: 'Thick Fur',   desc: 'Slower to get spotted',  apply: s => s.alert *= 1.35 },
  { name: 'Lucky Nose',  desc: 'More golden apples',     apply: s => s.gold += 0.1 },
  { name: 'Strong Arms', desc: 'Shake trees 30% faster', apply: s => s.shakeT *= 0.7 },
  { name: 'Extra Heart', desc: '+1 heart now',           apply: s => { s.hearts++; hearts++; } },
];

const FARMER_UPGRADES = [                                    // multiplayer: the farmer also picks 1 of 3 after each night (small steps, so neither side runs away with it)
  { name: 'Long Beam',      desc: 'Flashlight reaches 20% farther',        apply: f => f.coneLen = Math.min(420, f.coneLen * 1.2) },
  { name: 'Wide Beam',      desc: 'Flashlight is a bit wider',             apply: f => f.coneHalf = Math.min(0.9, f.coneHalf + 0.07) },
  { name: 'Quick Boots',    desc: 'Walk and sprint 8% faster',             apply: f => { f.speed = Math.min(215, f.speed * 1.08); f.sprintSpeed = Math.min(300, f.sprintSpeed * 1.08); } },
  { name: 'Second Wind',    desc: 'Sprint recharges 25% faster',           apply: f => f.sprintCd = Math.max(3, f.sprintCd * 0.75) },
  { name: 'Silver Whistle', desc: 'Whistle and dog orders recharge faster', apply: f => { f.whistleCd = Math.max(2.5, f.whistleCd * 0.7); f.orderCd = Math.max(1.5, f.orderCd * 0.7); } },
  { name: 'Good Nose',      desc: 'Footprints last longer and show from farther', apply: f => { f.trackLife += 1.2; f.trackRange += 40; } },
  { name: 'Hound Handler',  desc: 'Dogs smell the raccoon from farther',   apply: f => f.dogSniff = Math.min(1.8, f.dogSniff * 1.2) },
  { name: 'Night Eyes',     desc: 'A bigger glow around you',              apply: f => f.seeRadius += 30 },
];

/* ---------- KEY BINDINGS (defaults; players change them from the title screen, saved per browser) ----------
   Each action has two slots. Names are lower-case key names: 'w', 'arrowup', ' ' (space), 'shift' ... */
const DEFAULT_KEYS = {
  up:    ['w', 'arrowup'],    down:  ['s', 'arrowdown'],
  left:  ['a', 'arrowleft'],  right: ['d', 'arrowright'],
  shake: ['e', ''],           climb: ['c', ''],
  dash:  [' ', 'shift'],
  whistle: ['f', ''],         // farmer only (multiplayer)
  map:   ['m', ''],           // farmer only: show / hide the map
  mute:  ['n', ''],           // mute / unmute all sound
  call:  ['g', ''],           // farmer only: send the dogs to where the raccoon was last seen
  pause: ['p', 'escape'],     // pause (single player)
  aim:   ['q', ''],           // farmer only: hold to aim the light with the mouse (it normally follows where you walk)
  item:  ['r', ''],           // use your packed keepsake (once per raid)
  quest: ['t', ''],           // read tonight's quest again
};
const KEY_LABELS = { quest: 'Show tonight\'s quest', item: 'Use keepsake', up: 'Up', down: 'Down', left: 'Left', right: 'Right', shake: 'Shake tree', climb: 'Climb', dash: 'Dash / sprint', whistle: 'Whistle (farmer)', call: 'Call dogs (farmer)', aim: 'Aim light (farmer)', map: 'Map (farmer)', mute: 'Mute', pause: 'Pause' };

