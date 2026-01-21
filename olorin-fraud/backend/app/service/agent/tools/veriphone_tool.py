"""
Veriphone Tool for LangChain Agents

Provides phone number verification via Composio Veriphone integration.
"""

import json
import os
from typing import Any, Dict, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, ConfigDict, Field

from app.service.composio.client import ComposioClient
from app.service.composio.exceptions import ComposioActionError, ComposioConnectionError
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class VeriphoneInput(BaseModel):
    """Input schema for Veriphone phone verification."""

    phone: str = Field(
        ..., description="Phone number to verify (E.164 format preferred)"
    )
    entity_id: Optional[str] = Field(
        None, description="Entity ID being investigated (for context)"
    )


class VeriphoneTool(BaseTool):
    """
    Tool for verifying phone numbers via Composio Veriphone.

    Provides:
    - Phone number validation
    - Carrier information
    - Line type detection (mobile, landline, VoIP)
    - Fraud risk assessment
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str = "veriphone_verify_phone"
    description: str = """
    Verify phone number and retrieve carrier information via Veriphone.
    
    Use this tool to:
    - Validate phone numbers for fraud investigations
    - Get carrier information (carrier name, type, country)
    - Detect line type (mobile, landline, VoIP, toll-free)
    - Assess fraud risk based on phone number characteristics
    
    Input: phone (required) - Phone number in E.164 format or standard format
    Output: Verification result with validation status, carrier info, line type, and risk assessment
    """
    args_schema: type[BaseModel] = VeriphoneInput

    composio_client: Optional[ComposioClient] = None

    def __init__(self, **kwargs):
        """Initialize Veriphone tool."""
        super().__init__(**kwargs)
        try:
            object.__setattr__(self, "composio_client", ComposioClient())
            logger.info("✅ VeriphoneTool initialized with ComposioClient")
        except Exception as e:
            logger.error(
                f"❌ Failed to initialize ComposioClient for VeriphoneTool: {e}"
            )
            object.__setattr__(self, "composio_client", None)

    def _run(self, phone: str, entity_id: Optional[str] = None, **kwargs) -> str:
        """
        Verify phone number via Veriphone.

        Args:
            phone: Phone number to verify
            entity_id: Optional entity ID for context

        Returns:
            JSON string with verification result
        """
        if not self.composio_client:
            return json.dumps(
                {
                    "status": "error",
                    "error": "ComposioClient not initialized",
                    "phone": phone,
                }
            )

        logger.info(
            f"📞 [VeriphoneTool] Verifying phone: {phone}, entity_id: {entity_id}"
        )

        try:
            # Use a default connection ID for Veriphone (can be configured)
            # Veriphone uses API key authentication, so connection_id can be a placeholder
            connection_id = os.getenv(
                "COMPOSIO_VERIPHONE_CONNECTION_ID", "veriphone-default"
            )
            tenant_id = os.getenv("DEFAULT_TENANT_ID", "default")

            # Execute Veriphone verify_phone action via Composio
            result = self.composio_client.execute_action(
                toolkit="veriphone",
                action="verify_phone",
                connection_id=connection_id,
                parameters={"phone": phone},
                tenant_id=tenant_id,
            )

            logger.info(f"✅ [VeriphoneTool] Phone verification completed: {phone}")
            logger.debug(f"📞 [VeriphoneTool] Result: {json.dumps(result, indent=2)}")

            # Format result for agents
            formatted_result = {
                "status": "success",
                "phone": phone,
                "verification": result,
                "entity_id": entity_id,
            }

            return json.dumps(formatted_result, indent=2)

        except ComposioActionError as e:
            logger.error(f"❌ [VeriphoneTool] Action error: {e}")
            return json.dumps(
                {
                    "status": "error",
                    "error": str(e),
                    "error_type": "action_error",
                    "phone": phone,
                    "entity_id": entity_id,
                }
            )
        except ComposioConnectionError as e:
            logger.error(f"❌ [VeriphoneTool] Connection error: {e}")
            return json.dumps(
                {
                    "status": "error",
                    "error": str(e),
                    "error_type": "connection_error",
                    "phone": phone,
                    "entity_id": entity_id,
                    "suggestion": "Ensure Veriphone credentials are configured in environment variables",
                }
            )
        except Exception as e:
            logger.error(f"❌ [VeriphoneTool] Unexpected error: {e}", exc_info=True)
            return json.dumps(
                {
                    "status": "error",
                    "error": str(e),
                    "error_type": "unexpected_error",
                    "phone": phone,
                    "entity_id": entity_id,
                }
            )

    async def _arun(self, phone: str, entity_id: Optional[str] = None, **kwargs) -> str:
        """Async version of phone verification."""
        import asyncio

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._run, phone, entity_id, **kwargs)
