#!/bin/bash
# E2E Fraud Detection Flow Monitor
# Real-time monitoring of the automatic startup analysis flow

echo "=========================================="
echo "E2E FRAUD DETECTION FLOW MONITOR"
echo "=========================================="
echo ""
echo "Started: $(date)"
echo ""

LOG_FILE="${1:-server_startup.log}"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found: $LOG_FILE"
    exit 1
fi

echo "📋 Monitoring log file: $LOG_FILE"
echo ""

# Function to count occurrences
count_pattern() {
    grep -c "$1" "$LOG_FILE" 2>/dev/null || echo "0"
}

# Function to get last occurrence
last_occurrence() {
    grep "$1" "$LOG_FILE" | tail -1
}

# Function to extract value
extract_value() {
    echo "$1" | grep -oE "$2" | head -1
}

echo "=========================================="
echo "1. ANALYZER EXECUTION (24h Window)"
echo "=========================================="

analyzer_start=$(last_occurrence "🔄 Starting FRAUD ENTITY ANALYSIS")
if [ -n "$analyzer_start" ]; then
    echo "✅ Analyzer started"
    echo "   $analyzer_start"
    
    # Extract window info
    window_info=$(last_occurrence "Query window dates:")
    echo "   $window_info"
    
    # Check if analyzer completed
    entities_found=$(count_pattern "fraud_count DESC")
    echo "✅ Analyzer queries executed: $entities_found"
else
    echo "⏳ Waiting for analyzer to start..."
fi

echo ""
echo "=========================================="
echo "2. ENTITIES WITH FRAUD IDENTIFIED"
echo "=========================================="

# Count investigations started
inv_count=$(count_pattern "✅ Hybrid investigation started")
echo "✅ Investigations started: $inv_count"

if [ "$inv_count" -gt 0 ]; then
    echo ""
    echo "Investigation IDs:"
    grep "✅ Hybrid investigation started" "$LOG_FILE" | tail -10 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "3. INVESTIGATION STATUS"
echo "=========================================="

# Database fetch
db_fetch_count=$(count_pattern "📊 DATABASE FETCH: Starting data retrieval")
echo "Database fetches initiated: $db_fetch_count"

# Data loaded
data_loaded=$(count_pattern "📊 Loaded.*transactions for")
echo "Entities with data loaded: $data_loaded"

# Investigations completed
inv_completed=$(count_pattern "investigation.*completed|Final investigation status: COMPLETED")
echo "Investigations completed: $inv_completed"

if [ "$inv_completed" -gt 0 ]; then
    echo ""
    echo "Completed investigations:"
    grep -E "investigation.*completed|Final investigation status: COMPLETED" "$LOG_FILE" | tail -5 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "4. RISK SCORING STATUS"
echo "=========================================="

# Overall risk scores
overall_risk=$(count_pattern "Overall risk score:|risk_score=")
echo "Entities with overall risk score: $overall_risk"

if [ "$overall_risk" -gt 0 ]; then
    echo ""
    echo "Recent risk scores:"
    grep -E "Overall risk score:|risk_score=" "$LOG_FILE" | tail -5 | sed 's/^/   /'
fi

# Per-transaction scoring
tx_scoring=$(count_pattern "calculate_per_transaction_risk|Per-transaction scoring")
echo "Per-transaction scoring calls: $tx_scoring"

# Scores saved to database
scores_saved=$(count_pattern "Saved.*scores to database|transaction_scores saved")
echo "Transaction scores saved to DB: $scores_saved"

echo ""
echo "=========================================="
echo "5. FRAUD/NO_FRAUD CLASSIFICATION"
echo "=========================================="

# Check for threshold usage
threshold_used=$(count_pattern "Using risk threshold.*0\\.3|risk_threshold=0\\.3")
echo "Threshold applications (0.3): $threshold_used"

# Classification counts
fraud_classified=$(last_occurrence "Classified as 'Fraud':")
no_fraud_classified=$(last_occurrence "Classified as 'Not Fraud':")

if [ -n "$fraud_classified" ]; then
    echo "✅ Fraud classifications found"
    echo "   $fraud_classified"
    echo "   $no_fraud_classified"
fi

echo ""
echo "=========================================="
echo "6. IS_FRAUD_TX COMPARISON"
echo "=========================================="

# Query for IS_FRAUD_TX
isfraud_queries=$(count_pattern "QUERY_ISFRAUD_TX|Queried IS_FRAUD_TX")
echo "IS_FRAUD_TX queries executed: $isfraud_queries"

# IS_FRAUD_TX data retrieved
isfraud_data=$(count_pattern "Updated.*with IS_FRAUD_TX values")
echo "Transactions updated with ground truth: $isfraud_data"

if [ "$isfraud_data" -gt 0 ]; then
    echo ""
    echo "Recent IS_FRAUD_TX updates:"
    grep "Updated.*with IS_FRAUD_TX values" "$LOG_FILE" | tail -3 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "7. CONFUSION MATRIX GENERATION"
echo "=========================================="

# Confusion matrix calculations
cm_calculated=$(count_pattern "📊 Calculated confusion matrix|Confusion matrix calculated")
echo "Confusion matrices calculated: $cm_calculated"

# Show recent confusion matrices
if [ "$cm_calculated" -gt 0 ]; then
    echo ""
    echo "Recent confusion matrices:"
    grep -A1 "📊 Calculated confusion matrix for" "$LOG_FILE" | tail -10 | sed 's/^/   /'
    
    # Extract TP, FP, TN, FN values
    echo ""
    echo "Latest confusion values:"
    grep -E "TP=[0-9]+, FP=[0-9]+, TN=[0-9]+, FN=[0-9]+" "$LOG_FILE" | tail -5 | sed 's/^/   /'
fi

# Aggregated confusion matrix
agg_cm=$(count_pattern "Aggregated metrics: TP=|total_TP=")
echo ""
echo "Aggregated confusion matrix: $agg_cm"

if [ "$agg_cm" -gt 0 ]; then
    echo ""
    echo "Aggregated metrics:"
    grep -E "Aggregated metrics: TP=|total_TP=" "$LOG_FILE" | tail -3 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "8. PRECISION, RECALL, F1, ACCURACY"
echo "=========================================="

# Performance metrics
precision_count=$(count_pattern "precision=")
echo "Precision calculations: $precision_count"

if [ "$precision_count" -gt 0 ]; then
    echo ""
    echo "Recent performance metrics:"
    grep -E "precision=[0-9.]+, recall=[0-9.]+.*f1=[0-9.]+.*accuracy=" "$LOG_FILE" | tail -5 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "9. REVENUE IMPLICATIONS"
echo "=========================================="

# Revenue calculations
revenue_calcs=$(count_pattern "💰 REVENUE IMPLICATION CALCULATION|REVENUE.*CALCULATION")
echo "Revenue calculations initiated: $revenue_calcs"

# Saved Fraud GMV
saved_gmv=$(count_pattern "Saved Fraud GMV:|saved_fraud_gmv")
echo "Saved Fraud GMV calculations: $saved_gmv"

# Lost Revenues
lost_rev=$(count_pattern "Lost Revenues:|lost_revenues")
echo "Lost Revenue calculations: $lost_rev"

# Net Value
net_value=$(count_pattern "NET VALUE:|net_value")
echo "Net Value calculations: $net_value"

if [ "$revenue_calcs" -gt 0 ]; then
    echo ""
    echo "Recent revenue calculations:"
    grep -A15 "💰 REVENUE IMPLICATION CALCULATION" "$LOG_FILE" | tail -20 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "10. MERCHANT GROUPING"
echo "=========================================="

# Check for merchant grouping
merchant_reports=$(count_pattern "merchant.*confusion|Merchant:.*TP=")
echo "Merchant-specific reports: $merchant_reports"

if [ "$merchant_reports" -gt 0 ]; then
    echo ""
    echo "Merchants analyzed:"
    grep -E "Merchant:.*TP=|merchant_name" "$LOG_FILE" | tail -10 | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "11. REPORT GENERATION"
echo "=========================================="

# HTML report generation
html_report=$(count_pattern "Generated HTML report|Report saved to")
echo "HTML reports generated: $html_report"

if [ "$html_report" -gt 0 ]; then
    echo ""
    echo "Report paths:"
    grep -E "Generated HTML report|Report saved to" "$LOG_FILE" | tail -5 | sed 's/^/   /'
fi

# App state updates
app_state=$(count_pattern "Stored.*in app.state|app.state updated")
echo "App state updates: $app_state"

echo ""
echo "=========================================="
echo "OVERALL PROGRESS SUMMARY"
echo "=========================================="

total_steps=11
completed_steps=0

# Check each step
[ "$inv_count" -gt 0 ] && ((completed_steps++))
[ "$db_fetch_count" -gt 0 ] && ((completed_steps++))
[ "$data_loaded" -gt 0 ] && ((completed_steps++))
[ "$inv_completed" -gt 0 ] && ((completed_steps++))
[ "$overall_risk" -gt 0 ] && ((completed_steps++))
[ "$tx_scoring" -gt 0 ] && ((completed_steps++))
[ "$isfraud_queries" -gt 0 ] && ((completed_steps++))
[ "$cm_calculated" -gt 0 ] && ((completed_steps++))
[ "$precision_count" -gt 0 ] && ((completed_steps++))
[ "$revenue_calcs" -gt 0 ] && ((completed_steps++))
[ "$html_report" -gt 0 ] && ((completed_steps++))

progress_pct=$((completed_steps * 100 / total_steps))

echo "Progress: $completed_steps/$total_steps steps ($progress_pct%)"
echo ""

if [ "$progress_pct" -eq 100 ]; then
    echo "✅ ALL STEPS COMPLETED!"
elif [ "$progress_pct" -ge 50 ]; then
    echo "⏳ In progress (over halfway)..."
else
    echo "⏳ Early stages..."
fi

echo ""
echo "=========================================="
echo "Completed: $(date)"
echo "=========================================="

