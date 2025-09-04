"""
OpenAI Function Call Handler

Handles OpenAI function call execution using existing LangGraph tools
for fraud investigation workflows.
"""

import json
from typing import Any, Dict, List

from .tool_adapter import execute_openai_function_call
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class FunctionHandler:
    """Handles OpenAI function calls during assistant execution"""
    
    def __init__(self, tools: List[Any], streaming_handler=None):
        self.tools = tools
        self.streaming_handler = streaming_handler
    
    async def handle_function_calls(self, run, thread_id: str, client) -> int:
        """Handle function calls during assistant execution"""
        
        if not hasattr(run, 'required_action') or not run.required_action:
            return 0
        
        tool_calls = run.required_action.submit_tool_outputs.tool_calls
        tool_outputs = []
        function_calls_made = 0
        
        for tool_call in tool_calls:
            try:
                # Execute the function call using our tool adapter
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                logger.info(f"Executing function call: {function_name} with args: {list(function_args.keys())}")
                
                # Execute the function using existing tools
                result = await execute_openai_function_call(
                    function_name, 
                    function_args, 
                    self.tools
                )
                
                tool_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": json.dumps(result) if isinstance(result, dict) else str(result)
                })
                
                function_calls_made += 1
                
                # Broadcast function call progress if streaming handler available
                if self.streaming_handler:
                    await self.streaming_handler.broadcast_function_call(
                        function_name, 
                        function_args, 
                        result
                    )
                
            except Exception as e:
                logger.error(f"Function call {tool_call.function.name} failed: {e}")
                tool_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": f"Error executing function: {str(e)}"
                })
        
        # Submit tool outputs to continue the run
        if tool_outputs:
            await client.beta.threads.runs.submit_tool_outputs(
                thread_id=thread_id,
                run_id=run.id,
                tool_outputs=tool_outputs
            )
        
        return function_calls_made