"""
IP Quality Score (IPQS) Email Verification Tool for LangChain Agents

Provides email verification and fraud scoring via IP Quality Score API.
"""

import os
import json
import httpx
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from langchain_core.tools import BaseTool
from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader, ConfigLoader

logger = get_bridge_logger(__name__)


class IPQSEmailInput(BaseModel):
    """Input schema for IPQS email verification."""
    email: str = Field(..., description="Email address to verify and score")
    entity_id: Optional[str] = Field(None, description="Entity ID being investigated (for context)")


class IPQSEmailTool(BaseTool):
    """
    Tool for verifying email addresses via IP Quality Score API.
    
    Provides:
    - Email validation and deliverability scoring
    - Fraud score assessment (0-100)
    - Disposable email detection
    - SMTP validation
    - Honeypot and spam trap detection
    - Domain age and reputation analysis
    """
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name: str = "ipqs_email_verification"
    description: str = """
    Verify email address and retrieve fraud score via IP Quality Score.
    
    Use this tool to:
    - Validate email addresses for fraud investigations
    - Get fraud score (0-100, higher = more risky)
    - Detect disposable/temporary email addresses
    - Check SMTP deliverability
    - Identify honeypot and spam trap emails
    - Assess domain age and reputation
    
    Input: email (required) - Email address to verify
    Output: Verification result with fraud score, validation status, deliverability, and risk indicators
    """
    args_schema: type[BaseModel] = IPQSEmailInput
    
    config_loader: Optional[ConfigLoader] = None
    api_key: Optional[str] = None
    base_url: str = "https://www.ipqualityscore.com/api/json/email"
    
    def __init__(self, **kwargs):
        """Initialize IPQS email tool."""
        super().__init__(**kwargs)
        object.__setattr__(self, 'config_loader', get_config_loader())
        object.__setattr__(self, 'api_key', None)
        object.__setattr__(self, 'base_url', "https://www.ipqualityscore.com/api/json/email")
        self._load_api_key()
    
    def _load_api_key(self):
        """Load IPQS API key from config or environment."""
        try:
            # Try config loader first (supports Firebase Secrets), then fallback to env
            api_key = (
                self.config_loader.load_secret("IPQS_API_KEY") or
                os.getenv("IPQS_API_KEY")
            )
            
            object.__setattr__(self, 'api_key', api_key)
            
            if not api_key:
                logger.warning("IPQS_API_KEY not configured. Set environment variable or configure secret.")
            else:
                logger.info("✅ IPQSEmailTool initialized with API key")
        except Exception as e:
            logger.warning(f"Failed to load IPQS API key: {e}")
            object.__setattr__(self, 'api_key', os.getenv("IPQS_API_KEY"))
    
    def _run(
        self,
        email: str,
        entity_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Verify email address via IP Quality Score API.
        
        Args:
            email: Email address to verify
            entity_id: Optional entity ID for context
            
        Returns:
            JSON string with verification result
        """
        if not self.api_key:
            return json.dumps({
                "status": "error",
                "error": "IPQS_API_KEY not configured",
                "email": email,
                "suggestion": "Set IPQS_API_KEY in environment variables or Firebase Secrets"
            })
        
        logger.info(f"📧 [IPQSEmailTool] Verifying email: {email}, entity_id: {entity_id}")
        
        try:
            # Build API URL: https://www.ipqualityscore.com/api/json/email/{API_KEY}/{EMAIL}
            import urllib.parse
            encoded_email = urllib.parse.quote(email, safe='')
            api_url = f"{self.base_url}/{self.api_key}/{encoded_email}"
            
            # Make HTTP request to IPQS API
            with httpx.Client(timeout=30.0) as client:
                response = client.get(api_url)
                response.raise_for_status()
                result = response.json()
            
            logger.info(f"✅ [IPQSEmailTool] Email verification completed: {email}")
            logger.debug(f"📧 [IPQSEmailTool] Result: {json.dumps(result, indent=2)}")
            
            # Format result for agents
            formatted_result = {
                "status": "success",
                "email": email,
                "verification": {
                    "valid": result.get("valid", False),
                    "disposable": result.get("disposable", False),
                    "fraud_score": result.get("fraud_score", 0),
                    "overall_score": result.get("overall_score", 0),
                    "smtp_score": result.get("smtp_score", 0),
                    "deliverability": result.get("deliverability", "unknown"),
                    "honeypot": result.get("honeypot", False),
                    "spam_trap_score": result.get("spam_trap_score", "none"),
                    "recent_abuse": result.get("recent_abuse", False),
                    "suspect": result.get("suspect", False),
                    "frequent_complainer": result.get("frequent_complainer", False),
                    "catch_all": result.get("catch_all", False),
                    "domain_age": result.get("domain_age", {}),
                    "first_seen": result.get("first_seen", {}),
                    "domain_trust": result.get("domain_trust", "unknown"),
                    "risky_tld": result.get("risky_tld", False),
                    "dns_valid": result.get("dns_valid", False),
                    "spf_record": result.get("spf_record", False),
                    "dmarc_record": result.get("dmarc_record", False),
                    "mx_records": result.get("mx_records", []),
                    "a_records": result.get("a_records", []),
                    "message": result.get("message", ""),
                    "success": result.get("success", False)
                },
                "entity_id": entity_id
            }
            
            return json.dumps(formatted_result, indent=2)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ [IPQSEmailTool] HTTP error: {e.response.status_code} - {e.response.text}")
            return json.dumps({
                "status": "error",
                "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}",
                "error_type": "http_error",
                "email": email,
                "entity_id": entity_id
            })
        except httpx.TimeoutException as e:
            logger.error(f"❌ [IPQSEmailTool] Timeout error: {e}")
            return json.dumps({
                "status": "error",
                "error": f"Request timeout: {str(e)}",
                "error_type": "timeout_error",
                "email": email,
                "entity_id": entity_id
            })
        except Exception as e:
            logger.error(f"❌ [IPQSEmailTool] Unexpected error: {e}", exc_info=True)
            return json.dumps({
                "status": "error",
                "error": str(e),
                "error_type": "unexpected_error",
                "email": email,
                "entity_id": entity_id
            })
    
    async def _arun(
        self,
        email: str,
        entity_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """Async version of email verification."""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._run,
            email,
            entity_id,
            **kwargs
        )

