/* Companion Club — authoritative server (Node). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

function readIndex() {
  try { return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); } catch (e) { return ''; }
}

const server = http.createServer((req, res) => {
  // strip query string / fragment and normalize to a safe path under ROOT
  let url;
  try { url = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
  catch (e) { url = '/'; }
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readIndex());
    return;
  }
  // static files under the project root
  const p = path.normalize(path.join(ROOT, url));
  var rel = path.relative(ROOT, p).split(path.sep);
  if (!p.startsWith(ROOT + path.sep) || rel[0] === 'tests' || rel[0] === 'tools' ||
      rel[0] === 'node_modules' || rel.some(function (seg) { return seg.charAt(0) === '.'; })) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('forbidden');
    return;
  }
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
    else if (ext === '.json') type = 'application/json';
    else if (ext === '.svg') type = 'image/svg+xml';
    else if (ext === '.png') type = 'image/png';
    else if (ext === '.ico') type = 'image/x-icon';
    else if (ext === '.opus') type = 'audio/ogg';
    else if (ext === '.webp') type = 'image/webp';
    else if (ext === '.txt' || ext === '.md') type = 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Companion Club server listening on port ' + PORT);
});

export default server;
