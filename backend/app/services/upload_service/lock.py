"""
Upload Lock Manager - Distributed locking for duplicate prevention

Provides a distributed lock mechanism using MongoDB to prevent race conditions
when multiple uploads of the same file are attempted simultaneously.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from pymongo.errors import DuplicateKeyError

from app.models.upload import UploadHashLock
from app.core.config import settings

logger = logging.getLogger(__name__)


class UploadLockManager:
    """
    Manages distributed locks for upload operations using MongoDB.

    Prevents race conditions where two uploads with the same file hash
    could both pass the duplicate check and create duplicate content.
    """

    def __init__(self, default_timeout_seconds: int = 300):
        """
        Initialize the lock manager.

        Args:
            default_timeout_seconds: Default lock timeout (5 minutes)
        """
        self._default_timeout = default_timeout_seconds

    async def acquire_hash_lock(
        self,
        file_hash: str,
        job_id: str,
        timeout_seconds: Optional[int] = None
    ) -> bool:
        """
        Attempt to acquire a lock for a file hash.

        Args:
            file_hash: SHA256 hash of the file
            job_id: ID of the job requesting the lock
            timeout_seconds: Lock expiration time (uses default if not specified)

        Returns:
            True if lock was acquired, False if hash is already locked
        """
        timeout = timeout_seconds or self._default_timeout
        expires_at = datetime.utcnow() + timedelta(seconds=timeout)

        try:
            lock = UploadHashLock(
                file_hash=file_hash,
                job_id=job_id,
                acquired_at=datetime.utcnow(),
                expires_at=expires_at,
            )
            await lock.insert()
            logger.info(f"Acquired hash lock for {file_hash[:16]}... (job: {job_id})")
            return True

        except DuplicateKeyError:
            # Lock already exists - check if it's our own lock (re-entrant)
            existing_lock = await UploadHashLock.find_one(
                UploadHashLock.file_hash == file_hash
            )

            if existing_lock and existing_lock.job_id == job_id:
                # Re-entrant lock - we already hold it
                logger.debug(f"Re-entrant lock for {file_hash[:16]}... (job: {job_id})")
                return True

            logger.warning(
                f"Hash lock already held for {file_hash[:16]}... "
                f"(by job: {existing_lock.job_id if existing_lock else 'unknown'})"
            )
            return False

        except Exception as e:
            logger.error(f"Failed to acquire hash lock: {e}", exc_info=True)
            return False

    async def release_hash_lock(self, file_hash: str, job_id: str) -> bool:
        """
        Release a hash lock.

        Args:
            file_hash: SHA256 hash of the file
            job_id: ID of the job that holds the lock

        Returns:
            True if lock was released, False if lock not found or not owned
        """
        try:
            result = await UploadHashLock.find_one(
                UploadHashLock.file_hash == file_hash,
                UploadHashLock.job_id == job_id
            )

            if result:
                await result.delete()
                logger.info(f"Released hash lock for {file_hash[:16]}... (job: {job_id})")
                return True
            else:
                logger.warning(
                    f"Cannot release lock - not found or not owned: "
                    f"{file_hash[:16]}... (job: {job_id})"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to release hash lock: {e}", exc_info=True)
            return False

    async def extend_lock(
        self,
        file_hash: str,
        job_id: str,
        additional_seconds: int
    ) -> bool:
        """
        Extend the expiration time of an existing lock.

        Args:
            file_hash: SHA256 hash of the file
            job_id: ID of the job that holds the lock
            additional_seconds: Additional time to add to the lock

        Returns:
            True if lock was extended, False otherwise
        """
        try:
            lock = await UploadHashLock.find_one(
                UploadHashLock.file_hash == file_hash,
                UploadHashLock.job_id == job_id
            )

            if lock:
                lock.expires_at = datetime.utcnow() + timedelta(seconds=additional_seconds)
                await lock.save()
                logger.debug(f"Extended hash lock for {file_hash[:16]}... by {additional_seconds}s")
                return True
            return False

        except Exception as e:
            logger.error(f"Failed to extend hash lock: {e}", exc_info=True)
            return False

    async def is_locked(self, file_hash: str) -> bool:
        """
        Check if a file hash is currently locked.

        Args:
            file_hash: SHA256 hash of the file

        Returns:
            True if the hash is locked, False otherwise
        """
        try:
            lock = await UploadHashLock.find_one(
                UploadHashLock.file_hash == file_hash
            )
            return lock is not None

        except Exception as e:
            logger.error(f"Failed to check hash lock: {e}", exc_info=True)
            return False

    async def get_lock_info(self, file_hash: str) -> Optional[dict]:
        """
        Get information about a lock.

        Args:
            file_hash: SHA256 hash of the file

        Returns:
            Dict with lock info or None if not locked
        """
        try:
            lock = await UploadHashLock.find_one(
                UploadHashLock.file_hash == file_hash
            )

            if lock:
                return {
                    "file_hash": lock.file_hash,
                    "job_id": lock.job_id,
                    "acquired_at": lock.acquired_at,
                    "expires_at": lock.expires_at,
                    "remaining_seconds": max(
                        0,
                        (lock.expires_at - datetime.utcnow()).total_seconds()
                    ),
                }
            return None

        except Exception as e:
            logger.error(f"Failed to get lock info: {e}", exc_info=True)
            return None

    async def cleanup_stale_locks(self) -> int:
        """
        Manually clean up expired locks.

        Note: MongoDB TTL index handles this automatically, but this method
        can be used for immediate cleanup if needed.

        Returns:
            Number of stale locks removed
        """
        try:
            result = await UploadHashLock.find(
                UploadHashLock.expires_at < datetime.utcnow()
            ).delete()

            deleted_count = result.deleted_count if result else 0
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} stale hash locks")
            return deleted_count

        except Exception as e:
            logger.error(f"Failed to cleanup stale locks: {e}", exc_info=True)
            return 0


# Global lock manager instance
upload_lock_manager = UploadLockManager()
