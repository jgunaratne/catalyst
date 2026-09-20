/**
 * End-to-end production of a news clip.
 *
 * Order matters: the picture is finished first, then the voiceover is generated and fitted to
 * the finished picture. Doing it the other way round is what produced clipped narration.
 *
 *   1. source photography that genuinely depicts the story
 *   2. guarantee each photo is crisp enough for 1080p (upscale, or animate the seed image)
 *   3. generate motion clips and assemble the cuts
 *   4. speak the script and mux it onto the completed picture
 */
const fs = require('fs');
const path = require('path');

const { IMAGES_DIR, VIDEOS_DIR, AUDIO_DIR, PUBLIC_DIR, FAL_ENDPOINTS, TTS_VOICE_SETTINGS } = require('../config');
const { callFalApi } = require('../clients/falClient');
const { downloadFile } = require('../clients/httpClient');
const { searchMultipleRealInternetImages } = require('./imageSourcing');
const { ensureHighResolutionImage, imageToDataUri } = require('../media/imageQuality');
const { stitchRealisticNewsVideo } = require('../media/videoAssembly');
const { cleanTextForBroadcastPronunciation, addVoiceoverAfterVideoComplete } = require('../media/audio');

const MAX_SOURCE_IMAGES = 8;
const MIN_USABLE_IMAGE_BYTES = 8000;

/** Camera instructions for generated motion clips, one per cut so movement never repeats. */
const MOTION_PROMPTS = [
  'slow cinematic dolly push toward the subject, subtle parallax, documentary news footage',
  'steady lateral tracking shot with gentle handheld drift, broadcast news b-roll',
  'slow crane rise revealing the scene, natural light, television news footage',
  'slow pull back revealing wider context, shallow depth of field, news documentary'
];

/** Collect distinct, story-relevant photo URLs, preferring any image supplied by the caller. */
async function collectSourceImageUrls(query, sourceImageUrl) {
  const urls = [];
  if (sourceImageUrl && sourceImageUrl.startsWith('http')) urls.push(sourceImageUrl);
  for (const url of await searchMultipleRealInternetImages(query, MAX_SOURCE_IMAGES)) {
    if (url && url.startsWith('http') && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

/**
 * Download each photo and guarantee it can hold up at 1080p.
 * Returns the local paths plus the subset that remained too low-res, which the caller routes
 * to image-to-video generation rather than a hard crop.
 */
async function downloadAndQualifyImages(urls, stamp, fallbackLocalUrl) {
  const localPaths = [];
  const lowResPaths = [];
  let publicSourceUrl = null;

  for (let i = 0; i < Math.min(MAX_SOURCE_IMAGES, urls.length); i++) {
    const destPath = path.join(IMAGES_DIR, `source-${stamp}-${i}.jpg`);
    try {
      await downloadFile(urls[i], destPath);
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size <= MIN_USABLE_IMAGE_BYTES) continue;

      const qualified = await ensureHighResolutionImage(destPath);
      localPaths.push(qualified.path);
      if (qualified.stillLowRes) lowResPaths.push(qualified.path);
      if (!publicSourceUrl) publicSourceUrl = `/cache/images/${path.basename(qualified.path)}`;
    } catch (err) {
      // A single unreachable photo should never fail the render
    }
  }

  if (localPaths.length === 0 && fallbackLocalUrl && fallbackLocalUrl.startsWith('/')) {
    const existing = path.join(PUBLIC_DIR, fallbackLocalUrl);
    if (fs.existsSync(existing)) {
      localPaths.push(existing);
      publicSourceUrl = fallbackLocalUrl;
    }
  }

  return { localPaths, lowResPaths, publicSourceUrl };
}

/**
 * Pre-frame a seed image to 1280x720 (16:9) with upper-third headroom (or portrait backdrop)
 * before sending it to Veo / image-to-video so the AI video generator animates a properly
 * centered 16:9 frame without ever cutting off a person's head.
 */
function prepare16x9SeedForVideoGen(seedPath, outPath) {
  return new Promise(async (resolve) => {
    try {
      const { getImageDimensions } = require('../media/imageQuality');
      const dims = await getImageDimensions(seedPath);
      const aspect = dims.width && dims.height ? dims.width / dims.height : 1.5;
      const vf = aspect < 1.38
        ? `split[bg][fg];` +
          `[bg]scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720:(iw-1280)/2:(ih-720)*0.12,boxblur=36:4,eq=brightness=-0.26:saturation=0.65[bgc];` +
          `[fg]scale=-2:755:flags=lanczos,crop=iw:720:0:(ih-720)*0.02[fgc];` +
          `[bgc][fgc]overlay=(W-w)/2:0,setsar=1`
        : `scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720:(iw-1280)/2:(ih-720)*0.10,setsar=1`;
      const { execFile } = require('child_process');
      execFile('ffmpeg', ['-y', '-i', seedPath, '-vf', vf, '-frames:v', '1', '-q:v', '2', outPath], { timeout: 12000 }, (err) => {
        resolve(err ? seedPath : outPath);
      });
    } catch {
      resolve(seedPath);
    }
  });
}

/**
 * Generate AI-animated video shots (`clipCount` shots per video: 2 for 15s, 4 for 30s) from
 * real story photographs using Veo 3.1 (`veo-3.1-fast-generate-preview`) or LTX-2.3, alternating
 * with documentary camera cuts in `stitchRealisticNewsVideo`.
 */
async function generateMotionClips({ localPaths, lowResPaths, clipCount, stamp }) {
  const seeds = [];
  for (const p of [...lowResPaths, ...localPaths]) {
    if (p && !seeds.includes(p) && seeds.length < clipCount) seeds.push(p);
  }
  if (!seeds.length) return [];

  const results = await Promise.all(seeds.map(async (seedPath, idx) => {
    const motion = MOTION_PROMPTS[idx % MOTION_PROMPTS.length];
    const framedSeed = path.join(IMAGES_DIR, `tmp-seed169-${stamp}-${idx}.jpg`);
    const readyPath = await prepare16x9SeedForVideoGen(seedPath, framedSeed);
    const dataUri = imageToDataUri(readyPath);
    try { if (readyPath !== seedPath && fs.existsSync(readyPath)) fs.unlinkSync(readyPath); } catch {}
    if (!dataUri) return null;

    return callFalApi(FAL_ENDPOINTS.imageToVideo, {
      image_url: dataUri,
      prompt: `${motion}. Realistic television news b-roll footage with natural subtle subject motion, ambient life, and realistic physics. Keep all faces, people, and architecture faithful to the photograph with zero surreal morphing.`
    }, 120000).then(async (falRes) => {
      const remoteUrl = falRes?.video?.url || falRes?.url;
      if (!remoteUrl) return null;
      const localClip = path.join(VIDEOS_DIR, `tmp-i2v-${stamp}-${idx}.mp4`);
      await downloadFile(remoteUrl, localClip);
      return localClip;
    }).catch(() => null);
  }));

  return results.filter(Boolean);
}

/** Speak the script and lay it over the finished picture. Returns the public audio URL. */
async function addNarration({ script, silentVideoPath, finalVideoPath, durationSec, stamp }) {
  const spokenScript = cleanTextForBroadcastPronunciation(script, durationSec);
  const rawAudioPath = path.join(AUDIO_DIR, `raw-${stamp}.mp3`);
  const fittedAudioPath = path.join(AUDIO_DIR, `story${durationSec}-${stamp}.mp3`);

  try {
    const tts = await callFalApi(FAL_ENDPOINTS.textToSpeech, {
      text: spokenScript,
      ...TTS_VOICE_SETTINGS
    }, 35000);
    await downloadFile(tts.audio.url, rawAudioPath);
    await addVoiceoverAfterVideoComplete(silentVideoPath, rawAudioPath, fittedAudioPath, finalVideoPath, durationSec);
    return `/cache/audio/story${durationSec}-${stamp}.mp3`;
  } catch (err) {
    console.warn('Voiceover unavailable, publishing silent cut:', err.message);
    fs.copyFileSync(silentVideoPath, finalVideoPath);
    return null;
  } finally {
    try { if (fs.existsSync(rawAudioPath)) fs.unlinkSync(rawAudioPath); } catch (_) {}
    try { if (fs.existsSync(silentVideoPath)) fs.unlinkSync(silentVideoPath); } catch (_) {}
  }
}

/**
 * Produce a finished clip.
 * @returns {Promise<object>} payload describing the rendered video for the client
 */
async function produceNewsVideo({ headline, prompt, scenes, narrationScript, sourceImageUrl, durationSec }) {
  const startedAt = Date.now();
  const stamp = startedAt;
  const query = headline || prompt;

  const imageUrls = await collectSourceImageUrls(query, sourceImageUrl);
  const { localPaths, lowResPaths, publicSourceUrl } =
    await downloadAndQualifyImages(imageUrls, stamp, sourceImageUrl);

  const scenePrompts = (Array.isArray(scenes) && scenes.length >= 2)
    ? scenes.map(s => s.prompt || query)
    : [query, `${query} — news photojournalism`];

  const { buildAnimatedMarketChartClip } = require('../media/chartCut');
  const { fetchLiveYahooFinanceChartForStory } = require('./marketData');

  const chartClipCandidate = path.join(VIDEOS_DIR, `tmp-chart-${stamp}.mp4`);
  const [motionClips, chartClipPath] = await Promise.all([
    generateMotionClips({
      localPaths,
      lowResPaths,
      clipCount: durationSec === 30 ? 6 : 3,
      scenePrompts,
      stamp
    }),
    fetchLiveYahooFinanceChartForStory(query)
      .then(cd => (cd && cd.seriesA && cd.seriesB) ? buildAnimatedMarketChartClip(cd, query, chartClipCandidate, 4.3) : null)
      .catch(() => null)
  ]);

  const silentFilename = `silent${durationSec}-${stamp}.mp4`;
  await stitchRealisticNewsVideo(motionClips, localPaths, null, silentFilename, durationSec, chartClipPath);

  const stitchedFilename = `stitched${durationSec}-${stamp}.mp4`;
  const audioUrl = await addNarration({
    script: narrationScript || query,
    silentVideoPath: path.join(VIDEOS_DIR, silentFilename),
    finalVideoPath: path.join(VIDEOS_DIR, stitchedFilename),
    durationSec,
    stamp
  });

  // Remove intermediate motion cuts, chart cut, and non-served source images
  const keptImgFile = publicSourceUrl && publicSourceUrl.startsWith('/cache/images/')
    ? path.join(IMAGES_DIR, path.basename(publicSourceUrl.split('?')[0]))
    : null;
  for (const p of [...(motionClips || []), chartClipCandidate, ...(localPaths || []), ...(lowResPaths || [])]) {
    if (p && p !== keptImgFile) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
    }
  }

  return {
    videoUrl: `/cache/videos/${stitchedFilename}`,
    audioUrl,
    sourceImageUrl: publicSourceUrl || imageUrls[0] || '/images/source-fed-warsh.jpg',
    sourceImageUrls: imageUrls.slice(0, 4),
    usedOriginalFeedImage: true,
    ttsModelUsed: 'Gemini 3.1 Flash TTS (fitted after picture lock)',
    modelUsed: 'Veo 3.1 AI Video + Animated Yahoo Finance Chart & Numbers',
    elapsedSec: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    duration: durationSec
  };
}

module.exports = { produceNewsVideo };
