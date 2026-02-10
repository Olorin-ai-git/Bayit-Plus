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
  const config = Config as any;
  // Video codec
  config.setCodec(REMOTION_CONFIG.codec);
  config.setPixelFormat(REMOTION_CONFIG.pixelFormat);

  // Quality
  config.setQuality(REMOTION_CONFIG.quality);

  // Performance
  if (REMOTION_CONFIG.concurrency !== null) {
    config.setConcurrency(REMOTION_CONFIG.concurrency);
  }

  config.setEnableMultiProcessOnLinux(REMOTION_CONFIG.enableMultiProcessOnLinux);

  // Output
  config.setOverwriteOutput(REMOTION_CONFIG.overwrite);
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
