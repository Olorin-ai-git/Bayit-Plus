import { useState, useCallback } from 'react';

/**
 * YouTube Thumbnail Fallback Hook
 *
 * YouTube's maxresdefault (1280x720) thumbnails aren't always available.
 * This hook provides automatic fallback to hqdefault (480x360) which is
 * always available for any YouTube video.
 *
 * Usage:
 * ```tsx
 * const { thumbnailUrl, handleError } = useYouTubeThumbnail(content.thumbnail);
 *
 * <Image
 *   source={{ uri: thumbnailUrl }}
 *   onError={handleError}
 * />
 * ```
 */
export function useYouTubeThumbnail(originalUrl: string | undefined | null) {
  const [hasError, setHasError] = useState(false);

  const thumbnailUrl = (() => {
    if (!originalUrl) return undefined;

    // If maxresdefault failed, fall back to hqdefault
    if (hasError && originalUrl.includes('maxresdefault')) {
      return originalUrl.replace('maxresdefault', 'hqdefault');
    }

    return originalUrl;
  })();

  const handleError = useCallback(() => {
    // Only retry once with fallback quality
    if (!hasError && originalUrl?.includes('maxresdefault')) {
      setHasError(true);
    }
  }, [hasError, originalUrl]);

  // Reset error state when URL changes
  const reset = useCallback(() => {
    setHasError(false);
  }, []);

  return {
    thumbnailUrl,
    handleError,
    hasError,
    reset,
  };
}

export default useYouTubeThumbnail;
