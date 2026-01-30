# Google Cloud Secrets - Simplified Hebrew (Ivrit Kalla), Smart Subs & Live Nikud

**CRITICAL**: This document lists ALL secrets required for the Simplified Hebrew, Smart Subs, and Live Nikud features. **NEVER edit `.env` files directly**. All secrets MUST be managed through Google Cloud Secret Manager.

**Last Updated**: 2026-01-30
**Owner**: Platform Team
**Related**: [Secrets Management Guide](./SECRETS_MANAGEMENT.md), [Beta 500 Secrets](./GCLOUD_SECRETS_BETA_500.md)

---

## Workflow Summary

```
1. Add/Update secret in Google Cloud Secret Manager
   |
2. Run ./scripts/sync-gcloud-secrets.sh
   |
3. Restart services
```

---

## Simplified Hebrew (Ivrit Kalla) Secrets

### 1. Feature Toggle

#### `DUBBING_SIMPLIFIED_HEBREW_ENABLED`
- **Description**: Enable/disable the Simplified Hebrew audio feature
- **Type**: Boolean (true/false)
- **Default**: false
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "false" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_ENABLED \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=simplified-hebrew
```

### 2. Voice Configuration

#### `DUBBING_SIMPLIFIED_HEBREW_VOICE_ID`
- **Description**: ElevenLabs voice ID for the simplified Hebrew TTS voice
- **Type**: String
- **Default**: None (must be set)
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "YOUR_ELEVENLABS_VOICE_ID_HERE" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_VOICE_ID \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=simplified-hebrew
```

### 3. Speaking Rate

#### `DUBBING_SIMPLIFIED_HEBREW_SPEAKING_RATE`
- **Description**: TTS speaking rate (0.7 = slower, 1.0 = normal)
- **Type**: Float
- **Default**: 0.8
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "0.8" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_SPEAKING_RATE \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=simplified-hebrew
```

### 4. Vocabulary Level

#### `DUBBING_SIMPLIFIED_HEBREW_VOCABULARY_LEVEL`
- **Description**: Default vocabulary simplification level (alef, bet, gimel)
- **Type**: String
- **Default**: alef
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "alef" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_VOCABULARY_LEVEL \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=simplified-hebrew
```

### 5. Claude Model for Simplification

#### `DUBBING_SIMPLIFIED_HEBREW_CLAUDE_MODEL`
- **Description**: Anthropic Claude model used for Hebrew text simplification
- **Type**: String
- **Default**: claude-sonnet-4-20250514
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "claude-sonnet-4-20250514" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_CLAUDE_MODEL \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=simplified-hebrew
```

### 6. Credit Rate

#### `CREDIT_RATE_SIMPLIFIED_DUBBING`
- **Description**: Beta credits consumed per second for simplified dubbing
- **Type**: Float
- **Default**: 0.8
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "0.8" | gcloud secrets create CREDIT_RATE_SIMPLIFIED_DUBBING \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=simplified-hebrew
```

---

## Smart Subs Secrets

### 7. Feature Toggle

#### `SMART_SUBS_ENABLED`
- **Description**: Enable/disable the Smart Subs (dual-view subtitles) feature
- **Type**: Boolean (true/false)
- **Default**: false
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "false" | gcloud secrets create SMART_SUBS_ENABLED \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

### 8. Shoresh Highlight Color

#### `SMART_SUBS_SHORESH_HIGHLIGHT_COLOR`
- **Description**: Hex color code for shoresh (root letter) highlighting
- **Type**: String (hex color)
- **Default**: #FFD700 (gold)
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "#FFD700" | gcloud secrets create SMART_SUBS_SHORESH_HIGHLIGHT_COLOR \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

### 9. Shoresh Cache TTL

#### `SMART_SUBS_SHORESH_CACHE_TTL_SECONDS`
- **Description**: Redis cache TTL for shoresh analysis results
- **Type**: Integer (seconds)
- **Default**: 86400 (24 hours)
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "86400" | gcloud secrets create SMART_SUBS_SHORESH_CACHE_TTL_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

### 10. Shoresh Claude Model

#### `SMART_SUBS_SHORESH_CLAUDE_MODEL`
- **Description**: Anthropic Claude model used for shoresh analysis fallback
- **Type**: String
- **Default**: claude-haiku-4-20250514
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "claude-haiku-4-20250514" | gcloud secrets create SMART_SUBS_SHORESH_CLAUDE_MODEL \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

### 11. Display Duration

#### `SMART_SUBS_DUAL_SUBTITLE_DISPLAY_DURATION_MS`
- **Description**: How long dual subtitles stay visible (milliseconds)
- **Type**: Integer
- **Default**: 5000 (5 seconds)
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "5000" | gcloud secrets create SMART_SUBS_DUAL_SUBTITLE_DISPLAY_DURATION_MS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

### 12. Minimum Age

#### `SMART_SUBS_MIN_AGE_FOR_SMART_SUBS`
- **Description**: Minimum recommended age for Smart Subs feature
- **Type**: Integer
- **Default**: 10
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "10" | gcloud secrets create SMART_SUBS_MIN_AGE_FOR_SMART_SUBS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

### 13. Credit Rate

#### `CREDIT_RATE_SMART_SUBS`
- **Description**: Beta credits consumed per second for Smart Subs
- **Type**: Float
- **Default**: 0.6
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "0.6" | gcloud secrets create CREDIT_RATE_SMART_SUBS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=smart-subs
```

---

## Live Nikud Secrets

### 14. Feature Toggle

#### `LIVE_NIKUD_ENABLED`
- **Description**: Enable/disable the Live Nikud (vocalized Hebrew subtitles) feature
- **Type**: Boolean (true/false)
- **Default**: false
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "false" | gcloud secrets create LIVE_NIKUD_ENABLED \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=live-nikud
```

### 15. Claude Model for Nikud

#### `LIVE_NIKUD_CLAUDE_MODEL`
- **Description**: Anthropic Claude model used for nikud vocalization
- **Type**: String
- **Default**: claude-3-haiku-20240307
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "claude-3-haiku-20240307" | gcloud secrets create LIVE_NIKUD_CLAUDE_MODEL \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=live-nikud
```

### 16. Claude Max Tokens

#### `LIVE_NIKUD_CLAUDE_MAX_TOKENS`
- **Description**: Maximum tokens for Claude nikud response
- **Type**: Integer
- **Default**: 500
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "500" | gcloud secrets create LIVE_NIKUD_CLAUDE_MAX_TOKENS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=live-nikud
```

### 17. Cache TTL

#### `LIVE_NIKUD_CACHE_TTL_SECONDS`
- **Description**: Redis cache TTL for nikud results
- **Type**: Integer (seconds)
- **Default**: 86400 (24 hours)
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "86400" | gcloud secrets create LIVE_NIKUD_CACHE_TTL_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=live-nikud
```

### 18. Display Duration

#### `LIVE_NIKUD_DISPLAY_DURATION_MS`
- **Description**: How long nikud subtitles stay visible (milliseconds)
- **Type**: Integer
- **Default**: 5000 (5 seconds)
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "5000" | gcloud secrets create LIVE_NIKUD_DISPLAY_DURATION_MS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=live-nikud
```

### 19. Credit Rate

#### `CREDIT_RATE_LIVE_NIKUD`
- **Description**: Beta credits consumed per second for Live Nikud
- **Type**: Float
- **Default**: 0.4
- **Required**: No
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "0.4" | gcloud secrets create CREDIT_RATE_LIVE_NIKUD \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=live-nikud
```

---

## Batch Setup Script

Run all secrets at once for initial setup:

```bash
# Simplified Hebrew secrets
echo "false" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_ENABLED --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=simplified-hebrew
echo "YOUR_ELEVENLABS_VOICE_ID" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_VOICE_ID --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=simplified-hebrew
echo "0.8" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_SPEAKING_RATE --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=simplified-hebrew
echo "alef" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_VOCABULARY_LEVEL --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=simplified-hebrew
echo "claude-sonnet-4-20250514" | gcloud secrets create DUBBING_SIMPLIFIED_HEBREW_CLAUDE_MODEL --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=simplified-hebrew
echo "0.8" | gcloud secrets create CREDIT_RATE_SIMPLIFIED_DUBBING --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=simplified-hebrew

# Smart Subs secrets
echo "false" | gcloud secrets create SMART_SUBS_ENABLED --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs
echo "#FFD700" | gcloud secrets create SMART_SUBS_SHORESH_HIGHLIGHT_COLOR --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs
echo "86400" | gcloud secrets create SMART_SUBS_SHORESH_CACHE_TTL_SECONDS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs
echo "claude-haiku-4-20250514" | gcloud secrets create SMART_SUBS_SHORESH_CLAUDE_MODEL --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs
echo "5000" | gcloud secrets create SMART_SUBS_DUAL_SUBTITLE_DISPLAY_DURATION_MS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs
echo "10" | gcloud secrets create SMART_SUBS_MIN_AGE_FOR_SMART_SUBS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs
echo "0.6" | gcloud secrets create CREDIT_RATE_SMART_SUBS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=smart-subs

# Live Nikud secrets
echo "false" | gcloud secrets create LIVE_NIKUD_ENABLED --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=live-nikud
echo "claude-3-haiku-20240307" | gcloud secrets create LIVE_NIKUD_CLAUDE_MODEL --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=live-nikud
echo "500" | gcloud secrets create LIVE_NIKUD_CLAUDE_MAX_TOKENS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=live-nikud
echo "86400" | gcloud secrets create LIVE_NIKUD_CACHE_TTL_SECONDS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=live-nikud
echo "5000" | gcloud secrets create LIVE_NIKUD_DISPLAY_DURATION_MS --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=live-nikud
echo "0.4" | gcloud secrets create CREDIT_RATE_LIVE_NIKUD --data-file=- --replication-policy="automatic" --labels=env=production,app=bayit-plus,feature=live-nikud

# Grant access to service account
gcloud secrets add-iam-policy-binding DUBBING_SIMPLIFIED_HEBREW_ENABLED \
  --member="serviceAccount:bayit-plus-backend@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Regenerate .env
./scripts/sync-gcloud-secrets.sh

# Restart services
kubectl rollout restart deployment/bayit-plus-backend
```

---

## Verification

After setting secrets and restarting:

```bash
# Check simplified Hebrew status
curl -s http://localhost:8000/api/v1/live/{channel_id}/simplified-hebrew/status | jq .

# Check Smart Subs status
curl -s http://localhost:8000/api/v1/live/{channel_id}/smart-subs/status | jq .

# Check Live Nikud status
curl -s http://localhost:8000/api/v1/live/{channel_id}/nikud/status | jq .
```
