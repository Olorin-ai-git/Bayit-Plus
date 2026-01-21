"""
Neo4j Graph Database Client

Provides integration with Neo4j for entity relationship analysis.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from neo4j import Driver, GraphDatabase, Session

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class Neo4jClient:
    """
    Neo4j graph database client for fraud detection.

    Features:
    - Entity loading (users, devices, cards, IPs)
    - Relationship creation
    - Cypher query execution
    - Cluster detection
    """

    def __init__(self):
        """Initialize Neo4j client."""
        self.config_loader = get_config_loader()
        self.uri = self._load_uri()
        self.username = self._load_username()
        self.password = self._load_password()
        self.driver: Optional[Driver] = None

        if self.uri and self.username and self.password:
            self._initialize_driver()
        else:
            logger.warning("Neo4j credentials not configured")

    def _load_uri(self) -> Optional[str]:
        """Load Neo4j URI from config."""
        uri = self.config_loader.load_secret("NEO4J_URI")
        if not uri:
            import os

            uri = os.getenv("NEO4J_URI")
        return uri

    def _load_username(self) -> Optional[str]:
        """Load Neo4j username from config."""
        username = self.config_loader.load_secret("NEO4J_USERNAME")
        if not username:
            import os

            username = os.getenv("NEO4J_USERNAME")
        return username

    def _load_password(self) -> Optional[str]:
        """Load Neo4j password from config."""
        password = self.config_loader.load_secret("NEO4J_PASSWORD")
        if not password:
            import os

            password = os.getenv("NEO4J_PASSWORD")
        return password

    def _initialize_driver(self) -> None:
        """Initialize Neo4j driver."""
        try:
            self.driver = GraphDatabase.driver(
                self.uri, auth=(self.username, self.password)
            )
            logger.info(f"Neo4j driver initialized: {self.uri}")
        except Exception as e:
            logger.error(f"Failed to initialize Neo4j driver: {e}")
            self.driver = None

    def is_available(self) -> bool:
        """Check if Neo4j is available."""
        if not self.driver:
            return False
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            return True
        except Exception:
            return False

    def load_entity(
        self, entity_type: str, entity_id: str, properties: Dict[str, Any]
    ) -> bool:
        """
        Load entity into Neo4j graph.

        Args:
            entity_type: Entity type (User, Device, Card, IP)
            entity_id: Entity identifier
            properties: Entity properties

        Returns:
            True if successful, False otherwise
        """
        if not self.driver:
            logger.warning("Neo4j driver not available")
            return False

        try:
            with self.driver.session() as session:
                query = f"""
                    MERGE (e:{entity_type} {{id: $entity_id}})
                    SET e += $properties
                    RETURN e
                """
                session.run(query, entity_id=entity_id, properties=properties)
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
        Create relationship between entities.

        Args:
            from_type: Source entity type
            from_id: Source entity ID
            to_type: Target entity type
            to_id: Target entity ID
            relationship_type: Relationship type
            properties: Optional relationship properties

        Returns:
            True if successful, False otherwise
        """
        if not self.driver:
            return False

        try:
            with self.driver.session() as session:
                query = f"""
                    MATCH (a:{from_type} {{id: $from_id}})
                    MATCH (b:{to_type} {{id: $to_id}})
                    MERGE (a)-[r:{relationship_type}]->(b)
                    SET r += $properties
                    RETURN r
                """
                session.run(
                    query, from_id=from_id, to_id=to_id, properties=properties or {}
                )
                logger.debug(
                    f"Created relationship: {from_type}:{from_id} -[{relationship_type}]-> {to_type}:{to_id}"
                )
                return True
        except Exception as e:
            logger.error(f"Failed to create relationship: {e}", exc_info=True)
            return False

    def execute_cypher(
        self, query: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute Cypher query.

        Args:
            query: Cypher query string
            parameters: Query parameters

        Returns:
            Query results
        """
        if not self.driver:
            logger.warning("Neo4j driver not available")
            return []

        try:
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except Exception as e:
            logger.error(f"Failed to execute Cypher query: {e}", exc_info=True)
            return []

    def close(self) -> None:
        """Close Neo4j driver."""
        if self.driver:
            try:
                self.driver.close()
                logger.info("Neo4j driver closed")
            except Exception as e:
                logger.error(f"Error closing Neo4j driver: {e}")
