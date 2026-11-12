/* ----- boot ----- */
addEventListener('load', () => { for (const k in ASSETS) { IMG[k] = new Image(); IMG[k].src = ASSETS[k]; } document.body.classList.toggle('touch', isTouch); layoutView(); titleScreen(); netInit(); });
