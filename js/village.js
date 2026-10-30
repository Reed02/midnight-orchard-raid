/* ===== THE VILLAGE: the world map, projects, the workshop, neighbours, the journal and the cozy score =====
   WORLD MAP (Raid Hut > Solo raid): pick the farm to raid, build the project that opens the next farm, choose the gear to take.
   WORKBENCH (bought in the shop, placed in the yard or the cottage): make GEAR (farms.js) from materials.
   REQUEST BOARD (arrives in storage; place it with Build): notices from animals who would like to move in, and what your neighbours need.
   NEIGHBOURS (NEIGHBORS): buy a plot from the board, place it, then bring what their home needs - they move in and wander round it.
     Talk to them (E): their favours (bring materials, get apples and rare materials back), plus what each one does:
     Bramble the badger tells the story, Hazel the hedgehog sells materials for apples, Sage the owl keeps the journal, Digby the mole digs you a gift each day.
   JOURNAL (home menu, the board, or Sage): the story of the strange light, a chapter at a time (CHAPTERS; pictures in WORLD_SRC journal_<n>).
   COZY SCORE: everything you have placed makes the homestead cosier (cozyScore). Neighbours wait for a cosy enough home, and a cosy home
   gives extra seconds every night of a solo raid (cozyBonus).
   Saved in HOME.village (personal: it is yours even while you visit a friend). */
const NEIGHBORS = {
  badger: { name: 'Bramble', kind: 'badger', plot: 'plot_badger', home: 'nhome_badger', build: { rope: 3, seeds: 2 }, cozy: 0, after: 0,
    notice: 'An old badger called Bramble lost his burrow to the farmer\'s plough. He would love a quiet corner of your yard.',
    hello: ['Ah, young raider. Sit a while.', 'These old bones like a warm burrow.', 'Have I told you about the light in the orchard?'],
    favors: [{ text: 'Seed packets for a winter garden - two will do.', need: { seeds: 2 }, give: { apples: 30 } },
             { text: 'My reading lamp is broken. A glass jar and two nails would fix it.', need: { jar: 1, nails: 2 }, give: { apples: 40, thread: 1 } },
             { text: 'Bring me a pumpkin from the Pumpkin Patch, and I will tell you where the light went.', need: { pumpkin: 1 }, give: { apples: 50 }, chapter: 3 }] },
  hedgehog: { name: 'Hazel', kind: 'hedgehog', plot: 'plot_hedgehog', home: 'nhome_hedgehog', build: { planks: 4, nails: 4 }, cozy: 15, after: 1,
    notice: 'Hazel the hedgehog is looking for a pitch for her little shop. She sells what raiders need.',
    hello: ['Fresh stock today!', 'Everything a raccoon could want, dear.', 'Mind the prickles.'],
    favors: [{ text: 'Help me stock up: three glass jars.', need: { jar: 3 }, give: { apples: 45 } },
             { text: 'My awning needs mending: rope and wool.', need: { rope: 2, wool: 2 }, give: { apples: 60, gear: 1 } }] },
  owl: { name: 'Sage', kind: 'owl', plot: 'plot_owl', home: 'nhome_owl', build: { planks: 4, rope: 4, jar: 1 }, cozy: 30, after: 2,
    notice: 'Sage the owl needs a hollow tree for her books. She has been reading about the strange light for years.',
    hello: ['Hoo. Mind the books.', 'Knowledge is the best harvest.', 'The light follows the old paths, you know.'],
    favors: [{ text: 'Honeycomb keeps my ink from drying. Two pieces, please.', need: { honey: 2 }, give: { apples: 55 } },
             { text: 'Wool to bind my old map - three bundles.', need: { wool: 3 }, give: { apples: 60, thread: 1 }, chapter: 4 }] },
  mole: { name: 'Digby', kind: 'mole', plot: 'plot_mole', home: 'nhome_mole', build: { planks: 6, nails: 6, gear: 1 }, cozy: 45, after: 3,
    notice: 'Digby the mole wants to dig a mine under your yard. Moles find all sorts down there.',
    hello: ['Dig, dig, dig!', 'Found something shiny earlier.', 'Lovely soil you have here.'],
    favors: [{ text: 'Planks to shore up my tunnel - five should do it.', need: { planks: 5 }, give: { apples: 60, gear: 1 } }] },
};
const NB_IDS = Object.keys(NEIGHBORS);
const CHAPTERS = [
  { n: 1, title: 'The strange light', text: 'One night, deep in the orchard, you saw it: a violet light, glowing between the trees. When you crept closer, it was gone. But it left a trail of glowing dust that floated away over the hills.' },
  { n: 2, title: 'Bramble\'s tale', text: 'By the fire, Bramble told you about the old days. "That light has come and gone since I was a cub," he said. "Every time it comes back, the farms get a little stranger. Someone should follow it."' },
  { n: 3, title: 'The violet feather', text: 'Bramble was right. In the Pumpkin Patch, inside a hollow pumpkin, you found a feather that glowed the same violet as the light. It was warm, and it hummed softly.' },
  { n: 4, title: 'Sage\'s map', text: 'Sage spread a crumbling map across her desk. "The light follows the old paths," she said, tapping a spot past the river. "Lights over water, then a shrine in the meadow. That is where it goes."' },
  { n: 5, title: 'Lights over the river', text: 'The story continues soon.' },
  { n: 6, title: 'The hidden shrine', text: 'The story continues soon.' },
];
function villageLoad() {
  const v = HOME.village && typeof HOME.village === 'object' ? HOME.village : {};
  v.nb = v.nb && typeof v.nb === 'object' ? v.nb : {}; NB_IDS.forEach(k => { v.nb[k] = Object.assign({ st: 0, fav: 0, day: '' }, v.nb[k] || {}); });       // st: 0 nothing, 1 plot bought, 2 moved in; fav: next favour; day: last daily
  v.ch = v.ch && typeof v.ch === 'object' ? v.ch : {}; v.ch[1] = 1; v.page = v.page || 1; HOME.village = v;
  if (!v.board) { v.board = 1; HOME.store = HOME.store || {}; HOME.store.board = (HOME.store.board || 0) + 1; v.boardNew = 1; }      // the request board arrives once, in storage
}
villageLoad();
const nbState = k => HOME.village.nb[k];
const nbMovedIn = () => NB_IDS.filter(k => nbState(k).st >= 2).length;
const nbWaiting = k => { const N = NEIGHBORS[k], s = nbState(k); return s.st === 0 && nbMovedIn() >= N.after && cozyScore() >= N.cozy; };
const isNbHome = id => /^nhome_/.test(String(id));
function placedNb() { const out = []; (HOME.placed && HOME.placed.out || []).forEach(p => { const m = /^(plot|nhome)_(\w+)$/.exec(p.id); if (m && NEIGHBORS[m[2]]) out.push({ p, who: m[2], built: m[1] === 'nhome' }); }); return out; }
/* ----- cozy score ----- */
function cozyScore() {
  let s = HOME.house ? 5 : 0;
  for (const w of ['out', 'in']) (HOME.placed && HOME.placed[w] || []).forEach(p => { const c = catItem(p.id); if (!c || /^plot_/.test(c.id)) return; s += isNbHome(c.id) ? 4 : c.id === 'board' ? 0 : c.flat ? 1 : c.price < 50 ? 1 : c.price < 150 ? 2 : c.price < 400 ? 3 : 5; });
  return s;
}
const cozyBonus = () => { const c = cozyScore(); return c >= 90 ? 12 : c >= 60 ? 8 : c >= 30 ? 4 : 0; };
/* ----- the world map ----- */
let mapSel = null;
function worldMap(sel) {
  if (sel) mapSel = sel; if (!SITES[mapSel]) mapSel = HOME.site || 'orchard'; const S0 = SITES[mapSel], open = siteOpen(mapSel), map = WORLD_SRC.world_map;
  const pins = SITE_IDS.map(id => { const s = SITES[id], o = siteOpen(id); return `<button class="pin${o ? '' : ' locked'}${id === mapSel ? ' on' : ''}" style="left:${s.map[0] * 100}%;top:${s.map[1] * 100}%" onclick="worldMap('${id}')">${o ? '&#128062;' : '&#128274;'}<span>${esc(s.name)}</span></button>`; }).join('');
  const drops = [...new Set(S0.pool)].map(k => matIcon(k, 26)).join('') + (S0.rare ? ` <em class="rare">rare:</em>${matIcon(S0.rare, 26)}` : '');
  let panel;
  if (open) panel = `<div class="card wcard"><b>${esc(S0.name)}</b><span class="opt">${esc(S0.desc)}</span><div class="drops">Drops: ${drops}</div></div>
    <div class="row"><button class="big" onclick="raidAt('${mapSel}')">Raid here <small>seven nights${cozyBonus() ? ', +' + cozyBonus() + 's a night (cozy home)' : ''}</small></button></div>`;
  else { const pid = S0.need, Pj = PROJECTS[pid], a0 = HOME_SRC[Pj.art[0]], a1 = HOME_SRC[Pj.art[1]], can = haveAll(Pj.cost);
    panel = `<div class="card wcard"><b>${esc(S0.name)} &middot; locked</b><span class="opt">${esc(S0.desc)}</span><div class="drops">Drops: ${drops}</div></div>
    <div class="card wcard proj">${a0 ? `<img src="${a0.src}" alt="">` : ''}<span class="arrow">&#10140;</span>${a1 ? `<img src="${a1.src}" alt="">` : ''}<div><b>Build the ${esc(Pj.name.toLowerCase())}</b><span class="opt">${esc(Pj.desc)}</span><div class="drops">${costHtml(Pj.cost)}</div></div></div>
    <div class="row"><button class="big" ${can ? '' : 'disabled style="opacity:.5"'} onclick="buildProject('${pid}')">Build it <small>${can ? 'opens the ' + esc(S0.name) : 'raid for the materials first'}</small></button></div>`; }
  const gear = `<div class="row gearrow"><span class="lbl">Gear:</span><button class="slot${HOME.gear.on ? '' : ' on'}" onclick="wearGear(null)">none</button>${HOME.gear.owned.map(g2 => `<button class="slot gearb${HOME.gear.on === g2 ? ' on' : ''}" title="${esc(GEAR[g2].desc)}" onclick="wearGear('${g2}')"><img src="${ICON_SRC[GEAR[g2].icon] || ''}" alt="">${esc(GEAR[g2].name)}</button>`).join('')}${HOME.gear.owned.length ? '' : '<span class="lbl">make gear at a workbench</span>'}</div>`;
  homeScreen(`<h1>World map</h1><div class="wlay"><div class="wmap"${map ? ` style="background-image:url(${map.src})"` : ''}>${pins}</div><div class="wside">${panel}${gear}<div class="row bag">${bagHtml(true)}</div><div class="row"><button onclick="raidHut()">Back</button></div></div></div>`, 'worldmap');      // wlay: map and panel side by side on a short (phone, landscape) screen
}
function raidAt(id) { if (!siteOpen(id)) return worldMap(id); HOME.site = id; homeSave(); playSolo(); }
function wearGear(id) { HOME.gear.on = id && HOME.gear.owned.includes(id) ? id : null; homeSave(); if ($('ov').dataset.screen === 'workshop') workshopScreen(); else worldMap(); }
function buildProject(pid) {
  const Pj = PROJECTS[pid]; if (!Pj || HOME.proj[pid] || !spendAll(Pj.cost)) return worldMap();
  HOME.proj[pid] = 1; HOME.store['p_' + pid] = (HOME.store['p_' + pid] || 0) + 1; HOME.site = Pj.opens; homeSave(); mapSel = Pj.opens; try { sfxPlay('clear'); } catch (e) {}
  homeScreen(`<h1>${esc(Pj.name)} built!</h1><p class="tag">The ${esc(SITES[Pj.opens].name)} is open. A little ${esc(Pj.name.toLowerCase())} for your yard is in storage too (Build, B).</p>${HOME_SRC[Pj.art[1]] ? `<img class="bigart" src="${HOME_SRC[Pj.art[1]].src}" alt="">` : ''}<div class="row"><button class="big" onclick="worldMap()">Back to the map</button></div>`, 'built');
}
function bagHtml(small) {                                   // what materials you have
  const ks = MAT_IDS.filter(k => HOME.mats[k] > 0); if (!ks.length) return small ? '<span class="lbl">No materials yet: search crates and loot spots in raids.</span>' : '<p class="lbl">No materials yet. Hold the shake key next to crates, sawhorses, shelves and hives in a raid to search them.</p>';
  return ks.map(k => `<span class="cost bagi">${matIcon(k, small ? 22 : 34)}${HOME.mats[k]}${small ? '' : ' <small>' + esc(MATS[k].name) + '</small>'}</span>`).join(' ');
}
function bagScreen() { homeScreen(`<h1>Materials</h1><p class="tag">Found on raids. Used for furniture, projects, gear and your neighbours' favours.</p><div class="row bag">${bagHtml(false)}</div><div class="row"><button onclick="homeMenu2()">Back</button></div>`, 'bag'); }
/* ----- the workshop ----- */
function workshopScreen() {
  if (isVisiting()) return pop(P.x, P.y - 80, 'Use the workbench at your own homestead', '#cfd8e6');
  const rows = Object.entries(GEAR).map(([id, G]) => { const own = HOME.gear.owned.includes(id), can = haveAll(G.cost);
    return `<div class="card gcard"><img src="${ICON_SRC[G.icon] || ''}" alt=""><div><b>${esc(G.name)}${own ? ' &#10003;' : ''}</b><span class="gdesc">${esc(isTouch ? G.desc.replace('Press the whistle key (F) to fire', 'Tap the Sling button to fire') : G.desc)}</span><div class="drops">${own ? (HOME.gear.on === id ? '<em class="rare">taken on raids</em>' : `<button class="slot" onclick="wearGear('${id}')">Take on raids</button>`) : costHtml(G.cost) + ` <button class="slot" ${can ? '' : 'disabled style="opacity:.5"'} onclick="craftGear('${id}')">Make</button>`}</div></div></div>`; }).join('');
  homeScreen(`<h1>Workbench</h1><p class="tag opt">Make gear from materials. You take one piece on each raid (choose it here or on the world map).</p><div class="gearlist">${rows}</div><div class="row bag">${bagHtml(true)}</div><div class="row"><button onclick="leaveHomeScreen()">Done</button></div>`, 'workshop');
}
function craftGear(id) { const G = GEAR[id]; if (!G || HOME.gear.owned.includes(id) || !spendAll(G.cost)) return workshopScreen(); HOME.gear.owned.push(id); if (!HOME.gear.on) HOME.gear.on = id; homeSave(); try { sfxPlay('gold'); } catch (e) {} workshopScreen(); }
/* ----- the request board ----- */
function boardScreen() {
  const V = HOME.village; V.boardNew = 0;
  const notes = NB_IDS.map(k => { const N = NEIGHBORS[k], s = nbState(k), face = WORLD_SRC['face_' + k + '_0'];
    if (s.st === 0 && !nbWaiting(k)) { const why = nbMovedIn() < N.after ? 'once ' + N.after + (N.after === 1 ? ' neighbour has' : ' neighbours have') + ' moved in' : 'when your home is cosier (' + cozyScore() + '/' + N.cozy + ')'; return `<div class="card note dim"><b>???</b>Someone new may come ${why}.</div>`; }
    if (s.st === 0) { const can = HOME.apples >= catItem(N.plot).price; return `<div class="card note">${face ? `<img src="${face.src}" alt="">` : ''}<div><b>Looking for a home: ${esc(N.name)}</b>${esc(N.notice)}<div class="drops"><button class="slot" ${can ? '' : 'disabled style="opacity:.5"'} onclick="buyPlot('${k}')">Buy a plot (${catItem(N.plot).price} apples)</button></div></div></div>`; }
    if (s.st === 1) return `<div class="card note">${face ? `<img src="${face.src}" alt="">` : ''}<div><b>${esc(N.name)}'s plot</b>${placedNb().some(q => q.who === k) ? 'Walk to the plot and press E to build the home: ' : 'Place the plot in your yard (Build, B), then build the home: '}${costHtml(N.build)}</div></div>`;
    const f = N.favors[s.fav]; return `<div class="card note">${face ? `<img src="${face.src}" alt="">` : ''}<div><b>${esc(N.name)}</b>${f ? esc(f.text) + '<div class="drops">' + costHtml(f.need) + '</div>' : (s.day === todayKey() ? 'Nothing needed today. Come back tomorrow.' : 'Has a small favour to ask today - go and say hello.')}</div></div>`; }).join('');
  homeScreen(`<h1>Request board</h1><p class="tag">Cozy score: <b>${cozyScore()}</b>${cozyBonus() ? ' (+' + cozyBonus() + 's every night of a solo raid)' : ''}. Place furniture and decorations to raise it.</p><div class="notes">${notes}</div>
    <div class="row"><button class="up" onclick="journalScreen()"><b>Journal</b>${Object.keys(HOME.village.ch).length} chapter${Object.keys(HOME.village.ch).length === 1 ? '' : 's'}</button><button class="up" onclick="bagScreen2()"><b>Materials</b></button><button onclick="leaveHomeScreen()">Done</button></div>`, 'board');
}
function bagScreen2() { homeScreen(`<h1>Materials</h1><div class="row bag">${bagHtml(false)}</div><div class="row"><button onclick="boardScreen()">Back</button></div>`, 'bag'); }
function buyPlot(k) { const N = NEIGHBORS[k], s = nbState(k); if (!N || s.st !== 0 || !nbWaiting(k) || !spendApples(catItem(N.plot).price)) return boardScreen(); s.st = 1; HOME.store[N.plot] = (HOME.store[N.plot] || 0) + 1; homeSave(); boardScreen(); }
/* ----- neighbours: building their home, moving in, talking ----- */
function plotScreen2(k, u) {
  const N = NEIGHBORS[k], can = haveAll(N.build), im = HOME_SRC[N.home], face = WORLD_SRC['face_' + k + '_0'];
  homeScreen(`<h1>${esc(N.name)}'s plot</h1><div class="card note">${face ? `<img src="${face.src}" alt="">` : ''}<div><b>${esc(N.name)}</b>${esc(N.notice)}</div></div>${im ? `<img class="bigart" src="${im.src}" alt="">` : ''}
    <div class="row">${costHtml(N.build)}</div><div class="row"><button class="big" ${can ? '' : 'disabled style="opacity:.5"'} onclick="buildNbHome('${k}','${u}')">Build the home <small>${can ? esc(N.name) + ' moves in' : 'raid for the materials first'}</small></button><button onclick="leaveHomeScreen()">Not yet</button></div>`, 'nbplot');
}
function buildNbHome(k, u) {
  const N = NEIGHBORS[k], s = nbState(k), p = HOME.placed.out.find(q => q.u === u && q.id === N.plot); if (!p || !spendAll(N.build)) return plotScreen2(k, u);
  p.id = N.home; s.st = 2; if (k === 'badger') HOME.village.ch[2] = 1; rebuildSolids(); homeSave(); leaveHomeScreen(); NBRT[k] = null;
  pop(p.x, p.y - 110, N.name + ' moved in!', '#ffd23f', true); fxBurst(p.x, p.y - 40, 30, { col: ['#ffd23f', '#fff6a8', '#fff', '#9be37f'], k: 'spark', s1: 200, up: 60, l1: 1, r1: 4 }); try { sfxPlay('victory'); } catch (e) {}
}
function talkScreen(k) {
  const N = NEIGHBORS[k], s = nbState(k), f = N.favors[s.fav], face = WORLD_SRC['face_' + k + (f && haveAll(f.need) ? '_1' : '_0')], line = N.hello[Math.floor(Math.random() * N.hello.length)];
  if (isVisiting()) return homeScreen(`<h1>${esc(N.name)}</h1><div class="card note">${face ? `<img src="${face.src}" alt="">` : ''}<div><b>${esc(N.name)}</b>"${esc(line)}" (${esc(N.name)} lives here with your friend.)</div></div><div class="row"><button onclick="leaveHomeScreen()">Bye</button></div>`, 'talk');
  let ask = '';
  if (f) ask = `<div class="card wcard"><b>A favour</b>"${esc(f.text)}"<div class="drops">${costHtml(f.need)} &#10140; ${giveHtml(f.give)}</div></div><div class="row"><button class="big" ${haveAll(f.need) ? '' : 'disabled style="opacity:.5"'} onclick="doFavor('${k}')">Give it <small>${haveAll(f.need) ? 'thank you!' : 'you do not have it all yet'}</small></button></div>`;
  else if (s.day !== todayKey()) { const d = dailyFavor(k); ask = `<div class="card wcard"><b>Today's favour</b>"${esc(d.text)}"<div class="drops">${costHtml(d.need)} &#10140; ${giveHtml(d.give)}</div></div><div class="row"><button class="big" ${haveAll(d.need) ? '' : 'disabled style="opacity:.5"'} onclick="doDaily('${k}')">Give it</button></div>`; }
  else ask = '<p class="lbl">Nothing needed today. Come back tomorrow.</p>';
  const extra = { badger: '<button class="up" onclick="journalScreen()"><b>Stories</b>the journal</button>', hedgehog: '<button class="up" onclick="shopNb()"><b>Hazel\'s shop</b>materials for apples</button>', owl: '<button class="up" onclick="journalScreen()"><b>Journal</b>read the story</button>', mole: `<button class="up" onclick="digGift()" ${HOME.village.dig === todayKey() ? 'disabled style="opacity:.5"' : ''}><b>Dig for me</b>${HOME.village.dig === todayKey() ? 'come back tomorrow' : 'a gift, once a day'}</button>` }[k];
  homeScreen(`<h1>${esc(N.name)}</h1><div class="card note talk">${face ? `<img src="${face.src}" alt="">` : ''}<div><b>${esc(N.name)} the ${esc(N.kind)}</b>"${esc(line)}"</div></div>${ask}<div class="row">${extra}<button onclick="leaveHomeScreen()">Bye</button></div>`, 'talk');
}
const giveHtml = gv => Object.entries(gv).map(([k2, n]) => `<span class="cost">${k2 === 'apples' ? '<span class="appl">&#127822;</span>' : matIcon(k2)}${n}</span>`).join(' ');
function payGive(gv) { for (const [k2, n] of Object.entries(gv)) { if (k2 === 'apples') payApples(n); else HOME.mats[k2] = (HOME.mats[k2] || 0) + n; } homeSave(); }
function doFavor(k) {
  const N = NEIGHBORS[k], s = nbState(k), f = N.favors[s.fav]; if (!f || !spendAll(f.need)) return talkScreen(k);
  payGive(f.give); s.fav++; s.day = todayKey(); if (f.chapter) HOME.village.ch[f.chapter] = 1; homeSave(); try { sfxPlay('clear'); } catch (e) {}
  if (f.chapter) return journalScreen(f.chapter, `${N.name} has a story for you...`); talkScreen(k);
}
function dailyFavor(k) {                                     // after the story favours: one small favour a day, from the farms you can reach
  const pool = [...new Set(SITE_IDS.filter(siteOpen).flatMap(id => SITES[id].pool))], seed = todayKey().split('-').reduce((a, b) => a * 31 + (+b), NB_IDS.indexOf(k) + 7), r = mulberry32(seed);
  const a = pool[Math.floor(r() * pool.length)], b = pool[Math.floor(r() * pool.length)], need = {}; need[a] = 1 + Math.floor(r() * 2); need[b] = (need[b] || 0) + 1;
  return { text: { badger: 'A little something for my pantry?', hedgehog: 'I am running low on stock.', owl: 'Supplies for my studies, if you can spare them.', mole: 'Bits for my tunnels, please.' }[k], need, give: { apples: 18 + Math.floor(r() * 18) } };
}
function doDaily(k) { const s = nbState(k), d = dailyFavor(k); if (s.day === todayKey() || !spendAll(d.need)) return talkScreen(k); payGive(d.give); s.day = todayKey(); homeSave(); try { sfxPlay('clear'); } catch (e) {} talkScreen(k); }
const NB_SHOP = { planks: 14, nails: 10, rope: 10, jar: 16, seeds: 8, pumpkin: 14, honey: 16, wool: 16, gear: 70, thread: 70 };
function shopNb() {
  const rows = MAT_IDS.filter(k => siteOpen('orchard') && (!MATS[k].rare || nbState('hedgehog').fav >= 2)).map(k => `<button class="up shopi" ${HOME.apples >= NB_SHOP[k] ? '' : 'disabled style="opacity:.5"'} onclick="buyMat('${k}')">${matIcon(k, 36)}<b>${esc(MATS[k].name)}</b>${NB_SHOP[k]} apples &middot; you have ${HOME.mats[k] || 0}</button>`).join('');
  homeScreen(`<h1>Hazel's shop</h1><p class="tag">Short of something? Hazel sells it, for apples.${nbState('hedgehog').fav >= 2 ? '' : ' (Rare things once you have done her favours.)'} You have ${HOME.apples} apples.</p><div class="row shopgrid">${rows}</div><div class="row"><button onclick="talkScreen('hedgehog')">Back</button></div>`, 'nbshop');
}
function buyMat(k) { if (!MATS[k] || !spendApples(NB_SHOP[k])) return shopNb(); HOME.mats[k] = (HOME.mats[k] || 0) + 1; homeSave(); shopNb(); }
function digGift() {
  if (HOME.village.dig === todayKey()) return talkScreen('mole'); HOME.village.dig = todayKey(); const r = Math.random(), k = r < 0.25 ? (Math.random() < 0.5 ? 'gear' : 'thread') : MAT_IDS.filter(q => !MATS[q].rare)[Math.floor(Math.random() * 8)], n = MATS[k].rare ? 1 : 2;
  HOME.mats[k] = (HOME.mats[k] || 0) + n; homeSave();
  homeScreen(`<h1>Digby dug something up!</h1><div class="row">${matIcon(k, 64)}</div><p class="tag">${n} ${esc(MATS[k].name.toLowerCase())}${MATS[k].rare ? ' - a rare find!' : ''}</p><div class="row"><button onclick="talkScreen('mole')">Thanks, Digby</button></div>`, 'dig');
}
/* ----- the journal ----- */
function journalScreen(n, intro) {
  const V = HOME.village; if (n) V.page = n; const C = CHAPTERS.find(c => c.n === V.page) || CHAPTERS[0], has = !!V.ch[C.n], pic = WORLD_SRC['journal_' + C.n];
  const tabs = CHAPTERS.map(c => `<button class="slot${c.n === C.n ? ' on' : ''}${V.ch[c.n] ? '' : ' dim'}" onclick="journalScreen(${c.n})">${c.n}</button>`).join('');
  const body = has ? `${pic ? `<img class="jpic" src="${pic.src}" alt="">` : '<div class="jpic soon">picture coming soon</div>'}<div class="card wcard"><b>Chapter ${C.n}: ${esc(C.title)}</b>${esc(C.text)}</div>`
    : `<div class="jpic soon">&#128274;</div><div class="card wcard"><b>Chapter ${C.n}</b>${C.n === 2 ? 'Help an old badger find a home.' : C.n === 3 ? 'Do Bramble a few favours.' : C.n === 4 ? 'Someone wise keeps an old map...' : 'The story continues soon.'}</div>`;
  homeScreen(`<h1>Journal</h1>${intro ? `<p class="tag">${esc(intro)}</p>` : ''}<div class="row seg">${tabs}</div>${body}<div class="row"><button onclick="leaveHomeScreen()">Close</button></div>`, 'journal');
}
/* ----- what you can walk up to (outside and in) ----- */
function villageInteractables() {
  const w = HOME_IN ? 'in' : 'out', out = [];
  (HOME.placed && HOME.placed[w] || []).forEach(p => {
    if (p.id === 'workbench') out.push({ id: 'workbench', soft: 1, x: p.x, y: p.y + 10, r: 48, h: 74, tip: 'Workbench: make gear', act: workshopScreen });
    if (p.id === 'board') out.push({ id: 'board', soft: 1, x: p.x, y: p.y + 10, r: 54, h: 96, tip: 'Request board' + (NB_IDS.some(nbWaiting) ? ' (new notice!)' : ''), act: boardScreen });
  });
  if (!HOME_IN) placedNb().forEach(({ p, who, built }) => {
    const N = NEIGHBORS[who];
    if (!built) out.push({ id: 'nbplot', soft: 1, x: p.x, y: p.y + 10, r: 56, h: 70, tip: N.name + '\'s plot: build the home', act: () => isVisiting() ? pop(p.x, p.y - 80, 'This is your friend\'s', '#cfd8e6') : plotScreen2(who, p.u) });
    else { const rt = NBRT[who]; if (rt) out.push({ id: 'nb', soft: 1, x: rt.x, y: rt.y + 8, r: 44, h: 76, tip: 'Talk to ' + N.name, act: () => talkScreen(who) }); }
  });
  return out;
}
/* ----- neighbours walking round their homes ----- */
const NBRT = {};                                            // runtime: where each neighbour is { x, y, tx, ty, face, anim, wait }
function updateNeighbors(dt) {
  if (HOME_IN) return;
  placedNb().forEach(({ p, who, built }) => {
    if (!built) return; let r = NBRT[who]; const hx = p.x, hy = p.y + 34;
    if (!r || Math.hypot(r.hx - hx, r.hy - hy) > 4) r = NBRT[who] = { x: hx + 30, y: hy, tx: hx + 30, ty: hy, face: 1, anim: 0, wait: 1, hx, hy };
    const d = Math.hypot(r.tx - r.x, r.ty - r.y); r.moving = d > 3 && r.wait <= 0;
    if (homeNear && homeNear.id === 'nb' && Math.hypot(homeNear.x - r.x, homeNear.y - 8 - r.y) < 2) { r.moving = false; r.face = P.x > r.x ? 1 : -1; return; }      // stands still while you talk to it
    if (r.wait > 0) { r.wait -= dt; return; }
    if (d <= 3) { r.wait = 1.5 + Math.random() * 3; const a = Math.random() * 6.283, rr = 30 + Math.random() * 45; r.tx = hx + Math.cos(a) * rr; r.ty = hy + 10 + Math.abs(Math.sin(a)) * rr * 0.6; return; }
    const sp = 34, nx = r.x + (r.tx - r.x) / d * sp * dt, ny = r.y + (r.ty - r.y) / d * sp * dt, e = { x: nx, y: ny }; homePush(e, 9);
    if (Math.hypot(e.x - nx, e.y - ny) > 0.5) { r.tx = r.x; r.ty = r.y; } r.face = e.x >= r.x ? 1 : -1; r.x = e.x; r.y = e.y; r.anim += dt * 6;
  });
}
function drawNeighbors(list) {
  if (HOME_IN) return;
  placedNb().forEach(({ who, built }) => { const r = NBRT[who]; if (!built || !r) return; list.push({ y: r.y, f: () => drawNb(who, r) }); });
}
function drawNb(who, r) {
  const im = wImg('npc_' + who); if (!im) return; const fw = im.naturalWidth / 6, fh = im.naturalHeight, fi = r.moving ? 3 + Math.floor(r.anim) % 3 : Math.floor(t * 0.8 + who.length) % 2;
  shadow(r.x, r.y, 13); g.save(); g.translate(Math.round(r.x), Math.round(r.y + 2)); if (r.face < 0) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(im, fi * fw, 0, fw, fh, -fw / 2, -fh, fw, fh); g.restore();
  if (nbState(who).fav < NEIGHBORS[who].favors.length || nbState(who).day !== todayKey()) { const b = Math.sin(t * 4) * 2; g.fillStyle = '#ffd23f'; g.strokeStyle = '#2a1a08'; g.lineWidth = 2; g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.strokeText('!', r.x, r.y - fh - 6 + b); g.fillText('!', r.x, r.y - fh - 6 + b); g.textAlign = 'left'; }
}
function drawVillageHud() {                                  // under the apples: the cozy score, and a nudge when the board is new
  const c = cozyScore(), txt = '\u2665 Cozy ' + c; g.save(); g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; const x0 = 8 + g.measureText(String(HOME.apples)).width + 54 + 6; g.font = 'bold 14px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 18;
  g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(x0, 8, w, 30); g.fillStyle = '#ff9fb2'; g.fillRect(x0, 8, 4, 30); g.fillStyle = '#ffe3ea'; g.textBaseline = 'middle'; g.fillText(txt, x0 + 10, 24);      // next to the apples
  if (HOME.village.boardNew && HOME.placed.out.some(p => p.id === 'board')) HOME.village.boardNew = 0;
  if (HOME.village.boardNew && !BUILD.on && state === 'home' && !isVisiting()) { g.fillStyle = 'rgba(10,24,40,.85)'; const m = isTouch ? 'A request board arrived - tap Build to place it' : 'A request board arrived - press B (Build) to place it'; const mw = g.measureText(m).width + 20; g.fillRect(VW / 2 - mw / 2, VH - 64, mw, 24); g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.fillText(m, VW / 2, VH - 51.5); }
  g.restore();
}
