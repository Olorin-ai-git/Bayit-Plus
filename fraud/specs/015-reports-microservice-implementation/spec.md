# Feature Specification: Reports Microservice Implementation

**Feature Branch**: `001-reports-microservice-implementation`  
**Created**: 2025-01-09  
**Status**: Draft  
**Input**: User description: "reports microservice implementation. use /Users/gklainert/Documents/olorin/olorin-reports.html as a reference, create a fully functional reports microservice with a full ui and backend implementation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Browse Reports (Priority: P1)

As a security analyst, I want to view a list of all investigation reports so that I can quickly find and access relevant reports for my investigations.

**Why this priority**: This is the foundational capability - users must be able to see what reports exist before they can use any other features. Without this, the microservice has no value.

**Independent Test**: Can be fully tested by loading the reports dashboard and verifying that reports are displayed in a list with proper filtering and search functionality. Delivers immediate value by allowing users to discover existing reports.

**Acceptance Scenarios**:

1. **Given** I am logged into the Olorin platform, **When** I navigate to the Reports microservice, **Then** I see a list of all reports I have access to, displayed with title, owner, status, last updated date, and tags
2. **Given** I am viewing the reports list, **When** I type a search query in the search box, **Then** the list filters to show only reports whose title matches the query
3. **Given** I am viewing the reports list, **When** I select a status filter (Draft, Published, Archived), **Then** the list shows only reports with that status
4. **Given** I am viewing the reports list, **When** I click on a report item, **Then** the report viewer opens showing the full report content with formatted markdown

---

### User Story 2 - Create and Edit Reports (Priority: P1)

As a security analyst, I want to create new reports and edit existing ones using markdown so that I can document investigation findings and create executive summaries.

**Why this priority**: Report creation and editing are core workflows. Users need to be able to author content before they can publish or share it. This is essential for the microservice to be functional.

**Independent Test**: Can be fully tested by creating a new report, editing its markdown content, saving it, and verifying the changes persist. Delivers value by enabling users to document their investigations.

**Acceptance Scenarios**:

1. **Given** I am viewing the reports dashboard, **When** I click the "New Report" button, **Then** a new draft report is created with a default title and empty content, and the editor opens
2. **Given** I am editing a report, **When** I type markdown content in the editor, **Then** I can see the content being entered in real-time
3. **Given** I am editing a report, **When** I click "Save" or press Ctrl/Cmd+S, **Then** the report is saved to the backend and a success notification appears
4. **Given** I am editing a report, **When** I insert a widget template (KPI, Chart, Table), **Then** the widget placeholder is inserted into the markdown content at the cursor position
5. **Given** I am viewing a saved report, **When** I click "Edit", **Then** the editor opens with the current report content pre-populated

---

### User Story 3 - Publish and Manage Report Status (Priority: P2)

As a security analyst, I want to publish reports and manage their status (Draft, Published, Archived) so that I can control report visibility and lifecycle.

**Why this priority**: Status management enables workflow control and collaboration. While not required for basic functionality, it's essential for production use where reports need to be shared with stakeholders.

**Independent Test**: Can be fully tested by creating a draft report, publishing it, verifying status change, and then archiving it. Delivers value by enabling proper report lifecycle management.

**Acceptance Scenarios**:

1. **Given** I am viewing a draft report, **When** I click "Publish", **Then** the report status changes to "Published" and the updated timestamp is recorded
2. **Given** I am viewing a published report, **When** I click "Publish" again, **Then** the report status changes back to "Draft"
3. **Given** I am viewing a report, **When** I change its status to "Archived", **Then** the report is moved to archived status and filtered out of default views
4. **Given** I am viewing reports filtered by status, **When** I select "Archived" filter, **Then** only archived reports are displayed

---

### User Story 4 - View Reports with Dynamic Widgets (Priority: P2)

As a security analyst, I want to view reports with embedded KPIs, charts, and tables that pull data from investigations so that I can see visual summaries and metrics without manual data entry.

**Why this priority**: Dynamic widgets transform reports from static documents into interactive dashboards. This significantly increases the value of reports by automatically incorporating investigation data.

**Independent Test**: Can be fully tested by creating a report with widget placeholders, viewing it, and verifying that widgets render with actual investigation data. Delivers value by automating data visualization in reports.

**Acceptance Scenarios**:

1. **Given** I am viewing a report with KPI widgets ({{KPI total}}, {{KPI completed}}, {{KPI success}}), **When** the report loads, **Then** the widgets display actual investigation counts and success rates from the backend
2. **Given** I am viewing a report with chart widgets ({{CHART timeseries}}, {{CHART success}}, {{CHART hbar}}, {{HEATMAP}}), **When** the report loads, **Then** the charts render with SVG graphics showing investigation data trends
3. **Given** I am viewing a report with a table widget ({{TABLE recent}}), **When** the report loads, **Then** a table displays the 10 most recent investigations with name, owner, status, and updated date
4. **Given** I am viewing a report with widgets, **When** investigation data changes in the backend, **Then** widgets can be refreshed to show updated data [NEEDS CLARIFICATION: real-time updates vs manual refresh?]

---

### User Story 5 - Share and Export Reports (Priority: P3)

As a security analyst, I want to share reports via links and export them to various formats so that I can collaborate with team members and create deliverables for stakeholders.

**Why this priority**: Sharing and export capabilities enhance collaboration and enable reports to be used in external contexts. While valuable, these are not required for core functionality.

**Independent Test**: Can be fully tested by generating a shareable link for a report, copying it, and exporting a report to JSON format. Delivers value by enabling collaboration and data portability.

**Acceptance Scenarios**:

1. **Given** I am viewing a published report, **When** I click "Share", **Then** a shareable URL is copied to clipboard and a notification confirms the action
2. **Given** I have a shareable report link, **When** I open it in a new browser session, **Then** the report loads directly without requiring navigation through the dashboard
3. **Given** I am viewing the reports dashboard, **When** I click "Export JSON", **Then** a JSON file containing all reports is downloaded
4. **Given** I am viewing a report, **When** I click "Print/PDF", **Then** the browser print dialog opens with the report formatted for printing [NEEDS CLARIFICATION: PDF generation vs browser print?]

---

### User Story 6 - Navigate Reports with Table of Contents (Priority: P3)

As a security analyst, I want to see a table of contents for reports with multiple sections so that I can quickly navigate to specific parts of long reports.

**Why this priority**: Table of contents improves usability for longer reports but is not essential for basic functionality. It's a nice-to-have enhancement.

**Independent Test**: Can be fully tested by viewing a report with multiple headings, verifying that a table of contents is generated, and clicking links to navigate to sections. Delivers value by improving navigation in complex reports.

**Acceptance Scenarios**:

1. **Given** I am viewing a report with multiple headings (H1, H2, H3), **When** the report loads, **Then** a table of contents is automatically generated in the sidebar with links to all headings
2. **Given** I am viewing a report with a table of contents, **When** I click a heading link, **Then** the page scrolls to that section and the heading is highlighted
3. **Given** I am viewing a long report, **When** I scroll through the content, **Then** the table of contents highlights the current section based on scroll position

---

### Edge Cases

- What happens when a report has no content or empty markdown?
- How does the system handle malformed markdown syntax in report content?
- What happens when investigation data is unavailable for widget rendering (empty database, API errors)?
- How does the system handle concurrent edits to the same report by multiple users?
- What happens when a user tries to publish a report with unsaved changes?
- How does the system handle very long report titles or content (performance, UI overflow)?
- What happens when search returns zero results?
- How does the system handle special characters in report titles or tags?
- What happens when a user tries to delete a report that is currently being viewed?
- How does the system handle network failures during save operations (retry, offline mode)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create new reports with a unique identifier, title, owner, status, tags, created timestamp, and updated timestamp
- **FR-002**: System MUST persist reports to a backend database (not localStorage) with full CRUD operations
- **FR-003**: System MUST support markdown content editing with real-time preview capability
- **FR-004**: System MUST render markdown content as formatted HTML in the report viewer
- **FR-005**: System MUST support report status management with three states: Draft, Published, Archived
- **FR-006**: System MUST allow users to search reports by title with case-insensitive matching
- **FR-007**: System MUST allow users to filter reports by status (All, Draft, Published, Archived)
- **FR-008**: System MUST support tab-based filtering (All, My Reports, Drafts, Published, Archived)
- **FR-009**: System MUST support report tagging with multiple tags per report
- **FR-010**: System MUST generate and display a table of contents for reports with headings
- **FR-011**: System MUST support widget placeholders in markdown that render dynamic content: {{KPI total}}, {{KPI completed}}, {{KPI success}}, {{CHART timeseries}}, {{CHART success}}, {{CHART hbar}}, {{HEATMAP}}, {{TABLE recent}}
- **FR-012**: System MUST fetch investigation data from the backend to populate widget content
- **FR-013**: System MUST render KPI widgets displaying investigation statistics (total count, completed count, success rate percentage)
- **FR-014**: System MUST render chart widgets as SVG graphics: timeseries line chart, donut chart, horizontal bar chart, heatmap
- **FR-015**: System MUST render table widgets showing recent investigations with columns: name, owner, status, updated date
- **FR-016**: System MUST support keyboard shortcuts: "/" to focus search, "N" to create new report, "Ctrl/Cmd+S" to save while editing
- **FR-017**: System MUST support shareable report links with deep linking (URL hash parameter #rid=reportId)
- **FR-018**: System MUST support exporting all reports as JSON format
- **FR-019**: System MUST support print/PDF functionality for reports
- **FR-020**: System MUST display report metadata: owner, status, created date, updated date
- **FR-021**: System MUST implement a dark mode UI consistent with the reference design (background: #0b0b12, panels: #11111a, primary color: #8b5cf6)
- **FR-022**: System MUST provide a responsive layout that adapts to mobile screens (grid collapses to single column on small screens)
- **FR-023**: System MUST show loading states during data fetching operations
- **FR-024**: System MUST show error states with user-friendly messages when operations fail
- **FR-025**: System MUST implement toast notifications for user actions (save, publish, share, export)
- **FR-026**: System MUST validate report content before saving (prevent empty titles, validate markdown syntax) [NEEDS CLARIFICATION: strict validation vs permissive?]
- **FR-027**: System MUST support widget insertion templates in the editor (quick insert buttons for common widgets)
- **FR-028**: System MUST track report ownership (creator) and display owner information
- **FR-029**: System MUST update the "updated" timestamp whenever a report is modified
- **FR-030**: System MUST implement proper authentication and authorization (users can only edit their own reports or reports they have permission for) [NEEDS CLARIFICATION: permission model details?]

### Key Entities *(include if feature involves data)*

- **Report**: Represents an investigation report document. Key attributes: id (UUID), title (string), owner (string/user ID), status (enum: Draft/Published/Archived), tags (array of strings), content (markdown string), created (ISO datetime), updated (ISO datetime). Relationships: belongs to owner (User), references investigations (for widget data).

- **ReportWidget**: Represents a dynamic content placeholder in a report. Key attributes: type (enum: KPI/Chart/Table), subtype (string, e.g., "timeseries", "total"), position (offset in markdown content). Relationships: embedded in Report content.

- **Investigation**: External entity referenced by reports for widget data. Key attributes: id, name, owner, status, created, updated, sources, tools, progress. Relationships: referenced by Report widgets for data visualization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new report and save it successfully in under 5 seconds (including network round-trip)
- **SC-002**: Report list loads and displays 100+ reports with filtering/search in under 2 seconds
- **SC-003**: Markdown editor responds to user input with no perceptible lag (<100ms render time)
- **SC-004**: Widget rendering completes within 3 seconds of report load (including data fetch from backend)
- **SC-005**: 95% of users successfully create and publish a report on their first attempt without help documentation
- **SC-006**: System handles 50+ concurrent users viewing/editing reports without performance degradation
- **SC-007**: Report search returns results in under 500ms for queries against 1000+ reports
- **SC-008**: Zero data loss - 100% of report saves persist correctly to backend database
- **SC-009**: Shareable report links successfully load reports in new sessions 100% of the time
- **SC-010**: Report export generates valid JSON files for all reports without errors
