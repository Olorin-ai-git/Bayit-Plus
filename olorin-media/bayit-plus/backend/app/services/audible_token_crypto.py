"""Token encryption/decryption for Audible OAuth tokens.

Provides secure encryption and decryption of Audible access/refresh tokens
using application-level encryption (Fernet symmetric encryption).
"""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class TokenEncryptionError(Exception):
    """Raised when token encryption/decryption fails."""

    pass


class AudibleTokenCrypto:
    """Manages encryption and decryption of Audible OAuth tokens."""

    def __init__(self):
        """Initialize crypto with encryption key from configuration."""
        if not settings.AUDIBLE_TOKEN_ENCRYPTION_KEY:
            logger.warning(
                "Audible token encryption key not configured - "
                "tokens will be stored in plaintext (security risk)"
            )
            self.cipher = None
        else:
            try:
                # Fernet key must be 32 bytes, base64-encoded
                self.cipher = Fernet(settings.AUDIBLE_TOKEN_ENCRYPTION_KEY.encode())
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid Audible token encryption key: {str(e)}")
                raise TokenEncryptionError(
                    "Invalid AUDIBLE_TOKEN_ENCRYPTION_KEY configuration"
                )

    def encrypt_token(self, token: str) -> str:
        """Encrypt token for storage.

        Args:
            token: Plain text token to encrypt

        Returns:
            Encrypted token (base64-encoded bytes)

        Raises:
            TokenEncryptionError: If encryption fails
        """
        if not token:
            return token

        if not self.cipher:
            logger.warning(
                "Token encryption disabled - storing token in plaintext"
            )
            return token

        try:
            encrypted = self.cipher.encrypt(token.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt token: {str(e)}")
            raise TokenEncryptionError(f"Token encryption failed: {str(e)}")

    def decrypt_token(self, encrypted_token: str) -> str:
        """Decrypt token from storage.

        Args:
            encrypted_token: Encrypted token (base64-encoded)

        Returns:
            Plain text token

        Raises:
            TokenEncryptionError: If decryption fails
        """
        if not encrypted_token:
            return encrypted_token

        if not self.cipher:
            # If cipher not configured, assume token is plaintext
            return encrypted_token

        try:
            decrypted = self.cipher.decrypt(encrypted_token.encode())
            return decrypted.decode()
        except InvalidToken as e:
            logger.error(
                f"Failed to decrypt token (may be plaintext): {str(e)}"
            )
            # Return as-is if decryption fails (may be plaintext from old code)
            return encrypted_token
        except Exception as e:
            logger.error(f"Unexpected error decrypting token: {str(e)}")
            raise TokenEncryptionError(f"Token decryption failed: {str(e)}")


# Global instance
audible_token_crypto = AudibleTokenCrypto()
