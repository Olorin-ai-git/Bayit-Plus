# Content Categorization System

**Status:** Production Ready
**Last Updated:** 2026-02-02
**Maintained by:** Content Team

---

## Overview

Bayit+ uses a comprehensive multi-axis content categorization system that enables:
- Intelligent content organization across sections (Movies, Kids, Judaism)
- Age-appropriate content filtering for kids (0-12) and youngsters (12-17)
- IMDB/TMDB rating integration
- Parental controls with PIN protection
- Automated content tagging via keyword analysis
- Family-friendly content discovery

This document provides a complete technical reference for the categorization system, including database models, API endpoints, filtering logic, and content assignment workflows.

---

## Table of Contents

1. [Database Models](#database-models)
2. [Kids Category Definitions](#kids-category-definitions)
3. [Content Taxonomy System](#content-taxonomy-system)
4. [Family Controls](#family-controls-age-restrictions)
5. [API Routes](#api-routes-for-categorization)
6. [IMDB Ratings Integration](#imdb-ratings-integration)
7. [Kids Content Filtering Logic](#kids-content-filtering-logic)
8. [Database Indexes](#database-indexes-for-categorization)
9. [Movie Assignment Workflows](#movie-assignment-to-categories)
10. [Key Locations Reference](#key-locations-and-files-summary)

---

## Database Models

### Main Content Model

**File:** `backend/app/models/content.py`

The `Content` model is the central document for all media content (movies, series, live channels, podcasts, audiobooks). It uses multiple categorization systems for maximum flexibility.

#### Five-Axis Taxonomy System (Primary)

```python
# Lines 55-77: New 5-axis content classification
section_ids: List[str] = Field(default_factory=list)  # ["movies", "kids"]
primary_section_id: Optional[str] = None  # Main section for priority
content_format: Optional[str] = None  # "movie", "series", "documentary"
audience_id: Optional[str] = None  # "general", "kids", "family", "mature"
genre_ids: List[str] = Field(default_factory=list)  # ["drama", "thriller"]
topic_tags: List[str] = Field(default_factory=list)  # ["jewish", "educational"]
subcategory_ids: List[str] = Field(default_factory=list)  # ["cartoons", "shiurim"]
```

**Key Features:**
- **Multiple Section Support**: Content can appear in multiple sections simultaneously
- **Primary Section**: Defines main navigation location
- **Audience Targeting**: Age-appropriate content classification
- **Fine-Grained Organization**: Subcategories for precise filtering
- **Cross-Cutting Tags**: Topic tags span multiple categories

#### Rating and Age Fields

```python
# Lines 86-88: IMDB ratings (both numeric and string formats)
rating: Optional[Union[str, float]] = None  # e.g., "PG-13" or 7.839 (IMDB score)
imdb_rating: Optional[float] = None  # IMDB numeric rating (e.g., 7.5)
imdb_id: Optional[str] = None  # e.g., "tt1234567"

# Lines 170-171: Kids content fields
is_kids_content: bool = False
age_rating: Optional[int] = None  # Minimum age (3, 5, 7, 10, 12)
content_rating: Optional[str] = None  # G, PG, PG-13, R, TV-MA, etc.
educational_tags: List[str] = Field(default_factory=list)

# Lines 182-188: Youngsters content fields (ages 12-17)
is_youngsters_content: bool = False
youngsters_age_rating: Optional[int] = None
youngsters_moderation_status: Optional[str] = None
```

#### Legacy Fields (Backward Compatibility)

```python
# Lines 79-81
category_id: Optional[str] = None
category_name: Optional[str] = None
```

**Note:** Legacy fields maintained for backward compatibility with older code. New implementations should use the 5-axis taxonomy.

---

## Kids Category Definitions

### Kids Content Model

**File:** `backend/app/models/kids_content.py`

Defines the kids-specific categorization structure.

#### Parent Categories

```python
# Lines 23-32: Kids parent categories
class KidsContentCategory:
    CARTOONS = "cartoons"
    EDUCATIONAL = "educational"
    MUSIC = "music"
    HEBREW = "hebrew"
    STORIES = "stories"
    JEWISH = "jewish"
    ALL = "all"
```

#### Subcategories with Parent Mappings

```python
# Lines 35-64: Kids subcategories
class KidsSubcategory:
    LEARNING_HEBREW = "learning-hebrew"
    YOUNG_SCIENCE = "young-science"
    MATH_FUN = "math-fun"
    NATURE_ANIMALS = "nature-animals"
    INTERACTIVE = "interactive"
    HEBREW_SONGS = "hebrew-songs"
    NURSERY_RHYMES = "nursery-rhymes"
    KIDS_MOVIES = "kids-movies"
    KIDS_SERIES = "kids-series"
    JEWISH_HOLIDAYS = "jewish-holidays"
    TORAH_STORIES = "torah-stories"
    BEDTIME_STORIES = "bedtime-stories"
```

#### Age Groups

```python
# Lines 92-98: Age group definitions
class KidsAgeGroup:
    TODDLERS = "toddlers"  # 0-3 years
    PRESCHOOL = "preschool"  # 3-5 years
    ELEMENTARY = "elementary"  # 5-10 years
    PRETEEN = "preteen"  # 10-12 years
```

---

## Content Taxonomy System

**File:** `backend/app/models/content_taxonomy.py`

Defines the formal taxonomy models for content classification.

### Audience Classification (Age Appropriateness)

```python
# Lines 160-202: Audience model
class Audience(Document):
    slug: str  # "general", "kids", "family", "mature"
    name_key: Optional[str] = None  # i18n key
    description_key: Optional[str] = None
    min_age: Optional[int] = None  # Minimum recommended age
    max_age: Optional[int] = None  # Maximum for kids content
    content_ratings: List[str] = Field(
        default_factory=list
    )  # ["G", "PG", "PG-13"]
    is_active: bool = True
```

**Example Audience:**
```json
{
  "slug": "kids",
  "name_key": "audience.kids",
  "min_age": 0,
  "max_age": 12,
  "content_ratings": ["G", "PG"],
  "is_active": true
}
```

### Content Section (Navigation)

```python
# Lines 25-71: ContentSection model
class ContentSection(Document):
    slug: str  # "movies", "kids", "judaism"
    name_key: Optional[str] = None
    supports_subcategories: bool = False
    is_active: bool = True
    show_on_homepage: bool = True
    show_on_nav: bool = True
```

**Example Section:**
```json
{
  "slug": "kids",
  "name_key": "section.kids",
  "supports_subcategories": true,
  "is_active": true,
  "show_on_homepage": true,
  "show_on_nav": true
}
```

### Section Subcategory

```python
# Lines 73-116: SectionSubcategory model
class SectionSubcategory(Document):
    section_id: str  # Parent section reference
    slug: str  # Unique within section: "cartoons", "shiurim"
    name_key: Optional[str] = None
    is_active: bool = True
```

**Example Subcategory:**
```json
{
  "section_id": "kids",
  "slug": "cartoons",
  "name_key": "subcategory.cartoons",
  "is_active": true
}
```

### Genre (Mood/Style)

```python
# Lines 118-158: Genre model
class Genre(Document):
    slug: str  # "drama", "comedy", "action"
    name_key: Optional[str] = None
    tmdb_id: Optional[int] = None  # TMDB mapping
    is_active: bool = True
```

**Example Genre:**
```json
{
  "slug": "animation",
  "name_key": "genre.animation",
  "tmdb_id": 16,
  "is_active": true
}
```

---

## Family Controls (Age Restrictions)

**File:** `backend/app/models/family_controls.py`

Parental controls system for age-based content filtering.

```python
class FamilyControls(Document):
    user_id: str  # Parent/guardian
    pin_hash: str  # Hashed PIN for security

    # Age limits by section
    kids_age_limit: int = 12  # Max age for kids content (0-12)
    youngsters_age_limit: int = 17  # Max age for youngsters (12-17)

    # Section access controls
    kids_enabled: bool = True
    youngsters_enabled: bool = True

    # Content rating restrictions
    max_content_rating: str = "PG-13"  # G, PG, PG-13, R, TV-MA

    # Time-based restrictions
    viewing_hours_enabled: bool = False
    viewing_start_hour: int = 6
    viewing_end_hour: int = 22
```

### Content Rating Hierarchy

```python
# Lines 184-198: Rating hierarchy for enforcement
rating_hierarchy = {
    "G": 0,       # All ages
    "TV-G": 0,
    "PG": 1,      # Parental guidance
    "TV-PG": 1,
    "PG-13": 2,   # 13+ recommended
    "TV-14": 2,
    "R": 3,       # 17+ restricted
    "TV-MA": 3,   # Mature audiences
}
```

**How it works:**
- Parents set `max_content_rating` (e.g., "PG")
- Content with higher rating level is blocked
- System compares rating levels using hierarchy
- Both MPAA (G, PG, PG-13, R) and TV (TV-G, TV-PG, TV-14, TV-MA) ratings supported

---

## API Routes for Categorization

### Movies/Content Categories

**File:** `backend/app/api/routes/content/categories.py`

#### Get All Categories (Sections)

```http
GET /api/v1/categories
```

**Response:**
```json
[
  {
    "id": "64f1234567890abcdef12345",
    "slug": "kids",
    "name": "Kids",
    "is_active": true,
    "show_on_homepage": true
  }
]
```

#### Get Sections with Subcategories

```http
GET /api/v1/sections
```

**Response:**
```json
[
  {
    "section": {
      "id": "64f1234567890abcdef12345",
      "slug": "kids",
      "name": "Kids"
    },
    "subcategories": [
      {
        "id": "64f9876543210fedcba98765",
        "slug": "cartoons",
        "name": "Cartoons"
      }
    ]
  }
]
```

#### Get Content by Section

```http
GET /api/v1/section/{section_slug}?page=1&limit=20
```

**Example:**
```bash
curl http://localhost:8000/api/v1/section/kids?page=1&limit=20
```

**Response:**
```json
{
  "items": [
    {
      "id": "64fab123456789012345678",
      "title": "Sesame Street",
      "section_ids": ["kids"],
      "primary_section_id": "kids",
      "age_rating": 3,
      "content_rating": "G"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 8
}
```

#### Get Content by Subcategory

```http
GET /api/v1/section/{section_slug}/subcategory/{subcategory_slug}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/section/kids/subcategory/cartoons?page=1
```

---

### Kids Content Endpoints

**File:** `backend/app/api/routes/children.py`

#### Get Kids Categories

```http
GET /api/v1/children/categories
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cartoons",
      "name": "Cartoons",
      "description": "Animated content for kids"
    }
  ]
}
```

#### Get Kids Content

```http
GET /api/v1/children/content?age_max=10&category=educational&page=1&limit=20
```

**Parameters:**
- `age_max` (optional): Maximum age filter (3, 5, 7, 10, 12)
- `category` (optional): Filter by kids category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "items": [
    {
      "id": "64fab123456789012345678",
      "title": "Learning Hebrew with Benny",
      "is_kids_content": true,
      "age_rating": 5,
      "content_rating": "G",
      "educational_tags": ["hebrew", "language"]
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

#### Get Featured Kids Content

```http
GET /api/v1/children/featured?age_max=10
```

**Response:**
```json
{
  "featured": [
    {
      "id": "64fab123456789012345678",
      "title": "Featured Show",
      "age_rating": 7
    }
  ],
  "categories": [
    {
      "id": "cartoons",
      "name": "Cartoons"
    }
  ]
}
```

#### Get Kids Subcategories

```http
GET /api/v1/children/subcategories
```

**Response:**
```json
{
  "subcategories": [
    {
      "slug": "learning-hebrew",
      "name": "Learning Hebrew",
      "parent_category": "educational"
    }
  ]
}
```

#### Get Content by Kids Subcategory

```http
GET /api/v1/children/subcategory/{slug}?age_max=10
```

**Example:**
```bash
curl http://localhost:8000/api/v1/children/subcategory/learning-hebrew?age_max=10
```

---

### Admin Kids Content Management

**File:** `backend/app/api/routes/admin_kids_content.py`

#### Curate Kids Content (Manual)

```http
PATCH /api/v1/admin/kids/curate/{content_id}
```

**Request Body:**
```json
{
  "is_kids_content": true,
  "age_rating": 7,
  "content_rating": "PG",
  "educational_tags": ["hebrew", "jewish"]
}
```

**Response:**
```json
{
  "success": true,
  "content_id": "64fab123456789012345678",
  "message": "Content curated successfully"
}
```

#### Tag VOD as Kids Content (Automated)

```http
POST /api/v1/admin/kids/tag-vod
```

Auto-tags family-friendly VOD based on `content_rating`:
- If `content_rating` is G or PG → mark as kids content
- Sets appropriate `age_rating` based on rating

**Response:**
```json
{
  "success": true,
  "tagged_count": 24,
  "message": "Tagged 24 VOD items as kids content"
}
```

---

## IMDB Ratings Integration

### Where IMDB Data is Stored

**File:** `backend/app/models/content.py` (lines 145-148)

```python
tmdb_id: Optional[int] = None
imdb_id: Optional[str] = None  # e.g., "tt1234567"
imdb_rating: Optional[float] = None  # Numeric rating (e.g., 7.5)
imdb_votes: Optional[int] = None
```

### How IMDB Data is Retrieved

**File:** `backend/app/api/routes/content/movies.py`

Uses TMDB service to fetch IMDB data via TMDB's integration:

```python
if tmdb_data.get("imdb_id"):
    update_fields["imdb_id"] = tmdb_data["imdb_id"]

if tmdb_data.get("imdb_rating") is not None:
    update_fields["imdb_rating"] = tmdb_data["imdb_rating"]

if tmdb_data.get("content_rating"):
    update_fields["content_rating"] = tmdb_data["content_rating"]
```

**TMDB API provides:**
- IMDB ID linkage
- IMDB numeric rating (0.0-10.0)
- Content rating (G, PG, PG-13, R, TV-MA)
- Genre IDs for categorization

---

## Kids Content Filtering Logic

### Kids Content Service

**File:** `backend/app/services/kids_content_service.py`

#### Calculate Relevance Score

```python
# Lines 46-117: Calculate relevance score for kids content
def _calculate_relevance_score(title: str, description: str) -> Tuple[float, List[str], str]:
    """
    Checks against KIDS_KEYWORDS_HE and KIDS_KEYWORDS_EN
    Returns: (relevance_score: 0-10, matched_keywords, category)
    """
```

**Keyword Categories Checked:**

**Hebrew Keywords:**
```python
KIDS_KEYWORDS_HE = {
    "cartoons": ["אנימציה", "קריקטורה", "מצוירים", "דיסני"],
    "educational": ["לימודי", "חינוכי", "חינוך", "למידה"],
    "music": ["שירים", "מוזיקה", "זמר", "נגינה"],
    "hebrew": ["עברית", "לומדים עברית", "שפה עברית"],
    "stories": ["סיפורים", "סיפור", "אגדות", "מעשיות"],
    "jewish": ["יהדות", "תורה", "חגים", "מצוות"],
}
```

**English Keywords:**
```python
KIDS_KEYWORDS_EN = {
    "cartoons": ["animated", "cartoon", "animation", "disney"],
    "educational": ["educational", "learning", "teach", "school"],
    "music": ["music", "songs", "sing", "musical"],
    "hebrew": ["hebrew", "learn hebrew", "hebrew language"],
    "stories": ["stories", "story", "tales", "fairy tales"],
    "jewish": ["jewish", "torah", "holidays", "mitzvot"],
}
```

**Scoring Logic:**
1. Scan title and description for keywords
2. Weight title matches higher than description
3. Return score 0-10 based on matches
4. Assign primary category based on strongest match

#### Categorize Content

```python
# Lines 119-150: Categorize content
def _categorize_content(title, description, educational_tags, genre):
    """
    Priority:
    1. Check educational_tags ("hebrew", "jewish", etc.)
    2. Check Hebrew/Jewish keywords
    3. Check music keywords
    4. Default to ALL category
    """
```

### Family Controls Service

**File:** `backend/app/services/family_controls_service.py`

#### Check if Content is Allowed

```python
# Lines 166-198: Check if content is allowed
def is_content_allowed(
    content_rating: str,
    is_kids: bool,
    controls: FamilyControls
) -> bool:
    # 1. Check section enabled
    if is_kids and not controls.kids_enabled:
        return False

    # 2. Check rating hierarchy
    content_level = rating_hierarchy.get(content_rating, 999)
    max_level = rating_hierarchy.get(controls.max_content_rating, 0)

    return content_level <= max_level
```

**Example:**
```python
# Parent sets max_content_rating = "PG"
# Content has content_rating = "PG-13"
# PG level = 1, PG-13 level = 2
# 2 > 1 → Content BLOCKED
```

---

## Database Indexes for Categorization

**File:** `backend/app/models/content.py` (lines 221-320)

Optimized indexes for fast querying:

```python
indexes = [
    # Taxonomy indexes
    "section_ids",
    "primary_section_id",
    "content_format",
    "audience_id",
    "genre_ids",
    "subcategory_ids",

    # Compound indexes for queries
    ("section_ids", "is_published"),
    ("primary_section_id", "is_published"),
    ("audience_id", "is_published"),
    ("content_format", "is_published"),

    # Kids content indexes
    "is_kids_content",
    "age_rating",
    ("is_kids_content", "age_rating"),
    ("is_kids_content", "is_published", "age_rating"),

    # Youngsters content indexes
    "is_youngsters_content",
    "youngsters_age_rating",
    ("is_youngsters_content", "youngsters_age_rating"),

    # IMDB/rating indexes
    "imdb_rating",
    "content_rating",
]
```

**Performance Benefits:**
- Fast filtering by section: `section_ids` index
- Efficient age-based queries: `age_rating` index
- Published content filtering: Compound indexes with `is_published`
- IMDB rating sorting: `imdb_rating` index

---

## Movie Assignment to Categories

Movies can be assigned to categories through multiple methods:

### 1. Primary Section Assignment

Defines main navigation location:

```python
primary_section_id: "movies"  # or "kids" or "judaism"
```

**Example:**
```json
{
  "title": "The Lion King",
  "primary_section_id": "kids"
}
```

### 2. Multiple Section Cross-Listing

Content appears in multiple sections:

```python
section_ids: ["movies", "kids", "judaism"]
```

**Example:**
```json
{
  "title": "Prince of Egypt",
  "section_ids": ["movies", "kids", "judaism"],
  "primary_section_id": "judaism"
}
```

### 3. Audience Classification

Age appropriateness targeting:

```python
audience_id: "kids"  # or "general", "family", "mature"
```

**Example:**
```json
{
  "title": "Frozen",
  "audience_id": "kids",
  "section_ids": ["movies", "kids"]
}
```

### 4. Kids-Specific Flags

Fine-grained kids content settings:

```python
is_kids_content: True
age_rating: 7  # 3, 5, 7, 10, or 12
content_rating: "G"  # G, PG, PG-13
```

**Example:**
```json
{
  "title": "Sesame Street",
  "is_kids_content": true,
  "age_rating": 3,
  "content_rating": "G",
  "educational_tags": ["learning", "music"]
}
```

### 5. Youngsters-Specific Flags

Teen content (ages 12-17):

```python
is_youngsters_content: True
youngsters_age_rating: 14  # 12, 14, or 17
```

**Example:**
```json
{
  "title": "Spider-Man: Into the Spider-Verse",
  "is_youngsters_content": true,
  "youngsters_age_rating": 12,
  "content_rating": "PG"
}
```

### 6. Subcategory Assignment

Fine-grained organization:

```python
subcategory_ids: ["cartoons", "torah-stories", "learning-hebrew"]
```

**Example:**
```json
{
  "title": "VeggieTales",
  "section_ids": ["kids", "judaism"],
  "subcategory_ids": ["cartoons", "torah-stories"],
  "is_kids_content": true,
  "age_rating": 5
}
```

---

## Assignment Decision Matrix

### PG-13 Movies in Kids Category

**Question:** Can PG-13 movies be assigned to Kids category?

**Answer:** Yes, but with restrictions.

| Content Rating | Kids Eligible? | Age Rating | Youngsters Eligible? |
|----------------|----------------|------------|----------------------|
| **G** | ✅ Yes | 3, 5, 7 | ✅ Yes |
| **PG** | ✅ Yes | 7, 10, 12 | ✅ Yes |
| **PG-13** | ⚠️ Conditional | 12 only | ✅ Yes |
| **R** | ❌ No | N/A | ⚠️ Conditional (17 only) |
| **TV-MA** | ❌ No | N/A | ❌ No |

**PG-13 Assignment Rules:**
1. ✅ Can be assigned to Kids if `age_rating: 12` (maximum for kids)
2. ⚠️ Parents can block via Family Controls (`max_content_rating: "PG"`)
3. ✅ More appropriate for Youngsters section (12-17)
4. ⚠️ Requires manual curation review

**Recommended Assignment:**
```json
{
  "title": "Spider-Man: Homecoming",
  "content_rating": "PG-13",
  "is_kids_content": false,
  "is_youngsters_content": true,
  "youngsters_age_rating": 13,
  "section_ids": ["movies", "youngsters"],
  "primary_section_id": "youngsters"
}
```

---

## Automated vs Manual Curation

### Automated Tagging Workflow

**Endpoint:** `POST /api/v1/admin/kids/tag-vod`

**Logic:**
```python
if content.content_rating in ["G", "PG"]:
    content.is_kids_content = True
    content.age_rating = get_age_from_rating(content.content_rating)
```

**Limitations:**
- Only tags based on content_rating
- Cannot assess cultural/religious appropriateness
- May miss educational value
- No keyword analysis

### Manual Curation Workflow

**Endpoint:** `PATCH /api/v1/admin/kids/curate/{content_id}`

**Benefits:**
- Human review of content suitability
- Custom age rating assignment
- Educational tag addition
- Cultural/religious considerations
- Override automated decisions

**Best Practices:**
1. Review IMDB rating and reviews
2. Watch trailer or sample content
3. Check for themes appropriate for target age
4. Add educational tags if applicable
5. Assign precise age rating (not just content_rating)

---

## Key Locations and Files Summary

| Component | File Path |
|-----------|-----------|
| **Content Model** | `backend/app/models/content.py` |
| **Kids Content Model** | `backend/app/models/kids_content.py` |
| **Youngsters Content Model** | `backend/app/models/youngsters_content.py` |
| **Taxonomy Models** | `backend/app/models/content_taxonomy.py` |
| **Family Controls Model** | `backend/app/models/family_controls.py` |
| **Categories API** | `backend/app/api/routes/content/categories.py` |
| **Kids API** | `backend/app/api/routes/children.py` |
| **Admin Kids Management** | `backend/app/api/routes/admin_kids_content.py` |
| **Kids Content Service** | `backend/app/services/kids_content_service.py` |
| **Family Controls Service** | `backend/app/services/family_controls_service.py` |
| **Content Taxonomy API** | `backend/app/api/routes/content_taxonomy.py` |
| **Content Detail API** | `backend/app/api/routes/content/detail.py` |
| **Movies API** | `backend/app/api/routes/content/movies.py` |

---

## Quick Reference Commands

### Query Kids Content

```bash
# Get all kids content
curl http://localhost:8000/api/v1/children/content

# Get kids content for age 5-7
curl http://localhost:8000/api/v1/children/content?age_max=7

# Get educational kids content
curl http://localhost:8000/api/v1/children/content?category=educational

# Get cartoons subcategory
curl http://localhost:8000/api/v1/children/subcategory/cartoons
```

### Admin Operations

```bash
# Manually curate content
curl -X PATCH http://localhost:8000/api/v1/admin/kids/curate/64fab123 \
  -H "Content-Type: application/json" \
  -d '{
    "is_kids_content": true,
    "age_rating": 7,
    "content_rating": "PG"
  }'

# Auto-tag VOD as kids content
curl -X POST http://localhost:8000/api/v1/admin/kids/tag-vod
```

### Database Queries

```python
# Find all kids content
from app.models.content import Content

kids_content = await Content.find(
    Content.is_kids_content == True,
    Content.is_published == True
).to_list()

# Find kids content by age
kids_for_age_7 = await Content.find(
    Content.is_kids_content == True,
    Content.age_rating <= 7,
    Content.is_published == True
).to_list()

# Find content in multiple sections
multi_section = await Content.find(
    Content.section_ids.in_(["kids", "judaism"]),
    Content.is_published == True
).to_list()
```

---

## Feature Highlights

This comprehensive categorization system provides:

✅ **Multi-Axis Classification** - 5-axis taxonomy for flexible content organization
✅ **Age-Based Filtering** - Kids (0-12) and Youngsters (12-17) sections
✅ **IMDB/TMDB Integration** - Automatic rating and metadata import
✅ **Parental Controls** - PIN-protected content restrictions
✅ **Automated Tagging** - Keyword-based content categorization
✅ **Educational Support** - Educational tags and subcategories
✅ **Cultural Sensitivity** - Jewish/Hebrew content identification
✅ **Cross-Listing** - Content can appear in multiple sections
✅ **Fine-Grained Control** - Subcategories for precise filtering
✅ **Rating Hierarchy** - Enforced content rating restrictions

---

## Related Documentation

- [Database Schema Reference](../technical/DATABASE_SCHEMA_REFERENCE.md) - Complete schema documentation
- [API Overview](../api/API_OVERVIEW.md) - REST API architecture
- [Content Import Guide](../guides/CONTENT_IMPORT_GUIDE.md) - Importing content
- [Family Controls Guide](../guides/FAMILY_CONTROLS_GUIDE.md) - Parental controls setup

---

**Document Status:** Production Ready
**Last Updated:** 2026-02-02
**Maintained by:** Content Team
**Next Review:** 2026-03-02
