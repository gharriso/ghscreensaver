(function () {
  const SOURCES = ['perseverance', 'curiosity'];
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

  function refreshPerseverance() {
    fetch('https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=8&page=0')
      .then((r) => r.json())
      .then((data) => {
        const items = data && data.images;
        if (!items || !items.length) throw new Error('no images');
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
      '&per_page=8&page=0&condition_1=msl:mission&extended=thumbnail::sample_type::noteq';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const items = data && data.items;
        if (!items || !items.length) throw new Error('no images');
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
