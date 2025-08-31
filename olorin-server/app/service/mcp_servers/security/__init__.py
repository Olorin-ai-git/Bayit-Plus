"""
MCP Security Framework for Olorin Fraud Investigation Platform.

This package provides comprehensive security for MCP server communications including:
- Authentication and authorization (JWT, RBAC)
- Input validation and sanitization
- Audit logging and compliance
- Rate limiting and DDoS protection

Author: Security Specialist
Date: 2025-08-31
Phase: 3 - Security and Enterprise Integration
"""

from .mcp_auth import (
    MCPAuthenticationService,
    MCPSecurityContext,
    MCPPermission,
    MCPRole,
    MCPAuditEvent,
    MCPSecurityConfig,
    MCPAuthorizationDecorator,
    require_fraud_database_access,
    require_tool_execution,
    require_admin_access,
)

from .input_validator import (
    MCPInputValidator,
    ValidationLevel,
    InputType,
    ValidationRule,
    ValidationResult,
    create_fraud_investigation_validator,
    ValidationRateLimiter,
    fraud_validator,
    validation_rate_limiter,
)

__all__ = [
    # Authentication & Authorization
    'MCPAuthenticationService',
    'MCPSecurityContext',
    'MCPPermission',
    'MCPRole',
    'MCPAuditEvent',
    'MCPSecurityConfig',
    'MCPAuthorizationDecorator',
    'require_fraud_database_access',
    'require_tool_execution',
    'require_admin_access',
    
    # Input Validation
    'MCPInputValidator',
    'ValidationLevel',
    'InputType',
    'ValidationRule',
    'ValidationResult',
    'create_fraud_investigation_validator',
    'ValidationRateLimiter',
    'fraud_validator',
    'validation_rate_limiter',
]