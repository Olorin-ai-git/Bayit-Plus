"""
Base classes and shared utilities for domain agents.

Provides common functionality used across all domain analysis agents.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    add_domain_findings
)
from app.service.agent.chain_of_thought_logger import get_chain_of_thought_logger, ReasoningType

logger = get_bridge_logger(__name__)


class DomainAgentBase:
    """Base class for domain analysis agents."""
    
    @staticmethod
    def log_agent_start(domain: str, entity_type: str, entity_id: str, is_test_mode: bool) -> None:
        """Log agent handover and initialization."""
        logger.debug(f"{domain.upper()} AGENT HANDOVER DEBUG:")
        logger.debug(f"   🤝 Agent handover: Orchestrator → {domain.title()} Agent")
        logger.debug(f"   🎯 Mode: {'TEST' if is_test_mode else 'LIVE'}")
        logger.debug(f"   🏗️  Investigation ID: {entity_id}")
        logger.debug(f"   🎯 Entity: {entity_type} - {entity_id}")
    
    @staticmethod
    def log_context_analysis(snowflake_data: Dict[str, Any], tool_results: Dict[str, Any]) -> None:
        """Log available data sources for debugging."""
        logger.debug(f"   📊 Available data sources:")
        logger.debug(f"      Snowflake data: {'Yes' if snowflake_data else 'No'} ({len(str(snowflake_data))} chars)")
        logger.debug(f"      Tool results: {len(tool_results)} tools")
        if tool_results:
            logger.debug(f"         Tool results keys: {list(tool_results.keys())}")
    
    @staticmethod
    def start_chain_of_thought(investigation_id: str, agent_name: str, domain: str, 
                             entity_type: str, entity_id: str, task_description: str) -> str:
        """Initialize chain of thought logging for the agent."""
        cot_logger = get_chain_of_thought_logger()
        process_id = f"{agent_name}_{investigation_id}"
        
        cot_logger.start_agent_thinking(
            investigation_id=investigation_id,
            agent_name=agent_name,
            domain=domain,
            initial_context={"entity_type": entity_type, "entity_id": entity_id}
        )
        
        cot_logger.log_reasoning_step(
            process_id=process_id,
            reasoning_type=ReasoningType.ANALYSIS,
            premise=f"{domain.title()} domain analysis required for {entity_type} {entity_id}",
            reasoning=task_description,
            conclusion=f"Will examine Snowflake transaction data and tool results for {domain} risk indicators",
            confidence=0.8,
            supporting_evidence=[
                {"type": "domain", "data": f"{domain} analysis specialization"},
                {"type": "agent_initialization", "data": f"{agent_name} ready for analysis"}
            ],
            metadata={"agent": agent_name, "entity_type": entity_type, "entity_id": entity_id}
        )
        
        return process_id
    
    @staticmethod
    def initialize_findings(domain: str) -> Dict[str, Any]:
        """Initialize domain findings structure."""
        return {
            "domain": domain,
            "evidence": [],  # Collect evidence for LLM to analyze
            "metrics": {},  # Collect metrics without scoring
            "risk_indicators": [],
            "analysis": {},
            "risk_score": 0.0  # CRITICAL FIX: Initialize risk_score to prevent KeyError
        }
    
    @staticmethod
    def process_snowflake_results(snowflake_data: Dict[str, Any], domain: str) -> list:
        """Extract and validate Snowflake results."""
        results = []
        
        if snowflake_data:
            if isinstance(snowflake_data, dict) and "results" in snowflake_data:
                results = snowflake_data["results"]
                logger.debug(f"   📊 Processing {len(results)} Snowflake records for {domain} analysis")
            elif isinstance(snowflake_data, str):
                logger.warning(f"⚠️ {domain.title()} Agent: Snowflake data is string format, cannot extract structured results")
                logger.debug(f"   String content preview: {snowflake_data[:200]}...")
            else:
                logger.warning(f"⚠️ {domain.title()} Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
                logger.debug(f"   Data content preview: {str(snowflake_data)[:200]}...")
        
        return results
    
    @staticmethod
    def process_model_scores(results: list, findings: Dict[str, Any], domain: str) -> None:
        """Process MODEL_SCORE from Snowflake results."""
        if not results:
            return
            
        logger.debug(f"   📊 Processing {len(results)} records for {domain} risk calculation")
        
        for idx, r in enumerate(results[:3]):  # Log first 3 records
            model_score = r.get("MODEL_SCORE")
            logger.debug(f"      Record {idx+1}: MODEL_SCORE = {model_score} (type: {type(model_score)})")
            if model_score:
                try:
                    float_score = float(model_score)
                    logger.debug(f"      Converted to float: {float_score}")
                except (ValueError, TypeError) as e:
                    logger.error(f"      ❌ Failed to convert MODEL_SCORE to float: {e}")
        
        model_scores = [float(r.get("MODEL_SCORE", 0)) for r in results if "MODEL_SCORE" in r]
        if model_scores:
            avg_model_score = sum(model_scores) / len(model_scores)
            findings["risk_score"] = max(findings["risk_score"], avg_model_score)
            findings["risk_indicators"].append(f"Model fraud score: {avg_model_score:.3f}")
            
            # Store metrics for LLM analysis
            findings["metrics"]["avg_model_score"] = avg_model_score
            findings["metrics"]["model_scores_count"] = len(model_scores)
    
    @staticmethod
    def finalize_findings(findings: Dict[str, Any], snowflake_data: Dict[str, Any], 
                         tool_results: Dict[str, Any], analysis_duration: float, domain: str) -> None:
        """Finalize domain findings with confidence and completion logging."""
        # Cap risk score at 1.0
        findings["risk_score"] = min(1.0, findings["risk_score"])
        
        # Add confidence based on data availability (simplified for base class)
        data_sources = sum([
            1 if snowflake_data else 0,
            len(tool_results) * 0.25  # Each tool contributes 0.25 to confidence
        ])
        findings["confidence"] = min(1.0, data_sources / 4.0)
        
        logger.info(f"✅ {domain.title()} analysis complete - Risk: {findings['risk_score']:.2f}")
        
        # DEBUG: Analysis completion
        logger.debug(f"{domain.upper()} AGENT COMPLETION DEBUG:")
        logger.debug(f"   ⏱️  Analysis duration: {analysis_duration:.3f}s")
        logger.debug(f"   🎯 Risk score calculated: {findings['risk_score']:.2f}")
        logger.debug(f"   🔍 Risk indicators found: {len(findings['risk_indicators'])}")
        for i, indicator in enumerate(findings['risk_indicators'][:3]):  # Show first 3
            logger.debug(f"      Risk {i+1}: {indicator}")
        if len(findings['risk_indicators']) > 3:
            logger.debug(f"      ... and {len(findings['risk_indicators']) - 3} more")
        logger.debug(f"   📊 Confidence level: {findings.get('confidence', 0):.2f}")


def log_agent_handover_complete(domain: str, findings: Dict[str, Any]) -> None:
    """Log agent handover completion back to orchestrator."""
    logger.debug(f"   🤝 Agent handover: {domain.title()} Agent → Orchestrator")
    logger.debug(f"   🎯 Findings delivered: {len(findings.get('risk_indicators', []))} indicators")
    logger.debug(f"   🧠 Chain of thought: Analysis complete, control returned to orchestrator")


def complete_chain_of_thought(process_id: str, findings: Dict[str, Any], domain: str) -> None:
    """Complete chain of thought logging for the agent."""
    cot_logger = get_chain_of_thought_logger()
    
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.CONCLUSION,
        premise=f"Completed {domain} domain analysis",
        reasoning=f"Analyzed available data sources and identified {len(findings.get('risk_indicators', []))} risk indicators",
        conclusion=f"Risk assessment: {findings.get('risk_score', 0):.2f}, Confidence: {findings.get('confidence', 0):.2f}",
        confidence=findings.get('confidence', 0.5),
        supporting_evidence=[
            {"type": "risk_indicators", "data": findings.get('risk_indicators', [])},
            {"type": "analysis_metrics", "data": findings.get('metrics', {})},
            {"type": "domain_completion", "data": f"{domain} analysis complete"}
        ],
        metadata={"agent": f"{domain}_agent", "risk_score": findings.get('risk_score', 0)}
    )
    
    cot_logger.complete_agent_thinking(
        investigation_id=process_id.split('_')[2] if '_' in process_id else 'unknown',
        agent_name=f"{domain}_agent",
        final_output=findings
    )