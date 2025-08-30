"""
Autonomous Domain Agents

Intelligent fraud investigation agents that use LLM-driven decision making
and autonomous tool selection instead of predetermined service calls.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_openai import ChatOpenAI

from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    DomainFindings,
    EntityType,
    InvestigationPhase,
    RiskLevel,
)
from app.service.agent.recursion_guard import get_recursion_guard, protect_node
from app.service.config import get_settings_for_env
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.journey_tracker import LangGraphJourneyTracker, NodeType, NodeStatus

logger = logging.getLogger(__name__)
settings_for_env = get_settings_for_env()

# Initialize journey tracker for LangGraph node tracking
journey_tracker = LangGraphJourneyTracker()

# Create autonomous LLM for decision making
autonomous_llm = ChatOpenAI(
    api_key="anything",
    model="gpt-4",
    base_url=settings_for_env.llm_base_url,
    temperature=0.1,  # Lower temperature for more focused decision making
    max_completion_tokens=8000,  # Larger context for reasoning
    timeout=60,  # Longer timeout for complex reasoning
)


class AutonomousInvestigationAgent:
    """
    Base class for autonomous investigation agents.
    
    Uses LLM-driven decision making to select tools and analysis approaches
    based on investigation context and objectives.
    """
    
    def __init__(self, domain: str, tools: List[Any]):
        self.domain = domain
        self.tools = tools
        self.tool_map = {tool.name: tool for tool in tools}
        
        # Bind tools to autonomous LLM
        try:
            self.llm_with_tools = autonomous_llm.bind_tools(tools, strict=True)
            logger.info(f"Successfully bound {len(tools)} tools to {domain} autonomous agent")
        except Exception as e:
            logger.error(f"Failed to bind tools to {domain} agent: {e}")
            self.llm_with_tools = autonomous_llm
    
    async def autonomous_investigate(
        self,
        context: AutonomousInvestigationContext,
        config: RunnableConfig,
        specific_objectives: List[str] = None
    ) -> DomainFindings:
        """
        Perform autonomous investigation using LLM-driven tool selection.
        
        Args:
            context: Rich investigation context
            config: LangGraph configuration
            specific_objectives: Specific objectives for this domain
            
        Returns:
            DomainFindings with autonomous analysis results
        """
        
        # Generate rich investigation context for LLM
        llm_context = context.generate_llm_context(self.domain)
        
        # Create autonomous investigation prompt
        investigation_prompt = self._create_investigation_prompt(
            context, llm_context, specific_objectives
        )
        
        # Create system message for autonomous agent
        system_msg = SystemMessage(content=f"""
You are an intelligent fraud investigation agent specializing in {self.domain.upper()} ANALYSIS.

Your capabilities:
- Autonomous tool selection based on investigation needs
- Advanced reasoning and pattern recognition
- Cross-domain correlation and analysis
- Evidence-based risk assessment

Your mission: Conduct a thorough {self.domain} analysis for fraud investigation {context.investigation_id}.

Key principles:
1. SELECT TOOLS AUTONOMOUSLY based on investigation needs, NOT predetermined patterns
2. Use your reasoning to determine which tools provide the best data for current objectives
3. Call multiple tools if needed to gather comprehensive evidence
4. Focus on detecting fraud indicators, anomalies, and suspicious patterns
5. Provide confidence scores and reasoning for all findings
6. Document your tool selection rationale

Available tools: {', '.join(self.tool_map.keys())}

Remember: You have full autonomy to choose which tools to use and how to analyze the data.
Let the investigation context guide your decisions, not fixed workflows.
""")
        
        try:
            # Execute autonomous investigation
            logger.info(f"Starting autonomous {self.domain} investigation for {context.investigation_id}")
            
            messages = [system_msg, HumanMessage(content=investigation_prompt)]
            
            # Let the LLM decide which tools to use and how to proceed
            result = await self.llm_with_tools.ainvoke(
                messages,
                config=config
            )
            
            # Parse and structure the autonomous analysis result
            findings = self._parse_autonomous_result(result, context)
            
            logger.info(
                f"Completed autonomous {self.domain} investigation: "
                f"risk_score={findings.risk_score:.2f}, "
                f"confidence={findings.confidence:.2f}, "
                f"findings={len(findings.key_findings)}"
            )
            
            return findings
            
        except Exception as e:
            logger.error(f"Autonomous {self.domain} investigation failed: {str(e)}")
            
            # Return error findings
            return DomainFindings(
                domain=self.domain,
                risk_score=0.0,
                confidence=0.0,
                key_findings=[f"Investigation failed: {str(e)}"],
                suspicious_indicators=[],
                data_quality="error",
                timestamp=datetime.now(),
                recommended_actions=["Retry investigation", "Check tool availability"]
            )
    
    def _create_investigation_prompt(
        self,
        context: AutonomousInvestigationContext,
        llm_context: str,
        specific_objectives: List[str] = None
    ) -> str:
        """Create detailed investigation prompt for autonomous analysis"""
        
        prompt_parts = [
            f"INVESTIGATION CONTEXT:\n{llm_context}",
            
            f"\nYOUR MISSION: Conduct autonomous {self.domain.upper()} analysis for entity {context.entity_id}",
            
            f"\nSPECIFIC OBJECTIVES for {self.domain}:",
        ]
        
        if specific_objectives:
            for obj in specific_objectives:
                prompt_parts.append(f"• {obj}")
        else:
            # Default objectives based on domain
            domain_objectives = self._get_default_domain_objectives()
            for obj in domain_objectives:
                prompt_parts.append(f"• {obj}")
        
        prompt_parts.extend([
            "\nAUTONOMOUS ANALYSIS REQUIREMENTS:",
            "1. SELECT TOOLS based on what data you need, not predetermined patterns",
            "2. Use multiple tools if necessary to gather comprehensive evidence",
            "3. EXPLAIN your tool selection reasoning", 
            "4. Analyze all collected data for fraud indicators",
            "5. Correlate findings across data sources",
            "6. Assign risk scores based on evidence strength",
            "7. Provide confidence levels for all assessments",
            
            "\nEXPECTED OUTPUT FORMAT:",
            "Provide a comprehensive analysis that includes:",
            "- Tool selection rationale",
            "- Data collection summary", 
            "- Fraud indicators identified",
            "- Risk assessment with evidence",
            "- Confidence scoring",
            "- Recommendations for further investigation",
            
            f"\nBEGIN AUTONOMOUS {self.domain.upper()} INVESTIGATION:",
        ])
        
        return "\n".join(prompt_parts)
    
    def _get_default_domain_objectives(self) -> List[str]:
        """Get default investigation objectives for this domain"""
        
        domain_objectives = {
            "network": [
                "Analyze network connection patterns for anomalies",
                "Identify suspicious IP addresses and geographic locations",
                "Detect unusual network traffic or connection behaviors", 
                "Assess network-based fraud indicators",
                "Correlate network data with known threat intelligence"
            ],
            "device": [
                "Analyze device fingerprints for consistency and authenticity",
                "Detect device spoofing or manipulation attempts",
                "Assess device behavioral patterns and anomalies",
                "Identify device-based fraud indicators",
                "Evaluate device reputation and risk history"
            ],
            "location": [
                "Analyze geographic patterns and travel behavior",
                "Detect impossible travel or location anomalies",
                "Assess location-based risk factors", 
                "Identify geographic fraud indicators",
                "Correlate location data with behavioral patterns"
            ],
            "logs": [
                "Analyze activity logs for suspicious patterns",
                "Identify behavioral anomalies in user actions",
                "Detect unauthorized access attempts",
                "Assess log-based fraud indicators",
                "Correlate activities across time periods"
            ],
            "risk": [
                "Integrate findings from all investigation domains",
                "Perform comprehensive risk correlation analysis",
                "Calculate overall fraud probability",
                "Assess evidence quality and reliability",
                "Provide final risk assessment and recommendations"
            ]
        }
        
        return domain_objectives.get(self.domain, ["Perform comprehensive analysis"])
    
    def _parse_autonomous_result(
        self,
        llm_result: Any,
        context: AutonomousInvestigationContext
    ) -> DomainFindings:
        """Parse autonomous LLM result into structured findings"""
        
        try:
            # Extract content from LLM response
            if hasattr(llm_result, 'content'):
                content = llm_result.content
            else:
                content = str(llm_result)
            
            logger.debug(f"Parsing autonomous {self.domain} result: {content[:200]}...")
            
            # Try to extract structured data if present
            findings_data = self._extract_findings_from_content(content)
            
            # Create domain findings
            findings = DomainFindings(
                domain=self.domain,
                risk_score=findings_data.get("risk_score", 0.5),
                confidence=findings_data.get("confidence", 0.7),
                key_findings=findings_data.get("key_findings", []),
                suspicious_indicators=findings_data.get("suspicious_indicators", []),
                data_quality=findings_data.get("data_quality", "good"),
                timestamp=datetime.now(),
                raw_data={"llm_content": content},
                recommended_actions=findings_data.get("recommended_actions", [])
            )
            
            return findings
            
        except Exception as e:
            logger.error(f"Failed to parse autonomous result for {self.domain}: {str(e)}")
            
            # Return minimal findings on parse error
            return DomainFindings(
                domain=self.domain,
                risk_score=0.0,
                confidence=0.0,
                key_findings=[f"Parse error: {str(e)}"],
                suspicious_indicators=[],
                data_quality="error",
                timestamp=datetime.now(),
                raw_data={"parse_error": str(e)}
            )
    
    def _extract_findings_from_content(self, content: str) -> Dict[str, Any]:
        """Extract structured findings from LLM content"""
        
        findings = {
            "key_findings": [],
            "suspicious_indicators": [],
            "recommended_actions": [],
            "risk_score": 0.5,
            "confidence": 0.7,
            "data_quality": "good"
        }
        
        try:
            # Try to parse JSON if present
            if "{" in content and "}" in content:
                json_start = content.find("{")
                json_end = content.rfind("}") + 1
                json_content = content[json_start:json_end]
                parsed_data = json.loads(json_content)
                
                if isinstance(parsed_data, dict):
                    findings.update(parsed_data)
                    return findings
        except (json.JSONDecodeError, ValueError):
            # Fall back to text parsing
            pass
        
        # Extract information using text patterns
        lines = content.split("\n")
        
        for line in lines:
            line = line.strip()
            
            # Extract risk score
            if "risk" in line.lower() and any(c.isdigit() for c in line):
                try:
                    import re
                    numbers = re.findall(r'(\d+\.?\d*)', line)
                    if numbers:
                        score = float(numbers[0])
                        if score <= 1.0:
                            findings["risk_score"] = score
                        elif score <= 10.0:
                            findings["risk_score"] = score / 10.0
                except (ValueError, IndexError):
                    pass
            
            # Extract confidence score  
            if "confidence" in line.lower() and any(c.isdigit() for c in line):
                try:
                    import re
                    numbers = re.findall(r'(\d+\.?\d*)', line)
                    if numbers:
                        score = float(numbers[0])
                        if score <= 1.0:
                            findings["confidence"] = score
                        elif score <= 100.0:
                            findings["confidence"] = score / 100.0
                except (ValueError, IndexError):
                    pass
            
            # Extract findings and indicators
            if line.startswith("•") or line.startswith("-") or line.startswith("*"):
                clean_line = line[1:].strip()
                if "suspicious" in line.lower() or "anomal" in line.lower():
                    findings["suspicious_indicators"].append(clean_line)
                elif "recommend" in line.lower():
                    findings["recommended_actions"].append(clean_line)
                else:
                    findings["key_findings"].append(clean_line)
        
        # Ensure we have some findings
        if not findings["key_findings"] and not findings["suspicious_indicators"]:
            findings["key_findings"] = [f"Autonomous {self.domain} analysis completed"]
        
        return findings


# Domain-specific autonomous agents

async def autonomous_network_agent(state, config) -> dict:
    """Autonomous network analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track network agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="network_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "network_analysis": "starting", "investigation_phase": "network_domain"},
        output_state={"network_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousNetworkAgent",
        metadata={"domain": "network", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("network")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.NETWORK_ANALYSIS,
        0.1,
        "Starting autonomous network analysis..."
    )
    
    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        network_agent = AutonomousInvestigationAgent("network", tools)
        
        # Perform autonomous investigation
        findings = await network_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze network patterns for suspicious connections",
                "Identify IP reputation and geographic anomalies", 
                "Detect network-based fraud indicators"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("network", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.NETWORK_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous network analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track network agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="network_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "network_analysis": "starting", "investigation_phase": "network_domain"},
            output_state={"network_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousNetworkAgent",
            metadata={"domain": "network", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "risk_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous network analysis: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven tool selection for {autonomous_context.domain} analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "network"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous network agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("network", str(e))
        return _create_error_response(f"Network analysis failed: {str(e)}")


async def autonomous_device_agent(state, config) -> dict:
    """Autonomous device analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track device agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="device_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "device_analysis": "starting", "investigation_phase": "device_domain"},
        output_state={"device_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousDeviceAgent",
        metadata={"domain": "device", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("device")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.DEVICE_ANALYSIS,
        0.1,
        "Starting autonomous device analysis..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        device_agent = AutonomousInvestigationAgent("device", tools)
        
        # Perform autonomous investigation
        findings = await device_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze device fingerprints for authenticity",
                "Detect device spoofing or manipulation",
                "Identify behavioral anomalies and patterns"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("device", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.DEVICE_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous device analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track device agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="device_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "device_analysis": "starting", "investigation_phase": "device_domain"},
            output_state={"device_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousDeviceAgent",
            metadata={"domain": "device", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "llm_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous device analysis: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven tool selection for {autonomous_context.domain} analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "device"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous device agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("device", str(e))
        return _create_error_response(f"Device analysis failed: {str(e)}")


async def autonomous_location_agent(state, config) -> dict:
    """Autonomous location analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track location agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="location_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "location_analysis": "starting", "investigation_phase": "location_domain"},
        output_state={"location_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousLocationAgent",
        metadata={"domain": "location", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("location")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.LOCATION_ANALYSIS,
        0.1,
        "Starting autonomous location analysis..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        location_agent = AutonomousInvestigationAgent("location", tools)
        
        # Perform autonomous investigation
        findings = await location_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze geographic patterns and travel behavior",
                "Detect impossible travel scenarios",
                "Identify location-based risk factors"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("location", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.LOCATION_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous location analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track location agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="location_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "location_analysis": "starting", "investigation_phase": "location_domain"},
            output_state={"location_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousLocationAgent",
            metadata={"domain": "location", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "location_risk_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous location analysis: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven tool selection for {autonomous_context.domain} analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "location"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous location agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("location", str(e))
        return _create_error_response(f"Location analysis failed: {str(e)}")


async def autonomous_logs_agent(state, config) -> dict:
    """Autonomous logs analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track logs agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="logs_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "logs_analysis": "starting", "investigation_phase": "logs_domain"},
        output_state={"logs_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousLogsAgent",
        metadata={"domain": "logs", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("logs")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.BEHAVIOR_ANALYSIS,  # Logs map to behavior analysis
        0.1,
        "Starting autonomous logs analysis..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        logs_agent = AutonomousInvestigationAgent("logs", tools)
        
        # Perform autonomous investigation
        findings = await logs_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze activity logs for behavioral anomalies",
                "Identify suspicious access patterns",
                "Detect log-based fraud indicators"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("logs", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.BEHAVIOR_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous logs analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        # Track logs agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="logs_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "logs_analysis": "starting", "investigation_phase": "logs_domain"},
            output_state={"logs_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousLogsAgent",
            metadata={"domain": "logs", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "risk_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous logs analysis: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven tool selection for {autonomous_context.domain} analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "logs"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous logs agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("logs", str(e))
        return _create_error_response(f"Logs analysis failed: {str(e)}")


async def autonomous_risk_agent(state, config) -> dict:
    """Autonomous risk assessment using comprehensive correlation analysis"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track risk agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="risk_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "risk_assessment": "starting", "investigation_phase": "final_correlation"},
        output_state={"risk_assessment": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousRiskAgent",
        metadata={"domain": "risk_correlation", "analysis_type": "final_autonomous_synthesis", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("risk")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.RISK_ASSESSMENT,
        0.1,
        "Starting autonomous risk assessment..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        risk_agent = AutonomousInvestigationAgent("risk", tools)
        
        # Perform comprehensive risk assessment
        findings = await risk_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Correlate findings across all investigation domains",
                "Calculate comprehensive fraud risk score",
                "Provide evidence-based risk assessment"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("risk", findings)
        autonomous_context.update_phase(InvestigationPhase.COMPLETED)
        
        # Create comprehensive final result
        investigation_summary = autonomous_context.get_investigation_summary()
        
        # Emit final completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.COMPLETED,
            {
                "final_risk_score": autonomous_context.progress.overall_risk_score,
                "confidence": autonomous_context.progress.confidence_score,
                "investigation_summary": investigation_summary,
                "autonomous_execution": True
            },
            f"Autonomous investigation completed: overall_risk={autonomous_context.progress.overall_risk_score:.2f}"
        )
        
        # Track risk agent completion (final node in investigation)
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="risk_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "risk_assessment": "starting", "investigation_phase": "final_correlation"},
            output_state={"risk_assessment": "completed", "final_risk_score": autonomous_context.progress.overall_risk_score, "investigation_complete": True},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousRiskAgent",
            metadata={"domain": "risk_correlation", "final_findings": len(findings.key_findings), "overall_risk": autonomous_context.progress.overall_risk_score, "confidence": autonomous_context.progress.confidence_score}
        )
        
        # Return comprehensive result
        result = {
            "risk_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "overall_risk_score": autonomous_context.progress.overall_risk_score,
                "overall_confidence": autonomous_context.progress.confidence_score,
                "investigation_summary": investigation_summary,
                "summary": f"Autonomous investigation completed: {len(findings.key_findings)} final findings",
                "thoughts": "Comprehensive autonomous investigation using LLM-driven tool selection across all domains",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "risk_assessment"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous risk agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("risk", str(e))
        return _create_error_response(f"Risk assessment failed: {str(e)}")


# Helper functions

def _extract_investigation_info(config) -> tuple:
    """Extract investigation information from config"""
    try:
        agent_context = config.get("configurable", {}).get("agent_context")
        investigation_id = None
        entity_id = None
        
        if hasattr(agent_context, "metadata") and agent_context.metadata:
            md = agent_context.metadata.additional_metadata or {}
            investigation_id = md.get("investigationId") or md.get("investigation_id")
            entity_id = md.get("entityId") or md.get("entity_id")
        
        return agent_context, investigation_id, entity_id
    except Exception as e:
        logger.error(f"Failed to extract investigation info: {e}")
        return None, None, None


def _get_or_create_autonomous_context(
    investigation_id: str,
    entity_id: str,
    investigation_type: str
) -> AutonomousInvestigationContext:
    """Get or create autonomous investigation context"""
    
    # In production, this would use a proper cache/storage
    # For now, create a new context each time
    context = AutonomousInvestigationContext(
        investigation_id=investigation_id,
        entity_id=entity_id,
        entity_type=EntityType.USER_ID,  # Default to user_id
        investigation_type=investigation_type
    )
    
    context.update_phase(InvestigationPhase.DATA_COLLECTION)
    return context


def _create_error_response(error_message: str) -> dict:
    """Create standardized error response"""
    return {
        "messages": [
            AIMessage(
                content=json.dumps({
                    "error": error_message,
                    "risk_level": 0.0,
                    "confidence": 0.0,
                    "autonomous_execution": False,
                    "timestamp": datetime.now().isoformat()
                })
            )
        ]
    }