import { ASSET_PATHS, FAVICON_METADATA, type FaviconSize } from '../constants';

/**
 * Get the path for a specific favicon size
 * @param size - The favicon size (16, 32, 64, 128, 192, 512)
 * @returns The path to the favicon
 */
export function getFaviconPath(size: FaviconSize): string {
  return ASSET_PATHS.favicons[`${size}x${size}` as keyof typeof ASSET_PATHS.favicons];
}

/**
 * Get all favicon metadata for HTML head
 * @returns Array of favicon link tag attributes
 */
export function getFaviconMetadata() {
  return FAVICON_METADATA;
}

/**
 * Generate HTML link tags for all favicons
 * @returns HTML string with all favicon link tags
 */
export function generateFaviconLinks(): string {
  return FAVICON_METADATA.map((meta) => {
    const attrs = Object.entries(meta)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    return `<link ${attrs} />`;
  }).join('\n    ');
}

/**
 * Get the apple-touch-icon path
 */
export function getAppleTouchIconPath(): string {
  return ASSET_PATHS.favicons['apple-touch-icon'];
}

/**
 * Get the favicon.ico path
 */
export function getFaviconIcoPath(): string {
  return ASSET_PATHS.favicons.ico;
}
