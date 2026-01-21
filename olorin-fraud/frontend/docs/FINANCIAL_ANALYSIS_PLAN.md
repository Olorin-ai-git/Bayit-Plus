# Financial Analysis Microservice Implementation Plan

**Feature**: 025-financial-analysis-frontend
**Branch**: `025-financial-analysis-frontend`
**Date**: 2025-12-06
**Status**: Planning Phase

---

## Executive Summary

This document outlines the implementation plan for integrating financial analysis capabilities into the frontend, including:
1. Enhancements to the existing Parallel Investigations page with financial metrics
2. A new Financial Analysis microservice (Port 3007) for dedicated financial dashboards
3. End-to-end verification of the complete flow

---

## Part 1: Parallel Investigations Page Enhancements

### Current State Analysis

**Location**: `src/microservices/investigation/pages/ParallelInvestigationsPage.tsx`
**Port**: 3001 (Investigation Service)

**Current Features**:
- Investigation list with basic columns (ID, Entity, Status, Risk Score, Start Time)
- Real-time polling via `useInvestigationPolling` hook
- WebSocket integration for live updates
- Status filtering (CREATED, IN_PROGRESS, COMPLETED, ERROR, CANCELLED)

**Missing Financial Metrics**:
- Saved Fraud GMV
- Lost Revenues
- Net Value
- ROI Percentage
- Confusion Matrix summary (TP, FP, TN, FN)

### Proposed Enhancements

#### 1.1 Extended Type Definitions

**File**: `src/microservices/investigation/types/parallelInvestigations.ts`

Add financial metrics to the existing interface:

```typescript
export interface FinancialMetrics {
  savedFraudGmv: number;
  lostRevenues: number;
  netValue: number;
  roiPercentage?: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ConfusionMetrics {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface ParallelInvestigation {
  id: string;
  investigationId?: string;
  entityValue?: string;
  status: InvestigationStatusType;
  riskScore: number;
  startTime: string;
  createdAt?: string;
  progress?: number;
  // NEW: Financial Analysis Fields
  financialMetrics?: FinancialMetrics;
  confusionMetrics?: ConfusionMetrics;
  // Existing fields...
}
```

#### 1.2 Enhanced Table Columns

**File**: `src/microservices/investigation/components/InvestigationsTable.tsx`

Add new columns for financial data:

| Column | Source | Display Format |
|--------|--------|----------------|
| Saved Fraud GMV | `financialMetrics.savedFraudGmv` | Currency ($X,XXX.XX) |
| Lost Revenues | `financialMetrics.lostRevenues` | Currency ($X,XXX.XX) |
| Net Value | `financialMetrics.netValue` | Currency with color (green/red) |
| TP/FP | `confusionMetrics` | "TP: X / FP: Y" |
| Precision | `confusionMetrics.precision` | Percentage (XX.X%) |

#### 1.3 Financial Summary Dashboard

Add a summary panel above the table showing aggregated metrics:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Financial Summary (5 investigations completed)                       │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│ Total Saved GMV │ Total Lost Rev  │ Net Value       │ Avg Precision │
│ $10,234.56      │ $7,597.48       │ +$2,637.08      │ 36.0%         │
└─────────────────┴─────────────────┴─────────────────┴───────────────┘
```

#### 1.4 Backend API Integration

**Endpoint**: `GET /api/v1/investigation-state/`

The backend already returns investigation states. Need to enhance with financial data from:

1. **Revenue Implication Endpoint** (existing):
   - `POST /{investigation_id}/revenue-implication` - Calculate revenue for single investigation

2. **Confusion Matrix Endpoint** (existing):
   - `POST /{investigation_id}/confusion-matrix` - Generate confusion matrix

3. **New Aggregation Endpoint** (to be added):
   - `GET /api/v1/investigation-state/financial-summary` - Aggregated financial metrics

### Implementation Steps

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1 | Extend TypeScript interfaces | `types/parallelInvestigations.ts` | Small |
| 2 | Add financial columns to table config | `components/InvestigationsTable.tsx` | Small |
| 3 | Create FinancialSummaryPanel component | `components/FinancialSummaryPanel.tsx` | Medium |
| 4 | Update useInvestigationPolling hook | `hooks/useInvestigationPolling.ts` | Medium |
| 5 | Add currency formatting utilities | `shared/utils/formatters.ts` | Small |
| 6 | Update page layout | `pages/ParallelInvestigationsPage.tsx` | Medium |
| 7 | Add tests | `__tests__/FinancialMetrics.test.tsx` | Medium |

---

## Part 2: Financial Analysis Microservice

### Service Overview

**Name**: financial-analysis
**Port**: 3007
**Purpose**: Dedicated microservice for financial analysis dashboards, ROI tracking, and revenue impact visualization

### Architecture

```
src/microservices/financial-analysis/
├── components/
│   ├── RevenueImpactChart.tsx      # Time-series revenue visualization
│   ├── ConfusionMatrixDisplay.tsx  # Visual confusion matrix
│   ├── ROICalculator.tsx           # Interactive ROI analysis
│   ├── EntityFinancialCard.tsx     # Per-entity financial summary
│   └── AggregatedMetricsPanel.tsx  # Cross-investigation aggregation
├── hooks/
│   ├── useRevenueData.ts           # Revenue API integration
│   ├── useConfusionMetrics.ts      # Confusion matrix data
│   └── useFinancialPolling.ts      # Real-time financial updates
├── pages/
│   ├── FinancialDashboardPage.tsx  # Main dashboard
│   ├── InvestigationFinancialPage.tsx # Per-investigation details
│   └── ROIAnalysisPage.tsx         # ROI deep-dive
├── services/
│   └── financialApi.ts             # Backend API client
├── types/
│   └── financial.ts                # TypeScript definitions
├── config/
│   └── webpack.config.js           # Module federation config
└── index.tsx                       # Service entry point
```

### Key Features

#### 2.1 Financial Dashboard Page

**Route**: `/financial-analysis` or `/finances`

Components:
- **Revenue Impact Overview**: Aggregated Saved GMV, Lost Revenues, Net Value
- **Time-series Chart**: Revenue metrics over time (daily/weekly/monthly)
- **Top Investigations by ROI**: Ranked list of highest-value investigations
- **Confusion Matrix Summary**: Aggregated TP/FP/TN/FN with precision/recall

#### 2.2 Investigation Financial Details

**Route**: `/financial-analysis/investigation/:id`

Components:
- **Revenue Breakdown**: Detailed SavedFraudGMVBreakdown and LostRevenuesBreakdown
- **Transaction Samples**: Sample transactions used in calculation
- **Methodology Explanation**: Clear explanation of calculation methodology
- **Confusion Matrix**: Per-investigation confusion matrix visualization

#### 2.3 ROI Analysis Page

**Route**: `/financial-analysis/roi`

Components:
- **ROI Calculator**: Interactive what-if analysis
- **Threshold Analysis**: How different thresholds affect ROI
- **Cost-Benefit Analysis**: Visual comparison of fraud prevention value

### Backend API Requirements

#### Existing Endpoints (Ready to Use)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/investigation-state/{id}` | GET | Get investigation state with progress |
| `/api/v1/investigation-state/{id}/confusion-matrix` | POST | Generate confusion matrix |
| `/api/v1/reports/investigation/{id}/html` | GET | Get confusion matrix HTML report |
| `/api/v1/analytics/explain/confusion-matrix` | GET | Get confusion matrix over time |

#### New Endpoints (To Be Added)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/financial/revenue/{investigation_id}` | GET | Get revenue implication for investigation |
| `/api/v1/financial/summary` | GET | Aggregated financial summary across investigations |
| `/api/v1/financial/timeseries` | GET | Time-series revenue data |

### TypeScript Type Definitions

```typescript
// src/microservices/financial-analysis/types/financial.ts

export interface RevenueImplication {
  investigationId: string;
  entityType: string;
  entityValue: string;
  merchantName?: string;

  // Core metrics
  savedFraudGmv: number;
  lostRevenues: number;
  netValue: number;

  // Transaction counts
  approvedFraudTxCount: number;
  blockedLegitimateTxCount: number;
  totalTxCount: number;

  // Configuration
  takeRateUsed: number;
  lifetimeMultiplierUsed: number;

  // Time windows
  gmvWindowStart: string;
  gmvWindowEnd: string;

  // Quality
  confidenceLevel: 'high' | 'medium' | 'low';
  calculationTimestamp: string;
  calculationSuccessful: boolean;
}

export interface ConfusionMatrix {
  entityType: string;
  entityValue: string;
  investigationId: string;

  // Core metrics
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;

  // Derived metrics
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;

  // Context
  totalTransactions: number;
  excludedTransactions: number;
}

export interface FinancialSummary {
  totalInvestigations: number;
  successfulCalculations: number;

  // Aggregated metrics
  totalSavedFraudGmv: number;
  totalLostRevenues: number;
  totalNetValue: number;

  // Transaction totals
  totalApprovedFraudTx: number;
  totalBlockedLegitimateTx: number;

  // Per-merchant breakdown
  merchantBreakdown?: Record<string, {
    savedFraudGmv: number;
    lostRevenues: number;
    netValue: number;
  }>;

  aggregationTimestamp: string;
}
```

### Webpack Module Federation Configuration

```javascript
// src/microservices/financial-analysis/config/webpack.config.js

const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'financialAnalysis',
      filename: 'remoteEntry.js',
      exposes: {
        './FinancialDashboard': './src/pages/FinancialDashboardPage',
        './InvestigationFinancial': './src/pages/InvestigationFinancialPage',
        './ROIAnalysis': './src/pages/ROIAnalysisPage',
        './RevenueImpactChart': './src/components/RevenueImpactChart',
        './ConfusionMatrixDisplay': './src/components/ConfusionMatrixDisplay',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

---

## Part 3: Implementation Phases

### Phase 1: Parallel Investigations Enhancements (Current Priority)

**Duration**: 2 phases
**Goal**: Add financial metrics to existing parallel investigations page

| Task | Status | Notes |
|------|--------|-------|
| Extend TypeScript interfaces | Pending | Add FinancialMetrics, ConfusionMetrics |
| Update InvestigationsTable columns | Pending | Add 5 new columns |
| Create FinancialSummaryPanel | Pending | Aggregated metrics above table |
| Integrate with backend API | Pending | Use existing endpoints |
| Add currency formatting | Pending | Reusable utility |
| Update styling (Tailwind) | Pending | Financial metric styling |
| Write tests | Pending | Unit + integration tests |

### Phase 2: Financial Analysis Microservice Setup

**Duration**: 3 phases
**Goal**: Create dedicated financial analysis microservice

| Task | Status | Notes |
|------|--------|-------|
| Create microservice directory structure | Pending | Standard microservice layout |
| Implement Webpack Module Federation | Pending | Port 3007 |
| Create shared types | Pending | TypeScript definitions |
| Implement financialApi service | Pending | Backend integration |
| Build FinancialDashboardPage | Pending | Main dashboard |
| Build RevenueImpactChart | Pending | D3/Recharts visualization |
| Build ConfusionMatrixDisplay | Pending | Matrix visualization |
| Add shell app integration | Pending | Route registration |

### Phase 3: Advanced Features

**Duration**: 2 phases
**Goal**: ROI analysis and advanced visualizations

| Task | Status | Notes |
|------|--------|-------|
| Build ROIAnalysisPage | Pending | Interactive analysis |
| Implement threshold analysis | Pending | What-if scenarios |
| Add export functionality | Pending | PDF/CSV export |
| Real-time updates via WebSocket | Pending | Live financial updates |
| Cross-service event integration | Pending | UnifiedEventBus |

---

## Part 4: Backend API Enhancements

### Required Backend Changes

#### 4.1 Financial API Router

Create new router at: `app/router/financial_router.py`

```python
@router.get("/revenue/{investigation_id}")
async def get_revenue_implication(investigation_id: str) -> RevenueImplication:
    """Get revenue implication for a specific investigation."""

@router.get("/summary")
async def get_financial_summary(
    merchant_name: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> FinancialSummary:
    """Get aggregated financial summary across investigations."""

@router.get("/timeseries")
async def get_financial_timeseries(
    granularity: str = "daily",  # daily, weekly, monthly
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[TimeseriesDataPoint]:
    """Get time-series financial data for charting."""
```

#### 4.2 Investigation State Enhancement

Update `InvestigationStateResponse` to include financial data:

```python
class InvestigationStateResponse(BaseModel):
    # ... existing fields ...

    # NEW: Financial metrics (optional, populated for completed investigations)
    financial_metrics: Optional[RevenueImplication] = None
    confusion_metrics: Optional[ConfusionMatrix] = None
```

---

## Part 5: Testing Strategy

### Frontend Tests

| Test Type | Coverage |
|-----------|----------|
| Unit Tests | Individual components (FinancialSummaryPanel, etc.) |
| Integration Tests | API integration, hook behavior |
| E2E Tests | Full flow from investigation to financial display |

### Backend Tests

| Test Type | Coverage |
|-----------|----------|
| Unit Tests | Revenue calculation logic |
| Integration Tests | API endpoints |
| E2E Tests | Complete investigation → financial analysis flow |

---

## Part 6: Configuration Requirements

### Environment Variables (Frontend)

```bash
# Financial Analysis Microservice
REACT_APP_FINANCIAL_SERVICE_PORT=3007
REACT_APP_FEATURE_ENABLE_FINANCIAL_ANALYSIS=true
REACT_APP_FINANCIAL_POLLING_INTERVAL_MS=30000
REACT_APP_CURRENCY_FORMAT=USD
```

### Environment Variables (Backend)

```bash
# Revenue Calculation
REVENUE_TAKE_RATE_PERCENT=2.5
REVENUE_LIFETIME_MULTIPLIER=3.0
REVENUE_RISK_THRESHOLD=0.35
```

---

## Part 7: Success Criteria

### Phase 1 Success (Parallel Investigations)

- [ ] Financial columns display correctly in investigations table
- [ ] Summary panel shows aggregated metrics
- [ ] Currency formatting is consistent
- [ ] Real-time updates include financial data
- [ ] All tests pass

### Phase 2 Success (Financial Microservice)

- [ ] Microservice starts on port 3007
- [ ] Module federation works with shell app
- [ ] Dashboard displays aggregated metrics
- [ ] Charts render correctly
- [ ] Navigation from investigations to financial details works

### Phase 3 Success (Advanced Features)

- [ ] ROI analysis is interactive
- [ ] Export functionality works
- [ ] Real-time updates via WebSocket
- [ ] Cross-service events propagate correctly

---

## Appendix: Existing Backend Schemas Reference

### RevenueImplication (Backend)
Location: `app/schemas/revenue_implication.py`

Key fields:
- `saved_fraud_gmv`: Decimal
- `lost_revenues`: Decimal
- `net_value`: Decimal
- `approved_fraud_tx_count`: int
- `blocked_legitimate_tx_count`: int
- `confidence_level`: ConfidenceLevel enum
- `saved_fraud_breakdown`: Optional[SavedFraudGMVBreakdown]
- `lost_revenues_breakdown`: Optional[LostRevenuesBreakdown]
- `prediction_validation`: Optional[PredictionValidation]

### ConfusionMatrix (Backend)
Location: `app/router/models/investigation_comparison_models.py`

Key fields:
- `true_positives`, `false_positives`, `true_negatives`, `false_negatives`: int
- `precision`, `recall`, `f1_score`, `accuracy`: float
- `total_transactions`, `excluded_transactions`: int

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-06 | Claude | Initial plan creation |
