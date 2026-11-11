/* ===== THE HUNT: harder nights after you win (Keep raiding) =====
   Night nightsToWin + n is hunt level n. From hunt level 1 the AI farmers and dogs get smarter, a little more every night (HUNT.smart, full at
   CONFIG.endless.smartsFull):
   - a farmer who loses sight of you walks to where he last saw you and sweeps the spot; he also calls the farmers near him over ("Over here!")
   - farmers' patrols drift toward the fruit trees and the apples on the ground
   - dogs follow your scent trail (where you walked in the last few seconds) and search where they lost you
   - everyone steers round trees and rocks instead of pushing into them; they walk a little faster
   Every CONFIG.endless.waveEvery nights (up to maxWaves times) one more farmer and one more dog join. To keep it winnable, those nights also
   give a heart and some extra time, and the apple target grows more slowly after the win (CONFIG.night).
   Runs on the host only (the guest just draws what it is sent). */
const HUNT = { lvl: 0, wave: 0, smart: 0, trail: [], trailT: 0, callT: 0 };
const huntLevelOf = n => endless ? Math.max(0, n - CONFIG.nightsToWin) : 0;
const huntWaveOf = n => Math.min(CONFIG.endless.maxWaves, Math.floor(huntLevelOf(n) / CONFIG.endless.waveEvery));
const huntWaveNight = () => HUNT.lvl > 0 && HUNT.lvl % CONFIG.endless.waveEvery === 0 && HUNT.lvl / CONFIG.endless.waveEvery <= CONFIG.endless.maxWaves;
function huntSetup() { HUNT.lvl = huntLevelOf(night); HUNT.wave = huntWaveOf(night); HUNT.smart = Math.min(1, HUNT.lvl / CONFIG.endless.smartsFull); HUNT.trail = []; HUNT.trailT = 0; HUNT.callT = 0; }
const huntSpeed = dog => 1 + (dog ? 0.015 : 0.025) * Math.min(HUNT.lvl, 10);
function huntAnnounce() {                                     // a wave night: say what changed, and give the heart
  if (!huntWaveNight()) return; hearts += CONFIG.endless.heartsPerWave;
  pop(P.x, P.y - 95, 'More farmers and dogs tonight', '#ffb3a8', true); setTimeout(() => { if (state === 'play') pop(P.x, P.y - 70, '+' + CONFIG.endless.heartsPerWave + ' heart, +' + CONFIG.endless.timePerWave + 's', '#9be37f', true); }, 1400);
}
/* ----- scent: where the raccoon walked recently (not up a tree, not inside a bush) ----- */
function huntTrail(dt, pts) {
  if (!HUNT.smart) return; HUNT.trailT -= dt; if (HUNT.trailT > 0) return; HUNT.trailT = 0.35;
  pts.forEach(p => { if (p.ok) HUNT.trail.push({ x: p.x, y: p.y, t }); }); const life = 5 + 6 * HUNT.smart; HUNT.trail = HUNT.trail.filter(q => t - q.t < life);
}
function huntScent(d) {                                       // the freshest scent a dog can smell from where it stands
  if (!HUNT.smart || !HUNT.trail.length) return null; const range = CONFIG.dog.sniffRange * (0.9 + 0.8 * HUNT.smart) * FS.dogSniff * MODX.sniff;
  for (let i = HUNT.trail.length - 1; i >= 0; i--) { const q = HUNT.trail[i]; if (Math.hypot(q.x - d.x, q.y - d.y) < range) return q; } return null;
}
/* ----- farmers: remember the last sighting, call the others, patrol where the fruit is ----- */
function huntSaw(f) {
  if (!HUNT.smart || f.human) return; f.saw = { x: P.x, y: P.y }; f.sawT = t;
  if (HUNT.smart >= 0.3 && t > HUNT.callT) {
    let called = 0; const reach = 300 + 250 * HUNT.smart;
    for (const o of farmers) if (o !== f && !o.human && !o.guard && Math.hypot(o.x - f.x, o.y - f.y) < reach) { o.search = { x: P.x, y: P.y, t: 3 + 2 * HUNT.smart }; called++; }
    if (called) { HUNT.callT = t + 5; pop(f.x, f.y - 70, 'Over here!', '#ffb3a8'); }
  }
}
function huntFarmer(f) {                                      // lost sight of you a moment ago: go and look there
  if (!HUNT.smart || !f.saw || t - f.sawT < 0.3) return; if (!f.guard) f.search = { x: f.saw.x, y: f.saw.y, t: 2 + 3 * HUNT.smart }; f.saw = null;
}
function huntRepatrol(f) {                                    // a farmer who finished his round picks the next one near the fruit
  if (!HUNT.smart || f.guard || Math.random() > HUNT.smart) return;
  const spots = obs.filter(o => o.k === 'tree' && !(o.cd > 0)).map(o => ({ x: o.x, y: o.y + 30 })).concat(apples.map(a => ({ x: a.x, y: a.y }))); if (spots.length < 2) return;
  const wp = []; for (let n = 0; n < 12 && wp.length < 4; n++) { const s = spots[Math.floor(Math.random() * spots.length)], p = { x: clampN(s.x + rnd(-40, 40), 40, W - 40), y: clampN(s.y + rnd(-30, 30), 80, H - 30) }; if (!(RIVER && inRiverM(p.x, p.y, 20))) wp.push(p); }
  if (wp.length >= 2) { f.wp = wp; f.i = 0; }
}
function huntDog(d, chasing, tx, ty) {                        // a dog that loses the chase searches where it last had you
  if (!HUNT.smart) return; if (chasing) { d.lastP = { x: tx, y: ty }; return; }
  if (d.lastP) { d.search = { x: d.lastP.x, y: d.lastP.y, t: 2 + 3 * HUNT.smart }; d.lastP = null; d.wt = 0; }
}
function huntWander(d) {                                      // a dog with nothing to do: follow the scent if there is one
  const q = huntScent(d); if (q) { d.tx = q.x; d.ty = q.y; d.wt = 0.6; d.scent = 1; return true; } d.scent = 0; return false;
}
/* ----- walking round trees and rocks instead of into them ----- */
function huntSteer(e, nv, rad) {
  if (!HUNT.smart) return nv; let dx = nv.x - e.x, dy = nv.y - e.y; const L = Math.hypot(dx, dy); if (L < 1) return nv; dx /= L; dy /= L;
  let best = null, bu = 1e9; const look = Math.min(L, 90);
  for (const o of obs) { if (!solid(o)) continue; const ox = o.x - e.x, oy = o.y - e.y, u = ox * dx + oy * dy; if (u <= 0 || u > look + o.r) continue; const v = ox * -dy + oy * dx;
    if (Math.abs(v) < o.r + rad + 4 && u < bu) { bu = u; best = { o, v }; } }
  if (!best) return nv; const side = best.v > 0 ? -1 : 1, off = best.o.r + rad + 12;
  return { x: best.o.x + -dy * side * off, y: best.o.y + dx * side * off };
}
