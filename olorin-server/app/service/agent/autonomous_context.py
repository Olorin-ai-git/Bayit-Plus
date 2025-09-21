"""
Autonomous Investigation Context System

Provides rich, structured context for LLM-driven decision making in fraud investigations.
Enables agents to make intelligent decisions about which tools to use and how to proceed.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RiskLevel(Enum):
    """Risk levels for investigation findings"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InvestigationPhase(Enum):
    """Phases of fraud investigation"""
    INITIALIZATION = "initialization"
    DATA_COLLECTION = "data_collection"
    ANALYSIS = "analysis"
    CORRELATION = "correlation"
    RISK_ASSESSMENT = "risk_assessment"
    REPORTING = "reporting"
    COMPLETED = "completed"


class EntityType(Enum):
    """Types of entities being investigated"""
    USER_ID = "user_id"
    DEVICE_ID = "device_id"
    ACCOUNT_ID = "account_id"
    TRANSACTION_ID = "transaction_id"
    IP = "ip"
    EMAIL = "email"


@dataclass
class ToolCapability:
    """Represents a tool and its capabilities"""
    name: str
    description: str
    data_sources: List[str]
    analysis_types: List[str]
    output_format: str
    typical_usage: str
    reliability_score: float = 0.8
    response_time_ms: int = 2000
    dependencies: List[str] = field(default_factory=list)


@dataclass
class InvestigationObjective:
    """Specific objective within an investigation"""
    objective_id: str
    description: str
    priority: int  # 1-10, higher is more priority
    required_data: List[str]
    success_criteria: str
    estimated_effort: str
    deadline: Optional[datetime] = None
    depends_on: List[str] = field(default_factory=list)


@dataclass
class DomainFindings:
    """Findings from a specific investigation domain"""
    domain: str
    risk_score: Optional[float] = None
    confidence: float = 0.0
    key_findings: List[str] = field(default_factory=list)
    suspicious_indicators: List[str] = field(default_factory=list)
    data_quality: str = "unknown"
    timestamp: datetime = field(default_factory=datetime.now)
    raw_data: Optional[Dict[str, Any]] = None
    recommended_actions: List[str] = field(default_factory=list)
    # CRITICAL: Store full LLM response for Risk Assessment analysis
    llm_response_text: Optional[str] = None


@dataclass
class InvestigationProgress:
    """Track progress of investigation across domains"""
    completed_domains: Set[str] = field(default_factory=set)
    in_progress_domains: Set[str] = field(default_factory=set)
    pending_domains: Set[str] = field(default_factory=set)
    failed_domains: Set[str] = field(default_factory=set)
    domain_findings: Dict[str, DomainFindings] = field(default_factory=dict)
    overall_risk_score: float = 0.0
    confidence_score: float = 0.0


class AutonomousInvestigationContext:
    """
    Rich context system for autonomous fraud investigation.
    
    Provides LLMs with comprehensive context about the investigation,
    available tools, current findings, and objectives to enable
    intelligent autonomous decision-making.
    """
    
    def __init__(
        self,
        investigation_id: str,
        entity_id: str,
        entity_type: EntityType,
        investigation_type: str = "fraud_investigation"
    ):
        self.investigation_id = investigation_id
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.investigation_type = investigation_type
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        
        # Investigation state
        self.current_phase = InvestigationPhase.INITIALIZATION
        self.progress = InvestigationProgress()
        self.objectives: List[InvestigationObjective] = []
        
        # Available resources
        self.available_tools: Dict[str, ToolCapability] = {}
        self.data_sources: Dict[str, Dict[str, Any]] = {}
        
        # Investigation parameters
        self.time_range = "24h"
        self.priority_level = "medium"
        self.compliance_requirements: List[str] = []
        self.resource_constraints: Dict[str, Any] = {}
        
        # Dynamic context
        self.investigation_notes: List[str] = []
        self.anomalies_detected: List[str] = []
        self.cross_domain_correlations: List[Dict[str, Any]] = []
        
        self._initialize_default_objectives()
        self._initialize_tool_capabilities()
    
    def _initialize_default_objectives(self) -> None:
        """Initialize default investigation objectives based on type"""
        
        if self.investigation_type == "fraud_investigation":
            self.objectives = [
                InvestigationObjective(
                    objective_id="network_analysis",
                    description="Analyze network patterns and suspicious connections",
                    priority=8,
                    required_data=["network_logs", "connection_data", "ip_reputation"],
                    success_criteria="Identify anomalous network behavior with >70% confidence",
                    estimated_effort="2-3 minutes"
                ),
                InvestigationObjective(
                    objective_id="device_analysis", 
                    description="Examine device characteristics and behavioral patterns",
                    priority=9,
                    required_data=["device_fingerprint", "user_behavior", "device_history"],
                    success_criteria="Determine device risk level with >80% confidence",
                    estimated_effort="1-2 minutes"
                ),
                InvestigationObjective(
                    objective_id="location_analysis",
                    description="Assess geographic patterns and location-based risks", 
                    priority=7,
                    required_data=["location_history", "travel_patterns", "geo_velocity"],
                    success_criteria="Identify location anomalies and impossible travel",
                    estimated_effort="1-2 minutes"
                ),
                InvestigationObjective(
                    objective_id="behavioral_analysis",
                    description="Analyze user behavior patterns and detect anomalies",
                    priority=8,
                    required_data=["activity_logs", "usage_patterns", "behavioral_biometrics"],
                    success_criteria="Detect behavioral anomalies with statistical significance",
                    estimated_effort="2-4 minutes"
                ),
                InvestigationObjective(
                    objective_id="risk_correlation",
                    description="Correlate findings across domains for comprehensive risk assessment",
                    priority=10,
                    required_data=["all_domain_findings"],
                    success_criteria="Generate overall risk score with confidence metrics",
                    estimated_effort="1-2 minutes",
                    depends_on=["network_analysis", "device_analysis", "location_analysis", "behavioral_analysis"]
                )
            ]
    
    def _initialize_tool_capabilities(self) -> None:
        """Initialize available tool capabilities"""
        
        self.available_tools = {
            "splunk_query_tool": ToolCapability(
                name="splunk_query_tool",
                description="Execute SPL queries against Splunk SIEM for log analysis",
                data_sources=["security_logs", "application_logs", "network_logs", "audit_trails"],
                analysis_types=["log_correlation", "event_analysis", "pattern_detection", "anomaly_detection"],
                output_format="structured_json",
                typical_usage="Investigate suspicious activities, correlate events, detect patterns",
                reliability_score=0.9,
                response_time_ms=3000
            ),
            "sumologic_query_tool": ToolCapability(
                name="sumologic_query_tool",
                description="Query SumoLogic for application logs, API metrics, and performance data",
                data_sources=["application_logs", "api_metrics", "performance_data", "error_logs"],
                analysis_types=["application_monitoring", "api_analysis", "performance_tracking", "error_correlation"],
                output_format="sumologic_json",
                typical_usage="Analyze application behavior, API call patterns, response times, error rates",
                reliability_score=0.88,
                response_time_ms=2800
            ),
            "snowflake_query_tool": ToolCapability(
                name="snowflake_query_tool",
                description="Query Snowflake data warehouse for transaction history, user profiles, and analytical data",
                data_sources=["transaction_history", "user_profiles", "customer_data", "business_analytics"],
                analysis_types=["transaction_analysis", "user_behavior_analytics", "historical_patterns", "data_warehousing"],
                output_format="sql_results",
                typical_usage="Analyze historical transaction patterns, user account details, payment methods, customer behavior analytics",
                reliability_score=0.9,
                response_time_ms=3200
            ),
            "vector_search_tool": ToolCapability(
                name="vector_search_tool", 
                description="Semantic search across unstructured investigation data",
                data_sources=["investigation_reports", "fraud_patterns", "case_histories"],
                analysis_types=["similarity_search", "pattern_matching", "contextual_analysis"],
                output_format="ranked_results",
                typical_usage="Find similar cases, identify known patterns, contextual investigation",
                reliability_score=0.85,
                response_time_ms=1500
            ),
            "cdc_company_tool": ToolCapability(
                name="cdc_company_tool",
                description="Query company data and business information",
                data_sources=["company_database", "business_records", "corporate_data"],
                analysis_types=["entity_verification", "business_analysis", "corporate_risk"],
                output_format="structured_data",
                typical_usage="Verify business entities, assess corporate risk, validate company information",
                reliability_score=0.9,
                response_time_ms=2000
            ),
            "cdc_user_tool": ToolCapability(
                name="cdc_user_tool",
                description="Query user profile and account information",
                data_sources=["user_profiles", "account_data", "identity_information"],
                analysis_types=["identity_verification", "profile_analysis", "account_risk"],
                output_format="user_profile_json",
                typical_usage="Verify user identity, analyze account patterns, assess user risk",
                reliability_score=0.88,
                response_time_ms=1800
            ),
            "oii_tool": ToolCapability(
                name="oii_tool",
                description="Query Olorin Intelligence Infrastructure for threat data",
                data_sources=["threat_intelligence", "risk_indicators", "fraud_patterns"],
                analysis_types=["threat_analysis", "risk_scoring", "intelligence_correlation"],
                output_format="intelligence_report",
                typical_usage="Assess threat levels, correlate risk indicators, intelligence analysis",
                reliability_score=0.92,
                response_time_ms=2200
            ),
            "qb_retriever_tool": ToolCapability(
                name="qb_retriever_tool",
                description="Query QuickBooks financial data and transaction patterns",
                data_sources=["financial_records", "transaction_data", "accounting_information"],
                analysis_types=["financial_analysis", "transaction_patterns", "accounting_anomalies"],
                output_format="financial_data",
                typical_usage="Analyze financial patterns, detect transaction anomalies, financial risk assessment",
                reliability_score=0.87,
                response_time_ms=2500
            ),
            "tt_retriever_tool": ToolCapability(
                name="tt_retriever_tool",
                description="Retrieve and analyze transaction tracking data",
                data_sources=["transaction_logs", "payment_data", "transfer_records"],
                analysis_types=["transaction_analysis", "payment_patterns", "transfer_tracking"],
                output_format="transaction_report",
                typical_usage="Track transactions, analyze payment patterns, detect suspicious transfers",
                reliability_score=0.86,
                response_time_ms=2000
            ),
            "list_customers_tool": ToolCapability(
                name="list_customers_tool",
                description="Query customer database and relationship information",
                data_sources=["customer_database", "relationship_data", "account_relationships"], 
                analysis_types=["customer_analysis", "relationship_mapping", "account_linking"],
                output_format="customer_list",
                typical_usage="Identify related accounts, map customer relationships, detect linked entities",
                reliability_score=0.83,
                response_time_ms=1500
            )
        }
    
    def update_phase(self, phase: InvestigationPhase) -> None:
        """Update the current investigation phase"""
        self.current_phase = phase
        self.updated_at = datetime.now()
        logger.info(f"Investigation {self.investigation_id} phase updated to {phase.value}")
    
    def add_objective(self, objective: InvestigationObjective) -> None:
        """Add a new investigation objective"""
        self.objectives.append(objective)
        self.updated_at = datetime.now()
        logger.debug(f"Added objective {objective.objective_id} to investigation {self.investigation_id}")
    
    def record_domain_findings(self, domain: str, findings: DomainFindings) -> None:
        """Record findings from a domain analysis"""
        self.progress.domain_findings[domain] = findings
        self.progress.completed_domains.add(domain)
        self.progress.in_progress_domains.discard(domain)
        self.progress.pending_domains.discard(domain)
        self.updated_at = datetime.now()
        
        # Update overall risk score (weighted average)
        self._update_overall_risk()
        
        logger.info(f"Recorded findings for domain {domain} in investigation {self.investigation_id}")
    
    def start_domain_analysis(self, domain: str) -> None:
        """Mark domain analysis as started"""
        self.progress.in_progress_domains.add(domain)
        self.progress.pending_domains.discard(domain)
        self.updated_at = datetime.now()
    
    def fail_domain_analysis(self, domain: str, reason: str) -> None:
        """Mark domain analysis as failed"""
        self.progress.failed_domains.add(domain)
        self.progress.in_progress_domains.discard(domain)
        self.investigation_notes.append(f"Domain {domain} failed: {reason}")
        self.updated_at = datetime.now()
    
    def add_anomaly(self, anomaly_description: str, domain: str = None) -> None:
        """Record an detected anomaly"""
        anomaly_entry = f"[{domain or 'general'}] {anomaly_description}"
        self.anomalies_detected.append(anomaly_entry)
        self.updated_at = datetime.now()
    
    def add_correlation(self, correlation: Dict[str, Any]) -> None:
        """Add a cross-domain correlation"""
        correlation["timestamp"] = datetime.now().isoformat()
        self.cross_domain_correlations.append(correlation)
        self.updated_at = datetime.now()
    
    def _update_overall_risk(self) -> None:
        """Update overall risk score based on domain findings"""
        if not self.progress.domain_findings:
            return
        
        # Weighted average based on domain importance
        domain_weights = {
            "network": 0.25,
            "device": 0.30,
            "location": 0.20,
            "behavioral": 0.25
        }
        
        total_weight = 0
        weighted_risk = 0
        weighted_confidence = 0
        domains_with_risk = []
        domains_without_risk = []
        
        for domain, findings in self.progress.domain_findings.items():
            weight = domain_weights.get(domain, 0.15)
            
            # Only include domains that have valid risk scores
            if findings.risk_score is not None:
                weighted_risk += findings.risk_score * weight
                weighted_confidence += findings.confidence * weight
                total_weight += weight
                domains_with_risk.append(domain)
            else:
                domains_without_risk.append(domain)
                logger.warning(f"Domain {domain} has no risk_score - excluding from overall calculation")
        
        if total_weight > 0:
            self.progress.overall_risk_score = weighted_risk / total_weight
            self.progress.confidence_score = weighted_confidence / total_weight
        else:
            # No valid risk scores available
            logger.error(
                f"CRITICAL: No valid risk scores available for investigation {self.investigation_id}! "
                f"All domains failed to provide risk assessment: {', '.join(domains_without_risk)}"
            )
            self.progress.overall_risk_score = 0.0  # Keep as 0.0 since it's an overall metric
            self.progress.confidence_score = 0.0
    
    def get_investigation_summary(self) -> Dict[str, Any]:
        """Get comprehensive investigation summary"""
        return {
            "investigation_id": self.investigation_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type.value,
            "investigation_type": self.investigation_type,
            "current_phase": self.current_phase.value,
            "progress": {
                "completed_domains": list(self.progress.completed_domains),
                "in_progress_domains": list(self.progress.in_progress_domains),
                "pending_domains": list(self.progress.pending_domains),
                "failed_domains": list(self.progress.failed_domains),
                "overall_risk_score": self.progress.overall_risk_score,
                "confidence_score": self.progress.confidence_score
            },
            "objectives_status": [
                {
                    "objective_id": obj.objective_id,
                    "description": obj.description,
                    "priority": obj.priority,
                    "completed": obj.objective_id in self.progress.completed_domains
                }
                for obj in self.objectives
            ],
            "anomalies_count": len(self.anomalies_detected),
            "correlations_found": len(self.cross_domain_correlations),
            "duration_minutes": (datetime.now() - self.created_at).total_seconds() / 60,
            "last_updated": self.updated_at.isoformat()
        }
    
    def generate_llm_context(self, current_domain: str = None) -> str:
        """
        Generate rich context string for LLM decision-making.
        
        This provides the LLM with comprehensive information about the investigation
        state, available tools, and objectives to make intelligent autonomous decisions.
        """
        
        context_parts = []
        
        # Investigation overview
        context_parts.append(f"""
=== FRAUD INVESTIGATION CONTEXT ===
Investigation ID: {self.investigation_id}
Entity: {self.entity_type.value} = {self.entity_id}
Investigation Type: {self.investigation_type}
Current Phase: {self.current_phase.value}
Time Range: {self.time_range}
Priority: {self.priority_level}
Duration: {(datetime.now() - self.created_at).total_seconds() / 60:.1f} minutes
""")
        
        # Current progress
        context_parts.append(f"""
=== INVESTIGATION PROGRESS ===
Overall Risk Score: {self.progress.overall_risk_score:.2f}
Confidence Score: {self.progress.confidence_score:.2f}
Completed Domains: {', '.join(self.progress.completed_domains) or 'None'}
In Progress: {', '.join(self.progress.in_progress_domains) or 'None'}
Pending: {', '.join(self.progress.pending_domains) or 'None'}
Failed: {', '.join(self.progress.failed_domains) or 'None'}
""")
        
        # Domain findings summary
        if self.progress.domain_findings:
            context_parts.append("=== DOMAIN FINDINGS SUMMARY ===")
            for domain, findings in self.progress.domain_findings.items():
                risk_display = "MISSING!" if findings.risk_score is None else f"{findings.risk_score:.2f}"
                context_parts.append(f"""
{domain.upper()} ANALYSIS:
  Risk Score: {risk_display}
  Confidence: {findings.confidence:.2f}
  Key Findings: {'; '.join(findings.key_findings[:3])}
  Suspicious Indicators: {len(findings.suspicious_indicators)} detected
""")
        
        # Available tools and their capabilities
        context_parts.append("=== AVAILABLE TOOLS ===")
        for tool_name, capability in self.available_tools.items():
            context_parts.append(f"""
{tool_name}:
  Description: {capability.description}
  Data Sources: {', '.join(capability.data_sources)}
  Analysis Types: {', '.join(capability.analysis_types)}
  Reliability: {capability.reliability_score:.1f}/1.0
  Response Time: ~{capability.response_time_ms/1000:.1f}s
  Best Used For: {capability.typical_usage}
""")
        
        # Data sources with entity attributes
        if self.data_sources:
            context_parts.append("=== AVAILABLE DATA SOURCES ===")
            for source_name, source_data in self.data_sources.items():
                if isinstance(source_data, dict):
                    # Extract key fields like IP addresses for threat intelligence tools
                    important_fields = []
                    if 'ip' in source_data:
                        important_fields.append(f"IP Address: {source_data['ip']}")
                    if 'email' in source_data:
                        important_fields.append(f"Email: {source_data['email']}")
                    if 'user_id' in source_data:
                        important_fields.append(f"User ID: {source_data['user_id']}")
                    if 'entity_id' in source_data:
                        important_fields.append(f"Entity ID: {source_data['entity_id']}")
                    
                    if important_fields:
                        context_parts.append(f"""
{source_name.upper()} DATA:
  {chr(10).join(f"  {field}" for field in important_fields)}
""")
        
        # Investigation objectives
        context_parts.append("=== INVESTIGATION OBJECTIVES ===")
        for obj in sorted(self.objectives, key=lambda x: x.priority, reverse=True):
            status = "✓ COMPLETED" if obj.objective_id in self.progress.completed_domains else "○ PENDING"
            context_parts.append(f"""
{status} {obj.objective_id} (Priority: {obj.priority}/10):
  Goal: {obj.description}
  Required Data: {', '.join(obj.required_data)}
  Success Criteria: {obj.success_criteria}
  Estimated Effort: {obj.estimated_effort}
""")
        
        # Anomalies and correlations
        if self.anomalies_detected:
            context_parts.append(f"""
=== DETECTED ANOMALIES ({len(self.anomalies_detected)}) ===
{chr(10).join(f"• {anomaly}" for anomaly in self.anomalies_detected[-5:])}
""")
        
        if self.cross_domain_correlations:
            context_parts.append(f"""
=== CROSS-DOMAIN CORRELATIONS ({len(self.cross_domain_correlations)}) ===
{chr(10).join(f"• {corr.get('description', 'Correlation detected')}" for corr in self.cross_domain_correlations[-3:])}
""")
        
        # Current domain focus
        if current_domain:
            context_parts.append(f"""
=== CURRENT DOMAIN FOCUS ===
You are currently working on: {current_domain.upper()} ANALYSIS
This domain should use tools that provide: {', '.join(self._get_domain_data_requirements(current_domain))}
Expected outputs: Risk score, findings, suspicious indicators, recommendations
""")
        
        # Investigation guidance
        context_parts.append(f"""
=== AUTONOMOUS INVESTIGATION GUIDANCE ===
Your role: Intelligent fraud investigator with autonomous tool selection
Decision making: Choose tools based on investigation needs, not predetermined patterns
Tool selection: Select tools that best provide the required data for current objectives
Quality focus: Prioritize high-confidence findings with strong evidence
Efficiency: Balance thoroughness with time constraints (~{self._get_remaining_time()} minutes remaining)

Key principles:
1. Let the investigation data guide your tool choices
2. Correlate findings across domains for comprehensive analysis
3. Focus on high-priority objectives first
4. Use multiple tools when necessary for validation
5. Document reasoning for tool selections
6. Adapt approach based on findings as they emerge
""")
        
        return "\n".join(context_parts)
    
    def _get_domain_data_requirements(self, domain: str) -> List[str]:
        """Get data requirements for a specific domain"""
        domain_requirements = {
            "network": ["network_logs", "connection_data", "ip_reputation", "traffic_patterns"],
            "device": ["device_fingerprint", "user_behavior", "device_history", "behavioral_biometrics"],
            "location": ["location_history", "travel_patterns", "geo_velocity", "ip_geolocation"],
            "behavioral": ["activity_logs", "usage_patterns", "behavioral_analytics", "anomaly_detection"],
            "risk": ["all_domain_findings", "correlation_analysis", "risk_indicators"]
        }
        return domain_requirements.get(domain, ["investigation_data"])
    
    def _get_remaining_time(self) -> float:
        """Get estimated remaining investigation time"""
        elapsed_minutes = (datetime.now() - self.created_at).total_seconds() / 60
        estimated_total = 10  # 10 minute target for most investigations
        return max(0, estimated_total - elapsed_minutes)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary format"""
        return {
            "investigation_id": self.investigation_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type.value,
            "investigation_type": self.investigation_type,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "current_phase": self.current_phase.value,
            "progress": {
                "completed_domains": list(self.progress.completed_domains),
                "in_progress_domains": list(self.progress.in_progress_domains),
                "pending_domains": list(self.progress.pending_domains),
                "failed_domains": list(self.progress.failed_domains),
                "overall_risk_score": self.progress.overall_risk_score,
                "confidence_score": self.progress.confidence_score,
                "domain_findings": {
                    domain: {
                        "domain": findings.domain,
                        "risk_score": findings.risk_score,
                        "confidence": findings.confidence,
                        "key_findings": findings.key_findings,
                        "suspicious_indicators": findings.suspicious_indicators,
                        "data_quality": findings.data_quality,
                        "timestamp": findings.timestamp.isoformat(),
                        "recommended_actions": findings.recommended_actions
                    }
                    for domain, findings in self.progress.domain_findings.items()
                }
            },
            "objectives": [
                {
                    "objective_id": obj.objective_id,
                    "description": obj.description,
                    "priority": obj.priority,
                    "required_data": obj.required_data,
                    "success_criteria": obj.success_criteria,
                    "estimated_effort": obj.estimated_effort,
                    "depends_on": obj.depends_on
                }
                for obj in self.objectives
            ],
            "anomalies_detected": self.anomalies_detected,
            "cross_domain_correlations": self.cross_domain_correlations,
            "investigation_notes": self.investigation_notes
        }
    
    def get_ip_addresses(self) -> List[str]:
        """
        Extract all IP addresses from the investigation context.
        
        Returns:
            List of unique IP addresses found in data sources
        """
        ip_addresses = set()
        
        # Check all data sources for IP addresses
        for source_name, source_data in self.data_sources.items():
            if isinstance(source_data, dict):
                # Look for common IP address fields
                ip_fields = ['ip', 'ip', 'source_ip', 'dest_ip', 'client_ip', 
                            'server_ip', 'remote_ip', 'local_ip', 'public_ip', 'private_ip']
                
                for field in ip_fields:
                    if field in source_data:
                        ip_value = source_data[field]
                        if isinstance(ip_value, str) and self._is_valid_ip(ip_value):
                            ip_addresses.add(ip_value)
                        elif isinstance(ip_value, list):
                            for ip in ip_value:
                                if isinstance(ip, str) and self._is_valid_ip(ip):
                                    ip_addresses.add(ip)
                
                # Also check nested structures
                if 'network' in source_data and isinstance(source_data['network'], dict):
                    network_data = source_data['network']
                    for field in ip_fields:
                        if field in network_data:
                            ip_value = network_data[field]
                            if isinstance(ip_value, str) and self._is_valid_ip(ip_value):
                                ip_addresses.add(ip_value)
                            elif isinstance(ip_value, list):
                                for ip in ip_value:
                                    if isinstance(ip, str) and self._is_valid_ip(ip):
                                        ip_addresses.add(ip)
        
        # If no IPs found but entity_type is IP, use entity_id if it's a valid IP
        if not ip_addresses and self.entity_type == EntityType.IP:
            if self._is_valid_ip(self.entity_id):
                ip_addresses.add(self.entity_id)
        
        # Log what we found
        if ip_addresses:
            logger.info(f"Extracted {len(ip_addresses)} IP addresses from context: {list(ip_addresses)[:5]}...")
        else:
            logger.warning(f"No IP addresses found in context for entity {self.entity_id}")
            # Add a test IP for development/testing purposes if needed
            # This should be removed in production
            if self.data_sources:
                logger.info("Data sources available but no IPs found - may need to check data structure")
        
        return list(ip_addresses)
    
    def _is_valid_ip(self, ip_str: str) -> bool:
        """
        Validate if a string is a valid IP address.
        
        Args:
            ip_str: String to validate
            
        Returns:
            True if valid IP address, False otherwise
        """
        if not ip_str or not isinstance(ip_str, str):
            return False
        
        # Check if it's not an entity ID pattern
        import re
        entity_patterns = [
            r'^[A-Z0-9]{16}$',  # 16-character alphanumeric (like K1F6HIIGBVHH20TX)
            r'^[a-f0-9\-]{36}$',  # UUID format
            r'^[a-zA-Z0-9_\-]+::[a-f0-9\-]{36}$',  # Entity ID with UUID
        ]
        
        for pattern in entity_patterns:
            if re.match(pattern, ip_str):
                return False
        
        # Validate IP address format
        import ipaddress
        try:
            ipaddress.ip_address(ip_str)
            return True
        except ValueError:
            return False