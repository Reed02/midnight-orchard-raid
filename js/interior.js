/* ===== INSIDE THE COTTAGE =====
   Walk in through the cabin door. The first room starts out shabby on purpose: grimy boards, cracked and mossy walls, cobwebs, a dark room.
   The crate by the wall is the FIX-UP LIST (sweep, sand the floor, patch the walls: HOME.fix) and the ROOMS list (a bedroom through the back door,
   a kitchen to the west, a workshop to the east).
   The house is a grid of tiles (HOME.grid, GC x GR letters): w / s / d = wood, stone, dark oak floor (a capital letter = floor you added, so it can
   be sold back), x / X = a wall you built (X: on floor you added), . = solid wall or outside. Anything that is not floor is drawn as wall: a wall
   face where a floor tile is below it, a cap and side strips everywhere else. In build mode the Floor / Wall / Remove tools reshape it
   (reshapeWhy has the rules: new floor joins the house, nothing is ever cut off, the front step and the things you use stay clear).
   The first room keeps its old coordinates (IFX0.. IFY1), so furniture saved before the grid existed stays where it was.
   Art: art/home/int_*.png, cut by tools/cut_interior_assets.py. The room uses the homestead's state ('home') with HOME_IN set. */
let HOME_IN = false, IN_SAVE = null;
const IT = 56, ICOLS = 8, IROWS = 4, IWALL = 2, IRX = 376, IRY = 200, ISW = 14;                 // tile size, the first room's size in tiles, its top-left, side wall thickness
const IFX0 = IRX, IFX1 = IRX + ICOLS * IT, IFY0 = IRY + IWALL * IT, IFY1 = IFY0 + IROWS * IT, ICX = (IFX0 + IFX1) / 2, IGAP = 30;
const GC = 24, GR = 15, GMC = 8, GMR = 7, GX = IFX0 - GMC * IT, GY = IFY0 - GMR * IT;          // the grid, and where the first room sits in it (columns 8-15, rows 7-10)
const FLOOR_PRICE = 30, WALL_PRICE = 12;
const cellX = c => GX + c * IT, cellY = r => GY + r * IT, cellOf = (x, y) => [Math.floor((x - GX) / IT), Math.floor((y - GY) / IT)];
const gAt = (c, r) => c < 0 || r < 0 || c >= GC || r >= GR || !HOME.grid ? '.' : HOME.grid[r * GC + c];
const isFloorCh = ch => 'wsdWSD'.includes(ch), isFloor = (c, r) => isFloorCh(gAt(c, r));
const inMain = (c, r) => c >= GMC && c < GMC + ICOLS && r >= GMR && r < GMR + IROWS;
function gSet(c, r, ch) { const i = r * GC + c; HOME.grid = HOME.grid.slice(0, i) + ch + HOME.grid.slice(i + 1); GBOX = null; }
const ROOMS = [                                                                     // rect = [c0, r0, c1, r1] (inclusive), door = the tiles opened through the wall
  { id: 'bed', name: 'Bedroom', price: 300, text: 'A quiet room through the back door.', rect: [9, 2, 16, 4], door: [[13, 5], [13, 6]] },
  { id: 'kitchen', name: 'Kitchen', price: 360, text: 'A big square room to the west, through the side wall.', rect: [1, 6, 6, 11], door: [[7, 9]] },
  { id: 'workshop', name: 'Workshop', price: 280, text: 'A snug room to the east, past the ladder.', rect: [17, 7, 21, 11], door: [[16, 9]] },
];
const WINDOWS = [[10, 6], [11, 1], [15, 1], [3, 5], [19, 6]], BACKDOOR = [13, 6];
const FIXES = [
  { id: 'sweep', name: 'Sweep and dust', price: 40, text: 'Clear the cobwebs and the dust.' },
  { id: 'floor', name: 'Sand and oil the floorboards', price: 100, text: 'Scrub off the grime; the boards come up warm and golden.' },
  { id: 'walls', name: 'Patch and scrub the walls', price: 140, text: 'Fill the cracks and scrape away the moss.' },
];
const IN_ITEMS = [                                                                  // furniture: picture, where (bottom centre), solid footprint [half width, depth]
  { k: 'barrel', x: IFX0 + 28, y: IFY0 + 46, fp: [16, 14] }, { k: 'crate_b', x: IFX0 + 96, y: IFY0 + 66, fp: [21, 16], id: 'bench' },
  { k: 'logs_a', x: IFX1 - 30, y: IFY1 - 14, fp: [15, 12] }, { k: 'int_ladder', x: IFX1 - 46, y: IFY0 + 34, fp: [15, 10], id: 'ladder' },
];
const fixed = id => !!(HOME.fix && HOME.fix[id]);
const roomBuilt = id => !!(HOME.rooms && HOME.rooms[id]);
function gridLoad() {                                                               // make the grid (an older save had only the first room: HOME.floorIn)
  HOME.rooms = HOME.rooms && typeof HOME.rooms === 'object' ? HOME.rooms : {};
  if (typeof HOME.grid === 'string' && HOME.grid.length === GC * GR) return;
  const g2 = '.'.repeat(GC * GR).split(''), old = typeof HOME.floorIn === 'string' && HOME.floorIn.length === ICOLS * IROWS ? HOME.floorIn : 'w'.repeat(ICOLS * IROWS);
  for (let j = 0; j < IROWS; j++) for (let i = 0; i < ICOLS; i++) g2[(GMR + j) * GC + GMC + i] = old[j * ICOLS + i] === 's' ? 's' : 'w';
  HOME.grid = g2.join(''); delete HOME.floorIn;
}
let GBOX = null;                                                                    // the floor's bounding box in pixels (for the camera and build mode)
function gridBox() {
  if (GBOX) return GBOX; let c0 = GC, c1 = 0, r0 = GR, r1 = 0;
  for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) if (isFloor(c, r)) { c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); }
  return (GBOX = { x0: cellX(c0), x1: cellX(c1 + 1), y0: cellY(r0), y1: cellY(r1 + 1), c0, c1, r0, r1 });
}
/* ----- solid walls: every tile that is not floor, in runs along each row; the front door is a gap ----- */
const EXIT_CELLS = [[11, 11], [12, 11]];
function interiorPolys(base) {                                                       // base: furniture by its base box (for the placing rules), else by its whole outline (solid)
  const P2 = [], exit = (c, r) => EXIT_CELLS.some(([a, b]) => a === c && b === r);
  for (let r = 0; r < GR; r++) { let c0 = -1; for (let c = 0; c <= GC; c++) { const solidC = c < GC && !isFloor(c, r) && !exit(c, r);
    if (solidC && c0 < 0) c0 = c; if (!solidC && c0 >= 0) { P2.push(boxFp((cellX(c0) + cellX(c)) / 2, cellY(r + 1), (c - c0) * IT / 2, IT)); c0 = -1; } } }
  P2.push(boxFp((cellX(11) + ICX - IGAP) / 2, cellY(12), (ICX - IGAP - cellX(11)) / 2, IT), boxFp((ICX + IGAP + cellX(13)) / 2, cellY(12), (cellX(13) - ICX - IGAP) / 2, IT));   // either side of the doorway
  P2.push(boxFp(IFX1 - 70, IFY1 - 30, 26, 24));                                    // the cellar hatch (a hole)
  IN_ITEMS.forEach(o => P2.push((!base && profPoly(o.k, o.x, o.y, 2)) || boxFp(o.x, o.y, o.fp[0], o.fp[1]))); return P2;
}
function interiorSolids() { return interiorPolys().concat(placedPolys('in')); }
/* ----- the raccoon indoors is an ellipse (IN_RX wide each side, IN_RY deep), not the yard's small circle: it is drawn about 50 px wide, so with a
   10 px circle half its body slid into the side walls. Collision is done in a space squashed by IN_K, where the ellipse is a circle of IN_RX. ----- */
const IN_RX = 18, IN_RY = 9, IN_K = IN_RX / IN_RY;
let IN_SQ = null, IN_SQ_SRC = null;
const sqPoly = q => q.map(([x, y]) => [x, y * IN_K]);
function inSquashed() { if (IN_SQ_SRC !== HPOLY) { IN_SQ_SRC = HPOLY; IN_SQ = HPOLY.map(sqPoly); } return IN_SQ; }
function inPush(e) {                                                                // push the raccoon (or a visitor) out of every wall and piece of furniture
  const Q = inSquashed(), s = { x: e.x, y: e.y * IN_K };
  for (let pass = 0; pass < 6; pass++) { let moved = false; for (const q of Q) if (polyPush(s, q, IN_RX)) moved = true; if (!moved) break; }
  e.x = s.x; e.y = s.y / IN_K;
}
function inBlocked(x, y, m = 1) { const Q = inSquashed(), sy = y * IN_K; return Q.some(q => inPoly(x, sy, q) || polyNear(x, sy, q).d < IN_RX - m); }
function inStep(e, dx, dy) {                                                        // one small step that can never end inside, or pass through, anything solid
  const ox = e.x, oy = e.y, tryMove = (mx, my) => {
    e.x = ox + mx; e.y = oy + my; inPush(e); if (inBlocked(e.x, e.y, 0.6)) return false;
    const n = Math.ceil(Math.hypot(e.x - ox, e.y - oy) / 3); for (let i = 1; i < n; i++) { const u = i / n; if (inBlocked(ox + (e.x - ox) * u, oy + (e.y - oy) * u, IN_RX * 0.6)) return false; }   // the way there is open too
    return true;
  };
  if (tryMove(dx, dy) || (dx && tryMove(dx, 0)) || (dy && tryMove(0, dy))) return; e.x = ox; e.y = oy;
}
function enterInterior() {
  if (!HOME.house) return; gridLoad(); for (const k in keys) keys[k] = false; IN_SAVE = { obs, HPOLY }; HOME_IN = true; obs = []; HPOLY = interiorSolids(); FX.length = 0; HDIG = null;
  P.x = ICX; P.y = IFY1 - 14; inPush(P); P.tx = P.x; P.ty = P.y; dir = { x: 0, y: -1 }; homeNear = null; inCam(1, true);
  if (!HOME.seen.inside) { HOME.seen.inside = 1; homeSave(); pop(ICX, IFY0 + 60, 'Home sweet... well. It needs some work.', '#ffd23f', true); }
}
function exitInterior() {
  if (BUILD.on) buildToggle(false); if (COZY.sit) standUp(); COZY.sleep = 0;
  HOME_IN = false; obs = IN_SAVE ? IN_SAVE.obs : homeObs(); HPOLY = IN_SAVE ? IN_SAVE.HPOLY : HPOLY; IN_SAVE = null; for (const k in keys) keys[k] = false;
  P.x = HOUSE.x - 52; P.y = HOUSE.y + 36; P.tx = P.x; P.ty = P.y; dir = { x: 0, y: 1 }; homeNear = null; cam.x = clampN(P.x - VW / 2, 0, HW - VW); cam.y = clampN(P.y - VH / 2, 0, HH - VH);
}
const interiorInteractables = () => [
  { id: 'bench', x: IFX0 + 96, y: IFY0 + 84, r: 52, tip: 'Fix-up list and new rooms', h: 70 },
  ...(roomBuilt('bed') || isFloor(BACKDOOR[0], BACKDOOR[1]) ? [] : [{ id: 'idoor', x: IFX0 + 5.5 * IT, y: IFY0 + 22, r: 44, tip: 'The back door: build a bedroom', h: 110 }]),
  { id: 'ladder', x: IFX1 - 46, y: IFY0 + 50, r: 42, tip: 'Ladder to the loft', h: 110 },
  { id: 'hatch', x: IFX1 - 70, y: IFY1 - 12, r: 44, tip: 'Cellar hatch', h: 60 },
  { id: 'out', x: ICX, y: IFY1 - 6, r: 34, tip: 'Go outside', h: 64 },
].concat(typeof cozyInteractables === 'function' ? cozyInteractables() : []);
function updateInterior(dt) {
  if (cozyTick(dt)) { pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0); homeNear = null; return; }      // sitting or asleep (cozy.js)
  t += dt; const mv = moveVec('raccoon'); let dx = mv.x, dy = mv.y; const m = Math.hypot(dx, dy); P.moving = m > 0;
  if (m) { dx /= m; dy /= m; dir = { x: dx, y: dy }; if (dx) P.face = dx > 0 ? 1 : -1; anim += dt * 14; } else anim = 0;
  const step = 170 * dt, n = Math.max(1, Math.ceil(step / 4)); if (m) for (let i = 0; i < n; i++) inStep(P, dx * step / n, dy * step / n);
  if (P.y > IFY1 + 10 && Math.abs(P.x - ICX) < IGAP) return exitInterior();          // out through the doorway
  homeNear = null; let best = 1e9; for (const o of interiorInteractables()) { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r && d < best) { best = d; homeNear = o; } }
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
}
function interiorAct(id) {
  if (id === 'bench') return fixScreen(); if (id === 'out') return exitInterior(); if (id === 'idoor') return roomsScreen();
  pop(P.x, P.y - 80, { ladder: 'The rungs are rotten. The loft will have to wait (coming soon).', hatch: 'A cellar, dark and damp (coming soon).' }[id], '#cfd8e6');
}
function fixScreen() {
  const rows = FIXES.map(f => { const done = fixed(f.id), can = !done && HOME.apples >= f.price;
    return `<button class="up" ${done || !can ? 'disabled style="opacity:' + (done ? '.75' : '.5') + '"' : ''} onclick="buyFix('${f.id}')"><b>${esc(f.name)}</b>${done ? 'done' : f.price + ' apples'}<br><small>${esc(f.text)}</small></button>`; }).join('');
  homeScreen(`<h1>Fix-up list</h1><p class="tag">The cottage has seen better days. You have ${HOME.apples} apples.</p><div class="row">${rows}</div>
  <p class="lbl">Want more space? Build a new room, or reshape the house tile by tile in build mode (B): Floor adds floor, Wall builds a wall, Remove sells either back.</p>
  <div class="row"><button class="up" onclick="roomsScreen()"><b>New rooms</b>bedroom, kitchen, workshop</button><button onclick="leaveHomeScreen()">Back to the room</button></div>`, 'fixup');
}
function buyFix(id) {
  const f = FIXES.find(q => q.id === id); if (!f || fixed(id) || !spendApples(f.price)) return fixScreen();
  HOME.fix[id] = 1; homeSave(); leaveHomeScreen(); pop(ICX, IFY0 + 100, f.name + ': done!', '#9be37f', true); fxBurst(ICX, IFY0 + 120, 26, { col: ['#ffd23f', '#fff6a8', '#fff'], k: 'spark', s1: 160, up: 40, l1: 0.9, r1: 4 });
}
function roomsScreen() {
  gridLoad(); const rows = ROOMS.map(R => { const done = roomBuilt(R.id), can = !done && HOME.apples >= R.price, [c0, r0, c1, r1] = R.rect;
    return `<button class="up" ${done || !can ? 'disabled style="opacity:' + (done ? '.75' : '.5') + '"' : ''} onclick="buyRoom('${R.id}')"><b>${esc(R.name)}</b>${done ? 'built' : R.price + ' apples'}<br><small>${esc(R.text)} ${c1 - c0 + 1} by ${r1 - r0 + 1} tiles.</small></button>`; }).join('');
  homeScreen(`<h1>New rooms</h1><p class="tag">Each room opens onto the one you have. Furnish it, paint its floor, or move its walls afterwards. You have ${HOME.apples} apples.</p><div class="row">${rows}</div>
  <div class="row"><button onclick="fixScreen()">Fix-up list</button><button onclick="leaveHomeScreen()">Back to the room</button></div>`, 'rooms');
}
function buyRoom(id) {
  const R = ROOMS.find(q => q.id === id); if (!R || roomBuilt(id) || !spendApples(R.price)) return roomsScreen();
  const [c0, r0, c1, r1] = R.rect; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const ch = gAt(c, r); if (!isFloorCh(ch)) gSet(c, r, ch === 'X' ? 'W' : 'w'); }
  R.door.forEach(([c, r]) => { const ch = gAt(c, r); if (!isFloorCh(ch)) gSet(c, r, 'w'); });
  HOME.rooms[id] = 1; homeSave(); if (HOME_IN) HPOLY = interiorSolids(); leaveHomeScreen();
  const [dc, dr] = R.door[0]; pop(cellX(dc) + IT / 2, cellY(dr), R.name + ' built!', '#9be37f', true); fxBurst(cellX(dc) + IT / 2, cellY(dr) + 20, 30, { col: ['#ffd23f', '#fff6a8', '#fff'], k: 'spark', s1: 180, up: 40, l1: 1, r1: 4 });
}
/* ----- reshaping (build mode tools) ----- */
const PORCH = (c, r) => r >= 11 && c >= 10 && c <= 13;
function lockedCells() {                                                            // floor that has to stay floor: the doorway and every place you use
  const L = new Set(['11,10', '12,10']); IN_ITEMS.forEach(o => { const [c, r] = cellOf(o.x, o.y - 4); L.add(c + ',' + r); }); [[14, 10], [15, 10]].forEach(([c, r]) => L.add(c + ',' + r));
  interiorInteractables().forEach(o => { if (o.id === 'idoor' || o.soft) return; const [c, r] = cellOf(o.x, o.y); L.add(c + ',' + r); }); return L;
}
function cellHasThing(c, r) { const x0 = cellX(c), y0 = cellY(r); return HOME.placed.in.some(p => { const { w, h, c: ci } = pSize(p), top = p.y - (ci.flat ? h : Math.min(h * 0.3, 24)); return p.x + w / 2 > x0 && p.x - w / 2 < x0 + IT && p.y > y0 && top < y0 + IT; }); }
function stillJoined(skipC, skipR) {                                                // would every floor tile still be reachable from the front door?
  const seen = new Set(), st = [[11, 10]], key = (c, r) => c + ',' + r; seen.add(key(11, 10));
  while (st.length) { const [c, r] = st.pop(); for (const [a, b] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) { if ((a === skipC && b === skipR) || !isFloor(a, b) || seen.has(key(a, b))) continue; seen.add(key(a, b)); st.push([a, b]); } }
  for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) if (isFloor(c, r) && !(c === skipC && r === skipR) && !seen.has(key(c, r))) return false; return true;
}
const wallRefund = () => Math.floor(WALL_PRICE * SELL_BACK), floorRefund = () => Math.floor(FLOOR_PRICE * SELL_BACK);
function reshapeWhy(tool, c, r) {                                                   // { why } if not allowed, else { cost (negative: you get apples back), to: the new letter, say }
  const ch = gAt(c, r), here = Math.floor((P.x - GX) / IT) === c && Math.floor((P.y - GY) / IT) === r;
  const clearToSolid = () => lockedCells().has(c + ',' + r) ? 'That spot needs to stay clear' : cellHasThing(c, r) ? 'Move the furniture off it first' : here ? 'Step out of the way first' : !stillJoined(c, r) ? 'That would cut off part of the house' : null;
  if (tool === 'floor') {
    if (isFloorCh(ch)) return { why: 'Already floor' };
    if (ch === 'x' || ch === 'X') return { cost: -wallRefund(), to: ch === 'X' ? 'W' : 'w', say: 'Knock the wall down (+' + wallRefund() + ')' };
    if (c < 1 || r < 1 || c > GC - 2 || r > GR - 3) return { why: 'The house cannot grow past here' };
    if (PORCH(c, r)) return { why: 'Keep the front step clear' };
    if (![[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].some(([a, b]) => isFloor(a, b))) return { why: 'New floor has to join the house' };
    return HOME.apples < FLOOR_PRICE ? { why: 'Needs ' + FLOOR_PRICE + ' apples' } : { cost: FLOOR_PRICE, to: 'W', say: 'Add floor (' + FLOOR_PRICE + ' apples)' };
  }
  if (tool === 'wall') {
    if (!isFloorCh(ch)) return { why: 'Walls go on the floor' };
    const w2 = clearToSolid(); if (w2) return { why: w2 };
    return HOME.apples < WALL_PRICE ? { why: 'Needs ' + WALL_PRICE + ' apples' } : { cost: WALL_PRICE, to: ch === ch.toUpperCase() ? 'X' : 'x', say: 'Build a wall (' + WALL_PRICE + ' apples)' };
  }
  if (ch === 'x' || ch === 'X') return { cost: -wallRefund(), to: ch === 'X' ? 'W' : 'w', say: 'Sell the wall back (+' + wallRefund() + ')' };
  if ('WSD'.includes(ch)) { const w2 = clearToSolid(); if (w2) return { why: w2 }; return { cost: -floorRefund(), to: '.', say: 'Sell the floor back (+' + floorRefund() + ')' }; }
  return { why: isFloorCh(ch) ? 'Only floor you added can be sold back' : 'Nothing of yours to remove here' };
}
function reshapeAt(x, y) {
  const [c, r] = cellOf(x, y), q = reshapeWhy(BUILD.tool, c, r); if (q.why) return say(q.why);
  if (q.cost > 0 && !spendApples(q.cost)) return say('Needs ' + q.cost + ' apples'); if (q.cost < 0) { HOME.apples -= q.cost; homeGain = { n: -q.cost, t }; }
  gSet(c, r, q.to); HPOLY = interiorSolids(); homeSave(); renderBar();
  fxBurst(cellX(c) + IT / 2, cellY(r) + IT / 2, 12, { col: q.to === '.' || q.to.toLowerCase() === 'x' ? ['#56564e', '#3c3c36', '#8a8574'] : ['#c6aa72', '#a88c58', '#fff6c8'], s1: 90, l1: 0.6, r1: 3 });
}
/* ----- drawing ----- */
function inImg(k) { const a = HOME_SRC[k], im = homeImg(k); return a && im && im.complete && im.naturalWidth ? [im, a] : null; }
function inDraw(k, x, y, w, h) { const p = inImg(k); if (p) g.drawImage(p[0], Math.round(x), Math.round(y), w || p[1].w, h || p[1].h); }
const IN_GRIME = (() => { const r = hrng(99), o = []; for (let i = 0; i < 70; i++) o.push([IFX0 + r() * ICOLS * IT, IFY0 + r() * IROWS * IT, 6 + r() * 18, r()]); return o; })();
const SHABBY_FACE = ['int_wall4', 'int_wall2', 'int_window', 'int_wall5', 'int_wall3', 'int_wall0', 'int_wall4', 'int_wall4'], SHABBY_TOP = ['int_wall2', 'int_wall0', 'int_wall3', 'int_wall1', 'int_wall5', 'int_wall2', 'int_wall0', 'int_wall3'];
const CLEAN_FACE = ['int_wall0', 'int_wall0', 'int_wall1', 'int_wall0'], CLEAN_TOP = ['int_wall0', 'int_wall1', 'int_wall0', 'int_wall0'];
const isFace = (c, r) => !isFloor(c, r) && isFloor(c, r + 1);
const nearFloor = (c, r) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (isFloor(c + a, r + b)) return true; return false; };
const WALLC = '#3c3c36', WALLHI = '#56564e', WALLMASS = '#2c2a26';
function drawInterior() {
  gridLoad(); g.fillStyle = '#0c0b10'; g.fillRect(0, 0, VW, VH); g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); g.imageSmoothingEnabled = false;
  const cA = Math.max(0, Math.floor((cam.x - GX) / IT) - 1), cB = Math.min(GC - 1, Math.ceil((cam.x + VW - GX) / IT) + 1), rA = Math.max(0, Math.floor((cam.y - GY) / IT) - 1), rB = Math.min(GR - 1, Math.ceil((cam.y + VH - GY) / IT) + 1);
  const shabbyWall = (c, r) => !fixed('walls') && inMain(c, r + 1 + (isFloor(c, r + 1) ? 0 : 1));
  for (let r = rA; r <= rB; r++) for (let c = cA; c <= cB; c++) {
    const ch = gAt(c, r), x = cellX(c), y = cellY(r);
    if (isFloorCh(ch)) {                                                          // each tile is wood, stone or dark oak; the 2x2 pictures are cut in quarters
      const lc = ch.toLowerCase(), p = inImg(lc === 's' ? 'int_floor_stone' : 'int_floor_wood'), qi = ((c - GMC) % 2 + 2) % 2, qj = ((r - GMR) % 2 + 2) % 2;
      if (p) g.drawImage(p[0], qi * IT, qj * IT, IT, IT, x, y, IT, IT); if (lc === 'd') { g.fillStyle = 'rgba(38,18,8,.45)'; g.fillRect(x, y, IT, IT); }
      if (inMain(c, r)) { if (!fixed('floor') && lc !== 's') { g.fillStyle = 'rgba(40,26,14,.34)'; g.fillRect(x, y, IT, IT); } else if (fixed('floor')) { g.fillStyle = 'rgba(255,200,120,.06)'; g.fillRect(x, y, IT, IT); } }
    } else if ((isFloor(c - 1, r) && isFloor(c + 1, r)) || (isFloor(c, r - 1) && isFloor(c, r + 1)) || (isFloor(c - 1, r) + isFloor(c + 1, r) + isFloor(c, r - 1) + isFloor(c, r + 1) >= 2)) { g.fillStyle = WALLMASS; g.fillRect(x, y, IT, IT); }   // the top of a wall between two floors
  }
  if (!fixed('floor')) { g.save(); g.beginPath(); for (let r = GMR; r < GMR + IROWS; r++) for (let c = GMC; c < GMC + ICOLS; c++) if (isFloor(c, r) && gAt(c, r).toLowerCase() !== 's') g.rect(cellX(c), cellY(r), IT, IT); g.clip();
    IN_GRIME.forEach(([x, y, s, v]) => { g.fillStyle = v < 0.6 ? 'rgba(30,20,10,.28)' : 'rgba(70,90,40,.18)'; g.beginPath(); g.ellipse(x, y, s, s * 0.6, 0, 0, 7); g.fill(); }); g.restore(); }
  HOME.placed.in.forEach(p => { if (catItem(p.id).flat) drawPlaced(p); });                // rugs and other flat things lie on the floor
  if (isFloor(14, 10) && isFloor(15, 10)) inDraw('int_hatch', IFX1 - 95, IFY1 - 56);
  for (let r = rA; r <= rB; r++) for (let c = cA; c <= cB; c++) {                     // wall faces: the face above a floor tile, and the top course above it
    if (!isFace(c, r)) continue; const x = cellX(c), y = cellY(r), sh = shabbyWall(c, r), main = r === GMR - 1 && c >= GMC && c < GMC + ICOLS, i = (c * 7 + r * 13) % 4;
    const win = WINDOWS.some(([a, b]) => a === c && b === r);
    const face = win ? 'int_window' : main && sh ? SHABBY_FACE[c - GMC] : main ? ['int_wall0', 'int_wall0', 'int_window', 'int_wall1', 'int_wall0', 'int_wall0', 'int_wall0', 'int_wall0'][c - GMC] : sh ? SHABBY_FACE[(c + r) % 8 === 2 ? 0 : (c + r) % 8] : CLEAN_FACE[i];
    inDraw(face, x, y, IT, IT);
    const top = !isFloor(c, r - 1) && r > 0; if (top) inDraw(main && sh ? SHABBY_TOP[c - GMC] : main ? ['int_wall0', 'int_wall1', 'int_wall0', 'int_wall0', 'int_wall1', 'int_wall0', 'int_wall0', 'int_wall1'][c - GMC] : sh ? SHABBY_TOP[(c * 3 + r) % 8] : CLEAN_TOP[i], x, y - IT, IT, IT);
    const capY = top ? y - IT : y; g.fillStyle = WALLC; g.fillRect(x - (isFace(c - 1, r) ? 0 : ISW), capY - 12, IT + (isFace(c - 1, r) ? 0 : ISW) + (isFace(c + 1, r) ? 0 : ISW), 12); g.fillStyle = WALLHI; g.fillRect(x - (isFace(c - 1, r) ? 0 : ISW), capY - 12, IT + (isFace(c - 1, r) ? 0 : ISW) + (isFace(c + 1, r) ? 0 : ISW), 3);
    const gr = g.createLinearGradient(0, y + IT, 0, y + IT + 22); gr.addColorStop(0, 'rgba(8,6,12,.55)'); gr.addColorStop(1, 'rgba(8,6,12,0)'); g.fillStyle = gr; g.fillRect(x, y + IT, IT, 22);   // its shadow on the floor
  }
  if (isFace(BACKDOOR[0], BACKDOOR[1])) inDraw('int_door', cellX(BACKDOOR[0]) + IT / 2 - 42, cellY(BACKDOOR[1] + 1) - 84, 85, 84);   // the back door, full height
  if (isFace(10, 6)) { const winX = cellX(10) + IT / 2, beam = fixed('sweep') ? 0.12 : 0.06;           // daylight through the barred window
    g.fillStyle = `rgba(255,238,190,${beam})`; g.beginPath(); g.moveTo(winX - 10, IRY + IT + 36); g.lineTo(winX + 10, IRY + IT + 36); g.lineTo(winX + 60, IFY1 - 40); g.lineTo(winX - 4, IFY1 - 40); g.closePath(); g.fill(); }
  const list = IN_ITEMS.map(o => ({ y: sortKey({ k: o.k, x: o.x, y: o.y, ex: 2 }), f: () => { const p = inImg(o.k); if (!p) return; shadow(o.x + 3, o.y - 1, p[1].w * 0.36); g.drawImage(p[0], Math.round(o.x - p[1].w / 2), Math.round(o.y - p[1].h + 2)); } }));
  HOME.placed.in.forEach(p => { if (!catItem(p.id).flat) list.push({ y: pSortKey(p), f: () => drawPlaced(p) }); });
  list.push({ y: COZY.sit ? COZY.sit.p.y + 0.5 : P.y, f: drawCoon }); drawOthers(list);
  for (let r = rA; r <= rB; r++) for (let c = cA; c <= cB; c++) if (isFloor(c, r) && !isFloor(c, r + 1)) {   // front walls (thin: you see over them), drawn in front of what stands behind
    const x = cellX(c), y = cellY(r + 1), l = isFloor(c - 1, r) && !isFloor(c - 1, r + 1) ? 0 : ISW, rr = isFloor(c + 1, r) && !isFloor(c + 1, r + 1) ? 0 : ISW;
    list.push({ y, f: () => {
      const seg = (x0, x1) => { if (x1 <= x0) return; g.fillStyle = WALLC; g.fillRect(x0, y, x1 - x0, ISW); g.fillStyle = WALLHI; g.fillRect(x0, y, x1 - x0, 3); };
      if (r === 10 && (c === 11 || c === 12)) {                                  // the front door: a gap with daylight and a doormat
        if (c === 11) { seg(x - l, ICX - IGAP); g.fillStyle = 'rgba(255,230,170,.22)'; g.fillRect(ICX - IGAP, y, IGAP * 2, ISW + 10); g.fillStyle = '#6a5030'; g.fillRect(ICX - 20, y - 10, 40, 8); } else seg(ICX + IGAP, x + IT + rr);
      } else seg(x - l, x + IT + rr);
    } });
  }
  list.sort((a, b) => a.y - b.y).forEach(i => i.f());
  for (let r = rA; r <= rB; r++) for (let c = cA; c <= cB; c++) {                     // side walls, beside the floor and beside each wall face
    const fl = isFloor(c, r), fc = isFace(c, r); if (!fl && !fc) continue; const x = cellX(c), y = cellY(r) - (fc && !isFloor(c, r - 1) && r > 0 ? IT + 12 : fc ? 12 : 0), h = cellY(r + 1) - y + (fl && !isFloor(c, r + 1) ? ISW : 0);
    for (const sd of [-1, 1]) { const nf = isFloor(c + sd, r), nface = isFace(c + sd, r); if (fl ? nf : (nf || nface)) continue; const sx = sd < 0 ? x - ISW : x + IT;
      g.fillStyle = WALLC; g.fillRect(sx, y, ISW, h); g.fillStyle = WALLHI; g.fillRect(sd < 0 ? x - 3 : x + IT, y + 3, 3, h - 3); }
  }
  if (!fixed('sweep')) {                                                          // cobwebs in the first room's top corners, dust in the air
    g.strokeStyle = 'rgba(230,230,240,.45)'; g.lineWidth = 1; [[IFX0, IRY, 1], [IFX1, IRY, -1]].forEach(([cx, cy, s]) => { for (let i = 1; i <= 4; i++) { g.beginPath(); g.moveTo(cx + s * i * 9, cy); g.quadraticCurveTo(cx + s * i * 5, cy + i * 5, cx, cy + i * 9); g.stroke(); }
      for (let a = 0; a < 4; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + s * Math.cos(a * 0.45) * 40, cy + Math.sin(a * 0.45) * 40); g.stroke(); } });
    g.fillStyle = 'rgba(240,230,200,.35)'; for (let i = 0; i < 18; i++) { const x = IFX0 + ((i * 97 + t * 6) % (IFX1 - IFX0)), y = IRY + 40 + ((i * 53 + Math.sin(t + i) * 8) % (IFY1 - IRY - 60)); g.fillRect(x, y, 2, 2); }
  }
  const dark = 0.5 - (fixed('sweep') ? 0.08 : 0) - (fixed('floor') ? 0.08 : 0) - (fixed('walls') ? 0.08 : 0), lx = cam.x + VW / 2, ly = cam.y + VH / 2, vg = g.createRadialGradient(lx, ly, 80, lx, ly, Math.max(VW, VH) * 0.62);
  vg.addColorStop(0, 'rgba(10,8,20,0)'); vg.addColorStop(1, `rgba(10,8,20,${dark})`); g.fillStyle = vg; g.fillRect(cam.x, cam.y, VW, VH);
  if (homeNear && !BUILD.on) { const o = homeNear, txt = (isTouch ? 'Tap Act: ' : 'E: ') + o.tip; g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 20, x = o.x - w / 2, y = o.y - o.h - 22; g.fillStyle = 'rgba(10,24,40,.88)'; g.fillRect(x, y, w, 24); g.fillStyle = '#ffd23f'; g.fillRect(x, y, 3, 24); g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, o.x, y + 12.5); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
  drawCozyOver(); drawBuildOverlay(); drawFx(); drawPops(false); g.restore();
  drawHomeHud(); drawVisitHud(); drawBuildHud(); buildBarTick(); updateTouchUi(); tipTick(); drawTip(); drawSpeaker(); drawPause();
}
function inCam(dt, snap) {                                                          // inside, the camera follows you (or the build cursor) but stays on the house
  const B = gridBox(), fx = BUILD.on ? BUILD.cx : P.x, fy = BUILD.on ? BUILD.cy + 40 : P.y, pad = 90;
  const span = (lo, hi, v, view) => hi - lo + 2 * pad <= view ? (lo + hi) / 2 - view / 2 : clampN(v - view / 2, lo - pad, hi + pad - view);
  const tx = span(B.x0, B.x1, fx, VW), ty = span(B.y0 - IT * 2, B.y1 + (BUILD.on ? 90 : 20), fy - 30, VH), f = snap ? 1 : Math.min(1, dt * 6);
  if (BUILD.on && BUILD.mouse && !snap) return; cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f;
}
const _followCamOut = followCam;
followCam = function (dt) { if (HOME_IN && state === 'home') return inCam(dt); return _followCamOut(dt); };
