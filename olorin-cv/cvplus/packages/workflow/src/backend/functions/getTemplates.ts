import { CVTemplate } from '../../types';
import { corsOptions } from '../../config/cors';

const templates: CVTemplate[] = [
  {
    id: 'modern-tech',
    name: 'Modern Tech',
    description: 'Clean and modern design perfect for tech professionals',
    thumbnailUrl: 'https://storage.googleapis.com/cvplus/templates/modern-tech.png',
    previewUrl: 'https://storage.googleapis.com/cvplus/templates/modern-tech-preview.png',
    templateUrl: 'https://storage.googleapis.com/cvplus/templates/modern-tech-template.html',
    category: 'technical',
    isPremium: false,
    isFeatured: true,
    tags: ['modern', 'tech', 'clean', 'professional'],
    compatibility: {
      features: ['contact-info', 'work-experience', 'skills', 'education'],
      industries: ['technology', 'software', 'engineering'],
      roles: ['developer', 'engineer', 'architect', 'analyst']
    },
    styling: {
      colorScheme: 'blue-modern',
      fontFamily: 'Inter',
      layout: 'two-column',
      sections: ['header', 'summary', 'experience', 'skills', 'education']
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    version: '1.0.0',
    createdBy: 'system'
  },
  {
    id: 'executive-classic',
    name: 'Executive Classic',
    description: 'Traditional and professional design for senior positions',
    thumbnailUrl: 'https://storage.googleapis.com/cvplus/templates/executive-classic.png',
    previewUrl: 'https://storage.googleapis.com/cvplus/templates/executive-classic-preview.png',
    templateUrl: 'https://storage.googleapis.com/cvplus/templates/executive-classic-template.html',
    category: 'executive',
    isPremium: true,
    isFeatured: true,
    tags: ['classic', 'executive', 'traditional', 'formal'],
    compatibility: {
      features: ['contact-info', 'work-experience', 'achievements', 'education'],
      industries: ['finance', 'consulting', 'management', 'corporate'],
      roles: ['ceo', 'director', 'vp', 'manager', 'consultant']
    },
    styling: {
      colorScheme: 'classic-dark',
      fontFamily: 'Playfair Display',
      layout: 'single-column',
      sections: ['header', 'executive-summary', 'experience', 'achievements', 'education']
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-25'),
    version: '1.1.0',
    createdBy: 'system'
  },
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    description: 'Bold and creative layout for designers and artists',
    thumbnailUrl: 'https://storage.googleapis.com/cvplus/templates/creative-designer.png',
    previewUrl: 'https://storage.googleapis.com/cvplus/templates/creative-designer-preview.png',
    templateUrl: 'https://storage.googleapis.com/cvplus/templates/creative-designer-template.html',
    category: 'creative',
    isPremium: true,
    isFeatured: false,
    tags: ['creative', 'designer', 'artistic', 'modern'],
    compatibility: {
      features: ['contact-info', 'portfolio', 'work-experience', 'skills'],
      industries: ['design', 'advertising', 'media', 'arts'],
      roles: ['designer', 'artist', 'creative-director', 'illustrator']
    },
    styling: {
      colorScheme: 'vibrant-creative',
      fontFamily: 'Bebas Neue',
      layout: 'multi-column',
      sections: ['header', 'portfolio', 'experience', 'skills', 'education']
    },
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-22'),
    version: '1.0.1',
    createdBy: 'system'
  }
];

export const getTemplates = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    const { category, includePublic } = request.data;
    
    let filteredTemplates = templates;
    
    if (category) {
      filteredTemplates = templates.filter(t => t.category === category);
    }
    
    if (!includePublic) {
      filteredTemplates = filteredTemplates.filter(t => !t.isPremium);
    }
    
    return {
      templates: filteredTemplates,
      total: filteredTemplates.length
    };
  }
);