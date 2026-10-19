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
  const SUN_FILTERS_ALL = [
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
  // The last display's sun panel plays SDO's 48-hour time-lapse movies
  // instead (see refreshSunVideo); the remaining displays split the stills.
  const cfg = window.displayConfig;
  const sunVideoDisplay = !cfg || cfg.index === cfg.count - 1;
  const stillDisplays = cfg ? Math.max(1, cfg.count - 1) : 1;
  const SUN_FILTERS = cfg
    ? SUN_FILTERS_ALL.filter((_, i) => i % stillDisplays === cfg.index % stillDisplays)
    : SUN_FILTERS_ALL;
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

  // --- Sun video: SDO's latest 48-hour movies (~21 s each, ~8000x speed),
  // switching wavelength every few loops. The movies are regenerated a few
  // times a day, so the URL's cache-buster changes hourly.
  const SUN_VIDEOS = [
    { code: '0171', label: 'SDO / AIA 171Å · CORONAL LOOPS · 48 HR' },
    { code: '0304', label: 'SDO / AIA 304Å · PROMINENCES / ERUPTIONS · 48 HR' },
    { code: '0131', label: 'SDO / AIA 131Å · FLARES · 48 HR' }
  ];
  const SUN_VIDEO_LOOPS = 3;
  let sunVideoIndex = 0;
  let sunVideoLoops = 0;

  function refreshSunVideo() {
    const video = document.getElementById('video-sun');
    const label = document.getElementById('sun-label');
    const movie = SUN_VIDEOS[sunVideoIndex];
    const hour = Math.floor(Date.now() / (60 * 60 * 1000));
    sunVideoLoops = 0;
    video.src =
      'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_' +
      movie.code + '.mp4?_=' + hour;
    video.onloadeddata = () => {
      if (label) label.textContent = movie.label;
      setFooter('footer-sun', 'Last 48 hours, time-lapse · NASA SDO');
      log('SUN VIDEO: ' + movie.label + ' loaded');
    };
    video.onerror = () => {
      setFooter('footer-sun', 'video unavailable, retrying...');
      log('SUN VIDEO: unavailable');
      setTimeout(refreshSunVideo, 60 * 1000);
    };
    video.play().catch(() => {});
  }

  function startSunVideo() {
    const img = document.getElementById('img-sun');
    const video = document.getElementById('video-sun');
    img.style.display = 'none';
    video.style.display = 'block';
    video.onended = () => {
      sunVideoLoops += 1;
      if (sunVideoLoops >= SUN_VIDEO_LOOPS) {
        sunVideoIndex = (sunVideoIndex + 1) % SUN_VIDEOS.length;
        refreshSunVideo();
      } else {
        video.play().catch(() => {});
      }
    };
    refreshSunVideo();
  }

  // --- Earth, cycling between DSCOVR EPIC, GOES-19 GeoColor and moon view -
  const EARTH_VIEWS_ALL = ['epic', 'goes', 'moon'];
  const EARTH_VIEWS = window.displayConfig
    ? window.displayConfig.partition(EARTH_VIEWS_ALL)
    : EARTH_VIEWS_ALL;
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

  // --- Global surface temperature (NASA GIBS: MUR sea surface temp +
  // MODIS Terra 8-day land surface temp, latest available) ---------------
  // The old NASA NEO RenderData servlet now redirects to an HTML page.
  const TEMP_LAYERS = [
    'BlueMarble_ShadedRelief_Bathymetry',
    'GHRSST_L4_MUR_Sea_Surface_Temperature',
    'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
    'Coastlines_15m'
  ];

  function refreshTemp() {
    const url =
      'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi' +
      '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&CRS=EPSG:4326' +
      '&BBOX=-90,-180,90,180&WIDTH=1440&HEIGHT=720&FORMAT=image/jpeg' +
      '&LAYERS=' + TEMP_LAYERS.join(',') + '&_=' + Date.now();
    const img = document.getElementById('img-temp');
    const probe = new Image();
    probe.onload = () => {
      img.src = url;
      markLoaded(img);
      setFooter('footer-temp', 'Sea (MUR daily) + land (MODIS 8-day) surface temp · NASA GIBS');
      log('TEMP: NASA GIBS map loaded');
    };
    probe.onerror = () => {
      setFooter('footer-temp', 'feed unavailable, retrying...');
      log('TEMP: NASA GIBS feed unavailable');
    };
    probe.src = url;
  }

  if (sunVideoDisplay) {
    startSunVideo();
  } else {
    refreshSun();
    setInterval(cycleSunFilter, 20 * 1000);
  }

  // On multi-display setups the primary display shows the NASA Eyes cosmic
  // view instead of the temp map (cosmic.js), and the JWST recent-release
  // panel instead of Earth imagery (jwst-primary.js). Both run everywhere
  // else (secondary displays, and the single-display fallback).
  const isPrimaryMultiDisplay = cfg && cfg.count > 1 && cfg.index === 0;
  if (!isPrimaryMultiDisplay) {
    refreshEarth();
    setInterval(cycleEarthView, 30 * 1000);
    refreshTemp();
    setInterval(refreshTemp, 60 * 60 * 1000);
  }
})();
