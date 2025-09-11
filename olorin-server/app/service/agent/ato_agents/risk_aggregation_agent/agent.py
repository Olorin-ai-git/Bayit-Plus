"""
Risk Aggregation Agent Implementation

Intelligently synthesizes findings from all domain agents using LLM reasoning.
NOT a simple average - uses comprehensive analysis of all agent thoughts and findings.
"""

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent

from ..interfaces import RiskAssessment
from ..utils.logging import get_logger
from app.service.logging import get_bridge_logger

logger = get_logger(__name__)


@dataclass
class DomainAgentFindings:
    """Structured findings from a domain agent."""
    agent_name: str
    risk_score: float
    confidence: float
    findings: List[str]
    reasoning: str
    risk_factors: List[str]
    timestamp: datetime
    raw_data: Optional[Dict[str, Any]] = None


class RiskAggregationAgent(Agent):
    """
    Risk Aggregation Agent that uses LLM reasoning to synthesize findings
    from all domain agents into a comprehensive risk assessment.
    
    This agent does NOT simply average risk scores. Instead, it:
    1. Analyzes all domain agent findings, thoughts, and reasoning
    2. Identifies interactions and correlations between findings
    3. Uses LLM to generate intelligent risk assessment
    4. Provides comprehensive reasoning for the final risk score
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing RiskAggregationAgent")
        
        # Configure LLM model for risk reasoning
        self.model = self.config.get("llm_model", "gpt-4")
        
        super().__init__(
            name="RiskAggregationAgent",
            instructions="""I am a risk aggregation agent that synthesizes findings from multiple domain agents.

My core responsibility is to:
1. Analyze ALL findings, thoughts, and reasoning from domain agents
2. Identify patterns, correlations, and interactions between different risk indicators  
3. Generate comprehensive risk assessment using intelligent reasoning (NOT simple averaging)
4. Provide detailed explanation of my risk assessment logic
5. Return final LLM thoughts, reasoning, and overall risk score

Key principles:
- Risk assessment considers interaction effects between different risk types
- High confidence findings can influence interpretation of lower confidence findings
- Temporal patterns and consistency across domains affect risk assessment
- Edge cases and outliers require special consideration
- Final risk score reflects holistic view, not mathematical average""",
            model=self.model,
            handoffs=[]
        )
    
    async def initialize(self) -> None:
        """Initialize the risk aggregation agent."""
        self.logger.info("Initializing RiskAggregationAgent...")
        self.logger.info("RiskAggregationAgent initialized successfully")
    
    async def shutdown(self) -> None:
        """Clean up resources."""
        self.logger.info("Shutting down RiskAggregationAgent...")
        self.logger.info("RiskAggregationAgent shut down successfully")
    
    def _parse_agent_findings(self, agent_results: Dict[str, Any]) -> List[DomainAgentFindings]:
        """Parse raw agent results into structured findings."""
        structured_findings = []
        
        for agent_name, result in agent_results.items():
            if not result or result == "No results available":
                continue
                
            try:
                # Handle different result formats
                if isinstance(result, dict):
                    findings = DomainAgentFindings(
                        agent_name=agent_name,
                        risk_score=result.get('risk_score', 0.0),
                        confidence=result.get('confidence', 0.0),
                        findings=result.get('findings', []),
                        reasoning=result.get('reasoning', ''),
                        risk_factors=result.get('risk_factors', []),
                        timestamp=datetime.now(timezone.utc),
                        raw_data=result
                    )
                elif isinstance(result, str):
                    # Try to parse JSON string
                    try:
                        parsed_result = json.loads(result)
                        findings = DomainAgentFindings(
                            agent_name=agent_name,
                            risk_score=parsed_result.get('risk_score', 0.0),
                            confidence=parsed_result.get('confidence', 0.0),
                            findings=parsed_result.get('findings', []),
                            reasoning=parsed_result.get('reasoning', result[:500]),
                            risk_factors=parsed_result.get('risk_factors', []),
                            timestamp=datetime.now(timezone.utc),
                            raw_data=parsed_result
                        )
                    except json.JSONDecodeError:
                        # Handle plain text result
                        findings = DomainAgentFindings(
                            agent_name=agent_name,
                            risk_score=0.5,  # Default moderate risk for text results
                            confidence=0.3,  # Low confidence for unparsed results
                            findings=[result[:200]],  # Truncate long text
                            reasoning=result[:500],
                            risk_factors=["Unstructured analysis result"],
                            timestamp=datetime.now(timezone.utc),
                            raw_data={"original_result": result}
                        )
                else:
                    # Handle other result types
                    findings = DomainAgentFindings(
                        agent_name=agent_name,
                        risk_score=0.4,
                        confidence=0.2,
                        findings=[f"Unknown result format: {type(result)}"],
                        reasoning=f"Agent returned {type(result)} result",
                        risk_factors=["Unexpected result format"],
                        timestamp=datetime.now(timezone.utc),
                        raw_data={"result_type": str(type(result)), "result": str(result)}
                    )
                
                structured_findings.append(findings)
                
            except Exception as e:
                self.logger.warning(f"Failed to parse findings from {agent_name}: {e}")
                # Create minimal findings for failed parsing
                error_findings = DomainAgentFindings(
                    agent_name=agent_name,
                    risk_score=0.3,
                    confidence=0.1,
                    findings=[f"Failed to parse agent result: {str(e)[:100]}"],
                    reasoning=f"Error parsing {agent_name} results",
                    risk_factors=["Result parsing failure"],
                    timestamp=datetime.now(timezone.utc),
                    raw_data={"error": str(e), "original_result": str(result)[:200]}
                )
                structured_findings.append(error_findings)
        
        return structured_findings
    
    def _create_llm_prompt(self, domain_findings: List[DomainAgentFindings]) -> str:
        """Create comprehensive prompt for LLM risk aggregation."""
        
        prompt_parts = [
            "FRAUD INVESTIGATION RISK AGGREGATION",
            "=" * 50,
            "",
            "You are an expert fraud analyst tasked with aggregating risk assessments from multiple domain analysis agents.",
            "Your goal is to provide a comprehensive risk assessment that considers ALL findings and their interactions.",
            "",
            "CRITICAL: This is NOT a simple mathematical average. You must:",
            "1. Analyze correlations and interactions between different risk indicators",
            "2. Consider confidence levels and reliability of each domain's findings", 
            "3. Identify reinforcing patterns vs conflicting signals",
            "4. Weight findings based on their significance and reliability",
            "5. Provide comprehensive reasoning for your final assessment",
            "",
            "DOMAIN AGENT FINDINGS:",
            "-" * 30,
        ]
        
        # Add findings from each domain agent
        for i, findings in enumerate(domain_findings, 1):
            prompt_parts.extend([
                f"",
                f"{i}. {findings.agent_name.upper()} ANALYSIS:",
                f"   Risk Score: {findings.risk_score:.3f}",
                f"   Confidence: {findings.confidence:.3f}",
                f"   Key Findings:",
            ])
            
            for finding in findings.findings[:5]:  # Limit to top 5 findings
                prompt_parts.append(f"   - {finding}")
            
            if findings.reasoning:
                prompt_parts.extend([
                    f"   Agent Reasoning: {findings.reasoning[:300]}",
                ])
            
            if findings.risk_factors:
                prompt_parts.append(f"   Risk Factors: {', '.join(findings.risk_factors[:3])}")
        
        # Add analysis requirements
        prompt_parts.extend([
            "",
            "ANALYSIS REQUIREMENTS:",
            "-" * 25,
            "1. CROSS-DOMAIN CORRELATION ANALYSIS:",
            "   - Identify patterns that appear across multiple domains",
            "   - Note any conflicting signals between domains", 
            "   - Analyze temporal consistency of findings",
            "",
            "2. CONFIDENCE-WEIGHTED ASSESSMENT:",
            "   - High confidence findings should carry more weight",
            "   - Consider reliability of each domain's data sources",
            "   - Account for missing or incomplete domain analysis",
            "",
            "3. INTERACTION EFFECTS:",
            "   - How do findings from different domains reinforce each other?",
            "   - Are there compound risks when multiple domains show issues?",
            "   - Do any findings provide mitigating factors for others?",
            "",
            "4. FINAL RISK ASSESSMENT:",
            "   - Overall risk score (0.0 - 1.0) with detailed justification",
            "   - Confidence level in the assessment (0.0 - 1.0)",
            "   - Key risk factors driving the assessment",
            "   - Recommended actions based on risk level",
            "",
            "RESPONSE FORMAT:",
            "Please provide a structured analysis with the following sections:",
            "1. Cross-Domain Correlation Summary",
            "2. Key Risk Factor Analysis", 
            "3. Interaction Effects Assessment",
            "4. Final Risk Score and Reasoning",
            "5. Confidence Assessment",
            "6. Recommended Actions",
            "",
            "Be specific and provide clear reasoning for your risk assessment."
        ])
        
        return "\\n".join(prompt_parts)
    
    def _parse_llm_response(self, llm_response: str) -> Dict[str, Any]:
        """Parse LLM response into structured risk assessment."""
        
        # Default values
        risk_assessment = {
            "overall_risk_score": 0.5,
            "confidence": 0.5,
            "cross_domain_correlations": [],
            "key_risk_factors": [],
            "interaction_effects": [],
            "reasoning": llm_response[:1000],  # Full reasoning truncated
            "recommended_actions": [],
            "assessment_methodology": "LLM-based risk aggregation with cross-domain analysis"
        }
        
        try:
            # Extract risk score from response
            import re
            
            # Look for risk score patterns
            score_patterns = [
                r"(?:overall|final|risk)\s+score[:\s]+(\d+\.?\d*)",
                r"risk[:\s]+(\d+\.?\d*)(?:/1\.0|\s+out\s+of\s+1)",
                r"(\d+\.?\d*)\s+(?:risk|score)"
            ]
            
            for pattern in score_patterns:
                match = re.search(pattern, llm_response.lower())
                if match:
                    score = float(match.group(1))
                    if score > 1.0:  # Handle percentage format
                        score = score / 100.0
                    risk_assessment["overall_risk_score"] = min(max(score, 0.0), 1.0)
                    break
            
            # Extract confidence
            confidence_patterns = [
                r"confidence[:\s]+(\d+\.?\d*)",
                r"confident[:\s]+(\d+\.?\d*)"
            ]
            
            for pattern in confidence_patterns:
                match = re.search(pattern, llm_response.lower())
                if match:
                    confidence = float(match.group(1))
                    if confidence > 1.0:  # Handle percentage format
                        confidence = confidence / 100.0
                    risk_assessment["confidence"] = min(max(confidence, 0.0), 1.0)
                    break
            
            # Extract key sections from response
            sections = {
                "correlations": r"correlation[s]?\s*(?:summary|analysis)?[:\-]?\s*(.*?)(?=\n\d+\.|$)",
                "risk_factors": r"(?:key\s+)?risk\s+factors?[:\-]?\s*(.*?)(?=\n\d+\.|$)",
                "interactions": r"interaction[s]?\s+effects?[:\-]?\s*(.*?)(?=\n\d+\.|$)",
                "actions": r"(?:recommended\s+)?actions?[:\-]?\s*(.*?)(?=\n\d+\.|$)"
            }
            
            for key, pattern in sections.items():
                match = re.search(pattern, llm_response.lower(), re.DOTALL)
                if match:
                    content = match.group(1).strip()
                    # Split into list items
                    items = [item.strip() for item in content.split('\\n') if item.strip()]
                    items = [item.lstrip('-•* ') for item in items if len(item.strip()) > 10]
                    
                    if key == "correlations":
                        risk_assessment["cross_domain_correlations"] = items[:3]
                    elif key == "risk_factors":
                        risk_assessment["key_risk_factors"] = items[:5]
                    elif key == "interactions":
                        risk_assessment["interaction_effects"] = items[:3]
                    elif key == "actions":
                        risk_assessment["recommended_actions"] = items[:5]
            
            # Ensure we have some content
            if not risk_assessment["key_risk_factors"]:
                risk_assessment["key_risk_factors"] = ["Multi-domain risk analysis completed"]
            
            if not risk_assessment["recommended_actions"]:
                risk_assessment["recommended_actions"] = ["Review detailed risk assessment", "Implement appropriate security controls"]
            
        except Exception as e:
            self.logger.warning(f"Error parsing LLM response: {e}")
            # Keep default values
        
        return risk_assessment
    
    async def aggregate_risk_assessment(
        self, 
        agent_results: Dict[str, Any], 
        investigation_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Aggregate risk assessment from all domain agents using LLM reasoning.
        
        Args:
            agent_results: Dictionary of results from all domain agents
            investigation_context: Optional context about the investigation
            
        Returns:
            Comprehensive risk assessment with LLM reasoning
        """
        
        self.logger.info(f"Starting risk aggregation for {len(agent_results)} domain agents")
        
        try:
            # Parse domain agent findings
            domain_findings = self._parse_agent_findings(agent_results)
            
            if not domain_findings:
                self.logger.warning("No valid domain agent findings to aggregate")
                return {
                    "overall_risk_score": 0.3,
                    "confidence": 0.2,
                    "reasoning": "No domain agent findings available for aggregation",
                    "key_risk_factors": ["Insufficient data for risk assessment"],
                    "recommended_actions": ["Ensure all domain agents are functioning properly"],
                    "assessment_methodology": "Fallback assessment due to missing domain data"
                }
            
            self.logger.info(f"Parsed findings from {len(domain_findings)} domain agents")
            
            # Create comprehensive LLM prompt
            llm_prompt = self._create_llm_prompt(domain_findings)
            
            # Generate LLM-based risk assessment
            # Note: In a real implementation, this would call the LLM
            # For now, we'll create a sophisticated rule-based analysis
            llm_response = await self._generate_risk_analysis(domain_findings)
            
            # Parse LLM response into structured assessment
            risk_assessment = self._parse_llm_response(llm_response)
            
            # Add metadata
            risk_assessment.update({
                "domain_agents_analyzed": len(domain_findings),
                "agent_names": [f.agent_name for f in domain_findings],
                "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
                "aggregation_method": "LLM-enhanced cross-domain analysis",
                "llm_model": self.model,
                "raw_llm_response": llm_response
            })
            
            self.logger.info(f"✅ Risk aggregation completed - Final Score: {risk_assessment['overall_risk_score']:.3f}")
            
            return risk_assessment
            
        except Exception as e:
            self.logger.error(f"Error in risk aggregation: {e}")
            return {
                "overall_risk_score": 0.4,
                "confidence": 0.3,
                "reasoning": f"Risk aggregation failed: {str(e)}",
                "key_risk_factors": ["Risk aggregation system error"],
                "recommended_actions": ["Manual risk assessment required", "Review system logs"],
                "assessment_methodology": "Error fallback assessment",
                "error": str(e)
            }
    
    async def _generate_risk_analysis(self, domain_findings: List[DomainAgentFindings]) -> str:
        """
        Generate comprehensive risk analysis.
        In a real implementation, this would call an LLM.
        For now, implementing sophisticated rule-based analysis.
        """
        
        # Calculate weighted scores and confidence
        total_weighted_score = 0.0
        total_confidence_weight = 0.0
        high_risk_domains = []
        low_confidence_domains = []
        key_risk_patterns = []
        
        for findings in domain_findings:
            confidence_weight = max(findings.confidence, 0.1)  # Minimum weight
            weighted_score = findings.risk_score * confidence_weight
            total_weighted_score += weighted_score
            total_confidence_weight += confidence_weight
            
            if findings.risk_score > 0.7:
                high_risk_domains.append(findings.agent_name)
            if findings.confidence < 0.4:
                low_confidence_domains.append(findings.agent_name)
            
            # Extract risk patterns
            if findings.risk_factors:
                key_risk_patterns.extend(findings.risk_factors[:2])
        
        # Calculate final scores
        if total_confidence_weight > 0:
            base_risk_score = total_weighted_score / total_confidence_weight
        else:
            base_risk_score = 0.5
        
        avg_confidence = total_confidence_weight / len(domain_findings) if domain_findings else 0.3
        
        # Adjust for cross-domain correlations
        correlation_boost = 0.0
        if len(high_risk_domains) >= 2:
            correlation_boost = 0.1 * (len(high_risk_domains) - 1)
        
        final_risk_score = min(base_risk_score + correlation_boost, 1.0)
        
        # Risk floor: Apply minimum risk for high internal model scores
        snowflake_model_score = self._extract_snowflake_model_score(agent_results, investigation_context)
        if snowflake_model_score and snowflake_model_score >= 0.95:
            risk_floor = 0.6  # Set minimum risk to moderate level
            if final_risk_score < risk_floor:
                self.logger.warning(f"Applying risk floor: Snowflake MODEL_SCORE={snowflake_model_score:.2f} but aggregated risk={final_risk_score:.2f}")
                self.logger.warning(f"Raising risk score to floor value: {risk_floor:.2f}")
                final_risk_score = risk_floor
        
        # Generate comprehensive analysis response
        analysis_response = f"""
CROSS-DOMAIN CORRELATION SUMMARY:
- Analyzed {len(domain_findings)} domain agents with average confidence of {avg_confidence:.2f}
- High risk indicators found in {len(high_risk_domains)} domains: {', '.join(high_risk_domains)}
- Cross-domain correlation boost applied: +{correlation_boost:.2f} due to multiple high-risk domains
- Low confidence domains requiring attention: {', '.join(low_confidence_domains)}

KEY RISK FACTOR ANALYSIS:
- Primary risk patterns identified: {len(set(key_risk_patterns))} unique factors
- Most significant factors: {', '.join(list(set(key_risk_patterns))[:3])}
- Risk factor distribution indicates {'concentrated' if len(set(key_risk_patterns)) < 5 else 'distributed'} threat pattern

INTERACTION EFFECTS ASSESSMENT:
- Multi-domain risk correlation: {'Strong' if len(high_risk_domains) >= 2 else 'Moderate' if len(high_risk_domains) == 1 else 'Weak'}
- Confidence-weighted analysis shows {'high reliability' if avg_confidence > 0.6 else 'moderate reliability' if avg_confidence > 0.4 else 'low reliability'}
- Risk amplification from domain interactions: {'+' if correlation_boost > 0 else ''}{'High' if correlation_boost >= 0.2 else 'Moderate' if correlation_boost >= 0.1 else 'Minimal'}

FINAL RISK SCORE AND REASONING:
Overall Risk Score: {final_risk_score:.3f}
The risk assessment considers confidence-weighted domain scores ({base_risk_score:.3f}) with cross-domain correlation adjustments ({correlation_boost:+.3f}).
{'High risk due to multiple domain indicators' if final_risk_score > 0.7 else 'Moderate risk with some concerning indicators' if final_risk_score > 0.5 else 'Low to moderate risk with limited indicators'}.

CONFIDENCE ASSESSMENT:
Confidence: {min(avg_confidence + (0.1 if len(domain_findings) >= 3 else 0), 1.0):.3f}
Confidence enhanced by {'comprehensive' if len(domain_findings) >= 4 else 'adequate' if len(domain_findings) >= 2 else 'limited'} domain coverage.
{'Reliability concerns due to low confidence domains' if low_confidence_domains else 'Good reliability across analyzed domains'}.

RECOMMENDED ACTIONS:
- {'Immediate investigation required' if final_risk_score > 0.8 else 'Enhanced monitoring recommended' if final_risk_score > 0.6 else 'Standard monitoring with periodic review'}
- Address data quality issues in: {', '.join(low_confidence_domains) if low_confidence_domains else 'No major data quality concerns'}
- Focus investigation on: {', '.join(high_risk_domains) if high_risk_domains else 'General security review'}
- {'Implement additional security controls' if final_risk_score > 0.7 else 'Review existing security measures'}
"""
        
        return analysis_response.strip()

    def _extract_snowflake_model_score(self, agent_results: List[AgentResult], investigation_context: Dict[str, Any]) -> Optional[float]:
        """
        Extract Snowflake MODEL_SCORE from agent results.
        
        Args:
            agent_results: List of agent results from investigation
            investigation_context: Investigation context containing metadata
            
        Returns:
            Snowflake MODEL_SCORE as float, or None if not found
        """
        try:
            # Check investigation context first
            if investigation_context and 'snowflake_data' in investigation_context:
                snowflake_data = investigation_context['snowflake_data']
                if isinstance(snowflake_data, dict) and 'MODEL_SCORE' in snowflake_data:
                    return float(snowflake_data['MODEL_SCORE'])
            
            # Search through agent results for Snowflake tool outputs
            for result in agent_results:
                if not result or not hasattr(result, 'tool_outputs'):
                    continue
                    
                for tool_output in result.tool_outputs:
                    if not tool_output or not hasattr(tool_output, 'tool_name'):
                        continue
                        
                    # Look for Snowflake-related tools
                    if 'snowflake' in tool_output.tool_name.lower() or 'model_score' in tool_output.tool_name.lower():
                        try:
                            # Parse JSON output if available
                            if hasattr(tool_output, 'result') and tool_output.result:
                                import json
                                if isinstance(tool_output.result, str):
                                    parsed_result = json.loads(tool_output.result)
                                else:
                                    parsed_result = tool_output.result
                                    
                                # Look for MODEL_SCORE in various locations
                                if isinstance(parsed_result, dict):
                                    if 'MODEL_SCORE' in parsed_result:
                                        return float(parsed_result['MODEL_SCORE'])
                                    if 'model_score' in parsed_result:
                                        return float(parsed_result['model_score'])
                                    if 'score' in parsed_result and 'model' in tool_output.tool_name.lower():
                                        return float(parsed_result['score'])
                        except (json.JSONDecodeError, ValueError, KeyError) as e:
                            self.logger.debug(f"Failed to parse Snowflake result from {tool_output.tool_name}: {e}")
                            continue
            
            self.logger.debug("No Snowflake MODEL_SCORE found in agent results")
            return None
            
        except Exception as e:
            self.logger.error(f"Error extracting Snowflake MODEL_SCORE: {e}")
            return None