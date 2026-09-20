/**
 * Adapts the bundled reference stories to the requested clip length and resolves a free-text
 * query to one of them.
 */
const { SEED_EXPLAINERS } = require('../data/seedExplainers');
const { REAL_YF_CHARTS } = require('./marketData');

/**
 * Bumped whenever the bundled clips are regenerated so browsers do not serve a stale copy
 * from cache. Increment this after running scripts/rebuildSeedVideos.js.
 */
const MEDIA_REVISION = 18;

const ALIGNED_SEED_COPY = {
  'fed-warsh': {
    narrationScript:
      'In his inaugural FOMC decision as Federal Reserve Chair, Kevin Warsh raised the federal funds target rate by 25 basis points to 4.75 percent. The hawkish move pushed the ten-year Treasury yield to 5.00 percent.',
    captions: [
      { start: 0.0, end: 10.0, text: 'WARSH HIKES FEDERAL FUNDS TARGET RATE +25 BPS TO 4.75%', highlight: '4.75%' },
      { start: 10.0, end: 20.0, text: '10Y US TREASURY YIELD CLIMBS TO 5.00%', highlight: '5.00%' },
      { start: 20.0, end: 30.0, text: 'FED FUNDS TARGET RATE 4.75% | 10Y TREASURY YIELD 5.00%', highlight: '4.75%' }
    ]
  },
  'fed-followup': {
    narrationScript:
      'The Federal Reserve rate hike widened thirty-year mortgage spreads to 260 basis points as bond desks repriced convexity risk. Meanwhile, the iShares Agency Mortgage-Backed Securities ETF settled at 91.29 dollars.',
    captions: [
      { start: 0.0, end: 10.0, text: '30-YEAR MORTGAGE SPREAD WIDENS TO 260 BASIS POINTS', highlight: '260 BASIS POINTS' },
      { start: 10.0, end: 20.0, text: 'ISHARES AGENCY MBS ETF (MBB) SETTLES AT $91.29', highlight: '$91.29' },
      { start: 20.0, end: 30.0, text: '30Y MORTGAGE SPREAD 260 BPS | AGENCY MBS ETF $91.29', highlight: '260 BPS' }
    ]
  },
  'retail-sales': {
    narrationScript:
      'Census Bureau Advance Retail Sales rose 0.9 percent month-over-month as RBOB gasoline futures settled at 3.26 dollars per gallon. Stripping out fuel volatility, the S and P Retail ETF closed at 82.03 dollars.',
    captions: [
      { start: 0.0, end: 10.0, text: 'CENSUS RETAIL SALES +0.9% AS GASOLINE SETTLES AT $3.26/GAL', highlight: '$3.26/GAL' },
      { start: 10.0, end: 20.0, text: 'SPDR S&P RETAIL ETF (XRT) CLOSES AT $82.03', highlight: '$82.03' },
      { start: 20.0, end: 30.0, text: 'S&P RETAIL ETF $82.03 | RBOB GASOLINE FUTURES $3.26', highlight: '$82.03' }
    ]
  },
  'eu-canada': {
    narrationScript:
      'Brussels floated an Associate EU Membership framework for Canada to secure critical-minerals supply chains. The iShares MSCI Canada ETF trades at 60.22 dollars while the Global Metals and Mining ETF sits at 61.80 dollars.',
    captions: [
      { start: 0.0, end: 10.0, text: 'BRUSSELS FLOATS EU ASSOCIATE CRITICAL-MINERALS PACT FOR CANADA', highlight: 'CANADA' },
      { start: 10.0, end: 20.0, text: 'ISHARES MSCI CANADA ETF (EWC) TRADES AT $60.22', highlight: '$60.22' },
      { start: 20.0, end: 30.0, text: 'GLOBAL METALS & MINING ETF (PICK) AT $61.80', highlight: '$61.80' }
    ]
  },
  'wsj-ai': {
    narrationScript:
      'The Wall Street Journal CIO survey shows Fortune 500 companies tripling artificial intelligence spending to 24.0 percent of IT budgets. That spending shift drove the iShares Expanded Tech-Software ETF to 104.35 dollars.',
    captions: [
      { start: 0.0, end: 10.0, text: 'FORTUNE 500 AI SPEND TRIPLES TO 24.0% OF IT BUDGETS', highlight: '24.0%' },
      { start: 10.0, end: 20.0, text: 'EXPANDED TECH-SOFTWARE ETF (IGV) AT $104.35', highlight: '$104.35' },
      { start: 20.0, end: 30.0, text: 'ENTERPRISE AI SHARE 24.0% | TECH-SOFTWARE ETF $104.35', highlight: '24.0%' }
    ]
  },
  'ai-followup': {
    narrationScript:
      'Continuous agentic reasoning is locking up Taiwan Semiconductor advanced packaging capacity through 2027. TSMC shares trade at 434.67 dollars alongside Broadcom custom AI silicon at 357.61 dollars.',
    captions: [
      { start: 0.0, end: 10.0, text: 'AGENTIC REASONING LOCKS UP TSMC ADVANCED PACKAGING', highlight: 'TSMC' },
      { start: 10.0, end: 20.0, text: 'TSMC ADVANCED PACKAGING (TSM) TRADES AT $434.67', highlight: '$434.67' },
      { start: 20.0, end: 30.0, text: 'BROADCOM CUSTOM AI SILICON (AVGO) AT $357.61', highlight: '$357.61' }
    ]
  }
};

function formatSeededForDuration(item, targetDuration = 15) {
  const dur = Number(targetDuration) === 30 ? 30 : 15;
  const sid = item.id;
  const scale = dur / 30.0;
  const v = `?v=${MEDIA_REVISION}`;
  const aligned = ALIGNED_SEED_COPY[sid] || {};
  const baseCaptions = aligned.captions || item.captions || [];
  return {
    ...item,
    ...aligned,
    chartData: REAL_YF_CHARTS[sid] || item.chartData,
    durationSec: dur,
    sourceImageUrl: `/cache/images/thumb-${sid}.jpg${v}`,
    videoUrl15: `/cache/videos/${sid}-15s.mp4${v}`,
    videoUrl30: `/cache/videos/${sid}-30s.mp4${v}`,
    audioUrl15: `/cache/audio/${sid}-15s.mp3${v}`,
    audioUrl30: `/cache/audio/${sid}-30s.mp3${v}`,
    videoUrl: `/cache/videos/${sid}-${dur}s.mp4${v}`,
    audioUrl: `/cache/audio/${sid}-${dur}s.mp3${v}`,
    captions: baseCaptions.map(c => ({
      ...c,
      start: Number((c.start * scale).toFixed(2)),
      end: Number((c.end * scale).toFixed(2))
    }))
  };
}

function findSeededExplainer(rawInput, targetDuration = 15) {
  if (!rawInput) return null;
  const normalized = rawInput.trim().toLowerCase();
  if (SEED_EXPLAINERS[normalized]) return formatSeededForDuration(SEED_EXPLAINERS[normalized], targetDuration);
  for (const item of Object.values(SEED_EXPLAINERS)) {
    for (const key of item.matchKeys) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return formatSeededForDuration(item, targetDuration);
      }
    }
  }
  return null;
}

module.exports = { SEED_EXPLAINERS, formatSeededForDuration, findSeededExplainer };
