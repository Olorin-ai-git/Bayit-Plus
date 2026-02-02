# Olorin Email Architecture - Shared Email Package

## Overview

Email functionality has been refactored to follow the Olorin ecosystem architecture principle:

**Core capabilities are shared packages consumed by all platforms, augmented locally with platform-specific needs.**

## Architecture

### Before (Incorrect)

```
Bayit+ Backend
└── app/services/email_service.py  # ❌ Bayit+-specific email system
    ├── send_email()
    ├── send_via_sendgrid()
    └── send_platform_invitation()  # Bayit+ template
```

**Problems:**
- Each platform duplicated email infrastructure
- SendGrid integration repeated across platforms
- No code reuse between Bayit+, Fraud Detection, CVPlus, Portals
- Difficult to maintain consistency

### After (Correct - Olorin Ecosystem Pattern)

```
┌─────────────────────────────────────────────────────────────────┐
│              OLORIN-CORE (Shared Packages)                       │
│  /backend-core/olorin-email/                                     │
│  ├── olorin_email/                                               │
│  │   ├── service.py          # EmailService core                 │
│  │   ├── config.py           # EmailSettings                     │
│  │   └── provider/                                               │
│  │       ├── base.py         # Provider interface               │
│  │       └── sendgrid.py     # SendGrid implementation          │
│  └── Published as: olorin-email==1.0.0                           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │   BAYIT+     │ │    FRAUD     │ │   CVPLUS     │
      │   Backend    │ │  DETECTION   │ │   Backend    │
      └──────────────┘ └──────────────┘ └──────────────┘

Each platform:
✅ Consumes olorin-email package
✅ Adds platform-specific templates
✅ Augments with scheduled sending, campaigns, etc.
```

## Bayit+ Implementation

### Dependencies

```toml
# backend/pyproject.toml
[tool.poetry.dependencies]
olorin-email = {path = "../../../olorin-core/backend-core/olorin-email", develop = true}
```

### Bayit+ Email Service

```python
# backend/app/services/bayit_email_service.py
from olorin_email import EmailService, EmailSettings, SendGridProvider

class BayitEmailService:
    """Bayit+ specific email service with platform templates."""

    def __init__(self):
        # Initialize Olorin core email service
        email_settings = EmailSettings(
            sendgrid_api_key=settings.SENDGRID_API_KEY,
            from_email=settings.SENDGRID_FROM_EMAIL
        )
        provider = SendGridProvider(email_settings)
        self.core_service = EmailService(provider)

    async def send_platform_invitation(self, ...):
        """Bayit+ specific: Platform invitation template."""
        html = self._build_invitation_template(...)
        return await self.core_service.send(...)

    async def send_beta_verification(self, ...):
        """Bayit+ specific: Beta user verification template."""
        html = self._build_verification_template(...)
        return await self.core_service.send(...)
```

## Olorin Email Package

### Core Capabilities

| Feature | Implementation | Status |
|---------|---------------|--------|
| **SendGrid Provider** | `olorin_email.provider.SendGridProvider` | ✅ Implemented |
| **SMTP Provider** | `olorin_email.provider.SMTPProvider` | 🔄 Future |
| **Email Service** | `olorin_email.EmailService` | ✅ Implemented |
| **Configuration** | `olorin_email.EmailSettings` | ✅ Implemented |
| **Template Engine** | `olorin_email.template.TemplateEngine` | 🔄 Future |
| **Tracking** | `olorin_email.tracking.EmailTracking` | 🔄 Future |

### Package Structure

```
olorin-core/backend-core/olorin-email/
├── pyproject.toml            # Poetry configuration
├── README.md                 # Package documentation
├── olorin_email/
│   ├── __init__.py          # Main exports
│   ├── service.py           # EmailService class
│   ├── config.py            # EmailSettings
│   └── provider/
│       ├── __init__.py
│       ├── base.py          # EmailProvider interface
│       └── sendgrid.py      # SendGrid implementation
└── tests/
    ├── test_service.py
    └── test_sendgrid.py
```

## Benefits

### 1. Code Reuse

All Olorin platforms use the same email infrastructure:
- Single SendGrid integration
- Consistent error handling
- Shared configuration patterns
- Unified logging

### 2. Maintainability

- Email provider changes happen once (in olorin-email)
- All platforms benefit from improvements
- Easier to test (shared test suite)

### 3. Platform-Specific Augmentation

Each platform adds its own:
- Email templates (invitation, verification, welcome, etc.)
- Scheduled sending logic
- Campaign management
- Beta program emails

### 4. Ecosystem Consistency

Follows the same pattern as:
- `@olorin/shared-i18n` (10-language localization)
- `@olorin/shared-ui` (Glass components)
- `@olorin/shared-services` (Common utilities)

## Usage Examples

### Basic Email Sending

```python
from olorin_email import EmailService, EmailSettings, SendGridProvider

# Initialize service
settings = EmailSettings(
    sendgrid_api_key="SG.xxx",
    from_email="noreply@platform.com"
)
provider = SendGridProvider(settings)
service = EmailService(provider)

# Send email
result = await service.send(
    to=["user@example.com"],
    subject="Welcome!",
    html_content="<h1>Welcome to our platform</h1>"
)

if result.success:
    print(f"Email sent! Message ID: {result.message_id}")
```

### Platform Invitation (Bayit+)

```python
from app.services.bayit_email_service import get_bayit_email_service

# Get Bayit email service (singleton)
bayit_email = get_bayit_email_service()

# Send invitation with Bayit+ template
result = await bayit_email.send_platform_invitation(
    to_email="user@example.com",
    inviter_name="Admin",
    personal_message="Join us!"
)
```

### Beta Verification (Bayit+ - Existing)

```python
# backend/app/services/beta/email_service.py can be updated to use olorin-email
from olorin_email import EmailService, SendGridProvider
from olorin_email.config import EmailSettings

# Migrate existing beta verification to use core package
```

## Migration Guide

### Step 1: Install Olorin Email Package

```bash
cd backend
poetry add ../../../olorin-core/backend-core/olorin-email --editable
```

### Step 2: Update Platform Service

Create platform-specific email service that wraps olorin-email:

```python
# app/services/{platform}_email_service.py
from olorin_email import EmailService, EmailSettings, SendGridProvider
from app.core.config import settings

class PlatformEmailService:
    def __init__(self):
        email_settings = EmailSettings(
            sendgrid_api_key=settings.SENDGRID_API_KEY,
            from_email=settings.FROM_EMAIL
        )
        provider = SendGridProvider(email_settings)
        self.core_service = EmailService(provider)

    async def send_welcome_email(self, ...):
        """Platform-specific template."""
        html = self._build_welcome_template(...)
        return await self.core_service.send(...)
```

### Step 3: Update Endpoints

Replace direct email sending with platform service:

```python
# Before
from app.services.email_service import send_email
success = await send_email(...)

# After
from app.services.platform_email_service import get_platform_email
service = get_platform_email()
result = await service.send_welcome_email(...)
```

### Step 4: Remove Deprecated Code

After migration, deprecate old email_service.py:

```python
# app/services/email_service.py (DEPRECATED)
import warnings
warnings.warn(
    "email_service.py is deprecated. Use platform_email_service.py instead.",
    DeprecationWarning
)
```

## Configuration

### Environment Variables

```bash
# Required
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@platform.com

# Optional (for future SMTP support)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=user@gmail.com
SMTP_PASSWORD=xxxx
SMTP_USE_TLS=true
```

### Google Cloud Secret Manager

```bash
# Add to GCloud secrets
gcloud secrets create SENDGRID_API_KEY --data-file=- <<< "SG.xxx"
gcloud secrets create SENDGRID_FROM_EMAIL --data-file=- <<< "noreply@platform.com"

# Sync to .env
./scripts/sync-gcloud-secrets.sh
```

## Testing

### Unit Tests (Olorin Email Package)

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-core/backend-core/olorin-email
poetry install
poetry run pytest
poetry run pytest --cov
```

### Integration Tests (Bayit+)

```bash
cd backend
poetry run pytest tests/integration/test_bayit_email_service.py
```

## Future Enhancements

### Template System

```python
# olorin_email/template/engine.py
from jinja2 import Environment, FileSystemLoader

class TemplateEngine:
    def __init__(self, template_dir: str):
        self.env = Environment(loader=FileSystemLoader(template_dir))

    async def render(self, template_name: str, context: dict) -> str:
        template = self.env.get_template(f"{template_name}.html")
        return template.render(**context)
```

### Email Tracking

```python
# olorin_email/tracking/events.py
class EmailTracking:
    async def track_send(self, message_id: str, recipient: str):
        """Track email send event."""
        ...

    async def track_open(self, message_id: str):
        """Track email open event."""
        ...

    async def track_click(self, message_id: str, url: str):
        """Track link click event."""
        ...
```

### Campaign Management

```python
# olorin_email/campaign/manager.py
class CampaignManager:
    async def create_campaign(self, name: str, ...):
        """Create email campaign."""
        ...

    async def send_campaign(self, campaign_id: str):
        """Send campaign to all recipients."""
        ...
```

## Related Documentation

- [Olorin Email Package README](/Users/olorin/Documents/Projects/olorin/olorin-core/backend-core/olorin-email/README.md)
- [Bayit+ Email Service](../app/services/bayit_email_service.py)
- [Platform Invitations Guide](PLATFORM_INVITATIONS.md)
- [Secrets Management](deployment/SECRETS_MANAGEMENT.md)

## Support

For issues or questions:
- Email: dev@olorin.ai
- Olorin Core Issues: `/olorin-core/issues`
- Bayit+ Issues: `/bayit-plus/issues`
