(function () {
  const SOURCES = [
    { url: '/api/hubble-latest', label: 'HUBBLE · LATEST RELEASE' },
    { url: '/api/jwst-latest', label: 'JWST · LATEST RELEASE' }
  ];
  let sourceIndex = 0;

  function setFooter(text) {
    const el = document.getElementById('footer-hubble');
    if (el) el.textContent = text;
  }

  function refresh() {
    const source = SOURCES[sourceIndex];
    fetch(source.url)
      .then((r) => r.json())
      .then((data) => {
        const post = data && data[0];
        if (!post || !post.featured_image_url) throw new Error('no image');

        const img = document.getElementById('img-hubble');
        const label = document.getElementById('hubble-label');
        img.src = post.featured_image_url;
        img.classList.add('loaded');
        if (label) label.textContent = source.label;
        setFooter(post.title.rendered.replace(/&#8217;/g, '’') + ' · ' + post.date.slice(0, 10));
        if (window.appLog) window.appLog(source.label + ': "' + post.title.rendered.replace(/&#8217;/g, '’') + '"');
      })
      .catch(() => {
        setFooter('feed unavailable, retrying...');
        if (window.appLog) window.appLog(source.label + ': feed unavailable');
      });
  }

  function cycleSource() {
    sourceIndex = (sourceIndex + 1) % SOURCES.length;
    refresh();
  }

  refresh();
  setInterval(cycleSource, 30 * 1000);
})();
