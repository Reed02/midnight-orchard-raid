/* ----- helpers ----- */
function push(e, rad) { for (const o of obs) if (solid(o)) { const vx = e.x - o.x, vy = e.y - o.y, d = Math.hypot(vx, vy), m = o.r + rad; if (d < m && d > 0) { e.x = o.x + vx / d * m; e.y = o.y + vy / d * m; } } }
function segHits(x1, y1, x2, y2, cx, cy, r) { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; let u = ((cx - x1) * dx + (cy - y1) * dy) / l2; u = Math.max(0, Math.min(1, u)); return Math.hypot(x1 + u * dx - cx, y1 + u * dy - cy) < r; }
const hidden = () => obs.some(o => o.k === 'bush' && Math.hypot(o.x - P.x, o.y - P.y) < o.r);
function pop(x, y, s, c, top) { pops.push({ x, y, s, c, l: 0.9, top }); if (multi && isHost) nsend('pop', { a: [Math.round(x), Math.round(y), s, c, top ? 1 : 0] }); popSound(s, x, y); }
function doDash() {
  if (state !== 'play') return;
  if (P.tree) return doSlam();                       // up a tree, Space is the cannonball
  if (dashCd <= 0 && !slam) { dashT = CONFIG.player.dashTime; dashCd = S.dashCd; sfxAt('dash', P.x, P.y, 420); }
}
const airborne = () => slam && slam.t < 1;
function nearTree(range) {
  let best = null, bd = 1e9;
  for (const o of obs) if (o.k === 'tree') { const d = Math.hypot(P.x - o.x, P.y - o.y); if (d < o.r + range && d < bd) { best = o; bd = d; } }
  return best;
}
function doClimb() {
  if (state !== 'play' || slam) return;
  if (P.tree) return descend();
  const tr = nearTree(CONFIG.climb.range); if (!tr || climbCd > 0) return;
  P.tree = tr; P.x = tr.x; P.y = tr.y + 2; climbT = CONFIG.climb.maxTime; dashT = 0; bumpEpoch(); sfxAt('climb', P.x, P.y, 300);
}
function descend() { const tr = P.tree; P.tree = null; P.x = tr.x; P.y = tr.y + tr.r + 14; climbCd = CONFIG.climb.cooldown; bumpEpoch(); }
function updateInTree(dt) { P.moving = false; anim = 0; climbT -= dt; if (climbT <= 0) descend(); }
function doSlam() {                                  // leap at the nearest dog in range (or just hop down)
  const tr = P.tree; let tgt = null, bd = CONFIG.slam.radius;
  for (const d of dogs) { const dd = Math.hypot(d.x - tr.x, d.y - tr.y); if (dd < bd) { bd = dd; tgt = d; } }
  slam = { t: 0, from: { x: tr.x, y: tr.y }, dog: tgt, tx: tgt ? tgt.x : tr.x, ty: tgt ? tgt.y : tr.y + tr.r + 26 }; bumpEpoch();
  P.tree = null;
}
function updateSlam(dt) {
  const s = slam; P.moving = false;
  if (s.recover !== undefined) { s.recover -= dt; if (s.recover <= 0) { slam = null; bumpEpoch(); } return; }   // dazed after a miss
  s.t += dt / CONFIG.slam.time; if (s.dog) { s.tx = s.dog.x; s.ty = s.dog.y; }
  const u = Math.min(1, s.t); P.x = s.from.x + (s.tx - s.from.x) * u; P.y = s.from.y + (s.ty - s.from.y) * u;
  if (s.t >= 1) {                                    // landing
    let hit = false; for (const d of dogs) if (Math.hypot(d.x - P.x, d.y - P.y) < 55) { d.stun = CONFIG.slam.stun; hit = true; stat('stuns'); }
    shakeAmt = 0.35; climbCd = CONFIG.climb.cooldown; pop(P.x, P.y - 40, hit ? 'BONK!' : 'miss', hit ? '#ffd23f' : '#ccc'); push(P, 10);
    slam = hit ? null : { recover: CONFIG.slam.missRecovery }; bumpEpoch();
  }
}
function caught(why) {
  if (inv > 0) return; stat('catches'); if (dogs.some(d => d.chase)) stat('dogCatches'); hearts--; flash = 0.4; startleT = 0.9; alertV = 0; msgText = why;
  carry.forEach(v => spawnApple(P.x + rnd(-40, 40), P.y + rnd(-30, 30), v > 1, 0, 'tree')); carry = []; P.tree = null; slam = null;
  if (hearts <= 0) return gameOver(why);
  P.x = den.x + 40; P.y = den.y - 30; inv = CONFIG.player.invulnerable; bumpEpoch();
}

/* ----- update ----- */
function movePlayer(dt) {
  const mv = moveVec('raccoon'); let dx = mv.x, dy = mv.y;
  const m = Math.hypot(dx, dy); P.moving = m > 0;
  if (m) { dx /= m; dy /= m; dir = { x: dx, y: dy }; if (dx) P.face = dx > 0 ? 1 : -1; anim += dt * 14; } else anim = 0;
  const inBush = hidden();
  let sp = S.speed * (1 - CONFIG.player.carrySlow * carry.length) * (inBush ? 0.6 : 1), vx = dx * sp, vy = dy * sp;
  if (dashT > 0) { dashT -= dt; vx = dir.x * CONFIG.player.dashSpeed; vy = dir.y * CONFIG.player.dashSpeed; }
  P.x = Math.min(W - 30, Math.max(30, P.x + vx * dt)); P.y = Math.min(H - 20, Math.max(52, P.y + vy * dt)); push(P, 10);
}
function update(dt) {
  if (multi && isHost && performance.now() - remote.t > 1500) { remote.mx = remote.my = 0; remote.shake = false; }   // guest went quiet
  t += dt; time -= dt; inv -= dt; dashCd -= dt; flash = Math.max(0, flash - dt); startleT = Math.max(0, startleT - dt); modUpdate(dt);
  // player: shake a tree (hold E), sit in a tree, cannonball, or walk
  const inBush = hidden(); shakeTree = null; shaking = false;
  const ready = !P.tree && !slam && act('raccoon', 'shake') ? nearTree(CONFIG.shake.range) : null;
  if (ready && !(ready.cd > 0)) { shaking = true; shakeTree = ready; P.moving = false; anim = 0; ready.shakeP = (ready.shakeP || 0) + dt / S.shakeT; ready.rustle = 0.2; if (multi && !ready.noisy && !MODX.quiet && ready.shakeP > 0.5) { ready.noisy = true; pop(ready.x, ready.y - 60, 'rustle', '#ffd23f', true); } if (ready.shakeP >= 1) shakeDrop(ready); }
  else if (slam) updateSlam(dt);
  else if (P.tree) updateInTree(dt);
  else if (multi && myRole !== 'raccoon') remoteRaccoonStep(dt);
  else movePlayer(dt);
  for (const o of obs) if (o.k === 'tree') { o.cd = Math.max(0, (o.cd || 0) - dt); o.rustle = Math.max(0, (o.rustle || 0) - dt); if (o !== shakeTree) o.shakeP = Math.max(0, (o.shakeP || 0) - CONFIG.shake.decay * dt); }
  shakeAmt = Math.max(0, shakeAmt - dt); climbCd -= dt; addTracks(dt);
  // apples
  spawnT -= dt; if (spawnT <= 0 && apples.filter(a => a.kind === 'ground').length < Math.min(CONFIG.apples.groundMax, groundLeft)) { spawnApple(); spawnT = CONFIG.apples.spawnEvery; }
  for (let i = apples.length - 1; i >= 0; i--) {
    const a = apples[i]; a.t += dt; a.fall = Math.max(0, a.fall - dt);
    if (!a.fall && !P.tree && !airborne() && carry.length < S.carry && Math.hypot(a.x - P.x, a.y - (P.y - 20)) < 30) { carry.push(a.value || (a.gold ? CONFIG.apples.goldValue : 1)); apples.splice(i, 1); if (a.kind === 'ground') groundLeft--; pop(a.x, a.y, a.jackpot ? 'jackpot!' : a.gold ? 'gold!' : '+1', '#fff'); }
  }
  // banking at the den
  if (carry.length && !P.tree && !airborne() && Math.hypot(P.x - den.x, P.y - den.y) < den.radius) {
    const val = carry.reduce((s, v) => s + v, 0), pts = CONFIG.bankScore(carry.length);
    ST.goldBanked += carry.filter(v => v >= 3).length; if (ST.firstDeposit === null) ST.firstDeposit = nightTime - time; banked += val; score += pts; pop(P.x, P.y - 50, 'Banked +' + pts, '#ffd23f'); carry = [];
    if (banked >= quota) return nightClear();
    if ((multi ? CONFIG.den.moveMulti : CONFIG.den.moveSingle) === 'deposit') { placeDen(false); pop(den.x, den.y - 50, 'new den!', '#ffe9a8'); }     // the den moves after every deposit
  }
  // farmers
  let seen = false, rate = 0;
  for (const f of farmers) {
    if (f.human) moveHumanFarmer(f, dt); else {
      if (f.search) { f.search.t -= dt; if (f.search.t <= 0) f.search = null; }          // called over by the farmer's whistle
      const w = f.search || f.wp[f.i], vx = w.x - f.x, vy = w.y - f.y, d = Math.hypot(vx, vy), sp = CONFIG.farmer.speed * (f.search ? 1.6 : 1), near = f.search && d < 18;
      if (d < 18) { if (!f.search) f.i = (f.i + 1) % f.wp.length; } else { f.x += vx / d * sp * dt; f.y += vy / d * sp * dt; f.face = Math.atan2(vy, vx); }
      f.look = (f.face || 0) + Math.sin(t * (near ? 2.2 : 1.4) + f.ph) * CONFIG.farmer.sweep * (near ? 1.8 : 1);     // sweeps wider while searching
    }
    push(f, 12);
    if (inv <= 0 && canSee(f)) {
      seen = true; if (f.human && !P.tree && hiddenBush()) ST.bushFinds = 1;
      if (multi) rate += 1 + CONFIG.multiplayer.closeBonus * (1 - Math.hypot(P.x - f.x, P.y - f.y) / coneOf(f).len); else rate = 1;     // closer light, and more farmers, catch faster
    }
  }
  if (multi && !P.tree && teamSees()) lastSeen = { x: P.x, y: P.y, t };                   // where the farmer team last saw the raccoon (for "call dogs")
  if (multi && inv <= 0 && !P.tree && !airborne()) for (const f of farmers) if (f.human && Math.hypot(P.x - f.x, P.y - f.y) < CONFIG.multiplayer.touchRange) return caught('The farmer grabbed the raccoon.');
  alertV = seen ? alertV + dt * Math.min(multi ? CONFIG.multiplayer.stackCap : 1, rate) / S.alert : Math.max(0, alertV - dt * 0.8);
  if (alertV >= 1) return caught('The farmer spotted you.');
  // dogs
  for (const d of dogs) {
    if (d.stun > 0) { d.stun -= dt; d.chase = false; continue; }                 // stunned dogs freeze
    const dist = Math.hypot(P.x - d.x, P.y - d.y);
    const range = (shaking ? CONFIG.shake.noiseRange : inBush ? CONFIG.dog.bushRange : CONFIG.dog.sniffRange) * FS.dogSniff * MODX.sniff * (d.search && d.search.box ? CONFIG.multiplayer.grid.sniffBonus : 1);   // dogs on orders sniff harder
    d.chase = dist < range && inv <= 0 && t >= ignoreDogs;
    if (d.search) { d.search.t -= dt; if (d.search.t <= 0) d.search = null; }    // searching where the farmer whistled
    d.wt -= dt; if (d.wt <= 0) {
      if (d.search && d.search.box) { const [bx, by, bw, bh] = d.search.box, s = d.search.strip; d.tx = clampN(bx + bw * rnd(s[0], s[1]), 40, W - 40); d.ty = clampN(by + rnd(0, bh), 80, H - 30); d.wt = rnd(1.2, 2.2); }   // sweep the whole square
      else if (d.search) { d.tx = clampN(d.search.x + rnd(-90, 90), 40, W - 40); d.ty = clampN(d.search.y + rnd(-90, 90), 80, H - 30); d.wt = rnd(1, 2); }
      else { d.tx = rnd(40, W - 40); d.ty = rnd(80, H - 30); d.wt = rnd(2, 4); }
    }
    const waiting = P.tree && d.chase && dist < 50;                            // circling under your tree
    const tx = d.chase ? P.x : d.tx, ty = d.chase ? P.y : d.ty, vx = tx - d.x, vy = ty - d.y, l = Math.hypot(vx, vy) || 1, s = waiting ? 0 : CONFIG.dog.speed * (d.chase ? 1 : d.search ? (d.search.box ? 1 : 0.8) : 0.45);
    d.anim = (d.anim || 0) + dt * (waiting ? 0 : 6 + s * 0.06);               // walk animation speeds up when chasing
    d.x += vx / l * s * dt; d.y += vy / l * s * dt; d.face = vx > 0 ? 1 : -1; push(d, 10);
    if (dist < 24 && inv <= 0 && !P.tree && !airborne()) return caught('The dog got you.');
  }
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
  if (time <= 0) gameOver('Dawn broke before you banked ' + quota + ' apples.');
}

