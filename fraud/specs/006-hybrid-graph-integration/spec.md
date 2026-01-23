# Feature Specification: Hybrid Graph Integration

**Feature Branch**: `006-hybrid-graph-integration`
**Created**: 2025-01-21
**Status**: Draft
**Author**: Gil Klainert
**Input**: User description: "Hybrid Graph Integration: create a full and complete integration of the server Hybrid Graph investigation with the frontend. emphasis integration with wizard pages using polling mechanism. expected results if frontend wizard ages willbe able to configure and trigger an investigation from the wizard settings page, track its progress from all the compoenents in wizard progress page, and view its results in wizard results page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and Launch Hybrid Graph Investigation (Priority: P1)

An fraud analyst needs to configure and launch a comprehensive hybrid graph investigation from the Settings Page wizard, selecting entity types, time ranges, and enabling specific investigation tools to detect fraud patterns.

**Why this priority**: This is the entry point for all hybrid graph investigations and must work perfectly to enable any subsequent investigation workflows.

**Independent Test**: Can be fully tested by configuring investigation settings (entity type, entity ID, time range, tools) and successfully launching an investigation that creates a database record and triggers backend graph execution. Delivers value by enabling investigators to start investigations without technical knowledge.

**Acceptance Scenarios**:

1. **Given** an investigator opens the Settings Page, **When** they select entity type "user", enter entity ID "user123", set time range to "Last 7 days", and click "Start Investigation", **Then** the system creates an investigation record, returns an investigation ID, and navigates to Progress Page
2. **Given** investigation settings are incomplete (missing entity ID), **When** investigator clicks "Start Investigation", **Then** the system displays validation errors and prevents investigation start
3. **Given** investigator enables hybrid graph tools (Device Analysis, Network Analysis, Location Analysis), **When** investigation starts, **Then** the backend receives tool configuration and includes selected tools in graph execution

---

### User Story 2 - Monitor Real-Time Investigation Progress (Priority: P1)

An investigator needs to monitor hybrid graph investigation progress in real-time using polling mechanism, viewing current phase, agent execution status, tool calls, and risk score updates without page refresh.

**Why this priority**: Real-time progress visibility is critical for investigators to understand investigation status and estimated completion time.

**Independent Test**: Can be fully tested by starting an investigation and verifying Progress Page polls backend API every 2 seconds, updates UI with latest phase information, displays tool execution logs, and shows risk score progression. Delivers value by providing live investigation visibility.

**Acceptance Scenarios**:

1. **Given** an investigation is running, **When** Progress Page loads, **Then** polling starts immediately and fetches investigation status every 2 seconds from `/api/investigations/{id}/status`
2. **Given** hybrid graph moves to "Domain Analysis" phase, **When** polling receives phase update, **Then** Progress Page highlights "Domain Analysis" phase indicator and updates progress percentage
3. **Given** hybrid graph executes "Check Device Fingerprint" tool, **When** polling receives tool execution event, **Then** Progress Page adds tool execution to timeline with status "running" and updates when complete
4. **Given** investigation completes successfully, **When** polling receives "completed" status, **Then** Progress Page stops polling, shows completion notification, and enables "View Results" button

---

### User Story 3 - View Comprehensive Investigation Results (Priority: P1)

An investigator needs to view comprehensive hybrid graph investigation results including final risk score, domain-specific findings, evidence summary, tool execution details, and agent decisions with ability to export results.

**Why this priority**: Results visualization is the ultimate value delivery - investigators need to see fraud detection outcomes and make decisions based on evidence.

**Independent Test**: Can be fully tested by completing an investigation and verifying Results Page displays final risk score, lists findings by domain (Device, Location, Network, Logs), shows evidence details, and provides export functionality (PDF, JSON). Delivers value by presenting actionable fraud intelligence.

**Acceptance Scenarios**:

1. **Given** investigation completes successfully, **When** Results Page loads, **Then** the system fetches final results from `/api/investigations/{id}/results` and displays overall risk score with color coding (critical: red, high: amber, medium: cyan, low: gray)
2. **Given** hybrid graph detected 3 critical findings and 5 high findings, **When** Results Page displays findings section, **Then** the system groups findings by severity and domain (Device Agent: 2 critical, Network Agent: 1 critical, 5 high)
3. **Given** investigator wants to review evidence for "Suspicious login from unusual location" finding, **When** they click finding card, **Then** the system expands finding details showing evidence sources, timestamps, and related entities
4. **Given** investigator needs to export results for reporting, **When** they click "Export" and select "PDF", **Then** the system generates comprehensive PDF report with all findings, evidence, and recommendations within 10 seconds

---

### User Story 4 - Handle Investigation Failures Gracefully (Priority: P2)

An investigator needs clear error messages and recovery options when hybrid graph investigation fails due to backend errors, timeout, or data unavailability.

**Why this priority**: Production systems encounter errors - graceful failure handling prevents user frustration and enables retry workflows.

**Independent Test**: Can be fully tested by simulating investigation failures (backend timeout, invalid entity, missing data) and verifying UI displays specific error messages, provides retry options, and maintains investigation history. Delivers value by enabling error recovery without data loss.

**Acceptance Scenarios**:

1. **Given** backend investigation execution fails with error "Entity not found in database", **When** polling detects failed status, **Then** Progress Page displays error notification with message and "Retry" button
2. **Given** investigation timeout after 10 minutes, **When** polling receives timeout status, **Then** Progress Page stops polling, displays timeout message, and offers "Retry with extended timeout" option
3. **Given** WebSocket connection lost during investigation, **When** polling fallback activates, **Then** Progress Page continues showing updates via polling without data loss

---

### User Story 5 - Multi-Entity Investigation Support (Priority: P3)

An investigator needs to configure and run investigations for multiple related entities simultaneously (e.g., user + device + IP address) with correlation analysis.

**Why this priority**: Complex fraud cases often involve multiple entities - multi-entity support enables comprehensive investigations.

**Independent Test**: Can be fully tested by adding 3 entities (user, device, IP) in Settings Page, launching investigation, and verifying backend executes hybrid graph for each entity with correlation analysis. Delivers value by detecting cross-entity fraud patterns.

**Acceptance Scenarios**:

1. **Given** investigator adds 3 entities (user:123, device:ABC, ip:1.2.3.4), **When** investigation starts, **Then** backend creates 3 entity-specific investigations with shared investigation group ID
2. **Given** multi-entity investigation is running, **When** Progress Page displays progress, **Then** the system shows separate progress indicators for each entity and overall correlation progress
3. **Given** correlation analysis detects linkage between user and device, **When** Results Page displays findings, **Then** the system highlights correlation findings with visual graph showing entity relationships

---

### Edge Cases

- **What happens when investigation takes longer than expected timeout (>15 minutes)?**
  System extends timeout automatically if hybrid graph shows active execution, displays "Investigation taking longer than usual" warning, and updates estimated completion time

- **How does system handle polling failures (network errors, backend unavailable)?**
  Progress Page implements exponential backoff retry (2s → 4s → 8s → 16s max), displays "Connection lost - retrying..." notification, and switches to manual refresh button after 5 failed attempts

- **What happens when user navigates away from Progress Page during active investigation?**
  Investigation continues executing on backend, progress state is persisted in browser localStorage, and user can return to Progress Page to resume monitoring

- **How does system handle concurrent investigations from same user?**
  Frontend allows maximum 3 concurrent investigations per user, displays all active investigations in navigation dropdown, and shows warning when limit reached

- **What happens when hybrid graph detects critical security risk during investigation?**
  Backend sends high-priority notification via polling response, Progress Page displays alert banner with risk summary, and enables "View Preliminary Results" to see critical findings immediately

## Requirements *(mandatory)*

### Functional Requirements

#### Investigation Configuration & Launch (Settings Page)
- **FR-001**: System MUST provide Settings Page form with entity type selector (user, device, IP, transaction), entity ID input, time range picker, and tool matrix
- **FR-002**: System MUST validate entity ID format based on entity type (email for user, UUID for device, IP format for IP address)
- **FR-003**: System MUST display tool matrix with 6 categories (Device Analysis, Location Analysis, Network Analysis, Logs Analysis, Behavior Analysis, Risk Assessment) showing available tools per category
- **FR-004**: Settings Page MUST prevent investigation start until minimum requirements met (entity ID, time range, at least 1 tool enabled)
- **FR-005**: System MUST call `POST /api/investigations` endpoint with configuration payload when "Start Investigation" clicked
- **FR-006**: System MUST receive investigation ID response and navigate to Progress Page with investigation ID in URL (`/investigation/progress/{id}`)

#### Real-Time Progress Monitoring (Progress Page)
- **FR-007**: Progress Page MUST implement polling service that calls `GET /api/investigations/{id}/status` every 2 seconds when investigation status is "running"
- **FR-008**: System MUST display investigation phases (Initialization, Domain Analysis, Risk Assessment, Evidence Gathering, Summary) with current phase highlighted
- **FR-009**: Progress Page MUST show overall progress percentage (0-100%) based on completed phases and estimated remaining time
- **FR-010**: System MUST display real-time log stream with color-coded severity (info: cyan, warning: amber, error: red) and timestamps
- **FR-011**: Progress Page MUST show tool execution timeline listing each tool call with status (pending, running, completed, failed), duration, and output summary
- **FR-012**: System MUST display agent execution status for each domain agent (Device, Location, Network, Logs, Risk) with visual gauge showing progress
- **FR-013**: Progress Page MUST show risk score progression chart plotting risk score updates over investigation timeline
- **FR-014**: System MUST stop polling when investigation status changes to "completed", "failed", or "timeout"
- **FR-015**: Progress Page MUST provide manual "Pause Investigation" and "Stop Investigation" buttons that call backend control endpoints

#### Investigation Results Display (Results Page)
- **FR-016**: Results Page MUST fetch comprehensive results via `GET /api/investigations/{id}/results` when investigation completes
- **FR-017**: System MUST display overall risk score (0-100) with color-coded gauge (0-39: gray/low, 40-59: cyan/medium, 60-79: amber/high, 80-100: red/critical)
- **FR-018**: Results Page MUST group findings by domain (Device Agent, Location Agent, Network Agent, Logs Agent, Risk Agent) with finding count per domain
- **FR-019**: System MUST display finding cards with severity badge, title, description, affected entities, timestamp, and expandable evidence details
- **FR-020**: Results Page MUST show evidence summary with source attribution, confidence score, and cross-references to related findings
- **FR-021**: System MUST provide timeline view showing chronological sequence of investigation events, tool executions, and decision points
- **FR-022**: Results Page MUST display agent decisions with rationale, confidence score, and supporting evidence
- **FR-023**: System MUST provide export functionality with formats (PDF report, JSON data, CSV findings) via `POST /api/investigations/{id}/export` endpoint
- **FR-024**: Results Page MUST show investigation metadata (start time, end time, duration, entity details, tool configuration)

#### Polling Service Integration
- **FR-025**: Polling service MUST use exponential backoff on failure (2s → 4s → 8s → 16s max) to handle network issues
- **FR-026**: System MUST implement request cancellation when component unmounts to prevent memory leaks
- **FR-027**: Polling service MUST include investigation ID in URL path and JWT token in authorization header
- **FR-028**: System MUST handle HTTP status codes appropriately (200: success, 404: investigation not found, 401: unauthorized, 500: backend error)
- **FR-029**: Polling service MUST cache last successful response to display stale data during temporary connection loss

#### Error Handling & Recovery
- **FR-030**: System MUST display user-friendly error messages mapped from backend error codes (entity_not_found, timeout, insufficient_data, agent_failure)
- **FR-031**: Progress Page MUST provide "Retry" button when investigation fails with ability to restart investigation with same configuration
- **FR-032**: System MUST preserve investigation history in browser localStorage to enable recovery from page refresh
- **FR-033**: Error notifications MUST include recommended actions (check entity ID format, verify data availability, contact support)
- **FR-034**: System MUST log frontend errors to browser console with investigation ID context for debugging

### Key Entities *(include if feature involves data)*

```typescript
/**
 * Investigation Configuration (Settings Page → Backend)
 */
interface InvestigationConfig {
  entity_type: "user" | "device" | "ip" | "transaction";
  entity_id: string;                  // Format validated by entity_type
  time_range: {
    start: string;                    // ISO 8601 timestamp
    end: string;                      // ISO 8601 timestamp
  };
  tools: ToolConfig[];                // Selected tools with parameters
  correlation_mode: "OR" | "AND";     // Multi-entity correlation
  execution_mode: "parallel" | "sequential";
  risk_threshold: number;             // 0-100, findings above threshold flagged
}

interface ToolConfig {
  tool_id: string;                    // e.g., "check_device_fingerprint"
  enabled: boolean;
  parameters: Record<string, any>;    // Tool-specific configuration
}

/**
 * Investigation Status (Polling Response)
 */
interface InvestigationStatus {
  investigation_id: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  current_phase: string;              // e.g., "Domain Analysis"
  progress_percentage: number;        // 0-100
  estimated_completion_time: string | null; // ISO 8601 timestamp
  risk_score: number | null;          // Current risk score (0-100)
  agent_status: Record<string, AgentStatus>;
  tool_executions: ToolExecution[];
  logs: LogEntry[];
  error: ErrorDetail | null;
}

interface AgentStatus {
  agent_name: string;                 // e.g., "Device Agent"
  status: "pending" | "running" | "completed" | "failed";
  progress_percentage: number;
  tools_used: number;
  findings_count: number;
  execution_time_ms: number | null;
}

interface ToolExecution {
  tool_id: string;
  tool_name: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;                 // ISO 8601 timestamp
  completed_at: string | null;
  duration_ms: number | null;
  output_summary: string;
  error_message: string | null;
}

interface LogEntry {
  timestamp: string;                  // ISO 8601 timestamp
  severity: "info" | "warning" | "error";
  source: string;                     // e.g., "Device Agent", "Hybrid Graph Orchestrator"
  message: string;
  metadata: Record<string, any>;
}

/**
 * Investigation Results (Results Page)
 */
interface InvestigationResults {
  investigation_id: string;
  overall_risk_score: number;         // 0-100, final risk assessment
  status: "completed" | "failed";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  findings: Finding[];
  evidence: Evidence[];
  agent_decisions: AgentDecision[];
  summary: string;                    // Human-readable investigation summary
  metadata: InvestigationMetadata;
}

interface Finding {
  finding_id: string;
  severity: "critical" | "high" | "medium" | "low";
  domain: "device" | "location" | "network" | "logs" | "risk";
  title: string;
  description: string;
  affected_entities: string[];
  evidence_ids: string[];             // References to Evidence entries
  confidence_score: number;           // 0-1, agent confidence
  timestamp: string;
  metadata: Record<string, any>;
}

interface Evidence {
  evidence_id: string;
  source: string;                     // Data source (Snowflake table, API)
  evidence_type: string;              // e.g., "device_fingerprint", "geo_location"
  data: Record<string, any>;          // Actual evidence data
  timestamp: string;
  confidence_score: number;
  related_findings: string[];
}

interface AgentDecision {
  agent_name: string;
  decision: string;                   // Human-readable decision
  rationale: string;                  // Why this decision was made
  confidence_score: number;
  supporting_evidence: string[];      // Evidence IDs
  alternative_hypotheses: string[];   // Other possibilities considered
  timestamp: string;
}

interface InvestigationMetadata {
  entity_type: string;
  entity_id: string;
  time_range: { start: string; end: string };
  tools_used: string[];
  execution_mode: string;
  correlation_mode: string;
}
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Investigators can configure and launch hybrid graph investigation from Settings Page in under 90 seconds with validation feedback
- **SC-002**: Progress Page displays real-time updates with maximum 2-second latency from backend event to UI update
- **SC-003**: Results Page loads complete investigation results (including 50+ findings and evidence) within 3 seconds of investigation completion
- **SC-004**: System maintains 99.5% polling reliability during investigations with automatic recovery from transient network failures
- **SC-005**: Investigation workflow (Settings → Progress → Results) completes without errors for 95% of investigations
- **SC-006**: Export functionality generates PDF reports with all findings and evidence within 10 seconds
- **SC-007**: Frontend handles backend timeout scenarios gracefully with user-friendly error messages and retry options
- **SC-008**: Multi-entity investigations (up to 5 entities) display coordinated progress tracking with cross-entity correlation

## Dependencies & Constraints *(mandatory)*

### System Dependencies
- **Backend API**: FastAPI server at `{REACT_APP_API_BASE_URL}/api` with investigation endpoints
- **Hybrid Graph System**: Backend hybrid intelligence graph at `/olorin-server/app/service/agent/orchestration/hybrid/`
- **Database**: Investigation state persistence with status tracking
- **Frontend Framework**: React 18 with TypeScript, Tailwind CSS, Zustand store
- **Polling Service**: Existing polling infrastructure at `/olorin-front/src/shared/services/pollingService.ts`

### API Endpoints Required

```
POST   /api/investigations                 # Create investigation
GET    /api/investigations/{id}/status     # Poll investigation status
GET    /api/investigations/{id}/results    # Fetch final results
POST   /api/investigations/{id}/export     # Generate export
PATCH  /api/investigations/{id}/control    # Pause/stop investigation
```

### Technical Constraints
- **Polling Interval**: 2 seconds (configurable via `REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS`)
- **Request Timeout**: 30 seconds (configurable via `REACT_APP_REQUEST_TIMEOUT_MS`)
- **Maximum Concurrent Investigations**: 3 per user (configurable via `REACT_APP_MAX_CONCURRENT_INVESTIGATIONS`)
- **Export Size Limit**: 100MB per export file
- **Browser Support**: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **Network**: Must handle 3G networks with graceful degradation

### Data Constraints
- **Investigation History**: Store last 50 investigations in browser localStorage (10MB limit)
- **Log Entries**: Display maximum 500 log entries in Progress Page with virtualization
- **Findings**: Support up to 1000 findings per investigation with pagination
- **Evidence**: Display up to 100 evidence items per finding with expandable details
- **Tool Execution Timeline**: Show maximum 200 tool executions with scroll

### Business Constraints
- **Investigation Duration**: Maximum 15 minutes execution time before timeout
- **User Permissions**: Role-based access control (investigators, analysts, admins)
- **Audit Trail**: All investigation actions logged for compliance
- **Data Retention**: Investigation results retained for 90 days
- **Concurrent Users**: Support 50 concurrent investigators running investigations

### Integration Constraints
- **Backward Compatibility**: Must work with existing Wizard Store (Zustand)
- **GAIA Design System**: Must use GAIA corporate colors and components
- **No Breaking Changes**: Cannot modify backend API contracts (read-only integration)
- **Feature Flag**: Hybrid graph integration controlled by `REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH`
- **Legacy Support**: Must coexist with existing investigation flows during migration

---

*This specification focuses on WHAT the Hybrid Graph Integration should accomplish and WHY it's needed, without specifying HOW to implement the technical details. The next phase will involve creating detailed implementation plans with backend endpoint design, frontend component architecture, and polling service implementation.*
