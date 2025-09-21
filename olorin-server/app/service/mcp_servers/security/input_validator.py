"""
MCP Input Validation Framework for Olorin Fraud Investigation Platform.

This module provides comprehensive input validation and sanitization for MCP server
communications, including command injection prevention, data validation, schema
validation, rate limiting, and DDoS protection.

Author: Security Specialist
Date: 2025-08-31
Phase: 3 - Security and Enterprise Integration
"""

import re
import json
import html
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
import ipaddress
from urllib.parse import urlparse

from pydantic import BaseModel, Field, validator, ValidationError
from fastapi import HTTPException, status
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Optional dependencies - gracefully handle missing packages
try:
    import bleach
    BLEACH_AVAILABLE = True
except ImportError:
    BLEACH_AVAILABLE = False
    logger.warning("bleach not available - HTML sanitization will be limited")

try:
    from sqlparse import parse as sql_parse, tokens as sql_tokens
    SQLPARSE_AVAILABLE = True
except ImportError:
    SQLPARSE_AVAILABLE = False
    logger.warning("sqlparse not available - SQL validation will be limited")


class ValidationLevel(str, Enum):
    """Validation strictness levels."""
    PERMISSIVE = "permissive"    # Basic validation only
    STANDARD = "standard"        # Standard security validation
    STRICT = "strict"           # Maximum security validation
    PARANOID = "paranoid"       # Ultra-strict validation


class InputType(str, Enum):
    """Types of input data for validation."""
    # Basic types
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    
    # Structured types
    JSON = "json"
    XML = "xml"
    CSV = "csv"
    
    # Security-sensitive types
    SQL_QUERY = "sql_query"
    FILE_PATH = "file_path"
    URL = "url"
    EMAIL = "email"
    IP = "ip"
    
    # MCP-specific types
    TOOL_NAME = "tool_name"
    SERVER_NAME = "server_name"
    USER_ID = "user_id"
    TRANSACTION_ID = "transaction_id"
    DEVICE_ID = "device_id"


@dataclass
class ValidationRule:
    """Single validation rule definition."""
    name: str
    description: str
    validator_func: Callable[[Any], bool]
    error_message: str
    severity: str = "error"  # "error", "warning", "info"
    

@dataclass
class ValidationResult:
    """Result of input validation."""
    is_valid: bool
    sanitized_value: Any = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    risk_score: float = 0.0
    validation_metadata: Dict[str, Any] = field(default_factory=dict)


class MCPInputValidator:
    """Comprehensive input validator for MCP communications."""
    
    # Dangerous patterns for injection detection
    COMMAND_INJECTION_PATTERNS = [
        r'[;&|`$()]',           # Shell metacharacters
        r'\.\./',               # Directory traversal
        r'\beval\b',            # Code evaluation
        r'\bexec\b',            # Code execution
        r'\bsystem\b',          # System calls
        r'\bpasswd\b',          # System files
        r'\b\/etc\/\b',         # System directories
        r'\bchmod\b',           # File permissions
        r'\brm\s+-rf\b',        # Dangerous commands
    ]
    
    SQL_INJECTION_PATTERNS = [
        r'(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)',
        r'(--|\#|\/\*|\*\/)',   # SQL comments
        r'(\bOR\s+1\s*=\s*1\b|\bAND\s+1\s*=\s*1\b)',  # Common injections
        r"('\s*(OR|AND)\s*')",  # Quote-based injections
        r'(\bxp_cmdshell\b|\bsp_executesql\b)',  # Database-specific
    ]
    
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'on\w+\s*=',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>.*?</embed>',
    ]
    
    # Allowed characters by input type
    ALLOWED_CHARS = {
        InputType.USER_ID: r'^[a-zA-Z0-9._@-]+$',
        InputType.TRANSACTION_ID: r'^[a-zA-Z0-9-]+$',
        InputType.DEVICE_ID: r'^[a-zA-Z0-9._-]+$',
        InputType.TOOL_NAME: r'^[a-zA-Z0-9_-]+$',
        InputType.SERVER_NAME: r'^[a-zA-Z0-9._-]+$',
    }
    
    # Size limits by input type
    SIZE_LIMITS = {
        InputType.STRING: 10000,
        InputType.USER_ID: 200,
        InputType.TRANSACTION_ID: 100,
        InputType.DEVICE_ID: 200,
        InputType.TOOL_NAME: 100,
        InputType.SERVER_NAME: 100,
        InputType.SQL_QUERY: 50000,
        InputType.JSON: 100000,
        InputType.FILE_PATH: 500,
        InputType.URL: 2000,
        InputType.EMAIL: 320,
    }
    
    def __init__(self, validation_level: ValidationLevel = ValidationLevel.STANDARD):
        self.validation_level = validation_level
        self.custom_rules: Dict[str, List[ValidationRule]] = {}
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for performance."""
        self.command_injection_regex = [
            re.compile(pattern, re.IGNORECASE | re.MULTILINE) 
            for pattern in self.COMMAND_INJECTION_PATTERNS
        ]
        
        self.sql_injection_regex = [
            re.compile(pattern, re.IGNORECASE | re.MULTILINE)
            for pattern in self.SQL_INJECTION_PATTERNS
        ]
        
        self.xss_regex = [
            re.compile(pattern, re.IGNORECASE | re.DOTALL)
            for pattern in self.XSS_PATTERNS
        ]
    
    def validate(
        self,
        value: Any,
        input_type: InputType,
        field_name: str = "input",
        additional_rules: List[ValidationRule] = None
    ) -> ValidationResult:
        """Main validation method."""
        try:
            result = ValidationResult(is_valid=True, sanitized_value=value)
            
            # Skip validation for None values
            if value is None:
                return result
            
            # Type-specific validation
            result = self._validate_by_type(value, input_type, field_name, result)
            
            if not result.is_valid:
                return result
            
            # Security validation
            result = self._security_validation(result.sanitized_value, input_type, result)
            
            if not result.is_valid:
                return result
            
            # Size validation
            result = self._size_validation(result.sanitized_value, input_type, result)
            
            if not result.is_valid:
                return result
            
            # Custom rules validation
            if additional_rules:
                result = self._apply_custom_rules(result.sanitized_value, additional_rules, result)
            
            # Calculate risk score
            result.risk_score = self._calculate_risk_score(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Validation error for {field_name}: {e}")
            return ValidationResult(
                is_valid=False,
                errors=[f"Validation failed: {str(e)}"],
                risk_score=1.0
            )
    
    def _validate_by_type(
        self,
        value: Any,
        input_type: InputType,
        field_name: str,
        result: ValidationResult
    ) -> ValidationResult:
        """Type-specific validation."""
        
        if input_type == InputType.STRING:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
            result.sanitized_value = self._sanitize_string(value)
            
        elif input_type == InputType.INTEGER:
            try:
                result.sanitized_value = int(value)
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(f"{field_name} must be an integer")
                return result
        
        elif input_type == InputType.FLOAT:
            try:
                result.sanitized_value = float(value)
            except (ValueError, TypeError):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a number")
                return result
        
        elif input_type == InputType.BOOLEAN:
            if isinstance(value, bool):
                result.sanitized_value = value
            elif isinstance(value, str):
                if value.lower() in ['true', '1', 'yes', 'on']:
                    result.sanitized_value = True
                elif value.lower() in ['false', '0', 'no', 'off']:
                    result.sanitized_value = False
                else:
                    result.is_valid = False
                    result.errors.append(f"{field_name} must be a boolean value")
                    return result
            else:
                result.is_valid = False
                result.errors.append(f"{field_name} must be a boolean")
                return result
        
        elif input_type == InputType.JSON:
            if isinstance(value, str):
                try:
                    result.sanitized_value = json.loads(value)
                except json.JSONDecodeError as e:
                    result.is_valid = False
                    result.errors.append(f"{field_name} contains invalid JSON: {str(e)}")
                    return result
            elif isinstance(value, (dict, list)):
                result.sanitized_value = value
            else:
                result.is_valid = False
                result.errors.append(f"{field_name} must be valid JSON")
                return result
        
        elif input_type == InputType.EMAIL:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
                
            # Balanced email validation - strict but not overly restrictive
            email_regex = re.compile(
                r'^[a-zA-Z0-9]([a-zA-Z0-9._+%-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$'
            )
            
            # Additional checks for specific invalid patterns
            invalid_patterns = [
                r'\.\.+',      # Double dots (but allow single dots)
                r'@\.|\.$@',   # @ followed by dot or ending with .@
            ]
            
            # Basic structure check
            if '@' not in value or value.count('@') != 1:
                result.is_valid = False
                result.errors.append(f"{field_name} is not a valid email address")
                return result
                
            local, domain = value.split('@', 1)
            
            # Check for obvious invalid patterns
            if (not local or not domain or 
                '..' in value or 
                local.startswith('.') or local.endswith('.') or
                domain.startswith('.') or domain.endswith('.') or
                not '.' in domain):
                result.is_valid = False
                result.errors.append(f"{field_name} is not a valid email address")
                return result
            
            result.sanitized_value = value.lower().strip()
        
        elif input_type == InputType.URL:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
            
            try:
                parsed = urlparse(value)
                if not all([parsed.scheme, parsed.netloc]):
                    raise ValueError("Invalid URL")
                
                # Security check for allowed schemes
                allowed_schemes = ['http', 'https']
                if parsed.scheme.lower() not in allowed_schemes:
                    result.is_valid = False
                    result.errors.append(f"{field_name} must use http or https scheme")
                    return result
                
                result.sanitized_value = value
                
            except Exception:
                result.is_valid = False
                result.errors.append(f"{field_name} is not a valid URL")
                return result
        
        elif input_type == InputType.IP:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
            
            try:
                ip = ipaddress.ip_address(value.strip())
                result.sanitized_value = str(ip)
                
                # Security check for private/localhost addresses
                if self.validation_level in [ValidationLevel.STRICT, ValidationLevel.PARANOID]:
                    if ip.is_private or ip.is_loopback:
                        result.warnings.append(f"{field_name} is a private/localhost address")
                        
            except ValueError:
                result.is_valid = False
                result.errors.append(f"{field_name} is not a valid IP address")
                return result
        
        elif input_type == InputType.SQL_QUERY:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
            
            # Parse SQL to validate syntax (if sqlparse available)
            if SQLPARSE_AVAILABLE:
                try:
                    parsed = sql_parse(value)
                    if not parsed:
                        result.is_valid = False
                        result.errors.append(f"{field_name} contains invalid SQL")
                        return result
                    
                    result.sanitized_value = value.strip()
                    
                except Exception as e:
                    result.is_valid = False
                    result.errors.append(f"{field_name} SQL parsing error: {str(e)}")
                    return result
            else:
                # Basic validation without sqlparse
                result.sanitized_value = value.strip()
                if not value.strip():
                    result.is_valid = False
                    result.errors.append(f"{field_name} cannot be empty")
                    return result
        
        elif input_type == InputType.FILE_PATH:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
            
            # Security validation for path traversal
            if '..' in value or value.startswith('/'):
                result.is_valid = False
                result.errors.append(f"{field_name} contains invalid path characters")
                return result
            
            result.sanitized_value = value.strip()
        
        # MCP-specific type validations
        elif input_type in [InputType.USER_ID, InputType.TRANSACTION_ID, InputType.DEVICE_ID, 
                           InputType.TOOL_NAME, InputType.SERVER_NAME]:
            if not isinstance(value, str):
                result.is_valid = False
                result.errors.append(f"{field_name} must be a string")
                return result
            
            allowed_pattern = self.ALLOWED_CHARS.get(input_type)
            if allowed_pattern and not re.match(allowed_pattern, value):
                result.is_valid = False
                result.errors.append(f"{field_name} contains invalid characters")
                return result
            
            result.sanitized_value = value.strip()
        
        return result
    
    def _security_validation(
        self,
        value: Any,
        input_type: InputType,
        result: ValidationResult
    ) -> ValidationResult:
        """Security-focused validation."""
        
        if not isinstance(value, str):
            return result  # Only validate strings for security patterns
        
        # Command injection detection
        for pattern in self.command_injection_regex:
            if pattern.search(value):
                result.is_valid = False
                result.errors.append("Input contains potentially dangerous command characters")
                result.risk_score = max(result.risk_score, 0.9)
                return result
        
        # SQL injection detection
        if input_type != InputType.SQL_QUERY:  # Skip for legitimate SQL queries
            for pattern in self.sql_injection_regex:
                if pattern.search(value):
                    result.is_valid = False
                    result.errors.append("Input contains potential SQL injection patterns")
                    result.risk_score = max(result.risk_score, 0.8)
                    return result
        
        # XSS detection
        for pattern in self.xss_regex:
            if pattern.search(value):
                result.is_valid = False
                result.errors.append("Input contains potential XSS patterns")
                result.risk_score = max(result.risk_score, 0.7)
                return result
        
        # Null byte injection
        if '\x00' in value:
            result.is_valid = False
            result.errors.append("Input contains null bytes")
            result.risk_score = max(result.risk_score, 0.8)
            return result
        
        # Unicode validation for strict levels
        if self.validation_level in [ValidationLevel.STRICT, ValidationLevel.PARANOID]:
            try:
                value.encode('ascii')
            except UnicodeEncodeError:
                if self.validation_level == ValidationLevel.PARANOID:
                    result.is_valid = False
                    result.errors.append("Input contains non-ASCII characters")
                    return result
                else:
                    result.warnings.append("Input contains non-ASCII characters")
        
        return result
    
    def _size_validation(
        self,
        value: Any,
        input_type: InputType,
        result: ValidationResult
    ) -> ValidationResult:
        """Size and length validation."""
        
        max_size = self.SIZE_LIMITS.get(input_type, 10000)
        
        if isinstance(value, str):
            if len(value) > max_size:
                result.is_valid = False
                result.errors.append(f"Input too long (max {max_size} characters)")
                return result
        
        elif isinstance(value, (list, dict)):
            serialized = json.dumps(value)
            if len(serialized) > max_size:
                result.is_valid = False
                result.errors.append(f"Input too large (max {max_size} bytes)")
                return result
        
        return result
    
    def _apply_custom_rules(
        self,
        value: Any,
        rules: List[ValidationRule],
        result: ValidationResult
    ) -> ValidationResult:
        """Apply custom validation rules."""
        
        for rule in rules:
            try:
                if not rule.validator_func(value):
                    if rule.severity == "error":
                        result.is_valid = False
                        result.errors.append(rule.error_message)
                    elif rule.severity == "warning":
                        result.warnings.append(rule.error_message)
                    
                    # Increase risk score for failed rules
                    if rule.severity == "error":
                        result.risk_score = max(result.risk_score, 0.5)
                    
            except Exception as e:
                logger.warning(f"Custom validation rule '{rule.name}' failed: {e}")
                result.warnings.append(f"Custom validation rule failed: {rule.name}")
        
        return result
    
    def _sanitize_string(self, value: str) -> str:
        """Sanitize string input."""
        
        # HTML entity encoding
        sanitized = html.escape(value)
        
        # Additional sanitization with bleach if available
        if BLEACH_AVAILABLE and self.validation_level in [ValidationLevel.STRICT, ValidationLevel.PARANOID]:
            # Use bleach for more thorough sanitization
            sanitized = bleach.clean(sanitized, tags=[], attributes={}, strip=True)
        
        # Remove dangerous characters based on validation level
        if self.validation_level == ValidationLevel.PARANOID:
            # Very restrictive
            sanitized = re.sub(r'[^\w\s@.-]', '', sanitized)
        elif self.validation_level == ValidationLevel.STRICT:
            # Remove most special characters
            sanitized = re.sub(r'[<>"\']', '', sanitized)
        
        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        return sanitized
    
    def _calculate_risk_score(self, result: ValidationResult) -> float:
        """Calculate risk score based on validation results."""
        
        base_risk = 0.1
        
        # Errors increase risk significantly
        if result.errors:
            base_risk += len(result.errors) * 0.3
        
        # Warnings increase risk slightly
        if result.warnings:
            base_risk += len(result.warnings) * 0.1
        
        return min(base_risk, 1.0)
    
    def validate_mcp_tool_input(
        self,
        tool_name: str,
        inputs: Dict[str, Any],
        schema: Optional[Dict[str, Any]] = None
    ) -> Dict[str, ValidationResult]:
        """Validate MCP tool inputs comprehensively."""
        
        results = {}
        
        # Validate tool name first
        results['tool_name'] = self.validate(tool_name, InputType.TOOL_NAME, 'tool_name')
        
        if not results['tool_name'].is_valid:
            return results
        
        # Validate each input parameter
        for field_name, value in inputs.items():
            # Determine input type based on field name or schema
            input_type = self._determine_input_type(field_name, value, schema)
            
            # Get custom rules for this field
            custom_rules = self.custom_rules.get(f"{tool_name}.{field_name}", [])
            
            # Validate the input
            results[field_name] = self.validate(
                value=value,
                input_type=input_type,
                field_name=field_name,
                additional_rules=custom_rules
            )
        
        return results
    
    def _determine_input_type(
        self,
        field_name: str,
        value: Any,
        schema: Optional[Dict[str, Any]] = None
    ) -> InputType:
        """Determine input type based on field name, value, and schema."""
        
        # Check schema first if provided
        if schema and field_name in schema:
            schema_type = schema[field_name].get('type', 'string')
            type_mapping = {
                'string': InputType.STRING,
                'integer': InputType.INTEGER,
                'number': InputType.FLOAT,
                'boolean': InputType.BOOLEAN,
                'object': InputType.JSON,
                'array': InputType.JSON,
            }
            if schema_type in type_mapping:
                return type_mapping[schema_type]
        
        # Infer from field name patterns
        field_name_lower = field_name.lower()
        
        if 'user_id' in field_name_lower or 'userid' in field_name_lower:
            return InputType.USER_ID
        elif 'transaction_id' in field_name_lower or 'transactionid' in field_name_lower:
            return InputType.TRANSACTION_ID
        elif 'device_id' in field_name_lower or 'deviceid' in field_name_lower:
            return InputType.DEVICE_ID
        elif 'email' in field_name_lower:
            return InputType.EMAIL
        elif 'url' in field_name_lower or 'link' in field_name_lower:
            return InputType.URL
        elif 'ip' in field_name_lower or 'address' in field_name_lower:
            return InputType.IP
        elif 'query' in field_name_lower and 'sql' in field_name_lower:
            return InputType.SQL_QUERY
        elif 'path' in field_name_lower or 'file' in field_name_lower:
            return InputType.FILE_PATH
        
        # Infer from value type
        if isinstance(value, bool):
            return InputType.BOOLEAN
        elif isinstance(value, int):
            return InputType.INTEGER
        elif isinstance(value, float):
            return InputType.FLOAT
        elif isinstance(value, (dict, list)):
            return InputType.JSON
        
        # Default to string
        return InputType.STRING
    
    def add_custom_rule(self, tool_field: str, rule: ValidationRule):
        """Add custom validation rule for specific tool field."""
        if tool_field not in self.custom_rules:
            self.custom_rules[tool_field] = []
        self.custom_rules[tool_field].append(rule)
    
    def create_validation_summary(
        self, 
        results: Dict[str, ValidationResult]
    ) -> Dict[str, Any]:
        """Create validation summary for logging and monitoring."""
        
        total_fields = len(results)
        valid_fields = sum(1 for r in results.values() if r.is_valid)
        total_errors = sum(len(r.errors) for r in results.values())
        total_warnings = sum(len(r.warnings) for r in results.values())
        max_risk_score = max((r.risk_score for r in results.values()), default=0.0)
        
        return {
            'total_fields': total_fields,
            'valid_fields': valid_fields,
            'invalid_fields': total_fields - valid_fields,
            'total_errors': total_errors,
            'total_warnings': total_warnings,
            'max_risk_score': max_risk_score,
            'overall_valid': valid_fields == total_fields,
            'validation_timestamp': datetime.utcnow().isoformat(),
        }


# Pre-configured validators for common use cases
def create_fraud_investigation_validator() -> MCPInputValidator:
    """Create validator configured for fraud investigation tools."""
    
    validator = MCPInputValidator(ValidationLevel.STRICT)
    
    # Add fraud-specific custom rules
    def validate_transaction_amount(value):
        """Validate transaction amount is reasonable."""
        if isinstance(value, (int, float)):
            return 0 <= value <= 10000000  # $10M max
        return True
    
    def validate_risk_score(value):
        """Validate risk score is between 0 and 1."""
        if isinstance(value, (int, float)):
            return 0 <= value <= 1
        return True
    
    def validate_confidence_threshold(value):
        """Validate confidence threshold."""
        if isinstance(value, (int, float)):
            return 0 <= value <= 1
        return True
    
    # Register custom rules
    validator.add_custom_rule(
        "fraud_database_query.amount",
        ValidationRule(
            name="transaction_amount",
            description="Validate transaction amount range",
            validator_func=validate_transaction_amount,
            error_message="Transaction amount must be between $0 and $10,000,000"
        )
    )
    
    validator.add_custom_rule(
        "risk_assessment.risk_score",
        ValidationRule(
            name="risk_score",
            description="Validate risk score range",
            validator_func=validate_risk_score,
            error_message="Risk score must be between 0 and 1"
        )
    )
    
    validator.add_custom_rule(
        "fraud_pattern_matching.confidence_threshold",
        ValidationRule(
            name="confidence_threshold",
            description="Validate confidence threshold",
            validator_func=validate_confidence_threshold,
            error_message="Confidence threshold must be between 0 and 1"
        )
    )
    
    return validator


# Rate limiting for input validation
class ValidationRateLimiter:
    """Rate limiter for validation requests to prevent abuse."""
    
    def __init__(self, requests_per_minute: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.request_counts: Dict[str, List[datetime]] = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if validation request is allowed."""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        # Clean old requests
        if identifier in self.request_counts:
            self.request_counts[identifier] = [
                req_time for req_time in self.request_counts[identifier]
                if req_time > minute_ago
            ]
        else:
            self.request_counts[identifier] = []
        
        # Check limit
        if len(self.request_counts[identifier]) >= self.requests_per_minute:
            return False
        
        # Add current request
        self.request_counts[identifier].append(now)
        return True


# Global validator instances
fraud_validator = create_fraud_investigation_validator()
validation_rate_limiter = ValidationRateLimiter()