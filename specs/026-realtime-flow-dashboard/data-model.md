# Data Model: Real-Time Flow Dashboard

## Existing Entities (Source of Truth)

### InvestigationState (persisted)

Represents persisted investigation state used for flow progression aggregation.

**Key fields used**:
- `investigation_id` (identifier)
- `created_at` (timestamp used to bucket into day/month)
- `status` (status used to produce counts)

## New Entities (API Response)

### FlowProgressionResponse

Represents a single snapshot of daily and month-to-date progression.

**Fields**:
- `as_of` (UTC timestamp when snapshot computed)
- `daily` (nullable daily snapshot)
- `monthly` (nullable monthly snapshot)

### DailyFlowProgression

Represents daily progression for a single UTC day.

**Fields**:
- `date` (UTC date string `YYYY-MM-DD`)
- `total` (count of investigations created on that day)
- `status_counts.by_status` (map of `status` → count)

### MonthlyFlowProgression

Represents month-to-date progression for a UTC month.

**Fields**:
- `year` (UTC year)
- `month` (UTC month 1–12)
- `total` (count of investigations created in the month-to-date window)
- `status_counts.by_status` (map of `status` → count)
- `by_day[]` (per-day breakdown ordered by date)

### MonthlyDayProgression

Represents a single day bucket inside a month.

**Fields**:
- `date` (UTC date string `YYYY-MM-DD`)
- `total` (count of investigations created on that day)
- `status_counts.by_status` (map of `status` → count)

## Validation Rules

- The API returns `daily = null` if no persisted investigations exist for the requested day.
- The API returns `monthly = null` if no persisted investigations exist for the requested month.
- No synthetic values are emitted for unavailable data.


