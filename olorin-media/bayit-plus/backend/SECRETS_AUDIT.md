# Bayit+ Secrets Audit Report
**Date:** 2026-01-28

## Critical Security Issues Found

### 1. Hardcoded Secrets in .env (HIGH RISK)
These secrets are currently hardcoded in .env and MUST be moved to Secret Manager:

- **MONGODB_URI** - Contains database password in plaintext: `Jersey1973!`
- **GOOGLE_CLIENT_SECRET** - OAuth secret hardcoded: `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`
- **GOOGLE_CLIENT_ID** - OAuth client ID hardcoded
- **GEONAMES_USERNAME** - API username hardcoded
- **LOCATION_ENCRYPTION_KEY** - Encryption key hardcoded: `3n__gO10_RPLM8Kx3JAxV4_4RDgWNoqahNfykimTm-4=`

### 2. Missing from retrieve_secrets.sh
These secrets are marked as `<from-secret-manager:...>` in .env but NOT retrieved by the script:

- ADMIN_EMAIL
- ADMIN_PASSWORD
- STATION_AI_MONGODB_URI
- OLORIN_MONGODB_URI
- OLORIN_MONGODB_SOURCE_URI
- CVPLUS_MONGODB_URI
- CVPLUS_MONGODB_SOURCE_URI
- ELEVENLABS_WEBHOOK_SECRET
- MONGODB_URI (currently hardcoded)

### 3. Duplicate Entries in .env
- **GEONAMES_USERNAME** - Appears twice (lines 226 and 247)
- **LOCATION_ENCRYPTION_KEY** - Appears twice with different values

### 4. Placeholder Values
- **TURBO_TOKEN** - Set to `YOUR_TURBO_TOKEN` (should be in Secret Manager)

## Required Secret Manager Secrets

All secrets that should exist in Google Cloud Secret Manager:

### Core Security
- bayit-secret-key ✅ (in script)
- bayit-admin-email ❌ MISSING
- bayit-admin-password ❌ MISSING

### Database URIs
- bayit-mongodb-uri ❌ MISSING (currently hardcoded with password!)
- bayit-mongodb-db-name ✅ (in script)
- station-ai-mongodb-uri ❌ MISSING
- olorin-fraud-mongodb-uri ❌ MISSING
- olorin-fraud-mongodb-source-uri ❌ MISSING
- cvplus-mongodb-uri ❌ MISSING
- cvplus-mongodb-source-uri ❌ MISSING

### Google OAuth
- bayit-google-client-id ✅ (in script, but also hardcoded in .env!)
- bayit-google-client-secret ✅ (in script, but also hardcoded in .env!)
- bayit-google-redirect-uri ✅ (in script)

### Stripe Payment
- bayit-stripe-api-key ✅ (in script)
- bayit-stripe-secret-key ✅ (in script)
- bayit-stripe-webhook-secret ✅ (in script)
- bayit-stripe-price-basic ✅ (in script)
- bayit-stripe-price-premium ✅ (in script)
- bayit-stripe-price-family ✅ (in script)

### AI Services
- bayit-openai-api-key ✅ (in script)
- bayit-anthropic-api-key ✅ (in script)
- bayit-elevenlabs-api-key ✅ (in script)
- bayit-elevenlabs-webhook-secret ❌ MISSING

### External Services
- bayit-twilio-account-sid ✅ (in script)
- bayit-twilio-auth-token ✅ (in script)
- bayit-twilio-phone-number ✅ (in script)
- picovoice-access-key ✅ (in script)
- bayit-turbo-token ❌ MISSING

### Geolocation
- bayit-geonames-username ❌ MISSING (currently hardcoded)
- bayit-location-encryption-key ✅ (in script, but also hardcoded!)

## Action Items

### Immediate (Security Critical)
1. Create missing secrets in Google Cloud Secret Manager
2. Update retrieve_secrets.sh to fetch all secrets
3. Remove hardcoded values from .env
4. Remove duplicate entries
5. Test secret retrieval

### Priority Order
1. **CRITICAL**: MONGODB_URI (contains password)
2. **CRITICAL**: GOOGLE_CLIENT_SECRET
3. **HIGH**: LOCATION_ENCRYPTION_KEY
4. **HIGH**: Admin credentials (ADMIN_EMAIL, ADMIN_PASSWORD)
5. **MEDIUM**: Other MongoDB URIs
6. **MEDIUM**: ELEVENLABS_WEBHOOK_SECRET
7. **LOW**: TURBO_TOKEN, GEONAMES_USERNAME
