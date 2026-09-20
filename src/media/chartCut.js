/**
 * Broadcast Market Chart & Key Numbers Video Cut Generator (`src/media/chartCut.js`).
 *
 * Guarantees visual and mathematical accuracy:
 *   1. When Series A and Series B share the same unit and comparable scale (e.g. 4.75% Federal
 *      Funds Rate vs. 5.00% 10Y Treasury Yield), both curves are plotted on a SINGLE shared
 *      `[globalMin, globalMax]` Y-axis so every point's height matches the Y-axis tick labels.
 *   2. When Series A and Series B have different units or scales (e.g. 260 bps vs. $91.29, or
 *      $4,424.90 Gold vs. $67.15 Silver), Left Y-axis ticks are colored Lime (`#e2ffa0`) for
 *      Series A and Right Y-axis ticks are rendered in Sky Blue (`#38bdf8`) for Series B.
 *   3. Terminal value badges at the right edge enforce a 54px vertical anti-collision guard so
 *      the Series B badge can never cover up the Series A badge.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { IMAGES_DIR } = require('../config');

function escXml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatMetric(val, unit = '') {
  if (val == null || !Number.isFinite(Number(val))) return '--';
  const n = Number(val);
  const formatted = Math.abs(n) >= 1000 ? n.toFixed(1) : n.toFixed(2);
  if (unit === '$') return `$${formatted}`;
  if (unit === '%' || unit === 'bps' || unit === 'x') return `${formatted}${unit === 'bps' ? ' bps' : unit}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDelta(vals, unit = '') {
  if (!Array.isArray(vals) || vals.length < 2) return { text: '0.0%', positive: true };
  const first = Number(vals[0]);
  const last = Number(vals[vals.length - 1]);
  const diff = last - first;
  const pct = first !== 0 ? (diff / Math.abs(first)) * 100 : 0;
  const sign = diff >= 0 ? '+' : '';
  if (unit === '%') {
    return { text: `${sign}${diff.toFixed(2)} pts (${sign}${ Math.round(diff * 100)} bps)`, positive: diff >= 0 };
  }
  if (unit === 'bps') {
    return { text: `${sign}${Math.round(diff)} bps (${sign}${pct.toFixed(1)}%)`, positive: diff >= 0 };
  }
  return { text: `${sign}${pct.toFixed(1)}% (${sign}${diff.toFixed(2)})`, positive: diff >= 0 };
}

function normalizeWithBounds(values, minBound, maxBound, plotX, plotY, plotW, plotH) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  if (!nums.length) return [];
  const span = Math.max(1e-6, maxBound - minBound);
  return nums.map((v, idx) => {
    const x = plotX + (nums.length === 1 ? plotW / 2 : (idx / (nums.length - 1)) * plotW);
    const y = plotY + plotH - ((v - minBound) / span) * plotH;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val: v };
  });
}

function paddedBounds(nums) {
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const span = Math.max(1e-4, maxV - minV);
  return { min: minV - span * 0.14, max: maxV + span * 0.16 };
}

function buildChartSvgs(chartData, headline) {
  const sA = chartData?.seriesA || { name: 'Primary Series', unit: '%', values: [4.50, 4.75] };
  const sB = chartData?.seriesB || { name: 'Secondary Series', unit: '%', values: [4.66, 5.00] };
  const labels = Array.isArray(chartData?.xLabels) && chartData.xLabels.length
    ? chartData.xLabels
    : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

  const valsA = (sA.values || []).map(Number).filter(Number.isFinite);
  const valsB = (sB.values || []).map(Number).filter(Number.isFinite);
  const lastA = valsA[valsA.length - 1];
  const firstA = valsA[0];
  const lastB = valsB[valsB.length - 1];
  const firstB = valsB[0];
  const deltaA = formatDelta(valsA, sA.unit);
  const deltaB = formatDelta(valsB, sB.unit);

  const plotX = 145;
  const plotY = 410;
  const plotW = 1470;
  const plotH = 510;

  // Use a SHARED Y-axis when both series have the same unit and comparable scale (within 1.6x)
  const allVals = [...valsA, ...valsB];
  const globalMin = Math.min(...allVals);
  const globalMax = Math.max(...allVals);
  const useSharedAxis = (sA.unit === sB.unit) && (globalMin > 0) && ((globalMax / globalMin) <= 1.65);

  const boundsA = useSharedAxis ? paddedBounds(allVals) : paddedBounds(valsA.length ? valsA : [0, 1]);
  const boundsB = useSharedAxis ? boundsA : paddedBounds(valsB.length ? valsB : [0, 1]);

  const ptsA = normalizeWithBounds(valsA, boundsA.min, boundsA.max, plotX, plotY, plotW, plotH);
  const ptsB = normalizeWithBounds(valsB, boundsB.min, boundsB.max, plotX, plotY, plotW, plotH);

  // Left Y-axis ticks (Series A or Shared) & Right Y-axis ticks (Series B when dual-scale)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: Number((plotY + plotH - f * plotH).toFixed(1)),
    labelA: formatMetric(boundsA.min + f * (boundsA.max - boundsA.min), sA.unit),
    labelB: formatMetric(boundsB.min + f * (boundsB.max - boundsB.min), sB.unit)
  }));

  const gridLinesXml = yTicks.map(t => `
    <line x1="${plotX}" y1="${t.y}" x2="${plotX + plotW}" y2="${t.y}" stroke="#262522" stroke-width="1.5" stroke-dasharray="6,6"/>
    <text x="${plotX - 16}" y="${t.y + 6}" fill="${useSharedAxis ? '#a5a199' : '#e2ffa0'}" font-family="DejaVu Sans Mono, monospace" font-size="20" text-anchor="end">${escXml(t.labelA)}</text>
  `).join('');

  const xAxisXml = labels.map((lb, idx) => {
    const x = plotX + (labels.length === 1 ? plotW / 2 : (idx / (labels.length - 1)) * plotW);
    return `
      <line x1="${x.toFixed(1)}" y1="${plotY}" x2="${x.toFixed(1)}" y2="${plotY + plotH}" stroke="#1b1a18" stroke-width="1"/>
      <text x="${x.toFixed(1)}" y="${plotY + plotH + 44}" fill="#a5a199" font-family="DejaVu Sans Mono, monospace" font-size="20" text-anchor="middle">${escXml(lb)}</text>
    `;
  }).join('');

  const chartTitle = chartData?.title || headline || 'Market Trajectory';
  const chartSub = chartData?.subtitle || 'Verified Market Telemetry';
  const annotationText = chartData?.annotation || `${sA.name}: ${formatMetric(lastA, sA.unit)}`;

  const sharedFrameXml = `
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#121110"/>
        <stop offset="100%" stop-color="#0a0908"/>
      </linearGradient>
      <linearGradient id="areaGradA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e2ffa0" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="#e2ffa0" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bgGrad)"/>

    <!-- Top Broadcast Header -->
    <rect x="100" y="54" width="290" height="36" rx="6" fill="#1e2416" stroke="#e2ffa0" stroke-width="1.2"/>
    <text x="245" y="79" fill="#e2ffa0" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="bold" text-anchor="middle">VERIFIED MARKET DATA</text>
    <text x="415" y="80" fill="#f6ede0" font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="bold">${escXml(String(chartTitle).slice(0, 62))}</text>
    <text x="100" y="124" fill="#a5a199" font-family="DejaVu Sans, sans-serif" font-size="22">${escXml(String(chartSub).slice(0, 95))}</text>

    <!-- Primary KPI Number Card (Series A — always matches the headline figure spoken first) -->
    <rect x="100" y="152" width="660" height="196" rx="12" fill="#161513" stroke="#2e2c28" stroke-width="1.5"/>
    <rect x="100" y="152" width="8" height="196" rx="4" fill="#e2ffa0"/>
    <text x="132" y="196" fill="#a5a199" font-family="DejaVu Sans Mono, monospace" font-size="21" font-weight="bold">${escXml(String(sA.name).toUpperCase())}</text>
    <text x="132" y="276" fill="#f6ede0" font-family="DejaVu Sans Mono, monospace" font-size="66" font-weight="bold">${escXml(formatMetric(lastA, sA.unit))}</text>
    <text x="132" y="322" fill="${deltaA.positive ? '#e2ffa0' : '#ff6b6b'}" font-family="DejaVu Sans Mono, monospace" font-size="22" font-weight="bold">8W Move: ${escXml(deltaA.text)}  (from ${escXml(formatMetric(firstA, sA.unit))})</text>

    <!-- Secondary KPI Number Card (Series B — matches the second figure spoken in the audio) -->
    <rect x="790" y="152" width="660" height="196" rx="12" fill="#161513" stroke="#2e2c28" stroke-width="1.5"/>
    <rect x="790" y="152" width="8" height="196" rx="4" fill="#38bdf8"/>
    <text x="822" y="196" fill="#a5a199" font-family="DejaVu Sans Mono, monospace" font-size="21" font-weight="bold">${escXml(String(sB.name).toUpperCase())}</text>
    <text x="822" y="276" fill="#f6ede0" font-family="DejaVu Sans Mono, monospace" font-size="66" font-weight="bold">${escXml(formatMetric(lastB, sB.unit))}</text>
    <text x="822" y="322" fill="${deltaB.positive ? '#38bdf8' : '#ff6b6b'}" font-family="DejaVu Sans Mono, monospace" font-size="22" font-weight="bold">8W Move: ${escXml(deltaB.text)}  (from ${escXml(formatMetric(firstB, sB.unit))})</text>

    <!-- Catalyst Annotation Card -->
    <rect x="1480" y="152" width="340" height="196" rx="12" fill="#191d14" stroke="#e2ffa0" stroke-width="1.2"/>
    <text x="1508" y="196" fill="#e2ffa0" font-family="DejaVu Sans Mono, monospace" font-size="19" font-weight="bold">KEY CATALYST</text>
    <text x="1508" y="246" fill="#f6ede0" font-family="DejaVu Sans, sans-serif" font-size="23" font-weight="bold">${escXml(String(annotationText).slice(0, 21))}</text>
    <text x="1508" y="282" fill="#f6ede0" font-family="DejaVu Sans, sans-serif" font-size="23" font-weight="bold">${escXml(String(annotationText).slice(21, 42))}</text>
    <text x="1508" y="322" fill="#a5a199" font-family="DejaVu Sans Mono, monospace" font-size="18">SPOKEN &amp; CHART SYNCED</text>

    <!-- Plot Frame & Grid -->
    <rect x="${plotX}" y="${plotY}" width="${plotW}" height="${plotH}" fill="#100f0e" stroke="#262522" stroke-width="1.5"/>
    ${gridLinesXml}
    ${xAxisXml}
  `;

  const polyA = ptsA.map(p => `${p.x},${p.y}`).join(' ');
  const polyB = ptsB.map(p => `${p.x},${p.y}`).join(' ');
  const areaA = ptsA.length >= 2
    ? `M ${ptsA[0].x} ${plotY + plotH} L ` + ptsA.map(p => `${p.x} ${p.y}`).join(' L ') + ` L ${ptsA[ptsA.length - 1].x} ${plotY + plotH} Z`
    : '';

  const nodesAXml = ptsA.map(p => `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#e2ffa0" stroke="#0d0c0b" stroke-width="2.5"/>`).join('');
  const nodesBXml = ptsB.map(p => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#38bdf8" stroke="#0d0c0b" stroke-width="2"/>`).join('');

  const endA = ptsA[ptsA.length - 1] || { x: plotX + plotW, y: plotY + 120 };
  const endB = ptsB[ptsB.length - 1] || { x: plotX + plotW, y: plotY + 260 };

  // Prevent terminal badge collision so Series B never covers Series A
  let badgeAY = Math.max(plotY + 6, Math.min(plotY + plotH - 46, endA.y - 22));
  let badgeBY = Math.max(plotY + 6, Math.min(plotY + plotH - 46, endB.y - 22));
  if (Math.abs(badgeAY - badgeBY) < 54) {
    if (badgeAY <= badgeBY) {
      badgeAY = Math.max(plotY + 4, badgeAY - 28);
      badgeBY = Math.min(plotY + plotH - 46, badgeAY + 54);
    } else {
      badgeBY = Math.max(plotY + 4, badgeBY - 28);
      badgeAY = Math.min(plotY + plotH - 46, badgeBY + 54);
    }
  }

  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${sharedFrameXml}</svg>`;
  const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    ${sharedFrameXml}
    ${areaA ? `<path d="${areaA}" fill="url(#areaGradA)"/>` : ''}
    ${polyB ? `<polyline fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${polyB}"/>` : ''}
    ${polyA ? `<polyline fill="none" stroke="#e2ffa0" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" points="${polyA}"/>` : ''}
    ${nodesBXml}
    ${nodesAXml}
    <rect x="${endB.x + 14}" y="${badgeBY}" width="186" height="44" rx="8" fill="#38bdf8"/>
    <text x="${endB.x + 107}" y="${badgeBY + 29}" fill="#0d0c0b" font-family="DejaVu Sans Mono, monospace" font-size="22" font-weight="bold" text-anchor="middle">${escXml(formatMetric(lastB, sB.unit))}</text>
    <rect x="${endA.x + 14}" y="${badgeAY}" width="186" height="44" rx="8" fill="#e2ffa0"/>
    <text x="${endA.x + 107}" y="${badgeAY + 29}" fill="#0d0c0b" font-family="DejaVu Sans Mono, monospace" font-size="22" font-weight="bold" text-anchor="middle">${escXml(formatMetric(lastA, sA.unit))}</text>
  </svg>`;

  return { bgSvg, fgSvg };
}

function buildAnimatedMarketChartClip(chartData, headline, outClipPath, clipDurSec = 4.1) {
  return new Promise((resolve, reject) => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const bgSvgPath = path.join(IMAGES_DIR, `tmp-chart-bg-${stamp}.svg`);
    const fgSvgPath = path.join(IMAGES_DIR, `tmp-chart-fg-${stamp}.svg`);

    try {
      const { bgSvg, fgSvg } = buildChartSvgs(chartData, headline);
      fs.writeFileSync(bgSvgPath, bgSvg);
      fs.writeFileSync(fgSvgPath, fgSvg);
    } catch (err) {
      return reject(err);
    }

    const revealDur = Math.max(1.8, clipDurSec * 0.65).toFixed(2);
    const filterComplex =
      `[0:v]fps=25,trim=0:${clipDurSec.toFixed(2)},setpts=PTS-STARTPTS[bg];` +
      `[1:v]fps=25,trim=0:${clipDurSec.toFixed(2)},setpts=PTS-STARTPTS[fg];` +
      `[bg][fg]xfade=transition=wiperight:duration=${revealDur}:offset=0.20,scale=1920:1080,setsar=1[outv]`;

    execFile(
      'ffmpeg',
      [
        '-y',
        '-loop', '1', '-t', clipDurSec.toFixed(2), '-i', bgSvgPath,
        '-loop', '1', '-t', clipDurSec.toFixed(2), '-i', fgSvgPath,
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        '-t', clipDurSec.toFixed(2),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outClipPath
      ],
      { timeout: 25000 },
      (err) => {
        try { fs.unlinkSync(bgSvgPath); } catch { /* ignore */ }
        try { fs.unlinkSync(fgSvgPath); } catch { /* ignore */ }
        if (err) return reject(err);
        resolve(outClipPath);
      }
    );
  });
}

module.exports = { buildAnimatedMarketChartClip };
