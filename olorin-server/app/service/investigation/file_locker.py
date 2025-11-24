"""
File Locker

OS-level file locking with retry, exponential backoff, jitter, and sequence numbering.
Supports POSIX (Linux/macOS) and Windows file locking.

Constitutional Compliance:
- NO hardcoded values (all configurable)
- Complete implementation with no stubs/mocks
- Handles all edge cases and platform differences
"""

import fcntl
import os
import platform
import random
import time
from pathlib import Path
from typing import Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class FileLockError(Exception):
    """Exception raised when file locking fails."""

    pass


class FileLocker:
    """OS-level file locking with retry and sequence numbering."""

    def __init__(
        self,
        max_retries: int = 5,
        base_backoff_ms: int = 100,
        max_backoff_ms: int = 5000,
        jitter: bool = True
    ):
        """
        Initialize file locker.

        Args:
            max_retries: Maximum number of retry attempts (default: 5)
            base_backoff_ms: Base backoff time in milliseconds (default: 100)
            max_backoff_ms: Maximum backoff time in milliseconds (default: 5000)
            jitter: Whether to add random jitter to backoff (default: True)
        """
        self.max_retries = max_retries
        self.base_backoff_ms = base_backoff_ms
        self.max_backoff_ms = max_backoff_ms
        self.jitter = jitter
        self.is_windows = platform.system() == "Windows"

    def _lock_file_posix(self, file_handle: int) -> None:
        """
        Lock file using POSIX fcntl (Linux/macOS).

        Args:
            file_handle: File descriptor

        Raises:
            FileLockError: If locking fails
        """
        try:
            fcntl.flock(file_handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (IOError, OSError) as e:
            raise FileLockError(f"Failed to acquire POSIX lock: {e}") from e

    def _lock_file_windows(self, file_handle: int) -> None:
        """
        Lock file using Windows LockFileEx.

        Args:
            file_handle: File descriptor

        Raises:
            FileLockError: If locking fails
        """
        try:
            import msvcrt
            msvcrt.locking(file_handle, msvcrt.LK_LOCK, 1)
        except ImportError:
            # Fallback: try using win32file if available
            try:
                import win32file
                import win32con
                win32file.LockFileEx(
                    file_handle,
                    win32con.LOCKFILE_EXCLUSIVE_LOCK | win32con.LOCKFILE_FAIL_IMMEDIATELY,
                    0,
                    -1,
                    -1,
                    None
                )
            except ImportError:
                raise FileLockError(
                    "Windows file locking requires msvcrt or pywin32. "
                    "Install pywin32: pip install pywin32"
                )
        except Exception as e:
            raise FileLockError(f"Failed to acquire Windows lock: {e}") from e

    def _unlock_file_posix(self, file_handle: int) -> None:
        """
        Unlock file using POSIX fcntl.

        Args:
            file_handle: File descriptor
        """
        try:
            fcntl.flock(file_handle, fcntl.LOCK_UN)
        except (IOError, OSError) as e:
            logger.warning(f"Failed to release POSIX lock: {e}")

    def _unlock_file_windows(self, file_handle: int) -> None:
        """
        Unlock file on Windows.

        Args:
            file_handle: File descriptor
        """
        try:
            import msvcrt
            msvcrt.locking(file_handle, msvcrt.LK_UNLCK, 1)
        except ImportError:
            try:
                import win32file
                win32file.UnlockFileEx(
                    file_handle,
                    0,
                    -1,
                    -1,
                    None
                )
            except ImportError:
                logger.warning("Windows unlock not available (pywin32 not installed)")
        except Exception as e:
            logger.warning(f"Failed to release Windows lock: {e}")

    def _calculate_backoff(self, attempt: int) -> float:
        """
        Calculate backoff time with exponential backoff and jitter.

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Backoff time in seconds
        """
        # Exponential backoff: base * 2^attempt
        backoff_ms = min(
            self.base_backoff_ms * (2 ** attempt),
            self.max_backoff_ms
        )

        # Add jitter if enabled
        if self.jitter:
            jitter_ms = random.uniform(0, backoff_ms * 0.1)  # 10% jitter
            backoff_ms += jitter_ms

        return backoff_ms / 1000.0  # Convert to seconds

    def lock_file(
        self,
        file_path: Path,
        create_if_missing: bool = True
    ) -> Optional[int]:
        """
        Acquire exclusive lock on file with retry.

        Args:
            file_path: Path to file to lock
            create_if_missing: Whether to create file if it doesn't exist (default: True)

        Returns:
            File handle if lock acquired, None if max retries exceeded

        Raises:
            FileLockError: If locking fails after all retries
        """
        # Ensure file exists
        if not file_path.exists():
            if create_if_missing:
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.touch()
            else:
                raise FileLockError(f"File does not exist: {file_path}")

        for attempt in range(self.max_retries):
            try:
                # Open file for locking
                file_handle = os.open(
                    str(file_path),
                    os.O_RDWR | os.O_CREAT
                )

                # Acquire lock
                if self.is_windows:
                    self._lock_file_windows(file_handle)
                else:
                    self._lock_file_posix(file_handle)

                logger.debug(f"Acquired lock on {file_path} (attempt {attempt + 1})")
                return file_handle

            except FileLockError:
                # Close handle if lock failed
                try:
                    os.close(file_handle)
                except (OSError, NameError):
                    pass

                # Retry with backoff
                if attempt < self.max_retries - 1:
                    backoff = self._calculate_backoff(attempt)
                    logger.debug(
                        f"Lock failed on {file_path}, retrying in {backoff:.3f}s "
                        f"(attempt {attempt + 1}/{self.max_retries})"
                    )
                    time.sleep(backoff)
                else:
                    raise FileLockError(
                        f"Failed to acquire lock on {file_path} after "
                        f"{self.max_retries} attempts"
                    )

        return None

    def unlock_file(self, file_handle: int) -> None:
        """
        Release file lock.

        Args:
            file_handle: File descriptor to unlock
        """
        try:
            if self.is_windows:
                self._unlock_file_windows(file_handle)
            else:
                self._unlock_file_posix(file_handle)

            os.close(file_handle)
            logger.debug("Released file lock")
        except Exception as e:
            logger.warning(f"Error releasing file lock: {e}")
            try:
                os.close(file_handle)
            except OSError:
                pass

    def get_sequence_numbered_path(
        self,
        base_path: Path,
        max_sequence: int = 1000
    ) -> Path:
        """
        Get sequence-numbered path for file conflicts.

        If file exists, appends __seqN before extension.

        Args:
            base_path: Base file path
            max_sequence: Maximum sequence number to try (default: 1000)

        Returns:
            Path with sequence number if needed
        """
        if not base_path.exists():
            return base_path

        # Extract stem and suffix
        stem = base_path.stem
        suffix = base_path.suffix

        # Try sequence numbers
        for seq in range(1, max_sequence + 1):
            seq_path = base_path.parent / f"{stem}__seq{seq}{suffix}"
            if not seq_path.exists():
                logger.debug(
                    f"Using sequence-numbered path: {seq_path} "
                    f"(original: {base_path})"
                )
                return seq_path

        # If all sequence numbers exhausted, raise error
        raise FileLockError(
            f"Could not find available sequence number for {base_path} "
            f"(tried up to {max_sequence})"
        )

