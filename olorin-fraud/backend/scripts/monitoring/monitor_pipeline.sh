#!/bin/bash
echo "=== MONITORING ALL 5 ENTITY INVESTIGATIONS ==="
echo "Start time: $(date)"
echo ""

for i in {1..40}; do
  sleep 30
  echo "=== Check $i at $(date +%H:%M:%S) ==="
  
  # Count completed entities
  COMPLETED=$(grep "Calculated confusion matrix for email:" startup_logs_final.txt 2>/dev/null | wc -l | tr -d ' ')
  STARTED=$(grep "📊 Auto-Comparison [0-9]/5" startup_logs_final.txt 2>/dev/null | tail -1)
  
  echo "Completed entities: $COMPLETED/5"
  echo "Latest: $STARTED"
  
  # Show recent confusion matrices
  grep "Calculated confusion matrix for email:" startup_logs_final.txt 2>/dev/null | tail -2
  
  # Check for completion or timeout
  if [ "$COMPLETED" -eq 5 ]; then
    echo ""
    echo "🎉 ALL 5 ENTITIES COMPLETED!"
    break
  fi
  
  if grep -q "Startup analysis timed out" startup_logs_final.txt 2>/dev/null; then
    echo ""
    echo "⏱️ TIMEOUT DETECTED"
    break
  fi
  
  echo ""
done

echo ""
echo "=== FINAL SUMMARY ==="
echo "End time: $(date)"
grep "Calculated confusion matrix for email:" startup_logs_final.txt 2>/dev/null
