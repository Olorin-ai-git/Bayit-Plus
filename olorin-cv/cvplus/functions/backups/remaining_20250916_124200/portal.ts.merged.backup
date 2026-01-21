// @ts-ignore - Export conflicts/**
 * Portal Types for Multimedia QR Code Integration
 */

export interface PortalUrls {
  portal: string;
  chat?: string;
  contact?: string;
  download?: string;
  qrMenu?: string;
}

export interface PortalConfig {
  id: string;
  jobId: string;
  userId: string;
  urls: PortalUrls;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface PortalQRCodeIntegration {
  portalId: string;
  qrCodeIds: string[];
  integrationDate: Date;
  qrCodeTypes: string[];
}

// Additional QR Code types needed by the QR enhancement functions
export enum QRCodeType {
  PROFILE = 'profile',
  CONTACT = 'contact', 
  PORTFOLIO = 'portfolio',
  RESUME_DOWNLOAD = 'resume-download',
  LINKEDIN = 'linkedin',
  CUSTOM = 'custom',
  PORTAL_PRIMARY = 'portal-primary',
  PORTAL_CHAT = 'portal-chat',
  PORTAL_CONTACT = 'portal-contact',
  PORTAL_DOWNLOAD = 'portal-download',
  PORTAL_MENU = 'portal-menu',
  // Additional types referenced in the code
  PRIMARY_PORTAL = 'primary-portal',
  CHAT_DIRECT = 'chat-direct',
  CONTACT_FORM = 'contact-form',
  CV_DOWNLOAD = 'cv-download',
  MULTI_PURPOSE_MENU = 'multi-purpose-menu'
}

export interface QRCodeStyling {
  foregroundColor?: string;
  backgroundColor?: string;
  primaryColor?: string; // Added for compatibility
  logoUrl?: string;
  logoSize?: number;
  logo?: string; // Added for logo property
  size?: number; // Added for compatibility
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

export interface QRCodeAnalytics {
  scans: number;
  uniqueScans: number;
  totalScans: number;  // Added for compatibility
  lastScan?: Date;
  topLocations?: string[];
  locations?: string[]; // Added for compatibility
  deviceTypes?: Record<string, number>;
  devices?: Record<string, number>; // Added for compatibility  
  referrers?: Record<string, number>;
  sources?: Record<string, number>; // Added for compatibility
  conversions?: number; // Added for compatibility
}

// Additional types needed by multimedia functions
export interface QRCodeConfig {
  id?: string;
  type: QRCodeType | string; // Allow both enum and string for flexibility
  data: string;
  styling?: QRCodeStyling;
  template?: QRCodeTemplate;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    expiresAt?: Date;
    isActive?: boolean;
    trackingEnabled?: boolean;
  };
  analytics?: QRCodeAnalytics;
}

export interface QRCodeTemplate {
  id: string;
  name: string;
  description: string;
  styling: QRCodeStyling;
  isDefault?: boolean;
  category?: string;
}

// Media generation types
export interface VideoScene {
  id: string;
  type: 'intro' | 'main' | 'outro';
  duration: number;
  content: string;
  styling?: any;
}

// Portfolio types  
export interface PortfolioGallery {
  id: string;
  userId: string;
  items: PortfolioItem[];
  layout: 'grid' | 'masonry' | 'carousel';
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioItem {
  id: string;
  type: 'image' | 'video' | 'document';
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  order: number;
  metadata?: Record<string, any>;
}