"""
Investigation Indexer Service
Automatically indexes investigation results for RAG system.
All configuration from environment variables - no hardcoded values.
"""

import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, and_

from app.service.database.vector_database_config import get_vector_db_config
from app.service.database.models import DocumentCollection, Document, DocumentChunk
from app.service.rag.vector_rag_service import get_rag_service
from app.service.rag.embedding_service import get_embedding_service
from app.persistence.database import get_db_session
from app.models.investigation_state import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationIndexer:
    """Service for indexing investigation results."""
    
    def __init__(self):
        """Initialize investigation indexer."""
        self.db_config = get_vector_db_config()
        self.rag_service = get_rag_service()
        self.embedding_service = get_embedding_service()
        self.investigation_collection_id: Optional[str] = None
    
    async def ensure_investigation_collection(self) -> str:
        """Ensure investigation collection exists."""
        if self.investigation_collection_id:
            return self.investigation_collection_id
        
        async with self.db_config.session() as session:
            query = select(DocumentCollection).where(
                DocumentCollection.name == "investigation_results"
            )
            if self.db_config.is_postgresql:
                result = await session.execute(query)
            else:
                result = session.execute(query)
            collection = result.scalar_one_or_none()
            
            if not collection:
                collection = DocumentCollection(
                    name="investigation_results",
                    description="Investigation results indexed for RAG"
                )
                session.add(collection)
                if self.db_config.is_postgresql:
                    await session.commit()
                    await session.refresh(collection)
                else:
                    session.commit()
                    session.refresh(collection)
            
            self.investigation_collection_id = collection.id
            return collection.id
    
    async def index_investigation(self, investigation_id: str) -> bool:
        """Index a single investigation."""
        try:
            with get_db_session() as session:
                query = select(InvestigationState).where(
                    InvestigationState.investigation_id == investigation_id,
                    InvestigationState.status == "COMPLETED"
                )
                investigation = session.execute(query).scalar_one_or_none()
                
                if not investigation:
                    logger.warning(f"Investigation {investigation_id} not found or not completed")
                    return False
                
                text_content, entities_list = self.format_investigation_for_rag(investigation)
                chunks = self.chunk_investigation_data(text_content)
                
                collection_id = await self.ensure_investigation_collection()
                
                await self.store_investigation_chunks(
                    investigation_id,
                    investigation.user_id,
                    investigation.status,
                    chunks,
                    collection_id,
                    investigation.created_at,
                    investigation.updated_at,
                    entities_list
                )
                
                logger.info(f"Indexed investigation {investigation_id} with {len(chunks)} chunks")
                return True
        except Exception as e:
            logger.error(f"Failed to index investigation {investigation_id}: {e}")
            return False
    
    def format_investigation_for_rag(self, investigation: InvestigationState) -> tuple[str, list[str]]:
        """Format investigation data as text for RAG and extract entities."""
        parts = [f"Investigation ID: {investigation.investigation_id}"]
        parts.append(f"User ID: {investigation.user_id}")
        parts.append(f"Status: {investigation.status}")
        parts.append(f"Lifecycle Stage: {investigation.lifecycle_stage}")
        
        entities_list = []
        
        # Results are now stored in progress_json, not a separate results_json field
        progress_data = {}
        if investigation.progress_json:
            try:
                progress_data = json.loads(investigation.progress_json)
                # Extract results data from progress_json
                results = progress_data
                if isinstance(results, dict):
                    if "risk_score" in results:
                        parts.append(f"Risk Score: {results['risk_score']}")
                    
                    if "entities" in results:
                        entities = results["entities"]
                        if isinstance(entities, list):
                            entities_list = [str(e) for e in entities]
                            parts.append(f"Entities: {', '.join(entities_list[:10])}")
                        elif isinstance(entities, dict):
                            entities_list = [str(v) for v in entities.values() if v]
                            parts.append(f"Entities: {', '.join(entities_list[:10])}")
                    
                    # Extract transaction data if available
                    if "transactions" in results:
                        transactions = results["transactions"]
                        if isinstance(transactions, list) and transactions:
                            parts.append(f"\nTransaction Records ({len(transactions)} transactions):")
                            for i, tx in enumerate(transactions[:20], 1):  # Limit to first 20
                                if isinstance(tx, dict):
                                    tx_parts = []
                                    if "tx_id" in tx or "transaction_id" in tx:
                                        tx_parts.append(f"ID: {tx.get('tx_id') or tx.get('transaction_id')}")
                                    if "amount" in tx or "paid_amount_value_in_currency" in tx:
                                        amount = tx.get("amount") or tx.get("paid_amount_value_in_currency")
                                        currency = tx.get("currency") or tx.get("paid_amount_currency", "USD")
                                        tx_parts.append(f"Amount: {amount} {currency}")
                                    if "date" in tx or "tx_datetime" in tx or "timestamp" in tx:
                                        date = tx.get("date") or tx.get("tx_datetime") or tx.get("timestamp")
                                        tx_parts.append(f"Date: {date}")
                                    if "merchant" in tx or "merchant_name" in tx:
                                        merchant = tx.get("merchant") or tx.get("merchant_name")
                                        tx_parts.append(f"Merchant: {merchant}")
                                    if "payment_method" in tx:
                                        tx_parts.append(f"Payment Method: {tx['payment_method']}")
                                    if "is_fraud" in tx or "is_fraud_tx" in tx:
                                        is_fraud = tx.get("is_fraud") or tx.get("is_fraud_tx")
                                        tx_parts.append(f"Fraud Flag: {is_fraud}")
                                    if tx_parts:
                                        parts.append(f"  Transaction {i}: {', '.join(tx_parts)}")
                    
                    # Extract agent results which might contain transaction data
                    if "agent_results" in results:
                        agent_results = results["agent_results"]
                        if isinstance(agent_results, list):
                            for agent_result in agent_results[:5]:  # Limit to first 5 agents
                                if isinstance(agent_result, dict):
                                    agent_name = agent_result.get("agent_name", "Unknown")
                                    if "evidence" in agent_result:
                                        evidence = agent_result["evidence"]
                                        if isinstance(evidence, list):
                                            for ev in evidence[:3]:  # Limit evidence items
                                                if isinstance(ev, dict) and "transactions" in ev:
                                                    parts.append(f"\n{agent_name} found transaction evidence")
                                                    break
                    
                    # Extract tool execution results which might contain transaction data
                    if "tool_executions" in results:
                        tool_executions = results["tool_executions"]
                        if isinstance(tool_executions, list):
                            for tool_exec in tool_executions[:10]:  # Limit to first 10 tools
                                if isinstance(tool_exec, dict):
                                    tool_name = tool_exec.get("tool_name", "")
                                    if "transaction" in tool_name.lower():
                                        if "result" in tool_exec:
                                            result = tool_exec["result"]
                                            if isinstance(result, dict) and "transactions" in result:
                                                tx_data = result["transactions"]
                                                if isinstance(tx_data, list) and tx_data:
                                                    parts.append(f"\n{tool_name} retrieved {len(tx_data)} transactions")
                                                    # Include summary of transaction data
                                                    for tx in tx_data[:5]:
                                                        if isinstance(tx, dict):
                                                            tx_summary = []
                                                            if "amount" in tx:
                                                                tx_summary.append(f"${tx['amount']}")
                                                            if "date" in tx:
                                                                tx_summary.append(f"on {tx['date']}")
                                                            if tx_summary:
                                                                parts.append(f"  - {' '.join(tx_summary)}")
                    
                    if "findings" in results:
                        findings = results["findings"]
                        if isinstance(findings, str):
                            parts.append(f"\nFindings: {findings}")
                        elif isinstance(findings, list):
                            parts.append(f"\nFindings:")
                            for finding in findings[:10]:  # Limit findings
                                if isinstance(finding, dict):
                                    finding_text = finding.get("description") or finding.get("summary") or str(finding)
                                    parts.append(f"  - {finding_text}")
                                else:
                                    parts.append(f"  - {str(finding)}")
                    
                    # Include any other relevant data
                    if "evidence" in results:
                        evidence = results["evidence"]
                        if isinstance(evidence, list) and evidence:
                            parts.append(f"\nEvidence Items: {len(evidence)} items collected")
                    
                    if "summary" in results:
                        summary = results["summary"]
                        if isinstance(summary, str):
                            parts.append(f"\nInvestigation Summary: {summary}")
                            
            except json.JSONDecodeError:
                # Results are in progress_json
                if investigation.progress_json:
                    parts.append(f"Results: {investigation.progress_json[:500]}")
        
        if investigation.settings_json:
            try:
                settings = json.loads(investigation.settings_json)
                if isinstance(settings, dict):
                    if "entity_id" in settings:
                        entity_id = settings.get("entity_id")
                        if entity_id and entity_id not in entities_list:
                            entities_list.append(str(entity_id))
                            parts.insert(1, f"Primary Entity: {entity_id}")
                    if "entities" in settings:
                        settings_entities = settings.get("entities", [])
                        if isinstance(settings_entities, list):
                            for ent in settings_entities:
                                if isinstance(ent, dict) and ent.get("entity_value"):
                                    entity_value = str(ent["entity_value"])
                                    if entity_value not in entities_list:
                                        entities_list.append(entity_value)
            except json.JSONDecodeError:
                pass
        
        # Extract transaction data from progress_json (where snowflake_data is stored)
        if investigation.progress_json:
            try:
                progress = json.loads(investigation.progress_json)
                if isinstance(progress, dict):
                    # Check for snowflake_data with transactions
                    if "snowflake_data" in progress:
                        snowflake_data = progress["snowflake_data"]
                        if isinstance(snowflake_data, dict) and "transactions" in snowflake_data:
                            transactions = snowflake_data["transactions"]
                            if isinstance(transactions, list) and transactions:
                                parts.append(f"\nTransaction Records from Snowflake ({len(transactions)} transactions):")
                                for i, tx in enumerate(transactions[:30], 1):  # Limit to first 30
                                    if isinstance(tx, dict):
                                        tx_parts = []
                                        # Handle various transaction field names
                                        if "tx_id_key" in tx or "tx_id" in tx or "transaction_id" in tx:
                                            tx_parts.append(f"ID: {tx.get('tx_id_key') or tx.get('tx_id') or tx.get('transaction_id')}")
                                        if "paid_amount_value_in_currency" in tx or "amount" in tx:
                                            amount = tx.get("paid_amount_value_in_currency") or tx.get("amount")
                                            currency = tx.get("paid_amount_currency") or tx.get("currency", "USD")
                                            tx_parts.append(f"Amount: {amount} {currency}")
                                        if "tx_datetime" in tx or "date" in tx or "timestamp" in tx:
                                            date = tx.get("tx_datetime") or tx.get("date") or tx.get("timestamp")
                                            tx_parts.append(f"Date: {date}")
                                        if "email" in tx:
                                            tx_parts.append(f"Email: {tx['email']}")
                                        if "merchant" in tx or "merchant_name" in tx:
                                            merchant = tx.get("merchant") or tx.get("merchant_name")
                                            tx_parts.append(f"Merchant: {merchant}")
                                        if "payment_method" in tx:
                                            tx_parts.append(f"Payment Method: {tx['payment_method']}")
                                        if "is_fraud_tx" in tx or "is_fraud" in tx:
                                            is_fraud = tx.get("is_fraud_tx") or tx.get("is_fraud")
                                            tx_parts.append(f"Fraud Flag: {is_fraud}")
                                        if tx_parts:
                                            parts.append(f"  Transaction {i}: {', '.join(tx_parts)}")
                    
                    # Check tool_executions for transaction data
                    if "tool_executions" in progress:
                        tool_executions = progress["tool_executions"]
                        if isinstance(tool_executions, list):
                            for tool_exec in tool_executions[:10]:  # Limit to first 10 tools
                                if isinstance(tool_exec, dict) and "result" in tool_exec:
                                    result = tool_exec["result"]
                                    if isinstance(result, dict):
                                        # Check for transactions in tool result
                                        if "transactions" in result:
                                            tx_data = result["transactions"]
                                            if isinstance(tx_data, list) and tx_data:
                                                tool_name = tool_exec.get("tool_name", "Unknown Tool")
                                                parts.append(f"\n{tool_name} retrieved {len(tx_data)} transactions")
                                                for tx in tx_data[:5]:  # Show first 5
                                                    if isinstance(tx, dict):
                                                        tx_summary = []
                                                        if "amount" in tx or "paid_amount_value_in_currency" in tx:
                                                            amount = tx.get("amount") or tx.get("paid_amount_value_in_currency")
                                                            tx_summary.append(f"${amount}")
                                                        if "date" in tx or "tx_datetime" in tx:
                                                            date = tx.get("date") or tx.get("tx_datetime")
                                                            tx_summary.append(f"on {date}")
                                                        if tx_summary:
                                                            parts.append(f"  - {' '.join(tx_summary)}")
                                        
                                        # Check for snowflake_data in tool result
                                        if "snowflake_data" in result:
                                            sf_data = result["snowflake_data"]
                                            if isinstance(sf_data, dict) and "transactions" in sf_data:
                                                tx_data = sf_data["transactions"]
                                                if isinstance(tx_data, list) and tx_data:
                                                    tool_name = tool_exec.get("tool_name", "Unknown Tool")
                                                    parts.append(f"\n{tool_name} retrieved {len(tx_data)} transactions from Snowflake")
            except json.JSONDecodeError:
                pass
        
        return "\n".join(parts), entities_list
    
    def chunk_investigation_data(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Chunk investigation text."""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        
        return chunks
    
    async def store_investigation_chunks(
        self,
        investigation_id: str,
        user_id: str,
        status: str,
        chunks: List[str],
        collection_id: str,
        created_at: datetime,
        updated_at: datetime,
        entities: List[str]
    ) -> None:
        """Store investigation chunks in vector database."""
        document_title = f"Investigation {investigation_id}"
        
        async with self.db_config.session() as session:
            # Handle JSON query differently for PostgreSQL vs SQLite
            if self.db_config.is_postgresql:
                # PostgreSQL: Use .astext for JSON text extraction
                query = select(Document).where(
                    Document.collection_id == collection_id,
                    Document.meta_data["investigation_id"].astext == investigation_id
                )
                result = await session.execute(query)
            else:
                # SQLite: Use json_extract function for JSON queries
                from sqlalchemy import text
                # SQLite stores JSON as TEXT, use json_extract to query
                query_text = text("""
                    SELECT * FROM documents 
                    WHERE collection_id = :collection_id 
                    AND json_extract(meta_data, '$.investigation_id') = :investigation_id
                    LIMIT 1
                """)
                result = session.execute(query_text, {
                    "collection_id": collection_id,
                    "investigation_id": investigation_id
                })
                # Convert result to Document object
                row = result.fetchone()
                if row:
                    # Get column names and create dict
                    columns = result.keys()
                    row_dict = dict(zip(columns, row))
                    # Parse JSON fields if they're strings (SQLite stores JSON as TEXT)
                    if 'meta_data' in row_dict and isinstance(row_dict['meta_data'], str):
                        try:
                            row_dict['meta_data'] = json.loads(row_dict['meta_data'])
                        except (json.JSONDecodeError, TypeError):
                            row_dict['meta_data'] = None
                    # Get document ID and merge into session
                    document_id = row_dict.get('id')
                    if document_id:
                        # Query the document properly using ORM to attach it to session
                        doc_query = select(Document).where(Document.id == document_id)
                        doc_result = session.execute(doc_query)
                        document = doc_result.scalar_one_or_none()
                    else:
                        document = None
                else:
                    document = None
            
            metadata = {
                "investigation_id": investigation_id,
                "user_id": user_id,
                "status": status,
                "created_at": created_at.isoformat(),
                "updated_at": updated_at.isoformat(),
                "entities": entities
            }
            
            if document:
                document_id = document.id
                document.meta_data = metadata
                document.content = "\n\n".join(chunks)
                if self.db_config.is_postgresql:
                    await session.commit()
                    await session.refresh(document)
                else:
                    session.commit()
                    session.refresh(document)
            else:
                document = Document(
                    collection_id=collection_id,
                    title=document_title,
                    content="\n\n".join(chunks),
                    source_type="investigation_results",
                    meta_data=metadata
                )
                session.add(document)
                if self.db_config.is_postgresql:
                    await session.commit()
                    await session.refresh(document)
                else:
                    session.commit()
                    session.refresh(document)
                document_id = document.id
            
            # Use the existing/created document_id for ingestion
            # This will update existing chunks or create new ones with embeddings
            await self.rag_service.ingest_document(
                collection_id=collection_id,
                title=document_title,
                content="\n\n".join(chunks),
                source_type="investigation_results",
                metadata=metadata,
                document_id=document_id
            )
    
    async def index_new_investigations(self) -> int:
        """Index all new/updated completed investigations."""
        indexed_count = 0
        
        with get_db_session() as session:
            # First, check what investigations exist and their statuses
            all_investigations_query = select(InvestigationState).order_by(InvestigationState.updated_at.desc()).limit(10)
            all_investigations = session.execute(all_investigations_query).scalars().all()
            if all_investigations:
                statuses = [inv.status for inv in all_investigations]
                logger.info(f"Sample investigation statuses found: {set(statuses)}")
                logger.info(f"Total investigations checked: {len(all_investigations)}")
            
            # Query for completed investigations
            query = select(InvestigationState).where(
                InvestigationState.status == "COMPLETED"
            ).order_by(InvestigationState.updated_at.desc())
            
            investigations = session.execute(query).scalars().all()
            logger.info(f"Found {len(investigations)} investigations with status='COMPLETED'")
            
            # If none found with COMPLETED, try other variations
            if len(investigations) == 0:
                logger.debug("No investigations with status='COMPLETED', checking other status values...")
                alt_query = select(InvestigationState).where(
                    InvestigationState.status.in_(["completed", "COMPLETE", "complete", "done", "DONE"])
                ).order_by(InvestigationState.updated_at.desc())
                alt_investigations = session.execute(alt_query).scalars().all()
                if alt_investigations:
                    logger.info(f"Found {len(alt_investigations)} investigations with alternative status values")
                    investigations = alt_investigations
            
            for investigation in investigations:
                collection_id = await self.ensure_investigation_collection()
                
                async with self.db_config.session() as vec_session:
                    # Handle JSON query differently for PostgreSQL vs SQLite
                    if self.db_config.is_postgresql:
                        # PostgreSQL: Use .astext for JSON text extraction
                        doc_query = select(Document).where(
                            Document.collection_id == collection_id,
                            Document.meta_data["investigation_id"].astext == investigation.investigation_id
                        )
                        doc_result = await vec_session.execute(doc_query)
                    else:
                        # SQLite: Use json_extract function for JSON queries
                        from sqlalchemy import text
                        query_text = text("""
                            SELECT * FROM documents 
                            WHERE collection_id = :collection_id 
                            AND json_extract(meta_data, '$.investigation_id') = :investigation_id
                        """)
                        doc_result = vec_session.execute(query_text, {
                            "collection_id": collection_id,
                            "investigation_id": investigation.investigation_id
                        })
                        rows = doc_result.fetchall()
                        if rows:
                            columns = doc_result.keys()
                            row_dict = dict(zip(columns, rows[0]))
                            # Parse JSON fields if they're strings (SQLite stores JSON as TEXT)
                            if 'meta_data' in row_dict and isinstance(row_dict['meta_data'], str):
                                try:
                                    row_dict['meta_data'] = json.loads(row_dict['meta_data'])
                                except (json.JSONDecodeError, TypeError):
                                    row_dict['meta_data'] = None
                            # Get document ID and query properly using ORM to attach to session
                            doc_id = row_dict.get('id')
                            if doc_id:
                                doc_query = select(Document).where(Document.id == doc_id)
                                if self.db_config.is_postgresql:
                                    doc_orm_result = await vec_session.execute(doc_query)
                                else:
                                    doc_orm_result = vec_session.execute(doc_query)
                                existing_doc = doc_orm_result.scalar_one_or_none()
                            else:
                                existing_doc = None
                        else:
                            existing_doc = None
                    
                    if existing_doc:
                        # Access meta_data to load it, then check updated_at
                        meta_data = existing_doc.meta_data
                        doc_updated = datetime.fromisoformat(
                            meta_data.get("updated_at", "")
                        ) if meta_data else None
                        if doc_updated and doc_updated >= investigation.updated_at:
                            continue
                
                try:
                    if await self.index_investigation(investigation.investigation_id):
                        indexed_count += 1
                        logger.debug(f"Successfully indexed investigation {investigation.investigation_id}")
                    else:
                        logger.debug(f"Skipped indexing investigation {investigation.investigation_id} (already up to date or failed)")
                except Exception as e:
                    logger.error(f"Failed to index investigation {investigation.investigation_id}: {e}", exc_info=True)
        
        logger.info(f"Indexed {indexed_count} new/updated investigations out of {len(investigations)} checked")
        return indexed_count


_global_indexer: Optional[InvestigationIndexer] = None


def get_investigation_indexer() -> InvestigationIndexer:
    """Get global investigation indexer."""
    global _global_indexer
    if _global_indexer is None:
        _global_indexer = InvestigationIndexer()
    return _global_indexer

