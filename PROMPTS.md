# Engineering & Model Prompts — Catalyst Reel (`finvideo`)

This document records the engineering prompts used to architect, iterate on, and verify **Catalyst Reel**, alongside the production LLM/TTS/video prompts embedded in the runtime pipeline. All credentials and environment-specific identifiers have been sanitized.

---

## Part I — Architectural & Engineering Prompts

### 1. Full-Stack Broadcast Video Pipeline & Post-Picture Audio Synchronization
> **Prompt:**
> Architect a zero-dependency Node.js media pipeline and single-page financial news studio that turns live Wall Street Journal and Bloomberg RSS wire stories into 15-second (default) and 30-second (optional) broadcast video explainers at 1920×1080 (`25 fps`, H.264 + AAC, `-movflags +faststart`).
>
> Enforce the following production ordering and invariants:
> 1. **Picture-first assembly:** Synthesize and stitch the complete visual timeline before generating or muxing the voiceover track so audio is fitted to an exact measured frame duration rather than an estimated duration.
> 2. **Bidirectional `atempo` voiceover fitting:** Probe the rendered silent MP4 duration $D_v$ and raw synthesized TTS duration $D_a$ via `ffprobe`. Compute the target speech window $D_s = \max(4.0, D_v - 0.45)$ and apply a bounded `atempo` ratio $r = \text{clamp}(D_a / D_s, 0.86, 1.26)$ followed by `volume=2.4,alimiter=limit=0.95,apad=whole_dur` so the spoken report covers $\ge 97\%$ of the video duration without ever clipping the final clause.
> 3. **Calibrated word-budget enforcement:** Derive `[minWords, maxWords]` from the measured post-expansion TTS delivery rate (`1.9 words/sec` after expanding `%` $\to$ `percent`, `bps` $\to$ `basis points`, and `$N` $\to$ `N dollars`) so sentence selection in `cleanTextForBroadcastPronunciation` never undershoots `MIN_TEMPO` (leaving trailing dead air) or overshoots `MAX_TEMPO` (truncating the sign-off).

---

### 2. Quantitative Grounding & Real-Time Market Telemetry Injection
> **Prompt:**
> Ensure the generated anchor script and accompanying visualizations never rely on generic commentary or fabricated series. Before invoking the LLM for script synthesis:
> 1. Scrape and sanitize the source article body from the wire URL (`fetchArticleTextFromUrl`) and pair it with live 8-week historical series queried from the Yahoo Finance v8 chart endpoint (`/v8/finance/chart/{symbol}?range=3mo&interval=1wk`).
> 2. Serialize the resolved `seriesA` and `seriesB` time series (`name`, `unit`, `values[]`) into a `VERIFIED CURRENT MARKET DATA` context block injected directly into the narration prompt.
> 3. Require every script to cite at least two concrete numerical figures at their reported precision (e.g., `4.74 percent`, `$12.4 billion`, `260 basis points`), at least one named decision-maker or institution, and at least one specific company, security, or geography—explicitly banning filler phrases (`"markets moved"`, `"investors are watching"`, `"amid uncertainty"`).

---

### 3. Four-Stage Visual Subject Planning, Homonym Disambiguation & Resolution Gate
> **Prompt:**
> Design a multi-stage visual sourcing and verification pipeline (`src/services/imageSourcing.js` and `src/media/imageQuality.js`) that eliminates semantic homonyms (e.g., preventing a story about *"stocks sink"* from retrieving a kitchen sink, *"gold settles lower"* from retrieving a goldfish, or *"Amazon shutdown"* from retrieving the Amazon rainforest) and enforces 1080p visual fidelity:
> 1. **Stage 1 — LLM Visual Subject Planning:** Prompt Gemini Flash to translate the headline into `maxCount + 8` concrete, literal, photographable physical subjects paired with canonical Wikipedia article titles (`[{ subject, wikiTitle }]`), with explicit negative constraints against metaphorical or biological/entertainment homonyms.
> 2. **Stage 2 — Lexical & Category Disambiguation Gate:** Validate each candidate via the Wikipedia REST Summary API (`/api/rest_v1/page/summary/{Title}`) and Wikimedia Commons two-step `imageinfo` API. Reject disambiguation pages, non-photographic media, watermarked stock domains, and any summary matching `IRRELEVANT_TOPIC_PATTERN` (taxonomy/species, films, albums, fictional characters, household fixtures, sports). Require token overlap between the planned financial subject and the resolved article.
> 3. **Stage 3 — LLM Post-Retrieval Audit & Top-Up Pass:** Run a secondary LLM verification pass (`rejectIrrelevantImagesWithLLM`) over the shortlisted image descriptors against the headline. If fewer than 6 distinct images survive, execute a second subject-planning pass targeting institutional, infrastructure, and sector-specific angles so no single photograph is ever repeated within a video.
> 4. **Stage 4 — Resolution Qualification & Lanczos/ESRGAN Upscaling:** Probe every downloaded image with `ffprobe`. Any frame below `1280×720` must be upscaled (`4x` if width `< 640`, else `2x`) via `fal-ai/esrgan` (`RealESRGAN_x4plus`) or high-precision `scale=flags=lanczos,unsharp=5:5:0.8` before entering the composition timeline.

---

### 4. Broadcast Camera Choreography & Artifact-Free Cross-Dissolve Assembly
> **Prompt:**
> Replace static crops and wipe transitions with realistic documentary camera choreography and clean optical dissolves (`src/media/videoAssembly.js` and `src/services/videoPipeline.js`):
> 1. Implement an 8-profile Ken Burns motion generator (`buildAnimatedClipFromImage`) cycling across distinct camera vectors per cut (`centre push-in`, `pull-out reveal`, `lateral pan L→R`, `upper-third push-in`, `lateral pan R→L`, `vertical tilt down`, `diagonal drift`, `vertical tilt up`) rendered at `2560×1440` supersampling prior to `1920×1080` downscaling.
> 2. Join cuts using chained FFmpeg `xfade` filters restricted strictly to true cross-dissolves (`fade`, `fadeblack`) with `XFADE_DUR = 0.35s`. Compute per-cut trim duration as:
>    $$\text{cutDur} = \frac{D_{\text{target}} + (N_{\text{cuts}} - 1) \cdot d_{\text{xfade}}}{N_{\text{cuts}}}$$
>    and pad each input stream with `tpad=stop_mode=clone:stop_duration=3,trim=0:{cutDur},setpts=PTS-STARTPTS` so transition offsets $o_k = k \cdot (\text{cutDur} - d_{\text{xfade}})$ never underrun and produce exact `15.000s` and `30.000s` outputs.
> 3. Prevent surreal AI hallucinations or facial/architectural warping by never feeding metaphorical scene descriptions into image-to-video models; restrict generative motion strictly to low-resolution fallback seeds with an explicit anti-morphing constraint (`"Preserve the exact real photograph with zero morphing, zero warping, and zero added or transformed objects"`).

---

### 5. Multi-Provider Inference Resilience (`fal.ai` $\to$ Direct Google Gemini / Veo Fallback)
> **Prompt:**
> Engineer a fault-tolerant inference client (`src/clients/falClient.js`) that transparently fails over from `fal.ai` to direct Google Gemini v1beta endpoints (`GEMINI_API_KEY`) the moment `fal.ai` returns an authentication, quota, or billing lock (`HTTP 401/402/403`, `TOP_UP`):
> - **Text & Script Synthesis (`fal-ai/any-llm`):** Fail over to `models/gemini-3.8-flash:generateContent`, preserving system instructions and temperature configuration.
> - **Broadcast Voiceover (`fal-ai/elevenlabs/tts/turbo-v2.5`):** Fail over to `models/gemini-3.1-flash-tts-preview:generateContent` (`responseModalities: ["AUDIO"]`, `voiceName: "Charon"`). Decode the base64 `s16le` `24 kHz` mono PCM payload, strip leading/trailing buffer silence via `silenceremove`, and transcode to `192 kbps` MP3.
> - **Image-to-Video (`fal-ai/ltx-2.3/image-to-video/fast`):** Fail over to `models/veo-3.1-fast-generate-preview:predictLongRunning` with inline base64 seed imagery, polling the long-running operation until completion and streaming the authenticated media URI.
> - **Media Storage Separation:** Store all generated and cached MP4s, MP3s, and extracted `16:9` poster thumbnails (`thumb-{id}.jpg`) in a dedicated top-level `cache/{videos,audio,images}` hierarchy served with HTTP `206 Partial Content` byte-range support, keeping `public/` strictly for immutable application source and UI assets.

---

### 6. Design System Constraints, Player Transport & Guaranteed First-Play Audio
> **Prompt:**
> Structure the client application (`public/js/{state,dom,api,player,charts,storyboard,app}.js` and `public/css/{tokens,base,player,watch}.css`) around strict visual and behavioral invariants:
> 1. **Typography & Surface Hierarchy:** Restrict the entire UI to **at most 2 font families** (`Plus Jakarta Sans` for UI/editorial copy, `IBM Plex Mono` for quantitative readouts and timestamps) and **3 tokenized font sizes** (`--text-sm: 12px`, `--text-md: 14px`, `--text-lg: 18px`). Eliminate nested card-in-card containers, remove all DOM overlays from the `<video>` viewport, and position synchronized captions, interactive dual-series Canvas market charts, and the auto-advancing playlist beneath/beside the player.
> 2. **Procedural Render Waveform:** While a video is rendering, drive an HTML5 `<canvas>` background (`startLiveStoryboardCanvas`) with 7 phase-shifted travelling sine-wave layers (`phase = x * wavelength - elapsed * speed`) and a sweeping highlight gradient.
> 3. **Transport & Guaranteed Unmuted Playback:** Provide an SVG Play/Pause state toggle, `Next`, `Replay`, and an inline `Regenerate` action that locks concurrent render triggers and spins while re-running the pipeline. Pre-warm a shared Web Audio `AudioContext` (`defaultMuted = false`, `muted = false`); if browser autoplay policy forces an initial muted start prior to user interaction, bind a one-shot capture listener across `pointermove`, `pointerdown`, `wheel`, `keydown`, and `touchstart` that immediately unmutes and resets `currentTime = 0` so the viewer hears the broadcast from the first syllable.

---

### 7. Modular Codebase Refactoring, AST Scope Verification & Headless Browser E2E Testing
> **Prompt:**
> Refactor the backend (`server.js` + `src/{config,clients,services,media,routes,data}`) and frontend (`public/js/*.js` ES modules) into single-responsibility modules and build an automated verification suite (`npm run check` / `npm run check:playback`) that prevents regressions:
> 1. **`scripts/checkModuleScopes.mjs`:** Parse every browser ES module and CommonJS server module with `acorn` (`ecmaVersion: 'latest'`), construct a full lexical scope tree (`ImportDeclaration`, `VariableDeclarator`, `FunctionDeclaration`, `CatchClause`, destructuring patterns), and fail with exit code `1` on any identifier reference that resolves to neither an enclosing declaration nor the target environment's global allowlist.
> 2. **`scripts/checkNarrationLength.mjs`:** Statically verify every seeded story across both `15s` and `30s` targets to prove the post-pronunciation word count lands inside `[minWords, maxWords]` and achieves $\ge 95\%$ projected clip coverage.
> 3. **`scripts/checkPlayback.mjs`:** Launch headless Chrome with the DevTools Protocol (`Runtime`, `Page`, `Log`), navigate to the live studio, assert zero uncaught exceptions or console errors, trigger real user-gesture clicks on `#play-pause-btn` and `#regenerate-video-btn`, and verify that `HTMLVideoElement.currentTime` advances, `data-state` toggles, and the busy lock prevents duplicate renders.

---

## Part II — Production Runtime Prompts (`src/services/`)

### A. Broadcast Script & Telemetry Synthesis Prompt (`src/services/narration.js`)
Used with `gemini-3.8-flash` (or `fal-ai/any-llm`) to synthesize the structured broadcast explainer from a live WSJ/Bloomberg wire article and Yahoo Finance series:

```text
You are a senior Wall Street Journal & Bloomberg Television broadcast producer and financial editor.
Analyze this news story and return ONLY valid JSON (no markdown fences) for a ${durSec}-second broadcast news clip.

INPUT STORY:
"${enrichedInput}"

VERIFIED CURRENT MARKET DATA (real Yahoo Finance figures — cite exact numbers from here whenever the headline/article text lacks specific numbers):
${verifiedMarketMetricsBlock}

MANDATORY JOURNALISTIC & SPECIFICITY RULES:
1. NEVER write vague or generic commentary. Every single sentence in narrationScript MUST contain concrete specifics from WSJ/Bloomberg reporting or the verified market data above:
   - Include AT LEAST TWO specific numbers, prices, percentages, dollar figures, or basis-point moves (e.g. "4.75 percent", "720 million dollars", "24 percent", "109 dollars"). Quote figures at the precision given (e.g. say "4.74 percent" or "108.40 dollars", do NOT round 4.74 to 5).
   - Include AT LEAST ONE specific named person, institution, or central bank (e.g. "Jerome Powell", "Kevin Warsh", "Federal Reserve", "European Commission", "Bank of Canada").
   - Include AT LEAST ONE specific company, ticker/asset, or place (e.g. "Nvidia", "TSMC", "Amazon", "Ottawa", "Brussels", "Wall Street").
2. BANNED GENERIC PHRASES: Never use filler like "markets reacted", "investors are watching closely", "amid economic uncertainty", "in a major move", "experts say", or "time will tell". State the concrete fact, the exact price or dollar figure, who did it, and the direct financial impact on listeners' money, rates, or portfolios.
3. VOICEOVER FORMAT:
   - Write like a sharp CNBC or Bloomberg Television anchor speaking directly to investors.
   - Spell out symbols for natural speech ("basis points" instead of "bps", "percent" instead of "%").
   - NEVER include structural labels like "Act 1", "Part 1", "Scene 1", "Intro", or "Breaking News".
   - STRICTLY ${minWords}-${maxWords} words across 3 complete sentences so the spoken report fills ${durSec} seconds cleanly without ending early or cutting off.
```

---

### B. Visual Subject Planning & Homonym Disambiguation Prompt (`src/services/imageSourcing.js`)
Used to translate a financial headline into concrete, photographable encyclopedic subjects:

```text
You are a broadcast television photo editor at Bloomberg TV.
Given the financial news story below, list ${count} concrete, real-world, photographable encyclopedic subjects (people, companies, buildings, central banks, physical commodities, industrial facilities, or cities) that are DIRECTLY relevant to this specific story and have a Wikipedia page with a real photograph.

STORY: "${storyText}"

CRITICAL DISAMBIGUATION RULES:
- Never pick puns, animals, plants, movies, songs, or literal homonyms!
  * If the story is about "gold" (the precious metal / bullion), specify "Gold bar" or "New York Mercantile Exchange", NEVER "Goldfish".
  * If the story is about "Apple" (the tech company), specify "Apple Park" or "Tim Cook", NEVER "Apple (fruit)".
  * If the story is about "Amazon" (e-commerce/AWS), specify "Amazon (company)" or "Andy Jassy", NEVER "Amazon rainforest".
  * If the story is about "bears" or "bulls" in stocks, specify "New York Stock Exchange" or "Wall Street", NEVER grizzly bears or cattle.
  * If the story is about "chips" (semiconductors), specify "Wafer (electronics)" or "TSMC", NEVER potato chips.
- Prefer: named executives/officials in the story, the specific company headquarters, the relevant central bank building (Eccles Building, European Central Bank), or the exact industrial asset (data center, container ship, oil refinery, Treasury bond).

Return ONLY a JSON array of objects, no markdown:
[{"subject":"exact description","wikiTitle":"Exact Wikipedia Article Title"}, ...]
```

---

### C. Post-Retrieval Visual Relevance Audit Prompt (`src/services/imageSourcing.js`)
Used to review every candidate image descriptor before it is allowed into the video timeline:

```text
You are a strict broadcast news photo editor.
Story headline: "${storyText}"

Candidate image filenames/URLs:
${numberedCandidateList}

Reject ANY image that is an animal, fish, pet, food, cartoon, movie poster, album cover, sports player, household plumbing/kitchen sink, or an unrelated pun/homonym of a word in the headline (e.g. a goldfish for a gold market story, or a kitchen sink when stocks sink).
Keep ONLY images that plausibly depict business, finance, technology, government officials, buildings, industry, energy, trade, or markets relevant to the story.

Return ONLY a JSON array of the 0-based indices to KEEP, e.g. [0, 1, 3]:
```

---

### D. Newscaster Vocal Direction Prompt (`src/clients/falClient.js`)
Used with `gemini-3.1-flash-tts-preview` (`voiceName: "Charon"`) for broadcast audio synthesis:

```text
Read this financial news report in a clear, authoritative television newscaster voice at a brisk, steady broadcast pace:

${cleanedBroadcastScript}
```
