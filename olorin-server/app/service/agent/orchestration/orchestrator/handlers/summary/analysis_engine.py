"""
Summary Analysis Engine

Core analysis functionality for investigation summaries.
"""

import re
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SummaryAnalysisEngine:
    """Core analysis engine for investigation summaries."""

    def __init__(self, llm):
        """Initialize with LLM."""
        self.llm = llm

    async def analyze_with_llm(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze aggregated tool results with LLM for risk assessment."""
        logger.info("🤖 Performing LLM-based risk assessment on aggregated tool results")

        # Prepare comprehensive analysis prompt
        analysis_prompt = self._prepare_risk_analysis_prompt(state)

        # Create messages for LLM
        system_msg = SystemMessage(content="""You are a fraud risk assessment expert. Analyze the investigation results and provide:
1. A risk score from 0.0 to 1.0 based on the evidence
2. Confidence level in your assessment (0.0 to 1.0)
3. Key risk factors identified
4. Detailed reasoning for your risk assessment
5. Recommended actions

Base your assessment ONLY on the actual data provided. Do not use arbitrary values.""")

        human_msg = HumanMessage(content=analysis_prompt)

<<<<<<< HEAD
=======
        # Log full LLM prompt when snowflake data is included
        snowflake_data = state.get("snowflake_data", {})
        if snowflake_data:
            logger.info("📝 LLM Prompt (with formatted Snowflake data):")
            logger.info(f"   System Message: {system_msg.content[:500]}...")
            if len(system_msg.content) > 500:
                logger.info(f"   ... (truncated, full length: {len(system_msg.content)} chars)")
            logger.info(f"   Human Message: {human_msg.content[:1000]}...")
            if len(human_msg.content) > 1000:
                logger.info(f"   ... (truncated, full length: {len(human_msg.content)} chars)")

>>>>>>> 001-modify-analyzer-method
        try:
            # Invoke LLM for risk assessment
            response = await self.llm.ainvoke([system_msg, human_msg])

<<<<<<< HEAD
=======
            # Log full LLM response
            if snowflake_data:
                logger.info("🤖 LLM Response (after receiving formatted Snowflake data):")
                if hasattr(response, 'content') and response.content:
                    response_preview = str(response.content)[:2000] if response.content else "[Empty response]"
                    logger.info(f"   Response content: {response_preview}")
                    if len(str(response.content)) > 2000:
                        logger.info(f"   ... (truncated, full length: {len(str(response.content))} chars)")
                else:
                    logger.info("   Response: [No content]")

>>>>>>> 001-modify-analyzer-method
            # Parse the LLM response to extract risk metrics
            return self._parse_llm_risk_assessment(response.content)

        except Exception as e:
            logger.error(f"LLM risk assessment failed: {e}")
            # Fallback to data-driven calculation
            return self._calculate_fallback_risk_score(state)

    def _prepare_risk_analysis_prompt(self, state: Dict[str, Any]) -> str:
        """Prepare comprehensive prompt for LLM risk analysis."""
        from .data_formatters import SummaryDataFormatters

        # Extract key data from state
        snowflake_data = state.get("snowflake_data", {})
        tool_results = state.get("tool_results", {})
        domain_findings = state.get("domain_findings", {})

<<<<<<< HEAD
=======
        # Format snowflake data for LLM
        formatted_snowflake = SummaryDataFormatters.format_snowflake_for_llm(snowflake_data)
        
        # Log what formatted data is being sent to LLM
        if snowflake_data:
            row_count = len(snowflake_data.get('results', [])) if isinstance(snowflake_data, dict) and 'results' in snowflake_data else snowflake_data.get('row_count', 0)
            logger.info("📊 LLM receiving formatted Snowflake data:")
            logger.info(f"   📈 Formatted summary:")
            for line in formatted_snowflake.split('\n'):
                if line.strip():
                    logger.info(f"   {line}")
            logger.info(f"   📝 Included in: HumanMessage (risk analysis phase)")
            logger.info(f"   📊 Source data: {row_count} raw records → formatted summary")

>>>>>>> 001-modify-analyzer-method
        prompt = f"""Analyze this fraud investigation and provide risk assessment:

## Investigation Details
- Entity: {state.get('entity_type', 'unknown')} - {state.get('entity_id', 'unknown')}
- Investigation ID: {state.get('investigation_id', 'unknown')}

## Snowflake Data Analysis ({state.get('date_range_days', 7)}-day lookback)
<<<<<<< HEAD
{SummaryDataFormatters.format_snowflake_for_llm(snowflake_data)}
=======
{formatted_snowflake}
>>>>>>> 001-modify-analyzer-method

## Tool Results
{SummaryDataFormatters.format_tools_for_llm(tool_results)}

## Domain Agent Findings
{SummaryDataFormatters.format_domains_for_llm(domain_findings)}

## Risk Indicators Found
{SummaryDataFormatters.format_risk_indicators_for_llm(state.get('risk_indicators', []))}

Based on ALL the above evidence, provide:
1. Overall risk score (0.0-1.0) - MUST be data-driven based on the evidence
2. Confidence in assessment (0.0-1.0) - based on data completeness
3. Top 5 risk factors with evidence
4. Detailed reasoning explaining your risk score
5. Specific recommended actions"""

        return prompt

    def _parse_llm_risk_assessment(self, llm_response: str) -> Dict[str, Any]:
        """Parse LLM response to extract risk assessment metrics."""
        # Extract risk score using regex
        risk_score = 0.5  # default
        confidence = 0.5  # default

        # Look for risk score patterns
<<<<<<< HEAD
        risk_patterns = [
            r"risk score[:\s]*([0-9.]+)",
            r"score[:\s]*([0-9.]+)",
            r"overall risk[:\s]*([0-9.]+)",
            r"([0-9.]+).*risk"
=======
        # CRITICAL FIX: Order patterns from most specific to least specific to avoid false matches
        # Pattern "([0-9.]+).*risk" is too broad and can match numbers from ranges like "(0.0–1.0)"
        risk_patterns = [
            r"risk\s*score[\s:]+([0-9.]+)",  # Most specific: "risk score: X"
            r"overall\s*risk[\s:]+([0-9.]+)",  # "overall risk: X"
            r"score[\s:]+([0-9.]+)",  # Less specific: "score: X" (but still requires colon/space)
>>>>>>> 001-modify-analyzer-method
        ]

        for pattern in risk_patterns:
            match = re.search(pattern, llm_response.lower())
            if match:
                try:
                    risk_score = min(1.0, max(0.0, float(match.group(1))))
                    break
                except (ValueError, IndexError):
                    continue

        # Look for confidence patterns
<<<<<<< HEAD
        conf_patterns = [
            r"confidence[:\s]*([0-9.]+)",
            r"confidence level[:\s]*([0-9.]+)"
=======
        # CRITICAL FIX: Order patterns from most specific to least specific
        conf_patterns = [
            r"confidence[\s:]+([0-9.]+)",  # Most specific: "confidence: X"
            r"confidence\s*level[\s:]+([0-9.]+)",  # "confidence level: X"
>>>>>>> 001-modify-analyzer-method
        ]

        for pattern in conf_patterns:
            match = re.search(pattern, llm_response.lower())
            if match:
                try:
                    confidence = min(1.0, max(0.0, float(match.group(1))))
                    break
                except (ValueError, IndexError):
                    continue

        return {
            "risk_score": risk_score,
            "confidence": confidence,
            "reasoning": llm_response,
            "risk_factors": self._extract_risk_factors(llm_response)
        }

    def _extract_risk_factors(self, llm_response: str) -> List[str]:
        """Extract risk factors from LLM response."""
        factors = []
        lines = llm_response.split('\n')

        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['risk', 'factor', 'indicator', 'suspicious', 'anomaly']):
                if len(line) > 10 and len(line) < 200:  # Reasonable length
                    factors.append(line)

        return factors[:5]  # Top 5 factors

    def _calculate_fallback_risk_score(self, state: Dict[str, Any]) -> Dict[str, Any]:
<<<<<<< HEAD
        """Calculate fallback risk score from data when LLM fails."""
        logger.info("🔄 Calculating fallback risk score from data")

        snowflake_data = state.get("snowflake_data", {})
        domain_findings = state.get("domain_findings", {})

        risk_score = 0.0
        confidence = 0.3  # Lower confidence for fallback

        # Factor in Snowflake data
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            if results:
                model_scores = [r.get("MODEL_SCORE", 0) for r in results if "MODEL_SCORE" in r]
                if model_scores:
                    risk_score += sum(model_scores) / len(model_scores) * 0.4

        # Factor in domain findings
        if domain_findings:
            domain_scores = [f.get("risk_score", 0) for f in domain_findings.values() if isinstance(f, dict)]
            if domain_scores:
                risk_score += sum(domain_scores) / len(domain_scores) * 0.6

        risk_score = min(1.0, max(0.0, risk_score))

        return {
            "risk_score": risk_score,
            "confidence": confidence,
            "reasoning": "Fallback calculation based on available data",
=======
        """Calculate fallback risk score using risk agent calculation method when LLM fails."""
        logger.info("🔄 Calculating fallback risk score using risk agent method")

        domain_findings = state.get("domain_findings", {})
        facts = state.get("facts", {})

        if not domain_findings:
            logger.warning("⚠️ No domain findings available for fallback risk calculation")
            return {
                "risk_score": 0.0,
                "confidence": 0.1,
                "reasoning": "No domain findings available - cannot calculate risk score",
                "risk_factors": ["Insufficient data"]
            }

        # Use risk agent calculation method (PRIMARY METHOD)
        try:
            from app.service.agent.orchestration.domain_agents.risk_agent import _calculate_real_risk_score
            risk_score = _calculate_real_risk_score(domain_findings, facts)
            logger.info(f"✅ Fallback risk score calculated: {risk_score:.4f}")
        except Exception as e:
            logger.error(f"❌ Risk agent calculation failed in fallback: {e}", exc_info=True)
            risk_score = 0.0

        return {
            "risk_score": risk_score,
            "confidence": 0.3,  # Lower confidence for fallback
            "reasoning": "Fallback calculation using risk agent method (LLM analysis unavailable)",
>>>>>>> 001-modify-analyzer-method
            "risk_factors": ["Data-driven assessment", "Limited LLM analysis"]
        }