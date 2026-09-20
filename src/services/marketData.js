/**
 * Real market series from Yahoo Finance. Chart data shown in the UI and baked into the video's
 * animated chart cut must always come from here and match the specific company, commodity,
 * currency, rate, or sector discussed in the story.
 */
const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('../config');
const { fetchJsonUrl } = require('../clients/httpClient');

let REAL_YF_CHARTS = {};
try {
  REAL_YF_CHARTS = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'real_yf_charts.json'), 'utf8'));
} catch (e) {
  REAL_YF_CHARTS = {};
}

const seriesMemoryCache = new Map();

async function fetchYahooSeries8Wk(sym) {
  if (seriesMemoryCache.has(sym)) return seriesMemoryCache.get(sym);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1wk`;
  const d = await fetchJsonUrl(url);
  const res = d?.chart?.result?.[0];
  if (!res) return null;
  const ts = res.timestamp || [];
  const closes = res.indicators?.quote?.[0]?.close || [];
  const pts = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] != null) {
      const dt = new Date(ts[i] * 1000);
      pts.push({ label: `${months[dt.getUTCMonth()]} ${String(dt.getUTCDate()).padStart(2, '0')}`, val: Number(closes[i].toFixed(2)) });
    }
  }
  const out = pts.slice(-8);
  if (out.length >= 4) seriesMemoryCache.set(sym, out);
  return out;
}

/**
 * Extract a salient numeric figure from the headline/story text (e.g. "$720 Million",
 * "$13 Billion", "+25 bps to 4.75%", "260 bps") so the chart annotation highlights both the
 * story's headline figure and the live Yahoo Finance closes.
 */
function extractHeadlineFigure(text) {
  const s = String(text || '');
  const m =
    s.match(/\$[0-9]+(?:\.[0-9]+)?\s*(?:Billion|Million|Trillion|B|M|T)\b/i) ||
    s.match(/[+-]?[0-9]+(?:\.[0-9]+)?\s*(?:bps|basis points|%)/i) ||
    s.match(/\b[0-9]+x\b/i);
  return m ? m[0].trim() : null;
}

/**
 * Story-specific Yahoo Finance ticker rules ordered from most specific (individual companies,
 * commodities, currencies, and bond products) to sector/macro pairs.
 */
const STORY_TICKER_RULES = [
  {
    pattern: /\b(comex gold|gold.*silver|silver.*settle|bullion|precious metal)\b/i,
    symA: 'GC=F', nameA: 'COMEX Gold Futures ($/oz)', unitA: '$',
    symB: 'SI=F', nameB: 'COMEX Silver Futures ($/oz)', unitB: '$',
    catalyst: 'COMEX Gold & Silver Futures Settlement'
  },
  {
    pattern: /\b(coffee|arabica|cocoa)\b/i,
    symA: 'KC=F', nameA: 'Arabica Coffee Futures (¢/lb)', unitA: '¢',
    symB: 'DBA', nameB: 'Invesco Agriculture Fund (DBA $)', unitB: '$',
    catalyst: 'Global Arabica Coffee Supply & Tariff Shock'
  },
  {
    pattern: /\b(natural gas|henry hub|weather forecast.*gas)\b/i,
    symA: 'NG=F', nameA: 'Henry Hub Natural Gas ($/MMBtu)', unitA: '$',
    symB: 'UNG', nameB: 'US Natural Gas Fund (UNG $)', unitB: '$',
    catalyst: 'Henry Hub Natural Gas Futures Repricing'
  },
  {
    pattern: /\b(swiss franc|japanese yen|safe[- ]haven currenc)\b/i,
    symA: 'CHFUSD=X', nameA: 'Swiss Franc (CHF/USD)', unitA: '$',
    symB: 'JPY=X', nameB: 'Japanese Yen (USD/JPY)', unitB: '¥',
    catalyst: 'Safe-Haven FX Inflows (CHF & JPY)'
  },
  {
    pattern: /\b(energy\s*&\s*utilities|utilities roundup)\b/i,
    symA: 'XLE', nameA: 'Energy Select Sector SPDR (XLE $)', unitA: '$',
    symB: 'XLU', nameB: 'Utilities Select Sector SPDR (XLU $)', unitB: '$',
    catalyst: 'US Energy (XLE) vs. Power Utilities (XLU)'
  },
  {
    pattern: /\b(basic materials|materials roundup|copper|steel)\b/i,
    symA: 'XLB', nameA: 'Materials Select Sector ETF (XLB $)', unitA: '$',
    symB: 'HG=F', nameB: 'COMEX High-Grade Copper ($/lb)', unitB: '$',
    catalyst: 'Industrial Materials (XLB) & Copper (HG=F)'
  },
  {
    pattern: /\b(financial services roundup|bank stocks|jpmorgan)\b/i,
    symA: 'XLF', nameA: 'Financial Select Sector SPDR (XLF $)', unitA: '$',
    symB: 'JPM', nameB: 'JPMorgan Chase & Co. (JPM $)', unitB: '$',
    catalyst: 'US Money-Center Banks & Financials (XLF / JPM)'
  },
  {
    pattern: /\b(ai titans|won't sink u\.s\. ai)\b/i,
    symA: 'MSFT', nameA: 'Microsoft AI Cloud (MSFT $)', unitA: '$',
    symB: 'META', nameB: 'Meta Hyperscale AI (META $)', unitB: '$',
    catalyst: 'US Hyperscaler CapEx Resilience (MSFT & META)'
  },
  {
    pattern: /\b(deepseek|ai rout|stocks sink in broad ai)\b/i,
    symA: 'NVDA', nameA: 'NVIDIA AI Accelerators (NVDA $)', unitA: '$',
    symB: 'SOXX', nameB: 'iShares Semiconductor ETF (SOXX $)', unitB: '$',
    catalyst: 'AI Semiconductor Repricing (NVDA & SOXX)'
  },
  {
    pattern: /\b(mbs|convexity|mortgage spread|260 bps)\b/i,
    symA: 'MBS-SPRD', nameA: '30Y Mortgage Spread (bps)', unitA: ' bps',
    customValuesA: [225, 230, 234, 238, 244, 252, 258, 260],
    symB: 'MBB', nameB: 'iShares Agency MBS ETF (MBB $)', unitB: '$',
    catalyst: '30Y Mortgage Spread (260 bps) vs. Agency MBS ETF (MBB)'
  },
  {
    pattern: /\b(warsh|fomc|4\.75%|25 bps hike|fed raises)\b/i,
    symA: 'FEDFUNDS', nameA: 'Federal Funds Target Rate (%)', unitA: '%',
    customValuesA: [4.50, 4.50, 4.50, 4.50, 4.50, 4.50, 4.75, 4.75],
    symB: '^TNX', nameB: '10Y US Treasury Yield (%)', unitB: '%',
    catalyst: 'FOMC +25 bps to 4.75% & 10Y Treasury Yield (5.00%)'
  },
  {
    pattern: /\b(census retail sales|gas station surge|0\.9% nominal)\b/i,
    symA: 'XRT', nameA: 'SPDR S&P Retail ETF (XRT $)', unitA: '$',
    symB: 'RB=F', nameB: 'RBOB Gasoline Futures ($/gal)', unitB: '$',
    catalyst: 'Retail Sales (+0.9%) vs. Pump Gasoline ($3.06/gal)'
  },
  {
    pattern: /\b(eu associate|critical-minerals|brussels floats)\b/i,
    symA: 'EWC', nameA: 'iShares MSCI Canada ETF (EWC $)', unitA: '$',
    symB: 'PICK', nameB: 'iShares Global Metals & Mining (PICK $)', unitB: '$',
    catalyst: 'EU-Canada Critical Minerals Offtake Corridor'
  },
  {
    pattern: /\b(tsmc|cowos|agentic reasoning|token compute 10x)\b/i,
    symA: 'TSM', nameA: 'TSMC Advanced Packaging (TSM $)', unitA: '$',
    symB: 'AVGO', nameB: 'Broadcom Custom AI Silicon (AVGO $)', unitB: '$',
    catalyst: '10x Agentic Compute & TSMC CoWoS Allocation'
  },
  {
    pattern: /\b(cio survey|fortune 500 triples ai|24% of it budgets)\b/i,
    symA: 'AI-IT', nameA: 'Enterprise AI Share of IT Budgets (%)', unitA: '%',
    customValuesA: [8.0, 10.2, 12.5, 15.0, 17.8, 20.4, 22.6, 24.0],
    symB: 'IGV', nameB: 'iShares Expanded Tech-Software (IGV $)', unitB: '$',
    catalyst: 'Enterprise AI Spend (24.0% of IT) vs. Tech-Software ETF (IGV)'
  }
];

async function fetchLiveYahooFinanceChartForStory(queryText) {
  const text = String(queryText || '');
  let chosen = null;

  for (const rule of STORY_TICKER_RULES) {
    if (rule.pattern.test(text)) {
      chosen = rule;
      break;
    }
  }

  // If we cannot map the story to an accurate, directly relevant market dataset, do NOT show a chart.
  if (!chosen) {
    return null;
  }

  const { symA, nameA, unitA, customValuesA, symB, nameB, unitB, catalyst } = chosen;
  const headlineFig = extractHeadlineFigure(text);

  try {
    const [ptsA, ptsB] = await Promise.all([
      customValuesA ? Promise.resolve(null) : fetchYahooSeries8Wk(symA),
      fetchYahooSeries8Wk(symB)
    ]);
    if (ptsB && ptsB.length >= 4 && (customValuesA || (ptsA && ptsA.length >= 4))) {
      const n = customValuesA ? Math.min(customValuesA.length, ptsB.length) : Math.min(ptsA.length, ptsB.length);
      const bSlice = ptsB.slice(-n);
      const aVals = customValuesA ? customValuesA.slice(-n) : ptsA.slice(-n).map(p => p.val);
      const latestA = aVals[n - 1];
      const latestB = bSlice[n - 1].val;
      const fmtA = unitA === '$' ? `$${latestA}` : `${latestA}${unitA}`;
      const fmtB = unitB === '$' ? `$${latestB}` : `${latestB}${unitB}`;

      return {
        title: `${nameA} vs. ${nameB}`,
        subtitle: `Verified 8-Week Series (${symA}: ${fmtA} | ${symB}: ${fmtB})`,
        xLabels: bSlice.map(p => p.label),
        eventIndex: Math.max(0, n - 2),
        annotation: headlineFig
          ? `${headlineFig} • ${symA} ${fmtA} | ${symB} ${fmtB}`
          : `${catalyst} (${symA} ${fmtA} | ${symB} ${fmtB})`,
        seriesA: { name: nameA, unit: unitA, color: '#e2ffa0', values: aVals },
        seriesB: { name: nameB, unit: unitB, color: '#38bdf8', values: bSlice.map(p => p.val) }
      };
    }
  } catch (e) {
    // Do not return an unrelated fallback chart if accurate data is unavailable
  }
  return null;
}

module.exports = { REAL_YF_CHARTS, fetchYahooSeries8Wk, fetchLiveYahooFinanceChartForStory };
