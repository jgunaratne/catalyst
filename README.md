# Catalyst

Short-form financial news videos (`15s` and `30s`) built from real wire stories, verified documentary photography, real 8-week Yahoo Finance market series, AI motion cuts (`Veo 3.1`), and time-fitted broadcast voiceover (`Gemini 3.1 Flash TTS`).

See [`PROMPTS.md`](PROMPTS.md) for the complete prompt engineering catalog, model routing architecture, and data-alignment invariants.

---

## Quick Start

1. **Configure credentials**:
   ```bash
   cp .env.example .env
   # Edit .env and set GEMINI_API_KEY (and/or FAL_KEY)
   ```
    Ensure `ffmpeg` and `ffprobe` are available on your `PATH`.

2. **Start the server**:
   ```bash
   npm start               # http://localhost:3456
   ```

3. **Run verification checks**:
   ```bash
   npm run check           # Syntax, AST scope, frontend module load, and narration checks
   npm run check:playback  # Headless Chrome end-to-end playback + Regenerate button test
   npm run rebuild:clips:all # Regenerate all 18 playlist videos, Yahoo Finance charts & voiceovers
   ```

---

## Verification Suite

| Command | What It Verifies |
| --- | --- |
| `npm run check:server` | Syntax check across `server.js` and `src/**/*.js` |
| `npm run check:scopes` | Static AST scope analysis across all 25 server and browser files (`scripts/checkModuleScopes.mjs`) to catch any undeclared, un-imported, or stranded identifiers |
| `npm run check:client` | Loads all browser modules in `public/js/` under a DOM stub |
| `npm run check:narration` | Verifies every story's voiceover script length and data citations |
| `npm run check:playback` | Headless Chrome test verifying video playback, transport play/pause toggle, Catalyst SVG header logo, scrollbar styling, and the Regenerate button state machine |

---

## Project Layout

```
server.js                     HTTP entry point
real_yf_charts.json           Verified 8-week market series for featured stories
PROMPTS.md                    Technical documentation of all LLM, TTS, and video prompts
src/
  config.js                   Environment credentials, directory paths, and model endpoints
  clients/
    falClient.js              Media inference client with automatic direct GEMINI_API_KEY fallback
                              (gemini-3.8-flash, gemini-3.1-flash-tts-preview, veo-3.1-*-generate-preview)
    httpClient.js             XML, JSON, and binary download helpers
  services/
    imageSourcing.js          Entity-grounded Wikimedia/Wikipedia photography planner & reviewer
    narration.js              Broadcast anchor script and timed caption generator
    marketData.js             Yahoo Finance 8-week series fetcher & headline metric alignment
    newsFeeds.js              Live WSJ / CNBC / Yahoo Finance RSS ingestion
    seededStories.js          Featured reference explainers (#1..#6)
    videoPipeline.js          End-to-end clip production and automatic temp-file cleanup
  media/
    chartCut.js               Animated 1920x1080 SVG/FFmpeg dual-series market chart renderer
    videoAssembly.js          Portrait headroom framing, camera motion cuts, and xfade stitching
    imageQuality.js           Minimum resolution enforcement and AI upscaling
    audio.js                  Ticker/acronym pronunciation normalization and lossless voiceover muxing
  routes/
    api.js                    REST API endpoints (/api/generate, /api/rss, /api/article)
    staticFiles.js            Static asset & /cache/* media streaming with HTTP Range support
    http.js                   Request/response helpers
  data/
    seedExplainers.js         Metadata and story definitions for featured explainers
public/
  index.html                  Single-viewport studio interface
  images/                     Catalyst SVG logo and UI textures
  css/                        tokens.css -> base.css -> player.css -> watch.css (imported by main.css)
  js/                         state.js, dom.js, api.js, player.js, charts.js, storyboard.js, app.js
cache/                        Served video (.mp4), voiceover (.mp3), thumbnails (.jpg), and rss_explainers.json
scripts/
  syncAll18VideosVoiceoverAndChart.js  Full 18-story chart, voiceover, and video regeneration pipeline
  rebuildSeedVideos.js                 Featured seed clip rebuilder
  checkModuleScopes.mjs                AST static scope verifier
  checkFrontendModules.mjs             Browser module loader check
  checkNarrationLength.mjs             Narration word-budget verifier
  checkPlayback.mjs                    Headless Chrome E2E playback verifier
```

---

## Core Pipeline Invariants

1. **100% Chart-to-Voiceover Synchronization**: Every metric displayed on a video's chart (`Series A` and `Series B` KPI cards, shared-unit Y-axis curves, and terminal badges) matches the exact numbers spoken in the voiceover (`e.g., Federal Funds Target Rate 4.75% vs. 10Y US Treasury Yield 5.00%`).
2. **No Chart When Unverified**: Corporate or policy stories without a directly matching market series set `chartData: null`, hide the interactive chart panel, and render 4 visual documentary cuts with zero fabricated charts.
3. **Portrait Headroom Framing**: Vertical or square portraits (`aspect < 1.38`) are composited full head-to-shoulders over a darkened blurred `16:9` backdrop so subjects' heads are never cropped off.
4. **Uncut Broadcast Voiceover**: Sentences are never truncated mid-clause; video duration automatically extends with a smooth tail clone (`tpad`) to accommodate the complete spoken audio plus a `0.55s` natural cadence buffer.
5. **Clean Cache Separation**: All generated videos, audio tracks, and thumbnails live under `cache/{videos,audio,images}` and intermediate processing files are automatically unlinked upon completion.
