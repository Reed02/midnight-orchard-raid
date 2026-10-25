/* ===== SOUND: everything is synthesized with the Web Audio API (no audio files) =====
   Music: a slow, slightly spooky music-box waltz that gets tenser (heartbeat) when you are spotted or chased.
   Effects: footsteps, rustling, barks, whistle, alert tone and more. Sounds are positional: you hear them
   louder and from the left or right depending on where they happen (the farmer hears the raccoon this way). */
const SOUND = {
  defaults: { master: 0.8, music: 0.35, sfx: 0.8 },      // starting volumes, 0 to 1 (players change them in the Sound menu; saved per browser)
  bpm: 96,                                                // music tempo (it is a waltz, three beats to a bar)
  grass: { use: true, rateRaccoon: 1.0, rateFarmer: 0.88, lowpass: 7500, gain: 0.55 },   // footsteps use the real walking-on-grass recording (the SAMPLES block at the bottom of the file); use:false = synthesized steps
  stride: { raccoon: 44, farmer: 62 },                    // pixels walked between footsteps
  minStepGap: 0.12,                                       // seconds; stops a dash from machine-gunning steps
};
const AUD = { ctx: null, master: null, musicBus: null, sfxBus: null, noise: null, alert: null, vol: { ...SOUND.defaults, mute: false }, tension: 0, beat: 0, nextT: 0, timer: 0 };
try { const s = JSON.parse(localStorage.getItem('raidSound')); if (s) { for (const k of ['master', 'music', 'sfx']) if (typeof s[k] === 'number') AUD.vol[k] = clampN(s[k], 0, 1); if (s.mute) AUD.vol.mute = true; } } catch (e) {}
const saveSound = () => { try { localStorage.setItem('raidSound', JSON.stringify(AUD.vol)); } catch (e) {} };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* ----- engine ----- */
function audioBuild(ctx) {
  AUD.ctx = ctx; AUD.master = ctx.createGain(); AUD.musicBus = ctx.createGain(); AUD.sfxBus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor(), lp = ctx.createBiquadFilter();           // the compressor keeps busy moments from clipping
  lp.type = 'lowpass'; lp.frequency.value = 5200;
  AUD.musicBus.connect(lp); lp.connect(AUD.master); AUD.sfxBus.connect(AUD.master); AUD.master.connect(comp); comp.connect(ctx.destination);
  AUD.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
  const d = AUD.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 300; g.gain.value = 0; o.connect(g); g.connect(AUD.sfxBus); o.start();   // the rising "you are being seen" tone
  AUD.alert = { osc: o, gain: g };
  applyVolumes(true); loadSamples();
}
function applyVolumes(now) {
  if (!AUD.ctx) return; const v = AUD.vol, t = AUD.ctx.currentTime, k = now ? 0.001 : 0.04;
  AUD.master.gain.setTargetAtTime(v.mute ? 0 : v.master, t, k); AUD.musicBus.gain.setTargetAtTime(v.music * 0.7, t, k * 2); AUD.sfxBus.gain.setTargetAtTime(v.sfx, t, k);
}
function audioInit() {
  if (AUD.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { audioBuild(new AC()); musicStart(); } catch (e) { AUD.ctx = null; }
}
function audioUnlock() { if (!AUD.ctx) audioInit(); else if (AUD.ctx.state === 'suspended' && !document.hidden) AUD.ctx.resume(); }     // browsers only allow sound after a click or key press
addEventListener('pointerdown', audioUnlock, true); addEventListener('keydown', audioUnlock, true);
addEventListener('visibilitychange', () => { if (AUD.ctx && AUD.ctx.suspend) { if (document.hidden) AUD.ctx.suspend(); else AUD.ctx.resume(); } });
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#ov button')) sfxPlay('ui'); }, true);     // capture phase: runs before the button's own handler rebuilds the screen
function toggleMute() { AUD.vol.mute = !AUD.vol.mute; applyVolumes(); saveSound(); }
function setVol(id, v) { AUD.vol[id] = clampN(+v / 100, 0, 1); applyVolumes(); saveSound(); if (id === 'sfx' && AUD.ctx && (!AUD.lastBlip || performance.now() - AUD.lastBlip > 250)) { AUD.lastBlip = performance.now(); sfxPlay('pickup'); } }

/* ----- building blocks ----- */
function aPan(node, pan) { if (!pan || !AUD.ctx.createStereoPanner) return node; const p = AUD.ctx.createStereoPanner(); p.pan.value = clampN(pan, -1, 1); node.connect(p); return p; }
function aTone(o) {                                       // one oscillator with a quick attack and an exponential fade; f2 slides the pitch
  const c = AUD.ctx, t = o.t === undefined ? c.currentTime : o.t, osc = c.createOscillator(), g = c.createGain(), vol = Math.max(o.vol, 0.0002);
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g); let out = g;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; out.connect(f); out = f; }
  aPan(out, o.pan).connect(o.bus || AUD.sfxBus); osc.start(t); osc.stop(t + o.dur + 0.05);
}
function aNoise(o) {                                      // filtered noise burst (footsteps, rustles, whooshes)
  const c = AUD.ctx, t = o.t === undefined ? c.currentTime : o.t, src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(), vol = Math.max(o.vol, 0.0002);
  src.buffer = AUD.noise; src.loop = true; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur); f.Q.value = o.q || 1;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f); f.connect(g); aPan(g, o.pan).connect(o.bus || AUD.sfxBus); src.start(t, Math.random() * 0.4); src.stop(t + o.dur + 0.05);
}

function aRustle(o) {                                     // leaves / grass: many tiny random crackles (grains) in a few frequency bands, with a soft "air" underneath
  const c = AUD.ctx, t = o.t === undefined ? c.currentTime : o.t, bands = o.bands || [[1800, 1.2, 1], [3200, 1.6, .8], [5200, 1.8, .4]];
  bands.forEach(([f, q, w]) => {
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); src.buffer = AUD.noise; src.loop = true; bp.type = 'bandpass'; bp.frequency.value = f * (0.9 + Math.random() * 0.2); bp.Q.value = q;
    g.gain.setValueAtTime(0, t); let tt = t, end = t + o.dur;
    while (true) {
      tt += -Math.log(1 - Math.random()) / (o.density || 60) + 0.002; if (tt >= end) break;                        // random gaps, so it never sounds like a pattern
      const u = (tt - t) / o.dur, swell = Math.pow(Math.sin(Math.PI * u), 0.7), len = 0.005 + Math.random() * 0.014, pk = o.vol * w * (0.25 + Math.random() * 0.75) * swell;
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(pk, tt + 0.002 + Math.random() * 0.003); g.gain.linearRampToValueAtTime(0, tt + len); tt += len;
    }
    src.connect(bp); bp.connect(g); aPan(g, o.pan).connect(AUD.sfxBus); src.start(t, Math.random() * 0.4); src.stop(end + 0.05);
  });
  if (o.air) aNoise({ t, dur: o.dur, vol: o.air, type: 'bandpass', f: 800, f2: 500, q: .5, a: o.dur * .45, pan: o.pan });
}

function loadSamples() {                                  // decode the recorded clips (small base64 mp3s) once the audio engine exists
  AUD.samples = {}; if (typeof SAMPLES === 'undefined') return;
  for (const k in SAMPLES) {
    AUD.samples[k] = [];
    SAMPLES[k].forEach(uri => {
      try {
        const bin = atob(uri.split(',').pop()), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        let done = false; const ok = buf => { if (!done && buf) { done = true; AUD.samples[k].push(buf); } };
        const p = AUD.ctx.decodeAudioData(u.buffer, ok, () => {}); if (p && p.then) p.then(ok, () => {});
      } catch (e) {}
    });
  }
}
function grassClip(kind) {                                // a recorded clip, never the same one twice in a row (left foot, right foot)
  const a = SOUND.grass.use && AUD.samples && AUD.samples[kind]; if (!a || !a.length) return null;
  let i = Math.floor(Math.random() * a.length); if (a.length > 1 && i === AUD['_last' + kind]) i = (i + 1) % a.length; AUD['_last' + kind] = i; return a[i];
}
function aSample(buf, o) {                                // play a recorded clip: o = { t, vol, rate, lp, offset, pan }
  const c = AUD.ctx, t = o.t === undefined ? c.currentTime : o.t, src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.playbackRate.value = o.rate || 1; g.gain.value = Math.max(o.vol, 0.0002); src.connect(g); let out = g;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; out.connect(f); out = f; }
  aPan(out, o.pan).connect(o.bus || AUD.sfxBus); src.start(t, o.offset || 0); AUD.sampleCount = (AUD.sampleCount || 0) + 1;
}

/* ----- the sound effects: (time, volume, pan, option) ----- */
const SFX = {
  footRaccoon: (t, v, p) => {                              // the recorded grass step, a little varied each time
    const b = grassClip('grass'); if (!b) return SFX.footRaccoonSynth(t, v, p);
    aSample(b, { t, vol: SOUND.grass.gain * v * (.85 + Math.random() * .3), rate: SOUND.grass.rateRaccoon * (.94 + Math.random() * .12), lp: SOUND.grass.lowpass - rnd(0, 1500), offset: rnd(0, .012), pan: p });
  },
  footFarmer: (t, v, p) => {                               // a boot: the grass recording, lower and heavier, plus a low thump
    const b = grassClip('grass'); if (!b) return SFX.footFarmerSynth(t, v, p);
    aSample(b, { t, vol: SOUND.grass.gain * 1.1 * v * (.9 + Math.random() * .2), rate: SOUND.grass.rateFarmer * (.95 + Math.random() * .1), lp: SOUND.grass.lowpass, pan: p });
    aTone({ t, f: 115 + rnd(0, 20), f2: 50, dur: .12, vol: .3 * v, pan: p });
  },
  footBush: (t, v, p) => {                                 // pushing through leaves: the swishing part of the recording plus synthesized leaves
    const b = grassClip('swish'); if (!b) return SFX.footBushSynth(t, v, p);
    aSample(b, { t, vol: .5 * v, rate: .95 + Math.random() * .12, lp: SOUND.grass.lowpass, pan: p }); aRustle({ t, dur: .22, vol: .25 * v, density: 70, bands: [[1500, 1.1, 1], [2800, 1.4, .6]], pan: p });
  },
  footRaccoonSynth: (t, v, p) => {                         // (fallback) a soft paw on grass and leaves: a muffled pad, a low swish, a little crunch
    const k = .85 + Math.random() * .3;
    aTone({ t, f: 135 * k, f2: 62, dur: .09, vol: .3 * v, a: .006, lp: 420, pan: p });
    aNoise({ t: t + .004, dur: .11, vol: .26 * v, type: 'bandpass', f: 1100 * k, f2: 650, q: .6, a: .014, pan: p });
    aRustle({ t: t + .01, dur: .1, vol: .2 * v, density: 90, bands: [[1400, 1.1, 1], [2600, 1.4, .45]], pan: p });
  },
  footFarmerSynth: (t, v, p) => { aTone({ t, f: 115 + rnd(0, 20), f2: 50, dur: .12, vol: .5 * v, pan: p }); aNoise({ t, dur: .08, vol: .3 * v, type: 'lowpass', f: 900 + rnd(0, 300), pan: p }); },
  footBushSynth: (t, v, p) => { aRustle({ t, dur: .24, vol: .5 * v, density: 80, bands: [[1500, 1.1, 1], [2800, 1.4, .6], [4200, 1.6, .3]], air: .1 * v, pan: p }); aTone({ t, f: 120, f2: 60, dur: .08, vol: .12 * v, lp: 380, pan: p }); },
  rustle: (t, v, p) => { aRustle({ t, dur: .34, vol: .55 * v, density: 75, air: .1 * v, pan: p }); },
  rustleCrash: (t, v, p) => {                              // a tree finishing its shake: a long leafy rustle, then apples thudding onto the grass
    aRustle({ t, dur: .95, vol: .75 * v, density: 120, air: .18 * v, pan: p });
    for (let i = 0; i < 3; i++) { const tt = t + .5 + i * .13 + rnd(0, .05); aTone({ t: tt, f: 150, f2: 55, dur: .13, vol: .45 * v, lp: 500, pan: p }); aNoise({ t: tt, dur: .06, vol: .12 * v, type: 'lowpass', f: 600, pan: p }); }
  },
  bark: (t, v, p, dbl) => {                                // "woof": a growly falling voice, shaped by three resonances, plus breath
    const one = (tt, f0, vv) => {
      const c = AUD.ctx, dur = .2, osc = c.createOscillator(), rough = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), nz = c.createBufferSource(), ng = c.createGain(), mix = c.createGain(), out = c.createGain(), amp = c.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f0 * 1.25, tt); osc.frequency.exponentialRampToValueAtTime(f0, tt + .05); osc.frequency.exponentialRampToValueAtTime(f0 * .6, tt + dur);
      lfo.frequency.value = 55; lg.gain.value = .3; rough.gain.value = .7; lfo.connect(lg); lg.connect(rough.gain); osc.connect(rough);   // 55 Hz wobble = growl
      nz.buffer = AUD.noise; nz.loop = true; ng.gain.value = .5; nz.connect(ng); rough.connect(mix); ng.connect(mix);
      [[700, 5, 1], [1400, 6, .55], [2400, 4, .2]].forEach(([f, q, w]) => { const bp = c.createBiquadFilter(), gg = c.createGain(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f * 1.1, tt); bp.frequency.exponentialRampToValueAtTime(f * .85, tt + dur); bp.Q.value = q; gg.gain.value = w; mix.connect(bp); bp.connect(gg); gg.connect(out); });
      amp.gain.setValueAtTime(.0001, tt); amp.gain.exponentialRampToValueAtTime(1.15 * vv, tt + .01); amp.gain.setValueAtTime(1.15 * vv, tt + .07); amp.gain.exponentialRampToValueAtTime(.0001, tt + dur);
      out.connect(amp); aPan(amp, p).connect(AUD.sfxBus); osc.start(tt); lfo.start(tt); nz.start(tt, Math.random() * .4); osc.stop(tt + dur + .05); lfo.stop(tt + dur + .05); nz.stop(tt + dur + .05);
    };
    one(t, 330 + rnd(-25, 25), v); if (dbl || Math.random() < .5) one(t + .24, 300 + rnd(-25, 25), v * .85);
  },
  yelp: (t, v, p) => { aTone({ t, type: 'triangle', f: 520, f2: 980, dur: .1, vol: .4 * v, pan: p }); aTone({ t: t + .1, type: 'triangle', f: 900, f2: 520, dur: .16, vol: .36 * v, pan: p }); },
  whistle: (t, v, p) => {                                  // the farmer's two-tone whistle, with a bit of vibrato and breath
    const c = AUD.ctx, osc = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1700, t); osc.frequency.exponentialRampToValueAtTime(2700, t + .2); osc.frequency.setValueAtTime(2700, t + .24); osc.frequency.exponentialRampToValueAtTime(2000, t + .55);
    lfo.frequency.value = 28; lg.gain.value = 60; lfo.connect(lg); lg.connect(osc.frequency);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.36 * v, t + .03); g.gain.setValueAtTime(.36 * v, t + .45); g.gain.exponentialRampToValueAtTime(.0001, t + .6);
    osc.connect(g); aPan(g, p).connect(AUD.sfxBus); osc.start(t); lfo.start(t); osc.stop(t + .65); lfo.stop(t + .65);
    aNoise({ t, dur: .5, vol: .09 * v, type: 'highpass', f: 4000, a: .03, pan: p });
  },
  order: (t, v) => { aTone({ t, f: 1000, dur: .08, vol: .2 * v }); aTone({ t: t + .1, f: 1400, dur: .1, vol: .2 * v }); },
  spotted: (t, v) => { aTone({ t, type: 'square', f: 988, dur: .09, vol: .26 * v, lp: 2600 }); aTone({ t: t + .1, type: 'square', f: 698, dur: .18, vol: .26 * v, lp: 2600 }); },     // "uh-oh": a falling tritone
  ping: (t, v) => { aTone({ t, f: 1318, dur: .18, vol: .26 * v }); aTone({ t: t + .09, f: 1760, dur: .22, vol: .2 * v }); },
  caught: (t, v) => { aTone({ t, type: 'sawtooth', f: 520, f2: 110, dur: .75, vol: .32 * v, lp: 1200 }); aTone({ t, f: 140, f2: 45, dur: .35, vol: .6 * v }); aNoise({ t, dur: .25, vol: .3 * v, type: 'lowpass', f: 700 }); },
  pickup: (t, v, p, o) => { const m = Math.pow(2, ((o && o.steps) || 0) / 12);       // each quick pickup in a combo is a note higher
    aTone({ t, type: 'triangle', f: 880 * m, f2: 1480 * m, dur: .1, vol: .34 * v, pan: p }); aTone({ t: t + .05, f: 1760 * m, dur: .12, vol: .14 * v, pan: p }); },
  gold: (t, v, p) => { [1319, 1568, 2093].forEach((f, i) => { aTone({ t: t + i * .07, f, dur: .34, vol: .3 * v, pan: p }); aTone({ t: t + i * .07, f: f * 2.76, dur: .1, vol: .08 * v, pan: p }); }); },
  bank: (t, v, p, o) => { const k = (o && o.k) || 0, notes = [1175, 1568, 2349]; if (k > 0.25) notes.push(3136); if (k > 0.55) notes.push(4699);       // a bigger bank adds notes and a low thump
    notes.forEach((f, i) => { aTone({ t: t + i * .08, f, dur: .5 + k * .4, vol: .3 * v, pan: p }); aTone({ t: t + i * .08, f: f * 2.76, dur: .14, vol: .09 * v, pan: p }); }); aNoise({ t, dur: .14 + k * .2, vol: (.1 + k * .12) * v, type: 'highpass', f: 6000, pan: p }); if (k > 0.2) aTone({ t, f: 120, f2: 60, dur: .3, vol: .5 * k * v, pan: p }); },
  dash: (t, v, p) => { aNoise({ t, dur: .2, vol: .95 * v, type: 'bandpass', f: 500, f2: 3000, q: .8, a: .02, pan: p }); },
  sprint: (t, v, p) => { aNoise({ t, dur: .26, vol: .75 * v, type: 'bandpass', f: 300, f2: 1300, q: .8, a: .04, pan: p }); },
  climb: (t, v, p) => { for (let i = 0; i < 3; i++) aNoise({ t: t + i * .08, dur: .06, vol: .42 * v, type: 'bandpass', f: 1800 + rnd(-200, 300), q: 1.5, pan: p }); },
  bonk: (t, v, p) => { aTone({ t, f: 260, f2: 60, dur: .3, vol: .8 * v, pan: p }); aNoise({ t, dur: .12, vol: .4 * v, type: 'lowpass', f: 500, pan: p }); aTone({ t, f: 880, dur: .22, vol: .18 * v, pan: p }); },
  whiff: (t, v, p) => { aNoise({ t, dur: .3, vol: .55 * v, type: 'bandpass', f: 700, f2: 250, q: .8, a: .03, pan: p }); },
  den: (t, v) => { [523, 659, 784].forEach((f, i) => aTone({ t: t + i * .09, type: 'triangle', f, dur: .36, vol: .2 * v })); },
  ui: (t, v) => { aTone({ t, f: 1100, f2: 1500, dur: .05, vol: .22 * v }); },
  night: (t, v) => { aTone({ t, f: 196, dur: 1.4, vol: .34 * v }); aTone({ t, f: 196 * 2.76, dur: .4, vol: .1 * v }); },
  final: (t, v) => { aTone({ t, type: 'sawtooth', f: 110, dur: 1.8, vol: .3 * v, lp: 500, a: .25 }); aTone({ t, type: 'sawtooth', f: 165, dur: 1.8, vol: .22 * v, lp: 500, a: .25 }); aNoise({ t, dur: 1.4, vol: .2 * v, type: 'highpass', f: 3000, a: .7 }); },
  clear: (t, v) => { [659, 784, 988, 1319].forEach((f, i) => { aTone({ t: t + i * .11, f, dur: .5, vol: .3 * v }); aTone({ t: t + i * .11, f: f * 2.76, dur: .12, vol: .08 * v }); }); },
  victory: (t, v) => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => { aTone({ t: t + i * .14, type: 'triangle', f, dur: .6, vol: .3 * v }); aTone({ t: t + i * .14, f: f * 2.76, dur: .14, vol: .08 * v }); }); aTone({ t: t + .98, f: 392, dur: 1.2, vol: .2 * v, type: 'triangle' }); },
  gameover: (t, v) => { [392, 370, 349, 330].forEach((f, i) => aTone({ t: t + i * .3, type: 'sawtooth', f: i === 3 ? f : f, f2: i === 3 ? f * .8 : 0, dur: i === 3 ? .9 : .3, vol: .26 * v, lp: 900 })); },
};
function sfxPlay(name, sp, opt) { if (!AUD.ctx || AUD.vol.mute || AUD.ctx.state === 'suspended') return; const f = SFX[name]; if (f) f(AUD.ctx.currentTime, Math.max(0.02, sp ? sp.vol : 1), sp ? sp.pan : 0, opt); }
function listenerPos() { const e = viewRole() === 'farmer' ? ((farmers && myFarmer()) || (farmers && farmers[0])) : P; return e || { x: 0, y: 0 }; }
function sfxAt(name, x, y, range = 500, opt, mul = 1) {    // play a sound where it happens: quieter with distance, panned left or right
  if (!AUD.ctx || AUD.vol.mute) return; const L = listenerPos(), d = Math.hypot(x - L.x, y - L.y); if (d > range) return;
  const k = 1 - d / range; sfxPlay(name, { vol: (k * k * 0.85 + 0.15 * k) * mul, pan: clampN((x - L.x) / 450, -0.9, 0.9) }, opt);
}

/* ----- music: a music-box waltz in A minor (chords Am Dm E7 Am F Dm E7 Am), with a creeping bass and a heartbeat when tense ----- */
const CHORDS = [{ b: 45, c: [57, 60, 64] }, { b: 50, c: [62, 65, 69] }, { b: 52, c: [56, 59, 62] }, { b: 45, c: [57, 60, 64] }, { b: 41, c: [53, 57, 60] }, { b: 50, c: [62, 65, 69] }, { b: 52, c: [56, 59, 62] }, { b: 45, c: [57, 60, 64] }];
const MELODY = [                                           // per bar: [beat, midi note, length in beats]
  [[0, 76, .5], [1, 72, .5], [1.5, 76, .5], [2, 81, 1]], [[0, 77, .5], [1, 74, .5], [1.5, 77, .5], [2, 81, 1]],
  [[0, 80, .5], [1, 76, .5], [1.5, 80, .5], [2, 83, 1]], [[0, 81, 1], [1, 76, .5], [1.5, 72, .5], [2, 69, 1]],
  [[0, 77, .5], [1, 72, .5], [1.5, 77, .5], [2, 81, 1]], [[0, 74, .5], [1, 77, .5], [1.5, 81, .5], [2, 86, 1]],
  [[0, 83, .5], [1, 80, .5], [1.5, 76, .5], [2, 74, 1]], [[0, 76, 1], [1, 72, 1], [2, 69, 1]],
];
const mBell = (f, t, dur, v) => { aTone({ t, f, dur, vol: v, a: .003, bus: AUD.musicBus }); aTone({ t, f: f * 2.76, dur: dur * .3, vol: v * .3, a: .002, bus: AUD.musicBus }); };
const mPluck = (f, t, v) => aTone({ t, type: 'triangle', f, dur: .18, vol: v, lp: 2200, a: .004, bus: AUD.musicBus });
const mBass = (f, t, v) => aTone({ t, type: 'triangle', f, dur: .5, vol: v, lp: 700, a: .01, bus: AUD.musicBus });
function mPad(freqs, t, dur, v) {                         // a slow, dark hum underneath
  const c = AUD.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  freqs.forEach(f => [-7, 7].forEach(cents => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + dur + .1); }));
  lp.connect(g); g.connect(AUD.musicBus);
}
function musicBeat(beat, t) {
  const bd = 60 / SOUND.bpm, bar = Math.floor(beat / 3) % 8, pos = beat % 3, loop = Math.floor(beat / 24), ch = CHORDS[bar], T = AUD.tension;
  if (pos === 0) { mBass(mtof(ch.b), t, .24); if (bar % 2 === 0) mPad([mtof(ch.b + 12), mtof(ch.c[1])], t, bd * 6, .1 + T * .08); }
  else ch.c.forEach((m, i) => mPluck(mtof(m), t + i * .012, .11));                      // oom-pah-pah
  if (loop % 4 < 2) { for (const [off, m, len] of MELODY[bar]) if (Math.floor(off) === pos && !(loop % 2 === 1 && Math.random() < .12)) mBell(mtof(m + (loop % 2 === 1 && Math.random() < .15 ? 12 : 0)), t + (off - pos) * bd, len * bd * 1.6, .2); }
  else for (let h = 0; h < 2; h++) if (Math.random() < (h === 0 ? .9 : .55)) mBell(mtof(ch.c[Math.floor(Math.random() * 3)] + 24 - (Math.random() < .3 ? 12 : 0)), t + h * bd / 2, bd * 1.4, .16);   // second half of the loop: scattered arpeggios
  if (pos === 0 && bar === 3 && loop % 2 === 1) aTone({ t, type: 'sawtooth', f: mtof(34), dur: 1.8, vol: .16, lp: 260, a: .15, bus: AUD.musicBus });           // a low, wrong note
  if (pos === 1 && bar === 6 && loop % 3 === 2) aTone({ t, f: 1046, f2: 990, dur: 2.2, vol: .05, a: .6, bus: AUD.musicBus });                                   // a thin, eerie whistle
  if (pos === 2 && bar === 5 && Math.random() < .25) mBell(mtof(75), t, bd * 1.2, .1);                                                                          // one bell slightly out of key
  if (T > .3) { aTone({ t, f: 62, f2: 38, dur: .18, vol: T * .34, bus: AUD.musicBus }); aTone({ t: t + bd * .28, f: 58, f2: 38, dur: .16, vol: T * .22, bus: AUD.musicBus }); }   // lub-dub heartbeat
}
function musicPump() { while (AUD.nextT < AUD.ctx.currentTime + 0.4) { musicBeat(AUD.beat++, AUD.nextT); AUD.nextT += 60 / SOUND.bpm * (1 - 0.08 * AUD.tension); } }
function musicStart() { AUD.nextT = AUD.ctx.currentTime + 0.2; clearInterval(AUD.timer); AUD.timer = setInterval(() => { if (state !== 'play') { AUD.tension = Math.max(0, AUD.tension - 0.05); audioQuiet(); }     // not playing (menu, end screen): no alert tone, and the heartbeat fades
    if (AUD.ctx && AUD.ctx.state === 'running') musicPump(); else if (AUD.ctx) AUD.nextT = Math.max(AUD.nextT, AUD.ctx.currentTime); }, 100); }

/* ----- when sounds happen ----- */
const SND = { prev: new WeakMap(), acc: new WeakMap(), last: new WeakMap(), alertPrev: 0, flashPrev: 0 };
function stepSound(e, kind, own) {                         // a footstep every few pixels walked
  const p = SND.prev.get(e); SND.prev.set(e, { x: e.x, y: e.y }); if (!p) return;
  const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > 90) { SND.acc.set(e, 0); return; } if (d < 0.01) return;
  const acc = (SND.acc.get(e) || 0) + d, stride = kind === 'raccoon' ? SOUND.stride.raccoon : SOUND.stride.farmer; if (acc < stride) { SND.acc.set(e, acc); return; } SND.acc.set(e, acc - stride);
  const now = AUD.ctx.currentTime; if (now - (SND.last.get(e) || -9) < SOUND.minStepGap) return; SND.last.set(e, now);
  const bush = kind === 'raccoon' && hidden();
  sfxAt(bush ? 'footBush' : kind === 'raccoon' ? 'footRaccoon' : 'footFarmer', e.x, e.y, kind === 'raccoon' ? 240 : 360, undefined, own ? 0.55 : 1);
}
function audioQuiet() {                                   // switch off the looping "being seen" tone (menus and end screens stop the game loop, so nothing else would)
  if (!AUD.ctx || !AUD.alert) return; const t = AUD.ctx.currentTime;
  AUD.alert.gain.gain.cancelScheduledValues(t); AUD.alert.gain.gain.setTargetAtTime(0, t, 0.03); SND.alertPrev = 0;
}
function audioTick(dt) {                                   // called every frame while playing (host and guest)
  if (!AUD.ctx || !P) return;
  const farmerView = viewRole() === 'farmer', chasing = dogs.some(d => d.chase && !(d.stun > 0));
  AUD.tension += (Math.max(alertV, chasing ? 0.7 : 0) - AUD.tension) * Math.min(1, dt * 1.5);
  if (AUD.vol.mute || AUD.ctx.state !== 'running') return;
  if (!(P.tree || slam)) stepSound(P, 'raccoon', !farmerView);
  farmers.forEach(f => stepSound(f, 'farmer', f === myFarmer() && farmerView));
  for (const d of dogs) {                                  // barks: when a chase starts, now and then while it lasts, when sent to search, a yelp when stunned
    const chase = d.chase && !(d.stun > 0), ordered = !!(d.search || (d.cell !== undefined && d.cell >= 0)), stun = d.stun > 0; d._bt = (d._bt || 0) - dt;
    if (chase && !d._c) { sfxAt('bark', d.x, d.y, 700, true); d._bt = 0.9 + rnd(0, .6); }
    else if (chase && d._bt <= 0) { sfxAt('bark', d.x, d.y, 700); d._bt = 0.8 + rnd(0, .7); }
    if (ordered && !d._o) sfxAt('bark', d.x, d.y, 700);
    if (stun && !d._s) sfxAt('yelp', d.x, d.y, 700);
    d._c = chase; d._o = ordered; d._s = stun;
  }
  for (const o of obs) if (o.k === 'tree' && o.rustle > 0) { o._rt = (o._rt || 0) - dt; if (o._rt <= 0) { sfxAt('rustle', o.x, o.y, 520, undefined, 0.4 + 0.6 * (o.shakeP || 0)); o._rt = 0.2 + rnd(0, 0.08); } }   // leaves while a tree is shaken
  if (alertV > 0.06 && SND.alertPrev <= 0.06) sfxPlay(farmerView ? 'ping' : 'spotted'); SND.alertPrev = alertV;
  if (flash > 0.3 && SND.flashPrev <= 0.3) sfxPlay('caught'); SND.flashPrev = flash;
  const a = AUD.alert, v = farmerView ? 0 : alertV, tt = AUD.ctx.currentTime;                              // the raccoon hears a tone that rises as the light stays on it
  a.gain.gain.setTargetAtTime(v > 0.05 ? Math.min(0.14, v * 0.16) : 0, tt, 0.05); a.osc.frequency.setTargetAtTime(280 + v * 520, tt, 0.05);
}
function popSound(s, x, y) {                               // the floating text ("+1", "whistle!", ...) also tells us which sound to play, on both screens
  if (!AUD.ctx || AUD.vol.mute) return;
  if (s === 'whistle!') { const f = farmers && myFarmer(); sfxAt('whistle', f ? f.x : x, f ? f.y : y, 900); }
  else if (s.startsWith('search ') || s === 'last seen!') sfxPlay('order');
  else if (s === 'rustle!') sfxAt('rustleCrash', x, y + 60, 650);
  else if (s === 'rustle') sfxAt('rustle', x, y + 60, 520);
  else if (s.startsWith('+1')) { const m = s.match(/x(\d+)/); sfxAt('pickup', x, y, 520, { steps: Math.min(12, m ? +m[1] - 1 : 0) }); }
  else if (s === 'gold!' || s === 'jackpot!' || s.startsWith('Found: ')) sfxAt('gold', x, y, 520);
  else if (s === 'golden!') sfxAt('gold', x, y + 80, 600);
  else if (s.startsWith('Banked')) sfxAt('bank', x, y + 50, 650, { k: Math.min(1, (parseInt(s.replace(/\D/g, ''), 10) || 1) / 21) });
  else if (s === 'BONK!') sfxAt('bonk', x, y + 40, 800);
  else if (s === 'miss') sfxAt('whiff', x, y + 40, 500);
  else if (s === 'new den!') sfxPlay('den');
  else if (s === 'FINAL NIGHT') sfxPlay('final');
}
function screenSound(sp) { if (!sp) return; if (sp.k === 'upgrade' && sp.res) for (let i = 0; i < Math.min(6, sp.res.lines.length); i++) setTimeout(() => sfxPlay('ui'), 200 + i * 150);       // the results tick in one by one
  if (sp.k === 'upgrade' || sp.k === 'wait') sfxPlay('clear'); else if (sp.k === 'end') sfxPlay(sp.win ? 'victory' : 'gameover'); }

/* ----- the Sound menu and the little speaker on the screen ----- */
function soundScreen() {
  const v = AUD.vol, row = (id, label) => `<div class="row"><label style="min-width:90px;text-align:right">${label}</label><input type="range" min="0" max="100" value="${Math.round(v[id] * 100)}" oninput="setVol('${id}', this.value)"></div>`;
  show(`<h1>Sound</h1><p>All music and sounds are made in your browser. ${esc(kn('mute'))} mutes everything. You hear things by where they happen: the farmer hears the raccoon's steps in the dark.</p>${row('master', 'Master')}${row('music', 'Music')}${row('sfx', 'Effects')}
  <div class="row"><button class="up" onclick="toggleMute();soundScreen()">${v.mute ? 'Unmute' : 'Mute'}</button><button onclick="goBack()">Back</button></div>`, 'sound');
}
const SPK = { x: 8, y: 46, w: 26, h: 22 };
const speakerHit = p => state === 'play' && p && p.x >= SPK.x - 4 && p.x <= SPK.x + SPK.w + 4 && p.y >= SPK.y - 4 && p.y <= SPK.y + SPK.h + 4;
function drawSpeaker() {
  g.save(); g.globalAlpha = 0.75; g.fillStyle = 'rgba(8,14,20,.6)'; g.fillRect(SPK.x, SPK.y, SPK.w, SPK.h); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(SPK.x + 4, SPK.y + 8); g.lineTo(SPK.x + 8, SPK.y + 8); g.lineTo(SPK.x + 13, SPK.y + 4); g.lineTo(SPK.x + 13, SPK.y + 18); g.lineTo(SPK.x + 8, SPK.y + 14); g.lineTo(SPK.x + 4, SPK.y + 14); g.closePath(); g.fill();
  g.beginPath(); if (AUD.vol.mute) { g.moveTo(SPK.x + 16, SPK.y + 7); g.lineTo(SPK.x + 23, SPK.y + 15); g.moveTo(SPK.x + 23, SPK.y + 7); g.lineTo(SPK.x + 16, SPK.y + 15); } else { g.arc(SPK.x + 14, SPK.y + 11, 5, -0.9, 0.9); g.moveTo(SPK.x + 14 + 8 * Math.cos(.9), SPK.y + 11 + 8 * Math.sin(.9)); g.arc(SPK.x + 14, SPK.y + 11, 8, 0.9, -0.9, true); }
  g.stroke(); g.restore();
}

