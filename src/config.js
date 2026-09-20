/**
 * Application configuration: credentials, filesystem layout, model catalogue and news sources.
 * Every other module reads its settings from here rather than hard-coding values.
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// ---- Credentials -----------------------------------------------------------
function loadEnvKey(names) {
  let key = '';
  for (const n of names) {
    if (process.env[n]) { key = process.env[n]; break; }
  }
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const pattern = new RegExp(`^\\s*(?:${names.join('|')})\\s*=\\s*(.+)\\s*$`);
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(pattern);
      if (match) key = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return key;
}

const FAL_API_KEY = loadEnvKey(['API_KEY', 'FAL_KEY']);
const GEMINI_API_KEY = loadEnvKey(['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
const USER_AGENT = 'CatalystVideoBot/1.0 (https://catalyst.dev)';

const GEMINI_MODELS = {
  narration: 'gemini-3.8-flash',
  tts: 'gemini-3.1-flash-tts-preview',
  ttsVoice: 'Charon',
  video: 'veo-3.1-fast-generate-preview',
  videoFallback: 'veo-3.1-generate-preview'
};

// ---- Filesystem layout -----------------------------------------------------
const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CACHE_DIR = path.join(ROOT_DIR, 'cache');
const VIDEOS_DIR = path.join(CACHE_DIR, 'videos');
const AUDIO_DIR = path.join(CACHE_DIR, 'audio');
const IMAGES_DIR = path.join(CACHE_DIR, 'images');

[CACHE_DIR, VIDEOS_DIR, AUDIO_DIR, IMAGES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---- Video composition ------------------------------------------------------
const CUTS_PER_DURATION = { 15: 4, 30: 8 };
const XFADE_DUR = 0.35;
// Only true cross-dissolves: wipe transitions slide one photo across another and leave a
// hard split line across the frame mid-transition.
const XFADE_TRANSITIONS = ['fade', 'fadeblack'];
const MIN_CRISP_WIDTH = 1280;
const MIN_CRISP_HEIGHT = 720;

// ---- Model endpoints --------------------------------------------------------
const FAL_ENDPOINTS = {
  imageToVideo: 'fal-ai/ltx-2.3/image-to-video/fast',
  textGeneration: 'fal-ai/any-llm',
  textToSpeech: 'fal-ai/elevenlabs/tts/turbo-v2.5',
  upscaler: 'fal-ai/esrgan'
};

const TTS_VOICE_SETTINGS = {
  voice: 'Daniel',
  stability: 0.38,
  similarity_boost: 0.78,
  style: 0.20,
  speed: 1.06
};

const VIDEO_MODELS = [
  {
    id: 'fal-ai/ltx-2.3/text-to-video/fast',
    name: 'LTX-2.3 Cinema Fast + Image-to-Video',
    provider: 'Lightricks / fal.ai',
    badge: 'DEFAULT / 8-Cut ENG B-Roll + i2v',
    description: 'Animates RSS feed source images via fal-ai/ltx-2.3/image-to-video/fast and cuts 8 documentary B-roll shots across 30.0s.'
  },
  {
    id: 'lightricks/ltx-2.5/text-to-video/fast',
    name: 'LTX-2.5 Audio+Video Fast',
    provider: 'Lightricks / fal.ai',
    badge: 'NATIVE AUDIO / 1080p',
    description: 'Generates synchronized 1080p video and native environmental soundscapes.'
  },
  {
    id: 'fal-ai/veo3.1/fast',
    name: 'Google Veo 3.1 Fast',
    provider: 'Google DeepMind / fal.ai',
    badge: 'FRONTIER / AUDIO+VIDEO',
    description: 'Google Veo 3.1 Fast tier with realistic physics and cinema lighting.'
  },
  {
    id: 'bytedance/seedance-2.0/fast/text-to-video',
    name: 'Seedance 2.0 Fast',
    provider: 'ByteDance / fal.ai',
    badge: 'MULTI-SHOT / CINEMA',
    description: 'Excels at high-contrast editorial visuals and smooth camera transitions.'
  }
];

// Live RSS Feed Sources (Wall Street Journal & Bloomberg)

// ---- News sources -----------------------------------------------------------
const RSS_FEEDS = [
  { id: 'wsj-business', name: 'Wall Street Journal / US Business', provider: 'WSJ', url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml' },
  { id: 'bloomberg-markets', name: 'Bloomberg / Global Markets', provider: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' },
  { id: 'bloomberg-econ', name: 'Bloomberg / Economics', provider: 'Bloomberg', url: 'https://feeds.bloomberg.com/economics/news.rss' },
  { id: 'wsj-markets', name: 'Wall Street Journal / Markets', provider: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' }
];

// Pre-seeded Library: Deep Source-Faithful Institutional Metrics + 8-Cut Realistic News B-Roll 30.0s Videos

const WATERMARK_DOMAINS = [
  'dreamstime.', 'alamy.', 'shutterstock.', 'ftcdn.', 'vecteezy.', '123rf.', 'depositphotos.', 'istockphoto.'
];

const LIVE_IMAGE_RSS_FEEDS = [
  'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://feeds.bbci.co.uk/news/business/rss.xml'
];

module.exports = {
  ROOT_DIR, FAL_API_KEY, GEMINI_API_KEY, GEMINI_MODELS, USER_AGENT,
  PORT, PUBLIC_DIR, CACHE_DIR, VIDEOS_DIR, AUDIO_DIR, IMAGES_DIR,
  CUTS_PER_DURATION,
  XFADE_DUR, XFADE_TRANSITIONS, MIN_CRISP_WIDTH, MIN_CRISP_HEIGHT,
  FAL_ENDPOINTS, TTS_VOICE_SETTINGS,
  VIDEO_MODELS, RSS_FEEDS, WATERMARK_DOMAINS, LIVE_IMAGE_RSS_FEEDS
};
