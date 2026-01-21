# Blindspot Heatmap: 2D Distribution Analysis

## Overview

The blindspot heatmap is a 2D distribution map of fraud detection outcomes (FN/FP/TP/TN) across two dimensions:

- **Y-axis**: GMV (Gross Merchandise Value) - transaction amount bins
- **X-axis**: nSure MODEL_SCORE - risk score bins (0.00 to 1.00)

This visualization identifies **where nSure fails to catch fraud**, enabling Olorin to focus on high-value blind spots and improve overall detection accuracy.

---

## The 2D Grid Structure

```
                        nSure MODEL_SCORE (X-axis)
                        Low ←─────────────────────────────→ High
                        0.00   0.20   0.40   0.60   0.80   1.00
                       ┌──────┬──────┬──────┬──────┬──────┬──────┐
             $1000+    │  FN  │  FN  │      │  TP  │  TP  │  TP  │
                       ├──────┼──────┼──────┼──────┼──────┼──────┤
    G        $500-1000 │  FN  │  FN  │      │  TP  │  TP  │  TP  │
    M        ├──────┼──────┼──────┼──────┼──────┼──────┤
    V        $250-500  │  FN  │  FN  │      │  TP  │  TP  │      │
             ├──────┼──────┼──────┼──────┼──────┼──────┤
   (Y)       $100-250  │  FN  │      │      │  TP  │      │      │
                       ├──────┼──────┼──────┼──────┼──────┼──────┤
             $50-100   │  FN  │      │      │      │      │      │
                       ├──────┼──────┼──────┼──────┼──────┼──────┤
             $0-50     │  FN  │      │      │      │      │      │
                       └──────┴──────┴──────┴──────┴──────┴──────┘
                              ↑                    ↑
                        BLIND SPOTS           CAUGHT ZONES
                        (nSure misses)        (nSure catches)
```

Each cell represents a specific segment of transactions defined by:
- A GMV range (e.g., $250-500)
- A MODEL_SCORE range (e.g., 0.20-0.25)

---

## Confusion Matrix Per Cell

For each cell, we calculate the confusion matrix based on Olorin's trained threshold (default: 0.40):

| Metric | Definition | Condition |
|--------|------------|-----------|
| **TP** (True Positive) | Fraud correctly flagged | `MODEL_SCORE >= threshold` AND `IS_FRAUD = true` |
| **FP** (False Positive) | Legitimate incorrectly flagged | `MODEL_SCORE >= threshold` AND `IS_FRAUD = false` |
| **FN** (False Negative) | Fraud missed (BLIND SPOT) | `MODEL_SCORE < threshold` AND `IS_FRAUD = true` |
| **TN** (True Negative) | Legitimate correctly ignored | `MODEL_SCORE < threshold` AND `IS_FRAUD = false` |

### Key Insight

**False Negatives (FN)** are the critical metric:
- These are transactions where nSure gave a low score (below threshold)
- But the transaction was actually fraudulent
- nSure "didn't see" the fraud → **blind spot**

---

## What the Colors Mean

| Color | Meaning | Implication |
|-------|---------|-------------|
| **Red** (dark to light) | High FN count | nSure blind spot - missing fraud here |
| **Green** (dark to light) | High TP count with good precision | nSure catching fraud effectively |
| **Dark/Empty** | No fraud in segment | Low priority for investigation |

### Color Intensity

- **Red intensity**: Based on FN count relative to max FN across all cells
- **Green intensity**: Based on precision (TP / (TP + FP))

---

## Why GMV Matters

GMV (transaction value) is critical because:

1. **Risk-Reward**: A $1,000 fraud hurts more than a $10 fraud
2. **Pattern Differences**: Fraud behavior may differ by transaction size
3. **Prioritization**: Focus on high-GMV blind spots for maximum ROI

### Example Analysis

```
Cell: Score 0.15-0.20, GMV $500-1000
├── FN: 45 (frauds nSure missed)
├── TN: 2,340 (legitimate correctly ignored)
├── FN Rate: 1.9%
└── Fraud GMV: $32,450 at risk

Interpretation: nSure misses ~2% of fraud in high-value,
low-score transactions. This is a prime target for Olorin.
```

---

## Strategic Application

### 1. Identify nSure's Blind Spots

Look for cells with:
- High FN count (red cells)
- High GMV range (top rows)
- Low MODEL_SCORE (left columns)

These represent **high-value fraud that nSure approves**.

### 2. Focus Olorin's Resources

Olorin should prioritize investigating entities where:
- nSure has high FN rate (blind spots)
- GMV is high (maximum fraud prevention value)
- Olorin's behavioral analysis can add value

### 3. Tune the Selector

The entity selector can be optimized to:
- Prioritize segments where nSure is weak
- Avoid segments where nSure already performs well
- Focus on high-GMV opportunities

---

## The Business Value

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE HEATMAP                           │
│                                                             │
│  Olorin investigates random/uniform sample of entities      │
│  → Some investigations catch fraud nSure already flagged    │
│  → Some investigations miss high-value opportunities        │
│  → Suboptimal ROI                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    AFTER HEATMAP                            │
│                                                             │
│  Olorin targets nSure's blind spots specifically:           │
│  → High-GMV + Low-Score + High-FN segments                  │
│  → Catches fraud that nSure missed                          │
│  → Maximum ROI per investigation                            │
└─────────────────────────────────────────────────────────────┘
```

### Quantified Impact

| Metric | Without Targeting | With Heatmap Targeting |
|--------|-------------------|------------------------|
| Investigation focus | Random sample | nSure blind spots |
| Fraud caught | Some overlap with nSure | Complementary to nSure |
| GMV protected | Variable | Prioritized high-value |
| ROI | Baseline | Optimized |

---

## Implementation Details

### Data Source

The heatmap queries Snowflake directly for all nSure-approved transactions:

```sql
SELECT
    FLOOR(MODEL_SCORE * 20) / 20 AS score_bin,  -- 20 bins (0.05 increments)
    CASE
        WHEN GMV < 50 THEN '0-50'
        WHEN GMV < 100 THEN '50-100'
        -- ... more bins
    END AS gmv_bin,
    SUM(CASE WHEN predicted >= threshold AND actual = 1 THEN 1 ELSE 0 END) AS tp,
    SUM(CASE WHEN predicted >= threshold AND actual = 0 THEN 1 ELSE 0 END) AS fp,
    SUM(CASE WHEN predicted < threshold AND actual = 1 THEN 1 ELSE 0 END) AS fn,
    SUM(CASE WHEN predicted < threshold AND actual = 0 THEN 1 ELSE 0 END) AS tn
FROM transactions
WHERE NSURE_LAST_DECISION = 'APPROVED'
GROUP BY score_bin, gmv_bin
```

### Configuration

Environment variables control the analysis:

| Variable | Default | Description |
|----------|---------|-------------|
| `BLINDSPOT_SCORE_BINS` | 20 | Number of score bins (0.05 increments) |
| `BLINDSPOT_GMV_BINS` | 0,50,100,250,500,1000,5000 | GMV bin boundaries |
| `RISK_THRESHOLD_DEFAULT` | 0.40 | Olorin's trained threshold |

### Date Range Scoping

The analysis is scoped to only days with Olorin investigation data:
- Ensures consistency with monthly report metrics
- Uses min/max dates from completed investigations
- Not the full calendar month

---

## Reading the Report

### Summary Cards

| Card | Meaning |
|------|---------|
| Total Transactions | All nSure-approved transactions in the analyzed period |
| Precision | TP / (TP + FP) - accuracy when flagging fraud |
| Recall | TP / (TP + FN) - fraud catch rate |
| Fraud GMV | Total dollar value of fraud in the dataset |

### Identified Blind Spots List

The report highlights the top 5 blind spot cells:
- Score range and GMV range
- FN count and FN rate
- Recommendation for Olorin focus

---

## Key Takeaways

1. **Blind spots = Red cells** with high FN count in low-score, high-GMV regions

2. **Olorin adds value** by catching fraud in nSure's blind spots

3. **GMV prioritization** ensures maximum fraud prevention ROI

4. **Complementary strategy**: nSure handles high-score fraud, Olorin handles low-score blind spots

5. **Continuous improvement**: As Olorin investigates blind spots, the heatmap evolves to show remaining opportunities

---

## Related Files

- `app/service/analytics/model_blindspot_analyzer.py` - Core analysis engine
- `app/service/analytics/blindspot_processor.py` - Result processing
- `app/service/reporting/components/blindspot_heatmap.py` - HTML rendering
- `scripts/run_blindspot_analysis.py` - Standalone analysis script
