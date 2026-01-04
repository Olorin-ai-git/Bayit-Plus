# Phase 0 Research: Real-Time Flow Dashboard

## Decisions

### Decision: Daily flow source of truth = investigations created on the UTC day

**Rationale**:
- Uses an existing persisted data source (investigation state storage) with stable timestamps.
- Requires no schema changes and no new persistence layers.
- Works for all investigation types uniformly (structured, hybrid), which matches “Running Investigations” operational monitoring intent.

**Alternatives considered**:
- Daily auto-comparison incremental report as source-of-truth: rejected because it is scoped to a specific pipeline and not guaranteed to exist for all environments or user workflows.
- A specific pipeline/run type filter: rejected because the identifying rule is not universally defined across all investigations, and would require additional schema/metadata standardization.

### Decision: Monthly flow source of truth = investigations created in the UTC month (month-to-date), with per-day breakdown

**Rationale**:
- Same persisted source-of-truth as daily flow.
- Month-to-date aggregation supports operational pacing without requiring monthly sequential analysis mode to be enabled.

**Alternatives considered**:
- Monthly sequential analysis outputs: rejected as default because the data only exists when that mode is running; would create “unavailable” most of the time.
- Aggregation of daily auto-comp outputs: rejected because it inherits the same pipeline-specific limitations as daily incremental reporting.

### Decision: Real-time update strategy = reuse existing Running Investigations refresh cadence

**Rationale**:
- Avoids introducing a parallel streaming system for aggregates.
- Keeps cadence consistent with existing polling/event-driven updates already used on the page.

**Alternatives considered**:
- Separate polling timer for flow panels: rejected as duplicate logic and increases load.
- New SSE channel for flow progression: rejected as parallel real-time infrastructure.

## Notes

- The repository’s `.specify/memory/constitution.md` is a placeholder template; the real “constitution-of-record” is enforced via the repo `CLAUDE.md` files and service rules (no TODOs, no hardcoded values, schema-locked).


