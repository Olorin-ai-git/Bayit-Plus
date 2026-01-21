"""
Graph Database Abstraction Layer

Provides unified interface for both Neo4j and TigerGraph.
Supports tenant/environment configuration for graph database selection.
"""

import logging
from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from app.service.config_loader import get_config_loader
from app.service.graph.neo4j_client import Neo4jClient
from app.service.graph.tigergraph_client import TigerGraphClient
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class GraphProvider(str, Enum):
    """Graph database provider options."""

    NEO4J = "neo4j"
    TIGERGRAPH = "tigergraph"


class GraphClientAbstraction:
    """
    Abstraction layer for graph database operations.

    Supports both Neo4j and TigerGraph with tenant/environment configuration.
    Provides graceful degradation when configured database is unavailable.
    """

    def __init__(
        self, provider: Optional[GraphProvider] = None, tenant_id: Optional[str] = None
    ):
        """
        Initialize graph client abstraction.

        Args:
            provider: Optional explicit provider (overrides config)
            tenant_id: Optional tenant ID for tenant-specific config
        """
        self.config_loader = get_config_loader()
        self.tenant_id = tenant_id

        # Determine provider
        if provider:
            self.provider = provider
        else:
            self.provider = self._get_configured_provider()

        # Initialize clients
        self.neo4j_client = (
            Neo4jClient() if self.provider == GraphProvider.NEO4J else None
        )
        self.tigergraph_client = (
            TigerGraphClient() if self.provider == GraphProvider.TIGERGRAPH else None
        )

        # Verify availability
        self._verify_availability()

    def _get_configured_provider(self) -> GraphProvider:
        """
        Get configured graph provider from tenant/environment config.

        Returns:
            GraphProvider enum value
        """
        # Check tenant-specific config first
        if self.tenant_id:
            tenant_provider = self.config_loader.load_secret(
                f"TENANT_{self.tenant_id}_GRAPH_PROVIDER"
            )
            if tenant_provider:
                try:
                    return GraphProvider(tenant_provider.lower())
                except ValueError:
                    logger.warning(f"Invalid tenant graph provider: {tenant_provider}")

        # Check environment-level config
        env_provider = self.config_loader.load_secret("GRAPH_PROVIDER")
        if env_provider:
            try:
                return GraphProvider(env_provider.lower())
            except ValueError:
                logger.warning(f"Invalid environment graph provider: {env_provider}")

        # Default to Neo4j
        logger.info("No graph provider configured, defaulting to Neo4j")
        return GraphProvider.NEO4J

    def _verify_availability(self) -> None:
        """Verify configured provider is available."""
        if self.provider == GraphProvider.NEO4J:
            if not self.neo4j_client or not self.neo4j_client.is_available():
                logger.warning(
                    "Neo4j not available, graph operations will fail gracefully"
                )
        elif self.provider == GraphProvider.TIGERGRAPH:
            if not self.tigergraph_client or not self.tigergraph_client.is_available():
                logger.warning(
                    "TigerGraph not available, graph operations will fail gracefully"
                )

    def is_available(self) -> bool:
        """Check if configured graph database is available."""
        if self.provider == GraphProvider.NEO4J:
            return self.neo4j_client is not None and self.neo4j_client.is_available()
        elif self.provider == GraphProvider.TIGERGRAPH:
            return (
                self.tigergraph_client is not None
                and self.tigergraph_client.is_available()
            )
        return False

    def load_entity(
        self, entity_type: str, entity_id: str, properties: Dict[str, Any]
    ) -> bool:
        """
        Load entity into graph database.

        Args:
            entity_type: Entity type (User, Device, Card, IP)
            entity_id: Entity identifier
            properties: Entity properties

        Returns:
            True if successful, False otherwise (graceful degradation)
        """
        if not self.is_available():
            logger.warning(
                f"Graph database not available, skipping entity load: {entity_type}:{entity_id}"
            )
            return False

        try:
            if self.provider == GraphProvider.NEO4J:
                return self.neo4j_client.load_entity(entity_type, entity_id, properties)
            elif self.provider == GraphProvider.TIGERGRAPH:
                return self.tigergraph_client.load_entity(
                    entity_type, entity_id, properties
                )
        except Exception as e:
            logger.error(f"Failed to load entity: {e}", exc_info=True)
            return False

        return False

    def create_relationship(
        self,
        from_type: str,
        from_id: str,
        to_type: str,
        to_id: str,
        relationship_type: str,
        properties: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Create relationship between entities.

        Args:
            from_type: Source entity type
            from_id: Source entity ID
            to_type: Target entity type
            to_id: Target entity ID
            relationship_type: Relationship type
            properties: Optional relationship properties

        Returns:
            True if successful, False otherwise (graceful degradation)
        """
        if not self.is_available():
            logger.warning(
                "Graph database not available, skipping relationship creation"
            )
            return False

        try:
            if self.provider == GraphProvider.NEO4J:
                return self.neo4j_client.create_relationship(
                    from_type, from_id, to_type, to_id, relationship_type, properties
                )
            elif self.provider == GraphProvider.TIGERGRAPH:
                return self.tigergraph_client.create_relationship(
                    from_type, from_id, to_type, to_id, relationship_type, properties
                )
        except Exception as e:
            logger.error(f"Failed to create relationship: {e}", exc_info=True)
            return False

        return False

    def execute_query(
        self, query: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute graph query (Cypher for Neo4j, GSQL for TigerGraph).

        Args:
            query: Query string
            parameters: Query parameters

        Returns:
            Query results (empty list on failure - graceful degradation)
        """
        if not self.is_available():
            logger.warning(
                "Graph database not available, returning empty query results"
            )
            return []

        try:
            if self.provider == GraphProvider.NEO4J:
                return self.neo4j_client.execute_cypher(query, parameters)
            elif self.provider == GraphProvider.TIGERGRAPH:
                return self.tigergraph_client.execute_gsql(query, parameters)
        except Exception as e:
            logger.error(f"Failed to execute query: {e}", exc_info=True)
            return []

        return []

    def get_provider(self) -> GraphProvider:
        """Get current graph provider."""
        return self.provider

    def close(self) -> None:
        """Close graph database connections."""
        if self.neo4j_client:
            self.neo4j_client.close()
        if self.tigergraph_client:
            # TigerGraph doesn't have explicit close, but we can clear reference
            self.tigergraph_client = None
