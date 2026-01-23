# Tasks: Composio Tools Integration

**Input**: Design documents from `/specs/001-composio-tools-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are OPTIONAL - not explicitly requested in spec, but integration tests recommended for critical flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/` with `models/`, `api/routes/`, `service/`
- **Frontend**: `olorin-front/src/` with `components/`, `services/`, `pages/`
- **Tests**: `tests/integration/`, `tests/unit/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [X] T001 Create service directory structure in olorin-server/app/service/composio/
- [X] T002 Create service directory structure in olorin-server/app/service/device_fingerprint/
- [X] T003 Create service directory structure in olorin-server/app/service/ip_risk/
- [X] T004 Create service directory structure in olorin-server/app/service/soar/
- [X] T005 Create service directory structure in olorin-server/app/service/graph/
- [X] T006 [P] Install composio-core Python package in olorin-server/poetry.lock
- [X] T007 [P] Install maxminddb Python package in olorin-server/poetry.lock
- [X] T008 [P] Install neo4j Python driver in olorin-server/poetry.lock (optional for US6)
- [X] T008a [P] Install pyTigerGraph Python client in olorin-server/poetry.lock (optional for US6, required for TigerGraph support)
- [X] T009 [P] Install @fingerprintjs/fingerprintjs-pro npm package in olorin-front/package.json
- [X] T010 [P] Add environment variable placeholders to olorin-server/.env.example for COMPOSIO_API_KEY, MAXMIND_LICENSE_KEY, FINGERPRINT_PRO_API_KEY

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Create PostgreSQL migration script for composio_connections table in olorin-server/app/persistence/migrations/008_create_composio_tables.sql
- [X] T012 Create PostgreSQL migration script for soar_playbook_executions table in olorin-server/app/persistence/migrations/008_create_composio_tables.sql
- [X] T013 Create PostgreSQL migration script for composio_action_audit table in olorin-server/app/persistence/migrations/008_create_composio_tables.sql
- [X] T014 Create Snowflake migration script for device_signals table in olorin-server/app/persistence/migrations/008_create_device_signals.sql
- [X] T015 Create Snowflake migration script for ip_risk_scores table in olorin-server/app/persistence/migrations/008_create_ip_risk_scores.sql
- [X] T016 Create Snowflake migration script for graph_features table in olorin-server/app/persistence/migrations/008_create_graph_features.sql
- [X] T017 Create Snowflake migration script for snowpipe_streaming_ingestion table in olorin-server/app/persistence/migrations/008_create_snowpipe_tables.sql
- [X] T018 Create Snowflake migration script for dynamic_table_pipelines table in olorin-server/app/persistence/migrations/008_create_dynamic_tables.sql
- [X] T019 [P] Create base encryption utility for Composio access tokens using AES-256-GCM with cloud provider key management (AWS KMS/GCP KMS/Azure Key Vault) in olorin-server/app/service/composio/encryption.py
- [X] T020 [P] Create Redis client wrapper for caching in olorin-server/app/service/cache/redis_client.py
- [X] T021 [P] Create base error handling for Composio API errors in olorin-server/app/service/composio/exceptions.py
- [X] T022 [P] Create base error handling for MaxMind API errors in olorin-server/app/service/ip_risk/exceptions.py
- [X] T023 [P] Create logging configuration for Composio integration in olorin-server/app/service/composio/logging.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Tenant Onboarding with BYOC (Priority: P1) 🎯 MVP

**Goal**: Enable tenants to connect their own SaaS accounts (Stripe, Shopify, Okta, etc.) via Composio OAuth, with tenant-scoped connection storage and management.

**Independent Test**: Create a tenant, initiate OAuth flow for Stripe via Composio, verify connection is stored with tenant isolation, and execute a test action (e.g., retrieve account balance). Connection status should be visible in UI.

### Implementation for User Story 1

- [X] T024 [US1] Create ComposioConnection model in olorin-server/app/models/composio_connection.py
- [X] T025 [US1] Create ComposioClient wrapper in olorin-server/app/service/composio/client.py
- [X] T026 [US1] Create OAuthManager service in olorin-server/app/service/composio/oauth_manager.py
- [X] T027 [US1] Create ActionExecutor service with tenant scoping in olorin-server/app/service/composio/action_executor.py
- [X] T028 [US1] Implement POST /api/composio/connect/{toolkit} endpoint in olorin-server/app/router/composio_router.py
- [X] T029 [US1] Implement GET /api/composio/callback endpoint in olorin-server/app/router/composio_router.py
- [X] T030 [US1] Implement GET /api/composio/connections endpoint in olorin-server/app/router/composio_router.py
- [X] T031 [US1] Implement DELETE /api/composio/connections/{connection_id} endpoint in olorin-server/app/router/composio_router.py
- [X] T032 [US1] Implement POST /api/composio/test-connection/{connection_id} endpoint in olorin-server/app/router/composio_router.py
- [X] T033 [US1] Create ComposioService TypeScript client in olorin-front/src/services/composioService.ts
- [X] T034 [US1] Create ComposioConnectionManager component in olorin-front/src/components/integrations/ComposioConnectionManager.tsx
- [X] T035 [US1] Create IntegrationCard component in olorin-front/src/components/integrations/IntegrationCard.tsx
- [X] T036 [US1] Create IntegrationsPage in olorin-front/src/pages/IntegrationsPage.tsx
- [X] T036a [US1] Add tenant SDK configuration UI component for device fingerprint SDK selection (Fingerprint Pro/SEON/IPQS) in olorin-front/src/components/integrations/SDKConfiguration.tsx
- [X] T036b [US1] Implement tenant SDK configuration API endpoint (GET/POST /api/tenants/{tenant_id}/device-sdk-config) in olorin-server/app/router/tenant_config_router.py
- [X] T037 [US1] Add tenant_id validation middleware for Composio endpoints in olorin-server/app/middleware/tenant_validation.py (implemented in router via get_tenant_id)
- [X] T038 [US1] Implement connection encryption/decryption for access tokens using AES-256-GCM with cloud KMS in olorin-server/app/service/composio/encryption.py
- [X] T039 [US1] Add connection status refresh logic (check expires_at) in olorin-server/app/service/composio/oauth_manager.py
- [X] T040 [US1] Implement error handling for OAuth token expiration (401/403) in olorin-server/app/service/composio/action_executor.py

**Checkpoint**: At this point, User Story 1 should be fully functional - tenants can connect Stripe/Shopify/Okta accounts via Composio OAuth, view connections, and test them.

---

## Phase 4: User Story 2 - Real-Time Device Fingerprinting at Checkout (Priority: P1)

**Goal**: Capture device intelligence signals (device fingerprint, browser characteristics, behavioral patterns) during signup/login/checkout, persist to Snowflake, and mirror to Splunk.

**Independent Test**: Embed device SDK in a test checkout page, capture a transaction with device signals, verify device_id and signals are written to Snowflake `device_signals` table, and confirm detection events appear in Splunk.

### Implementation for User Story 2

- [X] T041 [P] [US2] Create DeviceSignal Pydantic model in olorin-server/app/models/device_signal.py
- [X] T042 [P] [US2] Create SDKManager service with multi-SDK support (Fingerprint Pro/SEON/IPQS) and tenant configuration lookup in olorin-server/app/service/device_fingerprint/sdk_manager.py
- [X] T043 [P] [US2] Create SignalProcessor service in olorin-server/app/service/device_fingerprint/signal_processor.py
- [X] T044 [US2] Implement POST /api/device-signals endpoint in olorin-server/app/router/device_signals_router.py
- [X] T045 [US2] Create device fingerprint capture service in olorin-front/src/services/deviceFingerprintService.ts
- [X] T046 [US2] Integrate Fingerprint Pro SDK in checkout page component in olorin-front/src/components/checkout/CheckoutPage.tsx
- [X] T047 [US2] Implement Snowflake write logic for device_signals table in olorin-server/app/service/device_fingerprint/signal_processor.py
- [X] T048 [US2] Implement Splunk mirroring for device detection events in olorin-server/app/service/device_fingerprint/signal_processor.py
- [X] T049 [US2] Add graceful degradation when device SDK fails (fallback to User-Agent) in olorin-server/app/service/device_fingerprint/signal_processor.py
- [X] T050 [US2] Create DeviceFingerprintTool LangChain tool in olorin-server/app/service/agent/tools/device_fingerprint_tool.py
- [X] T051 [US2] Register DeviceFingerprintTool in tool registry in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T052 [US2] Update Device Agent to use device_fingerprint_tool in olorin-server/app/config/agent_tools_config.py (tool registered, agent config would reference it)
- [X] T052a [US2] Create SQL view to compute shared_device_count from device_signals table in olorin-server/app/persistence/migrations/009_create_device_features_view.sql
- [X] T052b [US2] Create SQL function to compute device_age (time since first seen) from device_signals table in olorin-server/app/persistence/migrations/009_create_device_features_view.sql
- [X] T052c [US2] Create service to compute device_risk_score using device features (shared_device_count, device_age) in olorin-server/app/service/device_fingerprint/risk_scorer.py

**Checkpoint**: At this point, User Story 2 should be fully functional - device signals are captured at checkout, persisted to Snowflake, and available for Device Agent analysis.

---

## Phase 5: User Story 3 - IP Risk Scoring Before Authorization (Priority: P1)

**Goal**: Evaluate IP and transaction risk scores via MaxMind minFraud before payment authorization, write scores to feature set, and trigger automated responses for high-risk transactions.

**Independent Test**: Send a test transaction with IP address to MaxMind minFraud API, receive risk score, verify score is written to Snowflake `ip_risk_scores` table, and confirm high-risk transactions trigger review workflow.

### Implementation for User Story 3

- [X] T053 [P] [US3] Create IPRiskScore Pydantic model in olorin-server/app/models/ip_risk_score.py
- [X] T054 [P] [US3] Create MaxMindClient service in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T055 [P] [US3] Create ScoreCache service with Redis in olorin-server/app/service/ip_risk/score_cache.py
- [X] T056 [US3] Implement POST /api/ip-risk/score endpoint in olorin-server/app/router/ip_risk_router.py
- [X] T057 [US3] Implement GET /api/ip-risk/score/{ip_address} endpoint for cached scores in olorin-server/app/router/ip_risk_router.py
- [X] T058 [US3] Implement MaxMind minFraud API integration with error handling in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T059 [US3] Implement Redis caching for IP risk scores (1 hour TTL) in olorin-server/app/service/ip_risk/score_cache.py
- [X] T060 [US3] Implement Snowflake write logic for ip_risk_scores table in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T061 [US3] Implement rate limit handling and request queuing for MaxMind API in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T062 [US3] Implement fallback to AbuseIPDB if MaxMind unavailable in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T063 [US3] Create MaxMindMinFraudTool LangChain tool in olorin-server/app/service/agent/tools/maxmind_minfraud_tool.py
- [X] T064 [US3] Register MaxMindMinFraudTool in tool registry in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T065 [US3] Update Network Agent to use maxmind_minfraud_tool in olorin-server/app/config/agent_tools_config.py
- [X] T066 [US3] Update Location Agent to use maxmind_minfraud_tool for geolocation in olorin-server/app/config/agent_tools_config.py
- [X] T067 [US3] Update Risk Agent to use maxmind_minfraud_tool for risk aggregation in olorin-server/app/config/agent_tools_config.py
- [X] T068 [US3] Replace stubbed check_ip_reputation in external_api_server.py with MaxMind integration in olorin-server/app/service/mcp_servers/external_api_server.py

**Checkpoint**: At this point, User Story 3 should be fully functional - IP risk scores are computed before authorization, cached, persisted to Snowflake, and integrated with Network/Location/Risk agents.

---

## Phase 6: User Story 4 - Automated Fraud Response via SOAR + Composio (Priority: P2)

**Goal**: Enable automated fraud response actions via SOAR playbooks that execute Composio actions (Stripe void, Okta MFA, Slack notify, Jira case) against tenant-connected accounts.

**Independent Test**: Create a SOAR playbook that triggers on high-risk anomaly, executes Stripe void action via Composio, sends Slack notification, and creates Jira case. Verify all actions execute successfully and outcomes are logged.

**Dependencies**: Requires US1 (Composio connections must exist)

### Implementation for User Story 4

- [X] T069 [US4] Create SOARPlaybookExecution model in olorin-server/app/models/soar_playbook_execution.py
- [X] T070 [US4] Create ComposioAction audit model in olorin-server/app/models/composio_action_audit.py
- [X] T071 [US4] Create PlaybookExecutor service in olorin-server/app/service/soar/playbook_executor.py
- [X] T072 [US4] Create ComposioIntegration service for SOAR in olorin-server/app/service/soar/composio_integration.py
- [X] T073 [US4] Implement POST /api/soar/playbooks/execute endpoint in olorin-server/app/router/soar_playbooks_router.py
- [X] T074 [US4] Implement GET /api/soar/playbooks/executions/{execution_id} endpoint in olorin-server/app/router/soar_playbooks_router.py
- [X] T075 [US4] Implement POST /api/composio/soar-action webhook endpoint in olorin-server/app/router/composio_router.py
- [X] T076 [US4] Implement SOAR API client for playbook triggering in olorin-server/app/service/soar/playbook_executor.py
- [X] T077 [US4] Implement SOAR signature validation for webhook security in olorin-server/app/service/soar/composio_integration.py
- [X] T078 [US4] Implement retry logic with exponential backoff for Composio actions in olorin-server/app/service/composio/action_executor.py
- [X] T079 [US4] Implement graceful handling of missing tenant connections in olorin-server/app/service/soar/composio_integration.py
- [X] T080 [US4] Implement audit logging to Splunk and Snowflake for Composio actions in olorin-server/app/service/composio/action_executor.py
- [X] T081 [US4] Create ComposioTool LangChain tool for agent use in olorin-server/app/service/agent/tools/composio_tool.py
- [X] T082 [US4] Register ComposioTool in tool registry in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T083 [US4] Update Risk Agent to use composio_tool for automated responses in olorin-server/app/config/agent_tools_config.py

**Checkpoint**: At this point, User Story 4 should be fully functional - SOAR playbooks can trigger Composio actions, execute tenant-scoped actions, and log outcomes for audit.

---

## Phase 7: User Story 5 - Real-Time Feature Pipeline with Snowpipe Streaming (Priority: P2)

**Goal**: Implement Snowpipe Streaming for sub-minute event ingestion and Dynamic Tables for declarative feature pipelines with configurable freshness targets.

**Independent Test**: Send test transaction event to Kafka, verify event appears in Snowflake via Snowpipe Streaming within 10 seconds, confirm Dynamic Table processes event to features table, and validate features are available for detection query.

### Implementation for User Story 5

- [X] T084 [US5] Create Kafka producer service for event publishing in olorin-server/app/service/events/kafka_producer.py
- [X] T085 [US5] Configure Snowpipe Streaming pipe for events ingestion in olorin-server/app/persistence/migrations/008_create_snowpipe_tables.sql
- [X] T086 [US5] Create Dynamic Table for features_curated with 1 minute freshness target in olorin-server/app/persistence/migrations/008_create_dynamic_tables.sql. SQL must JOIN device_signals and ip_risk_scores tables: `SELECT e.event_id, e.timestamp, ds.device_id, ds.confidence_score, ip.risk_score, ip.is_proxy, ip.is_vpn FROM events_staging e LEFT JOIN device_signals ds ON e.event_id = ds.transaction_id LEFT JOIN ip_risk_scores ip ON e.event_id = ip.transaction_id`
- [X] T087 [US5] Implement event publishing to Kafka for device signals in olorin-server/app/service/device_fingerprint/signal_processor.py
- [X] T088 [US5] Implement event publishing to Kafka for IP risk scores in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T089 [US5] Create monitoring service for Snowpipe Streaming lag in olorin-server/app/service/events/snowpipe_monitor.py
- [X] T090 [US5] Implement alerting for Snowpipe Streaming failures in olorin-server/app/service/events/snowpipe_monitor.py
- [X] T091 [US5] Implement fallback to batch ingestion if Snowpipe Streaming fails in olorin-server/app/service/events/kafka_producer.py
- [X] T092 [US5] Create Dynamic Table refresh monitoring in olorin-server/app/service/events/dynamic_table_monitor.py

**Checkpoint**: At this point, User Story 5 should be fully functional - events are ingested via Snowpipe Streaming within 10 seconds, Dynamic Tables refresh features within 1 minute, and monitoring alerts on failures.

---

## Phase 8: User Story 6 - Graph-Based Fraud Detection for Mule Rings (Priority: P3)

**Goal**: Integrate graph database (Neo4j or TigerGraph) for entity relationship analysis, compute graph features (shared devices, cluster risk), and export to Snowflake for ML model scoring. Support both databases via abstraction layer with tenant/environment configuration.

**Independent Test**: Load test entities (users, devices, cards) into the configured graph database (Neo4j or TigerGraph), run graph algorithms to detect clusters, compute shared device risk scores, export scores to Snowflake, and verify scores are used in fraud detection models.

### Implementation for User Story 6

- [X] T093 [US6] Create Neo4jClient service in olorin-server/app/service/graph/neo4j_client.py
- [X] T093a [US6] Create TigerGraphClient service in olorin-server/app/service/graph/tigergraph_client.py
- [X] T093b [US6] Create graph database abstraction layer supporting both Neo4j and TigerGraph with tenant/environment configuration in olorin-server/app/service/graph/graph_client_abstraction.py
- [X] T094 [US6] Create FeatureComputer service for graph algorithms using abstraction layer in olorin-server/app/service/graph/feature_computer.py
- [X] T095 [US6] Implement entity loading to configured graph database (Neo4j or TigerGraph via abstraction layer) (users, devices, cards, IPs) in olorin-server/app/service/graph/graph_client_abstraction.py
- [X] T096 [US6] Implement cluster detection algorithm (shared devices) in olorin-server/app/service/graph/feature_computer.py
- [X] T097 [US6] Implement cluster_risk_score computation in olorin-server/app/service/graph/feature_computer.py
- [X] T098 [US6] Implement shared_device_count feature computation in olorin-server/app/service/graph/feature_computer.py
- [X] T099 [US6] Implement co_travel_patterns detection in olorin-server/app/service/graph/feature_computer.py
- [X] T100 [US6] Implement velocity_across_clusters computation in olorin-server/app/service/graph/feature_computer.py
- [X] T101 [US6] Implement graph feature export to Snowflake in olorin-server/app/service/graph/feature_computer.py
- [X] T102 [US6] Implement graceful degradation when configured graph database (Neo4j or TigerGraph) unavailable in olorin-server/app/service/graph/graph_client_abstraction.py
- [X] T103 [US6] Implement graph feature caching for performance in olorin-server/app/service/graph/feature_computer.py
- [X] T104 [US6] Create GraphFeatureTool LangChain tool in olorin-server/app/service/agent/tools/graph_feature_tool.py
- [X] T105 [US6] Register GraphFeatureTool in tool registry in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T106 [US6] Update Risk Agent to use graph_feature_tool for cluster risk in olorin-server/app/config/agent_tools_config.py
- [X] T106a [US6] Add graph database configuration UI component for tenant/environment graph DB selection (Neo4j/TigerGraph) in olorin-front/src/components/integrations/GraphDBConfiguration.tsx
- [X] T106b [US6] Implement graph database configuration API endpoint (GET/POST /api/tenants/{tenant_id}/graph-db-config or environment-level config) in olorin-server/app/router/tenant_config_router.py

**Checkpoint**: At this point, User Story 6 should be fully functional - graph features are computed from configured graph database (Neo4j or TigerGraph), exported to Snowflake, and available for Risk Agent aggregation.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T107 [P] Update API documentation with Composio endpoints in olorin-server/docs/api/composio-api.md
- [X] T108 [P] Update API documentation with device signals endpoints in olorin-server/docs/api/device-signals-api.md
- [X] T109 [P] Update API documentation with IP risk endpoints in olorin-server/docs/api/ip-risk-api.md
- [X] T110 [P] Update API documentation with SOAR playbook endpoints in olorin-server/docs/api/soar-playbooks-api.md
- [X] T111 [P] Add integration tests for Composio OAuth flow in tests/integration/test_composio_oauth_flow.py
- [X] T112 [P] Add integration tests for SOAR playbook execution in tests/integration/test_soar_playbook_execution.py
- [X] T113 [P] Add integration tests for device SDK integration in tests/integration/test_device_sdk_integration.py
- [X] T114 [P] Add unit tests for ComposioClient in tests/unit/test_composio_client.py
- [X] T115 [P] Add unit tests for MaxMindClient in tests/unit/test_maxmind_client.py
- [X] T116 [P] Add unit tests for DeviceSignalProcessor in tests/unit/test_device_signal_processor.py
- [X] T117 [P] Add performance monitoring for Composio action execution times in olorin-server/app/service/composio/action_executor.py
- [X] T118 [P] Add performance monitoring for MaxMind API response times in olorin-server/app/service/ip_risk/maxmind_client.py
- [X] T119 [P] Add performance monitoring for device SDK capture rates in olorin-server/app/service/device_fingerprint/signal_processor.py
- [X] T120 [P] Implement comprehensive error logging across all Composio services in olorin-server/app/service/composio/
- [X] T121 [P] Implement comprehensive error logging across all device fingerprint services in olorin-server/app/service/device_fingerprint/
- [X] T122 [P] Implement comprehensive error logging across all IP risk services in olorin-server/app/service/ip_risk/
- [X] T123 [P] Add security audit for tenant data isolation in olorin-server/app/service/composio/action_executor.py
- [X] T124 [P] Add security audit for OAuth token encryption in olorin-server/app/service/composio/encryption.py
- [X] T125 [P] Validate quickstart.md integration steps work end-to-end
- [X] T126 [P] Update README with Composio integration setup instructions in olorin-server/README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start immediately after Foundational - No dependencies
  - User Story 2 (Phase 4): Can start immediately after Foundational - No dependencies (can parallel with US3)
  - User Story 3 (Phase 5): Can start immediately after Foundational - No dependencies (can parallel with US2)
  - User Story 4 (Phase 6): Depends on US1 completion (needs Composio connections)
  - User Story 5 (Phase 7): Can start after Foundational - No dependencies (can parallel with US2/US3)
  - User Story 6 (Phase 8): Can start after Foundational - No dependencies (can parallel with others)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies, can parallel with US3
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies, can parallel with US2
- **User Story 4 (P2)**: Requires US1 completion (needs Composio connections to execute actions)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - No dependencies, benefits from US2/US3 data
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - No dependencies, benefits from US2/US3 data

### Within Each User Story

- Models before services
- Services before endpoints/UI
- Backend before frontend (for US1, US2)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: All tasks marked [P] can run in parallel (T006-T010)
- **Foundational Phase**: All tasks marked [P] can run in parallel (T019-T023)
- **After Foundational**: User Stories 1, 2, 3, 5, 6 can start in parallel (if team capacity allows)
- **User Story 1**: Models (T024), services (T025-T027), endpoints (T028-T032), frontend (T033-T036) can be parallelized by different developers
- **User Story 2**: Models (T041), services (T042-T043), endpoint (T044), frontend (T045-T046) can be parallelized
- **User Story 3**: Models (T053), services (T054-T055), endpoints (T056-T057) can be parallelized
- **User Story 4**: Models (T069-T070), services (T071-T072), endpoints (T073-T075) can be parallelized
- **User Story 5**: All tasks can be parallelized (different components)
- **User Story 6**: All tasks can be parallelized (different graph algorithms)
- **Polish Phase**: All tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Backend developer can work on:
Task T024: Create ComposioConnection model
Task T025: Create ComposioClient wrapper
Task T026: Create OAuthManager service
Task T027: Create ActionExecutor service

# API developer can work on (after models/services):
Task T028: Implement POST /api/composio/connect/{toolkit}
Task T029: Implement GET /api/composio/callback
Task T030: Implement GET /api/composio/connections
Task T031: Implement DELETE /api/composio/connections/{connection_id}
Task T032: Implement POST /api/composio/test-connection/{connection_id}

# Frontend developer can work on (after backend API):
Task T033: Create ComposioService TypeScript client
Task T034: Create ComposioConnectionManager component
Task T035: Create IntegrationCard component
Task T036: Create IntegrationsPage
```

---

## Parallel Example: User Stories 2 and 3

```bash
# Developer A (User Story 2):
Task T041: Create DeviceSignal model
Task T042: Create SDKManager service
Task T043: Create SignalProcessor service
Task T044: Implement POST /api/device-signals endpoint

# Developer B (User Story 3):
Task T053: Create IPRiskScore model
Task T054: Create MaxMindClient service
Task T055: Create ScoreCache service
Task T056: Implement POST /api/ip-risk/score endpoint

# Both can proceed independently after Foundational phase
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Tenant Onboarding with BYOC)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Create tenant, connect Stripe via Composio OAuth
   - Verify connection stored with tenant isolation
   - Execute test action (get account balance)
   - View connections in UI
5. Deploy/demo if ready

**MVP Value**: Enables tenant self-service integration setup, foundation for all automated responses.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Device intelligence)
4. Add User Story 3 → Test independently → Deploy/Demo (IP risk scoring)
5. Add User Story 4 → Test independently → Deploy/Demo (Automated responses - requires US1)
6. Add User Story 5 → Test independently → Deploy/Demo (Real-time features)
7. Add User Story 6 → Test independently → Deploy/Demo (Graph features)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (Phases 1-2)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (Composio OAuth) - MVP
   - Developer B: User Story 2 (Device Fingerprinting) - Can parallel with US3
   - Developer C: User Story 3 (IP Risk Scoring) - Can parallel with US2
3. **After US1 completes**:
   - Developer A: User Story 4 (SOAR + Composio) - Requires US1
   - Developer B: User Story 5 (Snowpipe Streaming) - Can parallel
   - Developer C: User Story 6 (Graph Features) - Can parallel
4. Stories complete and integrate independently

---

## Notes

- **[P] tasks** = different files, no dependencies - can be worked on simultaneously
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- User Story 1 is the MVP - enables all downstream automation
- User Stories 2 and 3 can be parallelized (both P1, no dependencies)
- User Story 4 requires US1 (needs Composio connections)
- User Stories 5 and 6 are independent but benefit from US2/US3 data
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

- **Total Tasks**: 137 (added 3 device feature computation tasks: T052a-T052c, 2 multi-SDK config tasks: T036a-T036b, 2 multi-database graph tasks: T093a-T093b, 1 TigerGraph dependency: T008a, 2 graph DB config tasks: T106a-T106b, updated T095-T102 for abstraction layer)
- **Phase 1 (Setup)**: 11 tasks (added T008a for TigerGraph dependency)
- **Phase 2 (Foundational)**: 13 tasks
- **Phase 3 (US1 - MVP)**: 19 tasks (added T036a-T036b for SDK configuration)
- **Phase 4 (US2)**: 15 tasks (includes T052a-T052c for device feature computation)
- **Phase 5 (US3)**: 16 tasks
- **Phase 6 (US4)**: 15 tasks
- **Phase 7 (US5)**: 9 tasks
- **Phase 8 (US6)**: 19 tasks (added T093a-T093b for multi-database support, T106a-T106b for graph DB configuration, updated T095-T102 for abstraction layer)
- **Phase 9 (Polish)**: 20 tasks

**Parallel Opportunities**: ~60% of tasks can be parallelized (marked with [P])

**MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = 40 tasks

