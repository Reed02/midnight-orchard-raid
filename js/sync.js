/* ===== ONE HOMESTEAD ON ALL YOUR DEVICES (no server, no sign-in) =====
   Each browser keeps its own save. LINKING makes several devices share one: Settings > Linked devices > "Link a new device" shows a short code
   on the device that has your homestead; on the new device choose "Use my homestead from another device" and type it. The two meet through the
   same matchmaking service multiplayer uses (peerRoomJoin, a private room named by the code), and the first device hands over the whole save
   plus the link's secret key. From then on, every linked device posts its save, LOCKED with that key (AES-GCM), to the free relay the mailbox
   already uses (CONFIG.social.relay), a little after anything changes, and every few hours while open; each device checks the relay every
   SYNC.pollSec seconds and when it is opened. The newest save wins (SYNC.rev counts changes; the clock breaks a tie). The save it replaces is kept on
   that device as a backup ("Restore the save from before the last sync"). The relay keeps messages about 12 hours, so a device that has been
   closed longer catches up the next time another linked device is opened (it re-posts every few hours while open).
   What travels: everything the game saves (keys starting with "raid"), except what belongs to one device: key bindings, sound, touch controls,
   the link itself, the backup, and a keepsake packed mid-raid. Both devices use the same friend code: friends see one of you at a time.
   A new save never arrives in the middle of a raid: it waits until you are back at the homestead or the title screen, then the page reloads. */
const SYNC = { reloading: false, pollSec: 30, pushDelay: 40000, minGap: 120000, repost: 3 * 3600000, part: 3000, busy: 0, polled: 0, pending: null, fp: '', dirtyAt: 0, err: '', pair: null };
const SYNC_SKIP = ['raidKeys', 'raidSound', 'raidTouch', 'raidLink', 'raidBackup', 'raidPack'];
const syncKeys = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^raid/.test(k) && !SYNC_SKIP.includes(k)) out.push(k); } } catch (e) {} return out.sort(); };
const linkInfo = () => store('raidLink', null);
const linked = () => { const L = linkInfo(); return !!(L && L.acct && L.key); };
function bundleNow() {                                       // what travels: every synced key; friends' cached homesteads stay behind (each device keeps its own)
  const d = {}; syncKeys().forEach(k => { d[k] = localStorage.getItem(k); });
  if (d.raidSocial) try { const o = JSON.parse(d.raidSocial); (o.friends || []).forEach(f => { delete f.base; delete f.baseT; }); d.raidSocial = JSON.stringify(o); } catch (e) {}
  return d;
}
function steady(d) {                                         // the same save minus what changes on its own (relay cursors, who is online, re-post times): only real changes count
  const c = Object.assign({}, d); if (c.raidSocial) try { const o = JSON.parse(c.raidSocial); delete o.rs; delete o.pkAt; (o.friends || []).forEach(f => { delete f.on; delete f.seen; }); (o.out || []).forEach(x => { delete x.mb; }); c.raidSocial = JSON.stringify(o); } catch (e) {}
  return c;
}
function writeBundle(data) {                                  // put a save from another device into this browser (friends' cached homesteads from here are kept)
  let keepBases = {}; try { (JSON.parse(localStorage.getItem('raidSocial') || '{}').friends || []).forEach(f => { if (f.base) keepBases[f.code] = [f.base, f.baseT]; }); } catch (e) {}
  syncKeys().forEach(k => { if (!(k in data)) localStorage.removeItem(k); });
  Object.entries(data).forEach(([k, v]) => { if (!/^raid/.test(k) || SYNC_SKIP.includes(k) || typeof v !== 'string') return;
    if (k === 'raidSocial') try { const o = JSON.parse(v); (o.friends || []).forEach(f => { const b = keepBases[f.code]; if (b) { f.base = b[0]; f.baseT = b[1]; } }); v = JSON.stringify(o); } catch (e) {}
    localStorage.setItem(k, v); });
}
function fingerprint(d) { let h = 2166136261; const s = JSON.stringify(steady(d)); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; }
async function syncKey(L) { return crypto.subtle.importKey('raw', ub64(L.key), 'AES-GCM', false, ['encrypt', 'decrypt']); }
const syncTopic = async L => 'mor' + await sha('mor-sync:' + L.acct);
async function gz(text, inflate) {                            // the save is squeezed before it is locked (the relay takes ~4 KB a message)
  if (typeof CompressionStream === 'undefined') return inflate ? text : text;
  const s = new Blob([inflate ? ub64(text) : TE.encode(text)]).stream().pipeThrough(inflate ? new DecompressionStream('gzip') : new CompressionStream('gzip'));
  const buf = await new Response(s).arrayBuffer(); return inflate ? TD.decode(buf) : b64u(buf);
}
/* ----- noticing changes and posting them ----- */
function syncTick() {
  if (!linked()) return; const L = linkInfo(), d = bundleNow(), fp = fingerprint(d);
  if (!SYNC.fp) { SYNC.fp = fp; if (L.fp && L.fp !== fp) syncDirty(L); return; }          // first look this session: changed since the last sync? (played while offline)
  if (fp !== SYNC.fp) { SYNC.fp = fp; syncDirty(L); }
  if (SYNC.dirtyAt && Date.now() - SYNC.dirtyAt > SYNC.pushDelay && !(L.postedAt && Date.now() - L.postedAt < SYNC.minGap)) syncPush();      // quiet for a while, and not too often: the free relay limits messages a day
  else if (L.postedAt && Date.now() - L.postedAt > SYNC.repost) syncPush();
  if (SYNC.pending && ['home', 'title'].includes(state) && !(typeof BUILD !== 'undefined' && BUILD.on)) syncApply(SYNC.pending);
}
function syncDirty(L) { L.rev = (L.rev || 0) + 1; L.ts = Date.now(); L.fp = SYNC.fp; save('raidLink', L); SYNC.dirtyAt = Date.now(); }
async function syncPush() {
  if (!mbOn() || SYNC.busy || !linked()) return; SYNC.busy = 1; SYNC.dirtyAt = 0;
  try {
    const L = linkInfo(), box = await lock(await syncKey(L), { rev: L.rev || 0, ts: L.ts || Date.now(), dev: L.dev, name: L.name || '', z: await gz(JSON.stringify(bundleNow())) });
    const text = JSON.stringify(box), id = (L.dev + (L.rev || 0) + 'x' + Date.now().toString(36)).slice(-24), n = Math.ceil(text.length / SYNC.part), topic = await syncTopic(L);
    if (n > 60) throw new Error('the save is too big to send (' + Math.round(text.length / 1024) + ' KB)');
    for (let i = 0; i < n; i++) await relayPost(topic, JSON.stringify({ id, i, n, c: text.slice(i * SYNC.part, (i + 1) * SYNC.part) }));
    const L2 = linkInfo(); L2.postedAt = Date.now(); L2.syncedAt = Date.now(); save('raidLink', L2); SYNC.err = '';
  } catch (e) { SYNC.err = e.message; SYNC.dirtyAt = Date.now() - SYNC.pushDelay + 30000; } finally { SYNC.busy = 0; }       // failed: try again in 30 s
}
/* ----- reading what the other devices posted ----- */
async function syncPoll(force) {
  if (!mbOn() || SYNC.busy || !linked()) return; const now = Date.now(); if (!force && now - SYNC.polled < SYNC.pollSec * 1000) return; SYNC.busy = 1; SYNC.polled = now;
  try {
    const L = linkInfo(), key = await syncKey(L), evs = await relayRead(await syncTopic(L), L.rs || 'all'), parts = {}; let best = null;
    for (const ev of evs) { L.rs = ev.id; let p; try { p = JSON.parse(ev.message); } catch (e) { continue; } if (!p || typeof p.id !== 'string' || typeof p.c !== 'string') continue;
      const b = parts[p.id] || (parts[p.id] = { n: Math.min(60, +p.n || 1), got: {} }); b.got[+p.i || 0] = p.c; if (Object.keys(b.got).length < b.n) continue;
      try { const box = await unlock(key, JSON.parse(Array.from({ length: b.n }, (_, i) => b.got[i] || '').join(''))); if (box.dev !== L.dev && (!best || newer(box, best))) best = box; } catch (e) {} }
    const L2 = linkInfo(); L2.rs = L.rs; L2.syncedAt = Date.now(); save('raidLink', L2); SYNC.err = '';
    if (best && newer(best, { rev: L2.rev || 0, ts: L2.ts || 0 })) SYNC.pending = best; else if (best && newer({ rev: L2.rev || 0, ts: L2.ts || 0 }, best)) SYNC.dirtyAt = SYNC.dirtyAt || 1;      // mine is newer: send it
  } catch (e) { SYNC.err = e.message; } finally { SYNC.busy = 0; }
}
const newer = (a, b) => (a.rev || 0) > (b.rev || 0) || ((a.rev || 0) === (b.rev || 0) && (a.ts || 0) > (b.ts || 0));
async function syncApply(box) {                                // replace this device's save with a newer one, keeping a backup, then reload
  SYNC.pending = null; let d; try { d = JSON.parse(await gz(box.z, true)); } catch (e) { SYNC.err = 'a save from another device could not be read'; return; }
  if (!d || typeof d !== 'object') return; const L = linkInfo();
  try { localStorage.setItem('raidBackup', JSON.stringify({ at: Date.now(), d: bundleNow() })); } catch (e) {}
  SYNC.reloading = true; writeBundle(d);
  L.rev = box.rev; L.ts = box.ts; L.fp = fingerprint(bundleNow()); L.syncedAt = Date.now(); L.from = box.name || ''; save('raidLink', L);
  try { show('<h1>Updated</h1><p>Your homestead was synced from your other device.</p>', 'sync'); } catch (e) {} setTimeout(() => location.reload(), 600);
}
/* ----- pairing a new device ----- */
const PAIR_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const devName = () => { const u = navigator.userAgent || ''; return (/iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows PC' : 'Device') + ' ' + (/Firefox/.test(u) ? '(Firefox)' : /Edg\//.test(u) ? '(Edge)' : /Chrome/.test(u) ? '(Chrome)' : /Safari/.test(u) ? '(Safari)' : ''); };
function ensureLink() { let L = linkInfo(); if (!L || !L.acct || !L.key) { L = { acct: b64u(crypto.getRandomValues(new Uint8Array(16))), key: b64u(crypto.getRandomValues(new Uint8Array(32))), dev: b64u(crypto.getRandomValues(new Uint8Array(6))), name: devName(), rev: 1, ts: Date.now() }; L.fp = fingerprint(bundleNow()); save('raidLink', L); } return L; }
async function pairHost() {                                    // this device has the homestead: show a code and wait for the new device
  if (!mbOn()) return linkScreen('Linking needs the internet (and the relay in CONFIG.social.relay).');
  pairStop(); const L = ensureLink(), code = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => PAIR_CHARS[b % PAIR_CHARS.length]).join('');
  linkScreen(null, `<div class="card wcard" style="text-align:center"><b>On your other device</b>open the game, go to Settings &gt; Linked devices &gt; Use my homestead from another device, and type:<div class="paircode">${code}</div><span class="lbl">Waiting... (the code works for 10 minutes while this screen is open)</span></div>`);
  let r; try { r = await peerRoomJoin('lk' + code.toLowerCase(), true); } catch (e) { return linkScreen('Could not open a pairing room (' + esc(netErrorText(e, code, true)) + ')'); }
  SYNC.pair = { r, code, t: setTimeout(() => { pairStop(); linkScreen('The code expired. Make a new one when you are ready.'); }, 600000) };
  r.on('pairhi', async m => { if (m.isMe) return; const d = m.data || {};
    const box = { acct: L.acct, key: L.key, rev: (linkInfo().rev || 0), ts: linkInfo().ts || Date.now(), name: L.name, z: await gz(JSON.stringify(bundleNow())) };
    r.emit('pairgo', { to: String(d.dev || ''), box }); setTimeout(() => { pairStop(); linkScreen('Linked! ' + esc(String(d.name || 'The other device').slice(0, 30)) + ' now shares this homestead.'); }, 1500); });
}
async function pairJoin() {                                    // this device takes the homestead of another one
  const code = String(($('paircode') || {}).value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) { const f = $('paircode'); if (f) { f.style.outline = '3px solid #ff7a6a'; f.focus(); } return; }
  pairStop(); linkScreen(null, '<p>Looking for your other device...</p>'); const dev = b64u(crypto.getRandomValues(new Uint8Array(6)));
  let r; try { r = await peerRoomJoin('lk' + code.toLowerCase(), false); } catch (e) { return linkScreen('Could not find that code. Is the other device still showing it? (' + esc(netErrorText(e, code, false)) + ')'); }
  SYNC.pair = { r, code, t: setTimeout(() => { pairStop(); linkScreen('No answer from the other device. Check the code and try again.'); }, 30000) };
  r.on('pairgo', async m => { const d = m.data || {}; if (m.isMe || d.to !== dev || !d.box) return; const b = d.box; pairStop();
    if (typeof b.acct !== 'string' || typeof b.key !== 'string' || typeof b.z !== 'string') return linkScreen('Something went wrong. Try again.');
    let data; try { data = JSON.parse(await gz(b.z, true)); } catch (e) { return linkScreen('The save could not be read. Try again.'); }
    try { localStorage.setItem('raidBackup', JSON.stringify({ at: Date.now(), d: bundleNow() })); } catch (e) {}
    SYNC.reloading = true; writeBundle(data);
    const L = { acct: b.acct, key: b.key, dev, name: devName(), rev: b.rev || 1, ts: b.ts || Date.now() }; L.fp = fingerprint(bundleNow()); save('raidLink', L);
    show('<h1>Linked!</h1><p>This device now shares your homestead. Loading it...</p>', 'sync'); setTimeout(() => location.reload(), 800); });
  const hi = () => { try { r.emit('pairhi', { dev, name: devName() }); } catch (e) {} }; hi(); SYNC.pair.hi = setInterval(hi, 1500);
}
function pairStop() { const P2 = SYNC.pair; if (!P2) return; SYNC.pair = null; clearTimeout(P2.t); clearInterval(P2.hi); try { P2.r.leave(); } catch (e) {} }
function unlinkDevice() { pairStop(); try { localStorage.removeItem('raidLink'); } catch (e) {} SYNC.fp = ''; linkScreen('This device is unlinked. Its homestead stays here, but no longer syncs.'); }
function restoreBackup() {
  const B = store('raidBackup', null); if (!B || !B.d) return linkScreen('There is no backup on this device.');
  SYNC.reloading = true; writeBundle(B.d);
  const L = linkInfo(); if (L) { L.rev = (L.rev || 0) + 1000; L.ts = Date.now(); save('raidLink', L); }      // the restored save is now the newest: it goes to the other devices
  try { localStorage.removeItem('raidBackup'); } catch (e) {} show('<h1>Restored</h1><p>Loading the save from before the last sync...</p>', 'sync'); setTimeout(() => location.reload(), 700);
}
function linkScreen(msg, body) {
  pairStopIfLeaving(body); const L = linkInfo(), B = store('raidBackup', null), on = linked();
  const when = ts => { if (!ts) return 'not yet'; const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(ts).toLocaleDateString(); };
  const status = on ? `<p class="tag">This device is linked${L.name ? ' (' + esc(L.name) + ')' : ''}. Last sync: ${when(L.syncedAt)}.${SYNC.err ? ' <span class="warn">' + esc(SYNC.err) + '</span>' : ''}</p>` : '<p class="tag">Play on your phone, tablet and computer with one homestead. No account or sign-in needed.</p>';
  const html = `<h1>Linked devices</h1>${msg ? `<p>${msg}</p>` : ''}${body || `${status}
    <div class="row"><button class="up" onclick="pairHost()"><b>Link a new device</b>show a code to type on it</button><button class="up" onclick="pairJoinScreen()"><b>Use my homestead from another device</b>replaces the one here</button></div>
    ${on ? '<div class="row"><button class="up" onclick="syncNow()"><b>Sync now</b></button><button class="up" onclick="unlinkDevice()"><b>Unlink this device</b>keeps its homestead</button></div>' : ''}
    ${B && B.d ? `<div class="row"><button class="up" onclick="restoreBackup()"><b>Restore the save from before the last sync</b>${when(B.at)}</button></div>` : ''}`}
    <div class="row"><button onclick="pairStop();settingsScreen()">Back</button></div>`;
  if (settingsFrom === 'home') homeScreen(html, 'link'); else show(html, 'link');
}
function pairStopIfLeaving(body) { if (!body) pairStop(); }
function pairJoinScreen() {
  linkScreen(null, `<div class="card wcard"><b>Use my homestead from another device</b>On the device that has your homestead: Settings &gt; Linked devices &gt; Link a new device. Type the code it shows here.
    ${HOME && (HOME.apples > 0 || HOME.house) ? ' <span class="warn">The homestead on this device will be replaced (a backup is kept).</span>' : ''}</div>
    <div class="row"><input id="paircode" maxlength="6" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-transform:uppercase;letter-spacing:4px;width:9em;text-align:center"><button class="big" onclick="pairJoin()">Link</button></div>`);
}
async function syncNow() { SYNC.polled = 0; await syncPoll(true); if (SYNC.pending) return; SYNC.dirtyAt = 1; await syncPush(); linkScreen(SYNC.err ? 'Could not sync: ' + esc(SYNC.err) : 'Synced.'); }
setInterval(() => { try { syncTick(); syncPoll(); } catch (e) {} }, 3000);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (SYNC.dirtyAt) syncPush(); } else syncPoll(true); });
setTimeout(() => { try { syncPoll(true); } catch (e) {} }, 1500);
