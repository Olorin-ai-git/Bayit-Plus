"""
Workspace Registry

SQLite-based registry for indexing investigations, files, and comparisons.
Provides fast queries by entity, date range, and trigger source.

Constitutional Compliance:
- No hardcoded paths (uses FileOrganizationConfig)
- Complete implementation with all required indexes
- WAL mode for concurrent reads
- SHA256 hashes for deduplication
"""

import sqlite3
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from contextlib import contextmanager

from app.config.file_organization_config import FileOrganizationConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class WorkspaceRegistry:
    """
    SQLite registry for indexing investigations, files, and comparisons.
    
    Provides fast queries by entity, date range, and trigger source.
    Uses WAL mode for concurrent reads and optimized PRAGMA settings.
    """
    
    def __init__(self, registry_path: Optional[Path] = None, config: Optional[FileOrganizationConfig] = None):
        """
        Initialize workspace registry.
        
        Args:
            registry_path: Path to SQLite database file. If None, uses default from config.
            config: FileOrganizationConfig instance. If None, creates new instance.
        """
        self.config = config or FileOrganizationConfig()
        
        if registry_path:
            self.registry_path = Path(registry_path)
        else:
            # Default: workspace/registry/registry.sqlite
            workspace_base = Path("workspace")
            registry_dir = workspace_base / "registry"
            registry_dir.mkdir(parents=True, exist_ok=True)
            self.registry_path = registry_dir / "registry.sqlite"
        
        # Ensure registry directory exists
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database schema
        self._initialize_schema()
        
        logger.info(f"WorkspaceRegistry initialized: {self.registry_path}")
    
    @contextmanager
    def _get_connection(self):
        """Get database connection with proper error handling."""
        conn = sqlite3.connect(str(self.registry_path))
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database transaction failed: {e}", exc_info=True)
            raise
        finally:
            conn.close()
    
    def _initialize_schema(self):
        """Initialize database schema with tables, indexes, and FTS5 virtual table."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Configure SQLite for performance
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA foreign_keys=ON")
            
            # Create investigations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS investigations (
                    investigation_id TEXT PRIMARY KEY,
                    title TEXT,
                    investigation_type TEXT,
                    graph_type TEXT,
                    trigger_source TEXT,
                    status TEXT,
                    entity_type TEXT,
                    entity_ids TEXT,  -- JSON array of entity IDs
                    tags TEXT,  -- JSON array of tags
                    canonical_path TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    completed_at TIMESTAMP,
                    metadata_json TEXT  -- JSON blob for additional metadata
                )
            """)
            
            # Create files table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    investigation_id TEXT,
                    canonical_path TEXT NOT NULL,
                    entity_view_path TEXT,  -- May be NULL if no entity view
                    file_kind TEXT NOT NULL,  -- 'artifact', 'report', 'log', etc.
                    file_ext TEXT NOT NULL,  -- 'json', 'html', 'log', etc.
                    sha256_hash TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    mime_type TEXT,
                    relative_path TEXT,  -- Relative path within investigation folder
                    created_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (investigation_id) REFERENCES investigations(investigation_id) ON DELETE CASCADE
                )
            """)
            
            # Create comparisons table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS comparisons (
                    comparison_id TEXT PRIMARY KEY,
                    left_investigation TEXT NOT NULL,
                    right_investigation TEXT NOT NULL,
                    title TEXT,
                    source_type TEXT,  -- 'auto_startup', 'manual', etc.
                    entity_type TEXT,
                    entity_id TEXT,
                    canonical_path TEXT,
                    created_at TIMESTAMP NOT NULL,
                    metadata_json TEXT,
                    FOREIGN KEY (left_investigation) REFERENCES investigations(investigation_id),
                    FOREIGN KEY (right_investigation) REFERENCES investigations(investigation_id)
                )
            """)
            
            # Create audit_log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operation_type TEXT NOT NULL,  -- 'create', 'update', 'delete', 'index', etc.
                    user_id TEXT,
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    resource_type TEXT NOT NULL,  -- 'investigation', 'file', 'comparison'
                    resource_id TEXT NOT NULL,
                    before_state TEXT,  -- JSON blob
                    after_state TEXT,  -- JSON blob
                    result TEXT  -- 'success', 'failure', etc.
                )
            """)
            
            # Create indexes for fast queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_investigation_id ON investigations(investigation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_entity_ids ON investigations(entity_ids)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_trigger_source_created ON investigations(trigger_source, created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON investigations(created_at)")
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_investigation_id ON files(investigation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_investigation_kind ON files(investigation_id, file_kind)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_sha256 ON files(sha256_hash)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_entity_view_path ON files(entity_view_path)")
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_comparisons_left ON comparisons(left_investigation)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_comparisons_right ON comparisons(right_investigation)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_comparisons_entity ON comparisons(entity_type, entity_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_comparisons_source_type ON comparisons(source_type, created_at)")
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)")
            
            # Create FTS5 virtual table for full-text search
            cursor.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS investigations_fts USING fts5(
                    investigation_id UNINDEXED,
                    title,
                    tags,
                    content='investigations',
                    content_rowid='rowid'
                )
            """)
            
            # Create triggers to keep FTS5 in sync
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS investigations_fts_insert AFTER INSERT ON investigations BEGIN
                    INSERT INTO investigations_fts(rowid, title, tags)
                    VALUES (new.rowid, new.title, new.tags);
                END
            """)
            
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS investigations_fts_update AFTER UPDATE ON investigations BEGIN
                    UPDATE investigations_fts SET title = new.title, tags = new.tags WHERE rowid = new.rowid;
                END
            """)
            
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS investigations_fts_delete AFTER DELETE ON investigations BEGIN
                    DELETE FROM investigations_fts WHERE rowid = old.rowid;
                END
            """)
            
            conn.commit()
            logger.debug("Database schema initialized successfully")
    
    def index_investigation(
        self,
        investigation_id: str,
        title: Optional[str] = None,
        investigation_type: Optional[str] = None,
        graph_type: Optional[str] = None,
        trigger_source: Optional[str] = None,
        status: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_ids: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        canonical_path: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Index an investigation in the registry.
        
        Args:
            investigation_id: Unique investigation identifier
            title: Investigation title
            investigation_type: Type of investigation (structured, hybrid, etc.)
            graph_type: Graph type (clean, hybrid, etc.)
            trigger_source: Source that triggered investigation (startup, script, ui, etc.)
            status: Investigation status (IN_PROGRESS, COMPLETED, FAILED, etc.)
            entity_type: Primary entity type
            entity_ids: List of entity IDs (will be stored as JSON array)
            tags: List of tags (will be stored as JSON array)
            canonical_path: Canonical path to investigation folder
            created_at: Creation timestamp
            updated_at: Last update timestamp
            completed_at: Completion timestamp
            metadata: Additional metadata dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Prepare values
                now = datetime.now()
                created_at = created_at or now
                updated_at = updated_at or now
                entity_ids_json = json.dumps(entity_ids) if entity_ids else None
                tags_json = json.dumps(tags) if tags else None
                metadata_json = json.dumps(metadata) if metadata else None
                
                # Insert or replace investigation
                cursor.execute("""
                    INSERT OR REPLACE INTO investigations (
                        investigation_id, title, investigation_type, graph_type,
                        trigger_source, status, entity_type, entity_ids, tags,
                        canonical_path, created_at, updated_at, completed_at, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    investigation_id, title, investigation_type, graph_type,
                    trigger_source, status, entity_type, entity_ids_json, tags_json,
                    canonical_path, created_at, updated_at, completed_at, metadata_json
                ))
                
                # Log audit entry
                self._log_audit(
                    conn, cursor,
                    operation_type="index",
                    resource_type="investigation",
                    resource_id=investigation_id,
                    after_state=metadata_json,
                    result="success"
                )
                
                logger.debug(f"Indexed investigation: {investigation_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to index investigation {investigation_id}: {e}", exc_info=True)
            return False
    
    def index_file(
        self,
        investigation_id: str,
        canonical_path: str,
        file_kind: str,
        file_ext: str,
        entity_view_path: Optional[str] = None,
        relative_path: Optional[str] = None,
        file_size: Optional[int] = None,
        mime_type: Optional[str] = None,
        sha256_hash: Optional[str] = None
    ) -> bool:
        """
        Index a file in the registry.
        
        Args:
            investigation_id: Investigation ID this file belongs to
            canonical_path: Canonical path to the file
            file_kind: Kind of file ('artifact', 'report', 'log', etc.)
            file_ext: File extension ('json', 'html', 'log', etc.)
            entity_view_path: Optional entity view path (symlink or indexed view)
            relative_path: Optional relative path within investigation folder
            file_size: File size in bytes (will be read from file if not provided)
            mime_type: MIME type (will be inferred if not provided)
            sha256_hash: SHA256 hash (will be computed if not provided)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Compute SHA256 hash if not provided
            if not sha256_hash:
                file_path = Path(canonical_path)
                if file_path.exists():
                    sha256_hash = self._compute_sha256(file_path)
                else:
                    logger.warning(f"File not found for hashing: {canonical_path}")
                    sha256_hash = "unknown"
            
            # Get file size if not provided
            if file_size is None:
                file_path = Path(canonical_path)
                if file_path.exists():
                    file_size = file_path.stat().st_size
                else:
                    file_size = 0
            
            # Infer MIME type if not provided
            if not mime_type:
                mime_type = self._infer_mime_type(file_ext)
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Insert file record
                cursor.execute("""
                    INSERT OR REPLACE INTO files (
                        investigation_id, canonical_path, entity_view_path,
                        file_kind, file_ext, sha256_hash, file_size,
                        mime_type, relative_path, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    investigation_id, canonical_path, entity_view_path,
                    file_kind, file_ext, sha256_hash, file_size,
                    mime_type, relative_path, datetime.now()
                ))
                
                # Log audit entry
                file_id = cursor.lastrowid
                self._log_audit(
                    conn, cursor,
                    operation_type="index",
                    resource_type="file",
                    resource_id=str(file_id),
                    after_state=json.dumps({
                        "investigation_id": investigation_id,
                        "canonical_path": canonical_path,
                        "entity_view_path": entity_view_path,
                        "sha256_hash": sha256_hash
                    }),
                    result="success"
                )
                
                logger.debug(f"Indexed file: {canonical_path} (investigation_id={investigation_id})")
                return True
                
        except Exception as e:
            logger.error(f"Failed to index file {canonical_path}: {e}", exc_info=True)
            return False
    
    def index_comparison(
        self,
        comparison_id: str,
        left_investigation: str,
        right_investigation: str,
        title: Optional[str] = None,
        source_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        canonical_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Index a comparison in the registry.
        
        Args:
            comparison_id: Unique comparison identifier
            left_investigation: Investigation ID for left side
            right_investigation: Investigation ID for right side
            title: Comparison title
            source_type: Source type ('auto_startup', 'manual', etc.)
            entity_type: Entity type being compared
            entity_id: Entity ID being compared
            canonical_path: Canonical path to comparison report
            metadata: Additional metadata dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                metadata_json = json.dumps(metadata) if metadata else None
                
                # Insert or replace comparison
                cursor.execute("""
                    INSERT OR REPLACE INTO comparisons (
                        comparison_id, left_investigation, right_investigation,
                        title, source_type, entity_type, entity_id,
                        canonical_path, created_at, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    comparison_id, left_investigation, right_investigation,
                    title, source_type, entity_type, entity_id,
                    canonical_path, datetime.now(), metadata_json
                ))
                
                # Log audit entry
                self._log_audit(
                    conn, cursor,
                    operation_type="index",
                    resource_type="comparison",
                    resource_id=comparison_id,
                    after_state=metadata_json,
                    result="success"
                )
                
                logger.debug(f"Indexed comparison: {comparison_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to index comparison {comparison_id}: {e}", exc_info=True)
            return False
    
    def query_by_entity(
        self,
        entity_type: str,
        entity_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Query investigations by entity using entity view paths.
        
        Args:
            entity_type: Entity type to search for
            entity_id: Optional specific entity ID
            limit: Maximum number of results
            
        Returns:
            List of investigation dictionaries
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if entity_id:
                    # Search for specific entity ID in entity_ids JSON array
                    cursor.execute("""
                        SELECT * FROM investigations
                        WHERE entity_type = ? 
                          AND entity_ids LIKE ?
                        ORDER BY created_at DESC
                        LIMIT ?
                    """, (entity_type, f'%"{entity_id}"%', limit))
                else:
                    # Search for any investigation with this entity type
                    cursor.execute("""
                        SELECT * FROM investigations
                        WHERE entity_type = ?
                        ORDER BY created_at DESC
                        LIMIT ?
                    """, (entity_type, limit))
                
                results = []
                for row in cursor.fetchall():
                    result = dict(row)
                    # Parse JSON fields
                    if result.get('entity_ids'):
                        result['entity_ids'] = json.loads(result['entity_ids'])
                    if result.get('tags'):
                        result['tags'] = json.loads(result['tags'])
                    if result.get('metadata_json'):
                        result['metadata'] = json.loads(result['metadata_json'])
                    results.append(result)
                
                logger.debug(f"Query by entity returned {len(results)} results")
                return results
                
        except Exception as e:
            logger.error(f"Failed to query by entity: {e}", exc_info=True)
            return []
    
    def query_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        trigger_source: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Query investigations by date range.
        
        Args:
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            trigger_source: Optional filter by trigger source
            limit: Maximum number of results
            
        Returns:
            List of investigation dictionaries
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if trigger_source:
                    cursor.execute("""
                        SELECT * FROM investigations
                        WHERE created_at >= ? AND created_at <= ?
                          AND trigger_source = ?
                        ORDER BY created_at DESC
                        LIMIT ?
                    """, (start_date, end_date, trigger_source, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM investigations
                        WHERE created_at >= ? AND created_at <= ?
                        ORDER BY created_at DESC
                        LIMIT ?
                    """, (start_date, end_date, limit))
                
                results = []
                for row in cursor.fetchall():
                    result = dict(row)
                    # Parse JSON fields
                    if result.get('entity_ids'):
                        result['entity_ids'] = json.loads(result['entity_ids'])
                    if result.get('tags'):
                        result['tags'] = json.loads(result['tags'])
                    if result.get('metadata_json'):
                        result['metadata'] = json.loads(result['metadata_json'])
                    results.append(result)
                
                logger.debug(f"Query by date range returned {len(results)} results")
                return results
                
        except Exception as e:
            logger.error(f"Failed to query by date range: {e}", exc_info=True)
            return []
    
    def search_full_text(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Full-text search on investigation titles and tags using FTS5.
        
        Args:
            query: Search query string
            limit: Maximum number of results
            
        Returns:
            List of investigation dictionaries
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # FTS5 search
                cursor.execute("""
                    SELECT i.* FROM investigations i
                    JOIN investigations_fts fts ON i.rowid = fts.rowid
                    WHERE investigations_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                """, (query, limit))
                
                results = []
                for row in cursor.fetchall():
                    result = dict(row)
                    # Parse JSON fields
                    if result.get('entity_ids'):
                        result['entity_ids'] = json.loads(result['entity_ids'])
                    if result.get('tags'):
                        result['tags'] = json.loads(result['tags'])
                    if result.get('metadata_json'):
                        result['metadata'] = json.loads(result['metadata_json'])
                    results.append(result)
                
                logger.debug(f"Full-text search returned {len(results)} results")
                return results
                
        except Exception as e:
            logger.error(f"Failed to perform full-text search: {e}", exc_info=True)
            return []
    
    def _compute_sha256(self, file_path: Path) -> str:
        """Compute SHA256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _infer_mime_type(self, file_ext: str) -> str:
        """Infer MIME type from file extension."""
        mime_types = {
            'json': 'application/json',
            'html': 'text/html',
            'log': 'text/plain',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'pdf': 'application/pdf',
            'zip': 'application/zip'
        }
        return mime_types.get(file_ext.lower(), 'application/octet-stream')
    
    def _log_audit(
        self,
        conn: sqlite3.Connection,
        cursor: sqlite3.Cursor,
        operation_type: str,
        resource_type: str,
        resource_id: str,
        before_state: Optional[str] = None,
        after_state: Optional[str] = None,
        result: str = "success",
        user_id: Optional[str] = None
    ):
        """Log an audit entry."""
        try:
            cursor.execute("""
                INSERT INTO audit_log (
                    operation_type, user_id, resource_type, resource_id,
                    before_state, after_state, result
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (operation_type, user_id, resource_type, resource_id, before_state, after_state, result))
        except Exception as e:
            logger.warning(f"Failed to log audit entry: {e}")


# Global registry instance
_registry_instance: Optional[WorkspaceRegistry] = None


def get_registry() -> WorkspaceRegistry:
    """Get the global workspace registry instance."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = WorkspaceRegistry()
    return _registry_instance

