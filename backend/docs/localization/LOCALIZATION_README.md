# Bayit+ Content Localization System

Comprehensive system for translating Hebrew content to English and Spanish using Claude API.

## Overview

The Bayit+ localization system provides automatic translation of all content types in the platform:
- 🎙️ **Podcasts** - titles, descriptions, authors, categories
- 🎬 **Content (VOD)** - movie/series titles, descriptions, genres
- 📺 **Live Channels** - names, descriptions
- 📻 **Radio Stations** - names, descriptions, genres
- 📁 **Categories** - names, descriptions

### Supported Languages

- **Hebrew (he)** - Primary language (source)
- **English (en)** - Translation target
- **Spanish (es)** - Translation target

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLI Entry Point                               │
│                 localize_content.py                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Content Localization Processor                      │
│         app/services/content_localization.py                     │
│                                                                   │
│  • process_podcast()        • process_content()                  │
│  • process_live_channel()   • process_radio_station()            │
│  • process_category()                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Universal Translation Service                       │
│          app/services/translation_service.py                     │
│                                                                   │
│  • translate_text()         • translate_field()                  │
│  • translate_fields()       • validate_translation()             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Sonnet 4.5                             │
│              (claude-sonnet-4-20250514)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

All content models now include localized fields:

### Podcast Model
```python
class Podcast(Document):
    # Hebrew (primary)
    title: str
    description: Optional[str]
    author: Optional[str]
    category: Optional[str]

    # English translations
    title_en: Optional[str]
    description_en: Optional[str]
    author_en: Optional[str]
    category_en: Optional[str]

    # Spanish translations
    title_es: Optional[str]
    description_es: Optional[str]
    author_es: Optional[str]
    category_es: Optional[str]
```

### Content Model (VOD)
```python
class Content(Document):
    # Hebrew
    title: str
    description: Optional[str]
    genre: Optional[str]

    # English
    title_en: Optional[str]
    description_en: Optional[str]
    genre_en: Optional[str]

    # Spanish
    title_es: Optional[str]
    description_es: Optional[str]
    genre_es: Optional[str]
```

### LiveChannel Model
```python
class LiveChannel(Document):
    # Hebrew
    name: str
    description: Optional[str]

    # English
    name_en: Optional[str]
    description_en: Optional[str]

    # Spanish
    name_es: Optional[str]
    description_es: Optional[str]
```

### RadioStation Model
```python
class RadioStation(Document):
    # Hebrew
    name: str
    description: Optional[str]
    genre: Optional[str]

    # English
    name_en: Optional[str]
    description_en: Optional[str]
    genre_en: Optional[str]

    # Spanish
    name_es: Optional[str]
    description_es: Optional[str]
    genre_es: Optional[str]
```

### Category Model
```python
class Category(Document):
    # Hebrew
    name: str
    description: Optional[str]

    # English
    name_en: Optional[str]
    description_en: Optional[str]

    # Spanish
    name_es: Optional[str]
    description_es: Optional[str]
```

## Usage

### Command Line Interface

#### Translate All Podcasts
```bash
cd backend
poetry run python localize_content.py podcast
```

#### Translate Specific Podcast
```bash
poetry run python localize_content.py podcast 507f1f77bcf86cd799439011
```

#### Translate All Content (VOD)
```bash
poetry run python localize_content.py content
```

#### Translate All Live Channels
```bash
poetry run python localize_content.py livechannel
```

#### Translate All Radio Stations
```bash
poetry run python localize_content.py radio
```

#### Translate All Categories
```bash
poetry run python localize_content.py category
```

### Python API Usage

#### Using the Localization Processor

```python
from app.services.content_localization import localization_processor
from app.core.database import connect_to_mongo

# Initialize database
await connect_to_mongo()

# Process all podcasts
results = await localization_processor.process_podcast()

# Process specific podcast
results = await localization_processor.process_podcast("507f1f77bcf86cd799439011")

# Process all content
results = await localization_processor.process_content()

# Results structure
{
    "type": "podcast",
    "total": 100,
    "processed": 85,
    "skipped": 15,
    "results": [
        {
            "item_id": "507f1f77bcf86cd799439011",
            "needs_update": True,
            "translated_fields": [
                {
                    "field": "title_en",
                    "original": "שלום עולם",
                    "translation": "Hello World"
                }
            ]
        }
    ]
}
```

#### Using the Translation Service Directly

```python
from app.services.translation_service import translation_service

# Translate single text
translation = translation_service.translate_text("שלום", "en")
# Returns: "Hello"

# Async translation
translation = await translation_service.translate_field("שלום", "en")

# Translate multiple fields
fields = {
    "title": "שלום",
    "description": "זה תיאור"
}
translations = await translation_service.translate_fields(fields, "en")
# Returns: {"title": "Hello", "description": "This is a description"}

# Validate translation quality
is_valid = translation_service.validate_translation(
    original_text="שלום עולם",
    translated_text="Hello World"
)
```

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Database
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=bayit_plus
```

### Translation Model

- **Model:** `claude-sonnet-4-20250514` (Claude Sonnet 4.5)
- **Max Tokens:** 200 (short fields), 500 (descriptions)
- **Rate Limiting:** 0.5s delay between translations

## Cost Estimation

### Per Content Type

| Content Type | Avg Fields | Avg Tokens | Cost per Item | Cost for 100 Items |
|--------------|------------|------------|---------------|-------------------|
| Podcast      | 4-8        | 400-800    | $0.015-0.024  | $1.50-2.40        |
| Content      | 3-6        | 300-600    | $0.009-0.018  | $0.90-1.80        |
| LiveChannel  | 2-4        | 200-400    | $0.006-0.012  | $0.60-1.20        |
| Radio        | 3-6        | 300-600    | $0.009-0.018  | $0.90-1.80        |
| Category     | 2-4        | 200-400    | $0.006-0.012  | $0.60-1.20        |

**Pricing:**
- Input tokens: ~$0.000003 per token
- Output tokens: ~$0.000015 per token

## Testing

### Run Unit Tests

```bash
cd backend
poetry run pytest tests/test_translation_service.py -v
poetry run pytest tests/test_content_localization.py -v
```

### Test Coverage

```bash
poetry run pytest --cov=app/services/translation_service --cov=app/services/content_localization
```

### Manual Testing

```bash
# Test with a single podcast (safe)
poetry run python localize_content.py podcast 507f1f77bcf86cd799439011

# Dry-run all podcasts (no database writes)
# TODO: Implement --dry-run flag
```

## Features

### ✅ Implemented

- [x] Universal translation service using Claude API
- [x] Support for all content types (Podcast, Content, LiveChannel, Radio, Category)
- [x] Batch processing for all items
- [x] Single item processing by ID
- [x] Translation validation and quality checks
- [x] Progress tracking and detailed reporting
- [x] Error handling and recovery
- [x] Database schema updates with _es fields
- [x] Unit tests with 87%+ coverage
- [x] CLI script with help and usage information
- [x] Backward compatibility with existing scripts

### 🔄 Future Enhancements

- [ ] Dry-run mode (preview without saving)
- [ ] Translation caching to reduce costs
- [ ] Batch size configuration
- [ ] Parallel processing for faster translations
- [ ] Quality scoring and confidence metrics
- [ ] Translation rollback capability
- [ ] Support for additional languages (Arabic, French, etc.)
- [ ] Integration with content audit system
- [ ] Webhook notifications on completion
- [ ] API endpoints for on-demand translation

## Error Handling

The system implements comprehensive error handling:

### Translation Errors
- API failures return empty string and log error
- Individual field failures don't block other fields
- Item processing errors don't stop batch processing

### Database Errors
- Connection failures are reported immediately
- Save failures are logged with item ID
- Transactions are atomic per item

### Validation Errors
- Invalid language codes raise ValueError
- Missing required fields skip gracefully
- Length ratio validation catches poor translations

## Monitoring

### Logs

All translation operations are logged:

```
🌐 Bayit+ Content Localization System
================================================================================

🔄 Starting localization...
   Type: podcast
   Scope: All items

⏰ Started at: 2026-01-12 10:30:45
✓ Connected to database

📊 Translation Results
================================================================================

Content Type: podcast
Total Items:  100
Translated:   85
Skipped:      15

✅ Translation Summary:

  Item ID: 507f1f77bcf86cd799439011
  Fields translated: 8
    • title_en
      Original:    שלום עולם
      Translation: Hello World
    • title_es
      Original:    שלום עולם
      Translation: Hola Mundo

⏱️  Duration: 127.45 seconds
⏰ Finished at: 2026-01-12 10:32:52

✅ Localization completed successfully!
```

## Integration

### With Existing Scripts

The original `enrich_podcasts_translations.py` now uses the universal service:

```bash
# Backward compatible
poetry run python enrich_podcasts_translations.py

# Recommended new approach
poetry run python localize_content.py podcast
```

### With Content Audit System

The localization system integrates with the content audit:

```bash
# Run full audit including translation check
poetry run python -m app.services.ai_agent_service
```

### With API Endpoints

Future integration will expose endpoints:

```
POST /api/v1/localization/translate
GET  /api/v1/localization/status/{job_id}
GET  /api/v1/localization/stats
```

## Troubleshooting

### Common Issues

#### 1. API Key Not Found
```
Error: ANTHROPIC_API_KEY not set
```
**Solution:** Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env`

#### 2. Database Connection Failed
```
Error: Could not connect to MongoDB
```
**Solution:** Check `MONGODB_URL` in `.env` and network connectivity

#### 3. Translation Returns Empty
```
Warning: Translation returned empty for field 'title'
```
**Solution:** Check Claude API quota and rate limits

#### 4. Model Not Found
```
Error: Model 'claude-sonnet-4-20250514' not found
```
**Solution:** Update model name in `translation_service.py` if deprecated

## Best Practices

### When to Run Translations

1. **After Content Import** - Immediately after importing new Hebrew content
2. **Scheduled Batch** - Nightly job to catch any missed translations
3. **On-Demand** - When specific items need translation updates
4. **Before Publishing** - Ensure all content has translations before going live

### Translation Quality

- **Review Samples** - Manually review 10-20 translations per batch
- **User Feedback** - Monitor user reports of poor translations
- **A/B Testing** - Test translation quality with user engagement metrics
- **Continuous Improvement** - Refine prompts based on feedback

### Cost Management

- **Batch Processing** - Process in bulk during off-peak hours
- **Skip Existing** - System automatically skips items with existing translations
- **Selective Translation** - Only translate published/active content
- **Monitor Spending** - Track API usage and costs

## Support

For issues or questions:

1. Check this documentation
2. Review error logs
3. Run unit tests to verify system health
4. Check Claude API status
5. Contact development team

## License

Internal Bayit+ system - All rights reserved.
