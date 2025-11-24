# Implementation Plan: Reenabling and Enhancing RAG Application

**Branch**: `001-reenabling-rag-examine` | **Date**: 2025-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-reenabling-rag-examine/spec.md`

## Summary

Reenable and enhance the existing RAG application to create a fully-fledged RAG system with:
- Multi-source data configuration (PostgreSQL, SQLite, Investigation Results, Documents)
- Unified vector search across all configured sources
- Automatic investigation results indexing
- Enhanced RAG chat interface with source citations
- Data source management UI
- Support for both PostgreSQL (with pgvector) and SQLite backends

**Technical Approach**: Build on existing RAG infrastructure (`app/service/rag/`, `app/service/agent/rag/`), create missing vector database components, implement unified data source abstraction layer, and enhance frontend RAG page with configuration capabilities.

## Technical Context

**Language/Version**: Python 3.11+, TypeScript/React  
**Primary Dependencies**: 
- Backend: FastAPI, SQLAlchemy (async), pgvector, OpenAI API, sentence-transformers
- Frontend: React, TypeScript, Tailwind CSS, React Router
**Storage**: PostgreSQL 15+ (with pgvector extension) OR SQLite 3  
**Testing**: pytest, jest, React Testing Library  
**Target Platform**: Linux server (backend), Web browser (frontend)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- RAG query response time < 5 seconds for 3 data sources
- Investigation indexing < 30 seconds for 100 entities
- Vector search p95 latency < 500ms
**Constraints**: 
- All files < 200 lines (constitutional requirement)
- No mocks/stubs/TODOs in production code
- All configuration from environment variables
- Zero duplication policy
**Scale/Scope**: 
- Support 3+ concurrent data source types
- Handle 10k+ investigation results
- Process documents up to 10MB
- Support 100+ concurrent RAG queries

## Constitution Check

✅ **No Hardcoded Values**: All configuration from environment variables  
✅ **Complete Implementation**: No stubs, mocks, or TODOs allowed  
✅ **File Size Compliance**: All files < 200 lines  
✅ **No Duplication**: Reuse existing RAG infrastructure  
✅ **Use Existing Infrastructure**: Build on `app/service/rag/`, `app/service/agent/rag/rag_orchestrator.py`  
✅ **Database Support**: Both PostgreSQL and SQLite supported via configuration

## Project Structure

### Documentation (this feature)

```text
specs/001-reenabling-rag-examine/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Implementation tasks (to be created)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   ├── router/
│   │   └── rag_router.py                    # NEW: RAG API endpoints
│   ├── service/
│   │   ├── database/                        # NEW: Vector database config/models
│   │   │   ├── __init__.py                  # ✅ Created
│   │   │   ├── vector_database_config.py    # ✅ Created
│   │   │   └── models.py                    # ✅ Created
│   │   ├── rag/                             # EXISTS: Enhanced
│   │   │   ├── __init__.py                  # EXISTS
│   │   │   ├── embedding_service.py        # ✅ Created
│   │   │   ├── vector_rag_service.py       # ✅ Created
│   │   │   ├── data_source_service.py       # NEW: Data source management
│   │   │   ├── investigation_indexer.py     # NEW: Investigation indexing
│   │   │   └── unified_rag_service.py       # NEW: Multi-source RAG
│   │   └── agent/
│   │       └── rag/
│   │           ├── rag_orchestrator.py      # EXISTS: Use existing
│   │           └── knowledge_base.py        # EXISTS: Use existing
│   └── models/
│       └── investigation_state.py           # EXISTS: Use for investigation indexing
│
olorin-front/
├── src/
│   ├── microservices/
│   │   └── rag-intelligence/                # EXISTS: Enhanced
│   │       ├── components/
│   │       │   ├── RAGConfigurationPage.tsx # EXISTS: Enhance with data sources
│   │       │   ├── chat/
│   │       │   │   └── ChatInterface.tsx   # EXISTS: Enhance with citations
│   │       │   └── DataSourceConfig.tsx     # NEW: Data source management UI
│   │       ├── services/
│   │       │   └── ragIntelligenceService.ts # EXISTS: Update API endpoints
│   │       └── hooks/
│   │           └── useRAGDataSources.ts    # NEW: Data source management hook
│   └── shared/
│       └── services/
│           └── RAGApiService.ts             # EXISTS: Update endpoints
```

**Structure Decision**: Web application structure with backend (FastAPI) and frontend (React). Backend services organized under `app/service/rag/` and `app/service/database/`. Frontend organized under `src/microservices/rag-intelligence/`. Reuse existing RAG infrastructure to avoid duplication.

## Implementation Phases

### Phase 0: Foundation (COMPLETED ✅)
- ✅ Created vector database configuration (`vector_database_config.py`)
- ✅ Created database models (`models.py`)
- ✅ Created embedding service (`embedding_service.py`)
- ✅ Created vector RAG service (`vector_rag_service.py`)

### Phase 1: Data Source Management
**Goal**: Enable configuration and management of multiple data sources

**Tasks**:
1. Create `data_source_service.py` - Service for managing data source configurations
   - CRUD operations for data sources
   - Connection validation (PostgreSQL, SQLite, Investigation Results)
   - Status checking and health monitoring
   - Enable/disable data sources

2. Create `investigation_indexer.py` - Service for indexing investigation results
   - Listen for investigation completion events
   - Extract investigation data from `investigation_states` table
   - Chunk and embed investigation results
   - Store in vector database with source attribution

3. Update database models if needed
   - Ensure `RAGDataSource` model supports all required fields
   - Add indexes for performance

### Phase 2: Unified RAG Service
**Goal**: Create unified RAG service that queries across all configured data sources

**Tasks**:
1. Create `unified_rag_service.py` - Multi-source RAG orchestration
   - Query all enabled data sources in parallel
   - Aggregate results from multiple sources
   - Rank and deduplicate results
   - Generate unified response with source citations

2. Integrate with existing `rag_orchestrator.py`
   - Use existing RAG orchestrator for LLM generation
   - Enhance with multi-source retrieval
   - Add source attribution to responses

### Phase 3: Backend API
**Goal**: Expose RAG functionality via REST API

**Tasks**:
1. Create `rag_router.py` - FastAPI router for RAG endpoints
   - `POST /api/v1/rag/query` - RAG query endpoint
   - `GET /api/v1/rag/data-sources` - List data sources
   - `POST /api/v1/rag/data-sources` - Create data source
   - `PUT /api/v1/rag/data-sources/{id}` - Update data source
   - `DELETE /api/v1/rag/data-sources/{id}` - Delete data source
   - `POST /api/v1/rag/data-sources/{id}/test` - Test connection
   - `GET /api/v1/rag/documents` - List documents
   - `POST /api/v1/rag/documents/upload` - Upload document
   - `GET /api/v1/rag/config` - Get RAG configuration
   - `PUT /api/v1/rag/config` - Update RAG configuration

2. Create Pydantic schemas for request/response models
   - `RAGQueryRequest`, `RAGQueryResponse`
   - `DataSourceCreate`, `DataSourceUpdate`, `DataSourceResponse`
   - `DocumentUpload`, `DocumentResponse`
   - `RAGConfigResponse`

3. Integrate router into main application
   - Add to `app/service/router/router_config.py`
   - Configure authentication/authorization
   - Add error handling middleware

### Phase 4: Investigation Results Integration
**Goal**: Automatically index investigation results as RAG data source

**Tasks**:
1. Enhance `investigation_indexer.py`
   - Query `investigation_states` table for completed investigations
   - Extract `results_json`, `settings_json`, `progress_json`
   - Format investigation data for RAG indexing
   - Create chunks with investigation metadata
   - Store with source type "investigation_results"

2. Create background task/service
   - Poll for new/updated investigations
   - Index incrementally (only new/updated)
   - Handle large investigation sets with batching

3. Add investigation-specific search capabilities
   - Filter by investigation_id, entity_id, status
   - Include investigation metadata in search results
   - Link back to investigation details

### Phase 5: Frontend Enhancements
**Goal**: Enhance RAG page with data source configuration and improved UI

**Tasks**:
1. Create `DataSourceConfig.tsx` component
   - List configured data sources
   - Add/edit data source form
   - Test connection button
   - Enable/disable toggle
   - Connection status indicator

2. Enhance `RAGConfigurationPage.tsx`
   - Add "Data Sources" tab
   - Integrate `DataSourceConfig` component
   - Show data source status in header

3. Enhance `ChatInterface.tsx`
   - Display source citations in responses
   - Show investigation IDs when investigation results are cited
   - Add source filter dropdown
   - Improve response formatting

4. Update `ragIntelligenceService.ts`
   - Add data source management API calls
   - Update query endpoint to support data source selection
   - Handle new response format with citations

5. Create `useRAGDataSources.ts` hook
   - Fetch data sources
   - Manage data source state
   - Handle CRUD operations

### Phase 6: Testing & Validation
**Goal**: Ensure all functionality works end-to-end

**Tasks**:
1. Backend unit tests
   - Test data source service
   - Test investigation indexer
   - Test unified RAG service
   - Test API endpoints

2. Integration tests
   - Test multi-source RAG queries
   - Test investigation indexing workflow
   - Test data source configuration
   - Test database migration (SQLite ↔ PostgreSQL)

3. Frontend tests
   - Test data source configuration UI
   - Test enhanced chat interface
   - Test API integration

4. E2E tests
   - Complete RAG query workflow
   - Data source configuration workflow
   - Investigation results indexing and querying

## Key Implementation Details

### Data Source Types
1. **PostgreSQL**: External PostgreSQL database connection
   - Connection: host, port, database, user, password
   - Query: Custom SQL query to extract content
   - Chunking: Automatic based on content

2. **SQLite**: External SQLite database file
   - Connection: File path
   - Query: Custom SQL query
   - Chunking: Automatic

3. **Investigation Results**: Internal investigation data
   - Source: `investigation_states` table
   - Auto-indexed on completion
   - Includes investigation metadata

4. **Documents**: Uploaded documents
   - Source: File uploads
   - Formats: PDF, markdown, text, HTML
   - Stored in `documents` table

### Vector Search Strategy
- Generate query embedding using OpenAI or sentence-transformers
- Search all enabled data sources in parallel
- Use cosine similarity for ranking
- Aggregate results across sources
- Apply similarity threshold (default 0.7)
- Return top-k results with source attribution

### Investigation Indexing Strategy
- Monitor `investigation_states` table for status = "COMPLETED"
- Extract investigation data from `results_json`
- Format as text: "Investigation {id}: {findings}, Risk Score: {score}, Entities: {entities}"
- Chunk investigation text
- Generate embeddings
- Store with metadata: investigation_id, user_id, status, timestamps
- Index incrementally (only new/updated investigations)

### Error Handling
- Database connection failures: Show status, allow retry
- Embedding generation failures: Fallback to keyword search
- Data source unavailable: Continue with available sources, show warning
- Empty results: Provide helpful feedback
- Large datasets: Batch processing, pagination

## Dependencies & Prerequisites

### Backend Dependencies
- `pgvector` extension for PostgreSQL (if using PostgreSQL)
- `openai` Python package (for embeddings)
- `sentence-transformers` (optional, for local embeddings)
- `sqlalchemy[asyncio]` (for async database operations)
- `asyncpg` (for PostgreSQL async driver)

### Frontend Dependencies
- Existing React/TypeScript setup
- Existing RAG components (already present)

### Database Setup
- PostgreSQL: Requires pgvector extension
- SQLite: No special setup needed

## Success Metrics

- ✅ RAG queries return results in < 5 seconds
- ✅ Investigation indexing completes in < 30 seconds for 100 entities
- ✅ Data source configuration persists across restarts
- ✅ Multi-source queries work correctly
- ✅ Source citations are accurate (90%+)
- ✅ Zero unhandled exceptions
- ✅ All tests pass (87%+ coverage)

## Risks & Mitigations

**Risk**: PostgreSQL pgvector extension not available  
**Mitigation**: Support SQLite fallback, provide clear error messages

**Risk**: Large investigation datasets slow indexing  
**Mitigation**: Batch processing, incremental indexing, background tasks

**Risk**: Multiple data sources cause performance issues  
**Mitigation**: Parallel queries with timeout, result limiting, caching

**Risk**: Embedding API failures  
**Mitigation**: Fallback to keyword search, retry logic, error handling

## Next Steps

1. Complete Phase 1: Data Source Management service
2. Complete Phase 2: Unified RAG Service
3. Complete Phase 3: Backend API router
4. Complete Phase 4: Investigation Results Integration
5. Complete Phase 5: Frontend Enhancements
6. Complete Phase 6: Testing & Validation
