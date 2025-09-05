"""
Entity Type Validation Utilities

This module provides utility functions for entity type validation, categorization,
and management operations.
"""

from typing import Dict, List, Set, Optional, Tuple
import re
from enum import Enum
from functools import lru_cache
from app.config.validation_config import (
    ENTITY_TYPE_MAX_LENGTH,
    ENTITY_TYPE_MIN_LENGTH,
    MAX_SUGGESTIONS_COUNT,
    VALIDATION_CACHE_MAX_SIZE
)

# Import EntityType at module level to avoid dynamic imports (security)
from app.service.agent.multi_entity.entity_manager import EntityType

# Pre-compiled regex patterns for security validation
DANGEROUS_PATTERNS = [
    re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"vbscript:",
        r"data:text/html",
        r"<iframe[^>]*>.*?</iframe>",
        r"--",
        r";",
        r"'",  # Single quotes often used in SQL injection
        r"\bUNION\b",
        r"\bSELECT\b",
        r"\bINSERT\b",
        r"\bUPDATE\b",
        r"\bDELETE\b",
        r"\bDROP\b"
    ]
]


def get_entity_type_categories() -> Dict[str, List[str]]:
    """
    Get entity types organized by categories for better error messages and validation.
    
    Returns:
        Dict mapping category names to lists of entity types
    """
    categories = {
        "core": [
            EntityType.DEVICE.value,
            EntityType.LOCATION.value, 
            EntityType.NETWORK.value,
            EntityType.USER.value,
            EntityType.ACCOUNT.value,
            EntityType.TRANSACTION.value
        ],
        "behavioral": [
            EntityType.LOGIN_PATTERN.value,
            EntityType.SPENDING_PATTERN.value,
            EntityType.ACCESS_PATTERN.value,
            EntityType.COMMUNICATION_PATTERN.value,
            EntityType.BEHAVIOR_PATTERN.value
        ],
        "risk": [
            EntityType.RISK_INDICATOR.value,
            EntityType.ANOMALY.value,
            EntityType.THREAT.value,
            EntityType.VULNERABILITY.value
        ],
        "identity": [
            EntityType.EMAIL.value,
            EntityType.PHONE_NUMBER.value,
            EntityType.IP_ADDRESS.value,
            EntityType.BIOMETRIC.value,
            EntityType.API_KEY.value,
            EntityType.CERTIFICATE.value
        ],
        "payment": [
            EntityType.PAYMENT_METHOD.value,
            EntityType.MERCHANT.value
        ],
        "temporal": [
            EntityType.TIMESTAMP.value,
            EntityType.RECORD_CREATED.value,
            EntityType.RECORD_UPDATED.value,
            EntityType.TX_DATETIME.value,
            EntityType.TX_RECEIVED.value
        ],
        "technical": [
            EntityType.SESSION.value,
            EntityType.BROWSER.value,
            EntityType.APPLICATION.value,
            EntityType.DOMAIN.value,
            EntityType.URL.value,
            EntityType.FILE_HASH.value
        ],
        "business": [
            EntityType.STORE_ID.value,
            EntityType.APP_ID.value,
            EntityType.EVENT_TYPE.value,
            EntityType.AUTHORIZATION_STAGE.value
        ],
        "meta": [
            EntityType.INVESTIGATION.value,
            EntityType.CASE.value,
            EntityType.ALERT.value,
            EntityType.RULE.value
        ]
    }
    
    return categories


def validate_entity_type_format(entity_type: str) -> Tuple[bool, Optional[str]]:
    """
    Validate entity type format without enum checking.
    
    Args:
        entity_type: The entity type string to validate
        
    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str])
    """
    if not isinstance(entity_type, str):
        return False, "Entity type must be a string"
    
    if not entity_type or not entity_type.strip():
        return False, "Entity type cannot be empty"
    
    if len(entity_type) > ENTITY_TYPE_MAX_LENGTH:
        return False, f"Entity type exceeds maximum length of {ENTITY_TYPE_MAX_LENGTH} characters"
    
    # Check for dangerous patterns using pre-compiled regex
    for compiled_pattern in DANGEROUS_PATTERNS:
        if compiled_pattern.search(entity_type):
            return False, "Invalid characters detected in entity type"
    
    return True, None


def get_entity_type_suggestions(invalid_type: str) -> List[str]:
    """
    Get entity type suggestions based on partial match or similarity.
    
    Args:
        invalid_type: The invalid entity type that was provided
        
    Returns:
        List of suggested entity types
    """
    invalid_type_lower = invalid_type.lower().strip()
    all_types = [et.value for et in EntityType]
    categories = get_entity_type_categories()
    
    suggestions = []
    
    # Direct substring matches
    substring_matches = [t for t in all_types if invalid_type_lower in t or t in invalid_type_lower]
    suggestions.extend(substring_matches[:3])
    
    # Category-based suggestions
    for category, types in categories.items():
        if any(cat_word in invalid_type_lower for cat_word in category.split('_')):
            suggestions.extend([t for t in types if t in all_types][:2])
        elif any(invalid_type_lower in t for t in types):
            suggestions.extend([t for t in types if t in all_types][:2])
    
    # Fallback to core types if no matches found
    if not suggestions:
        suggestions = categories.get("core", [])[:5]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_suggestions = []
    for suggestion in suggestions:
        if suggestion not in seen:
            seen.add(suggestion)
            unique_suggestions.append(suggestion)
    
    return unique_suggestions[:MAX_SUGGESTIONS_COUNT]


def is_entity_type_compatible(entity_type_1: str, entity_type_2: str) -> bool:
    """
    Check if two entity types are compatible for relationship analysis.
    
    Args:
        entity_type_1: First entity type
        entity_type_2: Second entity type
        
    Returns:
        True if entity types can be used together in investigations
    """
    # Validate both types first
    try:
        type_1 = EntityType(entity_type_1)
        type_2 = EntityType(entity_type_2)
    except ValueError:
        return False
    
    # Define incompatible combinations
    incompatible_pairs = {
        # Meta entities shouldn't be analyzed with data entities
        frozenset([EntityType.INVESTIGATION.value, EntityType.USER.value]),
        frozenset([EntityType.CASE.value, EntityType.TRANSACTION.value]),
        frozenset([EntityType.RULE.value, EntityType.DEVICE.value]),
    }
    
    pair = frozenset([entity_type_1, entity_type_2])
    return pair not in incompatible_pairs


@lru_cache(maxsize=1)
def get_all_entity_types() -> List[str]:
    """
    Get all valid entity types as a list of strings.
    
    Returns:
        List of all valid entity type values
    """
    return [et.value for et in EntityType]


@lru_cache(maxsize=1)
def get_valid_entity_types_set() -> Set[str]:
    """
    Get all valid entity types as a set for fast lookup.
    
    Returns:
        Set of all valid entity type values
    """
    return set(get_all_entity_types())


def get_entity_type_count() -> int:
    """
    Get the total number of supported entity types.
    
    Returns:
        Number of supported entity types
    """
    return len(EntityType)


def get_entity_types_by_category(category: str) -> List[str]:
    """
    Get entity types for a specific category.
    
    Args:
        category: Category name (core, behavioral, risk, identity, etc.)
        
    Returns:
        List of entity types in the specified category
    """
    categories = get_entity_type_categories()
    return categories.get(category.lower(), [])


@lru_cache(maxsize=VALIDATION_CACHE_MAX_SIZE)
def validate_entity_type_against_enum(entity_type: str) -> Tuple[bool, Optional[str]]:
    """
    Validate entity type against the EntityType enum.
    
    Args:
        entity_type: The entity type string to validate
        
    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str])
    """
    # First validate format
    format_valid, format_error = validate_entity_type_format(entity_type)
    if not format_valid:
        return False, format_error
    
    # Normalize
    normalized_type = entity_type.strip().lower()
    
    # Fast set lookup instead of list creation
    valid_types_set = get_valid_entity_types_set()
    if normalized_type not in valid_types_set:
        suggestions = get_entity_type_suggestions(normalized_type)
        suggestion_text = f" Did you mean one of: {', '.join(suggestions)}?" if suggestions else ""
        
        return False, (
            f"Invalid entity type '{normalized_type}'. {suggestion_text} "
            f"Total valid types: {len(valid_types_set)}. "
            f"Use the entity type reference documentation for the complete list."
        )
    
    return True, None


def create_entity_type_error_response(invalid_type: str) -> Dict[str, any]:
    """
    Create a comprehensive error response for invalid entity types.
    
    Args:
        invalid_type: The invalid entity type that was provided
        
    Returns:
        Dictionary containing error details and suggestions
    """
    suggestions = get_entity_type_suggestions(invalid_type)
    categories = get_entity_type_categories()
    total_count = get_entity_type_count()
    
    return {
        "error": "Invalid entity type",
        "provided_type": invalid_type,
        "suggestions": suggestions,
        "categories_available": list(categories.keys()),
        "total_supported_types": total_count,
        "documentation": "Refer to entity type reference documentation for complete list",
        "examples_by_category": {
            category: types[:3] for category, types in categories.items()
        }
    }