/* ===== CHALLENGES AND RESULTS =====
   Each night gives each player a role-specific goal. Stats are counted during the night (stat(...)), tested when it ends, and shown on the
   results panel. Completed challenges become badges (saved in this browser). Add a challenge by adding one entry: test gets the night's stats. */
const CHALLENGES = {
  raccoon: [
    { id: 'ghost',  name: 'Ghost Raid',    desc: 'Be in the light for 2 seconds or less all night.', test: s => s.litTime <= 2, prog: s => s.litTime.toFixed(1) + 's lit (max 2)', live: s => s.litTime <= 2 ? 'ok' : 'bad' },
    { id: 'gold',   name: 'Golden Heist',  desc: 'Bank at least one golden apple.',                  test: s => s.goldBanked >= 1, prog: s => Math.min(1, s.goldBanked) + '/1' },
    { id: 'bush',   name: 'Bush Hopper',   desc: 'Spend 15 seconds hiding in bushes.',               test: s => s.bushTime >= 15, prog: s => Math.min(15, Math.round(s.bushTime)) + '/15s' },
    { id: 'shaker', name: 'Tree Shaker',   desc: 'Shake 4 trees.',                                   test: s => s.shakes >= 4, prog: s => Math.min(4, s.shakes) + '/4' },
    { id: 'quick',  name: 'Quick Raid',    desc: 'Finish the night with 25 seconds to spare.',       test: s => s.timeLeft >= 25, prog: s => Math.max(0, Math.round(time)) + 's left (need 25)', live: s => time >= 25 ? 'ok' : 'bad' },
    { id: 'cross',  name: 'Bridge Runner', desc: 'Cross the river 4 times.',                          test: s => s.crossings >= 4, prog: s => Math.min(4, s.crossings) + '/4', river: true },
    { id: 'bonk',   name: 'Dog Bonk',      desc: 'Stun a dog with a cannonball.',                    test: s => s.stuns >= 1, prog: s => Math.min(1, s.stuns) + '/1', dogs: true },
  ],
  farmer: [
    { id: 'gotcha', name: 'Gotcha',          desc: 'Catch the raccoon at least once.',                      test: s => s.catches >= 1, prog: s => Math.min(1, s.catches) + '/1' },
    { id: 'block',  name: 'Roadblock',       desc: 'Keep the raccoon from depositing for 40 seconds.',      test: s => s.firstDeposit === null || s.firstDeposit >= 40, prog: s => s.firstDeposit === null ? Math.min(40, Math.round(nightTime - time)) + 's of 40' : 'it banked', live: s => s.firstDeposit !== null && s.firstDeposit < 40 ? 'bad' : 'ok' },
    { id: 'inspect',name: 'Bush Inspector',  desc: 'Find the raccoon hiding in a bush.',                    test: s => s.bushFinds >= 1, prog: s => Math.min(1, s.bushFinds) + '/1' },
    { id: 'spot',   name: 'Spotlight',       desc: 'Keep the raccoon in the light for 6 seconds in total.', test: s => s.litTime >= 6, prog: s => Math.min(6, s.litTime).toFixed(1) + '/6s' },
    { id: 'bwatch', name: 'Bridge Watch',    desc: 'Spot the raccoon while it is on a bridge.',             test: s => s.bridgeSpots >= 1, prog: s => Math.min(1, s.bridgeSpots) + '/1', river: true },
    { id: 'pack',   name: 'Pack Hunter',     desc: 'Catch the raccoon while a dog is chasing it.',          test: s => s.dogCatches >= 1, prog: s => Math.min(1, s.dogCatches) + '/1', dogs: true },
  ],
};
let ST = {}, CH = { raccoon: null, farmer: null }, nightTime = 60;
const chDef = (role, id) => (CHALLENGES[role] || []).find(c => c.id === id);
function statsReset() { ST = { litTime: 0, bushTime: 0, shakes: 0, stuns: 0, goldBanked: 0, catches: 0, dogCatches: 0, bushFinds: 0, firstDeposit: null, timeLeft: 0, found: 0, crossings: 0, bridgeSpots: 0, side: 0, peak: 0, haul: 0, chased: 0, dashes: 0, items: 0, whistles: 0, orders: 0, rec: {} }; }
statsReset();
function stat(k, n = 1) { ST[k] = (ST[k] || 0) + n; }
function statsUpdate(dt) { const av = COOP ? Math.max(alertV, ...others().map(R => R.alertV || 0)) : alertV; ST.peak = Math.max(ST.peak || 0, av); if (av > 0.06) ST.litTime += dt; if (!P.tree && hiddenBush()) ST.bushTime += dt;
  if (RIVER) { const s = riverSide(P.x, P.y); if (s) { if (ST.side && s !== ST.side) stat('crossings'); ST.side = s; } } }       // each trip over a bridge counts
function rollChallenges() {                                 // host: pick tonight's goals (only for roles that are playing; dog goals need dogs)
  const dogsTonight = CONFIG.night(night).dogs > 0, r = () => daily ? daily.r() : Math.random();
  const pick = L => { const ok = L.filter(c => (!c.dogs || dogsTonight) && (!c.river || RIVER)); return ok[Math.floor(r() * ok.length)].id; };
  CH = { raccoon: pick(CHALLENGES.raccoon), farmer: pvp() ? pick(CHALLENGES.farmer) : null };
}
function evalChallenge(role) { const c = CH[role] && chDef(role, CH[role]); return c ? { id: c.id, name: c.name, desc: c.desc, done: !!c.test(ST) } : null; }
function records() { try { return JSON.parse(localStorage.getItem('raidRecords')) || { done: {} }; } catch (e) { return { done: {} }; } }
function recordChallenge(id) { try { const r = records(); r.done[id] = (r.done[id] || 0) + 1; localStorage.setItem('raidRecords', JSON.stringify(r)); } catch (e) {} }
const totalBadges = () => Object.values(records().done).reduce((a, b) => a + b, 0);
/* ----- awards: a few light-hearted lines about how the night went (both players see their own) ----- */
function awardsFor(role) {
  const f1 = v => (+v).toFixed(1), s = ST, out = [], add = (c, txt) => { if (c) out.push(txt); };
  if (role === 'raccoon') {
    add(s.peak >= 0.5 && s.peak < 1, 'Close shave: ' + Math.round(s.peak * 100) + '% spotted'); add(s.litTime <= 1.5 && s.shakes + s.haul > 0, 'Ghost: ' + f1(s.litTime) + 's in the light');
    add(s.bushTime >= 10, 'Bush gremlin: ' + f1(s.bushTime) + 's hiding'); add(S && s.haul >= S.carry, 'Full cheeks: ' + s.haul + ' at once'); add(s.chased >= 6, 'Dog magnet: chased ' + f1(s.chased) + 's');
    add(s.dashes >= 5, 'Speed demon: ' + s.dashes + ' dashes'); add(s.shakes >= 5, 'Tree hugger: ' + s.shakes + ' shakes'); add(s.crossings >= 3, 'Bridge troll: ' + s.crossings + ' crossings');
    add(s.firstDeposit !== null && s.firstDeposit <= 18, 'Fast hands: first bank at ' + f1(s.firstDeposit) + 's'); add(s.stuns >= 2, 'Dog botherer: ' + s.stuns + ' bonks'); add((s.chainMax || 0) >= 4, 'Combo king: x' + s.chainMax + ' chain'); add(s.items > 0, 'Well prepared: used a find');
    if (!out.length) out.push('Steady night: nothing to brag about');
  } else {
    add(s.litTime >= 6, 'Beam boss: raccoon lit ' + f1(s.litTime) + 's'); add(s.catches >= 2, 'Catcher: ' + s.catches + ' catches'); add(s.bushFinds >= 1, 'Bush detective: ' + s.bushFinds + ' found');
    add(s.whistles + s.orders >= 4, 'Dog whisperer: ' + (s.whistles + s.orders) + ' calls'); add(s.firstDeposit === null || s.firstDeposit >= 40, 'Roadblock: raccoon stalled'); add(s.dogCatches >= 1, 'Pack hunter: dog assist'); add(s.items > 0, 'Well prepared: used a find');
    if (!out.length) out.push('Long watch: the raccoon slipped by');
  }
  return out.slice(0, 3);
}
function resultsSpec(role, final) {                         // what the results panel shows this player after a night / raid
  const c = evalChallenge(role), f1 = v => (+v).toFixed(1);
  const lines = role === 'raccoon' ? [`Banked ${banked}/${quota}`, `In the light ${f1(ST.litTime)}s`, `Trees shaken ${ST.shakes}`, `Dogs stunned ${ST.stuns}`] : [`Catches ${ST.catches}`, `Raccoon lit ${f1(ST.litTime)}s`, `Bush searches ${ST.bushFinds}`];
  if (ST.found) lines.push('Discoveries ' + ST.found); if (ST.flawless) lines.push('Flawless night +50');
  if (c && c.done && !ST.rec[role] && (!multi || role === myRole)) { ST.rec[role] = 1; recordChallenge(c.id); const fd = grantFind(role, 'badge', !final); if (fd) lines.push('Found: ' + fd.name); }     // each machine records its own player's badge (the guest's arrives with its results screen)
  return { mod: MOD.name, lines, aw: awardsFor(role), ch: c ? [c.name, c.desc, c.done ? 1 : 0, c.id] : null, badges: totalBadges() };
}
function cleanRes(r) {                                      // the guest rebuilds results from plain data (never raw HTML)
  if (!r || typeof r !== 'object') return null;
  return { mod: String(r.mod || '').slice(0, 40), lines: (Array.isArray(r.lines) ? r.lines : []).slice(0, 7).map(x => String(x).slice(0, 40)), badges: +r.badges || 0, aw: (Array.isArray(r.aw) ? r.aw : []).slice(0, 3).map(x => String(x).slice(0, 50)),
           ch: Array.isArray(r.ch) ? [String(r.ch[0]).slice(0, 40), String(r.ch[1]).slice(0, 90), r.ch[2] ? 1 : 0, String(r.ch[3] || '').replace(/[^a-z]/g, '').slice(0, 12)] : null };
}
const resHtml = r => !r ? '' : `<div class="card" style="width:100%;text-align:center"><b>${esc(r.mod)}</b>${r.lines.map((x, i) => `<span class="rl" style="animation-delay:${0.15 * i}s">${esc(x)}</span>`).join(' &middot; ')}${r.ch ? `<br>${r.ch[2] ? '&#10003;' : '&#10007;'} <strong>${esc(r.ch[0])}</strong>: ${esc(r.ch[1])}` : ''}${r.aw && r.aw.length ? `<br><span style="color:#ffd23f">&#9733; ${r.aw.map(esc).join(' &nbsp;&#9733; ')}</span>` : ''}${r.badges ? `<br>Badges earned: ${r.badges}` : ''}</div>`;
function endSpecs(base) {                                   // end-of-raid screens: each player gets their own results panel
  const mk = role => { const res = resultsSpec(role, true), ap = appleReward(role, base.win); if (ap) res.lines.push('Apples +' + ap); return Object.assign({}, base, { res, ap, mt: role === 'raccoon' ? Object.assign({}, runMats) : null }, multi && series ? { sr: duelSpec(role === myRole), win: false } : {}); };     // in a duel: a duel card instead of keep-raiding
  return !multi ? [mk('raccoon'), null] : COOP ? [mk(myRole), mk('raccoon'), crewHunted() ? mk('farmer') : null] : myRole === 'raccoon' ? [mk('raccoon'), mk('farmer')] : [mk('farmer'), mk('raccoon')];
}
