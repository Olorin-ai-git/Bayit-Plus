# Comprehensive Research & Improvement Plan: Merchant Fraud Detection

## 1. Executive Summary

Our current merchant fraud detection capability is **critically limited** because it relies almost exclusively on a single signal (Amount Outliers) derived from a single data point (`PAID_AMOUNT_VALUE_IN_CURRENCY`). While the infrastructure (LangGraph, Snowflake querying) is robust, the feature engineering is primitive.

The database contains **333 columns** of rich transaction data—including geography, payment details, device info, and risk scores—that are currently **unused**.

**Goal**: Transform the system from a simple heuristic filter into a multi-dimensional risk engine using the full breadth of available data.

## 2. Current State Analysis

### 2.1. The "Zero Precision" Problem
- **Symptom**: Confusion matrices show either 0% fraud detection (too conservative) or 100% false positives (too aggressive).
- **Root Cause**:
    1.  **Data Clustering**: Test data is temporally clustered (2000 tx in ~30 mins), rendering velocity and temporal features useless.
    2.  **Feature Starvation**: We ignore ~99% of available signals (BIN, Country, Device, Status, etc.).
    3.  **Primitive Scoring**: Relying on manual Z-score thresholds for amounts creates a brittle "all-or-nothing" classifier.

### 2.2. Untapped Data Assets
Our research confirms availability of high-value fields in Snowflake:
- **Payment Risk**: `BIN`, `CARD_TYPE`, `IS_CARD_PREPAID`, `AVS_RESULT`
- **Cross-Border Risk**: `IP_COUNTRY_CODE`, `BIN_COUNTRY_CODE`
- **Identity Risk**: `EMAIL_NORMALIZED`, `IS_DISPOSABLE_EMAIL`
- **Technical Risk**: `DEVICE_ID`, `IP`, `USER_AGENT`
- **External Risk**: `MAXMIND_RISK_SCORE`, `EMAIL_DATA_THIRD_PARTY_RISK_SCORE`

## 3. Improvement Plan

### Phase 1: Feature Engineering Expansion (Immediate)
Update `FraudDetectionFeatures` to extract and utilize 5 new dimensions of risk:

1.  **Mismatch Risk**:
    -   `country_mismatch`: IP Country vs. BIN Country.
    -   `currency_mismatch`: Transaction Currency vs. implied country currency.

2.  **Payment Instrument Risk**:
    -   `prepaid_card_risk`: Higher risk for `IS_CARD_PREPAID=True`.
    -   `card_type_risk`: Differentiate Credit vs. Debit (Credit often safer for merchants, but high-value credit attacks exist).

3.  **Identity/Communication Risk**:
    -   `email_risk`: Flag `IS_DISPOSABLE_EMAIL` or high `EMAIL_DATA_THIRD_PARTY_RISK_SCORE`.
    -   `avs_failure`: Flag bad `AVS_RESULT`.

4.  **Technical/Cluster Risk**:
    -   **Card Attack Pattern**: Many *different* cards from the *same* IP/Device (card testing).
    -   **Account Takeover Pattern**: Many *different* IPs using the *same* card (distributed attack).

### Phase 2: Advanced Statistical Modeling (Short Term)
Replace manual Z-scores with `scikit-learn` algorithms (now confirmed available):

1.  **Isolation Forest**:
    -   Unsupervised anomaly detection.
    -   Inputs: `[Amount, HourOfDay, IsPrepaid, IsInternational]`.
    -   Benefit: Automatically detects outliers in multi-dimensional space without manual thresholds.

2.  **Benford's Law Analysis**:
    -   Analyze the leading digit distribution of amounts for the merchant.
    -   Benefit: Detects artificial/generated transactions (common in synthetic fraud or laundering) that violate natural distribution.

### Phase 3: Investigation Workflow Refinement
1.  **Data Fetching**: Update `investigation_transaction_mapper` and `risk_agent` to fetch the extra columns (`BIN`, `IP_COUNTRY_CODE`, etc.) from Snowflake.
2.  **Scoring Logic**:
    -   Move from additive score (0.1 + 0.2...) to probabilistic score.
    -   `Final Score = weighted_avg(IsolationForest_Score, Heuristic_Score, External_Score)`

## 4. Implementation Steps (Next Actions)

1.  **Data Ingestion**: Modify SQL queries to fetch `BIN`, `IP_COUNTRY_CODE`, `IS_CARD_PREPAID`, `AVS_RESULT`, `EMAIL_DOMAIN`.
2.  **Feature Implementation**: Add `_calculate_payment_features` and `_calculate_geo_features` to `FraudDetectionFeatures`.
3.  **Model Upgrade**: Integrate `IsolationForest` into `EnhancedRiskScorer`.
4.  **Calibration**: Re-run the analyzer flow. We expect to see viable separation between fraud and legitimate transactions based on these deeper patterns.

