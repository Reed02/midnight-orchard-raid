/* ===== CHALLENGES AND RESULTS =====
   Each night gives each player a role-specific goal. Stats are counted during the night (stat(...)), tested when it ends, and shown on the
   results panel. Completed challenges become badges (saved in this browser). Add a challenge by adding one entry: test gets the night's stats. */
const CHALLENGES = {
  raccoon: [
    { id: 'ghost',  name: 'Ghost Raid',    desc: 'Be in the light for 2 seconds or less all night.', test: s => s.litTime <= 2 },
    { id: 'gold',   name: 'Golden Heist',  desc: 'Bank at least one golden apple.',                  test: s => s.goldBanked >= 1 },
    { id: 'bush',   name: 'Bush Hopper',   desc: 'Spend 15 seconds hiding in bushes.',               test: s => s.bushTime >= 15 },
    { id: 'shaker', name: 'Tree Shaker',   desc: 'Shake 4 trees.',                                   test: s => s.shakes >= 4 },
    { id: 'quick',  name: 'Quick Raid',    desc: 'Finish the night with 25 seconds to spare.',       test: s => s.timeLeft >= 25 },
    { id: 'cross',  name: 'Bridge Runner', desc: 'Cross the river 4 times.',                          test: s => s.crossings >= 4, river: true },
    { id: 'bonk',   name: 'Dog Bonk',      desc: 'Stun a dog with a cannonball.',                    test: s => s.stuns >= 1, dogs: true },
  ],
  farmer: [
    { id: 'gotcha', name: 'Gotcha',          desc: 'Catch the raccoon at least once.',                      test: s => s.catches >= 1 },
    { id: 'block',  name: 'Roadblock',       desc: 'Keep the raccoon from depositing for 40 seconds.',      test: s => s.firstDeposit === null || s.firstDeposit >= 40 },
    { id: 'inspect',name: 'Bush Inspector',  desc: 'Find the raccoon hiding in a bush.',                    test: s => s.bushFinds >= 1 },
    { id: 'spot',   name: 'Spotlight',       desc: 'Keep the raccoon in the light for 6 seconds in total.', test: s => s.litTime >= 6 },
    { id: 'bwatch', name: 'Bridge Watch',    desc: 'Spot the raccoon while it is on a bridge.',             test: s => s.bridgeSpots >= 1, river: true },
    { id: 'pack',   name: 'Pack Hunter',     desc: 'Catch the raccoon while a dog is chasing it.',          test: s => s.dogCatches >= 1, dogs: true },
  ],
};
let ST = {}, CH = { raccoon: null, farmer: null }, nightTime = 60;
const chDef = (role, id) => (CHALLENGES[role] || []).find(c => c.id === id);
function statsReset() { ST = { litTime: 0, bushTime: 0, shakes: 0, stuns: 0, goldBanked: 0, catches: 0, dogCatches: 0, bushFinds: 0, firstDeposit: null, timeLeft: 0, found: 0, crossings: 0, bridgeSpots: 0, side: 0, rec: {} }; }
statsReset();
function stat(k, n = 1) { ST[k] = (ST[k] || 0) + n; }
function statsUpdate(dt) { if (alertV > 0.06) ST.litTime += dt; if (!P.tree && hiddenBush()) ST.bushTime += dt;
  if (RIVER) { const s = riverSide(P.x, P.y); if (s) { if (ST.side && s !== ST.side) stat('crossings'); ST.side = s; } } }       // each trip over a bridge counts
function rollChallenges() {                                 // host: pick tonight's goals (only for roles that are playing; dog goals need dogs)
  const dogsTonight = CONFIG.night(night).dogs > 0, r = () => daily ? daily.r() : Math.random();
  const pick = L => { const ok = L.filter(c => (!c.dogs || dogsTonight) && (!c.river || RIVER)); return ok[Math.floor(r() * ok.length)].id; };
  CH = { raccoon: pick(CHALLENGES.raccoon), farmer: multi ? pick(CHALLENGES.farmer) : null };
}
function evalChallenge(role) { const c = CH[role] && chDef(role, CH[role]); return c ? { id: c.id, name: c.name, desc: c.desc, done: !!c.test(ST) } : null; }
function records() { try { return JSON.parse(localStorage.getItem('raidRecords')) || { done: {} }; } catch (e) { return { done: {} }; } }
function recordChallenge(id) { try { const r = records(); r.done[id] = (r.done[id] || 0) + 1; localStorage.setItem('raidRecords', JSON.stringify(r)); } catch (e) {} }
const totalBadges = () => Object.values(records().done).reduce((a, b) => a + b, 0);
function resultsSpec(role) {                                // what the results panel shows this player after a night / raid
  const c = evalChallenge(role), f1 = v => (+v).toFixed(1);
  const lines = role === 'raccoon' ? [`Banked ${banked}/${quota}`, `In the light ${f1(ST.litTime)}s`, `Trees shaken ${ST.shakes}`, `Dogs stunned ${ST.stuns}`] : [`Catches ${ST.catches}`, `Raccoon lit ${f1(ST.litTime)}s`, `Bush searches ${ST.bushFinds}`];
  if (ST.found) lines.push('Discoveries ' + ST.found);
  if (c && c.done && !ST.rec[role]) { ST.rec[role] = 1; recordChallenge(c.id); }
  return { mod: MOD.name, lines, ch: c ? [c.name, c.desc, c.done ? 1 : 0] : null, badges: totalBadges() };
}
function cleanRes(r) {                                      // the guest rebuilds results from plain data (never raw HTML)
  if (!r || typeof r !== 'object') return null;
  return { mod: String(r.mod || '').slice(0, 40), lines: (Array.isArray(r.lines) ? r.lines : []).slice(0, 6).map(x => String(x).slice(0, 40)), badges: +r.badges || 0,
           ch: Array.isArray(r.ch) ? [String(r.ch[0]).slice(0, 40), String(r.ch[1]).slice(0, 90), r.ch[2] ? 1 : 0] : null };
}
const resHtml = r => !r ? '' : `<div class="card" style="width:100%;text-align:center"><b>${esc(r.mod)}</b>${r.lines.map(esc).join(' &middot; ')}${r.ch ? `<br>${r.ch[2] ? '&#10003;' : '&#10007;'} <strong>${esc(r.ch[0])}</strong>: ${esc(r.ch[1])}` : ''}${r.badges ? `<br>Badges earned: ${r.badges}` : ''}</div>`;
function endSpecs(base) {                                   // end-of-raid screens: each player gets their own results panel
  const mk = role => Object.assign({}, base, { res: resultsSpec(role) });
  return !multi ? [mk('raccoon'), null] : myRole === 'raccoon' ? [mk('raccoon'), mk('farmer')] : [mk('farmer'), mk('raccoon')];
}
