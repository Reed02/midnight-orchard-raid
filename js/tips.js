/* ===== TONIGHT'S QUEST, TIPS AND HOW TO PLAY =====
   Help is put where players naturally look for it, a little at a time:
   - the night's quest stays on screen (top left); tap it / press the quest key to read it in full
   - a short TIP appears once, the first time you meet a situation (first dog, first bush, first strange light...) and can be switched off
   - a one-line "Tip:" sits at the bottom of the title, results and game-over screens
   - How to play is a few small tabs, not one long page; the pause screen shows your quest
   To add a tip: one entry in TIPS (when() decides the moment; text() is what it says). */
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const ctl = a => isTouch ? ({ shake: 'the Shake button', dash: 'the Dash button', climb: 'the Climb button', item: 'the Item button', whistle: 'the Whistle button', call: 'the Dogs button' })[a] || a : kn(a);
/* ----- the quest chip ----- */
function questState(role) {
  const id = CH[role], d = id && chDef(role, id); if (!d) return null;
  if (multi && !isHost) { const q = net.qp && net.qp[role === 'farmer' ? 1 : 0]; return { name: d.name, desc: d.desc, prog: q ? q.slice(1) : '', st: q ? ({ '+': 'ok', '-': 'bad' })[q[0]] || '' : '' }; }
  return { name: d.name, desc: d.desc, prog: d.prog ? d.prog(ST) : '', st: d.live ? d.live(ST) : d.test(ST) ? 'ok' : '' };
}
const questCode = role => { const q = questState(role); return q ? (q.st === 'ok' ? '+' : q.st === 'bad' ? '-' : ' ') + String(q.prog).slice(0, 22) : ''; };
const QCHIP = { x: 8, y: 72, w: 0, h: 22 }; let questOpenUntil = 0;
const questHit = p => state === 'play' && QCHIP.w > 0 && p && p.x >= QCHIP.x && p.x <= QCHIP.x + QCHIP.w && p.y >= QCHIP.y && p.y <= QCHIP.y + QCHIP.h;
const toggleQuest = () => { if (state === 'play') questOpenUntil = t < questOpenUntil ? 0 : t + 8; };
function wrapLines(txt, maxW) { const out = []; let line = ''; for (const w of String(txt).split(' ')) { const test = line ? line + ' ' + w : w; if (line && g.measureText(test).width > maxW) { out.push(line); line = w; } else line = test; } if (line) out.push(line); return out; }
function drawQuestChip() {
  QCHIP.w = 0; const q = state === 'play' ? questState(viewRole()) : null; if (!q) return;
  const mark = q.st === 'ok' ? '\u2714 ' : q.st === 'bad' ? '\u2718 ' : '\u2605 ', col = q.st === 'ok' ? '#7ddc7a' : q.st === 'bad' ? '#ff8a7a' : '#ffd23f', txt = mark + q.name + (q.prog ? '  ' + q.prog : '');
  g.save(); g.font = 'bold 12px "Trebuchet MS",Verdana,sans-serif'; g.textBaseline = 'middle'; const w = Math.min(230, g.measureText(txt).width + 20); QCHIP.w = w;
  g.fillStyle = 'rgba(10,24,40,.84)'; g.fillRect(QCHIP.x, QCHIP.y, w, QCHIP.h); g.fillStyle = col; g.fillRect(QCHIP.x, QCHIP.y, 4, QCHIP.h); g.fillStyle = '#fff7e6'; g.fillText(txt, QCHIP.x + 12, QCHIP.y + QCHIP.h / 2 + 0.5, w - 16);
  if (t < questOpenUntil) {                                  // the full quest, for a few seconds
    g.font = '13px "Trebuchet MS",Verdana,sans-serif'; const lines = wrapLines(q.desc, 236), h = 34 + lines.length * 17 + 18, y = QCHIP.y + 26;
    g.fillStyle = 'rgba(10,24,40,.93)'; g.fillRect(QCHIP.x, y, 262, h); g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(QCHIP.x + 1, y + 1, 260, h - 2);
    g.fillStyle = col; g.font = 'bold 14px "Trebuchet MS",Verdana,sans-serif'; g.fillText('Tonight\'s quest: ' + q.name, QCHIP.x + 10, y + 16); g.fillStyle = '#fff7e6'; g.font = '13px "Trebuchet MS",Verdana,sans-serif';
    lines.forEach((l, i) => g.fillText(l, QCHIP.x + 10, y + 36 + i * 17)); g.fillStyle = '#b9d7ff'; g.font = '12px "Trebuchet MS",Verdana,sans-serif'; g.fillText('Finish it for a badge and a find.', QCHIP.x + 10, y + h - 12);
  }
  g.restore();
}
const questCard = () => { const q = questState(viewRole() || 'raccoon'); return q ? `<div class="card" style="width:100%;text-align:center"><b>Tonight's quest: ${esc(q.name)}</b>${esc(q.desc)}${q.prog ? '<br><i>' + esc(q.prog) + '</i>' : ''}</div>` : ''; };
/* ----- one-time tips, the first time a situation comes up ----- */
const tipStore = () => Object.assign({ off: false, seen: {} }, store('raidTips', {}));
let tipShow = null, tipNext = 0, tipNightT = 0, tipLastTime = 0;
const TIPS = [
  { id: 'h_welcome', role: 'home', when: () => t - homeT0 > 1.2 && !(typeof isVisiting === 'function' && isVisiting()), text: () => 'Welcome home! This is your own corner of the orchard. Raid it at night to earn apples, then spend them here.' },
  { id: 'h_hut',     role: 'home', when: () => !!homeNear && homeNear.id === 'hut', text: () => 'The Raid Hut is where raids start: solo, the Daily Orchard, or together with a friend. Apples you bank come home with you.' },
  { id: 'h_plot',    role: 'home', when: () => !!homeNear && (homeNear.id === 'plot' || homeNear.id === 'house'), text: () => 'Save up apples to build your cottage on this plot. You keep every apple you bank, even if you are caught.' },
  { id: 'h_mirror',  role: 'home', when: () => !!homeNear && homeNear.id === 'mirror', text: () => 'The mirror is where you change your skin, and your hat, scarf and trail. Skins show up in every raid.' },
  { id: 'h_mail',    role: 'home', when: () => !!homeNear && homeNear.id === 'mail', text: () => 'The mailbox has a small gift every real day. Nothing wilts while you are away, so there is never any rush.' },
  { id: 'goal',    role: 'raccoon', when: () => night === 1 && t - tipNightT > 3 && !carry.length && !COOP, text: () => 'Goal: bank apples at the den (the dashed circle) before dawn. Pick up apples from the ground and shake trees for more.' },
  { id: 'coop',    role: 'raccoon', when: () => COOP && t - tipNightT > 2, text: () => 'Co-op crew: you share the hearts and the quota. If your friend goes down, stand next to them to pick them up.' },
  { id: 'loot',    role: 'raccoon', when: () => !P.tree && !slam && (() => { const o = nearShake(CONFIG.shake.range); return o && o.k === 'loot' && !(o.cd > 0); })(), text: () => `Hold ${ctl('shake')} here to search it. Materials drop out: walk over them to pick them up. They come home with you even if you are caught.` },
  { id: 'bees',    role: 'raccoon', when: () => SITE.bees && t - tipNightT > 2, text: () => 'Bee Meadow: keep clear of the bee swarms round the hives. A sting makes you easy to spot, and the dogs come running.' },
  { id: 'shake',   role: 'raccoon', when: () => !P.tree && !slam && t - tipNightT > 2 && !!nearTree(CONFIG.shake.range), text: () => `Hold ${ctl('shake')} next to a tree to shake apples loose. A shaken tree needs a while to regrow.` },
  { id: 'bank',    role: 'raccoon', when: () => carry.length >= 1, text: () => 'Carry apples to the den (the dashed circle) to bank them. A bigger haul scores more, but you move slower.' },
  { id: 'light',   role: 'raccoon', when: () => alertV > 0.15, text: () => 'The red bar fills while a flashlight is on you. Duck behind a tree, stone or bush to break its line of sight.' },
  { id: 'bush',    role: 'raccoon', when: () => !P.tree && hidden(), text: () => 'Hidden in a bush: farmers cannot see you here and dogs only smell you from close by.' },
  { id: 'dogs',    role: 'raccoon', when: () => dogs.some(d => d.chase && Math.hypot(d.x - P.x, d.y - P.y) < 280), text: () => `A dog smells you! Climb a tree (${ctl('climb')}) to be safe, then use ${ctl('dash')} to slam down and stun dogs below.` },
  { id: 'tree',    role: 'raccoon', when: () => !!P.tree, text: () => `Safe from dogs up here. ${cap(ctl('dash'))} slams down and stuns dogs underneath. ${cap(ctl('climb'))} climbs back down.` },
  { id: 'river',   role: 'raccoon', when: () => !!RIVER && t - tipNightT > 3, text: () => RIVER && RIVER.ford ? 'A river runs through tonight\'s orchard. Cross at the bridge, or hop the stepping stones: only you can use them, but you are slow and out in the open.' : 'A river runs through tonight\'s orchard. Water blocks you, so cross at the bridges.' },
  { id: 'strange', role: 'raccoon', when: () => !!strange && !strange.found && t - tipNightT > 5, text: () => 'A strange light! Stand beside it for a couple of seconds to find a collectable.' },
  { id: 'item',    role: 'raccoon', when: () => !!keep && t - tipNightT > 4, text: () => `You packed a keepsake. ${isTouch ? 'Tap' : 'Press'} ${ctl('item')} to use it once. Unused ones go back in your satchel.` },
  { id: 'combo',   role: 'raccoon', when: () => chain >= 2, text: () => 'Combo! Pick up apples one right after another for a rising sound and bonus points.' },
  { id: 'quest',   role: 'both',    when: () => t - tipNightT > 10 && !!questState(viewRole()), text: () => `Every night has a quest (top left). Finish it for a badge and a find. ${isTouch ? 'Tap it' : 'Press ' + kn('quest')} to read it again.` },
  { id: 'f_start', role: 'farmer',  when: () => t - tipNightT > 2, text: () => `You are the farmer: you only see by your own light. ${isTouch ? 'The light follows where you walk.' : 'Walk to move; hold ' + kn('aim') + ' to aim the light with the mouse.'}` },
  { id: 'f_dogs',  role: 'farmer',  when: () => t - tipNightT > 9, text: () => `${cap(ctl('whistle'))} sends the dogs searching ahead of you. ${cap(ctl('call'))} calls them to where the raccoon was last seen.` },
  { id: 'f_map',   role: 'farmer',  when: () => t - tipNightT > 16, text: () => `${isTouch ? 'Tap' : 'Click'} a square on the map (bottom left) to send the dogs to sweep it.` },
  { id: 'f_track', role: 'farmer',  when: () => tracks.length > 2, text: () => 'Those are the raccoon\'s footprints. They fade quickly, so follow them while they are fresh.' },
];
function tipTick() {
  if (state === 'play' && time > tipLastTime + 3) tipNightT = t; if (state === 'play') tipLastTime = time;       // a new night: the tip clock restarts
  if ((state !== 'play' && state !== 'home') || t < tipNext || tipShow) return; const ts = tipStore(); if (ts.off) return; const inHome = state === 'home';
  for (const d of TIPS) { if (ts.seen[d.id] || (d.role === 'home') !== inHome || (!inHome && d.role !== 'both' && d.role !== viewRole())) continue; let ok = false; try { ok = d.when(); } catch (e) {} if (ok) { ts.seen[d.id] = 1; save('raidTips', ts); tipShow = { text: d.text(), t0: t, until: t + 9 }; tipNext = t + 8; return; } }
}
const TIPBOX = { x: 0, y: 0, w: 0, h: 0 };
function drawTip() {
  if (!tipShow) return; const left = tipShow.until - t; if (left <= 0 || (state !== 'play' && state !== 'home')) { tipShow = null; TIPBOX.w = 0; return; }
  g.save(); g.globalAlpha = Math.min(1, (t - tipShow.t0) * 3, left * 2); g.font = '14px "Trebuchet MS",Verdana,sans-serif'; const maxW = Math.min(VW - 80, 500), lines = wrapLines(tipShow.text, maxW - 24), h = 14 + lines.length * 18 + 8, w = Math.min(VW - 30, maxW + 24), x = (VW - w) / 2, y = VH - 44 - h;
  TIPBOX.x = x; TIPBOX.y = y; TIPBOX.w = w; TIPBOX.h = h; g.fillStyle = 'rgba(10,24,40,.92)'; g.fillRect(x, y, w, h); g.fillStyle = '#6fb6ff'; g.fillRect(x, y, 4, h);
  g.fillStyle = '#9fd0ff'; g.font = 'bold 11px "Trebuchet MS",Verdana,sans-serif'; g.fillText('TIP', x + 14, y + 14); g.fillStyle = '#fff7e6'; g.font = '14px "Trebuchet MS",Verdana,sans-serif'; lines.forEach((l, i) => g.fillText(l, x + 14, y + 32 + i * 18)); g.restore();
}
const tipHit = p => !!tipShow && TIPBOX.w > 0 && p && p.x >= TIPBOX.x && p.x <= TIPBOX.x + TIPBOX.w && p.y >= TIPBOX.y && p.y <= TIPBOX.y + TIPBOX.h;
function setTips(on) { const ts = tipStore(); ts.off = !on; if (on) ts.seen = {}; save('raidTips', ts); refreshScreen(); }
const tipsRow = () => { const on = !tipStore().off; return `<div class="row"><span class="lbl">Helpful tips while you play</span><div class="seg"><button class="${on ? 'on' : ''}" onclick="setTips(true)">On</button><button class="${on ? '' : 'on'}" onclick="setTips(false)">Off</button></div></div>`; };
/* ----- the one-line tip on the title / results / game-over screens ----- */
const HINTS = [
  'Bank often: apples you are carrying are lost if you are caught.', 'Golden apples are worth 3, and a full set of cheeks banked at once scores far more than the same apples banked one by one.',
  'Dogs cannot climb. A tree is the safest place when a dog is on your tail.', 'Slam down from a tree onto a dog to stun it for a few seconds.', 'A bush hides you completely, but a farmer who walks right up to it will find you.',
  'Trees and stones block flashlights. Stand behind one and the red bar stops filling.', 'The red bar drains when you are out of the light, so break line of sight and it fades.',
  'Quick pickups build a combo: each one plays a higher note and long chains pay bonus points.', 'A night where nobody catches you is flawless: +50 points.', 'Finish the night\'s quest for a badge and a collectable. Badges unlock hats, scarves and trails.',
  'Collectables are one-use: pack one in the Collection screen, then use it during a raid.', 'In co-op, stand next to a downed friend to pick them up before the timer runs out.', 'Strange lights hide collectables. Stand next to one for a couple of seconds.',
];
const HINTS_F = ['Dogs smell the raccoon from farther away while it is shaking a tree.', 'Footprints show where the raccoon went. Follow them before they fade.', 'Whistle sends dogs ahead of you; call brings them to where the raccoon was last seen.', 'The raccoon has to come back to the den. Waiting near it is a good plan.'];
const hintLine = () => `<p class="lbl" style="opacity:.8">Tip: ${esc((myRole === 'farmer' && multi && Math.random() < 0.6 ? HINTS_F : HINTS)[Math.floor(Math.random() * (myRole === 'farmer' && multi ? HINTS_F.length : HINTS.length))])}</p>`;
/* ----- How to play: small tabs ----- */
const HOW = {
  Basics: () => [['Your goal', `Collect apples and bank them at the glowing den before dawn. Clear ${CONFIG.nightsToWin} nights to win.`], ['Apples', 'Grab apples from the ground, and shake trees for more. Golden apples are worth 3. The more you carry, the slower you are.'], ['Moving', isTouch ? 'Use the wheel on the left, or drag on the screen. The buttons on the right dash, shake and climb.' : `Move with ${kn('up')}${kn('left')}${kn('down')}${kn('right')}. Dash with ${kn('dash')}. Hold ${kn('shake')} by a tree to shake it. ${kn('pause')} pauses.`], ['Quest', 'Every night has a quest (top left). Finish it for a badge and a find.']],
  Hiding: () => [['Flashlights', 'Farmers spot you inside their light cone. The red bar fills while you are lit; if it fills, you are caught.'], ['Cover', 'Trees and stones block the light. Bushes hide you completely.'], ['Dogs', 'Dogs smell you from a distance (less if you hide, more if you shake a tree).']],
  Trees: () => [['Climb', `${cap(ctl('climb'))} climbs a nearby tree. Dogs cannot reach you up there, but farmers can still see you.`], ['Slam', `Up a tree, ${ctl('dash')} drops a slam that stuns every dog underneath for a few seconds.`], ['Tip', 'Lure a dog under a tree, then slam it.']],
  Together: () => [['Raccoon vs farmer', 'One player is the raccoon, the other hunts it as the farmer. The farmer sees only by flashlight and footprints.'], ['Duel', 'Two raids with roles swapped. The raccoon who lasts longer wins, and your record against that friend is kept.'], ['Co-op crew', 'Two raccoons share hearts and a bigger quota. A caught raccoon goes down: stand next to it to revive it.']],
  Farmer: () => [['Seeing', 'You see only by your light and nearby glow, and by footprints.'], ['Dogs', `${cap(ctl('whistle'))} whistles dogs ahead. ${cap(ctl('call'))} calls them to the raccoon's last seen spot. ${isTouch ? 'Tap' : 'Click'} a map square to sweep it.`], ['Catching', 'Keep the light on the raccoon until the red bar fills.']],
};
function howTo(tab) {
  const tabs = Object.keys(HOW); tab = tabs.includes(tab) ? tab : (typeof howTab === 'string' ? howTab : 'Basics'); howTab = tab;
  show(`<h1>How to play</h1><div class="row"><div class="seg">${tabs.map(k => `<button class="${k === tab ? 'on' : ''}" onclick="howTo('${k}')">${k}</button>`).join('')}</div></div>
  <div class="cards">${HOW[tab]().map(c => `<div class="card"><b>${esc(c[0])}</b>${esc(c[1])}</div>`).join('')}</div><div class="row"><button onclick="goBack()">Back</button></div>`, 'howto');
}
let howTab = 'Basics';
