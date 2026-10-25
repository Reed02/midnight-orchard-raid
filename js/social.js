/* ===== FRIENDS, MAIL AND VISITS =====
   There is no server: the page is static (GitHub Pages). Every player has a FRIEND CODE (6 letters, saved in raidSocial) and, while the game is open,
   listens on the PeerJS id  midnightorchard-home-<code>. Friends' games connect straight to each other (WebRTC data channels, reliable, JSON).
     Friends:  add someone by their code -> they get a request (now, or the next time you are both online) -> they accept.
     Mail:     letters (with apples or produce as a gift) wait in your OUTBOX until the friend is online, then are delivered once (id + ack).
     Visits:   walk round a friend's homestead while they are in theirs. Their game is the authority: it sends you their base (BASE_KEYS of their
               save), you send your position and ask it to do things (ops), it checks your PERMISSION and does them, then sends the base again.
               PERMS: 0 Visitor (look round, leave notes, water the garden), 1 Gardener (+ plant with your own apples and pick for them),
               2 Decorator (+ move, flip, place things from their storage, paint floors). Buying, selling, digging and reshaping are owner-only.
     Away:     each friend's base is also kept (the snapshot they send when you connect), so you can wander it while they are offline and pin
               notes; the notes are delivered with the mail.
   While visiting, HOME is a mix: the friend's base keys + your own PERSONAL keys (apples, skins, pantry...); homeSave writes only yours.
   Transport: SN (PeerJS by default). Tests replace window.SN_IMPL with a fake that relays between pages. */
const SOCIAL_V = 1, PERMS = ['Visitor', 'Gardener', 'Decorator'], PERM_TEXT = ['look round, leave notes, water plants', 'also plant and pick in the garden', 'also move and place things, paint floors'];
const PERSONAL_KEYS = ['v', 'apples', 'skins', 'owned', 'mail', 'seen', 'born', 'rec', 'pantry', 'meals', 'packed', 'rested', 'restBuff'];
const BASE_KEYS = ['house', 'fix', 'placed', 'grid', 'rooms', 'dug', 'garden', 'notes', 'store', 'unlock', 'mig'];
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let SOC = null, VISIT = null, HOSTING = {}, OTHERS = {}, SNET = null, socLinks = {}, socReq = 0, socWait = {}, socStateT = 0, socLastPoll = 0, socDT = 0;
function socialLoad() {
  const d = store('raidSocial', {}); SOC = { code: typeof d.code === 'string' && /^[A-Z2-9]{6}$/.test(d.code) ? d.code : '', name: typeof d.name === 'string' ? d.name.slice(0, 20) : '',
    friends: Array.isArray(d.friends) ? d.friends.filter(f => f && /^[A-Z2-9]{6}$/.test(f.code)) : [], out: Array.isArray(d.out) ? d.out : [], inbox: Array.isArray(d.inbox) ? d.inbox : [] };
  if (!SOC.code) { SOC.code = Array.from({ length: 6 }, () => CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]).join(''); socialSave(); }
  SOC.friends.forEach(f => { f.perm = Math.max(0, Math.min(2, +f.perm || 0)); f.st = ['friend', 'out', 'in'].includes(f.st) ? f.st : 'out'; });
}
const socialSave = () => save('raidSocial', { code: SOC.code, name: SOC.name, friends: SOC.friends, out: SOC.out.slice(-80), inbox: SOC.inbox.slice(-100) });
const myCode = () => SOC ? SOC.code : '';
const myName = () => (SOC && SOC.name) || 'Raccoon ' + myCode();
const friend = c => SOC.friends.find(f => f.code === c);
const isVisiting = () => !!VISIT;
const visitPerm = () => VISIT && VISIT.live ? VISIT.perm : -1;
const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/* ----- the transport: PeerJS (one listening peer per player) ----- */
const SN_PREFIX = 'midnightorchard-home-';
function snPeerJS() {
  let peer = null, onConn = null, state = 'off'; const wait = new Map();                 // id -> fail(), for "nobody is listening there"
  return {
    get state() { return state; },
    up(code, cb) {
      if (peer || typeof Peer === 'undefined') return; onConn = cb; state = 'connecting';
      const N = CONFIG.network, opts = Object.assign({ debug: 0 }, N.peerServer || {}); if (N.iceServers) opts.config = { iceServers: N.iceServers };
      peer = new Peer(SN_PREFIX + code.toLowerCase(), opts);
      peer.on('open', () => { state = 'on'; }); peer.on('connection', c => onConn && onConn(c));
      peer.on('disconnected', () => { state = 'connecting'; setTimeout(() => { try { if (peer && !peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) {} }, 1500); });
      peer.on('error', e => { if (e && e.type === 'unavailable-id') state = 'elsewhere'; else if (e && e.type === 'peer-unavailable') { const m = String(e.message || '').match(/midnightorchard-home-[a-z0-9]+/); if (m && wait.has(m[0])) { wait.get(m[0])(); wait.delete(m[0]); } } else if (state === 'connecting' && e && /network|server|socket/.test(e.type || '')) state = 'offline'; });
    },
    connect(code) {
      if (!peer || state !== 'on') return null; const id = SN_PREFIX + code.toLowerCase(), c = peer.connect(id, { reliable: true, serialization: 'json' });
      wait.set(id, () => { try { c.close(); } catch (e) {} c.emit && c.emit('error', new Error('unavailable')); }); c.on('open', () => wait.delete(id)); return c;
    },
  };
}
const SN = () => SNET || (SNET = (window.SN_IMPL ? window.SN_IMPL() : snPeerJS()));
function socialUp() { if (!SOC) socialLoad(); SN().up(SOC.code, c => socAttach(c, null)); }
const socialOnline = () => SN().state === 'on';
/* ----- links: one open connection per friend, whoever opened it ----- */
function socConnect(code, then) {
  const L = socLinks[code]; if (L && L.ok) { if (then) then(L); return L; } if (L && L.trying) { if (then) (L.thens = L.thens || []).push(then); return L; }
  const c = SN().connect(code); if (!c) { if (then) then(null); return null; }
  const link = socAttach(c, code); link.trying = 1; link.thens = then ? [then] : [];
  link.timer = setTimeout(() => { if (!link.ok) { try { c.close(); } catch (e) {} socDrop(link); } }, 7000); return link;
}
function socAttach(c, code) {
  const link = { c, code, ok: 0, mine: !!code };
  c.on('open', () => { socSend(link, { t: 'hello', v: SOCIAL_V, code: SOC.code, name: myName(), st: socState(), skin: HOME_REAL().skins.raccoon, cos: myCos() }); });
  c.on('data', m => { try { socMsg(link, m); } catch (e) { console.error(e); } });
  c.on('close', () => socDrop(link)); c.on('error', () => socDrop(link));
  if (code) socLinks[code] = link; return link;
}
function socDrop(link) {
  if (link.dead) return; link.dead = 1; clearTimeout(link.timer); const code = link.code; if (link.thens) { link.thens.forEach(f => f(null)); link.thens = null; }
  if (code && socLinks[code] === link) { delete socLinks[code]; const f = friend(code); if (f) { f.on = 0; f.seen = Date.now(); }
    if (HOSTING[code]) { delete HOSTING[code]; delete OTHERS[code]; if (state === 'home') pop(P.x, P.y - 100, (f ? f.name : 'Your visitor') + ' went home', '#cfd8e6'); }
    if (VISIT && VISIT.live && VISIT.code === code) visitLost(); refreshSocialScreen(); }
}
function socSend(link, m) { if (!link || !link.c) return false; try { link.c.send(m); return true; } catch (e) { return false; } }
const socState = () => VISIT ? 'visiting' : ['home', 'homemenu'].includes(state) ? 'home' : ['play', 'paused', 'upgrade', 'wait', 'over', 'won'].includes(state) ? 'raiding' : 'menu';
/* ----- messages ----- */
const S_ = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n);
function socMsg(link, m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'hello') {
    const code = S_(m.code, 6); if (!/^[A-Z2-9]{6}$/.test(code) || code === SOC.code) { try { link.c.close(); } catch (e) {} return; }
    const old = socLinks[code];
    if (old && old !== link && old.ok) {                                                  // two links at once: keep the one the smaller code opened
      const keepMine = SOC.code < code; if (link.mine !== keepMine) { link.code = code; link.dup = 1; const th = link.thens; link.thens = null; if (th) th.forEach(fn => fn(old)); return; }
      old.dup = 1; if (old.thens) { link.thens = (link.thens || []).concat(old.thens); old.thens = null; } delete socLinks[code]; try { old.c.close(); } catch (e) {} }
    link.code = code; link.ok = 1; link.trying = 0; clearTimeout(link.timer); socLinks[code] = link; link.v = m.v; link.st = S_(m.st, 10); link.name = S_(m.name, 20); link.skin = S_(m.skin, 20); link.cos = m.cos;
    const f = friend(code); if (f) { f.name = link.name || f.name; f.on = 1; f.st2 = link.st; f.seen = Date.now(); if (f.st === 'friend') socSend(link, { t: 'base', base: baseOf(HOME_REAL()) }); }
    if (m.v !== SOCIAL_V) { link.old = 1; }
    socFlush(code); if (link.thens) { const th = link.thens; link.thens = null; th.forEach(fn => fn(link)); } socialSave(); refreshSocialScreen(); return;
  }
  if (link.dup || !link.ok) return; const code = link.code, f = friend(code);
  if (m.t === 'st') { link.st = S_(m.st, 10); if (f) f.st2 = link.st; refreshSocialScreen(); return; }
  if (m.t === 'ack') { const i = SOC.out.findIndex(o => o.id === m.id); if (i >= 0) { const o = SOC.out[i]; SOC.out.splice(i, 1); socialSave(); if (o.k === 'freq' && f && f.st === 'out' && m.acc) f.st = 'friend'; refreshSocialScreen(); } return; }
  if (m.t === 'freq') {                                                                     // a friend request (we may not know them yet)
    let g2 = f; if (!g2) { if (SOC.friends.length >= 60) return; g2 = { code, name: S_(m.name, 20) || code, perm: 0, st: 'in', t: Date.now() }; SOC.friends.push(g2); }
    else if (g2.st === 'out') g2.st = 'friend';                                           // we both asked: friends
    g2.on = 1; socialSave(); socSend(link, { t: 'ack', id: m.id, acc: g2.st === 'friend' ? 1 : 0 }); if (g2.st === 'friend') socSend(link, { t: 'base', base: baseOf(HOME_REAL()) });
    if (state === 'home') pop(P.x, P.y - 100, (g2.name || code) + (g2.st === 'friend' ? ' is now your friend' : ' wants to be friends (see Friends)'), '#ffd23f', true); refreshSocialScreen(); return;
  }
  if (!f) return;                                                                            // everything else is between friends
  if (m.t === 'facc') { if (f.st !== 'friend') { f.st = 'friend'; socialSave(); socSend(link, { t: 'base', base: baseOf(HOME_REAL()) }); if (state === 'home') pop(P.x, P.y - 100, f.name + ' accepted: you are friends!', '#9be37f', true); refreshSocialScreen(); } return; }
  if (m.t === 'fdel') { SOC.friends.splice(SOC.friends.indexOf(f), 1); socialSave(); refreshSocialScreen(); return; }
  if (f.st !== 'friend') return;
  if (m.t === 'base' && m.base && typeof m.base === 'object') { f.base = m.base; f.baseT = Date.now(); socialSave(); return; }
  if (m.t === 'mail') { if (!SOC.inbox.some(q => q.id === m.id)) { SOC.inbox.push(cleanLetter(m, f)); socialSave(); if (state === 'home') pop(P.x, P.y - 100, 'A letter from ' + f.name + '!', '#ffd23f', true); } socSend(link, { t: 'ack', id: m.id }); refreshSocialScreen(); return; }
  if (m.t === 'note') { if (VISIT) return; noteApply(Object.assign({}, m.n, { from: code, name: f.name }), { name: f.name }); homeSave(); socSend(link, { t: 'ack', id: m.id }); return; }   // (while you are away visiting, it is delivered later)
  /* visits: the owner's side */
  if (m.t === 'visit') {
    const why = VISIT ? 'is visiting someone else' : socState() === 'raiding' ? 'is out raiding' : socState() !== 'home' ? 'is not at home right now' : Object.keys(HOSTING).length >= 3 && !HOSTING[code] ? 'has a full house' : null;
    if (why) return socSend(link, { t: 'deny', why });
    HOSTING[code] = { code }; OTHERS[code] = otherFrom(link, m.p || {}); socSend(link, { t: 'welcome', base: baseOf(HOME), perm: f.perm, name: myName(), skin: HOME.skins.raccoon, cos: myCos(), p: myPos() });
    if (state === 'home') pop(P.x, P.y - 100, f.name + ' came to visit!', '#9be37f', true); try { sfxPlay('ui'); } catch (e) {} refreshSocialScreen(); return;
  }
  if (m.t === 'pos') {
    if (HOSTING[code] && OTHERS[code]) return posInto(OTHERS[code], m.p);
    if (VISIT && VISIT.code === code) { const who = m.code ? S_(m.code, 6) : code; if (who === SOC.code) return; if (!OTHERS[who]) OTHERS[who] = otherFrom({ name: S_(m.name, 20), skin: S_(m.skin, 20), cos: m.cos }, m.p || {}); posInto(OTHERS[who], m.p); }
    return;
  }
  if (m.t === 'op' && HOSTING[code]) { const r = hostOp(m.op || {}, { code, name: f.name, perm: f.perm, pos: OTHERS[code] }); socSend(link, Object.assign({ t: 'res', rid: m.rid }, r)); if (r.ok) homeSave(); return; }
  if (m.t === 'bye') { if (HOSTING[code]) { delete HOSTING[code]; delete OTHERS[code]; if (state === 'home') pop(P.x, P.y - 100, f.name + ' went home', '#cfd8e6'); refreshSocialScreen(); } else if (VISIT && VISIT.code === code) { visitLost(m.why); } return; }
  /* visits: the visitor's side */
  if (VISIT && VISIT.code === code) {
    if (m.t === 'welcome' && VISIT.waiting) { VISIT.waiting(m); return; }
    if (m.t === 'deny' && VISIT.waiting) { VISIT.waiting(null, S_(m.why, 60)); return; }
    if (m.t === 'state' && m.base) return visitApplyBase(m.base);
    if (m.t === 'perm') { VISIT.perm = Math.max(0, Math.min(2, +m.perm || 0)); if (BUILD.on && VISIT.perm < 2) buildToggle(false); pop(P.x, P.y - 100, f.name + ' made you a ' + PERMS[VISIT.perm], '#ffd23f', true); return; }
    if (m.t === 'res') { const cb = socWait[m.rid]; delete socWait[m.rid]; if (cb) cb(m); return; }
  }
}
function cleanLetter(m, f) {
  const gift = {}; if (m.gift && typeof m.gift === 'object') { const a = Math.floor(+m.gift.apples || 0); if (a > 0) gift.apples = Math.min(a, 100000);
    for (const k in CROPS) { const n = Math.floor(+(m.gift.crops && m.gift.crops[k]) || 0); if (n > 0) (gift.crops = gift.crops || {})[k] = Math.min(n, 9999); }
    for (const r of RECIPES) { const n = Math.floor(+(m.gift.meals && m.gift.meals[r.id]) || 0); if (n > 0) (gift.meals = gift.meals || {})[r.id] = Math.min(n, 999); } }
  return { id: S_(m.id, 24), from: f.code, name: f.name, text: S_(m.text, 600), gift, t: +m.ts || Date.now(), read: 0, taken: 0 };
}
/* ----- the outbox: friend requests, letters, notes. Each goes out (once) whenever the friend is online ----- */
function socQueue(to, k, data) { const o = Object.assign({ id: newUid() + newUid().slice(0, 3), to, k, ts: Date.now() }, data); SOC.out.push(o); socialSave(); socFlush(to); return o; }
function socFlush(code) {
  const L = socLinks[code]; if (!L || !L.ok) return; const f = friend(code);
  SOC.out.filter(o => o.to === code).forEach(o => {
    if (o.k === 'freq') socSend(L, { t: 'freq', id: o.id, name: myName() });
    else if (f && f.st === 'friend') socSend(L, o.k === 'mail' ? { t: 'mail', id: o.id, text: o.text, gift: o.gift, ts: o.ts } : { t: 'note', id: o.id, n: o.n });
  });
  if (f && f.st === 'friend' && f.accPending) { socSend(L, { t: 'facc', name: myName() }); f.accPending = 0; socialSave(); }
}
function socialPoll(force) {                                    // look for friends who are online (and deliver what waits for them)
  if (!socialOnline()) return; const now = Date.now(); if (!force && now - socLastPoll < 45000) return; socLastPoll = now;
  SOC.friends.forEach(f => { if (!socLinks[f.code]) socConnect(f.code); });
}
/* ----- the per-frame / timer part: positions, presence, leaving ----- */
function myPos() { if (!P) return { x: 0, y: 0, f: 1, m: 0, i: 0 }; const sit = typeof COZY !== 'undefined' && COZY.sit; return { x: Math.round(P.x), y: Math.round(P.y), f: P.face, m: P.moving ? 1 : 0, i: HOME_IN ? 1 : 0, s: sit ? 1 : 0 }; }
function otherFrom(link, p) { return { name: link.name || '', skin: link.skin || 'classic', cos: link.cos || {}, x: +p.x || SPAWN.x, y: +p.y || SPAWN.y, tx: +p.x || SPAWN.x, ty: +p.y || SPAWN.y, face: p.f || 1, moving: 0, in: !!p.i, anim: 0 }; }
function posInto(o, p) { if (!p) return; const i = !!p.i; if (i !== o.in) { o.x = +p.x; o.y = +p.y; } o.tx = +p.x || o.tx; o.ty = +p.y || o.ty; o.face = p.f === -1 ? -1 : 1; o.moving = !!p.m; o.in = i; }
let socLastSt = '', socTick = 0;
function socialTick() {
  if (!SOC) return; const st = socState();
  if (st !== socLastSt) { socLastSt = st; Object.values(socLinks).forEach(L => L.ok && socSend(L, { t: 'st', st }));
    if (st !== 'home' && Object.keys(HOSTING).length) { Object.keys(HOSTING).forEach(c => socSend(socLinks[c], { t: 'bye', why: myName() + ' went out' })); HOSTING = {}; OTHERS = {}; } }
  if (VISIT && !['home', 'homemenu'].includes(state)) endVisit(false);
  if (++socTick % 50 === 0 && ['home', 'homemenu'].includes(state)) socialPoll();
  const me = (VISIT && VISIT.live) || Object.keys(HOSTING).length ? myPos() : null; if (!me) return;
  if (VISIT && VISIT.live) socSend(socLinks[VISIT.code], { t: 'pos', p: me });
  for (const c in HOSTING) { const L = socLinks[c]; if (!L) continue; socSend(L, { t: 'pos', p: me }); for (const d in HOSTING) if (d !== c && OTHERS[d]) { const o = OTHERS[d]; socSend(L, { t: 'pos', code: d, name: o.name, skin: o.skin, cos: o.cos, p: { x: Math.round(o.tx), y: Math.round(o.ty), f: o.face, m: o.moving ? 1 : 0, i: o.in ? 1 : 0 } }); } }
}
setInterval(() => { try { socialTick(); } catch (e) { console.error(e); } }, 100);
function socialOthers() { return Object.values(OTHERS).filter(o => !!o.in === !!HOME_IN); }
let socLastDraw = 0;
function drawOthers(list) {                                      // adds the other raccoons to a drawing list ({ y, f })
  const now = performance.now(), dt = Math.min(0.1, (now - socLastDraw) / 1000); socLastDraw = now;
  socialOthers().forEach(o => { const k = Math.min(1, dt * 12); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; if (o.moving) o.anim += dt * 14; else o.anim = 0; list.push({ y: o.y, f: () => drawOther(o) }); });
}
function drawOther(o) {
  const id = skinDef('raccoon', o.skin) ? o.skin : 'classic', sheet = skinSheet('raccoon', 'raccoon', id), f = o.moving ? Math.floor(o.anim) % 14 : 0, bob = o.moving ? Math.abs(Math.sin(o.anim * .9)) * 4 : 0, w = FW * .8, h = FH * .8;
  shadow(o.x, o.y, 15); g.save(); g.translate(o.x, o.y - bob); g.scale(CONFIG.player.spriteFacesRight ? o.face : -o.face, 1); g.imageSmoothingEnabled = false;
  if (sheet && sheet.naturalWidth) drawRacFrame(g, sheet, f, -w / 2, -h + 4, w, h); try { drawCosmetics(g, cosClean(o.cos), sheet && sheet.hd ? sheet.hd[f] : CHEEK_OFFSETS[f], id); } catch (e) {} g.restore();
  g.font = 'bold 12px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; const tw = g.measureText(o.name).width + 12; g.fillStyle = 'rgba(10,24,40,.75)'; g.fillRect(o.x - tw / 2, o.y - h - 22, tw, 16); g.fillStyle = '#ffe9a8'; g.fillText(o.name, o.x, o.y - h - 10); g.textAlign = 'left';
}
/* ----- the owner's side of a visit: what a visitor may do ----- */
function hostOp(op, who) {
  const need = { garden: o => GARDEN_NEED[o.op], gardenAll: o => GARDEN_NEED[o.op], note: () => 0, delnote: () => 0, place: () => 2, lift: () => 2, flip: () => 2, paint: () => 2 }[op.k];
  if (!need) return { msg: 'Unknown request' }; const n = need(op); if (n === undefined || who.perm < n) return { msg: 'You need to be a ' + (PERMS[n] || 'owner') + ' for that' };
  if (op.k === 'garden') { if (!gardenBeds().some(b => b.id === op.bed)) return { msg: 'That bed is gone' }; return gardenApply(op.op, op.bed, +op.i, op.c, who); }
  if (op.k === 'gardenAll') { if (!gardenBeds().some(b => b.id === op.bed)) return { msg: 'That bed is gone' }; let ok = 0, failed = 0;
    (Array.isArray(op.idx) ? op.idx.slice(0, 8) : []).forEach(i => gardenApply(op.op, op.bed, +i, op.c, who).ok ? ok++ : failed++); return { ok: ok ? 1 : 0, failed, msg: ok + ' done' + (failed ? ', ' + failed + ' could not be' : '') }; }
  if (op.k === 'note') return noteApply(Object.assign({}, op.n, { from: who.code, name: who.name }), who);
  if (op.k === 'delnote') return noteDelete(S_(op.id, 24), who.code);
  const w = op.w === 'in' ? 'in' : 'out', L = HOME.placed[w];
  if (op.k === 'lift' || op.k === 'flip') { const p = L.find(q => q.u === op.u); if (!p) return { msg: 'Someone moved it' };
    if (op.k === 'flip') { p.f = p.f ? 0 : 1; refreshAfter(w); return { ok: 1 }; }
    if (bedHasCrops(p.u)) return { msg: 'Pick its crops first' }; L.splice(L.indexOf(p), 1); HOME.store[p.id] = (HOME.store[p.id] || 0) + 1; refreshAfter(w); return { ok: 1, item: { id: p.id, x: p.x, y: p.y, f: p.f, u: p.u } }; }
  if (op.k === 'place') {
    const q = op.p || {}, c = catItem(q.id); if (!c || !fits(c, w)) return { msg: 'That cannot go here' }; if (!(HOME.store[q.id] > 0)) return { msg: 'None left in storage' };
    const p = { id: q.id, x: Math.round(+q.x), y: Math.round(+q.y), f: q.f ? 1 : 0, u: S_(q.u, 14) || newUid() }; if (!isFinite(p.x) || !isFinite(p.y)) return { msg: '?' };
    if (HOME.placed.in.concat(HOME.placed.out).some(r => r.u === p.u)) p.u = newUid();
    const why = withArea(w, who.pos, () => whyNot(p) || (!c.flat && walledOff(pPoly(p)) ? 'That would block the way' : null)); if (why) return { msg: why };
    L.push(p); HOME.store[q.id]--; refreshAfter(w); return { ok: 1 };
  }
  if (op.k === 'paint') { const i = Math.floor(+op.i), b = BRUSHES.find(r => r.id === op.b); if (!b || (b.unlock && !HOME.unlock[b.unlock])) return { msg: 'They have not got that floor' };
    if (!(i >= 0 && i < GC * GR) || !isFloorCh(HOME.grid[i])) return { msg: 'Paint the floor' }; const ch = HOME.grid[i]; gSet(i % GC, Math.floor(i / GC), ch === ch.toUpperCase() ? b.id.toUpperCase() : b.id); return { ok: 1 }; }
  return { msg: '?' };
}
function outPolys(o) { const L = homeFootprints(); o.forEach(q => { if (q.k === 'hrock') { const p = profPoly(q.img, q.x, q.y + q.r * 0.45, 2); if (p) L.push(p); } }); return L; }
function withArea(w, pos, fn) {                                  // run the placing rules as if standing where the visitor stands, in the part they are in
  const sv = { HOME_IN, HPOLY, obs, P }, inside = w === 'in';
  try {
    if (inside !== HOME_IN) { if (inside) { HOME_IN = true; obs = []; HPOLY = interiorSolids(); } else { HOME_IN = false; obs = IN_SAVE ? IN_SAVE.obs : obs; HPOLY = outPolys(obs); } }
    P = { x: pos ? pos.tx : P.x, y: pos ? pos.ty : P.y, face: 1 }; return fn();
  } finally { HOME_IN = sv.HOME_IN; HPOLY = sv.HPOLY; obs = sv.obs; P = sv.P; }
}
function refreshAfter(w) {                                       // something changed in part w: the owner's collision shapes follow
  if ((w === 'in') === HOME_IN) { if (HOME_IN) HPOLY = interiorSolids(); else rebuildSolids(); } else if (HOME_IN && IN_SAVE) IN_SAVE.HPOLY = outPolys(IN_SAVE.obs);
}
function socialChanged() {                                       // homeSave: the owner's base changed, send it to visitors (a little later, once)
  if (VISIT || !Object.keys(HOSTING).length || socStateT) return;
  socStateT = setTimeout(() => { socStateT = 0; const b = baseOf(HOME); for (const c in HOSTING) socSend(socLinks[c], { t: 'state', base: b }); }, 120);
}
/* ----- the visitor's side ----- */
const HOME_REAL = () => VISIT ? VISIT.mine : HOME;
function baseOf(H) { const b = {}; BASE_KEYS.forEach(k => { if (H[k] !== undefined) b[k] = H[k]; }); return JSON.parse(JSON.stringify(b)); }
function socialOp(op, cb) {                                      // ask the owner's game to do something; cb({ ok, msg, ... })
  if (!VISIT || !VISIT.live) return cb && cb({ msg: VISIT ? VISIT.name + ' is away: only notes can be left' : '?' });
  const rid = ++socReq; socWait[rid] = cb || (() => {}); if (!socSend(socLinks[VISIT.code], { t: 'op', rid, op })) { delete socWait[rid]; cb && cb({ msg: 'Lost the connection' }); }
  setTimeout(() => { if (socWait[rid]) { const f2 = socWait[rid]; delete socWait[rid]; f2({ msg: 'No answer' }); } }, 6000);
}
function visitNote(n, cb) {
  if (VISIT.live) return socialOp({ k: 'note', n }, r => { cb(r); });
  cozyLoad(); HOME.notes.push(Object.assign({ seen: 1, pending: 1 }, n)); socQueue(VISIT.code, 'note', { n }); cb({ ok: 1, msg: 'Pinned: ' + VISIT.name + ' will see it when they are next online' });
}
function visitLift(h) { socialOp({ k: 'lift', w: bWhere(), u: h.u }, r => { if (r.ok && r.item) { BUILD.held = r.item; HOME.store[r.item.id] = Math.max(0, (HOME.store[r.item.id] || 1) - 1); } else say(r.msg); renderBar(); }); }
function visitStore(h) { socialOp({ k: 'lift', w: bWhere(), u: h.u }, r => { say(r.ok ? catItem(h.id).name + ' put in their storage' : r.msg); }); }
function visitFlip(h) { socialOp({ k: 'flip', w: bWhere(), u: h.u }, r => { if (!r.ok) say(r.msg); }); }
function visitPlace(p) { const held = BUILD.held; BUILD.held = null; renderBar(); socialOp({ k: 'place', w: bWhere(), p }, r => { if (!r.ok) { BUILD.held = held; say(r.msg); renderBar(); } }); }
function visitPaint(i, b) { socialOp({ k: 'paint', i, b }, r => { if (!r.ok) say(r.msg); }); }
function visitApplyBase(base) {
  if (!VISIT || !base || typeof base !== 'object') return; BASE_KEYS.forEach(k => { delete HOME[k]; if (base[k] !== undefined) HOME[k] = base[k]; });
  normalizeBase(); if (BUILD.held && HOME.store[BUILD.held.id] > 0) HOME.store[BUILD.held.id]--;
  const o = homeObs(); if (HOME_IN) { if (IN_SAVE) { IN_SAVE.obs = o; IN_SAVE.HPOLY = HPOLY; } HPOLY = interiorSolids(); } else obs = o;
  GROUND_CV = null; if (BUILD.on) renderBar();
}
function normalizeBase() { HOME.fix = Object.assign({ sweep: 0, floor: 0, walls: 0, rug1: 0, rug2: 0 }, HOME.fix || {}); buildLoad(); gardenLoad(); cozyLoad(); GBOX = null; }
function startVisit(code) {
  const f = friend(code); if (!f || f.st !== 'friend') return; if (state === 'homemenu') leaveHomeScreen();
  socialScreen('Knocking on ' + f.name + '\'s door...');
  socConnect(code, L => {
    if (!L || !L.ok) return f.base ? offerAway(f) : socialScreen(f.name + ' is not online right now.');
    VISIT = { code, name: f.name, live: 1, perm: 0, mine: HOME, waiting: null };
    const done = (m, why) => { if (!VISIT || !VISIT.waiting) return; VISIT.waiting = null; if (!m) { VISIT = null; return f.base ? offerAway(f, f.name + ' ' + (why || 'cannot have visitors now')) : socialScreen(f.name + ' ' + (why || 'cannot have visitors right now') + '.'); }
      VISIT.perm = Math.max(0, Math.min(2, +m.perm || 0)); f.base = m.base; f.baseT = Date.now(); socialSave(); OTHERS = {}; OTHERS[code] = otherFrom({ name: S_(m.name, 20), skin: S_(m.skin, 20), cos: m.cos }, m.p || {}); enterVisit(m.base); };
    VISIT.waiting = done; socSend(L, { t: 'visit', p: myPos() }); setTimeout(() => done(null, 'did not answer'), 8000);
  });
}
function offerAway(f, why) {
  homeScreen(`<h1>${esc(f.name)} is away</h1><p class="tag">${esc(why || f.name + ' is not online right now.')}</p><div class="cards"><div class="card"><b>Look round anyway?</b>You can wander their homestead as it was ${esc(ago(f.baseT || Date.now()))} and pin notes; they get them the next time you are both online.</div></div>
  <div class="row"><button class="big" onclick="visitAway('${f.code}')">Visit while they are away</button><button onclick="socialScreen()">Back</button></div>`, 'away');
}
function visitAway(code) { const f = friend(code); if (!f || !f.base) return socialScreen(); VISIT = { code, name: f.name, live: 0, perm: 0, mine: HOME }; OTHERS = {}; enterVisit(f.base); }
function enterVisit(base) {
  if (BUILD.on) buildToggle(false); const mine = VISIT.mine, H = {}; PERSONAL_KEYS.forEach(k => { if (mine[k] !== undefined) H[k] = mine[k]; });
  BASE_KEYS.forEach(k => { if (base[k] !== undefined) H[k] = JSON.parse(JSON.stringify(base[k])); }); HOME = H; normalizeBase(); GROUND_CV = null; HOME_GROUND = null;
  enterHome(); pop(P.x, P.y - 100, 'Visiting ' + VISIT.name + (VISIT.live ? '' : ' (they are away)'), '#ffd23f', true);
}
function endVisit(goHomeToo = true) {
  if (!VISIT) return; const v = VISIT; if (v.live) socSend(socLinks[v.code], { t: 'bye' }); if (BUILD.on) { BUILD.held = null; BUILD.on = false; }
  HOME = v.mine; VISIT = null; OTHERS = {}; normalizeBase(); GROUND_CV = null; HOME_GROUND = null; socWait = {};
  if (goHomeToo) { enterHome(); pop(P.x, P.y - 100, 'Home again', '#9be37f'); }
}
function visitLost(why) { if (!VISIT || !VISIT.live) return; const n = VISIT.name; VISIT.live = 0; VISIT.perm = 0; OTHERS = {}; if (BUILD.on) { BUILD.held = null; buildToggle(false); }
  if (state === 'home') pop(P.x, P.y - 100, (why || n + ' went offline') + '. You can still look round.', '#cfd8e6', true); }
function visitPersonalSave() { const m = VISIT.mine; PERSONAL_KEYS.forEach(k => { if (HOME[k] !== undefined) m[k] = HOME[k]; }); save('raidHome', m); }
function drawVisitHud() {
  if (!VISIT) return; g.save(); g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; const txt = 'Visiting ' + VISIT.name + (VISIT.live ? ' \u00b7 ' + PERMS[VISIT.perm] : ' \u00b7 away'), w = g.measureText(txt).width + 22;
  g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(VW / 2 - w / 2, 8, w, 26); g.fillStyle = '#9be37f'; g.fillRect(VW / 2 - w / 2, 8, 3, 26); g.fillStyle = '#fff7e6'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(txt, VW / 2, 21.5); g.restore();
}
/* what you can and cannot do in someone else's homestead (homeInteract asks this first) */
function visitBlocks(id) {
  if (!VISIT) return null;
  if (id === 'hut') return 'Head home before you go raiding (menu: Go home)';
  if (id === 'dig') return 'Only ' + VISIT.name + ' digs in this yard';
  if (id === 'plot') return VISIT.name + ' has not built a cottage yet';
  if (id === 'mail') { writeScreen(VISIT.code); return ''; }
  if (id === 'bench' || id === 'idoor') return 'That is ' + VISIT.name + '\'s fix-up list';
  return null;
}
/* ----- screens: friends, the mailbox, writing a letter ----- */
function socialBadge() { const req = SOC.friends.filter(f => f.st === 'in').length, on = SOC.friends.filter(f => socLinks[f.code] && socLinks[f.code].ok).length; return req ? req + ' request' + (req > 1 ? 's' : '') : on ? on + ' online' : 'visit, write, permissions'; }
function refreshSocialScreen() { const n = $('ov').dataset.screen; if ($('ov').style.display === 'none') return; if (n === 'friends') socialScreen(); else if (n === 'mailbox') mailScreen(); }
function statusOf(f) {
  const L = socLinks[f.code]; if (f.st === 'in') return 'wants to be your friend'; if (f.st === 'out') return SOC.out.some(o => o.to === f.code && o.k === 'freq') ? 'request waiting to be delivered' : 'waiting for them to accept';
  if (L && L.ok) return L.old ? 'online (needs to reload the page)' : HOSTING[f.code] ? 'visiting you now' : { home: 'online, at home', raiding: 'online, out raiding', visiting: 'online, visiting someone', menu: 'online' }[L.st] || 'online';
  return 'offline' + (f.seen ? ', seen ' + ago(f.seen) : '');
}
function socialScreen(msg) {
  if (!SOC) socialLoad(); socialUp(); socialPoll(true); if (VISIT) return homeScreen(`<h1>Friends</h1><p class="tag">You are visiting ${esc(VISIT.name)}.</p><div class="row"><button class="big" onclick="endVisit()">Go home</button><button onclick="leaveHomeScreen()">Stay</button></div>`, 'friends');
  const net2 = SN().state, netTxt = { on: 'You are online: friends can find you.', connecting: 'Connecting...', elsewhere: 'The game is open in another tab, so friends reach that one.', offline: 'Cannot reach the matchmaking server (check your connection).', off: 'Multiplayer is not available here.' }[net2] || '';
  const fr = SOC.friends.slice().sort((a, b) => (b.st === 'in') - (a.st === 'in') || (socLinks[b.code] ? 1 : 0) - (socLinks[a.code] ? 1 : 0));
  const rows = fr.map(f => { const L = socLinks[f.code], on = L && L.ok, pend = SOC.out.filter(o => o.to === f.code && o.k !== 'freq').length;
    if (f.st === 'in') return `<div class="frow"><b>${esc(f.name)}</b> <small>${f.code} &middot; ${statusOf(f)}</small><span><button class="mini" onclick="acceptFriend('${f.code}')">Accept</button><button class="mini" onclick="removeFriend('${f.code}')">Decline</button></span></div>`;
    if (f.st === 'out') return `<div class="frow"><b>${esc(f.name || f.code)}</b> <small>${f.code} &middot; ${statusOf(f)}</small><span><button class="mini" onclick="removeFriend('${f.code}')">Cancel</button></span></div>`;
    return `<div class="frow"><b>${esc(f.name)}</b> <small>${f.code} &middot; ${statusOf(f)}${pend ? ' &middot; ' + pend + ' waiting to go' : ''}</small><span>
      <button class="mini" ${on || f.base ? '' : 'disabled'} onclick="startVisit('${f.code}')">Visit</button><button class="mini" onclick="writeScreen('${f.code}')">Write</button>
      <select class="mini" title="What ${esc(f.name)} may do when visiting you" onchange="setPerm('${f.code}',this.value)">${PERMS.map((p, i) => `<option value="${i}" ${f.perm === i ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <button class="mini" onclick="removeFriend('${f.code}',1)">&times;</button></span></div>`; }).join('');
  homeScreen(`<h1>Friends</h1><p class="tag">Your friend code is <b class="code">${SOC.code}</b>. ${esc(netTxt)}</p>
  <div class="row"><input id="myname" maxlength="20" value="${esc(SOC.name)}" placeholder="Your name (${esc(myName())})" style="width:170px"><button class="mini" onclick="setName()">Save name</button>
  <input id="addcode" maxlength="7" placeholder="Friend's code" style="width:120px;text-transform:uppercase"><button class="mini" onclick="addFriend()">Add friend</button></div>
  <div class="flist">${rows || '<p class="lbl">No friends yet. Swap codes with someone and add each other.</p>'}</div>
  <p class="lbl">Permissions (what a friend may do while visiting you): ${PERMS.map((p, i) => '<b>' + p + '</b> ' + PERM_TEXT[i]).join('; ')}. Nobody else can buy, sell, dig or rebuild.</p>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}<div class="row"><button class="up" onclick="mailScreen()"><b>Mailbox</b>${SOC.inbox.filter(l => !l.read).length} new</button><button onclick="leaveHomeScreen()">Back</button></div>`, 'friends');
}
function setName() { const v = ($('myname').value || '').trim().slice(0, 20); SOC.name = v; socialSave(); socialScreen('Saved: friends will see you as ' + myName()); }
function addFriend() {
  const c = cleanCode($('addcode').value); if (!/^[A-Z2-9]{6}$/.test(c)) return socialScreen('A friend code is 6 letters and numbers');
  if (c === SOC.code) return socialScreen('That is your own code'); const f = friend(c);
  if (f) { if (f.st === 'in') return acceptFriend(c); return socialScreen('Already on your list'); }
  SOC.friends.push({ code: c, name: '', perm: 0, st: 'out', t: Date.now() }); socQueue(c, 'freq', {}); socConnect(c); socialScreen('Request sent. It is delivered when you are both online.');
}
function acceptFriend(c) { const f = friend(c); if (!f) return; f.st = 'friend'; f.accPending = 1; socialSave(); socFlush(c); if (!socLinks[c]) socConnect(c); socialScreen(f.name + ' is now your friend'); }
function removeFriend(c, ask) {
  const f = friend(c); if (!f) return; if (ask && !confirm('Remove ' + (f.name || c) + ' from your friends?')) return;
  if (socLinks[c]) socSend(socLinks[c], { t: 'fdel' }); SOC.friends.splice(SOC.friends.indexOf(f), 1); SOC.out = SOC.out.filter(o => { if (o.to !== c) return true; refundLetter(o); return false; });
  if (HOSTING[c]) { socSend(socLinks[c], { t: 'bye', why: 'You were removed' }); delete HOSTING[c]; delete OTHERS[c]; } socialSave(); socialScreen();
}
function setPerm(c, v) { const f = friend(c); if (!f) return; f.perm = Math.max(0, Math.min(2, +v || 0)); socialSave(); if (HOSTING[c]) socSend(socLinks[c], { t: 'perm', perm: f.perm }); }
function mailTip() { const n = SOC ? SOC.inbox.filter(l => !l.read).length : 0, notes = typeof unseenNotes === 'function' && HOME.notes ? unseenNotes() : 0, gift = HOME.mail !== todayKey();
  if (VISIT) return 'Mailbox: write to ' + VISIT.name; return 'Mailbox' + (n ? ': ' + n + ' letter' + (n > 1 ? 's' : '') : '') + (notes ? (n ? ', ' : ': ') + notes + ' new note' + (notes > 1 ? 's' : '') : '') + (gift ? (n || notes ? ', and a gift' : ': a gift is waiting') : ''); }
function openMailbox() { if (VISIT) return writeScreen(VISIT.code); if (!SOC.inbox.some(l => !l.read) && !unseenNotes() && HOME.mail !== todayKey() && !SOC.inbox.length && !(HOME.notes || []).length) return claimMail(); mailScreen(); }
function mailScreen(msg) {
  const gift = HOME.mail !== todayKey(), loose = (HOME.notes || []).filter(n => !placedByU(n.u));
  const letters = SOC.inbox.slice().reverse().map(l => { const gl = giftText(l.gift);
    return `<div class="card note${l.read ? '' : ' new'}" onclick="readLetter('${l.id}')"><b>${esc(l.name)}</b> <small>${esc(ago(l.t))}</small><br>${esc(l.text)}${gl ? `<br><small>${l.taken ? 'Gift taken: ' : 'Gift: '}${gl}</small>${l.taken ? '' : ` <button class="mini" onclick="event.stopPropagation();takeGift('${l.id}')">Take it</button>`}` : ''}<br><button class="mini" onclick="event.stopPropagation();delLetter('${l.id}')">Throw away</button>${friend(l.from) ? ` <button class="mini" onclick="event.stopPropagation();writeScreen('${l.from}')">Reply</button>` : ''}</div>`; }).join('');
  const outs = SOC.out.filter(o => o.k === 'mail').map(o => { const f = friend(o.to); return `<div class="card note"><b>To ${esc(f ? f.name : o.to)}</b> <small>waiting for them to come online</small><br>${esc(o.text)}${giftText(o.gift) ? '<br><small>Gift: ' + giftText(o.gift) + '</small>' : ''}<br><button class="mini" onclick="cancelLetter('${o.id}')">Take it back</button></div>`; }).join('');
  const notes = (HOME.notes || []).filter(n => !n.seen && n.from !== myCode()).length;
  SOC.inbox.forEach(l => { l.read = 1; }); socialSave();
  homeScreen(`<h1>Mailbox</h1>${gift ? `<div class="row"><button class="big" onclick="claimMail();mailScreen()">A gift from the orchard <small>${MAIL_GIFT} apples, once a day</small></button></div>` : ''}
  ${notes ? `<p class="lbl" style="color:#ffd23f">${notes} new note${notes > 1 ? 's' : ''} pinned in your homestead: look for the papers on your tables.</p>` : ''}
  <div class="cards notes">${letters || '<p class="lbl">No letters yet.</p>'}</div>${loose.length ? `<p class="lbl">Notes from things you put away:</p><div class="cards notes">${loose.map(n => `<div class="card note"><b>${esc(n.name)}</b> <small>${esc(ago(n.t))}</small><br>${esc(n.text)}<br><button class="mini" onclick="delNote('${n.id}')">Throw away</button></div>`).join('')}</div>` : ''}
  ${outs ? `<p class="lbl">Outbox</p><div class="cards notes">${outs}</div>` : ''}${msg ? `<p class="lbl" style="color:#9be37f">${esc(msg)}</p>` : ''}
  <div class="row"><button class="up" onclick="socialScreen()"><b>Friends</b>${(n => n + (n === 1 ? ' friend' : ' friends'))(SOC.friends.filter(f => f.st === 'friend').length)}</button><button onclick="leaveHomeScreen()">Back outside</button></div>`, 'mailbox');
}
function giftText(gf) { if (!gf) return ''; const b = []; if (gf.apples) b.push(gf.apples + ' apples'); for (const k in gf.crops || {}) b.push(gf.crops[k] + ' ' + CROPS[k].name.toLowerCase()); for (const k in gf.meals || {}) b.push(gf.meals[k] + ' ' + recipe(k).name.toLowerCase()); return b.join(', '); }
function readLetter() {}
function takeGift(id) { const l = SOC.inbox.find(q => q.id === id); if (!l || l.taken) return mailScreen(); l.taken = 1; giveGift(l.gift); socialSave(); mailScreen('Gift taken: ' + giftText(l.gift)); }
function giveGift(gf) { if (!gf) return; gardenLoad(); cozyLoad(); for (const k in gf.crops || {}) if (CROPS[k]) HOME.pantry[k] = (HOME.pantry[k] || 0) + gf.crops[k]; for (const k in gf.meals || {}) if (recipe(k)) HOME.meals[k] = (HOME.meals[k] || 0) + gf.meals[k]; if (gf.apples) payApples(gf.apples); else homeSave(); }
function delLetter(id) { const l = SOC.inbox.find(q => q.id === id); if (l && !l.taken && giftText(l.gift)) giveGift(l.gift); SOC.inbox = SOC.inbox.filter(q => q.id !== id); socialSave(); mailScreen(); }
function refundLetter(o) { if (o.k === 'mail' && o.gift) giveGift(o.gift); }
function cancelLetter(id) { const o = SOC.out.find(q => q.id === id); if (!o) return mailScreen(); SOC.out.splice(SOC.out.indexOf(o), 1); refundLetter(o); socialSave(); mailScreen('Letter taken back' + (giftText(o.gift) ? ': the gift is yours again' : '')); }
function writeScreen(code, msg) {
  const f = friend(code); if (!f || f.st !== 'friend') return socialScreen(); gardenLoad(); cozyLoad();
  const crops = Object.keys(CROPS).filter(k => HOME.pantry[k] > 0).map(k => `<label class="gift">${cropImg('crop_' + k + '3', 18)} <input type="number" min="0" max="${HOME.pantry[k]}" value="0" data-crop="${k}"> / ${HOME.pantry[k]}</label>`).join('');
  const meals = RECIPES.filter(r => HOME.meals[r.id] > 0).map(r => `<label class="gift">${MEAL_ICON[r.id]} <input type="number" min="0" max="${HOME.meals[r.id]}" value="0" data-meal="${r.id}"> / ${HOME.meals[r.id]}</label>`).join('');
  homeScreen(`<h1>A letter to ${esc(f.name)}</h1><textarea id="lettxt" maxlength="600" rows="5" placeholder="Dear ${esc(f.name)}," style="width:min(480px,90%);font:14px 'Trebuchet MS',sans-serif;border-radius:8px;padding:8px"></textarea>
  <p class="lbl">Put a gift in (optional): <label class="gift">&#127822; <input id="giftap" type="number" min="0" max="${HOME.apples}" value="0"> / ${HOME.apples}</label> ${crops} ${meals}</p>
  <p class="lbl">${socLinks[code] && socLinks[code].ok ? esc(f.name) + ' is online: it arrives right away.' : esc(f.name) + ' is offline: it waits in your outbox and is delivered when you are both online. You can take it back until then.'}</p>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}<div class="row"><button class="big" onclick="sendLetter('${code}')">Send</button><button onclick="${VISIT ? 'leaveHomeScreen()' : 'mailScreen()'}">Back</button></div>`, 'write');
}
function sendLetter(code) {
  const text = ($('lettxt').value || '').trim().slice(0, 600), ap = Math.max(0, Math.floor(+$('giftap').value || 0)), gift = {};
  if (ap > HOME.apples) return writeScreen(code, 'You do not have that many apples'); if (ap) gift.apples = ap;
  for (const el of document.querySelectorAll('#ov input[data-crop]')) { const n = Math.max(0, Math.floor(+el.value || 0)), k = el.dataset.crop; if (n > (HOME.pantry[k] || 0)) return writeScreen(code, 'Not that many in the pantry'); if (n) (gift.crops = gift.crops || {})[k] = n; }
  for (const el of document.querySelectorAll('#ov input[data-meal]')) { const n = Math.max(0, Math.floor(+el.value || 0)), k = el.dataset.meal; if (n > (HOME.meals[k] || 0)) return writeScreen(code, 'Not that many meals'); if (n) (gift.meals = gift.meals || {})[k] = n; }
  if (!text && !giftText(gift)) return writeScreen(code, 'Write something (or put a gift in)');
  HOME.apples -= ap; for (const k in gift.crops || {}) HOME.pantry[k] -= gift.crops[k]; for (const k in gift.meals || {}) { HOME.meals[k] -= gift.meals[k]; if (!HOME.meals[k] && HOME.packed === k) HOME.packed = null; } homeSave();
  socQueue(code, 'mail', { text, gift }); try { sfxPlay('ui'); } catch (e) {} if (VISIT) { leaveHomeScreen(); return pop(P.x, P.y - 90, 'Letter posted', '#9be37f'); } mailScreen('Letter posted' + (socLinks[code] && socLinks[code].ok ? '' : ': it goes out when ' + friend(code).name + ' is online'));
}
socialLoad();
