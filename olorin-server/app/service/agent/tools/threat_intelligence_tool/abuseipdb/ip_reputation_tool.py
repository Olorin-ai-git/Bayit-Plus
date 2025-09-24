"""
AbuseIPDB IP Reputation Tool

LangChain tool for checking IP address reputation using AbuseIPDB API.
Provides comprehensive IP threat intelligence for fraud investigation workflows.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, validator

from ..base_threat_tool import BaseThreatIntelligenceTool, ThreatIntelligenceConfig, ThreatIntelligenceResponse
from .abuseipdb_client import AbuseIPDBClient
from .models import AbuseIPDBConfig, AbuseIPDBError, IPReputationResponse
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class IPReputationInput(BaseModel):
    """Input schema for IP reputation check."""
    
    ip: str = Field(
        ...,
        description="IP address to check (IPv4 or IPv6)",
        examples=["[IP]", "[IPv6_ADDRESS]"]
    )
    max_age_days: int = Field(
        default=90,
        description="Maximum age of reports to consider (1-365 days)",
        ge=1,
        le=365
    )
    include_details: bool = Field(
        default=True,
        description="Include detailed information about the IP"
    )
    
    @validator('ip')
    def validate_ip_address(cls, v):
        """Validate IP address format."""
        import ipaddress
        import re
        
        # Check for common entity ID patterns that might be passed incorrectly
        entity_patterns = [
            r'^[A-Z0-9]{16}$',  # 16-character alphanumeric (like K1F6HIIGBVHH20TX)
            r'^[a-f0-9\-]{36}$',  # UUID format
            r'^[a-zA-Z0-9_\-]+::[a-f0-9\-]{36}$',  # Entity ID with UUID
        ]
        
        for pattern in entity_patterns:
            if re.match(pattern, v):
                raise ValueError(f"Entity ID detected where IP address expected: {v}. Please extract actual IP addresses from the investigation context data sources.")
        
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address format: {v}. Expected valid IPv4 or IPv6 address format.")


class IPReputationTool(BaseThreatIntelligenceTool):
    """
    Tool for checking IP address reputation using AbuseIPDB.
    
    Features:
    - IP reputation scoring and analysis
    - Geolocation and ISP information
    - Abuse report history
    - Risk assessment and recommendations
    - Comprehensive fraud investigation context
    """
    
    name = "abuseipdb_ip_reputation"
    description = (
        "Check IP address reputation and threat intelligence using AbuseIPDB. "
        "Provides abuse confidence scores, geolocation data, ISP information, "
        "and detailed threat analysis for fraud investigation workflows. "
        "Returns comprehensive risk assessment with actionable insights."
    )
    args_schema: Type[BaseModel] = IPReputationInput

    def __init__(self, **kwargs):
        """Initialize IP reputation tool."""
        # Configure threat intelligence settings
        threat_config = ThreatIntelligenceConfig(
            api_key_secret_name="ABUSEIPDB_API_KEY",
            cache_ttl_seconds=3600,  # 1 hour cache
            rate_limit_requests=1000,  # Daily limit
            timeout_seconds=30,
            enable_caching=True
        )
        
        super().__init__(
            name=self.name,
            description=self.description,
            config=threat_config,
            **kwargs
        )
        
        # Initialize AbuseIPDB client
        self.abuseipdb_config = AbuseIPDBConfig(
            api_key_secret=threat_config.api_key_secret_name,
            timeout=threat_config.timeout_seconds,
            max_retries=threat_config.max_retries,
            rate_limit_requests=threat_config.rate_limit_requests,
            cache_ttl=threat_config.cache_ttl_seconds
        )
        
        self.client = AbuseIPDBClient(self.abuseipdb_config)

    async def _execute_threat_query(
        self, 
        query_type: str, 
        query_data: Dict[str, Any]
    ) -> ThreatIntelligenceResponse:
        """Execute IP reputation query via AbuseIPDB API."""
        try:
            # Extract parameters
            ip = query_data["ip"]
            max_age_days = query_data.get("max_age_days", 90)
            include_details = query_data.get("include_details", True)
            
            # Query AbuseIPDB
            reputation_response = await self.client.check_ip_reputation(
                ip=ip,
                max_age_days=max_age_days,
                verbose=include_details
            )
            
            if reputation_response.success:
                # Generate comprehensive analysis
                analysis_data = self._generate_threat_analysis(reputation_response)
                
                return ThreatIntelligenceResponse(
                    success=True,
                    data=analysis_data,
                    source="AbuseIPDB",
                    timestamp=datetime.utcnow(),
                    confidence_score=self._calculate_confidence_score(reputation_response)
                )
            else:
                return ThreatIntelligenceResponse(
                    success=False,
                    error=reputation_response.error or "Unknown error",
                    source="AbuseIPDB",
                    timestamp=datetime.utcnow()
                )
                
        except AbuseIPDBError as e:
            # Handle specific subscription errors gracefully
            if e.status_code == 402:
                logger.debug(f"AbuseIPDB analysis skipped for {ip}: subscription required")
                return ThreatIntelligenceResponse(
                    success=False,
                    error="AbuseIPDB subscription required for this endpoint",
                    source="AbuseIPDB", 
                    timestamp=datetime.utcnow(),
                    status="subscription_required"
                )
            elif "subscription" in str(e).lower():
                logger.debug(f"AbuseIPDB analysis limited for {ip}: subscription required")
                return ThreatIntelligenceResponse(
                    success=False,
                    error=str(e),
                    source="AbuseIPDB",
                    timestamp=datetime.utcnow(),
                    status="subscription_required"
                )
            else:
                logger.warning(f"AbuseIPDB analysis failed for {ip}: {type(e).__name__}")
                return ThreatIntelligenceResponse(
                    success=False,
                    error=f"AbuseIPDB API error: {str(e)}",
                    source="AbuseIPDB",
                    timestamp=datetime.utcnow(),
                    status="api_error"
                )
        except Exception as e:
            logger.warning(f"AbuseIPDB analysis unavailable for {ip}: {type(e).__name__}")
            return ThreatIntelligenceResponse(
                success=False,
                error=f"Service temporarily unavailable ({type(e).__name__})",
                source="AbuseIPDB",
                timestamp=datetime.utcnow(),
                status="unavailable"
            )

    def _generate_threat_analysis(self, response: IPReputationResponse) -> Dict[str, Any]:
        """Generate comprehensive threat analysis from AbuseIPDB response."""
        if not response.ip_info:
            return {"error": "No IP information available"}
        
        ip_info = response.ip_info
        risk_level = response.get_risk_level()
        
        # Apply reputation data normalization
        normalized_assessment = self._normalize_reputation_data(ip_info)
        
        # Core IP information
        analysis = {
            "ip": ip_info.ip,
            "reputation_summary": {
                "abuse_confidence": ip_info.abuse_confidence_percentage,
                "risk_level": risk_level,
                "normalized_risk_level": normalized_assessment["normalized_risk_level"],
                "data_quality_score": normalized_assessment["data_quality_score"],
                "is_whitelisted": ip_info.is_whitelisted,
                "total_reports": ip_info.total_reports,
                "distinct_reporters": ip_info.num_distinct_users,
                "last_reported": ip_info.last_reported_at.isoformat() if ip_info.last_reported_at else None
            },
            "network_information": {
                "ip_version": ip_info.ip_version,
                "is_public": ip_info.is_public,
                "usage_type": ip_info.usage_type,
                "isp": ip_info.isp,
                "domain": ip_info.domain
            },
            "geolocation": {
                "country_code": ip_info.country_code,
                "country_name": ip_info.country_name
            },
            "threat_assessment": self._generate_threat_assessment(ip_info, risk_level),
            "investigation_recommendations": self._generate_recommendations(ip_info, risk_level),
            "data_quality_assessment": normalized_assessment,
            "metadata": {
                "response_time_ms": response.response_time_ms,
                "cached": response.cached,
                "analysis_timestamp": datetime.utcnow().isoformat()
            }
        }
        
        return analysis

    def _normalize_reputation_data(self, ip_info) -> Dict[str, Any]:
        """
        Normalize reputation data to detect and correct inconsistencies.
        
        This addresses cases where external reputation sources may have outdated
        or inconsistent data compared to internal fraud models.
        """
        confidence = ip_info.abuse_confidence_percentage
        total_reports = ip_info.total_reports
        is_whitelisted = ip_info.is_whitelisted
        usage_type = ip_info.usage_type or ""
        
        # Calculate data quality indicators
        data_quality_factors = []
        data_quality_score = 1.0
        
        # Factor 1: Report freshness and volume consistency
        if confidence == 0 and total_reports > 0:
            data_quality_factors.append("Zero confidence despite existing reports")
            data_quality_score -= 0.3
        
        # Factor 2: Hosting infrastructure risk assessment
        if usage_type.lower() in ["hosting", "datacenter", "cloud"] and confidence < 25:
            data_quality_factors.append("Low confidence for hosting infrastructure")
            data_quality_score -= 0.2
            
        # Factor 3: Whitelisted but suspicious patterns
        if is_whitelisted and confidence > 0:
            data_quality_factors.append("Whitelisted IP with abuse reports")
            data_quality_score -= 0.15
            
        # Factor 4: Time-based reputation lag
        if ip_info.last_reported_at:
            days_since_last_report = (datetime.utcnow() - ip_info.last_reported_at).days
            if days_since_last_report > 90 and confidence < 25:
                data_quality_factors.append("Potentially stale reputation data")
                data_quality_score -= 0.25
        
        # Normalize risk level based on data quality assessment
        normalized_risk_level = self._calculate_normalized_risk_level(
            confidence, data_quality_score, data_quality_factors
        )
        
        return {
            "normalized_risk_level": normalized_risk_level,
            "data_quality_score": max(0.0, data_quality_score),
            "data_quality_factors": data_quality_factors,
            "reputation_reliability": self._assess_reputation_reliability(
                confidence, total_reports, data_quality_score
            ),
            "recommendation": self._get_normalization_recommendation(
                confidence, normalized_risk_level, data_quality_score
            )
        }
    
    def _calculate_normalized_risk_level(
        self, 
        confidence: int, 
        data_quality_score: float, 
        quality_factors: List[str]
    ) -> str:
        """Calculate normalized risk level accounting for data quality issues."""
        
        # If data quality is poor, be more conservative
        if data_quality_score < 0.5:
            if confidence <= 25:
                return "MEDIUM_RISK_DUE_TO_DATA_UNCERTAINTY"
            elif confidence <= 50:
                return "HIGH_RISK_CONFIRMED"
            else:
                return "CRITICAL_RISK_CONFIRMED"
        
        # Normal risk level calculation for good data quality
        if confidence >= 90:
            return "CRITICAL"
        elif confidence >= 75:
            return "HIGH"
        elif confidence >= 50:
            return "MEDIUM"
        elif confidence >= 25:
            return "LOW"
        else:
            return "MINIMAL"
    
    def _assess_reputation_reliability(
        self, 
        confidence: int, 
        total_reports: int, 
        data_quality_score: float
    ) -> str:
        """Assess the reliability of reputation data."""
        
        if data_quality_score >= 0.8 and total_reports >= 5:
            return "HIGH_RELIABILITY"
        elif data_quality_score >= 0.6 and total_reports >= 2:
            return "MEDIUM_RELIABILITY"
        elif data_quality_score >= 0.4:
            return "LOW_RELIABILITY"
        else:
            return "QUESTIONABLE_RELIABILITY"
    
    def _get_normalization_recommendation(
        self, 
        original_confidence: int, 
        normalized_risk: str, 
        data_quality_score: float
    ) -> str:
        """Generate recommendation based on normalization results."""
        
        if data_quality_score < 0.5:
            return (
                f"CAUTION: Low data quality score ({data_quality_score:.2f}). "
                f"Consider cross-referencing with additional reputation sources. "
                f"Original confidence {original_confidence}% may be unreliable."
            )
        elif "UNCERTAINTY" in normalized_risk:
            return (
                f"Data quality concerns detected. Recommend manual review or "
                f"additional verification for IP with {original_confidence}% confidence."
            )
        else:
            return f"Reputation data appears reliable (quality: {data_quality_score:.2f})"

    def _generate_threat_assessment(self, ip_info, risk_level: str) -> Dict[str, Any]:
        """Generate detailed threat assessment."""
        confidence = ip_info.abuse_confidence_percentage
        
        # Risk categorization
        if confidence >= 90:
            threat_level = "CRITICAL"
            description = "Extremely high threat - actively malicious"
        elif confidence >= 75:
            threat_level = "HIGH" 
            description = "High threat - likely malicious activity"
        elif confidence >= 50:
            threat_level = "MEDIUM"
            description = "Medium threat - suspicious activity detected"
        elif confidence >= 25:
            threat_level = "LOW"
            description = "Low threat - minimal suspicious activity"
        else:
            threat_level = "MINIMAL"
            description = "Minimal threat - clean reputation"
        
        # Additional risk factors
        risk_factors = []
        
        if ip_info.total_reports > 0:
            risk_factors.append(f"Reported {ip_info.total_reports} times by {ip_info.num_distinct_users} users")
        
        if ip_info.usage_type:
            if ip_info.usage_type.lower() in ["hosting", "datacenter", "cloud"]:
                risk_factors.append("Hosted infrastructure - higher risk for abuse")
            elif ip_info.usage_type.lower() in ["residential", "broadband"]:
                risk_factors.append("Residential connection - potentially compromised")
        
        if ip_info.is_whitelisted:
            risk_factors.append("Whitelisted IP - verified legitimate use")
        
        return {
            "threat_level": threat_level,
            "description": description,
            "risk_score": confidence,
            "risk_factors": risk_factors,
            "fraud_investigation_impact": self._assess_fraud_impact(ip_info, confidence)
        }

    def _assess_fraud_impact(self, ip_info, confidence: int) -> Dict[str, Any]:
        """Assess impact on fraud investigation."""
        impact_level = "LOW"
        recommendations = []
        
        if confidence >= 75:
            impact_level = "HIGH"
            recommendations.extend([
                "Block or flag transactions from this IP",
                "Review all recent activities from this IP address",
                "Consider additional verification for users from this IP"
            ])
        elif confidence >= 50:
            impact_level = "MEDIUM" 
            recommendations.extend([
                "Monitor transactions from this IP closely",
                "Apply enhanced security measures",
                "Review user behavior patterns"
            ])
        elif confidence >= 25:
            impact_level = "LOW"
            recommendations.append("Standard monitoring recommended")
        else:
            recommendations.append("No special action required")
        
        # Geographic considerations
        if ip_info.country_code and ip_info.country_code in ["CN", "RU", "KP", "IR"]:
            recommendations.append("Geographic risk factor - enhanced monitoring recommended")
        
        return {
            "fraud_impact_level": impact_level,
            "recommendations": recommendations,
            "investigation_priority": self._determine_investigation_priority(confidence),
            "suggested_actions": self._suggest_investigation_actions(ip_info, confidence)
        }

    def _determine_investigation_priority(self, confidence: int) -> str:
        """Determine investigation priority based on confidence score."""
        if confidence >= 90:
            return "IMMEDIATE"
        elif confidence >= 75:
            return "HIGH"
        elif confidence >= 50:
            return "MEDIUM"
        elif confidence >= 25:
            return "LOW"
        else:
            return "ROUTINE"

    def _suggest_investigation_actions(self, ip_info, confidence: int) -> List[str]:
        """Suggest specific investigation actions."""
        actions = []
        
        if confidence >= 75:
            actions.extend([
                "Cross-reference with internal fraud database",
                "Check for related account activities",
                "Review transaction patterns from this IP",
                "Consider temporary access restrictions"
            ])
        
        if confidence >= 50:
            actions.extend([
                "Monitor for unusual transaction patterns",
                "Apply additional authentication requirements",
                "Review user verification status"
            ])
        
        if ip_info.isp and "hosting" in ip_info.isp.lower():
            actions.append("Verify legitimate business use for hosting IP")
        
        if ip_info.domain:
            actions.append(f"Investigate associated domain: {ip_info.domain}")
        
        return actions

    def _generate_recommendations(self, ip_info, risk_level: str) -> List[str]:
        """Generate investigation recommendations."""
        recommendations = []
        
        confidence = ip_info.abuse_confidence_percentage
        
        if risk_level == "high" or risk_level == "very_high":
            recommendations.extend([
                "🚨 HIGH RISK: Consider blocking or restricting access",
                "📊 Perform comprehensive fraud risk assessment", 
                "🔍 Cross-reference with known fraud patterns",
                "⚠️ Apply enhanced transaction monitoring"
            ])
        elif risk_level == "medium":
            recommendations.extend([
                "🔍 Monitor transactions and user behavior",
                "📋 Apply additional verification steps",
                "🎯 Flag for manual review if suspicious patterns emerge"
            ])
        elif risk_level == "low":
            recommendations.append("✅ Standard monitoring sufficient")
        else:
            recommendations.append("✅ Clean reputation - no special action required")
        
        # Additional context-specific recommendations
        if ip_info.total_reports > 10:
            recommendations.append(f"📈 Multiple reports ({ip_info.total_reports}) indicate persistent malicious activity")
        
        if ip_info.last_reported_at and (datetime.utcnow() - ip_info.last_reported_at).days < 7:
            recommendations.append("🕐 Recent reports suggest active threat")
        
        return recommendations

    def _calculate_confidence_score(self, response: IPReputationResponse) -> float:
        """Calculate normalized confidence score (0-1)."""
        if not response.success or not response.ip_info:
            return 0.0
        
        # Base confidence from AbuseIPDB (0-100) normalized to 0-1
        base_confidence = response.ip_info.abuse_confidence_percentage / 100.0
        
        # Adjust based on additional factors
        if response.ip_info.is_whitelisted:
            base_confidence = max(0.0, base_confidence - 0.3)  # Reduce confidence for whitelisted
        
        if response.ip_info.total_reports > 0:
            # More reports increase confidence slightly
            report_factor = min(0.1, response.ip_info.total_reports * 0.01)
            base_confidence = min(1.0, base_confidence + report_factor)
        
        return base_confidence

    async def _arun(
        self,
        ip: str,
        max_age_days: int = 90,
        include_details: bool = True,
        **kwargs
    ) -> str:
        """Execute IP reputation check."""
        try:
            query_data = {
                "ip": ip,
                "max_age_days": max_age_days,
                "include_details": include_details
            }
            
            response = await self.execute_threat_intelligence_query(
                query_type="ip_reputation",
                query_data=query_data
            )
            
            if response.success:
                return json.dumps(response.data, indent=2, default=str)
            else:
                return json.dumps({
                    "success": False,
                    "error": response.error,
                    "ip": ip,
                    "source": "AbuseIPDB"
                }, indent=2)
                
        except Exception as e:
            logger.error(f"IP reputation tool execution failed: {e}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "ip": ip,
                "source": "AbuseIPDB"
            }, indent=2)

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper (not recommended)."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))