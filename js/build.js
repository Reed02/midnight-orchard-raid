/* ===== BUILD MODE: decorate the homestead and the cottage your own way =====
   Press B (or the Build button) outside or inside the cottage. Buy things in the Shop (they go into your STORAGE), then choose one and place it
   where you like; pick things up again, move them, flip them, or put them back in storage (nothing is ever lost). Inside you can also paint the
   floor tile by tile (wood, or stone once unlocked).
   Saved in HOME.store {id: count}, HOME.placed {out: [...], in: [...]} ({ id, x, y, f: flipped }), HOME.floorIn (one letter per floor tile).
   Rules: solid things cannot go on walls, buildings, paths, trees or each other, nor in front of a door or anything you use, and never where they
   would wall off part of the base (checked by walking a grid from where you stand). Flat things (rugs, flowers, grass, pebbles) go almost anywhere. */
const CAT = [
  { id: 'crate', k: 'crate_a', name: 'Crate', price: 6, where: 'both' }, { id: 'crate2', k: 'crate_b', name: 'Tall crate', price: 8, where: 'both' },
  { id: 'applecrate', k: 'crate_apples', name: 'Crate of apples', price: 12, where: 'both' }, { id: 'barrel', k: 'barrel', name: 'Barrel', price: 8, where: 'both' },
  { id: 'logs1', k: 'logs_a', name: 'Firewood', price: 4, where: 'both' }, { id: 'logs2', k: 'logs_b', name: 'Log pile', price: 5, where: 'both' }, { id: 'logs3', k: 'logs_c', name: 'Big log pile', price: 7, where: 'both' },
  { id: 'rugS', k: 'int_rug_small', name: 'Small rug', price: 25, where: 'in', flat: true, sc: 1.4 }, { id: 'rugB', k: 'int_rug_big', name: 'Big rug', price: 50, where: 'in', flat: true, sc: 1.55 },
  { id: 'hay', k: 'hay_s', name: 'Hay bales', price: 8, where: 'out' }, { id: 'haybig', k: 'hay_b', name: 'Hay stack', price: 15, where: 'out' },
  { id: 'veg', k: 'garden', name: 'Vegetable bed', price: 30, where: 'out' },
  { id: 'rock1', k: 'nat_rock3', name: 'Rock', price: 8, where: 'out' }, { id: 'rock2', k: 'nat_moss3', name: 'Mossy rock', price: 10, where: 'out' }, { id: 'rock3', k: 'nat_boulder2', name: 'Boulder', price: 14, where: 'out' },
  { id: 'poppy', k: 'nat_flower16', name: 'Poppy', price: 3, where: 'out', flat: true }, { id: 'sunny', k: 'nat_flower2', name: 'Yellow flower', price: 3, where: 'out', flat: true },
  { id: 'violet', k: 'nat_flower3', name: 'Violet', price: 3, where: 'out', flat: true }, { id: 'pink', k: 'nat_flower10', name: 'Pink flower', price: 3, where: 'out', flat: true },
  { id: 'bluebell', k: 'nat_flower20', name: 'Bluebell', price: 3, where: 'out', flat: true }, { id: 'daisy', k: 'nat_flower23', name: 'Daisy', price: 3, where: 'out', flat: true },
  { id: 'wild', k: 'nat_flower5', name: 'Wildflowers', price: 4, where: 'out', flat: true }, { id: 'grass', k: 'nat_grass0', name: 'Grass tuft', price: 1, where: 'out', flat: true },
  { id: 'tall', k: 'nat_tall0', name: 'Tall grass', price: 2, where: 'out', flat: true }, { id: 'pebble', k: 'nat_pebble0', name: 'Pebble', price: 1, where: 'out', flat: true },
];
const BRUSHES = [{ id: 'w', k: 'int_floor_wood', name: 'Wood floor' }, { id: 's', k: 'int_floor_stone', name: 'Stone floor', unlock: 'stonefloor', price: 35 }];
const catItem = id => CAT.find(c => c.id === id);
let BUILD = { on: false, cx: 0, cy: 0, held: null, brush: null, msg: '', msgT: 0, mouse: false };
const bWhere = () => HOME_IN ? 'in' : 'out';
const fits = (c, w) => c.where === 'both' || c.where === w;
/* ----- saved data ----- */
function buildLoad() {
  HOME.store = HOME.store && typeof HOME.store === 'object' ? HOME.store : {}; HOME.placed = Object.assign({ out: [], in: [] }, HOME.placed || {}); HOME.unlock = HOME.unlock || {};
  for (const w of ['out', 'in']) HOME.placed[w] = (Array.isArray(HOME.placed[w]) ? HOME.placed[w] : []).filter(p => p && catItem(p.id) && isFinite(p.x) && isFinite(p.y));
  if (typeof HOME.floorIn !== 'string' || HOME.floorIn.length !== ICOLS * IROWS) HOME.floorIn = 'w'.repeat(ICOLS * IROWS);
  HOME.mig = HOME.mig || {}; if (!HOME.mig.rugs) { HOME.mig.rugs = 1; if (HOME.fix.rug2) HOME.placed.in.push({ id: 'rugB', x: ICX, y: IFY0 + 192, f: 0 }); else if (HOME.fix.rug1) HOME.placed.in.push({ id: 'rugS', x: ICX, y: IFY0 + 151, f: 0 }); }   // rugs used to be fix-ups
}
buildLoad();
/* ----- size, footprint and drawing of a placed thing ----- */
function pSize(p) { const c = catItem(p.id), a = HOME_SRC[c.k] || { w: 30, h: 30 }, s = c.sc || 1; return { w: Math.round(a.w * s), h: Math.round(a.h * s), c }; }
function pPoly(p, where) {                                    // its solid shape: the picture's outline outside (like the rest of the yard), a base box indoors
  const { w, h, c } = pSize(p); if (c.flat) return null;
  if ((where || bWhere()) === 'out') { const pr = profPoly(c.k, p.x, p.y, 2); if (pr) return p.f ? pr.map(([x, y]) => [2 * p.x - x, y]) : pr; }
  return boxFp(p.x, p.y, Math.max(8, w * 0.42), clampN(h * 0.3, 8, 24));
}
function drawPlaced(p, alpha, tint) {
  const { w, h, c } = pSize(p), im = homeImg(c.k); if (!im || !im.complete || !im.naturalWidth) return; g.save(); g.imageSmoothingEnabled = false; if (alpha !== undefined) g.globalAlpha = alpha;
  if (!c.flat && alpha === undefined) { if (bWhere() === 'out') castShadow(c.k, p.x, p.y + 2, w, h, p.f); else shadow(p.x + 3, p.y - 1, w * 0.36); }
  g.translate(Math.round(p.x), Math.round(p.y + (c.flat ? 0 : 2))); if (p.f) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h);
  if (tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.35; g.fillStyle = tint; g.fillRect(-w / 2, -h, w, h); }
  g.restore(); if (!c.flat && alpha === undefined && bWhere() === 'out') drawFringe(c.k, p.x, p.y, 2);
}
function castShadow(k, x, by, w, h, flip) { const sh = shadowOf(k); g.save(); g.globalAlpha = SUN.alpha; g.transform(1, 0, -SUN.lean, SUN.squash, x, by); if (flip) g.scale(-1, 1); g.drawImage(sh, -w / 2, -h, w, h); g.restore(); }
const placedHere = () => HOME.placed[bWhere()];
function placedPolys(where) { return HOME.placed[where].map(p => pPoly(p, where)).filter(Boolean); }
function rebuildSolids() {                                     // the collision shapes, after anything was placed or moved
  if (HOME_IN) HPOLY = interiorPolys().concat(placedPolys('in'));
  else { HPOLY = homeFootprints(); obs.forEach(q => { if (q.k === 'hrock') { const p = profPoly(q.img, q.x, q.y + q.r * 0.45, 2); if (p) HPOLY.push(p); } }); }
}
/* ----- where things may go ----- */
function area() { return HOME_IN ? { x0: IFX0, x1: IFX1, y0: IFY0, y1: IFY1 } : { x0: 36, x1: W - 36, y0: 130, y1: H - 16 }; }
function reserved() {                                          // spots kept clear: in front of doors and everything you use, where you stand
  const r = interactables().map(o => ({ x: o.x, y: o.y, r: 30 })); r.push({ x: P.x, y: P.y, r: 22 });
  if (HOME_IN) r.push({ x: ICX, y: IFY1 - 20, r: 44 }); else r.push({ x: SPAWN.x, y: SPAWN.y, r: 26 }, { x: HOUSE.x - 52, y: HOUSE.y + 30, r: 34 }); return r;
}
function whyNot(p) {                                           // null if it can go here, else a short reason
  const { w, h, c } = pSize(p), A = area();
  if (p.x - w / 2 < A.x0 - 2 || p.x + w / 2 > A.x1 + 2 || p.y > A.y1 + 2 || p.y - (c.flat ? h : Math.min(h * 0.3, 24)) < A.y0 - 2) return HOME_IN ? 'Keep it on the floor' : 'Too close to the edge';
  const mine = pPoly(p), statics = HOME_IN ? interiorPolys() : HPOLY;
  if (c.flat) { if (statics.some(q => inPoly(p.x, p.y - 2, q))) return 'Not under a building'; return null; }
  if (!HOME_IN && onPath(p.x, p.y - 4, 22)) return 'Keep the paths clear';
  const hits = q => mine.some(([x, y]) => inPoly(x, y, q)) || q.some(([x, y]) => inPoly(x, y, mine)) || polyDist(p.x, p.y - 4, q) < 3;
  if (statics.some(hits) || placedPolys(bWhere()).some(hits)) return 'Something is in the way';
  if (!HOME_IN && obs.some(o => o.k === 'tree' && polyDist(o.x, o.y, mine) < o.r + 2)) return 'A tree is in the way';
  if (reserved().some(z => polyDist(z.x, z.y, mine) < z.r)) return 'That spot needs to stay clear';
  return null;
}
function walledOff(extra) {                                   // would this cut the base in two? walk a grid from the raccoon and check every place you use is still reachable
  const A = HOME_IN ? { x0: IFX0, x1: IFX1, y0: IFY0, y1: IFY1 + 20 } : { x0: 30, x1: W - 30, y0: 52, y1: H - 20 }, S = HOME_IN ? 8 : 12, cols = Math.ceil((A.x1 - A.x0) / S), rows = Math.ceil((A.y1 - A.y0) / S);
  const polys = (HOME_IN ? interiorPolys().concat(placedPolys('in')) : HPOLY.concat(placedPolys('out').filter(q => !HPOLY.includes(q)))).concat([extra]);
  const circles = HOME_IN ? [] : obs.filter(o => solid(o) && o.k !== 'hrock'); const free = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = A.x0 + (i + 0.5) * S, y = A.y0 + (j + 0.5) * S; free[j * cols + i] = !polys.some(q => inPoly(x, y, q) || polyDist(x, y, q) < 9) && !circles.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 9) ? 1 : 0; }
  const cell = (x, y) => { const i = Math.floor((x - A.x0) / S), j = Math.floor((y - A.y0) / S); return i >= 0 && j >= 0 && i < cols && j < rows ? j * cols + i : -1; };
  const seen = new Uint8Array(cols * rows), st = []; let s0 = cell(P.x, P.y); if (s0 < 0) return false;
  if (!free[s0]) { let best = -1, bd = 1e9; for (let k = 0; k < free.length; k++) if (free[k]) { const d = Math.hypot(A.x0 + (k % cols + 0.5) * S - P.x, A.y0 + (Math.floor(k / cols) + 0.5) * S - P.y); if (d < bd) { bd = d; best = k; } } if (best < 0 || bd > 30) return true; s0 = best; }
  seen[s0] = 1; st.push(s0); while (st.length) { const k = st.pop(), i = k % cols, j = (k - i) / cols; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= cols || b >= rows) continue; const n = b * cols + a; if (free[n] && !seen[n]) { seen[n] = 1; st.push(n); } } }
  const reach = (x, y, r) => { for (let k = 0; k < seen.length; k++) if (seen[k] && Math.hypot(A.x0 + (k % cols + 0.5) * S - x, A.y0 + (Math.floor(k / cols) + 0.5) * S - y) < r) return true; return false; };
  return !interactables().every(o => reach(o.x, o.y, Math.max(18, o.r - 6))) || (HOME_IN && !reach(ICX, IFY1 + 6, 20));
}
/* ----- the mode itself ----- */
function buildToggle(on) {
  if (state !== 'home') return; on = on === undefined ? !BUILD.on : on;
  if (!on && BUILD.held) storeHeld(); BUILD.on = on; BUILD.brush = null; for (const k in keys) keys[k] = false; drag = null; wheel = null;
  if (on) { BUILD.cx = clampN(P.x, area().x0 + 10, area().x1 - 10); BUILD.cy = clampN(P.y + (HOME_IN ? -30 : 40), area().y0 + 30, area().y1 - 10); say(HOME_IN ? 'Build mode: decorate your room' : 'Build mode: decorate your homestead'); }
  else { rebuildSolids(); homeSave(); } renderBar();
}
function say(m) { BUILD.msg = m; BUILD.msgT = t + 2.4; }
function pickFromStore(id) {
  if (BUILD.held) storeHeld(); BUILD.brush = null; if (!(HOME.store[id] > 0)) return say('None in storage: buy more in the Shop');
  HOME.store[id]--; BUILD.held = { id, x: BUILD.cx, y: BUILD.cy, f: 0 }; homeSave(); renderBar();
}
function storeHeld() { if (!BUILD.held) return; HOME.store[BUILD.held.id] = (HOME.store[BUILD.held.id] || 0) + 1; BUILD.held = null; homeSave(); renderBar(); }
function hovered() {                                           // the placed thing under the cursor (the front-most)
  let best = null; placedHere().forEach(p => { const { w, h } = pSize(p); if (BUILD.cx > p.x - w / 2 && BUILD.cx < p.x + w / 2 && BUILD.cy > p.y - h && BUILD.cy < p.y + 4 && (!best || p.y > best.y)) best = p; }); return best;
}
function buildAct() {                                          // E / click: place what you hold, paint, or pick up what is under the cursor
  if (BUILD.brush) return paintFloor();
  if (BUILD.held) {
    const p = { id: BUILD.held.id, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy), f: BUILD.held.f }, why = whyNot(p); if (why) return say(why);
    if (!catItem(p.id).flat && walledOff(pPoly(p))) return say('That would block the way');
    placedHere().push(p); BUILD.held = null; rebuildSolids(); homeSave(); renderBar(); popFx && fxBurst(p.x, p.y - 6, 8, { col: ['#fff6c8', '#d9bb7e'], s1: 60, l1: 0.5, r1: 2.5 }); return;
  }
  const h = hovered(); if (!h) return say('Choose something below, or point at a thing to pick it up');
  placedHere().splice(placedHere().indexOf(h), 1); BUILD.held = { id: h.id, x: h.x, y: h.y, f: h.f }; rebuildSolids(); homeSave(); renderBar();
}
function buildStore() {                                        // Q: put what you hold away, or put away what is under the cursor
  if (BUILD.brush) { BUILD.brush = null; return renderBar(); } if (BUILD.held) return storeHeld();
  const h = hovered(); if (!h) return; placedHere().splice(placedHere().indexOf(h), 1); HOME.store[h.id] = (HOME.store[h.id] || 0) + 1; rebuildSolids(); homeSave(); renderBar(); say(catItem(h.id).name + ' put in storage');
}
function buildFlip() { if (BUILD.held) BUILD.held.f = BUILD.held.f ? 0 : 1; else { const h = hovered(); if (h) { h.f = h.f ? 0 : 1; rebuildSolids(); homeSave(); } } }
function floorCell(x, y) { const i = Math.floor((x - IFX0) / IT), j = Math.floor((y - IFY0) / IT); return i >= 0 && j >= 0 && i < ICOLS && j < IROWS ? j * ICOLS + i : -1; }
function paintFloor() { const c = floorCell(BUILD.cx, BUILD.cy); if (c < 0) return; const s = HOME.floorIn; HOME.floorIn = s.slice(0, c) + BUILD.brush + s.slice(c + 1); homeSave(); }
function pickBrush(id) { const b = BRUSHES.find(q => q.id === id); if (!b) return; if (b.unlock && !HOME.unlock[b.unlock]) return say('Unlock ' + b.name.toLowerCase() + ' in the Shop'); if (BUILD.held) storeHeld(); BUILD.brush = id; renderBar(); }
function buildKey(k) {
  if (k === 'b' || BIND.pause.includes(k)) return buildToggle(false);
  if (BIND.mute.includes(k)) return toggleMute();
  if (k === 'e' || k === 'enter' || k === ' ' || BIND.shake.includes(k)) return buildAct(); if (k === 'q' || k === 'delete' || k === 'backspace') return buildStore(); if (k === 'f') return buildFlip();
  if (/^[1-9]$/.test(k)) { const s = barSlots()[+k - 1]; if (s) s.brush ? pickBrush(s.id) : pickFromStore(s.id); }
}
function updateBuild(dt) {
  t += dt; const mv = moveVec('raccoon'); const m = Math.hypot(mv.x, mv.y); if (m) { BUILD.mouse = false; BUILD.cx += mv.x / m * 240 * dt; BUILD.cy += mv.y / m * 240 * dt; }
  const A = area(); BUILD.cx = clampN(BUILD.cx, A.x0, A.x1); BUILD.cy = clampN(BUILD.cy, A.y0, A.y1); P.moving = false; anim = 0; homeNear = null;
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
}
function drawBuildOverlay() {                                  // inside the world transform: the floor grid, the ghost and the cursor
  if (!BUILD.on) return; g.save();
  if (HOME_IN && BUILD.brush) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; for (let i = 0; i <= ICOLS; i++) { g.beginPath(); g.moveTo(IFX0 + i * IT + .5, IFY0); g.lineTo(IFX0 + i * IT + .5, IFY1); g.stroke(); } for (let j = 0; j <= IROWS; j++) { g.beginPath(); g.moveTo(IFX0, IFY0 + j * IT + .5); g.lineTo(IFX1, IFY0 + j * IT + .5); g.stroke(); }
    const c = floorCell(BUILD.cx, BUILD.cy); if (c >= 0) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.strokeRect(IFX0 + (c % ICOLS) * IT + 1, IFY0 + Math.floor(c / ICOLS) * IT + 1, IT - 2, IT - 2); } }
  if (BUILD.held) { const p = { id: BUILD.held.id, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy), f: BUILD.held.f }, bad = whyNot(p); drawPlaced(p, 0.75, bad ? '#ff3030' : '#40ff70');
    const q = pPoly(p); if (q) { g.strokeStyle = bad ? 'rgba(255,80,80,.8)' : 'rgba(120,255,140,.8)'; g.lineWidth = 1.5; g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke(); } }
  else if (!BUILD.brush) { const h = hovered(); if (h) { const { w, h: hh } = pSize(h); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(h.x - w / 2 - 2, h.y - hh - 2, w + 4, hh + 6); g.setLineDash([]); } }
  g.strokeStyle = '#fff7e6'; g.lineWidth = 2; g.beginPath(); g.moveTo(BUILD.cx - 7, BUILD.cy); g.lineTo(BUILD.cx + 7, BUILD.cy); g.moveTo(BUILD.cx, BUILD.cy - 7); g.lineTo(BUILD.cx, BUILD.cy + 7); g.stroke();
  g.restore();
}
function drawBuildHud() {
  if (!BUILD.on) { return; } g.save(); g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center';
  const txt = t < BUILD.msgT ? BUILD.msg : BUILD.held ? catItem(BUILD.held.id).name + ': ' + (whyNot({ id: BUILD.held.id, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy), f: BUILD.held.f }) || 'press E to place') : BUILD.brush ? 'Painting: E paints a tile' : hovered() ? catItem(hovered().id).name + ': E pick up, F flip, Q store' : 'Build mode';
  const w = g.measureText(txt).width + 24; g.fillStyle = 'rgba(10,24,40,.88)'; g.fillRect(VW / 2 - w / 2, 46, w, 26); g.fillStyle = '#ffd23f'; g.fillRect(VW / 2 - w / 2, 46, 3, 26); g.fillStyle = '#fff7e6'; g.textBaseline = 'middle'; g.fillText(txt, VW / 2, 59.5); g.restore();
}
/* ----- the bar at the bottom of the screen (DOM, so it works with mouse and touch) ----- */
function barSlots() {
  const w = bWhere(), s = CAT.filter(c => fits(c, w) && HOME.store[c.id] > 0).map(c => ({ id: c.id, k: c.k, name: c.name, n: HOME.store[c.id] }));
  if (HOME_IN) BRUSHES.forEach(b => s.push({ id: b.id, k: b.k, name: b.name, brush: true, locked: b.unlock && !HOME.unlock[b.unlock] })); return s;
}
function renderBar() {
  let bar = $('buildbar'); if (!bar) { bar = document.createElement('div'); bar.id = 'buildbar'; $('wrap').appendChild(bar); bar.addEventListener('pointerdown', e => e.stopPropagation()); }
  let btn = $('buildbtn'); if (!btn) { btn = document.createElement('button'); btn.id = 'buildbtn'; btn.textContent = 'Build'; btn.title = 'Build mode (B)'; btn.onclick = () => buildToggle(true); $('wrap').appendChild(btn); }
  if (!BUILD.on) { bar.style.display = 'none'; return; }
  const slots = barSlots().map((s, i) => { const src = HOME_SRC[s.k] ? HOME_SRC[s.k].src : ''; const on = (BUILD.held && BUILD.held.id === s.id) || (BUILD.brush === s.id);
    return `<button class="bslot${on ? ' on' : ''}${s.locked ? ' locked' : ''}" title="${esc(s.name)}" onclick="${s.brush ? `pickBrush('${s.id}')` : `pickFromStore('${s.id}')`}"><img src="${src}" alt=""><span>${i < 9 ? i + 1 : ''}</span>${s.n !== undefined ? `<i>${s.n}</i>` : ''}</button>`; }).join('');
  bar.innerHTML = `<div class="bslots">${slots || '<span class="bempty">Storage is empty: buy things in the Shop</span>'}</div>
  <div class="bacts"><button onclick="buildAct()">${BUILD.held ? 'Place' : BUILD.brush ? 'Paint' : 'Pick up'}</button><button onclick="buildFlip()">Flip</button><button onclick="buildStore()">Store</button><button onclick="buildShop()">Shop</button><button class="bdone" onclick="buildToggle(false)">Done</button></div>`;
}
function buildBarTick() {                                      // show / hide the bar and the Build button with the game state
  const bar = $('buildbar'), btn = $('buildbtn'); if (!bar || !btn) return renderBar();
  const b = state === 'home' && BUILD.on ? 'flex' : 'none', bb = state === 'home' && !BUILD.on ? 'block' : 'none'; if (bar.style.display !== b) bar.style.display = b; if (btn.style.display !== bb) btn.style.display = bb;
}
function buildShop() {
  if (BUILD.held) storeHeld(); const w = bWhere();
  const rows = CAT.filter(c => fits(c, w)).map(c => { const src = HOME_SRC[c.k] ? HOME_SRC[c.k].src : '', can = HOME.apples >= c.price;
    return `<button class="up shopi" ${can ? '' : 'disabled style="opacity:.5"'} onclick="buyItem('${c.id}')"><img src="${src}" alt=""><b>${esc(c.name)}</b>${c.price} apples${HOME.store[c.id] ? ' &middot; ' + HOME.store[c.id] + ' stored' : ''}</button>`; }).join('');
  const br = HOME_IN ? BRUSHES.filter(b => b.unlock).map(b => HOME.unlock[b.unlock] ? '' : `<button class="up shopi" ${HOME.apples >= b.price ? '' : 'disabled style="opacity:.5"'} onclick="buyUnlock('${b.unlock}',${b.price})"><img src="${HOME_SRC[b.k] ? HOME_SRC[b.k].src : ''}" alt=""><b>${esc(b.name)} tiles</b>${b.price} apples, paint as many as you like</button>`).join('') : '';
  homeScreen(`<h1>${HOME_IN ? 'Furnish your room' : 'Garden and yard shop'}</h1><p class="tag">Things you buy go into storage. Place them, move them, put them away: nothing is ever lost. You have ${HOME.apples} apples.</p>
  <div class="row shopgrid">${rows}${br}</div><div class="row"><button class="big" onclick="leaveHomeScreen();renderBar()">Back to building</button></div>`, 'shop');
}
function buyItem(id) { const c = catItem(id); if (!c || !spendApples(c.price)) return buildShop(); HOME.store[id] = (HOME.store[id] || 0) + 1; homeSave(); buildShop(); }
function buyUnlock(u, price) { if (HOME.unlock[u] || !spendApples(price)) return buildShop(); HOME.unlock[u] = 1; homeSave(); buildShop(); }
/* ----- mouse and touch: point to move the cursor, click / tap to act ----- */
cv.addEventListener('pointerdown', e => {
  if (!(state === 'home' && BUILD.on)) return; const p = pt(e); if (speakerHit(p) || pauseHit(p)) return;
  BUILD.cx = clampN(p.x + cam.x, area().x0, area().x1); BUILD.cy = clampN(p.y + cam.y, area().y0, area().y1); BUILD.mouse = true; e.stopImmediatePropagation(); buildAct();
}, true);
cv.addEventListener('pointermove', e => { if (state === 'home' && BUILD.on && e.pointerType === 'mouse') { const p = pt(e); BUILD.cx = clampN(p.x + cam.x, area().x0, area().x1); BUILD.cy = clampN(p.y + cam.y, area().y0, area().y1); BUILD.mouse = true; } });
const _followCamB = followCam;                                 // outside, the camera follows the build cursor
followCam = function (dt) { if (BUILD.on && state === 'home' && !HOME_IN) { const tx = clampN(BUILD.cx - VW / 2, 0, W - VW), ty = clampN(BUILD.cy - 30 - VH / 2, 0, H - VH), f = Math.min(1, dt * 5); if (!BUILD.mouse) { cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f; } return; } return _followCamB(dt); };
setInterval(() => { try { buildBarTick(); } catch (e) {} }, 250);
