/* ===== NIGHT CONDITIONS =====
   Every night rolls one condition. It changes what both sides should do, not just how the orchard looks.
   fx values multiply the game's normal numbers (cone = flashlight length, see = the farmer's glow, trackLife/trackRange = footprints,
   sniff = how far dogs smell) - add or edit conditions here. */
const NIGHT_MODS = [
  { id: 'clear',   name: 'Clear Night',       desc: 'No surprises tonight.' },
  { id: 'fog',     name: 'Foggy Night',       desc: 'Thick fog: you cannot see far, and the flashlights are shorter too.',   fx: { cone: 0.7, see: 0.7, fog: true, clouds: 14, cloudA: 0.7, cloudV: 9 } },
  { id: 'harvest', name: 'Golden Harvest',    desc: 'Three jackpot apples glow deep in the orchard, worth 6 each.',          fx: { jackpots: 3 } },
  { id: 'tracks',  name: 'Fresh Tracks',      desc: 'Footprints last twice as long and show from farther away.',             fx: { trackLife: 2, trackRange: 1.35 } },
  { id: 'strange', name: 'Something Strange', desc: 'A strange light glows somewhere in the orchard. Worth the detour?',     fx: { strange: true } },
  { id: 'wind',    name: 'Windy Night',       desc: 'Wind hides footprints and the sound of shaken trees, but dogs smell farther.', fx: { trackLife: 0.5, quiet: true, sniff: 1.3, clouds: 7, cloudA: 0.38, cloudV: 30 } },
  { id: 'moon',    name: 'Full Moon',         desc: 'A bright night: the farmers see farther, and more apples lie around.',  fx: { cone: 1.2, see: 1.5, tint: 0.2, ground: 4 } },
];
const MODX = {};                                            // tonight's effects, read all over the game
let MOD = NIGHT_MODS[0], runMod = null;                     // runMod = a condition the players picked for the whole run (null = random each night)
if (typeof location !== 'undefined' && /clear/.test(location.hash || '')) runMod = 'clear';     // add #clear to the web address to play without night conditions (the tests do)
let strange = null, mothNight = false, ignoreDogs = 0, compassUntil = 0, bannerUntil = 0;
function setMod(id) {
  MOD = NIGHT_MODS.find(m => m.id === id) || NIGHT_MODS[0];
  Object.assign(MODX, { cone: 1, see: 1, trackLife: 1, trackRange: 1, sniff: 1, tint: 0.42, ground: 0, fog: false, quiet: false, jackpots: 0, strange: false, clouds: 0, cloudA: 0.7, cloudV: 10 }, MOD.fx || {});
  makeClouds();
}
setMod('clear');
function rollMod() {                                        // host: choose tonight's condition
  const pool = NIGHT_MODS.slice(1).filter(m => m.id !== MOD.id);
  if (daily) return setMod(dailyPick(NIGHT_MODS.slice(1)).id);
  setMod(runMod || (Math.random() < 0.15 ? 'clear' : pool[Math.floor(Math.random() * pool.length)].id));
}
function modSetup() {                                       // host: after the orchard is laid out - jackpot apples and the strange light
  strange = null; mothNight = false; ignoreDogs = 0; compassUntil = 0;
  const used = [], far = apart => {                         // the clear spot farthest from the den out of many tries, and not next to another special spot
    let best = null, bd = -1;
    for (let n = 0; n < 120; n++) { const x = lrnd(80, W - 80), y = lrnd(120, H - 80); if (!clearSpot(x, y, 40) || (RIVER && riverSide(x, y) !== -denSide()) || used.some(u => Math.hypot(u.x - x, u.y - y) < apart)) continue; const d = Math.hypot(x - den.x, y - den.y); if (d > bd) { bd = d; best = { x, y }; } }
    const p = best || { x: W - 120 - used.length * 160, y: 140 }; used.push(p); return p;
  };
  for (let i = 0; i < MODX.jackpots; i++) { const p = far(220); apples.push({ x: p.x, y: p.y, gold: true, jackpot: true, value: 6, t: 0, fall: 0, kind: 'tree' }); }
  if (MODX.strange) { const p = far(220); strange = { x: p.x, y: p.y, prog: 0, fprog: 0, found: false }; }
}
function modUpdate(dt) {                                    // host, every frame
  if (strange && !strange.found) {                          // investigate the light by standing next to it for a couple of seconds
    const near = !P.tree && !slam && Math.hypot(P.x - strange.x, P.y - strange.y) < 48, fh = multi ? myFarmer() : null, fnear = !!fh && Math.hypot(fh.x - strange.x, fh.y - strange.y) < 48;
    strange.prog = near && !fnear ? Math.min(1, strange.prog + dt / 2.5) : Math.max(0, strange.prog - dt * 0.6);       // both standing there: neither makes progress (a stand-off)
    strange.fprog = fnear && !near ? Math.min(1, (strange.fprog || 0) + dt / 2.5) : Math.max(0, (strange.fprog || 0) - dt * 0.6);
    if (strange.prog >= 1) { strange.found = true; discover('raccoon'); } else if (strange.fprog >= 1) { strange.found = true; discover('farmer'); }
  }
  statsUpdate(dt);
}
/* ----- drawing ----- */
function drawStrange(sx, sy) {                              // the strange light: a pulsing violet glow with a progress ring while someone investigates
  if (!strange || strange.found) return; const pulse = 0.75 + 0.25 * Math.sin(t * 3), r = 64 + 8 * pulse, gr = g.createRadialGradient(sx, sy, 4, sx, sy, r);
  gr.addColorStop(0, `rgba(245,215,255,${pulse})`); gr.addColorStop(0.45, `rgba(190,120,255,${0.55 * pulse})`); gr.addColorStop(1, 'rgba(150,80,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
  if (strange.prog > 0) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(sx, sy, 22, -Math.PI / 2, -Math.PI / 2 + 6.283 * strange.prog); g.stroke(); }
  if (strange.fprog > 0) { g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(sx, sy, 30, -Math.PI / 2, -Math.PI / 2 + 6.283 * strange.fprog); g.stroke(); }     // the farmer's ring
}
function drawFog() {                                        // raccoon's view in fog: far things fade away
  if (!MODX.fog || viewRole() !== 'raccoon') return; const sx = P.x - cam.x, sy = P.y - 30 - cam.y, gr = g.createRadialGradient(sx, sy, 120, sx, sy, 380);
  gr.addColorStop(0, 'rgba(170,180,195,0)'); gr.addColorStop(1, 'rgba(170,180,195,.78)'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
}
function edgeArrow(wx, wy, col) {                           // a small arrow at the screen edge pointing at something off screen
  const sx = wx - cam.x, sy = wy - cam.y; if (sx > 20 && sx < VW - 20 && sy > 60 && sy < VH - 20) return;
  const cx = VW / 2, cy = VH / 2 + 20, a = Math.atan2(sy - cy, sx - cx), r = Math.min((VW / 2 - 24) / (Math.abs(Math.cos(a)) || 1e-6), (VH / 2 - 54) / (Math.abs(Math.sin(a)) || 1e-6));
  g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a); g.fillStyle = col; g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, -7); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function drawCompass() { if (viewRole() !== 'raccoon' || t >= compassUntil) return; farmers.forEach(f => edgeArrow(f.x, f.y, '#7ec8ff')); dogs.forEach(d => edgeArrow(d.x, d.y, '#ffa94d')); }
function drawBanner() {                                     // the first seconds of a night: the level, tonight's condition and your challenge
  if (t > bannerUntil || state !== 'play') return; const a = Math.min(1, (bannerUntil - t) / 1.2), role = viewRole(), c = CH[role] && chDef(role, CH[role]), h = 40 + (LV ? 16 : 0) + (c ? 16 : 0);
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(8,14,20,.7)'; g.fillRect(VW / 2 - 250, 52, 500, h);
  g.fillStyle = '#ffd23f'; g.font = 'bold 20px "Trebuchet MS",Verdana,sans-serif'; g.fillText((LV ? LV.name + ' - ' : '') + MOD.name + (daily ? '  (daily)' : ''), VW / 2, 70);
  g.font = '13px "Trebuchet MS",Verdana,sans-serif'; let y = 90; g.fillStyle = '#fff7e6'; g.fillText(MOD.desc, VW / 2, y);
  if (LV) { y += 16; g.fillStyle = '#bfe6ff'; g.fillText(LV.desc, VW / 2, y); } if (c) { y += 16; g.fillStyle = '#9fe8ff'; g.fillText('Challenge: ' + c.name + ' - ' + c.desc, VW / 2, y); } g.restore();
}
