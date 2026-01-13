"""
Fix podcast image URLs to use full backend API paths.
"""
from pymongo import MongoClient

def fix_image_urls():
    """Update all podcast cover URLs to use full API paths"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    # Get all podcasts with local image URLs
    podcasts = db.podcasts.find({"cover": {"$regex": "^/uploads/"}})
    podcast_list = list(podcasts)

    updated = 0
    for podcast in podcast_list:
        old_url = podcast["cover"]
        # Convert /uploads/podcasts/xxx.jpg to http://localhost:8000/uploads/podcasts/xxx.jpg
        new_url = f"http://localhost:8000{old_url}"

        db.podcasts.update_one(
            {"_id": podcast["_id"]},
            {"$set": {"cover": new_url}}
        )
        updated += 1

    print(f"✅ Updated {updated} podcast URLs to use full backend API paths")
    print(f"   Format: http://localhost:8000/uploads/podcasts/xxx.jpg")

    client.close()

if __name__ == "__main__":
    fix_image_urls()
