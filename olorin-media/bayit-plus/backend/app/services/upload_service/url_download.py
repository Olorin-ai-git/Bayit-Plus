"""
URL Download Service
Handles downloading files from URLs for upload processing
"""

import asyncio
import hashlib
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urlparse

import aiofiles
import aiohttp
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.upload import UrlValidationResponse

logger = get_logger(__name__)


class UrlDownloadService:
    """Service for downloading files from URLs"""

    def __init__(self):
        self.download_dir = Path(tempfile.gettempdir()) / "bayit_url_downloads"
        self.download_dir.mkdir(exist_ok=True)
        self.active_downloads: dict[str, bool] = {}

    async def validate_url(self, url: str) -> UrlValidationResponse:
        """
        Validates a URL by performing a HEAD request
        Returns file info without downloading
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        file_size = response.headers.get("Content-Length")
                        content_type = response.headers.get("Content-Type")

                        # Extract filename from URL or Content-Disposition header
                        filename = self._extract_filename(url, response.headers)

                        return UrlValidationResponse(
                            valid=True,
                            accessible=True,
                            file_size=int(file_size) if file_size else None,
                            content_type=content_type,
                            filename=filename,
                        )
                    else:
                        return UrlValidationResponse(
                            valid=True,
                            accessible=False,
                            error=f"HTTP {response.status}",
                        )
        except asyncio.TimeoutError:
            return UrlValidationResponse(
                valid=True,
                accessible=False,
                error="Connection timeout",
            )
        except Exception as e:
            logger.error(f"URL validation failed for {url}", extra={"error": str(e)})
            return UrlValidationResponse(
                valid=False,
                accessible=False,
                error=str(e),
            )

    async def download_from_url(
        self,
        url: str,
        filename: str,
        progress_callback: Optional[Callable[[float], None]] = None,
        timeout: int = 300,
    ) -> str:
        """
        Downloads a file from URL to temporary directory
        Returns local file path

        Args:
            url: URL to download from
            filename: Name to save file as
            progress_callback: Optional callback for progress updates (0-100)
            timeout: Download timeout in seconds

        Returns:
            Path to downloaded file

        Raises:
            Exception: If download fails
        """
        download_id = hashlib.md5(url.encode()).hexdigest()
        self.active_downloads[download_id] = True

        try:
            local_path = self.download_dir / filename

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    timeout=aiohttp.ClientTimeout(total=timeout),
                ) as response:
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}: {await response.text()}")

                    total_size = response.headers.get("Content-Length")
                    total_size = int(total_size) if total_size else None

                    # Stream download with progress tracking
                    bytes_downloaded = 0
                    async with aiofiles.open(local_path, "wb") as f:
                        async for chunk in response.content.iter_chunked(8192):
                            if not self.active_downloads.get(download_id):
                                # Download cancelled
                                await f.close()
                                if local_path.exists():
                                    local_path.unlink()
                                raise Exception("Download cancelled")

                            await f.write(chunk)
                            bytes_downloaded += len(chunk)

                            # Report progress
                            if progress_callback and total_size:
                                progress = (bytes_downloaded / total_size) * 100
                                progress_callback(progress)

            logger.info(f"Downloaded {filename} from {url} to {local_path}")
            return str(local_path)

        except asyncio.TimeoutError:
            logger.error(f"Download timeout for {url}")
            raise Exception(f"Download timeout after {timeout}s")

        except Exception as e:
            logger.error(f"Download failed for {url}", extra={"error": str(e)})
            raise

        finally:
            self.active_downloads.pop(download_id, None)

    def cancel_download(self, url: str):
        """Cancels an active download"""
        download_id = hashlib.md5(url.encode()).hexdigest()
        self.active_downloads[download_id] = False
        logger.info(f"Cancelled download for {url}")

    def cleanup_temp_files(self):
        """Removes old temporary download files"""
        try:
            for file in self.download_dir.iterdir():
                if file.is_file():
                    # Delete files older than 24 hours
                    age_hours = (datetime.now() - datetime.fromtimestamp(file.stat().st_mtime)).total_seconds() / 3600
                    if age_hours > 24:
                        file.unlink()
                        logger.info(f"Cleaned up old temp file: {file.name}")
        except Exception as e:
            logger.error("Failed to cleanup temp files", extra={"error": str(e)})

    def _extract_filename(self, url: str, headers: dict) -> str:
        """Extracts filename from URL or Content-Disposition header"""
        # Try Content-Disposition header first
        content_disp = headers.get("Content-Disposition", "")
        if "filename=" in content_disp:
            filename = content_disp.split("filename=")[1].strip('"')
            return filename

        # Fall back to URL path
        parsed = urlparse(url)
        filename = os.path.basename(parsed.path)
        if filename:
            return filename

        # Last resort: generate filename
        return f"download_{hashlib.md5(url.encode()).hexdigest()[:8]}.mp4"


# Singleton instance
url_download_service = UrlDownloadService()
