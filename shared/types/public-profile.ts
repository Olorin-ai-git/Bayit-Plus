/**
 * Public Profile Types
 *
 * Shared TypeScript types for CVPlus public profile sharing and visibility.
 * Based on data-model.md specification.
 *
 * @fileoverview Public profile types including PublicProfile, ProfileSection, and sharing controls
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Core Public Profile Interface
// ============================================================================

/**
 * Shareable version of enhanced CV with comprehensive privacy and customization
 */
export interface PublicProfile {
  // Identity
  /** UUID primary key */
  id: string;
  /** Unique URL-friendly identifier for sharing */
  slug: string;
  /** Foreign key to CVJob */
  jobId: string;
  /** Foreign key to UserProfile */
  userId: string;

  // Visibility Controls
  /** Public visibility toggle */
  isActive: boolean;
  /** Password protection enabled */
  passwordProtected: boolean;
  /** Hashed password if password protected */
  password?: string;
  /** Email domain restrictions for access */
  allowedDomains: string[];
  /** IP-based access restrictions */
  allowedIpRanges?: string[];

  // Content Visibility
  /** Which CV sections are visible */
  visibleSections: ProfileSection[];
  /** Custom branding and styling options */
  customBranding?: CustomBranding;
  /** Available contact methods */
  contactOptions: ContactOption[];
  /** Privacy level setting */
  privacyLevel: PrivacyLevel;

  // SEO and Discovery
  /** Meta title for search engines */
  title: string;
  /** Meta description for search engines */
  description: string;
  /** Search keywords and tags */
  tags: string[];
  /** Allow search engine indexing */
  allowIndexing: boolean;

  // Engagement Metrics
  /** Total profile views */
  viewCount: number;
  /** Unique visitors count */
  uniqueViewCount: number;
  /** Last profile viewing timestamp */
  lastViewedAt?: Timestamp;
  /** Contact form submissions count */
  contactFormSubmissions: number;
  /** Social shares count */
  shareCount: number;

  // Time-based Controls
  /** Profile expiration date for time-limited sharing */
  expiresAt?: Timestamp;
  /** Schedule profile activation */
  activatesAt?: Timestamp;

  // Geographic and Device Insights
  /** Top viewer countries */
  topCountries: CountryViewCount[];
  /** Device types used to view profile */
  deviceStats: DeviceStats;

  // Audit
  /** Profile creation timestamp */
  createdAt: Timestamp;
  /** Last profile update timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// Profile Sections Management
// ============================================================================

/**
 * Available CV sections that can be displayed in public profiles
 */
export enum ProfileSection {
  PERSONAL_INFO = 'personal_info',
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  CERTIFICATIONS = 'certifications',
  ACHIEVEMENTS = 'achievements',
  PROJECTS = 'projects',
  PODCAST = 'podcast',
  VIDEO = 'video',
  TIMELINE = 'timeline',
  PORTFOLIO = 'portfolio',
  CONTACT_FORM = 'contact_form',
  QR_CODE = 'qr_code',
  RECOMMENDATIONS = 'recommendations',
  TESTIMONIALS = 'testimonials'
}

/**
 * Type guard for ProfileSection
 */
export function isProfileSection(value: string): value is ProfileSection {
  return Object.values(ProfileSection).includes(value as ProfileSection);
}

/**
 * Default visible sections for new public profiles
 */
export const DEFAULT_VISIBLE_SECTIONS: ProfileSection[] = [
  ProfileSection.PERSONAL_INFO,
  ProfileSection.SUMMARY,
  ProfileSection.EXPERIENCE,
  ProfileSection.EDUCATION,
  ProfileSection.SKILLS,
  ProfileSection.CONTACT_FORM
];

/**
 * Premium-only sections
 */
export const PREMIUM_SECTIONS: ProfileSection[] = [
  ProfileSection.PODCAST,
  ProfileSection.VIDEO,
  ProfileSection.TIMELINE,
  ProfileSection.PORTFOLIO,
  ProfileSection.RECOMMENDATIONS
];

// ============================================================================
// Privacy Level Management
// ============================================================================

/**
 * Privacy levels for public profiles
 */
export enum PrivacyLevel {
  /** Fully public, searchable */
  PUBLIC = 'public',
  /** Public with link only */
  UNLISTED = 'unlisted',
  /** Password protected */
  PROTECTED = 'protected',
  /** Domain restricted */
  RESTRICTED = 'restricted',
  /** Private, owner only */
  PRIVATE = 'private'
}

/**
 * Type guard for PrivacyLevel
 */
export function isPrivacyLevel(value: string): value is PrivacyLevel {
  return Object.values(PrivacyLevel).includes(value as PrivacyLevel);
}

// ============================================================================
// Custom Branding
// ============================================================================

/**
 * Custom branding and styling options for profiles
 */
export interface CustomBranding {
  /** Logo image URL */
  logoUrl?: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (hex) */
  secondaryColor: string;
  /** Accent color for highlights (hex) */
  accentColor: string;
  /** Font family selection */
  fontFamily: string;
  /** Custom CSS for enterprise users */
  customCSS?: string;
  /** Header background image */
  headerBackground?: string;
  /** Brand favicon URL */
  faviconUrl?: string;
}

/**
 * Default branding settings
 */
export const DEFAULT_BRANDING: CustomBranding = {
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#06b6d4',
  fontFamily: 'Inter, sans-serif'
};

/**
 * Validate custom branding settings
 */
export function validateCustomBranding(branding: Partial<CustomBranding>): string[] {
  const errors: string[] = [];

  if (branding.primaryColor && !isValidHexColor(branding.primaryColor)) {
    errors.push('Primary color must be a valid hex color');
  }

  if (branding.secondaryColor && !isValidHexColor(branding.secondaryColor)) {
    errors.push('Secondary color must be a valid hex color');
  }

  if (branding.accentColor && !isValidHexColor(branding.accentColor)) {
    errors.push('Accent color must be a valid hex color');
  }

  if (branding.logoUrl && !isValidUrl(branding.logoUrl)) {
    errors.push('Logo URL must be valid');
  }

  if (branding.customCSS && branding.customCSS.length > 50000) {
    errors.push('Custom CSS cannot exceed 50KB');
  }

  return errors;
}

// ============================================================================
// Contact Options
// ============================================================================

/**
 * Available contact methods for public profiles
 */
export enum ContactOption {
  /** Direct email contact */
  EMAIL = 'email',
  /** Phone number display */
  PHONE = 'phone',
  /** LinkedIn profile link */
  LINKEDIN = 'linkedin',
  /** Calendar booking integration */
  CALENDAR_BOOKING = 'calendar_booking',
  /** Contact form */
  CONTACT_FORM = 'contact_form',
  /** WhatsApp contact */
  WHATSAPP = 'whatsapp',
  /** Telegram contact */
  TELEGRAM = 'telegram',
  /** Custom contact method */
  CUSTOM = 'custom'
}

/**
 * Contact option configuration
 */
export interface ContactConfig {
  option: ContactOption;
  value: string;
  label?: string;
  isVisible: boolean;
  isPrimary: boolean;
}

// ============================================================================
// Analytics and Insights
// ============================================================================

/**
 * Geographic viewing statistics
 */
export interface CountryViewCount {
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode: string;
  /** Country name */
  countryName: string;
  /** View count from this country */
  viewCount: number;
  /** Percentage of total views */
  percentage: number;
}

/**
 * Device and browser statistics
 */
export interface DeviceStats {
  /** Desktop views */
  desktop: number;
  /** Mobile views */
  mobile: number;
  /** Tablet views */
  tablet: number;
  /** Top browsers */
  topBrowsers: BrowserStat[];
  /** Operating system breakdown */
  operatingSystems: OSStats[];
}

/**
 * Browser statistics
 */
export interface BrowserStat {
  /** Browser name */
  name: string;
  /** View count */
  count: number;
  /** Percentage of total views */
  percentage: number;
}

/**
 * Operating system statistics
 */
export interface OSStats {
  /** Operating system name */
  name: string;
  /** View count */
  count: number;
  /** Percentage of total views */
  percentage: number;
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate PublicProfile before database operations
 */
export function validatePublicProfile(profile: Partial<PublicProfile>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!profile.slug) errors.push('Slug is required');
  if (!profile.jobId) errors.push('Job ID is required');
  if (!profile.userId) errors.push('User ID is required');
  if (!profile.title) errors.push('Title is required');

  // Slug validation
  if (profile.slug && !isValidSlug(profile.slug)) {
    errors.push('Slug must be URL-safe (letters, numbers, hyphens only)');
  }

  // Contact options validation
  if (profile.contactOptions && profile.contactOptions.length === 0) {
    errors.push('At least one contact option must be enabled');
  }

  // Visible sections validation
  if (profile.visibleSections) {
    const invalidSections = profile.visibleSections.filter(
      section => !isProfileSection(section)
    );
    if (invalidSections.length > 0) {
      errors.push(`Invalid profile sections: ${invalidSections.join(', ')}`);
    }
  }

  // Privacy level validation
  if (profile.privacyLevel && !isPrivacyLevel(profile.privacyLevel)) {
    errors.push('Invalid privacy level');
  }

  // Password validation for protected profiles
  if (profile.passwordProtected && !profile.password) {
    errors.push('Password is required for password-protected profiles');
  }

  // Domain validation
  if (profile.allowedDomains) {
    const invalidDomains = profile.allowedDomains.filter(domain => !isValidDomain(domain));
    if (invalidDomains.length > 0) {
      errors.push(`Invalid domains: ${invalidDomains.join(', ')}`);
    }
  }

  // Branding validation
  if (profile.customBranding) {
    const brandingErrors = validateCustomBranding(profile.customBranding);
    errors.push(...brandingErrors);
  }

  return errors;
}

/**
 * Type guard for PublicProfile
 */
export function isPublicProfile(obj: any): obj is PublicProfile {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.jobId === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.isActive === 'boolean' &&
    Array.isArray(obj.visibleSections) &&
    Array.isArray(obj.contactOptions) &&
    typeof obj.title === 'string' &&
    typeof obj.viewCount === 'number' &&
    obj.createdAt instanceof Timestamp
  );
}

/**
 * Validate URL-safe slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Generate unique slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Check if profile is expired
 */
export function isProfileExpired(profile: PublicProfile): boolean {
  if (!profile.expiresAt) return false;
  return profile.expiresAt.toMillis() < Date.now();
}

/**
 * Check if profile is active (considering activation time)
 */
export function isProfileCurrentlyActive(profile: PublicProfile): boolean {
  if (!profile.isActive) return false;
  if (isProfileExpired(profile)) return false;

  if (profile.activatesAt) {
    return profile.activatesAt.toMillis() <= Date.now();
  }

  return true;
}

/**
 * Get profile URL
 */
export function getProfileUrl(slug: string, baseUrl: string = 'https://cvplus.app'): string {
  return `${baseUrl}/profile/${slug}`;
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(profile: PublicProfile): number {
  if (profile.viewCount === 0) return 0;

  const engagementActions = profile.contactFormSubmissions + profile.shareCount;
  return Math.round((engagementActions / profile.viewCount) * 100 * 10) / 10;
}

/**
 * Get top performing sections based on views
 */
export function getTopSections(profiles: PublicProfile[]): ProfileSection[] {
  const sectionCounts = new Map<ProfileSection, number>();

  profiles.forEach(profile => {
    profile.visibleSections.forEach(section => {
      const current = sectionCounts.get(section) || 0;
      sectionCounts.set(section, current + profile.viewCount);
    });
  });

  return Array.from(sectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 10);
}

/**
 * Check if user has permission to view profile
 */
export function hasViewPermission(
  profile: PublicProfile,
  userEmail?: string,
  userIp?: string
): boolean {
  if (!profile.isActive || isProfileExpired(profile)) return false;

  // Check activation time
  if (profile.activatesAt && profile.activatesAt.toMillis() > Date.now()) {
    return false;
  }

  // Check privacy level
  switch (profile.privacyLevel) {
    case PrivacyLevel.PRIVATE:
      return false;
    case PrivacyLevel.PROTECTED:
      return profile.passwordProtected; // Assumes password check happens elsewhere
    case PrivacyLevel.RESTRICTED:
      if (profile.allowedDomains.length > 0 && userEmail) {
        const emailDomain = userEmail.split('@')[1];
        return profile.allowedDomains.includes(emailDomain);
      }
      if (profile.allowedIpRanges && userIp) {
        // IP range checking would need additional implementation
        return true; // Simplified for now
      }
      return false;
    case PrivacyLevel.PUBLIC:
    case PrivacyLevel.UNLISTED:
    default:
      return true;
  }
}

/**
 * Get profile analytics summary
 */
export function getAnalyticsSummary(profile: PublicProfile): {
  totalViews: number;
  uniqueViews: number;
  engagementRate: number;
  topCountry: string;
  conversionRate: number;
} {
  const engagementRate = calculateEngagementRate(profile);
  const conversionRate = profile.viewCount > 0
    ? Math.round((profile.contactFormSubmissions / profile.viewCount) * 100 * 10) / 10
    : 0;

  const topCountry = profile.topCountries.length > 0
    ? profile.topCountries[0].countryName
    : 'Unknown';

  return {
    totalViews: profile.viewCount,
    uniqueViews: profile.uniqueViewCount,
    engagementRate,
    topCountry,
    conversionRate
  };
}