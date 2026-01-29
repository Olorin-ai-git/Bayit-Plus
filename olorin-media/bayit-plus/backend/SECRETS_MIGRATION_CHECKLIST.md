# Bayit+ Secrets Migration Checklist

**Date:** 2026-01-28
**Status:** 🔴 CRITICAL - Hardcoded secrets found in .env

## Executive Summary

**CRITICAL SECURITY ISSUE:** The current .env file contains hardcoded secrets including database passwords, OAuth credentials, and encryption keys. This is a significant security risk.

### Key Findings

- ✅ **13 secrets properly configured** in retrieve_secrets.sh
- ❌ **14 secrets missing** from Secret Manager
- 🔴 **5 critical hardcoded secrets** in .env (immediate risk)
- ⚠️ **2 duplicate entries** in .env

## Critical Hardcoded Secrets (Immediate Action Required)

1. **MONGODB_URI** - Contains password: `Jersey1973!`
2. **GOOGLE_CLIENT_SECRET** - OAuth secret: `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`
3. **GOOGLE_CLIENT_ID** - OAuth client: `624470113582-...`
4. **LOCATION_ENCRYPTION_KEY** - Fernet key: `3n__gO10_RPLM8Kx3JAxV4_4RDgWNoqahNfykimTm-4=`
5. **GEONAMES_USERNAME** - API username: `Olorin1973`

## Missing Secrets (Need to Create in Secret Manager)

### Admin Credentials
- [ ] `bayit-admin-email`
- [ ] `bayit-admin-password`

### Database URIs
- [ ] `bayit-mongodb-uri` (currently hardcoded!)
- [ ] `station-ai-mongodb-uri`
- [ ] `olorin-fraud-mongodb-uri`
- [ ] `olorin-fraud-mongodb-source-uri`
- [ ] `cvplus-mongodb-uri`
- [ ] `cvplus-mongodb-source-uri`

### API Services
- [ ] `bayit-elevenlabs-webhook-secret`
- [ ] `bayit-geonames-username` (currently hardcoded!)
- [ ] `bayit-turbo-token`

### Already Updated (but hardcoded in .env)
- [ ] `bayit-google-client-id` (exists in Secret Manager, but .env uses hardcoded value)
- [ ] `bayit-google-client-secret` (exists in Secret Manager, but .env uses hardcoded value)
- [ ] `bayit-location-encryption-key` (exists in Secret Manager, but .env uses hardcoded value)

## Migration Steps

### Step 1: Audit Current State ✅ COMPLETED
- [x] Reviewed retrieve_secrets.sh
- [x] Analyzed .env file
- [x] Identified missing secrets
- [x] Identified hardcoded values
- [x] Created audit report

### Step 2: Create Missing Secrets in Secret Manager

**Option A: Interactive (Recommended)**
```bash
cd backend
./create_missing_secrets.sh
```

**Option B: Manual (Using gcloud CLI)**
```bash
# Example for each secret:
echo -n "SECRET_VALUE" | gcloud secrets create SECRET_NAME \
  --project=bayit-plus \
  --replication-policy=automatic \
  --data-file=-
```

### Step 3: Update Secret Retrieval Script
```bash
cd backend
# Backup current script
cp retrieve_secrets.sh retrieve_secrets.sh.backup

# Replace with updated version
mv retrieve_secrets.sh.new retrieve_secrets.sh
chmod +x retrieve_secrets.sh
```

### Step 4: Generate New .env from Secrets
```bash
cd backend
./retrieve_secrets.sh > .env.new

# Review the new file
cat .env.new

# Backup current .env
cp .env .env.backup

# Replace with secrets-based version
mv .env.new .env
```

### Step 5: Test Application
```bash
# Test backend startup
poetry run python -m app.local_server

# Verify all services connect:
# - MongoDB connection
# - Google OAuth
# - Stripe API
# - GeoNames API
# - ElevenLabs API
```

### Step 6: Clean Up
```bash
# Remove backup files (keep .env.backup for emergency)
rm retrieve_secrets.sh.backup

# NEVER commit .env to git
git update-index --assume-unchanged backend/.env
```

## Verification Checklist

After migration, verify each service:

### Database Connections
- [ ] Bayit+ MongoDB connects successfully
- [ ] Station AI MongoDB connects
- [ ] Olorin Fraud MongoDB connects
- [ ] CVPlus MongoDB connects

### Authentication
- [ ] Google OAuth login works
- [ ] Admin login works
- [ ] JWT tokens generated correctly

### Payment Processing
- [ ] Stripe API accessible
- [ ] Webhook verification works
- [ ] Test payment flow

### AI Services
- [ ] OpenAI API calls succeed
- [ ] Anthropic API calls succeed
- [ ] ElevenLabs TTS/STT works

### External APIs
- [ ] GeoNames reverse geocoding works
- [ ] TMDB metadata fetching works
- [ ] Twilio SMS sending works

## Security Best Practices

### ✅ DO
- Store ALL secrets in Google Cloud Secret Manager
- Use retrieve_secrets.sh to generate .env
- Add .env to .gitignore
- Rotate secrets regularly
- Use different secrets for dev/staging/prod
- Enable Secret Manager audit logging
- Use least-privilege IAM for secret access

### ❌ DON'T
- Hardcode secrets in .env
- Commit .env to git
- Share secrets via Slack/email
- Use same secrets across environments
- Store secrets in code comments
- Leave default/placeholder values

## Emergency Rollback

If something breaks after migration:

```bash
cd backend
cp .env.backup .env
# Restart services
```

## Files Created

1. **SECRETS_AUDIT.md** - Detailed audit report
2. **retrieve_secrets.sh.new** - Updated secret retrieval script
3. **create_missing_secrets.sh** - Interactive secret creation
4. **SECRETS_MIGRATION_CHECKLIST.md** - This file

## Support

If you encounter issues:

1. Check Secret Manager IAM permissions
2. Verify secret names match exactly
3. Check gcloud CLI authentication
4. Review application logs
5. Test individual secret retrieval:
   ```bash
   gcloud secrets versions access latest --secret=bayit-mongodb-uri --project=bayit-plus
   ```

## Timeline

- **Immediate**: Create critical secrets (MongoDB, Google OAuth)
- **Within 24h**: Create remaining secrets
- **Within 48h**: Complete migration and testing
- **Within 1 week**: Rotate hardcoded secrets for new values

---

**Status:** 📋 Ready for execution
**Priority:** 🔴 CRITICAL
**Estimated Time:** 30-60 minutes
