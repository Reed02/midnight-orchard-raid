/* ===== FARMS, MATERIALS AND GEAR =====
   MATERIALS (MATS): planks, nails, rope ... Raids drop them: every farm has LOOT SPOTS (a sawhorse of planks, a jar shelf, a beehive...) that you search
   by holding the shake key next to them, like shaking a tree. What drops lies on the ground as a pickup (no cheek space needed). Whatever the raccoon
   side picks up comes home at the end of the raid, caught or not (in a crew, everyone gets the crew's haul). Saved as HOME.mats.
   FARMS (SITES): the Orchard is always open; each other farm opens when you build its PROJECT on the World Map (Raid Hut > Solo raid): a handcart opens
   the Lumber Mill, a rope bridge the Greenhouse, a fence gate the Pumpkin Patch, a stile the Bee Meadow. A farm dresses the raid: its own ground, its own
   obstacles and hiding spots (they work like the orchard's stones and bushes), a landmark building, its own farmers, and what its loot spots drop.
   The Bee Meadow has bee swarms round the hives: fly into one and you are stung (the spotted meter jumps and nearby dogs come to look).
   GEAR (GEAR): made at the workbench (village.js) and taken on a raid (one piece, chosen on the map). Tuning lives in the tables below. */
const MATS = {
  planks: { name: 'Planks', icon: 'm_planks' }, nails: { name: 'Copper nails', icon: 'm_nails' }, rope: { name: 'Rope', icon: 'm_rope' }, jar: { name: 'Glass jar', icon: 'm_jar' },
  seeds: { name: 'Seed packet', icon: 'm_seeds' }, pumpkin: { name: 'Pumpkin', icon: 'm_pumpkin' }, honey: { name: 'Honeycomb', icon: 'm_honey' }, wool: { name: 'Wool', icon: 'm_wool' },
  gear: { name: 'Brass gear', icon: 'm_gear', rare: 1 }, thread: { name: 'Silver thread', icon: 'm_thread', rare: 1 },
};
const MAT_IDS = Object.keys(MATS);
const SITES = {
  orchard: { name: 'The Orchard', desc: 'The old apple orchard by the farmhouse. Crates by the trees hold rope, nails and seeds.', pool: ['rope', 'nails', 'seeds'], rare: null, loot: 2, map: [0.44, 0.47],
    art: { loot: 'crate_apples', empty: 'crate_a', home: true } },
  mill: { name: 'Lumber Mill', desc: 'Stacks of fresh timber and a grumpy lumberjack. Sawhorses hold planks and nails.', pool: ['planks', 'planks', 'nails'], rare: 'gear', loot: 3, map: [0.55, 0.2], need: 'cart',
    ground: '#7d6a45', tuft: '#9a8458', tileAlpha: 0.5, art: { stone: 'mill_obstacle', bush: 'mill_hide', loot: 'mill_loot', empty: 'mill_loot_empty', tile: 'mill_tile', landmark: 'landmark_mill', farmer: 'farmer_mill' } },
  greenhouse: { name: 'Greenhouse', desc: 'Warm glass houses full of plants. Shelves of glass jars, and seed packets everywhere.', pool: ['jar', 'jar', 'seeds'], rare: 'thread', loot: 3, map: [0.83, 0.43], need: 'bridge',
    ground: '#4c6a3f', tuft: '#6f8f4f', art: { stone: 'gh_obstacle', bush: 'gh_hide', loot: 'gh_loot', empty: 'gh_loot_empty', tile: 'gh_tile', landmark: 'landmark_greenhouse', farmer: 'farmer_greenhouse' } },
  pumpkin: { name: 'Pumpkin Patch', desc: 'Rows of fat pumpkins under a scarecrow. Pumpkin heaps give pumpkins, seeds and rope.', pool: ['pumpkin', 'pumpkin', 'seeds', 'rope'], rare: 'gear', loot: 3, map: [0.6, 0.84], need: 'gate',
    ground: '#5a4630', tuft: '#6d7a3a', art: { stone: 'pk_obstacle', bush: 'pk_hide', loot: 'pk_loot', empty: 'pk_loot_empty', tile: 'pk_tile', landmark: 'landmark_barn', farmer: 'farmer_pumpkin', extra: 'pk_scarecrow' } },
  meadow: { name: 'Bee Meadow', desc: 'Wildflowers, sheep and beehives. Hives give honeycomb and wool - mind the bees.', pool: ['honey', 'wool', 'honey', 'wool'], rare: 'thread', loot: 3, map: [0.13, 0.72], need: 'stile', bees: true,
    ground: '#5f8a3c', tuft: '#7fae4c', art: { stone: 'md_obstacle', bush: 'md_hide', loot: 'md_loot', empty: 'md_loot_empty', tile: 'md_tile', landmark: 'landmark_shed', farmer: 'farmer_meadow' } },
};
const SITE_IDS = Object.keys(SITES);
const PROJECTS = {
  cart:   { name: 'Handcart', opens: 'mill', cost: { apples: 40, rope: 3, nails: 4 }, art: ['cart_broken', 'cart'], desc: 'Fix the old handcart and you can haul timber home from the Lumber Mill.' },
  bridge: { name: 'Rope bridge', opens: 'greenhouse', cost: { apples: 80, rope: 6, planks: 6 }, art: ['bridge_broken', 'bridge_rope'], desc: 'Restring the rope bridge over the river to reach the Greenhouse.' },
  gate:   { name: 'Fence gate', opens: 'pumpkin', cost: { apples: 80, planks: 6, nails: 6 }, art: ['gate_broken', 'gate'], desc: 'Mend the fallen gate on the south road to the Pumpkin Patch.' },
  stile:  { name: 'Stile', opens: 'meadow', cost: { apples: 120, planks: 8, rope: 4, jar: 2 }, art: ['stile_broken', 'stile'], desc: 'Build steps over the old stone wall to climb into the Bee Meadow.' },
};
const GEAR = {
  sack:   { name: 'Apple sack', icon: 'g_sack', desc: 'When you are caught you keep half of what is in your cheeks.', cost: { apples: 30, rope: 2, seeds: 1 } },
  sling:  { name: 'Slingshot', icon: 'g_sling', desc: 'Press the whistle key (F) to fire: a farmer\'s lantern goes out for a few seconds, a dog is dazed.', cost: { apples: 40, planks: 2, rope: 2 } },
  pepper: { name: 'Pepper pouch', icon: 'g_pepper', desc: 'Once a night, a dog that catches you sneezes instead and is dazed.', cost: { apples: 40, seeds: 3, jar: 1, pumpkin: 1 } },
  socks:  { name: 'Soft paw socks', icon: 'g_socks', desc: 'Quiet steps: dogs smell you from less far, and your footprints fade fast.', cost: { apples: 50, wool: 3, thread: 1 } },
  pouch:  { name: 'Cheek pouch', icon: 'g_pouch', desc: 'Carry one more apple.', cost: { apples: 50, wool: 2, rope: 2, honey: 1 } },
};
const GEAR_TUNE = { slingCd: 9, slingSpeed: 520, slingRange: 320, lanternOut: 4.5, dogDaze: 2.5, pepperDaze: 3, socksSniff: 0.72, beeAlert: 0.32, beeRange: 26, lootTime: 1.2, rareChance: 0.12 };
function farmLoad() {                                       // the new parts of the save (old saves get them empty)
  HOME.mats = HOME.mats && typeof HOME.mats === 'object' ? HOME.mats : {}; MAT_IDS.forEach(k => { HOME.mats[k] = Math.max(0, Math.floor(+HOME.mats[k] || 0)); });
  HOME.proj = HOME.proj && typeof HOME.proj === 'object' ? HOME.proj : {}; if (!SITES[HOME.site] || !siteOpen(HOME.site)) HOME.site = 'orchard';
  HOME.gear = Object.assign({ owned: [], on: null }, HOME.gear || {}); HOME.gear.owned = (Array.isArray(HOME.gear.owned) ? HOME.gear.owned : []).filter(g => GEAR[g]); if (!HOME.gear.owned.includes(HOME.gear.on)) HOME.gear.on = null;
}
const siteOpen = id => id === 'orchard' || !!(SITES[id] && SITES[id].need && HOME.proj && HOME.proj[SITES[id].need]);
const haveAll = cost => Object.entries(cost).every(([k, n]) => (k === 'apples' ? HOME.apples : HOME.mats[k] || 0) >= n);
function spendAll(cost) { if (!haveAll(cost)) return false; for (const [k, n] of Object.entries(cost)) { if (k === 'apples') HOME.apples -= n; else HOME.mats[k] -= n; } homeSave(); return true; }
const matIcon = (k, s = 22) => { const m = MATS[k], src = m && ICON_SRC[m.icon]; return src ? `<img class="mati" src="${src}" width="${s}" height="${s}" alt="${esc(m.name)}" title="${esc(m.name)}">` : ''; };
function costHtml(cost) {                                    // "40 apples  [rope] 2/3  [nails] 4/4" (red when short)
  return Object.entries(cost).map(([k, n]) => { const have = k === 'apples' ? HOME.apples : HOME.mats[k] || 0, ok = have >= n;
    return `<span class="cost${ok ? '' : ' short'}">${k === 'apples' ? '<span class="appl">&#127822;</span>' : matIcon(k)}${k === 'apples' ? n : Math.min(have, n) + '/' + n}</span>`; }).join(' ');
}
function payMats(m) { if (!m || typeof m !== 'object') return; let any = false; for (const k of MAT_IDS) { const n = Math.max(0, Math.min(99, Math.floor(+m[k] || 0))); if (n) { HOME.mats[k] = (HOME.mats[k] || 0) + n; any = true; } } if (any) homeSave(); }
const matsText = m => MAT_IDS.filter(k => m && m[k] > 0).map(k => m[k] + ' ' + MATS[k].name.toLowerCase()).join(', ');
farmLoad();
/* ----- in a raid ----- */
let SITE = SITES.orchard, siteId = 'orchard', runMats = {}, matItems = [], shots = [];
function setSite(id) { siteId = SITES[id] ? id : 'orchard'; SITE = SITES[siteId]; }
const raidSite = () => daily ? 'orchard' : (multi && !isHost) ? siteId : (siteOpen(HOME.site) ? HOME.site : 'orchard');
function siteLayout() {                                      // after the orchard layout: the farm's loot spots and its landmark (host)
  const spot = (pad, denD, yMin = 110) => { for (let n = 0; n < 160; n++) { const x = lrnd(70, W - 70), y = lrnd(yMin, H - 40); if (Math.hypot(x - den.x, y - den.y) > denD && clearSpot(x, y, pad) && !obs.some(o => Math.hypot(o.x - x, o.y - y) < o.r + pad)) return { x, y }; } return null; };
  if (SITE.art.landmark) for (let n = 0; n < 80; n++) {        // the landmark: a clear patch far from the den (scenery in the way is cleared off)
    const x = lrnd(190, W - 190), y = lrnd(270, H - 50); if (Math.hypot(x - den.x, y - den.y) < 340 || (RIVER && (inRiverM(x, y, 120) || bridgeAt(x, y, 140)))) continue;
    obs = obs.filter(o => Math.hypot(o.x - x, o.y - y) > o.r + 95); obs.push({ k: 'landmark', x, y, r: 66 }); break; }
  for (let i = 0; i < SITE.loot; i++) { const p = spot(40, 150); if (p) obs.push({ k: 'loot', x: p.x, y: p.y, r: 20 }); }
  if (SITE.art.extra) { const p = spot(30, 150); if (p) obs.push({ k: 'extra', x: p.x, y: p.y, r: 14 }); }
}
function nearShake(range) {                                  // the tree or loot spot to shake / search
  let best = null, bd = 1e9;
  for (const o of obs) if (o.k === 'tree' || o.k === 'loot') { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r + range && d < bd) { best = o; bd = d; } }
  return best;
}
function lootDrop(o) {                                       // a loot spot finished: 1-2 materials (sometimes a rare one) land around it
  o.cd = 1e9; o.shakeP = 0; stat('searches'); const n = Math.random() < 0.45 ? 2 : 1;
  for (let i = 0; i < n; i++) { let id = SITE.pool[Math.floor(Math.random() * SITE.pool.length)]; if (SITE.rare && Math.random() < GEAR_TUNE.rareChance) id = SITE.rare;
    const a = Math.random() * 6.283; matItems.push({ x: clampN(o.x + Math.cos(a) * 34, 40, W - 40), y: clampN(o.y + 30 + Math.sin(a) * 18, 70, H - 30), id, fall: 0.45 + i * 0.15 }); }
  pop(o.x, o.y - 60, 'searched!', '#c9e7ff', true); if (pvp() && !MODX.quiet) pop(o.x, o.y - 80, 'rustle!', '#ffd23f', true);
}
function matsPickup() {                                      // host, with a raccoon loaded: grab the materials it touches
  if (P.tree || airborne()) return;
  for (let i = matItems.length - 1; i >= 0; i--) { const m = matItems[i]; if (m.fall > 0 || Math.hypot(m.x - P.x, m.y - (P.y - 14)) > 30) continue;
    matItems.splice(i, 1); runMats[m.id] = (runMats[m.id] || 0) + 1; stat('mats'); pop(m.x, m.y - 10, '+1 ' + MATS[m.id].name.toLowerCase(), MATS[m.id].rare ? '#ffd23f' : '#c9e7ff'); }
}
function farmTick(dt) {                                      // host, once a frame: falling pickups, slingshot pebbles, lanterns coming back on, bees
  matItems.forEach(m => { m.fall = Math.max(0, m.fall - dt); });
  farmers.forEach(f => { if (f.dark > 0) f.dark = Math.max(0, f.dark - dt); });
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.d += Math.hypot(s.vx, s.vy) * dt; let hit = null;
    for (const f of farmers) if (Math.hypot(f.x - s.x, f.y - 30 - s.y) < 26) { f.dark = GEAR_TUNE.lanternOut; hit = 'Lights out!'; break; }
    if (!hit) for (const d of dogs) if (Math.hypot(d.x - s.x, d.y - 20 - s.y) < 24) { d.stun = Math.max(d.stun || 0, GEAR_TUNE.dogDaze); d.chase = false; hit = 'dazed!'; break; }
    if (!hit && obs.some(o => solid(o) && o.k !== 'loot' && Math.hypot(o.x - s.x, o.y - 8 - s.y) < o.r)) hit = 'thunk';
    if (hit || s.d > GEAR_TUNE.slingRange || s.x < 0 || s.x > W || s.y < 0 || s.y > H) { shots.splice(i, 1); if (hit && hit !== 'thunk') { pop(s.x, s.y - 20, hit, '#ffd23f', true); stat('slingHits'); } }
  }
  if (SITE.bees) beeTick(dt);
}
const beeSwarms = () => obs.filter(o => o.k === 'loot').map((o, i) => ({ x: o.x + Math.cos(t * 1.3 + i * 2) * 46, y: o.y - 10 + Math.sin(t * 1.7 + i * 2) * 26, i }));
function beeTick(dt) {                                       // host: a raccoon flying into a swarm is stung (the spotted meter jumps, dogs nearby come to look)
  const sw = beeSwarms(); const each = fn => COOP ? RS.forEach((R, i) => { if (!R.gone && !(R.down > 0)) withSlot(i, fn); }) : fn();
  each(() => { if (P.tree || inv > 0 || (P.stungT || 0) > t) return; const s = sw.find(b => Math.hypot(b.x - P.x, b.y - (P.y - 20)) < GEAR_TUNE.beeRange); if (!s) return;
    P.stungT = t + 2.5; alertV = Math.min(0.95, alertV + GEAR_TUNE.beeAlert); startleT = 0.6; stat('stings'); pop(P.x, P.y - 70, 'Stung!', '#ffb347', true);
    dogs.forEach(d => { if (Math.hypot(d.x - P.x, d.y - P.y) < 380) { d.search = { x: P.x, y: P.y, t: 5 }; d.wt = 0; } }); });
}
/* ----- gear in a raid ----- */
function gearOf() {                                          // the gear of the raccoon whose slot is loaded
  if (!multi) return daily ? null : HOME.gear.on;
  if (COOP) return cur === mySlot ? HOME.gear.on : (RS[cur] && RS[cur].gear) || null;
  return myRole === 'raccoon' ? HOME.gear.on : net.theirGear || null;
}
const carryMax = () => S.carry + (gearOf() === 'pouch' ? 1 : 0);
const sniffMul = () => gearOf() === 'socks' ? GEAR_TUNE.socksSniff : 1;
function gearCaughtKeep() { return gearOf() === 'sack' ? carry.slice(0, Math.floor(carry.length / 2)) : []; }       // what the apple sack saves from a catch
function pepperSave(d) {                                     // a dog reached you: the pepper pouch makes it sneeze (once a night)
  if (gearOf() !== 'pepper' || P.peppered) return false; P.peppered = 1; d.stun = GEAR_TUNE.pepperDaze; d.chase = false; inv = Math.max(inv, 1); pop(d.x, d.y - 50, 'Achoo!', '#ffd23f', true); stat('sneezes'); return true;
}
function fireSling() {                                       // host, raccoon slot loaded
  if (gearOf() !== 'sling' || P.tree || slam) return; if ((P.slingT || 0) > t) return; P.slingT = t + GEAR_TUNE.slingCd;
  const d = dir || { x: P.face || 1, y: 0 }; shots.push({ x: P.x + d.x * 16, y: P.y - 26 + d.y * 10, vx: d.x * GEAR_TUNE.slingSpeed, vy: d.y * GEAR_TUNE.slingSpeed, d: 0 }); sfxAt('whiff', P.x, P.y, 400);
}
/* ----- drawing ----- */
const WIMG = {};
const wImg = k => { const a = typeof WORLD_SRC !== 'undefined' && WORLD_SRC[k]; if (!a) return null; if (!WIMG[k]) { const im = new Image(); im.src = a.src; WIMG[k] = im; } return WIMG[k].complete && WIMG[k].naturalWidth ? WIMG[k] : null; };
function siteImg(k) { return SITE.art.home ? homeImg(k) : wImg(k); }
function drawSiteThing(o) {                                  // a farm's stone / bush / loot spot / landmark (false = draw it the orchard way)
  if (state === 'home' || !SITE) return false; const A = SITE.art;
  const key = o.k === 'stone' ? A.stone : o.k === 'bush' ? A.bush : o.k === 'loot' ? (o.cd > 0 ? A.empty : A.loot) : o.k === 'landmark' ? A.landmark : o.k === 'extra' ? A.extra : null;
  if (!key) return false; const im = o.k === 'loot' ? siteImg(key) : wImg(key); if (!im) return o.k !== 'stone' && o.k !== 'bush';
  const w = im.naturalWidth, h = im.naturalHeight; shadow(o.x, o.y + 2, Math.min(w * 0.36, 70)); g.imageSmoothingEnabled = false; g.drawImage(im, Math.round(o.x - w / 2), Math.round(o.y + 6 - h), w, h);
  if (o.k === 'loot' && !(o.cd > 0) && Math.floor(t * 2 + o.x) % 3 === 0) { g.fillStyle = 'rgba(255,255,220,.85)'; g.fillRect(o.x + w * 0.2, o.y - h * 0.6, 3, 3); }     // a twinkle: something to find
  return true;
}
let groundPat = null, groundPatKey = '';
function drawSiteGround() {                                  // the farm's ground (world coords, before anything else); false = the orchard's green
  if (!SITE || !SITE.ground) return false; g.fillStyle = SITE.ground; g.fillRect(0, 0, W, H);
  const tile = wImg(SITE.art.tile); if (tile) {
    if (groundPatKey !== siteId) { const mk = (sz, flip) => { const c = document.createElement('canvas'); c.width = c.height = sz; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; if (flip) { x.translate(sz, 0); x.scale(-1, 1); } x.drawImage(tile, 0, 0, sz, sz); return g.createPattern(c, 'repeat'); };
      groundPat = [mk(256, false), mk(352, true)]; groundPatKey = siteId; }
    g.save(); g.globalAlpha = SITE.tileAlpha || 1; g.fillStyle = groundPat[0]; g.fillRect(0, 0, W, H); g.globalAlpha = 0.22 * (SITE.tileAlpha || 1); g.translate(117, 61); g.fillStyle = groundPat[1]; g.fillRect(-117, -61, W, H); g.restore();      // the seamless tile, and a bigger mirrored copy over it: no visible repeat
  }
  if (!tile) { g.fillStyle = SITE.tuft; tufts.forEach(u => { g.fillRect(u.x, u.y, 3, 7); g.fillRect(u.x + 5, u.y + 2, 3, 5); }); } return true;      // the tile has its own detail
}
function drawMatItems() {
  for (const m of matItems) { const im = iconImg(MATS[m.id].icon), b = Math.sin((t + m.x) * 3) * 2, lift = (m.fall / 0.45) * 50; shadow(m.x, m.y + 10, 10);
    if (im && im.complete && im.naturalWidth) { g.imageSmoothingEnabled = true; g.drawImage(im, m.x - 14, m.y - 18 + b - lift, 28, 28); g.imageSmoothingEnabled = false; } }
}
function drawBees() {
  if (!SITE.bees) return; const f = Math.floor(t * 8) % 4, im = wImg('bees_' + f); if (!im) return;
  beeSwarms().forEach(b => { g.drawImage(im, Math.round(b.x - 24), Math.round(b.y - 40), 48, 48); });
}
function drawShots() { g.fillStyle = '#d9cbb0'; shots.forEach(s => { g.beginPath(); g.arc(s.x, s.y, 3.5, 0, 7); g.fill(); }); }
function siteFarmerImg(f) { return !f.human && SITE && SITE.art.farmer ? wImg(SITE.art.farmer) : null; }
/* ----- multiplayer: what the guest needs to see ----- */
function farmSnap() { const r = Math.round; return { mi: matItems.map(m => [r(m.x), r(m.y), MAT_IDS.indexOf(m.id), +m.fall.toFixed(2)]), rm: runMats, sh: shots.map(s => [r(s.x), r(s.y)]), fd: farmers.map(f => f.dark > 0 ? 1 : 0) }; }
function applyFarmSnap(s) {
  if (!s || typeof s !== 'object') return;
  matItems = (Array.isArray(s.mi) ? s.mi : []).slice(0, 40).map(a => ({ x: num(a[0]), y: num(a[1]), id: MAT_IDS[num(a[2])] || 'rope', fall: num(a[3]) }));
  runMats = {}; if (s.rm && typeof s.rm === 'object') MAT_IDS.forEach(k => { const n = Math.floor(+s.rm[k] || 0); if (n > 0) runMats[k] = Math.min(99, n); });
  shots = (Array.isArray(s.sh) ? s.sh : []).slice(0, 10).map(a => ({ x: num(a[0]), y: num(a[1]), vx: 0, vy: 0, d: 0 }));
  if (Array.isArray(s.fd)) s.fd.forEach((v, i) => { if (farmers[i]) farmers[i].dark = v ? 1 : 0; });
}
function drawRunMats() {                                     // HUD: what this raid has found so far (under the top bar, right)
  const ks = MAT_IDS.filter(k => runMats[k] > 0); if (!ks.length || viewRole() !== 'raccoon') return; g.save(); g.font = 'bold 12px "Trebuchet MS",Verdana,sans-serif'; g.textBaseline = 'middle';
  let x = VW - 10; for (let i = ks.length - 1; i >= 0; i--) { const k = ks[i], im = iconImg(MATS[k].icon), txt = String(runMats[k]), w = 22 + g.measureText(txt).width + 6; x -= w; g.fillStyle = 'rgba(10,18,30,.75)'; g.fillRect(x, VH - 34, w - 3, 24);
    if (im && im.complete && im.naturalWidth) { g.imageSmoothingEnabled = true; g.drawImage(im, x + 2, VH - 33, 22, 22); g.imageSmoothingEnabled = false; } g.fillStyle = MATS[k].rare ? '#ffd23f' : '#fff7e6'; g.fillText(txt, x + 24, VH - 22); }
  g.restore();
}
function drawGearChip() {                                    // HUD: the slingshot's cooldown (other gear is passive)
  if (viewRole() !== 'raccoon' || gearOf() !== 'sling' || state !== 'play') return; const left = Math.max(0, (P.slingT || 0) - t), txt = (isTouch ? 'Sling' : kn('whistle') + ': sling') + (left > 0 ? ' ' + Math.ceil(left) : ' ready');
  g.save(); g.font = 'bold 12px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 16; g.fillStyle = 'rgba(40,30,10,.8)'; g.fillRect(8, 124, w, 20); g.fillStyle = left > 0 ? '#cbb' : '#ffd23f'; g.textBaseline = 'middle'; g.fillText(txt, 16, 134.5); g.restore();
}
function farmPick() {                                       // host lobby: which farm the raid is at (the farms this player has opened)
  const open = SITE_IDS.filter(siteOpen); if (open.length < 2) return '';
  return `<div class="row"><span class="lbl">Farm:</span><select onchange="HOME.site=this.value;homeSave()">${open.map(id => `<option value="${id}"${HOME.site === id ? ' selected' : ''}>${esc(SITES[id].name)}</option>`).join('')}</select></div>`;
}
