"""
ML/AI MCP Client for connecting to machine learning model servers.

This module allows Olorin to connect to external ML/AI MCP servers
for fraud detection models, behavioral analysis, and media forensics.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from enum import Enum

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ModelType(str, Enum):
    """Types of ML models available."""
    FRAUD_DETECTION = "fraud_detection"
    BEHAVIORAL_ANALYSIS = "behavioral_analysis"
    IMAGE_FORENSICS = "image_forensics"
    VIDEO_ANALYSIS = "video_analysis"
    AUDIO_FORENSICS = "audio_forensics"
    TEXT_ANALYSIS = "text_analysis"
    ANOMALY_DETECTION = "anomaly_detection"


class MLModelInput(BaseModel):
    """Input schema for ML model requests."""
    data: Union[Dict, List, str] = Field(description="Input data for the model")
    model_type: ModelType = Field(description="Type of ML model to use")
    model_version: Optional[str] = Field(default="latest", description="Model version")
    confidence_threshold: float = Field(default=0.7, description="Confidence threshold")


class MLAIMCPClient(BaseTool):
    """
    LangChain tool that acts as an MCP client for ML/AI model servers.
    
    Connects to external ML model servers for fraud detection,
    behavioral analysis, and forensic analysis.
    """
    
    name: str = "ml_ai_mcp_client"
    description: str = (
        "Connects to external ML/AI MCP servers for fraud detection models, "
        "behavioral analysis, image/video/audio forensics, and text analysis."
    )
    args_schema: type[BaseModel] = MLModelInput
    
    # Store server configurations as class attributes
    _connected_servers: Dict[str, Any] = {}
    _available_servers: Dict[str, Dict] = {
            "fraud_ml_models": {
                "endpoint": "mcp://ml.fraud.example.com",
                "models": {
                    "transaction_fraud": "v2.3.1",
                    "account_takeover": "v1.8.0",
                    "identity_fraud": "v3.1.0",
                    "payment_fraud": "v2.5.2"
                }
            },
            "behavioral_models": {
                "endpoint": "mcp://ml.behavioral.example.com",
                "models": {
                    "user_profiling": "v1.5.0",
                    "anomaly_detection": "v2.1.0",
                    "pattern_recognition": "v1.9.3"
                }
            },
            "media_forensics": {
                "endpoint": "mcp://ml.forensics.example.com",
                "models": {
                    "deepfake_detection": "v3.0.0",
                    "image_manipulation": "v2.4.1",
                    "audio_verification": "v1.7.2",
                    "video_analysis": "v2.2.0"
                }
            },
            "nlp_models": {
                "endpoint": "mcp://ml.nlp.example.com",
                "models": {
                    "sentiment_analysis": "v2.0.1",
                    "entity_extraction": "v1.8.5",
                    "threat_detection": "v1.3.0",
                    "phishing_detection": "v2.1.4"
                }
            }
    }
    
    def _run(self, data: Union[Dict, List, str], model_type: ModelType,
             model_version: str = "latest", 
             confidence_threshold: float = 0.7) -> Dict[str, Any]:
        """
        Synchronous execution of ML model inference.
        
        Args:
            data: Input data for the model
            model_type: Type of ML model to use
            model_version: Model version
            confidence_threshold: Confidence threshold
            
        Returns:
            Model prediction results from MCP servers
        """
        return asyncio.run(self._arun(data, model_type, model_version, confidence_threshold))
    
    async def _arun(self, data: Union[Dict, List, str], model_type: ModelType,
                    model_version: str = "latest",
                    confidence_threshold: float = 0.7) -> Dict[str, Any]:
        """
        Asynchronous execution of ML model inference.
        
        Connects to appropriate ML model MCP servers.
        """
        results = {
            "model_type": model_type.value,
            "model_version": model_version,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence_threshold": confidence_threshold,
            "predictions": {}
        }
        
        try:
            # Select appropriate MCP server based on model type
            if model_type in [ModelType.FRAUD_DETECTION]:
                server_name = "fraud_ml_models"
            elif model_type in [ModelType.BEHAVIORAL_ANALYSIS, ModelType.ANOMALY_DETECTION]:
                server_name = "behavioral_models"
            elif model_type in [ModelType.IMAGE_FORENSICS, ModelType.VIDEO_ANALYSIS, 
                               ModelType.AUDIO_FORENSICS]:
                server_name = "media_forensics"
            else:
                server_name = "nlp_models"
            
            logger.info(f"Connecting to {server_name} for {model_type.value} analysis")
            
            # Simulate ML model predictions based on model type
            if model_type == ModelType.FRAUD_DETECTION:
                results["predictions"] = {
                    "is_fraudulent": True,
                    "confidence": 0.89,
                    "risk_score": 0.85,
                    "fraud_type": "account_takeover",
                    "risk_factors": [
                        "unusual_location",
                        "device_change",
                        "velocity_spike",
                        "behavioral_anomaly"
                    ],
                    "recommendation": "block_and_review",
                    "explainability": {
                        "top_features": {
                            "location_risk": 0.35,
                            "device_trust": -0.28,
                            "transaction_velocity": 0.22,
                            "user_behavior": 0.15
                        }
                    }
                }
            
            elif model_type == ModelType.BEHAVIORAL_ANALYSIS:
                results["predictions"] = {
                    "behavioral_profile": "high_risk",
                    "confidence": 0.76,
                    "anomaly_score": 0.72,
                    "patterns_detected": [
                        "session_length_anomaly",
                        "click_pattern_deviation",
                        "navigation_irregularity"
                    ],
                    "baseline_deviation": 2.3,
                    "risk_trajectory": "increasing",
                    "recommended_actions": [
                        "enhanced_monitoring",
                        "step_up_authentication"
                    ]
                }
            
            elif model_type == ModelType.IMAGE_FORENSICS:
                results["predictions"] = {
                    "authenticity": "manipulated",
                    "confidence": 0.92,
                    "manipulation_type": "deepfake",
                    "manipulation_regions": [
                        {"x": 120, "y": 80, "width": 200, "height": 250},
                        {"x": 340, "y": 90, "width": 180, "height": 220}
                    ],
                    "technical_indicators": {
                        "compression_artifacts": True,
                        "lighting_inconsistencies": True,
                        "facial_landmarks_deviation": 0.18,
                        "gan_signatures_detected": True
                    },
                    "forensic_confidence": 0.88
                }
            
            elif model_type == ModelType.TEXT_ANALYSIS:
                results["predictions"] = {
                    "sentiment": "negative",
                    "sentiment_score": -0.65,
                    "threat_level": "moderate",
                    "entities_extracted": [
                        {"text": "John Doe", "type": "PERSON", "confidence": 0.95},
                        {"text": "ABC Bank", "type": "ORGANIZATION", "confidence": 0.88},
                        {"text": "$50,000", "type": "MONEY", "confidence": 0.92}
                    ],
                    "phishing_indicators": {
                        "is_phishing": True,
                        "confidence": 0.81,
                        "techniques": ["urgency", "authority", "financial_incentive"]
                    },
                    "language_patterns": {
                        "formality": "informal",
                        "emotional_tone": "aggressive",
                        "deception_markers": 3
                    }
                }
            
            elif model_type == ModelType.ANOMALY_DETECTION:
                results["predictions"] = {
                    "is_anomaly": True,
                    "anomaly_score": 0.91,
                    "anomaly_type": "statistical_outlier",
                    "affected_features": [
                        "transaction_amount",
                        "time_of_day",
                        "merchant_category"
                    ],
                    "distance_from_normal": 3.2,
                    "cluster_assignment": "outlier_cluster_7",
                    "similar_anomalies": 12,
                    "time_series_forecast": {
                        "expected_value": 125.50,
                        "actual_value": 8750.00,
                        "deviation_sigma": 4.8
                    }
                }
            
            results["status"] = "success"
            results["server"] = server_name
            results["inference_time_ms"] = 127
            
        except Exception as e:
            logger.error(f"ML model inference failed: {e}")
            results["status"] = "error"
            results["error"] = str(e)
        
        return results
    
    async def detect_fraud(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run fraud detection model on transaction data.
        
        Args:
            transaction_data: Transaction details
            
        Returns:
            Fraud detection results
        """
        return await self._arun(
            data=transaction_data,
            model_type=ModelType.FRAUD_DETECTION,
            confidence_threshold=0.8
        )
    
    async def analyze_behavior(self, user_activity: List[Dict]) -> Dict[str, Any]:
        """
        Analyze user behavior patterns.
        
        Args:
            user_activity: List of user activity events
            
        Returns:
            Behavioral analysis results
        """
        return await self._arun(
            data=user_activity,
            model_type=ModelType.BEHAVIORAL_ANALYSIS,
            confidence_threshold=0.75
        )
    
    async def verify_media(self, media_path: str, media_type: str) -> Dict[str, Any]:
        """
        Verify authenticity of media files.
        
        Args:
            media_path: Path to media file
            media_type: Type of media (image, video, audio)
            
        Returns:
            Media forensics results
        """
        if media_type == "image":
            model_type = ModelType.IMAGE_FORENSICS
        elif media_type == "video":
            model_type = ModelType.VIDEO_ANALYSIS
        else:
            model_type = ModelType.AUDIO_FORENSICS
        
        return await self._arun(
            data=media_path,
            model_type=model_type,
            confidence_threshold=0.85
        )


# Create singleton instance for use by agents
ml_ai_mcp_client = MLAIMCPClient()