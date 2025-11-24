"""
LLM Callback Handler for Instrumentation

LangChain callback handler for capturing LLM interactions.
"""

import time
from typing import Any, Dict, List
from langchain_core.callbacks import BaseCallbackHandler


class InstrumentationCallbackHandler(BaseCallbackHandler):
    """LangChain callback handler for instrumentation logging."""

    def __init__(self, instrumentation_logger, agent_name: str):
        self.logger = instrumentation_logger
        self.agent_name = agent_name
        self.current_call_data = {}

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        **kwargs: Any
    ) -> None:
        """Called at the start of LLM call"""
        self.current_call_data = {
            "start_time": time.time(),
            "model": serialized.get("_type", "unknown"),
            "prompts": prompts,
            "kwargs": kwargs
        }

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        """Called at the end of LLM call with response"""
        if not self.current_call_data:
            return

        try:
            latency_ms = (time.time() - self.current_call_data["start_time"]) * 1000

            # Extract response content
            response_text = ""
            if hasattr(response, "generations") and response.generations:
                generations = response.generations[0]
                if hasattr(generations, "text"):
                    response_text = generations.text
                elif hasattr(generations, "message"):
                    response_text = generations.message.content

            # Log the interaction
            self.logger.log_llm_interaction(
                agent_name=self.agent_name,
                llm_model=self.current_call_data.get("model", "unknown"),
                prompt="\n".join(self.current_call_data.get("prompts", [])),
                response=response_text,
                tokens_used=0,
                latency_ms=latency_ms,
                stop_reason=getattr(response, "stop_reason", None)
            )

            self.current_call_data = {}
        except Exception as e:
            self.logger.log_error(
                agent_name=self.agent_name,
                error_type="llm_instrumentation_error",
                error_message=str(e),
                context={"response_type": type(response).__name__}
            )
