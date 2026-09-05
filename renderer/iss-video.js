(function () {
  const iframe = document.getElementById('iframe-iss');
  const label = document.getElementById('iss-video-label');

  const STREAMS = [
    { id: 'M3HKLzjvKPc', label: 'ISS HD EARTH VIEWING' },
    { id: 'awQzjn72bI0', label: 'ISS · HARMONY MODULE EXTERNAL CAM' }
  ];
  let streamIndex = 0;

  function loadStream() {
    const stream = STREAMS[streamIndex];
    iframe.src =
      'https://www.youtube.com/embed/' + stream.id +
      '?autoplay=1&mute=1&controls=0' +
      '&origin=' + encodeURIComponent(window.location.origin);
    if (label) label.textContent = stream.label;
    if (window.appLog) window.appLog('ISS VIDEO: switched to ' + stream.label);
  }

  function cycleStream() {
    streamIndex = (streamIndex + 1) % STREAMS.length;
    loadStream();
  }

  loadStream();
  setInterval(cycleStream, 45 * 1000);
})();
