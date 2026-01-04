# Feature Specification: Fraud Anomaly Detection Service

**Feature Branch**: `001-fraud-anomaly-detection`  
**Created**: 2025-11-09  
**Status**: Draft  
**Input**: User description: "Fraud Anomaly Detection — Full Design & Implementation Notes"

## Clarifications

### Session 2025-11-09

- Q: How should anomaly cohort (merchant_id, channel, geo) map to investigation entity_type/entity_id? → A: Create investigation with merchant_id as primary entity, include channel/geo in metadata
- Q: What are the exact severity thresholds (score ranges for info/warn/critical)? → A: Configurable per detector with global defaults (info: 2.0-3.0, warn: 3.0-4.5, critical: >4.5)
- Q: What is the schedule for automatic detection runs? → A: Scheduled runs (configurable interval, default 15 minutes) plus manual trigger
- Q: Should anomaly evidence be passed as investigation metadata or attached as evidence items? → A: Investigation metadata (JSONB) plus attach key charts/visualizations as evidence items
- Q: What is the exact RAG context retrieval implementation? → A: Use existing RAG service (reuse existing retrieval chain)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detect Transaction Anomalies in Real-Time (Priority: P1)

A fraud analyst needs to detect time-based anomalies in transaction metrics (spikes, drops, regime shifts) across merchant cohorts without requiring supervised models. The system automatically runs detection jobs on 15-minute windows, identifies anomalies using STL+MAD and CUSUM algorithms, and surfaces critical anomalies that persist for 2+ windows.

**Why this priority**: Core functionality - enables proactive fraud detection by identifying unusual patterns before they escalate. Critical for preventing fraud losses.

**Independent Test**: Can be fully tested by running a detection job on historical data via `/v1/analytics/anomalies/detect` endpoint and verifying anomalies are detected, scored, and persisted to PostgreSQL. Delivers immediate value by identifying suspicious patterns.

**Acceptance Scenarios**:

1. **Given** a configured detector with STL+MAD algorithm, **When** a detection run is executed on a time window with a spike in decline_rate, **Then** an anomaly event is created with severity='critical', score > 3.5, and persisted_n >= 2
2. **Given** a cohort with normal transaction patterns, **When** a detection run executes, **Then** no anomalies are created (score < threshold)
3. **Given** an anomaly with severity='critical' and persisted_n=2, **When** the LangGraph policy evaluates it, **Then** a new investigation is automatically created via `open_investigation` tool

---

### User Story 2 - View and Filter Anomalies in Anomaly Hub (Priority: P1)

A fraud analyst navigates to the Anomaly Hub page to view detected anomalies, filter by severity/metric/cohort, see real-time updates via WebSocket, and drill down into anomaly details including evidence and time series charts.

**Why this priority**: Essential for analysts to triage and investigate anomalies. Without this UI, detected anomalies cannot be effectively utilized.

**Independent Test**: Can be fully tested by accessing `/analytics/anomalies` page, viewing anomaly list, applying filters, and verifying WebSocket updates appear in real-time. Delivers value by providing actionable anomaly visibility.

**Acceptance Scenarios**:

1. **Given** anomalies exist in the database, **When** a user navigates to `/analytics/anomalies`, **Then** anomalies are displayed in a table with sortable columns (severity, score, time, cohort)
2. **Given** a WebSocket connection to `/v1/stream/anomalies`, **When** a new anomaly is detected, **Then** the anomaly appears in the UI without page refresh
3. **Given** an anomaly is selected, **When** user clicks "View Details", **Then** a detail panel shows evidence (residuals, changepoints), time series chart, and investigation link

---

### User Story 3 - Configure and Tune Detectors (Priority: P2)

A data scientist needs to create, configure, and tune detector parameters (k threshold, persistence, min_support) via the Detector Studio UI, preview scores on historical data, and save detector configurations for production use.

**Why this priority**: Enables customization and optimization of detection algorithms for different merchant cohorts and use cases. Critical for maintaining detection quality.

**Independent Test**: Can be fully tested by creating a detector via `/analytics/detectors` page, adjusting parameters, running a preview, and verifying the detector saves and executes correctly. Delivers value by enabling domain-specific tuning.

**Acceptance Scenarios**:

1. **Given** a user in Detector Studio, **When** they create a new STL+MAD detector with custom k=4.0 and persistence=3, **Then** the detector is saved to PostgreSQL and appears in the detector list
2. **Given** a detector configuration, **When** user clicks "Preview Scores" on a historical window, **Then** scores are calculated and displayed in a chart without creating anomaly events
3. **Given** a detector is enabled, **When** scheduled detection runs execute, **Then** the detector uses the saved configuration parameters

---

### User Story 4 - Replay Detection on Historical Windows (Priority: P2)

A data scientist needs to backtest detector configurations on historical time windows, compare results against production detectors, and analyze differences to optimize detection parameters.

**Why this priority**: Enables validation and optimization of detector configurations before deploying to production. Reduces false positives and improves detection accuracy.

**Independent Test**: Can be fully tested by accessing `/analytics/replay`, selecting a historical window and detector config, running replay, and comparing results against production anomalies. Delivers value by enabling data-driven detector optimization.

**Acceptance Scenarios**:

1. **Given** a user in Replay Studio, **When** they select a historical window (e.g., last 7 days) and a detector config, **Then** a replay run executes and returns anomalies with diff vs production
2. **Given** a replay run completes, **When** user views the comparison, **Then** differences are highlighted (new anomalies, missed anomalies, score differences)
3. **Given** a replay shows improved precision, **When** user promotes the config to production, **Then** the detector configuration is updated

---

### User Story 5 - Automatic Investigation Creation for Critical Anomalies (Priority: P2)

When a critical anomaly persists for 2+ windows with high score, the LangGraph orchestrator automatically creates an investigation, retrieves RAG context, generates an incident summary, and attaches evidence to the investigation case.

**Why this priority**: Automates the investigation workflow, reducing time-to-investigation and ensuring critical anomalies are not missed. Integrates anomaly detection with existing investigation system.

**Independent Test**: Can be fully tested by triggering a critical anomaly (severity='critical', persisted_n=2, score > 4.5), verifying LangGraph policy routes to 'open' action, and confirming investigation is created with summary attached. Delivers value by automating incident response.

**Acceptance Scenarios**:

1. **Given** a critical anomaly event streams to LangGraph, **When** policy evaluates it (severity='critical', persisted_n=2, score=5.1), **Then** `open_investigation` tool is called and investigation is created
2. **Given** an investigation is created for an anomaly, **When** summarize_node executes, **Then** RAG context is retrieved, LLM generates markdown summary, and summary is attached via `attach_evidence` tool
3. **Given** an anomaly is annotated (not opened), **When** summarize_node executes, **Then** summary is attached to existing investigation if one exists

---

### User Story 6 - Launch Investigation from Anomaly (Priority: P2)

A fraud analyst views an anomaly in the Anomaly Hub and wants to launch a full investigation with the anomaly context. The system creates an investigation using the investigations-management microservice with anomaly parameters (cohort, metric, time window, evidence) pre-populated.

**Why this priority**: Enables manual investigation creation from anomalies, giving analysts control over which anomalies to investigate while preserving anomaly context. Critical for integrating anomaly detection with investigation workflows.

**Independent Test**: Can be fully tested by clicking "Investigate" button on an anomaly in Anomaly Hub, verifying investigation is created via `/api/v1/investigation-state/` with anomaly context, and confirming investigation appears in investigations-management microservice. Delivers value by streamlining investigation workflow.

**Acceptance Scenarios**:

1. **Given** an anomaly is displayed in Anomaly Hub, **When** user clicks "Investigate" button, **Then** investigation creation modal opens with anomaly context pre-filled (cohort, metric, window, evidence)
2. **Given** user confirms investigation creation, **When** API call is made to `/v1/analytics/anomalies/{id}/investigate`, **Then** investigation is created via `/api/v1/investigation-state/` with entity_type='merchant_id', entity_id=<merchant_id from cohort>, time_range from window_start/window_end, and metadata containing channel, geo, metric, evidence, scores
3. **Given** investigation is created from anomaly, **When** user navigates to investigations-management page, **Then** investigation appears in list with title referencing anomaly metric and cohort
4. **Given** anomaly detection tools are registered in LangGraph tools registry, **When** agent executes investigation, **Then** agent can call `fetch_series`, `detect_anomalies`, `list_anomalies` tools during investigation

---

### Edge Cases

- What happens when Snowflake connection fails during detection run? System MUST log error, mark run as 'failed', and return error response. No partial anomalies created.
- How does system handle missing historical data (gaps in time series)? Detector MUST skip windows with insufficient data (min_support not met) and log warnings.
- What happens when detector parameters are invalid (k < 0, persistence < 1)? API MUST return 400 validation error before creating detector.
- How does system handle concurrent detection runs on same window? System MUST allow concurrent runs but track them separately in detection_runs table.
- What happens when WebSocket connection drops during anomaly streaming? Client MUST automatically reconnect and resume streaming from last received timestamp.
- How does system handle anomalies for cohorts with very low transaction volume (< min_support)? Detector MUST skip these cohorts and log info message.
- What happens when LangGraph investigation creation fails? System MUST log error, mark anomaly status='new', and allow manual investigation creation later.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect time-based anomalies in transaction metrics using univariate algorithms (STL+MAD, CUSUM) per metric and cohort
- **FR-002**: System MUST detect multivariate anomalies using Isolation Forest on window feature vectors
- **FR-003**: System MUST persist detector configurations to PostgreSQL `detectors` table with JSONB params
- **FR-004**: System MUST track detection runs in PostgreSQL `detection_runs` table with status, timing, and metadata
- **FR-005**: System MUST persist anomaly events to PostgreSQL `anomaly_events` table with cohort, metric, scores, evidence, and status
- **FR-006**: System MUST apply guardrails: persistence >= 2 windows, hysteresis (raise k=3.5, clear k<=2.5), min_support >= 50 transactions, cooldowns 60-120m
- **FR-007**: System MUST fetch transaction window data from Snowflake `marts_txn_window` table using existing database provider abstraction
- **FR-008**: System MUST expose REST API endpoints: `/v1/analytics/anomalies/detect`, `/v1/analytics/anomalies`, `/v1/analytics/anomalies/{id}`, `/v1/analytics/series`, `/v1/analytics/detectors`, `/v1/analytics/detectors/{id}`, `/v1/analytics/replay`
- **FR-009**: System MUST expose WebSocket endpoint `/v1/stream/anomalies` for real-time anomaly streaming
- **FR-010**: System MUST provide React frontend pages: Anomaly Hub (`/analytics/anomalies`), Detector Studio (`/analytics/detectors/:id`), Replay Studio (`/analytics/replay`)
- **FR-011**: System MUST integrate with LangGraph via tools: `fetch_series`, `detect_anomalies`, `list_anomalies`, `open_investigation`, `attach_evidence`
- **FR-012**: System MUST register anomaly detection tools in LangGraph tools registry (`tool_registry.py`) under category 'olorin' so agents can use them
- **FR-013**: System MUST implement LangGraph policy that auto-creates investigations for severity='critical' and persistence >= 2
- **FR-014**: System MUST implement summarize_node that retrieves RAG context using existing RAG service (reuse existing retrieval chain), generates LLM summary, and attaches to investigation
- **FR-015**: System MUST integrate with investigations-management microservice to allow creating investigations with anomaly as parameter
- **FR-016**: System MUST expose API endpoint `/v1/analytics/anomalies/{id}/investigate` that creates investigation from anomaly event
- **FR-017**: System MUST support investigation creation with anomaly context (cohort, metric, window, evidence) passed to investigation service. When creating investigation from anomaly, merchant_id is used as primary entity (entity_type='merchant_id', entity_id=<merchant_id>), and channel/geo are included in investigation metadata. Anomaly evidence (residuals, changepoints, feature vectors, scores) MUST be passed as investigation metadata (JSONB), and key visualizations (time series charts) MUST be attached as evidence items.
- **FR-018**: Frontend MUST provide "Investigate" button in Anomaly Hub that launches investigation with anomaly parameters
- **FR-019**: System MUST use environment-driven configuration (no hardcoded values) via existing config loader pattern
- **FR-020**: System MUST support both Snowflake and PostgreSQL via existing database provider abstraction (`get_database_provider`)
- **FR-021**: System MUST calculate anomaly scores using STL decomposition with MAD residuals (robust=True, period=7d at 15m granularity)
- **FR-022**: System MUST calculate CUSUM scores for level/variance shifts with configurable delta and threshold
- **FR-023**: System MUST calculate Isolation Forest scores for multivariate anomalies with contamination ~0.5%
- **FR-024**: System MUST determine severity (info/warn/critical) based on score thresholds and persistence. Severity thresholds are configurable per detector with global defaults: info (2.0-3.0), warn (3.0-4.5), critical (>4.5). If detector params do not specify thresholds, use global defaults.
- **FR-025**: System MUST store evidence JSONB in anomaly_events including residuals, changepoints, feature vectors, neighbors
- **FR-026**: System MUST support scheduled detection runs with configurable interval (default: 15 minutes) via APScheduler (Python scheduler library), plus manual trigger via API endpoint. Scheduler runs as background task in FastAPI application lifecycle.

### Key Entities *(include if feature involves data)*

- **Detector**: Represents a detection algorithm configuration. Attributes: id (UUID), name, type (stl_mad/cusum/isoforest/rcf/matrix_profile), cohort_by (JSONB array), metrics (JSONB array), params (JSONB including optional severity_thresholds: {info_max, warn_max, critical_min}), enabled (boolean), timestamps. Stored in PostgreSQL `detectors` table. If severity_thresholds not specified in params, use global defaults.

- **DetectionRun**: Represents a single execution of a detector on a time window. Attributes: id (UUID), detector_id (FK), status (queued/running/success/failed), started_at, finished_at, window_from, window_to, info (JSONB). Stored in PostgreSQL `detection_runs` table.

- **AnomalyEvent**: Represents a detected anomaly for a specific metric/cohort/window. Attributes: id (UUID), run_id (FK), detector_id (FK), cohort (JSONB), window_start, window_end, metric, observed, expected, score, severity (info/warn/critical), persisted_n, evidence (JSONB), status (new/triaged/closed), created_at. Stored in PostgreSQL `anomaly_events` table.

- **TransactionWindow**: Represents aggregated transaction metrics for a 15-minute window per cohort. Attributes: window_start, window_end, merchant_id, channel, geo, tx_count, unique_users, unique_cards, unique_devices, amount_mean, amount_p90, amount_std, decline_rate, refund_rate, cnp_share, tx_per_user, new_user_share, method_share_*. Stored in Snowflake `marts_txn_window` table.

- **Investigation**: Links anomaly events to LangGraph investigations. Created via `open_investigation` tool, includes investigation_id reference in anomaly_events. Uses existing investigation models and persistence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Detection runs complete within 30 seconds for a 7-day window with 100 cohorts (p95 latency)
- **SC-002**: Anomaly detection API endpoints respond within 200ms (p95) for list queries with filters
- **SC-003**: WebSocket anomaly streaming delivers events within 1 second of detection (p95 latency)
- **SC-004**: Anomaly Hub page loads and displays 1000 anomalies within 2 seconds (p95 page load time)
- **SC-005**: Detector Studio allows users to create and configure detectors with parameter validation in under 30 seconds
- **SC-006**: Replay Studio completes backtest runs on 7-day windows within 60 seconds (p95)
- **SC-007**: LangGraph investigation auto-creation triggers within 5 seconds of critical anomaly detection (p95)
- **SC-008**: System detects anomalies with >= 85% precision (true positives / (true positives + false positives)) on labeled test data. Test data source: historical anomaly labels from fraud investigation outcomes or manually labeled transaction windows.
- **SC-009**: System maintains >= 99% data completeness (no missing windows) for cohorts with sufficient transaction volume
- **SC-010**: System processes >= 10,000 cohorts per hour in detection runs (throughput)

## Technical Architecture

### Backend Integration Points

- **FastAPI Router**: Extend existing `/v1/analytics` router in `olorin-server/app/api/routes/analytics.py` with anomaly detection endpoints
- **Investigation Router**: Add endpoint `/v1/analytics/anomalies/{id}/investigate` that creates investigation via existing `/api/v1/investigation-state/` endpoint
- **Database Provider**: Use existing `get_database_provider()` from `app/service/agent/tools/database_tool` for Snowflake/PostgreSQL abstraction
- **PostgreSQL Models**: Create SQLAlchemy models in `olorin-server/app/models/anomaly.py` for detectors, detection_runs, anomaly_events
- **Service Layer**: Create `olorin-server/app/service/anomaly/` with detector implementations, detection job orchestrator, and scoring logic
- **Scheduler**: Implement scheduled detection runs with configurable interval (default: 15 minutes) using existing cron/scheduler infrastructure, plus manual trigger support
- **LangGraph Tools**: Add tools to `olorin-server/app/service/agent/tools/anomaly_tools/` for LangGraph integration
- **Tools Registry**: Register anomaly tools in `app/service/agent/tools/tool_registry.py` under 'olorin' category so agents can discover and use them
- **Config**: Use existing `ConfigLoader` pattern for environment-driven configuration

### Frontend Integration Points

- **Analytics Microservice**: Extend existing `olorin-front/src/microservices/analytics/` with anomaly detection pages
- **Routing**: Add routes to existing analytics router: `/analytics/anomalies`, `/analytics/detectors/:id`, `/analytics/replay`
- **API Client**: Extend existing analytics API client in `olorin-front/src/api/analytics.ts` with anomaly endpoints
- **Investigation Service**: Integrate with existing `InvestigationService` from `olorin-front/src/microservices/investigation/services/investigationService.ts` to create investigations from anomalies
- **Investigation Modal**: Add "Investigate" action button in Anomaly Hub that opens investigation creation modal with anomaly context
- **WebSocket**: Use existing WebSocket infrastructure for real-time anomaly streaming
- **Components**: Create reusable components following existing analytics component patterns (KPITiles, TrendGraphs, Filters)

### Data Layer

- **Snowflake**: Query `marts_txn_window` table using existing `RealSnowflakeClient` or `SnowflakeProvider`
- **PostgreSQL**: Create tables `detectors`, `detection_runs`, `anomaly_events` using Alembic migrations
- **Schema**: Follow existing database schema patterns (UUID primary keys, JSONB for flexible data, timestamps)

### Detection Algorithms

- **STL+MAD Detector**: Implement in `app/service/anomaly/detectors/stl_mad.py` using `statsmodels.tsa.seasonal.STL`
- **CUSUM Detector**: Implement in `app/service/anomaly/detectors/cusum.py` with configurable delta/threshold
- **Isolation Forest Detector**: Implement in `app/service/anomaly/detectors/isoforest.py` using `sklearn.ensemble.IsolationForest`
- **Base Detector**: Abstract base class in `app/service/anomaly/detectors/base.py` following existing service patterns

### LangGraph Integration

- **Tools**: Implement `fetch_series`, `detect_anomalies`, `list_anomalies`, `open_investigation`, `attach_evidence` tools in `app/service/agent/tools/anomaly_tools/`
- **Tools Registry**: Register anomaly tools in `app/service/agent/tools/tool_registry.py` under category 'olorin' using `_register_tool()` method
- **Tool Initialization**: Add anomaly tools to tool registry initialization in `_initialize_core_tools()` or create `_initialize_anomaly_tools()` method
- **Policy Node**: Implement policy decision logic in `app/service/agent/orchestration/nodes/anomaly_policy.py`
- **Summarize Node**: Implement RAG retrieval using existing RAG service and LLM summary generation in `app/service/agent/orchestration/nodes/summarize_node.py`
- **Graph Integration**: Wire nodes into existing LangGraph orchestrator in `app/service/agent/orchestration/graph_builder.py`

### Investigation Integration

- **Investigation Service**: Integrate with existing `InvestigationService` in `olorin-front/src/microservices/investigation/services/investigationService.ts`
- **Investigation API**: Extend `/api/v1/investigation-state/` endpoint to accept anomaly context in investigation creation
- **Anomaly-to-Investigation Mapping**: Map anomaly fields to investigation parameters: entity_type='merchant_id', entity_id=<merchant_id from cohort>, time_range from window_start/window_end, metadata includes channel, geo, metric, evidence, scores
- **Frontend Integration**: Add "Investigate" button in Anomaly Hub that calls `/v1/analytics/anomalies/{id}/investigate` endpoint
- **Investigation Context**: Pass anomaly evidence (residuals, changepoints, feature vectors), scores, and cohort information as investigation metadata (JSONB) for agent context. Additionally, attach key visualizations (time series charts, score distributions) as evidence items via `attach_evidence` tool for human review.

## Implementation Constraints

- **NO MOCKS/STUBS/TODOs**: All code must be production-ready. Use existing infrastructure, not fallback values.
- **NO HARDCODED VALUES**: All configuration from environment variables via existing `ConfigLoader`
- **FILE SIZE LIMIT**: All files must be < 200 lines. Split into smaller modules if needed.
- **NO DUPLICATION**: Reuse existing database providers, config loaders, API patterns, frontend components
- **TEST COVERAGE**: Minimum 87% test coverage for all new code
- **INTEGRATION**: Must integrate with existing analytics microservice, not create parallel implementation
- **LANGGRAPH**: Must integrate with existing LangGraph orchestrator, not create separate graph

## Dependencies

- **Backend**: statsmodels, scikit-learn, pandas, numpy (add to `pyproject.toml`)
- **Frontend**: No new dependencies (use existing React, TypeScript, Tailwind)
- **Database**: Existing PostgreSQL and Snowflake connections
- **LangGraph**: Existing LangGraph infrastructure and tools

## Implementation Decisions

- **LLM Configuration**: summarize_node uses existing LLM configuration from the project's standard LLM service setup. No new LLM provider/model configuration required.
- **Sumo Logic Integration**: Sumo Logic enrichment is an optional future enhancement. Current implementation focuses on core anomaly detection without Sumo Logic dependency.
