/**
 * Portal-related types for admin validation services
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

export interface PortalConfig {
  id: string;
  userId: string;
  name: string;
  description?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  layout: {
    template: string;
    sections: PortalSection[];
    navigation: NavigationConfig;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    customMetaTags?: Record<string, string>;
  };
  domain?: {
    subdomain: string;
    customDomain?: string;
    sslEnabled: boolean;
  };
  privacy: {
    isPublic: boolean;
    requiresApproval: boolean;
    allowComments: boolean;
    showContactInfo: boolean;
  };
  analytics: {
    enabled: boolean;
    trackingId?: string;
    customEvents?: string[];
  };
  features: {
    downloadCV: boolean;
    contactForm: boolean;
    testimonials: boolean;
    projects: boolean;
    blog: boolean;
    calendar: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    status: 'draft' | 'published' | 'archived';
  };
}

export interface PortalSection {
  id: string;
  type: 'hero' | 'about' | 'experience' | 'skills' | 'projects' | 'testimonials' | 'contact' | 'custom';
  title: string;
  content: Record<string, any>;
  order: number;
  visible: boolean;
  settings: {
    backgroundColor?: string;
    textColor?: string;
    layout?: string;
    animation?: string;
  };
}

export interface NavigationConfig {
  style: 'horizontal' | 'vertical' | 'sidebar' | 'floating';
  position: 'top' | 'bottom' | 'left' | 'right';
  items: Array<{
    label: string;
    target: string;
    icon?: string;
    visible: boolean;
  }>;
  branding: {
    logo?: string;
    title?: string;
    showTitle: boolean;
  };
}

export interface PortalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'academic' | 'technical' | 'executive';
  preview: {
    image: string;
    thumbnail: string;
  };
  features: string[];
  config: Partial<PortalConfig>;
  isPremium: boolean;
  price?: number;
  popularity: number;
  tags: string[];
}

export interface PortalAnalytics {
  portalId: string;
  period: {
    start: string;
    end: string;
  };
  visitors: {
    total: number;
    unique: number;
    returning: number;
  };
  pageViews: {
    total: number;
    average: number;
    topPages: Array<{
      path: string;
      views: number;
      uniqueViews: number;
    }>;
  };
  engagement: {
    averageTimeOnSite: number;
    bounceRate: number;
    pagesPerSession: number;
  };
  sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  locations: Array<{
    country: string;
    city?: string;
    visitors: number;
  }>;
  conversions: {
    contactFormSubmissions: number;
    cvDownloads: number;
    externalLinkClicks: number;
  };
}

export interface PortalValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  suggestions: Array<{
    category: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  score: {
    overall: number;
    seo: number;
    performance: number;
    accessibility: number;
    design: number;
  };
}