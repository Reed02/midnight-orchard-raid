/* ===== THINGS TO DO AT HOME =====
   Furniture you place indoors can be used (walk up to it, E / Act):
     stove, fireplace, kitchen worktable  - COOK what the garden grows into a meal; pack one meal for your next solo raid (RECIPES: each gives a perk)
     bed                                  - sleep: once a real day you wake WELL RESTED (+1 heart in your next solo raid)
     armchairs, sofa                      - sit down (any move key gets you up); by a fireplace it is extra cosy
     bookshelf                            - read (BOOKS)
     grandfather clock                    - the time, and when the next crop is ripe
     wardrobe, chest of drawers           - your hats and scarves
     iron-bound chest                     - the pantry: what you grew and cooked, and the meal you packed
     spinning wheel                       - spin a yarn (a tall tale)
   Tables, chests, crates and barrels (NOTE_ON, indoors or out) hold NOTES: anyone in the base (you, or a friend visiting, social.js) can pin one;
   they stay on that piece (HOME.notes, by its uid p.u) and move with it. A note whose piece was put away shows in the mailbox.
   Meals and the rested bonus are used by newRun (screens.js) for solo raids only (not the Daily Orchard, which is the same for everyone). */
const RECIPES = [
  { id: 'crunch', name: 'Carrot crunch', need: { carrot: 3 }, perk: 'Move 12% faster', apply: s => { s.speed *= 1.12; } },
  { id: 'salad', name: 'Garden salad', need: { lettuce: 2, carrot: 1 }, perk: 'Slower to get spotted', apply: s => { s.alert *= 1.35; } },
  { id: 'stew', name: 'Beet stew', need: { beet: 2, carrot: 1 }, perk: '+1 heart', apply: s => { s.hearts++; } },
  { id: 'rolls', name: 'Cabbage rolls', need: { cabbage: 2 }, perk: 'Carry +2 apples', apply: s => { s.carry += 2; } },
  { id: 'pie', name: 'Pumpkin pie', need: { pumpkin: 1, beet: 1 }, perk: 'More golden apples, quicker dash', apply: s => { s.gold += 0.1; s.dashCd *= 0.8; } },
  { id: 'feast', name: 'Harvest feast', need: { carrot: 1, lettuce: 1, beet: 1, cabbage: 1, pumpkin: 1 }, perk: '+1 heart, carry +2, move 10% faster', apply: s => { s.hearts++; s.carry += 2; s.speed *= 1.1; } },
];
const recipe = id => RECIPES.find(r => r.id === id);
const MEAL_ICON = { crunch: '&#129365;', salad: '&#129367;', stew: '&#127858;', rolls: '&#127791;', pie: '&#129383;', feast: '&#127869;' };
const NOTE_ON = ['dining', 'coffeetable', 'nightstand', 'worktable', 'dresser', 'chest', 'hutch', 'crate', 'crate2', 'applecrate', 'barrel', 'logs1', 'bucket'];
const USE = { stove: 'cook', fireplace: 'cook', worktable: 'cook', bed: 'sleep', armchair: 'sit', armchair2: 'sit', sofa: 'sit', bookshelf: 'read', clock: 'clock',
  wardrobe: 'dress', dresser: 'dress', chest: 'pantry', spinwheel: 'spin' };
const USE_TIP = { cook: 'Cook', sleep: 'Sleep', sit: 'Sit down', read: 'Read a book', clock: 'Check the time', dress: 'Hats and scarves', pantry: 'Pantry', spin: 'Spin a yarn' };
let COZY = { sit: null, sleep: 0, book: 0 };
function cozyLoad() { HOME.meals = HOME.meals && typeof HOME.meals === 'object' ? HOME.meals : {}; HOME.notes = Array.isArray(HOME.notes) ? HOME.notes.filter(n => n && n.text) : []; }
const notesOn = u => (HOME.notes || []).filter(n => n.u === u);
const unseenNotes = () => (HOME.notes || []).filter(n => !n.seen && n.from !== myCode()).length;
/* ----- walk-up spots on furniture (indoors: everything with a use or a note surface; outdoors: note surfaces) ----- */
function cozyInteractables() { return furnitureSpots(HOME_IN ? 'in' : 'out'); }
function furnitureSpots(w) {
  return (HOME.placed && HOME.placed[w] || []).filter(p => p.u && (USE[p.id] && w === 'in' || NOTE_ON.includes(p.id))).map(p => {
    const { w: pw, h, c } = pSize(p), use = w === 'in' ? USE[p.id] : null, ns = notesOn(p.u).length;
    const tip = c.name + ': ' + (use ? USE_TIP[use] : 'leave a note') + (ns ? ' (' + ns + (ns === 1 ? ' note)' : ' notes)') : '');
    return { id: 'fur', soft: 1, x: p.x, y: p.y + 12, r: Math.max(40, pw / 2 + 14), h: h + 14, tip, act: () => furnitureAct(p) };
  });
}
function furnitureAct(p) {
  const use = HOME_IN ? USE[p.id] : null, note = NOTE_ON.includes(p.id);
  if (!use) return notesScreen(p.u);
  if (note || notesOn(p.u).length) return homeScreen(`<h1>${esc(catItem(p.id).name)}</h1><div class="row"><button class="up" onclick="leaveHomeScreen();cozyUse('${p.u}')"><b>${USE_TIP[use]}</b></button>
    <button class="up" onclick="notesScreen('${p.u}')"><b>Notes</b>${notesOn(p.u).length} pinned here</button></div><div class="row"><button onclick="leaveHomeScreen()">Back</button></div>`, 'furniture');
  cozyUse(p.u);
}
const placedByU = u => { for (const w of ['in', 'out']) { const p = (HOME.placed[w] || []).find(q => q.u === u); if (p) return p; } return null; };
function cozyUse(u) {
  const p = placedByU(u); if (!p) return; const use = USE[p.id], vis = isVisiting();
  if (use === 'cook') return vis ? pop(p.x, p.y - 90, 'You can cook in your own kitchen', '#cfd8e6') : cookScreen();
  if (use === 'pantry') return vis ? pop(p.x, p.y - 70, 'It is locked. Fair enough.', '#cfd8e6') : pantryScreen();
  if (use === 'dress') { state = 'homemenu'; menuFrom = 'home'; return wardrobe(); }
  if (use === 'read') return bookScreen(COZY.book);
  if (use === 'clock') { const d = new Date(), next = nextRipe(); try { sfxPlay('ui'); } catch (e) {}
    return pop(p.x, p.y - pSize(p).h - 10, 'Tick, tock: ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + (vis ? '' : next ? '. Next crop ripe in ' + fmtLeft(next) : ''), '#ffe9a8'); }
  if (use === 'spin') { fxBurst(p.x, p.y - 30, 14, { col: ['#f4e6c2', '#d9bb7e', '#fff'], s1: 70, l1: 0.7, r1: 2.5 }); return pop(p.x, p.y - 80, TALES[Math.floor(Math.random() * TALES.length)], '#ffe9a8'); }
  if (use === 'sit') { COZY.sit = { p, x0: P.x, y0: P.y }; P.x = p.x; P.y = p.y - 6; P.moving = false; anim = 0;
    const warm = HOME.placed.in.some(q => q.id === 'fireplace' && Math.hypot(q.x - p.x, q.y - p.y) < 220); return pop(p.x, p.y - 90, warm ? 'You curl up by the fire. Bliss.' : 'Ahh. A good sit.', '#ffe9a8'); }
  if (use === 'sleep') { COZY.sleep = t; COZY.sleepBed = p; P.moving = false; anim = 0; }
}
function nextRipe() { let m = Infinity; for (const b in HOME.garden || {}) (HOME.garden[b] || []).forEach(q => { if (q && !ripe(q)) m = Math.min(m, q.end - gNow()); }); return m === Infinity ? 0 : m; }
/* called by updateInterior: true while sitting or asleep (no walking) */
function cozyTick(dt) {
  if (COZY.sleep) { t += dt; if (t - COZY.sleep > 2.6) wakeUp(); return true; }
  if (COZY.sit) { const mv = moveVec('raccoon'); t += dt; if (Math.hypot(mv.x, mv.y) > 0) standUp(); else return true; }
  return false;
}
function standUp() { if (!COZY.sit) return; P.x = COZY.sit.x0; P.y = COZY.sit.y0; COZY.sit = null; inPush(P); }
function wakeUp() {
  const p = COZY.sleepBed; COZY.sleep = 0; COZY.sleepBed = null; if (!p) return;
  if (isVisiting()) return pop(p.x, p.y - 100, 'What a comfy bed. (The rested bonus is for your own bed.)', '#ffe9a8');
  if (HOME.rested === todayKey()) return pop(p.x, p.y - 100, 'A nice nap. (You are already rested today.)', '#ffe9a8');
  HOME.rested = todayKey(); HOME.restBuff = 1; homeSave(); fxBurst(p.x, p.y - 50, 24, { col: ['#ffd23f', '#fff6a8', '#fff'], k: 'spark', s1: 140, up: 40, l1: 0.9, r1: 4 });
  pop(p.x, p.y - 100, 'Well rested! +1 heart in your next solo raid', '#9be37f', true);
}
function drawCozyOver() {                                         // the sleep fade, over the room
  if (!COZY.sleep) return; const u = (t - COZY.sleep) / 2.6, a = Math.min(1, Math.sin(Math.min(1, u) * Math.PI) * 1.4) * 0.85;
  g.fillStyle = `rgba(8,8,24,${a})`; g.fillRect(cam.x, cam.y, VW, VH); g.fillStyle = `rgba(230,230,255,${a})`; g.font = 'bold 26px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center';
  g.fillText('z'.repeat(1 + Math.floor(u * 6) % 3) + 'Z', P.x + 20, P.y - 90 - u * 30); g.textAlign = 'left';
}
/* ----- cooking, the pantry and packed meals ----- */
const canCook = r => Object.keys(r.need).every(k => (HOME.pantry[k] || 0) >= r.need[k]);
function needText(r) { return Object.keys(r.need).map(k => r.need[k] + ' ' + cropImg('crop_' + k + '3', 16)).join(' + '); }
function cookScreen(msg) {
  gardenLoad(); cozyLoad();
  const rows = RECIPES.map(r => `<button class="up shopi" ${canCook(r) ? '' : 'disabled style="opacity:.55"'} onclick="cook('${r.id}')"><span class="meal">${MEAL_ICON[r.id]}</span><b>${esc(r.name)}</b>${needText(r)}<small>${esc(r.perk)}${HOME.meals[r.id] ? ' &middot; ' + HOME.meals[r.id] + ' cooked' : ''}</small></button>`).join('');
  homeScreen(`<h1>Kitchen</h1><p class="tag">Cook what you grow. Pack one meal for your next solo raid: you eat it before the first night and keep its perk all raid.</p>
  <p class="lbl">Pantry: ${pantryLine()}</p><div class="row shopgrid">${rows}</div>${msg ? `<p class="lbl" style="color:#9be37f">${esc(msg)}</p>` : ''}
  <div class="row"><button class="up" onclick="pantryScreen()"><b>Pantry and packed meal</b>${HOME.packed && recipe(HOME.packed) ? esc(recipe(HOME.packed).name) + ' packed' : 'nothing packed'}</button><button onclick="leaveHomeScreen()">Back to the room</button></div>`, 'cook');
}
function cook(id) {
  const r = recipe(id); if (!r || !canCook(r)) return cookScreen(); for (const k in r.need) HOME.pantry[k] -= r.need[k]; cozyLoad(); HOME.meals[id] = (HOME.meals[id] || 0) + 1;
  if (!HOME.packed) HOME.packed = id; homeSave(); try { sfxPlay('gold'); } catch (e) {} cookScreen(r.name + ' cooked' + (HOME.packed === id && HOME.meals[id] === 1 ? ' and packed for your next raid' : ''));
}
function pantryScreen(msg) {
  gardenLoad(); cozyLoad(); const meals = RECIPES.filter(r => HOME.meals[r.id] > 0);
  const rows = meals.map(r => `<button class="up shopi${HOME.packed === r.id ? ' on' : ''}" onclick="packMeal('${r.id}')"><span class="meal">${MEAL_ICON[r.id]}</span><b>${esc(r.name)}</b>${HOME.meals[r.id]} &middot; ${HOME.packed === r.id ? 'packed' : 'pack this one'}<small>${esc(r.perk)}</small></button>`).join('');
  homeScreen(`<h1>Pantry</h1><p class="lbl">Produce: ${pantryLine()}</p><div class="row shopgrid">${rows || '<p class="lbl">No meals yet: cook at a stove, fireplace or worktable.</p>'}</div>
  <p class="lbl">${HOME.restBuff ? 'You are well rested: +1 heart next raid. ' : ''}Packed meals and rest are used in solo raids from the Raid Hut.</p>${msg ? `<p class="lbl" style="color:#9be37f">${esc(msg)}</p>` : ''}
  <div class="row">${HOME.packed ? '<button class="up" onclick="packMeal(null)"><b>Unpack</b></button>' : ''}<button onclick="leaveHomeScreen()">Back</button></div>`, 'pantry');
}
function packMeal(id) { HOME.packed = id && HOME.meals[id] > 0 ? id : null; homeSave(); pantryScreen(id ? recipe(id).name + ' packed' : 'Nothing packed'); }
let mealMsg = '';
function eatMeal() {                                              // newRun (solo raids only): the packed meal and the rested bonus
  mealMsg = ''; if (multi || daily || !HOME) return; cozyLoad(); const bits = [];
  const r = HOME.packed && HOME.meals[HOME.packed] > 0 && recipe(HOME.packed);
  if (r) { r.apply(S); HOME.meals[r.id]--; bits.push(r.name + ': ' + r.perk.toLowerCase()); if (!HOME.meals[r.id]) HOME.packed = null; }
  if (HOME.restBuff) { S.hearts++; HOME.restBuff = 0; bits.push('well rested: +1 heart'); }
  if (bits.length) { hearts = S.hearts; homeSave(); mealMsg = bits.join(' / '); }
}
function mealPop() { if (mealMsg) { pop(P.x, P.y - 100, mealMsg, '#9be37f', true); mealMsg = ''; } }
/* ----- books and tall tales ----- */
const BOOKS = [
  { title: 'The Raccoon Who Counted Stars', text: 'Old Bramble could never sleep before dawn, so she counted the stars instead. One night she got to four hundred and twelve and noticed one was missing. She found it the next morning, shining at the bottom of the well: just the moon\'s little sister, come down for a drink. Bramble lowered a bucket so it could climb home, and ever since, the well water has tasted faintly of silver.' },
  { title: 'A Short History of the Farmer\'s Lantern', text: 'The lantern was a gift from the farmer\'s grandmother, who warned him it would only ever find what wanted to be found. He has never caught a raccoon with it. He has found three lost hens, a wedding ring, and his own good mood on several occasions. He keeps it lit anyway.' },
  { title: 'Ninety-Nine Ways to Carry an Apple', text: 'In the cheek (classic). In both cheeks (ambitious). Balanced on the head (stylish, unreliable). Rolled with the nose (slow but dignified). Tucked under the tail (do not ask). In a borrowed hat. In a friend\'s hat. In the farmer\'s hat, while he is still wearing it (legendary; witnesses disagree). The remaining ninety-one ways are left as an exercise for the reader.' },
  { title: 'The Orchard Remembers', text: 'Trees keep score. Every apple taken is noted in the rings, and every seed dropped far from home is noted too. The oldest tree in the orchard has decided, after much thought, that the raccoons owe it nothing: they have planted half the hillside without ever meaning to.' },
  { title: 'Letters to a Young Gardener', text: 'Dear sprout: water once, then leave it be. A carrot that is stared at grows no faster. Talk to your beets if you must, but keep it light; they are sensitive. And pumpkins, my dear, are a lesson in patience. Plant one, go raiding, and come home to a surprise. Yours in soil, Aunt Marrow.' },
  { title: 'The Dog Who Wanted to Be a Raccoon', text: 'Pepper practised every night: the creep, the crouch, the cheek-full of apples. She was terrible at all of it, and the farmer loved her for it. In the end she settled for wagging at the raccoons from across the field, which they agreed was very sporting of her.' },
  { title: 'On the Proper Way to Visit a Neighbour', text: 'Wipe your paws. Admire the rug, even if it is crooked. If there is a garden, water something. If there is a table, leave a note, so they know you came: something kind, or at least something funny. Never, ever eat the pie on the windowsill, unless it is clearly meant for you, which it usually is.' },
];
function bookScreen(i) {
  COZY.book = ((i % BOOKS.length) + BOOKS.length) % BOOKS.length; const b = BOOKS[COZY.book];
  homeScreen(`<h1>${esc(b.title)}</h1><div class="cards"><div class="card book">${esc(b.text)}</div></div><p class="lbl">Book ${COZY.book + 1} of ${BOOKS.length}</p>
  <div class="row"><button onclick="bookScreen(COZY.book-1)">Previous</button><button onclick="bookScreen(COZY.book+1)">Next book</button><button onclick="leaveHomeScreen()">Put it back</button></div>`, 'book');
}
const TALES = ['They say a raccoon once carried a whole pumpkin home. In one cheek.', 'Once, the farmer\'s dog fell asleep on guard and dreamed of apples. So did everyone.', 'The moon is just a very large golden apple nobody can reach. Yet.',
  'A heron taught me to stand on one leg. I fell into the river. Worth it.', 'Grandpa raccoon swore the scarecrow winked at him. Every. Single. Night.', 'There is a door in the cellar that leads to a second orchard. Or so the yarn goes.'];
/* ----- notes ----- */
function notesScreen(u, msg) {
  cozyLoad(); const p = placedByU(u); if (!p) return leaveHomeScreen(); const ns = notesOn(u), me = myCode(), owner = !isVisiting();
  if (owner) { let ch = 0; ns.forEach(n => { if (!n.seen) { n.seen = 1; ch = 1; } }); if (ch) homeSave(); }
  const list = ns.map(n => `<div class="card note"><b>${esc(n.name || 'Someone')}</b> <small>${esc(ago(n.t))}</small><br>${esc(n.text)}${owner || n.from === me ? `<br><button class="mini" onclick="delNote('${n.id}','${u}')">Remove</button>` : ''}</div>`).join('');
  homeScreen(`<h1>Notes on the ${esc(catItem(p.id).name.toLowerCase())}</h1><div class="cards notes">${list || '<p class="lbl">No notes here yet.</p>'}</div>
  <textarea id="notetxt" maxlength="200" rows="3" placeholder="${isVisiting() ? 'Leave a note for ' + esc(VISIT.name) : 'A note for whoever comes by'}" style="width:min(460px,90%);font:14px 'Trebuchet MS',sans-serif;border-radius:8px;padding:8px"></textarea>
  ${msg ? `<p class="lbl" style="color:#ffd23f">${esc(msg)}</p>` : ''}<div class="row"><button class="up" onclick="pinNote('${u}')"><b>Pin the note</b></button><button onclick="leaveHomeScreen()">Back</button></div>`, 'notes');
}
function ago(ms) { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; }
function noteApply(n, who) {                                      // the owner's game adds a note (n: { id, u, text, from, name, t })
  cozyLoad(); const text = String(n.text || '').trim().slice(0, 200); if (!text || !placedByU(n.u)) return { msg: 'The note blew away' };
  if (HOME.notes.some(q => q.id === n.id)) return { ok: 1, msg: 'Pinned' }; if (HOME.notes.length >= 60) HOME.notes.shift();
  HOME.notes.push({ id: String(n.id).slice(0, 20), u: n.u, text, from: String(n.from || ''), name: String(n.name || '').slice(0, 24), t: +n.t || Date.now(), seen: who ? 0 : 1 }); return { ok: 1, msg: 'Pinned' };
}
function pinNote(u) {
  const el = $('notetxt'), text = el ? el.value.trim() : ''; if (!text) return notesScreen(u, 'Write something first');
  const n = { id: newUid(), u, text, from: myCode(), name: myName(), t: Date.now() };
  if (isVisiting()) return visitNote(n, r => notesScreen(u, r.msg));
  const r = noteApply(n, null); homeSave(); notesScreen(u, r.msg);
}
function noteDelete(id, from) { const n = (HOME.notes || []).find(q => q.id === id); if (!n || (from && n.from !== from)) return { msg: 'Not yours to remove' }; HOME.notes.splice(HOME.notes.indexOf(n), 1); return { ok: 1, msg: 'Removed' }; }
function delNote(id, u) { if (isVisiting()) return socialOp({ k: 'delnote', id }, r => notesScreen(u, r.msg)); const r = noteDelete(id, null); homeSave(); u ? notesScreen(u, r.msg) : mailScreen(); }
function drawNotesOn(p, w, h) {                                   // a pinned paper on the piece (inside drawPlaced's transform: origin at its bottom middle)
  const n = HOME.notes && HOME.notes.filter(q => q.u === p.u).length; if (!n) return; const a = HOME_SRC.note, im = homeImg('note'); if (!a || !im || !im.complete) return;
  for (let i = 0; i < Math.min(3, n); i++) g.drawImage(im, Math.round(w * 0.12 + i * 5 - a.w / 2), Math.round(-h * 0.62 - a.h / 2 + i * 3 - (h > 60 ? 0 : -6)), a.w, a.h);
}
cozyLoad();
