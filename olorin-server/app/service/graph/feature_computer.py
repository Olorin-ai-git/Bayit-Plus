"""
Graph Feature Computer Service

Computes fraud detection features from graph database:
- Cluster detection (shared devices)
- Cluster risk scores
- Shared device counts
- Co-travel patterns
- Velocity across clusters
"""

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text

from app.persistence.database import get_db_session
from app.service.cache.redis_client import CacheService
from app.service.config_loader import get_config_loader
from app.service.graph.graph_client_abstraction import (
    GraphClientAbstraction,
    GraphProvider,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class FeatureComputer:
    """
    Computes graph-based fraud detection features.

    Features:
    - Cluster detection (shared devices)
    - Cluster risk scoring
    - Shared device counting
    - Co-travel pattern detection
    - Velocity analysis across clusters
    - Feature export to Snowflake
    - Feature caching for performance
    """

    def __init__(
        self,
        graph_client: Optional[GraphClientAbstraction] = None,
        redis_client: Optional[CacheService] = None,
        tenant_id: Optional[str] = None,
    ):
        """
        Initialize feature computer.

        Args:
        graph_client: Optional graph client abstraction
        redis_client: Optional Redis client for caching
        tenant_id: Optional tenant ID
        """
        self.config_loader = get_config_loader()
        self.tenant_id = tenant_id
        self.graph_client = graph_client or GraphClientAbstraction(tenant_id=tenant_id)
        self.redis_client = redis_client or CacheService()
        self.cache_ttl_seconds = 3600  # 1 hour cache TTL

    def compute_cluster_detection(
        self, entity_id: str, entity_type: str = "User"
    ) -> Dict[str, Any]:
        """
        Detect clusters based on shared devices.

        Args:
            entity_id: Entity identifier
            entity_type: Entity type (User, Device, Card, IP)

        Returns:
            Cluster detection results
        """
        if not self.graph_client.is_available():
            logger.warning(
                "Graph database not available, returning empty cluster detection"
            )
            return {"clusters": [], "cluster_count": 0}

        try:
            # Check cache first
            cache_key = f"cluster_detection:{entity_type}:{entity_id}"
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)

            # Execute cluster detection query
            if self.graph_client.get_provider() == GraphProvider.NEO4J:
                query = """
                    MATCH (e:{entity_type} {{id: $entity_id}})-[:USES]->(d:Device)<-[:USES]-(other:{entity_type})
                    WHERE e.id <> other.id
                    WITH other, COUNT(DISTINCT d) as shared_devices
                    WHERE shared_devices >= 2
                    RETURN other.id as entity_id, shared_devices
                    ORDER BY shared_devices DESC
                """.format(
                    entity_type=entity_type
                )
            else:  # TigerGraph
                query = "getSharedDeviceClusters"

            results = self.graph_client.execute_query(query, {"entity_id": entity_id})

            clusters = [
                {
                    "entity_id": r.get("entity_id"),
                    "shared_devices": r.get("shared_devices", 0),
                }
                for r in results
            ]

            result = {
                "clusters": clusters,
                "cluster_count": len(clusters),
                "computed_at": datetime.utcnow().isoformat(),
            }

            # Cache result
            self.redis_client.set(
                cache_key, json.dumps(result), ttl=self.cache_ttl_seconds
            )

            return result

        except Exception as e:
            logger.error(f"Failed to compute cluster detection: {e}", exc_info=True)
            return {"clusters": [], "cluster_count": 0, "error": str(e)}

    def compute_cluster_risk_score(
        self, entity_id: str, entity_type: str = "User"
    ) -> float:
        """
        Compute cluster risk score for entity.

        Args:
            entity_id: Entity identifier
            entity_type: Entity type

        Returns:
            Risk score (0.0 to 1.0)
        """
        try:
            # Check cache
            cache_key = f"cluster_risk:{entity_type}:{entity_id}"
            cached_score = self.redis_client.get(cache_key)
            if cached_score:
                return float(cached_score)

            # Get cluster detection results
            clusters = self.compute_cluster_detection(entity_id, entity_type)

            # Compute risk score based on:
            # - Number of clusters
            # - Shared device counts
            # - Cluster size

            cluster_count = clusters.get("cluster_count", 0)
            total_shared_devices = sum(
                c.get("shared_devices", 0) for c in clusters.get("clusters", [])
            )

            # Risk score formula
            risk_score = min(1.0, (cluster_count * 0.2) + (total_shared_devices * 0.1))

            # Cache result
            self.redis_client.set(
                cache_key, str(risk_score), ttl=self.cache_ttl_seconds
            )

            return risk_score

        except Exception as e:
            logger.error(f"Failed to compute cluster risk score: {e}", exc_info=True)
            return 0.0

    def compute_shared_device_count(
        self, entity_id: str, entity_type: str = "User"
    ) -> int:
        """
        Compute shared device count for entity.

        Args:
            entity_id: Entity identifier
            entity_type: Entity type

        Returns:
            Number of shared devices
        """
        try:
            # Check cache
            cache_key = f"shared_devices:{entity_type}:{entity_id}"
            cached_count = self.redis_client.get(cache_key)
            if cached_count:
                return int(cached_count)

            if not self.graph_client.is_available():
                return 0

            # Query for shared devices
            if self.graph_client.get_provider() == GraphProvider.NEO4J:
                query = """
                    MATCH (e:{entity_type} {{id: $entity_id}})-[:USES]->(d:Device)<-[:USES]-(other:{entity_type})
                    WHERE e.id <> other.id
                    RETURN COUNT(DISTINCT d) as shared_count
                """.format(
                    entity_type=entity_type
                )
            else:  # TigerGraph
                query = "getSharedDeviceCount"

            results = self.graph_client.execute_query(query, {"entity_id": entity_id})

            shared_count = results[0].get("shared_count", 0) if results else 0

            # Cache result
            self.redis_client.set(
                cache_key, str(shared_count), ttl=self.cache_ttl_seconds
            )

            return shared_count

        except Exception as e:
            logger.error(f"Failed to compute shared device count: {e}", exc_info=True)
            return 0

    def compute_co_travel_patterns(
        self, entity_id: str, entity_type: str = "User", time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Detect co-travel patterns (entities using same IPs in similar timeframes).

        Args:
            entity_id: Entity identifier
            entity_type: Entity type
            time_window_hours: Time window for co-travel detection

        Returns:
            Co-travel pattern results
        """
        try:
            if not self.graph_client.is_available():
                return {"patterns": [], "pattern_count": 0}

            # Check cache
            cache_key = f"co_travel:{entity_type}:{entity_id}:{time_window_hours}"
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)

            # Query for co-travel patterns
            if self.graph_client.get_provider() == GraphProvider.NEO4J:
                query = """
                    MATCH (e:{entity_type} {{id: $entity_id}})-[:USES_IP]->(ip:IP)<-[:USES_IP]-(other:{entity_type})
                    WHERE e.id <> other.id
                      AND abs(e.timestamp - other.timestamp) < $time_window_seconds
                    RETURN other.id as entity_id, ip.id as ip_address, COUNT(*) as co_travel_count
                    ORDER BY co_travel_count DESC
                """.format(
                    entity_type=entity_type
                )
            else:  # TigerGraph
                query = "getCoTravelPatterns"

            time_window_seconds = time_window_hours * 3600
            results = self.graph_client.execute_query(
                query,
                {"entity_id": entity_id, "time_window_seconds": time_window_seconds},
            )

            patterns = [
                {
                    "entity_id": r.get("entity_id"),
                    "ip_address": r.get("ip_address"),
                    "co_travel_count": r.get("co_travel_count", 0),
                }
                for r in results
            ]

            result = {
                "patterns": patterns,
                "pattern_count": len(patterns),
                "computed_at": datetime.utcnow().isoformat(),
            }

            # Cache result
            self.redis_client.set(
                cache_key, json.dumps(result), ttl=self.cache_ttl_seconds
            )

            return result

        except Exception as e:
            logger.error(f"Failed to compute co-travel patterns: {e}", exc_info=True)
            return {"patterns": [], "pattern_count": 0, "error": str(e)}

    def compute_velocity_across_clusters(
        self, entity_id: str, entity_type: str = "User", time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Compute velocity metrics across clusters.

        Args:
            entity_id: Entity identifier
            entity_type: Entity type
            time_window_hours: Time window for velocity calculation

        Returns:
            Velocity metrics
        """
        try:
            if not self.graph_client.is_available():
                return {"velocity": 0, "cluster_velocity": []}

            # Check cache
            cache_key = (
                f"velocity_clusters:{entity_type}:{entity_id}:{time_window_hours}"
            )
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)

            # Get clusters
            clusters = self.compute_cluster_detection(entity_id, entity_type)

            # Compute velocity for each cluster
            cluster_velocities = []
            for cluster in clusters.get("clusters", []):
                cluster_entity_id = cluster.get("entity_id")

                # Query for transaction count in time window
                if self.graph_client.get_provider() == GraphProvider.NEO4J:
                    query = """
                        MATCH (e:{entity_type} {{id: $entity_id}})-[:HAS_TRANSACTION]->(t:Transaction)
                        WHERE t.timestamp > datetime() - duration({{hours: $time_window_hours}})
                        RETURN COUNT(t) as transaction_count
                    """.format(
                        entity_type=entity_type
                    )
                else:  # TigerGraph
                    query = "getTransactionVelocity"

                results = self.graph_client.execute_query(
                    query,
                    {
                        "entity_id": cluster_entity_id,
                        "time_window_hours": time_window_hours,
                    },
                )

                transaction_count = (
                    results[0].get("transaction_count", 0) if results else 0
                )
                velocity = (
                    transaction_count / time_window_hours
                )  # Transactions per hour

                cluster_velocities.append(
                    {
                        "entity_id": cluster_entity_id,
                        "velocity": velocity,
                        "transaction_count": transaction_count,
                    }
                )

            # Compute total velocity
            total_velocity = sum(cv.get("velocity", 0) for cv in cluster_velocities)

            result = {
                "velocity": total_velocity,
                "cluster_velocity": cluster_velocities,
                "computed_at": datetime.utcnow().isoformat(),
            }

            # Cache result
            self.redis_client.set(
                cache_key, json.dumps(result), ttl=self.cache_ttl_seconds
            )

            return result

        except Exception as e:
            logger.error(
                f"Failed to compute velocity across clusters: {e}", exc_info=True
            )
            return {"velocity": 0, "cluster_velocity": [], "error": str(e)}

    def export_features_to_postgresql(
        self,
        entity_id: str,
        entity_type: str = "User",
        transaction_id: Optional[str] = None,
    ) -> bool:
        """
        Export computed graph features to PostgreSQL graph_features table.

        Args:
            entity_id: Entity identifier
            entity_type: Entity type
            transaction_id: Optional transaction ID

        Returns:
            True if successful, False otherwise
        """
        try:
            # Compute all features
            cluster_risk = self.compute_cluster_risk_score(entity_id, entity_type)
            shared_devices = self.compute_shared_device_count(entity_id, entity_type)
            co_travel = self.compute_co_travel_patterns(entity_id, entity_type)
            velocity = self.compute_velocity_across_clusters(entity_id, entity_type)

            with get_db_session() as db:
                # Build INSERT query
                query = text(
                    """
                    INSERT INTO graph_features (
                        entity_id, entity_type, tenant_id,
                        cluster_risk_score, shared_device_count,
                        co_travel_patterns, velocity_across_clusters,
                        graph_provider, computed_at
                    ) VALUES (
                        :entity_id, :entity_type, :tenant_id,
                        :cluster_risk_score, :shared_device_count,
                        :co_travel_patterns, :velocity_across_clusters,
                        :graph_provider, :computed_at
                    )
                    ON CONFLICT (entity_id, entity_type) DO UPDATE SET
                        cluster_risk_score = EXCLUDED.cluster_risk_score,
                        shared_device_count = EXCLUDED.shared_device_count,
                        co_travel_patterns = EXCLUDED.co_travel_patterns,
                        velocity_across_clusters = EXCLUDED.velocity_across_clusters,
                        updated_at = CURRENT_TIMESTAMP
                """
                )

                # Prepare parameters
                params = {
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "tenant_id": self.tenant_id or "default",
                    "cluster_risk_score": cluster_risk,
                    "shared_device_count": shared_devices,
                    "co_travel_patterns": json.dumps(co_travel),
                    "velocity_across_clusters": json.dumps(velocity),
                    "graph_provider": self.graph_client.get_provider().value,
                    "computed_at": datetime.utcnow(),
                }

                # Execute query
                db.execute(query, params)
                db.commit()

                logger.info(f"Exported graph features to PostgreSQL: {entity_id}")
                return True

        except Exception as e:
            logger.error(f"Failed to export features to PostgreSQL: {e}", exc_info=True)
            return False
