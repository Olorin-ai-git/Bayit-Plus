"""
LLM Initializer

Handles LLM initialization for orchestrator with mock support.
"""

import os
<<<<<<< HEAD
from unittest.mock import MagicMock
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage

from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.schema_constants import IP, get_full_table_name
=======
from langchain_anthropic import ChatAnthropic

from app.service.logging import get_bridge_logger
>>>>>>> 001-modify-analyzer-method

logger = get_bridge_logger(__name__)


class LLMInitializer:
    """Handles LLM initialization with mock support for testing."""

    @staticmethod
    def initialize_llm():
        """Initialize the configured LLM for orchestration (uses environment-selected model)."""
        # Check for TEST_MODE first
        test_mode = os.getenv("TEST_MODE", "").lower()

        # Check if any API key is available
        has_api_key = (os.getenv("ANTHROPIC_API_KEY") or
                      os.getenv("OPENAI_API_KEY") or
                      os.getenv("GEMINI_API_KEY"))

<<<<<<< HEAD
        use_mock = test_mode == "mock" or not has_api_key

        if use_mock:
            logger.info("🧪 Using mock LLM for testing")
            return LLMInitializer._create_mock_llm()
=======
        use_mock = test_mode in ["demo", "mock", "test"] or not has_api_key

        if use_mock:
            logger.info("🧪 Using MockLLM for testing")
            from app.service.agent.mock_llm import MockLLM
            return MockLLM()
>>>>>>> 001-modify-analyzer-method

        # Initialize real LLM
        try:
            from app.service.llm_manager import get_llm_manager
            llm_manager = get_llm_manager()
            llm = llm_manager.get_selected_model()
            logger.info(f"🤖 Using {type(llm)} for orchestration")
            return llm
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}, falling back to mock")
<<<<<<< HEAD
            return LLMInitializer._create_mock_llm()

    @staticmethod
    def _create_mock_llm():
        """Create a mock LLM that generates appropriate tool calls."""
        mock_llm = MagicMock(spec=ChatAnthropic)

        async def mock_ainvoke(messages, *args, **kwargs):
            logger.info("🧪 Mock LLM invoked")

            # Analyze message content to determine phase
            message_content = LLMInitializer._extract_message_content(messages)
            logger.info(f"🧪 Mock LLM: Analyzing message content: {message_content[:200]}...")

            # Determine phase
            phase_info = LLMInitializer._detect_phase(message_content)
            logger.info(f"🧪 Phase detection: {phase_info}")

            # Extract entity information
            entity_id, entity_type = LLMInitializer._extract_entity_info(messages)

            # Generate appropriate response based on phase
            return LLMInitializer._generate_phase_response(phase_info, entity_id, entity_type)

        mock_llm.ainvoke = mock_ainvoke
        return mock_llm

    @staticmethod
    def _extract_message_content(messages):
        """Extract content from all messages."""
        message_content = ""
        for msg in messages:
            if hasattr(msg, 'content'):
                message_content += str(msg.content).lower() + " "
        return message_content

    @staticmethod
    def _detect_phase(message_content):
        """Detect orchestrator phase from message content."""
        return {
            'is_initialization': 'starting comprehensive fraud investigation' in message_content,
            'is_snowflake_analysis': 'snowflake analysis' in message_content or 'entity to investigate' in message_content,
            'is_tool_execution': 'select and use additional tools' in message_content or 'additional tool execution' in message_content,
            'is_domain_analysis': 'domain analysis' in message_content or 'specialized agents' in message_content,
            'is_summary': 'summary' in message_content or 'final report' in message_content
        }

    @staticmethod
    def _extract_entity_info(messages):
        """Extract entity information from messages."""
        entity_id = '192.168.1.1'  # Default from user's test
        entity_type = 'ip'  # Default

        # Try to extract entity info from messages
        for msg in messages:
            if hasattr(msg, 'content'):
                content = str(msg.content)

                if 'Entity to investigate:' in content:
                    import re
                    match = re.search(r'Entity to investigate: (\w+) = ([\w\.]+)', content)
                    if match:
                        entity_type = match.group(1).lower()
                        entity_id = match.group(2)

                elif 'Entity:' in content:
                    import re
                    match = re.search(r'Entity: (\w+) - ([\w\.]+)', content)
                    if match:
                        entity_type = match.group(1).lower()
                        entity_id = match.group(2)

        return entity_id, entity_type

    @staticmethod
    def _generate_phase_response(phase_info, entity_id, entity_type):
        """Generate appropriate response based on detected phase."""
        if phase_info['is_tool_execution']:
            logger.info("🧪 Mock LLM: Tool execution phase - generating domain analysis tools")
            domain_tools = [
                {"name": "virustotal_ip_analysis", "args": {"ip": entity_id}, "id": "tool_call_002", "type": "tool_call"},
                {"name": "splunk_query", "args": {"entity_id": entity_id, "query_type": "device_analysis"}, "id": "tool_call_003", "type": "tool_call"},
                {"name": "geoip_lookup", "args": {"ip": entity_id}, "id": "tool_call_004", "type": "tool_call"}
            ]

            return AIMessage(
                content="Selecting tools for comprehensive domain analysis: network reputation, device patterns, and location analysis.",
                tool_calls=domain_tools
            )

        elif phase_info['is_domain_analysis']:
            logger.info("🧪 Mock LLM: Domain analysis phase - should route to domain agents")
            return AIMessage(
                content="Domain analysis phase: Ready to route to specialized domain agents for network, device, location, logs, authentication, and risk analysis."
            )

        elif phase_info['is_summary']:
            logger.info("🧪 Mock LLM: Summary phase - generating final report")
            return AIMessage(
                content="Investigation complete. Generating final summary report with risk assessment and recommendations."
            )

        else:
            # Default to Snowflake analysis
            logger.info("🧪 Mock LLM: Initialization/Snowflake phase - generating Snowflake tool call")
            return LLMInitializer._generate_snowflake_tool_call(entity_id, entity_type)

    @staticmethod
    def _generate_snowflake_tool_call(entity_id, entity_type):
        """Generate Snowflake tool call for mock LLM."""
        # Build appropriate WHERE clause based on entity type
        if entity_type == 'ip':
            where_field = IP
        elif entity_type == 'user_id':
            where_field = 'USER_ID'
        else:
            where_field = IP  # Default to IP field

        # Generate Snowflake tool call
        snowflake_tool_call = {
            "name": "snowflake_query_tool",
            "args": {
                "query": f"""
                SELECT TX_ID, TX_DATETIME, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION,
                       PAID_AMOUNT_VALUE_IN_CURRENCY, PAYMENT_METHOD, IP_COUNTRY_CODE,
                       DEVICE_ID, USER_AGENT
                FROM {get_full_table_name()}
                WHERE {where_field} = '{entity_id}'
                AND TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP)
                ORDER BY TX_DATETIME DESC
                LIMIT 1000
                """,
                "description": f"Analyzing {entity_type} {entity_id} - 7-day transaction lookback"
            },
            "id": "tool_call_001",
            "type": "tool_call"
        }

        return AIMessage(
            content=f"I'll analyze the {entity_type} '{entity_id}' by querying Snowflake for the last 7 days of transaction data.",
            tool_calls=[snowflake_tool_call]
        )
=======
            from app.service.agent.mock_llm import MockLLM
            return MockLLM()
>>>>>>> 001-modify-analyzer-method
