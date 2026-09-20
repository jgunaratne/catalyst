/**
 * Live Wall Street Journal and Bloomberg RSS ingestion, plus article body extraction and
 * fast real-photo thumbnail resolution for wire items whose RSS XML omits `<media:content>`.
 */
const https = require('https');
const http = require('http');
const { WATERMARK_DOMAINS } = require('../config');
const { fetchJsonUrl } = require('../clients/httpClient');

const rssThumbCache = new Map();

/**
 * Curated topic-to-Wikipedia-article mapping so financial headlines without RSS `<media:content>`
 * tags immediately resolve to a real, story-specific photograph (never a generic chart SVG).
 */
const TOPIC_WIKI_ARTICLES = [
  { pattern: /\b(gold|bullion|comex gold)\b/i, wiki: 'Gold_bar' },
  { pattern: /\b(silver|precious metal)\b/i, wiki: 'Silver' },
  { pattern: /\b(coffee|arabica|cocoa)\b/i, wiki: 'Coffee_bean' },
  { pattern: /\b(swiss franc|japanese yen|forex|currency)\b/i, wiki: 'Swiss_National_Bank' },
  { pattern: /\b(natural gas|lng)\b/i, wiki: 'Liquefied_natural_gas' },
  { pattern: /\b(ai titans|nvidia|semiconductor|chip|tsmc|wafer)\b/i, wiki: 'Nvidia' },
  { pattern: /\b(deepseek|ai rout|artificial intelligence|llm|openai)\b/i, wiki: 'Data_center' },
  { pattern: /\b(amazon|aws|quebec)\b/i, wiki: 'Amazon_(company)' },
  { pattern: /\b(target|retail|walmart|consumer|store)\b/i, wiki: 'Target_Corporation' },
  { pattern: /\b(canada post|ottawa|canada)\b/i, wiki: 'Parliament_Hill' },
  { pattern: /\b(bank|wall street|morgan stanley|jpmorgan|financial services|loans|debt)\b/i, wiki: 'New_York_Stock_Exchange' },
  { pattern: /\b(fed|fomc|powell|warsh|treasury|rate|yield|mortgage)\b/i, wiki: 'Eccles_Building' },
  { pattern: /\b(auto|transport|vehicle|ev|tesla|airline|shipping)\b/i, wiki: 'Container_ship' },
  { pattern: /\b(energy|oil|crude|gas|utilities|power|grid)\b/i, wiki: 'Oil_refinery' },
  { pattern: /\b(materials|mining|copper|steel|aluminum|commodity)\b/i, wiki: 'Open-pit_mining' },
  { pattern: /\b(europe|eu|brussels|ecb)\b/i, wiki: 'European_Central_Bank' },
  { pattern: /\b(china|beijing|shanghai|tariff)\b/i, wiki: 'Shanghai' }
];

const FALLBACK_POOL_WIKIS = [
  'New_York_Stock_Exchange',
  'Wall_Street',
  'Nasdaq_MarketSite',
  'Chicago_Board_of_Trade_Building',
  'Eccles_Building',
  ' Canary_Wharf',
  'Frankfurt_Stock_Exchange',
  'Tokyo_Stock_Exchange'
];

async function fetchWikiThumbUrl(wikiTitle) {
  const clean = String(wikiTitle || '').trim().replace(/\s+/g, '_');
  if (!clean) return null;
  if (rssThumbCache.has(clean)) return rssThumbCache.get(clean);
  try {
    const summary = await fetchJsonUrl(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`
    );
    const rawImg = summary?.thumbnail?.source || summary?.originalimage?.source || null;
    const img = rawImg ? rawImg.split('?')[0] : null;
    if (img && /\.(jpg|jpeg|png)$/i.test(img)) {
      rssThumbCache.set(clean, img);
      return img;
    }
  } catch { /* ignore */ }
  return null;
}

async function resolveRealPhotoForHeadline(title, index = 0) {
  const key = `headline:${title}`;
  if (rssThumbCache.has(key)) return rssThumbCache.get(key);

  for (const rule of TOPIC_WIKI_ARTICLES) {
    if (rule.pattern.test(title)) {
      const url = await fetchWikiThumbUrl(rule.wiki);
      if (url) {
        rssThumbCache.set(key, url);
        return url;
      }
    }
  }

  // Distinct fallback per index so adjacent stories never share a thumbnail
  const fallbackWiki = FALLBACK_POOL_WIKIS[index % FALLBACK_POOL_WIKIS.length].trim();
  const fallbackUrl = await fetchWikiThumbUrl(fallbackWiki);
  if (fallbackUrl) {
    rssThumbCache.set(key, fallbackUrl);
    return fallbackUrl;
  }
  return '/images/source-fed-warsh.jpg';
}

function fetchLiveRssFeed(feedObj) {
  return new Promise((resolve) => {
    try {
      const req = https.get(
        feedObj.url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          },
          timeout: 6000
        },
        (res) => {
          let xml = '';
          res.on('data', chunk => {
            if (xml.length < 250000) xml += chunk.toString();
          });
          res.on('end', async () => {
            try {
              const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
              const parsedItems = [];
              for (const block of itemBlocks.slice(0, 8)) {
                const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || block.match(/<title>([\s\S]*?)<\/title>/i);
                const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || block.match(/<description>([\s\S]*?)<\/description>/i);
                const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
                const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
                const mediaMatch = block.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
                                   block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
                                   block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
                const creditMatch = block.match(/<media:credit[^>]*>([\s\S]*?)<\/media:credit>/i);

                const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim() : '';
                const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : '';
                const link = linkMatch ? linkMatch[1].trim() : '';
                let rawImgUrl = mediaMatch ? mediaMatch[1].trim() : null;
                let highResImgUrl = rawImgUrl ? rawImgUrl.replace(/\/medium$/, '/social') : null;
                let imageSourceLabel = highResImgUrl ? `${feedObj.provider} RSS Image` : 'Wikimedia Photograph';

                if (!highResImgUrl && title) {
                  highResImgUrl = await resolveRealPhotoForHeadline(title, parsedItems.length);
                  rawImgUrl = highResImgUrl;
                }

                if (title) {
                  parsedItems.push({
                    id: `${feedObj.id}-${parsedItems.length}`,
                    provider: feedObj.provider,
                    feedName: feedObj.name,
                    title,
                    description,
                    link,
                    pubDate: dateMatch ? dateMatch[1].trim().slice(0, 22) : '',
                    rssImageUrl: highResImgUrl,
                    rssThumbUrl: rawImgUrl || highResImgUrl,
                    imageSourceLabel,
                    mediaCredit: creditMatch ? creditMatch[1].trim() : imageSourceLabel
                  });
                }
              }
              resolve(parsedItems);
            } catch (err) {
              console.error(`RSS parse failed for ${feedObj.name}: ${err.message}`);
              resolve([]);
            }
          });
        }
      );
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    } catch (e) {
      resolve([]);
    }
  });
}

function fetchArticleTextFromUrl(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          },
          timeout: 5000
        },
        (res) => {
          let html = '';
          res.on('data', (chunk) => {
            if (html.length < 150000) html += chunk.toString();
          });
          res.on('end', () => {
            const ogImgMatch =
              html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
              html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
            let ogImageUrl = ogImgMatch ? ogImgMatch[1].trim() : null;
            if (ogImageUrl && WATERMARK_DOMAINS.some(d => ogImageUrl.toLowerCase().includes(d))) {
              ogImageUrl = null;
            }
            if (ogImageUrl && ogImageUrl.toLowerCase().includes('logo')) {
              ogImageUrl = null;
            }

            const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
              .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
              .filter(p => p.length > 55 && !p.includes('Copyright') && !p.includes('All Rights Reserved'));

            resolve({
              bodyText: paragraphs.slice(0, 8).join(' ').slice(0, 1800),
              ogImageUrl
            });
          });
        }
      );
      req.on('error', () => resolve({ bodyText: '', ogImageUrl: null }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ bodyText: '', ogImageUrl: null });
      });
    } catch (e) {
      resolve({ bodyText: '', ogImageUrl: null });
    }
  });
}

module.exports = { fetchLiveRssFeed, fetchArticleTextFromUrl };
