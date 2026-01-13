"""
Enhance podcast cover images with better visual design.
"""
from pymongo import MongoClient
import hashlib


def get_gradient_colors(podcast_title: str):
    """Generate two complementary colors based on podcast title hash"""
    hash_obj = hashlib.md5(podcast_title.encode())
    hash_hex = hash_obj.hexdigest()

    # Predefined color palettes for variety
    palettes = [
        ("FF6B6B", "C92A2A"),  # Red
        ("4ECDC4", "0A8B8B"),  # Teal
        ("45B7D1", "0063B1"),  # Blue
        ("FFA07A", "FF4500"),  # Orange
        ("98D8C8", "2A7F62"),  # Green
        ("F7DC6F", "F39C12"),  # Yellow
        ("BB8FCE", "7D3C98"),  # Purple
        ("85C1E2", "3498DB"),  # Light Blue
        ("F8B88B", "D2691E"),  # Brown
        ("AED6F1", "2E86C1"),  # Sky Blue
    ]

    # Use hash to pick a color palette
    palette_index = int(hash_hex[:8], 16) % len(palettes)
    color1, color2 = palettes[palette_index]

    return color1, color2


def get_poster_url(podcast_title: str):
    """Generate a visually appealing poster URL for a podcast"""
    color1, color2 = get_gradient_colors(podcast_title)

    # Use dummyimage.com which is reliable
    # Format: https://dummyimage.com/WIDTHxHEIGHT/FOREGROUND/BACKGROUND.FORMAT
    return f"https://dummyimage.com/300x300/{color1}/{color2}.jpg"


def update_covers():
    """Update all podcasts with enhanced cover images"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    podcasts = db.podcasts.find({})
    podcast_list = list(podcasts)

    print("🎨 Enhancing podcast cover images:\n")

    updated = 0
    for podcast in podcast_list:
        title = podcast["title"]
        poster_url = get_poster_url(title)

        db.podcasts.update_one(
            {"_id": podcast["_id"]},
            {"$set": {"cover": poster_url}}
        )
        updated += 1

        if updated % 10 == 0:
            print(f"✓ Enhanced {updated} podcasts...")

    print(f"\n{'='*80}")
    print(f"✅ Successfully enhanced {updated} podcast covers!")
    print(f"   Each podcast now has a unique color-based poster image")

    client.close()


if __name__ == "__main__":
    update_covers()
