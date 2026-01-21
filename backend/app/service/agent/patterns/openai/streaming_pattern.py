"""
OpenAI Streaming Pattern Implementation

Advanced streaming pattern for real-time fraud analysis with progressive risk
assessment updates, live investigation progress, and enhanced WebSocket integration.
"""

import asyncio
import json
from typing import Any, Dict, List, Optional

from langchain_core.messages import BaseMessage

from app.service.logging import get_bridge_logger

from ..base import OpenAIBasePattern, PatternMetrics, PatternResult, PatternType
from .chat_completion_handler import ChatCompletionHandler
from .message_formatter import MessageFormatter
from .streaming_handler import StreamingHandler
from .tool_converter import convert_langgraph_tools_to_openai_functions

logger = get_bridge_logger(__name__)


class OpenAIStreamingPattern(OpenAIBasePattern):
    """
    Advanced streaming pattern for real-time fraud investigation analysis.

    Features:
    - Progressive fraud risk analysis with live updates
    - Real-time investigation status broadcasting
    - Enhanced WebSocket coordination across multiple channels
    - Streaming function call execution with progress tracking
    - Advanced error recovery for streaming failures
    """

    def __init__(self, config, openai_config, tools=None, ws_streaming=None):
        """Initialize OpenAI Streaming pattern with advanced capabilities"""
        super().__init__(config, openai_config, tools, ws_streaming)

        # Advanced streaming components
        self._advanced_streaming_handler: Optional[AdvancedStreamingHandler] = None
        self._progressive_analyzer: Optional[ProgressiveRiskAnalyzer] = None
        self._streaming_coordinator: Optional[StreamingCoordinator] = None

        # Core components
        self._function_definitions: List[Dict[str, Any]] = []
        self._completion_handler: Optional[ChatCompletionHandler] = None
        self._message_formatter: Optional[MessageFormatter] = None

        # Prepare function definitions from existing tools
        if self.tools:
            self._function_definitions = convert_langgraph_tools_to_openai_functions(
                self.tools
            )
            logger.info(
                f"Streaming pattern initialized with {len(self._function_definitions)} tools"
            )

    async def execute_openai_pattern(
        self, messages: List[BaseMessage], context: Dict[str, Any]
    ) -> PatternResult:
        """Execute advanced OpenAI Streaming pattern"""

        metrics = PatternMetrics(pattern_type=PatternType.OPENAI_STREAMING)
        investigation_id = context.get("investigation_id", "streaming_investigation")

        try:
            # Initialize advanced streaming infrastructure
            await self._ensure_openai_client()
            await self._initialize_advanced_handlers(investigation_id)

            # Setup progressive analysis for real-time risk updates
            await self._setup_progressive_analysis(context)

            # Coordinate multi-channel streaming
            streaming_session = await self._coordinate_streaming(investigation_id)

            # Prepare enhanced streaming messages
            openai_messages = self._message_formatter.convert_messages_to_openai_format(
                messages, context
            )

            # Prepare enhanced streaming parameters
            streaming_params = self._prepare_advanced_streaming_params()
            streaming_params["messages"] = openai_messages

            # Execute advanced streaming with progressive analysis
            streaming_result = await self._execute_advanced_streaming(
                streaming_params, context, streaming_session
            )

            if streaming_result["success"]:
                # Finalize progressive analysis
                final_analysis = await self._progressive_analyzer.finalize_analysis()

                # Update metrics with advanced streaming data
                self._update_openai_metrics(
                    metrics,
                    function_calls=streaming_result.get("function_calls", 0),
                    streaming_chunks=streaming_result.get("streaming_chunks", 0),
                    cost_cents=streaming_result.get("cost_cents", 0.0),
                )

                return PatternResult.success_result(
                    result={
                        "content": streaming_result["result"],
                        "progressive_analysis": final_analysis,
                        "investigation_id": investigation_id,
                        "streaming_session_id": streaming_session["session_id"],
                    },
                    confidence=0.98,
                    reasoning=f"Advanced streaming pattern completed for investigation {investigation_id}",
                )
            else:
                return PatternResult.error_result(
                    error_message=streaming_result.get(
                        "error", "Advanced streaming execution failed"
                    )
                )

        except Exception as e:
            logger.error(f"OpenAI Streaming pattern execution failed: {e}")
            return PatternResult.error_result(
                error_message=f"Streaming pattern failed: {str(e)}"
            )
        finally:
            # Cleanup streaming resources
            await self._cleanup_streaming_resources()

    async def _initialize_advanced_handlers(self, investigation_id: str):
        """Initialize advanced streaming handlers"""
        if not self._advanced_streaming_handler:
            self._advanced_streaming_handler = AdvancedStreamingHandler(
                self._openai_client, self.ws_streaming, investigation_id
            )

        if not self._completion_handler:
            self._completion_handler = ChatCompletionHandler(
                self._openai_client, self.tools, self._advanced_streaming_handler
            )

        if not self._message_formatter:
            self._message_formatter = MessageFormatter(self.openai_config)

    async def _setup_progressive_analysis(self, context: Dict[str, Any]):
        """Setup progressive fraud analysis with real-time risk updates"""
        self._progressive_analyzer = ProgressiveRiskAnalyzer(
            self._advanced_streaming_handler, context
        )
        await self._progressive_analyzer.initialize()

    async def _coordinate_streaming(self, investigation_id: str) -> Dict[str, Any]:
        """Coordinate multi-channel streaming session"""
        self._streaming_coordinator = StreamingCoordinator(
            investigation_id, self.ws_streaming
        )
        return await self._streaming_coordinator.start_session()

    def _prepare_advanced_streaming_params(self) -> Dict[str, Any]:
        """Prepare enhanced streaming parameters"""
        params = self._message_formatter.prepare_function_calling_params(
            self._function_definitions
        )

        # Enable advanced streaming features
        params["stream"] = True
        params["stream_options"] = {
            "include_usage": True,
            "include_function_calls": True,
        }

        return params

    async def _execute_advanced_streaming(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
        streaming_session: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute advanced streaming with progressive analysis"""

        try:
            # Start progressive analysis
            await self._progressive_analyzer.start_analysis()

            # Execute streaming completion with enhanced monitoring
            stream = await self._openai_client.chat.completions.create(**params)

            accumulated_content = ""
            streaming_chunks = 0
            function_calls = 0

            async for chunk in stream:
                streaming_chunks += 1

                # Process chunk with progressive analysis
                chunk_data = await self._advanced_streaming_handler.process_chunk(
                    chunk, streaming_chunks
                )

                if chunk_data["content"]:
                    accumulated_content += chunk_data["content"]

                    # Update progressive risk analysis
                    await self._progressive_analyzer.update_analysis(
                        chunk_data["content"], streaming_chunks
                    )

                # Handle streaming function calls
                if chunk_data.get("tool_calls"):
                    function_calls += await self._handle_streaming_function_calls(
                        chunk_data["tool_calls"], context
                    )

            # Complete streaming session
            await self._streaming_coordinator.complete_session()

            return {
                "success": True,
                "result": accumulated_content,
                "streaming_chunks": streaming_chunks,
                "function_calls": function_calls,
                "cost_cents": self._estimate_streaming_cost(streaming_chunks),
            }

        except Exception as e:
            logger.error(f"Advanced streaming execution failed: {e}")
            await self._streaming_coordinator.handle_error(str(e))
            return {"success": False, "error": str(e)}

    async def _handle_streaming_function_calls(
        self, tool_calls: List[Any], context: Dict[str, Any]
    ) -> int:
        """Handle function calls during streaming with progress broadcast"""

        function_count = 0

        for tool_call in tool_calls:
            try:
                # Broadcast function call start
                await self._advanced_streaming_handler.broadcast_function_start(
                    tool_call.function.name, json.loads(tool_call.function.arguments)
                )

                # Execute function call (reuse existing logic)
                from .tool_executor import execute_openai_function_call

                result = await execute_openai_function_call(
                    tool_call.function.name,
                    json.loads(tool_call.function.arguments),
                    self.tools,
                )

                # Broadcast function call completion
                await self._advanced_streaming_handler.broadcast_function_complete(
                    tool_call.function.name, result
                )

                function_count += 1

            except Exception as e:
                logger.error(f"Streaming function call failed: {e}")
                await self._advanced_streaming_handler.broadcast_function_error(
                    tool_call.function.name, str(e)
                )

        return function_count

    def _estimate_streaming_cost(self, streaming_chunks: int) -> float:
        """Estimate streaming API cost in cents"""
        # Simplified streaming cost estimation
        base_cost = streaming_chunks * 0.001  # Base per-chunk cost
        return base_cost * 100  # Convert to cents

    async def _cleanup_streaming_resources(self):
        """Clean up streaming pattern resources"""
        try:
            if self._streaming_coordinator:
                await self._streaming_coordinator.cleanup()
            if self._progressive_analyzer:
                await self._progressive_analyzer.cleanup()
        except Exception as e:
            logger.warning(f"Streaming cleanup warning: {e}")


class AdvancedStreamingHandler(StreamingHandler):
    """Enhanced streaming handler with advanced fraud analysis capabilities"""

    def __init__(self, openai_client, ws_streaming, investigation_id: str):
        super().__init__(openai_client, ws_streaming)
        self.investigation_id = investigation_id

    async def process_chunk(self, chunk: Any, chunk_number: int) -> Dict[str, Any]:
        """Process streaming chunk with enhanced analysis"""

        chunk_data = {"content": "", "tool_calls": None}

        if chunk.choices and chunk.choices[0].delta:
            delta = chunk.choices[0].delta

            if hasattr(delta, "content") and delta.content:
                chunk_data["content"] = delta.content

                # Broadcast enhanced chunk with analysis
                await self._broadcast_enhanced_chunk(delta.content, chunk_number)

            if hasattr(delta, "tool_calls") and delta.tool_calls:
                chunk_data["tool_calls"] = delta.tool_calls

        return chunk_data

    async def _broadcast_enhanced_chunk(self, content: str, chunk_number: int):
        """Broadcast chunk with enhanced metadata"""
        try:
            if hasattr(self.ws_streaming, "broadcast_investigation_update"):
                await self.ws_streaming.broadcast_investigation_update(
                    investigation_id=self.investigation_id,
                    update_type="enhanced_stream",
                    data={
                        "content": content,
                        "chunk_number": chunk_number,
                        "type": "progressive_analysis",
                        "timestamp": asyncio.get_event_loop().time(),
                    },
                )
        except Exception as e:
            logger.warning(f"Enhanced chunk broadcast failed: {e}")

    async def broadcast_function_start(self, function_name: str, args: Dict[str, Any]):
        """Broadcast function call start"""
        await self._broadcast_function_status("function_start", function_name, args)

    async def broadcast_function_complete(self, function_name: str, result: Any):
        """Broadcast function call completion"""
        await self._broadcast_function_status(
            "function_complete", function_name, {"result": str(result)[:200]}
        )

    async def broadcast_function_error(self, function_name: str, error: str):
        """Broadcast function call error"""
        await self._broadcast_function_status(
            "function_error", function_name, {"error": error}
        )

    async def _broadcast_function_status(
        self, status: str, function_name: str, data: Dict[str, Any]
    ):
        """Broadcast function call status"""
        try:
            if hasattr(self.ws_streaming, "broadcast_investigation_update"):
                await self.ws_streaming.broadcast_investigation_update(
                    investigation_id=self.investigation_id,
                    update_type="function_progress",
                    data={
                        "status": status,
                        "function_name": function_name,
                        "data": data,
                        "timestamp": asyncio.get_event_loop().time(),
                    },
                )
        except Exception as e:
            logger.warning(f"Function status broadcast failed: {e}")


class ProgressiveRiskAnalyzer:
    """Analyzes fraud risk progressively during streaming"""

    def __init__(self, streaming_handler, context: Dict[str, Any]):
        self.streaming_handler = streaming_handler
        self.context = context
        self.current_risk_score = 0.0
        self.evidence_points = []
        self.analysis_progress = 0.0

    async def initialize(self):
        """Initialize progressive analysis"""
        self.current_risk_score = 0.0
        self.evidence_points = []
        self.analysis_progress = 0.0

    async def start_analysis(self):
        """Start progressive analysis"""
        await self._broadcast_analysis_start()

    async def update_analysis(self, content_chunk: str, chunk_number: int):
        """Update analysis with new content chunk"""

        # Simple progressive risk scoring (enhance as needed)
        risk_keywords = ["fraud", "suspicious", "anomaly", "risk", "threat", "unusual"]
        chunk_risk = sum(
            1 for keyword in risk_keywords if keyword.lower() in content_chunk.lower()
        )

        # Update progressive risk score
        self.current_risk_score = min(100.0, self.current_risk_score + chunk_risk * 2.5)
        self.analysis_progress = min(100.0, chunk_number * 2.0)

        # Broadcast progressive update
        await self._broadcast_analysis_update()

    async def finalize_analysis(self) -> Dict[str, Any]:
        """Finalize progressive analysis"""

        final_analysis = {
            "final_risk_score": self.current_risk_score,
            "risk_level": self._determine_risk_level(),
            "evidence_count": len(self.evidence_points),
            "analysis_complete": True,
        }

        await self._broadcast_analysis_complete(final_analysis)
        return final_analysis

    def _determine_risk_level(self) -> str:
        """Determine risk level from score"""
        if self.current_risk_score >= 70:
            return "HIGH"
        elif self.current_risk_score >= 40:
            return "MEDIUM"
        else:
            return "LOW"

    async def _broadcast_analysis_start(self):
        """Broadcast analysis start"""
        await self._broadcast_analysis_event(
            "analysis_start", {"initial_risk_score": 0.0}
        )

    async def _broadcast_analysis_update(self):
        """Broadcast progressive analysis update"""
        await self._broadcast_analysis_event(
            "analysis_update",
            {
                "current_risk_score": self.current_risk_score,
                "risk_level": self._determine_risk_level(),
                "progress_percentage": self.analysis_progress,
            },
        )

    async def _broadcast_analysis_complete(self, final_analysis: Dict[str, Any]):
        """Broadcast analysis completion"""
        await self._broadcast_analysis_event("analysis_complete", final_analysis)

    async def _broadcast_analysis_event(self, event_type: str, data: Dict[str, Any]):
        """Broadcast analysis event"""
        try:
            if hasattr(
                self.streaming_handler.ws_streaming, "broadcast_investigation_update"
            ):
                await self.streaming_handler.ws_streaming.broadcast_investigation_update(
                    investigation_id=self.streaming_handler.investigation_id,
                    update_type="progressive_analysis",
                    data={
                        "event_type": event_type,
                        "analysis_data": data,
                        "timestamp": asyncio.get_event_loop().time(),
                    },
                )
        except Exception as e:
            logger.warning(f"Analysis event broadcast failed: {e}")

    async def cleanup(self):
        """Clean up analyzer resources"""
        self.evidence_points.clear()


class StreamingCoordinator:
    """Coordinates multi-channel streaming sessions"""

    def __init__(self, investigation_id: str, ws_streaming):
        self.investigation_id = investigation_id
        self.ws_streaming = ws_streaming
        self.session_id = f"stream_{investigation_id}_{asyncio.get_event_loop().time()}"

    async def start_session(self) -> Dict[str, Any]:
        """Start streaming coordination session"""

        session_data = {
            "session_id": self.session_id,
            "investigation_id": self.investigation_id,
            "started_at": asyncio.get_event_loop().time(),
        }

        await self._broadcast_session_event("session_start", session_data)
        return session_data

    async def complete_session(self):
        """Complete streaming session"""
        await self._broadcast_session_event(
            "session_complete",
            {
                "session_id": self.session_id,
                "completed_at": asyncio.get_event_loop().time(),
            },
        )

    async def handle_error(self, error_message: str):
        """Handle streaming session error"""
        await self._broadcast_session_event(
            "session_error",
            {
                "session_id": self.session_id,
                "error": error_message,
                "error_at": asyncio.get_event_loop().time(),
            },
        )

    async def _broadcast_session_event(self, event_type: str, data: Dict[str, Any]):
        """Broadcast session coordination event"""
        try:
            if hasattr(self.ws_streaming, "broadcast_investigation_update"):
                await self.ws_streaming.broadcast_investigation_update(
                    investigation_id=self.investigation_id,
                    update_type="session_coordination",
                    data={"event_type": event_type, "session_data": data},
                )
        except Exception as e:
            logger.warning(f"Session event broadcast failed: {e}")

    async def cleanup(self):
        """Clean up coordination resources"""
        await self._broadcast_session_event(
            "session_cleanup",
            {
                "session_id": self.session_id,
                "cleanup_at": asyncio.get_event_loop().time(),
            },
        )
