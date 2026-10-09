const { app, BrowserWindow, globalShortcut, screen, powerMonitor, powerSaveBlocker } = require('electron');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// science.nasa.gov's REST API doesn't send CORS headers, so the renderer
// can't fetch it directly. Proxy the two feeds we need through our own
// same-origin server instead.
const API_PROXY_ROUTES = {
  '/api/hubble-latest':
    'https://science.nasa.gov/wp-json/wp/v2/posts?categories=1170&per_page=10&orderby=date&order=desc&_fields=id,date,link,title,featured_image_url',
  '/api/jwst-latest':
    'https://science.nasa.gov/wp-json/wp/v2/posts?categories=2881&per_page=10&orderby=date&order=desc&_fields=id,date,link,title,featured_image_url'
};

function proxyJson(nasaUrl, res) {
  https.get(nasaUrl, { headers: { 'User-Agent': 'ghscreensaver' } }, (nasaRes) => {
    let body = '';
    nasaRes.on('data', (chunk) => (body += chunk));
    nasaRes.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  }).on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (API_PROXY_ROUTES[req.url]) {
        proxyJson(API_PROXY_ROUTES[req.url], res);
        return;
      }

      const reqPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(__dirname, reqPath === '/' ? '/index.html' : reqPath);
      if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let server;
let windows = [];

// One window per connected display. Each window is told its own index and
// the total display count via query params, so renderer scripts that cycle
// between multiple sources (Hubble/JWST, Earth views, Mars rovers, etc.) can
// partition those sources across displays instead of showing the same one
// everywhere.
function createWindowForDisplay(display, index, total, port) {
  const singleDisplay = total === 1 && !SCREENSAVER_MODE;
  const bounds = singleDisplay
    ? { width: 1600, height: 900 }
    : {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      };

  const win = new BrowserWindow({
    ...bounds,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    // In screensaver mode each window is a borderless sheet covering its
    // whole display (menu bar and dock included) rather than a macOS
    // fullscreen Space, which would animate and steal the desktop.
    ...(SCREENSAVER_MODE && {
      frame: false,
      resizable: false,
      movable: false,
      enableLargerThanScreen: true,
      hasShadow: false
    }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false
    }
  });

  win.setMenuBarVisibility(false);
  if (SCREENSAVER_MODE) {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setBounds(display.bounds);
    win.webContents.on('did-finish-load', () => {
      win.webContents.insertCSS('* { cursor: none !important; }');
    });
  }
  win.loadURL(`http://127.0.0.1:${port}/index.html?d=${index}&n=${total}`);

  windows.push(win);
  win.on('closed', () => {
    windows = windows.filter((w) => w !== win);
  });
}

async function createWindows() {
  if (!server) server = await startStaticServer();
  const { port } = server.address();

  closeWindows();

  const displays = screen.getAllDisplays();
  displays.forEach((display, i) => createWindowForDisplay(display, i, displays.length, port));
}

function closeWindows() {
  windows.forEach((w) => {
    if (!w.isDestroyed()) w.destroy();
  });
  windows = [];
}

// --- Screensaver mode (--screensaver) -----------------------------------
// The app sits in the background with no windows, watches system idle time
// and covers every display once the machine has been idle long enough. Any
// keyboard/mouse input (detected via the OS idle counter resetting, since
// input inside the cross-origin iframes never reaches our page) or the
// configured active time running out closes the windows again.
const SCREENSAVER_MODE = process.argv.includes('--screensaver');
const CONFIG_PATH = process.env.GHSCREENSAVER_CONFIG || path.join(__dirname, 'screensaver.json');
const DEFAULT_CONFIG = {
  idleMinutes: 5, // idle time before the screensaver starts
  activeMinutes: 30 // how long it runs before stopping; 0 = until input
};
// Ignore input this soon after starting, so a bumped mouse or a key still
// being released doesn't immediately dismiss it.
const START_GRACE_SECONDS = 2;

// Re-read on every check so edits take effect without a restart.
function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const num = (v, fallback) => (typeof v === 'number' && v >= 0 ? v : fallback);
    return {
      idleMinutes: num(parsed.idleMinutes, DEFAULT_CONFIG.idleMinutes),
      activeMinutes: num(parsed.activeMinutes, DEFAULT_CONFIG.activeMinutes)
    };
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
}

let saverActive = false;
let saverStartedAt = 0;
let blockerId = null;
// After the active time expires we stay idle; don't restart until the user
// has actually come back (idle counter drops below the threshold again).
let waitingForUser = false;
let lastIdleSeconds = 0;

async function startSaver() {
  saverActive = true;
  saverStartedAt = Date.now();
  blockerId = powerSaveBlocker.start('prevent-display-sleep');
  await createWindows();
}

function stopSaver() {
  saverActive = false;
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) {
    powerSaveBlocker.stop(blockerId);
  }
  blockerId = null;
  closeWindows();
}

function checkIdle() {
  const config = readConfig();
  const idle = powerMonitor.getSystemIdleTime();
  const inputSinceLastCheck = idle < lastIdleSeconds;
  lastIdleSeconds = idle;

  if (saverActive) {
    const activeSeconds = (Date.now() - saverStartedAt) / 1000;
    if (inputSinceLastCheck && activeSeconds > START_GRACE_SECONDS) {
      stopSaver();
    } else if (config.activeMinutes > 0 && activeSeconds >= config.activeMinutes * 60) {
      stopSaver();
      waitingForUser = true;
    }
    return;
  }

  if (idle < config.idleMinutes * 60) {
    waitingForUser = false;
  } else if (!waitingForUser) {
    startSaver();
  }
}

async function runScreensaverMode() {
  if (process.platform === 'darwin') app.dock.hide();
  server = await startStaticServer();
  setInterval(checkIdle, 1000);

  // Re-lay-out windows when a display is connected or disconnected.
  const relayout = () => {
    if (saverActive) createWindows();
  };
  screen.on('display-added', relayout);
  screen.on('display-removed', relayout);
}

function runDashboardMode() {
  createWindows();

  globalShortcut.register('F11', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  globalShortcut.register('Escape', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win && win.isFullScreen()) win.setFullScreen(false);
  });

  // Re-lay-out windows when a display is connected or disconnected.
  screen.on('display-added', createWindows);
  screen.on('display-removed', createWindows);
}

app.whenReady().then(() => {
  if (SCREENSAVER_MODE) runScreensaverMode();
  else runDashboardMode();
});

app.on('window-all-closed', () => {
  // In screensaver mode the app keeps running windowless between sessions.
  if (process.platform !== 'darwin' && !SCREENSAVER_MODE) app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (server) server.close();
});

app.on('activate', () => {
  if (windows.length === 0 && !SCREENSAVER_MODE) createWindows();
});
