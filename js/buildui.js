/* ===== BUILD MODE AND SHOP: the tidy layout =====
   THE BAR (renderBar): tabs on top (Things | Ground outside once you own a shovel; Things | Floor & walls in the cottage), ONE row of slots that
   scrolls sideways, and a row of buttons that only shows what makes sense right now (holding something: Place, Turn, Flip, Put away;
   pointing at something: Pick up, Turn, Flip, Store, Sell; painting ground: Paint and the edge controls), with Shop and Done always at the end.
   The bar redraws itself when what you point at changes (barTick).
   THE SHOP (buildShop): your apples and materials at the top, Buy | Sell, category chips, and an even grid of cards (picture, name, price;
   a cost you cannot pay yet shows in red), with Back to building pinned underneath. Tools and ground unlocks are categories of their own. */
BUILD.tab = 'things';
const inGroundTab = () => BUILD.tab !== 'things';                    // any brush tab (ground outside; floor, walls, windows, wall art inside)
// Inside the cottage the brushes are split by what they change: Floor (floor tiles, building walls and doors), Walls (paint and wallpaper),
// Windows, Wall art (things to hang). Outside: Ground. A tab only shows when it has something in it.
const TABS_IN = [['things', 'Things'], ['floor', 'Floor'], ['walls', 'Walls'], ['windows', 'Windows'], ['art', 'Wall art']], TABS_OUT = [['things', 'Things'], ['ground', 'Ground']];
const wbTab = wb => wb.startsWith('win:') ? 'windows' : wb.startsWith('hang:') ? 'art' : 'walls';
const slotTab = s => s.gb ? 'ground' : s.tool || s.brush ? 'floor' : s.wb ? wbTab(s.wb) : 'things';
const TAB_HINT = { floor: 'Pick a floor or a building tool, then click the room', walls: 'Pick a paint or a wallpaper, then click a wall' + (isTouch ? '' : ' (or drag along it)'),
  windows: 'Pick a window (25 apples and a glass jar), then click a wall. Click it again to take it out', art: 'Pick something to hang, then click a wall. Click it again to take it down (half its price back)', ground: '' };
function barTab(tab) {                                              // switch tabs: leaving a tab puts its brush down
  if (tab === BUILD.tab) return; BUILD.tab = tab; BUILD.gbrush = null; BUILD.brush = null; BUILD.tool = null; BUILD.wbrush = null;
  if (tab !== 'things' && BUILD.held) storeHeld();
  renderBar();
}
function barSig() { const h = BUILD.held, v = !h && hovered(); return [BUILD.tab, h && h.id, v && (v.u || v.id), BUILD.gbrush, BUILD.brush, BUILD.tool, HOME.edges, JSON.stringify(HOME.store), HOME_IN].join('|'); }
let BAR_SIG = '';
renderBar = function () {
  let bar = $('buildbar'); if (!bar) { bar = document.createElement('div'); bar.id = 'buildbar'; $('wrap').appendChild(bar); bar.addEventListener('pointerdown', e => e.stopPropagation()); bar.addEventListener('wheel', e => { const s = bar.querySelector('.bslots'); if (s && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { s.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false }); }
  let btn = $('buildbtn'); if (!btn) { btn = document.createElement('button'); btn.id = 'buildbtn'; btn.textContent = 'Build'; btn.title = 'Build mode (B)'; btn.onclick = () => buildToggle(true); $('wrap').appendChild(btn); }
  if (!BUILD.on) { bar.style.display = 'none'; return; }
  if (BUILD.gbrush) BUILD.tab = 'ground'; else if (BUILD.brush || BUILD.tool) BUILD.tab = 'floor'; else if (BUILD.wbrush) BUILD.tab = wbTab(BUILD.wbrush);
  const vis = isVisiting(), all = barSlots(), byTab = {}; all.forEach(s => (byTab[slotTab(s)] = byTab[slotTab(s)] || []).push(s));
  const tabList = (HOME_IN ? TABS_IN : TABS_OUT).filter(([id]) => id === 'things' || byTab[id]); if (!tabList.some(([id]) => id === BUILD.tab)) BUILD.tab = 'things';
  const tabs = tabList.length > 1 ? `<div class="btabs">${tabList.map(([id, nm]) => `<button class="${BUILD.tab === id ? 'on' : ''}" onclick="barTab('${id}')">${nm}</button>`).join('')}</div>` : '';
  const list = byTab[BUILD.tab] || [];
  const slots = list.map((s, i) => { const src = s.icon || (HOME_SRC[s.k] ? HOME_SRC[s.k].src : ''); const on = (BUILD.held && BUILD.held.id === s.id) || (s.brush && BUILD.brush === s.id) || (s.tool && BUILD.tool === s.tool) || (s.gb && BUILD.gbrush === s.gb) || (s.wb && BUILD.wbrush === s.wb);
    const act = s.gb ? `pickGround('${s.gb}')` : s.tool ? `pickTool('${s.tool}')` : s.brush ? `pickBrush('${s.id}')` : s.wb ? (s.locked ? `buildShop('buy','Walls')` : `pickWall('${s.wb}')`) : `pickFromStore('${s.id}')`;
    return `<button class="bslot${on ? ' on' : ''}${s.locked ? ' locked' : ''}" title="${esc(s.name)}" onclick="${act}"><img src="${src}" alt=""><span>${i < 9 ? i + 1 : ''}</span>${s.n !== undefined ? `<i>${s.n}</i>` : ''}${s.tag ? `<em>${s.tag}</em>` : ''}</button>`; }).join('');
  const empty = inGroundTab() ? '' : `<span class="bempty">${vis ? 'Nothing in storage here' : 'Storage is empty: buy things in the Shop'}</span>`;
  // the buttons for what you are doing right now
  const B = (label, fn, cls, title) => `<button class="${cls || ''}" onclick="${fn}"${title ? ` title="${esc(title)}"` : ''}>${label}</button>`, ctx = [];
  const h = BUILD.held, hov = !h && !BUILD.gbrush && !BUILD.brush && !BUILD.tool ? hovered() : null;
  if (inGroundTab() && HOME_IN && !BUILD.brush && !BUILD.tool && !BUILD.wbrush) ctx.push(`<span class="bhint">${TAB_HINT[BUILD.tab] || ''}</span>`);
  else if (inGroundTab()) {
    ctx.push(B(HOME_IN ? (BUILD.tool ? 'Build' : BUILD.wbrush && /^(win|hang):/.test(BUILD.wbrush) ? 'Put up' : 'Paint') : BUILD.gbrush === '~' ? 'Switch' : 'Paint', 'buildAct()', 'bmain'));
    if (!HOME_IN && !HIDE && !vis && typeof edgeNow === 'function') { const nm = EDGE_NAME[edgeNow()];
      ctx.push(`<button class="edgebtn" onclick="toggleEdges()" title="The edges new tiles get: natural, straight or curved. The Edge brush (first slot) switches single tiles.">New edges: ${nm[0].toUpperCase() + nm.slice(1)}</button>`, `<button class="edgebtn" onclick="setAllEdges()" title="Give every tile ${nm} edges (press twice)">All ${nm}</button>`); }
  } else if (h) {
    ctx.push(B('Place', 'buildAct()', 'bmain')); if (!h.core) { if (turnable(h.id)) ctx.push(B('Turn', 'buildTurn()', '', 'Turn it (R)')); ctx.push(B('Flip', 'buildFlip()', '', 'Flip it (F)'), B('Put away', 'buildStore()', '', 'Back into storage (Q)')); } else ctx.push(B('Cancel', 'buildStore()'));
  } else if (hov) {
    ctx.push(B(hov.core ? 'Move' : 'Pick up', 'buildAct()', 'bmain'));
    if (!hov.core) { if (turnable(hov.id)) ctx.push(B('Turn', 'buildTurn()', '', 'Turn it (R)')); ctx.push(B('Flip', 'buildFlip()', '', 'Flip it (F)'), B('Store', 'buildStore()', '', 'Put it in storage (Q)')); if (!HIDE && !vis) ctx.push(B('Sell', 'buildSell()', '', 'Sell it (X)')); }
  } else ctx.push(`<span class="bhint">${inGroundTab() ? '' : isTouch ? 'Tap a thing below, or tap something to pick it up' : 'Choose a thing below, or point at something to move it'}</span>`);
  const end = [];
  if (!vis) { end.push(B('Shop', "buildShop('buy')", 'bshop')); if (HIDE) end.push(B('Dig', `projScreen('${HIDE.id}')`)); else if (HOME_IN) end.push(B('Rooms', 'roomsScreen()')); }
  end.push(B('Done', 'buildToggle(false)', 'bdone'));
  bar.innerHTML = `${tabs}<div class="bslots">${slots || empty}</div><div class="bacts">${ctx.join('')}<span class="bsp"></span>${end.join('')}</div>`;
  const on = bar.querySelector('.bslot.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  BAR_SIG = barSig();
};
setInterval(() => { try { if (state === 'home' && BUILD.on && barSig() !== BAR_SIG) renderBar(); } catch (e) {} }, 200);
const _pickGroundUI = pickGround; pickGround = function (ch) { BUILD.tab = 'ground'; return _pickGroundUI(ch); };
/* ----- the shop ----- */
const SHOP_CATS_OUT = ['All', 'Tools', 'Garden', 'Nature', 'Props', 'Fences', 'Ground'], SHOP_CATS_IN = ['All', 'Furniture', 'Decor', 'Floors', 'Walls'];   // Walls: wall coverings (walls.js)
const NATURE = ['rosebush', 'sunflower', 'topiary', 'grass', 'pebble', 'tall', 'poppy', 'sunny', 'violet', 'pink', 'bluebell', 'daisy', 'wild', 'rock1', 'rock2', 'rock3', 'appletree', 'youngtree', 'fern', 'fernS'];
const GARDEN = ['well', 'flowerbed', 'berrybush', 'birdfeeder', 'veg', 'compost', 'rainbarrel', 'scarecrow', 'beehive', 'hay', 'haybig', 'birdbath'];
const DECOR_IN = ['rugS', 'rugB', 'rugD', 'woolrug', 'lantern', 'fern', 'fernS', 'jacklantern', 'wallclock', 'bucket', 'kindling', 'logs1', 'logs2', 'logs3', 'crate', 'crate2', 'barrel', 'applecrate'];
function shopCat(c) { if (c.fence) return 'Fences'; if (HOME_IN) return DECOR_IN.includes(c.id) || c.flat ? 'Decor' : 'Furniture'; return GARDEN.includes(c.id) ? 'Garden' : NATURE.includes(c.id) ? 'Nature' : 'Props'; }
let shopCatSel = 'All';
function shopCard(onclick, src, name, price, opts) {
  opts = opts || {}; return `<button class="up shopi${opts.dim ? ' dim' : ''}" ${opts.disabled ? 'disabled' : ''} onclick="${onclick}" title="${esc(opts.title || name)}"><span class="simg">${src ? `<img src="${src}" alt="">` : ''}</span><b>${esc(name)}</b><span class="sprice">${price}</span>${opts.badge ? `<i class="sown">${opts.badge}</i>` : ''}</button>`;
}
buildShop = function (tab, cat) {
  if (isVisiting()) return say('Only ' + VISIT.name + ' can shop here: you can use what is in their storage');
  if (BUILD.held) storeHeld(); const w = bWhere(); if (tab) shopTab = tab; if (HIDE) shopTab = 'buy'; if (cat) shopCatSel = cat; const sell = shopTab === 'sell';
  const cats = HOME_IN || HIDE ? SHOP_CATS_IN : SHOP_CATS_OUT; if (!cats.includes(shopCatSel)) shopCatSel = 'All';
  let cards = [];
  if (sell) cards = CAT.filter(c => HOME.store[c.id] > 0 && !c.core).map(c => shopCard(`sellStored('${c.id}')`, HOME_SRC[c.k] ? HOME_SRC[c.k].src : '', c.name, `Sell for ${sellPrice(c.id)}`, { badge: HOME.store[c.id] }));
  else {
    const want = k => shopCatSel === 'All' || shopCatSel === k;
    if (!HOME_IN && !HIDE && typeof TOOLDEF !== 'undefined' && want('Tools')) TOOL_IDS.filter(id => !TOOLDEF[id].free && id !== 'hand').forEach(id => { const T = TOOLDEF[id], own = hasTool(id), lock = T.needs && !hasTool(T.needs);
      cards.push(shopCard(`buyTool('${id}')`, ICON_SRC[T.icon] || '', T.name, own ? 'Owned' : lock ? 'Needs the ' + esc(TOOLDEF[T.needs].name.toLowerCase()) : costHtml(T.cost), { disabled: own || lock || !haveAll(T.cost), dim: own, badge: own ? '&#10003;' : '', title: T.name + ': ' + T.what })); });
    CAT.filter(c => fits(c, w) && !c.hide && !c.core && (typeof decorReady !== 'function' || decorReady(c)) && want(shopCat(c))).forEach(c => { const cost = Object.assign({ apples: c.price }, c.mats || {});
      cards.push(shopCard(`buyItem('${c.id}')`, HOME_SRC[c.k] ? HOME_SRC[c.k].src : '', c.name, costHtml(cost), { disabled: !haveAll(cost), badge: HOME.store[c.id] || '', title: (typeof STATION_TIP !== 'undefined' && STATION_TIP[c.id]) ? c.name + ': ' + STATION_TIP[c.id] : (typeof DECOR_TIP !== 'undefined' && DECOR_TIP[c.id]) ? c.name + ': ' + DECOR_TIP[c.id] : c.name })); });
    if (!HOME_IN && !HIDE && typeof GT !== 'undefined' && want('Ground')) Object.keys(GT).filter(ch => GT[ch].unlock).forEach(ch => { const G = GT[ch], own = HOME.unlock[G.unlock];
      cards.push(shopCard(`buyGroundUnlock('${ch}')`, gtIcon(ch), G.name, own ? 'Unlocked: ' + costText(G.cost) + ' a tile' : costHtml(G.ucost), { disabled: own || !haveAll(G.ucost), dim: own, badge: own ? '&#10003;' : '', title: 'Unlock ' + G.name.toLowerCase() + ' for the ground brushes' })); });
    if (HOME_IN && !HIDE && want('Floors')) BRUSHES.filter(b => b.unlock).forEach(b => { const own = HOME.unlock[b.unlock];
      cards.push(shopCard(`buyUnlock('${b.unlock}',${b.price})`, HOME_SRC[b.k] ? HOME_SRC[b.k].src : '', b.name + ' tiles', own ? 'Unlocked' : costHtml({ apples: b.price }), { disabled: own || HOME.apples < b.price, dim: own, badge: own ? '&#10003;' : '' })); });
  }
  const mats = MAT_IDS.filter(k => HOME.mats[k] > 0).map(k => `<span class="cost">${matIcon(k, 18)}${HOME.mats[k]}</span>`).join('');
  const head = `<div class="shophead"><h1>${sell ? 'Sell back' : HOME_IN || HIDE ? 'Cottage shop' : 'Yard shop'}</h1><div class="wallet"><span class="cost"><span class="appl">&#127822;</span>${HOME.apples}</span>${mats}</div></div>`;
  const tabs = HIDE ? '<p class="lbl">What you buy here is a gift to the crew: it goes into the crew storage.</p>' : `<div class="shoptabs"><div class="seg"><button class="${sell ? '' : 'on'}" onclick="buildShop('buy')">Buy</button><button class="${sell ? 'on' : ''}" onclick="buildShop('sell')">Sell</button></div>${sell ? '' : `<div class="seg scats">${cats.map(k => `<button class="${k === shopCatSel ? 'on' : ''}" onclick="buildShop('buy','${k}')">${k}</button>`).join('')}</div>`}</div>`;
  const note = sell ? `<p class="lbl">Selling returns ${Math.round(SELL_BACK * 100)}% of the price. To sell something you placed, point at it in build mode and press Sell.</p>` : '';
  homeScreen(`${head}${tabs}${note}<div class="shop2">${cards.join('') || `<p class="lbl">${sell ? 'Storage is empty.' : 'Nothing here.'}</p>`}</div><div class="row shopfoot"><button class="big" onclick="leaveHomeScreen();renderBar()">Back to building</button></div>`, 'shop');
};
function buyGroundUnlock(ch) { const G = GT[ch]; if (!G || HOME.unlock[G.unlock] || !spendAll(G.ucost)) return buildShop('buy'); HOME.unlock[G.unlock] = 1; homeSave(); try { sfxPlay('gold'); } catch (e) {} buildShop('buy'); }
