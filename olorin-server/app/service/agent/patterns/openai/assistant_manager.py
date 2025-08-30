"""
OpenAI Assistant Manager

Handles OpenAI Assistant creation, configuration, and lifecycle management
specifically optimized for fraud detection workflows.
"""

import logging
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.beta import Assistant
from openai.types.beta.thread import Thread

logger = logging.getLogger(__name__)


class AssistantManager:
    """Manages OpenAI Assistant creation and configuration for fraud detection"""
    
    def __init__(self, openai_client: AsyncOpenAI, openai_config):
        self.client = openai_client
        self.config = openai_config
        self._assistant: Optional[Assistant] = None
        self._thread: Optional[Thread] = None
    
    async def get_or_create_fraud_assistant(self, function_definitions: List[Dict[str, Any]]) -> Assistant:
        """Create or retrieve OpenAI Assistant optimized for fraud detection"""
        
        if self._assistant:
            return self._assistant
        
        # Define fraud detection assistant instructions
        fraud_instructions = self._get_fraud_investigation_instructions()
        
        try:
            self._assistant = await self.client.beta.assistants.create(
                name=self.config.assistant_name or "Olorin Fraud Detective",
                description=self.config.assistant_description or "AI-powered fraud detection and investigation assistant",
                instructions=self.config.assistant_instructions or fraud_instructions,
                model=self.config.model,
                tools=[{"type": "function", "function": func_def} 
                       for func_def in function_definitions],
                temperature=self.config.temperature,
                metadata={"environment": "fraud_detection", "version": "1.0"}
            )
            
            logger.info(f"Created OpenAI Assistant: {self._assistant.id} for fraud detection")
            return self._assistant
            
        except Exception as e:
            logger.error(f"Failed to create OpenAI Assistant: {e}")
            raise
    
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
                    "created_for": "fraud_investigation"
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
- QBRetrieverTool: Retrieve additional context and data points
- TTRetrieverTool: Access transaction tracking information

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