"""
Graph Foundation - Core graph setup and configuration for hybrid intelligence.

This module provides the foundational setup and initialization logic for
the hybrid intelligence investigation graph.
"""

import asyncio
import time
from datetime import datetime
from typing import Any, Dict, Optional

from langgraph.graph import END, START, StateGraph

from app.service.logging import get_bridge_logger

from ....confidence_consolidator import ConfidenceConsolidator
from ...advanced_safety_manager import AdvancedSafetyManager
from ...ai_confidence_engine import AIConfidenceEngine
from ...hybrid_state_schema import HybridInvestigationState
from ...intelligent_router import IntelligentRouter

logger = get_bridge_logger(__name__)


class GraphFoundation:
    """
    Core foundation for hybrid intelligence graph setup and configuration.

    Handles initialization of core components and graph setup.

    CRITICAL: Passes LLM to AIConfidenceEngine for intelligent routing in LIVE mode.
    """

    def __init__(self, intelligence_mode: str = "adaptive", llm=None):
        """
        Initialize graph foundation components.

        Args:
            intelligence_mode: Intelligence mode for the graph
            llm: Language model instance for intelligent routing (LIVE mode)
                 If None, uses rule-based heuristics (DEMO mode)
        """
        self.intelligence_mode = intelligence_mode
        self.confidence_engine = AIConfidenceEngine(llm=llm)
        self.safety_manager = AdvancedSafetyManager()
        self.confidence_consolidator = ConfidenceConsolidator()
        self.intelligent_router = IntelligentRouter(
            confidence_engine=self.confidence_engine, safety_manager=self.safety_manager
        )
        self.tool_execution_logger = None  # Will be initialized with investigation_id

    def create_base_graph(self) -> StateGraph:
        """
        Create the base StateGraph with hybrid investigation state.

        Returns:
            StateGraph configured for hybrid investigation
        """
        logger.info(f"🏗️ Creating hybrid intelligence graph foundation")
        logger.info(f"   Intelligence mode: {self.intelligence_mode}")

        return StateGraph(HybridInvestigationState)

    def log_graph_creation_start(
        self,
        use_enhanced_tools: bool = True,
        enable_streaming: bool = True,
        enable_interrupts: bool = False,
    ) -> None:
        """Log the start of graph creation with configuration."""
        logger.info(f"🏗️ Building hybrid intelligence graph")
        logger.info(f"   Intelligence mode: {self.intelligence_mode}")
        logger.info(f"   Enhanced tools: {use_enhanced_tools}")
        logger.info(f"   Streaming enabled: {enable_streaming}")

    def log_graph_creation_success(self, graph) -> None:
        """Log successful graph creation."""
        logger.info("✅ Hybrid intelligence graph compiled successfully")
        logger.info(f"   Nodes: {len(graph.nodes)}")
        logger.info(f"   Intelligence mode: {self.intelligence_mode}")

    def handle_graph_creation_error(self, error: Exception) -> Exception:
        """Handle and log graph creation errors."""
        logger.error(f"❌ Failed to build hybrid graph: {str(error)}")
        return Exception(f"Hybrid graph construction failed: {str(error)}")

    def compile_graph_with_configuration(
        self, builder: StateGraph, memory, enable_interrupts: bool = False
    ) -> StateGraph:
        """
        Compile the graph with standard configuration.

        Args:
            builder: The StateGraph builder
            memory: Memory system for persistence
            enable_interrupts: Whether to enable interrupts

        Returns:
            Compiled StateGraph
        """
        return builder.compile(
            checkpointer=memory,
            interrupt_before=["tools"] if enable_interrupts else [],
            debug=False,
        )

    def get_components(self) -> Dict[str, Any]:
        """
        Get initialized components for use by other builders.

        Returns:
            Dictionary of initialized components
        """
        return {
            "confidence_engine": self.confidence_engine,
            "safety_manager": self.safety_manager,
            "confidence_consolidator": self.confidence_consolidator,
            "intelligent_router": self.intelligent_router,
            "tool_execution_logger": self.tool_execution_logger,
            "intelligence_mode": self.intelligence_mode,
        }

    def initialize_tool_logger(self, investigation_id: str) -> None:
        """Initialize tool execution logger for investigation."""
        if investigation_id:
            from app.service.agent.orchestration.enhanced_tool_execution_logger import (
                get_tool_execution_logger,
            )

            self.tool_execution_logger = get_tool_execution_logger(investigation_id)
            logger.info(
                f"🔧 Enhanced Tool Execution Logger initialized for investigation: {investigation_id}"
            )
