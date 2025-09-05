"""
Security utilities for sanitizing sensitive data in the Olorin investigation system.

This module provides functions to sanitize tool results, exception messages,
and other data before broadcasting via WebSocket or logging.
"""

import re
import hashlib
from typing import Any, Dict, List, Optional, Union
import json

# Patterns for detecting sensitive information
SENSITIVE_PATTERNS = {
    'api_key': re.compile(r'\b[A-Za-z0-9]{20,}\b'),  # Long alphanumeric strings
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    'credit_card': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
    'phone': re.compile(r'\b\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s\d{3}-\d{4}\b'),
    'ip_address': re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'),
    'jwt_token': re.compile(r'\beyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]*\b'),
    'bearer_token': re.compile(r'\bBearer\s+[A-Za-z0-9+/=]+\b', re.IGNORECASE),
    'password_field': re.compile(r'(password|passwd|pwd)["\s]*[:=]["\s]*[^\s"]+', re.IGNORECASE),
    'secret_field': re.compile(r'(secret|key)["\s]*[:=]["\s]*[^\s"]+', re.IGNORECASE),
}

# Generic error messages for different error types
GENERIC_ERROR_MESSAGES = {
    'ConnectionError': 'Service connection failed',
    'TimeoutError': 'Operation timed out',
    'AuthenticationError': 'Authentication failed',
    'PermissionError': 'Access denied',
    'ValueError': 'Invalid input provided',
    'KeyError': 'Required data not found',
    'HTTPError': 'HTTP request failed',
    'NetworkError': 'Network operation failed',
    'DatabaseError': 'Database operation failed',
    'ConfigurationError': 'Configuration error',
    'ValidationError': 'Data validation failed',
    'ProcessingError': 'Processing operation failed',
    'default': 'Tool execution failed'
}


def sanitize_tool_result(result: Any, max_length: int = 200) -> Optional[str]:
    """
    Sanitize tool result for safe broadcasting via WebSocket.
    
    Args:
        result: The tool execution result
        max_length: Maximum length of sanitized result
        
    Returns:
        Sanitized result string or None if result should not be broadcast
    """
    if result is None:
        return None
        
    # Convert to string representation
    try:
        if isinstance(result, (dict, list)):
            result_str = json.dumps(result, indent=None, separators=(',', ':'))
        else:
            result_str = str(result)
    except Exception:
        # If serialization fails, use generic message
        return "Tool execution completed successfully"
    
    # Truncate if too long
    if len(result_str) > max_length:
        result_str = result_str[:max_length] + "... [truncated]"
    
    # Sanitize sensitive patterns
    sanitized = sanitize_text(result_str)
    
    # If result is heavily sanitized (>50% redacted), use generic message
    redaction_ratio = (len(result_str) - len(sanitized.replace('[REDACTED]', ''))) / len(result_str)
    if redaction_ratio > 0.5:
        return "Tool execution completed with sensitive data"
    
    return sanitized


def sanitize_text(text: str) -> str:
    """
    Sanitize text by replacing sensitive patterns with [REDACTED].
    
    Args:
        text: Text to sanitize
        
    Returns:
        Sanitized text with sensitive data redacted
    """
    if not text:
        return text
        
    sanitized = text
    
    # Replace sensitive patterns
    for pattern_name, pattern in SENSITIVE_PATTERNS.items():
        sanitized = pattern.sub('[REDACTED]', sanitized)
    
    return sanitized


def sanitize_exception_message(exception: Exception) -> str:
    """
    Convert exception to a generic, safe error message.
    
    Args:
        exception: The exception that occurred
        
    Returns:
        Generic error message based on exception type
    """
    exception_type = type(exception).__name__
    
    # Return generic message based on exception type
    return GENERIC_ERROR_MESSAGES.get(exception_type, GENERIC_ERROR_MESSAGES['default'])


def create_result_hash(result: Any) -> str:
    """
    Create a hash of the result for tracking without exposing data.
    
    Args:
        result: The result to hash
        
    Returns:
        SHA-256 hash of the result
    """
    try:
        if isinstance(result, (dict, list)):
            result_str = json.dumps(result, sort_keys=True)
        else:
            result_str = str(result)
        
        return hashlib.sha256(result_str.encode()).hexdigest()[:16]  # Short hash
    except Exception:
        return "unknown"


def sanitize_websocket_event_data(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize WebSocket event data to remove sensitive information.
    
    Args:
        event_data: Original event data
        
    Returns:
        Sanitized event data safe for broadcasting
    """
    sanitized_data = {}
    
    for key, value in event_data.items():
        if key in ['result', 'response', 'output']:
            # Sanitize result data
            sanitized_data[key] = sanitize_tool_result(value)
        elif key in ['error', 'exception', 'error_message']:
            # Sanitize error messages
            if isinstance(value, str):
                sanitized_data[key] = sanitize_text(value)[:100] + "..." if len(value) > 100 else sanitize_text(value)
            else:
                sanitized_data[key] = "Error occurred"
        elif key in ['args', 'parameters', 'input']:
            # Sanitize input parameters
            if isinstance(value, dict):
                sanitized_data[key] = {k: sanitize_text(str(v)) if isinstance(v, str) else "[REDACTED]" 
                                     for k, v in value.items()}
            else:
                sanitized_data[key] = sanitize_text(str(value)) if isinstance(value, str) else "[REDACTED]"
        elif isinstance(value, str):
            # Sanitize any other string values
            sanitized_data[key] = sanitize_text(value)
        else:
            # Keep safe non-string values
            sanitized_data[key] = value
    
    return sanitized_data


def is_sensitive_data(data: str, threshold: float = 0.3) -> bool:
    """
    Check if text contains sensitive data based on pattern matching.
    
    Args:
        data: Text to check
        threshold: Minimum ratio of sensitive patterns to consider data sensitive
        
    Returns:
        True if data is likely sensitive
    """
    if not data or len(data) < 10:
        return False
    
    sensitive_matches = 0
    total_patterns = len(SENSITIVE_PATTERNS)
    
    for pattern in SENSITIVE_PATTERNS.values():
        if pattern.search(data):
            sensitive_matches += 1
    
    return (sensitive_matches / total_patterns) >= threshold


def get_error_category(exception: Exception) -> str:
    """
    Categorize exception into broad categories for monitoring.
    
    Args:
        exception: The exception to categorize
        
    Returns:
        Error category string
    """
    exception_type = type(exception).__name__
    
    if exception_type in ['ConnectionError', 'TimeoutError', 'NetworkError', 'HTTPError']:
        return 'network'
    elif exception_type in ['AuthenticationError', 'PermissionError']:
        return 'authentication'
    elif exception_type in ['ValueError', 'ValidationError', 'KeyError']:
        return 'input'
    elif exception_type in ['DatabaseError', 'ConfigurationError']:
        return 'system'
    else:
        return 'unknown'


def validate_websocket_broadcast_data(data: Dict[str, Any]) -> bool:
    """
    Validate that data is safe to broadcast via WebSocket.
    
    Args:
        data: Data to validate
        
    Returns:
        True if data is safe to broadcast
    """
    try:
        # Check if data can be JSON serialized
        json.dumps(data)
        
        # Check for obvious sensitive patterns in string values
        for key, value in data.items():
            if isinstance(value, str) and is_sensitive_data(value):
                return False
        
        return True
    except Exception:
        return False