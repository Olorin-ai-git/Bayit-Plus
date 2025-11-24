"""
Report Summary Generation Module

Extracted summary generation from comprehensive_investigation_report.py
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional
from datetime import datetime


@dataclass
class InvestigationSummary:
    """Summary of investigation key metrics and findings."""
    investigation_id: str
    scenario: str
    entity_id: str
    entity_type: str
    final_risk_score: float
    confidence_score: float
    duration_seconds: float
    status: str
    agents_executed: List[str]
    tools_used: int
    evidence_points: int
    geographic_countries: int
    geographic_cities: int
    critical_findings: List[str]
    recommendations: List[str]


class ReportSummaryGenerator:
    """Generates investigation summary from processed data"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def generate_investigation_summary(self, data: Dict[str, Any]) -> InvestigationSummary:
        """Generate investigation summary from processed data."""
        metadata = data.get("metadata", {})
        agents_data = data.get("agents", {})
        performance = data.get("performance", {})
        validation = data.get("validation", {})
        test_results = data.get("test_results", {})
        journey = data.get("journey", {})
        thought_processes = data.get("thought_processes", [])
        
        # Extract key metrics
        investigation_id = metadata.get("investigation_id", "unknown")
        if investigation_id == "unknown" and journey:
            investigation_id = journey.get("investigation_id", "unknown")
        
        scenario = metadata.get("scenario", "unknown")
        entity_id = metadata.get("config", {}).get("entity_id", "unknown")
        entity_type = metadata.get("config", {}).get("entity_type", "unknown")
        
        # Check nested config structure
        if entity_type == "unknown" and "config" in metadata.get("config", {}):
            nested_config = metadata.get("config", {}).get("config", {})
            if entity_id == "unknown":
                entity_id = nested_config.get("entity_id") or entity_id
            entity_type = nested_config.get("entity_type") or entity_type
        
        # Extract entity info from agents_data if available
        if (entity_id == "unknown" or entity_type == "unknown") and agents_data:
            agent_results = agents_data.get("agent_results", {})
            if agent_results:
                first_agent = next(iter(agent_results.values()), {})
                findings = first_agent.get("findings", {})
                if entity_id == "unknown":
                    entity_id = findings.get("entity_id") or agents_data.get("investigation_id", entity_id)
                if entity_type == "unknown":
                    entity_type = findings.get("entity_type") or findings.get("domain") or entity_type
            
            if entity_id == "unknown":
                entity_id = agents_data.get("investigation_id", entity_id)
            
            # Infer entity_type from entity_id format
            if entity_type == "unknown" and entity_id != "unknown":
                if ':' in entity_id and entity_id.count(':') >= 2:
                    entity_type = "ip"
                elif '.' in entity_id and entity_id.count('.') == 3:
                    entity_type = "ip"
                elif '@' in entity_id:
                    entity_type = "email"
                elif len(entity_id) == 36 and '-' in entity_id:
                    entity_type = "device_id"
                else:
                    entity_type = "user_id"
        
        # Extract entity info from journey if still unknown
        if (entity_id == "unknown" or entity_type == "unknown") and journey:
            node_executions = journey.get("node_executions", [])
            if node_executions:
                first_node = node_executions[0]
                input_state = first_node.get("input_state", {})
                if entity_id == "unknown":
                    entity_id = input_state.get("entity_id", entity_id)
                if entity_type == "unknown":
                    entity_type = input_state.get("entity_type", entity_type)
        
        # Risk and confidence scores
        final_risk_score = agents_data.get("final_risk_score", 0.0)
        confidence_score = agents_data.get("confidence", 0.0)
        
        # Extract from thought processes if needed
        if final_risk_score == 0.0 and thought_processes:
            risk_scores = []
            for tp in thought_processes:
                if isinstance(tp, dict):
                    final_assessment = tp.get("final_assessment", {})
                    if isinstance(final_assessment, dict):
                        risk = final_assessment.get("risk_score") or final_assessment.get("risk")
                        if risk:
                            risk_scores.append(float(risk))
            if risk_scores:
                final_risk_score = sum(risk_scores) / len(risk_scores)
        
        # Duration
        duration = 0.0
        if performance:
            duration = performance.get("total_duration", 0.0)
            if duration == 0.0 and "agent_timings" in performance:
                agent_timings = performance.get("agent_timings", {})
                for agent_name, timing_data in agent_timings.items():
                    if isinstance(timing_data, dict) and "duration" in timing_data:
                        duration += timing_data.get("duration", 0.0)
        
        # Status
        status = "unknown"
        if journey:
            journey_status = journey.get("status", "unknown")
            if journey_status in ["COMPLETED", "completed", "SUCCESS", "success"]:
                status = "completed"
            elif journey_status in ["FAILED", "failed", "ERROR", "error"]:
                status = "failed"
            elif journey_status in ["IN_PROGRESS", "in_progress", "RUNNING", "running"]:
                status = "in_progress"
            elif journey_status != "unknown":
                status = journey_status.lower()
            elif journey.get("end_timestamp"):
                status = "completed"
        
        # Agent execution info
        agents_executed = []
        tools_used = 0
        
        if agents_data and "agent_results" in agents_data:
            agent_results = agents_data.get("agent_results", {})
            for agent_name, result in agent_results.items():
                if result.get("status") == "success":
                    agents_executed.append(agent_name)
            
            risk_agg = agent_results.get("risk_aggregation", {})
            if risk_agg and "findings" in risk_agg:
                tools_used = risk_agg["findings"].get("tools_used", 0)
        
        # Extract critical findings and recommendations
        critical_findings = []
        recommendations = []
        
        if validation:
            critical_findings = validation.get("critical_issues", [])
            recommendations = validation.get("recommendations", [])
        
        return InvestigationSummary(
            investigation_id=investigation_id,
            scenario=scenario,
            entity_id=entity_id,
            entity_type=entity_type,
            final_risk_score=final_risk_score,
            confidence_score=confidence_score,
            duration_seconds=duration,
            status=status,
            agents_executed=agents_executed,
            tools_used=tools_used,
            evidence_points=0,  # TODO: Extract from data
            geographic_countries=0,  # TODO: Extract from data
            geographic_cities=0,  # TODO: Extract from data
            critical_findings=critical_findings,
            recommendations=recommendations
        )

