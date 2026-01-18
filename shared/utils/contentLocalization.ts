/**
 * Content Localization Utility
 * Provides reusable functions to get localized content names, descriptions, and titles
 * across all languages (Hebrew, English, Spanish)
 */

/**
 * Get localized name from a content object
 * Supports: name, name_en, name_es, title, title_en, title_es
 * Falls back to default 'name' field if localized version doesn't exist
 */
export const getLocalizedName = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  // Try language-specific fields first
  if (language === 'en') {
    if (content.name_en) return content.name_en;
    if (content.title_en) return content.title_en;
  } else if (language === 'es') {
    if (content.name_es) return content.name_es;
    if (content.title_es) return content.title_es;
  }

  // Fall back to default fields
  return content.name || content.title || '';
};

/**
 * Get localized description from a content object
 * Supports: description, description_en, description_es
 */
export const getLocalizedDescription = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  if (language === 'en' && content.description_en) return content.description_en;
  if (language === 'es' && content.description_es) return content.description_es;

  return content.description || '';
};

/**
 * Get localized current program/show name for channels/stations
 * Supports: current_program, current_program_en, current_program_es, current_show, current_show_en, current_show_es
 */
export const getLocalizedCurrentProgram = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  // Try current_program fields
  if (language === 'en' && content.current_program_en) return content.current_program_en;
  if (language === 'es' && content.current_program_es) return content.current_program_es;
  if (content.current_program) return content.current_program;

  // Try current_show fields (alternative naming)
  if (language === 'en' && content.current_show_en) return content.current_show_en;
  if (language === 'es' && content.current_show_es) return content.current_show_es;
  if (content.current_show) return content.current_show;

  return '';
};

/**
 * Get localized category label from a content object
 * Supports: category_name_en, category_name_es, category_label field with language-specific entries
 */
export const getLocalizedCategory = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  // Check for direct category_name_XX fields first (from API response)
  if (language === 'en' && content.category_name_en) {
    return content.category_name_en;
  }
  if (language === 'es' && content.category_name_es) {
    return content.category_name_es;
  }

  // Handle category_label object structure
  if (content.category_label) {
    if (typeof content.category_label === 'object') {
      if (language === 'en' && content.category_label.en) {
        return content.category_label.en;
      }
      if (language === 'es' && content.category_label.es) {
        return content.category_label.es;
      }
      if (content.category_label.he || content.category_label[language]) {
        return content.category_label.he || content.category_label[language] || '';
      }
    }
    // If it's a string, return as is
    if (typeof content.category_label === 'string') {
      return content.category_label;
    }
  }

  // Fall back to category field
  return content.category || '';
};

/**
 * Localize all fields of a content object at once
 * Returns a new object with localized fields
 */
export const getLocalizedContent = (
  content: any,
  language: string,
) => {
  return {
    ...content,
    name: getLocalizedName(content, language),
    description: getLocalizedDescription(content, language),
    current_program: getLocalizedCurrentProgram(content, language),
    category: getLocalizedCategory(content, language),
  };
};

/**
 * Localize an array of content objects
 */
export const getLocalizedContents = (
  contents: any[],
  language: string,
) => {
  return contents.map(content => getLocalizedContent(content, language));
};
