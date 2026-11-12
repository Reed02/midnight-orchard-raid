/* ===== THE YARD: build it your own way, shape the ground, farm it =====
   FREEDOM: nothing in the base is fixed any more. The starting barrel, crates, firewood, hay, ladder and the first garden bed are ordinary
     furniture (moved into HOME.placed once: HOME.mig.decor / .inItems), and with a SHOVEL every tree can be dug up (into storage, to replant).
     The cottage, the Raid Hut, the mirror, the mailbox, the campfire and the market crate are CORE: in build mode you can pick them up and put
     them anywhere, but never put them away or sell them (CORE, HOME.pos). Nature is laid out from where they first stood (homeObs), so moving
     them never reshuffles the yard; what a moved building lands on is cleared for good.
   GROUND: the yard is a grid of TS-pixel tiles (HOME.gnd, one letter each, GT): grass, dirt path, gravel, stone, brick, wooden deck, sand,
     clover meadow and tilled soil. The old trodden walkways became dirt-path tiles (HOME.mig.gnd), so they can be changed too. In build mode
     the Ground brushes paint tiles (you need the shovel; some cost a little, some must be unlocked). Paths are quicker to walk on; clover
     feeds beehives. Drawn into GT_CV (ragged, grassy edges; crisp ones for brick and wood), redrawn only around a changed tile.
   TOOLS (HOME.tools, bought in the Shop; the tool belt shows them, T or 1-5 to pick): HANDS pick ripe crops. The SHOVEL digs a path (grass to
     dirt), fills it back in, lifts paving, digs things up in half the digs, and digs up whole trees. The HOE tills soil. SEEDS plant the crop
     shown on the belt (pick Seeds again to change it). The WATERING CAN halves what a crop still needs (once). Face a tile and press E; hold E
     to keep going.
   FARMS: crops on tilled tiles (HOME.farm = { tile index: plot }, plots like garden.js). Harvests go to the pantry.
   STATIONS (furniture with a job): compost bin (crops planted near it grow 25% faster; turn it once a day for a seed packet), rain barrel
     (waters what is planted near it), scarecrow (+1 at every harvest near it), beehive (makes honeycomb, faster with flowers and clover
     nearby), lamp post (light at night), apple tree (shake it once a day for apples). "Near" = STATION_R pixels.
   COMFORT: the cozy score (village.js) now has tiers with perks (COZY_TIERS) and counts paving, clover and variety.
   Art: stand-ins by tools/make_yard_placeholders.py; the asset sheets (tools/make_yard_sheets.py) are cut by tools/cut_yard.py. */
const TS = 32, TC = Math.ceil(HW / TS), TR = Math.ceil(HH / TS), STATION_R = 4 * TS + 8;
const YARD = { tool: 'hand', lifted: null, seed: 'carrot', useT: 0, arm: null, painting: false };
/* ----- core buildings ----- */
const CORE = {
  house: { o: HOUSE, name: 'Cottage', k: () => HOME.house ? 'cottage' : 'tent', ex: 4, ia: () => HOME.house ? 'house' : 'plot', door: o => ({ x: o.x - 40, y: o.y + 60 }) },
  hut: { o: HUT, name: 'Raid Hut', k: () => 'hut', ex: 4, ia: () => 'hut', door: o => ({ x: o.x + 24, y: o.y + 80 }) },
  mirror: { o: MIRROR, name: 'Mirror', k: () => 'mirror', ex: 4, ia: () => 'mirror', door: o => ({ x: o.x, y: o.y + 34 }) },
  mail: { o: MAIL, name: 'Mailbox', k: () => 'mailbox1', ex: 2, ia: () => 'mail', door: o => ({ x: o.x, y: o.y + 30 }) },
  fire: { o: FIRE, name: 'Campfire', k: () => 'logs', ex: 2, ia: () => '', door: o => ({ x: o.x, y: o.y + 34 }) },
  market: { o: MARKET, name: 'Market crate', k: () => 'crate_apples', ex: 2, ia: () => 'market', door: o => ({ x: o.x, y: o.y + 34 }) },
};
const CORE_IDS = Object.keys(CORE), CORE_DEF = {}, SIGN_DEF = { x: SIGN.x, y: SIGN.y };
CORE_IDS.forEach(id => { CORE_DEF[id] = { x: CORE[id].o.x, y: CORE[id].o.y }; const c = { id: 'core_' + id, name: CORE[id].name + ' (move only)', price: 0, where: 'out', hide: 1, core: id };
  Object.defineProperty(c, 'k', { get: () => CORE[id].k(), enumerable: true }); CAT.push(c); });
const corePos = id => (HOME.pos && HOME.pos[id]) || CORE_DEF[id];
function coreSet(map) { CORE_IDS.forEach(id => { CORE[id].o.x = map[id].x; CORE[id].o.y = map[id].y; }); SIGN.x = SIGN_DEF.x + HOUSE.x - CORE_DEF.house.x; SIGN.y = SIGN_DEF.y + HOUSE.y - CORE_DEF.house.y; }
const coreSnap = () => { const m = {}; CORE_IDS.forEach(id => { m[id] = { x: CORE[id].o.x, y: CORE[id].o.y }; }); return m; };
function applyCorePos() { const m = {}; CORE_IDS.forEach(id => { m[id] = corePos(id); }); coreSet(m); GROUND_KEY = ''; }
/* ----- new things for the shop ----- */
CAT.push(
  { id: 'appletree', k: 'tree_apple', name: 'Apple tree', price: 80, mats: { seeds: 1 }, where: 'out', sell: 5 },
  { id: 'youngtree', k: 'tree_young', name: 'Young tree', price: 12, where: 'out', sell: 2 },
  { id: 'compost', k: 'st_compost', name: 'Compost bin', price: 50, mats: { planks: 2 }, where: 'out' },
  { id: 'rainbarrel', k: 'st_rainbarrel', name: 'Rain barrel', price: 70, mats: { planks: 2, nails: 1 }, where: 'out' },
  { id: 'scarecrow', k: 'st_scarecrow', name: 'Scarecrow', price: 60, mats: { rope: 1, wool: 1 }, where: 'out' },
  { id: 'beehive', k: 'st_beehive', name: 'Beehive', price: 120, mats: { planks: 2, jar: 1 }, where: 'out' },
  { id: 'lamppost', k: 'st_lamppost', name: 'Lamp post', price: 45, mats: { jar: 1, nails: 1 }, where: 'out' },
  { id: 'birdbath', k: 'st_birdbath', name: 'Bird bath', price: 55, where: 'out' },
  { id: 'ladder', k: 'int_ladder', name: 'Loft ladder', price: 20, where: 'in', hide: 1, sell: 1 });
const STATION_TIP = { compost: 'Crops planted near it grow 25% faster. Turn it once a day for a seed packet.', rainbarrel: 'Waters crops planted near it, and fills your watering can.',
  scarecrow: '+1 at every harvest near it.', beehive: 'Makes honeycomb. Flowers and clover nearby make it quicker.', lamppost: 'Lights up the yard at night.',
  appletree: 'Shake it once a day for apples.', birdbath: 'Birds love it (and it is very cosy).' };
/* ----- the ground ----- */
const GT = {
  '.': { name: 'Grass', cost: {} },
  p: { name: 'Dirt path', key: 'gnd_dirt', path: 1, rough: 1, rim: '#7a5c38', edge: '#9a8455', cost: {} },
  g: { name: 'Gravel path', key: 'gnd_gravel', path: 1, rough: 0.8, rim: '#5f5a52', edge: '#8a8a70', cost: { apples: 1 } },
  s: { name: 'Stone path', key: 'gnd_stone', path: 1, rough: 0.45, rim: '#55524c', edge: '#7e8068', cost: { stone: 1 } },
  b: { name: 'Brick path', key: 'gnd_brick', path: 1, rough: 0, rim: '#5e3b30', cost: { apples: 3 }, unlock: 'brick', ucost: { apples: 200 } },
  w: { name: 'Wooden deck', key: 'gnd_wood', path: 1, rough: 0, rim: '#4f3220', cost: { apples: 2 }, unlock: 'deck', ucost: { apples: 120, planks: 4 } },
  a: { name: 'Sand', key: 'gnd_sand', rough: 1, rim: '#b39a64', edge: '#b9b272', cost: { apples: 1 } },
  c: { name: 'Clover meadow', key: 'gnd_clover', rough: 1, rim: '#4f8a36', bloom: 1, edge: '#5f9a42', cost: { apples: 2 }, unlock: 'clover', ucost: { apples: 40, seeds: 2 } },
  t: { name: 'Tilled soil', key: 'gnd_tilled', farm: 1, rough: 0.6, rim: '#4a3020', cost: {}, needs: 'hoe' },
};
const GBRUSH = ['.', 'p', 'g', 's', 'a', 'c', 'b', 'w', 't'];
const tSty = (c, r) => (HOME.gst && HOME.gst[r * TC + c]) || '.';             // this tile's edges: natural (.), straight (s) or curved (c) - HOME.gst, one letter a tile
const tStr = (c, r) => tSty(c, r) !== '.';                                  // a built edge (straight or curved), not the natural blob
const EDGE_CH = { natural: '.', straight: 's', curved: 'c' }, EDGE_NAME = { '.': 'natural', s: 'straight', c: 'curved' }, EDGE_NEXT = { '.': 's', s: 'c', c: '.' };
const edgeNow = () => EDGE_CH[HOME.edges] || '.';
const tIdx = (c, r) => r * TC + c, tAt = (c, r) => c < 0 || r < 0 || c >= TC || r >= TR ? '.' : ((HOME.gnd && HOME.gnd[tIdx(c, r)]) || '.');
const tileOf = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)], tCx = c => c * TS + TS / 2, tCy = r => r * TS + TS / 2;
function setStyle(c, r, st) { const i = tIdx(c, r); if (HOME.gst[i] === st) return; HOME.gst = HOME.gst.slice(0, i) + st + HOME.gst.slice(i + 1); gtRedraw(c - 1, r - 1, c + 1, r + 1); }
function setTile(c, r, ch) {
  const i = tIdx(c, r); HOME.gnd = HOME.gnd.slice(0, i) + ch + HOME.gnd.slice(i + 1); const st = edgeNow(); if (HOME.gst[i] !== st) HOME.gst = HOME.gst.slice(0, i) + st + HOME.gst.slice(i + 1);   // a new tile takes the style for new tiles
  gtRedraw(c - 1, r - 1, c + 1, r + 1);
  if (ch !== '.') { const x0 = c * TS, y0 = r * TS; (homeGround() || []).forEach(f => { if (f.x >= x0 - 2 && f.x < x0 + TS + 2 && f.y >= y0 - 2 && f.y < y0 + TS + 2) HOME.dug[f.id] = 1; });   // tufts and flowers on it are gone
    obs.forEach(o => { if (o.k === 'hweed' && o.id && o.x >= x0 - 6 && o.x < x0 + TS + 6 && o.y >= y0 - 6 && o.y < y0 + TS + 6) HOME.dug[o.id] = 1; }); obs = obs.filter(o => !(o.id && HOME.dug[o.id])); }
}
function tileWhy(c, r, ch) {                                       // null if this tile can become ch
  if (c < 1 || r < 4 || c >= TC - 1 || r >= TR - 1) return 'Too close to the edge';
  const x = tCx(c), y = tCy(r); if (inHomeRiver(x, y, 10) || onHomeBridge(x, y)) return 'Not in the river';
  if (HPOLY.some(p => inPoly(x, y, p) || polyDist(x, y, p) < 3)) return 'Something is standing there';
  if (obs.some(o => solid(o) && o.k !== 'hweed' && o.k !== 'wall' && Math.hypot(o.x - x, o.y - y) < o.r + 6)) return 'Dig that up first';
  if (ch !== undefined && HOME.farm[tIdx(c, r)]) return 'Pick or clear the crop first';
  return null;
}
const gtKey = () => (HOME.gnd || '').length + ':' + HOME.gnd;
let GT_CV = null, GT_SRC = null, GT_EDGE; const GT_PAT = {};
function gtImg(ch) { const k = GT[ch] && GT[ch].key, im = k && homeImg(k); return im && im.complete && im.naturalWidth ? im : null; }
function gtReady() { return Object.keys(GT).every(ch => ch === '.' || gtImg(ch)); }
function gtBuild() { if (!gtReady()) return null; if (!GT_CV) { GT_CV = document.createElement('canvas'); GT_CV.width = HW; GT_CV.height = HH; } GT_SRC = HOME.gnd; GT_EDGE = HOME.gst; gtRegion(0, 0, TC - 1, TR - 1); return GT_CV; }
function gtRedraw(c0, r0, c1, r1) { if (GT_CV && GT_SRC !== null) { gtRegion(c0, r0, c1, r1); GT_SRC = HOME.gnd; GT_EDGE = HOME.gst; } }
const hnoise = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function gtRegion(c0, r0, c1, r1) {
  const x = GT_CV.getContext('2d'); c0 = Math.max(0, c0); r0 = Math.max(0, r0); c1 = Math.min(TC - 1, c1); r1 = Math.min(TR - 1, r1);
  x.save(); x.beginPath(); x.rect(c0 * TS, r0 * TS, (c1 - c0 + 1) * TS, (r1 - r0 + 1) * TS); x.clip(); x.clearRect(c0 * TS, r0 * TS, (c1 - c0 + 1) * TS, (r1 - r0 + 1) * TS); x.imageSmoothingEnabled = false;
  const by = {}; for (let r = r0 - 2; r <= r1 + 2; r++) for (let c = c0 - 2; c <= c1 + 2; c++) { const ch = tAt(c, r); if (ch !== '.' && GT[ch]) (by[ch] = by[ch] || []).push([c, r]); }
  const order = ['c', 'a', 'p', 'g', 's', 'b', 'w', 't'];                          // soft ground first, built ground on top
  order.forEach(ch => { const L = by[ch]; if (!L) return; const G = GT[ch], im = gtImg(ch); if (!im) return; const pat = GT_PAT[ch] || (GT_PAT[ch] = x.createPattern(im, 'repeat'));
    if (ch === 't') { L.forEach(([c, r]) => gtPlot(x, c, r, pat)); return; }
    const S = L.filter(([c, r]) => tStr(c, r)), N = L.filter(([c, r]) => !tStr(c, r));      // each tile has its own edge style
    if (N.length) { if (!G.rough) gtBlock(x, N, ch, pat); else { x.fillStyle = G.edge; gtBlob(x, N, ch, 2); x.fillStyle = pat; gtBlob(x, N, ch, 0); } }
    if (S.length) gtStraight(x, S, ch, pat); });
  order.forEach(ch => { const L = by[ch]; if (L && GT[ch].rough && ch !== 't') L.forEach(([c, r]) => { if (!tStr(c, r)) gtFringe(x, c, r, ch); }); });
  x.restore();
}
function gtBlob(x, L, ch, grow) {                                   // soft ground: a round blob on every tile, joined to its neighbours (diagonals too) - smooth, curving paths
  const R = TS * 0.6 + grow, W = TS * 0.5 + grow;                   // (each shape filled on its own: overlapping sub-paths would cancel out)
  L.forEach(([c, r]) => { const cx = tCx(c), cy = tCy(r);
    x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { if (tAt(c + dc, r + dr) !== ch) continue; if (dc && dr && (tAt(c + dc, r) === ch || tAt(c, r + dr) === ch)) continue;
      const nx = cx + dc * TS, ny = cy + dr * TS, l = Math.hypot(nx - cx, ny - cy), ux = -(ny - cy) / l * W, uy = (nx - cx) / l * W;
      x.beginPath(); x.moveTo(cx + ux, cy + uy); x.lineTo(nx + ux, ny + uy); x.lineTo(nx - ux, ny - uy); x.lineTo(cx - ux, cy - uy); x.closePath(); x.fill(); }
    for (let k = 0; k < 3; k++) { const h = hnoise(c * 31 + k * 7, r * 17 + k), h2 = hnoise(c * 13 + k, r * 29 + k * 5), an = h * 6.283, d = R - 2 + h2 * 3, br = 2 + h2 * 4 + grow;    // little bumps: not a perfect outline
      x.beginPath(); x.arc(cx + Math.cos(an) * d, cy + Math.sin(an) * d, br, 0, 7); x.fill(); } });
}
function gtBlock(x, L, ch, pat) {                                   // built ground (brick, wooden deck): crisp squares, a dark edge where it ends
  const G = GT[ch]; x.fillStyle = pat; L.forEach(([c, r]) => x.fillRect(c * TS, r * TS, TS, TS));
  x.strokeStyle = G.rim; x.lineWidth = 2; x.beginPath();
  L.forEach(([c, r]) => { const X = c * TS, Y = r * TS; if (tAt(c, r - 1) !== ch) { x.moveTo(X, Y + 1); x.lineTo(X + TS, Y + 1); } if (tAt(c, r + 1) !== ch) { x.moveTo(X, Y + TS - 1); x.lineTo(X + TS, Y + TS - 1); }
    if (tAt(c - 1, r) !== ch) { x.moveTo(X + 1, Y); x.lineTo(X + 1, Y + TS); } if (tAt(c + 1, r) !== ch) { x.moveTo(X + TS - 1, Y); x.lineTo(X + TS - 1, Y + TS); } }); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.18)'; L.forEach(([c, r]) => { if (tAt(c, r + 1) !== ch) x.fillRect(c * TS, r * TS + TS, TS, 3); });        // a little drop shadow below the edge
}
function plotShape(c, r, inset = 1.5) {                            // a tilled patch: tiles next to each other join into one bed, round corners only on the outside
  const t = (dc, dr) => tAt(c + dc, r + dr) === 't', up = t(0, -1), dn = t(0, 1), lf = t(-1, 0), rt = t(1, 0);
  const X0 = c * TS + (lf ? 0 : inset), X1 = c * TS + TS - (rt ? 0 : inset), Y0 = r * TS + (up ? 0 : inset + 0.5), Y1 = r * TS + TS - (dn ? 0 : inset + 0.5);
  const R = 7, rad = [!up && !lf ? R : 0, !up && !rt ? R : 0, !dn && !rt ? R : 0, !dn && !lf ? R : 0];
  return { X0, Y0, w: X1 - X0, h: Y1 - Y0, rad, up, dn };
}
function gtPlot(x, c, r, pat) {
  const q = plotShape(c, r);
  if (!q.dn) { x.fillStyle = 'rgba(40,26,14,.35)'; x.beginPath(); x.roundRect(q.X0, q.Y0 + 2, q.w, q.h, q.rad); x.fill(); }     // the bed's lip: only along its bottom edge
  x.fillStyle = pat; x.beginPath(); x.roundRect(q.X0, q.Y0, q.w, q.h, q.rad); x.fill();
  if (!q.up) { x.strokeStyle = 'rgba(150,108,70,.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(q.X0 + (q.rad[0] ? 6 : 0), q.Y0 + 1.5); x.lineTo(q.X0 + q.w - (q.rad[1] ? 6 : 0), q.Y0 + 1.5); x.stroke(); }
}
function gtStraight(x, L, ch, pat) {                                // straight / curved: square tiles with built edges. A staircase edge (a wide diagonal path) is cut along
  const G = GT[ch], same = (c, r) => tAt(c, r) === ch, sameS = (c, r) => same(c, r) && tStr(c, r), shapes = [], h = TS, R = TS / 2;      // the diagonal so it reads as a straight slant
  const CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];                  // top-left, top-right, bottom-right, bottom-left
  const open = (c, r, dc, dr) => !same(c + dc, r) && !same(c, r + dr) && !same(c + dc, r + dr);
  const cutOf = (c, r) => !sameS(c, r) ? [0, 0, 0, 0] : CORN.map(([dc, dr]) => open(c, r, dc, dr) && same(c - dc, r) && same(c, r - dr) && (same(c + dc, r - dr) || same(c - dc, r + dr)) ? 1 : 0);
  const anyCut = (c, r) => cutOf(c, r).some(Boolean);
  L.forEach(([c, r]) => { const X = c * TS, Y = r * TS, cut = cutOf(c, r), P = [[X, Y], [X + TS, Y], [X + TS, Y + TS], [X, Y + TS]], sq = P.filter((q, i) => !cut[i]);
    if (tSty(c, r) === 'c' && !cut.some(Boolean)) { const rad = CORN.map(([dc, dr]) => open(c, r, dc, dr) ? R : 0); if (rad.some(Boolean)) sq.curve = () => x.roundRect(X, Y, TS, TS, rad); }      // CURVED: round the outside corners
    shapes.push(sq);
    for (const [dc, dr] of [[1, 1], [-1, 1]]) { if (!sameS(c + dc, r + dr) || same(c + dc, r) || same(c, r + dr)) continue;          // joined only by a corner: fill a triangle in each of the two cells between
      const cx = dc > 0 ? X + TS : X, cy = Y + TS;
      shapes.push([[cx, cy], [cx + dc * h, cy], [cx, cy - h]]); shapes.push([[cx, cy], [cx - dc * h, cy], [cx, cy + h]]); }
    if (tSty(c, r) === 'c') for (const [dc, dr] of CORN) { if (!same(c + dc, r) || !same(c, r + dr) || same(c + dc, r + dr) || anyCut(c + dc, r) || anyCut(c, r + dr)) continue;    // CURVED: a little fillet in an inside corner
      const cx = dc > 0 ? X + TS : X, cy = dr > 0 ? Y + TS : Y, ox = cx + dc * R, oy = cy + dr * R;
      const f = [[cx, cy]]; f.curve = () => { x.moveTo(cx, cy); x.lineTo(cx, cy + dr * R); x.arc(ox, oy, R, Math.atan2(cy + dr * R - oy, cx - ox), Math.atan2(cy - oy, cx + dc * R - ox), dc * dr < 0); x.lineTo(cx, cy); x.closePath(); };
      shapes.push(f); } });
  const path = s2 => { x.beginPath(); if (s2.curve) return s2.curve(); s2.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); };
  x.strokeStyle = G.rim; x.lineWidth = 3; x.lineJoin = 'miter'; x.globalAlpha = 0.9; shapes.forEach(s2 => { path(s2); x.stroke(); }); x.globalAlpha = 1;     // the edge: half of it stays outside once the fill covers the rest
  x.fillStyle = pat; shapes.forEach(s2 => { path(s2); x.fill(); });
  L.forEach(([c, r]) => { const X = c * TS, Y = r * TS;                // no edge line where it meets the same ground with natural edges: cover the spill with the ground itself
    if (same(c, r - 1) && !tStr(c, r - 1)) x.fillRect(X, Y - 3, TS, 3); if (same(c, r + 1) && !tStr(c, r + 1)) x.fillRect(X, Y + TS, TS, 3);
    if (same(c - 1, r) && !tStr(c - 1, r)) x.fillRect(X - 3, Y, 3, TS); if (same(c + 1, r) && !tStr(c + 1, r)) x.fillRect(X + TS, Y, 3, TS); });
}
function gtFringe(x, c, r, ch) {                                   // grass creeping over the edge, crumbs kicked out into the grass
  const G = GT[ch], cx = tCx(c), cy = tCy(r), R = TS * 0.6;
  for (let k = 0; k < 10; k++) { const an = k / 10 * 6.283 + hnoise(c, r * 3 + k) * 0.5, ex = cx + Math.cos(an) * (R - 1), ey = cy + Math.sin(an) * (R - 1), [ec, er] = tileOf(ex + Math.cos(an) * 6, ey + Math.sin(an) * 6);
    if (tAt(ec, er) !== '.') continue; const h = hnoise(c * 7 + k, r * 11 - k), h2 = hnoise(c * 3 - k, r * 5 + k * 3); if (h > 0.6) continue;
    x.fillStyle = ['#6aa84a', '#79b957', '#83c060', '#6fae4e'][Math.floor(h2 * 4)]; x.beginPath(); x.ellipse(ex, ey, 2.5 + h * 4, 2 + h2 * 2, an, 0, 7); x.fill();
    if (h2 < 0.4) { x.fillStyle = '#5e9c40'; x.fillRect(Math.round(ex), Math.round(ey) - 4, 1, 4); }
    if (h2 > 0.7) { x.fillStyle = G.rim; x.globalAlpha = 0.5; x.fillRect(Math.round(ex + Math.cos(an) * (5 + h * 5)), Math.round(ey + Math.sin(an) * (5 + h * 5)), 2, 2); x.globalAlpha = 1; } }
}
function drawYardGround() {
  if (!HOME.gnd) return; if ((GT_SRC !== HOME.gnd || GT_EDGE !== HOME.gst) && !gtBuild()) return;
  const sx = Math.max(0, Math.floor(cam.x)), sy = Math.max(0, Math.floor(cam.y)), w = Math.min(HW - sx, VW + 2), h = Math.min(HH - sy, VH + 2); if (w > 0 && h > 0) g.drawImage(GT_CV, sx, sy, w, h, sx, sy, w, h);
  const r0 = Math.max(0, Math.floor(cam.y / TS) - 1), r1 = Math.min(TR - 1, Math.ceil((cam.y + VH) / TS) + 1), c0 = Math.max(0, Math.floor(cam.x / TS) - 1), c1 = Math.min(TC - 1, Math.ceil((cam.x + VW) / TS) + 1);
  const wi = homeImg('gnd_tilled_wet'), wp = wi && wi.complete && wi.naturalWidth ? (GT_PAT.wet || (GT_PAT.wet = g.createPattern(wi, 'repeat'))) : 'rgba(30,18,10,.32)';
  for (const k in HOME.farm) { const i = +k, c = i % TC, r = (i - c) / TC; if (c < c0 || c > c1 || r < r0 || r > r1) continue; const q = HOME.farm[k]; if (q && q.w && tAt(c, r) === 't') { const b = plotShape(c, r); g.fillStyle = wp; g.beginPath(); g.roundRect(b.X0, b.Y0, b.w, b.h, b.rad); g.fill(); } }   // watered soil
  const tg = yardTarget(); if (tg && YARD.tool !== 'hand' && state === 'home' && !BUILD.on) { g.strokeStyle = tg.ok ? 'rgba(255,246,200,.85)' : 'rgba(255,120,100,.6)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(tg.c * TS + 2, tg.r * TS + 2, TS - 4, TS - 4); g.setLineDash([]); }
}
/* ----- loading and moving old saves over ----- */
const DECOR_CAT = { garden: 'veg', logs_a: 'logs1', logs_b: 'logs2', logs_c: 'logs3', hay_b: 'haybig', hay_s: 'hay', crate_b: 'crate2', barrel: 'barrel' };
const INITEM_CAT = { barrel: 'barrel', crate_b: 'crate2', logs_a: 'logs1', int_ladder: 'ladder' };
function yardLoad() {
  if (!HOME || !HOME.placed) return; HOME.mig = HOME.mig || {}; if (typeof HIDE !== 'undefined' && HIDE) { HOME.mig.inItems = HOME.mig.decor = HOME.mig.gnd = 1; return; }     // a crew hideout is its own room: nothing to move over HOME.dug = HOME.dug && typeof HOME.dug === 'object' ? HOME.dug : {};
  HOME.pos = HOME.pos && typeof HOME.pos === 'object' ? HOME.pos : {}; CORE_IDS.forEach(id => { const q = HOME.pos[id]; if (q && !(isFinite(q.x) && isFinite(q.y))) delete HOME.pos[id]; });
  HOME.farm = HOME.farm && typeof HOME.farm === 'object' ? HOME.farm : {}; HOME.tools = HOME.tools && typeof HOME.tools === 'object' ? HOME.tools : {};
  HOME.yard = Object.assign({ hive: {}, shook: {}, comp: '' }, HOME.yard && typeof HOME.yard === 'object' ? HOME.yard : {});
  if (typeof HOME.gnd !== 'string' || HOME.gnd.length !== TC * TR) HOME.gnd = '.'.repeat(TC * TR);
  if (typeof HOME.gst !== 'string' || HOME.gst.length !== TC * TR) HOME.gst = edgeNow().repeat(TC * TR);     // the edge style of every tile (older saves: the yard-wide setting)
  if (!HOME.mig.decor) { HOME.mig.decor = 1; HOME_DECOR.forEach(d => { const id = DECOR_CAT[d.k]; if (id) HOME.placed.out.push({ id, x: d.x, y: d.y, f: 0, r: 0, u: d.k === 'garden' ? 'g0' : newUid(), s: 1 }); }); }      // s: a starting prop (does not add comfort)
  if (!HOME.mig.inItems) { HOME.mig.inItems = 1; IN_ITEMS.forEach(o => { const id = INITEM_CAT[o.k]; if (id) HOME.placed.in.push({ id, x: o.x, y: o.y, f: 0, r: 0, u: newUid(), s: 1 }); }); }
  if (!HOME.mig.gnd) { HOME.mig.gnd = 1; let s = HOME.gnd.split('');                       // the old trodden walkways become dirt-path tiles
    for (let r = 0; r < TR; r++) for (let c = 0; c < TC; c++) { const x = tCx(c), y = tCy(r); if (HOME_WALKS.some(([a, b]) => distSeg(x, y, a, b) < 17) && !inHomeRiver(x, y, 4)) s[tIdx(c, r)] = 'p'; } HOME.gnd = s.join(''); }
  for (const k in HOME.farm) { const q = HOME.farm[k]; if (!q || !CROPS[q.c] || !isFinite(q.end)) delete HOME.farm[k]; }
  applyCorePos(); GT_SRC = null;
}
const onWalk = (x, y, m) => HOME_WALKS.some(([a, b]) => distSeg(x, y, a, b) < m);
/* ----- tools ----- */
const TOOLDEF = {
  hand: { name: 'Hands', icon: 't_hand', what: 'pick ripe crops' },
  shovel: { name: 'Shovel', icon: 't_shovel', cost: { apples: 25, planks: 1 }, what: 'dig paths, fill them in, dig up trees, dig twice as fast' },
  hoe: { name: 'Hoe', icon: 't_hoe', cost: { apples: 60, planks: 2, nails: 2 }, needs: 'shovel', what: 'till the ground for crops' },
  can: { name: 'Watering can', icon: 't_can', cost: { apples: 40, jar: 1, nails: 1 }, needs: 'hoe', what: 'water a crop: it needs half the time left. Holds ' + 5 + ' waterings: refill it at the river or a rain barrel' },
  seeds: { name: 'Seeds', icon: 't_seeds', needs: 'hoe', free: 1, what: 'plant on tilled soil' },
};
const TOOL_IDS = Object.keys(TOOLDEF);
const hasTool = id => id === 'hand' || (TOOLDEF[id].free ? hasTool(TOOLDEF[id].needs) : !!(HOME.tools && HOME.tools[id]));
const toolsOwned = () => TOOL_IDS.filter(hasTool);
const yardOn = () => state === 'home' && !HOME_IN && !BUILD.on && !isVisiting() && !(typeof HIDE !== 'undefined' && HIDE);
function pickTool2(id) {
  if (!hasTool(id)) return; if (id === 'seeds' && YARD.tool === 'seeds') { const ks = Object.keys(CROPS); YARD.seed = ks[(ks.indexOf(YARD.seed) + 1) % ks.length]; }
  YARD.tool = id; YARD.arm = null; beltRender(); const T = TOOLDEF[id]; pop(P.x, P.y - 80, id === 'seeds' ? CROPS[YARD.seed].name + ' seeds (' + CROPS[YARD.seed].seed + ' apples)' : T.name, '#fff6c8');
}
function yardKey(k) {
  if (!yardOn() || toolsOwned().length < 2) return false; const L = toolsOwned();
  if (k === 't') { pickTool2(L[(L.indexOf(YARD.tool) + 1) % L.length]); return true; }
  const n = +k; if (n >= 1 && n <= L.length && /^[1-9]$/.test(k) && !Object.values(BIND).some(a => a.includes(k))) { pickTool2(L[n - 1]); return true; }
  return false;
}
const CAN_MAX = 5;                                                  // waterings in a full can
const canLeft = () => Math.max(0, Math.min(CAN_MAX, HOME.yard.water === undefined ? CAN_MAX : +HOME.yard.water || 0));
const nearWater = () => Math.abs(P.x - riverX(P.y)) < HRIVER.hw + 46 || stationsNear('rainbarrel', P.x, P.y, 56).length > 0;
function refillCan(where) {
  HOME.yard.water = CAN_MAX; homeSave(); beltRender(); try { sfxPlay('splash'); } catch (e) {}
  fxBurst(P.x + (P.face || 1) * 16, P.y - 10, 12, { col: ['#9fd4ff', '#d6efff', '#6fb6ff'], s0: 10, s1: 70, up: 50, g: 220, l1: 0.5, r1: 2 }); pop(P.x, P.y - 80, 'Watering can filled (' + CAN_MAX + ')' + (where ? ' at the ' + where : ''), '#9fd4ff');
}
function buyTool(id) { const T = TOOLDEF[id]; if (!T || T.free || hasTool(id) || (T.needs && !hasTool(T.needs)) || !spendAll(T.cost)) return buildShop('buy'); HOME.tools[id] = 1; if (id === 'can') HOME.yard.water = CAN_MAX; homeSave(); YARD.tool = id; try { sfxPlay('gold'); } catch (e) {} buildShop('buy'); }
function toolShopHtml() {
  return `<p class="lbl" style="width:100%">Tools: you keep them for good.</p>` + TOOL_IDS.filter(id => !TOOLDEF[id].free && id !== 'hand').map(id => { const T = TOOLDEF[id], own = hasTool(id), lock = T.needs && !hasTool(T.needs), can = !own && !lock && haveAll(T.cost);
    return `<button class="up shopi" ${can ? '' : 'disabled style="opacity:.5"'} onclick="buyTool('${id}')"><img src="${ICON_SRC[T.icon] || ''}" alt=""><b>${esc(T.name)}${own ? ' &#10003;' : ''}</b>${own ? 'yours' : lock ? 'get the ' + esc(TOOLDEF[T.needs].name.toLowerCase()) + ' first' : costHtml(T.cost)}<small style="display:block;opacity:.75">${esc(T.what)}</small></button>`; }).join('');
}
/* the tool belt (DOM, bottom middle) */
function beltRender() {
  let b = $('toolbelt'); if (!b) { b = document.createElement('div'); b.id = 'toolbelt'; $('wrap').appendChild(b); b.addEventListener('pointerdown', e => e.stopPropagation()); }
  const L = toolsOwned(); if (L.length < 2) { b.innerHTML = ''; return; }
  b.innerHTML = L.map((id, i) => { const T = TOOLDEF[id], on = YARD.tool === id; return `<button class="tslot${on ? ' on' : ''}" title="${esc(T.name + ': ' + T.what)}" onclick="pickTool2('${id}')"><img src="${ICON_SRC[T.icon] || ''}" alt=""><span>${i + 1}</span>${id === 'seeds' ? `<i>${esc(CROPS[YARD.seed].name)}</i>` : id === 'can' ? `<i>${canLeft()}/${CAN_MAX}</i>` : ''}</button>`; }).join('');
}
function beltTick() { const b = $('toolbelt'); if (!b) return beltRender(); const show = yardOn() && toolsOwned().length > 1 ? 'flex' : 'none'; if (b.style.display !== show) { b.style.display = show; if (show === 'flex') beltRender(); } }
setInterval(() => { try { beltTick(); } catch (e) {} }, 250);
/* ----- using a tool on the tile you face ----- */
function yardTarget() {
  if (!P) return null; const d = dir || { x: 0, y: 1 }, x = P.x + d.x * 22, y = P.y - 4 + d.y * 20, [c, r] = tileOf(x, y); if (c < 0 || r < 0 || c >= TC || r >= TR) return null;
  const a = yardAction(c, r); return { c, r, ok: !!(a && !a.why), a };
}
function yardAction(c, r) {                                         // what the held tool would do here: { tip, run } or { why }
  const ch = tAt(c, r), i = tIdx(c, r), q = HOME.farm[i], tool = YARD.tool;
  if (q && ripe(q)) return { tip: 'Pick the ' + CROPS[q.c].name.toLowerCase(), run: () => farmHarvest(i) };
  if (tool === 'hand') return null;
  if (tool === 'shovel') {
    if (q) return { tip: YARD.arm === i ? 'Press again to dig up the ' + CROPS[q.c].name.toLowerCase() + ' (it is lost)' : 'Dig up the young ' + CROPS[q.c].name.toLowerCase(), run: () => { if (YARD.arm !== i) { YARD.arm = i; return; } YARD.arm = null; delete HOME.farm[i]; homeSave(); pop(tCx(c), tCy(r) - 20, 'dug up', '#e8dcc0'); }, instant: 1 };
    const why = tileWhy(c, r); if (why) return { why };
    if (ch === '.') return { tip: 'Dig a dirt path', run: () => digTile(c, r, 'p'), dig: 1 };
    return { tip: ch === 'p' || ch === 't' ? 'Fill it in with grass' : 'Lift the ' + GT[ch].name.toLowerCase(), run: () => digTile(c, r, ch === 'p' || ch === 't' ? '.' : 'p'), dig: 1 };
  }
  if (tool === 'hoe') { if (ch === 't') return q ? { why: 'Already planted' } : { why: 'Tilled: plant it with Seeds' }; if (!'.pac'.includes(ch)) return { why: 'Lift the ' + GT[ch].name.toLowerCase() + ' with the shovel first' }; const why = tileWhy(c, r, 't'); if (why) return { why }; return { tip: 'Till the soil', run: () => digTile(c, r, 't'), dig: 1 }; }
  if (tool === 'seeds') { if (ch !== 't') return { why: 'Till it with the hoe first' }; if (q) return { why: 'Already planted' }; const C = CROPS[YARD.seed];
    return HOME.apples < C.seed ? { why: C.name + ' seeds cost ' + C.seed + ' apples' } : { tip: 'Plant ' + C.name.toLowerCase() + ' (' + C.seed + ' apples)', run: () => farmPlant(i, YARD.seed), instant: 1 }; }
  if (tool === 'can') { if (!q) return { why: ch === 't' ? 'Nothing planted to water' : 'Water crops on tilled soil' }; if (q.w) return { why: 'Already watered' };
    if (!canLeft()) return { why: 'The can is empty: fill it at the river or a rain barrel' };
    return { tip: 'Water the ' + CROPS[q.c].name.toLowerCase() + ' (' + canLeft() + ' left in the can)', run: () => { if (!canLeft()) return; HOME.yard.water = canLeft() - 1; farmWater(i); beltRender(); if (!canLeft()) pop(P.x, P.y - 100, 'The can is empty: fill it at the river', '#9fd4ff'); }, instant: 1 }; }
  return null;
}
const useFrames = tool => !!HOME_SRC['use_' + tool + '1'] && (HOME.skins.raccoon === 'classic' || !(skinDef('raccoon', HOME.skins.raccoon) || {}).art);   // drawn for the default raccoon (drawn skins dig with their paws)
const _drawHomeCoon = drawHomeCoon;
drawHomeCoon = function () {                                         // digging / hoeing a tile with the tool in its paws (art/home/use_<tool><n>.png from the tool-use sheet)
  const d = HDIG, kind = d && d.o && d.o.tile && useFrames(d.o.tool) && d.o.tool, k = kind && 'use_' + kind + (1 + Math.floor(d.t / 0.15) % 4), a = k && HOME_SRC[k], im = a && homeImg(k);
  if (!im || !im.complete || !im.naturalWidth) return _drawHomeCoon();
  shadow(P.x, P.y, 15 * RSC()); g.save(); g.translate(Math.round(P.x), Math.round(P.y + 3)); g.scale(d.face, 1); g.imageSmoothingEnabled = false; g.drawImage(im, -a.w / 2, -a.h, a.w, a.h); g.restore();
};
function digTile(c, r, ch) { setTile(c, r, ch); homeSave(); fxBurst(tCx(c), tCy(r), 12, { col: ch === '.' ? ['#5e9c40', '#86c463', '#6c5a3e'] : ['#6c5a3e', '#8a7656', '#b89c64'], s0: 20, s1: 110, up: 60, g: 240, l0: 0.25, l1: 0.6, r0: 1.5, r1: 3 }); }
function yardUse(a, tg) {                                          // dig / till plays the dig animation; planting, watering and picking are instant
  if (!a || a.why) { if (a && a.why) pop(P.x, P.y - 80, a.why, '#ffb3a0'); return; }
  YARD.useT = t; if ((a.dig || (YARD.tool === 'can' && useFrames('can'))) && typeof startDig === 'function') { startDig({ k: 'tile', tile: 1, tool: YARD.tool, x: tCx(tg.c), y: tCy(tg.r) + 6, r: 10, hp: 1, dig: 'rock', done: a.run }); if (HDIG) HDIG.t = 0.22; return; }
  a.run();
}
function yardInteractables() {
  if (!yardOn() || HDIG) return [];
  if (YARD.tool === 'can' && canLeft() < CAN_MAX && Math.abs(P.x - riverX(P.y)) < HRIVER.hw + 46) return [{ id: 'refill', x: P.x, y: P.y, r: 30, h: 70, tip: 'Fill the watering can (' + canLeft() + '/' + CAN_MAX + ')', act: () => refillCan('river') }]; const tg = yardTarget(); if (!tg || !tg.a || (tg.a.why && YARD.tool === 'hand')) return [];
  if (tg.a.why) return [];
  return [{ id: 'tile', low: 1, x: P.x, y: P.y, r: 30, h: 70, tip: tg.a.tip, act: () => yardUse(tg.a, tg) }];
}
/* ----- farming on tiles ----- */
const stationsNear = (id, x, y, r = STATION_R) => (HOME.placed.out || []).filter(p => p.id === id && Math.hypot(p.x - x, p.y - y) < r);
function farmPlant(i, crop) {
  const C = CROPS[crop]; if (!C || HOME.farm[i] || !spendApples(C.seed)) return; const c = i % TC, r = (i - c) / TC, x = tCx(c), y = tCy(r), now = gNow();
  const mult = (stationsNear('compost', x, y).length ? 0.75 : 1) * (cozyScore() >= 10 ? 0.9 : 1), q = { c: crop, at: now, end: now + C.grow * 60000 * mult };
  HOME.farm[i] = q; if (stationsNear('rainbarrel', x, y).length) farmWater(i, true); homeSave(); try { sfxPlay('pickup'); } catch (e) {}
  fxBurst(x, y, 6, { col: ['#6c5a3e', '#b89c64'], s1: 50, l1: 0.4, r1: 2 }); pop(x, y - 24, C.name + ' planted' + (q.w ? ' (watered)' : ''), '#9be37f');
}
function farmWater(i, quiet) {
  const q = HOME.farm[i]; if (!q || q.w) return; const now = gNow(); q.end = now + Math.max(0, q.end - now) / 2; q.w = 1; if (quiet) return; homeSave();
  const c = i % TC, r = (i - c) / TC; fxBurst(tCx(c), tCy(r) - 4, 10, { col: ['#9fd4ff', '#d6efff', '#6fb6ff'], s0: 10, s1: 60, up: 40, g: 200, l1: 0.5, r1: 2 }); try { sfxPlay('splash'); } catch (e) {}
}
function farmHarvest(i) {
  const q = HOME.farm[i]; if (!q || !ripe(q)) return; const C = CROPS[q.c], c = i % TC, r = (i - c) / TC, x = tCx(c), y = tCy(r);
  const n = C.yield[0] + Math.floor(Math.random() * (C.yield[1] - C.yield[0] + 1)) + (stationsNear('scarecrow', x, y).length ? 1 : 0);
  gardenLoad(); HOME.pantry[q.c] = (HOME.pantry[q.c] || 0) + n; delete HOME.farm[i]; homeSave(); try { sfxPlay('pickup'); } catch (e) {}
  fxBurst(x, y - 10, 12, { col: ['#9be37f', '#fff6c8'], k: 'spark', s1: 120, l1: 0.6, r1: 3 }); pop(x, y - 30, '+' + n + ' ' + C.name.toLowerCase() + (n === 1 ? '' : 's'), '#9be37f');
}
const FARM_SPOTS = [[9, 25], [23, 23], [16, 31]];
function drawFarmTile(i) {
  const q = HOME.farm[i]; if (!q) return; const c = i % TC, r = (i - c) / TC, gr = growth(q), done = ripe(q), big = q.c === 'pumpkin' || q.c === 'cabbage';
  const k = done ? 'crop_' + q.c + '3' : gr < 0.08 ? 'crop_seed' : gr < 0.45 ? 'crop_' + q.c + '1' : 'crop_' + q.c + '2', a = HOME_SRC[k], im = homeImg(k); if (!a || !im || !im.complete || !im.naturalWidth) return;
  const spots = big ? [[16, 28]] : FARM_SPOTS, s = big ? 1.4 : 1.1;
  spots.forEach(([sx, sy]) => { const w = a.w * s, h = a.h * s; g.drawImage(im, Math.round(c * TS + sx - w / 2), Math.round(r * TS + sy - h), Math.round(w), Math.round(h)); });
  if (done && Math.sin(t * 3 + i) > 0.55) { g.fillStyle = '#fff6c8'; g.fillRect(c * TS + 22, r * TS + 8, 1, 5); g.fillRect(c * TS + 20, r * TS + 10, 5, 1); }
}
/* ----- stations: what they do when you walk up to them ----- */
const HIVE_MS = 4 * 3600e3;
function hiveInfo(p) {
  const now = gNow(); let t0 = HOME.yard.hive[p.u]; if (!t0) { t0 = HOME.yard.hive[p.u] = now; }
  const bloom = Math.min(20, stationsNear_bloom(p.x, p.y)), iv = HIVE_MS / (1 + bloom * 0.05) / (cozyScore() >= 60 ? 1.25 : 1), n = Math.min(3, Math.floor((now - t0) / iv));
  return { n, iv, left: iv - ((now - t0) % iv), bloom };
}
function stationsNear_bloom(x, y) {                                 // flowers you placed and clover tiles near (x, y)
  const FL = ['poppy', 'sunny', 'violet', 'pink', 'bluebell', 'daisy', 'wild', 'fern', 'fernS'];
  let n = (HOME.placed.out || []).filter(p => FL.includes(p.id) && Math.hypot(p.x - x, p.y - y) < 5 * TS).length; const [c0, r0] = tileOf(x, y);
  for (let r = r0 - 5; r <= r0 + 5; r++) for (let c = c0 - 5; c <= c0 + 5; c++) if (GT[tAt(c, r)] && GT[tAt(c, r)].bloom) n += 0.5; return Math.floor(n);
}
function stationInteractables() {
  if (HOME_IN) return (HOME.placed.in || []).filter(p => p.id === 'ladder').map(p => ({ id: 'ladder', soft: 1, x: p.x, y: p.y + 10, r: 40, h: 100, tip: 'Ladder to the loft', act: () => pop(P.x, P.y - 80, 'The rungs are rotten. The loft will have to wait (coming soon).', '#cfd8e6') }));
  if (isVisiting()) return []; const L = []; const today = todayKey();
  (HOME.placed.out || []).forEach(p => {
    if (p.id === 'appletree') L.push({ id: 'appletree', soft: 1, x: p.x, y: p.y + 12, r: 46, h: 110, tip: HOME.yard.shook[p.u] === today ? 'Apple tree: shaken today' : 'Shake the apple tree', act: () => shakeAppleTree(p) });
    else if (p.id === 'beehive') { const h = hiveInfo(p); L.push({ id: 'beehive', soft: 1, x: p.x, y: p.y + 12, r: 42, h: 70, tip: h.n ? 'Beehive: take ' + h.n + ' honeycomb' : 'Beehive: next honeycomb in ' + fmtLeft(h.left), act: () => takeHoney(p) }); }
    else if (p.id === 'compost') L.push({ id: 'compost', soft: 1, x: p.x, y: p.y + 12, r: 40, h: 60, tip: HOME.yard.comp === today ? 'Compost bin: turned today' : 'Turn the compost', act: () => turnCompost(p) });
    else if (p.id === 'rainbarrel' && YARD.tool === 'can' && hasTool('can')) L.push({ id: 'rainbarrel', soft: 1, x: p.x, y: p.y + 12, r: 42, h: 70, tip: canLeft() < CAN_MAX ? 'Fill the watering can (' + canLeft() + '/' + CAN_MAX + ')' : 'Rain barrel: your can is full', act: () => canLeft() < CAN_MAX ? refillCan('rain barrel') : pop(p.x, p.y - 80, 'Your can is full', '#cfd8e6') });
    else if (STATION_TIP[p.id] && p.id !== 'lamppost' && p.id !== 'birdbath') L.push({ id: p.id, soft: 1, x: p.x, y: p.y + 12, r: 38, h: 70, tip: catItem(p.id).name, act: () => pop(p.x, p.y - 80, STATION_TIP[p.id], '#fff6c8') });
  });
  return L;
}
function shakeAppleTree(p) {
  const today = todayKey(); if (HOME.yard.shook[p.u] === today) return pop(p.x, p.y - 110, 'Shaken today. More apples tomorrow!', '#cfd8e6');
  const shookToday = Object.values(HOME.yard.shook).filter(d => d === today).length; HOME.yard.shook[p.u] = today;
  const n = shookToday >= 12 ? 0 : 2 + (cozyScore() >= 90 ? 1 : 0); if (n) payApples(n); homeSave(); try { sfxPlay('shake'); } catch (e) {}
  fxBurst(p.x, p.y - 70, 14, { col: ['#5e9c40', '#86c463', '#d94a3a'], s1: 120, up: 30, g: 260, l1: 0.8, r1: 3 }); pop(p.x, p.y - 110, n ? '+' + n + ' apples' : 'Only leaves today (12 trees a day at most)', n ? '#9be37f' : '#cfd8e6');
}
function takeHoney(p) { const h = hiveInfo(p); if (!h.n) return pop(p.x, p.y - 80, 'Not yet: ' + fmtLeft(h.left) + (h.bloom < 6 ? '. Plant flowers or clover nearby to speed it up.' : ''), '#cfd8e6');
  HOME.mats.honey = (HOME.mats.honey || 0) + h.n; HOME.yard.hive[p.u] = h.n >= 3 ? gNow() : HOME.yard.hive[p.u] + h.n * h.iv; homeSave(); try { sfxPlay('pickup'); } catch (e) {} pop(p.x, p.y - 80, '+' + h.n + ' honeycomb', '#ffd23f'); }
function turnCompost(p) { const today = todayKey(); if (HOME.yard.comp === today) return pop(p.x, p.y - 70, 'Turned today. Come back tomorrow.', '#cfd8e6'); HOME.yard.comp = today; HOME.mats.seeds = (HOME.mats.seeds || 0) + 1; homeSave(); try { sfxPlay('dig'); } catch (e) {} pop(p.x, p.y - 70, '+1 seed packet', '#9be37f'); }
/* ----- comfort tiers ----- */
const COZY_TIERS = [
  { at: 10, name: 'Homely', perk: 'Crops grow 10% faster' }, { at: 30, name: 'Snug', perk: '+4 seconds every night of a solo raid' },
  { at: 45, name: 'Cosy', perk: 'The market pays 10% more' }, { at: 60, name: 'Welcoming', perk: '+8 seconds a night, and beehives work 25% faster' },
  { at: 90, name: 'Beloved', perk: '+12 seconds a night, and apple trees give an extra apple' }];
const cozyTier = (s = cozyScore()) => COZY_TIERS.filter(q => s >= q.at).pop() || null;
const cozyMarket = () => cozyScore() >= 45 ? 1.1 : 1;
function comfortHtml() {                                            // one line on the request board; the full list is its own screen
  const s = cozyScore(), cur = cozyTier(s), next = COZY_TIERS.find(q => s < q.at);
  return `<p class="lbl">Comfort: <b>${cur ? esc(cur.name) : 'not yet Homely'}</b>${next ? ' &middot; ' + (next.at - s) + ' more for ' + esc(next.name) + ' (' + esc(next.perk.toLowerCase()) + ')' : ' &middot; every perk is yours'} <button class="slot" onclick="comfortScreen()">All perks</button></p>`;
}
function comfortScreen() {
  const s = cozyScore();
  homeScreen(`<h1>Comfort</h1><p class="tag">Cozy score ${s}. Furniture, garden stations, paths and clover all add comfort; many copies of the same little thing count less.</p>
  <div class="cards">${COZY_TIERS.map(q => `<div class="card"${s >= q.at ? '' : ' style="opacity:.55"'}><b>${s >= q.at ? '&#10003; ' : ''}${esc(q.name)} &middot; ${q.at}</b>${esc(q.perk)}</div>`).join('')}</div>
  <div class="row"><button onclick="boardScreen()">Back</button></div>`, 'comfort');
}
/* ----- build mode: the ground brushes and moving the core buildings ----- */
const _barSlots = barSlots;
barSlots = function () {
  const s = _barSlots(); if (HOME_IN || HIDE || isVisiting()) return s;
  if (hasTool('shovel')) s.push({ id: 'g_~', gb: '~', name: 'Edge brush: switch a tile between natural, straight and curved edges', icon: edgeIcon() });
  if (hasTool('shovel')) GBRUSH.forEach(ch => { const G = GT[ch]; if (G.needs && !hasTool(G.needs)) return; s.push({ id: 'g_' + ch, gb: ch, name: G.name + (Object.keys(G.cost).length ? ' (' + costText(G.cost) + ' a tile)' : ''), icon: gtIcon(ch), locked: G.unlock && !HOME.unlock[G.unlock] }); });
  return s;
};
const costText = c => Object.entries(c).map(([k, v]) => v + ' ' + (k === 'apples' ? 'apple' + (v === 1 ? '' : 's') : MATS[k] ? MATS[k].name.toLowerCase() : k)).join(', ');
const GTICON = {};
function gtIcon(ch) {
  if (GTICON[ch]) return GTICON[ch]; const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'), im = gtImg(ch);
  if (ch === '.') { x.fillStyle = '#79b957'; x.fillRect(0, 0, 40, 40); x.fillStyle = '#5e9c40'; for (let i = 0; i < 14; i++) x.fillRect((i * 13) % 38, (i * 7) % 34 + 3, 2, 5); } else if (im) x.drawImage(im, 0, 0, 40, 40, 0, 0, 40, 40); else return '';
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.strokeRect(0.5, 0.5, 39, 39); return (GTICON[ch] = c.toDataURL());
}
const _renderBar = renderBar;
renderBar = function () {
  _renderBar(); const bar = $('buildbar'); if (!bar || !BUILD.on) return;
  bar.querySelectorAll('.bslot').forEach(b => { const m = /pickFromStore\('g_(.)'\)/.exec(b.getAttribute('onclick') || ''); if (m) { b.setAttribute('onclick', `pickGround('${m[1]}')`); if (BUILD.gbrush === m[1]) b.classList.add('on'); } });
  if (BUILD.gbrush) { const a = bar.querySelector('.bacts button'); if (a) a.textContent = 'Paint'; }
  if (!HOME_IN && !HIDE && !isVisiting() && hasTool('shovel')) { const acts = bar.querySelector('.bacts'); if (acts && !acts.querySelector('.edgebtn')) { const b = document.createElement('button'); b.className = 'edgebtn';
    const nm = EDGE_NAME[edgeNow()]; b.title = 'The edges new tiles get: natural (soft, grassy), straight (tidy squares and diagonals) or curved (smooth rounded corners). Use the Edge brush to switch single tiles.'; b.textContent = 'New edges: ' + nm[0].toUpperCase() + nm.slice(1); b.onclick = toggleEdges; acts.insertBefore(b, acts.lastElementChild);
    const all = document.createElement('button'); all.className = 'edgebtn'; all.title = 'Give every tile in the yard ' + nm + ' edges'; all.textContent = 'All ' + nm; all.onclick = setAllEdges; acts.insertBefore(all, acts.lastElementChild); } }
};
function toggleEdges() {                                             // the style new tiles get (and what "All" sets)
  if (isVisiting()) return; HOME.edges = EDGE_NAME[EDGE_NEXT[edgeNow()]]; homeSave(); renderBar();
  say('New tiles get ' + { natural: 'natural edges (soft and grassy)', straight: 'straight edges (tidy squares and diagonals)', curved: 'curved edges (smooth rounded corners)' }[HOME.edges]);
}
function setAllEdges() {                                             // every tile at once (press twice: the first press asks)
  if (isVisiting()) return; const st = edgeNow(), name = EDGE_NAME[st];
  if (!BUILD.sellArm || BUILD.sellArm.key !== 'alledges' || t > BUILD.sellArm.t) { BUILD.sellArm = { key: 'alledges', t: t + 3 }; return say('Give every tile ' + name + ' edges? Press again'); }
  BUILD.sellArm = null; HOME.gst = st.repeat(TC * TR); homeSave(); say('Every tile has ' + name + ' edges now');
}
let EDGE_DRAG = null;                                                // dragging the edge brush: every tile gets what the first one became
function flipEdgeAt(x, y, drag) {
  const [c, r] = tileOf(x, y); if (c < 0 || r < 0 || c >= TC || r >= TR) return; if (tAt(c, r) === '.') return drag ? null : say('That is grass: point at a path or other ground');
  if (tAt(c, r) === 't') return drag ? null : say('Tilled soil always joins into beds');
  const st = drag && EDGE_DRAG ? EDGE_DRAG : EDGE_NEXT[tSty(c, r)]; if (!drag) EDGE_DRAG = st; setStyle(c, r, st); homeSave();
  if (!drag) say(EDGE_NAME[st][0].toUpperCase() + EDGE_NAME[st].slice(1) + ' edges here');
}
const EDGEICON = {};
function edgeIcon() {
  if (EDGEICON.s) return EDGEICON.s; const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#79b957'; x.fillRect(0, 0, 40, 40);
  x.fillStyle = '#b39760'; x.beginPath(); x.arc(12, 20, 11, 0, 7); x.fill(); x.fillRect(22, 9, 14, 22); x.strokeStyle = '#5e3b30'; x.lineWidth = 2; x.strokeRect(22, 9, 14, 22);
  x.strokeStyle = '#fff6c8'; x.beginPath(); x.moveTo(20, 4); x.lineTo(20, 36); x.stroke(); return (EDGEICON.s = c.toDataURL());
}
function pickGround(ch) {
  if (ch === '~') { if (BUILD.held) storeHeld(); BUILD.brush = null; BUILD.tool = null; BUILD.gbrush = '~'; renderBar(); return say('Edge brush: click a path tile to switch it between natural and straight'); }
  const G = GT[ch]; if (!G) return; if (G.unlock && !HOME.unlock[G.unlock]) { if (!haveAll(G.ucost)) return say('Unlock ' + G.name.toLowerCase() + ': ' + costText(G.ucost));
    if (!spendAll(G.ucost)) return; HOME.unlock[G.unlock] = 1; homeSave(); say(G.name + ' unlocked!'); }
  if (BUILD.held) storeHeld(); BUILD.brush = null; BUILD.tool = null; BUILD.gbrush = ch; renderBar(); if (!BUILD.msgT || t > BUILD.msgT) say(G.name + ': E or click paints a tile' + (isTouch ? '' : ' (drag to paint more)'));
}
function paintTileAt(x, y, drag) {
  if (BUILD.gbrush === '~') return flipEdgeAt(x, y, drag);
  const ch = BUILD.gbrush, G = GT[ch], [c, r] = tileOf(x, y); if (tAt(c, r) === ch) return; const why = tileWhy(c, r, ch); if (why) return say(why);
  if (G.needs && !hasTool(G.needs)) return say('You need the ' + TOOLDEF[G.needs].name.toLowerCase()); if (Object.keys(G.cost).length && !spendAll(G.cost)) return say('Not enough for ' + G.name.toLowerCase() + ': ' + costText(G.cost) + ' a tile');
  setTile(c, r, ch); homeSave(); BUILD.dirtyG = 1;
}
function coreAt(x, y) {
  if (HOME_IN || isVisiting() || HIDE) return null; let best = null;
  CORE_IDS.forEach(id => { if (YARD.lifted === id) return; const C = CORE[id], a = HOME_SRC[C.k()] || { w: 40, h: 40 }; const o = C.o;
    if (x > o.x - a.w / 2 && x < o.x + a.w / 2 && y > o.y - a.h + C.ex && y < o.y + C.ex + 4 && (!best || o.y > best.y)) best = { id: 'core_' + id, core: id, x: o.x, y: o.y, f: 0, r: 0 }; });
  return best;
}
const _hovered = hovered;
hovered = function () { const h = _hovered(); return h || (BUILD.gbrush ? null : coreAt(BUILD.cx, BUILD.cy)); };
function coreLift(h) { YARD.lifted = h.core; BUILD.held = { id: h.id, core: h.core, x: h.x, y: h.y, f: 0, r: 0, from: 'core' }; if (h.core === 'fire') obs = obs.filter(o => o.k !== 'wall'); rebuildSolids(); WGRID.key = ''; renderBar(); say(CORE[h.core].name + ': move it, then press E to put it down'); }
function coreDrop(quiet) { const id = YARD.lifted; YARD.lifted = null; BUILD.held = null; if (id === 'fire') obs = homeObs(); rebuildSolids(); WGRID.key = ''; renderBar(); if (!quiet && id) say(CORE[id].name + ' stays where it was'); }
function coreWhy(p) {
  const id = p.core || (catItem(p.id) || {}).core, C = CORE[id], k = C.k(), a = HOME_SRC[k] || { w: 40, h: 40 }, A = area();
  if (p.x - a.w / 2 < A.x0 || p.x + a.w / 2 > A.x1 || p.y > A.y1 - 6 || p.y - a.h < 40) return 'Too close to the edge';
  const poly = profPoly(k, p.x, p.y, C.ex) || boxFp(p.x, p.y, a.w * 0.42, Math.min(30, a.h * 0.3));
  for (let i = 0; i < poly.length; i++) { const [x, y] = poly[i]; if (inHomeRiver(x, y, 8) || onHomeBridge(x, y)) return 'Not in the river'; }
  const hits = q => poly.some(([x, y]) => inPoly(x, y, q)) || q.some(([x, y]) => inPoly(x, y, poly));
  if (HPOLY.some(hits) || placedPolys('out').some(hits)) return 'Something is in the way';
  if (obs.some(o => o.k === 'tree' && (inPoly(o.x, o.y, poly) || polyDist(o.x, o.y, poly) < o.r))) return 'A tree is in the way';
  const door = C.door(p); if (HPOLY.some(q => polyDist(door.x, door.y, q) < 14) || placedPolys('out').some(q => polyDist(door.x, door.y, q) < 14) || inHomeRiver(door.x, door.y, 10) || obs.some(o => solid(o) && o.k !== 'hweed' && Math.hypot(o.x - door.x, o.y - door.y) < o.r + 12)) return 'Its door would be blocked';
  const others = interactables().filter(o => !o.soft && o.id !== C.ia() && o.id !== 'dig' && o.id !== 'tile'); if (others.some(o => polyDist(o.x, o.y, poly) < 26)) return 'Too close to something you use';
  if (polyDist(P.x, P.y, poly) < 18) return 'You are standing there';
  if (polyDist(SPAWN.x, SPAWN.y, poly) < 24) return 'Keep the gate clear';
  return null;
}
function corePlace(p) {
  const why = coreWhy(p); if (why) return say(why); const id = p.core, keep = HOME.pos[id];
  HOME.pos[id] = { x: Math.round(p.x), y: Math.round(p.y) }; applyCorePos(); YARD.lifted = null; rebuildSolids(); WGRID.key = '';
  if (walledOff(null)) { if (keep) HOME.pos[id] = keep; else delete HOME.pos[id]; applyCorePos(); YARD.lifted = id; rebuildSolids(); WGRID.key = ''; return say('That would block the way'); }
  const poly = profPoly(CORE[id].k(), HOUSE === CORE[id].o ? HOUSE.x : CORE[id].o.x, CORE[id].o.y, CORE[id].ex) || boxFp(CORE[id].o.x, CORE[id].o.y, 30, 20);   // what it landed on is cleared for good
  (HOME_ALLOBS || []).forEach(o => { if (o.id && (inPoly(o.x, o.y, poly) || polyDist(o.x, o.y, poly) < o.r)) HOME.dug[o.id] = 1; });
  BUILD.held = null; obs = homeObs(); rebuildSolids(); GROUND_KEY = ''; HOME_GROUND = null; homeSave(); renderBar(); say(CORE[id].name + ' moved'); try { fxBurst(p.x, p.y - 6, 12, { col: ['#fff6c8', '#d9bb7e'], s1: 80, l1: 0.6, r1: 3 }); } catch (e) {}
}
const _whyNot = whyNot;
whyNot = function (p) { const c = catItem(p.id); if (c && c.core) return coreWhy(Object.assign({ core: c.core }, p)); return _whyNot(p); };
const _buildAct = buildAct;
buildAct = function () {
  if (BUILD.gbrush && !BUILD.held) return paintTileAt(BUILD.cx, BUILD.cy);
  if (BUILD.held && BUILD.held.core) return corePlace({ id: BUILD.held.id, core: BUILD.held.core, x: Math.round(BUILD.cx), y: Math.round(BUILD.cy) });
  if (!BUILD.held && !BUILD.brush && !BUILD.tool) { const h = hovered(); if (h && h.core) { if (isVisiting()) return say('Only the owner can move that'); return coreLift(h); } }
  return _buildAct();
};
const _storeHeld = storeHeld; storeHeld = function () { if (BUILD.held && BUILD.held.core) return coreDrop(true); return _storeHeld(); };
const _putBack = putBack; putBack = function (q) { if (BUILD.held && BUILD.held.core) return coreDrop(q); return _putBack(q); };
const _buildStore = buildStore;
buildStore = function () {
  if (BUILD.gbrush) { BUILD.gbrush = null; return renderBar(); } if (BUILD.held && BUILD.held.core) return coreDrop();
  const h = !BUILD.held && hovered(); if (h && h.core) return say(CORE[h.core].name + ' can be moved, but not put away'); return _buildStore();
};
const _buildSell = buildSell;
buildSell = function () { const h = BUILD.held || hovered(); if (h && h.core) return say(CORE[h.core].name + ' can be moved, but not sold'); return _buildSell(); };
const _buildFlip = buildFlip; buildFlip = function () { const h = BUILD.held || hovered(); if (h && h.core) return say(CORE[h.core].name + ' only faces one way'); return _buildFlip(); };
const _buildTurn = buildTurn; buildTurn = function () { const h = BUILD.held || hovered(); if (h && h.core) return say(CORE[h.core].name + ' only faces one way'); return _buildTurn(); };
const _pickFromStore = pickFromStore; pickFromStore = function (id) { if (/^g_/.test(id)) return pickGround(id.slice(2)); BUILD.gbrush = null; return _pickFromStore(id); };
const _pickBrush = pickBrush; pickBrush = function (id) { BUILD.gbrush = null; return _pickBrush(id); };
const _buildToggle = buildToggle; buildToggle = function (on) { BUILD.gbrush = null; const r = _buildToggle(on); if (!BUILD.on) YARD.lifted = null; return r; };
const _drawBuildOverlay = drawBuildOverlay;
drawBuildOverlay = function () {
  _drawBuildOverlay(); if (!BUILD.on || HOME_IN || !BUILD.gbrush) return; const [c, r] = tileOf(BUILD.cx, BUILD.cy); g.save(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
  for (let rr = r - 3; rr <= r + 3; rr++) for (let cc = c - 4; cc <= c + 4; cc++) g.strokeRect(cc * TS + 0.5, rr * TS + 0.5, TS - 1, TS - 1);
  const why = BUILD.gbrush === '~' ? (tAt(c, r) === '.' || tAt(c, r) === 't') : tAt(c, r) === BUILD.gbrush ? null : tileWhy(c, r, BUILD.gbrush); g.strokeStyle = why ? '#ff6a5a' : '#7dff8e'; g.lineWidth = 2; g.strokeRect(c * TS + 1, r * TS + 1, TS - 2, TS - 2); g.restore();
};
const _drawBuildHud = drawBuildHud;
drawBuildHud = function () {
  if (BUILD.on && !HOME_IN && BUILD.gbrush === '~' && !(t < BUILD.msgT)) { const [c, r] = tileOf(BUILD.cx, BUILD.cy), ch = tAt(c, r);
    BUILD.msg = 'Edge brush: ' + (ch === '.' ? 'point at a path or other ground' : ch === 't' ? 'tilled soil always joins into beds' : 'these edges are ' + EDGE_NAME[tSty(c, r)] + (isTouch ? ': tap to switch' : ': E or click switches (drag for more)')); BUILD.msgT = t + 0.05; }
  else if (BUILD.on && !HOME_IN && BUILD.gbrush && !(t < BUILD.msgT)) { const [c, r] = tileOf(BUILD.cx, BUILD.cy), G = GT[BUILD.gbrush], why = tAt(c, r) === BUILD.gbrush ? 'Already ' + G.name.toLowerCase() : tileWhy(c, r, BUILD.gbrush); BUILD.msg = G.name + ': ' + (why || (isTouch ? 'tap to paint' : 'E or click paints')); BUILD.msgT = t + 0.05; }
  _drawBuildHud();
};
cv.addEventListener('pointerdown', e => { if (state === 'home' && BUILD.on && BUILD.gbrush && e.pointerType === 'mouse') YARD.painting = true; }, true);
window.addEventListener('pointerup', () => { YARD.painting = false; });
cv.addEventListener('pointermove', e => { if (YARD.painting && state === 'home' && BUILD.on && BUILD.gbrush && (e.buttons & 1)) { const p = pt(e); paintTileAt(p.x + cam.x, p.y + cam.y, true); } });
/* ----- hooks into the homestead ----- */
const _homeObs = homeObs;
homeObs = function () {                                              // lay nature out from where the buildings first stood, then put them where they are now
  const cur = coreSnap(); coreSet(CORE_DEF); let kept; try { kept = _homeObs(); } finally { coreSet(cur); }
  HPOLY = homeFootprints(); kept.forEach(q => { if (q.k === 'hrock') { const p = profPoly(q.img, q.x, q.y + q.r * 0.45, 2); if (p) HPOLY.push(p); } });
  const wall = kept.find(q => q.k === 'wall'); if (wall) { wall.x = FIRE.x; wall.y = FIRE.y - 6; }
  const blocks = HPOLY.filter(p => true), doors = CORE_IDS.map(id => CORE[id].door(CORE[id].o));
  const out = kept.filter(q => q.k === 'wall' || q.k === 'hrock' ? true : !(blocks.some(p => inPoly(q.x, q.y, p)) || doors.some(d => Math.hypot(d.x - q.x, d.y - q.y) < q.r + 8)));
  if (out.length !== kept.length) { HPOLY = homeFootprints(); out.forEach(q => { if (q.k === 'hrock') { const p = profPoly(q.img, q.x, q.y + q.r * 0.45, 2); if (p) HPOLY.push(p); } }); }
  return out;
};
const _digInteractable = digInteractable;
digInteractable = function () {
  const base = _digInteractable(); if (YARD.tool !== 'shovel' || !yardOn()) return base;
  let best = null, bd = 1e9; for (const o of obs) if (o.k === 'tree' && o.id) { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r + 30 && d < bd) { bd = d; best = o; } }
  if (best && (!base.length || base[0].low || bd < Math.hypot(P.x - base[0].o.x, P.y - base[0].o.y))) { if (!best.dig) { best.dig = 'tree'; best.hp = DIG_KINDS.tree.hp; best.byShovel = 1; }
    return [{ id: 'dig', o: best, x: best.x, y: best.y + 4, r: best.r + 30, tip: 'Dig up the tree (it goes into storage)' + (best.hp > 1 ? ' (' + best.hp + ' digs)' : ''), h: 96 }]; }
  return base;
};
DIG_KINDS.tree = { hp: 4, name: 'tree', loot: [0, 2] };
const _homeDigNear = homeDigNear;
homeDigNear = function () { const o = _homeDigNear(); return o && o.dig === 'tree' && YARD.tool !== 'shovel' ? null : o; };
const _startDig = startDig;
startDig = function (o) { if (o && !o.tile && YARD.tool === 'shovel' && !o.shv && o.hp > 1) { o.shv = 1; o.hp = Math.max(1, Math.ceil(o.hp / 2)); } return _startDig(o); };
const _finishDig = finishDig;
finishDig = function (o) {
  if (o && o.tile) { try { o.done(); } finally { HDIG = null; } return; }
  const r = _finishDig(o);
  if (o.k === 'tree' && (o.dig === 'tree' || o.dig === 'sapling')) { const id = o.dig === 'tree' ? 'appletree' : 'youngtree'; HOME.store[id] = (HOME.store[id] || 0) + 1; homeSave(); pop(o.x, o.y - 80, (o.dig === 'tree' ? 'An apple tree' : 'A young tree') + ' for storage: replant it with Build', '#c9e7ff'); }
  if (o.k === 'hrock') { const n = o.dig === 'boulder' ? 3 : 1 + (Math.random() < 0.5 ? 1 : 0); HOME.mats.stone = (HOME.mats.stone || 0) + n; homeSave(); pop(o.x, o.y - 70, '+' + n + ' stone', '#d8d4cc'); }
  return r;
};
const _updateHome = updateHome;
updateHome = function (dt) {
  _updateHome(dt); if (!yardOn() || HDIG || YARD.tool === 'hand') return;
  if (held('shake') && t - YARD.useT > 0.32 && homeNear && homeNear.id === 'tile') { const tg = yardTarget(); if (tg && tg.a && !tg.a.why && !tg.a.instant) yardUse(tg.a, tg); else if (tg && tg.a && !tg.a.why && tg.a.instant && t - YARD.useT > 0.45 && tg.a.tip.indexOf('again') < 0) yardUse(tg.a, tg); }
};
function yardSpeed() { if (HOME_IN || !HOME.gnd) return 1; const [c, r] = tileOf(P.x, P.y), G = GT[tAt(c, r)]; return G && G.path ? 1.18 : 1; }
const _drawDirtFx = drawDirtFx; drawDirtFx = function () { if (!HOME_IN) drawYardGround(); return _drawDirtFx(); };
const _drawNeighbors = drawNeighbors;
drawNeighbors = function (list) {
  _drawNeighbors(list); if (HOME_IN) return; const r0 = Math.floor(cam.y / TS) - 1, r1 = Math.ceil((cam.y + VH) / TS) + 2, c0 = Math.floor(cam.x / TS) - 1, c1 = Math.ceil((cam.x + VW) / TS) + 1;
  for (const k in HOME.farm) { const i = +k, c = i % TC, r = (i - c) / TC; if (c >= c0 && c <= c1 && r >= r0 && r <= r1) list.push({ y: r * TS + 30, f: () => drawFarmTile(i) }); }
};
const _drawFire = drawFire; drawFire = function () { if (YARD.lifted === 'fire') return; return _drawFire(); };
const _gardenInteractables = gardenInteractables;
gardenInteractables = function () {
  const L = _gardenInteractables().map(o => o.id === 'market' ? Object.assign(o, { x: MARKET.x, y: MARKET.y + 16 }) : o);
  return L.concat(stationInteractables(), yardInteractables());
};
const _villageInteractables = villageInteractables;
villageInteractables = function () { const L = _villageInteractables(); return HOME_IN && !HIDE ? L.concat(stationInteractables()) : L; };
const _drawYardVisitors = drawYardVisitors;
drawYardVisitors = function () {                                     // after the evening tint: lamp posts glow
  _drawYardVisitors(); if (HOME_IN) return; const tn = homeTint(); if (tn[3] < 0.08) return; g.save(); g.globalCompositeOperation = 'lighter';
  (HOME.placed.out || []).forEach(p => { if (p.id !== 'lamppost') return; const x = p.x, y = p.y - 62, rad = 120, gr = g.createRadialGradient(x, y + 40, 4, x, y + 40, rad); gr.addColorStop(0, `rgba(255,200,110,${0.55 * Math.min(1, tn[3] * 2)})`); gr.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gr; g.fillRect(x - rad, y + 40 - rad, rad * 2, rad * 2); });
  g.restore();
};
/* the fix-up list used to live on the crate by the wall (which you can move now): it is a page pinned to the wall instead */
const PLANS = { x: IFX0 + 150, y: IFY0 + 22 };
const _drawCozyOver = drawCozyOver;
drawCozyOver = function () {
  if (HOME_IN && !HIDE && HOME.mig && HOME.mig.inItems) { const a = HOME_SRC.note, im = homeImg('note'); if (a && im && im.complete && im.naturalWidth) { const s = 2; g.drawImage(im, Math.round(PLANS.x - a.w * s / 2), Math.round(IFY0 - 40 - a.h * s), Math.round(a.w * s), Math.round(a.h * s)); } }
  return _drawCozyOver();
};
if (typeof buildLoad === 'function') yardLoad();
