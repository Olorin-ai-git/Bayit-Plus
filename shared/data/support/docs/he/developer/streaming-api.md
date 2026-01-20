# API סטרימינג

ה-API של הסטרימינג מספק נקודות קצה להפעלת סשני ניגון, קבלת כתובות URL לזרם וניהול איכות סטרימינג אדפטיבית. כל הזרמים משתמשים ב-HLS (HTTP Live Streaming) עם הגנת DRM אופציונלית.

## התחלת סשן ניגון

אתחול סשן סטרימינג:

```
POST /v1/playback/sessions
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "content_id": "cnt_abc123",
  "profile_id": "prf_xyz789",
  "device_type": "web",
  "drm_type": "widevine"
}
```

**תגובה**:

```json
{
  "data": {
    "session_id": "ses_abc123",
    "manifest_url": "https://stream.bayit.plus/.../manifest.m3u8",
    "license_url": "https://drm.bayit.plus/license",
    "expires_at": "2024-01-15T12:00:00Z",
    "resume_position": 1234
  }
}
```

## מניפסט הזרם

כתובת המניפסט מחזירה פלייליסט HLS עם רמות איכות מרובות:

| איכות | רזולוציה | קצב סיביות |
|-------|----------|------------|
| אוטומטי | אדפטיבי | משתנה |
| SD | 720x480 | 1.5 Mbps |
| HD | 1280x720 | 3 Mbps |
| FHD | 1920x1080 | 6 Mbps |
| 4K | 3840x2160 | 15 Mbps |

## הגדרת DRM

Bayit+ תומכת במספר מערכות DRM:

| מערכת DRM | פלטפורמות |
|-----------|-----------|
| Widevine | Android, Chrome, Firefox |
| FairPlay | iOS, Safari, tvOS |
| PlayReady | Windows, Xbox, Edge |

בקשו את סוג ה-DRM המתאים בהתבסס על מכשיר הניגון.

## בחירת איכות

כפיית רמת איכות ספציפית:

```
POST /v1/playback/sessions/{session_id}/quality
Content-Type: application/json

{
  "quality": "fhd"
}
```

## Heartbeat

שמרו על סשן פעיל עם heartbeats תקופתיים:

```
POST /v1/playback/sessions/{session_id}/heartbeat
Content-Type: application/json

{
  "position_seconds": 2345,
  "buffer_health": 15.5,
  "quality": "hd"
}
```

שלחו heartbeats כל 30 שניות במהלך ניגון.

## סיום סשן

סגירה נכונה של סשן ניגון:

```
DELETE /v1/playback/sessions/{session_id}
Content-Type: application/json

{
  "final_position": 3456,
  "completed": false
}
```

זה מתעד את המיקום הסופי לפונקציונליות המשך צפייה.

## מגבלות זרמים במקביל

לחשבונות יש מגבלות זרמים במקביל בהתבסס על רמת המנוי. חריגה מהמגבלה מחזירה סטטוס `429` עם סשנים זמינים בתגובה לסיום אפשרי.

## רצועות שמע וכתוביות

רצועות זמינות רשומות במניפסט. בחרו רצועות בצד הלקוח באמצעות בחירת רצועות HLS סטנדרטית.
