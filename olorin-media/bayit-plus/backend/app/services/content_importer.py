"""
Content Importer Service
Import free/test content from various public sources for testing
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.models.content import (Content, LiveChannel, Podcast, PodcastEpisode,
                                RadioStation)

# ============ FREE CONTENT SOURCES ============

APPLE_BIPBOP_STREAMS = [
    {
        "id": "bipbop_basic",
        "name": "Apple BipBop Basic",
        "description": "Apple's basic test HLS stream",
        "stream_url": "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
        "stream_type": "hls",
        "is_drm_protected": False,
        "logo": "https://www.apple.com/favicon.ico",
    },
    {
        "id": "bipbop_advanced",
        "name": "Apple BipBop Advanced (TS)",
        "description": "Apple's advanced test stream with Transport Stream segments",
        "stream_url": "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
        "stream_type": "hls",
        "is_drm_protected": False,
        "logo": "https://www.apple.com/favicon.ico",
    },
    {
        "id": "bipbop_fmp4",
        "name": "Apple BipBop (fMP4)",
        "description": "Apple's fragmented MP4 test stream",
        "stream_url": "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
        "stream_type": "hls",
        "is_drm_protected": False,
        "logo": "https://www.apple.com/favicon.ico",
    },
]

PUBLIC_DOMAIN_MOVIES = [
    {
        "id": "notld_1968",
        "title": "Night of the Living Dead",
        "year": 1968,
        "description": "Classic zombie horror film. Public domain in the United States.",
        "director": "George A. Romero",
        "stream_url": "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
        "thumbnail": "https://archive.org/services/img/night_of_the_living_dead",
        "genre": "Horror",
        "duration": "1:36:00",
        "rating": "Not Rated",
    },
    {
        "id": "hgf_1940",
        "title": "His Girl Friday",
        "year": 1940,
        "description": "Classic screwball comedy. Public domain.",
        "director": "Howard Hawks",
        "stream_url": "https://archive.org/download/hgf_512kb.mp4/hgf_512kb.mp4",
        "thumbnail": "https://archive.org/services/img/HisGirlFriday",
        "genre": "Comedy",
        "duration": "1:32:00",
        "rating": "Not Rated",
    },
    {
        "id": "charade_1963",
        "title": "Charade",
        "year": 1963,
        "description": "Classic mystery thriller with Audrey Hepburn.",
        "director": "Stanley Donen",
        "stream_url": "https://archive.org/download/Charade_1963/Charade_1963_512kb.mp4",
        "thumbnail": "https://archive.org/services/img/Charade_1963",
        "genre": "Thriller",
        "duration": "2:13:00",
        "rating": "Not Rated",
    },
    {
        "id": "nosferatu_1922",
        "title": "Nosferatu",
        "year": 1922,
        "description": "Silent horror classic. Public domain.",
        "director": "F.W. Murnau",
        "stream_url": "https://archive.org/download/Nosferatu_1922/Nosferatu_1922_512kb.mp4",
        "thumbnail": "https://archive.org/services/img/Nosferatu_1922",
        "genre": "Horror",
        "duration": "1:33:00",
        "rating": "Not Rated",
    },
    {
        "id": "gtr_1903",
        "title": "The Great Train Robbery",
        "year": 1903,
        "description": "Historic silent film - one of the first narrative films. Public domain.",
        "director": "Edwin S. Porter",
        "stream_url": "https://archive.org/download/TheGreatTrainRobbery/The%20Great%20Train%20Robbery%201903%20(512kb).mp4",
        "thumbnail": "https://archive.org/services/img/TheGreatTrainRobbery",
        "genre": "Crime",
        "duration": "0:10:00",
        "rating": "Not Rated",
    },
]

PUBLIC_RADIO_STREAMS = [
    {
        "id": "somafm_groovesalad",
        "name": "Soma FM - Groove Salad",
        "description": "Eclectic selection of lounge, funk, soul and downtempo grooves",
        "genre": "Electronic",
        "stream_url": "https://somafm.com/groovesalad.pls",
        "stream_type": "audio",
        "logo": "https://somafm.com/img/logos/128/groovesalad.png",
    },
    {
        "id": "somafm_dronezone",
        "name": "Soma FM - Drone Zone",
        "description": "Dreamy, ethereal, atmospheric and minimal pieces",
        "genre": "Ambient",
        "stream_url": "https://somafm.com/dronezone.pls",
        "stream_type": "audio",
        "logo": "https://somafm.com/img/logos/128/dronezone.png",
    },
    {
        "id": "somafm_liveshift",
        "name": "Soma FM - Live Shift",
        "description": "Progressive rock and eclectic world music",
        "genre": "Rock",
        "stream_url": "https://somafm.com/liveshift.pls",
        "stream_type": "audio",
        "logo": "https://somafm.com/img/logos/128/liveshift.png",
    },
    {
        "id": "bbcws",
        "name": "BBC World Service",
        "description": "International news and current affairs",
        "genre": "News",
        "stream_url": "http://bbcwssc.akamaized.net/live/manifest/audio/en_wwws_drm_p.m3u8",
        "stream_type": "audio",
        "logo": "https://www.bbc.com/favicon.ico",
    },
]

PUBLIC_PODCASTS = [
    {
        "id": "nytimes_daily",
        "title": "The Daily",
        "author": "The New York Times",
        "description": "Hosted by Michael Barbaro. A daily show from The New York Times.",
        "rss_feed": "https://feeds.simplecast.com/54nAGcIl",
        "website": "https://www.nytimes.com/podcasts/the-daily",
        "cover": "https://www.nytimes.com/podcasts/the-daily/favicon.png",
        "category": "News",
    },
    {
        "id": "npr_up_first",
        "title": "Up First",
        "author": "NPR",
        "description": "NPR's newscast in a daily, five to ten minute news podcast format.",
        "rss_feed": "https://feeds.npr.org/510318/rss.xml",
        "website": "https://www.npr.org/podcasts/510318/up-first",
        "cover": "https://media.npr.org/images/podcasts/favicon/generic.png",
        "category": "News",
    },
    {
        "id": "science_vs",
        "title": "Science Vs",
        "author": "Gimlet Media",
        "description": "There are a lot of fads, blogs and strong opinions out there.",
        "rss_feed": "https://feeds.gimletmedia.com/sciencevs",
        "website": "https://www.sciencevspodcast.com/",
        "cover": "https://cdn.simplecast.com/audio/cad8e1e4-747a-4522-802f-9e44cb12c464/episodes/af45995e-9bba-4ffe-b119-1f364e554b87/image/4d9047168e5e4528b58375beb13cae28_300x300.jpg",
        "category": "Science",
    },
]


# ============ IMPORTER SERVICE ============


class ContentImporter:
    """Service for importing test content from public sources"""

    @staticmethod
    async def get_available_sources(source_type: str) -> Dict[str, Any]:
        """Get available free content sources by type"""
        sources_map = {
            "live_tv": {
                "apple_bipbop": {
                    "name": "Apple BipBop Test Streams",
                    "description": "Official Apple test HLS streams for testing",
                    "items": APPLE_BIPBOP_STREAMS,
                }
            },
            "vod": {
                "public_domain": {
                    "name": "Public Domain Movies",
                    "description": "Classic films from archive.org",
                    "items": PUBLIC_DOMAIN_MOVIES,
                }
            },
            "radio": {
                "somafm": {
                    "name": "Soma FM Streams",
                    "description": "Quality internet radio from Soma FM",
                    "items": [
                        s for s in PUBLIC_RADIO_STREAMS if s["id"].startswith("somafm")
                    ],
                },
                "bbc": {
                    "name": "BBC World Service",
                    "description": "BBC's international news service",
                    "items": [s for s in PUBLIC_RADIO_STREAMS if s["id"] == "bbcws"],
                },
            },
            "podcasts": {
                "public_feeds": {
                    "name": "Public Podcast Feeds",
                    "description": "Popular public podcasts with RSS feeds",
                    "items": PUBLIC_PODCASTS,
                }
            },
        }
        return sources_map.get(source_type, {})

    @staticmethod
    async def import_live_channels(
        source_name: str,
        import_all: bool = True,
        items: Optional[List[str]] = None,
        category_id: Optional[str] = None,
    ) -> List[LiveChannel]:
        """Import live channels from public sources"""
        imported = []

        if source_name == "apple_bipbop":
            items_to_import = (
                APPLE_BIPBOP_STREAMS
                if import_all
                else [s for s in APPLE_BIPBOP_STREAMS if s["id"] in (items or [])]
            )

            for item in items_to_import:
                # Check if channel already exists by stream_url
                existing = await LiveChannel.find_one(
                    LiveChannel.stream_url == item["stream_url"]
                )
                if existing:
                    continue  # Skip duplicate

                channel = LiveChannel(
                    name=item["name"],
                    description=item.get("description", ""),
                    logo=item.get("logo", ""),
                    stream_url=item["stream_url"],
                    stream_type=item.get("stream_type", "hls"),
                    is_drm_protected=item.get("is_drm_protected", False),
                    is_active=True,
                    order=len(imported),
                )
                await channel.insert()
                imported.append(channel)

        return imported

    @staticmethod
    async def import_vod_content(
        source_name: str,
        category_id: str,
        import_all: bool = True,
        items: Optional[List[str]] = None,
    ) -> List[Content]:
        """Import VOD content from public sources"""
        imported = []

        if source_name == "public_domain":
            items_to_import = (
                PUBLIC_DOMAIN_MOVIES
                if import_all
                else [s for s in PUBLIC_DOMAIN_MOVIES if s["id"] in (items or [])]
            )

            for item in items_to_import:
                # Check if content already exists by stream_url or title+year
                existing = await Content.find_one(
                    Content.stream_url == item["stream_url"]
                )
                if not existing and item.get("year"):
                    existing = await Content.find_one(
                        Content.title == item["title"], Content.year == item.get("year")
                    )
                if existing:
                    continue  # Skip duplicate

                content = Content(
                    title=item["title"],
                    description=item.get("description", ""),
                    thumbnail=item.get("thumbnail", ""),
                    director=item.get("director"),
                    stream_url=item["stream_url"],
                    stream_type="hls",
                    year=item.get("year"),
                    duration=item.get("duration"),
                    rating=item.get("rating", "Not Rated"),
                    genre=item.get("genre", "Drama"),
                    category_id=category_id,
                    is_published=True,
                    is_kids_content=False,
                )
                await content.insert()
                imported.append(content)

        return imported

    @staticmethod
    async def import_radio_stations(
        source_name: str,
        import_all: bool = True,
        items: Optional[List[str]] = None,
    ) -> List[RadioStation]:
        """Import radio stations from public sources"""
        imported = []

        filter_ids = None if import_all else (items or [])

        # Filter stations by source name
        if source_name == "somafm":
            stations = [s for s in PUBLIC_RADIO_STREAMS if s["id"].startswith("somafm")]
        elif source_name == "bbc":
            stations = [s for s in PUBLIC_RADIO_STREAMS if s["id"] == "bbcws"]
        else:
            stations = []

        # Apply item filter if specified
        if not import_all and filter_ids:
            stations = [s for s in stations if s["id"] in filter_ids]

        for station in stations:
            # Check if station already exists by stream_url
            existing = await RadioStation.find_one(
                RadioStation.stream_url == station["stream_url"]
            )
            if existing:
                continue  # Skip duplicate

            radio = RadioStation(
                name=station["name"],
                description=station.get("description", ""),
                logo=station.get("logo", ""),
                genre=station.get("genre", "News"),
                stream_url=station["stream_url"],
                stream_type=station.get("stream_type", "audio"),
                is_active=True,
                order=len(imported),
            )
            await radio.insert()
            imported.append(radio)

        return imported

    @staticmethod
    async def import_podcasts_from_rss(
        rss_url: str,
    ) -> Optional[Podcast]:
        """
        Import podcast from RSS feed.
        Note: This is a simplified implementation that parses basic RSS.
        For production, consider using feedparser library.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(rss_url, timeout=10)
                response.raise_for_status()

            # Basic XML parsing (simplified)
            # In production, use feedparser library
            rss_content = response.text

            # Extract basic info from RSS
            import re

            # Try to extract title
            title_match = re.search(r"<title>([^<]+)</title>", rss_content)
            title = title_match.group(1) if title_match else "Imported Podcast"

            # Try to extract description
            desc_match = re.search(r"<description>([^<]+)</description>", rss_content)
            description = desc_match.group(1) if desc_match else ""

            # Try to extract image
            image_match = re.search(
                r"<image>.*?<url>([^<]+)</url>", rss_content, re.DOTALL
            )
            cover = image_match.group(1) if image_match else ""

            podcast = Podcast(
                title=title,
                description=description,
                cover=cover,
                rss_feed=rss_url,
                is_active=True,
                episode_count=0,
            )
            await podcast.insert()

            return podcast

        except Exception as e:
            print(f"Failed to import podcast from {rss_url}: {e}")
            return None

    @staticmethod
    async def import_public_podcasts(
        import_all: bool = True,
        items: Optional[List[str]] = None,
    ) -> List[Podcast]:
        """Import podcasts from predefined public feeds"""
        imported = []

        items_to_import = (
            PUBLIC_PODCASTS
            if import_all
            else [p for p in PUBLIC_PODCASTS if p["id"] in (items or [])]
        )

        for podcast_info in items_to_import:
            # Check if podcast already exists by rss_feed or title
            existing = None
            if podcast_info.get("rss_feed"):
                existing = await Podcast.find_one(
                    Podcast.rss_feed == podcast_info["rss_feed"]
                )
            if not existing:
                existing = await Podcast.find_one(
                    Podcast.title == podcast_info["title"]
                )
            if existing:
                continue  # Skip duplicate

            podcast = Podcast(
                title=podcast_info["title"],
                author=podcast_info.get("author"),
                description=podcast_info.get("description", ""),
                cover=podcast_info.get("cover", ""),
                category=podcast_info.get("category", "News"),
                rss_feed=podcast_info.get("rss_feed"),
                website=podcast_info.get("website"),
                is_active=True,
                episode_count=0,
            )
            await podcast.insert()
            imported.append(podcast)

        return imported


# Convenience functions
async def import_apple_bipbop_channels(
    import_all: bool = True,
    items: Optional[List[str]] = None,
) -> List[LiveChannel]:
    """Convenience function to import Apple BipBop test streams"""
    return await ContentImporter.import_live_channels("apple_bipbop", import_all, items)


async def import_public_domain_movies(
    category_id: str,
    import_all: bool = True,
    items: Optional[List[str]] = None,
) -> List[Content]:
    """Convenience function to import public domain movies"""
    return await ContentImporter.import_vod_content(
        "public_domain", category_id, import_all, items
    )


async def import_somafm_stations(
    import_all: bool = True,
    items: Optional[List[str]] = None,
) -> List[RadioStation]:
    """Convenience function to import Soma FM stations"""
    return await ContentImporter.import_radio_stations("somafm", import_all, items)


async def import_available_podcasts(
    import_all: bool = True,
    items: Optional[List[str]] = None,
) -> List[Podcast]:
    """Convenience function to import available podcasts"""
    return await ContentImporter.import_public_podcasts(import_all, items)


# ============ LOCAL FILE IMPORT FUNCTIONS ============

# Supported video file extensions
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm", ".wmv", ".flv"}


def _parse_movie_filename(filename: str) -> Dict[str, Any]:
    """
    Parse movie filename to extract title and year.
    Handles formats like: "Movie Name (2020).mp4", "Movie.Name.2020.mp4"
    """
    name = Path(filename).stem

    # Try to extract year from patterns like (2020) or .2020.
    year_match = re.search(r"[\(\[]?(\d{4})[\)\]]?", name)
    year = int(year_match.group(1)) if year_match else None

    # Clean up title - remove year, dots, underscores
    title = name
    if year_match:
        title = name[: year_match.start()]
    title = title.replace(".", " ").replace("_", " ").strip()
    title = re.sub(r"\s+", " ", title)  # Normalize whitespace

    return {"title": title, "year": year}


def _parse_series_path(path: str) -> Dict[str, Any]:
    """
    Parse series directory structure to extract series name, season, episode.
    Handles: "Series Name/Season 1/S01E05 - Episode Title.mp4"
    """
    parts = Path(path).parts
    filename = Path(path).stem

    # Try to extract season/episode from filename
    se_match = re.search(r"[Ss](\d+)[Ee](\d+)", filename)
    season = int(se_match.group(1)) if se_match else None
    episode = int(se_match.group(2)) if se_match else None

    # Get series name from parent directories
    series_name = None
    for part in parts:
        if part.lower().startswith("season"):
            continue
        if not part.startswith(".") and part not in ["Volumes", "USB Drive", "Series"]:
            series_name = part.replace(".", " ").replace("_", " ")

    # Extract episode title
    episode_title = filename
    if se_match:
        episode_title = filename[se_match.end() :].strip(" -_")
    if not episode_title:
        episode_title = f"Episode {episode}" if episode else filename

    return {
        "series_name": series_name,
        "season": season,
        "episode": episode,
        "episode_title": episode_title,
    }


async def import_movies(
    source: str,
    filters: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Import movies from a local directory path.

    Args:
        source: Local directory path containing movie files
        filters: Optional filters (limit, name_pattern, etc.)

    Returns:
        Summary string of import results
    """
    filters = filters or {}
    source_path = Path(source)

    if not source_path.exists():
        return f"Error: Source path does not exist: {source}"

    if not source_path.is_dir():
        return f"Error: Source path is not a directory: {source}"

    # Get default category for movies
    from app.models.content_taxonomy import ContentSection

    movies_section = await ContentSection.find_one(ContentSection.slug == "movies")
    category_id = str(movies_section.id) if movies_section else "movies"

    imported = []
    skipped = []
    errors = []

    limit = filters.get("limit", 100)
    name_pattern = filters.get("name_pattern")

    # Find all video files in directory
    video_files = []
    for ext in VIDEO_EXTENSIONS:
        video_files.extend(source_path.glob(f"*{ext}"))
        video_files.extend(source_path.glob(f"*{ext.upper()}"))

    # Also check subdirectories (for organized collections)
    for ext in VIDEO_EXTENSIONS:
        video_files.extend(source_path.glob(f"**/*{ext}"))
        video_files.extend(source_path.glob(f"**/*{ext.upper()}"))

    # Remove duplicates while preserving order
    seen = set()
    unique_files = []
    for f in video_files:
        if f not in seen:
            seen.add(f)
            unique_files.append(f)
    video_files = unique_files

    for video_file in video_files[:limit]:
        try:
            # Apply name filter if provided
            if name_pattern and name_pattern.lower() not in video_file.name.lower():
                continue

            # Parse filename for metadata
            metadata = _parse_movie_filename(video_file.name)

            # Check for existing content by file path
            existing = await Content.find_one(Content.stream_url == str(video_file))
            if existing:
                skipped.append(video_file.name)
                continue

            # Check by title and year
            if metadata["year"]:
                existing = await Content.find_one(
                    Content.title == metadata["title"],
                    Content.year == metadata["year"],
                )
                if existing:
                    skipped.append(video_file.name)
                    continue

            # Create content entry
            content = Content(
                title=metadata["title"],
                year=metadata["year"],
                stream_url=str(video_file),
                stream_type="file",
                category_id=category_id,
                content_type="movie",
                content_format="movie",
                is_published=True,
                is_series=False,
            )
            await content.insert()
            imported.append(metadata["title"])

        except Exception as e:
            errors.append(f"{video_file.name}: {e!s}")

    # Build summary
    summary_lines = [
        f"Movie Import Complete from {source}",
        f"- Imported: {len(imported)}",
        f"- Skipped (duplicates): {len(skipped)}",
        f"- Errors: {len(errors)}",
    ]

    if imported:
        summary_lines.append(f"\nImported movies: {', '.join(imported[:10])}")
        if len(imported) > 10:
            summary_lines.append(f"  ... and {len(imported) - 10} more")

    if errors:
        summary_lines.append(f"\nErrors: {'; '.join(errors[:5])}")

    return "\n".join(summary_lines)


async def import_series(
    source: str,
    filters: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Import series from a local directory path.

    Args:
        source: Local directory path containing series folders
        filters: Optional filters (series_name, season, limit, etc.)

    Returns:
        Summary string of import results
    """
    filters = filters or {}
    source_path = Path(source)

    if not source_path.exists():
        return f"Error: Source path does not exist: {source}"

    if not source_path.is_dir():
        return f"Error: Source path is not a directory: {source}"

    # Get default category for series
    from app.models.content_taxonomy import ContentSection

    series_section = await ContentSection.find_one(ContentSection.slug == "series")
    category_id = str(series_section.id) if series_section else "series"

    imported = []
    skipped = []
    errors = []

    limit = filters.get("limit", 500)
    series_filter = filters.get("series_name")
    season_filter = filters.get("season")

    # Find all video files recursively
    video_files = []
    for ext in VIDEO_EXTENSIONS:
        video_files.extend(source_path.glob(f"**/*{ext}"))
        video_files.extend(source_path.glob(f"**/*{ext.upper()}"))

    series_episodes: Dict[str, List] = {}

    for video_file in video_files[:limit]:
        try:
            # Parse series info from path
            metadata = _parse_series_path(str(video_file))

            # Apply filters
            if series_filter and metadata["series_name"]:
                if series_filter.lower() not in metadata["series_name"].lower():
                    continue

            if season_filter and metadata["season"] != season_filter:
                continue

            # Check for existing content
            existing = await Content.find_one(Content.stream_url == str(video_file))
            if existing:
                skipped.append(video_file.name)
                continue

            # Group by series for summary
            series_name = metadata["series_name"] or "Unknown Series"
            if series_name not in series_episodes:
                series_episodes[series_name] = []

            # Create episode title
            title = metadata["episode_title"]
            if metadata["series_name"]:
                if metadata["season"] and metadata["episode"]:
                    title = f"{metadata['series_name']} S{metadata['season']:02d}E{metadata['episode']:02d}"
                else:
                    title = f"{metadata['series_name']} - {metadata['episode_title']}"

            # Create content entry
            content = Content(
                title=title,
                stream_url=str(video_file),
                stream_type="file",
                category_id=category_id,
                content_type="series",
                content_format="series",
                is_published=True,
                is_series=True,
                season=metadata["season"],
                episode=metadata["episode"],
            )
            await content.insert()
            series_episodes[series_name].append(content)
            imported.append(title)

        except Exception as e:
            errors.append(f"{video_file.name}: {e!s}")

    # Build summary
    summary_lines = [
        f"Series Import Complete from {source}",
        f"- Total episodes imported: {len(imported)}",
        f"- Skipped (duplicates): {len(skipped)}",
        f"- Errors: {len(errors)}",
        f"- Series found: {len(series_episodes)}",
    ]

    if series_episodes:
        summary_lines.append("\nSeries breakdown:")
        for series_name, episodes in list(series_episodes.items())[:10]:
            summary_lines.append(f"  - {series_name}: {len(episodes)} episodes")

    if errors:
        summary_lines.append(f"\nErrors: {'; '.join(errors[:5])}")

    return "\n".join(summary_lines)
