# Bayit+ Documentation

Central documentation repository for the Bayit+ streaming platform.

## 📁 Directory Structure

### `/features/`
Feature documentation and implementation guides:
- Live translation and subtitle features
- S3/GCS storage integration
- Subscription and payment features
- Live streaming functionality
- Content import and management
- **Unified Voice System** (`/architecture/UNIFIED_VOICE_ARCHITECTURE.md`, `/guides/VOICE_MIGRATION_GUIDE.md`, `/api/VOICE_API_REFERENCE.md`) - Complete unified voice system consolidating 3 separate voice systems under Olorin wizard avatar with 4 visibility modes, cross-platform support (Web/iOS/Android/tvOS), intent routing, and orchestrator pattern - ✅ IMPLEMENTED - 2026-01-29 **NEW**
- **Librarian Audit Log Improvements** (`LIBRARIAN_AUDIT_LOG_IMPROVEMENTS.md`) - Comprehensive UI/UX enhancements for Live Audit Log and Recent Reports components with search, filtering, sorting, quick audit triggers, and enhanced table layout - ✅ ENHANCEMENT COMPLETE - 2026-01-25 **NEW**

### `/guides/`
User guides and manuals:
- **Beta 500 User Manual** (`BETA_500_USER_MANUAL.md`) - Comprehensive user manual for Beta 500 closed beta program testers covering signup, email verification, credit system (5,000 AI credits), feature usage (live dubbing, AI search, recommendations), troubleshooting, and FAQ - 2026-01-29 **NEW**

### `/deployment/`
Deployment guides and status:
- Deployment completion reports
- Firebase deployment guides
- Upload status tracking
- Infrastructure configuration
- **Automated Library Integrity Checks** (`/infrastructure/scheduled-jobs/library-integrity/`) - Cloud Run Job and Cloud Scheduler setup for weekly automated verification
- **Location Feature Production Ready** (`LOCATION_FEATURE_PRODUCTION_READY.md`) - Production readiness report for location-based content feature with all security fixes and deployment guide - ✅ PRODUCTION READY - 2026-01-28
- **Secrets & Environment Variables Comprehensive Audit** (`SECRETS_ENVIRONMENT_AUDIT_2026-01-28.md`) - Critical security audit comparing backend/.env (120+ vars), cloudbuild.yaml (3 secrets), deploy_server.sh (72 secrets), Google Cloud Secret Manager (118 secrets), and Cloud Run service (60+ secrets) with security vulnerabilities, naming inconsistencies, and deployment gaps - 🚨 CRITICAL SECURITY ISSUES - 2026-01-28 **NEW**
- **Google Cloud Secrets: Librarian & WebAuthn** (`GCLOUD_SECRETS_LIBRARIAN_WEBAUTHN.md`) - Secrets management documentation for 25 Librarian Agent configuration variables and 3 WebAuthn/Passkey authentication variables with GCloud commands and sync script workflow - 2026-01-29 **NEW**
- **Google Cloud Secrets: Dubbing Pipeline Improvements** (`GCLOUD_SECRETS_DUBBING_IMPROVEMENTS.md`) - Secrets management documentation for 18 new dubbing configuration variables across P0 security, P1 scalability, P2 performance improvements with GCloud commands, service account access, and tuning guide - 2026-01-29 **NEW**
- **Google Cloud Secrets: Beta 500 Program** (`GCLOUD_SECRETS_BETA_500.md`) - Secrets management documentation for 16 Beta 500 closed beta program configuration variables (fraud detection, email verification, credit system, session tracking) with GCloud commands, service account access, and sync workflow - 2026-01-29 **NEW**
- **Beta 500 Monitoring Setup** (`MONITORING_SETUP.md`) - Prometheus/Grafana/Alertmanager monitoring infrastructure for Beta 500 program with 30+ business and system metrics, alert rules for credit thresholds, fraud detection, session tracking, and dashboard templates - 2026-01-29 **NEW**

### `/testing/`
Testing documentation and checklists:
- Testing checklists and procedures
- Real channel setup guides
- QA workflows

### `/security/`
Security documentation:
- Security audit reports
- Authentication and authorization guides
- Security fixes and implementations

### `/implementation/`
Implementation notes and session reports:
- Build summaries
- Bug fix reports
- Frontend/backend updates
- Data migration notes
- Session completion reports
- **Beta 500 Closed Beta Program** (`BETA_500_REVISED_PLAN.md`) - Comprehensive implementation plan for closed beta program supporting 500 Israeli expat families with 5,000 free AI credits each: email verification with HMAC-SHA256 tokens, fraud detection with SHA-256 fingerprinting, atomic MongoDB credit transactions, session-based checkpoint deduction (30-second intervals), complete API endpoints, web/mobile/tvOS credit widgets, Prometheus metrics, blue-green deployment with gradual rollout - ✅ APPROVED BY ALL REVIEWERS - 2026-01-29 **NEW**
- **GlassEmptyState Migration Guide** (`GLASS_EMPTY_STATE_MIGRATION.md`) - Migration of 12+ empty state implementations to unified GlassEmptyState component - 2026-01-28 **NEW**
- **Geolocation Permission UI** (`GEOLOCATION_UI_IMPLEMENTATION.md`) - GDPR-compliant browser geolocation permission UI with consent modal, permission banner, and backend integration - ✅ COMPLETE - 2026-01-28 **NEW**
- **Maariv 103FM Playlist Widget** (`MAARIV_103_PLAYLIST_WIDGET_IMPLEMENTATION.md`) - Custom React widget displaying scrollable archive of 103FM podcast episodes with integrated AudioPlayer, pagination, RTL support, and glassmorphism styling - ✅ IMPLEMENTED - 2026-01-28 **NEW**
- **Israeli Tech Podcasts Implementation** (`ISRAELI_TECH_PODCASTS_IMPLEMENTATION.md`) - Complete implementation of 3 Israeli tech/news podcasts (חיות כיס, בזמן שעבדתם, Raymond Tec News) with system widgets, Technology category classification, RSS feed connectivity testing, and 50 episodes synced - ✅ PRODUCTION READY - 2026-01-29 **NEW**
- **UI/UX Implementations**:
  - `MISSING_ASSETS_IMPLEMENTATION.md` - Complete technical specification for missing asset fixes
  - `MISSING_ASSETS_SUMMARY.md` - Executive summary of missing assets implementation
- **Security Implementations**:
  - `PODCAST_TRANSLATION_PREMIUM_PROTECTION_IMPLEMENTATION.md` - Premium protection implementation for podcast translation feature - 2026-01-24
- **Admin Page Rebuild**:
  - `CONTENT_ADMIN_REBUILD_REVISED_PLAN.md` - Revised implementation plan for rebuilding 4 content admin pages (ContentLibraryPage, FeaturedManagementPage, CategoriesPage, ContentEditorPage) with mandatory pre-implementation fixes addressing console.log violations, missing backend endpoints, incomplete translations, security gaps, and rollback mechanisms - 2026-01-25
  - `CONTENT_ADMIN_REBUILD_COMPLETION_SUMMARY.md` - Comprehensive completion summary for Phase 1-3 implementation covering all 4 refactored pages, code quality verification, build success, and production readiness status - ✅ BUILD SUCCESSFUL - 2026-01-25
- **Radio Stations**:
  - `RADIO_STATIONS_BULK_UPDATE_SUMMARY.md` - Implementation summary for Israeli radio stations bulk update: 2 scripts created (app context + direct MongoDB), all 33 stations with verified HLS stream URLs, 103FM timeout fixed, comprehensive documentation and monitoring recommendations - ✅ READY FOR DEPLOYMENT - 2026-01-26 **NEW**

### `/operations/`
Database operations and maintenance:
- Series merges and deduplication
- Content organization operations
- Database maintenance tasks
- Data cleanup operations
- **Israeli Radio Stations Update** (`ISRAELI_RADIO_STATIONS_UPDATE.md`) - Complete guide for updating all 33 Israeli radio stations with current working stream URLs from digital.100fm.co.il, includes deployment scripts, verification procedures, and rollback plan - ✅ DEPLOYED - 2026-01-26
- **Radio Stations Update Complete** (`RADIO_STATIONS_UPDATE_COMPLETE.md`) - Deployment completion report confirming successful execution: 32 new stations created, 1 updated, 103FM timeout fixed, all 40 stations active and verified in production MongoDB Atlas - ✅ COMPLETE - 2026-01-26 **NEW**
- **Quick Radio Update** (`QUICK_RADIO_UPDATE.md`) - Fast 5-minute deployment reference guide with one-command update, verification, and rollback procedures

### `/reviews/`
Code reviews and assessments:
- Multi-language portal MongoDB assessment
- Security audits
- Performance reviews
- Data architecture assessments
- **Audible API Documentation Review 2026-01-27** (`AUDIBLE_API_DOCUMENTATION_REVIEW_2026-01-27.md`) - Comprehensive review of Audible OAuth integration API documentation covering all 9 endpoints, request/response models, authentication, error handling, and examples - ✅ APPROVED (90.75/100) - 2026-01-27 **NEW**
- **Radio Streaming Production Fixes** (`RADIO_STREAMING_PRODUCTION_FIXES_2026-01-26.md`) - Production action plan for 103FM timeout issue with backend stream validation, frontend error handling, and comprehensive deployment checklist - ⚠️ DEPLOYMENT REQUIRED - 2026-01-26
- **Radio Streaming Issue Fix** (`RADIO_STREAMING_FIX_REPORT_2026-01-26.md`) - Investigation and comprehensive fixes for 103FM streaming timeout, AudioPlayer error handling, Chromecast SDK failures, and stream URL validation with retry logic - ✅ COMPLETE - 2026-01-26
- **Library Integrity Verification 2026-01-26** (`LIBRARY_INTEGRITY_2026-01-26_01-27-41.md`) - Zero-trust verification of media library integrity - 2026-01-26
- **Notification Ecosystem Audit** (`NOTIFICATION_ECOSYSTEM_AUDIT_2026-01-24.md`) - Comprehensive audit of GlassToast notification system usage across all Olorin platforms
- **Web Notification Migration Review** (`WEB_NOTIFICATION_MIGRATION_REVIEW_2026-01-25.md`) - Frontend developer review of web platform notification migration with accessibility, performance, and browser compatibility analysis - 2026-01-25
- **Notification System Security Review** (`NOTIFICATION_SYSTEM_SECURITY_REVIEW_2026-01-25.md`) - Comprehensive security audit of unified notification system migration with OWASP Top 10 compliance, XSS prevention, and privacy assessment - 2026-01-25
- **Admin Page Security Review** (`ADMIN_PAGE_SECURITY_REVIEW_2026-01-25.md`) - Critical security review of admin page rebuilds (ContentEditorPage & ContentLibraryPage) with input validation, batch operations, SSRF prevention, and audit logging assessment - 2026-01-25
- **Admin Uploads Page Security Re-Review** (`ADMIN_UPLOADS_PAGE_SECURITY_REVIEW_2026-01-25.md`) - Comprehensive security re-review after critical fixes with OWASP Top 10 compliance, file upload security, WebSocket authentication, and production deployment verification - ✅ APPROVED (9.2/10) - 2026-01-25 **NEW**
- **Admin Uploads Accessibility & i18n Review (Initial)** (`UPLOADS_PAGE_ACCESSIBILITY_I18N_REVIEW_2026-01-25.md`) - UX Designer accessibility (WCAG AA) and internationalization review of Admin Uploads Page with 76% translation gap identification, RTL support requirements, and keyboard navigation assessment - ⚠️ CHANGES REQUIRED - 2026-01-25
- **Admin Uploads i18n & Accessibility Re-Review** (`ADMIN_UPLOADS_I18N_ACCESSIBILITY_REVIEW_2026-01-25.md`) - UX Designer re-review after critical fixes, identifying complete failure to integrate i18n keys into main locale files, zero accessibility attributes implementation, and 0/7 WCAG AA criteria met - ⚠️ CHANGES REQUIRED (BLOCKING) - 2026-01-25 **NEW**
- **Admin Pages Testing Report** (`ADMIN_PAGES_TESTING_REPORT_2026-01-25.md`) - Comprehensive testing and verification report for Content Admin Pages Rebuild (Phase 1-3) covering code quality, build verification, and functional testing checklists for all 4 refactored pages - ✅ BUILD SUCCESSFUL - 2026-01-25 **NEW**
- **Admin Uploads Page Critical Issues Fixed** (`CRITICAL_ISSUES_FIXED_2026-01-25.md`) - Final resolution of all 5 critical blocking issues (file size violation, i18n integration, accessibility attributes, touch target compliance, web CSS verification) with comprehensive documentation and production readiness confirmation - ✅ ALL BLOCKING ISSUES RESOLVED - 2026-01-25 **NEW**
- **Podcast Translation Premium Protection Audit** (`PODCAST_TRANSLATION_PREMIUM_PROTECTION_AUDIT.md`) - Critical security and revenue audit of podcast translation premium protection - 2026-01-24

### `/cli/` **NEW - 2026-01-24**
Olorin CLI tooling documentation:
- **Quick Start Guide** (`QUICK_START.md`) - Get started with the Olorin CLI in minutes
- **Phase 1 Implementation** (`PHASE_1_IMPLEMENTATION.md`) - Complete implementation details for Bash Router
- **Phase 1.5 Configuration Audit** (`PHASE_1_5_CONFIGURATION_AUDIT.md`) - Environment variable inventory and validation **NEW**
- Command reference and usage examples
- Health check and environment validation
- Script discovery integration

### `/ENVIRONMENT_VARIABLES.md` **NEW - 2026-01-24**
Complete environment variables reference:
- 80+ environment variables documented across all services
- Security best practices (never commit secrets, strong keys, rotation schedule)
- Validation rules and examples
- Troubleshooting guide

## 🗂️ Additional Documentation Locations

### API Documentation
Located in `/docs/api/`:
- **Voice API Reference** (`VOICE_API_REFERENCE.md`) - Complete API reference for unified voice system: POST /api/v1/voice/unified endpoint, 6 intent types, authentication, rate limits, error codes, and usage examples - 2026-01-29 **NEW**
- **Audible API Examples** (`AUDIBLE_API_EXAMPLES.md`) - Complete OAuth flow walkthrough with curl examples, pagination, search, and troubleshooting guide - 2026-01-27 **NEW**

### Architecture Documentation
Located in `/docs/architecture/`:
- **Unified Voice Architecture** (`UNIFIED_VOICE_ARCHITECTURE.md`) - Complete system architecture for unified voice system: OlorinVoiceOrchestrator, 4 avatar modes, intent classification, platform implementations, performance characteristics, and monitoring - 2026-01-29 **NEW**

### Backend Documentation
Located in `/backend/docs/`:
- `/features/` - Backend-specific feature docs
- `/deployment/` - Deployment procedures
- `/security/` - Security implementations
- `/localization/` - i18n and localization
- `/testing/` - Testing and validation

### Platform-Specific Docs
- `/mobile-app/` - iOS/Android app documentation
- `/tv-app/` - React Native TV app docs
- `/tvos-app/` - Native tvOS app docs
- `/web/` - Web application docs
- `/tizen/` - Samsung Tizen TV docs
- `/webos/` - LG webOS TV docs

## 📚 Quick Reference

### Getting Started
1. **Olorin CLI** (Recommended): `/docs/cli/QUICK_START.md` **NEW**
2. **Environment Setup**: `/docs/ENVIRONMENT_VARIABLES.md` **NEW**
3. Read `/QUICK_START_GUIDE.md` (project root)
4. Backend setup: `/backend/QUICKSTART.md`
5. Development: `/backend/README.md`

### Key Features
- **Unified Voice System**: `/guides/VOICE_MIGRATION_GUIDE.md` (Migration), `/api/VOICE_API_REFERENCE.md` (API), `/architecture/UNIFIED_VOICE_ARCHITECTURE.md` (Architecture) **NEW**
- **Live Translation**: `/features/LIVE_TRANSLATION_EXPANSION.md`
- **Subscription Gates**: `/features/SUBSCRIPTION_GATE_IMPLEMENTATION.md`
- **Storage**: `/features/S3_INTEGRATION_GUIDE.md`
- **Live Streaming**: `/features/LIVE_STREAMING_FIX.md`

### Deployment
- Quick deploy: `/deployment/README.md`
- Firebase: `/deployment/FIREBASE_DEPLOYMENT.md`
- Backend: `/backend/docs/deployment/`

### Security
- Auth audit: `/security/SECURITY_AUDIT_AUTH.md`
- Summary: `/security/SECURITY_AUDIT_SUMMARY.md`
- Backend security: `/backend/docs/security/`

## 🔍 Finding Documentation

### By Topic
- **Authentication**: Check `/security/` and `/backend/docs/security/`
- **CLI Tooling**: Check `/cli/` for Olorin CLI documentation **NEW**
- **Content Management**: Check `/features/` and `/backend/scripts/content/`
- **Database Operations**: Check `/operations/` and `/backend/scripts/backend/content/`
- **Deployment**: Check `/deployment/` and `/backend/docs/deployment/`
- **Testing**: Check `/testing/` and `/backend/scripts/testing/`
- **Localization**: Check `/backend/docs/localization/`
- **Code Reviews**: Check `/reviews/` for assessments and audits

### By Platform
- **Web**: `/web/` directory
- **Mobile**: `/mobile-app/` directory
- **TV**: `/tv-app/`, `/tvos-app/`, `/tizen/`, `/webos/` directories
- **Backend**: `/backend/` directory

## 📝 Documentation Standards

When adding new documentation:

1. **Choose the right location**
   - CLI docs → `/cli/`
   - Feature docs → `/features/`
   - Security docs → `/security/`
   - Deployment docs → `/deployment/`
   - Implementation notes → `/implementation/`
   - Database operations → `/operations/`

2. **Use clear naming**
   - `FEATURE_NAME_IMPLEMENTATION.md`
   - `FEATURE_NAME_GUIDE.md`
   - `SESSION_SUMMARY_DATE.md`

3. **Include standard sections**
   - Summary
   - Changes Made
   - Files Modified
   - Testing Notes
   - Deployment Instructions (if applicable)

4. **Keep it up to date**
   - Mark outdated docs with `[DEPRECATED]` prefix
   - Update docs when features change
   - Archive old implementation notes

## 🔄 Maintenance

This documentation structure was organized on January 13, 2026 to improve project organization.

**Latest Updates:**
- **January 29, 2026:** Added Beta 500 Closed Beta Program documentation - Complete implementation plan (`/implementation/BETA_500_REVISED_PLAN.md`), secrets management (`/deployment/GCLOUD_SECRETS_BETA_500.md`), and monitoring setup (`/deployment/MONITORING_SETUP.md`) for 500-family closed beta with 5,000 free AI credits per user
- **January 25, 2026:** Added Admin Uploads Page critical issues resolution documentation (`/reviews/CRITICAL_ISSUES_FIXED_2026-01-25.md`) - All 5 blocking issues resolved, production-ready
- **January 24, 2026 (Phase 1.5):** Added environment variables documentation (`ENVIRONMENT_VARIABLES.md`) and validation infrastructure
- **January 24, 2026 (Phase 1):** Added `/cli/` directory with Olorin CLI documentation (Bash Router complete)

### Previous Structure
Before organization, documentation was scattered across:
- Project root (~30 markdown files)
- Backend root (~30 markdown files)
- Mixed with source code

### Current Structure
All documentation is now centralized in:
- `/docs/` - Project-level documentation
- `/backend/docs/` - Backend-specific documentation
- Platform-specific directories remain in place

## 🎯 Goals

1. **Easy Discovery**: Find docs by category, not by digging through files
2. **Logical Organization**: Related docs are grouped together
3. **Clear Separation**: Docs separated from source code
4. **Maintainability**: Easy to update and keep current
