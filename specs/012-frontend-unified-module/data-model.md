# Frontend Microservices Data Model

**Feature**: Frontend Unified Module with Microservices
**Date**: 2025-09-16
**Phase**: Phase 1 - Data Model Design

## Data Model Overview

This document defines the data structures, relationships, and state management patterns for the frontend microservices architecture within the unified CVPlus frontend module.

## Microservice Data Boundaries

### Core Entities by Microservice

#### Auth-UI Microservice
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: Permission[];
  session: SessionData | null;
  mfaStatus: MFAStatus;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  roles: UserRole[];
  premiumTier: PremiumTier;
  lastLogin: Date;
}

interface SessionData {
  sessionId: string;
  deviceId: string;
  ipAddress: string;
  expiresAt: Date;
  issuedAt: Date;
}
```

#### CV-Processing-UI Microservice
```typescript
interface CVState {
  currentCV: CV | null;
  analysisResults: CVAnalysisResult[];
  generationStatus: GenerationStatus;
  templates: CVTemplate[];
  previewData: CVPreview | null;
}

interface CV {
  id: string;
  userId: string;
  content: CVContent;
  metadata: CVMetadata;
  version: number;
  status: CVStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface CVAnalysisResult {
  id: string;
  cvId: string;
  type: AnalysisType;
  score: number;
  recommendations: Recommendation[];
  atsCompatibility: ATSScore;
}
```

#### Multimedia-UI Microservice
```typescript
interface MultimediaState {
  videoProjects: VideoProject[];
  audioRecordings: AudioRecording[];
  imageAssets: ImageAsset[];
  processingJobs: ProcessingJob[];
  mediaLibrary: MediaItem[];
}

interface VideoProject {
  id: string;
  userId: string;
  type: VideoType;
  status: ProcessingStatus;
  assets: MediaAsset[];
  configuration: VideoConfig;
  outputUrl?: string;
}
```

#### Analytics-UI Microservice
```typescript
interface AnalyticsState {
  dashboards: Dashboard[];
  metrics: MetricCollection;
  reports: Report[];
  realTimeData: RealTimeMetrics;
  filters: AnalyticsFilters;
}

interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
  layout: DashboardLayout;
  permissions: ViewPermission[];
}

interface MetricCollection {
  userMetrics: UserMetrics;
  systemMetrics: SystemMetrics;
  businessMetrics: BusinessMetrics;
  performanceMetrics: PerformanceMetrics;
}
```

#### Premium-UI Microservice
```typescript
interface PremiumState {
  subscription: Subscription | null;
  billingHistory: BillingRecord[];
  features: FeatureAccess[];
  usage: UsageMetrics;
  paymentMethods: PaymentMethod[];
}

interface Subscription {
  id: string;
  userId: string;
  tier: PremiumTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
}
```

#### Core-UI Microservice (Shared State)
```typescript
interface CoreUIState {
  theme: ThemeConfig;
  i18n: I18nConfig;
  navigation: NavigationState;
  layout: LayoutConfig;
  notifications: Notification[];
}

interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  fontFamily: string;
  customizations: ThemeCustomization[];
}

interface NavigationState {
  currentRoute: string;
  breadcrumbs: BreadcrumbItem[];
  sidebarCollapsed: boolean;
  activeModule: string;
}
```

## State Management Architecture

### Microservice State Isolation
```typescript
// Each microservice manages its own state
interface MicroserviceState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
  version: number;
}

// State management per microservice
interface AuthUIState extends MicroserviceState<AuthState> {}
interface CVProcessingUIState extends MicroserviceState<CVState> {}
interface MultimediaUIState extends MicroserviceState<MultimediaState> {}
// ... etc for each microservice
```

### Cross-Microservice Communication
```typescript
// Event-driven communication between microservices
interface MicroserviceEvent {
  type: string;
  source: string;
  target: string;
  payload: any;
  timestamp: Date;
}

// Common events
type AuthEvents = 'user-logged-in' | 'user-logged-out' | 'permissions-changed';
type CVEvents = 'cv-generated' | 'analysis-completed' | 'template-selected';
type PremiumEvents = 'subscription-changed' | 'feature-unlocked' | 'billing-updated';
```

### Shared State Contracts
```typescript
// Shared interfaces for cross-microservice data
interface SharedUserData {
  id: string;
  email: string;
  displayName: string;
  premiumTier: PremiumTier;
  permissions: Permission[];
}

interface SharedCVData {
  id: string;
  title: string;
  status: CVStatus;
  lastModified: Date;
  templateId: string;
}
```

## Data Flow Patterns

### Unidirectional Data Flow
```typescript
// Data flows down, events flow up
interface DataFlowPattern {
  // 1. Core-UI provides shared state to all microservices
  sharedState: CoreUIState;

  // 2. Each microservice manages domain-specific state
  microserviceState: MicroserviceState<any>;

  // 3. User interactions trigger actions
  actions: Action[];

  // 4. Actions update state and emit events
  events: MicroserviceEvent[];

  // 5. Other microservices react to relevant events
  eventHandlers: EventHandler[];
}
```

### API Integration Pattern
```typescript
// Each microservice handles its own API calls
interface APIIntegration {
  // Domain-specific API clients
  authAPI: AuthAPIClient;
  cvProcessingAPI: CVProcessingAPIClient;
  multimediaAPI: MultimediaAPIClient;
  // ... etc

  // Shared utilities
  httpClient: HTTPClient;
  errorHandler: ErrorHandler;
  cacheManager: CacheManager;
}
```

## Validation Rules

### Data Validation by Domain
```typescript
// Domain-specific validation rules
interface ValidationRules {
  auth: {
    email: EmailValidation;
    password: PasswordValidation;
    permissions: PermissionValidation;
  };

  cvProcessing: {
    cvContent: CVContentValidation;
    fileUpload: FileUploadValidation;
    templateData: TemplateValidation;
  };

  multimedia: {
    videoConfig: VideoConfigValidation;
    audioQuality: AudioQualityValidation;
    imageFormat: ImageFormatValidation;
  };

  // ... validation rules for each domain
}
```

### Cross-Microservice Validation
```typescript
// Validation for data that crosses microservice boundaries
interface CrossMicroserviceValidation {
  userPermissions: (user: User, action: string) => boolean;
  premiumFeatureAccess: (subscription: Subscription, feature: string) => boolean;
  dataConsistency: (sourceData: any, targetData: any) => ValidationResult;
}
```

## State Transitions

### Microservice Lifecycle States
```typescript
enum MicroserviceState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  UPDATING = 'updating'
}

// State transition rules
interface StateTransitions {
  [MicroserviceState.UNLOADED]: [MicroserviceState.LOADING];
  [MicroserviceState.LOADING]: [MicroserviceState.READY, MicroserviceState.ERROR];
  [MicroserviceState.READY]: [MicroserviceState.UPDATING, MicroserviceState.ERROR];
  [MicroserviceState.UPDATING]: [MicroserviceState.READY, MicroserviceState.ERROR];
  [MicroserviceState.ERROR]: [MicroserviceState.LOADING];
}
```

### Data Synchronization States
```typescript
// States for data synchronization between microservices
enum SyncState {
  SYNCED = 'synced',
  PENDING_SYNC = 'pending_sync',
  SYNCING = 'syncing',
  SYNC_ERROR = 'sync_error',
  CONFLICT = 'conflict'
}
```

## Performance Considerations

### Data Loading Strategies
```typescript
// Lazy loading patterns for microservice data
interface LoadingStrategy {
  eager: string[];      // Load immediately (core-ui, auth-ui)
  lazy: string[];       // Load on demand (premium-ui, admin-ui)
  prefetch: string[];   // Load in background (cv-processing-ui)
  critical: string[];   // Load with highest priority (auth state)
}
```

### Caching Strategies
```typescript
// Cache management per microservice
interface CacheStrategy {
  local: Map<string, any>;           // In-memory cache
  session: Storage;                  // Session storage
  persistent: Storage;               // Local storage
  shared: SharedCache;               // Cross-microservice cache
  ttl: Map<string, number>;         // Time-to-live per cache type
}
```

## Error Handling Model

### Error Boundaries per Microservice
```typescript
interface ErrorBoundary {
  microservice: string;
  errorTypes: ErrorType[];
  fallbackComponent: React.ComponentType;
  recoveryStrategies: RecoveryStrategy[];
  errorReporting: ErrorReportingConfig;
}

interface ErrorType {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
}
```

### Cross-Microservice Error Propagation
```typescript
// How errors propagate between microservices
interface ErrorPropagation {
  source: string;
  affected: string[];
  isolationLevel: 'microservice' | 'component' | 'global';
  recoveryActions: RecoveryAction[];
}
```

## Security Model

### Data Security by Microservice
```typescript
interface SecurityModel {
  auth: {
    encryption: EncryptionConfig;
    tokenStorage: TokenStorageConfig;
    sessionSecurity: SessionSecurityConfig;
  };

  premium: {
    billingDataProtection: BillingSecurityConfig;
    paymentTokenSecurity: PaymentSecurityConfig;
  };

  // Security configurations for each microservice
}
```

### Permission-Based Data Access
```typescript
// Data access control based on user permissions
interface DataAccessControl {
  microservice: string;
  requiredPermissions: Permission[];
  dataFiltering: DataFilterRule[];
  auditLogging: AuditConfig;
}
```

## Migration Data Model

### Legacy Data Mapping
```typescript
// Mapping legacy data structures to microservice data models
interface LegacyDataMapping {
  source: {
    location: string;      // Original file location
    structure: any;        // Original data structure
  };

  target: {
    microservice: string;  // Target microservice
    structure: any;        // New data structure
    transformation: TransformationRule[];
  };

  dependencies: string[];  // Other data that must be migrated first
}
```

This data model provides the foundation for implementing the frontend microservices architecture while maintaining clear boundaries, proper state management, and efficient cross-microservice communication.