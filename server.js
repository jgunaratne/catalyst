/**
 * Catalyst — application entry point.
 *
 * Wires the HTTP server to the API route table and the static file server. All behaviour
 * lives in src/: clients/ (outbound IO), services/ (business logic), media/ (ffmpeg work),
 * routes/ (transport), data/ (bundled content), config.js (settings).
 */
const http = require('http');
const { URL } = require('url');

const { PORT } = require('./src/config');
const { resolveLatestGeminiFlashModel } = require('./src/clients/falClient');
const { API_ROUTES } = require('./src/routes/api');
const { serveStaticFile } = require('./src/routes/staticFiles');

function applyCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const route = API_ROUTES.find(r => r.path === pathname && r.method === req.method);
  if (route) {
    await route.handler(req, res);
    return;
  }

  serveStaticFile(req, res, pathname);
});

// Detect the newest available narration model at boot rather than on the first request
resolveLatestGeminiFlashModel();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Catalyst running at http://localhost:${PORT}`);
});
