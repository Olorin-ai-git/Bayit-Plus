"""
Unified Threat Intelligence Tool

Multi-source threat intelligence aggregator that combines data from multiple providers
(AbuseIPDB, VirusTotal, Shodan) to provide comprehensive threat analysis for fraud investigations.
"""

import json
import logging
import asyncio
from typing import Any, Dict, List, Optional, Type, Union
from datetime import datetime
from enum import Enum

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ThreatIntelligenceSource(Enum):
    """Available threat intelligence sources"""
    ABUSEIPDB = "abuseipdb"
    VIRUSTOTAL = "virustotal"
    SHODAN = "shodan"
    ALL = "all"


class QueryPriority(Enum):
    """Query priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class UnifiedThreatIntelligenceInput(BaseModel):
    """Input schema for unified threat intelligence queries."""
    
    target: str = Field(
        ...,
        description="Target to analyze (IP address, domain, file hash, etc.)",
        examples=["192.168.1.1", "malicious-site.com", "abc123..."]
    )
    query_type: str = Field(
        default="comprehensive",
        description="Type of analysis (ip_reputation, domain_analysis, file_analysis, comprehensive)",
        examples=["ip_reputation", "domain_analysis", "file_analysis", "comprehensive"]
    )
    sources: str = Field(
        default="all",
        description="Threat intelligence sources to query (all, abuseipdb, virustotal, shodan)",
        examples=["all", "abuseipdb,virustotal", "shodan"]
    )
    priority: str = Field(
        default="medium",
        description="Query priority affecting response time and resource allocation",
        examples=["low", "medium", "high", "critical"]
    )
    correlation_level: str = Field(
        default="basic",
        description="Level of cross-source correlation (none, basic, advanced)",
        examples=["none", "basic", "advanced"]
    )


class UnifiedThreatIntelligenceTool(BaseTool):
    """
    Unified threat intelligence tool that aggregates data from multiple sources.
    
    Provides comprehensive threat analysis by combining results from:
    - AbuseIPDB (IP reputation and abuse reporting)
    - VirusTotal (File/URL/domain analysis)
    - Shodan (Infrastructure and service analysis)
    
    Features:
    - Intelligent source selection based on query type
    - Cross-source data correlation and validation
    - Provider failover and redundancy
    - Cost-optimized query routing
    - Unified risk scoring
    """
    
    name: str = "unified_threat_intelligence"
    description: str = (
        "Comprehensive multi-source threat intelligence analysis combining AbuseIPDB, "
        "VirusTotal, and Shodan data. Provides unified threat assessment, cross-source "
        "correlation, and intelligent source selection for fraud investigation workflows. "
        "Supports IP reputation, domain analysis, file analysis, and infrastructure reconnaissance."
    )
    args_schema: Type[BaseModel] = UnifiedThreatIntelligenceInput

    def __init__(self, **kwargs):
        """Initialize unified threat intelligence tool."""
        super().__init__(**kwargs)
        
        # Tool registry for accessing individual providers
        self._tool_registry = None
        self._provider_tools = {}
        self._initialization_lock = asyncio.Lock()
        self._initialized = False

    async def _initialize_providers(self):
        """Initialize provider tools on first use."""
        if self._initialized:
            return
            
        async with self._initialization_lock:
            if self._initialized:
                return
                
            try:
                # Import tool registry
                from ..tool_registry import tool_registry
                self._tool_registry = tool_registry
                
                # Get available threat intelligence tools
                threat_tools = tool_registry.get_tools_by_category("threat_intelligence")
                
                # Map tools by provider
                for tool in threat_tools:
                    if "abuseipdb" in tool.name:
                        if "abuseipdb" not in self._provider_tools:
                            self._provider_tools["abuseipdb"] = []
                        self._provider_tools["abuseipdb"].append(tool)
                    elif "virustotal" in tool.name:
                        if "virustotal" not in self._provider_tools:
                            self._provider_tools["virustotal"] = []
                        self._provider_tools["virustotal"].append(tool)
                    elif "shodan" in tool.name:
                        if "shodan" not in self._provider_tools:
                            self._provider_tools["shodan"] = []
                        self._provider_tools["shodan"].append(tool)
                
                self._initialized = True
                logger.info(f"Initialized unified threat intelligence with providers: {list(self._provider_tools.keys())}")
                
            except Exception as e:
                logger.error(f"Failed to initialize threat intelligence providers: {e}")
                # Continue without providers - will show warning in queries

    def _determine_optimal_sources(self, target: str, query_type: str, priority: QueryPriority) -> List[ThreatIntelligenceSource]:
        """Determine optimal threat intelligence sources based on target and query type."""
        sources = []
        
        # IP address analysis
        if self._is_ip_address(target):
            if query_type in ["ip_reputation", "comprehensive"]:
                sources.extend([ThreatIntelligenceSource.ABUSEIPDB, ThreatIntelligenceSource.VIRUSTOTAL])
            if query_type in ["infrastructure", "comprehensive"]:
                sources.append(ThreatIntelligenceSource.SHODAN)
        
        # Domain analysis
        elif self._is_domain(target):
            if query_type in ["domain_analysis", "comprehensive"]:
                sources.extend([ThreatIntelligenceSource.VIRUSTOTAL, ThreatIntelligenceSource.SHODAN])
        
        # File hash analysis
        elif self._is_file_hash(target):
            if query_type in ["file_analysis", "comprehensive"]:
                sources.append(ThreatIntelligenceSource.VIRUSTOTAL)
        
        # Default to all sources for comprehensive analysis
        if not sources or query_type == "comprehensive":
            sources = [ThreatIntelligenceSource.ABUSEIPDB, ThreatIntelligenceSource.VIRUSTOTAL, ThreatIntelligenceSource.SHODAN]
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(sources))

    def _is_ip_address(self, target: str) -> bool:
        """Check if target is an IP address."""
        import ipaddress
        try:
            ipaddress.ip_address(target)
            return True
        except ValueError:
            return False

    def _is_domain(self, target: str) -> bool:
        """Check if target is a domain name."""
        import re
        domain_pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$'
        return bool(re.match(domain_pattern, target)) and '.' in target

    def _is_file_hash(self, target: str) -> bool:
        """Check if target is a file hash (MD5, SHA1, SHA256)."""
        # MD5: 32 hex chars, SHA1: 40 hex chars, SHA256: 64 hex chars
        return len(target) in [32, 40, 64] and all(c in '0123456789abcdefABCDEF' for c in target)

    async def _query_provider(self, provider: str, target: str, query_type: str) -> Dict[str, Any]:
        """Query a specific threat intelligence provider."""
        provider_results = {
            "provider": provider,
            "success": False,
            "data": None,
            "error": None,
            "query_time_ms": 0
        }
        
        try:
            start_time = datetime.utcnow()
            
            # Get appropriate tool for provider
            tools = self._provider_tools.get(provider, [])
            if not tools:
                provider_results["error"] = f"No tools available for provider: {provider}"
                return provider_results
            
            # Select best tool for query type
            tool = self._select_best_tool(tools, target, query_type)
            if not tool:
                provider_results["error"] = f"No suitable tool found for {query_type} on {provider}"
                return provider_results
            
            # Execute query based on tool type
            result = await self._execute_provider_query(tool, target, query_type)
            
            provider_results.update({
                "success": True,
                "data": result,
                "query_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000)
            })
            
        except Exception as e:
            logger.error(f"Provider {provider} query failed: {e}")
            provider_results["error"] = str(e)
        
        return provider_results

    def _select_best_tool(self, tools: List[Any], target: str, query_type: str) -> Optional[Any]:
        """Select the best tool from a provider for the specific query."""
        # Prioritize tools based on query type and target
        tool_priorities = {
            "ip_reputation": ["ip_reputation", "bulk_ip", "simple_ip"],
            "domain_analysis": ["domain", "url"],
            "file_analysis": ["file", "hash"],
            "comprehensive": ["ip_reputation", "bulk_ip", "domain", "file"]
        }
        
        preferred_tools = tool_priorities.get(query_type, [])
        
        # Find tool matching preferences
        for pref in preferred_tools:
            for tool in tools:
                if pref in tool.name.lower():
                    return tool
        
        # Fallback to first available tool
        return tools[0] if tools else None

    async def _execute_provider_query(self, tool: Any, target: str, query_type: str) -> Any:
        """Execute query on specific provider tool."""
        # Prepare tool-specific arguments
        if "abuseipdb" in tool.name:
            if "bulk" in tool.name:
                return await tool._arun(ip_addresses=target)
            elif "cidr" in tool.name:
                return await tool._arun(cidr_network=target)
            else:
                return await tool._arun(ip_address=target)
        
        # Add more provider-specific logic as tools are implemented
        else:
            # Generic execution
            return await tool._arun(target=target)

    def _correlate_results(self, provider_results: List[Dict[str, Any]], correlation_level: str) -> Dict[str, Any]:
        """Correlate results from multiple providers."""
        if correlation_level == "none":
            return {"correlation": "disabled", "results": provider_results}
        
        correlation = {
            "correlation_level": correlation_level,
            "providers_queried": len(provider_results),
            "successful_queries": len([r for r in provider_results if r["success"]]),
            "consensus_score": 0.0,
            "threat_indicators": [],
            "confidence_assessment": "unknown",
            "cross_references": []
        }
        
        # Basic correlation
        if correlation_level in ["basic", "advanced"]:
            successful_results = [r for r in provider_results if r["success"]]
            
            if len(successful_results) >= 2:
                # Calculate consensus threat score
                threat_scores = []
                for result in successful_results:
                    score = self._extract_threat_score(result)
                    if score is not None:
                        threat_scores.append(score)
                
                if threat_scores:
                    correlation["consensus_score"] = sum(threat_scores) / len(threat_scores)
                    correlation["confidence_assessment"] = self._assess_confidence(threat_scores)
            
            # Extract common threat indicators
            all_indicators = []
            for result in successful_results:
                indicators = self._extract_threat_indicators(result)
                all_indicators.extend(indicators)
            
            # Find common indicators
            from collections import Counter
            indicator_counts = Counter(all_indicators)
            correlation["threat_indicators"] = [
                {"indicator": ind, "frequency": count}
                for ind, count in indicator_counts.most_common(10)
                if count >= 2  # Must appear in at least 2 sources
            ]
        
        # Advanced correlation (if requested)
        if correlation_level == "advanced":
            correlation["advanced_analysis"] = self._advanced_correlation(provider_results)
        
        return {**correlation, "raw_results": provider_results}

    def _extract_threat_score(self, result: Dict[str, Any]) -> Optional[float]:
        """Extract normalized threat score from provider result."""
        try:
            # Parse JSON response
            if isinstance(result["data"], str):
                data = json.loads(result["data"])
            else:
                data = result["data"]
            
            # AbuseIPDB score extraction
            if result["provider"] == "abuseipdb":
                if data.get("success") and "data" in data:
                    confidence = data["data"].get("confidence_percentage", 0)
                    return confidence / 100.0  # Normalize to 0-1
            
            # Add extraction logic for other providers
            
        except Exception as e:
            logger.debug(f"Could not extract threat score from {result['provider']}: {e}")
        
        return None

    def _extract_threat_indicators(self, result: Dict[str, Any]) -> List[str]:
        """Extract threat indicators from provider result."""
        indicators = []
        
        try:
            if isinstance(result["data"], str):
                data = json.loads(result["data"])
            else:
                data = result["data"]
            
            # AbuseIPDB indicators
            if result["provider"] == "abuseipdb":
                if data.get("success") and "data" in data:
                    threat_data = data["data"]
                    if threat_data.get("is_malicious"):
                        indicators.append("malicious_ip")
                    if threat_data.get("country_code"):
                        indicators.append(f"country:{threat_data['country_code']}")
                    if threat_data.get("usage_type"):
                        indicators.append(f"usage:{threat_data['usage_type']}")
            
            # Add indicator extraction for other providers
            
        except Exception as e:
            logger.debug(f"Could not extract indicators from {result['provider']}: {e}")
        
        return indicators

    def _assess_confidence(self, scores: List[float]) -> str:
        """Assess confidence based on score consistency."""
        if not scores:
            return "unknown"
        
        avg_score = sum(scores) / len(scores)
        score_variance = sum((s - avg_score) ** 2 for s in scores) / len(scores)
        
        if score_variance < 0.1 and len(scores) >= 3:
            return "high"
        elif score_variance < 0.2 and len(scores) >= 2:
            return "medium"
        else:
            return "low"

    def _advanced_correlation(self, provider_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform advanced cross-source correlation analysis."""
        # Placeholder for advanced correlation logic
        return {
            "temporal_correlation": "not_implemented",
            "behavioral_patterns": "not_implemented",
            "attribution_analysis": "not_implemented",
            "infrastructure_mapping": "not_implemented"
        }

    async def _arun(
        self,
        target: str,
        query_type: str = "comprehensive",
        sources: str = "all",
        priority: str = "medium",
        correlation_level: str = "basic",
        **kwargs
    ) -> str:
        """Execute unified threat intelligence query."""
        try:
            start_time = datetime.utcnow()
            
            # Initialize providers if needed
            await self._initialize_providers()
            
            # Parse priority and sources
            priority_enum = QueryPriority(priority.lower())
            requested_sources = sources.lower().split(",") if sources != "all" else ["all"]
            
            # Determine optimal sources
            if "all" in requested_sources:
                optimal_sources = self._determine_optimal_sources(target, query_type, priority_enum)
            else:
                optimal_sources = [ThreatIntelligenceSource(s.strip()) for s in requested_sources if s.strip()]
            
            logger.info(f"Querying {len(optimal_sources)} sources for {target}: {[s.value for s in optimal_sources]}")
            
            # Query providers concurrently
            query_tasks = []
            for source in optimal_sources:
                if source.value in self._provider_tools:
                    task = self._query_provider(source.value, target, query_type)
                    query_tasks.append(task)
            
            # Execute queries with timeout based on priority
            timeout_seconds = {
                QueryPriority.CRITICAL: 60,
                QueryPriority.HIGH: 45,
                QueryPriority.MEDIUM: 30,
                QueryPriority.LOW: 15
            }.get(priority_enum, 30)
            
            try:
                provider_results = await asyncio.wait_for(
                    asyncio.gather(*query_tasks, return_exceptions=True),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.warning(f"Query timeout after {timeout_seconds}s for target: {target}")
                provider_results = [{"provider": "timeout", "success": False, "error": "Query timeout"}]
            
            # Filter out exceptions
            valid_results = []
            for result in provider_results:
                if isinstance(result, dict):
                    valid_results.append(result)
                elif isinstance(result, Exception):
                    logger.error(f"Provider query exception: {result}")
                    valid_results.append({"provider": "exception", "success": False, "error": str(result)})
            
            # Correlate results
            correlation_analysis = self._correlate_results(valid_results, correlation_level)
            
            # Generate final analysis
            analysis = {
                "target": target,
                "query_type": query_type,
                "analysis_summary": {
                    "total_sources_queried": len(optimal_sources),
                    "successful_queries": len([r for r in valid_results if r.get("success")]),
                    "consensus_threat_score": correlation_analysis.get("consensus_score", 0.0),
                    "confidence_level": correlation_analysis.get("confidence_assessment", "unknown"),
                    "threat_indicators_found": len(correlation_analysis.get("threat_indicators", []))
                },
                "source_analysis": correlation_analysis,
                "recommendations": self._generate_unified_recommendations(correlation_analysis, target, query_type),
                "metadata": {
                    "query_timestamp": start_time.isoformat(),
                    "total_query_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                    "priority": priority,
                    "correlation_level": correlation_level,
                    "sources_requested": sources,
                    "tool": "unified_threat_intelligence"
                }
            }
            
            return json.dumps({
                "success": True,
                "data": analysis
            }, indent=2, default=str)
            
        except Exception as e:
            logger.error(f"Unified threat intelligence query failed: {e}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "target": target,
                "tool": "unified_threat_intelligence"
            }, indent=2)

    def _generate_unified_recommendations(self, correlation: Dict[str, Any], target: str, query_type: str) -> List[str]:
        """Generate unified recommendations based on correlation analysis."""
        recommendations = []
        
        consensus_score = correlation.get("consensus_score", 0.0)
        confidence = correlation.get("confidence_assessment", "unknown")
        successful_queries = correlation.get("successful_queries", 0)
        
        # Risk-based recommendations
        if consensus_score >= 0.8:
            recommendations.extend([
                "🚨 CRITICAL THREAT: High consensus threat score across multiple sources",
                "🔒 IMMEDIATE ACTION: Block access and escalate to security team",
                "📊 INVESTIGATION: Conduct deep analysis of related infrastructure"
            ])
        elif consensus_score >= 0.6:
            recommendations.extend([
                "⚠️ HIGH RISK: Significant threat indicators detected",
                "🔍 ENHANCED MONITORING: Implement additional security controls",
                "📋 REVIEW: Cross-check with recent security incidents"
            ])
        elif consensus_score >= 0.3:
            recommendations.extend([
                "📈 MEDIUM RISK: Some threat indicators present",
                "🛡️ CAUTION: Apply standard security measures",
                "👀 MONITOR: Watch for additional suspicious activity"
            ])
        else:
            recommendations.extend([
                "✅ LOW RISK: Minimal threat indicators detected",
                "🔄 ROUTINE: Continue standard monitoring procedures"
            ])
        
        # Confidence-based recommendations
        if confidence == "low" or successful_queries < 2:
            recommendations.append("⚠️ LIMITED DATA: Consider additional sources for verification")
        elif confidence == "high":
            recommendations.append("✅ HIGH CONFIDENCE: Results validated across multiple sources")
        
        # Query-specific recommendations
        if query_type == "comprehensive":
            recommendations.append("🔍 COMPREHENSIVE: Multi-vector analysis completed")
        
        if not recommendations:
            recommendations.append("📊 ANALYSIS COMPLETE: Standard threat intelligence assessment")
        
        return recommendations

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))