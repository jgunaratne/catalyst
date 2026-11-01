/**
 * Thin promise wrappers around Node's http/https for the three shapes of remote read the
 * app performs: XML feeds, JSON APIs and binary downloads.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const { USER_AGENT } = require('../config');

function fetchXmlString(feedUrl) {
  return new Promise((resolve) => {
    try {
      const req = https.get(
        feedUrl,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5500 },
        (res) => {
          let xml = '';
          res.on('data', chunk => {
            if (xml.length < 260000) xml += chunk.toString();
          });
          res.on('end', () => resolve(xml));
        }
      );
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch (e) {
      resolve('');
    }
  });
}

function fetchJsonUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const req = https.get(
        urlStr,
        { headers: { 'User-Agent': USER_AGENT }, timeout: 5500 },
        (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (e) {
      resolve(null);
    }
  });
}

function downloadFile(remoteUrl, destPath) {
  if (String(remoteUrl || '').startsWith('file://')) {
    return new Promise((resolve, reject) => {
      try {
        const srcPath = remoteUrl.replace(/^file:\/\//, '');
        if (srcPath !== destPath) fs.copyFileSync(srcPath, destPath);
        resolve(destPath);
      } catch (err) {
        reject(err);
      }
    });
  }
  return new Promise((resolve, reject) => {
    const client = remoteUrl.startsWith('https') ? https : http;
    client.get(remoteUrl, { headers: { 'User-Agent': 'CatalystVideoBot/1.0 (+https://github.com/jgunaratne/catalyst)' }, timeout: 25000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(() => resolve(destPath)));
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = { fetchXmlString, fetchJsonUrl, downloadFile };
