/**
 * Single source of truth for client side state, shared by every module.
 */
export const state = {
  models: [],
  selectedModelId: 'fal-ai/ltx-2.3/text-to-video/fast',
  selectedDuration: 15,
  thread: [],
  activeEpisodeIndex: 0,
  aspectRatio: '16:9',
  hudVisible: true,
  voiceoverEnabled: true,
  promptLayersExpanded: true,
  isRenderingVideo: false,
  renderTimerInterval: null,
  canvasAnimFrame: null,
  chartMode: 'trajectory',
  shockMultiplier: 1.0,
  hoverIndex: null,
  inVideoOverlayMode: 'auto'
};

state.rssItems = [];
state.rssFilter = 'all';

/** Headline text used when a starter playlist card is opened. */
export const PRESET_INPUT_MAP = {
  'fed-warsh': 'Fed raises rates a quarter point in first move of Warsh era',
  'retail-sales': 'Retail sales last month surged by the most since March, when a spike in gasoline prices and a boost from tax refunds helped account for higher spending totals.',
  'eu-canada': 'EU chief floats associate membership for Canada after U.S. trade attacks',
  'wsj-ai': 'https://www.wsj.com/cio-journal/why-companies-are-unlikely-to-hit-pause-on-ai-9a4f6818'
};
