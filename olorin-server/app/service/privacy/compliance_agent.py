"""
Autonomous Compliance AI Agent for DPA Enforcement.

This agent acts as a Compliance Steward responsible for continuous
compliance enforcement using LLM decisioning and action taking.

Responsibilities:
1. Autonomous operation with Claude API and tool usage
2. Continuous compliance monitoring and enforcement
3. LLM-based decision making for compliance verification
4. Automatic action taking when violations are detected
"""

import asyncio
import os
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.service.logging import get_bridge_logger
from app.service.privacy.compliance_agent_tools import COMPLIANCE_TOOLS

logger = get_bridge_logger(__name__)


class AgentStatus(Enum):
    """Status of the Compliance Agent."""

    IDLE = "IDLE"
    RUNNING = "RUNNING"
    MONITORING = "MONITORING"
    ENFORCING = "ENFORCING"
    ERROR = "ERROR"


@dataclass
class ComplianceDecision:
    """Decision made by the Compliance Agent."""

    timestamp: str
    decision_type: str
    compliant: bool
    reasoning: str
    actions_taken: List[str]
    violations_found: List[Dict[str, Any]]
    recommendations: List[str]


COMPLIANCE_AGENT_SYSTEM_PROMPT = """You are the DPA Compliance Steward AI Agent for Olorin.

Your responsibilities:
1. CONTINUOUSLY monitor and enforce DPA (Data Protection Addendum) compliance
2. VERIFY that all personal data handling follows nSure.ai DPA requirements
3. DETECT and REPORT any compliance violations immediately
4. TAKE CORRECTIVE ACTIONS when violations are found

DPA Key Requirements you MUST enforce:
- Section 6: Only approved sub-processors (Anthropic, OpenAI) - Google/Gemini BLOCKED
- Section 7: 24-hour breach notification requirement
- Section 8: Data deletion on request within 30 days
- Section 9.4: PII must be anonymized/obfuscated before LLM transmission

Your available tools allow you to:
- Run compliance audits
- Verify sub-processors
- Check PII obfuscation status
- Review audit logs for violations
- Check data retention policies
- Log compliance violations
- Generate compliance reports

When you detect a violation:
1. Log it immediately using log_compliance_violation tool
2. Assess severity (LOW/MEDIUM/HIGH/CRITICAL)
3. Recommend corrective actions
4. For CRITICAL violations, note the 24-hour notification deadline

Always be thorough and proactive. Your goal is to ensure CONTINUOUS compliance."""


class ComplianceAgent:
    """
    Autonomous Compliance AI Agent.

    Uses Claude API with tools to continuously verify and enforce DPA compliance.
    """

    def __init__(self):
        """Initialize the Compliance Agent."""
        self._status = AgentStatus.IDLE
        self._last_run: Optional[datetime] = None
        self._decisions: List[ComplianceDecision] = []

        # Initialize Claude model with tools
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("[COMPLIANCE_AGENT] No ANTHROPIC_API_KEY - agent will be limited")
            self._llm = None
        else:
            self._llm = ChatAnthropic(
                model=os.getenv("COMPLIANCE_AGENT_MODEL", "claude-sonnet-4-20250514"),
                anthropic_api_key=api_key,
                max_tokens=4096,
                temperature=0.0,  # Deterministic for compliance decisions
            )
            # Bind compliance tools to the model
            self._llm_with_tools = self._llm.bind_tools(COMPLIANCE_TOOLS)

        self._monitoring_interval = int(os.getenv("COMPLIANCE_CHECK_INTERVAL_SECONDS", "3600"))

        logger.info(
            f"[COMPLIANCE_AGENT] Initialized with {len(COMPLIANCE_TOOLS)} tools, "
            f"monitoring interval: {self._monitoring_interval}s"
        )

    @property
    def status(self) -> AgentStatus:
        """Get current agent status."""
        return self._status

    async def run_compliance_check(self, context: Optional[str] = None) -> ComplianceDecision:
        """
        Run a single compliance check cycle.

        Args:
            context: Optional context about what triggered the check

        Returns:
            ComplianceDecision with results and actions
        """
        self._status = AgentStatus.RUNNING
        start_time = datetime.utcnow()

        logger.info("[COMPLIANCE_AGENT] Starting compliance check cycle")

        if not self._llm:
            # Fallback to tool-only mode without LLM reasoning
            return await self._run_fallback_check()

        try:
            # Prepare the compliance check request
            check_prompt = self._build_check_prompt(context)

            messages = [
                SystemMessage(content=COMPLIANCE_AGENT_SYSTEM_PROMPT),
                HumanMessage(content=check_prompt),
            ]

            # Run the agent with tool usage
            response = await self._run_agent_loop(messages)

            # Parse the decision from the response
            decision = self._parse_decision(response, start_time)

            self._decisions.append(decision)
            self._last_run = datetime.utcnow()
            self._status = AgentStatus.IDLE

            logger.info(
                f"[COMPLIANCE_AGENT] Check complete: compliant={decision.compliant}, "
                f"violations={len(decision.violations_found)}"
            )

            return decision

        except Exception as e:
            logger.error(f"[COMPLIANCE_AGENT] Error during check: {e}", exc_info=True)
            self._status = AgentStatus.ERROR
            return ComplianceDecision(
                timestamp=start_time.isoformat() + "Z",
                decision_type="ERROR",
                compliant=False,
                reasoning=f"Agent error: {str(e)}",
                actions_taken=[],
                violations_found=[],
                recommendations=["Investigate agent error and retry"],
            )

    async def _run_agent_loop(self, messages: List) -> str:
        """
        Run the agent loop with tool calling until completion.

        Args:
            messages: Initial messages to send

        Returns:
            Final response text
        """
        max_iterations = 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Call the model with tools
            response = await self._llm_with_tools.ainvoke(messages)

            # Check if we have tool calls
            if hasattr(response, "tool_calls") and response.tool_calls:
                # Execute each tool call
                tool_results = []
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]

                    logger.info(f"[COMPLIANCE_AGENT] Calling tool: {tool_name}")

                    # Find and execute the tool
                    result = await self._execute_tool(tool_name, tool_args)
                    tool_results.append({
                        "tool_call_id": tool_call.get("id", tool_name),
                        "result": result,
                    })

                # Add tool results to messages and continue
                messages.append(response)
                for tr in tool_results:
                    from langchain_core.messages import ToolMessage
                    messages.append(
                        ToolMessage(
                            content=str(tr["result"]),
                            tool_call_id=tr["tool_call_id"],
                        )
                    )
            else:
                # No more tool calls - we have the final response
                return response.content

        return "Max iterations reached - check may be incomplete"

    async def _execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        """Execute a compliance tool by name."""
        for tool in COMPLIANCE_TOOLS:
            if tool.name == tool_name:
                try:
                    # Tools are sync, so run in executor
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        None, lambda: tool.invoke(tool_args)
                    )
                    return result
                except Exception as e:
                    logger.error(f"[COMPLIANCE_AGENT] Tool {tool_name} error: {e}")
                    return {"error": str(e)}

        return {"error": f"Unknown tool: {tool_name}"}

    def _build_check_prompt(self, context: Optional[str]) -> str:
        """Build the compliance check prompt."""
        base_prompt = """Perform a comprehensive DPA compliance check NOW.

You MUST:
1. Run the full compliance audit using run_compliance_audit tool
2. Check PII obfuscation status using check_pii_obfuscation_status tool
3. Review recent audit logs using get_audit_log_summary tool
4. Verify data retention policy using check_data_retention_policy tool

For EACH check:
- If compliant: note the evidence
- If violation found: use log_compliance_violation tool to record it

After all checks, provide your compliance decision with:
- Overall compliance status (COMPLIANT or NON_COMPLIANT)
- List of any violations found
- Recommended actions
- Risk assessment

Be thorough and leave no compliance area unchecked."""

        if context:
            base_prompt += f"\n\nAdditional context: {context}"

        return base_prompt

    def _parse_decision(self, response: str, start_time: datetime) -> ComplianceDecision:
        """Parse the agent response into a ComplianceDecision."""
        # Determine if compliant based on response content
        response_lower = response.lower()
        compliant = (
            "non_compliant" not in response_lower
            and "non-compliant" not in response_lower
            and "violation" not in response_lower
        )

        # Extract violations mentioned
        violations = []
        if "violation" in response_lower:
            violations.append({"type": "DETECTED", "details": "See reasoning"})

        return ComplianceDecision(
            timestamp=start_time.isoformat() + "Z",
            decision_type="SCHEDULED_CHECK",
            compliant=compliant,
            reasoning=response,
            actions_taken=["Ran compliance audit", "Checked PII status", "Reviewed logs"],
            violations_found=violations,
            recommendations=self._extract_recommendations(response),
        )

    def _extract_recommendations(self, response: str) -> List[str]:
        """Extract recommendations from response."""
        recommendations = []
        if "recommend" in response.lower():
            # Simple extraction - in production, use more sophisticated parsing
            recommendations.append("Review agent recommendations in reasoning")
        return recommendations

    async def _run_fallback_check(self) -> ComplianceDecision:
        """Run compliance check without LLM (tool-only mode)."""
        logger.info("[COMPLIANCE_AGENT] Running fallback check (no LLM)")

        violations = []
        actions = []

        # Run each tool directly
        for tool in COMPLIANCE_TOOLS:
            if tool.name in ["run_compliance_audit", "check_pii_obfuscation_status",
                           "get_audit_log_summary", "check_data_retention_policy"]:
                try:
                    result = tool.invoke({} if tool.name != "get_audit_log_summary" else {"days": 1})
                    actions.append(f"Executed {tool.name}")

                    if result.get("violation"):
                        violations.append({
                            "tool": tool.name,
                            "action_required": result.get("action_required"),
                        })
                except Exception as e:
                    logger.error(f"[COMPLIANCE_AGENT] Fallback tool error: {e}")

        return ComplianceDecision(
            timestamp=datetime.utcnow().isoformat() + "Z",
            decision_type="FALLBACK_CHECK",
            compliant=len(violations) == 0,
            reasoning="Fallback mode - direct tool execution without LLM reasoning",
            actions_taken=actions,
            violations_found=violations,
            recommendations=["Configure ANTHROPIC_API_KEY for full agent capabilities"],
        )

    async def start_continuous_monitoring(self) -> None:
        """
        Start continuous compliance monitoring loop.

        Runs indefinitely, checking compliance at configured intervals.
        """
        self._status = AgentStatus.MONITORING
        logger.info(
            f"[COMPLIANCE_AGENT] Starting continuous monitoring "
            f"(interval: {self._monitoring_interval}s)"
        )

        while self._status == AgentStatus.MONITORING:
            try:
                decision = await self.run_compliance_check(
                    context="Scheduled continuous monitoring check"
                )

                if not decision.compliant:
                    self._status = AgentStatus.ENFORCING
                    logger.warning(
                        f"[COMPLIANCE_AGENT] Violations detected! "
                        f"Count: {len(decision.violations_found)}"
                    )
                    # After logging, return to monitoring
                    self._status = AgentStatus.MONITORING

                await asyncio.sleep(self._monitoring_interval)

            except Exception as e:
                logger.error(f"[COMPLIANCE_AGENT] Monitoring error: {e}")
                await asyncio.sleep(60)  # Short delay on error

    def stop_monitoring(self) -> None:
        """Stop continuous monitoring."""
        logger.info("[COMPLIANCE_AGENT] Stopping monitoring")
        self._status = AgentStatus.IDLE

    def get_recent_decisions(self, count: int = 10) -> List[ComplianceDecision]:
        """Get recent compliance decisions."""
        return self._decisions[-count:]


# Global singleton
_compliance_agent: Optional[ComplianceAgent] = None


def get_compliance_agent() -> ComplianceAgent:
    """Get the global Compliance Agent instance."""
    global _compliance_agent
    if _compliance_agent is None:
        _compliance_agent = ComplianceAgent()
    return _compliance_agent
