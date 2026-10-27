/* ===== JUICE: the little things that make the core loop feel good =====
   Particles (leaves, sparks, dust, rings), a pickup COMBO (quick pickups chain: the sound climbs a note each time and long chains pay bonus points),
   banking that gets bigger the more you bank, a short hit-stop on impacts, and a flawless-night bonus. Everything visual here is drawn from state both players
   already have (pop texts, rustling trees), so the guest sees it too without extra network traffic. */
let FX = [], denPulse = 0, hitStop = 0, chain = 0, chainUntil = 0, fxPrev = 0, dustAt = 0;
const fxAdd = o => { if (FX.length < 280) FX.push(o); };
function fxBurst(x, y, n, o) {
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), s = rnd(o.s0 === undefined ? 30 : o.s0, o.s1 || 140); fxAdd({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0), g: o.g === undefined ? 260 : o.g, l: rnd(o.l0 || 0.35, o.l1 || 0.8), m: 0, c: o.col[Math.floor(rnd(0, o.col.length))], r: rnd(o.r0 || 2, o.r1 || 4), k: o.k || 'dot', rot: rnd(0, 6) }); }
}
const fxRing = (x, y, col, r1 = 40, l = 0.45) => fxAdd({ x, y, k: 'ring', l, m: 0, r: 6, r1, c: col });
function popFx(s, x, y) {                                   // a floating text appeared: add the matching burst
  if (/^\+1/.test(s)) fxBurst(x, y - 10, 4, { col: ['#ff8a7a', '#fff'], s1: 70, l1: 0.45, r1: 2.5, k: 'spark' });
  else if (s === 'gold!' || s === 'jackpot!' || s.startsWith('Found: ')) { fxBurst(x, y - 10, 12, { col: ['#ffd23f', '#fff6a8', '#fff'], k: 'spark', s1: 130 }); fxRing(x, y - 10, '#ffd23f', 34); }
  else if (s.startsWith('Banked')) {                          // the more you bank, the bigger the burst, the shake and the sound
    const pts = parseInt(s.replace(/\D/g, ''), 10) || 1, k = Math.min(1, pts / 21);
    fxBurst(den.x, den.y - 12, 10 + Math.round(34 * k), { col: ['#ffd23f', '#ff6b5a', '#fff6a8', '#8fe36a'], up: 90, s1: 150 + 110 * k, k: 'spark', l1: 0.7 + 0.5 * k, r1: 4 });
    fxRing(den.x, den.y, '#ffe9a8', 50 + 60 * k, 0.55); if (k > 0.45) fxRing(den.x, den.y, '#ffd23f', 90 + 60 * k, 0.8); denPulse = 0.5 + 0.5 * k; shakeAmt = Math.max(shakeAmt, 0.05 + 0.2 * k);
  }
  else if (s === 'BONK!') { fxRing(x, y + 20, '#fff', 90, 0.35); fxBurst(x, y + 30, 14, { col: ['#ffd23f', '#fff', '#ffb347'], k: 'spark', s1: 190, g: 80 }); }
  else if (s === 'DOWN!') fxBurst(x, y + 40, 14, { col: ['#ff8f8f', '#fff', '#ffd0d0'], k: 'spark', s1: 130, g: 120 });
  else if (s === 'Revived!') { for (let i = 0; i < 6; i++) fxAdd({ x: x + rnd(-24, 24), y: y + 40, vx: rnd(-14, 14), vy: -rnd(40, 90), g: 0, l: rnd(0.7, 1.1), m: 0, c: '#ff7aa0', r: 9, k: 'heart', rot: 0 }); fxRing(x, y + 40, '#9be37f', 50, 0.5); }
  else if (s === 'golden!') fxBurst(x, y + 80, 10, { col: ['#ffd23f', '#fff'], k: 'spark', s1: 90 });
}
function fxStep(dt) {                                       // ambient effects that come from state: rustling leaves, dash dust, apples landing
  for (const o of obs) if (o.k === 'tree' && o.rustle > 0 && t > (o._lf || 0)) { o._lf = t + 0.08; fxAdd({ x: o.x + rnd(-34, 34), y: o.y - 62 + rnd(-14, 14), vx: rnd(-18, 18), vy: rnd(8, 30), g: 40, l: rnd(0.8, 1.3), m: 0, c: ['#58b043', '#3f7d32', '#a8c94a', '#d9822b'][Math.floor(rnd(0, 4))], r: rnd(3, 5), k: 'leaf', rot: rnd(0, 6) }); }
  if ((dashT > 0 || pdashT > 0) && state === 'play' && t > dustAt) { dustAt = t + 0.035; fxBurst(P.x, P.y - 2, 2, { col: ['#e8d8b0', '#cdbb94'], s0: 10, s1: 45, g: 0, l0: 0.25, l1: 0.45, r0: 3, r1: 6 }); }
  for (const a of apples) { if (a._fw && !(a.fall > 0)) fxBurst(a.x, a.y + 4, 4, { col: ['#e8d8b0', '#cdbb94'], s0: 10, s1: 55, g: 0, l0: 0.2, l1: 0.35, r0: 2, r1: 4 }); a._fw = a.fall > 0; }
  denPulse = Math.max(0, denPulse - dt);
  for (let i = FX.length - 1; i >= 0; i--) { const p = FX[i]; p.m += dt; if (p.m >= p.l) { FX.splice(i, 1); continue; } if (p.k === 'ring') continue; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; }
}
function drawFx() {
  const dt = Math.min(0.1, Math.max(0, t - fxPrev)); fxPrev = t; fxStep(dt);
  for (const p of FX) {
    const u = p.m / p.l; g.save(); g.globalAlpha = Math.max(0, 1 - u * u); g.fillStyle = g.strokeStyle = p.c;
    if (p.k === 'ring') { g.lineWidth = 3 * (1 - u) + 1; g.beginPath(); g.arc(p.x, p.y, p.r + (p.r1 - p.r) * Math.sqrt(u), 0, 7); g.stroke(); }
    else { g.translate(p.x, p.y); g.rotate(p.rot);
      if (p.k === 'spark') { const r = p.r * (1 - u * 0.5); g.fillRect(-r * 0.3, -r, r * 0.6, r * 2); g.fillRect(-r, -r * 0.3, r * 2, r * 0.6); }
      else if (p.k === 'leaf') { g.beginPath(); g.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, 7); g.fill(); }
      else if (p.k === 'heart') { g.rotate(-p.rot); g.font = 'bold ' + p.r * 2 + 'px sans-serif'; g.textAlign = 'center'; g.fillText('\u2665', 0, 0); }
      else { g.beginPath(); g.arc(0, 0, p.r * (1 - u * 0.4), 0, 7); g.fill(); } }
    g.restore();
  }
}
function denGlow() { if (denPulse <= 0) return; const u = Math.min(1, denPulse), gr = g.createRadialGradient(den.x, den.y, 6, den.x, den.y, 110); gr.addColorStop(0, `rgba(255,236,150,${0.55 * u})`); gr.addColorStop(1, 'rgba(255,236,150,0)'); g.fillStyle = gr; g.beginPath(); g.arc(den.x, den.y, 110, 0, 7); g.fill(); }
/* ----- the pickup combo (host / solo: it changes the score) ----- */
function pickupPop(a) {
  chain = t < chainUntil ? chain + 1 : 1; chainUntil = t + 1.5; ST.chainMax = Math.max(ST.chainMax || 0, chain); if (chain >= 3) score += chain - 2;
  pop(a.x, a.y, a.jackpot ? 'jackpot!' : a.gold ? 'gold!' : chain >= 2 ? '+1 x' + chain : '+1', chain >= 4 ? '#ffd23f' : chain >= 2 ? '#ffe9a8' : '#fff');
}
function drawChainHud() {
  if (chain < 2 || t >= chainUntil || state !== 'play') return; const left = Math.min(1, (chainUntil - t) / 1.5);
  g.save(); g.textAlign = 'center'; g.font = 'bold ' + (16 + Math.min(10, chain * 1.5)) + 'px "Trebuchet MS",Verdana,sans-serif'; g.fillStyle = chain >= 4 ? '#ffd23f' : '#ffe9a8'; g.strokeStyle = '#222'; g.lineWidth = 4;
  const txt = 'COMBO x' + chain + (chain >= 3 ? '  +' + (chain - 2) : ''); g.strokeText(txt, VW / 2, 60); g.fillText(txt, VW / 2, 60); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(VW / 2 - 40, 66, 80, 5); g.fillStyle = '#ffd23f'; g.fillRect(VW / 2 - 40, 66, 80 * left, 5); g.restore();
}
