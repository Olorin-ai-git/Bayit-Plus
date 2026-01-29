# Olorin Ecosystem-Wide Secrets Migration Plan

## Date: 2026-01-28

## Executive Summary

Migrate ALL Olorin platforms from hardcoded secrets to Google Cloud Secret Manager as the single source of truth. This plan addresses the base platform (`olorin-infra`) and all subplatforms (Bayit+, Fraud Detection, CVPlus, Portals).

---

## Architecture: Ecosystem-Wide Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   GOOGLE CLOUD SECRET MANAGER                               │
│                   (Single Source of Truth - ALL Platforms)                  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BASE PLATFORM SECRETS (olorin-infra)                                │   │
│  │  - Shared AI services: ANTHROPIC, OPENAI, ELEVENLABS                 │   │
│  │  - Shared infrastructure: PINECONE, SENTRY                           │   │
│  │  - Core platform: SECRET_KEY, PARTNER_API_KEY_SALT                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BAYIT+ PLATFORM SECRETS                                             │   │
│  │  - Database: bayit-mongodb-uri, station-ai-mongodb-uri               │   │
│  │  - Payments: Stripe keys                                             │   │
│  │  - Content: TMDB, OpenSubtitles (Bayit+-specific)                    │   │
│  │  - Voice: Picovoice, ElevenLabs voice IDs                            │   │
│  │  - Mobile: Apple developer keys                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FRAUD DETECTION PLATFORM SECRETS                                    │   │
│  │  - Database: fraud-mongodb-uri                                       │   │
│  │  - Analytics: Snowflake credentials                                  │   │
│  │  - Platform-specific services                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  CVPLUS PLATFORM SECRETS                                             │   │
│  │  - Database: cvplus-mongodb-uri                                      │   │
│  │  - Firebase: CVPlus-specific config                                  │   │
│  │  - Platform-specific services                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  PORTALS PLATFORM SECRETS                                            │   │
│  │  - EmailJS: Contact form credentials (if needed)                     │   │
│  │  - Analytics: GA tracking IDs (if used)                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                           ▲
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          │                │                │
┌─────────▼─────┐  ┌───────▼──────┐  ┌─────▼────────┐  ┌─────▼────────┐
│ Bayit+        │  │ Fraud        │  │ CVPlus       │  │ Portals      │
│ Deployments   │  │ Deployments  │  │ Deployments  │  │ Deployments  │
│               │  │              │  │              │  │              │
│ - Backend     │  │ - Backend    │  │ - Backend    │  │ - Portal 1   │
│ - Mobile      │  │ - Frontend   │  │ - Frontend   │  │ - Portal 2   │
│ - tvOS        │  │              │  │              │  │ - Portal 3   │
│ - Web         │  │              │  │              │  │ - Portal 4   │
└───────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Principles

### 1. No Shared Credentials
- Each platform has its own isolated secrets
- Example: Bayit+ uses `bayit-anthropic-api-key`, Fraud uses `fraud-anthropic-api-key`
- Prevents cross-platform compromise

### 2. Base Platform = Truly Shared Only
- Move platform-specific secrets OUT of `olorin-infra/.env`
- Keep only genuinely shared secrets (if any)
- **User Note**: TMDB_API_KEY should move to Bayit+ only (not needed by other platforms)

### 3. Environment-Specific
- Development: Local .env files with dev placeholders
- Production: Google Cloud Secret Manager only

### 4. Least Privilege
- Each service account accesses only its required secrets
- No cross-platform secret access

---

## Implementation Phases

### Phase 1: Base Platform Migration (PRIORITY 1)

**Impact**: ALL platforms
**Timeline**: 1 day
**Risk**: CRITICAL - affects all deployments

#### Step 1.1: Audit and Categorize Base Platform Secrets

**Analyze `/olorin-infra/.env`** and categorize each secret:

| Secret | Category | Action |
|--------|----------|--------|
| `ANTHROPIC_API_KEY` | Shared AI | Create per-platform keys |
| `OPENAI_API_KEY` | Shared AI | Create per-platform keys |
| `ELEVENLABS_API_KEY` | Shared AI | Create per-platform keys |
| `PINECONE_API_KEY` | Shared Vector DB | Create per-platform keys |
| `SECRET_KEY` | Platform Core | Keep shared or per-platform? |
| `PARTNER_API_KEY_SALT` | Platform Core | Keep shared (used for partner API generation) |
| `MONGODB_URI` | Platform-Specific | Move to Bayit+ only |
| `TMDB_API_KEY` | Platform-Specific | Move to Bayit+ only ✅ (user confirmed) |
| `TMDB_API_TOKEN` | Platform-Specific | Move to Bayit+ only |
| `OPENSUBTITLES_API_KEY` | Platform-Specific | Move to Bayit+ only |
| `SENTRY_DSN` | Shared Monitoring | Create per-platform DSNs |

**Decision Matrix**:
- **Truly Shared** (keep in base): `PARTNER_API_KEY_SALT`, possibly `SECRET_KEY`
- **Platform-Specific** (move to platform): All database URIs, TMDB, OpenSubtitles
- **Should Be Isolated** (create separate): AI service keys, Pinecone, Sentry

#### Step 1.2: Create Platform-Specific API Keys

**For each platform**, create isolated API keys:

```bash
# Bayit+ AI Keys
echo -n 'NEW_BAYIT_ANTHROPIC_KEY' | gcloud secrets create bayit-anthropic-api-key --data-file=-
echo -n 'NEW_BAYIT_OPENAI_KEY' | gcloud secrets create bayit-openai-api-key --data-file=-
echo -n 'NEW_BAYIT_ELEVENLABS_KEY' | gcloud secrets create bayit-elevenlabs-api-key --data-file=-
echo -n 'NEW_BAYIT_PINECONE_KEY' | gcloud secrets create bayit-pinecone-api-key --data-file=-

# Fraud Detection AI Keys
echo -n 'NEW_FRAUD_ANTHROPIC_KEY' | gcloud secrets create fraud-anthropic-api-key --data-file=-
echo -n 'NEW_FRAUD_OPENAI_KEY' | gcloud secrets create fraud-openai-api-key --data-file=-
# (Fraud may not need all AI services - create only what's needed)

# CVPlus AI Keys
echo -n 'NEW_CVPLUS_OPENAI_KEY' | gcloud secrets create cvplus-openai-api-key --data-file=-
# (CVPlus may not need all AI services - create only what's needed)

# Sentry (separate DSNs per platform)
# Create new Sentry projects for each platform, then:
echo -n 'BAYIT_SENTRY_DSN' | gcloud secrets create bayit-sentry-dsn --data-file=-
echo -n 'FRAUD_SENTRY_DSN' | gcloud secrets create fraud-sentry-dsn --data-file=-
echo -n 'CVPLUS_SENTRY_DSN' | gcloud secrets create cvplus-sentry-dsn --data-file=-
```

**⚠️ IMPORTANT**: Request new API keys from each service provider. Do NOT reuse existing keys.

#### Step 1.3: Move Platform-Specific Secrets

**TMDB Keys** (Bayit+ only):
```bash
# Already exists in bayit-tmdb-api-key from initial implementation
# Remove from olorin-infra/.env
```

**MongoDB URIs**:
```bash
# Already created in initial implementation:
# - bayit-mongodb-uri (Bayit+ main)
# - station-ai-mongodb-uri (Israeli Radio)
# - olorin-fraud-mongodb-uri (Fraud Detection)
# - cvplus-mongodb-uri (CVPlus)
```

**OpenSubtitles** (Bayit+ only):
```bash
echo -n 'EXISTING_OPENSUBTITLES_KEY' | gcloud secrets create bayit-opensubtitles-api-key --data-file=-
```

#### Step 1.4: Update Base Platform .env

**File**: `/olorin-infra/.env`

**Replace** all hardcoded values with placeholders:

```bash
# ============================================
# OLORIN BASE PLATFORM CONFIGURATION
# ============================================
# IMPORTANT: Most secrets have been migrated to platform-specific configurations
# Only truly shared secrets remain here

# ============================================
# DATABASE (Platform-Specific - moved to individual platforms)
# ============================================
MONGODB_URI=<platform-specific:bayit-mongodb-uri>
MONGODB_DB_NAME=bayit_plus

# ============================================
# AI SERVICES (Platform-Specific - moved to individual platforms)
# ============================================
ANTHROPIC_API_KEY=<platform-specific:bayit-anthropic-api-key>
OPENAI_API_KEY=<platform-specific:bayit-openai-api-key>
ELEVENLABS_API_KEY=<platform-specific:bayit-elevenlabs-api-key>

# ============================================
# OLORIN PLATFORM CORE (Shared)
# ============================================
PINECONE_API_KEY=<platform-specific:bayit-pinecone-api-key>
PARTNER_API_KEY_SALT=<from-secret-manager:olorin-partner-api-key-salt>
SECRET_KEY=<from-secret-manager:olorin-secret-key>

# ============================================
# OLORIN PLATFORM FEATURES (Configuration - Not Secrets)
# ============================================
OLORIN_NLP_ENABLED=true
OLORIN_NLP_CONFIDENCE_THRESHOLD=0.7
OLORIN_NLP_MAX_COST_PER_QUERY=0.10
SPEECH_TO_TEXT_PROVIDER=elevenlabs
LIVE_TRANSLATION_PROVIDER=google

# ============================================
# THIRD-PARTY SERVICES (Platform-Specific - moved to Bayit+)
# ============================================
TMDB_API_KEY=<bayit-specific:bayit-tmdb-api-key>
TMDB_API_TOKEN=<bayit-specific:bayit-tmdb-api-token>
OPENSUBTITLES_API_KEY=<bayit-specific:bayit-opensubtitles-api-key>
SENTRY_DSN=<platform-specific:bayit-sentry-dsn>

# ============================================
# GOOGLE CLOUD PLATFORM (Configuration - Not Secrets)
# ============================================
GCP_PROJECT_ID=bayit-plus
GCS_BUCKET_NAME=bayit-plus-media-new
CDN_BASE_URL=https://cdn.bayit.tv
STORAGE_TYPE=gcs
GOOGLE_APPLICATION_CREDENTIALS=/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/credentials/bayit-plus-7c3927963c21.json
```

#### Step 1.5: Create Shared Secrets

**For truly shared secrets**:

```bash
# Platform-wide partner API salt
echo -n 'olorin_partner_salt_2024_bayit_plus_secure' | \
    gcloud secrets create olorin-partner-api-key-salt --data-file=-

# Platform-wide secret key (or create per-platform)
echo -n 'Bhz6aGssxUZws7s0k3wgpcu02RIvB_VP089Q0995iE0' | \
    gcloud secrets create olorin-secret-key --data-file=-
```

---

### Phase 2: Bayit+ Mobile/tvOS Migration (PRIORITY 2)

**Impact**: iOS and tvOS applications
**Timeline**: 1 day
**Risk**: HIGH - embedded in app binaries

#### Challenge: Native Apps Cannot Use Secret Manager Directly

**Problem**: React Native apps bundle .env values at build time. They cannot dynamically fetch from Secret Manager at runtime.

**Solutions**:

##### Option A: Build-Time Injection (Recommended)

**Approach**: Inject secrets during CI/CD build process

```yaml
# mobile-app/cloudbuild.yaml (NEW FILE)
steps:
  # Step 1: Fetch secrets from Secret Manager
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'fetch-secrets'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Fetch all required secrets
        SENTRY_DSN=$(gcloud secrets versions access latest --secret=bayit-sentry-dsn)
        ELEVENLABS_API_KEY=$(gcloud secrets versions access latest --secret=bayit-elevenlabs-api-key)
        PICOVOICE_ACCESS_KEY=$(gcloud secrets versions access latest --secret=picovoice-access-key)

        # Write to temporary .env file
        cat > mobile-app/.env <<EOF
        SENTRY_DSN=${SENTRY_DSN}
        ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
        PICOVOICE_ACCESS_KEY=${PICOVOICE_ACCESS_KEY}
        # ... other non-secret config ...
        EOF

  # Step 2: Build React Native app
  - name: 'node:18'
    dir: 'mobile-app'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm install
        npx react-native build-ios --configuration Release

  # Step 3: Archive and upload to App Store Connect
  # (Additional steps...)
```

**mobile-app/.env** (committed to repo):
```bash
# Bayit+ iOS Mobile App Environment Configuration
# PRODUCTION VALUES INJECTED AT BUILD TIME FROM SECRET MANAGER
# This file contains PLACEHOLDERS ONLY

# ============================================
# SECURITY NOTICE
# ============================================
# All sensitive values below are PLACEHOLDERS and will be replaced
# by Cloud Build during deployment using Google Cloud Secret Manager

# Sentry Error Tracking
SENTRY_DSN=<injected-at-build-time>
SENTRY_ENVIRONMENT=production

# AI Services
ELEVENLABS_API_KEY=<injected-at-build-time>

# Voice Features
PICOVOICE_ACCESS_KEY=<injected-at-build-time>

# ============================================
# PUBLIC CONFIGURATION (Safe to commit)
# ============================================
API_BASE_URL=https://api.bayitplus.com
APP_ENV=production
ENABLE_DEBUG_LOGGING=NO
ENABLE_VOICE_COMMANDS=true
ENABLE_WAKE_WORD=true
HLS_BASE_URL=https://cdn.bayit.tv
CDN_BASE_URL=https://cdn.bayit.tv
MAX_VIDEO_QUALITY=auto
CHROMECAST_RECEIVER_APP_ID=F79FF160
APPLE_KEY_ID=LMYW5G8928
APPLE_TEAM_ID=963B7732N5
APPLE_BUNDLE_ID=tv.bayit.plus
ENABLE_ANALYTICS=true
```

##### Option B: Backend Proxy (Alternative)

**Approach**: Never expose API keys in mobile apps

```
Mobile App → Backend Proxy → Third-Party Services
```

**Example**:
- Mobile app calls `https://api.bayitplus.com/voice/synthesize`
- Backend uses ElevenLabs API key server-side
- Mobile app never sees API key

**Trade-offs**:
- ✅ Maximum security (keys never in app binary)
- ❌ Requires backend changes
- ❌ Additional latency

**Recommendation**: Use **Option A (Build-Time Injection)** for now, migrate to **Option B (Backend Proxy)** for long-term security.

#### Step 2.1: Update Mobile App .env

Replace file with placeholder version shown above.

#### Step 2.2: Create Mobile Build Pipeline

Create `mobile-app/cloudbuild.yaml` with secret injection logic.

#### Step 2.3: Same for tvOS

Repeat for `tvos-app/.env` and `tvos-app/cloudbuild.yaml`.

---

### Phase 3: Fraud Detection Migration (PRIORITY 3)

**Impact**: Fraud Detection platform
**Timeline**: 0.5 days
**Risk**: MEDIUM - currently uses development config

#### Step 3.1: Create Production Secrets

```bash
# Fraud-specific AI keys (create new keys from providers)
echo -n 'NEW_FRAUD_ANTHROPIC_KEY' | gcloud secrets create fraud-anthropic-api-key --data-file=-
echo -n 'NEW_FRAUD_OPENAI_KEY' | gcloud secrets create fraud-openai-api-key --data-file=-

# Fraud database
echo -n 'mongodb+srv://...' | gcloud secrets create fraud-mongodb-uri --data-file=-

# Fraud JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(32))" | \
    gcloud secrets create fraud-jwt-secret-key --data-file=-

# Snowflake credentials (if needed for production)
# Note: Currently uses browser-based SSO, may not need secrets
```

#### Step 3.2: Create Fraud cloudbuild.yaml

Similar to Bayit+ backend cloudbuild.yaml.

#### Step 3.3: Update Fraud .env

Replace hardcoded development values with placeholders.

---

### Phase 4: CVPlus Migration (PRIORITY 4)

**Impact**: CVPlus platform
**Timeline**: 0.5 days
**Risk**: MEDIUM - currently uses development config

#### Step 4.1: Create Production Secrets

```bash
# CVPlus-specific AI keys
echo -n 'NEW_CVPLUS_OPENAI_KEY' | gcloud secrets create cvplus-openai-api-key --data-file=-

# CVPlus database (already created in initial implementation)
# cvplus-mongodb-uri

# CVPlus JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(32))" | \
    gcloud secrets create cvplus-jwt-secret-key --data-file=-

# Firebase configuration
echo -n 'FIREBASE_API_KEY' | gcloud secrets create cvplus-firebase-api-key --data-file=-
# ... other Firebase secrets ...
```

#### Step 4.2: Create CVPlus Backend cloudbuild.yaml

Firebase Functions deployment with secret references.

#### Step 4.3: Update CVPlus .env Files

Replace development placeholders with production secret references.

---

### Phase 5: Portals Migration (PRIORITY 5)

**Impact**: Portal websites
**Timeline**: 0.25 days
**Risk**: LOW - currently uses placeholders only

#### Step 5.1: Create Portal Secrets (if needed)

```bash
# EmailJS (if used for contact forms)
echo -n 'SERVICE_ID' | gcloud secrets create portals-emailjs-service-id --data-file=-
echo -n 'TEMPLATE_ID' | gcloud secrets create portals-emailjs-template-id --data-file=-
echo -n 'PUBLIC_KEY' | gcloud secrets create portals-emailjs-public-key --data-file=-

# Google Analytics (if used)
echo -n 'GA_TRACKING_ID' | gcloud secrets create portals-ga-tracking-id --data-file=-
```

#### Step 5.2: Update Portal .env Files

Replace `YOUR_SERVICE_ID_HERE` placeholders with secret references or keep as build-time injection.

---

## Secret Naming Convention (Ecosystem-Wide)

### Format
```
{platform}-{category}-{name}
```

### Examples

| Platform | Secret | Secret Manager Name |
|----------|--------|---------------------|
| Bayit+ | Anthropic API Key | `bayit-anthropic-api-key` |
| Fraud | Anthropic API Key | `fraud-anthropic-api-key` |
| CVPlus | OpenAI API Key | `cvplus-openai-api-key` |
| Olorin Base | Partner API Salt | `olorin-partner-api-key-salt` |
| All Portals | EmailJS Service ID | `portals-emailjs-service-id` |

### Platform Prefixes
- `bayit-*` - Bayit+ streaming platform
- `fraud-*` - Fraud Detection platform
- `cvplus-*` - CVPlus platform
- `portals-*` - All portal websites (shared)
- `olorin-*` - Base platform (truly shared only)

---

## Deployment Methods by Platform

### Bayit+
- **Backend**: Cloud Build → Cloud Run (Secret Manager injection)
- **Mobile**: Cloud Build → App Store Connect (build-time injection)
- **tvOS**: Cloud Build → App Store Connect (build-time injection)
- **Web**: Cloud Build → Firebase Hosting (build-time injection)

### Fraud Detection
- **Backend**: Cloud Build → Cloud Run (Secret Manager injection)
- **Frontend**: Vercel/Netlify with environment variables from Secret Manager

### CVPlus
- **Backend**: Firebase Functions deployment (Secret Manager integration)
- **Frontend**: Firebase Hosting (build-time injection)

### Portals
- **Static Sites**: Firebase Hosting (build-time injection)

---

## Verification and Testing

### For Each Platform

1. **Validate Secrets Exist**:
   ```bash
   ./scripts/deployment/validate_secrets.sh --platform bayit
   ./scripts/deployment/validate_secrets.sh --platform fraud
   ./scripts/deployment/validate_secrets.sh --platform cvplus
   ```

2. **Test Deployment**:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

3. **Verify Application Startup**:
   - Check service logs
   - Verify API connections
   - Test authentication
   - Confirm no placeholder values in logs

4. **Security Audit**:
   - Scan .env files for hardcoded secrets
   - Verify secret access logs
   - Test service account permissions

---

## Rollback Procedures

### Phase-Specific Rollback

If any phase fails:

1. **Keep old API keys active** (don't rotate immediately)
2. **Revert configuration changes** via git
3. **Redeploy previous working version**
4. **Investigate failure** before retrying

### Emergency Rollback

If production is down:

```bash
# Revert to last known good deployment
gcloud run services update SERVICE_NAME \
    --image=gcr.io/PROJECT/IMAGE:LAST_WORKING_TAG \
    --region=REGION
```

---

## Timeline Summary

| Phase | Platform | Duration | Dependencies |
|-------|----------|----------|--------------|
| Phase 1 | Base Platform | 1 day | None |
| Phase 2 | Bayit+ Mobile/TV | 1 day | Phase 1 |
| Phase 3 | Fraud Detection | 0.5 days | Phase 1 |
| Phase 4 | CVPlus | 0.5 days | Phase 1 |
| Phase 5 | Portals | 0.25 days | Phase 1 |
| **TOTAL** | | **3.25 days** | |

**Recommended**: Execute phases sequentially with 1-day buffer between each for validation.

**Total Project Duration**: 2 weeks (including validation and testing)

---

## Success Criteria (Ecosystem-Wide)

✅ All secrets in Google Cloud Secret Manager
✅ No hardcoded secrets in any .env file across all platforms
✅ Each platform uses isolated API keys (no sharing)
✅ Automated secret validation for all platforms
✅ All platforms deployed and operational
✅ Secret access logging enabled
✅ Compliance requirements met
✅ Team trained on new secret management process

---

## Next Steps

1. **Review this plan with stakeholders**
2. **Get approval for API key rotation** (requires coordination with service providers)
3. **Schedule maintenance windows** (if needed)
4. **Execute Phase 1** (Base Platform)
5. **Validate and proceed to subsequent phases**

---

**Plan Created By**: Claude Sonnet 4.5
**Date**: 2026-01-28
**Estimated Effort**: 3.25 days execution + 1.5 days validation = 5 days total
**Priority**: **P0 - Critical Security Issue**
