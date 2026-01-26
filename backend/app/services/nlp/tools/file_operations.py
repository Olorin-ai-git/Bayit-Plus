"""
File Operations Tools - File system operations for agent workflows.
"""

import logging
import os
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def download_file(url: str, destination: Optional[str] = None) -> str:
    """
    Download file from URL to local storage or GCS.

    Args:
        url: URL to download from
        destination: Optional destination path (defaults to temp directory)

    Returns:
        Path to downloaded file
    """
    try:
        # Default destination to temp directory
        if not destination:
            import tempfile
            temp_dir = tempfile.gettempdir()
            filename = url.split("/")[-1] or "download"
            destination = os.path.join(temp_dir, filename)

        # Download file
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Write to file
            Path(destination).parent.mkdir(parents=True, exist_ok=True)
            with open(destination, "wb") as f:
                f.write(response.content)

        logger.info(f"Downloaded {url} to {destination}")
        return f"File downloaded successfully to {destination}"

    except Exception as e:
        logger.error(f"Download failed: {e}")
        return f"Download failed: {str(e)}"


async def read_file(path: str) -> str:
    """
    Read contents of a file.

    Args:
        path: File path to read

    Returns:
        File contents or error message
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Limit size for safety
        max_size = 10000  # 10KB
        if len(content) > max_size:
            content = content[:max_size] + f"\n... (truncated, file is {len(content)} bytes)"

        return content

    except Exception as e:
        logger.error(f"Read file failed: {e}")
        return f"Failed to read file: {str(e)}"


async def list_directory(path: str, pattern: Optional[str] = None) -> str:
    """
    List files and directories in a path.

    Args:
        path: Directory path to list
        pattern: Optional glob pattern to filter files

    Returns:
        Formatted directory listing
    """
    try:
        from glob import glob

        if pattern:
            # Use glob pattern
            search_path = os.path.join(path, pattern)
            files = glob(search_path)
        else:
            # List all files in directory
            files = [os.path.join(path, f) for f in os.listdir(path)]

        # Format results
        results = []
        for file_path in sorted(files)[:100]:  # Limit to 100 files
            stat = os.stat(file_path)
            is_dir = os.path.isdir(file_path)
            name = os.path.basename(file_path)
            size = stat.st_size if not is_dir else "-"

            results.append(f"{'[DIR]' if is_dir else '[FILE]'} {name} ({size} bytes)")

        if not results:
            return f"No files found in {path}"

        return "\n".join(results)

    except Exception as e:
        logger.error(f"List directory failed: {e}")
        return f"Failed to list directory: {str(e)}"
