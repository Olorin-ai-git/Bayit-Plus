"""
Device Fingerprint Tool for LangChain Agents

Provides device fingerprint analysis capabilities for fraud investigation agents.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

from langchain_core.tools import BaseTool
from app.service.logging import get_bridge_logger
from app.service.device_fingerprint.signal_processor import SignalProcessor
from app.service.device_fingerprint.sdk_manager import SDKManager

logger = get_bridge_logger(__name__)


class DeviceFingerprintAnalysisInput(BaseModel):
    """Input schema for device fingerprint analysis."""
    device_id: str = Field(..., description="Device ID to analyze")
    transaction_id: Optional[str] = Field(None, description="Optional transaction ID for context")
    user_id: Optional[str] = Field(None, description="Optional user ID for context")


class DeviceFingerprintTool(BaseTool):
    """
    Tool for analyzing device fingerprints and computing device-based fraud signals.
    
    Provides:
    - Device risk scoring
    - Shared device detection
    - Device age analysis
    - Multi-accounting detection
    """
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name: str = "device_fingerprint_analysis"
    description: str = """
    Analyze device fingerprint signals for fraud detection.
    
    Use this tool to:
    - Get device risk score based on shared device count and device age
    - Detect multi-accounting patterns (same device across multiple accounts)
    - Analyze device sharing patterns
    - Compute device-based fraud features
    
    Input: device_id (required), transaction_id (optional), user_id (optional)
    Output: Device analysis with risk score, shared device count, device age, and risk factors
    """
    args_schema: type[BaseModel] = DeviceFingerprintAnalysisInput
    
    signal_processor: Optional[SignalProcessor] = None
    sdk_manager: Optional[SDKManager] = None
    
    def __init__(self, **kwargs):
        """Initialize device fingerprint tool."""
        super().__init__(**kwargs)
        object.__setattr__(self, 'signal_processor', SignalProcessor())
        object.__setattr__(self, 'sdk_manager', SDKManager())
    
    def _run(
        self,
        device_id: str,
        transaction_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Analyze device fingerprint.
        
        Args:
            device_id: Device ID to analyze
            transaction_id: Optional transaction ID
            user_id: Optional user ID
            
        Returns:
            JSON string with device analysis results
        """
        import json
        from datetime import datetime
        
        logger.info(f"🔍 [DeviceFingerprintTool] Starting analysis for device_id={device_id}, transaction_id={transaction_id}, user_id={user_id}")
        
        try:
            # TODO: Query Snowflake for device signals and compute features
            # For now, return placeholder analysis
            
            logger.debug(f"🔍 [DeviceFingerprintTool] Initializing signal processor and SDK manager")
            signal_processor_initialized = self.signal_processor is not None
            sdk_manager_initialized = self.sdk_manager is not None
            logger.debug(f"🔍 [DeviceFingerprintTool] SignalProcessor initialized: {signal_processor_initialized}, SDKManager initialized: {sdk_manager_initialized}")
            
            analysis = {
                "device_id": device_id,
                "transaction_id": transaction_id,
                "user_id": user_id,
                "shared_device_count": 0,  # TODO: Query from Snowflake
                "device_age_days": 0,  # TODO: Query from Snowflake
                "device_risk_score": 0.5,  # TODO: Compute from features
                "risk_factors": [],
                "associated_accounts": [],  # TODO: Query from Snowflake
                "analysis_timestamp": datetime.utcnow().isoformat(),
            }
            
            logger.info(f"🔍 [DeviceFingerprintTool] Computed analysis: device_id={device_id}, risk_score={analysis['device_risk_score']}, shared_devices={analysis['shared_device_count']}")
            
            # Placeholder: In production, this would:
            # 1. Query Snowflake device_signals table for this device_id
            # 2. Compute shared_device_count (count of unique user_ids for this device)
            # 3. Compute device_age (time since first_seen)
            # 4. Compute device_risk_score using risk_scorer service
            # 5. Identify associated accounts (users sharing this device)
            
            result_json = json.dumps(analysis, indent=2)
            logger.info(f"✅ [DeviceFingerprintTool] Analysis completed successfully for device_id={device_id}, result_length={len(result_json)}")
            
            return result_json
            
        except Exception as e:
            logger.error(f"❌ [DeviceFingerprintTool] Analysis failed for device_id={device_id}: {e}", exc_info=True)
            error_result = json.dumps({
                "error": str(e),
                "device_id": device_id,
                "transaction_id": transaction_id,
                "user_id": user_id,
            })
            logger.error(f"❌ [DeviceFingerprintTool] Returning error result: {error_result}")
            return error_result
    
    async def _arun(
        self,
        device_id: str,
        transaction_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """Async version of device fingerprint analysis."""
        return self._run(device_id, transaction_id, user_id)

