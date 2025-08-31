"""
Unit tests for MCP Authentication and Authorization System.

Author: Security Specialist
Date: 2025-08-31
"""

import pytest
import secrets
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
import redis

from app.service.mcp_servers.security.mcp_auth import (
    MCPAuthenticationService,
    MCPSecurityContext,
    MCPPermission,
    MCPRole,
    MCPAuditEvent,
    MCPSecurityConfig,
    MCPAuthorizationDecorator,
)

# Mock the enhanced auth classes for testing
class MockSecureUser:
    def __init__(self, username, email=None, full_name=None, disabled=False, 
                 scopes=None, last_login=None, failed_login_attempts=0,
                 account_locked_until=None, password_changed_at=None):
        self.username = username
        self.email = email
        self.full_name = full_name
        self.disabled = disabled
        self.scopes = scopes or []
        self.last_login = last_login
        self.failed_login_attempts = failed_login_attempts
        self.account_locked_until = account_locked_until
        self.password_changed_at = password_changed_at

class MockEnhancedAuthService:
    def __init__(self):
        pass
        
    async def validate_token(self, token, ip_address, user_agent):
        # Mock implementation for testing
        return None, "Mock validation"

# Use mock classes
SecureUser = MockSecureUser
EnhancedAuthService = MockEnhancedAuthService


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    redis_mock = Mock(spec=redis.Redis)
    redis_mock.get = AsyncMock(return_value=None)
    redis_mock.setex = AsyncMock()
    redis_mock.incr = AsyncMock()
    redis_mock.keys = AsyncMock(return_value=[])
    return redis_mock


@pytest.fixture
def security_config(mock_redis):
    """Security configuration for testing."""
    return MCPSecurityConfig(
        jwt_secret_key="test_secret_key_that_is_long_enough",
        jwt_algorithm="HS256",
        token_expire_minutes=15,
        redis_client=mock_redis,
        audit_enabled=True,
        max_failed_attempts=3,
        lockout_duration_minutes=10,
        rate_limit_requests=10,
        rate_limit_window_seconds=60
    )


@pytest.fixture
def mock_base_auth():
    """Mock base authentication service."""
    mock = Mock(spec=EnhancedAuthService)
    mock.validate_token = AsyncMock()
    return mock


@pytest.fixture
def mcp_auth_service(security_config, mock_base_auth):
    """MCP authentication service for testing."""
    return MCPAuthenticationService(security_config, mock_base_auth)


@pytest.fixture
def sample_user():
    """Sample user for testing."""
    return SecureUser(
        username="test_investigator",
        email="investigator@olorin.com",
        full_name="Test Investigator",
        disabled=False,
        scopes=[MCPRole.FRAUD_INVESTIGATOR],
        last_login=datetime.utcnow(),
        failed_login_attempts=0,
        account_locked_until=None,
        password_changed_at=datetime.utcnow()
    )


@pytest.mark.asyncio
class TestMCPAuthenticationService:
    """Test MCP authentication service."""

    async def test_validate_mcp_token_success(self, mcp_auth_service, mock_base_auth, sample_user):
        """Test successful token validation."""
        # Setup
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # Test
        context, result = await mcp_auth_service.validate_mcp_token(
            token="valid_token",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        # Assertions
        assert context is not None
        assert isinstance(context, MCPSecurityContext)
        assert context.user_id == "test_investigator"
        assert context.username == "test_investigator"
        assert MCPRole.FRAUD_INVESTIGATOR in context.roles
        assert result == "success"
    
    async def test_validate_mcp_token_with_permissions(self, mcp_auth_service, mock_base_auth, sample_user):
        """Test token validation with required permissions."""
        # Setup
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # Test with valid permission
        context, result = await mcp_auth_service.validate_mcp_token(
            token="valid_token",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            required_permissions=[MCPPermission.FRAUD_QUERY_DATABASE]
        )
        
        # Should succeed - fraud investigator has this permission
        assert context is not None
        assert result == "success"
        
        # Test with invalid permission
        context, result = await mcp_auth_service.validate_mcp_token(
            token="valid_token",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            required_permissions=[MCPPermission.ADMIN_CONFIG_MANAGE]
        )
        
        # Should fail - fraud investigator doesn't have admin permissions
        assert context is None
        assert "Insufficient permissions" in result
    
    async def test_validate_mcp_token_invalid_base_token(self, mcp_auth_service, mock_base_auth):
        """Test validation with invalid base token."""
        # Setup
        mock_base_auth.validate_token.return_value = (None, "Invalid token")
        
        # Test
        context, result = await mcp_auth_service.validate_mcp_token(
            token="invalid_token",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        # Assertions
        assert context is None
        assert result == "Invalid token"
    
    async def test_rate_limiting(self, mcp_auth_service, mock_base_auth, sample_user):
        """Test rate limiting functionality."""
        # Setup Redis to simulate rate limit exceeded
        mcp_auth_service.config.redis_client.get.return_value = str(
            mcp_auth_service.config.rate_limit_requests + 1
        )
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # Test
        context, result = await mcp_auth_service.validate_mcp_token(
            token="valid_token",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        # Assertions
        assert context is None
        assert result == "Rate limit exceeded"
    
    async def test_ip_lockout(self, mcp_auth_service, mock_base_auth):
        """Test IP lockout after failed attempts."""
        ip_address = "192.168.1.100"
        
        # Setup - simulate failed attempts
        mock_base_auth.validate_token.return_value = (None, "Invalid credentials")
        
        # Make multiple failed attempts
        for i in range(mcp_auth_service.config.max_failed_attempts):
            context, result = await mcp_auth_service.validate_mcp_token(
                token="invalid_token",
                ip_address=ip_address,
                user_agent="TestAgent/1.0"
            )
            assert context is None
        
        # Next attempt should be locked out
        context, result = await mcp_auth_service.validate_mcp_token(
            token="another_invalid_token",
            ip_address=ip_address,
            user_agent="TestAgent/1.0"
        )
        
        assert context is None
        assert "temporarily locked" in result
    
    async def test_audit_event_logging(self, mcp_auth_service):
        """Test audit event logging."""
        # Test audit event creation
        await mcp_auth_service._audit_event(
            event_type="TEST_EVENT",
            user_id="test_user",
            username="test_user",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            operation="test_operation",
            success=True,
            server_name="test_server",
            tool_name="test_tool"
        )
        
        # Verify Redis call was made
        mcp_auth_service.config.redis_client.setex.assert_called()
    
    async def test_audit_tool_execution(self, mcp_auth_service, sample_user):
        """Test tool execution auditing."""
        # Create security context
        context = MCPSecurityContext(
            user_id=sample_user.username,
            username=sample_user.username,
            roles=sample_user.scopes,
            permissions=["mcp:fraud:database"],
            session_id="test_session",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        
        # Test tool execution audit
        await mcp_auth_service.audit_tool_execution(
            context=context,
            server_name="fraud_database_server",
            tool_name="query_transactions",
            operation="database_query",
            success=True,
            request_data={"user_id": "test123"},
            duration_ms=250
        )
        
        # Verify audit was logged
        mcp_auth_service.config.redis_client.setex.assert_called()
        
    def test_permission_checking(self, mcp_auth_service):
        """Test permission checking logic."""
        # Create context with specific permissions
        context = MCPSecurityContext(
            user_id="test_user",
            username="test_user",
            roles=[MCPRole.FRAUD_INVESTIGATOR],
            permissions=[MCPPermission.FRAUD_QUERY_DATABASE.value, MCPPermission.TOOL_EXECUTE.value],
            session_id="test_session",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        
        # Test valid permissions
        missing = mcp_auth_service._check_permissions(
            context, [MCPPermission.FRAUD_QUERY_DATABASE]
        )
        assert missing == []
        
        # Test missing permissions
        missing = mcp_auth_service._check_permissions(
            context, [MCPPermission.ADMIN_CONFIG_MANAGE]
        )
        assert len(missing) == 1
        assert MCPPermission.ADMIN_CONFIG_MANAGE.value in missing
    
    def test_role_permission_mapping(self):
        """Test role-permission mapping is correctly defined."""
        # Test fraud investigator permissions
        investigator_perms = MCPAuthenticationService.ROLE_PERMISSIONS[MCPRole.FRAUD_INVESTIGATOR]
        assert MCPPermission.FRAUD_QUERY_DATABASE in investigator_perms
        assert MCPPermission.TOOL_EXECUTE in investigator_perms
        assert MCPPermission.ADMIN_CONFIG_MANAGE not in investigator_perms
        
        # Test admin permissions
        admin_perms = MCPAuthenticationService.ROLE_PERMISSIONS[MCPRole.MCP_ADMIN]
        assert MCPPermission.ADMIN_CONFIG_MANAGE in admin_perms
        assert len(admin_perms) > len(investigator_perms)
    
    def test_risk_score_calculation(self, mcp_auth_service):
        """Test risk score calculation for tool execution."""
        # Test high-risk tool
        risk_score = mcp_auth_service._calculate_risk_score(
            "fraud_database_server", "fraud_database_query", "bulk_query", True
        )
        assert risk_score > 0.5
        
        # Test low-risk tool
        risk_score = mcp_auth_service._calculate_risk_score(
            "general_server", "list_tools", "list", True
        )
        assert risk_score <= 0.3
        
        # Test failed operation (higher risk)
        risk_score_failed = mcp_auth_service._calculate_risk_score(
            "fraud_database_server", "fraud_database_query", "bulk_query", False
        )
        assert risk_score_failed > risk_score


class TestMCPSecurityContext:
    """Test MCP security context."""
    
    def test_security_context_creation(self):
        """Test security context creation."""
        context = MCPSecurityContext(
            user_id="test_user",
            username="test_user",
            roles=[MCPRole.FRAUD_INVESTIGATOR],
            permissions=[MCPPermission.FRAUD_QUERY_DATABASE.value],
            session_id="test_session",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        
        assert context.user_id == "test_user"
        assert context.username == "test_user"
        assert MCPRole.FRAUD_INVESTIGATOR in context.roles
        assert MCPPermission.FRAUD_QUERY_DATABASE.value in context.permissions
    
    def test_security_context_validation(self):
        """Test security context validation."""
        # Valid context
        context = MCPSecurityContext(
            user_id="test_user",
            username="test_user",
            roles=["fraud_investigator"],
            permissions=["mcp:fraud:database"],
            session_id="test_session",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        
        # Should not raise validation errors
        assert context.user_id is not None
        assert context.session_id is not None


class TestMCPAuditEvent:
    """Test MCP audit event."""
    
    def test_audit_event_creation(self):
        """Test audit event creation."""
        event = MCPAuditEvent(
            event_type="TOOL_EXECUTION",
            user_id="test_user",
            username="test_user",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            server_name="fraud_server",
            tool_name="query_tool",
            operation="database_query",
            success=True,
            duration_ms=150
        )
        
        assert event.event_type == "TOOL_EXECUTION"
        assert event.user_id == "test_user"
        assert event.success is True
        assert event.duration_ms == 150
        assert event.event_id is not None  # Should be auto-generated
        assert event.timestamp is not None  # Should be auto-generated
    
    def test_audit_event_json_serialization(self):
        """Test audit event JSON serialization."""
        event = MCPAuditEvent(
            event_type="TOOL_EXECUTION",
            user_id="test_user",
            username="test_user",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            operation="test_operation",
            success=True
        )
        
        # Should be serializable to JSON
        json_str = event.json()
        assert "TOOL_EXECUTION" in json_str
        assert "test_user" in json_str


class TestMCPAuthorizationDecorator:
    """Test MCP authorization decorator."""
    
    def test_authorization_decorator_success(self):
        """Test successful authorization."""
        # Create decorator
        decorator = MCPAuthorizationDecorator([MCPPermission.TOOL_EXECUTE])
        
        # Create mock function
        @decorator
        async def mock_tool_function(security_context=None):
            return "success"
        
        # Create valid security context
        context = MCPSecurityContext(
            user_id="test_user",
            username="test_user",
            roles=[MCPRole.FRAUD_INVESTIGATOR],
            permissions=[MCPPermission.TOOL_EXECUTE.value],
            session_id="test_session",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        
        # Should succeed
        import asyncio
        result = asyncio.run(mock_tool_function(security_context=context))
        assert result == "success"
    
    def test_authorization_decorator_missing_context(self):
        """Test authorization with missing context."""
        # Create decorator
        decorator = MCPAuthorizationDecorator([MCPPermission.TOOL_EXECUTE])
        
        # Create mock function
        @decorator
        async def mock_tool_function(security_context=None):
            return "success"
        
        # Should raise exception for missing context
        import asyncio
        with pytest.raises(Exception):  # HTTPException or similar
            asyncio.run(mock_tool_function())
    
    def test_authorization_decorator_insufficient_permissions(self):
        """Test authorization with insufficient permissions."""
        # Create decorator requiring admin permissions
        decorator = MCPAuthorizationDecorator([MCPPermission.ADMIN_CONFIG_MANAGE])
        
        # Create mock function
        @decorator
        async def mock_tool_function(security_context=None):
            return "success"
        
        # Create context with insufficient permissions
        context = MCPSecurityContext(
            user_id="test_user",
            username="test_user",
            roles=[MCPRole.FRAUD_INVESTIGATOR],
            permissions=[MCPPermission.TOOL_EXECUTE.value],  # No admin permissions
            session_id="test_session",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        
        # Should raise exception for insufficient permissions
        import asyncio
        with pytest.raises(Exception):  # HTTPException or similar
            asyncio.run(mock_tool_function(security_context=context))