"""
Recording Quota Model
User recording storage and duration quota tracking.
"""

from pydantic import BaseModel


class RecordingQuota(BaseModel):
    """User recording quota tracking"""

    total_storage_bytes: int = 5_368_709_120  # 5GB default for premium
    used_storage_bytes: int = 0
    max_recording_duration_seconds: int = 14400  # 4 hours default
    max_concurrent_recordings: int = 1

    @property
    def available_storage_bytes(self) -> int:
        """Calculate available storage"""
        return max(0, self.total_storage_bytes - self.used_storage_bytes)

    @property
    def storage_usage_percentage(self) -> float:
        """Calculate storage usage percentage"""
        if self.total_storage_bytes == 0:
            return 0.0
        return (self.used_storage_bytes / self.total_storage_bytes) * 100

    def has_storage_available(self, required_bytes: int = 0) -> bool:
        """Check if storage is available"""
        return self.available_storage_bytes >= required_bytes
