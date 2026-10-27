/* ===== FINDS, THE SATCHEL AND KEEPSAKES =====
   Finds are small one-use items. A strange light, a finished night challenge or a Daily Orchard puts one in your SATCHEL (saved in this browser).
   Before a raid, pack ONE find from the satchel: it becomes your KEEPSAKE for that raid and you press the item key (R) to use it - once. A used
   keepsake is gone, so you have to go and find more. A keepsake you never used goes back into the satchel when the raid ends.
   Add a find by adding one entry to DISCOVERIES (raccoon) or FARMER_FINDS (farmer): its use() runs when the player presses the key.
   rarity: common / uncommon / rare (how often it turns up).  where: any | river | late | badge | daily (which sources can give it, see WHERES).
   Keep the order of the lists: multiplayer sends a find as its position in the list. */
const RARITY = { common: { w: 60, label: 'Common', col: '#bfe8a8' }, uncommon: { w: 28, label: 'Uncommon', col: '#8fd0ff' }, rare: { w: 12, label: 'Rare', col: '#ffb86b' } };
const WHERES = { any: 'any strange light', river: 'strange lights on river nights', late: 'strange lights from night 4 on', badge: 'finishing a night challenge', daily: 'finishing a Daily Orchard (night 3+)' };
/* ----- the effects' shared state (reset when a raid starts / a night starts) ----- */
let freezeUntil = 0, magnetUntil = 0, appleSenseUntil = 0, revealUntil = 0, coneBuff = 1, sniffBuff = 1, drainMul = 1, bankMul = 1, midasLeft = 0, luckyShakes = 0, BUFFS = [];
function buff(secs, apply, undo) { apply(); BUFFS.push({ until: secs === Infinity ? Infinity : t + secs, undo }); }      // a timed change that undoes itself
function buffsTick() { for (let i = BUFFS.length - 1; i >= 0; i--) if (t >= BUFFS[i].until) { BUFFS[i].undo(); BUFFS.splice(i, 1); } }
function buffsClear() { BUFFS.forEach(b => b.undo()); BUFFS = []; }
function itemNight() { chain = 0; buffsClear(); freezeUntil = magnetUntil = appleSenseUntil = revealUntil = 0; coneBuff = sniffBuff = drainMul = bankMul = 1; }   // a new night: everything timed is over
function itemRun() { itemNight(); midasLeft = luckyShakes = 0; }
const sBuff = (key, mul, secs) => buff(secs, () => { S[key] *= mul; }, () => { S[key] /= mul; });
const fBuff = (key, mul, secs) => buff(secs, () => { FS[key] *= mul; }, () => { FS[key] /= mul; });
const toDen = () => { P.tree = null; slam = null; P.x = den.x + 40; P.y = den.y - 30; bumpEpoch(); };
const DISCOVERIES = [
  { id: 'silver',  name: 'Silver Apple',      rarity: 'uncommon', where: 'any',   desc: 'A pale apple that hums. Worth 10 when you bank it.',            lore: 'It hums at night. Nobody has ever dared to take a bite.',                  use: () => { carry.push(10); } },
  { id: 'crow',    name: "Crow's Coin",       rarity: 'uncommon', where: 'any',   desc: 'A crow trades you some extra time: +15 seconds tonight.',       lore: 'Crows keep everything shiny. This was payment for a favour.',                use: () => { time += 15; } },
  { id: 'moth',    name: 'Moth Lantern',      rarity: 'uncommon', where: 'any',   desc: 'Moths gather at the trees: every shake gives +2 apples tonight.', lore: 'The moths follow the glow, and the glow follows the trees.',               use: () => { mothNight = true; } },
  { id: 'scare',   name: "Scarecrow's Charm", rarity: 'uncommon', where: 'any',   desc: 'The dogs ignore you for 15 seconds.',                           lore: 'Pinned to the old scarecrow, who has seen things and says nothing.',         use: () => { ignoreDogs = t + 15; } },
  { id: 'compass', name: 'Moon Compass',      rarity: 'uncommon', where: 'any',   desc: 'Shows where every farmer and dog is for 12 seconds.',           lore: 'It points at whatever is hunting you, which beats pointing north.',          use: () => { compassUntil = Math.max(compassUntil, t + 12); } },
  { id: 'acorn',   name: 'Lucky Acorn',       rarity: 'common',   where: 'any',   desc: 'The next 3 trees you shake each drop a golden apple.',          lore: 'Hollis buried it for luck in 1961. The oak it became still drops gold.',     use: () => { luckyShakes += 3; } },
  { id: 'pouch',   name: 'Cheek Pouch',       rarity: 'common',   where: 'any',   desc: 'Carry 3 more apples for the rest of tonight.',                  lore: 'Sewn from a lost mitten. Roomier than it looks.',                           use: () => buff(Infinity, () => { S.carry += 3; }, () => { S.carry -= 3; }) },
  { id: 'berry',   name: 'Berry Juice',       rarity: 'common',   where: 'any',   desc: 'Move 25% faster for 15 seconds.',                               lore: 'Purple, sticky and suspiciously fizzy. Do not ask which berries.',           use: () => sBuff('speed', 1.25, 15) },
  { id: 'dew',     name: 'Dew Cloth',         rarity: 'common',   where: 'any',   desc: 'Empties the spotted meter, and it drains 3x faster for 20 seconds.', lore: 'Wrung out at three in the morning. Cools a racing heart.',             use: () => { alertV = 0; buff(20, () => { drainMul *= 3; }, () => { drainMul /= 3; }); } },
  { id: 'spring',  name: 'Spring Boots',      rarity: 'common',   where: 'any',   desc: 'Dash is ready now, and recharges twice as fast for 30 seconds.', lore: 'Left on a fence post. They bounce a little when nobody is looking.',       use: () => { dashCd = 0; sBuff('dashCd', 0.5, 30); } },
  { id: 'dandelion', name: 'Dandelion Clock', rarity: 'common',   where: 'any',   desc: 'Nearby apples drift toward you for 12 seconds.',                lore: 'Make a wish and blow. The apples listen, just this once.',                  use: () => { magnetUntil = t + 12; } },
  { id: 'mud',     name: 'Mud Pie',           rarity: 'common',   where: 'any',   desc: 'Dogs smell you from half as far for 25 seconds.',               lore: 'Wear it and you smell like the orchard itself. The dogs hate it.',          use: () => buff(25, () => { sniffBuff *= 0.5; }, () => { sniffBuff /= 0.5; }) },
  { id: 'ribbon',  name: 'Blue Ribbon',       rarity: 'common',   where: 'badge', desc: 'A prize ribbon, worth 25 points on the spot.',                  lore: 'Won by a pie at the county fair. You did not win it. You took it.',          use: () => { score += 25; } },
  { id: 'truffle', name: 'Truffle Nose',      rarity: 'uncommon', where: 'any',   desc: 'Arrows point to every apple for 15 seconds.',                   lore: 'A pig lent it to you for the night. He wants it back.',                     use: () => { appleSenseUntil = t + 15; } },
  { id: 'glass',   name: 'Glass Eye',         rarity: 'uncommon', where: 'any',   desc: 'Flashlights shrink by 40% for 15 seconds.',                     lore: 'Everything the farmer aims at looks a little further away.',                use: () => buff(15, () => { coneBuff *= 0.6; }, () => { coneBuff /= 0.6; }) },
  { id: 'heron',   name: 'Heron Feather',     rarity: 'uncommon', where: 'river', desc: 'A heron carries you (and your apples) straight to the den.',    lore: 'A heron will carry you home if you ask nicely. Herons hate being asked.',    use: () => toDen() },
  { id: 'reed',    name: 'Reed Pipe',         rarity: 'uncommon', where: 'river', desc: 'Calls every dog to a far corner and they ignore you for 8 seconds.', lore: 'A hollow river reed. When it plays, the dogs forget everything.',     use: () => { ignoreDogs = t + 8; const cx = P.x < W / 2 ? W - 120 : 120, cy = P.y < H / 2 ? H - 120 : 140; dogs.forEach(d => { d.search = { x: cx, y: cy, t: 8 }; d.wt = 0; }); } },
  { id: 'midas',   name: 'Midas Moss',        rarity: 'rare',     where: 'any',   desc: 'The next 5 apples you pick up turn golden (worth 3).',          lore: 'It grows where the first golden apple fell. Everything it touches shines.',  use: () => { midasLeft += 5; } },
  { id: 'owl',     name: "Owl's Eye",         rarity: 'rare',     where: 'any',   desc: 'See every farmer and dog for 30 seconds.',                      lore: 'The barn owl blinked once, and now you see what she sees.',                 use: () => { compassUntil = Math.max(compassUntil, t + 30); } },
  { id: 'harvest', name: 'Harvest Charm',     rarity: 'rare',     where: 'any',   desc: 'Your next deposit counts double.',                              lore: 'Apples banked under it count twice, the way the farmer never does.',        use: () => { bankMul = 2; } },
  { id: 'dawn',    name: 'Dawn Bell',         rarity: 'rare',     where: 'late',  desc: 'Stops the clock for 20 seconds.',                               lore: 'Rung once, it holds the night in place. The sun is very patient.',          use: () => { freezeUntil = t + 20; } },
  { id: 'cloak',   name: "Fox's Cloak",       rarity: 'rare',     where: 'late',  desc: 'Nobody can see or catch you for 10 seconds.',                   lore: 'Stitched from fog. The fox says it was a loan. He is not coming back.',      use: () => { inv = Math.max(inv, 10); } },
  { id: 'thunder', name: 'Thunder Acorn',     rarity: 'rare',     where: 'late',  desc: 'Stuns every dog for 6 seconds.',                                lore: 'It cracks like a storm in a shell. Dogs remember thunder.',                 use: () => { dogs.forEach(d => { d.stun = 6; d.chase = false; }); } },
  { id: 'locket',  name: 'Heart Locket',      rarity: 'rare',     where: 'daily', desc: 'Gives you one more heart.',                                     lore: "Hollis's late wife's locket, turned up in the daily harvest. Still warm.",   use: () => { hearts++; } },
  { id: 'jar',     name: 'Starlight Jar',     rarity: 'rare',     where: 'daily', desc: 'Four golden apples rain down around you.',                      lore: 'Bottled starlight, shaken loose. It rains gold, then goes dark.',           use: () => { for (let i = 0; i < 4; i++) spawnApple(clampN(P.x + rnd(-70, 70), 40, W - 40), clampN(P.y + rnd(-50, 60), 80, H - 30), true, 0.5 + i * 0.12, 'tree'); } },
];
const FARMER_FINDS = [
  { id: 'oil',     name: 'Lantern Oil',      rarity: 'common',   where: 'any', desc: 'Your flashlight reaches 40% farther for 20 seconds.',      lore: "Hollis's recipe, brewed in the shed. The beam burns longer and brighter.", use: () => fBuff('coneLen', 1.4, 20) },
  { id: 'boots',   name: "Hunter's Boots",   rarity: 'common',   where: 'any', desc: 'Walk and sprint 25% faster for 15 seconds.',               lore: 'Resoled so many times there is more boot than leather.',                  use: () => { fBuff('speed', 1.25, 15); fBuff('sprintSpeed', 1.25, 15); } },
  { id: 'biscuit', name: 'Hound Biscuit',    rarity: 'common',   where: 'any', desc: 'Dogs smell the raccoon 50% farther for 20 seconds.',       lore: 'The dogs would follow you into a river for one of these.',                use: () => buff(20, () => { sniffBuff *= 1.5; }, () => { sniffBuff /= 1.5; }) },
  { id: 'bell',    name: 'Silver Bell',      rarity: 'uncommon', where: 'any', desc: 'Whistle, dog orders and sprint are ready again right now.', lore: 'One ring and every call in the barn is fresh.',                          use: () => { const f = myFarmer(); if (f) { f.whistleCd = 0; f.orderCd = 0; f.sprintCd = 0; } } },
  { id: 'track',   name: "Tracker's Eye",    rarity: 'uncommon', where: 'any', desc: 'Footprints last 3x longer and show from 50% farther for 25 seconds.', lore: 'A magnifier from the old sheriff. Prints last longer under it.',     use: () => { fBuff('trackLife', 3, 25); fBuff('trackRange', 1.5, 25); } },
  { id: 'glass2',  name: 'Night Glass',      rarity: 'uncommon', where: 'any', desc: 'A much bigger glow around you for 25 seconds.',            lore: 'A brass spyglass that drinks starlight.',                                 use: () => buff(25, () => { FS.seeRadius += 70; }, () => { FS.seeRadius -= 70; }) },
  { id: 'net',     name: 'Orchard Net',      rarity: 'rare',     where: 'any', desc: 'The raccoon is slowed by 40% for 8 seconds.',              lore: 'Thrown over a thief, it slows him to a waddle.',                          use: () => sBuff('speed', 0.6, 8) },
  { id: 'flare',   name: 'Signal Flare',     rarity: 'rare',     where: 'any', desc: 'The whole farm sees the raccoon for 6 seconds.',           lore: 'Everything the flare touches is seen by everyone.',                       use: () => { revealUntil = t + 6; } },
];
/* ----- artwork: every find has a 96px icon (art/icons/<id>.png, packed into icons.js) ----- */
const ICONIMG = {};
const iconImg = id => { if (!ICON_SRC[id]) return null; if (!ICONIMG[id]) { const im = new Image(); im.src = ICON_SRC[id]; ICONIMG[id] = im; } return ICONIMG[id]; };
const iconTag = (id, px, cls) => ICON_SRC[id] ? `<img class="ico ${cls || ''}" src="${ICON_SRC[id]}" width="${px}" height="${px}" alt="">` : '';
const listFor = role => role === 'farmer' ? FARMER_FINDS : DISCOVERIES;
const defOf = (role, id) => listFor(role).find(d => d.id === id);
/* ----- the satchel (saved in this browser) ----- */
const store = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? def : v; } catch (e) { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const myPid = () => { let p = store('raidPid', ''); if (!p) { p = Math.random().toString(36).slice(2, 10); save('raidPid', p); } return p; };     // names this browser to a friend (for the head-to-head record)
const found = () => store('raidFound', []);                                              // every find you have ever had (the Collection)
const stash = () => store('raidStash', {});                                              // how many of each you hold now
const stashN = id => +stash()[id] || 0;
function recordDiscovery(id) { const f = found(); if (!f.includes(id)) { f.push(id); save('raidFound', f); return true; } return false; }
function addStash(id, n = 1) { const s = stash(); s[id] = (+s[id] || 0) + n; save('raidStash', s); }
function takeStash(id) { const s = stash(); if (!(s[id] > 0)) return false; s[id]--; if (!s[id]) delete s[id]; save('raidStash', s); return true; }
(function migrate() { if (store('raidStashV2', 0)) return; const s = stash(); found().forEach(id => { if (!(id in s)) s[id] = 1; }); save('raidStash', s); save('raidStashV2', 1); })();   // finds from before keepsakes: one of each goes in the satchel
const plan = () => Object.assign({ raccoon: null, farmer: null }, store('raidPlan', {}));      // what is packed for the next raid, per role
/* ----- the keepsake for the raid in progress ----- */
let keep = null, keepRole = 'raccoon';
const keepDef = () => keep && defOf(keepRole, keep);
function refundKeep() { if (keep) { addStash(keep); } keep = null; save('raidPack', null); }             // an unused keepsake goes back in the satchel
function packKeepsake() {                                                                // a raid starts on this machine: take the packed find out of the satchel
  refundKeep(); itemRun(); const p = plan(), id = p[myRole];
  if (id && defOf(myRole, id) && takeStash(id)) { keep = id; keepRole = myRole; save('raidPack', myRole + ':' + id); if (!stashN(id)) { p[myRole] = null; save('raidPlan', p); } }
}
(function restorePack() { const v = store('raidPack', null); if (typeof v === 'string' && v.includes(':')) { const [r, id] = v.split(':'); if (defOf(r, id)) addStash(id); } save('raidPack', null); })();   // the page was closed mid-raid: the unused keepsake comes back
function pressItem() {                                                                   // this player pressed the keepsake key
  if (state !== 'play' || !keep) return; const d = keepDef(), role = keepRole, idx = listFor(role).indexOf(d); keep = null; save('raidPack', null);
  if (multi && !isHost) { sendEv({ e: 'item', c: idx }); return; }
  runItem(role, idx);
}
function runItem(role, idx) {                                                            // runs on the machine that owns the simulation
  const d = listFor(role)[idx]; if (!d || state !== 'play') return;
  d.use(); stat('items'); const at = role === 'farmer' ? (myFarmer() || P) : P; pop(at.x, at.y - 70, d.name + '!', '#d6a6ff', true);
}
/* ----- finding things ----- */
function pickFind(role, src) {
  const ok = d => src === 'strange' ? (d.where === 'any' || (d.where === 'river' && RIVER) || (d.where === 'late' && night >= 4)) : src === 'badge' ? (d.where === 'badge' || (d.where === 'any' && d.rarity === 'common')) : d.where === src;
  const pool = listFor(role).filter(ok), have = found(); if (!pool.length) return null;
  const w = d => RARITY[d.rarity].w * (have.includes(d.id) ? 1 : 1.6), sum = pool.reduce((a, d) => a + w(d), 0); let r = Math.random() * sum;
  for (const d of pool) { r -= w(d); if (r <= 0) return d; } return pool[pool.length - 1];
}
function receiveFind(id, role, inRun) {                                                  // this machine's player got a find: into the satchel (and into the keepsake slot if it is empty during a raid)
  if (!defOf(role, id)) return null; recordDiscovery(id); addStash(id);
  if (inRun && !keep && role === myRole && takeStash(id)) { keep = id; keepRole = role; save('raidPack', role + ':' + id); }
  return defOf(role, id);
}
function discover(role) {                                                                // host: someone finished investigating the strange light
  const d = pickFind(role, 'strange'); if (!d) return; stat('found'); const at = role === 'farmer' ? (myFarmer() || P) : P;
  pop(strange.x, strange.y - 40, 'Found: ' + d.name, '#d6a6ff', true);
  if (COOP) { receiveFind(d.id, 'raccoon', true); nsend('disc', { id: d.id, role: 'raccoon' }); return; }          // co-op: the whole crew gets it
  if (role === myRole || !multi) receiveFind(d.id, role, true); else nsend('disc', { id: d.id, role });
}
function onDisc(d, m) { if (net.hosting || m.peer !== net.hostPeer) return; const role = d.role === 'farmer' ? 'farmer' : 'raccoon'; if (role === myRole) receiveFind(String(d.id), role, true); }   // the guest keeps its own satchel
function grantFind(role, src, inRun) { const d = pickFind(role, src); return d ? receiveFind(d.id, role, inRun) : null; }
/* ----- the Collection / Satchel screen ----- */
const COL = { role: 'raccoon', page: 0, per: 6 };
function collection(role, page) {
  if (role) COL.role = role; if (page !== undefined) COL.page = page; const R = COL.role, L = listFor(R), have = found(), pl = plan(), pages = Math.ceil(L.length / COL.per); COL.page = clampN(COL.page, 0, pages - 1);
  const cards = L.slice(COL.page * COL.per, (COL.page + 1) * COL.per).map(d => {
    const r = RARITY[d.rarity], n = stashN(d.id), packed = pl[R] === d.id;
    if (!have.includes(d.id)) return `<div class="card" style="opacity:.6">${iconTag(d.id, 64, 'dark')}<b>??? <small style="color:${r.col}">${r.label}</small></b>Not found yet. Look for it in ${esc(WHERES[d.where])}.</div>`;
    return `<div class="card">${iconTag(d.id, 64)}<b>${esc(d.name)} <small style="color:${r.col}">${r.label} &middot; x${n}</small></b>${esc(d.desc)}<br><i style="opacity:.75">${esc(d.lore)}</i><br><button class="slot" ${n ? '' : 'disabled style="opacity:.45"'} onclick="packToggle('${d.id}')">${packed ? 'Packed &#10003; (tap to unpack)' : n ? 'Pack for next raid' : 'None left'}</button></div>`;
  }).join('');
  const got = L.filter(d => have.includes(d.id)).length, pk = pl[R] && defOf(R, pl[R]);
  show(`<h1>Collection</h1><p class="tag">${got} of ${L.length} ${R} finds discovered. ${pk ? 'Packed: ' + esc(pk.name) + '.' : 'Nothing packed.'} Badges earned: ${totalBadges()}.</p>
  <div class="row"><div class="seg"><button class="${R === 'raccoon' ? 'on' : ''}" onclick="collection('raccoon',0)">Raccoon</button><button class="${R === 'farmer' ? 'on' : ''}" onclick="collection('farmer',0)">Farmer</button></div></div>
  <div class="cards">${cards}</div>
  <div class="row"><button class="up" ${COL.page ? '' : 'disabled style="opacity:.4"'} onclick="collection(null,${COL.page - 1})"><b>Prev</b></button><span class="lbl">page ${COL.page + 1} of ${pages}</span><button class="up" ${COL.page < pages - 1 ? '' : 'disabled style="opacity:.4"'} onclick="collection(null,${COL.page + 1})"><b>Next</b></button></div>
  <p class="lbl">Pack one find before a raid. Press ${esc(kn('item'))} to use it once. Unused finds go back in your satchel.${R === 'farmer' ? ' Farmer finds are used in multiplayer.' : ''}</p>
  <div class="row"><button class="up" onclick="wardrobe()"><b>Wardrobe</b>hats, scarves, trails</button><button onclick="goBack()">Back</button></div>`, 'collection');
}
function packToggle(id) { const pl = plan(), R = COL.role; if (pl[R] === id) pl[R] = null; else if (stashN(id) > 0) pl[R] = id; save('raidPlan', pl); collection(); }
const packedName = () => { const pl = plan(), d = pl.raccoon && defOf('raccoon', pl.raccoon), f = pl.farmer && defOf('farmer', pl.farmer); return d ? d.name : f ? f.name : ''; };
