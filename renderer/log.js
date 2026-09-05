(function () {
  const MAX_LINES = 10;
  const lines = [];

  function render() {
    const el = document.getElementById('status-lines');
    if (el) el.innerHTML = lines.map((l) => '<div>' + l + '</div>').join('');
  }

  window.appLog = function (msg) {
    const time = new Date().toTimeString().slice(0, 8);
    lines.push(time + '  ' + msg);
    if (lines.length > MAX_LINES) lines.shift();
    render();
  };
})();
