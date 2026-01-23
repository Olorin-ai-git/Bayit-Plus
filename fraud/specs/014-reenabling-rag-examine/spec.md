# Feature Specification: Reenabling and Enhancing RAG Application

**Feature Branch**: `001-reenabling-rag-examine`  
**Created**: 2025-01-18  
**Status**: Draft  
**Input**: User description: "reenabling the RAG. examine our existing RAG page, enhance it and make it a fully fledged RAG application with the front as the RAG page, add teh option to configure datasources to the RAG. use postgres db or SQLITE as needed. teh RAG application should use various data sources AND teh investigations results as its data sources"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - RAG Chat Interface with Multi-Source Queries (Priority: P1)

As an investigator, I want to query the RAG system using natural language questions and receive answers that pull from multiple configured data sources including investigation results, so that I can quickly get comprehensive answers about fraud patterns, investigation procedures, and historical case data.

**Why this priority**: This is the core value proposition of the RAG system - enabling natural language queries across multiple data sources. Without this, the RAG application has no primary use case.

**Independent Test**: Can be fully tested by opening the RAG page, typing a natural language query (e.g., "What are common fraud patterns for IP addresses?"), and verifying that the response includes relevant information from configured data sources with proper citations and source attribution.

**Acceptance Scenarios**:

1. **Given** the RAG page is loaded and at least one data source is configured, **When** a user submits a natural language query, **Then** the system returns a comprehensive answer with citations showing which data sources contributed to the response
2. **Given** investigation results are available in the database, **When** a user queries about a specific investigation ID or pattern, **Then** the RAG system retrieves and includes relevant investigation results in the response
3. **Given** multiple data sources are configured (investigations, documents, knowledge base), **When** a user queries, **Then** the system aggregates results from all enabled sources and presents a unified answer
4. **Given** a query requires data from multiple sources, **When** the RAG processes the query, **Then** the response includes source attribution showing which data came from which source

---

### User Story 2 - Data Source Configuration Management (Priority: P1)

As a system administrator, I want to configure which data sources the RAG system uses, including enabling/disabling sources, setting connection parameters, and managing source-specific settings, so that I can control what information the RAG system has access to.

**Why this priority**: Data source configuration is foundational - without the ability to configure sources, the RAG cannot access investigation results or other data sources. This must work before queries can be meaningful.

**Independent Test**: Can be fully tested by navigating to the data source configuration section, adding a new data source (e.g., PostgreSQL investigation results), configuring connection parameters, enabling it, and verifying it appears in the active sources list with a "connected" status.

**Acceptance Scenarios**:

1. **Given** the RAG configuration page is open, **When** an admin navigates to the data sources tab, **Then** they see a list of available data source types (PostgreSQL, SQLite, Investigation Results, Document Store, etc.)
2. **Given** an admin wants to add a PostgreSQL data source, **When** they fill in connection details (host, port, database, credentials), **Then** the system validates the connection and saves the configuration
3. **Given** investigation results are stored in the database, **When** an admin enables "Investigation Results" as a data source, **Then** the RAG system can query investigation results for future queries
4. **Given** a data source is configured, **When** an admin disables it, **Then** that source is excluded from future RAG queries but configuration is preserved
5. **Given** multiple data sources are configured, **When** an admin views the configuration, **Then** they see the status (connected/disconnected/error) for each source

---

### User Story 3 - Investigation Results Integration (Priority: P1)

As an investigator, I want the RAG system to automatically index and make searchable all investigation results, so that I can query historical investigations, patterns, and findings using natural language.

**Why this priority**: Investigation results are a critical data source mentioned explicitly in the requirements. The RAG system must be able to access and query investigation data to provide value.

**Independent Test**: Can be fully tested by ensuring investigation results are automatically indexed when they're created/completed, then querying the RAG system with questions about specific investigations or patterns, and verifying the responses include relevant investigation data.

**Acceptance Scenarios**:

1. **Given** an investigation completes and results are stored in the database, **When** the RAG indexing service runs, **Then** the investigation results are processed, chunked, and added to the vector database
2. **Given** investigation results are indexed, **When** a user queries "show me investigations involving IP address 192.168.1.1", **Then** the RAG returns relevant investigation results with investigation IDs, timestamps, and key findings
3. **Given** investigation results contain structured data (entities, risk scores, findings), **When** the RAG indexes them, **Then** the structured fields are preserved and searchable
4. **Given** investigation results are updated, **When** the RAG system detects changes, **Then** the index is updated to reflect the latest investigation state

---

### User Story 4 - Document and Knowledge Base Management (Priority: P2)

As a knowledge manager, I want to upload documents, organize them into knowledge bases, and have them automatically indexed for RAG queries, so that the RAG system has access to organizational knowledge, procedures, and reference materials.

**Why this priority**: While investigation results are critical, documents and knowledge bases provide essential context and reference material. This enables the RAG to answer questions about procedures, policies, and domain knowledge.

**Independent Test**: Can be fully tested by uploading a document (PDF, markdown, etc.), verifying it's processed and indexed, then querying the RAG about content from that document and confirming accurate retrieval.

**Acceptance Scenarios**:

1. **Given** the RAG page is open, **When** a user uploads a document (PDF, markdown, text), **Then** the document is processed, chunked, embedded, and added to the vector database
2. **Given** documents are uploaded, **When** a user queries about content in those documents, **Then** the RAG retrieves relevant chunks with proper citations
3. **Given** multiple knowledge bases exist, **When** a user queries, **Then** they can specify which knowledge bases to search or search all
4. **Given** a document is updated, **When** the new version is uploaded, **Then** the RAG system updates the index with the latest content

---

### User Story 5 - Database Backend Configuration (Priority: P2)

As a system administrator, I want to configure whether the RAG system uses PostgreSQL or SQLite for storage, so that I can choose the appropriate database based on deployment environment (production vs development).

**Why this priority**: Database choice affects deployment, performance, and scalability. The system should support both options as specified in requirements.

**Independent Test**: Can be fully tested by configuring the RAG system to use SQLite, verifying it works, then switching to PostgreSQL configuration and verifying it connects and functions correctly.

**Acceptance Scenarios**:

1. **Given** the RAG system is being configured, **When** an admin selects SQLite as the database backend, **Then** the system creates/uses a local SQLite database file for RAG data storage
2. **Given** the RAG system is being configured, **When** an admin selects PostgreSQL as the database backend and provides connection details, **Then** the system connects to PostgreSQL and creates necessary tables/indexes
3. **Given** the RAG system is using SQLite, **When** an admin switches to PostgreSQL, **Then** the system migrates existing data (if any) to PostgreSQL
4. **Given** database connection fails, **When** the RAG system attempts to use it, **Then** appropriate error messages are shown and the system gracefully handles the failure

---

### User Story 6 - Vector Search and Retrieval (Priority: P2)

As the RAG system, I need to perform semantic search across all configured data sources using vector embeddings, so that queries retrieve the most relevant information regardless of which source it comes from.

**Why this priority**: Vector search is the core retrieval mechanism for RAG. Without effective retrieval, the generation quality suffers significantly.

**Independent Test**: Can be fully tested by indexing content from multiple sources, performing queries, and verifying that retrieved chunks are semantically relevant and ranked appropriately.

**Acceptance Scenarios**:

1. **Given** content is indexed from multiple data sources, **When** a semantic query is performed, **Then** results are ranked by relevance score across all sources
2. **Given** a query is submitted, **When** vector search executes, **Then** the top-k most relevant chunks are retrieved with similarity scores
3. **Given** retrieved chunks come from different sources, **When** results are presented, **Then** each chunk includes source attribution and metadata
4. **Given** a query has low similarity matches, **When** results are below threshold, **Then** the system indicates no relevant results found rather than returning low-quality matches

---

### User Story 7 - RAG Response Generation with Source Citations (Priority: P2)

As a user, I want RAG responses to include clear citations showing which data sources contributed to the answer, so that I can verify the information and trace it back to original sources.

**Why this priority**: Source attribution is critical for trust and verification, especially when dealing with investigation results and sensitive data.

**Independent Test**: Can be fully tested by submitting a query that pulls from multiple sources, and verifying the response includes citations with source names, document IDs, investigation IDs (if applicable), and relevant excerpts.

**Acceptance Scenarios**:

1. **Given** a RAG query retrieves information from multiple sources, **When** the response is generated, **Then** each claim in the response includes citations to source documents/chunks
2. **Given** investigation results are included in a response, **When** the response is displayed, **Then** investigation IDs and timestamps are shown as citations
3. **Given** a response includes citations, **When** a user clicks on a citation, **Then** they can view the original source content
4. **Given** a response is generated, **When** it's displayed, **Then** confidence scores and source diversity metrics are shown

---

### Edge Cases

- What happens when no data sources are configured? System should show a clear message directing users to configure data sources before querying.
- How does system handle database connection failures? System should show connection status, retry logic, and graceful degradation (e.g., use cached results if available).
- What happens when investigation results are very large (e.g., thousands of investigations)? System should paginate indexing, use batch processing, and optimize vector search performance.
- How does system handle queries that return no results? System should provide helpful feedback suggesting alternative queries or checking data source configuration.
- What happens when a data source becomes unavailable during a query? System should continue with available sources and indicate which sources were unavailable.
- How does system handle conflicting information from different sources? System should present multiple perspectives with source attribution, allowing users to evaluate credibility.
- What happens when vector database is empty or not yet indexed? System should show indexing status and prevent queries until initial indexing completes.
- How does system handle SQLite database file permissions or disk space issues? System should provide clear error messages and suggest solutions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a RAG chat interface accessible from the main RAG page that accepts natural language queries
- **FR-002**: System MUST support configuration of multiple data source types including PostgreSQL databases, SQLite databases, investigation results, document stores, and knowledge bases
- **FR-003**: System MUST automatically index investigation results from the investigation_states and investigation_results tables when they are created or updated
- **FR-004**: System MUST support both PostgreSQL and SQLite as backend database options for RAG metadata and vector storage, configurable via environment variables or UI settings
- **FR-005**: System MUST perform semantic vector search across all enabled data sources when processing a query
- **FR-006**: System MUST generate responses that aggregate information from multiple data sources with proper source attribution and citations
- **FR-007**: System MUST provide a data source configuration UI where administrators can add, edit, enable, disable, and test data source connections
- **FR-008**: System MUST validate data source connections before saving configuration and show connection status (connected/disconnected/error) for each source
- **FR-009**: System MUST chunk and embed content from all configured data sources into a unified vector database for semantic search
- **FR-010**: System MUST support document upload (PDF, markdown, text, etc.) with automatic processing, chunking, and indexing
- **FR-011**: System MUST allow users to organize documents into knowledge bases with configurable settings (chunk size, overlap, embedding model)
- **FR-012**: System MUST retrieve investigation results by investigation_id, entity_id, status, date range, and other metadata fields
- **FR-013**: System MUST include investigation metadata (investigation_id, user_id, status, timestamps) in RAG responses when investigation results are cited
- **FR-014**: System MUST support field mappings, regex patterns, and eval commands for data extraction and transformation (existing RAG functionality)
- **FR-015**: System MUST support prepared prompts with variable substitution for common query patterns
- **FR-016**: System MUST persist RAG configuration, data source settings, and chat history to the configured database (PostgreSQL or SQLite)
- **FR-017**: System MUST provide API endpoints for RAG queries, data source management, document management, and configuration management
- **FR-018**: System MUST handle database connection failures gracefully with retry logic and user-friendly error messages
- **FR-019**: System MUST support migration of RAG data between SQLite and PostgreSQL backends
- **FR-020**: System MUST index investigation results incrementally (only new/updated investigations) to avoid full re-indexing

### Key Entities *(include if feature involves data)*

- **RAGDataSource**: Represents a configured data source with connection details, type (postgresql/sqlite/investigations/documents), enabled status, and configuration metadata. Relationships: belongs to RAGConfiguration, provides content for RAGChunks
- **RAGConfiguration**: System-wide RAG settings including default models, chunking parameters, embedding configuration, and active data sources. Relationships: has many RAGDataSources, has one DatabaseBackend
- **RAGChunk**: A chunked piece of content with embeddings, metadata, and source attribution. Relationships: belongs to RAGDataSource, belongs to Document (if from document source), belongs to InvestigationResult (if from investigation source)
- **RAGQuery**: A user query with natural language text, retrieval options, generation options, and selected data sources. Relationships: belongs to RAGSession, produces RAGResponse
- **RAGResponse**: Generated answer with text, sources, citations, confidence score, and processing metadata. Relationships: belongs to RAGQuery, cites multiple RAGChunks
- **InvestigationResultIndex**: Indexed investigation result data with investigation_id, entity data, findings, risk scores, and embeddings. Relationships: references InvestigationRecord, provides content for RAGChunks
- **Document**: Uploaded document with metadata, content, processing status, and chunk references. Relationships: belongs to KnowledgeBase, has many RAGChunks
- **KnowledgeBase**: Collection of documents with settings, statistics, and permissions. Relationships: has many Documents, belongs to RAGConfiguration
- **DatabaseBackend**: Configuration for database backend (PostgreSQL or SQLite) with connection details and status. Relationships: stores RAGConfiguration, RAGDataSource, RAGChunk metadata

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully query the RAG system and receive answers within 5 seconds for queries that search across up to 3 data sources
- **SC-002**: System successfully indexes investigation results automatically within 30 seconds of investigation completion for investigations with up to 100 entities
- **SC-003**: Administrators can configure a new data source (PostgreSQL or SQLite) and verify connection within 2 minutes
- **SC-004**: RAG responses include accurate source citations for at least 90% of factual claims made in the response
- **SC-005**: System successfully retrieves relevant investigation results for queries containing investigation IDs, entity IDs, or investigation patterns with 80%+ relevance accuracy
- **SC-006**: Vector search retrieves top-10 most relevant chunks across all enabled data sources with average similarity score > 0.7 for well-formed queries
- **SC-007**: System handles database connection failures gracefully, showing clear error messages and allowing retry, with zero unhandled exceptions
- **SC-008**: Document upload and indexing completes successfully for documents up to 10MB within 2 minutes
- **SC-009**: RAG system can query across at least 3 different data source types simultaneously (e.g., PostgreSQL investigations, SQLite documents, investigation results) without performance degradation
- **SC-010**: Data source configuration persists correctly across application restarts for both PostgreSQL and SQLite backends
