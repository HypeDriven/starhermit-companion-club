/* Companion Club — authoritative server (Node). */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

function readIndex() {
  try { return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); } catch (e) { return ''; }
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url === '/' || url.startsWith('/index')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readIndex());
    return;
  }
  // static files under the project root
  const p = path.join(ROOT, url);
  fs.readFile(p, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    const ext = path.extname(url).toLowerCase();
    let type = 'application/octet-stream';
    if (ext === '.html') type = 'text/html';
    else if (ext === '.js') type = 'text/javascript';
    else if (ext === '.css') type = 'text/css';
    else if (ext === '.opus') type = 'audio/ogg';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Companion Club server listening on port ' + PORT);
});

module.exports = server;
