# Feature Specification: Extensive Investigation Report

**Feature Branch**: `001-extensive-investigation-report`
**Created**: 2025-01-11
**Status**: Draft
**Input**: User description: "extensive investigation report."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Comprehensive Investigation Report from Investigation Page (Priority: P1)

As a security analyst, I want to generate a comprehensive investigation report with one click from the investigation details page so that I can immediately review all findings, risk scores, agent reasoning, and evidence after an investigation completes.

**Why this priority**: This is the core value proposition - connecting investigation data to comprehensive reporting. Without this, users cannot access the 160KB of backend reporting infrastructure that already exists. This delivers immediate value and unlocks all downstream capabilities.

**Independent Test**: Can be fully tested by completing an investigation, clicking "Generate Report" button, and verifying that a comprehensive HTML report is generated with all 7 sections (Executive Summary, Risk Dashboard, LLM Timeline, Flow Graph, Agent Explanations, Tools Analysis, Journey Visualization) displaying correct data from the investigation folder.

**Acceptance Scenarios**:

1. **Given** I am viewing a completed investigation on the Investigation Details page, **When** I click the "Generate Report" button, **Then** the system triggers report generation and shows a loading indicator with progress percentage.

2. **Given** report generation is in progress, **When** the generation completes successfully, **Then** I receive a toast notification "Investigation report ready" with a "View Report" button that navigates to the report viewer.

3. **Given** an investigation report has been generated, **When** I view the report, **Then** I see all 7 report sections rendered with interactive visualizations (Chart.js charts, Mermaid diagrams), risk score progression, agent reasoning chains, and tool performance metrics.

4. **Given** I am viewing an investigation report, **When** I click "Export PDF", **Then** the report is converted to PDF format preserving all visualizations and formatting, and downloads to my device.

---

### User Story 2 - Browse Investigation Reports Library (Priority: P1)

As a security analyst, I want to browse all investigation reports in a searchable library so that I can review historical investigations, compare findings across cases, and reference past analysis for pattern identification.

**Why this priority**: Essential for audit trail and knowledge management. Security teams need to reference past investigations to identify fraud patterns and improve detection rules. Without a searchable library, reports are siloed and cannot be leveraged for continuous improvement.

**Independent Test**: Can be fully tested by generating multiple investigation reports (3-5 different scenarios), navigating to the Reports Microservice "Investigation Reports" tab, and verifying that all reports are listed with correct metadata (investigation ID, scenario, risk score, date), search functionality works, and filtering by risk level functions correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to the Reports Microservice, **When** I click the "Investigation Reports" tab, **Then** I see a list of all investigation reports with investigation ID, scenario type, final risk score, date, and status displayed in card format.

2. **Given** I am viewing the investigation reports library, **When** I use the search box to enter an investigation ID or entity ID, **Then** the list filters to show only reports matching the search criteria.

3. **Given** I am viewing the investigation reports library, **When** I filter by risk level (Critical: 80-100, High: 60-79, Medium: 40-59, Low: 0-39), **Then** only reports matching the selected risk level are displayed with appropriate color coding (red for critical, amber for high, cyan for medium, gray for low).

4. **Given** I select an investigation report from the library, **When** I click on the report card, **Then** the full comprehensive report opens in the report viewer with all 7 sections loaded and deep link URL updated to `/reports/investigation/{investigation_id}`.

---

### User Story 3 - View LLM Agent Reasoning and Thought Processes (Priority: P2)

As a security analyst, I want to see the detailed reasoning and thought processes of LLM agents in investigation reports so that I can understand how the AI arrived at its conclusions, validate the analysis logic, and trust the recommendations.

**Why this priority**: Transparency and explainability are critical for AI-driven fraud detection. Users must be able to inspect agent reasoning to validate conclusions before taking action. This builds trust in the AI system and enables users to learn from agent analysis patterns.

**Independent Test**: Can be fully tested by generating a report for an investigation that executed multiple agents (Device, Location, Network, Logs), opening the "Agent Explanations" section, and verifying that each agent's chain of thought is displayed including: question posed, evidence considered, reasoning steps, confidence level, and final conclusion with expandable details.

**Acceptance Scenarios**:

1. **Given** I am viewing an investigation report, **When** I navigate to the "Agent Explanations" section, **Then** I see a list of all agents executed with their chain of thought analysis including the question each agent was answering, evidence they considered, reasoning steps taken, and final conclusion with confidence score.

2. **Given** I am viewing agent explanations, **When** I click on a specific agent decision point, **Then** I see expanded details showing alternative scenarios the agent considered, risk factors that were weighted, and key insights that influenced the final decision.

3. **Given** I am viewing LLM reasoning, **When** I hover over a reasoning step, **Then** I see a tooltip displaying timestamp, agent name, token usage, and confidence score for that specific thought.

4. **Given** I am viewing the report, **When** I click "Show Full Thought Process", **Then** I see the complete unabridged chain of reasoning from all agents in chronological order with syntax-highlighted JSON data showing raw agent outputs.

---

### User Story 4 - Interactive Risk Score Analysis Dashboard (Priority: P2)

As a security analyst, I want to see risk score progression and category breakdown in the investigation report so that I can understand how the risk level evolved throughout the investigation and what specific factors contributed to the final risk score.

**Why this priority**: Risk scoring is the primary output of fraud investigations. Users need detailed visualization and explanation of risk scores to trust the assessment, explain decisions to stakeholders, and identify the most critical risk factors for remediation.

**Independent Test**: Can be fully tested by generating a report for an investigation with varying risk scores across phases, opening the "Risk Dashboard" section, and verifying that the line chart shows risk progression over time, radar chart displays category breakdowns (device, location, network, behavior), and clicking timeline points reveals details about agent activity and risk factor changes.

**Acceptance Scenarios**:

1. **Given** I am viewing an investigation report, **When** I navigate to the "Risk Dashboard" section, **Then** I see a line chart showing risk score progression over the investigation timeline with markers indicating when each agent executed and how the score changed.

2. **Given** I am viewing the risk dashboard, **When** I look at the risk categories breakdown, **Then** I see a radar chart displaying scores across all risk categories (device risk, location risk, network risk, behavioral risk) with confidence indicators for each category.

3. **Given** I am viewing risk progression, **When** I click on a point in the timeline, **Then** I see detailed information about what happened at that moment: which agent executed, what evidence was found, which risk factors were identified, and the reasoning behind the score change.

4. **Given** I am viewing the final risk score, **When** I see the score badge (e.g., 85/100 - Critical), **Then** the color coding matches the Olorin design system (Critical: red 80-100, High: amber 60-79, Medium: cyan 40-59, Low: gray 0-39) and is consistent across all report sections.

---

### User Story 5 - Agent and Tool Performance Metrics (Priority: P3)

As a security operations manager, I want to see agent and tool performance metrics in investigation reports so that I can evaluate detection effectiveness, identify underperforming tools, and optimize the investigation workflow for better accuracy and speed.

**Why this priority**: Operational excellence and continuous improvement. Managers need performance data to make informed decisions about agent configurations, tool selection, and resource allocation. This enables data-driven optimization of the fraud detection system.

**Independent Test**: Can be fully tested by generating a report, opening the "Tools Analysis" section, and verifying that tables show tool name, execution count, success rate, average duration, and errors; bar charts compare tool execution times; and a "Export Metrics" button downloads CSV data for further analysis.

**Acceptance Scenarios**:

1. **Given** I am viewing an investigation report, **When** I navigate to the "Tools Analysis" section, **Then** I see tables displaying for each tool: tool name, execution count, success rate percentage, average duration in milliseconds, and number of errors encountered.

2. **Given** I am viewing tools analysis, **When** I look at the performance charts, **Then** I see horizontal bar charts comparing tool execution times and success rates across all tools used in the investigation.

3. **Given** I am viewing agent metrics, **When** I examine the agent timeline, **Then** I can identify which agents contributed most significantly to the final risk score and which agents took the longest to execute.

4. **Given** I am viewing performance data, **When** I click the "Export Metrics" button, **Then** I receive a CSV file containing detailed performance data for all agents and tools including execution times, success rates, error logs, and token usage for further analysis in spreadsheet applications.

---

### User Story 6 - Automatic Report Generation on Investigation Completion (Priority: P3)

As a security analyst, I want investigation reports to be automatically generated when investigations complete successfully so that I don't have to manually trigger report generation and can immediately review findings without additional steps.

**Why this priority**: Workflow efficiency and consistency. Automatic generation ensures every investigation has a report and eliminates manual steps from the analyst workflow. This reduces friction and ensures reports are always available for compliance and audit purposes.

**Independent Test**: Can be fully tested by running a complete investigation from start to finish, verifying that when the investigation status changes to "Completed", a report generation job is automatically triggered in the background, and a WebSocket notification is received when the report is ready with a link to view it.

**Acceptance Scenarios**:

1. **Given** an investigation is running and reaches completion, **When** the investigation status changes to "Completed", **Then** the system automatically triggers comprehensive report generation using the investigation folder data without requiring manual user action.

2. **Given** a report is being auto-generated, **When** I view the investigation details page, **Then** I see a loading indicator displaying "Generating comprehensive report..." with a progress percentage that updates in real-time via WebSocket connection.

3. **Given** automatic report generation completes successfully, **When** the report is ready, **Then** I receive a toast notification with the message "Investigation report ready" and a "View Report" button that navigates directly to the newly generated report.

4. **Given** automatic report generation fails due to an error, **When** the failure occurs, **Then** I see an error message with specific details about what went wrong and a "Retry" button to manually trigger report generation again.

---

### Edge Cases

- **What happens when an investigation folder is missing required files?**
  The system should generate a partial report with available data and display a warning banner indicating which sections could not be rendered due to missing data files. The report should still be saveable and viewable with whatever data is available.

- **How does the system handle extremely large investigations (1000+ activities)?**
  The report generation should use pagination and lazy loading for large datasets. The Executive Summary and Risk Dashboard load first, while detailed sections (Agent Explanations, Tools Analysis) load on demand when the user scrolls to those sections.

- **What happens if report generation times out or takes longer than expected?**
  The background job system should implement timeout handling (configurable via `REPORT_GENERATION_TIMEOUT_SECONDS`). If generation exceeds the timeout, the job is marked as failed and the user receives a notification with option to retry. The job queue should automatically retry up to 3 times with exponential backoff before final failure.

- **How does the system handle concurrent report generation requests for the same investigation?**
  The system should implement idempotency checks to prevent duplicate report generation. If a report generation job is already in progress or a report already exists for an investigation, subsequent generation requests should either return the existing report or queue behind the in-progress job.

- **What happens when PDF export fails due to browser incompatibility or library errors?**
  The system should provide multiple export options: browser-based print (CSS-optimized), server-side PDF generation (weasyprint or wkhtmltopdf), and raw HTML download. If PDF generation fails, the user should see an error message explaining the issue and alternative export options.

- **How does the system handle malformed or corrupted investigation data?**
  Data validation should occur during extraction phase. If data is malformed, the system should log specific validation errors, attempt to continue with valid portions of data, and display validation warnings in the report header indicating which data points could not be processed.

## Requirements *(mandatory)*

### Functional Requirements

#### Core Report Generation (P1)

- **FR-001**: System MUST generate comprehensive investigation reports from investigation folder data including all 7 backend report components (Executive Summary, Risk Dashboard, LLM Timeline, Flow Graph, Agent Explanations, Tools Analysis, Journey Visualization).

- **FR-002**: System MUST extract investigation data from the standard folder structure: `{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/` containing metadata.json, structured_activities.jsonl, journey_tracking.json, agent_outputs/, risk_assessment.json, evidence_collection.json, and performance_metrics.json.

- **FR-003**: System MUST include risk score data in reports: final score (0-100), risk progression over time with timestamps, category breakdown (device, location, network, behavioral), and confidence levels for each score.

- **FR-004**: System MUST include LLM thought processes in reports: complete chain of reasoning for each agent, evidence assessment details, decision explanations with reasoning steps, and confidence scores for each conclusion.

- **FR-005**: System MUST include agent analysis in reports: list of agents executed with execution order, findings and recommendations from each agent, performance metrics (execution time, token usage, success rate), and risk contribution per agent.

- **FR-006**: System MUST include investigation metadata in reports: investigation ID, scenario type (account_takeover, device_spoofing, etc.), entity details (ID and type), investigation duration in seconds, investigation status, and mode (LIVE/MOCK/DEMO).

- **FR-007**: System MUST generate reports in HTML format with embedded interactive visualizations using Chart.js for charts (line, bar, radar), Mermaid.js for flow diagrams and timelines, collapsible sections for navigation, and syntax-highlighted code blocks.

- **FR-008**: System MUST support PDF export of reports via browser print functionality with print-optimized CSS stylesheet, or backend PDF generation library (weasyprint or wkhtmltopdf), maintaining visual fidelity of charts and diagrams.

- **FR-009**: System MUST persist generated reports to database using three tables: investigation_reports (main report metadata and HTML content), investigation_report_sections (individual section data for lazy loading), and report_generation_jobs (background job tracking).

- **FR-010**: System MUST support regenerating reports from the same investigation folder (idempotent operation) allowing users to regenerate if report template improves or if initial generation failed.

#### Frontend Integration (P1)

- **FR-011**: System MUST add "Investigation Reports" tab to Reports Microservice UI located in the main navigation alongside existing "Reports" tab, using Olorin corporate colors and Tailwind CSS styling.

- **FR-012**: System MUST display investigation reports library with list view showing: investigation ID as primary identifier, scenario type with icon, risk score with color-coded badge (Critical: red, High: amber, Medium: cyan, Low: gray), generation date in relative format (e.g., "2 hours ago"), and status indicator (ready, generating, failed).

- **FR-013**: System MUST support search and filtering in investigation reports library by: investigation ID (exact or partial match), entity ID (email, user ID, device ID), scenario type (dropdown with all available scenarios), risk score range (slider with min/max 0-100), risk level (checkboxes for Low/Medium/High/Critical), and date range (date picker for start/end dates).

- **FR-014**: System MUST provide "Generate Report" button on investigation details page located in the header actions area next to "Export" and "Share" buttons, disabled state when investigation is not completed, loading state with spinner during generation.

- **FR-015**: System MUST show report generation progress with loading indicator displaying "Generating report..." message, progress percentage (0-100%) updated via WebSocket, current step description (e.g., "Extracting agent data...", "Rendering visualizations..."), and estimated time remaining based on investigation size.

- **FR-016**: System MUST display comprehensive reports in viewer with all 7 components rendered in order: Executive Summary (always visible at top), Risk Dashboard (with interactive charts), LLM Timeline (with token usage graphs), Investigation Flow Graph (Mermaid diagram), Agent Explanations (expandable per agent), Tools Analysis (sortable tables and charts), Journey Visualization (progress timeline).

- **FR-017**: System MUST support deep linking to investigation reports via URL pattern `/reports/investigation/{investigation_id}` allowing users to bookmark and share direct links to specific reports.

- **FR-018**: System MUST integrate with existing Reports Microservice authentication and permissions checking that user has permission to view investigation before showing report, using same JWT token authentication as other API endpoints, and inheriting user's organization and role-based access controls.

- **FR-019**: System MUST show toast notifications for report generation events: success ("Investigation report ready" with "View Report" CTA), failure ("Report generation failed: [error message]" with "Retry" CTA), and progress updates every 25% ("Report 25% complete...", "Report 50% complete...").

- **FR-020**: System MUST support "Export PDF" button in report viewer header that triggers PDF conversion via browser print dialog with print-optimized stylesheet applied, or backend PDF generation API endpoint with download link returned.

#### Report Viewer Components (P2)

- **FR-021**: System MUST render Executive Summary section with key metrics displayed in stat cards: investigation ID with copy button, scenario type with descriptive label, final risk score with large color-coded badge, investigation duration formatted (e.g., "45.7 seconds"), agents used (count with names on hover), tools executed (count with list on hover), evidence points collected (count with breakdown), and recommendations list (bulleted with priority icons).

- **FR-022**: System MUST render Risk Dashboard section with interactive visualizations: risk score progression line chart (Chart.js) showing score changes over time with agent execution markers, risk category radar chart showing scores across device/location/network/behavior with confidence shading, confidence indicators displayed as percentage bars for each category, and severity color coding matching Olorin design system (Critical: #EF4444 red, High: #F59E0B amber, Medium: #06B6D4 cyan, Low: #6B7280 gray).

- **FR-023**: System MUST render LLM Timeline section showing token usage and agent activity: line chart of cumulative token usage over investigation timeline with color-coded by agent, bar chart of tokens per agent with total tokens displayed, agent activity timeline showing when each agent executed with duration bars, and token cost estimation if pricing data available from configuration.

- **FR-024**: System MUST render Investigation Flow Graph with Mermaid.js diagrams showing phase transitions: investigation lifecycle flow (Initiated → Investigation → Analysis → Completion), agent execution sequence with conditional branches, decision points highlighted with diamond shapes, and error/retry paths shown in red.

- **FR-025**: System MUST render Agent Explanations section with chain of thought analysis: expandable card per agent with agent name and execution time in header, reasoning steps displayed as numbered list with evidence used for each step, confidence levels shown as progress bars per step, alternative scenarios considered shown in accordion (if available), and key insights highlighted in callout boxes.

- **FR-026**: System MUST render Tools Analysis section with usage patterns and metrics: sortable table of tools with columns (Tool Name, Execution Count, Success Rate %, Avg Duration ms, Errors), horizontal bar chart comparing tool execution times, stacked bar chart showing success vs. failure rates per tool, error details table showing error messages and counts for failed executions, and CSV export button for performance data.

- **FR-027**: System MUST render Journey Visualization section with progress tracking: horizontal timeline showing investigation phases with completion indicators, milestone markers for key events (agent completion, risk threshold crossed), phase completion percentages displayed as progress bars, and current phase highlighted with pulse animation if investigation is in progress.

- **FR-028**: System MUST support collapsible sections in report viewer with chevron icons to expand/collapse each section, "Collapse All" / "Expand All" buttons in report header, section state persisted in localStorage per user, and smooth scroll animation when expanding sections.

- **FR-029**: System MUST support print stylesheet that optimizes report layout for PDF generation: hiding interactive elements (buttons, tooltips) in print view, ensuring charts and diagrams fit on pages without cutting off, using print-friendly colors (no dark backgrounds), adding page breaks between major sections, and including report header/footer on each page with page numbers.

- **FR-030**: System MUST support dark/light theme toggle in report viewer matching Olorin design system: theme toggle button in report header, theme preference persisted in localStorage, smooth transition animation between themes (0.3s), and all charts/diagrams updating colors to match selected theme.

#### Automatic Report Generation (P3)

- **FR-031**: System MUST automatically trigger report generation when investigation status changes to "Completed" by listening for `investigation.completed` event on event bus and creating a background job with trigger_type="automatic".

- **FR-032**: System MUST use background job queue for report generation to avoid blocking investigation completion: asynchronous job processing with asyncio or Celery, job queuing with status tracking (queued, processing, completed, failed), and maximum concurrent jobs configurable via `MAX_CONCURRENT_REPORT_JOBS` environment variable.

- **FR-033**: System MUST retry failed report generation up to 3 times with exponential backoff: first retry after 30 seconds, second retry after 2 minutes, third retry after 10 minutes, and final failure notification if all retries exhausted.

- **FR-034**: System MUST send WebSocket notification when automatic report generation completes: notification message type "investigation_report_ready" with investigation_id and report_id in payload, notification received by investigation details page and reports library, and auto-refresh of investigation details page to show "View Report" button.

- **FR-035**: System MUST log report generation events for audit trail: generation requested (timestamp, user, investigation_id), generation started (timestamp, job_id, trigger_type), progress updates (timestamp, job_id, percentage, current_step), generation completed (timestamp, job_id, report_id, duration_seconds, file_size_bytes), and generation failed (timestamp, job_id, error_message, retry_count).

#### Performance & Optimization (P3)

- **FR-036**: System MUST cache generated reports to avoid re-processing investigation folder data: reports cached in database with html_content and metadata, cache invalidation only on explicit regeneration request, cache hit rate tracked in metrics, and cache size monitored with alerting if exceeds threshold.

- **FR-037**: System MUST support incremental report generation by generating sections independently and combining: each section generated as separate InvestigationReportSection record, sections can be generated in parallel for performance, sections combined into final HTML report with template rendering, and individual sections can be regenerated without regenerating entire report.

- **FR-038**: System MUST load investigation reports within 3 seconds for typical investigation size (100 activities): backend API response time < 1 second for report retrieval, frontend rendering time < 2 seconds for HTML parsing and chart initialization, lazy loading of images and large data sections, and performance monitoring with alerting if thresholds exceeded.

- **FR-039**: System MUST support lazy loading of report sections to improve initial page load time: initial load includes only Executive Summary and Risk Dashboard (above fold), remaining sections loaded on scroll with Intersection Observer API, loading indicators displayed while sections are being fetched, and section data fetched from `/api/v1/reports/investigations/{id}/sections/{section_type}` endpoint.

- **FR-040**: System MUST compress large reports (>5MB) before storing in database: HTML compression using gzip algorithm, compression enabled via `REPORT_COMPRESSION_ENABLED` environment variable, compression ratio logged for monitoring, and automatic decompression on retrieval transparent to frontend.

### Key Entities

- **InvestigationReport**: Represents a comprehensive investigation report generated from investigation folder data. Key attributes include: id (UUID), investigation_id (link to source investigation), investigation_folder (path to folder), title (auto-generated or custom), status (draft/generating/ready/failed), html_content (full HTML report), metadata (JSON with scenario, entity, mode), risk_score (0-100 final score), risk_level (low/medium/high/critical), agents_count (number of agents executed), tools_count (number of tools used), evidence_count (number of evidence points), duration_seconds (investigation duration), owner (user who created), generated_at (timestamp), generated_by (user or "system"), file_size_bytes (HTML content size), pdf_url (optional PDF download link). Relationships: belongs to Investigation, has many ReportGenerationJobs, has many InvestigationReportSections.

- **InvestigationReportSection**: Represents individual sections within an investigation report for lazy loading and granular access. Key attributes include: id (UUID), report_id (parent report), section_type (enum: executive_summary, risk_dashboard, llm_timeline, flow_graph, explanations, tools_analysis, journey_visualization), section_title (display name), render_order (0-7 display sequence), content_html (section HTML), data_json (section data), is_rendered (completion flag), error_message (if section failed). Unique constraint: one section of each type per report. Relationships: belongs to InvestigationReport.

- **ReportGenerationJob**: Represents a background job for report generation with status and progress tracking. Key attributes include: id (UUID), investigation_id (source investigation), report_id (created report, nullable until complete), status (enum: queued, processing, completed, failed, cancelled), trigger_type (enum: manual, automatic, scheduled), triggered_by (user or "system"), progress_percentage (0-100), current_step (e.g., "Extracting agent data"), started_at (timestamp), completed_at (timestamp), error_message (if failed), retry_count (number of retry attempts), max_retries (3 default). State transitions enforced: queued → processing → completed/failed. Relationships: creates InvestigationReport when completed.

- **Investigation**: Existing entity that represents a fraud detection investigation. Enhanced with relationship to InvestigationReport for tracking which reports have been generated. Key attributes used for reports: investigation_id (unique identifier), scenario (type of fraud scenario), entity_id and entity_type (subject of investigation), status (investigation state), mode (LIVE/MOCK/DEMO), folder_path (location of investigation data). Relationships: has many InvestigationReports.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a comprehensive investigation report from an investigation in under 5 seconds including data extraction from investigation folder, HTML generation with all 7 sections, and database persistence.

- **SC-002**: Investigation reports library loads and displays 100+ reports with search and filtering functionality in under 2 seconds from page load to interactive state.

- **SC-003**: Report viewer renders all 7 sections with interactive visualizations (Chart.js charts, Mermaid diagrams) in under 3 seconds from navigation to fully interactive report.

- **SC-004**: PDF export completes within 10 seconds for typical investigation report size (~2MB HTML content with embedded visualizations).

- **SC-005**: Automatic report generation succeeds 95% or higher of the time for completed investigations with retry logic handling transient failures.

- **SC-006**: 90% of users successfully view an investigation report on their first attempt without needing support or documentation assistance, measured through user testing sessions.

- **SC-007**: Risk score visualizations are accurate and match investigation folder data 100% of the time with automated validation tests comparing rendered charts to source data.

- **SC-008**: LLM thought processes are complete and display all agent reasoning chains with proper formatting, syntax highlighting, and expandable details for every agent execution.

- **SC-009**: Report generation does not block investigation completion, with asynchronous processing ensuring investigation status changes to "Completed" before report generation begins.

- **SC-010**: Generated reports consume less than 10MB database storage per investigation on average with compression enabled reducing HTML content size by approximately 70%.

### User Experience Criteria

- **SC-011**: Report viewer is visually consistent with Olorin design system using exact corporate colors (dark purple/cyan/orange theme), Tailwind CSS components, and matching typography hierarchy from investigation pages.

- **SC-012**: Report sections are collapsible and navigable via table of contents with smooth scroll animation to sections, expand/collapse all buttons, and section state persisted in localStorage.

- **SC-013**: Visualizations are interactive with tooltips showing detailed data on hover, click-to-drill-down on charts where applicable (e.g., click risk timeline point to see details), and pan/zoom controls on large diagrams.

- **SC-014**: Reports are mobile-responsive for tablet viewing (desktop-primary design) with breakpoints at 768px (tablet) and 1024px (desktop), collapsible sidebar on mobile, and touch-optimized interactive elements.

- **SC-015**: PDF exports maintain visual fidelity and readability with all charts and diagrams rendered clearly, proper page breaks between sections, headers/footers on each page, and print-friendly color scheme (no dark backgrounds).

### Business Impact Criteria

- **SC-016**: 100% of completed investigations have associated reports generated either automatically or manually within 24 hours of completion.

- **SC-017**: Reports are accessible and viewable by authorized users within 5 minutes of generation completion via direct link, reports library, or investigation details page.

- **SC-018**: Zero critical report generation failures in production with retry logic successfully recovering from transient errors, comprehensive error logging for debugging, and alerting for persistent failures.

- **SC-019**: Stakeholders (compliance, management, clients) can review investigation insights independently without requiring analyst interpretation measured by reduced "report explanation" support requests.

- **SC-020**: Average time from investigation completion to stakeholder review of findings reduced by 75% compared to manual report creation process (baseline: 2 hours manual, target: 30 minutes automated).

---

**Specification Status**: Complete - Ready for Planning Phase
**Next Phase**: Run `/plan` to generate detailed implementation plan with tasks, dependencies, and timeline
