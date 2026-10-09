const { app, BrowserWindow, globalShortcut, screen } = require('electron');
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
  const singleDisplay = total === 1;
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadURL(`http://127.0.0.1:${port}/index.html?d=${index}&n=${total}`);

  windows.push(win);
  win.on('closed', () => {
    windows = windows.filter((w) => w !== win);
  });
}

async function createWindows() {
  if (!server) server = await startStaticServer();
  const { port } = server.address();

  windows.forEach((w) => {
    if (!w.isDestroyed()) w.close();
  });
  windows = [];

  const displays = screen.getAllDisplays();
  displays.forEach((display, i) => createWindowForDisplay(display, i, displays.length, port));
}

app.whenReady().then(() => {
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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (server) server.close();
});

app.on('activate', () => {
  if (windows.length === 0) createWindows();
});
