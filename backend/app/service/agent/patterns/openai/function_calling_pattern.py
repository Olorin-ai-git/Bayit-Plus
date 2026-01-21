"""
OpenAI Function Calling Pattern Implementation

Direct function calling pattern for lightweight fraud queries without Assistant API overhead.
Provides high-performance tool execution for single-turn investigations and fraud checks.
"""

from typing import Any, Dict, List

from langchain_core.messages import BaseMessage

from app.service.logging import get_bridge_logger

from ..base import OpenAIBasePattern, PatternMetrics, PatternResult, PatternType
from .chat_completion_handler import ChatCompletionHandler
from .message_formatter import MessageFormatter
from .streaming_handler import StreamingHandler
from .tool_converter import convert_langgraph_tools_to_openai_functions

logger = get_bridge_logger(__name__)


class OpenAIFunctionCallingPattern(OpenAIBasePattern):
    """
    Direct OpenAI function calling pattern for lightweight fraud detection.

    Ideal for:
    - Quick tool executions without conversation history
    - Single-turn fraud investigations
    - High-performance fraud checks with minimal latency
    - Cost-effective tool execution workflows
    """

    def __init__(self, config, openai_config, tools=None, ws_streaming=None):
        """Initialize OpenAI Function Calling pattern"""
        super().__init__(config, openai_config, tools, ws_streaming)
        self._function_definitions: List[Dict[str, Any]] = []
        self._streaming_handler: StreamingHandler = None
        self._completion_handler: ChatCompletionHandler = None
        self._message_formatter: MessageFormatter = None

        # Prepare function definitions from existing tools
        if self.tools:
            self._function_definitions = convert_langgraph_tools_to_openai_functions(
                self.tools
            )
            logger.info(
                f"Converted {len(self._function_definitions)} tools to OpenAI functions"
            )

    async def execute_openai_pattern(
        self, messages: List[BaseMessage], context: Dict[str, Any]
    ) -> PatternResult:
        """Execute OpenAI Function Calling pattern for fraud investigation"""

        metrics = PatternMetrics(pattern_type=PatternType.OPENAI_FUNCTION_CALLING)

        try:
            # Ensure OpenAI client and handlers are initialized
            await self._ensure_openai_client()
            await self._initialize_handlers()

            # Prepare messages for OpenAI API
            openai_messages = self._message_formatter.convert_messages_to_openai_format(
                messages, context
            )

            # Prepare function calling parameters
            function_calling_params = (
                self._message_formatter.prepare_function_calling_params(
                    self._function_definitions
                )
            )

            # Execute chat completion with function calling
            completion_result = await self._completion_handler.execute_completion(
                openai_messages, function_calling_params, context
            )

            if completion_result["success"]:
                # Update metrics
                self._update_openai_metrics(
                    metrics,
                    function_calls=completion_result.get("function_calls", 0),
                    streaming_chunks=completion_result.get("streaming_chunks", 0),
                    cost_cents=completion_result.get("cost_cents", 0.0),
                )

                return PatternResult.success_result(
                    result=completion_result["result"],
                    confidence=0.9,
                    reasoning="OpenAI Function Calling completed fraud investigation",
                )
            else:
                return PatternResult.error_result(
                    error_message=completion_result.get(
                        "error", "Function calling execution failed"
                    )
                )

        except Exception as e:
            logger.error(f"OpenAI Function Calling pattern execution failed: {e}")
            return PatternResult.error_result(
                error_message=f"Function calling pattern failed: {str(e)}"
            )

    async def _initialize_handlers(self):
        """Initialize all handlers if needed"""
        if not self._streaming_handler:
            self._streaming_handler = StreamingHandler(
                self._openai_client, self.ws_streaming
            )

        if not self._completion_handler:
            self._completion_handler = ChatCompletionHandler(
                self._openai_client, self.tools, self._streaming_handler
            )

        if not self._message_formatter:
            self._message_formatter = MessageFormatter(self.openai_config)

    async def cleanup(self) -> None:
        """Clean up OpenAI Function Calling resources"""
        logger.info("OpenAI Function Calling pattern cleaned up")
