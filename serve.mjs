// Static server for dist/ that can hold back chosen responses: node serve.mjs [--port 4173] [--delay <substring>=<ms>]...
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1] || 4173);
const delays = [];
args.forEach((arg, i) => {
  if (arg !== '--delay') return;
  const [substring, ms] = args[i + 1].split('=');
  delays.push({ substring, ms: Number(ms) });
});
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };
const root = join(process.cwd(), 'dist');

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = normalize(join(root, pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  const delay = delays.find((d) => pathname.includes(d.substring));
  const send = () => {
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  };
  if (delay) { console.log(`+${delay.ms}ms ${pathname}`); setTimeout(send, delay.ms); } else send();
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/ delays=${JSON.stringify(delays)}`));
