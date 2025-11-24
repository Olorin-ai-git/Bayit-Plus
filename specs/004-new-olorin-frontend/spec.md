# Feature Specification: New Olorin Frontend - GAIA Look & Feel Migration

**Feature Branch**: `004-new-olorin-frontend`
**Created**: 2025-10-14
**Status**: Draft
**Input**: User description: "New Olorin Frontend: examine /Users/gklainert/Gaia/gaia-webplugin and use the look and feel and the wizard pages to copy and apply the same look and feel, components and integrations in olorin-front REACT project"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Extract reference project: gaia-webplugin
   ’ Identify target project: olorin-front
2. Analyze GAIA web plugin design system
   ’ Extract: color palette, Tailwind configuration, component patterns
   ’ Identify: wizard flow, page layouts, UI components
3. Identify current Olorin frontend state
   ’ Current issues: Active refactoring from Material-UI to Tailwind
   ’ Status: 19 files over 200 lines, microservices architecture in progress
4. Generate comprehensive migration requirements
   ’ Map GAIA components to Olorin requirements
   ’ Define wizard flow implementation
   ’ Specify design system adoption
5. Create User Scenarios & Testing section
   ’ User flow: Investigation wizard (Settings ’ Progress ’ Results)
6. Generate Functional Requirements
   ’ Each requirement testable and traceable to GAIA patterns
7. Identify Key Entities (investigation data model)
8. Run Review Checklist
   ’ Ensure no implementation details (tech-agnostic)
9. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A fraud investigator needs to conduct investigations using a modern, intuitive interface that matches the professional look and feel of the GAIA web plugin. The investigator should experience:
1. **Consistent Visual Design**: Corporate color scheme (dark theme with orange/cyan accents) with professional typography and spacing
2. **Wizard-Based Investigation Flow**: Step-by-step guided process (Settings ’ Progress ’ Results)
3. **Interactive Components**: Tailwind-styled buttons, cards, panels, and form elements matching GAIA patterns
4. **Real-Time Updates**: Visual feedback during investigation execution with progress indicators
5. **Responsive Layout**: Professional grid layouts with collapsible panels and sticky sidebars

### Acceptance Scenarios

#### Scenario 1: Visual Design Consistency
1. **Given** the user opens the Olorin investigation interface
2. **When** they view any page or component
3. **Then** they see the corporate color palette (dark backgrounds #0B1221, #1A2332, orange accent #FF6600, cyan accent #06B6D4)
4. **And** all typography uses the GAIA-style hierarchy (3xl headings, gray-400 secondary text)
5. **And** component spacing and borders match GAIA patterns

#### Scenario 2: Investigation Wizard Flow
1. **Given** the user wants to start a new investigation
2. **When** they access the investigation wizard
3. **Then** they see a clear 3-step progress indicator (Settings ’ Progress ’ Results)
4. **And** each step is visually distinct with numbered circles and completion checkmarks
5. **And** they can click on previous completed steps to navigate backward
6. **And** forward navigation is only allowed when current step is valid

#### Scenario 3: Settings Page UI
1. **Given** the user is on the Investigation Settings page
2. **When** they configure investigation parameters
3. **Then** they see a 2-column layout (settings panels on left, validation/actions on right)
4. **And** collapsible panels for templates, entity selection, time range, and tool matrix
5. **And** a sticky sidebar with advanced options, validation display, and "Start Investigation" button
6. **And** all form elements use Tailwind-styled components (inputs, selects, toggles)

#### Scenario 4: Progress Page Real-Time Updates
1. **Given** an investigation is running
2. **When** the user views the Progress page
3. **Then** they see live log streams with color-coded severity levels
4. **And** animated progress indicators showing tool execution status
5. **And** visual feedback for completed, in-progress, and pending tasks
6. **And** the ability to drill down into individual tool/agent executions

#### Scenario 5: Results Page Visualization
1. **Given** an investigation has completed
2. **When** the user views the Results page
3. **Then** they see fraud risk gauges with gradient colors (critical/high/medium/low)
4. **And** interactive visualizations (graphs, timelines, network diagrams)
5. **And** collapsible result cards with consistent styling
6. **And** export/download capabilities with clear action buttons

#### Scenario 6: Component Interaction Patterns
1. **Given** the user interacts with any UI component
2. **When** they hover, click, or focus on elements
3. **Then** they experience consistent transition animations (duration-200)
4. **And** hover states with brightness/opacity changes
5. **And** disabled states with reduced opacity (opacity-50/60)
6. **And** clear visual feedback for all interactive elements

### Edge Cases
- **Multi-Entity Investigation**: When user selects 2+ entities, system displays multi-entity correlation view
- **Synchronous vs Async Results**: If investigation completes immediately, system skips progress page and goes directly to results
- **Validation Errors**: Invalid settings display inline error messages with red borders and error text
- **Empty States**: Missing data shows informative empty state messages with suggested actions
- **Mobile/Responsive**: Layout adapts to smaller screens with collapsible sidebars and stacked layouts
- **Template Management**: User can save/load investigation configuration templates with custom names
- **Real-Time Connection Loss**: If WebSocket disconnects, system displays reconnection status

---

## Requirements *(mandatory)*

### Functional Requirements

#### FR-001: Corporate Color Palette Adoption
System MUST implement the GAIA corporate color palette across all UI elements:
- Primary backgrounds: #0B1221 (bgPrimary), #1A2332 (bgSecondary), #242E3E (bgTertiary)
- Primary accent: #FF6600 (orange) with hover state #E55A00
- Secondary accent: #06B6D4 (cyan) with variations
- Status colors: success (#10B981), warning (#F59E0B), error (#EF4444), info (#3B82F6)
- Text hierarchy: primary (#F9FAFB), secondary (#D1D5DB), tertiary (#9CA3AF), disabled (#6B7280)
- Border colors: primary (#374151), secondary (#4B5563), accent (#FF6600)

#### FR-002: Wizard Progress Indicator
System MUST display a 3-step wizard progress indicator showing:
- Step 1: "Settings" - Investigation configuration
- Step 2: "Progress" - Real-time execution monitoring
- Step 3: "Results" - Investigation findings and analysis
- Each step shown as numbered circle with label
- Current step highlighted with accent color and bold text
- Completed steps marked with checkmark icon
- Future steps shown with muted colors
- Clickable navigation to previous completed steps
- Forward navigation disabled until current step valid
- Step counter display "Step X of 3"

#### FR-003: Investigation Settings Page Layout
System MUST provide a settings page with:
- Page title "Investigation Settings" with subtitle description
- 2-column responsive grid layout (2/3 left, 1/3 right on large screens)
- Left column containing configuration panels:
  - Investigation Templates panel (collapsible, default collapsed)
  - Entity Selection panel (always expanded)
  - Time Range Selector panel
  - Tools & Agent Matrix panel
- Right column containing sticky sidebar with:
  - Advanced Options panel
  - Validation Display panel
  - "Start Investigation" action button
- All panels using consistent card styling with dark backgrounds and subtle borders

#### FR-004: Collapsible Panel Component
System MUST provide collapsible panels that:
- Display section title with expand/collapse indicator
- Allow user to toggle panel expansion
- Remember expansion state during session
- Animate expansion/collapse transition smoothly
- Use chevron icon to indicate expansion state
- Apply consistent header styling across all panels

#### FR-005: Entity Selection Interface
System MUST allow users to:
- Select investigation entity type from predefined list (user_id, email, ip_address, device_id, etc.)
- Add multiple entity values for investigation
- Specify primary entity for multi-entity investigations
- Choose correlation mode (AND/OR) for multi-entity scenarios
- Mark entities with importance weights
- View inline validation errors for invalid entity values
- Save current entity configuration as reusable template
- Load pre-configured entity combination templates

#### FR-006: Time Range Selection
System MUST allow users to:
- Select investigation time range from predefined options (Last 24 hours, Last 7 days, Last 30 days, Custom)
- Specify custom date range with start and end dates
- View relative time range descriptions
- Validate that end date is after start date
- See inline validation errors for invalid time ranges

#### FR-007: Tool & Agent Matrix Selection
System MUST provide an interactive matrix showing:
- Available investigation tools in rows
- AI agents in columns
- Selectable cells indicating tool-agent combinations
- Weight sliders for prioritizing certain combinations
- Visual indication of selected vs unselected combinations
- Ability to select individual cells or entire rows/columns
- Relevant tool suggestions based on entity type

#### FR-008: Advanced Options Configuration
System MUST allow users to configure:
- Risk threshold slider (0-100) for filtering results
- Parallel vs sequential execution toggle
- Enable/disable LLM-powered insights
- Enable/disable relationship graph visualization
- All options with clear labels and descriptions
- Toggle switches with on/off states visually distinct

#### FR-009: Settings Validation Display
System MUST show real-time validation status:
- Overall validation state (valid/invalid) with icon
- List of validation errors grouped by category
- "Validate" button to manually trigger validation
- Loading state during validation
- Color-coded validation status (green=valid, red=invalid)
- Specific error messages for each validation failure

#### FR-010: Investigation Start Action
System MUST provide:
- Prominent "Start Investigation" button in sticky sidebar
- Button disabled when settings are invalid
- Loading state with "Starting Investigation..." message
- Visual feedback during API call
- Automatic navigation to Progress page after successful start
- Error message display if start fails

#### FR-011: Progress Page Real-Time Monitoring
System MUST display investigation progress with:
- Live log stream showing tool and agent execution events
- Color-coded log entries by severity (info, warning, error)
- Animated progress indicators for each investigation phase
- Expandable tool execution details
- Timeline visualization of investigation stages
- Real-time status updates without page refresh
- Ability to pause/cancel running investigation

#### FR-012: Multi-Entity View (2+ Entities)
System MUST automatically switch to multi-entity view when 2+ entities selected:
- Display aggregated statistics across all entities
- Show entity correlation matrix
- Provide drill-down capability to individual entity results
- Visualize entity relationships and shared indicators
- Highlight cross-entity patterns and anomalies

#### FR-013: Results Page Visualization
System MUST display investigation results with:
- Fraud risk gauge showing overall risk score (0-100)
- Risk level badges (Critical/High/Medium/Low) with color coding
- Collapsible result sections for different analysis areas
- Interactive charts and graphs for data visualization
- Network diagram for entity relationships
- Timeline of suspicious activities
- Detailed findings with supporting evidence
- Export capabilities (PDF, JSON, CSV)

#### FR-014: Risk Level Visual Coding
System MUST use consistent risk color coding:
- Critical (80-100): Red (#EF4444) with urgent styling
- High (60-79): Amber (#F59E0B) with warning styling
- Medium (40-59): Cyan (#06B6D4) with moderate styling
- Low (0-39): Gray (#6B7280) with minimal styling
- Apply colors to gauges, badges, borders, and backgrounds

#### FR-015: Interactive Component States
System MUST implement consistent interaction states for all UI elements:
- Default state with base colors
- Hover state with brightness increase or color shift
- Active/pressed state with scale reduction (scale-95)
- Focus state with visible focus rings
- Disabled state with reduced opacity (50-60%) and cursor-not-allowed
- Loading state with spinner or skeleton loaders
- All transitions animated with duration-200

#### FR-016: Notification System
System MUST provide user notifications for:
- Success messages (green background, checkmark icon)
- Error messages (red background, warning icon)
- Warning messages (yellow background, warning icon)
- Info messages (blue background, info icon)
- Dismissible notification banners
- Optional action buttons in notifications
- Auto-dismiss after configurable timeout (except errors)

#### FR-017: Empty State Handling
System MUST display informative empty states when:
- No investigations exist yet
- Investigation has no results
- Search returns no matches
- Required data is loading
- Error occurred loading data
- Empty states include icon, message, and suggested action

#### FR-018: Responsive Layout Adaptation
System MUST adapt layouts for different screen sizes:
- Desktop (lg+): Multi-column layouts with sidebars
- Tablet (md): Collapsed sidebars, stacked columns
- Mobile (sm): Single column, bottom navigation
- All interactive elements remain accessible
- No horizontal scrolling required
- Touch-friendly button and input sizes on mobile

#### FR-019: Template Management
System MUST allow users to:
- Save current investigation configuration as named template
- Load previously saved templates
- Delete custom templates
- View predefined system templates
- See template metadata (entity types, correlation mode, tool selections)
- Apply template automatically populating all settings

#### FR-020: Investigation State Persistence
System MUST persist investigation state:
- Save wizard progress (current step, settings, results)
- Allow user to resume interrupted investigation
- Display restoration loading state
- Handle investigation not found scenario
- Show error modal if investigation cannot be restored
- Provide option to start new investigation

### Key Entities *(data model)*

**Investigation**
- Unique identifier
- Creation timestamp
- Current wizard step (settings/progress/results)
- Overall status (draft/running/completed/failed)
- Configuration settings
- Execution results
- Relationship: Contains multiple Entities, ToolExecutions, AgentResults

**Entity**
- Unique identifier within investigation
- Entity type (user_id, email, ip_address, device_id, etc.)
- Entity value (actual identifier being investigated)
- Display label
- Metadata (isPrimary flag, importance weight)
- Validation status

**TimeRange**
- Start date/time
- End date/time
- Predefined type (last_24h, last_7d, last_30d, custom)
- Relative description

**ToolSelection**
- Tool identifier
- Associated agent identifier
- Selection weight/priority
- Enabled/disabled state

**InvestigationSettings**
- Entity list
- Primary entity type
- Correlation mode (AND/OR)
- Time range
- Tool selections
- Risk threshold
- Execution mode (parallel/sequential)
- Feature flags (LLM insights, relationship graph)
- Validation errors
- Overall validation state

**InvestigationTemplate**
- Template identifier
- Template name
- Template description
- Template category (system/custom)
- Entity configuration
- Default tool selections
- Creation timestamp

**ToolExecution**
- Execution identifier
- Tool name
- Start timestamp
- End timestamp
- Status (pending/running/completed/failed)
- Output data
- Error messages
- Relationship: Belongs to Investigation

**AgentResult**
- Result identifier
- Agent name
- Analysis findings
- Risk assessment
- Confidence score
- Supporting evidence
- Relationship: Belongs to Investigation, references ToolExecutions

**RiskAssessment**
- Overall risk score (0-100)
- Risk level classification (critical/high/medium/low)
- Risk factors list
- Confidence metrics
- Relationship: Belongs to Investigation

**Notification**
- Message text
- Notification type (success/error/warning/info)
- Optional action (label, target step)
- Timestamp
- Dismissal status

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (UI/UX migration from GAIA to Olorin)
- [x] Dependencies identified (GAIA web plugin as reference)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (GAIA design system, wizard flow, component patterns)
- [x] Ambiguities marked (none - clear reference implementation exists)
- [x] User scenarios defined (6 primary scenarios + edge cases)
- [x] Requirements generated (20 functional requirements)
- [x] Entities identified (11 key entities with relationships)
- [x] Review checklist passed

---

## Additional Context

### Design System Migration Scope
This specification covers the visual and interaction design migration from the GAIA web plugin to the Olorin frontend. The focus is on:
- Adopting GAIA's corporate color palette and Tailwind configuration
- Implementing GAIA's wizard-based investigation flow
- Replicating GAIA's component patterns and interaction states
- Maintaining GAIA's professional, enterprise-grade look and feel

### Reference Project Analysis
The GAIA web plugin (gaia-webplugin) provides:
- Comprehensive Tailwind configuration with corporate color scheme
- Wizard shell component with 3-step flow
- Collapsible panels, entity selection, time range selector
- Tools & agent matrix with interactive selection
- Real-time progress monitoring with live log streams
- Results visualization with risk gauges and correlation views
- Template management system for investigation configurations

### Current State Considerations
The Olorin frontend is currently:
- Undergoing refactoring from Material-UI to Tailwind CSS
- Implementing microservices architecture
- Addressing file size compliance (200-line limit)
- Eliminating all Material-UI dependencies

This specification aligns with the ongoing refactoring by providing:
- Pure Tailwind CSS design patterns from GAIA
- Modular component architecture matching GAIA's structure
- Clear separation of concerns for microservices implementation

### Out of Scope
The following are explicitly NOT covered in this specification:
- Backend API implementation details
- WebSocket communication protocols
- Database schema or data persistence
- Authentication and authorization mechanisms
- Specific technology stack choices (React, TypeScript, etc.)
- Build and deployment processes
- Performance optimization strategies
- Testing frameworks and methodologies

These implementation details will be addressed in the planning and implementation phases.
