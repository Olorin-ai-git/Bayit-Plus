"""
Tool Instrumentation

Wraps tool executions to capture inputs, outputs, execution time, and errors.
"""

import time
from typing import Any, Callable, Dict, Tuple


def _count_data_retrieved(result: Any) -> int:
    """Count items retrieved from tool result."""
    if isinstance(result, list):
        return len(result)
    if isinstance(result, dict):
        return sum(
            len(v) if isinstance(v, (list, dict)) else 1 for v in result.values()
        )
    return 0


def _prepare_tool_input(*args, **kwargs) -> Dict[str, Any]:
    """Prepare tool input for logging."""
    return {
        "args": str(args)[:500],
        "kwargs": {k: str(v)[:200] for k, v in kwargs.items()},
    }


class InstrumentedTool:
    """Wrapper for tool functions to capture execution details."""

    def __init__(
        self,
        tool_name: str,
        tool_func: Callable,
        instrumentation_logger,
        agent_name: str,
    ):
        self.tool_name = tool_name
        self.tool_func = tool_func
        self.logger = instrumentation_logger
        self.agent_name = agent_name
        self.execution_count = 0

    def __call__(self, *args, **kwargs) -> Any:
        """Execute tool with instrumentation."""
        self.execution_count += 1
        start_time = time.time()

        try:
            result = self.tool_func(*args, **kwargs)
            execution_time_ms = (time.time() - start_time) * 1000
            data_count = _count_data_retrieved(result)
            tool_input = _prepare_tool_input(*args, **kwargs)

            self.logger.log_tool_execution(
                agent_name=self.agent_name,
                tool_name=self.tool_name,
                tool_input=tool_input,
                tool_output={
                    "status": "success",
                    "execution_number": self.execution_count,
                    "execution_time_ms": execution_time_ms,
                },
                raw_output=str(result)[:1000],
                execution_time_ms=execution_time_ms,
                status="success",
                data_retrieved=data_count,
            )

            self.logger.log_event(
                event_type="tool_execution",
                agent_name=self.agent_name,
                description=f"Tool {self.tool_name} execution #{self.execution_count}",
                details={
                    "execution_time_ms": execution_time_ms,
                    "data_retrieved": data_count,
                    "result_type": type(result).__name__,
                },
            )

            return result

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            tool_input = _prepare_tool_input(*args, **kwargs)

            self.logger.log_tool_execution(
                agent_name=self.agent_name,
                tool_name=self.tool_name,
                tool_input=tool_input,
                tool_output={"status": "error", "error_type": type(e).__name__},
                execution_time_ms=execution_time_ms,
                status="error",
                error_message=str(e)[:500],
                data_retrieved=0,
            )

            self.logger.log_error(
                agent_name=self.agent_name,
                error_type="tool_execution_error",
                error_message=f"Tool {self.tool_name} failed: {str(e)}",
                context={
                    "tool_name": self.tool_name,
                    "execution_number": self.execution_count,
                    "execution_time_ms": execution_time_ms,
                },
            )

            raise

    async def __acall__(self, *args, **kwargs) -> Any:
        """Async execute tool with instrumentation."""
        self.execution_count += 1
        start_time = time.time()

        try:
            if hasattr(self.tool_func, "__call__") and hasattr(
                self.tool_func, "__await__"
            ):
                result = await self.tool_func(*args, **kwargs)
            else:
                result = self.tool_func(*args, **kwargs)

            execution_time_ms = (time.time() - start_time) * 1000
            data_count = _count_data_retrieved(result)
            tool_input = _prepare_tool_input(*args, **kwargs)

            self.logger.log_tool_execution(
                agent_name=self.agent_name,
                tool_name=self.tool_name,
                tool_input=tool_input,
                tool_output={
                    "status": "success",
                    "execution_number": self.execution_count,
                    "execution_time_ms": execution_time_ms,
                },
                raw_output=str(result)[:1000],
                execution_time_ms=execution_time_ms,
                status="success",
                data_retrieved=data_count,
            )

            return result

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            tool_input = _prepare_tool_input(*args, **kwargs)

            self.logger.log_tool_execution(
                agent_name=self.agent_name,
                tool_name=self.tool_name,
                tool_input=tool_input,
                tool_output={"status": "error", "error_type": type(e).__name__},
                execution_time_ms=execution_time_ms,
                status="error",
                error_message=str(e)[:500],
                data_retrieved=0,
            )

            raise
