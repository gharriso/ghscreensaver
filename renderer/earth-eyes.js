(function () {
  // Two displays each running their own full grid means two identical
  // SYSTEM/clock panes. Rather than show that twice, the primary display's
  // system pane is repurposed to show NASA's "Eyes on the Earth" instead;
  // the secondary display keeps the ordinary clock/log pane.
  const cfg = window.displayConfig;
  const isPrimary = cfg && cfg.count > 1 && cfg.index === 0;
  if (!isPrimary) return;

  const statusContent = document.getElementById('status-content');
  const iframe = document.getElementById('iframe-earth-eyes');
  const label = document.getElementById('status-header-label');

  if (statusContent) statusContent.style.display = 'none';
  if (iframe) {
    iframe.style.display = 'block';
    iframe.src = 'https://eyes.nasa.gov/apps/earth/';
  }
  if (label) label.textContent = 'NASA EYES · EARTH';
})();
