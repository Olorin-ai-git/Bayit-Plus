# Feature Specification: Custom Investigation Log

**Feature Branch**: `001-custom-investigation-log`  
**Created**: 2025-01-11  
**Status**: Draft  
**Input**: User description: "custom investigation log. You a re a master archiver and logger, your role is to do expert logging of ivestigations. The requirement is to identify specific logs related to a specific investigation based on its investigation id. each log line related to a specific investigation flow (investigation lifecycle, agents working, tool triggering) will be identified by [{investigtionsId}] prefix. all investigation related logs will be saved it a designated server log file in the investigation folder.log level for investigation will be DEBUG by default. you need to integrate with the existing logging system in the server.the initial logging will include all the investigation related metadata as it was passed from the frontend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Investigation-Specific Logging (Priority: P1)

As a security analyst or developer, I need to view all logs related to a specific investigation in a dedicated log file, so I can trace the complete investigation lifecycle, agent activities, and tool executions for debugging and audit purposes.

**Why this priority**: This is the core functionality - without investigation-specific log files, users cannot effectively debug or audit individual investigations. This enables traceability and troubleshooting.

**Independent Test**: Can be fully tested by creating a new investigation and verifying that all investigation-related logs are captured in the investigation folder's log file with the `[{investigation_id}]` prefix. The test delivers immediate value by providing a single source of truth for investigation logs.

**Acceptance Scenarios**:

1. **Given** an investigation is created with investigation_id "inv-123", **When** the investigation starts, **Then** a log file is created in `logs/investigations/{MODE}_inv-123_{TIMESTAMP}/investigation.log` with DEBUG level logging enabled
2. **Given** an investigation is in progress, **When** any log entry is generated related to that investigation (lifecycle events, agent execution, tool triggering), **Then** the log entry includes the `[inv-123]` prefix and is written to the investigation's log file
3. **Given** investigation metadata is received from the frontend, **When** the investigation starts, **Then** the investigation log file is initialized (Note: Initial metadata logging is covered by User Story 4)

---

### User Story 2 - Log Prefix Integration (Priority: P1)

As a developer debugging investigation issues, I need all investigation-related log lines to be prefixed with `[{investigation_id}]`, so I can easily filter and identify logs belonging to a specific investigation in both the investigation log file and the main server log.

**Why this priority**: The prefix is essential for log identification and filtering. Without it, logs from multiple concurrent investigations would be indistinguishable.

**Independent Test**: Can be tested independently by verifying that all log entries in the investigation log file and main server log contain the `[{investigation_id}]` prefix when related to an investigation. This enables log filtering and analysis.

**Acceptance Scenarios**:

1. **Given** an investigation with ID "inv-456" is running, **When** an agent executes a tool, **Then** the log entry appears as `[inv-456] Agent 'DeviceAnalysisAgent' executing tool 'device_analysis'`
2. **Given** multiple investigations are running concurrently, **When** logs are generated, **Then** each log line can be uniquely identified by its investigation ID prefix
3. **Given** a log entry is generated outside of an investigation context, **When** it is logged, **Then** it does not include an investigation ID prefix

---

### User Story 3 - Integration with Unified Logging System (Priority: P2)

As a system administrator, I need the investigation logging to integrate seamlessly with the existing unified logging system, so that investigation logs follow the same configuration, format, and output mechanisms as other server logs.

**Why this priority**: Integration ensures consistency, maintainability, and leverages existing logging infrastructure. This prevents duplicate logging systems and configuration conflicts.

**Independent Test**: Can be tested independently by verifying that investigation logs respect the unified logging configuration (format, output destinations, log levels) while maintaining investigation-specific file output. This ensures system consistency.

**Acceptance Scenarios**:

1. **Given** the unified logging system is configured with JSON format, **When** investigation logs are written, **Then** they follow the JSON format structure while maintaining the investigation ID prefix
2. **Given** the unified logging system has structured logging enabled, **When** investigation logs are generated, **Then** they include structured metadata compatible with the unified logging format
3. **Given** the unified logging system is reconfigured, **When** investigation logs are written, **Then** they adapt to the new configuration while maintaining investigation-specific file output

---

### User Story 4 - Initial Metadata Logging (Priority: P2)

As a security analyst, I need the investigation log file to start with a complete record of all investigation metadata received from the frontend, so I have full context about how the investigation was initiated and configured.

**Why this priority**: Initial metadata provides essential context for understanding the investigation's purpose, configuration, and parameters. This is critical for audit trails and troubleshooting.

**Independent Test**: Can be tested independently by creating an investigation and verifying that the first log entry in the investigation log file contains all metadata fields passed from the frontend. This provides immediate context for investigation analysis.

**Acceptance Scenarios**:

1. **Given** an investigation is created with metadata from the frontend (investigation_id, entity_id, entity_type, settings, etc.), **When** the investigation log file is initialized, **Then** the first log entry contains all received metadata fields
2. **Given** investigation metadata includes nested structures (e.g., settings.time_range, settings.tools), **When** the metadata is logged, **Then** all nested fields are preserved and logged in a structured format
3. **Given** optional metadata fields are missing, **When** the initial log entry is created, **Then** only present fields are logged without errors

---

### Edge Cases

- What happens when an investigation_id is not provided or is invalid?
- How does the system handle concurrent investigations with the same investigation_id?
- What happens if the investigation folder cannot be created (permissions, disk space)?
- How are logs handled when an investigation is cancelled or fails before completion?
- What happens if the log file becomes too large (disk space management)?
- How are logs handled when the investigation folder is deleted while the investigation is still running?
- What happens when logging fails (I/O errors, file locks)?
- How are logs handled for investigations that span multiple server restarts?
- What happens when investigation metadata is malformed or contains invalid data?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a dedicated log file `investigation.log` in the investigation folder (`logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/`) for each investigation
- **FR-002**: System MUST prefix all investigation-related log entries with `[{investigation_id}]` format
- **FR-003**: System MUST set the default log level to DEBUG for investigation-specific logging
- **FR-004**: System MUST integrate with the existing unified logging system (`UnifiedLoggingCore`) without duplicating logging infrastructure
- **FR-005**: System MUST log all investigation lifecycle events with the investigation ID prefix. Lifecycle events include: investigation start, progress updates, completion (success), cancellation (user-initiated), and failure (error conditions)
- **FR-006**: System MUST log all agent execution activities with the investigation ID prefix. Agent activities include: agent start (when agent begins execution), agent completion (when agent finishes successfully), agent decisions (key decision points), and agent errors (when agent execution fails)
- **FR-007**: System MUST log all tool executions with the investigation ID prefix. Tool execution events include: tool triggering (when tool is called), tool input (parameters passed to tool), tool output (results returned), and tool errors (execution failures or exceptions)
- **FR-008**: System MUST log initial investigation metadata received from the frontend as the first entry in the investigation log file
- **FR-009**: System MUST write investigation logs to both the investigation-specific log file and respect unified logging system output destinations (console, file, json_file, structured_file)
- **FR-010**: System MUST maintain log format consistency with the unified logging system configuration (human, json, structured formats)
- **FR-011**: System MUST handle investigation context propagation across async operations and thread boundaries
- **FR-012**: System MUST ensure investigation logs are written even if the investigation fails or is cancelled
- **FR-013**: System MUST support concurrent investigations with separate log files for each investigation
- **FR-014**: System MUST validate investigation_id before creating log files and reject invalid or missing investigation IDs with appropriate error handling

### Key Entities *(include if feature involves data)*

- **InvestigationLogFile**: Represents the dedicated log file for an investigation, located in the investigation folder, with DEBUG level logging and investigation ID prefixing
- **InvestigationLogContext**: Represents the logging context for an investigation, containing investigation_id and metadata, propagated through async operations and thread boundaries
- **InvestigationMetadata**: Represents the initial investigation configuration received from the frontend, including investigation_id, entity_id, entity_type, settings (time_range, tools, investigation_type, investigation_mode), lifecycle_stage, and status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All investigation-related log entries (100%) contain the `[{investigation_id}]` prefix and are written to the investigation log file
- **SC-002**: Investigation log file is created within 100ms of investigation initialization
- **SC-003**: Initial investigation metadata is logged as the first entry in the investigation log file for 100% of investigations
- **SC-004**: Investigation logs maintain format consistency with unified logging system configuration (no format conflicts or inconsistencies)
- **SC-005**: System successfully handles 10 concurrent investigations running simultaneously with separate log files and no log entry misattribution (test scenario: start 10 investigations concurrently, generate logs from each, verify all logs appear in correct investigation.log files with correct prefixes)
- **SC-006**: Investigation logs are accessible and readable even after investigation completion, cancellation, or failure (100% log persistence)
- **SC-007**: Log file creation and writing operations do not block investigation execution (async/non-blocking logging with <10ms overhead per log entry)
