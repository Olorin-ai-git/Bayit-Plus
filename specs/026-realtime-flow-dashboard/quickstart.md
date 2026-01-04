# Quickstart: Real-Time Flow Dashboard

## Goal

View real-time running investigations plus in-page daily and monthly flow progression panels.

## Prerequisites

- Frontend environment variables must include the monitoring keys:
  - `REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS`
  - `REACT_APP_INVESTIGATION_POLLING_RETRY_MAX_ATTEMPTS`
  - `REACT_APP_INVESTIGATION_POLLING_RETRY_BASE_DELAY_MS`

These are set for local development in `olorin-front/.envrc` (direnv).

## Run (Frontend)

From repository root:

```bash
cd olorin-front
npm install
npm run start:investigation
```

## Use

- Open the Investigation service UI.
- Navigate to the **Running Investigations** page.
- Confirm:
  - The table updates automatically.
  - The **Daily Flow Progression** panel shows today’s (UTC) counts (or an explicit “no data” state).
  - The **Monthly Flow Progression** panel shows month-to-date (UTC) totals and daily breakdown (or an explicit “no data” state).


