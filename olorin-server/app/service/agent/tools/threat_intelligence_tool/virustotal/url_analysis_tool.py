"""VirusTotal URL Analysis Tool for comprehensive URL threat intelligence."""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, validator

from ..base_threat_tool import BaseThreatIntelligenceTool
from .models import VirusTotalURLResponse
from .virustotal_client import VirusTotalClient


class URLAnalysisInput(BaseModel):
    """Input schema for URL analysis."""
    
    url: str = Field(..., description="URL to analyze (must include protocol, e.g., 'https://example.com')")
    include_redirects: bool = Field(
        default=True, 
        description="Whether to include redirect chain analysis in the report"
    )
    include_screenshots: bool = Field(
        default=False, 
        description="Whether to include screenshot analysis information"
    )
    max_detections: int = Field(
        default=15, 
        description="Maximum number of detection details to include (1-50)"
    )
    
    @validator('url')
    def validate_url(cls, v):
        """Validate URL format."""
        if not v or len(v.strip()) == 0:
            raise ValueError("URL cannot be empty")
        
        url = v.strip()
        
        # Parse URL to validate structure
        try:
            parsed = urlparse(url)
        except Exception:
            raise ValueError("Invalid URL format")
        
        # Check for required components
        if not parsed.scheme:
            raise ValueError("URL must include protocol (http:// or https://)")
        
        if parsed.scheme not in ['http', 'https']:
            raise ValueError("URL protocol must be http or https")
        
        if not parsed.netloc:
            raise ValueError("URL must include domain name")
        
        # Check URL length
        if len(url) > 2048:
            raise ValueError("URL too long (max 2048 characters)")
        
        return url
    
    @validator('max_detections')
    def validate_max_detections(cls, v):
        """Validate max_detections range."""
        if not 1 <= v <= 50:
            raise ValueError("max_detections must be between 1 and 50")
        return v


class VirusTotalURLAnalysisTool(BaseTool):
    """VirusTotal URL reputation and threat analysis tool."""
    
    name: str = "virustotal_url_analysis"
    description: str = (
        "Analyze URL reputation and threat intelligence using VirusTotal. "
        "Provides comprehensive URL analysis including phishing detection, "
        "malware hosting assessment, reputation scores from 90+ security engines, "
        "redirect chain analysis, and screenshot-based detection. Use this for "
        "investigating suspicious URLs found in fraud detection workflows, "
        "phishing campaigns, and security incidents."
    )
    args_schema: type = URLAnalysisInput
    
    def __init__(self):
        """Initialize the VirusTotal URL analysis tool."""
        super().__init__()
        self._client: Optional[VirusTotalClient] = None
    
    @property
    def client(self) -> VirusTotalClient:
        """Get or create VirusTotal client instance."""
        if self._client is None:
            self._client = VirusTotalClient()
        return self._client
    
    def _run(self, **kwargs) -> str:
        """Execute URL analysis synchronously."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(
        self,
        url: str,
        include_redirects: bool = True,
        include_screenshots: bool = False,
        max_detections: int = 15,
        **kwargs
    ) -> str:
        """Execute URL analysis asynchronously."""
        try:
            # Note: Caching would be implemented here in a production system
            
            # Analyze URL with VirusTotal
            url_response = await self.client.analyze_url(url)
            
            # Build comprehensive analysis result
            analysis_result = await self._build_url_analysis(
                url_response=url_response,
                url=url,
                include_redirects=include_redirects,
                include_screenshots=include_screenshots,
                max_detections=max_detections
            )
            
            # Return the result
            result_json = json.dumps(analysis_result, indent=2, default=str)
            return result_json
            
        except Exception as e:
            error_msg = f"VirusTotal URL analysis failed for {url}: {str(e)}"
            logger = logging.getLogger(__name__)
            logger.error(error_msg, exc_info=True)
            return json.dumps({
                "error": error_msg,
                "url": url,
                "timestamp": self._get_current_timestamp(),
                "source": "VirusTotal"
            }, indent=2)
    
    async def _build_url_analysis(
        self,
        url_response: VirusTotalURLResponse,
        url: str,
        include_redirects: bool,
        include_screenshots: bool,
        max_detections: int
    ) -> Dict[str, Any]:
        """Build comprehensive URL analysis result."""
        
        # Parse URL for additional context
        parsed_url = urlparse(url)
        
        # Basic URL information
        url_info = {
            "url": url,
            "domain": parsed_url.netloc,
            "path": parsed_url.path,
            "scheme": parsed_url.scheme,
            "analysis_timestamp": datetime.now().isoformat(),
            "source": "VirusTotal"
        }
        
        # Detection statistics
        if url_response.last_analysis_stats:
            stats = url_response.last_analysis_stats
            url_info["detection_summary"] = {
                "total_engines": stats.total_engines,
                "malicious_detections": stats.malicious,
                "suspicious_detections": stats.suspicious,
                "clean_detections": stats.harmless,
                "undetected": stats.undetected,
                "timeout_engines": getattr(stats, 'timeout', 0),
                "detection_ratio": f"{stats.malicious + stats.suspicious}/{stats.total_engines}",
                "threat_verdict": stats.threat_verdict,
                "risk_level": stats.risk_level
            }
        
        # URL categories and reputation
        if hasattr(url_response, 'categories') and url_response.categories:
            url_info["categories"] = list(url_response.categories.values())[:5]
        
        if hasattr(url_response, 'reputation') and url_response.reputation is not None:
            url_info["reputation_score"] = url_response.reputation
        
        # Threat classification
        if hasattr(url_response, 'threat_names') and url_response.threat_names:
            url_info["threat_names"] = url_response.threat_names[:10]
        
        # Detection details from security vendors
        if url_response.last_analysis_results and max_detections > 0:
            detections = []
            malicious_count = 0
            
            for engine, result in url_response.last_analysis_results.items():
                if malicious_count >= max_detections:
                    break
                
                if result.category in ['malicious', 'suspicious']:
                    detections.append({
                        "engine": engine,
                        "category": result.category,
                        "result": result.result or "Malicious/suspicious URL",
                        "method": result.method,
                        "engine_version": result.engine_version
                    })
                    malicious_count += 1
            
            if detections:
                url_info["threat_detections"] = detections
        
        # Redirect chain analysis
        if include_redirects and hasattr(url_response, 'redirection_chain') and url_response.redirection_chain:
            redirect_info = []
            for i, redirect_url in enumerate(url_response.redirection_chain):
                redirect_info.append({
                    "step": i + 1,
                    "url": redirect_url,
                    "domain": urlparse(redirect_url).netloc if redirect_url else "Unknown"
                })
            url_info["redirect_chain"] = redirect_info
            url_info["redirect_count"] = len(url_response.redirection_chain)
            
            # Analyze final destination
            if url_response.redirection_chain:
                final_url = url_response.redirection_chain[-1]
                final_domain = urlparse(final_url).netloc if final_url else "Unknown"
                url_info["final_destination"] = {
                    "url": final_url,
                    "domain": final_domain,
                    "different_domain": final_domain != parsed_url.netloc
                }
        
        # Screenshot analysis
        if include_screenshots and hasattr(url_response, 'has_content') and url_response.has_content:
            screenshot_info = {
                "content_available": True,
                "screenshot_analysis": "Content loaded successfully"
            }
            
            # Check for common phishing indicators in content
            if hasattr(url_response, 'outgoing_links') and url_response.outgoing_links:
                screenshot_info["outgoing_links_count"] = len(url_response.outgoing_links)
                screenshot_info["sample_outgoing_links"] = url_response.outgoing_links[:5]
            
            url_info["screenshot_info"] = screenshot_info
        
        # Network and hosting information
        if hasattr(url_response, 'ip_address') and url_response.ip_address:
            url_info["hosting_info"] = {
                "ip_address": url_response.ip_address,
                "server": getattr(url_response, 'server', 'Unknown'),
                "country": getattr(url_response, 'country', 'Unknown')
            }
        
        # Submission and analysis metadata
        submission_info = {
            "first_submission_date": str(url_response.first_submission_date) if url_response.first_submission_date else None,
            "last_analysis_date": str(url_response.last_analysis_date) if url_response.last_analysis_date else None,
            "last_modification_date": str(url_response.last_modification_date) if url_response.last_modification_date else None,
            "times_submitted": getattr(url_response, 'times_submitted', 0),
            "total_votes": {
                "harmless": url_response.total_votes.get('harmless', 0) if url_response.total_votes else 0,
                "malicious": url_response.total_votes.get('malicious', 0) if url_response.total_votes else 0
            }
        }
        
        # Risk assessment and recommendations
        url_info["risk_assessment"] = self._assess_url_risk(url_response, url)
        url_info["investigation_recommendations"] = self._generate_url_recommendations(
            url_response, url
        )
        
        # Additional context
        url_info["analysis_metadata"] = submission_info
        
        return {
            "url_analysis": url_info
        }
    
    def _assess_url_risk(self, url_response: VirusTotalURLResponse, url: str) -> Dict[str, Any]:
        """Assess overall URL risk level."""
        
        if not url_response.last_analysis_stats:
            return {
                "risk_level": "unknown",
                "confidence": "low",
                "risk_factors": ["No analysis data available"]
            }
        
        stats = url_response.last_analysis_stats
        risk_factors = []
        risk_score = 0
        
        # Detection-based risk
        detection_ratio = (stats.malicious + stats.suspicious) / max(stats.total_engines, 1)
        
        if stats.malicious > 10:
            risk_score += 70
            risk_factors.append(f"High malicious detection count: {stats.malicious}")
        elif stats.malicious > 5:
            risk_score += 50
            risk_factors.append(f"Multiple malicious detections: {stats.malicious}")
        elif stats.malicious > 0:
            risk_score += 30
            risk_factors.append(f"Malicious detections: {stats.malicious}")
        
        if stats.suspicious > 5:
            risk_score += 20
            risk_factors.append(f"Multiple suspicious detections: {stats.suspicious}")
        
        # Detection ratio risk
        if detection_ratio > 0.3:
            risk_score += 25
            risk_factors.append(f"High detection ratio: {detection_ratio:.2%}")
        elif detection_ratio > 0.1:
            risk_score += 15
            risk_factors.append(f"Significant detection ratio: {detection_ratio:.2%}")
        
        # Reputation-based risk
        if hasattr(url_response, 'reputation') and url_response.reputation is not None:
            if url_response.reputation < -50:
                risk_score += 30
                risk_factors.append(f"Very poor reputation: {url_response.reputation}")
            elif url_response.reputation < -10:
                risk_score += 15
                risk_factors.append(f"Poor reputation: {url_response.reputation}")
        
        # Category-based risk
        if hasattr(url_response, 'categories') and url_response.categories:
            dangerous_categories = ['phishing', 'malware', 'scam', 'fraud', 'adult', 'gambling']
            found_dangerous_cats = [
                cat for cat in url_response.categories.values() 
                if any(danger in cat.lower() for danger in dangerous_categories)
            ]
            if found_dangerous_cats:
                risk_score += len(found_dangerous_cats) * 15
                risk_factors.extend(found_dangerous_cats[:3])
        
        # Redirect-based risk
        if hasattr(url_response, 'redirection_chain') and url_response.redirection_chain:
            redirect_count = len(url_response.redirection_chain)
            if redirect_count > 5:
                risk_score += 20
                risk_factors.append(f"Excessive redirects: {redirect_count} hops")
            elif redirect_count > 2:
                risk_score += 10
                risk_factors.append(f"Multiple redirects: {redirect_count} hops")
        
        # Threat name-based risk
        if hasattr(url_response, 'threat_names') and url_response.threat_names:
            high_risk_threats = ['phishing', 'malware', 'trojan', 'scam', 'fraud']
            found_threats = [
                threat for threat in url_response.threat_names 
                if any(high_risk in threat.lower() for high_risk in high_risk_threats)
            ]
            if found_threats:
                risk_score += len(found_threats) * 10
                risk_factors.extend(found_threats[:3])
        
        # URL structure analysis
        parsed_url = urlparse(url)
        
        # Suspicious URL patterns
        if len(url) > 200:
            risk_score += 5
            risk_factors.append("Unusually long URL")
        
        if parsed_url.netloc.count('.') > 4:  # Excessive subdomains
            risk_score += 5
            risk_factors.append("Excessive subdomains")
        
        suspicious_keywords = ['login', 'secure', 'verify', 'update', 'account', 'bank', 'paypal']
        if any(keyword in url.lower() for keyword in suspicious_keywords):
            if stats.malicious > 0 or stats.suspicious > 0:  # Only flag if also detected by engines
                risk_score += 10
                risk_factors.append("Contains suspicious keywords")
        
        # Determine final risk level
        if risk_score >= 80:
            risk_level = "critical"
            confidence = "high"
        elif risk_score >= 60:
            risk_level = "high" 
            confidence = "high"
        elif risk_score >= 35:
            risk_level = "medium"
            confidence = "medium"
        elif risk_score > 10:
            risk_level = "low"
            confidence = "medium"
        else:
            risk_level = "minimal"
            confidence = "high"
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "confidence": confidence,
            "detection_ratio": detection_ratio,
            "risk_factors": risk_factors[:6]  # Limit to top 6 factors
        }
    
    def _generate_url_recommendations(
        self, 
        url_response: VirusTotalURLResponse, 
        url: str
    ) -> List[str]:
        """Generate investigation recommendations based on analysis."""
        
        recommendations = []
        
        if not url_response.last_analysis_stats:
            return ["Insufficient data for recommendations - consider resubmitting URL for analysis"]
        
        stats = url_response.last_analysis_stats
        
        # Critical threat recommendations
        if stats.malicious > 10:
            recommendations.append("CRITICAL: URL flagged as malicious by multiple engines - block immediately")
            recommendations.append("Investigate all users who may have accessed this URL")
            recommendations.append("Check for credential theft or malware installation")
        elif stats.malicious > 5:
            recommendations.append("URL flagged as malicious - block access and investigate")
        elif stats.malicious > 0:
            recommendations.append("Potential malicious URL - exercise extreme caution")
        
        # Category-based recommendations
        if hasattr(url_response, 'categories') and url_response.categories:
            categories = [cat.lower() for cat in url_response.categories.values()]
            
            if any('phishing' in cat for cat in categories):
                recommendations.append("PHISHING DETECTED: Check for credential theft and notify affected users")
            elif any('malware' in cat for cat in categories):
                recommendations.append("MALWARE HOSTING: Scan systems that accessed this URL for infections")
            elif any('scam' in cat or 'fraud' in cat for cat in categories):
                recommendations.append("Fraud/scam site detected: Investigate financial transactions and user reports")
        
        # Redirect-based recommendations
        if hasattr(url_response, 'redirection_chain') and url_response.redirection_chain:
            redirect_count = len(url_response.redirection_chain)
            if redirect_count > 3:
                recommendations.append(f"Multiple redirects detected ({redirect_count}) - investigate redirect chain for malicious redirections")
                
            # Check if final destination is different domain
            if url_response.redirection_chain:
                final_url = url_response.redirection_chain[-1]
                original_domain = urlparse(url).netloc
                final_domain = urlparse(final_url).netloc if final_url else ""
                
                if final_domain != original_domain:
                    recommendations.append(f"URL redirects to different domain ({final_domain}) - verify legitimacy")
        
        # Reputation-based recommendations
        if hasattr(url_response, 'reputation') and url_response.reputation is not None:
            if url_response.reputation < -20:
                recommendations.append("Very poor reputation - high probability of malicious activity")
        
        # General security recommendations
        if stats.suspicious > 3:
            recommendations.append("High suspicious activity - monitor user access and behavior")
        
        # Investigation steps
        if not recommendations:
            if stats.harmless > stats.malicious + stats.suspicious:
                recommendations.append("URL appears clean but continue monitoring")
            else:
                recommendations.append("Mixed detection results - investigate URL context and purpose")
        
        # Standard investigation recommendations
        recommendations.extend([
            f"Check URL access logs for affected users or systems",
            f"Monitor for similar URLs or domains in your environment", 
            f"Cross-reference with other threat intelligence sources"
        ])
        
        return recommendations[:7]  # Limit to top 7 recommendations