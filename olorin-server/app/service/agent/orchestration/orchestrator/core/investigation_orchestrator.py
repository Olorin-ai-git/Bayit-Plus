"""
Investigation Orchestrator Core

Central orchestrator that manages the entire investigation flow using modular handlers.
"""

from typing import Any, Dict, List

# Import analysis modules
from app.service.agent.orchestration.orchestrator.analysis import (
    DataAnalyzer,
    LLMInitializer,
    SystemPromptCreator,
)

# Import handlers
from app.service.agent.orchestration.orchestrator.handlers import (
    DomainAnalysisHandler,
    InitializationHandler,
    SnowflakeHandler,
    SummaryHandler,
    ToolExecutionHandler,
)
from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationOrchestrator:
    """
    Central orchestrator that manages the entire investigation flow using modular components.
    """

    def __init__(self, tools: List[Any]):
        """
        Initialize the orchestrator with tools.

        Args:
            tools: List of all available tools (52 tools)
        """
        import os

        self.tools = tools
        self.tool_names = [tool.name for tool in tools]

        logger.info(f"🎯 Initializing modular orchestrator...")
        logger.info(f"   TEST_MODE: {os.getenv('TEST_MODE')}")

        # Initialize analysis modules
        self.llm_initializer = LLMInitializer()
        self.system_prompt_creator = SystemPromptCreator()
        self.data_analyzer = DataAnalyzer()

        # Initialize LLM
        self.llm = self.llm_initializer.initialize_llm()
        self.llm_with_tools = self.llm.bind_tools(tools)

        # Initialize handlers with dependencies
        self.initialization_handler = InitializationHandler()
        self.snowflake_handler = SnowflakeHandler(
            self.llm_with_tools,
            tools,
            self.system_prompt_creator.create_enhanced_system_prompt,
        )
        self.tool_execution_handler = ToolExecutionHandler(
            self.llm_with_tools,
            tools,
            self.system_prompt_creator.create_enhanced_system_prompt,
            self.data_analyzer.summarize_snowflake_data,
        )
        self.domain_analysis_handler = DomainAnalysisHandler(
            self.system_prompt_creator.create_enhanced_system_prompt
        )
        self.summary_handler = SummaryHandler(self.llm)

        logger.info(f"🎯 Modular orchestrator initialized with {len(tools)} tools")
        logger.info(f"   LLM type: {type(self.llm)}")
        logger.info(f"   LLM with tools type: {type(self.llm_with_tools)}")

    async def handle_initialization(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle the initialization phase."""
        return await self.initialization_handler.handle_initialization(state)

    async def handle_snowflake_analysis(
        self, state: InvestigationState
    ) -> Dict[str, Any]:
        """Handle Snowflake analysis phase."""
        return await self.snowflake_handler.handle_snowflake_analysis(state)

    async def handle_tool_execution(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle additional tool execution based on Snowflake findings."""
        return await self.tool_execution_handler.handle_tool_execution(state)

    async def handle_domain_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle domain analysis phase."""
        return await self.domain_analysis_handler.handle_domain_analysis(state)

    async def handle_summary(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle summary phase."""
        return await self.summary_handler.handle_summary(state)

    async def orchestrate_investigation(
        self, state: InvestigationState
    ) -> Dict[str, Any]:
        """Main orchestration method that manages the investigation flow."""
        current_phase = state.get("current_phase", "initialization")

        logger.info(f"🎯 Orchestrating investigation phase: {current_phase}")

        # Route to appropriate handler based on current phase
        if current_phase == "initialization":
            return await self.handle_initialization(state)
        elif current_phase == "snowflake_analysis":
            return await self.handle_snowflake_analysis(state)
        elif current_phase == "tool_execution":
            return await self.handle_tool_execution(state)
        elif current_phase == "domain_analysis":
            return await self.handle_domain_analysis(state)
        elif current_phase == "summary":
            return await self.handle_summary(state)
        else:
            # Default to initialization if phase is unknown
            logger.warning(
                f"Unknown phase '{current_phase}', defaulting to initialization"
            )
            return await self.handle_initialization(state)

    # Backward compatibility methods
    def _handle_initialization(self, state: InvestigationState) -> Dict[str, Any]:
        """Backward compatibility wrapper."""
        return self.handle_initialization(state)

    def _handle_snowflake_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Backward compatibility wrapper."""
        return self.handle_snowflake_analysis(state)

    def _handle_tool_execution(self, state: InvestigationState) -> Dict[str, Any]:
        """Backward compatibility wrapper."""
        return self.handle_tool_execution(state)

    def _handle_domain_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Backward compatibility wrapper."""
        return self.handle_domain_analysis(state)

    def _handle_summary(self, state: InvestigationState) -> Dict[str, Any]:
        """Backward compatibility wrapper."""
        return self.handle_summary(state)

    # Delegate analysis methods
    def _summarize_snowflake_data(self, snowflake_data) -> str:
        """Delegate to data analyzer."""
        return self.data_analyzer.summarize_snowflake_data(snowflake_data)

    def _create_enhanced_system_prompt(
        self, base_prompt: str, state: InvestigationState
    ) -> str:
        """Delegate to system prompt creator."""
        return self.system_prompt_creator.create_enhanced_system_prompt(
            base_prompt, state
        )

    def _initialize_llm(self):
        """Delegate to LLM initializer."""
        return self.llm_initializer.initialize_llm()

    # Utility methods for backward compatibility
    def _sanitize_custom_prompt(self, prompt: str) -> str:
        """Delegate to prompt sanitizer."""
        return self.system_prompt_creator.prompt_sanitizer.sanitize_custom_prompt(
            prompt
        )

    def _validate_investigation_integrity(self, state: InvestigationState) -> bool:
        """Delegate to integrity validator."""
        return self.system_prompt_creator.integrity_validator.validate_investigation_integrity(
            state
        )
