/* ===== REAL NIGHT: darkness, light sources and dread =====
   The raccoon's view is dark. What you can see is what is lit: a small glow around you (raccoon night eyes), the farmers' lanterns and
   flashlight cones, the den's warm light, golden apples, and dogs' eyes shining when they are near. Tuning lives in CONFIG.dark.
   Also here: DREAD (a heartbeat and a low drone that grow as a farmer or dog gets close, even when you are not seen) and CLOSE CALL
   (escape the light with the meter nearly full: slow-mo, a sting, bonus points).
   Add #bright to the web address to switch the darkness off (old screenshots / tests). */
CONFIG.dark = {
  on: !(typeof location !== 'undefined' && /bright/.test(location.hash || '')),
  alpha: 0.88,            // how dark a clear night is (0 = daylight, 1 = pitch black)
  moonAlpha: 0.7,         // Full Moon nights are lighter
  fogAlpha: 0.92,
  color: '4,8,26',        // the colour of the dark (deep blue)
  eyes: 175,              // raccoon night-vision radius (px)
  friendGlow: 70,         // a small glow around crewmates so you can find each other
  lantern: 85,            // glow around each farmer (his lantern)
  den: 95,                // the den's warm light
  dogEyes: 420,           // dogs this close show their eyes in the dark
  appleGlint: 300,        // ground apples this close twinkle so you can spot them
  dread: { range: 420, chaseBoost: 0.35 },          // how near a farmer/dog must be before the heartbeat starts
  close: { peak: 0.72, bonus: 5, slow: 0.35 },      // close call: meter got above peak, you escaped; bonus points; slow-mo seconds
};
const darkC = document.createElement('canvas'), dg = darkC.getContext('2d');
function darkAlpha() { const D = CONFIG.dark; return MOD && MOD.id === 'moon' ? D.moonAlpha : MODX.fog ? D.fogAlpha : D.alpha; }
const darkOn = () => CONFIG.dark.on && viewRole() === 'raccoon' && state === 'play';
function crewPositions() {                                  // every raccoon on the field: [{x, y, me}]
  if (COOP && RS.length) return RS.map((R, i) => R.gone ? null : i === cur ? { x: P.x, y: P.y, me: true, down: R.down > 0 } : { x: R.P.x, y: R.P.y, me: false, down: R.down > 0 }).filter(Boolean);
  return [{ x: P.x, y: P.y, me: true }];
}
function drawDarkness() {                                   // screen space, after the world (and before the HUD)
  if (!darkOn()) return false; const D = CONFIG.dark;
  if (darkC.width !== VW || darkC.height !== VH) { darkC.width = VW; darkC.height = VH; }
  const ox = Math.round(cam.x), oy = Math.round(cam.y);
  dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, VW, VH); dg.fillStyle = `rgba(${D.color},${darkAlpha()})`; dg.fillRect(0, 0, VW, VH);
  dg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, k = 1) => { if (r <= 0) return; const gr = dg.createRadialGradient(x, y, r * 0.25, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); dg.fillStyle = gr; dg.beginPath(); dg.arc(x, y, r, 0, 7); dg.fill(); };
  crewPositions().forEach(c => hole(c.x - ox, c.y - 25 - oy, c.me ? D.eyes * (P.tree ? 1.25 : 1) : D.friendGlow, c.me ? 0.92 : 0.7));
  hole(den.x - ox, den.y - oy, D.den * (1 + 0.3 * Math.min(1, denPulse || 0)), 0.8);
  for (const f of farmers) {                                // the light a farmer carries is the light you can see him by
    const x = f.x - ox, y = f.y - 20 - oy, c = coneOf(f), gr = dg.createRadialGradient(x, y, 8, x, y, c.len);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dg.fillStyle = gr; dg.beginPath(); dg.moveTo(x, y); dg.arc(x, y, c.len, f.look - c.half, f.look + c.half); dg.closePath(); dg.fill();
    hole(x, y, D.lantern, 0.85);
  }
  apples.forEach(a => { if (a.gold) hole(a.x - ox, a.y - 6 - oy, a.jackpot ? 60 : 34, a.jackpot ? 0.8 : 0.55); });
  if (strange && !strange.found) hole(strange.x - ox, strange.y - oy, 110, 0.85);
  g.drawImage(darkC, 0, 0);
  // things that shine through the dark
  g.save(); g.translate(-ox, -oy);
  const me = P, tw = k => 0.5 + 0.5 * Math.sin(t * 5 + k);
  for (const a of apples) { if (a.fall || a.gold) continue; const d = Math.hypot(a.x - me.x, a.y - me.y); if (d > D.appleGlint || d < D.eyes * 0.6) continue;
    const k = (1 - d / D.appleGlint) * (0.4 + 0.6 * tw(a.x)); g.fillStyle = `rgba(255,140,120,${0.7 * k})`; g.fillRect(a.x - 1, a.y - 8, 3, 3); g.fillStyle = `rgba(255,255,255,${0.6 * k})`; g.fillRect(a.x, a.y - 7, 1, 1); }
  for (const d of dogs) { const dist = Math.hypot(d.x - me.x, d.y - me.y); if (dist > D.dogEyes || dist < D.eyes * 0.7) continue;
    const k = Math.min(1, (1 - dist / D.dogEyes) * 1.6) * (Math.floor(t * 3 + d.x) % 7 === 0 ? 0.15 : 1), ex = d.x + (d.face || 1) * 10, ey = d.y - CONFIG.spriteHeight.dog * 0.62;   // a blink now and then
    g.fillStyle = d.chase ? `rgba(255,70,50,${k})` : `rgba(255,230,120,${k})`; g.fillRect(ex - 4, ey, 3, 3); g.fillRect(ex + 2, ey, 3, 3); }
  g.restore(); return true;
}
/* ----- DREAD: how close is danger (raccoon view) ----- */
const DREAD = { v: 0, next: 0, drone: null, peak: 0, slowUntil: 0 };
function dreadLevel() {
  if (viewRole() !== 'raccoon' || !P) return 0; const R = CONFIG.dark.dread.range; let best = 0;
  for (const f of farmers) { const d = Math.hypot(f.x - P.x, f.y - P.y); best = Math.max(best, 1 - d / R); }
  for (const d of dogs) { if (d.stun > 0) continue; const k = 1 - Math.hypot(d.x - P.x, d.y - P.y) / (R * 0.8); best = Math.max(best, k + (d.chase ? CONFIG.dark.dread.chaseBoost : 0)); }
  if (P.tree || hidden()) best *= 0.6;
  return clampN(Math.max(best, alertV), 0, 1);
}
function dreadTick(dt) {                                    // every frame from audioTick
  if (!AUD.ctx) return; const target = state === 'play' ? dreadLevel() : 0; DREAD.v += (target - DREAD.v) * Math.min(1, dt * 2.2);
  const c = AUD.ctx, now = c.currentTime, v = DREAD.v;
  if (!DREAD.drone) {                                        // a low, detuned drone under everything; its volume follows the dread
    const g1 = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; g1.gain.value = 0;
    [55, 55.6, 82.4].forEach(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); });
    lp.connect(g1); g1.connect(AUD.sfxBus); DREAD.drone = { g: g1, lp };
  }
  const muted = AUD.vol.mute || c.state !== 'running' || state !== 'play';
  DREAD.drone.g.gain.setTargetAtTime(muted ? 0 : Math.max(0, v - 0.15) * 0.16, now, 0.25); DREAD.drone.lp.frequency.setTargetAtTime(140 + v * 260, now, 0.3);
  if (muted || v < 0.12) { DREAD.next = 0; return; }
  if (!DREAD.next || DREAD.next < now) DREAD.next = now + 0.05;
  if (DREAD.next - now < 0.12) {                            // lub-dub: slow and soft when danger is far, fast and loud when it is on top of you
    const at = DREAD.next, vol = 0.12 + v * 0.55;
    aTone({ t: at, f: 70, f2: 38, dur: 0.16, vol, lp: 240 }); aTone({ t: at + 0.2 - v * 0.06, f: 62, f2: 36, dur: 0.14, vol: vol * 0.7, lp: 240 });
    DREAD.next = at + (1.05 - v * 0.62);
  }
}
/* ----- CLOSE CALL: host side, per raccoon (called right after its spotted meter is updated) ----- */
function closeCallCheck(dt, ref, seen) {                    // ref: an object to keep this raccoon's numbers on (P works: one per raccoon)
  const C = CONFIG.dark.close;
  if (inv > 0) { ref._ccPeak = 0; ref._ccOut = 0; return; }          // just caught (or safe after it): no close call
  if (seen) { ref._ccPeak = Math.max(ref._ccPeak || 0, alertV); ref._ccOut = 0; return; }
  if (!(ref._ccPeak >= C.peak)) { ref._ccPeak = 0; return; }
  ref._ccOut = (ref._ccOut || 0) + dt; if (ref._ccOut < 0.6) return;  // out of the light long enough to count as an escape
  ref._ccPeak = 0; ref._ccOut = 0; score += C.bonus; stat('closeCalls'); if (!multi) DREAD.slowUntil = performance.now() + C.slow * 1000;
  pop(P.x, P.y - 70, 'CLOSE CALL! +' + C.bonus, '#9fe8ff', true);
}
const slowMo = () => performance.now() < DREAD.slowUntil ? 0.35 : 1;
