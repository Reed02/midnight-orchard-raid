/* ===== MORE DECORATIONS (the turnaround sheets 16-22: tools/make_decor_sheets.py, cut by tools/cut_decor.py) =====
   Each piece has FRONT, SIDE and BACK pictures (art/home/dec_<id>.png, __side, __back), so R / Turn faces it four ways like the other furniture.
   A piece is only offered in the shop once its pictures exist (decorReady), so the list can be ready before the art is.
   Some do something: chairs, benches and swings are seats; the counter cooks; the pantry shelf is the pantry; the desk is for reading; the vanity
   holds your hats; the bunk bed is a bed; the sundial tells the time; the stone well fills your watering can; the berry bush gives berries once a
   day; flower beds, roses and sunflowers count as flowers for beehives; the bird feeder brings birds. */
const DECOR = [
  // the cottage
  { id: 'floorlamp', name: 'Floor lamp', price: 70, mats: { jar: 1 }, where: 'in' }, { id: 'rocker', name: 'Rocking chair', price: 120, mats: { planks: 2 }, where: 'in', use: 'sit' },
  { id: 'sidetable', name: 'Side table', price: 60, mats: { planks: 1 }, where: 'in' }, { id: 'gramophone', name: 'Gramophone', price: 220, mats: { gear: 1 }, where: 'in' },
  { id: 'piano', name: 'Upright piano', price: 600, mats: { planks: 4, gear: 1 }, where: 'in' },
  { id: 'counter', name: 'Kitchen counter', price: 260, mats: { planks: 3 }, where: 'in', use: 'cook' }, { id: 'sink', name: 'Sink with pump', price: 180, mats: { nails: 2 }, where: 'in' },
  { id: 'table', name: 'Round table', price: 120, mats: { planks: 2 }, where: 'in' }, { id: 'chair', name: 'Wooden chair', price: 40, mats: { planks: 1 }, where: 'in', use: 'sit' },
  { id: 'pantryshelf', key: 'pantry', name: 'Pantry shelf', price: 200, mats: { planks: 2, jar: 2 }, where: 'in', use: 'pantry' },
  { id: 'desk', name: 'Writing desk', price: 180, mats: { planks: 3 }, where: 'in', use: 'read' }, { id: 'vanity', name: 'Vanity', price: 220, mats: { planks: 2, jar: 1 }, where: 'in', use: 'dress' },
  { id: 'toychest', name: 'Toy chest', price: 80, mats: { planks: 2 }, where: 'in' }, { id: 'bunk', name: 'Bunk bed', price: 380, mats: { planks: 4, wool: 2 }, where: 'in', use: 'sleep' },
  { id: 'plant', name: 'Tall house plant', price: 90, mats: { seeds: 1 }, where: 'in' },
  // the yard
  { id: 'bench', name: 'Garden bench', price: 90, mats: { planks: 2 }, where: 'out', use: 'sit' }, { id: 'picnic', name: 'Picnic table', price: 160, mats: { planks: 4 }, where: 'out', use: 'sit' },
  { id: 'swing', name: 'Garden swing', price: 200, mats: { rope: 2, planks: 3 }, where: 'out', use: 'sit' }, { id: 'parasol', name: 'Parasol table', price: 150, mats: { wool: 2, planks: 1 }, where: 'out' },
  { id: 'wheelbarrow', name: 'Wheelbarrow', price: 70, mats: { planks: 1, nails: 1 }, where: 'out' },
  { id: 'fence', name: 'Wooden fence', price: 8, where: 'out', fence: 1 }, { id: 'picket', name: 'Picket fence', price: 10, where: 'out', fence: 1 },
  { id: 'stonewall', name: 'Stone wall', price: 6, mats: { stone: 1 }, where: 'out', fence: 1 }, { id: 'hedge', name: 'Hedge', price: 14, where: 'out', fence: 1 },
  { id: 'arch', name: 'Rose arch', price: 140, mats: { planks: 2 }, where: 'out', walk: 1 },
  { id: 'well', name: 'Stone well', price: 250, mats: { stone: 4, rope: 1 }, where: 'out' }, { id: 'birdfeeder', name: 'Bird feeder', price: 60, mats: { seeds: 1 }, where: 'out' },
  { id: 'sundial', name: 'Sundial', price: 120, mats: { stone: 2 }, where: 'out', use: 'clock' }, { id: 'gnome', name: 'Garden gnome', price: 40, where: 'out' },
  { id: 'fountain', name: 'Fountain', price: 400, mats: { stone: 6 }, where: 'out' },
  { id: 'flowerbed', name: 'Raised flower bed', price: 50, mats: { planks: 1 }, where: 'out', bloom: 3 }, { id: 'rosebush', name: 'Rose bush', price: 45, where: 'out', bloom: 2 },
  { id: 'sunflower', name: 'Sunflowers', price: 30, mats: { seeds: 1 }, where: 'out', bloom: 2 }, { id: 'berrybush', name: 'Berry bush', price: 70, mats: { seeds: 2 }, where: 'out' },
  { id: 'topiary', name: 'Topiary', price: 80, where: 'out' }];
DECOR.forEach(d => { const c = Object.assign({ k: 'dec_' + (d.key || d.id), decor: 1 }, d); delete c.use; CAT.push(c); if (d.use) USE[d.id] = d.use; });
const decorReady = c => !c.decor || !!(typeof HOME_SRC !== 'undefined' && HOME_SRC[c.k]);
const DECOR_TIP = { well: 'Fills your watering can.', berrybush: 'Pick berries once a day.', birdfeeder: 'Brings birds to the yard (cosy).', flowerbed: 'Counts as flowers for beehives.', rosebush: 'Counts as flowers for beehives.',
  sunflower: 'Counts as flowers for beehives.', sundial: 'Tells the time.', bench: 'A seat.', picnic: 'A seat.', swing: 'A seat.', rocker: 'A seat.', chair: 'A seat.', counter: 'Cook here.', pantryshelf: 'Your pantry.',
  desk: 'Read here.', vanity: 'Your hats and scarves.', bunk: 'A bed.' };
/* what some of them do outside */
function decorInteractables() {
  if (HOME_IN || isVisiting()) return []; const L = [], today = todayKey();
  (HOME.placed.out || []).forEach(p => {
    if (p.id === 'well') L.push({ id: 'well', soft: 1, x: p.x, y: p.y + 12, r: 46, h: 96, tip: YARD.tool === 'can' && hasTool('can') ? (canLeft() < CAN_MAX ? 'Fill the watering can (' + canLeft() + '/' + CAN_MAX + ')' : 'Stone well: your can is full') : 'Stone well', act: () => YARD.tool === 'can' && hasTool('can') && canLeft() < CAN_MAX ? refillCan('well') : pop(p.x, p.y - 100, hasTool('can') ? 'Pick the watering can to fill it here' : 'A good deep well. A watering can would fill here.', '#cfd8e6') });
    else if (p.id === 'berrybush') L.push({ id: 'berrybush', soft: 1, x: p.x, y: p.y + 12, r: 40, h: 60, tip: HOME.yard.berry && HOME.yard.berry[p.u] === today ? 'Berry bush: picked today' : 'Pick berries', act: () => pickBerries(p) });
  });
  return L;
}
function pickBerries(p) {
  const today = todayKey(); HOME.yard.berry = HOME.yard.berry || {}; if (HOME.yard.berry[p.u] === today) return pop(p.x, p.y - 70, 'Picked today. More tomorrow!', '#cfd8e6');
  HOME.yard.berry[p.u] = today; HOME.forage = HOME.forage || {}; HOME.forage.berries = (HOME.forage.berries || 0) + 2; homeSave(); try { sfxPlay('pickup'); } catch (e) {} pop(p.x, p.y - 70, '+2 berries (sell them at the market crate)', '#9be37f');
}
const _gardenInteractablesD = gardenInteractables; gardenInteractables = function () { return _gardenInteractablesD().concat(decorInteractables()); };
const _bloomD = stationsNear_bloom;                                    // flower beds, roses and sunflowers feed the bees
stationsNear_bloom = function (x, y) { let n = _bloomD(x, y); (HOME.placed.out || []).forEach(p => { const c = catItem(p.id); if (c && c.bloom && Math.hypot(p.x - x, p.y - y) < 5 * TS) n += c.bloom; }); return n; };

/* Placed things whose catalogue entry is not known (yet) are parked in HOME.placedLost instead of thrown away, and come back as soon as
   they are known again. buildLoad used to drop them while it ran, before yard.js and decor.js had added their things to the catalogue,
   so a bench, gnome or compost bin you bought vanished the next time the game loaded. */
function placedSettle() {
  if (typeof HIDE !== 'undefined' && HIDE) return; const lost = Array.isArray(HOME.placedLost) ? HOME.placedLost : []; let ch = 0;
  for (const w of ['out', 'in']) { const keep = []; (HOME.placed[w] || []).forEach(p => { if (catItem(p.id)) keep.push(p); else { lost.push(Object.assign({ w }, p)); ch = 1; } }); HOME.placed[w] = keep; }
  for (let i = lost.length - 1; i >= 0; i--) { const p = lost[i]; if (catItem(p.id)) { const w = p.w === 'in' ? 'in' : 'out'; delete p.w; if (!p.u) p.u = newUid(); HOME.placed[w].push(p); lost.splice(i, 1); ch = 1; } }
  if (lost.length) HOME.placedLost = lost; else delete HOME.placedLost;
  return ch;
}
placedSettle();
