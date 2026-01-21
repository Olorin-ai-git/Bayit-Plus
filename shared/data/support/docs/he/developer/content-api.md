# Content API

ה-Content API מספק גישה לקטלוג המדיה של Bayit+ הכולל סרטים, סדרות, ערוצים ופודקאסטים. השתמשו בנקודות קצה אלה לעיון, חיפוש ואחזור פרטי תוכן.

## רשימת תוכן

אחזרו רשימות תוכן מעומדות:

```
GET /v1/content
```

**פרמטרי שאילתה**:

| פרמטר | סוג | תיאור |
|-------|-----|-------|
| `type` | string | סינון לפי סוג תוכן (movie, series, channel, podcast) |
| `category` | string | סינון לפי slug קטגוריה |
| `rating` | string | סינון לפי דירוג גיל |
| `q` | string | שאילתת חיפוש |
| `page` | integer | מספר עמוד |
| `per_page` | integer | פריטים לעמוד (מקסימום 100) |

**דוגמת בקשה**:

```bash
curl -X GET "https://api.bayit.plus/v1/content?type=movie&category=drama&per_page=20" \
  -H "Authorization: Bearer {access_token}"
```

## קבלת פרטי תוכן

אחזרו פרטים מלאים לפריט תוכן ספציפי:

```
GET /v1/content/{content_id}
```

**תגובה**:

```json
{
  "data": {
    "id": "cnt_abc123",
    "type": "movie",
    "title": "Example Movie",
    "description": "סיפור מרתק על...",
    "rating": "PG-13",
    "runtime_minutes": 120,
    "release_year": 2024,
    "categories": ["drama", "thriller"],
    "cast": [
      {"name": "Actor Name", "role": "Character"}
    ],
    "images": {
      "poster": "https://cdn.bayit.plus/...",
      "backdrop": "https://cdn.bayit.plus/..."
    }
  }
}
```

## סדרות ופרקים

רשימת פרקים לסדרה:

```
GET /v1/content/{series_id}/seasons/{season_number}/episodes
```

קבלת פרטי פרק בודד:

```
GET /v1/content/{series_id}/episodes/{episode_id}
```

## ערוצים חיים

קבלת לוח שידורים נוכחי לערוץ:

```
GET /v1/content/channels/{channel_id}/schedule
  ?date=2024-01-15
```

## פודקאסטים

רשימת פרקי פודקאסט:

```
GET /v1/content/podcasts/{podcast_id}/episodes
  ?page=1&per_page=50
```

## קטגוריות תוכן

רשימת כל הקטגוריות הזמינות:

```
GET /v1/categories
```

קבלת תוכן בתוך קטגוריה:

```
GET /v1/categories/{category_slug}/content
```

## חיפוש

חיפוש טקסט מלא בקטלוג:

```
GET /v1/search?q=search+term&type=movie,series
```

תוצאות החיפוש כוללות ציון רלוונטיות והדגשת התאמות בכותרות ותיאורים.
