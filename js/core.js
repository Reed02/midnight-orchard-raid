/* ---------- 3. GAME CODE ---------- */
const $ = id => document.getElementById(id);
const cv = $('c'), g = cv.getContext('2d'), IMG = {};
cv.width = CONFIG.view.width; cv.height = CONFIG.view.height;
let VW = cv.width, VH = cv.height; const W = CONFIG.world.width, H = CONFIG.world.height;   // view (screen) and world sizes
const cam = { x: 0, y: 0 };
const den = { x: CONFIG.den.x, y: CONFIG.den.y, radius: CONFIG.den.radius };          // where you spawn and deposit; it moves (see CONFIG.den)                                                              // camera top-left, in world coordinates
const keys = {}; let drag = null, rebinding = null;       // rebinding = { action, slot } while waiting for a key press
const BIND = JSON.parse(JSON.stringify(DEFAULT_KEYS));
try { const saved = JSON.parse(localStorage.getItem('raidKeys')); if (saved) for (const a in BIND) if (saved[a] && saved[a].length === 2) BIND[a] = saved[a]; } catch (e) {}
const saveBind = () => { try { localStorage.setItem('raidKeys', JSON.stringify(BIND)); } catch (e) {} };
const held = a => BIND[a].some(k => k && keys[k]) || !!keys['__' + a];     // is any key for this action down (or its touch button)?
const keyName = k => k ? ({ ' ': 'Space', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', shift: 'Shift', control: 'Ctrl', alt: 'Alt', enter: 'Enter', tab: 'Tab' }[k] || k.toUpperCase()) : '—';
let multi = false, isHost = true, myRole = 'raccoon';     // multiplayer: who owns the simulation, and which role this machine plays
const remote = { mx: 0, my: 0, shake: false, aim: 0, t: 0, sq: 0, ack: -2 }, mouse = { on: false, x: 0, y: 0 };   // the other player's inputs (host side); mouse position
const kn = a => keyName(BIND[a].find(k => k) || '');
let state = 'title', night = 0, score = 0, hearts = 0, S, P, obs, apples, farmers, dogs, carry;
let endless = false, groundLeft = 0, climbT = 0, climbCd = 0, slam = null, shaking = false, shakeTree = null, shakeAmt = 0;
let startleT = 0, time, banked, quota, alertV, inv, dashT, dashCd, dir, spawnT, t = 0, flash = 0, pops = [], last = 0, anim = 0, msgText = '';
const tufts = [...Array(160)].map(() => ({ x: Math.random() * W, y: Math.random() * H }));
const solid = o => o.k !== 'bush';
const rnd = (a, b) => a + Math.random() * (b - a);

/* ----- input ----- */
addEventListener('keydown', e => {
  if (rebinding) return captureKey(e);
  const k = e.key.toLowerCase(); keys[k] = true;
  if (!e.repeat) { if (BIND.dash.includes(k)) localEvent('dash'); if (BIND.climb.includes(k)) localEvent('climb'); if (BIND.whistle.includes(k)) localEvent('whistle'); if (BIND.call.includes(k)) localEvent('call'); if (BIND.map.includes(k) && viewRole() === 'farmer') mapOpen = !mapOpen; if (BIND.item.includes(k)) pressItem(); if (BIND.quest.includes(k)) toggleQuest(); if (BIND.mute.includes(k)) toggleMute(); if (BIND.pause.includes(k)) togglePause(); }
  if (state === 'play' && (e.key.startsWith('Arrow') || e.key === ' ')) e.preventDefault();
});
addEventListener('blur', () => { for (const k in keys) keys[k] = false; drag = null; wheel = null; });
addEventListener('visibilitychange', () => { if (document.hidden) { for (const k in keys) keys[k] = false; drag = null; wheel = null; pauseGame(); } });
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height }; };
cv.addEventListener('pointerdown', e => {
  const p = pt(e);
  if (speakerHit(p)) return toggleMute(); if (pauseHit(p)) return pauseGame();
  if (questHit(p)) return toggleQuest(); if (tipHit(p)) { tipShow = null; return; }
  if (multi && myRole === 'farmer' && state === 'play') { const c = gridCellAt(p); if (c >= 0) return localEvent('grid', c); }
  if (TOUCH.mode === 'wheel') return;                        // wheel mode: touching anywhere else does nothing
  if (multi && myRole === 'farmer' && e.pointerType === 'mouse') return; drag = p; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
});
cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { const p = pt(e); mouse.on = true; mouse.x = p.x; mouse.y = p.y; } if (drag) drag = pt(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => cv.addEventListener(ev, e => { drag = null; if (wheel && (e.pointerId === undefined || e.pointerId === wheel.id)) wheel = null; }));
// Safety nets so the wheel can never stay stuck pointing one way: release it whichever element the lift lands on, and when no finger is left at all.
['pointerup', 'pointercancel'].forEach(ev => addEventListener(ev, e => { if (wheel && e.pointerId === wheel.id) wheel = null; }, true));
['touchend', 'touchcancel'].forEach(ev => addEventListener(ev, e => { if (!e.touches || !e.touches.length) { wheel = null; drag = null; } }, { capture: true, passive: true }));
$('dash').addEventListener('pointerdown', e => { e.stopPropagation(); localEvent('dash'); });
$('call').addEventListener('pointerdown', e => { e.stopPropagation(); localEvent('call'); });
$('climb').addEventListener('pointerdown', e => { e.stopPropagation(); localEvent('climb'); });
$('whistle').addEventListener('pointerdown', e => { e.stopPropagation(); localEvent('whistle'); });
$('item').addEventListener('pointerdown', e => { e.stopPropagation(); pressItem(); });
$('shake').addEventListener('pointerdown', e => { e.stopPropagation(); keys.__shake = true; });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('shake').addEventListener(ev, () => keys.__shake = false));
const buttons = on => {                                     // on-screen action buttons: touch devices only (with a keyboard the keys do it)
  const r = viewRole() === 'raccoon', show = on && isTouch;
  for (const k in TUI) delete TUI[k]; $('dash').className = ''; $('dash').textContent = r ? 'Dash' : 'Sprint'; $('dash').style.display = show ? 'block' : 'none';
  for (const id of ['shake', 'climb']) $(id).style.display = show && r ? 'block' : 'none';
  for (const id of ['whistle', 'call']) $(id).style.display = show && !r ? 'block' : 'none';
  $('item').style.display = show && keep ? 'block' : 'none';
  if (show) layoutTouch();
};

