"""Field-level encryption for sensitive location data."""
import logging
from base64 import b64decode, b64encode

from app.core.config import settings

logger = logging.getLogger(__name__)


class FieldEncryption:
    """Encrypt/decrypt sensitive fields using Fernet symmetric encryption."""

    def __init__(self):
        """Initialize cipher with key from configuration."""
        try:
            from cryptography.fernet import Fernet

            key = settings.LOCATION_ENCRYPTION_KEY.encode()
            if not key or key == b"":
                raise ValueError("LOCATION_ENCRYPTION_KEY not configured")
            self.cipher = Fernet(key)
            self.enabled = True
        except Exception as e:
            logger.warning("Encryption disabled", extra={"error": str(e)})
            self.cipher = None
            self.enabled = False

    def encrypt(self, value: str) -> str:
        """Encrypt string value."""
        if not self.enabled:
            logger.warning("Encryption disabled - storing unencrypted")
            return value
        try:
            encrypted = self.cipher.encrypt(value.encode())
            return b64encode(encrypted).decode()
        except Exception as e:
            logger.error("Encryption failed", extra={"error": str(e)})
            raise

    def decrypt(self, value: str) -> str:
        """Decrypt encrypted value."""
        if not self.enabled:
            return value
        try:
            encrypted = b64decode(value.encode())
            decrypted = self.cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            logger.error("Decryption failed", extra={"error": str(e)})
            raise


def get_field_encryption() -> FieldEncryption:
    """Dependency injection for FieldEncryption."""
    return FieldEncryption()
