/* ===== DISCOVERIES =====
   A small collection of rare finds. The strange light (the "Something Strange" night) gives one; each has a one-night effect and
   becomes a permanent entry in the player's Collection (saved in this browser). Add a discovery by adding an entry here. */
const DISCOVERIES = [
  { id: 'silver',  name: 'Silver Apple',      desc: 'A pale apple that hums. Worth 10 when you bank it.',          fx: () => { carry.push(10); } },
  { id: 'crow',    name: "Crow's Coin",       desc: 'A crow trades you some extra time: +15 seconds tonight.',     fx: () => { time += 15; } },
  { id: 'moth',    name: 'Moth Lantern',      desc: 'Moths gather at the trees: every shake gives +2 apples tonight.', fx: () => { mothNight = true; } },
  { id: 'scare',   name: "Scarecrow's Charm", desc: 'The dogs ignore you for 15 seconds.',                         fx: () => { ignoreDogs = t + 15; } },
  { id: 'compass', name: 'Moon Compass',      desc: 'Shows where every farmer and dog is for 12 seconds.',         fx: () => { compassUntil = t + 12; } },
];
const found = () => { try { return JSON.parse(localStorage.getItem('raidFound')) || []; } catch (e) { return []; } };
function recordDiscovery(id) { try { const f = found(); if (!f.includes(id)) { f.push(id); localStorage.setItem('raidFound', JSON.stringify(f)); return true; } } catch (e) {} return false; }
function discover() {                                       // host: someone finished investigating the strange light
  const have = found(), fresh = DISCOVERIES.filter(d => !have.includes(d.id)), pool = (myRole === 'raccoon' && fresh.length) ? fresh : DISCOVERIES, d = pool[Math.floor(Math.random() * pool.length)];
  d.fx(); stat('found'); pop(strange.x, strange.y - 40, 'Found: ' + d.name, '#d6a6ff', true);
  if (myRole === 'raccoon' || !multi) recordDiscovery(d.id); if (multi) nsend('disc', { id: d.id });
}
function onDisc(d, m) { if (net.hosting || m.peer !== net.hostPeer) return; if (myRole === 'raccoon' && DISCOVERIES.some(x => x.id === d.id)) recordDiscovery(String(d.id)); }   // guest raccoon keeps its own collection
function collection() {
  const have = found(), cards = DISCOVERIES.map(d => have.includes(d.id) ? `<div class="card"><b>${esc(d.name)}</b>${esc(d.desc)}</div>` : `<div class="card" style="opacity:.55"><b>???</b>Not found yet. Look for strange lights.</div>`).join('');
  show(`<h1>Collection</h1><p class="tag">${have.length} of ${DISCOVERIES.length} found. Badges earned: ${totalBadges()}.</p><div class="cards">${cards}</div><div class="row"><button onclick="goBack()">Back</button></div>`, 'collection');
}
