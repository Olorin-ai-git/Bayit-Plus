"""VirusTotal Domain Analysis Tool for comprehensive domain threat intelligence."""

import ipaddress
import json
from app.service.agent.tools.async_helpers import safe_run_async
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, validator

from ..base_threat_tool import BaseThreatIntelligenceTool
from .models import VirusTotalDomainResponse, VirusTotalConfig
from .virustotal_client import VirusTotalClient
from app.service.logging import get_bridge_logger
from app.service.analytics.ip_domain_mapper import get_ip_domain_mapper


class DomainAnalysisInput(BaseModel):
    """Input schema for domain analysis."""
    
    domain: str = Field(..., description="Domain name to analyze (e.g., 'example.com'). IP addresses are not supported - use IP analysis tools instead.")
    include_subdomains: bool = Field(
        default=False, 
        description="Whether to include subdomain analysis in the report"
    )
    include_whois: bool = Field(
        default=True, 
        description="Whether to include WHOIS information in the analysis"
    )
    max_detections: int = Field(
        default=10, 
        description="Maximum number of detection details to include (1-50)"
    )
    
    @validator('domain')
    def validate_domain(cls, v):
        """Validate domain format and handle IP addresses."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Domain cannot be empty")
        
        # Handle bytes input that might come from external sources
        if isinstance(v, bytes):
            v = v.decode('utf-8', errors='ignore')
        
        domain = v.strip().lower()
        
        # Remove protocol if present
        if domain.startswith(('http://', 'https://')):
            domain = domain.split('://', 1)[1]
        
        # Remove path if present
        if '/' in domain:
            domain = domain.split('/', 1)[0]
        
        # Check if input is an IP address and try to get email domain from Snowflake
        try:
            ipaddress.ip(domain)
            # It's an IP address, try to get associated email domain from Snowflake
            logger = get_bridge_logger(__name__)
            logger.info(f"IP address {domain} detected, fetching associated email domain from Snowflake")
            
            try:
                # Query Snowflake for email associated with this IP
                from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
                from app.service.agent.tools.async_helpers import safe_run_async
                
                async def get_email_domain():
                    client = SnowflakeClient()
                    await client.connect()
                    query = f"""
                    SELECT DISTINCT EMAIL
                    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
                    WHERE IP = '{domain}'
                    LIMIT 1
                    """
                    results = await client.execute_query(query)
                    await client.disconnect()
                    
                    if results and results[0].get('EMAIL'):
                        email = results[0]['EMAIL']
                        # Extract domain from email
                        if '@' in email:
                            email_domain = email.split('@')[1].lower()
                            logger.info(f"Found email domain {email_domain} for IP {domain}")
                            return email_domain
                    return None
                
                email_domain = asyncio.run(get_email_domain())
                if email_domain:
                    return email_domain
                else:
                    logger.warning(f"No email domain found for IP {domain}")
                    raise ValueError(f"Domain analysis cannot be performed on IP address '{domain}'. No associated email domain found.")
                    
            except Exception as e:
                logger.error(f"Failed to fetch email domain for IP {domain}: {e}")
                raise ValueError(f"Domain analysis cannot be performed on IP address '{domain}'. Failed to fetch associated email domain.")
                
        except ipaddress.AddressValueError:
            # Not an IP address, continue with normal domain validation
            pass
        except ValueError as e:
            # Re-raise ValueError for IP addresses
            if "IP address" in str(e) or "Domain analysis cannot" in str(e):
                raise e
            pass
        
        # Basic domain validation
        if '.' not in domain or len(domain) > 253:
            raise ValueError(f"Domain '{domain}' is not a valid domain pattern")
        
        # Additional domain format checks
        if domain.startswith('.') or domain.endswith('.'):
            raise ValueError(f"Domain '{domain}' cannot start or end with a dot")
        
        # Check for consecutive dots
        if '..' in domain:
            raise ValueError(f"Domain '{domain}' cannot contain consecutive dots")
        
        return domain
    
    @validator('max_detections')
    def validate_max_detections(cls, v):
        """Validate max_detections range."""
        if not 1 <= v <= 50:
            raise ValueError("max_detections must be between 1 and 50")
        return v


class VirusTotalDomainAnalysisTool(BaseTool):
    """VirusTotal domain reputation and threat analysis tool."""
    
    name: str = "virustotal_domain_analysis"
    description: str = (
        "Analyze domain reputation and threat intelligence using VirusTotal. "
        "Provides comprehensive domain analysis including reputation scores, "
        "detection results from multiple security vendors, WHOIS information, "
        "and subdomain discovery. Use this for investigating suspicious domains "
        "in fraud detection workflows. NOTE: This tool is for domain names only "
        "(e.g., 'example.com'), not IP addresses. Use IP analysis tools for IP addresses."
    )
    args_schema: type = DomainAnalysisInput
    
    def __init__(self):
        """Initialize the VirusTotal domain analysis tool."""
        super().__init__()
        self._client: Optional[VirusTotalClient] = None
        self._virustotal_config: Optional[VirusTotalConfig] = None
    
    @property
    def client(self) -> VirusTotalClient:
        """Get or create VirusTotal client instance."""
        if self._client is None:
            self._virustotal_config = VirusTotalConfig()
            self._client = VirusTotalClient(self._virustotal_config)
        return self._client
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        return datetime.utcnow().isoformat()
    
    def _run(self, **kwargs) -> str:
        """Execute domain analysis synchronously."""
        from app.service.agent.tools.async_helpers import safe_run_async
        return safe_run_async(self._arun(**kwargs))
    
    async def _arun(
        self,
        domain: str,
        include_subdomains: bool = False,
        include_whois: bool = True,
        max_detections: int = 10,
        **kwargs
    ) -> str:
        """Execute domain analysis asynchronously."""
        try:
            # Check if we're in test/mock mode
            import os
            test_mode = os.environ.get('TEST_MODE', '').lower() in ['true', '1', 'yes', 'mock']
            
            if test_mode:
                # Return mock response for test mode
                logger = get_bridge_logger(__name__)
                logger.info(f"Mock mode active - returning mock response for domain {domain}")
                return json.dumps({
                    "domain": domain,
                    "status": "clean",
                    "risk_level": "LOW",
                    "reputation_score": 0,
                    "detection_stats": {
                        "malicious": 0,
                        "suspicious": 0,
                        "harmless": 70,
                        "undetected": 0
                    },
                    "community_votes": {
                        "harmless": 5,
                        "malicious": 0
                    },
                    "categories": ["technology"],
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis (Mock)",
                    "mock_mode": True
                }, indent=2)
            
            # Note: Caching would be implemented here in a production system
            
            # Analyze domain with VirusTotal
            domain_response = await self.client.analyze_domain(domain)
            
            # Check if the analysis was successful
            if not domain_response.success:
                # Handle specific error patterns from VirusTotal
                error_msg = domain_response.error or "Unknown error"
                if "InvalidArgumentError" in error_msg and "not a valid domain pattern" in error_msg:
                    logger = get_bridge_logger(__name__)
                    logger.debug(f"VirusTotal domain analysis validation failed for {domain}: {error_msg}")
                    return json.dumps({
                        "status": "validation_error",
                        "reason": "Invalid domain format for VirusTotal API",
                        "suggestion": "Ensure input is a valid domain name (not IP address or malformed string)",
                        "input": domain,
                        "timestamp": self._get_current_timestamp(),
                        "source": "VirusTotal Domain Analysis"
                    }, indent=2)
                else:
                    # Handle other API errors gracefully
                    logger = get_bridge_logger(__name__)
                    logger.warning(f"VirusTotal domain analysis failed for {domain}: {error_msg}")
                    return json.dumps({
                        "status": "error",
                        "reason": f"VirusTotal API error: {error_msg}",
                        "domain": domain,
                        "timestamp": self._get_current_timestamp(),
                        "source": "VirusTotal Domain Analysis"
                    }, indent=2)
            
            # Build comprehensive analysis result
            analysis_result = await self._build_domain_analysis(
                domain_response=domain_response,
                domain=domain,
                include_subdomains=include_subdomains,
                include_whois=include_whois,
                max_detections=max_detections
            )
            
            # Return the result
            result_json = json.dumps(analysis_result, indent=2, default=str)
            return result_json
            
        except ValueError as ve:
            # Handle validation errors (like IP address detection) differently
            if "IP address" in str(ve):
                error_msg = str(ve)
                logger = get_bridge_logger(__name__)
                logger.warning(f"Domain analysis validation failed: {error_msg}")
                return json.dumps({
                    "error": error_msg,
                    "error_type": "validation_error",
                    "suggestion": "Use an IP analysis tool (like virustotal_ip_analysis) for IP address investigation",
                    "input": domain,
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis"
                }, indent=2)
            else:
                # Re-raise other validation errors
                raise ve
                
        except Exception as e:
            logger = get_bridge_logger(__name__)
            error_str = str(e)
            
            # Handle specific known errors gracefully
            if "InvalidArgumentError" in error_str and "not a valid domain pattern" in error_str:
                logger.debug(f"VirusTotal domain analysis skipped for {domain}: invalid domain pattern (likely IP address)")
                return json.dumps({
                    "status": "skipped",
                    "reason": "VirusTotal domain analysis requires valid domain names, not IP addresses",
                    "suggestion": "Use IP analysis tools for IP address investigation",
                    "input": domain,
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis"
                }, indent=2)
            elif "VirusTotal API error 400" in error_str and "not a valid domain pattern" in error_str:
                # Handle the specific error format seen in the logs
                logger.debug(f"VirusTotal domain analysis failed for {domain}: API validation error")
                return json.dumps({
                    "status": "validation_error", 
                    "reason": "Invalid domain format for VirusTotal API",
                    "suggestion": "Ensure input is a valid domain name (not IP address or malformed string)",
                    "input": domain,
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis"
                }, indent=2)
            elif "API" in error_str and ("quota" in error_str.lower() or "limit" in error_str.lower()):
                logger.debug(f"VirusTotal domain analysis rate limited for {domain}: {error_str}")
                return json.dumps({
                    "status": "rate_limited",
                    "reason": "VirusTotal API quota exceeded",
                    "domain": domain,
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis"
                }, indent=2)
            elif "unauthorized" in error_str.lower() or "invalid api key" in error_str.lower():
                logger.error(f"VirusTotal domain analysis authentication failed for {domain}: {error_str}")
                return json.dumps({
                    "status": "authentication_failed",
                    "reason": "Invalid or missing VirusTotal API key",
                    "domain": domain,
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis"
                }, indent=2)
            else:
                # Handle all other exceptions gracefully
                logger.warning(f"VirusTotal domain analysis unavailable for {domain}: {type(e).__name__}")
                return json.dumps({
                    "status": "unavailable",
                    "reason": f"Service temporarily unavailable ({type(e).__name__})",
                    "domain": domain,
                    "timestamp": self._get_current_timestamp(),
                    "source": "VirusTotal Domain Analysis"
                }, indent=2)
    
    async def _build_domain_analysis(
        self,
        domain_response: VirusTotalDomainResponse,
        domain: str,
        include_subdomains: bool,
        include_whois: bool,
        max_detections: int
    ) -> Dict[str, Any]:
        """Build comprehensive domain analysis result."""
        
        # Basic domain information
        # Calculate risk level based on reputation and votes
        risk_level = "UNKNOWN"
        if domain_response.reputation is not None:
            if domain_response.reputation < -50:
                risk_level = "HIGH"
            elif domain_response.reputation < -10:
                risk_level = "MEDIUM"
            elif domain_response.reputation < 10:
                risk_level = "LOW"
            else:
                risk_level = "VERY_LOW"
        elif domain_response.malicious_votes > domain_response.harmless_votes:
            risk_level = "HIGH"
        elif domain_response.harmless_votes > domain_response.malicious_votes:
            risk_level = "LOW"

        domain_info = {
            "domain": domain,
            "analysis_timestamp": datetime.now().isoformat(),
            "source": "VirusTotal",
            "reputation_score": domain_response.reputation,
            "risk_level": risk_level,
            "harmless_votes": domain_response.harmless_votes,
            "malicious_votes": domain_response.malicious_votes
        }
        
        # Detection statistics
        if domain_response.analysis_stats:
            stats = domain_response.analysis_stats
            domain_info["detection_summary"] = {
                "total_engines": stats.total_engines,
                "malicious_detections": stats.malicious,
                "suspicious_detections": stats.suspicious,
                "clean_detections": stats.harmless,
                "undetected": stats.undetected,
                "detection_ratio": f"{stats.malicious + stats.suspicious}/{stats.total_engines}",
                "threat_verdict": stats.threat_verdict
            }
        
        # Categories and tags
        if domain_response.categories:
            domain_info["categories"] = list(domain_response.categories.values())[:5]
        
        if domain_response.tags:
            domain_info["threat_tags"] = domain_response.tags[:10]
        
        # Detection details from security vendors
        if domain_response.last_analysis_results and max_detections > 0:
            detections = []
            malicious_count = 0
            
            for engine, result in domain_response.last_analysis_results.items():
                if malicious_count >= max_detections:
                    break
                
                if result.category in ['malicious', 'suspicious']:
                    detections.append({
                        "engine": engine,
                        "category": result.category,
                        "result": result.result or "Unknown threat",
                        "method": result.method,
                        "engine_version": result.engine_version
                    })
                    malicious_count += 1
            
            if detections:
                domain_info["threat_detections"] = detections
        
        # WHOIS information
        if include_whois and hasattr(domain_response, 'whois_date') and domain_response.whois_date:
            domain_info["whois_info"] = {
                "creation_date": str(domain_response.whois_date),
                "registrar": getattr(domain_response, 'registrar', 'Unknown'),
                "country": getattr(domain_response, 'whois_country', 'Unknown')
            }
        
        # Subdomain information
        if include_subdomains and hasattr(domain_response, 'subdomains'):
            domain_info["subdomain_count"] = len(domain_response.subdomains or [])
            if domain_response.subdomains:
                domain_info["sample_subdomains"] = domain_response.subdomains[:10]
        
        # Risk assessment and recommendations
        domain_info["risk_assessment"] = self._assess_domain_risk(domain_response)
        domain_info["investigation_recommendations"] = self._generate_domain_recommendations(
            domain_response, domain
        )
        
        # Additional context
        domain_info["analysis_metadata"] = {
            "last_analysis_date": str(domain_response.last_analysis_date) if domain_response.last_analysis_date else None,
            "last_modification_date": str(domain_response.last_modification_date) if domain_response.last_modification_date else None,
            "popularity_ranks": domain_response.popularity_ranks or {},
            "total_votes": {
                "harmless": domain_response.total_votes.get('harmless', 0) if domain_response.total_votes else 0,
                "malicious": domain_response.total_votes.get('malicious', 0) if domain_response.total_votes else 0
            }
        }
        
        return {
            "domain_analysis": domain_info
        }
    
    def _assess_domain_risk(self, domain_response: VirusTotalDomainResponse) -> Dict[str, Any]:
        """Assess overall domain risk level."""
        
        if not domain_response.last_analysis_stats:
            return {
                "risk_level": "unknown",
                "confidence": "low",
                "risk_factors": ["No analysis data available"]
            }
        
        stats = domain_response.last_analysis_stats
        risk_factors = []
        risk_score = 0
        
        # Detection-based risk
        if stats.malicious > 0:
            risk_score += min(stats.malicious * 10, 50)
            risk_factors.append(f"{stats.malicious} malicious detections")
        
        if stats.suspicious > 0:
            risk_score += min(stats.suspicious * 5, 25)
            risk_factors.append(f"{stats.suspicious} suspicious detections")
        
        # Reputation-based risk
        if domain_response.reputation < -10:
            risk_score += 30
            risk_factors.append(f"Poor reputation score: {domain_response.reputation}")
        elif domain_response.reputation < 0:
            risk_score += 15
            risk_factors.append(f"Negative reputation: {domain_response.reputation}")
        
        # Tag-based risk
        dangerous_tags = ['malware', 'phishing', 'trojan', 'botnet', 'c2', 'suspicious']
        if domain_response.tags:
            found_dangerous_tags = [tag for tag in domain_response.tags if any(d in tag.lower() for d in dangerous_tags)]
            if found_dangerous_tags:
                risk_score += len(found_dangerous_tags) * 10
                risk_factors.extend(found_dangerous_tags)
        
        # Determine final risk level
        if risk_score >= 70:
            risk_level = "critical"
            confidence = "high"
        elif risk_score >= 50:
            risk_level = "high"
            confidence = "high"
        elif risk_score >= 30:
            risk_level = "medium"
            confidence = "medium"
        elif risk_score > 0:
            risk_level = "low"
            confidence = "medium"
        else:
            risk_level = "minimal"
            confidence = "high"
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "confidence": confidence,
            "risk_factors": risk_factors[:5]  # Limit to top 5 factors
        }
    
    def _generate_domain_recommendations(
        self, 
        domain_response: VirusTotalDomainResponse, 
        domain: str
    ) -> List[str]:
        """Generate investigation recommendations based on analysis."""
        
        recommendations = []
        
        if not domain_response.last_analysis_stats:
            return ["Insufficient data for recommendations - consider additional analysis"]
        
        stats = domain_response.last_analysis_stats
        
        # Detection-based recommendations
        if stats.malicious > 5:
            recommendations.append("CRITICAL: Multiple security vendors flagged this domain - block immediately")
            recommendations.append("Investigate all connections to this domain in your environment")
        elif stats.malicious > 0:
            recommendations.append("Domain flagged as malicious - investigate further before allowing access")
        
        if stats.suspicious > 3:
            recommendations.append("High suspicious activity - monitor traffic to this domain")
        
        # Reputation-based recommendations
        if domain_response.reputation < -50:
            recommendations.append("Extremely poor reputation - likely compromised or malicious")
        elif domain_response.reputation < -10:
            recommendations.append("Poor reputation - exercise caution with this domain")
        
        # Tag-based recommendations
        if domain_response.tags:
            if any(tag.lower() in ['phishing', 'malware'] for tag in domain_response.tags):
                recommendations.append("Domain associated with phishing/malware - high priority threat")
            if any(tag.lower() in ['botnet', 'c2'] for tag in domain_response.tags):
                recommendations.append("Potential command & control infrastructure - investigate network traffic")
        
        # Subdomain recommendations
        if hasattr(domain_response, 'subdomains') and domain_response.subdomains:
            if len(domain_response.subdomains) > 50:
                recommendations.append("Large number of subdomains - possible domain generation algorithm (DGA)")
        
        # General recommendations
        if not recommendations:
            if stats.harmless > stats.malicious + stats.suspicious:
                recommendations.append("Domain appears clean but continue monitoring")
            else:
                recommendations.append("Mixed results - investigate domain context and usage")
        
        recommendations.append(f"Cross-reference with other threat intelligence sources")
        recommendations.append(f"Monitor for any new detections or reputation changes")
        
        return recommendations[:6]  # Limit to top 6 recommendations