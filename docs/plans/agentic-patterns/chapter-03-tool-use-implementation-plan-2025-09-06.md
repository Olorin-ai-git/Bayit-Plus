# Chapter 3: Tool Use Pattern - Implementation Plan
**Date**: September 6, 2025  
**Author**: Gil Klainert  
**Reference**: Chapter 3 Analysis Document  
**Jira Epic**: OLORIN-TOOL-001  
**Status**: Ready for Implementation

## Executive Summary

This document provides a detailed implementation plan to address the gaps identified in the Chapter 3 Tool Use analysis. The plan transforms Olorin from having 4 basic tools to a comprehensive, orchestrated tool ecosystem with 15+ specialized fraud detection tools, resilient execution, and intelligent selection capabilities.

## Implementation Overview

### Timeline
- **Duration**: 10 weeks
- **Start Date**: Upon approval
- **End Date**: Start + 10 weeks
- **Team Size**: 3-4 developers

### Budget Estimate
- **Development**: 400 hours
- **Testing**: 100 hours
- **Documentation**: 50 hours
- **Total**: 550 hours

## Phase 1: Foundation Enhancement (Weeks 1-2)

### 1.1 Base Tool Architecture
**Jira Story**: OLORIN-TOOL-002

#### Technical Specification
```python
# File: olorin-server/app/tools/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import asyncio
import logging

class ToolCapability(str, Enum):
    DATA_COLLECTION = "data_collection"
    PATTERN_DETECTION = "pattern_detection"
    RISK_ASSESSMENT = "risk_assessment"
    NETWORK_ANALYSIS = "network_analysis"
    REPORT_GENERATION = "report_generation"
    VALIDATION = "validation"
    CORRELATION = "correlation"

class ToolMetadata(BaseModel):
    name: str = Field(..., description="Unique tool identifier")
    version: str = Field(..., description="Semantic version")
    description: str = Field(..., description="Tool purpose and functionality")
    capabilities: List[ToolCapability] = Field(..., description="Tool capabilities")
    parameters: Dict[str, Any] = Field(..., description="Parameter schema")
    examples: List[Dict[str, Any]] = Field(default_factory=list)
    performance_benchmarks: Dict[str, float] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)
    
class ToolExecutionContext(BaseModel):
    investigation_id: str
    user_id: str
    timestamp: datetime
    previous_results: Dict[str, Any] = Field(default_factory=dict)
    configuration: Dict[str, Any] = Field(default_factory=dict)
    
class ToolResult(BaseModel):
    success: bool
    data: Any
    metadata: Dict[str, Any]
    execution_time: float
    error: Optional[str] = None
    
class BaseTool(ABC):
    """Abstract base class for all Olorin tools"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.metadata = self._build_metadata()
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.execution_history: List[ToolResult] = []
        self._initialized = False
        
    @abstractmethod
    def _build_metadata(self) -> ToolMetadata:
        """Build tool metadata"""
        pass
    
    @abstractmethod
    async def _execute_impl(self, 
                           params: Dict[str, Any], 
                           context: ToolExecutionContext) -> Any:
        """Tool-specific execution logic"""
        pass
    
    async def initialize(self) -> None:
        """Initialize tool resources"""
        if not self._initialized:
            await self._initialize_impl()
            self._initialized = True
            
    async def _initialize_impl(self) -> None:
        """Override for custom initialization"""
        pass
    
    async def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate input parameters"""
        # Implement parameter validation using pydantic
        return True
    
    async def execute(self, 
                      params: Dict[str, Any],
                      context: Optional[ToolExecutionContext] = None) -> ToolResult:
        """Execute tool with monitoring and error handling"""
        
        start_time = asyncio.get_event_loop().time()
        context = context or ToolExecutionContext(
            investigation_id="default",
            user_id="system",
            timestamp=datetime.utcnow()
        )
        
        try:
            # Initialize if needed
            await self.initialize()
            
            # Validate parameters
            if not await self.validate_params(params):
                raise ValueError(f"Invalid parameters for {self.metadata.name}")
            
            # Log execution start
            self.logger.info(f"Executing {self.metadata.name} for investigation {context.investigation_id}")
            
            # Execute tool logic
            result_data = await self._execute_impl(params, context)
            
            # Create result
            execution_time = asyncio.get_event_loop().time() - start_time
            result = ToolResult(
                success=True,
                data=result_data,
                metadata={
                    "tool": self.metadata.name,
                    "version": self.metadata.version,
                    "investigation_id": context.investigation_id
                },
                execution_time=execution_time
            )
            
            # Record in history
            self.execution_history.append(result)
            
            # Log success
            self.logger.info(f"Successfully executed {self.metadata.name} in {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            self.logger.error(f"Error executing {self.metadata.name}: {str(e)}")
            
            result = ToolResult(
                success=False,
                data=None,
                metadata={
                    "tool": self.metadata.name,
                    "version": self.metadata.version,
                    "investigation_id": context.investigation_id
                },
                execution_time=execution_time,
                error=str(e)
            )
            
            self.execution_history.append(result)
            return result
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Calculate performance metrics from execution history"""
        if not self.execution_history:
            return {}
            
        successful_executions = [r for r in self.execution_history if r.success]
        failed_executions = [r for r in self.execution_history if not r.success]
        
        return {
            "total_executions": len(self.execution_history),
            "success_rate": len(successful_executions) / len(self.execution_history),
            "average_execution_time": sum(r.execution_time for r in successful_executions) / len(successful_executions) if successful_executions else 0,
            "p95_execution_time": self._calculate_percentile([r.execution_time for r in successful_executions], 95),
            "failure_count": len(failed_executions),
            "last_execution": self.execution_history[-1].metadata.get("timestamp") if self.execution_history else None
        }
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not values:
            return 0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]
```

### 1.2 Resilient Execution Framework
**Jira Story**: OLORIN-TOOL-003

#### Technical Specification
```python
# File: olorin-server/app/tools/executor.py

import asyncio
from typing import Optional, Callable, Any, Dict
from enum import Enum
import random

class RetryStrategy(Enum):
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    FIXED_DELAY = "fixed_delay"
    
class ResilientToolExecutor:
    """Handles tool execution with retry logic and fallback mechanisms"""
    
    def __init__(self, 
                 max_retries: int = 3,
                 base_delay: float = 1.0,
                 max_delay: float = 60.0,
                 strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.fallback_registry: Dict[str, BaseTool] = {}
        
    def register_fallback(self, primary_tool: str, fallback_tool: BaseTool):
        """Register a fallback tool for a primary tool"""
        self.fallback_registry[primary_tool] = fallback_tool
        
    async def execute_with_retry(self,
                                tool: BaseTool,
                                params: Dict[str, Any],
                                context: ToolExecutionContext) -> ToolResult:
        """Execute tool with retry logic"""
        
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                result = await tool.execute(params, context)
                
                if result.success:
                    return result
                    
                # Tool returned failure, treat as error
                last_error = result.error
                
            except Exception as e:
                last_error = str(e)
                
            # Calculate delay before retry
            if attempt < self.max_retries - 1:
                delay = self._calculate_delay(attempt)
                await asyncio.sleep(delay)
                
        # All retries failed, try fallback
        return await self._execute_fallback(tool, params, context, last_error)
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay based on retry strategy"""
        if self.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = self.base_delay * (2 ** attempt)
        elif self.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.base_delay * (attempt + 1)
        else:  # FIXED_DELAY
            delay = self.base_delay
            
        # Add jitter to prevent thundering herd
        delay = delay * (0.5 + random.random())
        
        return min(delay, self.max_delay)
    
    async def _execute_fallback(self,
                               primary_tool: BaseTool,
                               params: Dict[str, Any],
                               context: ToolExecutionContext,
                               error: str) -> ToolResult:
        """Execute fallback tool if available"""
        
        fallback = self.fallback_registry.get(primary_tool.metadata.name)
        
        if fallback:
            try:
                result = await fallback.execute(params, context)
                result.metadata["fallback_used"] = True
                result.metadata["primary_error"] = error
                return result
            except Exception as e:
                return ToolResult(
                    success=False,
                    data=None,
                    metadata={
                        "primary_tool": primary_tool.metadata.name,
                        "fallback_tool": fallback.metadata.name,
                        "primary_error": error,
                        "fallback_error": str(e)
                    },
                    execution_time=0,
                    error=f"Both primary and fallback failed: {error}, {str(e)}"
                )
        
        return ToolResult(
            success=False,
            data=None,
            metadata={"tool": primary_tool.metadata.name},
            execution_time=0,
            error=f"Tool execution failed after {self.max_retries} attempts: {error}"
        )
```

### 1.3 Tool Registry and Discovery
**Jira Story**: OLORIN-TOOL-004

#### Technical Specification
```python
# File: olorin-server/app/tools/registry.py

from typing import Dict, List, Optional, Set
import importlib
import inspect
from pathlib import Path

class ToolRegistry:
    """Central registry for all available tools"""
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._capability_index: Dict[ToolCapability, Set[str]] = {}
        self._initialized = False
        
    async def initialize(self):
        """Initialize registry and discover tools"""
        if not self._initialized:
            await self._discover_tools()
            await self._initialize_tools()
            self._build_indexes()
            self._initialized = True
            
    async def _discover_tools(self):
        """Dynamically discover tool implementations"""
        tools_dir = Path(__file__).parent / "implementations"
        
        for file_path in tools_dir.glob("*.py"):
            if file_path.name.startswith("_"):
                continue
                
            module_name = f"app.tools.implementations.{file_path.stem}"
            module = importlib.import_module(module_name)
            
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, BaseTool) and 
                    obj != BaseTool):
                    tool_instance = obj()
                    self.register_tool(tool_instance)
                    
    def register_tool(self, tool: BaseTool):
        """Register a tool in the registry"""
        self._tools[tool.metadata.name] = tool
        
    async def _initialize_tools(self):
        """Initialize all registered tools"""
        for tool in self._tools.values():
            await tool.initialize()
            
    def _build_indexes(self):
        """Build capability index for fast lookup"""
        for tool_name, tool in self._tools.items():
            for capability in tool.metadata.capabilities:
                if capability not in self._capability_index:
                    self._capability_index[capability] = set()
                self._capability_index[capability].add(tool_name)
                
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get tool by name"""
        return self._tools.get(name)
        
    def get_tools_by_capability(self, capability: ToolCapability) -> List[BaseTool]:
        """Get all tools with a specific capability"""
        tool_names = self._capability_index.get(capability, set())
        return [self._tools[name] for name in tool_names]
        
    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools"""
        return list(self._tools.values())
        
    def get_tool_metadata(self) -> List[ToolMetadata]:
        """Get metadata for all tools"""
        return [tool.metadata for tool in self._tools.values()]
```

## Phase 2: Fraud-Specific Tools (Weeks 3-4)

### 2.1 Pattern Detection Tool
**Jira Story**: OLORIN-TOOL-005

#### Implementation
```python
# File: olorin-server/app/tools/implementations/pattern_detector.py

from typing import Dict, Any, List
from app.tools.base import BaseTool, ToolMetadata, ToolCapability, ToolExecutionContext
import numpy as np
from datetime import datetime, timedelta

class PatternDetectionTool(BaseTool):
    """Detects fraud patterns in transaction data"""
    
    def _build_metadata(self) -> ToolMetadata:
        return ToolMetadata(
            name="pattern_detector",
            version="1.0.0",
            description="Analyzes transactions for fraud patterns including velocity, amount, and geographic anomalies",
            capabilities=[
                ToolCapability.PATTERN_DETECTION,
                ToolCapability.RISK_ASSESSMENT
            ],
            parameters={
                "transactions": {
                    "type": "array",
                    "description": "List of transaction objects",
                    "required": True
                },
                "pattern_types": {
                    "type": "array",
                    "description": "Types of patterns to detect",
                    "default": ["velocity", "amount", "geographic", "temporal"]
                },
                "sensitivity": {
                    "type": "number",
                    "description": "Detection sensitivity (0.0-1.0)",
                    "default": 0.7
                }
            },
            examples=[{
                "transactions": [
                    {"id": "t1", "amount": 100, "timestamp": "2024-01-01T10:00:00Z", "location": "NY"},
                    {"id": "t2", "amount": 5000, "timestamp": "2024-01-01T10:05:00Z", "location": "CA"}
                ],
                "pattern_types": ["velocity", "amount"]
            }],
            performance_benchmarks={
                "avg_execution_time": 0.5,
                "max_transactions": 10000
            }
        )
    
    async def _execute_impl(self, params: Dict[str, Any], context: ToolExecutionContext) -> Any:
        transactions = params['transactions']
        pattern_types = params.get('pattern_types', ["velocity", "amount", "geographic", "temporal"])
        sensitivity = params.get('sensitivity', 0.7)
        
        patterns = []
        
        if "velocity" in pattern_types:
            velocity_patterns = await self._detect_velocity_patterns(transactions, sensitivity)
            patterns.extend(velocity_patterns)
            
        if "amount" in pattern_types:
            amount_patterns = await self._detect_amount_patterns(transactions, sensitivity)
            patterns.extend(amount_patterns)
            
        if "geographic" in pattern_types:
            geo_patterns = await self._detect_geographic_patterns(transactions, sensitivity)
            patterns.extend(geo_patterns)
            
        if "temporal" in pattern_types:
            temporal_patterns = await self._detect_temporal_patterns(transactions, sensitivity)
            patterns.extend(temporal_patterns)
            
        risk_score = self._calculate_composite_risk_score(patterns)
        
        return {
            "patterns_detected": patterns,
            "risk_score": risk_score,
            "pattern_count": len(patterns),
            "high_risk_patterns": [p for p in patterns if p.get("severity") == "high"],
            "recommendations": self._generate_recommendations(patterns, risk_score)
        }
    
    async def _detect_velocity_patterns(self, transactions: List[Dict], sensitivity: float) -> List[Dict]:
        """Detect high-velocity transaction patterns"""
        patterns = []
        
        # Sort transactions by timestamp
        sorted_txns = sorted(transactions, key=lambda x: x['timestamp'])
        
        # Check for rapid consecutive transactions
        for i in range(1, len(sorted_txns)):
            time_diff = (datetime.fromisoformat(sorted_txns[i]['timestamp']) - 
                        datetime.fromisoformat(sorted_txns[i-1]['timestamp'])).total_seconds()
            
            if time_diff < 60 * (1 - sensitivity):  # Less than 60 seconds adjusted by sensitivity
                patterns.append({
                    "type": "velocity",
                    "severity": "high" if time_diff < 30 else "medium",
                    "description": f"Rapid transactions detected: {time_diff}s apart",
                    "transaction_ids": [sorted_txns[i-1]['id'], sorted_txns[i]['id']],
                    "confidence": 0.85
                })
                
        return patterns
    
    async def _detect_amount_patterns(self, transactions: List[Dict], sensitivity: float) -> List[Dict]:
        """Detect unusual amount patterns"""
        patterns = []
        amounts = [t['amount'] for t in transactions]
        
        if not amounts:
            return patterns
            
        mean_amount = np.mean(amounts)
        std_amount = np.std(amounts)
        
        threshold = mean_amount + (std_amount * (3 - 2 * sensitivity))
        
        for txn in transactions:
            if txn['amount'] > threshold:
                patterns.append({
                    "type": "amount",
                    "severity": "high" if txn['amount'] > mean_amount + (std_amount * 3) else "medium",
                    "description": f"Unusual amount detected: ${txn['amount']} (threshold: ${threshold:.2f})",
                    "transaction_ids": [txn['id']],
                    "confidence": 0.75
                })
                
        return patterns
    
    async def _detect_geographic_patterns(self, transactions: List[Dict], sensitivity: float) -> List[Dict]:
        """Detect impossible travel patterns"""
        patterns = []
        
        # Group by location changes
        for i in range(1, len(transactions)):
            if transactions[i].get('location') != transactions[i-1].get('location'):
                time_diff = (datetime.fromisoformat(transactions[i]['timestamp']) - 
                           datetime.fromisoformat(transactions[i-1]['timestamp'])).total_seconds() / 3600
                
                # Assume max travel speed of 600 mph (airplane)
                if time_diff < 1 * sensitivity:  # Less than 1 hour adjusted by sensitivity
                    patterns.append({
                        "type": "geographic",
                        "severity": "high",
                        "description": f"Impossible travel detected: {transactions[i-1]['location']} to {transactions[i]['location']} in {time_diff:.2f} hours",
                        "transaction_ids": [transactions[i-1]['id'], transactions[i]['id']],
                        "confidence": 0.90
                    })
                    
        return patterns
    
    async def _detect_temporal_patterns(self, transactions: List[Dict], sensitivity: float) -> List[Dict]:
        """Detect unusual timing patterns"""
        patterns = []
        
        # Check for unusual hours (midnight to 6 AM)
        for txn in transactions:
            hour = datetime.fromisoformat(txn['timestamp']).hour
            if 0 <= hour < 6:
                patterns.append({
                    "type": "temporal",
                    "severity": "low",
                    "description": f"Transaction at unusual hour: {hour:02d}:00",
                    "transaction_ids": [txn['id']],
                    "confidence": 0.60
                })
                
        return patterns
    
    def _calculate_composite_risk_score(self, patterns: List[Dict]) -> float:
        """Calculate overall risk score from detected patterns"""
        if not patterns:
            return 0.0
            
        severity_weights = {"high": 1.0, "medium": 0.6, "low": 0.3}
        total_weight = sum(severity_weights.get(p.get("severity", "low"), 0.3) * p.get("confidence", 0.5) 
                          for p in patterns)
        
        # Normalize to 0-1 scale
        return min(1.0, total_weight / 5.0)
    
    def _generate_recommendations(self, patterns: List[Dict], risk_score: float) -> List[str]:
        """Generate investigation recommendations"""
        recommendations = []
        
        if risk_score > 0.8:
            recommendations.append("URGENT: Immediate investigation required - high fraud probability")
        elif risk_score > 0.5:
            recommendations.append("Flag for manual review - moderate fraud indicators")
        
        pattern_types = set(p["type"] for p in patterns)
        
        if "velocity" in pattern_types:
            recommendations.append("Verify card possession with customer")
        if "geographic" in pattern_types:
            recommendations.append("Confirm customer travel plans")
        if "amount" in pattern_types:
            recommendations.append("Verify large transactions with customer")
            
        return recommendations
```

### 2.2 Network Analysis Tool
**Jira Story**: OLORIN-TOOL-006

#### Implementation
```python
# File: olorin-server/app/tools/implementations/network_analyzer.py

import networkx as nx
from typing import Dict, Any, List, Tuple
from app.tools.base import BaseTool, ToolMetadata, ToolCapability, ToolExecutionContext

class NetworkAnalysisTool(BaseTool):
    """Analyzes entity relationships and network patterns"""
    
    def _build_metadata(self) -> ToolMetadata:
        return ToolMetadata(
            name="network_analyzer",
            version="1.0.0",
            description="Analyzes relationship networks to identify suspicious clusters and key entities",
            capabilities=[
                ToolCapability.NETWORK_ANALYSIS,
                ToolCapability.PATTERN_DETECTION
            ],
            parameters={
                "entities": {
                    "type": "array",
                    "description": "List of entities (users, accounts, devices)",
                    "required": True
                },
                "relationships": {
                    "type": "array",
                    "description": "List of relationships between entities",
                    "required": True
                },
                "analysis_depth": {
                    "type": "integer",
                    "description": "Depth of network analysis",
                    "default": 3
                }
            }
        )
    
    async def _execute_impl(self, params: Dict[str, Any], context: ToolExecutionContext) -> Any:
        entities = params['entities']
        relationships = params['relationships']
        depth = params.get('analysis_depth', 3)
        
        # Build network graph
        G = self._build_network(entities, relationships)
        
        # Perform various network analyses
        clusters = self._identify_suspicious_clusters(G)
        centrality = self._calculate_centrality_metrics(G)
        anomalies = self._detect_network_anomalies(G)
        communities = self._detect_communities(G)
        
        return {
            "network_metrics": {
                "node_count": G.number_of_nodes(),
                "edge_count": G.number_of_edges(),
                "density": nx.density(G),
                "average_clustering": nx.average_clustering(G) if G.number_of_nodes() > 0 else 0
            },
            "suspicious_clusters": clusters,
            "key_entities": centrality[:10],  # Top 10 central entities
            "anomalies": anomalies,
            "communities": communities,
            "risk_assessment": self._assess_network_risk(clusters, anomalies)
        }
    
    def _build_network(self, entities: List[Dict], relationships: List[Dict]) -> nx.Graph:
        """Build NetworkX graph from entities and relationships"""
        G = nx.Graph()
        
        # Add nodes
        for entity in entities:
            G.add_node(entity['id'], **entity)
            
        # Add edges
        for rel in relationships:
            G.add_edge(rel['source'], rel['target'], **rel)
            
        return G
    
    def _identify_suspicious_clusters(self, G: nx.Graph) -> List[Dict]:
        """Identify suspicious network clusters"""
        clusters = []
        
        # Find connected components
        for component in nx.connected_components(G):
            if len(component) > 5:  # Clusters with more than 5 entities
                subgraph = G.subgraph(component)
                
                # Calculate cluster metrics
                density = nx.density(subgraph)
                
                if density > 0.7:  # Highly connected cluster
                    clusters.append({
                        "size": len(component),
                        "density": density,
                        "entities": list(component),
                        "risk_level": "high" if density > 0.9 else "medium",
                        "description": f"Highly connected cluster of {len(component)} entities"
                    })
                    
        return clusters
    
    def _calculate_centrality_metrics(self, G: nx.Graph) -> List[Tuple[str, float]]:
        """Calculate centrality metrics for entities"""
        if G.number_of_nodes() == 0:
            return []
            
        # Calculate different centrality measures
        degree_centrality = nx.degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G)
        
        # Combine scores
        combined_scores = {}
        for node in G.nodes():
            combined_scores[node] = (
                degree_centrality.get(node, 0) * 0.5 +
                betweenness_centrality.get(node, 0) * 0.5
            )
            
        # Sort by combined score
        return sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
    
    def _detect_network_anomalies(self, G: nx.Graph) -> List[Dict]:
        """Detect anomalous patterns in the network"""
        anomalies = []
        
        # Check for star patterns (one entity connected to many)
        for node in G.nodes():
            degree = G.degree(node)
            if degree > 10:  # Threshold for high connectivity
                anomalies.append({
                    "type": "star_pattern",
                    "entity": node,
                    "degree": degree,
                    "description": f"Entity {node} has unusually high connections ({degree})"
                })
                
        # Check for isolated clusters
        components = list(nx.connected_components(G))
        if len(components) > 1:
            for comp in components:
                if len(comp) > 2:
                    anomalies.append({
                        "type": "isolated_cluster",
                        "size": len(comp),
                        "entities": list(comp),
                        "description": f"Isolated cluster of {len(comp)} entities"
                    })
                    
        return anomalies
    
    def _detect_communities(self, G: nx.Graph) -> List[Dict]:
        """Detect communities within the network"""
        if G.number_of_nodes() < 2:
            return []
            
        communities = []
        
        # Use Louvain method for community detection
        try:
            import community
            partition = community.best_partition(G)
            
            # Group nodes by community
            comm_dict = {}
            for node, comm_id in partition.items():
                if comm_id not in comm_dict:
                    comm_dict[comm_id] = []
                comm_dict[comm_id].append(node)
                
            for comm_id, members in comm_dict.items():
                if len(members) > 2:
                    communities.append({
                        "id": comm_id,
                        "size": len(members),
                        "members": members,
                        "cohesion": self._calculate_cohesion(G, members)
                    })
        except ImportError:
            # Fallback to simple connected components
            for i, comp in enumerate(nx.connected_components(G)):
                if len(comp) > 2:
                    communities.append({
                        "id": i,
                        "size": len(comp),
                        "members": list(comp),
                        "cohesion": nx.density(G.subgraph(comp))
                    })
                    
        return communities
    
    def _calculate_cohesion(self, G: nx.Graph, members: List) -> float:
        """Calculate cohesion score for a community"""
        subgraph = G.subgraph(members)
        return nx.density(subgraph)
    
    def _assess_network_risk(self, clusters: List[Dict], anomalies: List[Dict]) -> Dict:
        """Assess overall network risk"""
        risk_score = 0.0
        risk_factors = []
        
        # Factor in suspicious clusters
        high_risk_clusters = [c for c in clusters if c.get("risk_level") == "high"]
        if high_risk_clusters:
            risk_score += 0.4
            risk_factors.append(f"{len(high_risk_clusters)} high-risk clusters detected")
            
        # Factor in anomalies
        if len(anomalies) > 5:
            risk_score += 0.3
            risk_factors.append(f"{len(anomalies)} network anomalies detected")
            
        # Factor in star patterns
        star_patterns = [a for a in anomalies if a.get("type") == "star_pattern"]
        if star_patterns:
            risk_score += 0.3
            risk_factors.append(f"{len(star_patterns)} entities with excessive connections")
            
        return {
            "score": min(1.0, risk_score),
            "level": "high" if risk_score > 0.7 else "medium" if risk_score > 0.4 else "low",
            "factors": risk_factors
        }
```

## Phase 3: Tool Orchestration (Weeks 5-6)

### 3.1 Tool Chain Manager
**Jira Story**: OLORIN-TOOL-007

#### Implementation
```python
# File: olorin-server/app/tools/orchestration/chain.py

from typing import List, Dict, Any, Optional
from enum import Enum
from app.tools.base import BaseTool, ToolResult, ToolExecutionContext
import asyncio

class ChainExecutionMode(Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"
    
class ToolChain:
    """Represents a chain of tools to be executed"""
    
    def __init__(self, name: str, tools: List[BaseTool], mode: ChainExecutionMode = ChainExecutionMode.SEQUENTIAL):
        self.name = name
        self.tools = tools
        self.mode = mode
        self.conditions = {}
        
    def add_condition(self, tool_name: str, condition: Callable[[Dict], bool]):
        """Add execution condition for a tool"""
        self.conditions[tool_name] = condition
        
class ChainContext:
    """Maintains context throughout chain execution"""
    
    def __init__(self, initial_params: Dict[str, Any]):
        self.params = initial_params
        self.results = {}
        self.metadata = {
            "start_time": datetime.utcnow(),
            "tool_sequence": []
        }
        
    def add_result(self, tool_name: str, result: ToolResult):
        """Add tool result to context"""
        self.results[tool_name] = result
        self.metadata["tool_sequence"].append(tool_name)
        
    def get_params(self) -> Dict[str, Any]:
        """Get current parameters"""
        return self.params
        
    def update_params(self, updates: Dict[str, Any]):
        """Update parameters with new data"""
        self.params.update(updates)
        
    def get_final_results(self) -> Dict[str, Any]:
        """Get final chain results"""
        return {
            "results": self.results,
            "metadata": {
                **self.metadata,
                "end_time": datetime.utcnow(),
                "total_tools_executed": len(self.metadata["tool_sequence"])
            }
        }
        
class ToolChainManager:
    """Manages tool chain execution"""
    
    def __init__(self, executor: ResilientToolExecutor):
        self.chains: Dict[str, ToolChain] = {}
        self.executor = executor
        
    def register_chain(self, chain: ToolChain):
        """Register a tool chain"""
        self.chains[chain.name] = chain
        
    async def execute_chain(self, 
                           chain_name: str, 
                           initial_params: Dict[str, Any],
                           execution_context: Optional[ToolExecutionContext] = None) -> Dict[str, Any]:
        """Execute a registered tool chain"""
        
        chain = self.chains.get(chain_name)
        if not chain:
            raise ValueError(f"Chain {chain_name} not found")
            
        context = ChainContext(initial_params)
        execution_context = execution_context or ToolExecutionContext(
            investigation_id=str(uuid.uuid4()),
            user_id="system",
            timestamp=datetime.utcnow()
        )
        
        if chain.mode == ChainExecutionMode.SEQUENTIAL:
            return await self._execute_sequential(chain, context, execution_context)
        elif chain.mode == ChainExecutionMode.PARALLEL:
            return await self._execute_parallel(chain, context, execution_context)
        else:  # CONDITIONAL
            return await self._execute_conditional(chain, context, execution_context)
            
    async def _execute_sequential(self, 
                                 chain: ToolChain, 
                                 context: ChainContext,
                                 execution_context: ToolExecutionContext) -> Dict[str, Any]:
        """Execute tools sequentially"""
        
        for tool in chain.tools:
            # Check if tool should be executed
            if tool.metadata.name in chain.conditions:
                condition = chain.conditions[tool.metadata.name]
                if not condition(context.get_params()):
                    continue
                    
            # Execute tool with resilience
            result = await self.executor.execute_with_retry(
                tool,
                context.get_params(),
                execution_context
            )
            
            # Add result to context
            context.add_result(tool.metadata.name, result)
            
            # Update params if successful
            if result.success and result.data:
                context.update_params({"previous_result": result.data})
                
            # Stop chain if critical failure
            if not result.success and tool.metadata.name in ["risk_scorer", "pattern_detector"]:
                break
                
        return context.get_final_results()
        
    async def _execute_parallel(self, 
                               chain: ToolChain, 
                               context: ChainContext,
                               execution_context: ToolExecutionContext) -> Dict[str, Any]:
        """Execute tools in parallel"""
        
        tasks = []
        for tool in chain.tools:
            # Check if tool should be executed
            if tool.metadata.name in chain.conditions:
                condition = chain.conditions[tool.metadata.name]
                if not condition(context.get_params()):
                    continue
                    
            # Create execution task
            task = self.executor.execute_with_retry(
                tool,
                context.get_params(),
                execution_context
            )
            tasks.append((tool.metadata.name, task))
            
        # Execute all tasks in parallel
        results = await asyncio.gather(*[task for _, task in tasks])
        
        # Add results to context
        for (tool_name, _), result in zip(tasks, results):
            context.add_result(tool_name, result)
            
        return context.get_final_results()
        
    async def _execute_conditional(self, 
                                  chain: ToolChain, 
                                  context: ChainContext,
                                  execution_context: ToolExecutionContext) -> Dict[str, Any]:
        """Execute tools based on conditions"""
        
        for tool in chain.tools:
            # Always check condition for conditional execution
            if tool.metadata.name in chain.conditions:
                condition = chain.conditions[tool.metadata.name]
                if not condition(context.results):
                    continue
                    
            # Execute tool
            result = await self.executor.execute_with_retry(
                tool,
                context.get_params(),
                execution_context
            )
            
            context.add_result(tool.metadata.name, result)
            
            # Update params for next tool
            if result.success and result.data:
                context.update_params(result.data)
                
        return context.get_final_results()
```

### 3.2 Investigation Workflow
**Jira Story**: OLORIN-TOOL-008

#### Implementation
```python
# File: olorin-server/app/tools/workflows/investigation.py

from app.tools.orchestration.chain import ToolChainManager, ToolChain, ChainExecutionMode
from app.tools.registry import ToolRegistry

class FraudInvestigationWorkflow:
    """Complete fraud investigation workflow"""
    
    def __init__(self, registry: ToolRegistry, chain_manager: ToolChainManager):
        self.registry = registry
        self.chain_manager = chain_manager
        self._setup_workflows()
        
    def _setup_workflows(self):
        """Setup investigation workflows"""
        
        # Quick investigation chain
        quick_chain = ToolChain(
            name="quick_investigation",
            tools=[
                self.registry.get_tool("data_collector"),
                self.registry.get_tool("pattern_detector"),
                self.registry.get_tool("risk_scorer")
            ],
            mode=ChainExecutionMode.SEQUENTIAL
        )
        self.chain_manager.register_chain(quick_chain)
        
        # Comprehensive investigation chain
        comprehensive_chain = ToolChain(
            name="comprehensive_investigation",
            tools=[
                self.registry.get_tool("data_collector"),
                self.registry.get_tool("data_validator"),
                self.registry.get_tool("pattern_detector"),
                self.registry.get_tool("network_analyzer"),
                self.registry.get_tool("timeline_builder"),
                self.registry.get_tool("evidence_correlator"),
                self.registry.get_tool("risk_scorer"),
                self.registry.get_tool("report_generator")
            ],
            mode=ChainExecutionMode.SEQUENTIAL
        )
        self.chain_manager.register_chain(comprehensive_chain)
        
        # Parallel analysis chain
        parallel_chain = ToolChain(
            name="parallel_analysis",
            tools=[
                self.registry.get_tool("pattern_detector"),
                self.registry.get_tool("network_analyzer"),
                self.registry.get_tool("anomaly_detector"),
                self.registry.get_tool("timeline_builder")
            ],
            mode=ChainExecutionMode.PARALLEL
        )
        self.chain_manager.register_chain(parallel_chain)
        
        # Conditional investigation chain
        conditional_chain = ToolChain(
            name="adaptive_investigation",
            tools=[
                self.registry.get_tool("data_collector"),
                self.registry.get_tool("pattern_detector"),
                self.registry.get_tool("network_analyzer"),  # Only if patterns detected
                self.registry.get_tool("deep_analyzer"),      # Only if high risk
                self.registry.get_tool("report_generator")
            ],
            mode=ChainExecutionMode.CONDITIONAL
        )
        
        # Add conditions
        conditional_chain.add_condition(
            "network_analyzer",
            lambda results: len(results.get("pattern_detector", {}).get("data", {}).get("patterns_detected", [])) > 0
        )
        conditional_chain.add_condition(
            "deep_analyzer",
            lambda results: results.get("pattern_detector", {}).get("data", {}).get("risk_score", 0) > 0.7
        )
        
        self.chain_manager.register_chain(conditional_chain)
        
    async def investigate(self, 
                         case_data: Dict[str, Any], 
                         investigation_type: str = "comprehensive") -> Dict[str, Any]:
        """Run fraud investigation"""
        
        workflow_map = {
            "quick": "quick_investigation",
            "comprehensive": "comprehensive_investigation",
            "parallel": "parallel_analysis",
            "adaptive": "adaptive_investigation"
        }
        
        chain_name = workflow_map.get(investigation_type, "comprehensive_investigation")
        
        context = ToolExecutionContext(
            investigation_id=case_data.get("investigation_id", str(uuid.uuid4())),
            user_id=case_data.get("user_id", "system"),
            timestamp=datetime.utcnow()
        )
        
        return await self.chain_manager.execute_chain(chain_name, case_data, context)
```

## Phase 4: Intelligent Tool Selection (Weeks 7-8)

### 4.1 AI-Driven Tool Selector
**Jira Story**: OLORIN-TOOL-009

#### Implementation
```python
# File: olorin-server/app/tools/selection/intelligent_selector.py

from typing import List, Dict, Any
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
import json

class IntelligentToolSelector:
    """AI-driven tool selection based on task requirements"""
    
    def __init__(self, registry: ToolRegistry):
        self.registry = registry
        self.llm = OpenAI(temperature=0.1, model="gpt-4")
        self.selection_prompt = PromptTemplate(
            input_variables=["task_description", "available_tools", "context"],
            template="""
You are an expert fraud investigation orchestrator. Given a task and available tools, 
select the most appropriate tools and determine their execution order.

Task: {task_description}

Available Tools:
{available_tools}

Investigation Context:
{context}

Provide your response in the following JSON format:
{{
    "selected_tools": [
        {{"name": "tool_name", "reason": "why this tool is needed", "order": 1}},
        ...
    ],
    "execution_mode": "sequential|parallel|conditional",
    "reasoning": "Overall strategy explanation",
    "expected_outcome": "What we expect to achieve"
}}
"""
        )
        
    async def select_tools(self, 
                          task_description: str, 
                          context: Dict[str, Any]) -> Dict[str, Any]:
        """Select appropriate tools for a task"""
        
        # Get all available tools
        available_tools = self._format_tool_descriptions()
        
        # Query LLM for tool selection
        response = await self.llm.agenerate([
            self.selection_prompt.format(
                task_description=task_description,
                available_tools=available_tools,
                context=json.dumps(context, indent=2)
            )
        ])
        
        # Parse response
        selection = json.loads(response.generations[0][0].text)
        
        # Validate and instantiate tools
        selected_tools = []
        for tool_spec in selection["selected_tools"]:
            tool = self.registry.get_tool(tool_spec["name"])
            if tool:
                selected_tools.append(tool)
                
        return {
            "tools": selected_tools,
            "mode": selection["execution_mode"],
            "reasoning": selection["reasoning"],
            "expected_outcome": selection["expected_outcome"]
        }
        
    def _format_tool_descriptions(self) -> str:
        """Format tool descriptions for LLM"""
        descriptions = []
        
        for tool in self.registry.get_all_tools():
            desc = f"""
- Name: {tool.metadata.name}
  Version: {tool.metadata.version}
  Description: {tool.metadata.description}
  Capabilities: {', '.join([c.value for c in tool.metadata.capabilities])}
  Parameters: {json.dumps(tool.metadata.parameters, indent=4)}
"""
            descriptions.append(desc)
            
        return "\n".join(descriptions)
        
    async def optimize_chain(self, 
                            existing_chain: ToolChain, 
                            performance_data: Dict[str, Any]) -> ToolChain:
        """Optimize an existing tool chain based on performance data"""
        
        optimization_prompt = PromptTemplate(
            input_variables=["chain_description", "performance_data", "available_tools"],
            template="""
Analyze this tool chain and its performance data, then suggest optimizations.

Current Chain:
{chain_description}

Performance Data:
{performance_data}

Available Tools:
{available_tools}

Suggest improvements for:
1. Tool selection (add/remove/replace tools)
2. Execution order
3. Execution mode (sequential/parallel/conditional)
4. Conditional logic

Provide response in JSON format:
{{
    "optimizations": [
        {{"type": "add|remove|replace|reorder", "details": "...", "expected_improvement": "..."}}
    ],
    "new_chain_structure": [...],
    "reasoning": "..."
}}
"""
        )
        
        # Generate optimization suggestions
        response = await self.llm.agenerate([
            optimization_prompt.format(
                chain_description=self._describe_chain(existing_chain),
                performance_data=json.dumps(performance_data, indent=2),
                available_tools=self._format_tool_descriptions()
            )
        ])
        
        suggestions = json.loads(response.generations[0][0].text)
        
        # Apply optimizations to create new chain
        optimized_chain = self._apply_optimizations(existing_chain, suggestions)
        
        return optimized_chain
        
    def _describe_chain(self, chain: ToolChain) -> str:
        """Generate description of a tool chain"""
        tools_desc = [f"{i+1}. {tool.metadata.name}: {tool.metadata.description}" 
                     for i, tool in enumerate(chain.tools)]
        
        return f"""
Name: {chain.name}
Mode: {chain.mode.value}
Tools: 
{chr(10).join(tools_desc)}
"""
        
    def _apply_optimizations(self, chain: ToolChain, suggestions: Dict) -> ToolChain:
        """Apply optimization suggestions to create new chain"""
        # Implementation would apply the suggested changes
        # This is a simplified version
        
        new_tools = []
        for tool_name in suggestions["new_chain_structure"]:
            tool = self.registry.get_tool(tool_name)
            if tool:
                new_tools.append(tool)
                
        return ToolChain(
            name=f"{chain.name}_optimized",
            tools=new_tools,
            mode=ChainExecutionMode[suggestions.get("mode", "SEQUENTIAL").upper()]
        )
```

## Phase 5: Monitoring and Analytics (Weeks 9-10)

### 5.1 Performance Monitoring
**Jira Story**: OLORIN-TOOL-010

#### Implementation
```python
# File: olorin-server/app/tools/monitoring/performance.py

from typing import Dict, Any, List
from datetime import datetime, timedelta
import asyncio
from prometheus_client import Counter, Histogram, Gauge
import redis

class ToolPerformanceMonitor:
    """Comprehensive tool performance monitoring"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        
        # Prometheus metrics
        self.execution_counter = Counter(
            'tool_executions_total',
            'Total number of tool executions',
            ['tool_name', 'status']
        )
        
        self.execution_duration = Histogram(
            'tool_execution_duration_seconds',
            'Tool execution duration',
            ['tool_name']
        )
        
        self.active_executions = Gauge(
            'tool_active_executions',
            'Number of active tool executions',
            ['tool_name']
        )
        
        self.error_rate = Gauge(
            'tool_error_rate',
            'Tool error rate over last hour',
            ['tool_name']
        )
        
    async def record_execution_start(self, tool_name: str, investigation_id: str):
        """Record tool execution start"""
        self.active_executions.labels(tool_name=tool_name).inc()
        
        # Store in Redis for tracking
        key = f"tool:execution:{tool_name}:{investigation_id}"
        await self.redis.hset(key, {
            "start_time": datetime.utcnow().isoformat(),
            "status": "running"
        })
        
    async def record_execution_end(self, 
                                  tool_name: str, 
                                  investigation_id: str,
                                  success: bool,
                                  duration: float,
                                  result: ToolResult):
        """Record tool execution completion"""
        
        # Update Prometheus metrics
        self.active_executions.labels(tool_name=tool_name).dec()
        self.execution_counter.labels(
            tool_name=tool_name,
            status="success" if success else "failure"
        ).inc()
        self.execution_duration.labels(tool_name=tool_name).observe(duration)
        
        # Store detailed metrics in Redis
        key = f"tool:execution:{tool_name}:{investigation_id}"
        await self.redis.hset(key, {
            "end_time": datetime.utcnow().isoformat(),
            "status": "success" if success else "failure",
            "duration": duration,
            "error": result.error if result.error else ""
        })
        
        # Update error rate
        await self._update_error_rate(tool_name)
        
    async def _update_error_rate(self, tool_name: str):
        """Calculate and update error rate for the last hour"""
        
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        
        # Get executions from last hour
        pattern = f"tool:execution:{tool_name}:*"
        keys = await self.redis.keys(pattern)
        
        total = 0
        failures = 0
        
        for key in keys:
            data = await self.redis.hgetall(key)
            if data.get("end_time"):
                end_time = datetime.fromisoformat(data["end_time"])
                if end_time > hour_ago:
                    total += 1
                    if data.get("status") == "failure":
                        failures += 1
                        
        error_rate = failures / total if total > 0 else 0
        self.error_rate.labels(tool_name=tool_name).set(error_rate)
        
    async def get_tool_analytics(self, 
                                tool_name: str, 
                                timeframe: timedelta) -> Dict[str, Any]:
        """Get comprehensive analytics for a tool"""
        
        now = datetime.utcnow()
        start_time = now - timeframe
        
        # Retrieve execution data
        pattern = f"tool:execution:{tool_name}:*"
        keys = await self.redis.keys(pattern)
        
        executions = []
        for key in keys:
            data = await self.redis.hgetall(key)
            if data.get("end_time"):
                end_time = datetime.fromisoformat(data["end_time"])
                if end_time > start_time:
                    executions.append(data)
                    
        # Calculate metrics
        total_executions = len(executions)
        successful = [e for e in executions if e.get("status") == "success"]
        failed = [e for e in executions if e.get("status") == "failure"]
        
        durations = [float(e.get("duration", 0)) for e in successful]
        
        analytics = {
            "tool_name": tool_name,
            "timeframe": str(timeframe),
            "total_executions": total_executions,
            "successful_executions": len(successful),
            "failed_executions": len(failed),
            "success_rate": len(successful) / total_executions if total_executions > 0 else 0,
            "average_duration": sum(durations) / len(durations) if durations else 0,
            "min_duration": min(durations) if durations else 0,
            "max_duration": max(durations) if durations else 0,
            "p50_duration": self._calculate_percentile(durations, 50),
            "p95_duration": self._calculate_percentile(durations, 95),
            "p99_duration": self._calculate_percentile(durations, 99),
            "common_errors": self._analyze_errors(failed),
            "usage_pattern": self._analyze_usage_pattern(executions)
        }
        
        return analytics
        
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not values:
            return 0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]
        
    def _analyze_errors(self, failed_executions: List[Dict]) -> List[Dict]:
        """Analyze common error patterns"""
        error_counts = {}
        
        for execution in failed_executions:
            error = execution.get("error", "Unknown")
            error_counts[error] = error_counts.get(error, 0) + 1
            
        return [
            {"error": error, "count": count}
            for error, count in sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
        ][:5]  # Top 5 errors
        
    def _analyze_usage_pattern(self, executions: List[Dict]) -> Dict:
        """Analyze tool usage patterns"""
        hourly_usage = {}
        
        for execution in executions:
            if execution.get("start_time"):
                hour = datetime.fromisoformat(execution["start_time"]).hour
                hourly_usage[hour] = hourly_usage.get(hour, 0) + 1
                
        return {
            "peak_hour": max(hourly_usage.items(), key=lambda x: x[1])[0] if hourly_usage else None,
            "hourly_distribution": hourly_usage
        }
```

## Integration Plan

### Integration with Existing System
**Jira Story**: OLORIN-TOOL-011

#### Step 1: Update MCP Server
```python
# File: olorin-server/app/mcp_server/enhanced_tools.py

from app.tools.registry import ToolRegistry
from app.tools.orchestration.chain import ToolChainManager
from app.tools.workflows.investigation import FraudInvestigationWorkflow

@server.tool()
async def execute_tool_chain(
    chain_name: str,
    parameters: Dict[str, Any],
    investigation_id: Optional[str] = None
) -> Dict[str, Any]:
    """Execute a tool chain for investigation"""
    
    # Initialize components
    registry = ToolRegistry()
    await registry.initialize()
    
    chain_manager = ToolChainManager(
        executor=ResilientToolExecutor()
    )
    
    workflow = FraudInvestigationWorkflow(registry, chain_manager)
    
    # Execute investigation
    result = await workflow.investigate(
        case_data={
            **parameters,
            "investigation_id": investigation_id or str(uuid.uuid4())
        },
        investigation_type=chain_name
    )
    
    return result

@server.tool()
async def get_tool_recommendations(
    task_description: str,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """Get AI-driven tool recommendations"""
    
    registry = ToolRegistry()
    await registry.initialize()
    
    selector = IntelligentToolSelector(registry)
    recommendations = await selector.select_tools(task_description, context)
    
    return recommendations
```

#### Step 2: Update Agent Integration
```python
# File: olorin-server/app/agents_enhanced.py

from app.tools.registry import ToolRegistry
from app.tools.workflows.investigation import FraudInvestigationWorkflow

class EnhancedFraudAgent:
    """Agent with advanced tool capabilities"""
    
    def __init__(self):
        self.registry = ToolRegistry()
        self.workflow = None
        
    async def initialize(self):
        await self.registry.initialize()
        chain_manager = ToolChainManager(
            executor=ResilientToolExecutor()
        )
        self.workflow = FraudInvestigationWorkflow(self.registry, chain_manager)
        
    async def investigate(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run investigation using tool chains"""
        
        # Determine investigation type based on risk indicators
        if case_data.get("priority") == "high":
            investigation_type = "comprehensive"
        elif case_data.get("quick_check"):
            investigation_type = "quick"
        else:
            investigation_type = "adaptive"
            
        return await self.workflow.investigate(case_data, investigation_type)
```

## Testing Strategy

### Unit Tests
**Jira Story**: OLORIN-TOOL-012

```python
# File: olorin-server/test/unit/test_tools.py

import pytest
from app.tools.base import BaseTool, ToolMetadata
from app.tools.implementations.pattern_detector import PatternDetectionTool

@pytest.mark.asyncio
async def test_pattern_detection_tool():
    """Test pattern detection tool"""
    tool = PatternDetectionTool()
    
    params = {
        "transactions": [
            {"id": "t1", "amount": 100, "timestamp": "2024-01-01T10:00:00Z", "location": "NY"},
            {"id": "t2", "amount": 5000, "timestamp": "2024-01-01T10:05:00Z", "location": "CA"}
        ],
        "pattern_types": ["velocity", "amount"]
    }
    
    result = await tool.execute(params)
    
    assert result.success
    assert "patterns_detected" in result.data
    assert "risk_score" in result.data
    assert result.execution_time > 0

@pytest.mark.asyncio
async def test_tool_chain_execution():
    """Test tool chain execution"""
    registry = ToolRegistry()
    await registry.initialize()
    
    chain_manager = ToolChainManager(
        executor=ResilientToolExecutor()
    )
    
    # Create test chain
    chain = ToolChain(
        name="test_chain",
        tools=[
            registry.get_tool("data_collector"),
            registry.get_tool("pattern_detector")
        ],
        mode=ChainExecutionMode.SEQUENTIAL
    )
    
    chain_manager.register_chain(chain)
    
    result = await chain_manager.execute_chain(
        "test_chain",
        {"test_data": "value"}
    )
    
    assert "results" in result
    assert len(result["results"]) == 2
```

### Integration Tests
**Jira Story**: OLORIN-TOOL-013

```python
# File: olorin-server/test/integration/test_tool_integration.py

@pytest.mark.integration
async def test_fraud_investigation_workflow():
    """Test complete fraud investigation workflow"""
    
    # Setup
    registry = ToolRegistry()
    await registry.initialize()
    
    chain_manager = ToolChainManager(
        executor=ResilientToolExecutor(max_retries=2)
    )
    
    workflow = FraudInvestigationWorkflow(registry, chain_manager)
    
    # Test data
    case_data = {
        "investigation_id": "test_123",
        "transactions": generate_test_transactions(100),
        "entities": generate_test_entities(20),
        "relationships": generate_test_relationships(50)
    }
    
    # Run investigation
    result = await workflow.investigate(case_data, "comprehensive")
    
    # Assertions
    assert result["metadata"]["total_tools_executed"] == 8
    assert "pattern_detector" in result["results"]
    assert "network_analyzer" in result["results"]
    assert "risk_scorer" in result["results"]
    assert "report_generator" in result["results"]
```

## Deployment Plan

### Phase 1 Deployment (Week 11)
1. Deploy base tool architecture
2. Enable monitoring
3. Test with subset of investigations

### Phase 2 Deployment (Week 12)
1. Deploy fraud-specific tools
2. Enable tool chains for beta users
3. Monitor performance metrics

### Full Rollout (Week 13)
1. Enable for all investigations
2. Activate intelligent selection
3. Full monitoring and alerting

## Success Metrics

### Technical KPIs
- Tool execution success rate: > 95%
- Average response time: < 2 seconds
- Chain completion rate: > 90%
- Error recovery rate: > 80%

### Business KPIs
- Investigation time: -40%
- False positive rate: -30%
- Detection accuracy: +25%
- Manual intervention: -50%

## Risk Mitigation

### Technical Risks
1. **Performance degradation**
   - Mitigation: Gradual rollout with monitoring
   - Fallback: Feature flags for instant rollback

2. **Integration complexity**
   - Mitigation: Comprehensive testing
   - Fallback: Maintain legacy code path

3. **LLM costs for selection**
   - Mitigation: Cache common patterns
   - Fallback: Rule-based selection

### Operational Risks
1. **Team training**
   - Mitigation: Documentation and workshops
   - Support: Dedicated slack channel

2. **Monitoring overhead**
   - Mitigation: Automated alerting
   - Support: Runbook for common issues

## Conclusion

This implementation plan addresses all gaps identified in the Chapter 3 analysis:

1. **Foundation**: Robust base architecture with resilient execution
2. **Coverage**: 15+ specialized fraud detection tools
3. **Orchestration**: Sophisticated tool chaining and workflows
4. **Intelligence**: AI-driven tool selection and optimization
5. **Monitoring**: Comprehensive performance tracking and analytics

The phased approach ensures minimal disruption while maximizing value delivery. Each phase builds on the previous, creating a comprehensive tool ecosystem that will transform Olorin's fraud detection capabilities.

## Next Steps

1. **Review and approve** this implementation plan
2. **Create Jira tickets** for all stories
3. **Assign development team** (3-4 developers)
4. **Schedule kickoff meeting** for Phase 1
5. **Setup monitoring infrastructure** before deployment

---

**Document Status**: Complete  
**Approval Required**: Yes  
**Estimated Start**: Upon Approval  
**Estimated Completion**: 13 weeks from start