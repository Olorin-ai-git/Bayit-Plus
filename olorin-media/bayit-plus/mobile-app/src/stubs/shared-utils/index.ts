/**
 * Shared Utils Stub
 * Temporary implementation until monorepo is configured
 */

export const getLocalizedName = (item: any, lang: string = 'en') => {
  if (!item) return '';

  const langKey = lang === 'he' ? 'name' : `name_${lang}`;
  return item[langKey] || item.name || item.title || '';
};

export const getLocalizedDescription = (item: any, lang: string = 'en') => {
  if (!item) return '';

  const langKey = lang === 'he' ? 'description' : `description_${lang}`;
  return item[langKey] || item.description || '';
};

export const getLocalizedCurrentProgram = (channel: any, lang: string = 'en') => {
  if (!channel) return '';

  const langKey = lang === 'he' ? 'current_program' : `current_program_${lang}`;
  return channel[langKey] || channel.currentProgram || channel.current_program || '';
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatDate = (dateString: string, lang: string = 'en'): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(lang);
};
