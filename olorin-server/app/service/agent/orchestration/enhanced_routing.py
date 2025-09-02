"""
Enhanced Conditional Routing - Advanced routing based on fraud indicators.

This module implements Phase 2 of the LangGraph enhancement plan, providing:
- AI-driven routing decisions
- Risk-based investigation prioritization
- Dynamic agent allocation based on complexity
- Adaptive investigation strategies
- MCP-aware routing for enhanced tool selection
"""

import logging
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from dataclasses import dataclass

from langchain_core.messages import BaseMessage, AIMessage
from langgraph.graph import END

logger = logging.getLogger(__name__)


class InvestigationComplexity(Enum):
    """Investigation complexity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RouteDecision(Enum):
    """Routing decisions for investigation flow."""
    CONTINUE = "continue"
    ESCALATE = "escalate"
    PARALLEL_DEEP_DIVE = "parallel_deep_dive"
    SEQUENTIAL_ANALYSIS = "sequential_analysis"
    SKIP_DOMAIN = "skip_domain"
    END_INVESTIGATION = "end"
    HUMAN_REVIEW = "human_review"


@dataclass
class FraudIndicators:
    """Fraud risk indicators for routing decisions."""
    device_anomaly_score: float = 0.0
    network_risk_score: float = 0.0
    location_risk_score: float = 0.0
    activity_risk_score: float = 0.0
    velocity_score: float = 0.0
    account_age_days: int = 0
    previous_fraud_count: int = 0
    confidence_level: float = 0.0


class EnhancedFraudRouter:
    """Enhanced routing engine for fraud investigations."""
    
    def __init__(self):
        """Initialize the fraud router."""
        self.complexity_thresholds = {
            InvestigationComplexity.LOW: 0.3,
            InvestigationComplexity.MEDIUM: 0.5,
            InvestigationComplexity.HIGH: 0.7,
            InvestigationComplexity.CRITICAL: 0.9
        }
        
        self.routing_rules = self._initialize_routing_rules()
        
    def _initialize_routing_rules(self) -> Dict[InvestigationComplexity, Dict[str, Any]]:
        """Initialize routing rules based on complexity."""
        return {
            InvestigationComplexity.LOW: {
                "strategy": "fast_track",
                "domains": ["device", "network"],
                "parallel": True,
                "timeout": 30
            },
            InvestigationComplexity.MEDIUM: {
                "strategy": "standard",
                "domains": ["device", "network", "location"],
                "parallel": True,
                "timeout": 60
            },
            InvestigationComplexity.HIGH: {
                "strategy": "comprehensive",
                "domains": ["device", "network", "location", "logs"],
                "parallel": False,  # Sequential for thoroughness
                "timeout": 120
            },
            InvestigationComplexity.CRITICAL: {
                "strategy": "full_investigation",
                "domains": ["device", "network", "location", "logs"],
                "parallel": False,
                "timeout": 300,
                "human_review": True
            }
        }
    
    def analyze_fraud_indicators(self, state: Dict[str, Any]) -> FraudIndicators:
        """
        Analyze state to extract fraud indicators.
        
        Args:
            state: Current investigation state
            
        Returns:
            FraudIndicators with calculated scores
        """
        indicators = FraudIndicators()
        
        # Extract from messages if available
        messages = state.get("messages", [])
        for message in messages:
            if isinstance(message, AIMessage) and hasattr(message, "content"):
                content = message.content
                # Parse risk scores from message content
                # This is simplified - in production, use proper parsing
                if "device_risk" in content:
                    indicators.device_anomaly_score = 0.5
                if "network_risk" in content:
                    indicators.network_risk_score = 0.4
        
        # Extract from domain findings if available
        if "domain_findings" in state:
            findings = state["domain_findings"]
            
            if "device" in findings:
                device_findings = findings["device"]
                if "risk_score" in device_findings:
                    indicators.device_anomaly_score = device_findings["risk_score"]
            
            if "network" in findings:
                network_findings = findings["network"]
                if "risk_score" in network_findings:
                    indicators.network_risk_score = network_findings["risk_score"]
            
            if "location" in findings:
                location_findings = findings["location"]
                if "risk_score" in location_findings:
                    indicators.location_risk_score = location_findings["risk_score"]
            
            if "logs" in findings:
                logs_findings = findings["logs"]
                if "risk_score" in logs_findings:
                    indicators.activity_risk_score = logs_findings["risk_score"]
        
        # Extract entity metadata
        if "entity_metadata" in state:
            metadata = state["entity_metadata"]
            indicators.account_age_days = metadata.get("account_age_days", 0)
            indicators.previous_fraud_count = metadata.get("previous_fraud_count", 0)
        
        # Calculate velocity score (simplified)
        if "transaction_velocity" in state:
            velocity = state["transaction_velocity"]
            if velocity > 10:  # More than 10 transactions in observation period
                indicators.velocity_score = min(1.0, velocity / 20)
        
        # Calculate confidence level
        indicators.confidence_level = self._calculate_confidence(indicators)
        
        return indicators
    
    def _calculate_confidence(self, indicators: FraudIndicators) -> float:
        """
        Calculate confidence level based on available indicators.
        
        Args:
            indicators: Fraud indicators
            
        Returns:
            Confidence score between 0 and 1
        """
        # Count non-zero indicators
        active_indicators = sum([
            1 if indicators.device_anomaly_score > 0 else 0,
            1 if indicators.network_risk_score > 0 else 0,
            1 if indicators.location_risk_score > 0 else 0,
            1 if indicators.activity_risk_score > 0 else 0,
            1 if indicators.velocity_score > 0 else 0
        ])
        
        # Base confidence on number of active indicators
        base_confidence = active_indicators / 5.0
        
        # Adjust for account history
        if indicators.previous_fraud_count > 0:
            base_confidence = min(1.0, base_confidence + 0.2)
        
        if indicators.account_age_days < 30:
            base_confidence = max(0.3, base_confidence - 0.1)
        
        return base_confidence
    
    def determine_complexity(self, indicators: FraudIndicators) -> InvestigationComplexity:
        """
        Determine investigation complexity based on indicators.
        
        Args:
            indicators: Fraud indicators
            
        Returns:
            Investigation complexity level
        """
        # Calculate composite risk score
        composite_score = (
            indicators.device_anomaly_score * 0.25 +
            indicators.network_risk_score * 0.25 +
            indicators.location_risk_score * 0.2 +
            indicators.activity_risk_score * 0.2 +
            indicators.velocity_score * 0.1
        )
        
        # Adjust for history
        if indicators.previous_fraud_count > 2:
            composite_score = min(1.0, composite_score + 0.3)
        elif indicators.previous_fraud_count > 0:
            composite_score = min(1.0, composite_score + 0.15)
        
        # New accounts get extra scrutiny
        if indicators.account_age_days < 7:
            composite_score = min(1.0, composite_score + 0.2)
        
        # Determine complexity
        if composite_score >= self.complexity_thresholds[InvestigationComplexity.CRITICAL]:
            return InvestigationComplexity.CRITICAL
        elif composite_score >= self.complexity_thresholds[InvestigationComplexity.HIGH]:
            return InvestigationComplexity.HIGH
        elif composite_score >= self.complexity_thresholds[InvestigationComplexity.MEDIUM]:
            return InvestigationComplexity.MEDIUM
        else:
            return InvestigationComplexity.LOW
    
    def route_investigation(self, state: Dict[str, Any]) -> str:
        """
        Determine next step in investigation based on fraud indicators.
        
        Args:
            state: Current investigation state
            
        Returns:
            Next node name for routing
        """
        # Analyze current state
        indicators = self.analyze_fraud_indicators(state)
        complexity = self.determine_complexity(indicators)
        
        logger.info(f"Investigation complexity: {complexity.value}, "
                   f"Composite risk: {self._calculate_composite_risk(indicators):.2f}")
        
        # Get routing strategy
        strategy = self.routing_rules[complexity]
        
        # Check if investigation should end early
        if self._should_end_early(state, indicators):
            return END
        
        # Check if human review is needed
        if strategy.get("human_review") and indicators.confidence_level < 0.5:
            return "human_review"
        
        # Determine next domain to investigate
        current_domain = state.get("current_domain")
        investigated_domains = state.get("investigated_domains", [])
        
        for domain in strategy["domains"]:
            if domain not in investigated_domains:
                return f"{domain}_agent"
        
        # All domains investigated
        return "risk_agent"
    
    def _calculate_composite_risk(self, indicators: FraudIndicators) -> float:
        """Calculate composite risk score."""
        return (
            indicators.device_anomaly_score * 0.25 +
            indicators.network_risk_score * 0.25 +
            indicators.location_risk_score * 0.2 +
            indicators.activity_risk_score * 0.2 +
            indicators.velocity_score * 0.1
        )
    
    def _should_end_early(self, state: Dict[str, Any], indicators: FraudIndicators) -> bool:
        """
        Determine if investigation should end early.
        
        Args:
            state: Current state
            indicators: Fraud indicators
            
        Returns:
            True if investigation should end
        """
        # End if confidence is very high and risk is very low
        if indicators.confidence_level > 0.9:
            composite_risk = self._calculate_composite_risk(indicators)
            if composite_risk < 0.1:
                logger.info("Ending investigation early: Low risk with high confidence")
                return True
        
        # End if maximum investigations reached
        investigated_count = len(state.get("investigated_domains", []))
        if investigated_count >= 4:
            return True
        
        return False
    
    def get_domain_priority(self, complexity: InvestigationComplexity) -> List[str]:
        """
        Get prioritized list of domains to investigate.
        
        Args:
            complexity: Investigation complexity
            
        Returns:
            Ordered list of domains
        """
        strategy = self.routing_rules[complexity]
        return strategy["domains"]
    
    def should_run_parallel(self, complexity: InvestigationComplexity) -> bool:
        """
        Determine if domains should run in parallel.
        
        Args:
            complexity: Investigation complexity
            
        Returns:
            True if parallel execution is recommended
        """
        strategy = self.routing_rules[complexity]
        return strategy.get("parallel", True)


def enhanced_fraud_routing(state: Dict[str, Any]) -> str:
    """
    Enhanced routing function for LangGraph.
    
    Args:
        state: Current graph state
        
    Returns:
        Next node to execute
    """
    router = EnhancedFraudRouter()
    return router.route_investigation(state)


def complexity_based_routing(state: Dict[str, Any]) -> str:
    """
    Route based on investigation complexity.
    
    Args:
        state: Current graph state
        
    Returns:
        Routing decision
    """
    router = EnhancedFraudRouter()
    indicators = router.analyze_fraud_indicators(state)
    complexity = router.determine_complexity(indicators)
    
    # Route based on complexity
    if complexity == InvestigationComplexity.CRITICAL:
        return "comprehensive_investigation"
    elif complexity == InvestigationComplexity.HIGH:
        return "detailed_investigation"
    elif complexity == InvestigationComplexity.MEDIUM:
        return "standard_investigation"
    else:
        return "fast_track_investigation"


def mcp_aware_routing(state: Dict[str, Any]) -> str:
    """
    MCP-aware routing function that considers MCP server capabilities.
    
    This function analyzes the investigation state and routes to appropriate
    MCP servers based on available capabilities and investigation requirements.
    
    Args:
        state: Current investigation state with messages
        
    Returns:
        Next node to route to (MCP server or agent)
    """
    logger.info("Performing MCP-aware routing")
    
    # Extract messages and investigation context
    messages = state.get("messages", [])
    if not messages:
        return "fraud_investigation"
    
    last_message = messages[-1]
    content = last_message.content if hasattr(last_message, 'content') else str(last_message)
    
    # Analyze content for MCP server requirements
    mcp_keywords = {
        "fraud_database": ["transaction", "history", "risk score", "device fingerprint"],
        "external_apis": ["ip reputation", "email verify", "phone validate", "credit"],
        "graph_analysis": ["fraud ring", "money flow", "relationship", "anomaly cluster"]
    }
    
    # Check for MCP server requirements
    for server, keywords in mcp_keywords.items():
        if any(keyword in content.lower() for keyword in keywords):
            logger.info(f"Routing to MCP server: {server}")
            # In practice, this would route to an MCP tool execution node
            return "tools"  # Route to tools node which includes MCP tools
    
    # Fall back to standard routing if no MCP requirements detected
    return adaptive_domain_routing(state)


def adaptive_domain_routing(state: Dict[str, Any]) -> str:
    """
    Adaptively route to next domain based on findings.
    
    Args:
        state: Current graph state
        
    Returns:
        Next domain to investigate
    """
    router = EnhancedFraudRouter()
    indicators = router.analyze_fraud_indicators(state)
    
    # Prioritize based on highest risk
    risk_scores = {
        "device": indicators.device_anomaly_score,
        "network": indicators.network_risk_score,
        "location": indicators.location_risk_score,
        "logs": indicators.activity_risk_score
    }
    
    # Filter out already investigated domains
    investigated = state.get("investigated_domains", [])
    available_domains = {k: v for k, v in risk_scores.items() if k not in investigated}
    
    if not available_domains:
        return "risk_agent"
    
    # Route to highest risk domain
    next_domain = max(available_domains, key=available_domains.get)
    
    # Check if risk is too low to continue
    if available_domains[next_domain] < 0.1:
        logger.info(f"Skipping remaining domains due to low risk scores")
        return "risk_agent"
    
    return f"{next_domain}_agent"


def csv_data_routing(state: Dict[str, Any]) -> str:
    """
    Route to raw data processing if CSV data is detected in messages.
    
    This function analyzes the investigation state to determine if raw CSV data
    has been provided and routes accordingly. If CSV data is detected, it routes
    to the raw_data_node for processing. Otherwise, it continues with standard
    investigation flow.
    
    Args:
        state: Current investigation state with messages
        
    Returns:
        Next node to route to ("raw_data_node" or "fraud_investigation")
    """
    logger.info("Performing CSV data routing analysis")
    
    # Extract messages from state
    messages = state.get("messages", [])
    if not messages:
        logger.info("No messages found, routing to standard investigation")
        return "fraud_investigation"
    
    # Check for CSV data in messages
    has_csv_data = _detect_csv_data_in_messages(messages)
    
    if has_csv_data:
        logger.info("CSV data detected, routing to raw data processing")
        return "raw_data_node"
    else:
        logger.info("No CSV data detected, routing to standard fraud investigation")
        return "fraud_investigation"


def raw_data_or_investigation_routing(state: Dict[str, Any]) -> str:
    """
    Primary routing function that determines whether to process raw CSV data
    or proceed with standard fraud investigation.
    
    This is the main entry point for investigation routing after initialization.
    It first checks for raw CSV data, and if found, routes to raw data processing.
    Otherwise, it proceeds with standard investigation flow.
    
    Args:
        state: Current investigation state
        
    Returns:
        Next node to execute ("raw_data_node" or "fraud_investigation")
    """
    logger.info("Determining investigation routing: raw data vs standard flow")
    
    # First check for CSV data
    if _detect_csv_data_in_messages(state.get("messages", [])):
        logger.info("Raw CSV data detected - routing to raw data processing")
        return "raw_data_node"
    
    # No CSV data found, proceed with standard investigation
    logger.info("No raw data detected - routing to standard fraud investigation")
    return "fraud_investigation"


def _detect_csv_data_in_messages(messages: List[BaseMessage]) -> bool:
    """
    Detect if CSV data is present in the messages.
    
    Args:
        messages: List of messages to analyze
        
    Returns:
        True if CSV data is detected
    """
    # CSV detection indicators
    csv_indicators = [
        "csv_data",
        "file_content", 
        ".csv",
        "transaction_id",
        "amount,timestamp",  # Common CSV header pattern
        ",,",  # Multiple commas suggesting CSV structure
    ]
    
    for message in messages:
        try:
            # Check message content
            content = ""
            if hasattr(message, 'content') and message.content:
                content = str(message.content).lower()
                
                # Look for CSV indicators in content
                if any(indicator in content for indicator in csv_indicators):
                    logger.info(f"CSV indicator found in message content: {content[:100]}...")
                    return True
                
                # Check for comma-separated structure (basic heuristic)
                lines = content.split('\n')
                if len(lines) > 1:
                    # Check if multiple lines have comma separations
                    comma_lines = [line for line in lines if ',' in line]
                    if len(comma_lines) > 2:  # At least header + 2 data rows
                        # Check if lines have similar comma counts (suggesting tabular data)
                        comma_counts = [line.count(',') for line in comma_lines[:5]]  # Check first 5 lines
                        if comma_counts and all(count > 2 and abs(count - comma_counts[0]) <= 1 for count in comma_counts):
                            logger.info("CSV structure detected based on comma patterns")
                            return True
            
            # Check additional_kwargs for structured data
            if hasattr(message, 'additional_kwargs') and message.additional_kwargs:
                kwargs = message.additional_kwargs
                
                # Direct CSV data keys
                if kwargs.get('csv_data') or kwargs.get('file_content'):
                    logger.info("CSV data found in message additional_kwargs")
                    return True
                
                # Filename checks
                filename = kwargs.get('filename', '')
                if filename and filename.lower().endswith('.csv'):
                    logger.info(f"CSV file detected: {filename}")
                    return True
                    
        except Exception as e:
            logger.warning(f"Error analyzing message for CSV data: {e}")
            continue
    
    return False