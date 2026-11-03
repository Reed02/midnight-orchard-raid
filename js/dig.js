/* ===== THE BIG YARD: digging, the river and the bridge =====
   The homestead is HW x HH (home.js). Weeds, bramble bushes, rocks, boulders and young trees are scattered over it (homeObs, DIG_KINDS):
   walk up to one and press E (or Dig) and the raccoon digs until it is gone. Bigger things take more digs; each one may turn up a few apples.
   What you clear stays cleared (HOME.dug), and a patch of turned soil is left where it stood.
   The animation is art/source/dig_sheet.jpg, cut into DIG_SRC by tools/cut_dig.py: ready, strike, scoop, lift, peak, release (one dig),
   then reset and rest (the smile) when the job is done.
   The river (HRIVER in home.js) runs down the east side; the only way across is the bridge. */
let HDIG = null;                                              // the dig in progress: { o: what, t: time in this swing, fin: finishing pose }
const DIG_FRAME = 0.1, DIG_SWING = [0, 1, 2, 3, 4, 5], DIG_END = [6, 6, 7, 7, 7, 7];
let DIG_IMG = null; const DIGSK = {};
/* where the head is in each frame of the default dig strip ([eye x, hat y, neck y], strip pixels): found by matching the eyes of 'ready' into every pose.
   The strip is drawn 1:1 (the walking sprite x0.8), so the hat sits 11 px above the eyes and the scarf 14 below, the same as on the walking raccoon. */
const DIG_EYES = [[55, 31], [53.5, 29.5], [51.5, 30.5], [56.5, 27.5], [61.5, 22.5], [58.5, 25.5], [55.5, 34.5], [57, 32]], DIG_HD = DIG_EYES.map(e => [e[0], e[1] - 11, e[1] + 14.4]);
function digImg() { if (!DIG_IMG && typeof DIG_SRC !== 'undefined') { DIG_IMG = new Image(); DIG_IMG.src = DIG_SRC.src; } return DIG_IMG && DIG_IMG.complete && DIG_IMG.naturalWidth ? DIG_IMG : null; }
function digSheet() {                                         // the dig strip in the colours of the raccoon's skin (recoloured skins); drawn skins dig as themselves (skinDigSheet)
  const im = digImg(), id = HOME.skins.raccoon, sk = skinDef('raccoon', id); if (!im || !sk || id === 'classic') return im; if (sk.art) return skinDigSheet(sk); if (DIGSK[id]) return DIGSK[id];
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; let [h, s, l] = rgb2hsl(p[i], p[i + 1], p[i + 2]); if (s < 0.4 || l < 0.28) continue;     // the fur, not the dark soil
    h += sk.hue || 0; s = Math.min(1, s * (sk.sat === undefined ? 1 : sk.sat)); l = Math.min(1, l * (sk.lum === undefined ? 1 : sk.lum)); const o = hsl2rgb(h, s, l); p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; }
  x.putImageData(d, 0, 0); return (DIGSK[id] = c);
}
/* ----- the dig animation for a drawn skin: its own picture leans in, scoops, lifts a clump of earth over its head and lets it go (the same eight beats as the default
   strip: ready, strike, scoop, lift, peak, release, reset, rest). Built from the one pose with the walk's row-by-row lean (skinFrame in home.js). Drawn at the
   sprite's pixel size x0.8 (k), like the walking raccoon. Faces right; the game mirrors it. ----- */
const SKDIG = {};
function digBlob(x, cx, cy, r) {                              // a pixel-art clump of earth
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = Math.hypot(dx, dy * 1.15); if (d > r + 0.4) continue; x.fillStyle = d > r - 1.1 ? '#3b2f22' : (dx + dy) % 3 === 0 && dy < 0 ? '#8a7656' : '#6c5a3e'; x.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1); }
}
const SKDIGIMG = {};
function skinDigArt(sk) {                                      // the skin's own drawn dig animation (SKIN_DIG_SRC, made by tools/cut_skin_digs.py), once decoded
  const a = typeof SKIN_DIG_SRC !== 'undefined' && SKIN_DIG_SRC[sk.art]; if (!a) return null;
  if (!SKDIGIMG[sk.art]) { const im = new Image(); im.src = a.src; SKDIGIMG[sk.art] = im; } const im = SKDIGIMG[sk.art]; if (!im.complete || !im.naturalWidth) return undefined;
  if (!im.dig) im.dig = { fw: a.fw, fh: a.fh, ax: a.ax, ay: a.ay, k: 0.8, hd: a.hd.map(h => [h[0], h[1] - skinHatUp(sk.id), h[2]]) };
  return im;
}
function skinDigSheet(sk) {
  const art = skinDigArt(sk); if (art) return art; if (art === undefined) return null;          // drawn frames exist but are still decoding
  if (SKDIG[sk.id]) return SKDIG[sk.id]; const pose = skinPose(sk.art), a0 = typeof SKIN_SRC !== 'undefined' && SKIN_SRC[sk.art]; if (!pose || !a0) return null;
  const a = Object.assign({ id: sk.art }, a0), W = 132, H = 132, AX = 64, AY = 122, c = document.createElement('canvas'); c.width = W * 8; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const e = SKIN_EYE[sk.art] || [a.cx, a.h * 0.38], py = AY - a.h, hd = [], rng = hrng(91);
  const F = [{ lean: 1, sy: 0.98, sh: 0 }, { lean: 8, lean2: 3, sy: 0.9, sh: 3 }, { lean: 11, lean2: 4, sy: 0.85, sh: 5 }, { lean: 5, lean2: 1, sy: 0.98, sh: 2 },
    { lean: -3, lean2: -1, sy: 1.06, sh: -1 }, { lean: 3, lean2: 1, sy: 1, sh: 1 }, { lean: 0, sy: 1, sh: 0 }, { lean: 0, sy: 0.97, sh: 0 }];
  F.forEach((o, i) => {
    const px = Math.round(AX - a.cx) + o.sh, ox = i * W + px, h = skinFrame(x, pose, a, ox, py, o); hd.push([px + e[0] + h[0], py + e[1] + h[1] - 14 - skinHatUp(sk.id), py + e[1] + h[1] + 18]);
    const fx = i * W + AX + 22, topY = AY - a.h * o.sy;                          // dirt props: in front of the paws, then in the air
    if (i === 0) { digBlob(x, i * W + AX + 28, AY - 2, 2); }
    if (i === 1) { digBlob(x, i * W + AX + 26, AY - 4, 4); for (let k = 0; k < 3; k++) { x.fillStyle = '#6c5a3e'; x.fillRect(Math.round(fx + 8 + k * 5), Math.round(AY - 10 - rng() * 8), 2, 2); } }
    if (i === 2) { digBlob(x, i * W + AX + 30, AY - 3, 5); digBlob(x, fx - 2, AY - a.h * 0.22, 5); }
    if (i === 3) digBlob(x, fx + 2, AY - a.h * 0.5, 6);
    if (i === 4) digBlob(x, i * W + AX + 12, topY - 6, 7);
    if (i === 5) { digBlob(x, fx + 8, AY - a.h * 0.72, 4); for (let k = 0; k < 7; k++) { x.fillStyle = k % 2 ? '#6c5a3e' : '#8a7656'; x.fillRect(Math.round(fx + 4 + rng() * 26), Math.round(AY - a.h * (0.45 + rng() * 0.4)), 2, 2); } }
    if (i === 6) digBlob(x, i * W + AX + 28, AY - 3, 3);
    if (i === 7) digBlob(x, i * W + AX + 28, AY - 2, 2);
  });
  Object.assign(c, { dig: { fw: W, fh: H, ax: AX, ay: AY, k: 0.8, hd }, naturalWidth: c.width, naturalHeight: c.height, complete: true }); return (SKDIG[sk.id] = c);
}
function homeDigNear() { let best = null, bd = 1e9; for (const o of obs) if (o.dig) { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r + 34 && d < bd) { bd = d; best = o; } } return best; }
function digInteractable() {
  const o = homeDigNear(); if (o) return [{ id: 'dig', o, x: o.x, y: o.y + 4, r: o.r + 34, tip: 'Dig up the ' + DIG_KINDS[o.dig].name + (o.hp > 1 ? ' (' + o.hp + ' digs)' : ''), h: o.k === 'tree' ? 96 : o.k === 'bush' ? 56 : 44 }];
  const q = groundDigNear(); return q ? [{ id: 'dig', o: q, x: q.x, y: q.y + 4, r: 30, low: 1, tip: 'Dig up the ' + DIG_KINDS[q.dig].name, h: 30 }] : [];       // low: a real place (hut, mirror...) wins over a tuft of grass
}
const GDIG = {};
function groundDigNear() {                                    // a small thing within reach: a dig target made on the spot ({ gid } marks it as ground cover, drawn live by drawGroundItems)
  let best = null, bd = 26; for (const f of homeGround()) { if (Math.abs(f.x - P.x) > 30 || Math.abs(f.y - P.y) > 30 || HOME.dug[f.id]) continue; const d = Math.hypot(P.x - f.x, P.y - (f.y - 3)); if (d < bd && !groundHidden(f)) { bd = d; best = f; } }
  return best ? (GDIG[best.id] || (GDIG[best.id] = { k: 'gdig', gid: best.id, id: best.id, x: best.x, y: best.y - 3, r: 8, hp: 1, dig: groundKind(best.k) })) : null;
}
const groundHidden = f => HPOLY.some(p => polyDist(f.x, f.y, p) < 9);       // under a building or something you placed
function drawGroundItems() {                                  // grass, pebbles and flowers lying on the ground (walk-over); the one being dug shakes
  const y0 = cam.y - 8, y1 = cam.y + VH + 60, x0 = cam.x - 50, x1 = cam.x + VW + 50, hot = HDIG && HDIG.o && HDIG.o.gid;
  for (const f of homeGround()) {
    if (f.y < y0 || f.y > y1 || f.x < x0 || f.x > x1 || HOME.dug[f.id]) continue; const a = HOME_SRC[f.k], im = homeImg(f.k); if (!a || !im || !im.complete || !im.naturalWidth || groundHidden(f)) continue;
    const sh = hot === f.id && HDIG.o.shake ? Math.sin(t * 60) * 1.6 * (HDIG.o.shake / 0.3) : 0; g.drawImage(im, Math.round(f.x - a.w / 2 + sh), Math.round(f.y - a.h), a.w, a.h);
  }
}
/* ----- turned soil: a patch where something was dug up. It stays a few seconds, then fades away to plain grass (nothing is left on the ground) ----- */
const DIRT = [], DIRT_HOLD = 3, DIRT_FADE = 3, DIRTIMG = {};
function dirtImg(rx, ry, seed) {
  const key = Math.round(rx) + ':' + Math.round(ry) + ':' + seed; if (DIRTIMG[key]) return DIRTIMG[key]; const W = Math.ceil(rx * 2 + 12), H = Math.ceil(ry * 2 + 10), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = hrng(seed * 17 + 5);
  const cols = ['#7d6a4a', '#6c5a3e', '#8a7656', '#5c4c34'], cx = W / 2, cy = H / 2;
  for (let i = 0, n = Math.round(rx * ry * 0.05) + 6; i < n; i++) { const an = r() * 6.2832, d = Math.pow(r(), 0.8) * 0.8, br = (3 + r() * 5) * (1 - d * 0.6); x.fillStyle = cols[Math.floor(r() * 3)]; x.beginPath(); x.ellipse(cx + Math.cos(an) * d * rx, cy + Math.sin(an) * d * ry, br, br * 0.7, 0, 0, 7); x.fill(); }
  for (let i = 0, n = Math.round(rx * 0.7); i < n; i++) { const an = r() * 6.2832, d = r() * 0.8; x.fillStyle = cols[3]; x.fillRect(Math.round(cx + Math.cos(an) * d * rx), Math.round(cy + Math.sin(an) * d * ry), 2, 2); }       // darker grit
  return (DIRTIMG[key] = c);
}
function drawDirtFx() {
  for (let i = DIRT.length - 1; i >= 0; i--) {
    const p = DIRT[i], age = t - p.t0; if (age > DIRT_HOLD + DIRT_FADE || age < 0) { DIRT.splice(i, 1); continue; }
    if (p.x < cam.x - 60 || p.x > cam.x + VW + 60 || p.y < cam.y - 40 || p.y > cam.y + VH + 40) continue;
    const im = dirtImg(p.rx, p.ry, p.v); g.save(); g.globalAlpha = age < DIRT_HOLD ? 1 : Math.max(0, 1 - (age - DIRT_HOLD) / DIRT_FADE); g.imageSmoothingEnabled = false; g.drawImage(im, Math.round(p.x - im.width / 2), Math.round(p.y - im.height / 2)); g.restore();
  }
}
function startDig(o) { if (!o || HDIG) return; HDIG = { o, t: 0, fin: 0, face: o.x >= P.x ? 1 : -1 }; P.face = HDIG.face; P.moving = false; homeNear = null; }
function updateDig(dt) {
  t += dt; const d = HDIG, o = d.o; d.t += dt; P.moving = false; anim = 0; homeNear = null;
  if (o.shake) o.shake = Math.max(0, o.shake - dt);
  if (!d.fin) {
    const mv = moveVec('raccoon'); if ((mv.x || mv.y) && d.t > 0.25) { HDIG = null; return; }       // walk away to stop
    if (d.t >= DIG_SWING.length * DIG_FRAME) {                 // one dig lands
      d.t = 0; o.hp--; o.shake = 0.3; const soft = o.dig === 'weeds' || o.dig === 'bramble';
      fxBurst(o.x, o.y - 6, 10, { col: soft ? ['#5e9c40', '#86c463', '#6c5a3e'] : ['#6c5a3e', '#8a7656', '#9a958a'], s0: 30, s1: 140, up: 70, g: 260, l0: 0.3, l1: 0.7, r0: 1.5, r1: 3 });
      try { sfxAt(soft ? 'rustle' : 'bonk', o.x, o.y, 600, undefined, soft ? 1 : 0.45); } catch (e) {}
      if (o.hp <= 0) finishDig(o); else pop(o.x, o.y - 40, o.hp + ' more', '#e8dcc0');
    }
  } else if (d.t >= DIG_END.length * 0.14 + 0.2) HDIG = null;
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
}
function finishDig(o) {
  const k = DIG_KINDS[o.dig], n = k.p !== undefined ? (Math.random() < k.p ? k.loot[0] : 0) : k.loot[0] + Math.floor(Math.random() * (k.loot[1] - k.loot[0] + 1));
  HOME.dug[o.id] = 1; HOME.digs = (HOME.digs || 0) + 1; obs = obs.filter(q => q !== o); rebuildSolids();
  DIRT.push({ x: o.x, y: o.y + 4, rx: k.small ? 9 : 16 + o.r * 0.4, ry: k.small ? 4 : 7 + o.r * 0.2, t0: t, v: Math.floor(Math.random() * 6) });                   // the turned soil: fades in a few seconds
  fxBurst(o.x, o.y - 10, 26, { col: ['#6c5a3e', '#8a7656', '#b89c64', '#fff6c8'], k: 'spark', s1: 180, up: 60, l1: 0.9, r1: 4 });
  if (n > 0) { payApples(n); pop(o.x, o.y - 50, '+' + n + (n === 1 ? ' apple' : ' apples') + ' in the dirt', '#9be37f'); } else pop(o.x, o.y - (k.small ? 26 : 50), k.small ? 'dug up' : 'cleared!', '#ffd23f');
  homeSave(); HDIG.fin = 1; HDIG.t = 0;
}
function drawHomeCoon() {                                     // the raccoon, or the raccoon digging
  const im = HDIG && digSheet(); if (!im) return drawCoon();
  const D = im.dig || Object.assign({ hd: DIG_HD }, DIG_SRC), k = D.k || 1, d = HDIG, f = d.fin ? DIG_END[Math.min(DIG_END.length - 1, Math.floor(d.t / 0.14))] : DIG_SWING[Math.min(DIG_SWING.length - 1, Math.floor(d.t / DIG_FRAME))];
  shadow(P.x, P.y, 15); g.save(); g.translate(Math.round(P.x), Math.round(P.y + 3)); g.scale(d.face, 1); g.imageSmoothingEnabled = false;
  g.drawImage(im, f * D.fw, 0, D.fw, D.fh, -D.ax * k, -D.ay * k, D.fw * k, D.fh * k);
  if (D.hd) { const cos = myCos(), h = D.hd[f]; [['neck', h[2]], ['hat', h[1]]].forEach(([slot, y]) => { const id = cos[slot]; if (id) cosPiece(g, slot, id, (h[0] - D.ax) * k, (y - D.ay) * k); }); }     // hat and scarf follow the head
  g.restore();
}
/* ----- weeds, and the shake of something being dug ----- */
const WEED_K = ['nat_tall0', 'nat_tall1', 'nat_grass3', 'nat_grass7', 'nat_grass4', 'nat_grass0'];
function drawWeeds(o) {
  const r = hrng(o.v * 31 + 7); shadow(o.x, o.y, 16);
  for (let i = 0; i < 4; i++) { const k = WEED_K[Math.floor(r() * WEED_K.length)], a = HOME_SRC[k], im = homeImg(k); if (!a || !im || !im.complete || !im.naturalWidth) continue;
    const s = 1.15 + r() * 0.35, w = a.w * s, h = a.h * s, x = o.x + (r() - 0.5) * 22, y = o.y + (r() - 0.5) * 6 + 2;
    g.drawImage(im, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h)); }
  g.fillStyle = 'rgba(40,60,20,.18)'; g.beginPath(); g.ellipse(o.x, o.y - 6, 18, 10, 0, 0, 7); g.fill();           // a darker, tangled heart
}
function drawHomeObs(o) {
  const sh = o.shake ? Math.sin(t * 60) * 2.5 * (o.shake / 0.3) : 0; if (sh) { g.save(); g.translate(sh, 0); }
  if (o.k === 'hrock') homeProp(o.img, o.x, o.y + o.r * 0.45, 2, !!GROUND_CV); else if (o.k === 'hweed') drawWeeds(o); else drawScenery(o);
  if (sh) g.restore();
}
/* ----- the river and the bridge (drawn live, so the water moves) ----- */
let HREEDS = null;
function homeReeds() {
  if (HREEDS) return HREEDS; const r = hrng(515), out = [];
  for (let y = 20; y < HH; y += 46) for (const sd of [-1, 1]) if (r() < 0.6) { const yy = y + r() * 30; if (Math.abs(yy - HRIVER.by) < 90) continue; out.push({ x: riverX(yy) + sd * (HRIVER.hw + 4 + r() * 10), y: yy + 14, v: Math.floor(r() * 4) }); }
  return (HREEDS = out);
}
const riverEdgeX = (y, sd) => riverX(y) + sd * (HRIVER.hw + 4 * Math.sin(y / 37 + sd));
function drawHomeRiver() {
  const y0 = Math.floor((cam.y - 40) / 12) * 12, y1 = cam.y + VH + 40, L = [], R = []; for (let y = y0; y <= y1; y += 12) { L.push([riverEdgeX(y, -1), y]); R.push([riverEdgeX(y, 1), y]); }
  if (Math.max(...R.map(p => p[0])) < cam.x - 20 || Math.min(...L.map(p => p[0])) > cam.x + VW + 20) return;
  g.save(); g.fillStyle = 'rgba(122,98,60,.55)'; g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x - 9, y) : g.moveTo(x - 9, y)); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0] + 9, R[i][1]); g.closePath(); g.fill();   // muddy banks
  g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  g.fillStyle = '#1f3f4a'; g.fill(); const pats = waterPatterns();
  if (pats) { g.clip(); const fl = Math.round((t * 18) % 160); g.translate(0, fl); g.fillStyle = pats[Math.floor(t * 6) % 8]; g.fillRect(cam.x - 8, cam.y - fl - 8, VW + 16, VH + 16); }
  g.restore();
  g.save(); g.lineJoin = 'round'; for (const E of [L, R]) { g.beginPath(); E.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokeStyle = '#3a2a20'; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#6e5236'; g.lineWidth = 2.5; g.stroke(); }
  for (let y = y0; y <= y1; y += 24) for (const sd of [-1, 1]) { const hsh = ((y * 7919) | 0) & 7; if (hsh > 4) continue; g.fillStyle = `rgba(214,225,227,${0.35 + 0.25 * Math.sin(t * 2 + y)})`; g.fillRect(Math.round(riverEdgeX(y + hsh * 3, sd) - sd * 7), y + hsh * 3, 2, 7); }   // foam along the edge
  g.restore(); drawBridge(false);
}
function drawBridge(front) {                                  // planks run across the river; the north rail is drawn behind you, the south rail in front
  const cx = riverX(HRIVER.by), x0 = Math.round(cx - HRIVER.hw - 34), x1 = Math.round(cx + HRIVER.hw + 34), yt = HRIVER.by - HRIVER.bw - 2, yb = HRIVER.by + HRIVER.bw + 2;
  if (x1 < cam.x || x0 > cam.x + VW || yb + 30 < cam.y || yt - 30 > cam.y + VH) return;
  const rail = (y, rx0, rx1) => { g.fillStyle = '#2e1c10'; g.fillRect(rx0, y - 11, rx1 - rx0, 5); g.fillStyle = '#7d5634'; g.fillRect(rx0, y - 12, rx1 - rx0, 3);
    for (let x = rx0; x <= rx1; x += 26) { g.fillStyle = '#2e1c10'; g.fillRect(x - 1, y - 14, 6, 16); g.fillStyle = '#6b4529'; g.fillRect(x, y - 13, 4, 14); } };
  if (front) return rail(yb + 2, x0 + 6, x1 - 10);
  g.fillStyle = 'rgba(0,16,24,.35)'; g.fillRect(x0 + 8, yb, x1 - x0 - 16, 10);                                          // its shadow on the water
  g.fillStyle = '#3e2716'; g.fillRect(x0, yt, x1 - x0, yb - yt + 4);
  for (let x = x0 + 1, i = 0; x < x1 - 1; x += 9, i++) { g.fillStyle = ['#7a5232', '#6b4529', '#835a37'][i % 3]; g.fillRect(x, yt + 1, 8, yb - yt + 1); g.fillStyle = 'rgba(255,230,180,.12)'; g.fillRect(x, yt + 1, 8, 2); if (i % 4 === 1) { g.fillStyle = '#2e1c10'; g.fillRect(x + 3, yt + 6, 2, 2); g.fillRect(x + 3, yb - 6, 2, 2); } }
  rail(yt + 2, x0 + 6, x1 - 10);
}
/* ----- the camera stays inside the bigger yard ----- */
const _followCamH = followCam;
followCam = function (dt) {
  if (state === 'home' && !HOME_IN && !BUILD.on) { const tx = clampN(P.x - VW / 2, 0, Math.max(0, HW - VW)), ty = clampN(P.y - 30 - VH / 2, 0, Math.max(0, HH - VH)), f = Math.min(1, dt * 7); cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f; return; }
  return _followCamH(dt);
};
