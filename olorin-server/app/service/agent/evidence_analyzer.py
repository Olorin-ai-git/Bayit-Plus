"""
Evidence Analysis Service

Analyzes collected evidence from domain agents using LLM to generate risk scores.
This is the missing step that converts raw evidence into meaningful risk assessments.
"""

import re
import time
from typing import Dict, Any, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage

from app.service.logging import get_bridge_logger
from app.service.llm_manager import get_llm_manager
from app.utils.firebase_secrets import get_firebase_secret
from app.service.config import get_settings_for_env

logger = get_bridge_logger(__name__)


class EvidenceAnalyzer:
    """
    Analyzes domain evidence using LLM to generate risk scores.
    
    This service bridges the gap between evidence collection and risk scoring
    by using LLM analysis to interpret evidence patterns and generate
    meaningful risk assessments.
    """
    
    def __init__(self):
        """Initialize the evidence analyzer with LLM."""
        self.llm = self._initialize_llm()
        logger.debug("🧠 EvidenceAnalyzer initialized with LLM")
    
    def _initialize_llm(self):
        """Initialize LLM for evidence analysis."""
        import os
        
        # Check for TEST_MODE first
        test_mode = os.getenv("TEST_MODE", "").lower()
        has_api_key = (os.getenv("ANTHROPIC_API_KEY") or 
                      os.getenv("OPENAI_API_KEY") or 
                      os.getenv("GEMINI_API_KEY"))
        use_mock = test_mode == "mock" or not has_api_key
        
        if use_mock:
            logger.info("🧪 Using mock LLM for evidence analysis")
            from unittest.mock import MagicMock
            
            # Create a mock that returns structured risk assessment
            mock_llm = MagicMock()
            
            async def mock_ainvoke(messages, *args, **kwargs):
                from langchain_core.messages import AIMessage
                
                logger.info("🧪 Mock LLM: Analyzing evidence (returning mock assessment)")
                
                # Extract domain from messages to provide domain-specific mock responses
                domain = "unknown"
                for msg in messages:
                    if hasattr(msg, 'content'):
                        content = str(msg.content).lower()
                        if 'network' in content:
                            domain = "network"
                        elif 'device' in content:
                            domain = "device"
                        elif 'location' in content:
                            domain = "location"
                        elif 'logs' in content:
                            domain = "logs"
                        elif 'authentication' in content:
                            domain = "authentication"
                        elif 'risk' in content:
                            domain = "risk"
                        break
                
                # Provide mock assessment based on domain
                mock_response = f"""Based on the {domain} domain evidence analysis:

RISK SCORE: 0.3
CONFIDENCE: 0.7

RISK FACTORS:
- Limited data available for comprehensive analysis
- Evidence shows normal patterns with minor anomalies
- No critical red flags identified

REASONING:
The {domain} evidence shows typical behavior patterns with some minor variations 
that warrant monitoring but do not indicate immediate fraud risk. The analysis 
is based on available data points and standard risk assessment criteria.

RECOMMENDATIONS:
- Continue monitoring for unusual patterns
- Gather additional evidence if needed
- Review in context of other domain findings"""
                
                return AIMessage(content=mock_response)
            
            mock_llm.ainvoke = mock_ainvoke
            return mock_llm
        
        # Use real LLM for live mode
        try:
            llm_manager = get_llm_manager()
            llm = llm_manager.get_selected_model()
            
            if llm is None:
                raise RuntimeError("No LLM model available for evidence analysis")
            
            # Configure for evidence analysis
            if hasattr(llm, 'temperature'):
                llm.temperature = 0.2  # Lower temperature for consistent analysis
            if hasattr(llm, 'max_tokens'):
                llm.max_tokens = 2000  # Sufficient for detailed analysis
            
            logger.info(f"🤖 Evidence analyzer using model: {llm_manager.selected_model_id}")
            return llm
            
        except Exception as e:
            logger.warning(f"LLM Manager failed for evidence analysis: {e}")
            
            # Fallback to direct initialization
            settings = get_settings_for_env()
            api_key = get_firebase_secret(settings.anthropic_api_key_secret)
            
            if not api_key:
                raise RuntimeError("No API key available for evidence analysis")
            
            from langchain_anthropic import ChatAnthropic
            
            return ChatAnthropic(
                api_key=api_key,
                model='claude-3-5-sonnet-20240620',  # Cost-effective model
                temperature=0.2,
                max_tokens=2000,
                timeout=60
            )
    
    async def analyze_domain_evidence(
        self, 
        domain: str,
        evidence: List[str], 
        metrics: Dict[str, Any],
        snowflake_data: Optional[Dict[str, Any]] = None,
        entity_type: str = "unknown",
        entity_id: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Analyze domain evidence using LLM to generate risk assessment.
        
        Args:
            domain: Domain name (network, device, location, logs, authentication)
            evidence: List of evidence points collected
            metrics: Metrics and data points collected
            snowflake_data: Optional Snowflake context data
            entity_type: Type of entity being analyzed
            entity_id: ID of entity being analyzed
            
        Returns:
            Dict containing risk_score, confidence, analysis reasoning
        """
        start_time = time.time()
        
        logger.debug(f"🧠 Analyzing {domain} domain evidence for {entity_type} {entity_id}")
        logger.debug(f"   Evidence points: {len(evidence)}")
        logger.debug(f"   Metrics available: {len(metrics)}")
        
        # Prepare comprehensive analysis prompt
        analysis_prompt = self._create_evidence_analysis_prompt(
            domain, evidence, metrics, snowflake_data, entity_type, entity_id
        )
        
        # Create system message for domain-specific analysis
        system_prompt = self._create_domain_system_prompt(domain)
        system_msg = SystemMessage(content=system_prompt)
        human_msg = HumanMessage(content=analysis_prompt)
        
        try:
            # Invoke LLM for evidence analysis
            logger.debug(f"🤖 Invoking LLM for {domain} evidence analysis...")
            response = await self.llm.ainvoke([system_msg, human_msg])
            analysis_duration = time.time() - start_time
            
            # Parse LLM response
            analysis_result = self._parse_evidence_analysis(response.content, domain)
            analysis_result["analysis_duration"] = analysis_duration
            
            logger.debug(f"✅ {domain} evidence analysis complete:")
            logger.debug(f"   Risk Score: {analysis_result['risk_score']:.2f}")
            logger.debug(f"   Confidence: {analysis_result['confidence']:.2f}")
            logger.debug(f"   Duration: {analysis_duration:.3f}s")
            
            return analysis_result
            
        except Exception as e:
            analysis_duration = time.time() - start_time
            logger.error(f"❌ {domain} evidence analysis failed: {e}")
            
            # Return fallback analysis
            return self._create_fallback_analysis(domain, evidence, metrics, analysis_duration)
    
    def _create_domain_system_prompt(self, domain: str) -> str:
        """Create domain-specific system prompt for LLM analysis."""
        
        domain_expertise = {
            "network": """You are a network security expert specializing in IP reputation analysis, 
            geographic patterns, VPN detection, and network behavior analysis. You understand 
            network-based fraud indicators and can assess IP-related risks.""",
            
            "device": """You are a device fingerprinting expert specializing in device consistency 
            analysis, browser spoofing detection, and device behavior patterns. You understand 
            device-based fraud indicators and can assess device-related risks.""",
            
            "location": """You are a geographic analysis expert specializing in location patterns, 
            impossible travel detection, and geographic risk assessment. You understand 
            location-based fraud indicators and can assess geographic risks.""",
            
            "logs": """You are a log analysis expert specializing in behavioral pattern analysis, 
            system logs interpretation, and activity pattern detection. You understand 
            behavioral fraud indicators and can assess activity-based risks.""",
            
            "authentication": """You are an authentication security expert specializing in login 
            pattern analysis, credential security, and authentication anomaly detection. You 
            understand authentication-based fraud indicators and security risks.""",
            
            "risk": """You are a comprehensive fraud risk expert specializing in synthesizing 
            findings from multiple domains to provide overall risk assessment. You understand 
            how different risk factors combine to indicate fraud probability."""
        }
        
        base_prompt = domain_expertise.get(domain, f"You are a {domain} analysis expert.")
        
        return f"""{base_prompt}

Your task is to analyze evidence from {domain} domain analysis and provide:
1. A risk score from 0.0 to 1.0 based on the evidence
2. Confidence level in your assessment (0.0 to 1.0)
3. Key risk factors identified
4. Detailed reasoning for your assessment
5. Specific recommendations

CRITICAL: Base your assessment ONLY on the actual evidence provided. 
Do not make assumptions or use arbitrary values. If evidence is limited, 
reflect that in your confidence score."""
    
    def _create_evidence_analysis_prompt(
        self, 
        domain: str,
        evidence: List[str], 
        metrics: Dict[str, Any],
        snowflake_data: Optional[Dict[str, Any]],
        entity_type: str,
        entity_id: str
    ) -> str:
        """Create comprehensive prompt for evidence analysis."""
        
        # Format evidence
        evidence_text = "\n".join([f"- {e}" for e in evidence]) if evidence else "No evidence collected"
        
        # Format metrics
        metrics_text = self._format_metrics_for_analysis(metrics)
        
        # Format Snowflake context
        snowflake_text = self._format_snowflake_for_analysis(snowflake_data) if snowflake_data else "No Snowflake context available"
        
        prompt = f"""Analyze this {domain} domain evidence for fraud risk assessment:

## Entity Information
- Type: {entity_type}
- ID: {entity_id}
- Domain: {domain}

## Evidence Collected
{evidence_text}

## Metrics and Data Points
{metrics_text}

## Snowflake Context
{snowflake_text}

## Analysis Requirements
Provide a comprehensive fraud risk assessment based ONLY on the evidence above:

1. **RISK SCORE**: (0.0 to 1.0) - Must be justified by evidence
2. **CONFIDENCE**: (0.0 to 1.0) - Based on evidence quality and completeness
3. **RISK FACTORS**: List specific factors that increase/decrease risk
4. **REASONING**: Detailed explanation of your risk assessment
5. **RECOMMENDATIONS**: Specific actions based on your findings

Format your response clearly with these sections. Be precise and evidence-based."""
        
        return prompt
    
    def _format_metrics_for_analysis(self, metrics: Dict[str, Any]) -> str:
        """Format metrics dictionary for LLM analysis."""
        if not metrics:
            return "No metrics available"
        
        formatted = []
        for key, value in metrics.items():
            if key == "snowflake_records_count":
                formatted.append(f"- Snowflake Records: {value}")
            elif "_count" in key:
                formatted.append(f"- {key.replace('_', ' ').title()}: {value}")
            elif "_score" in key or "_level" in key:
                formatted.append(f"- {key.replace('_', ' ').title()}: {value}")
            else:
                formatted.append(f"- {key.replace('_', ' ').title()}: {value}")
        
        return "\n".join(formatted) if formatted else "No meaningful metrics"
    
    def _format_snowflake_for_analysis(self, snowflake_data: Dict[str, Any]) -> str:
        """Format Snowflake data for evidence analysis."""
        if not snowflake_data:
            return "No Snowflake data available"
        
        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            if not results:
                return "No transaction records found in Snowflake"
            
            # Extract key insights for context
            total_records = len(results)
            model_scores = [r.get("MODEL_SCORE", 0) for r in results if "MODEL_SCORE" in r]
            fraud_flags = [r for r in results if r.get("IS_FRAUD_TX")]
            
            context = f"""Snowflake Transaction Context:
- Total Records: {total_records}
- Average Model Score: {sum(model_scores)/len(model_scores) if model_scores else 0:.3f}
- High Risk Transactions (>0.7): {len([s for s in model_scores if s > 0.7])}
- Confirmed Fraud: {len(fraud_flags)}

NOTE: MODEL_SCORE is for reference only - your analysis should be based on domain-specific evidence."""
            
            return context
        
        return f"Raw Snowflake data: {str(snowflake_data)[:300]}..."
    
    def _parse_evidence_analysis(self, llm_response: str, domain: str) -> Dict[str, Any]:
        """Parse LLM response to extract structured analysis."""
        import re
        
        # Extract risk score
        risk_pattern = r"risk\s*score[:\s]*(\d*\.?\d+)"
        risk_match = re.search(risk_pattern, llm_response.lower())
        risk_score = float(risk_match.group(1)) if risk_match else 0.2
        
        # Extract confidence
        conf_pattern = r"confidence[:\s]*(\d*\.?\d+)"
        conf_match = re.search(conf_pattern, llm_response.lower())
        confidence = float(conf_match.group(1)) if conf_match else 0.5
        
        # Extract risk factors
        factors_section = self._extract_section(llm_response, "risk factors")
        
        # Extract reasoning
        reasoning_section = self._extract_section(llm_response, "reasoning")
        
        # Extract recommendations
        recommendations_section = self._extract_section(llm_response, "recommendations")
        
        return {
            "risk_score": min(1.0, max(0.0, risk_score)),
            "confidence": min(1.0, max(0.0, confidence)),
            "risk_factors": factors_section,
            "reasoning": reasoning_section,
            "recommendations": recommendations_section,
            "llm_response": llm_response,
            "domain": domain,
            "analysis_type": "llm_evidence_analysis"
        }
    
    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a specific section from LLM response."""
        # Try to find section with various formatting
        patterns = [
            rf"(?:^|\n)\s*\*\*{section_name}[:\s]*\*\*[:\s]*([\s\S]*?)(?=\n\s*\*\*|\n\s*##|\n\s*$|$)",
            rf"(?:^|\n)\s*#{1,3}\s*{section_name}[:\s]*([\s\S]*?)(?=\n\s*#|\n\s*$|$)",
            rf"(?:^|\n)\s*\d+\.\s*\*\*{section_name}[:\s]*\*\*[:\s]*([\s\S]*?)(?=\n\s*\d+\.|\n\s*$|$)",
            rf"(?:{section_name})[:\s]*([\s\S]*?)(?=\n\s*(?:risk|confidence|reasoning|recommendations|\*\*|##)|$)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        # Fallback: return portion of text that might contain the section
        return f"Section not clearly identified in response: {text[:200]}..."
    
    def _create_fallback_analysis(
        self, 
        domain: str, 
        evidence: List[str], 
        metrics: Dict[str, Any], 
        duration: float
    ) -> Dict[str, Any]:
        """Create fallback analysis when LLM fails."""
        
        # Simple evidence-based scoring
        evidence_score = min(1.0, len(evidence) * 0.1) if evidence else 0.0
        
        # Check for high-risk indicators in evidence
        risk_keywords = ["suspicious", "anomaly", "unusual", "high", "critical", "threat", "malicious"]
        risk_indicators = sum(1 for e in evidence for keyword in risk_keywords if keyword.lower() in e.lower())
        
        risk_score = min(1.0, evidence_score + (risk_indicators * 0.1))
        confidence = 0.3  # Low confidence for fallback
        
        return {
            "risk_score": risk_score,
            "confidence": confidence,
            "risk_factors": f"Fallback analysis based on {len(evidence)} evidence points",
            "reasoning": f"LLM analysis failed. Fallback assessment based on evidence count and risk keywords.",
            "recommendations": f"Manual review recommended due to analysis failure. Evidence points: {len(evidence)}",
            "llm_response": "LLM analysis failed - using fallback calculation",
            "domain": domain,
            "analysis_type": "fallback_analysis",
            "analysis_duration": duration
        }


# Singleton instance for domain agents to use
_evidence_analyzer_instance = None

def get_evidence_analyzer() -> EvidenceAnalyzer:
    """Get singleton instance of EvidenceAnalyzer."""
    global _evidence_analyzer_instance
    if _evidence_analyzer_instance is None:
        _evidence_analyzer_instance = EvidenceAnalyzer()
    return _evidence_analyzer_instance