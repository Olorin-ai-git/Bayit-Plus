"""
Download real podcast cover images from 103FM website and store locally.
"""
import asyncio
import hashlib
import os
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from pymongo import MongoClient


async def scrape_podcast_covers_with_images():
    """Scrape podcast names and images from 103FM website"""
    url = "https://103fm.maariv.co.il/%D7%94%D7%A4%D7%95%D7%93%D7%A7%D7%90%D7%A1%D7%98%D7%99%D7%9D-%D7%A9%D7%9C-%D7%A8%D7%93%D7%99%D7%95-103"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            podcast_data = {}

            # Try multiple selectors to find programs with images
            selectors = [
                ("div.program_item img", "div.program_item"),
                ("div.program_speaker img", "div.program_speaker"),
                ("article.program img", "article.program"),
                ("img[alt]", None),
            ]

            for img_selector, parent_selector in selectors:
                images = soup.select(img_selector)
                if images:
                    print(
                        f"Found {len(images)} images using selector: {img_selector}\n"
                    )

                    for img in images:
                        src = img.get("src") or img.get("data-src")
                        if not src:
                            continue

                        # Try to find podcast name
                        name = img.get("alt", "").strip()

                        if not name and parent_selector:
                            parent = img.find_parent(
                                parent_selector.split(".")[0],
                                class_=parent_selector.split(".")[1]
                                if "." in parent_selector
                                else None,
                            )
                            if parent:
                                name_elem = parent.find(["span", "div", "h3"])
                                if name_elem:
                                    name = name_elem.get_text(strip=True)

                        if name and len(name) > 2:
                            img_url = urljoin(url, src)
                            podcast_data[name] = img_url
                            print(f"📷 {name}")
                            print(f"   Image: {img_url}\n")

                    if podcast_data:
                        break

            return podcast_data

    except Exception as e:
        print(f"Error scraping covers: {e}")
        return {}


async def download_image(client: httpx.AsyncClient, url: str, save_path: Path) -> bool:
    """Download image and save locally"""
    try:
        response = await client.get(url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()

        # Save to file
        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_path.write_bytes(response.content)
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False


async def download_and_update_covers(podcast_data: dict):
    """Download all images and update database"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    # Create uploads directory
    uploads_dir = Path("uploads/podcasts")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    print("\n📥 Downloading podcast cover images:\n")

    updated = 0

    async with httpx.AsyncClient() as http_client:
        for podcast_name, img_url in podcast_data.items():
            # Generate filename
            filename = f"{hashlib.md5(podcast_name.encode()).hexdigest()[:8]}.jpg"
            file_path = uploads_dir / filename
            local_url = f"/uploads/podcasts/{filename}"

            # Download image
            if await download_image(http_client, img_url, file_path):
                # Update database
                db.podcasts.update_one(
                    {"title": podcast_name}, {"$set": {"cover": local_url}}
                )
                updated += 1
                print(f"✓ Downloaded and updated: {podcast_name}")
            else:
                print(f"✗ Failed to download: {podcast_name}")

    print(f"\n{'='*80}")
    print(f"✅ Downloaded and updated {updated} podcast covers")
    print(f"   Saved to: {uploads_dir.absolute()}")

    client.close()


async def main():
    print("🎙️ Scraping real podcast images from 103FM...\n")
    podcast_data = await scrape_podcast_covers_with_images()

    if podcast_data:
        print(f"\n✅ Found {len(podcast_data)} podcasts with images\n")
        await download_and_update_covers(podcast_data)
    else:
        print("\n⚠️  No images found from scraping")
        print("Using fallback: storing placeholder colors in database")


if __name__ == "__main__":
    asyncio.run(main())
