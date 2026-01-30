# Google Cloud Secrets - Channel Live Chat

**CRITICAL**: This document lists ALL secrets required for the Channel Live Chat feature. **NEVER edit `.env` files directly**. All secrets MUST be managed through Google Cloud Secret Manager.

**Last Updated**: 2026-01-30
**Owner**: Platform Team
**Related**: [Secrets Management Guide](./SECRETS_MANAGEMENT.md)

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

## Channel Chat Secrets

### 1. Rate Limiting

#### `CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE`
- **Description**: Maximum number of chat messages a single user can send per minute
- **Type**: Integer
- **Default**: 10
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "10" | gcloud secrets create CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 2. Message Constraints

#### `CHANNEL_CHAT_MAX_MESSAGE_LENGTH`
- **Description**: Maximum character length for a single chat message
- **Type**: Integer
- **Default**: 500
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "500" | gcloud secrets create CHANNEL_CHAT_MAX_MESSAGE_LENGTH \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_MESSAGE_LENGTH \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_MESSAGE_LENGTH \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CHANNEL_CHAT_HISTORY_LIMIT`
- **Description**: Maximum number of messages returned by the chat history endpoint per request
- **Type**: Integer
- **Default**: 50
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "50" | gcloud secrets create CHANNEL_CHAT_HISTORY_LIMIT \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_HISTORY_LIMIT \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_HISTORY_LIMIT \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Translation

#### `CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS`
- **Description**: Timeout in seconds for translation API requests
- **Type**: Float
- **Default**: 5.0
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "5.0" | gcloud secrets create CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CHANNEL_CHAT_TRANSLATION_ENABLED`
- **Description**: Global toggle to enable or disable the chat translation feature
- **Type**: Boolean (string: "true" or "false")
- **Default**: true
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "true" | gcloud secrets create CHANNEL_CHAT_TRANSLATION_ENABLED \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_TRANSLATION_ENABLED \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_TRANSLATION_ENABLED \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 4. Session Management

#### `CHANNEL_CHAT_IDLE_TIMEOUT_MINUTES`
- **Description**: Minutes of inactivity before a WebSocket connection is automatically closed
- **Type**: Integer
- **Default**: 30
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "30" | gcloud secrets create CHANNEL_CHAT_IDLE_TIMEOUT_MINUTES \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_IDLE_TIMEOUT_MINUTES \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_IDLE_TIMEOUT_MINUTES \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CHANNEL_CHAT_MESSAGE_RETENTION_DAYS`
- **Description**: Number of days to retain chat messages in MongoDB before automatic cleanup
- **Type**: Integer
- **Default**: 90
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "90" | gcloud secrets create CHANNEL_CHAT_MESSAGE_RETENTION_DAYS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MESSAGE_RETENTION_DAYS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MESSAGE_RETENTION_DAYS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 5. Connection Limits

#### `CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS`
- **Description**: Maximum total concurrent WebSocket connections across all channels
- **Type**: Integer
- **Default**: 10000
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "10000" | gcloud secrets create CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP`
- **Description**: Maximum concurrent WebSocket connections from a single IP address
- **Type**: Integer
- **Default**: 5
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "5" | gcloud secrets create CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER`
- **Description**: Maximum concurrent WebSocket connections per authenticated user account
- **Type**: Integer
- **Default**: 3
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "3" | gcloud secrets create CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 6. Heartbeat

#### `CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS`
- **Description**: Interval in seconds between server-sent ping messages
- **Type**: Integer
- **Default**: 30
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "30" | gcloud secrets create CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS`
- **Description**: Maximum seconds to wait for a pong response before terminating the connection
- **Type**: Integer
- **Default**: 90
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "90" | gcloud secrets create CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=channel-chat
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Secrets Summary

| Secret Name | Type | Default | Category |
|-------------|------|---------|----------|
| `CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE` | int | 10 | Rate Limiting |
| `CHANNEL_CHAT_MAX_MESSAGE_LENGTH` | int | 500 | Message Constraints |
| `CHANNEL_CHAT_HISTORY_LIMIT` | int | 50 | Message Constraints |
| `CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS` | float | 5.0 | Translation |
| `CHANNEL_CHAT_TRANSLATION_ENABLED` | bool | true | Translation |
| `CHANNEL_CHAT_IDLE_TIMEOUT_MINUTES` | int | 30 | Session Management |
| `CHANNEL_CHAT_MESSAGE_RETENTION_DAYS` | int | 90 | Session Management |
| `CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS` | int | 10000 | Connection Limits |
| `CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP` | int | 5 | Connection Limits |
| `CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER` | int | 3 | Connection Limits |
| `CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS` | int | 30 | Heartbeat |
| `CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS` | int | 90 | Heartbeat |

**Total: 12 secrets**

---

## Bulk Creation Script

To create all secrets at once:

```bash
#!/bin/bash
# Create all Channel Chat secrets in Google Cloud Secret Manager

LABELS="env=production,app=bayit-plus,feature=channel-chat"
BACKEND_SA="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com"
CICD_SA="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com"

declare -A SECRETS=(
  ["CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE"]="10"
  ["CHANNEL_CHAT_MAX_MESSAGE_LENGTH"]="500"
  ["CHANNEL_CHAT_HISTORY_LIMIT"]="50"
  ["CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS"]="5.0"
  ["CHANNEL_CHAT_TRANSLATION_ENABLED"]="true"
  ["CHANNEL_CHAT_IDLE_TIMEOUT_MINUTES"]="30"
  ["CHANNEL_CHAT_MESSAGE_RETENTION_DAYS"]="90"
  ["CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS"]="10000"
  ["CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP"]="5"
  ["CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER"]="3"
  ["CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS"]="30"
  ["CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS"]="90"
)

for SECRET_NAME in "${!SECRETS[@]}"; do
  echo "${SECRETS[$SECRET_NAME]}" | gcloud secrets create "$SECRET_NAME" \
    --data-file=- \
    --replication-policy="automatic" \
    --labels="$LABELS"

  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="$BACKEND_SA" \
    --role="roles/secretmanager.secretAccessor"

  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="$CICD_SA" \
    --role="roles/secretmanager.secretAccessor"

  echo "Created and granted access for: $SECRET_NAME"
done

echo "All 12 Channel Chat secrets created successfully."
```

---

## Regeneration and Deployment

After creating or updating secrets:

```bash
# 1. Regenerate .env from Google Cloud secrets
./scripts/sync-gcloud-secrets.sh

# 2. Restart backend service
kubectl rollout restart deployment/bayit-plus-backend

# 3. Verify secrets are loaded
curl http://localhost:8000/health
```

---

## Related Documents

- [Secrets Management Guide](./SECRETS_MANAGEMENT.md) - Global secrets workflow
- [Channel Live Chat Feature](../features/CHANNEL_LIVE_CHAT.md) - Feature overview
- [Channel Chat API Reference](../api/CHANNEL_CHAT_API.md) - API documentation
