#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "           COMPLETE PIPELINE ANALYSIS - ALL 5 ENTITIES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Extract entity names and risk scores
echo "1️⃣  ENTITIES INVESTIGATED:"
echo "────────────────────────────────────────────────────────────────"
grep "Entity:" startup_logs_final.txt | grep "Auto-Comparison" | head -5

echo ""
echo "2️⃣  RISK SCORES ASSIGNED:"
echo "────────────────────────────────────────────────────────────────"
grep "Overall risk score\|risk_score.*from domain_findings" startup_logs_final.txt | grep -v "Invalid" | head -10

echo ""
echo "3️⃣  INVESTIGATION WINDOWS:"
echo "────────────────────────────────────────────────────────────────"
grep "Investigation Window:\|Testing window:" startup_logs_final.txt | grep "730 days\|2023-05-26 to 2025-05-25" | head -3

echo ""
echo "4️⃣  TRANSACTION COUNTS PER ENTITY:"
echo "────────────────────────────────────────────────────────────────"
grep "Calculated confusion matrix for email:" startup_logs_final.txt | \
  sed 's/.*email:\([^:]*\):.* total_transactions=\([0-9]*\).*/\1: \2 transactions/' | \
  sort -u

echo ""
echo "5️⃣  CONFUSION MATRICES (UNIQUE ENTITIES):"
echo "────────────────────────────────────────────────────────────────"
grep "Calculated confusion matrix for email:" startup_logs_final.txt | \
  awk -F'email:' '{print $2}' | \
  awk '{print "Email: " $1}' | \
  sort -u | nl

echo ""
echo "6️⃣  DETAILED METRICS:"
echo "────────────────────────────────────────────────────────────────"
grep "Calculated confusion matrix for email:" startup_logs_final.txt | \
  grep -v "excluded=[1-9]" | \
  tail -4

echo ""
echo "7️⃣  FRAUD COLUMN EXCLUSION VERIFICATION:"
echo "────────────────────────────────────────────────────────────────"
grep "Excluded.*fraud-related columns" startup_logs_final.txt | head -3

echo ""
echo "8️⃣  IS_FRAUD_TX QUERIES (AFTER INVESTIGATION):"
echo "────────────────────────────────────────────────────────────────"
grep "Queried IS_FRAUD_TX for" startup_logs_final.txt | head -5

echo ""
echo "9️⃣  HTML REPORTS GENERATED:"
echo "────────────────────────────────────────────────────────────────"
grep "Confusion table saved to:" startup_logs_final.txt | \
  sed 's/.*saved to: //' | \
  xargs -I {} basename {}

echo ""
echo "🔟 TIMING ANALYSIS:"
echo "────────────────────────────────────────────────────────────────"
echo "Start time: $(grep 'Starting startup analysis' startup_logs_final.txt | head -1 | awk '{print $1, $2}')"
echo "Entity 1 completed: $(grep 'Calculated confusion matrix for email:halfrhythm123' startup_logs_final.txt | head -1 | awk '{print $1, $2}')"
echo "Entity 5 completed: $(grep 'Calculated confusion matrix for email:' startup_logs_final.txt | tail -1 | awk '{print $1, $2}')"

COMPLETED_COUNT=$(grep "Calculated confusion matrix for email:" startup_logs_final.txt | awk -F'email:' '{print $2}' | awk '{print $1}' | sort -u | wc -l | tr -d ' ')
echo ""
echo "Total unique entities: $COMPLETED_COUNT"

echo ""
echo "════════════════════════════════════════════════════════════════"
