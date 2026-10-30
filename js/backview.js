/* ===== THE RACCOON FROM BEHIND (for the mirror) =====
   The game's raccoon art only shows its front. The mirror stands facing you, so when the raccoon faces the camera (or walks away from the
   mirror) the mirror has to show its BACK. backSheet(sheet) makes a back view of any raccoon walk sheet at runtime - the classic one, the
   recoloured skins and every drawn skin - frame by frame, so the walk still moves:
     - the face, the muzzle, the belly and the front of the arms (every colour that appears around the eyes) become plain fur, shaded
       like a rounded back: darker toward the edges, a soft highlight up top, a line where the head meets the body, a little fur texture;
     - the outline stays, and so do the things you see from behind as well: the tail, wings, a held staff or pot (SKIN_PARTS), and costume
       pieces whose colours are not face colours (a gnome's hat, pyjamas, a smock).
   To use hand-drawn back art instead: put a sheet with the same frame layout in BACK_ART[skin id] (an Image) and it is used as it is. */
const BACK_ART = {};
const BACKS = new WeakMap();
const BACK_CLASSIC = { eye: [34, 33], keep: [[70, 46, 11, 31, 1]] };           // the default raccoon: between the eyes, and its tail (x, y, radius x, radius y)
function backSheet(sheet, skinId) {
  if (!sheet || !sheet.naturalWidth) return null; const own = BACK_ART[skinId]; if (own && own.complete && own.naturalWidth) return own;
  if (BACKS.has(sheet)) return BACKS.get(sheet);
  const sk = typeof skinDef === 'function' ? skinDef('raccoon', skinId) : null, art = sk && sk.art, a = art && typeof SKIN_SRC !== 'undefined' && SKIN_SRC[art];
  if (art && !sheet.fw) return null;                                       // a drawn skin that is not decoded yet: try again next frame
  const fw = sheet.fw || FW, fh = sheet.fh || FH, n = Math.max(1, Math.round(sheet.naturalWidth / fw));
  let eye = BACK_CLASSIC.eye, keep = BACK_CLASSIC.keep, scale = 1;
  if (art && a) {
    const px = Math.round(SKF.ox + SKF.cx - a.cx), py = SKF.oy + SKF.foot - a.h, e = SKIN_EYE[art] || [a.cx, a.h * 0.38];
    eye = [px + e[0], py + e[1]]; keep = (SKIN_PARTS[art] || []).filter(p => !/^arm/.test(p[0])).map(p => [px + p[1], py + p[2], p[3] + 3, p[4] + 3, p[0] === 'tail' ? 1 : 0]); scale = a.h / 85;
  } else if (sheet.fw) { eye = [eye[0] + sheet.ox, eye[1] + sheet.oy]; keep = keep.map(k => [k[0] + sheet.ox, k[1] + sheet.oy, k[2], k[3], k[4]]); }
  const c = document.createElement('canvas'); c.width = sheet.naturalWidth; c.height = fh; const x = c.getContext('2d'); x.drawImage(sheet, 0, 0);
  let img; try { img = x.getImageData(0, 0, c.width, fh); } catch (e) { return null; }
  let pal = null;                                                          // the face colours and the fur colour come from the standing frame, so every frame matches
  for (let i = 0; i < n; i++) pal = backFrame(img, i * fw, fw, fh, eye, keep, sheet.hd ? sheet.hd[i] : (!sheet.fw && typeof CHEEK_OFFSETS !== 'undefined' ? CHEEK_OFFSETS[i] : null), scale, pal) || pal;
  x.putImageData(img, 0, 0);
  if (sheet.fw) Object.assign(c, { fw: sheet.fw, fh: sheet.fh, ox: sheet.ox, oy: sheet.oy, hd: sheet.hd });
  Object.assign(c, { naturalWidth: c.width, naturalHeight: c.height, complete: true }); BACKS.set(sheet, c); return c;
}
function backFrame(img, x0, fw, fh, eye0, keep, off, sc, pal) {
  const W = img.width, D = img.data, A = (X, Y) => X >= 0 && Y >= 0 && X < fw && Y < fh && D[((Y * W) + x0 + X) * 4 + 3] > 8;
  const o = off || [0, 0], ex = eye0[0] + o[0], ey = eye0[1] + o[1], R = Math.round;
  const dist = new Uint8Array(fw * fh);                                    // how far each pixel is inside the outline (1 = on it), up to 4
  for (let Y = 0; Y < fh; Y++) for (let X = 0; X < fw; X++) if (A(X, Y)) dist[Y * fw + X] = A(X - 1, Y) && A(X + 1, Y) && A(X, Y - 1) && A(X, Y + 1) ? 9 : 1;
  for (let k = 2; k <= 4; k++) for (let Y = 0; Y < fh; Y++) for (let X = 0; X < fw; X++) { const j = Y * fw + X; if (dist[j] !== 9) continue; if ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([u, v]) => dist[(Y + v) * fw + X + u] === k - 1)) dist[j] = k; }
  const inKeep = (X, Y) => keep.some(k => ((X - k[0] - o[0] * 0.5) / k[2]) ** 2 + ((Y - k[1]) / k[3]) ** 2 < 1);
  const px = (X, Y) => { const i = ((Y * W) + x0 + X) * 4; return [D[i], D[i + 1], D[i + 2]]; };
  const lum = p => (Math.max(...p) + Math.min(...p)) / 510;
  if (!pal) {
  const face = [], fx0 = R(ex - 16 * sc), fx1 = R(ex + 16 * sc), fy0 = R(ey - 9 * sc), fy1 = R(ey + 13 * sc);        // every colour round the eyes is a "face" colour
  for (let Y = Math.max(0, fy0); Y <= Math.min(fh - 1, fy1); Y++) for (let X = Math.max(0, fx0); X <= Math.min(fw - 1, fx1); X++) if (A(X, Y) && !inKeep(X, Y)) face.push(px(X, Y));
  if (!face.length) return null;
  const uniq = [...new Map(face.map(p => [p.join(','), p])).values()], memo = new Map();
  const near = p => { const k = (p[0] << 16) | (p[1] << 8) | p[2]; let v = memo.get(k); if (v === undefined) { v = uniq.some(q => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 < 26 * 26); memo.set(k, v); } return v; };
  const bins = {};      // the fur colour: the commonest mid-tone colour on the forehead (between the ears, above the eyes), else round the eyes
  const top = []; for (let Y = Math.max(0, R(ey - 17 * sc)); Y <= R(ey - 7 * sc); Y++) for (let X = Math.max(0, R(ex - 9 * sc)); X <= Math.min(fw - 1, R(ex + 9 * sc)); X++) if (A(X, Y) && dist[Y * fw + X] > 1 && !inKeep(X, Y)) { const p = px(X, Y); if (near(p) && lum(p) > 0.14 && lum(p) < 0.74) top.push(p); }
  for (const p of top.length > 12 ? top : face) { const l = lum(p); if (l < 0.14 || l > 0.8) continue; const k = (p[0] >> 4) + ',' + (p[1] >> 4) + ',' + (p[2] >> 4), b = bins[k] || (bins[k] = [0, 0, 0, 0]); b[0] += p[0]; b[1] += p[1]; b[2] += p[2]; b[3]++; }
  let best = null; for (const k in bins) if (!best || bins[k][3] > best[3]) best = bins[k];
  pal = { near, fur: best ? [best[0] / best[3], best[1] / best[3], best[2] / best[3]] : face[0] };
  }
  const near = pal.near, fur = pal.fur;
  const neckY = ey + 15 * sc, headW = 24 * sc; let footY = 0; for (let Y = fh - 1; Y >= 0 && !footY; Y--) for (let X = 0; X < fw; X++) if (A(X, Y)) { footY = Y; break; }
  for (let Y = 0; Y < fh; Y++) for (let X = 0; X < fw; X++) {
    const d = dist[Y * fw + X]; if (!d || d === 1 || inKeep(X, Y)) continue;      // the outline and the tail stay as drawn
    const p = px(X, Y); if (!near(p)) continue;                                   // a costume colour: it is there from behind too
    if (Y > footY - 7 * sc) continue;                                             // the feet look the same from behind
    let s = d === 2 ? 0.8 : d === 3 ? 0.92 : 1;
    const head = Y < neckY, cx = ex - 7 * sc, cy = head ? ey - 9 * sc : neckY + 8 * sc, rr = 26 * sc;             // two rounded shapes (head, body) lit from the upper left, in a few bands like pixel art
    s += Math.round(Math.max(-1, Math.min(1, 1 - Math.hypot(X - cx, Y - cy) / rr * 1.3)) * 2) / 2 * 0.08;
    const nk = neckY + R(((X - ex) / headW) ** 2 * 4 * sc); if (Math.abs(X - ex) < headW && (Y === R(nk) || Y === R(nk) + 1)) s -= 0.13;      // where the head meets the body
    if ((X * 7 + Y * 13) % 11 === 0) s -= 0.06; else if ((X * 5 + Y * 3) % 17 === 0) s += 0.05;       // fur texture
    const i = ((Y * W) + x0 + X) * 4; D[i] = Math.min(255, fur[0] * s); D[i + 1] = Math.min(255, fur[1] * s); D[i + 2] = Math.min(255, fur[2] * s);
  }
  return pal;
}
