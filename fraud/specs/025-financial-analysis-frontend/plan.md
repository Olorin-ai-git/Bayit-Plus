# Implementation Plan: Financial Analysis Frontend Integration

**Branch**: `025-financial-analysis-frontend` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-financial-analysis-frontend/spec.md`

## Summary

Integrate financial analysis capabilities into the Olorin frontend by enhancing the parallel investigations page with revenue metrics (Saved Fraud GMV, Lost Revenues, Net Value) and confusion matrix data (TP, FP, Precision), then creating a dedicated Financial Analysis microservice (Port 3007) for comprehensive dashboards and drill-down views.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), Python 3.11 (Backend)
**Primary Dependencies**: React 18, Tailwind CSS, Webpack 5 Module Federation, FastAPI
**Storage**: SQLite/PostgreSQL (existing), Snowflake (read-only queries)
**Testing**: Jest + React Testing Library (Frontend), pytest (Backend)
**Target Platform**: Web browser (Chrome, Firefox, Safari)
**Project Type**: Web application (microservices architecture)
**Performance Goals**: Financial data loads in <2s, summary updates within 5s of investigation completion
**Constraints**: All files <200 lines, Tailwind CSS only (NO Material-UI), config-driven, schema-locked
**Scale/Scope**: 100+ concurrent investigations, 6 microservices + 1 new service

## Constitution Check

*GATE: Project CLAUDE.md mandates checked and compliant*

| Principle | Status | Notes |
|-----------|--------|-------|
| No hardcoded values | PASS | All config via environment variables |
| No mocks in production | PASS | Integration tests with real APIs |
| 200-line file limit | PASS | Components split into focused modules |
| Tailwind CSS only | PASS | No Material-UI imports |
| Schema-locked | PASS | No DDL, read-only queries |
| Config validation | PASS | Zod schemas for all config |

## Project Structure

### Documentation (this feature)

```text
specs/025-financial-analysis-frontend/
├── plan.md              # This file
├── research.md          # Research findings (Phase 0)
├── data-model.md        # TypeScript interfaces (Phase 1)
├── quickstart.md        # Development setup guide (Phase 1)
├── contracts/           # API contracts (Phase 1)
│   └── financial-metrics-api.yaml
└── tasks.md             # Implementation tasks (Phase 2)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   ├── router/
│   │   └── financial_router.py              # NEW: Financial metrics API endpoints
│   ├── schemas/
│   │   └── revenue_implication.py           # EXISTING: Revenue schemas
│   └── service/investigation/
│       └── revenue_calculator.py            # EXISTING: Calculation engine

olorin-front/
├── src/
│   ├── microservices/
│   │   ├── investigation/
│   │   │   ├── components/
│   │   │   │   └── financial/               # NEW: Financial components
│   │   │   │       ├── FinancialSummaryPanel.tsx
│   │   │   │       ├── NetValueCell.tsx
│   │   │   │       ├── ConfusionMetricsCell.tsx
│   │   │   │       └── CurrencyDisplay.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useFinancialMetrics.ts   # NEW: Financial data hook
│   │   │   │   └── useFinancialSummary.ts   # NEW: Aggregation hook
│   │   │   ├── types/
│   │   │   │   └── financialMetrics.ts      # NEW: Financial types
│   │   │   └── utils/
│   │   │       └── currencyFormatter.ts     # NEW: Currency utility
│   │   └── financial-analysis/              # NEW: Microservice (Port 3007)
│   │       ├── index.tsx
│   │       ├── bootstrap.tsx
│   │       ├── components/
│   │       │   ├── dashboard/
│   │       │   │   ├── FinancialOverview.tsx
│   │       │   │   ├── RevenueImpactChart.tsx
│   │       │   │   └── ConfusionMatrixDisplay.tsx
│   │       │   └── investigation/
│   │       │       ├── InvestigationFinancialDetail.tsx
│   │       │       └── RevenueBreakdown.tsx
│   │       ├── hooks/
│   │       │   └── useFinancialDashboard.ts
│   │       ├── pages/
│   │       │   ├── FinancialDashboardPage.tsx
│   │       │   └── InvestigationFinancialPage.tsx
│   │       ├── services/
│   │       │   └── financialAnalysisService.ts
│   │       └── config/
│   │           └── webpack.config.js
│   └── shared/
│       └── components/Table/                # EXISTING: Table infrastructure
```

**Structure Decision**: Web application with microservices architecture. Frontend uses Module Federation for independent deployment. Backend extends existing routers.

---

## Phase 1: Parallel Investigations Table Enhancement

### 1.1 Backend API Endpoints

**New Router**: `olorin-server/app/router/financial_router.py`

```
GET /api/v1/financial/{investigation_id}/metrics
Response: InvestigationFinancialMetrics

GET /api/v1/financial/summary?investigation_ids[]=...
Response: FinancialSummary
```

### 1.2 TypeScript Types

**File**: `olorin-front/src/microservices/investigation/types/financialMetrics.ts`

```typescript
export interface RevenueMetrics {
  savedFraudGmv: number;
  lostRevenues: number;
  netValue: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  approvedFraudTxCount: number;
  blockedLegitTxCount: number;
}

export interface ConfusionMetrics {
  truePositives: number;
  falsePositives: number;
  precision: number;
  recall: number;
}

export interface FinancialSummary {
  totalSavedFraudGmv: number;
  totalLostRevenues: number;
  totalNetValue: number;
  avgPrecision: number;
  investigationCount: number;
}
```

### 1.3 New Table Columns

| Column | Source | Width | Cell Renderer |
|--------|--------|-------|---------------|
| Saved GMV | `financialMetrics.savedFraudGmv` | 120px | `CurrencyDisplay` |
| Lost Rev | `financialMetrics.lostRevenues` | 100px | `CurrencyDisplay` |
| Net Value | `financialMetrics.netValue` | 120px | `NetValueCell` (color-coded) |
| TP/FP | `confusionMetrics` | 80px | `ConfusionMetricsCell` |
| Precision | `confusionMetrics.precision` | 80px | Percentage |

### 1.4 Components to Create

| Component | Lines | Purpose |
|-----------|-------|---------|
| `FinancialSummaryPanel.tsx` | ~80 | Aggregated totals above table |
| `NetValueCell.tsx` | ~40 | Color-coded currency (green/red) |
| `ConfusionMetricsCell.tsx` | ~50 | Compact TP/FP display with tooltip |
| `CurrencyDisplay.tsx` | ~30 | Formatted currency component |
| `currencyFormatter.ts` | ~25 | Locale-aware formatting utility |

---

## Phase 2: Financial Analysis Microservice

### 2.1 Service Configuration

- **Port**: 3007
- **Module Federation Name**: `financialAnalysis`
- **Exposes**: `FinancialDashboardPage`, `InvestigationFinancialPage`

### 2.2 Routes

| Route | Page | Description |
|-------|------|-------------|
| `/financial-analysis` | `FinancialDashboardPage` | Aggregated dashboard |
| `/financial-analysis/:id` | `InvestigationFinancialPage` | Per-investigation detail |

### 2.3 Dashboard Components

| Component | Purpose |
|-----------|---------|
| `FinancialOverview.tsx` | 4 KPI cards with totals |
| `RevenueImpactChart.tsx` | Time-series visualization |
| `ConfusionMatrixDisplay.tsx` | Matrix grid view |
| `MerchantBreakdown.tsx` | Per-merchant table |

---

## Critical Files to Modify

### Backend (olorin-server)

| File | Action | Purpose |
|------|--------|---------|
| `app/router/financial_router.py` | CREATE | Financial metrics API |
| `app/main.py` | MODIFY | Register financial router |
| `app/schemas/financial_response.py` | CREATE | API response schemas |

### Frontend (olorin-front)

| File | Action | Purpose |
|------|--------|---------|
| `src/microservices/investigation/types/financialMetrics.ts` | CREATE | Type definitions |
| `src/microservices/investigation/types/parallelInvestigations.ts` | MODIFY | Extend interface |
| `src/microservices/investigation/pages/ParallelInvestigationsPage.tsx` | MODIFY | Add columns |
| `src/microservices/investigation/components/financial/*` | CREATE | New components |
| `src/microservices/investigation/hooks/useFinancialMetrics.ts` | CREATE | Data fetching |
| `src/microservices/financial-analysis/*` | CREATE | New microservice |
| `package.json` | MODIFY | Add start:financial-analysis script |
| `webpack.config.js` | MODIFY | Module Federation remote |

---

## Environment Variables

```bash
# Financial Analysis Feature
REACT_APP_FEATURE_ENABLE_FINANCIAL_ANALYSIS=true
REACT_APP_FINANCIAL_ANALYSIS_PORT=3007
REACT_APP_FINANCIAL_REFRESH_INTERVAL_MS=30000
REACT_APP_CURRENCY_CODE=USD
REACT_APP_CURRENCY_LOCALE=en-US
```

---

## Implementation Order

1. **Backend API** - Create financial_router.py with metrics endpoints
2. **TypeScript Types** - Define interfaces in financialMetrics.ts
3. **Currency Utility** - Create currencyFormatter.ts
4. **Cell Components** - NetValueCell, ConfusionMetricsCell, CurrencyDisplay
5. **Summary Panel** - FinancialSummaryPanel component
6. **Data Hooks** - useFinancialMetrics, useFinancialSummary
7. **Table Integration** - Add columns to ParallelInvestigationsPage
8. **Microservice Setup** - Create financial-analysis service structure
9. **Dashboard Page** - FinancialDashboardPage with components
10. **Detail Page** - InvestigationFinancialPage
11. **Shell Integration** - Add routes and navigation

---

## Testing Strategy

| Test Type | Coverage |
|-----------|----------|
| Unit | Components, utilities, formatters |
| Integration | API hooks, data transformation |
| E2E | Full flow from investigation to financial display |

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Revenue calculation slow | Cache results, show loading states |
| Large table performance | Virtual scrolling for 100+ rows |
| Old investigations no data | Graceful null handling with "-" display |
