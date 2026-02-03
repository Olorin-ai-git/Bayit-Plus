# Trivia Subtitle Language Synchronization - Design Document

**Status:** Draft
**Author:** Claude Code
**Date:** 2026-02-02
**Last Updated:** 2026-02-02

## Executive Summary

This design document outlines the implementation for synchronizing trivia display language with the user's selected subtitle track. Currently, trivia displays in the app's i18n locale language, which creates a disconnect when users select different subtitle languages. This implementation will ensure trivia always displays in the language matching the selected subtitle (English, Hebrew, or Spanish), with English as the fallback for all other languages.

## Problem Statement

### Current Behavior
1. **Trivia Generation**: Generated in Hebrew (primary), with optional English/Spanish translations
2. **Trivia Display**: Uses app's i18n locale setting (`i18n.language`)
3. **Subtitle Selection**: User can select from 50+ languages independently
4. **Disconnect**: User selects French subtitles but sees trivia in Hebrew/English based on app locale

### Desired Behavior
1. **Trivia Generation**: Always generated in English (source language)
2. **Trivia Translation**: Automatically translated to Hebrew and Spanish
3. **Trivia Display**: Matches selected subtitle language
   - Hebrew subtitle → Hebrew trivia
   - Spanish subtitle → Spanish trivia
   - All other languages → English trivia

## Architecture Design

### 1. Data Model Changes

#### Current Model (backend/app/models/trivia.py)
```python
class TriviaFactModel(BaseModel):
    fact_id: str
    text: str                    # Hebrew (primary)
    text_en: Optional[str]       # English translation
    text_es: Optional[str]       # Spanish translation
    # ... other fields
```

#### New Model (Proposed)
```python
class TriviaFactModel(BaseModel):
    fact_id: str
    text: str                    # English (source language)
    source_language: str = "en"  # Always "en"
    translations: Dict[str, str] = Field(
        default_factory=dict,
        description="Translations: {'he': '...', 'es': '...'}"
    )
    # ... other fields

    @field_validator("translations")
    @classmethod
    def validate_translations(cls, v: Dict[str, str]) -> Dict[str, str]:
        """Ensure only valid language codes."""
        allowed_langs = {"he", "es"}
        invalid = set(v.keys()) - allowed_langs
        if invalid:
            raise ValueError(f"Invalid translation languages: {invalid}")
        return v
```

#### Migration Strategy
- **Backward Compatibility**: Keep reading old format during migration
- **Data Transform**:
  ```python
  # OLD → NEW transformation
  old: {text: "עובדה", text_en: "Fact", text_es: "Hecho"}
  new: {
    text: "Fact",                    # English as source
    source_language: "en",
    translations: {
      "he": "עובדה",                 # Hebrew translation
      "es": "Hecho"                  # Spanish translation
    }
  }
  ```

### 2. Translation Service Integration

#### Service Selection
**Use Existing**: `bayit_translation.TranslationService`

```python
from bayit_translation import TranslationService

async def translate_trivia_fact(
    english_text: str,
    translation_service: TranslationService
) -> Dict[str, str]:
    """Translate English trivia to Hebrew and Spanish."""
    translations = {}

    # Translate to Hebrew
    try:
        translations["he"] = await translation_service.translate_text(
            text=english_text,
            source_lang="en",
            target_lang="he"
        )
    except Exception as e:
        logger.warning(f"Hebrew translation failed: {e}")
        translations["he"] = english_text  # Fallback to English

    # Translate to Spanish
    try:
        translations["es"] = await translation_service.translate_text(
            text=english_text,
            source_lang="en",
            target_lang="es"
        )
    except Exception as e:
        logger.warning(f"Spanish translation failed: {e}")
        translations["es"] = english_text  # Fallback to English

    return translations
```

#### Performance Optimization
- **Batch Translation**: Translate all facts for a content item together
- **Caching**: Cache translations to avoid redundant API calls
- **Async Execution**: Translate Hebrew and Spanish concurrently using `asyncio.gather()`

### 3. Trivia Generator Updates

#### Current Flow
```
AI Prompt (Hebrew) → Generate Hebrew text → Optional translate to English/Spanish
```

#### New Flow
```
AI Prompt (English) → Generate English text → Translate to Hebrew & Spanish
```

#### Implementation Changes
**File**: `backend/app/services/trivia/trivia_generator.py`

```python
class TriviaGenerationService:
    def __init__(self):
        self.tmdb_service = TMDBService()
        self.translation_service = TranslationService()
        self._anthropic_client: Optional[AsyncAnthropic] = None

    async def generate_trivia(
        self,
        content: Content,
        enrich: bool = False,
    ) -> ContentTrivia:
        """Generate trivia in English with Hebrew/Spanish translations."""
        facts: list[TriviaFactModel] = []
        sources_used: list[str] = []

        if enrich and content.tmdb_id:
            # Generate facts in English
            tmdb_context = await fetch_tmdb_context(content, self.tmdb_service)
            if tmdb_context:
                try:
                    # Generate chained facts in English
                    english_facts = await generate_chained_facts(
                        content,
                        self.anthropic_client,
                        tmdb_context,
                        language="en",  # Always English
                        existing_count=len(facts),
                    )

                    # Translate to Hebrew and Spanish
                    for fact in english_facts:
                        fact.translations = await translate_trivia_fact(
                            fact.text,
                            self.translation_service
                        )

                    facts.extend(english_facts)
                    sources_used.extend(["ai", "tmdb"])
                except Exception as e:
                    logger.warning(f"Trivia generation failed: {e}")

        # ... rest of the method
```

### 4. Frontend Display Logic

#### Current Implementation
**File**: `shared/components/player/trivia/MultilingualTextDisplay.tsx`

```typescript
// CURRENT - Uses i18n locale
const { i18n } = useTranslation()
const currentLang = i18n.language  // App locale (he, en, es)
const text = getTextForLanguage(fact, currentLang)
```

#### New Implementation

```typescript
interface MultilingualTextDisplayProps {
  fact: TriviaFact
  currentSubtitleLang: string | null  // From subtitle selection
  isTV?: boolean
}

export function MultilingualTextDisplay({
  fact,
  currentSubtitleLang,
  isTV = false,
}: MultilingualTextDisplayProps) {
  // Get display text based on subtitle selection
  const displayText = getDisplayTextForSubtitleLang(fact, currentSubtitleLang)
  const displayLang = getDisplayLang(currentSubtitleLang)
  const langInfo = getTriviaLanguageInfo(displayLang)

  return (
    <View style={styles.multilingualContainer}>
      <View style={[styles.languageRow, langInfo.rtl && styles.languageRowRTL]}>
        <Text style={styles.flagIcon}>{langInfo.flag}</Text>
        <Text style={[styles.factText, langInfo.rtl && styles.factTextRTL]}>
          {displayText}
        </Text>
      </View>
    </View>
  )
}

function getDisplayTextForSubtitleLang(
  fact: TriviaFact,
  currentSubtitleLang: string | null
): string {
  // Hebrew subtitle → show Hebrew translation
  if (currentSubtitleLang === 'he') {
    return fact.translations?.he || fact.text
  }

  // Spanish subtitle → show Spanish translation
  if (currentSubtitleLang === 'es') {
    return fact.translations?.es || fact.text
  }

  // All other languages → show English source
  return fact.text
}

function getDisplayLang(currentSubtitleLang: string | null): string {
  if (currentSubtitleLang === 'he') return 'he'
  if (currentSubtitleLang === 'es') return 'es'
  return 'en'
}
```

#### Component Integration

**Update TriviaOverlay and TriviaCard**:
```typescript
// In VideoPlayer or parent component
const { currentSubtitleLang } = useSubtitles()

// Pass to trivia components
<TriviaOverlay
  currentSubtitleLang={currentSubtitleLang}
  // ... other props
/>

<TriviaCard
  fact={currentFact}
  currentSubtitleLang={currentSubtitleLang}
  // ... other props
/>
```

### 5. API Updates

#### Backend Response Model
**File**: `backend/app/models/trivia.py`

```python
class TriviaFactResponse(BaseModel):
    """API response for a single trivia fact."""
    fact_id: str
    text: str  # English (source)
    source_language: str = "en"

    # Translation dictionary
    translations: Dict[str, str] = Field(
        default_factory=dict,
        description="Translations: {'he': '...', 'es': '...'}"
    )

    trigger_time: Optional[float] = None
    category: str
    display_duration: int
    priority: int

    # Chain fields
    chain_id: Optional[str] = None
    chain_order: Optional[int] = None
    has_follow_up: bool = False

    class Config:
        from_attributes = True
```

#### Frontend TypeScript Types
**File**: `shared/types/trivia.ts`

```typescript
export interface TriviaFact {
  fact_id: string
  text: string  // English (source)
  source_language: 'en'

  // Translation dictionary
  translations?: {
    he?: string  // Hebrew translation
    es?: string  // Spanish translation
  }

  trigger_time: number | null
  trigger_type: 'time' | 'scene' | 'actor' | 'random'
  category: TriviaCategory
  display_duration: number
  priority: number
  related_person?: string

  // Chain fields
  chain_id?: string | null
  chain_order?: number | null
  has_follow_up?: boolean
}
```

### 6. Data Migration Plan

#### Migration Script
**File**: `backend/scripts/migrate_trivia_translations.py`

```python
"""
Migrate trivia from old format to new format.
OLD: text (Hebrew), text_en (English), text_es (Spanish)
NEW: text (English), translations: {he: ..., es: ...}
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def migrate_trivia():
    """Migrate all trivia facts to new format."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]
    collection = db["content_trivia"]

    # Find all documents
    cursor = collection.find({})
    migrated_count = 0
    error_count = 0

    async for doc in cursor:
        try:
            # Migrate each fact in the document
            updated_facts = []
            for fact in doc.get("facts", []):
                # Extract old fields
                old_text = fact.get("text", "")  # Hebrew
                old_text_en = fact.get("text_en", "")  # English
                old_text_es = fact.get("text_es", "")  # Spanish

                # Create new format
                new_fact = {
                    **fact,
                    "text": old_text_en or old_text,  # English as source
                    "source_language": "en",
                    "translations": {}
                }

                # Add translations if available
                if old_text:
                    new_fact["translations"]["he"] = old_text
                if old_text_es:
                    new_fact["translations"]["es"] = old_text_es

                # Remove old fields
                new_fact.pop("text_en", None)
                new_fact.pop("text_es", None)

                updated_facts.append(new_fact)

            # Update document
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"facts": updated_facts}}
            )
            migrated_count += 1

        except Exception as e:
            print(f"Error migrating document {doc.get('_id')}: {e}")
            error_count += 1

    print(f"Migration complete: {migrated_count} documents migrated, {error_count} errors")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_trivia())
```

#### Rollback Plan
```python
async def rollback_migration():
    """Rollback migration to old format."""
    # Reverse transformation
    new_fact["text"] = translations.get("he", text)  # Hebrew as primary
    new_fact["text_en"] = text  # English as translation
    new_fact["text_es"] = translations.get("es", "")
```

## Implementation Phases

### Phase 1: Backend Model Updates (Task #2)
- Update `TriviaFactModel` schema
- Add validators for translations dict
- Update database indexes if needed
- **Duration**: 2 hours
- **Dependencies**: None

### Phase 2: Translation Service Integration (Task #3)
- Create `translate_trivia_fact()` helper function
- Integrate with existing `bayit_translation.TranslationService`
- Add error handling and fallbacks
- **Duration**: 3 hours
- **Dependencies**: Phase 1

### Phase 3: Trivia Generator Updates (Task #4)
- Update AI prompts to generate in English
- Add translation step after generation
- Update all fact generator functions
- **Duration**: 4 hours
- **Dependencies**: Phase 1, Phase 2

### Phase 4: Frontend Display Updates (Task #5)
- Update `MultilingualTextDisplay` component
- Remove i18n locale dependency
- Add `currentSubtitleLang` prop
- Update parent components (TriviaOverlay, TriviaCard)
- **Duration**: 3 hours
- **Dependencies**: Phase 6 (API types)

### Phase 5: API Updates (Task #6)
- Update backend response models
- Update TypeScript types
- Update API documentation
- **Duration**: 2 hours
- **Dependencies**: Phase 1

### Phase 6: Data Migration (Task #7)
- Create migration script
- Test on staging data
- Execute production migration
- Verify data integrity
- **Duration**: 3 hours
- **Dependencies**: Phase 1, Phase 2, Phase 3, Phase 5

### Phase 7: Testing (Task #8)
- Backend unit tests
- Frontend component tests
- Integration tests
- End-to-end tests
- **Duration**: 4 hours
- **Dependencies**: All previous phases

## Testing Strategy

### Backend Tests
**File**: `backend/tests/api/test_trivia_multilingual.py`

```python
async def test_trivia_generation_english_source():
    """Test trivia generated in English."""
    content = await create_test_content()
    trivia = await trivia_service.generate_trivia(content, enrich=True)

    assert trivia.facts[0].text  # English source
    assert trivia.facts[0].source_language == "en"
    assert "he" in trivia.facts[0].translations
    assert "es" in trivia.facts[0].translations

async def test_trivia_translations_hebrew_spanish():
    """Test Hebrew and Spanish translations exist."""
    content = await create_test_content()
    trivia = await trivia_service.generate_trivia(content, enrich=True)

    for fact in trivia.facts:
        assert fact.translations["he"]  # Hebrew exists
        assert fact.translations["es"]  # Spanish exists
        assert fact.translations["he"] != fact.text  # Different from English
```

### Frontend Tests
**File**: `shared/components/player/trivia/__tests__/MultilingualTextDisplay.test.tsx`

```typescript
describe('MultilingualTextDisplay', () => {
  const mockFact: TriviaFact = {
    fact_id: '123',
    text: 'Fact in English',
    source_language: 'en',
    translations: {
      he: 'עובדה בעברית',
      es: 'Hecho en español'
    },
    // ... other fields
  }

  it('displays Hebrew when subtitle is Hebrew', () => {
    const { getByText } = render(
      <MultilingualTextDisplay
        fact={mockFact}
        currentSubtitleLang="he"
      />
    )
    expect(getByText('עובדה בעברית')).toBeTruthy()
  })

  it('displays Spanish when subtitle is Spanish', () => {
    const { getByText } = render(
      <MultilingualTextDisplay
        fact={mockFact}
        currentSubtitleLang="es"
      />
    )
    expect(getByText('Hecho en español')).toBeTruthy()
  })

  it('displays English for other languages', () => {
    const { getByText } = render(
      <MultilingualTextDisplay
        fact={mockFact}
        currentSubtitleLang="fr"
      />
    )
    expect(getByText('Fact in English')).toBeTruthy()
  })
})
```

## Performance Considerations

### Translation API Costs
- **Current**: ~1 translation per fact (Hebrew → English OR Spanish)
- **New**: 2 translations per fact (English → Hebrew, English → Spanish)
- **Cost Impact**: ~2x translation API calls
- **Mitigation**: Cache translations, batch requests

### Generation Time
- **Current**: ~2-3 seconds per content
- **New**: ~3-5 seconds per content (additional translation step)
- **Mitigation**:
  - Async translation (parallel Hebrew + Spanish)
  - Background job for non-urgent content

### Database Storage
- **Current**: ~150 bytes per fact (text + text_en + text_es)
- **New**: ~180 bytes per fact (text + translations dict + source_language)
- **Impact**: +20% storage per fact
- **Mitigation**: Negligible impact on MongoDB Atlas

## Security Considerations

### Translation Service
- Use existing authenticated `bayit_translation.TranslationService`
- No new external API endpoints
- Rate limiting already in place

### Data Validation
- Validate `source_language` is always "en"
- Validate `translations` contains only "he" and "es" keys
- Sanitize text before translation (prevent injection)

## Backward Compatibility

### API Compatibility
- Keep old field names during migration period
- Support both old and new formats in API responses
- Gradual deprecation of `text_he`, `text_en`, `text_es`

### Client Compatibility
- Frontend handles missing `translations` field gracefully
- Fallback to old fields if `translations` not present
- Mobile apps updated to use new format

## Success Metrics

### Functional Metrics
- ✅ Trivia language matches subtitle selection 100% of time
- ✅ Hebrew subtitle → Hebrew trivia (when available)
- ✅ Spanish subtitle → Spanish trivia (when available)
- ✅ Other languages → English trivia

### Performance Metrics
- ⏱️ Generation time < 5 seconds per content
- ⏱️ Translation success rate > 95%
- 💰 Translation cost increase < 2.5x

### Quality Metrics
- 📝 Translation quality score > 4/5 (manual review)
- 🐛 Bug reports related to trivia language < 5 per month
- 👍 User satisfaction with trivia language matching > 90%

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Translation API failures | High | Medium | Fallback to English, retry logic |
| Increased generation time | Medium | High | Async translation, background jobs |
| Migration data loss | High | Low | Backup before migration, rollback plan |
| Cost overrun | Medium | Medium | Monitor costs, set quotas |
| Poor translation quality | Medium | Medium | Manual review, user feedback loop |

## Rollout Plan

### Phase 1: Development (Week 1)
- Implement backend changes
- Implement frontend changes
- Unit and integration tests

### Phase 2: Staging (Week 2)
- Deploy to staging environment
- Migrate staging data
- QA testing
- Performance testing

### Phase 3: Production Rollout (Week 3)
- Deploy backend to production
- Migrate production data (maintenance window)
- Deploy frontend to production
- Monitor for 48 hours

### Phase 4: Validation (Week 4)
- User acceptance testing
- Performance monitoring
- Cost analysis
- Bug fixes

## Open Questions

1. **Translation Quality**: Should we use Claude (Anthropic) or OpenAI for translations?
   - **Recommendation**: Use Claude for consistency with other AI features

2. **Caching Strategy**: How long should we cache translations?
   - **Recommendation**: Cache indefinitely (translations don't change)

3. **Fallback Language**: If Hebrew translation fails, show English or Spanish?
   - **Recommendation**: Always fallback to English (source language)

4. **Migration Timing**: Migrate during low-traffic period or gradually?
   - **Recommendation**: Gradual migration with dual-mode support

## Conclusion

This design provides a comprehensive solution for synchronizing trivia display language with subtitle selection. The implementation is straightforward, leverages existing translation infrastructure, and provides a better user experience by ensuring trivia and subtitles are always in the same language (or English for unsupported languages).

The phased approach allows for incremental development and testing, with clear rollback capabilities at each stage. The total implementation time is estimated at 21 hours across 7 phases.

## Appendix

### A. Language Support Matrix

| Subtitle Language | Trivia Display | Translation Source |
|-------------------|----------------|-------------------|
| Hebrew (he) | Hebrew | Translated from English |
| Spanish (es) | Spanish | Translated from English |
| English (en) | English | Source language |
| French (fr) | English | Source language |
| Chinese (zh) | English | Source language |
| Arabic (ar) | English | Source language |
| ... (all other 45+ languages) | English | Source language |

### B. Database Schema Comparison

**Before:**
```json
{
  "fact_id": "abc123",
  "text": "עובדה מעניינת",
  "text_en": "Interesting fact",
  "text_es": "Hecho interesante",
  "category": "cast"
}
```

**After:**
```json
{
  "fact_id": "abc123",
  "text": "Interesting fact",
  "source_language": "en",
  "translations": {
    "he": "עובדה מעניינת",
    "es": "Hecho interesante"
  },
  "category": "cast"
}
```

### C. Related Documentation
- [Trivia Feature Plan V8](/docs/plans/TRIVIA_FEATURE_PLAN_V8.md)
- [Subtitle System Documentation](/docs/features/SUBTITLE_VALIDATION_FEATURE.md)
- [Translation Service Documentation](/backend/docs/localization/LOCALIZATION_README.md)
