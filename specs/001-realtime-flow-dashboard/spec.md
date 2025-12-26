# Feature Specification: Real-Time Flow Dashboard

**Feature Branch**: `001-realtime-flow-dashboard`  
**Created**: 2025-12-26  
**Status**: Draft  
**Input**: User description: "Real time monthly view. examine the olorin fron running investingations page. adjust it and the server as need to provide real time view of running investigations, I need to be able to see monthly flow progression and daily flow progression in the UI (not just in reports). do NOT duplicate code!!!"

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

### User Story 1 - Monitor running investigations with live flow progress (Priority: P1)

As an operator, I can open the "Running Investigations" page and see a real-time list of currently running investigations, including each investigation’s current status and live progress updates, so I can quickly detect stalled or failing runs.

**Why this priority**: This is the core operational workflow; without it, monthly/daily aggregates are not actionable.

**Independent Test**: Can be fully tested by starting at least one real investigation and verifying the row updates (status/progress/last-updated) without manual refresh.

**Acceptance Scenarios**:

1. **Given** at least one investigation is running, **When** I view the Running Investigations page, **Then** I see that investigation listed with its current status and progress.
2. **Given** a listed investigation progresses (e.g., new phase/log/event occurs), **When** I stay on the page, **Then** the displayed progress for that investigation updates without page refresh.

---

### User Story 2 - See today’s (daily) flow progression live (Priority: P2)

As an operator, I can see a live “Daily Flow Progression” panel in the UI that summarizes how today’s investigations are progressing (counts and outcomes), so I can understand whether today’s flow is healthy while it is still running.

**Why this priority**: Daily monitoring is the most time-sensitive view and supports fast operational response.

**Independent Test**: Can be tested by running today’s investigation flow and verifying the daily panel updates as investigations move through statuses and complete.

**Acceptance Scenarios**:

1. **Given** today’s investigations have started, **When** I view the Running Investigations page, **Then** the Daily Flow Progression panel shows current totals for today and updates as investigations start/complete/fail.
2. **Given** no investigations exist for today, **When** I view the Daily Flow Progression panel, **Then** I see an explicit “no data available for today” state (not assumed zeros and not synthetic data).

---

### User Story 3 - See month-to-date (monthly) flow progression live (Priority: P3)

As an operator, I can see a live “Monthly Flow Progression” panel in the UI that summarizes month-to-date flow progression (daily breakdown and monthly totals), so I can track whether the month is on pace and spot abnormal days early.

**Why this priority**: Monthly visibility drives planning and validation of sustained performance.

**Independent Test**: Can be tested by running monthly analysis mode (or having existing month results) and verifying the panel reflects real persisted month-to-date data and updates as new daily results arrive.

**Acceptance Scenarios**:

1. **Given** month-to-date analysis data exists, **When** I view the Running Investigations page, **Then** I see monthly totals and a daily breakdown for the current month.
2. **Given** a new daily result is produced (e.g., a daily window completes), **When** I stay on the page, **Then** the month-to-date panel updates to include the new day without page refresh.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when monthly analysis mode is enabled but has not started yet (no month-to-date data exists)?
- How does the UI behave when the user is unauthorized for the required endpoints (access denied rather than partial/guessed data)?
- What happens when real-time streaming is unavailable (the UI must still update using the existing real-time fallback mechanisms already in the product, without inventing a new parallel system)?
- What happens when the backend has partial-but-real results (e.g., some days completed, current day in progress)?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The Running Investigations page MUST present a real-time list of running investigations with status, progress, and last-updated timestamp.
- **FR-002**: The UI MUST include a “Daily Flow Progression” panel that summarizes today’s flow using only real system data and updates in real time while the flow is running.
- **FR-003**: The UI MUST include a “Monthly Flow Progression” panel that summarizes month-to-date progression (monthly totals plus daily breakdown) using only real system data and updates in real time as new daily results arrive.
- **FR-004**: The system MUST NOT fabricate, assume, or default missing daily/monthly values; if real data is unavailable, the UI MUST present an explicit “no data” or “unavailable” state.
- **FR-005**: The system MUST reuse existing real-time update infrastructure already present in the codebase (streaming and fallback behaviors) rather than introducing a parallel real-time mechanism for these views.
- **FR-006**: The backend MUST expose a read API that returns the real daily and monthly progression data required by the UI.
- **FR-007**: Access to daily/monthly progression data MUST respect existing authorization rules (no data leakage to unauthorized users).

*Example of marking unclear requirements:*

- **FR-008**: The Daily Flow Progression panel MUST summarize the “daily flow” for [NEEDS CLARIFICATION: which source of truth defines “daily flow”: (A) the incremental daily auto-comp flow, (B) all investigations created today, or (C) a specific named pipeline/run type?]
- **FR-009**: The Monthly Flow Progression panel MUST summarize “month-to-date flow” for [NEEDS CLARIFICATION: which source of truth defines “monthly flow”: (A) monthly sequential analysis mode outputs, (B) aggregation of daily auto-comp outputs, or (C) a specific named pipeline/run type?]

### Key Entities *(include if feature involves data)*

- **Running Investigation**: An in-progress investigation visible on the Running Investigations page, including identifier, status, progress, and last-updated time.
- **Daily Flow Progression**: A real-data summary of the current day’s flow progression, including counts of investigations by lifecycle state and measurable outcomes as available.
- **Monthly Flow Progression**: A real-data summary of month-to-date progression, including monthly totals and a per-day breakdown where data exists.

## Scope, Dependencies & Assumptions

### Scope (in)

- The Running Investigations page includes two in-page panels: Daily Flow Progression and Monthly Flow Progression.
- Both panels update automatically while the page is open, using only real system data.

### Scope (out)

- Editing or re-computing historical daily/monthly results from the UI.
- Introducing new analysis pipelines or changing investigation logic.

### Dependencies

- Daily/monthly progression data must exist in the system as a result of real investigation execution (no synthetic data generation).
- Operators must have the required permissions to access the underlying data sources.

### Assumptions

- The system already runs investigations that can be grouped into a “daily flow” and “monthly flow” concept with a stable source of truth.
- Real-time updates may be delivered via the system’s existing real-time update mechanisms; if a live channel is unavailable, the UI can still update via an existing built-in fallback behavior (without creating a new parallel real-time system).

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: When at least one investigation is actively progressing, the Running Investigations page reflects a progress change in the UI within 10 seconds of the change occurring.
- **SC-002**: Daily Flow Progression updates in the UI within 10 seconds of any investigation starting/completing/failing for the relevant daily scope.
- **SC-003**: Monthly Flow Progression updates in the UI within 60 seconds of a new daily result becoming available for the relevant monthly scope.
- **SC-004**: Operators can confirm “today’s flow health” (started vs completed vs failed counts) in under 30 seconds from page load without opening external report files.
