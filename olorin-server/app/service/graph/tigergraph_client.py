"""
TigerGraph Graph Database Client

Provides integration with TigerGraph for entity relationship analysis.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from pyTigerGraph import TigerGraphConnection

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TigerGraphClient:
    """
    TigerGraph graph database client for fraud detection.

    Features:
    - Entity loading (users, devices, cards, IPs)
    - Edge creation
    - GSQL query execution
    - Cluster detection
    """

    def __init__(self):
        """Initialize TigerGraph client."""
        self.config_loader = get_config_loader()
        self.host = self._load_host()
        self.username = self._load_username()
        self.password = self._load_password()
        self.graphname = self._load_graphname()
        self.conn: Optional[TigerGraphConnection] = None

        if self.host and self.username and self.password and self.graphname:
            self._initialize_connection()
        else:
            logger.warning("TigerGraph credentials not configured")

    def _load_host(self) -> Optional[str]:
        """Load TigerGraph host from config."""
        host = self.config_loader.load_secret("TIGERGRAPH_HOST")
        if not host:
            import os

            host = os.getenv("TIGERGRAPH_HOST")
        return host

    def _load_username(self) -> Optional[str]:
        """Load TigerGraph username from config."""
        username = self.config_loader.load_secret("TIGERGRAPH_USERNAME")
        if not username:
            import os

            username = os.getenv("TIGERGRAPH_USERNAME")
        return username

    def _load_password(self) -> Optional[str]:
        """Load TigerGraph password from config."""
        password = self.config_loader.load_secret("TIGERGRAPH_PASSWORD")
        if not password:
            import os

            password = os.getenv("TIGERGRAPH_PASSWORD")
        return password

    def _load_graphname(self) -> Optional[str]:
        """Load TigerGraph graph name from config."""
        graphname = self.config_loader.load_secret("TIGERGRAPH_GRAPHNAME")
        if not graphname:
            import os

            graphname = os.getenv("TIGERGRAPH_GRAPHNAME", "fraud_graph")
        return graphname

    def _initialize_connection(self) -> None:
        """Initialize TigerGraph connection."""
        try:
            self.conn = TigerGraphConnection(
                host=self.host,
                username=self.username,
                password=self.password,
                graphname=self.graphname,
            )
            logger.info(
                f"TigerGraph connection initialized: {self.host}/{self.graphname}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize TigerGraph connection: {e}")
            self.conn = None

    def is_available(self) -> bool:
        """Check if TigerGraph is available."""
        if not self.conn:
            return False
        try:
            # Test connection
            self.conn.getVertices("User", limit=1)
            return True
        except Exception:
            return False

    def load_entity(
        self, entity_type: str, entity_id: str, properties: Dict[str, Any]
    ) -> bool:
        """
        Load entity into TigerGraph.

        Args:
            entity_type: Entity type (User, Device, Card, IP)
            entity_id: Entity identifier
            properties: Entity properties

        Returns:
            True if successful, False otherwise
        """
        if not self.conn:
            logger.warning("TigerGraph connection not available")
            return False

        try:
            # Upsert vertex
            self.conn.upsertVertex(
                vertexType=entity_type, vertexId=entity_id, attributes=properties
            )
            logger.debug(f"Loaded {entity_type} entity: {entity_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to load entity: {e}", exc_info=True)
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
        Create edge between entities.

        Args:
            from_type: Source entity type
            from_id: Source entity ID
            to_type: Target entity type
            to_id: Target entity ID
            relationship_type: Edge type
            properties: Optional edge properties

        Returns:
            True if successful, False otherwise
        """
        if not self.conn:
            return False

        try:
            # Upsert edge
            self.conn.upsertEdge(
                sourceVertexType=from_type,
                sourceVertexId=from_id,
                edgeType=relationship_type,
                targetVertexType=to_type,
                targetVertexId=to_id,
                attributes=properties or {},
            )
            logger.debug(
                f"Created edge: {from_type}:{from_id} -[{relationship_type}]-> {to_type}:{to_id}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to create edge: {e}", exc_info=True)
            return False

    def execute_gsql(
        self, query: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute GSQL query.

        Args:
            query: GSQL query string
            parameters: Query parameters

        Returns:
            Query results
        """
        if not self.conn:
            logger.warning("TigerGraph connection not available")
            return []

        try:
            result = self.conn.runInstalledQuery(query, params=parameters or {})
            return result[0] if result else []
        except Exception as e:
            logger.error(f"Failed to execute GSQL query: {e}", exc_info=True)
            return []
