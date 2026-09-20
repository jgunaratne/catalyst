/**
 * Data visualisation: the interactive market chart below the player and the broadcast
 * graphics drawn on the storyboard canvas. All values come from real Yahoo Finance series
 * supplied by the server; nothing here invents data.
 */
import { state } from './state.js';
import {
  chartAnnotationPill,
  chartHoverReadout,
  chartSubtitleEl,
  chartTitleEl,
  inVideoGraphicsCanvas,
  legendLabelA,
  legendLabelB,
  legendSwatchA,
  legendSwatchB,
  marketChartCanvas,
  sceneActsBar,
  videoEl
} from './dom.js';

// Synchronized In-Video Graphics & Chart Overlay (Strict 3 font sizes, zero emojis)
function drawInVideoBroadcastGraphics(currentTimeSec, ep) {
  if (!inVideoGraphicsCanvas || !ep) return;
  const ctx = inVideoGraphicsCanvas.getContext('2d');
  const rect = inVideoGraphicsCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(480, rect.width || 800);
  const h = Math.max(270, rect.height || 450);

  if (inVideoGraphicsCanvas.width !== Math.round(w * dpr) || inVideoGraphicsCanvas.height !== Math.round(h * dpr)) {
    inVideoGraphicsCanvas.width = Math.round(w * dpr);
    inVideoGraphicsCanvas.height = Math.round(h * dpr);
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (state.inVideoOverlayMode === 'off') {
    ctx.restore();
    return;
  }

  const totalDur = videoEl.duration || ep.durationSec || 30.0;
  const progress = (currentTimeSec % totalDur) / totalDur;
  const activeActIdx = progress < 0.33 ? 0 : progress < 0.68 ? 1 : 2;

  if (sceneActsBar) {
    const btns = sceneActsBar.querySelectorAll('.scene-act-btn');
    btns.forEach((b, i) => b.classList.toggle('active', i === activeActIdx));
  }

  const modeToDraw = state.inVideoOverlayMode === 'pin-chart'
    ? 'LIVE_CHART'
    : (activeActIdx === 1 ? 'LIVE_CHART' : activeActIdx === 0 ? 'CATALYST_CARD' : 'ASSET_SCORECARD');

  const cardW = Math.min(390, w * 0.46);
  const cardH = modeToDraw === 'LIVE_CHART' ? Math.min(200, h * 0.46) : Math.min(165, h * 0.38);
  const cardX = w - cardW - 16;
  const cardY = 86;

  ctx.fillStyle = 'rgba(13, 12, 11, 0.88)';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = 'rgba(226, 255, 160, 0.42)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  if (modeToDraw === 'LIVE_CHART') {
    drawInVideoMiniChart(ctx, cardX, cardY, cardW, cardH, ep, progress);
  } else if (modeToDraw === 'CATALYST_CARD') {
    drawInVideoCatalystCard(ctx, cardX, cardY, cardW, cardH, ep);
  } else {
    drawInVideoAssetScorecard(ctx, cardX, cardY, cardW, cardH, ep);
  }

  ctx.restore();
}

function drawInVideoMiniChart(ctx, x, y, w, h, ep, videoProgress) {
  const cd = getEffectiveChartData(ep);
  if (!cd) return drawInVideoCatalystCard(ctx, x, y, w, h, ep);
  ctx.fillStyle = '#e2ffa0';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PART 2 / DATA CHART', x + 12, y + 18);

  ctx.fillStyle = '#f6ede0';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  const shortTitle = (cd.title || '').length > 42 ? cd.title.slice(0, 42) + '...' : cd.title;
  ctx.fillText(shortTitle, x + 12, y + 36);

  const pad = { top: 46, right: 32, bottom: 26, left: 32 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;
  const px0 = x + pad.left;
  const py0 = y + pad.top;

  const valsA = getStressedValues(cd.seriesA.values, cd.eventIndex, state.shockMultiplier);
  const valsB = getStressedValues(cd.seriesB.values, cd.eventIndex, state.shockMultiplier);
  const n = valsA.length;

  const minA = Math.min(...valsA), maxA = Math.max(...valsA), spanA = Math.max(0.01, maxA - minA);
  const minB = Math.min(...valsB), maxB = Math.max(...valsB), spanB = Math.max(0.01, maxB - minB);

  const mapX = (i) => px0 + (i / Math.max(1, n - 1)) * pw;
  const mapYA = (v) => py0 + ph - ((v - minA) / spanA) * (ph * 0.84) - ph * 0.08;
  const mapYB = (v) => py0 + ph - ((v - minB) / spanB) * (ph * 0.84) - ph * 0.08;

  const evIdx = typeof cd.eventIndex === 'number' ? cd.eventIndex : 3;
  const evX = mapX(evIdx);
  ctx.strokeStyle = 'rgba(226, 255, 160, 0.35)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(evX, py0);
  ctx.lineTo(evX, py0 + ph);
  ctx.stroke();
  ctx.setLineDash([]);

  const actLocalProg = state.inVideoOverlayMode === 'pin-chart'
    ? 1.0
    : Math.max(0.35, Math.min(1.0, (videoProgress - 0.30) / 0.32));
  const visibleCount = Math.max(2, Math.min(n, Math.ceil(actLocalProg * n)));

  ctx.strokeStyle = '#e2ffa0';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const cx = mapX(i), cy = mapYA(valsA[i]);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  ctx.strokeStyle = '#faa1d5';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const cx = mapX(i), cy = mapYB(valsB[i]);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  const lastIdx = visibleCount - 1;
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#e2ffa0';
  ctx.fillText(`${cd.seriesA.name.slice(0, 18)}: ${valsA[lastIdx]}${cd.seriesA.unit || ''}`, x + 12, y + h - 8);
  ctx.fillStyle = '#faa1d5';
  ctx.textAlign = 'right';
  ctx.fillText(`${cd.seriesB.name.slice(0, 16)}: ${valsB[lastIdx]}${cd.seriesB.unit || ''}`, x + w - 12, y + h - 8);
}

function drawInVideoCatalystCard(ctx, x, y, w, h, ep) {
  ctx.fillStyle = '#e2ffa0';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PART 1 / CONTEXT', x + 12, y + 20);

  const step1 = ep.causalChain?.[0];
  const step2 = ep.causalChain?.[1];
  if (step1) {
    ctx.fillStyle = '#edbe51';
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.fillText(`01 / ${step1.stage.toUpperCase()}`, x + 12, y + 46);
    ctx.fillStyle = '#f6ede0';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(step1.title.slice(0, 42), x + 12, y + 64);
  }
  if (step2) {
    ctx.fillStyle = '#e2ffa0';
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.fillText(`02 / ${step2.stage.toUpperCase()}`, x + 12, y + 92);
    ctx.fillStyle = '#f6ede0';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(step2.title.slice(0, 42), x + 12, y + 110);
  }

  ctx.fillStyle = 'rgba(246, 237, 224, 0.55)';
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.fillText('NEXT: DATA TREND CHART', x + 12, y + h - 12);
}

function drawInVideoAssetScorecard(ctx, x, y, w, h, ep) {
  ctx.fillStyle = '#e2ffa0';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PART 3 / MARKET EFFECT', x + 12, y + 20);

  const assets = (ep.assetImpacts || []).slice(0, 3);
  assets.forEach((item, idx) => {
    const rowY = y + 42 + idx * 38;
    const isUp = item.direction === 'UP';
    const color = isUp ? '#e2ffa0' : '#faa1d5';

    ctx.fillStyle = '#f6ede0';
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.ticker} / ${item.asset.slice(0, 20)}`, x + 12, rowY);

    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(`${item.magnitude}`, x + w - 12, rowY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x + 12, rowY + 6, w - 24, 5);

    const barW = Math.min(w - 24, (Math.abs(item.score || 1.8) / 3.0) * (w - 24));
    ctx.fillStyle = color;
    ctx.fillRect(x + 12, rowY + 6, barW, 5);
  });
}

function getEffectiveChartData(ep) {
  if (ep && ep.chartData && ep.chartData.seriesA && ep.chartData.seriesB) {
    return ep.chartData;
  }
  return null;
}

function getStressedValues(rawValues, eventIdx, mult) {
  if (!Array.isArray(rawValues) || !rawValues.length) return [];
  const anchorIdx = Math.max(0, Math.min(rawValues.length - 1, (eventIdx || 3) - 1));
  const anchorVal = rawValues[anchorIdx];
  return rawValues.map((v, i) => {
    if (i < (eventIdx || 3)) return v;
    const delta = v - anchorVal;
    return Number((anchorVal + delta * mult).toFixed(2));
  });
}

function renderInteractiveChart(ep) {
  const chartPanel = document.getElementById('interactive-chart-panel');
  if (!marketChartCanvas || !ep) return;
  const cd = getEffectiveChartData(ep);

  // If there is no accurate, verified chart data matching this story, hide the chart panel completely.
  if (!cd) {
    if (chartPanel) chartPanel.classList.add('hidden');
    return;
  }
  if (chartPanel) chartPanel.classList.remove('hidden');

  chartTitleEl.textContent = cd.title;
  chartSubtitleEl.textContent = cd.subtitle;
  chartAnnotationPill.textContent = cd.annotation || 'Summary';

  const dpr = window.devicePixelRatio || 1;
  const rect = marketChartCanvas.getBoundingClientRect();
  const cssW = Math.max(460, rect.width || 680);
  const cssH = 215;
  marketChartCanvas.width = cssW * dpr;
  marketChartCanvas.height = cssH * dpr;

  const ctx = marketChartCanvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0a0908';
  ctx.fillRect(0, 0, cssW, cssH);

  if (state.chartMode === 'quadrant') {
    legendSwatchA.style.background = '#e2ffa0';
    legendLabelA.textContent = 'Positive Impact';
    legendSwatchB.style.background = '#faa1d5';
    legendLabelB.textContent = 'Negative Impact';
    drawQuadrantScatterMap(ctx, cssW, cssH, ep);
  } else {
    legendSwatchA.style.background = '#e2ffa0';
    legendLabelA.textContent = `${cd.seriesA.name}`;
    legendSwatchB.style.background = '#faa1d5';
    legendLabelB.textContent = `${cd.seriesB.name}`;
    drawTrajectoryJawsChart(ctx, cssW, cssH, cd);
  }

  ctx.restore();
}

function drawTrajectoryJawsChart(ctx, w, h, cd) {
  const pad = { top: 26, right: 52, bottom: 32, left: 52 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const labels = cd.xLabels || ['3M Ago', '2M Ago', '1M Ago', 'Event', '+1 Mo', '+3 Mos', '+6 Mos', '+12 Mos'];
  const n = labels.length;
  const eventIdx = typeof cd.eventIndex === 'number' ? cd.eventIndex : 3;

  const valsA = getStressedValues(cd.seriesA.values, eventIdx, state.shockMultiplier);
  const valsB = getStressedValues(cd.seriesB.values, eventIdx, state.shockMultiplier);

  const rawMinA = Math.min(...valsA), rawMaxA = Math.max(...valsA);
  const rawMinB = Math.min(...valsB), rawMaxB = Math.max(...valsB);
  const globalMin = Math.min(rawMinA, rawMinB);
  const globalMax = Math.max(rawMaxA, rawMaxB);
  const sameUnit = (cd.seriesA.unit || '') === (cd.seriesB.unit || '');
  const useSharedAxis = sameUnit && globalMin > 0 && (globalMax / globalMin) <= 1.65;

  const minA = useSharedAxis ? globalMin : rawMinA;
  const maxA = useSharedAxis ? globalMax : rawMaxA;
  const spanA = Math.max(0.001, maxA - minA);
  const minB = useSharedAxis ? globalMin : rawMinB;
  const maxB = useSharedAxis ? globalMax : rawMaxB;
  const spanB = Math.max(0.001, maxB - minB);

  const xAt = (i) => pad.left + (i / Math.max(1, n - 1)) * plotW;
  const yAtA = (v) => pad.top + plotH - ((v - (minA - spanA * 0.15)) / (spanA * 1.3)) * plotH;
  const yAtB = (v) => pad.top + plotH - ((v - (minB - spanB * 0.15)) / (spanB * 1.3)) * plotH;

  const colorA = '#e2ffa0';
  const colorB = '#faa1d5';

  const eventX = xAt(eventIdx);
  ctx.fillStyle = 'rgba(226, 255, 160, 0.05)';
  ctx.fillRect(eventX, pad.top, (w - pad.right) - eventX, plotH);

  ctx.font = '500 12px "IBM Plex Mono", monospace';
  for (let g = 0; g <= 4; g++) {
    const ratio = g / 4;
    const y = pad.top + ratio * plotH;

    ctx.strokeStyle = 'rgba(246, 237, 224, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    const valLeft = (maxA + spanA * 0.15) - ratio * (spanA * 1.3);
    const valRight = (maxB + spanB * 0.15) - ratio * (spanB * 1.3);

    ctx.fillStyle = colorA;
    ctx.textAlign = 'right';
    ctx.fillText(`${valLeft.toFixed(1)}${cd.seriesA.unit || ''}`, pad.left - 8, y + 4);

    ctx.fillStyle = colorB;
    ctx.textAlign = 'left';
    ctx.fillText(`${valRight.toFixed(1)}${cd.seriesB.unit || ''}`, w - pad.right + 8, y + 4);
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(226, 255, 160, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(eventX, pad.top);
  ctx.lineTo(eventX, pad.top + plotH);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = colorA;
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${labels[eventIdx] || 'Event'}`, eventX, pad.top - 8);

  function drawSeriesLine(values, yMapper, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    values.forEach((v, i) => {
      const px = xAt(i);
      const py = yMapper(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    values.forEach((v, i) => {
      const px = xAt(i);
      const py = yMapper(v);
      const isFocus = i === state.hoverIndex || i === eventIdx;
      ctx.beginPath();
      ctx.arc(px, py, isFocus ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isFocus ? '#0d0c0b' : color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    });
    ctx.restore();
  }

  drawSeriesLine(valsA, yAtA, colorA);
  drawSeriesLine(valsB, yAtB, colorB);

  labels.forEach((lbl, i) => {
    const px = xAt(i);
    ctx.font = '500 12px "IBM Plex Mono", monospace';
    ctx.fillStyle = i === state.hoverIndex ? '#f6ede0' : i === eventIdx ? colorA : 'rgba(246, 237, 224, 0.52)';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, px, h - 10);
  });

  const activeIdx = state.hoverIndex !== null ? state.hoverIndex : eventIdx;
  const vA = valsA[activeIdx];
  const vB = valsB[activeIdx];
  chartHoverReadout.innerHTML = `${labels[activeIdx]}: <span style="color:${colorA}">${vA}${cd.seriesA.unit || ''}</span> / <span style="color:${colorB}">${vB}${cd.seriesB.unit || ''}</span>`;
}

function drawQuadrantScatterMap(ctx, w, h, ep) {
  const pad = { top: 24, right: 36, bottom: 30, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const midX = pad.left + plotW / 2;
  const midY = pad.top + plotH / 2;

  ctx.fillStyle = 'rgba(226, 255, 160, 0.05)';
  ctx.fillRect(midX, pad.top, plotW / 2, plotH / 2);
  ctx.fillStyle = 'rgba(250, 161, 213, 0.05)';
  ctx.fillRect(pad.left, midY, plotW / 2, plotH / 2);

  ctx.strokeStyle = 'rgba(246, 237, 224, 0.16)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, midY);
  ctx.lineTo(w - pad.right, midY);
  ctx.moveTo(midX, pad.top);
  ctx.lineTo(midX, pad.top + plotH);
  ctx.stroke();

  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#e2ffa0';
  ctx.textAlign = 'right';
  ctx.fillText('POSITIVE IMPACT', w - pad.right - 8, pad.top + 16);

  ctx.fillStyle = '#faa1d5';
  ctx.textAlign = 'left';
  ctx.fillText('NEGATIVE IMPACT', pad.left + 8, pad.top + plotH - 8);

  const assets = ep.assetImpacts || [];
  assets.forEach((item, idx) => {
    const rawScore = (item.score || (item.direction === 'UP' ? 1.8 : -1.8)) * state.shockMultiplier;
    const clampedScore = Math.max(-3.2, Math.min(3.2, rawScore));

    const dirSign = item.direction === 'UP' ? 1 : -1;
    const normX = dirSign * (0.32 + ((idx % 3) * 0.22)) * Math.min(1.25, state.shockMultiplier);
    const normY = clampedScore / 3.4;

    const bx = midX + normX * (plotW * 0.44);
    const by = midY - normY * (plotH * 0.42);
    const radius = 14 + Math.min(12, Math.abs(clampedScore) * 3.2);
    const color = item.direction === 'UP' ? '#e2ffa0' : '#faa1d5';

    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fillStyle = item.direction === 'UP' ? 'rgba(226, 255, 160, 0.18)' : 'rgba(250, 161, 213, 0.18)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = '#f6ede0';
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(item.ticker || 'MKT', bx, by + 4);
  });

  chartHoverReadout.textContent = `${assets.length} sectors mapped at ${state.shockMultiplier.toFixed(1)}x scale`;
}

export {
  drawInVideoBroadcastGraphics,
  drawInVideoMiniChart,
  drawInVideoCatalystCard,
  drawInVideoAssetScorecard,
  getEffectiveChartData,
  getStressedValues,
  renderInteractiveChart,
  drawTrajectoryJawsChart,
  drawQuadrantScatterMap
};
