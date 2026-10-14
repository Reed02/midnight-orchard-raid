/* ----- drawing ----- */
const FW = 80, FH = 85;
const CHEEK_OFFSETS = [[0,1],[0,0],[0,-1],[0,-1],[-1,1],[0,0],[0,-1],[0,0],[0,1],[0,0],[0,-1],[0,1],[0,0],[0,-1]];   // per walk frame: nudges the cheek puffs so they follow the head
function img(k, x, y, w, h, flip) { const i = IMG[k]; if (!i || !i.complete || !i.naturalWidth) return false; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(i, -w / 2, -h, w, h); g.restore(); return true; }
function fit(k, x, y, height, flip) { const i = IMG[k]; return i && i.naturalWidth ? img(k, x, y, i.naturalWidth / i.naturalHeight * height, height, flip) : false; }
function shadow(x, y, w) { g.fillStyle = 'rgba(10,30,10,.28)'; g.beginPath(); g.ellipse(x, y, w, w * 0.3, 0, 0, 7); g.fill(); }
function blades(x, y, w) { g.fillStyle = '#5e9c40'; for (let i = -2; i <= 2; i++) { g.fillRect(x + i * w * .22, y - 4 - Math.abs(i), 3, 6 + Math.abs(i)); } }   // grass over sprite base hides seams
const TREE_FRAMES = 12;   // frames in the treeRustle sheet
function drawRustleTree(o) {
  const s = IMG.treeRustle, fw = s.naturalWidth / TREE_FRAMES, fh = s.naturalHeight, h = CONFIG.treeHeight, w = fw / fh * h;
  const on = o.rustle > 0, p = Math.floor(t * 12) % (2 * (TREE_FRAMES - 1)), fi = on ? (p < TREE_FRAMES ? p : 2 * (TREE_FRAMES - 1) - p) : 0;
  const k = on ? Math.sin(t * 46) * (0.02 + 0.05 * (o.shakeP || 0)) : Math.sin(t * 0.9 + o.x) * 0.006;   // sideways shake, stronger as the bar fills
  shadow(o.x, o.y + 2, w * 0.3);
  g.save(); g.translate(o.x, o.y + 4); g.transform(1, 0, k, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.drawImage(s, fi * fw, 0, fw, fh, -w / 2, -h, w, h); g.restore(); blades(o.x, o.y + 4, w * 0.4);
}
function drawScenery(o) {
  if (o.k === 'tree' && IMG.treeRustle && IMG.treeRustle.naturalWidth) return drawRustleTree(o);
  const i = IMG[o.k]; if (!i || !i.naturalWidth) return;
  const w = i.naturalWidth * CONFIG.sizeScale, h = i.naturalHeight * CONFIG.sizeScale;
  shadow(o.x, o.y + 2, w * 0.38); img(o.k, o.x, o.y + 4, w, h); blades(o.x, o.y + 4, w * 0.6);
}
function drawApple(a) {
  if (a.jackpot) { const p = 0.7 + 0.3 * Math.sin(t * 4 + a.x); g.fillStyle = `rgba(255,210,63,${0.35 * p})`; g.beginPath(); g.arc(a.x, a.y - 4, 22 + 4 * p, 0, 7); g.fill(); }
  const b = Math.sin((t + a.x) * 3) * 2; g.save(); g.translate(a.x, a.y + b - (a.fall / CONFIG.apples.fallTime) * 60);
  if (!img(a.gold ? 'goldapple' : 'apple', 0, 12, 26, 26)) {
    shadow(0, 12, 11); g.fillStyle = a.gold ? '#f2b705' : '#d62828'; g.beginPath(); g.arc(-4, 0, 10, 0, 7); g.arc(4, 0, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-8, -5, 3, 4); g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -8); g.lineTo(1, -14); g.stroke();
    g.fillStyle = '#3f8f2f'; g.beginPath(); g.ellipse(6, -13, 6, 3, -.5, 0, 7); g.fill();
  } g.restore();
}
function drawDen() {
  const d = den; g.strokeStyle = 'rgba(255,230,150,.5)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.arc(d.x, d.y, d.radius, 0, 7); g.stroke(); g.setLineDash([]);
  if (img('den', d.x, d.y + 20, 90, 70)) return;
  shadow(d.x, d.y + 14, 38); g.fillStyle = '#6b4423'; g.beginPath(); g.ellipse(d.x, d.y, 34, 22, 0, 0, 7); g.fill(); g.fillStyle = '#2a170a'; g.beginPath(); g.ellipse(d.x + 8, d.y, 12, 16, 0, 0, 7); g.fill();
}
function drawFarmer(f) {
  const face = Math.cos(f.face || 0) >= 0 ? 1 : -1; shadow(f.x, f.y, 14);
  if (fit('farmer', f.x, f.y + 4, CONFIG.spriteHeight.farmer, face < 0)) return;
  g.fillStyle = '#3b5ea6'; g.fillRect(f.x - 9, f.y - 30, 18, 30); g.fillStyle = '#e8b98a'; g.fillRect(f.x - 7, f.y - 42, 14, 12); g.fillStyle = '#c9a227'; g.fillRect(f.x - 14, f.y - 44, 28, 5); g.fillRect(f.x - 8, f.y - 50, 16, 7);
}
const DOG_FRAMES = 12;   // frames in the dogWalk sheet
function stars(d) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.fillStyle = '#ffd23f'; g.fillRect(d.x + Math.cos(a) * 14 - 2, d.y - CONFIG.spriteHeight.dog - 2 + Math.sin(a) * 4, 5, 5); } }   // dizzy stars
function drawDog(d) {
  shadow(d.x, d.y, 15); if (d.stun > 0) stars(d);
  const s = IMG.dogWalk;
  if (s && s.naturalWidth) {
    const fw = s.naturalWidth / DOG_FRAMES, fh = s.naturalHeight, h = CONFIG.spriteHeight.dog, w = fw / fh * h;
    g.save(); g.translate(d.x, d.y + 4); if (d.face < 0) g.scale(-1, 1); g.imageSmoothingEnabled = false;
    g.drawImage(s, (Math.floor(d.anim || 0) % DOG_FRAMES) * fw, 0, fw, fh, -w / 2, -h, w, h); g.restore(); return;
  } if (fit('dog', d.x, d.y + 4, CONFIG.spriteHeight.dog, d.face < 0)) return;
  g.save(); g.translate(d.x, d.y); g.scale(d.face || 1, 1); g.fillStyle = d.chase ? '#8b3a1a' : '#a8743a'; g.fillRect(-14, -20, 26, 14); g.fillRect(8, -28, 12, 12); g.fillRect(-14, -8, 5, 8); g.fillRect(6, -8, 5, 8); g.fillStyle = '#222'; g.fillRect(16, -24, 3, 3); g.restore();
}
function drawCoon() {
  if (viewRole() === 'farmer' && !teamSees()) return;     // the farmer only sees the raccoon inside the light
  const f = P.moving ? Math.floor(anim) % 14 : 0, bob = P.moving ? Math.abs(Math.sin(anim * .9)) * 4 : 0, w = FW * .8, h = FH * .8;
  const lift = P.tree ? CONFIG.treeHeight * 0.5 : airborne() ? (1 - slam.t) * CONFIG.treeHeight * 0.5 : 0;   // height above the ground
  shadow(P.x, P.y, 15); g.save(); g.translate(P.x, P.y - bob - lift);
  if (inv > 0 && Math.floor(t * 10) % 2) g.globalAlpha = .45; if (hidden()) g.globalAlpha = Math.min(g.globalAlpha, .6); if (P.tree) g.globalAlpha = Math.min(g.globalAlpha, .9);
  if (airborne()) g.rotate(slam.t * 12); g.scale(CONFIG.player.spriteFacesRight ? P.face : -P.face, 1); g.imageSmoothingEnabled = false; // sprite choice: startled pose when spotted, fuller cheeks as you carry more, normal walk otherwise
  let sheet = IMG.raccoon, fi = f, puff = false, lvl = carry.length ? Math.min(4, Math.ceil(carry.length / S.carry * 4)) : 0;
  if (IMG.raccoonCheeks && (startleT > 0 || alertV > 0.3)) { sheet = IMG.raccoonCheeks; fi = 8; }
  else if (lvl > 0 && IMG.cheekOverlay) puff = true;                          // carrying apples: the normal walk animation, with puffed cheeks drawn on top
  else if (IMG.raccoonCheeks && lvl > 0) { sheet = IMG.raccoonCheeks; fi = (lvl - 1) * 2 + (P.moving ? Math.floor(anim / 2) % 2 : 0); }
  if (sheet) g.drawImage(sheet, fi * FW, 0, FW, FH, -w / 2, -h + 4, w, h);
  if (puff) { const o = CHEEK_OFFSETS[f] || [0, 0]; g.drawImage(IMG.cheekOverlay, (lvl - 1) * FW, 0, FW, FH, -w / 2 + o[0] * .8, -h + 4 + o[1] * .8, w, h); }
  g.restore();
  carry.forEach((v, i) => { g.fillStyle = v > 1 ? '#f2b705' : '#d62828'; g.beginPath(); g.arc(P.x - (carry.length - 1) * 6 + i * 12, P.y - lift - h - 8 - bob, 5, 0, 7); g.fill(); });
  if (P.tree) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(P.x, P.y - lift - h - 12, 8, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.max(0, climbT) / CONFIG.climb.maxTime); g.stroke(); }   // time left up the tree
  if (alertV > 0) { g.fillStyle = '#222'; g.fillRect(P.x - 18, P.y - lift - h - 24, 36, 6); g.fillStyle = '#ff5252'; g.fillRect(P.x - 17, P.y - lift - h - 23, 34 * Math.min(1, alertV), 4); }
}
function cone(f) {
  const k = coneOf(f), c = { coneLength: k.len, coneHalfAngle: k.half }, hot = alertV > 0.05, gr = g.createRadialGradient(f.x, f.y, 10, f.x, f.y, c.coneLength);
  gr.addColorStop(0, hot ? 'rgba(255,90,70,.55)' : 'rgba(255,240,170,.5)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(f.x, f.y - 20); g.arc(f.x, f.y - 20, c.coneLength, f.look - c.coneHalfAngle, f.look + c.coneHalfAngle); g.closePath(); g.fill();
}
function drawPops(top) {
  g.font = 'bold 22px "Trebuchet MS",Verdana,sans-serif';
  pops.forEach(p => { if (!!p.top !== top) return; g.globalAlpha = Math.min(1, p.l * 2); g.fillStyle = p.c; g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeText(p.s, p.x - 20, p.y); g.fillText(p.s, p.x - 20, p.y); });
  g.globalAlpha = 1;
}
// Farmer view: everything is black except the flashlight cone, a dim circle around the farmer and a small circle around each dog.
const maskC = document.createElement('canvas'), mg = maskC.getContext('2d'); maskC.width = VW; maskC.height = VH;
function drawBlackout() {
  const M = CONFIG.multiplayer, me = myFarmer() || farmers[0], ox = Math.round(cam.x), oy = Math.round(cam.y);
  mg.globalCompositeOperation = 'source-over'; mg.fillStyle = '#000'; mg.fillRect(0, 0, VW, VH); mg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const gr = mg.createRadialGradient(x, y, r * 0.3, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); mg.fillStyle = gr; mg.beginPath(); mg.arc(x, y, r, 0, 7); mg.fill(); };
  for (const f of farmers) {                          // every farmer's flashlight lights the map for the farmer player: the team shares its vision
    const x = f.x - ox, y = f.y - 20 - oy, c = coneOf(f), gr = mg.createRadialGradient(x, y, 10, x, y, c.len);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0.1)');
    mg.fillStyle = gr; mg.beginPath(); mg.moveTo(x, y); mg.arc(x, y, c.len, f.look - c.half, f.look + c.half); mg.closePath(); mg.fill();
    hole(x, y, f === me ? (FS.seeRadius * MODX.see) : 45);
  }
  dogs.forEach(d => hole(d.x - ox, d.y - 20 - oy, M.dogSeeRadius));
  if (teamSees()) hole(P.x - ox, P.y - 20 - oy, 55);      // the raccoon is lit up whenever any farmer or dog sees it
  g.drawImage(maskC, 0, 0);
  drawTracks(me, ox, oy);
}
function farmerHud() { const f = myFarmer() || {}; return 'Whistle ' + (f.whistleCd > 0 ? Math.ceil(f.whistleCd) : '✓') + '   Sprint ' + (f.sprintCd > 0 ? Math.ceil(f.sprintCd) : '✓'); }
function hudHint() {
  if (viewRole() === 'farmer') { hint(isTouch ? 'Tap the map to send the dogs' : `Light follows you   ${kn('whistle')}: whistle   ${kn('call')}: call dogs   ${kn('dash')}: sprint   ${kn('map')}: map`); return; }
  if (!P.tree && !slam) { const tr = nearTree(CONFIG.shake.range); if (tr) hint(tr.cd > 0 ? 'This tree is bare - try another' : `Hold ${kn('shake')}: shake     ${kn('climb')}: climb`); }
  else if (P.tree) hint(`${kn('dash')}: cannonball     ${kn('climb')}: climb down`);
}
function drawShakeBar(o) {                       // white progress bar over a tree being shaken
  if (o.k !== 'tree' || !(o.shakeP > 0)) return;
  const bw = 44, y = o.y - CONFIG.treeHeight - 6;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(o.x - bw / 2 - 2, y - 2, bw + 4, 10); g.fillStyle = '#fff'; g.fillRect(o.x - bw / 2, y, bw * Math.min(1, o.shakeP), 6);
}
function hint(s) { g.font = 'bold 18px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#111'; g.strokeText(s, VW / 2, VH - 18); g.fillStyle = '#fff'; g.fillText(s, VW / 2, VH - 18); g.textAlign = 'left'; }
function draw() {
  g.save(); if (shakeAmt > 0) g.translate(rnd(-1, 1) * shakeAmt * 14, rnd(-1, 1) * shakeAmt * 14);
  g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y));          // world drawing starts here
  g.fillStyle = '#6fae4b'; g.fillRect(0, 0, W, H); g.fillStyle = '#5e9c40'; tufts.forEach(u => { g.fillRect(u.x, u.y, 3, 8); g.fillRect(u.x + 5, u.y + 2, 3, 6); });
  drawDen(); apples.forEach(drawApple);
  [...obs.map(o => ({ y: o.y, f: () => drawScenery(o) })), ...farmers.map(f => ({ y: f.y, f: () => drawFarmer(f) })), ...dogs.map(d => ({ y: d.y, f: () => drawDog(d) })), { y: P.y, f: drawCoon }].sort((a, b) => a.y - b.y).forEach(i => i.f());
  g.fillStyle = `rgba(8,14,44,${MODX.tint})`; g.fillRect(0, 0, W, H);            // night tint
  if (strange) drawStrange(strange.x, strange.y);
  drawClouds();          // the strange light glows through the night tint
  g.globalCompositeOperation = 'lighter'; farmers.forEach(cone); g.globalCompositeOperation = 'source-over'; obs.forEach(drawShakeBar);
  if (flash > 0) { g.fillStyle = `rgba(255,60,60,${flash})`; g.fillRect(0, 0, W, H); }
  drawPops(false);
  g.restore();                                                              // screen-space drawing (HUD) from here
  if (viewRole() === 'farmer') drawBlackout();
  g.save(); g.translate(-Math.round(cam.x), -Math.round(cam.y)); drawPops(true); g.restore();       // whistle pings show through the dark
  if (viewRole() === 'farmer') drawMinimap();
  drawFog(); drawCompass(); if (viewRole() === 'farmer' && strange) drawStrange(strange.x - cam.x, strange.y - cam.y);
  // arrow pointing home when the den is off screen
  const hx = den.x - cam.x, hy = den.y - cam.y;
  if (viewRole() === 'raccoon' && (hx < 0 || hx > VW || hy < 40 || hy > VH)) {
    const cx = VW / 2, cy = VH / 2 + 20, ang = Math.atan2(hy - cy, hx - cx), r = Math.min((VW / 2 - 30) / (Math.abs(Math.cos(ang)) || 1e-6), (VH / 2 - 60) / (Math.abs(Math.sin(ang)) || 1e-6));
    g.save(); g.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); g.rotate(ang); g.fillStyle = 'rgba(255,230,150,.95)'; g.strokeStyle = '#222'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  // HUD
  g.fillStyle = 'rgba(10,18,30,.85)'; g.fillRect(0, 0, VW, 40); g.fillStyle = '#e4572e'; g.fillRect(0, 36, VW * Math.max(0, time) / CONFIG.night(night).time, 4);
  g.textBaseline = 'middle'; g.fillStyle = '#fff7e6'; g.textAlign = 'left'; g.fillText('Night ' + night + (endless ? '' : '/' + CONFIG.nightsToWin) + '   ' + '♥'.repeat(Math.max(0, hearts)), 14, 19);
  g.textAlign = 'center'; g.fillText(viewRole() === 'farmer' ? 'Raccoon banked ' + banked + '/' + quota : 'Banked ' + banked + '/' + quota + '   Cheeks ' + carry.length + '/' + S.carry + '   Ground ' + groundLeft, VW / 2, 19);
  g.textAlign = 'right'; g.fillText(viewRole() === 'farmer' ? farmerHud() : 'Score ' + score + (dashCd > 0 ? '   dash ' + Math.ceil(dashCd) : '   DASH'), VW - 14, 19); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  hudHint(); drawBanner();
  drawSpeaker(); drawPause(); drawWheel();
  if (multi && !isHost) { g.font = '11px Verdana,sans-serif'; g.textAlign = 'right'; g.fillStyle = net.rtt < 80 ? '#9be37f' : net.rtt < 160 ? '#ffd23f' : '#ff7a6a'; g.fillText('ping ' + Math.round(net.rtt) + ' ms', VW - 8, 54); g.textAlign = 'left'; }   // how laggy the connection to the host is
  g.restore();
}
function followCam(dt) {                                   // camera eases toward the raccoon and stays inside the world
  const me = myEntity(), tx = Math.max(0, Math.min(W - VW, me.x - VW / 2)), ty = Math.max(0, Math.min(H - VH, me.y - 30 - VH / 2)), f = Math.min(1, dt * 7);
  cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f;
}
function loop(now) { loopQueued = false; if (state !== 'play') return; const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); if (state === 'play') {
    if (multi && isHost && net.r && now - net.sentAt >= 1000 / CONFIG.multiplayer.sendHz) { net.sentAt = now; nsend('snap', snapshot()); }
    audioTick(dt); followCam(dt); draw(); kickLoop();
  } }

