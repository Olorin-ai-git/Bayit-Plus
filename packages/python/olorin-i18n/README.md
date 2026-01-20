# Olorin.ai Internationalization (i18n) Package

Unified internationalization library for multilingual support across all Olorin.ai ecosystem platforms.

## Features

- **Unified API** - Single interface for all i18n needs across Python backends
- **10 Languages** - Full support for Hebrew, English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, and Japanese
- **RTL Support** - Built-in right-to-left language detection and metadata
- **Caching** - Optional translation file caching with TTL support
- **Type-Safe** - Full TypeScript-like type hints with Pydantic
- **Production-Ready** - Comprehensive error handling and validation

## Installation

```bash
poetry add olorin-i18n
```

## Quick Start

### Basic Usage

```python
from olorin_i18n import I18nService, I18nConfig

# Initialize service
config = I18nConfig(default_language="he")
i18n = I18nService(config=config)

# Get single translation
text = i18n.get_translation("common.loading", "he")  # "טוען..."

# Get multilingual translations
multilingual = i18n.get_multilingual("common.loading")
# {"he": "טוען...", "en": "Loading...", "es": "Cargando..."}

# Get language info
lang_info = i18n.get_language_info("he")
is_rtl = i18n.is_rtl("he")  # True

# Get coverage
coverage = i18n.get_coverage("zh")  # 55%
```

### With Olorin Configuration

Integrate with Olorin's centralized configuration system:

```python
from app.core.config import settings
from olorin_i18n import I18nService

# i18n config is part of OlorinSettings
i18n = I18nService(config=settings.i18n)
```

## Configuration

Configure via environment variables:

```bash
# Default language (he, en, es, zh, fr, it, hi, ta, bn, ja)
I18N_DEFAULT_LANGUAGE=he

# Fallback language when translation not found
I18N_FALLBACK_LANGUAGE=he

# Path to locales directory (defaults to shared/i18n/locales)
I18N_LOCALES_PATH=/path/to/locales

# Enable translation file caching
I18N_CACHE_ENABLED=true

# Cache time-to-live in seconds
I18N_CACHE_TTL_SECONDS=3600

# Track missing translation keys for debugging
I18N_TRACK_MISSING_KEYS=false
```

## Supported Languages

| Code | Name | Native Name | RTL | Coverage |
|------|------|-------------|-----|----------|
| `he` | Hebrew | עברית | ✓ | 100% |
| `en` | English | English | ✗ | 100% |
| `es` | Spanish | Español | ✗ | 97% |
| `zh` | Chinese | 中文 | ✗ | 55% |
| `fr` | French | Français | ✗ | 27% |
| `it` | Italian | Italiano | ✗ | 23% |
| `hi` | Hindi | हिन्दी | ✗ | 19% |
| `ta` | Tamil | தமிழ் | ✗ | 15% |
| `bn` | Bengali | বাংলা | ✗ | 15% |
| `ja` | Japanese | 日本語 | ✗ | 47% |

## API Reference

### I18nService

Main service for i18n operations.

#### Methods

##### `get_translation(key: str, language_code: LanguageCode, default: Optional[str] = None) -> str`

Get a single translation for a specific key and language.

**Parameters:**
- `key` (str): Translation key using dot notation (e.g., `'common.loading'`)
- `language_code` (LanguageCode): Language code
- `default` (Optional[str]): Default value if key not found

**Returns:** Translated string

**Raises:**
- `LanguageNotFoundError`: If language not supported
- `TranslationKeyError`: If key not found and no default provided

**Example:**
```python
text = i18n.get_translation("common.loading", "he")
text = i18n.get_translation("missing.key", "he", default="Default")
```

##### `get_multilingual(key: str, default: Optional[str] = None) -> Dict[str, str]`

Get translations for a key in all supported languages.

**Parameters:**
- `key` (str): Translation key
- `default` (Optional[str]): Default value if key not found

**Returns:** Dictionary mapping language codes to translations

**Example:**
```python
translations = i18n.get_multilingual("common.loading")
# {"he": "טוען...", "en": "Loading...", ...}
```

##### `get_language_info(language_code: LanguageCode) -> LanguageMetadata`

Get metadata for a language.

**Parameters:**
- `language_code` (LanguageCode): Language code

**Returns:** Language metadata with name, native name, flag, RTL info, coverage

**Raises:** `LanguageNotFoundError` if language not supported

**Example:**
```python
lang = i18n.get_language_info("he")
# {
#   "code": "he",
#   "name": "עברית",
#   "nativeName": "עברית",
#   "flag": "🇮🇱",
#   "rtl": True,
#   "coverage": 100
# }
```

##### `is_rtl(language_code: LanguageCode) -> bool`

Check if a language is right-to-left.

**Parameters:**
- `language_code` (LanguageCode): Language code

**Returns:** True if RTL, False otherwise

**Example:**
```python
if i18n.is_rtl("he"):
    # Apply RTL styles
```

##### `get_all_languages() -> List[LanguageMetadata]`

Get metadata for all supported languages.

**Returns:** List of language metadata

**Example:**
```python
languages = i18n.get_all_languages()
for lang in languages:
    print(f"{lang['name']}: {lang['coverage']}% coverage")
```

##### `get_coverage(language_code: LanguageCode) -> int`

Get translation coverage percentage for a language.

**Parameters:**
- `language_code` (LanguageCode): Language code

**Returns:** Coverage percentage (0-100)

**Example:**
```python
coverage = i18n.get_coverage("zh")  # 55
```

##### `get_missing_keys() -> List[Tuple[str, str]]`

Get log of missing translation keys (if tracking enabled).

**Returns:** List of (key, language_code) tuples

##### `clear_missing_keys_log() -> None`

Clear missing keys log.

## Translation File Format

Translation files are located in `shared/i18n/locales/` and use JSON format with nested objects using dot notation:

**Example: `locales/he.json`**
```json
{
  "common": {
    "loading": "טוען...",
    "error": "שגיאה",
    "success": "הצליח"
  },
  "pages": {
    "home": {
      "title": "דף הבית",
      "description": "ברוכים הבאים"
    }
  }
}
```

## Backend Integration Example

```python
from fastapi import APIRouter
from olorin_i18n import I18nService
from app.core.config import settings

router = APIRouter()
i18n = I18nService(config=settings.i18n)

@router.get("/api/status")
async def get_status(language: str = "he"):
    """Get status message in specified language."""
    message = i18n.get_translation("common.loading", language)
    return {"message": message}

@router.get("/api/languages")
async def list_languages():
    """List all supported languages."""
    languages = i18n.get_all_languages()
    return {"languages": languages}
```

## Testing

Run tests with coverage:

```bash
poetry run pytest tests/ --cov=olorin_i18n
```

## Development

### Install dependencies
```bash
poetry install
```

### Run type checking
```bash
poetry run mypy olorin_i18n/
```

### Run linting
```bash
poetry run black olorin_i18n/
poetry run isort olorin_i18n/
poetry run ruff check olorin_i18n/
```

## Error Handling

The service provides typed exceptions for different error scenarios:

```python
from olorin_i18n import (
    LanguageNotFoundError,
    TranslationKeyError,
    ConfigurationError,
)

try:
    text = i18n.get_translation("key", "invalid_lang")
except LanguageNotFoundError:
    # Handle unsupported language
    pass
except TranslationKeyError:
    # Handle missing translation key
    pass
except ConfigurationError:
    # Handle configuration error
    pass
```

## Performance Considerations

- **Caching**: Enable caching in production to avoid repeated file I/O
- **TTL**: Set appropriate cache TTL based on deployment model
- **Locales Path**: Configure locales path explicitly for best performance
- **Track Missing Keys**: Disable in production; enable only for development

## Compatibility

- Python: 3.11+
- Pydantic: 2.5+
- Framework-agnostic (works with FastAPI, Flask, Django, etc.)

## License

Proprietary - Olorin.ai

## Support

For issues or questions, contact the Olorin.ai development team.
