(function () {
  // science.nasa.gov's "Hubble" and "JWST" categories overlap (a Webb-only
  // story can be tagged under the Hubble category and vice versa), so each
  // source is also filtered by its own title text to avoid mislabeling and
  // duplicate images across the two panels.
  const SOURCES_ALL = [
    { url: '/api/hubble-latest', label: 'HUBBLE', match: /hubble/i },
    { url: '/api/jwst-latest', label: 'JWST', match: /webb|jwst/i }
  ];
  const SOURCES = window.displayConfig
    ? window.displayConfig.partition(SOURCES_ALL)
    : SOURCES_ALL;

  window.startRecentImageRotator({
    sources: SOURCES,
    imgEl: document.getElementById('img-hubble'),
    labelEl: document.getElementById('hubble-label'),
    footerEl: document.getElementById('footer-hubble')
  });
})();
