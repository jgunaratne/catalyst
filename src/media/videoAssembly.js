/**
 * Picture assembly. Each cut gets its own camera move so motion varies across the clip, and
 * cuts are joined with cross-dissolves.
 *
 * Headroom & Portrait Framing Invariant:
 *   Biographical and press photographs of people on Wikipedia/wires are predominantly vertical
 *   portraits (aspect ratio 0.65–1.35) or 3:2 shots with the subject's head in the upper third.
 *   A naive `scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440` slices 50–62%
 *   off the vertical height around the midpoint (`y = (ih-oh)/2`), severing the top of the
 *   person's head.
 *
 *   To guarantee heads and faces are always intact and centered:
 *   1. Portrait / near-square photos (`width / height < 1.38`) are composed onto a 2560x1440
 *      broadcast canvas over a softly blurred, darkened ambient 16:9 backdrop with the full
 *      portrait anchored from the crown of the head (`y = (ih-1440)*0.02`) and centered
 *      horizontally (`x = (W-w)/2`).
 *   2. Landscape photos (`width / height >= 1.38`) anchor their 16:9 crop near the top
 *      (`y = (ih-1440)*0.10`) instead of vertical center, preserving 90% of the top headroom.
 *   3. Every `zoompan` camera move anchors its vertical focal point in the upper headroom band
 *      (`y = (ih-ih/zoom)*0.06..0.18`) and keeps horizontal motion centered around `iw/2`.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { VIDEOS_DIR, XFADE_DUR, XFADE_TRANSITIONS, CUTS_PER_DURATION } = require('../config');
const { getImageDimensions } = require('./imageQuality');

async function buildAnimatedClipFromImage(imgPath, outClipPath, styleIdx = 0, clipDurSec = 4.0) {
  const dims = await getImageDimensions(imgPath);
  const aspect = dims.width && dims.height ? dims.width / dims.height : 1.5;
  const isPortraitOrSquare = aspect < 1.38;

  return new Promise((resolve, reject) => {
    const d = Math.max(24, Math.round(clipDurSec * 25)); // zoompan frame count at 25fps

    // Portrait-safe & headroom-preserving camera moves:
    // Vertical focal point `y` stays in 0.06..0.18 of `(ih - ih/zoom)` so the crown of a
    // person's head is never pushed off the top edge, and `x` stays centered around `iw/2`.
    const motionStyles = isPortraitOrSquare
      ? [
          // 0: gentle push-in keeping full head and shoulders centered
          `zoompan=z='min(zoom+0.0011,1.08)':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.06':s=1920x1080:fps=25`,
          // 1: gentle pull-out reveal from upper-third eye line
          `zoompan=z='if(eq(on,0),1.09,max(zoom-0.0011,1.01))':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.06':s=1920x1080:fps=25`,
          // 2: subtle lateral drift left-to-right around center
          `zoompan=z='1.06':d=${d}:x='(iw-iw/zoom)*(0.42+0.16*on/${d})':y='(ih-ih/zoom)*0.07':s=1920x1080:fps=25`,
          // 3: subtle eye-line push-in
          `zoompan=z='min(zoom+0.0012,1.09)':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.08':s=1920x1080:fps=25`,
          // 4: subtle lateral drift right-to-left around center
          `zoompan=z='1.06':d=${d}:x='(iw-iw/zoom)*(0.58-0.16*on/${d})':y='(ih-ih/zoom)*0.07':s=1920x1080:fps=25`,
          // 5: gentle upward pedestal toward face (`0.16 -> 0.05`)
          `zoompan=z='1.07':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(0.16-0.11*on/${d})':s=1920x1080:fps=25`,
          // 6: slow diagonal push-in centered on upper third
          `zoompan=z='min(zoom+0.0011,1.08)':d=${d}:x='(iw-iw/zoom)*(0.45+0.10*on/${d})':y='(ih-ih/zoom)*0.07':s=1920x1080:fps=25`,
          // 7: gentle settle from crown to eye line (`0.04 -> 0.12`)
          `zoompan=z='1.07':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(0.04+0.08*on/${d})':s=1920x1080:fps=25`
        ]
      : [
          // Landscape photos: preserve upper-third headroom (`y` in 0.08..0.22)
          `zoompan=z='min(zoom+0.0015,1.13)':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.12':s=1920x1080:fps=25`,
          `zoompan=z='if(eq(on,0),1.15,max(zoom-0.0014,1.02))':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.12':s=1920x1080:fps=25`,
          `zoompan=z='1.11':d=${d}:x='(iw-iw/zoom)*(0.25+0.50*on/${d})':y='(ih-ih/zoom)*0.14':s=1920x1080:fps=25`,
          `zoompan=z='min(zoom+0.0016,1.14)':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.10':s=1920x1080:fps=25`,
          `zoompan=z='1.11':d=${d}:x='(iw-iw/zoom)*(0.75-0.50*on/${d})':y='(ih-ih/zoom)*0.14':s=1920x1080:fps=25`,
          `zoompan=z='1.12':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(0.22-0.12*on/${d})':s=1920x1080:fps=25`,
          `zoompan=z='min(zoom+0.0015,1.13)':d=${d}:x='(iw-iw/zoom)*(0.35+0.30*on/${d})':y='(ih-ih/zoom)*0.12':s=1920x1080:fps=25`,
          `zoompan=z='1.12':d=${d}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(0.08+0.12*on/${d})':s=1920x1080:fps=25`
        ];

    const zp = motionStyles[styleIdx % motionStyles.length];

    // Pre-composition filter:
    // - For portraits/squares (`aspect < 1.38`): composite the full head-to-shoulders portrait
    //   centered over a softly blurred 16:9 broadcast backdrop so the top of the head is never cut.
    // - For landscape photos (`aspect >= 1.38`): scale to 2560x1440 and crop anchored near the
    //   top (`y=(ih-1440)*0.10`) so subjects' heads stay in the upper third with full headroom.
    const preFrameFilter = isPortraitOrSquare
      ? `split[bg][fg];` +
        `[bg]scale=2560:1440:force_original_aspect_ratio=increase:flags=lanczos,` +
        `crop=2560:1440:(iw-2560)/2:(ih-1440)*0.12,boxblur=48:4,eq=brightness=-0.28:saturation=0.65[bgc];` +
        `[fg]scale=-2:1510:flags=lanczos,crop=iw:1440:0:(ih-1440)*0.02[fgc];` +
        `[bgc][fgc]overlay=(W-w)/2:0,${zp},setsar=1`
      : `scale=2560:1440:force_original_aspect_ratio=increase:flags=lanczos,` +
        `crop=2560:1440:(iw-2560)/2:(ih-1440)*0.10,${zp},setsar=1`;

    const args = [
      '-y', '-loop', '1', '-i', imgPath,
      '-vf', preFrameFilter,
      '-t', clipDurSec.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outClipPath
    ];
    execFile('ffmpeg', args, { timeout: 30000 }, (err) => {
      if (err) return reject(err);
      resolve(outClipPath);
    });
  });
}

// Assemble a 15.0s (4 cuts) or 30.0s (8 cuts) news video where:
// - Cut #3 (index 2) is the animated Yahoo Finance market chart & numbers cut (`chartClipPath`)
// - All other cuts prioritize Veo 3.1 AI-animated video shots (`validI2v`), supplemented by
//   distinct 8-style documentary camera motion cuts (`animatedClips`), joined by cross-dissolves.
async function stitchRealisticNewsVideo(i2vClipPaths, localRealImgPaths, audioPath, outputFilename, targetSec = 15.0, chartClipPath = null) {
  const numCuts = CUTS_PER_DURATION[Number(targetSec)] || CUTS_PER_DURATION[15];
  const cutDur = (Number(targetSec) + (numCuts - 1) * XFADE_DUR) / numCuts;

  const validImgs = (localRealImgPaths || []).filter(p => p && fs.existsSync(p));
  const totalToBuild = validImgs.length ? Math.min(numCuts, validImgs.length) : 0;

  const builtClips = await Promise.all(
    Array.from({ length: totalToBuild }, (_, k) => {
      const srcImg = validImgs[k % validImgs.length];
      const kbPath = path.join(VIDEOS_DIR, `motion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${k}.mp4`);
      return buildAnimatedClipFromImage(srcImg, kbPath, k, cutDur + 0.3).catch(() => null);
    })
  );
  const animatedClips = builtClips.filter(Boolean);

  const validI2v = (i2vClipPaths || []).filter(p => p && fs.existsSync(p));
  const hasChartClip = chartClipPath && fs.existsSync(chartClipPath);
  const chartSlotIndex = numCuts >= 3 ? 2 : 1;

  const selectedClips = [];
  let i2vCursor = 0;
  let kbCursor = 0;

  for (let i = 0; i < numCuts; i++) {
    if (hasChartClip && i === chartSlotIndex) {
      selectedClips.push(chartClipPath);
    } else if (i2vCursor < validI2v.length) {
      selectedClips.push(validI2v[i2vCursor++]);
    } else if (animatedClips.length > 0) {
      selectedClips.push(animatedClips[kbCursor++ % animatedClips.length]);
    } else if (validI2v.length > 0) {
      selectedClips.push(validI2v[i % validI2v.length]);
    }
  }

  const clips = selectedClips.slice(0, numCuts);
  if (!clips.length) throw new Error('No usable cuts for video stitch');

  return new Promise((resolve, reject) => {
    const outFull = path.join(VIDEOS_DIR, outputFilename);
    const args = ['-y'];
    clips.forEach(cp => args.push('-i', cp));
    if (audioPath && fs.existsSync(audioPath)) args.push('-i', audioPath);

    // Normalise every cut to 1080p25 while preserving upper-third headroom (`y=(ih-1080)*0.10`)
    let filter = '';
    for (let i = 0; i < clips.length; i++) {
      filter += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080:(iw-1920)/2:(ih-1080)*0.10,fps=25,setsar=1,`
        + `tpad=stop_mode=clone:stop_duration=3,trim=0:${cutDur.toFixed(3)},setpts=PTS-STARTPTS[v${i}];`;
    }

    if (clips.length === 1) {
      filter += `[v0]null[vout]`;
    } else {
      let prev = '[v0]';
      for (let i = 1; i < clips.length; i++) {
        const offset = (i * (cutDur - XFADE_DUR)).toFixed(3);
        const label = i === clips.length - 1 ? '[vout]' : `[x${i}]`;
        const tr = XFADE_TRANSITIONS[(i - 1) % XFADE_TRANSITIONS.length];
        filter += `${prev}[v${i}]xfade=transition=${tr}:duration=${XFADE_DUR}:offset=${offset}${label};`;
        prev = label;
      }
      filter = filter.replace(/;$/, '');
    }

    args.push('-filter_complex', filter, '-map', '[vout]');
    if (audioPath && fs.existsSync(audioPath)) {
      args.push('-map', `${clips.length}:a`, '-c:a', 'aac', '-b:a', '192k');
    }
    args.push(
      '-t', String(targetSec),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outFull
    );

    execFile('ffmpeg', args, { timeout: 120000, maxBuffer: 1024 * 1024 * 12 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${err.message} :: ${String(stderr || '').slice(-400)}`));
      resolve(`/cache/videos/${outputFilename}`);
    });
  });
}

module.exports = { buildAnimatedClipFromImage, stitchRealisticNewsVideo };
