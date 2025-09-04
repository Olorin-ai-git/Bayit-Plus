from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

"""
Example usage of the MCP Security Framework in Olorin fraud investigation platform.

This file demonstrates how to integrate the security framework with MCP tools
for fraud detection and investigation.

Author: Security Specialist
Date: 2025-08-31
Phase: 3 - Security and Enterprise Integration
"""

import asyncio
import logging
from typing import Dict, Any
from fastapi import HTTPException, Request

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
    require_fraud_database_access,
    require_tool_execution,
)

logger = logging.getLogger(__name__)


class SecureFraudInvestigationTool:
    """Example of a fraud investigation tool with integrated security."""
    
    def __init__(self, auth_service: MCPAuthenticationService, validator: MCPInputValidator):
        self.auth = auth_service
        self.validator = validator
    
    async def investigate_user_fraud(
        self,
        request: Request,
        token: str,
        user_id: str,
        investigation_type: str,
        time_range_days: int = 30,
        include_related: bool = False
    ) -> Dict[str, Any]:
        """
        Secure fraud investigation tool with comprehensive security checks.
        
        This method demonstrates the complete security workflow:
        1. Authentication & Authorization
        2. Input Validation
        3. Business Logic Execution
        4. Audit Logging
        """
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Step 1: Authentication and Authorization
            ip_address = request.client.host
            user_agent = request.headers.get("user-agent", "Unknown")
            
            security_context, auth_result = await self.auth.validate_mcp_token(
                token=token,
                ip_address=ip_address,
                user_agent=user_agent,
                required_permissions=[
                    MCPPermission.FRAUD_QUERY_DATABASE,
                    MCPPermission.TOOL_EXECUTE
                ],
                server_context="fraud_database_server",
                tool_context="investigate_user_fraud"
            )
            
            if not security_context:
                raise HTTPException(status_code=401, detail=auth_result)
            
            logger.info(f"User {security_context.user_id} initiated fraud investigation")
            
            # Step 2: Input Validation
            investigation_inputs = {
                "target_user_id": user_id,
                "investigation_type": investigation_type,
                "time_range_days": time_range_days,
                "include_related": include_related
            }
            
            validation_results = self.validator.validate_mcp_tool_input(
                tool_name="investigate_user_fraud",
                inputs=investigation_inputs
            )
            
            # Check validation results
            validation_errors = []
            for field_name, result in validation_results.items():
                if not result.is_valid:
                    validation_errors.extend([f"{field_name}: {error}" for error in result.errors])
            
            if validation_errors:
                await self.auth.audit_tool_execution(
                    context=security_context,
                    server_name="fraud_database_server",
                    tool_name="investigate_user_fraud",
                    operation="input_validation",
                    success=False,
                    error_message=f"Input validation failed: {validation_errors}",
                    request_data=investigation_inputs
                )
                raise HTTPException(status_code=400, detail=f"Input validation failed: {validation_errors}")
            
            # Step 3: Execute Investigation Logic
            investigation_results = await self._execute_investigation(
                security_context,
                user_id,
                investigation_type,
                time_range_days,
                include_related
            )
            
            # Step 4: Audit Successful Execution
            execution_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
            
            await self.auth.audit_tool_execution(
                context=security_context,
                server_name="fraud_database_server",
                tool_name="investigate_user_fraud",
                operation="fraud_investigation",
                success=True,
                request_data=investigation_inputs,
                response_data={
                    "results_count": len(investigation_results.get("findings", [])),
                    "risk_score": investigation_results.get("overall_risk_score", 0.0)
                },
                duration_ms=execution_time
            )
            
            return {
                "success": True,
                "investigation_id": f"INV_{security_context.user_id}_{int(start_time)}",
                "investigator": security_context.user_id,
                "target_user": user_id,
                "results": investigation_results,
                "execution_time_ms": execution_time,
                "security_context": {
                    "permissions": security_context.permissions,
                    "session_id": security_context.session_id
                }
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Audit unexpected errors
            execution_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
            
            if 'security_context' in locals():
                await self.auth.audit_tool_execution(
                    context=security_context,
                    server_name="fraud_database_server",
                    tool_name="investigate_user_fraud",
                    operation="fraud_investigation",
                    success=False,
                    error_message=str(e),
                    request_data=investigation_inputs if 'investigation_inputs' in locals() else {},
                    duration_ms=execution_time
                )
            
            logger.error(f"Investigation failed: {e}")
            raise HTTPException(status_code=500, detail="Investigation failed due to internal error")
    
    async def _execute_investigation(
        self,
        context: MCPSecurityContext,
        user_id: str,
        investigation_type: str,
        time_range_days: int,
        include_related: bool
    ) -> Dict[str, Any]:
        """Execute the actual investigation logic."""
        
        # This would integrate with actual fraud detection systems
        # For demonstration, we'll simulate investigation results
        
        findings = []
        
        # Simulate database queries with proper validation
        if investigation_type == "account_takeover":
            findings.extend([
                {"type": "suspicious_login", "risk_score": 0.8, "details": "Login from new device"},
                {"type": "rapid_transactions", "risk_score": 0.6, "details": "Multiple transactions in short time"},
            ])
        elif investigation_type == "payment_fraud":
            findings.extend([
                {"type": "card_mismatch", "risk_score": 0.9, "details": "Card details don't match profile"},
                {"type": "velocity_check", "risk_score": 0.7, "details": "High transaction velocity"},
            ])
        
        if include_related:
            findings.append({
                "type": "related_accounts", 
                "risk_score": 0.5, 
                "details": "Found 2 potentially related accounts"
            })
        
        # Calculate overall risk
        risk_scores = [f["risk_score"] for f in findings]
        overall_risk = max(risk_scores) if risk_scores else 0.0
        
        return {
            "findings": findings,
            "overall_risk_score": overall_risk,
            "investigation_type": investigation_type,
            "time_range_days": time_range_days,
            "include_related": include_related,
            "recommendation": "HIGH RISK - Immediate review required" if overall_risk > 0.8 else
                            "MEDIUM RISK - Monitor closely" if overall_risk > 0.5 else
                            "LOW RISK - Standard monitoring"
        }


# Decorator Example: Secure Tool Function
@require_fraud_database_access
async def query_user_transactions(
    user_id: str,
    start_date: str,
    end_date: str,
    security_context: MCPSecurityContext = None
) -> Dict[str, Any]:
    """
    Example of using security decorators for tool functions.
    The decorator automatically checks for FRAUD_QUERY_DATABASE permission.
    """
    
    # Input validation
    validator = create_fraud_investigation_validator()
    
    inputs = {
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date
    }
    
    validation_results = validator.validate_mcp_tool_input(
        tool_name="query_user_transactions",
        inputs=inputs
    )
    
    # Check for validation errors
    for field_name, result in validation_results.items():
        if not result.is_valid:
            raise ValueError(f"Invalid {field_name}: {result.errors}")
    
    # Execute query (simulated)
    transactions = [
        {"id": "TXN001", "amount": 150.00, "timestamp": "2025-01-15T10:30:00Z"},
        {"id": "TXN002", "amount": 75.50, "timestamp": "2025-01-16T14:20:00Z"},
    ]
    
    return {
        "user_id": user_id,
        "transactions": transactions,
        "count": len(transactions),
        "total_amount": sum(txn["amount"] for txn in transactions),
        "query_user": security_context.user_id if security_context else "unknown"
    }


# Example usage in FastAPI application
"""
from fastapi import FastAPI, Request, Header
from app.service.mcp_servers.security.example_usage import SecureFraudInvestigationTool

app = FastAPI()

# Initialize security components
security_config = MCPSecurityConfig(
    jwt_secret_key="your-secret-key",
    audit_enabled=True
)

auth_service = MCPAuthenticationService(security_config, base_auth_service)
validator = create_fraud_investigation_validator()
investigation_tool = SecureFraudInvestigationTool(auth_service, validator)

@app.post("/api/v1/investigate")
async def investigate_fraud(
    request: Request,
    user_id: str,
    investigation_type: str,
    time_range_days: int = 30,
    include_related: bool = False,
    authorization: str = Header(..., description="Bearer JWT token")
):
    token = authorization.replace("Bearer ", "")
    
    return await investigation_tool.investigate_user_fraud(
        request=request,
        token=token,
        user_id=user_id,
        investigation_type=investigation_type,
        time_range_days=time_range_days,
        include_related=include_related
    )
"""


if __name__ == "__main__":
    # Example of creating security configuration
    logger.info("MCP Security Framework Example")
    logger.info("=" * 50)
    
    # Show available permissions
    logger.info("\nAvailable Permissions:")
    for permission in MCPPermission:
        logger.info(f"  - {permission.value}")
    
    logger.info("\nAvailable Roles:")
    for role in MCPRole:
        logger.info(f"  - {role.value}")
    
    logger.info("\nValidation Levels:")
    for level in ValidationLevel:
        logger.info(f"  - {level.value}")
    
    logger.info("\nSupported Input Types:")
    for input_type in InputType:
        logger.info(f"  - {input_type.value}")
    
    logger.info("\n" + "=" * 50)
    logger.info("Security framework ready for integration!")
    logger.info("See integration tests for complete usage examples.")