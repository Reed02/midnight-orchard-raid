/* ----- role-aware input: this machine's own keys, or the other player's inputs ----- */
function localAim(f) { return mouse.on ? Math.atan2(mouse.y + cam.y - (f.y - 20), mouse.x + cam.x - f.x) : (f.face || 0); }
const aimHeld = () => (!multi || myRole === 'farmer') ? (held('aim') && mouse.on) : !!remote.am;      // is the farmer overriding the light with the mouse?
function autoLook(f, mv, dt) {                             // the flashlight turns to face the direction of travel (and stays put when standing still)
  if (mv && (mv.x || mv.y)) { const step = CONFIG.multiplayer.turnRate * dt; f.look = (f.look || 0) + clampN(angDiff(Math.atan2(mv.y, mv.x), f.look || 0), -step, step); }
}
function localMove() {
  let dx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), dy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  if (wheel) { const m = Math.hypot(wheel.dx, wheel.dy); if (m > WHEEL.r * 0.2) { dx = wheel.dx / m; dy = wheel.dy / m; } }     // the movement wheel
  if (drag) { const me = myEntity(), vx = drag.x + cam.x - me.x, vy = drag.y + cam.y - me.y, d = Math.hypot(vx, vy); if (d > 12) { dx = vx / d; dy = vy / d; } }
  return { x: dx, y: dy };
}
const moveVec = role => (!multi || myRole === role) ? localMove() : { x: remote.mx, y: remote.my };
const act = (role, a) => (!multi || myRole === role) ? held(a) : !!remote[a];
function localEvent(e, arg) { if (multi && !isHost) { predictEvent(e); return sendEv({ e, c: arg }); } runEvent(myRole, e, arg); }       // dash / climb / whistle from this player's controls
function runEvent(role, e, arg) {                                                                          // runs on the machine that owns the simulation
  if (state !== 'play') return;
  if (role === 'raccoon') { if (e === 'dash') doDash(); else if (e === 'climb') doClimb(); }
  else if (role === 'farmer' && e === 'whistle') doWhistle(myFarmer());
  else if (role === 'farmer' && e === 'dash') doSprint(myFarmer());
  else if (role === 'farmer' && e === 'grid') doGridOrder(arg);
  else if (role === 'farmer' && e === 'call') doCallDogs();
}
function sendEv(data) {                                   // events are sent twice (messages can drop); the host ignores repeats by id
  if (!net.r) return; data.id = (net.myPeer || 'x') + ':' + (++net.evId);
  nsend('ev', data); setTimeout(() => nsend('ev', data), 60);
}

/* ----- the farmer ----- */
/* ----- farmer stats and perks (the farmer picks one perk after each night, like the raccoon) ----- */
const FS = {};                                              // the human farmer's current stats; perks change them
const FS_KEYS = ['speed', 'sprintSpeed', 'sprintCd', 'coneLen', 'coneHalf', 'seeRadius', 'whistleCd', 'orderCd', 'dogSniff', 'trackLife', 'trackRange', 'trackEvery'];
function resetFarmerStats() { const M = CONFIG.multiplayer; Object.assign(FS, { speed: M.farmerSpeed, sprintSpeed: M.sprintSpeed, sprintCd: M.sprintCooldown, coneLen: M.coneLength, coneHalf: M.coneHalfAngle, seeRadius: M.seeRadius, whistleCd: M.whistleCooldown, orderCd: M.grid.cooldown, dogSniff: 1, trackLife: M.trackLife, trackRange: M.trackRange, trackEvery: M.trackEvery }); }
resetFarmerStats();
let pend = { raccoon: false, farmer: false };                // multiplayer: who still has to pick a perk before the next night
function moveHumanFarmer(f, dt) {
  const M = CONFIG.multiplayer, remoteF = multi && myRole !== 'farmer';
  f.sprintT = Math.max(0, (f.sprintT || 0) - dt); f.sprintCd = Math.max(0, (f.sprintCd || 0) - dt);
  f.whistleCd = Math.max(0, (f.whistleCd || 0) - dt); f.orderCd = Math.max(0, (f.orderCd || 0) - dt);
  if (remoteF && remote.ack === epoch && remote.px !== undefined) {   // the guest walks its own farmer (instant controls); the host adopts the position and checks it
    f.moving = !!(remote.mx || remote.my); if (f.moving) f.face = Math.atan2(remote.my, remote.mx);
    adoptRemote(f, remote.px, remote.py, (f.sprintT > 0 ? FS.sprintSpeed : FS.speed) * 1.1, dt); push(f, 12); f.look = remote.look; return;
  }
  const mv = moveVec('farmer'), m = Math.hypot(mv.x, mv.y), sp = f.sprintT > 0 ? FS.sprintSpeed : FS.speed; f.moving = m > 0;
  if (m) { f.x = clampN(f.x + mv.x / m * sp * dt, 30, W - 30); f.y = clampN(f.y + mv.y / m * sp * dt, 52, H - 20); f.face = Math.atan2(mv.y, mv.x); }
  if (aimHeld()) f.look = (!multi || myRole === 'farmer') ? localAim(f) : remote.aim; else autoLook(f, mv, dt);
}
function adoptRemote(e, tx, ty, speed, dt) {              // move toward the guest's reported position, never much faster than it could really travel
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 0.5) return;
  const step = Math.min(d, speed * dt * (1.3 + d / 120) + 2);
  e.x = clampN(e.x + dx / d * step, 30, W - 30); e.y = clampN(e.y + dy / d * step, 52, H - 20);
}
function remoteRaccoonStep(dt) {                          // host: the raccoon belongs to the guest
  if (remote.ack !== epoch || remote.px === undefined) return movePlayer(dt);            // no position report yet: use the input direction instead
  const m = Math.hypot(remote.mx, remote.my); P.moving = m > 0;
  if (m) { dir = { x: remote.mx / m, y: remote.my / m }; if (remote.mx) P.face = remote.mx > 0 ? 1 : -1; anim += dt * 14; } else anim = 0;
  if (dashT > 0) dashT -= dt;
  adoptRemote(P, remote.px, remote.py, dashT > 0 ? CONFIG.player.dashSpeed : S.speed * 1.1, dt); push(P, 10);
}
let tracks = [], trackT = 0, trackSide = false, lastSeen = null;     // fading raccoon footprints (only the farmer's view draws them)
const hiddenBush = () => obs.find(o => o.k === 'bush' && Math.hypot(o.x - P.x, o.y - P.y) < o.r);
let trackWasHidden = false;
function addTracks(dt) {
  const M = CONFIG.multiplayer, bush = P.tree ? null : hiddenBush();
  if (bush && !trackWasHidden) tracks = tracks.filter(k => t - k.t > M.bushErase);          // the bush swallows the last steps of the trail
  trackWasHidden = !!bush; trackT -= dt;
  if (bush) { if (trackT <= 0) { const a = Math.random() * 6.283, d = bush.r + rnd(6, 30); tracks.push({ x: bush.x + Math.cos(a) * d, y: bush.y + Math.sin(a) * d, t }); trackT = M.bushScuffEvery; } }   // false marks around the bush: he could have gone any way
  else if (trackT <= 0 && P.moving && !P.tree) { trackSide = !trackSide; tracks.push({ x: P.x + (trackSide ? 5 : -5) + rnd(-3, 3), y: P.y + 3 + rnd(-3, 3), t }); trackT = FS.trackEvery; }
  if (tracks.length && t - tracks[0].t > (FS.trackLife * MODX.trackLife)) tracks = tracks.filter(k => t - k.t < (FS.trackLife * MODX.trackLife));
}
function drawTracks(me, ox, oy) {
  if (!me) return;
  for (const k of tracks) {
    const age = t - k.t; if (age > (FS.trackLife * MODX.trackLife) || Math.hypot(k.x - me.x, k.y - me.y) > (FS.trackRange * MODX.trackRange)) continue;
    g.fillStyle = `rgba(255,236,160,${0.6 * Math.pow(1 - age / (FS.trackLife * MODX.trackLife), 1.4)})`; g.beginPath(); g.ellipse(k.x - ox, k.y - oy, 4, 2.5, 0, 0, 7); g.fill();
  }
}
/* ----- the map grid (farmer): click a square and the dogs sweep it, each dog taking its own strip ----- */
const MM = { x: 10, y: VH - 145, w: 150, h: 105 };          // where the grid is drawn: bottom-left, above the hint line
let mapOpen = true;                                         // the map key shows / hides it
const cellName = c => { const G = CONFIG.multiplayer.grid; return String.fromCharCode(65 + c % G.cols) + (Math.floor(c / G.cols) + 1); };
const dogCell = d => d.cell !== undefined ? d.cell : (d.search && d.search.cell !== undefined ? d.search.cell : -1);
function gridCellAt(p) {
  const G = CONFIG.multiplayer.grid; if (!mapOpen || !p || p.x < MM.x || p.x >= MM.x + MM.w || p.y < MM.y || p.y >= MM.y + MM.h) return -1;
  return Math.floor((p.y - MM.y) / MM.h * G.rows) * G.cols + Math.floor((p.x - MM.x) / MM.w * G.cols);
}
function doGridOrder(c) {
  const f = myFarmer(), G = CONFIG.multiplayer.grid; c = Math.floor(c);
  if (!f || !(c >= 0 && c < G.cols * G.rows) || f.orderCd > 0) return;
  if (!dogs.length) return pop(f.x, f.y - 50, 'no dogs yet', '#ccc', true);
  f.orderCd = FS.orderCd;
  const cw = W / G.cols, ch = H / G.rows, x0 = (c % G.cols) * cw, y0 = Math.floor(c / G.cols) * ch;
  dogs.forEach((d, i) => { d.search = { x: x0 + cw / 2, y: y0 + ch / 2, t: G.searchTime, cell: c, box: [x0, y0, cw, ch], strip: [i / dogs.length, (i + 1) / dogs.length] }; d.wt = 0; });
  pop(x0 + cw / 2, y0 + ch / 2 - 20, 'search ' + cellName(c), '#9fe8ff', true);
}
// Does the farmer team see the raccoon? Any farmer's light, or a dog close to it (or chasing it), counts.
function teamSees() {
  return farmers.some(f => canSee(f)) || dogs.some(d => !(d.stun > 0) && (d.chase || Math.hypot(P.x - d.x, P.y - d.y) < (hidden() ? CONFIG.dog.bushRange : CONFIG.multiplayer.dogSightRadius)));
}
function drawMinimap() {
  const G = CONFIG.multiplayer.grid, sx = MM.w / W, sy = MM.h / H, cw = MM.w / G.cols, ch = MM.h / G.rows, me = myFarmer() || {}, hov = mouse.on ? gridCellAt(mouse) : -1;
  if (teamSees()) lastSeen = { x: P.x, y: P.y, t };
  if (!mapOpen) { g.save(); g.font = '10px Verdana,sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(kn('map') + ': show map', MM.x, MM.y + MM.h); g.restore(); return; }
  const base = hov >= 0 ? 1 : 0.55;                       // see-through until the mouse is over it
  g.save(); g.globalAlpha = base; g.fillStyle = 'rgba(6,12,18,.78)'; g.fillRect(MM.x - 3, MM.y - 3, MM.w + 6, MM.h + 6);
  drawRiverMap(sx, sy);
  const ordered = new Set(dogs.map(dogCell).filter(c => c >= 0));
  for (let c = 0; c < G.cols * G.rows; c++) {
    const x = MM.x + (c % G.cols) * cw, y = MM.y + Math.floor(c / G.cols) * ch;
    if (ordered.has(c)) { g.fillStyle = 'rgba(80,170,255,.4)'; g.fillRect(x, y, cw, ch); } else if (c === hov) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, y, cw, ch); }
  }
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i <= G.cols; i++) { g.moveTo(MM.x + i * cw, MM.y); g.lineTo(MM.x + i * cw, MM.y + MM.h); }
  for (let j = 0; j <= G.rows; j++) { g.moveTo(MM.x, MM.y + j * ch); g.lineTo(MM.x + MM.w, MM.y + j * ch); }
  g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.strokeRect(MM.x + cam.x * sx, MM.y + cam.y * sy, VW * sx, VH * sy);   // the part of the map you are looking at
  g.font = '9px Verdana,sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.textAlign = 'center';
  for (let i = 0; i < G.cols; i++) g.fillText(String.fromCharCode(65 + i), MM.x + (i + .5) * cw, MM.y + 9);
  g.textAlign = 'left'; for (let j = 0; j < G.rows; j++) g.fillText(String(j + 1), MM.x + 2, MM.y + (j + .5) * ch + 3);
  const dot = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(MM.x + x * sx, MM.y + y * sy, r, 0, 7); g.fill(); };
  farmers.forEach(f => dot(f.x, f.y, f.human ? 4 : 3, f.human ? '#fff' : '#7ec8ff'));
  dogs.forEach(d => dot(d.x, d.y, 3, '#ffa94d'));
  apples.forEach(a => { if (a.jackpot) dot(a.x, a.y, 3, '#ffd23f'); }); if (strange && !strange.found) dot(strange.x, strange.y, 4, '#c58bff');
  if (lastSeen && t - lastSeen.t < 6) { g.globalAlpha = base * Math.max(0.25, 1 - (t - lastSeen.t) / 6); dot(lastSeen.x, lastSeen.y, 4, '#ff5252'); g.globalAlpha = base; }   // where the raccoon was last seen
  g.fillStyle = '#fff'; g.font = 'bold 11px Verdana,sans-serif'; g.textAlign = 'right';
  g.fillText(dogs.length ? (me.orderCd > 0 ? 'Dog orders ' + Math.ceil(me.orderCd) : (isTouch ? 'Tap' : 'Click') + ': send dogs') : 'Dogs arrive on night 3', MM.x + MM.w, MM.y - 6);
  g.restore();
}
function doCallDogs() {                                    // send the dogs to the area around where the raccoon was last seen (or just ahead of the light if it has not been seen lately)
  const f = myFarmer(), G = CONFIG.multiplayer.grid; if (!f || f.orderCd > 0) return;
  if (!dogs.length) return pop(f.x, f.y - 50, 'no dogs yet', '#ccc', true);
  const fresh = lastSeen && t - lastSeen.t < 15, R = G.callRadius, cx = fresh ? lastSeen.x : f.x + Math.cos(f.look) * CONFIG.multiplayer.whistleRange, cy = fresh ? lastSeen.y : f.y + Math.sin(f.look) * CONFIG.multiplayer.whistleRange;
  const bx = clampN(cx - R, 0, W - 2 * R), by = clampN(cy - R, 0, H - 2 * R); f.orderCd = FS.orderCd;
  dogs.forEach((d, i) => { d.search = { x: bx + R, y: by + R, t: G.searchTime, cell: -1, box: [bx, by, 2 * R, 2 * R], strip: [i / dogs.length, (i + 1) / dogs.length] }; d.wt = 0; });
  pop(bx + R, by + R - 20, fresh ? 'last seen!' : 'search here', '#9fe8ff', true);
}
function doSprint(f) { const M = CONFIG.multiplayer; if (!f || f.sprintCd > 0) return; f.sprintT = M.sprintTime; f.sprintCd = FS.sprintCd; sfxAt('sprint', f.x, f.y, 420); }   // short burst of speed
function doWhistle(f) {                                   // dogs go and search the spot ahead of the flashlight
  if (!f || f.whistleCd > 0) return;
  if (!dogs.length && !farmers.some(a => !a.human)) return pop(f.x, f.y - 50, 'nobody to call', '#ccc', true);
  const M = CONFIG.multiplayer, tx = clampN(f.x + Math.cos(f.look) * M.whistleRange, 40, W - 40), ty = clampN(f.y + Math.sin(f.look) * M.whistleRange, 80, H - 30);
  f.whistleCd = FS.whistleCd;
  for (const d of dogs) { d.search = { x: tx, y: ty, t: M.searchTime }; d.wt = 0; }
  for (const a of farmers) if (!a.human) a.search = { x: tx, y: ty, t: M.searchTime };      // AI farmers come to look too
  pop(tx, ty - 20, 'whistle!', '#9fe8ff', true);
}
const coneOf = f => f.human ? { len: FS.coneLen * MODX.cone, half: FS.coneHalf } : { len: CONFIG.farmer.coneLength * MODX.cone, half: CONFIG.farmer.coneHalfAngle };
function canSee(f) {                                      // is the raccoon inside this farmer's light (and not hiding)?
  const hb = P.tree ? null : hiddenBush();
  if (hb) return !!f.human && Math.hypot(P.x - f.x, P.y - f.y) < CONFIG.multiplayer.bushSearch;       // hiding in a bush: only a farmer who walks right up to it can find him
  const ex = P.x - f.x, ey = P.y - 15 - f.y, ed = Math.hypot(ex, ey); let da = Math.atan2(ey, ex) - f.look; da = Math.atan2(Math.sin(da), Math.cos(da));
  const c = coneOf(f);
  return ed < c.len && Math.abs(da) < c.half && !hidden() &&
    !obs.some(o => solid(o) && o !== P.tree && segHits(f.x, f.y, P.x, P.y - 15, o.x, o.y, o.r));
}

