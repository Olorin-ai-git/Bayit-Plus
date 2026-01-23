# Feature Specification: Investigations Management Microservice

**Feature Branch**: `001-investigations-management-microservice`  
**Created**: 2025-01-31  
**Status**: Draft  
**Input**: User description: "investigations management microservice. create a new investigations management microservice and also add a card for it in the root page. use /Users/gklainert/Documents/olorin/olorin-investigations-20251108-222707.html as a reference but modify the new microservice page components to match olorin look and feel . use other pages like root page and investigation page as a reference. make sure it works in full end to end including full integration between front and back"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Browse Investigations List (Priority: P1)

As an investigator, I want to view a list of all investigations so that I can quickly see what investigations exist and their current status.

**Why this priority**: This is the foundational view that enables all other investigation management operations. Without this, users cannot discover or access existing investigations.

**Independent Test**: Can be fully tested by navigating to the investigations management page and verifying that investigations are displayed in a card-based grid layout with proper filtering and search capabilities. Delivers immediate value by showing investigation status at a glance.

**Acceptance Scenarios**:

1. **Given** I am on the investigations management page, **When** the page loads, **Then** I see a grid of investigation cards showing name, status, owner, risk model, and last updated time
2. **Given** I am viewing the investigations list, **When** I use the search box, **Then** the list filters to show only investigations matching my search query
3. **Given** I am viewing the investigations list, **When** I select a status filter (pending, in-progress, completed, failed, archived), **Then** the list shows only investigations with that status
4. **Given** I am viewing the investigations list, **When** I click on a tab (All, My Items, In Progress, Completed, Failed, Archived), **Then** the list filters accordingly

---

### User Story 2 - Create New Investigation (Priority: P1)

As an investigator, I want to create a new investigation with specific parameters so that I can initiate a fraud investigation workflow.

**Why this priority**: Creating investigations is a core workflow that enables the investigation process. This must work end-to-end with backend integration.

**Independent Test**: Can be fully tested by clicking "New Investigation", filling out the form with required fields (name, owner, description, sources, tools, risk model, time range), and verifying the investigation is created and appears in the list. Delivers value by enabling investigation initiation.

**Acceptance Scenarios**:

1. **Given** I am on the investigations management page, **When** I click the "New Investigation" button, **Then** a modal form opens with fields for investigation details
2. **Given** I have opened the new investigation form, **When** I fill in required fields (name, owner) and optional fields (description, sources, tools, risk model, time range), **Then** I can submit the form to create the investigation
3. **Given** I have submitted a new investigation, **When** the form is saved, **Then** the investigation appears in the list with status "pending" or "in-progress" (if auto-run is enabled)
4. **Given** I have created an investigation with auto-run enabled, **When** the investigation is created, **Then** it automatically starts executing and shows progress updates in real-time

---

### User Story 3 - View Investigation Details (Priority: P1)

As an investigator, I want to view detailed information about a specific investigation including its phases, progress, and parameters so that I can understand its current state.

**Why this priority**: Viewing details is essential for understanding investigation progress and making decisions about next steps. This enables the investigation workflow.

**Independent Test**: Can be fully tested by clicking on an investigation card or "View" button, and verifying that a drawer/sidebar opens showing investigation phases, progress bars, timeline, and parameters. Delivers value by providing comprehensive investigation status.

**Acceptance Scenarios**:

1. **Given** I am viewing the investigations list, **When** I click on an investigation card, **Then** a drawer opens on the right side showing investigation details
2. **Given** I have opened an investigation drawer, **When** I view the details, **Then** I see investigation phases with status indicators (pending, in-progress, completed), progress bars, and timeline information
3. **Given** I have opened an investigation drawer, **When** I scroll through the details, **Then** I see investigation parameters including risk model, sources, tools, and time range
4. **Given** I am viewing investigation details, **When** the investigation is in progress, **Then** I see real-time updates to progress bars and phase status

---

### User Story 4 - Edit and Update Investigation (Priority: P2)

As an investigator, I want to edit investigation details so that I can update parameters or correct information.

**Why this priority**: Editing enables users to modify investigations after creation, which is important for workflow flexibility but not critical for initial MVP.

**Independent Test**: Can be fully tested by clicking "Edit" on an investigation, modifying fields in the form, and verifying changes are saved and reflected in the list. Delivers value by allowing investigation parameter updates.

**Acceptance Scenarios**:

1. **Given** I am viewing an investigation card, **When** I click the "Edit" button, **Then** the investigation form modal opens pre-filled with current investigation data
2. **Given** I have opened the edit form, **When** I modify investigation fields and submit, **Then** the investigation is updated in the backend and the UI reflects the changes
3. **Given** I have updated an investigation, **When** I view the investigation details, **Then** I see the updated information

---

### User Story 5 - Delete Investigation (Priority: P2)

As an investigator, I want to delete investigations so that I can remove unwanted or completed investigations from the list.

**Why this priority**: Deletion is important for data management but not critical for core workflow. Users need to clean up old investigations.

**Independent Test**: Can be fully tested by clicking "Delete" on an investigation, confirming the deletion, and verifying the investigation is removed from the list and backend. Delivers value by enabling investigation cleanup.

**Acceptance Scenarios**:

1. **Given** I am viewing an investigation card, **When** I click the "Delete" button, **Then** a confirmation dialog appears asking me to confirm deletion
2. **Given** I have confirmed deletion, **When** the deletion completes, **Then** the investigation is removed from the list and deleted from the backend
3. **Given** I have deleted an investigation, **When** I refresh the page, **Then** the investigation does not reappear

---

### User Story 6 - Replay Investigation (Priority: P2)

As an investigator, I want to replay an existing investigation with modified parameters so that I can re-run investigations with different settings.

**Why this priority**: Replay functionality enables investigation iteration and testing but is not essential for initial MVP. Provides value for investigation refinement.

**Independent Test**: Can be fully tested by clicking "Replay" on an investigation, modifying parameters in the form, and verifying a new investigation is created with the modified parameters. Delivers value by enabling investigation re-execution.

**Acceptance Scenarios**:

1. **Given** I am viewing an investigation, **When** I click the "Replay" button, **Then** a new investigation form opens pre-filled with the original investigation's parameters
2. **Given** I have opened the replay form, **When** I modify parameters and submit, **Then** a new investigation is created with the modified parameters and original investigation name appended with "(Replay)"
3. **Given** I have replayed an investigation, **When** the new investigation is created, **Then** it appears in the list as a separate investigation

---

### User Story 7 - Export and Import Investigations (Priority: P3)

As an investigator, I want to export investigations to JSON and import them back so that I can backup, share, or migrate investigation data.

**Why this priority**: Import/export is a convenience feature that enables data portability but is not essential for core workflow. Provides value for data management and backup.

**Independent Test**: Can be fully tested by clicking "Export JSON", downloading the file, then clicking "Import JSON" and uploading the file, verifying investigations are restored. Delivers value by enabling investigation data portability.

**Acceptance Scenarios**:

1. **Given** I am on the investigations management page, **When** I click "Export JSON", **Then** a JSON file is downloaded containing all investigations
2. **Given** I have an exported JSON file, **When** I click "Import JSON" and select the file, **Then** investigations from the file are imported and appear in the list
3. **Given** I have imported investigations, **When** I view the list, **Then** imported investigations appear alongside existing ones

---

### User Story 8 - Real-time Updates (Priority: P2)

As an investigator, I want to see real-time updates to investigation progress so that I can monitor investigation execution without manual refresh.

**Why this priority**: Real-time updates improve user experience and enable live monitoring, but the system can function with polling or manual refresh for initial MVP.

**Independent Test**: Can be fully tested by creating an investigation with auto-run enabled, toggling the realtime switch, and verifying progress bars and phase status update automatically. Delivers value by providing live investigation monitoring.

**Acceptance Scenarios**:

1. **Given** I am viewing an in-progress investigation, **When** realtime updates are enabled, **Then** progress bars and phase status update automatically without page refresh
2. **Given** I have realtime updates enabled, **When** I toggle the realtime switch off, **Then** updates pause and I can manually refresh to see latest status
3. **Given** I am viewing multiple investigations, **When** realtime updates are enabled, **Then** all in-progress investigations update simultaneously

---

### User Story 9 - Activity Log (Priority: P3)

As an investigator, I want to view an activity log of investigation events so that I can track investigation history and system events.

**Why this priority**: Activity logging provides audit trail and debugging capabilities but is not essential for core workflow. Provides value for investigation tracking and troubleshooting.

**Independent Test**: Can be fully tested by performing various actions (create, update, delete investigations) and verifying events appear in the activity log table with timestamps and source information. Delivers value by providing investigation audit trail.

**Acceptance Scenarios**:

1. **Given** I am on the investigations management page, **When** I scroll to the activity log section, **Then** I see a table of recent events with time, event description, and source
2. **Given** I have performed actions on investigations, **When** I view the activity log, **Then** I see entries for create, update, delete, and other investigation events
3. **Given** I am viewing the activity log, **When** I click "Clear", **Then** the activity log is cleared

---

### Edge Cases

- What happens when there are no investigations? System should display an empty state with a message and option to create a new investigation
- How does system handle network errors when fetching investigations? System should display error message and allow retry
- What happens when investigation creation fails? System should display error message and allow user to retry or cancel
- How does system handle concurrent updates to the same investigation? System should handle race conditions gracefully, showing latest state
- What happens when realtime updates disconnect? System should detect disconnection and allow manual refresh or reconnection
- How does system handle very long investigation names or descriptions? System should truncate with ellipsis and show full text on hover or in details view
- What happens when search returns no results? System should display "No results" message with option to clear filters
- How does system handle invalid JSON import? System should validate JSON format and display error message if invalid
- What happens when investigation deletion fails? System should display error message and keep investigation in list
- How does system handle investigation status transitions? System should validate status transitions and prevent invalid state changes

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a list of investigations in a card-based grid layout matching Olorin design system
- **FR-002**: System MUST support filtering investigations by status (pending, in-progress, completed, failed, archived)
- **FR-003**: System MUST support searching investigations by name or description
- **FR-004**: System MUST support tab-based filtering (All, My Items, In Progress, Completed, Failed, Archived)
- **FR-005**: System MUST allow users to create new investigations via a modal form
- **FR-006**: System MUST validate required fields (name, owner) before allowing investigation creation
- **FR-007**: System MUST support optional fields: description, sources (chips), tools (chips), risk model (dropdown), time range (datetime pickers), status (dropdown), auto-run toggle
- **FR-008**: System MUST integrate with backend API `/api/investigations` endpoints for CRUD operations
- **FR-009**: System MUST display investigation details in a drawer/sidebar when investigation card is clicked
- **FR-010**: System MUST show investigation phases with status indicators (pending, in-progress, completed) and progress bars
- **FR-011**: System MUST display investigation timeline showing phase start/end times
- **FR-012**: System MUST allow users to edit existing investigations via modal form
- **FR-013**: System MUST allow users to delete investigations with confirmation dialog
- **FR-014**: System MUST support replay functionality that creates a new investigation based on existing one
- **FR-015**: System MUST support exporting all investigations to JSON format
- **FR-016**: System MUST support importing investigations from JSON file
- **FR-017**: System MUST support real-time updates toggle for live investigation progress monitoring
- **FR-018**: System MUST display activity log showing investigation events with timestamps and source
- **FR-019**: System MUST match Olorin look and feel using Tailwind CSS classes and corporate design tokens
- **FR-020**: System MUST use dark theme with purple accent colors matching existing Olorin pages
- **FR-021**: System MUST be responsive and work on mobile, tablet, and desktop viewports
- **FR-022**: System MUST handle loading states with spinners and error states with error messages
- **FR-023**: System MUST add a card for Investigations Management in the root page (ShellHomePage) serviceLinks array
- **FR-024**: System MUST route to `/investigations-management` path for the new microservice
- **FR-025**: System MUST follow microservice architecture pattern similar to other services (rag-intelligence, visualization, reporting)
- **FR-026**: System MUST use shared components from `@shared/components` where applicable
- **FR-027**: System MUST integrate with backend WebSocket or polling for real-time updates
- **FR-028**: System MUST persist investigation state in backend database
- **FR-029**: System MUST support keyboard shortcuts: `/` for search focus, `N` for new investigation, `ESC` for close modals/drawers

### Key Entities *(include if feature involves data)*

- **Investigation**: Represents a fraud investigation case with attributes: id, name, owner, description, status, created timestamp, updated timestamp, risk model, sources (array), tools (array), from (datetime), to (datetime), progress (percentage), phases (array of phase objects)
- **Investigation Phase**: Represents a phase in investigation execution with attributes: name, status (pending/in-progress/completed/failed), percentage, started timestamp, ended timestamp, summary
- **Activity Log Entry**: Represents an event in the activity log with attributes: time (timestamp), text (event description), source (event source identifier)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view the investigations list and see at least 10 investigation cards rendered correctly within 2 seconds of page load
- **SC-002**: Users can create a new investigation by filling out the form and submitting, with the investigation appearing in the list within 3 seconds
- **SC-003**: Users can filter investigations by status and see filtered results update within 500ms
- **SC-004**: Users can search investigations and see search results update as they type (debounced, within 300ms)
- **SC-005**: Users can view investigation details in the drawer, with all phases and progress information displayed correctly
- **SC-006**: Backend API integration works end-to-end: create, read, update, delete operations succeed with proper error handling
- **SC-007**: Real-time updates work correctly: when enabled, investigation progress updates automatically without manual refresh
- **SC-008**: The investigations management card appears on the root page and navigates to the microservice correctly
- **SC-009**: The microservice matches Olorin design system: uses correct colors, spacing, typography, and component styles
- **SC-010**: The microservice is responsive: works correctly on mobile (320px+), tablet (768px+), and desktop (1024px+) viewports
- **SC-011**: Error handling works correctly: network errors, validation errors, and API errors display user-friendly error messages
- **SC-012**: Export/import functionality works: exported JSON can be imported back and investigations are restored correctly
- **SC-013**: Activity log displays events correctly with timestamps and source information, updates in real-time when enabled
- **SC-014**: All user interactions (click, hover, keyboard shortcuts) work as expected and provide visual feedback
