/* ===== MUSIC TRACKS: real recorded tunes for places that have one (the rest keep the synthesized waltz in audio.js) =====
   MUSIC_SRC (musicdata.js, made by tools/make_music.py from art/music/source/) holds each track: a 'song' plays to its own ending, rests a few
   seconds and starts again; a 'loop' repeats a stretch of whole bars. musicArea() says which track fits where you are. Changing place: the old tune eases out (FOUT seconds), and the new one
   starts from its own beginning as the old one dies away (no two tunes in different keys on top of each other).
   While a track plays the waltz is turned right down; where there is no track (raids, the Wilds, caves) the waltz comes back.
   Night at home: until a night track exists, the day tune plays softer and duller after dark.
   To add a track: put the file in art/music/source/<name>.mp3, add it to TRACKS in tools/make_music.py, run it, and name it in MUSIC_AT. */
const MUSIC_AT = { title: 'title', home_day: 'home_day', home_night: 'home_night' };      // place -> track (a missing track falls back: home_night -> home_day)
const FOUT = 1.8, FIN = 0.6, OVERLAP = 0.35, MVOL = 1.0;
const easeOut = (v, n = 64) => Float32Array.from({ length: n }, (_, i) => v * Math.cos(i / (n - 1) * Math.PI / 2) ** 2);       // a gentle tail, no sudden drop
const MUS = { buf: {}, loading: {}, cur: null, node: null, gain: null, bus: null, filt: null, area: null, duck: 0, again: 0, freeAt: 0 };
function musicArea() {
  if (['title', 'lobby', 'connecting'].includes(state)) return 'title';
  if (state === 'screen') return MUS.area;                                               // a screen keeps whatever was playing
  if (state === 'home' || state === 'homemenu') return typeof nightness === 'function' && nightness() > 0.5 ? 'home_night' : 'home_day';
  return null;                                                                            // raids, the Wilds, caves: the waltz
}
function trackFor(area) { let k = MUSIC_AT[area]; if (!k) return null; if (!MUSIC_SRC[k] && area === 'home_night') k = MUSIC_AT.home_day; return MUSIC_SRC[k] ? k : null; }
function musicBus() {                                                                    // tracks skip the waltz's dull filter; their own filter dims the day tune at night
  if (MUS.bus || !AUD.ctx) return MUS.bus; const c = AUD.ctx; MUS.bus = c.createGain(); MUS.filt = c.createBiquadFilter(); MUS.filt.type = 'lowpass'; MUS.filt.frequency.value = 18000;
  MUS.bus.connect(MUS.filt); MUS.filt.connect(AUD.master); musicLevels(true); return MUS.bus;
}
function musicLevels(now) {
  if (!MUS.bus) return; const t = AUD.ctx.currentTime, k = now ? 0.01 : 0.5, nightDay = MUS.area === 'home_night' && MUS.cur === MUSIC_AT.home_day;
  MUS.bus.gain.setTargetAtTime(AUD.vol.music * MVOL * (nightDay ? 0.6 : 1), t, k); MUS.filt.frequency.setTargetAtTime(nightDay ? 1600 : 18000, t, k);
}
function musicLoad(k) {
  if (MUS.buf[k] || MUS.loading[k] || !AUD.ctx) return; MUS.loading[k] = 1;
  try { const b64 = MUSIC_SRC[k].src.split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    AUD.ctx.decodeAudioData(u.buffer, b => { MUS.buf[k] = b; MUS.loading[k] = 0; }, () => { MUS.loading[k] = 0; MUS.bad = 1; });
  } catch (e) { MUS.loading[k] = 0; }
}
function musicPlay(k) {                                                                  // change to track k (null = no tune: the waltz comes back)
  const c = AUD.ctx, t = c.currentTime; clearTimeout(MUS.again); let at = t;
  if (MUS.node) { const n = MUS.node, g = MUS.gain, v = g.gain.value; n.onended = null; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(v, t);
    if (v > 0.001) g.gain.setValueCurveAtTime(easeOut(v), t + 0.005, FOUT); try { n.stop(t + FOUT + 0.1); } catch (e) {} MUS.node = null; MUS.gain = null; at = t + FOUT - OVERLAP; }
  MUS.freeAt = t + (MUS.cur ? FOUT : 0); MUS.cur = k; if (!k) return; musicStartTrack(k, MUS.freeAt > t ? FIN : 0.8, at);
}
function musicStartTrack(k, fade, at) {
  /* 'song' tracks play to their own ending, rest MUSIC_SRC[k].gap seconds, then start again (no loop point to hear);
     'loop' tracks play from the start once, then repeat loopStart..loopEnd (the join is blended in the file) */
  const c = AUD.ctx, t = Math.max(c.currentTime + 0.02, at || 0), M = MUSIC_SRC[k], src = c.createBufferSource(), g = c.createGain(); src.buffer = MUS.buf[k];
  if (M.mode === 'loop') { src.loop = true; src.loopStart = M.loopStart; src.loopEnd = Math.min(M.loopEnd, src.buffer.duration); }
  else src.onended = () => { if (MUS.node !== src || MUS.cur !== k) return; MUS.again = setTimeout(() => { if (MUS.cur === k && MUS.node === src) musicStartTrack(k, 0); }, (M.gap || 3) * 1000); };
  g.gain.setValueAtTime(0, c.currentTime); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + Math.max(0.02, fade)); src.connect(g); g.connect(musicBus()); src.start(t); MUS.node = src; MUS.gain = g; MUS.startAt = t;
}
function musicTick() {
  if (!AUD.ctx || typeof MUSIC_SRC === 'undefined') return; const area = musicArea(), k = trackFor(area);
  for (const n in MUSIC_SRC) musicLoad(n);                                                  // decode every tune up front, so none is late
  const areaChanged = area !== MUS.area; MUS.area = area;
  if (k && !MUS.buf[k]) { if (MUS.cur && MUS.cur !== k) musicPlay(null); }                 // its tune is still decoding: silence (never the waltz) until it is ready
  else if ((k || null) !== MUS.cur) musicPlay(k || null);
  else if (areaChanged) musicLevels();
  const d = k ? 1 : 0; if (d !== MUS.duck) { MUS.duck = d; applyVolumes(); }               // the waltz stays down wherever a tune belongs, even before it starts
}
const _applyVolumesMus = applyVolumes;
applyVolumes = function (now) {
  _applyVolumesMus(now); if (!AUD.ctx) return; const g = AUD.musicBus.gain, t = AUD.ctx.currentTime;
  if (MUS.duck) g.setTargetAtTime(0, t, now ? 0.001 : 0.5);
  else if (MUS.freeAt > t - 0.05) { g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.setTargetAtTime(AUD.vol.music * 0.7, Math.max(t, MUS.freeAt - 0.4), 1.0); }   // the waltz comes back slowly, as the tune fades
  musicLevels(now);
};
/* the moment sound starts: no waltz first if this place has a tune (it used to play until the first music tick) */
const _audioBuildMus = audioBuild;
audioBuild = function (ctx) { _audioBuildMus(ctx); try { for (const n in MUSIC_SRC) musicLoad(n); if (trackFor(musicArea())) { MUS.duck = 1; AUD.musicBus.gain.cancelScheduledValues(0); AUD.musicBus.gain.setValueAtTime(0, ctx.currentTime); } } catch (e) {} };
setInterval(() => { try { musicTick(); } catch (e) { console.error(e); } }, 250);
