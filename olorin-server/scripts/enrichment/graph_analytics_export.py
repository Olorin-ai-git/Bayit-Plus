"""
Graph Analytics Export

Exports transaction graph from Snowflake to Neo4j, runs graph algorithms,
and loads graph features back to PostgreSQL.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import text
from app.service.snowflake_service import SnowflakeConnectionFactory, SnowflakeQueryService
from app.config.snowflake_config import SnowflakeConfig
from app.persistence.database import get_db_session
from app.service.graph.neo4j_client import Neo4jClient
from app.service.logging import get_bridge_logger
from app.service.precision_detection.performance_monitor import monitor_execution_time, track_pipeline_metrics
from scripts.enrichment.graph_helpers import (
    create_graph_nodes, create_graph_edges,
    load_graph_features_batch, query_graph_features, run_gds_algorithms,
    query_snowflake_transactions, collect_nodes_and_edges
)

logger = get_bridge_logger(__name__)


@monitor_execution_time
def graph_analytics_export(
    sf_service: SnowflakeQueryService,
    neo4j_client: Neo4jClient,
    limit: Optional[int] = None
) -> Dict[str, Any]:
    """
    Export transaction graph from Snowflake to Neo4j.
    
    Creates bipartite graph: Card nodes ↔ Merchant nodes (via Transaction edges).
    Also creates fraud labels on nodes for graph feature computation.
    
    Args:
        sf_service: Snowflake query service
        neo4j_client: Neo4j client for graph operations
        limit: Optional limit on number of transactions to export
        
    Returns:
        Dictionary with export statistics
    """
    if not neo4j_client.use_neo4j or not neo4j_client.is_available():
        reason = "Neo4j disabled via USE_NEO4J=false" if not neo4j_client.use_neo4j else "Neo4j not available"
        logger.warning(f"Neo4j not available, skipping graph export: {reason}")
        return {"status": "skipped", "reason": reason}
    
    stats = {
        "cards_created": 0,
        "merchants_created": 0,
        "transactions_created": 0,
        "fraud_labels_created": 0,
        "start_time": datetime.now()
    }
    
    try:
        # Query Snowflake for transaction graph data
        logger.info(f"Querying Snowflake for transaction graph data...")
        transactions = query_snowflake_transactions(sf_service, limit=limit)
        
        if not transactions:
            logger.warning("No transaction graph data found in Snowflake")
            return {"status": "skipped", "reason": "No data"}
        
        logger.info(f"Found {len(transactions)} transactions to export")
        
        # Clear existing graph (optional - comment out if you want incremental updates)
        logger.info("Clearing existing graph...")
        with neo4j_client.driver.session(database=neo4j_client.database) as session:
            session.run("MATCH (n) DETACH DELETE n")
        
        # Collect nodes and edges
        batch_size = 1000
        cards, merchants, fraud_cards, fraud_merchants = collect_nodes_and_edges(transactions)
        
        # Create nodes and edges using helper functions
        node_stats = create_graph_nodes(
            neo4j_client, cards, merchants, fraud_cards, fraud_merchants, batch_size
        )
        stats["cards_created"] = node_stats["cards_created"]
        stats["merchants_created"] = node_stats["merchants_created"]
        
        stats["transactions_created"] = create_graph_edges(
            neo4j_client, transactions, batch_size
        )
        
        stats["fraud_labels_created"] = len(fraud_cards) + len(fraud_merchants)
        stats["end_time"] = datetime.now()
        stats["duration_seconds"] = (stats["end_time"] - stats["start_time"]).total_seconds()
        
        logger.info(
            f"Graph export complete: {stats['cards_created']} cards, "
            f"{stats['merchants_created']} merchants, {stats['transactions_created']} transactions"
        )
        
        track_pipeline_metrics("Graph Analytics Export", {
            "cards_created": stats["cards_created"],
            "merchants_created": stats["merchants_created"],
            "transactions_created": stats["transactions_created"],
            "execution_time_seconds": stats["duration_seconds"]
        })
        
        return stats
        
    except Exception as e:
        logger.error(f"Graph analytics export failed: {e}", exc_info=True)
        stats["error"] = str(e)
        stats["end_time"] = datetime.now()
        raise


@monitor_execution_time
def load_graph_features_to_postgres(
    neo4j_client: Neo4jClient,
    limit: Optional[int] = None
) -> Dict[str, Any]:
    """
    Export graph features from Neo4j to PostgreSQL.
    
    Computes graph features:
    - Component fraud rate (fraud ratio within weakly connected component)
    - Shortest path to fraud (minimum hops to nearest fraud node)
    - PageRank scores
    - Common neighbors (shared cards between merchants)
    
    Args:
        neo4j_client: Neo4j client for graph operations
        limit: Optional limit on number of transactions to process
        
    Returns:
        Dictionary with export statistics
    """
    if not neo4j_client.use_neo4j or not neo4j_client.is_available():
        reason = "Neo4j disabled via USE_NEO4J=false" if not neo4j_client.use_neo4j else "Neo4j not available"
        logger.warning(f"Neo4j not available, skipping graph feature export: {reason}")
        return {"status": "skipped", "reason": reason}
    
    stats = {
        "components_computed": 0,
        "pagerank_computed": 0,
        "shortest_paths_computed": 0,
        "features_loaded": 0,
        "start_time": datetime.now()
    }
    
    try:
        # Run GDS algorithms using helper function
        gds_results = run_gds_algorithms(neo4j_client)
        stats["components_computed"] = gds_results["components_computed"]
        stats["pagerank_computed"] = gds_results["pagerank_computed"]
        stats["shortest_paths_computed"] = gds_results["shortest_paths_computed"]
        
        # Query graph features for transactions
        logger.info("Querying graph features from Neo4j...")
        features = query_graph_features(neo4j_client, limit=limit)
        
        # Load features into PostgreSQL using helper function
        with get_db_session() as db:
            stats["features_loaded"] = load_graph_features_batch(db, features)
            db.commit()
        
        stats["end_time"] = datetime.now()
        stats["duration_seconds"] = (stats["end_time"] - stats["start_time"]).total_seconds()
        
        logger.info(
            f"Graph features loaded: {stats['features_loaded']} transactions "
            f"in {stats['duration_seconds']:.2f} seconds"
        )
        
        track_pipeline_metrics("Graph Features Export", {
            "features_loaded": stats["features_loaded"],
            "execution_time_seconds": stats["duration_seconds"]
        })
        
        return stats
        
    except Exception as e:
        logger.error(f"Graph features export failed: {e}", exc_info=True)
        stats["error"] = str(e)
        stats["end_time"] = datetime.now()
        raise


def main():
    """Main graph analytics export entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Export graph analytics from Snowflake to Neo4j")
    parser.add_argument("--limit", type=int, help="Maximum number of transactions to export")
    parser.add_argument("--export-only", action="store_true", help="Only export graph, skip feature computation")
    parser.add_argument("--features-only", action="store_true", help="Only compute features, skip graph export")
    
    args = parser.parse_args()
    
    # Initialize services
    config = SnowflakeConfig()
    connection_factory = SnowflakeConnectionFactory(config)
    sf_service = SnowflakeQueryService(connection_factory)
    neo4j_client = Neo4jClient()
    
    if not args.features_only:
        export_stats = graph_analytics_export(sf_service, neo4j_client, limit=args.limit)
        print(f"Graph export: {export_stats.get('cards_created', 0)} cards, "
              f"{export_stats.get('merchants_created', 0)} merchants")
    
    if not args.export_only:
        feature_stats = load_graph_features_to_postgres(neo4j_client, limit=args.limit)
        print(f"Graph features loaded: {feature_stats.get('features_loaded', 0)} transactions")


if __name__ == "__main__":
    main()

