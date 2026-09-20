/**
 * Inference API client: routes through fal.ai first and automatically switches to the direct
 * Google Gemini API (`GEMINI_API_KEY` in `.env`) whenever fal.ai responds with a credit/billing
 * lock (HTTP 402/403 TOP_UP) or is unusable.
 *
 * Direct Gemini mapping:
 *   - Copy generation (`fal-ai/any-llm`)           -> `gemini-3.8-flash`
 *   - Broadcast TTS (`fal-ai/elevenlabs/...`)      -> `gemini-3.1-flash-tts-preview`
 *   - Video motion (`fal-ai/ltx-2.3/...`)          -> `veo-3.1-fast-generate-preview`
 *   - Image upscaling (`fal-ai/esrgan`)            -> local Lanczos + unsharp upscale
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const {
  FAL_API_KEY,
  GEMINI_API_KEY,
  GEMINI_MODELS,
  FAL_ENDPOINTS,
  AUDIO_DIR,
  IMAGES_DIR
} = require('../config');

let falOutOfCredit = false;

function isCreditOrAuthError(err) {
  const msg = String(err?.message || '');
  return (
    !FAL_API_KEY ||
    /status 401|status 402|status 403|TOP_UP|locked|quota|credit|balance/i.test(msg)
  );
}

function rawFalCall(endpoint, payload, timeoutMs = 110000) {
  return new Promise((resolve, reject) => {
    if (!FAL_API_KEY) {
      return reject(new Error('fal.ai status 401: FAL_API_KEY is empty'));
    }
    const body = JSON.stringify(payload);
    const req = https.request(
      `https://fal.run/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: timeoutMs
      },
      (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`fal.ai status ${res.statusCode}: ${data.slice(0, 300)}`));
            } else {
              resolve(parsed);
            }
          } catch (err) {
            reject(new Error(`Invalid JSON from fal.ai: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('fal.ai request timed out'));
    });
    req.write(body);
    req.end();
  });
}

// ---- Direct Google Gemini API (v1beta) -------------------------------------

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function postGeminiJson(urlPath, bodyObj, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      return reject(new Error('GEMINI_API_KEY is not set in .env'));
    }
    const sep = urlPath.includes('?') ? '&' : '?';
    const fullUrl = `${GEMINI_BASE}/${urlPath}${sep}key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const body = JSON.stringify(bodyObj);

    const req = https.request(
      fullUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: timeoutMs
      },
      (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400 || parsed.error) {
              reject(new Error(`Gemini status ${res.statusCode}: ${parsed?.error?.message || data.slice(0, 260)}`));
            } else {
              resolve(parsed);
            }
          } catch (err) {
            reject(new Error(`Invalid JSON from Gemini: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini request timed out'));
    });
    req.write(body);
    req.end();
  });
}

function getGeminiJson(urlPath, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const sep = urlPath.includes('?') ? '&' : '?';
    const fullUrl = `${GEMINI_BASE}/${urlPath}${sep}key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const req = https.get(fullUrl, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400 || parsed.error) {
            reject(new Error(`Gemini status ${res.statusCode}: ${parsed?.error?.message || data.slice(0, 240)}`));
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(new Error(`Invalid JSON from Gemini poll: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini poll timed out'));
    });
  });
}

async function fallbackGemini38Flash(payload, timeoutMs = 45000) {
  const prompt = String(payload?.prompt || '');
  const systemPrompt = payload?.system_prompt ? String(payload.system_prompt) : '';
  const reqBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: typeof payload?.temperature === 'number' ? payload.temperature : 0.35
    }
  };
  if (systemPrompt) {
    reqBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  const res = await postGeminiJson(
    `models/${GEMINI_MODELS.narration}:generateContent`,
    reqBody,
    timeoutMs
  );
  const parts = res?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('').trim();
  return { output: text, modelUsed: GEMINI_MODELS.narration };
}

function writePcm24kToMp3(pcmBuffer, outMp3Path) {
  return new Promise((resolve, reject) => {
    const tmpPcm = `${outMp3Path}.s16le`;
    try {
      fs.writeFileSync(tmpPcm, pcmBuffer);
    } catch (err) {
      return reject(err);
    }
    execFile(
      'ffmpeg',
      [
        '-y',
        '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmpPcm,
        '-c:a', 'libmp3lame', '-b:a', '192k',
        outMp3Path
      ],
      { timeout: 25000 },
      (err) => {
        try { fs.unlinkSync(tmpPcm); } catch { /* ignore */ }
        if (err) return reject(err);
        resolve(outMp3Path);
      }
    );
  });
}

async function fallbackGemini31Tts(payload, timeoutMs = 45000) {
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('Empty text passed to Gemini 3.1 TTS');

  const reqBody = {
    contents: [{
      parts: [{
        text: `Read this financial news report in a clear, authoritative television newscaster voice at a brisk, steady broadcast pace:\n\n${text}`
      }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: GEMINI_MODELS.ttsVoice
          }
        }
      }
    }
  };

  const res = await postGeminiJson(
    `models/${GEMINI_MODELS.tts}:generateContent`,
    reqBody,
    timeoutMs
  );
  const inline = res?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline || !inline.data) {
    throw new Error('Gemini 3.1 TTS response contained no audio data');
  }
  const pcmBuffer = Buffer.from(inline.data, 'base64');
  const outMp3 = path.join(
    AUDIO_DIR,
    `gemini-tts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`
  );
  await writePcm24kToMp3(pcmBuffer, outMp3);
  return {
    audio: { url: `file://${outMp3}` },
    url: `file://${outMp3}`,
    ttsModelUsed: GEMINI_MODELS.tts
  };
}

let veoRoundRobin = 0;
const VEO_MODEL_POOL = [
  'veo-3.1-fast-generate-preview',
  'veo-3.1-generate-preview',
  'veo-3.1-lite-generate-preview'
];

async function fallbackVeoVideo(payload, timeoutMs = 120000) {
  const prompt = String(payload?.prompt || 'Subtle documentary camera movement on this real scene.');
  const dataUri = String(payload?.image_url || '');
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);

  const instance = { prompt };
  if (match) {
    instance.image = {
      mimeType: match[1],
      bytesBase64Encoded: match[2]
    };
  }

  const startIdx = (veoRoundRobin++) % VEO_MODEL_POOL.length;
  let startRes = null;
  let chosenModel = VEO_MODEL_POOL[startIdx];

  for (let attempt = 0; attempt < VEO_MODEL_POOL.length; attempt++) {
    chosenModel = VEO_MODEL_POOL[(startIdx + attempt) % VEO_MODEL_POOL.length];
    try {
      startRes = await postGeminiJson(
        `models/${chosenModel}:predictLongRunning`,
        {
          instances: [instance],
          parameters: {
            aspectRatio: '16:9',
            durationSeconds: 4
          }
        },
        30000
      );
      if (startRes?.name) break;
    } catch (err) {
      if (attempt < VEO_MODEL_POOL.length - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  const opName = startRes?.name;
  if (!opName) throw new Error('Veo did not return an operation name');

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4500));
    const poll = await getGeminiJson(opName, 20000);
    if (poll?.done) {
      if (poll.error) {
        throw new Error(`Veo error: ${poll.error.message || JSON.stringify(poll.error)}`);
      }
      const uri =
        poll?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        poll?.response?.videos?.[0]?.uri;
      if (!uri) throw new Error('Veo completed without a video URI');
      const sep = uri.includes('?') ? '&' : '?';
      const authedUrl = `${uri}${sep}key=${encodeURIComponent(GEMINI_API_KEY)}`;
      console.log(`Generated Veo 3.1 animated shot via ${chosenModel}`);
      return {
        video: { url: authedUrl },
        url: authedUrl,
        modelUsed: chosenModel
      };
    }
  }
  throw new Error('Veo operation timed out before completion');
}

function fallbackLocalUpscale(payload) {
  return new Promise((resolve, reject) => {
    const dataUri = String(payload?.image_url || '');
    const m = dataUri.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
    if (!m) return reject(new Error('No base64 image passed to local upscaler'));

    const scale = Number(payload?.scale) >= 4 ? 4 : 2;
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const srcPath = path.join(IMAGES_DIR, `tmp-upsrc-${stamp}.jpg`);
    const outPath = path.join(IMAGES_DIR, `tmp-upout-${stamp}.jpg`);

    try {
      fs.writeFileSync(srcPath, Buffer.from(m[1], 'base64'));
    } catch (err) {
      return reject(err);
    }

    execFile(
      'ffmpeg',
      [
        '-y', '-i', srcPath,
        '-vf', `scale=iw*${scale}:ih*${scale}:flags=lanczos,unsharp=5:5:0.8:5:5:0.0`,
        '-q:v', '2',
        outPath
      ],
      { timeout: 20000 },
      (err) => {
        try { fs.unlinkSync(srcPath); } catch { /* ignore */ }
        if (err) return reject(err);
        resolve({
          image: { url: `file://${outPath}` },
          url: `file://${outPath}`
        });
      }
    );
  });
}

async function dispatchToGeminiFallback(endpoint, payload, timeoutMs) {
  if (endpoint === 'fal-ai/any-llm' || endpoint === FAL_ENDPOINTS.textGeneration) {
    return fallbackGemini38Flash(payload, timeoutMs);
  }
  if (endpoint === FAL_ENDPOINTS.textToSpeech || /tts|elevenlabs/i.test(endpoint)) {
    return fallbackGemini31Tts(payload, timeoutMs);
  }
  if (endpoint === FAL_ENDPOINTS.imageToVideo || /image-to-video|text-to-video|ltx/i.test(endpoint)) {
    return fallbackVeoVideo(payload, timeoutMs);
  }
  if (endpoint === FAL_ENDPOINTS.upscaler || /esrgan|upscal/i.test(endpoint)) {
    return fallbackLocalUpscale(payload);
  }
  throw new Error(`No Gemini fallback registered for endpoint: ${endpoint}`);
}

async function callFalApi(endpoint, payload, timeoutMs = 110000) {
  if (!falOutOfCredit) {
    try {
      return await rawFalCall(endpoint, payload, timeoutMs);
    } catch (err) {
      if (isCreditOrAuthError(err) && GEMINI_API_KEY) {
        falOutOfCredit = true;
        RESOLVED_GEMINI_FLASH_MODEL = GEMINI_MODELS.narration;
        console.log(
          `fal.ai out of credit — switched to GEMINI_API_KEY: ` +
          `${GEMINI_MODELS.narration} (copy) + ${GEMINI_MODELS.tts} (voiceover) + ${GEMINI_MODELS.video} (video)`
        );
      } else {
        throw err;
      }
    }
  }
  return dispatchToGeminiFallback(endpoint, payload, timeoutMs);
}

let RESOLVED_GEMINI_FLASH_MODEL = GEMINI_MODELS.narration;
let geminiModelResolution = null;

function parseFlashVersion(modelId) {
  const m = modelId.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function resolveLatestGeminiFlashModel() {
  if (geminiModelResolution) return geminiModelResolution;
  geminiModelResolution = rawFalCall('fal-ai/any-llm', { model: '__probe__', prompt: 'x' }, 15000)
    .catch((err) => {
      if (isCreditOrAuthError(err) && GEMINI_API_KEY) {
        falOutOfCredit = true;
        RESOLVED_GEMINI_FLASH_MODEL = GEMINI_MODELS.narration;
        console.log(
          `Narration copy model: ${RESOLVED_GEMINI_FLASH_MODEL} (direct GEMINI_API_KEY; ` +
          `TTS: ${GEMINI_MODELS.tts}, Video: ${GEMINI_MODELS.video})`
        );
        return RESOLVED_GEMINI_FLASH_MODEL;
      }
      const msg = String(err.message || '');
      const candidates = [...msg.matchAll(/'(google\/gemini[^']*)'/g)].map(m => m[1]);
      const flashes = candidates.filter(c => /flash/i.test(c) && !/lite|8b/i.test(c));
      if (flashes.length) {
        flashes.sort((a, b) => parseFlashVersion(b) - parseFlashVersion(a));
        RESOLVED_GEMINI_FLASH_MODEL = flashes[0];
      }
      console.log(`Narration copy model: ${RESOLVED_GEMINI_FLASH_MODEL} (latest Gemini Flash available on fal)`);
      return RESOLVED_GEMINI_FLASH_MODEL;
    })
    .then(() => RESOLVED_GEMINI_FLASH_MODEL);
  return geminiModelResolution;
}
resolveLatestGeminiFlashModel();

module.exports = {
  callFalApi,
  resolveLatestGeminiFlashModel,
  getNarrationModel: () => RESOLVED_GEMINI_FLASH_MODEL,
  isUsingGeminiFallback: () => falOutOfCredit
};
