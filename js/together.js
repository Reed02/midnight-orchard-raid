/* ===== TOGETHER: chat and emotes while friends are in the same homestead =====
   Whenever you are visiting, or friends are visiting you, the bar at the top has Chat (key Y) and Emotes (keys 1-6). A line you say shows in a speech
   bubble over your raccoon for a few seconds and in the little chat log at the bottom left; an emote pops up over your head (Dance also makes you
   dance). Messages go to whoever is there: a visitor's go to the owner's game, which passes them on to the other visitors (like positions do).
   Nothing is kept: chat is not saved anywhere. QUICK = the one-tap phrases. */
const EMOTES = [{ id: 'wave', icon: '\u{1F44B}', name: 'Wave' }, { id: 'heart', icon: '❤️', name: 'Heart' }, { id: 'laugh', icon: '\u{1F602}', name: 'Laugh' },
  { id: 'dance', icon: '\u{1F3B5}', name: 'Dance' }, { id: 'yes', icon: '\u{1F44D}', name: 'Thumbs up' }, { id: 'wow', icon: '\u{1F62E}', name: 'Wow' }];
const QUICK = ['Hi!', 'Come and look!', 'Follow me', 'Nice place!', 'Thank you!', 'Bye!'];
const TOG = { log: [], last: 0, open: '' };                        // log: [{ name, text, t }] (recent lines), open: '' | 'chat' | 'emo'
const emoDef = id => EMOTES.find(e => e.id === id);
const togetherNow = () => state === 'home' && ((VISIT && VISIT.live) || Object.keys(HOSTING).length > 0);
const cleanSay = s => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
function togSend(m) {                                              // to the owner (when visiting) or to every visitor (when hosting)
  if (VISIT && VISIT.live) socSend(socLinks[VISIT.code], m);
  for (const c in HOSTING) socSend(socLinks[c], m);
}
function togLog(name, text) { TOG.log.push({ name, text, t: performance.now() }); if (TOG.log.length > 6) TOG.log.shift(); }
function sayLine(text) {
  text = cleanSay(text); if (!text || !togetherNow()) return; const now = performance.now(); if (now - TOG.last < 400) return; TOG.last = now;
  P.say = text; P.sayT = now + 4500 + text.length * 40; togLog(myName(), text); togSend({ t: 'say', text });
}
function doEmote(id) {
  if (!emoDef(id) || !togetherNow()) return; const now = performance.now(); if (now - TOG.last < 300) return; TOG.last = now;
  P.emo = id; P.emoT = now + (id === 'dance' ? 4000 : 2600); togSend({ t: 'emo', e: id });
}
function togHear(o, m, name) {                                    // a say / emo for character o (an entry of OTHERS)
  if (!o) return; const now = performance.now();
  if (m.t === 'say') { const text = cleanSay(m.text); if (!text) return; o.say = text; o.sayT = now + 4500 + text.length * 40; togLog(name || o.name, text); try { sfxPlay('ui'); } catch (e) {} }
  if (m.t === 'emo' && emoDef(m.e)) { o.emo = m.e; o.emoT = now + (m.e === 'dance' ? 4000 : 2600); }
}
/* social.js passes 'say' / 'emo' messages here (after its friend checks): returns true when handled */
function togMessage(link, m, code, f) {
  if (m.t !== 'say' && m.t !== 'emo') return false;
  if (HOSTING[code] && OTHERS[code]) { togHear(OTHERS[code], m, f.name); const out = Object.assign({}, m, { code }); for (const c in HOSTING) if (c !== code) socSend(socLinks[c], out); return true; }      // pass it on to the other visitors
  if (VISIT && VISIT.code === code) { const who = m.code ? S_(m.code, 6) : code; if (who !== SOC.code) togHear(OTHERS[who], m); return true; }
  return true;
}
/* ----- dancing: you bob in place and turn side to side (others see it through your position updates) ----- */
function togTick(dt) {
  const now = performance.now(); if (P && P.emo === 'dance' && now < P.emoT && !P.moving) { P.moving = true; TOG.da = (TOG.da || 0) + dt * 14; anim = TOG.da; P.face = Math.floor(now / 300) % 2 ? 1 : -1; P.dancing = 1; }
  else if (P && P.dancing && (now >= (P.emoT || 0) || P.emo !== 'dance')) { P.dancing = 0; }
}
if (typeof updateHome === 'function') { const _uh = updateHome; updateHome = function (dt) { _uh(dt); try { if (state === 'home' && !BUILD.on) togTick(dt); } catch (e) {} }; }
/* ----- drawing: speech bubbles and emotes over every raccoon in the room, and the chat log ----- */
function bubble(x, y, text) {
  g.save(); g.font = 'bold 13px "Trebuchet MS",Verdana,sans-serif'; const words = text.split(' '), lines = []; let ln = '';
  for (const w of words) { const tryL = ln ? ln + ' ' + w : w; if (g.measureText(tryL).width > 170 && ln) { lines.push(ln); ln = w; } else ln = tryL; } if (ln) lines.push(ln); lines.splice(3);
  const w = Math.max(...lines.map(l => g.measureText(l).width)) + 18, h = lines.length * 16 + 10, bx = Math.round(x - w / 2), by = Math.round(y - h - 10);
  g.fillStyle = 'rgba(255,250,238,.96)'; g.strokeStyle = '#2a2420'; g.lineWidth = 2; g.beginPath(); g.roundRect ? g.roundRect(bx, by, w, h, 8) : g.rect(bx, by, w, h); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 6, by + h - 1); g.lineTo(x, by + h + 9); g.lineTo(x + 6, by + h - 1); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - 6, by + h + 1); g.lineTo(x, by + h + 9); g.lineTo(x + 6, by + h + 1); g.stroke();
  g.fillStyle = '#2a2420'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, x, by + 13 + i * 16)); g.restore(); return by;
}
function emoteAt(x, y, id, left) {
  const e = emoDef(id); if (!e) return; const age = 1 - left, s = Math.min(1, age * 6) * (1 + Math.sin(age * 20) * 0.04 * (1 - age)), up = Math.min(1, age * 4) * 6;
  g.save(); g.translate(x, y - up); g.scale(s, s); g.fillStyle = 'rgba(255,250,238,.95)'; g.strokeStyle = '#2a2420'; g.lineWidth = 2; g.beginPath(); g.arc(0, -16, 16, 0, 7); g.fill(); g.stroke();
  g.font = '19px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.icon, 0, -15); g.restore();
}
function drawTogether() {
  if (state !== 'home' && state !== 'homemenu') return; const now = performance.now(), h = FH * 0.8;
  const who = [P].concat(typeof socialOthers === 'function' ? socialOthers() : []);
  for (const o of who) { if (!o) continue; let top = o.y - h - (o === P ? 6 : 26);
    if (o.say && now < o.sayT) top = bubble(o.x, top, o.say) - 2;
    if (o.emo && now < o.emoT) emoteAt(o.x + (o.say && now < o.sayT ? 0 : 0), top, o.emo, (o.emoT - now) / (o.emo === 'dance' ? 4000 : 2600));
  }
}
function drawChatLog() {
  if (state !== 'home' || !TOG.log.length) return; const now = performance.now(), L = TOG.log.filter(l => now - l.t < 15000); if (!L.length) return;
  g.save(); g.font = '12px "Trebuchet MS",Verdana,sans-serif'; g.textBaseline = 'middle'; let y = VH - 70 - L.length * 18;
  for (const l of L) { const a = Math.min(1, (15000 - (now - l.t)) / 2000), txt = l.name + ': ' + l.text, w = Math.min(330, g.measureText(txt).width + 14);
    g.globalAlpha = a; g.fillStyle = 'rgba(10,24,40,.72)'; g.fillRect(10, y, w, 16); g.fillStyle = '#ffe9a8'; g.fillText(l.name + ':', 17, y + 8.5); const nw = g.measureText(l.name + ': ').width; g.fillStyle = '#fff7e6'; g.fillText(l.text.slice(0, 60), 17 + nw, y + 8.5); y += 18; }
  g.restore();
}
if (typeof drawPops === 'function') { const _dp = drawPops; drawPops = function (top) { _dp(top); try { drawTogether(); } catch (e) {} }; }
if (typeof drawVisitHud === 'function') { const _dv = drawVisitHud; drawVisitHud = function () { _dv(); try { drawChatLog(); } catch (e) {} }; }
/* ----- the bar: chat box and emote picker (opened from the visit bar, or with Y / 1-6) ----- */
function togPanel(kind) {
  TOG.open = TOG.open === kind ? '' : kind; let p = $('togpanel'); if (!p) { p = document.createElement('div'); p.id = 'togpanel'; $('wrap').appendChild(p); }
  if (!TOG.open) { p.style.display = 'none'; p.innerHTML = ''; cv.focus && cv.focus(); return; }
  p.innerHTML = TOG.open === 'chat'
    ? `<div class="trow"><input id="togsay" maxlength="80" placeholder="Say something..." autocomplete="off"><button onclick="togSay()">Say</button></div><div class="trow quick">${QUICK.map((q, i) => `<button onclick="sayLine(QUICK[${i}]);togPanel('chat')">${esc(q)}</button>`).join('')}</div>`
    : `<div class="trow">${EMOTES.map((e, i) => `<button class="emo" title="${e.name}${isTouch ? '' : ' (' + (i + 1) + ')'}" onclick="doEmote('${e.id}');togPanel('emo')">${e.icon}<small>${e.name}</small></button>`).join('')}</div>`;
  p.style.display = 'flex'; for (const k in keys) keys[k] = false; if (TOG.open === 'chat') setTimeout(() => { const i = $('togsay'); if (i) i.focus(); }, 0);
}
function togSay() { const i = $('togsay'); if (i && i.value.trim()) sayLine(i.value); togPanel('chat'); }
addEventListener('keydown', e => {                                 // while typing a line, the game does not see the keys (no walking off mid-sentence)
  const tgt = e.target; if (!(tgt && tgt.id === 'togsay')) return; e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); togSay(); } else if (e.key === 'Escape') { e.preventDefault(); togPanel('chat'); }
}, true);
function togKey(k) {                                               // homeKey asks this first: Y = chat, 1-6 = emotes (only while friends are here, not in build mode)
  if (!togetherNow() || BUILD.on) return false; const used = a => Object.values(BIND).some(x => x.includes(a));
  if (k === 'y' && !used('y')) { togPanel('chat'); return true; }
  const n = +k; if (n >= 1 && n <= EMOTES.length && !used(k)) { doEmote(EMOTES[n - 1].id); return true; }
  return false;
}
setInterval(() => { try { const p = $('togpanel'); if (p && p.style.display !== 'none' && !togetherNow()) { TOG.open = 'x'; togPanel('x'); } } catch (e) {} }, 400);
