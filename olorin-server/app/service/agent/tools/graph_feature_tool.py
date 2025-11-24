"""
Graph Feature Tool for LangChain Agents

Provides graph-based fraud detection features for agents.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from langchain_core.tools import BaseTool
from app.service.logging import get_bridge_logger
from app.service.graph.feature_computer import FeatureComputer

logger = get_bridge_logger(__name__)


class GraphFeatureInput(BaseModel):
    """Input schema for graph feature computation."""
    entity_id: str = Field(..., description="Entity identifier (user_id, device_id, etc.)")
    entity_type: str = Field(default="User", description="Entity type: User, Device, Card, IP")
    feature_type: str = Field(
        default="all",
        description="Feature type: 'cluster_risk', 'shared_devices', 'co_travel', 'velocity', 'all'"
    )
    transaction_id: Optional[str] = Field(None, description="Optional transaction ID for context")
    tenant_id: Optional[str] = Field(None, description="Optional tenant ID for scoping")


class GraphFeatureTool(BaseTool):
    """
    Tool for computing graph-based fraud detection features.
    
    Provides:
    - Cluster detection (shared devices)
    - Cluster risk scoring
    - Shared device counting
    - Co-travel pattern detection
    - Velocity analysis across clusters
    - Feature export to Snowflake
    """
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name: str = "graph_feature_analysis"
    description: str = """
    Compute graph-based fraud detection features from graph database (Neo4j or TigerGraph).
    
    Use this tool to:
    - Detect fraud clusters (entities sharing devices)
    - Compute cluster risk scores (0.0 to 1.0)
    - Count shared devices between entities
    - Detect co-travel patterns (entities using same IPs in similar timeframes)
    - Analyze velocity across clusters (transaction frequency)
    - Export features to Snowflake for ML model scoring
    
    Input: entity_id (required), entity_type (optional, default: User), feature_type (optional, default: all), transaction_id (optional), tenant_id (optional)
    Output: Graph feature results with cluster risk, shared devices, co-travel patterns, and velocity metrics
    """
    args_schema: type[BaseModel] = GraphFeatureInput
    
    feature_computer: Optional[FeatureComputer] = None
    tenant_id: Optional[str] = None
    
    def __init__(self, tenant_id: Optional[str] = None, **kwargs):
        """Initialize graph feature tool."""
        super().__init__(**kwargs)
        object.__setattr__(self, 'feature_computer', FeatureComputer(tenant_id=tenant_id))
        object.__setattr__(self, 'tenant_id', tenant_id)
    
    def _run(
        self,
        entity_id: str,
        entity_type: str = "User",
        feature_type: str = "all",
        transaction_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> str:
        """
        Compute graph features.
        
        Args:
            entity_id: Entity identifier
            entity_type: Entity type
            feature_type: Feature type to compute
            transaction_id: Optional transaction ID
            tenant_id: Optional tenant ID
            
        Returns:
            JSON string with feature results
        """
        import json
        
        logger.info(f"🔍 [GraphFeatureTool] Starting feature computation: entity_id={entity_id}, entity_type={entity_type}, feature_type={feature_type}, transaction_id={transaction_id}, tenant_id={tenant_id}")
        
        # Use provided tenant_id or instance tenant_id
        effective_tenant_id = tenant_id or self.tenant_id
        logger.debug(f"🔍 [GraphFeatureTool] Effective tenant_id: {effective_tenant_id}")
        
        try:
            # Validate feature_computer initialization
            if self.feature_computer is None:
                raise RuntimeError("FeatureComputer not initialized")
            logger.debug(f"🔍 [GraphFeatureTool] FeatureComputer initialized: {self.feature_computer is not None}")
            
            results = {}
            
            if feature_type in ("all", "cluster_risk"):
                logger.debug(f"🔍 [GraphFeatureTool] Computing cluster_risk_score for entity_id={entity_id}, entity_type={entity_type}")
                results["cluster_risk_score"] = self.feature_computer.compute_cluster_risk_score(
                    entity_id, entity_type
                )
                logger.debug(f"🔍 [GraphFeatureTool] cluster_risk_score computed: {results.get('cluster_risk_score')}")
            
            if feature_type in ("all", "shared_devices"):
                logger.debug(f"🔍 [GraphFeatureTool] Computing shared_device_count for entity_id={entity_id}, entity_type={entity_type}")
                results["shared_device_count"] = self.feature_computer.compute_shared_device_count(
                    entity_id, entity_type
                )
                logger.debug(f"🔍 [GraphFeatureTool] shared_device_count computed: {results.get('shared_device_count')}")
            
            if feature_type in ("all", "co_travel"):
                logger.debug(f"🔍 [GraphFeatureTool] Computing co_travel_patterns for entity_id={entity_id}, entity_type={entity_type}")
                results["co_travel_patterns"] = self.feature_computer.compute_co_travel_patterns(
                    entity_id, entity_type
                )
                logger.debug(f"🔍 [GraphFeatureTool] co_travel_patterns computed: {len(results.get('co_travel_patterns', []))} patterns")
            
            if feature_type in ("all", "velocity"):
                logger.debug(f"🔍 [GraphFeatureTool] Computing velocity_across_clusters for entity_id={entity_id}, entity_type={entity_type}")
                results["velocity_across_clusters"] = self.feature_computer.compute_velocity_across_clusters(
                    entity_id, entity_type
                )
                logger.debug(f"🔍 [GraphFeatureTool] velocity_across_clusters computed: {results.get('velocity_across_clusters')}")
            
            if feature_type == "all":
                logger.debug(f"🔍 [GraphFeatureTool] Computing cluster_detection for entity_id={entity_id}, entity_type={entity_type}")
                results["cluster_detection"] = self.feature_computer.compute_cluster_detection(
                    entity_id, entity_type
                )
                logger.debug(f"🔍 [GraphFeatureTool] cluster_detection computed: {results.get('cluster_detection')}")
            
            # Export to Snowflake if transaction_id provided
            if transaction_id:
                logger.info(f"🔍 [GraphFeatureTool] Exporting features to PostgreSQL for transaction_id={transaction_id}")
                export_success = self.feature_computer.export_features_to_postgresql(
                    entity_id, entity_type, transaction_id
                )
                results["snowflake_export"] = export_success
                logger.info(f"🔍 [GraphFeatureTool] Export result: success={export_success}")
            
            logger.info(
                f"✅ [GraphFeatureTool] Feature computation completed: entity={entity_id}, type={entity_type}, "
                f"feature_type={feature_type}, tenant={effective_tenant_id}, result_keys={list(results.keys())}"
            )
            logger.debug(f"🔍 [GraphFeatureTool] Full results: {json.dumps(results, indent=2, default=str)}")
            
            result_json = json.dumps(results, indent=2, default=str)
            logger.info(f"✅ [GraphFeatureTool] Returning result, length={len(result_json)}")
            
            return result_json
            
        except Exception as e:
            logger.error(f"❌ [GraphFeatureTool] Feature computation failed: entity_id={entity_id}, entity_type={entity_type}, feature_type={feature_type}, error={e}", exc_info=True)
            error_result = json.dumps({
                "error": str(e),
                "entity_id": entity_id,
                "entity_type": entity_type,
                "feature_type": feature_type,
                "error_type": type(e).__name__,
            })
            logger.error(f"❌ [GraphFeatureTool] Returning error result: {error_result}")
            return error_result
    
    async def _arun(
        self,
        entity_id: str,
        entity_type: str = "User",
        feature_type: str = "all",
        transaction_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> str:
        """Async version of graph feature computation."""
        # FeatureComputer is synchronous, so we run in executor
        import asyncio
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._run,
            entity_id,
            entity_type,
            feature_type,
            transaction_id,
            tenant_id
        )

