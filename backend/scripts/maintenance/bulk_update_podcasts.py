"""
Bulk Update Podcasts with Apple Podcasts RSS Feeds

This script updates multiple podcasts at once with RSS feeds from Apple Podcasts.
"""
import asyncio
import json
from pymongo import MongoClient
from datetime import datetime
from app.core.database import connect_to_mongo, close_mongo_connection
from app.services.apple_podcasts_converter import convert_apple_podcasts_to_rss

# Auto-discovered using iTunes API - 63 out of 73 podcasts found
PODCASTS_MAPPING_JSON = """{
  "אין לנו קרקע אחרת": "https://podcasts.apple.com/podcast/אין-לנו-קרקע-אחרת/id1839162379",
  "אנשים הם כל הסיפור": "https://podcasts.apple.com/podcast/אנשים-הם-כל-הסיפור/id1836708219",
  "בדרך לשלישי": "https://podcasts.apple.com/podcast/בדרך-לשלישי---עם-ליאת-אריאב-ויעל-וינר-|--103fm/id1814080900",
  "בחירות 19': פודקאסטים": "https://podcasts.apple.com/podcast/בחירות-19:-פודקאסטים/id1477741135",
  "בחירות אישיות": "https://podcasts.apple.com/podcast/סמוך-על-סול:-יומן-צפייה---Better-call-Saul:-Recap/id1226478937",
  "ביום פקודה": "https://podcasts.apple.com/podcast/ביום-פקודה/id1777021794",
  "בייבי Talk": "https://podcasts.apple.com/podcast/בייבי-Talk/id1529429020",
  "ביס־מילה": "https://podcasts.apple.com/podcast/ביס־מילה/id1490744111",
  "בכר וקלינבוים": "https://podcasts.apple.com/podcast/בכר-וקלינבוים/id1734099381",
  "בן וינון, בקיצור": "https://podcasts.apple.com/podcast/בן-וינון,-בקיצור---103fm/id1643491580",
  "בעקבות השמש": "https://podcasts.apple.com/podcast/בעקבות-השמש/id1653289397",
  "גט הלנה": "https://podcasts.apple.com/podcast/גט-הלנה/id1761046920",
  "דרוש כפר": "https://podcasts.apple.com/podcast/דרוש-כפר/id1791691945",
  "היחידה": "https://podcasts.apple.com/podcast/היחידה/id1734098483",
  "היינו שם": "https://podcasts.apple.com/podcast/היינו-שם/id1640021982",
  "היכל התרבות": "https://podcasts.apple.com/podcast/שיעורי-תורה---הרב-יגאל-כהן/id1702193213",
  "המוסדניק": "https://podcasts.apple.com/podcast/המוסדניק---עם-אבנר-אברהם/id1791758576",
  "המלחמה": "https://podcasts.apple.com/podcast/על-המלחמה/id1503057789",
  "הסודות מאחורי חלונות הראווה": "https://podcasts.apple.com/podcast/הסודות-מאחורי-חלונות-הראווה/id1844159823",
  "הפסקת פרסומות": "https://podcasts.apple.com/podcast/הפסקת-פרסומות/id1663942904",
  "הצ'יפסר": "https://podcasts.apple.com/podcast/הצ'יפסר/id1735473578",
  "הקפיטליסט": "https://podcasts.apple.com/podcast/הקפיטליסט/id1677122033",
  "הרפורמיסטית": "https://podcasts.apple.com/podcast/הרפורמיסטית/id1753067674",
  "חולה על הבית": "https://podcasts.apple.com/podcast/חולה-על-הבית/id1703967148",
  "חוק ונזק": "https://podcasts.apple.com/podcast/חוק-ונזק/id1676822071",
  "חלון לעולם החדשנות": "https://podcasts.apple.com/podcast/חלון-לעולם-החדשנות/id1795634315",
  "טאובקאסט": "https://podcasts.apple.com/podcast/טאובקאסט/id1803915191",
  "טכנולוגיה חיובית": "https://podcasts.apple.com/podcast/טכנולוגיה-חיובית/id1738380215",
  "יום הפרקינסון הבינלאומי": "https://podcasts.apple.com/podcast/יום-הפרקינסון-הבינלאומי/id1618615283",
  "יותר יהודי ממך": "https://podcasts.apple.com/podcast/יותר-יהודי-ממך/id1803915383",
  "יריב ראוי": "https://podcasts.apple.com/podcast/יריב-ראוי/id1786848597",
  "כוח לחיים": "https://podcasts.apple.com/podcast/כוח-לחיים/id1831083201",
  "ככה קמתי": "https://podcasts.apple.com/podcast/ככה-קמתי---עם-גילי-איצקוביץ'-ואינה-בקלמן-|-103fm/id1832665351",
  "כלכלה מבראשית": "https://podcasts.apple.com/podcast/כלכלה-מבראשית/id1816526545",
  "כסף אנושי": "https://podcasts.apple.com/podcast/כסף-אנושי/id1790459911",
  "להתחיל מחדש": "https://podcasts.apple.com/podcast/להתחיל-מחדש/id1844158687",
  "מה יש במקום": "https://podcasts.apple.com/podcast/מה-יש-במקום/id1771444113",
  "מהנדסים בנייה": "https://podcasts.apple.com/podcast/מהנדסים-בנייה/id1740734020",
  "מועדון המתנדבים": "https://podcasts.apple.com/podcast/מועדון-המתנדבים-|-הסיפורים-והאנשים-שמאחורי-קהילת-המתנדבים-בישראל/id1783264629",
  "מזל סרטן": "https://podcasts.apple.com/podcast/בית-הספר-לקארמה-טובה/id1580961920",
  "מי מנהל את המחלה שלי": "https://podcasts.apple.com/podcast/מי-מנהל-את-המחלה-שלי/id1689189623",
  "מילואימניקים בקהל": "https://podcasts.apple.com/podcast/מילואימניקים-בקהל/id1806148894",
  "מילים ולחן": "https://podcasts.apple.com/podcast/היכל-התהילה/id1470075989",
  "מסלול האצה": "https://podcasts.apple.com/podcast/מסלול-האצה/id1809806128",
  "מסע הבחירות של ניסים משעל": "https://podcasts.apple.com/podcast/מסע-הבחירות-של-ניסים-משעל/id1831345111",
  "מפגשים מהסוג השלישי": "https://podcasts.apple.com/podcast/מפגשים-מהסוג-השלישי/id1853769135",
  "מקדימים רפואה": "https://podcasts.apple.com/podcast/מקדימים-רפואה/id1480148808",
  "מקצוע ב־י": "https://podcasts.apple.com/podcast/מקצוע-ב־י/id1762990855",
  "נקודת מפנה": "https://podcasts.apple.com/podcast/נקודת-מפנה/id1565379450",
  "סיפורו של אריק איינשטיין - חייו מלאי שיר - פודקאסט": "https://podcasts.apple.com/podcast/סיפורו-של-אריק-איינשטיין---חייו-מלאי-שיר---פודקאסט/id1714795181",
  "סנהדרינק": "https://podcasts.apple.com/podcast/סנהדרינק---103fm/id1737728115",
  "ספורט, בקיצור": "https://podcasts.apple.com/podcast/ספורט,-בקיצור---103fm/id1760338874",
  "עולמם הסודי של ילדי הפלא": "https://podcasts.apple.com/podcast/עולמם-הסודי-של-ילדי-הפלא/id1859609690",
  "עם עור ראשון": "https://podcasts.apple.com/podcast/עם-עור-ראשון/id1837688749",
  "עסק שלנו": "https://podcasts.apple.com/podcast/עסק-שלנו/id1802840809",
  "פרופסור קורונה": "https://podcasts.apple.com/podcast/מיטיבי-קשב--הפודקאסט-של-מכון-אבשלום/id1498842852",
  "קולות של תקווה": "https://podcasts.apple.com/podcast/קולות-של-תקווה/id1750584735",
  "רופא פרטי": "https://podcasts.apple.com/podcast/Daily-Kabbalah-Lesson-with-Ari-Goldwag/id281113993",
  "רשת ביטחון": "https://podcasts.apple.com/podcast/משדרים-ביטחון/id1333538418",
  "שיחה אישית": "https://podcasts.apple.com/podcast/The-Bright-Side---שיחה-אישית-על-הצלחה-עסקית/id1546065343",
  "שיחות בגן עדן": "https://podcasts.apple.com/podcast/שיחות-בגן-עדן/id1494143071",
  "שניים עד ארבע, בקיצור": "https://podcasts.apple.com/podcast/שניים-עד-ארבע,-בקיצור---103fm/id1762271275"
}"""

PODCASTS_MAPPING = json.loads(PODCASTS_MAPPING_JSON)


async def bulk_update_podcasts():
    """Update multiple podcasts with RSS feeds from Apple Podcasts URLs."""
    if not PODCASTS_MAPPING:
        print("\n⚠️ No Podcasts Mapping Found\n")
        return

    # Connect to database
    await connect_to_mongo()
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    print("\n" + "="*80)
    print(f"🎙️ Bulk Podcast RSS Update - {len(PODCASTS_MAPPING)} Podcasts")
    print("="*80 + "\n")

    results = {
        "success": 0,
        "failed": 0,
        "not_found": 0,
        "errors": [],
    }

    for i, (podcast_title, apple_url) in enumerate(PODCASTS_MAPPING.items(), 1):
        print(f"[{i:2d}/{len(PODCASTS_MAPPING)}] {podcast_title}...", end=" ", flush=True)

        # Find podcast in database
        podcast = db.podcasts.find_one({"title": podcast_title})
        if not podcast:
            print("❌ Not found")
            results["not_found"] += 1
            results["errors"].append(f"Not found: {podcast_title}")
            continue

        # Convert Apple URL to RSS
        try:
            conversion = await convert_apple_podcasts_to_rss(apple_url)
            if not conversion:
                print("❌ Failed")
                results["failed"] += 1
                results["errors"].append(f"Conversion failed: {podcast_title}")
                continue

            rss_url = conversion["rss_url"]

            # Update podcast with RSS feed
            result = db.podcasts.update_one(
                {"_id": podcast["_id"]},
                {
                    "$set": {
                        "rss_feed": rss_url,
                        "updated_at": datetime.utcnow(),
                    }
                },
            )

            if result.modified_count > 0:
                print("✅")
                results["success"] += 1
            else:
                print("⚠️ Update failed")
                results["failed"] += 1
                results["errors"].append(f"Update failed: {podcast_title}")

        except Exception as e:
            print("❌")
            results["failed"] += 1
            results["errors"].append(f"{podcast_title}: {str(e)}")

    # Print summary
    print("\n" + "="*80)
    print("📊 Bulk Update Summary")
    print("="*80)
    print(f"   ✅ Successful: {results['success']}")
    print(f"   ❌ Failed: {results['failed']}")
    print(f"   ⚠️ Not Found: {results['not_found']}")
    print(f"   📝 Total: {len(PODCASTS_MAPPING)}")

    if results["errors"] and len(results["errors"]) > 0:
        print(f"\n❌ Errors:")
        for error in results["errors"][:5]:
            print(f"   - {error}")
        if len(results["errors"]) > 5:
            print(f"   ... and {len(results['errors']) - 5} more")

    print("\n💡 Next Step: Restart the server to auto-sync all podcasts")
    print("="*80 + "\n")

    client.close()
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(bulk_update_podcasts())
