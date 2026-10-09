(function () {
  const SOURCES_ALL = ['perseverance', 'curiosity'];
  const SOURCES = window.displayConfig
    ? window.displayConfig.partition(SOURCES_ALL)
    : SOURCES_ALL;
  let sourceIndex = 0;
  let perseveranceOffset = 0;
  let curiosityOffset = 0;

  function log(msg) {
    if (window.appLog) window.appLog(msg);
  }

  function setFooter(text) {
    const el = document.getElementById('footer-mars');
    if (el) el.textContent = text;
  }

  function showImage(url, label, footerText) {
    const img = document.getElementById('img-mars');
    const lbl = document.getElementById('mars-label');
    img.src = url;
    img.classList.add('loaded');
    if (lbl) lbl.textContent = label;
    setFooter(footerText);
  }

  // Narrow-field instruments (ChemCam/SuperCam's Remote Micro-Imager,
  // MAHLI/SHERLOC macro cameras) shoot round, grainy, close-up frames -
  // often calibration targets or rock texture - that read as an astronomy
  // image rather than a Mars surface photo. Stick to the wide landscape
  // cameras (Navcam, Mastcam/Mastcam-Z, Hazcam) for this panel.
  const NARROW_FIELD_CAMERA = /RMI|MAHLI|SHERLOC|CACHECAM/i;

  // Both rovers occasionally shoot at night (sky-watch/atmospheric-dust
  // observations, still tagged with an ordinary landscape instrument name).
  // In the dark those frames are just sensor noise - faint colored speckle
  // on black, sometimes with one blown-out bright point - which reads as a
  // starfield/astronomy image rather than a Mars surface photo. Both APIs
  // expose the same "Sol-NNNNNMHH:MM:SS" local-mean-solar-time format, just
  // under different field names, so filter both by local hour.
  function isNightTime(lmst) {
    const match = /M(\d{2}):/.exec(lmst || '');
    if (!match) return false;
    const hour = parseInt(match[1], 10);
    return hour < 6 || hour >= 19;
  }

  // Both rovers also occasionally aim a landscape camera almost straight up
  // (mast elevation near 90°) for sun-finding/pointing checks, even in
  // broad daylight - producing a blown-out sun halo on a mostly empty frame
  // rather than a ground view. Perseverance's API names this "mastEl",
  // Curiosity's "mast_el"; normal forward-looking landscape shots rarely
  // exceed ~40° even when framing a tall feature.
  function isSkyPointed(extended) {
    if (!extended) return false;
    const raw = extended.mastEl !== undefined ? extended.mastEl : extended.mast_el;
    const elevation = parseFloat(raw);
    return !isNaN(elevation) && Math.abs(elevation) > 45;
  }

  function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .finally(() => clearTimeout(timer));
  }

  function refreshPerseverance() {
    fetchJson(
      'https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=20&page=0',
      8000
    )
      .then((data) => {
        const allItems = data && data.images;
        if (!allItems || !allItems.length) throw new Error('no images');
        const items = allItems.filter(
          (item) =>
            !NARROW_FIELD_CAMERA.test(item.camera.instrument) &&
            !isNightTime(item.date_taken_mars) &&
            !isSkyPointed(item.extended)
        );
        if (!items.length) throw new Error('no landscape images');
        const item = items[perseveranceOffset % items.length];
        perseveranceOffset++;
        const url = item.image_files.large || item.image_files.medium;
        const cam = item.camera.instrument.replace(/_/g, ' ');
        showImage(
          url,
          'MARS / PERSEVERANCE ' + cam,
          'Sol ' + item.sol + ' · ' + item.date_taken_utc.replace('T', ' ').slice(0, 16) + ' UTC'
        );
        log('MARS: Perseverance sol ' + item.sol + ' (' + cam + ') loaded');
      })
      .catch(() => {
        setFooter('feed unavailable, retrying...');
        log('MARS: Perseverance feed unavailable');
      });
  }

  function refreshCuriosity() {
    const url =
      'https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc,date_taken+desc' +
      '&per_page=20&page=0&condition_1=msl:mission&extended=thumbnail::sample_type::noteq';
    fetchJson(url, 8000)
      .then((data) => {
        const allItems = data && data.items;
        if (!allItems || !allItems.length) throw new Error('no images');
        const items = allItems.filter(
          (item) =>
            !NARROW_FIELD_CAMERA.test(item.instrument) &&
            !isNightTime(item.extended && item.extended.lmst) &&
            !isSkyPointed(item.extended)
        );
        if (!items.length) throw new Error('no landscape images');
        const item = items[curiosityOffset % items.length];
        curiosityOffset++;
        const cam = item.instrument.replace(/_/g, ' ');
        showImage(
          item.https_url,
          'MARS / CURIOSITY ' + cam,
          'Sol ' + item.sol + ' · ' + item.date_taken.replace('T', ' ').slice(0, 16) + ' UTC'
        );
        log('MARS: Curiosity sol ' + item.sol + ' (' + cam + ') loaded');
      })
      .catch(() => {
        setFooter('feed unavailable, retrying...');
        log('MARS: Curiosity feed unavailable');
      });
  }

  function refresh() {
    const source = SOURCES[sourceIndex];
    if (source === 'perseverance') refreshPerseverance();
    else refreshCuriosity();
  }

  function cycleSource() {
    sourceIndex = (sourceIndex + 1) % SOURCES.length;
    refresh();
  }

  refresh();
  setInterval(cycleSource, 25 * 1000);
})();
