/**
 * Voiceover post-production: duration probing, broadcast pronunciation cleanup, and fitting
 * the narration to the finished picture so speech fills the clip and NEVER cuts off mid-sentence
 * or at the end of the video.
 */
const { execFile } = require('child_process');

function getAudioDurationSec(filePath) {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      { timeout: 8000 },
      (err, stdout) => {
        if (err) return resolve(0);
        const val = parseFloat(String(stdout || '').trim());
        resolve(Number.isFinite(val) && val > 0 ? val : 0);
      }
    );
  });
}

const SPEAKING_RATE_WPS = 2.25;
const TAIL_ROOM_SEC = 0.45;
const MIN_TEMPO = 0.85;
const MAX_TEMPO = 1.34;

function wordBudgetForDuration(targetSec) {
  const speechWindow = Math.max(4.0, Number(targetSec) - TAIL_ROOM_SEC);
  return {
    minWords: Math.ceil(speechWindow * SPEAKING_RATE_WPS * MIN_TEMPO),
    maxWords: Math.floor(speechWindow * SPEAKING_RATE_WPS * MAX_TEMPO)
  };
}

/**
 * Clean broadcast script for natural TTS delivery.
 *
 * CRITICAL INVARIANT: Never slice a sentence in half (`words.slice(0, maxWords)`). Slicing a
 * sentence mid-clause causes the newscaster voice to stop abruptly in the middle of a thought,
 * which sounds like the audio was cut off. Every sentence included here is kept 100% intact
 * from its opening capital letter through its closing period.
 */
function cleanTextForBroadcastPronunciation(rawText, targetSec = 15) {
  const text = String(rawText || '')
    .replace(/\b(Act|Part|Scene|Section|Chapter)\s+[0-9IVX]+[:.\s/-]*/gi, '')
    .replace(/\bbps\b/gi, 'basis points')
    .replace(/\bCoWoS\b/gi, 'advanced chip packaging')
    .replace(/\bHBM3e\b/gi, 'high bandwidth memory')
    .replace(/\bHBM\b/gi, 'high bandwidth memory')
    .replace(/\bSaaS\b/gi, 'enterprise software')
    .replace(/\bNRR\b/gi, 'net retention')
    .replace(/\bSG&A\b/gi, 'operating')
    .replace(/\bCapEx\b/gi, 'capital spending')
    .replace(/\bPPAs\b/gi, 'power agreements')
    .replace(/\bPPA\b/gi, 'power agreement')
    .replace(/\b24\/7\b/g, 'twenty-four seven')
    .replace(/\bkW\b/g, ' kilowatts')
    .replace(/\bGW\b/g, ' gigawatts')
    .replace(/\/mo\b/gi, ' per month')
    .replace(/%/g, ' percent')
    .replace(/\$([0-9]+)/g, '$1 dollars ')
    .replace(/\s+/g, ' ')
    .trim();

  const { minWords, maxWords } = wordBudgetForDuration(targetSec);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Accumulate COMPLETE sentences only — never chop a sentence mid-way.
  const kept = [];
  let wordCount = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const sWords = trimmed.split(/\s+/).filter(Boolean).length;

    if (wordCount >= minWords) break;
    kept.push(/[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`);
    wordCount += sWords;
  }

  let result = kept.join(' ').trim();
  if (result && !/[.!?]$/.test(result)) result += '.';
  return result;
}

/**
 * Fit the completed voiceover onto the completed silent video without EVER cutting off the
 * end of the voiceover:
 *   1. Strip leading/trailing dead air from `rawMp3Path` and apply `atempo` into `outMp3Path`
 *      WITHOUT any `-t` truncation on the audio stream.
 *   2. Measure the exact duration of the tempo-fitted `outMp3Path` (`actualSpeechDur`).
 *   3. Set `finalDur = Math.max(videoDur, actualSpeechDur + 0.55)` and clone the last video
 *      frame (`tpad=stop_mode=clone`) for `finalDur - videoDur` so the video always outlasts
 *      the final spoken syllable by at least 0.55 seconds.
 */
async function addVoiceoverAfterVideoComplete(silentVideoPath, rawMp3Path, outMp3Path, finalVideoPath, targetSec = 15.0) {
  const videoDur = (await getAudioDurationSec(silentVideoPath)) || targetSec;
  const rawAudioDur = await getAudioDurationSec(rawMp3Path);

  const targetSpeechDur = Math.max(4.0, videoDur - TAIL_ROOM_SEC);
  const ratio = rawAudioDur > 1.0
    ? Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, rawAudioDur / targetSpeechDur))
    : 1.0;

  // Step 1: Render the tempo-fitted speech into outMp3Path with NO `-t` cutoff so the final
  // word is guaranteed 100% intact.
  await new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      [
        '-y', '-i', rawMp3Path,
        '-af', `silenceremove=start_periods=1:start_silence=0.03:start_threshold=-46dB,` +
               `atempo=${ratio.toFixed(4)},volume=2.4,alimiter=limit=0.95`,
        '-c:a', 'libmp3lame', '-b:a', '192k',
        outMp3Path
      ],
      { timeout: 30000 },
      (err) => (err ? reject(err) : resolve(outMp3Path))
    );
  });

  // Step 2: Probe the actual fitted speech duration on disk.
  const actualSpeechDur = (await getAudioDurationSec(outMp3Path)) || (rawAudioDur / ratio);
  const finalDur = Math.max(videoDur, actualSpeechDur + 0.55);

  // Step 3: Mux the video (cloning the final frame if speech runs past videoDur) with the
  // padded audio track so the voiceover never cuts off early.
  return new Promise((resolve, reject) => {
    const padSec = Math.max(0.6, finalDur - videoDur + 0.8).toFixed(2);
    execFile(
      'ffmpeg',
      [
        '-y',
        '-i', silentVideoPath,
        '-i', outMp3Path,
        '-vf', `tpad=stop_mode=clone:stop_duration=${padSec}`,
        '-af', `apad=whole_dur=${finalDur.toFixed(2)}`,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
        '-movflags', '+faststart',
        '-t', finalDur.toFixed(2),
        finalVideoPath
      ],
      { timeout: 45000 },
      (err) => (err ? reject(err) : resolve(finalVideoPath))
    );
  });
}

module.exports = {
  getAudioDurationSec,
  wordBudgetForDuration,
  cleanTextForBroadcastPronunciation,
  addVoiceoverAfterVideoComplete
};
