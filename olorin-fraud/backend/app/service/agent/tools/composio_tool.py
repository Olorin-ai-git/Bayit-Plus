"""
Composio Tool for LangChain Agents

Provides automated fraud response capabilities via Composio actions.
"""

import os
from typing import Any, Dict, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, ConfigDict, Field

from app.service.composio.action_executor import ActionExecutor
from app.service.composio.exceptions import ComposioActionError, ComposioConnectionError
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ComposioActionInput(BaseModel):
    """Input schema for Composio action execution."""

    toolkit: str = Field(
        ..., description="Toolkit name (e.g., 'stripe', 'shopify', 'okta')"
    )
    action: str = Field(
        ...,
        description="Action name (e.g., 'void_payment', 'cancel_order', 'suspend_user')",
    )
    connection_id: str = Field(..., description="Composio connection ID for the tenant")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Action parameters"
    )
    execution_id: Optional[str] = Field(
        None, description="Optional SOAR execution ID for audit"
    )
    tenant_id: Optional[str] = Field(
        None,
        description="Tenant ID for scoping (required for action execution). If not provided, will attempt to retrieve from investigation context or use DEFAULT_TENANT_ID environment variable.",
    )


class ComposioTool(BaseTool):
    """
    Tool for executing Composio actions for automated fraud response.

    Provides:
    - Payment voiding (Stripe, Square)
    - Order cancellation (Shopify)
    - User suspension (Okta)
    - Dispute creation (Stripe, Shopify, Square)
    - Slack/Jira notifications
    - Tenant-scoped action execution
    - Automatic retry with exponential backoff
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str = "composio_action"
    description: str = """
    Execute Composio actions for automated fraud response.
    
    Use this tool to:
    - Void payments (Stripe, Square) when fraud is detected
    - Cancel orders (Shopify) for fraudulent transactions
    - Suspend users (Okta) for security violations
    - Create disputes (Stripe, Shopify, Square) for chargebacks
    - Send notifications (Slack, Jira) for fraud alerts
    - Execute any Composio-integrated action for fraud response
    
    Input: toolkit (required), action (required), connection_id (required), parameters (optional), execution_id (optional)
    Output: Action execution result with status, response data, and audit information
    """
    args_schema: type[BaseModel] = ComposioActionInput

    action_executor: Optional[ActionExecutor] = None

    def __init__(self, **kwargs):
        """Initialize Composio tool."""
        super().__init__(**kwargs)
        object.__setattr__(self, "action_executor", ActionExecutor())

    def _run(
        self,
        toolkit: str,
        action: str,
        connection_id: str,
        parameters: Dict[str, Any] = None,
        execution_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        **kwargs,
    ) -> str:
        """
        Execute Composio action.

        Args:
            toolkit: Toolkit name
            action: Action name
            connection_id: Composio connection ID
            parameters: Action parameters
            execution_id: Optional SOAR execution ID
            tenant_id: Tenant ID (required for scoping)

        Returns:
            JSON string with action result
        """
        import json

        logger.info(
            f"🔍 [ComposioTool] Starting action execution: toolkit={toolkit}, action={action}, connection_id={connection_id}, tenant_id={tenant_id}, execution_id={execution_id}"
        )
        logger.debug(
            f"🔍 [ComposioTool] Parameters: {json.dumps(parameters or {}, indent=2)}"
        )
        logger.debug(f"🔍 [ComposioTool] Additional kwargs: {kwargs}")

        # Try to get tenant_id from kwargs if not provided directly
        if not tenant_id:
            tenant_id = kwargs.get("tenant_id")
            logger.debug(
                f"🔍 [ComposioTool] Retrieved tenant_id from kwargs: {tenant_id}"
            )

        # Try to get tenant_id from investigation metadata if still not available
        if not tenant_id:
            try:
                from app.service.logging.investigation_log_context import (
                    get_investigation_metadata,
                )

                metadata = get_investigation_metadata()
                if metadata and isinstance(metadata, dict):
                    tenant_id = metadata.get("tenant_id") or metadata.get("tenantId")
                    if tenant_id:
                        logger.debug(
                            f"🔍 [ComposioTool] Retrieved tenant_id from investigation metadata: {tenant_id}"
                        )
            except Exception as e:
                logger.debug(
                    f"🔍 [ComposioTool] Could not get tenant_id from investigation metadata: {e}"
                )

        # Use default tenant_id if still not available (for testing/demo)
        if not tenant_id:
            tenant_id = os.getenv("DEFAULT_TENANT_ID", "default")
            logger.warning(
                f"⚠️ [ComposioTool] Using default tenant_id from environment: {tenant_id}"
            )

        if not tenant_id or tenant_id == "default":
            error_msg = "tenant_id is required for Composio action execution. Provide it in the tool input or set DEFAULT_TENANT_ID environment variable."
            logger.error(f"❌ [ComposioTool] Validation failed: {error_msg}")
            return json.dumps(
                {
                    "error": error_msg,
                    "toolkit": toolkit,
                    "action": action,
                    "connection_id": connection_id,
                    "suggestion": "Add tenant_id to the tool input parameters",
                }
            )

        if parameters is None:
            parameters = {}
            logger.debug(
                f"🔍 [ComposioTool] Parameters were None, initialized as empty dict"
            )

        try:
            # Validate executor initialization
            if self.action_executor is None:
                raise RuntimeError("ActionExecutor not initialized")
            logger.debug(
                f"🔍 [ComposioTool] ActionExecutor initialized: {self.action_executor is not None}"
            )

            logger.info(
                f"🔍 [ComposioTool] Calling ActionExecutor.execute_action with toolkit={toolkit}, action={action}"
            )
            result = self.action_executor.execute_action(
                toolkit=toolkit,
                action=action,
                connection_id=connection_id,
                parameters=parameters,
                tenant_id=tenant_id,
                execution_id=execution_id,
            )

            logger.info(
                f"✅ [ComposioTool] Action executed successfully: toolkit={toolkit}, action={action}, tenant={tenant_id}, connection={connection_id}"
            )
            logger.debug(
                f"🔍 [ComposioTool] Action result type: {type(result)}, result_keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}"
            )

            success_result = {
                "status": "success",
                "toolkit": toolkit,
                "action": action,
                "result": result,
                "connection_id": connection_id,
                "execution_id": execution_id,
            }
            result_json = json.dumps(success_result, indent=2)
            logger.info(
                f"✅ [ComposioTool] Returning success result, length={len(result_json)}"
            )

            return result_json

        except ComposioConnectionError as e:
            logger.warning(
                f"⚠️ [ComposioTool] Connection error: toolkit={toolkit}, action={action}, error={e}"
            )
            return json.dumps(
                {
                    "status": "failed",
                    "error": str(e),
                    "error_type": "connection_error",
                    "toolkit": toolkit,
                    "action": action,
                    "connection_id": connection_id,
                    "tenant_id": tenant_id,
                    "suggestion": "Ensure the connection exists in the database for this tenant",
                }
            )
        except ComposioActionError as e:
            logger.error(
                f"❌ [ComposioTool] Action error: toolkit={toolkit}, action={action}, error={e}"
            )
            return json.dumps(
                {
                    "status": "failed",
                    "error": str(e),
                    "error_type": "action_error",
                    "toolkit": toolkit,
                    "action": action,
                    "connection_id": connection_id,
                    "tenant_id": tenant_id,
                }
            )
        except Exception as e:
            # Check if it's a RetryError wrapping a ComposioConnectionError
            from tenacity import RetryError

            if isinstance(e, RetryError):
                # Extract the underlying exception
                last_attempt = getattr(e, "last_attempt", None)
                if last_attempt:
                    exception = getattr(last_attempt, "exception", None)
                    if isinstance(exception, ComposioConnectionError):
                        logger.warning(
                            f"⚠️ [ComposioTool] Connection error (from retry): toolkit={toolkit}, action={action}, error={exception}"
                        )
                        return json.dumps(
                            {
                                "status": "failed",
                                "error": str(exception),
                                "error_type": "connection_error",
                                "toolkit": toolkit,
                                "action": action,
                                "connection_id": connection_id,
                                "tenant_id": tenant_id,
                                "suggestion": "Ensure the connection exists in the database for this tenant",
                            }
                        )

            # Check error message for connection errors
            error_str = str(e)
            if "ComposioConnectionError" in error_str or (
                "Connection" in error_str and "not found" in error_str
            ):
                logger.warning(
                    f"⚠️ [ComposioTool] Connection error (detected from message): toolkit={toolkit}, action={action}, error={e}"
                )
                return json.dumps(
                    {
                        "status": "failed",
                        "error": str(e),
                        "error_type": "connection_error",
                        "toolkit": toolkit,
                        "action": action,
                        "connection_id": connection_id,
                        "tenant_id": tenant_id,
                        "suggestion": "Ensure the connection exists in the database for this tenant",
                    }
                )

            logger.error(
                f"❌ [ComposioTool] Unexpected error: toolkit={toolkit}, action={action}, error={e}",
                exc_info=True,
            )
            return json.dumps(
                {
                    "status": "failed",
                    "error": str(e),
                    "error_type": "unexpected_error",
                    "toolkit": toolkit,
                    "action": action,
                    "connection_id": connection_id,
                    "tenant_id": tenant_id,
                }
            )

    async def _arun(
        self,
        toolkit: str,
        action: str,
        connection_id: str,
        parameters: Dict[str, Any] = None,
        execution_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        **kwargs,
    ) -> str:
        """Async version of Composio action execution."""
        # ActionExecutor is synchronous, so we run in executor
        import asyncio

        if parameters is None:
            parameters = {}

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._run,
            toolkit,
            action,
            connection_id,
            parameters,
            execution_id,
            tenant_id,
            **kwargs,
        )
