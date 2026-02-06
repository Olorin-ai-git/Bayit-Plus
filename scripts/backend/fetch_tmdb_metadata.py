#!/usr/bin/env python3
"""Fetch TMDB metadata and poster for a content item."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings
import httpx


async def fetch_tmdb_metadata(content_id: str, dry_run=True):
    """Fetch TMDB metadata for content item."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    content_col = db["content"]

    # Convert string ID to ObjectId
    try:
        obj_id = ObjectId(content_id)
    except Exception as e:
        print(f"❌ Invalid content ID format: {e}")
        return

    # Find the content
    content = await content_col.find_one({"_id": obj_id})

    if not content:
        print(f"❌ Content not found with ID: {content_id}")
        return

    print("=" * 80)
    print("CURRENT CONTENT")
    print("=" * 80)
    print(f"\n📺 {content.get('title')}")
    print(f"   ID: {content['_id']}")
    print(f"   Category: {content.get('category_name')}")
    print(f"   Year: {content.get('year')}")
    print(f"   Current Poster: {content.get('poster_url') or content.get('thumbnail')}")
    print(f"   Current Description: {content.get('description', '')[:100]}...")

    # Determine content type
    is_series = (
        'series' in content.get('category_name', '').lower() or
        'סדרות' in content.get('category_name', '')
    )
    content_type = 'tv' if is_series else 'movie'

    # Get TMDB API key from settings
    tmdb_api_key = settings.TMDB_API_KEY if hasattr(settings, 'TMDB_API_KEY') else None

    if not tmdb_api_key:
        print("\n⚠️  TMDB_API_KEY not found in settings")
        print("Please add TMDB_API_KEY to your environment variables")
        return

    print(f"\n🔍 Searching TMDB for: {content.get('title')} ({content.get('year')})")
    print(f"   Content type: {content_type}")

    # Search TMDB
    async with httpx.AsyncClient() as http_client:
        search_url = f"https://api.themoviedb.org/3/search/{content_type}"
        search_params = {
            'api_key': tmdb_api_key,
            'query': content.get('title'),
            'year': content.get('year'),
            'language': 'en-US'
        }

        try:
            response = await http_client.get(search_url, params=search_params)
            response.raise_for_status()
            search_results = response.json()

            if not search_results.get('results'):
                print(f"\n❌ No results found on TMDB for: {content.get('title')}")
                return

            # Get first result
            tmdb_item = search_results['results'][0]
            tmdb_id = tmdb_item['id']

            print(f"\n✅ Found on TMDB:")
            print(f"   TMDB ID: {tmdb_id}")
            print(f"   Title: {tmdb_item.get('title') or tmdb_item.get('name')}")
            print(f"   Original Title: {tmdb_item.get('original_title') or tmdb_item.get('original_name')}")
            print(f"   Release Date: {tmdb_item.get('release_date') or tmdb_item.get('first_air_date')}")
            print(f"   Overview: {tmdb_item.get('overview', '')[:100]}...")

            # Get full details
            details_url = f"https://api.themoviedb.org/3/{content_type}/{tmdb_id}"
            details_params = {
                'api_key': tmdb_api_key,
                'language': 'en-US',
                'append_to_response': 'credits'
            }

            details_response = await http_client.get(details_url, params=details_params)
            details_response.raise_for_status()
            details = details_response.json()

            # Build poster URL
            poster_path = details.get('poster_path')
            backdrop_path = details.get('backdrop_path')

            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            backdrop_url = f"https://image.tmdb.org/t/p/original{backdrop_path}" if backdrop_path else None

            print(f"\n📸 Images:")
            print(f"   Poster: {poster_url}")
            print(f"   Backdrop: {backdrop_url}")

            # Extract metadata
            genres = [g['name'] for g in details.get('genres', [])]

            # Get cast (top 5)
            cast = []
            if 'credits' in details and 'cast' in details['credits']:
                cast = [actor['name'] for actor in details['credits']['cast'][:5]]

            # Get director
            director = None
            if 'credits' in details and 'crew' in details['credits']:
                directors = [crew['name'] for crew in details['credits']['crew'] if crew['job'] == 'Director']
                director = directors[0] if directors else None

            print(f"\n📝 Metadata:")
            print(f"   Genres: {', '.join(genres)}")
            print(f"   Cast: {', '.join(cast)}")
            if director:
                print(f"   Director: {director}")
            print(f"   Rating: {details.get('vote_average')}")
            print(f"   Runtime: {details.get('runtime') or details.get('episode_run_time', [0])[0] if details.get('episode_run_time') else 0} min")

            if not dry_run:
                # Update content in database
                update_data = {
                    'description': details.get('overview'),
                    'poster_url': poster_url,
                    'thumbnail': poster_url,
                    'backdrop': backdrop_url,
                    'genres': genres,
                    'rating': details.get('vote_average'),
                    'tmdb_id': str(tmdb_id),
                }

                if cast:
                    update_data['cast'] = cast
                if director:
                    update_data['director'] = director
                if details.get('runtime'):
                    # Convert minutes to HH:MM:SS format
                    runtime_minutes = details.get('runtime')
                    hours = runtime_minutes // 60
                    minutes = runtime_minutes % 60
                    update_data['duration'] = f"{hours}:{minutes:02d}:00"

                result = await content_col.update_one(
                    {"_id": obj_id},
                    {"$set": update_data}
                )

                if result.modified_count > 0:
                    print(f"\n✅ Updated content with TMDB metadata")
                else:
                    print(f"\n⚠️  No changes made (data might be identical)")
            else:
                print("\n" + "=" * 80)
                print("⚠️  DRY RUN - No changes made")
                print("Run with --execute to update content with TMDB metadata")
                print("=" * 80)

        except httpx.HTTPError as e:
            print(f"\n❌ HTTP error fetching from TMDB: {e}")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("content_id", help="Content ID to fetch metadata for")
    parser.add_argument("--execute", action="store_true", help="Execute update (default is dry run)")
    args = parser.parse_args()

    asyncio.run(fetch_tmdb_metadata(args.content_id, dry_run=not args.execute))
