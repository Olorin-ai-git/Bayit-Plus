# Olorin Shared

Unified core services for Olorin.ai ecosystem platforms (Fraud Detection, Bayit+ Media).

## Purpose

Consolidates authentication, configuration management, logging, and error handling across all Olorin.ai subplatforms to eliminate code duplication and ensure consistency.

## Features

- **Unified JWT Authentication**: Single authentication implementation used by all platforms
- **Unified Configuration Management**: Pydantic-based settings with environment variable support
- **Unified Logging Bridge**: Structured JSON logging compatible with Google Cloud Logging
- **Unified Error Handling**: Consistent exception types and HTTP response formats across platforms

## Installation

```bash
poetry add olorin-shared
```

## Usage

### Authentication

```python
from olorin_shared.auth import create_access_token, verify_access_token

# Create token
token = create_access_token(data={"sub": "user_id"}, expires_delta=timedelta(hours=24))

# Verify token
payload = verify_access_token(token)
```

### Configuration

```python
from olorin_shared.config import Settings

settings = Settings()  # Loads from environment variables
api_key = settings.api_key
database_url = settings.database_url
```

### Logging

```python
from olorin_shared.logging import get_logger

logger = get_logger(__name__)
logger.info("Application started", extra={"service": "backend"})
```

### Error Handling

```python
from olorin_shared.errors import OlorinException, ValidationError

try:
    # Some operation
    pass
except ValidationError as e:
    # Handle validation errors with consistent format
    return {"error": str(e), "code": e.error_code}
```

## Architecture

```
olorin_shared/
├── auth.py          # JWT token creation and verification
├── config.py        # Settings management with validation
├── logging.py       # Structured logging configuration
├── errors.py        # Unified exception types
└── models.py        # Shared Pydantic models
```

## Integration Guide

### For Olorin Fraud Detection

Replace custom implementations with shared package:
1. Remove `app/security/auth.py` custom JWT implementation
2. Import from `olorin_shared.auth`
3. Update configuration to use `olorin_shared.config.Settings`
4. Replace logging config with `olorin_shared.logging`

### For Bayit+ Media Streaming

Already using simplified versions of these services; update to use unified package for consistency:
1. Update `app/core/security.py` to import from `olorin_shared.auth`
2. Update `app/core/config.py` to extend `olorin_shared.config.Settings`
3. Update `app/core/logging_config.py` to use `olorin_shared.logging`

## Development

```bash
cd packages/olorin-shared
poetry install
poetry run pytest tests/ -v
```

## License

Proprietary - Olorin.ai Platform Team
