/**
 * Turns a headline, URL or wire story into an anchor script. Copy must be specific: real
 * figures, named people and named places drawn from the source article or verified market
 * data, never invented.
 */
const { callFalApi, getNarrationModel } = require('../clients/falClient');
const { fetchArticleTextFromUrl } = require('./newsFeeds');
const { searchGoogleOrWebImage } = require('./imageSourcing');
const { fetchLiveYahooFinanceChartForStory } = require('./marketData');
const { wordBudgetForDuration } = require('../media/audio');

async function synthesizeExplainerWithLLM(inputHeadline, parentContext = null, rssItem = null, targetDuration = 15) {
  const durSec = Number(targetDuration) === 30 ? 30 : 15;
  // Ask for the same window the audio fitter can actually accommodate. Writing under this
  // range is what left silent tails at the end of clips.
  const { minWords, maxWords } = wordBudgetForDuration(durSec);
  const targetWordCount = `${minWords}-${maxWords} words`;
  let enrichedInput = inputHeadline;
  let detectedSourceType = rssItem ? `${rssItem.provider} RSS Story` : (parentContext ? 'Follow-Up Story' : 'Market Story');
  let extractedSourceImageUrl = rssItem?.rssImageUrl || rssItem?.rssThumbUrl || null;

  if (!rssItem && /^https?:\/\//i.test(inputHeadline.trim())) {
    const scraped = await fetchArticleTextFromUrl(inputHeadline.trim());
    detectedSourceType = `Story / ${scraped.domain || 'Article'}`;
    if (!extractedSourceImageUrl) extractedSourceImageUrl = scraped.sourceImageUrl;
    enrichedInput = `URL: ${scraped.url}\nHeadline: ${scraped.title || scraped.slugContext}\nDescription: ${scraped.description}\nExcerpt: ${scraped.bodyExcerpt}`;
  } else if (rssItem) {
    const scraped = rssItem.link ? await fetchArticleTextFromUrl(rssItem.link) : {};
    if (!extractedSourceImageUrl && scraped.sourceImageUrl) {
      extractedSourceImageUrl = scraped.sourceImageUrl;
    }
    enrichedInput = `RSS Source: ${rssItem.feedName}\nHeadline: ${rssItem.title}\nRSS Summary: ${rssItem.description}\nArticle Excerpt: ${scraped.bodyExcerpt || ''}`;
  }

  if (!extractedSourceImageUrl) {
    extractedSourceImageUrl = await searchGoogleOrWebImage(rssItem ? rssItem.title : inputHeadline);
  }

  // Pull the real market series FIRST so the anchor script can quote genuine, current levels
  const realChartData = await fetchLiveYahooFinanceChartForStory(rssItem ? rssItem.title : inputHeadline);
  let marketDataBlock = '';
  try {
    const sA = realChartData?.seriesA || {};
    const sB = realChartData?.seriesB || {};
    const describeSeries = (series) => {
      const values = Array.isArray(series.values) ? series.values : [];
      if (values.length < 2) return null;
      const latest = values[values.length - 1];
      const earliest = values[0];
      const unit = series.unit === '%' ? '%' : (series.unit ? ` ${series.unit}` : '');
      const changePct = earliest ? (((latest - earliest) / earliest) * 100).toFixed(1) : '0.0';
      const direction = latest >= earliest ? 'up' : 'down';
      return `${series.name}: latest ${latest}${unit}, ${direction} ${Math.abs(changePct)} percent over eight weeks (from ${earliest}${unit})`;
    };
    marketDataBlock = [describeSeries(sA), describeSeries(sB)].filter(Boolean).join('\n');
  } catch (e) {
    marketDataBlock = '';
  }

  const systemInstruction = `You are a Broadcast News Anchor at CNBC and NPR Marketplace.
RULES:
- Write narrationScript so it sounds like a clear, conversational, informative news clip designed to inform the listener what happened, why it matters, and how it affects prices, companies, and markets.
- SPECIFICITY IS MANDATORY. Every script must contain, drawn from the source article or the verified market data below:
  1) at least TWO concrete figures (a price, percentage, dollar amount, rate, or volume),
  2) at least ONE named person or named institution (for example a chief executive, a central banker, a regulator, a named agency),
  3) at least ONE named company, market, or place.
- NEVER invent a number, name, price or date. Use ONLY figures and names that appear in the source article text or the verified market data block.
- CHART-TO-VOICEOVER ALIGNMENT RULE: ${marketDataBlock ? 'Because this video displays a live chart of the two series in VERIFIED CURRENT MARKET DATA below, your narrationScript MUST explicitly name both series and quote their exact latest figures so the spoken audio matches the on-screen chart 100%.' : 'No market chart is displayed for this story; quote ONLY the figures that appear in the source article text itself and NEVER invent or cite unrelated index or ETF levels.'}
- Quote every figure at the precision it was given. Say "four point seven four percent" for 4.74, never round it to "5 percent".
- BANNED generic filler: "markets moved", "investors are watching", "uncertainty remains", "experts say", "could impact", "in recent months", "amid concerns". Replace any such phrase with the specific fact behind it.
- Spell out all terms and units in plain spoken English (for example, write "basis points", "percent", "billion dollars", "cloud software", "high bandwidth memory" — NEVER use acronyms or abbreviations like bps, CoWoS, HBM3e, NRR, SG&A, or SaaS in narrationScript).
- Do NOT use emojis anywhere and do NOT use phrases like "Breaking News".
- CRITICAL: Write narrationScript at STRICTLY ${targetWordCount} across 3 sentences so the spoken report fills ${durSec} seconds cleanly without ending early or cutting off.

VERIFIED CURRENT MARKET DATA (real Yahoo Finance closes — MUST be quoted in narrationScript when present):
${marketDataBlock || '(none — do not show a chart or cite external index levels; quote only figures from the source story)'}

Return STRICT JSON matching this structure:
{
  "sourceType": "${detectedSourceType}",
  "categoryBadge": "2 WORD TOPIC",
  "sentiment": "KEY METRIC TAKEAWAY",
  "sentimentScore": 1.4,
  "headlineTitle": "Clear 9-13 word headline with key numbers",
  "executiveThesis": "2 concise sentences explaining what happened and why it matters for the listener.",
  "narrationScript": "STRICTLY ${targetWordCount} conversational, informative news anchor script with zero acronyms that clearly informs the listener.",
  "scenes": [
    {
      "act": "PART 1 / THE STORY",
      "title": "What Happened",
      "overlayType": "CATALYST_CARD",
      "prompt": "Realistic television news B-roll shot in natural daylight (35mm ENG broadcast camera, photojournalism, 4k)."
    },
    {
      "act": "PART 2 / THE DATA",
      "title": "The Key Numbers",
      "overlayType": "LIVE_CHART",
      "prompt": "Realistic documentary B-roll of institutional trading desks or industrial operations in natural light, 4k."
    },
    {
      "act": "PART 3 / IMPACT",
      "title": "Why It Matters",
      "overlayType": "ASSET_SCORECARD",
      "prompt": "Realistic documentary B-roll showing the real-economy sector impact, 35mm ENG broadcast camera, 4k."
    }
  ],
  "captions": [
    { "start": 0.0, "end": ${durSec * 0.33}, "text": "UPPERCASE CAPTION 1 WITH METRICS", "highlight": "KEY METRIC" },
    { "start": ${durSec * 0.33}, "end": ${durSec * 0.66}, "text": "UPPERCASE CAPTION 2 REFERENCING CHART", "highlight": "CHART METRIC" },
    { "start": ${durSec * 0.66}, "end": ${durSec}, "text": "UPPERCASE CAPTION 3 ON MARKET IMPACT", "highlight": "KEY TICKERS" }
  ],
  "followUps": [
    { "id": "fu-1", "question": "Follow-up question on sector impact?", "badge": "Watch Next" },
    { "id": "fu-2", "question": "Follow-up question on rates and pricing?", "badge": "Watch Next" }
  ]
}`;

  const userPrompt = parentContext
    ? `Previous Story: "${parentContext.headlineTitle}"\nFollow-Up Question: "${enrichedInput}"`
    : `Source News Feed Item:\n${enrichedInput}`;

  const llmRes = await callFalApi('fal-ai/any-llm', {
    model: getNarrationModel(),
    system_prompt: systemInstruction,
    prompt: userPrompt
  }, 35000);

  let rawOutput = (llmRes && llmRes.output) ? llmRes.output : '';
  rawOutput = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const firstBrace = rawOutput.indexOf('{');
  const lastBrace = rawOutput.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    rawOutput = rawOutput.slice(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(rawOutput);

  return {
    id: 'live-' + Date.now(),
    inputHeadline: rssItem ? rssItem.title : inputHeadline,
    videoUrl: null,
    audioUrl: null,
    sourceImageUrl: extractedSourceImageUrl || '/images/source-fed-warsh.jpg',
    usedRssSourceImage: true,
    sourceImageCaption: rssItem?.rssImageUrl
      ? `${rssItem.provider} RSS Feed Image`
      : 'Live News Feed Source Photo',
    ttsModelUsed: `ElevenLabs Turbo v2.5 (${durSec}s Post-Video Narration)`,
    videoModelUsed: `Alternating Animated Still Images + Ken Burns Zoom-Ins (${durSec}s)`,
    durationSec: durSec,
    resolution: `1920x1080 (16:9 / ${durSec}.0s)`,
    ...parsed,
    chartData: realChartData || null
  };
}

module.exports = { synthesizeExplainerWithLLM };
