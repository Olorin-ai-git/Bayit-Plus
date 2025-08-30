"""
OpenAI Streaming Handler

Handles streaming responses and WebSocket integration for OpenAI Assistant patterns
in fraud investigation workflows.
"""

import asyncio
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


class StreamingHandler:
    """Handles OpenAI Assistant streaming responses with WebSocket integration"""
    
    def __init__(self, openai_client, ws_streaming=None):
        self.client = openai_client
        self.ws_streaming = ws_streaming
    
    async def handle_streaming_run(self, run, investigation_id: str) -> tuple[str, int]:
        """Handle streaming assistant responses with WebSocket integration"""
        
        accumulated_content = ""
        streaming_chunks = 0
        
        try:
            # Stream the run (OpenAI SDK will handle streaming internally)
            async for event in self.client.beta.threads.runs.stream(
                thread_id=run.thread_id,
                assistant_id=getattr(run, 'assistant_id', 'unknown')
            ):
                streaming_chunks += 1
                
                # Handle different event types
                if event.event == "thread.message.delta":
                    # Extract content delta
                    chunk_content = self._extract_content_delta(event.data)
                    if chunk_content:
                        accumulated_content += chunk_content
                        
                        # Stream to WebSocket if available
                        if self.ws_streaming:
                            await self._broadcast_chunk(investigation_id, chunk_content)
                
                elif event.event == "thread.run.requires_action":
                    logger.info("Function calls required during streaming")
                
                elif event.event == "thread.run.completed":
                    logger.info("Streaming run completed successfully")
                    break
                
                elif event.event == "thread.run.failed":
                    error_msg = getattr(event.data, 'last_error', 'Unknown error')
                    logger.error(f"Streaming run failed: {error_msg}")
                    break
            
            return accumulated_content, streaming_chunks
            
        except Exception as e:
            logger.error(f"Streaming run handling failed: {e}")
            return accumulated_content, streaming_chunks
    
    def _extract_content_delta(self, event_data) -> str:
        """Extract content delta from streaming event"""
        try:
            if hasattr(event_data, 'delta') and hasattr(event_data.delta, 'content'):
                for content_piece in event_data.delta.content:
                    if hasattr(content_piece, 'text') and hasattr(content_piece.text, 'value'):
                        return content_piece.text.value
        except Exception as e:
            logger.warning(f"Failed to extract content delta: {e}")
        
        return ""
    
    async def _broadcast_chunk(self, investigation_id: str, chunk_content: str) -> None:
        """Broadcast streaming chunk via WebSocket"""
        try:
            if hasattr(self.ws_streaming, 'broadcast_investigation_update'):
                await self.ws_streaming.broadcast_investigation_update(
                    investigation_id=investigation_id,
                    update_type="assistant_stream",
                    data={"content": chunk_content, "type": "content_delta"}
                )
        except Exception as e:
            logger.warning(f"Failed to broadcast chunk: {e}")
    
    async def broadcast_function_call(
        self, 
        function_name: str, 
        function_args: Dict[str, Any], 
        result: Any
    ) -> None:
        """Broadcast function call progress via WebSocket"""
        try:
            if hasattr(self.ws_streaming, 'broadcast_investigation_update'):
                await self.ws_streaming.broadcast_investigation_update(
                    investigation_id="current",
                    update_type="function_call",
                    data={
                        "function_name": function_name,
                        "arguments": function_args,
                        "result_preview": str(result)[:200] + "..." if len(str(result)) > 200 else str(result)
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to broadcast function call: {e}")
    
    async def wait_for_completion(self, run, thread_id: str, timeout: int = 300):
        """Wait for run completion with timeout"""
        
        start_time = asyncio.get_event_loop().time()
        
        while run.status in ["queued", "in_progress"]:
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError(f"Assistant run timed out after {timeout} seconds")
            
            await asyncio.sleep(1)
            run = await self.client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run.id
            )
        
        return run