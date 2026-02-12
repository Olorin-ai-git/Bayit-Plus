# GCloud Secrets - Voice & Avatar AI Features

**Version:** 1.0.0
**Date:** 2026-02-12
**Feature:** Voice & Avatar AI System v1.1.0

## Overview

This document defines all Google Cloud Secret Manager secrets required for the Voice & Avatar AI features deployment across Bayit+ platforms (tvOS, Web, Mobile).

## Secret Management Workflow

1. Update secrets in Google Cloud Secret Manager
2. Run sync script: `./scripts/sync-gcloud-secrets.sh production`
3. Restart affected services
4. Verify feature flags are active

**NEVER edit `.env` files directly.** All changes must flow through GCloud Secret Manager.

## Required Secrets

### Feature Flags

#### `VOICE_PROACTIVE_SUGGESTIONS_ENABLED`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `false`
- **Production Value:** `true` (after Phase 4 rollout)
- **Description:** Enables proactive AI suggestion system
- **Affects:** All platforms
- **Rollout:** Enable after Beta 500 testing passes

```bash
gcloud secrets create VOICE_PROACTIVE_SUGGESTIONS_ENABLED \
  --replication-policy="automatic" \
  --data-file=- <<EOF
true
EOF
```

#### `VOICE_MULTI_LANGUAGE_ENABLED`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `false`
- **Production Value:** `true`
- **Description:** Enables multi-language voice profiles (10 languages)
- **Languages:** he, en, es, zh, fr, it, hi, ta, bn, ja
- **Affects:** All platforms
- **Dependencies:** @olorin/shared-i18n

```bash
gcloud secrets create VOICE_MULTI_LANGUAGE_ENABLED \
  --replication-policy="automatic" \
  --data-file=- <<EOF
true
EOF
```

#### `VOICE_SHORTCUTS_ENABLED`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `false`
- **Production Value:** `true`
- **Description:** Enables voice shortcuts and macro system
- **Affects:** All platforms
- **Features:** Custom voice commands, multi-action macros, fuzzy matching

```bash
gcloud secrets create VOICE_SHORTCUTS_ENABLED \
  --replication-policy="automatic" \
  --data-file=- <<EOF
true
EOF
```

#### `AVATAR_ANIMATIONS_ENABLED`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `false`
- **Production Value:** `true`
- **Description:** Enables advanced avatar animation system
- **Affects:** All platforms
- **Features:** 12 animation types, emotion mapping, sequences

```bash
gcloud secrets create AVATAR_ANIMATIONS_ENABLED \
  --replication-policy="automatic" \
  --data-file=- <<EOF
true
EOF
```

### Avatar Service Configuration

**Note:** Zeh Ani is an internal feature integrated into the main Bayit+ backend service. No external API configuration is required for avatar generation, as it's part of the core backend functionality.

## Optional Configuration Secrets

### `VOICE_ANALYTICS_ENABLED`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `true`
- **Production Value:** `true`
- **Description:** Enables voice interaction analytics
- **Privacy:** See VOICE_AVATAR_FEATURES.md privacy section

```bash
gcloud secrets create VOICE_ANALYTICS_ENABLED \
  --replication-policy="automatic" \
  --data-file=- <<EOF
true
EOF
```

### `VOICE_ANALYTICS_SAMPLE_RATE`
- **Type:** Float (0.0 - 1.0)
- **Default:** `1.0`
- **Production Value:** `1.0` (sample 100% during initial rollout)
- **Description:** Percentage of voice events to track
- **Tuning:** Reduce if analytics volume too high

```bash
gcloud secrets create VOICE_ANALYTICS_SAMPLE_RATE \
  --replication-policy="automatic" \
  --data-file=- <<EOF
1.0
EOF
```

### `AVATAR_CACHE_TTL`
- **Type:** Integer (seconds)
- **Default:** `86400` (24 hours)
- **Production Value:** `86400`
- **Description:** Avatar cache time-to-live
- **Affects:** Storage costs, generation frequency

```bash
gcloud secrets create AVATAR_CACHE_TTL \
  --replication-policy="automatic" \
  --data-file=- <<EOF
86400
EOF
```

## Platform-Specific Secrets

### `VOICE_WEB_MICROPHONE_REQUIRED`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `false`
- **Platform:** Web only
- **Description:** Require microphone permission for voice features

```bash
gcloud secrets create VOICE_WEB_MICROPHONE_REQUIRED \
  --replication-policy="automatic" \
  --data-file=- <<EOF
false
EOF
```

### `VOICE_MOBILE_BACKGROUND_LISTENING`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `false`
- **Platform:** Mobile only
- **Description:** Allow voice listening in background (iOS/Android)
- **Battery Impact:** High

```bash
gcloud secrets create VOICE_MOBILE_BACKGROUND_LISTENING \
  --replication-policy="automatic" \
  --data-file=- <<EOF
false
EOF
```

### `VOICE_TVOS_SIRI_REMOTE_INTEGRATION`
- **Type:** Boolean (string: "true" or "false")
- **Default:** `true`
- **Platform:** tvOS only
- **Description:** Enable Siri Remote microphone for voice commands

```bash
gcloud secrets create VOICE_TVOS_SIRI_REMOTE_INTEGRATION \
  --replication-policy="automatic" \
  --data-file=- <<EOF
true
EOF
```

## Environment-Specific Values

### Development

```bash
# Feature flags - enable all for development
export VOICE_PROACTIVE_SUGGESTIONS_ENABLED=true
export VOICE_MULTI_LANGUAGE_ENABLED=true
export VOICE_SHORTCUTS_ENABLED=true
export AVATAR_ANIMATIONS_ENABLED=true

# Analytics - sample everything
export VOICE_ANALYTICS_ENABLED=true
export VOICE_ANALYTICS_SAMPLE_RATE=1.0

# Platform-specific
export VOICE_WEB_MICROPHONE_REQUIRED=false
export VOICE_MOBILE_BACKGROUND_LISTENING=false
export VOICE_TVOS_SIRI_REMOTE_INTEGRATION=true
```

### Staging

```bash
# Feature flags - test rollout phases
export VOICE_PROACTIVE_SUGGESTIONS_ENABLED=true
export VOICE_MULTI_LANGUAGE_ENABLED=true
export VOICE_SHORTCUTS_ENABLED=true
export AVATAR_ANIMATIONS_ENABLED=true

# Analytics - full tracking
export VOICE_ANALYTICS_ENABLED=true
export VOICE_ANALYTICS_SAMPLE_RATE=1.0

# Platform-specific
export VOICE_WEB_MICROPHONE_REQUIRED=false
export VOICE_MOBILE_BACKGROUND_LISTENING=false
export VOICE_TVOS_SIRI_REMOTE_INTEGRATION=true
```

### Production

```bash
# Feature flags - controlled rollout
export VOICE_PROACTIVE_SUGGESTIONS_ENABLED=true
export VOICE_MULTI_LANGUAGE_ENABLED=true
export VOICE_SHORTCUTS_ENABLED=true
export AVATAR_ANIMATIONS_ENABLED=true

# Analytics - full tracking
export VOICE_ANALYTICS_ENABLED=true
export VOICE_ANALYTICS_SAMPLE_RATE=1.0

# Platform-specific
export VOICE_WEB_MICROPHONE_REQUIRED=false
export VOICE_MOBILE_BACKGROUND_LISTENING=false
export VOICE_TVOS_SIRI_REMOTE_INTEGRATION=true
```

## Secret Access Control

### IAM Permissions Required

**Cloud Run Service Account:**
```bash
gcloud projects add-iam-policy-binding bayit-plus \
  --member="serviceAccount:bayit-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Deployment Pipeline:**
```bash
gcloud projects add-iam-policy-binding bayit-plus \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Secrets to Protect

**LOW SECURITY:**
- Feature flags (boolean values)
- Analytics configuration
- Cache TTL settings
- Platform-specific configuration

## Verification

### Verify Secrets Exist

```bash
# List all voice/avatar secrets
gcloud secrets list --filter="name~VOICE OR name~AVATAR"

# Check specific secret
gcloud secrets versions access latest --secret="VOICE_PROACTIVE_SUGGESTIONS_ENABLED"
```

### Verify Backend Access

```bash
# SSH into Cloud Run instance
gcloud run services proxy bayit-backend --port=8080

# Check environment variables
curl http://localhost:8080/api/health/config
```

### Test Feature Flags

```bash
# Test proactive suggestions
curl -X POST http://localhost:8080/api/voice/suggestions/evaluate \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "context": {}}'

# Test avatar generation
curl -X POST http://localhost:8080/api/avatar/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "imageUrl": "..."}'
```

## Rollback Procedure

### Disable All Features

```bash
# Update secrets
gcloud secrets versions add VOICE_PROACTIVE_SUGGESTIONS_ENABLED --data-file=- <<EOF
false
EOF

gcloud secrets versions add VOICE_MULTI_LANGUAGE_ENABLED --data-file=- <<EOF
false
EOF

gcloud secrets versions add VOICE_SHORTCUTS_ENABLED --data-file=- <<EOF
false
EOF

gcloud secrets versions add AVATAR_ANIMATIONS_ENABLED --data-file=- <<EOF
false
EOF

# Sync and restart
./scripts/sync-gcloud-secrets.sh production
./scripts/deploy-bayit.sh production --restart-only
```

### Disable Individual Features

```bash
# Example: Disable proactive suggestions only
gcloud secrets versions add VOICE_PROACTIVE_SUGGESTIONS_ENABLED --data-file=- <<EOF
false
EOF

./scripts/sync-gcloud-secrets.sh production
```

## Monitoring

### Secret Access Audit

```bash
# View secret access logs
gcloud logging read "resource.type=secretmanager_secret AND resource.labels.secret_id=ZEH_ANI_API_KEY" \
  --limit=50 \
  --format=json
```

### Alert on Unauthorized Access

```yaml
# alerts/secret-access.yaml
alerts:
  - name: unauthorized_secret_access
    condition: |
      resource.type="secretmanager_secret"
      AND severity="ERROR"
      AND protoPayload.authenticationInfo.principalEmail!~"@bayit-plus.iam.gserviceaccount.com$"
    severity: critical
    notification: security-team@bayit.tv
```

## Security Best Practices

1. **Rotation Schedule:**
   - Feature flags: No rotation needed (configuration values)
   - Review all secrets quarterly for accuracy

2. **Access Logging:**
   - Enable audit logging for all secrets
   - Alert on access from unknown IPs
   - Review logs monthly

3. **Least Privilege:**
   - Only grant secretAccessor to required service accounts
   - Never use personal accounts for production access
   - Use separate secrets for dev/staging/prod

4. **Backup:**
   - Export secret names (not values) to version control
   - Document secret purpose and dependencies
   - Maintain this documentation

## Troubleshooting

### Secret Not Found

```bash
# Verify secret exists
gcloud secrets describe VOICE_PROACTIVE_SUGGESTIONS_ENABLED

# Create if missing
echo "true" | gcloud secrets create VOICE_PROACTIVE_SUGGESTIONS_ENABLED --replication-policy="automatic" --data-file=-
```

### Permission Denied

```bash
# Check IAM policy
gcloud secrets get-iam-policy VOICE_PROACTIVE_SUGGESTIONS_ENABLED

# Grant access
gcloud secrets add-iam-policy-binding VOICE_PROACTIVE_SUGGESTIONS_ENABLED \
  --member="serviceAccount:SERVICE_ACCOUNT@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Secret Value Not Syncing

```bash
# Force sync to backend
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus
./scripts/deployment/sync-gcloud-secrets.sh backend --force

# Verify .env updated
grep -E "^(VOICE_|AVATAR_)" scripts/backend/.env

# Restart backend service
cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Support

**Questions:** devops@bayit.tv
**Incidents:** oncall-engineering@bayit.tv
**Security Issues:** security@bayit.tv

---

**Document Owner:** DevOps Team
**Last Updated:** 2026-02-12
**Next Review:** 2026-03-12
