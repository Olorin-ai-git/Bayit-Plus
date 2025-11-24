"""Snowflake configuration with private key authentication support."""
from pathlib import Path
from typing import Literal, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization


class SnowflakeConfig(BaseSettings):
    """
    Snowflake connection configuration with validation.

    Supports multiple authentication methods:
    - private_key: RSA private key file (most secure)
    - password: Username/password authentication
    - externalbrowser: SSO via browser
    """

    account: str = Field(..., validation_alias="SNOWFLAKE_ACCOUNT")
    user: str = Field(..., validation_alias="SNOWFLAKE_USER")
    role: str = Field(..., validation_alias="SNOWFLAKE_ROLE")
    warehouse: str = Field(..., validation_alias="SNOWFLAKE_WAREHOUSE")
    database: str = Field(..., validation_alias="SNOWFLAKE_DATABASE")
    snowflake_schema: str = Field(..., validation_alias="SNOWFLAKE_SCHEMA", alias="schema")

    auth_method: Literal["private_key", "password", "externalbrowser"] = Field(
        "private_key",
        validation_alias="SNOWFLAKE_AUTH_METHOD"
    )

    # Private key authentication
    private_key_path: Optional[str] = Field(None, validation_alias="SNOWFLAKE_PRIVATE_KEY_PATH")
    private_key_passphrase: Optional[str] = Field(
        None,
        validation_alias="SNOWFLAKE_PRIVATE_KEY_PASSPHRASE"
    )

    # Password authentication
    password: Optional[str] = Field(None, validation_alias="SNOWFLAKE_PASSWORD")

    @field_validator("private_key_path")
    @classmethod
    def validate_private_key_path(cls, v, info):
        """Validate private key file exists if using private key auth."""
        auth_method = info.data.get("auth_method")
        if auth_method == "private_key":
            if not v:
                raise ValueError(
                    "SNOWFLAKE_PRIVATE_KEY_PATH required when "
                    "auth_method='private_key'"
                )
            key_path = Path(v)
            if not key_path.exists():
                raise ValueError(
                    f"Private key file not found: {v}"
                )
            if not key_path.is_file():
                raise ValueError(
                    f"Private key path is not a file: {v}"
                )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v, info):
        """Validate password exists if using password auth."""
        auth_method = info.data.get("auth_method")
        if auth_method == "password" and not v:
            raise ValueError(
                "SNOWFLAKE_PASSWORD required when auth_method='password'"
            )
        return v

    def load_private_key(self) -> bytes:
        """
        Load and decode the RSA private key.

        Returns:
            Serialized private key in DER format

        Raises:
            ValueError: If private key cannot be loaded
        """
        if self.auth_method != "private_key":
            raise ValueError("Cannot load private key for non-private_key auth")

        try:
            with open(self.private_key_path, "rb") as key_file:
                private_key_data = key_file.read()

            # Determine if passphrase is needed
            passphrase = None
            if self.private_key_passphrase:
                passphrase = self.private_key_passphrase.encode()

            # Load the private key
            private_key = serialization.load_pem_private_key(
                private_key_data,
                password=passphrase,
                backend=default_backend()
            )

            # Serialize to DER format for Snowflake
            return private_key.private_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )

        except Exception as e:
            raise ValueError(
                f"Failed to load private key from {self.private_key_path}: {e}"
            )

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore",
    }


def load_snowflake_config() -> SnowflakeConfig:
    """
    Load and validate Snowflake configuration.

    Returns:
        Validated SnowflakeConfig instance

    Raises:
        RuntimeError: If configuration is invalid
    """
    try:
        return SnowflakeConfig()
    except Exception as e:
        raise RuntimeError(
            f"Invalid Snowflake configuration – refusing to start: {e}"
        )
