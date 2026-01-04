# RAG Database Migration Guide

## Overview

This guide explains how to migrate the RAG database columns from `metadata` to `meta_data` to resolve SQLAlchemy reserved name conflicts.

## Problem

SQLAlchemy reserves the name `metadata` for its own use in the Declarative API. Having a column named `metadata` causes the following error:

```
sqlalchemy.exc.InvalidRequestError: Attribute name 'metadata' is reserved when using the Declarative API.
```

## Solution

We've renamed the `metadata` column to `meta_data` in both:
- `documents` table
- `document_chunks` table

## Migration Steps

### 1. Code Changes (Already Done)

The following files have been updated:
- `app/service/database/models.py` - Column renamed in model definitions
- `app/service/rag/investigation_indexer.py` - References updated
- `app/service/rag/vector_rag_service.py` - References updated
- `app/router/rag_router.py` - References updated

### 2. Database Migration

#### Option A: Using the Migration Script (Recommended)

Run the automated migration script:

```bash
cd olorin-server
python scripts/migrate_rag_columns.py
```

This script will:
1. Check the current state of the database
2. Rename the columns if needed
3. Verify the migration was successful

#### Option B: Manual SQL Migration

For PostgreSQL:

```sql
-- Rename column in documents table
ALTER TABLE documents RENAME COLUMN metadata TO meta_data;

-- Rename column in document_chunks table
ALTER TABLE document_chunks RENAME COLUMN metadata TO meta_data;
```

For SQLite (3.25.0+):

```sql
-- Rename column in documents table
ALTER TABLE documents RENAME COLUMN metadata TO meta_data;

-- Rename column in document_chunks table
ALTER TABLE document_chunks RENAME COLUMN metadata TO meta_data;
```

**Note:** For older SQLite versions, you may need to recreate the tables.

### 3. Verify Migration

After running the migration, verify it was successful:

```bash
python scripts/migrate_rag_columns.py
```

The script will show verification results.

## RAG Service Initialization

The RAG system initializes during application startup through the `RAGSystemStartup` class. The initialization process includes:

1. **Database Initialization** - Sets up PostgreSQL + pgvector or SQLite
2. **Embedding Service** - Initializes embedding generation service
3. **Knowledge Base** - Initializes enhanced knowledge base
4. **Health Check** - Verifies system health
5. **Background Indexing** - Starts investigation indexing service

### Checking RAG Initialization Status

The RAG system can be initialized with `skip_on_failure=True`, which means the server will start even if RAG initialization fails. To check if RAG is properly initialized:

1. Check server logs for RAG initialization messages
2. Look for errors related to:
   - Database connection issues
   - Missing embedding service configuration
   - Vector database setup problems

### Common Issues

#### Issue: RAG endpoints return errors

**Possible causes:**
- Database not initialized
- No data sources configured
- Embedding service not available
- Column migration not run

**Solutions:**
1. Run the migration script: `python scripts/migrate_rag_columns.py`
2. Check database connection settings
3. Verify at least one data source is enabled
4. Check embedding service configuration (OpenAI API key, etc.)

#### Issue: "Failed to process RAG query"

**Possible causes:**
- RAG service not initialized
- No enabled data sources
- Database connection issues

**Solutions:**
1. Check server logs for RAG initialization errors
2. Verify database is accessible
3. Ensure at least one data source is configured and enabled
4. Test the endpoint: `GET /api/v1/rag/data-sources`

## Files Created

- `app/persistence/migrations/002_rename_metadata_to_meta_data.sql` - SQL migration file
- `app/persistence/migrations/rag_column_migration.py` - Python migration runner
- `scripts/migrate_rag_columns.py` - CLI migration script

## Rollback

If you need to rollback the migration (not recommended after code changes):

```sql
-- PostgreSQL/SQLite
ALTER TABLE documents RENAME COLUMN meta_data TO metadata;
ALTER TABLE document_chunks RENAME COLUMN meta_data TO metadata;
```

**Warning:** Rolling back requires also reverting the code changes, which is not recommended.

## Support

If you encounter issues during migration:

1. Check the migration script logs
2. Verify database connectivity
3. Ensure you have the necessary permissions
4. Review server logs for detailed error messages

