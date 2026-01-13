# Subtitle Language Validation Feature

## Overview

The Librarian AI Agent now validates subtitle availability and language count for all movies in the content library.

## Implementation Date

2026-01-12

## Requirements

**Mandatory validation for movies:**
- ✅ Must have subtitles enabled (`has_subtitles = True`)
- ✅ Must have at least **3 subtitle languages** in `available_subtitle_languages` list

**Series exceptions:**
- ❌ Series are NOT subject to the 3-language minimum requirement
- ✅ Series only need to have `has_subtitles = True` if they have subtitles

## Files Modified

### 1. `backend/app/services/content_auditor.py`

**Lines 89-99**: Updated docstring to document new checks
```python
"""
Check for missing or incomplete metadata.

Checks:
- Missing thumbnail/backdrop
- Missing TMDB/IMDB data
- Missing description
- Empty cast/director for movies
- Missing subtitles  # NEW
- Insufficient subtitle languages (minimum 3 for movies)  # NEW
"""
```

**Lines 129-135**: Added subtitle validation logic
```python
# Check subtitle availability
if not content.has_subtitles:
    issues.append("missing_subtitles")

# Check minimum subtitle language count for movies (3 languages required)
if not content.is_series and len(content.available_subtitle_languages) < 3:
    issues.append("insufficient_subtitle_languages")
```

## Database Fields Used

The validation uses existing fields in the `Content` model (`backend/app/models/content.py`):

```python
has_subtitles: bool = False
available_subtitle_languages: List[str] = Field(default_factory=list)  # ["en", "he", "es"]
embedded_subtitle_count: int = 0
subtitle_extraction_status: Optional[str] = None
subtitle_last_checked: Optional[datetime] = None
```

## Validation Logic

### Issue Types

Two new issue types are flagged:

1. **`missing_subtitles`**: Content has `has_subtitles = False`
2. **`insufficient_subtitle_languages`**: Movie has fewer than 3 languages

### Decision Tree

```
Is content a movie (is_series = False)?
├─ YES: Is has_subtitles = False?
│   ├─ YES: Flag "missing_subtitles"
│   └─ NO: Continue
│
└─ YES: Does available_subtitle_languages have < 3 items?
    ├─ YES: Flag "insufficient_subtitle_languages"
    └─ NO: Pass validation ✅

Is content a series (is_series = True)?
├─ YES: Is has_subtitles = False?
│   ├─ YES: Flag "missing_subtitles"
│   └─ NO: Pass validation ✅ (no language count requirement)
```

## Test Results

All 6 test cases passed successfully:

✅ **Test 1**: Movie with NO subtitles
   - Issues: `missing_subtitles`, `insufficient_subtitle_languages`

✅ **Test 2**: Movie with 1 language
   - Issues: `insufficient_subtitle_languages`

✅ **Test 3**: Movie with 2 languages
   - Issues: `insufficient_subtitle_languages`

✅ **Test 4**: Movie with 3 languages
   - Issues: None ✅ (VALID)

✅ **Test 5**: Series with 1 language
   - Issues: None ✅ (series exempt from 3-language rule)

✅ **Test 6**: Movie with 6 languages
   - Issues: None ✅ (exceeds minimum)

**Test file**: `backend/test_subtitle_validation_simple.py`

## Integration with Audit Reports

The subtitle validation issues flow through the system as follows:

1. **Librarian Service** calls `audit_content_items()` for each audit run
2. **Content Auditor** calls `check_metadata_completeness()` which now includes subtitle checks
3. **Results returned** in `content_results["missing_metadata"]` list with new issue types
4. **Audit Report** stores issues in `audit_report.missing_metadata` field
5. **API endpoint** `/api/v1/admin/librarian/reports/{audit_id}` returns issues
6. **Admin Dashboard** displays subtitle issues in the report

## Example Audit Report Entry

```json
{
  "missing_metadata": [
    {
      "content_id": "507f1f77bcf86cd799439011",
      "title": "Example Movie",
      "issues": [
        "missing_subtitles",
        "insufficient_subtitle_languages"
      ],
      "fixable": true
    }
  ]
}
```

## Supported Languages

The platform supports 6 subtitle languages:
- Hebrew (he) - Primary
- English (en)
- Spanish (es)
- Arabic (ar)
- Russian (ru)
- French (fr)

## Audit Frequency

The validation runs on:
- **Daily incremental audits**: Recent changes + 10% sample
- **Weekly full audits**: All content items
- **Manual audits**: On-demand via admin dashboard

## Auto-Fix Capability

The issue `fixable: true` indicates that the auto-fixer service could potentially:
1. Extract embedded subtitles from MKV files using FFmpeg
2. Fetch subtitles from TMDB or OpenSubtitles
3. Generate subtitle tracks using live translation services

**Note**: Auto-fix logic is handled by `backend/app/services/auto_fixer.py` (not modified in this implementation).

## Monitoring

Subtitle validation metrics can be tracked via:
- Audit reports dashboard
- `GET /api/v1/admin/librarian/status`
- `GET /api/v1/admin/librarian/reports`

## Next Steps (Optional Enhancements)

1. **Add series-specific validation**: Require 2+ languages for series (lower threshold)
2. **Weighted scoring**: Prioritize Hebrew + English + Spanish as core languages
3. **Auto-fix integration**: Implement automatic subtitle fetching for flagged content
4. **Quality checks**: Validate that subtitle files are well-formed VTT/SRT
5. **Language coverage reports**: Show which movies lack specific languages

## Related Documentation

- Subtitle Feature: `backend/app/api/routes/subtitles.py`
- Subtitle Service: `backend/app/services/subtitle_service.py`
- Content Model: `backend/app/models/content.py`
- Librarian Service: `backend/app/services/librarian_service.py`

---

**Status**: ✅ Production Ready
**Author**: Librarian AI Agent Enhancement
**Version**: 1.0.0
