/**
 * Utility functions for WidgetsIntroVideo component
 */

import { CaptionUrls } from './WidgetsIntroVideo.types';

/**
 * Derive caption URLs from video URL (no hardcoded paths)
 * Replaces video extension with -{lang}.vtt pattern
 */
export function getCaptionUrls(videoSrc: string): CaptionUrls {
  const basePath = videoSrc.replace(/\.(mp4|webm|mov)$/i, '');
  return {
    en: `${basePath}-en.vtt`,
    es: `${basePath}-es.vtt`,
    he: `${basePath}-he.vtt`,
  };
}
