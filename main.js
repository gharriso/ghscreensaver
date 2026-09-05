const { app, BrowserWindow, globalShortcut } = require('electron');
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
    'https://science.nasa.gov/wp-json/wp/v2/posts?categories=1170&per_page=1&orderby=date&order=desc&_fields=id,date,link,title,featured_image_url',
  '/api/jwst-latest':
    'https://science.nasa.gov/wp-json/wp/v2/posts?categories=2881&per_page=1&orderby=date&order=desc&_fields=id,date,link,title,featured_image_url'
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

async function createWindow() {
  const server = await startStaticServer();
  const { port } = server.address();

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadURL(`http://127.0.0.1:${port}/index.html`);
  win.on('closed', () => server.close());

  globalShortcut.register('F11', () => {
    win.setFullScreen(!win.isFullScreen());
  });

  globalShortcut.register('Escape', () => {
    if (win.isFullScreen()) win.setFullScreen(false);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
