"""
Live Channel Stream Monitor

Monitors live channel stream health and automatically refreshes URLs when needed.
Runs as a background task to ensure uninterrupted streaming.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Dict, List, Optional

import aiohttp
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import LiveChannel

logger = logging.getLogger(__name__)


class StreamHealthStatus:
    """Stream health status constants."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"


class LiveChannelMonitor:
    """Monitors live channel stream health and refreshes URLs."""

    def __init__(self):
        """Initialize channel monitor."""
        self.check_interval_seconds = 3600  # Check every hour
        self.timeout_seconds = 10
        self.max_retries = 3
        self.official_stream_sources = {
            "i24news": self._get_i24news_official_streams
        }

    async def check_stream_health(self, stream_url: str) -> Dict:
        """
        Check if a stream URL is accessible and healthy.

        Args:
            stream_url: HLS stream URL to check

        Returns:
            Dict with health status and details
        """
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.head(stream_url) as response:
                    if response.status == 200:
                        return {
                            "status": StreamHealthStatus.HEALTHY,
                            "status_code": 200,
                            "message": "Stream is accessible",
                            "checked_at": datetime.now(UTC)
                        }
                    elif response.status in [403, 404]:
                        return {
                            "status": StreamHealthStatus.DOWN,
                            "status_code": response.status,
                            "message": f"Stream returned {response.status}",
                            "checked_at": datetime.now(UTC)
                        }
                    else:
                        return {
                            "status": StreamHealthStatus.DEGRADED,
                            "status_code": response.status,
                            "message": f"Unexpected status: {response.status}",
                            "checked_at": datetime.now(UTC)
                        }

        except asyncio.TimeoutError:
            return {
                "status": StreamHealthStatus.DOWN,
                "status_code": None,
                "message": "Stream check timeout",
                "checked_at": datetime.now(UTC)
            }
        except Exception as e:
            logger.error(f"Error checking stream health: {e}")
            return {
                "status": StreamHealthStatus.UNKNOWN,
                "status_code": None,
                "message": str(e),
                "checked_at": datetime.now(UTC)
            }

    def _get_i24news_official_streams(self) -> Dict:
        """
        Get official i24News stream URLs from Brightcove/Akamai CDN.

        Returns:
            Dict mapping language codes to stream URLs
        """
        return {
            "en": "https://bcovlive-a.akamaihd.net/ecf224f43f3b43e69471a7b626481af0/eu-central-1/5377161796001/playlist.m3u8",
            "he": "https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8",
            "fr": "https://bcovlive-a.akamaihd.net/41814196d97e433fb401c5e632d985e9/eu-central-1/5377161796001/playlist.m3u8",
            "ar": "https://bcovlive-a.akamaihd.net/95116e8d79524d87bf3ac20ba04241e3/eu-central-1/5377161796001/playlist.m3u8"
        }

    async def refresh_channel_stream(
        self,
        channel: LiveChannel,
        new_url: str
    ) -> bool:
        """
        Refresh channel stream URL.

        Args:
            channel: LiveChannel document
            new_url: New stream URL

        Returns:
            True if updated successfully
        """
        try:
            old_url = channel.stream_url
            channel.stream_url = new_url
            channel.updated_at = datetime.now(UTC)
            await channel.save()

            logger.info(
                f"Refreshed stream URL for {channel.name}",
                extra={
                    "channel_id": str(channel.id),
                    "old_url": old_url[:100],
                    "new_url": new_url[:100]
                }
            )
            return True

        except Exception as e:
            logger.error(
                f"Failed to refresh stream URL for {channel.name}: {e}",
                extra={"channel_id": str(channel.id)}
            )
            return False

    async def monitor_i24news_channels(self):
        """Monitor and refresh i24News channels if needed."""
        try:
            # Find all i24News channels
            channels = await LiveChannel.find(
                {"name": {"$regex": "i24", "$options": "i"}}
            ).to_list()

            if not channels:
                logger.info("No i24News channels found")
                return

            official_streams = self._get_i24news_official_streams()

            for channel in channels:
                # Check current stream health
                health = await self.check_stream_health(channel.stream_url)

                logger.info(
                    f"Channel {channel.name} health: {health['status']}",
                    extra={
                        "channel_id": str(channel.id),
                        "status": health["status"],
                        "message": health["message"]
                    }
                )

                # If stream is down, try to refresh with official URL
                if health["status"] in [StreamHealthStatus.DOWN, StreamHealthStatus.DEGRADED]:
                    logger.warning(
                        f"Channel {channel.name} is {health['status']}, attempting refresh"
                    )

                    # Determine language and get official stream
                    lang = channel.primary_language
                    if lang in official_streams:
                        new_url = official_streams[lang]
                        await self.refresh_channel_stream(channel, new_url)
                    else:
                        logger.error(
                            f"No official stream found for language: {lang}"
                        )

        except Exception as e:
            logger.error(f"Error monitoring i24News channels: {e}")

    async def monitor_all_channels(self):
        """Monitor all active live channels."""
        try:
            channels = await LiveChannel.find(
                {"is_active": True}
            ).to_list()

            logger.info(f"Monitoring {len(channels)} active live channels")

            for channel in channels:
                health = await self.check_stream_health(channel.stream_url)

                if health["status"] != StreamHealthStatus.HEALTHY:
                    logger.warning(
                        f"Channel {channel.name} unhealthy: {health['message']}",
                        extra={
                            "channel_id": str(channel.id),
                            "status": health["status"]
                        }
                    )

                    # If it's an i24News channel, try automatic refresh
                    if "i24" in channel.name.lower():
                        await self.monitor_i24news_channels()

        except Exception as e:
            logger.error(f"Error monitoring channels: {e}")

    async def run_monitor_loop(self):
        """Run continuous monitoring loop."""
        logger.info(
            f"Starting live channel monitor (interval: {self.check_interval_seconds}s)"
        )

        while True:
            try:
                await self.monitor_all_channels()
                await asyncio.sleep(self.check_interval_seconds)

            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry


# Singleton instance
_monitor_instance: Optional[LiveChannelMonitor] = None


def get_channel_monitor() -> LiveChannelMonitor:
    """Get or create channel monitor instance."""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = LiveChannelMonitor()
    return _monitor_instance
