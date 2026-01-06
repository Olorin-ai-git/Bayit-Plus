"""
Device Fingerprint Tool for LangChain Agents

Provides device fingerprint analysis capabilities for fraud investigation agents.
Uses DeviceRiskScorer for real device feature queries from PostgreSQL views.
"""

from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, ConfigDict, Field

from app.service.device_fingerprint.risk_scorer import DeviceRiskScorer
from app.service.device_fingerprint.sdk_manager import SDKManager
from app.service.device_fingerprint.signal_processor import SignalProcessor
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DeviceFingerprintAnalysisInput(BaseModel):
    """Input schema for device fingerprint analysis."""

    device_id: str = Field(..., description="Device ID to analyze")
    transaction_id: Optional[str] = Field(
        None, description="Optional transaction ID for context"
    )
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
    risk_scorer: Optional[DeviceRiskScorer] = None

    def __init__(self, **kwargs):
        """Initialize device fingerprint tool."""
        super().__init__(**kwargs)
        object.__setattr__(self, "signal_processor", SignalProcessor())
        object.__setattr__(self, "sdk_manager", SDKManager())
        object.__setattr__(self, "risk_scorer", DeviceRiskScorer())

    def _run(
        self,
        device_id: str,
        transaction_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Analyze device fingerprint using DeviceRiskScorer.

        Args:
            device_id: Device ID to analyze
            transaction_id: Optional transaction ID
            user_id: Optional user ID

        Returns:
            JSON string with device analysis results
        """
        import json
        from datetime import datetime

        logger.info(
            f"[DeviceFingerprintTool] Starting analysis for device_id={device_id}"
        )

        try:
            # Compute device risk score using DeviceRiskScorer service
            risk_data = self.risk_scorer.compute_device_risk_score(device_id)

            analysis = {
                "device_id": device_id,
                "transaction_id": transaction_id,
                "user_id": user_id,
                "shared_device_count": risk_data.get("shared_device_count", 0),
                "device_age_days": risk_data.get("device_age_days", 0),
                "device_risk_score": risk_data.get("risk_score", 0.5),
                "risk_factors": risk_data.get("risk_factors", []),
                "associated_accounts": [],
                "analysis_timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(
                f"[DeviceFingerprintTool] Computed analysis: device_id={device_id}, "
                f"risk_score={analysis['device_risk_score']}, "
                f"shared_devices={analysis['shared_device_count']}"
            )

            return json.dumps(analysis, indent=2)

        except Exception as e:
            logger.error(
                f"[DeviceFingerprintTool] Analysis failed for device_id={device_id}: {e}",
                exc_info=True,
            )
            return json.dumps(
                {
                    "error": str(e),
                    "device_id": device_id,
                    "transaction_id": transaction_id,
                    "user_id": user_id,
                }
            )

    async def _arun(
        self,
        device_id: str,
        transaction_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """Async version of device fingerprint analysis."""
        return self._run(device_id, transaction_id, user_id)
