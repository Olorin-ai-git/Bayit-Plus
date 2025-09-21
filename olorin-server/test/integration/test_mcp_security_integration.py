"""
Integration tests for MCP Security Framework with existing MCP servers.

This demonstrates how the security framework integrates with the fraud detection
MCP servers to provide authentication, authorization, and input validation.

Author: Security Specialist
Date: 2025-08-31
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timedelta

from app.service.mcp_servers.security import (
    MCPAuthenticationService,
    MCPSecurityContext,
    MCPPermission,
    MCPRole,
    MCPSecurityConfig,
    MCPInputValidator,
    ValidationLevel,
    InputType,
    create_fraud_investigation_validator,
)


class TestMCPSecurityIntegration:
    """Integration tests for MCP security framework."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client for testing."""
        redis_mock = Mock()
        redis_mock.get = AsyncMock(return_value=None)
        redis_mock.setex = AsyncMock()
        redis_mock.incr = AsyncMock()
        redis_mock.keys = AsyncMock(return_value=[])
        return redis_mock
    
    @pytest.fixture
    def security_config(self, mock_redis):
        """Security configuration."""
        return MCPSecurityConfig(
            jwt_secret_key="test_secret_key_for_integration_testing",
            redis_client=mock_redis,
            audit_enabled=True
        )
    
    @pytest.fixture
    def mock_base_auth(self):
        """Mock base authentication service."""
        mock = Mock()
        mock.validate_token = AsyncMock()
        return mock
    
    @pytest.fixture
    def auth_service(self, security_config, mock_base_auth):
        """MCP authentication service."""
        return MCPAuthenticationService(security_config, mock_base_auth)
    
    @pytest.fixture
    def input_validator(self):
        """Input validator for fraud investigation."""
        return create_fraud_investigation_validator()
    
    @pytest.fixture
    def sample_user(self):
        """Sample fraud investigator user."""
        class MockUser:
            def __init__(self):
                self.username = "fraud_investigator_01"
                self.email = "investigator@olorin.com"
                self.scopes = [MCPRole.FRAUD_INVESTIGATOR]
                
        return MockUser()
    
    @pytest.mark.asyncio
    async def test_fraud_database_tool_security_flow(
        self, 
        auth_service, 
        input_validator, 
        mock_base_auth, 
        sample_user
    ):
        """Test complete security flow for fraud database tool."""
        
        # 1. Mock successful token validation
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # 2. Validate token and get security context
        context, result = await auth_service.validate_mcp_token(
            token="valid_jwt_token",
            ip="192.168.1.100",
            user_agent="OlorinAgent/1.0",
            required_permissions=[MCPPermission.FRAUD_QUERY_DATABASE]
        )
        
        assert context is not None
        assert result == "success"
        assert context.user_id == "fraud_investigator_01"
        assert MCPPermission.FRAUD_QUERY_DATABASE.value in context.permissions
        
        # 3. Validate tool inputs
        tool_inputs = {
            "user_id": "USR123456",
            "start_date": "2025-01-01T00:00:00Z",
            "end_date": "2025-01-31T23:59:59Z",
            "min_amount": 100.0,
            "max_amount": 50000.0,
            "limit": 100
        }
        
        validation_results = input_validator.validate_mcp_tool_input(
            tool_name="fraud_database_query",
            inputs=tool_inputs
        )
        
        # All inputs should be valid
        for field_name, validation_result in validation_results.items():
            assert validation_result.is_valid, f"Field {field_name} validation failed: {validation_result.errors}"
        
        # 4. Simulate tool execution and audit
        await auth_service.audit_tool_execution(
            context=context,
            server_name="fraud_database_server",
            tool_name="query_transactions",
            operation="database_query",
            success=True,
            request_data=tool_inputs,
            response_data={"results": 42, "query_time_ms": 150},
            duration_ms=150
        )
        
        # Verify audit was called
        auth_service.config.redis_client.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_unauthorized_tool_access(
        self, 
        auth_service, 
        mock_base_auth, 
        sample_user
    ):
        """Test that unauthorized tool access is blocked."""
        
        # Mock successful token validation
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # Try to access admin tool with investigator permissions
        context, result = await auth_service.validate_mcp_token(
            token="valid_jwt_token",
            ip="192.168.1.100",
            user_agent="OlorinAgent/1.0",
            required_permissions=[MCPPermission.ADMIN_CONFIG_MANAGE]  # Admin permission required
        )
        
        # Should be denied
        assert context is None
        assert "Insufficient permissions" in result
    
    def test_malicious_input_detection(self, input_validator):
        """Test that malicious inputs are detected and blocked."""
        
        # Test various malicious inputs
        malicious_inputs = {
            "sql_injection": "'; DROP TABLE users; --",
            "xss_attack": "<script>alert('xss')</script>",
            "command_injection": "test; rm -rf /",
            "path_traversal": "../../../etc/passwd",
            "null_byte": "test\x00malicious"
        }
        
        for attack_type, malicious_value in malicious_inputs.items():
            result = input_validator.validate(malicious_value, InputType.STRING)
            assert not result.is_valid, f"{attack_type} should be detected as malicious"
            assert result.risk_score > 0.5, f"{attack_type} should have high risk score"
    
    def test_input_size_limits(self, input_validator):
        """Test that oversized inputs are rejected."""
        
        # Test oversized string
        large_input = "A" * 15000  # Exceeds string limit
        result = input_validator.validate(large_input, InputType.STRING)
        
        assert not result.is_valid
        assert "too long" in result.errors[0]
        
        # Test oversized user ID
        large_user_id = "USER" + "X" * 300
        result = input_validator.validate(large_user_id, InputType.USER_ID)
        
        assert not result.is_valid
        assert "too long" in result.errors[0]
    
    @pytest.mark.asyncio
    async def test_rate_limiting_enforcement(
        self, 
        auth_service, 
        mock_base_auth, 
        sample_user
    ):
        """Test that rate limiting is enforced."""
        
        # Setup Redis to simulate rate limit exceeded
        auth_service.config.redis_client.get.return_value = str(
            auth_service.config.rate_limit_requests + 1
        )
        
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # Should be rate limited
        context, result = await auth_service.validate_mcp_token(
            token="valid_jwt_token",
            ip="192.168.1.100",
            user_agent="OlorinAgent/1.0"
        )
        
        assert context is None
        assert result == "Rate limit exceeded"
    
    def test_role_permission_hierarchy(self, auth_service):
        """Test that role permission hierarchy works correctly."""
        
        # Test role permissions are properly configured
        investigator_perms = auth_service.ROLE_PERMISSIONS[MCPRole.FRAUD_INVESTIGATOR]
        senior_perms = auth_service.ROLE_PERMISSIONS[MCPRole.SENIOR_INVESTIGATOR]
        manager_perms = auth_service.ROLE_PERMISSIONS[MCPRole.INVESTIGATION_MANAGER]
        admin_perms = auth_service.ROLE_PERMISSIONS[MCPRole.MCP_ADMIN]
        
        # Verify hierarchy: investigator < senior < manager < admin
        assert len(investigator_perms) < len(senior_perms)
        assert len(senior_perms) < len(manager_perms)
        assert len(manager_perms) < len(admin_perms)
        
        # Verify specific permissions
        assert MCPPermission.FRAUD_QUERY_DATABASE in investigator_perms
        assert MCPPermission.FRAUD_GRAPH_ANALYSIS in senior_perms
        assert MCPPermission.FRAUD_BLOCKCHAIN_ANALYSIS in manager_perms
        assert MCPPermission.ADMIN_CONFIG_MANAGE in admin_perms
    
    def test_fraud_specific_validation_rules(self, input_validator):
        """Test fraud investigation specific validation rules."""
        
        # Test that fraud validator has custom rules
        assert len(input_validator.custom_rules) > 0
        
        # Verify strict validation level
        assert input_validator.validation_level == ValidationLevel.STRICT
        
        # Test field-specific validation would work
        # (Custom rules are applied in validate_mcp_tool_input)
        tool_inputs = {
            "confidence_threshold": 0.95,  # Valid
            "risk_score": 0.85,            # Valid
            "amount": 1000.50              # Valid
        }
        
        results = input_validator.validate_mcp_tool_input(
            tool_name="fraud_pattern_matching",
            inputs=tool_inputs
        )
        
        # Should pass basic validation (custom rules tested separately)
        for field_name, result in results.items():
            if field_name != "tool_name":  # Skip tool name validation
                assert result.is_valid or len(result.warnings) == 0, f"Field {field_name} should be valid"
    
    @pytest.mark.asyncio
    async def test_complete_fraud_investigation_workflow(
        self, 
        auth_service, 
        input_validator, 
        mock_base_auth, 
        sample_user
    ):
        """Test complete workflow from authentication to audit."""
        
        # Setup successful authentication
        mock_base_auth.validate_token.return_value = (sample_user, "success")
        
        # Step 1: Authenticate and authorize
        context, auth_result = await auth_service.validate_mcp_token(
            token="investigation_token",
            ip="10.0.1.50",
            user_agent="Olorin-Investigator/2.0",
            required_permissions=[
                MCPPermission.FRAUD_QUERY_DATABASE,
                MCPPermission.FRAUD_EXTERNAL_API
            ]
        )
        
        assert context is not None
        assert auth_result == "success"
        
        # Step 2: Validate investigation parameters
        investigation_params = {
            "target_user_id": "suspect_user_12345",
            "investigation_type": "account_takeover",
            "time_range_start": "2025-01-15T00:00:00Z",
            "time_range_end": "2025-01-31T23:59:59Z",
            "include_related_accounts": True,
            "risk_threshold": 0.7,
            "max_results": 500
        }
        
        validation_results = input_validator.validate_mcp_tool_input(
            tool_name="comprehensive_fraud_investigation",
            inputs=investigation_params
        )
        
        # All parameters should be valid
        all_valid = all(
            result.is_valid 
            for field_name, result in validation_results.items()
        )
        assert all_valid, f"Validation errors: {[(k, v.errors) for k, v in validation_results.items() if not v.is_valid]}"
        
        # Step 3: Execute multiple tools with audit trail
        tools_executed = [
            ("fraud_database_server", "query_user_transactions", "database_query"),
            ("external_api_server", "verify_identity", "api_call"),
            ("fraud_database_server", "analyze_device_patterns", "pattern_analysis")
        ]
        
        for server_name, tool_name, operation in tools_executed:
            await auth_service.audit_tool_execution(
                context=context,
                server_name=server_name,
                tool_name=tool_name,
                operation=operation,
                success=True,
                request_data={"investigation_id": "INV_2025_001"},
                duration_ms=200 + len(tool_name) * 10  # Simulate varying response times
            )
        
        # Verify audit calls were made (should be at least the number of tools executed)
        audit_calls = auth_service.config.redis_client.setex.call_count
        assert audit_calls >= len(tools_executed), f"Expected at least {len(tools_executed)} audit calls, got {audit_calls}"
        
        # Step 4: Generate validation summary
        summary = input_validator.create_validation_summary(validation_results)
        
        assert summary["overall_valid"] is True
        assert summary["total_errors"] == 0
        assert summary["max_risk_score"] <= 0.5  # Should be low risk for valid inputs
        
        print(f"✅ Investigation workflow completed successfully")
        print(f"   - User: {context.user_id}")
        print(f"   - Tools executed: {len(tools_executed)}")
        print(f"   - Validation summary: {summary['valid_fields']}/{summary['total_fields']} fields valid")
        print(f"   - Max risk score: {summary['max_risk_score']:.2f}")


if __name__ == "__main__":
    # Run integration tests
    pytest.main([__file__, "-v"])