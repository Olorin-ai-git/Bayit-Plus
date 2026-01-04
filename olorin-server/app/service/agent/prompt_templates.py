"""
Prompt Templates for Orchestrator Decision Making

Provides sophisticated prompt templates for different investigation strategies
with context-aware dynamic generation and bulletproof resilience.
"""

from typing import Dict

from .orchestrator_prompts import PromptStrategy


class PromptTemplateManager:
    """Manager for orchestrator prompt templates with strategy-specific optimization"""

    def __init__(self):
        self.templates = self._initialize_templates()

    def get_template(self, strategy: PromptStrategy) -> str:
        """Get prompt template for specific strategy"""

        return self.templates.get(strategy, self.templates[PromptStrategy.STANDARD])

    def _initialize_templates(self) -> Dict[PromptStrategy, str]:
        """Initialize all prompt templates"""

        return {
            PromptStrategy.STANDARD: self._get_standard_template(),
            PromptStrategy.HIGH_RISK: self._get_high_risk_template(),
            PromptStrategy.DEGRADED: self._get_degraded_template(),
            PromptStrategy.EMERGENCY: self._get_emergency_template(),
            PromptStrategy.MULTI_ENTITY: self._get_multi_entity_template(),
        }

    def _get_standard_template(self) -> str:
        """Standard orchestration prompt template"""

        return """You are the Master Orchestrator for structured fraud investigations with bulletproof resilience. Analyze the investigation context and make intelligent decisions about agent coordination strategy.

INVESTIGATION CONTEXT:
- Investigation ID: {investigation_id}
- Entity Type: {entity_type}  
- Entity ID: {entity_id}
- Risk Level: {risk_level}
- Available Data: {available_data}
- Service Health: {service_health}
- Investigation History: {investigation_history}
- Time Constraint: {time_constraint} seconds

AVAILABLE SPECIALIZED AGENTS:
1. Network Agent - IP analysis, geolocation, network patterns, VPN detection
2. Device Agent - Device fingerprinting, behavioral analysis, hardware profiling
3. Location Agent - Geographic validation, travel patterns, location anomalies
4. Logs Agent - Activity logs, pattern detection, timeline analysis
5. Risk Agent - Risk scoring, anomaly detection, threat assessment

ORCHESTRATION STRATEGIES:
- COMPREHENSIVE: All agents parallel (95% thoroughness, high resource usage)
- FOCUSED: Single domain deep dive (80% efficiency, targeted analysis)
- ADAPTIVE: Dynamic strategy (90% intelligence, responsive execution) 
- SEQUENTIAL: One agent at a time (75% resource efficiency, methodical)
- CRITICAL_PATH: Priority-based (85% risk optimization, strategic execution)

DECISION FRAMEWORK:
1. Assess investigation scope and data completeness
2. Consider service health and resource constraints
3. Factor in risk level and time sensitivity 
4. Select optimal agent combination and execution strategy
5. Provide confidence assessment and reasoning transparency

REQUIRED OUTPUT FORMAT (JSON):
{{
    "strategy": "comprehensive|focused|adaptive|sequential|critical_path",
    "agents_to_activate": ["agent1", "agent2", ...],
    "execution_order": ["agent1", "agent2", ...],
    "confidence_score": 0.0-1.0,
    "reasoning": "Detailed explanation of decision logic with context analysis",
    "estimated_duration": duration_in_seconds,
    "risk_assessment": "low|medium|high|critical",
    "bulletproof_requirements": ["circuit_breaker", "retry_logic", "fail_soft", ...]
}}"""

    def _get_high_risk_template(self) -> str:
        """High-risk scenario orchestration template"""

        return """🚨 HIGH-RISK INVESTIGATION ORCHESTRATOR - ENHANCED ANALYSIS MODE

CRITICAL INVESTIGATION CONTEXT:
- Investigation ID: {investigation_id}
- Entity Type: {entity_type} [HIGH-RISK]
- Entity ID: {entity_id}
- Risk Level: {risk_level} 
- Available Data: {available_data}
- Service Health: {service_health}

HIGH-RISK AGENT PRIORITIES:
1. Risk Agent - PRIORITY: Immediate threat assessment and scoring
2. Network Agent - CRITICAL: IP reputation, geographic anomalies, proxy detection
3. Device Agent - ESSENTIAL: Device reputation, behavior pattern analysis
4. Location Agent - IMPORTANT: Travel pattern validation, impossible geography
5. Logs Agent - SUPPLEMENTARY: Activity correlation and timeline verification

ENHANCED DECISION CRITERIA:
- Prioritize comprehensive coverage over efficiency
- Activate parallel processing for time-critical assessment
- Implement enhanced bulletproof requirements
- Ensure redundant analysis paths for critical findings
- Maximize confidence through cross-agent validation

BULLETPROOF REQUIREMENTS FOR HIGH-RISK:
- circuit_breaker with reduced threshold (2 failures)
- retry_logic with exponential backoff
- fail_soft with partial results acceptance
- redundant_analysis for cross-validation
- priority_escalation for critical findings

OUTPUT: Enhanced JSON format with additional risk mitigation details"""

    def _get_degraded_template(self) -> str:
        """Service degradation scenario template"""

        return """⚠️ DEGRADED MODE ORCHESTRATOR - RESILIENT OPERATION

DEGRADED SERVICE CONTEXT:
- Investigation ID: {investigation_id}
- Entity: {entity_type} {entity_id}
- Service Health: {service_health}
- Available Data: {available_data}

ADAPTATION STRATEGY:
- Work with available services only
- Prioritize highest-confidence agents
- Accept reduced precision for continued operation
- Implement aggressive fallback mechanisms

AGENT SELECTION LOGIC:
- IF network_service DOWN: Skip network analysis OR use cached data
- IF device_service DOWN: Rely on logs/location correlation
- IF risk_service DOWN: Manual risk assessment from available data
- Always attempt risk and logs agents as core functionality

DEGRADED MODE REQUIREMENTS:
- Lower confidence thresholds acceptable
- Partial results better than no results
- Clear reasoning about service limitations
- Enhanced bulletproof requirements for remaining services"""

    def _get_emergency_template(self) -> str:
        """Emergency/time-critical scenario template"""

        return """🚨 EMERGENCY MODE - RAPID RESPONSE ORCHESTRATOR

EMERGENCY CONTEXT:
- Investigation ID: {investigation_id}
- Entity: {entity_type} {entity_id}
- Time Constraint: {time_constraint} seconds [CRITICAL]
- Service Health: {service_health}

RAPID RESPONSE STRATEGY:
- Prioritize CRITICAL_PATH strategy
- Select 2-3 highest-impact agents maximum
- Parallel execution mandatory
- Accept lower confidence for speed

AGENT PRIORITY RANKING:
1. Risk Agent - Immediate threat scoring (15-20 seconds)
2. Network Agent - IP reputation quick check (10-15 seconds) 
3. Device Agent - Basic device validation (10-15 seconds)

EMERGENCY BULLETPROOF REQUIREMENTS:
- Reduced timeout thresholds
- Aggressive fail_soft implementation
- Immediate partial result provision
- Skip non-essential analysis steps"""

    def _get_multi_entity_template(self) -> str:
        """Multi-entity investigation template"""

        return """🔗 MULTI-ENTITY ORCHESTRATOR - COORDINATED ANALYSIS

MULTI-ENTITY CONTEXT:
- Investigation ID: {investigation_id}
- Primary Entity: {entity_type} {entity_id}
- Available Data: {available_data}
- Cross-Entity Relationships: Detected

COORDINATED ANALYSIS STRATEGY:
- Enhanced agent coordination for relationship mapping
- Cross-entity pattern correlation
- Comprehensive strategy recommended for full coverage
- Extended analysis timeframes for thorough investigation

AGENT COORDINATION ENHANCEMENTS:
- Network Agent: Cross-entity IP correlation
- Device Agent: Device sharing pattern analysis
- Location Agent: Geographic relationship mapping
- Logs Agent: Cross-entity activity timeline correlation
- Risk Agent: Relationship-based risk amplification"""
