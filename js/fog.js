/* ===== DRIFTING CLOUDS =====
   Cloud banks that slowly drift across the orchard on foggy and windy nights (how many / how fast / how thick comes from the night
   condition in modifiers.js: clouds, cloudV, cloudA). They are drawn in the world, so a farmer's flashlight shows them too.
   The pictures come from ASSETS.clouds (a 3 x 2 sheet, made by tools/make_clouds.py); swap in your own art by keeping that grid. */
const CLOUD_CELL = { w: 192, h: 96, cols: 3, variants: 6 };
let CLOUDS = [];
function makeClouds() {                                     // called whenever a night condition is set
  CLOUDS = []; const w = typeof W === 'number' ? W : 1200, h = typeof H === 'number' ? H : 840;
  for (let i = 0; i < MODX.clouds; i++) CLOUDS.push({ v: Math.floor(Math.random() * CLOUD_CELL.variants), s: 1.3 + Math.random() * 1.1, x0: Math.random() * (w + 800), y0: Math.random() * h,
    sp: MODX.cloudV * (0.6 + Math.random() * 0.8), ph: Math.random() * 6.283, a: MODX.cloudA * (0.7 + Math.random() * 0.3) });
}
function drawClouds() {                                     // inside the world transform, above the night tint
  const im = IMG.clouds; if (!CLOUDS.length || !im || !im.complete || !im.naturalWidth) return;
  const cw = CLOUD_CELL.w, ch = CLOUD_CELL.h, span = W + 800; g.save(); g.imageSmoothingEnabled = false;
  for (const c of CLOUDS) {
    const w = cw * c.s, h = ch * c.s, x = ((c.x0 + t * c.sp) % span) - 400 - w / 2, y = c.y0 + Math.sin(t * 0.25 + c.ph) * 8 - h / 2;
    if (x > cam.x + VW || x + w < cam.x || y > cam.y + VH || y + h < cam.y) continue;
    g.globalAlpha = c.a * (0.85 + 0.15 * Math.sin(t * 0.4 + c.ph));
    g.drawImage(im, (c.v % CLOUD_CELL.cols) * cw, Math.floor(c.v / CLOUD_CELL.cols) * ch, cw, ch, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  g.restore();
}
