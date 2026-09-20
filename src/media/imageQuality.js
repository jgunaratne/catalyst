/**
 * Guards picture quality before a photo reaches a 1080p cut: photos below the crisp
 * threshold are AI-upscaled, and anything still too small is flagged so the pipeline
 * animates it with image-to-video instead of hard-cropping it.
 */
const fs = require('fs');
const { execFile } = require('child_process');
const { callFalApi } = require('../clients/falClient');
const { downloadFile } = require('../clients/httpClient');
const { MIN_CRISP_WIDTH, MIN_CRISP_HEIGHT, FAL_ENDPOINTS } = require('../config');

function getImageDimensions(imgPath) {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', imgPath],
      { timeout: 8000 },
      (err, stdout) => {
        if (err) return resolve({ width: 0, height: 0 });
        const m = String(stdout || '').trim().match(/(\d+)x(\d+)/);
        resolve(m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 0, height: 0 });
      }
    );
  });
}

function imageToDataUri(imgPath) {
  try {
    const b64 = fs.readFileSync(imgPath).toString('base64');
    return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    return null;
  }
}

// If a real internet photo is too low resolution for a 1080p cut, upscale it with an AI upscaler.
// Returns { path, wasUpscaled, stillLowRes } — stillLowRes means the caller should prefer
// image-to-video generation from this seed image instead of a hard Ken Burns crop.
async function ensureHighResolutionImage(imgPath) {
  const dims = await getImageDimensions(imgPath);
  if (dims.width >= MIN_CRISP_WIDTH && dims.height >= MIN_CRISP_HEIGHT) {
    return { path: imgPath, wasUpscaled: false, stillLowRes: false, width: dims.width, height: dims.height };
  }
  if (!dims.width || !dims.height) {
    return { path: imgPath, wasUpscaled: false, stillLowRes: true, width: dims.width, height: dims.height };
  }

  // Try AI upscaling (ESRGAN 4x) so the still can hold up at 1920x1080
  const dataUri = imageToDataUri(imgPath);
  if (dataUri) {
    try {
      const upRes = await callFalApi(FAL_ENDPOINTS.upscaler, {
        image_url: dataUri,
        scale: dims.width < 640 ? 4 : 2,
        model: 'RealESRGAN_x4plus'
      }, 60000);
      const upUrl = upRes?.image?.url || upRes?.url;
      if (upUrl) {
        const upPath = imgPath.replace(/\.jpg$/i, '') + '-upscaled.jpg';
        await downloadFile(upUrl, upPath);
        const upDims = await getImageDimensions(upPath);
        if (upDims.width >= MIN_CRISP_WIDTH && upDims.height >= MIN_CRISP_HEIGHT) {
          console.log(`Upscaled low-res image ${dims.width}x${dims.height} -> ${upDims.width}x${upDims.height}`);
          return { path: upPath, wasUpscaled: true, stillLowRes: false, width: upDims.width, height: upDims.height };
        }
      }
    } catch (e) {
      console.warn('AI upscale unavailable, will animate low-res seed image instead:', e.message);
    }
  }

  // Upscaling failed: flag it so this seed image gets image-to-video generation rather than a crisp crop
  return { path: imgPath, wasUpscaled: false, stillLowRes: true, width: dims.width, height: dims.height };
}

module.exports = { getImageDimensions, imageToDataUri, ensureHighResolutionImage };
