"""
Categorize podcasts based on their Hebrew names and keywords.
"""
from pymongo import MongoClient


def get_category_from_title(title: str) -> str:
    """Determine podcast category based on Hebrew title keywords"""
    title_lower = title.lower()

    # Keywords for each category
    tech_keywords = ["טכנולוגיה", "קוד", "רובוטיקה", "מוסדניק", "מדע"]
    sports_keywords = ["ספורט", "כדורגל", "כדורסל", "אתלטיקה", "מחלקה"]
    entertainment_keywords = ["בידור", "סרטים", "קולנוע", "מוזיקה", "שחקנים", "ים קול"]
    jewish_keywords = ["יהדות", "תורה", "תפילה", "שבת", "קדוש", "ערך", "זקנים", "צדקה"]
    education_keywords = ["ספרות", "הסטוריה", "תרבות", "ידע", "מחשבה", "פילוסופיה", "השכלה"]
    politics_keywords = ["פוליטיקה", "בחירות", "חוק", "רשת", "ביטחון", "נושא"]

    # Check for keywords (case-insensitive)
    if any(keyword in title for keyword in tech_keywords):
        return "tech"
    elif any(keyword in title for keyword in sports_keywords):
        return "sports"
    elif any(keyword in title for keyword in entertainment_keywords):
        return "entertainment"
    elif any(keyword in title for keyword in jewish_keywords):
        return "jewish"
    elif any(keyword in title for keyword in education_keywords):
        return "education"
    elif any(keyword in title for keyword in politics_keywords):
        return "politics"
    else:
        # Default category based on position
        return "news"


def categorize_podcasts():
    """Categorize all podcasts and update database"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    podcasts = db.podcasts.find({})
    podcast_list = list(podcasts)

    print("📚 Categorizing podcasts:\n")

    categories_count = {
        "news": 0,
        "tech": 0,
        "sports": 0,
        "entertainment": 0,
        "jewish": 0,
        "education": 0,
        "politics": 0,
    }

    for podcast in podcast_list:
        title = podcast["title"]
        category = get_category_from_title(title)

        db.podcasts.update_one(
            {"_id": podcast["_id"]},
            {"$set": {"category": category}}
        )

        categories_count[category] = categories_count.get(category, 0) + 1
        print(f"  {title}")
        print(f"    → {category}\n")

    print(f"{'='*80}")
    print(f"\n✅ Categorization complete!\n")
    print("📊 Category Distribution:")
    for category, count in sorted(categories_count.items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            print(f"  • {category.capitalize()}: {count} podcasts")

    client.close()


if __name__ == "__main__":
    categorize_podcasts()
