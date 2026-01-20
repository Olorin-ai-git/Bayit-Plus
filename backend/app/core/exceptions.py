"""Custom exceptions for the Bayit Plus application.

Extends olorin-shared base exceptions with platform-specific error types.
"""

from olorin_shared.errors import OlorinException, InternalError


class GameError(InternalError):
    """Raised when a game operation fails"""

    def __init__(self, message: str = "Game operation failed", details=None):
        super().__init__(
            message=message,
            error_code="GAME_ERROR",
            details=details
        )


class FriendshipError(InternalError):
    """Raised when friendship operation fails"""

    def __init__(self, message: str = "Friendship operation failed", details=None):
        super().__init__(
            message=message,
            error_code="FRIENDSHIP_ERROR",
            details=details
        )


class UploadIntegrityError(InternalError):
    """Base exception for upload integrity issues"""

    def __init__(self, message: str = "Upload integrity check failed", details=None):
        super().__init__(
            message=message,
            error_code="UPLOAD_INTEGRITY_ERROR",
            details=details
        )


class DuplicateContentError(UploadIntegrityError):
    """Raised when attempting to upload content that already exists"""

    def __init__(self, file_hash: str, existing_title: str = None):
        self.file_hash = file_hash
        self.existing_title = existing_title
        message = f"Duplicate content detected (hash: {file_hash[:16]}...)"
        if existing_title:
            message = f"Duplicate content: Already exists as '{existing_title}'"
        super().__init__(message)


class OrphanedGCSFileError(UploadIntegrityError):
    """Raised when a GCS file has no corresponding database record"""

    def __init__(self, gcs_path: str):
        self.gcs_path = gcs_path
        super().__init__(f"Orphaned GCS file: {gcs_path}")


class OrphanedContentRecordError(UploadIntegrityError):
    """Raised when a content record has no corresponding GCS file"""

    def __init__(self, content_id: str, expected_url: str):
        self.content_id = content_id
        self.expected_url = expected_url
        super().__init__(
            f"Orphaned content record: {content_id} (missing file: {expected_url})"
        )


class StuckUploadJobError(UploadIntegrityError):
    """Raised when an upload job is stuck in processing state"""

    def __init__(self, job_id: str, stuck_minutes: int):
        self.job_id = job_id
        self.stuck_minutes = stuck_minutes
        super().__init__(
            f"Stuck upload job: {job_id} (stuck for {stuck_minutes} minutes)"
        )


class HashLockConflictError(UploadIntegrityError):
    """Raised when a hash lock cannot be acquired due to conflict"""

    def __init__(self, file_hash: str, blocking_job_id: str):
        self.file_hash = file_hash
        self.blocking_job_id = blocking_job_id
        super().__init__(
            f"Hash lock conflict: {file_hash[:16]}... is locked by job {blocking_job_id}"
        )


class TransactionRollbackError(UploadIntegrityError):
    """Raised when a transaction rollback fails"""

    def __init__(self, job_id: str, failed_compensations: list):
        self.job_id = job_id
        self.failed_compensations = failed_compensations
        super().__init__(
            f"Transaction rollback failed for job {job_id}: "
            f"{len(failed_compensations)} compensation(s) failed"
        )
