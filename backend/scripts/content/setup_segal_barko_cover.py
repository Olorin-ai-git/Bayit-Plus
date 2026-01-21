"""
Script to copy the Segal Barko podcast cover image to the uploads directory
and update the podcast database with the cover image URL.
"""
import os
import shutil
from datetime import datetime
from pathlib import Path

from pymongo import MongoClient


def setup_podcast_cover(source_image_path: str):
    """Copy podcast cover image and update database"""

    dest_dir = Path("/Users/olorin/Documents/Bayit-Plus/backend/uploads/podcasts")
    dest_file = dest_dir / "segal-barko-cover.jpg"

    # Create destination if it doesn't exist
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Copy the image
    if os.path.exists(source_image_path):
        print(f"📷 Copying image from: {source_image_path}")
        shutil.copy2(source_image_path, dest_file)
        print(f"✅ Image saved to: {dest_file}")

        # Update database with cover URL
        client = MongoClient("mongodb://localhost:27017")
        db = client["bayit_plus"]

        podcast_title = 'סג"ל וברקו - הפודקאסט'
        cover_url = "http://localhost:8000/uploads/podcasts/segal-barko-cover.jpg"

        result = db.podcasts.update_one(
            {"title": podcast_title},
            {
                "$set": {
                    "cover": cover_url,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        if result.matched_count > 0:
            print(f"✅ Database updated with cover image")
            print(f"   Cover URL: {cover_url}")
        else:
            print(f"❌ Could not find podcast to update")

        client.close()
    else:
        print(f"❌ Source image not found: {source_image_path}")
        print(f"\nTo set up the cover image, save it to:")
        print(f"   {dest_file}")
        print(f"\nThen run this script with the image path.")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        source_path = sys.argv[1]
        setup_podcast_cover(source_path)
    else:
        print("Usage: python setup_segal_barko_cover.py <path-to-image>")
        print("\nOr save the image directly to:")
        print(
            "   /Users/olorin/Documents/Bayit-Plus/backend/uploads/podcasts/segal-barko-cover.jpg"
        )
