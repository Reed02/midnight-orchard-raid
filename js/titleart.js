/* ===== TITLE ART =====
   The title screen is a painted night scene made from the game's own sprites: a raccoon hiding behind a bush with full cheeks while the farmer's lantern
   sweeps past. It is drawn live on a canvas behind the menu (twinkling stars, drifting clouds, fireflies), and re-composed for wide screens, where the menu
   moves to the right. Everything is positioned in units of the screen height, so it fits any screen. */
const TA = { raf: 0, cv: null, t0: 0, stars: null, flies: null, tint: {} };
function taRng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function taTint(key, col) {                                   // a darker copy of a sprite (for things far away)
  const im = IMG[key]; if (!im || !im.complete || !im.naturalWidth) return null; const k = key + col; if (TA.tint[k]) return TA.tint[k];
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (TA.tint[k] = c);
}
function stopTitleArt() { if (TA.raf) cancelAnimationFrame(TA.raf); TA.raf = 0; if (TA.cv) { TA.cv.remove(); TA.cv = null; } const o = $('ov'); if (o) o.classList.remove('art'); }
function startTitleArt() {
  const o = $('ov'); stopTitleArt(); const c = document.createElement('canvas'); c.id = 'tart'; o.insertBefore(c, o.firstChild); o.classList.add('art'); TA.cv = c; TA.t0 = performance.now();
  const frame = now => {
    if (!TA.cv || o.dataset.screen !== 'title' || o.style.display === 'none') return stopTitleArt();
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(2, Math.round(o.clientWidth * dpr)), h = Math.max(2, Math.round(o.clientHeight * dpr)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    try { drawTitleArt(c.getContext('2d'), w, h, (now - TA.t0) / 1000); } catch (e) { console.error(e); } TA.raf = requestAnimationFrame(frame);
  };
  TA.raf = requestAnimationFrame(frame); fitOverlay();                  // the menu is laid out differently over the art: measure it again
}
function drawTitleArt(c, w, h, tm) {
  const wide = w / h > 1.15, tall = w / h < 0.9, gy = tall ? 0.6 : 0.84, sx0 = wide ? w * 0.02 : 0, sx1 = wide ? w * 0.62 : w, sw = sx1 - sx0, u = Math.min(h / 600, sw / 520), hz = h * (wide ? 0.6 : tall ? 0.42 : 0.55), cx = (sx0 + sx1) / 2;
  c.imageSmoothingEnabled = false; const have = k => IMG[k] && IMG[k].complete && IMG[k].naturalWidth;
  // ---- sky
  let gr = c.createLinearGradient(0, 0, 0, hz + 40 * u); gr.addColorStop(0, '#04061a'); gr.addColorStop(0.5, '#12204c'); gr.addColorStop(1, '#5b4a8c'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  if (!TA.stars) { const r = taRng(7); TA.stars = Array.from({ length: 170 }, () => ({ x: r(), y: r() * 0.9, r: 0.6 + r() * 1.6, p: r() * 6 })); TA.flies = Array.from({ length: 34 }, () => ({ x: r(), y: 0.55 + r() * 0.4, a: r() * 6, s: 0.2 + r() * 0.5 })); }
  for (const s of TA.stars) { c.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(tm * 1.3 + s.p))) * (1 - s.y * 0.6); c.fillStyle = '#fff'; c.fillRect(Math.round(s.x * w), Math.round(s.y * hz), s.r * Math.max(1, u * 1.2), s.r * Math.max(1, u * 1.2)); } c.globalAlpha = 1;
  // ---- moon
  const mx = wide ? w * 0.47 : w * 0.76, my = h * (wide ? 0.22 : 0.27), mr = 58 * u; gr = c.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4.2); gr.addColorStop(0, 'rgba(255,244,190,.5)'); gr.addColorStop(1, 'rgba(255,244,190,0)'); c.fillStyle = gr; c.fillRect(mx - mr * 4.2, my - mr * 4.2, mr * 8.4, mr * 8.4);
  c.fillStyle = '#fff6cf'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.fillStyle = 'rgba(214,196,140,.55)'; [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.3], [-0.1, 0.45, 0.16], [0.42, -0.35, 0.12]].forEach(k => { c.beginPath(); c.arc(mx + k[0] * mr, my + k[1] * mr, k[2] * mr, 0, 7); c.fill(); });
  // ---- clouds drifting past the moon
  c.globalAlpha = 0.5; for (let i = 0; i < 4; i++) { const cl = taTint('clouds', 'rgba(70,70,130,.55)'); const x = ((tm * (6 + i * 3) + i * w * 0.31) % (w + 300 * u)) - 150 * u, y = h * (0.1 + i * 0.09); if (cl) c.drawImage(cl, 0, 0, cl.width / 2, cl.height / 2, x, y, 190 * u, 60 * u); } c.globalAlpha = 1;
  // ---- far hills with the farm
  c.fillStyle = '#1a2455'; c.beginPath(); c.moveTo(0, hz + 30 * u); for (let x = 0; x <= w; x += 12) c.lineTo(x, hz - 38 * u + Math.sin(x / (170 * u)) * 22 * u + Math.sin(x / (61 * u) + 1) * 7 * u); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  const bx = sx0 + sw * 0.16, by = hz - 26 * u;                               // the barn and the farmhouse, one window lit
  c.fillStyle = '#0d1230'; c.fillRect(bx, by - 26 * u, 40 * u, 26 * u); c.beginPath(); c.moveTo(bx - 4 * u, by - 26 * u); c.lineTo(bx + 20 * u, by - 44 * u); c.lineTo(bx + 44 * u, by - 26 * u); c.fill(); c.fillRect(bx + 56 * u, by - 20 * u, 30 * u, 20 * u); c.beginPath(); c.moveTo(bx + 52 * u, by - 20 * u); c.lineTo(bx + 71 * u, by - 34 * u); c.lineTo(bx + 90 * u, by - 20 * u); c.fill();
  const wg = 0.75 + 0.25 * Math.sin(tm * 3.1); c.fillStyle = `rgba(255,214,110,${wg})`; c.fillRect(bx + 64 * u, by - 14 * u, 7 * u, 8 * u); gr = c.createRadialGradient(bx + 67 * u, by - 10 * u, 2, bx + 67 * u, by - 10 * u, 30 * u); gr.addColorStop(0, `rgba(255,214,110,${0.35 * wg})`); gr.addColorStop(1, 'rgba(255,214,110,0)'); c.fillStyle = gr; c.fillRect(bx + 30 * u, by - 45 * u, 75 * u, 70 * u);
  c.fillStyle = '#10304a'; c.beginPath(); c.moveTo(0, hz + 60 * u); for (let x = 0; x <= w; x += 12) c.lineTo(x, hz - 6 * u + Math.sin(x / (120 * u) + 2) * 14 * u); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  // ---- the tree line, dim and far away
  const td = taTint('tree', 'rgba(10,18,52,.6)'); if (td) for (let i = -1; i < Math.ceil(w / (84 * u)) + 1; i++) { const x = i * 84 * u + ((i * 37) % 23) * u, sc = 1.15 + ((i * 53) % 7) / 30, sway = Math.sin(tm * 0.8 + i) * 1.2 * u; c.drawImage(td, x + sway, hz - 6 * u - 100 * sc * u + 28 * u, 90 * sc * u, 100 * sc * u); }
  // ---- the ground
  gr = c.createLinearGradient(0, hz + 10 * u, 0, h); gr.addColorStop(0, '#244f3a'); gr.addColorStop(0.5, '#1a3d2c'); gr.addColorStop(1, '#0d2219'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, hz + 40 * u); for (let x = 0; x <= w; x += 12) c.lineTo(x, hz + 18 * u + Math.sin(x / (95 * u) + 4) * 6 * u); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  c.fillStyle = 'rgba(120,200,110,.18)'; const gr2 = taRng(3); for (let i = 0; i < 90; i++) { const x = gr2() * w, y = hz + 40 * u + gr2() * (h - hz - 40 * u); c.fillRect(x, y, 2 * u, 5 * u * (0.5 + gr2() * 0.8)); }
  // ---- mid trees with apples, a little closer
  const tm1 = taTint('tree', 'rgba(8,14,40,.28)'); if (tm1) [[0.06, 0.9], [0.9, 1.0], [0.52, 0.8]].forEach(([fx, sc], i) => { const x = sx0 + sw * fx - 60 * u * sc, y = hz + 52 * u, s = 1.9 * sc * u; c.drawImage(tm1, x + Math.sin(tm * 0.9 + i) * 1.6 * u, y - 100 * s + 40 * u, 90 * s, 100 * s); c.fillStyle = '#e24b3b'; [[18, 30], [50, 24], [70, 46], [34, 52]].forEach(a => { c.beginPath(); c.arc(x + a[0] * s, y - 100 * s + 40 * u + a[1] * s, 3.2 * u * sc, 0, 7); c.fill(); }); });
  // ---- the farmer, his dog and the sweeping lantern
  const fx = sx0 + sw * 0.8, fy = h * (gy + 0.02), fs = 2.1 * u, lx = fx - 12 * fs, ly = fy - 44 * fs, ang = Math.PI + 0.12 + 0.36 * Math.sin(tm * 0.62), len = 400 * u;
  c.save(); c.globalCompositeOperation = 'lighter'; gr = c.createRadialGradient(lx, ly, 4, lx, ly, len); gr.addColorStop(0, 'rgba(255,226,140,.5)'); gr.addColorStop(1, 'rgba(255,226,140,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(lx, ly); c.arc(lx, ly, len, ang - 0.17, ang + 0.17); c.closePath(); c.fill(); c.restore();
  if (have('farmer')) c.drawImage(IMG.farmer, fx - 23 * fs, fy - 82 * fs, 46 * fs, 82 * fs);
  if (have('dog')) { const ds = 1.45 * u, dx = fx - 90 * u + Math.sin(tm * 1.1) * 6 * u, dy = fy + 4 * u; c.save(); c.translate(dx, dy); c.scale(-1, 1); c.drawImage(IMG.dog, -32 * ds, -98 * ds, 64 * ds, 98 * ds); c.restore(); }
  // ---- the raccoon beside the bush: it ducks behind the bush and looks startled while the lantern passes over it
  const rx = sx0 + sw * 0.34, ry = h * gy, rs = 2.3 * u, toR = Math.atan2(ry - 60 * rs - ly, rx - lx), lit = Math.abs(((ang - toR + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.1;
  TA.duck = (TA.duck || 0) + ((lit ? 1 : 0) - (TA.duck || 0)) * 0.12; const dk = TA.duck, chew = Math.floor(tm * 4) % 2, bob = Math.sin(tm * 2.2) * 1.5 * u;
  const sheet = have('raccoonCheeks') ? IMG.raccoonCheeks : have('raccoon') ? IMG.raccoon : null, fr = lit ? 8 : 6 + chew;
  if (sheet) c.drawImage(sheet, (sheet === IMG.raccoon ? 0 : fr) * 80, 0, 80, 85, rx - 40 * rs - dk * 95 * u, ry - 85 * rs + 12 * rs + dk * 26 * u + bob * (1 - dk), 80 * rs, 85 * rs);
  if (have('bush')) { const bs = 2.1 * u; c.drawImage(IMG.bush, rx - 44 * bs - 122 * u, ry - 94 * bs + 34 * u, 88 * bs, 94 * bs); }
  // ---- stolen apples at the raccoon's feet, one of them golden
  [[-92, 22, 0], [-70, 30, 0], [96, 24, 0], [118, 12, 1], [64, 36, 0]].forEach(([ox, oy, gold]) => { const ax = rx + ox * u, ay = ry + oy * u; c.fillStyle = gold ? '#f2c230' : '#d8392f'; c.beginPath(); c.arc(ax, ay, 7 * u, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(ax - 3 * u, ay - 4 * u, 2.4 * u, 2.4 * u); c.fillStyle = '#2f7a2f'; c.fillRect(ax, ay - 10 * u, 2 * u, 4 * u); if (gold) { const gl = 0.5 + 0.5 * Math.sin(tm * 4); c.fillStyle = `rgba(255,248,190,${gl})`; c.fillRect(ax - 1 * u, ay - 15 * u, 2 * u, 8 * u); c.fillRect(ax - 4 * u, ay - 12 * u, 8 * u, 2 * u); } });
  // ---- fireflies
  for (const f of TA.flies) { const x = ((f.x + Math.sin(tm * f.s + f.a) * 0.03) * w), y = (f.y + Math.cos(tm * f.s * 0.8 + f.a) * 0.025) * h, a = 0.3 + 0.7 * Math.abs(Math.sin(tm * 1.6 + f.a * 3)); gr = c.createRadialGradient(x, y, 0, x, y, 9 * u); gr.addColorStop(0, `rgba(220,255,140,${a})`); gr.addColorStop(1, 'rgba(220,255,140,0)'); c.fillStyle = gr; c.fillRect(x - 9 * u, y - 9 * u, 18 * u, 18 * u); }
  // ---- vignette and a shade at the bottom so the menu reads
  gr = c.createRadialGradient(w / 2, h * 0.5, h * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75); gr.addColorStop(0, 'rgba(0,0,10,0)'); gr.addColorStop(1, 'rgba(0,0,10,.38)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  if (!wide) { gr = c.createLinearGradient(0, h * 0.62, 0, h); gr.addColorStop(0, 'rgba(6,10,20,0)'); gr.addColorStop(1, 'rgba(6,10,20,.82)'); c.fillStyle = gr; c.fillRect(0, h * 0.62, w, h * 0.38); } else { gr = c.createLinearGradient(w * 0.58, 0, w, 0); gr.addColorStop(0, 'rgba(6,10,20,0)'); gr.addColorStop(1, 'rgba(6,10,20,.8)'); c.fillStyle = gr; c.fillRect(w * 0.58, 0, w * 0.42, h); }
  // ---- the title
  const fit = (txt, maxW, base) => { c.font = `900 ${base}px "Trebuchet MS",Verdana,sans-serif`; const m = c.measureText(txt).width; return base * Math.min(1, maxW / m); };
  const ty = h * (wide ? 0.13 : 0.1), s1 = fit('MIDNIGHT', sw * 0.9, 74 * u), s2 = fit('ORCHARD RAID', sw * 0.94, 58 * u);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  [['MIDNIGHT', s1, ty + s1 * 0.8], ['ORCHARD RAID', s2, ty + s1 * 0.8 + s2 * 1.12]].forEach(([txt, s, y], i) => {
    c.font = `900 ${s}px "Trebuchet MS",Verdana,sans-serif`; if ('letterSpacing' in c) c.letterSpacing = (s * 0.04) + 'px';
    c.shadowColor = 'rgba(255,190,70,.55)'; c.shadowBlur = s * 0.35; c.lineWidth = s * 0.16; c.strokeStyle = '#2a1208'; c.strokeText(txt, cx, y); c.shadowBlur = 0;
    const tg = c.createLinearGradient(0, y - s * 0.8, 0, y); tg.addColorStop(0, i ? '#ffd9a0' : '#fff6c4'); tg.addColorStop(1, i ? '#ff8a3c' : '#ffc23d'); c.fillStyle = tg; c.fillText(txt, cx, y);
  });
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}
