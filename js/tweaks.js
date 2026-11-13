/* ===== SMALL BUILD-MODE HELPERS =====
   REACH: how far each garden helper works (the same distances yard.js uses), shown on shop cards and, in build mode, as a dashed ring round
   the helper you hold or point at (and faint rings round the ones of that kind already placed).
   FENCES: fences, stone walls and hedges snap edge to edge onto one already placed (same way round), so a row joins up with no gap; they may
   also touch or overlap each other (build.js whyNot).
   DRAG TO PAINT: an option on the bar (BUILD.dragPaint, remembered per browser). Off: each click or tap paints one tile. On: press and drag
   to paint every tile you pass over, with a mouse or a finger. */
const REACH = { compost: STATION_R, rainbarrel: STATION_R, scarecrow: STATION_R, beehive: 5 * TS, lamppost: 120 };
const reachTiles = id => Math.round(REACH[id] / TS);
function drawReach(id, x, y, strong) {
  const r = REACH[id]; g.save(); g.setLineDash(strong ? [7, 5] : [4, 6]); g.lineWidth = strong ? 2 : 1.4;
  g.fillStyle = strong ? 'rgba(255,236,150,.09)' : 'rgba(255,236,150,.035)'; g.strokeStyle = strong ? 'rgba(255,236,150,.95)' : 'rgba(255,236,150,.45)';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
  if (strong) { const txt = 'Reaches ' + reachTiles(id) + ' tiles'; g.font = 'bold 12px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 12; g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(x - w / 2, y - r - 10, w, 18); g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.fillText(txt, x, y - r + 3); }
  g.restore();
}
/* ---- fences snap together ---- */
const isFenceId = id => { const c = catItem(id); return !!(c && c.fence); };
function fenceSnap() {
  const H = BUILD.held; if (!H || HOME_IN || !isFenceId(H.id)) return null; const side = (H.r | 0) === 1, me = { id: H.id, x: BUILD.cx, y: BUILD.cy, f: H.f, r: H.r | 0 }, ms = pSize(me); let best = null;
  const taken = (x, y) => HOME.placed.out.some(o => isFenceId(o.id) && Math.abs(o.x - x) < 4 && Math.abs(o.y - y) < 4);
  HOME.placed.out.forEach(o => { if (!isFenceId(o.id) || ((o.r | 0) === 1) !== side) return; const os = pSize(o);
    const step = side ? Math.max(14, Math.round(Math.min(os.h, ms.h) * 0.45)) : Math.round((os.w + ms.w) / 2) - 2;
    (side ? [[o.x, o.y - step], [o.x, o.y + step]] : [[o.x - step, o.y], [o.x + step, o.y]]).forEach(([x, y]) => { const d = Math.hypot(x - BUILD.cx, y - BUILD.cy); if (d < 28 && !taken(x, y) && (!best || d < best.d)) best = { x, y, d }; }); });
  return best;
}
function atSnap(fn) { const s = fenceSnap(); if (!s) return fn(); const ox = BUILD.cx, oy = BUILD.cy; BUILD.cx = s.x; BUILD.cy = s.y; let r; try { r = fn(); } finally { if (BUILD.held) { BUILD.cx = ox; BUILD.cy = oy; } } return r; }
const _buildActT = buildAct; buildAct = function () { return atSnap(_buildActT); };
const _drawBuildOverlayT = drawBuildOverlay;
drawBuildOverlay = function () {
  if (BUILD.on && !HOME_IN) {
    const H = BUILD.held, hv = !H && !BUILD.gbrush && !BUILD.brush && !BUILD.tool ? hovered() : null, id = H ? H.id : hv ? hv.id : null;
    if (id && REACH[id]) { (HOME.placed.out || []).forEach(p => { if (p.id === id && p !== hv) drawReach(id, p.x, p.y, false); }); const s = H ? fenceSnap() : null; drawReach(id, H ? BUILD.cx : hv.x, H ? BUILD.cy : hv.y, true); }
  }
  return atSnap(_drawBuildOverlayT);
};
/* ---- drag to paint ---- */
try { BUILD.dragPaint = localStorage.getItem('raidDragPaint') === '1'; } catch (e) { BUILD.dragPaint = false; }
function toggleDragPaint() { BUILD.dragPaint = !BUILD.dragPaint; try { localStorage.setItem('raidDragPaint', BUILD.dragPaint ? '1' : '0'); } catch (e) {} renderBar(); say(BUILD.dragPaint ? 'Drag to paint: press and drag over the tiles' : 'One tile at a time: click or tap each tile'); }
window.addEventListener('pointerdown', e => {                         // caught on the window, before the canvas: build mode's own canvas handler stops the event, so a listener on the canvas never saw it
  if (e.target !== cv || !(state === 'home' && BUILD.on && BUILD.dragPaint)) return; const ground = !HOME_IN && BUILD.gbrush, wall = HOME_IN && BUILD.wbrush && !/^(win|hang):/.test(BUILD.wbrush);
  if (!ground && !wall) return;
  if (e.pointerType === 'mouse') { if (e.button === 0) { if (ground) YARD.painting = true; else YARD.wpaint = true; } return; }   // a mouse: the first tile is painted by the normal click, then dragging paints the rest
  const p = pt(e); BUILD.cx = p.x + cam.x; BUILD.cy = p.y + cam.y; e.stopImmediatePropagation(); e.stopPropagation(); e.preventDefault();      // a finger: paint straight away (no tap-twice preview)
  if (ground) { YARD.painting = true; paintTileAt(BUILD.cx, BUILD.cy); } else { YARD.wpaint = true; wallAct(BUILD.cx, BUILD.cy); }
}, true);
/* ---- walking under the rose arch: while you are between its posts (or just behind it), the arch is drawn over you, so you pass under its
   top instead of over it; once you are out in front of it you are drawn over it as usual ---- */
function walkSortKey(p) {
  const c = catItem(p.id); if (!c || !c.walk || !P) return null; const { w } = pSize(p), side = (p.r | 0) === 1;
  const inside = side ? Math.abs(P.x - p.x) < 34 && P.y > p.y - 70 && P.y < p.y + 14 : Math.abs(P.x - p.x) < w * 0.38 && P.y > p.y - 70 && P.y < p.y + 14;
  return inside ? P.y + 0.5 : P.y > p.y ? p.y - 0.01 : null;
}
