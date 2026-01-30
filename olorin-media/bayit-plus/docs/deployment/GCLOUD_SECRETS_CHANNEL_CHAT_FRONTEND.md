# Google Cloud Secrets - Channel Chat Frontend Configuration

**Created**: 2026-01-30
**Status**: Active
**Platform**: Web Frontend (Vite + React)

## Overview

This document lists all Google Cloud Secret Manager secrets required for the Channel Chat feature on the web frontend. These secrets configure chat behavior, auto-hide timers, retry logic, and UI thresholds.

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md) - Complete workflow and best practices
- [Channel Chat Architecture](../architecture/CHANNEL_CHAT.md) - System design

## Required Secrets

### 1. VITE_CHAT_MAX_MESSAGE_LENGTH

**Description**: Maximum character length for a single chat message
**Type**: Integer
**Default**: 280
**Valid Range**: 1-2000
**Required**: No (safe default provided)

**Purpose**: Limits chat message length to prevent spam and maintain UI readability.

**GCloud Commands**:
```bash
# Create secret
echo "280" | gcloud secrets create VITE_CHAT_MAX_MESSAGE_LENGTH \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access to web frontend service account
gcloud secrets add-iam-policy-binding VITE_CHAT_MAX_MESSAGE_LENGTH \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update secret value
echo "500" | gcloud secrets versions add VITE_CHAT_MAX_MESSAGE_LENGTH \
  --data-file=- \
  --project=bayit-plus-prod
```

---

### 2. VITE_CHAT_AUTO_HIDE_MS

**Description**: Auto-hide timer for expanded chat panel (milliseconds)
**Type**: Integer
**Default**: 10000 (10 seconds)
**Valid Range**: 1000-60000 (1-60 seconds)
**Required**: No (safe default provided)

**Purpose**: Automatically collapses the expanded chat panel after inactivity to preserve screen space.

**GCloud Commands**:
```bash
# Create secret
echo "10000" | gcloud secrets create VITE_CHAT_AUTO_HIDE_MS \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access
gcloud secrets add-iam-policy-binding VITE_CHAT_AUTO_HIDE_MS \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update value (e.g., 15 seconds)
echo "15000" | gcloud secrets versions add VITE_CHAT_AUTO_HIDE_MS \
  --data-file=- \
  --project=bayit-plus-prod
```

---

### 3. VITE_CHAT_MAX_MESSAGES

**Description**: Maximum number of messages stored per channel
**Type**: Integer
**Default**: 200
**Valid Range**: 50-1000
**Required**: No (safe default provided)

**Purpose**: Limits message history to prevent memory bloat and maintain performance.

**GCloud Commands**:
```bash
# Create secret
echo "200" | gcloud secrets create VITE_CHAT_MAX_MESSAGES \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access
gcloud secrets add-iam-policy-binding VITE_CHAT_MAX_MESSAGES \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update value
echo "300" | gcloud secrets versions add VITE_CHAT_MAX_MESSAGES \
  --data-file=- \
  --project=bayit-plus-prod
```

---

### 4. VITE_CHAT_MAX_RETRIES

**Description**: Maximum WebSocket reconnection attempts
**Type**: Integer
**Default**: 5
**Valid Range**: 1-20
**Required**: No (safe default provided)

**Purpose**: Limits reconnection attempts to prevent infinite retry loops.

**GCloud Commands**:
```bash
# Create secret
echo "5" | gcloud secrets create VITE_CHAT_MAX_RETRIES \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access
gcloud secrets add-iam-policy-binding VITE_CHAT_MAX_RETRIES \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update value
echo "10" | gcloud secrets versions add VITE_CHAT_MAX_RETRIES \
  --data-file=- \
  --project=bayit-plus-prod
```

---

### 5. VITE_CHAT_BASE_DELAY

**Description**: Base delay for exponential backoff reconnection (milliseconds)
**Type**: Integer
**Default**: 1000 (1 second)
**Valid Range**: 500-10000 (0.5-10 seconds)
**Required**: No (safe default provided)

**Purpose**: Initial delay before first reconnection attempt. Delay doubles with each retry (exponential backoff).

**GCloud Commands**:
```bash
# Create secret
echo "1000" | gcloud secrets create VITE_CHAT_BASE_DELAY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access
gcloud secrets add-iam-policy-binding VITE_CHAT_BASE_DELAY \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update value (e.g., 2 seconds)
echo "2000" | gcloud secrets versions add VITE_CHAT_BASE_DELAY \
  --data-file=- \
  --project=bayit-plus-prod
```

---

### 6. VITE_CHAT_MAX_DELAY

**Description**: Maximum delay cap for exponential backoff (milliseconds)
**Type**: Integer
**Default**: 30000 (30 seconds)
**Valid Range**: 5000-120000 (5-120 seconds)
**Required**: No (safe default provided)

**Purpose**: Caps exponential backoff to prevent excessively long delays between retries.

**GCloud Commands**:
```bash
# Create secret
echo "30000" | gcloud secrets create VITE_CHAT_MAX_DELAY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access
gcloud secrets add-iam-policy-binding VITE_CHAT_MAX_DELAY \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update value (e.g., 60 seconds)
echo "60000" | gcloud secrets versions add VITE_CHAT_MAX_DELAY \
  --data-file=- \
  --project=bayit-plus-prod
```

---

### 7. VITE_LOW_BALANCE_THRESHOLD

**Description**: Credit balance threshold for low balance warning
**Type**: Integer
**Default**: 10
**Valid Range**: 1-100
**Required**: No (safe default provided)

**Purpose**: Displays warning in Catch-Up overlay when user's credit balance falls below threshold.

**GCloud Commands**:
```bash
# Create secret
echo "10" | gcloud secrets create VITE_LOW_BALANCE_THRESHOLD \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus-prod

# Grant access
gcloud secrets add-iam-policy-binding VITE_LOW_BALANCE_THRESHOLD \
  --member="serviceAccount:bayit-plus-web@bayit-plus-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-prod

# Update value
echo "20" | gcloud secrets versions add VITE_LOW_BALANCE_THRESHOLD \
  --data-file=- \
  --project=bayit-plus-prod
```

---

## Deployment Workflow

### 1. Add/Update Secrets in Google Cloud

```bash
# Run commands above for each secret
# OR use bulk import script (see SECRETS_MANAGEMENT.md)
```

### 2. Regenerate Frontend .env

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus
./scripts/sync-gcloud-secrets.sh frontend
```

This will:
- Fetch all `VITE_*` secrets from Google Cloud Secret Manager
- Generate `web/.env` with latest values
- Validate all required secrets are present

### 3. Rebuild and Deploy

```bash
# Development - restart Vite dev server
cd web
npm start

# Production - rebuild and deploy
npm run build
firebase deploy --only hosting
```

### 4. Verify Configuration

```bash
# Check loaded config in browser console
# Web app logs config on startup via logger.scope('ChannelChatConfig')
```

---

## Secret Dependencies

These secrets are referenced by:

**Files**:
- `web/src/config/channelChatConfig.ts` - Configuration loader
- `web/src/components/player/chat/ChannelChatPanel.tsx` - Chat panel UI
- `web/src/components/player/hooks/useChannelChat.ts` - WebSocket hook
- `web/src/components/player/catchup/CatchUpOverlay.tsx` - Catch-Up UI
- `web/src/stores/channelChatSlice.ts` - Zustand store

**Environment**:
- Development: `web/.env.local` (regenerated from GCloud)
- Staging: GCloud Secret Manager (auto-injected)
- Production: GCloud Secret Manager (auto-injected)

---

## Validation

After updating secrets, verify configuration is loaded correctly:

```typescript
// In browser console or via logger
import { channelChatConfig } from '@/config/channelChatConfig'
console.log(channelChatConfig)

// Expected output:
{
  maxMessageLength: 280,
  autoHideMs: 10000,
  maxMessages: 200,
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  lowBalanceThreshold: 10
}
```

---

## Rollback

If a secret update causes issues, rollback to previous version:

```bash
# List versions
gcloud secrets versions list VITE_CHAT_MAX_MESSAGE_LENGTH --project=bayit-plus-prod

# Disable bad version
gcloud secrets versions disable <VERSION_NUMBER> \
  --secret=VITE_CHAT_MAX_MESSAGE_LENGTH \
  --project=bayit-plus-prod

# Regenerate .env and redeploy
./scripts/sync-gcloud-secrets.sh frontend
```

---

## Security Notes

- All secrets use automatic replication for high availability
- Access restricted to web frontend service account only
- Secrets are never committed to version control
- `.env` files are gitignored and regenerated from GCloud
- Safe defaults ensure app remains functional if secrets are missing

---

## Related Secrets

**Backend Channel Chat Secrets** (separate document):
- `CHANNEL_CHAT_WS_URL` - WebSocket server URL
- `CHANNEL_CHAT_SESSION_TIMEOUT` - Session timeout
- `CHANNEL_CHAT_RATE_LIMIT` - Message rate limiting

**Beta 500 Credit Secrets**:
- See [GCLOUD_SECRETS_BETA_CREDITS.md](GCLOUD_SECRETS_BETA_CREDITS.md)

---

## Maintenance

**Review Frequency**: Quarterly
**Owner**: Frontend Team
**Last Updated**: 2026-01-30
