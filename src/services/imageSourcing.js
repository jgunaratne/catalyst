/**
 * Sources photography that genuinely depicts a story.
 *
 * Relevance is enforced in four stages, because naive keyword search produces absurd matches
 * (a goldfish for a gold story, a kitchen sink for "stocks sink"):
 *   1. wire photos are only accepted on a strong multi-keyword match,
 *   2. a picture-editor model plans literal, photographable subjects,
 *   3. each subject's Wikipedia article is validated against a homonym blocklist,
 *   4. the shortlist gets a final model review before it reaches the video.
 */
const { fetchXmlString, fetchJsonUrl } = require('../clients/httpClient');
const { callFalApi, getNarrationModel } = require('../clients/falClient');
const { LIVE_IMAGE_RSS_FEEDS } = require('../config');

let cachedLiveNewsImagePool = [];
let cachedLivePoolTimestamp = 0;

const IRRELEVANT_TOPIC_PATTERN = /\b(goldfish|fish|aquarium|pet|mammal|animal|species|genus|bird|insect|moth|beetle|butterfly|plant|flower|tree|fungus|mushroom|dinosaur|film|movie|album|song|single|band|musician|singer|rapper|actor|actress|novel|book|manga|anime|video game|tv series|television series|sitcom|footballer|cricketer|basketball player|baseball player|athlete|wrestler|mythology|deity|goddess|saint|comic|cartoon|fictional|character|racehorse|locomotive|given name|surname|disambiguation|municipality|village|commune|rural district|census-designated)\b/i;

const IRRELEVANT_FILENAME_PATTERN = /(1[89]\d\d|19[0-7]\d|historic|abandoned|lccn|nara|police|cartoon|logo|icon|flag_of|coat_of_arms|map_of|diagram|svg|portrait_of_a|fish|animal|bird|flower|butterfly|statue|painting|stamp|coin_of)/i;

function tokenizeSubject(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4);
}

// Ask the picture editor model for literal, photographable subjects for THIS story.
// This is what stops "gold prices" from pulling a goldfish: the model returns
// "gold bullion bars in a vault", "COMEX trading floor", "Federal Reserve building".
async function planVisualSubjectsForStory(storyText, count = 8) {
  const systemInstruction = `You are a broadcast news picture editor choosing archive photography for a financial news video.
Return ONLY a JSON array (no prose, no markdown fences) of exactly ${count} objects:
[{"subject":"...","wikipedia":"..."}]
Rules:
- "subject" must be a LITERAL, physically photographable scene that a viewer would accept as footage of this exact story (buildings, trading floors, factories, ports, products, machinery, named institutions, named people).
- "wikipedia" must be the exact English Wikipedia article title whose lead photograph shows that subject.
- NEVER choose homonyms, metaphors, mascots or wordplay. If the story mentions "gold" the subject is gold bullion or a gold refinery, NEVER a goldfish. If it mentions "Amazon" the subject is an Amazon warehouse, NEVER a rainforest.
- NEVER choose animals, plants, films, albums, songs, athletes, fictional characters, historical photographs before 1990, maps, logos, charts or diagrams.
- All ${count} subjects must be DIFFERENT from each other but all clearly tied to the same story.`;

  try {
    const res = await callFalApi('fal-ai/any-llm', {
      model: getNarrationModel(),
      system_prompt: systemInstruction,
      prompt: `Story: ${String(storyText || '').slice(0, 900)}`
    }, 30000);
    const raw = String(res?.output || '').replace(/```json|```/g, '').trim();
    const startIdx = raw.indexOf('[');
    const endIdx = raw.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) return [];
    const arr = JSON.parse(raw.slice(startIdx, endIdx + 1));
    return (Array.isArray(arr) ? arr : [])
      .filter(x => x && (x.subject || x.wikipedia))
      .map(x => ({ subject: String(x.subject || x.wikipedia), wikipedia: String(x.wikipedia || x.subject) }))
      .slice(0, count);
  } catch (e) {
    console.warn('Visual subject planning unavailable:', e.message);
    return [];
  }
}

// Fetch a Wikipedia lead photo ONLY if the article genuinely depicts the requested subject.
async function fetchValidatedWikipediaPhoto(subject, exactTitle = null) {
  const subjTokens = tokenizeSubject(subject);
  const candidateTitles = [];

  if (exactTitle) candidateTitles.push(exactTitle);
  try {
    const osData = await fetchJsonUrl(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(subject)}&limit=4&format=json`
    );
    for (const t of (Array.isArray(osData?.[1]) ? osData[1] : [])) {
      if (!candidateTitles.includes(t)) candidateTitles.push(t);
    }
  } catch (e) { /* opensearch optional */ }

  for (const title of candidateTitles.slice(0, 5)) {
    const sum = await fetchJsonUrl(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(title).replace(/ /g, '_'))}`
    );
    if (!sum) continue;
    if (sum.type && /disambiguation/i.test(sum.type)) continue;

    const haystack = `${sum.title || ''} ${sum.description || ''} ${String(sum.extract || '').slice(0, 320)}`;
    // Reject the goldfish-for-gold class of mismatch
    if (IRRELEVANT_TOPIC_PATTERN.test(haystack)) continue;

    // Require the article to actually share vocabulary with the requested subject
    const titleTokens = tokenizeSubject(`${sum.title} ${sum.description || ''}`);
    const overlap = subjTokens.filter(t => titleTokens.some(tt => tt.startsWith(t.slice(0, 5))));
    if (subjTokens.length && overlap.length === 0) continue;

    const img = sum.originalimage?.source || sum.thumbnail?.source;
    if (img && img.startsWith('http') && !/\.svg$/i.test(img)) {
      return { url: img, title: sum.title };
    }
  }
  return null;
}

// Wikimedia Commons fallback, with the same relevance gate applied to file titles.
async function searchWikimediaExactPhotos(query, count = 4) {
  const cleanQ = String(query || '').replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3).slice(0, 5).join(' ');
  if (!cleanQ) return [];
  const qTokens = tokenizeSubject(cleanQ);
  const d1 = await fetchJsonUrl(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=12&format=json&srsearch=${encodeURIComponent(cleanQ)}`
  );
  const titles = (d1?.query?.search || [])
    .map(x => x.title)
    .filter(t => t && /\.(jpg|jpeg)$/i.test(t))
    .filter(t => !IRRELEVANT_FILENAME_PATTERN.test(t))
    .filter(t => !IRRELEVANT_TOPIC_PATTERN.test(t.replace(/_/g, ' ')))
    // The file name must mention at least TWO distinct story words, otherwise it is a
    // homonym match rather than this story ("stocks sink" must never match a kitchen sink)
    .filter(t => {
      const ft = tokenizeSubject(t.replace(/_/g, ' '));
      if (/\b(kitchen|sink|bathroom|toilet|bathtub|faucet|sofa|bedroom|garden|toy|costume|cake|recipe)\b/i.test(t.replace(/_/g, ' '))) return false;
      if (!qTokens.length) return true;
      const hits = qTokens.filter(q => ft.some(f => f.startsWith(q.slice(0, 5))));
      return hits.length >= Math.min(2, qTokens.length);
    });
  if (!titles.length) return [];

  const d2 = await fetchJsonUrl(
    `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=1600&format=json&titles=${encodeURIComponent(titles.slice(0, count + 2).join('|'))}`
  );
  const urls = [];
  for (const p of Object.values(d2?.query?.pages || {})) {
    const ii = (p.imageinfo && p.imageinfo[0]) || {};
    const u = ii.thumburl || ii.url;
    if (u && u.startsWith('http')) urls.push(u);
  }
  return urls.slice(0, count);
}


// Collect up to maxCount DISTINCT photographs that are genuinely about THIS story:
// 1) images attached to live news wire stories that strongly match the headline,
// 2) lead photos for LLM-planned literal visual subjects, each relevance-validated,
// 3) relevance-filtered Wikimedia Commons results.
async function searchMultipleRealInternetImages(query, maxCount = 8) {
  const now = Date.now();
  if (cachedLiveNewsImagePool.length < 15 || (now - cachedLivePoolTimestamp) > 300000) {
    const xmlList = await Promise.all(LIVE_IMAGE_RSS_FEEDS.map(u => fetchXmlString(u)));
    const pool = [];
    const seen = new Set();
    for (const xml of xmlList) {
      const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
      for (const b of blocks) {
        const tMatch = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || b.match(/<title>([\s\S]*?)<\/title>/i);
        const dMatch = b.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || b.match(/<description>([\s\S]*?)<\/description>/i);
        const uMatch = b.match(/url=["'](https?:\/\/[^"']+)["']/i);
        if (!uMatch) continue;
        let u = uMatch[1].trim();
        if (u.includes('images.wsj.net')) u = u.replace(/\/medium$/, '/social');
        else if (u.includes('ichef.bbci.co.uk')) u = u.replace('/240/', '/1024/');
        else if (u.includes('static01.nyt.com')) u = u.replace(/-mediumSquareAt3X\.jpg$/i, '-videoSixteenByNineJumbo1600.jpg');
        if (seen.has(u)) continue;
        seen.add(u);
        const text = `${tMatch ? tMatch[1] : ''} ${dMatch ? dMatch[1] : ''} ${u}`.toLowerCase();
        pool.push({ url: u, text });
      }
    }
    if (pool.length > 0) {
      cachedLiveNewsImagePool = pool;
      cachedLivePoolTimestamp = now;
    }
  }

  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'news', 'photo', 'after', 'into', 'over', 'more', 'than', 'why', 'how', 'are', 'was', 'were', 'will', 'new', 'first', 'most', 'since', 'when']);
  const keywords = String(query || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w.toLowerCase()));

  const scored = cachedLiveNewsImagePool.map((item, idx) => {
    let score = 0;
    for (const kw of keywords) {
      if (item.text.includes(kw.toLowerCase())) score += 3;
    }
    return { url: item.url, score, idx };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
  // Only wire photos with several independent keyword hits count as "about this story"
  const strongFeedMatches = scored.filter(s => s.score >= 9).map(s => s.url).slice(0, 3);

  // The relevance gate below rejects aggressively, so plan well beyond the required count.
  // Without this headroom a strict review leaves too few photos and cuts start repeating.
  const OVERSAMPLE = 8;
  const plannedSubjects = await planVisualSubjectsForStory(query, maxCount + OVERSAMPLE);
  const plannedResults = await Promise.all(
    plannedSubjects.map(s => fetchValidatedWikipediaPhoto(s.subject, s.wikipedia).catch(() => null))
  );
  const plannedUrls = plannedResults.filter(Boolean).map(r => r.url);

  const candidateLimit = maxCount + OVERSAMPLE;
  const combined = [];
  for (const u of [...strongFeedMatches, ...plannedUrls]) {
    if (u && !combined.includes(u)) combined.push(u);
    if (combined.length >= candidateLimit) break;
  }

  // Top up from Commons only if the validated planners did not yield enough distinct photos
  if (combined.length < candidateLimit) {
    const wikiMatches = await searchWikimediaExactPhotos(query, candidateLimit - combined.length);
    for (const u of wikiMatches) {
      if (u && !combined.includes(u)) combined.push(u);
      if (combined.length >= candidateLimit) break;
    }
  }

  // FINAL GATE: have the picture editor look at the actual file names of the shortlisted
  // photos and discard anything a viewer would not accept as footage for this story.
  let vetted = (await rejectIrrelevantImagesWithLLM(query, combined)).slice(0, maxCount);

  // A strict review can leave fewer photos than there are cuts, which would force the clip to
  // reuse a picture. Run one more sourcing pass for additional on-topic sector imagery.
  const MIN_DISTINCT_PHOTOS = 6;
  if (vetted.length < MIN_DISTINCT_PHOTOS) {
    const extraSubjects = await planVisualSubjectsForStory(
      `${query}\n(Additional angles: the industry, institutions, workplaces, infrastructure and ` +
      `products behind this story. Different subjects from any already chosen.)`,
      MIN_DISTINCT_PHOTOS + 6
    );
    const extraResults = await Promise.all(
      extraSubjects.map(s => fetchValidatedWikipediaPhoto(s.subject, s.wikipedia).catch(() => null))
    );
    const extraUrls = extraResults
      .filter(Boolean)
      .map(r => r.url)
      .filter(u => !vetted.includes(u) && !combined.includes(u));

    if (extraUrls.length) {
      const extraVetted = await rejectIrrelevantImagesWithLLM(query, extraUrls);
      for (const u of extraVetted) {
        if (!vetted.includes(u)) vetted.push(u);
        if (vetted.length >= maxCount) break;
      }
    }
  }

  console.log(`Image sourcing: ${strongFeedMatches.length} wire, ${plannedUrls.length} subject photos, ${vetted.length} distinct photos cleared review for "${String(query).slice(0, 60)}"`);
  if (vetted.length < 4) {
    console.warn(`Only ${vetted.length} relevant photos found; cuts may reuse a picture.`);
  }
  return vetted;
}

function describeImageUrl(u) {
  try {
    const name = decodeURIComponent(String(u).split('?')[0].split('/').pop() || '');
    return name.replace(/\.(jpe?g|png|webp)$/i, '').replace(/[_-]+/g, ' ').replace(/\b\d{2,4}px\b/gi, '').trim();
  } catch (e) {
    return String(u).slice(-60);
  }
}

async function rejectIrrelevantImagesWithLLM(query, urls) {
  if (!urls || urls.length < 2) return urls || [];
  const listing = urls.map((u, i) => `${i}: ${describeImageUrl(u)}`).join('\n');
  try {
    const res = await callFalApi('fal-ai/any-llm', {
      model: getNarrationModel(),
      system_prompt: `You are a broadcast news picture editor doing a final relevance check.
You are given a news story and a numbered list of archive photograph file names.
Return ONLY a JSON array of the numbers whose photograph a viewer would accept as legitimate footage for THAT story.
Reject homonyms and coincidences (a goldfish for a gold story, a kitchen sink for "stocks sink"), unrelated social or ceremonial photographs, unrelated people, animals, plants, artwork, maps, logos and charts.
Keep buildings, trading floors, factories, ports, products, machinery, named institutions and named people that genuinely relate to the story.
Example output: [0,1,3]`,
      prompt: `Story: ${String(query).slice(0, 300)}\n\nPhotographs:\n${listing}`
    }, 20000);
    const raw = String(res?.output || '');
    const m = raw.match(/\[[\d,\s]*\]/);
    if (!m) return urls;
    const keep = JSON.parse(m[0]);
    const filtered = urls.filter((_, i) => keep.includes(i));
    // Never starve the video of footage: if the gate rejects nearly everything, keep the top picks
    return filtered.length >= 2 ? filtered : urls.slice(0, Math.max(2, filtered.length));
  } catch (e) {
    return urls;
  }
}

async function searchGoogleOrWebImage(query) {
  const list = await searchMultipleRealInternetImages(query, 1);
  return list[0] || null;
}

module.exports = {
  searchMultipleRealInternetImages,
  searchGoogleOrWebImage,
  planVisualSubjectsForStory,
  fetchValidatedWikipediaPhoto,
  rejectIrrelevantImagesWithLLM
};
