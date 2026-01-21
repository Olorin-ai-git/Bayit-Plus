# Webhooks

Bayit+ יכולה לשלוח התראות HTTP לשרת שלכם כאשר אירועים ספציפיים מתרחשים. השתמשו ב-webhooks לסנכרון נתונים, אוטומציה של תהליכי עבודה ואינטגרציה עם מערכות חיצוניות.

## הגדרת Webhooks

רשמו נקודת קצה ל-webhook בלוח הבקרה למפתחים או דרך API:

```
POST /v1/webhooks
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "url": "https://your-server.com/webhooks/bayit",
  "events": ["user.created", "subscription.changed", "playback.completed"],
  "secret": "your_webhook_secret"
}
```

## סוגי אירועים

### אירועי משתמש
- `user.created` - משתמש חדש נרשם
- `user.updated` - פרטי משתמש עודכנו
- `user.deleted` - חשבון משתמש נמחק

### אירועי מנוי
- `subscription.created` - מנוי חדש נוצר
- `subscription.changed` - תוכנית מנוי השתנתה
- `subscription.cancelled` - מנוי בוטל
- `subscription.renewed` - מנוי חודש

### אירועי ניגון
- `playback.started` - סשן ניגון התחיל
- `playback.completed` - תוכן הושלם
- `playback.progress` - עדכון התקדמות משמעותית

## פורמט Payload

כל ה-webhooks נשלחים כבקשות POST עם payload JSON:

```json
{
  "id": "evt_abc123",
  "type": "subscription.changed",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "user_id": "usr_xyz789",
    "old_plan": "basic",
    "new_plan": "premium"
  }
}
```

## אימות Webhooks

אמתו ש-webhooks נכנסים מגיעים מ-Bayit+ על ידי בדיקת החתימה בכותרת `X-Bayit-Signature`:

```
X-Bayit-Signature: sha256=abc123...
```

## ניסיונות חוזרים

אם השרת שלכם מחזיר קוד שגיאה, נבצע ניסיונות חוזרים עם backoff אקספוננציאלי:

- ניסיון 1: מיידי
- ניסיון 2: 1 דקה
- ניסיון 3: 5 דקות
- ניסיון 4: 30 דקות
- ניסיון 5: שעתיים

לאחר 5 ניסיונות כושלים, ה-webhook מסומן כנכשל.

## שיטות עבודה מומלצות

1. **החזירו תגובות מהר** - החזירו 200 מיידית ועבדו באסינכרון
2. **טפלו בכפילויות** - אירועים עשויים להישלח יותר מפעם אחת
3. **בדקו חתימות** - אמתו תמיד את מקור ה-webhook
4. **רשמו הכל** - שמרו לוגים לצורך ניפוי שגיאות
