"""
Enrich Podcasts with English and Spanish Translations

This script reads all existing podcasts from the database and adds English and Spanish
translations for titles, authors, and categories while keeping the Hebrew originals.
"""

import asyncio
import os
import sys
from typing import Optional
from anthropic import Anthropic

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import connect_to_mongo
from app.models.content import Podcast
from app.core.config import settings


def translate_text(text: str, target_language: str, client: Anthropic) -> str:
    """Translate text from Hebrew to target language using Claude."""
    if not text or text.strip() == "":
        return ""

    prompt = f"""Translate the following Hebrew text to {target_language}.
Return ONLY the translation, nothing else. No explanations, no additional text.
If it's a person's name, transliterate it appropriately for {target_language}.
If it's already in {target_language}, return it as is.

Hebrew text: {text}

{target_language} translation:"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract text from response
        response_text = message.content[0].text.strip()

        # Remove common prefixes/suffixes that Claude might add
        response_text = response_text.replace("Translation:", "").replace("translation:", "")
        response_text = response_text.strip().strip('"').strip("'")

        return response_text
    except Exception as e:
        print(f"    ✗ Error translating '{text}' to {target_language}: {e}")
        return ""


async def enrich_podcast_translations():
    """Enrich all podcasts with English and Spanish translations."""

    # Initialize database
    await connect_to_mongo()

    # Initialize Anthropic client
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Fetch all podcasts
    podcasts = await Podcast.find_all().to_list()

    print(f"Found {len(podcasts)} podcasts to enrich")
    print("-" * 80)

    updated_count = 0
    skipped_count = 0
    error_count = 0

    for i, podcast in enumerate(podcasts, 1):
        print(f"\n[{i}/{len(podcasts)}] Processing: {podcast.title}")

        try:
            needs_update = False

            # Translate title
            if not podcast.title_en and podcast.title:
                print(f"  Translating title to English...")
                podcast.title_en = translate_text(podcast.title, "English", client)
                if podcast.title_en:
                    print(f"    EN: {podcast.title_en}")
                    needs_update = True

            if not podcast.title_es and podcast.title:
                print(f"  Translating title to Spanish...")
                podcast.title_es = translate_text(podcast.title, "Spanish", client)
                if podcast.title_es:
                    print(f"    ES: {podcast.title_es}")
                    needs_update = True

            # Translate author
            if podcast.author and podcast.author.strip():
                if not podcast.author_en:
                    print(f"  Translating author to English...")
                    podcast.author_en = translate_text(podcast.author, "English", client)
                    if podcast.author_en:
                        print(f"    EN: {podcast.author_en}")
                        needs_update = True

                if not podcast.author_es:
                    print(f"  Translating author to Spanish...")
                    podcast.author_es = translate_text(podcast.author, "Spanish", client)
                    if podcast.author_es:
                        print(f"    ES: {podcast.author_es}")
                        needs_update = True

            # Translate category
            if podcast.category and podcast.category.strip():
                if not podcast.category_en:
                    print(f"  Translating category to English...")
                    podcast.category_en = translate_text(podcast.category, "English", client)
                    if podcast.category_en:
                        print(f"    EN: {podcast.category_en}")
                        needs_update = True

                if not podcast.category_es:
                    print(f"  Translating category to Spanish...")
                    podcast.category_es = translate_text(podcast.category, "Spanish", client)
                    if podcast.category_es:
                        print(f"    ES: {podcast.category_es}")
                        needs_update = True

            # Translate description if exists (limit to 500 chars)
            if podcast.description and len(podcast.description.strip()) > 0:
                desc_preview = podcast.description[:500]

                if not podcast.description_en:
                    print(f"  Translating description to English...")
                    podcast.description_en = translate_text(desc_preview, "English", client)
                    if podcast.description_en:
                        needs_update = True

                if not podcast.description_es:
                    print(f"  Translating description to Spanish...")
                    podcast.description_es = translate_text(desc_preview, "Spanish", client)
                    if podcast.description_es:
                        needs_update = True

            # Save the updated podcast
            if needs_update:
                await podcast.save()
                print(f"  ✓ Updated successfully!")
                updated_count += 1
            else:
                print(f"  ✓ Already has translations, skipping...")
                skipped_count += 1

            # Small delay to avoid rate limits
            await asyncio.sleep(1)

        except Exception as e:
            print(f"  ✗ Error processing podcast: {e}")
            error_count += 1
            continue

    print("\n" + "=" * 80)
    print(f"Enrichment complete!")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors:  {error_count}")
    print("=" * 80)


if __name__ == "__main__":
    print("=" * 80)
    print("Podcast Translation Enrichment Script")
    print("=" * 80)
    print("\nThis script will add English and Spanish translations to all podcasts.")
    print("Hebrew content will be preserved.\n")

    asyncio.run(enrich_podcast_translations())
