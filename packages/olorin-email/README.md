# Olorin Email - Shared Email Service

Centralized email service for the Olorin ecosystem. Provides unified email sending capabilities across all Olorin platforms (Bayit+, Fraud Detection, CVPlus, Portals).

## Features

- **Multiple Providers**: SendGrid, SMTP (future: AWS SES, Postmark)
- **Template System**: Jinja2-based email templates
- **Tracking**: Email delivery and engagement tracking
- **Campaign Management**: Bulk email campaigns
- **Localization**: Multi-language email support
- **Security**: HTML sanitization, email validation, rate limiting

## Installation

```bash
# In your Olorin platform (e.g., Bayit+)
cd backend
poetry add olorin-email --path ../../../olorin-core/backend-core/olorin-email
```

## Usage

### Basic Email Sending

```python
from olorin_email import EmailService, SendGridProvider
from olorin_email.config import EmailSettings

# Initialize service
settings = EmailSettings(
    sendgrid_api_key="SG.xxx",
    from_email="noreply@platform.com"
)
provider = SendGridProvider(settings)
service = EmailService(provider)

# Send email
await service.send(
    to=["user@example.com"],
    subject="Welcome!",
    html_content="<h1>Welcome to our platform</h1>"
)
```

### Using Templates

```python
from olorin_email.template import TemplateEngine

# Initialize template engine
templates = TemplateEngine()

# Render template
html = await templates.render(
    template_name="invitation",
    context={
        "inviter_name": "John Doe",
        "platform_url": "https://bayitplus.com",
        "personal_message": "Join me!"
    }
)

# Send rendered email
await service.send(
    to=["user@example.com"],
    subject="You're Invited!",
    html_content=html
)
```

### Platform-Specific Templates

Each platform can provide its own templates:

```python
# In Bayit+ backend
from olorin_email import EmailService, SendGridProvider
from bayit_email_templates import BayitTemplates

service = EmailService(SendGridProvider(settings))
templates = BayitTemplates()  # Bayit+-specific templates

html = await templates.render_invitation(
    to_email="user@example.com",
    inviter_name="Admin",
    personal_message="Welcome!"
)

await service.send(
    to=["user@example.com"],
    subject="You're Invited to Bayit+",
    html_content=html
)
```

## Architecture

```
olorin-email/
├── olorin_email/
│   ├── __init__.py         # Main exports
│   ├── service.py          # EmailService class
│   ├── config.py           # EmailSettings
│   ├── provider/           # Email providers
│   │   ├── __init__.py
│   │   ├── base.py         # Provider interface
│   │   ├── sendgrid.py     # SendGrid implementation
│   │   └── smtp.py         # SMTP implementation
│   ├── template/           # Template engine
│   │   ├── __init__.py
│   │   ├── engine.py       # Jinja2 template engine
│   │   └── sanitizer.py    # HTML sanitization
│   └── tracking/           # Email tracking
│       ├── __init__.py
│       └── events.py       # Delivery & engagement tracking
└── tests/
    ├── test_service.py
    ├── test_sendgrid.py
    └── test_templates.py
```

## Configuration

### Environment Variables

```bash
# Required
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM_ADDRESS=noreply@platform.com

# Optional
EMAIL_PROVIDER=sendgrid  # or smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=user@gmail.com
SMTP_PASSWORD=xxxx
SMTP_USE_TLS=true
```

### Google Cloud Secret Manager

```bash
# Add secrets
gcloud secrets create SENDGRID_API_KEY --data-file=- <<< "SG.xxx"
gcloud secrets create EMAIL_FROM_ADDRESS --data-file=- <<< "noreply@platform.com"
```

## Security

- **HTML Sanitization**: All user input is sanitized before email sending
- **Email Validation**: RFC 5322 compliant email validation
- **Rate Limiting**: Configurable rate limits per platform
- **Header Injection Prevention**: Validates email headers

## Testing

```bash
cd olorin-email
poetry install
poetry run pytest
poetry run pytest --cov
```

## Platform Integration

### Bayit+ Integration

```python
# backend/app/services/bayit_email_service.py
from olorin_email import EmailService, SendGridProvider
from olorin_email.config import EmailSettings
from app.core.config import settings

class BayitEmailService:
    """Bayit+ specific email service with platform templates."""

    def __init__(self):
        email_settings = EmailSettings(
            sendgrid_api_key=settings.SENDGRID_API_KEY,
            from_email=settings.SENDGRID_FROM_EMAIL
        )
        provider = SendGridProvider(email_settings)
        self.service = EmailService(provider)

    async def send_platform_invitation(
        self,
        to_email: str,
        inviter_name: str = None,
        personal_message: str = None
    ):
        """Send Bayit+ platform invitation."""
        # Use Bayit+-specific template
        from .templates import render_invitation

        html = render_invitation(
            to_email=to_email,
            inviter_name=inviter_name,
            personal_message=personal_message,
            platform_url=settings.PLATFORM_URL
        )

        return await self.service.send(
            to=[to_email],
            subject="You're Invited to Bayit+",
            html_content=html
        )
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Olorin Ecosystem
