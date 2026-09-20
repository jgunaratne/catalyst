/**
 * Typed wrappers around the server API. Every network call the client makes goes through here.
 *
 * Includes safe text-before-JSON parsing and automatic retry on transient proxy errors (such as
 * when the development proxy briefly returns a plain-text 502/504 "The backend server..." page
 * during a long render or server restart), preventing raw JSON.parse SyntaxErrors from reaching
 * the UI.
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function requestJson(url, options = {}, retries = 2) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const rawText = await res.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        // Non-JSON response (e.g. Cloudtop proxy timeout / "The backend..." HTML/text page)
        if (attempt < retries) {
          await sleep(1400 * (attempt + 1));
          continue;
        }
        throw new Error(`Server temporarily busy (${res.status}). Click Regenerate to retry.`);
      }
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries && /busy|fetch|network|failed/i.test(String(err.message))) {
        await sleep(1400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function postJson(url, body) {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** Client bootstrap: capabilities and the starter playlist. */
export const fetchConfig = () => requestJson('/api/config');

/** Live Wall Street Journal and Bloomberg stories. */
export const fetchRssStories = () => requestJson('/api/rss');

/** Turn a headline, URL or wire story into a script and storyboard. */
export const analyzeStory = (payload) => postJson('/api/analyze', payload);

/** Render a clip and lay the voiceover over the finished picture. */
export const generateVideo = (payload) => postJson('/api/generate-video', payload);
