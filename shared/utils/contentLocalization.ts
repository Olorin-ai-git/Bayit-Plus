/**
 * Content Localization Utility
 * Provides reusable functions to get localized content names, descriptions, and titles
 * across all supported languages
 */

/**
 * List of supported languages for content localization
 * Note: 'he' is the default/fallback language and doesn't need a suffix
 */
const SUPPORTED_LANGUAGES = ['en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'];

/**
 * Get a localized field value from a content object
 * @param content The content object
 * @param fieldBase The base field name (e.g., 'name', 'title', 'description')
 * @param language The target language code
 * @returns The localized field value or null if not found
 */
const getLocalizedField = (
  content: any,
  fieldBase: string,
  language: string,
): string | null => {
  if (!content || !SUPPORTED_LANGUAGES.includes(language)) return null;
  const localizedField = `${fieldBase}_${language}`;
  return content[localizedField] || null;
};

/**
 * Get localized name from a content object
 * Supports: name, name_xx, title, title_xx where xx is the language code
 * Falls back to default 'name' field if localized version doesn't exist
 */
export const getLocalizedName = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  // Try language-specific name field first
  const localizedName = getLocalizedField(content, 'name', language);
  if (localizedName) return localizedName;

  // Try language-specific title field
  const localizedTitle = getLocalizedField(content, 'title', language);
  if (localizedTitle) return localizedTitle;

  // Fall back to default fields
  return content.name || content.title || '';
};

/**
 * Get localized description from a content object
 * Supports: description, description_xx where xx is the language code
 */
export const getLocalizedDescription = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  const localizedDesc = getLocalizedField(content, 'description', language);
  if (localizedDesc) return localizedDesc;

  return content.description || '';
};

/**
 * Get localized current program/show name for channels/stations
 * Supports: current_program, current_program_xx, current_show, current_show_xx
 */
export const getLocalizedCurrentProgram = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  // Try current_program fields
  const localizedProgram = getLocalizedField(content, 'current_program', language);
  if (localizedProgram) return localizedProgram;
  if (content.current_program) return content.current_program;

  // Try current_show fields (alternative naming)
  const localizedShow = getLocalizedField(content, 'current_show', language);
  if (localizedShow) return localizedShow;
  if (content.current_show) return content.current_show;

  return '';
};

/**
 * Get localized category label from a content object
 * Supports: category_name_xx, category_label object with language-specific entries
 */
export const getLocalizedCategory = (
  content: any,
  language: string,
): string => {
  if (!content) return '';

  // Check for direct category_name_XX fields first (from API response)
  const localizedCategoryName = getLocalizedField(content, 'category_name', language);
  if (localizedCategoryName) return localizedCategoryName;

  // Handle category_label object structure
  if (content.category_label) {
    if (typeof content.category_label === 'object') {
      // Try the specific language
      if (content.category_label[language]) {
        return content.category_label[language];
      }
      // Fall back to Hebrew or any available language
      if (content.category_label.he) {
        return content.category_label.he;
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
