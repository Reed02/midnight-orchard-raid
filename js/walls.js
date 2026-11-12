/* ===== THE COTTAGE WALLS, WINDOWS, AND DAY AND NIGHT AT HOME =====
   WALLS: in build mode (cottage, Floor & walls tab) the wall brushes paint a wall tile (its face and the course above it): plain PAINT colours
     (WALLPAINT, drawn here with a skirting board), or WALLPAPER and textures (WALLTEX, art/home/wall_<id>.png, unlocked in the shop). The
     Natural-wall brush takes it back to stone. Saved in HOME.wallp { "c,r": id }.
   WINDOWS: the Window brushes put a window in a wall tile (or take it out again, the same brush on the same tile): the old barred one and
     WINSTYLES (art/home/win_<id>.png, drawn over the paint). The starting windows are ordinary windows now. HOME.win { "c,r": style }.
   WALL HANGINGS: pictures, shelves, wreaths... (HANGS, art/home/hang_<id>.png) hang on a wall tile; offered once their art exists.
   TIME: home now follows the same clock as the Wilds (HOME.wild.clock, 0 = 6 am; a day is DAY_SEC): it runs while you are at home, the
     yard is tinted by it (homeTint), and in the cottage the night comes in: the room darkens, lamps, candles, the fire and the stove glow,
     and the windows let in sunlight by day and moonlight by night. Sleeping in a bed sets the clock (cozy.js). */
const WALLPAINT = [
  { id: 'p_cream', name: 'Cream paint', col: '#e6d8b8' }, { id: 'p_white', name: 'White paint', col: '#eeeae2' }, { id: 'p_sage', name: 'Sage paint', col: '#a3b893' },
  { id: 'p_sky', name: 'Sky blue paint', col: '#9fc2d8' }, { id: 'p_rose', name: 'Rose paint', col: '#d8a6a4' }, { id: 'p_ochre', name: 'Ochre paint', col: '#d4a752' },
  { id: 'p_plum', name: 'Plum paint', col: '#8c6c8e' }, { id: 'p_char', name: 'Charcoal paint', col: '#4c4c54' }];
const WALLTEX = [
  { id: 'plaster', name: 'Plaster', price: 60 }, { id: 'stripe', name: 'Striped wallpaper', price: 120 }, { id: 'floral', name: 'Floral wallpaper', price: 160 },
  { id: 'panel', name: 'Wood panelling', price: 140 }, { id: 'timber', name: 'Timber frame', price: 140 }, { id: 'log', name: 'Log wall', price: 120 },
  { id: 'brick', name: 'Brick wall', price: 150 }, { id: 'tiles', name: 'Kitchen tiles', price: 180 }];
const WINSTYLES = [{ id: 'barred', name: 'Small window', key: 'int_window', glass: [16, 12, 24, 22] }, { id: 'round', name: 'Round window', glass: [16, 12, 24, 24] },
  { id: 'tall', name: 'Tall window', glass: [19, 7, 18, 38] }, { id: 'shutter', name: 'Shuttered window', glass: [21, 13, 14, 26] }, { id: 'stained', name: 'Stained glass', glass: [17, 6, 22, 33] },
  { id: 'wide', name: 'Wide window', glass: [7, 15, 42, 22] }, { id: 'arched', name: 'Arched window', glass: [14, 8, 28, 36], art: 1 },
  { id: 'cottage', name: 'Cottage window', glass: [12, 10, 32, 30], art: 1 }, { id: 'attic', name: 'Little attic window', glass: [18, 14, 20, 22], art: 1 }];
const winReady = q => !q.art || !!HOME_SRC['win_' + q.id];             // the extra styles from the window sheet show once drawn
const WIN_COST = { apples: 25, jar: 1 }, PAINT_COST = 2, TEX_COST = 3;
const HANGS = [{ id: 'landscape', name: 'Landscape painting', price: 90 }, { id: 'portrait', name: 'Raccoon portrait', price: 120 }, { id: 'shelf', name: 'Wall shelf', price: 70 },
  { id: 'wreath', name: 'Wreath', price: 50 }, { id: 'mirror', name: 'Round mirror', price: 110 }, { id: 'bunting', name: 'Bunting', price: 40 }, { id: 'map', name: 'Old map', price: 100 },
  { id: 'basket', name: 'Hanging plant', price: 60 }];
const hangReady = h => !!HOME_SRC['hang_' + h.id] && !(HOME_SRC['hang_' + h.id].ph);
const wkey = (c, r) => c + ',' + r;
function wallsLoad() {
  HOME.wallp = HOME.wallp && typeof HOME.wallp === 'object' ? HOME.wallp : {}; HOME.hang = HOME.hang && typeof HOME.hang === 'object' ? HOME.hang : {};
  if (!HOME.win || typeof HOME.win !== 'object') { HOME.win = {}; WINDOWS.forEach(([c, r]) => { HOME.win[wkey(c, r)] = 'barred'; }); }       // the starting windows
}
const winStyle = (c, r) => { if (typeof HIDE !== 'undefined' && HIDE) return null; if (!HOME.win) wallsLoad(); return HOME.win[wkey(c, r)] || null; };
/* ----- drawing a wall tile (called from interior.js wallFace) ----- */
const PAINTCV = {};
function paintTile(col, top) {                                       // a plaster face in this colour: soft speckle, a picture rail and (on the face) a skirting board
  const k = col + (top ? 't' : 'f'); if (PAINTCV[k]) return PAINTCV[k]; const c = document.createElement('canvas'); c.width = c.height = IT; const x = c.getContext('2d'), r = hrng(col.length * 31 + (top ? 7 : 3));
  x.fillStyle = col; x.fillRect(0, 0, IT, IT);
  for (let i = 0; i < 160; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)'; x.fillRect(Math.floor(r() * IT), Math.floor(r() * IT), 1, 1); }
  if (top) { x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, 0, IT, IT); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, IT - 3, IT, 3); }
  else { x.fillStyle = '#5a3c26'; x.fillRect(0, IT - 9, IT, 9); x.fillStyle = '#7a5434'; x.fillRect(0, IT - 9, IT, 2); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 0, IT, 4); }
  return (PAINTCV[k] = c);
}
function texTile(id, top) {                                          // a wallpaper / texture tile, darker on the top course, a skirting board on the face
  const k = 'tx:' + id + (top ? 't' : 'f'); if (PAINTCV[k]) return PAINTCV[k]; const im = homeImg('wall_' + id); if (!im || !im.complete || !im.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = c.height = IT; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, IT, IT);
  if (top) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, 0, IT, IT); } else if (id !== 'log' && id !== 'brick') { x.fillStyle = '#5a3c26'; x.fillRect(0, IT - 9, IT, 9); x.fillStyle = '#7a5434'; x.fillRect(0, IT - 9, IT, 2); }
  return (PAINTCV[k] = c);
}
function finishTile(id, top) { const p = WALLPAINT.find(q => q.id === id); if (p) return paintTile(p.col, top); return texTile(id, top); }
/* Things built into the old stone wall (the back door, the barred windows) keep their own frame but lose the stone round it once the
   wall behind them is painted or papered, so the new wall shows round them instead of a patch of stone. */
const BUILTIN = {};
function builtinCut(key, keep) {                                      // the picture with everything outside keep [x0, y0, x1, y1] cleared, and a wooden trim round what is left
  if (BUILTIN[key]) return BUILTIN[key]; const im = homeImg(key); if (!im || !im.complete || !im.naturalWidth) return null;
  const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, W, H), p = d.data, [x0, y0, x1, y1] = keep;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (xx < x0 || xx > x1 || yy < y0 || yy > y1) p[(yy * W + xx) * 4 + 3] = 0;
  const op = i => p[i * 4 + 3] > 40, ring = [];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const i = yy * W + xx; if (op(i)) continue;
    if ((xx > 0 && op(i - 1)) || (xx < W - 1 && op(i + 1)) || (yy > 0 && op(i - W)) || (yy < H - 1 && op(i + W))) ring.push(i); }
  ring.forEach(i => { p[i * 4] = 74; p[i * 4 + 1] = 50; p[i * 4 + 2] = 32; p[i * 4 + 3] = 255; });
  x.putImageData(d, 0, 0); return (BUILTIN[key] = c);
}
const DOOR_KEEP = [11, 0, 41, 51], BARRED_KEEP = [17, 11, 38, 37];
const wallDone = (c, r) => !!(HOME.wallp && HOME.wallp[wkey(c, r)] && !(typeof HIDE !== 'undefined' && HIDE));
function drawBackDoor(x, y, w, h) {                                   // called by interior.js: false = draw the old stone door as before
  if (!wallDone(BACKDOOR[0], BACKDOOR[1])) return false; const cut = builtinCut('int_door', DOOR_KEEP); if (!cut) return false;
  g.drawImage(cut, Math.round(x), Math.round(y), w, h); return true;
}
function wallFinish(c, r, x, y, top, win) {
  const id = HOME.wallp && HOME.wallp[wkey(c, r)]; if (!id) return false; const f = finishTile(id, false); if (!f) return false;
  g.drawImage(f, x, y); if (top) { const tt = finishTile(id, true); if (tt) g.drawImage(tt, x, y - IT); }
  if (win) { const cut = builtinCut('int_window', BARRED_KEEP); if (cut) g.drawImage(cut, x, y, IT, IT); else inDraw('int_window', x, y, IT, IT); }
  return true;
}
const WINNIGHT = {};
function winNight(key) {                                             // the window at night: its glass (the pale blue / bright pixels) turned to a dark night sky with a glint
  if (WINNIGHT[key] !== undefined) return WINNIGHT[key]; const im = homeImg(key); if (!im || !im.complete || !im.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 10) continue; const r = p[i], g2 = p[i + 1], b = p[i + 2], lum = r * 0.3 + g2 * 0.59 + b * 0.11;
    if (b > r + 18 && b > g2 - 4 && lum > 100) {                                 // pale blue glass only (not white frames or lace)
      const k = ((i / 4) % 7 === 0 && Math.random() < 0.08) ? 1 : 0; p[i] = k ? 230 : 22; p[i + 1] = k ? 236 : 30; p[i + 2] = k ? 255 : 66; } else p[i + 3] = 0; }
  x.putImageData(d, 0, 0); return (WINNIGHT[key] = c);
}
function wallExtras(c, r, x, y, wst) {
  if (wst) { const W = WINSTYLES.find(q => q.id === wst), key = W && W.key ? W.key : 'win_' + wst, im = homeImg(key);
    if (wst !== 'barred' && im && im.complete && im.naturalWidth) g.drawImage(im, x, y, IT, IT);
    const n = nightness(), nv = n > 0.05 && winNight(key); if (nv) { g.save(); g.globalAlpha = n; g.drawImage(nv, x, y, IT, IT); g.restore(); } }      // the glass goes dark at night
  const h = HOME.hang && HOME.hang[wkey(c, r)]; if (h) { const im = homeImg('hang_' + h), a = HOME_SRC['hang_' + h]; if (im && a && im.complete && im.naturalWidth) g.drawImage(im, Math.round(x + IT / 2 - a.w / 2), Math.round(y + IT / 2 - a.h / 2 - 4), a.w, a.h); }
}
/* ----- the clock ----- */
const homeClock = () => { if (typeof wildLoad !== 'function') return 0.3; if (!HOME.wild || typeof HOME.wild.clock !== 'number') wildLoad(); return HOME.wild.clock; };
const homeHour = () => (homeClock() * 24 + 6) % 24;
function nightness() {                                              // 0 in full day, 1 in the middle of the night (dusk and dawn in between)
  const h = homeHour(); if (h >= 7.5 && h <= 18) return 0; if (h > 18 && h < 21) return (h - 18) / 3; if (h > 5 && h < 7.5) return (7.5 - h) / 2.5; return 1;
}
homeTint = function () {                                            // the yard's sky follows the clock now (the same one as the Wilds)
  const h = homeHour(), lerp = (a, b, u) => a + (b - a) * u, mix = (c1, c2, u) => c1.map((v, i) => lerp(v, c2[i], u));
  const stops = [[0, [10, 18, 56, 0.5]], [5, [12, 20, 60, 0.48]], [6.5, [255, 160, 130, 0.18]], [8.5, [255, 230, 190, 0.0]], [17, [255, 230, 190, 0.0]], [19, [255, 136, 70, 0.2]], [21, [22, 30, 80, 0.42]], [24, [10, 18, 56, 0.5]]];
  for (let i = 0; i < stops.length - 1; i++) if (h >= stops[i][0] && h <= stops[i + 1][0]) return mix(stops[i][1], stops[i + 1][1], (h - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
  return [0, 0, 0, 0];
};
function tickHomeClock(dt) {
  if (isVisiting() || (typeof HIDE !== 'undefined' && HIDE) || typeof wildLoad !== 'function' || COZY.sleep) return; homeClock(); const w = HOME.wild; w.clock += dt / DAY_SEC;
  if (w.clock >= 1) { w.clock -= 1; w.day++; w.picked = {}; pop(P.x, P.y - 100, 'A new day dawns (day ' + w.day + ')', '#ffe9a8', true); homeSave(); }
}
const _updateHomeW = updateHome; updateHome = function (dt) { _updateHomeW(dt); if (state === 'home' && !BUILD.on) tickHomeClock(dt); };
const _updateInteriorW = updateInterior; updateInterior = function (dt) { _updateInteriorW(dt); if (state === 'home' && !BUILD.on) tickHomeClock(dt); };
/* ----- night in the cottage: darkness with pools of lamp light, and light through the windows ----- */
const LIGHTS = { lantern: [80, '255,190,110'], floorlamp: [120, '255,206,140'], fireplace: [170, '255,150,70'], stove: [90, '255,140,60'], jacklantern: [70, '255,150,60'], desk: [80, '255,210,150'],
  sidetable: [60, '255,200,130'], piano: [50, '255,210,150'], honeyshelf: [40, '255,200,90'], wallclock: [0, ''] };
let COTNIGHT = null;
function drawCottageLight() {
  if (!HOME_IN || (typeof HIDE !== 'undefined' && HIDE)) return; const n = nightness(), day = 1 - n;
  const wins = []; for (const k in (HOME.win || {})) { const [c, r] = k.split(',').map(Number); if (isFace(c, r)) wins.push([c, r]); }
  g.save(); g.globalCompositeOperation = 'lighter';                   // light coming in through every window: warm by day, a faint blue by night
  wins.forEach(([c, r]) => { const wx = cellX(c) + IT / 2, top = cellY(r + 1), len = IT * 2.2, a = day > 0.05 ? 0.1 * day : 0.06 * n, col = day > 0.05 ? '255,236,190' : '150,170,255';
    const gr = g.createLinearGradient(0, top, 0, top + len); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr;
    g.beginPath(); g.moveTo(wx - 14, top); g.lineTo(wx + 14, top); g.lineTo(wx + 40, top + len); g.lineTo(wx - 20, top + len); g.closePath(); g.fill(); });
  g.restore();
  if (n < 0.03) return;
  if (!COTNIGHT) COTNIGHT = document.createElement('canvas'); if (COTNIGHT.width !== VW || COTNIGHT.height !== VH) { COTNIGHT.width = VW; COTNIGHT.height = VH; }
  const x = COTNIGHT.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, VW, VH); x.fillStyle = `rgba(8,10,34,${0.6 * n})`; x.fillRect(0, 0, VW, VH);
  const lights = []; (HOME.placed.in || []).forEach(p => { const L = LIGHTS[p.id]; if (L && L[0]) lights.push([p.x, p.y - 20, L[0], L[1]]); });
  wins.forEach(([c, r]) => lights.push([cellX(c) + IT / 2, cellY(r + 1) + 20, 46, '150,170,255', 0.35]));
  x.globalCompositeOperation = 'destination-out';
  lights.forEach(([lx, ly, rad, , k]) => { const fl = 1 + Math.sin(t * 7 + lx) * 0.03, gr = x.createRadialGradient(lx - cam.x, ly - cam.y, 4, lx - cam.x, ly - cam.y, rad * fl); gr.addColorStop(0, `rgba(0,0,0,${k || 0.95})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(lx - cam.x - rad * 1.1, ly - cam.y - rad * 1.1, rad * 2.2, rad * 2.2); });
  g.drawImage(COTNIGHT, cam.x, cam.y);
  g.save(); g.globalCompositeOperation = 'lighter';                   // and a warm glow from each lamp
  lights.forEach(([lx, ly, rad, col, k]) => { if (k) return; const gr = g.createRadialGradient(lx, ly, 2, lx, ly, rad * 0.7); gr.addColorStop(0, `rgba(${col},${0.22 * n})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(lx - rad, ly - rad, rad * 2, rad * 2); });
  g.restore();
}
const _drawCozyOverW = drawCozyOver; drawCozyOver = function () { drawCottageLight(); return _drawCozyOverW(); };
/* ----- build mode: the wall brushes (cottage, Floor & walls tab) ----- */
function faceAt(x, y) { let [c, r] = cellOf(x, y); if (isFace(c, r)) return [c, r]; if (isFace(c, r + 1)) return [c, r + 1]; return null; }
const _barSlotsW = barSlots;
barSlots = function () {
  const s = _barSlotsW(); if (!HOME_IN || HIDE || isVisiting()) return s; wallsLoad();
  s.push({ id: 'w_stone', wb: 'stone', name: 'Natural wall: take paint or paper off', icon: wbIcon('stone') });
  WALLPAINT.forEach(p => s.push({ id: 'w_' + p.id, wb: p.id, name: p.name + ' (' + PAINT_COST + ' apples a tile)', icon: wbIcon(p.id) }));
  WALLTEX.forEach(q => { const own = HOME.unlock['wall_' + q.id]; s.push({ id: 'w_' + q.id, wb: q.id, name: q.name + (own ? ' (' + TEX_COST + ' apples a tile)' : ': click to unlock it in the Shop (' + q.price + ' apples)'), icon: wbIcon(q.id), locked: !own, tag: own ? '' : q.price }); });
  WINSTYLES.filter(winReady).forEach(q => s.push({ id: 'w_win_' + q.id, wb: 'win:' + q.id, name: q.name + ': click a wall to put one in (25 apples, a glass jar), again to take it out', icon: (HOME_SRC[q.key || 'win_' + q.id] || {}).src || wbIcon('win:' + q.id) }));
  HANGS.filter(hangReady).forEach(q => s.push({ id: 'w_hang_' + q.id, wb: 'hang:' + q.id, name: q.name + ' (' + q.price + ' apples): click a wall to hang it, again to take it down', icon: HOME_SRC['hang_' + q.id].src, tag: q.price }));
  return s;
};
const WBICON = {};
function wbIcon(id) {
  if (WBICON[id]) return WBICON[id]; const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (id === 'stone') { const im = homeImg('int_wall0'); if (im && im.complete && im.naturalWidth) x.drawImage(im, 0, 0, 40, 40); else return HOME_SRC.int_wall0 ? HOME_SRC.int_wall0.src : ''; }
  else if (id.startsWith('win:')) { const st = id.slice(4), W = WINSTYLES.find(q => q.id === st), im = homeImg(W.key || 'win_' + st); x.fillStyle = '#b8a888'; x.fillRect(0, 0, 40, 40); if (im && im.complete && im.naturalWidth) x.drawImage(im, 0, 0, 40, 40); else return ''; }
  else { const f = finishTile(id, false); if (!f) return ''; x.drawImage(f, 0, 0, 40, 40); }
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.strokeRect(0.5, 0.5, 39, 39); return (WBICON[id] = c.toDataURL());
}
function pickWall(id) {
  if (BUILD.held) storeHeld(); BUILD.gbrush = null; BUILD.brush = null; BUILD.tool = null;
  const tex = WALLTEX.find(q => q.id === id); if (tex && !HOME.unlock['wall_' + id]) return say(tex.name + ': unlock it in the Shop (' + tex.price + ' apples)');
  BUILD.wbrush = id; BUILD.tab = wbTab(id); renderBar(); say(id.startsWith('win:') ? 'Click a wall to put a window in (or take one out)' : id.startsWith('hang:') ? 'Click a wall to hang it (again to take it down)' : 'Click a wall to paint it' + (isTouch ? '' : ' (drag along a wall to do more)'));
}
function wallAct(x, y, drag) {
  const f = faceAt(x, y); if (!f) return drag ? null : say('Point at a wall'); const [c, r] = f, k = wkey(c, r), id = BUILD.wbrush; wallsLoad();
  if (c === BACKDOOR[0] && r === BACKDOOR[1] && !id.startsWith('p_') && WALLTEX.every(q => q.id !== id) && id !== 'stone') return drag ? null : say('That is the back door');
  if (id.startsWith('win:')) { if (drag) return; const st = id.slice(4);
    if (HOME.win[k] === st) { delete HOME.win[k]; homeSave(); return say('Window taken out'); }
    if (HOME.hang[k]) return say('Take the ' + HANGS.find(q => q.id === HOME.hang[k]).name.toLowerCase() + ' down first');
    if (!HOME.win[k] && !spendAll(WIN_COST)) return say('A window costs 25 apples and a glass jar'); HOME.win[k] = st; homeSave(); return say(WINSTYLES.find(q => q.id === st).name + ' put in'); }
  if (id.startsWith('hang:')) { if (drag) return; const h = id.slice(5), H = HANGS.find(q => q.id === h);
    if (HOME.hang[k] === h) { delete HOME.hang[k]; HOME.apples += Math.floor(H.price / 2); homeSave(); return say(H.name + ' taken down (half its price back)'); }
    if (HOME.win[k]) return say('There is a window there'); if (HOME.hang[k]) return say('Something already hangs there');
    if (!spendApples(H.price)) return say(H.name + ' costs ' + H.price + ' apples'); HOME.hang[k] = h; homeSave(); return say(H.name + ' hung up'); }
  if (id === 'stone') { if (HOME.wallp[k]) { delete HOME.wallp[k]; homeSave(); } return; }
  if (HOME.wallp[k] === id) return; const cost = WALLPAINT.some(p => p.id === id) ? PAINT_COST : TEX_COST; if (!spendApples(cost)) return say('Not enough apples (' + cost + ' a tile)');
  HOME.wallp[k] = id; homeSave();
}
const _buildActW = buildAct; buildAct = function () { if (HOME_IN && BUILD.wbrush && !BUILD.held) return wallAct(BUILD.cx, BUILD.cy); return _buildActW(); };
['pickFromStore', 'pickBrush', 'pickTool'].forEach(fn => { const o = window[fn]; window[fn] = function (...a) { BUILD.wbrush = null; return o.apply(this, a); }; });
const _buildToggleW = buildToggle; buildToggle = function (on) { BUILD.wbrush = null; return _buildToggleW(on); };
const _buildStoreW = buildStore; buildStore = function () { if (BUILD.wbrush) { BUILD.wbrush = null; return renderBar(); } return _buildStoreW(); };
cv.addEventListener('pointerdown', e => { if (state === 'home' && BUILD.on && HOME_IN && BUILD.wbrush && e.pointerType === 'mouse') YARD.wpaint = true; }, true);
window.addEventListener('pointerup', () => { YARD.wpaint = false; });
cv.addEventListener('pointermove', e => { if (YARD.wpaint && state === 'home' && BUILD.on && HOME_IN && BUILD.wbrush && (e.buttons & 1)) { const p = pt(e); wallAct(p.x + cam.x, p.y + cam.y, true); } });
const _drawBuildOverlayW = drawBuildOverlay;
drawBuildOverlay = function () {
  _drawBuildOverlayW(); if (!BUILD.on || !HOME_IN || !BUILD.wbrush) return; const f = faceAt(BUILD.cx, BUILD.cy); g.save();
  if (f) { const [c, r] = f, top = !isFloor(c, r - 1) && r > 0, x = cellX(c), y = cellY(r); g.strokeStyle = '#7dff8e'; g.lineWidth = 2; g.strokeRect(x + 1, (top ? y - IT : y) + 1, IT - 2, (top ? IT * 2 : IT) - 2); }
  g.restore();
};
const _drawBuildHudW = drawBuildHud;
drawBuildHud = function () {
  if (BUILD.on && HOME_IN && BUILD.wbrush && !(t < BUILD.msgT)) { const f = faceAt(BUILD.cx, BUILD.cy), id = BUILD.wbrush;
    const nm = id === 'stone' ? 'Natural wall' : id.startsWith('win:') ? WINSTYLES.find(q => q.id === id.slice(4)).name : id.startsWith('hang:') ? HANGS.find(q => q.id === id.slice(5)).name : (WALLPAINT.find(q => q.id === id) || WALLTEX.find(q => q.id === id)).name;
    BUILD.msg = nm + ': ' + (f ? (isTouch ? 'tap the wall' : 'E or click') : 'point at a wall'); BUILD.msgT = t + 0.05; }
  _drawBuildHudW();
};
/* the bar (buildui.js) shows the wall brushes in the Floor & walls tab */
const _barSigW = barSig; barSig = function () { return _barSigW() + '|' + BUILD.wbrush; };
/* shop: wallpaper unlocks in the cottage shop's Floors category */
const _buildShopW = buildShop;
buildShop = function (tab, cat) {
  _buildShopW(tab, cat); if (!HOME_IN || HIDE || shopTab !== 'buy' || !['All', 'Walls'].includes(shopCatSel)) return; const grid = document.querySelector('#ov .shop2'); if (!grid) return;
  grid.insertAdjacentHTML('beforeend', WALLTEX.map(q => { const own = HOME.unlock['wall_' + q.id]; return shopCard(`buyWallTex('${q.id}')`, wbIcon(q.id), q.name, own ? 'Unlocked: ' + TEX_COST + ' a tile' : costHtml({ apples: q.price }), { disabled: own || HOME.apples < q.price, dim: own, badge: own ? '&#10003;' : '', title: q.name + ' for the wall brushes' }); }).join(''));
};
function buyWallTex(id) { const q = WALLTEX.find(w => w.id === id); if (!q || HOME.unlock['wall_' + id] || !spendApples(q.price)) return buildShop('buy'); HOME.unlock['wall_' + id] = 1; homeSave(); try { sfxPlay('gold'); } catch (e) {} buildShop('buy'); }
const _normalizeBaseW = typeof normalizeBase === 'function' ? normalizeBase : null;
if (_normalizeBaseW) normalizeBase = function () { _normalizeBaseW(); wallsLoad(); if (typeof placedSettle === 'function') placedSettle(); };
wallsLoad();
