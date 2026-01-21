// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// Import from core types - simplified for now
export interface MediaFile {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface PremiumFeatures {
  customDomain?: boolean;
  advancedAnalytics?: boolean;
  prioritySupport?: boolean;
  customTemplates?: boolean;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface PublicProfileData {
  id: string;
  userId: string;
  slug: string;
  customDomain?: string;
  isPublic: boolean;
  name: string;
  title: string;
  headline?: string;
  profileImage?: string;
  backgroundImage?: string;
  location?: string;
  email?: string;
  phone?: string;
  website?: string;
  socialLinks: SocialLinks;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications?: CertificationItem[];
  portfolio: PortfolioItem[];
  testimonials?: TestimonialItem[];
  contactInfo: ContactInfo;
  seoSettings: SEOSettings;
  privacySettings: PrivacySettings;
  brandingSettings: BrandingSettings;
  metadata: ProfileMetadata;
  analytics: ProfileAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  behance?: string;
  dribbble?: string;
  personalWebsite?: string;
  custom?: CustomSocialLink[];
}

export interface CustomSocialLink {
  platform: string;
  url: string;
  displayName: string;
  icon?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  highlights: string[];
  technologies?: string[];
  achievements?: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  honors?: string[];
  description?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
  badgeImage?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: MediaFile[];
  videos?: MediaFile[];
  audio?: MediaFile[];
  documents?: MediaFile[];
  links?: ProjectLink[];
  technologies?: string[];
  featured: boolean;
  completionDate?: string;
  projectRole?: string;
  teamSize?: number;
  clientName?: string;
  isPublic: boolean;
}

export interface ProjectLink {
  type: 'demo' | 'repository' | 'documentation' | 'article' | 'custom';
  url: string;
  label: string;
}

export interface TestimonialItem {
  id: string;
  author: string;
  authorTitle?: string;
  authorCompany?: string;
  authorImage?: string;
  content: string;
  rating?: number;
  date: string;
  relationship: 'colleague' | 'manager' | 'client' | 'employee' | 'other';
  isPublic: boolean;
  isVerified: boolean;
}

export interface ContactInfo {
  allowDirectContact: boolean;
  showEmail: boolean;
  showPhone: boolean;
  preferredContactMethod: 'email' | 'phone' | 'form' | 'social';
  responseTime?: string;
  availableForWork: boolean;
  workLocation: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  contactFormSettings: ContactFormSettings;
}

export interface ContactFormSettings {
  enabled: boolean;
  requireMessage: boolean;
  customFields: CustomFormField[];
  autoReply: boolean;
  autoReplyMessage?: string;
  notificationEmail?: string;
  spamProtection: boolean;
  rateLimitEnabled: boolean;
}

export interface CustomFormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: FieldValidation;
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  customValidator?: string;
}

export interface SEOSettings {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  openGraphSettings: OpenGraphSettings;
  twitterCardSettings: TwitterCardSettings;
  structuredDataEnabled: boolean;
  customMeta?: CustomMetaTag[];
}

export interface OpenGraphSettings {
  title?: string;
  description?: string;
  image?: string;
  type: 'profile' | 'website';
  locale: string;
  siteName: string;
}

export interface TwitterCardSettings {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface CustomMetaTag {
  name?: string;
  property?: string;
  content: string;
  httpEquiv?: string;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'unlisted' | 'private';
  searchEngineIndexing: boolean;
  showInDirectory: boolean;
  allowDirectMessages: boolean;
  showLastActiveDate: boolean;
  hideContactInfo: boolean;
  blockedUsers: string[];
  allowedCountries?: string[];
  gdprCompliant: boolean;
  cookieConsent: boolean;
}

export interface BrandingSettings {
  customColors: ColorScheme;
  typography: TypographySettings;
  layout: LayoutSettings;
  customCSS?: string;
  logoImage?: string;
  faviconImage?: string;
  customDomainEnabled: boolean;
  customDomainUrl?: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface TypographySettings {
  fontFamily: string;
  headingFont?: string;
  fontSize: 'small' | 'medium' | 'large';
  lineHeight: number;
  letterSpacing: number;
}

export interface LayoutSettings {
  template: ProfileTemplate;
  sectionOrder: string[];
  showSectionIcons: boolean;
  compactMode: boolean;
  sidebarPosition: 'left' | 'right' | 'none';
  headerStyle: 'banner' | 'card' | 'minimal';
  animationsEnabled: boolean;
}

export type ProfileTemplate = 
  | 'professional' 
  | 'creative' 
  | 'executive' 
  | 'tech' 
  | 'academic' 
  | 'artist' 
  | 'consultant' 
  | 'entrepreneur' 
  | 'custom';

export interface ProfileMetadata {
  version: string;
  templateVersion: string;
  language: string;
  timezone: string;
  currency?: string;
  industry?: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  profileCompleteness: number;
  verificationStatus: VerificationStatus;
  premiumFeatures: PremiumFeatures;
  subscriptionTier: SubscriptionTier;
}

export interface VerificationStatus {
  email: boolean;
  phone: boolean;
  identity: boolean;
  employment: boolean;
  education: boolean;
  certifications: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface ProfileAnalytics {
  totalViews: number;
  uniqueViews: number;
  monthlyViews: number;
  weeklyViews: number;
  dailyViews: number;
  viewsHistory: ViewHistoryEntry[];
  topReferrers: ReferrerEntry[];
  topCountries: CountryViewEntry[];
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  contactFormSubmissions: number;
  downloadCount: number;
  shareCount: number;
  lastAnalyticsUpdate: Date;
}

export interface ViewHistoryEntry {
  date: string;
  views: number;
  uniqueViews: number;
  referrer?: string;
  country?: string;
  device?: string;
  browser?: string;
}

export interface ReferrerEntry {
  referrer: string;
  views: number;
  percentage: number;
}

export interface CountryViewEntry {
  country: string;
  countryCode: string;
  views: number;
  percentage: number;
}

export interface ProfileCreationOptions {
  template?: ProfileTemplate;
  customizations?: Partial<BrandingSettings>;
  publishImmediately?: boolean;
  customDomain?: string;
  targetKeywords?: string[];
  industryFocus?: string;
  locationTargeting?: string;
  seoOptimization?: boolean;
  analyticsEnabled?: boolean;
  socialIntegration?: boolean;
}

export interface ProfileUpdateOptions {
  seoOptions?: SEOOptimizationOptions;
  analyticsUpdate?: boolean;
  reindexForSearch?: boolean;
  notifyConnections?: boolean;
  generateSitemap?: boolean;
}

export interface SEOOptimizationOptions {
  targetKeywords?: string[];
  industry?: string;
  location?: string;
  competitorAnalysis?: boolean;
  performanceOptimization?: boolean;
  schemaMarkup?: boolean;
}

export interface PublicProfileResult {
  success: boolean;
  profile?: PublicProfileData;
  urls?: ProfileURLs;
  seoReport?: SEOReport;
  errors?: string[];
}

export interface ProfileUpdateResult {
  success: boolean;
  profile?: PublicProfileData;
  changes?: ProfileChange[];
  seoReport?: SEOReport;
  errors?: string[];
}

export interface ProfileChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  changetype: 'create' | 'update' | 'delete';
}

export interface ProfileURLs {
  publicUrl: string;
  customDomainUrl?: string;
  qrCodeUrl: string;
  pdfExportUrl: string;
  apiUrl: string;
  editUrl: string;
  analyticsUrl: string;
  shareUrls: SocialShareURLs;
}

export interface SocialShareURLs {
  linkedin: string;
  twitter: string;
  facebook: string;
  email: string;
  whatsapp: string;
  telegram: string;
  copy: string;
}

export interface SEOReport {
  score: number;
  issues: SEOIssue[];
  opportunities: SEOOpportunity[];
  recommendations: SEORecommendation[];
  technicalHealth: TechnicalHealthReport;
  keywordAnalysis: KeywordAnalysisReport;
  competitorAnalysis?: CompetitorAnalysisReport;
  generatedAt: Date;
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: 'meta' | 'content' | 'technical' | 'performance' | 'accessibility';
  message: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
  priority: number;
}

export interface SEOOpportunity {
  category: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface SEORecommendation {
  title: string;
  description: string;
  category: string;
  impact: number;
  implementation: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

export interface TechnicalHealthReport {
  pageSpeed: number;
  mobileUsability: number;
  securityScore: number;
  accessibilityScore: number;
  validHTML: boolean;
  validCSS: boolean;
  httpsEnabled: boolean;
  robotsTxtValid: boolean;
  sitemapValid: boolean;
}

export interface KeywordAnalysisReport {
  targetKeywords: KeywordData[];
  suggestions: KeywordSuggestion[];
  density: KeywordDensity[];
  competition: CompetitionData;
}

export interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  currentRanking?: number;
  opportunity: number;
}

export interface KeywordSuggestion {
  keyword: string;
  relevance: number;
  volume: number;
  difficulty: number;
  reason: string;
}

export interface KeywordDensity {
  keyword: string;
  count: number;
  density: number;
  optimal: boolean;
}

export interface CompetitionData {
  competitorCount: number;
  averageDifficulty: number;
  marketSaturation: number;
}

export interface CompetitorAnalysisReport {
  competitors: CompetitorProfile[];
  gaps: OpportunityGap[];
  advantages: CompetitiveAdvantage[];
}

export interface CompetitorProfile {
  url: string;
  name: string;
  title: string;
  strengths: string[];
  weaknesses: string[];
  keywordOverlap: number;
  estimatedTraffic: number;
}

export interface OpportunityGap {
  category: string;
  description: string;
  competitorExample?: string;
  implementation: string;
  priority: number;
}

export interface CompetitiveAdvantage {
  category: string;
  description: string;
  strength: number;
  uniqueness: boolean;
}