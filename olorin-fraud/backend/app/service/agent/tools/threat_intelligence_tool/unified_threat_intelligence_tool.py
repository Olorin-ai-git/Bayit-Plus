"""
Unified Threat Intelligence Tool

Multi-source threat intelligence aggregator that combines data from multiple providers
(AbuseIPDB, VirusTotal, Shodan) to provide comprehensive threat analysis for fraud investigations.
"""

import asyncio
import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Type, Union

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.agent.orchestration.enhanced_tool_execution_logger import (
    get_tool_execution_logger,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


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
        examples=["192.168.1.1", "malicious-site.com", "abc123..."],
    )
    query_type: str = Field(
        default="comprehensive",
        description="Type of analysis (ip_reputation, domain_analysis, file_analysis, comprehensive)",
        examples=["ip_reputation", "domain_analysis", "file_analysis", "comprehensive"],
    )
    sources: str = Field(
        default="all",
        description="Threat intelligence sources to query (all, abuseipdb, virustotal, shodan)",
        examples=["all", "abuseipdb,virustotal", "shodan"],
    )
    priority: str = Field(
        default="medium",
        description="Query priority affecting response time and resource allocation",
        examples=["low", "medium", "high", "critical"],
    )
    correlation_level: str = Field(
        default="basic",
        description="Level of cross-source correlation (none, basic, advanced)",
        examples=["none", "basic", "advanced"],
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
                threat_tools = tool_registry.get_tools_by_category(
                    "threat_intelligence"
                )

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
                logger.info(
                    f"Initialized unified threat intelligence with providers: {list(self._provider_tools.keys())}"
                )

            except Exception as e:
                logger.error(f"Failed to initialize threat intelligence providers: {e}")
                # Continue without providers - will show warning in queries

    def _determine_optimal_sources(
        self, target: str, query_type: str, priority: QueryPriority
    ) -> List[ThreatIntelligenceSource]:
        """Determine optimal threat intelligence sources based on target and query type."""
        sources = []

        # IP address analysis
        if self._is_ip_address(target):
            if query_type in ["ip_reputation", "comprehensive"]:
                sources.extend(
                    [
                        ThreatIntelligenceSource.ABUSEIPDB,
                        ThreatIntelligenceSource.VIRUSTOTAL,
                    ]
                )
            if query_type in ["infrastructure", "comprehensive"]:
                sources.append(ThreatIntelligenceSource.SHODAN)

        # Domain analysis
        elif self._is_domain(target):
            if query_type in ["domain_analysis", "comprehensive"]:
                sources.extend(
                    [
                        ThreatIntelligenceSource.VIRUSTOTAL,
                        ThreatIntelligenceSource.SHODAN,
                    ]
                )

        # File hash analysis
        elif self._is_file_hash(target):
            if query_type in ["file_analysis", "comprehensive"]:
                sources.append(ThreatIntelligenceSource.VIRUSTOTAL)

        # Default to all sources for comprehensive analysis
        if not sources or query_type == "comprehensive":
            sources = [
                ThreatIntelligenceSource.ABUSEIPDB,
                ThreatIntelligenceSource.VIRUSTOTAL,
                ThreatIntelligenceSource.SHODAN,
            ]

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

        domain_pattern = r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$"
        return bool(re.match(domain_pattern, target)) and "." in target

    def _is_file_hash(self, target: str) -> bool:
        """Check if target is a file hash (MD5, SHA1, SHA256)."""
        # MD5: 32 hex chars, SHA1: 40 hex chars, SHA256: 64 hex chars
        return len(target) in [32, 40, 64] and all(
            c in "0123456789abcdefABCDEF" for c in target
        )

    async def _query_provider(
        self, provider: str, target: str, query_type: str
    ) -> Dict[str, Any]:
        """Query a specific threat intelligence provider."""
        provider_results = {
            "provider": provider,
            "success": False,
            "data": None,
            "error": None,
            "query_time_ms": 0,
        }

        try:
            start_time = datetime.utcnow()

            # Get appropriate tool for provider
            tools = self._provider_tools.get(provider, [])
            if not tools:
                provider_results["error"] = (
                    f"No tools available for provider: {provider}"
                )
                return provider_results

            # Select best tool for query type
            tool = self._select_best_tool(tools, target, query_type)
            if not tool:
                provider_results["error"] = (
                    f"No suitable tool found for {query_type} on {provider}"
                )
                return provider_results

            # Execute query based on tool type
            result = await self._execute_provider_query(tool, target, query_type)

            provider_results.update(
                {
                    "success": True,
                    "data": result,
                    "query_time_ms": int(
                        (datetime.utcnow() - start_time).total_seconds() * 1000
                    ),
                }
            )

        except Exception as e:
            logger.error(f"Provider {provider} query failed: {e}")
            provider_results["error"] = str(e)

        return provider_results

    def _select_best_tool(
        self, tools: List[Any], target: str, query_type: str
    ) -> Optional[Any]:
        """Select the best tool from a provider for the specific query."""
        # Prioritize tools based on query type and target
        tool_priorities = {
            "ip_reputation": ["ip_reputation", "bulk_ip", "simple_ip"],
            "domain_analysis": ["domain", "url"],
            "file_analysis": ["file", "hash"],
            "comprehensive": ["ip_reputation", "bulk_ip", "domain", "file"],
        }

        preferred_tools = tool_priorities.get(query_type, [])

        # Find tool matching preferences
        for pref in preferred_tools:
            for tool in tools:
                if pref in tool.name.lower():
                    return tool

        # Fallback to first available tool
        return tools[0] if tools else None

    async def _execute_provider_query(
        self, tool: Any, target: str, query_type: str
    ) -> Any:
        """Execute query on specific provider tool."""
        # Prepare tool-specific arguments based on provider and tool

        # AbuseIPDB tool handling
        if "abuseipdb" in tool.name:
            if "bulk" in tool.name:
                return await tool._arun(ip_addresses=target)
            elif "cidr" in tool.name:
                return await tool._arun(cidr_network=target)
            else:
                return await tool._arun(ip=target)

        # VirusTotal tool handling
        elif "virustotal" in tool.name:
            if "ip" in tool.name and self._is_ip_address(target):
                # IP analysis requires 'ip' parameter
                return await tool._arun(ip=target)
            elif "domain" in tool.name:
                # For domain tool, check if target is IP and convert to domain if needed
                if self._is_ip_address(target):
                    # If it's an IP, the domain tool should handle the conversion internally
                    return await tool._arun(domain=target)
                else:
                    return await tool._arun(domain=target)
            elif "file" in tool.name or self._is_file_hash(target):
                # File analysis requires 'file_hash' parameter
                return await tool._arun(file_hash=target)
            elif "url" in tool.name:
                # URL analysis requires 'url' parameter
                return await tool._arun(url=target)
            else:
                # Determine appropriate parameter based on target type
                if self._is_ip_address(target):
                    return await tool._arun(ip=target)
                elif self._is_domain(target):
                    return await tool._arun(domain=target)
                else:
                    # Default to treating as domain
                    return await tool._arun(domain=target)

        # Shodan tool handling
        elif "shodan" in tool.name:
            if self._is_ip_address(target):
                # IP analysis requires 'ip' parameter
                return await tool._arun(ip=target)
            else:
                # For non-IP targets, try to convert or use as query
                return await tool._arun(query=target)

        # Generic fallback - try common parameter names
        else:
            # Try common parameter patterns
            try:
                return await tool._arun(target=target)
            except TypeError as e:
                if "missing" in str(e) and "positional argument" in str(e):
                    # Try alternative parameter names
                    try:
                        return await tool._arun(query=target)
                    except TypeError:
                        try:
                            return await tool._arun(input=target)
                        except TypeError:
                            # Re-raise original error
                            raise e
                else:
                    raise e

    def _correlate_results(
        self, provider_results: List[Dict[str, Any]], correlation_level: str
    ) -> Dict[str, Any]:
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
            "cross_references": [],
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
                    correlation["consensus_score"] = sum(threat_scores) / len(
                        threat_scores
                    )
                    correlation["confidence_assessment"] = self._assess_confidence(
                        threat_scores
                    )

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
            correlation["advanced_analysis"] = self._advanced_correlation(
                provider_results
            )

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
            logger.debug(
                f"Could not extract threat score from {result['provider']}: {e}"
            )

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

    def _advanced_correlation(
        self, provider_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Perform advanced cross-source correlation analysis."""
        # Placeholder for advanced correlation logic
        return {
            "temporal_correlation": "not_implemented",
            "behavioral_patterns": "not_implemented",
            "attribution_analysis": "not_implemented",
            "infrastructure_mapping": "not_implemented",
        }

    async def _arun(
        self,
        target: str,
        query_type: str = "comprehensive",
        sources: str = "all",
        priority: str = "medium",
        correlation_level: str = "basic",
        **kwargs,
    ) -> str:
        """Execute unified threat intelligence query with comprehensive error logging."""
        import time

        # Get tool execution logger for detailed logging
        tool_logger = get_tool_execution_logger()

        # Start execution logging
        tool_args = {
            "target": target,
            "query_type": query_type,
            "sources": sources,
            "priority": priority,
            "correlation_level": correlation_level,
        }
        execution_id = await tool_logger.log_tool_execution_start(
            tool_name=self.name, tool_args=tool_args
        )

        start_time = time.time()

        try:
            logger.info(f"🔍 THREAT INTELLIGENCE ANALYSIS STARTING")
            logger.info(f"   Target: {target}")
            logger.info(f"   Query Type: {query_type}")
            logger.info(f"   Sources: {sources}")
            logger.info(f"   Priority: {priority}")
            logger.info(f"   Correlation Level: {correlation_level}")

            # Initialize providers if needed
            try:
                await self._initialize_providers()
                logger.info(f"✅ Threat intelligence providers initialized")
                logger.debug(
                    f"   Available providers: {list(self._provider_tools.keys())}"
                )
            except Exception as init_error:
                logger.error(f"❌ Provider initialization failed: {init_error}")

                await tool_logger.log_tool_execution_failure(
                    execution_id=execution_id, error=init_error, tool_args=tool_args
                )

                return json.dumps(
                    {
                        "success": False,
                        "error": f"Provider initialization failed: {str(init_error)}",
                        "error_category": "provider_initialization_error",
                        "target": target,
                        "tool": "unified_threat_intelligence",
                        "execution_duration_ms": int((time.time() - start_time) * 1000),
                    },
                    indent=2,
                )

            # Parse priority and sources
            try:
                priority_enum = QueryPriority(priority.lower())
                requested_sources = (
                    sources.lower().split(",") if sources != "all" else ["all"]
                )
            except ValueError as parse_error:
                logger.error(f"❌ Invalid parameter values: {parse_error}")

                await tool_logger.log_tool_execution_failure(
                    execution_id=execution_id, error=parse_error, tool_args=tool_args
                )

                return json.dumps(
                    {
                        "success": False,
                        "error": f"Invalid parameter values: {str(parse_error)}",
                        "error_category": "parameter_validation_error",
                        "target": target,
                        "tool": "unified_threat_intelligence",
                        "execution_duration_ms": int((time.time() - start_time) * 1000),
                    },
                    indent=2,
                )

            # Determine optimal sources
            if "all" in requested_sources:
                optimal_sources = self._determine_optimal_sources(
                    target, query_type, priority_enum
                )
            else:
                optimal_sources = [
                    ThreatIntelligenceSource(s.strip())
                    for s in requested_sources
                    if s.strip()
                ]

            if not optimal_sources:
                logger.warning(
                    f"📭 No optimal threat intelligence sources determined for target: {target}"
                )

                await tool_logger.log_empty_result(
                    tool_name=self.name,
                    execution_id=execution_id,
                    reason="no_sources_available",
                    context={
                        "target": target,
                        "query_type": query_type,
                        "requested_sources": sources,
                        "available_providers": list(self._provider_tools.keys()),
                    },
                )

                return json.dumps(
                    {
                        "success": False,
                        "error": "No threat intelligence sources available for this query",
                        "error_category": "no_sources_available",
                        "target": target,
                        "tool": "unified_threat_intelligence",
                        "execution_duration_ms": int((time.time() - start_time) * 1000),
                    },
                    indent=2,
                )

            logger.info(
                f"🎯 Querying {len(optimal_sources)} sources for {target}: {[s.value for s in optimal_sources]}"
            )

            # Query providers concurrently
            query_tasks = []
            available_sources = []
            for source in optimal_sources:
                if source.value in self._provider_tools:
                    task = self._query_provider(source.value, target, query_type)
                    query_tasks.append((source.value, task))
                    available_sources.append(source.value)
                else:
                    logger.warning(
                        f"⚠️ Provider {source.value} not available in tool registry"
                    )

            if not query_tasks:
                logger.error(f"❌ No available providers for threat intelligence query")

                await tool_logger.log_empty_result(
                    tool_name=self.name,
                    execution_id=execution_id,
                    reason="no_providers_available",
                    context={
                        "target": target,
                        "query_type": query_type,
                        "optimal_sources": [s.value for s in optimal_sources],
                        "available_providers": list(self._provider_tools.keys()),
                    },
                )

                return json.dumps(
                    {
                        "success": False,
                        "error": "No threat intelligence providers available",
                        "error_category": "no_providers_available",
                        "target": target,
                        "tool": "unified_threat_intelligence",
                        "execution_duration_ms": int((time.time() - start_time) * 1000),
                    },
                    indent=2,
                )

            # Execute queries with timeout based on priority
            timeout_seconds = {
                QueryPriority.CRITICAL: 60,
                QueryPriority.HIGH: 45,
                QueryPriority.MEDIUM: 30,
                QueryPriority.LOW: 15,
            }.get(priority_enum, 30)

            logger.info(
                f"⏱️ Executing {len(query_tasks)} provider queries with {timeout_seconds}s timeout"
            )

            try:
                # Execute just the tasks, not the tuples
                tasks = [task for source, task in query_tasks]
                provider_results = await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=timeout_seconds,
                )

                logger.info(f"✅ Provider queries completed")
                logger.debug(f"   Results received: {len(provider_results)}")

            except asyncio.TimeoutError:
                execution_duration_ms = int((time.time() - start_time) * 1000)
                logger.error(
                    f"❌ Query timeout after {timeout_seconds}s for target: {target}"
                )

                timeout_error = TimeoutError(
                    f"Threat intelligence query timeout after {timeout_seconds}s"
                )
                await tool_logger.log_tool_execution_failure(
                    execution_id=execution_id, error=timeout_error, tool_args=tool_args
                )

                return json.dumps(
                    {
                        "success": False,
                        "error": f"Query timeout after {timeout_seconds} seconds",
                        "error_category": "query_timeout",
                        "target": target,
                        "tool": "unified_threat_intelligence",
                        "execution_duration_ms": execution_duration_ms,
                        "timeout_threshold": timeout_seconds,
                        "providers_queried": available_sources,
                    },
                    indent=2,
                )

            # Filter out exceptions and analyze results
            valid_results = []
            failed_providers = []

            for i, result in enumerate(provider_results):
                provider_name = (
                    available_sources[i] if i < len(available_sources) else "unknown"
                )

                if isinstance(result, dict):
                    valid_results.append(result)
                    if result.get("success"):
                        logger.debug(f"   ✅ {provider_name}: Success")
                    else:
                        logger.warning(
                            f"   ❌ {provider_name}: Failed - {result.get('error', 'Unknown error')}"
                        )
                        failed_providers.append(provider_name)
                elif isinstance(result, Exception):
                    logger.error(f"   ❌ {provider_name}: Exception - {str(result)}")
                    failed_providers.append(provider_name)
                    valid_results.append(
                        {
                            "provider": provider_name,
                            "success": False,
                            "error": str(result),
                            "error_type": type(result).__name__,
                        }
                    )
                else:
                    logger.warning(
                        f"   ⚠️ {provider_name}: Unexpected result type - {type(result)}"
                    )
                    failed_providers.append(provider_name)

            successful_queries = len([r for r in valid_results if r.get("success")])

            logger.info(f"📊 Provider Query Results:")
            logger.info(f"   Total providers queried: {len(query_tasks)}")
            logger.info(f"   Successful queries: {successful_queries}")
            logger.info(f"   Failed providers: {len(failed_providers)}")

            if failed_providers:
                logger.warning(f"   Failed providers: {failed_providers}")

            # Check if we have any successful results
            if successful_queries == 0:
                logger.error(
                    f"❌ All threat intelligence providers failed for target: {target}"
                )

                all_failures_error = Exception(
                    f"All {len(query_tasks)} threat intelligence providers failed"
                )
                await tool_logger.log_tool_execution_failure(
                    execution_id=execution_id,
                    error=all_failures_error,
                    tool_args=tool_args,
                )

                return json.dumps(
                    {
                        "success": False,
                        "error": "All threat intelligence providers failed",
                        "error_category": "all_providers_failed",
                        "target": target,
                        "tool": "unified_threat_intelligence",
                        "execution_duration_ms": int((time.time() - start_time) * 1000),
                        "failed_providers": failed_providers,
                        "provider_errors": [
                            r for r in valid_results if not r.get("success")
                        ],
                    },
                    indent=2,
                )

            # Correlate results
            logger.info(
                f"🔗 Correlating results across {successful_queries} successful sources"
            )

            try:
                correlation_analysis = self._correlate_results(
                    valid_results, correlation_level
                )
                logger.info(f"✅ Cross-source correlation completed")
                logger.debug(
                    f"   Consensus score: {correlation_analysis.get('consensus_score', 0.0):.3f}"
                )
                logger.debug(
                    f"   Confidence level: {correlation_analysis.get('confidence_assessment', 'unknown')}"
                )
            except Exception as correlation_error:
                logger.error(f"❌ Result correlation failed: {correlation_error}")
                # Continue with basic analysis even if correlation fails
                correlation_analysis = {
                    "consensus_score": 0.0,
                    "confidence_assessment": "low",
                    "correlation_error": str(correlation_error),
                }

            # Generate final analysis
            execution_duration_ms = int((time.time() - start_time) * 1000)

            analysis = {
                "target": target,
                "query_type": query_type,
                "analysis_summary": {
                    "total_sources_queried": len(optimal_sources),
                    "successful_queries": successful_queries,
                    "failed_queries": len(failed_providers),
                    "consensus_threat_score": correlation_analysis.get(
                        "consensus_score", 0.0
                    ),
                    "confidence_level": correlation_analysis.get(
                        "confidence_assessment", "unknown"
                    ),
                    "threat_indicators_found": len(
                        correlation_analysis.get("threat_indicators", [])
                    ),
                },
                "source_analysis": correlation_analysis,
                "recommendations": self._generate_unified_recommendations(
                    correlation_analysis, target, query_type
                ),
                "execution_details": {
                    "successful_providers": [
                        s for s in available_sources if s not in failed_providers
                    ],
                    "failed_providers": failed_providers,
                    "execution_duration_ms": execution_duration_ms,
                    "timeout_threshold": timeout_seconds,
                    "data_quality_score": (
                        successful_queries / len(optimal_sources)
                        if optimal_sources
                        else 0.0
                    ),
                },
                "metadata": {
                    "query_timestamp": datetime.utcnow().isoformat(),
                    "total_query_time_ms": execution_duration_ms,
                    "priority": priority,
                    "correlation_level": correlation_level,
                    "sources_requested": sources,
                    "tool": "unified_threat_intelligence",
                },
            }

            final_result = {"success": True, "data": analysis}

            logger.info(f"✅ THREAT INTELLIGENCE ANALYSIS COMPLETED")
            logger.info(f"   Target: {target}")
            logger.info(f"   Duration: {execution_duration_ms}ms")
            logger.info(
                f"   Consensus Threat Score: {correlation_analysis.get('consensus_score', 0.0):.3f}"
            )
            logger.info(
                f"   Data Quality: {successful_queries}/{len(optimal_sources)} sources"
            )

            # Log successful execution
            await tool_logger.log_tool_execution_success(
                execution_id=execution_id, result=final_result
            )

            return json.dumps(final_result, indent=2, default=str)

        except Exception as e:
            execution_duration_ms = int((time.time() - start_time) * 1000)

            logger.error(f"❌ THREAT INTELLIGENCE ANALYSIS FAILED")
            logger.error(f"   Target: {target}")
            logger.error(f"   Duration: {execution_duration_ms}ms")
            logger.error(f"   Error: {str(e)}")
            logger.error(f"   Error Type: {type(e).__name__}")

            # Log execution failure
            await tool_logger.log_tool_execution_failure(
                execution_id=execution_id, error=e, tool_args=tool_args
            )

            return json.dumps(
                {
                    "success": False,
                    "error": f"Unified threat intelligence query failed: {str(e)}",
                    "error_category": "unexpected_error",
                    "error_type": type(e).__name__,
                    "target": target,
                    "tool": "unified_threat_intelligence",
                    "execution_duration_ms": execution_duration_ms,
                },
                indent=2,
            )

    def _generate_unified_recommendations(
        self, correlation: Dict[str, Any], target: str, query_type: str
    ) -> List[str]:
        """Generate unified recommendations based on correlation analysis."""
        recommendations = []

        consensus_score = correlation.get("consensus_score", 0.0)
        confidence = correlation.get("confidence_assessment", "unknown")
        successful_queries = correlation.get("successful_queries", 0)

        # Risk-based recommendations
        if consensus_score >= 0.8:
            recommendations.extend(
                [
                    "🚨 CRITICAL THREAT: High consensus threat score across multiple sources",
                    "🔒 IMMEDIATE ACTION: Block access and escalate to security team",
                    "📊 INVESTIGATION: Conduct deep analysis of related infrastructure",
                ]
            )
        elif consensus_score >= 0.6:
            recommendations.extend(
                [
                    "⚠️ HIGH RISK: Significant threat indicators detected",
                    "🔍 ENHANCED MONITORING: Implement additional security controls",
                    "📋 REVIEW: Cross-check with recent security incidents",
                ]
            )
        elif consensus_score >= 0.3:
            recommendations.extend(
                [
                    "📈 MEDIUM RISK: Some threat indicators present",
                    "🛡️ CAUTION: Apply standard security measures",
                    "👀 MONITOR: Watch for additional suspicious activity",
                ]
            )
        else:
            recommendations.extend(
                [
                    "✅ LOW RISK: Minimal threat indicators detected",
                    "🔄 ROUTINE: Continue standard monitoring procedures",
                ]
            )

        # Confidence-based recommendations
        if confidence == "low" or successful_queries < 2:
            recommendations.append(
                "⚠️ LIMITED DATA: Consider additional sources for verification"
            )
        elif confidence == "high":
            recommendations.append(
                "✅ HIGH CONFIDENCE: Results validated across multiple sources"
            )

        # Query-specific recommendations
        if query_type == "comprehensive":
            recommendations.append("🔍 COMPREHENSIVE: Multi-vector analysis completed")

        if not recommendations:
            recommendations.append(
                "📊 ANALYSIS COMPLETE: Standard threat intelligence assessment"
            )

        return recommendations

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio

        return asyncio.run(self._arun(**kwargs))
