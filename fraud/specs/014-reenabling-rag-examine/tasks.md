# Tasks: Reenabling and Enhancing RAG Application

**Input**: Design documents from `/specs/001-reenabling-rag-examine/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Tests are OPTIONAL - not explicitly requested in spec, so test tasks are excluded unless critical for validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `olorin-server/` (backend), `olorin-front/` (frontend)
- Backend: `olorin-server/app/service/rag/`, `olorin-server/app/router/`
- Frontend: `olorin-front/src/microservices/rag-intelligence/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and prepare for enhancements

- [X] T001 Verify existing RAG infrastructure in olorin-server/app/service/rag/ and olorin-server/app/service/agent/rag/
- [X] T002 Verify existing frontend RAG components in olorin-front/src/microservices/rag-intelligence/
- [X] T003 [P] Verify vector database configuration in olorin-server/app/service/database/vector_database_config.py exists and works
- [X] T004 [P] Verify database models in olorin-server/app/service/database/models.py exist and are complete
- [X] T005 [P] Verify embedding service in olorin-server/app/service/rag/embedding_service.py exists and works
- [X] T006 [P] Verify vector RAG service in olorin-server/app/service/rag/vector_rag_service.py exists and works

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create data source service in olorin-server/app/service/rag/data_source_service.py with CRUD operations for RAGDataSource model
- [X] T008 [P] Create investigation indexer service in olorin-server/app/service/rag/investigation_indexer.py with investigation state monitoring
- [X] T009 [P] Create unified RAG service in olorin-server/app/service/rag/unified_rag_service.py for multi-source query orchestration
- [X] T010 Ensure database tables are created (run migrations) for RAGDataSource, RAGConfiguration, RAGQuery, RAGResponse models
- [X] T011 Create Pydantic schemas in olorin-server/app/schemas/rag_schemas.py for RAG API request/response models

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - RAG Chat Interface with Multi-Source Queries (Priority: P1) 🎯 MVP

**Goal**: Enable natural language queries that pull from multiple configured data sources with proper citations

**Independent Test**: Open RAG page, submit natural language query, verify response includes information from configured data sources with citations showing source attribution

### Implementation for User Story 1

- [X] T012 [US1] Enhance unified RAG service in olorin-server/app/service/rag/unified_rag_service.py to query all enabled data sources in parallel
- [X] T013 [US1] Implement result aggregation logic in olorin-server/app/service/rag/unified_rag_service.py to combine results from multiple sources
- [X] T014 [US1] Add source attribution to search results in olorin-server/app/service/rag/unified_rag_service.py (include source type, source ID, metadata)
- [X] T015 [US1] Integrate unified RAG service with existing rag_orchestrator.py in olorin-server/app/service/agent/rag/rag_orchestrator.py for LLM generation
- [X] T016 [US1] Create RAG query endpoint POST /api/v1/rag/query in olorin-server/app/router/rag_router.py
- [X] T017 [US1] Create RAGQueryRequest and RAGQueryResponse schemas in olorin-server/app/schemas/rag_schemas.py
- [X] T018 [US1] Update frontend RAGApiService in olorin-front/src/shared/services/RAGApiService.ts to call new /api/v1/rag/query endpoint
- [X] T019 [US1] Enhance ChatInterface component in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx to display source citations in responses
- [X] T020 [US1] Add source attribution display to message viewer in olorin-front/src/microservices/rag-intelligence/components/chat/MessageViewer.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can query RAG and see multi-source results with citations

---

## Phase 4: User Story 2 - Data Source Configuration Management (Priority: P1)

**Goal**: Enable administrators to configure, enable/disable, and manage multiple data source types

**Independent Test**: Navigate to data source configuration, add PostgreSQL data source with connection details, verify connection test succeeds, enable source, verify it appears in active sources list

### Implementation for User Story 2

- [X] T021 [US2] Implement create_data_source method in olorin-server/app/service/rag/data_source_service.py for PostgreSQL type
- [X] T022 [US2] Implement create_data_source method in olorin-server/app/service/rag/data_source_service.py for SQLite type
- [X] T023 [US2] Implement create_data_source method in olorin-server/app/service/rag/data_source_service.py for investigation_results type
- [X] T024 [US2] Implement update_data_source method in olorin-server/app/service/rag/data_source_service.py
- [X] T025 [US2] Implement delete_data_source method in olorin-server/app/service/rag/data_source_service.py
- [X] T026 [US2] Implement test_connection method in olorin-server/app/service/rag/data_source_service.py for PostgreSQL (validate connection, test query)
- [X] T027 [US2] Implement test_connection method in olorin-server/app/service/rag/data_source_service.py for SQLite (validate file exists, test query)
- [X] T028 [US2] Implement test_connection method in olorin-server/app/service/rag/data_source_service.py for investigation_results (verify table exists)
- [X] T029 [US2] Implement enable/disable_data_source methods in olorin-server/app/service/rag/data_source_service.py
- [X] T030 [US2] Implement get_all_data_sources method in olorin-server/app/service/rag/data_source_service.py with status checking
- [X] T031 [US2] Create GET /api/v1/rag/data-sources endpoint in olorin-server/app/router/rag_router.py
- [X] T032 [US2] Create POST /api/v1/rag/data-sources endpoint in olorin-server/app/router/rag_router.py
- [X] T033 [US2] Create PUT /api/v1/rag/data-sources/{id} endpoint in olorin-server/app/router/rag_router.py
- [X] T034 [US2] Create DELETE /api/v1/rag/data-sources/{id} endpoint in olorin-server/app/router/rag_router.py
- [X] T035 [US2] Create POST /api/v1/rag/data-sources/{id}/test endpoint in olorin-server/app/router/rag_router.py
- [X] T036 [US2] Create DataSourceCreate, DataSourceUpdate, DataSourceResponse schemas in olorin-server/app/schemas/rag_schemas.py
- [X] T037 [US2] Create DataSourceConfig component in olorin-front/src/microservices/rag-intelligence/components/DataSourceConfig.tsx with data source list
- [X] T038 [US2] Add data source form to DataSourceConfig component in olorin-front/src/microservices/rag-intelligence/components/DataSourceConfig.tsx (PostgreSQL, SQLite, Investigation Results)
- [X] T039 [US2] Add connection test button to DataSourceConfig component in olorin-front/src/microservices/rag-intelligence/components/DataSourceConfig.tsx
- [X] T040 [US2] Add enable/disable toggle to DataSourceConfig component in olorin-front/src/microservices/rag-intelligence/components/DataSourceConfig.tsx
- [X] T041 [US2] Add connection status indicator to DataSourceConfig component in olorin-front/src/microservices/rag-intelligence/components/DataSourceConfig.tsx
- [X] T042 [US2] Create useRAGDataSources hook in olorin-front/src/microservices/rag-intelligence/hooks/useRAGDataSources.ts for data source state management
- [X] T043 [US2] Update ragIntelligenceService in olorin-front/src/microservices/rag-intelligence/services/ragIntelligenceService.ts with data source API methods
- [X] T044 [US2] Add Data Sources tab to RAGConfigurationPage in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx
- [X] T045 [US2] Integrate DataSourceConfig component into RAGConfigurationPage in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can configure data sources and query RAG with multi-source results

---

## Phase 5: User Story 3 - Investigation Results Integration (Priority: P1)

**Goal**: Automatically index investigation results and make them searchable via RAG

**Independent Test**: Complete an investigation, verify it's automatically indexed, query RAG about that investigation, verify investigation results appear in response with investigation ID and metadata

### Implementation for User Story 3

- [X] T046 [US3] Implement index_investigation method in olorin-server/app/service/rag/investigation_indexer.py to extract data from investigation_states table
- [X] T047 [US3] Implement format_investigation_for_rag method in olorin-server/app/service/rag/investigation_indexer.py to convert investigation data to text format
- [X] T048 [US3] Implement chunk_investigation_data method in olorin-server/app/service/rag/investigation_indexer.py to chunk investigation text
- [X] T049 [US3] Implement store_investigation_chunks method in olorin-server/app/service/rag/investigation_indexer.py to store chunks in vector database with investigation metadata
- [X] T050 [US3] Create background task/service in olorin-server/app/service/rag/investigation_indexer.py to poll for new/updated investigations (status = COMPLETED)
- [X] T051 [US3] Implement incremental indexing logic in olorin-server/app/service/rag/investigation_indexer.py to only index new/updated investigations
- [X] T052 [US3] Add investigation metadata (investigation_id, user_id, status, timestamps) to chunk metadata in olorin-server/app/service/rag/investigation_indexer.py
- [X] T053 [US3] Implement investigation-specific search filters in olorin-server/app/service/rag/unified_rag_service.py (by investigation_id, entity_id, status)
- [X] T054 [US3] Enhance unified RAG service to include investigation metadata in search results in olorin-server/app/service/rag/unified_rag_service.py
- [X] T055 [US3] Update RAGQueryRequest schema in olorin-server/app/schemas/rag_schemas.py to support investigation-specific filters
- [X] T056 [US3] Update ChatInterface component in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx to display investigation IDs when investigation results are cited
- [X] T057 [US3] Add investigation metadata display to MessageViewer component in olorin-front/src/microservices/rag-intelligence/components/chat/MessageViewer.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - investigation results are automatically indexed and queryable via RAG

---

## Phase 6: User Story 4 - Document and Knowledge Base Management (Priority: P2)

**Goal**: Enable document upload, organization into knowledge bases, and automatic indexing

**Independent Test**: Upload a document (PDF/markdown), verify it's processed and indexed, query RAG about document content, verify relevant chunks are retrieved with citations

### Implementation for User Story 4

- [ ] T058 [US4] Implement document upload endpoint POST /api/v1/rag/documents/upload in olorin-server/app/router/rag_router.py with file handling
- [ ] T059 [US4] Implement document processing logic in olorin-server/app/service/rag/vector_rag_service.py to extract text from PDF, markdown, text, HTML files
- [ ] T060 [US4] Enhance ingest_document method in olorin-server/app/service/rag/vector_rag_service.py to handle file uploads and extract content
- [ ] T061 [US4] Implement GET /api/v1/rag/documents endpoint in olorin-server/app/router/rag_router.py to list documents
- [ ] T062 [US4] Implement GET /api/v1/rag/documents/{id} endpoint in olorin-server/app/router/rag_router.py to get document details
- [ ] T063 [US4] Implement DELETE /api/v1/rag/documents/{id} endpoint in olorin-server/app/router/rag_router.py
- [ ] T064 [US4] Create DocumentUpload and DocumentResponse schemas in olorin-server/app/schemas/rag_schemas.py
- [ ] T065 [US4] Add document upload UI to RAGConfigurationPage in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx
- [ ] T066 [US4] Add document list display to RAGConfigurationPage in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx
- [ ] T067 [US4] Update ragIntelligenceService in olorin-front/src/microservices/rag-intelligence/services/ragIntelligenceService.ts with document upload API methods
- [ ] T068 [US4] Add knowledge base selection dropdown to query interface in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx
- [ ] T069 [US4] Update RAG query to support knowledge base filtering in olorin-server/app/service/rag/unified_rag_service.py

**Checkpoint**: At this point, User Stories 1-4 should all work independently - documents can be uploaded, indexed, and queried via RAG

---

## Phase 7: User Story 5 - Database Backend Configuration (Priority: P2)

**Goal**: Support both PostgreSQL and SQLite as RAG backend storage options

**Independent Test**: Configure RAG to use SQLite, verify it works, switch to PostgreSQL, verify it connects and functions correctly

### Implementation for User Story 5

- [ ] T070 [US5] Enhance vector_database_config.py in olorin-server/app/service/database/vector_database_config.py to support SQLite backend selection via environment variable
- [ ] T071 [US5] Enhance vector_database_config.py in olorin-server/app/service/database/vector_database_config.py to support PostgreSQL backend selection via environment variable
- [ ] T072 [US5] Implement database backend configuration endpoint GET /api/v1/rag/config/database in olorin-server/app/router/rag_router.py
- [ ] T073 [US5] Implement database backend configuration endpoint PUT /api/v1/rag/config/database in olorin-server/app/router/rag_router.py
- [ ] T074 [US5] Create database migration service in olorin-server/app/service/rag/migration_service.py to migrate data between SQLite and PostgreSQL
- [ ] T075 [US5] Add database backend selection UI to RAGConfigurationPage in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx
- [ ] T076 [US5] Add database connection status display to RAGConfigurationPage in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx
- [ ] T077 [US5] Implement graceful error handling for database connection failures in olorin-server/app/service/database/vector_database_config.py

**Checkpoint**: At this point, User Stories 1-5 should all work independently - RAG system supports both PostgreSQL and SQLite backends

---

## Phase 8: User Story 6 - Vector Search and Retrieval (Priority: P2)

**Goal**: Perform semantic vector search across all configured data sources with proper ranking

**Independent Test**: Index content from multiple sources, perform semantic query, verify retrieved chunks are semantically relevant and ranked by similarity score

### Implementation for User Story 6

- [ ] T078 [US6] Enhance vector search in olorin-server/app/service/rag/vector_rag_service.py to support querying across multiple collections/data sources
- [ ] T079 [US6] Implement result ranking logic in olorin-server/app/service/rag/unified_rag_service.py to sort results by similarity score across all sources
- [ ] T080 [US6] Add similarity threshold filtering in olorin-server/app/service/rag/unified_rag_service.py (default 0.7, configurable)
- [ ] T081 [US6] Implement result deduplication in olorin-server/app/service/rag/unified_rag_service.py to remove duplicate chunks from different sources
- [ ] T082 [US6] Add source attribution to each search result in olorin-server/app/service/rag/unified_rag_service.py (source type, source ID, metadata)
- [ ] T083 [US6] Enhance search results to include similarity scores in olorin-server/app/service/rag/unified_rag_service.py
- [ ] T084 [US6] Update RAGQueryResponse schema in olorin-server/app/schemas/rag_schemas.py to include similarity scores and source attribution
- [ ] T085 [US6] Display similarity scores in frontend MessageViewer component in olorin-front/src/microservices/rag-intelligence/components/chat/MessageViewer.tsx

**Checkpoint**: At this point, User Stories 1-6 should all work independently - vector search works across all data sources with proper ranking

---

## Phase 9: User Story 7 - RAG Response Generation with Source Citations (Priority: P2)

**Goal**: Generate RAG responses with clear citations showing which data sources contributed

**Independent Test**: Submit query that pulls from multiple sources, verify response includes citations with source names, document IDs, investigation IDs, and relevant excerpts

### Implementation for User Story 7

- [ ] T086 [US7] Enhance rag_orchestrator.py in olorin-server/app/service/agent/rag/rag_orchestrator.py to include source citations in generated responses
- [ ] T087 [US7] Implement citation generation logic in olorin-server/app/service/rag/unified_rag_service.py to create citations for each retrieved chunk
- [ ] T088 [US7] Add citation format for investigation results in olorin-server/app/service/rag/unified_rag_service.py (investigation_id, timestamp, findings)
- [ ] T089 [US7] Add citation format for documents in olorin-server/app/service/rag/unified_rag_service.py (document_id, title, chunk_index)
- [ ] T090 [US7] Add citation format for database sources in olorin-server/app/service/rag/unified_rag_service.py (source_name, query, metadata)
- [ ] T091 [US7] Update RAGResponse schema in olorin-server/app/schemas/rag_schemas.py to include citations array with source information
- [ ] T092 [US7] Enhance ChatInterface component in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx to display citations as clickable links
- [ ] T093 [US7] Add citation viewer modal to ChatInterface component in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx to show original source content
- [ ] T094 [US7] Add confidence score display to response in olorin-front/src/microservices/rag-intelligence/components/chat/MessageViewer.tsx
- [ ] T095 [US7] Add source diversity metrics display to response in olorin-front/src/microservices/rag-intelligence/components/chat/MessageViewer.tsx

**Checkpoint**: At this point, all User Stories 1-7 should work independently - RAG responses include proper citations and source attribution

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T096 [P] Add error handling and retry logic for database connection failures in olorin-server/app/service/database/vector_database_config.py
- [ ] T097 [P] Add error handling for embedding generation failures with fallback to keyword search in olorin-server/app/service/rag/embedding_service.py
- [ ] T098 [P] Add batch processing for large investigation datasets in olorin-server/app/service/rag/investigation_indexer.py
- [ ] T099 [P] Add pagination support for investigation indexing in olorin-server/app/service/rag/investigation_indexer.py
- [ ] T100 [P] Add timeout handling for multi-source queries in olorin-server/app/service/rag/unified_rag_service.py
- [ ] T101 [P] Add caching for frequently queried data sources in olorin-server/app/service/rag/unified_rag_service.py
- [ ] T102 [P] Add logging for all RAG operations in olorin-server/app/service/rag/unified_rag_service.py
- [ ] T103 [P] Add performance monitoring for RAG queries in olorin-server/app/service/rag/unified_rag_service.py
- [ ] T104 [P] Update RAG router integration in olorin-server/app/service/router/router_config.py to include rag_router
- [ ] T105 [P] Add authentication/authorization to RAG endpoints in olorin-server/app/router/rag_router.py
- [ ] T106 [P] Add input validation and sanitization to all RAG endpoints in olorin-server/app/router/rag_router.py
- [ ] T107 [P] Add error boundary to DataSourceConfig component in olorin-front/src/microservices/rag-intelligence/components/DataSourceConfig.tsx
- [ ] T108 [P] Add loading states to all RAG UI components in olorin-front/src/microservices/rag-intelligence/components/
- [ ] T109 [P] Add empty state handling when no data sources configured in olorin-front/src/microservices/rag-intelligence/components/RAGConfigurationPage.tsx
- [ ] T110 [P] Add empty state handling when no results found in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2)
  - US1, US2, US3 (all P1) can potentially run in parallel after foundational
  - US4, US5, US6, US7 (all P2) can run in parallel after P1 stories
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run parallel with US1)
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run parallel with US1, US2)
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Benefits from US1/US2 but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Benefits from US1/US2 but independently testable
- **User Story 7 (P2)**: Can start after Foundational (Phase 2) - Benefits from US1/US6 but independently testable

### Within Each User Story

- Models/schemas before services
- Services before endpoints
- Backend endpoints before frontend integration
- Core implementation before UI enhancements
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1, 2, 3 (all P1) can start in parallel
- User Stories 4, 5, 6, 7 (all P2) can run in parallel after P1 stories
- Different components within a story marked [P] can run in parallel
- Frontend and backend work for same story can run in parallel after API contracts are defined

---

## Parallel Example: User Story 1

```bash
# Backend tasks that can run in parallel:
Task: "Enhance unified RAG service in olorin-server/app/service/rag/unified_rag_service.py to query all enabled data sources in parallel"
Task: "Create RAGQueryRequest and RAGQueryResponse schemas in olorin-server/app/schemas/rag_schemas.py"

# Frontend tasks that can run in parallel (after backend API is ready):
Task: "Update frontend RAGApiService in olorin-front/src/shared/services/RAGApiService.ts to call new /api/v1/rag/query endpoint"
Task: "Enhance ChatInterface component in olorin-front/src/microservices/rag-intelligence/components/chat/ChatInterface.tsx to display source citations"
```

---

## Parallel Example: User Story 2

```bash
# Backend API endpoints that can be implemented in parallel:
Task: "Create GET /api/v1/rag/data-sources endpoint in olorin-server/app/router/rag_router.py"
Task: "Create POST /api/v1/rag/data-sources endpoint in olorin-server/app/router/rag_router.py"
Task: "Create PUT /api/v1/rag/data-sources/{id} endpoint in olorin-server/app/router/rag_router.py"
Task: "Create DELETE /api/v1/rag/data-sources/{id} endpoint in olorin-server/app/router/rag_router.py"
Task: "Create POST /api/v1/rag/data-sources/{id}/test endpoint in olorin-server/app/router/rag_router.py"

# Service methods that can be implemented in parallel:
Task: "Implement create_data_source method in olorin-server/app/service/rag/data_source_service.py for PostgreSQL type"
Task: "Implement create_data_source method in olorin-server/app/service/rag/data_source_service.py for SQLite type"
Task: "Implement create_data_source method in olorin-server/app/service/rag/data_source_service.py for investigation_results type"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only - All P1)

1. Complete Phase 1: Setup (verify existing infrastructure)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (RAG Chat with Multi-Source Queries)
4. Complete Phase 4: User Story 2 (Data Source Configuration)
5. Complete Phase 5: User Story 3 (Investigation Results Integration)
6. **STOP and VALIDATE**: Test all three P1 stories independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic RAG MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Data Source Config!)
4. Add User Story 3 → Test independently → Deploy/Demo (Investigation Integration!)
5. Add User Stories 4-7 (P2) → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (RAG Chat)
   - Developer B: User Story 2 (Data Source Config)
   - Developer C: User Story 3 (Investigation Indexing)
3. After P1 stories complete:
   - Developer A: User Story 4 (Documents)
   - Developer B: User Story 5 (Database Config)
   - Developer C: User Story 6 (Vector Search)
   - Developer D: User Story 7 (Citations)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All files must be < 200 lines (constitutional requirement)
- No mocks/stubs/TODOs in production code
- All configuration from environment variables
- Reuse existing RAG infrastructure to avoid duplication
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Verify existing infrastructure before creating new components

