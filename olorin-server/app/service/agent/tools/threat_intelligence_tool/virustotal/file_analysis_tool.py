"""VirusTotal File Analysis Tool for comprehensive file threat intelligence."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, validator

from ..base_threat_tool import BaseThreatIntelligenceTool
from .models import VirusTotalFileResponse
from .virustotal_client import VirusTotalClient
from .virustotal_config import VirusTotalConfig
from app.service.logging import get_bridge_logger


class FileAnalysisInput(BaseModel):
    """Input schema for file analysis."""
    
    file_hash: str = Field(..., description="File hash to analyze (MD5, SHA1, or SHA256)")
    include_behavior: bool = Field(
        default=False, 
        description="Whether to include behavioral analysis in the report"
    )
    include_network: bool = Field(
        default=False, 
        description="Whether to include network indicators in the analysis"
    )
    max_detections: int = Field(
        default=15, 
        description="Maximum number of detection details to include (1-50)"
    )
    
    @validator('file_hash')
    def validate_file_hash(cls, v):
        """Validate file hash format."""
        if not v or len(v.strip()) == 0:
            raise ValueError("File hash cannot be empty")
        
        hash_value = v.strip().lower()
        
        # Check hash length for common formats
        if len(hash_value) == 32:  # MD5
            if not all(c in '0123456789abcdef' for c in hash_value):
                raise ValueError("Invalid MD5 hash format")
        elif len(hash_value) == 40:  # SHA1
            if not all(c in '0123456789abcdef' for c in hash_value):
                raise ValueError("Invalid SHA1 hash format")
        elif len(hash_value) == 64:  # SHA256
            if not all(c in '0123456789abcdef' for c in hash_value):
                raise ValueError("Invalid SHA256 hash format")
        else:
            raise ValueError("Hash must be MD5 (32 chars), SHA1 (40 chars), or SHA256 (64 chars)")
        
        return hash_value
    
    @validator('max_detections')
    def validate_max_detections(cls, v):
        """Validate max_detections range."""
        if not 1 <= v <= 50:
            raise ValueError("max_detections must be between 1 and 50")
        return v


class VirusTotalFileAnalysisTool(BaseTool):
    """VirusTotal file reputation and threat analysis tool."""
    
    name: str = "virustotal_file_analysis"
    description: str = (
        "Analyze file reputation and threat intelligence using VirusTotal. "
        "Provides comprehensive file analysis including malware detection results "
        "from 70+ antivirus engines, behavioral analysis, network indicators, "
        "and file metadata. Use this for investigating suspicious file hashes "
        "found in fraud detection workflows and security incidents."
    )
    args_schema: type = FileAnalysisInput
    
    def __init__(self):
        """Initialize the VirusTotal file analysis tool."""
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
        """Execute file analysis synchronously."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(
        self,
        file_hash: str,
        include_behavior: bool = False,
        include_network: bool = False,
        max_detections: int = 15,
        **kwargs
    ) -> str:
        """Execute file analysis asynchronously."""
        try:
            # Note: Caching would be implemented here in a production system
            
            # Analyze file with VirusTotal
            file_response = await self.client.analyze_file(file_hash)
            
            # Build comprehensive analysis result
            analysis_result = await self._build_file_analysis(
                file_response=file_response,
                file_hash=file_hash,
                include_behavior=include_behavior,
                include_network=include_network,
                max_detections=max_detections
            )
            
            # Return the result
            result_json = json.dumps(analysis_result, indent=2, default=str)
            return result_json
            
        except Exception as e:
            error_msg = f"VirusTotal file analysis failed for {file_hash}: {str(e)}"
            logger = get_bridge_logger(__name__)
            logger.error(error_msg, exc_info=True)
            return json.dumps({
                "error": error_msg,
                "file_hash": file_hash,
                "timestamp": self._get_current_timestamp(),
                "source": "VirusTotal"
            }, indent=2)
    
    async def _build_file_analysis(
        self,
        file_response: VirusTotalFileResponse,
        file_hash: str,
        include_behavior: bool,
        include_network: bool,
        max_detections: int
    ) -> Dict[str, Any]:
        """Build comprehensive file analysis result."""
        
        # Basic file information
        file_info = {
            "file_hash": file_hash,
            "hash_type": self._determine_hash_type(file_hash),
            "analysis_timestamp": datetime.now().isoformat(),
            "source": "VirusTotal"
        }
        
        # File metadata
        if hasattr(file_response, 'names') and file_response.names:
            file_info["file_names"] = file_response.names[:5]  # Top 5 names
        
        if hasattr(file_response, 'size') and file_response.size:
            file_info["file_size"] = file_response.size
            file_info["file_size_human"] = self._format_file_size(file_response.size)
        
        if hasattr(file_response, 'type_description') and file_response.type_description:
            file_info["file_type"] = file_response.type_description
        
        if hasattr(file_response, 'magic') and file_response.magic:
            file_info["file_magic"] = file_response.magic
        
        # Detection statistics
        if file_response.last_analysis_stats:
            stats = file_response.last_analysis_stats
            file_info["detection_summary"] = {
                "total_engines": stats.total_engines,
                "malicious_detections": stats.malicious,
                "suspicious_detections": stats.suspicious,
                "clean_detections": stats.harmless,
                "undetected": stats.undetected,
                "detection_ratio": f"{stats.malicious + stats.suspicious}/{stats.total_engines}",
                "threat_verdict": stats.threat_verdict,
                "risk_level": stats.risk_level
            }
        
        # Hash values
        if hasattr(file_response, 'md5') or hasattr(file_response, 'sha1') or hasattr(file_response, 'sha256'):
            file_info["hash_values"] = {}
            if hasattr(file_response, 'md5') and file_response.md5:
                file_info["hash_values"]["md5"] = file_response.md5
            if hasattr(file_response, 'sha1') and file_response.sha1:
                file_info["hash_values"]["sha1"] = file_response.sha1
            if hasattr(file_response, 'sha256') and file_response.sha256:
                file_info["hash_values"]["sha256"] = file_response.sha256
        
        # Malware classification
        if hasattr(file_response, 'popular_threat_classification') and file_response.popular_threat_classification:
            classification = file_response.popular_threat_classification
            file_info["threat_classification"] = {
                "suggested_threat_label": classification.get('suggested_threat_label', 'Unknown'),
                "popular_threat_category": list(classification.get('popular_threat_category', [])),
                "popular_threat_name": list(classification.get('popular_threat_name', []))
            }
        
        # Detection details from security vendors
        if file_response.last_analysis_results and max_detections > 0:
            detections = []
            malicious_count = 0
            
            for engine, result in file_response.last_analysis_results.items():
                if malicious_count >= max_detections:
                    break
                
                if result.category in ['malicious', 'suspicious']:
                    detections.append({
                        "engine": engine,
                        "category": result.category,
                        "result": result.result or "Malware detected",
                        "method": result.method,
                        "engine_version": result.engine_version,
                        "engine_update": str(result.engine_update) if result.engine_update else None
                    })
                    malicious_count += 1
            
            if detections:
                file_info["threat_detections"] = detections
        
        # Behavioral analysis
        if include_behavior and hasattr(file_response, 'sandbox_verdicts') and file_response.sandbox_verdicts:
            behavioral_info = {}
            for sandbox, verdict in file_response.sandbox_verdicts.items():
                behavioral_info[sandbox] = {
                    "category": verdict.get('category', 'unknown'),
                    "confidence": verdict.get('confidence', 0),
                    "sandbox_name": verdict.get('sandbox_name', sandbox)
                }
            file_info["behavioral_analysis"] = behavioral_info
        
        # Network indicators
        if include_network:
            network_indicators = {}
            
            if hasattr(file_response, 'contacted_ips') and file_response.contacted_ips:
                network_indicators["contacted_ips"] = file_response.contacted_ips[:10]  # Limit to 10
            
            if hasattr(file_response, 'contacted_domains') and file_response.contacted_domains:
                network_indicators["contacted_domains"] = file_response.contacted_domains[:10]  # Limit to 10
            
            if hasattr(file_response, 'contacted_urls') and file_response.contacted_urls:
                network_indicators["contacted_urls"] = file_response.contacted_urls[:10]  # Limit to 10
            
            if network_indicators:
                file_info["network_indicators"] = network_indicators
        
        # Risk assessment and recommendations
        file_info["risk_assessment"] = self._assess_file_risk(file_response)
        file_info["investigation_recommendations"] = self._generate_file_recommendations(
            file_response, file_hash
        )
        
        # Additional context
        file_info["analysis_metadata"] = {
            "first_submission_date": str(file_response.first_submission_date) if file_response.first_submission_date else None,
            "last_analysis_date": str(file_response.last_analysis_date) if file_response.last_analysis_date else None,
            "last_modification_date": str(file_response.last_modification_date) if file_response.last_modification_date else None,
            "times_submitted": getattr(file_response, 'times_submitted', 0),
            "reputation": getattr(file_response, 'reputation', 0),
            "total_votes": {
                "harmless": file_response.total_votes.get('harmless', 0) if file_response.total_votes else 0,
                "malicious": file_response.total_votes.get('malicious', 0) if file_response.total_votes else 0
            }
        }
        
        return {
            "file_analysis": file_info
        }
    
    def _determine_hash_type(self, file_hash: str) -> str:
        """Determine hash type based on length."""
        hash_len = len(file_hash)
        if hash_len == 32:
            return "MD5"
        elif hash_len == 40:
            return "SHA1"
        elif hash_len == 64:
            return "SHA256"
        else:
            return "Unknown"
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
    
    def _assess_file_risk(self, file_response: VirusTotalFileResponse) -> Dict[str, Any]:
        """Assess overall file risk level."""
        
        if not file_response.last_analysis_stats:
            return {
                "risk_level": "unknown",
                "confidence": "low",
                "risk_factors": ["No analysis data available"]
            }
        
        stats = file_response.last_analysis_stats
        risk_factors = []
        risk_score = 0
        
        # Detection-based risk
        detection_ratio = (stats.malicious + stats.suspicious) / max(stats.total_engines, 1)
        
        if stats.malicious > 10:
            risk_score += 80
            risk_factors.append(f"High malicious detection count: {stats.malicious}")
        elif stats.malicious > 5:
            risk_score += 60
            risk_factors.append(f"Multiple malicious detections: {stats.malicious}")
        elif stats.malicious > 0:
            risk_score += 40
            risk_factors.append(f"Malicious detections: {stats.malicious}")
        
        if stats.suspicious > 5:
            risk_score += 20
            risk_factors.append(f"Multiple suspicious detections: {stats.suspicious}")
        
        # Detection ratio risk
        if detection_ratio > 0.5:
            risk_score += 30
            risk_factors.append(f"High detection ratio: {detection_ratio:.2%}")
        elif detection_ratio > 0.2:
            risk_score += 15
            risk_factors.append(f"Significant detection ratio: {detection_ratio:.2%}")
        
        # Reputation-based risk
        if hasattr(file_response, 'reputation'):
            if file_response.reputation < -50:
                risk_score += 30
                risk_factors.append(f"Very poor reputation: {file_response.reputation}")
            elif file_response.reputation < -10:
                risk_score += 15
                risk_factors.append(f"Poor reputation: {file_response.reputation}")
        
        # Classification-based risk
        if hasattr(file_response, 'popular_threat_classification') and file_response.popular_threat_classification:
            classification = file_response.popular_threat_classification
            threat_label = classification.get('suggested_threat_label', '').lower()
            high_risk_types = ['trojan', 'ransomware', 'rootkit', 'backdoor', 'keylogger', 'stealer']
            
            if any(risk_type in threat_label for risk_type in high_risk_types):
                risk_score += 40
                risk_factors.append(f"High-risk threat type: {threat_label}")
        
        # Sandbox verdict risk
        if hasattr(file_response, 'sandbox_verdicts') and file_response.sandbox_verdicts:
            malicious_sandboxes = [
                name for name, verdict in file_response.sandbox_verdicts.items()
                if verdict.get('category') == 'malicious'
            ]
            if malicious_sandboxes:
                risk_score += len(malicious_sandboxes) * 15
                risk_factors.append(f"Malicious sandbox verdicts: {', '.join(malicious_sandboxes[:3])}")
        
        # Determine final risk level
        if risk_score >= 90:
            risk_level = "critical"
            confidence = "very_high"
        elif risk_score >= 70:
            risk_level = "high"
            confidence = "high"
        elif risk_score >= 40:
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
            "risk_factors": risk_factors[:5]  # Limit to top 5 factors
        }
    
    def _generate_file_recommendations(
        self, 
        file_response: VirusTotalFileResponse, 
        file_hash: str
    ) -> List[str]:
        """Generate investigation recommendations based on analysis."""
        
        recommendations = []
        
        if not file_response.last_analysis_stats:
            return ["Insufficient data for recommendations - consider submitting file for analysis"]
        
        stats = file_response.last_analysis_stats
        
        # Critical threat recommendations
        if stats.malicious > 15:
            recommendations.append("CRITICAL: File detected as malware by multiple engines - quarantine immediately")
            recommendations.append("Investigate all systems where this file was present")
            recommendations.append("Check for lateral movement and persistence mechanisms")
        elif stats.malicious > 5:
            recommendations.append("File flagged as malicious - isolate affected systems")
            recommendations.append("Perform forensic analysis to determine attack vector")
        elif stats.malicious > 0:
            recommendations.append("Potential malware detected - investigate file origin and distribution")
        
        # Suspicious activity recommendations
        if stats.suspicious > 5:
            recommendations.append("High suspicious activity - analyze file behavior in sandbox environment")
        
        # Classification-based recommendations
        if hasattr(file_response, 'popular_threat_classification') and file_response.popular_threat_classification:
            classification = file_response.popular_threat_classification
            threat_label = classification.get('suggested_threat_label', '').lower()
            
            if 'ransomware' in threat_label:
                recommendations.append("RANSOMWARE DETECTED: Check for encrypted files and backup integrity")
            elif 'trojan' in threat_label:
                recommendations.append("Trojan detected: Monitor for unauthorized access and data exfiltration")
            elif 'keylogger' in threat_label or 'stealer' in threat_label:
                recommendations.append("Credential theft malware: Reset all passwords for affected users")
            elif 'rootkit' in threat_label:
                recommendations.append("Rootkit detected: Perform deep system scan and consider reimaging")
        
        # Network-based recommendations
        if hasattr(file_response, 'contacted_ips') and file_response.contacted_ips:
            recommendations.append("File makes network connections - monitor network traffic for C&C communication")
        
        # General security recommendations
        if not recommendations:
            if stats.harmless > stats.malicious + stats.suspicious:
                recommendations.append("File appears clean but maintain vigilance")
            else:
                recommendations.append("Mixed detection results - investigate file context and usage")
        
        # Standard investigation steps
        recommendations.extend([
            f"Search for other instances of this hash across your environment",
            f"Review file execution timeline and related process activity",
            f"Cross-reference with other threat intelligence feeds"
        ])
        
        return recommendations[:6]  # Limit to top 6 recommendations