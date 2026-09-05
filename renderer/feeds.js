(function () {
  function log(msg) {
    if (window.appLog) window.appLog(msg);
  }

  function markLoaded(img) {
    img.classList.add('loaded');
  }

  function setFooter(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // --- Sun / SDO AIA, cycling through wavelength filters ---------------
  const SUN_FILTERS = [
    { code: '0171', label: 'SDO / AIA 171Å · CORONA' },
    { code: '0193', label: 'SDO / AIA 193Å · CORONA / FLARE' },
    { code: '0211', label: 'SDO / AIA 211Å · ACTIVE REGIONS' },
    { code: '0304', label: 'SDO / AIA 304Å · CHROMOSPHERE' },
    { code: '0335', label: 'SDO / AIA 335Å · ACTIVE REGIONS' },
    { code: '0094', label: 'SDO / AIA 94Å · FLARING REGIONS' },
    { code: '0131', label: 'SDO / AIA 131Å · FLARING REGIONS' },
    { code: '1600', label: 'SDO / AIA 1600Å · UV TRANSITION' },
    { code: 'HMIIC', label: 'SDO / HMI · VISIBLE LIGHT' },
    { code: 'HMIB', label: 'SDO / HMI · MAGNETOGRAM' }
  ];
  let sunFilterIndex = 0;

  function refreshSun() {
    const img = document.getElementById('img-sun');
    const label = document.getElementById('sun-label');
    const filter = SUN_FILTERS[sunFilterIndex];
    const url =
      'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_' +
      filter.code + '.jpg?_=' + Date.now();
    const probe = new Image();
    probe.onload = () => {
      img.src = url;
      markLoaded(img);
      if (label) label.textContent = filter.label;
      setFooter('footer-sun', 'Updated ' + new Date().toLocaleTimeString());
      log('SUN: ' + filter.label + ' loaded');
    };
    probe.onerror = () => {
      setFooter('footer-sun', 'feed unavailable, retrying...');
      log('SUN: feed unavailable');
    };
    probe.src = url;
  }

  function cycleSunFilter() {
    sunFilterIndex = (sunFilterIndex + 1) % SUN_FILTERS.length;
    refreshSun();
  }

  // --- Earth, cycling between DSCOVR EPIC, GOES-19 GeoColor and moon view -
  const EARTH_VIEWS = ['epic', 'goes', 'moon'];
  let earthViewIndex = 0;

  function refreshEarthEpic() {
    fetch('https://epic.gsfc.nasa.gov/api/natural')
      .then((r) => r.json())
      .then((items) => {
        if (!items || !items.length) throw new Error('no EPIC items');
        const item = items[items.length - 1];
        const [datePart] = item.date.split(' ');
        const [yyyy, mm, dd] = datePart.split('-');
        const url =
          'https://epic.gsfc.nasa.gov/archive/natural/' +
          yyyy + '/' + mm + '/' + dd + '/png/' + item.image + '.png';
        const img = document.getElementById('img-earth');
        const label = document.getElementById('earth-label');
        img.src = url;
        markLoaded(img);
        if (label) label.textContent = 'EARTH / DSCOVR EPIC';
        setFooter('footer-earth', 'Captured ' + item.date + ' UTC');
        log('EARTH: DSCOVR EPIC loaded');
      })
      .catch(() => {
        setFooter('footer-earth', 'feed unavailable, retrying...');
        log('EARTH: EPIC feed unavailable');
      });
  }

  function refreshEarthFromMoon() {
    const img = document.getElementById('img-earth');
    const label = document.getElementById('earth-label');
    const url =
      'https://www.fourmilab.ch/cgi-bin/Earth?img=NASAmMM-l.evif&imgsize=1280' +
      '&dynimg=y&gamma=1.32&opt=-m&date=0&utc=&jd=&_=' + Date.now();
    const probe = new Image();
    probe.onload = () => {
      img.src = url;
      markLoaded(img);
      if (label) label.textContent = 'EARTH / VIEW FROM MOON';
      setFooter('footer-earth', 'Live render · Fourmilab');
      log('EARTH: Fourmilab moon view loaded');
    };
    probe.onerror = () => {
      setFooter('footer-earth', 'feed unavailable, retrying...');
      log('EARTH: moon view feed unavailable');
    };
    probe.src = url;
  }

  function refreshEarthGoes() {
    const img = document.getElementById('img-earth');
    const label = document.getElementById('earth-label');
    const url =
      'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1808x1808.jpg?_=' +
      Date.now();
    const probe = new Image();
    probe.onload = () => {
      img.src = url;
      markLoaded(img);
      if (label) label.textContent = 'EARTH / GOES-19 GEOCOLOR';
      setFooter('footer-earth', 'Full disk · updated ' + new Date().toLocaleTimeString());
      log('EARTH: GOES-19 GeoColor loaded');
    };
    probe.onerror = () => {
      setFooter('footer-earth', 'feed unavailable, retrying...');
      log('EARTH: GOES-19 feed unavailable');
    };
    probe.src = url;
  }

  function refreshEarth() {
    const view = EARTH_VIEWS[earthViewIndex];
    if (view === 'epic') refreshEarthEpic();
    else if (view === 'goes') refreshEarthGoes();
    else refreshEarthFromMoon();
  }

  function cycleEarthView() {
    earthViewIndex = (earthViewIndex + 1) % EARTH_VIEWS.length;
    refreshEarth();
  }

  // --- Global surface temperature (NASA NEO land surface temp, monthly) -
  function refreshTemp() {
    const url =
      'https://neo.gsfc.nasa.gov/servlet/RenderData' +
      '?si=2052072&cs=rgb&format=JPEG&width=1440&height=720&_=' + Date.now();
    const img = document.getElementById('img-temp');
    const probe = new Image();
    probe.onload = () => {
      img.src = url;
      markLoaded(img);
      setFooter('footer-temp', 'Land surface temp (monthly) · NASA NEO');
      log('TEMP: NASA NEO map loaded');
    };
    probe.onerror = () => {
      setFooter('footer-temp', 'feed unavailable, retrying...');
      log('TEMP: NASA NEO feed unavailable');
    };
    probe.src = url;
  }

  refreshSun();
  refreshEarth();
  refreshTemp();

  setInterval(cycleSunFilter, 20 * 1000);
  setInterval(cycleEarthView, 30 * 1000);
  setInterval(refreshTemp, 60 * 60 * 1000);
})();
