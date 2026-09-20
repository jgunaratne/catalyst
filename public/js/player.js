/**
 * Video transport and narration playback.
 *
 * Ensures the very first automatic playback plays with sound: keeps `defaultMuted = false` and
 * `muted = false`, warms a Web Audio context, and if the browser blocks unmuted start before
 * the user's pointer enters the page, immediately unmutes and restarts from 0.0s on the first
 * pointer movement, click, wheel, or key event so no syllable of the voiceover is missed.
 */
import { state } from './state.js';
import {
  kineticCaptionText,
  playPauseBtn,
  videoEl,
  voiceoverToggleBtn
} from './dom.js';

let pendingSilentStart = false;
let playToken = 0;
let sharedAudioCtx = null;

function resumeSharedAudioContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx && !sharedAudioCtx) sharedAudioCtx = new Ctx();
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
  } catch { /* ignore */ }
}

function hasPendingSilentStart() {
  return pendingSilentStart;
}

function setPlayPauseIcon(isPlaying) {
  if (!playPauseBtn) return;
  playPauseBtn.dataset.state = isPlaying ? 'playing' : 'paused';
  playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

function syncSoundButton() {
  if (!voiceoverToggleBtn) return;
  const on = !videoEl.muted && !pendingSilentStart;
  voiceoverToggleBtn.classList.toggle('active', on);
  voiceoverToggleBtn.textContent = on ? 'Sound On' : 'Unmute Voiceover';
}

function startVideoWithGuaranteedAudio(url) {
  const token = ++playToken;
  const needsLoad = videoEl.getAttribute('src') !== url;

  resumeSharedAudioContext();
  videoEl.defaultMuted = false;
  videoEl.removeAttribute('muted');

  const begin = () => {
    if (token !== playToken) return;
    videoEl.defaultMuted = false;
    videoEl.volume = 1.0;
    videoEl.muted = !state.voiceoverEnabled;
    videoEl.currentTime = 0;
    videoEl.play().then(() => {
      if (token !== playToken) return;
      pendingSilentStart = videoEl.muted && state.voiceoverEnabled;
      syncSoundButton();
    }).catch(() => {
      if (token !== playToken) return;
      // Browser blocked unmuted autoplay prior to pointer gesture: start muted and
      // immediately unlock + restart from 0.0s on the very first pointermove/click/key.
      videoEl.muted = true;
      pendingSilentStart = true;
      syncSoundButton();
      videoEl.play().catch(() => {});
    });
  };

  if (needsLoad) {
    videoEl.src = url;
    videoEl.load();
    const onReady = () => {
      videoEl.removeEventListener('canplaythrough', onReady);
      begin();
    };
    videoEl.addEventListener('canplaythrough', onReady);
    setTimeout(() => {
      if (token === playToken && videoEl.paused) {
        videoEl.removeEventListener('canplaythrough', onReady);
        begin();
      }
    }, 800);
  } else {
    begin();
  }
}

function unlockAudioPlayback() {
  if (!videoEl || !state.voiceoverEnabled) return;
  resumeSharedAudioContext();
  if (!videoEl.muted && !pendingSilentStart) return;
  videoEl.defaultMuted = false;
  videoEl.removeAttribute('muted');
  videoEl.muted = false;
  videoEl.volume = 1.0;
  if (pendingSilentStart && videoEl.currentTime > 0.05) {
    videoEl.currentTime = 0;
  }
  pendingSilentStart = false;
  videoEl.play().catch(() => {});
  syncSoundButton();
}

function updateCaptionForTime(currentTimeSec, ep) {
  const captions = (ep && ep.captions) || [];
  if (!captions.length) return;

  const totalDur = videoEl.duration || ep.durationSec || 30.0;
  const normalizedTime = currentTimeSec % totalDur;
  const match = captions.find(c => normalizedTime >= c.start && normalizedTime <= c.end) || captions[0];

  if (match) {
    let html = match.text;
    if (match.highlight && html.includes(match.highlight)) {
      html = html.replace(match.highlight, `<mark>${match.highlight}</mark>`);
    }
    kineticCaptionText.innerHTML = html;
  }
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mins = String(Math.floor(s / 60)).padStart(2, '0');
  const rem = String(s % 60).padStart(2, '0');
  return `${mins}:${rem}`;
}

export {
  setPlayPauseIcon,
  syncSoundButton,
  startVideoWithGuaranteedAudio,
  unlockAudioPlayback,
  hasPendingSilentStart,
  updateCaptionForTime,
  formatTime
};
