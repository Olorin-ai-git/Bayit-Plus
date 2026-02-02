/**
 * Remotion Configuration
 * Global configuration for Remotion compositions and rendering
 */

import { Config } from 'remotion';

// Global Remotion settings
export const REMOTION_CONFIG = {
  // Composition dimensions
  width: 330,
  height: 362,

  // Frame rate
  fps: 60,

  // Video codec settings (for rendering)
  codec: 'h264' as const,
  pixelFormat: 'yuv420p' as const,
  bitrate: '2M',

  // Audio settings (wizard animations are silent)
  audioCodec: null,

  // Quality settings
  quality: 90, // JPEG quality for frames (0-100)

  // Performance settings
  concurrency: null, // Use all available CPU cores
  enableMultiProcessOnLinux: true,

  // Output settings
  outputFormat: 'mp4' as const,
  overwrite: true,
} as const;

/**
 * Apply configuration to Remotion (call this in your entry point)
 */
export function configureRemotion() {
  // Video codec
  Config.setCodec(REMOTION_CONFIG.codec);
  Config.setPixelFormat(REMOTION_CONFIG.pixelFormat);

  // Quality
  Config.setQuality(REMOTION_CONFIG.quality);

  // Performance
  if (REMOTION_CONFIG.concurrency !== null) {
    Config.setConcurrency(REMOTION_CONFIG.concurrency);
  }

  Config.setEnableMultiProcessOnLinux(REMOTION_CONFIG.enableMultiProcessOnLinux);

  // Output
  Config.setOverwriteOutput(REMOTION_CONFIG.overwrite);
}

/**
 * Get video output settings for a specific sequence
 */
export function getVideoOutputSettings(sequenceId: string) {
  return {
    width: REMOTION_CONFIG.width,
    height: REMOTION_CONFIG.height,
    fps: REMOTION_CONFIG.fps,
    codec: REMOTION_CONFIG.codec,
    pixelFormat: REMOTION_CONFIG.pixelFormat,
    bitrate: REMOTION_CONFIG.bitrate,
    outputLocation: `web/public/assets/animations/${sequenceId}.mp4`,
  };
}

export default REMOTION_CONFIG;
