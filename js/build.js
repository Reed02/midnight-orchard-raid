/* ===== BUILD MODE: decorate the homestead and the cottage your own way =====
   Press B (or the Build button) outside or inside the cottage. Buy things in the Shop (they go into your STORAGE), then choose one and place it
   where you like; pick things up again, move them, flip them, or put them back in storage (nothing is ever lost). Inside you can also paint the
   floor tile by tile (wood, or stone once unlocked).
   Saved in HOME.store {id: count}, HOME.placed {out: [...], in: [...]} ({ id, x, y, f: flipped }), HOME.floorIn (one letter per floor tile).
   Rules: solid things cannot go on walls, buildings, paths, trees or each other, nor in front of a door or anything you use, and never where they
   would wall off part of the base (checked by walking a grid from where you stand). Flat things (rugs, flowers, grass, pebbles) go almost anywhere. */
const CAT = [   // prices are tiers (ECONOMY in the README): decor a few apples, props tens, furniture hundreds, showpieces most of a winning raid
  { id: 'grass', k: 'nat_grass0', name: 'Grass tuft', price: 2, where: 'out', flat: true }, { id: 'pebble', k: 'nat_pebble0', name: 'Pebble', price: 2, where: 'out', flat: true },
  { id: 'tall', k: 'nat_tall0', name: 'Tall grass', price: 4, where: 'out', flat: true },
  { id: 'poppy', k: 'nat_flower16', name: 'Poppy', price: 6, where: 'out', flat: true }, { id: 'sunny', k: 'nat_flower2', name: 'Yellow flower', price: 6, where: 'out', flat: true },
  { id: 'violet', k: 'nat_flower3', name: 'Violet', price: 6, where: 'out', flat: true }, { id: 'pink', k: 'nat_flower10', name: 'Pink flower', price: 6, where: 'out', flat: true },
  { id: 'bluebell', k: 'nat_flower20', name: 'Bluebell', price: 6, where: 'out', flat: true }, { id: 'daisy', k: 'nat_flower23', name: 'Daisy', price: 6, where: 'out', flat: true },
  { id: 'wild', k: 'nat_flower5', name: 'Wildflowers', price: 8, where: 'out', flat: true },
  { id: 'logs1', k: 'logs_a', name: 'Firewood', price: 12, where: 'both' }, { id: 'logs2', k: 'logs_b', name: 'Log pile', price: 15, where: 'both' }, { id: 'logs3', k: 'logs_c', name: 'Big log pile', price: 20, where: 'both' },
  { id: 'rock1', k: 'nat_rock3', name: 'Rock', price: 15, where: 'out' }, { id: 'rock2', k: 'nat_moss3', name: 'Mossy rock', price: 20, where: 'out' }, { id: 'rock3', k: 'nat_boulder2', name: 'Boulder', price: 30, where: 'out' },
  { id: 'crate', k: 'crate_a', name: 'Crate', price: 18, where: 'both' }, { id: 'crate2', k: 'crate_b', name: 'Tall crate', price: 22, where: 'both' },
  { id: 'barrel', k: 'barrel', name: 'Barrel', price: 22, where: 'both' }, { id: 'applecrate', k: 'crate_apples', name: 'Crate of apples', price: 35, where: 'both' },
  { id: 'hay', k: 'hay_s', name: 'Hay bales', price: 20, where: 'out' }, { id: 'haybig', k: 'hay_b', name: 'Hay stack', price: 40, where: 'out' },
  { id: 'veg', k: 'garden', name: 'Vegetable bed', price: 90, where: 'out' },
  // cottage furniture (art: tools/cut_furniture_assets.py); the small pieces also go outside
  { id: 'bucket', k: 'fur_bucket', name: 'Bucket', price: 25, where: 'both' }, { id: 'lantern', k: 'fur_lantern', name: 'Lantern', price: 25, mats: { jar: 1 }, where: 'both' },
  { id: 'kindling', k: 'fur_kindling', name: 'Kindling stack', price: 30, where: 'both' }, { id: 'fernS', k: 'fur_fernsmall', name: 'Small fern', price: 35, where: 'both' },
  { id: 'fern', k: 'fur_fern', name: 'Potted fern', price: 45, mats: { seeds: 1 }, where: 'both' }, { id: 'rugS', k: 'int_rug_small', name: 'Small rug', price: 80, where: 'in', flat: true, sc: 1.4 },
  { id: 'nightstand', k: 'fur_nightstand', name: 'Nightstand', price: 70, mats: { planks: 1, nails: 1 }, where: 'in' }, { id: 'chest', k: 'fur_chest', name: 'Iron-bound chest', price: 95, mats: { planks: 2, nails: 3 }, where: 'both' },
  { id: 'armchair', k: 'fur_armchair', name: 'Armchair', price: 110, mats: { wool: 2, planks: 1 }, where: 'in' }, { id: 'armchair2', k: 'fur_armchair2', name: 'Fireside chair', price: 110, mats: { wool: 2, planks: 1 }, where: 'in' },
  { id: 'rugB', k: 'int_rug_big', name: 'Big rug', price: 150, where: 'in', flat: true, sc: 1.55 }, { id: 'coffeetable', k: 'fur_coffeetable', name: 'Coffee table', price: 125, mats: { planks: 2, nails: 1 }, where: 'in' },
  { id: 'rugD', k: 'fur_rug', name: 'Woven runner', price: 180, where: 'in', flat: true, sc: 1.25 }, { id: 'dresser', k: 'fur_dresser', name: 'Chest of drawers', price: 175, mats: { planks: 3, nails: 2 }, where: 'in' },
  { id: 'bookshelf', k: 'fur_bookshelf', name: 'Bookshelf', price: 200, mats: { planks: 4, nails: 2 }, where: 'in' }, { id: 'worktable', k: 'fur_worktable', name: 'Kitchen worktable', price: 280, where: 'in' },
  { id: 'bed', k: 'fur_bed', name: 'Quilted bed', price: 280, mats: { planks: 3, wool: 3 }, where: 'in' }, { id: 'wardrobe', k: 'fur_wardrobe', name: 'Wardrobe', price: 300, mats: { planks: 4, nails: 3 }, where: 'in' },
  { id: 'sofa', k: 'fur_sofa', name: 'Sofa', price: 340, mats: { wool: 4, planks: 2 }, where: 'in' }, { id: 'hutch', k: 'fur_hutch', name: 'Dish hutch', price: 360, mats: { planks: 4, jar: 2 }, where: 'in' },
  { id: 'stove', k: 'fur_stove', name: 'Iron stove', price: 420, mats: { nails: 6, gear: 1 }, where: 'in' }, { id: 'dining', k: 'fur_dining', name: 'Dining set', price: 480, mats: { planks: 5, nails: 4 }, where: 'in' },
  { id: 'spinwheel', k: 'fur_spinwheel', name: 'Spinning wheel', price: 520, mats: { planks: 3, wool: 2, thread: 1 }, where: 'in' }, { id: 'clock', k: 'fur_clock', name: 'Grandfather clock', price: 600, mats: { planks: 3, gear: 2 }, where: 'in' },
  { id: 'fireplace', k: 'fur_fireplace', name: 'Stone fireplace', price: 900, where: 'in' },
  // the workshop, and the farm / neighbour pieces (village.js). hide: not in the shop (they come from projects, the request board and neighbours)
  { id: 'workbench', k: 'workbench', name: 'Workbench', price: 60, mats: { rope: 2, nails: 2 }, where: 'both' },
  { id: 'board', k: 'board', name: 'Request board', price: 10, where: 'out', hide: 1 },
  { id: 'p_cart', k: 'cart', name: 'Handcart', price: 10, where: 'out', hide: 1 }, { id: 'p_bridge', k: 'bridge_rope', name: 'Rope bridge', price: 10, where: 'out', hide: 1 },
  { id: 'p_gate', k: 'gate', name: 'Fence gate', price: 10, where: 'out', hide: 1 }, { id: 'p_stile', k: 'stile', name: 'Stile', price: 10, where: 'out', hide: 1 },
  { id: 'plot_badger', k: 'plot_badger', name: 'Badger plot', price: 25, where: 'out', hide: 1 }, { id: 'plot_hedgehog', k: 'plot_hedgehog', name: 'Hedgehog plot', price: 40, where: 'out', hide: 1 },
  { id: 'plot_owl', k: 'plot_owl', name: 'Owl plot', price: 60, where: 'out', hide: 1 }, { id: 'plot_mole', k: 'plot_mole', name: 'Mole plot', price: 80, where: 'out', hide: 1 },
  { id: 'nhome_badger', k: 'nhome_badger', name: "Bramble's burrow", price: 0, where: 'out', hide: 1 }, { id: 'nhome_hedgehog', k: 'nhome_hedgehog', name: "Hazel's stall", price: 0, where: 'out', hide: 1 },
  { id: 'nhome_owl', k: 'nhome_owl', name: "Sage's tree", price: 0, where: 'out', hide: 1 }, { id: 'nhome_mole', k: 'nhome_mole', name: "Digby's mine", price: 0, where: 'out', hide: 1 },
];
const BRUSHES = [{ id: 'w', k: 'int_floor_wood', name: 'Wood floor' }, { id: 's', k: 'int_floor_stone', name: 'Stone floor', unlock: 'stonefloor', price: 250 },
  { id: 'd', k: 'int_floor_wood', name: 'Dark oak floor', unlock: 'oakfloor', price: 150, tint: 'rgba(38,18,8,.45)' }];
const TOOLS = [{ id: 'floor', name: 'Floor: add floor, or knock down a wall you built' }, { id: 'wall', name: 'Wall: build a wall' }, { id: 'remove', name: 'Remove: sell back floor or walls you added' }];   // reshaping the house (inside only)
const TOOLICON = {};
function toolIcon(id) {                                        // small pictures for the bar, drawn once from the room's own art
  if (TOOLICON[id]) return TOOLICON[id]; const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const wood = inImg('int_floor_wood'), wall = inImg('int_wall0'), br = BRUSHES.find(b => b.id === id);
  if (br) { const p = inImg(br.k); if (!p) return ''; x.drawImage(p[0], 0, 0, IT, IT, 0, 0, 40, 40); if (br.tint) { x.fillStyle = br.tint; x.fillRect(0, 0, 40, 40); } return (TOOLICON[id] = c.toDataURL()); }
  if (!wood || !wall) return '';
  if (id === 'floor') { x.drawImage(wood[0], 0, 0, IT, IT, 0, 0, 40, 40); x.fillStyle = '#9be37f'; x.fillRect(16, 7, 8, 26); x.fillRect(7, 16, 26, 8); }
  else if (id === 'wall') { x.drawImage(wood[0], 0, 0, IT, IT, 0, 0, 40, 40); x.drawImage(wall[0], 0, 0, wall[1].w, wall[1].h, 6, 2, 28, 28); x.fillStyle = WALLC; x.fillRect(6, 30, 28, 8); }
  else { x.drawImage(wood[0], 0, 0, IT, IT, 0, 0, 40, 40); x.strokeStyle = '#ff8a7a'; x.lineWidth = 6; x.beginPath(); x.moveTo(9, 9); x.lineTo(31, 31); x.moveTo(31, 9); x.lineTo(9, 31); x.stroke(); }
  return (TOOLICON[id] = c.toDataURL());
}
const catItem = id => CAT.find(c => c.id === id);
function othersHere() { return typeof socialOthers === 'function' ? socialOthers() : []; }   // other players' raccoons in this part of the homestead (visits, social.js)
const SELL_BACK = 0.6;                                         // selling something back returns this share of its price
const sellPrice = id => Math.max(1, Math.floor((catItem(id) ? catItem(id).price : 0) * SELL_BACK));
let BUILD = { on: false, cx: 0, cy: 0, held: null, brush: null, msg: '', msgT: 0, mouse: false, sellArm: null };
const bWhere = () => HOME_IN ? 'in' : 'out';
const fits = (c, w) => c.where === 'both' || c.where === w;
const newUid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
/* ----- saved data ----- */
function buildLoad() {
  HOME.store = HOME.store && typeof HOME.store === 'object' ? HOME.store : {}; HOME.placed = Object.assign({ out: [], in: [] }, HOME.placed || {}); HOME.unlock = HOME.unlock || {};
  for (const w of ['out', 'in']) HOME.placed[w] = (Array.isArray(HOME.placed[w]) ? HOME.placed[w] : []).filter(p => p && catItem(p.id) && isFinite(p.x) && isFinite(p.y));
  gridLoad();
  HOME.mig = HOME.mig || {}; if (!HOME.mig.rugs) { HOME.mig.rugs = 1; if (HOME.fix.rug2) HOME.placed.in.push({ id: 'rugB', x: ICX, y: IFY0 + 192, f: 0 }); else if (HOME.fix.rug1) HOME.placed.in.push({ id: 'rugS', x: ICX, y: IFY0 + 151, f: 0 }); }   // rugs used to be fix-ups
  if (!HOME.mig.big) { HOME.mig.big = 1; HOME.placed.out.forEach(p => { p.x += HOFF.x; p.y += HOFF.y; }); }                              // the yard grew: what you placed moves with the old layout
  for (const w of ['out', 'in']) HOME.placed[w].forEach(p => { if (!p.u) p.u = newUid(); });          // every placed thing has its own id: a garden bed's crops and the notes on a table follow it
}
buildLoad();
/* ----- size, footprint and drawing of a placed thing ----- */
function pSize(p) { const c = catItem(p.id), a = HOME_SRC[c.k] || { w: 30, h: 30 }, s = c.sc || 1; return { w: Math.round(a.w * s), h: Math.round(a.h * s), c }; }
function pPoly(p, where) {                                    // its solid shape: the picture's whole outline, in the yard and indoors (so you cannot walk into a bed or behind a table)
  const { w, h, c } = pSize(p); if (c.flat) return null;
  const pr = c.sc ? null : profPoly(c.k, p.x, p.y, 2); if (pr) return p.f ? pr.map(([x, y]) => [2 * p.x - x, y]) : pr;
  return pBase(p);
}
function pBase(p) { const { w, h, c } = pSize(p); return c.flat ? null : boxFp(p.x, p.y, Math.max(8, w * 0.42), clampN(h * 0.3, 8, 24)); }   // where it stands: the placing rules use this indoors, so tall things can stand against the back wall
function pSortKey(p) {                                         // draw order: in front of the raccoon unless the raccoon is truly behind it (above its outline)
  const c = catItem(p.id); if (!p.f) return sortKey({ k: c.k, x: p.x, y: p.y, ex: 2 });
  const a = HOME_SRC[c.k]; if (!a || !a.prof) return p.y; const t = topAt({ k: c.k, x: p.x, y: p.y, ex: 2 }, 2 * p.x - P.x - 24, 2 * p.x - P.x + 24);
  return t === null ? p.y : P.y < t ? Math.max(p.y, P.y + 0.5) : Math.min(p.y, P.y - 0.5);
}
function drawPlaced(p, alpha, tint) {
  const { w, h, c } = pSize(p), bed = c.k === 'garden' && HOME_SRC.garden_empty, im = homeImg(bed ? 'garden_empty' : c.k); if (!im || !im.complete || !im.naturalWidth) return; g.save(); g.imageSmoothingEnabled = false; if (alpha !== undefined) g.globalAlpha = alpha;
  if (!c.flat && alpha === undefined) { if (bWhere() === 'out') castShadow(c.k, p.x, p.y + 2, w, h, p.f); else shadow(p.x + 3, p.y - 1, w * 0.36); }
  g.translate(Math.round(p.x), Math.round(p.y + (c.flat ? 0 : 2))); if (p.f) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h); if (bed && p.u) drawPlots(p.u, -w / 2, -h); if (alpha === undefined && p.u) drawNotesOn(p, w, h);
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
function area() { if (!HOME_IN) return { x0: 36, x1: HW - 36, y0: 130, y1: HH - 16 }; const B = gridBox(); return { x0: Math.max(cellX(1), B.x0 - IT), x1: Math.min(cellX(GC - 1), B.x1 + IT), y0: Math.max(cellY(1), B.y0 - IT), y1: Math.min(cellY(GR - 2), B.y1 + IT) }; }
function reserved() {                                          // spots kept clear: in front of doors and everything you use, where you stand
  const r = interactables().filter(o => !o.soft).map(o => ({ x: o.x, y: o.y, r: 30 })); r.push({ x: P.x, y: P.y, r: 22 }); othersHere().forEach(o => r.push({ x: o.x, y: o.y, r: 22 }));
  if (HOME_IN) r.push({ x: ICX, y: IFY1 - 20, r: 44 }); else r.push({ x: SPAWN.x, y: SPAWN.y, r: 26 }, { x: HOUSE.x - 52, y: HOUSE.y + 30, r: 34 }); return r;
}
function whyNot(p) {                                           // null if it can go here, else a short reason
  const { w, h, c } = pSize(p), A = area();
  if (HOME_IN) { const top = p.y - (c.flat ? h : Math.min(h * 0.3, 24)), on = (x, y) => { const [cc, rr] = cellOf(x, y); return isFloor(cc, rr); };
    if (![[p.x - w / 2 + 2, p.y - 1], [p.x + w / 2 - 2, p.y - 1], [p.x - w / 2 + 2, top + 1], [p.x + w / 2 - 2, top + 1], [p.x, p.y - 1]].every(([x, y]) => on(x, y))) return 'Keep it on the floor'; }
  else if (p.x - w / 2 < A.x0 - 2 || p.x + w / 2 > A.x1 + 2 || p.y > A.y1 + 2 || p.y - (c.flat ? h : Math.min(h * 0.3, 24)) < A.y0 - 2) return 'Too close to the edge';
  const mine = pPoly(p), base = HOME_IN ? pBase(p) : mine, statics = HOME_IN ? interiorPolys(true) : HPOLY;
  if (c.flat) { if (statics.some(q => inPoly(p.x, p.y - 2, q))) return 'Not under a building'; return null; }
  if (!HOME_IN && onPath(p.x, p.y - 4, 22)) return 'Keep the paths clear';
  const hits = q => base.some(([x, y]) => inPoly(x, y, q)) || q.some(([x, y]) => inPoly(x, y, base)) || polyDist(p.x, p.y - 4, q) < 3;
  if (statics.some(hits) || (HOME_IN ? HOME.placed.in.map(pBase).filter(Boolean) : placedPolys('out')).some(hits)) return 'Something is in the way';
  if (HOME_IN && othersHere().some(o => polyDist(o.x, o.y, mine) < 22)) return 'Someone is standing there';
  if (!HOME_IN && obs.some(o => o.k === 'tree' && polyDist(o.x, o.y, mine) < o.r + 2)) return 'A tree is in the way';
  if (reserved().some(z => polyDist(z.x, z.y, mine) < z.r)) return 'That spot needs to stay clear';
  return null;
}
function walledOff(extra) {                                   // would this cut the base in two? walk a grid from the raccoon and check every place you use is still reachable
  const A = HOME_IN ? (B => ({ x0: B.x0, x1: B.x1, y0: B.y0, y1: B.y1 + 20 }))(gridBox()) : { x0: 30, x1: HW - 30, y0: 52, y1: HH - 20 }, S = HOME_IN ? 8 : 12, cols = Math.ceil((A.x1 - A.x0) / S), rows = Math.ceil((A.y1 - A.y0) / S);
  const polys = (HOME_IN ? interiorPolys().concat(placedPolys('in')) : HPOLY.concat(placedPolys('out').filter(q => !HPOLY.includes(q)))).concat([extra]);
  const circles = HOME_IN ? [] : obs.filter(o => solid(o) && o.k !== 'hrock'); const free = new Uint8Array(cols * rows);
  const sq = HOME_IN ? polys.map(sqPoly) : null;               // indoors the raccoon is an ellipse: test clearance in the squashed space (IN_K)
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = A.x0 + (i + 0.5) * S, y = A.y0 + (j + 0.5) * S;
    free[j * cols + i] = (HOME_IN ? !sq.some(q => inPoly(x, y * IN_K, q) || polyNear(x, y * IN_K, q).d < IN_RX - 1) : !polys.some(q => inPoly(x, y, q) || polyDist(x, y, q) < 9) && !circles.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 9)) ? 1 : 0; }
  const cell = (x, y) => { const i = Math.floor((x - A.x0) / S), j = Math.floor((y - A.y0) / S); return i >= 0 && j >= 0 && i < cols && j < rows ? j * cols + i : -1; };
  const seen = new Uint8Array(cols * rows), st = []; let s0 = cell(P.x, P.y); if (s0 < 0) return false;
  if (!free[s0]) { let best = -1, bd = 1e9; for (let k = 0; k < free.length; k++) if (free[k]) { const d = Math.hypot(A.x0 + (k % cols + 0.5) * S - P.x, A.y0 + (Math.floor(k / cols) + 0.5) * S - P.y); if (d < bd) { bd = d; best = k; } } if (best < 0 || bd > 30) return true; s0 = best; }
  seen[s0] = 1; st.push(s0); while (st.length) { const k = st.pop(), i = k % cols, j = (k - i) / cols; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= cols || b >= rows) continue; const n = b * cols + a; if (free[n] && !seen[n]) { seen[n] = 1; st.push(n); } } }
  const reach = (x, y, r) => { for (let k = 0; k < seen.length; k++) if (seen[k] && Math.hypot(A.x0 + (k % cols + 0.5) * S - x, A.y0 + (Math.floor(k / cols) + 0.5) * S - y) < r) return true; return false; };
  return !interactables().filter(o => !o.soft).every(o => reach(o.x, o.y, Math.max(18, o.r - 6))) || (HOME_IN && !reach(ICX, IFY1 + 6, 20));
}
/* ----- the mode itself ----- */
function buildToggle(on) {
  if (state !== 'home') return; on = on === undefined ? !BUILD.on : on;
  if (on && isVisiting() && visitPerm() < 2) return pop(P.x, P.y - 90, VISIT.live ? VISIT.name + ' has not made you a Decorator' : VISIT.name + ' is away: nothing can be moved', '#cfd8e6');
  if (!on && BUILD.held) storeHeld(); BUILD.on = on; BUILD.brush = null; BUILD.tool = null; for (const k in keys) keys[k] = false; drag = null; wheel = null;
  if (on) { BUILD.cx = clampN(P.x, area().x0 + 10, area().x1 - 10); BUILD.cy = clampN(P.y + (HOME_IN ? -30 : 40), area().y0 + 30, area().y1 - 10); say(HOME_IN ? 'Build mode: decorate your room' : 'Build mode: decorate your homestead'); }
  else { rebuildSolids(); homeSave(); } renderBar();
}
function say(m) { BUILD.msg = m; BUILD.msgT = t + 2.4; }
function pickFromStore(id) {
  if (BUILD.held) storeHeld(); BUILD.brush = null; BUILD.tool = null; if (!(HOME.store[id] > 0)) return say('None in storage: buy more in the Shop');
  HOME.store[id]--; BUILD.held = { id, x: BUILD.cx, y: BUILD.cy, f: 0 }; homeSave(); renderBar();
}
function storeHeld() {
  if (!BUILD.held) return; if ((BUILD.held.u && bedHasCrops(BUILD.held.u)) || isNbHome(BUILD.held.id)) return putBack();          // a planted bed is never put away: it goes back where it was
  if (isVisiting()) { HOME.store[BUILD.held.id] = (HOME.store[BUILD.held.id] || 0) + 1; BUILD.held = null; renderBar(); return; }   // a visitor's held thing is still in the owner's storage
  HOME.store[BUILD.held.id] = (HOME.store[BUILD.held.id] || 0) + 1; BUILD.held = null; homeSave(); renderBar(); }
function putBack() {                                           // the held thing back where it was picked up (a planted bed cannot go into storage)
  const h = BUILD.held; BUILD.held = null; placedHere().push({ id: h.id, x: h.x, y: h.y, f: h.f, u: h.u }); rebuildSolids(); homeSave(); renderBar(); say(isNbHome(h.id) ? 'Someone lives there: you can move it, not put it away' : 'A planted bed stays in the ground: pick its crops (or clear them) first');
}
function hovered() {                                           // the placed thing under the cursor (the front-most)
  let best = null; placedHere().forEach(p => { const { w, h } = pSize(p); if (BUILD.cx > p.x - w / 2 && BUILD.cx < p.x + w / 2 && BUILD.cy > p.y - h && BUILD.cy < p.y + 4 && (!best || p.y > best.y)) best = p; }); return best;
}
function buildAct() {                                          // E / click: place what you hold, paint, or pick up what is under the cursor
  if (BUILD.tool) return reshapeAt(BUILD.cx, BUILD.cy);
  if (BUILD.brush) return paintFloor();
  if (BUILD.held) {
    const p = { id: BUILD.held.id, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy), f: BUILD.held.f, u: BUILD.held.u || newUid() }, why = whyNot(p); if (why) return say(why);
    if (!catItem(p.id).flat && walledOff(pPoly(p))) return say('That would block the way');
    if (isVisiting()) return visitPlace(p);
    placedHere().push(p); BUILD.held = null; rebuildSolids(); homeSave(); renderBar(); popFx && fxBurst(p.x, p.y - 6, 8, { col: ['#fff6c8', '#d9bb7e'], s1: 60, l1: 0.5, r1: 2.5 }); return;
  }
  const h = hovered(); if (!h) return say('Choose something below, or point at a thing to pick it up');
  if (isVisiting()) return visitLift(h);
  placedHere().splice(placedHere().indexOf(h), 1); BUILD.held = { id: h.id, x: h.x, y: h.y, f: h.f, u: h.u }; rebuildSolids(); homeSave(); renderBar();
}
function buildStore() {                                        // Q: put what you hold away, or put away what is under the cursor
  if (BUILD.brush || BUILD.tool) { BUILD.brush = null; BUILD.tool = null; return renderBar(); } if (BUILD.held) return storeHeld();
  const h = hovered(); if (!h) return; if (isNbHome(h.id)) return say('Someone lives there: you can move it, not put it away'); if (h.u && bedHasCrops(h.u)) return say('Pick its crops (or clear them) first'); if (isVisiting()) return visitStore(h);
  placedHere().splice(placedHere().indexOf(h), 1); HOME.store[h.id] = (HOME.store[h.id] || 0) + 1; rebuildSolids(); homeSave(); renderBar(); say(catItem(h.id).name + ' put in storage');
}
function buildSell() {                                         // X / Sell: sell what you hold, or the thing under the cursor, for SELL_BACK of its price (press twice: the first press asks)
  if (isVisiting()) return say('Only the owner can sell things');
  const h = BUILD.held ? null : hovered(), id = BUILD.held ? BUILD.held.id : h ? h.id : null; if (!id) return say(BUILD.brush || BUILD.tool ? 'Put the brush down first (Q)' : 'Point at something, or choose it below, to sell it');
  const hu = BUILD.held ? BUILD.held.u : h.u; if (isNbHome(id)) return say('Someone lives there: you cannot sell their home'); if (hu && bedHasCrops(hu)) return say('Pick its crops (or clear them) first');
  const key = BUILD.held ? 'held:' + id : 'at:' + h.x + ',' + h.y, n = sellPrice(id);
  if (!BUILD.sellArm || BUILD.sellArm.key !== key || t > BUILD.sellArm.t) { BUILD.sellArm = { key, t: t + 3 }; return say('Sell the ' + catItem(id).name.toLowerCase() + ' for ' + n + ' apples? Press Sell again'); }
  BUILD.sellArm = null; if (BUILD.held) BUILD.held = null; else { placedHere().splice(placedHere().indexOf(h), 1); rebuildSolids(); }
  HOME.apples += n; homeGain = { n, t }; homeSave(); renderBar(); say('Sold for ' + n + ' apples'); try { sfxPlay('pickup'); } catch (e) {}
}
function sellStored(id) { if (!(HOME.store[id] > 0)) return buildShop('sell'); HOME.store[id]--; const n = sellPrice(id); HOME.apples += n; homeGain = { n, t }; homeSave(); buildShop('sell'); }
function buildFlip() { if (BUILD.held) BUILD.held.f = BUILD.held.f ? 0 : 1; else { const h = hovered(); if (h) { if (isVisiting()) return visitFlip(h); h.f = h.f ? 0 : 1; rebuildSolids(); homeSave(); } } }
function floorCell(x, y) { const [c, r] = cellOf(x, y); return isFloor(c, r) ? r * GC + c : -1; }
function paintFloor() { const i = floorCell(BUILD.cx, BUILD.cy); if (i < 0) return say('Paint the floor, not the walls'); if (isVisiting()) return visitPaint(i, BUILD.brush); const ch = HOME.grid[i], up = ch === ch.toUpperCase(); gSet(i % GC, Math.floor(i / GC), up ? BUILD.brush.toUpperCase() : BUILD.brush); homeSave(); }
function pickBrush(id) { const b = BRUSHES.find(q => q.id === id); if (!b) return; if (b.unlock && !HOME.unlock[b.unlock]) return say('Unlock ' + b.name.toLowerCase() + ' in the Shop'); if (BUILD.held) storeHeld(); BUILD.tool = null; BUILD.brush = id; renderBar(); }
function pickTool(id) { if (!HOME_IN || !TOOLS.some(q => q.id === id)) return; if (BUILD.held) storeHeld(); BUILD.brush = null; BUILD.tool = id; renderBar(); say(TOOLS.find(q => q.id === id).name); }
function buildKey(k) {
  if (k === 'b' || BIND.pause.includes(k)) return buildToggle(false);
  if (BIND.mute.includes(k)) return toggleMute();
  if (k === 'e' || k === 'enter' || k === ' ' || BIND.shake.includes(k)) return buildAct(); if (k === 'q' || k === 'delete' || k === 'backspace') return buildStore(); if (k === 'f') return buildFlip(); if (k === 'x') return buildSell();
  if (/^[1-9]$/.test(k)) { const s = barSlots()[+k - 1]; if (s) s.tool ? pickTool(s.tool) : s.brush ? pickBrush(s.id) : pickFromStore(s.id); }
}
function updateBuild(dt) {
  t += dt; const mv = moveVec('raccoon'); const m = Math.hypot(mv.x, mv.y); if (m) { BUILD.mouse = false; BUILD.cx += mv.x / m * 240 * dt; BUILD.cy += mv.y / m * 240 * dt; }
  const A = area(); BUILD.cx = clampN(BUILD.cx, A.x0, A.x1); BUILD.cy = clampN(BUILD.cy, A.y0, A.y1); P.moving = false; anim = 0; homeNear = null;
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
}
function drawBuildOverlay() {                                  // inside the world transform: the floor grid, the ghost and the cursor
  if (!BUILD.on) return; g.save();
  if (HOME_IN && (BUILD.brush || BUILD.tool)) {                  // the tile grid, and the tile under the cursor (green: you can, red: you cannot)
    const B = gridBox(); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
    for (let r = B.r0 - 1; r <= B.r1 + 1; r++) for (let c = B.c0 - 1; c <= B.c1 + 1; c++) if (isFloor(c, r) || (BUILD.tool && nearFloor(c, r))) g.strokeRect(cellX(c) + .5, cellY(r) + .5, IT - 1, IT - 1);
    const [c, r] = cellOf(BUILD.cx, BUILD.cy), q = BUILD.tool ? reshapeWhy(BUILD.tool, c, r) : isFloor(c, r) ? {} : { why: 1 };
    g.strokeStyle = q.why ? '#ff6a5a' : BUILD.tool ? '#7dff8e' : '#ffd23f'; g.lineWidth = 2; g.strokeRect(cellX(c) + 1, cellY(r) + 1, IT - 2, IT - 2);
    if (!q.why && BUILD.tool) { g.fillStyle = BUILD.tool === 'wall' ? 'rgba(60,60,54,.55)' : BUILD.tool === 'remove' ? 'rgba(255,90,80,.25)' : 'rgba(200,170,110,.45)'; g.fillRect(cellX(c) + 2, cellY(r) + 2, IT - 4, IT - 4); }
  }
  if (BUILD.held) { const p = { id: BUILD.held.id, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy), f: BUILD.held.f }, bad = whyNot(p); drawPlaced(p, 0.75, bad ? '#ff3030' : '#40ff70');
    const q = pPoly(p); if (q) { g.strokeStyle = bad ? 'rgba(255,80,80,.8)' : 'rgba(120,255,140,.8)'; g.lineWidth = 1.5; g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke(); } }
  else if (!BUILD.brush && !BUILD.tool) { const h = hovered(); if (h) { const { w, h: hh } = pSize(h); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(h.x - w / 2 - 2, h.y - hh - 2, w + 4, hh + 6); g.setLineDash([]); } }
  g.strokeStyle = '#fff7e6'; g.lineWidth = 2; g.beginPath(); g.moveTo(BUILD.cx - 7, BUILD.cy); g.lineTo(BUILD.cx + 7, BUILD.cy); g.moveTo(BUILD.cx, BUILD.cy - 7); g.lineTo(BUILD.cx, BUILD.cy + 7); g.stroke();
  g.restore();
}
function drawBuildHud() {
  if (!BUILD.on) { return; } g.save(); g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center';
  const txt = t < BUILD.msgT ? BUILD.msg : BUILD.held ? catItem(BUILD.held.id).name + ': ' + (whyNot({ id: BUILD.held.id, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy), f: BUILD.held.f }) || 'press E to place') : BUILD.tool ? (q => q.why || q.say + ': press E')(reshapeWhy(BUILD.tool, ...cellOf(BUILD.cx, BUILD.cy))) : BUILD.brush ? 'Painting: E paints a tile' : hovered() ? catItem(hovered().id).name + ': E pick up, F flip, Q store, X sell' : 'Build mode';
  const w = g.measureText(txt).width + 24; g.fillStyle = 'rgba(10,24,40,.88)'; g.fillRect(VW / 2 - w / 2, 46, w, 26); g.fillStyle = '#ffd23f'; g.fillRect(VW / 2 - w / 2, 46, 3, 26); g.fillStyle = '#fff7e6'; g.textBaseline = 'middle'; g.fillText(txt, VW / 2, 59.5); g.restore();
}
/* ----- the bar at the bottom of the screen (DOM, so it works with mouse and touch) ----- */
function barSlots() {
  const w = bWhere(), s = CAT.filter(c => fits(c, w) && HOME.store[c.id] > 0).map(c => ({ id: c.id, k: c.k, name: c.name, n: HOME.store[c.id] }));
  if (HOME_IN) { if (!isVisiting()) TOOLS.forEach(q => s.push({ id: 't_' + q.id, tool: q.id, name: q.name, icon: toolIcon(q.id) })); BRUSHES.forEach(b => s.push({ id: b.id, k: b.k, name: b.name, brush: true, icon: toolIcon(b.id), locked: b.unlock && !HOME.unlock[b.unlock] })); } return s;
}
function renderBar() {
  let bar = $('buildbar'); if (!bar) { bar = document.createElement('div'); bar.id = 'buildbar'; $('wrap').appendChild(bar); bar.addEventListener('pointerdown', e => e.stopPropagation()); }
  let btn = $('buildbtn'); if (!btn) { btn = document.createElement('button'); btn.id = 'buildbtn'; btn.textContent = 'Build'; btn.title = 'Build mode (B)'; btn.onclick = () => buildToggle(true); $('wrap').appendChild(btn); }
  if (!BUILD.on) { bar.style.display = 'none'; return; }
  const slots = barSlots().map((s, i) => { const src = s.icon || (HOME_SRC[s.k] ? HOME_SRC[s.k].src : ''); const on = (BUILD.held && BUILD.held.id === s.id) || (BUILD.brush === s.id && s.brush) || (s.tool && BUILD.tool === s.tool);
    return `<button class="bslot${on ? ' on' : ''}${s.locked ? ' locked' : ''}" title="${esc(s.name)}" onclick="${s.tool ? `pickTool('${s.tool}')` : s.brush ? `pickBrush('${s.id}')` : `pickFromStore('${s.id}')`}"><img src="${src}" alt=""><span>${i < 9 ? i + 1 : ''}</span>${s.n !== undefined ? `<i>${s.n}</i>` : ''}</button>`; }).join('');
  bar.innerHTML = `<div class="bslots">${slots || '<span class="bempty">Storage is empty: buy things in the Shop</span>'}</div>
  <div class="bacts"><button onclick="buildAct()">${BUILD.held ? 'Place' : BUILD.tool ? 'Build' : BUILD.brush ? 'Paint' : 'Pick up'}</button><button onclick="buildFlip()">Flip</button><button onclick="buildStore()">Store</button><button onclick="buildSell()">Sell</button>${isVisiting() ? '' : `<button onclick="buildShop('buy')">Shop</button>${HOME_IN ? '<button onclick="roomsScreen()">Rooms</button>' : ''}`}<button class="bdone" onclick="buildToggle(false)">Done</button></div>`;
}
function buildBarTick() {                                      // show / hide the bar and the Build button with the game state
  const bar = $('buildbar'), btn = $('buildbtn'); if (!bar || !btn) return renderBar();
  const b = state === 'home' && BUILD.on ? 'flex' : 'none', bb = state === 'home' && !BUILD.on && (!isVisiting() || visitPerm() >= 2) ? 'block' : 'none'; if (bar.style.display !== b) bar.style.display = b; if (btn.style.display !== bb) btn.style.display = bb;
}
let shopTab = 'buy';
function buildShop(tab) {
  if (isVisiting()) return say('Only ' + VISIT.name + ' can shop here: you can use what is in their storage');
  if (BUILD.held) storeHeld(); const w = bWhere(); if (tab) shopTab = tab; const sell = shopTab === 'sell';
  const rows = sell ? CAT.filter(c => HOME.store[c.id] > 0).map(c => { const src = HOME_SRC[c.k] ? HOME_SRC[c.k].src : '';
      return `<button class="up shopi" onclick="sellStored('${c.id}')"><img src="${src}" alt=""><b>${esc(c.name)}</b>Sell for ${sellPrice(c.id)} &middot; ${HOME.store[c.id]} stored</button>`; }).join('') || '<p class="lbl">Storage is empty. To sell something you placed, point at it in build mode and press Sell.</p>'
    : CAT.filter(c => fits(c, w) && !c.hide).map(c => { const src = HOME_SRC[c.k] ? HOME_SRC[c.k].src : '', cost = Object.assign({ apples: c.price }, c.mats || {}), can = haveAll(cost);
      return `<button class="up shopi" ${can ? '' : 'disabled style="opacity:.5"'} onclick="buyItem('${c.id}')"><img src="${src}" alt=""><b>${esc(c.name)}</b>${c.mats ? costHtml(cost) : c.price + ' apples'}${HOME.store[c.id] ? ' &middot; ' + HOME.store[c.id] + ' stored' : ''}</button>`; }).join('');
  const br = HOME_IN && !sell ? BRUSHES.filter(b => b.unlock).map(b => HOME.unlock[b.unlock] ? '' : `<button class="up shopi" ${HOME.apples >= b.price ? '' : 'disabled style="opacity:.5"'} onclick="buyUnlock('${b.unlock}',${b.price})"><img src="${HOME_SRC[b.k] ? HOME_SRC[b.k].src : ''}" alt=""><b>${esc(b.name)} tiles</b>${b.price} apples, paint as many as you like</button>`).join('') : '';
  homeScreen(`<h1>${sell ? 'Sell back' : HOME_IN ? 'Furnish your room' : 'Garden and yard shop'}</h1><p class="tag">${sell ? `Selling returns ${Math.round(SELL_BACK * 100)}% of the price.` : 'Things you buy go into storage. Place them, move them, put them away: nothing is ever lost.'} You have ${HOME.apples} apples.</p>
  <div class="row"><div class="seg"><button class="${sell ? '' : 'on'}" onclick="buildShop('buy')">Buy</button><button class="${sell ? 'on' : ''}" onclick="buildShop('sell')">Sell</button></div></div>
  <div class="row shopgrid">${rows}${br}</div><div class="row"><button class="big" onclick="leaveHomeScreen();renderBar()">Back to building</button></div>`, 'shop');
}
function buyItem(id) { const c = catItem(id); if (!c || c.hide || !spendAll(Object.assign({ apples: c.price }, c.mats || {}))) return buildShop(); HOME.store[id] = (HOME.store[id] || 0) + 1; homeSave(); buildShop(); }
function buyUnlock(u, price) { if (HOME.unlock[u] || !spendApples(price)) return buildShop(); HOME.unlock[u] = 1; homeSave(); buildShop(); }
/* ----- mouse and touch: point to move the cursor, click / tap to act ----- */
cv.addEventListener('pointerdown', e => {
  if (!(state === 'home' && BUILD.on)) return; const p = pt(e); if (speakerHit(p) || pauseHit(p)) return;
  BUILD.cx = clampN(p.x + cam.x, area().x0, area().x1); BUILD.cy = clampN(p.y + cam.y, area().y0, area().y1); BUILD.mouse = true; e.stopImmediatePropagation(); buildAct();
}, true);
cv.addEventListener('pointermove', e => { if (state === 'home' && BUILD.on && e.pointerType === 'mouse') { const p = pt(e); BUILD.cx = clampN(p.x + cam.x, area().x0, area().x1); BUILD.cy = clampN(p.y + cam.y, area().y0, area().y1); BUILD.mouse = true; } });
const _followCamB = followCam;                                 // outside, the camera follows the build cursor
followCam = function (dt) { if (BUILD.on && state === 'home' && !HOME_IN) { const tx = clampN(BUILD.cx - VW / 2, 0, HW - VW), ty = clampN(BUILD.cy - 30 - VH / 2, 0, HH - VH), f = Math.min(1, dt * 5); if (!BUILD.mouse) { cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f; } return; } return _followCamB(dt); };
setInterval(() => { try { buildBarTick(); } catch (e) {} }, 250);
