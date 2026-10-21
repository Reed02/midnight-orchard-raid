/* ===== INSIDE THE COTTAGE =====
   Walk in through the cabin door. It starts out shabby on purpose: grimy boards, cracked and mossy walls, cobwebs, a rotten ladder, a dark room.
   The crate by the wall is the FIX-UP LIST: spend apples to sweep, sand the floor, patch the walls and lay a rug (HOME.fix). The back door, the loft
   ladder and the cellar hatch are there to show what is coming (new rooms, a second floor, a cellar).
   Art: art/home/int_*.png, cut by tools/cut_interior_assets.py. The room uses the homestead's state ('home') with HOME_IN set, so input, the touch
   buttons and the pause menu all work unchanged. */
let HOME_IN = false, IN_SAVE = null;
const IT = 56, ICOLS = 8, IROWS = 4, IWALL = 2, IRX = 376, IRY = 200, ISW = 14;                 // tile size, floor size in tiles, the room's top-left, side wall thickness
const IFX0 = IRX, IFX1 = IRX + ICOLS * IT, IFY0 = IRY + IWALL * IT, IFY1 = IFY0 + IROWS * IT, ICX = (IFX0 + IFX1) / 2, IGAP = 30;
const FIXES = [
  { id: 'sweep', name: 'Sweep and dust', price: 15, text: 'Clear the cobwebs and the dust.' },
  { id: 'floor', name: 'Sand and oil the floorboards', price: 30, text: 'Scrub off the grime; the boards come up warm and golden.' },
  { id: 'walls', name: 'Patch and scrub the walls', price: 40, text: 'Fill the cracks and scrape away the moss.' },
];
const IN_ITEMS = [                                                                  // furniture: picture, where (bottom centre), solid footprint [half width, depth]
  { k: 'barrel', x: IFX0 + 28, y: IFY0 + 46, fp: [16, 14] }, { k: 'crate_b', x: IFX0 + 96, y: IFY0 + 66, fp: [21, 16], id: 'bench' },
  { k: 'logs_a', x: IFX1 - 30, y: IFY1 - 14, fp: [15, 12] }, { k: 'int_ladder', x: IFX1 - 46, y: IFY0 + 34, fp: [15, 10], id: 'ladder' },
];
const fixed = id => !!(HOME.fix && HOME.fix[id]);
function interiorPolys() {
  const P2 = [boxFp(ICX, IFY0 + 2, ICX - IFX0 + 60, IWALL * IT + 60), boxFp(IFX0 - 40, IFY1 + 60, 40, IFY1 - IRY + 120), boxFp(IFX1 + 40, IFY1 + 60, 40, IFY1 - IRY + 120),   // back wall, sides
    boxFp((IFX0 - 40 + ICX - IGAP) / 2, IFY1 + 60, (ICX - IGAP - IFX0 + 40) / 2, 60), boxFp((ICX + IGAP + IFX1 + 40) / 2, IFY1 + 60, (IFX1 + 40 - ICX - IGAP) / 2, 60),   // the front wall, either side of the doorway
    boxFp(IFX1 - 70, IFY1 - 30, 26, 24)];                                                                                                                         // the cellar hatch (a hole)
  IN_ITEMS.forEach(o => P2.push(boxFp(o.x, o.y, o.fp[0], o.fp[1]))); return P2;
}
function interiorSolids() { return interiorPolys().concat(placedPolys('in')); }
function enterInterior() {
  if (!HOME.house) return; for (const k in keys) keys[k] = false; IN_SAVE = { obs, HPOLY }; HOME_IN = true; obs = []; HPOLY = interiorSolids(); FX.length = 0;
  P.x = ICX; P.y = IFY1 - 14; P.tx = P.x; P.ty = P.y; dir = { x: 0, y: -1 }; homeNear = null; cam.x = ICX - VW / 2; cam.y = (IRY + IFY1) / 2 - VH / 2 - 20;
  if (!HOME.seen.inside) { HOME.seen.inside = 1; homeSave(); pop(ICX, IFY0 + 60, 'Home sweet... well. It needs some work.', '#ffd23f', true); }
}
function exitInterior() {
  if (BUILD.on) buildToggle(false);
  HOME_IN = false; obs = IN_SAVE ? IN_SAVE.obs : homeObs(); HPOLY = IN_SAVE ? IN_SAVE.HPOLY : HPOLY; IN_SAVE = null; for (const k in keys) keys[k] = false;
  P.x = HOUSE.x - 52; P.y = HOUSE.y + 36; P.tx = P.x; P.ty = P.y; dir = { x: 0, y: 1 }; homeNear = null; cam.x = clampN(P.x - VW / 2, 0, W - VW); cam.y = clampN(P.y - VH / 2, 0, H - VH);
}
const interiorInteractables = () => [
  { id: 'bench', x: IFX0 + 96, y: IFY0 + 84, r: 52, tip: 'Fix-up list', h: 70 },
  { id: 'idoor', x: IFX0 + 5.5 * IT, y: IFY0 + 22, r: 44, tip: 'The back door', h: 110 },
  { id: 'ladder', x: IFX1 - 46, y: IFY0 + 50, r: 42, tip: 'Ladder to the loft', h: 110 },
  { id: 'hatch', x: IFX1 - 70, y: IFY1 - 12, r: 44, tip: 'Cellar hatch', h: 60 },
  { id: 'out', x: ICX, y: IFY1 - 6, r: 34, tip: 'Go outside', h: 64 },
];
function updateInterior(dt) {
  t += dt; const mv = moveVec('raccoon'); let dx = mv.x, dy = mv.y; const m = Math.hypot(dx, dy); P.moving = m > 0;
  if (m) { dx /= m; dy /= m; dir = { x: dx, y: dy }; if (dx) P.face = dx > 0 ? 1 : -1; anim += dt * 14; } else anim = 0;
  const step = 170 * dt, n = Math.max(1, Math.ceil(step / 4)); for (let i = 0; i < n; i++) { P.x += dx * step / n; P.y += dy * step / n; homePush(P, 10); }
  if (P.y > IFY1 + 10 && Math.abs(P.x - ICX) < IGAP) return exitInterior();          // out through the doorway
  homeNear = null; let best = 1e9; for (const o of interiorInteractables()) { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r && d < best) { best = d; homeNear = o; } }
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
}
function interiorAct(id) {
  if (id === 'bench') return fixScreen(); if (id === 'out') return exitInterior();
  pop(P.x, P.y - 80, { idoor: 'Locked. A new room could go back here (coming soon).', ladder: 'The rungs are rotten. The loft will have to wait (coming soon).', hatch: 'A cellar, dark and damp (coming soon).' }[id], '#cfd8e6');
}
function fixScreen() {
  const rows = FIXES.map(f => { const done = fixed(f.id), locked = f.needs && !fixed(f.needs), can = !done && !locked && HOME.apples >= f.price;
    return `<button class="up" ${done || !can ? 'disabled style="opacity:' + (done ? '.75' : '.5') + '"' : ''} onclick="buyFix('${f.id}')"><b>${esc(f.name)}</b>${done ? 'done' : locked ? 'after the small rug' : f.price + ' apples'}<br><small>${esc(f.text)}</small></button>`; }).join('');
  homeScreen(`<h1>Fix-up list</h1><p class="tag">The cottage has seen better days. You have ${HOME.apples} apples.</p><div class="row">${rows}</div>
  <p class="lbl">Rugs, crates and more are in build mode (press B or the Build button): place them anywhere you like. A back room, the loft and the cellar are coming.</p><div class="row"><button onclick="leaveHomeScreen()">Back to the room</button></div>`, 'fixup');
}
function buyFix(id) {
  const f = FIXES.find(q => q.id === id); if (!f || fixed(id) || (f.needs && !fixed(f.needs)) || !spendApples(f.price)) return fixScreen();
  HOME.fix[id] = 1; homeSave(); leaveHomeScreen(); pop(ICX, IFY0 + 100, f.name + ': done!', '#9be37f', true); fxBurst(ICX, IFY0 + 120, 26, { col: ['#ffd23f', '#fff6a8', '#fff'], k: 'spark', s1: 160, up: 40, l1: 0.9, r1: 4 });
}
/* ----- drawing the room ----- */
function inImg(k) { const a = HOME_SRC[k], im = homeImg(k); return a && im && im.complete && im.naturalWidth ? [im, a] : null; }
function inDraw(k, x, y, w, h) { const p = inImg(k); if (p) g.drawImage(p[0], Math.round(x), Math.round(y), w || p[1].w, h || p[1].h); }
const IN_GRIME = (() => { const r = hrng(99), o = []; for (let i = 0; i < 70; i++) o.push([IFX0 + r() * ICOLS * IT, IFY0 + r() * IROWS * IT, 6 + r() * 18, r()]); return o; })();
function drawInterior() {
  g.fillStyle = '#0c0b10'; g.fillRect(0, 0, VW, VH); g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); g.imageSmoothingEnabled = false;
  for (let j = 0; j < IROWS; j++) for (let i = 0; i < ICOLS; i++) {             // each floor tile is wood or stone (painted in build mode); the 2x2 pictures are cut in quarters
    const p = inImg(HOME.floorIn[j * ICOLS + i] === 's' ? 'int_floor_stone' : 'int_floor_wood'); if (p) g.drawImage(p[0], (i % 2) * IT, (j % 2) * IT, IT, IT, IFX0 + i * IT, IFY0 + j * IT, IT, IT); }
  if (!fixed('floor')) {                                                          // old, grimy boards
    for (let c = 0; c < ICOLS * IROWS; c++) if (HOME.floorIn[c] !== 's') { g.fillStyle = 'rgba(40,26,14,.34)'; g.fillRect(IFX0 + (c % ICOLS) * IT, IFY0 + Math.floor(c / ICOLS) * IT, IT, IT); }
    IN_GRIME.forEach(([x, y, s, v]) => { g.fillStyle = v < 0.6 ? 'rgba(30,20,10,.28)' : 'rgba(70,90,40,.18)'; g.beginPath(); g.ellipse(x, y, s, s * 0.6, 0, 0, 7); g.fill(); });
  } else { g.fillStyle = 'rgba(255,200,120,.06)'; g.fillRect(IFX0, IFY0, IFX1 - IFX0, IFY1 - IFY0); }
  const shadeStrip = (x, y, w, h) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(8,6,12,.55)'); gr.addColorStop(1, 'rgba(8,6,12,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  HOME.placed.in.forEach(p => { if (catItem(p.id).flat) drawPlaced(p); });                // rugs and other flat things lie on the floor
  inDraw('int_hatch', IFX1 - 95, IFY1 - 56);
  const walls = fixed('walls') ? ['int_wall0', 'int_wall0', 'int_window', 'int_wall1', 'int_wall0', 'int_wall0', 'int_wall0', 'int_wall0'] : ['int_wall4', 'int_wall2', 'int_window', 'int_wall5', 'int_wall3', 'int_wall0', 'int_wall4', 'int_wall4'];
  const top = fixed('walls') ? ['int_wall0', 'int_wall1', 'int_wall0', 'int_wall0', 'int_wall1', 'int_wall0', 'int_wall0', 'int_wall1'] : ['int_wall2', 'int_wall0', 'int_wall3', 'int_wall1', 'int_wall5', 'int_wall2', 'int_wall0', 'int_wall3'];
  top.forEach((k, i) => inDraw(k, IFX0 + i * IT, IRY, IT, IT)); walls.forEach((k, i) => inDraw(k, IFX0 + i * IT, IRY + IT, IT, IT));
  inDraw('int_door', IFX0 + 5 * IT + IT / 2 - 42, IFY0 - 84, 85, 84);                 // the back door, full height
  shadeStrip(IFX0, IFY0, IFX1 - IFX0, 22);                                         // the wall's shadow on the floor
  g.fillStyle = '#3c3c36'; g.fillRect(IFX0 - ISW, IRY - 12, IFX1 - IFX0 + ISW * 2, 12); g.fillStyle = '#56564e'; g.fillRect(IFX0 - ISW, IRY - 12, IFX1 - IFX0 + ISW * 2, 3);
  const winX = IFX0 + 2 * IT + IT / 2, beam = fixed('sweep') ? 0.12 : 0.06;          // daylight through the barred window
  g.fillStyle = `rgba(255,238,190,${beam})`; g.beginPath(); g.moveTo(winX - 10, IRY + IT + 36); g.lineTo(winX + 10, IRY + IT + 36); g.lineTo(winX + 60, IFY1 - 40); g.lineTo(winX - 4, IFY1 - 40); g.closePath(); g.fill();
  const list = IN_ITEMS.map(o => ({ y: o.y, f: () => { const p = inImg(o.k); if (!p) return; shadow(o.x + 3, o.y - 1, p[1].w * 0.36); g.drawImage(p[0], Math.round(o.x - p[1].w / 2), Math.round(o.y - p[1].h + 2)); } }));
  HOME.placed.in.forEach(p => { if (!catItem(p.id).flat) list.push({ y: p.y, f: () => drawPlaced(p) }); });
  list.push({ y: P.y, f: drawCoon }, { y: IFY1, f: () => {                         // the front wall, with the doorway
    g.fillStyle = '#3c3c36'; g.fillRect(IFX0 - ISW, IFY1, ICX - IGAP - IFX0 + ISW, ISW); g.fillRect(ICX + IGAP, IFY1, IFX1 + ISW - ICX - IGAP, ISW);
    g.fillStyle = '#56564e'; g.fillRect(IFX0 - ISW, IFY1, ICX - IGAP - IFX0 + ISW, 3); g.fillRect(ICX + IGAP, IFY1, IFX1 + ISW - ICX - IGAP, 3);
    g.fillStyle = 'rgba(255,230,170,.22)'; g.fillRect(ICX - IGAP, IFY1, IGAP * 2, ISW + 10); g.fillStyle = '#6a5030'; g.fillRect(ICX - 20, IFY1 - 10, 40, 8); } });   // light from outside, a doormat
  list.sort((a, b) => a.y - b.y).forEach(i => i.f());
  g.fillStyle = '#3c3c36'; g.fillRect(IFX0 - ISW, IRY - 12, ISW, IFY1 - IRY + 12 + ISW); g.fillRect(IFX1, IRY - 12, ISW, IFY1 - IRY + 12 + ISW);   // side walls
  g.fillStyle = '#56564e'; g.fillRect(IFX0 - 3, IRY - 9, 3, IFY1 - IRY + 9); g.fillRect(IFX1, IRY - 9, 3, IFY1 - IRY + 9);
  g.strokeStyle = '#1c1820'; g.lineWidth = 2; g.strokeRect(IFX0 - ISW, IRY - 12, IFX1 - IFX0 + ISW * 2, IFY1 - IRY + 12 + ISW);
  if (!fixed('sweep')) {                                                          // cobwebs in the top corners, dust in the air
    g.strokeStyle = 'rgba(230,230,240,.45)'; g.lineWidth = 1; [[IFX0, IRY, 1], [IFX1, IRY, -1]].forEach(([cx, cy, s]) => { for (let i = 1; i <= 4; i++) { g.beginPath(); g.moveTo(cx + s * i * 9, cy); g.quadraticCurveTo(cx + s * i * 5, cy + i * 5, cx, cy + i * 9); g.stroke(); }
      for (let a = 0; a < 4; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + s * Math.cos(a * 0.45) * 40, cy + Math.sin(a * 0.45) * 40); g.stroke(); } });
    g.fillStyle = 'rgba(240,230,200,.35)'; for (let i = 0; i < 18; i++) { const x = IFX0 + ((i * 97 + t * 6) % (IFX1 - IFX0)), y = IRY + 40 + ((i * 53 + Math.sin(t + i) * 8) % (IFY1 - IRY - 60)); g.fillRect(x, y, 2, 2); }
  }
  const dark = 0.5 - (fixed('sweep') ? 0.08 : 0) - (fixed('floor') ? 0.08 : 0) - (fixed('walls') ? 0.08 : 0), vg = g.createRadialGradient(ICX, (IFY0 + IFY1) / 2, 60, ICX, (IFY0 + IFY1) / 2, 330);
  vg.addColorStop(0, 'rgba(10,8,20,0)'); vg.addColorStop(1, `rgba(10,8,20,${dark})`); g.fillStyle = vg; g.fillRect(IFX0 - 60, IRY - 60, IFX1 - IFX0 + 120, IFY1 - IRY + 140);
  if (homeNear && !BUILD.on) { const o = homeNear, txt = (isTouch ? 'Tap Act: ' : 'E: ') + o.tip; g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 20, x = o.x - w / 2, y = o.y - o.h - 22; g.fillStyle = 'rgba(10,24,40,.88)'; g.fillRect(x, y, w, 24); g.fillStyle = '#ffd23f'; g.fillRect(x, y, 3, 24); g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, o.x, y + 12.5); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
  drawBuildOverlay(); drawFx(); drawPops(false); g.restore();
  drawHomeHud(); drawBuildHud(); buildBarTick(); updateTouchUi(); tipTick(); drawTip(); drawSpeaker(); drawPause();
}
const _followCamOut = followCam;                                                  // inside, the camera holds still on the room
followCam = function (dt) { if (HOME_IN && state === 'home') { cam.x = ICX - VW / 2; cam.y = (IRY + IFY1) / 2 - VH / 2 - 20 + (BUILD.on ? 60 : 0); return; }  /* in build mode the room sits higher, above the bar */ return _followCamOut(dt); };
