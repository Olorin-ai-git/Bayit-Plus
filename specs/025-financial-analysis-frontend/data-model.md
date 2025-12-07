# Data Model: Financial Analysis Frontend Integration

**Feature**: 025-financial-analysis-frontend
**Date**: 2025-12-06

## TypeScript Interface Definitions

### Core Financial Types

```typescript
// File: src/microservices/investigation/types/financialMetrics.ts

/**
 * Revenue metrics for a single investigation
 */
export interface RevenueMetrics {
  /** GMV saved by detecting fraud (APPROVED + IS_FRAUD_TX=1) */
  savedFraudGmv: number;

  /** Revenue lost from false positive blocks (BLOCKED + IS_FRAUD_TX=0) */
  lostRevenues: number;

  /** Net value = savedFraudGmv - lostRevenues */
  netValue: number;

  /** Confidence based on transaction volume */
  confidenceLevel: 'high' | 'medium' | 'low';

  /** Number of approved fraud transactions */
  approvedFraudTxCount: number;

  /** Number of blocked legitimate transactions */
  blockedLegitTxCount: number;

  /** Total transactions analyzed */
  totalTxCount: number;

  /** Whether calculation completed successfully */
  calculationSuccessful: boolean;

  /** Error message if calculation failed */
  errorMessage?: string;

  /** True if skipped because entity not predicted as fraud */
  skippedDueToPrediction: boolean;
}

/**
 * Confusion matrix metrics from investigation comparison
 */
export interface ConfusionMetrics {
  /** True positives: predicted fraud, actually fraud */
  truePositives: number;

  /** False positives: predicted fraud, actually legitimate */
  falsePositives: number;

  /** True negatives: predicted legitimate, actually legitimate */
  trueNegatives: number;

  /** False negatives: predicted legitimate, actually fraud */
  falseNegatives: number;

  /** Precision = TP / (TP + FP) */
  precision: number;

  /** Recall = TP / (TP + FN) */
  recall: number;

  /** F1 Score = 2 * (precision * recall) / (precision + recall) */
  f1Score: number;

  /** Accuracy = (TP + TN) / Total */
  accuracy: number;
}

/**
 * Combined financial analysis for an investigation
 */
export interface InvestigationFinancialAnalysis {
  investigationId: string;
  entityType: string;
  entityValue: string;
  merchantName?: string;
  revenueMetrics: RevenueMetrics | null;
  confusionMetrics: ConfusionMetrics | null;
  calculatedAt: string;
}

/**
 * Aggregated financial summary across multiple investigations
 */
export interface FinancialSummary {
  /** Total GMV saved across all investigations */
  totalSavedFraudGmv: number;

  /** Total lost revenues across all investigations */
  totalLostRevenues: number;

  /** Total net value across all investigations */
  totalNetValue: number;

  /** Aggregated confusion matrix totals */
  aggregateConfusionMatrix: {
    totalTP: number;
    totalFP: number;
    totalTN: number;
    totalFN: number;
    avgPrecision: number;
    avgRecall: number;
  };

  /** Number of investigations included */
  investigationCount: number;

  /** Number of successful calculations */
  successfulCalculations: number;

  /** Number of failed/skipped calculations */
  failedCalculations: number;

  /** Timestamp of aggregation */
  aggregatedAt: string;
}
```

### Extended ParallelInvestigation Interface

```typescript
// File: src/microservices/investigation/types/parallelInvestigations.ts (extend existing)

export interface ParallelInvestigation {
  // Existing fields
  id: string;
  investigationId?: string;
  entityValue: string;
  merchantName: string;
  status: InvestigationStatusType;
  riskScore: number;
  progressPercent: number;
  fraudTxCount: number;
  fraudPercent: number | null;
  startTime: string;
  endTime?: string;
  updatedAt?: string;
  restartedToId?: string;

  // NEW: Financial metrics (only for COMPLETED investigations)
  financialMetrics?: {
    savedFraudGmv: number;
    lostRevenues: number;
    netValue: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    skippedDueToPrediction: boolean;
  };

  // NEW: Confusion metrics (only for COMPLETED investigations)
  confusionMetrics?: {
    truePositives: number;
    falsePositives: number;
    precision: number;
    recall: number;
  };
}

export type InvestigationStatusType =
  | 'CREATED'
  | 'SETTINGS'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';
```

### API Response Types

```typescript
// File: src/microservices/investigation/types/financialApiTypes.ts

/**
 * Response from GET /api/v1/financial/{investigation_id}/metrics
 */
export interface FinancialMetricsResponse {
  investigationId: string;
  revenueMetrics: RevenueMetrics | null;
  confusionMetrics: ConfusionMetrics | null;
  calculatedAt: string;
}

/**
 * Response from GET /api/v1/financial/summary
 */
export interface FinancialSummaryResponse {
  summary: FinancialSummary;
  investigations: Array<{
    investigationId: string;
    status: 'success' | 'failed' | 'skipped';
    errorMessage?: string;
  }>;
}
```

### Configuration Types

```typescript
// File: src/microservices/investigation/config/financialConfig.ts

import { z } from 'zod';

export const FinancialConfigSchema = z.object({
  enabled: z.boolean(),
  refreshIntervalMs: z.number().int().positive(),
  currencyCode: z.string().length(3),
  currencyLocale: z.string(),
});

export type FinancialConfig = z.infer<typeof FinancialConfigSchema>;
```

---

## Entity Relationships

```
ParallelInvestigation
├── financialMetrics?: RevenueMetrics (optional, COMPLETED only)
│   ├── savedFraudGmv
│   ├── lostRevenues
│   ├── netValue
│   └── confidenceLevel
└── confusionMetrics?: ConfusionMetrics (optional, COMPLETED only)
    ├── truePositives
    ├── falsePositives
    ├── precision
    └── recall

FinancialSummary (aggregated)
├── totalSavedFraudGmv (sum of all investigations)
├── totalLostRevenues (sum of all investigations)
├── totalNetValue (sum of all investigations)
└── aggregateConfusionMatrix
    ├── totalTP, totalFP, totalTN, totalFN
    └── avgPrecision, avgRecall
```

---

## State Transitions

| Investigation Status | Financial Data Available |
|---------------------|-------------------------|
| CREATED | No |
| SETTINGS | No |
| IN_PROGRESS | No |
| COMPLETED | Yes (may be skipped if not predicted as fraud) |
| ERROR | No |
| CANCELLED | No |

---

## Validation Rules

1. **Currency values**: Must be non-negative decimals
2. **Confidence level**: Enum of 'high', 'medium', 'low'
3. **Precision/Recall**: Must be between 0.0 and 1.0
4. **Counts**: Must be non-negative integers
5. **Net Value**: Can be negative (when lostRevenues > savedFraudGmv)
