# CVPlus Recovery and Olorin Ecosystem Integration Plan v2.0

**Plan ID**: cvplus-olorin-integration-v2
**Created**: 2026-01-21
**Version**: 2.0 (Revised after 13-agent review)
**Status**: Ready for Review
**Estimated Duration**: 18-20 weeks
**Complexity**: High - Full ecosystem integration with comprehensive security

---

## Revision History

**v1.0 → v2.0 Changes**:
- ✅ Added Phase 0: Frontend Architecture Fix + Code Quality Remediation
- ✅ Extended timeline from 12 weeks to 18-20 weeks
- ✅ Added comprehensive mobile strategy (PWA + React Native roadmap)
- ✅ Clarified database technology (keeping Firebase/Firestore)
- ✅ Added complete security architecture (JWT, file upload, RBAC, encryption)
- ✅ Added Infrastructure as Code with Terraform
- ✅ Added internationalization and accessibility requirements
- ✅ Added voice/audio migration plan (ElevenLabs, podcasts)
- ✅ Resolved build system strategy (keeping Vite, adding Module Federation)
- ✅ Added explicit Olorin paved roads mapping

---

## Executive Summary

CVPlus is in a broken state requiring comprehensive recovery and Olorin ecosystem integration. This revised plan addresses all critical architectural, security, and completeness gaps identified in the initial review.

**Strategic Direction**: Full Olorin ecosystem integration with CVPlus as a strategic product line

**Key Objectives**:
1. **Fix broken frontend architecture** (Phase 0 - 2 weeks)
2. **Achieve code quality compliance** (Phase 0 - 2 weeks)
3. **Implement production-grade security** (throughout all phases)
4. **Integrate with Olorin paved roads** (Phases 3-6)
5. **Enable multi-platform support** (Phase 7 - mobile)
6. **Restore voice/audio features** (Phase 8 - multimedia)
7. **Deploy with zero-downtime** (Phase 9 - progressive deployment)

---

## Critical Problems Identified

| Category | Issue | Severity | Phase |
|----------|-------|----------|-------|
| **Frontend UX** | Triple duplicate feature selection screens | 🔴 CRITICAL | Phase 0 |
| **Navigation** | ResultsPage.tsx misnamed, shows features not results | 🔴 CRITICAL | Phase 0 |
| **Code Quality** | 800+ line files, 60+ TODOs, hardcoded values | 🔴 CRITICAL | Phase 0 |
| **Security** | No JWT strategy, insecure file uploads, no RBAC | 🔴 CRITICAL | Phases 1-9 |
| **Mobile** | No mobile strategy defined | 🟠 HIGH | Phase 7 |
| **Voice/Audio** | ElevenLabs not addressed, podcasts missing | 🟠 HIGH | Phase 8 |
| **CI/CD** | No IaC, no progressive deployment, manual rollback | 🟠 HIGH | Phase 9 |
| **I18n** | Broken i18n module, no RTL support | 🟠 HIGH | Phase 6 |

---

## Technology Stack Decision

### Database: Keep Firebase/Firestore ✅

**Rationale**:
- Already integrated and working
- Serverless auto-scaling
- Real-time updates built-in
- No migration risk or downtime
- Focus effort on Olorin integration instead

**Future Consideration**: MongoDB Atlas can be evaluated post-recovery if needed.

### Build System: Vite + Module Federation Plugin ✅

**Rationale**:
- CVPlus already uses Vite (fast HMR, excellent DX)
- Use `@originjs/vite-plugin-federation` for Module Federation compatibility
- Maintains Olorin ecosystem integration without Webpack migration overhead

### Backend: Keep Firebase Functions (Node.js/TypeScript) ✅

**Rationale**:
- Stable and functional
- Extensive existing codebase
- Can integrate with Olorin services via API calls
- Python migration deferred to post-recovery phase

---

## PHASE 0: Frontend Architecture Fix + Code Quality (Week 1-2)

**Duration**: 2 weeks
**Priority**: CRITICAL - Must complete before any other work

### 0.1 Fix Navigation Architecture

**Problem**: Triple duplicate feature selection screens cause severe user confusion.

**Solution**:

```typescript
// CORRECT Navigation Flow
/features                   → Marketing showcase (SEO)
/upload                     → CV upload entry point
/processing/:jobId          → Processing indicator with progress
/analysis/:jobId            → AI analysis results display
/customize/:jobId           → SINGLE consolidated feature selection
/preview/:jobId             → Live preview with selected features
/results/:jobId             → ACTUAL final results (download/share)
```

**Implementation Tasks**:
- [ ] Rename `ResultsPage.tsx` → `FeatureSelectionPage.tsx`
- [ ] Create new `ActualResultsPage.tsx` with download/share functionality
- [ ] Update all route definitions in `App.tsx`
- [ ] Update all navigation calls throughout codebase
- [ ] Remove duplicate feature selection from `/select-features/:jobId`
- [ ] Consolidate all feature selection logic into single page
- [ ] Add breadcrumb navigation for user orientation

**Acceptance Criteria**:
- ✅ Users navigate: Upload → Processing → Analysis → Customize → Preview → Results
- ✅ No duplicate feature selection screens
- ✅ All page names match their actual functionality
- ✅ User testing validates clear mental model

### 0.2 Code Quality Remediation

**Problem**: Multiple files violate 200-line limit, 60+ TODOs exist, hardcoded values present.

**File Splitting Strategy**:

```typescript
// BEFORE: ValidationService.ts (815 lines) ❌
// AFTER: Split into 4 files ✅
/services/validation/
├── ValidationService.ts        // Core validation orchestration (180 lines)
├── SchemaValidator.ts          // Schema-specific validation (195 lines)
├── ValidationRuleEngine.ts     // Rule processing logic (185 lines)
└── ValidationReporter.ts       // Report generation (175 lines)

// BEFORE: RecoveryPhase.ts (680 lines) ❌
// AFTER: Split into 3 files ✅
/models/recovery/
├── RecoveryPhase.ts            // Base model (190 lines)
├── PhaseTransitions.ts         // State machine logic (185 lines)
└── PhaseValidation.ts          // Validation rules (180 lines)
```

**TODO Elimination**:

```typescript
// BEFORE: integrations.service.ts line 166-202
// TODO: Implement calendar integration ❌
// TODO: Implement video thumbnail generation ❌
// TODO: Implement text-to-speech ❌

// AFTER: Concrete implementation with feature flags ✅
async initializeCalendarIntegration(userId: string): Promise<CalendarIntegration> {
  if (!config.features.calendarIntegration) {
    throw new FeatureNotEnabledError(
      'Calendar integration is not enabled. This feature is coming in Q2 2026.'
    );
  }
  // Future implementation will go here
  throw new NotImplementedError('Calendar integration coming Q2 2026');
}
```

**Hardcoded Value Externalization**:

```typescript
// BEFORE: Hardcoded URLs ❌
const publicUrl = `https://cvplus.com/cv/${profile.slug}`;
const storageUrl = `https://storage.googleapis.com/${bucket}/${file}`;

// AFTER: Configuration-driven ✅
import { config } from '../config/environment';
const publicUrl = `${config.appBaseUrl}/cv/${profile.slug}`;
const storageUrl = `${config.storage.baseUrl}/${config.storage.bucket}/${file}`;
```

**Implementation Tasks**:
- [ ] Split all files >200 lines (12 files identified)
- [ ] Eliminate all 60+ TODOs with concrete implementation or feature flags
- [ ] Externalize all hardcoded values to environment config
- [ ] Add CI gate: fail build if file >200 lines or TODO count increases

**Acceptance Criteria**:
- ✅ All files <200 lines
- ✅ Zero TODOs in production code
- ✅ Zero hardcoded URLs, keys, or configuration
- ✅ CI enforces these rules

---

## PHASE 1: Security Architecture Implementation (Week 3-4)

**Duration**: 2 weeks
**Priority**: CRITICAL - Security cannot be retrofitted

### 1.1 JWT Authentication System

**Implementation**:

```typescript
// config/jwt.config.ts
export const JWT_CONFIG = {
  // Algorithms (asymmetric for production)
  accessTokenAlgorithm: 'RS256' as const,
  refreshTokenAlgorithm: 'RS256' as const,

  // Expiration
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',

  // Storage (XSS protection via httpOnly cookies)
  storage: {
    accessToken: 'httpOnly-cookie',
    refreshToken: 'httpOnly-cookie',
    csrfToken: 'localStorage'
  },

  // Cookie settings
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    domain: '.olorin.ai',
    path: '/'
  },

  // Key management (Google Secret Manager)
  privateKeySource: 'google-secret-manager',
  publicKeyEndpoint: '/.well-known/jwks.json',
  keyRotationDays: 90,

  // Required claims
  requiredClaims: ['sub', 'iss', 'aud', 'exp', 'iat', 'jti'],
  issuer: 'olorin.ai',
  audience: 'cvplus.olorin.ai'
} as const;
```

**Implementation Tasks**:
- [ ] Generate RSA key pair in Google Secret Manager
- [ ] Implement JWT signing and verification
- [ ] Create JWKS endpoint for public key distribution
- [ ] Implement httpOnly cookie storage
- [ ] Add CSRF token protection
- [ ] Implement token refresh flow
- [ ] Add token revocation capability (JWT ID tracking)
- [ ] Implement 90-day key rotation

### 1.2 File Upload Security

**Implementation**:

```typescript
// middleware/file-upload-security.ts
import fileType from 'file-type';
import sanitize from 'sanitize-filename';
import { scanForMalware } from '../services/malware-scanner';

export async function validateUploadedFile(file: Express.Multer.File): Promise<void> {
  // 1. File size limit
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new SecurityError('FILE_TOO_LARGE', 'Maximum file size is 10MB');
  }

  // 2. MIME type validation (check actual content, not extension)
  const detectedType = await fileType.fromBuffer(file.buffer);
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];

  if (!detectedType || !allowedTypes.includes(detectedType.mime)) {
    throw new SecurityError('INVALID_FILE_TYPE', `Allowed types: PDF, DOCX, DOC, TXT`);
  }

  // 3. Filename sanitization (prevent path traversal)
  const sanitizedFilename = sanitize(file.originalname);
  if (sanitizedFilename !== file.originalname) {
    throw new SecurityError('INVALID_FILENAME', 'Filename contains invalid characters');
  }

  // 4. Malware scanning (ClamAV integration)
  const scanResult = await scanForMalware(file.buffer);
  if (!scanResult.clean) {
    securityMonitor.logEvent({
      type: 'MALWARE_DETECTED',
      severity: 'CRITICAL',
      details: { threat: scanResult.threat }
    });
    throw new SecurityError('MALWARE_DETECTED', 'File failed security scan');
  }

  // 5. Storage path validation
  const storagePath = path.join(UPLOAD_DIR, sanitizedFilename);
  if (!storagePath.startsWith(UPLOAD_DIR)) {
    throw new SecurityError('PATH_TRAVERSAL_ATTEMPT', 'Invalid storage path');
  }
}
```

**Implementation Tasks**:
- [ ] Integrate ClamAV for malware scanning
- [ ] Implement MIME type validation with magic number check
- [ ] Add filename sanitization
- [ ] Implement file size limits
- [ ] Add storage path traversal prevention
- [ ] Log all upload security events

### 1.3 Authorization Model (RBAC)

**Implementation**:

```typescript
// models/authorization.ts
export enum Role {
  USER = 'user',
  PREMIUM = 'premium',
  ADMIN = 'admin'
}

export interface JWTPayload {
  sub: string;        // User ID
  email: string;
  role: Role;
  iss: 'olorin.ai';
  aud: 'cvplus.olorin.ai';
  exp: number;
  iat: number;
  jti: string;        // JWT ID for revocation
}

// middleware/authorization.ts
export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      securityMonitor.logEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: req.user.sub,
        details: { requiredRoles: roles, userRole: req.user.role, path: req.path }
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export async function requireOwnership(req: Request, res: Response, next: NextFunction) {
  const cvId = req.params.id;
  const cv = await getCVById(cvId);

  if (!cv) {
    return res.status(404).json({ error: 'CV not found' });
  }

  if (cv.userId !== req.user.sub && req.user.role !== Role.ADMIN) {
    securityMonitor.logEvent({
      type: 'UNAUTHORIZED_ACCESS',
      severity: 'HIGH',
      userId: req.user.sub,
      details: { cvId, ownerId: cv.userId }
    });
    return res.status(403).json({ error: 'Access denied' });
  }

  req.cv = cv;
  next();
}
```

**Implementation Tasks**:
- [ ] Define Role enum (USER, PREMIUM, ADMIN)
- [ ] Implement role-based middleware
- [ ] Implement ownership verification
- [ ] Add resource-level access control
- [ ] Create admin-only endpoints protection

### 1.4 Data Encryption

**Implementation**:

```typescript
// services/encryption.service.ts
import { KMS } from '@google-cloud/kms';

export class CVEncryptionService {
  private kms: KMS;
  private keyName: string;

  constructor() {
    this.kms = new KMS();
    this.keyName = process.env.GCP_KMS_KEY_NAME!;
  }

  async encryptCV(cvContent: Buffer): Promise<Buffer> {
    const [result] = await this.kms.encrypt({
      name: this.keyName,
      plaintext: cvContent
    });
    return Buffer.from(result.ciphertext!);
  }

  async decryptCV(encryptedContent: Buffer): Promise<Buffer> {
    const [result] = await this.kms.decrypt({
      name: this.keyName,
      ciphertext: encryptedContent
    });
    return Buffer.from(result.plaintext!);
  }
}
```

**Implementation Tasks**:
- [ ] Create Google KMS encryption key
- [ ] Implement CV content encryption at rest
- [ ] Encrypt user PII (email, name, phone)
- [ ] Add encryption to file upload flow
- [ ] Decrypt on-demand for viewing/editing

### 1.5 Security Monitoring

**Implementation Tasks**:
- [ ] Create security event logging system
- [ ] Log all authentication events (success/failure)
- [ ] Log all authorization failures
- [ ] Log file upload security events
- [ ] Integrate with Olorin security monitoring
- [ ] Set up incident response alerts

**Acceptance Criteria**:
- ✅ JWT authentication with RS256
- ✅ File upload security with malware scanning
- ✅ RBAC with ownership verification
- ✅ CV encryption with Google KMS
- ✅ Comprehensive security monitoring
- ✅ Zero critical vulnerabilities in security scan

---

## PHASE 2: Configuration & Infrastructure (Week 5-6)

**Duration**: 2 weeks
**Priority**: HIGH - Foundation for all other work

### 2.1 Configuration Management

**Implementation**:

```typescript
// config/schema.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  // Application URLs
  appBaseUrl: z.string().url(),
  apiBaseUrl: z.string().url(),

  // Firebase
  firebase: z.object({
    projectId: z.string().min(1),
    apiKey: z.string().min(1),
    authDomain: z.string(),
    storageBucket: z.string()
  }),

  // Storage
  storage: z.object({
    bucket: z.string().min(1),
    baseUrl: z.string().url()
  }),

  // Authentication
  auth: z.object({
    jwtPrivateKey: z.string().min(100),
    jwtPublicKey: z.string().min(100),
    accessTokenExpiry: z.string().regex(/^\d+[mhd]$/),
    refreshTokenExpiry: z.string().regex(/^\d+[mhd]$/)
  }),

  // External Services
  elevenlabs: z.object({
    apiKey: z.string().startsWith('sk_'),
    defaultVoiceId: z.string().min(1)
  }),

  anthropic: z.object({
    apiKey: z.string().startsWith('sk-ant-')
  }),

  // Feature Flags
  features: z.object({
    calendarIntegration: z.boolean().default(false),
    videoThumbnails: z.boolean().default(false),
    textToSpeech: z.boolean().default(true),
    podcastGeneration: z.boolean().default(true)
  }),

  // Security
  security: z.object({
    kmsKeyName: z.string().min(1),
    corsOrigins: z.array(z.string().url()),
    rateLimitWindow: z.number().positive(),
    rateLimitMax: z.number().positive()
  })
});

export type Config = z.infer<typeof ConfigSchema>;

// Load and validate configuration
export function loadConfig(): Config {
  try {
    const config = ConfigSchema.parse({
      appBaseUrl: process.env.APP_BASE_URL,
      apiBaseUrl: process.env.API_BASE_URL,
      // ... map all environment variables
    });

    console.log('✅ Configuration validated successfully');
    return config;
  } catch (error) {
    console.error('❌ CRITICAL: Configuration validation failed');
    console.error(error);
    process.exit(1); // FAIL FAST
  }
}
```

**Implementation Tasks**:
- [ ] Create comprehensive Zod schema
- [ ] Implement fail-fast validation on startup
- [ ] Create `.env.example` with all variables
- [ ] Document all configuration options
- [ ] Integrate with Google Secret Manager for secrets

### 2.2 Infrastructure as Code (Terraform)

**Implementation**:

```hcl
# terraform/modules/firebase/main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

resource "google_firebase_project" "cvplus" {
  provider = google
  project  = var.project_id
}

resource "google_firebase_web_app" "cvplus_web" {
  provider     = google
  project      = var.project_id
  display_name = "CVPlus Web App"
}

resource "google_storage_bucket" "cvplus_storage" {
  name     = "${var.project_id}-cvplus"
  location = "US"

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_kms_key_ring" "cvplus" {
  name     = "cvplus-keyring"
  location = "us-central1"
}

resource "google_kms_crypto_key" "cvplus_encryption" {
  name     = "cvplus-encryption-key"
  key_ring = google_kms_key_ring.cvplus.id

  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }
}
```

**Implementation Tasks**:
- [ ] Create Terraform module structure
- [ ] Define all Firebase resources
- [ ] Define Google Cloud resources (KMS, Storage)
- [ ] Implement remote state management (GCS backend)
- [ ] Create production and staging environments
- [ ] Document infrastructure provisioning

**Acceptance Criteria**:
- ✅ Configuration validation with Zod schema
- ✅ All secrets in Google Secret Manager
- ✅ Infrastructure defined in Terraform
- ✅ Environment-specific configurations
- ✅ Fail-fast on missing configuration

---

## PHASE 3: Olorin Paved Roads Integration (Week 7-9)

**Duration**: 3 weeks
**Priority**: HIGH - Core ecosystem integration

### 3.1 Olorin Service Mapping

| CVPlus Need | Olorin Paved Road | Integration Method |
|-------------|-------------------|-------------------|
| **Configuration** | `olorin-core/config` | API call to Olorin config service |
| **Structured Logging** | `olorin-core/logging_config` | Shared logging format, correlation IDs |
| **Storage (GCS)** | `olorin-core/storage` | API wrapper for consistent GCS access |
| **AI/ML** | `olorin/ai_agent` | API call for CV analysis, enhancement |
| **Metering** | `olorin/metering` | Track CV generations, analysis requests |
| **Rate Limiting** | `olorin/rate_limiter` | Apply rate limits via API gateway |
| **Resilience** | `olorin/resilience` | Retry logic, circuit breakers |

### 3.2 Logging Integration

**Implementation**:

```typescript
// services/logging.service.ts
import { getLogger } from '@olorin/logging';

export class CVPlusLogger {
  private logger = getLogger('cvplus');

  logCVAnalysis(userId: string, cvId: string, result: AnalysisResult) {
    this.logger.info('CV analysis completed', {
      service: 'cvplus',
      operation: 'cv_analysis',
      userId,
      cvId,
      correlationId: this.getCorrelationId(),
      duration: result.duration,
      success: true
    });
  }

  logError(operation: string, error: Error, context: Record<string, any>) {
    this.logger.error('Operation failed', {
      service: 'cvplus',
      operation,
      error: error.message,
      stack: error.stack,
      correlationId: this.getCorrelationId(),
      ...context
    });
  }

  private getCorrelationId(): string {
    return global.requestContext?.correlationId || 'unknown';
  }
}
```

### 3.3 Metering Integration

**Implementation**:

```typescript
// services/metering.service.ts
export class CVPlusMeteringService {
  async recordUsage(
    userId: string,
    operation: 'cv_analysis' | 'cv_generation' | 'podcast_generation' | 'ai_enhancement',
    metadata?: Record<string, any>
  ): Promise<void> {
    await fetch(`${OLORIN_API_URL}/metering/usage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OLORIN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: 'cvplus',
        userId,
        operation,
        units: 1,
        timestamp: new Date().toISOString(),
        metadata
      })
    });
  }
}
```

**Implementation Tasks**:
- [ ] Integrate Olorin structured logging
- [ ] Implement metering for all operations
- [ ] Add rate limiting via Olorin
- [ ] Implement retry logic with resilience patterns
- [ ] Create API client for Olorin services

**Acceptance Criteria**:
- ✅ All logs use Olorin structured format
- ✅ All operations tracked via Olorin metering
- ✅ Rate limits applied via Olorin service
- ✅ Resilience patterns for external calls

---

## PHASE 4: Code Consolidation (Week 10-11)

**Duration**: 2 weeks
**Priority**: MEDIUM - Improve maintainability

### 4.1 Eliminate Duplicate Services

**Strategy**: Consolidate 263 duplicate files to single canonical sources.

| Service | Current Locations | Target Location |
|---------|------------------|-----------------|
| Base Service | 5 versions | `packages/core/services/BaseService.ts` |
| Service Registry | 4 versions | `packages/core/services/ServiceRegistry.ts` |
| Cache Service | 5 versions | `packages/core/services/CacheService.ts` |
| Rate Limiter | 2 versions | `packages/core/services/RateLimiter.ts` |
| Logger | 4 versions | `packages/core/services/Logger.ts` |

**Implementation Tasks**:
- [ ] Identify canonical source for each service
- [ ] Update all imports to use canonical source
- [ ] Delete duplicate implementations
- [ ] Run tests to verify no regressions
- [ ] Update documentation

**Acceptance Criteria**:
- ✅ 263 duplicate files reduced to single sources
- ✅ All tests passing
- ✅ No circular dependencies

---

## PHASE 5: Testing & Quality (Week 12-13)

**Duration**: 2 weeks
**Priority**: HIGH - Ensure reliability

### 5.1 Test Coverage Goals

**Target**: 87% minimum coverage

**Test Pyramid**:
- Unit tests: 70% of tests
- Integration tests: 25% of tests
- E2E tests: 5% of tests

**Implementation Tasks**:
- [ ] Write unit tests for all new security code
- [ ] Write integration tests for Olorin service integration
- [ ] Write E2E tests for critical user flows
- [ ] Achieve 87%+ coverage
- [ ] Add coverage gate in CI

**Acceptance Criteria**:
- ✅ 87%+ test coverage
- ✅ All critical paths tested
- ✅ Security code 100% covered
- ✅ E2E tests for key flows

---

## PHASE 6: Internationalization & Accessibility (Week 14-15)

**Duration**: 2 weeks
**Priority**: HIGH - Market expansion

### 6.1 Internationalization (i18n)

**Implementation**:

```typescript
// i18n/config.ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      he: { translation: require('./locales/he.json') },
      ar: { translation: require('./locales/ar.json') },
      es: { translation: require('./locales/es.json') }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });
```

**RTL Support**:

```typescript
// components/RTLProvider.tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isRTL = ['he', 'ar'].includes(i18n.language);

  useEffect(() => {
    document.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', i18n.language);
  }, [isRTL, i18n.language]);

  return <>{children}</>;
}
```

**Implementation Tasks**:
- [ ] Restore i18n module functionality
- [ ] Add support for English, Hebrew, Arabic, Spanish
- [ ] Implement RTL layout for Hebrew and Arabic
- [ ] Test all UI components in RTL mode
- [ ] Add language switcher component

### 6.2 Accessibility (WCAG 2.1 AA)

**Implementation Tasks**:
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation for all features
- [ ] Verify color contrast ratios (4.5:1 minimum)
- [ ] Add focus indicators to all focusable elements
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Add skip-to-main-content link
- [ ] Ensure form labels and error messages

**Acceptance Criteria**:
- ✅ Support for 4 languages (English, Hebrew, Arabic, Spanish)
- ✅ RTL layout works correctly
- ✅ WCAG 2.1 AA compliance verified
- ✅ Screen reader compatible

---

## PHASE 7: Mobile Strategy (Week 16)

**Duration**: 1 week
**Priority**: HIGH - Market reach

### 7.1 Phase 1: Progressive Web App (PWA)

**Implementation**:

```json
// public/manifest.json
{
  "name": "CVPlus - Professional Resume Builder",
  "short_name": "CVPlus",
  "description": "AI-powered CV and resume builder by Olorin",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#1a1a1a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Service Worker**:

```typescript
// src/service-worker.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache-first for static assets
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new CacheFirst({ cacheName: 'static-resources' })
);

// Network-first for API calls with fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache' })
);
```

**Implementation Tasks**:
- [ ] Create PWA manifest
- [ ] Implement service worker with offline support
- [ ] Add mobile-responsive design (Tailwind breakpoints)
- [ ] Implement touch-optimized interactions
- [ ] Add installation prompt
- [ ] Cache CVs for offline editing
- [ ] Test on iOS Safari and Chrome Android

### 7.2 Phase 2: React Native (Future Roadmap)

**Planned for Q2 2026** (post-recovery):

```
olorin-cv/packages/mobile-cvplus/
├── ios/
├── android/
├── src/
│   ├── screens/
│   ├── components/ (NativeWind + @bayit/glass)
│   ├── navigation/
│   └── services/
```

**Acceptance Criteria**:
- ✅ PWA installable on iOS and Android
- ✅ Offline CV editing works
- ✅ Touch-optimized UI
- ✅ Lighthouse PWA score >90

---

## PHASE 8: Voice/Audio Migration (Week 17)

**Duration**: 1 week
**Priority**: HIGH - Premium features

### 8.1 ElevenLabs Integration

**Configuration**:

```typescript
// config/elevenlabs.config.ts
export const ELEVENLABS_CONFIG = {
  apiKey: process.env.ELEVENLABS_API_KEY!,
  baseUrl: 'https://api.elevenlabs.io/v1',
  defaultVoiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID!,
  model: 'eleven_multilingual_v2',
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  }
};
```

**Implementation**:

```typescript
// services/elevenlabs.service.ts
export class ElevenLabsService {
  async generateSpeech(text: string, voiceId?: string): Promise<Buffer> {
    const response = await fetch(
      `${ELEVENLABS_CONFIG.baseUrl}/text-to-speech/${voiceId || ELEVENLABS_CONFIG.defaultVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_CONFIG.model,
          voice_settings: ELEVENLABS_CONFIG.voiceSettings
        })
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
```

### 8.2 Podcast Generation

**Implementation Tasks**:
- [ ] Restore podcast script generation logic
- [ ] Integrate ElevenLabs for audio synthesis
- [ ] Implement podcast storage in Firebase Storage
- [ ] Create podcast player UI component
- [ ] Add podcast progress tracking
- [ ] Support multiple languages

### 8.3 Audio Processing Services

**Implementation Tasks**:
- [ ] Complete AudioAnalyzer.ts (format validation, metadata)
- [ ] Complete AudioProcessor.ts (noise reduction, normalization)
- [ ] Complete AudioTranscoder.ts (format conversion)
- [ ] Complete WaveformGenerator.ts (visual waveform)

**Acceptance Criteria**:
- ✅ ElevenLabs TTS fully functional
- ✅ Podcast generation works end-to-end
- ✅ Audio processing services complete
- ✅ Multi-language audio support

---

## PHASE 9: Progressive Deployment (Week 18-20)

**Duration**: 2-3 weeks
**Priority**: CRITICAL - Zero-downtime launch

### 9.1 Progressive Deployment Pipeline

**Strategy**:

```yaml
# .github/workflows/progressive-deployment.yml
name: Progressive Deployment

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          firebase deploy --only hosting:staging,functions

      - name: Run Smoke Tests
        run: npm run test:smoke

      - name: Health Check
        run: |
          curl -f https://staging-cvplus.olorin.ai/health || exit 1

  deploy-production-10pct:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production (10% traffic)
        run: |
          firebase hosting:channel:deploy production-canary \
            --expires 1h --only hosting:production

      - name: Monitor Metrics (10 minutes)
        run: |
          npm run monitor:metrics -- \
            --error-rate-threshold 1% \
            --latency-p95-threshold 2s \
            --duration 10m

  deploy-production-100pct:
    needs: deploy-production-10pct
    runs-on: ubuntu-latest
    steps:
      - name: Gradual Rollout
        run: |
          # 10% → 25% → 50% → 100%
          for traffic in 25 50 100; do
            firebase hosting:channel:deploy production \
              --traffic $traffic
            npm run monitor:metrics -- --duration 5m
          done

  rollback:
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Automatic Rollback
        run: |
          firebase hosting:channel:deploy production --traffic 100 --previous
          npm run incident:create -- --severity HIGH
```

### 9.2 Monitoring & Alerting

**Implementation**:

```typescript
// monitoring/health-check.ts
export async function runHealthChecks(): Promise<HealthStatus> {
  const checks = await Promise.all([
    checkFirebaseAuth(),
    checkFirestore(),
    checkStorage(),
    checkElevenLabsAPI(),
    checkOlorinServices()
  ]);

  const healthy = checks.every(c => c.status === 'healthy');

  return {
    healthy,
    checks,
    timestamp: new Date().toISOString()
  };
}
```

**Implementation Tasks**:
- [ ] Create progressive deployment workflow
- [ ] Implement automated health checks
- [ ] Set up monitoring dashboards
- [ ] Configure alerting (PagerDuty/Slack)
- [ ] Create incident response runbook
- [ ] Test rollback procedures

**Acceptance Criteria**:
- ✅ Progressive deployment with traffic splitting
- ✅ Automated rollback on failure
- ✅ Zero-downtime achieved
- ✅ All health checks passing

---

## Success Criteria

**CVPlus is production-ready when**:

### Architecture & Code
- ✅ Navigation architecture fixed (no duplicate screens)
- ✅ All files <200 lines
- ✅ Zero TODOs in production code
- ✅ Zero hardcoded values
- ✅ 87%+ test coverage

### Security
- ✅ JWT authentication with RS256
- ✅ File upload security with malware scanning
- ✅ RBAC with ownership verification
- ✅ Data encryption with Google KMS
- ✅ Zero critical vulnerabilities

### Olorin Integration
- ✅ Structured logging integrated
- ✅ Metering tracks all operations
- ✅ Rate limiting applied
- ✅ Resilience patterns implemented

### Internationalization
- ✅ 4 languages supported (EN, HE, AR, ES)
- ✅ RTL layout functional
- ✅ WCAG 2.1 AA compliant

### Mobile
- ✅ PWA installable
- ✅ Offline editing works
- ✅ Lighthouse PWA score >90

### Voice/Audio
- ✅ ElevenLabs TTS functional
- ✅ Podcast generation works
- ✅ Audio processing complete

### Deployment
- ✅ Infrastructure as Code with Terraform
- ✅ Progressive deployment pipeline
- ✅ Zero-downtime migration achieved
- ✅ Monitoring and alerting active

---

## Timeline Summary

| Week | Phase | Deliverable | Team Size |
|------|-------|-------------|-----------|
| 1-2 | Phase 0 | Frontend fix + code quality | 2 engineers |
| 3-4 | Phase 1 | Security architecture | 2 engineers + 1 security |
| 5-6 | Phase 2 | Config + IaC | 1 DevOps + 1 engineer |
| 7-9 | Phase 3 | Olorin integration | 2 engineers |
| 10-11 | Phase 4 | Code consolidation | 2 engineers |
| 12-13 | Phase 5 | Testing & QA | 2 engineers + 1 QA |
| 14-15 | Phase 6 | I18n + Accessibility | 1 engineer + 1 designer |
| 16 | Phase 7 | PWA implementation | 1 engineer |
| 17 | Phase 8 | Voice/audio migration | 1 engineer |
| 18-20 | Phase 9 | Progressive deployment | 1 DevOps + 2 engineers |

**Total**: 18-20 weeks with 2-3 engineers + specialists

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frontend navigation breaks workflows | HIGH | User testing after Phase 0 |
| Security vulnerabilities missed | CRITICAL | External security audit post-Phase 1 |
| Olorin integration fails | HIGH | Early integration testing in Phase 3 |
| Performance degradation | MEDIUM | Performance budgets + monitoring |
| Zero-downtime not achieved | HIGH | Progressive deployment + rollback |

---

## Dependencies

**Before Starting**:
- [ ] User approval of this plan
- [ ] Google Secret Manager access
- [ ] Firebase project access
- [ ] Olorin API access for integration
- [ ] Team resources allocated (2-3 engineers + specialists)

---

## Next Steps After Approval

1. **Week 1**: Begin Phase 0 - Frontend architecture fix
2. **Week 3**: Begin Phase 1 - Security implementation
3. **Week 5**: Begin Phase 2 - Configuration and IaC
4. **Continuous**: Security reviews, testing, documentation

---

**END OF PLAN v2.0**

This comprehensive plan addresses all critical feedback from the 13-agent review and provides a clear path to production-ready CVPlus with full Olorin ecosystem integration.