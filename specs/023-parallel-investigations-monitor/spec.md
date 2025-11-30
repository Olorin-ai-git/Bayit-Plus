# Feature Specification: Running Investigations Monitoring

**Feature Branch**: `002-parallel-investigations-monitor`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Running Investigations Monitoring. we have a partially implemented page for monitoring parallel running investigations. it's under /investigation/parallel but not loading correctly and not implemented correctly. implement it in full both front, back, integration end to end."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Monitor Running Investigations in Real-Time (Priority: P1)

Fraud analysts need a dedicated dashboard to view all currently running automated investigations at a glance, tracking their progress and status without navigating between individual investigation pages.

**Why this priority**: Core functionality that enables operational visibility into parallel investigation execution. Without this, analysts cannot track multiple investigations simultaneously.

**Independent Test**: Can be fully tested by accessing the `/investigation/parallel` page with active investigations running, and verifying that all investigations appear in a table with current status and progress displayed, with automatic refresh occurring every 10 seconds without manual intervention.

**Acceptance Scenarios**:

1. **Given** multiple investigations are running in parallel, **When** user navigates to `/investigation/parallel`, **Then** a table displays all running investigations with investigation ID, status, risk score, entity value, and start time visible
2. **Given** investigations are displayed, **When** system polls the backend every 10 seconds, **Then** the displayed data refreshes automatically with latest status and progress
3. **Given** user is viewing the monitoring page, **When** an investigation completes during monitoring, **Then** its status changes immediately in the table on next poll cycle

---

### User Story 2 - Filter Investigations by Status (Priority: P2)

Analysts need to filter investigations by status (running, completed, failed, etc.) to focus on specific subsets of investigations without viewing the entire list.

**Why this priority**: Enhances usability for teams with many investigations. P2 because baseline functionality (viewing all investigations) works without this, but filtering provides significant operational value.

**Independent Test**: Can be fully tested by verifying filter controls appear on the page, selecting different status filters, and confirming that only investigations matching the selected status(es) are displayed.

**Acceptance Scenarios**:

1. **Given** multiple investigations with different statuses exist, **When** user selects "IN_PROGRESS" status filter, **Then** only in-progress investigations are displayed
2. **Given** filter is applied, **When** user clears the filter, **Then** all investigations are displayed again
3. **Given** investigations have multiple possible statuses, **When** user applies multiple status filters simultaneously, **Then** investigations matching ANY selected status are displayed

---

### User Story 3 - Navigate to Individual Investigation Details (Priority: P1)

Analysts need to click on an investigation row to open the detailed progress page for deep investigation into a specific case.

**Why this priority**: Critical workflow integration. Without this, the monitoring page is isolated from the investigation system. Must work end-to-end.

**Independent Test**: Can be fully tested by clicking on an investigation in the table and verifying navigation to the investigation's detailed progress page occurs correctly.

**Acceptance Scenarios**:

1. **Given** user is viewing the investigations table, **When** user clicks on an investigation row, **Then** the browser navigates to `/investigation/progress?id={investigationId}`
2. **Given** user clicks on investigation, **When** navigation occurs, **Then** the target investigation's progress page loads with complete data
3. **Given** investigation table is displayed, **When** user hovers over a row, **Then** visual feedback indicates the row is clickable

---

### User Story 4 - Manual Refresh and Update Status (Priority: P2)

Analysts need manual control to refresh the investigation list on-demand and see a clear indicator of when the data was last updated.

**Why this priority**: Provides control and transparency about data freshness. P2 because automatic polling provides baseline functionality, but manual refresh and timestamps improve user confidence in data currency.

**Independent Test**: Can be fully tested by clicking a refresh button and verifying the last updated timestamp changes and data is refreshed immediately.

**Acceptance Scenarios**:

1. **Given** investigations are displayed, **When** user clicks "Refresh" button, **Then** data refreshes immediately from the backend
2. **Given** page is viewed, **When** data has been refreshed, **Then** a "Last Updated: [timestamp]" indicator is displayed
3. **Given** data is refreshed, **When** user views the page repeatedly, **Then** the timestamp updates to reflect the current refresh time

---

### User Story 5 - Handle Loading and Error States (Priority: P1)

System must provide clear feedback when loading data, and handle errors gracefully with appropriate messaging when backend calls fail.

**Why this priority**: Critical for user experience. Users must understand what's happening and what to do if something goes wrong. Essential for production reliability.

**Independent Test**: Can be fully tested by observing loading state when page initially loads, and simulating backend errors to verify error messaging displays correctly.

**Acceptance Scenarios**:

1. **Given** page is loading initial data, **When** API request is pending, **Then** loading state displays with spinner or skeleton loader
2. **Given** API call fails, **When** error occurs, **Then** user-friendly error message displays with option to retry
3. **Given** no investigations exist, **When** investigations list is empty, **Then** empty state message displays guiding user to create investigations
4. **Given** error state is shown, **When** user clicks retry button, **Then** API call is attempted again

---

### Edge Cases

- What happens when system returns investigations with missing or malformed metadata (e.g., no entity values)?
- How does system handle investigations with unknown/invalid status values from the backend?
- What happens when user has network connectivity issues during real-time polling?
- How does system behave if the backend returns paginated results and user is viewing page 1 while new investigations are created?
- What happens when investigation completes while user is viewing the monitoring page?
- How does system handle WebSocket disconnection if real-time updates are added later?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all running and recently completed investigations in a table format on the `/investigation/parallel` route
- **FR-002**: Table MUST display the following columns: Investigation ID, Entity Value, Status, Risk Score, and Start Time
- **FR-003**: System MUST automatically refresh the investigation list every 10 seconds to reflect current state
- **FR-004**: System MUST support filtering investigations by status (IN_PROGRESS, COMPLETED, ERROR, CANCELLED)
- **FR-005**: Clicking on an investigation row MUST navigate to the investigation's detailed progress page at `/investigation/progress?id={investigationId}`
- **FR-006**: System MUST display a "Last Updated" timestamp showing when data was last refreshed
- **FR-007**: System MUST provide a manual refresh button to immediately reload investigation data
- **FR-008**: System MUST display a loading indicator while fetching investigation data
- **FR-009**: System MUST display an error message and retry button if the API call fails
- **FR-010**: System MUST display an empty state message if no investigations are found
- **FR-011**: Investigation status MUST be color-coded (green for completed, blue for in-progress, red for error)
- **FR-012**: Risk scores MUST be displayed with appropriate color coding (red for high risk >0.7, yellow for medium 0.4-0.7, green for low <0.4)
- **FR-013**: System MUST retrieve investigation data from the backend API at `/api/v1/investigation-state/`
- **FR-014**: All polling intervals and configuration values MUST be configuration-driven from environment variables, not hardcoded
- **FR-015**: Component MUST use the shared Table component from `@shared/components/Table` with correct API usage

### Key Entities

- **Investigation**: Represents a single fraud investigation with metadata including ID, status, progress percentage, risk score, and associated entities
- **InvestigationStatus**: Enumeration representing investigation state (CREATED, IN_PROGRESS, COMPLETED, ERROR, CANCELLED)
- **Entity**: The value being investigated (email address, merchant ID, etc.) with risk metrics
- **Progress**: Real-time progress tracking including completion percentage, current phase, tools executed, and findings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Page loads with investigation list visible within 2 seconds of navigation
- **SC-002**: Data automatically refreshes every 10 seconds with no manual user intervention required
- **SC-003**: User can filter investigations by status and see results update within 1 second
- **SC-004**: Clicking on an investigation row navigates to progress page within 500ms
- **SC-005**: 100% of investigations currently running appear in the list with accurate status and risk scores
- **SC-006**: System handles up to 100 concurrent investigations displayed simultaneously without performance degradation
- **SC-007**: Manual refresh button updates data within 1 second of user click
- **SC-008**: Error states display clear, actionable messages that enable user to understand and resolve issues
- **SC-009**: Empty state displays when zero investigations exist, preventing confusion
- **SC-010**: Component renders without TypeScript compilation errors and with zero console errors
- **SC-011**: All polling logic stops when investigations reach terminal status (completed, error, cancelled)
- **SC-012**: Component file size remains under 200 lines (per CLAUDE.md requirements)

## Assumptions

1. Backend API `/api/v1/investigation-state/` is fully functional and returns complete investigation data
2. Investigation status values follow backend schema (IN_PROGRESS, COMPLETED, ERROR, CANCELLED, CREATED)
3. Risk scores are numeric values between 0 and 1
4. Entity values exist in investigation settings (may be missing in edge cases, handled gracefully)
5. User has read permissions for all investigations (no authorization filtering required for MVP)
6. Polling interval of 10 seconds is acceptable for monitoring use case (can be configured via environment)
7. Frontend routing to investigation progress pages is already configured and working
8. Shared Table component API is stable and documented in `@shared/components/Table/types.ts`
9. Investigation data includes metadata sufficient for display (ID, status, createdAt, progress)
10. Environment configuration loading is available via existing mechanisms in the codebase

## Out of Scope

- Real-time WebSocket implementation (polling is sufficient; SSE can be added later)
- Advanced filtering (date ranges, entity type filtering, risk score ranges)
- Bulk operations (cancel multiple investigations, export results)
- Performance analytics or trending
- Archived investigation viewing (focus on active/recent only)
- Multi-user collaboration features (assignment, notes, comments)
