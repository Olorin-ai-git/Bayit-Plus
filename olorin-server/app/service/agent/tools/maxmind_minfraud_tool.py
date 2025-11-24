"""
MaxMind minFraud Tool for LangChain Agents

Provides IP risk scoring capabilities for fraud investigation agents.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from langchain_core.tools import BaseTool
from app.service.logging import get_bridge_logger
from app.service.ip_risk.maxmind_client import MaxMindClient

logger = get_bridge_logger(__name__)


class MaxMindMinFraudInput(BaseModel):
    """Input schema for MaxMind minFraud analysis."""
    ip_address: str = Field(..., description="IP address to score")
    transaction_id: Optional[str] = Field(None, description="Optional transaction ID for context")
    email: Optional[str] = Field(None, description="Optional email address")
    billing_country: Optional[str] = Field(None, description="Optional billing country code")
    transaction_amount: Optional[float] = Field(None, description="Optional transaction amount")
    currency: Optional[str] = Field(None, description="Optional currency code")


class MaxMindMinFraudTool(BaseTool):
    """
    Tool for scoring IP risk using MaxMind minFraud API.
    
    Provides:
    - Transaction risk scoring (0-100)
    - Proxy/VPN/TOR detection
    - Geolocation data
    - Velocity signals
    - Automatic caching and fallback
    """
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name: str = "maxmind_minfraud"
    description: str = """
    Score IP address risk using MaxMind minFraud API.
    
    Use this tool to:
    - Get transaction risk score (0-100) for an IP address
    - Detect proxy, VPN, or TOR usage
    - Get geolocation data (country, region, city)
    - Analyze velocity signals (transaction frequency)
    - Assess IP reputation before payment authorization
    
    Input: ip_address (required), transaction_id (optional), email (optional), billing_country (optional), transaction_amount (optional), currency (optional)
    Output: Risk score, proxy/VPN/TOR flags, geolocation, velocity signals, and cached status
    """
    args_schema: type[BaseModel] = MaxMindMinFraudInput
    
    maxmind_client: Optional[MaxMindClient] = None
    
    def __init__(self, **kwargs):
        """Initialize MaxMind minFraud tool."""
        super().__init__(**kwargs)
        object.__setattr__(self, 'maxmind_client', MaxMindClient())
    
    def _run(
        self,
        ip_address: str,
        transaction_id: Optional[str] = None,
        email: Optional[str] = None,
        billing_country: Optional[str] = None,
        transaction_amount: Optional[float] = None,
        currency: Optional[str] = None,
    ) -> str:
        """
        Score IP risk using MaxMind minFraud.
        
        Args:
            ip_address: IP address to score
            transaction_id: Optional transaction ID
            email: Optional email address
            billing_country: Optional billing country code
            transaction_amount: Optional transaction amount
            currency: Optional currency code
            
        Returns:
            JSON string with risk score and insights
        """
        import asyncio
        import json
        
        logger.info(f"🔍 [MaxMindMinFraudTool] Starting IP risk scoring: ip_address={ip_address}, transaction_id={transaction_id}, email={email}, billing_country={billing_country}, amount={transaction_amount}, currency={currency}")
        
        try:
            # Validate client initialization
            if self.maxmind_client is None:
                raise RuntimeError("MaxMindClient not initialized")
            logger.debug(f"🔍 [MaxMindMinFraudTool] MaxMindClient initialized: {self.maxmind_client is not None}")
            
            # Use async client in sync context
            loop = asyncio.get_event_loop()
            logger.debug(f"🔍 [MaxMindMinFraudTool] Event loop status: running={loop.is_running()}")
            
            if loop.is_running():
                # If loop is running, create a task
                logger.debug(f"🔍 [MaxMindMinFraudTool] Event loop is running, using ThreadPoolExecutor")
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run,
                        self.maxmind_client.score_transaction_with_fallback(
                            transaction_id=transaction_id or f"tool_{ip_address}",
                            ip_address=ip_address,
                            email=email,
                            billing_country=billing_country,
                            transaction_amount=transaction_amount,
                            currency=currency
                        )
                    )
                    result = future.result()
            else:
                logger.debug(f"🔍 [MaxMindMinFraudTool] Event loop not running, using run_until_complete")
                result = loop.run_until_complete(
                    self.maxmind_client.score_transaction_with_fallback(
                        transaction_id=transaction_id or f"tool_{ip_address}",
                        ip_address=ip_address,
                        email=email,
                        billing_country=billing_country,
                        transaction_amount=transaction_amount,
                        currency=currency
                    )
                )
            
            risk_score = result.get('risk_score')
            logger.info(f"✅ [MaxMindMinFraudTool] IP scored successfully: ip_address={ip_address}, risk_score={risk_score}, result_keys={list(result.keys())}")
            logger.debug(f"🔍 [MaxMindMinFraudTool] Full result: {json.dumps(result, indent=2)}")
            
            result_json = json.dumps(result, indent=2)
            logger.info(f"✅ [MaxMindMinFraudTool] Returning result, length={len(result_json)}")
            
            return result_json
            
        except Exception as e:
            logger.error(f"❌ [MaxMindMinFraudTool] IP scoring failed: ip_address={ip_address}, error={e}", exc_info=True)
            error_result = json.dumps({
                "error": str(e),
                "ip_address": ip_address,
                "transaction_id": transaction_id,
                "error_type": type(e).__name__,
            })
            logger.error(f"❌ [MaxMindMinFraudTool] Returning error result: {error_result}")
            return error_result
    
    async def _arun(
        self,
        ip_address: str,
        transaction_id: Optional[str] = None,
        email: Optional[str] = None,
        billing_country: Optional[str] = None,
        transaction_amount: Optional[float] = None,
        currency: Optional[str] = None,
    ) -> str:
        """Async version of IP risk scoring."""
        import json
        
        logger.info(f"🔍 [MaxMindMinFraudTool] Starting async IP risk scoring: ip_address={ip_address}, transaction_id={transaction_id}")
        
        try:
            if self.maxmind_client is None:
                raise RuntimeError("MaxMindClient not initialized")
            logger.debug(f"🔍 [MaxMindMinFraudTool] MaxMindClient initialized for async call")
            
            result = await self.maxmind_client.score_transaction_with_fallback(
                transaction_id=transaction_id or f"tool_{ip_address}",
                ip_address=ip_address,
                email=email,
                billing_country=billing_country,
                transaction_amount=transaction_amount,
                currency=currency
            )
            
            risk_score = result.get('risk_score')
            logger.info(f"✅ [MaxMindMinFraudTool] Async IP scored successfully: ip_address={ip_address}, risk_score={risk_score}")
            logger.debug(f"🔍 [MaxMindMinFraudTool] Async result keys: {list(result.keys())}")
            
            result_json = json.dumps(result, indent=2)
            return result_json
            
        except Exception as e:
            logger.error(f"❌ [MaxMindMinFraudTool] Async IP scoring failed: ip_address={ip_address}, error={e}", exc_info=True)
            return json.dumps({
                "error": str(e),
                "ip_address": ip_address,
                "transaction_id": transaction_id,
                "error_type": type(e).__name__,
            })

