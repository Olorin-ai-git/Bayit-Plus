/**
 * Image Utilities for Mobile
 * Optimizes TMDB image URLs for mobile devices
 */

import { Dimensions, PixelRatio } from 'react-native';

// TMDB image size options
// Poster sizes: w92, w154, w185, w342, w500, w780, original
// Backdrop sizes: w300, w780, w1280, original
// Profile sizes: w45, w185, h632, original

type ImageType = 'poster' | 'backdrop' | 'profile';

interface ImageSizeConfig {
  phone: string;
  tablet: string;
  retina: string; // For high-DPI displays
}

// Optimal sizes for each image type per device
const IMAGE_SIZES: Record<ImageType, ImageSizeConfig> = {
  poster: {
    phone: 'w342',     // 342px - good for phone cards
    tablet: 'w500',    // 500px - better for tablet
    retina: 'w500',    // Higher res for retina
  },
  backdrop: {
    phone: 'w780',     // 780px - phone carousel/hero
    tablet: 'w1280',   // 1280px - tablet full width
    retina: 'w1280',   // Higher res for retina
  },
  profile: {
    phone: 'w185',     // 185px - actor thumbnails
    tablet: 'w185',    // Same for tablet
    retina: 'w185',    // Profile images don't need to be huge
  },
};

// TMDB image base URL
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

/**
 * Get device type based on screen width
 */
function getDeviceType(): 'phone' | 'tablet' {
  const { width } = Dimensions.get('window');
  return width >= 768 ? 'tablet' : 'phone';
}

/**
 * Check if device has high pixel ratio (retina)
 */
function isRetina(): boolean {
  return PixelRatio.get() >= 2;
}

/**
 * Get optimal image size for current device
 */
export function getOptimalImageSize(type: ImageType): string {
  const deviceType = getDeviceType();
  const config = IMAGE_SIZES[type];

  // Use retina size if high-DPI and it's larger than device default
  if (isRetina()) {
    return config.retina;
  }

  return config[deviceType];
}

/**
 * Convert a TMDB image URL to use the optimal size for mobile
 * @param url - Original image URL (e.g., https://image.tmdb.org/t/p/w500/abc.jpg)
 * @param type - Type of image (poster, backdrop, profile)
 * @returns Optimized URL
 */
export function optimizeTMDBImageUrl(
  url: string | undefined | null,
  type: ImageType = 'poster'
): string | undefined {
  if (!url) return undefined;

  // Check if it's a TMDB image URL
  if (!url.includes('image.tmdb.org/t/p/')) {
    return url; // Return as-is if not TMDB
  }

  // Get the optimal size for this device
  const optimalSize = getOptimalImageSize(type);

  // Replace the size in the URL
  // TMDB URLs are formatted as: https://image.tmdb.org/t/p/{size}/{path}
  const sizeRegex = /\/t\/p\/(w\d+|h\d+|original)\//;
  const optimizedUrl = url.replace(sizeRegex, `/t/p/${optimalSize}/`);

  return optimizedUrl;
}

/**
 * Build a TMDB image URL from a path
 * @param path - Image path (e.g., /abc123.jpg)
 * @param type - Type of image (poster, backdrop, profile)
 * @returns Full optimized URL
 */
export function buildTMDBImageUrl(
  path: string | undefined | null,
  type: ImageType = 'poster'
): string | undefined {
  if (!path) return undefined;

  const optimalSize = getOptimalImageSize(type);

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${TMDB_IMAGE_BASE}${optimalSize}${normalizedPath}`;
}

/**
 * Get placeholder color based on image type
 * Used while image is loading
 */
export function getPlaceholderColor(type: ImageType): string {
  switch (type) {
    case 'poster':
      return '#1a1a2e'; // Dark purple tint
    case 'backdrop':
      return '#0d0d1a'; // Very dark
    case 'profile':
      return '#2a2a3e'; // Slightly lighter
    default:
      return '#1a1a2e';
  }
}

/**
 * Calculate optimal image dimensions for a container
 * @param containerWidth - Width of the container
 * @param aspectRatio - Desired aspect ratio (height/width)
 * @returns { width, height } in pixels
 */
export function calculateImageDimensions(
  containerWidth: number,
  aspectRatio: number = 1.5 // Default poster ratio (2:3)
): { width: number; height: number } {
  const pixelRatio = PixelRatio.get();
  const width = Math.round(containerWidth * pixelRatio);
  const height = Math.round(containerWidth * aspectRatio * pixelRatio);

  return { width, height };
}

export default {
  optimizeTMDBImageUrl,
  buildTMDBImageUrl,
  getOptimalImageSize,
  getPlaceholderColor,
  calculateImageDimensions,
};
