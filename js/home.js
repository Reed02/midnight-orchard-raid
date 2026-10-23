/* ===== THE HOMESTEAD =====
   Your own little corner of the orchard, and where the game now starts. Raids (solo, daily, multiplayer) are started from the Raid Hut and pay out APPLES,
   which you spend here: a cottage (more is coming), skins for the raccoon and the farmer, and so on. Everything is saved in this browser (see Save code).
   Time-based things (the daily mailbox, the sky) follow the real clock but never punish you for being away: nothing wilts, nothing is lost.
   Slice 1: walk around, the Raid Hut, the mirror (skins + wardrobe), the plot (buy a cottage), the mailbox (a gift every real day), the save code. */
const hrng = seed => { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; };      // a small seeded random generator (the same homestead every time)
const HOME_KEYS_OK = k => /^raid[A-Za-z0-9]*$/.test(k);
let HOME = null, homeNear = null, homeT0 = 0, homeGain = { n: 0, t: -9 }, runEarn = { banked: 0, nights: 0, catches: 0, flawless: 0 }, homeSmokeAt = 0, homeSparkAt = 0;
function homeLoad() {
  const d = Object.assign({ v: 1, apples: 0, house: 0, skins: { raccoon: 'classic', farmer: 'classic' }, owned: { raccoon: ['classic'], farmer: ['classic'] }, mail: '', seen: {}, born: Date.now() }, store('raidHome', {}));
  d.skins = Object.assign({ raccoon: 'classic', farmer: 'classic' }, d.skins); d.owned = Object.assign({ raccoon: ['classic'], farmer: ['classic'] }, d.owned);
  for (const r of ['raccoon', 'farmer']) { if (!Array.isArray(d.owned[r]) || !d.owned[r].includes('classic')) d.owned[r] = ['classic'].concat((d.owned[r] || []).filter(x => x !== 'classic')); if (!d.owned[r].includes(d.skins[r])) d.skins[r] = 'classic'; }
  d.fix = Object.assign({ sweep: 0, floor: 0, walls: 0, rug1: 0, rug2: 0 }, d.fix || {}); d.apples = Math.max(0, Math.floor(+d.apples || 0)); return d;
}
HOME = homeLoad();
const homeSave = () => save('raidHome', HOME);
function payApples(n) { n = Math.max(0, Math.floor(+n || 0)); if (!n) return; HOME.apples += n; homeGain = { n, t }; homeSave(); }
const spendApples = n => { if (HOME.apples < n) return false; HOME.apples -= n; homeSave(); return true; };
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
/* ----- apples from raids ----- */
function runEarnReset() { runEarn = { banked: 0, nights: 0, catches: 0, flawless: 0 }; }
function runEarnNight() { runEarn.banked += banked; runEarn.nights++; runEarn.catches += ST.catches || 0; if (!ST.catches) runEarn.flawless++; }       // a night was cleared
function appleReward(role, win) {                         // what a finished raid pays: the raccoon side for what it banked, the farmer side for catches and nights defended
  const e = runEarn; if (role === 'farmer') return Math.round(4 * e.catches + 3 * (e.nights + (win ? 0 : 1)) + (win ? 0 : 15));
  return Math.round(e.banked + 2 * e.nights + 3 * e.flawless + (win ? 25 : 0));
}
function payPartial() { if (!['play', 'paused', 'upgrade', 'wait'].includes(state) || (isHost === false && multi)) return; const n = runEarn.banked + (state === 'play' || state === 'paused' ? banked : 0); runEarnReset(); payApples(n); }      // leaving a raid early: the apples you already banked are still yours
/* ----- skins (palette swaps of the default sprites; more can be added by adding entries here, or real sprite sheets later) ----- */
/* Prices are tiers (see ECONOMY in the README): a good full raid pays roughly 150-200 apples, a raid that ends on night 3 or 4 about 40-70.
   art = a hand-drawn skin (art/skins, made by tools/cut_skins.py): one pose, animated by skinArtSheet below. ownHat = the art has its own
   headgear, so a wardrobe hat is not drawn on top. need = ['wins', n]: also needs n raids won (all nights survived as the raccoon). */
const SKINS = {
  raccoon: [{ id: 'classic', name: 'Classic', price: 0 },
    { id: 'moonlit', name: 'Moonlit', price: 150, hue: 205, sat: 0.5, lum: 1.04 }, { id: 'ember', name: 'Ember', price: 150, hue: -22, sat: 1.25, lum: 1.06 }, { id: 'mossy', name: 'Mossy', price: 200, hue: 78, sat: 0.75, lum: 0.95 },
    { id: 'snowtail', name: 'Snowtail', price: 250, hue: 0, sat: 0.12, lum: 1.3 }, { id: 'midnight', name: 'Midnight', price: 250, hue: 228, sat: 0.6, lum: 0.62 },
    { id: 'strawberry', name: 'Strawberry Fields', price: 400, art: 'strawberry', ownHat: 1 }, { id: 'honey', name: 'Honey', price: 400, art: 'honey', ownHat: 1 },
    { id: 'pajama', name: 'Pajama', price: 400, art: 'pajama', ownHat: 1 }, { id: 'petal', name: 'Flower Petal', price: 400, art: 'petal', ownHat: 1 },
    { id: 'frog', name: 'Rainforest Frog', price: 450, art: 'frog', ownHat: 1 }, { id: 'storm', name: 'Storm Cloud', price: 450, art: 'storm' },
    { id: 'fae', name: 'Mushroom Fae', price: 650, art: 'fae', ownHat: 1 }, { id: 'sunstone', name: 'Sunstone Desert', price: 650, art: 'sunstone' },
    { id: 'origami', name: 'Origami', price: 650, art: 'origami' }, { id: 'scholar', name: 'Bookish Scholar', price: 650, art: 'scholar' },
    { id: 'gnome', name: 'Garden Gnome', price: 700, art: 'gnome', ownHat: 1 }, { id: 'druid', name: 'Forest Druid', price: 700, art: 'druid', ownHat: 1 },
    { id: 'aurora', name: 'Aurora Borealis', price: 900, art: 'aurora' }, { id: 'obsidian', name: 'Obsidian-Tech', price: 900, art: 'obsidian' },
    { id: 'cyber', name: 'Cyberpunk', price: 900, art: 'cyber' }, { id: 'alchemist', name: 'Alchemist', price: 900, art: 'alchemist' },
    { id: 'magma', name: 'Magma', price: 1000, art: 'magma', ownHat: 1 }, { id: 'cosmic', name: 'Cosmic', price: 1000, art: 'cosmic', ownHat: 1 },
    { id: 'phoenix', name: 'Phoenix', price: 1500, art: 'phoenix', ownHat: 1, rare: 'Rare', need: ['wins', 1] },
    { id: 'glitch', name: 'Diamond Glitch', price: 2500, art: 'glitch', rare: 'Ultra-rare', need: ['wins', 3] }],
  farmer: [{ id: 'classic', name: 'Classic', price: 0 }, { id: 'redalls', name: 'Red Overalls', price: 100, hue: 140, from: 70, to: 275 }, { id: 'sunny', name: 'Sunny Day', price: 100, hue: -48, from: 70, to: 275 }, { id: 'nightwatch', name: 'Night Watch', price: 180, hue: 10, sat: 0.7, lum: 0.62, from: 70, to: 275 }],
};
const homeWins = () => (HOME.rec && HOME.rec.wins) || 0;
function homeWin() { HOME.rec = Object.assign({ wins: 0 }, HOME.rec || {}); HOME.rec.wins++; homeSave(); }      // a raid won as the raccoon (counts toward the rare skins)
const skinNeedOk = s => !s.need || (s.need[0] === 'wins' && homeWins() >= s.need[1]);
const skinNeedText = s => s.need ? `win ${s.need[1] === 1 ? 'a raid' : s.need[1] + ' raids'} first (${Math.min(homeWins(), s.need[1])}/${s.need[1]})` : '';
const skinDef = (role, id) => (SKINS[role] || []).find(s => s.id === id) || null;
const skinClean = o => ({ raccoon: o && skinDef('raccoon', String(o.raccoon)) ? String(o.raccoon) : 'classic', farmer: o && skinDef('farmer', String(o.farmer)) ? String(o.farmer) : 'classic' });
function rgb2hsl(r, g2, b) { r /= 255; g2 /= 255; b /= 255; const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g2 - b) / d + (g2 < b ? 6 : 0) : mx === g2 ? (b - r) / d + 2 : (r - g2) / d + 4; h *= 60; } return [h, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t2 => { t2 = (t2 + 1) % 1; return t2 < 1 / 6 ? p + (q - p) * 6 * t2 : t2 < 1 / 2 ? q : t2 < 2 / 3 ? p + (q - p) * (2 / 3 - t2) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
const SKCACHE = {};
function skinSheet(role, key, id) {                       // the sprite sheet `key` recoloured for skin `id` (cached); the plain sprite for the default skin
  const im = IMG[key]; if (!im || !im.complete || !im.naturalWidth) return im; if (id === 'classic') return im; const ck = key + ':' + id; if (SKCACHE[ck]) return SKCACHE[ck];
  const sk = skinDef(role, id); if (!sk) return im; if (sk.art) return skinArtSheet(sk, key, ck, im);
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; let [h, s, l] = rgb2hsl(p[i], p[i + 1], p[i + 2]); if (sk.from !== undefined && (h < sk.from || h > sk.to || s < 0.15)) continue; h += sk.hue || 0; s = Math.min(1, s * (sk.sat === undefined ? 1 : sk.sat)); l = Math.min(1, l * (sk.lum === undefined ? 1 : sk.lum)); const o = hsl2rgb(h, s, l); p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; }
  x.putImageData(d, 0, 0); c.naturalWidth = c.width; c.naturalHeight = c.height; c.complete = true; return (SKCACHE[ck] = c);
}
/* ----- hand-drawn skins: one pose, made into the sheets the game draws (walk, startled, cheek puffs). Frames are padded (SKF): the standard
   80 x 85 frame sits at (SKF.ox, SKF.oy) inside, so hats, flames and props can stick out. drawRacFrame draws either kind of sheet. ----- */
const SKF = { fw: 112, fh: 112, ox: 16, oy: 27, cx: 40.9, foot: 84 };     // cx / foot: the default raccoon's body middle and the row under its feet
const SKIMG = {};
function skinPose(art) { const a = typeof SKIN_SRC !== 'undefined' && SKIN_SRC[art]; if (!a) return null; if (!SKIMG[art]) { const im = new Image(); im.src = a.src; SKIMG[art] = im; } const im = SKIMG[art]; return im.complete && im.naturalWidth ? im : null; }
function skinArtSheet(sk, key, ck, base) {
  const pose = skinPose(sk.art), a = SKIN_SRC[sk.art]; if (!pose) return base;                       // not decoded yet: the plain sprite this frame
  const n = key === 'raccoon' ? 14 : key === 'raccoonCheeks' ? 9 : key === 'cheekOverlay' ? 4 : 0; if (!n) return base;
  const c = document.createElement('canvas'); c.width = SKF.fw * n; c.height = SKF.fh; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const px = Math.round(SKF.ox + SKF.cx - a.cx), py = SKF.oy + SKF.foot - a.h, legH = Math.round(a.h * 0.2), cut = a.h - legH, half = Math.round(a.cx);
  const pose1 = (i, lift1, lift2, sway, sy) => {                  // one frame: the legs (left / right foot lifted), then the body over them
    const ox = i * SKF.fw + px;
    x.drawImage(pose, 0, cut, half, legH, ox, py + cut - lift1, half, legH); x.drawImage(pose, half, cut, a.w - half, legH, ox + half, py + cut - lift2, a.w - half, legH);
    const bh = Math.round(cut * (sy || 1)); x.drawImage(pose, 0, 0, a.w, cut, ox + sway, py + cut - bh, a.w, bh);
  };
  if (key === 'raccoon') for (let i = 0; i < n; i++) { const ph = i / n * Math.PI * 2, s = Math.sin(ph); pose1(i, Math.round(Math.max(0, s) * 3), Math.round(Math.max(0, -s) * 3), Math.round(Math.sin(ph + 0.6) * 1), 1 - Math.abs(s) * 0.02); }
  else if (key === 'raccoonCheeks') for (let i = 0; i < n; i++) i === 8 ? pose1(i, 3, 3, 0, 1.06) : pose1(i, 0, 0, 0, 1);       // frame 8: startled (stretched up, both feet off the ground)
  // cheekOverlay: left empty. Each drawing's face sits a little differently, so the default sprite's puffs would land on the eyes; the apples over the head still show the load
  Object.assign(c, { fw: SKF.fw, fh: SKF.fh, ox: SKF.ox, oy: SKF.oy, naturalWidth: c.width, naturalHeight: c.height, complete: true }); return (SKCACHE[ck] = c);
}
function drawRacFrame(c, sheet, fi, dx, dy, dw, dh) {          // draws frame fi of a raccoon sheet into the rect a standard 80 x 85 frame would fill
  if (!sheet.fw) return c.drawImage(sheet, fi * FW, 0, FW, FH, dx, dy, dw, dh);
  const kx = dw / FW, ky = dh / FH; c.drawImage(sheet, fi * sheet.fw, 0, sheet.fw, sheet.fh, dx - sheet.ox * kx, dy - sheet.oy * ky, sheet.fw * kx, sheet.fh * ky);
}
const skinHasHat = id => { const s = skinDef('raccoon', id); return !!(s && s.ownHat); };
const raccoonSkinId = () => !multi ? HOME.skins.raccoon : COOP ? (cur === mySlot ? HOME.skins.raccoon : skinClean(net.theirSkin).raccoon) : myRole === 'raccoon' ? HOME.skins.raccoon : skinClean(net.theirSkin).raccoon;
const farmerSkinId = () => !multi ? 'classic' : myRole === 'farmer' ? HOME.skins.farmer : skinClean(net.theirSkin).farmer;
const SK = key => skinSheet('raccoon', key, raccoonSkinId());
function fitFarmer(f, x, y, height, flip) {               // the human farmer wears its player's skin; the AI farmers stay classic
  const id = f.human ? farmerSkinId() : 'classic'; if (id === 'classic') return fit('farmer', x, y, height, flip);
  const i = skinSheet('farmer', 'farmer', id); if (!i || !i.naturalWidth) return fit('farmer', x, y, height, flip);
  const w = i.naturalWidth / i.naturalHeight * height; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(i, -w / 2, -height, w, height); g.restore(); return true;
}
/* ----- the world ----- */
const HIMG = {};
const homeImg = k => { const a = HOME_SRC[k]; if (!a) return null; if (!HIMG[k]) { const im = new Image(); im.src = a.src; HIMG[k] = im; } return HIMG[k]; };
const HOUSE = { x: 410, y: 500 }, HUT = { x: 950, y: 320 }, MIRROR = { x: 585, y: 520 }, MAIL = { x: 720, y: 690 }, FIRE = { x: 250, y: 640 }, SPAWN = { x: 650, y: 610 }, SIGN = { x: 330, y: 560 };
const HOME_WALKS = [[SPAWN, { x: 650, y: 500 }], [{ x: 650, y: 500 }, { x: 350, y: 545 }], [{ x: 650, y: 500 }, { x: 988, y: 368 }], [SPAWN, MAIL], [{ x: 520, y: 540 }, MIRROR]];
/* the homestead's props (art cut from the painted farm sheet, see tools/cut_home_assets.py): k = picture, r = how solid (0: walk over it) */
/* the homestead's props (art cut from the painted farm sheet, see tools/cut_home_assets.py). fp = the ground it stands on [half width, depth] - you cannot walk into it */
const HOME_DECOR = [{ k: 'garden', x: 222, y: 512, fp: [37, 100] }, { k: 'logs_a', x: 546, y: 458, fp: [14, 12] }, { k: 'logs_c', x: 180, y: 652, fp: [26, 18] }, { k: 'logs_b', x: 304, y: 676, fp: [18, 14] },
  { k: 'hay_b', x: 1112, y: 318, fp: [52, 46] }, { k: 'hay_s', x: 806, y: 322, fp: [25, 26] }, { k: 'crate_apples', x: 1040, y: 416, fp: [19, 15] }, { k: 'barrel', x: 1072, y: 422, fp: [16, 13] }, { k: 'crate_b', x: 1106, y: 410, fp: [21, 16] }];
/* ----- solid ground: every building and prop has a footprint polygon (its base on the ground, read off the art); the raccoon is a circle (radius 10)
   and is pushed out of every footprint after each small step, so it can never walk into a wall, whatever its speed */
let HPOLY = [];
const boxFp = (x, y, hw, d) => [[x - hw, y - d], [x + hw, y - d], [x + hw, y], [x - hw, y]];
const relFp = (x, y, pts) => pts.map(([px, py]) => [x + px, y + py]);
const CABIN_FP = [[-110, -38], [10, -1], [100, -53], [-20, -90]], BARN_FP = [[-74, -49], [-7, -24], [70, -60], [3, -85]], TROUGH_FP = [[-72, -31], [-50, -39], [-20, -17], [-35, 3], [-70, -11]];
/* Everything you could walk behind is solid over the WHOLE of its picture (its outline, HOME_SRC[k].prof, made by tools/embed_art.py), not just its base:
   so you cannot slip behind a house and vanish under the roof. homeSolids() lists those pictures with where they are drawn (x, y = bottom centre, ex = drop). */
function homeSolids() {
  const L = [{ k: HOME.house ? 'cottage' : 'tent', x: HOUSE.x, y: HOUSE.y, ex: 4 }, { k: 'hut', x: HUT.x, y: HUT.y, ex: 4 }, { k: 'mirror', x: MIRROR.x, y: MIRROR.y, ex: 4 }, { k: 'mailbox1', x: MAIL.x, y: MAIL.y, ex: 2 }];
  if (!HOME.house) L.push({ k: 'sign', x: SIGN.x, y: SIGN.y, ex: 2 });
  HOME_DECOR.forEach(d => L.push({ k: d.k, x: d.x, y: d.y, ex: 2 })); return L;
}
function profPoly(k, x, y, ex) {                            // the picture's outline in world coordinates: along the top, then back along the bottom
  const a = typeof HOME_SRC !== 'undefined' && HOME_SRC[k]; if (!a || !a.prof || a.prof.length < 2) return null; const ox = x - a.w / 2, oy = y - a.h + ex;
  return a.prof.map(([px, t]) => [ox + px, oy + t]).concat(a.prof.slice().reverse().map(([px, , b]) => [ox + px, oy + b]));
}
function homeFootprints() {                                 // fallbacks (the hand-made bases) are only used if the art has no outline data
  const fb = { cottage: () => relFp(HOUSE.x, HOUSE.y, CABIN_FP), tent: () => boxFp(HOUSE.x, HOUSE.y - 2, 44, 22), hut: () => relFp(HUT.x, HUT.y, BARN_FP), mirror: () => boxFp(MIRROR.x, MIRROR.y + 2, 30, 12) };
  const f = []; homeSolids().forEach(o => { const p = profPoly(o.k, o.x, o.y, o.ex) || (fb[o.k] ? fb[o.k]() : (HOME_DECOR.find(d => d.k === o.k) ? boxFp(o.x, o.y, HOME_DECOR.find(d => d.k === o.k).fp[0], HOME_DECOR.find(d => d.k === o.k).fp[1]) : null)); if (p) f.push(p); });
  if (!profPoly('hut', HUT.x, HUT.y, 4)) f.push(relFp(HUT.x, HUT.y, TROUGH_FP)); if (typeof HOME.placed === 'object' && HOME.placed) f.push(...placedPolys('out')); return f;
}
function topAt(o, x0, x1) {                                 // the highest point of a picture's outline between two x positions (null if it is not there)
  const a = HOME_SRC[o.k]; if (!a || !a.prof) return null; const ox = o.x - a.w / 2, oy = o.y - a.h + o.ex; let t = null;
  for (let i = 0; i < a.prof.length - 1; i++) { const [px, top] = a.prof[i], nx = a.prof[i + 1][0]; if (ox + nx >= x0 && ox + px <= x1) t = t === null ? oy + top : Math.min(t, oy + top); } return t;
}
function sortKey(o) {                                       // draw the raccoon in front of a picture it overlaps unless it is truly behind it (above its outline)
  const t = topAt(o, P.x - 24, P.x + 24); if (t === null) return o.y; return P.y < t ? Math.max(o.y, P.y + 0.5) : Math.min(o.y, P.y - 0.5);
}
function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function polyNear(x, y, p) { let best = 1e9, bx = x, by = y; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [ax, ay] = p[j], [cx, cy] = p[i], dx = cx - ax, dy = cy - ay, l2 = dx * dx + dy * dy || 1, u = clampN(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), qx = ax + u * dx, qy = ay + u * dy, d = Math.hypot(x - qx, y - qy); if (d < best) { best = d; bx = qx; by = qy; } } return { d: best, x: bx, y: by }; }
const polyDist = (x, y, p) => inPoly(x, y, p) ? 0 : polyNear(x, y, p).d;
function polyPush(e, p, rad) {
  const inside = inPoly(e.x, e.y, p), q = polyNear(e.x, e.y, p); if (!inside && q.d >= rad) return false;
  let nx = e.x - q.x, ny = e.y - q.y, l = Math.hypot(nx, ny); if (l < 1e-6) { nx = 0; ny = 1; l = 1; } nx /= l; ny /= l; if (inside) { nx = -nx; ny = -ny; }
  e.x = q.x + nx * (rad + 0.01); e.y = q.y + ny * (rad + 0.01); return true;
}
function homePush(e, rad) {                                 // a few passes, so being squeezed between two things cannot leave you inside either
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const o of obs) if (solid(o) && o.k !== 'hrock') { let vx = e.x - o.x, vy = e.y - o.y, d = Math.hypot(vx, vy); const m = o.r + rad; if (d < m) { if (d < 1e-6) { vx = 0; vy = 1; d = 1; } e.x = o.x + vx / d * m; e.y = o.y + vy / d * m; moved = true; } }
    for (const p of HPOLY) if (polyPush(e, p, rad)) moved = true;
    e.x = clampN(e.x, 30, W - 30); e.y = clampN(e.y, 52, H - 20); if (!moved) break;
  }
}
const ROCK_KINDS = ['nat_moss3', 'nat_moss4', 'nat_moss5', 'nat_moss6', 'nat_boulder0', 'nat_boulder2', 'nat_rock1', 'nat_rock3', 'nat_rock4', 'nat_moss1'];
function homeObs() {
  HPOLY = homeFootprints();
  HOME_GROUND = null; const o = [], rng = hrng(20241), solidAt = [[FIRE.x, FIRE.y - 6, 16]];
  solidAt.forEach(([x, y, r]) => o.push({ k: 'wall', x, y, r }));                                  // invisible: the props are drawn by drawHome
  const yards = [{ x: HUT.x + 24, y: HUT.y + 96 }, { x: HOUSE.x - 40, y: HOUSE.y + 70 }];          // keep the ground in front of the doors open
  const free = (x, y, rad) => ![HOUSE, HUT, MIRROR, MAIL, FIRE, SPAWN, SIGN, ...yards].some(q => Math.hypot(q.x - x, q.y - y) < rad) && !HPOLY.some(p => polyDist(x, y, p) < 44) && !onPath(x, y, 56) && !o.some(q => q.k !== 'wall' && Math.hypot(q.x - x, q.y - y) < q.r + 40);
  for (let x = 40; x < W; x += 74) for (const y of [96, H - 34]) { const px = x + (rng() - 0.5) * 36, py = y + (rng() - 0.5) * 24; if (free(px, py, 150)) o.push({ k: 'tree', x: px, y: py, r: 16, rustle: 0, cd: 0, shakeP: 0 }); }
  for (let y = 150; y < H - 60; y += 78) for (const x of [34, W - 34]) { const px = x + (rng() - 0.5) * 24, py = y + (rng() - 0.5) * 30; if (free(px, py, 150)) o.push({ k: 'tree', x: px, y: py, r: 16, rustle: 0, cd: 0, shakeP: 0 }); }
  for (let i = 0; i < 9; i++) { const x = rnd2(rng, 120, W - 120), y = rnd2(rng, 190, H - 120); if (free(x, y, 130)) o.push(i % 3 ? { k: 'tree', x, y, r: 16, rustle: 0, cd: 0, shakeP: 0 } : homeRock(rng, x, y)); }
  for (let i = 0; i < 12; i++) { const x = rnd2(rng, 80, W - 80), y = rnd2(rng, 150, H - 70); if (free(x, y, 90)) o.push({ k: 'bush', x, y, r: 30 }); }
  for (let i = 0; i < 6; i++) { const x = rnd2(rng, 70, W - 70), y = rnd2(rng, 160, H - 60); if (free(x, y, 110)) o.push(homeRock(rng, x, y)); }   // a few more rocks to walk round
  o.forEach(q => { if (q.k === 'hrock') { const p = profPoly(q.img, q.x, q.y + q.r * 0.45, 2); if (p) HPOLY.push(p); } });
  return o;
}
function homeRock(rng, x, y) { const img = ROCK_KINDS[Math.floor(rng() * ROCK_KINDS.length)], a = (typeof HOME_SRC !== 'undefined' && HOME_SRC[img]) || { w: 40, h: 34 }; return { k: 'hrock', img, x, y, r: Math.max(10, Math.min(24, a.w * 0.38)) }; }
const rnd2 = (rng, a, b) => a + rng() * (b - a);
const distSeg = (px, py, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, u = clampN(((px - a.x) * dx + (py - a.y) * dy) / l2, 0, 1); return Math.hypot(px - (a.x + u * dx), py - (a.y + u * dy)); };
const onPath = (x, y, m) => HOME_WALKS.some(([a, b]) => distSeg(x, y, a, b) < m);                  // keep the walkways clear of trees and flowers
let HOME_GROUND = null;                                     // grass tufts, pebbles and flowers (walk-over), made once per visit layout
function homeGround() {                                     // grouped like real ground cover: a few meadow patches, tufts at tree roots and wall bases, pebbles by rocks and paths, little else
  if (HOME_GROUND) return HOME_GROUND; const r = hrng(77), out = [], gauss = () => (r() + r() + r() - 1.5) * 1.15;
  const spots = [[SPAWN, 30], [FIRE, 46], [MAIL, 24], [SIGN, 26]];
  const ok = (x, y, m) => x > 30 && x < W - 30 && y > 120 && y < H - 20 && !onPath(x, y, m + 16) && !HPOLY.some(p => polyDist(x, y, p) < m * 0.6 + 6) && !spots.some(([q, d]) => Math.hypot(q.x - x, q.y - y) < d + m * 0.5) && !out.some(f => Math.hypot(f.x - x, f.y - y) < 15);
  const put = (k, x, y, m) => { if (ok(x, y, m)) { out.push({ k, x, y }); return true; } return false; };
  const grass = () => 'nat_grass' + Math.floor(r() * 8), flower = n => 'nat_flower' + n;
  for (let i = 0, made = 0; i < 50 && made < 8; i++) {                               // meadow patches
    const cx = 80 + r() * (W - 160), cy = 160 + r() * (H - 220); if (!ok(cx, cy, 50)) continue; made++;
    const sp = 26 + r() * 22; for (let j = 0, n = 3 + Math.floor(r() * 4); j < n; j++) put(grass(), cx + gauss() * sp, cy + gauss() * sp * 0.6, 18);
    for (let c = 0, nc = 1 + Math.floor(r() * 3); c < nc; c++) { const kind = Math.floor(r() * 24), fx = cx + gauss() * sp, fy = cy + gauss() * sp * 0.5; for (let j = 0, n = 2 + Math.floor(r() * 3); j < n; j++) put(flower(r() < 0.8 ? kind : Math.floor(r() * 24)), fx + gauss() * 10, fy + gauss() * 6, 14); }
    if (r() < 0.5) put('nat_tall' + Math.floor(r() * 2), cx + gauss() * sp, cy + gauss() * sp * 0.5, 24);
  }
  obs.forEach(o => {
    if (o.k === 'tree' && o.y > 140 && o.y < H - 60 && r() < 0.45) put(r() < 0.3 ? 'nat_tall' + Math.floor(r() * 2) : grass(), o.x + (r() < 0.5 ? -1 : 1) * (14 + r() * 10), o.y + 6 + r() * 6, 14);   // tufts at tree roots
    if (o.k === 'hrock') { for (let j = 0, n = 1 + Math.floor(r() * 2); j < n; j++) put('nat_pebble' + Math.floor(r() * 7), o.x + (r() < 0.5 ? -1 : 1) * (o.r + 6 + r() * 10), o.y + 8 + r() * 8, 10); if (r() < 0.6) put(grass(), o.x + (r() - 0.5) * o.r * 2, o.y + o.r * 0.6 + 6, 12); }
  });
  [[HOUSE.x + 96, HOUSE.y - 40], [HOUSE.x - 106, HOUSE.y - 22], [HUT.x + 76, HUT.y - 50], [HUT.x - 76, HUT.y - 16]].forEach(([x, y]) => { put(grass(), x, y + 12, 12); if (r() < 0.6) put(grass(), x + (r() - 0.5) * 20, y + 18, 12); });   // weeds at wall corners
  HOME_WALKS.forEach(([a, b]) => { for (let j = 0, n = 1 + Math.floor(r() * 2); j < n; j++) { const u = r(), l = Math.hypot(b.x - a.x, b.y - a.y) || 1, side = r() < 0.5 ? -1 : 1, off = 30 + r() * 8; put('nat_pebble' + Math.floor(r() * 7), a.x + (b.x - a.x) * u - (b.y - a.y) / l * off * side, a.y + (b.y - a.y) * u + (b.x - a.x) / l * off * side, 1); } });   // pebbles by the path edges
  for (let i = 0; i < 8; i++) put(grass(), 50 + r() * (W - 100), 150 + r() * (H - 200), 18);          // a few strays
  for (let i = 0; i < 6; i++) put(flower(Math.floor(r() * 24)), 50 + r() * (W - 100), 150 + r() * (H - 200), 18);
  return (HOME_GROUND = out.sort((a, b) => a.y - b.y));
}
const interactables = () => HOME_IN ? interiorInteractables() : [
  { id: 'hut', x: HUT.x, y: HUT.y + 22, r: 74, tip: 'Raid Hut', h: 200 },
  { id: 'mirror', x: MIRROR.x, y: MIRROR.y + 6, r: 56, tip: 'Mirror', h: 90 },
  { id: HOME.house ? 'house' : 'plot', x: HOUSE.x, y: HOUSE.y + 14, r: 88, tip: HOME.house ? 'Go inside' : 'Build a cottage (' + COTTAGE_PRICE + ' apples)', h: HOME.house ? 214 : 110 },
  { id: 'mail', x: MAIL.x, y: MAIL.y + 6, r: 52, tip: HOME.mail !== todayKey() ? 'Mailbox: a gift is waiting' : 'Mailbox', h: 60 },
];
const COTTAGE_PRICE = 150, MAIL_GIFT = 10;
function enterHome() {
  if (typeof BUILD !== 'undefined') { if (BUILD.held) storeHeld(); BUILD.on = false; BUILD.brush = null; }
  HOME_IN = false; IN_SAVE = null; stopTitleArt(); state = 'home'; multi = false; isHost = true; myRole = 'raccoon'; COOP = false; RS = []; $('ov').style.display = 'none'; RIVER = null; LV = null; strange = null; try { itemRun(); } catch (e) {}
  obs = homeObs(); apples = []; farmers = []; dogs = []; carry = []; pops = []; FX.length = 0; TRAILP.length = 0; slam = null; alertV = 0; inv = 0; dashT = dashCd = climbT = climbCd = startleT = 0; shaking = false; shakeTree = null; dir = { x: 1, y: 0 }; anim = 0; flash = 0; shakeAmt = 0; chain = 0; mapOpen = false; compassUntil = 0;
  P = { x: SPAWN.x, y: SPAWN.y, tx: SPAWN.x, ty: SPAWN.y, face: 1, moving: false, tree: null }; cam.x = clampN(P.x - VW / 2, 0, W - VW); cam.y = clampN(P.y - VH / 2, 0, H - VH); homeT0 = t; homeNear = null; tipShow = null; tipNext = t + 1;
  buttons(false); last = performance.now(); kickLoop(); if (!HOME.seen.firstHome) { HOME.seen.firstHome = 1; homeSave(); }
}
const goHome = () => { if (multi || ['paused', 'upgrade', 'wait', 'over', 'won', 'screen'].includes(state)) { if (multi) leaveGame(true, true); payPartial(); } enterHome(); };
function updateHome(dt) {
  if (BUILD.on) return updateBuild(dt);
  if (HOME_IN) return updateInterior(dt);
  t += dt; const mv = moveVec('raccoon'); let dx = mv.x, dy = mv.y; const m = Math.hypot(dx, dy); P.moving = m > 0;
  if (m) { dx /= m; dy /= m; dir = { x: dx, y: dy }; if (dx) P.face = dx > 0 ? 1 : -1; anim += dt * 14; } else anim = 0;
  const step = 200 * dt, n = Math.max(1, Math.ceil(step / 4));                                      // small steps: fast frames cannot tunnel through a wall
  for (let i = 0; i < n; i++) { P.x += dx * step / n; P.y += dy * step / n; homePush(P, 10); }
  homeNear = null; let best = 1e9; for (const o of interactables()) { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r && d < best) { best = d; homeNear = o; } }
  if (t > homeSparkAt) { homeSparkAt = t + 0.12; fxBurst(FIRE.x + rnd(-5, 5), FIRE.y - 22, 1, { col: ['#ffb347', '#ff8a1f', '#fff1a8'], s0: 4, s1: 22, g: -50, l0: 0.5, l1: 1, r0: 1.5, r1: 2.6 }); }
  if (HOME.house && t > homeSmokeAt) { homeSmokeAt = t + 0.55; fxBurst(HOUSE.x + 65, HOUSE.y - 200, 1, { col: ['#eceef4', '#d6d9e4'], s0: 2, s1: 10, g: -14, l0: 1.6, l1: 2.4, r0: 3, r1: 6 }); }
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
}
function homeKey(k) {
  if (BUILD.on) return buildKey(k);
  if (k === 'b') return buildToggle(true);
  if (BIND.mute.includes(k)) toggleMute(); if (BIND.pause.includes(k)) return homeMenu();
  if (BIND.shake.includes(k) || BIND.dash.includes(k) || k === 'enter') homeInteract();
}
function homeInteract() {
  if (state !== 'home' || !homeNear) return; for (const k in keys) keys[k] = false; drag = null; wheel = null;
  if (HOME_IN) return interiorAct(homeNear.id);
  ({ hut: raidHut, mirror: mirrorScreen, plot: plotScreen, house: enterInterior, mail: claimMail })[homeNear.id]();
}
function homeTint() {                                      // the sky follows the real clock (morning, day, evening, night); it is only a mood, nothing depends on it
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60, lerp = (a, b, u) => a + (b - a) * u, mix = (c1, c2, u) => c1.map((v, i) => lerp(v, c2[i], u));
  const stops = [[0, [10, 20, 60, 0.36]], [5, [10, 20, 60, 0.34]], [6.5, [255, 170, 140, 0.16]], [8.5, [255, 230, 190, 0.0]], [17, [255, 230, 190, 0.0]], [19, [255, 140, 70, 0.18]], [21, [20, 30, 80, 0.3]], [24, [10, 20, 60, 0.36]]];
  for (let i = 0; i < stops.length - 1; i++) if (h >= stops[i][0] && h <= stops[i + 1][0]) return mix(stops[i][1], stops[i + 1][1], (h - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
  return [0, 0, 0, 0];
}
function homeProp(k, x, y, extra, grounded) { const a = HOME_SRC[k], im = homeImg(k); if (!a || !im || !im.complete || !im.naturalWidth) return; if (!grounded) shadow(x, y - 2, a.w * 0.34); g.imageSmoothingEnabled = false; g.drawImage(im, x - a.w / 2, y - a.h + (extra || 0), a.w, a.h); if (grounded) drawFringe(k, x, y, extra || 0); }
/* ----- making things sit IN the ground, not on it. The ground is painted once into GROUND_CV (redone when the layout changes):
   soft colour patches and specks in the grass, worn dirt where feet go (porch, barn door, fire, mailbox...), paths with ragged edges,
   a cast shadow for every building / prop / rock (its own outline, squashed and leaned away from the light) and a dark contact line along its base.
   Then, when each thing is drawn, a few grass blades are drawn over its base (drawFringe), so the grass grows up against it. */
let GROUND_CV = null, GROUND_KEY = '';
const SUN = { lean: 0.6, squash: 0.34, alpha: 0.26 };      // cast shadows lean up-right, behind things (the light is low, in front and to the left)
const homeImgsReady = keys => keys.every(k => { const im = homeImg(k); return im && im.complete && im.naturalWidth; });
function homeWear() {                                       // worn ground: [x, y, rx, ry, kind]   kind: dirt, mud (by the trough), straw (by the hay)
  const w = [[FIRE.x, FIRE.y - 2, 46, 20, 'dirt'], [MAIL.x, MAIL.y + 2, 20, 7, 'dirt'], [MIRROR.x, MIRROR.y + 4, 36, 9, 'dirt'], [HUT.x + 34, HUT.y + 16, 56, 20, 'dirt'], [HUT.x - 46, HUT.y + 4, 30, 12, 'mud'],
    [1112, 322, 66, 16, 'straw'], [806, 324, 34, 10, 'straw'], [1072, 420, 60, 14, 'dirt'], [222, 514, 46, 10, 'dirt'], [196, 656, 30, 9, 'dirt'], [304, 680, 22, 7, 'dirt']];
  w.push(HOME.house ? [HOUSE.x - 52, HOUSE.y + 8, 56, 20, 'dirt'] : [HOUSE.x, HOUSE.y + 2, 54, 16, 'dirt']); if (!HOME.house) w.push([SIGN.x, SIGN.y + 2, 14, 5, 'dirt']); return w;
}
function shadowOf(k) {                                      // a black copy of a picture (cached)
  const key = 'sh:' + k; if (HIMG[key]) return HIMG[key]; const im = homeImg(k), a = HOME_SRC[k]; const c = document.createElement('canvas'); c.width = a.w; c.height = a.h; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#0d1a10'; x.fillRect(0, 0, a.w, a.h); return (HIMG[key] = c);
}
function groundThings() {                                   // what casts a shadow: buildings and props, rocks
  const L = homeSolids().map(o => ({ k: o.k, x: o.x, y: o.y, ex: o.ex })); obs.forEach(o => { if (o.k === 'hrock') L.push({ k: o.img, x: o.x, y: o.y + o.r * 0.45, ex: 2 }); }); return L;
}
function paintGround() {
  const things = groundThings(), key = HOME.house + ':' + things.length + ':' + (homeGround().length);
  if (GROUND_CV && GROUND_KEY === key) return GROUND_CV; if (!homeImgsReady(things.map(t => t.k).concat(homeGround().map(f => f.k)))) return null;
  const c = GROUND_CV || document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = hrng(4242); x.imageSmoothingEnabled = false;
  const px = (cx, cy, s, col) => { x.fillStyle = col; x.fillRect(Math.round(cx), Math.round(cy), s, s); };
  x.fillStyle = '#79b957'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) {                            // big soft patches: some lusher, some drier
    const cx = r() * W, cy = r() * H, rad = 50 + r() * 120, gr = x.createRadialGradient(cx, cy, 0, cx, cy, rad), col = r() < 0.55 ? '96,166,66' : '140,196,98';
    gr.addColorStop(0, `rgba(${col},0.32)`); gr.addColorStop(1, `rgba(${col},0)`); x.fillStyle = gr; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 2600; i++) px(r() * W, r() * H, 2, ['#6fae4e', '#83c060', '#6aa84a', '#8cc86a'][Math.floor(r() * 4)]);   // fine specks
  x.fillStyle = '#6aa84a'; tufts.forEach(u => { x.fillRect(u.x, u.y, 3, 8); x.fillRect(u.x + 5, u.y + 2, 3, 6); });
  const DIRT = { dirt: ['#b89c64', '#a88c58', '#c6aa72', '#9a8050'], mud: ['#7d6a4a', '#6c5a3e', '#8a7656', '#5c4c34'], straw: ['#b89c64', '#d8bc5a', '#c9a84c', '#a88c58'] };
  const EDGE = ['#a6b866', '#9cb05e', '#b2b56c', '#93aa58'];  // the in-between colours where trodden dirt meets grass
  const wear = (cx, cy, rx, ry, kind) => {                  // a dirt patch: blobs packed in the middle, thinning out, then a band of half-worn grass
    const cols = DIRT[kind];
    for (let i = 0, n = Math.round(rx * ry * 0.05) + 6; i < n; i++) { const an = r() * 6.2832, d = Math.pow(r(), 0.8) * 0.8, br = (4 + r() * 6) * (1 - d * 0.6); x.fillStyle = cols[Math.floor(r() * 3)]; x.beginPath(); x.ellipse(cx + Math.cos(an) * d * rx, cy + Math.sin(an) * d * ry, br, br * 0.7, 0, 0, 7); x.fill(); }
    for (let i = 0, n = Math.round(rx * 1.6); i < n; i++) { const an = r() * 6.2832, d = 0.8 + r() * 0.4; px(cx + Math.cos(an) * d * rx, cy + Math.sin(an) * d * ry, 3, EDGE[Math.floor(r() * 4)]); }
    for (let i = 0, n = Math.round(rx * 0.7); i < n; i++) { const an = r() * 6.2832, d = r() * 0.8; px(cx + Math.cos(an) * d * rx, cy + Math.sin(an) * d * ry, 2, cols[3]); }   // darker grit
    if (kind === 'straw') for (let i = 0; i < rx; i++) { const an = r() * 6.2832, d = r(); x.fillStyle = r() < 0.5 ? '#e6cc6a' : '#c9a84c'; x.fillRect(Math.round(cx + Math.cos(an) * d * rx), Math.round(cy + Math.sin(an) * d * ry), 3, 1); }
  };
  homeWear().forEach(w => wear(...w));
  x.lineCap = 'round'; x.lineJoin = 'round';                // paths: a trodden middle and a ragged edge (dirt crumbs out, grass blades in); all edges first so joints do not show
  [[36, '#b39760'], [26, '#cdb07a']].forEach(([lw, col]) => { x.strokeStyle = col; x.lineWidth = lw; HOME_WALKS.forEach(([a, b]) => { x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }); });
  HOME_WALKS.forEach(([a, b]) => {
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l;
    for (let i = 0, n = Math.round(l * 1.6); i < n; i++) { const u = r(), side = r() < 0.5 ? -1 : 1, cx = a.x + (b.x - a.x) * u, cy = a.y + (b.y - a.y) * u;
      const o1 = 17 + r() * 6; if (r() < 0.5 && !onPath(cx + nx * o1 * side, cy + ny * o1 * side, 14)) px(cx + nx * o1 * side, cy + ny * o1 * side, 3, EDGE[Math.floor(r() * 4)]);
      const o2 = 13 + r() * 6, gx = cx + nx * o2 * side, gy = cy + ny * o2 * side; if (r() < 0.6 && !onPath(gx, gy, 12)) { x.fillStyle = r() < 0.5 ? '#6aa84a' : '#79b957'; x.fillRect(Math.round(gx), Math.round(gy) - 3, 2, 4 + Math.floor(r() * 3)); }
      if (r() < 0.08) px(cx + nx * (r() - 0.5) * 18, cy + ny * (r() - 0.5) * 18, 2, '#e0c890'); }     // light pebbles in the path
  });
  things.forEach(t => {                                     // cast shadows: the outline, squashed and leaned away from the light, soft at the edges
    const a = HOME_SRC[t.k]; if (!a) return; const sh = shadowOf(t.k), by = t.y + t.ex; x.save(); x.globalAlpha = SUN.alpha; try { x.filter = 'blur(2px)'; } catch (e) {}
    x.setTransform(1, 0, -SUN.lean, SUN.squash, t.x, by); x.drawImage(sh, -a.w / 2, -a.h, a.w, a.h); x.restore();
  });
  things.forEach(t => {                                     // contact shadow: darkest right where the thing meets the ground
    const a = HOME_SRC[t.k]; if (!a || !a.prof) return; const ox = t.x - a.w / 2, oy = t.y - a.h + t.ex;
    a.prof.forEach(([bx, , bb], i) => { if (i === a.prof.length - 1) return; const cx = ox + bx + 3, cy = oy + bb - 1, rad = Math.min(12, 6 + a.w / 30), gr = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      gr.addColorStop(0, 'rgba(14,28,10,0.30)'); gr.addColorStop(1, 'rgba(14,28,10,0)'); x.fillStyle = gr; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); });
  });
  homeGround().forEach(f => { const a = HOME_SRC[f.k], im = homeImg(f.k); if (a && im && im.complete && im.naturalWidth) x.drawImage(im, Math.round(f.x - a.w / 2), Math.round(f.y - a.h), a.w, a.h); });
  GROUND_CV = c; GROUND_KEY = key; return c;
}
const FRINGE = {};
function drawFringe(k, x0, y0, ex) {                        // grass blades growing up against the bottom edge of a building or prop
  const a = HOME_SRC[k]; if (!a || !a.prof) return; const id = k + '@' + x0 + ',' + y0; let bl = FRINGE[id];
  if (!bl) { const r = hrng(Math.round(x0 * 7 + y0 * 13)), ox = x0 - a.w / 2, oy = y0 - a.h + ex; bl = FRINGE[id] = [];
    a.prof.forEach(([bx, , bb], i) => { if (i === a.prof.length - 1) return; for (let j = 0, n = r() < 0.75 ? 2 : 1; j < n; j++) { const h = 3 + Math.floor(r() * 5); bl.push([Math.round(ox + bx + r() * 6), Math.round(oy + bb + 1 - h + r() * 2), h, ['#5e9c40', '#6aa84a', '#86c463', '#4f8a36'][Math.floor(r() * 4)]]); } }); }
  bl.forEach(([bx, by, h, c]) => { g.fillStyle = c; g.fillRect(bx, by, 2, h); });
}
function drawHome() {
  if (HOME_IN) return drawInterior();
  g.fillStyle = '#79b957'; g.fillRect(0, 0, VW, VH); g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y));
  const gc = paintGround(); g.imageSmoothingEnabled = false;
  if (gc) g.drawImage(gc, 0, 0); else { g.fillStyle = '#79b957'; g.fillRect(0, 0, W, H); g.lineCap = 'round'; g.strokeStyle = '#cdb07a'; g.lineWidth = 32; HOME_WALKS.forEach(([a, b]) => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }); }
  const list = obs.filter(o => o.k !== 'wall').map(o => o.k === 'hrock' ? { y: sortKey({ k: o.img, x: o.x, y: o.y + o.r * 0.45, ex: 2 }), f: () => homeProp(o.img, o.x, o.y + o.r * 0.45, 2, !!GROUND_CV) } : { y: o.y, f: () => drawScenery(o) });
  homeSolids().forEach(o => list.push({ y: sortKey(o), f: () => { homeProp(o.k === 'mailbox1' && HOME.mail === todayKey() ? 'mailbox0' : o.k, o.x, o.y, o.ex, !!GROUND_CV); if (o.k === 'mirror') drawReflection(); } }));
  HOME.placed.out.forEach(p => { if (catItem(p.id).flat) drawPlaced(p); else list.push({ y: sortKey({ k: catItem(p.id).k, x: p.x, y: p.y, ex: 2 }), f: () => drawPlaced(p) }); });
  list.push({ y: FIRE.y, f: drawFire }, { y: P.y, f: drawCoon });
  list.sort((a, b) => a.y - b.y).forEach(i => i.f()); drawFx();
  const tn = homeTint(); if (tn[3] > 0.01) { g.fillStyle = `rgba(${tn[0] | 0},${tn[1] | 0},${tn[2] | 0},${tn[3]})`; g.fillRect(0, 0, W, H); }
  if (homeNear && !BUILD.on) { const o = homeNear, txt = (isTouch ? 'Tap Act: ' : 'E: ') + o.tip; g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 20, x = o.x - w / 2, y = o.y - o.h - 22; g.fillStyle = 'rgba(10,24,40,.88)'; g.fillRect(x, y, w, 24); g.fillStyle = '#ffd23f'; g.fillRect(x, y, 3, 24); g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, o.x, y + 12.5); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
  drawBuildOverlay(); drawPops(false); g.restore();
  drawHomeHud(); drawBuildHud(); buildBarTick(); updateTouchUi(); tipTick(); drawTip(); drawSpeaker(); drawPause();
}
const MIRROR_GLASS = [[26, 22], [59, 22], [52, 115], [18, 111]];          // the glass inside the mirror picture (pixels from its top-left; found by tools/make_home_art.py)
function drawReflection() {                                 // the mirror shows only what is really in front of it: you, flipped, smaller the further back you stand
  const a = HOME_SRC.mirror; if (!a) return; const dx = P.x - MIRROR.x, dy = P.y - MIRROR.y; if (dy < -2 || dy > 170 || Math.abs(dx) > 95) return;
  const ox = MIRROR.x - a.w / 2, oy = MIRROR.y - a.h + 4, glass = () => { g.beginPath(); MIRROR_GLASS.forEach(([x, y], i) => i ? g.lineTo(ox + x, oy + y) : g.moveTo(ox + x, oy + y)); g.closePath(); };
  const s = clampN(0.62 - dy * 0.0018, 0.32, 0.62), fx = MIRROR.x + 2 + dx * 0.32, fy = oy + 106 - dy * 0.12;
  g.save(); glass(); g.clip(); g.globalAlpha = clampN(1.05 - dy / 190, 0.35, 0.9); g.translate(fx, fy); g.scale(-s, s); g.translate(-P.x, -P.y); drawCoon(); g.restore();
  g.save(); glass(); g.clip(); g.fillStyle = 'rgba(190,225,240,.22)'; g.fill(); g.restore();                    // a little glassy haze over the reflection
}
function drawFire() {
  homeProp('logs', FIRE.x, FIRE.y, 2); const f = Math.sin(t * 14) * 2, s = 1 + Math.sin(t * 9) * 0.08; g.save(); g.translate(FIRE.x, FIRE.y - 8);
  g.fillStyle = '#ff7a1f'; g.beginPath(); g.moveTo(-9 * s, 0); g.quadraticCurveTo(-8, -18 - f, 0, -34 - f * 2); g.quadraticCurveTo(8, -18 + f, 9 * s, 0); g.closePath(); g.fill();
  g.fillStyle = '#ffc83a'; g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-4, -12, 0, -22 - f); g.quadraticCurveTo(4, -12, 5, 0); g.closePath(); g.fill(); g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(0, -5, 2.5, 5, 0, 0, 7); g.fill(); g.restore();
  const gr = g.createRadialGradient(FIRE.x, FIRE.y - 10, 4, FIRE.x, FIRE.y - 10, 90); gr.addColorStop(0, 'rgba(255,170,60,.22)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.fillRect(FIRE.x - 90, FIRE.y - 100, 180, 180);
}
function drawHomeHud() {
  const ic = homeImg('apple'), txt = String(HOME.apples); g.save(); g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 54;
  g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(8, 8, w, 30); g.fillStyle = '#d8382c'; g.fillRect(8, 8, 4, 30); if (ic && ic.complete && ic.naturalWidth) { g.imageSmoothingEnabled = false; g.drawImage(ic, 16, 8, 30, 30); }
  g.fillStyle = '#fff7e6'; g.textBaseline = 'middle'; g.fillText(txt, 50, 24);
  if (t - homeGain.t < 2.5) { g.fillStyle = `rgba(155,227,127,${Math.min(1, (2.5 - (t - homeGain.t)))})`; g.fillText('+' + homeGain.n, 56 + g.measureText(txt).width, 24 - (t - homeGain.t) * 4); } g.restore();
}
/* ----- the places you can walk up to ----- */
function homeScreen(html, name) { state = 'homemenu'; menuFrom = 'home'; show(html, name); }
function leaveHomeScreen() { rebinding = null; $('ov').style.display = 'none'; state = 'home'; buttons(false); last = performance.now(); kickLoop(); }
function raidHut() {
  homeScreen(`<h1>Raid Hut</h1><p class="tag">Pick a raid. Every apple you bank comes home with you.</p>
  <div class="row"><button class="big" onclick="playSolo()">Solo raid <small>seven nights, earn apples</small></button><button class="big alt" onclick="mpMenu()">Together <small>duel, co-op or raccoon vs farmer</small></button></div>
  <div class="row"><button class="up" onclick="playDaily()"><b>Daily Orchard</b>${dailyBest() ? 'today\'s best ' + dailyBest() : 'same orchard for everyone today'}</button><button class="up" onclick="howTo()"><b>How to play</b></button></div>
  <div class="row"><button onclick="leaveHomeScreen()">Back outside</button></div>`, 'hut');
}
function claimMail() {
  if (HOME.mail === todayKey()) return pop(MAIL.x, MAIL.y - 70, 'nothing new today', '#cfd8e6');
  HOME.mail = todayKey(); payApples(MAIL_GIFT); pop(MAIL.x, MAIL.y - 70, '+' + MAIL_GIFT + ' apples: a gift from the orchard', '#9be37f');
}
function plotScreen() {
  const need = COTTAGE_PRICE - HOME.apples, ic = HOME_SRC.cottage;
  homeScreen(`<h1>Build a cottage</h1><p class="tag">A place of your own, right here on the plot.</p>
  <div class="cards"><div class="card" style="text-align:center">${ic ? `<img class="ico" style="float:none;image-rendering:pixelated;margin:0 auto 6px;display:block" src="${ic.src}" width="${ic.w}" height="${ic.h}" alt="">` : ''}<b>Cottage</b>Log walls, a covered porch and a stone chimney. Furniture, a garden and more are coming soon.</div></div>
  <div class="row">${need <= 0 ? `<button class="big" onclick="buyCottage()">Build it <small>${COTTAGE_PRICE} apples (you have ${HOME.apples})</small></button>` : `<button class="big" disabled style="opacity:.5">${COTTAGE_PRICE} apples <small>${need} more to go (you have ${HOME.apples})</small></button>`}<button onclick="leaveHomeScreen()">Not yet</button></div>
  <p class="lbl">Earn apples by raiding at the Raid Hut. Everything you bank counts, even if you are caught.</p>`, 'plot');
}
function buyCottage() { if (HOME.house || !spendApples(COTTAGE_PRICE)) return plotScreen(); HOME.house = 1; homeSave(); obs = homeObs(); HOME_GROUND = null; leaveHomeScreen(); pop(HOUSE.x, HOUSE.y - 120, 'Welcome home!', '#ffd23f', true); fxBurst(HOUSE.x, HOUSE.y - 60, 40, { col: ['#ffd23f', '#fff6a8', '#fff', '#ff8a7a'], k: 'spark', s1: 220, up: 60, l1: 1.1, r1: 5 }); fxRing(HOUSE.x, HOUSE.y - 40, '#ffe9a8', 150, 0.8); }
function houseScreen() {
  homeScreen(`<h1>Your cottage</h1><p class="tag">Warm lights, a chimney, and plenty of room.</p><div class="cards"><div class="card"><b>Coming soon</b>Furniture to buy and place, a garden for seeds, and neighbours to meet. Keep raiding: your apples are saved.</div></div><div class="row"><button onclick="leaveHomeScreen()">Back outside</button></div>`, 'house');
}
let skinTab = 'raccoon';
const SKTHUMB = {};
function skinThumb(role, id) {                                 // a small picture of the skin for its button (cached once the sheet is ready)
  const k = role + ':' + id; if (SKTHUMB[k]) return SKTHUMB[k]; const sd = skinDef(role, id); if (sd && sd.art && SKIN_SRC[sd.art]) return SKIN_SRC[sd.art].src;
  const sh = skinSheet(role, role, id); if (!sh || !sh.naturalWidth) return ''; const c = document.createElement('canvas'), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (role === 'raccoon') { c.width = 80; c.height = 85; drawRacFrame(x, sh, 0, 0, 0, 80, 85); } else { c.width = 46; c.height = 82; x.drawImage(sh, 0, 0, 46, 82); }
  return (SKTHUMB[k] = c.toDataURL());
}
function mirrorScreen(tab) {
  if (tab) skinTab = tab; const R = skinTab, cur = HOME.skins[R];
  const rows = SKINS[R].map(s => { const own = HOME.owned[R].includes(s.id), on = cur === s.id, img = `<img src="${skinThumb(R, s.id)}" alt="">`, tag = s.rare ? `<em class="rare">${s.rare}</em>` : '';
    if (own) return `<button class="up shopi skin${on ? ' on' : ''}" onclick="wearSkin('${R}','${s.id}')">${img}<b>${esc(s.name)}</b>${tag}${on ? 'Wearing' : 'Wear'}</button>`;
    const need = !skinNeedOk(s), can = !need && HOME.apples >= s.price;
    return `<button class="up shopi skin" ${can ? '' : 'disabled'} onclick="buySkin('${R}','${s.id}')">${img}<b>${esc(s.name)}</b>${tag}${s.price} apples${need ? `<small>${esc(skinNeedText(s))}</small>` : ''}</button>`; }).join('');
  homeScreen(`<h1>Mirror</h1><p class="tag">Skins are how you look in every raid. You have ${HOME.apples} apples${R === 'raccoon' ? ` and ${homeWins()} raid${homeWins() === 1 ? '' : 's'} won` : ''}.</p>
  <div class="row"><div class="seg"><button class="${R === 'raccoon' ? 'on' : ''}" onclick="mirrorScreen('raccoon')">Raccoon</button><button class="${R === 'farmer' ? 'on' : ''}" onclick="mirrorScreen('farmer')">Farmer</button></div></div>
  <div class="mirrorbox"><canvas id="skprev" width="150" height="190"></canvas><div class="row shopgrid skingrid">${rows}</div></div>
  <div class="row"><button class="up" onclick="wardrobe()"><b>Wardrobe</b>hats, scarves, trails</button><button onclick="leaveHomeScreen()">Back outside</button></div>`, 'mirror');
  const cv2 = $('skprev'); if (!cv2) return; const c = cv2.getContext('2d'); c.imageSmoothingEnabled = false; c.save(); c.translate(75, 172); c.scale(1.9, 1.9);
  if (R === 'raccoon') { const sh = skinSheet('raccoon', 'raccoon', cur); if (sh && sh.naturalWidth) drawRacFrame(c, sh, 0, -32, -64, 64, 68); drawCosmetics(c, myCos()); } else { const sh = skinSheet('farmer', 'farmer', cur); if (sh && sh.naturalWidth) c.drawImage(sh, -23 * 0.9, -82 * 0.9, 46 * 0.9, 82 * 0.9); } c.restore();
  if (R === 'raccoon' && skinDef('raccoon', cur) && skinDef('raccoon', cur).art && !skinPose(skinDef('raccoon', cur).art)) setTimeout(() => { if ($('ov').dataset.screen === 'mirror') mirrorScreen(); }, 120);     // redraw once the picture has loaded
}
function wearSkin(role, id) { if (!HOME.owned[role].includes(id)) return; HOME.skins[role] = id; homeSave(); mirrorScreen(); }
function buySkin(role, id) { const s = skinDef(role, id); if (!s || HOME.owned[role].includes(id) || !skinNeedOk(s) || !spendApples(s.price)) return mirrorScreen(); HOME.owned[role].push(id); HOME.skins[role] = id; homeSave(); mirrorScreen(); }
/* ----- the homestead menu and the save code ----- */
function homeMenu() {
  if (state !== 'home') return; settingsOpen = false; for (const k in keys) keys[k] = false; drag = null; wheel = null;
  homeScreen(`<h1>Homestead</h1><div class="row"><button class="big" onclick="leaveHomeScreen()">Back outside</button></div>
  <div class="row"><button class="up" onclick="howTo()"><b>How to play</b></button><button class="up" onclick="controls()"><b>Controls</b></button><button class="up" onclick="soundScreen()"><b>Sound</b></button><button class="up" onclick="collection()"><b>Collection</b>${found().length} of ${DISCOVERIES.length + FARMER_FINDS.length}</button></div>
  ${tipsRow()}${isTouch ? touchRow() : ''}<div class="row"><button class="up" onclick="settingsScreen('home')"><b>Settings</b>save code, clear data</button><button class="up" onclick="toMenu()"><b>Title screen</b></button></div>`, 'homemenu');
}
function saveCode() { const d = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (HOME_KEYS_OK(k) && k !== 'raidPack') d[k] = localStorage.getItem(k); } } catch (e) {} return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, d })))); }
function loadSaveCode(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(String(code).trim())))); if (!o || o.v !== 1 || typeof o.d !== 'object') return false; const keys2 = Object.keys(o.d); if (!keys2.length || keys2.length > 60) return false;
    for (const k of keys2) { if (!HOME_KEYS_OK(k) || typeof o.d[k] !== 'string' || o.d[k].length > 300000) return false; JSON.parse(o.d[k]); }
    keys2.forEach(k => localStorage.setItem(k, o.d[k])); return true;
  } catch (e) { return false; }
}
function saveCodeScreen(msg) {
  (settingsOpen && settingsFrom !== 'home' ? show : homeScreen)(`<h1>Save code</h1><p class="tag">This text holds your homestead, collection and settings. Copy it somewhere safe to move to another device or browser.</p>
  <textarea id="scode" readonly rows="4" style="width:min(520px,90%);font:12px monospace;border-radius:8px;padding:8px">${esc(saveCode())}</textarea>
  <div class="row"><button class="up" onclick="navigator.clipboard&&navigator.clipboard.writeText($('scode').value);this.querySelector('b').textContent='Copied'"><b>Copy</b></button></div>
  <p class="lbl">To load a save code, paste it here. This replaces what is saved in this browser.</p>
  <textarea id="sload" rows="3" style="width:min(520px,90%);font:12px monospace;border-radius:8px;padding:8px" placeholder="paste a save code"></textarea>
  <div class="row"><button class="up" onclick="doLoadCode()"><b>Load</b></button><button onclick="settingsOpen ? settingsScreen() : homeMenu2()">Back</button></div>${msg ? `<p class="lbl" style="color:#ffb3a8">${esc(msg)}</p>` : ''}`, 'savecode');
}
const homeMenu2 = () => { state = 'home'; homeMenu(); };
function doLoadCode() { if (loadSaveCode($('sload').value)) location.reload(); else saveCodeScreen('That does not look like a valid save code.'); }
/* ----- settings: the save code and clearing everything (with an "are you sure?" step) ----- */
let settingsFrom = 'title', settingsOpen = false;          // settingsOpen: Back on Controls / Sound / Save code returns to Settings
function settingsBack() { settingsOpen = false; if (settingsFrom === 'home') homeMenu2(); else titleScreen(); }
function settingsScreen(from) {
  if (from) settingsFrom = from; menuFrom = settingsFrom === 'home' ? 'home' : 'title'; settingsOpen = true;
  const html = `<h1>Settings</h1>
  <div class="row"><button class="up" onclick="controls()"><b>Controls</b></button><button class="up" onclick="soundScreen()"><b>Sound</b></button><button class="up" onclick="saveCodeScreen()"><b>Save code</b>move your progress to another device</button></div>
  <div class="row"><button class="up danger" id="clearbtn" onclick="clearDataScreen()"><b>Clear data and progress</b>start again from nothing</button></div>
  <div class="row"><button onclick="settingsBack()">Back</button></div>`;
  if (settingsFrom === 'home') homeScreen(html, 'settings'); else show(html, 'settings');
}
const CLEAR_KEY = k => /^raid/.test(k);                     // everything this game keeps in the browser starts with "raid"
function clearDataScreen() {
  const html = `<h1>Clear everything?</h1><p class="tag">This deletes all your progress in this browser and cannot be undone.</p>
  <div class="cards"><div class="card"><b>You will lose</b>${HOME.apples} apples, your cottage and skins, your collection and keepsakes, hats and badges, daily and duel records, your best score, and your controls and sound settings.</div></div>
  <p class="lbl">Want a backup first? Copy your save code in Settings.</p>
  <div class="row"><button class="big danger" id="clearyes" onclick="doClearData()">Yes, clear everything <small>start again from nothing</small></button><button class="big alt" onclick="settingsScreen()">Keep my progress</button></div>`;
  if (settingsFrom === 'home') homeScreen(html, 'clear'); else show(html, 'clear');
}
function doClearData() {
  try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (CLEAR_KEY(k)) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); } catch (e) {}
  window.__cleared = true; location.reload();
}
