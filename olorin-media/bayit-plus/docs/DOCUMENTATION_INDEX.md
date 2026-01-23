# Bayit+ Documentation Index

**Last Updated:** 2026-01-23
**Project:** Bayit+ Streaming Platform
**Index Format:** Following global CLAUDE.md documentation management standards

---

## 📋 Quick Links

- [README](README.md) - Project overview
- [Architecture](architecture/) - System design
- [Features](features/) - Feature documentation
- [Deployment](deployment/) - Deployment guides
- [Reviews](reviews/) - Code reviews and audits
- [Guides](guides/) - How-to guides
- [Security](security/) - Security documentation

---

## 🚨 Root Directory Cleanup Needed

**The following documents are in ROOT and should be moved:**

### Reviews → /docs/reviews/
- `WATCH_PARTY_CHAT_SECURITY_REVIEW.md` → `reviews/WATCH_PARTY_CHAT_SECURITY_REVIEW.md`
- `WATCH_PARTY_FINAL_SIGNOFF_REPORT.md` → `reviews/WATCH_PARTY_FINAL_SIGNOFF_REPORT.md`
- `WATCH_PARTY_MOBILE_FINAL_APPROVAL.md` → `reviews/WATCH_PARTY_MOBILE_FINAL_APPROVAL.md`
- `WATCH_PARTY_PRODUCTION_READY_REPORT.md` → `reviews/WATCH_PARTY_PRODUCTION_READY_REPORT.md`
- `WATCH_PARTY_SECURITY_FINAL_APPROVAL.md` → `reviews/WATCH_PARTY_SECURITY_FINAL_APPROVAL.md`
- `WATCH_PARTY_SECURITY_REVIEW.md` → `reviews/WATCH_PARTY_SECURITY_REVIEW.md`
- `WATCH_PARTY_TVOS_FINAL_APPROVAL.md` → `reviews/WATCH_PARTY_TVOS_FINAL_APPROVAL.md`
- `WATCH_PARTY_WEB_COMPATIBILITY_REVIEW.md` → `reviews/WATCH_PARTY_WEB_COMPATIBILITY_REVIEW.md`
- `WEB_PLATFORM_REVIEW_REPORT.md` → `reviews/WEB_PLATFORM_REVIEW_REPORT.md`
- `WEB_PODCAST_TRANSLATION_REVIEW.md` → `reviews/WEB_PODCAST_TRANSLATION_REVIEW.md`

### Implementation → /docs/implementation/
- `VOICE_MANAGEMENT_IMPLEMENTATION.md` → `implementation/VOICE_MANAGEMENT_IMPLEMENTATION.md`
- `WATCH_PARTY_FIXES_COMPLETED.md` → `implementation/WATCH_PARTY_FIXES_COMPLETED.md`

### Guides → /docs/guides/
- `PLATFORM_MANAGEMENT_SKILLS.md` → `guides/PLATFORM_MANAGEMENT_SKILLS.md`
- `MONOREPO_SCRIPT_ORGANIZATION_PLAN.md` → `guides/MONOREPO_SCRIPT_ORGANIZATION_PLAN.md`

---

## 📚 Documentation by Category

### Architecture
**Location:** `/docs/architecture/`

- [System Architecture](architecture/) - Platform architecture overview

---

### Features
**Location:** `/docs/features/`

- [Free Content Import Summary](features/FREE_CONTENT_IMPORT_SUMMARY.md) - Free content feature documentation

---

### Implementation Plans
**Location:** `/docs/implementation/`

**To Be Moved:**
- Voice Management Implementation - Voice system implementation details
- Watch Party Fixes Completed - Watch Party bug fixes

**Existing:**
- [Implementation Plans](implementation/) - Various implementation documentation

---

### Reviews & Audits
**Location:** `/docs/reviews/`

**Existing:**
- Multiple review documents covering:
  - Live Dubbing system reviews
  - Watch Party feature reviews
  - Security audits
  - Platform-specific reviews (iOS, tvOS, Web)
  - Voice management reviews

**To Be Moved (10 documents):**
- Watch Party Chat Security Review
- Watch Party Final Signoff Report
- Watch Party Mobile Final Approval
- Watch Party Production Ready Report
- Watch Party Security Final Approval
- Watch Party Security Review
- Watch Party tvOS Final Approval
- Watch Party Web Compatibility Review
- Web Platform Review Report
- Web Podcast Translation Review

---

### Deployment Guides
**Location:** `/docs/deployment/`

- [Deployment Complete](deployment/DEPLOYMENT_COMPLETE.md) - Deployment status
- [Firebase Deployment](deployment/FIREBASE_DEPLOYMENT.md) - Firebase deployment guide
- [Live Quotas Production Deployment](../LIVE_QUOTAS_PRODUCTION_DEPLOYMENT_GUIDE.md) - Production deployment guide

---

### User Guides
**Location:** `/docs/guides/`

- [Quick Start Guide](guides/QUICK_START_GUIDE.md) - Getting started with Bayit+
- [Accessibility Guide](../ACCESSIBILITY_GUIDE.md) - Accessibility features
- [iOS Device Build Guide](../iOS_DEVICE_BUILD_GUIDE.md) - Building for iOS devices
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute

**To Be Moved:**
- Platform Management Skills - Server management guide
- Monorepo Script Organization Plan - Script organization

---

### Security Documentation
**Location:** `/docs/security/`

- [Security Setup](../SECURITY_SETUP.md) - Security configuration
- [Security Quickstart](../SECURITY_QUICKSTART.md) - Quick security setup
- [Security Implementation Complete](../SECURITY_IMPLEMENTATION_COMPLETE.md) - Implementation status
- [Security Approval](../SECURITY_APPROVAL.md) - Security approval documentation
- [Security Review Summary](../SECURITY_REVIEW_SUMMARY.md) - Security review overview
- [Live Quotas Security Fixes](../LIVE_QUOTAS_SECURITY_FIXES.md) - Security fixes
- [Live Quotas Security Integration](../LIVE_QUOTAS_SECURITY_INTEGRATION_COMPLETE.md) - Integration completion

---

### Configuration Guides
**Location:** `/docs/guides/`

- [CORS Configuration](../CORS_CONFIGURATION.md) - CORS setup
- [Google OAuth Setup](../GOOGLE_OAUTH_SETUP.md) - OAuth configuration
- [Secrets Management](../SECRETS.md) - Secret management
- [Poetry Only](../POETRY_ONLY.md) - Poetry dependency management

---

### Technical Documentation
**Location:** `/docs/technical/`

- [CDN Video Deployment Strategy](../CDN_VIDEO_DEPLOYMENT_STRATEGY.md) - Video CDN strategy
- [SRE Production Readiness](../SRE_PRODUCTION_READINESS_REPORT.md) - Production readiness assessment
- [Production Readiness Action Items](../PRODUCTION_READINESS_ACTION_ITEMS.md) - Action items for production

---

### Plans & Specifications
**Location:** `/docs/plans/`

- [Plans](plans/) - Various planning documents

---

### Platform-Specific Documentation
**Location:** `/docs/platform/`

- [Platform Documentation](platform/) - Platform-specific guides

---

### Testing Documentation
**Location:** `/docs/testing/`

- [Testing Documentation](testing/) - Test strategies and plans

---

### Migrations
**Location:** `/docs/migrations/`

- [Migration Documentation](migrations/) - Database and code migrations

---

### Runbooks
**Location:** `/docs/runbooks/`

- [Operational Runbooks](runbooks/) - Operations procedures

---

## 📊 Statistics

**Current State:**
- Total documents: 60+
- Documents in root: ~17
- Documents properly organized: ~43
- Categories: 15

**Target State:**
- ✅ Zero documents in root
- ✅ All documents indexed
- ✅ All documents in proper subfolders

---

## 🔧 Adding New Documentation

**Required Steps (Global CLAUDE.md Standards):**

1. ✅ **User Request Required** - Only create docs when explicitly requested
2. ✅ **Determine Category** - Choose correct subfolder
3. ✅ **Create in Subfolder** - `/docs/[category]/DOCUMENT_NAME.md`
4. ✅ **Update This Index** - Add entry with title, link, description, date
5. ✅ **Update Timestamp** - Update "Last Updated" at top

**Naming Convention:**
- UPPERCASE for major words
- Include date for time-sensitive docs: `FEATURE_IMPLEMENTATION_2026-01-23.md`
- Descriptive names: `WATCH_PARTY_SECURITY_AUDIT.md`
- Underscores between words

---

## 📞 Related Resources

- [Main README](../README.md) - Project overview
- [Platform Management Skills](../PLATFORM_MANAGEMENT_SKILLS.md) - Server management commands
- [Bayit+ CLAUDE.md](../CLAUDE.md) - Project-specific coding standards

---

**Maintained by:** Bayit+ Development Team
**Standards:** Global CLAUDE.md Documentation Management Rules
