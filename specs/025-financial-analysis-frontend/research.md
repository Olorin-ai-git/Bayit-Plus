# Research: Financial Analysis Frontend Integration

**Feature**: 025-financial-analysis-frontend
**Date**: 2025-12-06

## Research Findings

### 1. Backend Infrastructure Assessment

**Decision**: Extend existing investigation state API with financial data endpoints

**Rationale**:
- Complete `RevenueImplication` schema already exists at `app/schemas/revenue_implication.py`
- Full `RevenueCalculator` service (1114 lines) available at `app/service/investigation/revenue_calculator.py`
- `ConfusionMatrix` generation capability exists in confusion table generator
- Only missing piece: API endpoint to expose this data to frontend

**Alternatives Considered**:
- Embedding financial data in existing investigation-state response (rejected: adds latency to every request)
- Creating separate financial microservice backend (rejected: over-engineering, existing services sufficient)

### 2. Frontend Table Enhancement Pattern

**Decision**: Add financial columns to existing ParallelInvestigationsPage with lazy-loaded data

**Rationale**:
- Existing table uses shared Table component from `src/shared/components/Table/`
- Column configuration pattern supports custom cell renderers
- `useInvestigationPolling` hook already handles data fetching with polling

**Alternatives Considered**:
- Replace entire table with new implementation (rejected: unnecessary, current table works)
- Use separate data grid library (rejected: conflicts with Tailwind CSS mandate)

### 3. Microservice Architecture

**Decision**: Create new financial-analysis microservice on Port 3007

**Rationale**:
- Follows existing microservices pattern (investigation:3001, agent-analytics:3002, etc.)
- Module Federation already configured for runtime composition
- Enables independent deployment and development

**Alternatives Considered**:
- Add pages to existing investigation microservice (rejected: violates single responsibility)
- Add to core-ui service (rejected: core-ui is for shared components only)

### 4. Currency Formatting

**Decision**: Create centralized currencyFormatter utility with Intl.NumberFormat

**Rationale**:
- Config-driven via REACT_APP_CURRENCY_CODE and REACT_APP_CURRENCY_LOCALE
- Browser-native formatting handles all locale-specific rules
- Consistent formatting across all components

**Alternatives Considered**:
- Use third-party formatting library (rejected: unnecessary complexity)
- Inline formatting in each component (rejected: violates DRY)

### 5. Data Fetching Strategy

**Decision**: Separate hooks for individual and aggregated financial data

**Rationale**:
- `useFinancialMetrics(investigationId)` for per-investigation data
- `useFinancialSummary(investigationIds)` for aggregated summary panel
- Matches existing hook patterns in investigation service

**Alternatives Considered**:
- Single monolithic financial data hook (rejected: harder to cache, less flexible)
- Real-time WebSocket for financial data (rejected: overkill, polling sufficient)

---

## Technical Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| RevenueCalculator service | Complete | Feature 024 implemented |
| ConfusionMatrix generator | Complete | Existing service |
| Shared Table component | Complete | Full column configuration |
| Module Federation | Complete | Shell app already configured |
| Tailwind CSS | Complete | Already used throughout |

---

## Resolved Clarifications

| Question | Resolution |
|----------|------------|
| Currency format | USD via environment variable |
| Take rate visibility | Backend-only, not exposed to frontend |
| Lifetime multiplier | Backend-only, not exposed to frontend |
| Confidence level display | Badge/indicator in UI |
| Historical calculations | On-demand for completed investigations |
