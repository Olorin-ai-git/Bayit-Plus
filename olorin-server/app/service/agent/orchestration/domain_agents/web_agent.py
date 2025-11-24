"""
Web Domain Analysis Agent

Analyzes web-based intelligence, OSINT data, and online reputation for fraud detection.
Uses Composio Search and WebCrawl tools to gather web intelligence about entities.
"""

import time
from typing import Dict, Any, Optional

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def web_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Web domain analysis agent.
    Analyzes web-based intelligence, OSINT data, and online reputation.
    Uses Composio Search and WebCrawl tools to gather intelligence.
    """
    try:
        start_time = time.time()
        logger.info("[Step 5.2.6] 🌐 Web agent analyzing investigation")
        
        # Get relevant data from state
        snowflake_data = state.get("snowflake_data", {})
        tool_results = state.get("tool_results", {})
        entity_id = state["entity_id"]
        entity_type = state["entity_type"]
        investigation_id = state.get('investigation_id', 'unknown')
        
        # Initialize logging and chain of thought
        DomainAgentBase.log_agent_start("web", entity_type, entity_id, False)
        DomainAgentBase.log_context_analysis(snowflake_data, tool_results, "web")
        
        process_id = DomainAgentBase.start_chain_of_thought(
            investigation_id=investigation_id,
            agent_name="web_agent",
            domain="web",
            entity_type=entity_type,
            entity_id=entity_id,
            task_description="Web intelligence analysis is critical for fraud detection, providing OSINT data, "
                            "online reputation, and external context. Will analyze: (1) Web search results for "
                            "entity reputation and threat intelligence, (2) Web crawl results from relevant URLs, "
                            "(3) Online presence and digital footprint, (4) Public records and breach data, "
                            "(5) Social media and forum mentions"
        )
        
        # Initialize web findings
        web_findings = DomainAgentBase.initialize_findings("web")
        
        # Process Snowflake data for context (if available)
        results = DomainAgentBase.process_snowflake_results(snowflake_data, "web")
        
        logger.info(f"📊 Web agent processing investigation for {entity_type}: {entity_id}")
        
        # Execute web search and crawl operations
        _execute_web_intelligence_gathering(entity_id, entity_type, web_findings, tool_results)
        
        # Ensure we always have some evidence
        if len(web_findings.get('evidence', [])) == 0:
            logger.warning("⚠️ No evidence collected from web analysis, adding basic summary")
            web_findings["evidence"].append(f"Web intelligence analysis completed for {entity_type}: {entity_id}")
            web_findings["evidence"].append("Web search and crawl operations executed")
        
        logger.info(f"📊 Evidence collected from web intelligence: {len(web_findings.get('evidence', []))} items")
        
        # Add evidence summary
        web_findings["evidence_summary"] = {
            "total_evidence_points": len(web_findings["evidence"]),
            "risk_indicators_found": len(web_findings["risk_indicators"]),
            "metrics_collected": len(web_findings["metrics"]),
            "web_searches_performed": web_findings["metrics"].get("web_searches_performed", 0),
            "web_crawls_performed": web_findings["metrics"].get("web_crawls_performed", 0)
        }
        
        # CRITICAL: Analyze evidence with LLM to generate risk scores (with ALL tool results)
        from .base import analyze_evidence_with_llm
        web_findings = await analyze_evidence_with_llm(
            domain="web",
            findings=web_findings,
            snowflake_data=snowflake_data,
            tool_results=tool_results,
            entity_type=entity_type,
            entity_id=entity_id
        )
        
        # Finalize findings
        analysis_duration = time.time() - start_time
        DomainAgentBase.finalize_findings(
            web_findings, snowflake_data, tool_results, analysis_duration, "web"
        )
        
        # Complete logging
        log_agent_handover_complete("web", web_findings)
        complete_chain_of_thought(process_id, web_findings, "web")
        
        logger.info(f"[Step 5.2.6] ✅ Web analysis complete - Evidence collected: {len(web_findings['evidence'])} points")
        
        # Update state with findings
        return add_domain_findings(state, "web", web_findings)
        
    except Exception as e:
        logger.error(f"❌ Web agent failed: {str(e)}", exc_info=True)
        
        # Record failure with circuit breaker
        from app.service.agent.orchestration.circuit_breaker import record_node_failure
        record_node_failure(state, "web_agent", e)
        
        # Return state as-is to allow investigation to continue
        return state


def _execute_web_intelligence_gathering(
    entity_id: str,
    entity_type: str,
    findings: Dict[str, Any],
    tool_results: Dict[str, Any]
) -> None:
    """
    Execute web intelligence gathering using Composio Search and WebCrawl tools.
    
    This function analyzes tool_results to extract web search and crawl data,
    and adds findings based on the results.
    """
    import json
    
    # Initialize metrics
    findings["metrics"]["web_searches_performed"] = 0
    findings["metrics"]["web_crawls_performed"] = 0
    findings["metrics"]["web_results_found"] = 0
    
    # Check for Composio Search results in tool_results
    search_results = []
    crawl_results = []
    
    # Look for composio_search tool results
    for tool_name, tool_result in tool_results.items():
        if "composio_search" in tool_name.lower() or "search" in tool_name.lower():
            try:
                if isinstance(tool_result, str):
                    parsed_result = json.loads(tool_result)
                else:
                    parsed_result = tool_result
                
                if parsed_result.get("success"):
                    search_results.append(parsed_result)
                    findings["metrics"]["web_searches_performed"] += 1
                    findings["metrics"]["web_results_found"] += len(parsed_result.get("results", []))
            except Exception as e:
                logger.debug(f"Failed to parse search result: {e}")
        
        # Look for composio_webcrawl tool results
        if "composio_webcrawl" in tool_name.lower() or "crawl" in tool_name.lower():
            try:
                if isinstance(tool_result, str):
                    parsed_result = json.loads(tool_result)
                else:
                    parsed_result = tool_result
                
                if parsed_result.get("success"):
                    crawl_results.append(parsed_result)
                    findings["metrics"]["web_crawls_performed"] += 1
            except Exception as e:
                logger.debug(f"Failed to parse crawl result: {e}")
    
    # Analyze search results
    if search_results:
        _analyze_search_results(search_results, entity_id, entity_type, findings)
    
    # Analyze crawl results
    if crawl_results:
        _analyze_crawl_results(crawl_results, entity_id, entity_type, findings)
    
    # If no tool results found, add note about missing web intelligence
    if not search_results and not crawl_results:
        findings["evidence"].append(f"Web intelligence gathering: No search or crawl results available in tool_results for {entity_type}: {entity_id}")
        findings["evidence"].append("Web intelligence tools (composio_search, composio_webcrawl) should be executed during tool execution phase")
        findings["evidence"].append(f"Recommended search queries: '{entity_id}' fraud, '{entity_id}' reputation, '{entity_type} {entity_id}' threat intelligence")
        logger.warning(f"⚠️ No web intelligence results found in tool_results for {entity_type}: {entity_id}")
        logger.info("   💡 Web intelligence tools should be called by orchestrator during tool execution phase")


def _analyze_search_results(
    search_results: list,
    entity_id: str,
    entity_type: str,
    findings: Dict[str, Any]
) -> None:
    """Analyze web search results for risk indicators."""
    total_results = 0
    threat_indicators = []
    reputation_indicators = []
    
    for result in search_results:
        query = result.get("query", "")
        results = result.get("results", [])
        total_results += len(results)
        
        # Analyze each search result
        for item in results:
            title = item.get("title", "").lower()
            snippet = item.get("snippet", "").lower()
            url = item.get("url", "")
            
            # Look for threat indicators
            threat_keywords = [
                "fraud", "scam", "phishing", "malware", "botnet", "abuse",
                "blacklist", "blocklist", "suspicious", "malicious", "threat"
            ]
            
            for keyword in threat_keywords:
                if keyword in title or keyword in snippet:
                    threat_indicators.append({
                        "keyword": keyword,
                        "source": url,
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", "")[:200]
                    })
                    break
            
            # Look for reputation indicators
            reputation_keywords = [
                "reputation", "review", "rating", "complaint", "report",
                "verified", "trusted", "legitimate"
            ]
            
            for keyword in reputation_keywords:
                if keyword in title or keyword in snippet:
                    reputation_indicators.append({
                        "keyword": keyword,
                        "source": url,
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", "")[:200]
                    })
                    break
        
        # Add evidence
        findings["evidence"].append(f"Web search query: '{query}' returned {len(results)} results")
    
    # Add findings
    findings["metrics"]["total_search_results"] = total_results
    findings["metrics"]["threat_indicators_found"] = len(threat_indicators)
    findings["metrics"]["reputation_indicators_found"] = len(reputation_indicators)
    
    if threat_indicators:
        findings["risk_indicators"].append(f"{len(threat_indicators)} threat indicators found in web search results")
        findings["evidence"].append(f"SUSPICIOUS: Threat keywords detected in {len(threat_indicators)} search results")
        findings["analysis"]["threat_indicators"] = threat_indicators[:10]  # Top 10
    
    if reputation_indicators:
        findings["evidence"].append(f"Reputation indicators found in {len(reputation_indicators)} search results")
        findings["analysis"]["reputation_indicators"] = reputation_indicators[:10]  # Top 10
    
    if total_results > 0:
        findings["evidence"].append(f"Web search analysis: {total_results} total results analyzed")


def _analyze_crawl_results(
    crawl_results: list,
    entity_id: str,
    entity_type: str,
    findings: Dict[str, Any]
) -> None:
    """Analyze web crawl results for risk indicators."""
    total_content_length = 0
    crawled_urls = []
    content_indicators = []
    
    for result in crawl_results:
        url = result.get("url", "")
        content = result.get("content", "")
        metadata = result.get("metadata", {})
        
        crawled_urls.append(url)
        content_length = len(content) if isinstance(content, str) else 0
        total_content_length += content_length
        
        # Analyze content for risk indicators
        if isinstance(content, str):
            content_lower = content.lower()
            
            # Look for fraud-related content
            fraud_keywords = [
                "fraud", "scam", "phishing", "identity theft", "credit card fraud",
                "account takeover", "unauthorized", "suspicious activity"
            ]
            
            for keyword in fraud_keywords:
                if keyword in content_lower:
                    content_indicators.append({
                        "keyword": keyword,
                        "url": url,
                        "context": content_lower[content_lower.find(keyword)-50:content_lower.find(keyword)+50]
                    })
                    break
        
        # Add evidence
        findings["evidence"].append(f"Web crawl completed: {url} ({content_length} chars)")
    
    # Add findings
    findings["metrics"]["total_crawled_content_length"] = total_content_length
    findings["metrics"]["crawled_urls_count"] = len(crawled_urls)
    findings["metrics"]["content_indicators_found"] = len(content_indicators)
    
    if content_indicators:
        findings["risk_indicators"].append(f"{len(content_indicators)} fraud-related content indicators found in crawled pages")
        findings["evidence"].append(f"SUSPICIOUS: Fraud keywords detected in {len(content_indicators)} crawled pages")
        findings["analysis"]["content_indicators"] = content_indicators[:10]  # Top 10
    
    if crawled_urls:
        findings["evidence"].append(f"Web crawl analysis: {len(crawled_urls)} URLs crawled")
        findings["analysis"]["crawled_urls"] = crawled_urls

