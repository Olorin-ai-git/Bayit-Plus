"""
OpenAI Chat Completion Handler

Handles chat completions with function calling for the Function Calling pattern.
Provides streaming and non-streaming execution capabilities.
"""

from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

from .tool_executor import execute_openai_function_call

logger = get_bridge_logger(__name__)


class ChatCompletionHandler:
    """Handles OpenAI chat completions with function calling"""

    def __init__(self, openai_client, tools, streaming_handler=None):
        self.client = openai_client
        self.tools = tools
        self.streaming_handler = streaming_handler

    async def execute_completion(
        self,
        messages: List[Dict[str, str]],
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute chat completion with function calling"""

        try:
            params["messages"] = messages
            function_calls = 0
            streaming_chunks = 0

            # Execute initial completion
            if params.get("stream", False):
                response = await self._handle_streaming_completion(params, context)
                streaming_chunks = response.get("streaming_chunks", 0)
            else:
                response = await self.client.chat.completions.create(**params)

            # Process response and handle function calls
            if hasattr(response, "choices") and response.choices:
                choice = response.choices[0]
                message = choice.message

                # Handle function calls if present
                if hasattr(message, "tool_calls") and message.tool_calls:
                    function_results = await self._handle_function_calls(
                        message.tool_calls, context
                    )
                    function_calls = len(message.tool_calls)

                    return {
                        "success": True,
                        "result": self._format_function_results(function_results),
                        "function_calls": function_calls,
                        "streaming_chunks": streaming_chunks,
                        "cost_cents": self._estimate_api_cost(response),
                    }
                else:
                    # Direct response without function calls
                    return {
                        "success": True,
                        "result": message.content,
                        "function_calls": 0,
                        "streaming_chunks": streaming_chunks,
                        "cost_cents": self._estimate_api_cost(response),
                    }
            else:
                return {"success": False, "error": "No response choices received"}

        except Exception as e:
            logger.error(f"Chat completion execution failed: {e}")
            return {"success": False, "error": str(e)}

    async def _handle_streaming_completion(
        self, params: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle streaming chat completion"""

        investigation_id = context.get("investigation_id", "unknown")
        accumulated_content = ""
        streaming_chunks = 0

        try:
            stream = await self.client.chat.completions.create(**params)

            async for chunk in stream:
                streaming_chunks += 1

                if chunk.choices and chunk.choices[0].delta:
                    delta = chunk.choices[0].delta

                    if hasattr(delta, "content") and delta.content:
                        accumulated_content += delta.content

                        # Broadcast streaming chunk via WebSocket
                        if self.streaming_handler:
                            await self.streaming_handler._broadcast_chunk(
                                investigation_id, delta.content
                            )

            # Create response-like object for consistency
            response_obj = type(
                "Response",
                (),
                {
                    "choices": [
                        type(
                            "Choice",
                            (),
                            {
                                "message": type(
                                    "Message",
                                    (),
                                    {
                                        "content": accumulated_content,
                                        "tool_calls": None,
                                    },
                                )()
                            },
                        )()
                    ]
                },
            )()

            return {"response": response_obj, "streaming_chunks": streaming_chunks}

        except Exception as e:
            logger.error(f"Streaming completion failed: {e}")
            raise

    async def _handle_function_calls(
        self, tool_calls: List[Any], context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Handle function calls and execute tools"""

        results = []

        for tool_call in tool_calls:
            try:
                function_name = tool_call.function.name
                function_args = eval(
                    tool_call.function.arguments
                )  # Safe in controlled environment

                # Execute function using existing tool executor
                result = await execute_openai_function_call(
                    function_name, function_args, self.tools
                )

                # Broadcast function call via WebSocket
                if self.streaming_handler:
                    await self.streaming_handler.broadcast_function_call(
                        function_name, function_args, result
                    )

                results.append(
                    {
                        "function_name": function_name,
                        "arguments": function_args,
                        "result": result,
                    }
                )

            except Exception as e:
                logger.error(f"Function call execution failed: {e}")
                results.append(
                    {
                        "function_name": getattr(tool_call.function, "name", "unknown"),
                        "error": str(e),
                    }
                )

        return results

    def _format_function_results(self, function_results: List[Dict[str, Any]]) -> str:
        """Format function results into structured fraud analysis"""

        analysis_parts = ["# Fraud Investigation Analysis\n"]

        for result in function_results:
            if "error" in result:
                analysis_parts.append(
                    f"⚠️ Tool Error: {result['function_name']} - {result['error']}\n"
                )
            else:
                analysis_parts.append(f"## {result['function_name']} Results\n")
                if isinstance(result["result"], dict) and "result" in result["result"]:
                    analysis_parts.append(f"{result['result']['result']}\n")
                else:
                    analysis_parts.append(f"{result['result']}\n")

        return "\n".join(analysis_parts)

    def _estimate_api_cost(self, response: Any) -> float:
        """Estimate API cost in cents (simplified)"""
        try:
            if hasattr(response, "usage"):
                # Simplified cost calculation - adjust based on actual OpenAI pricing
                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens

                # GPT-4o pricing estimate (adjust as needed)
                input_cost = input_tokens * 0.005 / 1000  # $0.005 per 1k tokens
                output_cost = output_tokens * 0.015 / 1000  # $0.015 per 1k tokens

                return (input_cost + output_cost) * 100  # Convert to cents
        except:
            pass

        return 0.0
