# Documentation Naming Conventions

**Version:** 1.0
**Last Updated:** 2026-01-30

This document defines naming standards for all documentation files in the Bayit+ project.

---

## General Rules

### File Names

**Format:** `CATEGORY_NAME_TYPE.md`

- **All UPPERCASE** with underscores separating words
- **Descriptive** - name should indicate content
- **Unique** - no duplicate names across directories
- **No special characters** except underscores
- **No spaces** - use underscores instead

**Examples:**
```
✅ FEATURE_NAME_IMPLEMENTATION.md
✅ API_REFERENCE_BETA_500.md
✅ CODE_REVIEW_2026-01-30.md
✅ USER_GUIDE_AI_SEARCH.md

❌ feature-name.md (lowercase)
❌ My Feature Guide.md (spaces)
❌ guide.md (not descriptive)
❌ feature@v2.md (special characters)
```

### Date Format

When including dates in file names:

**Format:** `YYYY-MM-DD`

**Examples:**
```
✅ CODE_REVIEW_2026-01-30.md
✅ SESSION_SUMMARY_2026-01-28.md
✅ DEPLOYMENT_LOG_2026-01-15.md

❌ CODE_REVIEW_01-30-2026.md (wrong order)
❌ SESSION_SUMMARY_28-01-2026.md (wrong format)
```

---

## Document Type Suffixes

### Feature Documentation

**Pattern:** `FEATURE_NAME_[TYPE].md`

**Types:**
- `_PLAN.md` - Feature planning document
- `_IMPLEMENTATION.md` - Implementation summary
- `_GUIDE.md` - User guide
- `_SPECIFICATION.md` - Technical specification
- `_STATUS.md` - Status update

**Examples:**
```
BETA_500_PLAN.md
BETA_500_IMPLEMENTATION.md
BETA_500_USER_GUIDE.md
BETA_500_SPECIFICATION.md
BETA_500_STATUS.md
```

### API Documentation

**Pattern:** `[SERVICE]_API_[TYPE].md`

**Types:**
- `_REFERENCE.md` - Complete API reference
- `_EXAMPLES.md` - Code examples
- `_GUIDE.md` - Integration guide

**Examples:**
```
CHANNEL_CHAT_API_REFERENCE.md
VOICE_API_REFERENCE.md
AI_API_EXAMPLES.md
PAYMENT_API_GUIDE.md
```

### Code Reviews

**Pattern:** `[FEATURE]_[TYPE]_REVIEW_[DATE].md`

**Types:**
- `CODE_REVIEW` - Code review
- `SECURITY_REVIEW` - Security audit
- `ARCHITECTURE_REVIEW` - Architecture review
- `PERFORMANCE_REVIEW` - Performance review

**Examples:**
```
BETA_500_CODE_REVIEW_2026-01-30.md
CHANNEL_CHAT_SECURITY_REVIEW_2026-01-29.md
AI_AGENT_ARCHITECTURE_REVIEW_2026-01-28.md
VOICE_API_PERFORMANCE_REVIEW_2026-01-27.md
```

### Implementation Summaries

**Pattern:** `[FEATURE]_IMPLEMENTATION_[STATUS].md`

**Status Options:**
- `_COMPLETE.md` - Implementation finished
- `_PROGRESS.md` - In progress
- `_SUMMARY.md` - Summary report

**Examples:**
```
BETA_500_IMPLEMENTATION_COMPLETE.md
CHANNEL_CHAT_IMPLEMENTATION_PROGRESS.md
AI_SEARCH_IMPLEMENTATION_SUMMARY.md
```

### Phase Reports

**Pattern:** `PHASE_[NUMBER]_[DESCRIPTION].md`

**Examples:**
```
PHASE_1_BACKEND_COMPLETE.md
PHASE_2_FRONTEND_PROGRESS.md
PHASE_3_TESTING_STATUS.md
PHASE_4_DEPLOYMENT_READY.md
```

### Deployment Documentation

**Pattern:** `[FEATURE]_[TYPE].md`

**Types:**
- `_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `_DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `_PRODUCTION_READY.md` - Production readiness report
- `_ROLLBACK_PLAN.md` - Rollback procedures

**Examples:**
```
BETA_500_DEPLOYMENT_GUIDE.md
CHANNEL_CHAT_DEPLOYMENT_CHECKLIST.md
AI_AGENT_PRODUCTION_READY.md
VOICE_API_ROLLBACK_PLAN.md
```

### Security Documentation

**Pattern:** `[FEATURE]_SECURITY_[TYPE].md`

**Types:**
- `_AUDIT.md` - Security audit
- `_ASSESSMENT.md` - Security assessment
- `_FIXES.md` - Security fixes applied
- `_REVIEW.md` - Security review

**Examples:**
```
BETA_500_SECURITY_AUDIT.md
CHANNEL_CHAT_SECURITY_ASSESSMENT.md
AI_API_SECURITY_FIXES.md
VOICE_API_SECURITY_REVIEW.md
```

### Testing Documentation

**Pattern:** `[FEATURE]_[TYPE]_[TEST_TYPE].md`

**Test Types:**
- `_TESTING_STRATEGY.md` - Testing approach
- `_TESTING_REPORT.md` - Test results
- `_TEST_PLAN.md` - Test plan
- `_TEST_COVERAGE.md` - Coverage report

**Examples:**
```
BETA_500_TESTING_STRATEGY.md
CHANNEL_CHAT_TESTING_REPORT.md
AI_SEARCH_TEST_PLAN.md
VOICE_API_TEST_COVERAGE.md
```

### Architecture Documentation

**Pattern:** `[COMPONENT]_ARCHITECTURE.md`

**Examples:**
```
UNIFIED_VOICE_ARCHITECTURE.md
AI_AGENT_ARCHITECTURE.md
DATABASE_ARCHITECTURE.md
MICROSERVICES_ARCHITECTURE.md
```

### Google Cloud Secrets

**Pattern:** `GCLOUD_SECRETS_[FEATURE].md`

**Examples:**
```
GCLOUD_SECRETS_BETA_500.md
GCLOUD_SECRETS_CHANNEL_CHAT.md
GCLOUD_SECRETS_CATCH_UP.md
GCLOUD_SECRETS_SIMPLIFIED_HEBREW.md
```

### Migration Documentation

**Pattern:** `[FEATURE]_MIGRATION_[TYPE].md`

**Types:**
- `_GUIDE.md` - Migration instructions
- `_COMPLETE.md` - Migration completion report
- `_PLAN.md` - Migration planning

**Examples:**
```
VOICE_MIGRATION_GUIDE.md
NOTIFICATION_MIGRATION_COMPLETE.md
DATABASE_MIGRATION_PLAN.md
```

### Session Summaries

**Pattern:** `SESSION_SUMMARY_[DATE].md`

**Examples:**
```
SESSION_SUMMARY_2026-01-30.md
SESSION_SUMMARY_2026-01-28.md
SESSION3_EXECUTIVE_SUMMARY.md
```

---

## Directory Structure

### Root Level

```
docs/
├── README.md                    # Main documentation index
├── DOCUMENTATION_INDEX.md       # Detailed category index
└── CHANGELOG.md                 # Project changelog
```

**Only these 3 files allowed in /docs/ root.**

### Subdirectories

```
docs/
├── api/                         # API documentation
│   ├── API_OVERVIEW.md
│   └── [SERVICE]_API_REFERENCE.md
│
├── architecture/                # System architecture
│   └── [COMPONENT]_ARCHITECTURE.md
│
├── archive/                     # Archived documentation
│   ├── plans/                   # Old plans
│   ├── phase-reports/           # Old phase reports
│   └── implementation-summaries/ # Old summaries
│
├── beta/                        # Beta program documentation
│   └── PHASE_[N]_[NAME].md
│
├── deployment/                  # Deployment guides
│   ├── [FEATURE]_DEPLOYMENT_GUIDE.md
│   └── GCLOUD_SECRETS_[FEATURE].md
│
├── features/                    # Feature documentation
│   └── [FEATURE]_[TYPE].md
│
├── guides/                      # User and developer guides
│   ├── [TOPIC]_GUIDE.md
│   └── [TOPIC]_MANUAL.md
│
├── implementation/              # Implementation summaries
│   └── [FEATURE]_IMPLEMENTATION_[STATUS].md
│
├── migrations/                  # Migration documentation
│   └── [FEATURE]_MIGRATION_[TYPE].md
│
├── operations/                  # Operational documentation
│   └── [OPERATION]_[TYPE].md
│
├── plans/                       # Planning documents
│   └── [FEATURE]_PLAN_V[N].md
│
├── reviews/                     # Code reviews and audits
│   └── [FEATURE]_[TYPE]_REVIEW_[DATE].md
│
├── security/                    # Security documentation
│   └── [FEATURE]_SECURITY_[TYPE].md
│
├── technical/                   # Technical documentation
│   └── [TOPIC]_[TYPE].md
│
├── templates/                   # Documentation templates
│   ├── FEATURE_TEMPLATE.md
│   ├── API_REFERENCE_TEMPLATE.md
│   ├── CODE_REVIEW_TEMPLATE.md
│   ├── IMPLEMENTATION_SUMMARY_TEMPLATE.md
│   └── USER_GUIDE_TEMPLATE.md
│
├── testing/                     # Testing documentation
│   └── [FEATURE]_[TYPE]_[TEST_TYPE].md
│
└── troubleshooting/             # Troubleshooting guides
    └── [TOPIC]_TROUBLESHOOTING.md
```

---

## Special Cases

### Version Numbers

For documents with multiple versions:

**Pattern:** `[NAME]_V[N].md` or `[NAME]_VERSION_[N].md`

**Examples:**
```
TRIVIA_FEATURE_PLAN_V8.md
API_SPECIFICATION_VERSION_2.md
```

**Archive old versions:**
```
docs/archive/plans/trivia-versions/
├── TRIVIA_FEATURE_PLAN_V2.md
├── TRIVIA_FEATURE_PLAN_V3.md
├── TRIVIA_FEATURE_PLAN_V4.md
├── TRIVIA_FEATURE_PLAN_V5.md
├── TRIVIA_FEATURE_PLAN_V6.md
└── TRIVIA_FEATURE_PLAN_V7.md
```

### Signoff Reports

**Pattern:** `[FEATURE]_[PLAN]_SIGNOFF_REPORT.md`

**Examples:**
```
TRIVIA_FEATURE_V8_SIGNOFF_REPORT.md
BETA_500_PLAN_SIGNOFF_REPORT.md
```

### Quick Reference

For quick start or quick reference docs:

**Pattern:** `[TOPIC]_QUICKREF.md` or `[TOPIC]_QUICK_START.md`

**Examples:**
```
API_QUICKREF.md
DEPLOYMENT_QUICK_START.md
APPSTORE_QUICKREF.md
```

### Platform-Specific

For platform-specific documentation:

**Pattern:** `[FEATURE]_[PLATFORM].md` or `[PLATFORM]_[TOPIC].md`

**Examples:**
```
AI_INTEGRATION_WEB.md
AI_INTEGRATION_MOBILE.md
AI_INTEGRATION_TVOS.md

IOS_DEVICE_BUILD_GUIDE.md
ANDROID_IMPLEMENTATION_STATUS.md
TVOS_DEVELOPMENT_GUIDE.md
```

---

## README Files

### README.md (Directory Index)

Every subdirectory should have a `README.md` that:

- Explains the directory's purpose
- Lists key documents
- Provides navigation links

**Example:** `docs/api/README.md`

```markdown
# API Documentation

Complete API reference for all Bayit+ services.

## Available APIs

- [AI Search API](AI_API_REFERENCE.md)
- [Channel Chat API](CHANNEL_CHAT_API_REFERENCE.md)
- [Voice API](VOICE_API_REFERENCE.md)
- [Payment API](PAYMENT_API_REFERENCE.md)

## Getting Started

See the [API Overview](API_OVERVIEW.md) for authentication and common patterns.
```

---

## Deprecated Documents

### Marking as Deprecated

**Pattern:** `[DEPRECATED]_[ORIGINAL_NAME].md`

**Example:**
```
[DEPRECATED]_OLD_PAYMENT_API.md
```

**Or add to archive:**
```
docs/archive/deprecated/
└── OLD_PAYMENT_API.md
```

### Deprecation Notice

Add to top of document:

```markdown
# [Document Title]

**⚠️ DEPRECATED:** This document is outdated. See [New Document](../new/DOCUMENT.md) instead.

**Deprecation Date:** 2026-01-30
**Reason:** [Reason for deprecation]
**Replacement:** [Link to replacement document]

---

[Original content...]
```

---

## Acronyms and Abbreviations

### Common Acronyms

When using acronyms in file names, use standard forms:

| Acronym | Meaning | Example |
|---------|---------|---------|
| API | Application Programming Interface | `VOICE_API_REFERENCE.md` |
| AI | Artificial Intelligence | `AI_SEARCH_GUIDE.md` |
| UI | User Interface | `UI_COMPONENTS.md` |
| UX | User Experience | `UX_DESIGN_PRINCIPLES.md` |
| E2E | End-to-End | `E2E_TEST_EXECUTION_GUIDE.md` |
| CI/CD | Continuous Integration/Deployment | `CI_CD_PIPELINE.md` |
| VOD | Video on Demand | `VOD_CONTENT_MANAGEMENT.md` |
| EPG | Electronic Program Guide | `EPG_INTEGRATION.md` |
| i18n | Internationalization | `I18N_COMPLETE_GUIDE.md` |
| RTL | Right-to-Left | `RTL_LANGUAGE_SUPPORT.md` |

---

## Checklist

Before creating a new documentation file:

- [ ] File name is all UPPERCASE
- [ ] File name uses underscores (not spaces or hyphens)
- [ ] File name includes type suffix (e.g., `_GUIDE.md`)
- [ ] File name is descriptive (not generic)
- [ ] File placed in correct subdirectory (not root)
- [ ] Date format is YYYY-MM-DD (if applicable)
- [ ] No duplicate names in project
- [ ] Added to README.md index
- [ ] Added to DOCUMENTATION_INDEX.md

---

## Examples by Category

### Feature Documentation
```
✅ BETA_500_PLAN.md
✅ CHANNEL_CHAT_IMPLEMENTATION.md
✅ AI_SEARCH_USER_GUIDE.md
✅ VOICE_API_SPECIFICATION.md
```

### API Documentation
```
✅ AI_API_REFERENCE.md
✅ VOICE_API_EXAMPLES.md
✅ PAYMENT_API_GUIDE.md
```

### Reviews
```
✅ BETA_500_CODE_REVIEW_2026-01-30.md
✅ CHANNEL_CHAT_SECURITY_REVIEW_2026-01-29.md
```

### Deployment
```
✅ BETA_500_DEPLOYMENT_GUIDE.md
✅ GCLOUD_SECRETS_CHANNEL_CHAT.md
```

### Testing
```
✅ BETA_500_TESTING_STRATEGY.md
✅ AI_SEARCH_TEST_COVERAGE.md
```

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Documentation Team
