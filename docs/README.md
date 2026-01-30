# Bayit+ Documentation

**Last Updated:** 2026-01-30
**Total Documents:** 249 files
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

- [AI Features Overview](features/AI_FEATURES_OVERVIEW.md) - Complete AI catalog ⭐ **NEW**
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

- [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) - Production deployment
- [CI/CD Pipeline](deployment/CI_CD_PIPELINE.md) - GitHub Actions workflows
- [Secrets Management](deployment/SECRETS_MANAGEMENT.md) - Google Cloud secrets
- [LLM Configuration](deployment/LLM_CONFIGURATION.md) - AI model setup and cost optimization ⭐ **NEW**
- Firebase Hosting configuration
- Google Cloud Run setup

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

## 📅 Recent Updates

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

**Document Status:** ✅ Production Ready
**Last Updated:** 2026-01-30
**Maintained by:** Documentation Team
**Next Review:** 2026-02-15
