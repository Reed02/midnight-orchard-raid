/* ===== CO-OP CREW: two raccoons (one per player) against the AI farmers and dogs =====
   The game keeps "the raccoon" in a handful of globals (P, carry, slam, alertV, inv, dashCd ...). To get two of them, each raccoon's copy lives in a SLOT
   (RS[0] = the host's, RS[1] = the guest's) and withSlot(i, fn) swaps a slot into those globals for the length of fn, so all the existing raccoon code
   (shaking, climbing, slamming, banking, drawing, items) runs unchanged on either raccoon. Between frames the slot of THIS machine's player is the loaded one.
   Shared by the crew: hearts, quota/banked, score, time, the perks (S). Per raccoon: position, cheeks, spotted meter, dash, tree, and a DOWN state.
   Tuning is in CONFIG.coop (harder nights, more hearts, how long you stay down, how fast a friend can revive you). */
let COOP = false, RS = [], cur = 0, mySlot = 0;
const pvp = () => multi && !COOP;                           // is there a human farmer?
const epochOf = () => COOP && RS[cur] ? RS[cur].ep : epoch;    // each raccoon has its own teleport counter, so one friend climbing a tree does not snap the other's screen
function slotSave() { const R = RS[cur]; if (!R) return; R.P = P; R.carry = carry; R.slam = slam; R.alertV = alertV; R.inv = inv; R.dashT = dashT; R.dashCd = dashCd; R.climbT = climbT; R.climbCd = climbCd; R.startleT = startleT; R.shaking = shaking; R.shakeTree = shakeTree; R.dir = dir; R.anim = anim; }
function slotLoad(i) { const R = RS[i]; cur = i; P = R.P; carry = R.carry; slam = R.slam; alertV = R.alertV; inv = R.inv; dashT = R.dashT; dashCd = R.dashCd; climbT = R.climbT; climbCd = R.climbCd; startleT = R.startleT; shaking = R.shaking; shakeTree = R.shakeTree; dir = R.dir; anim = R.anim; }
function withSlot(i, fn) { if (!COOP || !RS[i] || i === cur) return fn(); const prev = cur; slotSave(); slotLoad(i); try { return fn(); } finally { slotSave(); slotLoad(prev); } }
const slotOther = () => RS[1 - cur];
function coopInit() {                                       // a night starts: both raccoons at the den
  const mk = (x, y) => ({ P: { x, y, tx: x, ty: y, face: 1, moving: false, tree: null }, carry: [], slam: null, alertV: 0, inv: 1.5, dashT: 0, dashCd: 0, climbT: 0, climbCd: 0, startleT: 0, shaking: false, shakeTree: null, dir: { x: 1, y: 0 }, anim: 0, down: 0, rev: 0, ep: epoch, lastEp: 0 });
  RS = [mk(den.x + 40, den.y - 30), mk(den.x - 40, den.y + 25)]; RS.forEach(r => push(r.P, 10)); RS.forEach(r => { r.P.tx = r.P.x; r.P.ty = r.P.y; });
  RS[0].ep = ++epoch; RS[1].ep = ++epoch; cur = mySlot; slotLoad(mySlot); remote.ack = -1;
}
function coopStart() {                                      // host: start a co-op raid
  if (!multi || !isHost || !net.guestPeer) return; COOP = true; series = null; duelHud = 0; mySlot = 0; myRole = 'raccoon'; if (net.hosting) net.hosting.role = 'raccoon'; newRun();
}
const coopAct = a => cur === mySlot ? held(a) : !!remote[a];     // whose keys: this machine's, or the friend's
/* ----- one raccoon's part of a frame (its slot is loaded) ----- */
function raccoonStep(dt) {
  const R = RS[cur], other = slotOther();
  inv -= dt; dashCd -= dt; startleT = Math.max(0, startleT - dt); climbCd -= dt;
  if (R.down > 0) { R.down -= dt; inv = Math.max(inv, 1); P.moving = false; anim = 0; shaking = false; shakeTree = null; if (R.down <= 0) return downExpired(); return false; }
  if (other.down > 0 && !other.P.tree && !P.tree && !slam && Math.hypot(other.P.x - P.x, other.P.y - P.y) < CONFIG.coop.reviveRange) { other.rev += dt; if (other.rev >= CONFIG.coop.reviveTime) revive(other); }
  else if (other.down > 0) other.rev = Math.max(0, other.rev - dt * 0.8);
  const inBush = hidden(); shakeTree = null; shaking = false;
  const ready = !P.tree && !slam && coopAct('shake') ? nearTree(CONFIG.shake.range) : null;
  if (ready && !(ready.cd > 0)) { shaking = true; shakeTree = ready; P.moving = false; anim = 0; ready.shakeP = (ready.shakeP || 0) + dt / S.shakeT; ready.rustle = 0.2; if (ready.shakeP >= 1) shakeDrop(ready); }
  else if (slam) updateSlam(dt);
  else if (P.tree) updateInTree(dt);
  else if (cur !== mySlot) remoteRaccoonStep(dt);
  else movePlayer(dt);
  // apples
  for (let i = apples.length - 1; i >= 0; i--) {
    const a = apples[i];
    if (t < magnetUntil && !a.fall && !P.tree && !airborne()) { const mx = P.x - a.x, my = P.y - 20 - a.y, md = Math.hypot(mx, my); if (md < 150 && md > 1) { a.x += mx / md * 130 * dt; a.y += my / md * 130 * dt; } }
    if (!a.fall && !P.tree && !airborne() && carry.length < S.carry && Math.hypot(a.x - P.x, a.y - (P.y - 20)) < 30) { let av = a.value || (a.gold ? CONFIG.apples.goldValue : 1); if (midasLeft > 0 && av < CONFIG.apples.goldValue) { av = CONFIG.apples.goldValue; midasLeft--; } carry.push(av); ST.haul = Math.max(ST.haul || 0, carry.length); apples.splice(i, 1); if (a.kind === 'ground') groundLeft--; pickupPop(a); }
  }
  if (carry.length && !P.tree && !airborne() && Math.hypot(P.x - den.x, P.y - den.y) < den.radius) {       // banking at the den
    const val = carry.reduce((s, v) => s + v, 0), pts = CONFIG.bankScore(carry.length);
    ST.goldBanked += carry.filter(v => v >= 3).length; if (ST.firstDeposit === null) ST.firstDeposit = nightTime - time; banked += val * bankMul; score += pts * bankMul; pop(P.x, P.y - 50, 'Banked +' + pts * bankMul, '#ffd23f'); bankMul = 1; carry = [];
    if (banked >= quota) { nightClear(); return true; }
    if (CONFIG.den.moveSingle === 'deposit') { placeDen(false); pop(den.x, den.y - 50, 'new den!', '#ffe9a8'); }
  }
  let seen = false;                                         // the farmers' lights
  if (inv <= 0) for (const f of farmers) if (canSee(f)) { seen = true; huntSaw(f); if (RIVER && bridgeAt(P.x, P.y)) ST.bridgeSpots = 1; }
  alertV = seen ? alertV + dt / S.alert : Math.max(0, alertV - dt * 0.8 * drainMul);
  if (alertV >= 1) { caughtCoop('The farmer spotted you.'); return state !== 'play'; }
  return false;
}
function caughtCoop(why) {                                  // this raccoon was caught: it drops its cheeks and goes DOWN; the friend can revive it before the time runs out
  if (inv > 0 || RS[cur].down > 0) return; const R = RS[cur]; chain = 0; hitStop = 0.12; stat('catches'); if (dogs.some(d => d.chase)) stat('dogCatches'); flash = 0.4; startleT = 0.9; alertV = 0; msgText = why;
  carry.forEach(v => spawnApple(P.x + rnd(-40, 40), P.y + rnd(-30, 30), v > 1, 0, 'tree')); carry = []; P.tree = null; slam = null; dashT = 0; P.moving = false;
  R.down = CONFIG.coop.downTime; R.rev = 0; inv = 1; bumpEpoch(); pop(P.x, P.y - 55, 'DOWN!', '#ff8f8f', true);
}
function downExpired() {                                    // nobody came: the crew loses a heart and the raccoon limps home
  hearts--; RS[cur].down = 0; if (hearts <= 0) { gameOver(msgText); return true; }
  P.x = den.x + (cur ? -40 : 40); P.y = den.y + (cur ? 25 : -30); inv = CONFIG.player.invulnerable; bumpEpoch(); pop(P.x, P.y - 55, 'back at the den', '#ffe9a8'); return false;
}
function revive(o) { o.down = 0; o.rev = 0; o.inv = CONFIG.player.invulnerable; o.ep = ++epoch; stat('revives'); pop(o.P.x, o.P.y - 60, 'Revived!', '#9be37f', true); }
/* ----- the rest of the world, once per frame ----- */
function farmersCoop(dt) {
  for (const f of farmers) {
    huntFarmer(f); if (f.search) { f.search.t -= dt; if (f.search.t <= 0) f.search = null; }
    const w = f.search || f.wp[f.i], dr = Math.hypot(w.x - f.x, w.y - f.y), nv = huntSteer(f, nav(f, w.x, w.y), 12), vx = nv.x - f.x, vy = nv.y - f.y, d = Math.hypot(vx, vy) || 1, sp = CONFIG.farmer.speed * (f.search ? 1.6 : 1) * huntSpeed(), near = f.search && dr < 18;
    if (dr < 18) { if (!f.search) { f.i = (f.i + 1) % f.wp.length; if (!f.i) huntRepatrol(f); } } else { f.x += vx / d * sp * dt; f.y += vy / d * sp * dt; f.face = Math.atan2(vy, vx); }
    f.look = (f.face || 0) + Math.sin(t * (near ? 2.2 : 1.4) + f.ph) * CONFIG.farmer.sweep * (near ? 1.8 : 1); push(f, 12);
  }
}
function dogsCoop(dt) {                                     // each dog hunts the nearest raccoon it can smell
  const info = [0, 1].map(i => withSlot(i, () => ({ x: P.x, y: P.y, tree: !!P.tree, air: airborne(), inv, shaking, bush: hidden(), down: RS[i].down > 0 }))); let chasedNow = false;
  for (const d of dogs) {
    if (d.stun > 0) { d.stun -= dt; d.chase = false; continue; }
    let best = -1, bd = 1e9;
    info.forEach((o, i) => { const dist = Math.hypot(o.x - d.x, o.y - d.y), range = (o.shaking ? CONFIG.shake.noiseRange : o.bush ? CONFIG.dog.bushRange : CONFIG.dog.sniffRange) * FS.dogSniff * MODX.sniff * sniffBuff * (d.search && d.search.box ? CONFIG.multiplayer.grid.sniffBonus : 1); if (dist < range && o.inv <= 0 && t >= ignoreDogs && !o.down && dist < bd) { bd = dist; best = i; } });
    d.chase = best >= 0; if (d.chase) chasedNow = true; huntDog(d, d.chase && !info[best].tree, d.chase ? info[best].x : 0, d.chase ? info[best].y : 0);
    if (d.search) { d.search.t -= dt; if (d.search.t <= 0) d.search = null; }
    d.wt -= dt; if (d.wt <= 0) { if (d.search) { d.tx = clampN(d.search.x + rnd(-90, 90), 40, W - 40); d.ty = clampN(d.search.y + rnd(-90, 90), 80, H - 30); d.wt = rnd(1, 2); } else if (!huntWander(d)) { d.tx = rnd(40, W - 40); d.ty = rnd(80, H - 30); d.wt = rnd(2, 4); } }
    const tg = d.chase ? info[best] : null, waiting = tg && tg.tree && bd < 50;
    const nv = huntSteer(d, nav(d, tg ? tg.x : d.tx, tg ? tg.y : d.ty), 10), vx = nv.x - d.x, vy = nv.y - d.y, l = Math.hypot(vx, vy) || 1, s = waiting ? 0 : CONFIG.dog.speed * huntSpeed(true) * (d.chase ? 1 : d.search ? 0.8 : d.scent ? 0.75 : 0.45);
    d.anim = (d.anim || 0) + dt * (waiting ? 0 : 6 + s * 0.06); d.x += vx / l * s * dt; d.y += vy / l * s * dt; d.face = vx > 0 ? 1 : -1; push(d, 10);
    for (let i = 0; i < 2; i++) { const o = info[i]; if (Math.hypot(o.x - d.x, o.y - d.y) < 24 && o.inv <= 0 && !o.tree && !o.air && !o.down) { withSlot(i, () => caughtCoop('The dog got you.')); o.down = true; if (state !== 'play') return; } }
  }
  if (chasedNow) ST.chased = (ST.chased || 0) + dt;
}
function updateCoop(dt) {                                   // host: one frame of a co-op raid
  if (hitStop > 0) { hitStop -= dt; return; }
  if (performance.now() - remote.t > 1500) { remote.mx = remote.my = 0; remote.shake = false; }
  t += dt; if (t >= freezeUntil) time -= dt; flash = Math.max(0, flash - dt); buffsTick(); modUpdate(dt);
  for (let i = apples.length - 1; i >= 0; i--) { const a = apples[i]; a.t += dt; a.fall = Math.max(0, a.fall - dt); }
  spawnT -= dt; if (spawnT <= 0 && apples.filter(a => a.kind === 'ground').length < Math.min(CONFIG.apples.groundMax, groundLeft)) { spawnApple(); spawnT = CONFIG.apples.spawnEvery; }
  for (const i of [0, 1]) { if (withSlot(i, () => raccoonStep(dt))) return; }
  const shaken = new Set(RS.map(r => r.shakeTree).filter(Boolean));
  for (const o of obs) if (o.k === 'tree') { o.cd = Math.max(0, (o.cd || 0) - dt); o.rustle = Math.max(0, (o.rustle || 0) - dt); if (!shaken.has(o)) o.shakeP = Math.max(0, (o.shakeP || 0) - CONFIG.shake.decay * dt); }
  shakeAmt = Math.max(0, shakeAmt - dt);
  huntTrail(dt, [0, 1].map(i => withSlot(i, () => ({ x: P.x, y: P.y, ok: !P.tree && !hidden() && !(RS[i] && RS[i].down > 0) })))); farmersCoop(dt); dogsCoop(dt); if (state !== 'play') return;
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
  if (time <= 0) gameOver('Dawn broke before the crew banked ' + quota + ' apples.');
}
/* ----- multiplayer: what each side tells the other ----- */
function coopSnap() {                                       // host -> guest: both raccoons
  slotSave(); const r = Math.round, f1 = v => +(+v || 0).toFixed(1), f2 = v => +(+v || 0).toFixed(2);
  return RS.map(R => [r(R.P.x), r(R.P.y), R.P.face, R.P.moving ? 1 : 0, R.P.tree ? obs.indexOf(R.P.tree) : -1, f2(R.alertV), f1(R.inv), f1(R.startleT), f1(R.dashCd), f1(R.climbT), f1(R.down), f1(R.rev), R.ep, R.slam ? (R.slam.recover !== undefined ? [-1, f2(R.slam.recover)] : [f2(R.slam.t)]) : 0, R.carry]);
}
function applyCoopSnap(s) {                                 // guest: my raccoon is the loaded slot; the friend's is drawn from its slot
  if (!Array.isArray(s.RC) || s.RC.length < 2 || !RS[mySlot]) return; const me = mySlot, ot = 1 - me, sl = a => a ? (a[0] === -1 ? { recover: num(a[1]) } : { t: num(a[0]) }) : null;
  const a = s.RC[me], R = RS[me], walking = !(a[4] >= 0 || a[13]);
  alertV = num(a[5]); inv = num(a[6]); startleT = num(a[7]); dashCd = num(a[8]); climbT = num(a[9]); carry = (a[14] || []).slice(0, 12).map(num); R.down = num(a[10]); R.rev = num(a[11]);
  P.tx = num(a[0]); P.ty = num(a[1]); if (!walking || R.down > 0) { P.face = a[2] < 0 ? -1 : 1; P.moving = !!a[3]; } P.tree = a[4] >= 0 && obs[a[4]] ? obs[a[4]] : null; slam = sl(a[13]);
  const ep = num(a[12]); if (ep !== net.epoch || !walking || R.down > 0 || Math.hypot(P.x - P.tx, P.y - P.ty) > 300) { P.x = P.tx; P.y = P.ty; pdashT = 0; } net.epoch = ep;
  const b = s.RC[ot], O = RS[ot]; O.P.tx = num(b[0]); O.P.ty = num(b[1]); O.P.face = b[2] < 0 ? -1 : 1; O.P.moving = !!b[3]; O.P.tree = b[4] >= 0 && obs[b[4]] ? obs[b[4]] : null;
  O.alertV = num(b[5]); O.inv = num(b[6]); O.startleT = num(b[7]); O.dashCd = num(b[8]); O.climbT = num(b[9]); O.down = num(b[10]); O.rev = num(b[11]); O.carry = (b[14] || []).slice(0, 12).map(num); O.slam = sl(b[13]);
  if (num(b[12]) !== O.lastEp || Math.hypot(O.P.x - O.P.tx, O.P.y - O.P.ty) > 300) { O.P.x = O.P.tx; O.P.y = O.P.ty; } O.lastEp = num(b[12]);
}
function coopGuestStep(dt, glide) { const O = RS[1 - mySlot]; if (!O) return; glide(O.P); O.anim = O.P.moving ? (O.anim || 0) + dt * 14 : 0; O.startleT = Math.max(0, O.startleT - dt); O.inv -= dt; }
function cpick(i) {                                         // the guest's perk pick (co-op): the crew shares the perks
  if (multi && !isHost) return sendEv({ f: 'cpick', a: [i] }); if (!COOP || state !== 'upgrade' || !pend.farmer || !window.cpicks || !window.cpicks[i]) return;
  window.cpicks[i].apply(S); pend.farmer = false; afterPick('farmer');
}
/* ----- drawing: the friend's raccoon, the down state, and a small crew panel ----- */
const COOP_COL = ['#ffb347', '#5fd3c8'];
function drawCoopRing() { if (!COOP) return; g.save(); g.strokeStyle = COOP_COL[cur]; g.lineWidth = 2; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(P.x, P.y + 2, 19, 7, 0, 0, 7); g.stroke(); g.restore(); }
function drawDownAura() {                                   // a downed raccoon: a ring that fills as the friend revives it, and a countdown
  const R = RS[cur]; if (!COOP || !R || R.down <= 0) return;
  g.save(); g.translate(P.x, P.y); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.beginPath(); g.arc(0, -20, 26, 0, 7); g.stroke();
  g.strokeStyle = '#9be37f'; g.beginPath(); g.arc(0, -20, 26, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.min(1, R.rev / CONFIG.coop.reviveTime)); g.stroke();
  g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd0d0'; g.strokeStyle = '#000'; g.lineWidth = 3; const txt = 'help! ' + Math.ceil(R.down); g.strokeText(txt, 0, -62); g.fillText(txt, 0, -62); g.restore();
}
function drawCoopHud() {
  if (!COOP || !RS[0] || !RS[1]) return; const O = RS[1 - cur], me = RS[cur];
  g.save(); g.font = 'bold 12px "Trebuchet MS",Verdana,sans-serif'; g.textBaseline = 'middle';
  const panel = (R, label, x, y, col) => { g.fillStyle = 'rgba(10,18,30,.8)'; g.fillRect(x, y, 150, 20); g.fillStyle = col; g.fillRect(x, y, 4, 20); g.fillStyle = '#fff7e6'; g.textAlign = 'left'; g.fillText(label + ' ' + (R.down > 0 ? 'DOWN ' + Math.ceil(R.down) : R.carry.length + '/' + S.carry), x + 10, y + 10); if (R.alertV > 0.02 && !(R.down > 0)) { g.fillStyle = '#222'; g.fillRect(x + 96, y + 7, 46, 6); g.fillStyle = '#ff5252'; g.fillRect(x + 97, y + 8, 44 * Math.min(1, R.alertV), 4); } };
  panel(O, "Friend", VW - 158, 62, COOP_COL[1 - cur]); if (me.down > 0) { g.textAlign = 'center'; g.fillStyle = '#ffd0d0'; g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; g.fillText('You are down - your friend can pick you up (' + Math.ceil(me.down) + ')', VW / 2, VH - 40); }
  else if (O.down > 0) { g.textAlign = 'center'; g.fillStyle = '#b8ffb8'; g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; g.fillText('Your friend is down! Stand next to them (' + Math.ceil(O.down) + ')', VW / 2, VH - 40); edgeArrow(O.P.x, O.P.y, '#9be37f'); }
  g.restore();
}
