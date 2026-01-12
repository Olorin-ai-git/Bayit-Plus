# Localize Content Command

Translate Hebrew content to English and Spanish using Claude API for Bayit+ streaming platform.

## Usage

```bash
/localize-content [content-type] [content-id]
```

## Description

Automatically translates Hebrew content fields (title, description, category, author, etc.) to English and Spanish using Claude Sonnet 4.5. Updates the database with translations and validates quality.

## Arguments

- **content-type** - Type of content to localize: `podcast`, `content`, `livechannel`, `radio`, `category`
- **content-id** - MongoDB ObjectId of the content item (optional: if omitted, processes all items of that type)

## Workflow

1. **Fetch Content** - Retrieve content item(s) from MongoDB
2. **Identify Missing Translations** - Check which _en and _es fields are empty
3. **Translate with Claude** - Use Claude API to translate Hebrew to English/Spanish
4. **Validate Translations** - Ensure translations maintain meaning and tone
5. **Update Database** - Save translations to MongoDB
6. **Report Results** - Show summary of translations completed

## Examples

### Translate Single Podcast
```bash
/localize-content podcast 507f1f77bcf86cd799439011
```

### Translate All Podcasts
```bash
/localize-content podcast
```

### Translate All Content (VOD)
```bash
/localize-content content
```

## Implementation

**File:** `backend/enrich_translations.py`

**Key Functions:**
- `translate_text(hebrew_text, target_lang)` - Call Claude API
- `enrich_podcast_translations(podcast_id)` - Translate podcast fields
- `enrich_content_translations(content_id)` - Translate VOD fields
- `batch_enrich(content_type, limit)` - Process multiple items

**Claude Model:** `claude-sonnet-4-20250514`

**Cost Estimate:** ~$0.02 per podcast (title + description + author + category)

## Database Fields Updated

### Podcasts
- `title_en`, `title_es`
- `description_en`, `description_es`
- `author_en`, `author_es`
- `category_en`, `category_es`

### Content (VOD)
- `title_en`, `title_es`
- `description_en`, `description_es`
- `category_en`, `category_es`
- `genre_en`, `genre_es`

### Categories
- `name_en`, `name_es`
- `description_en`, `description_es`

## Output

```
🌐 Localizing content...
   Type: podcast
   ID: 507f1f77bcf86cd799439011

📝 Translating fields...
   ✓ title_en: "פודקאסט לדוגמה" → "Example Podcast"
   ✓ title_es: "פודקאסט לדוגמה" → "Podcast de Ejemplo"
   ✓ description_en: Translated (156 chars)
   ✓ description_es: Translated (168 chars)

✅ Translations saved to database

Summary:
   - Fields translated: 4
   - Cost: $0.018
   - Time: 2.3s
```

## Prerequisites

- `ANTHROPIC_API_KEY` environment variable set
- MongoDB connection configured
- Backend server running (or use script directly)

## Related Files

- `backend/enrich_podcasts_translations.py` - Main translation script
- `backend/app/services/ai_agent_service.py` - AI service wrapper
- `backend/app/models/content.py` - Content models with localized fields

## See Also

- `/librarian-audit` - Run full content audit including translation check
- Global agents: `localization-specialist.md`
