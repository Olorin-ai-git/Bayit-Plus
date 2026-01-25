# Podcast Category Localization Migration

## Overview

This script migrates podcast categories to support all 10 platform languages:
- Hebrew (he) - Default
- English (en)
- Spanish (es)
- French (fr)
- Italian (it)
- Hindi (hi)
- Tamil (ta)
- Bengali (bn)
- Japanese (ja)
- Chinese (zh)

## What It Does

1. Reads all active podcasts from the database
2. Maps Hebrew/English category names to all 10 languages using predefined translations
3. Populates the new category language fields (`category_fr`, `category_it`, etc.)
4. Only updates empty fields (preserves existing translations)

## Usage

### From Backend Directory

```bash
cd backend
poetry run python scripts/localize_podcast_categories.py
```

### Expected Output

```
INFO: Starting podcast category localization migration...
INFO: Found 45 active podcasts to migrate
INFO: Updated podcast 'פודקאסט טכנולוגיה' category 'טכנולוגיה' with 7 translations
INFO: Updated podcast 'News Daily' category 'חדשות' with 7 translations
...
INFO: Migration complete: 42 podcasts updated, 3 skipped
```

## Category Mappings

The script includes translations for common categories:

| Hebrew | English | Spanish | French | Italian | Hindi | Tamil | Bengali | Japanese | Chinese |
|--------|---------|---------|--------|---------|-------|-------|---------|----------|---------|
| כללי | General | General | Général | Generale | सामान्य | பொது | সাধারণ | 一般 | 综合 |
| חדשות | News | Noticias | Actualités | Notizie | समाचार | செய்திகள் | সংবাদ | ニュース | 新闻 |
| פוליטיקה | Politics | Política | Politique | Politica | राजनीति | அரசியல் | রাজনীতি | 政治 | 政治 |
| טכנולוגיה | Tech | Tecnología | Tech | Tecnologia | तकनीक | தொழில்நுட்பம் | প্রযুক্তি | テクノロジー | 科技 |
| עסקים | Business | Negocios | Business | Business | व्यापार | வணிகம் | ব্যবসা | ビジネス | 商业 |
| יהדות | Jewish | Judaísmo | Juif | Ebraico | यहूदी | யூத | ইহুদি | ユダヤ | 犹太 |
| בידור | Entertainment | Entretenimiento | Divertissement | Intrattenimento | मनोरंजन | பொழுதுபோக்கு | বিনোদন | エンターテイメント | 娱乐 |
| ספורט | Sports | Deportes | Sports | Sport | खेल | விளையாட்டு | খেলাধুলা | スポーツ | 体育 |
| היסטוריה | History | Historia | Histoire | Storia | इतिहास | வரலாறு | ইতিহাস | 歴史 | 历史 |
| חינוכי | Educational | Educativo | Éducatif | Educativo | शैक्षिक | கல்வி | শিক্ষামূলক | 教育 | 教育 |
| קומי | Comedy | Comedia | Comédie | Commedia | कॉमेडी | நகைச்சுவை | কমেডি | コメディ | 喜剧 |
| פסיכולוגיה | Psychology | Psicología | Psychologie | Psicologia | मनोविज्ञान | உளவியல் | মনোবিজ্ঞান | 心理学 | 心理学 |

## Adding New Categories

To add translations for new categories:

1. Open `localize_podcast_categories.py`
2. Add new entry to `CATEGORY_TRANSLATIONS` dictionary:

```python
"קטגוריה חדשה": {
    "he": "קטגוריה חדשה",
    "en": "New Category",
    "es": "Nueva Categoría",
    "fr": "Nouvelle Catégorie",
    "it": "Nuova Categoria",
    "hi": "नई श्रेणी",
    "ta": "புதிய வகை",
    "bn": "নতুন বিভাগ",
    "ja": "新しいカテゴリー",
    "zh": "新类别",
},
```

3. Re-run the migration script

## API Changes

After migration, the API automatically returns localized category names based on the `Accept-Language` header:

**Example Request:**
```bash
# English categories
curl -H "Accept-Language: en" http://localhost:8000/api/podcasts/categories

# French categories
curl -H "Accept-Language: fr" http://localhost:8000/api/podcasts/categories

# Hindi categories
curl -H "Accept-Language: hi" http://localhost:8000/api/podcasts/categories
```

**Response:**
```json
{
  "categories": [
    {"id": "חדשות", "name": "News"},  // English
    {"id": "טכנולוגיה", "name": "Tech"},
    ...
  ],
  "total": 12
}
```

## Verification

After running the migration, verify translations:

```bash
# Check a podcast's category fields
poetry run python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.content import Podcast

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Podcast])
    podcast = await Podcast.find_one(Podcast.category != None)
    if podcast:
        print(f'Title: {podcast.title}')
        print(f'Hebrew: {podcast.category}')
        print(f'English: {podcast.category_en}')
        print(f'Spanish: {podcast.category_es}')
        print(f'French: {podcast.category_fr}')
        print(f'Italian: {podcast.category_it}')
        print(f'Hindi: {podcast.category_hi}')
        print(f'Tamil: {podcast.category_ta}')
        print(f'Bengali: {podcast.category_bn}')
        print(f'Japanese: {podcast.category_ja}')
        print(f'Chinese: {podcast.category_zh}')
    client.close()

asyncio.run(check())
"
```

## Notes

- Script is idempotent - safe to run multiple times
- Only updates empty category fields
- Preserves manually set translations
- Logs warnings for unmapped categories
- Skips podcasts without categories

## Troubleshooting

**Issue:** "No translation found for category: X"
- **Solution:** Add mapping for category X to `CATEGORY_TRANSLATIONS`

**Issue:** Migration doesn't update existing translations
- **Solution:** This is by design. Clear specific fields manually if needed:

```python
# Clear French translation for re-migration
await podcast.set({"category_fr": None})
```

## Related Files

- **Model:** `backend/app/models/content.py` - Podcast model with all 10 language fields
- **API:** `backend/app/api/routes/podcasts.py` - Returns localized categories
- **Locales:** `packages/ui/shared-i18n/locales/*.json` - Frontend translations
