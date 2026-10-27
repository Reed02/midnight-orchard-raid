/* ===== MULTIPLAYER: two players, one raccoon and one farmer =====
   Needs the published page. The platform's "room" capability relays small messages between everyone who has the page
   open, so players on different networks can join with a 4-letter code. The HOST runs the whole game; the GUEST sends
   its inputs and draws the snapshots the host sends back. The farmer sees only black except inside the flashlight. */
const net = { room: null, r: null, code: '', hosting: null, guestPeer: null, hostPeer: null, myPeer: null, unsubs: [], timer: 0, helloTimer: 0, helloTries: 0,
              sid: 0, sidSeen: -1, epoch: -1, inpSq: 0, snapSq: 0, lastSq: -1, rtt: 0, lastSig: '', scrId: 0, scrSeen: -1, evId: 0, seen: new Set(), sentAt: 0, inpAt: 0, inGame: false, loopId: 0, scr: null, lastNight: null, tick: 0, lastSnapAt: 0 };
let epoch = 0, pdashT = 0;                                // epoch counts host-side position changes (teleports, climbing...) so the guest knows to snap
const bumpEpoch = () => { epoch++; if (COOP && RS[cur]) RS[cur].ep = epoch; };
const NET_VERSION = 15;                                    // bump when the two players' messages change, so a stale cached copy of the page is detected
const otherRole = r => r === 'raccoon' ? 'farmer' : 'raccoon';
const viewRole = () => multi ? myRole : 'raccoon';
const myFarmer = () => farmers.find(f => f.human);
const myEntity = () => (multi && myRole === 'farmer') ? (myFarmer() || P) : P;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const num = v => +v || 0;
function nsend(topic, data) { try { if (net.r) Promise.resolve(net.r.emit(topic, data)).catch(() => {}); } catch (e) {} }
async function netInit() { net.room = typeof Peer !== 'undefined' ? { peerjs: true } : null; }

/* ----- PeerJS room adapter (replaces the Claude-hosted room service) -----
   GitHub Pages hosts this file; PeerJS's signaling server helps the two browsers
   establish a direct WebRTC data connection. The host still simulates the game. */
/* The FAST LANE. PeerJS's data channel is reliable: when a packet is lost on the way, everything sent after it waits until it has been re-sent
   (a ping spike of a few hundred ms on wifi or a phone). Snapshots, inputs and positions are replaced 20-30 times a second anyway, so they go
   on a second channel that never re-sends (ordered: false, maxRetransmits: 0): a lost one is simply skipped and the next one is fresh.
   Both sides open it with the same fixed id (negotiated), so no extra handshake. Until the other side's first fast message arrives (an older
   copy of the game has no lane) fast messages also go on the reliable channel; the receivers drop duplicates by sequence number. */
const FAST_ID = 77;
function fastLane(conn, onData) {
  const L = { ch: null, heard: false };
  try {
    const pc = conn.peerConnection; if (!pc || !pc.createDataChannel) return L;
    const ch = pc.createDataChannel('fast', { negotiated: true, id: FAST_ID, ordered: false, maxRetransmits: 0 });
    ch.onmessage = ev => { let m = null; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m && typeof m === 'object') { L.heard = true; onData(m); } };
    L.ch = ch;
  } catch (e) { L.ch = null; }
  return L;
}
function fastSend(L, packet) {                                // true when the packet went out on the fast lane and the reliable copy can be skipped
  if (!L || !L.ch || L.ch.readyState !== 'open') return false;
  try { if (L.ch.bufferedAmount > 64 * 1024) return L.heard; L.ch.send(JSON.stringify(packet)); return L.heard; } catch (e) { return false; }      // a full buffer means the link is choked: drop this one rather than queue it
}
const isFast = topic => (CONFIG.network.fastTopics || []).includes(topic);
async function peerRoomJoin(code, hosting) {
  if (typeof Peer === 'undefined') throw netError('lib', 'The multiplayer library did not load.');
  const N = CONFIG.network, hostId = 'midnightorchard-' + code;
  const opts = Object.assign({ debug: 1 }, N.peerServer || {}); if (N.iceServers) opts.config = { iceServers: N.iceServers };
  const peer = hosting ? new Peer(hostId, opts) : new Peer(opts);
  const listeners = new Map();
  const peerListeners = new Set();
  const connections = new Map();
  const pending = [];
  let closed = false;
  let selfId = '';
  const dispatch = (topic, data, peerId, isMe=false) => {
    for (const fn of listeners.get(topic) || []) {
      try { fn({ data, peer: peerId, isMe, sameTab: isMe }); } catch (e) { console.error(e); }
    }
  };
  const announceLeft = id => {
    connections.delete(id);
    for (const fn of peerListeners) { try { fn({ left: [{ peer: id }] }); } catch (e) {} }
  };
  const lanes = new Map();
  const attach = conn => {
    connections.set(conn.peer, conn);
    const lane = () => { if (!lanes.has(conn.peer)) lanes.set(conn.peer, fastLane(conn, packet => { if (typeof packet.topic === 'string') dispatch(packet.topic, packet.data || {}, conn.peer, false); })); };
    if (conn.open) lane();
    conn.on('data', packet => {
      if (!packet || typeof packet.topic !== 'string') return;
      dispatch(packet.topic, packet.data || {}, conn.peer, false);
    });
    conn.on('close', () => { lanes.delete(conn.peer); announceLeft(conn.peer); });
    conn.on('error', () => {});
    conn.on('open', () => { lane(); while (pending.length) { const packet = pending.shift(); try { conn.send(packet); } catch(e) {} } });
  };
  // Keep the room reachable: if the browser drops our link to the matchmaking server (a phone switching apps, a sleeping screen, a flaky network), reconnect with the same id.
  const keepAlive = () => { if (closed || peer.destroyed) return; if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} } };
  peer.on('disconnected', () => { setTimeout(keepAlive, 500); });
  const watchdog = setInterval(keepAlive, 4000);
  document.addEventListener('visibilitychange', keepAlive);
  const waitOpen = () => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { peer.off('error', onErr); reject(netError('timeout', 'The matchmaking server did not answer.')); }, 15000);
    const onErr = err => { clearTimeout(timeout); reject(err); };
    peer.once('open', id => { clearTimeout(timeout); peer.off('error', onErr); selfId = id; resolve(id); });
    peer.once('error', onErr);
  });
  // One attempt to reach the host. PeerJS reports "no such room" on the peer (not the connection), so listen for it here and fail fast.
  const tryConnect = () => new Promise((resolve, reject) => {
    const conn = peer.connect(hostId, { reliable: false, serialization: 'json' });
    const done = fn => arg => { clearTimeout(timer); peer.off('error', onPeerErr); fn(arg); };
    const timer = setTimeout(() => { peer.off('error', onPeerErr); try { conn.close(); } catch (e) {} reject(netError('timeout', 'The host did not answer.')); }, N.attemptMs);
    const onPeerErr = err => { if (err && err.type === 'peer-unavailable') { clearTimeout(timer); peer.off('error', onPeerErr); try { conn.close(); } catch (e) {} reject(err); } };
    peer.on('error', onPeerErr);
    conn.on('open', done(() => resolve(conn))); conn.on('error', done(reject));
  });
  try {
    await waitOpen();
    if (hosting) {
      peer.on('connection', attach);
    } else {
      let conn = null, lastErr = null;                        // the host may still be registering (or just reconnecting), so try a few times
      for (let i = 1; i <= N.attempts && !closed; i++) {
        if (net.progress) net.progress(i, N.attempts);
        try { conn = await tryConnect(); break; } catch (e) { lastErr = e; if (i < N.attempts) await new Promise(r => setTimeout(r, N.retryGapMs)); }
      }
      if (!conn) throw lastErr || netError('timeout', 'Could not reach the host.');
      attach(conn);
    }
  } catch (e) {
    clearInterval(watchdog); document.removeEventListener('visibilitychange', keepAlive);
    try { peer.destroy(); } catch (_) {}
    throw e;
  }
  return {
    online() { return !closed && !peer.destroyed && !peer.disconnected; },
    emit(topic, data) {
      if (closed) return Promise.reject(new Error('Room closed'));
      // The existing game uses a local hello echo to learn this browser's peer ID.
      dispatch(topic, data, selfId, true);
      const packet = { topic, data };
      let sent = false;
      const fast = isFast(topic);
      for (const conn of connections.values()) {
        if (conn.open) { if (fast && fastSend(lanes.get(conn.peer), packet)) { sent = true; continue; } try { conn.send(packet); sent = true; } catch(e) {} }
      }
      if (!sent && !hosting) pending.push(packet);
      return Promise.resolve();
    },
    on(topic, fn) {
      if (!listeners.has(topic)) listeners.set(topic, new Set());
      listeners.get(topic).add(fn);
      return () => listeners.get(topic)?.delete(fn);
    },
    onPeers(fn) { peerListeners.add(fn); return () => peerListeners.delete(fn); },
    leave() {
      closed = true; pending.length = 0; clearInterval(watchdog); document.removeEventListener('visibilitychange', keepAlive);
      for (const conn of connections.values()) { try { conn.close(); } catch(e) {} }
      connections.clear(); lanes.clear();
      try { peer.destroy(); } catch(e) {}
      return Promise.resolve();
    }
  };
}

