/**
 * Utility functions for formatting content metadata
 */

interface ContentMetadata {
  year?: number;
  rating?: string | number;
  content_rating?: string;
  genre?: string;
  genres?: string[];
  cast?: string[];
  director?: string;
  duration?: string | number;
  imdb_rating?: number;
}

/**
 * Formats content metadata into a subtitle string for carousel/hero displays
 * Example outputs:
 * - "2016 • PG-13 • Sci-Fi"
 * - "2023 • ⭐ 8.5 • Drama, Thriller"
 * - "R • Action • 2h 30m"
 */
export function formatContentMetadata(item: ContentMetadata): string {
  const parts: string[] = [];

  // Add year
  if (item.year) {
    parts.push(String(item.year));
  }

  // Add content rating (PG, PG-13, R, etc.) or age rating
  if (item.content_rating) {
    parts.push(item.content_rating);
  } else if (typeof item.rating === 'string' && item.rating.match(/^[A-Z]/)) {
    // If rating looks like a content rating (starts with uppercase letter)
    parts.push(item.rating);
  }

  // Add numeric rating (IMDB, TMDB, etc.)
  if (item.imdb_rating && item.imdb_rating > 0) {
    parts.push(`⭐ ${item.imdb_rating.toFixed(1)}`);
  } else if (typeof item.rating === 'number' && item.rating > 0) {
    parts.push(`⭐ ${item.rating.toFixed(1)}`);
  }

  // Add genres (limit to 2 for brevity)
  if (item.genres && item.genres.length > 0) {
    const genreList = item.genres.slice(0, 2).join(', ');
    parts.push(genreList);
  } else if (item.genre) {
    parts.push(item.genre);
  }

  // Add duration if short enough format
  if (item.duration) {
    const durationStr = String(item.duration);
    // If duration is concise (like "2h 30m" or "120"), add it
    if (durationStr.length <= 10) {
      parts.push(durationStr);
    }
  }

  // Add cast (first actor only if space permits)
  if (item.cast && item.cast.length > 0 && parts.length <= 3) {
    parts.push(item.cast[0]);
  }

  return parts.join(' • ');
}

/**
 * Formats duration from minutes to readable format
 * @param minutes - Duration in minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatDuration(minutes: number | string): string {
  const totalMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
  
  if (isNaN(totalMinutes) || totalMinutes <= 0) {
    return '';
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}
