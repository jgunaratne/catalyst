/**
 * End-to-end playback smoke test.
 *
 * Loads the app in headless Chrome, captures console errors and page exceptions, clicks the
 * transport button through a real user gesture, and asserts that the video element actually
 * advances. Static checks cannot prove playback works, so this closes the loop.
 *
 * Usage: node scripts/checkPlayback.mjs [url]   (requires the server to be running)
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_UNDER_TEST = process.argv[2] || 'http://localhost:3456/';
const PORT = 9222;
const profile = mkdtempSync(join(tmpdir(), 'cdp-profile-'));

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-sandbox',
  '--disable-gpu',
  '--mute-audio',
  // Let playback begin without a gesture so we measure the app's logic, not Chrome's policy.
  '--autoplay-policy=no-user-gesture-required',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const page = tabs.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* chrome still starting */ }
    await sleep(200);
  }
  throw new Error('Chrome DevTools endpoint never became available');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];

  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('WebSocket failed to open')));
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  return { ready, send, events, close: () => ws.close() };
}

async function evaluate(send, expression, userGesture = false) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true, userGesture
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  }
  return result.value;
}

let exitCode = 0;
const fail = msg => { console.error(`  FAIL  ${msg}`); exitCode = 1; };
const pass = msg => console.log(`  ok    ${msg}`);

try {
  const wsUrl = await getWsUrl();
  const { ready, send, events, close } = connect(wsUrl);
  await ready;

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL_UNDER_TEST });

  // Give module bootstrap, config fetch and the initial episode render time to settle.
  await sleep(6000);

  // 1. No uncaught exceptions or console errors during bootstrap.
  const exceptions = events
    .filter(e => e.method === 'Runtime.exceptionThrown')
    .map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
  const consoleErrors = events
    .filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
    .map(e => e.params.args.map(a => a.description || a.value).join(' '));

  if (exceptions.length) {
    fail(`${exceptions.length} uncaught exception(s) during load:`);
    exceptions.forEach(m => console.error(`        ${String(m).split('\n')[0]}`));
  } else {
    pass('no uncaught exceptions during load');
  }
  if (consoleErrors.length) {
    fail(`${consoleErrors.length} console error(s):`);
    consoleErrors.forEach(m => console.error(`        ${m}`));
  } else {
    pass('no console errors');
  }

  // 2. The video element has a real source.
  const src = await evaluate(send, `document.getElementById('explainer-video').currentSrc || ''`);
  src ? pass(`video source loaded: ${src.split('/').pop()}`)
      : fail('video element has no source - startVideoWithGuaranteedAudio never ran');

  // 3. The transport button exists and pausing/playing through a real click works.
  const btnState = await evaluate(send, `
    (() => {
      const b = document.getElementById('play-pause-btn');
      return b ? { state: b.dataset.state, label: b.getAttribute('aria-label') } : null;
    })()
  `);
  btnState ? pass(`transport button present (state=${btnState.state}, label=${btnState.label})`)
           : fail('transport button missing');

  // Pause via a click on the button, exercising the real listener.
  await evaluate(send, `document.getElementById('play-pause-btn').click()`, true);
  await sleep(400);
  const afterFirst = await evaluate(send, `
    (() => {
      const v = document.getElementById('explainer-video');
      const b = document.getElementById('play-pause-btn');
      return { paused: v.paused, state: b.dataset.state };
    })()
  `);
  if (afterFirst.paused && afterFirst.state === 'paused') {
    pass('click pauses playback and the icon follows');
  } else {
    fail(`first click did not pause (paused=${afterFirst.paused}, icon=${afterFirst.state})`);
  }

  // Click again to resume and confirm the clock actually advances.
  await evaluate(send, `document.getElementById('play-pause-btn').click()`, true);
  await sleep(300);
  const t0 = await evaluate(send, `document.getElementById('explainer-video').currentTime`);
  await sleep(1500);
  const t1 = await evaluate(send, `document.getElementById('explainer-video').currentTime`);
  const resumedState = await evaluate(send, `document.getElementById('play-pause-btn').dataset.state`);

  if (t1 > t0 + 0.2) {
    pass(`click resumes playback: currentTime ${t0.toFixed(2)}s -> ${t1.toFixed(2)}s`);
  } else {
    fail(`playback did not advance after clicking play (${t0.toFixed(2)}s -> ${t1.toFixed(2)}s)`);
  }
  resumedState === 'playing' ? pass('icon shows pause glyph while playing')
                             : fail(`icon state is '${resumedState}', expected 'playing'`);

  // 4. The scrollbar styling survived the CSS split.
  const scrollbar = await evaluate(send, `getComputedStyle(document.body).scrollbarColor`);
  scrollbar && scrollbar !== 'auto'
    ? pass(`scrollbar-color applied: ${scrollbar}`)
    : fail(`scrollbar-color not applied (got '${scrollbar}')`);

  // 5. The Catalyst logo renders.
  const logo = await evaluate(send, `
    (() => {
      const i = document.querySelector('.brand-logo');
      return i ? { complete: i.complete, w: i.naturalWidth } : null;
    })()
  `);
  logo && logo.complete && logo.w > 0
    ? pass(`Catalyst logo loaded (${logo.w}px intrinsic)`)
    : fail(`Catalyst logo failed to load (${JSON.stringify(logo)})`);

  // 6. The Regenerate control is present and actually kicks off a render.
  const regen = await evaluate(send, `
    (() => {
      const b = document.getElementById('regenerate-video-btn');
      if (!b) return null;
      const label = document.getElementById('regenerate-btn-label');
      return {
        visible: b.offsetParent !== null,
        disabled: b.disabled,
        label: label ? label.textContent.trim() : null
      };
    })()
  `);
  if (regen && regen.visible && !regen.disabled && regen.label === 'Regenerate') {
    pass('Regenerate button is visible and enabled');
  } else {
    fail(`Regenerate button not usable: ${JSON.stringify(regen)}`);
  }

  await evaluate(send, `document.getElementById('regenerate-video-btn').click()`, true);
  await sleep(600);
  const during = await evaluate(send, `
    (() => {
      const b = document.getElementById('regenerate-video-btn');
      const label = document.getElementById('regenerate-btn-label');
      const banner = document.getElementById('fal-render-banner');
      const canvas = document.getElementById('live-storyboard-canvas');
      const video = document.getElementById('explainer-video');
      return {
        disabled: b.disabled,
        rendering: b.dataset.rendering,
        label: label.textContent.trim(),
        bannerVisible: banner ? !banner.classList.contains('hidden') : null,
        canvasVisible: canvas ? !canvas.classList.contains('hidden') : null,
        videoHidden: video.classList.contains('hidden'),
        videoPaused: video.paused
      };
    })()
  `);

  during.disabled && during.rendering === 'true'
    ? pass(`Regenerate locks itself while rendering (label "${during.label}")`)
    : fail(`Regenerate did not lock: ${JSON.stringify(during)}`);

  during.bannerVisible && during.canvasVisible && during.videoHidden && during.videoPaused
    ? pass('render placeholder replaces the paused video')
    : fail(`placeholder state wrong: ${JSON.stringify(during)}`);

  // A second click while busy must be ignored rather than starting a parallel render.
  await evaluate(send, `document.getElementById('regenerate-video-btn').click()`, true);
  await sleep(200);
  const stillOne = await evaluate(send, `document.getElementById('regenerate-video-btn').dataset.rendering`);
  stillOne === 'true'
    ? pass('repeat clicks while rendering are ignored')
    : fail(`unexpected state after repeat click: ${stillOne}`);

  close();
} catch (err) {
  fail(err.message);
} finally {
  chrome.kill();
  // Chrome flushes its profile asynchronously; removing too early throws ENOTEMPTY.
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch { /* a leftover temp profile is harmless */ }
}

console.log(exitCode === 0 ? '\nPlayback verification passed.' : '\nPlayback verification FAILED.');
process.exit(exitCode);
