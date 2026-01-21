# Data Model: CVPlus

**Feature**: CVPlus - AI-Powered CV Transformation Platform
**Date**: 2025-09-13
**Version**: 1.0.0

## Overview
This document defines the core data entities for the CVPlus platform, including their attributes, relationships, and validation rules derived from the functional requirements.

## Core Entities

### User Profile
**Purpose**: Represents platform users with authentication and subscription management

```typescript
interface UserProfile {
  // Identity
  id: string;                    // UUID primary key
  email: string;                 // Unique, validated email
  name: string;                  // Display name

  // Authentication
  providerId: string;            // Firebase Auth provider
  lastLoginAt: timestamp;        // Last activity tracking

  // Subscription & Billing
  subscription: SubscriptionTier; // free | premium | enterprise
  credits: number;               // Available processing credits
  subscriptionEndsAt?: timestamp; // For paid tiers

  // Preferences
  language: string;              // ISO 639-1 code (default: 'en')
  timezone: string;              // IANA timezone
  privacySettings: PrivacySettings;

  // Audit
  createdAt: timestamp;
  updatedAt: timestamp;

  // Data Retention
  lastActivityAt: timestamp;     // For retention policy
  deletionScheduledAt?: timestamp; // GDPR compliance
}

enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

interface PrivacySettings {
  allowPublicProfiles: boolean;
  allowAnalyticsTracking: boolean;
  allowMarketingEmails: boolean;
  dataRetentionDays: number;     // Overrides default for premium+
}
```

**Validation Rules**:
- Email must be valid format and unique
- Name must be 2-100 characters
- Credits cannot be negative
- Subscription tier determines feature access

### CV Job
**Purpose**: Represents a CV processing request with status tracking

```typescript
interface CVJob {
  // Identity
  id: string;                    // UUID primary key
  userId: string;                // Foreign key to UserProfile

  // Processing Status
  status: ProcessingStatus;
  progress: number;              // 0-100 percentage
  errorMessage?: string;         // If status is failed

  // Input
  originalFileName: string;
  originalFileUrl: string;       // Firebase Storage URL
  originalFileSize: number;      // Bytes
  inputType: InputType;          // file | url

  // Selected Features
  selectedFeatures: FeatureType[];
  customizations: Record<string, any>; // Feature-specific settings

  // Performance Tracking
  processingStartedAt?: timestamp;
  processingCompletedAt?: timestamp;
  totalProcessingTimeMs?: number;

  // Audit
  createdAt: timestamp;
  updatedAt: timestamp;
}

enum ProcessingStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

enum InputType {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  CSV = 'csv',
  URL = 'url'
}

enum FeatureType {
  PODCAST = 'podcast',
  VIDEO = 'video',
  TIMELINE = 'timeline',
  PORTFOLIO = 'portfolio',
  ATS_OPTIMIZATION = 'ats_optimization',
  PERSONALITY_INSIGHTS = 'personality_insights',
  PUBLIC_PROFILE = 'public_profile',
  QR_CODE = 'qr_code'
}
```

**Validation Rules**:
- File size must be ≤ 10MB
- Selected features must match user's subscription tier
- Processing timeout after 5 minutes

### Processed CV
**Purpose**: Structured representation of analyzed CV content

```typescript
interface ProcessedCV {
  // Identity
  id: string;                    // UUID primary key
  jobId: string;                 // Foreign key to CVJob

  // Personal Information
  personalInfo: PersonalInfo;

  // CV Content
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
  achievements: Achievement[];
  projects: Project[];

  // AI Analysis Results
  atsScore: number;              // 0-100 compatibility score
  personalityInsights: PersonalityProfile;
  suggestedImprovements: string[];
  extractedKeywords: string[];

  // Metadata
  originalLanguage: string;      // Detected language
  confidenceScore: number;       // 0-100 extraction confidence
  processingVersion: string;     // AI model version used

  // Audit
  createdAt: timestamp;
  updatedAt: timestamp;
}

interface PersonalInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  github?: string;
}

interface Experience {
  company: string;
  position: string;
  startDate: string;             // YYYY-MM format
  endDate?: string;              // null for current
  location?: string;
  description: string;
  achievements: string[];
  skills: string[];
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  achievements: string[];
}

interface Skills {
  technical: string[];
  soft: string[];
  languages: LanguageProficiency[];
  tools: string[];
}

interface LanguageProficiency {
  language: string;
  level: ProficiencyLevel;       // native | fluent | advanced | intermediate | basic
}

interface Certification {
  name: string;
  issuer: string;
  dateIssued: string;
  expirationDate?: string;
  credentialId?: string;
  verificationUrl?: string;
}

interface Achievement {
  title: string;
  description: string;
  date?: string;
  category: AchievementCategory;
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

interface PersonalityProfile {
  mbtiType?: string;             // 4-letter MBTI code
  bigFiveScores: {
    openness: number;            // 0-100
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  workingStyle: string[];
  idealRoles: string[];
}
```

**Validation Rules**:
- ATS score must be 0-100
- Dates must be valid YYYY-MM format
- Email must be valid format if provided

### Generated Content
**Purpose**: Multimedia assets created from CV content

```typescript
interface GeneratedContent {
  // Identity
  id: string;                    // UUID primary key
  jobId: string;                 // Foreign key to CVJob
  contentType: ContentType;

  // Content URLs
  fileUrl: string;               // Firebase Storage URL
  previewUrl?: string;           // Thumbnail/preview

  // Content Metadata
  fileName: string;
  fileSize: number;              // Bytes
  mimeType: string;
  duration?: number;             // For audio/video content (seconds)

  // Generation Details
  generationParameters: Record<string, any>; // Service-specific params
  generatedWith: string;         // Service used (elevenlabs, d-id, etc.)
  generationCost: number;        // API cost in USD

  // Status
  status: GenerationStatus;
  errorMessage?: string;

  // Audit
  createdAt: timestamp;
  updatedAt: timestamp;
  expiresAt?: timestamp;         // For temporary content
}

enum ContentType {
  PODCAST_AUDIO = 'podcast_audio',
  VIDEO_INTRO = 'video_intro',
  TIMELINE_SVG = 'timeline_svg',
  PORTFOLIO_PDF = 'portfolio_pdf',
  QR_CODE_PNG = 'qr_code_png',
  ENHANCED_CV_PDF = 'enhanced_cv_pdf',
  ENHANCED_CV_DOCX = 'enhanced_cv_docx',
  ENHANCED_CV_HTML = 'enhanced_cv_html'
}

enum GenerationStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

**Validation Rules**:
- File URLs must be valid Firebase Storage URLs
- Duration required for audio/video content
- Generation cost must be positive

### Public Profile
**Purpose**: Shareable version of enhanced CV with privacy settings

```typescript
interface PublicProfile {
  // Identity
  id: string;                    // UUID primary key
  slug: string;                  // Unique URL-friendly identifier
  jobId: string;                 // Foreign key to CVJob
  userId: string;                // Foreign key to UserProfile

  // Visibility Settings
  isActive: boolean;             // Public visibility toggle
  passwordProtected: boolean;
  password?: string;             // Hashed if password protected
  allowedDomains: string[];      // Email domain restrictions

  // Content Control
  visibleSections: ProfileSection[];
  customBranding?: CustomBranding;
  contactOptions: ContactOption[];

  // SEO & Discovery
  title: string;                 // Meta title
  description: string;           // Meta description
  tags: string[];               // Search keywords

  // Engagement
  viewCount: number;
  lastViewedAt?: timestamp;
  contactFormSubmissions: number;

  // Expiration
  expiresAt?: timestamp;         // For time-limited sharing

  // Audit
  createdAt: timestamp;
  updatedAt: timestamp;
}

enum ProfileSection {
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
  CONTACT_FORM = 'contact_form'
}

interface CustomBranding {
  logoUrl?: string;
  primaryColor: string;          // Hex color code
  secondaryColor: string;
  fontFamily: string;
  customCSS?: string;            // For enterprise users
}

enum ContactOption {
  EMAIL = 'email',
  PHONE = 'phone',
  LINKEDIN = 'linkedin',
  CALENDAR_BOOKING = 'calendar_booking',
  CONTACT_FORM = 'contact_form'
}
```

**Validation Rules**:
- Slug must be unique and URL-safe
- Colors must be valid hex codes
- At least one contact option must be enabled

### Analytics Data
**Purpose**: Usage metrics, profile views, and engagement tracking

```typescript
interface AnalyticsEvent {
  // Identity
  id: string;                    // UUID primary key

  // Event Details
  eventType: EventType;
  entityType: EntityType;        // What was interacted with
  entityId: string;              // ID of the entity

  // User Context
  userId?: string;               // Null for anonymous events
  sessionId: string;             // Browser session

  // Request Context
  ipAddress: string;             // Anonymized after 30 days
  userAgent: string;
  referrer?: string;
  country?: string;              // GeoIP lookup

  // Event Data
  eventData: Record<string, any>; // Event-specific payload

  // Timing
  timestamp: timestamp;
  duration?: number;             // For timed events (ms)
}

enum EventType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  SHARE = 'share',
  CONTACT_FORM_SUBMIT = 'contact_form_submit',
  MULTIMEDIA_PLAY = 'multimedia_play',
  FEATURE_INTERACTION = 'feature_interaction',
  CONVERSION = 'conversion',
  ERROR = 'error'
}

enum EntityType {
  PUBLIC_PROFILE = 'public_profile',
  CV_JOB = 'cv_job',
  GENERATED_CONTENT = 'generated_content',
  USER_PROFILE = 'user_profile'
}

interface AnalyticsAggregate {
  // Aggregation Key
  id: string;                    // Composite key
  entityType: EntityType;
  entityId: string;
  period: AggregationPeriod;     // hour | day | week | month
  startTime: timestamp;

  // Metrics
  viewCount: number;
  uniqueViewCount: number;
  downloadCount: number;
  shareCount: number;
  contactFormSubmissions: number;
  averageEngagementTime: number; // Seconds
  bounceRate: number;            // Percentage

  // Geographic Distribution
  topCountries: CountryStats[];

  // Referrer Sources
  topReferrers: ReferrerStats[];

  // Updated
  lastUpdated: timestamp;
}

interface CountryStats {
  country: string;
  viewCount: number;
  percentage: number;
}

interface ReferrerStats {
  referrer: string;
  viewCount: number;
  percentage: number;
}
```

**Validation Rules**:
- IP addresses must be anonymized after 30 days (GDPR)
- Event timestamps must be within reasonable bounds
- Aggregates must be updated at least daily

## Entity Relationships

### Primary Relationships
- **User Profile** → **CV Job** (1:many)
- **CV Job** → **Processed CV** (1:1)
- **CV Job** → **Generated Content** (1:many)
- **CV Job** → **Public Profile** (1:1)
- **Public Profile** → **Analytics Event** (1:many)

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_cv_jobs_user_status ON cv_jobs(userId, status);
CREATE INDEX idx_public_profiles_slug ON public_profiles(slug) UNIQUE;
CREATE INDEX idx_analytics_events_entity ON analytics_events(entityType, entityId, timestamp);
CREATE INDEX idx_user_profiles_email ON user_profiles(email) UNIQUE;
CREATE INDEX idx_generated_content_job ON generated_content(jobId, contentType);
```

## State Transitions

### CV Job Processing Flow
```
PENDING → ANALYZING → GENERATING → COMPLETED
   ↓           ↓           ↓
FAILED ← - - FAILED ← - FAILED
```

### Public Profile Lifecycle
```
CREATED → ACTIVE → EXPIRED
    ↓        ↓        ↓
INACTIVE ← - - ← - - - ↓
    ↓                 ↓
DELETED ← - - - - - - - ↓
```

## Data Retention Policy

### By User Tier
- **Free Users**: 30 days after last activity
- **Premium Users**: 1 year after subscription ends
- **Enterprise**: Custom retention per contract

### By Data Type
- **Personal Data**: Subject to user tier retention
- **Analytics (Anonymized)**: 2 years maximum
- **Generated Content**: 90 days unless saved by user
- **System Logs**: 30 days maximum

## Security Considerations

### Encryption
- All PII encrypted at rest (AES-256)
- Database connections use TLS 1.3
- File storage uses server-side encryption

### Access Control
- Row-level security based on userId
- Admin access logged and audited
- API rate limiting per user/IP

### Privacy Compliance
- GDPR Article 17 (right to erasure) support
- Data portability (JSON export)
- Consent management for analytics
- Automatic anonymization of IP addresses

## Migration Strategy

### Version 1.0 → 1.1
- Add schema versioning field to all entities
- Implement backward-compatible changes only
- Use database migrations for schema updates
- Maintain API versioning for breaking changes

This data model provides a comprehensive foundation for the CVPlus platform while ensuring scalability, privacy compliance, and maintainable relationships between entities.