"""
Fetch podcast cover images from 103FM website and update database.
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
from pymongo import MongoClient
from urllib.parse import urljoin


async def scrape_podcast_covers():
    """Scrape podcast covers from 103FM website"""
    url = "https://103fm.maariv.co.il/%D7%94%D7%A4%D7%95%D7%93%D7%A7%D7%90%D7%A1%D7%98%D7%99%D7%9D-%D7%A9%D7%9C-%D7%A8%D7%93%D7%99%D7%95-103"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Find all program containers and their images
            podcast_data = {}

            # Look for program cards with both name and image
            programs = soup.find_all("div", class_="program_item")

            if not programs:
                # Try alternative selector
                programs = soup.find_all("div", class_="program_speaker")

            if not programs:
                # Try another alternative
                programs = soup.find_all("article", class_="program")

            print(f"Found {len(programs)} program items\n")

            for program in programs:
                # Try to get program name
                name_elem = program.find("div", class_="program_speaker_name")
                if not name_elem:
                    name_elem = program.find("h3", class_="program_name")
                if not name_elem:
                    name_elem = program.find("span", class_="title")

                if not name_elem:
                    continue

                name = name_elem.get_text(strip=True)
                if not name or len(name) < 2:
                    continue

                # Try to get image
                img_elem = program.find("img")
                cover_url = None

                if img_elem:
                    src = img_elem.get("src")
                    if src:
                        cover_url = urljoin(url, src)
                        print(f"📷 {name}")
                        print(f"   Image: {cover_url}\n")
                        podcast_data[name] = cover_url

            return podcast_data

    except Exception as e:
        print(f"Error scraping covers: {e}")
        return {}


async def update_podcast_covers(podcast_covers: dict):
    """Update database with podcast covers"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    updated = 0
    not_found = 0

    print("\n📻 Updating podcast covers in database:\n")

    for podcast_name, cover_url in podcast_covers.items():
        result = db.podcasts.update_one(
            {"title": podcast_name},
            {"$set": {"cover": cover_url}}
        )

        if result.matched_count > 0:
            updated += 1
            print(f"✓ {podcast_name}")
        else:
            not_found += 1
            print(f"✗ Not found: {podcast_name}")

    print(f"\n{'='*80}")
    print(f"✅ Updated {updated} podcasts with cover images")
    print(f"⚠️  {not_found} podcasts not found in database")

    client.close()


async def use_placeholder_covers():
    """Use placeholder images for all podcasts"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    podcasts = db.podcasts.find({})

    # Use a color-based placeholder service
    placeholder_colors = [
        "FF6B6B", "4ECDC4", "45B7D1", "FFA07A", "98D8C8",
        "F7DC6F", "BB8FCE", "85C1E2", "F8B88B", "AED6F1",
        "85C1E2", "F5B041", "BB8FCE", "52BE80", "DC7633"
    ]

    updated = 0
    for i, podcast in enumerate(podcasts):
        podcast_id = str(podcast["_id"])
        color = placeholder_colors[i % len(placeholder_colors)]

        # Using placeholder service that generates images with text
        title_short = podcast["title"][:2]
        placeholder_url = f"https://ui-avatars.com/api/?name={podcast['title']}&background={color}&color=fff&size=300&font-size=0.4&bold=true"

        db.podcasts.update_one(
            {"_id": podcast["_id"]},
            {"$set": {"cover": placeholder_url}}
        )
        updated += 1

    print(f"✅ Updated {updated} podcasts with placeholder images")
    client.close()


async def main():
    print("🎙️ Fetching podcast covers from 103FM...\n")
    podcast_covers = await scrape_podcast_covers()

    if podcast_covers:
        await update_podcast_covers(podcast_covers)
    else:
        print("\n⚠️  No covers found from scraping, using placeholder images instead...")
        await use_placeholder_covers()


if __name__ == "__main__":
    asyncio.run(main())
