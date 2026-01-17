/**
 * Search Results Text-to-Speech Helper
 *
 * Integrates the existing ttsService with search results
 * for reading search result titles and descriptions aloud.
 */

import { ttsService } from '../services/ttsService';

interface SearchResult {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  genres?: string[];
  year?: number;
  type?: string;
  cast?: string[];
  director?: string;
}

/**
 * Get localized text from search result
 */
function getLocalizedText(result: SearchResult, language: string): string {
  // Get localized title
  let title = result.title;
  if (language === 'en' && result.title_en) {
    title = result.title_en;
  } else if (language === 'es' && result.title_es) {
    title = result.title_es;
  }

  // Get localized description
  let description = result.description || '';
  if (language === 'en' && result.description_en) {
    description = result.description_en;
  } else if (language === 'es' && result.description_es) {
    description = result.description_es;
  }

  return { title, description };
}

/**
 * Format search result for speech
 */
function formatSearchResultForSpeech(
  result: SearchResult,
  language: string,
  includeMetadata: boolean = true
): string {
  const { title, description } = getLocalizedText(result, language);
  const parts: string[] = [title];

  if (includeMetadata) {
    // Add year
    if (result.year) {
      parts.push(`from ${result.year}`);
    }

    // Add genres
    if (result.genres && result.genres.length > 0) {
      const genreList = result.genres.slice(0, 2).join(' and ');
      parts.push(`Genre: ${genreList}`);
    }

    // Add cast (first actor only)
    if (result.cast && result.cast.length > 0) {
      parts.push(`starring ${result.cast[0]}`);
    }

    // Add director
    if (result.director) {
      parts.push(`directed by ${result.director}`);
    }
  }

  // Add description
  if (description) {
    parts.push(description);
  }

  return parts.join('. ');
}

/**
 * Speak a single search result
 */
export function speakSearchResult(
  result: SearchResult,
  language: string = 'en',
  priority: 'high' | 'normal' | 'low' = 'normal',
  includeMetadata: boolean = true
): void {
  const text = formatSearchResultForSpeech(result, language, includeMetadata);

  ttsService.speak(text, priority, undefined, {
    onStart: () => console.log(`[SearchTTS] Speaking: ${result.title}`),
    onComplete: () => console.log(`[SearchTTS] Completed: ${result.title}`),
    onError: (error) => console.error(`[SearchTTS] Error speaking ${result.title}:`, error),
  });
}

/**
 * Speak multiple search results in sequence
 */
export function speakSearchResults(
  results: SearchResult[],
  language: string = 'en',
  maxResults: number = 5
): void {
  if (!results || results.length === 0) {
    const noResultsText =
      language === 'he' ? 'לא נמצאו תוצאות' :
      language === 'es' ? 'No se encontraron resultados' :
      'No results found';
    ttsService.speak(noResultsText, 'normal');
    return;
  }

  // Limit results to prevent overwhelming
  const limitedResults = results.slice(0, maxResults);

  // Announce number of results first
  const introText =
    language === 'he' ? `נמצאו ${limitedResults.length} תוצאות` :
    language === 'es' ? `Se encontraron ${limitedResults.length} resultados` :
    `Found ${limitedResults.length} results`;

  ttsService.speak(introText, 'normal');

  // Queue each result
  limitedResults.forEach((result, index) => {
    const resultNumber = index + 1;
    const numberPrefix =
      language === 'he' ? `תוצאה ${resultNumber}` :
      language === 'es' ? `Resultado ${resultNumber}` :
      `Result ${resultNumber}`;

    const text = `${numberPrefix}. ${formatSearchResultForSpeech(result, language, false)}`;

    ttsService.speak(text, 'normal');
  });
}

/**
 * Speak result summary (title only)
 */
export function speakSearchResultSummary(
  result: SearchResult,
  language: string = 'en',
  index?: number
): void {
  const { title } = getLocalizedText(result, language);

  let text = title;
  if (index !== undefined) {
    const number = index + 1;
    const prefix =
      language === 'he' ? `תוצאה ${number}` :
      language === 'es' ? `Resultado ${number}` :
      `Result ${number}`;
    text = `${prefix}. ${title}`;
  }

  ttsService.speak(text, 'normal');
}

/**
 * Stop all TTS playback
 */
export function stopSearchTTS(): void {
  ttsService.stop();
}

/**
 * Clear TTS queue
 */
export function clearSearchTTSQueue(): void {
  ttsService.clearQueue();
}

/**
 * Pause TTS playback
 */
export function pauseSearchTTS(): void {
  ttsService.pause();
}

/**
 * Resume TTS playback
 */
export function resumeSearchTTS(): void {
  ttsService.resume();
}

/**
 * Check if TTS is currently playing
 */
export function isSearchTTSPlaying(): boolean {
  return ttsService.isCurrentlyPlaying();
}
