/* ===== THE MAILBOX: letters, gifts and friend requests that reach friends who are OFFLINE (no setup) =====
   Friends' games talk directly (social.js), but only while both are open. So everything in the outbox is ALSO posted to a free public relay
   (CONFIG.social.relay, ntfy.sh by default: no account, nothing to set up). Your game checks the relay for your mail every CONFIG.social.pollSec
   seconds. The relay keeps messages about 12 hours, so the sender's game posts again every RELAY_REPOST while it is open, and anything still
   undelivered goes directly the next time you are both online. relay: '' turns the relay off (direct delivery only).
   PRIVACY: everything is locked in the browser before it leaves (end-to-end). Each player has a P-256 key pair (SOC.kp); friends swap public keys
   when their games meet. A message is sealed twice: an outer layer with a throwaway key (so the relay cannot even see who sent it) and an inner layer
   with the sender's own key (so the friend knows it really came from them: the key must match the one learned when you became friends). Mailbox
   names on the relay are SHA-256 hashes, never friend codes or names. The relay only ever carries locked blobs.
   Duplicates are harmless: every message has an id, the receiver ignores ids it has seen (and acknowledges again), and outbox items stay until the
   friend acknowledges them. Long messages are cut into parts (the relay takes about 4 KB per message). */
const MB = { busy: 0, polled: 0, err: '', parts: {}, test: null };
const RELAY_REPOST = 4 * 3600000, REPOST_MS = RELAY_REPOST, PART = 3000;
const mbOn = () => !!(CONFIG.social && CONFIG.social.relay) && typeof crypto !== 'undefined' && !!crypto.subtle && typeof fetch === 'function';
const relayUrl = () => { let u = String(CONFIG.social.relay || '').trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { return new URL(u).origin; } catch (e) { return u.replace(/\/+$/, ''); } };
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const TE = new TextEncoder(), TD = new TextDecoder();
async function sha(s) { return b64u(await crypto.subtle.digest('SHA-256', TE.encode(s))); }
const inboxTopic = async code => 'mor' + await sha('mor-inbox:' + code), pkTopic = async code => 'mor' + await sha('mor-pk:' + code);
async function mbKeys() {                                       // my key pair (made once, saved with raidSocial)
  if (MB.keys) return MB.keys;
  if (!SOC.kp || !SOC.kp.priv) { const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    SOC.kp = { priv: await crypto.subtle.exportKey('jwk', k.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', k.publicKey)) }; }
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
/* ----- the relay (the ntfy publish / poll API) ----- */
async function relayPost(topic, text) {
  const r = await fetch(relayUrl() + '/' + topic, { method: 'POST', body: text, cache: 'no-store' });
  if (!r.ok) { const e = new Error(r.status === 429 ? 'the relay is busy, trying again soon' : 'relay HTTP ' + r.status); e.status = r.status; throw e; }
}
async function relayRead(topic, since) {                          // [{ id, message }] posted to topic (since = a relay message id, or 'all')
  const r = await fetch(relayUrl() + '/' + topic + '/json?poll=1&since=' + encodeURIComponent(since || 'all'), { cache: 'no-store' });
  if (!r.ok) { const e = new Error(r.status === 429 ? 'the relay is busy, trying again soon' : 'relay HTTP ' + r.status); e.status = r.status; throw e; }
  return (await r.text()).split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(x => x && x.event === 'message' && typeof x.message === 'string');
}
async function mbPublishKey(force) {                              // my public key, so someone who only knows my code can send me a friend request (posted again every 6 h)
  const me = await mbKeys(); if (!force && SOC.pkAt && Date.now() - SOC.pkAt < 6 * 3600000) return;
  await relayPost(await pkTopic(SOC.code), JSON.stringify({ pk: me.pub })); SOC.pkAt = Date.now(); socialSave();
}
async function friendPk(code) {
  const f = friend(code); if (f && f.pk) return f.pk; if (code === SOC.code) return (await mbKeys()).pub;
  const L = await relayRead(await pkTopic(code)); for (let i = L.length - 1; i >= 0; i--) { try { const o = JSON.parse(L[i].message); if (typeof o.pk === 'string' && o.pk.length < 120) return o.pk; } catch (e) {} }
  const e = new Error('not seen lately'); e.status = 404; throw e;
}
/* ----- sending: anything the direct link would send can go through the relay (positions and live visit traffic never do) ----- */
const MB_SKIP = ['pos', 'st', 'hb', 'base', 'visit', 'welcome', 'deny', 'state', 'op', 'res', 'perm', 'bye', 'say', 'emo'];
async function mbSend(code, m) {
  if (!mbOn() || MB_SKIP.includes(m.t)) return false; const f = friend(code);
  const payload = { f: SOC.code, n: myName(), m }; if (f && f.st === 'friend') payload.bk = SOC.bk;
  const c = await seal(await friendPk(code), payload), id = (m.id && m.t !== 'ack' ? 'm' + m.id : 'x' + newUid() + newUid()).slice(0, 30), topic = await inboxTopic(code), n = Math.ceil(c.length / PART);
  for (let i = 0; i < n; i++) await relayPost(topic, JSON.stringify({ id, i, n, c: c.slice(i * PART, (i + 1) * PART) })); return true;
}
async function mbFlush() {                                       // every outbox item goes to the relay (again every few hours until the friend acknowledges it)
  const now = Date.now(); for (const o of SOC.out.slice()) { if (o.mb && now - o.mb < RELAY_REPOST) continue; const m = outMsg(o); if (!m) continue;
    try { if (await mbSend(o.to, m)) { o.mb = now; socialSave(); } } catch (e) { if (e.status === 404) o.mb = now - RELAY_REPOST + 10 * 60000; else MB.err = e.message; } }      // 404: their key is not on the relay (not online for a while): try again in 10 min
}
/* ----- receiving ----- */
async function mbPoll(force) {
  if (!mbOn() || !SOC || !SOC.code || MB.busy) return; const now = Date.now(); if (!force && now - MB.polled < (CONFIG.social.pollSec || 60) * 1000) return; MB.busy = 1; MB.polled = now;
  try {
    await mbPublishKey(); const L = await relayRead(await inboxTopic(SOC.code), SOC.rs);
    for (const ev of L) { SOC.rs = ev.id; let p; try { p = JSON.parse(ev.message); } catch (e) { continue; } if (!p || typeof p.id !== 'string' || typeof p.c !== 'string') continue;
      const b = MB.parts[p.id] || (MB.parts[p.id] = { n: Math.min(20, +p.n || 1), got: {} }); b.got[+p.i || 0] = p.c; if (Object.keys(b.got).length < b.n) continue;
      const text = Array.from({ length: b.n }, (_, i) => b.got[i] || '').join(''); delete MB.parts[p.id];
      try { await mbReceive(await unseal(text)); } catch (e) { /* not for us, or tampered with: dropped */ } }
    socialSave(); await mbFlush(); MB.err = '';
  } catch (e) { MB.err = e.message; } finally { MB.busy = 0; }
}
async function mbReceive({ spk, payload }) {
  const code = S_(payload.f, 6), m = payload.m; if (!/^[A-Z2-9]{6}$/.test(code) || !m || typeof m.t !== 'string') return;
  if (code === SOC.code) { if (m.t === 'ping' && spk === SOC.kp.pub && MB.test && m.id === MB.test.id) MB.test.ok = 1; return; }      // my own test letter came back
  let f = friend(code); if (f && f.pk && f.pk !== spk) return;                                   // somebody pretending to be this friend: the key does not match
  if (!f && m.t !== 'freq') return;
  const link = { code, ok: 1, mb: 1, name: S_(payload.n, 20), c: null };
  socMsg(link, m); f = friend(code);
  if (f) { if (!f.pk) f.pk = spk; if (f.st === 'friend' && typeof payload.bk === 'string' && payload.bk.length < 64) f.bk = payload.bk; if (payload.n && !f.name) f.name = S_(payload.n, 20); socialSave(); }
}
/* ----- "Test mailbox" (Friends screen): send yourself a locked letter through the relay and wait for it to come back ----- */
async function mbSelfTest() {
  if (!mbOn()) return 'The relay is switched off (CONFIG.social.relay).';
  MB.test = { id: newUid() + newUid(), ok: 0 }; const t0 = Date.now();
  try {
    const c = await seal((await mbKeys()).pub, { f: SOC.code, n: myName(), m: { t: 'ping', id: MB.test.id } }); await relayPost(await inboxTopic(SOC.code), JSON.stringify({ id: 'p' + MB.test.id, i: 0, n: 1, c }));
    for (let i = 0; i < 12 && !MB.test.ok; i++) { await new Promise(r => setTimeout(r, i ? 1500 : 300)); MB.busy = 0; await mbPoll(true); }
  } catch (e) { return 'The relay could not be reached (' + e.message + '). Letters still go directly when you are both online.'; }
  return MB.test.ok ? 'The mailbox works: a locked test letter went to the relay and came back in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s.' : 'The test letter has not come back yet (' + (MB.err || 'no answer') + '). Try again in a minute.';
}
/* (kept so social.js can call them: friends' homesteads now travel only directly, when you are both online) */
function mbBaseDirty() {}
async function mbBaseOf(code) { const f = friend(code); return f ? f.base || null : null; }
setInterval(() => { try { if (SOC && SOC.code) mbPoll(); } catch (e) {} }, 5000);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'hidden') mbPoll(true); });
