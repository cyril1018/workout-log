// Minimal static server for tests that need http:// (service worker, update check).
// Mimics GitHub Pages' 10-minute cache, and lets a test simulate a new deploy:
//   POST /__bump   -> index.html now references app.js?v=<v>.b<n>, as if a new version shipped
//   POST /__reset  -> back to the files as they are on disk
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2]) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
let build = 0;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/__bump') { build++; res.writeHead(204); return res.end(); }
  if (req.method === 'POST' && url.pathname === '/__reset') { build = 0; res.writeHead(204); return res.end(); }

  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    if (build && path.basename(file) === 'index.html') {
      data = data.toString().replace(/app\.js\?v=([^"]+)/, `app.js?v=$1.b${build}`);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1');
