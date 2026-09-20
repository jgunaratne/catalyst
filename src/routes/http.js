/**
 * HTTP request helpers shared by every route: JSON responses and request body collection.
 */
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        resolve({});
      }
    });
  });
}

/** Clip length is offered as 15s (default) or 30s; anything else is coerced. */
function normaliseDuration(value) {
  return Number(value) === 30 ? 30 : 15;
}

module.exports = { sendJson, sendError, readJsonBody, normaliseDuration };
