/* ===== MULTIPLAYER: two players, one raccoon and one farmer =====
   Needs the published page. The platform's "room" capability relays small messages between everyone who has the page
   open, so players on different networks can join with a 4-letter code. The HOST runs the whole game; the GUEST sends
   its inputs and draws the snapshots the host sends back. The farmer sees only black except inside the flashlight. */
const net = { room: null, r: null, code: '', hosting: null, guestPeer: null, hostPeer: null, myPeer: null, unsubs: [], timer: 0, helloTimer: 0, helloTries: 0,
              sid: 0, sidSeen: -1, epoch: -1, inpSq: 0, snapSq: 0, lastSq: -1, rtt: 0, lastSig: '', scrId: 0, scrSeen: -1, evId: 0, seen: new Set(), sentAt: 0, inpAt: 0, inGame: false, loopId: 0, scr: null, lastNight: null, tick: 0, lastSnapAt: 0 };
let epoch = 0, pdashT = 0;                                // epoch counts host-side position changes (teleports, climbing...) so the guest knows to snap
const bumpEpoch = () => { epoch++; };
const NET_VERSION = 14;                                    // bump when the two players' messages change, so a stale cached copy of the page is detected
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
  const attach = conn => {
    connections.set(conn.peer, conn);
    conn.on('data', packet => {
      if (!packet || typeof packet.topic !== 'string') return;
      dispatch(packet.topic, packet.data || {}, conn.peer, false);
    });
    conn.on('close', () => announceLeft(conn.peer));
    conn.on('error', () => {});
    conn.on('open', () => { while (pending.length) { const packet = pending.shift(); try { conn.send(packet); } catch(e) {} } });
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
      for (const conn of connections.values()) {
        if (conn.open) { try { conn.send(packet); sent = true; } catch(e) {} }
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
      connections.clear();
      try { peer.destroy(); } catch(e) {}
      return Promise.resolve();
    }
  };
}

