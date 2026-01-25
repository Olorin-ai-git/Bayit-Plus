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

### `/deployment/`
Deployment guides and status:
- Deployment completion reports
- Firebase deployment guides
- Upload status tracking
- Infrastructure configuration

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
- **UI/UX Implementations**:
  - `MISSING_ASSETS_IMPLEMENTATION.md` - Complete technical specification for missing asset fixes
  - `MISSING_ASSETS_SUMMARY.md` - Executive summary of missing assets implementation

### `/operations/`
Database operations and maintenance:
- Series merges and deduplication
- Content organization operations
- Database maintenance tasks
- Data cleanup operations

### `/reviews/`
Code reviews and assessments:
- Multi-language portal MongoDB assessment
- Security audits
- Performance reviews
- Data architecture assessments

## 🗂️ Additional Documentation Locations

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
1. Read `/QUICK_START_GUIDE.md` (project root)
2. Backend setup: `/backend/QUICKSTART.md`
3. Development: `/backend/README.md`

### Key Features
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
