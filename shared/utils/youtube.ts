/**
 * YouTube Utilities
 *
 * Helper functions for extracting video IDs and generating thumbnail URLs
 * from YouTube video URLs.
 */

// YouTube URL patterns
const YOUTUBE_PATTERNS = [
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
];

/**
 * YouTube thumbnail quality options (best to worst)
 */
export type YouTubeThumbnailQuality =
  | 'maxresdefault'  // 1280x720 - not always available
  | 'sddefault'      // 640x480 - usually available
  | 'hqdefault'      // 480x360 - always available
  | 'mqdefault';     // 320x180 - always available

/**
 * Extract YouTube video ID from various URL formats
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://img.youtube.com/vi/VIDEO_ID/...
 *
 * @param url YouTube URL in any format
 * @returns 11-character video ID or null if not found
 */
export function extractYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url) return null;

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Check if a URL is a YouTube video URL
 *
 * @param url URL to check
 * @returns true if URL is a YouTube video URL
 */
export function isYouTubeUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
}

/**
 * Get YouTube thumbnail URL for a video ID
 *
 * @param videoId 11-character YouTube video ID
 * @param quality Thumbnail quality (default: hqdefault - always available)
 * @returns Thumbnail URL
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: YouTubeThumbnailQuality = 'hqdefault'
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Get thumbnail URL from a YouTube video URL
 *
 * @param url YouTube video URL
 * @param quality Thumbnail quality (default: hqdefault - always available)
 * @returns Thumbnail URL or null if not a valid YouTube URL
 */
export function getYouTubeThumbnailFromUrl(
  url: string | undefined | null,
  quality: YouTubeThumbnailQuality = 'hqdefault'
): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return getYouTubeThumbnailUrl(videoId, quality);
}

/**
 * Get the best available thumbnail for content
 *
 * If backdrop/thumbnail are missing and stream_url is a YouTube URL,
 * generates a YouTube thumbnail URL.
 *
 * @param content Object with optional backdrop, thumbnail, and stream_url
 * @returns Best available image URL or undefined
 */
export function getContentPosterUrl(content: {
  backdrop?: string | null;
  thumbnail?: string | null;
  poster_url?: string | null;
  stream_url?: string | null;
}): string | undefined {
  // Prefer existing images
  if (content.backdrop && isValidImageUrl(content.backdrop)) {
    return content.backdrop;
  }
  if (content.thumbnail && isValidImageUrl(content.thumbnail)) {
    return content.thumbnail;
  }
  if (content.poster_url && isValidImageUrl(content.poster_url)) {
    return content.poster_url;
  }

  // Generate YouTube thumbnail if stream_url is YouTube
  // Use hqdefault (480x360) which is always available for any YouTube video
  // maxresdefault (1280x720) is not always available and causes 404 errors
  if (content.stream_url && isYouTubeUrl(content.stream_url)) {
    const thumbnailUrl = getYouTubeThumbnailFromUrl(content.stream_url, 'hqdefault');
    if (thumbnailUrl) {
      return thumbnailUrl;
    }
  }

  return undefined;
}

/**
 * Check if a URL is a valid image URL
 * (not a placeholder or empty)
 *
 * @param url URL to check
 * @returns true if URL appears to be a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.trim() === '') return false;

  // Check for placeholder patterns
  // NOTE: "default" pattern must be more specific to avoid filtering legitimate
  // TMDB/YouTube thumbnails (e.g., maxresdefault, hqdefault, sddefault)
  const placeholderPatterns = [
    /placeholder/i,
    /no-image/i,
    /noimage/i,
    /default\.(jpg|png|gif|webp)$/i, // Only match "default.jpg" at end of URL, not "maxresdefault"
    /\/default$/i, // Match "/default" at end of path
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }

  // Must start with http:// or https://
  return url.startsWith('http://') || url.startsWith('https://');
}

export default {
  extractYouTubeVideoId,
  isYouTubeUrl,
  getYouTubeThumbnailUrl,
  getYouTubeThumbnailFromUrl,
  getContentPosterUrl,
};
