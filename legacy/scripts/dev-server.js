const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const adminDashboard = require('../server/admin-dashboard.cjs');

// Zero-dependency static file server with development-only live reload.
// Usage: npm run dev [-- port]
const args = ['--root', path.join(__dirname, '..', 'public'), '--port', process.argv.slice(2).at(-1) ?? '3000'];
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--root', '--port'].includes(args[i]) || args[i + 1] === undefined) throw new Error('Use --root <pasta estatica> --port <porta>');
  options[args[i].slice(2)] = args[i + 1];
}
if (!options.root) throw new Error('--root é obrigatório');
const root = fs.realpathSync(options.root);
if (!fs.statSync(root).isDirectory()) throw new Error('Root deve ser uma pasta');
const port = Number(options.port ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Porta inválida');
const clients = new Set();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8' };
const clientScript = `(()=>{const key='maestri-preview-revision';const connection=new EventSource('/__maestri_preview__/events');connection.addEventListener('revision',event=>{const previous=sessionStorage.getItem(key);sessionStorage.setItem(key,event.data);if(previous!==null&&previous!==event.data)location.reload();});})();`;
let revision = 0;
const insideRoot = candidate => {
  const relative = path.relative(root, candidate);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
};
function reply(res, code, content, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(content);
}
const server = http.createServer(async (req, res) => {
  if (req.url.split('?')[0].replace(/\/$/, '') === '/api/admin-dashboard') return adminDashboard(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) return reply(res, 405, 'Method not allowed');
  let pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0]); }
  catch { return reply(res, 400, 'Invalid URL'); }
  if (pathname === '/__maestri_preview__/client.js') return reply(res, 200, req.method === 'HEAD' ? undefined : clientScript, mime['.js']);
  if (pathname === '/__maestri_preview__/events') {
    if (req.method === 'HEAD') return reply(res, 200, undefined, 'text/event-stream');
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
    res.write(`event: revision\ndata: ${revision}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (pathname.includes('\0') || pathname.includes('\\')) return reply(res, 403, 'Forbidden');
  if (pathname.endsWith('/')) pathname += 'index.html';
  const candidate = path.resolve(root, '.' + pathname);
  if (!insideRoot(candidate)) return reply(res, 403, 'Forbidden');
  try {
    const real = await fs.promises.realpath(candidate);
    if (!insideRoot(real)) return reply(res, 403, 'Forbidden');
    if (!(await fs.promises.stat(real)).isFile()) return reply(res, 404, 'Not found');
    let content = await fs.promises.readFile(real);
    const extension = path.extname(real).toLowerCase();
    if (extension === '.html') {
      const injection = '<script src="/__maestri_preview__/client.js"></script>';
      const html = content.toString('utf8');
      content = Buffer.from(/<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, injection + '</body>') : html + injection);
    }
    reply(res, 200, req.method === 'HEAD' ? undefined : content, mime[extension] ?? 'application/octet-stream');
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return reply(res, 404, 'Not found');
    reply(res, 500, 'Preview read failed');
  }
});
let timer;
const watcher = fs.watch(root, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    revision += 1;
    for (const client of clients) client.write(`event: revision\ndata: ${revision}\n\n`);
  }, 180);
});
const heartbeat = setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n'); }, 15000);
function cleanup() {
  clearTimeout(timer); clearInterval(heartbeat); watcher.close();
  for (const client of clients) client.end();
}
watcher.on('error', error => { console.error(error.message); cleanup(); server.close(); process.exitCode = 1; });
server.on('error', error => { console.error(error.message); cleanup(); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({ event: 'preview-ready', url: `http://127.0.0.1:${server.address().port}`, root, pid: process.pid, liveReload: true }));
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { cleanup(); server.close(); });
