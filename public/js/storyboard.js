/**
 * The animated placeholder shown while a clip renders: a field of travelling sine waves,
 * each layer scrolling at its own speed with a highlight sweeping across them.
 */
import { state } from './state.js';
import {
  storyboardCanvas
} from './dom.js';
import { drawInVideoBroadcastGraphics } from './charts.js';
import { updateCaptionForTime } from './player.js';

function startLiveStoryboardCanvas(ep) {
  stopLiveStoryboardCanvas();
  const ctx = storyboardCanvas.getContext('2d');
  storyboardCanvas.width = 1280;
  storyboardCanvas.height = 720;
  const startTs = performance.now();

  function drawFrame(now) {
    const elapsed = (now - startTs) / 1000;
    const w = storyboardCanvas.width;
    const h = storyboardCanvas.height;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0d0c0b');
    grad.addColorStop(0.5, '#161412');
    grad.addColorStop(1, '#090807');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    // Travelling sine-wave field: every layer scrolls horizontally at its own speed and
    // breathes in amplitude, so the lines are always visibly in motion while rendering
    const layers = 7;
    for (let i = 0; i < layers; i++) {
      const speed = 1.4 + i * 0.42;          // horizontal travel speed
      const wavelength = 0.0042 + i * 0.0011; // spatial frequency
      const baseAmp = 26 + i * 13;
      const breathe = 1 + 0.35 * Math.sin(elapsed * 0.9 + i * 0.7);
      const amp = baseAmp * breathe;
      const drift = Math.sin(elapsed * 0.45 + i * 1.3) * 26;
      const alpha = 0.30 - i * 0.03;

      ctx.beginPath();
      ctx.lineWidth = 2.4 - i * 0.18;
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(226, 255, 160, ${Math.max(0.06, alpha)})`
        : `rgba(250, 161, 213, ${Math.max(0.05, alpha * 0.8)})`;
      ctx.shadowBlur = 14;
      ctx.shadowColor = i % 2 === 0 ? 'rgba(226, 255, 160, 0.30)' : 'rgba(250, 161, 213, 0.22)';

      for (let x = 0; x <= w; x += 8) {
        // (x * wavelength - elapsed * speed) makes the waveform travel left to right
        const y = h * 0.5 + drift
          + Math.sin(x * wavelength - elapsed * speed) * amp
          + Math.sin(x * wavelength * 2.3 - elapsed * speed * 1.6 + i) * (amp * 0.28);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // A highlight that sweeps across the wave field
    const sweepX = ((elapsed * 240) % (w + 400)) - 200;
    const sweep = ctx.createLinearGradient(sweepX - 160, 0, sweepX + 160, 0);
    sweep.addColorStop(0, 'rgba(226, 255, 160, 0)');
    sweep.addColorStop(0.5, 'rgba(226, 255, 160, 0.10)');
    sweep.addColorStop(1, 'rgba(226, 255, 160, 0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(sweepX - 160, 0, 320, h);
    ctx.restore();


    updateCaptionForTime(elapsed, ep);
    drawInVideoBroadcastGraphics(elapsed, ep);

    state.canvasAnimFrame = requestAnimationFrame(drawFrame);
  }

  state.canvasAnimFrame = requestAnimationFrame(drawFrame);
}

function stopLiveStoryboardCanvas() {
  if (state.canvasAnimFrame) {
    cancelAnimationFrame(state.canvasAnimFrame);
    state.canvasAnimFrame = null;
  }
}

export {
  startLiveStoryboardCanvas,
  stopLiveStoryboardCanvas
};
