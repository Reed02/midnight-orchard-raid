/* ===== CREW HIDEOUTS =====
   A crew is a group of friends with a shared underground hideout. You can be in several crews (each has its own hideout); your homestead stays yours.
   There is no server, so EVERY MEMBER KEEPS A COPY of each crew (localStorage raidCrews; it syncs to your linked devices with the rest of the save).
   Whoever is online can go in. When two members' games meet (any time they are both online and friends) they swap copies and MERGE them:
     meta (name, colour)  newest wins          mem   one entry per member, newest wins (left: 1 = has left)
     items (furniture)    one entry per piece (by its id), newest wins; a removed piece leaves a dated "gone" marker
     led   each member's own LEDGER: what they put in / took out of the shared storage (s) and the chest (m), and how many crew raids they did.
           Only its owner ever changes it, so the highest revision wins; the storage and the chest are the SUM of everyone's ledger.
     tro, done   trophies and finished projects: kept if anyone has them.
   So two members can decorate apart and both changes survive; only an edit of the SAME piece clashes, and then the newer one wins.
   Members who are in the same hideout at the same time see each other move (and chat), and see each change as it happens.
   The hideout reuses the cottage interior (interior.js) with HIDE set: while you are inside, HOME is your personal keys + the crew's room
   (like a visit), and homeSave turns what changed into crew edits (hideCommit).
   You reach it through the hollow tree in your yard (CAT 'hidetree', given when you start or join your first crew), or from Friends > Crews.
   Messages (social.js passes them here, between friends): crews (copies to merge), cinv (an invitation, through the outbox / mailbox),
   cpos (where I am in the hideout), cbye (I left it). Tests: tests/hideout_pw.js. */
const CREW_COLS = ['#e2574c', '#f0a830', '#5bb35b', '#4a90d9', '#9b6ad6', '#e07ab8'], CREW_MAX = 8;
const CREW_PROJ = [
  { id: 'beam', name: 'Log bench', text: 'A fallen log to sit on together (goes into the crew storage).', cost: { planks: 4, rope: 2 }, give: 'h_beam' },
  { id: 'lamps', name: 'Root lanterns', text: 'Glowing jars hung in the roots: the burrow gets brighter, and fireflies move in.', cost: { jar: 4, honey: 2 } },
  { id: 'burrow', name: 'Dig the back burrow', text: 'A quiet room behind the back wall.', room: 'bed', cost: { planks: 6, rope: 4, nails: 4 } },
  { id: 'west', name: 'Dig the west tunnel', text: 'A big square room to the west.', room: 'kitchen', cost: { planks: 8, nails: 6, jar: 2, gear: 1 } },
  { id: 'east', name: 'Dig the east den', text: 'A snug den to the east.', room: 'workshop', cost: { planks: 6, wool: 4, honey: 3, thread: 1 } },
];
const SITE_SHORT = { orchard: 'Orchard', mill: 'Mill', greenhouse: 'Greenhouse', pumpkin: 'Pumpkin Patch', meadow: 'Bee Meadow' };
const TROPHIES = [
  { id: 'founded', name: 'The crew is born', text: 'Start a crew' },
  { id: 'members3', name: 'Three\'s a crowd', text: 'Have three members' },
  { id: 'members5', name: 'Full burrow', text: 'Have five members' },
  { id: 'first', name: 'First raid together', text: 'Survive a night on a raid with a crewmate' },
  { id: 'win', name: 'Seven nights', text: 'Survive all seven nights with a crewmate' },
  { id: 'full', name: 'The whole gang', text: 'Raid with five raccoons, crewmates among them' },
  { id: 'raids10', name: 'Regulars', text: 'Ten raids together' },
  { id: 'dig', name: 'Deep burrow', text: 'Dig out every room' },
  { id: 'farms', name: 'Every farm', text: 'Win a raid together at all five farms' },
];
let CREWS = null;
const crewsSave = () => save('raidCrews', CREWS);
const crewGet = id => CREWS && CREWS.c[id];
const crewMembers = C => Object.keys(C.mem).filter(k => C.mem[k] && !C.mem[k].left);
const crewIsMember = (C, code) => !!(C && C.mem[code] && !C.mem[code].left);
const crewList = () => Object.values(CREWS.c).filter(C => crewIsMember(C, myCode()));
const crewOnline = C => crewMembers(C).filter(k => k !== myCode() && socLinks[k] && socLinks[k].ok);
const hoName = C => (C && C.meta && C.meta.name) || 'Crew';
const crewCol = C => CREW_COLS[(C && C.meta && C.meta.col) % CREW_COLS.length] || CREW_COLS[0];
const sumOf = (C, f) => { const t = {}; Object.values(C.led).forEach(L => { const o = L && L[f]; if (o) for (const k in o) t[k] = (t[k] || 0) + (+o[k] || 0); }); return t; };
const crewStore = C => { const t = sumOf(C, 's'), o = {}; for (const k in t) if (catItem(k) && t[k] > 0) o[k] = Math.floor(t[k]); return o; };
const crewChest = C => { const t = sumOf(C, 'm'), o = {}; for (const k in t) if (MATS[k] && t[k] > 0) o[k] = Math.floor(t[k]); return o; };
const crewRaids = C => Object.values(C.led).reduce((a, L) => a + (+(L && L.raids) || 0), 0);
function crewLedger(C, fn) { const me = myCode(); const L = C.led[me] = C.led[me] || { r: 0, s: {}, m: {}, raids: 0 }; fn(L); L.r = (+L.r || 0) + 1; }
/* ----- loading, cleaning (copies from friends are never trusted) ----- */
const cS = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[<>&"']/g, '').slice(0, n);
const okCode = c => typeof c === 'string' && /^[A-Z2-9]{6}$/.test(c);
function crewClean(c) {
  if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^[A-Za-z0-9]{6,12}$/.test(c.id)) return null;
  const o = { id: c.id, t: +c.t || Date.now(), by: okCode(c.by) ? c.by : '', meta: { name: cS(c.meta && c.meta.name, 24) || 'Crew', col: Math.abs(Math.floor(+(c.meta && c.meta.col) || 0)) % CREW_COLS.length, ts: +(c.meta && c.meta.ts) || 0 },
    mem: {}, items: {}, led: {}, tro: {}, done: {} };
  Object.entries(c.mem && typeof c.mem === 'object' ? c.mem : {}).slice(0, 40).forEach(([k, m]) => { if (okCode(k) && m && typeof m === 'object') o.mem[k] = { n: cS(m.n, 20), ts: +m.ts || 0, left: m.left ? 1 : 0 }; });
  Object.entries(c.items && typeof c.items === 'object' ? c.items : {}).slice(0, 400).forEach(([u, it]) => { if (!/^[A-Za-z0-9]{1,16}$/.test(u) || !it || typeof it !== 'object') return;
    if (it.del) o.items[u] = { del: 1, ts: +it.ts || 0 }; else if (catItem(it.id) && isFinite(+it.x) && isFinite(+it.y)) o.items[u] = { id: String(it.id), x: Math.round(+it.x), y: Math.round(+it.y), f: it.f ? 1 : 0, r: Math.max(0, Math.min(2, Math.floor(+it.r || 0))), ts: +it.ts || 0 }; });
  Object.entries(c.led && typeof c.led === 'object' ? c.led : {}).slice(0, 40).forEach(([k, L]) => { if (!okCode(k) || !L || typeof L !== 'object') return; const n = (src, ok) => { const r = {}; Object.entries(src && typeof src === 'object' ? src : {}).forEach(([a, v]) => { if (ok(a)) r[a] = Math.max(-9999, Math.min(9999, Math.floor(+v || 0))); }); return r; };
    o.led[k] = { r: Math.floor(+L.r || 0), s: n(L.s, catItem), m: n(L.m, a => MATS[a]), raids: Math.max(0, Math.min(99999, Math.floor(+L.raids || 0))) }; });
  for (const k of ['tro', 'done']) Object.entries(c[k] && typeof c[k] === 'object' ? c[k] : {}).slice(0, 60).forEach(([a, v]) => { if (/^[a-z_]{1,16}$/.test(a)) o[k][a] = +v || 1; });
  return o;
}
function crewsLoad() {
  const d = store('raidCrews', {}); CREWS = { c: {}, inv: [] };
  Object.values(d && d.c && typeof d.c === 'object' ? d.c : {}).forEach(c => { const o = crewClean(c); if (o) CREWS.c[o.id] = o; });
  CREWS.inv = (Array.isArray(d && d.inv) ? d.inv : []).filter(v => v && okCode(v.from) && crewClean(v.crew)).slice(-20);
}
crewsLoad();
/* ----- merging two copies of a crew (see the top) ----- */
function crewMerge(A, B) {                                       // B into A; returns true if A changed
  const before = JSON.stringify(A);
  if ((B.meta.ts || 0) > (A.meta.ts || 0)) A.meta = Object.assign({}, B.meta);
  if (!A.by && B.by) A.by = B.by; A.t = Math.min(A.t || B.t, B.t || A.t);
  for (const k in B.mem) if (!A.mem[k] || (B.mem[k].ts || 0) > (A.mem[k].ts || 0)) A.mem[k] = Object.assign({}, B.mem[k]);
  for (const u in B.items) if (!A.items[u] || (B.items[u].ts || 0) > (A.items[u].ts || 0)) A.items[u] = Object.assign({}, B.items[u]);
  for (const k in B.led) if (!A.led[k] || (B.led[k].r || 0) > (A.led[k].r || 0)) A.led[k] = JSON.parse(JSON.stringify(B.led[k]));
  for (const k of ['tro', 'done']) for (const a in B[k]) A[k][a] = A[k][a] ? Math.min(A[k][a], B[k][a]) : B[k][a];
  return JSON.stringify(A) !== before;
}
function crewPrune(C) { const old = Date.now() - 30 * 864e5; for (const u in C.items) if (C.items[u].del && C.items[u].ts < old) delete C.items[u]; }
/* ----- trophies ----- */
function crewTrophies(C) {                                       // the ones that follow from the crew's state; returns the new ones
  const got = [], give = id => { if (!C.tro[id]) { C.tro[id] = Date.now(); got.push(id); } }, n = crewMembers(C).length;
  if (n >= 3) give('members3'); if (n >= 5) give('members5'); if (crewRaids(C) >= 10) give('raids10');
  if (CREW_PROJ.filter(p => p.room).every(p => C.done[p.id])) give('dig'); if (Object.keys(SITE_SHORT).every(s => C.tro['w_' + s])) give('farms');
  return got;
}
const trophyName = id => (TROPHIES.find(q => q.id === id) || { name: id }).name;
/* ----- making, inviting, joining, leaving ----- */
function crewNew(name, col) {
  const me = myCode(), id = Array.from({ length: 8 }, () => CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]).join(''), now = Date.now();
  const C = { id, t: now, by: me, meta: { name: cS(name, 24) || myName() + '\'s crew', col: (+col || 0) % CREW_COLS.length, ts: now }, mem: { [me]: { n: myName(), ts: now, left: 0 } }, items: {}, led: {}, tro: { founded: now }, done: {} };
  crewLedger(C, () => {}); CREWS.c[id] = C; crewsSave(); crewGiveTree(); return C;
}
function crewGiveTree() {                                        // the hollow tree to your hideouts, once
  const H = HOME_REAL(); if ((H.store && H.store.hidetree > 0) || (H.placed && H.placed.out.some(p => p.id === 'hidetree'))) return;
  H.store = H.store || {}; H.store.hidetree = 1; H.seen = H.seen || {}; H.seen.treeNew = 1; if (H === HOME) homeSave(); else save('raidHome', H);
}
function crewInvite(id, code) {
  const C = crewGet(id), f = friend(code); if (!C || !f || f.st !== 'friend') return; if (crewMembers(C).length >= CREW_MAX) return crewScreen(id, 'A crew has at most ' + CREW_MAX + ' members');
  socQueue(code, 'cinv', { crew: id }); crewScreen(id, 'Invitation sent to ' + f.name + (socLinks[code] && socLinks[code].ok ? '' : ': it reaches them when they are next online'));
}
function crewAccept(cid) {
  const i = CREWS.inv.findIndex(v => v.crew.id === cid); if (i < 0) return crewsScreen(); const inv = CREWS.inv[i]; CREWS.inv.splice(i, 1);
  const C0 = crewClean(inv.crew); if (!C0) return crewsScreen(); const C = CREWS.c[cid] ? (crewMerge(CREWS.c[cid], C0), CREWS.c[cid]) : (CREWS.c[cid] = C0);
  C.mem[myCode()] = { n: myName(), ts: Date.now(), left: 0 }; crewLedger(C, () => {}); crewTrophies(C); crewsSave(); crewGiveTree(); crewSend(C, true);
  crewScreen(cid, 'You joined ' + hoName(C) + '! A hollow tree is in your storage: place it in your yard to reach the hideout.');
}
function crewDecline(cid) { CREWS.inv = CREWS.inv.filter(v => v.crew.id !== cid); crewsSave(); crewsScreen(); }
function crewLeave(id) {
  const C = crewGet(id); if (!C || !confirm('Leave ' + hoName(C) + '? Its hideout stays with the others.')) return; if (HIDE && HIDE.id === id) leaveHideout();
  C.mem[myCode()] = Object.assign({}, C.mem[myCode()], { left: 1, ts: Date.now() }); crewSend(C, true); delete CREWS.c[id]; crewsSave(); crewsScreen('You left ' + hoName(C));
}
function crewRename(id) { const C = crewGet(id), el = $('crewname'); if (!C || !el) return; C.meta = Object.assign({}, C.meta, { name: cS(el.value, 24) || hoName(C), ts: Date.now() }); crewsSave(); crewSend(C, true); crewScreen(id, 'Renamed'); }
function crewRecolor(id, col) { const C = crewGet(id); if (!C) return; C.meta = Object.assign({}, C.meta, { col: (+col || 0) % CREW_COLS.length, ts: Date.now() }); crewsSave(); crewSend(C, true); crewScreen(id); }
/* ----- talking to the other members ----- */
const crewSendT = {};
function crewSend(C, now) {                                       // my copy to every member who is online (soon, so a burst of edits goes as one)
  const go = () => { delete crewSendT[C.id]; const c = CREWS.c[C.id] || C; crewMembers(c).forEach(k => { if (k === myCode()) return; const L = socLinks[k], f = friend(k); if (L && L.ok && !L.dup && f && f.st === 'friend') socSend(L, { t: 'crews', c: [c] }); }); };
  if (now) { clearTimeout(crewSendT[C.id]); return go(); } if (!crewSendT[C.id]) crewSendT[C.id] = setTimeout(go, 150);
}
function crewHello(link) {                                       // a friend came online: swap copies of the crews we are both in
  const f = friend(link.code); if (!f || f.st !== 'friend') return; const c = crewList().filter(C => crewIsMember(C, link.code)); if (c.length) socSend(link, { t: 'crews', c });
}
function crewMsg(link, m, code, f) {                             // social.js: a message from a friend; true when it was ours
  if (m.t === 'crews') {
    if (!Array.isArray(m.c)) return true; if (HIDE) hideCommit(); let mine = 0;
    m.c.slice(0, 12).forEach(c0 => { const B = crewClean(c0), A = B && CREWS.c[B.id]; if (!A || !crewIsMember(A, myCode()) || !(B.mem[code])) return;
      const was = crewIsMember(A, code), joined = crewMerge(A, B); if (!joined) return; mine = 1; crewTrophies(A); crewPrune(A);
      if (!was && crewIsMember(A, code) && state === 'home') pop(P.x, P.y - 100, f.name + ' joined ' + hoName(A) + '!', '#9be37f', true);
      if (HIDE && HIDE.id === A.id) hideApply(); });
    if (mine) { crewsSave(); if (state === 'homemenu' && /^crew/.test($('ov').dataset.screen)) crewRefresh(); } return true;
  }
  if (m.t === 'cinv') {
    if (m.id) socSend(link, { t: 'ack', id: m.id }); const C = crewClean(m.crew); if (!C || !crewIsMember(C, code)) return true;
    if (CREWS.c[C.id] && crewIsMember(CREWS.c[C.id], myCode())) { if (crewMerge(CREWS.c[C.id], C)) crewsSave(); return true; }
    if (!CREWS.inv.some(v => v.crew.id === C.id)) { CREWS.inv.push({ from: code, name: f.name, crew: C, t: Date.now() }); CREWS.inv = CREWS.inv.slice(-20); crewsSave(); if (state === 'home') pop(P.x, P.y - 100, f.name + ' invited you to ' + hoName(C) + ' (see Friends > Crews)', '#ffd23f', true); }
    if (state === 'homemenu' && /^crew/.test($('ov').dataset.screen)) crewRefresh(); return true;
  }
  if (m.t === 'cpos') {
    if (!HIDE || m.id !== HIDE.id || !crewIsMember(crewGet(HIDE.id), code)) return true; let o = OTHERS[code];
    if (!o) { o = OTHERS[code] = otherFrom({ name: f.name, skin: S_(m.skin, 20), cos: m.cos }, m.p || {}); o.in = true; if (state === 'home') pop(P.x, P.y - 100, f.name + ' came into the hideout', '#9be37f'); try { sfxPlay('ui'); } catch (e) {} }
    o.heard = Date.now(); posInto(o, Object.assign({}, m.p || {}, { i: 1 })); return true;
  }
  if (m.t === 'cbye') { if (HIDE && OTHERS[code]) { delete OTHERS[code]; if (state === 'home') pop(P.x, P.y - 100, f.name + ' went up to their yard', '#cfd8e6'); } return true; }
  return false;
}
/* ----- the room: HOME while you are in a hideout ----- */
function hideGrid(C) {
  const g2 = '.'.repeat(GC * GR).split(''), set = (c, r) => { g2[r * GC + c] = 'w'; };
  for (let j = 0; j < IROWS; j++) for (let i = 0; i < ICOLS; i++) set(GMC + i, GMR + j);
  CREW_PROJ.forEach(p => { if (!p.room || !C.done[p.id]) return; const R = ROOMS.find(q => q.id === p.room); if (!R) return; const [c0, r0, c1, r1] = R.rect; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r); R.door.forEach(([c, r]) => set(c, r)); });
  return g2.join('');
}
const hideItems = C => Object.entries(C.items).filter(([u, it]) => !it.del && catItem(it.id) && fits(catItem(it.id), 'in')).map(([u, it]) => ({ id: it.id, x: it.x, y: it.y, f: it.f, r: it.r | 0, u }));
function hideBase(C) { return { house: 1, fix: { sweep: 1, floor: 1, walls: 1, rug1: 0, rug2: 0 }, grid: hideGrid(C), rooms: {}, placed: { in: hideItems(C), out: [] }, store: crewStore(C), unlock: {}, garden: {}, notes: [], dug: {}, mig: { rugs: 1, big: 1 } }; }
const HIDE_FIX = [                                                // the crew's own things in the first room (drawn and solid like the cottage's barrel and ladder)
  { k: 'hide_chest', x: IFX0 + 46, y: IFY0 + 40, fp: [22, 10], id: 'hchest' },
  { k: 'hide_banner', x: ICX - 6, y: IFY0 + 14, fp: [12, 6], id: 'hbanner' },
  { k: 'hide_trophy', x: IFX1 - 62, y: IFY0 + 22, fp: [28, 8], id: 'hshelf' },
];
function enterHideout(id) {
  const C = crewGet(id); if (!C || VISIT || HIDE) return; if (typeof BUILD !== 'undefined' && BUILD.on) buildToggle(false);
  const mine = HOME, H = {}; PERSONAL_KEYS.forEach(k => { if (mine[k] !== undefined) H[k] = mine[k]; }); Object.assign(H, hideBase(C));
  HIDE = { id, mine, entering: 1 }; HOME = H; normalizeBase(); GROUND_CV = null; HOME_GROUND = null; OTHERS = {}; hideWalls(true);
  enterHome(); HIDE.entering = 0; enterInterior(); P.y = IFY1 - 30; inPush(P); P.tx = P.x; P.ty = P.y;
  pop(ICX, IFY0 + 70, hoName(C) + '\'s hideout', '#ffd23f', true); const on = crewOnline(C).length; if (!on) setTimeout(() => { if (HIDE && state === 'home') pop(P.x, P.y - 80, 'Changes reach your crew when you are online together', '#cfd8e6'); }, 1800);
}
function hideWalls(on) { WALLC = on ? '#3e2c1d' : '#3c3c36'; WALLHI = on ? '#5e4630' : '#56564e'; WALLMASS = on ? '#22170e' : '#2c2a26'; }
function hideRestore() {                                         // HOME back to your own homestead (no scene change)
  if (!HIDE) return; hideCommit(); const v = HIDE; crewOnline(crewGet(v.id) || { mem: {} }).forEach(k => socSend(socLinks[k], { t: 'cbye', id: v.id }));
  if (typeof BUILD !== 'undefined' && BUILD.on) { BUILD.held = null; BUILD.on = false; }
  HOME = v.mine; HIDE = null; OTHERS = {}; normalizeBase(); GROUND_CV = null; HOME_GROUND = null; hideWalls(false);
}
function leaveHideout() {
  if (!HIDE) return; if (typeof BUILD !== 'undefined' && BUILD.on) buildToggle(false); if (COZY.sit) standUp(); hideRestore(); enterHome();
  const tr = HOME.placed.out.find(p => p.id === 'hidetree'); if (tr) { P.x = tr.x; P.y = tr.y + 34; P.tx = P.x; P.ty = P.y; dir = { x: 0, y: 1 }; cam.x = clampN(P.x - VW / 2, 0, HW - VW); cam.y = clampN(P.y - VH / 2, 0, HH - VH); }
}
function hideSave() {                                            // homeSave while inside: your own keys to your save, the room to the crew
  const m = HIDE.mine; PERSONAL_KEYS.forEach(k => { if (HOME[k] !== undefined) m[k] = HOME[k]; }); save('raidHome', m); hideCommit();
}
function hideCommit() {                                          // what changed in the room since the crew's copy: edits with today's date
  if (!HIDE || HIDE.entering) return; const C = crewGet(HIDE.id); if (!C) return; const now = Date.now(), cur = {}; let ch = 0;
  HOME.placed.in.forEach(p => { if (!p.u) p.u = newUid(); cur[p.u] = p; });
  for (const u in cur) { const p = cur[u], it = C.items[u]; if (!it || it.del || it.id !== p.id || it.x !== Math.round(p.x) || it.y !== Math.round(p.y) || (it.f ? 1 : 0) !== (p.f ? 1 : 0) || (it.r | 0) !== (p.r | 0)) { C.items[u] = { id: p.id, x: Math.round(p.x), y: Math.round(p.y), f: p.f ? 1 : 0, r: p.r | 0, ts: now }; ch = 1; } }
  for (const u in C.items) if (!C.items[u].del && !cur[u]) { C.items[u] = { del: 1, ts: now }; ch = 1; }
  const tot = crewStore(C), d = {}; new Set(Object.keys(tot).concat(Object.keys(HOME.store))).forEach(k => { if (!catItem(k)) return; const n = Math.floor(+HOME.store[k] || 0) - (tot[k] || 0); if (n) d[k] = n; });
  if (Object.keys(d).length) { crewLedger(C, L => { for (const k in d) L.s[k] = (L.s[k] || 0) + d[k]; }); ch = 1; }
  if (ch) { crewsSave(); crewSend(C); }
}
function hideApply() {                                           // the crew's copy changed (a member's edit): the room follows
  const C = crewGet(HIDE.id); if (!C) return leaveHideout(); const grid = hideGrid(C);
  HOME.placed.in = hideItems(C); HOME.store = crewStore(C); if (HOME.grid !== grid) { HOME.grid = grid; GBOX = null; }
  if (HOME_IN) HPOLY = interiorSolids(); if (typeof BUILD !== 'undefined' && BUILD.on) renderBar();
}
const _enterHomeHide = enterHome;
enterHome = function () { if (HIDE && !HIDE.entering) hideRestore(); return _enterHomeHide(); };          // anything else that goes home (the title screen, a raid's end) leaves the hideout first
setInterval(() => { try {
  if (HIDE && !['home', 'homemenu'].includes(state)) hideRestore();
  if (HIDE) { const now = Date.now(); for (const k in OTHERS) if (now - (OTHERS[k].heard || 0) > 4000) delete OTHERS[k]; }
} catch (e) { console.error(e); } }, 250);
setInterval(() => { try {                                         // 10 times a second: where I am, to the members who are online (they keep it only if they are in here too)
  if (!HIDE || state !== 'home' && state !== 'homemenu') return; const C = crewGet(HIDE.id); if (!C) return; const me = myPos(), skin = HOME.skins.raccoon, cos = myCos();
  crewOnline(C).forEach(k => { const f = friend(k); if (f && f.st === 'friend') socSend(socLinks[k], { t: 'cpos', id: C.id, p: me, skin, cos }); });
} catch (e) { console.error(e); } }, 100);
/* ----- inside: what you can walk up to ----- */
function hideInteractables() {
  const C = crewGet(HIDE.id); return [
    { id: 'hchest', x: IFX0 + 46, y: IFY0 + 56, r: 50, h: 56, tip: 'Crew chest', act: () => chestScreen() },
    { id: 'hbanner', x: ICX - 6, y: IFY0 + 34, r: 44, h: 96, tip: (C ? hoName(C) : 'Crew') + ': members, invites, projects', act: () => crewScreen(HIDE.id) },
    { id: 'hshelf', x: IFX1 - 62, y: IFY0 + 40, r: 46, h: 58, tip: 'Trophy shelf', act: () => trophyScreen(HIDE.id) },
    { id: 'out', x: ICX, y: IFY1 - 6, r: 34, tip: 'Climb back up to your yard', h: 64, act: leaveHideout },
  ];
}
function hideDrawFix(o) {                                        // after a fixture is drawn: the banner wears the crew's colour, the shelf holds the trophies
  const C = HIDE && crewGet(HIDE.id); if (!C) return; const a = HOME_SRC[o.k]; if (!a) return; const x0 = Math.round(o.x - a.w / 2), y0 = Math.round(o.y - a.h + 2);
  if (o.k === 'hide_banner') { g.save(); g.globalAlpha = 0.62; g.fillStyle = crewCol(C); g.fillRect(x0 + 15, y0 + 9, 26, 50); g.globalAlpha = 1; g.fillStyle = '#fff7e6'; g.font = 'bold 20px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(hoName(C).trim().charAt(0).toUpperCase(), x0 + 28, y0 + 32); g.restore(); }
  if (o.k === 'hide_trophy') { const n = TROPHIES.filter(q => C.tro[q.id]).length; for (let i = 0; i < Math.min(n, 6); i++) { const x = x0 + 8 + i * 8, y = y0 + 8; g.fillStyle = '#e8b830'; g.fillRect(x, y, 6, 6); g.fillRect(x + 2, y + 6, 2, 3); g.fillRect(x, y + 9, 6, 2); g.fillStyle = '#fff2a8'; g.fillRect(x + 1, y + 1, 2, 2); } }
}
function hideDrawGlow() {                                        // inside the world transform, over the room: lantern glow and fireflies once the crew hangs the root lanterns
  const C = crewGet(HIDE.id); if (!C || !C.done.lamps) return; const B = gridBox();
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let r = B.r0 - 1; r <= B.r1; r++) for (let c = B.c0; c <= B.c1; c++) { if (!isFace(c, r) || (c + r) % 2) continue; const x = cellX(c) + IT / 2, y = cellY(r) + IT * 0.6, fl = 0.8 + Math.sin(t * 3 + c) * 0.15, gr = g.createRadialGradient(x, y, 2, x, y, 70); gr.addColorStop(0, `rgba(255,200,110,${0.32 * fl})`); gr.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gr; g.fillRect(x - 70, y - 70, 140, 140);
    g.fillStyle = '#ffe6a0'; g.fillRect(x - 3, y - 4, 6, 7); }
  for (let i = 0; i < 10; i++) { const x = B.x0 + ((i * 131 + t * 14 * (1 + i % 3)) % (B.x1 - B.x0)), y = B.y0 + 30 + ((i * 71) % Math.max(40, B.y1 - B.y0 - 40)) + Math.sin(t * 1.3 + i) * 10, a = 0.5 + Math.sin(t * 4 + i * 2) * 0.4; g.fillStyle = `rgba(210,255,140,${a})`; g.fillRect(x, y, 3, 3); }
  g.restore();
}
/* ----- the hollow tree in your yard ----- */
const _villageIaHide = villageInteractables;
villageInteractables = function () {
  const out = _villageIaHide(); if (!HOME_IN && !VISIT && !HIDE) (HOME.placed && HOME.placed.out || []).forEach(p => { if (p.id === 'hidetree') out.push({ id: 'hidetree', soft: 1, x: p.x, y: p.y + 6, r: 58, h: 104, tip: 'The hollow tree: crew hideouts', act: () => crewsScreen() }); });
  return out;
};
/* ----- after a raid: trophies for raiding with crewmates ----- */
function raidMates() {                                           // friend codes of the other players in this raid
  const s = new Set(); if (!multi) return []; if (isHost) CREW.guests.forEach(G => { if (okCode(G.fc)) s.add(G.fc); }); else if (okCode(net.hostFc)) s.add(net.hostFc);
  (CREW.info || []).forEach(i => { if (Array.isArray(i) && okCode(i[4])) s.add(i[4]); }); s.delete(myCode()); return [...s];
}
function crewBeat(win) {                                          // end of a raid on this machine: returns a line for the end screen
  if (!CREWS || !multi || night < 2 && !win) return ''; const mates = raidMates(); if (!mates.length) return ''; const lines = [], raiders = (CREW.slots || []).length;
  crewList().forEach(C => { const with2 = crewMembers(C).filter(k => mates.includes(k)); if (!with2.length) return; const got = [], give = id => { if (!C.tro[id]) { C.tro[id] = Date.now(); if (TROPHIES.some(q => q.id === id)) got.push(id); } };
    crewLedger(C, L => { L.raids = (L.raids || 0) + 1; }); give('first'); if (win) { give('win'); if (SITE_SHORT[siteId]) give('w_' + siteId); } if (raiders >= 5) give('full'); got.push(...crewTrophies(C));
    crewSend(C); lines.push(got.length ? ` ${hoName(C)} won a trophy: ${got.map(trophyName).join(', ')}!` : ` A raid together for ${hoName(C)}.`); });
  if (lines.length) crewsSave(); return lines.join('');
}
/* ----- screens ----- */
function crewRefresh() { const n = $('ov').dataset.screen, id = $('ov').dataset.crew; if (n === 'crews') crewsScreen(); else if (n === 'crew' && id) crewScreen(id); else if (n === 'crewchest') chestScreen(); }
function crewsScreen(msg) {
  if (!SOC) socialLoad(); socialUp(); socialPoll(true); const list = crewList();
  const rows = list.map(C => { const on = crewOnline(C); return `<div class="frow"><b><span class="cdot" style="background:${crewCol(C)}"></span>${esc(hoName(C))}</b> <small>${crewMembers(C).length} member${crewMembers(C).length === 1 ? '' : 's'}${on.length ? ' &middot; ' + on.length + ' online' : ''} &middot; ${TROPHIES.filter(q => C.tro[q.id]).length} trophies</small><span>
    <button class="mini" ${VISIT ? 'disabled' : ''} onclick="enterHideout('${C.id}')">Go in</button><button class="mini" onclick="crewScreen('${C.id}')">Crew</button></span></div>`; }).join('');
  const invs = CREWS.inv.map(v => `<div class="frow"><b>${esc(hoName(v.crew))}</b> <small>${esc(v.name)} invited you &middot; ${crewMembers(v.crew).length} members</small><span><button class="mini" onclick="crewAccept('${v.crew.id}')">Join</button><button class="mini" onclick="crewDecline('${v.crew.id}')">No thanks</button></span></div>`).join('');
  const tree = !HOME_REAL().placed.out.some(p => p.id === 'hidetree') && list.length ? `<p class="lbl" style="color:#ffd23f">${HOME_REAL().store.hidetree > 0 ? 'Your hollow tree is in storage: place it in your yard (Build) and walk up to it to reach your hideouts.' : ''}</p>` : '';
  homeScreen(`<h1>Crew hideouts</h1><p class="tag">A crew is a group of friends with a hideout of its own. Everyone in it keeps a copy, so anyone can go in, any time; when you are online together your copies join up. You can be in several crews.</p>
  ${invs ? `<p class="lbl">Invitations</p><div class="flist">${invs}</div>` : ''}<div class="flist">${rows || '<p class="lbl">You are not in a crew yet. Start one and invite your friends.</p>'}</div>${tree}
  <div class="row"><input id="newcrew" maxlength="24" placeholder="Crew name" style="width:170px"><button class="mini" onclick="crewNewUi()">Start a crew</button></div>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}<div class="row"><button onclick="socialScreen()">Friends</button><button onclick="leaveHomeScreen()">Back</button></div>`, 'crews');
}
function crewNewUi() { if (crewList().length >= 6) return crewsScreen('That is a lot of crews already (six at most)'); const C = crewNew(($('newcrew') || {}).value || '', crewList().length); crewScreen(C.id, 'Started ' + hoName(C) + '! Invite your friends, then go in.'); }
function crewScreen(id, msg) {
  const C = crewGet(id); if (!C || !crewIsMember(C, myCode())) return crewsScreen(); const me = myCode();
  const mem = crewMembers(C).map(k => { const f = friend(k), on = k === me || (socLinks[k] && socLinks[k].ok), inHere = HIDE && HIDE.id === id && OTHERS[k];
    return `<div class="frow"><b>${esc(k === me ? myName() + ' (you)' : (f && f.name) || C.mem[k].n || k)}</b> <small>${k === C.by ? 'founder &middot; ' : ''}${inHere ? 'in the hideout' : on ? 'online' : 'offline'}</small>${k !== me && (!f || f.st !== 'friend') ? `<span><button class="mini" onclick="crewAddFriend('${id}','${k}')" title="Friends see each other in the hideout">Add friend</button></span>` : ''}</div>`; }).join('');
  const can = SOC.friends.filter(f => f.st === 'friend' && !crewIsMember(C, f.code));
  const inv = can.length ? `<div class="row"><select id="crewinv">${can.map(f => `<option value="${f.code}">${esc(f.name || f.code)}</option>`).join('')}</select><button class="mini" onclick="crewInvite('${id}',$('crewinv').value)">Invite</button></div>` : '<p class="lbl">Add friends (Friends screen) to invite them.</p>';
  const cols = CREW_COLS.map((c, i) => `<button class="mini cswatch${C.meta.col === i ? ' on' : ''}" style="background:${c}" onclick="crewRecolor('${id}',${i})" aria-label="colour ${i + 1}"></button>`).join('');
  homeScreen(`<h1><span class="cdot" style="background:${crewCol(C)}"></span>${esc(hoName(C))}</h1><p class="tag">${crewRaids(C)} raid${crewRaids(C) === 1 ? '' : 's'} together &middot; ${TROPHIES.filter(q => C.tro[q.id]).length} of ${TROPHIES.length} trophies</p>
  <div class="flist">${mem}</div>${inv}
  <div class="row"><input id="crewname" maxlength="24" value="${esc(hoName(C))}" style="width:150px"><button class="mini" onclick="crewRename('${id}')">Rename</button>${cols}</div>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}
  <div class="row">${HIDE && HIDE.id === id ? '' : `<button class="up" ${VISIT || HIDE ? 'disabled style="opacity:.5"' : ''} onclick="enterHideout('${id}')"><b>Go in</b>the hideout</button>`}<button class="up" onclick="projScreen('${id}')"><b>Projects</b>dig and build together</button><button class="up" onclick="trophyScreen('${id}')"><b>Trophies</b></button></div>
  <div class="row"><button onclick="crewsScreen()">All crews</button><button onclick="crewLeave('${id}')">Leave crew</button><button onclick="leaveHomeScreen()">Close</button></div>`, 'crew'); $('ov').dataset.crew = id;
}
function crewAddFriend(id, code) { const C = crewGet(id); if (!C) return; if (!friend(code)) { SOC.friends.push({ code, name: C.mem[code] ? C.mem[code].n : '', perm: 0, st: 'out', t: Date.now() }); socQueue(code, 'freq', {}); socConnect(code); } crewScreen(id, 'Friend request sent'); }
function trophyScreen(id) {
  const C = crewGet(id); if (!C) return crewsScreen(); const farms = Object.keys(SITE_SHORT).map(s => `<span class="cost${C.tro['w_' + s] ? '' : ' short'}">${SITE_SHORT[s]}</span>`).join(' ');
  homeScreen(`<h1>Trophies</h1><p class="tag">${esc(hoName(C))} &middot; ${crewRaids(C)} raids together</p><div class="cards">${TROPHIES.map(q => `<div class="card${C.tro[q.id] ? '' : ' dim'}"><b>${C.tro[q.id] ? '&#127942; ' : '&#128274; '}${esc(q.name)}</b>${esc(q.text)}${C.tro[q.id] ? '<br><small>' + esc(ago(C.tro[q.id])) + '</small>' : ''}</div>`).join('')}</div>
  <p class="lbl">Wins together: ${farms}</p><div class="row"><button onclick="crewScreen('${id}')">Crew</button><button onclick="leaveHomeScreen()">Close</button></div>`, 'crewtro');
}
function projScreen(id, msg) {
  const C = crewGet(id); if (!C) return crewsScreen(); const ch = crewChest(C), has = cost => Object.entries(cost).every(([k, n]) => (ch[k] || 0) >= n);
  const costH = cost => Object.entries(cost).map(([k, n]) => `<span class="cost${(ch[k] || 0) >= n ? '' : ' short'}">${matIcon(k)}${Math.min(ch[k] || 0, n)}/${n}</span>`).join(' ');
  const rows = CREW_PROJ.map(p => { const done = !!C.done[p.id]; return `<div class="card"><b>${esc(p.name)}${done ? ' &#10003;' : ''}</b><span class="opt">${esc(p.text)}</span>${done ? '' : `<div class="drops">${costH(p.cost)} <button class="slot" ${has(p.cost) ? '' : 'disabled style="opacity:.5"'} onclick="projBuild('${id}','${p.id}')">Build</button></div>`}</div>`; }).join('');
  homeScreen(`<h1>Crew projects</h1><p class="tag">Paid from the crew chest (in the hideout): everyone chips in.</p><div class="cards">${rows}</div>${msg ? `<p class="lbl" style="color:#9be37f">${esc(msg)}</p>` : ''}
  <div class="row"><button onclick="crewScreen('${id}')">Crew</button><button onclick="leaveHomeScreen()">Close</button></div>`, 'crewproj');
}
function projBuild(id, pid) {
  const C = crewGet(id), p = CREW_PROJ.find(q => q.id === pid); if (!C || !p || C.done[pid]) return projScreen(id); if (HIDE) hideCommit(); const ch = crewChest(C);
  if (!Object.entries(p.cost).every(([k, n]) => (ch[k] || 0) >= n)) return projScreen(id, 'The chest is short');
  crewLedger(C, L => { for (const k in p.cost) L.m[k] = (L.m[k] || 0) - p.cost[k]; if (p.give) L.s[p.give] = (L.s[p.give] || 0) + 1; }); C.done[pid] = Date.now(); crewTrophies(C); crewsSave(); crewSend(C, true);
  if (HIDE && HIDE.id === id) hideApply(); try { sfxPlay('clear'); } catch (e) {} projScreen(id, p.name + ': done!' + (p.room ? ' Go and see the new room.' : p.give ? ' It is in the crew storage (Build).' : ''));
}
function chestScreen(msg) {
  if (!HIDE) return; const C = crewGet(HIDE.id); if (!C) return; hideCommit(); const ch = crewChest(C), me = myCode(), my = (C.led[me] || {}).m || {}, mine = HIDE.mine;
  const mats = MAT_IDS.map(k => { const have = HOME.mats[k] || 0, n = ch[k] || 0; if (!have && !n) return ''; return `<div class="frow">${matIcon(k, 24)} <b>${esc(MATS[k].name)}</b> <small>chest ${n} &middot; you ${have}</small><span>
    <button class="mini" ${have ? '' : 'disabled'} onclick="chestPut('${k}',1)">Put 1</button><button class="mini" ${have >= 5 ? '' : 'disabled'} onclick="chestPut('${k}',5)">Put 5</button><button class="mini" ${n ? '' : 'disabled'} onclick="chestPut('${k}',-1)">Take 1</button></span></div>`; }).join('');
  const givers = crewMembers(C).map(k => { const L = C.led[k], n = L ? Object.values(L.m || {}).reduce((a, b) => a + Math.max(0, b), 0) : 0; return n > 0 ? `${esc(k === me ? 'You' : (friend(k) || {}).name || C.mem[k].n || k)} ${n}` : ''; }).filter(Boolean).join(', ');
  const fur = CAT.filter(c => fits(c, 'in') && !c.hide && (mine.store[c.id] > 0 || ((C.led[me] || {}).s || {})[c.id] > 0)).map(c => { const gave = Math.min(((C.led[me] || {}).s || {})[c.id] || 0, HOME.store[c.id] || 0);
    return `<div class="frow"><b>${esc(c.name)}</b> <small>at home ${mine.store[c.id] || 0} &middot; crew storage ${HOME.store[c.id] || 0}</small><span><button class="mini" ${mine.store[c.id] > 0 ? '' : 'disabled'} onclick="chestFur('${c.id}',1)">Bring 1</button><button class="mini" ${gave > 0 ? '' : 'disabled'} title="Take back something you brought" onclick="chestFur('${c.id}',-1)">Take back</button></span></div>`; }).join('');
  homeScreen(`<h1>Crew chest</h1><p class="tag">Materials for crew projects. Anyone in the crew can put in or take out.${givers ? ' Given so far: ' + givers + '.' : ''}</p><div class="flist">${mats || '<p class="lbl">Bring materials from your raids.</p>'}</div>
  <p class="lbl">Furniture: bring pieces from your home storage into the crew storage (then place them in Build).</p><div class="flist">${fur || '<p class="lbl">Nothing in your home storage that goes indoors.</p>'}</div>
  ${msg ? `<p class="lbl" style="color:#9be37f">${esc(msg)}</p>` : ''}<div class="row"><button class="up" onclick="projScreen('${HIDE.id}')"><b>Projects</b>what the chest is for</button><button onclick="leaveHomeScreen()">Close</button></div>`, 'crewchest');
}
function chestPut(k, n) {
  if (!HIDE || !MATS[k]) return; const C = crewGet(HIDE.id); if (!C) return; const ch = crewChest(C);
  if (n > 0 && (HOME.mats[k] || 0) < n) return chestScreen(); if (n < 0 && (ch[k] || 0) < -n) return chestScreen();
  HOME.mats[k] = (HOME.mats[k] || 0) - n; crewLedger(C, L => { L.m[k] = (L.m[k] || 0) + n; }); crewsSave(); crewSend(C); hideSave(); try { sfxPlay('ui'); } catch (e) {} chestScreen((n > 0 ? 'Put in ' : 'Took ') + Math.abs(n) + ' ' + MATS[k].name.toLowerCase());
}
function chestFur(id, n) {                                        // bring furniture from your own storage (or take back what you brought)
  if (!HIDE || !catItem(id)) return; const C = crewGet(HIDE.id), mine = HIDE.mine; if (!C) return; hideCommit(); const gave = ((C.led[myCode()] || {}).s || {})[id] || 0;
  if (n > 0 && !(mine.store[id] > 0)) return chestScreen(); if (n < 0 && (gave <= 0 || !(HOME.store[id] > 0))) return chestScreen();
  mine.store[id] = (mine.store[id] || 0) - n; HOME.store[id] = (HOME.store[id] || 0) + n; save('raidHome', mine); hideCommit(); chestScreen((n > 0 ? 'Brought ' : 'Took back ') + catItem(id).name.toLowerCase());
}
function drawHideHud() {                                          // the top bar while inside (like the visit bar)
  if (!HIDE) return; const C = crewGet(HIDE.id); if (!C) return; const names = Object.values(OTHERS).map(o => o.name), txt = hoName(C) + (names.length ? ' · with ' + names.join(', ') : '');
  g.save(); g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; const w = g.measureText(txt).width + 22; g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(VW / 2 - w / 2, 8, w, 26); g.fillStyle = crewCol(C); g.fillRect(VW / 2 - w / 2, 8, 3, 26);
  g.fillStyle = '#fff7e6'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(txt, VW / 2, 21.5); g.restore();
}
function hideTreeNotice() {                                       // in the yard: the hollow tree arrived
  if (HIDE || VISIT || BUILD.on || state !== 'home' || HOME_IN || !HOME.seen.treeNew) return; if (HOME.placed.out.some(p => p.id === 'hidetree')) { HOME.seen.treeNew = 0; return; }
  if (!(HOME.store.hidetree > 0)) return; g.save(); g.font = 'bold 14px "Trebuchet MS",Verdana,sans-serif'; const m = isTouch ? 'A hollow tree for your crew hideout arrived - tap Build to place it' : 'A hollow tree for your crew hideout arrived - press B (Build) to place it', mw = g.measureText(m).width + 20;
  g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(VW / 2 - mw / 2, VH - 92, mw, 24); g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m, VW / 2, VH - 79.5); g.restore();
}
function crewBadge() { if (!CREWS) return ''; const i = CREWS.inv.length, n = crewList().length; return i ? i + ' invitation' + (i > 1 ? 's' : '') : n ? n + ' crew' + (n > 1 ? 's' : '') : 'hideouts with friends'; }
