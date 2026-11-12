/* ===== CAVES: procedural dungeons under the Wilds =====
   Every cave mouth in the Wilds (wilds.js) goes down three floors. Each floor is a fresh layout (made from the world seed, the cave and the day,
   so a cave is the same all day and new the next): rooms cut by binary space partition, joined by corridors.
   - ENEMIES: rats (fast, weak), bats (flutter at you), spiders (keep away and spit webs that slow you), beetles (armoured, charge in a line and
     stun themselves on walls). More of them, and tougher kinds, the deeper you go.
   - TRAPS: spike strips in corridors (watch the rhythm), pressure plates that fire darts from the walls.
   - SECRETS: cracked walls (a lighter, split wall) hide small rooms with a better chest: swipe or dash into them.
   - REWARDS: chests (apples, materials, forage), whatever enemies drop.
   - BOSS: the Mole King on floor 3. The room seals when you walk in. He chases, rears up and CHARGES (dodge: he stuns himself on the wall and takes
     double damage while dizzy), BURROWS (watch the moving dirt, then get out of the ring) and calls rats. Beat him: a big chest, a relic, the
     room opens, a rope drops from the roof (the quick way out), and the cave is cleared for the day. Any OPENED chest takes your bag
     (banks it home, like a stash stump); every floor has at least one chest.
   It is dark down here: your glow and the torches. Up stairs lead back out to the Wilds (your bag comes with you). Tests: tests/wilds_pw.js. */
const DG_T = 48, DG_N = 56;
const DG = { WALL: 0, FLOOR: 1, CRACK: 2, GATE: 3, DOWN: 4, UP: 5, SPIKE: 6, PLATE: 7 };
const dgSolid = v => v === DG.WALL || v === DG.CRACK || v === DG.GATE;
const dgAt = (tx, ty) => { const d = WILD.dg; return tx < 0 || ty < 0 || tx >= DG_N || ty >= DG_N ? DG.WALL : d.g[ty * DG_N + tx]; };
const dgSet = (tx, ty, v) => { WILD.dg.g[ty * DG_N + tx] = v; };
function dgWall(x, y) { return dgSolid(dgAt(Math.floor(x / DG_T), Math.floor(y / DG_T))); }
function dgHash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function dgGen(seed, floor) {
  const R = wrng(seed), N = DG_N, g = new Uint8Array(N * N), rooms = [], ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const carve = (x, y, v = DG.FLOOR) => { if (x > 0 && y > 0 && x < N - 1 && y < N - 1) g[y * N + x] = v; };
  const room = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j); const r = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) }; rooms.push(r); return r; };
  const hall = (a, b) => { let x = a.cx, y = a.cy; const hz = R() < 0.5; const stepX = () => { while (x !== b.cx) { carve(x, y); carve(x, y + 1); x += Math.sign(b.cx - x); } }, stepY = () => { while (y !== b.cy) { carve(x, y); carve(x + 1, y); y += Math.sign(b.cy - y); } };
    if (hz) { stepX(); stepY(); } else { stepY(); stepX(); } carve(x, y); carve(x + 1, y + 1); };
  const split = (x, y, w, h, d) => {
    if (d >= 4 || (w < 18 && h < 18)) { const rw = ri(6, Math.max(6, Math.min(14, w - 3))), rh = ri(5, Math.max(5, Math.min(11, h - 3))); return [room(x + ri(1, Math.max(1, w - rw - 1)), y + ri(1, Math.max(1, h - rh - 1)), Math.min(rw, w - 2), Math.min(rh, h - 2))]; }
    const vert = w > h ? true : h > w ? false : R() < 0.5, at = 0.38 + R() * 0.24; let A, B;
    if (vert) { const s = Math.floor(w * at); A = split(x, y, s, h, d + 1); B = split(x + s, y, w - s, h, d + 1); } else { const s = Math.floor(h * at); A = split(x, y, w, s, d + 1); B = split(x, y + s, w, h - s, d + 1); }
    hall(A[Math.floor(R() * A.length)], B[Math.floor(R() * B.length)]); return A.concat(B);
  };
  split(1, 1, N - 2, N - 2, 0);
  const inRoom = (x, y) => rooms.find(r => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
  // how far each room is from the first (walking): the up stairs in the first, the way down (or the boss) in the farthest
  const dist = new Int32Array(N * N).fill(-1), q = [rooms[0].cy * N + rooms[0].cx]; dist[q[0]] = 0;
  while (q.length) { const c = q.shift(), x = c % N, y = (c / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * N + x + dx; if (dist[n] < 0 && g[n] === DG.FLOOR) { dist[n] = dist[c] + 1; q.push(n); } } }
  const far = rooms.slice(1).sort((a, b) => dist[b.cy * N + b.cx] - dist[a.cy * N + a.cx]); let last = far[0];
  if (floor === 3) last = far.slice(0, Math.max(1, Math.ceil(far.length / 2))).sort((a, b) => b.w * b.h - a.w * a.h)[0];
  const start = rooms[0]; g[start.cy * N + start.cx] = DG.UP;
  if (floor < 3) g[last.cy * N + last.cx] = DG.DOWN; else last.boss = true;
  // secret rooms behind cracked walls
  const secrets = [], allWall = (x, y, w, h) => { if (x < 1 || y < 1 || x + w >= N - 1 || y + h >= N - 1) return false; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j * N + i] !== DG.WALL) return false; return true; };
  for (const r of rooms.slice(1).sort(() => R() - 0.5)) { if (secrets.length >= 1 + (floor > 1 ? 1 : 0) || r.boss) break;
    for (const side of [0, 1, 2, 3].sort(() => R() - 0.5)) { const sw = 4, sh = 4; let sx, sy, cx2, cy2;
      if (side === 0) { sx = r.x + ri(0, Math.max(0, r.w - sw)); sy = r.y - sh - 1; cx2 = sx + 1 + ri(0, 1); cy2 = r.y - 1; }
      else if (side === 1) { sx = r.x + ri(0, Math.max(0, r.w - sw)); sy = r.y + r.h + 1; cx2 = sx + 1 + ri(0, 1); cy2 = r.y + r.h; }
      else if (side === 2) { sx = r.x - sw - 1; sy = r.y + ri(0, Math.max(0, r.h - sh)); cx2 = r.x - 1; cy2 = sy + 1 + ri(0, 1); }
      else { sx = r.x + r.w + 1; sy = r.y + ri(0, Math.max(0, r.h - sh)); cx2 = r.x + r.w; cy2 = sy + 1 + ri(0, 1); }
      if (!allWall(sx - 1, sy - 1, sw + 2, sh + 2)) continue; for (let j = sy; j < sy + sh; j++) for (let i = sx; i < sx + sw; i++) g[j * N + i] = DG.FLOOR; g[cy2 * N + cx2] = DG.CRACK;
      secrets.push({ x: sx, y: sy, w: sw, h: sh, cx: sx + 2, cy: sy + 2, secret: true }); break; } }
  // traps: spikes across corridors, plates in rooms
  const traps = [], corr = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (g[y * N + x] === DG.FLOOR && !inRoom(x, y) && !secrets.some(s => x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h)) corr.push([x, y]);
  for (let n = 0; n < 4 + floor * 3 && corr.length; n++) { const [x, y] = corr.splice(Math.floor(R() * corr.length), 1)[0]; if (Math.abs(x - start.cx) + Math.abs(y - start.cy) < 6) continue; const ph = R() * 3;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) if (g[(y + dy) * N + x + dx] === DG.FLOOR && !inRoom(x + dx, y + dy)) { g[(y + dy) * N + x + dx] = DG.SPIKE; traps.push({ k: 'spike', x: x + dx, y: y + dy, ph }); } }
  for (const r of rooms.slice(1)) if (!r.boss && R() < 0.35 + floor * 0.15) { const x = r.x + ri(1, r.w - 2), y = r.y + ri(1, r.h - 2); if (g[y * N + x] === DG.FLOOR) { g[y * N + x] = DG.PLATE; traps.push({ k: 'plate', x, y, cd: 0 }); } }
  // torches on walls with floor below, chests, enemies
  const torches = []; for (const r of rooms) for (let i = r.x; i < r.x + r.w; i++) if (g[(r.y - 1) * N + i] === DG.WALL && R() < 0.12) torches.push({ x: i, y: r.y - 1 });
  const chests = [], spot = r => { for (let n = 0; n < 30; n++) { const x = r.x + ri(1, Math.max(1, r.w - 2)), y = r.y + ri(1, Math.max(1, r.h - 2)); if (g[y * N + x] === DG.FLOOR) return [x, y]; } return [r.cx, r.cy]; };
  for (const s of secrets) chests.push({ x: s.cx * DG_T, y: s.cy * DG_T + 24, open: false, rich: 2 });
  for (const r of rooms.slice(1)) if (!r.boss && R() < 0.3) { const [x, y] = spot(r); chests.push({ x: x * DG_T + 24, y: y * DG_T + 30, open: false, rich: 1 }); }
  if (!chests.some(c => c.rich === 1)) { const rs = rooms.slice(1).filter(r => !r.boss), r = rs[(floor * 7 + rs.length) % rs.length] || rooms[0];     // always at least one chest you can find (and bank at) on every floor
    let x = r.cx, y = r.cy; if (g[y * N + x] !== DG.FLOOR) for (let j = r.y; j < r.y + r.h && g[y * N + x] !== DG.FLOOR; j++) for (let i = r.x; i < r.x + r.w; i++) if (g[j * N + i] === DG.FLOOR) { x = i; y = j; break; }
    chests.push({ x: x * DG_T + 24, y: y * DG_T + 30, open: false, rich: 1 }); }
  const kinds = floor === 1 ? ['rat', 'rat', 'bat'] : floor === 2 ? ['rat', 'bat', 'spider', 'spider'] : ['rat', 'bat', 'spider', 'beetle', 'beetle'], foes = [];
  for (const r of rooms.slice(1)) { if (r.boss) continue; const n = ri(1, 1 + floor); for (let i = 0; i < n; i++) { const [x, y] = spot(r), k = kinds[Math.floor(R() * kinds.length)]; foes.push(dgFoe(k, x * DG_T + 24, y * DG_T + 30, r)); } }
  const decor = [], DEC = ['bones', 'rubble', 'web', 'crystal', 'cave_shroom', 'barrel_old', 'bones', 'rubble'];
  for (const r of rooms.concat(secrets)) for (let i = 0, n = ri(1, 3); i < n; i++) { const [x, y] = spot(r); if (g[y * N + x] !== DG.FLOOR || (x === start.cx && y === start.cy)) continue; const k = DEC[Math.floor(R() * DEC.length)];
    decor.push({ k, x: x * DG_T + 8 + R() * 32, y: y * DG_T + 20 + R() * 24, flip: R() < 0.5, glow: k === 'crystal' || k === 'cave_shroom' }); }
  for (const tr of traps) if (tr.k === 'plate') { tr.walls = []; for (const s2 of [-1, 1]) { let x = tr.x; while (!dgSolid(g[tr.y * N + x + s2]) && Math.abs(x - tr.x) < 20) x += s2; tr.walls.push([x + s2, tr.y, s2]); } }
  const mids = rooms.filter(r => r !== start && !r.boss && r !== last), sr = mids.length ? mids[Math.floor(R() * mids.length)] : start;      // one healing spring a floor
  let spring = null; for (let n = 0; n < 40 && !spring; n++) { const [x, y] = spot(sr); if (g[y * N + x] === DG.FLOOR && !decor.some(o => Math.abs(o.x - x * DG_T - 24) < 40 && Math.abs(o.y - y * DG_T - 30) < 40)) spring = { x: x * DG_T + 24, y: y * DG_T + 30, used: false }; }
  decor.forEach(o => { if (o.k === 'cave_shroom' && R() < 0.6) o.eat = 1; });
  return { g, rooms, secrets, traps, torches, chests, foes, start, last, floor, decor, spring, var: R() * 1e6 | 0 };
}
function dgFoe(kind, x, y, room) { const F = FOE[kind]; return { kind, x, y, hp: F.hp, face: 1, anim: Math.random() * 6, stun: 0, st: 'idle', t0: Math.random() * 6, room, boss: !!F.boss }; }
function dgEnter(cave) {
  const w = HOME.wild; if (w.cleared[cave.id] === w.day) return wSay('You cleared this cave today. Something new will have moved in by tomorrow.');
  if (!w.found[cave.id]) { w.found[cave.id] = 1; homeSave(); }
  WILD.dg = { cave, name: 'The cave', floor: 0, foes: [] }; WILD.tally = null; dgFloor(1); try { sfxPlay('dig'); } catch (e) {}
}
function dgFloor(n) { WILD.enterT = t;
  const d = WILD.dg, L = dgGen(WILD.seed ^ dgHash(d.cave.id) ^ (HOME.wild.day * 7919) ^ (n * 104729), n); Object.assign(d, L); d.floor = n; d.name = ['', 'The cave', 'Deeper down', 'The Mole King\'s hall'][n];
  d.seen = new Uint8Array(DG_N * DG_N); d.shots = []; WILD.hearts = []; d.bossOn = false; d.sealed = false; apples = []; matItems = []; WILD.shots = []; WILD.foes = [];
  P.x = L.start.cx * DG_T + DG_T + 10; P.y = L.start.cy * DG_T + 30; dgPush(P, 11); cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; WILD.inv = Math.max(WILD.inv, 1);
  wArea(d.name + ' (floor ' + n + ')', 3); if (n === 3) wSay('The ground trembles. Something big lives down here.');
}
function dgLeave() { const c = WILD.dg.cave; WILD.dg = null; WILD.enterT = t; WILD.hearts = []; apples = []; matItems = []; WILD.shots = []; P.x = c.x; P.y = c.y + 60; wPush(P, 11); cam.x = P.x - VW / 2; cam.y = P.y - VH / 2; wArea('The Wilds', 2); WILD.inv = 1; }
function dgPush(e, rad) {                                      // keep a circle out of solid tiles
  for (let k = 0; k < 2; k++) { const x0 = Math.floor((e.x - rad) / DG_T), x1 = Math.floor((e.x + rad) / DG_T), y0 = Math.floor((e.y - rad) / DG_T), y1 = Math.floor((e.y + rad) / DG_T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (!dgSolid(dgAt(tx, ty))) continue; const nx = clampN(e.x, tx * DG_T, tx * DG_T + DG_T), ny = clampN(e.y, ty * DG_T, ty * DG_T + DG_T), dx = e.x - nx, dy = e.y - ny, d = Math.hypot(dx, dy);
      if (d < rad) { if (d > 0.01) { e.x = nx + dx / d * rad; e.y = ny + dy / d * rad; } else { e.y = ty * DG_T + DG_T + rad; } e.bump = t; } } }
}
function dgSees(e, range) { const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy); if (d > range) return false; const n = Math.ceil(d / 16); for (let i = 1; i < n; i++) if (dgWall(e.x + dx * i / n, e.y - 10 + dy * i / n)) return false; return true; }
function dgCrack(tx, ty) { if (dgAt(tx, ty) !== DG.CRACK) return false; dgSet(tx, ty, DG.FLOOR); pop(tx * DG_T + 24, ty * DG_T + 10, 'A secret room!', '#ffd23f', true); try { sfxPlay('shake'); } catch (e) {} wFx('dust', tx * DG_T + 24, ty * DG_T + 44, 0.5); return true; }
function dgSwipeWalls(fx, fy) { for (const r of [24, 48]) { const x = P.x + fx * r, y = P.y - 10 + fy * r; if (dgCrack(Math.floor(x / DG_T), Math.floor(y / DG_T))) return; } }
function dgDashWalls() { const x = P.x + dir.x * 26, y = P.y - 6 + dir.y * 26; dgCrack(Math.floor(x / DG_T), Math.floor(y / DG_T)); }
function dgInteractable() {
  const d = WILD.dg, tx = Math.floor(P.x / DG_T), ty = Math.floor((P.y - 6) / DG_T);
  for (const c of d.chests) if (!c.open && Math.hypot(c.x - P.x, c.y - P.y) < 52) return { k: 'chest', c, x: c.x, y: c.y };
  if (d.spring && !d.spring.used && Math.hypot(d.spring.x - P.x, d.spring.y - P.y) < 50) return { k: 'spring', x: d.spring.x, y: d.spring.y };
  for (const o of d.decor) if (o.eat && !o.eaten && Math.hypot(o.x - P.x, o.y - P.y) < 40) return { k: 'shroom', o, x: o.x, y: o.y };
  if (d.rope && Math.hypot(d.rope.x - P.x, d.rope.y - P.y) < 46) return { k: 'rope', x: d.rope.x, y: d.rope.y };
  const B = WILD.bag, full = B.apples.length || Object.keys(B.mats).some(k => B.mats[k]) || Object.keys(B.forage).some(k => B.forage[k]);
  if (full) for (const c of d.chests) if (c.open && Math.hypot(c.x - P.x, c.y - P.y) < 52) return { k: 'bank', c, x: c.x, y: c.y };
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const v = dgAt(tx + i, ty + j); if ((v === DG.UP || v === DG.DOWN) && Math.hypot((tx + i) * DG_T + 24 - P.x, (ty + j) * DG_T + 24 - P.y) < 50) return { k: v === DG.UP ? 'up' : 'down', x: (tx + i) * DG_T + 24, y: (ty + j) * DG_T + 24 }; }
  return null;
}
function dgOpen(c) {
  c.open = true; try { sfxPlay('pickup'); } catch (e) {} const n = c.rich === 3 ? 14 : c.rich === 2 ? 7 : 4, F = WILD.dg.floor;
  for (let i = 0; i < n + F; i++) apples.push({ x: c.x + rnd(-50, 50), y: c.y + rnd(14, 46), gold: Math.random() < 0.1 * c.rich, t: 0, fall: 0.4 + i * 0.05, kind: 'tree' });
  for (let i = 0; i < c.rich + (F > 2 ? 1 : 0); i++) matItems.push({ id: MAT_IDS[Math.floor(Math.random() * MAT_IDS.length)], x: c.x + rnd(-40, 40), y: c.y + rnd(20, 50), fall: 0.5 });
  const fk = Object.keys(FORAGE), k = fk[Math.floor(Math.random() * fk.length)]; WILD.bag.forage[k] = (WILD.bag.forage[k] || 0) + c.rich; if (c.rich >= 2 && Math.random() < 0.6) WILD.hearts.push({ x: c.x + 30, y: c.y + 20 });
  pop(c.x, c.y - 50, c.rich === 3 ? 'The Mole King\'s hoard!' : c.rich === 2 ? 'A hidden stash!' : 'A chest!', '#ffd23f', c.rich > 1);
  if (c.rich === 3) { HOME.wild.relics = (HOME.wild.relics || 0) + 1; homeSave(); pop(c.x, c.y - 80, 'A relic! (' + HOME.wild.relics + ' found)', '#b28cff', true); }
}
function dgUpdate(dt) {
  const d = WILD.dg; if (WILD.dead) return; obs = [];
  const mv = moveVec('raccoon'); let mx = mv.x, my = mv.y; const m = Math.hypot(mx, my); P.moving = m > 0;
  if (m) { mx /= m; my /= m; dir = { x: mx, y: my }; if (mx) P.face = mx > 0 ? 1 : -1; anim += dt * 14; } else anim = 0;
  const sp = S.speed * (1 - 0.02 * WILD.bag.apples.length) * ((WILD.slowT || 0) > t ? 0.5 : 1);
  if (dashT > 0) { dashT -= dt; P.x += dir.x * 520 * dt; P.y += dir.y * 520 * dt; wDashHits(); } else if (P.moving) { P.x += mx * sp * dt; P.y += my * sp * dt; }
  dgPush(P, 11); wPickups(dt); carry = WILD.bag.apples;
  WILD.hint = dgInteractable(); if (held('shake') && WILD.hint) { const h = WILD.hint; keys[BIND.shake[0]] = false; keys.__shake = false;
    if (h.k === 'spring') { if (WILD.hp >= WILD.hpMax) wSay('You are not hurt: save the spring for later.'); else { d.spring.used = true; WILD.hp = WILD.hpMax; pop(h.x, h.y - 50, 'The spring heals you: full hearts!', '#9fe8ff', true); try { sfxPlay('clear'); } catch (e) {} } }
    else if (h.k === 'shroom') { if (WILD.hp >= WILD.hpMax) wSay('You are not hurt.'); else { h.o.eaten = 1; WILD.hp++; pop(h.x, h.y - 40, 'Cave mushroom: +1 heart', '#ff9fb2', true); } }
    else if (h.k === 'chest') dgOpen(h.c); else if (h.k === 'bank') { wBank('chest'); wFx('spr', h.x, h.y - 20, 0.4); } else if (h.k === 'rope') { wSay('You climb the rope back up to the Wilds.'); return dgLeave(); } else if (h.k === 'up') return dgLeave(); else if (h.k === 'down') return dgFloor(d.floor + 1); }
  // what you have seen (the minimap)
  const tx = Math.floor(P.x / DG_T), ty = Math.floor(P.y / DG_T); for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) { const X = tx + i, Y = ty + j; if (X >= 0 && Y >= 0 && X < DG_N && Y < DG_N) d.seen[Y * DG_N + X] = 1; }
  // traps
  for (const tr of d.traps) { const on = Math.hypot(tr.x * DG_T + 24 - P.x, tr.y * DG_T + 24 - (P.y - 4)) < 26;
    if (tr.k === 'spike') { tr.up = ((t + tr.ph) % 2.4) > 1.6; if (tr.up && on && dashT <= 0) wHurt(1, 'Spikes!'); for (const e of d.foes) if (tr.up && !e.dead && !FOE[e.kind].bird && Math.hypot(tr.x * DG_T + 24 - e.x, tr.y * DG_T + 24 - e.y) < 22 && !(e.hitT > t)) wHit(e, 1, 0.2); }
    else if (tr.k === 'plate') { tr.cd -= dt; if (on && tr.cd <= 0) { tr.cd = 2.5; tr.down = t; try { sfxPlay('click'); } catch (e) {} pop(P.x, P.y - 60, 'Click!', '#ffd23f');
      for (const s of [-1, 1]) { let x = tr.x; while (!dgSolid(dgAt(x + s, tr.y)) && Math.abs(x - tr.x) < 20) x += s; const sx = (x + (s > 0 ? 1 : 0)) * DG_T - s * 4; d.torchDart = t; WILD.shots.push({ x: sx, y: tr.y * DG_T + 24 - 18 + 18, vx: -s * 380, vy: 0, l: 3, dmg: 1, dart: 1 }); } } } }
  // the boss room seals when you walk in
  const br = d.last; if (br.boss && !d.bossDone && !d.bossOn && tx >= br.x && ty >= br.y && tx < br.x + br.w && ty < br.y + br.h && HOME.wild.cleared[d.cave.id] !== HOME.wild.day) {
    d.bossOn = true; d.sealed = []; for (let y = br.y - 1; y <= br.y + br.h; y++) for (let x = br.x - 1; x <= br.x + br.w; x++) { const edge = x === br.x - 1 || y === br.y - 1 || x === br.x + br.w || y === br.y + br.h; if (edge && dgAt(x, y) !== DG.WALL) { d.sealed.push([x, y, dgAt(x, y)]); dgSet(x, y, DG.GATE); } }
    const b = dgFoe('moleking', br.cx * DG_T + 24, br.cy * DG_T + 24, br); b.st = 'rise'; b.t1 = t + 1.6; b.hpMax = b.hp; b.cyc = 0; b.onDie = dgBossDown; d.boss = b; d.foes.push(b); wArea('The Mole King', 3); try { sfxPlay('caught'); } catch (e) {} }
  dgFoes(dt); wShots(dt);
  pops.forEach(p => { p.l -= dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.l > 0); WILD.fx = WILD.fx.filter(f => (f.l -= dt) > 0);
}
function dgBossDown(b) {
  const d = WILD.dg; d.bossDone = true; for (const [x, y, v] of d.sealed || []) dgSet(x, y, v); d.foes.forEach(e => { if (e !== b) { e.dead = true; e.deadT = t; } });
  d.decor.push({ k: 'mk_defeat', x: b.x - 80, y: b.y - 30, flip: P.x < b.x }, { k: 'mk_crown', x: b.x - 10, y: b.y - 24 });
  d.chests.push({ x: b.x + 40, y: b.y + 30, open: false, rich: 3 }); HOME.wild.cleared[d.cave.id] = HOME.wild.day; homeSave();
  { const want = { x: b.x + 150, y: b.y + 40 }; let best = null;              // the open floor tile nearest that spot, with floor all round it (not against a wall)
    for (let ty = 0; ty < DG_N; ty++) for (let tx = 0; tx < DG_N; tx++) { let open = true; for (let j = -1; j <= 1 && open; j++) for (let i = -1; i <= 1; i++) if (dgSolid(dgAt(tx + i, ty + j))) { open = false; break; }
      if (!open) continue; const x = tx * DG_T + 24, y = ty * DG_T + 30, dd = Math.hypot(x - want.x, y - want.y); if (Math.hypot(x - (b.x + 40), y - (b.y + 30)) < 70) continue; if (!best || dd < best[0]) best = [dd, x, y]; }
    d.rope = { x: best ? best[1] : want.x, y: best ? best[2] : want.y, t0: t }; }       // a rope down from a hole in the roof: the quick way out
  pop(b.x, b.y - 110, 'The Mole King is beaten!', '#ffd23f', true); wSay('The Mole King is beaten! Open his hoard, stash your bag in the chest, then climb the rope out.');
}
function dgFoes(dt) {
  const d = WILD.dg;
  for (const e of d.foes) { if (e.dead) continue; const F = FOE[e.kind], dist = Math.hypot(P.x - e.x, P.y - e.y); e.anim += dt * 10;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.boss) { dgBoss(e, dt, dist); continue; }
    const sees = WILD.inv <= 0 && dgSees(e, F.see);
    if (e.kind === 'bat') { if (sees || e.st === 'chase') { e.st = 'chase'; const a = Math.atan2(P.y - 14 - e.y, P.x - e.x) + Math.sin(t * 5 + e.t0) * 1.1; e.x += Math.cos(a) * F.sp * dt; e.y += Math.sin(a) * F.sp * dt; e.face = Math.cos(a) > 0 ? 1 : -1; dgPush(e, 8); if (dist > F.see * 1.8) e.st = 'idle'; }
      else { e.t0 += dt; e.x += Math.cos(e.t0) * 30 * dt; e.y += Math.sin(e.t0 * 1.3) * 30 * dt; dgPush(e, 8); } }
    else if (e.kind === 'beetle') {
      if (e.st === 'aim') { if (t > e.t1) { e.st = 'charge'; e.t1 = t + 0.8; } }
      else if (e.st === 'charge') { e.x += e.vx * dt; e.y += e.vy * dt; e.bump = 0; dgPush(e, 14); if (e.bump) { e.st = 'idle'; e.stun = 1.2; pop(e.x, e.y - 30, 'bonk', '#ffe9a8'); } else if (t > e.t1) e.st = 'idle'; }
      else if (sees && dist < 260) { e.st = 'aim'; e.t1 = t + 0.55; const a = Math.atan2(P.y - e.y, P.x - e.x); e.vx = Math.cos(a) * 340; e.vy = Math.sin(a) * 340; e.face = e.vx > 0 ? 1 : -1; }
      else if (sees) wStep(e, P.x, P.y, F.sp, dt, 14); else { e.t0 += dt; wStep(e, e.room.cx * DG_T + Math.cos(e.t0 * 0.5) * 70, e.room.cy * DG_T + Math.sin(e.t0 * 0.5) * 50, 40, dt, 14); } }
    else if (e.kind === 'spider') {
      if (sees) { const want = 170, a = Math.atan2(e.y - P.y, e.x - P.x); if (dist < want - 30) wStep(e, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, F.sp, dt, 12); else if (dist > want + 60) wStep(e, P.x, P.y, F.sp, dt, 12);
        e.face = P.x > e.x ? 1 : -1; e.cd = (e.cd || 1.2) - dt; if (e.cd <= 0) { e.cd = 2.2; const b = Math.atan2(P.y - 16 - (e.y - 14), P.x - e.x); WILD.shots.push({ x: e.x, y: e.y - 14, vx: Math.cos(b) * 260, vy: Math.sin(b) * 260, l: 1.6, web: 1 }); } }
      else { e.t0 += dt; wStep(e, e.room.cx * DG_T + Math.cos(e.t0 * 0.4) * 80, e.room.cy * DG_T + Math.sin(e.t0 * 0.4) * 60, 35, dt, 12); } }
    else { if (sees || (e.st === 'chase' && dist < F.see * 1.5)) { e.st = 'chase'; wStep(e, P.x, P.y, F.sp, dt, 10); } else { e.st = 'idle'; e.t0 += dt; wStep(e, e.room.cx * DG_T + Math.cos(e.t0 * 0.7) * 90, e.room.cy * DG_T + Math.sin(e.t0) * 60, 60, dt, 10); } }
    if (dist < (e.kind === 'beetle' ? 30 : 24) && !(e.kind === 'spider')) wHurt(F.dmg, { rat: 'A rat bit you!', bat: 'A bat nipped you!', beetle: 'The beetle rammed you!' }[e.kind] || 'Ouch!', e.x, e.y);
  }
  d.foes = d.foes.filter(e => !e.dead || t - (e.deadT || 0) < 0.5);
}
function dgBoss(b, dt, dist) {
  const angry = b.hp < b.hpMax / 2, sp = FOE.moleking.sp * (angry ? 1.3 : 1); b.under = b.st === 'burrow' || b.st === 'mark';
  if (b.st === 'rise') { if (t > b.t1) { b.st = 'chase'; b.t1 = t + 2.5; } return; }
  if (b.st === 'chase') { wStep(b, P.x, P.y, sp, dt, 26); if (dist < 40) wHurt(1, 'The Mole King swatted you!', b.x, b.y);
    if (t > b.t1) { b.cyc++; if (b.cyc % 3 === 0) { b.st = 'summon'; b.t1 = t + 0.9; } else if (b.cyc % 2) { b.st = 'aim'; b.t1 = t + (angry ? 0.5 : 0.75); } else { b.st = 'burrow'; b.t1 = t + 0.6; } } }
  else if (b.st === 'aim') { b.face = P.x > b.x ? 1 : -1; if (t > b.t1) { const a = Math.atan2(P.y - b.y, P.x - b.x); b.vx = Math.cos(a) * 460; b.vy = Math.sin(a) * 460; b.st = 'charge'; b.t1 = t + 1.1; } }
  else if (b.st === 'charge') { b.x += b.vx * dt; b.y += b.vy * dt; b.bump = 0; dgPush(b, 26); if (dist < 44) wHurt(1, 'Trampled!', b.x, b.y);
    if (b.bump) { b.st = 'dizzy'; b.t1 = t + 2; pop(b.x, b.y - 90, 'Dizzy! Hit him now!', '#ffd23f', true); try { sfxPlay('caught'); } catch (e) {} } else if (t > b.t1) { b.st = 'chase'; b.t1 = t + 2.2; } }
  else if (b.st === 'dizzy') { if (t > b.t1) { b.st = 'chase'; b.t1 = t + 2.5; } }
  else if (b.st === 'burrow') { if (t > b.t1) { b.st = 'mark'; b.t1 = t + 1.6; } }
  else if (b.st === 'mark') { if (t < b.t1 - 0.45) { b.x += (P.x - b.x) * Math.min(1, dt * 3); b.y += (P.y - b.y) * Math.min(1, dt * 3); }
    if (t > b.t1) { b.st = 'chase'; b.t1 = t + 2.6; wFx('dust', b.x, b.y + 10, 0.5); wFx('dust', b.x - 30, b.y + 6, 0.5); wFx('dust', b.x + 30, b.y + 6, 0.5); if (Math.hypot(P.x - b.x, P.y - b.y) < 64) wHurt(1, 'He burst out under you!', b.x, b.y); } }
  else if (b.st === 'summon') { if (t > b.t1) { const n = angry ? 3 : 2; for (let i = 0; i < n; i++) { const r = dgFoe('rat', b.x + Math.cos(i * 2) * 60, b.y + Math.sin(i * 2) * 40, b.room); r.st = 'chase'; dgPush(r, 10); WILD.dg.foes.push(r); } pop(b.x, b.y - 90, 'Squeak! Squeak!', '#ffe9a8'); b.st = 'chase'; b.t1 = t + 2.4; } }
}
/* ----- drawing ----- */
let DGPAT = null;
function dgPats() { if (DGPAT) return DGPAT; const f = wImg('hide_floor'), w = wImg('hide_wall'); if (!f || !w) return null; const mk = (im, s, tint) => { const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, s, s); if (tint) { x.fillStyle = tint; x.fillRect(0, 0, s, s); } return g.createPattern(c, 'repeat'); };
  return (DGPAT = { floor: mk(f, 192, 'rgba(30,20,40,.35)'), wall: mk(w, 96, 'rgba(20,10,30,.25)') }); }
function dgDraw() {
  const d = WILD.dg; cam.x = clampN(cam.x + (P.x - VW / 2 - cam.x) * 0.15, -200, DG_N * DG_T - VW + 200); cam.y = clampN(cam.y + (P.y - 30 - VH / 2 - cam.y) * 0.15, -200, DG_N * DG_T - VH + 200);
  g.fillStyle = '#0c0a10'; g.fillRect(0, 0, VW, VH); g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); g.imageSmoothingEnabled = false; const pat = dgPats();
  const x0 = Math.max(0, Math.floor(cam.x / DG_T) - 1), x1 = Math.min(DG_N - 1, Math.floor((cam.x + VW) / DG_T) + 1), y0 = Math.max(0, Math.floor(cam.y / DG_T) - 1), y1 = Math.min(DG_N - 1, Math.floor((cam.y + VH) / DG_T) + 2);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const v = dgAt(tx, ty), X = tx * DG_T, Y = ty * DG_T; if (dgSolid(v) && v !== DG.GATE) continue;
    const fh = (tx * 73856093 ^ ty * 19349663 ^ d.var) >>> 0, fq = fh % 100, fk = fq < 74 ? 'floor_b' : fq < 88 ? 'floor_a' : fq < 95 ? 'floor_moss' : 'floor_crack', fim = advImg(fk);
    if (fim) g.drawImage(fim, X, Y, DG_T, DG_T); else { g.fillStyle = pat ? pat.floor : '#3a3036'; g.fillRect(X, Y, DG_T, DG_T); }
    if ((v === DG.UP || v === DG.DOWN) && advImg(v === DG.UP ? 'stairs_up' : 'stairs_down')) { g.drawImage(advImg(v === DG.UP ? 'stairs_up' : 'stairs_down'), X, Y, DG_T, DG_T); g.fillStyle = '#ffe9a8'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText(v === DG.UP ? 'OUT' : 'DOWN', X + 24, Y - 2); g.textAlign = 'left'; continue; }
    if (v === DG.PLATE && advImg('plate_up')) { const tr = d.traps.find(q => q.x === tx && q.y === ty), dn = tr && t - (tr.down || -9) < 0.4; advDraw(dn ? 'plate_down' : 'plate_up', X + 24, Y + 40); continue; }
    if (v === DG.SPIKE && advImg('spikes_up')) { const tr = d.traps.find(q => q.x === tx && q.y === ty), warn = tr && !tr.up && ((t + tr.ph) % 2.4) > 1.3; advDraw(tr && tr.up ? 'spikes_up' : 'spikes_down', X + 24, Y + 40); if (warn) { g.fillStyle = 'rgba(255,90,60,.3)'; g.fillRect(X, Y, DG_T, DG_T); } continue; }
    if (v === DG.UP || v === DG.DOWN) { for (let i = 0; i < 4; i++) { g.fillStyle = v === DG.UP ? `rgb(${150 - i * 20},${135 - i * 20},${115 - i * 20})` : `rgb(${80 - i * 18},${70 - i * 16},${70 - i * 16})`; g.fillRect(X + 4, Y + 4 + i * 10, 40, 9); } g.fillStyle = '#ffe9a8'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText(v === DG.UP ? 'OUT' : 'DOWN', X + 24, Y - 2); g.textAlign = 'left'; }
    else if (v === DG.PLATE) { const tr = d.traps.find(q => q.x === tx && q.y === ty), dn = tr && t - (tr.down || -9) < 0.4; g.fillStyle = '#5b5560'; g.fillRect(X + 8, Y + 8, 32, 32); g.fillStyle = dn ? '#3c3840' : '#77707c'; g.fillRect(X + 10, Y + 10 + (dn ? 2 : 0), 28, 26); }
    else if (v === DG.SPIKE) { const tr = d.traps.find(q => q.x === tx && q.y === ty); g.fillStyle = '#2a2428'; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.fillRect(X + 8 + i * 14, Y + 8 + j * 14, 5, 5);
      if (tr && tr.up) { g.fillStyle = '#c9c4cc'; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(X + 6 + i * 14, Y + 14 + j * 14); g.lineTo(X + 10.5 + i * 14, Y + 1 + j * 14); g.lineTo(X + 15 + i * 14, Y + 14 + j * 14); g.fill(); } }
      else if (tr && ((t + tr.ph) % 2.4) > 1.3) { g.fillStyle = 'rgba(255,90,60,.35)'; g.fillRect(X, Y, DG_T, DG_T); } } }
  // walls: dark tops, and a face where floor is below
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const v = dgAt(tx, ty), X = tx * DG_T, Y = ty * DG_T; if (!dgSolid(v)) continue;
    if (v === DG.GATE && advImg('gate_closed')) { const fl2 = fim2(tx, ty); if (fl2) g.drawImage(fl2, X, Y, DG_T, DG_T); advDraw('gate_closed', X + 24, Y + 46); continue; }
    if (v === DG.GATE) { g.fillStyle = '#4a3420'; g.fillRect(X, Y, DG_T, DG_T); g.fillStyle = '#8a8a96'; for (let i = 0; i < 4; i++) g.fillRect(X + 4 + i * 11, Y - 18, 5, DG_T + 18); g.fillRect(X, Y - 10, DG_T, 5); continue; }
    const below = !dgSolid(dgAt(tx, ty + 1)), wt = advImg('wall_top'); g.fillStyle = '#1b161d'; g.fillRect(X, Y - 18, DG_T, DG_T); if (wt) { g.globalAlpha = 0.55; g.drawImage(wt, X, Y - 18, DG_T, DG_T); g.globalAlpha = 1; }
    if (below && advImg('wall_face')) { const wf = advImg(v === DG.CRACK ? 'wall_crack' : (tx * 7 + ty) % 3 ? 'wall_face' : 'wall_face2') || advImg('wall_face'); g.drawImage(wf, X, Y + 12, DG_T, 36); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X, Y + 42, DG_T, 6); continue; }
    if (below) { g.fillStyle = pat ? pat.wall : '#4b3f46'; g.fillRect(X, Y + 30 - 18, DG_T, 36); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X, Y + 30 - 18 + 30, DG_T, 6);
      if (v === DG.CRACK) { g.fillStyle = 'rgba(255,240,210,.18)'; g.fillRect(X, Y + 12, DG_T, 36); g.strokeStyle = '#120d10'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + 22, Y + 14); g.lineTo(X + 28, Y + 24); g.lineTo(X + 20, Y + 32); g.lineTo(X + 30, Y + 44); g.moveTo(X + 28, Y + 24); g.lineTo(X + 38, Y + 28); g.stroke(); } }
    else if (v === DG.CRACK) { g.strokeStyle = 'rgba(255,240,210,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + 10, Y - 10); g.lineTo(X + 24, Y + 4); g.lineTo(X + 38, Y - 6); g.stroke(); } }
  for (const tr of d.traps) if (tr.walls) for (const [wx, wy, s2] of tr.walls) { const X = wx * DG_T + 24 - s2 * 14, Y = wy * DG_T + 38; if (!advDraw('dart_shooter', X, Y, s2 > 0)) break; }
  for (const o of d.decor) if (!o.eaten && Math.abs(o.x - cam.x - VW / 2) < VW && Math.abs(o.y - cam.y - VH / 2) < VH) advDraw(o.k, o.x, o.y, o.flip);
  if (d.spring) dgDrawSpring(d.spring);
  for (const tc of d.torches) { const X = tc.x * DG_T + 24, Y = tc.y * DG_T + 22; if (Math.abs(X - cam.x - VW / 2) > VW) continue; if (advImg('torch__f1') ? advDraw('torch__f' + (1 + Math.floor(t * 9 + tc.x) % 4), X, Y + 26) : advDraw('torch', X, Y + 26, false, 1.6)) continue; g.fillStyle = '#5a3a1a'; g.fillRect(X - 3, Y, 6, 14); const f = Math.sin(t * 13 + X) * 2; g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(X, Y - 4, 6, 10 + f, 0, 0, 7); g.fill(); g.fillStyle = '#ffe28a'; g.beginPath(); g.ellipse(X, Y - 2, 3, 5 + f / 2, 0, 0, 7); g.fill(); }
  const list = [];
  for (const c of d.chests) list.push({ y: c.y, f: () => dgDrawChest(c) });
  if (d.rope) list.push({ y: d.rope.y, f: () => dgDrawRope(d.rope) });
  apples.forEach(a => list.push({ y: a.y, f: () => drawApple(a) })); matItems.forEach(m => list.push({ y: m.y, f: () => { const im = iconImg(MATS[m.id].icon); if (im && im.complete) { shadow(m.x, m.y + 10, 10); g.drawImage(im, m.x - 14, m.y - 18 - (m.fall / 0.45) * 50, 28, 28); } } }));
  d.foes.forEach(e => list.push({ y: e.y, f: () => wDrawFoe(e) })); WILD.hearts.forEach(h => list.push({ y: h.y, f: () => wDrawHeart(h) }));
  list.push({ y: P.y, f: () => { const sv = carry; carry = WILD.bag.apples.slice(0, 6); try { drawCoon(); } finally { carry = sv; } } });
  list.sort((a, b) => a.y - b.y).forEach(i => i.f());
  WILD.shots.forEach(s => { if (s.dart && advDraw('dart', s.x, s.y + 6, s.vx < 0)) return; if (s.web && advDraw('web_blob', s.x, s.y + 8)) return; if (s.dart) { g.strokeStyle = '#d9cbb0'; g.lineWidth = 3; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - Math.sign(s.vx) * 14, s.y); g.stroke(); } else { g.fillStyle = s.web ? '#eee' : '#d9cbb0'; g.beginPath(); g.arc(s.x, s.y, s.web ? 5 : 3.5, 0, 7); g.fill(); } });
  wDrawSwipe(); wDrawFx();
  if (WILD.hint) { const o = WILD.hint, txt = (isTouch ? 'Shake: ' : 'E: ') + { chest: 'open the chest', bank: 'stash your bag in the chest (it goes home)', rope: 'climb the rope out to the Wilds', spring: 'drink from the spring (full hearts)', shroom: 'eat the cave mushroom (+1 heart)', up: 'climb out to the Wilds', down: 'go down (floor ' + (d.floor + 1) + ')' }[o.k]; g.font = 'bold 13px "Trebuchet MS",sans-serif'; const w2 = g.measureText(txt).width + 18; g.fillStyle = 'rgba(10,24,40,.85)'; g.fillRect(o.x - w2 / 2, o.y - 84, w2, 22); g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.fillText(txt, o.x, o.y - 69); g.textAlign = 'left'; }
  drawPops(false); g.restore(); dgDark(); dgBossBar(); wHud(); tipTick(); drawTip(); g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); drawPops(true); g.restore(); drawSpeaker(); drawPause();
}
function fim2(tx, ty) { const fh = (tx * 73856093 ^ ty * 19349663 ^ WILD.dg.var) >>> 0; return advImg(fh % 11 < 6 ? 'floor_b' : 'floor_a'); }
function dgDrawRope(r) {                                         // a shaft of daylight and a knotted rope hanging from a hole in the roof
  const drop = Math.min(1, (t - r.t0) / 0.8), top = r.y - 420, bot = top + (r.y - 6 - top) * drop, sw = Math.sin(t * 1.6) * 3;
  g.save(); const gr = g.createLinearGradient(0, top, 0, r.y); gr.addColorStop(0, 'rgba(255,240,190,.32)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(r.x - 22, top); g.lineTo(r.x + 22, top); g.lineTo(r.x + 46, r.y + 10); g.lineTo(r.x - 46, r.y + 10); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,240,190,.18)'; g.beginPath(); g.ellipse(r.x, r.y + 4, 40, 12, 0, 0, 7); g.fill();
  g.strokeStyle = '#6b4a2b'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(r.x, top); g.quadraticCurveTo(r.x + sw, (top + bot) / 2, r.x + sw * 1.5, bot); g.stroke();
  g.strokeStyle = '#a77a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(r.x - 1, top); g.quadraticCurveTo(r.x + sw - 1, (top + bot) / 2, r.x + sw * 1.5 - 1, bot); g.stroke();
  if (drop >= 1) { g.fillStyle = '#6b4a2b'; for (const k of [0.55, 0.75, 0.95]) { g.beginPath(); g.arc(r.x + sw * 1.5 * k, top + (bot - top) * k, 5, 0, 7); g.fill(); } }
  g.restore();
}
function dgDrawSpring(s) {                                      // a healing spring: a stone ring with glowing water (dull once drunk)
  const x = s.x, y = s.y; g.fillStyle = '#4d4652'; g.beginPath(); g.ellipse(x, y, 30, 15, 0, 0, 7); g.fill(); g.fillStyle = '#6a6270'; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; g.beginPath(); g.arc(x + Math.cos(a) * 28, y + Math.sin(a) * 13, 5, 0, 7); g.fill(); }
  g.fillStyle = s.used ? '#2d3a44' : `rgb(${90 + Math.sin(t * 2) * 20},${200 + Math.sin(t * 2) * 25},255)`; g.beginPath(); g.ellipse(x, y, 21, 9, 0, 0, 7); g.fill();
  if (!s.used) { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; g.fillRect(x + Math.cos(a) * 12, y + Math.sin(a) * 4 - 1, 2, 2); } const r = (t * 0.8) % 1; g.strokeStyle = `rgba(200,250,255,${1 - r})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 21 * r, 9 * r, 0, 0, 7); g.stroke(); }
}
function dgDrawChest(c) {
  const ak = (c.rich > 1 ? 'chest_big' : 'chest') + (c.open ? '_open' : ''); if (advImg(ak)) { shadow(c.x, c.y, 22); if (c.rich > 1 && !c.open) { g.fillStyle = `rgba(255,210,63,${0.18 + 0.1 * Math.sin(t * 4)})`; g.beginPath(); g.arc(c.x, c.y - 18, 38, 0, 7); g.fill(); }
    advDraw(ak, c.x, c.y + 4, false, c.rich === 3 ? 1.25 : 1); if (c.rich === 3) advDraw('mk_hoard', c.x + 62, c.y + 8, false, 0.55); return; }
  const im = wImgK('hide_chest'); shadow(c.x, c.y, 22); const s = c.rich === 3 ? 1.5 : 1; if (c.rich > 1 && !c.open) { g.fillStyle = `rgba(255,210,63,${0.18 + 0.1 * Math.sin(t * 4)})`; g.beginPath(); g.arc(c.x, c.y - 18, 34 * s, 0, 7); g.fill(); }
  if (im) { const w = 48 * s, h = 41 * s; g.drawImage(im, Math.round(c.x - w / 2), Math.round(c.y - h + 4), w, h); if (c.open) { g.fillStyle = '#1a0f08'; g.fillRect(c.x - w * 0.36, c.y - h * 0.62, w * 0.72, h * 0.18); } }
  else { g.fillStyle = c.open ? '#5a3a1a' : '#8a5a2a'; g.fillRect(c.x - 20 * s, c.y - 28 * s, 40 * s, 28 * s); g.fillStyle = '#ffd23f'; g.fillRect(c.x - 3, c.y - 18 * s, 6, 7); }
}
function dgDrawFoe(e, fl) {                                    // cave creatures (drawn until they have their own pictures)
  const x = e.x, y = e.y, f = e.face || 1, w = Math.sin(e.anim) * 2; g.save();
  if (e.kind === 'rat') { shadow(x, y, 12); g.translate(x, y); g.scale(f, 1); g.fillStyle = fl ? '#fff' : '#6d6470'; g.beginPath(); g.ellipse(0, -8, 13, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(11, -10, 7, 5, 0.3, 0, 7); g.fill(); g.fillStyle = '#e7a3b0'; g.beginPath(); g.arc(6, -16, 3, 0, 7); g.fill(); g.fillRect(17, -10, 2, 2);
    g.strokeStyle = '#e7a3b0'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(-24, -14 + w * 2, -30, -4); g.stroke(); g.fillStyle = '#111'; g.fillRect(13, -12, 2, 2); }
  else if (e.kind === 'beetle') { shadow(x, y, 18); g.translate(x, y); g.scale(f, 1); const aim = e.st === 'aim' ? Math.sin(t * 50) * 2 : 0; g.translate(aim, 0); g.strokeStyle = '#1a1420'; g.lineWidth = 2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 7, -8); g.lineTo(i * 9 + w, 2); g.stroke(); }
    g.fillStyle = fl ? '#fff' : '#2e5a6e'; g.beginPath(); g.ellipse(0, -14, 18, 12, 0, 0, 7); g.fill(); g.fillStyle = '#4b8aa3'; g.beginPath(); g.ellipse(-3, -18, 10, 5, 0, 0, 7); g.fill(); g.strokeStyle = '#173040'; g.beginPath(); g.moveTo(-2, -26); g.lineTo(-2, -2); g.stroke(); g.fillStyle = '#1a1420'; g.beginPath(); g.arc(17, -13, 6, 0, 7); g.fill(); g.fillStyle = '#c9b46a'; g.fillRect(21, -20, 3, 9); }
  else if (e.kind === 'spider') { shadow(x, y, 14); g.translate(x, y - 6); g.strokeStyle = '#1a1018'; g.lineWidth = 2; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const k = Math.sin(e.anim + i) * 3; g.beginPath(); g.moveTo(0, -8); g.lineTo(s * (10 + i * 2), -16 + i * 4 + k); g.lineTo(s * (16 + i * 3), 4); g.stroke(); }
    g.fillStyle = fl ? '#fff' : '#3c2440'; g.beginPath(); g.arc(0, -10, 10, 0, 7); g.fill(); g.beginPath(); g.arc(0, -20, 6, 0, 7); g.fill(); g.fillStyle = '#ff5a5a'; g.fillRect(-4, -22, 2, 2); g.fillRect(2, -22, 2, 2); g.fillStyle = '#8a3a8a'; g.fillRect(-3, -12, 6, 3); }
  else if (e.kind === 'moleking' && advImg('moleking__side')) { g.restore(); dgDrawMole(e, fl); return; }
  else if (e.kind === 'moleking') { const b = e; if (b.under) { g.fillStyle = '#5a3f28'; const r = b.st === 'mark' ? 30 + Math.sin(t * 20) * 3 : 22; g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, 7); g.fill(); g.fillStyle = '#7a5a3a'; for (let i = 0; i < 6; i++) g.fillRect(x + Math.cos(i + t * 6) * r * 0.8 - 3, y + Math.sin(i + t * 6) * r * 0.35 - 3, 6, 6);
      if (b.st === 'mark' && t > b.t1 - 0.45) { g.strokeStyle = 'rgba(255,80,60,.8)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 64, 32, 0, 0, 7); g.stroke(); } g.restore(); return; }
    const rise = b.st === 'rise' ? Math.max(0, (b.t1 - t) / 1.6) : 0, rear = b.st === 'aim' ? 8 : 0, s = 1.0; shadow(x, y, 40); g.translate(x, y + rise * 60); g.scale(f * s, s); if (rise) { g.beginPath(); g.rect(-80, -140, 160, 140 - 0); g.clip(); }
    g.fillStyle = fl ? '#fff' : '#4a3a4e'; g.beginPath(); g.ellipse(0, -36 - rear, 40, 36, 0, 0, 7); g.fill(); g.fillStyle = '#6a5470'; g.beginPath(); g.ellipse(-6, -44 - rear, 22, 18, 0, 0, 7); g.fill();
    g.fillStyle = '#f2a0b4'; g.beginPath(); g.ellipse(38, -40 - rear, 11, 8, 0, 0, 7); g.fill(); for (const s2 of [1, -1]) { g.fillStyle = '#e8d6c0'; g.beginPath(); g.ellipse(24, -14 - rear + s2 * 4, 12, 7, 0.4 * s2, 0, 7); g.fill(); g.fillStyle = '#fff6e6'; for (let i = 0; i < 4; i++) g.fillRect(32 + i * 2, -18 - rear + s2 * 6 + i * s2, 6, 2); }
    g.fillStyle = '#111'; g.fillRect(22, -52 - rear, 4, 3); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-4, -68 - rear); for (let i = 0; i <= 4; i++) { g.lineTo(-4 + i * 7, i % 2 ? -78 - rear : -86 - rear); g.lineTo(-1 + i * 7, -70 - rear); } g.lineTo(28, -66 - rear); g.closePath(); g.fill(); g.fillStyle = '#e8455a'; g.fillRect(9, -74 - rear, 4, 4);
    if (b.st === 'dizzy') { g.restore(); g.save(); for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.fillStyle = '#ffd23f'; g.fillRect(x + Math.cos(a) * 26 - 3, y - 96 + Math.sin(a) * 6, 6, 6); } } }
  g.restore();
}
function dgDrawMole(b, fl) {
  const x = b.x, y = b.y; let k, flip = (b.face || 1) < 0, lift = 0, a = 1;
  if (b.dead) { k = 'mk_defeat'; a = 1; } else if (b.st === 'rise') { k = 'mk_rise'; } else if (b.st === 'summon') k = 'mk_summon'; else if (b.st === 'burrow') k = 'mk_burrow_a'; else if (b.st === 'mark') k = 'mk_mound';
  else if (b.st === 'dizzy') k = 'moleking__hurt'; else if (b.st === 'aim' || b.st === 'charge') k = 'moleking__attack'; else { const p = advPose(b); k = 'moleking__' + (p === 'hurt' ? 'side' : p === 'attack' ? 'attack' : p); if (k === 'moleking__side' && advImg('moleking__walk1')) k = 'moleking__walk' + (1 + Math.floor(t * 6) % 4); }
  if (b.st === 'charge' && advImg('moleking__run1')) k = 'moleking__run' + (1 + Math.floor(t * 10) % 2);
  if (k.startsWith('moleking__side') || k.startsWith('moleking__walk') || k.startsWith('moleking__run') || k === 'moleking__attack' || k === 'moleking__hurt') { if (b.st === 'chase' && Math.abs(P.x - x) > 6) b.face = P.x > x ? 1 : -1; flip = (b.face || 1) < 0; } else if (k !== 'mk_mound' && k !== 'mk_burrow_a') flip = false;
  if (k === 'mk_mound') { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 40, 14, 0, 0, 7); g.fill(); advDraw(k, x + Math.sin(t * 30) * 2, y + 6, flip, 0.7); if (t > b.t1 - 0.45) { g.strokeStyle = 'rgba(255,80,60,.85)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 64, 32, 0, 0, 7); g.stroke(); } return; }
  if (b.st === 'aim') lift = Math.abs(Math.sin(t * 40)) * 3; shadow(x, y, 46); if (fl) g.filter = 'brightness(2.4)'; if (b.dead) g.globalAlpha = 1;
  advDraw(k, x, y + 6, flip, 1, lift); g.filter = 'none';
  if (b.st === 'dizzy') for (let i = 0; i < 3; i++) { const q = t * 6 + i * 2.1; g.fillStyle = '#ffd23f'; g.fillRect(x + Math.cos(q) * 26 - 3, y - 120 + Math.sin(q) * 6, 6, 6); }
}
function dgBossBar() { const b = WILD.dg.boss; if (!b || b.dead || !WILD.dg.bossOn) return; const w = Math.min(420, VW - 60), x = VW / 2 - w / 2, y = VH - 40; g.fillStyle = 'rgba(10,10,20,.85)'; g.fillRect(x - 4, y - 18, w + 8, 34); g.fillStyle = '#ffe9a8'; g.font = 'bold 12px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillText('THE MOLE KING', VW / 2, y - 6); g.textAlign = 'left'; g.fillStyle = '#3a1418'; g.fillRect(x, y, w, 10); g.fillStyle = '#e8455a'; g.fillRect(x, y, w * Math.max(0, b.hp / b.hpMax), 10); }
let DGDARK = null;
function dgDark() {
  if (!DGDARK || DGDARK.width !== VW || DGDARK.height !== VH) { DGDARK = document.createElement('canvas'); DGDARK.width = VW; DGDARK.height = VH; }
  const x = DGDARK.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, VW, VH); x.fillStyle = 'rgba(4,3,10,.9)'; x.fillRect(0, 0, VW, VH); x.globalCompositeOperation = 'destination-out';
  const hole = (wx, wy, r, a) => { const sx = wx - cam.x, sy = wy - cam.y; if (sx < -r || sy < -r || sx > VW + r || sy > VH + r) return; const gr = x.createRadialGradient(sx, sy, r * 0.2, sx, sy, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(sx - r, sy - r, r * 2, r * 2); };
  hole(P.x, P.y - 20, 250, 1); for (const tc of WILD.dg.torches) hole(tc.x * DG_T + 24, tc.y * DG_T + 30, 170 + Math.sin(t * 9 + tc.x) * 6, 0.85);
  for (const c of WILD.dg.chests) if (c.rich > 1 && !c.open) hole(c.x, c.y - 16, 80, 0.6); for (const o of WILD.dg.decor || []) if (o.glow && !o.eaten) hole(o.x, o.y - 12, 70, 0.55); const sp = WILD.dg.spring; if (sp && !sp.used) hole(sp.x, sp.y - 8, 130, 0.8); const b = WILD.dg.boss; if (b && !b.dead) hole(b.x, b.y - 30, 140, 0.5);
  g.drawImage(DGDARK, 0, 0);
}
function dgMinimap() {
  const d = WILD.dg, s = 3, x0 = VW - DG_N * s - 10, y0 = 44; g.fillStyle = 'rgba(10,10,20,.75)'; g.fillRect(x0 - 3, y0 - 3, DG_N * s + 6, DG_N * s + 6);
  for (let i = 0; i < DG_N * DG_N; i++) { if (!d.seen[i]) continue; const v = d.g[i]; if (dgSolid(v) && v !== DG.GATE) continue; g.fillStyle = v === DG.UP ? '#7fe07f' : v === DG.DOWN ? '#b28cff' : v === DG.GATE ? '#e8455a' : '#6a6070'; g.fillRect(x0 + (i % DG_N) * s, y0 + Math.floor(i / DG_N) * s, s, s); }
  for (const c of d.chests) if (!c.open && d.seen[Math.floor(c.y / DG_T) * DG_N + Math.floor(c.x / DG_T)]) { g.fillStyle = '#ffd23f'; g.fillRect(x0 + c.x / DG_T * s - 1.5, y0 + c.y / DG_T * s - 1.5, 3, 3); }
  g.fillStyle = '#ff6a6a'; g.beginPath(); g.arc(x0 + P.x / DG_T * s, y0 + P.y / DG_T * s, 2.5, 0, 7); g.fill();
}
