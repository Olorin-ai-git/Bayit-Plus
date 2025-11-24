"""
Encryption utility for Composio access tokens using AES-256-GCM.

This module provides encryption/decryption for Composio connection credentials
with cloud provider key management integration (AWS KMS, GCP KMS, Azure Key Vault).
"""

import base64
import json
import logging
import os
from typing import Optional, Dict, Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)


class ComposioEncryption:
    """
    AES-256-GCM encryption for Composio connection credentials.
    
    Uses cloud provider key management service (AWS KMS, GCP KMS, Azure Key Vault)
    for key management. Falls back to environment variable if KMS not configured.
    """
    
    def __init__(self, key: Optional[bytes] = None):
        """
        Initialize encryption with key from cloud KMS or environment.
        
        Args:
            key: Optional encryption key (32 bytes for AES-256). If not provided,
                 will attempt to load from cloud KMS or environment variable.
        """
        self.config_loader = get_config_loader()
        self._key = key or self._load_encryption_key()
        self._aesgcm = AESGCM(self._key)
    
    def _load_encryption_key(self) -> bytes:
        """
        Load encryption key from cloud KMS or environment variable.
        
        Returns:
            32-byte encryption key for AES-256
            
        Raises:
            ValueError: If encryption key cannot be loaded
        """
        # Try cloud KMS first (AWS KMS, GCP KMS, Azure Key Vault)
        # This is a placeholder - actual implementation would integrate with cloud provider SDKs
        kms_key = self.config_loader.load_secret("COMPOSIO_ENCRYPTION_KEY_KMS")
        if kms_key:
            # Decode base64 key from KMS
            try:
                return base64.b64decode(kms_key)
            except Exception as e:
                logger.warning(f"Failed to decode KMS key: {e}, falling back to environment")
        
        # Fallback to environment variable
        env_key = os.getenv("COMPOSIO_ENCRYPTION_KEY")
        if env_key:
            try:
                key_bytes = base64.b64decode(env_key)
                if len(key_bytes) != 32:
                    raise ValueError("Encryption key must be 32 bytes (256 bits) for AES-256")
                return key_bytes
            except Exception as e:
                logger.error(f"Failed to decode environment key: {e}")
                raise ValueError("Invalid COMPOSIO_ENCRYPTION_KEY format") from e
        
        # Generate key from password if available (for development)
        password = self.config_loader.load_secret("COMPOSIO_ENCRYPTION_PASSWORD")
        if password:
            salt = self.config_loader.load_secret("COMPOSIO_ENCRYPTION_SALT", "default_salt").encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt[:16],  # Use first 16 bytes
                iterations=100000,
                backend=default_backend()
            )
            return kdf.derive(password.encode())
        
        raise ValueError(
            "COMPOSIO_ENCRYPTION_KEY or COMPOSIO_ENCRYPTION_PASSWORD must be set. "
            "Generate key with: openssl rand -base64 32"
        )
    
    def encrypt(self, data: str, associated_data: Optional[bytes] = None) -> str:
        """
        Encrypt data using AES-256-GCM.
        
        Args:
            data: Plaintext string to encrypt
            associated_data: Optional associated data for authentication
            
        Returns:
            Base64-encoded encrypted data with nonce prepended
        """
        try:
            # Generate 12-byte nonce (96 bits recommended for GCM)
            nonce = os.urandom(12)
            
            # Encrypt with associated data
            if associated_data is None:
                associated_data = b"composio_connection"
            
            ciphertext = self._aesgcm.encrypt(nonce, data.encode(), associated_data)
            
            # Prepend nonce to ciphertext and encode as base64
            encrypted_data = nonce + ciphertext
            return base64.urlsafe_b64encode(encrypted_data).decode()
            
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise ValueError(f"Failed to encrypt data: {e}") from e
    
    def decrypt(self, encrypted_data: str, associated_data: Optional[bytes] = None) -> str:
        """
        Decrypt data using AES-256-GCM.
        
        Args:
            encrypted_data: Base64-encoded encrypted data with nonce prepended
            associated_data: Optional associated data for authentication
            
        Returns:
            Decrypted plaintext string
        """
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            
            # Extract nonce (first 12 bytes) and ciphertext
            if len(encrypted_bytes) < 12:
                raise ValueError("Invalid encrypted data format")
            
            nonce = encrypted_bytes[:12]
            ciphertext = encrypted_bytes[12:]
            
            # Decrypt with associated data
            if associated_data is None:
                associated_data = b"composio_connection"
            
            plaintext = self._aesgcm.decrypt(nonce, ciphertext, associated_data)
            return plaintext.decode()
            
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise ValueError(f"Failed to decrypt data: {e}") from e
    
    def encrypt_dict(self, data: Dict[str, Any]) -> str:
        """
        Encrypt a dictionary by converting to JSON first.
        
        Args:
            data: Dictionary to encrypt
            
        Returns:
            Base64-encoded encrypted JSON string
        """
        json_str = json.dumps(data)
        return self.encrypt(json_str)
    
    def decrypt_dict(self, encrypted_data: str) -> Dict[str, Any]:
        """
        Decrypt data and parse as JSON dictionary.
        
        Args:
            encrypted_data: Base64-encoded encrypted JSON string
            
        Returns:
            Decrypted dictionary
        """
        json_str = self.decrypt(encrypted_data)
        return json.loads(json_str)

