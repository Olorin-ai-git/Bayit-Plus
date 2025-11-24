"""
Graph Analytics Helper Functions

Helper functions for graph export and feature computation.
"""

from typing import List, Dict, Any, Set, Optional
from app.service.logging import get_bridge_logger
from app.service.graph.neo4j_client import Neo4jClient
from app.service.snowflake_service import SnowflakeQueryService

logger = get_bridge_logger(__name__)


def create_graph_nodes(
    neo4j_client: Neo4jClient,
    cards: Set[str],
    merchants: Set[str],
    fraud_cards: Set[str],
    fraud_merchants: Set[str],
    batch_size: int = 1000
) -> Dict[str, int]:
    """
    Create card and merchant nodes in Neo4j.
    
    Returns:
        Dictionary with cards_created and merchants_created counts
    """
    stats = {"cards_created": 0, "merchants_created": 0}
    
    # Create card nodes
    logger.info(f"Creating {len(cards)} card nodes...")
    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        for i, card_id in enumerate(cards):
            if i % batch_size == 0 and i > 0:
                session.commit()
            
            is_fraud = card_id in fraud_cards
            session.run(
                "MERGE (c:Card {id: $card_id}) SET c.fraud = $is_fraud",
                card_id=card_id, is_fraud=is_fraud
            )
        
        session.commit()
        stats["cards_created"] = len(cards)
    
    # Create merchant nodes
    logger.info(f"Creating {len(merchants)} merchant nodes...")
    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        for i, merchant_id in enumerate(merchants):
            if i % batch_size == 0 and i > 0:
                session.commit()
            
            is_fraud = merchant_id in fraud_merchants
            session.run(
                "MERGE (m:Merchant {id: $merchant_id}) SET m.fraud = $is_fraud",
                merchant_id=merchant_id, is_fraud=is_fraud
            )
        
        session.commit()
        stats["merchants_created"] = len(merchants)
    
    return stats


def create_graph_edges(
    neo4j_client: Neo4jClient,
    transactions: List[Dict[str, Any]],
    batch_size: int = 1000
) -> int:
    """
    Create transaction edges in Neo4j.
    
    Returns:
        Number of transactions created
    """
    logger.info(f"Creating {len(transactions)} transaction edges...")
    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        for i, txn in enumerate(transactions):
            if i % batch_size == 0 and i > 0:
                session.commit()
            
            card_id = txn.get("card_id")
            merchant_id = txn.get("merchant_id")
            txn_id = txn.get("txn_id")
            txn_ts = txn.get("txn_ts")
            
            if card_id and merchant_id:
                session.run(
                    """
                    MATCH (c:Card {id: $card_id})
                    MATCH (m:Merchant {id: $merchant_id})
                    CREATE (c)-[:TRANSACTED_WITH {txn_id: $txn_id, txn_ts: $txn_ts}]->(m)
                    """,
                    card_id=card_id, merchant_id=merchant_id,
                    txn_id=txn_id, txn_ts=str(txn_ts) if txn_ts else None
                )
        
        session.commit()
    
    return len(transactions)


def get_fraud_node_ids(neo4j_client: Neo4jClient) -> List[str]:
    """Get list of fraud node IDs from Neo4j."""
    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        fraud_nodes_query = """
        MATCH (n)
        WHERE n.fraud = true
        RETURN id(n) as nodeId
        """
        fraud_nodes = session.run(fraud_nodes_query)
        return [str(record["nodeId"]) for record in fraud_nodes]


def load_graph_features_batch(
    db,
    features: List[Dict[str, Any]]
) -> int:
    """
    Load graph features batch into PostgreSQL.
    
    Returns:
        Number of features loaded
    """
    from sqlalchemy import text
    
    loaded = 0
    for record in features:
        txn_id = record.get("txn_id")
        if not txn_id:
            continue
        
        update_query = text("""
            INSERT INTO pg_enrichment_scores (
                txn_id, graph_component_fraud_rate, graph_shortest_path_to_fraud,
                graph_common_neighbors, graph_pagerank_score
            ) VALUES (
                :txn_id, :component_fraud_rate, :shortest_path, :common_neighbors, :pagerank
            )
            ON CONFLICT (txn_id) DO UPDATE SET
                graph_component_fraud_rate = EXCLUDED.graph_component_fraud_rate,
                graph_shortest_path_to_fraud = EXCLUDED.graph_shortest_path_to_fraud,
                graph_common_neighbors = EXCLUDED.graph_common_neighbors,
                graph_pagerank_score = EXCLUDED.graph_pagerank_score,
                enriched_at = NOW()
        """)
        
        component_fraud_rate = None
        if record.get("card_fraud") or record.get("merchant_fraud"):
            component_fraud_rate = 1.0
        
        shortest_path = None
        if record.get("fraud_merchant_count", 0) > 0 or record.get("fraud_card_count", 0) > 0:
            shortest_path = 1
        
        db.execute(update_query, {
            "txn_id": txn_id,
            "component_fraud_rate": component_fraud_rate,
            "shortest_path": shortest_path,
            "common_neighbors": record.get("common_neighbors"),
            "pagerank": None
        })
        loaded += 1
    
    return loaded


def query_graph_features(neo4j_client: Neo4jClient, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Query graph features from Neo4j for all transactions."""
    query = """
    MATCH (c:Card)-[t:TRANSACTED_WITH]->(m:Merchant)
    OPTIONAL MATCH (c)-[:TRANSACTED_WITH]->(m2:Merchant)
    WHERE m2.fraud = true
    WITH c, m, t, COUNT(DISTINCT m2) as fraud_merchant_count
    OPTIONAL MATCH (c2:Card)-[:TRANSACTED_WITH]->(m)
    WHERE c2.fraud = true
    WITH c, m, t, fraud_merchant_count, COUNT(DISTINCT c2) as fraud_card_count
    OPTIONAL MATCH (c)-[:TRANSACTED_WITH]->(shared:Merchant)<-[:TRANSACTED_WITH]-(c3:Card)
    WHERE c3 <> c
    WITH c, m, t, fraud_merchant_count, fraud_card_count,
         COUNT(DISTINCT c3) as common_neighbors
    RETURN t.txn_id as txn_id,
           fraud_merchant_count,
           fraud_card_count,
           common_neighbors,
           c.fraud as card_fraud,
           m.fraud as merchant_fraud
    """
    
    if limit:
        query += f" LIMIT {limit}"
    
    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        results = session.run(query)
        return [record.data() for record in results]


def run_gds_algorithms(neo4j_client: Neo4jClient) -> Dict[str, Any]:
    """
    Run GDS algorithms (components, PageRank, shortest paths).
    
    Returns:
        Dictionary with algorithm results
    """
    from app.service.logging import get_bridge_logger
    logger = get_bridge_logger(__name__)
    
    results = {
        "components_computed": 0,
        "pagerank_computed": 0,
        "shortest_paths_computed": 0
    }
    
    logger.info("Running GDS Weakly Connected Components...")
    components_result = neo4j_client.run_gds_components()
    if components_result:
        results["components_computed"] = len(components_result)
    
    logger.info("Running GDS PageRank...")
    pagerank_result = neo4j_client.run_gds_pagerank()
    if pagerank_result:
        results["pagerank_computed"] = len(pagerank_result)
    
    logger.info("Computing shortest paths to fraud...")
    fraud_node_ids = get_fraud_node_ids(neo4j_client)
    
    if fraud_node_ids:
        shortest_paths_result = neo4j_client.compute_shortest_paths_to_fraud(
            fraud_node_ids=fraud_node_ids,
            node_label="Card"
        )
        if shortest_paths_result:
            results["shortest_paths_computed"] = len(shortest_paths_result)
    else:
        logger.warning("No fraud nodes found for shortest path computation")
    
    return results


def query_snowflake_transactions(
    sf_service: SnowflakeQueryService,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Query Snowflake for transaction graph data."""
    table_name = sf_service.table_name
    query = f"""
    SELECT DISTINCT
        COALESCE(BIN, '') || COALESCE(LAST_FOUR, '') as card_id,
        {sf_service.connection_factory.config.store_id_column} as merchant_id,
        {sf_service.connection_factory.config.tx_id_column} as txn_id,
        {sf_service.connection_factory.config.tx_datetime_column} as txn_ts,
        {sf_service.connection_factory.config.is_fraud_tx_column} as is_fraud
    FROM {table_name}
    WHERE BIN IS NOT NULL AND LAST_FOUR IS NOT NULL
      AND {sf_service.connection_factory.config.store_id_column} IS NOT NULL
    ORDER BY {sf_service.connection_factory.config.tx_datetime_column} DESC
    """
    
    if limit:
        query += f" LIMIT {limit}"
    
    return sf_service.execute_query(query)


def collect_nodes_and_edges(
    transactions: List[Dict[str, Any]]
) -> tuple[Set[str], Set[str], Set[str], Set[str]]:
    """
    Collect card and merchant nodes and fraud labels from transactions.
    
    Returns:
        Tuple of (cards, merchants, fraud_cards, fraud_merchants)
    """
    cards = set()
    merchants = set()
    fraud_cards = set()
    fraud_merchants = set()
    
    for txn in transactions:
        card_id = txn.get("card_id")
        merchant_id = txn.get("merchant_id")
        is_fraud = txn.get("is_fraud") == 1 or txn.get("is_fraud") == True
        
        if card_id and merchant_id:
            cards.add(card_id)
            merchants.add(merchant_id)
            
            if is_fraud:
                fraud_cards.add(card_id)
                fraud_merchants.add(merchant_id)
    
    return cards, merchants, fraud_cards, fraud_merchants

