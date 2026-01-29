# Secrets and Environment Variables Comprehensive Audit

**Date**: 2026-01-28
**Auditor**: Claude Code
**Scope**: All deployment configurations for Bayit+ backend

---

## Executive Summary

**CRITICAL FINDING**: `cloudbuild.yaml` only references 3 secrets in its `--update-secrets` flag, but the Cloud Run service uses **60+ secrets**. This means Cloud Build deployments rely on secrets from previous `deploy_server.sh` runs rather than managing secrets independently.

**Impact**: Cloud Build deployments via `backend/cloudbuild.yaml` will fail if secrets haven't been previously created by `deploy_server.sh`.

**Recommendation**: Update `cloudbuild.yaml` to reference all required secrets in the `--update-secrets` flag to make Cloud Build deployments self-sufficient.

---

## Configuration Sources Analyzed

| Source | Type | Count | Purpose |
|--------|------|-------|---------|
| **backend/.env** | Environment Variables | 120+ | Local development configuration |
| **Google Cloud Secret Manager** | Secrets | 118 | Production secrets storage |
| **deploy_server.sh** | Secret Creation Script | 72+ | Creates/updates secrets in GCP |
| **cloudbuild.yaml** | Cloud Build Configuration | 3 | Automated deployment config |
| **Cloud Run Service** | Live Service Configuration | 60+ | Production service configuration |
| **deploy_all.sh** | Orchestration Script | N/A | Coordinates deployment |

---

## Secrets Created by deploy_server.sh (72 total)

### Authentication & Security
1. `bayit-secret-key` ← SECRET_KEY
2. `bayit-google-client-id` ← GOOGLE_CLIENT_ID
3. `bayit-google-client-secret` ← GOOGLE_CLIENT_SECRET
4. `google-redirect-uri` ← GOOGLE_REDIRECT_URI

### Database
5. `bayit-mongodb-url` ← MONGODB_URI
6. `bayit-mongodb-db-name` ← MONGODB_DB_NAME
7. `station-ai-mongodb-url` ← STATION_AI_MONGODB_URI
8. `station-ai-mongodb-db-name` ← STATION_AI_MONGODB_DB_NAME

### Payment Processing (Stripe)
9. `bayit-stripe-api-key` ← STRIPE_API_KEY
10. `bayit-stripe-secret-key` ← STRIPE_SECRET_KEY
11. `bayit-stripe-webhook-secret` ← STRIPE_WEBHOOK_SECRET
12. `bayit-stripe-price-basic` ← STRIPE_PRICE_BASIC
13. `bayit-stripe-price-premium` ← STRIPE_PRICE_PREMIUM
14. `bayit-stripe-price-family` ← STRIPE_PRICE_FAMILY

### AI Services
15. `bayit-openai-api-key` ← OPENAI_API_KEY
16. `bayit-anthropic-api-key` ← ANTHROPIC_API_KEY
17. `bayit-elevenlabs-api-key` ← ELEVENLABS_API_KEY

### Content Metadata
18. `tmdb-api-key` ← TMDB_API_KEY
19. `tmdb-api-token` ← TMDB_API_TOKEN
20. `opensubtitles-api-key` ← OPENSUBTITLES_API_KEY

### Communications
21. `bayit-twilio-account-sid` ← TWILIO_ACCOUNT_SID
22. `bayit-twilio-auth-token` ← TWILIO_AUTH_TOKEN
23. `bayit-twilio-phone-number` ← TWILIO_PHONE_NUMBER

### Voice & Audio
24. `picovoice-access-key` ← PICOVOICE_ACCESS_KEY

### Monitoring
25. `bayit-sentry-dsn` ← SENTRY_DSN

### Podcast Translation
26. `podcast-translation-enabled` ← PODCAST_TRANSLATION_ENABLED
27. `podcast-translation-auto-start` ← PODCAST_TRANSLATION_AUTO_START

### Librarian (AI Agent) Configuration (28-40)
28. `bayit-librarian-daily-audit-cron` ← LIBRARIAN_DAILY_AUDIT_CRON
29. `bayit-librarian-daily-audit-time` ← LIBRARIAN_DAILY_AUDIT_TIME
30. `bayit-librarian-daily-audit-mode` ← LIBRARIAN_DAILY_AUDIT_MODE
31. `bayit-librarian-daily-audit-cost` ← LIBRARIAN_DAILY_AUDIT_COST
32. `bayit-librarian-daily-audit-status` ← LIBRARIAN_DAILY_AUDIT_STATUS
33. `bayit-librarian-daily-audit-description` ← LIBRARIAN_DAILY_AUDIT_DESCRIPTION
34. `bayit-librarian-weekly-audit-cron` ← LIBRARIAN_WEEKLY_AUDIT_CRON
35. `bayit-librarian-weekly-audit-time` ← LIBRARIAN_WEEKLY_AUDIT_TIME
36. `bayit-librarian-weekly-audit-mode` ← LIBRARIAN_WEEKLY_AUDIT_MODE
37. `bayit-librarian-weekly-audit-cost` ← LIBRARIAN_WEEKLY_AUDIT_COST
38. `bayit-librarian-weekly-audit-status` ← LIBRARIAN_WEEKLY_AUDIT_STATUS
39. `bayit-librarian-weekly-audit-description` ← LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION
40. `bayit-librarian-max-iterations` ← LIBRARIAN_MAX_ITERATIONS
41. `bayit-librarian-default-budget-usd` ← LIBRARIAN_DEFAULT_BUDGET_USD
42. `bayit-librarian-min-budget-usd` ← LIBRARIAN_MIN_BUDGET_USD
43. `bayit-librarian-max-budget-usd` ← LIBRARIAN_MAX_BUDGET_USD
44. `bayit-librarian-budget-step-usd` ← LIBRARIAN_BUDGET_STEP_USD
45. `bayit-librarian-reports-limit` ← LIBRARIAN_REPORTS_LIMIT
46. `bayit-librarian-actions-limit` ← LIBRARIAN_ACTIONS_LIMIT
47. `bayit-librarian-activity-page-size` ← LIBRARIAN_ACTIVITY_PAGE_SIZE
48. `bayit-librarian-id-truncate-length` ← LIBRARIAN_ID_TRUNCATE_LENGTH
49. `bayit-librarian-modal-max-height` ← LIBRARIAN_MODAL_MAX_HEIGHT

### Series Linker Configuration (50-54)
50. `bayit-series-linker-title-similarity` ← SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD
51. `bayit-series-linker-auto-link-confidence` ← SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD
52. `bayit-series-linker-batch-size` ← SERIES_LINKER_AUTO_LINK_BATCH_SIZE
53. `bayit-series-linker-duplicate-strategy` ← SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY
54. `bayit-series-linker-create-missing` ← SERIES_LINKER_CREATE_MISSING_SERIES

### Judaism Section Configuration (55-65)
55. `bayit-jewish-news-cache-ttl` ← JEWISH_NEWS_CACHE_TTL_MINUTES
56. `bayit-jewish-news-sync-interval` ← JEWISH_NEWS_SYNC_INTERVAL_MINUTES
57. `bayit-jewish-news-timeout` ← JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS
58. `bayit-hebcal-api-url` ← HEBCAL_API_BASE_URL
59. `bayit-sefaria-api-url` ← SEFARIA_API_BASE_URL
60. `bayit-jewish-calendar-cache-ttl` ← JEWISH_CALENDAR_CACHE_TTL_HOURS
61. `bayit-community-search-radius` ← COMMUNITY_SEARCH_RADIUS_MILES
62. `bayit-community-default-region` ← COMMUNITY_DEFAULT_REGION
63. `bayit-us-jewish-regions` ← US_JEWISH_REGIONS
64. `bayit-community-scrape-interval` ← COMMUNITY_SCRAPE_INTERVAL_HOURS
65. `bayit-yutorah-rss-url` ← YUTORAH_RSS_URL
66. `bayit-chabad-multimedia-rss-url` ← CHABAD_MULTIMEDIA_RSS_URL
67. `bayit-torahanytime-rss-url` ← TORAHANYTIME_RSS_URL

### Apple Push Notifications (68-71)
68. `bayit-apple-key-id` ← APPLE_KEY_ID
69. `bayit-apple-team-id` ← APPLE_TEAM_ID
70. `bayit-apple-bundle-id-ios` ← APPLE_BUNDLE_ID_IOS
71. `bayit-apple-bundle-id-tvos` ← APPLE_BUNDLE_ID_TVOS

### WebAuthn (Passkey/Biometric Auth) (72-74)
72. `bayit-webauthn-rp-id` ← WEBAUTHN_RP_ID
73. `bayit-webauthn-rp-name` ← WEBAUTHN_RP_NAME
74. `bayit-webauthn-origin` ← WEBAUTHN_ORIGIN

### Feature Flags
75. `bayit-feature-scene-search-enabled` ← FEATURE_SCENE_SEARCH_ENABLED

### Turborepo Remote Cache
76. `turbo-token` ← TURBO_TOKEN
77. `turbo-team` ← TURBO_TEAM

---

## Secrets Referenced in cloudbuild.yaml (ONLY 3!)

**File**: `backend/cloudbuild.yaml`
**Line 27**: `--update-secrets` flag

```yaml
- '--update-secrets=CSRF_ENABLED=csrf-enabled:latest,PODCAST_TRANSLATION_ENABLED=podcast-translation-enabled:latest,PODCAST_TRANSLATION_AUTO_START=podcast-translation-auto-start:latest'
```

**Secrets**:
1. `csrf-enabled` ← CSRF_ENABLED
2. `podcast-translation-enabled` ← PODCAST_TRANSLATION_ENABLED
3. `podcast-translation-auto-start` ← PODCAST_TRANSLATION_AUTO_START

**PROBLEM**: Cloud Run service uses 60+ secrets, but only 3 are referenced in cloudbuild.yaml!

---

## Secrets Used by Cloud Run Service (60+)

**Service**: `bayit-plus-backend` (us-east1)

### Secrets Referenced by Cloud Run:
1. `bayit-secret-key` (SECRET_KEY)
2. `mongodb-url` (MONGODB_URL) ⚠️ **Different name from deploy_server.sh!**
3. `stripe-secret-key` (STRIPE_SECRET_KEY) ⚠️ **Different name!**
4. `stripe-webhook-secret` (STRIPE_WEBHOOK_SECRET) ⚠️ **Different name!**
5. `stripe-price-basic` (STRIPE_PRICE_BASIC) ⚠️ **Different name!**
6. `stripe-price-premium` (STRIPE_PRICE_PREMIUM) ⚠️ **Different name!**
7. `stripe-price-family` (STRIPE_PRICE_FAMILY) ⚠️ **Different name!**
8. `anthropic-api-key` (ANTHROPIC_API_KEY) ⚠️ **Different name!**
9. `google-client-id` (GOOGLE_CLIENT_ID) ⚠️ **Different name!**
10. `google-client-secret` (GOOGLE_CLIENT_SECRET) ⚠️ **Different name!**
11. `google-redirect-uri` (GOOGLE_REDIRECT_URI)
12. `elevenlabs-api-key` (ELEVENLABS_API_KEY) ⚠️ **Different name!**
13. `bayit-twilio-account-sid` (TWILIO_ACCOUNT_SID)
14. `bayit-twilio-auth-token` (TWILIO_AUTH_TOKEN)
15. `bayit-twilio-phone-number` (TWILIO_PHONE_NUMBER)
16. `gcs-bucket-name` (GCS_BUCKET_NAME)
17. `backend-cors-origins` (BACKEND_CORS_ORIGINS)
18. `opensubtitles-api-key` (OPENSUBTITLES_API_KEY)
19-49. All `bayit-librarian-*` secrets (31 total)

**CRITICAL ISSUE**: Secret naming inconsistency!
- `deploy_server.sh` creates: `bayit-mongodb-url`, `bayit-stripe-secret-key`, etc.
- Cloud Run service uses: `mongodb-url`, `stripe-secret-key`, etc.
- This suggests secrets were created manually or by an older deployment script with different naming

---

## Variables in backend/.env NOT in Google Cloud Secret Manager

The following environment variables exist in `backend/.env` but are NOT stored as secrets in Google Cloud Secret Manager:

### Configuration (Non-Secret)
1. `ENVIRONMENT` (production) - ✅ Safe to keep as env var
2. `DEBUG` (false) - ✅ Safe to keep as env var
3. `LOG_LEVEL` (INFO) - ✅ Safe to keep as env var
4. `ADMIN_EMAIL` (admin@olorin.ai) - ⚠️ Should be secret
5. `ADMIN_PASSWORD` (Jersey1973!) - 🚨 **CRITICAL: Hardcoded password in .env!**

### MongoDB Connection Pool Settings (Non-Secret)
6. `MONGODB_MAX_POOL_SIZE` (50)
7. `MONGODB_MIN_POOL_SIZE` (5)
8. `MONGODB_MAX_IDLE_TIME_MS` (60000)
9. `MONGODB_CONNECT_TIMEOUT_MS` (60000)
10. `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (60000)

### Google Cloud (Local Development)
11. `GOOGLE_APPLICATION_CREDENTIALS` (/path/to/credentials.json) - ✅ Local only

### Olorin Platform Features (Non-Secret)
12. `OLORIN_NLP_ENABLED` (true)
13. `OLORIN_NLP_CONFIDENCE_THRESHOLD` (0.7)
14. `OLORIN_NLP_MAX_COST_PER_QUERY` (0.10)

### CORS & Frontend URLs (Non-Secret)
15. `BACKEND_CORS_ORIGINS` - ⚠️ **IS** stored as secret (inconsistent approach)
16. `FRONTEND_URL` (http://localhost:3200) - ✅ Local only
17. `FRONTEND_WEB_URL` (http://localhost:3200) - ✅ Local only
18. `FRONTEND_MOBILE_URL` (bayitplus://) - ✅ Local only

### ElevenLabs Voice IDs (Configuration, Not Secrets)
19. `ELEVENLABS_WEBHOOK_SECRET` (your_elevenlabs_webhook_secret_here) - 🚨 **Placeholder value!**
20. `ELEVENLABS_DEFAULT_VOICE_ID` (EXAVITQu4vr4xnSDxMaL)
21. `ELEVENLABS_ASSISTANT_VOICE_ID` (ashjVK50jp28G73AUTnb)
22. `ELEVENLABS_SUPPORT_VOICE_ID` (ashjVK50jp28G73AUTnb)
23. `ELEVENLABS_HEBREW_VOICE_ID` (EXAVITQu4vr4xnSDxMaL)
24. `ELEVENLABS_ENGLISH_VOICE_ID` (EXAVITQu4vr4xnSDxMaL)
25. `ELEVENLABS_HEBREW_MALE_VOICE_ID` (onwK4e9ZLuTAKqWW03F9)
26. `ELEVENLABS_ENGLISH_MALE_VOICE_ID` (ashjVK50jp28G73AUTnb)

### Podcast Translation (Non-Secret Configuration)
27. `PODCAST_TRANSLATION_POLL_INTERVAL` (300)
28. `PODCAST_TRANSLATION_MAX_CONCURRENT` (2)
29. `TEMP_AUDIO_DIR` (/tmp/podcast_audio)
30. `PODCAST_DEFAULT_ORIGINAL_LANGUAGE` (he)
31. `ALLOWED_AUDIO_DOMAINS` ([JSON array])

### Audit Recovery Settings (Non-Secret)
32. `AUDIT_STUCK_TIMEOUT_MINUTES` (30)
33. `AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES` (15)
34. `AUDIT_HEALTH_CHECK_INTERVAL_SECONDS` (300)

### WebSocket Security (Non-Secret)
35. `DUBBING_REQUIRE_SECURE_WEBSOCKET` (false)

### Location Services (Configuration & Credentials)
36. `GEONAMES_USERNAME` (Olorin1973) - ⚠️ Should be secret (API username)
37. `GEONAMES_API_BASE_URL` (https://secure.geonames.org)
38. `GEONAMES_TIMEOUT_SECONDS` (10)
39. `LOCATION_CACHE_TTL_HOURS` (24)
40. `LOCATION_CACHE_COLLECTION` (location_cache)
41. `LOCATION_REVERSE_GEOCODE_RATE_LIMIT` (30)
42. `LOCATION_CONTENT_RATE_LIMIT` (60)
43. `LOCATION_ENCRYPTION_KEY` (pUDEHNW1symVdVhfcGbffJWeT_TuDSRdAdNAfSzZGrI=) - 🚨 **CRITICAL: Encryption key hardcoded!**
44. `LOCATION_CONTENT_TOPIC_TAGS` ([JSON array])
45. `LOCATION_CONTENT_EVENT_TYPES` ([JSON array])
46. `LOCATION_CONTENT_ARTICLE_FORMATS` ([JSON array])

### Olorin Fraud Detection & CVPlus MongoDB (Credentials)
47. `OLORIN_MONGODB_URI` - 🚨 **CRITICAL: Not in Secret Manager!**
48. `OLORIN_MONGODB_DB_NAME` - Should be secret
49. `OLORIN_MONGODB_SOURCE_URI` - 🚨 **CRITICAL: Not in Secret Manager!**
50. `CVPLUS_MONGODB_URI` - 🚨 **CRITICAL: Not in Secret Manager!**
51. `CVPLUS_MONGODB_DB_NAME` - Should be secret
52. `CVPLUS_MONGODB_SOURCE_URI` - 🚨 **CRITICAL: Not in Secret Manager!**

---

## Critical Security Issues Found

### 🚨 HIGH SEVERITY

1. **ADMIN_PASSWORD hardcoded in .env**
   - Value: `Jersey1973!`
   - Risk: Admin credentials exposed in version control
   - Fix: Move to Secret Manager immediately

2. **LOCATION_ENCRYPTION_KEY hardcoded in .env**
   - Value: `pUDEHNW1symVdVhfcGbffJWeT_TuDSRdAdNAfSzZGrI=`
   - Risk: User location data can be decrypted if .env is compromised
   - Fix: Move to Secret Manager immediately

3. **MongoDB credentials for other platforms not in Secret Manager**
   - `OLORIN_MONGODB_URI` (Fraud Detection)
   - `OLORIN_MONGODB_SOURCE_URI` (Fraud Detection - old cluster)
   - `CVPLUS_MONGODB_URI` (CVPlus)
   - `CVPLUS_MONGODB_SOURCE_URI` (CVPlus - old cluster)
   - Risk: Database credentials exposed
   - Fix: Create secrets in Google Cloud Secret Manager

4. **ELEVENLABS_WEBHOOK_SECRET has placeholder value**
   - Value: `your_elevenlabs_webhook_secret_here`
   - Risk: Webhook security disabled
   - Fix: Generate real secret and store in Secret Manager

### ⚠️ MEDIUM SEVERITY

5. **GEONAMES_USERNAME exposed in .env**
   - Value: `Olorin1973`
   - Risk: API quota abuse if credentials leaked
   - Fix: Move to Secret Manager

6. **Secret naming inconsistency**
   - `deploy_server.sh` creates secrets with `bayit-` prefix
   - Cloud Run service uses secrets without `bayit-` prefix
   - Risk: Deployment failures, confusion
   - Fix: Standardize naming convention

---

## Recommended Actions

### Immediate (Critical Security Fixes)

1. **Create missing critical secrets**:
   ```bash
   # Admin credentials
   echo -n "SECURE_PASSWORD_HERE" | gcloud secrets create bayit-admin-password --data-file=-
   echo -n "admin@olorin.ai" | gcloud secrets create bayit-admin-email --data-file=-

   # Location encryption key
   echo -n "pUDEHNW1symVdVhfcGbffJWeT_TuDSRdAdNAfSzZGrI=" | gcloud secrets create bayit-location-encryption-key --data-file=-

   # ElevenLabs webhook secret (generate new value)
   echo -n "GENERATE_NEW_SECRET_HERE" | gcloud secrets create bayit-elevenlabs-webhook-secret --data-file=-

   # Olorin Fraud Detection MongoDB
   echo -n "$OLORIN_MONGODB_URI" | gcloud secrets create olorin-fraud-mongodb-url --data-file=-
   echo -n "$OLORIN_MONGODB_DB_NAME" | gcloud secrets create olorin-fraud-mongodb-db-name --data-file=-

   # CVPlus MongoDB
   echo -n "$CVPLUS_MONGODB_URI" | gcloud secrets create cvplus-mongodb-url --data-file=-
   echo -n "$CVPLUS_MONGODB_DB_NAME" | gcloud secrets create cvplus-mongodb-db-name --data-file=-

   # GeoNames API
   echo -n "Olorin1973" | gcloud secrets create geonames-username --data-file=-
   ```

2. **Remove hardcoded secrets from backend/.env**:
   - Replace with placeholder: `ADMIN_PASSWORD=<from-secret-manager>`
   - Replace with placeholder: `LOCATION_ENCRYPTION_KEY=<from-secret-manager>`
   - Replace with placeholder: `ELEVENLABS_WEBHOOK_SECRET=<from-secret-manager>`
   - Replace with placeholder: `OLORIN_MONGODB_URI=<from-secret-manager>`
   - Replace with placeholder: `CVPLUS_MONGODB_URI=<from-secret-manager>`

3. **Update cloudbuild.yaml to reference ALL secrets**:

Replace the current `--update-secrets` line (line 27) with:

```yaml
      - '--update-secrets=CSRF_ENABLED=csrf-enabled:latest,PODCAST_TRANSLATION_ENABLED=podcast-translation-enabled:latest,PODCAST_TRANSLATION_AUTO_START=podcast-translation-auto-start:latest,SECRET_KEY=bayit-secret-key:latest,MONGODB_URL=bayit-mongodb-url:latest,MONGODB_DB_NAME=bayit-mongodb-db-name:latest,STRIPE_SECRET_KEY=bayit-stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=bayit-stripe-webhook-secret:latest,STRIPE_PRICE_BASIC=bayit-stripe-price-basic:latest,STRIPE_PRICE_PREMIUM=bayit-stripe-price-premium:latest,STRIPE_PRICE_FAMILY=bayit-stripe-price-family:latest,ANTHROPIC_API_KEY=bayit-anthropic-api-key:latest,OPENAI_API_KEY=bayit-openai-api-key:latest,GOOGLE_CLIENT_ID=bayit-google-client-id:latest,GOOGLE_CLIENT_SECRET=bayit-google-client-secret:latest,GOOGLE_REDIRECT_URI=google-redirect-uri:latest,ELEVENLABS_API_KEY=bayit-elevenlabs-api-key:latest,TWILIO_ACCOUNT_SID=bayit-twilio-account-sid:latest,TWILIO_AUTH_TOKEN=bayit-twilio-auth-token:latest,TWILIO_PHONE_NUMBER=bayit-twilio-phone-number:latest,TMDB_API_KEY=tmdb-api-key:latest,TMDB_API_TOKEN=tmdb-api-token:latest,OPENSUBTITLES_API_KEY=opensubtitles-api-key:latest,SENTRY_DSN=bayit-sentry-dsn:latest,PICOVOICE_ACCESS_KEY=picovoice-access-key:latest,ADMIN_PASSWORD=bayit-admin-password:latest,LOCATION_ENCRYPTION_KEY=bayit-location-encryption-key:latest,ELEVENLABS_WEBHOOK_SECRET=bayit-elevenlabs-webhook-secret:latest,GEONAMES_USERNAME=geonames-username:latest'
```

**Note**: This is a very long line. Consider using multi-line YAML format:

```yaml
      - '--update-secrets=CSRF_ENABLED=csrf-enabled:latest'
      - '--update-secrets=PODCAST_TRANSLATION_ENABLED=podcast-translation-enabled:latest'
      - '--update-secrets=PODCAST_TRANSLATION_AUTO_START=podcast-translation-auto-start:latest'
      - '--update-secrets=SECRET_KEY=bayit-secret-key:latest'
      - '--update-secrets=MONGODB_URL=bayit-mongodb-url:latest'
      - '--update-secrets=MONGODB_DB_NAME=bayit-mongodb-db-name:latest'
      # ... continue for all secrets
```

### Short-term (Deployment Consistency)

4. **Resolve secret naming inconsistency**:

   **Option A**: Update Cloud Run service to use `bayit-` prefixed secrets (recommended):
   - Ensures consistency with `deploy_server.sh`
   - Modify Cloud Run deployment in `deploy_server.sh` to use prefixed names

   **Option B**: Update `deploy_server.sh` to create secrets without `bayit-` prefix:
   - Matches current Cloud Run configuration
   - More work to update all 72 secret creation calls

5. **Create missing secrets for other platforms**:
   - Station AI MongoDB: Already handled by `deploy_server.sh` (optional)
   - Olorin Fraud Detection: Create secrets (HIGH PRIORITY)
   - CVPlus: Create secrets (HIGH PRIORITY)

### Long-term (Deployment Automation)

6. **Make cloudbuild.yaml self-sufficient**:
   - All secrets referenced in `--update-secrets`
   - Cloud Build can deploy without dependency on `deploy_server.sh`
   - Enables automated deployments via Cloud Build triggers

7. **Standardize secret management**:
   - Document secret naming conventions
   - Automate secret creation from .env
   - Implement secret rotation policies

8. **Separate development and production secrets**:
   - Development: Use `.env` file
   - Production: Use Secret Manager exclusively
   - CI/CD: Use Secret Manager

---

## Files Requiring Updates

### High Priority

1. **backend/.env** - Remove hardcoded secrets
   - Lines 26, 236: ADMIN_PASSWORD, LOCATION_ENCRYPTION_KEY
   - Lines 47-59: Olorin Fraud Detection, CVPlus MongoDB URIs
   - Line 113: ELEVENLABS_WEBHOOK_SECRET

2. **backend/cloudbuild.yaml** - Add all secret references
   - Line 27: Expand `--update-secrets` to include all 60+ secrets

3. **scripts/deployment/bayit-plus/deploy_server.sh** - Standardize naming
   - Lines 290-554: Update secret names to match Cloud Run service
   OR
   - Update Cloud Run service to use `bayit-` prefixed secrets

### Medium Priority

4. **docs/deployment/** - Document secret management
   - Create SECRETS_MANAGEMENT.md guide
   - Document naming conventions
   - Document secret rotation procedures

---

## Comparison Matrix

| Secret Name (deploy_server.sh) | Secret Name (Cloud Run) | In cloudbuild.yaml? | Status |
|--------------------------------|-------------------------|---------------------|---------|
| `bayit-secret-key` | `bayit-secret-key` | ❌ No | ⚠️ Mismatch |
| `bayit-mongodb-url` | `mongodb-url` | ❌ No | 🚨 Different name! |
| `bayit-stripe-secret-key` | `stripe-secret-key` | ❌ No | 🚨 Different name! |
| `podcast-translation-enabled` | N/A | ✅ Yes | ✅ OK |
| `podcast-translation-auto-start` | N/A | ✅ Yes | ✅ OK |
| `csrf-enabled` | N/A | ✅ Yes | ✅ OK |
| All other 60+ secrets | Various | ❌ No | 🚨 Missing! |

**Legend**:
- ✅ OK: Properly configured
- ⚠️ Mismatch: Inconsistent configuration
- 🚨 Critical: Requires immediate attention

---

## Conclusion

The current deployment configuration has **critical security issues** and **deployment inconsistencies** that must be addressed:

1. **Security**: Hardcoded passwords, encryption keys, and MongoDB credentials in `.env`
2. **Deployment**: `cloudbuild.yaml` only references 3 secrets instead of 60+
3. **Consistency**: Secret naming differs between `deploy_server.sh` and Cloud Run service
4. **Automation**: Cloud Build cannot deploy independently (relies on `deploy_server.sh` to create secrets first)

**Immediate action required** to:
- Create missing critical secrets
- Update cloudbuild.yaml with all secret references
- Standardize secret naming
- Remove hardcoded secrets from .env

---

## Appendix: Complete Environment Variables in backend/.env

See backend/.env for the complete list of 120+ environment variables.

**Categories**:
- Security & Authentication: 7 variables
- MongoDB Databases: 12 variables (4 clusters)
- Google Cloud: 1 variable
- Olorin Platform Features: 3 variables
- CORS & Frontend URLs: 4 variables
- Stripe Payments: 7 variables
- Google OAuth: 3 variables
- Twilio Communications: 3 variables
- Other Services: 1 variable (Picovoice)
- ElevenLabs Voice IDs: 8 variables
- Apple Push Notifications: 4 variables
- Podcast Translation: 8 variables
- Turborepo: 2 variables
- Librarian (AI Agent): 19 variables
- Audit Recovery: 3 variables
- Series Linker: 5 variables
- Judaism Section: 13 variables
- WebAuthn: 3 variables
- WebSocket Security: 1 variable
- Feature Flags: 1 variable
- Location Services: 12 variables

**Total**: 120+ environment variables

---

**End of Audit Report**
