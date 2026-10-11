(function () {
  // science.nasa.gov's "Hubble" and "JWST" categories overlap (a Webb-only
  // story can be tagged under the Hubble category and vice versa), so each
  // source is also filtered by its own title text to avoid mislabeling and
  // duplicate images across the two panels.
  const SOURCES_ALL = [
    { url: '/api/hubble-latest', label: 'HUBBLE', match: /hubble/i },
    { url: '/api/jwst-latest', label: 'JWST', match: /webb|jwst/i }
  ];
  // On multi-display setups the primary display already has a dedicated
  // JWST panel (jwst-primary.js), so this panel shows Hubble only on every
  // display, with each display taking a disjoint subset of the posts.
  const cfg = window.displayConfig;
  const multiDisplay = cfg && cfg.count > 1;

  window.startRecentImageRotator({
    sources: multiDisplay ? [SOURCES_ALL[0]] : SOURCES_ALL,
    partitionItems: multiDisplay,
    imgEl: document.getElementById('img-hubble'),
    labelEl: document.getElementById('hubble-label'),
    footerEl: document.getElementById('footer-hubble')
  });
})();
