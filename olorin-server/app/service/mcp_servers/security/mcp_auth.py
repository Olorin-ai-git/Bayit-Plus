"""
MCP Authentication and Authorization System for Olorin Fraud Investigation Platform.

This module provides enterprise-grade security for MCP server communications,
including JWT validation, Role-Based Access Control (RBAC) enforcement,
comprehensive audit logging, and integration with existing Olorin authentication.

Author: Security Specialist
Date: 2025-08-31
Phase: 3 - Security and Enterprise Integration
"""

import json
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, validator
from contextlib import asynccontextmanager
from app.service.logging import get_bridge_logger

# Optional dependencies - gracefully handle missing packages
try:
    from jose import JWTError, jwt
    JOSE_AVAILABLE = True
except ImportError:
    JOSE_AVAILABLE = False
    # Define dummy classes for type hints
    class JWTError(Exception):
        pass

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

try:
    from app.security.enhanced_auth import EnhancedAuthService, SecureUser, EnhancedSecurityConfig
    ENHANCED_AUTH_AVAILABLE = True
except ImportError:
    ENHANCED_AUTH_AVAILABLE = False
    # Create dummy classes for type hints
    class EnhancedAuthService:
        pass
    class SecureUser:
        pass
    class EnhancedSecurityConfig:
        pass

logger = get_bridge_logger(__name__)


class MCPPermission(str, Enum):
    """MCP-specific permissions for fine-grained access control."""
    # Server Management
    SERVER_LIST = "mcp:server:list"
    SERVER_CONNECT = "mcp:server:connect"
    SERVER_DISCONNECT = "mcp:server:disconnect"
    SERVER_STATUS = "mcp:server:status"
    
    # Tool Execution
    TOOL_EXECUTE = "mcp:tool:execute"
    TOOL_LIST = "mcp:tool:list"
    TOOL_INSPECT = "mcp:tool:inspect"
    
    # Fraud Investigation Tools
    FRAUD_QUERY_DATABASE = "mcp:fraud:database"
    FRAUD_EXTERNAL_API = "mcp:fraud:external_api"
    FRAUD_GRAPH_ANALYSIS = "mcp:fraud:graph_analysis"
    FRAUD_DOCUMENT_ANALYSIS = "mcp:fraud:document_analysis"
    FRAUD_BLOCKCHAIN_ANALYSIS = "mcp:fraud:blockchain_analysis"
    
    # Administrative
    ADMIN_AUDIT_VIEW = "mcp:admin:audit_view"
    ADMIN_CONFIG_MANAGE = "mcp:admin:config"
    ADMIN_USER_MANAGE = "mcp:admin:users"


class MCPRole(str, Enum):
    """Predefined MCP roles with associated permissions."""
    # Investigation Roles
    FRAUD_INVESTIGATOR = "fraud_investigator"
    SENIOR_INVESTIGATOR = "senior_investigator"
    INVESTIGATION_MANAGER = "investigation_manager"
    
    # Technical Roles
    MCP_ADMIN = "mcp_admin"
    SYSTEM_ADMIN = "system_admin"
    
    # Read-only
    AUDIT_VIEWER = "audit_viewer"


class MCPSecurityContext(BaseModel):
    """Security context for MCP operations."""
    user_id: str
    username: str
    roles: List[str]
    permissions: List[str]
    session_id: str
    ip_address: str
    user_agent: str
    expires_at: datetime
    server_context: Optional[str] = None
    tool_context: Optional[str] = None


class MCPAuditEvent(BaseModel):
    """Audit event for MCP operations."""
    event_id: str = Field(default_factory=lambda: secrets.token_urlsafe(16))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str
    user_id: str
    username: str
    ip_address: str
    user_agent: str
    server_name: Optional[str] = None
    tool_name: Optional[str] = None
    operation: str
    success: bool
    error_message: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_data: Optional[Dict[str, Any]] = None
    duration_ms: Optional[int] = None
    risk_score: Optional[float] = None


@dataclass
class MCPSecurityConfig:
    """Configuration for MCP security framework."""
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    token_expire_minutes: int = 15
    redis_client: Optional[Any] = None  # Use Any instead of redis.Redis for compatibility
    audit_enabled: bool = True
    max_failed_attempts: int = 5
    lockout_duration_minutes: int = 30
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60


class MCPAuthenticationService:
    """Enhanced authentication service specifically for MCP operations."""
    
    # Role-Permission Mapping
    ROLE_PERMISSIONS = {
        MCPRole.FRAUD_INVESTIGATOR: [
            MCPPermission.SERVER_LIST,
            MCPPermission.SERVER_STATUS,
            MCPPermission.TOOL_LIST,
            MCPPermission.TOOL_EXECUTE,
            MCPPermission.FRAUD_QUERY_DATABASE,
            MCPPermission.FRAUD_EXTERNAL_API,
        ],
        MCPRole.SENIOR_INVESTIGATOR: [
            MCPPermission.SERVER_LIST,
            MCPPermission.SERVER_STATUS,
            MCPPermission.SERVER_CONNECT,
            MCPPermission.TOOL_LIST,
            MCPPermission.TOOL_EXECUTE,
            MCPPermission.TOOL_INSPECT,
            MCPPermission.FRAUD_QUERY_DATABASE,
            MCPPermission.FRAUD_EXTERNAL_API,
            MCPPermission.FRAUD_GRAPH_ANALYSIS,
            MCPPermission.FRAUD_DOCUMENT_ANALYSIS,
        ],
        MCPRole.INVESTIGATION_MANAGER: [
            # All senior investigator permissions plus management
            MCPPermission.SERVER_LIST,
            MCPPermission.SERVER_STATUS,
            MCPPermission.SERVER_CONNECT,
            MCPPermission.TOOL_LIST,
            MCPPermission.TOOL_EXECUTE,
            MCPPermission.TOOL_INSPECT,
            MCPPermission.FRAUD_QUERY_DATABASE,
            MCPPermission.FRAUD_EXTERNAL_API,
            MCPPermission.FRAUD_GRAPH_ANALYSIS,
            MCPPermission.FRAUD_DOCUMENT_ANALYSIS,
            MCPPermission.FRAUD_BLOCKCHAIN_ANALYSIS,
            MCPPermission.ADMIN_AUDIT_VIEW,
        ],
        MCPRole.MCP_ADMIN: [
            # All MCP permissions
            *[perm for perm in MCPPermission],
        ],
        MCPRole.SYSTEM_ADMIN: [
            # All permissions
            *[perm for perm in MCPPermission],
        ],
        MCPRole.AUDIT_VIEWER: [
            MCPPermission.SERVER_LIST,
            MCPPermission.SERVER_STATUS,
            MCPPermission.ADMIN_AUDIT_VIEW,
        ],
    }
    
    def __init__(self, config: MCPSecurityConfig, base_auth_service: EnhancedAuthService):
        self.config = config
        self.base_auth = base_auth_service
        self.failed_attempts: Dict[str, int] = {}
        self.lockout_until: Dict[str, datetime] = {}
        
    async def validate_mcp_token(
        self,
        token: str,
        ip_address: str,
        user_agent: str,
        required_permissions: List[MCPPermission] = None,
        server_context: str = None,
        tool_context: str = None
    ) -> Tuple[Optional[MCPSecurityContext], str]:
        """Validate MCP token and create security context."""
        try:
            # Check rate limiting first
            if not await self._check_rate_limit(ip_address):
                await self._audit_event(
                    event_type="RATE_LIMIT_EXCEEDED",
                    user_id="unknown",
                    username="unknown",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    operation="token_validation",
                    success=False,
                    error_message="Rate limit exceeded"
                )
                return None, "Rate limit exceeded"
                
            # Check if IP is locked out
            if self._is_ip_locked_out(ip_address):
                return None, "IP address temporarily locked due to suspicious activity"
            
            # Validate base JWT token using existing service
            user, validation_result = await self.base_auth.validate_token(
                token=token,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            if not user:
                await self._handle_failed_attempt(ip_address)
                return None, validation_result
                
            # Create MCP security context
            mcp_context = await self._create_security_context(
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                server_context=server_context,
                tool_context=tool_context
            )
            
            # Check required permissions
            if required_permissions:
                missing_permissions = self._check_permissions(mcp_context, required_permissions)
                if missing_permissions:
                    await self._audit_event(
                        event_type="PERMISSION_DENIED",
                        user_id=user.username,
                        username=user.username,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        operation="permission_check",
                        success=False,
                        error_message=f"Missing permissions: {missing_permissions}",
                        request_data={"required": [p.value for p in required_permissions]}
                    )
                    return None, f"Insufficient permissions: {missing_permissions}"
            
            # Reset failed attempts on successful validation
            if ip_address in self.failed_attempts:
                del self.failed_attempts[ip_address]
                if ip_address in self.lockout_until:
                    del self.lockout_until[ip_address]
                    
            await self._audit_event(
                event_type="TOKEN_VALIDATED",
                user_id=user.username,
                username=user.username,
                ip_address=ip_address,
                user_agent=user_agent,
                operation="token_validation",
                success=True,
                server_name=server_context,
                tool_name=tool_context
            )
            
            return mcp_context, "success"
            
        except JWTError as e:
            await self._handle_failed_attempt(ip_address)
            return None, f"JWT validation error: {str(e)}"
        except Exception as e:
            logger.error(f"MCP token validation error: {e}")
            await self._handle_failed_attempt(ip_address)
            return None, "Token validation failed"
    
    async def _create_security_context(
        self,
        user: SecureUser,
        ip_address: str,
        user_agent: str,
        server_context: str = None,
        tool_context: str = None
    ) -> MCPSecurityContext:
        """Create MCP security context from validated user."""
        # Get user permissions based on roles
        permissions = []
        for role in user.scopes:  # scopes contain roles in the base system
            if role in self.ROLE_PERMISSIONS:
                permissions.extend([perm.value for perm in self.ROLE_PERMISSIONS[role]])
        
        # Remove duplicates
        permissions = list(set(permissions))
        
        return MCPSecurityContext(
            user_id=user.username,
            username=user.username,
            roles=user.scopes,
            permissions=permissions,
            session_id=secrets.token_urlsafe(16),  # Generate new session for MCP
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.utcnow() + timedelta(minutes=self.config.token_expire_minutes),
            server_context=server_context,
            tool_context=tool_context
        )
    
    def _check_permissions(
        self,
        context: MCPSecurityContext,
        required_permissions: List[MCPPermission]
    ) -> List[str]:
        """Check if context has required permissions."""
        missing = []
        for perm in required_permissions:
            if perm.value not in context.permissions:
                missing.append(perm.value)
        return missing
    
    async def _check_rate_limit(self, ip_address: str) -> bool:
        """Check if IP address is within rate limits."""
        if not self.config.redis_client:
            return True  # Skip if no Redis
            
        try:
            key = f"mcp_rate_limit:{ip_address}"
            current_count = await self.config.redis_client.get(key)
            
            if current_count is None:
                await self.config.redis_client.setex(key, self.config.rate_limit_window_seconds, 1)
                return True
            
            if int(current_count) >= self.config.rate_limit_requests:
                return False
                
            await self.config.redis_client.incr(key)
            return True
            
        except Exception as e:
            logger.warning(f"Rate limit check failed: {e}")
            return True  # Allow on Redis errors
    
    def _is_ip_locked_out(self, ip_address: str) -> bool:
        """Check if IP is currently locked out."""
        if ip_address in self.lockout_until:
            if datetime.utcnow() < self.lockout_until[ip_address]:
                return True
            else:
                # Lockout expired
                del self.lockout_until[ip_address]
                if ip_address in self.failed_attempts:
                    del self.failed_attempts[ip_address]
        return False
    
    async def _handle_failed_attempt(self, ip_address: str):
        """Handle failed authentication attempt."""
        self.failed_attempts[ip_address] = self.failed_attempts.get(ip_address, 0) + 1
        
        if self.failed_attempts[ip_address] >= self.config.max_failed_attempts:
            self.lockout_until[ip_address] = datetime.utcnow() + timedelta(
                minutes=self.config.lockout_duration_minutes
            )
            logger.warning(f"IP {ip_address} locked out after {self.failed_attempts[ip_address]} failed attempts")
    
    async def _audit_event(
        self,
        event_type: str,
        user_id: str,
        username: str,
        ip_address: str,
        user_agent: str,
        operation: str,
        success: bool,
        error_message: str = None,
        server_name: str = None,
        tool_name: str = None,
        request_data: Dict[str, Any] = None,
        response_data: Dict[str, Any] = None,
        duration_ms: int = None,
        risk_score: float = None
    ):
        """Log security audit event."""
        if not self.config.audit_enabled:
            return
            
        event = MCPAuditEvent(
            event_type=event_type,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            user_agent=user_agent,
            server_name=server_name,
            tool_name=tool_name,
            operation=operation,
            success=success,
            error_message=error_message,
            request_data=request_data,
            response_data=response_data,
            duration_ms=duration_ms,
            risk_score=risk_score
        )
        
        # Log to standard logger
        try:
            event_json = event.model_dump_json()
        except AttributeError:
            # Fallback for older Pydantic versions
            event_json = event.json()
            
        logger.info(f"MCP_AUDIT: {event_json}")
        
        # Store in Redis for audit trail if available
        if self.config.redis_client:
            try:
                audit_key = f"mcp_audit:{event.timestamp.isoformat()}:{event.event_id}"
                await self.config.redis_client.setex(
                    audit_key,
                    86400 * 30,  # 30 days retention
                    event_json
                )
            except Exception as e:
                logger.warning(f"Failed to store audit event in Redis: {e}")
    
    async def get_audit_events(
        self,
        user_id: str = None,
        event_type: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        limit: int = 100
    ) -> List[MCPAuditEvent]:
        """Retrieve audit events with filtering."""
        if not self.config.redis_client:
            return []
            
        try:
            # This is a simplified implementation - in production you'd want
            # a proper database with indexing for efficient queries
            pattern = "mcp_audit:*"
            keys = await self.config.redis_client.keys(pattern)
            
            events = []
            for key in keys[:limit]:  # Limit for performance
                event_data = await self.config.redis_client.get(key)
                if event_data:
                    try:
                        event = MCPAuditEvent.model_validate_json(event_data)
                    except AttributeError:
                        # Fallback for older Pydantic versions
                        event = MCPAuditEvent.parse_raw(event_data)
                    
                    # Apply filters
                    if user_id and event.user_id != user_id:
                        continue
                    if event_type and event.event_type != event_type:
                        continue
                    if start_time and event.timestamp < start_time:
                        continue
                    if end_time and event.timestamp > end_time:
                        continue
                        
                    events.append(event)
            
            # Sort by timestamp descending
            events.sort(key=lambda x: x.timestamp, reverse=True)
            return events[:limit]
            
        except Exception as e:
            logger.error(f"Failed to retrieve audit events: {e}")
            return []
    
    async def audit_tool_execution(
        self,
        context: MCPSecurityContext,
        server_name: str,
        tool_name: str,
        operation: str,
        success: bool,
        request_data: Dict[str, Any] = None,
        response_data: Dict[str, Any] = None,
        duration_ms: int = None,
        error_message: str = None
    ):
        """Audit tool execution with security context."""
        # Calculate risk score based on tool and operation
        risk_score = self._calculate_risk_score(server_name, tool_name, operation, success)
        
        await self._audit_event(
            event_type="TOOL_EXECUTION",
            user_id=context.user_id,
            username=context.username,
            ip_address=context.ip_address,
            user_agent=context.user_agent,
            server_name=server_name,
            tool_name=tool_name,
            operation=operation,
            success=success,
            error_message=error_message,
            request_data=request_data,
            response_data=response_data,
            duration_ms=duration_ms,
            risk_score=risk_score
        )
        
        # Alert on high-risk operations
        if risk_score and risk_score > 0.8:
            logger.warning(f"High-risk MCP operation detected: {tool_name} by {context.username} (risk: {risk_score})")
    
    def _calculate_risk_score(self, server_name: str, tool_name: str, operation: str, success: bool) -> float:
        """Calculate risk score for tool execution."""
        risk_score = 0.1  # Base risk
        
        # High-risk tools
        high_risk_tools = [
            "fraud_database_query",
            "blockchain_analysis",
            "external_api_call",
            "document_analysis"
        ]
        
        if tool_name in high_risk_tools:
            risk_score += 0.3
        
        # High-risk operations
        high_risk_ops = [
            "bulk_query",
            "sensitive_data_access",
            "external_api_call",
            "administrative_action"
        ]
        
        if operation in high_risk_ops:
            risk_score += 0.2
        
        # Failed operations are higher risk
        if not success:
            risk_score += 0.3
        
        return min(risk_score, 1.0)


class MCPAuthorizationDecorator:
    """Decorator for MCP tool authorization."""
    
    def __init__(self, required_permissions: List[MCPPermission]):
        self.required_permissions = required_permissions
    
    def __call__(self, func):
        async def wrapper(*args, **kwargs):
            # Extract security context from kwargs
            context = kwargs.get('security_context')
            if not context or not isinstance(context, MCPSecurityContext):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing or invalid security context"
                )
            
            # Check permissions
            missing = []
            for perm in self.required_permissions:
                if perm.value not in context.permissions:
                    missing.append(perm.value)
            
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: {missing}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper


# Convenience decorators for common permission requirements
def require_fraud_database_access(func):
    """Require fraud database access permission."""
    return MCPAuthorizationDecorator([MCPPermission.FRAUD_QUERY_DATABASE])(func)


def require_tool_execution(func):
    """Require general tool execution permission."""
    return MCPAuthorizationDecorator([MCPPermission.TOOL_EXECUTE])(func)


def require_admin_access(func):
    """Require administrative access."""
    return MCPAuthorizationDecorator([MCPPermission.ADMIN_CONFIG_MANAGE])(func)