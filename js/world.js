/* ----- world setup ----- */
function layout() {
  obs = [];
  const radius = { tree: 16, stone: 24, bush: 30 };
  for (const k in CONFIG.scenery) for (let i = 0; i < CONFIG.scenery[k]; i++) {
    let o, n = 0;
    do { o = { k, x: lrnd(50, W - 50), y: lrnd(110, H - 30), r: radius[k] }; n++; }
    while (n < 80 && (Math.hypot(o.x - den.x, o.y - den.y) < 120 || obs.some(q => Math.hypot(q.x - o.x, q.y - o.y) < q.r + o.r + 36)));
    obs.push(o);
  }
}
function clearSpot(x, y, pad) { return !obs.some(o => solid(o) && Math.hypot(o.x - x, o.y - y) < o.r + pad); }
function spawnApple(x, y, gold = false, fall = 0, kind = 'ground') {   // kind 'ground' counts toward the nightly limit
  if (x === undefined) for (let n = 0; n < 60; n++) {
    x = rnd(40, W - 40); y = rnd(70, H - 30);
    if (clearSpot(x, y, 22) && Math.hypot(x - den.x, y - den.y) > 90) break;
  }
  apples.push({ x, y, gold, t: 0, fall, kind });
}
// Finishing a shake drops a few apples around the tree; each may be golden.
function shakeDrop(tr) {
  const n = Math.round(rnd(CONFIG.shake.apples[0] - 0.49, CONFIG.shake.apples[1] + 0.49)) + (mothNight ? 2 : 0); stat('shakes'); let gold = false;
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = tr.x + rnd(-60, 60); y = tr.y + rnd(10, 56); tries++; } while (tries < 30 && (x < 30 || x > W - 30 || y > H - 20 || !clearSpot(x, y, 20)));
    const gd = Math.random() < S.gold; gold = gold || gd; spawnApple(x, y, gd, CONFIG.apples.fallTime + i * 0.12, 'tree');
  }
  tr.cd = CONFIG.shake.cooldown; tr.shakeP = 0; tr.noisy = false; if (multi && !MODX.quiet) pop(tr.x, tr.y - 60, 'rustle!', '#ffd23f', true); if (gold) pop(tr.x, tr.y - 80, 'golden!', '#ffd23f');
}
function newPatrol(f) { f.wp = [...Array(4)].map(() => ({ x: rnd(60, W - 60), y: rnd(100, H - 50) })); f.i = 0; }
// The den moves so nobody can camp it: first = start of a night, otherwise after a deposit.
function placeDen(first) {
  const D = CONFIG.den; let best = null, bestFar = -1;
  for (let n = 0; n < 150; n++) {
    const x = rnd(D.margin, W - D.margin), y = rnd(D.margin + 50, H - D.margin);
    if (first) { best = { x, y }; break; }
    if (Math.hypot(x - den.x, y - den.y) < D.minJump || !clearSpot(x, y, 70)) continue;
    const far = Math.min(1e9, ...farmers.map(f => Math.hypot(x - f.x, y - f.y)), ...dogs.map(d => Math.hypot(x - d.x, y - d.y)));
    if (far > bestFar) { bestFar = far; best = { x, y }; }
    if (far >= D.farmerClearance) break;
  }
  if (best) { den.x = Math.round(best.x); den.y = Math.round(best.y); }
}
function spawnPoint(minD) {                                // a random spot at least minD from the den
  let x, y, n = 0; do { x = rnd(100, W - 60); y = rnd(100, H - 60); n++; } while (n < 40 && Math.hypot(x - den.x, y - den.y) < minD);
  return { x, y };
}
function startNight() {
  const cfg = CONFIG.night(night);
  startleT = 0; groundLeft = CONFIG.apples.groundPerNight; climbT = 0; climbCd = 0; slam = null; shaking = false; shakeTree = null; quota = cfg.quota; time = cfg.time; banked = 0; alertV = 0; inv = 1.5; dashT = 0; dashCd = 0; spawnT = 0; carry = []; pops = []; apples = [];
  dailyNight(); rollMod(); rollChallenges(); statsReset(); groundLeft += MODX.ground; nightTime = time;       // tonight's condition and challenges
  if ((multi ? CONFIG.den.moveMulti : CONFIG.den.moveSingle) === 'never') { den.x = CONFIG.den.x; den.y = CONFIG.den.y; } else placeDen(true);
  bumpEpoch(); P = { x: den.x + 40, y: den.y - 30, face: 1, moving: false, tree: null }; dir = { x: 1, y: 0 };
  layout(); for (let i = 0; i < Math.min(CONFIG.apples.groundMax, groundLeft); i++) spawnApple();
  modSetup(); bannerUntil = t + 6;
  farmers = [...Array(multi ? CONFIG.multiplayer.aiFarmers(night) : cfg.farmers)].map((_, i) => { const p = spawnPoint(380), f = { x: p.x, y: p.y, look: 0, ph: i * 2 }; newPatrol(f); return f; });
  if (multi) farmers.unshift(Object.assign(spawnPoint(520), { look: 0, face: 0, ph: 0, human: true, whistleCd: 0, sprintT: 0, sprintCd: 0, orderCd: 0 }));   // the human farmer, plus AI helpers
  dogs = [...Array(cfg.dogs)].map(() => Object.assign(spawnPoint(300), { tx: 400, ty: 300, wt: 0, chase: false }));
  tracks = []; lastSeen = null; net.scr = null; if (multi && isHost) sendNight();
  followCam(1); if (night === CONFIG.nightsToWin && !endless) pop(P.x, P.y - 70, 'FINAL NIGHT', '#ffd23f'); else sfxPlay('night');
  state = 'play'; $('ov').style.display = 'none'; buttons(true); last = performance.now(); kickLoop();
}

