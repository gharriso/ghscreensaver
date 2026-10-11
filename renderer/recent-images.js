// Shared helper: cycles an <img> through recent posts fetched from one or
// more same-origin proxy endpoints (see API_PROXY_ROUTES in main.js), each
// post shaped like a science.nasa.gov WP REST API item.
window.startRecentImageRotator = function (options) {
  const {
    sources, // [{ url, label, match? }] - match: RegExp tested against title
    imgEl,
    labelEl,
    footerEl,
    staticLabel,
    partitionItems = false, // split posts across displays (display-config.js)
    intervalMs = 20 * 1000,
    refreshMs = 30 * 60 * 1000
  } = options;

  let queue = [];
  let queueIndex = 0;

  function cleanTitle(title) {
    return title.replace(/&#8217;/g, '’');
  }

  // Interleaves each source's recent-post list (rather than exhausting one
  // source before moving to the next) so a multi-source queue alternates
  // between sources instead of running through them one at a time, and
  // drops posts already seen under an earlier source. science.nasa.gov's
  // categories overlap (a Webb-only story can be tagged under the Hubble
  // category and vice versa), so the same post ID can come back from more
  // than one source's fetch - without this, both sources would show the
  // exact same image.
  function interleave(lists) {
    const result = [];
    const seenIds = new Set();
    const max = Math.max(0, ...lists.map((l) => l.length));
    for (let i = 0; i < max; i++) {
      lists.forEach((list) => {
        const item = list[i];
        if (item && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          result.push(item);
        }
      });
    }
    return result;
  }

  function setFooter(text) {
    if (footerEl) footerEl.textContent = text;
  }

  function showCurrent() {
    const item = queue[queueIndex];
    if (!item) return;
    imgEl.src = item.imageUrl;
    imgEl.classList.add('loaded');
    if (labelEl) labelEl.textContent = staticLabel || item.sourceLabel + ' · RECENT RELEASE';
    setFooter(item.title + ' · ' + item.date);
    if (window.appLog) window.appLog(item.sourceLabel + ': "' + item.title + '"');
  }

  function advance() {
    if (!queue.length) return;
    queueIndex = (queueIndex + 1) % queue.length;
    showCurrent();
  }

  function loadQueue() {
    Promise.all(
      sources.map((source) =>
        fetch(source.url)
          .then((r) => r.json())
          .then((posts) =>
            (posts || [])
              .filter((post) => post && post.featured_image_url)
              .filter((post) => !source.match || source.match.test(post.title.rendered))
              .map((post) => ({
                id: post.id,
                imageUrl: post.featured_image_url,
                title: cleanTitle(post.title.rendered),
                date: post.date.slice(0, 10),
                sourceLabel: source.label
              }))
          )
          .catch(() => [])
      )
    ).then((lists) => {
      let combined = interleave(lists);
      if (partitionItems && window.displayConfig) {
        combined = window.displayConfig.partition(combined);
      }
      if (!combined.length) {
        setFooter('feed unavailable, retrying...');
        return;
      }
      queue = combined;
      queueIndex = 0;
      showCurrent();
    });
  }

  loadQueue();
  setInterval(advance, intervalMs);
  setInterval(loadQueue, refreshMs);
};
