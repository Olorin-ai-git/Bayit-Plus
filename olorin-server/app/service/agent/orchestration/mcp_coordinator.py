"""
MCP Coordinator - Intelligent routing and orchestration for MCP servers.

This module provides intelligent routing of investigation tasks to appropriate
MCP servers, load balancing, and fallback management.
"""

import asyncio
import random
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

from langchain_core.tools import BaseTool
from langchain_core.messages import BaseMessage
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RoutingStrategy(Enum):
    """MCP server routing strategies."""
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    CAPABILITY_BASED = "capability_based"
    PERFORMANCE_BASED = "performance_based"
    RANDOM = "random"


class LoadBalancingPolicy(Enum):
    """Load balancing policies for MCP servers."""
    EQUAL_DISTRIBUTION = "equal_distribution"
    WEIGHTED = "weighted"
    ADAPTIVE = "adaptive"
    PRIORITY_BASED = "priority_based"


@dataclass
class ServerLoad:
    """Tracks load information for an MCP server."""
    server_name: str
    current_requests: int = 0
    total_requests: int = 0
    average_response_time: float = 0.0
    error_rate: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)
    
    @property
    def load_score(self) -> float:
        """Calculate load score (lower is better)."""
        # Weighted combination of metrics
        score = (
            self.current_requests * 0.4 +
            self.average_response_time * 0.3 +
            self.error_rate * 100 * 0.3
        )
        return score


@dataclass
class RoutingDecision:
    """Represents a routing decision for a task."""
    task_id: str
    server_name: str
    capability: str
    confidence: float
    fallback_servers: List[str] = field(default_factory=list)
    routing_reason: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


class IntelligentMCPRouter:
    """
    Intelligent router for MCP server selection.
    
    This class analyzes investigation requirements and routes
    tasks to the most appropriate MCP servers.
    """
    
    def __init__(self):
        """Initialize the intelligent router."""
        self.routing_history = []
        self.capability_map = {}  # capability -> [server_names]
        self.server_performance = {}  # server_name -> performance_metrics
        
    def analyze_task_requirements(self, task: Dict[str, Any]) -> List[str]:
        """
        Analyze task to determine required capabilities.
        
        Args:
            task: Task information including type and parameters
            
        Returns:
            List of required capabilities
        """
        required_capabilities = []
        
        # Extract task type and content
        task_type = task.get("type", "").lower()
        content = task.get("content", "").lower()
        
        # Map task types to capabilities
        capability_mapping = {
            "transaction": ["transaction_history_search", "risk_score_calculation"],
            "device": ["device_fingerprint_lookup", "fraud_pattern_matching"],
            "ip": ["ip_reputation_check"],
            "email": ["email_verification"],
            "phone": ["phone_number_validation"],
            "credit": ["credit_bureau_check"],
            "fraud_ring": ["fraud_ring_detection", "entity_relationship_mapping"],
            "money_flow": ["money_flow_analysis"],
            "anomaly": ["anomaly_clustering"]
        }
        
        # Check for keywords in content
        for keyword, capabilities in capability_mapping.items():
            if keyword in task_type or keyword in content:
                required_capabilities.extend(capabilities)
        
        # Remove duplicates
        return list(set(required_capabilities))
    
    def select_server(
        self,
        required_capability: str,
        available_servers: List[str],
        strategy: RoutingStrategy = RoutingStrategy.CAPABILITY_BASED
    ) -> Optional[str]:
        """
        Select the best server for a capability.
        
        Args:
            required_capability: The capability needed
            available_servers: List of available server names
            strategy: Routing strategy to use
            
        Returns:
            Selected server name or None
        """
        if not available_servers:
            return None
        
        if strategy == RoutingStrategy.RANDOM:
            return random.choice(available_servers)
        
        elif strategy == RoutingStrategy.ROUND_ROBIN:
            # Simple round-robin (would need state tracking in production)
            return available_servers[0]
        
        elif strategy == RoutingStrategy.PERFORMANCE_BASED:
            # Select based on performance metrics
            best_server = None
            best_score = float('inf')
            
            for server in available_servers:
                metrics = self.server_performance.get(server, {})
                score = metrics.get("error_rate", 0) + metrics.get("avg_latency", 1)
                if score < best_score:
                    best_score = score
                    best_server = server
            
            return best_server or available_servers[0]
        
        else:  # CAPABILITY_BASED (default)
            # For now, return first available
            return available_servers[0]
    
    def route_task(
        self,
        task: Dict[str, Any],
        available_servers: Dict[str, List[str]]
    ) -> RoutingDecision:
        """
        Route a task to the appropriate MCP server.
        
        Args:
            task: Task to route
            available_servers: Map of capabilities to server names
            
        Returns:
            Routing decision with selected server and fallbacks
        """
        task_id = task.get("id", f"task_{datetime.now().timestamp()}")
        required_capabilities = self.analyze_task_requirements(task)
        
        if not required_capabilities:
            # Default to fraud database server for general queries
            required_capabilities = ["transaction_history_search"]
        
        # Select primary capability and server
        primary_capability = required_capabilities[0]
        candidate_servers = available_servers.get(primary_capability, [])
        
        selected_server = self.select_server(
            primary_capability,
            candidate_servers,
            RoutingStrategy.PERFORMANCE_BASED
        )
        
        if not selected_server:
            logger.warning(f"No server available for capability: {primary_capability}")
            return RoutingDecision(
                task_id=task_id,
                server_name="",
                capability=primary_capability,
                confidence=0.0,
                routing_reason="No available servers"
            )
        
        # Identify fallback servers
        fallback_servers = [s for s in candidate_servers if s != selected_server]
        
        decision = RoutingDecision(
            task_id=task_id,
            server_name=selected_server,
            capability=primary_capability,
            confidence=0.9,
            fallback_servers=fallback_servers,
            routing_reason=f"Selected based on {primary_capability} capability"
        )
        
        self.routing_history.append(decision)
        return decision


class MCPLoadBalancer:
    """
    Load balancer for MCP servers.
    
    Distributes investigation workload across multiple MCP servers
    to optimize performance and prevent overload.
    """
    
    def __init__(self, policy: LoadBalancingPolicy = LoadBalancingPolicy.ADAPTIVE):
        """
        Initialize the load balancer.
        
        Args:
            policy: Load balancing policy to use
        """
        self.policy = policy
        self.server_loads = {}  # server_name -> ServerLoad
        self.request_queue = asyncio.Queue()
        self.server_weights = {}  # For weighted distribution
        
    def update_server_load(self, server_name: str, load_info: Dict[str, Any]):
        """
        Update load information for a server.
        
        Args:
            server_name: Name of the server
            load_info: Load metrics
        """
        if server_name not in self.server_loads:
            self.server_loads[server_name] = ServerLoad(server_name)
        
        load = self.server_loads[server_name]
        load.current_requests = load_info.get("current_requests", load.current_requests)
        load.total_requests = load_info.get("total_requests", load.total_requests)
        load.average_response_time = load_info.get("avg_response_time", load.average_response_time)
        load.error_rate = load_info.get("error_rate", load.error_rate)
        load.last_updated = datetime.now()
    
    def get_least_loaded_server(self, servers: List[str]) -> Optional[str]:
        """
        Get the least loaded server from a list.
        
        Args:
            servers: List of server names
            
        Returns:
            Name of least loaded server
        """
        if not servers:
            return None
        
        # Initialize loads for new servers
        for server in servers:
            if server not in self.server_loads:
                self.server_loads[server] = ServerLoad(server)
        
        # Find server with lowest load score
        best_server = min(
            servers,
            key=lambda s: self.server_loads[s].load_score
        )
        
        return best_server
    
    def distribute_load(
        self,
        tasks: List[Dict[str, Any]],
        available_servers: List[str]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Distribute tasks across servers based on load balancing policy.
        
        Args:
            tasks: List of tasks to distribute
            available_servers: List of available server names
            
        Returns:
            Map of server names to assigned tasks
        """
        if not available_servers:
            return {}
        
        distribution = defaultdict(list)
        
        if self.policy == LoadBalancingPolicy.EQUAL_DISTRIBUTION:
            # Distribute equally
            for i, task in enumerate(tasks):
                server = available_servers[i % len(available_servers)]
                distribution[server].append(task)
        
        elif self.policy == LoadBalancingPolicy.LEAST_LOADED:
            # Assign to least loaded server
            for task in tasks:
                server = self.get_least_loaded_server(available_servers)
                if server:
                    distribution[server].append(task)
                    # Update load estimate
                    self.server_loads[server].current_requests += 1
        
        elif self.policy == LoadBalancingPolicy.WEIGHTED:
            # Distribute based on weights
            total_weight = sum(self.server_weights.get(s, 1) for s in available_servers)
            for task in tasks:
                rand = random.uniform(0, total_weight)
                cumulative = 0
                for server in available_servers:
                    cumulative += self.server_weights.get(server, 1)
                    if rand <= cumulative:
                        distribution[server].append(task)
                        break
        
        else:  # ADAPTIVE
            # Adaptive distribution based on current performance
            for task in tasks:
                server = self.get_least_loaded_server(available_servers)
                if server:
                    distribution[server].append(task)
                    # Adaptive adjustment
                    self.server_loads[server].current_requests += 1
        
        return dict(distribution)


class MCPFallbackManager:
    """
    Manages fallback strategies when MCP servers fail.
    
    Provides automatic failover and recovery mechanisms for
    maintaining investigation continuity.
    """
    
    def __init__(self):
        """Initialize the fallback manager."""
        self.fallback_chains = {}  # capability -> [fallback_servers]
        self.failure_history = []
        self.recovery_strategies = {}
        
    def register_fallback(
        self,
        primary_server: str,
        fallback_servers: List[str],
        capability: str
    ):
        """
        Register fallback servers for a capability.
        
        Args:
            primary_server: Primary server name
            fallback_servers: List of fallback server names
            capability: Capability to register fallback for
        """
        key = f"{primary_server}:{capability}"
        self.fallback_chains[key] = fallback_servers
    
    def get_fallback_server(
        self,
        failed_server: str,
        capability: str,
        attempted_servers: List[str] = None
    ) -> Optional[str]:
        """
        Get next fallback server for a failed request.
        
        Args:
            failed_server: Name of the failed server
            capability: Required capability
            attempted_servers: List of already attempted servers
            
        Returns:
            Next fallback server name or None
        """
        attempted_servers = attempted_servers or []
        key = f"{failed_server}:{capability}"
        
        fallback_chain = self.fallback_chains.get(key, [])
        
        for fallback in fallback_chain:
            if fallback not in attempted_servers:
                return fallback
        
        return None
    
    def record_failure(
        self,
        server_name: str,
        capability: str,
        error: str,
        task_id: str
    ):
        """
        Record a server failure.
        
        Args:
            server_name: Name of the failed server
            capability: Capability that failed
            error: Error message
            task_id: ID of the failed task
        """
        failure = {
            "server": server_name,
            "capability": capability,
            "error": error,
            "task_id": task_id,
            "timestamp": datetime.now().isoformat()
        }
        self.failure_history.append(failure)
        
        # Trigger recovery strategy if available
        strategy = self.recovery_strategies.get(server_name)
        if strategy:
            logger.info(f"Triggering recovery strategy for {server_name}: {strategy}")
    
    def can_retry(self, server_name: str, time_window_minutes: int = 5) -> bool:
        """
        Check if a server can be retried based on recent failures.
        
        Args:
            server_name: Name of the server
            time_window_minutes: Time window to check failures
            
        Returns:
            True if server can be retried
        """
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        recent_failures = [
            f for f in self.failure_history
            if f["server"] == server_name and
            datetime.fromisoformat(f["timestamp"]) > cutoff_time
        ]
        
        # Allow retry if less than 3 failures in time window
        return len(recent_failures) < 3


class MCPCoordinator:
    """
    Main coordinator for MCP server orchestration.
    
    Combines routing, load balancing, and fallback management
    for optimal MCP server utilization in fraud investigations.
    """
    
    def __init__(self):
        """Initialize the MCP coordinator."""
        self.router = IntelligentMCPRouter()
        self.load_balancer = MCPLoadBalancer()
        self.fallback_manager = MCPFallbackManager()
        self.active_tasks = {}  # task_id -> task_info
        
    async def coordinate_investigation(
        self,
        investigation_id: str,
        tasks: List[Dict[str, Any]],
        available_servers: Dict[str, List[str]]
    ) -> List[RoutingDecision]:
        """
        Coordinate an investigation across MCP servers.
        
        Args:
            investigation_id: ID of the investigation
            tasks: List of investigation tasks
            available_servers: Map of capabilities to server names
            
        Returns:
            List of routing decisions for all tasks
        """
        logger.info(f"Coordinating investigation {investigation_id} with {len(tasks)} tasks")
        
        routing_decisions = []
        
        # Group tasks by capability for better load distribution
        capability_tasks = defaultdict(list)
        for task in tasks:
            capabilities = self.router.analyze_task_requirements(task)
            for cap in capabilities:
                capability_tasks[cap].append(task)
        
        # Route and balance load for each capability group
        for capability, cap_tasks in capability_tasks.items():
            servers = available_servers.get(capability, [])
            
            if not servers:
                logger.warning(f"No servers available for capability: {capability}")
                continue
            
            # Distribute tasks across servers
            distribution = self.load_balancer.distribute_load(cap_tasks, servers)
            
            # Create routing decisions
            for server, assigned_tasks in distribution.items():
                for task in assigned_tasks:
                    decision = RoutingDecision(
                        task_id=task.get("id", f"task_{len(routing_decisions)}"),
                        server_name=server,
                        capability=capability,
                        confidence=0.85,
                        fallback_servers=[s for s in servers if s != server],
                        routing_reason=f"Load-balanced assignment for {capability}"
                    )
                    routing_decisions.append(decision)
                    
                    # Track active task
                    self.active_tasks[decision.task_id] = {
                        "investigation_id": investigation_id,
                        "task": task,
                        "decision": decision,
                        "status": "assigned"
                    }
        
        return routing_decisions
    
    async def handle_server_failure(
        self,
        task_id: str,
        failed_server: str,
        error: str
    ) -> Optional[RoutingDecision]:
        """
        Handle MCP server failure and attempt fallback.
        
        Args:
            task_id: ID of the failed task
            failed_server: Name of the failed server
            error: Error message
            
        Returns:
            New routing decision with fallback server or None
        """
        if task_id not in self.active_tasks:
            logger.error(f"Unknown task ID: {task_id}")
            return None
        
        task_info = self.active_tasks[task_id]
        original_decision = task_info["decision"]
        
        # Record failure
        self.fallback_manager.record_failure(
            failed_server,
            original_decision.capability,
            error,
            task_id
        )
        
        # Get fallback server
        fallback_server = self.fallback_manager.get_fallback_server(
            failed_server,
            original_decision.capability,
            [failed_server]
        )
        
        if not fallback_server:
            logger.error(f"No fallback available for task {task_id}")
            task_info["status"] = "failed"
            return None
        
        # Create new routing decision
        new_decision = RoutingDecision(
            task_id=task_id,
            server_name=fallback_server,
            capability=original_decision.capability,
            confidence=0.7,  # Lower confidence for fallback
            fallback_servers=[
                s for s in original_decision.fallback_servers
                if s != fallback_server
            ],
            routing_reason=f"Fallback from failed server: {failed_server}"
        )
        
        task_info["decision"] = new_decision
        task_info["status"] = "retrying"
        
        return new_decision
    
    def get_coordination_metrics(self) -> Dict[str, Any]:
        """
        Get metrics about coordination performance.
        
        Returns:
            Dictionary of coordination metrics
        """
        total_tasks = len(self.active_tasks)
        status_counts = defaultdict(int)
        
        for task_info in self.active_tasks.values():
            status_counts[task_info["status"]] += 1
        
        return {
            "total_tasks": total_tasks,
            "task_status": dict(status_counts),
            "routing_history_size": len(self.router.routing_history),
            "failure_count": len(self.fallback_manager.failure_history),
            "server_loads": {
                name: load.load_score
                for name, load in self.load_balancer.server_loads.items()
            }
        }


# Global coordinator instance
_coordinator = None


def get_mcp_coordinator() -> MCPCoordinator:
    """
    Get the global MCP coordinator instance.
    
    Returns:
        The global MCPCoordinator instance
    """
    global _coordinator
    if _coordinator is None:
        _coordinator = MCPCoordinator()
    return _coordinator