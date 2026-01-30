# Google Cloud Secrets - AI Catch-Up Summaries

**CRITICAL**: This document lists ALL secrets required for the AI Catch-Up Summaries feature. **NEVER edit `.env` files directly**. All secrets MUST be managed through Google Cloud Secret Manager.

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

## Backend Secrets

### 1. Feature Toggle

#### `CATCHUP_ENABLED`
- **Description**: Global toggle to enable or disable the catch-up summaries feature
- **Type**: Boolean (string: "true" or "false")
- **Default**: true
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "true" | gcloud secrets create CATCHUP_ENABLED \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_ENABLED \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_ENABLED \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 2. Credit System

#### `CATCHUP_CREDIT_COST`
- **Description**: Number of credits deducted per catch-up summary generation
- **Type**: Float
- **Default**: 5.0
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "5.0" | gcloud secrets create CATCHUP_CREDIT_COST \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_CREDIT_COST \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_CREDIT_COST \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Trigger Configuration

#### `CATCHUP_AUTO_TRIGGER_MINUTES`
- **Description**: Minimum minutes a channel must be live before the auto-prompt is triggered for joining users
- **Type**: Integer
- **Default**: 5
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "5" | gcloud secrets create CATCHUP_AUTO_TRIGGER_MINUTES \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_AUTO_TRIGGER_MINUTES \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_AUTO_TRIGGER_MINUTES \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CATCHUP_DEFAULT_WINDOW_MINUTES`
- **Description**: Default time window (in minutes) for summary generation when not specified by the client
- **Type**: Integer
- **Default**: 15
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "15" | gcloud secrets create CATCHUP_DEFAULT_WINDOW_MINUTES \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_DEFAULT_WINDOW_MINUTES \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_DEFAULT_WINDOW_MINUTES \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 4. Caching

#### `CATCHUP_CACHE_TTL_SECONDS`
- **Description**: Time-to-live in seconds for cached summaries before regeneration is required
- **Type**: Integer
- **Default**: 180
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "180" | gcloud secrets create CATCHUP_CACHE_TTL_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_CACHE_TTL_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_CACHE_TTL_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CATCHUP_WINDOW_QUANTIZATION_SECONDS`
- **Description**: Time window rounding interval in seconds for cache key generation (improves cache hit rate)
- **Type**: Integer
- **Default**: 60
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "60" | gcloud secrets create CATCHUP_WINDOW_QUANTIZATION_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_WINDOW_QUANTIZATION_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_WINDOW_QUANTIZATION_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 5. Summary Constraints

#### `CATCHUP_MAX_SUMMARY_TOKENS`
- **Description**: Maximum number of tokens for LLM summary generation
- **Type**: Integer
- **Default**: 300
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "300" | gcloud secrets create CATCHUP_MAX_SUMMARY_TOKENS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_MAX_SUMMARY_TOKENS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_MAX_SUMMARY_TOKENS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CATCHUP_MAX_SUMMARY_KEY_POINTS`
- **Description**: Maximum number of key points included in a summary
- **Type**: Integer
- **Default**: 5
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "5" | gcloud secrets create CATCHUP_MAX_SUMMARY_KEY_POINTS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_MAX_SUMMARY_KEY_POINTS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_MAX_SUMMARY_KEY_POINTS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `CATCHUP_MAX_SUMMARY_CHARS`
- **Description**: Maximum character length for the summary text
- **Type**: Integer
- **Default**: 500
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "500" | gcloud secrets create CATCHUP_MAX_SUMMARY_CHARS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_MAX_SUMMARY_CHARS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_MAX_SUMMARY_CHARS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 6. Data Requirements

#### `CATCHUP_MIN_DATA_SECONDS`
- **Description**: Minimum seconds of transcript data required before a summary can be generated
- **Type**: Integer
- **Default**: 60
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "60" | gcloud secrets create CATCHUP_MIN_DATA_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_MIN_DATA_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_MIN_DATA_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 7. Rate Limiting

#### `CATCHUP_RETRY_AFTER_SECONDS`
- **Description**: Seconds a user must wait after a quota-exceeded error before retrying
- **Type**: Integer
- **Default**: 300
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "300" | gcloud secrets create CATCHUP_RETRY_AFTER_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_RETRY_AFTER_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_RETRY_AFTER_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 8. Transcript Buffer

#### `CATCHUP_TRANSCRIPT_BUFFER_MAX_MINUTES`
- **Description**: Maximum minutes of transcript data retained in the rolling buffer per channel
- **Type**: Integer
- **Default**: 15
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "15" | gcloud secrets create CATCHUP_TRANSCRIPT_BUFFER_MAX_MINUTES \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_TRANSCRIPT_BUFFER_MAX_MINUTES \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_TRANSCRIPT_BUFFER_MAX_MINUTES \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 9. UI Behavior

#### `CATCHUP_AUTO_DISMISS_SECONDS`
- **Description**: Seconds before the catch-up overlay auto-dismisses on the frontend
- **Type**: Integer
- **Default**: 22
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "22" | gcloud secrets create CATCHUP_AUTO_DISMISS_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=catchup
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding CATCHUP_AUTO_DISMISS_SECONDS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CATCHUP_AUTO_DISMISS_SECONDS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Frontend Environment Variables (Vite)

The following Vite environment variables are set at **build time** and sourced from the corresponding backend secrets. They are injected into the web frontend bundle during the build process.

| Vite Variable | Source Secret | Description |
|---------------|--------------|-------------|
| `VITE_CATCHUP_ENABLED` | `CATCHUP_ENABLED` | Feature toggle for web UI |
| `VITE_CATCHUP_CREDIT_COST` | `CATCHUP_CREDIT_COST` | Credit cost displayed in the UI |
| `VITE_CATCHUP_AUTO_DISMISS_SECONDS` | `CATCHUP_AUTO_DISMISS_SECONDS` | Auto-dismiss timer for overlay |
| `VITE_CATCHUP_DEFAULT_WINDOW_MINUTES` | `CATCHUP_DEFAULT_WINDOW_MINUTES` | Default window shown in UI |
| `VITE_CATCHUP_AUTO_TRIGGER_MINUTES` | `CATCHUP_AUTO_TRIGGER_MINUTES` | Threshold for auto-prompt logic |

These are set in the CI/CD build pipeline by reading the corresponding secrets from Google Cloud Secret Manager and injecting them as environment variables during `npm run build`.

---

## Backend Secrets Summary

| Secret Name | Type | Default | Category |
|-------------|------|---------|----------|
| `CATCHUP_ENABLED` | bool | true | Feature Toggle |
| `CATCHUP_CREDIT_COST` | float | 5.0 | Credit System |
| `CATCHUP_AUTO_TRIGGER_MINUTES` | int | 5 | Trigger Configuration |
| `CATCHUP_DEFAULT_WINDOW_MINUTES` | int | 15 | Trigger Configuration |
| `CATCHUP_CACHE_TTL_SECONDS` | int | 180 | Caching |
| `CATCHUP_WINDOW_QUANTIZATION_SECONDS` | int | 60 | Caching |
| `CATCHUP_MAX_SUMMARY_TOKENS` | int | 300 | Summary Constraints |
| `CATCHUP_MAX_SUMMARY_KEY_POINTS` | int | 5 | Summary Constraints |
| `CATCHUP_MAX_SUMMARY_CHARS` | int | 500 | Summary Constraints |
| `CATCHUP_MIN_DATA_SECONDS` | int | 60 | Data Requirements |
| `CATCHUP_RETRY_AFTER_SECONDS` | int | 300 | Rate Limiting |
| `CATCHUP_TRANSCRIPT_BUFFER_MAX_MINUTES` | int | 15 | Transcript Buffer |
| `CATCHUP_AUTO_DISMISS_SECONDS` | int | 22 | UI Behavior |

**Total: 13 backend secrets + 5 frontend build variables**

---

## Bulk Creation Script

To create all secrets at once:

```bash
#!/bin/bash
# Create all Catch-Up secrets in Google Cloud Secret Manager

LABELS="env=production,app=bayit-plus,feature=catchup"
BACKEND_SA="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com"
CICD_SA="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com"

declare -A SECRETS=(
  ["CATCHUP_ENABLED"]="true"
  ["CATCHUP_CREDIT_COST"]="5.0"
  ["CATCHUP_AUTO_TRIGGER_MINUTES"]="5"
  ["CATCHUP_DEFAULT_WINDOW_MINUTES"]="15"
  ["CATCHUP_CACHE_TTL_SECONDS"]="180"
  ["CATCHUP_WINDOW_QUANTIZATION_SECONDS"]="60"
  ["CATCHUP_MAX_SUMMARY_TOKENS"]="300"
  ["CATCHUP_MAX_SUMMARY_KEY_POINTS"]="5"
  ["CATCHUP_MAX_SUMMARY_CHARS"]="500"
  ["CATCHUP_MIN_DATA_SECONDS"]="60"
  ["CATCHUP_RETRY_AFTER_SECONDS"]="300"
  ["CATCHUP_TRANSCRIPT_BUFFER_MAX_MINUTES"]="15"
  ["CATCHUP_AUTO_DISMISS_SECONDS"]="22"
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

echo "All 13 Catch-Up secrets created successfully."
```

---

## Regeneration and Deployment

After creating or updating secrets:

```bash
# 1. Regenerate .env from Google Cloud secrets
./scripts/sync-gcloud-secrets.sh

# 2. Restart backend service
kubectl rollout restart deployment/bayit-plus-backend

# 3. Rebuild web frontend (picks up VITE_ variables)
cd web && npm run build

# 4. Deploy web frontend
firebase deploy --only hosting

# 5. Verify secrets are loaded
curl http://localhost:8000/health
```

---

## Related Documents

- [Secrets Management Guide](./SECRETS_MANAGEMENT.md) - Global secrets workflow
- [AI Catch-Up Summaries Feature](../features/AI_CATCH_UP_SUMMARIES.md) - Feature overview
- [Catch-Up API Reference](../api/CATCH_UP_API.md) - API documentation
