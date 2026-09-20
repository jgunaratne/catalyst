/**
 * API routes. Each handler validates input, delegates to a service, and formats the response;
 * no business logic lives in this layer.
 *
 * Pre-rendered cache support:
 *   Both the 6 featured stories (`SEED_EXPLAINERS`) and the 12 live RSS playlist stories
 *   (`cache/rss_explainers.json`) are pre-rendered into `cache/videos/` and `cache/images/`,
 *   so every item in the 18-video playlist plays immediately with its own cached MP4, voiceover,
 *   and extracted 16:9 thumbnail.
 */
const fs = require('fs');
const path = require('path');
const { FAL_API_KEY, CACHE_DIR, VIDEO_MODELS, RSS_FEEDS, FAL_ENDPOINTS } = require('../config');
const { sendJson, sendError, readJsonBody, normaliseDuration } = require('./http');
const { SEED_EXPLAINERS, formatSeededForDuration, findSeededExplainer } = require('../services/seededStories');
const { fetchLiveRssFeed } = require('../services/newsFeeds');
const { synthesizeExplainerWithLLM } = require('../services/narration');
const { produceNewsVideo } = require('../services/videoPipeline');

const STARTER_PLAYLIST_IDS = ['fed-warsh', 'fed-followup', 'retail-sales', 'eu-canada', 'wsj-ai', 'ai-followup'];
const RSS_CACHE_FILE = path.join(CACHE_DIR, 'rss_explainers.json');

function loadRssExplainerCache() {
  try {
    if (fs.existsSync(RSS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(RSS_CACHE_FILE, 'utf8'));
    }
  } catch { /* ignore */ }
  return {};
}

/** GET /api/config — client bootstrap: capabilities and the starter playlist. */
function handleConfig(req, res) {
  sendJson(res, 200, {
    falConnected: Boolean(FAL_API_KEY),
    keyPreview: FAL_API_KEY ? `${FAL_API_KEY.slice(0, 8)}...${FAL_API_KEY.slice(-4)}` : 'Not Found',
    models: VIDEO_MODELS,
    ttsModel: FAL_ENDPOINTS.textToSpeech,
    defaultDuration: 15,
    examples: STARTER_PLAYLIST_IDS.map(id => formatSeededForDuration(SEED_EXPLAINERS[id], 15))
  });
}

/** GET /api/rss — aggregated live Wall Street Journal and Bloomberg stories, enriched with pre-rendered cache entries. */
async function handleRss(req, res) {
  try {
    const feedResults = await Promise.all(RSS_FEEDS.map(feed => fetchLiveRssFeed(feed)));
    const rssCache = loadRssExplainerCache();
    const items = feedResults.flat().map((item) => {
      const cached = rssCache[item.title];
      if (cached && cached.explainer && cached.explainer.videoUrl) {
        return {
          ...item,
          rssThumbUrl: cached.thumbUrl || item.rssThumbUrl,
          rssImageUrl: cached.thumbUrl || item.rssImageUrl,
          cachedExplainer: cached.explainer
        };
      }
      return item;
    });
    sendJson(res, 200, { feeds: RSS_FEEDS, items });
  } catch (err) {
    sendError(res, 500, err.message || 'Failed to fetch RSS feeds');
  }
}

/** POST /api/analyze — turn a headline, URL or wire story into a script and storyboard. */
async function handleAnalyze(req, res) {
  try {
    const { input, parentContext, forceLive, preRenderedId, rssItem, targetDuration } = await readJsonBody(req);
    const durationSec = normaliseDuration(targetDuration);

    if (!input && !rssItem) {
      return sendError(res, 400, 'Headline, URL, or RSS story is required.');
    }

    // Check pre-rendered RSS cache first so playlist items #7..#18 play immediately
    if (!forceLive) {
      const rssCache = loadRssExplainerCache();
      const lookupKey = rssItem?.title || input;
      if (lookupKey && rssCache[lookupKey]?.explainer?.videoUrl) {
        return sendJson(res, 200, {
          explainer: rssCache[lookupKey].explainer,
          cached: true
        });
      }
      if (!rssItem) {
        if (preRenderedId && SEED_EXPLAINERS[preRenderedId]) {
          return sendJson(res, 200, {
            explainer: formatSeededForDuration(SEED_EXPLAINERS[preRenderedId], durationSec),
            cached: true
          });
        }
        const seeded = findSeededExplainer(input, durationSec);
        if (seeded) return sendJson(res, 200, { explainer: seeded, cached: true });
      }
    }

    const explainer = await synthesizeExplainerWithLLM(
      input || rssItem?.title, parentContext, rssItem, durationSec
    );
    sendJson(res, 200, { explainer, cached: false });
  } catch (err) {
    console.error('Error in /api/analyze:', err);
    sendError(res, 500, err.message || 'Failed to analyze input');
  }
}

/** POST /api/generate-video — render the clip and lay the voiceover over the finished picture. */
async function handleGenerateVideo(req, res) {
  try {
    const { prompt, scenes, narrationScript, sourceImageUrl, headline, targetDuration } = await readJsonBody(req);
    const result = await produceNewsVideo({
      headline,
      prompt,
      scenes,
      narrationScript,
      sourceImageUrl,
      durationSec: normaliseDuration(targetDuration)
    });
    sendJson(res, 200, result);
  } catch (err) {
    console.error('Error in /api/generate-video:', err);
    sendError(res, 500, err.message || 'Video generation failed');
  }
}

const API_ROUTES = [
  { method: 'GET', path: '/api/config', handler: handleConfig },
  { method: 'GET', path: '/api/rss', handler: handleRss },
  { method: 'POST', path: '/api/analyze', handler: handleAnalyze },
  { method: 'POST', path: '/api/generate-video', handler: handleGenerateVideo }
];

module.exports = { API_ROUTES };
