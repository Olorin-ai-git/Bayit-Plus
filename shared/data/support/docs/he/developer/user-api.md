# User API

ה-User API מספק גישה לחשבונות משתמש, פרופילים, העדפות ורשימות צפייה. נקודות קצה אלה דורשות scopes OAuth מתאימים לגישה לנתוני משתמש.

## קבלת משתמש נוכחי

אחזרו את מידע החשבון של המשתמש המאומת:

```
GET /v1/users/me
Authorization: Bearer {access_token}
```

**תגובה**:

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "subscription": {
      "plan": "premium",
      "status": "active",
      "expires_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

## פרופילי משתמש

רשימת פרופילים תחת החשבון:

```
GET /v1/users/me/profiles
```

יצירת פרופיל חדש:

```
POST /v1/users/me/profiles
Content-Type: application/json

{
  "name": "שם פרופיל",
  "avatar_id": "avatar_01",
  "is_kids_profile": false,
  "age_range": "adult"
}
```

עדכון הגדרות פרופיל:

```
PATCH /v1/users/me/profiles/{profile_id}
```

## העדפות פרופיל

קבלת העדפות פרופיל:

```
GET /v1/profiles/{profile_id}/preferences
```

עדכון העדפות:

```
PATCH /v1/profiles/{profile_id}/preferences
Content-Type: application/json

{
  "language": "he",
  "subtitle_language": "he",
  "autoplay_enabled": true,
  "maturity_level": "pg13"
}
```

## רשימת צפייה

קבלת רשימת הצפייה של הפרופיל:

```
GET /v1/profiles/{profile_id}/watchlist
```

הוספת תוכן לרשימת צפייה:

```
POST /v1/profiles/{profile_id}/watchlist
Content-Type: application/json

{
  "content_id": "cnt_abc123"
}
```

הסרה מרשימת צפייה:

```
DELETE /v1/profiles/{profile_id}/watchlist/{content_id}
```

## היסטוריית צפייה

אחזור היסטוריית צפייה:

```
GET /v1/profiles/{profile_id}/history
  ?page=1&per_page=50
```

רישום התקדמות נגינה:

```
POST /v1/profiles/{profile_id}/history
Content-Type: application/json

{
  "content_id": "cnt_abc123",
  "position_seconds": 1234,
  "completed": false
}
```

## המשך צפייה

קבלת תוכן בתהליך לפרופיל:

```
GET /v1/profiles/{profile_id}/continue-watching
```

מחזיר תוכן עם התקדמות שמורה, ממוין לפי זמן צפייה אחרון.
