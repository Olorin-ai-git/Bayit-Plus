"""
Human-in-the-Loop Integration - Seamless human analyst integration for complex cases.

This module implements Phase 4 of the LangGraph enhancement plan, providing:
- Automatic escalation for high-complexity cases
- Structured human input collection
- Resume investigation after human input
- Enhanced investigation quality for complex cases
"""

import asyncio
import json
import time
from typing import Dict, Any, List, Optional, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
from uuid import uuid4

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import END
# Note: interrupt and BaseCheckpointer are used conceptually in LangGraph but imports may vary by version
from langchain_core.runnables import RunnableConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EscalationReason(Enum):
    """Reasons for human escalation."""
    HIGH_RISK = "high_risk"
    LOW_CONFIDENCE = "low_confidence"
    AMBIGUOUS_SIGNALS = "ambiguous_signals"
    POLICY_VIOLATION = "policy_violation"
    MANUAL_REQUEST = "manual_request"
    COMPLEX_PATTERN = "complex_pattern"
    REGULATORY_REQUIREMENT = "regulatory_requirement"


class HumanResponseType(Enum):
    """Types of human responses."""
    APPROVAL = "approval"
    REJECTION = "rejection"
    ADDITIONAL_INFO = "additional_info"
    OVERRIDE = "override"
    GUIDANCE = "guidance"
    DELEGATION = "delegation"


class ReviewStatus(Enum):
    """Status of human review."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ReviewPriority(Enum):
    """Priority levels for human review."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class HumanReviewRequest:
    """Request for human review."""
    review_id: str = field(default_factory=lambda: str(uuid4()))
    case_id: str = ""
    reason: EscalationReason = EscalationReason.MANUAL_REQUEST
    priority: ReviewPriority = ReviewPriority.MEDIUM
    status: ReviewStatus = ReviewStatus.PENDING
    request_id: Optional[str] = None
    investigation_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    context: Dict[str, Any] = field(default_factory=dict)
    risk_assessment: Dict[str, float] = field(default_factory=dict)
    agent_findings: List[Dict[str, Any]] = field(default_factory=list)
    recommended_action: Optional[str] = None
    timeout_minutes: int = 30
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "request_id": self.request_id,
            "investigation_id": self.investigation_id,
            "timestamp": self.timestamp,
            "escalation_reason": self.escalation_reason.value,
            "context": self.context,
            "risk_assessment": self.risk_assessment,
            "agent_findings": self.agent_findings,
            "recommended_action": self.recommended_action,
            "priority": self.priority.value if isinstance(self.priority, ReviewPriority) else self.priority,
            "timeout_minutes": self.timeout_minutes,
            "metadata": self.metadata
        }


@dataclass
class HumanResponse:
    """Human analyst response."""
    review_id: str  # Match the review_id from HumanReviewRequest
    decision: str
    confidence: float = 0.8
    notes: Optional[str] = None
    reviewer_id: Optional[str] = None
    response_id: Optional[str] = field(default_factory=lambda: str(uuid4()))
    request_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    response_type: HumanResponseType = HumanResponseType.APPROVAL
    analyst_id: Optional[str] = None
    reasoning: Optional[str] = None
    additional_instructions: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_message(self) -> HumanMessage:
        """Convert to LangChain message."""
        content = f"Human Review Decision: {self.decision}"
        if self.reasoning:
            content += f"\nReasoning: {self.reasoning}"
        if self.additional_instructions:
            content += f"\nInstructions: {self.additional_instructions}"
        
        return HumanMessage(
            content=content,
            additional_kwargs={
                "response_id": self.response_id,
                "response_type": self.response_type.value,
                "analyst_id": self.analyst_id,
                "confidence": self.confidence
            }
        )


class HumanReviewManager:
    """Manages human review requests and responses."""
    
    def __init__(self, notification_handler: Optional[Callable] = None):
        """
        Initialize human review manager.
        
        Args:
            notification_handler: Optional handler for sending notifications
        """
        self.pending_reviews: Dict[str, HumanReviewRequest] = {}
        self.completed_reviews: Dict[str, HumanResponse] = {}
        self.notification_handler = notification_handler
        self.review_queue: asyncio.Queue = asyncio.Queue()
        self.escalation_thresholds = {
            "risk_score": 0.8,
            "confidence": 0.3,
            "complexity": 0.9
        }
        
    async def request_human_review(
        self,
        state: Dict[str, Any],
        reason: EscalationReason,
        priority: str = "medium"
    ) -> HumanReviewRequest:
        """
        Request human review for investigation.
        
        Args:
            state: Current investigation state
            reason: Reason for escalation
            priority: Review priority
            
        Returns:
            Human review request
        """
        request_id = str(uuid4())
        investigation_id = state.get("investigation_id", "unknown")
        
        # Extract context from state
        context = {
            "entity_id": state.get("entity_id"),
            "entity_type": state.get("entity_type"),
            "investigation_stage": state.get("current_stage", "unknown"),
            "findings_summary": self._summarize_findings(state)
        }
        
        # Extract risk assessment
        risk_assessment = {
            "overall_risk": state.get("risk_score", 0.0),
            "confidence": state.get("confidence_level", 0.0),
            "complexity": state.get("complexity_score", 0.0)
        }
        
        # Extract agent findings
        agent_findings = self._extract_agent_findings(state)
        
        # Determine recommended action
        recommended_action = self._recommend_action(risk_assessment, agent_findings)
        
        # Create review request
        request = HumanReviewRequest(
            request_id=request_id,
            investigation_id=investigation_id,
            timestamp=datetime.now().isoformat(),
            escalation_reason=reason,
            context=context,
            risk_assessment=risk_assessment,
            agent_findings=agent_findings,
            recommended_action=recommended_action,
            priority=priority,
            timeout_minutes=self._calculate_timeout(priority),
            metadata={"state_snapshot": state}
        )
        
        # Store request
        self.pending_reviews[request_id] = request
        
        # Send notification
        await self._notify_analyst(request)
        
        # Add to queue
        await self.review_queue.put(request)
        
        logger.info(f"Created human review request {request_id} for investigation {investigation_id}")
        
        return request
    
    async def wait_for_human_response(
        self,
        request: HumanReviewRequest,
        timeout: Optional[int] = None
    ) -> Optional[HumanResponse]:
        """
        Wait for human response to review request.
        
        Args:
            request: Review request
            timeout: Optional timeout in seconds
            
        Returns:
            Human response or None if timeout
        """
        timeout = timeout or (request.timeout_minutes * 60)
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check if response received
            if request.request_id in self.completed_reviews:
                response = self.completed_reviews[request.request_id]
                del self.pending_reviews[request.request_id]
                return response
            
            # Wait before checking again
            await asyncio.sleep(1)
        
        logger.warning(f"Timeout waiting for human response to request {request.request_id}")
        
        # Handle timeout
        return await self._handle_timeout(request)
    
    async def submit_human_response(
        self,
        request_id: str,
        analyst_id: str,
        decision: str,
        response_type: HumanResponseType = HumanResponseType.APPROVAL,
        reasoning: Optional[str] = None,
        additional_instructions: Optional[str] = None,
        confidence: float = 0.8
    ) -> HumanResponse:
        """
        Submit human response to review request.
        
        Args:
            request_id: Review request ID
            analyst_id: Analyst identifier
            decision: Decision made
            response_type: Type of response
            reasoning: Optional reasoning
            additional_instructions: Optional instructions
            confidence: Confidence level
            
        Returns:
            Human response
        """
        if request_id not in self.pending_reviews:
            raise ValueError(f"No pending review with ID {request_id}")
        
        response = HumanResponse(
            response_id=str(uuid4()),
            request_id=request_id,
            timestamp=datetime.now().isoformat(),
            response_type=response_type,
            analyst_id=analyst_id,
            decision=decision,
            reasoning=reasoning,
            additional_instructions=additional_instructions,
            confidence=confidence
        )
        
        # Store response
        self.completed_reviews[request_id] = response
        
        logger.info(f"Received human response for request {request_id}: {decision}")
        
        return response
    
    def _summarize_findings(self, state: Dict[str, Any]) -> str:
        """Summarize investigation findings."""
        findings = []
        
        if "domain_findings" in state:
            for domain, domain_findings in state["domain_findings"].items():
                if isinstance(domain_findings, dict) and domain_findings:
                    findings.append(f"{domain}: {len(domain_findings)} findings")
        
        if "messages" in state:
            agent_messages = [m for m in state["messages"] if isinstance(m, AIMessage)]
            findings.append(f"{len(agent_messages)} agent analyses")
        
        return ", ".join(findings) if findings else "No findings yet"
    
    def _extract_agent_findings(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract agent findings from state."""
        findings = []
        
        # Extract from domain findings
        if "domain_findings" in state:
            for domain, domain_findings in state["domain_findings"].items():
                if isinstance(domain_findings, dict):
                    findings.append({
                        "agent": domain,
                        "findings": domain_findings,
                        "timestamp": datetime.now().isoformat()
                    })
        
        # Extract from messages
        if "messages" in state:
            for message in state["messages"]:
                if isinstance(message, AIMessage) and hasattr(message, "content"):
                    findings.append({
                        "agent": "assistant",
                        "content": message.content,
                        "timestamp": datetime.now().isoformat()
                    })
        
        return findings
    
    def _recommend_action(self, risk_assessment: Dict[str, float], 
                         agent_findings: List[Dict[str, Any]]) -> str:
        """Recommend action based on risk and findings."""
        overall_risk = risk_assessment.get("overall_risk", 0.0)
        confidence = risk_assessment.get("confidence", 0.0)
        
        if overall_risk > 0.8:
            if confidence > 0.7:
                return "Block transaction and investigate further"
            else:
                return "Flag for detailed review"
        elif overall_risk > 0.5:
            return "Monitor closely and gather more data"
        else:
            if confidence > 0.8:
                return "Approve with standard monitoring"
            else:
                return "Approve with enhanced monitoring"
    
    def _calculate_timeout(self, priority: str) -> int:
        """Calculate timeout based on priority."""
        timeouts = {
            "critical": 5,
            "high": 15,
            "medium": 30,
            "low": 60
        }
        return timeouts.get(priority, 30)
    
    async def _notify_analyst(self, request: HumanReviewRequest):
        """Send notification to analyst."""
        if self.notification_handler:
            try:
                await self.notification_handler(request)
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")
    
    async def _handle_timeout(self, request: HumanReviewRequest) -> Optional[HumanResponse]:
        """Handle timeout for review request."""
        # Auto-approve low-risk cases on timeout
        if request.risk_assessment.get("overall_risk", 1.0) < 0.3:
            return await self.submit_human_response(
                request_id=request.request_id,
                analyst_id="system_timeout",
                decision="auto_approved_low_risk",
                response_type=HumanResponseType.APPROVAL,
                reasoning="Automatically approved due to low risk and timeout",
                confidence=0.6
            )
        
        # For high-risk cases, return None to trigger default handling
        return None
    
    def should_escalate(self, state: Dict[str, Any]) -> bool:
        """
        Determine if case should be escalated to human.
        
        Args:
            state: Current investigation state
            
        Returns:
            True if should escalate
        """
        # Check risk threshold
        if state.get("risk_score", 0.0) >= self.escalation_thresholds["risk_score"]:
            return True
        
        # Check confidence threshold
        if state.get("confidence_level", 1.0) <= self.escalation_thresholds["confidence"]:
            return True
        
        # Check complexity threshold
        if state.get("complexity_score", 0.0) >= self.escalation_thresholds["complexity"]:
            return True
        
        # Check for specific flags
        if state.get("requires_human_review", False):
            return True
        
        # Check for ambiguous signals
        if self._has_ambiguous_signals(state):
            return True
        
        return False
    
    def _has_ambiguous_signals(self, state: Dict[str, Any]) -> bool:
        """Check for ambiguous signals requiring human review."""
        # Check for conflicting risk scores
        if "domain_risk_scores" in state:
            scores = [s.get("score", 0) for s in state["domain_risk_scores"].values()]
            if scores:
                # High variance indicates ambiguity
                if max(scores) - min(scores) > 0.5:
                    return True
        
        # Check for mixed agent opinions
        positive_signals = state.get("positive_signals", 0)
        negative_signals = state.get("negative_signals", 0)
        
        if positive_signals > 0 and negative_signals > 0:
            ratio = min(positive_signals, negative_signals) / max(positive_signals, negative_signals)
            if ratio > 0.4:  # Relatively balanced signals
                return True
        
        return False


async def request_human_review(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node for requesting human review.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with human review request
    """
    logger.info("Requesting human review for investigation")
    
    # Determine escalation reason
    reason = EscalationReason.HIGH_RISK
    if state.get("confidence_level", 1.0) < 0.3:
        reason = EscalationReason.LOW_CONFIDENCE
    elif state.get("ambiguous_signals", False):
        reason = EscalationReason.AMBIGUOUS_SIGNALS
    
    # Interrupt for human review
    # In LangGraph, interrupts are handled via state and checkpointing
    # This would be implemented using graph execution control
    state["interrupt_reason"] = f"human_review_required:{reason.value}"
    state["requires_human_review"] = True
    
    # Add review flag to state
    state["human_review_requested"] = True
    state["human_review_reason"] = reason.value
    
    return state


async def process_human_response(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process human response and update investigation.
    
    Args:
        state: Current graph state with human response
        
    Returns:
        Updated state with human input incorporated
    """
    if "human_response" not in state:
        logger.warning("No human response found in state")
        return state
    
    response = state["human_response"]
    
    # Update messages with human input
    if "messages" not in state:
        state["messages"] = []
    
    human_message = HumanMessage(
        content=f"Human Analyst Decision: {response.get('decision', 'unknown')}\n"
                f"Reasoning: {response.get('reasoning', 'none provided')}\n"
                f"Instructions: {response.get('instructions', 'none provided')}"
    )
    
    state["messages"].append(human_message)
    
    # Update investigation based on response
    response_type = response.get("response_type", "approval")
    
    if response_type == "rejection":
        state["investigation_decision"] = "blocked"
        state["final_risk_score"] = 1.0
    elif response_type == "override":
        state["investigation_decision"] = response.get("decision", "manual_override")
        state["human_override"] = True
    elif response_type == "additional_info":
        state["requires_additional_investigation"] = True
        state["additional_requirements"] = response.get("instructions", "")
    
    # Update confidence based on human input
    state["confidence_level"] = response.get("confidence", 0.8)
    state["human_reviewed"] = True
    
    logger.info(f"Processed human response: {response_type}")
    
    return state


class HumanReviewInterface:
    """Interface for human review interactions."""
    
    def __init__(self, review_manager: HumanReviewManager):
        """
        Initialize review interface.
        
        Args:
            review_manager: Human review manager instance
        """
        self.review_manager = review_manager
        
    async def create_review_dashboard(self) -> Dict[str, Any]:
        """
        Create dashboard data for pending reviews.
        
        Returns:
            Dashboard data
        """
        pending = []
        for request in self.review_manager.pending_reviews.values():
            pending.append({
                "request_id": request.request_id,
                "investigation_id": request.investigation_id,
                "timestamp": request.timestamp,
                "reason": request.escalation_reason.value,
                "priority": request.priority,
                "risk_score": request.risk_assessment.get("overall_risk", 0.0),
                "timeout_remaining": self._calculate_remaining_time(request)
            })
        
        return {
            "pending_count": len(pending),
            "pending_reviews": sorted(pending, key=lambda x: x["priority"]),
            "completed_today": self._count_completed_today(),
            "average_response_time": self._calculate_avg_response_time()
        }
    
    def _calculate_remaining_time(self, request: HumanReviewRequest) -> int:
        """Calculate remaining time for review."""
        created = datetime.fromisoformat(request.timestamp)
        elapsed = (datetime.now() - created).total_seconds()
        remaining = (request.timeout_minutes * 60) - elapsed
        return max(0, int(remaining))
    
    def _count_completed_today(self) -> int:
        """Count reviews completed today."""
        today = datetime.now().date()
        count = 0
        
        for response in self.review_manager.completed_reviews.values():
            response_date = datetime.fromisoformat(response.timestamp).date()
            if response_date == today:
                count += 1
        
        return count
    
    def _calculate_avg_response_time(self) -> float:
        """Calculate average response time in minutes."""
        response_times = []
        
        for response in self.review_manager.completed_reviews.values():
            request_id = response.request_id
            if request_id in self.review_manager.pending_reviews:
                request = self.review_manager.pending_reviews[request_id]
                request_time = datetime.fromisoformat(request.timestamp)
                response_time = datetime.fromisoformat(response.timestamp)
                duration = (response_time - request_time).total_seconds() / 60
                response_times.append(duration)
        
        if response_times:
            return sum(response_times) / len(response_times)
        return 0.0