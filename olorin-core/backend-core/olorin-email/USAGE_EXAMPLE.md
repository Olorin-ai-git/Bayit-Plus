# Olorin Email Package - Usage Examples

## Installation

```bash
cd olorin-email
poetry install
```

## Environment Variables

```bash
# Required
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@olorin.ai
SENDGRID_FROM_NAME=Olorin

# Optional
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_BASE_DELAY_SECONDS=1.0
EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR=5
EMAIL_TRACKING_ENABLED=true
EMAIL_DEFAULT_REPLY_TO=support@olorin.ai
SENDGRID_WEBHOOK_VERIFICATION_KEY=your_webhook_key
```

## Basic Usage

### 1. Initialize Components

```python
import httpx
from olorin_email import (
    EmailSettings,
    SendGridProvider,
    TemplateEngine,
    EmailSender,
    EmailBuilder
)

settings = EmailSettings()
http_client = httpx.AsyncClient()
provider = SendGridProvider(http_client, settings)
template_engine = TemplateEngine(settings)
sender = EmailSender(settings, provider, template_engine)
```

### 2. Send Email with Fluent Builder

```python
result = await sender.send(
    EmailBuilder(settings)
    .to("user@example.com")
    .subject("Welcome to Olorin!")
    .html("<h1>Welcome</h1><p>Thanks for joining us.</p>")
    .category("onboarding")
    .custom_arg("user_id", "12345")
)

if result.success:
    print(f"Email sent! Message ID: {result.message_id}")
else:
    print(f"Failed: {result.error}")
```

### 3. Send Email with Template

```python
result = await sender.send(
    EmailBuilder(settings)
    .to("user@example.com")
    .subject("Your Beta Invitation")
    .template("beta-invitation.html.j2", {
        "user_name": "John Doe",
        "invitation_code": "BETA-2024-XYZ",
        "expires_at": "2024-12-31"
    })
    .category("beta")
    .tag("invitation")
)
```

### 4. Send Batch Emails

```python
messages = [
    EmailBuilder(settings)
    .to(f"user{i}@example.com")
    .subject("Weekly Newsletter")
    .template("newsletter.html.j2", {"week": 52})
    for i in range(100)
]

results = await sender.send_batch(messages)
successful = sum(1 for r in results if r.success)
print(f"Sent {successful}/{len(results)} emails")
```

## Template Usage

### Create Template (templates/welcome.html.j2)

```html
{# description: Welcome email for new users #}
<!DOCTYPE html>
<html dir="{{ get_dir(lang) }}">
<head>
    <meta charset="utf-8">
    <title>{{ t('welcome_title') }}</title>
</head>
<body>
    <h1>{{ t('welcome_heading', name=user_name) }}</h1>
    <p>{{ t('welcome_message') }}</p>
    <a href="{{ activation_link }}">{{ t('activate_account') }}</a>
</body>
</html>
```

### Using Template with i18n

```python
def translate_fn(key, **kwargs):
    translations = {
        "welcome_title": "Welcome to Olorin!",
        "welcome_heading": "Hello {name}!",
        "welcome_message": "We're excited to have you.",
        "activate_account": "Activate Your Account"
    }
    return translations.get(key, key).format(**kwargs)

template_engine = TemplateEngine(settings, translate_fn)
```

## Tracking and Analytics

### Initialize Beanie for Tracking

```python
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from olorin_email import EmailEvent

client = AsyncIOMotorClient("mongodb://localhost:27017")
await init_beanie(
    database=client.email_db,
    document_models=[EmailEvent]
)
```

### Setup Webhook Endpoint

```python
from fastapi import FastAPI
from olorin_email import create_webhook_router

app = FastAPI()
webhook_router = create_webhook_router(settings)
app.include_router(webhook_router)
```

### Query Analytics

```python
from datetime import datetime, timedelta
from olorin_email import EmailAnalytics

analytics = EmailAnalytics()

start = datetime.utcnow() - timedelta(days=7)
end = datetime.utcnow()

stats = await analytics.get_delivery_stats(
    campaign_id="beta-2024",
    start=start,
    end=end
)

print(f"Sent: {stats.sent}")
print(f"Delivered: {stats.delivered}")
print(f"Opened: {stats.opened}")
print(f"Clicked: {stats.clicked}")

bounce_rate = await analytics.get_bounce_rate(start, end)
print(f"Bounce Rate: {bounce_rate:.2%}")

top_bouncers = await analytics.get_top_bouncing_recipients(limit=10)
for recipient in top_bouncers:
    print(f"{recipient['recipient']}: {recipient['bounce_count']} bounces")
```

## Advanced Usage

### Custom Provider Implementation

```python
from olorin_email import EmailProvider, EmailMessage, SendResult

class CustomProvider(EmailProvider):
    async def send(self, message: EmailMessage) -> SendResult:
        # Your custom implementation
        pass

custom_provider = CustomProvider()
sender = EmailSender(settings, custom_provider, template_engine)
```

### Rate Limiter Management

```python
from olorin_email import EmailRateLimiter

rate_limiter = EmailRateLimiter(settings)

if rate_limiter.check("user@example.com"):
    await sender.send(message)
    rate_limiter.record("user@example.com")
else:
    print("Rate limit exceeded")

remaining = rate_limiter.get_remaining("user@example.com")
print(f"Can send {remaining} more emails this hour")

rate_limiter.reset("user@example.com")
```

### Template Registry

```python
from olorin_email import TemplateRegistry

registry = TemplateRegistry(settings)
registry.register_template_dir("/path/to/platform/templates")

templates = registry.list_templates()
for tmpl in templates:
    print(f"{tmpl.name} ({tmpl.category}): {tmpl.description}")

template_meta = registry.get_template("welcome.html.j2")
if template_meta:
    print(f"Template path: {template_meta.path}")
```

## Integration with Olorin Ecosystem

### Using with Olorin Config

```python
from olorin_config import OlorinConfig
from olorin_email import EmailSettings, EmailSender

olorin_config = OlorinConfig()
email_settings = EmailSettings(
    SENDGRID_API_KEY=olorin_config.get("SENDGRID_API_KEY"),
    SENDGRID_FROM_EMAIL=olorin_config.get("SENDGRID_FROM_EMAIL")
)

sender = EmailSender(email_settings, provider, template_engine)
```

### Using with FastAPI Dependency Injection

```python
from fastapi import Depends, FastAPI
from olorin_email import EmailSender, EmailSettings

app = FastAPI()

async def get_email_sender() -> EmailSender:
    settings = EmailSettings()
    client = httpx.AsyncClient()
    provider = SendGridProvider(client, settings)
    engine = TemplateEngine(settings)
    return EmailSender(settings, provider, engine)

@app.post("/send-welcome")
async def send_welcome(
    user_email: str,
    sender: EmailSender = Depends(get_email_sender)
):
    result = await sender.send(
        EmailBuilder(sender.settings)
        .to(user_email)
        .subject("Welcome!")
        .template("welcome.html.j2", {"name": "User"})
    )
    return {"success": result.success}
```

## Error Handling

```python
from olorin_email import EmailBuilder, EmailSender

try:
    result = await sender.send(
        EmailBuilder(settings)
        .to("invalid-email")
        .subject("Test")
        .html("<p>Test</p>")
    )

    if not result.success:
        if result.status_code == 429:
            print("Rate limit exceeded")
        elif result.status_code and result.status_code >= 500:
            print("Server error, will retry automatically")
        else:
            print(f"Failed: {result.error}")

except ValueError as e:
    print(f"Invalid email configuration: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Production Deployment

### Docker Integration

```dockerfile
FROM python:3.11-slim
RUN pip install poetry
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && poetry install --no-dev
COPY . .
ENV SENDGRID_API_KEY=${SENDGRID_API_KEY}
ENV SENDGRID_FROM_EMAIL=${SENDGRID_FROM_EMAIL}
CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

### Google Cloud Secret Manager

```python
from google.cloud import secretmanager
from olorin_email import EmailSettings

def get_secret(project_id: str, secret_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

settings = EmailSettings(
    SENDGRID_API_KEY=get_secret("olorin-prod", "sendgrid-api-key"),
    SENDGRID_FROM_EMAIL=get_secret("olorin-prod", "sendgrid-from-email")
)
```

## Testing

```python
import pytest
from olorin_email import EmailBuilder, EmailSettings

@pytest.fixture
def email_settings():
    return EmailSettings(
        SENDGRID_API_KEY="test-key",
        SENDGRID_FROM_EMAIL="test@olorin.ai"
    )

def test_email_builder(email_settings):
    builder = EmailBuilder(email_settings)
    message = builder.to("user@example.com") \
        .subject("Test") \
        .html("<p>Test</p>") \
        .build()

    assert message.to_email == "user@example.com"
    assert message.subject == "Test"
    assert message.email_id  # UUID generated
```
