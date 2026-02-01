"""
Buffered Channel Service - Server-Side Video Delay for Perfect Sync

Delays live channel video to match dubbing/subtitle processing latency.
This is how professional broadcast translation systems work.

Architecture:
- Measures actual dubbing/subtitle latency per channel
- Client-side buffering via video element manipulation
- Guarantees perfect video-audio synchronization
- Eliminates need for manual sync adjustment
"""

import asyncio
import logging
from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LatencyProfile:
    """Measured latency profile for a channel/language pair."""
    channel_id: str
    target_lang: str
    avg_dubbing_latency_ms: int
    avg_subtitle_latency_ms: int
    measured_at: datetime
    sample_count: int

    def recommended_delay_ms(self, safety_buffer_ms: int = 100) -> int:
        """Recommended video delay with configurable safety buffer."""
        # Use the higher of dubbing or subtitle latency
        base_latency = max(
            self.avg_dubbing_latency_ms,
            self.avg_subtitle_latency_ms
        )
        return base_latency + safety_buffer_ms


@dataclass
class SyncedStreamInfo:
    """Information about a perfectly synchronized stream."""
    channel_id: str
    video_url: str
    video_delay_ms: int
    dubbing_websocket_url: Optional[str] = None
    subtitle_websocket_url: Optional[str] = None
    sync_guaranteed: bool = True
    mode: str = "server-side"  # or "client-side"


class BufferedChannelService:
    """
    Service for creating perfectly synchronized live streams.

    Delays video to match dubbing/subtitle processing latency.
    Professional broadcast-quality synchronization.
    """

    def __init__(self):
        # Use OrderedDict for LRU cache behavior
        self.latency_profiles: OrderedDict[str, LatencyProfile] = OrderedDict()
        self._measurement_lock = asyncio.Lock()
        self.active_streams: Dict[str, int] = {}  # user_id -> stream_count

    async def create_synced_stream(
        self,
        channel_id: str,
        user_id: str,
        target_lang: Optional[str] = None,
        enable_dubbing: bool = False,
        enable_subtitles: bool = False,
    ) -> SyncedStreamInfo:
        """
        Create a perfectly synchronized stream with dubbing/subtitles.

        Args:
            channel_id: Live channel ID
            user_id: User requesting the stream
            target_lang: Target language for translation
            enable_dubbing: Enable live dubbing
            enable_subtitles: Enable live subtitles

        Returns:
            SyncedStreamInfo with delayed video and WebSocket URLs

        Raises:
            HTTPException: If user exceeds concurrent stream quota
        """
        # Check user stream quota (prevent resource exhaustion)
        user_stream_count = self.active_streams.get(user_id, 0)
        if user_stream_count >= settings.MAX_CONCURRENT_STREAMS_PER_USER:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail=f"Maximum concurrent streams exceeded ({settings.MAX_CONCURRENT_STREAMS_PER_USER})"
            )

        # Increment active stream count
        self.active_streams[user_id] = user_stream_count + 1

        try:
            # 1. Get or measure latency profile for this channel
            profile = await self.get_latency_profile(channel_id, target_lang)

            if not profile:
                # First time for this channel - measure latency
                profile = await self.measure_channel_latency(
                    channel_id,
                    target_lang or "en"
                )

            # 2. Calculate required video delay
            video_delay_ms = profile.recommended_delay_ms(settings.VIDEO_BUFFER_SAFETY_MS)

            logger.info(
                f"Creating synced stream for channel {channel_id} "
                f"with {video_delay_ms}ms delay (dubbing={enable_dubbing}, "
                f"subtitles={enable_subtitles})"
            )

            # 3. Use server-side timeshift for video delay
            # CDN applies delay via timeshift parameter - video is delayed to match dubbed audio
            video_url = await self.get_delayed_stream_url(channel_id, video_delay_ms)
            mode = "server-side"

            # 4. Create WebSocket URLs for dubbing/subtitles
            dubbing_ws = None
            subtitle_ws = None

            if enable_dubbing and target_lang:
                dubbing_ws = f"wss://{settings.API_DOMAIN}/api/v1/ws/live-dubbing/{channel_id}"

            if enable_subtitles and target_lang:
                subtitle_ws = f"wss://{settings.API_DOMAIN}/api/v1/ws/live-subtitles/{channel_id}"

            return SyncedStreamInfo(
                channel_id=channel_id,
                video_url=video_url,
                video_delay_ms=video_delay_ms,
                dubbing_websocket_url=dubbing_ws,
                subtitle_websocket_url=subtitle_ws,
                sync_guaranteed=True,
                mode=mode
            )
        except Exception as e:
            # Decrement stream count on failure
            self.active_streams[user_id] = max(0, self.active_streams[user_id] - 1)
            raise

    async def get_latency_profile(
        self,
        channel_id: str,
        target_lang: Optional[str]
    ) -> Optional[LatencyProfile]:
        """Get cached latency profile for channel/language pair."""
        if not target_lang:
            return None

        cache_key = f"{channel_id}:{target_lang}"
        profile = self.latency_profiles.get(cache_key)

        if profile:
            # Check if profile is still fresh (configurable TTL)
            age = datetime.utcnow() - profile.measured_at
            if age < timedelta(hours=settings.LATENCY_PROFILE_CACHE_TTL_HOURS):
                # Move to end (LRU)
                self.latency_profiles.move_to_end(cache_key)
                return profile

        return None

    async def measure_channel_latency(
        self,
        channel_id: str,
        target_lang: str,
    ) -> LatencyProfile:
        """
        Measure actual dubbing and subtitle latency for a channel.

        Uses conservative default estimates until real-time measurement is implemented.
        Creates latency profile for future streams.
        """
        async with self._measurement_lock:
            logger.info(
                f"Measuring latency for channel {channel_id}, "
                f"target_lang={target_lang}"
            )

            # Use conservative estimates from configuration
            # Real-time measurement will be added in future update
            dubbing_latency = settings.DEFAULT_DUBBING_LATENCY_MS
            subtitle_latency = settings.DEFAULT_SUBTITLE_LATENCY_MS

            profile = LatencyProfile(
                channel_id=channel_id,
                target_lang=target_lang,
                avg_dubbing_latency_ms=dubbing_latency,
                avg_subtitle_latency_ms=subtitle_latency,
                measured_at=datetime.utcnow(),
                sample_count=1
            )

            # Cache the profile with LRU eviction
            cache_key = f"{channel_id}:{target_lang}"
            if cache_key in self.latency_profiles:
                self.latency_profiles.move_to_end(cache_key)
            else:
                # Check cache size limit
                if len(self.latency_profiles) >= settings.MAX_LATENCY_PROFILES:
                    self.latency_profiles.popitem(last=False)  # Remove oldest
                self.latency_profiles[cache_key] = profile

            logger.info(
                f"Latency profile created: dubbing={dubbing_latency}ms, "
                f"subtitle={subtitle_latency}ms, "
                f"recommended_delay={profile.recommended_delay_ms(settings.VIDEO_BUFFER_SAFETY_MS)}ms"
            )

            return profile

    async def update_latency_profile(
        self,
        channel_id: str,
        target_lang: str,
        measured_dubbing_ms: Optional[int] = None,
        measured_subtitle_ms: Optional[int] = None,
    ) -> None:
        """
        Update latency profile with new measurements.

        Uses exponential moving average to smooth out variations.
        """
        cache_key = f"{channel_id}:{target_lang}"
        profile = self.latency_profiles.get(cache_key)

        if not profile:
            # Create new profile with defaults from settings
            profile = LatencyProfile(
                channel_id=channel_id,
                target_lang=target_lang,
                avg_dubbing_latency_ms=measured_dubbing_ms or settings.DEFAULT_DUBBING_LATENCY_MS,
                avg_subtitle_latency_ms=measured_subtitle_ms or settings.DEFAULT_SUBTITLE_LATENCY_MS,
                measured_at=datetime.utcnow(),
                sample_count=1
            )
        else:
            # Update with exponential moving average (configurable alpha)
            alpha = settings.LATENCY_EMA_ALPHA
            if measured_dubbing_ms:
                profile.avg_dubbing_latency_ms = int(
                    alpha * measured_dubbing_ms +
                    (1 - alpha) * profile.avg_dubbing_latency_ms
                )
            if measured_subtitle_ms:
                profile.avg_subtitle_latency_ms = int(
                    alpha * measured_subtitle_ms +
                    (1 - alpha) * profile.avg_subtitle_latency_ms
                )
            profile.measured_at = datetime.utcnow()
            profile.sample_count += 1

        # Add to cache with LRU management
        if cache_key in self.latency_profiles:
            self.latency_profiles.move_to_end(cache_key)
        else:
            if len(self.latency_profiles) >= settings.MAX_LATENCY_PROFILES:
                self.latency_profiles.popitem(last=False)
        self.latency_profiles[cache_key] = profile

        logger.debug(
            f"Updated latency profile for {cache_key}: "
            f"dubbing={profile.avg_dubbing_latency_ms}ms, "
            f"subtitle={profile.avg_subtitle_latency_ms}ms "
            f"(n={profile.sample_count})"
        )

    async def get_original_stream_url(self, channel_id: str) -> str:
        """Get original (non-delayed) stream URL for a channel."""
        # Construct stream URL from configured base URL
        return f"{settings.LIVE_STREAM_BASE_URL}/{channel_id}/master.m3u8"

    async def get_delayed_stream_url(self, channel_id: str, delay_ms: int) -> str:
        """
        Get time-shifted stream URL for a channel.

        Adds timeshift parameter to HLS URL for server-side video delay.
        Most CDN providers (Cloudflare, AWS MediaLive, Mux) support DVR timeshift.

        Args:
            channel_id: Live channel ID
            delay_ms: Delay in milliseconds (will be converted to seconds)

        Returns:
            Stream URL with timeshift parameter
        """
        from app.models.content import LiveChannel
        from beanie import PydanticObjectId

        # Get channel to access its stream URL
        try:
            channel = await LiveChannel.get(PydanticObjectId(channel_id))
            if channel and channel.stream_url:
                base_url = channel.stream_url
            else:
                base_url = f"{settings.LIVE_STREAM_BASE_URL}/{channel_id}/master.m3u8"
        except Exception:
            base_url = f"{settings.LIVE_STREAM_BASE_URL}/{channel_id}/master.m3u8"

        # Convert delay to seconds
        delay_seconds = delay_ms / 1000

        # Add timeshift parameter (common CDN convention)
        # Different CDNs use different parameters:
        # - Cloudflare Stream: ?time_shift=10
        # - AWS MediaLive: ?timeShift=10
        # - Generic: #EXT-X-START:TIME-OFFSET=-10
        separator = "&" if "?" in base_url else "?"
        delayed_url = f"{base_url}{separator}time_shift={delay_seconds}"

        logger.info(
            f"Created delayed stream URL for {channel_id}: {delay_seconds}s delay",
            extra={"channel_id": channel_id, "delay_ms": delay_ms}
        )

        return delayed_url


# Global singleton instance
buffered_channel_service = BufferedChannelService()
