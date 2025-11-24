"""
Graph Building Delegation for Different Graph Types

Handles construction of different graph implementations:
- Hybrid Intelligence Graph
- Clean Graph (original)
- Orchestrator-driven Graph
"""

<<<<<<< HEAD
=======
import os
import sys
>>>>>>> 001-modify-analyzer-method
from typing import Optional
from langgraph.graph import StateGraph

from app.service.logging import get_bridge_logger
from ..feature_flags.flag_manager import GraphType

# Import graph builders
from ...hybrid_graph_builder import HybridGraphBuilder
from app.service.agent.orchestration.clean_graph_builder import build_clean_investigation_graph
from app.service.agent.orchestration.orchestrator_graph import create_orchestrator_driven_graph

logger = get_bridge_logger(__name__)


class GraphBuilders:
    """
    Delegates graph construction to appropriate builders.
<<<<<<< HEAD
    
    Provides a unified interface for building different graph types
    while maintaining isolation between implementations.
    """
    
    def __init__(self):
        self.hybrid_builder = None  # Lazy initialization
    
    async def build_graph(self, graph_type: GraphType) -> StateGraph:
        """
        Build graph of specified type.
        
        Args:
            graph_type: Type of graph to build
            
        Returns:
            Compiled investigation graph
        """
        
        logger.debug(f"🔨 Building {graph_type.value} graph")
        
        if graph_type == GraphType.HYBRID:
            return await self.build_hybrid_graph()
        elif graph_type == GraphType.ORCHESTRATOR:
            return await self.build_orchestrator_graph()
        elif graph_type == GraphType.CLEAN:
            return await self.build_clean_graph()
        else:
            logger.error(f"❌ Unknown graph type: {graph_type}")
            # Fallback to clean graph
            return await self.build_clean_graph()
    
    async def build_hybrid_graph(self) -> StateGraph:
        """
        Build hybrid intelligence graph with enhanced capabilities.
        
        Returns:
            Compiled hybrid graph
        """
        
        logger.debug(f"🧠 Building hybrid intelligence graph")
        
        try:
            if self.hybrid_builder is None:
                self.hybrid_builder = HybridGraphBuilder(intelligence_mode="adaptive")
            
            graph = await self.hybrid_builder.build_hybrid_investigation_graph(
                use_enhanced_tools=True,
                enable_streaming=True
            )
            
            logger.debug(f"✅ Hybrid graph built successfully")
            return graph
            
        except Exception as e:
            logger.error(f"❌ Failed to build hybrid graph: {str(e)}")
            logger.warning(f"   Falling back to clean graph")
            return await self.build_clean_graph()
    
    async def build_clean_graph(self) -> StateGraph:
        """
        Build clean graph (original implementation).
        
        Returns:
            Compiled clean graph
        """
        
        logger.debug(f"📋 Building clean investigation graph")
        
=======

    Provides a unified interface for building different graph types
    while maintaining isolation between implementations.

    CRITICAL: Passes LLM to HybridGraphBuilder for intelligent routing in LIVE mode.
    """

    def __init__(self, llm=None):
        """
        Initialize graph builders with optional LLM.

        Args:
            llm: Language model instance for intelligent routing (LIVE mode)
                 If None, uses rule-based heuristics (DEMO mode)
        """
        self.llm = llm
        self.hybrid_builder = None  # Lazy initialization

    @staticmethod
    def _should_enable_streaming() -> bool:
        """
        Determine if LangGraph streaming should be enabled.

        Streaming is disabled in:
        - Test/demo environments (TEST_MODE set)
        - CI/CD environments (CI=true)
        - Non-interactive terminals (not a TTY)
        - When DISABLE_STREAMING is explicitly set

        Returns:
            True if streaming should be enabled, False otherwise
        """
        # Explicit disable flag
        if os.environ.get("DISABLE_STREAMING", "").lower() in ("true", "1", "yes"):
            logger.debug("🔇 Streaming disabled: DISABLE_STREAMING flag set")
            return False

        # Test/demo mode - disable streaming to avoid pipe issues
        if os.environ.get("TEST_MODE") in ("demo", "mock"):
            logger.debug("🔇 Streaming disabled: TEST_MODE is demo/mock")
            return False

        # CI/CD environment - disable streaming
        if os.environ.get("CI", "").lower() in ("true", "1", "yes"):
            logger.debug("🔇 Streaming disabled: CI environment detected")
            return False

        # Non-interactive terminal - disable streaming to avoid BrokenPipeError
        if not sys.stdout.isatty():
            logger.debug("🔇 Streaming disabled: stdout is not a TTY (non-interactive)")
            return False

        # Enable streaming for interactive sessions
        logger.debug("🔊 Streaming enabled: interactive terminal session")
        return True

    async def build_graph(self, graph_type: GraphType, investigation_id: Optional[str] = None) -> StateGraph:
        """
        Build graph of specified type.

        Args:
            graph_type: Type of graph to build
            investigation_id: Unique investigation identifier for tool persistence

        Returns:
            Compiled investigation graph
        """

        logger.debug(f"🔨 Building {graph_type.value} graph")

        if graph_type == GraphType.HYBRID:
            return await self.build_hybrid_graph(investigation_id)
        elif graph_type == GraphType.ORCHESTRATOR:
            return await self.build_orchestrator_graph(investigation_id)
        elif graph_type == GraphType.CLEAN:
            return await self.build_clean_graph(investigation_id)
        else:
            logger.error(f"❌ Unknown graph type: {graph_type}")
            # Fallback to clean graph
            return await self.build_clean_graph(investigation_id)

    async def build_hybrid_graph(self, investigation_id: Optional[str] = None) -> StateGraph:
        """
        Build hybrid intelligence graph with enhanced capabilities.

        Args:
            investigation_id: Unique investigation identifier for tool persistence

        Returns:
            Compiled hybrid graph
        """

        logger.debug(f"🧠 Building hybrid intelligence graph (investigation_id={investigation_id})")

        try:
            if self.hybrid_builder is None:
                # Initialize hybrid builder with LLM support
                self.hybrid_builder = HybridGraphBuilder(intelligence_mode="adaptive", llm=self.llm)

            # Determine if streaming should be enabled based on environment
            enable_streaming = self._should_enable_streaming()
            logger.info(f"🔧 Hybrid graph streaming: {'enabled' if enable_streaming else 'disabled'}")

            graph = await self.hybrid_builder.build_hybrid_investigation_graph(
                use_enhanced_tools=True,
                enable_streaming=enable_streaming,
                investigation_id=investigation_id
            )

            logger.debug(f"✅ Hybrid graph built successfully")
            return graph


        except Exception as e:
            logger.error(f"❌ Failed to build hybrid graph: {str(e)}")
            logger.warning(f"   Falling back to clean graph")
            return await self.build_clean_graph(investigation_id)

    async def build_clean_graph(self, investigation_id: Optional[str] = None) -> StateGraph:
        """
        Build clean graph (original implementation).

        Args:
            investigation_id: Unique investigation identifier (not used by clean graph)

        Returns:
            Compiled clean graph
        """

        logger.debug(f"📋 Building clean investigation graph")

>>>>>>> 001-modify-analyzer-method
        try:
            graph = build_clean_investigation_graph()
            logger.debug(f"✅ Clean graph built successfully")
            return graph
<<<<<<< HEAD
            
        except Exception as e:
            logger.error(f"❌ Failed to build clean graph: {str(e)}")
            raise RuntimeError(f"Critical failure: Cannot build clean graph: {str(e)}")
    
    async def build_orchestrator_graph(self) -> StateGraph:
        """
        Build orchestrator-driven graph.
        
        Returns:
            Compiled orchestrator graph
        """
        
        logger.debug(f"🎭 Building orchestrator-driven graph")
        
=======

        except Exception as e:
            logger.error(f"❌ Failed to build clean graph: {str(e)}")
            raise RuntimeError(f"Critical failure: Cannot build clean graph: {str(e)}")

    async def build_orchestrator_graph(self, investigation_id: Optional[str] = None) -> StateGraph:
        """
        Build orchestrator-driven graph.

        Args:
            investigation_id: Unique investigation identifier for tool persistence

        Returns:
            Compiled orchestrator graph
        """

        logger.debug(f"🎭 Building orchestrator-driven graph (investigation_id={investigation_id})")

>>>>>>> 001-modify-analyzer-method
        try:
            graph = await create_orchestrator_driven_graph(
                orchestration_mode="ai_driven",
                use_enhanced_tools=True
            )
<<<<<<< HEAD
            
            logger.debug(f"✅ Orchestrator graph built successfully")
            return graph
            
        except Exception as e:
            logger.error(f"❌ Failed to build orchestrator graph: {str(e)}")
            logger.warning(f"   Falling back to clean graph")
            return await self.build_clean_graph()
=======

            logger.debug(f"✅ Orchestrator graph built successfully")
            return graph

        except Exception as e:
            logger.error(f"❌ Failed to build orchestrator graph: {str(e)}")
            logger.warning(f"   Falling back to clean graph")
            return await self.build_clean_graph(investigation_id)
>>>>>>> 001-modify-analyzer-method
    
    def get_available_graph_types(self) -> list[GraphType]:
        """
        Get list of available graph types.
        
        Returns:
            List of supported graph types
        """
        
        return [GraphType.HYBRID, GraphType.ORCHESTRATOR, GraphType.CLEAN]
    
    def validate_graph_type(self, graph_type: GraphType) -> bool:
        """
        Validate if graph type is supported.
        
        Args:
            graph_type: Graph type to validate
            
        Returns:
            True if graph type is supported
        """
        
        return graph_type in self.get_available_graph_types()
    
    async def test_graph_build(self, graph_type: GraphType) -> bool:
        """
        Test if a graph type can be built successfully.
        
        Args:
            graph_type: Graph type to test
            
        Returns:
            True if graph builds successfully
        """
        
        try:
            graph = await self.build_graph(graph_type)
            logger.debug(f"✅ Graph test successful: {graph_type.value}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Graph test failed: {graph_type.value} - {str(e)}")
            return False