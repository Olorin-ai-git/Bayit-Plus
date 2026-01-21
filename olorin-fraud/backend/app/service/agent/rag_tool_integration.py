"""
RAG Tool Integration Module

Provides seamless integration between RAG-enhanced tools and structured agents.
Manages tool execution context injection and agent-level RAG orchestration.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Type

from app.service.logging import get_bridge_logger

from .autonomous_context import StructuredInvestigationContext
from .tools.enhanced_tool_base import EnhancedToolBase, ToolConfig
from .tools.rag_enhanced_tool_base import RAGEnhancedToolBase
from .tools.rag_tool_context import (
    ToolExecutionContext,
    ToolExecutionContextEnhancer,
    get_tool_context_enhancer,
)

logger = get_bridge_logger(__name__)


class AgentRAGToolOrchestrator:
    """
    Agent-level orchestrator for RAG-enhanced tool execution.

    Manages tool execution with RAG context injection at the agent level,
    providing seamless integration with existing structured agent workflows.
    """

    def __init__(
        self,
        context_enhancer: Optional[ToolExecutionContextEnhancer] = None,
        enable_rag_tools: bool = True,
        performance_monitoring: bool = True,
    ):
        """Initialize agent RAG tool orchestrator"""

        self.enable_rag_tools = enable_rag_tools
        self.performance_monitoring = performance_monitoring

        # Initialize context enhancer
        try:
            self.context_enhancer = context_enhancer or get_tool_context_enhancer()
            self.rag_available = self.context_enhancer.rag_available
        except Exception as e:
            logger.warning(f"RAG context enhancer initialization failed: {str(e)}")
            self.context_enhancer = None
            self.rag_available = False
            self.enable_rag_tools = False

        # Agent-level RAG statistics
        self.agent_rag_stats = {
            "agent_id": None,
            "investigation_id": None,
            "tools_executed": 0,
            "rag_enhanced_tools": 0,
            "standard_tools": 0,
            "total_rag_overhead_ms": 0.0,
            "total_knowledge_chunks_used": 0,
            "avg_performance_per_tool": {},
        }

    async def execute_tool_with_rag_context(
        self,
        tool: EnhancedToolBase,
        input_data: Dict[str, Any],
        agent_context: Dict[str, Any],
        investigation_context: Optional[StructuredInvestigationContext] = None,
    ) -> Any:
        """
        Execute tool with RAG context enhancement at agent level.

        Args:
            tool: Tool instance to execute
            input_data: Tool input parameters
            agent_context: Agent execution context
            investigation_context: Optional investigation context

        Returns:
            Tool execution result with RAG enhancement if available
        """

        execution_start = time.time()
        tool_name = (
            tool.config.name if hasattr(tool, "config") else str(type(tool).__name__)
        )

        # Check if tool supports RAG enhancement
        if (
            isinstance(tool, RAGEnhancedToolBase)
            and self.enable_rag_tools
            and self.rag_available
        ):
            # RAG-enhanced tool execution
            result = await self._execute_rag_enhanced_tool(
                tool, input_data, agent_context, investigation_context
            )
            self.agent_rag_stats["rag_enhanced_tools"] += 1

        else:
            # Standard tool execution with context injection
            result = await self._execute_standard_tool_with_context(
                tool, input_data, agent_context, investigation_context
            )
            self.agent_rag_stats["standard_tools"] += 1

        # Update execution statistics
        execution_time = (time.time() - execution_start) * 1000
        self._update_tool_execution_stats(tool_name, execution_time, result)

        return result

    async def _execute_rag_enhanced_tool(
        self,
        tool: RAGEnhancedToolBase,
        input_data: Dict[str, Any],
        agent_context: Dict[str, Any],
        investigation_context: Optional[StructuredInvestigationContext],
    ) -> Any:
        """Execute RAG-enhanced tool with full context"""

        logger.info(f"Executing RAG-enhanced tool: {tool.config.name}")

        # Prepare enhanced context
        enhanced_context = agent_context.copy()
        enhanced_context.update(
            {
                "investigation_context": investigation_context,
                "domain": agent_context.get("domain"),
                "agent_id": agent_context.get("agent_id"),
                "rag_orchestrated": True,
            }
        )

        # Execute tool with enhanced context
        result = await tool.execute(input_data, enhanced_context)

        # Track RAG-specific metrics
        if hasattr(result, "metadata") and result.metadata.get("rag_enhanced"):
            self.agent_rag_stats["total_rag_overhead_ms"] += result.metadata.get(
                "rag_overhead_ms", 0
            )
            self.agent_rag_stats["total_knowledge_chunks_used"] += result.metadata.get(
                "knowledge_chunks_used", 0
            )

        return result

    async def _execute_standard_tool_with_context(
        self,
        tool: EnhancedToolBase,
        input_data: Dict[str, Any],
        agent_context: Dict[str, Any],
        investigation_context: Optional[StructuredInvestigationContext],
    ) -> Any:
        """Execute standard tool with optional context injection"""

        # For standard tools, we can still provide context enhancement
        if self.enable_rag_tools and self.rag_available and investigation_context:
            enhanced_context = await self._inject_context_for_standard_tool(
                tool, input_data, agent_context, investigation_context
            )
        else:
            enhanced_context = agent_context

        return await tool.execute(input_data, enhanced_context)

    async def _inject_context_for_standard_tool(
        self,
        tool: EnhancedToolBase,
        input_data: Dict[str, Any],
        agent_context: Dict[str, Any],
        investigation_context: StructuredInvestigationContext,
    ) -> Dict[str, Any]:
        """Inject RAG context for standard tools"""

        try:
            # Get tool execution context with RAG enhancement
            tool_context = await self.context_enhancer.enhance_tool_execution_context(
                tool_name=(
                    tool.config.name
                    if hasattr(tool, "config")
                    else str(type(tool).__name__)
                ),
                input_parameters=input_data,
                investigation_context=investigation_context,
                domain=agent_context.get("domain"),
            )

            # Create enhanced context dictionary
            enhanced_context = agent_context.copy()
            enhanced_context.update(
                {
                    "rag_tool_context": tool_context,
                    "enhanced_parameters": tool_context.enhanced_parameters,
                    "knowledge_context": tool_context.knowledge_context,
                    "rag_context_injected": True,
                }
            )

            return enhanced_context

        except Exception as e:
            logger.warning(f"Context injection failed for standard tool: {str(e)}")
            return agent_context

    def _update_tool_execution_stats(
        self, tool_name: str, execution_time_ms: float, result: Any
    ) -> None:
        """Update tool execution statistics"""

        self.agent_rag_stats["tools_executed"] += 1

        # Update per-tool performance tracking
        if tool_name not in self.agent_rag_stats["avg_performance_per_tool"]:
            self.agent_rag_stats["avg_performance_per_tool"][tool_name] = {
                "executions": 0,
                "total_time_ms": 0.0,
                "avg_time_ms": 0.0,
                "success_count": 0,
            }

        tool_stats = self.agent_rag_stats["avg_performance_per_tool"][tool_name]
        tool_stats["executions"] += 1
        tool_stats["total_time_ms"] += execution_time_ms
        tool_stats["avg_time_ms"] = (
            tool_stats["total_time_ms"] / tool_stats["executions"]
        )

        # Track success if result has success attribute
        if hasattr(result, "success") and result.success:
            tool_stats["success_count"] += 1

    def set_investigation_context(self, investigation_id: str, agent_id: str) -> None:
        """Set investigation context for statistics tracking"""
        self.agent_rag_stats["investigation_id"] = investigation_id
        self.agent_rag_stats["agent_id"] = agent_id

    def get_agent_rag_performance(self) -> Dict[str, Any]:
        """Get agent-level RAG performance metrics"""

        total_tools = self.agent_rag_stats["tools_executed"]
        rag_tools = self.agent_rag_stats["rag_enhanced_tools"]

        rag_usage_rate = rag_tools / max(1, total_tools)
        avg_rag_overhead = 0.0
        avg_chunks_per_tool = 0.0

        if rag_tools > 0:
            avg_rag_overhead = self.agent_rag_stats["total_rag_overhead_ms"] / rag_tools
            avg_chunks_per_tool = (
                self.agent_rag_stats["total_knowledge_chunks_used"] / rag_tools
            )

        return {
            "investigation_id": self.agent_rag_stats["investigation_id"],
            "agent_id": self.agent_rag_stats["agent_id"],
            "execution_summary": {
                "total_tools_executed": total_tools,
                "rag_enhanced_tools": rag_tools,
                "standard_tools": self.agent_rag_stats["standard_tools"],
                "rag_usage_rate": rag_usage_rate,
            },
            "rag_performance": {
                "avg_rag_overhead_ms": avg_rag_overhead,
                "avg_knowledge_chunks_per_tool": avg_chunks_per_tool,
                "total_knowledge_chunks": self.agent_rag_stats[
                    "total_knowledge_chunks_used"
                ],
                "performance_target_met": avg_rag_overhead < 50.0,
            },
            "per_tool_performance": self.agent_rag_stats["avg_performance_per_tool"],
            "system_status": {
                "rag_available": self.rag_available,
                "rag_enabled": self.enable_rag_tools,
                "performance_monitoring": self.performance_monitoring,
            },
        }


class RAGToolFactory:
    """
    Factory for creating RAG-enhanced versions of existing tools.

    Provides utilities to convert standard tools to RAG-enhanced tools
    and manage tool registration with RAG capabilities.
    """

    @staticmethod
    def create_rag_enhanced_tool(
        base_tool_class: Type[EnhancedToolBase],
        config: ToolConfig,
        enable_rag: bool = True,
    ) -> RAGEnhancedToolBase:
        """
        Create RAG-enhanced version of a tool class.

        Args:
            base_tool_class: Base tool class to enhance
            config: Tool configuration
            enable_rag: Whether to enable RAG capabilities

        Returns:
            RAG-enhanced tool instance
        """

        # Create a dynamic RAG-enhanced class
        class DynamicRAGEnhancedTool(RAGEnhancedToolBase):
            """Dynamically created RAG-enhanced tool"""

            def __init__(self, tool_config: ToolConfig, rag_enabled: bool = True):
                super().__init__(tool_config, rag_enabled)

                # Create instance of base tool for delegation
                self.base_tool = base_tool_class(tool_config)

            async def _execute_impl(
                self,
                input_data: Dict[str, Any],
                context: Optional[Dict[str, Any]] = None,
            ) -> Any:
                """Delegate to base tool implementation"""
                return await self.base_tool._execute_impl(input_data, context)

        return DynamicRAGEnhancedTool(config, enable_rag)

    @staticmethod
    def wrap_existing_tool_with_rag(
        tool_instance: EnhancedToolBase, enable_rag: bool = True
    ) -> RAGEnhancedToolBase:
        """
        Wrap existing tool instance with RAG capabilities.

        Args:
            tool_instance: Existing tool instance
            enable_rag: Whether to enable RAG capabilities

        Returns:
            RAG-enhanced wrapper around existing tool
        """

        class ToolWrapper(RAGEnhancedToolBase):
            """Wrapper for existing tool with RAG enhancement"""

            def __init__(
                self, wrapped_tool: EnhancedToolBase, rag_enabled: bool = True
            ):
                super().__init__(wrapped_tool.config, rag_enabled)
                self.wrapped_tool = wrapped_tool

            async def _execute_impl(
                self,
                input_data: Dict[str, Any],
                context: Optional[Dict[str, Any]] = None,
            ) -> Any:
                """Delegate to wrapped tool"""
                return await self.wrapped_tool._execute_impl(input_data, context)

        return ToolWrapper(tool_instance, enable_rag)


# Global orchestrator instance
_agent_rag_orchestrator: Optional[AgentRAGToolOrchestrator] = None


def get_agent_rag_orchestrator() -> AgentRAGToolOrchestrator:
    """Get global agent RAG tool orchestrator instance"""
    global _agent_rag_orchestrator

    if _agent_rag_orchestrator is None:
        _agent_rag_orchestrator = AgentRAGToolOrchestrator()

    return _agent_rag_orchestrator


def enable_rag_for_agent_tools(
    agent_domain: str, investigation_id: str, agent_id: Optional[str] = None
) -> AgentRAGToolOrchestrator:
    """
    Enable RAG capabilities for agent tools in a specific investigation.

    Args:
        agent_domain: Domain of the agent (network, device, location, logs, risk)
        investigation_id: Investigation identifier
        agent_id: Optional agent identifier

    Returns:
        Configured agent RAG orchestrator
    """
    orchestrator = get_agent_rag_orchestrator()
    orchestrator.set_investigation_context(
        investigation_id, agent_id or f"{agent_domain}_agent"
    )

    logger.info(
        f"RAG capabilities enabled for {agent_domain} agent in investigation {investigation_id}"
    )

    return orchestrator
