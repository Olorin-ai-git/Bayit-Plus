# Olorin Platform Configuration Architecture

## Overview

The Olorin ecosystem follows a **base platform + subplatform extension** pattern for configuration management. This ensures shared resources are centralized while allowing subplatforms to customize as needed.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BASE PLATFORM CONFIG                          │
│                    /olorin-infra/.env                           │
│                                                                  │
│  Shared Resources:                                              │
│  - Database (MongoDB Atlas)                                      │
│  - AI Services (Anthropic, OpenAI, ElevenLabs)                  │
│  - Platform Core (Pinecone, Partner API, Secrets)               │
│  - Third-party Services (TMDB, OpenSubtitles, Sentry)          │
│  - GCP Infrastructure                                            │
│  - NLP/CLI Features                                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ (inherits)
        ┌──────────────────────┼──────────────────────┐
        │                      │                       │
        ▼                      ▼                       ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  BAYIT+ SUBPLAT   │  │  FRAUD SUBPLAT    │  │  CV+ SUBPLAT      │
│  bayit-plus/.env  │  │  olorin-fraud/.env│  │  olorin-cv/.env   │
├───────────────────┤  ├───────────────────┤  ├───────────────────┤
│ • Stripe payments │  │ • Fraud models    │  │ • Resume parser   │
│ • Google OAuth    │  │ • Risk scoring    │  │ • Template engine │
│ • Twilio          │  │ • Alert configs   │  │ • Export formats  │
│ • Podcast config  │  │ • Compliance      │  │ • Premium tiers   │
│ • Judaism section │  │ • Audit settings  │  │ • Job boards      │
│ • Series linker   │  │ • Case mgmt       │  │ • AI enhancement  │
│ • Feature flags   │  │ • Dashboard       │  │ • Branding        │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

## File Locations

### Base Platform
```
/olorin-infra/
├── .env                    # Base platform configuration (shared by all)
├── .env.example            # Template for base config
├── SETUP_SECRETS.sh        # Creates platform secrets in GCP
└── DEPLOY.sh               # Deploys Olorin platform backend
```

### Subplatforms
```
/olorin-media/bayit-plus/backend/
├── .env                    # Bayit+ specific config (extends base)
└── load-env.sh             # Bash script to load base + subplatform

/olorin-fraud/
├── .env                    # Fraud specific config (extends base)
└── load-env.sh             # Bash script to load base + subplatform

/olorin-cv/
├── .env                    # CV+ specific config (extends base)
└── load-env.sh             # Bash script to load base + subplatform
```

## Configuration Loading

### Python Applications

**Option 1: Automatic (Recommended)**

Import the platform config loader in your main app:

```python
# app/main.py or app/__init__.py
from app.core import platform_config  # Auto-loads base + subplatform

# Now all environment variables are available
from app.core.config import settings
```

**Option 2: Manual**

```python
from app.core.platform_config import load_platform_config

load_platform_config()  # Loads base + subplatform
```

### Bash Scripts

```bash
#!/bin/bash
# Load base platform + subplatform config
source ./load-env.sh

# Now all environment variables are available
echo "Database: $MONGODB_URI"
echo "API Key: $ANTHROPIC_API_KEY"
```

### Docker Containers

```dockerfile
FROM python:3.11-slim

# Copy both base and subplatform configs
COPY olorin-infra/.env /app/base.env
COPY backend/.env /app/subplatform.env

# Load in order (base first, then subplatform)
RUN cat /app/base.env >> /app/.env && \
    cat /app/subplatform.env >> /app/.env

ENV ENV_FILE=/app/.env
```

## Configuration Precedence

When the same variable exists in multiple locations:

1. **Subplatform config takes precedence** over base platform
2. **Base platform config takes precedence** over system defaults
3. **GCP Secret Manager** (production) overrides all

```
GCP Secrets > Subplatform .env > Base Platform .env > Defaults
```

## What Goes Where?

### Base Platform (`olorin-infra/.env`)

**Always include in base:**
- Shared database credentials (MongoDB, Postgres, Redis)
- Shared AI service keys (Anthropic, OpenAI, ElevenLabs)
- Platform-wide services (Pinecone, Sentry, TMDB)
- GCP project settings
- Core platform features (NLP, dubbing, search)

**Example:**
```bash
# Base platform only
MONGODB_URI=mongodb+srv://...
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=pcsk_...
OLORIN_NLP_ENABLED=true
```

### Subplatform (`bayit-plus/.env`)

**Only include subplatform-specific:**
- Payment providers (Stripe for Bayit+)
- OAuth providers specific to subplatform
- Communication services (Twilio for Bayit+)
- Subplatform features (podcast translation, series linker)
- Subplatform feature flags

**Example:**
```bash
# Bayit+ specific only
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_CLIENT_ID=...
TWILIO_ACCOUNT_SID=...
PODCAST_TRANSLATION_ENABLED=false
```

## Adding a New Subplatform

1. **Create subplatform directory:**
   ```bash
   mkdir -p /olorin-media/my-platform
   ```

2. **Create subplatform `.env`:**
   ```bash
   # /olorin-media/my-platform/.env
   # ============================================
   # MY PLATFORM SUBPLATFORM CONFIGURATION
   # ============================================
   # Extends: /olorin-infra/.env
   #
   # Add only MY PLATFORM specific configs below

   MY_PLATFORM_SPECIFIC_KEY=value
   MY_PLATFORM_FEATURE_ENABLED=true
   ```

3. **Create environment loader:**
   ```bash
   cp /olorin-media/bayit-plus/backend/load-env.sh /olorin-media/my-platform/
   # Update paths if directory structure differs
   ```

4. **Use in Python:**
   ```python
   # Copy platform_config.py or import from shared location
   from app.core.platform_config import load_platform_config

   load_platform_config()
   ```

## Benefits

### ✅ Single Source of Truth
- Shared credentials defined once in base platform
- No duplication across subplatforms
- Easy to update platform-wide settings

### ✅ Subplatform Independence
- Each subplatform defines only what's unique
- Smaller, cleaner config files
- Clear separation of concerns

### ✅ Easy Onboarding
- New subplatforms inherit all base resources
- Minimal configuration needed to start
- Consistent behavior across platforms

### ✅ Secure Secrets Management
- Base secrets managed in `olorin-infra`
- Subplatform secrets isolated
- GCP Secret Manager integration

## Migration Guide

### Existing Subplatform to New Architecture

1. **Identify shared vs specific configs:**
   ```bash
   # In your subplatform .env, mark:
   # [SHARED] - Move to olorin-infra/.env
   # [SPECIFIC] - Keep in subplatform .env
   ```

2. **Move shared configs to base:**
   ```bash
   # Add to /olorin-infra/.env
   ANTHROPIC_API_KEY=...
   MONGODB_URI=...
   # etc.
   ```

3. **Clean up subplatform .env:**
   ```bash
   # Keep only subplatform-specific items
   # Document what's inherited at the top
   ```

4. **Test configuration loading:**
   ```bash
   cd your-subplatform
   source load-env.sh
   env | grep ANTHROPIC  # Should show inherited value
   ```

## Troubleshooting

### Variable Not Found
```bash
# Check loading order
1. Does it exist in olorin-infra/.env?
2. Is it being overridden in subplatform .env?
3. Is the path to olorin-infra correct?
```

### Wrong Value
```bash
# Check precedence
1. Subplatform overrides base
2. Last loaded wins
3. Check for typos in variable names
```

### Path Issues
```bash
# Verify relative paths
cd your-subplatform
ls -la ../../../../olorin-infra/.env  # Should exist
```

## Best Practices

1. **Comment what's inherited** at the top of subplatform .env
2. **Never duplicate** base platform variables in subplatform
3. **Use descriptive prefixes** for subplatform variables (BAYIT_, FRAUD_, CV_)
4. **Document overrides** if subplatform changes a base platform default
5. **Keep secrets out of git** - use .gitignore
6. **Use GCP Secret Manager** for production secrets

---

**Last Updated**: 2026-01-25
**Architecture Version**: 1.0
