/**
 * Platform Adapter
 * Detects Remotion support and provides platform-specific configuration
 */

import { logger } from '../../utils/logger';

/**
 * Detect if Remotion live rendering is supported on this platform
 * Checks for:
 * - Browser environment (not SSR)
 * - MP4 video playback support
 * - Sufficient hardware performance
 */
export function detectRemotionSupport(): boolean {
  // Server-side rendering - no Remotion support
  if (typeof window === 'undefined') {
    return false;
  }

  // Check video playback support
  const video = document.createElement('video');
  const canPlayMP4 = video.canPlayType('video/mp4') !== '';

  if (!canPlayMP4) {
    return false;
  }

  // Check hardware concurrency (CPU cores)
  // Require at least 4 cores for smooth live rendering
  const hasGoodPerformance =
    navigator.hardwareConcurrency >= 4 ||
    navigator.hardwareConcurrency === undefined; // Fallback for older browsers

  return hasGoodPerformance;
}

/**
 * Determine if we should use Remotion for this platform
 * Returns true for web (with support), false for React Native
 */
export function shouldUseRemotion(): boolean {
  // React Native detection
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false; // Use pre-rendered videos on mobile
  }

  // Web with Remotion support
  return detectRemotionSupport();
}

/**
 * Get the appropriate rendering mode for the current platform
 */
export type RenderingMode = 'live' | 'prerendered' | 'fallback';

export function getRenderingMode(): RenderingMode {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'prerendered'; // Mobile/tvOS uses pre-rendered MP4s
  }

  if (detectRemotionSupport()) {
    return 'live'; // Web with good hardware uses live rendering
  }

  return 'fallback'; // Unsupported platforms fall back to spritesheet system
}

/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
  renderingMode: RenderingMode;
  useRemotion: boolean;
  fps: number;
  preloadVideos: boolean;
  enableParticles: boolean;
  maxConcurrentAnimations: number;
}

export function getPlatformConfig(): PlatformConfig {
  const renderingMode = getRenderingMode();

  const baseConfig: PlatformConfig = {
    renderingMode,
    useRemotion: renderingMode !== 'fallback',
    fps: 60,
    preloadVideos: false,
    enableParticles: true,
    maxConcurrentAnimations: 1,
  };

  // Platform-specific overrides
  if (renderingMode === 'prerendered') {
    return {
      ...baseConfig,
      preloadVideos: true, // Preload videos on mobile for instant playback
      enableParticles: false, // Particles are pre-rendered in videos
    };
  }

  if (renderingMode === 'live') {
    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      ...baseConfig,
      enableParticles: !prefersReducedMotion,
    };
  }

  return baseConfig;
}

/**
 * Check if the current device has sufficient memory for animations
 */
export function hassufficientMemory(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  // Check for device memory API (Chrome only)
  const deviceMemory = (navigator as any).deviceMemory;

  if (deviceMemory !== undefined) {
    return deviceMemory >= 4; // At least 4GB RAM
  }

  // Fallback - assume sufficient memory
  return true;
}

/**
 * Log platform detection results for debugging
 */
export function logPlatformInfo(): void {
  if (typeof console === 'undefined') return;

  const config = getPlatformConfig();
  const hasMemory = hassufficientMemory();
  const remotionSupport = detectRemotionSupport();

  logger.debug('Platform detection results', 'RemotionPlatform', {
    renderingMode: config.renderingMode,
    useRemotion: config.useRemotion,
    remotionSupport,
    hassufficientMemory: hasMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    userAgent: navigator.userAgent,
  });
}
