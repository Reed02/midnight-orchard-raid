/* ----- snapshots: host -> guest, a few KB, about 12 times a second ----- */
function snapshot() {
  const r = Math.round, f1 = v => +(+v || 0).toFixed(1), f2 = v => +(+v || 0).toFixed(2);
  return { st: state, n: night, ti: f1(time), b: banked, q: quota, sc: score, h: hearts, gl: groundLeft, av: f2(alertV), inv: f1(inv), sa: f2(shakeAmt), fl: f2(flash), sl: f1(startleT), dc: f1(dashCd), ct: f1(climbT), cm: S.carry, en: endless ? 1 : 0, dn: [r(den.x), r(den.y)], pe: epoch, sq: ++net.snapSq, et: remote.ts || 0, sp: S.speed, dd: S.dashCd,
    P: [r(P.x), r(P.y), P.face, P.moving ? 1 : 0, P.tree ? obs.indexOf(P.tree) : -1], c: carry,
    sm: slam ? (slam.recover !== undefined ? [-1, f2(slam.recover)] : [f2(slam.t)]) : 0,
    F: farmers.map(f => [r(f.x), r(f.y), f2(f.look), f2(f.face), f1(f.whistleCd), f.moving ? 1 : 0, f.human ? 1 : 0, f1(f.sprintCd), f1(f.orderCd)]),
    D: dogs.map(d => [r(d.x), r(d.y), d.face, d.chase ? 1 : 0, f1(d.stun), f1(d.anim), d.search && d.search.cell !== undefined ? d.search.cell : -1]),
    A: apples.map(a => [r(a.x), r(a.y), a.gold ? 1 : 0, f2(a.fall), a.kind === 'ground' ? 0 : 1, a.jackpot ? 1 : 0]),
    T: obs.map(o => o.k === 'tree' ? [f2(o.shakeP), o.rustle > 0 ? 1 : 0, o.cd > 0 ? 1 : 0] : 0),
    sg: strange ? [r(strange.x), r(strange.y), f2(strange.prog), strange.found ? 1 : 0, f2(strange.fprog)] : 0, cp: f1(Math.max(0, compassUntil - t)),
    as: f1(Math.max(0, appleSenseUntil - t)), cb: f2(coneBuff), rf: f1(Math.max(0, revealUntil - t)), fv: FS_KEYS.map(k => +(+FS[k]).toFixed(2)) };      // finds: timed effects the guest has to draw / predict
}
function applySnap(s) {                                   // guest: copy the host's state into the same globals the drawing code reads
  if (!net.inGame || !P || !s || !Array.isArray(s.P)) return;
  if (num(s.sq) <= net.lastSq) return; net.lastSq = num(s.sq);                  // unordered delivery: drop snapshots older than one already shown
  net.lastSnapAt = performance.now(); if (s.et) { const r = net.lastSnapAt - num(s.et); net.rtt = net.rtt ? net.rtt * 0.8 + r * 0.2 : r; }
  state = 'play'; night = num(s.n); time = num(s.ti); banked = num(s.b); quota = num(s.q); score = num(s.sc); hearts = num(s.h); groundLeft = num(s.gl); alertV = num(s.av);
  inv = num(s.inv); shakeAmt = Math.max(shakeAmt, num(s.sa)); flash = Math.max(flash, num(s.fl)); startleT = num(s.sl); dashCd = num(s.dc); climbT = num(s.ct); endless = !!s.en; if (Array.isArray(s.dn)) { den.x = num(s.dn[0]); den.y = num(s.dn[1]); }
  S = { carry: num(s.cm) || 3, speed: num(s.sp) || CONFIG.player.speed, dashCd: num(s.dd) || CONFIG.player.dashCooldown }; carry = (s.c || []).slice(0, 12).map(num);
  const walking = !(s.P[4] >= 0 || s.sm);                 // false while the host is driving my raccoon (tree, cannonball)
  P.tx = num(s.P[0]); P.ty = num(s.P[1]); if (!(myRole === 'raccoon' && walking)) { P.face = s.P[2] < 0 ? -1 : 1; P.moving = !!s.P[3]; } P.tree = s.P[4] >= 0 && obs[s.P[4]] ? obs[s.P[4]] : null;
  slam = s.sm ? (s.sm[0] === -1 ? { recover: num(s.sm[1]) } : { t: num(s.sm[0]) }) : null;
  (s.F || []).slice(0, 4).forEach((a, i) => { const f = farmers[i] || (farmers[i] = { x: num(a[0]), y: num(a[1]), look: num(a[2]), ph: 0 }); f.tx = num(a[0]); f.ty = num(a[1]); f.tlook = num(a[2]); f.whistleCd = num(a[4]); f.human = !!a[6]; f.orderCd = num(a[8]); if (!(myRole === 'farmer' && f.human)) { f.face = num(a[3]); f.moving = !!a[5]; f.sprintCd = num(a[7]); } });
  farmers.length = Math.min(4, (s.F || []).length);
  const own = myRole === 'raccoon' ? P : myFarmer();     // the character this player walks itself: only snap it if the host moved it, or it drifted far
  if (own && own.tx !== undefined && (num(s.pe) !== net.epoch || (myRole === 'raccoon' && !walking) || Math.hypot(own.x - own.tx, own.y - own.ty) > 300)) { own.x = own.tx; own.y = own.ty; pdashT = 0; }
  net.epoch = num(s.pe);
  (s.D || []).slice(0, 8).forEach((a, i) => { const d = dogs[i] || (dogs[i] = { x: num(a[0]), y: num(a[1]) }); d.tx = num(a[0]); d.ty = num(a[1]); d.face = a[2] < 0 ? -1 : 1; d.chase = !!a[3]; d.stun = num(a[4]); d.anim = num(a[5]); d.cell = a[6] === undefined ? -1 : num(a[6]); });
  dogs.length = Math.min(8, (s.D || []).length);
  apples = (s.A || []).slice(0, 80).map(a => ({ x: num(a[0]), y: num(a[1]), gold: !!a[2], fall: num(a[3]), kind: a[4] ? 'tree' : 'ground', t: 0, jackpot: !!a[5], value: a[5] ? 6 : undefined }));
  strange = Array.isArray(s.sg) ? { x: num(s.sg[0]), y: num(s.sg[1]), prog: num(s.sg[2]), found: !!s.sg[3], fprog: num(s.sg[4]) } : null; compassUntil = t + num(s.cp);
  appleSenseUntil = t + num(s.as); coneBuff = num(s.cb) || 1; revealUntil = t + num(s.rf); if (Array.isArray(s.fv)) FS_KEYS.forEach((k, i) => { const v = +s.fv[i]; if (Number.isFinite(v)) FS[k] = clampN(v, 0, 2000); });
  (s.T || []).forEach((v, i) => { if (v && obs[i]) { obs[i].shakeP = num(v[0]); obs[i].rustle = v[1] ? 0.2 : 0; obs[i].cd = v[2] ? 1 : 0; } });
}
function sendNight() {                                    // host: the layout of a new night (re-sent every few seconds in case it was dropped)
  net.lastNight = { dr: duelHud, sid: ++net.sid, n: night, en: endless ? 1 : 0, o: obs.map(o => [o.k, Math.round(o.x), Math.round(o.y), o.r]), md: MOD.id, rv: riverPack(), lv: LV ? LV.key : 0, ch: [CH.raccoon, CH.farmer], rl: otherRole(myRole), fs: FS_KEYS.map(k => +(+FS[k]).toFixed(3)), dn: [Math.round(den.x), Math.round(den.y)], P: [Math.round(P.x), Math.round(P.y)] };
  nsend('night', net.lastNight);
}
function predictRaccoon(dt) {                             // guest: walk my own raccoon with the same rules as the host, so the controls feel instant
  if (!dir) dir = { x: 1, y: 0 };
  const sh = held('shake') && nearTree(CONFIG.shake.range); if (sh && !(sh.cd > 0)) { P.moving = false; return; }       // standing still while shaking
  const mv = localMove(), m = Math.hypot(mv.x, mv.y); P.moving = m > 0; let vx = 0, vy = 0;
  if (m) { dir = { x: mv.x / m, y: mv.y / m }; if (mv.x) P.face = mv.x > 0 ? 1 : -1; const sp = (S.speed || CONFIG.player.speed) * (1 - CONFIG.player.carrySlow * carry.length) * (hidden() ? 0.6 : 1); vx = dir.x * sp; vy = dir.y * sp; }
  if (pdashT > 0) { pdashT -= dt; vx = dir.x * CONFIG.player.dashSpeed; vy = dir.y * CONFIG.player.dashSpeed; }
  P.x = clampN(P.x + vx * dt, 30, W - 30); P.y = clampN(P.y + vy * dt, 52, H - 20); push(P, 10); P.tx = P.x; P.ty = P.y;
}
function predictFarmer(f, dt) {                           // guest: walk my own farmer (and turn its light) locally
  const M = CONFIG.multiplayer, mv = localMove(), m = Math.hypot(mv.x, mv.y);
  f.sprintT = Math.max(0, (f.sprintT || 0) - dt); f.sprintCd = Math.max(0, (f.sprintCd || 0) - dt); f.moving = m > 0;
  if (m) { const sp = f.sprintT > 0 ? FS.sprintSpeed : FS.speed; f.x = clampN(f.x + mv.x / m * sp * dt, 30, W - 30); f.y = clampN(f.y + mv.y / m * sp * dt, 52, H - 20); f.face = Math.atan2(mv.y, mv.x); push(f, 12); }
  if (aimHeld()) f.look = localAim(f); else autoLook(f, mv, dt);
  f.tx = f.x; f.ty = f.y;
}
function predictEvent(e) {                                // guest: start a dash or sprint right away; the host does the same when the event arrives
  if (state !== 'play') return;
  if (myRole === 'raccoon' && e === 'dash' && !P.tree && !slam && dashCd <= 0) { pdashT = CONFIG.player.dashTime; dashCd = S.dashCd || CONFIG.player.dashCooldown; sfxAt('dash', P.x, P.y, 420); }
  else if (myRole === 'farmer' && e === 'dash') { const f = myFarmer(); if (f && !(f.sprintCd > 0)) { f.sprintT = CONFIG.multiplayer.sprintTime; f.sprintCd = FS.sprintCd; sfxAt('sprint', f.x, f.y, 420); } }
}
function sendInput(now) {                                 // guest: inputs plus my own position; sent when something changes, otherwise about 25 times a second
  const mv = localMove(), me = myEntity(), sh = held('shake') ? 1 : 0, am = myRole === 'farmer' && aimHeld() ? 1 : 0, sig = mv.x + ',' + mv.y + ',' + sh + ',' + am;
  if (sig === net.lastSig && now - net.inpAt < 40) return; net.lastSig = sig; net.inpAt = now;
  nsend('inp', { sq: ++net.inpSq, ts: Math.round(now), mx: +mv.x.toFixed(2), my: +mv.y.toFixed(2), sh, am, aim: myRole === 'farmer' ? +localAim(me).toFixed(2) : 0,
    px: +me.x.toFixed(1), py: +me.y.toFixed(1), lk: myRole === 'farmer' && me.look !== undefined ? +me.look.toFixed(2) : 0, ack: net.epoch });
}
function guestLoop(now, id) {                             // guest: no simulation, just smooth the latest snapshot and draw it
  if (!net.inGame || id !== net.loopId) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  const k = Math.min(1, dt * 16), glide = e => { if (e.tx === undefined) return; if (Math.hypot(e.tx - e.x, e.ty - e.y) > 160) { e.x = e.tx; e.y = e.ty; } else { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; } };
  if (myRole === 'raccoon' && !(P.tree || slam)) predictRaccoon(dt); else glide(P);
  dogs.forEach(glide); dashCd = Math.max(0, dashCd - dt);
  farmers.forEach(f => { if (f.human && myRole === 'farmer') predictFarmer(f, dt); else { glide(f); f.look += angDiff(f.tlook === undefined ? f.look : f.tlook, f.look) * k; } });
  addTracks(dt); anim = P.moving ? anim + dt * 14 : 0; shakeAmt = Math.max(0, shakeAmt - dt); flash = Math.max(0, flash - dt); startleT = Math.max(0, startleT - dt); inv -= dt;
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0);
  if (performance.now() - net.lastSnapAt > 6000) { net.inGame = false; return show(`<h1>Connection lost</h1><p>No word from the host for a while.</p><button onclick="leaveGame()">Back to menu</button>`); }
  sendInput(now); audioTick(dt); followCam(dt); draw(); requestAnimationFrame(tt => guestLoop(tt, id));
}

/* ----- connection helpers: clear error messages, a version check, and keeping the screen awake ----- */
function netError(type, message) { const e = new Error(message); e.type = type; return e; }
function netErrorText(e, code, hosting) {                // turn a connection failure into something a player can act on
  const ty = e && e.type, c = code ? String(code).toUpperCase() : '';
  if (ty === 'lib') return 'The multiplayer library could not load. Check your internet connection (some school or work networks block it).';
  if (ty === 'peer-unavailable') return `No game with code ${c} is open right now. Check the code, and make sure the host is still on the lobby screen (not switched to another app).`;
  if (ty === 'unavailable-id') return 'That room code is already taken. Try hosting again.';
  if (ty === 'webrtc') return 'A direct connection could not be set up (a strict network or firewall). Try the same Wi-Fi, or a phone hotspot.';
  if (['network', 'server-error', 'socket-error', 'socket-closed', 'timeout'].includes(ty)) return hosting ? 'Could not reach the matchmaking server. Check your internet and try again (some school or work networks block it).' : 'Could not reach the host or the matchmaking server. Check your internet and the code, then try again.';
  return (hosting ? 'Could not open a room.' : 'Could not join that room.') + (e && e.message ? ' (' + e.message + ')' : '');
}
function hostWarn() {                                    // lobby warnings for the host
  let s = ''; if (net.r && net.r.online && !net.r.online()) s += '<p class="warn">Reconnecting to the matchmaking server... keep this screen open.</p>';
  if (net.badVer) s += '<p class="warn">Someone tried to join with a different version of the game. You both should reload the page.</p>'; return s;
}
let wakeLock = null, wakeWanted = false;                   // a sleeping phone screen drops the connection, so ask the browser to keep it on while connecting and playing
async function wakeOn() { wakeWanted = true; try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); if (wakeLock && wakeLock.addEventListener) wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {} }
function wakeOff() { wakeWanted = false; try { if (wakeLock) wakeLock.release(); } catch (e) {} wakeLock = null; }
addEventListener('visibilitychange', () => { if (!document.hidden && wakeWanted && !wakeLock) wakeOn(); });

/* ----- room plumbing ----- */
async function bindRoom(code, hosting = false) {
  try { net.r = await peerRoomJoin(code, hosting); } catch (e) { net.lastErr = e; console.error('Multiplayer connection failed:', e); return false; }
  const r = net.r; net.code = code;
  const on = (topic, fn) => net.unsubs.push(r.on(topic, m => { if (!m.isMe) fn(m.data || {}, m); }));
  net.unsubs.push(r.on('hello', m => { if (m.isMe && m.sameTab) net.myPeer = m.peer; else onHello(m.data || {}, m); }));
  on('welcome', onWelcome); on('inp', onInp); on('ev', onEv); on('snap', onSnap); on('night', onNight); on('scr', onScr); on('pop', onPop); on('bye', onBye); on('disc', onDisc);
  net.unsubs.push(r.onPeers(ch => { if (ch.left && ch.left.length) onPeerLeft(ch.left); }));
  return true;
}
function leaveGame(notify = true, stay = false) {
  refundKeep(); series = null; duelHud = 0;
  clearInterval(net.timer); clearInterval(net.helloTimer); wakeOff(); net.badVer = false; net.progress = null;
  if (net.r) { if (notify) nsend('bye', {}); net.unsubs.forEach(u => { try { u(); } catch (e) {} }); try { net.r.leave().catch(() => {}); } catch (e) {} }
  net.r = null; net.unsubs = []; net.hosting = null; net.guestPeer = net.hostPeer = net.myPeer = null; net.inGame = false; net.loopId++; net.scr = null; net.lastNight = null; net.sidSeen = net.scrSeen = -1; net.lastSq = -1; net.epoch = -1; net.inpSq = 0; net.snapSq = 0; remote.sq = 0; remote.ack = -2; remote.px = undefined;
  multi = false; isHost = true; myRole = 'raccoon'; if (state !== 'title') state = 'title';
  if (!stay) titleScreen();
}
function onPeerLeft(left) {
  if (net.hosting && net.guestPeer && left.some(p => p.peer === net.guestPeer)) {
    net.guestPeer = null; multi = false; state = 'lobby'; net.inGame = false; series = null; duelHud = 0;
    show(`<h1>Your friend left</h1><p>The game has stopped.</p><div class="row"><button onclick="hostLobby()">Back to lobby</button><button class="up" onclick="leaveGame()">Quit</button></div>`);
  } else if (!net.hosting && net.hostPeer && left.some(p => p.peer === net.hostPeer)) {
    net.inGame = false; net.loopId++; show(`<h1>The host left</h1><p>The game has ended.</p><button onclick="leaveGame()">Back to menu</button>`);
  }
}
function onBye(d, m) { onPeerLeft([{ peer: m.peer }]); }
function onHello(d, m) {                                  // host: a friend knocked
  if (!net.hosting) return;
  if (num(d.v) !== NET_VERSION) { net.badVer = true; nsend('welcome', { to: m.peer, full: 1, bad: 1, hv: NET_VERSION }); if (state === 'lobby') hostLobby(); return; }     // different game versions (old ones read this as "room full")
  net.badVer = false;
  if (net.guestPeer && net.guestPeer !== m.peer) return nsend('welcome', { to: m.peer, full: 1 });
  const first = !net.guestPeer; net.guestPeer = m.peer; if (first) { remote.sq = 0; remote.ack = -2; remote.px = undefined; } multi = true; isHost = true; myRole = net.hosting.role;
  net.theirCos = cosClean(d.cs); net.theirPid = String(d.pid || '').replace(/[^a-z0-9]/gi, '').slice(0, 12); nsend('welcome', { to: m.peer, role: otherRole(myRole), cs: myCos(), pid: myPid() });
  if (state === 'lobby') hostLobby(); else if (!first) { if (net.lastNight) nsend('night', net.lastNight); if (net.scr && state !== 'play') nsend('scr', net.scr); }
}
function onWelcome(d, m) {                                // guest: the host answered
  if (net.hosting || d.to !== net.myPeer) return;
  clearInterval(net.helloTimer);
  if (d.bad) return show(`<h1>Different game versions</h1><p>You and the host are not running the same version of the game. Reload the page (try Ctrl+Shift+R, or clear the site's data on a phone) and try again.</p><div class="row"><button onclick="leaveGame()">Back</button></div>`, 'mp');
  if (d.full) return show(`<h1>Room full</h1><p>That game already has two players.</p><button onclick="leaveGame()">Back</button>`);
  net.theirCos = cosClean(d.cs); net.theirPid = String(d.pid || '').replace(/[^a-z0-9]/gi, '').slice(0, 12); net.hostPeer = m.peer; multi = true; isHost = false; myRole = d.role === 'farmer' ? 'farmer' : 'raccoon';
  show(`<h1>Connected!</h1><p>You are the <b>${myRole}</b>. Waiting for the host to start the raid...</p><button class="up" onclick="leaveGame()">Leave</button>`);
}
function onInp(d, m) {
  if (!net.hosting || m.peer !== net.guestPeer) return;
  const sq = num(d.sq); if (sq && sq <= remote.sq) return; remote.sq = sq;           // messages can arrive out of order: ignore stale ones
  remote.mx = num(d.mx); remote.my = num(d.my); remote.shake = !!d.sh; remote.aim = num(d.aim); remote.am = !!d.am; remote.ts = d.ts; remote.t = performance.now();
  if (d.px !== undefined) { remote.px = num(d.px); remote.py = num(d.py); remote.look = num(d.lk); remote.ack = num(d.ack); }
}
const CMDS = { pick: i => { if (otherRole(myRole) === 'raccoon') pick(i); }, fpick: i => { if (otherRole(myRole) === 'farmer') fpick(i); }, newRun: () => newRun(), keepGoing: () => keepGoing(), swapRoles: () => swapRoles(), condScreen: () => condScreen(), duelNext: () => duelNext(), duelStart: () => duelStart() };
function onEv(d, m) {
  if (!net.hosting || m.peer !== net.guestPeer || net.seen.has(d.id)) return;
  net.seen.add(d.id); if (net.seen.size > 60) net.seen.delete(net.seen.values().next().value);
  if (d.f) { if (CMDS[d.f]) CMDS[d.f](...(Array.isArray(d.a) ? d.a.map(num) : [])); } else if (d.e === 'item') runItem(otherRole(myRole), num(d.c)); else if (d.e === 'dash' || d.e === 'climb' || d.e === 'whistle' || d.e === 'grid' || d.e === 'call') runEvent(otherRole(myRole), d.e, num(d.c));
}
function onSnap(d, m) { if (net.hosting || m.peer !== net.hostPeer) return; applySnap(d); }
function onNight(d, m) {                                  // guest: a new night begins
  if (net.hosting || m.peer !== net.hostPeer || d.sid === net.sidSeen || !Array.isArray(d.o)) return; net.sidSeen = d.sid;
  obs = d.o.slice(0, 80).map(a => ({ k: ['tree', 'stone', 'bush'].includes(a[0]) ? a[0] : 'stone', x: num(a[1]), y: num(a[2]), r: num(a[3]) }));
  apples = []; farmers = []; dogs = []; pops = []; carry = []; tracks = []; lastSeen = null; slam = null; S = { carry: 3 };
  P = { x: num(d.P[0]), y: num(d.P[1]), tx: num(d.P[0]), ty: num(d.P[1]), face: 1, moving: false, tree: null };
  riverUnpack(d.rv, num(d.lv)); setMod(String(d.md)); CH = { raccoon: d.ch && d.ch[0] ? String(d.ch[0]) : null, farmer: d.ch && d.ch[1] ? String(d.ch[1]) : null }; if (d.rl === 'farmer' || d.rl === 'raccoon') myRole = d.rl; strange = null; compassUntil = 0; bannerUntil = t + 6; duelHud = num(d.dr); if (num(d.n) === 1) packKeepsake();
  if (Array.isArray(d.fs)) FS_KEYS.forEach((k, i) => { const v = +d.fs[i]; if (Number.isFinite(v)) FS[k] = clampN(v, 0, 2000); });
  night = num(d.n); endless = !!d.en; if (Array.isArray(d.dn)) { den.x = num(d.dn[0]); den.y = num(d.dn[1]); } lastSeen = null; state = 'play'; net.scr = null; $('ov').style.display = 'none'; buttons(true); followCam(1); if (!(night === CONFIG.nightsToWin && !endless)) sfxPlay('night');
  net.lastSnapAt = performance.now();
  if (!net.inGame) { net.inGame = true; last = performance.now(); const id = ++net.loopId; requestAnimationFrame(tt => guestLoop(tt, id)); }
}
function onScr(d, m) {                                    // guest: the host shows a screen (built here from data, never raw HTML)
  if (net.hosting || m.peer !== net.hostPeer || d.id === net.scrSeen || !d.sp) return; net.scrSeen = d.id;
  net.inGame = false; net.loopId++; state = 'screen'; if (String(d.sp.k) === 'end' && !d.sp.win) refundKeep();
  const res = cleanRes(d.sp.res); if (res && res.ch && res.ch[2] && res.ch[3] && ['upgrade', 'end'].includes(String(d.sp.k))) { recordChallenge(res.ch[3]); const fd = grantFind(myRole, 'badge', String(d.sp.k) === 'upgrade'); if (fd) res.lines.push('Found: ' + fd.name); }     // my badge, earned this night
  let sr = null; if (d.sp.sr && Array.isArray(d.sp.sr.lines)) { sr = { r: num(d.sp.sr.r), done: d.sp.sr.done ? 1 : 0, lines: d.sp.sr.lines.slice(0, 4).map(x => String(x).slice(0, 60)) }; if (sr.done) recordH2H(['win', 'loss', 'draw'].includes(d.sp.sr.out) ? d.sp.sr.out : ''); }
  show(screenHtml({ k: String(d.sp.k), n: d.sp.n, s: d.sp.s, p: d.sp.p, res, sr, who: d.sp.who === 'farmer' ? 'farmer' : 'raccoon', win: !!d.sp.win, h: String(d.sp.h || '').slice(0, 80), t: String(d.sp.t || '').slice(0, 300) }));
  screenSound({ k: String(d.sp.k), win: !!d.sp.win });
}
function onPop(d, m) {
  if (net.hosting || m.peer !== net.hostPeer || !Array.isArray(d.a)) return; const a = d.a;
  pops.push({ x: num(a[0]), y: num(a[1]), s: String(a[2]).slice(0, 24), c: /^#[0-9a-f]{3,6}$/i.test(a[3]) ? a[3] : '#fff', top: !!a[4], l: 0.9 });
  popSound(String(a[2]).slice(0, 24), num(a[0]), num(a[1]));
}

/* ----- lobby screens ----- */
function mpMenu() {
  if (!net.room) return show(`<h1>Multiplayer</h1><p>Multiplayer needs a connection that isn't available here. Open the game from its web page and try again.</p><div class="row"><button onclick="titleScreen()">Back</button></div>`, 'mp');
  show(`<h1>Multiplayer</h1><p class="tag">One raccoon raids the orchard. One farmer hunts it in the dark.</p>
  <div class="cards"><div class="card"><b>Raccoon</b>Grab apples and stay out of the light. Best played by the host (no lag).</div><div class="card"><b>Farmer</b>Sees only by flashlight and footprints. Sprint, whistle, and send the dogs.</div></div>
  <div class="row"><button class="big" onclick="hostGame('raccoon')">Host <small>as raccoon</small></button><button class="big alt" onclick="hostGame('farmer')">Host <small>as farmer</small></button></div>
  <div class="row"><span class="lbl">Join a friend:</span><input id="code" maxlength="8" placeholder="code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text"><button onclick="joinGame()">Join</button></div>
  <div class="row"><button class="up" onclick="titleScreen()"><b>Back</b></button></div>`, 'mp');
}
async function hostGame(role) {
  leaveGame(false, true); wakeOn(); show('<h1>Hosting</h1><p>Opening a room...</p>');
  const code = Array.from({ length: 4 }, () => 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]).join('');
  if (!(await bindRoom(code, true))) { wakeOff(); return show(`<h1>Could not open a room</h1><p>${esc(netErrorText(net.lastErr, code, true))}</p><div class="row"><button onclick="hostGame('${role}')">Try again</button><button class="up" onclick="mpMenu()"><b>Back</b></button></div>`, 'mp'); }
  net.hosting = { role, code }; state = 'lobby'; hostLobby(); net.timer = setInterval(netTick, 2000);
}
function hostLobby() {
  state = 'lobby'; const h = net.hosting; if (!h) return;
  show(`<h1>Room code: ${esc(h.code.toUpperCase())}</h1><p>You are the <b>${esc(h.role)}</b>. Your friend opens the same link, taps Multiplayer, types the code and joins. Keep this screen open until they are in.</p>${hostWarn()}<p>${net.guestPeer ? 'Your friend is connected!' : 'Waiting for your friend...'}</p>
  <div class="row">${net.guestPeer ? '<button onclick="startRaid()">Start raid</button><button class="alt" onclick="duelStart()"><b>Start duel</b></button>' : ''}<button class="up" onclick="leaveGame()">Cancel</button></div>`);
}
async function joinGame() {
  const code = ($('code').value || '').replace(/[^a-z]/gi, '').toLowerCase();
  if (!/^[a-z]{4}$/.test(code)) { const f = $('code'); if (f) { f.style.outline = '3px solid #ff7a6a'; f.focus(); } return; }
  leaveGame(false, true); wakeOn(); show(`<h1>Joining</h1><p>Looking for the host...</p>`, 'join');
  net.progress = (i, n) => { if (i > 1 && $('ov').dataset.screen === 'join') show(`<h1>Joining</h1><p>Looking for the host... (try ${i} of ${n})</p><p>Is the host still on the lobby screen?</p>`, 'join'); };
  const ok = await bindRoom(code, false); net.progress = null;
  if (!ok) { wakeOff(); return show(`<h1>Could not join</h1><p>${esc(netErrorText(net.lastErr, code, false))}</p><div class="row"><button onclick="mpMenu()">Back</button></div>`, 'mp'); }
  net.helloTries = 0; nsend('hello', { v: NET_VERSION, cs: myCos(), pid: myPid() });
  net.helloTimer = setInterval(() => {
    if (++net.helloTries > 8) { clearInterval(net.helloTimer); wakeOff(); return show(`<h1>No answer</h1><p>You reached the matchmaking server, but the host's game did not answer. Ask the host to stay on the lobby screen, then try again.</p><div class="row"><button onclick="mpMenu()">Back</button></div>`, 'mp'); }
    nsend('hello', { v: NET_VERSION, cs: myCos(), pid: myPid() });
  }, 1500);
}
function netTick() {
  if (state === 'lobby' && net.hosting && net.r) { const on = net.r.online ? net.r.online() : true; if (on !== net.lastOnline) { net.lastOnline = on; hostLobby(); } }     // show "reconnecting" while the link to the matchmaking server is down                                      // host: re-send what a dropped message may have lost
  if (!net.r || !net.hosting || !net.guestPeer) return;
  if (state === 'play') { if (net.lastNight && ++net.tick % 3 === 0) nsend('night', net.lastNight); } else if (net.scr) nsend('scr', net.scr);
}

