/**
 * Application entry point: renders episodes, drives the playlist, and wires user interaction.
 * Playback lives in player.js, visualisation in charts.js, the render placeholder in
 * storyboard.js, and server access in api.js.
 */
import { state, PRESET_INPUT_MAP } from './state.js';
import * as dom from './dom.js';
import { fetchConfig, fetchRssStories, analyzeStory, generateVideo } from './api.js';
import {
  setPlayPauseIcon, syncSoundButton, startVideoWithGuaranteedAudio,
  unlockAudioPlayback, hasPendingSilentStart, updateCaptionForTime, formatTime
} from './player.js';
import {
  drawInVideoBroadcastGraphics, renderInteractiveChart, getEffectiveChartData
} from './charts.js';
import { startLiveStoryboardCanvas, stopLiveStoryboardCanvas } from './storyboard.js';

const {
  dur15Btn,
  dur30Btn,
  activeDurationBadge,
  modelSelect,
  apiStatusText,
  headlineForm,
  headlineInput,
  clearInputBtn,
  generateMainBtn,
  generateBtnLabel,
  presetsContainer,
  threadNodesContainer,
  resetThreadBtn,
  playerEpisodePill,
  playerSourceType,
  chartOverlayModeBtn,
  aspectToggleBtn,
  aspectToggleLabel,
  voiceoverToggleBtn,
  videoViewport,
  videoEl,
  storyboardCanvas,
  sceneActsBar,
  hudCategoryText,
  hudModelWatermark,
  falRenderBanner,
  renderStageTitle,
  renderTimer,
  renderProgressFill,
  hudTickerStrip,
  playPauseBtn,
  nextPlaylistBtn,
  regenerateVideoBtn,
  regenerateBtnLabel,
  replayNarrationBtn,
  scrubTrackWrap,
  scrubProgress,
  transportTime,
  anchorScriptText,
  layerMetaphorText,
  layerCameraText,
  layerLightingText,
  layerMotionText,
  compiledPromptTextarea,
  promptTelemetry,
  copyPromptBtn,
  reshootVideoBtn,
  regimeVerdictBadge,
  sentimentScoreValue,
  thesisHeadline,
  thesisBody,
  tabTrajectoryBtn,
  tabQuadrantBtn,
  shockMultiplierSlider,
  shockMultiplierVal,
  marketChartCanvas,
  episodeCounterTag,
  suggestedFollowupsList,
  followupForm,
  followupInput,
  followupSubmitBtn,
  causalChainGrid,
  assetMatrixList,
  conceptsGrid
} = dom;



state.rssItems = [];
state.rssFilter = 'all';

function setClipDuration(dur) {
  state.selectedDuration = Number(dur) === 30 ? 30 : 15;
  if (dur15Btn) dur15Btn.classList.toggle('active', state.selectedDuration === 15);
  if (dur30Btn) dur30Btn.classList.toggle('active', state.selectedDuration === 30);
  if (generateBtnLabel) generateBtnLabel.textContent = `Generate ${state.selectedDuration}s Video`;
  if (activeDurationBadge) activeDurationBadge.textContent = `${state.selectedDuration}s Clip`;

  const ep = state.thread[state.activeEpisodeIndex];
  if (ep) {
    ep.durationSec = state.selectedDuration;
    if (state.selectedDuration === 30 && ep.videoUrl30) {
      ep.videoUrl = ep.videoUrl30;
      ep.audioUrl = ep.audioUrl30 || ep.audioUrl;
    } else if (state.selectedDuration === 15 && ep.videoUrl15) {
      ep.videoUrl = ep.videoUrl15;
      ep.audioUrl = ep.audioUrl15 || ep.audioUrl;
    }
    renderActiveEpisode();
  }
  renderRssStoriesList();
}

if (dur15Btn) dur15Btn.addEventListener('click', () => setClipDuration(15));
if (dur30Btn) dur30Btn.addEventListener('click', () => setClipDuration(30));

async function initStudio() {
  try {
    const data = await fetchConfig();

    if (apiStatusText) {
      apiStatusText.textContent = data.falConnected ? `fal.ai (${data.keyPreview})` : 'Key Missing';
    }

    state.models = data.models || [];
    modelSelect.innerHTML = '';
    state.models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.badge})`;
      modelSelect.appendChild(opt);
    });

    if (data.examples && data.examples.length > 0) {
      state.featuredExamples = data.examples;
      const initialExplainer = data.examples[0];
      headlineInput.value = initialExplainer.inputHeadline;
      state.thread = [initialExplainer];
      state.activeEpisodeIndex = 0;
      setClipDuration(15);
    }

    loadLiveRssFeeds();
  } catch (err) {
    console.error('Failed to load initial config:', err);
  }
}

async function loadLiveRssFeeds() {
  const rssListEl = document.getElementById('rss-stories-list');
  if (!rssListEl) return;
  try {
    const data = await fetchRssStories();
    state.rssItems = data.items || [];
    renderRssStoriesList();
  } catch (err) {
    renderRssStoriesList();
  }
}

function buildPlaylistItems() {
  const items = [];
  const featuredList = (state.featuredExamples || []).filter((ex) => {
    if (state.rssFilter === 'all') return true;
    if (state.rssFilter === 'WSJ') return ex.id === 'wsj-ai' || ex.id === 'fed-warsh' || ex.id === 'fed-followup';
    if (state.rssFilter === 'Bloomberg') return ex.id === 'retail-sales' || ex.id === 'eu-canada' || ex.id === 'ai-followup';
    return true;
  });

  featuredList.forEach((ex) => {
    const providerLabel = (ex.id === 'wsj-ai' || ex.id === 'fed-warsh' || ex.id === 'fed-followup')
      ? 'Wall Street Journal'
      : 'Bloomberg';
    items.push({
      type: 'featured',
      key: ex.id,
      title: ex.headlineTitle || ex.inputHeadline,
      inputHeadline: ex.inputHeadline,
      provider: providerLabel,
      tag: 'Ready to Play',
      thumbSrc: ex.sourceImageUrl || `/images/source-${ex.id}.jpg`,
      explainer: ex
    });
  });

  const filteredRss = (state.rssItems || []).filter((it) => {
    if (state.rssFilter === 'all') return true;
    return it.provider === state.rssFilter;
  });

  if (!state.rssThumbOverrides) state.rssThumbOverrides = {};
  const fallbackThumbs = [
    '/cache/images/thumb-wsj-ai.jpg',
    '/cache/images/thumb-fed-warsh.jpg',
    '/cache/images/thumb-retail-sales.jpg',
    '/cache/images/thumb-eu-canada.jpg',
    '/cache/images/thumb-fed-followup.jpg',
    '/cache/images/thumb-ai-followup.jpg'
  ];

  filteredRss.slice(0, 12).forEach((item, idx) => {
    const candidate = state.rssThumbOverrides[item.title] || item.rssThumbUrl || item.rssImageUrl;
    const isChartSvg = !candidate || candidate.includes('story-placeholder.svg');
    items.push({
      type: 'rss',
      key: item.title,
      title: item.title,
      inputHeadline: item.title,
      provider: item.provider,
      tag: 'Live Feed',
      thumbSrc: isChartSvg ? fallbackThumbs[idx % fallbackThumbs.length] : candidate,
      rssItem: item
    });
  });

  return items;
}

function getActivePlaylistIndex(playlist) {
  const currentEp = state.thread[state.activeEpisodeIndex];
  if (!currentEp || !playlist.length) return 0;
  const idx = playlist.findIndex((p) =>
    (p.type === 'featured' && p.key === currentEp.id) ||
    p.inputHeadline === currentEp.inputHeadline
  );
  return idx >= 0 ? idx : (state.playlistIndex || 0);
}

function playPlaylistItemAt(index) {
  const playlist = buildPlaylistItems();
  if (!playlist.length) return;
  const safeIdx = ((index % playlist.length) + playlist.length) % playlist.length;
  state.playlistIndex = safeIdx;
  const target = playlist[safeIdx];

  if (target.type === 'featured' && target.explainer) {
    headlineInput.value = target.inputHeadline;
    // Load immediately from pre-rendered explainer & apply current duration (15s or 30s)
    const cloned = JSON.parse(JSON.stringify(target.explainer));
    cloned.durationSec = state.selectedDuration;
    cloned.videoUrl = state.selectedDuration === 30 ? (cloned.videoUrl30 || cloned.videoUrl) : (cloned.videoUrl15 || cloned.videoUrl);
    cloned.audioUrl = state.selectedDuration === 30 ? (cloned.audioUrl30 || cloned.audioUrl) : (cloned.audioUrl15 || cloned.audioUrl);
    state.thread = [cloned];
    state.activeEpisodeIndex = 0;
    renderActiveEpisode();
  } else if (target.type === 'rss' && target.rssItem) {
    handleRssStorySelection(target.rssItem);
  }
}

function playNextInPlaylist() {
  const playlist = buildPlaylistItems();
  if (!playlist.length) return;
  const curIdx = getActivePlaylistIndex(playlist);
  playPlaylistItemAt((curIdx + 1) % playlist.length);
}

function renderRssStoriesList() {
  const rssListEl = document.getElementById('rss-stories-list');
  if (!rssListEl) return;

  const playlist = buildPlaylistItems();
  const activeIdx = getActivePlaylistIndex(playlist);
  state.playlistIndex = activeIdx;
  const durStr = `0:${state.selectedDuration}`;

  const counterEl = document.getElementById('playlist-status-counter');
  if (counterEl && playlist.length > 0) {
    counterEl.textContent = `PLAYLIST QUEUE • ${activeIdx + 1} / ${playlist.length} • AUTOPLAY ON`;
  }

  rssListEl.innerHTML = '';

  playlist.forEach((pItem, idx) => {
    const isCurrent = idx === activeIdx;
    const isUpNext = idx === ((activeIdx + 1) % playlist.length);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `yt-video-card ${isCurrent ? 'active' : ''}`;
    const numStr = String(idx + 1).padStart(2, '0');
    const statusText = isCurrent
      ? `Playing Now • #${numStr}`
      : isUpNext
        ? `Up Next • #${numStr}`
        : `Playlist #${numStr}`;

    card.innerHTML = `
      <div class="yt-thumb-wrap">
        <img src="${pItem.thumbSrc}" alt="${pItem.title}" class="yt-thumb-img" loading="lazy" />
        <span class="yt-duration-badge">${durStr}</span>
      </div>
      <div class="yt-meta-col">
        <div class="yt-video-title">${pItem.title}</div>
        <div class="yt-channel-line">${pItem.provider} • ${pItem.tag}</div>
        <span class="yt-watch-cta">${statusText}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      playPlaylistItemAt(idx);
    });
    rssListEl.appendChild(card);

    if (isCurrent) {
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  });
}

async function handleRssStorySelection(rssItem) {
  if (!rssItem) return;
  headlineInput.value = rssItem.title;
  document.querySelectorAll('.story-pill').forEach(c => c.classList.remove('active'));

  if (rssItem.cachedExplainer && rssItem.cachedExplainer.videoUrl) {
    const cloned = JSON.parse(JSON.stringify(rssItem.cachedExplainer));
    cloned.durationSec = state.selectedDuration;
    state.thread = [cloned];
    state.activeEpisodeIndex = 0;
    renderActiveEpisode();
    return;
  }

  generateMainBtn.disabled = true;
  generateBtnLabel.textContent = `Building ${state.selectedDuration}s Video...`;

  try {
    const data = await analyzeStory({
        input: rssItem.title,
        rssItem,
        targetDuration: state.selectedDuration,
        forceLive: false
      });
    if (!data.explainer) {
      throw new Error(data.error || 'Failed to analyze RSS story');
    }

    const newExplainer = data.explainer;
    if (rssItem.rssImageUrl && !newExplainer.sourceImageUrl) {
      newExplainer.sourceImageUrl = rssItem.rssImageUrl;
    }
    state.thread = [newExplainer];
    state.activeEpisodeIndex = 0;
    renderActiveEpisode();

    if (!newExplainer.videoUrl) {
      const scenePrompt = newExplainer.scenes?.[0]?.prompt || newExplainer.headlineTitle || rssItem.title;
      generateVideoForEpisode(0, scenePrompt, state.selectedModelId);
    }
  } catch (err) {
    alert(`RSS Analysis Error: ${err.message}`);
  } finally {
    generateMainBtn.disabled = false;
    generateBtnLabel.textContent = `Generate ${state.selectedDuration}s Video`;
  }
}

// Wire up RSS filter tabs & topbar toggle
const rssFilterTabs = document.getElementById('rss-filter-tabs');
if (rssFilterTabs) {
  rssFilterTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rss-filter]');
    if (!btn) return;
    rssFilterTabs.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.rssFilter = btn.getAttribute('data-rss-filter') || 'all';
    renderRssStoriesList();
  });
}

const toggleRssDrawerBtn = document.getElementById('toggle-rss-drawer-btn');
const rssFeedPanel = document.getElementById('rss-feed-panel');
if (toggleRssDrawerBtn && rssFeedPanel) {
  toggleRssDrawerBtn.addEventListener('click', () => {
    const isHidden = rssFeedPanel.classList.toggle('hidden');
    toggleRssDrawerBtn.classList.toggle('active', !isHidden);
    if (!isHidden) {
      rssFeedPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}


function renderThreadChain() {
  threadNodesContainer.innerHTML = '';
  state.thread.forEach((ep, idx) => {
    if (idx > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'thread-arrow';
      arrow.textContent = '/';
      threadNodesContainer.appendChild(arrow);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `thread-node-btn ${idx === state.activeEpisodeIndex ? 'active' : ''}`;
    const shortLabel = ep.categoryBadge || `Story ${idx + 1}`;
    btn.textContent = `0${idx + 1} ${shortLabel}`;
    btn.addEventListener('click', () => {
      state.activeEpisodeIndex = idx;
      renderActiveEpisode();
    });
    threadNodesContainer.appendChild(btn);
  });

  episodeCounterTag.textContent = `Story ${state.activeEpisodeIndex + 1} of ${state.thread.length}`;
}

function renderActiveEpisode() {
  const ep = state.thread[state.activeEpisodeIndex];
  if (!ep) return;

  renderThreadChain();
  renderRssStoriesList();

  if (playerEpisodePill) {
    playerEpisodePill.textContent = `STORY 0${state.activeEpisodeIndex + 1}`;
  }
  playerSourceType.textContent = ep.sourceType || 'Factual Story';
  hudCategoryText.textContent = ep.categoryBadge || 'MARKET STORY';

  if (hudModelWatermark) {
    hudModelWatermark.textContent = ep.videoModelUsed || state.selectedModelId;
  }

  regimeVerdictBadge.textContent = ep.sentiment || 'SUMMARY';
  const scoreNum = Number(ep.sentimentScore || 0);
  if (sentimentScoreValue) {
    sentimentScoreValue.textContent = `${scoreNum > 0 ? '+' : ''}${scoreNum.toFixed(1)}`;
  }

  thesisHeadline.textContent = ep.headlineTitle || ep.inputHeadline;
  thesisBody.textContent = ep.executiveThesis || '';

  const srcPhotoCard = document.getElementById('source-photo-card');
  const srcPhotoImg = document.getElementById('source-photo-img');
  const srcPhotoCaption = document.getElementById('source-photo-caption');
  if (srcPhotoCard && srcPhotoImg) {
    if (ep.sourceImageUrl) {
      srcPhotoCard.classList.remove('hidden');
      srcPhotoImg.src = ep.sourceImageUrl;
      if (srcPhotoCaption) {
        srcPhotoCaption.textContent = ep.sourceImageCaption || 'Source Image from Feed';
      }
    } else {
      srcPhotoCard.classList.add('hidden');
    }
  }

  anchorScriptText.textContent = `${ep.narrationScript || ''}`;

  // Lower-third ticker strip (Zero emojis)
  hudTickerStrip.innerHTML = '';
  (ep.assetImpacts || []).slice(0, 4).forEach((item) => {
    const isUp = item.direction === 'UP';
    const chip = document.createElement('div');
    chip.className = 'ticker-chip';
    chip.innerHTML = `
      <span class="ticker-symbol">${item.ticker}</span>
      <span class="ticker-move ${isUp ? 'up' : 'down'}">${item.magnitude}</span>
    `;
    hudTickerStrip.appendChild(chip);
  });

  const pe = ep.promptEngineering || {};
  layerMetaphorText.textContent = pe.visualMetaphor || '';
  layerCameraText.textContent = pe.cameraChoreography || '';
  layerLightingText.textContent = pe.lightingGrade || '';
  layerMotionText.textContent = pe.motionDynamics || '';
  compiledPromptTextarea.value = pe.fullVideoPrompt || '';
  promptTelemetry.textContent = `Engine: ${ep.videoModelUsed || state.selectedModelId}`;

  // Step-by-Step Story Chain
  causalChainGrid.innerHTML = '';
  (ep.causalChain || []).forEach((stepObj, i) => {
    const card = document.createElement('div');
    card.className = `causal-step-card ${i === 0 ? 'active' : ''}`;
    card.innerHTML = `
      <div class="causal-step-top">
        <span class="causal-step-num">STEP ${stepObj.step || `0${i + 1}`}</span>
        <span class="causal-step-stage">${stepObj.stage || ''}</span>
      </div>
      <div class="causal-step-title">${stepObj.title || ''}</div>
      <div class="causal-step-detail">${stepObj.detail || ''}</div>
    `;
    causalChainGrid.appendChild(card);
  });

  // Sector & Asset Effects Matrix
  assetMatrixList.innerHTML = '';
  (ep.assetImpacts || []).forEach((item) => {
    const isUp = item.direction === 'UP';
    const absScore = Math.min(100, Math.max(18, Math.round((Math.abs(item.score || 1.5) / 3.0) * 100)));
    const row = document.createElement('div');
    row.className = 'asset-row-card';
    row.innerHTML = `
      <div class="asset-row-top">
        <div class="asset-name-group">
          <span class="asset-ticker-badge">${item.ticker || 'MKT'}</span>
          <span class="asset-title">${item.asset || ''}</span>
        </div>
        <span class="asset-move-pill ${isUp ? 'up' : 'down'}">${item.magnitude || ''}</span>
      </div>
      <div class="asset-bar-track">
        <div class="asset-bar-fill ${isUp ? 'up' : 'down'}" style="width: ${absScore}%"></div>
      </div>
      <div class="asset-rationale">${item.rationale || ''}</div>
    `;
    assetMatrixList.appendChild(row);
  });

  // Key Concept Cards
  conceptsGrid.innerHTML = '';
  (ep.concepts || []).forEach((c) => {
    const card = document.createElement('div');
    card.className = 'concept-card';
    card.innerHTML = `
      <div class="concept-top">
        <span class="concept-term">${c.term || ''}</span>
        <span class="concept-tag">${c.tag || 'CONCEPT'}</span>
      </div>
      <div class="concept-def">${c.definition || ''}</div>
    `;
    conceptsGrid.appendChild(card);
  });

  renderInteractiveChart(ep);
  renderSceneActsBar(ep);

  // Suggested Follow-Up Questions with unmistakable CTA button
  suggestedFollowupsList.innerHTML = '';
  (ep.followUps || []).forEach((fu) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'followup-btn';
    btn.innerHTML = `
      <span>${fu.question}</span>
      <span class="followup-cta-pill">Watch ${state.selectedDuration}s Clip &rarr;</span>
    `;
    btn.addEventListener('click', () => {
      handleFollowUpSubmission(fu.question, fu.preRenderedId);
    });
    suggestedFollowupsList.appendChild(btn);
  });

  if (ep.videoUrl) {
    stopLiveStoryboardCanvas();
    falRenderBanner.classList.add('hidden');
    storyboardCanvas.classList.add('hidden');
    videoEl.classList.remove('hidden');
    startVideoWithGuaranteedAudio(ep.videoUrl);
    setPlayPauseIcon(true);
  } else {
    videoEl.pause();
    videoEl.classList.add('hidden');
    storyboardCanvas.classList.remove('hidden');
    startLiveStoryboardCanvas(ep);
  }

  updateCaptionForTime(0, ep);
  drawInVideoBroadcastGraphics(0, ep);
}

// Any interaction anywhere on the page unlocks sound
['pointerdown', 'pointermove', 'mousemove', 'wheel', 'keydown', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, (e) => {
    if (e.target && e.target.closest && e.target.closest('#voiceover-toggle-btn')) return;
    unlockAudioPlayback();
  }, { passive: true });
});

// Keep the transport icon in step with playback however it was started or stopped
videoEl.addEventListener('play', () => setPlayPauseIcon(true));
videoEl.addEventListener('pause', () => setPlayPauseIcon(false));

// If the audio track only becomes available after playback starts, re-assert volume
videoEl.addEventListener('loadeddata', () => {
  videoEl.volume = 1.0;
  if (state.voiceoverEnabled && !hasPendingSilentStart()) videoEl.muted = false;
  syncSoundButton();
});


// (sound unlocking is handled by unlockAudioPlayback above)

function renderSceneActsBar(ep) {
  if (!sceneActsBar) return;
  const scenes = (ep && ep.scenes && ep.scenes.length) ? ep.scenes : [
    { act: 'PART 1 / CONTEXT', title: 'Context', overlayType: 'CATALYST_CARD' },
    { act: 'PART 2 / THE CHART', title: 'Data Trend', overlayType: 'LIVE_CHART' },
    { act: 'PART 3 / OUTCOME', title: 'Market Effect', overlayType: 'ASSET_SCORECARD' }
  ];

  sceneActsBar.innerHTML = '';
  const totalDur = ep.durationSec || 30.0;
  scenes.forEach((sc, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `scene-act-btn ${idx === 0 ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="scene-act-badge">${sc.act || `PART 0${idx + 1}`}</span>
      <span class="scene-act-title">${sc.title || ''}</span>
    `;
    btn.addEventListener('click', () => {
      const targetTime = (idx / scenes.length) * totalDur + 0.1;
      if (videoEl && !videoEl.classList.contains('hidden')) {
        videoEl.currentTime = targetTime;
        videoEl.play().catch(() => {});
      }
      if (sc.prompt) {
        compiledPromptTextarea.value = sc.prompt;
      }
      updateCaptionForTime(targetTime, ep);
      drawInVideoBroadcastGraphics(targetTime, ep);
    });
    sceneActsBar.appendChild(btn);
  });
}













/**
 * Lock every control that can kick off a render while one is already in flight, and surface
 * the busy state on the Regenerate button so the viewer knows the click was accepted.
 */
function setRenderControlsBusy(isBusy) {
  if (reshootVideoBtn) reshootVideoBtn.disabled = isBusy;
  if (regenerateVideoBtn) {
    regenerateVideoBtn.disabled = isBusy;
    regenerateVideoBtn.dataset.rendering = isBusy ? 'true' : 'false';
  }
  if (regenerateBtnLabel) {
    regenerateBtnLabel.textContent = isBusy ? 'Generating' : 'Regenerate';
  }
}

async function generateVideoForEpisode(episodeIndex, promptText, modelId) {
  const ep = state.thread[episodeIndex];
  if (!ep) return;

  state.isRenderingVideo = true;
  falRenderBanner.classList.remove('hidden');
  setRenderControlsBusy(true);

  // Show the travelling wave field for the whole render
  videoEl.pause();
  videoEl.classList.add('hidden');
  storyboardCanvas.classList.remove('hidden');
  startLiveStoryboardCanvas(ep);

  const renderStart = Date.now();
  if (state.renderTimerInterval) clearInterval(state.renderTimerInterval);

  state.renderTimerInterval = setInterval(() => {
    const elapsed = ((Date.now() - renderStart) / 1000).toFixed(1);
    renderTimer.textContent = `${elapsed}s`;
    const pct = Math.min(95, Math.round((elapsed / 34) * 100));
    renderProgressFill.style.width = `${pct}%`;

    if (elapsed < 6) {
      renderStageTitle.textContent = 'Gathering source material...';
    } else if (elapsed < 22) {
      renderStageTitle.textContent = 'Generating video...';
    } else {
      renderStageTitle.textContent = 'Generating video with voiceover...';
    }
  }, 200);

  try {
    const data = await generateVideo({
        prompt: promptText,
        headline: ep.inputHeadline || ep.headlineTitle || promptText,
        scenes: ep.scenes || null,
        narrationScript: ep.narrationScript || '',
        sourceImageUrl: ep.sourceImageUrl || null,
        targetDuration: state.selectedDuration,
        modelId: modelId || state.selectedModelId
      });
    if (!data.videoUrl) {
      throw new Error(data.error || 'Video render failed');
    }

    ep.videoUrl = data.videoUrl;
    ep.audioUrl = data.audioUrl || ep.audioUrl;
    ep.sourceImageUrl = data.sourceImageUrl || ep.sourceImageUrl;
    ep.ttsModelUsed = data.ttsModelUsed || ep.ttsModelUsed;
    ep.falRemoteUrl = data.falRemoteUrl;
    ep.videoModelUsed = data.modelUsed;
    ep.durationSec = data.duration || state.selectedDuration;

    if (data.sourceImageUrl) {
      if (!state.rssThumbOverrides) state.rssThumbOverrides = {};
      if (ep.inputHeadline) state.rssThumbOverrides[ep.inputHeadline] = data.sourceImageUrl;
      if (ep.headlineTitle) state.rssThumbOverrides[ep.headlineTitle] = data.sourceImageUrl;
      renderRssStoriesList();
    }

    if (state.activeEpisodeIndex === episodeIndex) {
      renderActiveEpisode();
    }
  } catch (err) {
    console.error('Video render error:', err);
    if (!ep.videoUrl) {
      ep.videoUrl = ep.previousVideoUrl || '/cache/videos/fed-warsh-15s.mp4';
    }
    if (state.activeEpisodeIndex === episodeIndex) {
      renderActiveEpisode();
    }
  } finally {
    state.isRenderingVideo = false;
    setRenderControlsBusy(false);
    if (state.renderTimerInterval) {
      clearInterval(state.renderTimerInterval);
      state.renderTimerInterval = null;
    }
  }
}

async function handleHeadlineSubmission(rawInput, forceLive = false) {
  if (!rawInput || !rawInput.trim()) return;
  generateMainBtn.disabled = true;
  generateBtnLabel.textContent = `Generating ${state.selectedDuration}s Video...`;

  try {
    const data = await analyzeStory({
        input: rawInput.trim(),
        targetDuration: state.selectedDuration,
        forceLive
      });
    if (!data.explainer) {
      throw new Error(data.error || 'Failed to analyze input');
    }

    const newExplainer = data.explainer;
    state.thread = [newExplainer];
    state.activeEpisodeIndex = 0;
    renderActiveEpisode();

    if (!newExplainer.videoUrl) {
      const scenePrompt = newExplainer.scenes?.[0]?.prompt || newExplainer.headlineTitle || rawInput;
      generateVideoForEpisode(0, scenePrompt, state.selectedModelId);
    }
  } catch (err) {
    alert(`Analysis Error: ${err.message}`);
  } finally {
    generateMainBtn.disabled = false;
    generateBtnLabel.textContent = `Generate ${state.selectedDuration}s Video`;
  }
}

async function handleFollowUpSubmission(questionText, preRenderedId = null) {
  if (!questionText || !questionText.trim()) return;
  if (followupSubmitBtn) {
    followupSubmitBtn.disabled = true;
    followupSubmitBtn.textContent = 'Creating...';
  }

  const currentEp = state.thread[state.activeEpisodeIndex];

  try {
    const data = await analyzeStory({
        input: questionText.trim(),
        targetDuration: state.selectedDuration,
        parentContext: currentEp
          ? { headlineTitle: currentEp.headlineTitle, inputHeadline: currentEp.inputHeadline }
          : null,
        preRenderedId
      });
    if (!data.explainer) {
      throw new Error(data.error || 'Failed to synthesize follow-up story');
    }

    const followUpEp = data.explainer;
    state.thread.push(followUpEp);
    state.activeEpisodeIndex = state.thread.length - 1;
    if (followupInput) followupInput.value = '';
    renderActiveEpisode();

    if (!followUpEp.videoUrl) {
      const scenePrompt = followUpEp.scenes?.[0]?.prompt || followUpEp.headlineTitle || questionText;
      generateVideoForEpisode(
        state.activeEpisodeIndex,
        scenePrompt,
        state.selectedModelId
      );
    }
  } catch (err) {
    alert(`Follow-up error: ${err.message}`);
  } finally {
    if (followupSubmitBtn) {
      followupSubmitBtn.disabled = false;
      followupSubmitBtn.textContent = 'Create Story';
    }
  }
}

headlineForm.addEventListener('submit', (e) => {
  e.preventDefault();
  document.querySelectorAll('.story-pill').forEach(c => c.classList.remove('active'));
  handleHeadlineSubmission(headlineInput.value, false);
});

clearInputBtn.addEventListener('click', () => {
  headlineInput.value = '';
  headlineInput.focus();
});

presetsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.story-pill');
  if (!btn) return;
  document.querySelectorAll('.story-pill').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  const presetId = btn.getAttribute('data-preset-id');
  const text = PRESET_INPUT_MAP[presetId];
  if (text) {
    headlineInput.value = text;
    handleHeadlineSubmission(text, false);
  }
});

resetThreadBtn.addEventListener('click', () => {
  if (state.thread.length > 1) {
    state.thread = [state.thread[0]];
    state.activeEpisodeIndex = 0;
    renderActiveEpisode();
  }
});

modelSelect.addEventListener('change', () => {
  state.selectedModelId = modelSelect.value;
  promptTelemetry.textContent = `Selected Engine: ${state.selectedModelId}`;
});

const openPromptModalBtn = document.getElementById('open-prompt-modal-btn');
const closePromptModalBtn = document.getElementById('close-prompt-modal-btn');
const promptModalBackdrop = document.getElementById('prompt-modal-backdrop');

if (openPromptModalBtn && promptModalBackdrop) {
  openPromptModalBtn.addEventListener('click', () => {
    promptModalBackdrop.classList.remove('hidden');
  });
}
if (closePromptModalBtn && promptModalBackdrop) {
  closePromptModalBtn.addEventListener('click', () => {
    promptModalBackdrop.classList.add('hidden');
  });
  promptModalBackdrop.addEventListener('click', (e) => {
    if (e.target === promptModalBackdrop) promptModalBackdrop.classList.add('hidden');
  });
}

if (chartOverlayModeBtn) {
  chartOverlayModeBtn.addEventListener('click', () => {
    if (state.inVideoOverlayMode === 'auto') {
      state.inVideoOverlayMode = 'pin-chart';
      chartOverlayModeBtn.textContent = 'Chart Overlay: Pinned';
      chartOverlayModeBtn.classList.add('active');
    } else if (state.inVideoOverlayMode === 'pin-chart') {
      state.inVideoOverlayMode = 'off';
      chartOverlayModeBtn.textContent = 'Chart Overlay: Off';
      chartOverlayModeBtn.classList.remove('active');
    } else {
      state.inVideoOverlayMode = 'auto';
      chartOverlayModeBtn.textContent = 'Chart Overlay: Auto';
      chartOverlayModeBtn.classList.add('active');
    }
    const ep = state.thread[state.activeEpisodeIndex];
    if (ep) drawInVideoBroadcastGraphics(videoEl.currentTime || 0, ep);
  });
}

aspectToggleBtn.addEventListener('click', () => {
  if (state.aspectRatio === '16:9') {
    state.aspectRatio = '9:16';
    videoViewport.classList.remove('aspect-16-9');
    videoViewport.classList.add('aspect-9-16');
    aspectToggleLabel.textContent = '16:9 Widescreen';
    aspectToggleBtn.classList.add('active');
  } else {
    state.aspectRatio = '16:9';
    videoViewport.classList.remove('aspect-9-16');
    videoViewport.classList.add('aspect-16-9');
    aspectToggleLabel.textContent = '9:16 Vertical';
    aspectToggleBtn.classList.remove('active');
  }
  const ep = state.thread[state.activeEpisodeIndex];
  setTimeout(() => {
    if (ep) drawInVideoBroadcastGraphics(videoEl.currentTime || 0, ep);
  }, 50);
});

voiceoverToggleBtn.addEventListener('click', () => {
  state.voiceoverEnabled = !state.voiceoverEnabled;
  videoEl.muted = !state.voiceoverEnabled;
  voiceoverToggleBtn.classList.toggle('active', state.voiceoverEnabled);
  voiceoverToggleBtn.textContent = state.voiceoverEnabled ? 'Sound On' : 'Muted';
  if (state.voiceoverEnabled) {
    videoEl.play().catch(() => {});
  }
});

playPauseBtn.addEventListener('click', () => {
  if (videoEl.paused) {
    videoEl.play().catch(() => {});
    setPlayPauseIcon(true);
  } else {
    videoEl.pause();
    setPlayPauseIcon(false);
  }
});

replayNarrationBtn.addEventListener('click', () => {
  videoEl.currentTime = 0;
  state.voiceoverEnabled = true;
  videoEl.muted = false;
  videoEl.play().catch(() => {});
  setPlayPauseIcon(true);
  voiceoverToggleBtn.classList.add('active');
  voiceoverToggleBtn.textContent = 'Sound On';
});

if (nextPlaylistBtn) {
  nextPlaylistBtn.addEventListener('click', () => {
    playNextInPlaylist();
  });
}

if (regenerateVideoBtn) {
  regenerateVideoBtn.addEventListener('click', () => {
    // Ignore repeat clicks: a render is long-running and must not be started twice.
    if (state.isRenderingVideo) return;

    const index = state.activeEpisodeIndex;
    const ep = state.thread[index];
    if (!ep) return;

    // Reuse the prompt this episode was built from so the regenerated clip covers the same
    // story; the pipeline re-sources photos and re-records narration, so the result differs.
    const prompt = ep.promptEngineering?.fullVideoPrompt
      || ep.scenes?.[0]?.prompt
      || ep.headlineTitle
      || ep.inputHeadline
      || '';
    if (!prompt) return;

    // Drop the old clip first so the render placeholder shows instead of the stale video.
    ep.previousVideoUrl = ep.videoUrl || ep.previousVideoUrl;
    ep.videoUrl = null;
    renderActiveEpisode();
    generateVideoForEpisode(index, prompt, state.selectedModelId);
  });
}

videoEl.addEventListener('ended', () => {
  playNextInPlaylist();
});

videoEl.addEventListener('timeupdate', () => {
  const dur = videoEl.duration || 30.0;
  const cur = videoEl.currentTime || 0;
  const pct = Math.min(100, (cur / dur) * 100);
  scrubProgress.style.width = `${pct}%`;
  transportTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;

  const ep = state.thread[state.activeEpisodeIndex];
  if (ep) {
    updateCaptionForTime(cur, ep);
    drawInVideoBroadcastGraphics(cur, ep);
  }
});

scrubTrackWrap.addEventListener('click', (e) => {
  const rect = scrubTrackWrap.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (videoEl.duration) {
    videoEl.currentTime = ratio * videoEl.duration;
  }
});

copyPromptBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(compiledPromptTextarea.value || '');
  copyPromptBtn.textContent = 'Copied';
  setTimeout(() => (copyPromptBtn.textContent = 'Copy Prompt'), 1500);
});

reshootVideoBtn.addEventListener('click', () => {
  const customPrompt = compiledPromptTextarea.value.trim();
  if (!customPrompt) return;
  if (promptModalBackdrop) promptModalBackdrop.classList.add('hidden');
  const ep = state.thread[state.activeEpisodeIndex];
  if (ep) {
    ep.videoUrl = null;
    if (ep.promptEngineering) ep.promptEngineering.fullVideoPrompt = customPrompt;
    renderActiveEpisode();
    generateVideoForEpisode(state.activeEpisodeIndex, customPrompt, state.selectedModelId);
  }
});

followupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleFollowUpSubmission(followupInput.value, null);
});

if (tabTrajectoryBtn && tabQuadrantBtn) {
  tabTrajectoryBtn.addEventListener('click', () => {
    state.chartMode = 'trajectory';
    tabTrajectoryBtn.classList.add('active');
    tabQuadrantBtn.classList.remove('active');
    renderInteractiveChart(state.thread[state.activeEpisodeIndex]);
  });
  tabQuadrantBtn.addEventListener('click', () => {
    state.chartMode = 'quadrant';
    tabQuadrantBtn.classList.add('active');
    tabTrajectoryBtn.classList.remove('active');
    renderInteractiveChart(state.thread[state.activeEpisodeIndex]);
  });
}

if (shockMultiplierSlider) {
  shockMultiplierSlider.addEventListener('input', () => {
    state.shockMultiplier = parseFloat(shockMultiplierSlider.value) || 1.0;
    shockMultiplierVal.textContent = `${state.shockMultiplier.toFixed(1)}x`;
    const ep = state.thread[state.activeEpisodeIndex];
    renderInteractiveChart(ep);
    if (ep) drawInVideoBroadcastGraphics(videoEl.currentTime || 0, ep);
  });
}

if (marketChartCanvas) {
  marketChartCanvas.addEventListener('mousemove', (e) => {
    if (state.chartMode !== 'trajectory') return;
    const rect = marketChartCanvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const padLeft = 52;
    const padRight = 52;
    const plotW = Math.max(1, rect.width - padLeft - padRight);
    const ratio = Math.max(0, Math.min(1, (relX - padLeft) / plotW));
    const idx = Math.round(ratio * 7);
    if (state.hoverIndex !== idx) {
      state.hoverIndex = idx;
      renderInteractiveChart(state.thread[state.activeEpisodeIndex]);
    }
  });

  marketChartCanvas.addEventListener('mouseleave', () => {
    state.hoverIndex = null;
    renderInteractiveChart(state.thread[state.activeEpisodeIndex]);
  });

  window.addEventListener('resize', () => {
    const ep = state.thread[state.activeEpisodeIndex];
    renderInteractiveChart(ep);
    if (ep) drawInVideoBroadcastGraphics(videoEl.currentTime || 0, ep);
  });
}

initStudio();
