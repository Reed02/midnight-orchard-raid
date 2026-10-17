/* ===== RIVER LEVELS =====
   Some nights a river runs diagonally through the orchard. Nobody can walk on water: the only way across is a bridge, so the bridges become
   the choke points of the level. The river is one formula (an axis line with a gentle S-bend), so the same few numbers rebuild it on both
   players' screens. Edit LEVELS to change which nights have a river and what it looks like (hw = half width, A = how much it wiggles,
   bridges = where along the river, across = how much of the fruit is on the far bank from the den, guard = a farmer patrols the bridge).
   Art: ASSETS.riverWater / bridge / reeds (made by tools/make_river_assets.py). */
const BRIDGE = { angle: -35.8 * Math.PI / 180, halfLen: 88, halfWid: 28, w: 157, h: 113 };       // measured from the bridge sprite
const RIVER_AXIS = 26 * Math.PI / 180;                                                           // the river runs at this angle, like the art
const LEVELS = {
  2: { name: 'The Creek',     desc: 'Two bridges, and most of the fruit is across the water.',       fx: 0, fy: 0, hw: 62, A: 24, bridges: [-250, 190], across: 0.7 },
  4: { name: 'Mill Run',      desc: 'One bridge, and a farmer is guarding it.',                       fx: 1, fy: 0, hw: 70, A: 34, bridges: [-60],       across: 0.75, guard: true },
  6: { name: 'Last Crossing', desc: 'A wide river, one bridge, and a long way home.',                 fx: 1, fy: 1, hw: 78, A: 42, bridges: [200],       across: 0.8,  guard: true },
};
for (const k in LEVELS) LEVELS[k].key = +k;
let RIVER = null, LV = null;
const NOLEVELS = typeof location !== 'undefined' && /clear/.test(location.hash || '');            // #clear in the address: plain nights (the tests use it)
function levelFor(n) { return NOLEVELS ? null : LEVELS[n] || (n > CONFIG.nightsToWin && n % 2 === 0 ? LEVELS[[2, 4, 6][(n / 2) % 3]] : null); }
function makeRiver(p) {
  const sx = p.fx ? -1 : 1, sy = p.fy ? -1 : 1, d = { x: sx * Math.cos(RIVER_AXIS), y: sy * Math.sin(RIVER_AXIS) }, n = { x: -d.y, y: d.x };
  const R = { p, d, n, cx: W / 2 + p.ox, cy: H / 2 + p.oy, hw: p.hw, A: p.A, ph: p.ph, k: 2 * Math.PI / 520, bridges: [], deco: [] };
  const u = { x: sx * Math.cos(BRIDGE.angle), y: sy * Math.sin(BRIDGE.angle) }, v = { x: -u.y, y: u.x };
  const s = Math.max(1, ((p.hw + 9 + 0.2 * p.A) / 0.88 + 10) / BRIDGE.halfLen), L = BRIDGE.halfLen * s, Wd = BRIDGE.halfWid * s;                  // wider river = bigger bridge
  for (const a0 of p.br) {                                  // bridges sit where the river runs straight, so the sprite really spans it
    const j = Math.round((R.k * a0 + R.ph - Math.PI / 2) / Math.PI), a = (Math.PI / 2 + j * Math.PI - R.ph) / R.k, m = R.A * Math.sin(R.k * a + R.ph);
    const x = R.cx + d.x * a + n.x * m, y = R.cy + d.y * a + n.y * m, at = (f) => ({ x: x + u.x * f, y: y + u.y * f });
    R.bridges.push({ a, x, y, u, v, L, Wd, s, fx: p.fx, fy: p.fy, e1: at(-(L - 12)), e2: at(L - 12), land1: at(-(L + 30)), land2: at(L + 30) });
  }
  RIVER = R; for (const b of R.bridges) { b.side1 = riverSide(b.land1.x, b.land1.y); b.side2 = riverSide(b.land2.x, b.land2.y); }
  const r = mulberry32(Math.round(p.ph * 1000) + p.hw * 7 + p.fx * 3 + p.fy * 5);       // reeds along the banks (the same on both screens)
  for (let a = -1000; a <= 1000; a += 66) for (const sd of [-1, 1]) if (r() < 0.55) { const e = riverEdge(R, a + r() * 40, sd), off = (r() - 0.45) * 16, o = { x: e.x + n.x * sd * off, y: e.y + n.y * sd * off, v: Math.floor(r() * 4) }; if (!R.bridges.some(b => Math.hypot(o.x - b.x, o.y - b.y) < b.L + 40)) R.deco.push(o); }
  return R;
}
function riverEdge(R, a, s) { const m = R.A * Math.sin(R.k * a + R.ph), hw = R.hw + 7 * Math.sin(a / 41 + R.ph * 2); return { x: R.cx + R.d.x * a + R.n.x * (m + s * hw), y: R.cy + R.d.y * a + R.n.y * (m + s * hw) }; }
function rq(x, y) { const R = RIVER, dx = x - R.cx, dy = y - R.cy, a = dx * R.d.x + dy * R.d.y; rq.hw = R.hw + 7 * Math.sin(a / 41 + R.ph * 2); return dx * R.n.x + dy * R.n.y - R.A * Math.sin(R.k * a + R.ph); }   // signed distance from the middle of the river
function inRiverM(x, y, m = 0) { if (!RIVER) return false; const q = rq(x, y); return Math.abs(q) < rq.hw + m; }
function bridgeAt(x, y, m = 0) { if (!RIVER) return null; for (const b of RIVER.bridges) { const dx = x - b.x, dy = y - b.y; if (Math.abs(dx * b.u.x + dy * b.u.y) < b.L + m && Math.abs(dx * b.v.x + dy * b.v.y) < b.Wd + m) return b; } return null; }
const DECK_PAD = 6;                                          // the walkable deck is this much wider and longer than the planks you see: a body is not a point, so the rail forgives a little
const inWater = (x, y, m = 0) => inRiverM(x, y, m) && !bridgeAt(x, y, DECK_PAD);
function riverSide(x, y) { if (!RIVER) return 0; const q = rq(x, y); return Math.abs(q) < rq.hw ? 0 : q > 0 ? 1 : -1; }     // which bank (-1 / 1), or 0 on the water / a bridge
const denSide = () => riverSide(den.x, den.y) || 1;
function pushWater(e) {                                     // nobody walks on water: slide along the bank, or go back to the last dry spot
  if (!inWater(e.x, e.y, 2)) { e.lx = e.x; e.ly = e.y; return; }
  if (e.lx !== undefined) {
    const dx = e.x - e.lx, dy = e.y - e.ly, q = rq(e.lx, e.ly), gx = rq(e.lx + 2, e.ly) - q, gy = rq(e.lx, e.ly + 2) - q, gl = Math.hypot(gx, gy) || 1, sg = q < 0 ? 1 : -1;
    const w = { x: sg * gx / gl, y: sg * gy / gl }, c = dx * w.x + dy * w.y;      // w points from this bank toward the middle of the river (measured where the bank really is, it bends)
    if (c > 0) { let sx = e.lx + dx - w.x * c, sy = e.ly + dy - w.y * c; const need = rq.hw * 0 + (rq(sx, sy), rq.hw) + 2.3 - Math.abs(rq(sx, sy)); if (need > 0) { sx -= w.x * need; sy -= w.y * need; } if (!inWater(sx, sy, 2)) { e.x = sx; e.y = sy; e.lx = sx; e.ly = sy; return; } }      // a curved bank can squeeze the slide: nudge back out to a safe distance              // keep only the part of the move that runs along the bank
    const q0 = rq(e.lx, e.ly), hw0 = rq.hw;
    if (!inWater(e.x, e.ly, 2)) e.y = e.ly; else if (!inWater(e.lx, e.y, 2)) e.x = e.lx;
    else if (Math.abs(q0) > hw0 - 8 && Math.abs(q0) < hw0) { const q1 = rq(e.x, e.y), dq = (q1 < 0 ? -1 : 1) * (rq.hw + 3) - q1; e.x += RIVER.n.x * dq; e.y += RIVER.n.y * dq; }     // leaving the very end of a bridge sideways: step onto the bank
    else { e.x = e.lx; e.y = e.ly; }
    e.lx = e.x; e.ly = e.y; return;
  }
  const q = rq(e.x, e.y), dq = (q < 0 ? -1 : 1) * (rq.hw + 3) - q; e.x += RIVER.n.x * dq; e.y += RIVER.n.y * dq;                   // no remembered spot yet: step out to the nearer bank
}
function bankPoint(x, y) { const q = rq(x, y); if (Math.abs(q) >= rq.hw + 4) return { x, y }; const dq = (q < 0 ? -1 : 1) * (rq.hw + 30) - q; return { x: x + RIVER.n.x * dq, y: y + RIVER.n.y * dq }; }
/* Walking over a bridge. Characters are not pinned to the plank edges: before they step on, they line up on the bridge's centre line, and they
   walk out along it before turning toward their goal (cutting the corner at either end is what used to wedge dogs and farmers against the rail).
   A crossing is remembered per character (ROUTE) until they are clear of the far end, so the choice cannot flip back and forth at the edge. */
const ROUTE = new WeakMap();                                // character -> { b: bridge, k: end to leave by (1 or 2), lined: already on the centre line, goal: the goal is on this bridge }
function bridgeEnd(b, k) { return k === 1 ? { inn: b.e1, land: b.land1, side: b.side1, sg: -1 } : { inn: b.e2, land: b.land2, side: b.side2, sg: 1 }; }
function bridgeLocal(b, x, y) { const dx = x - b.x, dy = y - b.y; return { du: dx * b.u.x + dy * b.u.y, dv: dx * b.v.x + dy * b.v.y }; }
function nav(e, tx, ty) {                                   // where to head to reach (tx, ty): straight on the same bank, via a bridge to the other one
  if (!RIVER) return { x: tx, y: ty };
  const t0 = inRiverM(tx, ty, 4) && !bridgeAt(tx, ty, DECK_PAD) ? bankPoint(tx, ty) : { x: tx, y: ty }, sb = riverSide(t0.x, t0.y), tb = sb ? null : bridgeAt(t0.x, t0.y, DECK_PAD), on = bridgeAt(e.x, e.y, DECK_PAD), sa = on ? 0 : riverSide(e.x, e.y);
  let rt = ROUTE.get(e);
  if (rt && rt.done) {                                      // just walked off the far end: head for the goal and don't take the bridge again until well clear of it (or the goal changes bank)
    if (!RIVER.bridges.includes(rt.b) || sb !== rt.side || Math.hypot(e.x - rt.b.x, e.y - rt.b.y) > rt.b.L + 70) { ROUTE.delete(e); rt = null; } else return t0;
  } else if (rt) {                                          // is the remembered crossing still the right one?
    const X = bridgeEnd(rt.b, rt.k), N = bridgeEnd(rt.b, 3 - rt.k);
    if (!RIVER.bridges.includes(rt.b)) rt = null;
    else if (!rt.goal && Math.hypot(e.x - X.land.x, e.y - X.land.y) < 20) { ROUTE.set(e, { done: true, b: rt.b, side: X.side }); return t0; }
    else if (rt.goal ? tb !== rt.b : (!tb && sb === N.side)) { if (rt.lined && on === rt.b) { rt.k = 3 - rt.k; rt.goal = !!tb; } else rt = null; }     // the goal moved: turn back (on the deck) or give up (still on the bank)
    if (!rt) ROUTE.delete(e);
  }
  if (!rt) {
    if (on) { if (tb === on) return t0; const k = tb ? (Math.hypot(t0.x - on.e1.x, t0.y - on.e1.y) < Math.hypot(t0.x - on.e2.x, t0.y - on.e2.y) ? 1 : 2) : (on.side1 === sb ? 1 : 2); rt = { b: on, k, lined: true }; }
    else if (tb && sa) rt = { b: tb, k: tb.side1 === sa ? 2 : 1, lined: false, goal: true };      // the goal is standing on a bridge: go on from my own bank
    else if (!sa || !sb || sa === sb) return t0;
    else {
      let bd = 1e9; for (const b of RIVER.bridges) { const k = b.side1 === sa ? 2 : 1, N = bridgeEnd(b, 3 - k), X = bridgeEnd(b, k), c = Math.hypot(e.x - N.land.x, e.y - N.land.y) + 2 * b.L + Math.hypot(X.land.x - t0.x, X.land.y - t0.y); if (c < bd) { bd = c; rt = { b, k, lined: false }; } }
    }
    if (rt) ROUTE.set(e, rt); else return t0;
  }
  const X = bridgeEnd(rt.b, rt.k), N = bridgeEnd(rt.b, 3 - rt.k), q = bridgeLocal(rt.b, e.x, e.y), out = N.sg * q.du;
  if (!rt.lined && (on === rt.b || Math.hypot(e.x - N.land.x, e.y - N.land.y) < 22 || (Math.abs(q.dv) < rt.b.Wd * 0.55 && out > rt.b.L - 20 && out < rt.b.L + 70))) rt.lined = true;
  if (!rt.lined) return N.land;                             // step 1: the approach spot, in line with the bridge
  return rt.goal ? t0 : X.land;                             // step 2: along the centre line, out of the far end (or on to a goal that is on the bridge)
}
/* ----- setting up a night with a river (host) ----- */
function riverSetup() {
  LV = levelFor(night); RIVER = null; if (!LV) return;
  makeRiver({ fx: LV.fx, fy: LV.fy, ox: Math.round(lrnd(-50, 50)), oy: Math.round(lrnd(-40, 40)), A: LV.A, ph: Math.round(lrnd(0, 628)) / 100, hw: LV.hw, br: LV.bridges.map(a => a + Math.round(lrnd(-30, 30))) });
}
function riverDen() {                                       // the den goes on one bank, as far from the bridges as possible (every trip is a trek) but never at the water's edge
  const side = lrnd(0, 1) < 0.5 ? -1 : 1; let best = null, bs = -1;
  for (let n = 0; n < 300; n++) {
    const x = lrnd(CONFIG.den.margin, W - CONFIG.den.margin), y = lrnd(CONFIG.den.margin + 50, H - CONFIG.den.margin);
    if (riverSide(x, y) !== side || inRiverM(x, y, 110)) continue;
    const s = Math.min(...RIVER.bridges.map(b => Math.hypot(x - b.x, y - b.y))) + lrnd(0, 90); if (s > bs) { bs = s; best = { x, y }; }
  }
  return best || { x: RIVER.cx - RIVER.n.x * side * -300, y: RIVER.cy - RIVER.n.y * side * -300 };
}
function riverScenery() {                                   // bushes at both ends of every bridge: cover for the approach (each tries a few spots)
  for (const b of RIVER.bridges) for (const e of [-1, 1]) for (const sd of [-1, 1]) for (const [du, dv] of [[38, 62], [64, 70], [38, 96], [80, 52], [52, 120]]) {
    const x = b.x + b.u.x * e * (b.L + du) + b.v.x * sd * dv, y = b.y + b.u.y * e * (b.L + du) + b.v.y * sd * dv;
    if (x > 50 && x < W - 50 && y > 110 && y < H - 30 && !inRiverM(x, y, 40) && !bridgeAt(x, y, 30)) { obs = obs.filter(q => Math.hypot(q.x - x, q.y - y) >= q.r + 54); obs.push({ k: 'bush', x, y, r: 30 }); break; }      // cover at the bridge wins over a stray tree
  }
}
function riverPack() { return RIVER ? [RIVER.p.fx, RIVER.p.fy, RIVER.p.ox, RIVER.p.oy, RIVER.p.A, RIVER.p.ph, RIVER.p.hw, ...RIVER.p.br] : 0; }
function riverUnpack(a, lv) {                               // guest: rebuild the river from the host's numbers (checked, never trusted blindly)
  RIVER = null; LV = LEVELS[lv] || null; if (!Array.isArray(a) || a.length < 8) return;
  makeRiver({ fx: a[0] ? 1 : 0, fy: a[1] ? 1 : 0, ox: clampN(num(a[2]), -100, 100), oy: clampN(num(a[3]), -100, 100), A: clampN(num(a[4]), 0, 80), ph: clampN(num(a[5]), 0, 7), hw: clampN(num(a[6]), 30, 110), br: a.slice(7, 10).map(num) });
}
/* ----- drawing: animated water, banks, bridges and reeds (in the world, under the characters) ----- */
const RV = { pats: [] };
function waterPatterns() {
  const im = IMG.riverWater; if (!im || !im.complete || !im.naturalWidth) return null;
  if (!RV.pats.length) for (let f = 0; f < 8; f++) { const c = document.createElement('canvas'); c.width = c.height = 160; c.getContext('2d').drawImage(im, f * 160, 0, 160, 160, 0, 0, 160, 160); RV.pats.push(g.createPattern(c, 'repeat')); }
  return RV.pats[0] ? RV.pats : null;
}
function drawRiver() {
  const R = RIVER; if (!R) return; let lo = 1e9, hi = -1e9;
  for (const [x, y] of [[cam.x, cam.y], [cam.x + VW, cam.y], [cam.x, cam.y + VH], [cam.x + VW, cam.y + VH]]) { const a = (x - R.cx) * R.d.x + (y - R.cy) * R.d.y; lo = Math.min(lo, a); hi = Math.max(hi, a); }
  lo = Math.floor((lo - 80) / 16) * 16; hi += 80; const left = [], right = []; for (let a = lo; a <= hi; a += 16) { left.push(riverEdge(R, a, -1)); right.push(riverEdge(R, a, 1)); }
  g.save(); g.imageSmoothingEnabled = false; g.beginPath(); left.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y); g.closePath();
  g.fillStyle = '#1f3f4a'; g.fill(); const pats = waterPatterns();
  if (pats) { g.clip(); const fl = (t * 16) % 160, ox = Math.round(R.d.x * fl), oy = Math.round(R.d.y * fl); g.translate(ox, oy); g.fillStyle = pats[Math.floor(t * 6) % 8]; g.fillRect(cam.x - ox - 8, cam.y - oy - 8, VW + 16, VH + 16); }
  g.restore();
  g.save(); g.lineJoin = 'round'; for (const edge of [left, right]) { g.beginPath(); edge.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.strokeStyle = '#3a2a20'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#6e5236'; g.lineWidth = 3; g.stroke(); }
  for (let a = lo; a <= hi; a += 30) for (const sd of [-1, 1]) { const h = ((a * 7919) | 0) & 7; if (h > 4) continue; const e = riverEdge(R, a + h * 3, sd); g.fillStyle = `rgba(214,225,227,${0.35 + 0.25 * Math.sin(t * 2 + a)})`; g.fillRect(Math.round(e.x - R.n.x * sd * 6), Math.round(e.y - R.n.y * sd * 6), 7, 2); }     // foam along the edge
  g.restore();
  for (const b of R.bridges) {
    g.save(); g.translate(b.x, b.y); g.save(); g.rotate(Math.atan2(b.u.y, b.u.x)); g.fillStyle = 'rgba(0,16,24,.30)'; g.fillRect(-b.L + 6, -b.Wd + 14, 2 * b.L - 12, 2 * b.Wd); g.restore();
    const im = IMG.bridge; if (im && im.complete && im.naturalWidth) { g.scale(b.fx ? -1 : 1, b.fy ? -1 : 1); g.imageSmoothingEnabled = false; g.drawImage(im, -BRIDGE.w * b.s / 2, -BRIDGE.h * b.s / 2, BRIDGE.w * b.s, BRIDGE.h * b.s); }
    else { g.rotate(Math.atan2(b.u.y, b.u.x)); g.fillStyle = '#5a3d2b'; g.fillRect(-b.L, -b.Wd, 2 * b.L, 2 * b.Wd); }
    g.restore();
  }
  const rs = IMG.reeds; if (rs && rs.complete && rs.naturalWidth) for (const o of R.deco) if (o.x > cam.x - 30 && o.x < cam.x + VW + 30 && o.y > cam.y - 10 && o.y < cam.y + VH + 70) g.drawImage(rs, o.v * 48, 0, 48, 66, Math.round(o.x - 24), Math.round(o.y - 62), 48, 66);
}
function drawRiverMap(sx, sy) {                             // the farmer's map shows the river and the bridges
  const R = RIVER; if (!R) return; g.save(); g.beginPath(); g.rect(MM.x, MM.y, MM.w, MM.h); g.clip(); g.beginPath();
  const L = [], Rr = []; for (let a = -1100; a <= 1100; a += 40) { L.push(riverEdge(R, a, -1)); Rr.push(riverEdge(R, a, 1)); }
  L.forEach((p, i) => i ? g.lineTo(MM.x + p.x * sx, MM.y + p.y * sy) : g.moveTo(MM.x + p.x * sx, MM.y + p.y * sy)); for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(MM.x + Rr[i].x * sx, MM.y + Rr[i].y * sy);
  g.closePath(); g.fillStyle = 'rgba(70,150,175,.75)'; g.fill();
  for (const b of R.bridges) { g.save(); g.translate(MM.x + b.x * sx, MM.y + b.y * sy); g.rotate(Math.atan2(b.u.y, b.u.x)); g.fillStyle = '#c28a55'; g.fillRect(-b.L * sx, -3, 2 * b.L * sx, 6); g.restore(); }
  g.restore();
}
