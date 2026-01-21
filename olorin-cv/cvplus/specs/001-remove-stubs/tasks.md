# Tasks: Remove All Mock/Stub/TODO Code and Fully Implement

**Feature Branch**: `001-remove-stubs`
**Date**: 2025-11-29
**Total Tasks**: 95+
**Estimated Duration**: 5-6 weeks

---

## Executive Summary

This document breaks down the implementation of removing all production stub/mock/TODO code into granular, independently executable tasks organized by phase and user story. Each task is designed to be completable in 1-2 hours and includes exact file paths for precise execution.

### Key Metrics
- **Phase 0 (Blocker)**: 4 tasks (3 days)
- **Phase 1 (Security + Code Consolidation)**: 12 tasks (5 days)
- **Phase 2 (Workflow Services)**: 38 tasks (12 days)
- **Phase 3 (External Integrations)**: 18 tasks (5 days)
- **Phase 4 (TODO Resolution)**: 15 tasks (5 days)
- **Phase 5 (Refactoring + Polish)**: 8+ tasks (5+ days)

---

## Phase 0: Critical Prerequisites & Setup

**Duration**: 3 days | **Blocker for all other phases**

### Firestore Schema Setup (2 days)

- [ ] T001 Create Firestore collections schema document `/specs/001-remove-stubs/firestore-schema.json` with all 20 collection definitions (templates, jobs, features, etc.)
- [ ] T002 [P] Create indexes for filtering queries: `templates(category, isPremium)`, `jobs(userId, status)`, `features(jobId, status)` in Firestore console
- [ ] T003 [P] Add Firestore security rules in `/packages/core/src/config/firestore-rules.txt` ensuring user data isolation and admin access
- [ ] T004 Create migration script `/packages/core/src/scripts/migrate-firestore-schema.ts` to populate initial data (template definitions, badge types, role types)
- [ ] T005 Validate schema by running Phase 2 integration tests against created collections

### Feature Flag Infrastructure Setup (1 day)

- [ ] T006 Create Firestore config document structure in `/packages/core/src/config/feature-flags.ts` with `NEW_FEATURE_ACCESS_LOGIC` flag (default: false)
- [ ] T007 Implement feature flag reader in `/packages/core/src/services/feature-flag.service.ts` with caching and instant toggle capability
- [ ] T008 Add feature flag monitoring/logging in `/packages/core/src/logging/feature-flag-logger.ts` to track all flag-dependent decisions
- [ ] T009 Write tests for feature flag toggle behavior in `/packages/core/src/services/__tests__/feature-flag.service.test.ts`

---

## Phase 1: Critical Security Fixes & Code Consolidation

**Duration**: 5 days | **All P1 user stories**

### Phase 1a: Security Fixes (2 days)

#### 1. Feature Access Control Default-Deny with Kill-Switch (1 day)

- [ ] T010 [US1] Read current implementation in `/packages/premium/src/services/feature-access-cache.service.ts:71-74`
- [ ] T011 [US1] Update feature access logic to check `NEW_FEATURE_ACCESS_LOGIC` flag in `/packages/premium/src/services/feature-access-cache.service.ts:checkAccess()`
- [ ] T012 [US1] [P] Implement Firestore `user_subscriptions` query in `/packages/premium/src/services/feature-access-cache.service.ts` for tier-based access
- [ ] T013 [US1] Change default from `hasAccess: true` to `hasAccess: false` in `/packages/premium/src/services/feature-access-cache.service.ts:71`
- [ ] T014 [US1] Add comprehensive logging in `/packages/core/src/logging/access-control-logger.ts` tracking all feature access decisions
- [ ] T015 [US1] [P] Update mirror implementation in `/packages/core/src/services/cache/feature-access-cache.service.ts` with same logic
- [ ] T016 [US1] Write unit tests in `/packages/premium/src/services/__tests__/feature-access-cache.service.test.ts` for flag toggle behavior
- [ ] T017 [US1] Write integration tests in `/packages/premium/src/services/__tests__/feature-access-cache.integration.test.ts` for Firestore queries
- [ ] T018 [US1] Document monitoring requirements in `/packages/core/docs/feature-access-monitoring.md`

#### 2. Payment Provider Regional Filtering (0.5 days)

- [ ] T019 [US4] Read current implementation in `/packages/premium/src/backend/services/payments/provider-registry.ts:190`
- [ ] T020 [US4] [P] Add `supportedRegions: string[]` field to provider configuration type in `/packages/premium/src/types/payment-provider.ts`
- [ ] T021 [US4] Implement region filtering in `/packages/premium/src/backend/services/payments/provider-registry.ts:getByRegion()` method
- [ ] T022 [US4] Create region mapping for Stripe, PayPal, and regional providers in `/packages/premium/src/config/payment-provider-regions.ts`
- [ ] T023 [US4] Write tests in `/packages/premium/src/backend/services/__tests__/provider-registry.test.ts`

#### 3. Stripe Webhook Handler Implementation (0.5 days)

- [ ] T024 [US4] Read stub in `/packages/premium/src/backend/functions/handleStripeWebhook.ts`
- [ ] T025 [US4] Implement signature validation using Stripe webhook secret in `/packages/premium/src/backend/functions/handleStripeWebhook.ts:validateSignature()`
- [ ] T026 [US4] [P] Add event handlers in `/packages/premium/src/backend/functions/handleStripeWebhook.ts` for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] T027 [US4] [P] Implement Firestore updates in `/packages/premium/src/backend/services/stripe-webhook.service.ts` for `user_subscriptions` collection
- [ ] T028 [US4] Add idempotency checks using `/packages/premium/src/services/webhook-idempotency.service.ts`
- [ ] T029 [US4] Write tests in `/packages/premium/src/backend/functions/__tests__/handleStripeWebhook.test.ts`

### Phase 1b: Code Consolidation - Duplicate CV Generators (3 days)

#### Analyze and Prepare Consolidation

- [ ] T030 [US3] Verify all 16 duplicate files exist at 3 locations in `/packages/frontend/src/utils/cv-preview/`, `/packages/frontend/src/shared/utils/cv-preview/`, `/packages/frontend/src/microservices/processing-ui/utils/cv-preview/`
- [ ] T031 [US3] Compare file contents to identify any variations between copies of `enhancedTemplateGenerator.ts`, `templateSpecificGenerators.ts`, `enhancedTemplateStyles.ts`, etc.
- [ ] T032 [US3] Document findings in `/specs/001-remove-stubs/duplicate-analysis.md`

#### Consolidate to Canonical Location

- [ ] T033 [US3] [P] Verify `/packages/frontend/src/shared/utils/cv-preview/enhancedTemplateGenerator.ts` is complete (626 lines) and has no stubs
- [ ] T034 [US3] [P] Verify `/packages/frontend/src/shared/utils/cv-preview/templateSpecificGenerators.ts` is complete (1,062 lines) and has no stubs
- [ ] T035 [US3] [P] Verify `/packages/frontend/src/shared/utils/cv-preview/enhancedTemplateStyles.ts` is complete (1,099 lines) and has no stubs
- [ ] T036 [US3] [P] Verify remaining 13 files in shared location are complete and validated
- [ ] T037 [US3] Fix import issues in shared location files (migrate any stub imports from processing-ui to real implementations)
- [ ] T038 [US3] Update all imports across codebase from `/utils/cv-preview/` to `/shared/utils/cv-preview/` using search-replace

#### Delete Duplicate Files

- [ ] T039 [US3] [P] Delete all 16 duplicate files from `/packages/frontend/src/utils/cv-preview/` directory
- [ ] T040 [US3] [P] Delete duplicate files from `/packages/frontend/src/microservices/processing-ui/utils/cv-preview/` EXCEPT `placeholderReplacer.ts` (move it to shared if needed)
- [ ] T041 [US3] Update build configurations if needed (verify `tsconfig.json` excludes old paths)
- [ ] T042 [US3] Verify all imports are updated: run `grep -r "from.*utils/cv-preview" packages/` to find any remaining old paths
- [ ] T043 [US3] Run tests: `npm run test:frontend` to verify no regressions in CV generation

---

## Phase 2: Workflow Service Implementations

**Duration**: 12 days | **91 stub methods across 9 services**

### Phase 2a: Tier 1 Foundation Services (3 days)

These are independent services with minimal dependencies - can be implemented in parallel.

#### FeatureCompletionService (1 day - 9 stubs)

- [ ] T044 [US1] Read `/packages/workflow/src/backend/services/FeatureCompletionService.ts` to understand stub structure
- [ ] T045 [US1] Implement `completeFeature()` in `/packages/workflow/src/backend/services/FeatureCompletionService.ts:22-25` with Firestore write
- [ ] T046 [US1] [P] Implement `getCompletedFeatures()` in `/packages/workflow/src/backend/services/FeatureCompletionService.ts:26-30`
- [ ] T047 [US1] [P] Implement `isFeatureCompleted()` in `/packages/workflow/src/backend/services/FeatureCompletionService.ts:31-35`
- [ ] T048 [US1] [P] Implement `getFeatureStatus()`, `injectCompletedFeatures()`, `updateFeatureProgress()` in `/packages/workflow/src/backend/services/FeatureCompletionService.ts:36-60`
- [ ] T049 [US1] [P] Implement `checkFeatureDependencies()`, `getCompletionStats()`, `validateCompletionData()` in `/packages/workflow/src/backend/services/FeatureCompletionService.ts:61-80`
- [ ] T050 [US1] Add comprehensive error handling and logging
- [ ] T051 [US1] Write unit tests in `/packages/workflow/src/backend/services/__tests__/FeatureCompletionService.test.ts` (AAA pattern)
- [ ] T052 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/FeatureCompletionService.integration.test.ts` for Firestore operations

#### PlaceholderService (1 day - 10 stubs)

- [ ] T053 [US2] Read `/packages/workflow/src/backend/services/PlaceholderService.ts` to understand structure
- [ ] T054 [US2] Implement `updatePlaceholderValue()` in `/packages/workflow/src/backend/services/PlaceholderService.ts:22-25` with Firestore write
- [ ] T055 [US2] [P] Implement `getPlaceholderValues()`, `getPlaceholderValue()`, `batchUpdatePlaceholders()` in `/packages/workflow/src/backend/services/PlaceholderService.ts:26-45`
- [ ] T056 [US2] [P] Implement `resolvePlaceholders()` template interpolation engine in `/packages/workflow/src/backend/services/PlaceholderService.ts:46-55`
- [ ] T057 [US2] [P] Implement `getAvailablePlaceholders()`, `validatePlaceholders()`, `getPlaceholderCompletionStatus()` in `/packages/workflow/src/backend/services/PlaceholderService.ts:56-75`
- [ ] T058 [US2] [P] Implement `generateDefaultPlaceholders()`, `getPlaceholderStatistics()` in `/packages/workflow/src/backend/services/PlaceholderService.ts:76-90`
- [ ] T059 [US2] Add validation rules and type checking
- [ ] T060 [US2] Write tests in `/packages/workflow/src/backend/services/__tests__/PlaceholderService.test.ts`
- [ ] T061 [US2] Write integration tests in `/packages/workflow/src/backend/services/__tests__/PlaceholderService.integration.test.ts`

#### JobFeatureService (1 day - 11 stubs)

- [ ] T062 [US1] Read `/packages/workflow/src/backend/services/JobFeatureService.ts`
- [ ] T063 [US1] Implement `updateJobFeatures()`, `getJobFeatures()`, `addFeatureToJob()`, `removeFeatureFromJob()` in `/packages/workflow/src/backend/services/JobFeatureService.ts:18-45`
- [ ] T064 [US1] [P] Implement `updateFeatureStatus()`, `getFeature()`, `bulkUpdateFeatures()` in `/packages/workflow/src/backend/services/JobFeatureService.ts:46-65`
- [ ] T065 [US1] [P] Implement `getFeaturesByStatus()`, `getFeatureExecutionOrder()` (topological sort) in `/packages/workflow/src/backend/services/JobFeatureService.ts:66-75`
- [ ] T066 [US1] [P] Implement `validateFeatureUpdates()`, `getFeatureStatistics()` in `/packages/workflow/src/backend/services/JobFeatureService.ts:76-85`
- [ ] T067 [US1] Add dependency graph management and sorting logic
- [ ] T068 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/JobFeatureService.test.ts`
- [ ] T069 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/JobFeatureService.integration.test.ts`

### Phase 2b: Tier 2 Core Services (3 days)

#### FeatureSkipService (1 day - 9 stubs)

- [ ] T070 [US1] Read `/packages/workflow/src/backend/services/FeatureSkipService.ts`
- [ ] T071 [US1] Implement `skipFeature()`, `getSkippedFeatures()`, `isFeatureSkipped()`, `unskipFeature()` in `/packages/workflow/src/backend/services/FeatureSkipService.ts:22-45`
- [ ] T072 [US1] [P] Implement `getSkipReasons()`, `canSkipFeature()`, `getSkipSuggestions()` in `/packages/workflow/src/backend/services/FeatureSkipService.ts:46-65`
- [ ] T073 [US1] [P] Implement `updateSkipReason()`, `getSkipImpactAnalysis()` (dependency graph) in `/packages/workflow/src/backend/services/FeatureSkipService.ts:66-80`
- [ ] T074 [US1] Add impact analysis and dependency checking
- [ ] T075 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/FeatureSkipService.test.ts`
- [ ] T076 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/FeatureSkipService.integration.test.ts`

#### TemplateService (1 day - 13 stubs)

- [ ] T077 [US1] Read `/packages/workflow/src/backend/services/TemplateService.ts`
- [ ] T078 [US1] Implement `getTemplates()`, `getTemplate()`, `getTemplatesByCategory()`, `getFeaturedTemplates()`, `getPremiumTemplates()` in `/packages/workflow/src/backend/services/TemplateService.ts:21-45`
- [ ] T079 [US1] [P] Implement `searchTemplates()`, `getTemplateMetadata()`, `getTemplatePreview()` in `/packages/workflow/src/backend/services/TemplateService.ts:46-60`
- [ ] T080 [US1] [P] Implement `checkTemplateAccess()`, `getRecommendedTemplates()`, `trackTemplateUsage()` in `/packages/workflow/src/backend/services/TemplateService.ts:61-80`
- [ ] T081 [US1] [P] Implement `getTemplateStatistics()`, `validateTemplate()` in `/packages/workflow/src/backend/services/TemplateService.ts:81-95`
- [ ] T082 [US1] Add search indexing strategy and analytics aggregation
- [ ] T083 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/TemplateService.test.ts`
- [ ] T084 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/TemplateService.integration.test.ts`

#### CertificationService (1 day - 12 stubs)

- [ ] T085 [US1] Read `/packages/workflow/src/backend/services/CertificationService.ts`
- [ ] T086 [US1] Implement `issueBadge()`, `getUserBadges()`, `getBadge()`, `verifyBadge()`, `revokeBadge()` in `/packages/workflow/src/backend/services/CertificationService.ts:22-50`
- [ ] T087 [US1] [P] Implement `getAvailableBadgeTypes()`, `checkBadgeEligibility()`, `generateVerificationUrl()` in `/packages/workflow/src/backend/services/CertificationService.ts:51-70`
- [ ] T088 [US1] [P] Implement `getUserBadgeStatistics()`, `getCertificationLeaderboard()`, `exportUserBadges()`, `getCertificationAnalytics()` in `/packages/workflow/src/backend/services/CertificationService.ts:71-100`
- [ ] T089 [US1] Add criteria evaluation engine and multi-format export logic
- [ ] T090 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/CertificationService.test.ts`
- [ ] T091 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/CertificationService.integration.test.ts`

### Phase 2c: Tier 3 Advanced Services (2 days)

These services depend on Tier 1/2 - implement after those are complete.

#### RoleProfileService (1 day - 12 stubs)

- [ ] T092 [US1] Read `/packages/workflow/src/backend/services/RoleProfileService.ts`
- [ ] T093 [US1] Implement `createRoleProfile()`, `updateRoleProfile()`, `getRoleProfile()`, `getUserRoleProfiles()`, `deleteRoleProfile()` in `/packages/workflow/src/backend/services/RoleProfileService.ts:21-50`
- [ ] T094 [US1] [P] Implement `getRoleTemplateRecommendations()`, `getRoleFeatureRecommendations()`, `customizeProfileForRole()` in `/packages/workflow/src/backend/services/RoleProfileService.ts:51-70`
- [ ] T095 [US1] [P] Implement `getRoleProfileAnalytics()`, `compareWithRoleRequirements()`, `getAvailableRoleTypes()`, `generateRoleSpecificContent()` in `/packages/workflow/src/backend/services/RoleProfileService.ts:71-100`
- [ ] T096 [US1] Integrate with TemplateService and FeatureService for recommendations (use results from T077+)
- [ ] T097 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/RoleProfileService.test.ts`
- [ ] T098 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/RoleProfileService.integration.test.ts`

#### JobMonitoringService (1 day - 9 stubs)

- [ ] T099 [US1] Read `/packages/workflow/src/backend/services/JobMonitoringService.ts` (extends EventEmitter)
- [ ] T100 [US1] Implement `startMonitoring()`, `stopMonitoring()`, `getJobStatus()`, `getJobProgress()` in `/packages/workflow/src/backend/services/JobMonitoringService.ts:24-45`
- [ ] T101 [US1] [P] Implement `updateJobStatus()`, `getMonitoringData()`, `getDashboardData()` in `/packages/workflow/src/backend/services/JobMonitoringService.ts:46-65`
- [ ] T102 [US1] [P] Implement `setupRealtimeListeners()`, `cleanup()` for real-time event handling in `/packages/workflow/src/backend/services/JobMonitoringService.ts:66-80`
- [ ] T103 [US1] Add cache management and event emission logic for real-time updates
- [ ] T104 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/JobMonitoringService.test.ts`
- [ ] T105 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/JobMonitoringService.integration.test.ts`

#### WorkflowOrchestrator (1 day - 7 stubs)

- [ ] T106 [US1] Read `/packages/workflow/src/backend/services/WorkflowOrchestrator.ts` (coordinates other services)
- [ ] T107 [US1] Implement `initializeWorkflow()`, `orchestrateFeatureCompletion()`, `orchestrateFeatureSkip()` in `/packages/workflow/src/backend/services/WorkflowOrchestrator.ts:27-50`
- [ ] T108 [US1] [P] Implement `getWorkflowState()`, `updateWorkflowState()`, `isWorkflowComplete()`, `getWorkflowProgress()` in `/packages/workflow/src/backend/services/WorkflowOrchestrator.ts:51-75`
- [ ] T109 [US1] Integrate with JobMonitoringService (created in T099+), FeatureCompletionService (created in T044+), FeatureSkipService (created in T070+)
- [ ] T110 [US1] Write tests in `/packages/workflow/src/backend/services/__tests__/WorkflowOrchestrator.test.ts`
- [ ] T111 [US1] Write integration tests in `/packages/workflow/src/backend/services/__tests__/WorkflowOrchestrator.integration.test.ts`

---

## Phase 3: External Service Integrations

**Duration**: 5 days | **Email, Video, Podcast, Audio services with error handling patterns**

### Cross-Cutting: Error Handling Infrastructure (0.5 days)

- [ ] T112 Implement retry logic in `/packages/core/src/services/retry.service.ts` with exponential backoff (1s, 2s, 4s for critical; 5s, 10s, 20s for non-critical)
- [ ] T113 Implement circuit breaker in `/packages/core/src/services/circuit-breaker.service.ts` with CLOSED/OPEN/HALF_OPEN states
- [ ] T114 Implement dead-letter queue in `/packages/core/src/services/dead-letter-queue.service.ts` for failed critical service calls
- [ ] T115 Implement fallback provider logic in `/packages/core/src/services/fallback-provider.service.ts` for email/video/podcast graceful degradation

### Email Service Integration (1 day - 15+ TODOs)

- [ ] T116 [P] Install dependencies: `npm install nodemailer @types/nodemailer` in packages/multimedia and packages/core
- [ ] T117 Uncomment nodemailer imports in `/packages/multimedia/src/services/integrations.service.ts:7,11`
- [ ] T118 Implement email transporter initialization in `/packages/multimedia/src/services/integrations.service.ts:24-35` with provider support (Gmail, SendGrid, Resend)
- [ ] T119 [P] Implement same in `/packages/core/src/services/integrations.service.ts:24-35`
- [ ] T120 Implement email sending with fail loud + retry in `/packages/multimedia/src/services/EmailService.ts` using retry.service
- [ ] T121 Implement email fallback provider in `/packages/multimedia/src/services/EmailFallbackService.ts` for SendGrid/Resend
- [ ] T122 Create email templates in `/packages/multimedia/src/templates/email/` for each email type
- [ ] T123 Add email validation in `/packages/multimedia/src/services/email-validator.service.ts`
- [ ] T124 Write tests in `/packages/multimedia/src/services/__tests__/EmailService.test.ts`
- [ ] T125 Write integration tests in `/packages/multimedia/src/services/__tests__/EmailService.integration.test.ts` with fallback testing

### Video Generation Service (1.5 days - 10+ TODOs)

- [ ] T126 [P] Fix provider architecture in `/packages/multimedia/src/backend/services/enhanced-video-generation.service.ts:402` - provider should have `checkStatus()` method
- [ ] T127 Implement HeyGen API integration in `/packages/multimedia/src/backend/services/HeyGenVideoService.ts` with error handling
- [ ] T128 Implement RunwayML API integration in `/packages/multimedia/src/backend/services/RunwayMLVideoService.ts` with circuit breaker
- [ ] T129 Implement video thumbnail generation in `/packages/multimedia/src/services/integrations.service.ts:188` using FFmpeg (0s, 25%, 50%, 75% timestamps)
- [ ] T130 [P] Implement video generation service in `/packages/multimedia/src/services/integrations.service.ts:330` with provider selection
- [ ] T131 Implement video processing queue in `/packages/multimedia/src/services/VideoProcessingQueueService.ts` for async handling
- [ ] T132 Add video generation with graceful degradation (skip with message on failure)
- [ ] T133 Write tests in `/packages/multimedia/src/backend/services/__tests__/VideoGenerationService.test.ts`
- [ ] T134 Write integration tests with mock HeyGen/Runway APIs

### Podcast Generation Service (1.5 days - 10+ TODOs)

- [ ] T135 [P] Integrate TTS service in `/packages/multimedia/src/backend/services/media-generation.service.ts:562` (Google Cloud TTS or Amazon Polly)
- [ ] T136 Implement Google Cloud TTS integration in `/packages/multimedia/src/backend/services/GoogleTTSService.ts` with error handling
- [ ] T137 Implement Amazon Polly integration in `/packages/multimedia/src/backend/services/AmazonPollyService.ts` with circuit breaker
- [ ] T138 [P] Implement podcast merging logic in `/packages/multimedia/src/backend/services/media-generation.service.ts:709` for audio concatenation
- [ ] T139 Implement waveform generation in `/packages/multimedia/src/services/WaveformGeneratorService.ts` (integrate with AudioWaveformGenerator)
- [ ] T140 Implement audio enhancement in `/packages/multimedia/src/services/AudioEnhancementService.ts` with noise reduction, normalization
- [ ] T141 Add podcast generation with graceful degradation (text-only mode on failure)
- [ ] T142 Write tests in `/packages/multimedia/src/backend/services/__tests__/PodcastGenerationService.test.ts`
- [ ] T143 Write integration tests with mock TTS providers

### Audio Processing Services (1 day - 6 TODOs)

- [ ] T144 [P] Install dependencies: `npm install fluent-ffmpeg @types/fluent-ffmpeg music-metadata`
- [ ] T145 Implement audio analysis in `/packages/multimedia/src/services/audio/AudioAnalyzer.ts:18-45` using FFmpeg for metadata, format validation
- [ ] T146 Implement audio processor in `/packages/multimedia/src/services/audio/AudioProcessor.ts:18-35` for audio enhancement
- [ ] T147 Implement audio transcoder in `/packages/multimedia/src/services/audio/AudioTranscoder.ts:18-40` for format conversion (MP3, WAV, AAC, etc.)
- [ ] T148 Implement waveform generator in `/packages/multimedia/src/services/audio/WaveformGenerator.ts:18-40` for peak data generation
- [ ] T149 Write tests in `/packages/multimedia/src/services/audio/__tests__/` for all 4 audio services

---

## Phase 4: TODO/FIXME Comment Resolution

**Duration**: 5 days | **71+ TODOs in production code**

### Critical TODO Resolution (1 day - 20+ items)

- [ ] T150 [US2] Find and fix 3x security critical TODOs in feature access, payment webhooks, rate limiting
- [ ] T151 [US2] [P] Resolve all "TODO: Implement" comments in workflow services (use completed Phase 2 implementations)
- [ ] T152 [US2] [P] Remove "TODO" markers from email service setup (now implemented in Phase 3)
- [ ] T153 [US2] [P] Remove "TODO" markers from video generation (now implemented in Phase 3)
- [ ] T154 [US2] [P] Remove "TODO" markers from podcast generation (now implemented in Phase 3)
- [ ] T155 [US2] Verify all critical TODOs resolved with `grep -r "TODO:" packages/*/src --exclude-dir=tests | wc -l` (should be <10)

### High-Priority TODO Resolution (1 day - 40+ items)

- [ ] T156 [US2] Resolve API integration TODOs in `/packages/frontend/src/microservices/processing-ui/services/CVTemplateUIService.ts` (10+ items)
- [ ] T157 [US2] Resolve API integration TODOs in `/packages/frontend/src/microservices/processing-ui/services/CVProcessingUIService.ts` (10+ items)
- [ ] T158 [US2] [P] Resolve admin health check TODOs in `/packages/admin/src/backend/services/llm-integration-wrapper.service.ts` (3 sets)
- [ ] T159 [US2] [P] Resolve portal generation TODOs in `/packages/public-profiles/src/backend/services/portal-generation.service.ts` (10+ items)
- [ ] T160 [US2] [P] Resolve workflow monitoring TODOs in `/packages/frontend/src/microservices/workflow-ui/hooks/useWorkflowMonitoring.ts`

### Medium-Priority TODO Resolution (2 days - 30+ items)

- [ ] T161 [US2] Resolve real-time update TODOs (WebSocket implementation) in workflow monitoring hooks
- [ ] T162 [US2] [P] Resolve cache optimization TODOs in `/packages/premium/src/services/usage-batch-cache.service.ts`
- [ ] T163 [US2] [P] Resolve template-specific generator TODOs in `/packages/frontend/src/microservices/processing-ui/utils/cv-preview/templateSpecificGenerators.ts` (6 items)
- [ ] T164 [US2] [P] Resolve QR code enhancement TODOs in `/packages/public-profiles/src/backend/functions/qr/`
- [ ] T165 [US2] [P] Resolve analytics tracking TODOs in `/packages/frontend/src/shared/hooks/useConversionTracking.ts`
- [ ] T166 [US2] Resolve infrastructure logging TODOs in `/packages/core/src/services/base-service.ts` (import @cvplus/logging)
- [ ] T167 [US2] Verify all TODOs resolved: `grep -r "TODO:" packages/*/src --exclude-dir=tests --exclude="*.test.ts" | wc -l` (should be 0)

---

## Phase 5: File Refactoring & Polish

**Duration**: 5+ days | **200+ files over 200 lines + middleware consolidation**

### Identify Large Files (1 day)

- [ ] T168 Generate list of files over 200 lines: `find packages -name "*.ts" -type f -exec wc -l {} + | awk '$1 > 200' | sort -rn > /tmp/large-files.txt`
- [ ] T169 Analyze top 20 largest files for refactoring opportunities in `/specs/001-remove-stubs/large-files-refactor-plan.md`
- [ ] T170 Categorize refactoring by service type (controllers, services, utilities, etc.)

### Refactor Large Files (3+ days)

#### Template-Related Services

- [ ] T171 [US5] Refactor `/packages/workflow/src/backend/services/TemplateService.ts` (estimated 350 lines) into:
  - TemplateService.ts (150 lines) - main service
  - TemplateQuery.ts (80 lines) - query logic
  - TemplateAccess.ts (60 lines) - access control
  - TemplateAnalytics.ts (60 lines) - analytics
- [ ] T172 [US5] [P] Refactor `/packages/workflow/src/backend/services/RoleProfileService.ts` similarly
- [ ] T173 [US5] [P] Refactor `/packages/multimedia/src/backend/services/enhanced-video-generation.service.ts` into separate provider services
- [ ] T174 [US5] [P] Refactor `/packages/multimedia/src/backend/services/media-generation.service.ts` into email/video/podcast services

#### Feature-Related Services

- [ ] T175 [US5] Refactor large feature services (FeatureSkipService, FeatureCompletionService) if >200 lines
- [ ] T176 [US5] [P] Refactor CV preview generation files if any exceed 200 lines (verify from Phase 1b consolidation)

#### Verification After Refactoring

- [ ] T177 [US5] Verify all tests pass after refactoring: `npm run test:workflow && npm run test:multimedia && npm run test:premium`
- [ ] T178 [US5] Verify no regressions: Compare behavior before/after refactoring
- [ ] T179 [US5] Final line count check: `find packages -name "*.ts" -type f -exec wc -l {} + | awk '$1 > 200' | wc -l` (should be 0 or minimal)

### AuthGuard Middleware Consolidation (1 day)

- [ ] T180 [US6] Find all AuthGuard implementations: `grep -r "class AuthGuard" packages/*/src`
- [ ] T181 [US6] Compare implementations for differences and consolidate logic
- [ ] T182 [US6] Identify canonical location: `/packages/auth/src/middleware/AuthGuard.ts`
- [ ] T183 [US6] [P] Update all imports to canonical location across packages
- [ ] T184 [US6] [P] Delete duplicate AuthGuard implementations
- [ ] T185 [US6] Write tests to verify authentication flows unchanged: `npm run test:auth`

---

## Final Verification Phase

**Duration**: 2 days | **Automated quality gates**

### Automated Scans (1 day)

- [ ] T186 Scan for remaining stubs: `grep -r "Method not implemented" packages/*/src --exclude-dir=tests` (should match 0)
- [ ] T187 Scan for remaining TODOs: `grep -r "TODO:\|FIXME:" packages/*/src --exclude-dir=tests --exclude="*.test.ts"` (should match 0)
- [ ] T188 [P] Verify CV code consolidation: `find packages/frontend -name "enhancedTemplateGenerator.ts" | wc -l` (should be 1)
- [ ] T189 [P] Verify file sizes: `find packages -name "*.ts" -type f -exec wc -l {} + | awk '$1 > 200'` (should be 0 or documented exceptions)
- [ ] T190 [P] Verify AuthGuard consolidation: `grep -r "class AuthGuard" packages/*/src | wc -l` (should be 1)

### Test Execution (1 day)

- [ ] T191 Run all tests: `npm run test` (all tests must pass)
- [ ] T192 [P] Run security tests: `npm run test:security` (authentication, access control tests)
- [ ] T193 [P] Run integration tests: `npm run test:integration` (Firestore, external API mocks)
- [ ] T194 [P] Run type checking: `npm run type-check` (no TypeScript errors)

### Final Cleanup & Documentation (0.5 days)

- [ ] T195 Update all TODOs in spec files to mark work completed
- [ ] T196 Create final summary report in `/specs/001-remove-stubs/completion-report.md`
- [ ] T197 Document any deviations from original plan
- [ ] T198 Archive this tasks.md to mark implementation complete

---

## Implementation Strategy & Dependencies

### Execution Order (Critical Path)

**DO NOT skip or reorder phases:**

1. **Phase 0** (3 days) - BLOCKER for all other work
   - Must complete Firestore schema before Phase 2
   - Must complete feature flag infrastructure before Phase 1a security fixes

2. **Phase 1** (5 days) - Can start after Phase 0 complete
   - Security fixes can run in parallel (T010-T029)
   - Code consolidation depends on Phase 1a completion (verification passes)

3. **Phase 2** (12 days) - Can start after Phase 0 + Phase 1
   - Tier 1 services are independent and can run in parallel (T044-T069)
   - Tier 2 services depend on Tier 1 completion (can start ~day 6)
   - Tier 3 services depend on Tier 1+2 completion (can start ~day 9)

4. **Phase 3** (5 days) - Can start after Phase 0 + error handling infrastructure
   - All 4 service integrations can run in parallel (email, video, podcast, audio)

5. **Phase 4** (5 days) - Can start after all implementations above
   - Critical TODOs depend on Phase 1/2/3 work
   - Remaining TODOs can run in parallel

6. **Phase 5** (5+ days) - Can run in parallel with Phase 4
   - File refactoring and middleware consolidation independent

### Parallelization Opportunities

**Phase 0**: Days 1-3 (sequential - prerequisites)

**Phase 1a Security Fixes** (Days 4-5):
- T010-T029: All can run in parallel (different files, no dependencies)
- Wait for completion before Phase 1b

**Phase 1b Consolidation** (Days 6-8):
- T030-T032: Analysis phase (sequential)
- T033-T036: Verification (can be parallel T033/T034/T035/T036)
- T037-T043: Updates and verification (mostly sequential, some parallel)

**Phase 2a Tier 1 Services** (Days 9-11):
- T044-T052: FeatureCompletionService (sequential within service)
- T053-T061: PlaceholderService (sequential within service)
- T062-T069: JobFeatureService (sequential within service)
- **All 3 services can run in PARALLEL** (different services, no dependencies)

**Phase 2b Tier 2 Services** (Days 12-14):
- **All 3 services can run in PARALLEL** after Tier 1 complete

**Phase 2c Tier 3 Services** (Days 15-16):
- Services can run in parallel but should verify Tier 1/2 tests pass first

**Phase 3 External Services** (Days 17-21):
- T112-T115: Error handling infrastructure (sequential)
- T116-T125: Email service (mostly sequential)
- T126-T134: Video service (mostly sequential)
- T135-T143: Podcast service (mostly sequential)
- T144-T149: Audio services (mostly sequential)
- **After T112-T115, can run Email/Video/Podcast/Audio in PARALLEL**

### Task Dependencies Map

```
Phase 0 (T001-T009)
    ↓ BLOCKER
Phase 1a Security Fixes (T010-T029) [parallel]
    ↓
Phase 1b Code Consolidation (T030-T043)
    ↓ BLOCKER
Phase 2a Tier 1 (T044-T069) [parallel]
    ↓
Phase 2b Tier 2 (T070-T091) [parallel]
    ↓
Phase 2c Tier 3 (T092-T111) [parallel]
    ↓
Phase 3 Infrastructure (T112-T115) [sequential]
    ↓ BLOCKER
Phase 3 Services (T116-T149) [parallel: Email, Video, Podcast, Audio]
    ↓ (can start in parallel with Phase 4)
Phase 4 TODO Resolution (T150-T167) [mostly parallel]
    ↓
Phase 5 Refactoring (T168-T185) [mostly parallel]
    ↓
Final Verification (T186-T198) [parallel then sequential]
```

### MVP Scope (If Time-Limited)

If 5-6 weeks unavailable, implement MVP covering **P1 user stories only**:

1. **Phase 0**: Full (3 days) - Required for all work
2. **Phase 1**: Full (5 days) - All security fixes + consolidation
3. **Phase 2**: Tier 1 + Tier 2 only (8 days) - 64 stubs implemented
4. **Phase 3**: Email + Error handling infrastructure only (2 days)
5. **Phase 4**: Critical TODOs only (2 days)
6. **Final Verification**: Automated scans (1 day)

**Total MVP**: ~21 days (3 weeks) for P1 user stories (US1, US2, US3, US4)

P2 user stories (US5, US6 - file refactoring, middleware consolidation) deferred to Phase 5+ if time-limited.

---

## Completion Checklist

**Before marking implementation complete, verify:**

- [ ] All Phase 0 tasks complete (Firestore + feature flags available)
- [ ] Phase 1 security fixes deployed with feature flag OFF and validated 24-48h
- [ ] All 91 workflow service stub methods implemented and tested
- [ ] Zero stub methods detected: `grep -r "Method not implemented" packages/*/src --exclude-dir=tests` = 0
- [ ] Zero TODO/FIXME in production: `grep -r "TODO:\|FIXME:" packages/*/src --exclude-dir=tests --exclude="*.test.ts"` = 0
- [ ] Single CV generator implementation: `find packages/frontend -name "enhancedTemplateGenerator.ts" | wc -l` = 1
- [ ] All external service integrations implemented with error handling
- [ ] All tests pass: `npm run test` = 100% green
- [ ] Type checking passes: `npm run type-check` = 0 errors
- [ ] Security tests pass: Authentication, access control, webhook validation
- [ ] File sizes verified: No TypeScript files >200 lines (except documented exceptions)
- [ ] Single AuthGuard implementation: `grep -r "class AuthGuard" packages/*/src | wc -l` = 1

**When all above complete**: Mark feature as PRODUCTION READY ✅

---

## Quick Reference by User Story

### US1: Developers Deploy Production Code Without Mock Methods
**Tasks**: T010-T029 (security), T044-T111 (all workflow services), T186-T194 (verification)
**Completion Criteria**: Zero stub methods, all tests pass, feature flag verification

### US2: Developers Remove TODO/FIXME Comments
**Tasks**: T010-T029 (resolve security TODOs), T150-T167 (resolve all TODOs), T186 (verify)
**Completion Criteria**: Zero TODO/FIXME in production, all comments removed

### US3: Developers Eliminate Code Duplication
**Tasks**: T030-T043 (CV code consolidation), T188 (verify), T092-T111 (no duplicates in services)
**Completion Criteria**: Single CV implementation, 15K+ duplicate lines eliminated

### US4: Developers Fix Security Issues
**Tasks**: T010-T029 (feature access, payments, webhooks), T004-T009 (feature flags), T195 (documentation)
**Completion Criteria**: Default-deny security, kill-switch working, all security tests pass

### US5: Developers Refactor Large Files
**Tasks**: T168-T179 (file refactoring), T189 (verify <200 lines)
**Completion Criteria**: 100% of files <200 lines, behavior preserved

### US6: DevOps Consolidates Duplicate Middleware
**Tasks**: T180-T185 (AuthGuard consolidation), T190 (verify single implementation)
**Completion Criteria**: Single AuthGuard implementation, all auth tests pass
