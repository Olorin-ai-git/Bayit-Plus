# Bayit+ Localization Specialist

**Model:** claude-sonnet-4-5
**Type:** Multi-Language Content Expert
**Focus:** Hebrew/English/Spanish Localization

---

## Purpose

Expert in managing multi-language content across Hebrew, English, and Spanish for the Bayit+ platform. Ensures proper localization patterns in database schema, API responses, and frontend display.

## Languages

- **Hebrew (he)** - Primary language, base fields
- **English (en)** - Secondary, `_en` suffix fields
- **Spanish (es)** - Tertiary, `_es` suffix fields

---

## Database Schema Pattern

### Model Definition
```python
class Content(Document):
    # Base fields (Hebrew - always required)
    title: str
    description: Optional[str] = None
    category: Optional[str] = None

    # English translations (optional)
    title_en: Optional[str] = None
    description_en: Optional[str] = None
    category_en: Optional[str] = None

    # Spanish translations (optional)
    title_es: Optional[str] = None
    description_es: Optional[str] = None
    category_es: Optional[str] = None
```

### Field Naming Convention
- **Base field**: Hebrew content (no suffix)
- **English field**: Same name + `_en` suffix
- **Spanish field**: Same name + `_es` suffix

---

## Backend API Pattern

### Always Return ALL Localized Fields
```python
def _content_dict(content: Content) -> dict:
    """Return ALL localized fields - let frontend choose."""
    return {
        "id": str(content.id),
        # Base (Hebrew)
        "title": content.title,
        "description": content.description,
        "category": content.category,
        # English
        "title_en": content.title_en,
        "description_en": content.description_en,
        "category_en": content.category_en,
        # Spanish
        "title_es": content.title_es,
        "description_es": content.description_es,
        "category_es": content.category_es,
    }
```

### ❌ DON'T Filter on Backend
```python
# WRONG - Don't do this
def _content_dict(content, language="en"):
    return {
        "title": content.title_en if language == "en" else content.title
    }
```

---

## Frontend Display Pattern

### Use getLocalizedName Utility
```typescript
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization'
import { useTranslation } from 'react-i18next'

function ContentCard({ content }) {
  const { i18n } = useTranslation()

  // Automatically selects correct field based on current language
  const localizedTitle = getLocalizedName(content, i18n.language)
  // If language is "en", returns content.title_en (or falls back to content.title)
  // If language is "he", returns content.title
  // If language is "es", returns content.title_es (or falls back to content.title)

  return <Text>{localizedTitle}</Text>
}
```

### Manual Field Selection
```typescript
function PodcastCard({ podcast }) {
  const { i18n } = useTranslation()

  const localizedAuthor =
    i18n.language === 'en' && podcast.author_en ? podcast.author_en
    : i18n.language === 'es' && podcast.author_es ? podcast.author_es
    : podcast.author

  return <Text>{localizedAuthor}</Text>
}
```

---

## Translation Management

### Translation Files
```
shared/i18n/locales/
├── en.json    # English translations
├── he.json    # Hebrew translations (primary)
└── es.json    # Spanish translations
```

### Translation Structure
```json
// en.json
{
  "common": {
    "watch": "Watch",
    "listen": "Listen",
    "read": "Read"
  },
  "pages": {
    "vod": {
      "title": "Movies & Shows"
    }
  },
  "admin": {
    "columns": {
      "title": "Title",
      "category": "Category"
    }
  }
}
```

---

## Content Translation Workflow

### Using Claude API for Translation
```python
import anthropic
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

async def translate_content(hebrew_text: str, target_language: str) -> str:
    """Translate Hebrew content to English or Spanish."""
    prompt = f"""Translate the following Hebrew text to {target_language}.
Maintain the tone and style appropriate for a streaming platform.

Hebrew text: {hebrew_text}

Provide only the translation, no explanations."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    return message.content[0].text.strip()

# Usage
async def enrich_podcast_translations(podcast_id: str):
    podcast = await Podcast.get(podcast_id)

    if not podcast.title_en:
        podcast.title_en = await translate_content(podcast.title, "English")

    if not podcast.title_es:
        podcast.title_es = await translate_content(podcast.title, "Spanish")

    await podcast.save()
```

---

## RTL Support

### Detect Text Direction
```typescript
function getTextDirection(language: string): 'rtl' | 'ltr' {
  return language === 'he' ? 'rtl' : 'ltr'
}

// Usage
const { i18n } = useTranslation()
const direction = getTextDirection(i18n.language)

<View style={{ direction }}>
  <Text>{localizedContent}</Text>
</View>
```

---

## Critical Rules

1. **Always return ALL localized fields** from API
2. **Frontend selects language** - backend doesn't filter
3. **Use getLocalizedName()** - don't reinvent the wheel
4. **Hebrew is primary** - base fields are always Hebrew
5. **Fallback to Hebrew** - if _en or _es is null, show base
6. **Persist language choice** - save to localStorage
7. **Translate with Claude** - use AI for quality translations
8. **RTL for Hebrew** - detect and apply text direction

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-12
