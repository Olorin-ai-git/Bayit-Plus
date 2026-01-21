# אימות

ה-API של Bayit+ משתמש ב-JWT (JSON Web Tokens) לאימות. מדריך זה מכסה קבלת טוקנים, תהליכי OAuth 2.0 ונהלי רענון טוקנים.

## שיטות אימות

| שיטה | מקרה שימוש |
|------|-----------|
| OAuth 2.0 | יישומים מול משתמשים |
| מפתחות API | אינטגרציה שרת-לשרת |
| חשבונות שירות | אוטומציה בצד השרת |

## תהליך קוד הרשאה OAuth 2.0

ליישומים הניגשים לנתוני משתמש:

**שלב 1**: הפנו משתמש לנקודת קצה ההרשאה:

```
GET https://auth.bayit.plus/oauth/authorize
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
  &response_type=code
  &scope=read:content read:profile
  &state={random_state}
```

**שלב 2**: החליפו את קוד ההרשאה בטוקנים:

```
POST https://auth.bayit.plus/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&redirect_uri={redirect_uri}
&client_id={client_id}
&client_secret={client_secret}
```

**שלב 3**: קבלו טוקני גישה ורענון:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "dGhp...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:content read:profile"
}
```

## שימוש בטוקני גישה

כללו את טוקן הגישה בכותרת Authorization:

```
GET /v1/content/movies
Authorization: Bearer eyJ...
```

## רענון טוקן

טוקני גישה פגים לאחר שעה אחת. השתמשו בטוקן הרענון לקבלת טוקנים חדשים:

```
POST https://auth.bayit.plus/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={client_id}
&client_secret={client_secret}
```

טוקני רענון תקפים ל-30 יום והם לשימוש חד-פעמי. כל רענון מחזיר טוקן רענון חדש.

## אימות מפתח API

לבקשות שרת-לשרת, השתמשו באימות מפתח API:

```
GET /v1/content/movies
X-API-Key: sk_live_abc123...
```

צרו מפתחות API בפורטל המפתחים תחת **הגדרות** > **מפתחות API**.

## Scopes

| Scope | רמת גישה |
|-------|----------|
| `read:content` | עיון בקטלוג תוכן |
| `read:profile` | גישה לפרופילי משתמש |
| `write:profile` | שינוי העדפות משתמש |
| `read:history` | צפייה בהיסטוריית צפייה |
| `admin` | גישה ניהולית מלאה |

## אבטחת טוקנים

- אחסנו טוקנים בצורה מאובטחת; לעולם אל תחשפו בקוד צד לקוח
- השתמשו ב-HTTPS לכל החלפות טוקנים
- הטמיעו רוטציית טוקנים לסשנים ארוכים
- בטלו טוקנים שנחשפו מיד דרך ה-API
