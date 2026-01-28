/**
 * Constants for Youngsters feature
 * Icons and mappings for categories, subcategories, and age groups
 */

export const CATEGORY_ICON_NAMES: Record<string, string> = {
  all: 'discover',
  trending: 'discover',
  news: 'info',
  culture: 'discover',
  educational: 'info',
  music: 'podcasts',
  entertainment: 'vod',
  sports: 'discover',
  tech: 'discover',
  judaism: 'judaism',
};

export const SUBCATEGORY_ICON_NAMES: Record<string, string> = {
  'tiktok-trends': 'discover',
  'viral-videos': 'discover',
  'memes': 'discover',
  'israel-news': 'info',
  'world-news': 'info',
  'science-news': 'info',
  'sports-news': 'discover',
  'music-culture': 'podcasts',
  'film-culture': 'vod',
  'art-culture': 'discover',
  'food-culture': 'discover',
  'study-help': 'info',
  'career-prep': 'discover',
  'life-skills': 'discover',
  'teen-movies': 'vod',
  'teen-series': 'vod',
  'gaming': 'discover',
  'coding': 'discover',
  'gadgets': 'discover',
  'bar-bat-mitzvah': 'discover',
  'teen-torah': 'judaism',
  'jewish-history': 'judaism',
};

export const AGE_GROUP_ICON_NAMES: Record<string, string> = {
  'middle-school': 'discover',
  'high-school': 'discover',
};

// Export old names for backward compatibility
export const CATEGORY_ICONS = CATEGORY_ICON_NAMES;
export const SUBCATEGORY_ICONS = SUBCATEGORY_ICON_NAMES;
export const AGE_GROUP_ICONS = AGE_GROUP_ICON_NAMES;
