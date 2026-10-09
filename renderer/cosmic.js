(function () {
  const cfg = window.displayConfig;
  const isPrimary = cfg && cfg.count > 1 && cfg.index === 0;
  if (!isPrimary) return;

  // Deep-link slugs confirmed to work against NASA's "Eyes on the Solar
  // System" app (https://eyes.nasa.gov/apps/solar-system/#/<slug>).
  const TARGETS = [
    { slug: 'sun', label: 'SUN' },
    { slug: 'venus', label: 'VENUS' },
    { slug: 'earth', label: 'EARTH' },
    { slug: 'moon', label: 'MOON' },
    { slug: 'mars', label: 'MARS' },
    { slug: 'jupiter', label: 'JUPITER' },
    { slug: 'saturn', label: 'SATURN' }
  ];
  let targetIndex = 0;

  const img = document.getElementById('img-temp');
  const iframe = document.getElementById('iframe-cosmic');
  const label = document.getElementById('temp-label');

  if (img) img.style.display = 'none';
  if (iframe) iframe.style.display = 'block';

  function show() {
    const target = TARGETS[targetIndex];
    iframe.src = 'https://eyes.nasa.gov/apps/solar-system/#/' + target.slug;
    if (label) label.textContent = 'NASA EYES · ' + target.label;
    if (window.appLog) window.appLog('COSMIC VIEW: ' + target.label);
    targetIndex = (targetIndex + 1) % TARGETS.length;
  }

  show();
  setInterval(show, 15 * 1000);
})();
