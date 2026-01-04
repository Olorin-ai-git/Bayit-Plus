"""
Agent Instrumentation Integration

Provides integration between the instrumentation framework and actual agent execution.
Wraps agent calls to capture LLM interactions, tool executions, and risk calculations.
"""

import time
from typing import Any, Dict, Optional, Tuple

from app.service.logging.agent_instrumentation_helper import (
    create_agent_instrumentor,
)


async def instrumented_agent_execution(
    agent_name: str,
    investigation_id: str,
    entity_id: str,
    agent_callable,
    agent_args: Dict[str, Any],
) -> Tuple[str, Any]:
    """
    Execute an agent with full instrumentation.

    Logs all LLM interactions, decisions, and results.

    Args:
        agent_name: Name of the agent executing
        investigation_id: ID of the investigation
        entity_id: ID of the entity being analyzed
        agent_callable: The agent function/method to call
        agent_args: Arguments to pass to the agent

    Returns:
        Tuple of (result_string, raw_result)
    """
    instrumentor = create_agent_instrumentor(agent_name, investigation_id)

    try:
        instrumentor.log_agent_starting(context={"entity_id": entity_id})

        start_time = time.time()
        result = await agent_callable(**agent_args)
        execution_time_ms = (time.time() - start_time) * 1000

        if isinstance(result, tuple):
            result_str, raw_result = result
        else:
            result_str = str(result)
            raw_result = result

        instrumentor.log_agent_result(
            entity_id=entity_id,
            final_risk_score=0.0,
            findings=[{"result": result_str}],
            recommendations=[],
            confidence=0.5,
            tools_used=[],
            execution_time_ms=execution_time_ms,
        )

        return result_str, raw_result

    except Exception as e:
        instrumentor.log_error(
            error_type="agent_execution_error",
            error_message=str(e),
            context={"entity_id": entity_id, "agent_name": agent_name},
        )
        raise

    finally:
        instrumentor.finalize_investigation()


def get_investigation_log_paths(investigation_id: str) -> Dict[str, str]:
    """
    Get the log file paths for a completed investigation.

    Args:
        investigation_id: ID of the investigation

    Returns:
        Dictionary with 'text_log' and 'json_log' file paths
    """
    instrumentor = create_agent_instrumentor("system", investigation_id)
    return instrumentor.get_log_files()
