"""
OpenAI Assistant Manager

Handles OpenAI Assistant creation, configuration, and lifecycle management
specifically optimized for fraud detection workflows.
"""

from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.beta import Assistant
from openai.types.beta.thread import Thread

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AssistantManager:
    """Manages OpenAI Assistant creation and configuration for fraud detection"""

    def __init__(self, openai_client: AsyncOpenAI, openai_config):
        self.client = openai_client
        self.config = openai_config
        self._assistant: Optional[Assistant] = None
        self._thread: Optional[Thread] = None

    async def get_or_create_fraud_assistant(
        self, function_definitions: List[Dict[str, Any]]
    ) -> Assistant:
        """Create or retrieve OpenAI Assistant optimized for fraud detection"""

        if self._assistant:
            return self._assistant

        # Define fraud detection assistant instructions
        fraud_instructions = self._get_fraud_investigation_instructions()

        try:
            self._assistant = await self.client.beta.assistants.create(
                name=self.config.assistant_name or "Olorin Fraud Detective",
                description=self.config.assistant_description
                or "AI-powered fraud detection and investigation assistant",
                instructions=self.config.assistant_instructions or fraud_instructions,
                model=self.config.model,
                tools=[
                    {"type": "function", "function": func_def}
                    for func_def in function_definitions
                ],
                temperature=self.config.temperature,
                metadata={"environment": "fraud_detection", "version": "1.0"},
            )

            logger.info(
                f"Created OpenAI Assistant: {self._assistant.id} for fraud detection"
            )
            return self._assistant

        except Exception as e:
            logger.error(f"Failed to create OpenAI Assistant: {e}")
            raise

    async def get_or_create_specialized_assistant(
        self,
        agent_type: str,
        agent_config: Dict[str, Any],
        function_definitions: List[Dict[str, Any]],
    ) -> Assistant:
        """Create specialized assistant for specific domain agent"""

        # Create specialized instructions based on agent type
        specialized_instructions = self._get_specialized_instructions(
            agent_type, agent_config
        )

        try:
            assistant = await self.client.beta.assistants.create(
                name=f"Olorin {agent_config['name']}",
                description=f"Specialized {agent_config['specialization']} agent",
                instructions=specialized_instructions,
                model=self.config.model,
                tools=[
                    {"type": "function", "function": func_def}
                    for func_def in function_definitions
                ],
                temperature=self.config.temperature,
                metadata={
                    "agent_type": agent_type,
                    "specialization": agent_config["specialization"],
                },
            )

            logger.info(
                f"Created specialized assistant: {assistant.id} for {agent_type}"
            )
            return assistant

        except Exception as e:
            logger.error(
                f"Failed to create specialized assistant for {agent_type}: {e}"
            )
            raise

    def _get_specialized_instructions(
        self, agent_type: str, agent_config: Dict[str, Any]
    ) -> str:
        """Get specialized instructions for domain-specific agents"""

        base_instructions = f"""
You are a specialized {agent_config['name']} for Olorin's fraud detection system.
Your expertise area: {agent_config['specialization']}

Focus on providing detailed analysis in your domain while considering the broader fraud investigation context.
"""

        domain_specific = {
            "network": """
**Network Analysis Focus**:
- Analyze IP addresses for reputation, location, and VPN/proxy usage
- Identify suspicious network patterns and routing anomalies  
- Assess ISP reputation and hosting provider risks
- Detect network-level indicators of compromise
            """,
            "device": """  
**Device Analysis Focus**:
- Analyze device fingerprints for consistency and authenticity
- Identify device spoofing and emulation indicators
- Assess browser and OS anomalies
- Track device reputation and behavioral patterns
            """,
            "location": """
**Location Analysis Focus**: 
- Validate geographic consistency of user activities
- Identify impossible travel patterns and location spoofing
- Assess timezone and locale alignment with claimed location
- Analyze location reputation and risk factors
            """,
            "logs": """
**Logs Analysis Focus**:
- Analyze security and application logs for suspicious patterns
- Identify behavioral anomalies and access violations
- Detect authentication anomalies and session irregularities  
- Correlate events across multiple log sources
            """,
        }

        return base_instructions + domain_specific.get(agent_type, "")

    async def get_or_create_thread(self, context: Dict[str, Any]) -> Thread:
        """Create or retrieve thread for conversation continuity"""

        # Check if we have an existing thread for this investigation
        thread_id = context.get("thread_id")

        if thread_id and self._thread and self._thread.id == thread_id:
            return self._thread

        # Create new thread
        try:
            self._thread = await self.client.beta.threads.create(
                metadata={
                    "investigation_id": context.get("investigation_id", "unknown"),
                    "user_id": context.get("user_id", "system"),
                    "created_for": "fraud_investigation",
                }
            )

            logger.info(f"Created OpenAI thread: {self._thread.id}")
            return self._thread

        except Exception as e:
            logger.error(f"Failed to create OpenAI thread: {e}")
            raise

    def _get_fraud_investigation_instructions(self) -> str:
        """Get comprehensive fraud detection instructions for the assistant"""

        return """
You are an expert fraud detection analyst for Olorin's investigation system. Your role is to:

1. **Analyze Suspicious Transactions**: Examine transaction patterns, amounts, timing, and metadata for fraud indicators
2. **Device & Location Analysis**: Assess device fingerprints, IP addresses, and geographic patterns for anomalies  
3. **Behavioral Analysis**: Identify unusual user behavior patterns and account activity
4. **Risk Assessment**: Provide detailed risk scores with clear reasoning and evidence
5. **Investigation Coordination**: Use available tools systematically to gather comprehensive evidence

**Available Tools**:
- SplunkQueryTool: Query security logs and transaction data from Splunk SIEM
- SumoLogicQueryTool: Query application logs and performance metrics

**Investigation Process**:
1. Start with initial transaction analysis using Splunk data
2. Cross-reference with SumoLogic for application-level indicators
3. Gather additional context using retrieval tools
4. Synthesize findings into comprehensive risk assessment
5. Provide actionable recommendations

**Output Format**:
Always provide structured analysis with:
- Executive Summary (risk level, confidence score)
- Key Findings (evidence-based observations)
- Risk Factors (specific indicators identified)
- Recommendations (next steps for investigation team)

Focus on accuracy, evidence-based analysis, and clear communication of findings.
"""

    def cleanup(self):
        """Clean up assistant and thread references"""
        self._assistant = None
        self._thread = None
        logger.info("Assistant manager cleaned up")
