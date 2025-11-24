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
from app.service.config_loader import ConfigLoader
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

        logger.info(f"🧠 EvidenceAnalyzer initialization: test_mode={test_mode}, has_api_key={bool(has_api_key)}, use_mock={use_mock}")

        if use_mock:
            logger.info("🧪 Using mock LLM for evidence analysis")
            return self._create_mock_llm()
        
        # Use real LLM for live mode
        try:
            llm_manager = get_llm_manager()
            llm = llm_manager.get_selected_model()

            if llm is None:
                logger.warning("❌ No LLM model available - falling back to mock mode")
                # Fall back to mock mode if LLM initialization fails
                return self._create_mock_llm()

            # Configure for evidence analysis
            if hasattr(llm, 'temperature'):
                llm.temperature = 0.1  # Low temperature for consistent, deterministic results
            if hasattr(llm, 'max_tokens'):
                llm.max_tokens = 4096  # Increased for comprehensive fraud analysis responses

            logger.info(f"🤖 Evidence analyzer using live model: {llm_manager.selected_model_id}")
            return llm

        except Exception as e:
            logger.error(f"❌ LLM Manager failed for evidence analysis: {e}")
            logger.warning("🧪 Falling back to mock LLM mode for evidence analysis")
            # Fall back to mock mode instead of crashing
            return self._create_mock_llm()

    def _create_mock_llm(self):
        """Create a mock LLM using the real MockLLM with enhanced responses."""
        from app.service.agent.mock_llm import get_mock_llm
        import sys
        import traceback

        # Version marker for debugging
        print("="*80, file=sys.stderr)
        print("🔍 EVIDENCE ANALYZER: Creating MockLLM (v3 - Enhanced Exception Logging)", file=sys.stderr)
        print("="*80, file=sys.stderr)

        try:
            logger.info("🧪 Creating MockLLM with enhanced responses for evidence analysis")
            mock_llm = get_mock_llm()

            # Verify MockLLM was created successfully
            if mock_llm is None:
                error_msg = "get_mock_llm() returned None"
                logger.error(f"❌ MockLLM creation failed: {error_msg}")
                print(f"❌ ERROR: {error_msg}", file=sys.stderr)
                raise RuntimeError(error_msg)

            logger.info(f"✅ MockLLM created successfully: {type(mock_llm).__name__}")
            print(f"✅ MockLLM type: {type(mock_llm).__name__}", file=sys.stderr)
            return mock_llm

        except Exception as e:
            error_msg = f"Failed to create MockLLM: {type(e).__name__}: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.error(f"   Traceback: {traceback.format_exc()}")
            print("="*80, file=sys.stderr)
            print(f"❌ CRITICAL ERROR in _create_mock_llm:", file=sys.stderr)
            print(f"   Exception Type: {type(e).__name__}", file=sys.stderr)
            print(f"   Exception Message: {str(e)}", file=sys.stderr)
            print(f"   Full Traceback:", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            print("="*80, file=sys.stderr)
            raise
    
    async def analyze_domain_evidence(
        self,
        domain: str,
        evidence: List[str],
        metrics: Dict[str, Any],
        snowflake_data: Optional[Dict[str, Any]] = None,
        tool_results: Optional[Dict[str, Any]] = None,
        entity_type: str = "unknown",
        entity_id: str = "unknown",
        computed_risk_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Analyze domain evidence using LLM to generate risk assessment.

        CRITICAL: Now includes tool_results to ensure LLM has access to ALL tool execution data.

        Args:
            domain: Domain name (network, device, location, logs, authentication)
            evidence: List of evidence points collected
            metrics: Metrics and data points collected
            snowflake_data: Optional Snowflake context data
            tool_results: ALL tool execution results from state (ADDED for complete aggregation)
            entity_type: Type of entity being analyzed
            entity_id: ID of entity being analyzed
            computed_risk_score: Optional pre-computed risk score for validation

        Returns:
            Dict containing risk_score, confidence, analysis reasoning
        """
        start_time = time.time()

        logger.debug(f"🧠 Analyzing {domain} domain evidence for {entity_type} {entity_id}")
        logger.debug(f"   Evidence points: {len(evidence)}")
        logger.debug(f"   Metrics available: {len(metrics)}")

        # CRITICAL: Log tool results aggregation
        if tool_results is None:
            tool_results = {}
        logger.info(f"🔧 Tool Results Aggregation:")
        logger.info(f"   Total tool results available: {len(tool_results)}")
        if tool_results:
            logger.info(f"   Tool names: {list(tool_results.keys())}")
            for tool_name, tool_content in list(tool_results.items())[:3]:  # Show first 3
                content_preview = str(tool_content)[:100] if tool_content else "[Empty]"
                logger.info(f"   {tool_name}: {content_preview}...")
        else:
            logger.warning(f"   ⚠️ No tool results provided - LLM analysis may be incomplete")

        # Prepare comprehensive analysis prompt with ALL data sources
        analysis_prompt = self._create_evidence_analysis_prompt(
            domain, evidence, metrics, snowflake_data, tool_results, entity_type, entity_id, computed_risk_score
        )
        
        # Create system message for domain-specific analysis
        system_prompt = self._create_domain_system_prompt(domain)
        system_msg = SystemMessage(content=system_prompt)
        human_msg = HumanMessage(content=analysis_prompt)
        
        # Log full LLM prompt when snowflake data is included
        if snowflake_data:
            logger.info("📝 LLM Prompt (with formatted Snowflake data):")
            logger.info(f"   System Message: {system_prompt[:1000]}...")
            if len(system_prompt) > 1000:
                logger.info(f"   ... (truncated, full length: {len(system_prompt)} chars)")
            logger.info(f"   Human Message: {analysis_prompt[:3000]}...")
            if len(analysis_prompt) > 3000:
                logger.info(f"   ... (truncated, full length: {len(analysis_prompt)} chars)")
        
        try:
            # Invoke LLM for evidence analysis
            logger.debug(f"🤖 Invoking LLM for {domain} evidence analysis...")
            response = await self.llm.ainvoke([system_msg, human_msg])
            analysis_duration = time.time() - start_time
            
            # Log full LLM response (increased limit for better visibility)
            if snowflake_data:
                logger.info("🤖 LLM Response (after receiving formatted Snowflake data):")
                if hasattr(response, 'content') and response.content:
                    response_preview = str(response.content)[:5000] if response.content else "[Empty response]"
                    logger.info(f"   Response content: {response_preview}")
                    if len(str(response.content)) > 5000:
                        logger.info(f"   ... (truncated, full length: {len(str(response.content))} chars)")
                else:
                    logger.info("   Response: [No content]")

            # Parse LLM response, with computed score override if provided
            # CRITICAL FIX: Safely extract content from response (handle both dict and object responses)
            response_content = response.content if hasattr(response, 'content') else response
            if isinstance(response_content, dict):
                response_content = response_content.get('content', str(response_content))
            analysis_result = self._parse_evidence_analysis(response_content, domain, computed_risk_score, snowflake_data)
            analysis_result["analysis_duration"] = analysis_duration
            
            logger.debug(f"✅ {domain} evidence analysis complete:")
            if analysis_result.get('risk_score') is not None:
                logger.debug(f"   Risk Score: {analysis_result['risk_score']:.2f}")
            else:
                logger.debug(f"   Risk Score: INSUFFICIENT_DATA (LLM did not provide a score)")
            logger.debug(f"   Confidence: {analysis_result.get('confidence', 0.0):.2f}")
            logger.debug(f"   Duration: {analysis_duration:.3f}s")
            
            return analysis_result
            
        except Exception as e:
            analysis_duration = time.time() - start_time
            # Enhanced logging to capture full exception details
            import traceback
            import sys

            # CRITICAL: Use print to bypass logging system
            print(f"\n{'='*80}", file=sys.stderr)
            print(f"❌ EVIDENCE ANALYZER EXCEPTION CAUGHT", file=sys.stderr)
            print(f"   Domain: {domain}", file=sys.stderr)
            print(f"   Exception: {e}", file=sys.stderr)
            print(f"   Exception type: {type(e).__name__}", file=sys.stderr)
            print(f"   Exception args: {e.args}", file=sys.stderr)
            print(f"   Full traceback:", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            print(f"{'='*80}\n", file=sys.stderr)

            logger.error(f"❌ {domain} evidence analysis failed: {e}")
            logger.error(f"   Exception type: {type(e).__name__}")
            logger.error(f"   Exception args: {e.args}")
            logger.error(f"   Full traceback:\n{traceback.format_exc()}")

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
        
        # Domain-specific analysis instructions
        domain_instructions = {
            "network": """CRITICAL: Focus ONLY on network/IP-related evidence:
- IP addresses, IP rotation patterns, IP reputation
- VPN/proxy indicators, ASN, ISP information
- Geographic IP patterns (country changes)
- Network-based threat intelligence
DO NOT analyze device patterns, transaction amounts, or timing - those are for other domains.""",
            
            "device": """CRITICAL: Focus ONLY on device-related evidence:
- Device IDs, device consistency, device changes
- User agent patterns, browser/OS information
- Device fingerprinting anomalies
- Device-IP mismatches (device perspective)
DO NOT analyze IP reputation, transaction amounts, or timing patterns - those are for other domains.""",
            
            "location": """CRITICAL: Focus ONLY on geographic/location evidence:
- IP country codes, geographic diversity
- Location consistency, impossible travel
- Geographic risk indicators
DO NOT analyze device patterns, IP reputation, or transaction amounts - those are for other domains.""",
            
            "logs": """CRITICAL: Focus ONLY on transaction timing and behavioral patterns:
- Transaction timing patterns, velocity bursts
- Amount clustering (timing perspective)
- Error patterns, failure sequences
- Activity timing anomalies
DO NOT analyze IP reputation, device fingerprints, or geographic patterns - those are for other domains.""",
            
            "authentication": """CRITICAL: Focus ONLY on authentication-related evidence:
- Login patterns, authentication failures
- MFA bypass attempts, credential issues
- Session anomalies
DO NOT analyze transaction amounts, IP reputation, or device patterns - those are for other domains.""",
            
            "merchant": """CRITICAL: Focus ONLY on merchant/transaction amount patterns:
- Amount clustering, transaction patterns
- Merchant-specific risk indicators
- Payment method patterns
DO NOT analyze IP reputation, device fingerprints, or timing patterns - those are for other domains.""",
            
            "risk": """CRITICAL: Synthesize findings from ALL domains:
- Review findings from network, device, location, logs, authentication, merchant agents
- Identify cross-domain patterns and correlations
- Provide overall risk assessment based on combined evidence
- Note any contradictions or reinforcing signals across domains."""
        }
        
        domain_specific_instruction = domain_instructions.get(domain, f"Focus on {domain}-specific evidence only.")
        
        return f"""{base_prompt}

{domain_specific_instruction}

You MUST NOT use MODEL_SCORE (or any model-derived risk score) to set or justify the numeric risk you return.
You may cite it as context, but its weight is 0 in your final risk computation.

EVIDENCE VOLUME RULE: If evidence volume is low (≤1 event) AND no {domain}-specific fraud patterns detected, 
you MAY default to LOW risk (≤0.3) or explicitly state "needs more evidence" with low confidence.

CRITICAL: Focus your analysis ONLY on {domain}-specific patterns and evidence. 
Do NOT repeat analysis from other domains (network, device, location, logs, authentication, merchant).
Each domain agent analyzes a different aspect - your job is to analyze the {domain} domain specifically.

Return a numeric risk ONLY if you can justify it from {domain}-specific evidence OR detected {domain}-specific fraud patterns.

Your task is to analyze evidence from {domain} domain analysis and provide:
1. A risk score from 0.0 to 1.0 based on {domain}-specific evidence (NEVER using MODEL_SCORE as justification)
2. Confidence level in your assessment (0.0 to 1.0)
3. Key {domain}-specific risk factors identified (exclude MODEL_SCORE references)
4. Detailed reasoning for your assessment (based on {domain} patterns, not model scores or cross-domain patterns)
5. Specific recommendations for {domain} domain

CRITICAL: Base your assessment ONLY on {domain}-specific evidence provided. 
Do not make assumptions or use arbitrary values. If {domain} evidence is limited, 
reflect that in your confidence score.

MODEL_SCORE BAN: You are FORBIDDEN from using MODEL_SCORE values to justify risk levels.
Focus on {domain}-specific behavioral patterns, threat intelligence, technical indicators, and fraud signals.

DATA AVAILABILITY CHECK: CRITICAL - Only make claims about {domain} data that was actually provided.
If evidence shows "{domain} data not available" or "{domain} fields not queried", DO NOT invent conclusions about that data.

RENDER CONTEXT LOCK: When engine-computed scores are provided, use EXACTLY those values.
Do not calculate, estimate, or invent numeric scores in your analysis prose.
Focus on qualitative interpretation of the provided quantitative values."""

    def _create_evidence_analysis_prompt(
        self,
        domain: str,
        evidence: List[str],
        metrics: Dict[str, Any],
        snowflake_data: Optional[Dict[str, Any]],
        tool_results: Optional[Dict[str, Any]],
        entity_type: str,
        entity_id: str,
        computed_risk_score: Optional[float] = None
    ) -> str:
        """Create comprehensive prompt for evidence analysis with ALL data sources.

        CRITICAL: Now includes tool_results to provide LLM with complete tool execution data.
        """

        # Format evidence
        evidence_text = "\n".join([f"- {e}" for e in evidence]) if evidence else "No evidence collected"

        # CRITICAL: Detect low evidence volume
        evidence_count = len(evidence) if evidence else 0
        snowflake_row_count = 0
        if snowflake_data:
            if isinstance(snowflake_data, dict):
                # Check for error conditions - don't count error responses as data
                if snowflake_data.get("success") is False or "error" in snowflake_data:
                    snowflake_row_count = 0  # Error responses have no data
                elif 'results' in snowflake_data:
                    snowflake_row_count = len(snowflake_data.get('results', []))
                elif 'row_count' in snowflake_data:
                    snowflake_row_count = snowflake_data.get('row_count', 0)
                elif 'data' in snowflake_data:
                    snowflake_row_count = len(snowflake_data.get('data', []))
                else:
                    snowflake_row_count = 0  # Unknown format, assume no data

        total_evidence_volume = evidence_count + snowflake_row_count
        is_low_evidence = total_evidence_volume <= 1

        # Format metrics
        metrics_text = self._format_metrics_for_analysis(metrics)

        # Format Snowflake context
        snowflake_text = self._format_snowflake_for_analysis(snowflake_data) if snowflake_data else "No Snowflake context available"

        # CRITICAL: Detect fraud patterns in Snowflake data - FILTER BY DOMAIN
        # Each domain agent should only see patterns relevant to their domain
        fraud_patterns_text = ""
        if snowflake_data and isinstance(snowflake_data, dict) and "results" in snowflake_data:
            try:
                from app.service.agent.orchestration.risk.fraud_pattern_detectors import (
                    detect_velocity_burst, detect_amount_clustering, 
                    detect_ip_rotation, detect_device_ip_mismatch
                )
                
                results = snowflake_data["results"]
                if isinstance(results, list) and len(results) >= 3:
                    patterns_detected = []
                    
                    # DOMAIN-SPECIFIC PATTERN FILTERING:
                    # Each domain should only see patterns relevant to their analysis
                    if domain == "network":
                        # Network agent: IP rotation, IP-related patterns
                        ip_rotation = detect_ip_rotation(results)
                        if ip_rotation:
                            max_rot = ip_rotation.get("max_rotation", {})
                            patterns_detected.append(f"IP ROTATION: Device used {max_rot.get('ip_count', 0)} IPs from subnet {max_rot.get('subnet', '')}")
                        # IP-related velocity (IP changes)
                        velocity_burst = detect_velocity_burst(results)
                        if velocity_burst:
                            patterns_detected.append(f"IP VELOCITY: {velocity_burst['transaction_count']} transactions in {velocity_burst['time_window_minutes']} minutes (network context)")
                    
                    elif domain == "device":
                        # Device agent: Device-IP mismatch, device-related patterns
                        device_ip_mismatch = detect_device_ip_mismatch(results)
                        if device_ip_mismatch:
                            max_mismatch = device_ip_mismatch.get("max_mismatch", {})
                            patterns_detected.append(f"DEVICE-IP MISMATCH: Device {max_mismatch.get('device', '')[:30]}... used {max_mismatch.get('ip_count', 0)} different IPs")
                        # Device-related velocity (device changes)
                        velocity_burst = detect_velocity_burst(results)
                        if velocity_burst:
                            patterns_detected.append(f"DEVICE VELOCITY: {velocity_burst['transaction_count']} transactions in {velocity_burst['time_window_minutes']} minutes (device context)")
                    
                    elif domain == "location":
                        # Location agent: Geographic patterns only
                        ip_rotation = detect_ip_rotation(results)
                        if ip_rotation:
                            max_rot = ip_rotation.get("max_rotation", {})
                            patterns_detected.append(f"GEOGRAPHIC DIVERSITY: Device used {max_rot.get('ip_count', 0)} IPs (location context)")
                    
                    elif domain == "logs":
                        # Logs agent: Timing patterns, velocity bursts (transaction timing)
                        velocity_burst = detect_velocity_burst(results)
                        if velocity_burst:
                            patterns_detected.append(f"TRANSACTION VELOCITY: {velocity_burst['transaction_count']} transactions in {velocity_burst['time_window_minutes']} minutes")
                        amount_clustering = detect_amount_clustering(results)
                        if amount_clustering:
                            max_cluster = amount_clustering.get("max_cluster", {})
                            patterns_detected.append(f"AMOUNT CLUSTERING: ${max_cluster.get('amount', 0):,.2f} appears {max_cluster.get('count', 0)} times (timing pattern)")
                    
                    elif domain == "authentication":
                        # Authentication agent: Login/timing patterns
                        velocity_burst = detect_velocity_burst(results)
                        if velocity_burst:
                            patterns_detected.append(f"AUTHENTICATION VELOCITY: {velocity_burst['transaction_count']} transactions in {velocity_burst['time_window_minutes']} minutes")
                    
                    elif domain == "merchant":
                        # Merchant agent: Amount patterns, transaction patterns
                        amount_clustering = detect_amount_clustering(results)
                        if amount_clustering:
                            max_cluster = amount_clustering.get("max_cluster", {})
                            patterns_detected.append(f"AMOUNT CLUSTERING: ${max_cluster.get('amount', 0):,.2f} appears {max_cluster.get('count', 0)} times")
                        velocity_burst = detect_velocity_burst(results)
                        if velocity_burst:
                            patterns_detected.append(f"MERCHANT VELOCITY: {velocity_burst['transaction_count']} transactions in {velocity_burst['time_window_minutes']} minutes")
                    
                    # Risk agent sees all patterns (it synthesizes)
                    elif domain == "risk":
                        velocity_burst = detect_velocity_burst(results)
                        amount_clustering = detect_amount_clustering(results)
                        ip_rotation = detect_ip_rotation(results)
                        device_ip_mismatch = detect_device_ip_mismatch(results)
                        
                        if velocity_burst:
                            patterns_detected.append(f"VELOCITY BURST: {velocity_burst['transaction_count']} transactions in {velocity_burst['time_window_minutes']} minutes")
                        if amount_clustering:
                            max_cluster = amount_clustering.get("max_cluster", {})
                            patterns_detected.append(f"AMOUNT CLUSTERING: ${max_cluster.get('amount', 0):,.2f} appears {max_cluster.get('count', 0)} times")
                        if ip_rotation:
                            max_rot = ip_rotation.get("max_rotation", {})
                            patterns_detected.append(f"IP ROTATION: Device used {max_rot.get('ip_count', 0)} IPs from subnet {max_rot.get('subnet', '')}")
                        if device_ip_mismatch:
                            max_mismatch = device_ip_mismatch.get("max_mismatch", {})
                            patterns_detected.append(f"DEVICE-IP MISMATCH: Device {max_mismatch.get('device', '')[:30]}... used {max_mismatch.get('ip_count', 0)} different IPs")
                    
                    if patterns_detected:
                        fraud_patterns_text = "\n\n## DOMAIN-SPECIFIC FRAUD PATTERNS DETECTED:\n" + "\n".join([f"- {p}" for p in patterns_detected]) + f"\n\n⚠️ CRITICAL: These {domain}-specific patterns are PRIMARY fraud indicators. Focus your analysis on {domain} domain risks, not cross-domain patterns."
            except Exception as e:
                logger.debug(f"Fraud pattern detection failed: {e}")

        # CRITICAL: Format tool results for LLM analysis
        tool_results_text = self._format_tool_results_for_analysis(tool_results) if tool_results else "No tool execution results available"

        # Add low evidence warning if applicable (but NOT if fraud patterns are detected)
        has_fraud_patterns = bool(fraud_patterns_text)
        if is_low_evidence and not has_fraud_patterns:
            evidence_warning = f"\n\n⚠️ LOW EVIDENCE VOLUME DETECTED: Only {total_evidence_volume} event(s) available. "
            evidence_warning += "You MAY assign LOW risk (≤0.3) or explicitly state 'needs more evidence' with low confidence. "
            evidence_warning += "Do NOT assign high risk scores with insufficient evidence UNLESS fraud patterns are detected."
        elif is_low_evidence and has_fraud_patterns:
            evidence_warning = f"\n\n⚠️ LOW EVIDENCE VOLUME DETECTED: Only {total_evidence_volume} event(s) available, BUT fraud patterns detected. "
            evidence_warning += "Fraud patterns override evidence volume constraints - assess risk based on patterns."
        else:
            evidence_warning = ""
        
        # Log what formatted data is being sent to LLM
        if snowflake_data:
            # Check for error conditions first
            if isinstance(snowflake_data, dict) and (snowflake_data.get("success") is False or "error" in snowflake_data):
                row_count = 0  # Error responses have no data
            elif isinstance(snowflake_data, dict) and 'results' in snowflake_data:
                row_count = len(snowflake_data.get('results', []))
            else:
                row_count = snowflake_data.get('row_count', 0) if isinstance(snowflake_data, dict) else 0
            logger.info("📊 LLM receiving formatted Snowflake data:")
            logger.info(f"   📈 Formatted summary:")
            for line in snowflake_text.split('\n'):
                if line.strip():
                    logger.info(f"   {line}")
            logger.info(f"   📝 Included in: SystemMessage (evidence analysis phase)")
            logger.info(f"   📊 Source data: {row_count} raw records → formatted summary")
        
        # CRITICAL PATCH C: Create render context with only engine values (prevent LLM invention)
        if computed_risk_score is not None:
            # CRITICAL FIX: Validate computed_risk_score is a valid number before formatting
            try:
                # Convert to float if it's a string, validate range
                risk_score_float = float(computed_risk_score)
                if not (0.0 <= risk_score_float <= 1.0):
                    logger.warning(f"⚠️ Invalid computed_risk_score range ({risk_score_float}), using fallback")
                    risk_score_float = max(0.0, min(1.0, risk_score_float))  # Clamp to valid range

                # Lock down completely - LLM can only use provided numeric values
                score_str = f"{risk_score_float:.3f}"
                risk_instruction = f"""1. **RISK SCORE**: {score_str} - THIS IS THE FINAL ENGINE-COMPUTED SCORE.

CRITICAL RULES:
- You MUST use exactly {score_str} as the risk score
- You MUST NOT calculate, estimate, or infer any numeric scores
- You MUST NOT create additional numeric assessments in your prose
- Focus ONLY on qualitative analysis around the provided score
- If asked about scoring, refer only to the engine-computed value: {score_str}

STRICT REQUIREMENT: Your response MUST contain "risk_score": {score_str} exactly as shown.
FORBIDDEN: Do not write phrases like "I assess...", "I estimate...", "appears to be around...", or any invented numeric values."""
            except (ValueError, TypeError) as e:
                # FALLBACK: If computed_risk_score is invalid, fall back to LLM-determined scoring
                logger.error(f"❌ Invalid computed_risk_score value ({computed_risk_score}): {e}")
                logger.warning("🔄 Falling back to LLM-determined risk scoring due to invalid computed score")
                risk_instruction = "1. **RISK SCORE**: (0.0 to 1.0) - Must be justified by evidence"
        else:
            risk_instruction = "1. **RISK SCORE**: (0.0 to 1.0) - Must be justified by evidence"

        # Add system-level numeric scoring ban ONLY when computed score is provided
        if computed_risk_score is not None:
            scoring_ban = """
SYSTEM RULE: Use the numeric scores exactly as provided in the render context.
Do not infer, calculate, estimate, or create numeric scores in your prose. Focus on qualitative analysis only."""
        else:
            # When no computed score, LLM MUST calculate a numeric score from evidence
            scoring_ban = """
SYSTEM RULE: You MUST provide a numeric risk score between 0.0 and 1.0 based on the evidence.
Calculate the score by analyzing risk factors, patterns, and fraud indicators in the data provided."""

        prompt = f"""Analyze this {domain} domain evidence for fraud risk assessment:

{scoring_ban}{evidence_warning}

## Entity Information
- Type: {entity_type}
- ID: {entity_id}
- Domain: {domain}

## Evidence Collected
{evidence_text}

## Metrics and Data Points
{metrics_text}

## Snowflake Context
{snowflake_text}{fraud_patterns_text}

## Tool Execution Results
{tool_results_text}

CRITICAL: The Tool Execution Results section contains ALL data signals from external tools that were executed.
You MUST consider these tool results as primary evidence sources when assessing fraud risk.
Each tool result represents direct intelligence gathering from specialized fraud detection systems.

DATA GAP ANALYSIS:
If tool results show "No tool execution results available" or are missing, you MUST:
- Explicitly list which analyses cannot be performed (IP reputation, device reputation, email reputation, etc.)
- Explain how missing data affects your confidence level
- Prioritize which missing data sources are most critical for assessment
- Format as: "CRITICAL DATA GAP: [Missing data type] - Impact: [How it affects assessment]"

## Analysis Requirements
Provide a comprehensive fraud risk assessment based ONLY on ALL the evidence above (including tool results):

{risk_instruction}
2. **CONFIDENCE**: (0.0 to 1.0) - Based on evidence quality and completeness
3. **RISK FACTORS**: List specific factors that increase/decrease risk
4. **REASONING**: Detailed explanation of your risk assessment (reference tool results where applicable)
5. **RECOMMENDATIONS**: Specific actions based on your findings

CRITICAL: In your RECOMMENDATIONS section, you MUST:
- Extract and include EXACT values mentioned in the evidence (IP addresses, device fingerprints, email addresses)
- Format recommendations as: "[PRIORITY] Action: specific_value"
- Include specific IPs, devices, emails to check (don't use generic "check IP reputation")
- Example: "[CRITICAL] Check IP reputation for 2404:c0:2910::99:43cc and 2404:c0:2910::8e:2237"
- Prioritize recommendations (CRITICAL, HIGH, MEDIUM, LOW)

Format your response clearly with these sections. Be precise and evidence-based."""

        # Add final reminder based on whether score is computed or LLM-determined
        if computed_risk_score is not None:
            prompt += "\nREMINDER: Do not create numeric scores in your prose - use only the provided engine values."
        else:
            prompt += "\nREMINDER: You MUST provide a numeric risk score (0.0-1.0) based on evidence analysis."

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
    
    def _format_snowflake_for_analysis(self, snowflake_data: Dict[str, Any], domain: str = None) -> str:
        """Format Snowflake data for evidence analysis with dollar-weighted statistics, date range, and sample records.
        
        CRITICAL: Filters data by domain to show only domain-relevant fields to LLM.
        """
        if not snowflake_data:
            return "No Snowflake data available"

        # Check for error conditions first
        if isinstance(snowflake_data, dict):
            # Check if this is an error response
            if snowflake_data.get("success") is False or "error" in snowflake_data:
                error_msg = snowflake_data.get("error", "Unknown database error")
                query = snowflake_data.get("query", "")
                if query:
                    # Truncate long queries
                    query_preview = query[:100] + "..." if len(query) > 100 else query
                    return f"Database query failed: {error_msg} (Query: {query_preview})"
                return f"Database query failed: {error_msg}"

        if isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            if not results:
                return "No transaction records found in Snowflake"

            # Extract key insights for context
            total_records = len(results)
            # CRITICAL FIX: Filter out None values from model_scores to prevent "unsupported operand type(s) for +: 'float' and 'NoneType'" error
            model_scores = [r.get("MODEL_SCORE") for r in results if "MODEL_SCORE" in r]
            model_scores = [s for s in model_scores if s is not None]  # Filter out None values
            fraud_flags = [r for r in results if r.get("IS_FRAUD_TX")]

            # Use safe_mean to handle empty lists and None values
            from app.service.agent.orchestration.metrics.safe import safe_mean
            avg_model_score = safe_mean(model_scores, default=0.0)
            avg_score_str = f"{avg_model_score:.3f}"
            high_risk_count = len([s for s in model_scores if s is not None and s > 0.7])

            # ENHANCEMENT: Extract date range from TX_DATETIME field
            from app.service.agent.tools.snowflake_tool.schema_constants import TX_DATETIME
            date_times = []
            for r in results:
                tx_datetime = r.get(TX_DATETIME) or r.get("TX_DATETIME") or r.get("tx_datetime")
                if tx_datetime:
                    date_times.append(tx_datetime)
            
            date_range_str = ""
            if date_times:
                try:
                    # Sort dates to find min/max
                    sorted_dates = sorted([d for d in date_times if d])
                    if sorted_dates:
                        earliest = sorted_dates[0]
                        latest = sorted_dates[-1]
                        date_range_str = f"\n- Date Range: {earliest} to {latest}"
                except Exception as e:
                    logger.debug(f"Could not parse date range: {e}")

            # CRITICAL ENHANCEMENT: Add dollar-weighted statistics
            from app.service.agent.tools.snowflake_tool.schema_constants import PAID_AMOUNT_VALUE_IN_CURRENCY
            dollar_weighted_stats = self._calculate_dollar_weighted_stats(results, PAID_AMOUNT_VALUE_IN_CURRENCY)

            # CRITICAL: Filter sample transactions by domain-specific fields
            # Each domain should only see fields relevant to their analysis
            sample_records = self._format_sample_transactions(results[:5], domain=domain)

            # Domain-specific context header
            domain_context = {
                "network": "Network/IP Analysis Context",
                "device": "Device Fingerprint Analysis Context", 
                "location": "Geographic/Location Analysis Context",
                "logs": "Transaction Timing/Behavioral Analysis Context",
                "authentication": "Authentication/Login Analysis Context",
                "merchant": "Merchant/Transaction Amount Analysis Context",
                "risk": "Cross-Domain Risk Synthesis Context"
            }
            context_header = domain_context.get(domain, "Transaction Analysis Context")

            context = f"""{context_header}:
- Total Records: {total_records}{date_range_str}
- Average Model Score: {avg_score_str} (reference only)
- High Risk Transactions (>0.7): {high_risk_count}
- Confirmed Fraud: {len(fraud_flags)}

DOLLAR-WEIGHTED ANALYSIS:
{dollar_weighted_stats}

SAMPLE TRANSACTIONS (first 5 of {total_records}) - {domain.upper() if domain else 'ALL'} DOMAIN FIELDS ONLY:
{sample_records}

CRITICAL: Focus your analysis ONLY on {domain}-specific fields and patterns shown above.
Do NOT analyze patterns from other domains (network, device, location, logs, authentication, merchant).
NOTE: MODEL_SCORE is for reference only - your analysis should be based on {domain}-specific evidence."""

            return context

        # Summarize instead of returning raw data
        if isinstance(snowflake_data, dict):
            # Check for error conditions first
            if snowflake_data.get("success") is False or "error" in snowflake_data:
                error_msg = snowflake_data.get("error", "Unknown database error")
                return f"Database error: {error_msg}"
            
            if "results" in snowflake_data:
                return f"Snowflake data: {len(snowflake_data['results'])} records available"
            elif "row_count" in snowflake_data:
                return f"Snowflake data: {snowflake_data['row_count']} rows available"
            else:
                # Don't count error dicts as "fields available"
                if "error" not in snowflake_data and snowflake_data.get("success") is not False:
                    return f"Snowflake data: {len(snowflake_data)} fields available"
                else:
                    return "Snowflake data: Error response (no data available)"
        elif isinstance(snowflake_data, str):
            return f"Snowflake data: String data ({len(snowflake_data)} chars)"
        else:
            return f"Snowflake data: Available (type: {type(snowflake_data).__name__})"

    def _calculate_dollar_weighted_stats(self, results: list, amount_field: str) -> str:
        """Calculate dollar-weighted statistics for high-risk transactions."""
        if not results:
            return "- No transaction data for dollar-weighted analysis"

        total_volume = 0
        high_risk_volume = 0
        blocked_volume = 0
        total_count = 0
        high_risk_count = 0
        blocked_count = 0

        for result in results:
            amount = result.get(amount_field, 0)
            model_score = result.get("MODEL_SCORE", 0)
            is_blocked = result.get("BLOCK_RULE_ID") is not None or result.get("NSURE_LAST_DECISION") == "BLOCK"

            # Convert amount to float if needed
            try:
                amount = float(amount) if amount is not None else 0
            except (ValueError, TypeError):
                amount = 0

            # Convert model_score to float if needed
            try:
                model_score = float(model_score) if model_score is not None else 0
            except (ValueError, TypeError):
                model_score = 0

            total_volume += amount
            total_count += 1

            if model_score >= 0.7:  # High risk threshold
                high_risk_volume += amount
                high_risk_count += 1

            if is_blocked:
                blocked_volume += amount
                blocked_count += 1

        if total_volume == 0:
            return "- No transaction amounts available for dollar-weighted analysis"

        # Calculate percentages
        high_risk_volume_pct = (high_risk_volume / total_volume) * 100 if total_volume > 0 else 0
        high_risk_count_pct = (high_risk_count / total_count) * 100 if total_count > 0 else 0
        blocked_volume_pct = (blocked_volume / total_volume) * 100 if total_volume > 0 else 0
        blocked_count_pct = (blocked_count / total_count) * 100 if total_count > 0 else 0

        stats = f"""- Total Volume: ${total_volume:,.2f} across {total_count} transactions
- High Risk (≥0.7): {high_risk_volume_pct:.1f}% of volume (${high_risk_volume:,.2f}) from {high_risk_count_pct:.1f}% of transactions
- Blocked Transactions: {blocked_volume_pct:.1f}% of volume (${blocked_volume:,.2f}) from {blocked_count_pct:.1f}% of transactions"""

        # Add critical insight if volume weighting shows stronger fraud signal
        if high_risk_volume_pct > high_risk_count_pct + 10:  # Significant difference
            stats += f"\n- CRITICAL: High-risk patterns disproportionately affect larger transactions"
        elif blocked_volume_pct > blocked_count_pct + 10:
            stats += f"\n- CRITICAL: Blocked transactions disproportionately affect larger amounts"

        return stats
    
    def _format_sample_transactions(self, sample_results: List[Dict[str, Any]], domain: str = None) -> str:
        """Format sample transaction records for LLM context, filtered by domain.
        
        CRITICAL: Each domain should only see fields relevant to their analysis.
        """
        if not sample_results:
            return "- No sample transactions available"
        
        from app.service.agent.tools.snowflake_tool.schema_constants import (
            TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE_IN_CURRENCY, 
            IP, IP_COUNTRY_CODE, MODEL_SCORE, IS_FRAUD_TX, 
            EMAIL, DEVICE_ID, PAYMENT_METHOD, USER_AGENT, ASN, ISP
        )
        
        # Domain-specific field mappings - each domain sees only relevant fields
        domain_fields = {
            "network": [TX_ID_KEY, TX_DATETIME, IP, IP_COUNTRY_CODE, ASN, ISP, "VPN_INDICATOR", "PROXY_INDICATOR"],
            "device": [TX_ID_KEY, TX_DATETIME, DEVICE_ID, USER_AGENT, "DEVICE_TYPE", "DEVICE_MODEL", "BROWSER_NAME", "OS_NAME"],
            "location": [TX_ID_KEY, TX_DATETIME, IP_COUNTRY_CODE, IP, "CITY", "REGION"],
            "logs": [TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE_IN_CURRENCY, "ERROR_CODES", "EVENT_TYPE", "SESSION_DATA"],
            "authentication": [TX_ID_KEY, TX_DATETIME, "LOGIN_ATTEMPTS", "MFA_STATUS", "SESSION_ID", "AUTH_METHOD"],
            "merchant": [TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE_IN_CURRENCY, "MERCHANT_ID", "MERCHANT_NAME", PAYMENT_METHOD],
            "risk": [TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE_IN_CURRENCY, IP, DEVICE_ID, IP_COUNTRY_CODE, MODEL_SCORE, IS_FRAUD_TX]  # Risk sees all
        }
        
        # Get fields for this domain (default to all if domain not specified)
        fields_to_show = domain_fields.get(domain, [TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE_IN_CURRENCY])
        
        formatted_samples = []
        for idx, tx in enumerate(sample_results, 1):
            # Extract only domain-relevant fields
            tx_fields = []
            
            # Always include transaction ID and datetime for context
            tx_id = tx.get(TX_ID_KEY) or tx.get("TX_ID_KEY") or tx.get("tx_id_key") or "N/A"
            tx_datetime = tx.get(TX_DATETIME) or tx.get("TX_DATETIME") or tx.get("tx_datetime") or "N/A"
            tx_fields.append(f"ID: {tx_id}, Time: {tx_datetime}")
            
            # Add domain-specific fields only
            for field in fields_to_show:
                if field == TX_ID_KEY or field == TX_DATETIME:
                    continue  # Already included
                
                # Get field value with fallbacks
                field_value = tx.get(field) or tx.get(field.upper()) or tx.get(field.lower()) or None
                if field_value is not None:
                    field_display = field.replace("_", " ").title()
                    tx_fields.append(f"{field_display}: {field_value}")
            
            if len(tx_fields) > 2:  # More than just ID and Time
                formatted_samples.append(f"  Transaction {idx}: {', '.join(tx_fields)}")
            else:
                formatted_samples.append(f"  Transaction {idx}: {tx_id} (no {domain} fields available)")
        
        return "\n".join(formatted_samples) if formatted_samples else "- No sample transactions available"

    def _format_tool_results_for_analysis(self, tool_results: Dict[str, Any]) -> str:
        """Format tool execution results for LLM analysis.

        CRITICAL: This function aggregates ALL tool execution data to ensure the LLM
        has complete visibility into all fraud detection signals collected.

        Args:
            tool_results: Dictionary of tool_name -> tool_output

        Returns:
            Formatted string with all tool results for LLM consumption
        """
        if not tool_results:
            return """⚠️ CRITICAL DATA GAP: No tool execution results available

MISSING ANALYSES:
- IP Reputation: Cannot verify if IPs are VPN/proxy/datacenter or have abuse history
- Device Reputation: Cannot check if device fingerprints seen on other accounts or disputes
- Email Reputation: Cannot verify email breach/exposure history or cross-merchant velocity
- Geographic Analysis: Cannot validate geolocation accuracy or detect impossible travel
- Threat Intelligence: Cannot cross-reference with known fraud rings or threat databases

IMPACT ON ASSESSMENT:
- Confidence reduced: Cannot verify external threat intelligence signals
- Risk assessment incomplete: Missing critical fraud detection data sources
- Recommendations limited: Cannot provide specific IP/device/email reputation checks

PRIORITY: Execute external tool analysis to fill these gaps"""

        formatted = ["Tool Execution Results - ALL data signals from external fraud detection tools:\n"]

        for tool_name, tool_content in tool_results.items():
            # Format tool name for readability
            display_name = tool_name.replace('_', ' ').title()

            # Extract meaningful content from tool results
            if isinstance(tool_content, dict):
                # Handle dictionary tool results
                formatted.append(f"\n**{display_name}**:")

                # Extract key information from common tool result structures
                if "error" in tool_content:
                    formatted.append(f"  - Status: Error - {tool_content['error']}")
                elif "result" in tool_content:
                    result_data = tool_content["result"]
                    if isinstance(result_data, dict):
                        for key, value in list(result_data.items())[:10]:  # Limit to first 10 items
                            formatted.append(f"  - {key}: {self._safe_format_value(value)}")
                    else:
                        formatted.append(f"  - Result: {self._safe_format_value(result_data)}")
                else:
                    # General dict - show top-level keys and values
                    for key, value in list(tool_content.items())[:10]:
                        formatted.append(f"  - {key}: {self._safe_format_value(value)}")

            elif isinstance(tool_content, list):
                # Handle list tool results
                formatted.append(f"\n**{display_name}**:")
                formatted.append(f"  - Result Count: {len(tool_content)}")
                # Show first few items
                for idx, item in enumerate(tool_content[:3], 1):
                    formatted.append(f"  - Item {idx}: {self._safe_format_value(item)}")
                if len(tool_content) > 3:
                    formatted.append(f"  - ... and {len(tool_content) - 3} more items")

            elif isinstance(tool_content, str):
                # Handle string tool results
                formatted.append(f"\n**{display_name}**:")
                preview = tool_content[:200] if len(tool_content) > 200 else tool_content
                formatted.append(f"  - Output: {preview}")
                if len(tool_content) > 200:
                    formatted.append(f"  - (Total length: {len(tool_content)} characters)")

            else:
                # Handle other types
                formatted.append(f"\n**{display_name}**:")
                formatted.append(f"  - Output: {self._safe_format_value(tool_content)}")

        result = "\n".join(formatted)

        # Log tool results formatting
        logger.debug(f"🔧 Formatted {len(tool_results)} tool results for LLM analysis")
        logger.debug(f"   Total content length: {len(result)} characters")

        return result

    def _safe_format_value(self, value: Any, max_length: int = 100) -> str:
        """Safely format a value for display, with truncation if needed."""
        if value is None:
            return "N/A"
        elif isinstance(value, (int, float, bool)):
            return str(value)
        elif isinstance(value, dict):
            return f"{{...}} ({len(value)} keys)"
        elif isinstance(value, list):
            return f"[...] ({len(value)} items)"
        else:
            str_value = str(value)
            if len(str_value) > max_length:
                return f"{str_value[:max_length]}... ({len(str_value)} chars total)"
            return str_value

    def _parse_evidence_analysis(self, llm_response: str, domain: str, computed_risk_score: Optional[float] = None, snowflake_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Parse LLM response to extract structured analysis."""
        import re
        
        # CRITICAL FIX: Ensure llm_response is a string (handle dict responses)
        if isinstance(llm_response, dict):
            # If response is a dict, try to extract content
            llm_response = llm_response.get('content', str(llm_response))
        elif not isinstance(llm_response, str):
            # Convert to string if it's not already
            llm_response = str(llm_response)
        
        # PRIORITY 1: Extract LLM-determined risk score (primary authority)
        # Pattern handles multiple formats:
        # - Plain text: "risk score: 0.3"
        # - Markdown: "## RISK SCORE\n**0.3**"
        # - Bullet format: "Risk Score (0.0–1.0)\n- 0.15"
        # - Line format: "Risk Score: 0.15"
        risk_patterns = [
            # Numbered format with markdown bold: "1. **RISK SCORE**: 0.7" (most common in structured responses)
            r"\d+\.\s*\*{0,2}risk\s*score\*{0,2}[\s:]+(\d+\.?\d*)",
            # Simple format: "risk score: 0.15" (most common, try this first to avoid false matches)
            r"risk\s*score[\s:]+(\d+\.?\d*)",
            # Markdown bold before colon: "**RISK SCORE**: 0.7"
            r"\*{0,2}risk\s*score\*{0,2}[\s:]+(\d+\.?\d*)",
            # Bullet format with parentheses: "Risk Score (0.0–1.0)\n- 0.15"
            r"risk\s*score\s*\([^)]*\)\s*\n\s*[-•*]\s*(\d+\.?\d*)",
            # Bullet format without parentheses: "Risk Score\n- 0.15"
            r"risk\s*score\s*\n\s*[-•*]\s*(\d+\.?\d*)",
            # Standard format with markdown: "## RISK SCORE\n**0.3**"
            # CRITICAL FIX: Removed digits from character class to avoid matching numbers from ranges like "(0.0–1.0)"
            r"(?:##\s*)?risk\s*score[\s:]*\*{0,2}\s*(\d+\.?\d*)\s*\*{0,2}",
        ]
        risk_match = None
        for i, pattern in enumerate(risk_patterns):
            risk_match = re.search(pattern, llm_response.lower(), re.DOTALL | re.MULTILINE)
            if risk_match:
                logger.debug(f"✅ Risk score pattern {i+1} matched: {risk_match.group(1)}")
                break
        
        if not risk_match:
            logger.debug(f"⚠️ No risk score pattern matched. LLM response preview: {repr(llm_response[:200])}")

        if risk_match:
            # LLM provided a risk score - use it as primary authority
            risk_score = float(risk_match.group(1))
            logger.debug(f"🤖 Using LLM-determined risk score: {risk_score:.3f}")
        else:
            # CRITICAL: LLM did not provide a risk score - mark as insufficient data
            # DO NOT use algorithmic fallback or default values - this is insufficient data
            error_msg = f"INSUFFICIENT_DATA: LLM did not provide a risk score for {domain} domain. LLM response preview: {llm_response[:1000] if llm_response else 'None'}"
            logger.warning(f"⚠️ {error_msg}")
            # Return a special marker indicating insufficient data instead of raising an error
            return {
                "risk_score": None,
                "risk_score_status": "INSUFFICIENT_DATA",
                "confidence": 0.0,
                "reasoning": f"Insufficient data to determine risk score for {domain} domain. LLM did not provide a valid risk assessment.",
                "llm_analysis": {
                    "risk_score": None,
                    "confidence": 0.0,
                    "reasoning": f"LLM response did not contain a parseable risk score. Response: {llm_response[:2000] if llm_response else 'No response'}",
                    "status": "INSUFFICIENT_DATA"
                },
                "evidence": [],
                "risk_indicators": [],
                "metrics": {}
            }
        
        # Extract confidence
        # Pattern handles multiple formats:
        # - Plain text: "confidence: 0.7"
        # - Markdown: "## CONFIDENCE\n**0.7**"
        # - Bullet format: "Confidence (0.0–1.0)\n- 0.20"
        # - Line format: "Confidence: 0.20"
        conf_patterns = [
            # Simple format: "confidence: 0.20" (most common, try this first to avoid false matches)
            r"confidence[\s:]+(\d+\.?\d*)",
            # Bullet format with parentheses: "Confidence (0.0–1.0)\n- 0.20"
            r"confidence\s*\([^)]*\)\s*\n\s*[-•*]\s*(\d+\.?\d*)",
            # Bullet format without parentheses: "Confidence\n- 0.20"
            r"confidence\s*\n\s*[-•*]\s*(\d+\.?\d*)",
            # Standard format with markdown: "## CONFIDENCE\n**0.7**"
            # CRITICAL FIX: Removed digits from character class to avoid matching numbers from ranges
            r"(?:##\s*)?confidence[\s:]*\*{0,2}\s*(\d+\.?\d*)\s*\*{0,2}",
        ]
        conf_match = None
        for pattern in conf_patterns:
            conf_match = re.search(pattern, llm_response.lower(), re.DOTALL | re.MULTILINE)
            if conf_match:
                break
        confidence = float(conf_match.group(1)) if conf_match else 0.5
        
        # CRITICAL FIX: Normalize confidence from 0-100 scale to 0-1 scale
        if confidence > 1.0:
            confidence = min(confidence / 100.0, 1.0)
        
        # Extract risk factors
        factors_section = self._extract_section(llm_response, "risk factors")
        
        # Extract reasoning
        reasoning_section = self._extract_section(llm_response, "reasoning")
        
        # Extract recommendations
        recommendations_section = self._extract_section(llm_response, "recommendations")
        
        # Extract specific values from analysis for actionable recommendations
        extracted_values = self._extract_specific_values(llm_response, snowflake_data)
        
        return {
            "risk_score": min(1.0, max(0.0, risk_score)),
            "confidence": min(1.0, max(0.0, confidence)),
            "risk_factors": factors_section,
            "reasoning": reasoning_section,
            "recommendations": recommendations_section,
            "extracted_values": extracted_values,  # IPs, devices, emails extracted for recommendations
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
    
    def _extract_specific_values(self, llm_response: str, snowflake_data: Optional[Dict[str, Any]] = None) -> Dict[str, List[str]]:
        """
        Extract specific values (IPs, devices, emails) from LLM response and Snowflake data.
        
        Returns:
            Dict with keys: 'ips', 'devices', 'emails', 'amounts'
        """
        extracted = {
            "ips": [],
            "devices": [],
            "emails": [],
            "amounts": []
        }
        
        # Extract from LLM response using regex patterns
        # IPv4 pattern
        ipv4_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        # IPv6 pattern (simplified - matches common formats)
        ipv6_pattern = r'\b(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\b'
        # Device fingerprint pattern (UUID-like)
        device_pattern = r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b'
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        # Amount pattern (currency amounts)
        amount_pattern = r'\$[\d,]+\.?\d*'
        
        # Extract IPs
        ipv4_matches = re.findall(ipv4_pattern, llm_response)
        ipv6_matches = re.findall(ipv6_pattern, llm_response)
        extracted["ips"] = list(set(ipv4_matches + ipv6_matches))
        
        # Extract devices
        device_matches = re.findall(device_pattern, llm_response)
        extracted["devices"] = list(set(device_matches))
        
        # Extract emails
        email_matches = re.findall(email_pattern, llm_response)
        extracted["emails"] = list(set(email_matches))
        
        # Extract amounts
        amount_matches = re.findall(amount_pattern, llm_response)
        extracted["amounts"] = list(set(amount_matches))
        
        # Also extract from Snowflake data if available
        if snowflake_data and isinstance(snowflake_data, dict) and "results" in snowflake_data:
            results = snowflake_data["results"]
            if isinstance(results, list):
                for result in results:
                    if isinstance(result, dict):
                        # Extract IP
                        ip = result.get("IP") or result.get("ip") or result.get("IP_ADDRESS")
                        if ip and ip not in extracted["ips"]:
                            extracted["ips"].append(str(ip))
                        
                        # Extract device
                        device = result.get("DEVICE_ID") or result.get("device_id") or result.get("DEVICE_FINGERPRINT")
                        if device and device not in extracted["devices"]:
                            extracted["devices"].append(str(device))
                        
                        # Extract email
                        email = result.get("EMAIL") or result.get("email")
                        if email and email not in extracted["emails"]:
                            extracted["emails"].append(str(email))
                        
                        # Extract amount
                        amount = result.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or result.get("paid_amount_value_in_currency")
                        if amount:
                            amount_str = f"${float(amount):,.2f}" if amount else ""
                            if amount_str and amount_str not in extracted["amounts"]:
                                extracted["amounts"].append(amount_str)
        
        # Limit to reasonable number of values
        for key in extracted:
            extracted[key] = extracted[key][:20]  # Limit to top 20 values
        
        logger.debug(f"🔍 Extracted specific values: {len(extracted['ips'])} IPs, {len(extracted['devices'])} devices, {len(extracted['emails'])} emails")
        
        return extracted
    
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