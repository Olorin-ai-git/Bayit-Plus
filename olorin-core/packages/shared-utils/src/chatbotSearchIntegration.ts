/**
 * Chatbot Search Integration
 *
 * Integrates chatbot with search results to allow voice commands
 * for playing content from search results.
 *
 * Supports commands like:
 * - "Play Fauda"
 * - "Play the first result"
 * - "Play number 3"
 * - "Show me the second one"
 */

interface SearchResult {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  type?: string;
  [key: string]: any;
}

interface PlayCommandResult {
  action: 'play' | 'show' | 'none';
  result?: SearchResult;
  index?: number;
  message?: string;
}

/**
 * Parse user message for play/show commands
 */
function parsePlayCommand(message: string, language: string = 'en'): {
  type: 'number' | 'title' | 'none';
  value?: string | number;
} {
  const lowerMessage = message.toLowerCase().trim();

  // Language-specific patterns
  const playPatterns = {
    en: ['play', 'show', 'watch', 'start', 'open'],
    he: ['תנגן', 'הצג', 'צפה', 'פתח', 'הפעל'],
    es: ['reproducir', 'mostrar', 'ver', 'abrir', 'iniciar'],
  };

  const numberPatterns = {
    en: /(?:number|#|result)\s*(\d+)|(\d+)(?:st|nd|rd|th)/i,
    he: /(?:מספר|תוצאה)\s*(\d+)|(\d+)/i,
    es: /(?:número|resultado)\s*(\d+)|(\d+)(?:º|°)/i,
  };

  const ordinalPatterns = {
    en: /(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)/i,
    he: /(ראשון|שני|שלישי|רביעי|חמישי|שישי|שביעי|שמיני|תשיעי|עשירי)/i,
    es: /(primero|segundo|tercero|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo)/i,
  };

  const ordinalMap: Record<string, Record<string, number>> = {
    en: {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
    },
    he: {
      ראשון: 1,
      שני: 2,
      שלישי: 3,
      רביעי: 4,
      חמישי: 5,
      שישי: 6,
      שביעי: 7,
      שמיני: 8,
      תשיעי: 9,
      עשירי: 10,
    },
    es: {
      primero: 1,
      segundo: 2,
      tercero: 3,
      cuarto: 4,
      quinto: 5,
      sexto: 6,
      séptimo: 7,
      octavo: 8,
      noveno: 9,
      décimo: 10,
    },
  };

  // Check for play command
  const hasPlayCommand = playPatterns[language as keyof typeof playPatterns]?.some((pattern) =>
    lowerMessage.includes(pattern)
  );

  if (!hasPlayCommand) {
    return { type: 'none' };
  }

  // Check for number patterns
  const numberMatch = lowerMessage.match(numberPatterns[language as keyof typeof numberPatterns]);
  if (numberMatch) {
    const number = parseInt(numberMatch[1] || numberMatch[2], 10);
    if (!isNaN(number) && number > 0) {
      return { type: 'number', value: number };
    }
  }

  // Check for ordinal patterns
  const ordinalMatch = lowerMessage.match(ordinalPatterns[language as keyof typeof ordinalPatterns]);
  if (ordinalMatch) {
    const ordinal = ordinalMatch[1].toLowerCase();
    const number = ordinalMap[language]?.[ordinal];
    if (number) {
      return { type: 'number', value: number };
    }
  }

  // Extract title (text after play command)
  const playPattern = playPatterns[language as keyof typeof playPatterns]?.find((p) =>
    lowerMessage.includes(p)
  );
  if (playPattern) {
    const titleMatch = lowerMessage.split(playPattern)[1]?.trim();
    if (titleMatch) {
      return { type: 'title', value: titleMatch };
    }
  }

  return { type: 'none' };
}

/**
 * Find matching search result by title
 */
function findByTitle(
  searchResults: SearchResult[],
  title: string,
  language: string = 'en'
): SearchResult | null {
  if (!title || !searchResults || searchResults.length === 0) {
    return null;
  }

  const lowerTitle = title.toLowerCase();

  // Exact match
  let match = searchResults.find((result) => {
    const mainTitle = result.title?.toLowerCase() || '';
    const enTitle = result.title_en?.toLowerCase() || '';
    const esTitle = result.title_es?.toLowerCase() || '';

    return mainTitle === lowerTitle || enTitle === lowerTitle || esTitle === lowerTitle;
  });

  if (match) return match;

  // Partial match (starts with)
  match = searchResults.find((result) => {
    const mainTitle = result.title?.toLowerCase() || '';
    const enTitle = result.title_en?.toLowerCase() || '';
    const esTitle = result.title_es?.toLowerCase() || '';

    return (
      mainTitle.startsWith(lowerTitle) ||
      enTitle.startsWith(lowerTitle) ||
      esTitle.startsWith(lowerTitle)
    );
  });

  if (match) return match;

  // Fuzzy match (contains)
  match = searchResults.find((result) => {
    const mainTitle = result.title?.toLowerCase() || '';
    const enTitle = result.title_en?.toLowerCase() || '';
    const esTitle = result.title_es?.toLowerCase() || '';

    return (
      mainTitle.includes(lowerTitle) ||
      enTitle.includes(lowerTitle) ||
      esTitle.includes(lowerTitle)
    );
  });

  return match || null;
}

/**
 * Find matching search result by index (1-based)
 */
function findByIndex(searchResults: SearchResult[], index: number): SearchResult | null {
  if (!searchResults || searchResults.length === 0 || index < 1 || index > searchResults.length) {
    return null;
  }

  return searchResults[index - 1] || null;
}

/**
 * Process chatbot message for play command
 */
export function processChatbotPlayCommand(
  message: string,
  searchResults: SearchResult[],
  language: string = 'en'
): PlayCommandResult {
  if (!message || !searchResults || searchResults.length === 0) {
    return { action: 'none' };
  }

  const command = parsePlayCommand(message, language);

  if (command.type === 'none') {
    return { action: 'none' };
  }

  if (command.type === 'number') {
    const index = command.value as number;
    const result = findByIndex(searchResults, index);

    if (result) {
      return {
        action: 'play',
        result,
        index: index - 1,
        message: `Playing result #${index}: ${result.title}`,
      };
    } else {
      return {
        action: 'none',
        message: `Result #${index} not found. Please choose a number between 1 and ${searchResults.length}.`,
      };
    }
  }

  if (command.type === 'title') {
    const title = command.value as string;
    const result = findByTitle(searchResults, title, language);

    if (result) {
      const index = searchResults.indexOf(result);
      return {
        action: 'play',
        result,
        index,
        message: `Playing: ${result.title}`,
      };
    } else {
      return {
        action: 'none',
        message: `"${title}" not found in search results. Please try a different title or result number.`,
      };
    }
  }

  return { action: 'none' };
}

/**
 * Get chatbot suggestions for search results
 */
export function getSearchResultSuggestions(
  searchResults: SearchResult[],
  language: string = 'en'
): string {
  if (!searchResults || searchResults.length === 0) {
    return language === 'he'
      ? 'לא נמצאו תוצאות'
      : language === 'es'
      ? 'No se encontraron resultados'
      : 'No results found';
  }

  const count = Math.min(searchResults.length, 5);

  const suggestions = searchResults.slice(0, count).map((result, index) => {
    const number = index + 1;
    return `${number}. ${result.title}`;
  });

  const intro =
    language === 'he'
      ? `נמצאו ${searchResults.length} תוצאות. תוכל לומר "הפעל מספר 1" או "הפעל Fauda":\n`
      : language === 'es'
      ? `Se encontraron ${searchResults.length} resultados. Puedes decir "Reproducir número 1" o "Reproducir Fauda":\n`
      : `Found ${searchResults.length} results. You can say "Play number 1" or "Play Fauda":\n`;

  return intro + suggestions.join('\n');
}

/**
 * Create chat context with search results
 */
export function createSearchChatContext(searchResults: SearchResult[], query: string) {
  return {
    searchQuery: query,
    searchResults: searchResults.map((result, index) => ({
      index: index + 1,
      id: result.id,
      title: result.title,
      title_en: result.title_en,
      title_es: result.title_es,
      type: result.type,
    })),
    availableCommands: [
      'Play number [1-N]',
      'Play [title]',
      'Show result [number]',
    ],
  };
}

export type { SearchResult, PlayCommandResult };
