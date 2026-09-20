/**
 * Static file serving for the single page app and cached media (`/cache/videos`, `/cache/audio`,
 * `/cache/images`), with HTTP range support so the browser can seek within video and audio.
 */
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, CACHE_DIR } = require('../config');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const RANGE_SERVED_EXTENSIONS = new Set(['.mp4', '.mp3']);

function resolveAssetPath(pathname) {
  if (pathname === '/') return path.join(PUBLIC_DIR, 'index.html');
  if (pathname.startsWith('/cache/')) {
    const candidate = path.join(CACHE_DIR, pathname.replace(/^\/cache\//, ''));
    if (candidate.startsWith(CACHE_DIR) && fs.existsSync(candidate)) return candidate;
  }
  if (/^\/(videos|audio|images)\//.test(pathname)) {
    const cacheCandidate = path.join(CACHE_DIR, pathname);
    if (cacheCandidate.startsWith(CACHE_DIR) && fs.existsSync(cacheCandidate)) {
      return cacheCandidate;
    }
  }
  const publicCandidate = path.join(PUBLIC_DIR, pathname);
  if (publicCandidate.startsWith(PUBLIC_DIR) && fs.existsSync(publicCandidate)) {
    return publicCandidate;
  }
  return null;
}

function serveStaticFile(req, res, pathname) {
  const filePath = resolveAssetPath(pathname);
  if (!filePath || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  if (RANGE_SERVED_EXTENSIONS.has(ext) && req.headers.range) {
    const [rawStart, rawEnd] = req.headers.range.replace(/bytes=/, '').split('-');
    const start = parseInt(rawStart, 10);
    const end = rawEnd ? parseInt(rawEnd, 10) : stat.size - 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': (end - start) + 1,
      'Content-Type': contentType
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(filePath).pipe(res);
}

module.exports = { serveStaticFile };
