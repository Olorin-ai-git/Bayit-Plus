/**
 * usePlatformDetection Hook
 * Detects current platform (web, mobile, tvOS) for conditional UI rendering
 */

import { useState, useEffect } from 'react';

export type Platform = 'web' | 'mobile' | 'tvos';

export const detectPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'web';

  const ua = window.navigator.userAgent;

  // tvOS detection
  if (/AppleTV|tvOS/.test(ua)) {
    return 'tvos';
  }

  // Mobile detection (touch capability + small viewport)
  const hasTouchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallViewport = window.innerWidth < 1024;
  if (hasTouchCapability && isSmallViewport) {
    return 'mobile';
  }

  return 'web';
};

export const usePlatformDetection = (): Platform => {
  const [platform, setPlatform] = useState<Platform>(detectPlatform());

  useEffect(() => {
    const checkPlatform = () => {
      setPlatform(detectPlatform());
    };

    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    window.addEventListener('orientationchange', checkPlatform);

    return () => {
      window.removeEventListener('resize', checkPlatform);
      window.removeEventListener('orientationchange', checkPlatform);
    };
  }, []);

  return platform;
};

export default usePlatformDetection;
