"""
RecursionGuard System

Prevents infinite recursion in LangGraph agent execution while enabling
structured tool selection and LLM-driven decision making.
"""

import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional, Set

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class ExecutionContext:
    """Track execution context for a single investigation thread"""

    investigation_id: str
    thread_id: str
    start_time: float = field(default_factory=time.time)
    node_stack: List[str] = field(default_factory=list)
    tool_calls: List[str] = field(default_factory=list)
    max_depth: int = 10
    max_tool_calls: int = 20
    max_duration_seconds: int = 300
    current_depth: int = 0

    def can_enter_node(self, node_name: str) -> bool:
        """Check if we can safely enter a node"""
        # Check depth limit
        if self.current_depth >= self.max_depth:
            logger.warning(
                f"Max depth {self.max_depth} reached for investigation {self.investigation_id}"
            )
            return False

        # Check duration limit
        if time.time() - self.start_time > self.max_duration_seconds:
            logger.warning(
                f"Max duration {self.max_duration_seconds}s exceeded for investigation {self.investigation_id}"
            )
            return False

        # Check for immediate loops (same node consecutively)
        if (
            len(self.node_stack) >= 2
            and self.node_stack[-1] == node_name
            and self.node_stack[-2] == node_name
        ):
            logger.warning(
                f"Immediate loop detected for node {node_name} in investigation {self.investigation_id}"
            )
            return False

        return True

    def can_call_tool(self, tool_name: str) -> bool:
        """Check if we can safely call a tool"""
        # Check tool call limit
        if len(self.tool_calls) >= self.max_tool_calls:
            logger.warning(
                f"Max tool calls {self.max_tool_calls} reached for investigation {self.investigation_id}"
            )
            return False

        # Check for excessive same-tool calls
        same_tool_calls = [call for call in self.tool_calls if call == tool_name]
        if len(same_tool_calls) >= 5:
            logger.warning(
                f"Too many calls to {tool_name} in investigation {self.investigation_id}"
            )
            return False

        return True

    def enter_node(self, node_name: str) -> None:
        """Record entering a node"""
        self.node_stack.append(node_name)
        self.current_depth = len(self.node_stack)
        logger.debug(
            f"Entered node {node_name}, depth: {self.current_depth}, investigation: {self.investigation_id}"
        )

    def exit_node(self, node_name: str) -> None:
        """Record exiting a node"""
        if self.node_stack and self.node_stack[-1] == node_name:
            self.node_stack.pop()
            self.current_depth = len(self.node_stack)
            logger.debug(
                f"Exited node {node_name}, depth: {self.current_depth}, investigation: {self.investigation_id}"
            )
        else:
            logger.warning(
                f"Node stack mismatch: expected {node_name}, got {self.node_stack[-1] if self.node_stack else 'empty'}"
            )

    def record_tool_call(self, tool_name: str) -> None:
        """Record a tool call"""
        self.tool_calls.append(tool_name)
        logger.debug(
            f"Tool call {tool_name}, total: {len(self.tool_calls)}, investigation: {self.investigation_id}"
        )

    def get_execution_summary(self) -> Dict[str, any]:
        """Get summary of execution metrics"""
        return {
            "investigation_id": self.investigation_id,
            "thread_id": self.thread_id,
            "duration_seconds": time.time() - self.start_time,
            "current_depth": self.current_depth,
            "max_depth_reached": (
                max(len(self.node_stack), self.current_depth) if self.node_stack else 0
            ),
            "total_tool_calls": len(self.tool_calls),
            "unique_tools_used": len(set(self.tool_calls)),
            "node_path": self.node_stack.copy(),
            "tool_sequence": self.tool_calls.copy(),
        }


class RecursionGuard:
    """
    Thread-safe recursion guard for LangGraph agent execution.

    Prevents infinite loops while allowing controlled structured behavior.
    """

    def __init__(self):
        self._contexts: Dict[str, ExecutionContext] = {}
        self._lock = Lock()
        self._global_investigation_count = 0
        self._max_concurrent_investigations = 10

    def create_context(
        self,
        investigation_id: str,
        thread_id: str,
        max_depth: int = 10,
        max_tool_calls: int = 20,
        max_duration_seconds: int = 300,
    ) -> ExecutionContext:
        """Create a new execution context for an investigation"""

        with self._lock:
            # Check concurrent investigation limit
            if len(self._contexts) >= self._max_concurrent_investigations:
                logger.error(
                    f"Max concurrent investigations {self._max_concurrent_investigations} reached"
                )
                raise RuntimeError("Too many concurrent investigations")

            context_key = f"{investigation_id}_{thread_id}"

            if context_key in self._contexts:
                logger.warning(
                    f"Context already exists for {context_key}, returning existing"
                )
                return self._contexts[context_key]

            context = ExecutionContext(
                investigation_id=investigation_id,
                thread_id=thread_id,
                max_depth=max_depth,
                max_tool_calls=max_tool_calls,
                max_duration_seconds=max_duration_seconds,
            )

            self._contexts[context_key] = context
            self._global_investigation_count += 1

            logger.info(
                f"Created execution context for investigation {investigation_id}, thread {thread_id}"
            )
            return context

    def get_context(
        self, investigation_id: str, thread_id: str
    ) -> Optional[ExecutionContext]:
        """Get existing execution context"""
        context_key = f"{investigation_id}_{thread_id}"
        with self._lock:
            return self._contexts.get(context_key)

    def remove_context(self, investigation_id: str, thread_id: str) -> None:
        """Remove execution context when investigation completes"""
        context_key = f"{investigation_id}_{thread_id}"
        with self._lock:
            if context_key in self._contexts:
                context = self._contexts.pop(context_key)
                logger.info(
                    f"Removed context for investigation {investigation_id}, "
                    f"final stats: {context.get_execution_summary()}"
                )
            else:
                logger.warning(f"Context {context_key} not found for removal")

    def can_enter_node(
        self, investigation_id: str, thread_id: str, node_name: str
    ) -> bool:
        """Check if a node can be safely entered"""
        logger.error(
            f"🔍 can_enter_node: looking for investigation_id='{investigation_id}', thread_id='{thread_id}', node='{node_name}'"
        )
        context = self.get_context(investigation_id, thread_id)
        if not context:
            logger.error(
                f"No context found for investigation {investigation_id}, thread {thread_id}"
            )
            logger.error(f"🔍 Available contexts: {list(self._contexts.keys())}")

            # AUTO-CREATE CONTEXT FOR UUID-BASED INVESTIGATION IDS
            # This handles the case where start_investigation generates a UUID that overwrites our original investigation_id
            if (
                len(investigation_id) == 36 and "-" in investigation_id
            ):  # UUID format detection
                logger.error(
                    f"🔧 AUTO-CREATING context for UUID-based investigation_id: {investigation_id}"
                )
                context = self.create_context(
                    investigation_id=investigation_id,
                    thread_id=thread_id,
                    max_depth=15,
                    max_tool_calls=50,
                    max_duration_seconds=600,
                )
                logger.error(
                    f"🔧 AUTO-CREATED RecursionGuard context for UUID investigation {investigation_id}"
                )
            else:
                return False

        return context.can_enter_node(node_name)

    def can_call_tool(
        self, investigation_id: str, thread_id: str, tool_name: str
    ) -> bool:
        """Check if a tool can be safely called"""
        context = self.get_context(investigation_id, thread_id)
        if not context:
            logger.error(
                f"No context found for investigation {investigation_id}, thread {thread_id}"
            )
            return False

        return context.can_call_tool(tool_name)

    def enter_node(self, investigation_id: str, thread_id: str, node_name: str) -> bool:
        """Record entering a node, return False if not allowed"""
        context = self.get_context(investigation_id, thread_id)
        if not context:
            return False

        if not context.can_enter_node(node_name):
            return False

        context.enter_node(node_name)
        return True

    def exit_node(self, investigation_id: str, thread_id: str, node_name: str) -> None:
        """Record exiting a node"""
        context = self.get_context(investigation_id, thread_id)
        if context:
            context.exit_node(node_name)

    def record_tool_call(
        self, investigation_id: str, thread_id: str, tool_name: str
    ) -> bool:
        """Record a tool call, return False if not allowed"""
        context = self.get_context(investigation_id, thread_id)
        if not context:
            return False

        if not context.can_call_tool(tool_name):
            return False

        context.record_tool_call(tool_name)
        return True

    def get_all_contexts(self) -> Dict[str, ExecutionContext]:
        """Get all active execution contexts (for monitoring)"""
        with self._lock:
            return self._contexts.copy()

    def get_system_stats(self) -> Dict[str, any]:
        """Get system-wide statistics"""
        with self._lock:
            active_contexts = len(self._contexts)
            total_investigations = self._global_investigation_count

            # Aggregate statistics
            total_depth = sum(ctx.current_depth for ctx in self._contexts.values())
            total_tool_calls = sum(
                len(ctx.tool_calls) for ctx in self._contexts.values()
            )

            return {
                "active_investigations": active_contexts,
                "total_investigations_processed": total_investigations,
                "average_depth": (
                    total_depth / active_contexts if active_contexts > 0 else 0
                ),
                "total_active_tool_calls": total_tool_calls,
                "max_concurrent_limit": self._max_concurrent_investigations,
            }

    def cleanup_stale_contexts(self, max_age_seconds: int = 3600) -> int:
        """Remove contexts that are too old"""
        current_time = time.time()
        removed_count = 0

        with self._lock:
            stale_keys = [
                key
                for key, ctx in self._contexts.items()
                if current_time - ctx.start_time > max_age_seconds
            ]

            for key in stale_keys:
                context = self._contexts.pop(key)
                logger.warning(
                    f"Removed stale context {key}, age: {current_time - context.start_time}s"
                )
                removed_count += 1

        return removed_count


# Global recursion guard instance
_recursion_guard: Optional[RecursionGuard] = None


def get_recursion_guard() -> RecursionGuard:
    """Get the global recursion guard instance"""
    global _recursion_guard

    if _recursion_guard is None:
        _recursion_guard = RecursionGuard()
        logger.info("Initialized global RecursionGuard")

    return _recursion_guard


# Decorator for protecting nodes
def protect_node(node_name: str):
    """Decorator to protect a node function from recursion"""

    def decorator(func):
        async def wrapper(state, config):
            guard = get_recursion_guard()

            # Extract investigation info from config
            agent_context = config.get("configurable", {}).get("agent_context")
            investigation_id = "unknown"
            thread_id = config.get("configurable", {}).get("thread_id", "unknown")

            if hasattr(agent_context, "metadata") and agent_context.metadata:
                md = agent_context.metadata.additional_metadata or {}
                investigation_id = md.get("investigationId") or md.get(
                    "investigation_id", "unknown"
                )
                logger.error(
                    f"🔍 RecursionGuard extracted: investigation_id='{investigation_id}', thread_id='{thread_id}', md={md}"
                )
            else:
                logger.error(
                    f"🔍 RecursionGuard no metadata: agent_context={agent_context}, thread_id='{thread_id}'"
                )

            # Check if we can enter this node
            if not guard.enter_node(investigation_id, thread_id, node_name):
                logger.error(f"Node {node_name} blocked by recursion guard")
                return {
                    "messages": [
                        {
                            "role": "assistant",
                            "content": f"Investigation terminated: recursion limit reached for {node_name}",
                        }
                    ]
                }

            try:
                # Execute the original function
                result = await func(state, config)
                return result
            finally:
                # Always exit node, even on exception
                guard.exit_node(investigation_id, thread_id, node_name)

        return wrapper

    return decorator


# Decorator for protecting tool calls
def protect_tool_call(tool_name: str):
    """Decorator to protect a tool call from excessive usage"""

    def decorator(func):
        async def wrapper(*args, **kwargs):
            guard = get_recursion_guard()

            # Try to extract context from various possible locations
            investigation_id = kwargs.get("investigation_id", "unknown")
            thread_id = kwargs.get("thread_id", "unknown")

            # Check if we can call this tool
            if not guard.record_tool_call(investigation_id, thread_id, tool_name):
                logger.error(f"Tool {tool_name} blocked by recursion guard")
                raise RuntimeError(f"Tool call limit reached for {tool_name}")

            # Execute the original function
            return await func(*args, **kwargs)

        return wrapper

    return decorator
