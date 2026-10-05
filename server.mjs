// Production server for the built SENTINEL frontend.
//
// `vite build` emits a self-contained web-standard handler at
// dist/server/server.js that exports `{ fetch }`. This wraps it in a real
// HTTP listener and serves the static client assets from dist/client.
//
// It also proxies /api to the backend. The Vite dev server does this from
// vite.config.ts, but that config does not apply in production, so without
// this the SPA would call /api on its own origin and get a 404.
//
// Run via the `npm start` script.

import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const CLIENT_DIR = join(ROOT, 'dist', 'client');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

// Where the API lives. In Docker this is the compose service name; locally it
// is the dev backend. Set API_PROXY_TARGET to override.
const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:8010';
const API_PREFIX = '/api';

const MIME = {
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
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// The build output is ESM and may be plain JS or a bundled server.
// pathToFileURL is required on Windows: a bare "C:\..." path is rejected by
// the ESM loader, which only accepts file/data/node schemes.
const serverModule = await import(
  pathToFileURL(join(ROOT, 'dist', 'server', 'server.js')).href
);
const handler = serverModule.default ?? serverModule;

function toWebRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else headers.set(k, v);
  }
  const method = req.method || 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(url, {
    method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    // Hop-by-hop headers must not be forwarded.
    if (key === 'transfer-encoding' || key === 'connection') return;
    res.setHeader(key, value);
  });
  if (!response.body) {
    res.end();
    return;
  }
  const buf = Buffer.from(await response.arrayBuffer());
  res.setHeader('content-length', buf.length);
  res.end(buf);
}

/** Serve a file from dist/client, or null when it is not a real asset. */
async function tryStatic(pathname) {
  // Prevent path traversal before touching the filesystem.
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(CLIENT_DIR, safe);
  if (!filePath.startsWith(CLIENT_DIR)) return null;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    const body = await readFile(filePath);
    const immutable = pathname.startsWith('/assets/');
    return {
      body,
      headers: {
        'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
        // Hashed asset names are safe to cache hard; everything else is not.
        'cache-control': immutable
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate',
      },
    };
  } catch {
    return null;
  }
}

/** Stream a request to the backend, preserving method, headers and body. */
function proxyToApi(req, res, pathname, search) {
  const target = new URL(API_TARGET);
  const options = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || 80,
    method: req.method,
    path: pathname + search,
    headers: { ...req.headers, host: target.host },
  };

  const upstream = httpRequest(options, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });

  upstream.on('error', (err) => {
    console.error('[proxy] %s %s failed: %s', req.method, pathname, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
    }
    res.end(JSON.stringify({ detail: 'API unreachable' }));
  });

  req.pipe(upstream);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Health probe for Docker / load balancers.
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // API traffic goes to the backend, mirroring the dev proxy.
    if (url.pathname === API_PREFIX || url.pathname.startsWith(API_PREFIX + '/')) {
      proxyToApi(req, res, url.pathname, url.search);
      return;
    }

    const asset = await tryStatic(decodeURIComponent(url.pathname));
    if (asset) {
      res.writeHead(200, asset.headers);
      res.end(asset.body);
      return;
    }

    // Everything else is handled by the SSR app (routes, redirects, 404s).
    const response = await handler.fetch(toWebRequest(req), {}, {});
    await sendWebResponse(res, response);
  } catch (err) {
    console.error('[server] request failed:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SENTINEL frontend listening on http://${HOST}:${PORT}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
    // Don't hang forever on lingering keep-alive sockets.
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
