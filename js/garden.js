/* ===== THE GARDEN =====
   Every vegetable bed has 8 plots: the bed by the cottage (id 'g0') and every Vegetable bed you place (id = the placed thing's uid, p.u).
   Plant a seed (it costs a few apples), and it grows on the real clock; nothing ever wilts, a ripe crop waits for you. Watering a plot once halves
   the time it still needs (friends visiting can water too). Harvests go to the PANTRY (HOME.pantry): cook them indoors (cozy.js) or sell them at
   the market crate by the barn. Saved in HOME.garden = { bedId: [8 plots] }, a plot = null or { c: crop, at: planted (ms), end: ripe (ms), w: watered }.
   Art: tools/make_garden_art.py (garden_empty, crop_<kind><1-3>, crop_seed). */
const CROPS = {                                                  // seed = apples a seed costs, grow = minutes, yield = [min, max] picked, sell = apples each at the market
  carrot: { name: 'Carrot', seed: 4, grow: 20, yield: [2, 3], sell: 4 },
  lettuce: { name: 'Lettuce', seed: 6, grow: 45, yield: [2, 3], sell: 6 },
  beet: { name: 'Beet', seed: 10, grow: 90, yield: [2, 3], sell: 10 },
  cabbage: { name: 'Cabbage', seed: 16, grow: 180, yield: [2, 2], sell: 17 },
  pumpkin: { name: 'Pumpkin', seed: 30, grow: 360, yield: [1, 2], sell: 48 },
};
const PLOT_AT = [[19, 47], [40, 47], [19, 68], [40, 68], [61, 68], [19, 89], [40, 89], [61, 89]];   // where each plot's crop stands in the bed picture (bottom middle)
const gNow = () => Date.now() + (window.__gardenSkew || 0);                                       // the tests move the clock forward with __gardenSkew
let seedPick = 'carrot';
function gardenLoad() {
  HOME.garden = HOME.garden && typeof HOME.garden === 'object' ? HOME.garden : {};
  HOME.pantry = HOME.pantry && typeof HOME.pantry === 'object' ? HOME.pantry : {};
  for (const b in HOME.garden) if (!Array.isArray(HOME.garden[b]) || HOME.garden[b].length !== 8) HOME.garden[b] = Array(8).fill(null);
}
const bedPlots = id => { gardenLoad(); return HOME.garden[id] || (HOME.garden[id] = Array(8).fill(null)); };
const ripe = q => !!q && gNow() >= q.end;
const growth = q => !q ? 0 : Math.max(0, Math.min(1, (gNow() - q.at) / Math.max(1, q.end - q.at)));
const bedHasCrops = id => !!(HOME.garden && HOME.garden[id] && HOME.garden[id].some(Boolean));
function fmtLeft(ms) { const m = Math.ceil(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); }
/* ----- the beds in the yard ----- */
function gardenBeds() {                                          // [{ id, x, y, f }] (x, y = bottom middle of the bed picture, f = flipped)
  const L = []; const d = HOME_DECOR.find(q => q.k === 'garden'); if (d) L.push({ id: 'g0', x: d.x, y: d.y, f: 0, ex: 2 });
  (HOME.placed && HOME.placed.out || []).forEach(p => { if (p.id === 'veg' && p.u) L.push({ id: p.u, x: p.x, y: p.y + 2, f: p.f, ex: 0 }); }); return L;
}
function bedStatus(id) { const P2 = bedPlots(id), r = P2.filter(ripe).length, g = P2.filter(q => q && !ripe(q)).length; return r ? r + ' ready to pick' : g ? g + ' growing' : 'empty'; }
function gardenInteractables() {
  if (HOME_IN) return []; return gardenBeds().map(b => ({ id: 'bed', soft: 1, x: b.x, y: b.y + 14, r: 54, h: 124, tip: 'Garden bed: ' + bedStatus(b.id), act: () => gardenScreen(b.id) }))
    .concat([{ id: 'market', soft: 1, x: MARKET.x, y: MARKET.y + 16, r: 40, h: 80, tip: isVisiting() ? 'Market crate' : 'Market crate: sell produce', act: marketScreen }]);
}
const MARKET = (() => { const d = HOME_DECOR.find(q => q.k === 'crate_apples'); return d ? { x: d.x, y: d.y } : ho(1040, 416); })();
/* ----- drawing: the empty bed, then each plot's crop at its stage (seed, sprout, growing, ready) ----- */
function drawPlots(id, ox, oy) {                                 // ox, oy = the top-left of the bed picture (in the current transform)
  const P2 = HOME.garden && HOME.garden[id]; if (!P2) return;
  P2.forEach((q, i) => {
    if (!q) return; const [cx, by] = PLOT_AT[i], x = ox + cx, y = oy + by, gr = growth(q), done = ripe(q);
    g.fillStyle = q.w ? 'rgba(38,22,12,.42)' : 'rgba(60,38,20,.22)'; g.beginPath(); g.ellipse(x, y - 2, 8, 3, 0, 0, 7); g.fill();      // wet (watered) or dry soil
    const k = done ? 'crop_' + q.c + '3' : gr < 0.08 ? 'crop_seed' : gr < 0.45 ? 'crop_' + q.c + '1' : 'crop_' + q.c + '2', a = HOME_SRC[k], im = homeImg(k);
    if (a && im && im.complete && im.naturalWidth) g.drawImage(im, Math.round(x - a.w / 2), Math.round(y - a.h), a.w, a.h);
    if (done && Math.sin(t * 3 + i * 1.7) > 0.55) { const sx = Math.round(x + 5), sy = Math.round(y - (a ? a.h : 10)); g.fillStyle = '#fff6c8'; g.fillRect(sx, sy - 2, 1, 5); g.fillRect(sx - 2, sy, 5, 1); }   // a twinkle: ripe
  });
}
/* ----- what you can do (the owner directly; a visitor through social.js, which sends the same op to the owner's game) -----
   op: plant (c = crop), water, harvest, clear. who = null for the owner, else the visitor ({ perm, name }). Returns { ok, msg, got }. */
function gardenApply(op, bed, i, c, who) {
  const P2 = bedPlots(bed), q = P2[i]; if (i < 0 || i > 7) return { msg: 'No such plot' };
  if (op === 'plant') { if (q) return { msg: 'Something is growing there' }; if (!CROPS[c]) return { msg: 'Unknown seed' };
    const now = gNow(); P2[i] = { c, at: now, end: now + CROPS[c].grow * 60000, w: 0 }; if (who) P2[i].by = who.name; return { ok: 1, msg: CROPS[c].name + ' planted' }; }
  if (op === 'water') { if (!q || ripe(q)) return { msg: q ? 'Ready to pick' : 'Nothing to water' }; if (q.w) return { msg: 'Already watered' };
    const now = gNow(); q.end = now + Math.round((q.end - now) / 2); q.w = 1; if (who) q.wb = who.name; return { ok: 1, msg: 'Watered: it will be ready sooner' }; }
  if (op === 'harvest') { if (!q) return { msg: 'Nothing there' }; if (!ripe(q)) return { msg: 'Not ripe yet' };
    const C = CROPS[q.c], n = C.yield[0] + Math.floor(Math.random() * (C.yield[1] - C.yield[0] + 1)); HOME.pantry[q.c] = (HOME.pantry[q.c] || 0) + n; P2[i] = null;
    return { ok: 1, msg: '+' + n + ' ' + C.name.toLowerCase() + (n === 1 ? '' : 's'), got: { [q.c]: n } }; }
  if (op === 'clear') { if (!q) return { msg: 'Nothing there' }; P2[i] = null; return { ok: 1, msg: 'Plot cleared' }; }
  return { msg: '?' };
}
const GARDEN_NEED = { water: 0, plant: 1, harvest: 1, clear: 9 };   // the visit permission each op needs (clear: owner only)
function gardenAct(op, bed, i, c) {
  if (op === 'plant' && !(CROPS[c])) return;
  if (isVisiting()) {                                          // a visitor: pay for the seed yourself, ask the owner's game to do it
    if (visitPerm() < GARDEN_NEED[op]) return gardenScreen(bed, 'Ask your friend for gardening permission');
    if (op === 'plant' && !spendApples(CROPS[c].seed)) return gardenScreen(bed, 'Not enough apples for the seed');
    return socialOp({ k: 'garden', op, bed, i, c }, r => { if (!r.ok && op === 'plant') payApples(CROPS[c].seed); gardenScreen(bed, r.msg); });
  }
  if (op === 'plant' && !spendApples(CROPS[c].seed)) return gardenScreen(bed, 'Not enough apples for the seed');
  const r = gardenApply(op, bed, i, c, null); if (!r.ok && op === 'plant') payApples(CROPS[c].seed);
  homeSave(); if (r.ok && op === 'harvest') try { sfxPlay('pickup'); } catch (e) {}
  gardenScreen(bed, r.msg);
}
function gardenAll(op, bed) {                                    // plant every empty plot with the chosen seed, water or pick everything
  const P2 = bedPlots(bed), idx = P2.map((q, i) => i).filter(i => op === 'plant' ? !P2[i] : op === 'water' ? P2[i] && !P2[i].w && !ripe(P2[i]) : ripe(P2[i]));
  if (!idx.length) return gardenScreen(bed, op === 'plant' ? 'No empty plots' : op === 'water' ? 'Nothing needs water' : 'Nothing is ripe yet');
  if (isVisiting()) {
    if (visitPerm() < GARDEN_NEED[op]) return gardenScreen(bed, 'Ask your friend for gardening permission');
    const cost = op === 'plant' ? CROPS[seedPick].seed * idx.length : 0; if (cost && !spendApples(cost)) return gardenScreen(bed, 'Not enough apples for ' + idx.length + ' seeds');
    return socialOp({ k: 'gardenAll', op, bed, idx, c: seedPick }, r => { if (cost && r.failed) payApples(CROPS[seedPick].seed * r.failed); gardenScreen(bed, r.msg); });
  }
  let n = 0, got = {}; for (const i of idx) { if (op === 'plant' && !spendApples(CROPS[seedPick].seed)) break; const r = gardenApply(op, bed, i, seedPick, null); if (r.ok) { n++; for (const k in r.got || {}) got[k] = (got[k] || 0) + r.got[k]; } }
  homeSave(); gardenScreen(bed, op === 'harvest' ? 'Picked ' + Object.keys(got).map(k => got[k] + ' ' + CROPS[k].name.toLowerCase()).join(', ') : op === 'plant' ? n + ' planted' : n + ' watered');
}
/* ----- the screens ----- */
function cropImg(k, sz = 34) { const a = HOME_SRC[k]; return a ? `<img src="${a.src}" alt="" style="image-rendering:pixelated;height:${sz}px;width:auto;vertical-align:middle">` : ''; }
function pantryLine() { const ks = Object.keys(CROPS).filter(k => HOME.pantry[k] > 0); return ks.length ? ks.map(k => cropImg('crop_' + k + '3', 22) + ' ' + HOME.pantry[k]).join(' &nbsp; ') : 'nothing yet'; }
function gardenScreen(bed, msg) {
  gardenLoad(); const P2 = bedPlots(bed), vis = isVisiting(), perm = vis ? visitPerm() : 9, owner = vis ? esc(VISIT.name) + '\'s' : 'Your';
  const cell = i => { const q = P2[i];
    if (!q) return `<button class="up plot" ${perm >= 1 ? '' : 'disabled'} onclick="gardenAct('plant','${bed}',${i},seedPick)">${cropImg('crop_seed', 18)}<b>Empty</b>${perm >= 1 ? 'plant ' + esc(CROPS[seedPick].name.toLowerCase()) : 'nothing growing'}</button>`;
    const C = CROPS[q.c]; if (ripe(q)) return `<button class="up plot ripe" ${perm >= 1 ? '' : 'disabled'} onclick="gardenAct('harvest','${bed}',${i})">${cropImg('crop_' + q.c + '3')}<b>${esc(C.name)}</b>${perm >= 1 ? 'ready: pick it' : 'ready'}</button>`;
    return `<button class="up plot" ${q.w ? 'disabled' : ''} onclick="gardenAct('water','${bed}',${i})">${cropImg(growth(q) < 0.45 ? 'crop_' + q.c + '1' : 'crop_' + q.c + '2', 26)}<b>${esc(C.name)}</b>${fmtLeft(q.end - gNow())} left${q.w ? '<small>watered' + (q.wb ? ' by ' + esc(q.wb) : '') + '</small>' : '<small>tap to water</small>'}</button>`; };
  const grid = [0, 1, null, 2, 3, 4, 5, 6, 7].map(i => i === null ? '<div class="plot scare">&#127806;</div>' : cell(i)).join('');
  const seeds = Object.keys(CROPS).map(k => `<button class="${seedPick === k ? 'on' : ''}" onclick="seedPick='${k}';gardenScreen('${bed}')">${cropImg('crop_' + k + '3', 18)} ${esc(CROPS[k].name)} <small>${CROPS[k].seed}&#127822; &middot; ${fmtLeft(CROPS[k].grow * 60000)}</small></button>`).join('');
  homeScreen(`<h1>${owner} garden bed</h1><p class="tag">${vis ? (perm >= 1 ? 'You may plant (with your own apples) and pick: what you pick goes to their pantry.' : 'You can water their plants: each watering halves the time left.') : 'Crops grow while you are away and never wilt. Water each plot once to halve the time left.'} You have ${HOME.apples} apples.</p>
  ${perm >= 1 ? `<div class="row"><div class="seg seeds">${seeds}</div></div>` : ''}<div class="plots">${grid}</div>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}
  <div class="row">${perm >= 1 ? `<button class="up" onclick="gardenAll('plant','${bed}')"><b>Plant all</b>empty plots</button>` : ''}<button class="up" onclick="gardenAll('water','${bed}')"><b>Water all</b></button>${perm >= 1 ? `<button class="up" onclick="gardenAll('harvest','${bed}')"><b>Pick all</b>ripe crops</button>` : ''}</div>
  ${vis ? '' : `<p class="lbl">Pantry: ${pantryLine()}. Cook at a stove, fireplace or worktable indoors, or sell at the market crate by the barn.</p>`}
  <div class="row"><button onclick="leaveHomeScreen()">Back outside</button></div>`, 'garden');
}
function marketScreen(msg) {
  if (isVisiting()) return homeScreen(`<h1>Market crate</h1><p class="tag">Sell your produce at your own homestead.</p><div class="row"><button onclick="leaveHomeScreen()">Back</button></div>`, 'market');
  gardenLoad(); const rows = Object.keys(CROPS).map(k => { const n = HOME.pantry[k] || 0, C = CROPS[k];
    return `<button class="up shopi" ${n ? '' : 'disabled style="opacity:.5"'} onclick="sellCrop('${k}',1)">${cropImg('crop_' + k + '3')}<b>${esc(C.name)}</b>${C.sell} apples each &middot; ${n} in the pantry</button>`; }).join('');
  const all = Object.keys(CROPS).reduce((s, k) => s + (HOME.pantry[k] || 0) * CROPS[k].sell, 0);
  homeScreen(`<h1>Market crate</h1><p class="tag">The carter comes by every night and pays in apples. You have ${HOME.apples} apples.</p><div class="row shopgrid">${rows}</div>
  ${msg ? `<p class="lbl" style="color:#9be37f">${esc(msg)}</p>` : ''}<div class="row"><button class="up" ${all ? '' : 'disabled'} onclick="sellCrop('*')"><b>Sell everything</b>${all} apples</button><button onclick="leaveHomeScreen()">Back outside</button></div>`, 'market');
}
function sellCrop(k, n) {
  let got = 0; for (const c of k === '*' ? Object.keys(CROPS) : [k]) { const m = Math.min(HOME.pantry[c] || 0, k === '*' ? 1e9 : n); if (m > 0) { HOME.pantry[c] -= m; got += m * CROPS[c].sell; } }
  if (got) { payApples(got); try { sfxPlay('bank'); } catch (e) {} } marketScreen(got ? 'Sold for ' + got + ' apples' : '');
}
gardenLoad();
