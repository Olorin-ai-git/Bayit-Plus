"""Extended tool registry with new categories and enhanced capabilities."""

import logging
import asyncio
import time
from typing import Dict, List, Optional, Any, Set, Type, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

from langchain_core.tools import BaseTool

from .tool_registry import ToolRegistry, tool_registry

logger = logging.getLogger(__name__)


class ExtendedToolCategory(Enum):
    """Extended tool categories for new MCP capabilities."""
    BLOCKCHAIN = "blockchain"
    INTELLIGENCE = "intelligence"
    ML_AI = "ml_ai"
    COMMUNICATION = "communication"
    COMPLIANCE = "compliance"


@dataclass
class ToolMetadata:
    """Enhanced metadata for tools."""
    category: str
    subcategory: Optional[str] = None
    dependencies: Set[str] = field(default_factory=set)
    api_requirements: Set[str] = field(default_factory=set)
    performance_tier: str = "standard"  # fast, standard, slow
    security_level: str = "medium"  # low, medium, high, critical
    compliance_flags: Set[str] = field(default_factory=set)
    rate_limit: Optional[int] = None
    cost_tier: str = "free"  # free, low, medium, high
    
    # Performance metrics
    avg_execution_time: float = 0.0
    success_rate: float = 1.0
    last_used: float = field(default_factory=time.time)
    usage_count: int = 0


@dataclass
class ToolDependency:
    """Tool dependency specification."""
    tool_name: str
    required: bool = True
    fallback_tools: List[str] = field(default_factory=list)
    validation_function: Optional[Callable] = None


class ExtendedToolRegistry(ToolRegistry):
    """Extended tool registry with enhanced capabilities and new categories."""

    def __init__(self):
        """Initialize the extended tool registry."""
        super().__init__()
        
        # Extended categories
        self._tool_categories.update({
            "blockchain": [],
            "intelligence": [],
            "ml_ai": [],
            "communication": [],
            "compliance": []
        })
        
        # Enhanced metadata and tracking
        self._tool_metadata: Dict[str, ToolMetadata] = {}
        self._tool_dependencies: Dict[str, List[ToolDependency]] = {}
        self._lazy_loading: Dict[str, Callable] = {}
        self._performance_metrics: Dict[str, Dict[str, Any]] = defaultdict(dict)
        
        # Category descriptions
        self._category_descriptions = {
            "blockchain": "Cryptocurrency and blockchain analysis tools for transaction tracing, "
                         "wallet analysis, and compliance monitoring",
            "intelligence": "Advanced threat intelligence and investigation tools for cyber "
                           "threat analysis and attribution",
            "ml_ai": "Machine learning and AI-powered analysis tools for pattern detection "
                     "and automated investigation",
            "communication": "Communication and collaboration tools for case management "
                            "and stakeholder coordination",
            "compliance": "Regulatory compliance and audit tools for AML, KYC, and "
                         "financial crime investigation"
        }
        
        # Thread pool for lazy loading
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="tool_loader")

    def register_tool_with_metadata(
        self,
        tool: BaseTool,
        category: str,
        metadata: ToolMetadata
    ) -> None:
        """Register a tool with enhanced metadata."""
        self._register_tool(tool, category)
        self._tool_metadata[tool.name] = metadata
        
        logger.info(f"Registered tool {tool.name} in category {category} with metadata")

    def register_lazy_tool(
        self,
        tool_name: str,
        category: str,
        loader_function: Callable,
        metadata: ToolMetadata
    ) -> None:
        """Register a tool for lazy loading."""
        self._lazy_loading[tool_name] = loader_function
        self._tool_metadata[tool_name] = metadata
        self._tool_categories[category].append(tool_name)
        
        logger.info(f"Registered lazy tool {tool_name} in category {category}")

    async def get_tool_async(self, name: str) -> Optional[BaseTool]:
        """Get a tool with lazy loading support."""
        # Check if tool is already loaded
        if name in self._tools:
            await self._update_usage_metrics(name)
            return self._tools[name]
        
        # Try lazy loading
        if name in self._lazy_loading:
            return await self._lazy_load_tool(name)
        
        return None

    async def _lazy_load_tool(self, name: str) -> Optional[BaseTool]:
        """Lazy load a tool asynchronously."""
        try:
            loader = self._lazy_loading[name]
            
            # Run loader in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            tool = await loop.run_in_executor(self._executor, loader)
            
            if tool:
                self._tools[name] = tool
                logger.info(f"Successfully lazy loaded tool: {name}")
                await self._update_usage_metrics(name)
                return tool
            
        except Exception as e:
            logger.error(f"Failed to lazy load tool {name}: {e}")
        
        return None

    def register_tool_dependency(
        self,
        tool_name: str,
        dependency: ToolDependency
    ) -> None:
        """Register a dependency for a tool."""
        if tool_name not in self._tool_dependencies:
            self._tool_dependencies[tool_name] = []
        
        self._tool_dependencies[tool_name].append(dependency)
        logger.debug(f"Registered dependency for {tool_name}: {dependency.tool_name}")

    async def validate_tool_dependencies(self, tool_name: str) -> List[str]:
        """Validate dependencies for a tool and return missing ones."""
        if tool_name not in self._tool_dependencies:
            return []
        
        missing_dependencies = []
        
        for dependency in self._tool_dependencies[tool_name]:
            # Check if dependency tool exists or can be loaded
            dep_tool = await self.get_tool_async(dependency.tool_name)
            
            if not dep_tool and dependency.required:
                # Try fallback tools
                fallback_available = False
                for fallback in dependency.fallback_tools:
                    if await self.get_tool_async(fallback):
                        fallback_available = True
                        break
                
                if not fallback_available:
                    missing_dependencies.append(dependency.tool_name)
            
            # Run validation function if provided
            if dep_tool and dependency.validation_function:
                try:
                    if not dependency.validation_function(dep_tool):
                        missing_dependencies.append(f"{dependency.tool_name} (validation failed)")
                except Exception as e:
                    logger.warning(f"Dependency validation failed for {dependency.tool_name}: {e}")
        
        return missing_dependencies

    async def get_tools_by_category_async(self, category: str) -> List[BaseTool]:
        """Get all tools in a category with lazy loading support."""
        tools = []
        
        if category not in self._tool_categories:
            return []
        
        for tool_name in self._tool_categories[category]:
            tool = await self.get_tool_async(tool_name)
            if tool:
                tools.append(tool)
        
        return tools

    def get_tools_by_performance_tier(self, tier: str) -> List[str]:
        """Get tools by performance tier (fast, standard, slow)."""
        return [
            name for name, metadata in self._tool_metadata.items()
            if metadata.performance_tier == tier
        ]

    def get_tools_by_security_level(self, level: str) -> List[str]:
        """Get tools by security level (low, medium, high, critical)."""
        return [
            name for name, metadata in self._tool_metadata.items()
            if metadata.security_level == level
        ]

    def get_tools_with_compliance_flags(self, flags: Set[str]) -> List[str]:
        """Get tools that have specific compliance flags."""
        matching_tools = []
        
        for name, metadata in self._tool_metadata.items():
            if flags.intersection(metadata.compliance_flags):
                matching_tools.append(name)
        
        return matching_tools

    async def _update_usage_metrics(self, tool_name: str) -> None:
        """Update usage metrics for a tool."""
        if tool_name in self._tool_metadata:
            metadata = self._tool_metadata[tool_name]
            metadata.usage_count += 1
            metadata.last_used = time.time()

    def get_tool_metadata(self, tool_name: str) -> Optional[ToolMetadata]:
        """Get metadata for a tool."""
        return self._tool_metadata.get(tool_name)

    def get_category_description(self, category: str) -> Optional[str]:
        """Get description for a tool category."""
        return self._category_descriptions.get(category)

    def get_extended_categories(self) -> List[str]:
        """Get all extended categories."""
        return [category.value for category in ExtendedToolCategory]

    async def preload_high_priority_tools(self) -> None:
        """Preload tools marked as high priority or frequently used."""
        high_priority_tools = []
        
        for name, metadata in self._tool_metadata.items():
            if (metadata.performance_tier == "fast" or
                metadata.usage_count > 100 or
                name in self._lazy_loading):
                high_priority_tools.append(name)
        
        if high_priority_tools:
            logger.info(f"Preloading {len(high_priority_tools)} high priority tools")
            
            # Load tools concurrently
            tasks = [self.get_tool_async(name) for name in high_priority_tools]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            loaded_count = sum(1 for result in results if not isinstance(result, Exception))
            logger.info(f"Successfully preloaded {loaded_count}/{len(high_priority_tools)} tools")

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        total_tools = len(self._tool_metadata)
        loaded_tools = len(self._tools)
        lazy_tools = len(self._lazy_loading)
        
        # Category breakdown
        category_stats = {}
        for category, tools in self._tool_categories.items():
            loaded_in_category = sum(1 for name in tools if name in self._tools)
            category_stats[category] = {
                'total': len(tools),
                'loaded': loaded_in_category,
                'load_ratio': loaded_in_category / len(tools) if tools else 0
            }
        
        # Performance tier distribution
        tier_distribution = defaultdict(int)
        for metadata in self._tool_metadata.values():
            tier_distribution[metadata.performance_tier] += 1
        
        # Security level distribution
        security_distribution = defaultdict(int)
        for metadata in self._tool_metadata.values():
            security_distribution[metadata.security_level] += 1
        
        return {
            'total_tools': total_tools,
            'loaded_tools': loaded_tools,
            'lazy_tools': lazy_tools,
            'load_ratio': loaded_tools / total_tools if total_tools else 0,
            'category_stats': category_stats,
            'tier_distribution': dict(tier_distribution),
            'security_distribution': dict(security_distribution),
            'extended_categories': len(self.get_extended_categories())
        }

    async def shutdown(self) -> None:
        """Shutdown the extended tool registry."""
        self._executor.shutdown(wait=True)
        logger.info("Extended tool registry shutdown complete")


# Global extended tool registry instance
extended_tool_registry = ExtendedToolRegistry()


def get_blockchain_tools() -> List[str]:
    """Get all blockchain analysis tools."""
    return extended_tool_registry._tool_categories.get("blockchain", [])


def get_intelligence_tools() -> List[str]:
    """Get all intelligence and investigation tools."""
    return extended_tool_registry._tool_categories.get("intelligence", [])


def get_ml_ai_tools() -> List[str]:
    """Get all ML/AI analysis tools."""
    return extended_tool_registry._tool_categories.get("ml_ai", [])


def get_communication_tools() -> List[str]:
    """Get all communication and collaboration tools."""
    return extended_tool_registry._tool_categories.get("communication", [])


def get_compliance_tools() -> List[str]:
    """Get all compliance and regulatory tools."""
    return extended_tool_registry._tool_categories.get("compliance", [])


async def initialize_extended_tools(**kwargs) -> None:
    """Initialize the extended tool registry."""
    # Initialize base registry first
    extended_tool_registry.initialize(**kwargs)
    
    # Preload high priority tools
    await extended_tool_registry.preload_high_priority_tools()
    
    logger.info("Extended tool registry initialization complete")


def register_blockchain_tool_lazy(
    name: str,
    loader: Callable,
    metadata: ToolMetadata
) -> None:
    """Register a blockchain tool for lazy loading."""
    extended_tool_registry.register_lazy_tool(name, "blockchain", loader, metadata)