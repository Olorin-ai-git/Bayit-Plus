"""Fernet-based symmetric encryption for OAuth tokens at rest."""

import base64
import logging

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


def _derive_fernet_key(raw_key: str) -> bytes:
    """Derive a valid Fernet key from raw config string.

    Fernet requires a URL-safe base64-encoded key that decodes to exactly
    32 bytes. If the input is already a valid 44-char base64 string that
    decodes to 32 bytes, use it directly. Otherwise, pad/truncate the raw
    UTF-8 bytes to 32 bytes and base64-encode.
    """
    key_bytes = raw_key.encode("utf-8")
    if len(key_bytes) == 44:
        try:
            decoded = base64.urlsafe_b64decode(key_bytes)
            if len(decoded) == 32:
                return key_bytes
        except Exception:
            pass
    # Pad or truncate to 32 bytes, then base64-encode
    padded = (key_bytes * ((32 // len(key_bytes)) + 1))[:32]
    return base64.urlsafe_b64encode(padded)


def encrypt_token(plaintext: str, encryption_key: str) -> str:
    """Encrypt a token string. Returns base64 ciphertext."""
    fernet = Fernet(_derive_fernet_key(encryption_key))
    return fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str, encryption_key: str) -> str:
    """Decrypt a token string. Raises ValueError on failure."""
    fernet = Fernet(_derive_fernet_key(encryption_key))
    try:
        return fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt token — wrong key or corrupted data") from exc
