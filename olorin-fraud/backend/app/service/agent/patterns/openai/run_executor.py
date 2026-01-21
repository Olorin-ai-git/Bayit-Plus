"""
OpenAI Run Executor

Coordinates OpenAI Assistant run execution, delegating to specialized handlers
for streaming, function calling, and message management.
"""

from typing import Any, Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.service.logging import get_bridge_logger

from .function_handler import FunctionHandler
from .streaming_handler import StreamingHandler

logger = get_bridge_logger(__name__)


class RunExecutor:
    """Executes OpenAI Assistant runs with function calling and streaming support"""

    def __init__(self, openai_client, tools: List[Any], ws_streaming=None):
        self.client = openai_client
        self.tools = tools
        self.streaming_handler = StreamingHandler(openai_client, ws_streaming)
        self.function_handler = FunctionHandler(tools, self.streaming_handler)

    async def add_messages_to_thread(
        self, thread_id: str, messages: List[BaseMessage]
    ) -> None:
        """Add messages to OpenAI thread"""

        for message in messages:
            try:
                # Convert LangChain message to OpenAI format
                role = "user"
                if isinstance(message, AIMessage):
                    role = "assistant"
                elif isinstance(message, SystemMessage):
                    # System messages are handled in assistant instructions
                    continue

                await self.client.beta.threads.messages.create(
                    thread_id=thread_id, role=role, content=str(message.content)
                )

            except Exception as e:
                logger.error(f"Failed to add message to thread: {e}")
                continue

    async def run_assistant_with_streaming(
        self,
        thread_id: str,
        assistant_id: str,
        investigation_id: str,
        enable_streaming: bool = False,
    ) -> Dict[str, Any]:
        """Run assistant with streaming support and function calling"""

        function_call_count = 0
        streaming_chunks = 0
        accumulated_content = ""

        try:
            # Create run with streaming configuration
            run = await self.client.beta.threads.runs.create(
                thread_id=thread_id, assistant_id=assistant_id, stream=enable_streaming
            )

            if enable_streaming:
                # Handle streaming responses
                accumulated_content, streaming_chunks = (
                    await self.streaming_handler.handle_streaming_run(
                        run, investigation_id
                    )
                )
            else:
                # Handle non-streaming run
                run = await self.streaming_handler.wait_for_completion(run, thread_id)

                # Handle function calls if any
                while run.status == "requires_action":
                    function_call_count += (
                        await self.function_handler.handle_function_calls(
                            run, thread_id, self.client
                        )
                    )
                    run = await self.client.beta.threads.runs.retrieve(
                        thread_id=thread_id, run_id=run.id
                    )

                # Get final messages
                accumulated_content = await self._get_final_content(thread_id)

            return {
                "success": True,
                "result": {
                    "content": accumulated_content,
                    "thread_id": thread_id,
                    "run_id": run.id,
                    "investigation_id": investigation_id,
                },
                "run_id": run.id,
                "function_calls": function_call_count,
                "streaming_chunks": streaming_chunks,
            }

        except Exception as e:
            logger.error(f"Assistant run failed: {e}")
            return {"success": False, "error": str(e)}

    async def _get_final_content(self, thread_id: str) -> str:
        """Get final message content from thread"""
        try:
            messages = await self.client.beta.threads.messages.list(
                thread_id=thread_id, limit=1
            )

            if messages.data:
                return messages.data[0].content[0].text.value
        except Exception as e:
            logger.error(f"Failed to get final content: {e}")

        return ""
