(function () {
  const clockEl = document.getElementById('status-clock');

  function pad(n) {
    return n.toString().padStart(2, '0');
  }

  function tickClock() {
    const now = new Date();
    const utc = now.toISOString().slice(11, 19);
    clockEl.textContent =
      pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) +
      '  (UTC ' + utc + ')';
  }

  tickClock();
  setInterval(tickClock, 1000);

  if (window.appLog) window.appLog('SYSTEM: boot complete');
})();
