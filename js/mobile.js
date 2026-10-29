/* ===== PHONES AND TABLETS: a big playfield with the controls in the side margins =====
   In landscape the game is sized to the full height of the screen. The wheel (left) and the action buttons (right) sit in the margins beside the playfield,
   so they never cover the game. The view is also made a little closer (and as wide as the screen allows) so everything is easier to see. Desktop keeps 800x560. */
function safeInset(side) { const p = document.createElement('div'); p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;padding-' + side + ':env(safe-area-inset-' + side + ',0px)'; document.body.appendChild(p); const v = parseFloat(getComputedStyle(p)['padding' + side[0].toUpperCase() + side.slice(1)]) || 0; p.remove(); return v; }
function setView(w, h) {                                    // the logical size of the picture (what you can see of the orchard)
  if (w === VW && h === VH) return; VW = w; VH = h; cv.width = w; cv.height = h; try { maskC.width = w; maskC.height = h; } catch (e) {}      // (maskC may not exist yet while the page is still loading: it is created at the current size)
  try { layoutHud(); if (state === 'play' && P) followCam(1); } catch (e) {}
}
function layoutView() {
  const wrap = $('wrap'), W0 = wrap.clientWidth, H0 = wrap.clientHeight, tbl = $('tbl'), tbr = $('tbr');
  if (!isTouch || !W0 || !H0 || H0 > W0) { setView(CONFIG.view.width, CONFIG.view.height); cv.style.width = cv.style.height = ''; tbl.style.width = tbr.style.width = ''; return; }
  const sl = safeInset('left'), sr = safeInset('right'), gut = clampN(Math.round(H0 * 0.3), 84, 150), gl = gut + sl, gr = gut + sr, aw = W0 - gl - gr, ah = H0, ratio = aw / ah;
  let cw = aw, ch = ah, left = gl, right = gr;
  if (ratio < 1.1) ch = aw / 1.1; else if (ratio > 2.2) { cw = ah * 2.2; left = right = (W0 - cw) / 2; }       // the picture keeps a sensible shape: very tall or very wide screens get margins
  const vh = clampN(Math.round(ch / 0.85), 400, 560), vw = clampN(Math.round(vh * cw / ch), 560, 960);
  setView(vw, vh); cv.style.width = Math.round(cw) + 'px'; cv.style.height = Math.round(ch) + 'px'; tbl.style.width = Math.round(left) + 'px'; tbr.style.width = Math.round(right) + 'px';
  const s = Math.round(clampN(Math.min(left - sl, right - sr) - 16, 46, Math.min(74, H0 * 0.19)));
  document.documentElement.style.setProperty('--s', s + 'px'); tbl.style.setProperty('--s', s + 'px'); tbr.style.setProperty('--s', s + 'px');
  const ws = Math.round(clampN(left - sl - 14, 70, Math.min(130, H0 * 0.36))); tbl.style.setProperty('--ws', ws + 'px'); WHEEL.px = ws;
  if (typeof refreshScreen === 'function' && state !== 'play') fitOverlay();
}
addEventListener('resize', layoutView); addEventListener('orientationchange', () => setTimeout(layoutView, 250));
if (typeof visualViewport !== 'undefined' && visualViewport) visualViewport.addEventListener('resize', layoutView);
/* ----- the movement wheel (an HTML circle in the left margin) ----- */
const wz = $('wheelz'), wk = $('wknob');
function wzMove(e) {
  const r = wz.getBoundingClientRect(), rad = r.width / 2; let dx = e.clientX - (r.left + rad), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy) || 1, k = Math.min(1, rad / d); dx *= k; dy *= k;
  wheel.dx = dx * WHEEL.r / rad; wheel.dy = dy * WHEEL.r / rad; wk.style.transform = `translate(${dx}px,${dy}px)`;
}
wz.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); wheel = { id: e.pointerId, dx: 0, dy: 0 }; try { wz.setPointerCapture(e.pointerId); } catch (x) {} wzMove(e); });
wz.addEventListener('pointermove', e => { if (wheel && e.pointerId === wheel.id) wzMove(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => wz.addEventListener(ev, e => { if (wheel && e.pointerId === wheel.id) wheel = null; }));
/* ----- the buttons say what they will do right now (Dash <-> Slam, Climb <-> Down) ----- */
const TUI = {};
function setTui(id, txt, cls, on) { const el = $(id), k = id + '|' + txt + '|' + cls + '|' + on; if (TUI[id] === k) return; TUI[id] = k; el.textContent = txt; el.className = cls || ''; el.style.opacity = on === false ? '0.35' : ''; }
const ACTLABEL = { dig: 'Dig', hut: 'Raid', mirror: 'Mirror', plot: 'Build', house: 'Home', mail: 'Mail' };
$('act').addEventListener('pointerdown', e => { e.stopPropagation(); homeInteract(); });
function updateTouchUi() {
  if (!isTouch) return; const play = state === 'play', home = state === 'home';
  if (home) { for (const id of ['dash', 'climb', 'shake', 'whistle', 'call', 'item']) if ($(id).style.display !== 'none') $(id).style.display = 'none'; const a = homeNear ? 'block' : 'none'; if ($('act').style.display !== a) $('act').style.display = a; if (homeNear) setTui('act', ACTLABEL[homeNear.id] || 'Act', '', true); }
  const wzOn = (play || home) && TOUCH.mode === 'wheel' ? 'block' : 'none'; if (wz.style.display !== wzOn) wz.style.display = wzOn; if (!wheel) wk.style.transform = '';
  if (!play) return;
  if ($('act').style.display !== 'none') $('act').style.display = 'none';
  if (viewRole() === 'raccoon') {
    const up = !!P.tree;
    setTui('dash', up ? 'Slam!' : 'Dash', up ? 'slam' : '', up ? true : dashCd <= 0); setTui('climb', up ? 'Down' : 'Climb', '', true); setTui('shake', 'Shake', up ? 'off' : '', !up);
  } else setTui('dash', 'Sprint', '', true);
}
