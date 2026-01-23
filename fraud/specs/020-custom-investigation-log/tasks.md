# Tasks: Custom Investigation Log

**Input**: Design documents from `/specs/001-custom-investigation-log/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md

**Tests**: Tests are OPTIONAL per specification - focusing on implementation tasks for MVP delivery.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/service/logging/` for implementation
- **Tests**: `olorin-server/tests/unit/` and `olorin-server/tests/integration/` for tests
- Paths follow existing project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create investigation log context module structure in olorin-server/app/service/logging/investigation_log_context.py
- [x] T002 Create investigation log handler module structure in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T003 [P] Create investigation log formatter module structure in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T004 [P] Create investigation log manager module structure in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T005 [P] Add imports and dependencies check in olorin-server/app/service/logging/__init__.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement InvestigationLogContext with contextvars in olorin-server/app/service/logging/investigation_log_context.py
- [x] T007 [P] Add set_investigation_context() function in olorin-server/app/service/logging/investigation_log_context.py
- [x] T008 [P] Add get_investigation_id() function in olorin-server/app/service/logging/investigation_log_context.py
- [x] T009 [P] Add get_investigation_metadata() function in olorin-server/app/service/logging/investigation_log_context.py
- [x] T010 [P] Add clear_investigation_context() function in olorin-server/app/service/logging/investigation_log_context.py
- [x] T011 Add error handling and validation for investigation_id in olorin-server/app/service/logging/investigation_log_context.py

**Checkpoint**: Foundation ready - investigation context system available for all user stories

---

## Phase 3: User Story 1 - Investigation-Specific Logging (Priority: P1) 🎯 MVP

**Goal**: Create dedicated log files for each investigation in the investigation folder with DEBUG level logging enabled. All investigation-related logs are captured in `investigation.log` file.

**Independent Test**: Create a new investigation and verify that:
1. Log file `investigation.log` is created in `logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/`
2. Log file has DEBUG level logging enabled
3. Log entries are written to the investigation log file

### Implementation for User Story 1

- [x] T012 [US1] Implement InvestigationLogHandler class constructor in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T013 [US1] Implement log file creation logic in InvestigationLogHandler.__init__() in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T014 [US1] Implement emit() method to write logs to investigation.log file in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T015 [US1] Implement close() method to flush and close log file in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T016 [US1] Add DEBUG level default configuration in InvestigationLogHandler.__init__() in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T017 [US1] Integrate with InvestigationFolderManager to get investigation folder path in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T018 [US1] Add error handling for file creation failures in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T019 [US1] Add thread-safe file write operations in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T055 [P] [US1] Add logging for investigation lifecycle events (start, progress, completion, cancellation, failure) in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T056 [P] [US1] Add logging for agent execution activities (start, complete, error) in olorin-server/app/service/agent/core/agent_utils.py and olorin-server/app/service/agent/orchestrator_state.py
- [x] T057 [P] [US1] Add logging for tool executions (trigger, input, output, errors) in olorin-server/app/service/agent/orchestration/enhanced_tool_execution_logger.py and olorin-server/app/service/agent/tools/tool_interceptor.py

**Checkpoint**: At this point, User Story 1 should be fully functional - investigation log files are created and logs are written to them

---

## Phase 4: User Story 2 - Log Prefix Integration (Priority: P1)

**Goal**: All investigation-related log entries include `[investigation_id]` prefix for easy identification and filtering in both investigation log file and main server log.

**Independent Test**: Verify that:
1. All log entries in investigation.log contain `[investigation_id]` prefix
2. Log entries in main server log also contain prefix when investigation context is active
3. Log entries without investigation context do not include prefix

### Implementation for User Story 2

- [x] T020 [US2] Implement InvestigationLogFormatter class in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T021 [US2] Add base_formatter integration in InvestigationLogFormatter.__init__() in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T022 [US2] Implement format() method to add [investigation_id] prefix in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T023 [US2] Add contextvars check for investigation_id in InvestigationLogFormatter.format() in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T024 [US2] Implement HUMAN format prefix logic (e.g., `[inv-123] 2025-01-11 12:00:00 [DEBUG] ...`) in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T025 [US2] Implement JSON format prefix logic (add investigation_id field) in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T026 [US2] Implement STRUCTURED format prefix logic (add investigation_id to structured fields) in olorin-server/app/service/logging/investigation_log_formatter.py
- [x] T027 [US2] Integrate InvestigationLogFormatter with InvestigationLogHandler in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T028 [US2] Add formatter to unified logging handlers for main server log prefix support in olorin-server/app/service/logging/investigation_log_formatter.py

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - logs have prefixes and are written to investigation files

---

## Phase 5: User Story 3 - Integration with Unified Logging System (Priority: P2)

**Goal**: Investigation logging integrates seamlessly with UnifiedLoggingCore, respecting format configuration and output destinations while maintaining investigation-specific file output.

**Independent Test**: Verify that:
1. Investigation logs respect unified logging format configuration (HUMAN, JSON, STRUCTURED)
2. Investigation logs are written to both investigation.log and unified logging outputs
3. Format changes in unified logging are reflected in investigation logs

### Implementation for User Story 3

- [x] T029 [US3] Implement InvestigationLogManager class in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T030 [US3] Add UnifiedLoggingCore integration in InvestigationLogManager.__init__() in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T031 [US3] Implement start_investigation_logging() method in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T032 [US3] Add handler registry management in InvestigationLogManager in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T033 [US3] Integrate InvestigationLogHandler with UnifiedLoggingCore format configuration in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T034 [US3] Add handler to UnifiedLoggingCore logger hierarchy in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T035 [US3] Implement stop_investigation_logging() method in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T036 [US3] Add format consistency validation in InvestigationLogManager in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T037 [US3] Extend UnifiedLoggingCore with add_investigation_handler() method in olorin-server/app/service/logging/unified_logging_core.py
- [x] T038 [US3] Ensure dual output (investigation.log + unified outputs) in InvestigationLogHandler in olorin-server/app/service/logging/investigation_log_handler.py

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work independently - investigation logs integrate with unified logging system

---

## Phase 6: User Story 4 - Initial Metadata Logging (Priority: P2)

**Goal**: Investigation log file starts with complete record of all investigation metadata received from frontend as the first log entry.

**Independent Test**: Verify that:
1. First entry in investigation.log contains all metadata fields from frontend
2. Nested structures (settings.time_range, settings.tools) are preserved
3. Optional fields are handled gracefully when missing

### Implementation for User Story 4

- [x] T039 [US4] Implement log_initial_metadata() method in InvestigationLogManager in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T040 [US4] Add metadata structure serialization in log_initial_metadata() in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T041 [US4] Implement nested metadata field preservation in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T042 [US4] Add optional field handling (missing fields don't cause errors) in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T043 [US4] Integrate log_initial_metadata() call in start_investigation_logging() in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T044 [US4] Format initial metadata entry according to unified logging format in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T045 [US4] Add metadata validation and error handling in olorin-server/app/service/logging/investigation_log_manager.py

**Checkpoint**: At this point, all user stories should work independently - investigation logs start with metadata entry

---

## Phase 7: Integration & Polish

**Purpose**: Integration with investigation controllers, error handling, performance optimization, edge case handling, and cross-cutting concerns

- [x] T046 Integrate InvestigationLogManager with investigation_controller.py in olorin-server/app/router/controllers/investigation_controller.py
- [x] T047 Add investigation logging start in start_structured_investigation() in olorin-server/app/router/controllers/investigation_controller.py
- [x] T048 Add investigation logging stop in investigation completion handlers in olorin-server/app/router/controllers/investigation_controller.py
- [x] T049 [P] Integrate with investigation_coordinator.py for context propagation in olorin-server/app/service/agent/orchestration/investigation_coordinator.py
- [x] T050 [P] Add context setting in start_investigation() function in olorin-server/app/service/agent/orchestration/investigation_coordinator.py
- [x] T051 Add error handling for logging failures (don't block investigation execution) in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T052 Implement async/non-blocking file writes for performance (<10ms overhead) in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T053 Add concurrent investigation support (separate handlers per investigation) in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T054 Add investigation_id validation before creating log files in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T058 Add handler cleanup on investigation failure/cancellation in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T059 Add performance metrics tracking (log file creation time, log entry overhead) in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T060 Update quickstart.md validation and examples in specs/001-custom-investigation-log/quickstart.md
- [x] T061 Add handling for concurrent investigations with same investigation_id (prevent conflicts) in olorin-server/app/service/logging/investigation_log_manager.py
- [x] T062 Add handling for large log files (rotation or archival strategy) in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T063 Add handling for investigation folder deletion during active investigation (graceful degradation) in olorin-server/app/service/logging/investigation_log_handler.py
- [x] T064 Add handling for server restart (log file recovery/continuation) in olorin-server/app/service/logging/investigation_log_manager.py

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) can start immediately after Foundational
  - User Story 2 (P1) can start after Foundational (depends on US1 for handler integration)
  - User Story 3 (P2) depends on US1 and US2 (needs handler and formatter)
  - User Story 4 (P2) depends on US3 (needs manager)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for handler integration
- **User Story 3 (P2)**: Depends on US1 and US2 - Needs handler and formatter to be complete
- **User Story 4 (P2)**: Depends on US3 - Needs manager to be complete

### Within Each User Story

- Core components before integration
- Handler before formatter integration
- Manager after handler and formatter
- Integration after core implementation
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T003, T004, T005 can run in parallel
- **Foundational Phase**: T007, T008, T009, T010 can run in parallel
- **User Story 1**: T012-T019 can be sequential (handler construction), T055-T057 can run in parallel (different event types)
- **User Story 2**: T020-T026 can run in parallel (different format implementations), then T027-T028 sequential
- **User Story 3**: T029-T038 mostly sequential (manager construction)
- **User Story 4**: T039-T045 sequential (metadata logging)
- **Polish Phase**: T049, T050, T061, T062, T063, T064 can run in parallel (different edge case handling)

---

## Parallel Example: User Story 2 Format Implementations

```bash
# Launch format implementations in parallel:
Task: "Implement HUMAN format prefix logic in investigation_log_formatter.py"
Task: "Implement JSON format prefix logic in investigation_log_formatter.py"
Task: "Implement STRUCTURED format prefix logic in investigation_log_formatter.py"
```

---

## Parallel Example: User Story 1 Event Logging

```bash
# Launch event logging tasks in parallel (after handler is complete):
Task: "Add logging for investigation lifecycle events in investigation_log_manager.py"
Task: "Add logging for agent execution activities in agent_utils.py and orchestrator_state.py"
Task: "Add logging for tool executions in enhanced_tool_execution_logger.py and tool_interceptor.py"
```

## Parallel Example: Polish Phase Edge Case Handling

```bash
# Launch edge case handling tasks in parallel:
Task: "Add handling for concurrent investigations with same investigation_id"
Task: "Add handling for large log files (rotation or archival strategy)"
Task: "Add handling for investigation folder deletion during active investigation"
Task: "Add handling for server restart (log file recovery/continuation)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Investigation log file creation)
4. Complete Phase 4: User Story 2 (Log prefix integration)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP with prefixes!)
4. Add User Story 3 → Test independently → Deploy/Demo (Full integration!)
5. Add User Story 4 → Test independently → Deploy/Demo (Complete feature!)
6. Add Polish → Final validation → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (handler implementation)
   - Developer B: User Story 2 (formatter implementation) - can start after US1 handler exists
3. Once US1 and US2 are done:
   - Developer A: User Story 3 (manager and integration)
   - Developer B: User Story 4 (metadata logging)
4. Team: Polish phase integration

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Performance target: <100ms log file creation, <10ms per log entry overhead
- Error handling: Logging failures should not block investigation execution
- Thread safety: All operations must be thread-safe for concurrent investigations

