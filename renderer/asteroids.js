(function () {
  // On multi-display setups the primary display's orbit-diagram panel shows
  // NASA Eyes on Asteroids instead of the canvas diagram (solar-system.js
  // still runs on secondary displays and in the single-display fallback).
  const cfg = window.displayConfig;
  const isPrimary = cfg && cfg.count > 1 && cfg.index === 0;
  if (!isPrimary) return;

  const canvas = document.getElementById('planets-canvas');
  const iframe = document.getElementById('iframe-asteroids');
  const label = document.getElementById('planets-label');
  const footer = document.getElementById('footer-planets');

  if (canvas) canvas.style.display = 'none';
  if (iframe) {
    iframe.style.display = 'block';
    // The #/home route's default resting camera (after its ~15-20s intro
    // flythrough settles) frames the whole inner solar system out to about
    // Mars's orbital radius, with the asteroid belt visible beyond it - a
    // wide top-down view, not a close-up tracking shot of Mars itself.
    // rate is in simulated seconds per real second (10800 = 3 hr/s ~= 7.5
    // days/min, the nearest step the app's time slider snaps to for a
    // "~1 week/min" pace).
    iframe.src = 'https://eyes.nasa.gov/apps/asteroids/#/home?rate=10800';
  }
  if (label) label.textContent = 'NASA EYES · ASTEROIDS (OUT TO MARS)';
  if (footer) footer.textContent = 'Time rate ~1 week/min';
  if (window.appLog) window.appLog('ASTEROIDS: NASA Eyes loaded, Mars orbit, ~1 week/min');
})();
