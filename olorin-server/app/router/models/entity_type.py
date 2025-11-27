"""
EntityType Enum

Enumeration of supported entity types for fraud investigations.
"""

from enum import Enum


class EntityType(str, Enum):
    """
    Enum of supported entity types for fraud investigations.

    Constitutional Compliance:
    - Entity types from domain model, not hardcoded business logic
    - Extensible via configuration in future
    """

    EMAIL = "email"
    PHONE = "phone"
    DEVICE_ID = "device_id"
    IP_ADDRESS = "ip_address"
    USER_ID = "user_id"
    MERCHANT = "merchant"
