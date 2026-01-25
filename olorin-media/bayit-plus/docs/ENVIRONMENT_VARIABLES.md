# Bayit+ Environment Variables Reference

**Last Updated:** 2026-01-24
**Version:** 1.0.0
**Schema:** `/.env.schema.json`

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Variables](#backend-variables)
3. [Web Application Variables](#web-application-variables)
4. [Partner Portal Variables](#partner-portal-variables)
5. [CLI Variables](#cli-variables)
6. [Security Best Practices](#security-best-practices)
7. [Environment Files](#environment-files)
8. [Validation](#validation)

---

## Overview

Bayit+ uses environment variables for all configuration. This ensures:
- ✅ No hardcoded values in code
- ✅ Different configurations for development, staging, production
- ✅ Secrets managed separately from code
- ✅ Easy deployment across environments

### Quick Reference

| Service | Env File | Required Vars | Optional Vars |
|---------|----------|---------------|---------------|
| **Backend** | `backend/.env` | 8 | 50+ |
| **Web App** | `web/.env` | 1 | 15+ |
| **Partner Portal** | `partner-portal/.env` | 2 | 6 |
| **CLI** | System env | 0 | 9 |

---

## Backend Variables

**File:** `backend/.env`
**Example:** `backend/.env.example`

### Security & Authentication (CRITICAL)

#### `SECRET_KEY` ⚠️ REQUIRED, SENSITIVE

**Description:** Secret key for JWT token signing
**Type:** String (minimum 32 characters)
**Example:**
```bash
SECRET_KEY=your-super-secret-key-here-at-least-32-characters-long
```

**Generate securely:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**⚠️ WARNING:**
- MUST be at least 32 characters
- NEVER use default values
- NEVER commit to version control
- Use different keys for dev/staging/production

---

#### `DEBUG` ⚠️ REQUIRED

**Description:** Debug mode flag
**Type:** Boolean (`true` or `false`)
**Default:** `false`
**Production:** MUST be `false`

```bash
# Development
DEBUG=true

# Production
DEBUG=false
```

**When true:**
- Enables detailed error messages
- Allows localhost CORS
- Disables some security checks

**When false:**
- Requires all configuration to be explicitly set
- Enables strict CORS
- Production-ready error handling

---

#### `LOG_LEVEL` - Optional

**Description:** Logging verbosity level
**Type:** String
**Options:** `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
**Default:** `INFO`

```bash
# Development
LOG_LEVEL=DEBUG

# Production
LOG_LEVEL=INFO
```

---

### Database (CRITICAL)

#### `MONGODB_URI` ⚠️ REQUIRED, SENSITIVE

**Description:** MongoDB connection string
**Type:** String (must start with `mongodb://` or `mongodb+srv://`)

```bash
# MongoDB Atlas (production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bayit_plus

# Self-hosted MongoDB
MONGODB_URI=mongodb://localhost:27017

# With options
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bayit_plus?retryWrites=true&w=majority
```

**⚠️ SECURITY:**
- NEVER use localhost in production
- Use strong passwords (20+ characters)
- Enable IP whitelisting on MongoDB Atlas
- Use TLS/SSL in production

---

#### `MONGODB_DB_NAME` ⚠️ REQUIRED

**Description:** MongoDB database name
**Type:** String
**Default:** `bayit_plus`

```bash
MONGODB_DB_NAME=bayit_plus
```

---

### Google Cloud (REQUIRED)

#### `GCP_PROJECT_ID` ⚠️ REQUIRED

**Description:** Google Cloud Project ID
**Type:** String

```bash
GCP_PROJECT_ID=bayit-plus-prod
```

**Used for:**
- Google Cloud Storage
- Cloud Speech-to-Text
- Cloud Translation API
- Firebase services

---

#### `GCS_BUCKET_NAME` - Optional (required if `STORAGE_TYPE=gcs`)

**Description:** Google Cloud Storage bucket for media files
**Type:** String

```bash
GCS_BUCKET_NAME=bayit-plus-media
```

---

#### `CDN_BASE_URL` - Optional

**Description:** CDN base URL for serving media
**Type:** String (must be valid URL)

```bash
CDN_BASE_URL=https://cdn.bayit.tv
```

---

#### `STORAGE_TYPE` - Optional

**Description:** Storage backend type
**Type:** String
**Options:** `local`, `s3`, `gcs`
**Default:** `gcs`

```bash
# Development
STORAGE_TYPE=local

# Production
STORAGE_TYPE=gcs
```

---

### Frontend URLs (REQUIRED)

#### `FRONTEND_URL` ⚠️ REQUIRED

**Description:** Frontend URL for password reset/verification links
**Type:** String (must be valid URL)

```bash
FRONTEND_URL=https://bayit.tv
```

**Used in:**
- Password reset emails
- Email verification links
- Magic link authentication

---

#### `FRONTEND_WEB_URL` ⚠️ REQUIRED

**Description:** Web frontend URL for verification links
**Type:** String (must be valid URL)

```bash
FRONTEND_WEB_URL=https://bayit.tv
```

---

#### `FRONTEND_MOBILE_URL` - Optional

**Description:** Mobile app deep link scheme
**Type:** String
**Default:** `bayitplus://`

```bash
FRONTEND_MOBILE_URL=bayitplus://
```

---

### CORS Configuration (CRITICAL FOR PRODUCTION)

#### `BACKEND_CORS_ORIGINS` ⚠️ REQUIRED in production

**Description:** Allowed CORS origins
**Type:** String (JSON array or comma-separated)

**JSON format:**
```bash
BACKEND_CORS_ORIGINS='["https://bayit.tv","https://www.bayit.tv","https://api.bayit.tv"]'
```

**CSV format:**
```bash
BACKEND_CORS_ORIGINS=https://bayit.tv,https://www.bayit.tv
```

**Development (DEBUG=true):**
```bash
# Defaults to localhost ports when DEBUG=true
# No need to set explicitly in development
```

---

### AI Services (REQUIRED)

#### `ANTHROPIC_API_KEY` ⚠️ REQUIRED, SENSITIVE

**Description:** Anthropic Claude API key (Bayit+-specific)
**Type:** String (must start with `sk-ant-`)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**⚠️ SECURITY:**
- Use platform-specific keys (`bayit-anthropic-api-key`)
- Separate from Fraud/CVPlus/Station AI keys
- Rotate regularly
- Monitor usage

---

#### `CLAUDE_MODEL` - Optional

**Description:** Claude model to use
**Type:** String
**Default:** `claude-sonnet-4-20250514`

```bash
CLAUDE_MODEL=claude-sonnet-4-20250514
```

---

#### `OPENAI_API_KEY` ⚠️ REQUIRED, SENSITIVE

**Description:** OpenAI API key (Bayit+-specific)
**Type:** String (must start with `sk-`)

```bash
OPENAI_API_KEY=sk-your-key-here
```

---

#### `ELEVENLABS_API_KEY` ⚠️ REQUIRED, SENSITIVE

**Description:** ElevenLabs API key for text-to-speech and speech-to-text
**Type:** String

```bash
ELEVENLABS_API_KEY=your-elevenlabs-key-here
```

---

#### `SPEECH_TO_TEXT_PROVIDER` - Optional

**Description:** Speech-to-text provider
**Type:** String
**Options:** `google`, `whisper`, `elevenlabs`
**Default:** `google`

```bash
SPEECH_TO_TEXT_PROVIDER=google
```

---

#### `LIVE_TRANSLATION_PROVIDER` - Optional

**Description:** Live translation provider
**Type:** String
**Options:** `google`, `openai`, `claude`
**Default:** `google`

```bash
LIVE_TRANSLATION_PROVIDER=google
```

---

### Live Feature Quotas - Optional

Per-user usage limits for live subtitles and live dubbing features.

#### Premium Tier Quotas

```bash
# Subtitle quotas (minutes)
LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_HOUR=60
LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_DAY=240
LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_MONTH=2000

# Dubbing quotas (minutes)
LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_HOUR=30
LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_DAY=120
LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_MONTH=1000
```

#### Family Tier Quotas (2x Premium)

```bash
LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_HOUR=120
LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_DAY=480
LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_MONTH=4000

LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_HOUR=60
LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_DAY=240
LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_MONTH=2000
```

---

### Podcast Translation - Optional

#### `PODCAST_TRANSLATION_ENABLED`

**Description:** Enable automatic podcast translation
**Type:** Boolean
**Default:** `true`

```bash
PODCAST_TRANSLATION_ENABLED=true
```

---

#### `PODCAST_TRANSLATION_POLL_INTERVAL`

**Description:** Polling interval in seconds for translation worker
**Type:** Integer
**Default:** `300` (5 minutes)
**Minimum:** `60`

```bash
PODCAST_TRANSLATION_POLL_INTERVAL=300
```

---

## Web Application Variables

**File:** `web/.env`
**Example:** `web/.env.example`

### Application Mode

#### `VITE_APP_MODE` - Optional

**Description:** App mode
**Type:** String
**Options:** `demo`, `production`
**Default:** `demo`

```bash
# Use mock data (development)
VITE_APP_MODE=demo

# Use real API (production)
VITE_APP_MODE=production
```

---

### API Configuration

#### `VITE_API_URL` ⚠️ REQUIRED

**Description:** Backend API base URL
**Type:** String (must be valid URL)

```bash
# Development
VITE_API_URL=http://localhost:8090/api/v1

# Production
VITE_API_URL=https://api.bayit.tv/api/v1
```

---

### Payment Integration

#### `VITE_STRIPE_PUBLIC_KEY` - Optional

**Description:** Stripe public key
**Type:** String (must start with `pk_test_` or `pk_live_`)

```bash
# Development
VITE_STRIPE_PUBLIC_KEY=pk_test_51...

# Production
VITE_STRIPE_PUBLIC_KEY=pk_live_51...
```

---

### Observability

#### `VITE_SENTRY_DSN` - Optional, Sensitive

**Description:** Sentry DSN for error tracking

```bash
VITE_SENTRY_DSN=https://abc123@sentry.io/123456
```

---

#### `VITE_SENTRY_ENVIRONMENT` - Optional

**Description:** Sentry environment
**Options:** `development`, `staging`, `production`
**Default:** `development`

```bash
VITE_SENTRY_ENVIRONMENT=production
```

---

#### `VITE_LOG_LEVEL` - Optional

**Description:** Frontend logging level
**Options:** `debug`, `info`, `warn`, `error`
**Default:** `info`

```bash
VITE_LOG_LEVEL=info
```

---

### Live Dubbing Feature

#### `VITE_DUBBING_SYNC_DELAY_MS` - Optional

**Description:** Default sync delay for video synchronization (ms)
**Type:** Integer
**Default:** `600`
**Minimum:** `0`

```bash
VITE_DUBBING_SYNC_DELAY_MS=600
```

---

## Partner Portal Variables

**File:** `partner-portal/.env`
**Example:** `partner-portal/.env.example`

### API Configuration

#### `VITE_B2B_API_BASE_URL` ⚠️ REQUIRED

**Description:** Backend API base URL for B2B portal
**Type:** String (must be valid URL)

```bash
VITE_B2B_API_BASE_URL=https://api.bayit.tv
```

---

#### `VITE_B2B_DOCS_URL` ⚠️ REQUIRED

**Description:** Documentation URL for partners
**Type:** String (must be valid URL)

```bash
VITE_B2B_DOCS_URL=https://docs.bayit.tv/partners
```

---

#### `VITE_B2B_REQUEST_TIMEOUT_MS` - Optional

**Description:** Request timeout in milliseconds
**Type:** Integer
**Default:** `30000`
**Minimum:** `1000`

```bash
VITE_B2B_REQUEST_TIMEOUT_MS=30000
```

---

#### `VITE_B2B_DEFAULT_LANGUAGE` - Optional

**Description:** Default language for B2B portal
**Type:** String
**Options:** `he`, `en`, `es`
**Default:** `he`

```bash
VITE_B2B_DEFAULT_LANGUAGE=he
```

---

### Feature Flags

#### `VITE_B2B_FEATURE_ENABLE_PLAYGROUND`

**Description:** Enable API playground
**Type:** Boolean
**Default:** `true`

```bash
VITE_B2B_FEATURE_ENABLE_PLAYGROUND=true
```

---

## CLI Variables

**File:** System environment (no .env file)
**Set in:** `~/.bashrc`, `~/.zshrc`, or per-command

### Platform Selection

#### `OLORIN_PLATFORM` - Optional

**Description:** Default platform for CLI commands
**Type:** String
**Options:** `bayit`, `cvplus`, `fraud`, `portals`
**Default:** `bayit`

```bash
export OLORIN_PLATFORM=bayit
```

---

### Port Configuration

#### `BACKEND_PORT` - Optional

**Description:** Backend API port
**Type:** Integer
**Default:** `8090`
**Range:** `1024-65535`

```bash
export BACKEND_PORT=8091
```

---

#### `WEB_PORT` - Optional

**Description:** Web application port
**Type:** Integer
**Default:** `3200`

```bash
export WEB_PORT=3201
```

---

#### `MOBILE_PORT` - Optional

**Description:** Mobile app Expo port
**Type:** Integer
**Default:** `19006`

```bash
export MOBILE_PORT=19007
```

---

#### `TV_PORT` - Optional

**Description:** TV app port
**Type:** Integer
**Default:** `3201`

```bash
export TV_PORT=3202
```

---

#### `TVOS_PORT` - Optional

**Description:** tvOS app Metro bundler port
**Type:** Integer
**Default:** `8081`

```bash
export TVOS_PORT=8082
```

---

#### `PARTNER_PORT` - Optional

**Description:** Partner portal port
**Type:** Integer
**Default:** `3202`

```bash
export PARTNER_PORT=3203
```

---

### .claude Integration

#### `CLAUDE_DIR` - Optional

**Description:** .claude directory path
**Type:** String
**Default:** `~/.claude`

```bash
export CLAUDE_DIR=/path/to/.claude
```

---

#### `OLORIN_CLI_LOG_LEVEL` - Optional

**Description:** CLI logging level
**Type:** String
**Options:** `debug`, `info`, `warn`, `error`
**Default:** `info`

```bash
export OLORIN_CLI_LOG_LEVEL=debug
```

---

## Security Best Practices

### 1. Never Commit Secrets

**❌ WRONG:**
```bash
# .env (committed to git)
SECRET_KEY=my-secret-key-12345
```

**✅ CORRECT:**
```bash
# .env.example (committed to git)
SECRET_KEY=YOUR_SECRET_KEY_HERE

# .env (in .gitignore)
SECRET_KEY=actual-secret-key-generated-securely
```

---

### 2. Use Strong Secrets

**❌ WEAK:**
```bash
SECRET_KEY=password123
MONGODB_URI=mongodb://admin:admin@localhost
```

**✅ STRONG:**
```bash
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
MONGODB_URI=mongodb+srv://user:Xy9$mK#pQ2@cluster.mongodb.net
```

---

### 3. Separate Keys Per Platform

**❌ WRONG (Shared keys):**
```bash
# Same key used across all Olorin platforms
ANTHROPIC_API_KEY=sk-ant-shared-key-for-all-platforms
```

**✅ CORRECT (Platform-specific keys):**
```bash
# Bayit+ has its own key
ANTHROPIC_API_KEY=sk-ant-bayit-specific-key

# CV Plus has different key (in CV Plus .env)
ANTHROPIC_API_KEY=sk-ant-cvplus-specific-key

# Fraud Detection has different key (in Fraud .env)
ANTHROPIC_API_KEY=sk-ant-fraud-specific-key
```

---

### 4. Rotate Secrets Regularly

- API keys: Every 90 days
- JWT secrets: Every 180 days
- Database passwords: Every 365 days

---

### 5. Use Secret Managers in Production

**Recommended:**
- Google Secret Manager
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

**Example (Google Secret Manager):**
```bash
# Instead of:
MONGODB_URI=mongodb+srv://user:pass@cluster

# Use:
MONGODB_URI=$(gcloud secrets versions access latest --secret="mongodb-uri")
```

---

## Environment Files

### Development

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your development values

# Web
cp web/.env.example web/.env
# Edit web/.env with your development values

# Partner Portal
cp partner-portal/.env.example partner-portal/.env
# Edit partner-portal/.env with your development values
```

---

### Staging

Use separate `.env.staging` files with staging-specific values.

---

### Production

**NEVER use .env files in production.**

Use one of:
1. **System environment variables** (set in hosting platform)
2. **Secret managers** (Google Secret Manager, AWS Secrets Manager)
3. **Container secrets** (Kubernetes secrets, Docker secrets)

---

## Validation

### Manual Validation

```bash
# Check backend env vars
npm run olorin -- health

# Or check specific service
cd backend
poetry run python -c "from app.core.config import Settings; Settings()"
```

---

### Automated Validation

```bash
# Run environment validation script
./scripts/validate-env.sh

# Or use CLI health check
npm run olorin:health
```

---

### Schema Validation

Schema file: `/.env.schema.json`

Validates:
- ✅ Required variables are present
- ✅ Variable types are correct
- ✅ Values match allowed patterns
- ✅ Sensitive variables are not hardcoded

---

## Troubleshooting

### "Missing required environment variable"

**Problem:** Required variable not set
**Solution:** Add the variable to your `.env` file

```bash
# Check which variables are required
cat backend/.env.example | grep REQUIRED

# Add missing variable
echo "VARIABLE_NAME=value" >> backend/.env
```

---

### "Invalid value for environment variable"

**Problem:** Value doesn't match expected format
**Solution:** Check the format in this documentation

Example:
```bash
# ❌ WRONG
MONGODB_URI=invalid-connection-string

# ✅ CORRECT
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```

---

### "CORS error in browser"

**Problem:** `BACKEND_CORS_ORIGINS` doesn't include your frontend URL
**Solution:** Add your frontend URL

```bash
# Development (DEBUG=true)
# No need to set, defaults to localhost

# Production (DEBUG=false)
BACKEND_CORS_ORIGINS='["https://bayit.tv","https://www.bayit.tv"]'
```

---

## Additional Resources

- **Schema:** `/.env.schema.json`
- **Examples:**
  - `backend/.env.example`
  - `web/.env.example`
  - `partner-portal/.env.example`
- **Validation:** `./scripts/validate-env.sh`
- **CLI:** `npm run olorin:health`

---

**Last Updated:** 2026-01-24
**Maintained By:** Olorin Team
**Questions?** Run `npm run olorin:health` for diagnostics
