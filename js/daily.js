/* ===== DAILY ORCHARD =====
   One solo run per day with the same orchard, conditions and challenges for everyone (they come from today's date, no server needed). */
let daily = null, lrnd = rnd;                               // lrnd = the random numbers used to lay out the orchard (seeded in a daily run)
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
function dailySeed() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function dailyBest() { try { return +localStorage.getItem('raidDaily' + dailySeed()) || 0; } catch (e) { return 0; } }
function saveDaily() { try { if (score > dailyBest()) localStorage.setItem('raidDaily' + dailySeed(), score); } catch (e) {} return dailyBest(); }
function dailyNight() {                                     // called at the start of every night
  if (!daily) { lrnd = rnd; return; }
  const r = mulberry32(daily.seed * 31 + night * 7919); daily.r = r; lrnd = (a, b) => a + r() * (b - a);
}
const dailyPick = list => list[Math.floor(daily.r() * list.length)];
function playSolo() { daily = null; runMod = null; newRun(); }
function playDaily() { daily = { seed: dailySeed() }; runMod = null; newRun(); }
