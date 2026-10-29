/* ----- screens ----- */
function show(html, name) {
  stopTitleArt(); const o = $('ov'); o.innerHTML = '<div class="ovin">' + html + '</div>'; o.dataset.screen = name || ''; o.style.display = 'flex'; buttons(false); audioQuiet(); fitOverlay();
}
function fitOverlay() {                                    // a screen that is too big for the window is shrunk to fit, so everything is always visible
  const o = $('ov'), c = o.firstChild; if (!c || o.style.display === 'none' || !c.offsetWidth || !o.clientHeight) return;
  c.style.transform = ''; const cs = getComputedStyle(o), aw = o.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = o.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const k = Math.min(1, aw / c.offsetWidth, ah / c.offsetHeight); if (k > 0 && k < 0.999) c.style.transform = 'scale(' + k.toFixed(3) + ')';
}
addEventListener('resize', () => fitOverlay()); addEventListener('orientationchange', () => setTimeout(fitOverlay, 250));
/* ----- touch movement (wheel), pause, how to play ----- */
const isTouch = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (('ontouchstart' in window) && !(typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches));   // a phone or tablet (not a laptop that merely has a touch screen)
const TOUCH = { mode: 'follow' };                         // 'follow' = the character walks toward your finger; 'wheel' = a movement wheel at the bottom left
try { const s = JSON.parse(localStorage.getItem('raidTouch')); if (s && (s.mode === 'wheel' || s.mode === 'follow')) TOUCH.mode = s.mode; } catch (e) {}
const WHEEL = { x: 100, y: VH - 100, r: 58 };              // the wheel's base circle, in canvas coordinates
let wheel = null, menuFrom = 'title', loopQueued = false;  // wheel = { id, dx, dy } while a finger is on it
function layoutTouch() { layoutView(); }                   // (the action buttons and the wheel live in the side margins now: see mobile.js)
function updateRotate() {                                  // phones are for landscape: in portrait the playfield is tiny, so ask to rotate (a solo run pauses itself)
  const show = isTouch && innerHeight > innerWidth && (state === 'play' || state === 'paused');
  $('rot').style.display = show ? 'flex' : 'none'; if (show && state === 'play' && !multi) pauseGame();
}
setInterval(updateRotate, 300); addEventListener('resize', updateRotate); addEventListener('orientationchange', () => setTimeout(updateRotate, 250));
function wheelMove(p) { const dx = p.x - WHEEL.x, dy = p.y - WHEEL.y, k = Math.min(1, WHEEL.r / (Math.hypot(dx, dy) || 1)); wheel.dx = dx * k; wheel.dy = dy * k; }
function layoutHud() { MM.w = isTouch ? 210 : 150; MM.h = isTouch ? 140 : 105; MM.y = VH - MM.h - 40; MM.x = 10; }
layoutHud();   // the farmer's map moves to the bottom middle so the wheel has the corner
function setTouchMode(m) { TOUCH.mode = m; try { localStorage.setItem('raidTouch', JSON.stringify(TOUCH)); } catch (e) {} drag = null; wheel = null; layoutHud(); refreshScreen(); }
function touchRow() { const m = TOUCH.mode; return `<div class="row"><span class="lbl">Touch movement</span><div class="seg"><button class="${m === 'follow' ? 'on' : ''}" onclick="setTouchMode('follow')">Follow finger</button><button class="${m === 'wheel' ? 'on' : ''}" onclick="setTouchMode('wheel')">Wheel</button></div></div>`; }
function drawWheel() {
  return;                                                 // the wheel is an HTML control in the left margin now
  if (TOUCH.mode !== 'wheel' || state !== 'play') return;
  g.save(); g.globalAlpha = 0.5; g.lineWidth = 3; g.strokeStyle = '#fff'; g.fillStyle = 'rgba(255,255,255,.14)';
  g.beginPath(); g.arc(WHEEL.x, WHEEL.y, WHEEL.r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = wheel ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(WHEEL.x + (wheel ? wheel.dx : 0), WHEEL.y + (wheel ? wheel.dy : 0), 24, 0, 7); g.fill(); g.restore();
}
const PSE = { x: 42, y: 46, w: 26, h: 22 };                // the little pause button next to the speaker (single player)
const pauseHit = p => state === 'play' && !multi && p && p.x >= PSE.x - 4 && p.x <= PSE.x + PSE.w + 4 && p.y >= PSE.y - 4 && p.y <= PSE.y + PSE.h + 4;
function drawPause() { if (multi) return; g.save(); g.globalAlpha = 0.75; g.fillStyle = 'rgba(8,14,20,.6)'; g.fillRect(PSE.x, PSE.y, PSE.w, PSE.h); g.fillStyle = '#fff'; g.fillRect(PSE.x + 8, PSE.y + 5, 4, 12); g.fillRect(PSE.x + 15, PSE.y + 5, 4, 12); g.restore(); }
function kickLoop() { if (loopQueued) return; loopQueued = true; requestAnimationFrame(loop); }     // start the frame loop, never twice
function pauseGame() { if (state !== 'play' || multi) return; for (const k in keys) keys[k] = false; drag = null; wheel = null; pauseScreen(); }
function pauseScreen() {
  menuFrom = 'pause'; state = 'paused';
  show(`<h1>Paused</h1><div class="row"><button class="big" onclick="resumeGame()">Resume</button></div>
  <div class="row"><button class="up" onclick="howTo()"><b>How to play</b></button><button class="up" onclick="controls()"><b>Controls</b></button><button class="up" onclick="soundScreen()"><b>Sound</b></button></div>
  ${questCard()}${tipsRow()}${isTouch ? touchRow() : ''}<div class="row"><button class="up" onclick="confirmQuit()"><b>Quit to menu</b></button></div>`, 'pause');
}
function confirmQuit() { show(`<h1>Quit this raid?</h1><p>The apples you have banked so far still come home with you.</p><div class="row"><button onclick="resumeGame()">Keep playing</button><button class="up" onclick="goHome()"><b>Quit</b>back to the homestead</button></div>`, 'quit'); }
function resumeGame() { if (state !== 'paused') return; $('ov').style.display = 'none'; state = 'play'; buttons(true); last = performance.now(); kickLoop(); }
function toMenu() { payPartial(); refundKeep(); state = 'title'; titleScreen(); }
function togglePause() { if (state === 'home') return homeMenu(); if (multi) return; if (state === 'play') pauseGame(); else if (state === 'paused' && $('ov').dataset.screen === 'pause') resumeGame(); }
function goBack() { rebinding = null; if (settingsOpen) return settingsScreen(); if (menuFrom === 'home') leaveHomeScreen(); else if (menuFrom === 'pause') pauseScreen(); else titleScreen(); }
function refreshScreen() { if ($('ov').style.display === 'none') return; const n = $('ov').dataset.screen; if (n === 'title') titleScreen(); else if (n === 'controls') controls(); else if (n === 'pause') pauseScreen(); }

function titleScreen() {
  menuFrom = 'title'; settingsOpen = false; let best = 0; try { best = +localStorage.getItem('raidBest') || 0; } catch (e) {}
  show(`<h1 class="sr">Midnight Orchard Raid</h1><p class="tag">Sneak apples home before dawn. Don't get caught.</p>
  <div class="row"><button class="big" onclick="enterHome()">Play <small>your homestead</small></button><button class="big alt" onclick="mpMenu()">Multiplayer <small>duel, co-op or raccoon vs farmer</small></button></div>
  <div class="row"><button class="up" onclick="playDaily()"><b>Daily Orchard</b>${dailyBest() ? 'today\'s best ' + dailyBest() : 'same orchard for everyone today'}</button><button class="up" onclick="collection()"><b>Collection</b>${found().length} of ${DISCOVERIES.length + FARMER_FINDS.length} found${packedName() ? ' &middot; packed: ' + esc(packedName()) : ''}</button></div>
  <div class="row"><button class="up" onclick="howTo()"><b>How to play</b></button><button class="up" onclick="controls()"><b>Controls</b></button><button class="up" onclick="soundScreen()"><b>Sound</b></button><button class="up" onclick="settingsScreen('title')"><b>Settings</b></button></div>
  ${isTouch ? touchRow() : ''}${best ? `<p class="best">Best score: ${best}</p>` : ''}${hintLine()}`, 'title'); startTitleArt();
}
// Key binding screen: click a slot, press a key. Backspace clears the slot, Esc cancels.
function controls() {
  const cells = Object.keys(KEY_LABELS).map(a => `<div class="krow"><span>${esc(KEY_LABELS[a])}</span><span>` +
    [0, 1].map(s => `<button class="slot" onclick="startRebind('${a}',${s})">${rebinding && rebinding.action === a && rebinding.slot === s ? 'press a key...' : keyName(BIND[a][s])}</button>`).join(' ') + '</span></div>').join('');
  show(`<h1>Controls</h1>${isTouch ? touchRow() : ''}<div class="kgrid">${cells}</div><p>Click a slot, then press the key you want. Backspace clears it, Esc cancels.</p>${tipsRow()}
  <div class="row"><button class="up" onclick="resetBind()"><b>Reset</b></button><button onclick="goBack()">Back</button></div>`, 'controls');
}
function startRebind(action, slot) { rebinding = { action, slot }; controls(); }
function captureKey(e) {
  e.preventDefault(); const k = e.key.toLowerCase();
  if (k === 'escape') { rebinding = null; return controls(); }
  const { action, slot } = rebinding;
  if (k === 'backspace' || k === 'delete') BIND[action][slot] = '';
  else { for (const a in BIND) BIND[a] = BIND[a].map(x => x === k ? '' : x); BIND[action][slot] = k; }   // a key can only do one thing
  rebinding = null; saveBind(); controls();
}
function resetBind() { for (const a in DEFAULT_KEYS) BIND[a] = [...DEFAULT_KEYS[a]]; rebinding = null; saveBind(); controls(); }
function newRun() {
  if (multi && !isHost) return sendEv({ f: 'newRun', a: [] });
  runEarnReset();
  itemRun(); S = { speed: CONFIG.player.speed, carry: CONFIG.player.carry, dashCd: CONFIG.player.dashCooldown, alert: CONFIG.player.alertTime, hearts: CONFIG.player.hearts, gold: CONFIG.apples.goldChance, shakeT: CONFIG.shake.time };
  if (multi) { S.hearts = COOP ? crewTune().hearts : CONFIG.multiplayer.raccoonHearts; daily = null; } resetFarmerStats(); eatMeal(); hearts = S.hearts; score = 0; night = 1; endless = false; packKeepsake(); startNight(); mealPop();
}
function nightClear() {
  score += Math.round(time) * CONFIG.timeBonus; if (!ST.catches) { score += 50; ST.flawless = 1; }       // flawless night: nobody was caught
  runEarnNight();
  if (night >= CONFIG.nightsToWin && !endless) return victory();
  showUpgrades();
}
// Screens are built from small data objects (not HTML) so the guest can render them safely.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function screenHtml(sp) { const h = screenHtmlBase(sp); return sp.k === 'upgrade' || sp.k === 'end' ? h + hintLine() : h; }
function screenHtmlBase(sp) {
  if (sp.k === 'upgrade') return `<h1>Night ${+sp.n || 0} cleared</h1><p>Score ${+sp.s || 0}. ${sp.who === 'farmer' ? 'Pick a farmer perk for the next night.' : 'Choose a perk for the next night.'}</p>${resHtml(sp.res)}<div class="row">` +
    (sp.p || []).slice(0, 4).map((u, i) => `<button class="up" onclick="${sp.who === 'farmer' ? 'fpick' : sp.who === 'guest' ? 'cpick' : 'pick'}(${i})"><b>${esc(u[0])}</b>${esc(u[1])}</button>`).join('') + `</div>`;
  if (sp.k === 'end' && sp.sr) return `<h1>${esc(sp.h)}</h1><p>${esc(sp.t)}</p>${resHtml(sp.res)}<div class="card" style="width:100%;text-align:center"><b>${sp.sr.done ? 'Duel result' : 'Duel: round ' + (+sp.sr.r || 1) + ' of 2'}</b>${sp.sr.lines.map(esc).join('<br>')}${sp.sr.done ? '<br>' + esc(h2hText()) : ''}</div>
    <div class="row">${sp.sr.done ? '<button onclick="duelStart()"><b>Rematch duel</b>swap roles again</button>' : '<button onclick="duelNext()"><b>Round 2</b>swap roles and go</button>'}<button class="up" onclick="leaveGame()"><b>Quit</b>to menu</button></div>`;
  if (sp.k === 'end') return `<h1>${esc(sp.h)}</h1><p>${esc(sp.t)}</p>${resHtml(sp.res)}${sp.ap ? `<p style="color:#9be37f"><b>+${sp.ap} apples</b> for your homestead</p>` : ''}<div class="row">${sp.win ? '<button onclick="keepGoing()">Keep raiding</button>' : ''}<button${sp.win ? ' class="up"' : ''} onclick="newRun()">${sp.win ? '<b>Play again</b>start over' : multi ? '<b>Rematch</b>same roles' : 'Raid again'}</button>${multi && !COOP ? '<button onclick="swapRoles()">Switch roles</button>' : ''}${multi ? '<button onclick="toLobby()"><b>Lobby</b>change mode or players</button>' : ''}<button onclick="condScreen()">Night condition</button><button class="up" onclick="goHome()"><b>Homestead</b>spend your apples</button>${multi ? '<button class="up" onclick="leaveGame()"><b>Quit</b>to menu</button>' : '<button class="up" onclick="toMenu()"><b>Main menu</b></button>'}</div>`;
  return `<h1>${esc(sp.h)}</h1><p>${esc(sp.t)}</p>` + (multi ? '<button class="up" onclick="leaveGame()"><b>Quit</b>to menu</button>' : '');
}
function showScreen(mine, theirs, theirsF) {           // theirs = what the other player sees (multiplayer host only); theirsF = what a guest FARMER sees in a crew raid
  if (mine && mine.k === 'end' && mine.ap) payApples(mine.ap);        // the raid pays out: apples for the homestead
  show(screenHtml(mine)); screenSound(mine);
  if (multi && isHost && theirs && net.r) { net.scr = { id: ++net.scrId, sp: theirs }; if (theirsF) net.scr.spf = theirsF; nsend('scr', net.scr); }
}
function crewPickScreens() {                           // crew raid between nights: who still picks what (raccoons pick ONE shared perk; the farmer picks his own)
  const wait = { k: 'wait', h: 'Perk chosen', t: 'Waiting for the others...' }, R = window.crewSpecR, F = window.crewSpecF;
  const forR = pend.raccoon ? R : wait, forF = pend.farmer && F ? F : wait;
  const mine = myRole === 'farmer' ? forF : (pend.raccoon ? Object.assign({}, R, { who: 'raccoon' }) : wait);
  show(screenHtml(mine)); if (net.r) { net.scr = { id: ++net.scrId, sp: pend.raccoon ? Object.assign({}, R, { who: 'guest' }) : wait, spf: forF }; nsend('scr', net.scr); }
}
function showUpgrades() {
  state = 'upgrade'; const pick3 = L => [...L].sort(() => Math.random() - .5).slice(0, 3), list = L => L.map(u => [u.name, u.desc]);
  const picks = pick3(UPGRADES); window.picks = picks;
  const specR = { k: 'upgrade', who: 'raccoon', n: night, s: score, p: list(picks), res: resultsSpec('raccoon') };
  if (!multi) return showScreen(specR, null);
  if (COOP) {                                          // crew: the raccoons pick one perk together (first click wins); a human farmer picks his own
    pend = { raccoon: true, farmer: crewHunted() }; window.crewSpecR = specR; window.crewSpecF = null;
    if (crewHunted()) { const fp = pick3(FARMER_UPGRADES); window.fpicks = fp; window.crewSpecF = { k: 'upgrade', who: 'farmer', n: night, s: score, p: list(fp), res: resultsSpec('farmer') }; }
    screenSound(specR); return crewPickScreens();
  }
  const fpicks = pick3(FARMER_UPGRADES); window.fpicks = fpicks; pend = { raccoon: true, farmer: true };      // multiplayer: both players pick, then the next night starts
  const specF = { k: 'upgrade', who: 'farmer', n: night, s: score, p: list(fpicks), res: resultsSpec('farmer') };
  if (myRole === 'raccoon') showScreen(specR, specF); else showScreen(specF, specR);
}
function afterPick(role) {
  if (!pend.raccoon && !pend.farmer) { night++; startNight(); return; }
  if (COOP) return crewPickScreens();
  const wait = { k: 'wait', h: 'Perk chosen', t: 'Waiting for the other player...' };
  if (role === myRole) show(screenHtml(wait)); else if (net.r) { net.scr = { id: ++net.scrId, sp: wait }; nsend('scr', net.scr); }
}
function saveBest() {
  let best = score; try { best = +localStorage.getItem('raidBest') || 0; if (score > best) { best = score; localStorage.setItem('raidBest', best); } } catch (e) { best = Math.max(best, score); }
  return best;
}
function victory() {                                   // survived every night: rating, then keep going or start over
  state = 'won'; if (!multi || myRole === 'raccoon') homeWin(); const best = saveBest(); duelRound(true); let rating = CONFIG.ratings[0][0];
  for (const [name, min] of CONFIG.ratings) if (score >= min) rating = name;
  const sp = { k: 'end', win: true, h: crewHunted() ? 'The crew wins!' : COOP ? 'The crew survived!' : multi ? 'The raccoon wins!' : 'You survived the raid!', t: `${CONFIG.nightsToWin} nights, ${score} points. Rating: ${rating}. Best: ${best}. Keep raiding continues with ever harder nights.${daily ? ' Daily best: ' + saveDaily() + '.' + dailyReward() : ''}` };
  showScreen(...endSpecs(sp)); runEarnReset();
}
function keepGoing() { if (multi && !isHost) return sendEv({ f: 'keepGoing', a: [] }); if (state !== 'won') return; endless = true; showUpgrades(); }
function pick(i) {
  if (multi && !isHost) return sendEv({ f: 'pick', a: [i]});
  if (state !== 'upgrade' || !window.picks[i] || (multi && !pend.raccoon)) return;
  window.picks[i].apply(S); if (!multi) { night++; startNight(); return; } pend.raccoon = false; afterPick('raccoon');
}
function fpick(i) {
  if (multi && !isHost) return sendEv({ f: 'fpick', a: [i] });
  if (!multi || state !== 'upgrade' || !pend.farmer || !window.fpicks || !window.fpicks[i]) return;
  window.fpicks[i].apply(FS); pend.farmer = false; afterPick('farmer');
}
function gameOver(why) {
  state = 'over'; const best = saveBest(); refundKeep(); duelRound(false); runEarn.banked += banked; runEarn.catches += ST.catches || 0;
  if (COOP) why = hearts <= 0 ? 'The crew was caught too many times.' : 'Dawn broke before the crew banked enough apples.'; else if (multi) why = hearts <= 0 ? 'The raccoon was caught too many times.' : 'Dawn broke before the raccoon banked enough apples.';
  const sp = { k: 'end', win: false, h: crewHunted() ? 'The farmer wins!' : COOP ? 'Raid over' : multi ? 'The farmer wins!' : 'Raid over', t: `${why} Night ${night}${endless ? '' : ' of ' + CONFIG.nightsToWin}, ${score} points. Best: ${best}.${daily ? ' Daily best: ' + saveDaily() + '.' + dailyReward() : ''}` };
  showScreen(...endSpecs(sp)); runEarnReset();
}


/* ----- run options on the end screen: switch roles (multiplayer) and pick a night condition ----- */
function swapRoles() {
  if (multi && !isHost) return sendEv({ f: 'swapRoles', a: [] }); if (!multi || COOP) return;
  myRole = otherRole(myRole); if (net.hosting) net.hosting.role = myRole; newRun();       // the guest learns its new role from the next night message
}
function condScreen() {
  if (multi && !isHost) return sendEv({ f: 'condScreen', a: [] });
  const list = NIGHT_MODS.slice(1).map((m, i) => `<button class="up" onclick="setCond(${i})"><b>${esc(m.name)}</b>${esc(m.desc)}</button>`).join('') + `<button class="up" onclick="setCond(-1)"><b>Random</b>a different condition every night</button>`;
  show(`<h1>Night condition</h1><p>Now: ${runMod ? esc(NIGHT_MODS.find(m => m.id === runMod).name) : 'random'}. Pick one for every night of the next raid.</p><div class="row">${list}</div>`, 'cond');
  if (multi && net.r) { net.scr = { id: ++net.scrId, sp: { k: 'wait', h: 'Choosing a condition', t: 'The host is picking a night condition...' } }; nsend('scr', net.scr); }
}
function setCond(i) { if (multi && !isHost) return; daily = null; runMod = i < 0 ? null : NIGHT_MODS.slice(1)[i].id; newRun(); }

/* ----- DUEL: two raids, roles swapped in between. Each player's raccoon raid is scored (nights survived, then score); the better raccoon wins.
   The result is kept as a head-to-head record against that friend (matched by an id each browser makes for itself). ----- */
let series = null, duelHud = 0;                            // series (host only) = { round, res: [{ who: 'host'|'guest', night, score, won }] }; duelHud = the round to show on screen (both players)
const h2h = () => store('raidH2H', {});
function recordH2H(out) { const k = net.theirPid; if (!k || !out) return; const all = h2h(), r = all[k] || (all[k] = { w: 0, l: 0, d: 0 }); r[out === 'win' ? 'w' : out === 'loss' ? 'l' : 'd']++; save('raidH2H', all); }
function h2hText() { const r = net.theirPid && h2h()[net.theirPid]; return r ? `Record vs this friend: ${r.w} won, ${r.l} lost${r.d ? ', ' + r.d + ' drawn' : ''}` : 'First duel against this friend'; }
function duelRound(won) {                                  // host: the raccoon's raid has just ended - score it
  if (!multi || !isHost || !series || series.res.length >= series.round) return;
  series.res.push({ who: myRole === 'raccoon' ? 'host' : 'guest', night, score, won: !!won });
  if (series.res.length >= 2) { const o = duelOutcome(); recordH2H(o.host); }
}
const duelKey = r => [r.won ? 1 : 0, r.night, r.score];
function duelOutcome() {                                   // who won the duel, from each player's side
  const [a, b] = series.res, ka = duelKey(a), kb = duelKey(b); let c = 0; for (let i = 0; i < 3 && !c; i++) c = Math.sign(ka[i] - kb[i]);
  const winner = c === 0 ? null : c > 0 ? a.who : b.who;
  return { winner, host: !winner ? 'draw' : winner === 'host' ? 'win' : 'loss', guest: !winner ? 'draw' : winner === 'guest' ? 'win' : 'loss' };
}
function duelSpec(forHost) {                               // what one player's end screen says about the duel
  const me = forHost ? 'host' : 'guest', name = w => w === me ? 'You' : 'Friend', done = series.res.length >= 2;
  const lines = series.res.map(r => `${name(r.who)} (raccoon): night ${r.night}${r.won ? ', survived' : ''}, ${r.score} pts`);
  if (!done) lines.push('Next, you swap roles for round 2.');
  else { const o = duelOutcome(); lines.push(o.winner ? (o.winner === me ? 'You win the duel!' : 'Friend wins the duel.') : 'The duel is a draw.'); }
  return { r: series.round, done: done ? 1 : 0, lines, out: done ? duelOutcome()[me] : '' };
}
function duelStart() { if (multi && !isHost) return sendEv({ f: 'duelStart', a: [] }); if (!multi) return; COOP = false; CREW.farmer = null; series = { round: 1, res: [] }; duelHud = 1; newRun(); }
function duelNext() { if (multi && !isHost) return sendEv({ f: 'duelNext', a: [] }); if (!multi || !series || series.res.length !== 1 || state === 'play') return; series.round = 2; duelHud = 2; swapRoles(); }
function startRaid() { series = null; duelHud = 0; COOP = false; CREW.farmer = null; newRun(); }
