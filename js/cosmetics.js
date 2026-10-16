/* ===== WARDROBE =====
   Hats, scarves and trails for the raccoon, unlocked by badges (finished night challenges, which either role can earn). Nothing here changes how the
   game plays. In multiplayer the other player sees what your raccoon wears. Add one by adding an entry: need = ['total', n] (n badges in all) or
   [challengeId, n] (n times finishing that challenge). draw(c) paints with the origin at the anchor (top of the head / middle of the neck), 1 unit = 1 pixel. */
const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const tri = (c, col, a, b, d) => { c.fillStyle = col; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill(); };
const dot = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
const COSMETICS = {
  hat: [
    { id: 'straw',  name: 'Straw Hat',    need: ['total', 1],  draw: c => { rect(c, '#b8934a', -15, 0, 30, 1); rect(c, '#e6c36a', -15, -3, 30, 3); rect(c, '#efd27f', -8, -11, 16, 8); rect(c, '#b5482a', -8, -5, 16, 2); } },
    { id: 'leaf',   name: 'Leaf Crown',   need: ['bush', 2],   draw: c => { rect(c, '#3f7d32', -10, -2, 20, 2); [[-9, -5], [-4, -8], [2, -8], [7, -5]].forEach(p => { c.fillStyle = '#58b043'; c.beginPath(); c.ellipse(p[0], p[1], 4, 2.2, p[0] * 0.08, 0, 7); c.fill(); }); } },
    { id: 'party',  name: 'Party Cone',   need: ['total', 5],  draw: c => { tri(c, '#e84a8a', [-8, 0], [8, 0], [0, -22]); tri(c, '#ffd23f', [-4, -9], [4, -9], [0, -16]); dot(c, '#ffd23f', 0, -23, 3); } },
    { id: 'tophat', name: 'Top Hat',      need: ['gold', 3],   draw: c => { rect(c, '#1b1b22', -12, -2, 24, 3); rect(c, '#26262e', -8, -16, 16, 14); rect(c, '#b5482a', -8, -6, 16, 3); } },
    { id: 'pumpkin',name: 'Pumpkin Hat',  need: ['shaker', 4], draw: c => { c.fillStyle = '#f08a24'; c.beginPath(); c.ellipse(0, -6, 10, 7, 0, 0, 7); c.fill(); rect(c, '#3f7d32', -1, -15, 3, 5); rect(c, '#3a2410', -5, -8, 3, 3); rect(c, '#3a2410', 2, -8, 3, 3); rect(c, '#3a2410', -3, -3, 6, 2); } },
    { id: 'wizard', name: 'Starry Hat',   need: ['ghost', 3],  draw: c => { c.fillStyle = '#c9b8ff'; c.beginPath(); c.ellipse(0, 0, 13, 3, 0, 0, 7); c.fill(); tri(c, '#4b3aa8', [-9, -1], [9, -1], [3, -27]); dot(c, '#ffe27a', -2, -8, 1.6); dot(c, '#ffe27a', 3, -15, 1.6); dot(c, '#ffe27a', 0, -20, 1.2); } },
    { id: 'crown',  name: 'Gold Crown',   need: ['total', 25], draw: c => { rect(c, '#f2c230', -9, -6, 18, 6); tri(c, '#f2c230', [-9, -6], [-5, -6], [-9, -13]); tri(c, '#f2c230', [-4, -6], [4, -6], [0, -15]); tri(c, '#f2c230', [5, -6], [9, -6], [9, -13]); dot(c, '#d62828', 0, -3, 1.6); dot(c, '#3b7bd6', -5, -3, 1.2); dot(c, '#3b7bd6', 5, -3, 1.2); } },
  ],
  neck: [
    { id: 'bandana',name: 'Red Bandana',  need: ['gotcha', 2], draw: c => { tri(c, '#d33a3a', [-12, -2], [12, -2], [0, 11]); dot(c, '#fff', -4, 1, 1); dot(c, '#fff', 4, 1, 1); dot(c, '#fff', 0, 6, 1); } },
    { id: 'scarf',  name: 'Winter Scarf', need: ['quick', 2],  draw: c => { for (let i = 0; i < 6; i++) rect(c, i % 2 ? '#f2f2f2' : '#2e8b57', -12 + i * 4, -3, 4, 5); rect(c, '#2e8b57', 6, 2, 5, 5); rect(c, '#f2f2f2', 6, 7, 5, 3); rect(c, '#2e8b57', 6, 10, 5, 3); } },
    { id: 'bow',    name: 'Bow Tie',      need: ['cross', 2],  draw: c => { tri(c, '#c1272d', [0, 2], [-9, -3], [-9, 7]); tri(c, '#c1272d', [0, 2], [9, -3], [9, 7]); rect(c, '#8f1b20', -2, 0, 4, 4); } },
    { id: 'bell',   name: 'Bell Collar',  need: ['pack', 1],   draw: c => { rect(c, '#7a1f1f', -11, -2, 22, 3); dot(c, '#f2c230', 0, 5, 3.5); rect(c, '#b8930c', -3, 4, 6, 1); } },
    { id: 'medal',  name: 'Gold Medal',   need: ['total', 10], draw: c => { tri(c, '#3b7bd6', [-9, -3], [-3, -3], [1, 6]); tri(c, '#d62828', [9, -3], [3, -3], [-1, 6]); dot(c, '#f2c230', 0, 9, 5); dot(c, '#fff0a8', -1, 8, 1.8); } },
  ],
  trail: [
    { id: 'leaves', name: 'Falling Leaves', need: ['total', 4],  col: ['#d9822b', '#b5482a', '#8ab33f'], shape: 'leaf' },
    { id: 'petals', name: 'Petal Trail',    need: ['cross', 3],  col: ['#ffb6d0', '#ff8fb8', '#fff0f5'], shape: 'ell' },
    { id: 'stars',  name: 'Stardust',       need: ['ghost', 5],  col: ['#fff6a8', '#ffffff', '#cfe8ff'], shape: 'star' },
    { id: 'embers', name: 'Embers',         need: ['spot', 3],   col: ['#ff9a3c', '#ffd23f', '#ff5a2a'], shape: 'dot' },
  ],
};
const COS_SLOTS = [['hat', 'Hats'], ['neck', 'Scarves & collars'], ['trail', 'Trails']];
const cosDef = (slot, id) => id && (COSMETICS[slot] || []).find(x => x.id === id) || null;
const cosNeed = d => d.need[0] === 'total' ? `earn ${d.need[1]} badge${d.need[1] > 1 ? 's' : ''}` : `finish "${(chDef('raccoon', d.need[0]) || chDef('farmer', d.need[0]) || { name: d.need[0] }).name}" ${d.need[1]}x`;
const cosUnlocked = d => { const r = records().done; return d.need[0] === 'total' ? totalBadges() >= d.need[1] : (+r[d.need[0]] || 0) >= d.need[1]; };
const cosClean = o => { const out = {}; for (const [s] of COS_SLOTS) out[s] = o && cosDef(s, String(o[s] || '')) ? String(o[s]) : null; return out; };      // only known ids (also used on what the other player sends)
const myCos = () => { const c = cosClean(store('raidCos', {})); for (const [s] of COS_SLOTS) if (c[s] && !cosUnlocked(cosDef(s, c[s]))) c[s] = null; return c; };
const raccoonCos = () => !multi ? myCos() : myRole === 'raccoon' ? myCos() : cosClean(net.theirCos);
function cosPick(slot, id) { const c = myCos(); c[slot] = c[slot] === id ? null : id; save('raidCos', c); wardrobe(); }
function drawCosmetics(c, cos, nudge) {                    // in the raccoon's sprite space: x -4.8 is the middle of the head, y -51 the top of the head, y -25 the neck
  const n = nudge || [0, 0], nd = cosDef('neck', cos.neck), hd = cosDef('hat', cos.hat);
  if (nd) { c.save(); c.translate(-4.8 + n[0] * 0.8, -25 + n[1] * 0.8); nd.draw(c); c.restore(); }
  if (hd) { c.save(); c.translate(-4.8 + n[0] * 0.8, -51 + n[1] * 0.8); hd.draw(c); c.restore(); }
}
/* ----- trails: little particles behind a walking raccoon ----- */
const TRAILP = []; let trailAt = 0, trailPrev = 0;
function drawTrail(x, y, moving, cos) {
  const dt = Math.min(0.1, Math.max(0, t - trailPrev)); trailPrev = t; const td = cosDef('trail', cos.trail);
  if (td && moving && t > trailAt) { trailAt = t + 0.07; TRAILP.push({ x: x + rnd(-8, 8), y: y - rnd(0, 10), vx: rnd(-14, 14), vy: td.shape === 'dot' || td.shape === 'star' ? rnd(-30, -10) : rnd(-6, 10), l: 0.9, r: rnd(0, 6), c: td.col[Math.floor(rnd(0, td.col.length))], s: td.shape }); }
  for (let i = TRAILP.length - 1; i >= 0; i--) {
    const p = TRAILP[i]; p.l -= dt; if (p.l <= 0) { TRAILP.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 4;
    g.save(); g.globalAlpha = Math.min(1, p.l * 1.8); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
    if (p.s === 'star') { g.fillRect(-1, -4, 2, 8); g.fillRect(-4, -1, 8, 2); } else if (p.s === 'dot') { g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill(); } else { g.beginPath(); g.ellipse(0, 0, p.s === 'leaf' ? 4 : 3, 2, 0, 0, 7); g.fill(); }
    g.restore();
  }
  if (TRAILP.length > 80) TRAILP.splice(0, TRAILP.length - 80);
}
/* ----- the Wardrobe screen ----- */
function wardrobe() {
  const cos = myCos(), badges = totalBadges();
  const rows = COS_SLOTS.map(([slot, label]) => `<div class="row"><span class="lbl" style="min-width:92px;text-align:right">${label}</span>` + COSMETICS[slot].map(d => {
    const un = cosUnlocked(d), on = cos[slot] === d.id;
    return un ? `<button class="slot" style="${on ? 'background:var(--accent)' : ''}" onclick="cosPick('${slot}','${d.id}')">${esc(d.name)}</button>` : `<button class="slot" disabled style="opacity:.45" title="${esc(cosNeed(d))}">${esc(d.name)}<br><small>${esc(cosNeed(d))}</small></button>`;
  }).join('') + '</div>').join('');
  show(`<h1>Wardrobe</h1><p class="tag">Badges earned: ${badges}. Finish night challenges (as raccoon or farmer) to unlock more. Your friend sees what your raccoon wears.</p>
  <canvas id="cosprev" width="150" height="150" style="background:rgba(255,255,255,.08);border-radius:12px"></canvas>${rows}
  <div class="row"><button class="up" onclick="collection()"><b>Collection</b></button><button onclick="goBack()">Back</button></div>`, 'wardrobe');
  const cv2 = $('cosprev'); if (!cv2) return; const c = cv2.getContext('2d'); c.imageSmoothingEnabled = false; c.save(); c.translate(75, 138); c.scale(1.9, 1.9);
  if (IMG.raccoon && IMG.raccoon.naturalWidth) c.drawImage(IMG.raccoon, 0, 0, FW, FH, -32, -64, 64, 68); drawCosmetics(c, cos); c.restore();
}
