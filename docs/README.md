# Bayit+ Documentation

**Last Updated:** 2026-02-02
**Total Documents:** 254 files
**Documentation Portal:** https://docs.bayitplus.com

---

## 📱 Quick Start

**New to Bayit+?** Start here:
- [Startup Guide](guides/STARTUP_GUIDE.md) - Get up and running in 15 minutes
- [Web Development](guides/WEB_DEVELOPMENT_GUIDE.md) - React 18 + Vite + TypeScript
- [Mobile Development](guides/MOBILE_DEVELOPMENT_GUIDE.md) - React Native iOS/Android
- [tvOS Development](guides/TVOS_DEVELOPMENT_GUIDE.md) - Apple TV development

**For Users:**
- [Beta 500 User Manual](guides/BETA_500_USER_MANUAL.md) - AI features closed beta program
- [Troubleshooting Guide](guides/TROUBLESHOOTING.md) - Common issues and solutions
- [i18n Complete Guide](guides/I18N_COMPLETE_GUIDE.md) - 10-language system

---

## 📚 Documentation Portal

**Visit:** https://docs.bayitplus.com

The documentation portal provides:
- 🔍 **Fast Search** - Local search with keyboard shortcuts (Cmd/Ctrl+K)
- 🎨 **Glass UI Theme** - Glassmorphism design with dark mode
- 📱 **Responsive** - Works on all devices
- ✅ **Feedback System** - "Was this helpful?" on every page
- 📊 **Analytics** - Plausible Analytics for usage tracking

---

## 🗂️ Documentation Categories

### API Documentation (`/api/`)

Complete API reference for all Bayit+ services:

- [API Overview](api/API_OVERVIEW.md) - REST API architecture, auth, rate limiting
- [AI API Reference](api/AI_API_REFERENCE.md) - AI Search, Recommendations, Catch-Up
- [Channel Chat API](api/CHANNEL_CHAT_API.md) - Real-time chat for live channels
- [Catch-Up API](api/CATCH_UP_API.md) - AI-powered summaries
- [Voice API Reference](api/VOICE_API_REFERENCE.md) - TTS/STT integration
- [Authentication](api/AUTHENTICATION.md) - JWT, Firebase Auth, OAuth 2.0

**50+ API endpoints documented with:**
- Request/response examples
- TypeScript interfaces
- cURL commands
- Python SDK examples
- Error handling patterns

---

### Architecture Documentation (`/architecture/`)

System design and architecture documents:

- [System Overview](architecture/SYSTEM_OVERVIEW.md) - High-level architecture
- [Component Architecture](architecture/COMPONENT_ARCHITECTURE.md) - Component design
- [Unified Voice Architecture](architecture/UNIFIED_VOICE_ARCHITECTURE.md) - Voice system design

---

### Features Documentation (`/features/`)

Feature specifications and implementation guides:

- [Content Categorization System](features/CONTENT_CATEGORIZATION_SYSTEM.md) - Complete guide to multi-axis content organization, kids/youngsters filtering, IMDB integration, and family controls ⭐ **NEW**
- [AI Features Overview](features/AI_FEATURES_OVERVIEW.md) - Complete AI catalog ⭐ **NEW**
- [Subtitle System Enhancements](features/SUBTITLE_SYSTEM_ENHANCEMENTS.md) - 21 accessibility, UX, and performance fixes ⭐ **NEW**
  - Error categorization (network/server/client)
  - WCAG AA accessibility compliance
  - iOS Dynamic Type & VoiceOver support
  - tvOS focus navigation
  - Zod validation for localStorage
  - LRU cache with concurrency control
- Live Translation & Dubbing
- Subscription & Payment Features
- Content Import & Management
- Live Streaming Functionality
- Storage Integration (S3/GCS)

---

### Development Guides (`/guides/`)

Platform-specific development documentation:

**Platform Guides:**
- [Web Development Guide](guides/WEB_DEVELOPMENT_GUIDE.md) - React 18 + Vite + TypeScript ⭐ **NEW**
- [Mobile Development Guide](guides/MOBILE_DEVELOPMENT_GUIDE.md) - React Native iOS/Android ⭐ **NEW**
- [tvOS Development Guide](guides/TVOS_DEVELOPMENT_GUIDE.md) - Apple TV development ⭐ **NEW**

**Feature Guides:**
- [HLS Subtitles for AirPlay](guides/HLS_SUBTITLES_AIRPLAY.md) - Apple TV/AirPlay subtitle compatibility implementation ⭐ **NEW**
- [i18n Complete Guide](guides/I18N_COMPLETE_GUIDE.md) - 10-language internationalization ⭐ **NEW**
- [Beta 500 User Manual](guides/BETA_500_USER_MANUAL.md) - AI features beta program ⭐ **NEW**
- [Troubleshooting Guide](guides/TROUBLESHOOTING.md) - Common issues across all platforms ⭐ **NEW**
- [Accessibility Guide](guides/ACCESSIBILITY_GUIDE.md) - WCAG AA compliance
- [Contributing Guide](guides/CONTRIBUTING.md) - How to contribute

**AI Integration Guides:**
- [Web AI Integration](guides/AI_INTEGRATION_WEB.md) - React 18 + Zustand + TailwindCSS ⭐ **NEW**
- [Mobile AI Integration](guides/AI_INTEGRATION_MOBILE.md) - React Native iOS/Android + AsyncStorage ⭐ **NEW**
- [tvOS AI Integration](guides/AI_INTEGRATION_TVOS.md) - Apple TV + Focus Navigation ⭐ **NEW**

**AI Support:**
- [AI Troubleshooting](guides/AI_TROUBLESHOOTING.md) - Common issues and solutions ⭐ **NEW**

---

### Technical Reference (`/technical/`)

Deep-dive technical documentation:

- [Database Schema Reference](technical/DATABASE_SCHEMA_REFERENCE.md) - MongoDB Atlas, 64+ collections ⭐ **NEW**
- [Shared Components Reference](technical/SHARED_COMPONENTS_REFERENCE.md) - Glass UI library ⭐ **NEW**
- [Credit System Architecture](technical/CREDIT_SYSTEM.md) - Beta 500 credit metering and transactions ⭐ **NEW**
- [AI Agent System](technical/AI_AGENT_SYSTEM.md) - 50+ tools for automation ⭐ **NEW**
- Content Intelligence
- Search Infrastructure

---

### Testing Documentation (`/testing/`)

Testing strategies and best practices:

- [Testing Strategy](testing/TESTING_STRATEGY.md) - Unit, integration, E2E testing ⭐ **NEW**
- Test coverage requirements (87% minimum)
- CI/CD integration
- Platform-specific testing (Jest, Playwright, Detox)

---

### Deployment Documentation (`/deployment/`)

Deployment guides and infrastructure:

- [Deployment Log](deployment/DEPLOYMENT_LOG.md) - Production deployment history and tracking ⭐ **NEW**
- [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) - Production deployment
- [CI/CD Pipeline](deployment/CI_CD_PIPELINE.md) - GitHub Actions workflows
- [Secrets Management](deployment/SECRETS_MANAGEMENT.md) - Google Cloud secrets
- [MongoDB SSL Fix](deployment/MONGODB_SSL_FIX.md) - Python 3.13+ SSL connection fix ⭐ **NEW**
- [GCloud Secrets API Configuration](deployment/GCLOUD_SECRETS_API_CONFIGURATION.md) - API retry and subtitle config
- [GCloud Secrets Schedules Direct](deployment/GCLOUD_SECRETS_SCHEDULES_DIRECT.md) - EPG integration config ⭐ **NEW**
- [LLM Configuration](deployment/LLM_CONFIGURATION.md) - AI model setup and cost optimization
- Firebase Hosting configuration
- Google Cloud Run setup

---

### Design Documentation (`/design/`)

Design system, accessibility, and UI/UX standards:

- [WCAG AA Color Tokens](design/COLOR_TOKENS_WCAG.md) - Contrast-safe color palette with 40+ compliant combinations ⭐ **NEW**
- Glass UI design system guidelines
- Component design patterns
- Accessibility standards (WCAG AA compliance)

---

### Security Documentation (`/security/`)

Security audits, implementations, and best practices:

- Security Audit Reports
- Authentication & Authorization Guides
- OWASP Top 10 Compliance
- Vulnerability Assessments
- Security Fixes & Implementations

---

### Operations Documentation (`/operations/`)

Database operations and maintenance procedures:

- Series Merges & Deduplication
- Content Organization Operations
- Database Maintenance Tasks
- Data Cleanup Operations
- Israeli Radio Stations Updates

---

### Code Reviews (`/reviews/`)

Comprehensive code reviews and assessments:

- Security Audits
- Performance Reviews
- Data Architecture Assessments
- Multi-platform Reviews
- Production Readiness Reports

---

### Implementation Notes (`/implementation/`)

Implementation summaries and session reports:

- [Feature Parity Implementation 2026-02-01](implementation/FEATURE_PARITY_IMPLEMENTATION_2026-02-01.md) - Complete web/shared/tvOS parity (AI modes, timestamps, preview timing) - 2026-02-01 **NEW**
- [Split-Screen Subtitles Limitation](implementation/SPLIT_SCREEN_SUBTITLES_LIMITATION.md) - Platform limitation research and recommendations - 2026-02-01 **NEW**
- [Emoji to Icons Migration Plan](implementation/EMOJI_TO_ICONS_MIGRATION_PLAN.md) - Replace 306+ emojis with @olorin/shared-icons - 2026-01-31 **NEW**
- Build Summaries
- Bug Fix Reports
- Frontend/Backend Updates
- Data Migration Notes
- Session Completion Reports
- Beta 500 Program Implementation

---

## 🎯 Key Technologies

### Backend
- **Python 3.11** + FastAPI
- **MongoDB Atlas** with Beanie ODM
- **Poetry** dependency management
- **Firebase Auth** for authentication
- **Olorin Services** for AI/ML

### Frontend Web
- **React 18** + TypeScript
- **Vite** build tool
- **Zustand** state management
- **TailwindCSS** styling
- **Glass UI** component library
- **i18next** for 10 languages

### Mobile
- **React Native** for iOS/Android
- **React Native for TV** for tvOS
- **StyleSheet** for styling
- **AsyncStorage** for persistence
- **React Navigation** for routing

### AI/ML
- **Anthropic Claude** (Sonnet 4.5, Haiku 3.5)
- **OpenAI** GPT-4, Embeddings
- **ElevenLabs** TTS/STT
- **MongoDB Atlas** Vector Search

### Testing
- **pytest** for backend (87%+ coverage)
- **Jest** + React Testing Library for frontend
- **Playwright** for web E2E
- **Detox** for mobile E2E

---

## 🚀 Quick Commands

### Backend
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Web
```bash
cd web
npm install
npm start  # Opens http://localhost:3000
```

### Mobile
```bash
cd mobile-app
npm install
npm run ios      # iOS Simulator
npm run android  # Android Emulator
```

### tvOS
```bash
cd tvos-app
npm install
npm run ios  # tvOS Simulator
```

### Documentation Portal
```bash
cd docs-portal
npm install
npm run dev  # Opens http://localhost:5173
```

---

## 📊 Documentation Statistics

- **Total Files:** 249 markdown files
- **Total Size:** 5.5 MB
- **Total Lines:** 126,605 lines
- **Categories:** 10 main categories
- **Languages:** Documentation in English (UI supports 10 languages)
- **Platforms:** Web, iOS, Android, tvOS
- **Last Major Update:** 2026-01-30 (Documentation Portal Launch)

---

## 🔍 Search & Discovery

### Documentation Portal
The fastest way to find documentation:
- Visit https://docs.bayitplus.com
- Use search (Cmd/Ctrl+K)
- Browse by category

### Local Search
```bash
# Search all docs
grep -r "keyword" docs/

# Search specific category
grep -r "keyword" docs/api/

# Use ripgrep for faster search
rg "keyword" docs/
```

### File Naming Conventions
- **Implementation:** `FEATURE_NAME_IMPLEMENTATION.md`
- **Guides:** `FEATURE_NAME_GUIDE.md`
- **API References:** `SERVICE_NAME_API_REFERENCE.md`
- **Reviews:** `FEATURE_REVIEW_DATE.md`
- **Summaries:** `FEATURE_SUMMARY.md`

---

## 🎨 Documentation Templates

Use these templates for new documentation:

- [Feature Template](templates/FEATURE_TEMPLATE.md) - Feature specifications
- [API Reference Template](templates/API_REFERENCE_TEMPLATE.md) - API documentation
- [Code Review Template](templates/CODE_REVIEW_TEMPLATE.md) - Code reviews
- [Implementation Summary Template](templates/IMPLEMENTATION_SUMMARY_TEMPLATE.md) - Implementation notes
- [User Guide Template](templates/USER_GUIDE_TEMPLATE.md) - User-facing guides

**Quality Standards:**
- Follow [Naming Conventions](templates/NAMING_CONVENTIONS.md)
- Use [Documentation Quality Checklist](templates/DOCUMENTATION_QUALITY_CHECKLIST.md)
- All new docs must be indexed in this README

---

## 🌐 Multi-Platform Support

Bayit+ runs on 4 platforms with unified documentation:

| Platform | Documentation | Technology |
|----------|--------------|------------|
| **Web** | [Web Dev Guide](guides/WEB_DEVELOPMENT_GUIDE.md) | React 18, Vite, TailwindCSS |
| **iOS** | [Mobile Dev Guide](guides/MOBILE_DEVELOPMENT_GUIDE.md) | React Native, iOS 16+ |
| **Android** | [Mobile Dev Guide](guides/MOBILE_DEVELOPMENT_GUIDE.md) | React Native, Android 10+ |
| **tvOS** | [tvOS Dev Guide](guides/TVOS_DEVELOPMENT_GUIDE.md) | React Native for TV, Focus Nav |

**Shared Infrastructure:**
- `@bayit/glass` - Glass UI component library
- `@olorin/shared-i18n` - 10-language internationalization
- MongoDB Atlas database (64+ collections)
- Firebase Auth authentication
- Google Cloud infrastructure

---

## 🛠️ Contributing

**Before Contributing:**
1. Read [Contributing Guide](guides/CONTRIBUTING.md)
2. Use appropriate [documentation templates](templates/)
3. Follow [naming conventions](templates/NAMING_CONVENTIONS.md)
4. Update this index when adding new docs
5. Test code examples in documentation

**Code Standards:**
- All code fully functional (no stubs/mocks/TODOs)
- No hardcoded values (use configuration)
- 87%+ test coverage required
- All files under 200 lines
- Google Cloud Secret Manager for secrets

---

## 🆘 Support

**Documentation Issues:**
- Report at: https://github.com/bayit-plus/issues
- Email: support@bayitplus.com
- Community: community.bayitplus.com

**Emergency Contact:**
- Critical issues: emergency@bayitplus.com

---

## Recent Updates

**2026-02-02: HLS Subtitles for Apple TV/AirPlay**
- Comprehensive implementation guide for HLS-compatible subtitles
- Browser playback (HLS.js) and Apple TV AirPlay casting support
- Proper HLS subtitle playlist architecture (.m3u8 wrappers)
- 10 languages with WebVTT format and absolute URLs
- Google Cloud Storage deployment with CORS and caching headers
- Testing procedures for both platforms

**2026-02-02: MongoDB SSL Connection Fix**
- Fixed MongoDB Atlas SSL connection errors on macOS with Python 3.13+
- Added explicit TLS/SSL configuration to olorin-shared MongoDB client
- Created diagnostic tool for troubleshooting SSL issues
- Documented environment variable options for TLS settings
- Updated documentation with security best practices

**2026-02-01: Beta 500 User Manual v2.0**
- Complete rewrite of Beta 500 User Manual with accurate information
- Corrected credit allocation (5,000 credits, not 500)
- Added comprehensive testing guidelines for beta testers
- Documented all 4 AI features: AI Search, AI Recommendations, Live Dubbing, Auto Catch-Up
- Added credit acquisition methods (bonuses, milestones, referrals, emergency requests)
- Included features not available in beta
- Added troubleshooting guide with error codes
- Privacy and data handling documentation

**2026-02-01: Real EPG Integration (Schedules Direct)**
- Added Schedules Direct API integration for real TV schedule data
- Israel Plus channel now has 146 real EPG entries
- Total 739 EPG entries across 6 channels from real sources:
  - TVmaze API: CNN, ABC News, King 5 News (NBC)
  - i24news API: i24NEWS Hebrew, i24NEWS English
  - Schedules Direct: Israel Plus
- Created ingest scripts for automated EPG updates

**2026-01-31: Emoji to Icons Migration Plan**
- Comprehensive migration plan to replace 306+ emojis with @olorin/shared-icons
- 28 new icons identified for registry extension
- 84 files across web, mobile, tvOS, and backend
- 5-week implementation timeline

**2026-01-30: Documentation Portal Launch**
- ✅ VitePress portal deployed at https://docs.bayitplus.com
- ✅ Glass UI theme with glassmorphism design
- ✅ Local search with Cmd/Ctrl+K shortcuts
- ✅ Feedback widget on all pages
- ✅ Plausible Analytics integration
- ✅ 3 AI documentation guides published
- ✅ 9 critical documentation files created

**2026-01-29: Beta 500 Program**
- Beta 500 closed beta program implementation
- 500 AI credits per user
- AI Search, AI Recommendations, Auto Catch-Up
- Comprehensive user manual published

**2026-01-25: Admin Pages Rebuild**
- Content admin pages refactored
- Security improvements
- i18n and accessibility enhancements

**2026-01-13: Documentation Organization**
- Moved 88 root-level files to proper subdirectories
- Created logical category structure
- Improved discoverability

---

## 📜 License

MIT License - Copyright © 2026 Bayit+

---

**Document Status:** Production Ready
**Last Updated:** 2026-02-02
**Maintained by:** Documentation Team
**Next Review:** 2026-02-15
