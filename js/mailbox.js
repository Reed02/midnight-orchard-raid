/* ===== THE MAILBOX: letters, gifts and friend requests that reach friends who are OFFLINE =====
   Friends' games talk directly (social.js), but that only works while both are open. With CONFIG.social.mailbox set to your Cloudflare Worker
   (server/mailbox-worker.js, steps in server/README.md) everything in the outbox is ALSO dropped in the friend's mailbox, and your game picks up
   its own mail every CONFIG.social.pollSec seconds. Without it the game works as before (direct delivery only).
   PRIVACY: everything is locked in the browser before it leaves (end-to-end). Each player has a P-256 key pair (SOC.kp). A message is sealed twice:
   an outer layer with a throwaway key (so the server cannot even see who sent it) and an inner layer with the sender's own key (so the friend knows
   it really came from them: the key must match the one learned when you became friends). Inbox addresses are SHA-256 hashes; the server sees only
   locked blobs. Your homestead snapshot (so friends can wander it, crops and all, while you are away) is locked with SOC.bk, a key only friends get.
   Duplicates are harmless: every message has an id, the receiver ignores ids it has seen, and outbox items stay until the friend acknowledges them. */
const MB = { busy: 0, polled: 0, reg: 0, baseAt: 0, baseDirty: 0, err: '', pkCache: {} };
const mbOn = () => !!(CONFIG.social && CONFIG.social.mailbox) && typeof crypto !== 'undefined' && !!crypto.subtle && typeof fetch === 'function';
const mbUrl = p => CONFIG.social.mailbox.replace(/\/+$/, '') + p;
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const TE = new TextEncoder(), TD = new TextDecoder();
async function sha(s) { return b64u(await crypto.subtle.digest('SHA-256', TE.encode(s))); }
const mbAddr = code => sha('mor-inbox:' + code);
async function mbKeys() {                                       // my key pair, my owner secret and my snapshot key (made once, saved with raidSocial)
  if (MB.keys) return MB.keys;
  if (!SOC.kp || !SOC.kp.priv) { const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    SOC.kp = { priv: await crypto.subtle.exportKey('jwk', k.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', k.publicKey)) }; }
  if (!SOC.own) SOC.own = b64u(crypto.getRandomValues(new Uint8Array(32)));
  if (!SOC.bk) SOC.bk = b64u(crypto.getRandomValues(new Uint8Array(32)));
  socialSave(); MB.keys = { priv: await crypto.subtle.importKey('jwk', SOC.kp.priv, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']), pub: SOC.kp.pub }; return MB.keys;
}
const pubKey = raw => crypto.subtle.importKey('raw', ub64(raw), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
async function aesFrom(priv, pubRaw, info) {                      // key agreement -> HKDF -> an AES-GCM key
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: await pubKey(pubRaw) }, priv, 256), base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: TE.encode('midnight-orchard'), info: TE.encode(info) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function lock(key, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64u(iv), c: b64u(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, TE.encode(JSON.stringify(obj)))) }; }
async function unlock(key, box) { return JSON.parse(TD.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(box.iv) }, key, ub64(box.c)))); }
async function seal(toPub, payload) {
  const me = await mbKeys(), eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const inner = await lock(await aesFrom(me.priv, toPub, 'inner'), payload);
  const outer = await lock(await aesFrom(eph.privateKey, toPub, 'outer'), { spk: me.pub, inner });
  return JSON.stringify({ e: b64u(await crypto.subtle.exportKey('raw', eph.publicKey)), iv: outer.iv, c: outer.c });
}
async function unseal(text) {
  const me = await mbKeys(), env = JSON.parse(text), o = await unlock(await aesFrom(me.priv, env.e, 'outer'), env);
  return { spk: o.spk, payload: await unlock(await aesFrom(me.priv, o.spk, 'inner'), o.inner) };
}
const symKey = raw => crypto.subtle.importKey('raw', ub64(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
async function mbFetch(path, opt = {}) {
  const r = await fetch(mbUrl(path), Object.assign({ cache: 'no-store' }, opt)); let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const e = new Error((j && j.err) || 'HTTP ' + r.status); e.status = r.status; throw e; } return j || {};
}
async function mbRegister() {                                     // make sure my inbox exists (and holds my current public key)
  if (MB.reg) return; const me = await mbKeys(), a = await mbAddr(SOC.code);
  await mbFetch('/pk/' + a, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Key': SOC.own }, body: JSON.stringify({ pk: me.pub, own: await sha(SOC.own) }) }); MB.reg = 1;
}
async function friendPk(code) { const f = friend(code); if (f && f.pk) return f.pk; if (MB.pkCache[code]) return MB.pkCache[code]; const j = await mbFetch('/pk/' + await mbAddr(code)); return (MB.pkCache[code] = j.pk); }
/* ----- sending: anything the direct link would send can go through the mailbox (positions and live visit traffic never do) ----- */
const MB_SKIP = ['pos', 'st', 'hb', 'base', 'visit', 'welcome', 'deny', 'state', 'op', 'res', 'perm', 'bye', 'say', 'emo'];
async function mbSend(code, m) {
  if (!mbOn() || MB_SKIP.includes(m.t)) return false; const f = friend(code);
  const payload = { f: SOC.code, n: myName(), m }; if (f && f.st === 'friend') payload.bk = SOC.bk;        // friends also get my snapshot key
  const pk = await friendPk(code), c = await seal(pk, payload), id = m.id && m.t !== 'ack' ? 'm' + m.id : 'x' + newUid() + newUid();
  await mbFetch('/send/' + await mbAddr(code), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, c }) }); return true;
}
const REPOST_MS = 15 * 60000;
async function mbFlush() {                                       // every outbox item goes in the friend's mailbox (again every 15 min until they acknowledge it)
  const now = Date.now(); for (const o of SOC.out.slice()) { if (o.mb && now - o.mb < REPOST_MS) continue; const m = outMsg(o); if (!m) continue;
    try { if (await mbSend(o.to, m)) { o.mb = now; socialSave(); } } catch (e) { MB.err = e.message; if (e.status === 404) o.mb = now - REPOST_MS + 120000; } }        // 404: they have not opened the game since the mailbox was set up; try again in 2 min
}
/* ----- receiving ----- */
async function mbPoll(force) {
  if (!mbOn() || !SOC || MB.busy) return; const now = Date.now(); if (!force && now - MB.polled < (CONFIG.social.pollSec || 60) * 1000) return; MB.busy = 1; MB.polled = now;
  try {
    await mbRegister(); const a = await mbAddr(SOC.code), j = await mbFetch('/inbox/' + a, { headers: { 'X-Key': SOC.own } }), done = [];
    for (const it of j.msgs || []) { done.push(it.id); try { await mbReceive(await unseal(it.c)); } catch (e) { /* not for us, or tampered with: dropped */ } }
    if (done.length) await mbFetch('/del/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Key': SOC.own }, body: JSON.stringify({ ids: done }) });
    await mbFlush(); await mbBaseUp(); MB.err = '';
  } catch (e) { MB.err = e.message; } finally { MB.busy = 0; }
}
async function mbReceive({ spk, payload }) {
  const code = S_(payload.f, 6), m = payload.m; if (!/^[A-Z2-9]{6}$/.test(code) || code === SOC.code || !m || typeof m.t !== 'string') return;
  let f = friend(code); if (f && f.pk && f.pk !== spk) return;                                   // somebody pretending to be this friend: the key does not match
  if (!f && m.t !== 'freq') return;
  const link = { code, ok: 1, mb: 1, name: S_(payload.n, 20), c: null };
  socMsg(link, m); f = friend(code);
  if (f) { if (!f.pk) f.pk = spk; if (f.st === 'friend' && typeof payload.bk === 'string' && payload.bk.length < 64) f.bk = payload.bk; if (payload.n && !f.name) f.name = S_(payload.n, 20); socialSave(); }
}
/* ----- my homestead snapshot for friends (locked with SOC.bk), and reading a friend's ----- */
function mbBaseDirty() { MB.baseDirty = 1; }
async function mbBaseUp(now) {
  if (!mbOn() || !MB.baseDirty || VISIT || !SOC.friends.some(f => f.st === 'friend')) return; if (!now && Date.now() - MB.baseAt < (CONFIG.social.baseEverySec || 300) * 1000) return;
  MB.baseDirty = 0; MB.baseAt = Date.now(); await mbKeys(); await mbRegister();
  const box = await lock(await symKey(SOC.bk), { base: baseOf(HOME_REAL()), t: Date.now(), n: myName() });
  await mbFetch('/base/' + await mbAddr(SOC.code), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Key': SOC.own }, body: JSON.stringify({ c: JSON.stringify(box) }), keepalive: !!now });
}
async function mbBaseOf(code) {                                    // a friend's latest snapshot (null if none or no key yet)
  const f = friend(code); if (!mbOn() || !f || !f.bk) return null;
  try { const j = await mbFetch('/base/' + await mbAddr(code)), o = await unlock(await symKey(f.bk), JSON.parse(j.c));
    if (o && o.base && typeof o.base === 'object' && (!f.baseT || o.t > f.baseT)) { f.base = o.base; f.baseT = o.t; socialSave(); } return f.base; } catch (e) { return null; }
}
setInterval(() => { try { if (SOC && SOC.code) mbPoll(); } catch (e) {} }, 5000);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') mbBaseUp(true).catch(() => {}); else mbPoll(true); });
