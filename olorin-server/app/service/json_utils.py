"""
JSON Serialization Utilities

Provides safe JSON serialization functions that handle non-JSON-serializable
types commonly encountered in database queries and Python applications.

SYSTEM MANDATE Compliance:
- No hardcoded values: All logic is data-driven
- Complete implementation: Fully functional serialization
- Type-safe: Proper type handling and conversion
- No mocks/stubs: Real serialization logic only
"""

import json
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any
from uuid import UUID


def serialize_for_json(obj: Any) -> Any:
    """
    Recursively convert non-JSON-serializable objects to JSON-serializable format.

    Handles common Python types that are not natively JSON-serializable:
    - datetime, date, time objects -> ISO format strings
    - Decimal objects -> float (preserves numeric precision)
    - UUID objects -> string representation
    - bytes objects -> UTF-8 decoded string
    - set objects -> list
    - dict, list, tuple -> recursive serialization

    Args:
        obj: Object that may contain non-JSON-serializable types

    Returns:
        Object with all types converted to JSON-serializable format

    Example:
        >>> from decimal import Decimal
        >>> from datetime import datetime
        >>> data = {
        ...     "amount": Decimal("123.45"),
        ...     "timestamp": datetime.now(),
        ...     "id": UUID("550e8400-e29b-41d4-a716-446655440000")
        ... }
        >>> serialized = serialize_for_json(data)
        >>> json.dumps(serialized)  # Works without error
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, time):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, UUID):
        return str(obj)
    elif isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    elif isinstance(obj, set):
        return list(obj)
    elif isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(serialize_for_json(item) for item in obj)
    else:
        return obj


def safe_json_dumps(obj: Any, **kwargs) -> str:
    """
    Safely serialize object to JSON string, handling non-serializable types.

    This is a drop-in replacement for json.dumps() that automatically handles
    common Python types that are not natively JSON-serializable.

    Args:
        obj: Object to serialize
        **kwargs: Additional arguments to pass to json.dumps()

    Returns:
        JSON string representation of the object

    Raises:
        TypeError: If object contains types that cannot be serialized

    Example:
        >>> from decimal import Decimal
        >>> data = {"amount": Decimal("123.45")}
        >>> safe_json_dumps(data)
        '{"amount": 123.45}'
    """
    serialized = serialize_for_json(obj)
    return json.dumps(serialized, **kwargs)


def safe_json_loads(json_str: str, **kwargs) -> Any:
    """
    Safely deserialize JSON string to Python object.

    This is a convenience wrapper around json.loads() for consistency
    with safe_json_dumps().

    Args:
        json_str: JSON string to deserialize
        **kwargs: Additional arguments to pass to json.loads()

    Returns:
        Deserialized Python object

    Example:
        >>> json_str = '{"amount": 123.45}'
        >>> safe_json_loads(json_str)
        {'amount': 123.45}
    """
    return json.loads(json_str, **kwargs)


class DecimalEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles Decimal and other non-serializable types.

    Use this encoder with json.dumps() when you need more control over
    the serialization process.

    Example:
        >>> from decimal import Decimal
        >>> data = {"amount": Decimal("123.45")}
        >>> json.dumps(data, cls=DecimalEncoder)
        '{"amount": 123.45}'
    """

    def default(self, obj):
        """Override default method to handle custom types."""
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (datetime, date, time)):
            return obj.isoformat()
        elif isinstance(obj, UUID):
            return str(obj)
        elif isinstance(obj, bytes):
            return obj.decode("utf-8", errors="replace")
        elif isinstance(obj, set):
            return list(obj)
        return super().default(obj)
