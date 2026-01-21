export const detectPlaceholders = (text: string): string[] => {
  const placeholderPattern = /\[.+?\]/g;
  const matches = text.match(placeholderPattern);
  return matches || [];
};

export const replacePlaceholder = (text: string, placeholder: string, value: string): string => {
  return text.replace(new RegExp(placeholder, 'g'), value);
};
