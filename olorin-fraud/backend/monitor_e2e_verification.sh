#!/bin/bash

LOG_FILE="e2e_verification.log"
CHECK_INTERVAL=60  # Check every 60 seconds

echo "════════════════════════════════════════════════════════════"
echo "🔍 E2E VERIFICATION MONITOR - Started $(date '+%H:%M:%S')"
echo "════════════════════════════════════════════════════════════"
echo ""

while true; do
    clear
    echo "════════════════════════════════════════════════════════════"
    echo "🔍 E2E VERIFICATION STATUS - $(date '+%H:%M:%S')"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    
    # Q1: Did analyzer run on 24h window?
    echo "Q1: Analyzer on 24h window?"
    if grep -q "time_window=24h" $LOG_FILE; then
        echo "   ✅ YES - Analyzer configured for 24h window"
        grep "Query window dates" $LOG_FILE | tail -1 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q2: Found entities with IS_FRAUD_TX=1?
    echo "Q2: Entities with IS_FRAUD_TX=1 found?"
    if grep -q "Successfully loaded.*risk entities" $LOG_FILE; then
        entities=$(grep "Successfully loaded.*risk entities" $LOG_FILE | grep -oE '[0-9]+ top' | head -1 | grep -oE '[0-9]+')
        echo "   ✅ YES - Found $entities entities with fraud"
        grep "Successfully loaded" $LOG_FILE | tail -1 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q3: Investigations started and completed?
    echo "Q3: Investigations started and completed?"
    started=$(grep -c "Investigation graph ready: auto-comp-" $LOG_FILE 2>/dev/null || echo "0")
    completed=$(grep -c "Completed structured investigation: auto-comp-" $LOG_FILE 2>/dev/null || echo "0")
    echo "   Started: $started"
    echo "   Completed: $completed"
    if [ "$completed" -gt 0 ]; then
        echo "   ✅ YES - Investigations completing"
    else
        echo "   ⏳ Running..."
    fi
    echo ""
    
    # Q4: Risk scores calculated?
    echo "Q4: Overall risk scores calculated?"
    risk_scores=$(grep -c "overall_risk_score" $LOG_FILE 2>/dev/null || echo "0")
    if [ "$risk_scores" -gt 0 ]; then
        echo "   ✅ YES - $risk_scores risk scores calculated"
        grep "overall_risk_score" $LOG_FILE | head -2 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q5: Per-transaction risk scores?
    echo "Q5: Per-transaction risk scores applied?"
    tx_scores=$(grep -c "predicted_risk" $LOG_FILE 2>/dev/null || echo "0")
    if [ "$tx_scores" -gt 0 ]; then
        echo "   ✅ YES - Transaction-level scoring active"
        echo "      Found $tx_scores mentions of predicted_risk"
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q6: Fraud/Not-Fraud classification?
    echo "Q6: Fraud/Not-Fraud split by threshold?"
    if grep -q "Classified as.*Fraud" $LOG_FILE; then
        echo "   ✅ YES - Transactions classified"
        grep "Classified as" $LOG_FILE | tail -4 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q7: Comparison with IS_FRAUD_TX?
    echo "Q7: Compared predictions vs IS_FRAUD_TX?"
    if grep -q "IS_FRAUD_TX" $LOG_FILE; then
        echo "   ✅ YES - Ground truth comparison active"
        grep "IS_FRAUD_TX" $LOG_FILE | grep -E "(column|compared)" | head -2 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q8: Confusion matrices generated?
    echo "Q8: Confusion matrices created?"
    matrices=$(grep -c "📊 Calculated confusion matrix for" $LOG_FILE 2>/dev/null || echo "0")
    if [ "$matrices" -gt 0 ]; then
        echo "   ✅ YES - $matrices confusion matrices generated"
        grep "📊 Calculated confusion matrix for" $LOG_FILE | tail -3 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # Q9: Financial analysis generated?
    echo "Q9: Financial reasoning and results?"
    if grep -q "Saved Fraud GMV:" $LOG_FILE; then
        echo "   ✅ YES - Financial analysis complete"
        grep -E "(Saved Fraud GMV|Lost Revenues|Net Value):" $LOG_FILE | tail -6 | sed 's/^/      /'
    else
        echo "   ⏳ Waiting..."
    fi
    echo ""
    
    # ZIP PACKAGE STATUS
    echo "════════════════════════════════════════════════════════════"
    echo "📦 ZIP PACKAGE STATUS:"
    echo "════════════════════════════════════════════════════════════"
    if grep -q "Complete report package created" $LOG_FILE; then
        echo "   ✅ ZIP PACKAGE GENERATED!"
        grep "Complete report package created" $LOG_FILE | tail -1 | sed 's/^/      /'
        ls -lh artifacts/startup_analysis_COMPLETE_*.zip 2>/dev/null | tail -1 | sed 's/^/      /'
        echo ""
        echo "   🎉 VERIFICATION COMPLETE!"
        break
    else
        echo "   ⏳ Waiting for completion..."
    fi
    echo ""
    
    echo "────────────────────────────────────────────────────────────"
    echo "Next check in $CHECK_INTERVAL seconds... (Ctrl+C to stop)"
    sleep $CHECK_INTERVAL
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ MONITORING COMPLETE"
echo "════════════════════════════════════════════════════════════"
