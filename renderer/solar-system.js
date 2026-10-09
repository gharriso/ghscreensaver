(function () {
  // On multi-display setups the primary display's orbit-diagram panel is
  // replaced by NASA Eyes on Asteroids instead (asteroids.js); this canvas
  // still runs on secondary displays and in the single-display fallback.
  const cfg = window.displayConfig;
  const isPrimaryMultiDisplay = cfg && cfg.count > 1 && cfg.index === 0;
  if (isPrimaryMultiDisplay) return;

  const canvas = document.getElementById('planets-canvas');
  const ctx = canvas.getContext('2d');

  // Low-precision Keplerian elements (JPL "Approximate Positions of the
  // Planets", valid 1800-2050). a: AU, e: -, I/L/peri/node: degrees.
  // Each is [value at J2000, rate per Julian century].
  const PLANETS = [
    { name: 'MERCURY', color: '#b8b8c0', a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], peri: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081] },
    { name: 'VENUS', color: '#e8c88a', a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], peri: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418] },
    { name: 'EARTH', color: '#33e6ff', a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0.0, 0.0] },
    { name: 'MARS', color: '#ff6a3d', a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], peri: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343] },
    { name: 'JUPITER', color: '#e0b878', a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
    { name: 'SATURN', color: '#e8d9a0', a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] },
    { name: 'URANUS', color: '#9de8e0', a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], peri: [170.95427630, 0.40805281], node: [74.01692503, 0.04240589] },
    { name: 'NEPTUNE', color: '#7a9dff', a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], peri: [44.96476227, -0.32241464], node: [131.78422574, -0.00508664] }
  ];

  // Viewing elevation above the ecliptic plane.
  const TILT = deg2rad(45);

  function deg2rad(d) { return (d * Math.PI) / 180; }
  function normDeg(d) {
    d = d % 360;
    return d < 0 ? d + 360 : d;
  }

  function julianCenturiesNow() {
    const JD = Date.now() / 86400000 + 2440587.5;
    return (JD - 2451545.0) / 36525;
  }

  function trueAnomaly(e, M) {
    let E = M;
    for (let i = 0; i < 8; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    return 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  }

  // Heliocentric ecliptic (x, y, z) in AU from classical orbital elements.
  function eclipticXYZ(a, e, I, node, peri, nu) {
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    const w = deg2rad(peri) - deg2rad(node);
    const cosNode = Math.cos(deg2rad(node));
    const sinNode = Math.sin(deg2rad(node));
    const cosI = Math.cos(deg2rad(I));
    const sinI = Math.sin(deg2rad(I));
    const cosWV = Math.cos(w + nu);
    const sinWV = Math.sin(w + nu);
    return {
      x: r * (cosNode * cosWV - sinNode * sinWV * cosI),
      y: r * (sinNode * cosWV + cosNode * sinWV * cosI),
      z: r * (sinWV * sinI),
      r
    };
  }

  const AU_MIN = 0.3;
  const AU_MAX = 31;
  const logMin = Math.log10(AU_MIN);
  const logMax = Math.log10(AU_MAX);

  function radiusForAU(au, maxPixel) {
    const t = (Math.log10(au) - logMin) / (logMax - logMin);
    return Math.max(0, Math.min(1, t)) * maxPixel;
  }

  // Log-compress the distance but keep the true 3D direction, then apply
  // the viewing tilt and project down to 2D screen space.
  function project(pos, cx, cy, maxPixel) {
    const r3 = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1e-9;
    const rr = radiusForAU(pos.r, maxPixel);
    const ux = (pos.x / r3) * rr;
    const uy = (pos.y / r3) * rr;
    const uz = (pos.z / r3) * rr;

    const y2 = uy * Math.cos(TILT) - uz * Math.sin(TILT);
    return { x: cx + ux, y: cy - y2 };
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxPixel = Math.min(w, h) / 2 - 24;

    ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
    ctx.fillStyle = 'rgba(0, 255, 102, 0.45)';
    ctx.font = '9px monospace';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    [1, 10, 30].forEach((au) => {
      const rr = radiusForAU(au, maxPixel);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * Math.cos(TILT), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(au + ' AU', cx + rr + 3, cy - 3);
    });
    ctx.setLineDash([]);

    const T = julianCenturiesNow();
    const STEPS = 96;

    PLANETS.forEach((p) => {
      const a = p.a[0] + p.a[1] * T;
      const e = p.e[0] + p.e[1] * T;
      const I = p.I[0] + p.I[1] * T;
      const peri = p.peri[0] + p.peri[1] * T;
      const node = p.node[0] + p.node[1] * T;

      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const nu = (i / STEPS) * Math.PI * 2;
        const pos = eclipticXYZ(a, e, I, node, peri, nu);
        const pt = project(pos, cx, cy, maxPixel);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = '#ffdd55';
    ctx.shadowColor = '#ffdd55';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    PLANETS.forEach((p) => {
      const a = p.a[0] + p.a[1] * T;
      const e = p.e[0] + p.e[1] * T;
      const I = p.I[0] + p.I[1] * T;
      const L = p.L[0] + p.L[1] * T;
      const peri = p.peri[0] + p.peri[1] * T;
      const node = p.node[0] + p.node[1] * T;
      const M = deg2rad(normDeg(L - peri));
      const nu = trueAnomaly(e, M);

      const pos = eclipticXYZ(a, e, I, node, peri, nu);
      const pt = project(pos, cx, cy, maxPixel);

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = '9px monospace';
      ctx.fillText(p.name, pt.x + 6, pt.y + 3);
    });
  }

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    draw();
  }

  function setFooter(text) {
    const el = document.getElementById('footer-planets');
    if (el) el.textContent = text;
  }

  function tick() {
    draw();
    setFooter('Heliocentric, log scale, 45° tilt · ' + new Date().toUTCString().slice(17, 25) + ' UTC');
  }

  window.addEventListener('resize', resize);
  setTimeout(resize, 300);

  tick();
  if (window.appLog) window.appLog('SOLAR SYSTEM: orbital positions computed');
  setInterval(tick, 60 * 1000);
})();
