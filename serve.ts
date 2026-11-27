// A tiny static server for app/ (Node 22, standard library only).
// Run `node serve.ts` and open http://localhost:8080 (or --port <n>).
// A convenience for local development — not a server for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const flags = process.argv.slice(2);
const portFlag = flags.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(flags[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(appRoot, normalize(pathname)));
  if (!file.startsWith(appRoot + sep) && file !== appRoot) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let info;
  try {
    info = statSync(file);
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  if (!info.isFile()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'content-length': info.size,
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Ledger is served at http://localhost:${port}`);
});
