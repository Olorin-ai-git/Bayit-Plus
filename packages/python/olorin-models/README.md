# Olorin Models

MongoDB models using Beanie ODM for the Olorin.ai ecosystem.

## Installation

```bash
poetry add olorin-models
```

## Models

### Partner Models

- `IntegrationPartner` - Third-party platform integration configuration
- `UsageRecord` - Track usage for billing and analytics
- `DubbingSession` - Track individual dubbing sessions
- `WebhookDelivery` - Track webhook delivery attempts

### Content Models

- `ContentEmbedding` - Vector embeddings for semantic search
- `RecapSession` - Session for live broadcast recap generation
- `RecapSegment` - A segment of transcript for recap
- `RecapEntry` - A generated recap summary

## Usage

```python
from olorin_models import IntegrationPartner, ContentEmbedding, RecapSession

# Create a partner
partner = IntegrationPartner(
    partner_id="acme-corp",
    name="Acme Corporation",
    api_key_hash="...",
    api_key_prefix="acme1234",
    contact_email="dev@acme.com",
)

# Check capabilities
if partner.has_capability("realtime_dubbing"):
    config = partner.get_capability_config("realtime_dubbing")
```

## License

Proprietary - Olorin.ai
