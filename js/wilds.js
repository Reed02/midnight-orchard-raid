/* ===== THE WILDS: one big world you walk across =====
   Leave the homestead by its road and you are out in the Wilds: meadows, forest, roads, the five farms (fenced, with their farmers, dogs, fruit trees
   and loot spots), caves that go down into procedural dungeons (dungeon.js), wild animals, and things to forage. A clock runs: a day is DAY_SEC
   seconds. In DAYLIGHT the farmers see much further, notice you faster, chase hard and set their dogs on you; at NIGHT it is dark (your own glow,
   their lanterns), farmers are slower, and the night animals come out.
   The world is made from a seed (HOME.wild.seed), so it is the same every visit; forage regrows each new day, caves get new layouts each day.
   Your BAG holds apples, materials and forage. Bank it at a farm's stash stump (by its gate) or at home. Caught by a farmer or his dog: you lose a
   heart and your bag and are thrown out at the gate. Out of hearts: you wake at home (the bag is lost, the night is over).
   Locked farms (their project not built yet: World Map) keep their gate shut by the broken cart / bridge / gate / stile.
   Controls: move, E (hold) shake / search / forage / go in, C or the shake key on nothing = swipe, Space = dash (stuns what you dash through),
   F = slingshot (if you have one), M = map, Esc = menu. Solo only for now (co-op later). Tests: tests/wilds_pw.js. */
const WILD = { hearts: [], raid: null, tally: null, climbAt: 0, W: 9600, H: 6400, on: false, built: false, objs: [], grid: new Map(), farms: [], caves: [], stashes: [], paths: [], forage: [], foes: [], spawns: [],
  bag: { apples: [], mats: {}, forage: {} }, hp: 3, inv: 0, swipeT: 0, swipeCd: 0, slingCd: 0, area: '', areaT: 0, chunks: new Map(), msg: '', dg: null, shots: [], fx: [], seen: null };
const DAY_SEC = 720, WCELL = 256, GATE = { x: 1300, y: 1250 };      // your homestead's gate: in the north-west woods, away from every road
const FORAGE = {
  berries:   { name: 'Wild berries', heal: 1, sell: 3, col: '#c2264b' },
  mushrooms: { name: 'Mushrooms', heal: 0, sell: 5, col: '#c9a074' },
  herbs:     { name: 'Herbs', heal: 1, sell: 4, col: '#6fbf4a' },
  nuts:      { name: 'Hazelnuts', heal: 0, sell: 3, col: '#a9773f' },
  glowcap:   { name: 'Glowcaps', heal: 2, sell: 12, col: '#9fe8ff', night: 1 },
};
const FOE = {      // wild animals and cave creatures: hp, speed, how far they notice you, damage, art (fallback drawing until their own pictures exist)
  fox:    { hp: 2, sp: 165, see: 230, dmg: 1, tint: 'fox', h: 40 },
  wolf:   { hp: 3, sp: 182, see: 320, dmg: 1, tint: 'wolf', h: 52, night: 1 },
  snake:  { hp: 1, sp: 260, see: 95, dmg: 1, day: 1 },
  hawk:   { hp: 1, sp: 230, see: 360, dmg: 1, bird: 1, day: 1 },
  owl:    { hp: 1, sp: 210, see: 330, dmg: 1, bird: 1, night: 1 },
  rat:    { hp: 1, sp: 175, see: 260, dmg: 1, cave: 1 },
  bat:    { hp: 1, sp: 150, see: 300, dmg: 1, cave: 1, bird: 1 },
  beetle: { hp: 3, sp: 70, see: 240, dmg: 1, cave: 1, charge: 1 },
  spider: { hp: 2, sp: 95, see: 300, dmg: 1, cave: 1, web: 1 },
  moleking: { hp: 26, sp: 120, see: 900, dmg: 1, cave: 1, boss: 1 },
};
/* ----- seeded randomness ----- */
function wrng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t2 = a; t2 = Math.imul(t2 ^ (t2 >>> 15), t2 | 1); t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), t2 | 61); return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; }; }
function vnoise(x, y, s) { const hsh = (i, j) => { let n = (i * 374761393 + j * 668265263 + s * 982451653) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return hsh(i, j) * (1 - u) * (1 - v) + hsh(i + 1, j) * u * (1 - v) + hsh(i, j + 1) * (1 - u) * v + hsh(i + 1, j + 1) * u * v; }
const forestAt = (x, y) => vnoise(x / 900, y / 900, WILD.seed) * 0.7 + vnoise(x / 300, y / 300, WILD.seed + 7) * 0.3;
/* ----- save ----- */
function wildLoad() {
  const w = HOME.wild && typeof HOME.wild === 'object' ? HOME.wild : {};
  w.seed = w.seed || (Math.floor(Math.random() * 1e9) + 1); w.day = w.day || 1; w.clock = typeof w.clock === 'number' ? w.clock : 0.12; w.found = w.found && typeof w.found === 'object' ? w.found : {};
  w.picked = w.picked && typeof w.picked === 'object' ? w.picked : {}; w.cleared = w.cleared && typeof w.cleared === 'object' ? w.cleared : {}; w.seen = typeof w.seen === 'string' ? w.seen : '';
  if (w.rv !== 2) { w.rv = 2; w.seen = ''; } w.relics = +w.relics || 0; HOME.wild = w; HOME.forage = HOME.forage && typeof HOME.forage === 'object' ? HOME.forage : {}; return w;
}
/* ----- the world ----- */
function wAdd(o) { o.solid = o.solid === undefined ? !!o.r : o.solid; WILD.objs.push(o); const k = Math.floor(o.x / WCELL) + ',' + Math.floor(o.y / WCELL); let a = WILD.grid.get(k); if (!a) WILD.grid.set(k, a = []); a.push(o); return o; }
function wNear(x, y, r) { const out = [], c0 = Math.floor((x - r) / WCELL), c1 = Math.floor((x + r) / WCELL), r0 = Math.floor((y - r) / WCELL), r1 = Math.floor((y + r) / WCELL);
  for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) { const a = WILD.grid.get(i + ',' + j); if (a) for (const o of a) if (!o.gone) out.push(o); } return out; }
function segDist(px, py, a, b) { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l)); return Math.hypot(px - a.x - u * dx, py - a.y - u * dy); }
const onRoad = (x, y, pad = 40) => WILD.paths.some(p => { const b = p.bb; if (b && (x < b[0] - pad || x > b[2] + pad || y < b[1] - pad || y > b[3] + pad)) return false; for (let i = 1; i < p.length; i++) if (segDist(x, y, p[i - 1], p[i]) < pad) return true; return false; });
const farmAt = (x, y, pad = 0) => WILD.farms.find(f => Math.hypot(x - f.x, y - f.y) < f.r + pad);
function wildBuild() {
  const w = wildLoad(); if (WILD.built && WILD.seed === w.seed) return; WILD.seed = w.seed; WILD.built = true;
  WILD.objs = []; WILD.grid = new Map(); WILD.farms = []; WILD.caves = []; WILD.stashes = []; WILD.paths = []; WILD.chunks = new Map(); const R = wrng(w.seed), WW = WILD.W, WH = WILD.H;
  // farms: each one is a RAID GATE where a road reaches the edge of the Wilds, in the same direction as on the World Map (the Orchard's
  // farmhouse sits in the middle, like on the map). Walk to the end of that road and you can raid it, at whatever time of day it is.
  for (const id of SITE_IDS) { const S0 = SITES[id]; let x, y;
    if (id === 'orchard') { x = S0.map[0] * WW; y = S0.map[1] * WH; }
    else { const dx = (S0.map[0] - 0.5) * WW, dy = (S0.map[1] - 0.5) * WH, k = Math.min(Math.abs(dx) > 1 ? (WW / 2 - 380) / Math.abs(dx) : 1e9, Math.abs(dy) > 1 ? (WH / 2 - 440) / Math.abs(dy) : 1e9); x = WW / 2 + dx * k; y = WH / 2 + dy * k; }
    const ga = id === 'orchard' ? Math.atan2(GATE.y - y, GATE.x - x) : Math.atan2(WH / 2 - y, WW / 2 - x);
    WILD.farms.push({ id, x: Math.round(x), y: Math.round(y), r: 0, site: id, ga, gx: Math.round(x), gy: Math.round(y), people: [], edge: id !== 'orchard' }); }
  // roads: a network that joins the farms through crossroads out in the country (a relative-neighbourhood graph: natural, few crossings, some
  // loops), curving gently round the farms. No road comes near your homestead: you have to go out and find one.
  const HOME_R = 850, nodes = WILD.farms.map(f => ({ x: f.x, y: f.y, farm: f }));
  for (let n = 0, k = 0; n < 4000 && k < 6; n++) { const x = 500 + R() * (WW - 1000), y = 450 + R() * (WH - 900);
    if (Math.hypot(x - GATE.x, y - GATE.y) < HOME_R + 300 || WILD.farms.some(f => Math.hypot(x - f.x, y - f.y) < f.r + 650) || nodes.some(q => !q.farm && Math.hypot(x - q.x, y - q.y) < 1500)) continue; nodes.push({ x, y }); k++; }
  const D = (i, j) => Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y), nearHome = (i, j) => segDist(GATE.x, GATE.y, nodes[i], nodes[j]) < HOME_R, edges = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = D(i, j); if (nearHome(i, j) || d > 4200) continue;
    if (!nodes.some((q, c) => c !== i && c !== j && Math.max(D(i, c), D(c, j)) < d)) edges.push([i, j]); }
  { const seen = new Set([0]); let grew = true; while (seen.size < nodes.length && grew) { grew = false; let best = null;          // keep it all joined up
      for (const i of seen) for (let j = 0; j < nodes.length; j++) if (!seen.has(j) && !nearHome(i, j) && (!best || D(i, j) < best[2])) best = [i, j, D(i, j)];
      if (best) { const linked = edges.some(([p, q]) => (p === best[0] && q === best[1]) || (p === best[1] && q === best[0])); if (!linked) edges.push([best[0], best[1]]); }
      const adj = j => edges.filter(e => e[0] === j || e[1] === j).map(e => e[0] === j ? e[1] : e[0]); const st = [...seen]; while (st.length) { const c = st.pop(); for (const j of adj(c)) if (!seen.has(j)) { seen.add(j); st.push(j); grew = true; } } } }
  for (let pass = 0; pass < 8; pass++) { const dead = nodes.findIndex((q, i) => !q.farm && edges.filter(e => e[0] === i || e[1] === i).length === 1);   // no road that just stops in the woods
    if (dead < 0) break; edges.splice(edges.findIndex(e => e[0] === dead || e[1] === dead), 1); }
  nodes.forEach((q, i) => { q.deg = edges.filter(e => e[0] === i || e[1] === i); });
  const outFarms = (p) => { for (const f of WILD.farms) { const d = Math.hypot(p.x - f.x, p.y - f.y); if (d < f.r + 120) { p.x = f.x + (p.x - f.x) / (d || 1) * (f.r + 120); p.y = f.y + (p.y - f.y) / (d || 1) * (f.r + 120); } } };
  const curve = (a, b, wd, sd) => { const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(2, Math.ceil(L / 150)), amp = Math.min(320, L * 0.13), nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; let pts = [{ x: a.x, y: a.y }];
    for (let i = 1; i < n; i++) { const u = i / n, off = (vnoise(u * 2.2 + sd, sd * 1.7, w.seed) - 0.5) * 2 * amp * Math.sin(Math.PI * u); const p = { x: a.x + (b.x - a.x) * u + nx * off, y: a.y + (b.y - a.y) * u + ny * off }; outFarms(p); pts.push(p); }
    pts.push({ x: b.x, y: b.y }); for (let k = 0; k < 2; k++) { const q = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const P0 = pts[i], P1 = pts[i + 1]; q.push({ x: P0.x * 0.75 + P1.x * 0.25, y: P0.y * 0.75 + P1.y * 0.25 }, { x: P0.x * 0.25 + P1.x * 0.75, y: P0.y * 0.25 + P1.y * 0.75 }); } q.push(pts[pts.length - 1]); pts = q; }
    pts.w = wd; pts.bb = [Math.min(...pts.map(q => q.x)), Math.min(...pts.map(q => q.y)), Math.max(...pts.map(q => q.x)), Math.max(...pts.map(q => q.y))]; WILD.paths.push(pts); return pts; };
  edges.forEach(([i, j], k) => curve(nodes[i], nodes[j], 1, k * 3.7 + 1));
  // past each edge gate the road carries on out of the Wilds (the gate stands well inside the edge, so its sign is always readable)
  WILD.farms.forEach((f, k) => { if (!f.edge) return; const ca = -Math.cos(f.ga), sa = -Math.sin(f.ga); let d = 0; while (d < 2000) { const x = f.x + ca * d, y = f.y + sa * d; if (x < -60 || y < -60 || x > WW + 60 || y > WH + 60) break; d += 20; }
    curve(f, { x: f.x + ca * d, y: f.y + sa * d }, 1, 40 + k * 2.3); });
  WILD.junctions = nodes.filter(q => !q.farm && q.deg.length);
  // each raid gate: the gate itself (shut by the broken cart / bridge / gate / stile until that project is built), lanterns, a stash stump and a campfire
  for (const f of WILD.farms) {
    const S0 = SITES[f.id], open = siteOpen(f.id), ca = Math.cos(f.ga), sa = Math.sin(f.ga), px = -sa, py = ca;
    wAdd({ k: 'raidgate', x: f.x, y: f.y, r: 26, farm: f, solid: false });
    if (!open) { const Pj = PROJECTS[S0.need]; wAdd({ k: 'broken', art: Pj && Pj.art ? Pj.art[0] : 'cart_broken', x: f.x + ca * 70, y: f.y + sa * 70, r: 30, farm: f, solid: false }); }
    for (const s2 of [-1, 1]) wAdd({ k: 'decor', art: 'lantern_post', x: f.x + px * 80 * s2 + ca * 30, y: f.y + py * 80 * s2 + sa * 30 + 4, r: 8, lamp: 1 });
    const sx = f.x + ca * 170 + px * 110, sy = f.y + sa * 170 + py * 110;
    WILD.stashes.push(wAdd({ k: 'stash', x: sx, y: sy, r: 18, farm: f, id: 'stash_' + f.id }));
    wAdd({ k: 'decor', art: 'campfire', x: sx + px * 70, y: sy + py * 70 + 10, r: 18, lit: 1 });
    f.patrol = [];
  }
  // the rest: forest where the noise says so (thick away from roads), meadow flowers, rocks, forage, caves
  const clear = (x, y, pad) => x > 80 && y > 80 && x < WW - 80 && y < WH - 80 && Math.hypot(x - GATE.x, y - GATE.y) > 260 && !farmAt(x, y, pad) && !onRoad(x, y, 70) && !wNear(x, y, 90).some(o => o.solid && Math.hypot(o.x - x, o.y - y) < o.r + 34);
  for (let n = 0; n < 9000; n++) { const x = R() * WW, y = R() * WH, f = forestAt(x, y);
    if (f > 0.56 && R() < (f - 0.5) * 2.6 && clear(x, y, 140)) { const big = R() < 0.25; const q = R(), sp = q < 0.03 ? 'dead_tree' : f > 0.62 ? (q < 0.55 ? 'pine' : q < 0.7 ? 'oak' : null) : (q < 0.16 ? 'birch' : q < 0.36 ? 'oak' : q < 0.48 ? 'pine' : null);
      wAdd({ k: 'wtree', x, y, r: big ? 20 : 15, s: big ? 1.3 : 1 + R() * 0.2, v: R(), sp }); }
    else if (f < 0.45 && R() < 0.08 && clear(x, y, 100)) wAdd({ k: 'flower', x, y, art: ['nat_flower2', 'nat_flower3', 'nat_flower5', 'nat_flower10', 'nat_flower16', 'nat_flower20', 'nat_flower23'][Math.floor(R() * 7)] });
    else if (R() < 0.012 && clear(x, y, 100)) wAdd({ k: 'rock', x, y, r: 20, art: ['nat_rock3', 'nat_moss3', 'nat_boulder2', 'adv:rock_big', 'adv:log', 'adv:log'][Math.floor(R() * 6)] });
    else if (R() < 0.02 && clear(x, y, 100)) wAdd({ k: 'flower', x, y, art: 'adv:tall_grass' });
    else if (f > 0.48 && R() < 0.05 && clear(x, y, 100)) wAdd({ k: 'wbush', x, y, r: 28, solid: false }); }
  let fi = 0; for (let n = 0; n < 2600 && fi < 340; n++) { const x = R() * WW, y = R() * WH, f = forestAt(x, y), k = f > 0.6 ? (R() < 0.6 ? 'mushrooms' : R() < 0.5 ? 'glowcap' : 'nuts') : f > 0.45 ? (R() < 0.6 ? 'berries' : 'nuts') : (R() < 0.6 ? 'herbs' : 'berries');
    if (clear(x, y, 120)) WILD.forage.push(wAdd({ k: 'forage', kind: k, x, y, id: 'f' + fi++ })); }
  for (let n = 0, ci = 0; n < 800 && ci < 7; n++) { const x = 400 + R() * (WW - 800), y = 400 + R() * (WH - 800);
    if (forestAt(x, y) > 0.5 && clear(x, y, 500) && Math.hypot(x - GATE.x, y - GATE.y) > 1200 && !WILD.caves.some(c => Math.hypot(c.x - x, c.y - y) < 1500)) WILD.caves.push(wAdd({ k: 'cave', x, y, r: 34, id: 'cave' + ci++ })); }
  for (const c of WILD.caves) { let best = null; for (const p of WILD.paths) if (p.w >= 0.8) for (const q of p) { const d = Math.hypot(q.x - c.x, q.y - c.y - 60); if (!best || d < best[0]) best = [d, q]; }      // a narrow trail from the nearest road to most caves
    if (!best || best[0] > 1500 || R() < 0.25) continue; const tr = curve({ x: c.x, y: c.y + 50 }, best[1], 0.45, c.x * 0.001); c.trail = 1;
    for (const q of tr) for (const o of wNear(q.x, q.y, 70)) if ((o.k === 'wtree' || o.k === 'rock' || o.k === 'wbush' || o.k === 'forage') && Math.hypot(o.x - q.x, o.y - q.y) < 46) o.gone = 1; }
  // where animals live: points around the world (the forest for foxes and wolves, the meadow for snakes and birds), turned on near you
  for (let n = 0; n < 700; n++) { const x = R() * WW, y = R() * WH, f = forestAt(x, y); if (!clear(x, y, 260) || onRoad(x, y, 220)) continue;
    const kind = f > 0.55 ? (R() < 0.55 ? 'wolf' : 'fox') : (R() < 0.45 ? 'snake' : R() < 0.5 ? 'hawk' : R() < 0.5 ? 'owl' : 'fox'); WILD.spawns.push({ x, y, kind, id: n, cool: 0 });
    if (kind === 'wolf' && R() < 0.12) wAdd({ k: 'decor', art: 'wolf_den', x: x + 40, y: y - 30, r: 38 }); }
  for (const q of WILD.junctions) if (q.deg.length >= 2) wAdd({ k: 'decor', art: 'signpost', x: q.x + 70, y: q.y - 50, r: 8, sign: q });
  WILD.seen = new Uint8Array(Math.ceil(WW / 200) * Math.ceil(WH / 200)); const sv = w.seen; for (let i = 0; i < sv.length && i < WILD.seen.length; i++) WILD.seen[i] = sv.charCodeAt(i) === 49 ? 1 : 0;
}
/* ----- day and night ----- */
const wDayness = () => { const c = HOME.wild.clock; return c < 0.06 ? c / 0.06 : c < 0.5 ? 1 : c < 0.6 ? 1 - (c - 0.5) / 0.1 : c < 0.95 ? 0 : (c - 0.95) / 0.05 * 0; };      // 1 = full daylight, 0 = night
const isDay = () => wDayness() > 0.5;
function wTime() { const c = HOME.wild.clock, hh = Math.floor((c * 24 + 6) % 24), mm = Math.floor(((c * 24 + 6) % 1) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
/* ----- going out and coming back ----- */
function setOut(at) {
  wildBuild(); const w = HOME.wild; if (typeof leaveHomeScreen === 'function' && state === 'homemenu') leaveHomeScreen();
  stopTitleArt(); if (typeof BUILD !== 'undefined') BUILD.on = false; state = 'wild'; multi = false; isHost = true; myRole = 'raccoon'; COOP = false; RS = []; $('ov').style.display = 'none'; HOME_IN = false;
  const st = at && WILD.stashes.find(s => s.id === at);
  P = { x: st ? st.x : GATE.x + 70, y: st ? st.y + 50 : GATE.y + 10, tx: 0, ty: 0, face: 1, moving: false, tree: null }; dir = { x: 1, y: 0 }; anim = 0; carry = []; apples = []; farmers = []; dogs = []; pops = []; slam = null;
  S = { carry: 10 + (gearOf() === 'pouch' ? 2 : 0), speed: 215, dashCd: 1.4 }; inv = 1; dashT = 0; dashCd = 0; startleT = 0; alertV = 0; WILD.dg = null; matItems = []; WILD.hearts = []; WILD.raid = null; WILD.tally = null; P.tree = null; climbT = climbCd = 0; shaking = false; shakeTree = null; flash = 0; shakeAmt = 0; mapOpen = false; FX.length = 0; TRAILP.length = 0; RIVER = null; LV = null; strange = null; IN_SAVE = null; HDIG = null; WILD.dead = false; WILD.pepperUsed = 0;
  WILD.hp = WILD.hpMax = 3 + (HOME.rested === todayKey() ? 1 : 0); WILD.bag = { apples: [], mats: {}, forage: {} }; WILD.foes = []; WILD.shots = []; WILD.fx = [];
  for (const f of WILD.farms) wFarmPeople(f); WILD.on = true; buttons(true); cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; last = performance.now(); kickLoop();
  wArea(st ? SITES[st.farm.id].name + ' (stash)' : 'The Wilds', 3); WILD.enterT = t; if (!HOME.seen.wilds) { HOME.seen.wilds = 1; homeSave(); if (tipStore().off) setTimeout(() => wSay(isTouch ? 'Find a road: roads lead to the farms. Shake button: pick and use. Climb button: swipe.' : `Find a road: roads lead to the farms. ${kn('shake')}: pick and use. ${kn('climb')}: swipe. ${kn('dash')}: dash. ${kn('map')}: map.`), 800); }
}
function wFarmPeople(f) { f.people = []; }
function wFarmPeopleOld(f) {                                       // the farm's farmers and dogs (more of them in daylight)
  const S0 = SITES[f.id]; f.people = []; if (!siteOpen(f.id)) return;
  const nF = 2 + (f.id === 'orchard' ? 0 : 1), nD = f.id === 'orchard' ? 1 : 1 + (f.id === 'pumpkin' ? 1 : 0);
  for (let i = 0; i < nF; i++) { const p = f.patrol[i % f.patrol.length]; f.people.push({ kind: 'farmer', x: p.x, y: p.y, face: 0, look: 0, ph: i * 2, wp: i, alert: 0, chase: 0, site: f.id, farm: f }); }
  for (let i = 0; i < nD; i++) { const p = f.patrol[(i + 3) % f.patrol.length]; f.people.push({ kind: 'dog', x: p.x, y: p.y, face: 1, anim: 0, stun: 0, wp: i + 3, chase: 0, farm: f }); }
}
function wBank(where) {                                        // the bag into the homestead (a stash stump or home)
  const B = WILD.bag, ap = B.apples.reduce((s, v) => s + v, 0), mt = Object.values(B.mats).reduce((s, v) => s + v, 0), fg = Object.values(B.forage).reduce((s, v) => s + v, 0);
  if (!ap && !mt && !fg) return false; if (ap) payApples(ap); payMats(B.mats); for (const k in B.forage) HOME.forage[k] = (HOME.forage[k] || 0) + B.forage[k];
  WILD.bag = { apples: [], mats: {}, forage: {} }; homeSave(); try { sfxPlay('bank'); } catch (e) {} if (WILD.raid && ap) wRaidTally();
  pop(P.x, P.y - 60, 'Stashed: ' + [ap ? ap + ' apples' : '', mt ? mt + ' materials' : '', fg ? fg + ' forage' : ''].filter(Boolean).join(', '), '#ffd23f', true); return true;
}
function wildSave() { const w = HOME.wild; if (WILD.seen) { let s = ''; for (let i = 0; i < WILD.seen.length; i++) s += WILD.seen[i] ? '1' : '0'; w.seen = s.replace(/0+$/, ''); } homeSave(); }
function goHomeFromWild(fainted) {
  if (!fainted) wBank('home'); WILD.on = false; WILD.dg = null; if (fainted) { HOME.wild.clock = 0.08; HOME.wild.day++; HOME.wild.picked = {}; }
  wildSave(); buttons(false); enterHome(); if (fainted) pop(P.x, P.y - 90, 'You wake up at home, sore. The bag is gone.', '#ffb3b3', true);
}
/* ----- the frame ----- */
const wildT = () => t - (WILD.enterT || 0);                       // seconds since you came into this area (the Wilds, or a cave floor)
function wrapText(s, maxW) { const out = []; let line = '';     // break a message into lines that fit (uses the current font)
  for (const w of String(s).split(' ')) { const tryL = line ? line + ' ' + w : w; if (line && g.measureText(tryL).width > maxW) { out.push(line); line = w; } else line = tryL; }
  if (line) out.push(line); return out; }
function wSay(m) { WILD.msg = m; WILD.msgT = t + 4.5; }
function wArea(name, s) { if (WILD.area === name) return; WILD.area = name; WILD.areaT = t + (s || 2.5); }
function wHurt(dmg, why, fromX, fromY) {
  if (WILD.inv > 0) return; WILD.hp -= dmg; WILD.inv = 1.3; flash = 0.35; startleT = 0.6; try { sfxPlay('caught'); } catch (e) {}
  if (fromX !== undefined) { const a = Math.atan2(P.y - fromY, P.x - fromX); P.x += Math.cos(a) * 26; P.y += Math.sin(a) * 26; }
  pop(P.x, P.y - 70, why || 'Ouch!', '#ff8f8f', true);
  if (WILD.hp <= 0) { WILD.hp = 0; WILD.bag = { apples: [], mats: {}, forage: {} }; setTimeout(() => goHomeFromWild(true), 900); WILD.dead = true; }
}
function wCaught(f, why) {                                     // a farmer or dog got you: the bag is gone, out at the gate
  if (WILD.inv > 0) return; const F = f.farm, lost = WILD.bag.apples.length; if (P.tree) wOffTree(); slam = null;
  WILD.bag.apples.forEach((v, i) => { const a = Math.random() * 6.283, r = 20 + Math.random() * 40; apples.push({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r * 0.6, gold: v >= 3, t: 0, fall: 0.35 + i * 0.03, kind: 'tree' }); });
  for (const k in WILD.bag.mats) for (let i = 0; i < WILD.bag.mats[k]; i++) matItems.push({ id: k, x: P.x + rnd(-40, 40), y: P.y + rnd(-20, 30), fall: 0.4 }); WILD.bag.apples = []; WILD.bag.mats = {};
  if (WILD.raid) { WILD.raid.caught++; WILD.raid.chain = 0; }
  wHurt(1, why); if (WILD.dead) return; P.x = F.x + Math.cos(F.ga) * (F.r + 70); P.y = F.y + Math.sin(F.ga) * (F.r + 70); WILD.inv = 2.2;
  for (const q of F.people) { q.chase = 0; q.alert = 0; } alertV = 0; wSay(why + (lost ? ' Your apples fell where you were caught: sneak back for them.' : '') + ' You were thrown out at the gate.');
}
function wPush(e, rad) { if (WILD.dg) return dgPush(e, rad); for (const o of wNear(e.x, e.y, rad + 60)) if (o.solid) { const vx = e.x - o.x, vy = e.y - o.y, d = Math.hypot(vx, vy), m = o.r + rad; if (d < m && d > 0.01) { e.x = o.x + vx / d * m; e.y = o.y + vy / d * m; } }
  e.x = clampN(e.x, 40, WILD.W - 40); e.y = clampN(e.y, 60, WILD.H - 30); }
function wSees(f) {                                            // can this farmer see the raccoon? Daylight: much further and wider
  const day = wDayness(), len = (190 + 150 * day), half = 0.45 + 0.2 * day, dx = P.x - f.x, dy = P.y - 15 - f.y, d = Math.hypot(dx, dy);
  if (wInBush() && d > 40) return false; if (d < 46 + 30 * day) return true;          // right next to him: he hears you
  let da = Math.atan2(dy, dx) - f.look; da = Math.atan2(Math.sin(da), Math.cos(da)); if (d > len || Math.abs(da) > half) return false;
  return !wNear((P.x + f.x) / 2, (P.y + f.y) / 2, d / 2 + 40).some(o => o.solid && o.k !== 'fence' && o.k !== 'stash' && segHits(f.x, f.y, P.x, P.y - 15, o.x, o.y, o.r));
}
const wInBush = () => WILD.objs && wNear(P.x, P.y, 60).some(o => (o.k === 'bush' || o.k === 'wbush') && Math.hypot(o.x - P.x, o.y - P.y) < o.r);
function wStep(e, tx, ty, sp, dt, rad) { const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 2) return true; e.x += dx / d * Math.min(d, sp * dt); e.y += dy / d * Math.min(d, sp * dt); if (Math.abs(dx) > 3) e.face = dx > 0 ? 1 : -1; e.look = Math.atan2(dy, dx); wPush(e, rad || 12); return d < 14; }
function wildUpdate(dt) {
  t += dt; const w = HOME.wild; w.clock += dt / DAY_SEC; if (w.clock >= 1) { w.clock -= 1; w.day++; w.picked = {}; wSay('Day ' + w.day + ' dawns.'); for (const f of WILD.farms) wFarmPeople(f); }
  WILD.inv -= dt; inv = WILD.inv > 0 ? WILD.inv : 0; dashCd -= dt; WILD.swipeCd -= dt; WILD.slingCd -= dt; flash = Math.max(0, flash - dt); startleT = Math.max(0, startleT - dt);
  if (WILD.dg) return dgUpdate(dt);
  if (WILD.dead) return; obs = wNear(P.x, P.y, 300).filter(o => o.k === 'bush' || o.k === 'wbush');      // (drawCoon's bush test)
  // walking
  climbCd -= dt; if (slam) { wSlamStep(dt); wFarms(dt); wFoes(dt); wShots(dt); pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0); WILD.fx = WILD.fx.filter(f => (f.l -= dt) > 0); return; }
  const mv = moveVec('raccoon'); let mx = mv.x, my = mv.y; const m = Math.hypot(mx, my); P.moving = m > 0;
  if (P.tree) { climbT -= dt; if (climbT <= 0 || (m && t - WILD.climbAt > 0.35)) wDescend(); else { P.moving = false; anim = 0; mx = my = 0; } }
  WILD.near = null; if (held('shake') && !P.tree && !slam) WILD.near = wInteractable(); const busy = WILD.near && WILD.near.hold;
  if (m && !busy) { mx /= m; my /= m; dir = { x: mx, y: my }; if (mx) P.face = mx > 0 ? 1 : -1; anim += dt * 14; } else { anim = 0; P.moving = false; }
  let sp = S.speed * (1 - 0.025 * WILD.bag.apples.length) * (wInBush() ? 0.6 : 1) * (onRoad(P.x, P.y, 34) ? 1.12 : 1) * ((WILD.slowT || 0) > t ? 0.5 : 1);
  if (dashT > 0) { dashT -= dt; P.x += dir.x * 520 * dt; P.y += dir.y * 520 * dt; wDashHits(); } else if (P.moving) { P.x += mx * sp * dt; P.y += my * sp * dt; }
  wPush(P, 11);
  // E: shake / search / forage / go in
  WILD.hint = P.tree || slam ? null : wInteractable(); if (WILD.near) { wUse(WILD.near, dt); if (WILD.dg || state !== 'wild') return; } else if (WILD.holdO) { WILD.holdO.p = 0; WILD.holdO = null; }
  for (const o of wNear(P.x, P.y, 900)) { if (o.cd > 0) o.cd -= dt; if (o.rustle > 0) o.rustle -= dt; if (o !== WILD.holdO && o.p) o.p = Math.max(0, o.p - dt * 0.6); }
  wPickups(dt);
  carry = WILD.bag.apples;
  // where am I
  if (!HOME.wild.found.road && onRoad(P.x, P.y, 30)) { HOME.wild.found.road = 1; homeSave(); wSay('A road! Follow it to reach the farms.'); }
  const F = farmAt(P.x, P.y); wArea(F ? SITES[F.id].name : onRoad(P.x, P.y, 60) ? 'The road' : forestAt(P.x, P.y) > 0.58 ? 'The deep wood' : 'The Wilds');
  for (const f of WILD.farms) if (!HOME.wild.found[f.id] && Math.hypot(P.x - f.x, P.y - f.y) < 520) { HOME.wild.found[f.id] = 1; homeSave(); wSay('You found the road to ' + SITES[f.id].name + '.'); }
  for (const s of WILD.stashes) if (Math.hypot(s.x - P.x, s.y - P.y) < 60) { if (!HOME.wild.found[s.id]) { HOME.wild.found[s.id] = 1; wSay('Found ' + SITES[s.farm.id].name + '\'s stash stump. Bank your bag here; you can travel back to it from the map.'); homeSave(); } wBank('stash'); }
  if (Math.hypot(P.x - GATE.x, P.y - GATE.y) < 70 && !WILD.leaving) { WILD.leaving = 1; wSay(isTouch ? 'The road home: tap Shake to go home.' : 'The road home: press E to go home.'); } else if (Math.hypot(P.x - GATE.x, P.y - GATE.y) > 110) WILD.leaving = 0;
  const cw0 = Math.ceil(WILD.W / 200), pcx = Math.floor(P.x / 200), pcy = Math.floor(P.y / 200); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const cx2 = pcx + b, cy2 = pcy + a; if (cx2 >= 0 && cx2 < cw0 && cy2 >= 0 && cy2 * cw0 + cx2 < WILD.seen.length) WILD.seen[cy2 * cw0 + cx2] = 1; }
  wFarms(dt); wFoes(dt); wShots(dt);
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0); WILD.fx = WILD.fx.filter(f => (f.l -= dt) > 0);
}
function wRaidCheck() {                                        // stepping through a farm's gate starts a raid there; banking it ends it with a tally
  const F = farmAt(P.x, P.y, -10); if (F && siteOpen(F.id) && (!WILD.raid || WILD.raid.farm !== F)) {
    if (WILD.raid && WILD.raid.apples) return;                   // still carrying another farm's haul: it counts for that raid
    WILD.raid = { farm: F, t0: t, apples: 0, gold: 0, chain: 0, best: 0, lastPick: -9, caught: 0, finds: 0, day: isDay() };
    wArea(SITES[F.id].name, 2.5); wSay((isDay() ? 'A daylight raid: they will see you coming, but you bring home 50% more apples.' : 'A night raid on ' + SITES[F.id].name + '. Shake trees, search loot spots, and climb a tree (' + ctl('climb') + ') to escape dogs.')); }
}
function wRaidPick(v, x, y) {
  const R = WILD.raid; if (!R) return; R.apples += v; if (v >= 3) R.gold++; R.chain = t - R.lastPick < 2.2 ? R.chain + 1 : 1; R.lastPick = t; R.best = Math.max(R.best, R.chain);
  if (R.chain >= 5 && R.chain % 5 === 0) pop(x, y - 40, 'Chain x' + R.chain + '!', '#ffd23f', true);
}
function wRaidTally() {                                         // the end-of-raid tally (like the classic raid's), paid on top of the banked apples
  const R = WILD.raid; if (!R || !R.apples) { WILD.raid = null; return; }
  const chainB = Math.floor(R.best / 5) * 2, dayB = R.day || isDay() ? Math.ceil(R.apples * 0.5) : 0, clean = R.caught ? 0 : Math.ceil(R.apples * 0.2), extra = chainB + dayB + clean;
  if (extra) payApples(extra); const mins = Math.max(1, Math.round((t - R.t0) / 60));
  WILD.tally = { until: t + 7, title: SITES[R.farm.id].name + ' raided!', lines: [['Apples banked', R.apples], ['Golden apples', R.gold], ['Best chain', 'x' + R.best + (chainB ? '  +' + chainB : '')], ['Daylight bonus', dayB ? '+' + dayB : '-'], ['Never caught', R.caught ? 'caught ' + R.caught + 'x' : '+' + clean], ['Finds', R.finds || '-'], ['Time', mins + ' min']], total: R.apples + extra };
  HOME.wild.raids = (HOME.wild.raids || 0) + 1; homeSave(); try { sfxPlay('clear'); } catch (e) {} WILD.raid = null;
}
function wPickups(dt) {
  // pick up what lies around (apples from trees, materials from loot spots)
  for (let i = apples.length - 1; i >= 0; i--) { const a = apples[i]; a.t += dt; a.fall = Math.max(0, a.fall - dt); if (!a.ok) { a.ok = 1; for (let k = 0; k < 3; k++) wPush(a, 18); }   // nothing lands inside a rock, a wall or past the edge
    if (!a.fall && WILD.bag.apples.length < S.carry && Math.hypot(a.x - P.x, a.y - (P.y - 20)) < 32) { WILD.bag.apples.push(a.gold ? 3 : 1); wRaidPick(a.gold ? 3 : 1, a.x, a.y); apples.splice(i, 1); try { sfxPlay('pickup'); } catch (e) {} } }
  for (let i = WILD.hearts.length - 1; i >= 0; i--) { const h = WILD.hearts[i]; if (!h.ok) { h.ok = 1; for (let k = 0; k < 3; k++) wPush(h, 18); } if (Math.hypot(h.x - P.x, h.y - (P.y - 10)) < 30 && WILD.hp < WILD.hpMax) { WILD.hp++; WILD.hearts.splice(i, 1); pop(h.x, h.y - 30, '+1 heart', '#ff9fb2', true); try { sfxPlay('pickup'); } catch (e) {} } }
  for (let i = matItems.length - 1; i >= 0; i--) { const q = matItems[i]; q.fall = Math.max(0, q.fall - dt); if (!q.ok) { q.ok = 1; for (let k = 0; k < 3; k++) wPush(q, 18); } if (!q.fall && Math.hypot(q.x - P.x, q.y - (P.y - 14)) < 32) { WILD.bag.mats[q.id] = (WILD.bag.mats[q.id] || 0) + 1; matItems.splice(i, 1); pop(q.x, q.y - 10, '+1 ' + MATS[q.id].name.toLowerCase(), '#c9e7ff'); } }
}
function wInteractable() {
  if (WILD.dg) return dgInteractable();
  const L = wNear(P.x, P.y, 90); let best = null, bd = 1e9;
  for (const o of L) { const d = Math.hypot(o.x - P.x, o.y - P.y); let ok = false;
    if (o.k === 'tree' && o.fruit) ok = d < o.r + 40 && !(o.cd > 0);
    else if (o.k === 'loot') ok = d < o.r + 36 && !(o.cd > 0);
    else if (o.k === 'forage') ok = d < 46 && !HOME.wild.picked[o.id] && !(FORAGE[o.kind].night && isDay());
    else if (o.k === 'cave') ok = d < 80; else if (o.k === 'broken') ok = d < 90; else if (o.k === 'raidgate') ok = d < 110;
    if (ok && d < bd) { bd = d; best = o; } }
  if (!best && Math.hypot(P.x - GATE.x, P.y - GATE.y) < 80) best = { k: 'gate' };
  if (best) best.hold = best.k === 'tree' || best.k === 'loot'; return best;
}
function wUse(o, dt) {
  if (o.k === 'forage') { if (WILD.pickedNow === o.id) return; WILD.pickedNow = o.id; HOME.wild.picked[o.id] = 1; if (o.kind === 'berries' || o.kind === 'herbs' || o.kind === 'nuts') wFx('leaves', o.x, o.y + 4, 0.5); const F0 = FORAGE[o.kind], n = 1 + (Math.random() < 0.4 ? 1 : 0);
    if (F0.heal && WILD.hp < WILD.hpMax) { WILD.hp = Math.min(WILD.hpMax, WILD.hp + F0.heal); pop(o.x, o.y - 40, 'Mmm. +' + F0.heal + ' heart', '#ff9fb2', true); }
    else { WILD.bag.forage[o.kind] = (WILD.bag.forage[o.kind] || 0) + n; pop(o.x, o.y - 40, '+' + n + ' ' + F0.name.toLowerCase(), F0.col); } try { sfxPlay('pickup'); } catch (e) {} return; }
  if (o.k === 'cave') { keys[BIND.shake[0]] = false; keys.__shake = false; return dgEnter(o); }
  if (o.k === 'gate') { keys[BIND.shake[0]] = false; keys.__shake = false; return goHomeFromWild(false); }
  if (o.k === 'raidgate') { keys[BIND.shake[0]] = false; keys.__shake = false; return wildRaidPrompt(o.farm); }
  if (o.k === 'broken') { if (WILD.saidLock !== o) { WILD.saidLock = o; const Pj = PROJECTS[SITES[o.farm.id].need]; wSay(SITES[o.farm.id].name + ' is shut. Build the ' + (Pj ? Pj.name.toLowerCase() : 'way in') + ' from the World Map in your Raid Hut to open it.'); } return; }
  // hold: shake a fruit tree / search a loot spot (noisy: nearby farmers turn to look)
  WILD.holdO = o; o.rustle = 0.2; o.p = (o.p || 0) + dt / (o.k === 'loot' ? 1.4 : 1.1);
  if (o.p > 0.4 && !o.noisy) { o.noisy = 1; for (const q of o.farm.people) if (q.kind === 'farmer' && Math.hypot(q.x - o.x, q.y - o.y) < 260 + 140 * wDayness()) q.look = Math.atan2(o.y - q.y, o.x - q.x); }
  if (o.p >= 1) { o.p = 0; o.noisy = 0; o.cd = 75; WILD.holdO = null; if (o.k === 'tree') wFx('leaves', o.x, o.y - 40, 0.6);
    if (o.k === 'tree') { const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) apples.push({ x: o.x + rnd(-55, 55), y: o.y + rnd(14, 54), gold: Math.random() < 0.12, t: 0, fall: 0.5 + i * 0.1, kind: 'tree' }); }
    else { if (Math.random() < 0.06) { const d = grantFind('raccoon', 'strange', false); if (d) { pop(o.x, o.y - 90, 'A find: ' + d.name + '! (Collection)', '#b28cff', true); if (WILD.raid) WILD.raid.finds++; } }
      const S0 = SITES[o.site], n = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < n; i++) { const id = S0.rare && Math.random() < 0.15 ? S0.rare : S0.pool[Math.floor(Math.random() * S0.pool.length)]; matItems.push({ id, x: o.x + rnd(-40, 40), y: o.y + rnd(18, 46), fall: 0.45 }); } }
    try { sfxPlay('shake'); } catch (e) {} }
}
function wDashHits() { if (WILD.dg) dgDashWalls(); for (const e of (WILD.dg ? WILD.dg.foes : WILD.foes)) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 34 && !(e.hitT > t)) wHit(e, 1, 1.2); }
function wTreeNear() { if (WILD.dg) return null; let best = null, bd = 1e9; for (const o of wNear(P.x, P.y, 80)) if (o.k === 'tree' && o.farm) { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < o.r + 34 && d < bd) { bd = d; best = o; } } return best; }
function wClimb() {                                             // up a farm tree: dogs cannot reach you (they wait at the foot); farmers still see you, and can shake you down
  if (P.tree) return wDescend(); if (climbCd > 0 || slam || WILD.dead) return false; const o = wTreeNear(); if (!o) return false;
  P.tree = o; P.x = o.x; P.y = o.y + 2; climbT = CONFIG.climb.maxTime; WILD.climbAt = t; dashT = 0; try { sfxAt('climb', P.x, P.y, 300); } catch (e) {} return true;
}
function wOffTree() { const o = P.tree; if (!o) return; P.tree = null; P.x = o.x; P.y = o.y + o.r + 14; }
function wDescend() { wOffTree(); climbCd = CONFIG.climb.cooldown; }
function wSlam() {                                              // the cannonball: leap from the tree at the nearest dog (or wild animal) and stun it
  const o = P.tree; if (!o) return; let tgt = null, bd = CONFIG.slam.radius;
  for (const q of farmersNear()) if (q.kind === 'dog') { const d = Math.hypot(q.x - o.x, q.y - o.y); if (d < bd) { bd = d; tgt = q; } }
  for (const e of WILD.foes) if (!e.dead && !FOE[e.kind].bird) { const d = Math.hypot(e.x - o.x, e.y - o.y); if (d < bd) { bd = d; tgt = e; } }
  slam = { t: 0, from: { x: o.x, y: o.y }, dog: tgt, tx: tgt ? tgt.x : o.x, ty: tgt ? tgt.y : o.y + o.r + 26 }; P.tree = null;
}
function wSlamStep(dt) {
  const s = slam; P.moving = false; s.t += dt / CONFIG.slam.time; if (s.dog) { s.tx = s.dog.x; s.ty = s.dog.y; }
  const u = Math.min(1, s.t); P.x = s.from.x + (s.tx - s.from.x) * u; P.y = s.from.y + (s.ty - s.from.y) * u;
  if (s.t >= 1) { let hit = false;
    for (const q of farmersNear()) if (q.kind === 'dog' && Math.hypot(q.x - P.x, q.y - P.y) < 55) { q.stun = CONFIG.slam.stun; q.chase = 0; hit = true; }
    for (const e of WILD.foes) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 55) { wHit(e, 2, 2); hit = true; }
    pop(P.x, P.y - 40, hit ? 'BONK!' : 'miss', hit ? '#ffd23f' : '#ccc'); wFx('dust', P.x, P.y + 6, 0.45); climbCd = CONFIG.climb.cooldown; WILD.inv = Math.max(WILD.inv, 0.4); slam = null; wPush(P, 11); }
}
function wSwipe() {
  if (P.tree) return wDescend(); if (!WILD.dg && wClimb()) return;
  if (WILD.swipeCd > 0 || WILD.dead) return; WILD.swipeCd = 0.42; WILD.swipeT = t; const fx = dir.x, fy = dir.y; try { sfxPlay('swipe'); } catch (e) {}
  const L = WILD.dg ? WILD.dg.foes : WILD.foes; for (const e of L) { if (e.dead) continue; const dx = e.x - P.x, dy = e.y - (P.y - 8), d = Math.hypot(dx, dy); if (d < 58 && (dx * fx + dy * fy) / (d || 1) > -0.2) wHit(e, 1, 0.35); }
  if (WILD.dg) dgSwipeWalls(fx, fy); else for (const q of farmersNear()) if (Math.hypot(q.x - P.x, q.y - P.y) < 50) { q.alert = 1; q.chase = 6; }
}
function wHit(e, dmg, stun) {
  e.hp -= dmg; e.hitT = t + 0.25; e.stun = Math.max(e.stun || 0, stun || 0); const a = Math.atan2(e.y - P.y, e.x - P.x); e.x += Math.cos(a) * 18; e.y += Math.sin(a) * 18;
  wFx('hit', e.x, e.y - 8, 0.25); if (e.hp <= 0) { e.dead = true; e.deadT = t; wFx('poof', e.x, e.y + 10, 0.5); pop(e.x, e.y - 30, e.boss ? 'Defeated!' : 'Poof!', '#ffe9a8', !!e.boss); if (e.onDie) e.onDie(e); else { if (Math.random() < (WILD.dg ? 0.16 - 0.03 * WILD.dg.floor : 0.1)) WILD.hearts.push({ x: e.x, y: e.y }); else if (Math.random() < 0.35) wDrop(e.x, e.y); } }
}
function wDrop(x, y) { const k = Math.random() < 0.5 ? 'apple' : 'mat'; if (k === 'apple') apples.push({ x, y, gold: false, t: 0, fall: 0.3, kind: 'tree' }); else matItems.push({ id: MAT_IDS[Math.floor(Math.random() * 5)], x, y, fall: 0.3 }); }
function wSling() {
  if (gearOf() !== 'sling') return wSay('No slingshot: make one at a workbench.'); if (WILD.slingCd > 0) return; WILD.slingCd = 1.1;
  WILD.shots.push({ x: P.x, y: P.y - 20, vx: dir.x * 520, vy: dir.y * 520, l: 0.65, mine: 1 }); try { sfxPlay('sling'); } catch (e) {}
}
function wShots(dt) {
  const L = WILD.dg ? WILD.dg.foes : WILD.foes;
  for (const s of WILD.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.l -= dt;
    if (s.mine) { for (const e of L) if (!e.dead && Math.hypot(e.x - s.x, e.y - 18 - s.y) < 22) { wHit(e, 1, 0.6); s.l = 0; break; }
      if (!WILD.dg) for (const q of farmersNear()) if (q.kind === 'farmer' && Math.hypot(q.x - s.x, q.y - 30 - s.y) < 20) { q.dazed = t + 3; s.l = 0; pop(q.x, q.y - 70, 'dazed!', '#ffd23f'); } else if (q.kind === 'dog' && Math.hypot(q.x - s.x, q.y - 18 - s.y) < 22) { q.stun = 2.5; s.l = 0; } }
    else if (Math.hypot(P.x - s.x, P.y - 18 - s.y) < 18) { s.l = 0; if (s.web) { WILD.slowT = t + 2; pop(P.x, P.y - 60, 'Sticky!', '#e8e8f0'); } else wHurt(s.dmg || 1, 'Ow!', s.x, s.y); }
    if (WILD.dg && dgWall(s.x, s.y)) s.l = 0; else if (!WILD.dg && wNear(s.x, s.y, 40).some(o => o.solid && o.k !== 'fence' && Math.hypot(o.x - s.x, o.y - s.y) < o.r)) s.l = 0; }
  WILD.shots = WILD.shots.filter(s => s.l > 0);
}
const farmersNear = () => { const out = []; for (const f of WILD.farms) if (f.people && Math.hypot(f.x - P.x, f.y - P.y) < f.r + 900) out.push(...f.people); return out; };
function wFarms(dt) {
  const day = wDayness(); let top = 0;
  for (const f of WILD.farms) { if (!f.people || Math.hypot(f.x - P.x, f.y - P.y) > f.r + 1100) continue; const inF = Math.hypot(P.x - f.x, P.y - f.y) < f.r + 20;
    for (const q of f.people) {
      if (q.kind === 'farmer') {
        if ((q.dazed || 0) > t) { q.look += dt * 3; continue; }
        const sees = inF && WILD.inv <= 0 && !WILD.dead && wSees(q);
        if (sees) { q.alert = Math.min(1.2, q.alert + dt * (0.75 + 1.4 * day)); q.lx = P.x; q.ly = P.y; } else q.alert = Math.max(0, q.alert - dt * 0.35);
        if (q.alert >= 1 && sees) { if (!q.chase) { pop(q.x, q.y - 80, day > 0.5 ? 'HEY! Get off my land!' : 'Who\'s there?!', '#ff8f8f', true); for (const o of f.people) if (o !== q) { o.chase = Math.max(o.chase, day > 0.5 ? 6 : 3); o.lx = P.x; o.ly = P.y; } } q.chase = day > 0.5 ? 8 : 4; }
        top = Math.max(top, inF ? q.alert : 0);
        const out = Math.hypot(q.x - f.x, q.y - f.y) > f.r - 30;
        if (q.chase > 0) { q.chase -= dt; const tx = sees ? P.x : q.lx, ty = sees ? P.y : q.ly; if (out && !inF) q.chase = 0; else wStep(q, tx, ty, 110 + 60 * day, dt, 12); if (Math.hypot(P.x - q.x, P.y - q.y) < (P.tree ? 36 : 28) && inF && !slam) wCaught(q, P.tree ? 'The farmer shook you out of the tree!' : 'The farmer grabbed you!'); q.mv = 1; }
        else { const p = f.patrol[q.wp % f.patrol.length]; if (wStep(q, p.x, p.y, 62 + 30 * day, dt, 12)) q.wp = (q.wp + 1 + Math.floor(Math.random() * 3)) % f.patrol.length; q.mv = 1;
          q.look += Math.sin(t * 1.3 + q.ph) * dt * (0.6 + 0.6 * day); }
      } else {
        if (q.stun > 0) { q.stun -= dt; continue; } q.anim = (q.anim || 0) + dt * 12;
        const d = Math.hypot(P.x - q.x, P.y - q.y), smell = (150 + 110 * day) * (gearOf() === 'socks' ? 0.72 : 1);
        if (P.tree && inF && d < smell * 1.3) { q.chase = 1; const a = t * 1.5 + q.wp; wStep(q, P.x + Math.cos(a) * 46, P.y + 30 + Math.sin(a) * 20, 120, dt, 12); if (Math.floor(t * 2 + q.wp) % 4 === 0 && Math.random() < 0.02) pop(q.x, q.y - 50, 'Grrr!', '#ffd23f'); continue; }      // up a tree: the dog waits at the foot
        if (inF && WILD.inv <= 0 && !WILD.dead && !slam && (d < smell && !wInBush() || q.chase > 0)) { if (!q.chase && d < smell) pop(q.x, q.y - 50, 'Woof!', '#ffd23f'); q.chase = Math.max(q.chase - dt, d < smell ? 3 : 0); wStep(q, P.x, P.y, 150 + 45 * day, dt, 12);
          if (d < 26) { if (gearOf() === 'pepper' && !WILD.pepperUsed) { WILD.pepperUsed = 1; q.stun = 3; pop(q.x, q.y - 50, 'Achoo!', '#ffd23f'); } else wCaught(q, 'The dog got you!'); } }
        else { q.chase = 0; const p = f.patrol[q.wp % f.patrol.length]; if (wStep(q, p.x, p.y, 90, dt, 12)) q.wp = (q.wp + 2) % f.patrol.length; }
      } } }
  alertV = top;
}
function wFoes(dt) {
  const day = isDay(), L = WILD.foes;
  for (const s of WILD.spawns) { const d = Math.hypot(s.x - P.x, s.y - P.y), Fd = FOE[s.kind];
    if (d < 1300 && d > 650 && !s.live && s.cool < t && !(Fd.night && day) && !(Fd.day && !day) && L.length < 14) { s.live = 1; const n = s.kind === 'wolf' ? 2 + (s.id % 2) : 1;
      for (let i = 0; i < n; i++) L.push({ kind: s.kind, x: s.x + i * 30, y: s.y + i * 20, hp: Fd.hp, face: 1, anim: 0, home: s, st: 'idle', t0: Math.random() * 6, stun: 0 }); } }
  for (const e of L) { if (e.dead) continue; const Fd = FOE[e.kind], d = Math.hypot(P.x - e.x, P.y - e.y);
    if (Math.hypot(e.x - P.x, e.y - P.y) > 1700 || (Fd.night && day) || (Fd.day && !day)) { e.dead = true; e.home.live = 0; continue; }
    if (e.stun > 0) { e.stun -= dt; continue; } e.anim += dt * 12; const hidden2 = wInBush() && d > 50;
    if (Fd.bird) {                                               // circles high, then swoops at you (a shadow on the ground warns you)
      e.t0 += dt; if (e.st === 'idle') { const a = e.t0 * 0.8; e.x = e.home.x + Math.cos(a) * 160; e.y = e.home.y + Math.sin(a) * 100; e.alt = 70; if (d < Fd.see && !hidden2 && e.t0 > 3) { e.st = 'aim'; e.t1 = t + 0.9; e.tx = P.x; e.ty = P.y; } }
      else if (e.st === 'aim') { e.tx = P.x; e.ty = P.y; if (t > e.t1) e.st = 'dive'; }
      else if (e.st === 'dive') { const done = wStep(e, e.tx, e.ty, Fd.sp, dt, 2); e.alt = Math.max(0, e.alt - dt * 160); if (d < 26 && e.alt < 30) { wHurt(Fd.dmg, e.kind === 'owl' ? 'Talons!' : 'The hawk struck!', e.x, e.y); e.st = 'up'; e.t1 = t + 1.6; } else if (done) { e.st = 'up'; e.t1 = t + 1.6; } }
      else { e.alt = Math.min(70, e.alt + dt * 80); e.x += (e.home.x - e.x) * dt * 0.8; e.y += (e.home.y - e.y) * dt * 0.8; if (t > e.t1) { e.st = 'idle'; e.t0 = 0; } }
      continue; }
    if (e.kind === 'snake') { if (e.st === 'idle' && d < Fd.see) { e.st = 'lunge'; e.t1 = t + 0.35; e.tx = P.x; e.ty = P.y; pop(e.x, e.y - 30, 'Hsss!', '#b7e07a'); }
      if (e.st === 'lunge') { wStep(e, e.tx, e.ty, Fd.sp, dt, 8); if (d < 22) wHurt(1, 'A snake bite!', e.x, e.y); if (t > e.t1) { e.st = 'rest'; e.t1 = t + 1.4; } }
      else if (e.st === 'rest' && t > e.t1) e.st = 'idle'; continue; }
    const chase = !hidden2 && WILD.inv <= 0 && (d < Fd.see || (e.st === 'chase' && d < Fd.see * 1.6)) && !onRoad(P.x, P.y, 26);      // animals don't follow you onto the road
    if (chase) { if (e.st !== 'chase') pop(e.x, e.y - 50, e.kind === 'wolf' ? 'Awooo!' : 'Yip!', '#ffd23f'); e.st = 'chase'; wStep(e, P.x, P.y, Fd.sp * (e.kind === 'wolf' && !day ? 1 : 1), dt, 12); if (d < 26) wHurt(Fd.dmg, e.kind === 'wolf' ? 'The wolf bit you!' : 'The fox bit you!', e.x, e.y); }
    else { e.st = 'idle'; e.t0 += dt; const a = e.t0 * 0.4 + e.home.id; wStep(e, e.home.x + Math.cos(a) * 120, e.home.y + Math.sin(a * 1.3) * 90, 60, dt, 12); } }
  for (const e of L) if (e.dead && !e.gone) { e.gone = 1; e.home.live = 0; e.home.cool = t + 90; }
  WILD.foes = L.filter(e => !e.dead || t - (e.deadT || 0) < 0.5);
}
/* ----- drawing ----- */
const wImgK = k => { const a = typeof HOME_SRC !== 'undefined' && HOME_SRC[k]; if (!a) return null; const im = homeImg(k); return im && im.complete && im.naturalWidth ? im : null; };
const AIMG = {};
function advImg(k) { const a = typeof ADV_SRC !== 'undefined' && ADV_SRC[k]; if (!a) return null; if (!AIMG[k]) { const im = new Image(); im.src = a.src; AIMG[k] = im; } return AIMG[k].complete && AIMG[k].naturalWidth ? AIMG[k] : null; }
function advDraw(k, x, y, flip, sc, lift) {                    // an adventure picture standing on (x, y); false if it is not there
  const im = advImg(k); if (!im) return false; const s = sc || 1, w = im.naturalWidth * s, h = im.naturalHeight * s; g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y - (lift || 0)));
  if (flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); return true;
}
function advPose(e) {                                           // which picture of a creature: hurt, attack, or by where it is going (side / toward you / away)
  const dx = e.x - (e.lx ?? e.x), dy = e.y - (e.ly ?? e.y); e.lx = e.x; e.ly = e.y; const mv = Math.hypot(dx, dy);
  if (mv > 0.3) { e.mvx = dx; e.mvy = dy; e.mvT = t; } const moving = t - (e.mvT || -9) < 0.15;
  if (e.dead || e.stun > 0 || e.hitT > t + 0.05) return 'hurt';
  if (['dive', 'lunge', 'charge', 'aim'].includes(e.st) || (e.kind === 'spider' && (e.cd || 9) > 1.9) || (e.st === 'chase' && Math.hypot(P.x - e.x, P.y - e.y) < 60)) return 'attack';
  if (moving && Math.abs(e.mvy) > Math.abs(e.mvx) * 1.3) return e.mvy > 0 ? 'front' : 'back'; return 'side';
}
function advFrame(e, pose, moving) {                          // the animation frame (walk / run / flap / slither / idle) if this creature has them
  const K = e.kind, F = FOE[K], cyc = (name, n, rate) => { const q = K + '__' + name + (1 + Math.floor((e.anim || 0) * rate) % n); return advImg(q) ? q : null; };
  if (F.bird && K !== 'bat' && pose !== 'attack' && pose !== 'hurt') return cyc('fly', 4, e.st === 'dive' ? 0 : 0.55);
  if (K === 'bat' && pose !== 'hurt' && pose !== 'attack') return cyc('fly', 4, 1.2);
  if (pose !== 'side') return null;
  if (K === 'snake') return moving ? cyc('fly', 4, 0.6) : (advImg('snake__idle1') ? 'snake__idle' + (1 + Math.floor(t * 2 + e.x) % 2) : null);
  if (!moving) return null; const fast = e.st === 'chase' || e.st === 'charge';
  return (fast && cyc('run', K === 'spider' ? 1 : 2, 0.7)) || cyc('walk', 4, 0.6);
}
function swayKey(base, o, near) {                              // a plant's sway frame from the wind (left / upright / right); shaken when you push through it
  if (!advImg(base + '__up')) return null; const dPl = Math.hypot(P.x - o.x, P.y - o.y);
  if ((near || 0) > dPl && P.moving) { o.shakeT = t + 0.5; } if ((o.shakeT || 0) > t) return base + '__shake' + (1 + Math.floor(t * 8) % 2);
  const w = Math.sin(t * 0.9 + o.x * 0.013 + o.y * 0.007) + Math.sin(t * 2.3 + o.x * 0.05) * 0.25; return base + '__' + (w < -0.55 ? 'left' : w > 0.55 ? 'right' : 'up');
}
function windAt(x, y) {                                          // the wind, -1..1: a slow swell rolling across the forest (neighbours lean together), stronger in gusts
  const swell = Math.sin(t * 0.55 + x * 0.0016 + y * 0.0009) * 0.75 + Math.sin(t * 0.23 + x * 0.0007) * 0.25;
  const gust = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.09 + x * 0.0004 - y * 0.0003));
  return swell * gust;
}
const SWAYF = {};
function swayFrames(base) {                                       // the many-frame sway set (tools/cut_sway.py), once every frame has loaded
  if (SWAYF[base]) return SWAYF[base]; if (typeof ADV_SRC === 'undefined' || !ADV_SRC[base + '__s1']) return null;
  const ks = Object.keys(ADV_SRC).filter(k => k.startsWith(base + '__s') && /__s\d+$/.test(k)); if (!ks.every(k => advImg(k))) return null;
  return (SWAYF[base] = ks.sort((a, b) => ADV_SRC[a].lean - ADV_SRC[b].lean));
}
const BASEX = new Map(), BASEC = new Map();
function trunkX(im) {                                            // where the trunk / stems meet the ground in a picture (its bottom rows' middle), worked out once
  if (BASEX.has(im)) return BASEX.get(im); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); BASEC.set(im, c);
  const h = c.height, y0 = Math.floor(h * 0.9), d = x.getImageData(0, y0, c.width, h - y0).data; let sx = 0, n = 0;
  for (let i = 3, p = 0; i < d.length; i += 4, p++) if (d[i] > 0) { sx += p % c.width; n++; } const v = n ? sx / n : c.width / 2; BASEX.set(im, v); return v;
}
const BENT = new Map();
function bentPic(im, base, L, dark, tall) {                       // the picture bent so its top sits L px sideways (rows slid along a smooth curve; the base stays put), made once per L
  const key = base + '|' + L + '|' + (dark ? 1 : 0); let c = BENT.get(key); if (c) return c;
  trunkX(im); let src = BASEC.get(im) || im; const W = im.naturalWidth, H = im.naturalHeight, M = Math.abs(L) + 1;
  c = document.createElement('canvas'); c.width = W + 2 * M; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; if (dark) x.filter = 'brightness(.88)';
  for (let yy = 0; yy < H; yy++) { const f = 1 - (yy + 0.5) / H; x.drawImage(src, 0, yy, W, 1, M + Math.round(L * f * f * (tall ? 1 : 0.9)), yy, W, 1); }
  c.M = M; if (BENT.size > 600) BENT.delete(BENT.keys().next().value); BENT.set(key, c); return c;
}
function drawSway(base, o, x, y, sc, flip, near, dark) {             // a plant bending in the wind: ONE picture, its rows slid sideways more the higher they are (the base stays put)
  const im = advImg(base) || advImg(base + '__up'); if (!im) return false; sc = sc || 1;
  const H = im.naturalHeight, ax = trunkX(im), tall = base === 'oak' || base === 'pine' || base === 'birch' || base === 'dead_tree';
  if ((near || 0) > Math.hypot(P.x - o.x, P.y - o.y) && P.moving && !((o.shakeT || 0) > t - 0.35)) o.shakeT = t;      // pushed through: a quick wobble that settles
  const since = t - (o.shakeT || -99), wob = since < 1.6 ? Math.sin(since * 17) * Math.exp(-since * 3.2) * (tall ? 0.04 : 0.16) * H : 0;
  const L = Math.round(windAt(o.x, o.y) * (tall ? 0.055 : 0.11) * H + wob), c = bentPic(im, base, L, dark, tall);
  g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false;
  g.drawImage(c, Math.round(-(ax + c.M) * sc), Math.round(-H * sc), Math.round(c.width * sc), Math.round(H * sc)); g.restore(); return true;
}
function advFoe(e, fl) {
  let pose = advPose(e); const F = FOE[e.kind], bird = F.bird; if (bird && (pose === 'front' || pose === 'back') && advImg(e.kind + '__fly1')) pose = 'side'; const side = pose === 'side' || pose === 'attack' || pose === 'hurt', flip = side && (e.face || 1) < 0 && !(pose === 'hurt' && false);
  if (e.mvx && side) e.face = e.mvx > 0 ? 1 : e.mvx < 0 ? -1 : e.face;
  let k = e.kind + '__' + pose; if (!advImg(k)) return false; const moving = t - (e.mvT || -9) < 0.15;
  const fk = advFrame(e, pose, moving), anim2 = !!(fk && advImg(fk)); if (anim2) k = fk;
  const alt = bird ? (e.alt || 0) + (e.kind === 'bat' ? 16 + Math.sin(t * 9 + e.t0) * 4 : 6) : 0, bob = !bird && moving && !anim2 ? Math.abs(Math.sin(e.anim * 0.9)) * 2.5 : 0;
  const im = advImg(k); shadow(e.x, e.y, Math.min(34, im.naturalWidth * 0.3)); if (fl) g.filter = 'brightness(2.6)'; advDraw(k, e.x, e.y + 3, flip, 1, alt + bob); g.filter = 'none'; return true;
}
const TINTED = {};
function tintedDog(kind) {                                      // the dog's walk recoloured as a fox / a wolf (until they have their own pictures)
  if (TINTED[kind]) return TINTED[kind]; const s = IMG.dogWalk; if (!s || !s.naturalWidth) return null; const c = document.createElement('canvas'); c.width = s.naturalWidth; c.height = s.naturalHeight; const x = c.getContext('2d'); x.drawImage(s, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11);
    if (kind === 'wolf') { const v = l * 0.82; p[i] = v * 0.95; p[i + 1] = v; p[i + 2] = v * 1.12; } else { p[i] = Math.min(255, l * 1.45 + 20); p[i + 1] = l * 0.62; p[i + 2] = l * 0.25; } }
  x.putImageData(d, 0, 0); c.naturalWidth = c.width; c.naturalHeight = c.height; return (TINTED[kind] = c);
}
// Roads are filled shapes, not fat round-capped lines: the width wanders a little, a road that stops (a cave trail, the Orchard's lane)
// narrows to a soft point over its last stretch, and grass tufts and dirt specks break up the edges so the road fades into the meadow.
function roadPrep(p) {
  if (p.L) return; let L = 0; p.s = [0]; for (let i = 1; i < p.length; i++) { L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); p.s.push(L); } p.L = L;
  p.n = p.map((q, i) => { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: -(b.y - a.y) / d, y: (b.x - a.x) / d }; });
  const near = (o, q) => Math.hypot(o[0].x - q.x, o[0].y - q.y) < 40 || Math.hypot(o[o.length - 1].x - q.x, o[o.length - 1].y - q.y) < 40 ||
    (o.bb && q.x > o.bb[0] - 40 && q.x < o.bb[2] + 40 && q.y > o.bb[1] - 40 && q.y < o.bb[3] + 40 && o.some(r => Math.hypot(r.x - q.x, r.y - q.y) < 40));
  const joined = q => q.x < 0 || q.y < 0 || q.x > WILD.W || q.y > WILD.H || WILD.paths.some(o => o !== p && near(o, q));
  p.open0 = !joined(p[0]); p.open1 = !joined(p[p.length - 1]);
}
function roadHalf(p, i, wd) {
  const s = p.s[i], q = p[i], wob = 1 + (vnoise(q.x / 90, q.y / 90, WILD.seed + 11) - 0.5) * 0.22, ease = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  let k = 1; if (p.open0) k *= 0.18 + 0.82 * ease(s / 160); if (p.open1) k *= 0.18 + 0.82 * ease((p.L - s) / 160);
  return wd * (p.w || 1) / 2 * wob * k;
}
function roadShape(x, p, wd, ox, oy) {
  x.beginPath(); for (let i = 0; i < p.length; i++) { const h = roadHalf(p, i, wd); x[i ? 'lineTo' : 'moveTo'](p[i].x + p.n[i].x * h - ox, p[i].y + p.n[i].y * h - oy); }
  for (let i = p.length - 1; i >= 0; i--) { const h = roadHalf(p, i, wd); x.lineTo(p[i].x - p.n[i].x * h - ox, p[i].y - p.n[i].y * h - oy); } x.closePath(); x.fill();
  for (const [i, open] of [[0, p.open0], [p.length - 1, p.open1]]) if (!open) { x.beginPath(); x.arc(p[i].x - ox, p[i].y - oy, roadHalf(p, i, wd), 0, 7); x.fill(); }   // where roads meet, fill the joint
}
function roadEdges(x, vis, ox, oy, S) {
  for (const p of vis) { const rr = wrng(Math.round(p[0].x * 13 + p[0].y * 7) + WILD.seed);
    for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], seg = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(seg / 9);
      for (let j = 0; j < n; j++) { const u = j / n, X = a.x + (b.x - a.x) * u, Y = a.y + (b.y - a.y) * u, side = rr() < 0.5 ? -1 : 1, r1 = rr(), r2 = rr();
        if (X < ox - 60 || X > ox + S + 60 || Y < oy - 60 || Y > oy + S + 60) continue;
        const nx = p.n[i].x, ny = p.n[i].y, h = roadHalf(p, i, 64), o1 = h * (0.78 + r1 * 0.3), ex = X + nx * side * o1 - ox, ey = Y + ny * side * o1 - oy;
        if (r2 < 0.62) {                                                    // grass creeping over the edge, in the colour of the ground there
          const f = forestAt(X, Y), g2 = vnoise(X / 60, Y / 60, WILD.seed + 3), v = Math.max(0, Math.min(1, (f - 0.42) / 0.2));
          x.fillStyle = `rgb(${Math.round(98 + g2 * 16 - v * 50)},${Math.round(150 + g2 * 18 - v * 62)},${Math.round(70 + g2 * 12 - v * 26)})`;
          x.beginPath(); x.ellipse(ex, ey, 4 + r1 * 7, 3 + r2 * 4, r1 * 3, 0, 7); x.fill();
          x.fillStyle = 'rgba(40,80,26,.55)'; x.fillRect(ex - 1, ey - 5 - r2 * 4, 2, 5 + r2 * 4); x.fillRect(ex + 3, ey - 3 - r1 * 3, 2, 3 + r1 * 3);
        } else { const o2 = h * (1.05 + r1 * 0.45); x.fillStyle = 'rgba(150,112,66,.55)'; x.fillRect(X + nx * side * o2 - ox, Y + ny * side * o2 - oy, 3, 2); }   // dirt kicked into the grass
      } } }
}
function wChunk(cx, cy) {                                      // the ground of one 512 x 512 piece of the world (cached)
  const key = cx + ',' + cy; let c = WILD.chunks.get(key); if (c) return c; const S = 512; c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const ox = cx * S, oy = cy * S;
  for (let j = 0; j < S; j += 8) for (let i = 0; i < S; i += 8) { const X = ox + i, Y = oy + j, f = forestAt(X, Y), n = vnoise(X / 60, Y / 60, WILD.seed + 3);
    const u = Math.max(0, Math.min(1, (f - 0.42) / 0.2)), v2 = u * u * (3 - 2 * u), col = [104 + n * 16 - v2 * 52, 158 + n * 18 - v2 * 66, 74 + n * 12 - v2 * 28]; x.fillStyle = `rgb(${col.map(Math.round).join(',')})`; x.fillRect(i, j, 8, 8); }
  const gm = advImg('g_meadow'); if (gm) { x.globalCompositeOperation = 'soft-light'; x.globalAlpha = 0.9; for (let j = -((oy) % 256); j < S; j += 256) for (let i = -((ox) % 256); i < S; i += 256) x.drawImage(gm, i, j); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
  const tile = !gm && wImg('md_tile'); if (tile) { x.globalAlpha = 0.28; for (let j = -((oy) % 256); j < S; j += 256) for (let i = -((ox) % 256); i < S; i += 256) x.drawImage(tile, i, j); x.globalAlpha = 1; }
  for (const F of WILD.farms) { if (Math.abs(F.x - ox - 256) > F.r + 300 || Math.abs(F.y - oy - 256) > F.r + 300) continue; const S0 = SITES[F.id], t2 = S0.art.tile && wImg(S0.art.tile);
    x.save(); x.beginPath(); x.arc(F.x - ox, F.y - oy, F.r, 0, 7); x.clip(); x.fillStyle = S0.ground || '#79b957'; x.fillRect(0, 0, S, S); if (t2) { x.globalAlpha = S0.tileAlpha || 0.85; for (let j = -((oy) % 256) - 256; j < S; j += 256) for (let i = -((ox) % 256) - 256; i < S; i += 256) x.drawImage(t2, i, j, 256, 256); } x.restore(); }
  x.lineCap = 'round'; x.lineJoin = 'round'; const rd = advImg('g_road'), rp = rd && x.createPattern(rd, 'repeat'); if (rp) rp.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, -ox % 128, -oy % 128]));
  const vis = WILD.paths.filter(p => !(p.bb && (p.bb[2] < ox - 120 || p.bb[0] > ox + S + 120 || p.bb[3] < oy - 120 || p.bb[1] > oy + S + 120))); vis.forEach(roadPrep);
  for (const [wd, col] of [[64, '#7a5a33'], [54, rp || '#b8945e'], [30, rp ? null : '#c9a873']]) { if (!col) continue; x.fillStyle = col; for (const p of vis) roadShape(x, p, wd, ox, oy); }
  roadEdges(x, vis, ox, oy, S);
  const rr = wrng(cx * 7919 + cy * 104729 + WILD.seed); x.fillStyle = 'rgba(30,60,20,.35)'; for (let i = 0; i < 70; i++) { const X = rr() * S, Y = rr() * S; x.fillRect(X, Y, 2, 6); x.fillRect(X + 4, Y + 2, 2, 4); }
  if (typeof ADV_SRC !== 'undefined' && ADV_SRC.g_meadow && (!gm || !rd)) return c;          // the textures are still loading: draw it again next frame
  if (WILD.chunks.size > 60) WILD.chunks.delete(WILD.chunks.keys().next().value); WILD.chunks.set(key, c); return c;
}
function wObjRect(o) {                                          // the size of a thing's picture, for see-through (null: small, never hides you)
  if (o.k === 'tree') return null; if (o.k === 'wtree') { const im = o.sp && (advImg(o.sp + '__up') || advImg(o.sp)); if (im) { const sc = o.s * 0.85; return [im.naturalWidth * sc * 0.8, im.naturalHeight * sc]; } return [96 * o.s, 128 * o.s]; }
  const k = o.art || o.sp || o.k, im = typeof advImg === 'function' && advImg(k); if (im) { const sc = o.s || 1; return [im.naturalWidth * sc, im.naturalHeight * sc]; }
  const a = typeof HOME_SRC !== 'undefined' && HOME_SRC[k]; if (a) return [a.w, a.h]; if ((o.r || 0) >= 30) return [o.r * 2.6, o.r * 3.2 + 30]; return null;
}
function wDrawObj(o) {
  const k = o.k;
  if (k === 'tree') { if (IMG.treeRustle && IMG.treeRustle.naturalWidth) return drawRustleTree(o); return; }
  if (k === 'loot' || k === 'stone' || k === 'bush' || k === 'landmark' || k === 'extra') { const sv = siteId; setSite(o.site); try { if (!drawSiteThing(o)) drawScenery(o); } finally { setSite(sv); } if (o.p > 0) wBar(o.x, o.y - 70, o.p); return; }
  if (k === 'wtree' && o.sp && advImg(o.sp + '__up')) { const sc = o.s * 0.85, im = advImg(o.sp + '__up'); shadow(o.x, o.y + 2, im.naturalWidth * sc * 0.28); drawSway(o.sp, o, o.x, o.y + 4, sc, false, 0, o.v > 0.7); return; }
  if (k === 'wtree' && o.sp && advImg(o.sp)) { let fr = swayKey(o.sp, o); if (fr && !advImg(fr)) fr = null; const im = advImg(fr || o.sp), sc = o.s * (o.sp === 'dead_tree' ? 0.95 : 0.85); shadow(o.x, o.y + 2, im.naturalWidth * sc * 0.28); g.save(); g.translate(o.x, o.y + 4); if (!fr) g.transform(1, 0, Math.sin(t * 0.8 + o.x) * 0.012, 1, 0, 0);
    if (o.v > 0.7 && o.sp !== 'dead_tree') g.filter = 'brightness(.88)'; g.imageSmoothingEnabled = false; g.drawImage(im, -im.naturalWidth * sc / 2, -im.naturalHeight * sc, im.naturalWidth * sc, im.naturalHeight * sc); g.restore(); return; }
  if (k === 'wtree') { const i = IMG.tree; if (!i || !i.naturalWidth) return; const h = 128 * o.s, w2 = i.naturalWidth / i.naturalHeight * h; shadow(o.x, o.y + 2, w2 * 0.32); g.save(); g.translate(o.x, o.y + 4); g.transform(1, 0, Math.sin(t * 0.8 + o.x) * 0.012, 1, 0, 0); g.imageSmoothingEnabled = false;
    if (o.v > 0.6) g.filter = 'hue-rotate(-18deg) brightness(.85)'; else if (o.v < 0.2) g.filter = 'saturate(.8) brightness(1.08)'; g.drawImage(i, -w2 / 2, -h, w2, h); g.restore(); return; }
  if (k === 'wbush') { const i = IMG.bush; if (i && i.naturalWidth) { shadow(o.x, o.y, 26); g.drawImage(i, o.x - 36, o.y - 62, 72, 68); } return; }
  if (k === 'decor') { if (o.lit !== undefined && o.art === 'campfire' && isDay()) return advDraw('campfire_out', o.x, o.y + 4) || true; let ak = o.art === 'campfire' && advImg('campfire__f1') ? 'campfire__f' + (1 + Math.floor(t * 8 + o.x) % 4) : o.art; if (!advImg(ak)) ak = o.art; const im = advImg(ak); if (im && o.r) shadow(o.x, o.y, im.naturalWidth * 0.33); advDraw(ak, o.x, o.y + 4, o.flip); return; }
  if (k === 'rock' || k === 'flower') { if (o.art.startsWith('adv:')) { const ak = o.art.slice(4), im = advImg(ak); if (im && k === 'rock') shadow(o.x, o.y, im.naturalWidth * 0.36); drawSway(ak, o, o.x, o.y + 3, 1, o.x % 2 > 1, 34) || advDraw(ak, o.x, o.y + 3, o.x % 2 > 1); return; } const im = wImgK(o.art); if (!im) return; const a = HOME_SRC[o.art]; if (k === 'rock') shadow(o.x, o.y, a.w * 0.36); g.drawImage(im, Math.round(o.x - a.w / 2), Math.round(o.y - a.h + 2)); return; }
  if (k === 'fence' && advImg('fence_post')) { const n = { x: -Math.sin(o.a) * 15, y: Math.cos(o.a) * 15 }; g.strokeStyle = '#4a321c'; g.lineWidth = 5; g.beginPath(); g.moveTo(o.x - n.x, o.y - 20 - n.y); g.lineTo(o.x + n.x, o.y - 20 + n.y); g.moveTo(o.x - n.x, o.y - 9 - n.y); g.lineTo(o.x + n.x, o.y - 9 + n.y); g.stroke();
    g.strokeStyle = '#8a5f36'; g.lineWidth = 3; g.beginPath(); g.moveTo(o.x - n.x, o.y - 21 - n.y); g.lineTo(o.x + n.x, o.y - 21 + n.y); g.moveTo(o.x - n.x, o.y - 10 - n.y); g.lineTo(o.x + n.x, o.y - 10 + n.y); g.stroke(); advDraw('fence_post', o.x, o.y + 2); return; }
  if (k === 'fence') { g.fillStyle = '#5b3d22'; g.fillRect(o.x - 3, o.y - 30, 6, 30); g.fillStyle = '#7a5532'; g.fillRect(o.x - 3, o.y - 30, 6, 4); const n = { x: -Math.sin(o.a) * 15, y: Math.cos(o.a) * 15 }; g.strokeStyle = '#6b4a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(o.x - n.x, o.y - 22 - n.y); g.lineTo(o.x + n.x, o.y - 22 + n.y); g.moveTo(o.x - n.x, o.y - 10 - n.y); g.lineTo(o.x + n.x, o.y - 10 + n.y); g.stroke(); return; }
  if (k === 'raidgate') { const f = o.farm, S0 = SITES[f.id], open = siteOpen(f.id);
    if (f.id === 'orchard') { const im = wImgK('cottage'); if (im) { const a = HOME_SRC.cottage; shadow(o.x, o.y - 70, a.w * 0.4); g.drawImage(im, Math.round(o.x - a.w / 2), Math.round(o.y - 70 - a.h)); } }
    shadow(o.x, o.y, 50); advDraw('farm_gate', o.x, o.y + 6, false, 1.5) || advDraw('home_gate', o.x, o.y + 6);
    g.font = 'bold 14px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; const lbl = S0.name + (open ? '' : ' (shut)'), lw = g.measureText(lbl).width + 16;
    const lx = clampN(o.x, cam.x + lw / 2 + 6, cam.x + VW - lw / 2 - 6), ly = Math.max(o.y - 104, cam.y + 140); g.fillStyle = 'rgba(40,24,10,.85)'; g.fillRect(lx - lw / 2, ly, lw, 22); g.fillStyle = open ? '#ffe9a8' : '#bbb'; g.fillText(lbl, lx, ly + 16); g.textAlign = 'left'; return; }
  if (k === 'broken') { const im = wImgK(o.art); if (im) { const a = HOME_SRC[o.art]; shadow(o.x, o.y, a.w * 0.4); g.drawImage(im, Math.round(o.x - a.w / 2), Math.round(o.y - a.h + 4)); } return; }
  if (k === 'stash' && advImg('stash')) { shadow(o.x, o.y, 22); advDraw('stash', o.x, o.y + 6); g.fillStyle = HOME.wild.found[o.id] ? '#ffd23f' : 'rgba(255,255,255,.6)'; g.font = 'bold 11px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('stash', o.x, o.y - 50); g.textAlign = 'left'; return; }
  if (k === 'stash') { const im = wImgK('logs_c') || wImgK('logs_b'); if (im) { const a = HOME_SRC[wImgK('logs_c') ? 'logs_c' : 'logs_b']; shadow(o.x, o.y, a.w * 0.4); g.drawImage(im, Math.round(o.x - a.w / 2), Math.round(o.y - a.h + 4)); }
    g.fillStyle = HOME.wild.found[o.id] ? '#ffd23f' : 'rgba(255,255,255,.6)'; g.font = 'bold 11px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('stash', o.x, o.y - 44); g.textAlign = 'left'; return; }
  if (k === 'forage') { const pk = HOME.wild.picked[o.id], night = FORAGE[o.kind].night && isDay();
    if (advImg(o.kind)) { if (night && !pk) return; const base = pk || night ? o.kind + '_picked' : o.kind; if (!pk && !night && o.kind === 'berries' && drawSway('berries', o, o.x, o.y + 3, 1, o.x % 2 > 1, 30)) return; advDraw(pk || night ? o.kind + '_picked' : o.kind === 'glowcap' && advImg('glowcap__f1') ? 'glowcap__f' + (1 + Math.floor(t * 3 + o.x) % 4) : o.kind, o.x, o.y + 3, o.x % 2 > 1) || advDraw(base, o.x, o.y + 3, o.x % 2 > 1); if (!pk && Math.floor(t * 2 + o.x) % 4 === 0) { g.fillStyle = 'rgba(255,255,220,.9)'; g.fillRect(o.x + 12, o.y - 22, 2, 2); } return; }
    if (pk) return; wDrawForage(o); return; }
  if (k === 'cave' && advImg('cave_mouth')) { const cl = HOME.wild.cleared[o.id] === HOME.wild.day; shadow(o.x, o.y + 4, 54); advDraw(cl ? 'cave_mouth_cleared' : 'cave_mouth', o.x, o.y + 8);
    if (cl) { g.fillStyle = '#ffd23f'; g.font = 'bold 12px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('cleared today', o.x, o.y - 86); g.textAlign = 'left'; } return; }
  if (k === 'cave') { shadow(o.x, o.y + 4, 50); g.fillStyle = '#5c5a52'; g.beginPath(); g.ellipse(o.x, o.y - 18, 58, 46, 0, Math.PI, 0); g.lineTo(o.x + 58, o.y + 4); g.lineTo(o.x - 58, o.y + 4); g.fill();
    g.fillStyle = '#76736a'; for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; g.beginPath(); g.arc(o.x + Math.cos(a) * 52, o.y - 18 + Math.sin(a) * 40, 12, 0, 7); g.fill(); }
    g.fillStyle = '#0d0b0a'; g.beginPath(); g.ellipse(o.x, o.y - 6, 30, 28, 0, Math.PI, 0); g.lineTo(o.x + 30, o.y + 4); g.lineTo(o.x - 30, o.y + 4); g.fill();
    if (HOME.wild.cleared[o.id] === HOME.wild.day) { g.fillStyle = '#ffd23f'; g.font = 'bold 12px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('cleared today', o.x, o.y - 72); g.textAlign = 'left'; } return; }
}
function wDrawForage(o) {                                      // little drawn plants until their own pictures exist
  const F0 = FORAGE[o.kind], x = Math.round(o.x), y = Math.round(o.y); if (F0.night && isDay()) return;
  if (o.kind === 'berries') { g.fillStyle = '#2f6b2a'; g.beginPath(); g.ellipse(x, y - 10, 18, 13, 0, 0, 7); g.fill(); g.fillStyle = '#3f8a35'; g.beginPath(); g.ellipse(x - 4, y - 14, 10, 7, 0, 0, 7); g.fill(); g.fillStyle = F0.col; [[-8, -12], [5, -16], [9, -7], [-2, -5], [-11, -4]].forEach(([a, b]) => g.fillRect(x + a, y + b, 4, 4)); }
  else if (o.kind === 'mushrooms' || o.kind === 'glowcap') { const c = o.kind === 'glowcap' ? '#7fd8f0' : '#b5543b'; if (o.kind === 'glowcap') { g.fillStyle = 'rgba(160,240,255,.18)'; g.beginPath(); g.arc(x, y - 8, 22 + Math.sin(t * 3 + x) * 3, 0, 7); g.fill(); }
    [[-7, 0, 1], [6, -2, 0.8], [0, 3, 0.7]].forEach(([a, b, s]) => { g.fillStyle = '#efe3c8'; g.fillRect(x + a - 2 * s, y + b - 8 * s, 4 * s, 8 * s); g.fillStyle = c; g.beginPath(); g.ellipse(x + a, y + b - 9 * s, 8 * s, 5 * s, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + a - 3 * s, y + b - 12 * s, 2, 2); }); }
  else if (o.kind === 'herbs') { g.strokeStyle = '#4f9b36'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 3, y); g.quadraticCurveTo(x + i * 6, y - 10, x + i * 7, y - 18); g.stroke(); } g.fillStyle = '#8fdc5e'; g.fillRect(x - 9, y - 18, 4, 3); g.fillRect(x + 6, y - 17, 4, 3); }
  else if (o.kind === 'nuts') { g.fillStyle = '#5a3a1a'; g.fillRect(x - 12, y - 2, 24, 3); g.fillStyle = F0.col; [[-8, -6], [0, -8], [7, -5]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a, y + b, 4, 0, 7); g.fill(); }); g.fillStyle = '#6fa046'; g.fillRect(x - 2, y - 13, 5, 3); }
  if (Math.floor(t * 2 + o.x) % 4 === 0) { g.fillStyle = 'rgba(255,255,220,.85)'; g.fillRect(x + 10, y - 20, 2, 2); }
}
function wBar(x, y, p) { g.fillStyle = 'rgba(10,20,30,.7)'; g.fillRect(x - 22, y, 44, 7); g.fillStyle = '#ffd23f'; g.fillRect(x - 21, y + 1, 42 * Math.min(1, p), 5); }
function wDrawFoe(e) {
  const Fd = FOE[e.kind], fl = e.hitT > t && Math.floor(t * 30) % 2; if (e.dead) g.globalAlpha = Math.max(0, 1 - (t - e.deadT) * 2);
  if (e.kind !== 'moleking' && advFoe(e, fl)) { g.globalAlpha = 1; return; }
  if (Fd.tint) { const s = tintedDog(Fd.tint); if (s) { const fw = s.width / DOG_FRAMES, fh = s.height, h = Fd.h, w2 = fw / fh * h; shadow(e.x, e.y, h * 0.32); g.save(); g.translate(e.x, e.y + 4); if (e.face < 0) g.scale(-1, 1); g.imageSmoothingEnabled = false; if (fl) g.filter = 'brightness(2.5)';
    g.drawImage(s, (Math.floor(e.anim) % DOG_FRAMES) * fw, 0, fw, fh, -w2 / 2, -h, w2, h); g.restore(); } }
  else if (Fd.bird) { const alt = e.alt || 0; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(e.x, e.y, 14, 5, 0, 0, 7); g.fill(); const im = wImg('bird_1'), sc = e.kind === 'bat' ? 1.1 : 1.8;
    if (e.kind === 'bat') { g.save(); g.translate(e.x, e.y - 26 - alt); const fa = Math.sin(t * 22) * 6; g.fillStyle = '#3a2e44'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, -6 - fa); g.lineTo(-10, 4); g.lineTo(0, 2); g.lineTo(10, 4); g.lineTo(18, -6 - fa); g.closePath(); g.fill(); g.fillStyle = '#ff6a6a'; g.fillRect(-3, -2, 2, 2); g.fillRect(2, -2, 2, 2); g.restore(); }
    else if (im) { g.save(); g.translate(e.x, e.y - 10 - alt); if (e.face < 0) g.scale(-1, 1); g.filter = (e.kind === 'owl' ? 'sepia(1) hue-rotate(-20deg) brightness(.8)' : 'sepia(.8) hue-rotate(-10deg) saturate(1.6)') + (fl ? ' brightness(2.5)' : ''); g.drawImage(im, -im.width * sc / 2, -im.height * sc, im.width * sc, im.height * sc); g.restore(); } }
  else if (e.kind === 'snake') { g.strokeStyle = fl ? '#fff' : '#5f8f2e'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 8; i++) { const x = e.x - e.face * i * 5, y = e.y - 4 + Math.sin(t * 8 + i) * 3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.fillStyle = '#3e6a1c'; g.beginPath(); g.arc(e.x + e.face * 3, e.y - 5, 5, 0, 7); g.fill(); g.lineCap = 'butt'; }
  else dgDrawFoe(e, fl);
  g.globalAlpha = 1; g.filter = 'none';
}
function wildDraw() {
  if (WILD.dg) return dgDraw();
  const ww = WILD.W, wh = WILD.H; cam.x = clampN(cam.x + (P.x - VW / 2 - cam.x) * 0.12, 0, ww - VW); cam.y = clampN(cam.y + (P.y - 30 - VH / 2 - cam.y) * 0.12, 0, wh - VH);
  g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); g.imageSmoothingEnabled = false;
  for (let cy = Math.floor(cam.y / 512); cy <= Math.floor((cam.y + VH) / 512); cy++) for (let cx = Math.floor(cam.x / 512); cx <= Math.floor((cam.x + VW) / 512); cx++) g.drawImage(wChunk(cx, cy), cx * 512, cy * 512);
  // the gate home
  if (advImg('home_gate')) { advDraw('home_gate', GATE.x, GATE.y + 6); g.fillStyle = '#ffe9a8'; g.font = 'bold 12px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('Home', GATE.x, GATE.y - 96); g.textAlign = 'left'; } else {
  g.fillStyle = '#8a6a3f'; g.fillRect(GATE.x - 50, GATE.y - 70, 8, 70); g.fillRect(GATE.x + 42, GATE.y - 70, 8, 70); g.fillRect(GATE.x - 54, GATE.y - 78, 108, 12); g.fillStyle = '#ffe9a8'; g.font = 'bold 12px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('Home', GATE.x, GATE.y - 84); g.textAlign = 'left'; }
  const vis = wNear(cam.x + VW / 2, cam.y + VH / 2, Math.max(VW, VH) * 0.75 + 120), list = [];
  for (const o of vis) { if (o.k === 'flower') { wDrawObj(o); continue; } list.push({ y: o.k === 'landmark' ? o.y + 20 : o.y, f: () => { const r = wObjRect(o); if (r) seeThru(o, o.x, o.y, r[0], r[1], () => wDrawObj(o)); else wDrawObj(o); } }); }
  apples.forEach(a => list.push({ y: a.y, f: () => drawApple(a) })); matItems.forEach(m => list.push({ y: m.y, f: () => { const im = iconImg(MATS[m.id].icon); if (im && im.complete) { shadow(m.x, m.y + 10, 10); g.drawImage(im, m.x - 14, m.y - 18 - (m.fall / 0.45) * 50, 28, 28); } } }));
  for (const f of WILD.farms) if (f.people) for (const q of f.people) { if (Math.abs(q.x - cam.x - VW / 2) > VW || Math.abs(q.y - cam.y - VH / 2) > VH) continue;
    if (q.kind === 'farmer') list.push({ y: q.y, f: () => { const sv = siteId; setSite(q.site); q.face = q.look; try { drawFarmer(q); } finally { setSite(sv); } if (q.alert > 0.05) { g.fillStyle = '#222'; g.fillRect(q.x - 16, q.y - 92, 32, 5); g.fillStyle = q.chase > 0 ? '#ff5252' : '#ffd23f'; g.fillRect(q.x - 15, q.y - 91, 30 * Math.min(1, q.alert), 3); } if ((q.dazed || 0) > t) stars({ x: q.x, y: q.y - 30 }); } });
    else list.push({ y: q.y, f: () => drawDog(q) }); }
  WILD.foes.forEach(e => list.push({ y: e.y, f: () => wDrawFoe(e) })); WILD.hearts.forEach(h => list.push({ y: h.y, f: () => wDrawHeart(h) }));
  list.push({ y: P.y + (P.tree ? 30 : 0), f: () => { const sv = carry; carry = WILD.bag.apples.slice(0, 6); S.carry = Math.max(6, S.carry); try { drawCoon(); } finally { carry = sv; } } });
  list.sort((a, b) => a.y - b.y).forEach(i => i.f());
  // view cones (daylight: a pale wedge of sight; night: the lantern)
  for (const f of WILD.farms) if (f.people) for (const q of f.people) if (q.kind === 'farmer' && !((q.dazed || 0) > t) && Math.abs(q.x - cam.x - VW / 2) < VW) { const day = wDayness(), len = 190 + 150 * day, half = 0.45 + 0.2 * day;
    g.fillStyle = q.chase > 0 ? 'rgba(255,80,60,.18)' : day > 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(255,240,170,.22)'; g.beginPath(); g.moveTo(q.x, q.y - 20); g.arc(q.x, q.y - 20, len, q.look - half, q.look + half); g.closePath(); g.fill(); }
  WILD.shots.forEach(s => { g.fillStyle = s.web ? '#eee' : '#d9cbb0'; g.beginPath(); g.arc(s.x, s.y, s.web ? 5 : 3.5, 0, 7); g.fill(); });
  wDrawSwipe(); wDrawFx();
  if (WILD.hint && WILD.hint.k !== 'gate') { const o = WILD.hint, txt = (isTouch ? 'Shake: ' : 'E: ') + ({ tree: 'shake (hold)' + (isTouch ? ' · Climb: climb' : ' · C: climb'), loot: 'search (hold)', forage: 'pick ' + FORAGE[o.kind || 'berries'].name.toLowerCase(), cave: 'go down into the cave', broken: 'it is shut', raidgate: 'raid ' + (o.farm ? SITES[o.farm.id].name : '') }[o.k] || '');
    g.font = 'bold 13px "Trebuchet MS",sans-serif'; const w2 = g.measureText(txt).width + 18; g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(o.x - w2 / 2, o.y - 110, w2, 22); g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.fillText(txt, o.x, o.y - 95); g.textAlign = 'left'; }
  if (P.tree) { const txt = isTouch ? 'Dash: cannonball onto a dog · Climb: climb down' : 'Space: cannonball onto a dog · C: climb down'; g.font = 'bold 13px "Trebuchet MS",sans-serif'; const w2 = g.measureText(txt).width + 18; g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(P.x - w2 / 2, P.y - 150, w2, 22); g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.fillText(txt, P.x, P.y - 135); g.textAlign = 'left'; }
  drawPops(false); g.restore();
  wNight(); wHud(); tipTick(); drawTip(); g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); drawPops(true); g.restore(); drawSpeaker(); drawPause();
}
function wFx(name, x, y, dur, flip) { WILD.fx.push({ k: 'spr', s: name, x, y, t0: t, dur, l: dur, flip }); }
function wDrawFx() { for (const f of WILD.fx) { if (f.k === 'spr') { const i = 1 + Math.min(3, Math.floor((t - f.t0) / f.dur * 4)); if (advDraw('fx_' + f.s + i, f.x, f.y, f.flip)) continue; }
  g.strokeStyle = `rgba(255,255,255,${Math.min(1, f.l * 4)})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y - 12, 10 + (0.25 - Math.min(0.25, f.l)) * 60, 0, 7); g.stroke(); } }
function wDrawSwipe() { const a = t - WILD.swipeT; if (a > 0.16) return; if (advImg('fx_swipe1')) { const i = 1 + Math.min(2, Math.floor(a / 0.16 * 3)); g.save(); g.translate(P.x + dir.x * 30, P.y - 14 + dir.y * 22); if (dir.x < 0) g.scale(-1, 1); advDraw('fx_swipe' + i, 0, 26); g.restore(); return; } const ang = Math.atan2(dir.y, dir.x); g.strokeStyle = `rgba(255,250,230,${1 - a / 0.16})`; g.lineWidth = 5; g.beginPath(); g.arc(P.x, P.y - 18, 40 + a * 80, ang - 1, ang + 1); g.stroke(); }
let NIGHTCV = null;
function wNight() {                                            // darkness at night (your own glow, lanterns, glowcaps, campfire-warm stashes), orange at dawn and dusk
  const day = wDayness(), c = HOME.wild.clock; const dusk = (c > 0.47 && c < 0.62) || c < 0.06 ? 1 - Math.abs(((c < 0.06 ? c + 1 : c) - 0.54) / 0.08) : 0;
  if (dusk > 0) { g.fillStyle = `rgba(255,120,40,${0.16 * Math.max(0, dusk)})`; g.fillRect(0, 0, VW, VH); }
  const dark = (1 - day) * (WILD.dg ? 0 : 0.78); if (dark < 0.02) return;
  if (!NIGHTCV || NIGHTCV.width !== VW || NIGHTCV.height !== VH) { NIGHTCV = document.createElement('canvas'); NIGHTCV.width = VW; NIGHTCV.height = VH; }
  const x = NIGHTCV.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, VW, VH); x.fillStyle = `rgba(8,12,34,${dark})`; x.fillRect(0, 0, VW, VH); x.globalCompositeOperation = 'destination-out';
  const hole = (wx, wy, r, a) => { const sx = wx - cam.x, sy = wy - cam.y; if (sx < -r || sy < -r || sx > VW + r || sy > VH + r) return; const gr = x.createRadialGradient(sx, sy, r * 0.15, sx, sy, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(sx - r, sy - r, r * 2, r * 2); };
  hole(P.x, P.y - 20, 190, 0.95);
  for (const f of WILD.farms) if (f.people) for (const q of f.people) if (q.kind === 'farmer' && !((q.dazed || 0) > t)) { hole(q.x, q.y - 20, 90, 0.9); hole(q.x + Math.cos(q.look) * 130, q.y - 20 + Math.sin(q.look) * 130, 120, 0.8); }
  for (const o of wNear(cam.x + VW / 2, cam.y + VH / 2, VW)) { if (o.k === 'forage' && o.kind === 'glowcap' && !HOME.wild.picked[o.id]) hole(o.x, o.y - 8, 70, 0.7); else if (o.k === 'stash') hole(o.x, o.y - 20, 80, 0.4); else if (o.k === 'decor' && o.lit) hole(o.x, o.y - 14, 150 + Math.sin(t * 9 + o.x) * 6, 0.85); else if (o.k === 'decor' && o.lamp) hole(o.x, o.y - 56, 120, 0.75); else if (o.k === 'landmark') hole(o.x, o.y - 60, 170, 0.5); }
  hole(GATE.x, GATE.y - 40, 160, 0.6); g.drawImage(NIGHTCV, 0, 0);
}
function wHud() {
  g.save(); g.font = 'bold 15px "Trebuchet MS",Verdana,sans-serif'; g.textBaseline = 'middle';
  for (let i = 0; i < WILD.hpMax; i++) { const x = 14 + i * 26, y = 20; g.fillStyle = i < WILD.hp ? '#e8455a' : 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(x, y + 8); g.bezierCurveTo(x - 12, y - 2, x - 6, y - 12, x, y - 4); g.bezierCurveTo(x + 6, y - 12, x + 12, y - 2, x, y + 8); g.fill(); }
  const B = WILD.bag, ap = B.apples.length, mats = Object.keys(B.mats).filter(k => B.mats[k] > 0), fg = Object.values(B.forage).reduce((s, v) => s + v, 0);
  let x = 10; const y = 86; g.fillStyle = 'rgba(10,24,40,.8)'; g.fillRect(x, y - 13, 150 + mats.length * 44 + (fg ? 50 : 0), 26); g.fillStyle = '#fff7e6'; g.fillText('\u{1F34E} ' + ap + '/' + S.carry, x + 8, y); x += 82;
  for (const k of mats) { const im = iconImg(MATS[k].icon); if (im && im.complete) g.drawImage(im, x, y - 11, 22, 22); g.fillText(B.mats[k], x + 24, y); x += 44; } if (fg) { g.fillStyle = '#9be37f'; g.fillText('\u{1F33F} ' + fg, x, y); }
  const c = HOME.wild.clock, day = isDay(), txt = (day ? '☀ ' : '☾ ') + 'Day ' + HOME.wild.day + '  ' + wTime(); g.font = 'bold 14px "Trebuchet MS",sans-serif'; const tw = g.measureText(txt).width + 20;
  g.fillStyle = 'rgba(10,24,40,.8)'; g.fillRect(VW / 2 - tw / 2, 8, tw, 26); g.fillStyle = day ? '#ffd23f' : '#b9c8ff'; g.textAlign = 'center'; g.fillText(txt, VW / 2, 21); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(VW / 2 - tw / 2, 33, tw, 3); g.fillStyle = day ? '#ffd23f' : '#b9c8ff'; g.fillRect(VW / 2 - tw / 2, 33, tw * c, 3);
  if (WILD.areaT > t) { g.font = 'bold 22px "Trebuchet MS",sans-serif'; g.globalAlpha = Math.min(1, (WILD.areaT - t)); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(WILD.area, VW / 2 + 2, 70); g.fillStyle = '#fff7e6'; g.fillText(WILD.area, VW / 2, 68); g.globalAlpha = 1; }
  if (WILD.msgT > t) { g.font = 'bold 14px "Trebuchet MS",sans-serif'; const lines = wrapText(WILD.msg, Math.min(560, VW - 44)), mw = Math.min(VW - 20, Math.max(...lines.map(l => g.measureText(l).width)) + 28), h = 12 + lines.length * 18, y0 = (TIPBOX.w > 0 && tipShow ? TIPBOX.y - 10 : VH - 64) - h;
    g.fillStyle = 'rgba(10,24,40,.88)'; g.fillRect(VW / 2 - mw / 2, y0, mw, h); g.fillStyle = '#ffe9a8'; lines.forEach((l, i) => g.fillText(l, VW / 2, y0 + 15 + i * 18)); }
  g.textAlign = 'left'; wRaidHud(); wMinimap(); g.restore();
}
function wRaidHud() {
  const R = WILD.raid; g.textBaseline = 'middle';
  if (R && !WILD.dg) { const txt = 'Raid: ' + SITES[R.farm.id].name + '  \u{1F34E} ' + R.apples + (R.chain > 1 && t - R.lastPick < 2.2 ? '  chain x' + R.chain : '') + (R.best >= 5 ? '  best x' + R.best : '') + ((R.day || isDay()) ? '  \u2600 +50%' : '');
    g.font = 'bold 13px "Trebuchet MS",sans-serif'; const w = g.measureText(txt).width + 18; g.fillStyle = 'rgba(70,20,10,.82)'; g.fillRect(10, 104, w, 24); g.fillStyle = '#ffe9a8'; g.textAlign = 'left'; g.fillText(txt, 19, 116); }
  const T = WILD.tally; if (T && T.until > t) { const a = Math.min(1, (T.until - t) * 1.5), w = Math.min(260, VW - 20), h = 54 + T.lines.length * 22, x = VW - w - 10, y = 44 + WILD.H * 0.017 + 12; g.globalAlpha = a;
    g.fillStyle = 'rgba(12,22,34,.92)'; g.fillRect(x, y, w, h); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.font = 'bold 17px "Trebuchet MS",sans-serif'; g.fillText(T.title, x + w / 2, y + 20);
    g.font = '14px "Trebuchet MS",sans-serif'; T.lines.forEach(([k, v], i) => { g.textAlign = 'left'; g.fillStyle = '#cfd8e6'; g.fillText(k, x + 18, y + 46 + i * 22); g.textAlign = 'right'; g.fillStyle = '#fff7e6'; g.fillText(String(v), x + w - 18, y + 46 + i * 22); });
    g.textAlign = 'center'; g.fillStyle = '#9be37f'; g.font = 'bold 14px "Trebuchet MS",sans-serif'; g.fillText('Total: ' + T.total + ' apples', x + w / 2, y + h - 12); g.globalAlpha = 1; g.textAlign = 'left'; }
}
function wDrawHeart(h) { const s = 1 + Math.sin(t * 5 + h.x) * 0.1, x = h.x, y = h.y - 12 - Math.abs(Math.sin(t * 3 + h.y)) * 4; shadow(h.x, h.y, 8); g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#e8455a'; g.beginPath(); g.moveTo(0, 7); g.bezierCurveTo(-11, -2, -6, -11, 0, -4); g.bezierCurveTo(6, -11, 11, -2, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-5, -5, 2, 2); g.restore(); }
function wMapCanvas(s) {                                       // what you have explored: only the land you have seen, and only the roads on it
  const w = Math.round(WILD.W * s), h = Math.round(WILD.H * s), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), cw = Math.ceil(WILD.W / 200), cs = 200 * s;
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mx = m.getContext('2d'); mx.fillStyle = '#fff';
  for (let i = 0; i < WILD.seen.length; i++) if (WILD.seen[i]) { const X = (i % cw) * 200, Y = Math.floor(i / cw) * 200, f = forestAt(X + 100, Y + 100); x.fillStyle = f > 0.56 ? '#355e30' : f > 0.45 ? '#4f8240' : '#6d9e4f'; x.fillRect(X * s, Y * s, cs + 0.7, cs + 0.7); mx.fillRect(X * s, Y * s, cs + 0.7, cs + 0.7); }
  const r = document.createElement('canvas'); r.width = w; r.height = h; const rx = r.getContext('2d'); rx.lineCap = rx.lineJoin = 'round'; rx.strokeStyle = '#e0c48e';
  for (const p of WILD.paths) { rx.lineWidth = Math.max(1, 60 * s * (p.w || 1)); rx.beginPath(); p.forEach((q, i) => i ? rx.lineTo(q.x * s, q.y * s) : rx.moveTo(q.x * s, q.y * s)); rx.stroke(); }
  rx.globalCompositeOperation = 'destination-in'; rx.drawImage(m, 0, 0); x.drawImage(r, 0, 0); return c;
}
function wMinimap() { if (WILD.dg) return dgMinimap();
  const s = 0.017, mw = WILD.W * s, mh = WILD.H * s, x0 = VW - mw - 10, y0 = 44; g.fillStyle = 'rgba(10,24,40,.75)'; g.fillRect(x0 - 3, y0 - 3, mw + 6, mh + 6);
  if (!WILD.mini || t - WILD.miniT > 0.5 || WILD.mini.width !== Math.round(mw)) { WILD.mini = wMapCanvas(s); WILD.miniT = t; } g.drawImage(WILD.mini, x0, y0);
  for (const f of WILD.farms) if (HOME.wild.found[f.id]) { g.fillStyle = siteOpen(f.id) ? '#ffd23f' : '#888'; g.beginPath(); g.arc(x0 + f.x * s, y0 + f.y * s, 3.5, 0, 7); g.fill(); }
  for (const c of WILD.caves) if (HOME.wild.found[c.id]) { g.fillStyle = '#b28cff'; g.fillRect(x0 + c.x * s - 2, y0 + c.y * s - 2, 4, 4); }
  g.fillStyle = '#fff'; g.fillRect(x0 + GATE.x * s - 2, y0 + GATE.y * s - 2, 4, 4); g.fillStyle = '#ff6a6a'; g.beginPath(); g.arc(x0 + P.x * s, y0 + P.y * s, 2.6, 0, 7); g.fill();
}
/* ----- menus ----- */
function wildMenu() {
  if (state !== 'wild' && state !== 'wildmenu') return; for (const k in keys) keys[k] = false; state = 'wildmenu'; const inside = WILD.dg || farmAt(P.x, P.y);
  show(`<h1>${WILD.dg ? esc(WILD.dg.name) : 'The Wilds'}</h1><p class="tag">Day ${HOME.wild.day}, ${wTime()} &middot; ${isDay() ? 'daylight: farmers see far and chase hard' : 'night: dark, and the night animals are out'}</p>
  <div class="row"><button class="big" onclick="wildResume()">Resume</button></div>
  <div class="pm"><button onclick="wildMap()">Map<small>and travel</small></button><button ${inside ? 'disabled' : ''} onclick="wildRunHome()">Go home<small>${inside ? 'climb out first' : 'the clock moves on'}</small></button><button onclick="howToWild()">How it works</button>
  <button onclick="menuFrom='wild';controls()">Controls</button><button onclick="menuFrom='wild';soundScreen()">Sound</button><button onclick="wildQuit()">Title screen</button></div>`, 'wildmenu');
}
function wildResume() { $('ov').style.display = 'none'; state = 'wild'; last = performance.now(); buttons(true); kickLoop(); }
function wildRunHome() { HOME.wild.clock = Math.min(0.999, HOME.wild.clock + 0.06); $('ov').style.display = 'none'; state = 'wild'; goHomeFromWild(false); }
function wildQuit() { WILD.on = false; wildSave(); toMenu(); }
function howToWild() {
  const k = a => isTouch ? ({ shake: 'Shake button', climb: 'Climb button', dash: 'Dash button', whistle: 'Whistle button' })[a] || a : kn(a);
  const cards = [
    ['Where to go', 'Your homestead sits deep in the woods, with no road nearby. Head out and find one: every road leads to a farm. The farms lie in the same directions as on the World Map: the Lumber Mill north, the Greenhouse east, the Pumpkin Patch south, the Bee Meadow west, and the Orchard near the middle.'],
    ['Raid gates', 'At the end of each road is that farm\'s raid gate. Step up to it to raid. A raid lasts one night, then you are back at the gate with the clock moved on.'],
    ['Day or night', 'Raids happen at the time of day it is out here. Night raids are dark, like the classic raids. Daylight raids are harder (the farmers see further and move faster), but you bring home 50% more apples: bank 10 and you get 15. To change the time, sleep in your bed at home.'],
    ['Stash stumps', 'Next to every raid gate. Bank your bag there so you cannot lose it, and travel back to any stash you have found from the map.'],
    ['Hearts', `Animals bite for one heart. Eat berries, herbs or glowcaps from your bag to heal (${isTouch ? 'tap your hearts' : kn('eat') + ', or click your hearts'}). If you run out, you wake up at home and lose your bag.`],
    ['Caves', 'Three floors of chests, traps and creatures, with something big at the bottom. Every floor has at least one chest: once it is open, stash your bag in it and it goes home. Each floor also has a spring that heals you once. Cracked walls hide secret rooms: swipe or dash into them. Beat the boss and a rope drops: the quick way out.'],
    ['Controls', `${k('shake')}: pick, search, go in. ${k('climb')}: swipe. ${k('dash')}: dash (stuns what you hit). ${k('whistle')}: slingshot, if you have one.${isTouch ? '' : ' ' + kn('map') + ': map. ' + kn('pause') + ': menu.'}`],
  ];
  show(`<h1>The Wilds</h1><div class="cards">${cards.map(c => `<div class="card"><b>${esc(c[0])}</b>${esc(c[1])}</div>`).join('')}</div>
  <div class="row"><button class="big" onclick="${state === 'wildmenu' ? 'wildMenu()' : 'leaveHomeScreen()'}">Back</button></div>`, 'howwild');
}
function wildMap() {
  const atHome = !WILD.on; if (atHome) wildBuild(); const me = atHome ? GATE : P;
  const s = Math.min(560 / WILD.W, 360 / WILD.H), w = Math.round(WILD.W * s), h = Math.round(WILD.H * s), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#1b2a1c'; x.fillRect(0, 0, w, h); x.drawImage(wMapCanvas(s), 0, 0);
  x.font = 'bold 11px sans-serif'; x.textAlign = 'center';
  for (const f of WILD.farms) { if (!HOME.wild.found[f.id]) continue; x.fillStyle = siteOpen(f.id) ? '#ffd23f' : '#999'; x.beginPath(); x.arc(f.x * s, f.y * s, f.r * s, 0, 7); x.globalAlpha = 0.35; x.fill(); x.globalAlpha = 1; x.fillText(SITES[f.id].name, f.x * s, f.y * s); }
  for (const cv2 of WILD.caves) if (HOME.wild.found[cv2.id]) { x.fillStyle = '#b28cff'; x.fillRect(cv2.x * s - 3, cv2.y * s - 3, 6, 6); }
  x.fillStyle = '#fff'; x.fillText('Home', GATE.x * s + 16, GATE.y * s + 4); x.fillStyle = '#ff6a6a'; x.beginPath(); x.arc(me.x * s, me.y * s, 4, 0, 7); x.fill();
  const go = WILD.stashes.filter(st => HOME.wild.found[st.id] && siteOpen(st.farm.id)).map(st => `<button class="up" ${WILD.dg ? 'disabled' : ''} onclick="wildTravel('${st.id}')"><b>${esc(SITES[st.farm.id].name)}</b>travel to its stash</button>`).join('');
  show(`<h1>Map</h1><img src="${c.toDataURL()}" style="width:${w}px;max-width:100%;image-rendering:pixelated;border-radius:8px" alt="map"><p class="lbl">Only what you have explored shows. Gold: farms you have found. Purple: caves. Travel takes time: the clock moves on.</p>
  <div class="row">${go || '<span class="lbl">Find a farm\'s stash stump to travel back to it.</span>'}</div><div class="row"><button onclick="${atHome ? 'raidHut()' : 'wildMenu()'}">Back</button></div>`, 'wildmap');
}
function wildTravel(id) { HOME.wild.clock = Math.min(0.999, HOME.wild.clock + 0.04); if (WILD.on) wBank('travel'); $('ov').style.display = 'none'; setOut(id); }
/* ----- hooks into the game ----- */
const _loopW = loop;
loop = function (now) {
  if (state === 'wild') { loopQueued = false; const dt = Math.min(0.05, (now - last) / 1000); last = now; try { wildUpdate(dt); if (state === 'wild') wildDraw(); } catch (e) { console.error(e); } if (state === 'wild') kickLoop(); return; }
  return _loopW(now);
};
addEventListener('keydown', e => {                             // (dash / swipe / sling / mute come through core.js's handler and localEvent below)
  if (rebinding || e.repeat) return; const k = e.key.toLowerCase();
  if (state === 'wildmenu' && BIND.pause.includes(k) && $('ov').dataset.screen === 'wildmenu') return wildResume();
  if (state !== 'wild') return;
  if (BIND.pause.includes(k)) return wildMenu(); if (BIND.map.includes(k)) { for (const q in keys) keys[q] = false; state = 'wildmenu'; return wildMap(); }
  if (BIND.shake.includes(k) && !wInteractable()) wSwipe(); if ((BIND.eat || ['v']).includes(k)) wEat(); if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
});
function wEat() {                                               // eat something healing from the bag (V, or tap your hearts)
  if (WILD.dead || state !== 'wild') return; if (WILD.hp >= WILD.hpMax) return wSay('You are not hurt.');
  const B = WILD.bag.forage, miss = WILD.hpMax - WILD.hp, k = (miss >= 2 && B.glowcap) ? 'glowcap' : B.berries ? 'berries' : B.herbs ? 'herbs' : B.glowcap ? 'glowcap' : null;
  if (!k) return wSay('Nothing to eat in your bag. Pick berries, herbs or glowcaps: they heal you.');
  B[k]--; if (!B[k]) delete B[k]; WILD.hp = Math.min(WILD.hpMax, WILD.hp + FORAGE[k].heal); pop(P.x, P.y - 70, 'Ate ' + FORAGE[k].name.toLowerCase() + ': +' + FORAGE[k].heal + ' heart', '#ff9fb2', true); try { sfxPlay('pickup'); } catch (e) {}
}
cv.addEventListener('pointerdown', e => { if (state !== 'wild' || !WILD.on) return; const p = pt(e); if (p.x < 14 + 26 * WILD.hpMax && p.y < 36) wEat(); }, true);
function wDash() { if (P.tree) return wSlam(); if (slam) return; if (dashCd > 0 || WILD.dead) return; dashT = 0.16; dashCd = S.dashCd; wFx('dust', P.x - dir.x * 10, P.y + 4, 0.4); setTimeout(() => { if (WILD.on) wFx('dust', P.x - dir.x * 14, P.y + 4, 0.4); }, 120); try { sfxAt('dash', P.x, P.y, 420); } catch (e) {} }
const _localEventW = localEvent;
localEvent = function (e, arg) { if (state === 'wild') { if (e === 'dash') wDash(); else if (e === 'climb') wSwipe(); else if (e === 'whistle') wSling(); return; } return _localEventW(e, arg); };
const _pauseW = pauseGame;
pauseGame = function () { if (state === 'wild') return wildMenu(); return _pauseW(); };
setInterval(() => { try { if (state === 'wild' && WILD.on) wildSave(); } catch (e) {} }, 20000);
/* ----- raiding from the Wilds: walk to a raid gate at the end of its road and raid that farm, at the time of day it is out here -----
   The raid is the classic one (the farm's own scene), but a single night. In DAYLIGHT there is no darkness, the farmers see further and wider,
   walk faster and notice you sooner, and the dogs smell further: a much harder raid that pays 50% more apples. Afterwards you are back at that
   raid gate in the Wilds, about two and a half hours later. (Quick raid in the Raid Hut is unchanged.) */
let WRAID = null, WRAID_CFG = null;
function wildRaidPrompt(f) {
  const S0 = SITES[f.id], open = siteOpen(f.id), day = isDay(); for (const k in keys) keys[k] = false; state = 'wildmenu';
  if (!open) { const Pj = PROJECTS[S0.need]; return show(`<h1>${esc(S0.name)}</h1><p class="tag">The way in is broken. To open it, build the ${esc(Pj ? Pj.name.toLowerCase() : 'way in')}: go to the Raid Hut at home and open the World Map.</p><div class="row"><button onclick="wildResume()">Back</button></div>`, 'wildgate'); }
  show(`<h1>${esc(S0.name)}</h1><p class="tag">${esc(S0.desc)}</p>
  <p>${day ? '<b>It is daylight.</b> No darkness to hide in: the farmers see much further, walk faster and spot you sooner, and the dogs smell further. Hard, but you bring home <b>50% more apples</b> (bank 10, get 15).' : '<b>It is night.</b> A classic raid: stay out of the flashlights and keep clear of the dogs.'} The raid lasts one night. Afterwards you are back at this gate, and the clock has moved on about two and a half hours.</p>
  <p class="lbl">Want the other time of day? Go home and sleep in your bed, until morning or until nightfall.</p>
  <div class="row"><button class="big" onclick="wildRaidStart('${f.id}')">${day ? 'Raid in daylight' : 'Raid tonight'}</button><button onclick="wildResume()">Not now</button></div>`, 'wildgate');
}
function wildDayOn(on) {                                         // daylight makes the raid harder (and is undone afterwards)
  if (on && !WRAID_CFG) { WRAID_CFG = { fs: CONFIG.farmer.speed, fc: CONFIG.farmer.coneLength, fh: CONFIG.farmer.coneHalfAngle, ds: CONFIG.dog.speed, dn: CONFIG.dog.sniffRange, al: CONFIG.player.alertTime };
    CONFIG.farmer.speed *= 1.3; CONFIG.farmer.coneLength *= 1.6; CONFIG.farmer.coneHalfAngle *= 1.3; CONFIG.dog.speed *= 1.15; CONFIG.dog.sniffRange *= 1.4; CONFIG.player.alertTime *= 0.65; }
  if (!on && WRAID_CFG) { const c = WRAID_CFG; CONFIG.farmer.speed = c.fs; CONFIG.farmer.coneLength = c.fc; CONFIG.farmer.coneHalfAngle = c.fh; CONFIG.dog.speed = c.ds; CONFIG.dog.sniffRange = c.dn; CONFIG.player.alertTime = c.al; WRAID_CFG = null; }
}
function wildRaidStart(id) {
  if (!siteOpen(id)) return; const day = isDay(); WRAID = { site: id, day, clock: HOME.wild.clock, nights: CONFIG.nightsToWin };
  wBank('raid'); wildSave(); WILD.on = false; WILD.dg = null; $('ov').style.display = 'none'; HOME.site = id; homeSave();
  CONFIG.nightsToWin = 1; wildDayOn(day); playSolo(); if (day) { bannerUntil = t + 6; pop(P.x, P.y - 80, 'DAYLIGHT RAID: they can see you!', '#ffd23f', true); }
}
function wildRaidBack() {                                        // back to the gate in the Wilds, the clock moved on
  if (!WRAID) return; const R = WRAID; WRAID = null; wildDayOn(false); CONFIG.nightsToWin = R.nights;
  const w = wildLoad(); w.clock = R.clock + 0.1; if (w.clock >= 1) { w.clock -= 1; w.day++; w.picked = {}; } homeSave();
  state = 'title'; setOut('stash_' + R.site);
}
const _darkAlphaW = darkAlpha; darkAlpha = function () { return WRAID && WRAID.day ? 0 : _darkAlphaW(); };
const _homeWinW = homeWin; homeWin = function () { if (WRAID) return; return _homeWinW(); };        // one night from the Wilds is not a won 7-night raid
const _showScreenW = showScreen;
showScreen = function (mine, theirs, theirsF) {
  if (WRAID && mine && mine.k === 'end') {
    if (WRAID.day && mine.ap) { mine.ap = Math.ceil(mine.ap * 1.5); mine.t += ' Daylight raid: 50% more apples.'; }
    mine.h = mine.win ? SITES[WRAID.site].name + ' raided!' : 'Raid over'; mine.win = false;
    _showScreenW(mine, theirs, theirsF); const rows = $('ov').querySelectorAll('.row'); const r = rows[rows.length - 1];
    if (r) r.innerHTML = '<button class="big" onclick="wildRaidBack()">Back to the Wilds</button>'; return;
  }
  return _showScreenW(mine, theirs, theirsF);
};
const _toMenuW = toMenu; toMenu = function () { if (WRAID) { payPartial(); refundKeep(); return wildRaidBack(); } return _toMenuW(); };
const _newRunW = newRun; newRun = function () { if (!WRAID) { wildDayOn(false); } return _newRunW(); };
const _rollModW = rollMod; rollMod = function () { if (WRAID && WRAID.day) return setMod('clear'); return _rollModW(); };      // no night conditions (fog, moon...) in daylight
