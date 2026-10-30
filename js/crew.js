/* ===== THE CREW: up to 5 players in one room =====
   The host can take up to CONFIG.crew.maxGuests guests. With one guest every old mode works as before (raccoon vs farmer, duel, co-op).
   With more, the host starts a CREW raid:
     - Co-op crew: everyone is a raccoon, against the AI farmers and dogs (coop.js runs one slot per raccoon).
     - Crew vs farmer: one player (host or guest) is the human farmer with the flashlight and the dogs, everyone else is a raccoon.
   Bookkeeping (host): CREW.guests = [{ peer, gi, rm, cos, skin, name }] in join order; gi is a small id that never changes in this room;
   rm is that guest's latest inputs (the old single `remote` object, one per guest). CREW.slots[i] = who plays raccoon slot i ('host' = -1, or a gi).
   CREW.farmer = null (no human farmer), -1 (the host farms) or a guest's gi. The guest learns its gi from 'welcome' and the slots from 'night'. */
CONFIG.crew = {
  maxGuests: 4,
  // difficulty for n raccoons (n >= 2). AI crew: everyone is a raccoon. Hunted crew: a human farmer is hunting them.
  ai:     n => ({ quotaMul: 1 + 0.6 * (n - 1), hearts: 3 + n, extraTime: 10 + 5 * (n - 2), extraFarmers: Math.ceil((n - 1) * 0.75), extraDogs: n - 1 }),   // extra dogs arrive one per night (world.js)
  hunted: n => ({ quotaMul: 1 + 0.45 * (n - 1), hearts: 2 + n, extraTime: 5 * (n - 1), extraFarmers: 0, extraDogs: Math.floor(n / 2) }),
  colors: COOP_COL,
};
const REM0 = remote;                                         // the old single input record (kept for 1v1 games and as a harmless default)
const mkRemote = () => ({ mx: 0, my: 0, shake: false, aim: 0, t: 0, sq: 0, ack: -2 });
const CREW = { guests: [], slots: [], farmer: null, giNext: 0, gi: -1, info: [], fskin: null };
const crewGuest = peer => CREW.guests.find(G => G.peer === peer);
const crewGuestGi = gi => CREW.guests.find(G => G.gi === gi);
const crewSize = () => 1 + CREW.guests.length;
const crewN = () => Math.max(1, CREW.slots.length || RS.length);            // raccoons in this raid
const crewHunted = () => COOP && CREW.farmer !== null;                     // a human farmer is hunting the crew
function crewReset() { CREW.guests = []; CREW.slots = []; CREW.farmer = null; CREW.giNext = 0; CREW.gi = -1; CREW.info = []; CREW.fskin = null; remote = REM0; }
function crewTune() { const n = crewN(); return crewHunted() ? CONFIG.crew.hunted(n) : CONFIG.crew.ai(Math.max(2, n)); }
function crewPlan(farmerWho) {                              // host: decide the slots for the next raid
  CREW.farmer = farmerWho; CREW.slots = [];
  if (farmerWho !== -1) CREW.slots.push(-1);
  CREW.guests.forEach(G => { if (G.gi !== farmerWho) CREW.slots.push(G.gi); });
  mySlot = CREW.slots.indexOf(-1); myRole = mySlot < 0 ? 'farmer' : 'raccoon';
}
function crewSlotInfo() {                                   // host: each slot's look, for everyone's screen
  return CREW.slots.map(gi => { const G = gi === -1 ? null : crewGuestGi(gi); return G ? [G.cos, G.skin, G.name, G.gear] : [myCos(), HOME.skins, typeof myName === 'function' ? myName() : 'Host', HOME.gear.on]; });
}
function crewFarmerSkin() { if (CREW.farmer === null) return null; if (CREW.farmer === -1) return HOME.skins; const G = crewGuestGi(CREW.farmer); return G ? G.skin : null; }
function crewFarmerRm() { if (CREW.farmer === null || CREW.farmer === -1) return REM0; const G = crewGuestGi(CREW.farmer); return G ? G.rm : REM0; }
function crewStart(farmerWho) {                             // host: start a crew raid. farmerWho: null = everyone is a raccoon, -1 = the host farms, gi = that guest farms
  if (multi && !isHost) return; if (!net.hosting || !CREW.guests.length) return;
  if (farmerWho !== null && farmerWho !== -1 && !crewGuestGi(farmerWho)) farmerWho = null;
  COOP = true; series = null; duelHud = 0; crewPlan(farmerWho); CREW.info = crewSlotInfo(); net.hosting.role = myRole; newRun();
}
function crewStartPick() { const v = ($('crewF') || {}).value; crewStart(v === 'none' || v === undefined ? null : +v); }
function crewName(i) { const inf = CREW.info[i]; return inf && inf[2] ? String(inf[2]).slice(0, 16) : 'Raccoon ' + (i + 1); }
/* ----- footprints for every raccoon (the farmer's view) ----- */
function crewTracks(dt) {
  if (!COOP || viewRole() !== 'farmer') return; const keepT = trackT, keepH = trackWasHidden;
  RS.forEach((R, i) => { if (R.gone) return; trackT = R.trackT || 0; trackWasHidden = !!R.trackH; withSlot(i, () => addTracks(dt)); R.trackT = trackT; R.trackH = trackWasHidden; });
  trackT = keepT; trackWasHidden = keepH;
}
/* ----- a player left in the middle of a crew raid ----- */
function crewDrop(peer) {                                   // host: returns true when the raid can carry on without them
  const G = crewGuest(peer); if (!G) return false;
  CREW.guests = CREW.guests.filter(x => x !== G); net.guestPeer = CREW.guests[0] ? CREW.guests[0].peer : null;
  if (!CREW.guests.length) return false;
  if (state === 'lobby') { hostLobby(); return true; }
  if (COOP) {
    const s = CREW.slots.indexOf(G.gi); if (s >= 0 && RS[s]) { RS[s].gone = true; RS[s].down = 0; withSlot(s, () => { carry.forEach(v => spawnApple(P.x + rnd(-30, 30), P.y + rnd(-20, 20), v > 1, 0, 'tree')); carry = []; P.tree = null; }); }
    if (CREW.farmer === G.gi) { CREW.farmer = null; farmers.forEach(f => { if (f.human) { f.human = false; f.wp = f.wp || []; if (!f.wp.length) newPatrol(f, false); f.i = 0; } }); }
    pop(P.x, P.y - 90, (G.name || 'A friend') + ' left', '#cfd8e6', true);
  }
  if (pend && state === 'upgrade') { if (CREW.farmer === null) pend.farmer = false; if (!pend.raccoon && !pend.farmer) { night++; startNight(); } }
  return true;
}
/* ----- lobby ----- */
function crewLobbyHtml() {                                  // the part of the host lobby that lists the players and offers crew modes
  const names = ['You (host)', ...CREW.guests.map(G => G.name || 'Friend')];
  let h = `<div class="card" style="width:100%;text-align:center"><b>Players ${crewSize()}/${CONFIG.crew.maxGuests + 1}</b>${names.map((n, i) => `<span style="color:${CONFIG.crew.colors[i % 5]}">${esc(n)}</span>`).join(' &middot; ')}</div>`;
  if (CREW.guests.length >= 2) {
    const opts = [`<option value="-1">You (host)</option>`, ...CREW.guests.map(G => `<option value="${G.gi}">${esc(G.name || 'Friend')}</option>`)].join('');
    h += `<div class="row"><button class="up" onclick="crewStart(null)"><b>Co-op crew</b>${crewSize()} raccoons vs the AI</button>
      <span class="lbl">Farmer:</span><select id="crewF">${opts}</select><button class="up" onclick="crewStartPick()"><b>Crew vs farmer</b>${crewSize() - 1} raccoons vs 1 farmer</button></div>`;
  }
  return h;
}
const crewFarmerEvent = (role, fn) => fn();
function toLobby() {                                        // host: back to the lobby to pick another mode (everyone stays connected)
  if (multi && !isHost) return sendEv({ f: 'toLobby', a: [] }); if (!net.hosting) return;
  payPartial(); refundKeep(); series = null; duelHud = 0; COOP = false; RS = []; CREW.farmer = null; myRole = net.hosting.role === 'farmer' && !CREW.guests.length ? 'farmer' : net.hosting.role;
  state = 'lobby'; hostLobby(); if (net.r && CREW.guests.length) { net.scr = { id: ++net.scrId, sp: { k: 'wait', h: 'Back in the lobby', t: 'The host is choosing the next game...' } }; nsend('scr', net.scr); }
}
