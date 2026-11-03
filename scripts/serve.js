import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.csv': 'text/csv' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    const relative = target.slice(root.length).replaceAll('\\', '/');
    if (!target.startsWith(root.endsWith(sep) ? root : root + sep) || !(relative === 'index.html' || relative === 'styles.css' || relative === 'sample.csv' || /^src\/[\w-]+\.js$/.test(relative))) { res.writeHead(404); res.end('Not found'); return; }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': `${mime[extname(target)]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => console.log(`PocketLedger: http://127.0.0.1:${server.address().port}`));
