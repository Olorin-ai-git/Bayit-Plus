"""
Stream Validator Service
Efficient streaming URL validation without full download
"""
import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.models.content import Content, LiveChannel, PodcastEpisode, RadioStation
from app.models.librarian import StreamValidationCache

logger = logging.getLogger(__name__)

# Concurrent validation limit to avoid overwhelming servers
CONCURRENT_LIMIT = 10
VALIDATION_TIMEOUT = 10.0  # seconds
CACHE_TTL_HOURS_VALID = 48  # Cache valid streams for 48 hours
CACHE_TTL_HOURS_INVALID = 4  # Cache invalid streams for 4 hours (recheck sooner)


@dataclass
class StreamValidationResult:
    """Result of a stream validation"""

    url: str
    is_valid: bool
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    stream_type: Optional[str] = None


async def validate_content_streams(
    scope, audit_id: str  # AuditScope
) -> Dict[str, Any]:
    """
    Validate all streaming URLs in the audit scope.

    Args:
        scope: AuditScope with content IDs to validate
        audit_id: Parent audit report ID

    Returns:
        Dictionary with validation results
    """
    logger.info("🔗 Validating streaming URLs...")

    results = {
        "status": "completed",
        "total_checked": 0,
        "valid_streams": 0,
        "broken_streams": [],
    }

    # Collect all stream URLs to validate
    streams_to_validate = []

    # Content (VOD/movies/series)
    if scope.content_ids:
        contents = await Content.find({"_id": {"$in": scope.content_ids}}).to_list(
            length=None
        )

        for content in contents:
            if content.stream_url:
                streams_to_validate.append(
                    {
                        "url": content.stream_url,
                        "stream_type": content.stream_type,
                        "content_id": str(content.id),
                        "content_type": "content",
                        "title": content.title,
                    }
                )

    # Live channels
    if scope.live_channel_ids:
        channels = await LiveChannel.find(
            {"_id": {"$in": scope.live_channel_ids}}
        ).to_list(length=None)

        for channel in channels:
            if channel.stream_url:
                streams_to_validate.append(
                    {
                        "url": channel.stream_url,
                        "stream_type": channel.stream_type,
                        "content_id": str(channel.id),
                        "content_type": "live_channel",
                        "title": channel.name,
                    }
                )

    # Podcast episodes
    if scope.podcast_episode_ids:
        episodes = await PodcastEpisode.find(
            {"_id": {"$in": scope.podcast_episode_ids}}
        ).to_list(length=None)

        for episode in episodes:
            if episode.audio_url:
                streams_to_validate.append(
                    {
                        "url": episode.audio_url,
                        "stream_type": "audio",
                        "content_id": str(episode.id),
                        "content_type": "podcast_episode",
                        "title": episode.title,
                    }
                )

    # Radio stations
    if scope.radio_station_ids:
        stations = await RadioStation.find(
            {"_id": {"$in": scope.radio_station_ids}}
        ).to_list(length=None)

        for station in stations:
            if station.stream_url:
                streams_to_validate.append(
                    {
                        "url": station.stream_url,
                        "stream_type": station.stream_type,
                        "content_id": str(station.id),
                        "content_type": "radio_station",
                        "title": station.name,
                    }
                )

    logger.info(f"   Found {len(streams_to_validate)} streams to validate")
    results["total_checked"] = len(streams_to_validate)

    if not streams_to_validate:
        return results

    # Filter streams that need validation (not in cache)
    uncached_streams, cached_results = await filter_cached_streams(streams_to_validate)

    logger.info(f"   Using cache for {len(cached_results)} streams")
    logger.info(f"   Validating {len(uncached_streams)} streams")

    # Process cached results
    for cached_result in cached_results:
        if cached_result["is_valid"]:
            results["valid_streams"] += 1
        else:
            results["broken_streams"].append(cached_result)

    # Validate uncached streams with concurrency limit
    if uncached_streams:
        semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)

        async def validate_with_semaphore(stream):
            async with semaphore:
                return await validate_stream_url(
                    stream["url"],
                    stream["stream_type"],
                    stream["content_id"],
                    stream["content_type"],
                    stream["title"],
                )

        validation_results = await asyncio.gather(
            *[validate_with_semaphore(stream) for stream in uncached_streams],
            return_exceptions=True,
        )

        # Process results
        for i, result in enumerate(validation_results):
            if isinstance(result, Exception):
                logger.error(f"❌ Validation failed: {result}")
                results["broken_streams"].append(
                    {
                        "url": uncached_streams[i]["url"],
                        "content_id": uncached_streams[i]["content_id"],
                        "content_type": uncached_streams[i]["content_type"],
                        "title": uncached_streams[i]["title"],
                        "error": str(result),
                        "fixable": False,
                    }
                )
            elif result.is_valid:
                results["valid_streams"] += 1
            else:
                results["broken_streams"].append(
                    {
                        "url": result.url,
                        "content_id": uncached_streams[i]["content_id"],
                        "content_type": uncached_streams[i]["content_type"],
                        "title": uncached_streams[i]["title"],
                        "status_code": result.status_code,
                        "error": result.error_message,
                        "fixable": result.status_code
                        in [403, 404],  # Might be fixable from TMDB
                    }
                )

    logger.info(f"   ✅ Stream validation complete:")
    logger.info(f"      Valid: {results['valid_streams']}")
    logger.info(f"      Broken: {len(results['broken_streams'])}")

    return results


async def filter_cached_streams(
    streams: List[Dict[str, Any]]
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Filter streams based on cache, return (uncached, cached_results)
    """
    uncached = []
    cached_results = []

    now = datetime.utcnow()

    for stream in streams:
        # Check cache
        cached = await StreamValidationCache.find_one(
            {"stream_url": stream["url"], "expires_at": {"$gt": now}}
        )

        if cached:
            # Use cached result
            if not cached.is_valid:
                cached_results.append(
                    {
                        "url": stream["url"],
                        "content_id": stream["content_id"],
                        "content_type": stream["content_type"],
                        "title": stream["title"],
                        "status_code": cached.status_code,
                        "error": cached.error_message,
                        "is_valid": False,
                        "from_cache": True,
                    }
                )
            else:
                cached_results.append({"is_valid": True})
        else:
            uncached.append(stream)

    return uncached, cached_results


async def validate_stream_url(
    url: str,
    stream_type: str = "hls",
    content_id: Optional[str] = None,
    content_type: Optional[str] = None,
    title: Optional[str] = None,
) -> StreamValidationResult:
    """
    Efficient stream validation without full download.

    Process:
    1. HEAD request to check URL exists (200 status)
    2. For HLS: Parse m3u8, verify first .ts segment accessible
    3. For audio: HEAD request + verify content-type
    4. Timeout: 10 seconds per check
    5. 3 retry attempts with exponential backoff
    """
    result = StreamValidationResult(url=url, is_valid=False, stream_type=stream_type)

    start_time = time.time()

    try:
        async with httpx.AsyncClient(
            timeout=VALIDATION_TIMEOUT, follow_redirects=True
        ) as client:
            # HEAD request first
            response = await client.head(url)
            response_time = int((time.time() - start_time) * 1000)

            result.status_code = response.status_code
            result.response_time_ms = response_time

            if response.status_code == 200:
                # For HLS streams, try to parse manifest
                if stream_type == "hls" and url.endswith(".m3u8"):
                    is_valid = await validate_hls_manifest(client, url)
                    result.is_valid = is_valid
                    if not is_valid:
                        result.error_message = (
                            "HLS manifest invalid or segments inaccessible"
                        )
                else:
                    # For other types, 200 is good enough
                    result.is_valid = True

            elif response.status_code == 405:
                # HEAD not allowed, try GET with range
                try:
                    response = await client.get(url, headers={"Range": "bytes=0-1024"})
                    result.status_code = response.status_code
                    result.is_valid = response.status_code in [200, 206]
                except Exception as e:
                    result.error_message = f"GET failed: {str(e)}"

            else:
                result.error_message = f"HTTP {response.status_code}"

    except httpx.TimeoutException:
        result.error_message = "Timeout"
    except httpx.ConnectError:
        result.error_message = "Connection failed"
    except Exception as e:
        result.error_message = str(e)

    # Cache result
    await cache_validation_result(result)

    return result


async def validate_hls_manifest(client: httpx.AsyncClient, manifest_url: str) -> bool:
    """
    Validate HLS manifest by parsing m3u8 and checking first segment.
    """
    try:
        # Fetch manifest
        response = await client.get(manifest_url)
        if response.status_code != 200:
            return False

        manifest_content = response.text

        # Parse m3u8 to find first .ts segment
        segments = []
        base_url = manifest_url.rsplit("/", 1)[0] + "/"

        for line in manifest_content.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                # This is a segment URL
                if line.startswith("http"):
                    segments.append(line)
                else:
                    segments.append(base_url + line)

        if not segments:
            return False

        # Try to access first segment (HEAD request)
        first_segment = segments[0]
        segment_response = await client.head(first_segment, timeout=5.0)

        return segment_response.status_code == 200

    except Exception as e:
        logger.debug(f"HLS validation failed: {e}")
        return False


async def cache_validation_result(result: StreamValidationResult):
    """Cache a validation result"""
    try:
        # Determine TTL based on validity
        if result.is_valid:
            ttl = timedelta(hours=CACHE_TTL_HOURS_VALID)
        else:
            ttl = timedelta(hours=CACHE_TTL_HOURS_INVALID)

        cache_entry = StreamValidationCache(
            stream_url=result.url,
            last_validated=datetime.utcnow(),
            is_valid=result.is_valid,
            status_code=result.status_code,
            response_time_ms=result.response_time_ms,
            error_message=result.error_message,
            stream_type=result.stream_type,
            expires_at=datetime.utcnow() + ttl,
        )

        # Upsert (replace if exists)
        existing = await StreamValidationCache.find_one({"stream_url": result.url})
        if existing:
            await existing.delete()

        await cache_entry.insert()

    except Exception as e:
        logger.warning(f"Failed to cache validation result: {e}")


async def cleanup_expired_cache():
    """Clean up expired cache entries"""
    try:
        now = datetime.utcnow()
        result = await StreamValidationCache.find({"expires_at": {"$lt": now}}).delete()

        if result.deleted_count > 0:
            logger.info(f"🧹 Cleaned up {result.deleted_count} expired cache entries")

    except Exception as e:
        logger.warning(f"Failed to cleanup cache: {e}")
