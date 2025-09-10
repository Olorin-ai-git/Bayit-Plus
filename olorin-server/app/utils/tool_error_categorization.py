"""
Tool Error Categorization and Enhanced Logging Utilities

This module provides comprehensive error categorization and structured logging
for tool execution failures in the hybrid intelligence graph system.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
import traceback
import hashlib

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolErrorCategory(Enum):
    """Comprehensive error categories for tool execution failures."""
    
    # Network and connectivity errors
    CONNECTION_ERROR = "connection_error"
    TIMEOUT_ERROR = "timeout_error" 
    DNS_RESOLUTION = "dns_resolution"
    SSL_CERTIFICATE = "ssl_certificate"
    
    # Authentication and authorization errors
    AUTH_INVALID_CREDENTIALS = "auth_invalid_credentials"
    AUTH_TOKEN_EXPIRED = "auth_token_expired"
    AUTH_INSUFFICIENT_PERMISSIONS = "auth_insufficient_permissions"
    AUTH_RATE_LIMITED = "auth_rate_limited"
    
    # API and service errors
    API_NOT_FOUND = "api_not_found"
    API_BAD_REQUEST = "api_bad_request"
    API_SERVER_ERROR = "api_server_error"
    API_SERVICE_UNAVAILABLE = "api_service_unavailable"
    API_QUOTA_EXCEEDED = "api_quota_exceeded"
    API_DEPRECATED = "api_deprecated"
    
    # Data processing errors
    DATA_PARSING_ERROR = "data_parsing_error"
    DATA_VALIDATION_ERROR = "data_validation_error"
    DATA_FORMAT_UNSUPPORTED = "data_format_unsupported"
    DATA_CORRUPTION = "data_corruption"
    DATA_SIZE_EXCEEDED = "data_size_exceeded"
    
    # Configuration errors
    CONFIG_MISSING_REQUIRED = "config_missing_required"
    CONFIG_INVALID_VALUE = "config_invalid_value"
    CONFIG_SCHEMA_MISMATCH = "config_schema_mismatch"
    
    # Database errors
    DB_CONNECTION_FAILED = "db_connection_failed"
    DB_QUERY_TIMEOUT = "db_query_timeout"
    DB_INVALID_QUERY = "db_invalid_query"
    DB_PERMISSION_DENIED = "db_permission_denied"
    DB_TABLE_NOT_FOUND = "db_table_not_found"
    
    # Resource errors
    RESOURCE_EXHAUSTED = "resource_exhausted"
    MEMORY_INSUFFICIENT = "memory_insufficient"
    DISK_SPACE_INSUFFICIENT = "disk_space_insufficient"
    CPU_OVERLOADED = "cpu_overloaded"
    
    # External service specific errors
    THREAT_INTEL_API_DOWN = "threat_intel_api_down"
    SHODAN_RATE_LIMITED = "shodan_rate_limited"
    VIRUSTOTAL_QUOTA_EXCEEDED = "virustotal_quota_exceeded"
    ABUSEIPDB_TIMEOUT = "abuseipdb_timeout"
    SNOWFLAKE_WAREHOUSE_SUSPENDED = "snowflake_warehouse_suspended"
    
    # Unknown or uncategorized
    UNKNOWN_ERROR = "unknown_error"
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"


class ToolExecutionStatus(Enum):
    """Tool execution status for comprehensive tracking."""
    
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    RETRYING = "retrying"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class ToolErrorDetails:
    """Comprehensive error details for tool execution failures."""
    
    # Core error information
    category: ToolErrorCategory
    error_type: str                    # Exception class name
    error_message: str                 # Sanitized error message
    error_code: Optional[str] = None   # HTTP status code or API error code
    
    # Context information
    tool_name: str = ""
    tool_args: Dict[str, Any] = field(default_factory=dict)
    execution_duration_ms: Optional[int] = None
    attempt_number: int = 1
    max_retries: int = 0
    
    # Error metadata
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    error_hash: str = field(default="")
    stack_trace_hash: Optional[str] = None
    
    # Recovery information
    is_retryable: bool = False
    suggested_action: str = ""
    recovery_strategy: str = ""
    
    # Investigation context
    investigation_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    
    def __post_init__(self):
        """Generate error hash for deduplication."""
        if not self.error_hash:
            error_signature = f"{self.tool_name}:{self.error_type}:{self.error_message}"
            self.error_hash = hashlib.md5(error_signature.encode()).hexdigest()[:8]


@dataclass
class ToolExecutionMetrics:
    """Metrics and timing information for tool execution."""
    
    tool_name: str
    execution_status: ToolExecutionStatus
    
    # Timing metrics
    start_time: str = field(default_factory=lambda: datetime.now().isoformat())
    end_time: Optional[str] = None
    duration_ms: Optional[int] = None
    
    # Execution context
    investigation_id: Optional[str] = None
    attempt_number: int = 1
    max_retries: int = 0
    
    # Result metrics
    result_size_bytes: Optional[int] = None
    result_record_count: Optional[int] = None
    result_hash: Optional[str] = None
    
    # Performance indicators
    cache_hit: bool = False
    circuit_state: str = "closed"
    rate_limit_remaining: Optional[int] = None
    
    # Quality metrics
    data_completeness_score: Optional[float] = None  # 0.0-1.0
    confidence_score: Optional[float] = None         # 0.0-1.0
    
    def mark_completed(self, result_data: Optional[Any] = None):
        """Mark execution as completed and calculate metrics."""
        self.end_time = datetime.now().isoformat()
        self.execution_status = ToolExecutionStatus.COMPLETED
        
        if self.start_time and self.end_time:
            start_dt = datetime.fromisoformat(self.start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(self.end_time.replace('Z', '+00:00'))
            self.duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
        
        if result_data:
            # Calculate result size and record count
            if isinstance(result_data, (list, tuple)):
                self.result_record_count = len(result_data)
                self.result_size_bytes = len(str(result_data).encode('utf-8'))
            elif isinstance(result_data, dict):
                self.result_record_count = len(result_data)
                self.result_size_bytes = len(json.dumps(result_data).encode('utf-8'))
            elif isinstance(result_data, str):
                self.result_size_bytes = len(result_data.encode('utf-8'))
                # Count lines as records for string data
                self.result_record_count = len(result_data.splitlines())
            
            # Generate result hash
            if result_data:
                result_str = str(result_data)
                self.result_hash = hashlib.md5(result_str.encode()).hexdigest()[:8]
    
    def mark_failed(self, error: Exception):
        """Mark execution as failed."""
        self.end_time = datetime.now().isoformat()
        self.execution_status = ToolExecutionStatus.FAILED
        
        if self.start_time and self.end_time:
            start_dt = datetime.fromisoformat(self.start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(self.end_time.replace('Z', '+00:00'))
            self.duration_ms = int((end_dt - start_dt).total_seconds() * 1000)


class ToolErrorCategorizer:
    """Advanced error categorization system for tool execution failures."""
    
    # Error pattern mappings for automatic categorization
    ERROR_PATTERNS = {
        # Network errors
        ToolErrorCategory.CONNECTION_ERROR: [
            "connection refused", "connection reset", "connection aborted",
            "network is unreachable", "no route to host", "connection timeout"
        ],
        ToolErrorCategory.TIMEOUT_ERROR: [
            "timeout", "timed out", "time limit exceeded", "deadline exceeded"
        ],
        ToolErrorCategory.DNS_RESOLUTION: [
            "name resolution failed", "dns", "nodename nor servname provided",
            "temporary failure in name resolution"
        ],
        ToolErrorCategory.SSL_CERTIFICATE: [
            "certificate verify failed", "ssl certificate", "tls", "certificate expired"
        ],
        
        # Authentication errors
        ToolErrorCategory.AUTH_INVALID_CREDENTIALS: [
            "invalid credentials", "authentication failed", "unauthorized",
            "invalid api key", "access denied", "login failed"
        ],
        ToolErrorCategory.AUTH_TOKEN_EXPIRED: [
            "token expired", "token invalid", "session expired", "access token"
        ],
        ToolErrorCategory.AUTH_RATE_LIMITED: [
            "rate limit", "too many requests", "quota exceeded", "throttled"
        ],
        
        # API errors by HTTP status
        ToolErrorCategory.API_BAD_REQUEST: ["400", "bad request", "malformed request"],
        ToolErrorCategory.API_NOT_FOUND: ["404", "not found", "endpoint not found"],
        ToolErrorCategory.API_SERVER_ERROR: ["500", "internal server error", "server error"],
        ToolErrorCategory.API_SERVICE_UNAVAILABLE: ["503", "service unavailable", "temporarily unavailable"],
        
        # Data processing errors
        ToolErrorCategory.DATA_PARSING_ERROR: [
            "json decode", "parsing error", "invalid json", "xml parsing",
            "malformed data", "decode error"
        ],
        ToolErrorCategory.DATA_VALIDATION_ERROR: [
            "validation error", "invalid data", "schema validation", "required field"
        ],
        
        # Database errors
        ToolErrorCategory.DB_CONNECTION_FAILED: [
            "database connection", "connection to database", "db connection"
        ],
        ToolErrorCategory.DB_QUERY_TIMEOUT: [
            "query timeout", "statement timeout", "execution timeout"
        ],
        ToolErrorCategory.DB_INVALID_QUERY: [
            "sql error", "syntax error", "invalid query", "malformed query"
        ],
        
        # Snowflake specific
        ToolErrorCategory.SNOWFLAKE_WAREHOUSE_SUSPENDED: [
            "warehouse", "suspended", "snowflake warehouse"
        ],
        
        # External service specific
        ToolErrorCategory.SHODAN_RATE_LIMITED: ["shodan", "rate limit"],
        ToolErrorCategory.VIRUSTOTAL_QUOTA_EXCEEDED: ["virustotal", "quota", "limit"],
        ToolErrorCategory.ABUSEIPDB_TIMEOUT: ["abuseipdb", "timeout"],
    }
    
    @classmethod
    def categorize_error(
        cls, 
        error: Exception, 
        tool_name: str = "",
        http_status: Optional[int] = None
    ) -> ToolErrorCategory:
        """
        Categorize an error based on exception type, message, and context.
        
        Args:
            error: The exception that occurred
            tool_name: Name of the tool that failed
            http_status: HTTP status code if applicable
            
        Returns:
            Categorized error type
        """
        error_message = str(error).lower()
        error_type = type(error).__name__.lower()
        
        # First check for HTTP status codes
        if http_status:
            if http_status == 400:
                return ToolErrorCategory.API_BAD_REQUEST
            elif http_status == 401 or http_status == 403:
                return ToolErrorCategory.AUTH_INVALID_CREDENTIALS
            elif http_status == 404:
                return ToolErrorCategory.API_NOT_FOUND
            elif http_status == 429:
                return ToolErrorCategory.AUTH_RATE_LIMITED
            elif 500 <= http_status < 600:
                return ToolErrorCategory.API_SERVER_ERROR
        
        # Check for specific tool contexts
        tool_name_lower = tool_name.lower()
        if "snowflake" in tool_name_lower:
            if any(pattern in error_message for pattern in ["warehouse", "suspended"]):
                return ToolErrorCategory.SNOWFLAKE_WAREHOUSE_SUSPENDED
            elif any(pattern in error_message for pattern in ["timeout", "query"]):
                return ToolErrorCategory.DB_QUERY_TIMEOUT
            elif "connection" in error_message:
                return ToolErrorCategory.DB_CONNECTION_FAILED
        
        # Pattern matching for general categorization
        for category, patterns in cls.ERROR_PATTERNS.items():
            if any(pattern in error_message for pattern in patterns):
                return category
        
        # Exception type based categorization
        if "timeout" in error_type:
            return ToolErrorCategory.TIMEOUT_ERROR
        elif "connection" in error_type:
            return ToolErrorCategory.CONNECTION_ERROR
        elif "json" in error_type or "decode" in error_type:
            return ToolErrorCategory.DATA_PARSING_ERROR
        elif "validation" in error_type:
            return ToolErrorCategory.DATA_VALIDATION_ERROR
        
        return ToolErrorCategory.UNKNOWN_ERROR
    
    @classmethod
    def get_recovery_suggestion(cls, category: ToolErrorCategory) -> tuple[str, bool]:
        """
        Get recovery suggestion and retry recommendation.
        
        Args:
            category: Error category
            
        Returns:
            Tuple of (recovery_suggestion, is_retryable)
        """
        recovery_map = {
            ToolErrorCategory.CONNECTION_ERROR: (
                "Check network connectivity and service availability", True
            ),
            ToolErrorCategory.TIMEOUT_ERROR: (
                "Increase timeout or check service performance", True
            ),
            ToolErrorCategory.AUTH_INVALID_CREDENTIALS: (
                "Verify API credentials and permissions", False
            ),
            ToolErrorCategory.AUTH_TOKEN_EXPIRED: (
                "Refresh authentication token", True
            ),
            ToolErrorCategory.AUTH_RATE_LIMITED: (
                "Wait for rate limit reset or increase quota", True
            ),
            ToolErrorCategory.API_SERVER_ERROR: (
                "Wait for service recovery", True
            ),
            ToolErrorCategory.API_BAD_REQUEST: (
                "Check request parameters and format", False
            ),
            ToolErrorCategory.DATA_PARSING_ERROR: (
                "Verify data format and parsing logic", False
            ),
            ToolErrorCategory.DB_CONNECTION_FAILED: (
                "Check database connectivity and credentials", True
            ),
            ToolErrorCategory.DB_QUERY_TIMEOUT: (
                "Optimize query or increase timeout", True
            ),
            ToolErrorCategory.SNOWFLAKE_WAREHOUSE_SUSPENDED: (
                "Resume Snowflake warehouse", False
            ),
            ToolErrorCategory.CIRCUIT_BREAKER_OPEN: (
                "Wait for circuit breaker recovery period", True
            ),
        }
        
        return recovery_map.get(category, ("Manual investigation required", False))


def create_tool_error_details(
    error: Exception,
    tool_name: str,
    tool_args: Dict[str, Any],
    execution_duration_ms: Optional[int] = None,
    attempt_number: int = 1,
    max_retries: int = 0,
    investigation_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    http_status: Optional[int] = None
) -> ToolErrorDetails:
    """
    Create comprehensive error details from an exception.
    
    Args:
        error: The exception that occurred
        tool_name: Name of the tool that failed
        tool_args: Arguments passed to the tool
        execution_duration_ms: How long the execution took
        attempt_number: Current retry attempt
        max_retries: Maximum retry attempts
        investigation_id: Current investigation ID
        entity_type: Entity type being investigated
        entity_id: Entity ID being investigated
        http_status: HTTP status code if applicable
        
    Returns:
        Comprehensive error details
    """
    
    # Categorize the error
    category = ToolErrorCategorizer.categorize_error(error, tool_name, http_status)
    
    # Get recovery suggestion
    suggested_action, is_retryable = ToolErrorCategorizer.get_recovery_suggestion(category)
    
    # Create stack trace hash for deduplication
    stack_trace = traceback.format_exc()
    stack_trace_hash = hashlib.md5(stack_trace.encode()).hexdigest()[:8] if stack_trace else None
    
    # Sanitize error message (remove sensitive data)
    sanitized_message = _sanitize_error_message(str(error))
    
    return ToolErrorDetails(
        category=category,
        error_type=type(error).__name__,
        error_message=sanitized_message,
        error_code=str(http_status) if http_status else None,
        tool_name=tool_name,
        tool_args=_sanitize_tool_args(tool_args),
        execution_duration_ms=execution_duration_ms,
        attempt_number=attempt_number,
        max_retries=max_retries,
        stack_trace_hash=stack_trace_hash,
        is_retryable=is_retryable,
        suggested_action=suggested_action,
        recovery_strategy=category.value,
        investigation_id=investigation_id,
        entity_type=entity_type,
        entity_id=entity_id
    )


def _sanitize_error_message(message: str, max_length: int = 500) -> str:
    """Sanitize error message to remove sensitive data."""
    # Remove common sensitive patterns
    sensitive_patterns = [
        r'password["\s]*[:=]["\s]*[^"\s,}]+',
        r'token["\s]*[:=]["\s]*[^"\s,}]+', 
        r'key["\s]*[:=]["\s]*[^"\s,}]+',
        r'secret["\s]*[:=]["\s]*[^"\s,}]+'
    ]
    
    import re
    sanitized = message
    for pattern in sensitive_patterns:
        sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
    
    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length] + "..."
    
    return sanitized


def _sanitize_tool_args(args: Dict[str, Any], max_size: int = 1000) -> Dict[str, Any]:
    """Sanitize tool arguments to remove sensitive data."""
    if not args:
        return {}
    
    sanitized = {}
    sensitive_keys = ['password', 'token', 'key', 'secret', 'credential']
    
    for key, value in args.items():
        key_lower = key.lower()
        if any(sensitive_key in key_lower for sensitive_key in sensitive_keys):
            sanitized[key] = "[REDACTED]"
        else:
            # Truncate large values
            str_value = str(value)
            if len(str_value) > 200:
                sanitized[key] = str_value[:200] + "..."
            else:
                sanitized[key] = value
    
    # Check total size
    total_size = len(str(sanitized))
    if total_size > max_size:
        # Keep only essential keys if too large
        essential_keys = ['query', 'entity_id', 'entity_type', 'limit', 'timeout']
        sanitized = {k: v for k, v in sanitized.items() if k in essential_keys}
    
    return sanitized