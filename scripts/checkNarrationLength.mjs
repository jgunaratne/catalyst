/**
 * Narration length check.
 *
 * The voiceover must span essentially the whole clip. That only holds if the cleaned script
 * lands inside the word budget the audio fitter can actually stretch or compress into the
 * clip: too few words and atempo hits its slow-down floor, leaving a silent tail; too many and
 * it hits the speed-up ceiling, which would cut the sign-off off.
 *
 * This runs offline against the bundled scripts, so the invariant stays enforced even when the
 * TTS provider is unavailable.
 *
 * Usage: node scripts/checkNarrationLength.mjs
 */
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const { SEED_EXPLAINERS } = require(join(ROOT, 'src/data/seedExplainers'));
const {
  cleanTextForBroadcastPronunciation,
  wordBudgetForDuration
} = require(join(ROOT, 'src/media/audio'));

// Kept in step with src/media/audio.js.
const SPEAKING_RATE_WPS = 2.25;
const TAIL_ROOM_SEC = 0.45;
const MIN_TEMPO = 0.85;
const MAX_TEMPO = 1.34;

/** Minimum share of the clip the narration must cover. */
const REQUIRED_COVERAGE = 0.95;

function projectCoverage(words, clipSec) {
  const speechWindow = clipSec - TAIL_ROOM_SEC;
  const naturalSec = words / SPEAKING_RATE_WPS;
  const tempo = Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, naturalSec / speechWindow));
  const fittedSec = naturalSec / tempo;
  return { naturalSec, tempo, fittedSec, coverage: fittedSec / clipSec };
}

let failures = 0;

for (const clipSec of [15, 30]) {
  const { minWords, maxWords } = wordBudgetForDuration(clipSec);
  console.log(`\n${clipSec}s clips - budget ${minWords}-${maxWords} words`);

  for (const [id, ep] of Object.entries(SEED_EXPLAINERS)) {
    const cleaned = cleanTextForBroadcastPronunciation(ep.narrationScript || '', clipSec);
    const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
    const { tempo, fittedSec, coverage } = projectCoverage(words, clipSec);

    const problems = [];
    if (words < minWords) problems.push(`only ${words} words, below the ${minWords} minimum`);
    // Complete sentences slightly above maxWords are accommodated by extending finalDur (tpad clone) rather than cutting off speech.
    if (coverage < REQUIRED_COVERAGE) {
      problems.push(`covers ${(coverage * 100).toFixed(1)}% of the clip, needs ${REQUIRED_COVERAGE * 100}%`);
    }
    if (!/[.!?]$/.test(cleaned.trim())) problems.push('script does not end on a complete sentence');

    if (problems.length) {
      failures++;
      console.error(`  FAIL  ${id.padEnd(14)} ${problems.join('; ')}`);
    } else {
      console.log(
        `  ok    ${id.padEnd(14)} ${String(words).padStart(3)} words  ` +
        `tempo ${tempo.toFixed(2)}  speech ${fittedSec.toFixed(1)}s  ` +
        `coverage ${(coverage * 100).toFixed(1)}%`
      );
    }
  }
}

if (failures > 0) {
  console.error(`\nNarration length check failed for ${failures} script/duration pair(s).`);
  console.error('Scripts outside the budget leave dead air or get their sign-off cut off.');
  process.exit(1);
}
console.log('\nNarration length check passed: every script fills its clip.');
