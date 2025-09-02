"""
Encryption utilities for sensitive data storage
"""

import base64
import json
import logging
import os
from typing import Optional, Union

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.service.config_loader import ConfigLoader

logger = logging.getLogger(__name__)


class DataEncryption:
    """Handles encryption and decryption of sensitive data."""

    def __init__(self, password: Optional[str] = None):
        """Initialize encryption with a password from Firebase Secret Manager."""
        config_loader = ConfigLoader()
        
        # Load encryption settings from Firebase Secret Manager
        encryption_password = password or config_loader.load_secret("ENCRYPTION_PASSWORD")
        if not encryption_password:
            raise ValueError(
                "ENCRYPTION_PASSWORD secret is required in Firebase Secret Manager. "
                "Generate with: openssl rand -base64 32"
            )
        self.password = encryption_password
        
        encryption_salt = config_loader.load_secret("ENCRYPTION_SALT")
        if not encryption_salt:
            raise ValueError(
                "ENCRYPTION_SALT secret is required in Firebase Secret Manager. "
                "Generate with: openssl rand -base64 16"
            )
        self.salt = encryption_salt.encode()[:16]  # Use first 16 bytes
        self._fernet = None

    @property
    def fernet(self) -> Fernet:
        """Lazy-load Fernet cipher."""
        if self._fernet is None:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=self.salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.password.encode()))
            self._fernet = Fernet(key)
        return self._fernet

    def encrypt(self, data: Union[str, dict, list]) -> str:
        """Encrypt data and return base64 encoded string."""
        try:
            # Convert data to JSON string if it's not already a string
            if not isinstance(data, str):
                data = json.dumps(data)

            # Encrypt the data
            encrypted_data = self.fernet.encrypt(data.encode())

            # Return base64 encoded string for storage
            return base64.urlsafe_b64encode(encrypted_data).decode()

        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise

    def decrypt(self, encrypted_data: str) -> Union[str, dict, list]:
        """Decrypt base64 encoded encrypted data."""
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())

            # Decrypt the data
            decrypted_data = self.fernet.decrypt(encrypted_bytes)

            # Convert back to string
            data_str = decrypted_data.decode()

            # Try to parse as JSON, return as string if it fails
            try:
                return json.loads(data_str)
            except json.JSONDecodeError:
                return data_str

        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise


class FieldEncryption:
    """Handles field-level encryption for sensitive data."""

    def __init__(self, encryption: Optional[DataEncryption] = None):
        self.encryption = encryption or DataEncryption()

        # Define which fields should be encrypted
        self.sensitive_fields = {
            "user_id",
            "device_id",
            "email",
            "phone",
            "ssn",
            "credit_card",
            "api_key",
            "token",
            "password",
            "secret",
            "auth_token",
            "investigation_id",
            "entity_id",
        }

    def should_encrypt_field(self, field_name: str) -> bool:
        """Determine if a field should be encrypted."""
        field_lower = field_name.lower()
        return any(sensitive in field_lower for sensitive in self.sensitive_fields)

    def encrypt_dict(self, data: dict) -> dict:
        """Encrypt sensitive fields in a dictionary."""
        encrypted_data = {}

        for key, value in data.items():
            if self.should_encrypt_field(key) and value is not None:
                # Mark encrypted fields with a prefix
                encrypted_data[f"enc_{key}"] = self.encryption.encrypt(str(value))
            else:
                encrypted_data[key] = value

        return encrypted_data

    def decrypt_dict(self, data: dict) -> dict:
        """Decrypt sensitive fields in a dictionary."""
        decrypted_data = {}

        for key, value in data.items():
            if key.startswith("enc_") and value is not None:
                # Remove the prefix and decrypt
                original_key = key[4:]  # Remove "enc_" prefix
                try:
                    decrypted_data[original_key] = self.encryption.decrypt(value)
                except Exception as e:
                    logger.error(f"Failed to decrypt field {key}: {e}")
                    # Keep the original encrypted value if decryption fails
                    decrypted_data[original_key] = value
            else:
                decrypted_data[key] = value

        return decrypted_data


class RedisEncryption:
    """Encryption wrapper for Redis operations."""

    def __init__(self, redis_client, encryption: Optional[DataEncryption] = None):
        self.redis = redis_client
        self.encryption = encryption or DataEncryption()
        self.field_encryption = FieldEncryption(encryption)

    async def set_encrypted(
        self, key: str, value: Union[str, dict, list], **kwargs
    ) -> bool:
        """Set an encrypted value in Redis."""
        try:
            if isinstance(value, dict):
                # Use field-level encryption for dictionaries
                encrypted_value = self.field_encryption.encrypt_dict(value)
                json_value = json.dumps(encrypted_value)
            else:
                # Encrypt the entire value
                json_value = self.encryption.encrypt(value)

            return await self.redis.set(key, json_value, **kwargs)

        except Exception as e:
            logger.error(f"Failed to set encrypted value for key {key}: {e}")
            raise

    async def get_decrypted(self, key: str) -> Union[str, dict, list, None]:
        """Get and decrypt a value from Redis."""
        try:
            encrypted_value = await self.redis.get(key)
            if encrypted_value is None:
                return None

            # Try to parse as JSON first (for field-level encryption)
            try:
                data = json.loads(encrypted_value)
                if isinstance(data, dict):
                    return self.field_encryption.decrypt_dict(data)
                else:
                    return self.encryption.decrypt(encrypted_value)
            except json.JSONDecodeError:
                # If not JSON, decrypt as single value
                return self.encryption.decrypt(encrypted_value)

        except Exception as e:
            logger.error(f"Failed to get decrypted value for key {key}: {e}")
            raise

    async def hset_encrypted(self, name: str, mapping: dict) -> int:
        """Set encrypted hash fields in Redis."""
        try:
            encrypted_mapping = {}
            for field, value in mapping.items():
                if (
                    self.field_encryption.should_encrypt_field(field)
                    and value is not None
                ):
                    encrypted_mapping[field] = self.encryption.encrypt(str(value))
                else:
                    encrypted_mapping[field] = value

            return await self.redis.hset(name, mapping=encrypted_mapping)

        except Exception as e:
            logger.error(f"Failed to set encrypted hash for {name}: {e}")
            raise

    async def hgetall_decrypted(self, name: str) -> dict:
        """Get all hash fields and decrypt sensitive ones."""
        try:
            encrypted_data = await self.redis.hgetall(name)
            if not encrypted_data:
                return {}

            decrypted_data = {}
            for field, value in encrypted_data.items():
                if (
                    self.field_encryption.should_encrypt_field(field)
                    and value is not None
                ):
                    try:
                        decrypted_data[field] = self.encryption.decrypt(value)
                    except Exception as e:
                        logger.error(f"Failed to decrypt field {field}: {e}")
                        decrypted_data[field] = value
                else:
                    decrypted_data[field] = value

            return decrypted_data

        except Exception as e:
            logger.error(f"Failed to get decrypted hash for {name}: {e}")
            raise


# Global encryption instance
_encryption_instance = None


def get_encryption() -> DataEncryption:
    """Get global encryption instance."""
    global _encryption_instance
    if _encryption_instance is None:
        _encryption_instance = DataEncryption()
    return _encryption_instance