# 2D Distribution Map: GMV × nSure Score with FN/FP/TP/TN Analysis

**Created**: 2025-12-30
**Status**: Frontend Only (Backend Deferred)

## Overview

Create a 2D distribution analysis tool to identify blind spots between nSure and Olorin models by mapping FN/FP/TP/TN across GMV (Y-axis) and MODEL_SCORE bins (X-axis).

**Purpose**: Improve selector accuracy by focusing on nSure's weaknesses and Olorin's strengths.

---

## Backend Implementation (Deferred)

### File: `olorin-server/app/service/analytics/model_blindspot_analyzer.py`

**Pattern**: Follow `score_distribution_analyzer.py` structure

#### Configuration (Environment Variables)

```bash
# Score bins (X-axis) - 20 bins = 0.05 increments
BLINDSPOT_SCORE_BINS=20

# GMV bins (Y-axis) - configurable ranges
BLINDSPOT_GMV_BINS=0,50,100,250,500,1000,5000

# Time window
BLINDSPOT_LOOKBACK_MONTHS=12
```

#### Training Integration (NOT hardcoded threshold)

**Use Olorin's trained threshold from `threshold_config.py`:**

```python
from app.config.threshold_config import get_risk_threshold

# Get Olorin's trained threshold (RISK_THRESHOLD_DEFAULT env var)
olorin_threshold = get_risk_threshold()  # e.g., 0.40

# Get active prompt version (LLM_PROMPT_ACTIVE_VERSION env var)
prompt_version = os.getenv("LLM_PROMPT_ACTIVE_VERSION", "unknown")
```

#### SQL Query Structure

```sql
-- Note: :olorin_threshold comes from get_risk_threshold() - Olorin's trained value
-- Note: :num_score_bins = 20 (0.05 increments)

WITH binned_transactions AS (
    SELECT
        FLOOR(MODEL_SCORE * :num_score_bins) / :num_score_bins AS score_bin,
        CASE
            WHEN GMV < 50 THEN '0-50'
            WHEN GMV < 100 THEN '50-100'
            WHEN GMV < 250 THEN '100-250'
            WHEN GMV < 500 THEN '250-500'
            WHEN GMV < 1000 THEN '500-1000'
            ELSE '1000+'
        END AS gmv_bin,
        CASE WHEN MODEL_SCORE >= :olorin_threshold THEN 1 ELSE 0 END AS predicted_fraud,
        IS_FRAUD_TX AS actual_fraud,
        GMV,
        MODEL_SCORE
    FROM {table}
    WHERE TX_DATETIME >= :start_date
      AND TX_DATETIME < :end_date
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND MODEL_SCORE IS NOT NULL
      AND GMV IS NOT NULL
)
SELECT
    score_bin,
    gmv_bin,
    SUM(CASE WHEN predicted_fraud = 1 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS tp,
    SUM(CASE WHEN predicted_fraud = 1 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS fp,
    SUM(CASE WHEN predicted_fraud = 0 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS fn,
    SUM(CASE WHEN predicted_fraud = 0 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS tn,
    COUNT(*) AS total_transactions,
    SUM(GMV) AS total_gmv,
    SUM(CASE WHEN actual_fraud = 1 THEN GMV ELSE 0 END) AS fraud_gmv,
    AVG(MODEL_SCORE) AS avg_score
FROM binned_transactions
GROUP BY score_bin, gmv_bin
ORDER BY gmv_bin, score_bin
```

#### Output Structure

```python
{
    "status": "success",
    "training_info": {
        "olorin_threshold": 0.40,
        "prompt_version": "v14",
        "llm_fraud_threshold": 0.80,
        "analysis_timestamp": "2025-12-30T10:00:00Z"
    },
    "matrix": {
        "score_bins": [0.0, 0.05, 0.10, ...],
        "gmv_bins": ["0-50", "50-100", ...],
        "cells": [
            {
                "score_bin": 0.0,
                "gmv_bin": "0-50",
                "tp": 12, "fp": 5, "fn": 8, "tn": 200,
                "precision": 0.71, "recall": 0.60, "f1": 0.65,
                "total_transactions": 225,
                "fraud_gmv": 450.00,
                "fn_rate": 0.04,
                "fp_rate": 0.02
            }
        ]
    },
    "blindspots": [
        {
            "score_bin": "0.30-0.35",
            "gmv_bin": "250-500",
            "fn_count": 45,
            "fn_rate": 0.12,
            "recommendation": "nSure weak here - Olorin should focus"
        }
    ]
}
```

---

## Frontend Implementation (Implemented)

### Location: `olorin-front/src/microservices/analytics/`

#### Files Created

| File | Description |
|------|-------------|
| `types/blindspot.ts` | TypeScript interfaces |
| `components/explainers/BlindspotHeatmap.tsx` | Main heatmap component |
| `components/explainers/BlindspotTooltip.tsx` | Tooltip for cell details |

#### Visual Design

```
┌──────────────────────────────────────────────────────────────┐
│  nSure Model Blindspot Analysis                              │
│  ────────────────────────────────────────────────────────────│
│                                                              │
│  Color by: [FN Rate ▼]  [FP Rate]  [Precision]  [Recall]    │
│                                                              │
│         MODEL_SCORE (nSure)                                  │
│         0.0   0.1   0.2   0.3   0.4   0.5   0.6   0.7  ...  │
│       ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬     │
│ $0-50 │ ░░░ │ ░░░ │ ▒▒▒ │ ▓▓▓ │ ░░░ │ ░░░ │ ░░░ │ ░░░ │     │
│       ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤     │
│$50-100│ ░░░ │ ▒▒▒ │ ███ │ ▓▓▓ │ ░░░ │ ░░░ │ ░░░ │ ░░░ │     │
│  G    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤     │
│  M  $100│ ░░░ │ ▓▓▓ │ ███ │ ▒▒▒ │ ░░░ │ ░░░ │ ░░░ │ ░░░ │     │
│  V  -250├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤     │
│       └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴     │
│                                                              │
│  Legend: ░ Low FN  ▒ Medium FN  ▓ High FN  █ Critical FN    │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Insights This Will Reveal

1. **nSure Blind Spots**: Cells with high FN rate where nSure misses fraud
2. **GMV-Based Patterns**: Which transaction value ranges are problematic
3. **Score Calibration Issues**: Where MODEL_SCORE doesn't correlate with actual fraud
4. **Olorin Opportunities**: Where Olorin's behavioral analysis should focus
