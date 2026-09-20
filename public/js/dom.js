/**
 * Cached element lookups. Keeping every query in one place makes the markup contract for the
 * app explicit and avoids repeated getElementById calls scattered through the codebase.
 */
// DOM Elements
export const dur15Btn = document.getElementById('dur-15-btn');
export const dur30Btn = document.getElementById('dur-30-btn');
export const activeDurationBadge = document.getElementById('active-duration-badge');
export const modelSelect = document.getElementById('video-model-select');
export const apiStatusText = document.getElementById('api-status-text');
export const headlineForm = document.getElementById('headline-form');
export const headlineInput = document.getElementById('headline-input');
export const clearInputBtn = document.getElementById('clear-input-btn');
export const generateMainBtn = document.getElementById('generate-main-btn');
export const generateBtnLabel = document.getElementById('generate-btn-label');
export const presetsContainer = document.getElementById('presets-container');

export const threadNodesContainer = document.getElementById('thread-nodes-container');
export const resetThreadBtn = document.getElementById('reset-thread-btn');

export const playerEpisodePill = document.getElementById('player-episode-pill');
export const playerSourceType = document.getElementById('player-source-type');
export const chartOverlayModeBtn = document.getElementById('chart-overlay-mode-btn');
export const aspectToggleBtn = document.getElementById('aspect-toggle-btn');
export const aspectToggleLabel = document.getElementById('aspect-toggle-label');
export const voiceoverToggleBtn = document.getElementById('voiceover-toggle-btn');

export const videoViewport = document.getElementById('video-viewport');
export const videoEl = document.getElementById('explainer-video');
export const storyboardCanvas = document.getElementById('live-storyboard-canvas');
export const inVideoGraphicsCanvas = document.getElementById('in-video-graphics-canvas');
export const sceneActsBar = document.getElementById('scene-acts-bar');
export const hudCategoryText = document.getElementById('hud-category-text');
export const hudModelWatermark = document.getElementById('hud-model-watermark');

export const falRenderBanner = document.getElementById('fal-render-banner');
export const renderStageTitle = document.getElementById('render-stage-title');
export const renderTimer = document.getElementById('render-timer');
export const renderProgressFill = document.getElementById('render-progress-fill');

export const kineticCaptionText = document.getElementById('kinetic-caption-text');
export const hudTickerStrip = document.getElementById('hud-ticker-strip');

export const playPauseBtn = document.getElementById('play-pause-btn');
export const nextPlaylistBtn = document.getElementById('next-playlist-btn');
export const regenerateVideoBtn = document.getElementById('regenerate-video-btn');
export const regenerateBtnLabel = document.getElementById('regenerate-btn-label');
export const replayNarrationBtn = document.getElementById('replay-narration-btn');
export const scrubTrackWrap = document.getElementById('scrub-track-wrap');
export const scrubProgress = document.getElementById('scrub-progress');
export const transportTime = document.getElementById('transport-time');
export const anchorScriptText = document.getElementById('anchor-script-text');

export const layerMetaphorText = document.getElementById('layer-metaphor-text');
export const layerCameraText = document.getElementById('layer-camera-text');
export const layerLightingText = document.getElementById('layer-lighting-text');
export const layerMotionText = document.getElementById('layer-motion-text');
export const compiledPromptTextarea = document.getElementById('compiled-prompt-textarea');
export const promptTelemetry = document.getElementById('prompt-telemetry');
export const copyPromptBtn = document.getElementById('copy-prompt-btn');
export const reshootVideoBtn = document.getElementById('reshoot-video-btn');

export const regimeVerdictBadge = document.getElementById('regime-verdict-badge');
export const sentimentScoreValue = document.getElementById('sentiment-score-value');
export const thesisHeadline = document.getElementById('thesis-headline');
export const thesisBody = document.getElementById('thesis-body');

export const chartTitleEl = document.getElementById('chart-title');
export const chartSubtitleEl = document.getElementById('chart-subtitle');
export const tabTrajectoryBtn = document.getElementById('tab-trajectory-btn');
export const tabQuadrantBtn = document.getElementById('tab-quadrant-btn');
export const legendSwatchA = document.getElementById('legend-swatch-a');
export const legendLabelA = document.getElementById('legend-label-a');
export const legendSwatchB = document.getElementById('legend-swatch-b');
export const legendLabelB = document.getElementById('legend-label-b');
export const shockMultiplierSlider = document.getElementById('shock-multiplier-slider');
export const shockMultiplierVal = document.getElementById('shock-multiplier-val');
export const marketChartCanvas = document.getElementById('market-chart-canvas');
export const chartAnnotationPill = document.getElementById('chart-annotation-pill');
export const chartHoverReadout = document.getElementById('chart-hover-readout');

export const episodeCounterTag = document.getElementById('episode-counter-tag');
export const suggestedFollowupsList = document.getElementById('suggested-followups-list');
export const followupForm = document.getElementById('followup-form');
export const followupInput = document.getElementById('followup-input');
export const followupSubmitBtn = document.getElementById('followup-submit-btn');

export const causalChainGrid = document.getElementById('causal-chain-grid');
export const assetMatrixList = document.getElementById('asset-matrix-list');
export const conceptsGrid = document.getElementById('concepts-grid');
