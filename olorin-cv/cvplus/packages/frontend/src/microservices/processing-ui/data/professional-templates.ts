/**
 * Professional Templates
 * CV templates for processing UI
 */

export const PROFESSIONAL_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional CV layout'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary CV design'
  }
];

export const getTemplate = (id: string) => {
  return PROFESSIONAL_TEMPLATES.find(t => t.id === id);
};
