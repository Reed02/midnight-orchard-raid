/* ===== WHO IS ONLINE, WITHOUT NEEDING A DIRECT CONNECTION =====
   Friends' games talk over a direct browser-to-browser link (social.js, PeerJS/WebRTC). That link can fail even when both games are open:
   the matchmaking server is a free community service that drops out, and on many school, work and mobile networks two browsers cannot reach
   each other at all without a TURN relay (PeerJS shut its free one down in 2024). Online status used to depend on that link, so a friend whose
   link could not be made always showed as offline.
   Now every open game also posts a tiny "I'm here" note to the mailbox relay (ntfy.sh, the one letters already use) when it starts, when what
   you are doing changes, and every PRES_EVERY; a "bye" when the page closes. Each game reads its friends' notes from the last PRES_WINDOW every
   PRES_POLL seconds, so a friend is shown online when their game is open, whatever the network. When a note shows a friend is there but there
   is no direct link yet, the game tries to link straight away.
   The note sits on a topic named by a hash of your friend code (friends know your code; strangers do not) and carries only what you are doing
   (home, raiding...), nothing else. If the relay is busy (HTTP 429), posting slows down. */
const PRES_EVERY = 4 * 60000, PRES_WINDOW = '6m', PRES_POLL = 30000, PRES = { last: 0, st: '', next: 0, polled: 0, busy: 0, ok: null, err: '', slow: 1, topics: {} };
const presTopic = async code => 'mor' + await sha('mor-pres:' + code);
const presOn = () => typeof mbOn === 'function' && mbOn() && !!SOC && !!SOC.code;
async function presPost(kind) {
  if (!presOn()) return; const st = kind === 'bye' ? 'bye' : socState(); PRES.last = Date.now(); PRES.st = st;
  try { await relayPost(await presTopic(SOC.code), JSON.stringify({ p: 1, st, v: SOCIAL_V })); PRES.slow = 1; PRES.ok = true; }
  catch (e) { PRES.err = e.message; if (e.status === 429) { PRES.busy429 = true; PRES.slow = Math.min(8, PRES.slow * 2); } }
}
async function presPoll(force) {
  if (!presOn() || PRES.busy) return; const now = Date.now(); if (!force && now - PRES.polled < PRES_POLL * PRES.slow) return;
  const fr = SOC.friends.filter(f => f.st === 'friend'); if (!fr.length) return; PRES.busy = 1; PRES.polled = now;
  try {
    const tops = []; for (const f of fr) { const t = PRES.topics[f.code] || (PRES.topics[f.code] = await presTopic(f.code)); tops.push(t); }
    const seen = {}; for (let i = 0; i < tops.length; i += 100) { const L = await relayRead(tops.slice(i, i + 100).join(','), PRES_WINDOW);      // one request for (up to 100) friends
      for (const ev of L) { let o; try { o = JSON.parse(ev.message); } catch (e) { continue; } if (!o || o.p !== 1) continue; const prev = seen[ev.topic]; if (!prev || ev.time >= prev.time) seen[ev.topic] = { time: ev.time, st: String(o.st || '').slice(0, 10), v: o.v }; } }
    let changed = 0;
    for (const f of fr) { const s = seen[PRES.topics[f.code]], on = !!s && s.st !== 'bye';
      if (on !== !!f.rOn || (s && s.st) !== f.rSt) changed = 1; f.rOn = on; f.rSt = on ? s.st : ''; f.rV = s ? s.v : 0; if (on) f.seen = Date.now();
      if (on && !socLinks[f.code] && typeof socialOnline === 'function' && socialOnline()) socConnect(f.code); }      // they are there: try the direct link now
    PRES.ok = true; PRES.err = ''; PRES.lastOk = Date.now(); PRES.slow = Math.max(1, PRES.slow / 2); if (changed && typeof refreshSocialScreen === 'function') refreshSocialScreen();
  } catch (e) { PRES.ok = false; PRES.err = e.message; PRES.busy429 = e.status === 429; if (e.status === 429) PRES.slow = Math.min(8, PRES.slow * 2);
    if (Date.now() - (PRES.lastOk || 0) > 9 * 60000) SOC.friends.forEach(f => { f.rOn = false; });   // only after a long stretch without news is everyone assumed gone (a busy relay does not make friends flicker offline)
  } finally { PRES.busy = 0; }
}
function presTick() {
  if (!presOn()) return; const now = Date.now(), st = socState();
  if (!PRES.last || now - PRES.last > PRES_EVERY * PRES.slow || (st !== PRES.st && now - PRES.last > 20000)) presPost();
  presPoll();
}
setInterval(() => { try { presTick(); } catch (e) {} }, 3000);
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => {      // closing the game: say bye, so friends see you go at once
  try { if (!presOn() || !PRES.topics.me) return; fetch(relayUrl() + '/' + PRES.topics.me, { method: 'POST', body: JSON.stringify({ p: 1, st: 'bye', v: SOCIAL_V }), keepalive: true, cache: 'no-store' }); } catch (e) {} });
(async () => { try { if (presOn()) PRES.topics.me = await presTopic(SOC.code); } catch (e) {} })();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { PRES.polled = 0; presPoll(true); } });

/* ----- online status: the direct link first, the relay note second ----- */
const ST_WORD = { home: 'at home', raiding: 'out raiding', visiting: 'visiting someone', hideout: 'in a crew hideout', menu: '' };
const _statusOfP = statusOf;
statusOf = function (f) {
  if (f.st !== 'friend') return _statusOfP(f); const L = socLinks[f.code]; if (L && L.ok) return _statusOfP(f);
  if (f.rOn) { const w = ST_WORD[f.rSt] || ''; const trying = L && L.trying;
    return 'online' + (w ? ', ' + w : '') + ((f.linkFails || 0) >= 2 && !trying ? ' · your games cannot link directly, so visiting is not possible yet: set up a Connection helper (letters still work)' : ' · connecting…'); }
  return _statusOfP(f);
};
const friendOnline = f => !!(socLinks[f.code] && socLinks[f.code].ok) || !!f.rOn;
socialBadge = function () { const req = SOC.friends.filter(f => f.st === 'in').length, on = SOC.friends.filter(f => f.st === 'friend' && friendOnline(f)).length; return req ? req + ' request' + (req > 1 ? 's' : '') : on ? on + ' online' : 'visit, write, permissions'; };
const _socialScreenP = socialScreen;
socialScreen = function (msg) { const r = _socialScreenP(msg); if (!SOC_REDRAW) presPoll(true);
  const row = $('ov') && $('ov').querySelector('.row button[onclick="testMailbox()"]'); if (row && !$('ov').querySelector('#conncheck')) row.insertAdjacentHTML('beforebegin', '<button class="mini" id="conncheck" onclick="connCheck()">Connection check</button><button class="mini" onclick="turnScreen()">Connection helper</button>');
  if (CONN.lines && Date.now() - CONN.at < 15 * 60000 && $('ov') && $('ov').dataset.screen === 'friends' && !$('ov').querySelector('#connres')) {     // the last check's results stay until closed
    const box = `<div id="connres" class="connres"><b>Connection check</b>${CONN.lines.map(l => `<div>${esc(l)}</div>`).join('')}<button class="mini" onclick="CONN.lines=null;socialScreen()">Close</button></div>`;
    const anchor = $('ov').querySelector('.flist'); if (anchor) anchor.insertAdjacentHTML('afterend', box); }
  return r; };

/* ----- Connection check (Friends screen): what works and what does not, in plain words ----- */
async function connCheck() {
  CONN.lines = ['Checking your connection (about 8 seconds)…']; CONN.at = Date.now(); socialScreen(); const out = [];
  const sn = SN().state; out.push(sn === 'on' ? '✔ Matchmaking server: connected.' : sn === 'elsewhere' ? '✖ The game is open in another tab or window: close the others, then reload this one.' : sn === 'connecting' ? '… Matchmaking server: still connecting (it can be slow; it retries by itself).' : '✖ Matchmaking server: cannot be reached right now (friends still see you online through the relay).');
  if (Date.now() - (PRES.lastOk || 0) > 60000) { try { await presPoll(true); } catch (e) {} }
  out.push(PRES.lastOk && Date.now() - PRES.lastOk < 10 * 60000 ? '✔ Relay (online status and letters): working' + (PRES.busy429 ? ', though busy at times (the free relay limits how often one network may use it, and everyone on a school network shares that), so status can be a minute or two late.' : '.') : PRES.busy429 ? '• Relay: busy right now (the free relay limits how often one network may use it; everyone on a school network shares that limit). It slows down and tries again.' : '✖ Relay: ' + (PRES.err || 'no answer yet'));
  const ice = await iceProbe(); out.push(ice.relay ? '✔ Connection helper (TURN): working, so direct links can be made on any network.' : ice.srflx ? (iceTurn().length ? '✖ Connection helper (TURN) did not answer: links work on most home wifi, but not on strict school, work or mobile networks.' : '• No connection helper (TURN) is set up: links work on most home wifi, but not on strict school, work or mobile networks.') : '✖ This network blocks direct links between browsers' + (iceTurn().length ? ', and the connection helper did not answer.' : '. A connection helper (TURN) is needed: see Settings.'));
  if (!ice.relay) out.push(...turnReport(ice)); out.push('   (this network: ' + (ice.srflx ? 'reaches the outside world for direct links' : 'no outside address found') + '; ' + ice.host + ' local, ' + ice.srflx + ' outside, ' + ice.relay + ' relayed)');
  const on = SOC.friends.filter(f => f.st === 'friend' && f.rOn), linked = on.filter(f => socLinks[f.code] && socLinks[f.code].ok);
  if (on.length) out.push(linked.length === on.length ? '✔ Linked directly with every friend who is online.' : '• ' + (on.length - linked.length) + ' friend(s) online but not linked directly yet: letters reach them; visiting needs the direct link' + (ice.relay ? ' (it should come within a minute).' : ' (a connection helper usually fixes this).'));
  CONN.lines = out; CONN.at = Date.now(); socialScreen();
}
const CONN = { lines: null, at: 0 };
function iceTurn() { const t = (CONFIG.network.turn || []).slice(); try { const s = JSON.parse(localStorage.getItem('raidTurn') || 'null'); if (s && s.urls && s.username) t.push(s); } catch (e) {} return t; }
function iceList() { return (CONFIG.network.iceServers || []).concat(iceTurn()); }
async function iceProbe() {                                           // gather candidates: srflx = STUN works, relay = TURN works; errs = what each TURN address said
  const r = { host: 0, srflx: 0, relay: 0, relayVia: {}, errs: {} }; if (typeof RTCPeerConnection === 'undefined') return r;
  const turnUrls = iceTurn().flatMap(t => [].concat(t.urls));
  try { const pc = new RTCPeerConnection({ iceServers: iceList(), iceTransportPolicy: 'all' }); pc.createDataChannel('probe');
    pc.onicecandidate = e => { const c = e.candidate; if (c && c.candidate) { const m = / typ (\w+)/.exec(c.candidate); if (m && r[m[1]] !== undefined) r[m[1]]++; if (m && m[1] === 'relay') { const via = c.url || (/ (udp|tcp) /i.exec(c.candidate) || [])[1] || 'relay'; r.relayVia[via] = 1; } } };
    pc.onicecandidateerror = e => { if (e.url && /^turns?:/.test(e.url)) r.errs[e.url] = (e.errorCode || '?') + (e.errorText ? ' ' + e.errorText : ''); };
    await pc.setLocalDescription(await pc.createOffer()); await new Promise(res => { const t0 = Date.now(), iv = setInterval(() => { if (pc.iceGatheringState === 'complete' || Date.now() - t0 > 12000) { clearInterval(iv); res(); } }, 200); }); pc.close();
  } catch (e) { r.fail = e.message; }
  r.turnUrls = turnUrls; return r;
}
function turnReport(ice) {                                            // one line per helper address: worked / wrong password / could not be reached
  if (!ice.turnUrls || !ice.turnUrls.length) return [];
  const auth = Object.values(ice.errs).some(v => /^401|^4\d\d/.test(v));
  return ice.turnUrls.map(u => { const e = ice.errs[u], via = Object.keys(ice.relayVia).find(v => v === u);
    return '   ' + u.replace(/\?transport=/, ' (') + (u.includes('transport=') ? ')' : '') + ': ' + (via ? 'worked' : !e ? (ice.relay ? 'not needed' : 'no answer (probably blocked by this network)') : /^401/.test(e) ? 'the username or password was refused' : /^70[01]/.test(e) ? 'could not be reached (blocked by this network, or the address is wrong)' : 'error ' + e); });
}
/* ----- Connection helper (TURN) settings: for networks that block direct links. Saved in this browser only. ----- */
function turnScreen(msg) {
  let t = null; try { t = JSON.parse(localStorage.getItem('raidTurn') || 'null'); } catch (e) {}
  const built = (CONFIG.network.turn || []).length;
  homeScreen(`<h1>Connection helper</h1><p class="tag" style="max-width:620px;margin:0 auto">On school, work and mobile networks two games often cannot link directly. A TURN relay passes the game's messages between you when that happens. Free ones need a free account (for example expressturn.com: sign up, then copy the TURN username and password from your dashboard).${built ? ' This game already has one built in.' : ''}</p>
  <div class="row" style="flex-direction:column;gap:6px;align-items:stretch;max-width:520px;margin:8px auto">
  <input id="turnurl" placeholder="Server, e.g. relay1.expressturn.com" value="${esc(t && t.host || '')}"><input id="turnuser" placeholder="TURN username" value="${esc(t && t.username || '')}"><input id="turnpass" placeholder="TURN password" value="${esc(t && t.credential || '')}"></div>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}<div class="row"><button onclick="turnSave()">Save</button>${t ? '<button onclick="turnSave(1)">Remove</button>' : ''}<button onclick="socialScreen()">Back</button></div>`, 'turn');
}
function turnSave(remove) {
  try { if (remove) localStorage.removeItem('raidTurn'); else { const host = ($('turnurl').value || '').trim().replace(/^turns?:/, '').replace(/:\d+.*$/, ''), username = ($('turnuser').value || '').trim(), credential = ($('turnpass').value || '').trim();
    if (!host || !username || !credential) return turnScreen('Fill in all three');
    localStorage.setItem('raidTurn', JSON.stringify({ host, username, credential, urls: ['turn:' + host + ':3478?transport=udp', 'turn:' + host + ':3478?transport=tcp', 'turns:' + host + ':443?transport=tcp'] })); } } catch (e) {}
  homeScreen(`<h1>Connection helper</h1><p class="tag">${remove ? 'Removed.' : 'Saved.'} Reload the game to use it, then try Connection check on the Friends screen.</p><div class="row"><button onclick="location.reload()">Reload now</button><button onclick="socialScreen()">Back</button></div>`, 'turn');
}
