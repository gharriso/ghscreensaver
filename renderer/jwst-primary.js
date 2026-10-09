(function () {
  // On multi-display setups the primary display's Earth-imagery panel is
  // replaced by a dedicated JWST recent-release rotator (Earth imagery still
  // runs on secondary displays and in the single-display fallback; see the
  // isPrimaryMultiDisplay guard in feeds.js).
  const cfg = window.displayConfig;
  const isPrimary = cfg && cfg.count > 1 && cfg.index === 0;
  if (!isPrimary) return;

  const earthImg = document.getElementById('img-earth');
  const jwstImg = document.getElementById('img-jwst-primary');
  if (earthImg) earthImg.style.display = 'none';
  if (jwstImg) jwstImg.style.display = 'block';

  window.startRecentImageRotator({
    sources: [{ url: '/api/jwst-latest', label: 'JWST', match: /webb|jwst/i }],
    imgEl: jwstImg,
    labelEl: document.getElementById('earth-label'),
    footerEl: document.getElementById('footer-earth'),
    staticLabel: 'JWST · RECENT RELEASE'
  });
})();
